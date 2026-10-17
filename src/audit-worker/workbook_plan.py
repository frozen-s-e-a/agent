"""Bounded workbook plans. Patch only requested cells in the original OOXML package.

No Python/SQL/Excel code from the model is executed. Sources, expected values and
coverage are compiled before writing; the saved file is independently reopened.
"""
from __future__ import annotations
import hashlib, json, re, zipfile, posixpath, html
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, ROUND_UP, ROUND_DOWN
from pathlib import Path
from xml.etree import ElementTree as ET
from openpyxl.utils.cell import range_boundaries, get_column_letter, coordinate_to_tuple
from openpyxl.formula.tokenizer import Tokenizer
from openpyxl.formula.translate import Translator

NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
MAX_CELLS = 20000
MAX_READ = 1200
VERSION = 'workbook-plan/1'
YEAR = r'(?<!\d)(?:19|20)\d{2}(?!\d)'
# Reports write a dash or slash where the amount is zero.
PLACEHOLDERS = {'-','--','—','——','－','/','／'}

class NeedsInput(ValueError):
    pass

class PlanIssue(NeedsInput):
    """A defect in the model's plan that it can correct itself; only business ambiguity goes to the user."""
    def __init__(self, message, hint=''):
        super().__init__(message); self.hint=hint

def sha(file):
    h = hashlib.sha256()
    with Path(file).open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''): h.update(chunk)
    return h.hexdigest()

def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), default=str)

def bounded_range(value, limit=MAX_CELLS):
    if not isinstance(value, str) or not re.fullmatch(r'\$?[A-Z]{1,3}\$?[1-9]\d*(?::\$?[A-Z]{1,3}\$?[1-9]\d*)?', value):
        raise ValueError('范围必须是明确的单元格或矩形，如 A2:F20；不支持整列或代码')
    a, b, c, d = range_boundaries(value)
    if a > c or b > d or c > 16384 or d > 1048576 or (c-a+1)*(d-b+1) > limit:
        raise ValueError('单元格范围超出预算或顺序无效')
    return a, b, c, d

def coords(value, limit=MAX_CELLS):
    a, b, c, d = bounded_range(value, limit)
    return [f'{get_column_letter(col)}{row}' for row in range(b, d+1) for col in range(a, c+1)]

def row_expression(expr, row):
    if isinstance(expr,list): return [row_expression(item,row) for item in expr]
    if isinstance(expr,dict):
        return {key:value.replace('{row}',str(row)) if key=='cell' and isinstance(value,str) else row_expression(value,row) for key,value in expr.items()}
    return expr

def number(value, where):
    if isinstance(value, bool) or value is None or value == '':
        raise NeedsInput(f'{where} 缺少有效数值，不能把空白当作零')
    try: result = Decimal(str(value).replace(',', '').strip())
    except InvalidOperation: raise NeedsInput(f'{where} 不是可计算的金额：{str(value)[:80]}')
    if not result.is_finite(): raise ValueError('不允许非有限数值')
    return result

def as_int(value):
    """Row numbers some models send as text."""
    return int(value) if isinstance(value,str) and value.strip().isdigit() else value

def blank(value):
    return value is None or (isinstance(value, str) and (not value.strip() or value.strip() in PLACEHOLDERS))

def amount(value, where):
    """A number as Excel arithmetic and SUM see it: a blank or dash cell is 0. Text is a mapping error the plan must fix."""
    if isinstance(value, dict): raise PlanIssue(f'{where} 是 Excel 错误 {value.get("error")}', '改为直接从来源表计算，或引用不含错误的单元格')
    if blank(value): return Decimal(0)
    if isinstance(value, bool): return Decimal(int(value))
    try: result = Decimal(str(value).replace(',', '').strip())
    except InvalidOperation:
        raise PlanIssue(f'{where} 是文字“{str(value)[:40]}”，不是金额', '检查 column、startRow 和 endRow 是否只覆盖金额数据；表头、说明或小计文字不能参与计算')
    if not result.is_finite(): raise ValueError('不允许非有限数值')
    return result

def text(value):
    if value is None: return ''
    if isinstance(value, Decimal): return format(value.normalize(), 'f') if value == value.to_integral_value() else format(value, 'f')
    return str(value).replace('\u3000', ' ').strip()

def same_text(actual, wanted):
    """Codes may be stored as text in one sheet and as numbers in another."""
    a, b = text(actual), text(wanted)
    if a == b: return True
    try: return Decimal(a.replace(',', '')) == Decimal(b.replace(',', ''))
    except InvalidOperation: return False

def same_label(actual, expected):
    return re.sub(r'\s+', '', text(actual)) == re.sub(r'\s+', '', text(expected))

