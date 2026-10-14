"""Bounded workbook plans. Patch only requested cells in the original OOXML package.

No Python/SQL/Excel code from the model is executed. Sources, expected values and
coverage are compiled before writing; the saved file is independently reopened.
"""
from __future__ import annotations
import hashlib, json, re, zipfile, posixpath, html
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from xml.etree import ElementTree as ET
from openpyxl.utils.cell import range_boundaries, get_column_letter, coordinate_to_tuple
from openpyxl.formula.tokenizer import Tokenizer

NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
MAX_CELLS = 20000
MAX_READ = 1200
VERSION = 'workbook-plan/1'

class NeedsInput(ValueError):
    pass

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
                    cells[ref] = {'value':value, 'formula':formula.text if formula is not None else None, 'type':typ, 'style':cell.attrib.get('s'), 'sharedFormula':formula is not None and formula.attrib.get('t') in ('shared', 'array', 'dataTable')}
                dim = tree.find(f'{{{NS}}}dimension')
                merges = [m.attrib['ref'] for m in tree.iter(f'{{{NS}}}mergeCell')]
                occupied = [coordinate_to_tuple(k) for k,v in cells.items() if v['value'] is not None or v['formula'] is not None]
                extent = f'A1:{get_column_letter(max((c for r,c in occupied),default=1))}{max((r for r,c in occupied),default=1)}'
                self.sheets[name] = {'part':part,'raw':raw,'cells':cells,'merges':merges,'range':dim.attrib.get('ref',extent) if dim is not None else extent,'dataRange':extent,'state':item.attrib.get('state','visible')}

    def sheet(self, name):
        if name not in self.sheets: raise ValueError(f'工作表不存在：{name}')
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
        cells = []
        for index in range(offset,min(total,offset+limit)):
            row=b+index//(c-a+1); col=a+index%(c-a+1); ref=f'{get_column_letter(col)}{row}'
            item=s['cells'].get(ref,{'value':None,'formula':None,'type':'n','style':None})
            cells.append({'cell':ref,'value':item['value'],'type':item['type'],**({'formula':item['formula']} if item.get('formula') is not None else {}),**({'style':item['style']} if item.get('style') is not None else {})})
        candidates=[]
        for row in range(1,21):
            items=[v['value'] for k,v in s['cells'].items() if coordinate_to_tuple(k)[0]==row]
            score=sum(bool(re.search('科目|日期|借方|贷方|余额|客户|金额|名称|类别|期间|项目|部门|方向',str(v))) for v in items)
            if score>=2: candidates.append({'row':row,'score':score})
        result['pages'].append({'sheet':name,'range':requested or f'{get_column_letter(a)}{b}:{get_column_letter(c)}{d}','cells':cells,'cellCount':total,'offset':offset,'nextOffset':offset+len(cells) if offset+len(cells)<total else None,'headerCandidates':sorted(candidates,key=lambda x:-x['score'])[:4],'headerConfirmed':False})
    result['note']='原始坐标和公式缓存；未自动认定表头。完整计算由写入计划执行器处理全量范围，不需逐行把明细读给模型。'
    return result

