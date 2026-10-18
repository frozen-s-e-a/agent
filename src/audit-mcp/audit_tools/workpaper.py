"""底稿结构解析、区域渲染、语义校验和模板库（《接口约定》3.2～3.4，实现设计 5.2～5.4）。

结构解析只用代码，不调用模型：有把握的直接定下，有歧义的写进 ambiguities 交给区域语义节点。
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import openpyxl
from openpyxl.utils.cell import column_index_from_string, coordinate_to_tuple, get_column_letter, range_boundaries
from openpyxl.worksheet.formula import ArrayFormula

from .common import Result, ToolError, require
from .numbers import DASHES

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'audit-worker'))
from workbook_plan import formula_refs  # noqa: E402

REGION_TYPES = {'detail_table', 'fixed_table', 'form', 'checklist', 'text', 'none'}
META = [
    (re.compile(r'^(被审计单位|单位名称|客户名称)[:：]'), 'entity'),
    (re.compile(r'^(编制人|编制|制表人)[:：]'), 'preparer'),
    (re.compile(r'^(复核人|复核)[:：]'), 'reviewer'),
    (re.compile(r'^(索引号|底稿索引|索引)[:：]'), 'index'),
    (re.compile(r'^(日期|编制日期|复核日期)[:：]'), 'date'),
    (re.compile(r'^(截止日|报表截止日|会计期间|审计期间|期间|所属期间)[:：]'), 'period'),
]
UNIT = re.compile(r'(?:金额)?单位[:：]\s*(人民币)?\s*(元|千元|万元|百万元|亿元)')
TOTAL = re.compile(r'(合\s*计|小\s*计|总\s*计)')
TEXT_AREA = re.compile(r'^(审计说明|审计结论|审计程序|说明|结论|备注|审计意见)[:：]?$')
CHECK_VALUES = {'是', '否', '√', '×', '✓', '✔', '不适用', 'N/A', 'n/a', 'Y', 'N'}
YEAR = re.compile(r'(?<!\d)(19|20)\d{2}(?!\d)')
PERIOD_WORDS = ['期初', '期末', '年初', '年末', '本期', '上期', '本年', '上年']


def norm(text):
    return re.sub(r'\s+', '', str(text or '')).replace('（', '(').replace('）', ')')


def split_ref(ref, default_sheet=None):
    """'应收账款!C7' 或 'C7' → (工作表, 'C7')；区域 'A5:E11' 原样返回第二部分。"""
    if not isinstance(ref, str) or not ref.strip():
        raise ToolError('ARG_INVALID', '单元格引用无效：%r' % (ref,))
    if '!' in ref:
        sheet, cell = ref.rsplit('!', 1)
        sheet = sheet.strip().strip("'").replace("''", "'")
    else:
        sheet, cell = default_sheet, ref
    cell = cell.replace('$', '').strip().upper()
    if not re.fullmatch(r'[A-Z]{1,3}[1-9]\d*(:[A-Z]{1,3}[1-9]\d*)?', cell):
        raise ToolError('ARG_INVALID', '单元格引用无效：%s' % ref, hint='写作 工作表!A1 或 工作表!A1:D20')
    return sheet, cell


def expand(span):
    a, b, c, d = range_boundaries(span)
    return ['%s%d' % (get_column_letter(col), row) for row in range(b, d + 1) for col in range(a, c + 1)]


def quote(sheet):
    return "'%s'" % sheet.replace("'", "''") if re.search(r"[\s'!()（）\-+]", sheet) else sheet


# ---------------------------------------------------------------------------
# 读取


class Sheet:
    """一张工作表的单元格分类。"""

    def __init__(self, ws, values):
        self.name = ws.title
        self.hidden = ws.sheet_state != 'visible'
        self.protected = bool(ws.protection.sheet)
        self.cells = {}
        self.merged_anchor = {}
        for merged in ws.merged_cells.ranges:
            anchor = '%s%d' % (get_column_letter(merged.min_col), merged.min_row)
            for row in range(merged.min_row, merged.max_row + 1):
                for col in range(merged.min_col, merged.max_col + 1):
                    self.merged_anchor['%s%d' % (get_column_letter(col), row)] = (anchor, merged.coord)
        self.merges = [m.coord for m in ws.merged_cells.ranges]
        self.validations = {}
        for dv in ws.data_validations.dataValidation:
            if dv.type == 'list' and dv.formula1:
                options = [o.strip() for o in dv.formula1.strip('"').split(',')]
                for span in str(dv.sqref).split():
                    for ref in expand(span) if ':' in span else [span]:
                        self.validations[ref] = options
        max_row, max_col = 0, 0
        for row in ws.iter_rows():
            for cell in row:
                value = cell.value
                border = cell.border
                bordered = any(getattr(getattr(border, side), 'style', None) for side in ('left', 'right', 'top', 'bottom'))
                if value is None and not bordered:
                    continue
                ref = cell.coordinate
                info = {'bordered': bordered}
                if isinstance(value, ArrayFormula):
                    info['formula'] = value.text.lstrip('=')
                    info['array'] = value.ref
                elif cell.data_type == 'f' or (isinstance(value, str) and value.startswith('=')):
                    info['formula'] = str(value).lstrip('=')
                if 'formula' in info:
                    info['cached'] = values[ref].value
                    info['kind'] = 'formula'
                elif value is None:
                    info['kind'] = 'empty'
                elif isinstance(value, str):
                    text = value.strip()
                    info['text'] = text
                    info['kind'] = 'placeholder' if text in DASHES else 'label' if text else 'empty'
                elif isinstance(value, bool):
                    info['kind'], info['text'] = 'label', str(value)
                elif isinstance(value, (int, float)):
                    info['value'] = value
                    info['kind'] = 'placeholder' if value == 0 else 'number'
                else:
                    info['value'] = str(value)
                    info['kind'] = 'number'
                info['indent'] = int(cell.alignment.indent or 0) if cell.alignment else 0
                self.cells[ref] = info
                if value is not None:
                    max_row, max_col = max(max_row, cell.row), max(max_col, cell.column)
        self.used = 'A1:%s%d' % (get_column_letter(max(max_col, 1)), max(max_row, 1))
        # 被公式引用的单元格：空的就是待填。
        self.referenced = set()
        for ref, info in self.cells.items():
            if 'formula' in info:
                try:
                    for sheet, target in formula_refs(info['formula'], self.name):
                        if sheet == self.name:
                            self.referenced.add(target)
                except Exception:
                    pass

    def kind(self, ref):
        if ref in self.merged_anchor and self.merged_anchor[ref][0] != ref:
            return 'covered'
        return self.cells.get(ref, {}).get('kind', 'blank')

    def text(self, ref):
        anchor = self.merged_anchor.get(ref, (ref,))[0]
        info = self.cells.get(anchor, {})
        return info.get('text') or ''

    def bordered(self, ref):
        return self.cells.get(ref, {}).get('bordered', False)


def load(path):
    try:
        formulas = openpyxl.load_workbook(path, data_only=False)
        values = openpyxl.load_workbook(path, data_only=True)
    except Exception as error:
        raise ToolError('IO_UNREADABLE', '无法读取工作簿：%s' % error)
    return [Sheet(ws, values[ws.title]) for ws in formulas.worksheets]


# ---------------------------------------------------------------------------
# 结构解析


def meta_of(sheet, ref, text):
    unit = UNIT.search(text)
    if unit:
        return {'label': text, 'cell': '%s!%s' % (sheet.name, ref), 'kind': 'unit', 'unit': unit.group(2), 'scope': 'sheet'}
    for pattern, kind in META:
        if pattern.match(text):
            row, col = coordinate_to_tuple(ref)
            rest = pattern.sub('', text).strip()
            item = {'label': pattern.match(text).group(1), 'labelCell': '%s!%s' % (sheet.name, ref), 'kind': kind}
            if rest:
                item['valueCell'] = '%s!%s' % (sheet.name, ref)
                item['inline'] = True
            else:
                # 值在右侧第一个非标签单元格（可能是空的待填位置）。
                for c in range(col + 1, col + 4):
                    target = '%s%d' % (get_column_letter(c), row)
                    if sheet.kind(target) in ('empty', 'placeholder', 'number', 'formula', 'blank', 'label'):
                        if sheet.kind(target) == 'label' and any(p.match(sheet.text(target)) for p, _ in META):
                            break
                        if sheet.kind(target) != 'covered':
                            item['valueCell'] = '%s!%s' % (sheet.name, target)
                            break
            if kind == 'period' and YEAR.search(text):
                item['year'] = YEAR.search(text).group(0)
            return item
    return None


def row_cells(sheet, row, c1, c2):
    return ['%s%d' % (get_column_letter(c), row) for c in range(c1, c2 + 1)]


def occupied(sheet, row):
    return any(coordinate_to_tuple(ref)[0] == row for ref in sheet.cells)


def bands(sheet, skip_rows):
    """按空行把工作表切成若干块：[(首行, 末行)]。"""
    rows = sorted({coordinate_to_tuple(ref)[0] for ref, info in sheet.cells.items() if info['kind'] != 'empty' or info['bordered']} - skip_rows)
    result = []
    for row in rows:
        if result and row == result[-1][1] + 1:
            result[-1][1] = row
        else:
            result.append([row, row])
    return [tuple(b) for b in result]


def extent(sheet, r1, r2):
    cols = [coordinate_to_tuple(ref)[1] for ref, info in sheet.cells.items() if r1 <= coordinate_to_tuple(ref)[0] <= r2 and (info['kind'] != 'empty' or info['bordered'])]
    return min(cols), max(cols)


def is_input(sheet, ref, region_bordered):
    kind = sheet.kind(ref)
    if kind in ('placeholder',):
        return True
    if kind in ('empty', 'blank'):
        return ref in sheet.referenced or (sheet.bordered(ref) if region_bordered else True)
    return False


def analyse(sheet, r1, r2, c1, c2):
    """一块单元格 → 区域描述（未编号）。"""
    caption = None
    texts = [ref for ref in row_cells(sheet, r1, c1, c2) if sheet.kind(ref) == 'label']
    others = [ref for ref in row_cells(sheet, r1, c1, c2) if sheet.kind(ref) in ('number', 'formula')]
    if r2 > r1 and len(texts) == 1 and not others and not any(sheet.bordered(ref) for ref in row_cells(sheet, r1, c1, c2)):
        caption = sheet.text(texts[0])
        if not TEXT_AREA.match(norm(caption)):
            r1 += 1
    region_bordered = any(sheet.bordered(ref) for row in range(r1, r2 + 1) for ref in row_cells(sheet, row, c1, c2))

    # 文字区：说明、结论等标签加一个大的合并区域。
    first = [ref for ref in row_cells(sheet, r1, c1, c2) if sheet.kind(ref) == 'label']
    if first and TEXT_AREA.match(norm(sheet.text(first[0]))):
        label = first[0]
        areas = [ref for row in range(r1, r2 + 1) for ref in row_cells(sheet, row, c1, c2) if ref != label and sheet.kind(ref) in ('empty', 'placeholder') and (ref in sheet.merged_anchor or row > r1)]
        anchors = sorted({sheet.merged_anchor.get(ref, (ref,))[0] for ref in areas}, key=coordinate_to_tuple)
        return {
            'r1': r1, 'r2': r2, 'c1': c1, 'c2': c2, 'type': 'text', 'typeCertain': True, 'headerRows': [], 'caption': sheet.text(label),
            'columns': [], 'rowLabels': [], 'totals': [], 'inputs': anchors[:1] if anchors else [], 'formulas': [], 'labelCols': [], 'ambiguities': [],
        }

    # 表头：顶部只有文字、没有数字和公式的行，最多 3 行。
    header = []
    for row in range(r1, min(r2, r1 + 2) + 1):
        cells = row_cells(sheet, row, c1, c2)
        kinds = [sheet.kind(ref) for ref in cells]
        labels = sum(k == 'label' for k in kinds) + sum(k == 'covered' and bool(sheet.text(ref)) for k, ref in zip(kinds, cells))
        if 'number' in kinds or 'formula' in kinds or labels < 2 or row == r2:
            break
        if any(is_input(sheet, ref, region_bordered) and sheet.kind(ref) == 'placeholder' for ref in cells):
            break
        header.append(row)
    data_rows = [row for row in range(r1, r2 + 1) if row not in header]

    # 行标签列：数据行里大多是文字的左侧列；"序号"列也算。
    label_cols, sequence_cols = [], []
    for col in range(c1, c2 + 1):
        refs = ['%s%d' % (get_column_letter(col), row) for row in data_rows]
        labels = sum(sheet.kind(ref) == 'label' for ref in refs)
        head = ''.join(sheet.text('%s%d' % (get_column_letter(col), row)) for row in header)
        numbers = [sheet.cells.get(ref, {}).get('value') for ref in refs if sheet.kind(ref) == 'number']
        sequence = '序号' in head or (numbers and numbers == list(range(1, len(numbers) + 1)) and len(numbers) >= 2)
        if data_rows and (labels / len(data_rows) >= 0.6 or sequence):
            label_cols.append(col)
            if sequence and labels / len(data_rows) < 0.6:
                sequence_cols.append(col)
        else:
            break
    value_cols = [col for col in range(c1, c2 + 1) if col not in label_cols]

    totals = []
    for row in data_rows:
        text = ''.join(sheet.text('%s%d' % (get_column_letter(col), row)) for col in (label_cols or [c1]))
        sums = [ref for ref in row_cells(sheet, row, c1, c2) if re.match(r'^\s*SUM\(', sheet.cells.get(ref, {}).get('formula', ''), re.I)]
        if TOTAL.search(text) or (sums and not text):
            totals.append({'row': row, 'text': norm(text) or '合计', 'formula': bool(sums)})
    total_rows = {t['row'] for t in totals}

    inputs, formulas = [], []
    for row in data_rows:
        for col in range(c1, c2 + 1):
            ref = '%s%d' % (get_column_letter(col), row)
            kind = sheet.kind(ref)
            if kind == 'formula':
                formulas.append(ref)
            elif col not in label_cols and row not in total_rows and is_input(sheet, ref, region_bordered):
                inputs.append(ref)
            elif col in label_cols and row not in total_rows and kind in ('empty', 'placeholder') and is_input(sheet, ref, region_bordered):
                inputs.append(ref)
    # 合计行里没有公式的空格也要填；合计行本身靠公式求和时，其他空格不算。
    for row in total_rows:
        if any(sheet.kind('%s%d' % (get_column_letter(col), row)) == 'formula' for col in value_cols):
            continue
        for col in value_cols:
            ref = '%s%d' % (get_column_letter(col), row)
            if is_input(sheet, ref, region_bordered):
                inputs.append(ref)

    ambiguities = []
    label_inputs = [ref for ref in inputs if column_index_from_string(re.match(r'[A-Z]+', ref).group()) in label_cols]
    values = [sheet.cells.get(ref, {}).get('text') for row in data_rows for ref in row_cells(sheet, row, c1, c2)]
    choice = [ref for ref in inputs if sheet.validations.get(ref) and set(sheet.validations[ref]) <= CHECK_VALUES]
    if not inputs:
        kind, certain = 'none', True
    elif choice or sum(v in CHECK_VALUES for v in values if v) >= 2:
        kind, certain = 'checklist', True
    elif not header and len(value_cols) <= 2 and all(sheet.kind('%s%d' % (get_column_letter(c1), row)) == 'label' for row in data_rows) and len(data_rows) >= 2:
        kind, certain = 'form', True
    elif label_inputs or not label_cols or label_cols == sequence_cols:
        kind, certain = 'detail_table', bool(header)
        if not header:
            ambiguities.append('没有识别出表头行')
    else:
        kind, certain = 'fixed_table', True
        if len(data_rows) - len(total_rows) <= 1:
            certain = False
            ambiguities.append('只有一行数据，可能是表单字段')

    columns = []
    for col in range(c1, c2 + 1):
        letter = get_column_letter(col)
        path, cells = [], []
        for row in header:
            ref = '%s%d' % (letter, row)
            text = sheet.text(ref)
            if text and (not path or path[-1] != text):
                path.append(text)
                cells.append('%s!%s' % (sheet.name, sheet.merged_anchor.get(ref, (ref,))[0]))
        has_input = any(re.match(r'[A-Z]+', ref).group() == letter for ref in inputs + formulas)
        if has_input:
            columns.append({'col': letter, 'path': path, 'labelCells': cells})
            if not path and kind in ('detail_table', 'fixed_table'):
                ambiguities.append('%s 列没有表头文字' % letter)

    row_labels = []
    if kind in ('fixed_table', 'form', 'checklist'):
        for row in data_rows:
            for col in [c for c in label_cols if c not in sequence_cols] or [c1]:
                ref = '%s%d' % (get_column_letter(col), row)
                text = sheet.text(ref) if sheet.kind(ref) == 'label' else ''
                if text:
                    level = 2 if re.match(r'^(其中|\s|[（(]\d+[)）]|\d+[.、])', sheet.cells.get(ref, {}).get('text', '')) or sheet.cells.get(ref, {}).get('indent') else 1
                    row_labels.append({'row': row, 'text': text, 'level': level, 'cell': '%s!%s' % (sheet.name, ref)})
                    break
    return {
        'r1': r1, 'r2': r2, 'c1': c1, 'c2': c2, 'type': kind, 'typeCertain': certain and not ambiguities, 'headerRows': header,
        'caption': caption, 'columns': columns, 'rowLabels': row_labels, 'totals': totals, 'inputs': inputs, 'formulas': formulas,
        'labelCols': [get_column_letter(c) for c in label_cols], 'ambiguities': ambiguities,
    }


def relative_formula(formula):
    """公式结构：单元格引用换成 R/C 记号，用于指纹（不同行数的同一模板能对上的部分）。"""
    return re.sub(r'\$?[A-Z]{1,3}\$?\d+', 'X', formula or '')


def fingerprint(sheets):
    parts = []
    for sheet, regions in sheets:
        parts.append(['sheet', sheet.name])
        for r in regions:
            labels = sorted((ref, sheet.text(ref)) for row in r['headerRows'] for ref in row_cells(sheet, row, r['c1'], r['c2']) if sheet.text(ref))
            parts.append([r['type'], r['r1'] - r['r2'], [t for _, t in labels], [x['text'] for x in r['rowLabels']], sorted(relative_formula(sheet.cells[ref]['formula']) for ref in r['formulas'])])
    digest = hashlib.sha256(json.dumps(parts, ensure_ascii=False).encode('utf-8')).hexdigest()
    return 'TPL-' + digest[:12]


def parse(ctx, args):
    fid, path, name = ctx.files.resolve(require(args, 'file'))
    if path.suffix.lower() not in ('.xlsx', '.xlsm'):
        raise ToolError('IO_UNSUPPORTED', '底稿需要是 .xlsx 或 .xlsm')
    wanted = args.get('sheets')
    sheets = load(path)
    if wanted:
        missing = [s for s in wanted if s not in {x.name for x in sheets}]
        if missing:
            raise ToolError('REF_NOT_FOUND', '工作表不存在：%s' % '、'.join(missing))
        sheets = [s for s in sheets if s.name in wanted]
    else:
        sheets = [s for s in sheets if not s.hidden]
    ref = ctx.store.allocate('W')
    public, internal, analysed, n = [], {}, [], 0
    for sheet in sheets:
        meta, meta_rows = [], set()
        for cell, info in sorted(sheet.cells.items(), key=lambda kv: coordinate_to_tuple(kv[0])):
            if info['kind'] != 'label':
                continue
            item = meta_of(sheet, cell, info['text'])
            if item:
                meta.append(item)
                row = coordinate_to_tuple(cell)[0]
                cells = [c for c in sheet.cells if coordinate_to_tuple(c)[0] == row and sheet.cells[c]['kind'] == 'label']
                # 整行都是"标签：值"的行不算进表格。
                if all(meta_of(sheet, c, sheet.cells[c]['text']) or not sheet.cells[c]['text'] for c in cells):
                    meta_rows.add(row)
        # 第一块里只有一个文字的行是表名。
        found = []
        for r1, r2 in bands(sheet, meta_rows):
            c1, c2 = extent(sheet, r1, r2)
            if r1 == r2 and sum(sheet.kind(c) == 'label' for c in row_cells(sheet, r1, c1, c2)) <= 1 and not any(is_input(sheet, c, False) and sheet.bordered(c) for c in row_cells(sheet, r1, c1, c2)):
                continue
            found.append(analyse(sheet, r1, r2, c1, c2))
        regions = []
        for r in found:
            n += 1
            rid = '%s#R%d' % (ref, n)
            span = '%s!%s%d:%s%d' % (sheet.name, get_column_letter(r['c1']), r['r1'], get_column_letter(r['c2']), r['r2'])
            regions.append({
                'id': rid, 'range': span, 'type': r['type'], 'typeCertain': r['typeCertain'], 'headerRows': r['headerRows'],
                'columns': r['columns'], 'rowLabels': r['rowLabels'], 'totals': r['totals'],
                'inputCells': len(r['inputs']), 'formulaCells': len(r['formulas']), 'ambiguities': r['ambiguities'],
                **({'caption': r['caption']} if r.get('caption') else {}),
            })
            internal[rid] = {'sheet': sheet.name, 'range': span, 'type': r['type'], 'headerRows': r['headerRows'], 'labelCols': r['labelCols'],
                             'inputs': r['inputs'], 'formulas': {c: sheet.cells[c]['formula'] for c in r['formulas']},
                             'totals': [t['row'] for t in r['totals']], 'caption': r.get('caption')}
        analysed.append((sheet, found))
        public.append({'name': sheet.name, 'hidden': sheet.hidden, 'protected': sheet.protected, 'usedRange': sheet.used, 'meta': meta, 'regions': regions})
    tpl = fingerprint(analysed)
    labels = {s.name: {c: i['text'] for c, i in s.cells.items() if i['kind'] == 'label'} for s in sheets}
    kinds = {s.name: {c: i['kind'] for c, i in s.cells.items()} for s in sheets}
    numbers = {s.name: {c: str(i['value']) for c, i in s.cells.items() if i['kind'] == 'number'} for s in sheets}
    merges = {s.name: s.merges for s in sheets}
    units = {s.name: [m['unit'] for m in p['meta'] if m['kind'] == 'unit'] for s, p in zip(sheets, public)}
    ctx.store.put(ref, {'kind': 'workpaper', 'id': ref, 'file': fid, 'name': name, 'fingerprint': tpl, 'sheets': public,
                        'regions': internal, 'labels': labels, 'kinds': kinds, 'numbers': numbers, 'merges': merges, 'units': units})
    latest = ctx.store.index('fingerprints')
    latest[tpl] = ref
    ctx.store.save_index('fingerprints', latest)
    return Result({'workpaper': ref, 'fingerprint': tpl, 'file': fid, 'sheets': public}, refs=[ref])


# ---------------------------------------------------------------------------
# 区域渲染


def region_of(ctx, region):
    if not isinstance(region, str) or '#' not in region:
        raise ToolError('ARG_INVALID', '区域编号应形如 W-003#R5')
    wp = ctx.store.get(region.split('#')[0], 'workpaper')
    if region not in wp['regions']:
        raise ToolError('REF_NOT_FOUND', '找不到区域 %s' % region)
    return wp, wp['regions'][region]


def region_view(ctx, args):
    region = require(args, 'region')
    wp, r = region_of(ctx, region)
    sheet = r['sheet']
    labels, kinds = wp['labels'][sheet], wp['kinds'][sheet]
    c1, r1, c2, r2 = range_boundaries(r['range'].split('!')[1])
    rows = args.get('rows')
    first, last = (rows[0], rows[1]) if isinstance(rows, list) and len(rows) == 2 else (r1, r2)
    first, last = max(first, r1), min(last, r2, max(first, r1) + 79)
    inputs = set(r['inputs'])
    lines = ['区域 %s（%s，初判 %s）' % (region, r['range'], r['type'])]
    if r.get('caption'):
        lines.append('标题：%s' % r['caption'])
    units = wp['units'].get(sheet)
    if units:
        lines.append('单位：%s' % '、'.join(units))
    if r['headerRows']:
        lines.append('表头行：%s' % '、'.join(map(str, r['headerRows'])))
    for row in range(first, last + 1):
        parts = []
        for col in range(c1, c2 + 1):
            ref = '%s%d' % (get_column_letter(col), row)
            if ref in r['formulas']:
                parts.append('%s =%s' % (ref, r['formulas'][ref]))
            elif ref in inputs:
                parts.append('%s [待填]' % ref)
            elif ref in labels:
                parts.append('%s %s' % (ref, labels[ref]))
            elif kinds.get(ref) == 'number' and re.match(r'[A-Z]+', ref).group() in r['labelCols']:
                parts.append('%s %s' % (ref, wp['numbers'][sheet].get(ref, '')))
            elif kinds.get(ref) == 'number':
                parts.append('%s [已有数值]' % ref)
        if parts:
            lines.append(' | '.join(parts))
    more = last < r2
    text = '\n'.join(lines)
    return Result({'region': region, 'text': text, 'rows': [first, last]}, truncated=more, next={'region': region, 'rows': [last + 1, r2]} if more else None)


# ---------------------------------------------------------------------------
# 语义校验


def common_part(a, b):
    a, b = norm(a), norm(b)
    if not a or not b:
        return False
    if a in b or b in a:
        return True
    return any(a[i:i + 2] in b for i in range(len(a) - 1))


def semantics_errors(wp, semantics):
    errors = []

    def error(code, message, where=None):
        errors.append({'code': code, 'message': message, **({'where': where} if where else {})})

    region = semantics.get('region')
    if region not in wp['regions']:
        error('REF_NOT_FOUND', '找不到区域 %s' % region)
        return errors
    r = wp['regions'][region]
    sheet = r['sheet']
    labels = wp['labels'][sheet]
    kind = semantics.get('type', r['type'])
    if kind not in REGION_TYPES:
        error('ARG_INVALID', '区域类型 %s 无效，应为 %s 之一' % (kind, '、'.join(sorted(REGION_TYPES))))
        return errors
    if kind == 'none':
        return errors
    c1, r1, c2, r2 = range_boundaries(r['range'].split('!')[1])
    header_text = {}
    for col in range(c1, c2 + 1):
        letter = get_column_letter(col)
        header_text[letter] = ''.join(labels.get('%s%d' % (letter, row), '') for row in r['headerRows'])

    described = set()
    for column in semantics.get('columns') or []:
        letter = str(column.get('col', '')).upper()
        if not re.fullmatch(r'[A-Z]{1,3}', letter) or not c1 <= column_index_from_string(letter) <= c2:
            error('REF_OUTSIDE_REGION', '列 %s 不在区域 %s 内' % (letter, r['range']))
            continue
        described.add(letter)
        measure = column.get('measure') or ''
        ref = column.get('basisRef')
        target = None
        if ref:
            try:
                ref_sheet, cell = split_ref(ref, sheet)
            except ToolError as e:
                error('REF_INVALID', e.message, ref)
                continue
            if ':' in cell or ref_sheet not in wp['labels']:
                error('REF_NOT_FOUND', '引用 %s 不是本底稿的单元格' % ref, ref)
                continue
            target = wp['labels'][ref_sheet].get(cell)
            if column.get('basis') == 'template' and not target:
                error('REF_NOT_FOUND', '%s 不是文字标签，不能作为底稿标示' % ref, ref)
                continue
        label = target or header_text.get(letter, '')
        if label and measure:
            # 期间词看整条表头路径：B6 "账面余额" 的上级表头 "期末余额" 也算。
            stated = {w for w in PERIOD_WORDS if w in norm(measure)}
            shown = {w for w in PERIOD_WORDS if w in norm(label + header_text.get(letter, ''))}
            conflict = stated and shown and not stated & shown
            if conflict or (target and not common_part(measure, target) and not common_part(measure, header_text.get(letter, ''))):
                error('HEADER_MISMATCH', '%s 实际文字为“%s”，与指标“%s”不符' % (ref or '%s!%s列' % (sheet, letter), label, measure), ref)
        period = str(column.get('period') or '')
        years = set(YEAR.findall(header_text.get(letter, '')))
        if period and YEAR.search(period) and re.findall(r'(?:19|20)\d{2}', header_text.get(letter, '')):
            stated = set(re.findall(r'(?:19|20)\d{2}', period))
            shown = set(re.findall(r'(?:19|20)\d{2}', header_text.get(letter, '')))
            if years and not stated & shown:
                error('HEADER_PERIOD_MISMATCH', '%s 列表头标示 %s，与期间 %s 不同' % (letter, '、'.join(sorted(shown)), period), '%s!%s%d' % (sheet, letter, r['headerRows'][0]) if r['headerRows'] else None)
        unit = column.get('unit')
        units = wp['units'].get(sheet) or []
        if unit in ('元', '千元', '万元', '百万元', '亿元') and units and unit not in units:
            error('HEADER_UNIT_MISMATCH', '工作表标示单位为%s，与 %s 列的单位%s不同' % ('、'.join(units), letter, unit))

    for item in semantics.get('rows') or []:
        row, text = item.get('row'), item.get('text')
        if not isinstance(row, int) or not r1 <= row <= r2:
            error('REF_OUTSIDE_REGION', '第 %s 行不在区域 %s 内' % (row, r['range']))
            continue
        if text:
            actual = [labels.get('%s%d' % (col, row), '') for col in r['labelCols'] or [get_column_letter(c1)]]
            if not any(norm(a) == norm(text) for a in actual if a):
                error('REF_TEXT_MISMATCH', '第 %d 行的行标签是“%s”，不是“%s”' % (row, '、'.join(a for a in actual if a) or '空', text), '%s!%s%d' % (sheet, (r['labelCols'] or [get_column_letter(c1)])[0], row))

    manual = set()
    for item in semantics.get('manual') or []:
        try:
            ref_sheet, cell = split_ref(item, sheet)
        except ToolError as e:
            error('REF_INVALID', e.message, item)
            continue
        cells = expand(cell) if ':' in cell else [cell]
        outside = [c for c in cells if ref_sheet != sheet or not (c1 <= column_index_from_string(re.match(r'[A-Z]+', c).group()) <= c2 and r1 <= int(re.search(r'\d+', c).group()) <= r2)]
        if outside:
            error('REF_OUTSIDE_REGION', '人工填写的 %s 不在区域 %s 内' % (item, r['range']), item)
        manual.update(cells)
    if kind != 'text':
        missing = [c for c in r['inputs'] if re.match(r'[A-Z]+', c).group() not in described and c not in manual]
        if missing:
            error('HEADER_UNASSIGNED', '这些待填位置没有归属：%s' % '、'.join('%s!%s' % (sheet, c) for c in missing[:12]),
                  '%s!%s' % (sheet, missing[0]))
    return errors


def semantics_check(ctx, args):
    wp = ctx.store.get(require(args, 'workpaper'), 'workpaper')
    regions = require(args, 'regions', list)
    errors = []
    for semantics in regions:
        if not isinstance(semantics, dict):
            raise ToolError('ARG_INVALID', 'regions 的每一项应为区域语义对象')
        errors.extend(semantics_errors(wp, semantics))
    return Result({'errors': errors, 'passed': not errors})


# ---------------------------------------------------------------------------
# 模板库：确认过的底稿理解按指纹保存，只存结构和语义，不存客户数据。


def template_dir(ctx):
    import os
    if os.environ.get('AUDIT_TEMPLATE_DIR'):
        path = Path(os.environ['AUDIT_TEMPLATE_DIR'])
    else:
        path = ctx.store.dir / 'templates'
    path.mkdir(parents=True, exist_ok=True)
    return path


def template_match(ctx, args):
    tpl = require(args, 'fingerprint')
    path = template_dir(ctx) / (tpl + '.json')
    if not re.fullmatch(r'TPL-[0-9a-f]{12}', tpl) or not path.is_file():
        return Result({'known': False, 'fingerprint': tpl})
    saved = json.loads(path.read_text(encoding='utf-8'))
    workpaper = args.get('workpaper') or ctx.store.index('fingerprints').get(tpl)
    regions = [{**r, 'region': '%s#%s' % (workpaper, r['region'])} for r in saved['regions']] if workpaper else saved['regions']
    return Result({'known': True, 'fingerprint': tpl, 'regions': regions, 'savedAt': saved.get('savedAt')})


def template_save(ctx, args):
    wp = ctx.store.get(require(args, 'workpaper'), 'workpaper')
    regions = require(args, 'regions', list)
    errors = [e for s in regions for e in semantics_errors(wp, s)]
    if errors:
        raise ToolError(errors[0]['code'], errors[0]['message'], where=errors[0].get('where'), detail={'errors': errors})
    import datetime
    keep = ('type', 'purpose', 'columns', 'rows', 'manual')
    saved = {'fingerprint': wp['fingerprint'], 'savedAt': datetime.datetime.now().isoformat(timespec='seconds'),
             'regions': [{'region': s['region'].split('#')[1], **{k: s[k] for k in keep if k in s}} for s in regions]}
    (template_dir(ctx) / (wp['fingerprint'] + '.json')).write_text(json.dumps(saved, ensure_ascii=False, indent=1), encoding='utf-8')
    return Result({'fingerprint': wp['fingerprint'], 'regions': len(regions)})