class Book:
    def __init__(self, root, ref):
        self.ref = ref
        self.path = (root / ref).resolve(strict=True)
        if not self.path.is_relative_to(root) or self.path.suffix.lower() not in ('.xlsx', '.xlsm'):
            raise ValueError('工作簿必须是任务范围内的 XLSX 或 XLSM')
        self.hash = sha(self.path)
        self.sheets = {}
        with zipfile.ZipFile(self.path) as z:
            if len(z.namelist()) != len(set(z.namelist())): raise ValueError('工作簿包含重复包部件')
            if sum(i.file_size for i in z.infolist()) > 256 * 1024**2: raise ValueError('工作簿展开体量超过填写适配器预算')
            if any(n.startswith('_xmlsignatures/') for n in z.namelist()): raise NeedsInput('模板带数字签名，当前填写会使签名失效，需提供未签名的工作副本')
            strings = []
            if 'xl/sharedStrings.xml' in z.namelist():
                strings = [''.join(t.text or '' for t in si.iter(f'{{{NS}}}t')) for si in ET.fromstring(z.read('xl/sharedStrings.xml'))]
            rels = {r.attrib['Id']:posixpath.normpath(posixpath.join('xl', r.attrib['Target'].lstrip('/'))) if not r.attrib['Target'].startswith('/') else r.attrib['Target'].lstrip('/') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels')) if r.attrib.get('TargetMode') != 'External'}
            for item in ET.fromstring(z.read('xl/workbook.xml')).find(f'{{{NS}}}sheets'):
                name = item.attrib['name']; part = rels[item.attrib[f'{{{REL}}}id']]
                raw = z.read(part).decode('utf-8'); tree = ET.fromstring(raw)
                cells = {}
                for cell in tree.iter(f'{{{NS}}}c'):
                    ref = cell.attrib['r']; typ = cell.attrib.get('t', 'n')
                    v = cell.find(f'{{{NS}}}v'); formula = cell.find(f'{{{NS}}}f')
                    value = v.text if v is not None else None
                    if typ == 's': value = strings[int(value)] if value is not None else None
                    elif typ == 'inlineStr': value = ''.join(t.text or '' for t in cell.iter(f'{{{NS}}}t'))
                    elif typ == 'b': value = value == '1' if value is not None else None
                    elif typ == 'n' and value is not None: value = Decimal(value)
                    elif typ == 'e': value = {'error':value}
                    kind = formula.attrib.get('t') if formula is not None else None
                    cells[ref] = {'value':value, 'formula':formula.text if formula is not None else None, 'type':typ, 'style':cell.attrib.get('s'), 'sharedFormula':kind in ('array', 'dataTable'), 'shared':kind=='shared', 'si':formula.attrib.get('si') if kind=='shared' else None}
                # Excel stores a filled-down formula once; the other cells carry only its index.
                masters = {c['si']:(ref, c['formula']) for ref, c in cells.items() if c['shared'] and c['formula']}
                for ref, c in cells.items():
                    if c['shared'] and not c['formula'] and c['si'] in masters:
                        origin, formula_text = masters[c['si']]
                        try: c['formula'] = Translator('=' + formula_text, origin=origin).translate_formula(ref)[1:]
                        except Exception: c['sharedFormula'] = True; c['formula'] = ''
                dim = tree.find(f'{{{NS}}}dimension')
                merges = [m.attrib['ref'] for m in tree.iter(f'{{{NS}}}mergeCell')]
                occupied = [coordinate_to_tuple(k) for k,v in cells.items() if v['value'] is not None or v['formula'] is not None]
                extent = f'A1:{get_column_letter(max((c for r,c in occupied),default=1))}{max((r for r,c in occupied),default=1)}'
                self.sheets[name] = {'part':part,'raw':raw,'cells':cells,'merges':merges,'range':dim.attrib.get('ref',extent) if dim is not None else extent,'dataRange':extent,'state':item.attrib.get('state','visible')}

    def sheet(self, name):
        if name not in self.sheets: raise ValueError(f'工作表不存在：{name}；工作簿中的工作表：{"、".join(self.sheets)}')
        return self.sheets[name]

    def cell(self, name, ref):
        bounded_range(ref, 1)
        item = self.sheet(name)['cells'].get(ref.replace('$',''), {'value':None,'formula':None,'type':'n','style':None})
        if isinstance(item['value'], dict): raise NeedsInput(f'{name}!{ref} 含有公式错误 {item["value"]}')
        if item['formula'] is not None and item['value'] is None:
            raise NeedsInput(f'{name}!{ref} 的公式没有已计算结果，请提供已重算的资料或改用原始字段计算')
        return item['value']

def read_workbook(root, files, p):
    book = Book(root, files[0].relative_to(root).as_posix())
    sheet = p.get('sheet'); requested = p.get('range')
    if requested and not sheet: raise ValueError('范围读取需要工作表名称')
    result = {'ok':True,'file_path':book.ref,'sha256':book.hash,'sheets':[],'sampleOnly':not bool(requested)}
    for name, s in book.sheets.items():
        result['sheets'].append({'name':name,'range':s['range'],'dataRange':s['dataRange'],'state':s['state'],'mergedRanges':s['merges'][:80]})
    names = [sheet] if sheet else list(book.sheets)[:8]
    result['pages'] = []
    for name in names:
        s = book.sheet(name)
        if requested: span = bounded_range(requested, 2000000)
        else:
            a,b,c,d = bounded_range(s['dataRange'], 20_000_000)
            span = (a,b,min(c,12),min(d,4))
        a,b,c,d = span; total=(c-a+1)*(d-b+1)
        offset = p.get('offset',0); limit = p.get('limit',400)
        if not isinstance(offset,int) or not 0<=offset<max(1,total) or not isinstance(limit,int) or not 1<=limit<=MAX_READ: raise ValueError('范围分页参数无效')
        # One object per row, blank cells left out: the same page costs a fraction of the tokens.
        rows = {}; count = 0
        for index in range(offset,min(total,offset+limit)):
            row=b+index//(c-a+1); col=a+index%(c-a+1); ref=f'{get_column_letter(col)}{row}'; count+=1
            item=s['cells'].get(ref)
            if not item or (item['value'] is None and not item.get('formula')): continue
            value=item['value']
            if isinstance(value,Decimal): value=text(value)
            rows.setdefault(row,{'row':row})[get_column_letter(col)]={'formula':'='+item['formula'],'cached':value} if item.get('formula') else value
        candidates=[]
        for row in range(1,21):
            items=[v['value'] for k,v in s['cells'].items() if coordinate_to_tuple(k)[0]==row]
            score=sum(bool(re.search('科目|日期|借方|贷方|余额|客户|金额|名称|类别|期间|项目|部门|方向',str(v))) for v in items)
            if score>=2: candidates.append({'row':row,'score':score})
        result['pages'].append({'sheet':name,'range':requested or f'{get_column_letter(a)}{b}:{get_column_letter(c)}{d}','rows':list(rows.values()),'cellCount':total,'offset':offset,'nextOffset':offset+count if offset+count<total else None,'headerCandidates':sorted(candidates,key=lambda x:-x['score'])[:4],'headerConfirmed':False})
    result['note']='rows 中每行按列字母给出原值，空白单元格省略；公式给出公式文本和缓存值。未自动认定表头。完整计算由写入计划执行器处理全量范围，不需逐行把明细读给模型。'
    return result

class Compiler:
    def __init__(self, root, files, plan):
        if not isinstance(plan,dict): raise ValueError('填写计划必须是对象')
        self.root=root; self.files={f.relative_to(root).as_posix() for f in files}; self.plan=plan; self.books={}; self.refs=[]; self.scanned=0
        self.planned={}; self.memo={}; self.visiting=set(); self.formula_memo={}; self.formula_visiting=set(); self.depends_memo={}; self.warnings=[]
        self.template=self.book(plan.get('file_path',''))
        self.target_sheets=plan.get('targetSheets',[])
        if not self.target_sheets or len(set(self.target_sheets))!=len(self.target_sheets): raise ValueError('填写计划需要不重复的目标工作表')
        for name in self.target_sheets: self.template.sheet(name)
        self.headers={}
        for h in plan.get('headers',[]):
            book=self.book(h.get('file_path',plan['file_path'])); name=h['sheet']; row=as_int(h['row']); columns=h.get('columns',{})
            if not isinstance(row,int) or row<1 or not isinstance(columns,dict) or not columns: raise ValueError('已确认表头需要行号与实际列文字')
            columns={str(col).strip().upper():label for col,label in columns.items()}
            for col, expected in columns.items():
                ref=f'{col}{row}'; actual=book.cell(name,ref)
                if not same_label(actual,expected): raise PlanIssue(f'{name}!{ref} 实际表头 {actual} 与计划 {expected} 不一致','headers.columns 填写该单元格的实际文字；不确定时先用 read_workbook_range 读取表头行')
                if isinstance(actual,Decimal) and not (actual==actual.to_integral_value() and 1900<=actual<=2100):
                    raise PlanIssue(f'{name}!{ref} 是数据数值 {actual}，不能当作表头','用 read_workbook_range 找到真正的表头行，再修订 headers.row')
            self.headers[(book.ref,name,row)]=columns
        statements=[str(item) for item in plan.get('_userStatements',[]) if item]
        self.period_targets=set()
        for check in plan.get('periodChecks',[]):
            labels=[]
            for side in ('source','target'):
                source=check[side]; book=self.book(source.get('file_path',plan['file_path']))
                value=book.cell(source['sheet'],source['cell']) if source.get('cell') or side=='target' else None
                years=set(re.findall(YEAR,str(value))) if value is not None else set()
                confirmed=str(source.get('confirmedYear','')).strip()
                if confirmed:
                    # A sheet without any period label can carry the year the user stated in the request or an answer.
                    if not re.fullmatch(YEAR,confirmed) or not any(confirmed in re.findall(YEAR,item) for item in statements):
                        raise PlanIssue(f'{source["sheet"]} 的 confirmedYear {confirmed} 没有出现在用户的要求或回答中','confirmedYear 只能填写用户明确说过的年份；用户还没说明时，用 ask_user_questions 请用户确认来源年份')
                    if years and confirmed not in years: raise PlanIssue(f'{source["sheet"]}!{source.get("cell")} 标示 {value}，与 confirmedYear {confirmed} 不同','核对来源单元格，或去掉 cell 只保留用户确认的年份')
                    years={confirmed}
                elif len(years)!=1:
                    raise PlanIssue(f'{source["sheet"]}!{source.get("cell")} 的期间标签 {value} 无法唯一确定年份','改用含唯一年份的标签单元格（如来源标题“2025年1-12月”）；资料中没有期间标示时：用户已在要求或回答中说明年份，就在 source 中加 confirmedYear（如 "2025"）；用户还没说明，才用 ask_user_questions 请用户确认')
                labels.append(years)
            if labels[0]!=labels[1]: raise PlanIssue(f'来源期间 {"、".join(sorted(labels[0]))} 与目标 {check["target"]["sheet"]}!{check["target"]["cell"]} 的期间 {"、".join(sorted(labels[1]))} 不同','检查该目标列是否取错了来源列或年份；用户明确要求跨期间填写时再用 ask_user_questions 确认')
            self.period_targets.add((check['target']['sheet'],check['target']['cell']))

    def book(self, ref):
        if not isinstance(ref,str): raise ValueError('来源文件引用无效')
        ref=Path(ref).as_posix()
        if ref not in self.files: raise ValueError('填写计划引用了未登记的输入文件：'+ref)
        if ref not in self.books: self.books[ref]=Book(self.root,ref)
        return self.books[ref]

    def depends(self, key):
        """Whether a template formula reads, directly or through other formulas, a cell this plan writes."""
        if key in self.planned: return True
        if key in self.depends_memo: return self.depends_memo[key]
        item=self.template.sheets.get(key[0],{}).get('cells',{}).get(key[1])
        if not item or item.get('formula') is None: return False
        self.depends_memo[key]=False
        try: refs=formula_refs(item['formula'],key[0]) if item['formula'] else None
        except Exception: refs=None
        result=refs is None or any(self.depends(ref) for ref in refs)
        self.depends_memo[key]=result
        return result

    def value(self, book, sheet, ref):
        """A cell as it will read in the filled workbook: planned writes and the formulas that depend on them are computed."""
        ref=ref.replace('$','').upper(); key=(sheet,ref)
        if book is self.template and key in self.planned: return self.planned_value(key)[0]
        item=book.sheet(sheet)['cells'].get(ref)
        if item and item.get('formula') is not None and ((book is self.template and self.depends(key)) or item['value'] is None):
            return self.formula_value(book,key)
        if item and isinstance(item['value'],dict): return item['value']
        return book.cell(sheet,ref)

    def formula_value(self, book, key):
        memo=(book.ref,)+key
        if memo in self.formula_memo: return self.formula_memo[memo]
        item=book.sheet(key[0])['cells'][key[1]]
        if item.get('sharedFormula') or not item.get('formula'): raise PlanIssue(f'{key[0]}!{key[1]} 是数组公式，填写时无法计算','直接从来源表计算该值，不要引用这个公式单元格')
        if memo in self.formula_visiting: raise PlanIssue(f'{key[0]}!{key[1]} 存在循环公式','不要引用循环计算的单元格')
        self.formula_visiting.add(memo)
        try: result=calculate_formula(item['formula'],key[0],lambda sheet,cell:self.value(book,sheet,cell))
        except PlanIssue: raise
        except (ValueError,NeedsInput) as e:
            raise PlanIssue(f'{key[0]}!{key[1]} 的公式 ={item["formula"]} 无法在填写时计算：{e}','直接从来源表计算该值，不要引用这个公式单元格')
        finally: self.formula_visiting.discard(memo)
        self.formula_memo[memo]=result
        return result

    def planned_value(self, key):
        if key in self.memo: return self.memo[key]
        if key in self.visiting: raise PlanIssue(f'{key[0]}!{key[1]} 的写入规则引用了自身','改为直接从来源表计算')
        self.visiting.add(key); start=len(self.refs)
        try: value=self.expr(self.planned[key])
        except PlanIssue as e:
            # Name the target cell, so the model knows which write to revise.
            if str(e).startswith('计算 '): raise
            raise PlanIssue(f'计算 {key[0]}!{key[1]} 时：{e}',e.hint) from e
        finally: self.visiting.discard(key)
        if isinstance(value,dict): raise PlanIssue(f'{key[0]}!{key[1]} 的结果是 Excel 错误 {value.get("error")}','改为直接从来源表计算')
        if value is None or (isinstance(value,str) and not value.strip()):
            raise PlanIssue(f'{key[0]}!{key[1]} 的来源单元格为空','空白表示金额为零时，用 {op:"add",args:[原表达式]} 按零计算；该位置不需要填写时，从 writes 和 required 中去掉；确实缺少资料时再用 ask_user_questions')
        self.memo[key]=(value,self.refs[start:])
        return self.memo[key]

    def source(self, expr, ref):
        book=self.book(expr.get('file_path',self.plan['file_path'])); sheet=expr['sheet']
        value=self.value(book,sheet,ref)
        self.refs.append({'file_path':book.ref,'sha256':book.hash,'sheet':sheet,'cell':ref,**({'blank':True} if blank(value) else {})})
        return value

    def column(self, value, declared, sheet):
        """A column letter; a header text the plan declared is accepted for it."""
        if isinstance(value,str) and value.strip().upper() in declared: return value.strip().upper()
        matches=[letter for letter,label in declared.items() if same_label(label,value)]
        if len(matches)==1: return matches[0]
        raise PlanIssue(f'{sheet} 的计算列 {value} 没有已验证表头',f'column 填列字母；{sheet} 已声明的表头为 {json.dumps(declared,ensure_ascii=False)}。要用其他列，先在该 headers.columns 中加入列字母和实际表头文字')

    def expr(self, expr, depth=0):
        if isinstance(expr,str): raise PlanIssue(f'计算规则写成了文字 {expr[:60]}','expr 必须是受控规则对象，例如 {"op":"sum","file_path":...,"sheet":...,"headerRow":3,"column":"G","filters":[...]}；不能写 Excel 公式或数值')
        if not isinstance(expr,dict) or depth>20: raise ValueError('计算规则结构无效或嵌套过深')
        op=expr.get('op')
        if op=='cell': return self.source(expr,expr['cell'])
        if op in ('sum','lookup','count'):
            book=self.book(expr.get('file_path',self.plan['file_path'])); sheet=expr['sheet']; header=as_int(expr.get('headerRow'))
            declared=self.headers.get((book.ref,sheet,header))
            if not declared: raise PlanIssue(f'{sheet} 第 {header} 行没有在 headers 中声明表头','在 headers 中加入 {file_path,sheet:"'+str(sheet)+'",row:'+str(header)+',columns:{列字母:实际表头文字}}，headerRow 与 row 保持一致')
            first=as_int(expr.get('startRow',header+1)); last=as_int(expr.get('endRow'))
            if last=='auto' or last is None: last=range_boundaries(book.sheet(sheet)['dataRange'])[3]
            if not isinstance(first,int) or not isinstance(last,int) or first<=header or last<first or last-first>200000: raise ValueError('全量行范围无效或超出预算')
            col=self.column(expr.get('column'),declared,sheet) if expr.get('column') is not None else None
            filters=[{**f,'column':self.column(f.get('column'),declared,sheet)} for f in expr.get('filters',[])]
            wanted=[(f,self.expr(f['valueExpr'],depth+1) if 'valueExpr' in f else f.get('value')) for f in filters]
            cells=book.sheet(sheet)['cells']; selected=[]
            for row in range(first,last+1):
                self.scanned+=1
                if self.scanned>2_000_000: raise ValueError('计算规则重复扫描超过预算，请合并相同汇总规则')
                # Ignore fully empty rows only; a populated row with a blank amount counts as 0, as in Excel.
                if not any(cells.get(f'{c}{row}',{}).get('value') is not None or cells.get(f'{c}{row}',{}).get('formula') for c in declared): continue
                matched=True
                for f,value in wanted:
                    actual=self.value(book,sheet,f'{f["column"]}{row}'); how=f.get('op','equals')
                    if how=='equals': ok=same_text(actual,value)
                    elif how=='contains': ok=text(value) in text(actual)
                    elif how=='starts_with': ok=text(actual).startswith(text(value))
                    elif how=='not_equals': ok=not same_text(actual,value)
                    else: raise ValueError('不支持的筛选规则')
                    if not ok: matched=False; break
                if matched: selected.append(row)
            if op=='count':
                self.refs.append({'file_path':book.ref,'sha256':book.hash,'sheet':sheet,'rows':selected,'operation':'count'}); return Decimal(len(selected))
            if not selected:
                if op=='sum' and expr.get('allowEmpty') is True:
                    self.refs.append({'file_path':book.ref,'sha256':book.hash,'sheet':sheet,'column':col,'rows':[],'sourceCount':0,'scannedRows':last-first+1,'operation':op,'emptyAsZero':True})
                    return Decimal(0)
                conditions='，'.join(f'{f.get("column")} {f.get("op","equals")} “{text(value)}”' for f,value in wanted)
                raise PlanIssue(f'{sheet} 第 {first}–{last} 行没有符合条件的来源'+(f'（筛选：{conditions}）' if conditions else ''),'核对 filters 的列和取值是否与来源实际文字一致；确认来源确实没有该项（例如本期没有发生额）时，在这个 sum 中加 "allowEmpty": true 按 0 填写；不确定时再用 ask_user_questions')
            if op=='lookup' and len(selected)!=1: raise PlanIssue(f'{sheet} 匹配到 {len(selected)} 行（第 {"、".join(map(str,selected[:8]))} 行），lookup 只能唯一匹配','要合计这些行就改用 sum；只取其中一行就增加 filters 使其唯一；无法判断取哪一行时再用 ask_user_questions')
            values=[self.value(book,sheet,f'{col}{r}') for r in selected]
            blanks=[r for v,r in zip(values,selected) if blank(v)]
            self.refs.append({'file_path':book.ref,'sha256':book.hash,'sheet':sheet,'column':col,'rows':selected,'sourceCount':len(selected),'scannedRows':last-first+1,'operation':op,**({'blankRows':blanks} if blanks else {})})
            if op=='lookup': return values[0]
            return sum((amount(v,f'{sheet}!{col}{r}') for v,r in zip(values,selected)),Decimal(0))
        if op in ('add','subtract','multiply','divide','round','concat','trim','text_before','text_after'):
            args=[self.expr(e,depth+1) for e in expr.get('args',[])]
            if op=='concat': return str(expr.get('separator','')).join('' if v is None else text(v) if isinstance(v,Decimal) else str(v) for v in args)
            if op=='trim' and len(args)==1: return text(args[0])
            if op in ('text_before','text_after') and len(args)==1:
                if args[0] is None: raise PlanIssue('文字来源单元格为空','核对来源单元格引用')
                delimiter=expr.get('delimiter'); occurrence=expr.get('occurrence',1)
                if not isinstance(delimiter,str) or not delimiter or not isinstance(occurrence,int) or occurrence==0: raise ValueError('文字截取需要分隔符与非零序号')
                value=text(args[0]) if isinstance(args[0],Decimal) else str(args[0]); matches=[m.start() for m in re.finditer(re.escape(delimiter),value)]
                try: index=matches[occurrence-1 if occurrence>0 else occurrence]
                except IndexError: raise PlanIssue(f'来源文字“{value[:40]}”不包含分隔符 {delimiter}','核对来源单元格或分隔符')
                return value[:index] if op=='text_before' else value[index+len(delimiter):]
            # Arithmetic follows Excel: a blank operand is 0.
            nums=[amount(v,'计算来源') for v in args]
            if op=='add' and nums: return sum(nums,Decimal(0))
            if op=='subtract' and len(nums)==2: return nums[0]-nums[1]
            if op=='multiply' and nums:
                result=Decimal(1)
                for value in nums: result*=value
                return result
            if op=='divide' and len(nums)==2:
                if nums[1]==0: raise PlanIssue('计算分母为零','该位置不适用时从 writes 和 required 中去掉，或保留模板自带的公式；需要用户决定怎么列示时再用 ask_user_questions')
                return nums[0]/nums[1]
            if op=='round' and len(nums)==1:
                digits=expr.get('digits',2)
                if not isinstance(digits,int) or not 0<=digits<=10: raise ValueError('金额精度无效')
                return nums[0].quantize(Decimal(10)**-digits,rounding=ROUND_HALF_UP)
        # Mathematical scale constants are allowed, business values are not.
        if op=='scale':
            factor=number(expr.get('factor'),'换算系数')
            if factor not in (Decimal(-1),Decimal('0.01'),Decimal('0.0001'),Decimal(100),Decimal(1000),Decimal(10000),Decimal(1000000)): raise ValueError('只允许明确的方向或单位换算系数')
            return amount(self.expr(expr['value'],depth+1),'换算来源')*factor
        raise ValueError('不支持的计算规则；不能直接填入模型猜测的业务数值：'+str(op))

    def compile(self):
        required=set()
        for area in self.plan.get('required',[]):
            if area['sheet'] not in self.target_sheets: raise ValueError('必填区域不属于目标表')
            required.update((area['sheet'],c) for c in coords(area['range']))
        if not required or len(required)>MAX_CELLS: raise ValueError('需枚举 1–20000 个必填位置')
        items=[]
        for item in self.plan.get('writes',[]):
            sheet=item['sheet']; reason=item.get('reason','')
            if sheet not in self.target_sheets or not isinstance(reason,str) or not reason.strip(): raise ValueError('每项写入需要目标表和来源/口径说明')
            if 'source' in item:
                source=item['source']; a,b,c,d=bounded_range(item['range']); e,f,g,h=bounded_range(source['range'])
                if c-a!=g-e or d-b!=h-f: raise ValueError('复制来源与目标形状不同')
                expanded=[(target,{'op':'cell',**{k:v for k,v in source.items() if k!='range'},'cell':origin}) for target,origin in zip(coords(item['range']),coords(source['range']))]
            elif 'range' in item:
                expanded=[(cell,row_expression(item['expr'],coordinate_to_tuple(cell)[0])) for cell in coords(item['range'])]
            else: expanded=[(item['cell'],item['expr'])]
            for cell,expr in expanded:
                cell=cell.replace('$','').upper(); key=(sheet,cell)
                if key in self.planned: raise ValueError(f'{sheet}!{cell} 被重复写入')
                if key not in required: raise ValueError(f'{sheet}!{cell} 不在批准的必填范围')
                if len(self.planned)>=MAX_CELLS: raise ValueError('写入单元格超过预算')
                s=self.template.sheet(sheet);row,col=coordinate_to_tuple(cell);a,b,c,d=bounded_range(s['range'],200_000_000)
                for header_row in range(1,min(row,4)):
                    header_cell=f'{get_column_letter(col)}{header_row}';label=s['cells'].get(header_cell,{}).get('value')
                    if re.search(YEAR,str(label)) and (sheet,header_cell) not in self.period_targets:
                        raise PlanIssue(f'{sheet}!{header_cell} 标示期间 {label}，计划没有核对来源期间',f'在 periodChecks 中加入 {{source:{{file_path,sheet,cell:来源中标示同一年份的单元格，如标题或年度表头}},target:{{file_path,sheet:"{sheet}",cell:"{header_cell}"}}}}；来源没有期间标示、但用户已在要求或回答中说明年份时，source 写 {{file_path,sheet,confirmedYear:"该年份"}}；用户没说明时才用 ask_user_questions')
                if not (a<=col<=c and b<=row<=d): raise ValueError(f'{sheet}!{cell} 超出模板现有范围')
                for merge in s['merges']:
                    x,y,z,w=range_boundaries(merge)
                    if x<=col<=z and y<=row<=w and (col,row)!=(x,y): raise ValueError(f'{sheet}!{cell} 位于合并区域内部，不能写入')
                old=s['cells'].get(cell,{}); previous=old.get('value')
                if old.get('formula') is not None: raise PlanIssue(f'{sheet}!{cell} 已有模板公式 ={old["formula"]}','不要写入公式单元格；把它留在 required 中即可，程序会按写入的数值重算并核对')
                # Zero and dash placeholders are blanks waiting to be filled.
                if not blank(previous) and not (isinstance(previous,Decimal) and previous==0) and (not item.get('allowOverwrite') or 'expectedOld' not in item or text(previous)!=text(item['expectedOld'])):
                    raise PlanIssue(f'{sheet}!{cell} 已有内容 {str(previous)[:80]}','确认应该覆盖时，在该 writes 项加 "allowOverwrite": true 和 "expectedOld": 当前内容；不应覆盖时，从 writes 和 required 中去掉这个位置')
                self.planned[key]=expr; items.append((sheet,cell,expr,reason))
        writes=[]
        for sheet,cell,expr,reason in items:
            value,sources=self.planned_value((sheet,cell))
            if isinstance(value,str) and (len(value)>32767 or re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]',value)): raise ValueError('来源文字不符合 Excel 单元格限制')
            writes.append({'sheet':sheet,'cell':cell,'value':str(value) if isinstance(value,Decimal) else value,'valueType':'number' if isinstance(value,Decimal) else 'boolean' if isinstance(value,bool) else 'text','expr':expr,'reason':reason,'sources':sources})
        missing=required-set(self.planned)
        # Existing formula outputs can satisfy a required position after deterministic recalculation.
        formulas=sorted(key for key in missing if self.template.sheet(key[0])['cells'].get(key[1],{}).get('formula') is not None)
        missing-=set(formulas)
        if missing: raise PlanIssue('必填位置缺少映射：'+', '.join(f'{s}!{c}' for s,c in sorted(missing)[:12]),'为这些位置补充 writes，或从 required 中去掉确实不需要填写的位置')
        if any(not any(w['sheet']==name for w in writes) for name in self.target_sheets): raise PlanIssue('有目标工作表尚未提供实际写入映射：'+'、'.join(name for name in self.target_sheets if not any(w['sheet']==name for w in writes)),'为每张目标表加入 writes')
        blanks=sum(1 for w in writes for ref in w['sources'] if ref.get('blank') or ref.get('blankRows'))
        empty=[f'{w["sheet"]}!{w["cell"]}' for w in writes if any(ref.get('emptyAsZero') for ref in w['sources'])]
        if blanks: self.warnings.append(f'有 {blanks} 处来源包含空白金额，已按 Excel 规则计为 0')
        if empty: self.warnings.append('以下位置没有匹配的来源行，按 allowEmpty 填 0：'+'、'.join(empty[:20]))
        snapshots=[{'path':b.ref,'sha256':b.hash} for b in self.books.values()]
        prepared={'version':VERSION,'plan':self.plan,'inputs':snapshots,'writes':writes,'required':sorted([list(k) for k in required]),'requiredFormulas':[list(k) for k in formulas],'targetSheets':self.target_sheets}
        prepared['planHash']=hashlib.sha256(encode(prepared).encode('utf-8')).hexdigest()
        return prepared

def validate_plan(root, files, p):
    plan=p.get('plan');plan=json.loads(plan) if isinstance(plan,str) else plan
    try:
        compiler=Compiler(root,files,plan); prepared=compiler.compile()
        return {'ok':True,'planHash':prepared['planHash'],'inputHashes':prepared['inputs'],'targetSheets':prepared['targetSheets'],'writeCount':len(prepared['writes']),'requiredCount':len(prepared['required']),'preview':[{'sheet':w['sheet'],'cell':w['cell'],'expected':w['value'],'valueType':w['valueType'],'sourceCount':len(w['sources'])} for w in prepared['writes'][:40]],'warnings':compiler.warnings,'version':VERSION}
    except PlanIssue as e: return {'ok':False,'status':'plan_revision','issue':str(e),'hint':e.hint}
    except NeedsInput as e: return {'ok':False,'status':'waiting_for_user','questions':[str(e)]}
    except KeyError as e: return {'ok':False,'status':'plan_revision','issue':f'计划缺少字段 {e}','hint':'对照 save_workbook_plan 的说明补全该字段'}
    except (TypeError,AttributeError) as e: return {'ok':False,'status':'plan_revision','issue':f'计划结构不符合说明：{e}','hint':'required、headers、periodChecks、writes 都是对象数组，expr 是规则对象；对照 save_workbook_plan 的说明修正'}

def patch_cell(raw, ref, value, typ, formula_cache=False):
    prefix_match=re.search(r'<((?:[\w.-]+:)?)(?:worksheet)\b',raw); prefix=prefix_match.group(1) if prefix_match else ''
    tag=prefix+'c';pattern=rf'<{re.escape(tag)}\b[^>]*\br=["\']{ref}["\'][^>]*?(?:/>|>.*?</{re.escape(tag)}>)'
    old=re.search(pattern,raw,re.S)
    opening=re.match(r'<[^>]+',old.group() if old else f'<{tag} r="{ref}"').group().rstrip('/')
    opening=re.sub(r'\s+t=["\'][^"\']*["\']','',opening)
    if typ=='number': body=f'<{prefix}v>{value}</{prefix}v>'
    elif typ=='boolean': opening+=' t="b"';body=f'<{prefix}v>{1 if value else 0}</{prefix}v>'
    elif typ=='error': opening+=' t="e"';body=f'<{prefix}v>{html.escape(str(value))}</{prefix}v>'
    else: opening+=' t="inlineStr"';body=f'<{prefix}is><{prefix}t xml:space="preserve">{html.escape(str(value))}</{prefix}t></{prefix}is>'
    if formula_cache:
        if not old: raise ValueError('公式缓存目标不存在')
        original=old.group(); f=re.search(rf'<{prefix}f\b[^>]*?(?:/>|>.*?</{prefix}f>)',original,re.S)
        if not f: raise ValueError('公式缓存目标没有公式')
        if typ=='text': opening=re.sub(r' t="inlineStr"',' t="str"',opening);body=f'<{prefix}v>{html.escape(str(value))}</{prefix}v>'
        body=f.group()+body
    replacement=opening+'>'+body+f'</{tag}>'
    if old: return raw[:old.start()]+replacement+raw[old.end():]
    row,col=coordinate_to_tuple(ref);rowtag=prefix+'row';rp=rf'<{rowtag}\b[^>]*\br=["\']{row}["\'][^>]*?(?:/>|>.*?</{rowtag}>)'
    found=re.search(rp,raw,re.S)
    if found:
        rowxml=found.group()
        if rowxml.endswith('/>'): rowxml=rowxml[:-2]+'>'+replacement+f'</{rowtag}>'
        else:
            insert=len(rowxml)-len(f'</{rowtag}>')
            for m in re.finditer(rf'<{tag}\b[^>]*\br=["\']([A-Z]+\d+)["\']',rowxml):
                if coordinate_to_tuple(m.group(1))[1]>col: insert=m.start();break
            rowxml=rowxml[:insert]+replacement+rowxml[insert:]
        return raw[:found.start()]+rowxml+raw[found.end():]
    insert=raw.index(f'</{prefix}sheetData>')
    for m in re.finditer(rf'<{rowtag}\b[^>]*\br=["\'](\d+)["\']',raw):
        if int(m.group(1))>row: insert=m.start();break
    return raw[:insert]+f'<{rowtag} r="{row}">'+replacement+f'</{rowtag}>'+raw[insert:]

def formula_refs(formula, default_sheet):
    refs=[]
    for token in Tokenizer('='+formula).items:
        if token.type=='OPERAND' and token.subtype=='RANGE':
            text=token.value;sheet,span=text.rsplit('!',1) if '!' in text else (default_sheet,text)
            sheet=sheet.strip("'").replace("''", "'")
            refs.extend((sheet,c) for c in coords(span,MAX_CELLS))
    return refs

class FormulaError(Exception):
    """An Excel error value (#DIV/0!, #VALUE!) that IF/IFERROR may still handle."""

def calculate_formula(formula, sheet, value):
    tokens=[t for t in Tokenizer('='+formula).items if t.type!='WHITE-SPACE']; index=0
    # Excel semantics inside template formulas: a blank cell is 0 in arithmetic and "" in text.
    def num(v):
        if isinstance(v,FormulaError): raise v
        if v is None: return Decimal(0)
        if isinstance(v,bool): return Decimal(int(v))
        if isinstance(v,str) and not v.strip(): raise FormulaError('#VALUE!')
        try: return number(v,'公式')
        except NeedsInput: raise FormulaError('#VALUE!')
    def truth(v):
        if isinstance(v,FormulaError): raise v
        if isinstance(v,str): raise FormulaError('#VALUE!')
        return bool(v) if isinstance(v,bool) else num(v)!=0
    def compare(op,left,right):
        for v in (left,right):
            if isinstance(v,FormulaError): raise v
        if left is None: left=Decimal(0) if not isinstance(right,str) else ''
        if right is None: right=Decimal(0) if not isinstance(left,str) else ''
        if isinstance(left,str) or isinstance(right,str):
            if not (isinstance(left,str) and isinstance(right,str)): return op in ('<>',)
            left,right=left.lower(),right.lower()
        else: left,right=num(left),num(right)
        return {'=':left==right,'<>':left!=right,'<':left<right,'>':left>right,'<=':left<=right,'>=':left>=right}[op]
    def guarded():
        # Arguments are evaluated eagerly; an error is carried as a value so IF/IFERROR can discard it.
        try: return expression(0)
        except FormulaError as e: return e
        except PlanIssue: raise
        except NeedsInput: return FormulaError('#VALUE!')
    def atom():
        nonlocal index
        if index>=len(tokens): raise ValueError('公式不完整')
        t=tokens[index];index+=1
        if t.type=='OPERATOR-PREFIX': return -num(atom()) if t.value=='-' else num(atom())
        if t.type=='PAREN' and t.subtype=='OPEN':
            result=expression(0)
            if index>=len(tokens) or tokens[index].type!='PAREN' or tokens[index].subtype!='CLOSE': raise ValueError('公式括号不完整')
            index+=1;return result
        if t.type=='FUNC' and t.subtype=='OPEN':
            name=t.value[:-1].upper();args=[]
            while index<len(tokens) and tokens[index].subtype!='CLOSE':
                args.append(guarded())
                if index<len(tokens) and tokens[index].type=='SEP': index+=1
                else: break
            if index>=len(tokens) or tokens[index].type!='FUNC' or tokens[index].subtype!='CLOSE': raise ValueError('公式函数不完整')
            index+=1;flat=[v for a in args for v in (a if isinstance(a,list) else [a])]
            if name=='IF' and len(args) in (2,3):
                chosen=args[1] if truth(args[0]) else (args[2] if len(args)==3 else False)
                if isinstance(chosen,FormulaError): raise chosen
                return chosen
            if name=='IFERROR' and len(args)==2:
                chosen=args[1] if isinstance(args[0],FormulaError) else args[0]
                if isinstance(chosen,FormulaError): raise chosen
                return chosen
            for v in flat:
                if isinstance(v,FormulaError): raise v
            if name in ('AND','OR') and flat:
                values=[truth(v) for v in flat if v is not None]
                return all(values) if name=='AND' else any(values)
            if name=='NOT' and len(args)==1: return not truth(args[0])
            if name in ('SUM','MIN','MAX'):
                # Ranges skip blanks and text, as Excel does.
                nums=[num(v) for v in flat if v is not None and not isinstance(v,str)]
                if not nums: return Decimal(0)
                return sum(nums,Decimal(0)) if name=='SUM' else min(nums) if name=='MIN' else max(nums)
            if name=='ABS' and len(args)==1: return abs(num(args[0]))
            if name in ('ROUND','ROUNDUP','ROUNDDOWN') and len(args)==2:
                digits=int(num(args[1]))
                if not -10<=digits<=10: raise ValueError('公式精度超范围')
                mode={'ROUND':ROUND_HALF_UP,'ROUNDUP':ROUND_UP,'ROUNDDOWN':ROUND_DOWN}[name]
                return num(args[0]).quantize(Decimal(10)**-digits,rounding=mode)
            raise ValueError('暂不支持计算此模板函数：'+name)
        if t.type=='OPERAND':
            if t.subtype=='NUMBER': return Decimal(t.value)
            if t.subtype=='TEXT': return t.value[1:-1].replace('""','"')
            if t.subtype=='LOGICAL': return t.value.upper()=='TRUE'
            if t.subtype=='RANGE':
                source,span=t.value.rsplit('!',1) if '!' in t.value else (sheet,t.value);source=source.strip("'").replace("''", "'")
                values=[fetch(source,c) for c in coords(span)]
                if len(values)==1 and isinstance(values[0],FormulaError): raise values[0]
                return values[0] if len(values)==1 else values
        raise ValueError('暂不支持此模板公式结构')
    def fetch(source,cell):
        v=value(source,cell)
        return FormulaError(v.get('error','#VALUE!')) if isinstance(v,dict) else v
    ranks={'=':1,'<>':1,'<':1,'>':1,'<=':1,'>=':1,'&':2,'+':3,'-':3,'*':4,'/':4,'^':5}
    def expression(minimum):
        nonlocal index
        result=atom()
        while index<len(tokens):
            t=tokens[index]
            if t.type=='OPERATOR-POSTFIX' and t.value=='%': index+=1;result=num(result)/100;continue
            rank=ranks.get(t.value,0) if t.type=='OPERATOR-INFIX' else 0
            if not rank or rank<minimum: break
            index+=1;right=expression(rank if t.value=='^' else rank+1);left=result
            if t.value in ('=','<>','<','>','<=','>='): result=compare(t.value,left,right);continue
            if t.value=='&':
                for v in (left,right):
                    if isinstance(v,FormulaError): raise v
                text=lambda v:'' if v is None else ('TRUE' if v is True else 'FALSE' if v is False else (format(v.normalize(),'f') if isinstance(v,Decimal) else str(v)))
                result=text(left)+text(right);continue
            right=num(right);left=num(left)
            if t.value=='+': result=left+right
            elif t.value=='-': result=left-right
            elif t.value=='*': result=left*right
            elif t.value=='/':
                if right==0: raise FormulaError('#DIV/0!')
                result=left/right
            elif t.value=='^':
                if right!=right.to_integral_value() or abs(right)>10: raise ValueError('公式指数超出预算')
                result=left**int(right)
        return result
    # An error result such as #DIV/0! is what Excel itself shows for this formula.
    try: result=expression(0)
    except FormulaError as e: return {'error':e.args[0] if e.args and str(e.args[0]).startswith('#') else '#VALUE!'}
    if index!=len(tokens) or isinstance(result,list): raise ValueError('模板公式无法完整计算')
    return result

def set_full_calc(raw):
    """Ask Excel to recalculate every formula when the file opens; used when some caches could not be computed here."""
    if re.search(r'<(?:\w+:)?calcPr\b',raw):
        return re.sub(r'<((?:\w+:)?calcPr)\b([^>]*?)(/?)>',lambda m:'<'+m.group(1)+re.sub(r'\s+fullCalcOnLoad=["\'][^"\']*["\']','',m.group(2))+' fullCalcOnLoad="1"'+m.group(3)+'>',raw,count=1)
    prefix=(re.search(r'<((?:[\w.-]+:)?)workbook\b',raw) or [None,''])[1]
    # The schema puts calcPr after sheets, functionGroups, externalReferences and definedNames.
    anchors=list(re.finditer(rf'</{prefix}(?:sheets|functionGroups|externalReferences|definedNames)>|<{prefix}functionGroups\b[^>]*/>',raw))
    tag=f'<{prefix}calcPr fullCalcOnLoad="1"/>'
    return raw[:anchors[-1].end()]+tag+raw[anchors[-1].end():] if anchors else raw

def stored(book, sheet, cell):
    item=book.sheet(sheet)['cells'].get(cell,{})
    return item.get('value'),item.get('formula')

def fill_workbook(root, files, p, stage):
    plan=p['plan'];plan=json.loads(plan) if isinstance(plan,str) else plan
    compiler=Compiler(root,files,plan); prepared=compiler.compile()
    if p.get('expectedPlanHash') and p['expectedPlanHash']!=prepared['planHash']: raise NeedsInput('填写计划或来源版本已变化，请重新验证并保存计划')
    template=compiler.template; changes={};written={};computed={};pending={}
    for w in prepared['writes']:
        key=(w['sheet'],w['cell']);written[key]=Decimal(w['value']) if w['valueType']=='number' else w['value']
        part=template.sheet(w['sheet'])['part'];raw=changes.get(part,template.sheet(w['sheet'])['raw'])
        changes[part]=patch_cell(raw,w['cell'],w['value'],w['valueType'])
    # Every template formula that reads a written cell gets a fresh cache, computed with the same rules as the plan.
    affected=[(name,ref) for name,s in template.sheets.items() for ref,c in s['cells'].items() if c.get('formula') is not None and compiler.depends((name,ref))]
    for key in affected:
        try: v=compiler.formula_value(template,key)
        except (NeedsInput,ValueError,RecursionError) as e: pending[key]=str(e);continue
        computed[key]=v;part=template.sheet(key[0])['part']
        typ='error' if isinstance(v,dict) else 'number' if isinstance(v,Decimal) else 'boolean' if isinstance(v,bool) else 'text'
        changes[part]=patch_cell(changes.get(part,template.sheet(key[0])['raw']),key[1],v['error'] if typ=='error' else str(v) if isinstance(v,Decimal) else v,typ,True)
    # Formulas this engine cannot evaluate lose their stale cache; Excel recalculates them when the file opens.
    for sheet,cell in pending:
        part=template.sheet(sheet)['part'];raw=changes.get(part,template.sheet(sheet)['raw'])
        pat=rf'(<(?:\w+:)?c\b[^>]*\br=["\']{cell}["\'][^>]*>)(.*?)(</(?:\w+:)?c>)'
        changes[part]=re.sub(pat,lambda m:re.sub(r'\s+t=["\'][^"\']*["\']','',m.group(1))+re.sub(r'<(?:\w+:)?v\b[^>]*(?:/>|>.*?</(?:\w+:)?v>)','',m.group(2),flags=re.S)+m.group(3),raw,flags=re.S)
    if pending:
        with zipfile.ZipFile(template.path) as z: changes['xl/workbook.xml']=set_full_calc(z.read('xl/workbook.xml').decode('utf-8'))
    output=stage/('填写成果'+template.path.suffix.lower())
    with zipfile.ZipFile(template.path) as source,zipfile.ZipFile(output,'w') as destination:
        for item in source.infolist(): destination.writestr(item,changes[item.filename].encode('utf-8') if item.filename in changes else source.read(item.filename))
    # Independent reopen of the saved package; compare values and every untouched part/cell.
    actual=Book(stage,output.name)
    verified=[];recalc=[]
    for sheet,cell in prepared['required']:
        key=(sheet,cell)
        if key in pending:
            value,formula=stored(actual,sheet,cell)
            if formula is None or value is not None: raise ValueError(f'重读核对不一致：{sheet}!{cell} 待重算公式仍有旧缓存')
            recalc.append({'sheet':sheet,'cell':cell,'formula':'='+formula,'reason':pending[key]});continue
        expected=written.get(key,computed.get(key))
        if expected is None:
            # A required template formula that no write affects keeps its own value.
            value,formula=stored(template,sheet,cell)
            if formula is None: raise ValueError(f'重读核对不一致：{sheet}!{cell}')
            expected=value
        if stored(actual,sheet,cell)[0]!=expected: raise ValueError(f'重读核对不一致：{sheet}!{cell}')
        verified.append({'sheet':sheet,'cell':cell,'expected':expected['error'] if isinstance(expected,dict) else str(expected) if isinstance(expected,Decimal) else expected})
    with zipfile.ZipFile(template.path) as source,zipfile.ZipFile(output) as result:
        if source.namelist()!=result.namelist(): raise ValueError('模板包结构发生变化')
        for part in source.namelist():
            if part not in changes and source.read(part)!=result.read(part): raise ValueError('非目标包部件被改变：'+part)
        if 'xl/workbook.xml' in changes and re.sub(r'<(?:\w+:)?calcPr\b[^>]*>','',source.read('xl/workbook.xml').decode('utf-8'))!=re.sub(r'<(?:\w+:)?calcPr\b[^>]*>','',result.read('xl/workbook.xml').decode('utf-8')): raise ValueError('工作簿设置被改变')
    touched=set(written)|set(computed)|set(pending)
    for name,s in template.sheets.items():
        if s['merges']!=actual.sheet(name)['merges']: raise ValueError('模板合并区域发生变化')
        for cell,old in s['cells'].items():
            new=actual.sheet(name)['cells'].get(cell,{})
            if old.get('style')!=new.get('style') or old.get('formula')!=new.get('formula'): raise ValueError(f'模板样式或公式被改变：{name}!{cell}')
            if (name,cell) not in touched and old.get('value')!=new.get('value'): raise ValueError(f'非目标值被改变：{name}!{cell}')
    for snapshot in prepared['inputs']:
        if sha(root/snapshot['path'])!=snapshot['sha256']: raise ValueError('填写期间来源版本发生变化')
    errors=[f'{s}!{c} 的公式结果为 {v["error"]}（Excel 打开时同样显示）' for (s,c),v in computed.items() if isinstance(v,dict) and [s,c] in prepared['required']]
    receipt={'version':VERSION,'status':'passed','planHash':prepared['planHash'],'targetSheets':prepared['targetSheets'],'writeCount':len(written),'requiredCount':len(prepared['required']),'verifiedCount':len(verified),'recalcCount':len(recalc),'formulaCount':len(computed),'checks':['source_hashes','header_values','required_coverage','deterministic_calculations','saved_cell_reread','untouched_package_parts','styles_formulas_merges'],'cells':verified,'recalculateOnOpen':recalc,'pendingFormulaCount':len(pending),'warnings':compiler.warnings+errors}
    (stage/'写入计划.json').write_text(json.dumps(prepared,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
    (stage/'填写核对.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
    warnings=compiler.warnings+errors+[f'{s}!{c} 的公式需在 Excel 打开时重算：{v}' for (s,c),v in pending.items()]
    return {'files':[output.name,'写入计划.json','填写核对.json'],'rowCount':len(written),'preview':verified[:20],'workbookValidation':{k:v for k,v in receipt.items() if k not in ('cells',)},'warnings':warnings}