class Compiler:
    def __init__(self, root, files, plan):
        if not isinstance(plan,dict): raise ValueError('填写计划必须是对象')
        self.root=root; self.files={f.relative_to(root).as_posix() for f in files}; self.plan=plan; self.books={}; self.refs=[]; self.scanned=0
        self.template=self.book(plan.get('file_path',''))
        self.target_sheets=plan.get('targetSheets',[])
        if not self.target_sheets or len(set(self.target_sheets))!=len(self.target_sheets): raise ValueError('填写计划需要不重复的目标工作表')
        for name in self.target_sheets: self.template.sheet(name)
        self.headers={}
        for h in plan.get('headers',[]):
            book=self.book(h.get('file_path',plan['file_path'])); name=h['sheet']; row=h['row']; columns=h.get('columns',{})
            if not isinstance(row,int) or row<1 or not columns: raise ValueError('已确认表头需要行号与实际列文字')
            for col, expected in columns.items():
                ref=f'{col}{row}'; actual=book.cell(name,ref)
                if str(actual)!=str(expected): raise NeedsInput(f'{name}!{ref} 实际表头 {actual} 与计划 {expected} 不一致')
                if isinstance(actual,Decimal) and not (actual==actual.to_integral_value() and 1900<=actual<=2100):
                    raise NeedsInput(f'{name}!{ref} 是数据数值 {actual}，不能当作表头，请重新确认表头行')
            self.headers[(book.ref,name,row)]=columns
        self.period_targets=set()
        for check in plan.get('periodChecks',[]):
            labels=[]
            for side in ('source','target'):
                source=check[side]; value=self.book(source.get('file_path',plan['file_path'])).cell(source['sheet'],source['cell'])
                years=set(re.findall(r'(?<!\d)(?:19|20)\d{2}(?!\d)',str(value)))
                if len(years)!=1:
                    confirmed=str(source.get('confirmedYear','')); statement=source.get('confirmation')
                    if not confirmed or statement not in plan.get('_userStatements',[]) or confirmed not in re.findall(r'(?<!\d)(?:19|20)\d{2}(?!\d)',str(statement)) or (years and confirmed not in years):
                        raise NeedsInput(f'{source["sheet"]}!{source["cell"]} 的期间标签 {value} 无法唯一确定年份，请确认口径')
                    years={confirmed}
                labels.append(years)
            if labels[0]!=labels[1]: raise NeedsInput('来源期间与目标期间不同，不能直接填入；请确认年份和应采用的金额列')
            self.period_targets.add((check['target']['sheet'],check['target']['cell']))

    def book(self, ref):
        if not isinstance(ref,str): raise ValueError('来源文件引用无效')
        ref=Path(ref).as_posix()
        if ref not in self.files: raise ValueError('填写计划引用了未登记的输入文件：'+ref)
        if ref not in self.books: self.books[ref]=Book(self.root,ref)
        return self.books[ref]

    def source(self, expr, ref):
        book=self.book(expr.get('file_path',self.plan['file_path'])); sheet=expr['sheet']
        value=book.cell(sheet,ref)
        self.refs.append({'file_path':book.ref,'sha256':book.hash,'sheet':sheet,'cell':ref})
        return value

    def expr(self, expr, depth=0):
        if not isinstance(expr,dict) or depth>20: raise ValueError('计算规则结构无效或嵌套过深')
        op=expr.get('op')
        if op=='cell': return self.source(expr,expr['cell'])
        if op in ('sum','lookup','count'):
            book=self.book(expr.get('file_path',self.plan['file_path'])); sheet=expr['sheet']; header=expr.get('headerRow')
            declared=self.headers.get((book.ref,sheet,header))
            if not declared: raise NeedsInput(f'{sheet} 的汇总或匹配需要先保存并核对实际表头')
            first=expr.get('startRow',header+1); last=expr.get('endRow')
            if last=='auto' or last is None: last=range_boundaries(book.sheet(sheet)['dataRange'])[3]
            if not isinstance(first,int) or not isinstance(last,int) or first<=header or last<first or last-first>200000: raise ValueError('全量行范围无效或超出预算')
            col=expr.get('column'); filters=expr.get('filters',[])
            for column in ([col] if col else [])+[f.get('column') for f in filters]:
                if column not in declared: raise NeedsInput(f'{sheet} 的计算列 {column} 没有已验证表头')
            selected=[]
            for row in range(first,last+1):
                self.scanned+=1
                if self.scanned>2_000_000: raise ValueError('计算规则重复扫描超过预算，请合并相同汇总规则')
                # Ignore fully empty rows only; populated rows with a missing amount fail below.
                if not any(book.sheet(sheet)['cells'].get(f'{c}{row}',{}).get('value') is not None or book.sheet(sheet)['cells'].get(f'{c}{row}',{}).get('formula') for c in declared): continue
                matched=True
                for f in filters:
                    actual=book.cell(sheet,f'{f["column"]}{row}'); wanted=self.expr(f['valueExpr'],depth+1) if 'valueExpr' in f else f.get('value'); how=f.get('op','equals')
                    text='' if actual is None else str(actual).strip(); wanted=str(wanted)
                    if how=='equals': ok=text==wanted
                    elif how=='contains': ok=wanted in text
                    elif how=='starts_with': ok=text.startswith(wanted)
                    elif how=='not_equals': ok=text!=wanted
                    else: raise ValueError('不支持的筛选规则')
                    if not ok: matched=False; break
                if matched: selected.append(row)
            if op=='count':
                self.refs.append({'file_path':book.ref,'sha256':book.hash,'sheet':sheet,'rows':selected,'operation':'count'}); return Decimal(len(selected))
            if not selected: raise NeedsInput(f'{sheet} 第 {first}–{last} 行没有符合条件的来源，不能填零代替缺失')
            if op=='lookup' and len(selected)!=1: raise NeedsInput(f'{sheet} 匹配到 {len(selected)} 行，不能擅自取第一行；需确认汇总或唯一匹配口径')
            values=[book.cell(sheet,f'{col}{r}') for r in selected]
            self.refs.append({'file_path':book.ref,'sha256':book.hash,'sheet':sheet,'column':col,'rows':selected,'sourceCount':len(selected),'scannedRows':last-first+1,'operation':op})
            if op=='lookup': return values[0]
            return sum((number(v,f'{sheet}!{col}{r}') for v,r in zip(values,selected)),Decimal(0))
        if op in ('add','subtract','multiply','divide','round','concat','trim','text_before','text_after'):
            args=[self.expr(e,depth+1) for e in expr.get('args',[])]
            if op=='concat': return str(expr.get('separator','')).join('' if v is None else str(v) for v in args)
            if op=='trim' and len(args)==1: return str(args[0] if args[0] is not None else '').strip()
            if op in ('text_before','text_after') and len(args)==1:
                if args[0] is None: raise NeedsInput('文字来源缺失')
                delimiter=expr.get('delimiter'); occurrence=expr.get('occurrence',1)
                if not isinstance(delimiter,str) or not delimiter or not isinstance(occurrence,int) or occurrence==0: raise ValueError('文字截取需要分隔符与非零序号')
                text=str(args[0]); matches=[m.start() for m in re.finditer(re.escape(delimiter),text)]
                try: index=matches[occurrence-1 if occurrence>0 else occurrence]
                except IndexError: raise NeedsInput('来源文字不包含指定分隔符，不能推造字段')
                return text[:index] if op=='text_before' else text[index+len(delimiter):]
            nums=[number(v,'计算来源') for v in args]
            if op=='add' and nums: return sum(nums,Decimal(0))
            if op=='subtract' and len(nums)==2: return nums[0]-nums[1]
            if op=='multiply' and nums:
                result=Decimal(1)
                for value in nums: result*=value
                return result
            if op=='divide' and len(nums)==2:
                if nums[1]==0: raise NeedsInput('计算分母为零，需明确该目标的缺失或不适用处理')
                return nums[0]/nums[1]
            if op=='round' and len(nums)==1:
                digits=expr.get('digits',2)
                if not isinstance(digits,int) or not 0<=digits<=10: raise ValueError('金额精度无效')
                return nums[0].quantize(Decimal(10)**-digits,rounding=ROUND_HALF_UP)
        # Mathematical scale constants are allowed, business values are not.
        if op=='scale':
            factor=number(expr.get('factor'),'换算系数')
            if factor not in (Decimal(-1),Decimal('0.01'),Decimal('0.0001'),Decimal(100),Decimal(1000),Decimal(10000),Decimal(1000000)): raise ValueError('只允许明确的方向或单位换算系数')
            return number(self.expr(expr['value'],depth+1),'换算来源')*factor
        raise ValueError('不支持的计算规则；不能直接填入模型猜测的业务数值：'+str(op))

    def compile(self):
        required=set()
        for area in self.plan.get('required',[]):
            if area['sheet'] not in self.target_sheets: raise ValueError('必填区域不属于目标表')
            required.update((area['sheet'],c) for c in coords(area['range']))
        if not required or len(required)>MAX_CELLS: raise ValueError('需枚举 1–20000 个必填位置')
        writes=[];seen=set()
        for item in self.plan.get('writes',[]):
            sheet=item['sheet']; reason=item.get('reason','')
            if sheet not in self.target_sheets or not isinstance(reason,str) or not reason.strip(): raise ValueError('每项写入需要目标表和来源/口径说明')
            if 'source' in item:
                source=item['source']; a,b,c,d=bounded_range(item['range']); e,f,g,h=bounded_range(source['range'])
                if c-a!=g-e or d-b!=h-f: raise ValueError('复制来源与目标形状不同')
                items=[(target,{'op':'cell',**{k:v for k,v in source.items() if k!='range'},'cell':origin}) for target,origin in zip(coords(item['range']),coords(source['range']))]
            elif 'range' in item:
                items=[(cell,row_expression(item['expr'],coordinate_to_tuple(cell)[0])) for cell in coords(item['range'])]
            else: items=[(item['cell'],item['expr'])]
            for cell,expr in items:
                cell=cell.replace('$',''); key=(sheet,cell)
                if key in seen: raise ValueError(f'{sheet}!{cell} 被重复写入')
                if key not in required: raise ValueError(f'{sheet}!{cell} 不在批准的必填范围')
                if len(seen)>=MAX_CELLS: raise ValueError('写入单元格超过预算')
                seen.add(key);s=self.template.sheet(sheet);row,col=coordinate_to_tuple(cell);a,b,c,d=bounded_range(s['range'],200_000_000)
                for header_row in range(1,min(row,4)):
                    header_cell=f'{get_column_letter(col)}{header_row}';label=s['cells'].get(header_cell,{}).get('value')
                    if re.search(r'(?<!\d)(?:19|20)\d{2}(?!\d)',str(label)) and (sheet,header_cell) not in self.period_targets:
                        raise NeedsInput(f'{sheet}!{header_cell} 标示期间 {label}，需明确同期间来源或取得用户期间确认，不能擅自选择年份')
                if not (a<=col<=c and b<=row<=d): raise ValueError(f'{sheet}!{cell} 超出模板现有范围')
                for merge in s['merges']:
                    x,y,z,w=range_boundaries(merge)
                    if x<=col<=z and y<=row<=w and (col,row)!=(x,y): raise ValueError(f'{sheet}!{cell} 位于合并区域内部，不能写入')
                old=s['cells'].get(cell,{}); previous=old.get('value')
                if old.get('formula') is not None: raise ValueError(f'{sheet}!{cell} 已有模板公式，请保留公式并只填写其输入')
                if previous not in (None,'') and (not item.get('allowOverwrite') or 'expectedOld' not in item or str(previous)!=str(item['expectedOld'])):
                    raise NeedsInput(f'{sheet}!{cell} 已有内容 {str(previous)[:80]}，需明确覆盖依据并核对旧值')
                start=len(self.refs); value=self.expr(expr)
                if value is None or value=='': raise NeedsInput(f'{sheet}!{cell} 缺少来源值，不能将必填项留空后标完成')
                if isinstance(value,str) and (len(value)>32767 or re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]',value)): raise ValueError('来源文字不符合 Excel 单元格限制')
                writes.append({'sheet':sheet,'cell':cell,'value':str(value) if isinstance(value,Decimal) else value,'valueType':'number' if isinstance(value,Decimal) else 'boolean' if isinstance(value,bool) else 'text','expr':expr,'reason':reason,'sources':self.refs[start:]})
        missing=required-seen
        # Existing formula outputs can satisfy a required position after deterministic recalculation.
        formulas=sorted(key for key in missing if self.template.sheet(key[0])['cells'].get(key[1],{}).get('formula') is not None)
        missing-=set(formulas)
        if missing: raise NeedsInput('必填位置缺少映射：'+', '.join(f'{s}!{c}' for s,c in sorted(missing)[:12]))
        if any(not any(w['sheet']==name for w in writes) for name in self.target_sheets): raise NeedsInput('有目标工作表尚未提供实际写入映射')
        snapshots=[{'path':b.ref,'sha256':b.hash} for b in self.books.values()]
        prepared={'version':VERSION,'plan':self.plan,'inputs':snapshots,'writes':writes,'required':sorted([list(k) for k in required]),'requiredFormulas':[list(k) for k in formulas],'targetSheets':self.target_sheets}
        prepared['planHash']=hashlib.sha256(encode(prepared).encode('utf-8')).hexdigest()
        return prepared

def validate_plan(root, files, p):
    plan=p.get('plan');plan=json.loads(plan) if isinstance(plan,str) else plan
    try:
        compiler=Compiler(root,files,plan); prepared=compiler.compile()
        return {'ok':True,'planHash':prepared['planHash'],'inputHashes':prepared['inputs'],'targetSheets':prepared['targetSheets'],'writeCount':len(prepared['writes']),'requiredCount':len(prepared['required']),'preview':[{'sheet':w['sheet'],'cell':w['cell'],'expected':w['value'],'valueType':w['valueType'],'sourceCount':len(w['sources'])} for w in prepared['writes'][:20]],'version':VERSION}
    except NeedsInput as e: return {'ok':False,'status':'waiting_for_user','questions':[str(e)]}

def patch_cell(raw, ref, value, typ, formula_cache=False):
    prefix_match=re.search(r'<((?:[\w.-]+:)?)(?:worksheet)\b',raw); prefix=prefix_match.group(1) if prefix_match else ''
    tag=prefix+'c';pattern=rf'<{re.escape(tag)}\b[^>]*\br=["\']{ref}["\'][^>]*?(?:/>|>.*?</{re.escape(tag)}>)'
    old=re.search(pattern,raw,re.S)
    opening=re.match(r'<[^>]+',old.group() if old else f'<{tag} r="{ref}"').group().rstrip('/')
    opening=re.sub(r'\s+t=["\'][^"\']*["\']','',opening)
    if typ=='number': body=f'<{prefix}v>{value}</{prefix}v>'
    elif typ=='boolean': opening+=' t="b"';body=f'<{prefix}v>{1 if value else 0}</{prefix}v>'
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

def calculate_formula(formula, sheet, value):
    tokens=[t for t in Tokenizer('='+formula).items if t.type!='WHITE-SPACE']; index=0
    def atom():
        nonlocal index
        if index>=len(tokens): raise ValueError('公式不完整')
        t=tokens[index];index+=1
        if t.type=='OPERATOR-PREFIX': return -number(atom(),'公式') if t.value=='-' else number(atom(),'公式')
        if t.type=='PAREN' and t.subtype=='OPEN':
            result=expression(0)
            if index>=len(tokens) or tokens[index].type!='PAREN' or tokens[index].subtype!='CLOSE': raise ValueError('公式括号不完整')
            index+=1;return result
        if t.type=='FUNC' and t.subtype=='OPEN':
            name=t.value[:-1].upper();args=[]
            while index<len(tokens) and tokens[index].subtype!='CLOSE':
                args.append(expression(0))
                if index<len(tokens) and tokens[index].type=='SEP': index+=1
                else: break
            if index>=len(tokens) or tokens[index].type!='FUNC' or tokens[index].subtype!='CLOSE': raise ValueError('公式函数不完整')
            index+=1;flat=[v for a in args for v in (a if isinstance(a,list) else [a])]
            if name in ('SUM','MIN','MAX'):
                nums=[number(v,'公式') for v in flat if v is not None]
                return sum(nums,Decimal(0)) if name=='SUM' else min(nums) if name=='MIN' else max(nums)
            if name=='ABS' and len(args)==1: return abs(number(args[0],'公式'))
            if name=='ROUND' and len(args)==2:
                digits=int(number(args[1],'公式精度'))
                if not -10<=digits<=10: raise ValueError('公式精度超范围')
                return number(args[0],'公式').quantize(Decimal(10)**-digits,rounding=ROUND_HALF_UP)
            raise ValueError('暂不支持计算此模板函数：'+name)
        if t.type=='OPERAND':
            if t.subtype=='NUMBER': return Decimal(t.value)
            if t.subtype=='TEXT': return t.value[1:-1].replace('""','"')
            if t.subtype=='RANGE':
                source,span=t.value.rsplit('!',1) if '!' in t.value else (sheet,t.value);source=source.strip("'").replace("''", "'")
                values=[value(source,c) for c in coords(span)]
                return values[0] if len(values)==1 else values
        raise ValueError('暂不支持此模板公式结构')
    ranks={'+':1,'-':1,'*':2,'/':2,'^':3}
    def expression(minimum):
        nonlocal index
        result=atom()
        while index<len(tokens):
            t=tokens[index]
            if t.type=='OPERATOR-POSTFIX' and t.value=='%': index+=1;result=number(result,'公式')/100;continue
            rank=ranks.get(t.value,0) if t.type=='OPERATOR-INFIX' else 0
            if not rank or rank<minimum: break
            index+=1;right=number(expression(rank if t.value=='^' else rank+1),'公式');left=number(result,'公式')
            if t.value=='+': result=left+right
            elif t.value=='-': result=left-right
            elif t.value=='*': result=left*right
            elif t.value=='/':
                if right==0: raise NeedsInput('模板公式分母为零，需确认不适用处理')
                result=left/right
            elif t.value=='^':
                if right!=right.to_integral_value() or abs(right)>10: raise ValueError('公式指数超出预算')
                result=left**int(right)
        return result
    result=expression(0)
    if index!=len(tokens) or isinstance(result,list): raise ValueError('模板公式无法完整计算')
    return result

def fill_workbook(root, files, p, stage):
    plan=p['plan'];plan=json.loads(plan) if isinstance(plan,str) else plan
    compiler=Compiler(root,files,plan); prepared=compiler.compile()
    if p.get('expectedPlanHash') and p['expectedPlanHash']!=prepared['planHash']: raise NeedsInput('填写计划或来源版本已变化，请重新验证并保存计划')
    template=compiler.template; changes={};written={};formulas={}; affected=set()
    for w in prepared['writes']:
        key=(w['sheet'],w['cell']);v=Decimal(w['value']) if w['valueType']=='number' else w['value'];written[key]=v;affected.add(key)
        part=template.sheet(w['sheet'])['part'];raw=changes.get(part,template.sheet(w['sheet'])['raw'])
        changes[part]=patch_cell(raw,w['cell'],w['value'],w['valueType'])
    for name,s in template.sheets.items():
        for ref,c in s['cells'].items():
            if c.get('formula') is not None:
                try: deps=set(formula_refs(c['formula'],name))
                except Exception: deps=None
                formulas[(name,ref)]={'formula':c['formula'],'deps':deps,'shared':c.get('sharedFormula')}
    while True:
        added={k for k,f in formulas.items() if k not in affected and (f['deps'] is None or bool(f['deps']&affected))}
        if not added: break
        affected|=added
    pending={};cache={};visiting=set()
    def get_value(sheet,cell):
        key=(sheet,cell)
        if key in written: return written[key]
        if key in cache: return cache[key]
        if key in affected and key in formulas:
            if key in visiting: raise NeedsInput(f'{sheet}!{cell} 存在循环公式')
            if formulas[key]['shared']: raise NeedsInput('受影响的共享/数组公式需在 Excel 中重算')
            visiting.add(key)
            try: cache[key]=calculate_formula(formulas[key]['formula'],sheet,get_value);return cache[key]
            finally: visiting.remove(key)
        return template.cell(sheet,cell)
    for key in sorted(affected & formulas.keys()):
        try:
            v=get_value(*key);typ='number' if isinstance(v,Decimal) else 'boolean' if isinstance(v,bool) else 'text';part=template.sheet(key[0])['part']
            changes[part]=patch_cell(changes.get(part,template.sheet(key[0])['raw']),key[1],str(v) if isinstance(v,Decimal) else v,typ,True)
        except Exception as e: pending[key]=str(e)
    blockers={k:v for k,v in pending.items() if k[0] in prepared['targetSheets']}
    if blockers: raise NeedsInput('目标表公式无法核对：'+'；'.join(f'{s}!{c}: {v}' for (s,c),v in list(blockers.items())[:5]))
    # Unsupported affected formulas outside the requested views have stale caches removed.
    for sheet,cell in pending:
        part=template.sheet(sheet)['part'];raw=changes.get(part,template.sheet(sheet)['raw'])
        pat=rf'(<(?:\w+:)?c\b[^>]*\br=["\']{cell}["\'][^>]*>)(.*?)(</(?:\w+:)?c>)'
        changes[part]=re.sub(pat,lambda m:m.group(1)+re.sub(r'<(?:\w+:)?v\b[^>]*(?:/>|>.*?</(?:\w+:)?v>)','',m.group(2),flags=re.S)+m.group(3),raw,flags=re.S)
    output=stage/('填写成果'+template.path.suffix.lower())
    with zipfile.ZipFile(template.path) as source,zipfile.ZipFile(output,'w') as destination:
        for item in source.infolist(): destination.writestr(item,changes[item.filename].encode('utf-8') if item.filename in changes else source.read(item.filename))
    # Independent reopen of the saved package; compare values and every untouched part/cell.
    actual=Book(stage,output.name)
    verified=[]
    for sheet,cell in prepared['required']:
        key=(sheet,cell);expected=written.get(key,cache.get(key))
        if expected is None or actual.cell(sheet,cell)!=expected: raise ValueError(f'重读核对不一致：{sheet}!{cell}')
        verified.append({'sheet':sheet,'cell':cell,'expected':str(expected) if isinstance(expected,Decimal) else expected})
    with zipfile.ZipFile(template.path) as source,zipfile.ZipFile(output) as result:
        if source.namelist()!=result.namelist(): raise ValueError('模板包结构发生变化')
        for part in source.namelist():
            if part not in changes and source.read(part)!=result.read(part): raise ValueError('非目标包部件被改变：'+part)
    for name,s in template.sheets.items():
        if s['merges']!=actual.sheet(name)['merges']: raise ValueError('模板合并区域发生变化')
        for cell,old in s['cells'].items():
            new=actual.sheet(name)['cells'].get(cell,{})
            if old.get('style')!=new.get('style') or old.get('formula')!=new.get('formula'): raise ValueError(f'模板样式或公式被改变：{name}!{cell}')
            if (name,cell) not in affected and old.get('value')!=new.get('value'): raise ValueError(f'非目标值被改变：{name}!{cell}')
    for snapshot in prepared['inputs']:
        if sha(root/snapshot['path'])!=snapshot['sha256']: raise ValueError('填写期间来源版本发生变化')
    receipt={'version':VERSION,'status':'passed','planHash':prepared['planHash'],'targetSheets':prepared['targetSheets'],'writeCount':len(written),'requiredCount':len(verified),'verifiedCount':len(verified),'formulaCount':len(cache),'checks':['source_hashes','header_values','required_coverage','deterministic_calculations','saved_cell_reread','untouched_package_parts','styles_formulas_merges'],'cells':verified,'pendingFormulaCount':len(pending)}
    (stage/'写入计划.json').write_text(json.dumps(prepared,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
    (stage/'填写核对.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
    return {'files':[output.name,'写入计划.json','填写核对.json'],'rowCount':len(written),'preview':verified[:20],'workbookValidation':{k:v for k,v in receipt.items() if k!='cells'},'warnings':[f'{s}!{c} 需在 Excel 中重算：{v}' for (s,c),v in pending.items()]}
