"""宿主的表格读取进程：按《接口约定》4.5 返回工作表网格，按 3.11 的形状返回表格分页。

标准输入每行一个 JSON 请求 {"id", "method", "params"}，标准输出每行一个 JSON 响应 {"id", "ok", "result" | "error"}。
同一文件在修改时间不变时复用已打开的工作簿，分块加载时不用每块重新解析。

只读：不改用户文件。
"""
import csv
import datetime as dt
import decimal
import json
import os
import re
import sys
import traceback

from openpyxl import load_workbook
from openpyxl.utils import get_column_letter, range_boundaries
from openpyxl.utils.cell import coordinate_from_string, column_index_from_string

MAX_CELLS = 5000
CACHE = {}


def open_book(path):
    """返回 (公式版, 值版)。值版是文件里保存的缓存值。"""
    mtime = os.path.getmtime(path)
    hit = CACHE.get(path)
    if hit and hit[0] == mtime:
        return hit[1], hit[2]
    formulas = load_workbook(path, data_only=False)
    values = load_workbook(path, data_only=True)
    if len(CACHE) > 8:
        CACHE.clear()
    CACHE[path] = (mtime, formulas, values)
    return formulas, values


# ---------- 数值和格式 ----------

def dec_str(v):
    if isinstance(v, bool):
        return 'TRUE' if v else 'FALSE'
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        d = decimal.Decimal(repr(v))
        s = format(d, 'f')
        if '.' in s:
            s = s.rstrip('0').rstrip('.')
        return '0' if s in ('-0', '') else s
    if isinstance(v, decimal.Decimal):
        return format(v, 'f')
    return str(v)


def group(int_part):
    neg = int_part.startswith('-')
    digits = int_part[1:] if neg else int_part
    out = ''
    while len(digits) > 3:
        out = ',' + digits[-3:] + out
        digits = digits[:-3]
    return ('-' if neg else '') + digits + out


def format_number(v, fmt):
    """常见数字格式：千分位、小数位、百分比。其余格式原样给出数值。"""
    if fmt is None or fmt == 'General':
        s = dec_str(v)
        if isinstance(v, float) and len(s) > 12:
            s = ('%.10g' % v)
        return s
    section = fmt.split(';')
    f = section[0]
    sign = ''
    if v < 0 and len(section) > 1 and section[1]:
        f = section[1]
        v = -v
        sign = 'paren' if '(' in f else ('-' if '-' in f else '')
    f = re.sub(r'\[[^\]]*\]', '', f)
    f = re.sub(r'"[^"]*"', '', f)
    f = re.sub(r'[_\\*].', '', f)
    percent = '%' in f
    m = re.search(r'0(\.(0+))?', f)
    if not m and '#' not in f:
        return dec_str(v)
    places = len(m.group(2)) if m and m.group(2) else 0
    x = decimal.Decimal(repr(v)) if isinstance(v, float) else decimal.Decimal(v)
    if percent:
        x = x * 100
    q = x.quantize(decimal.Decimal(1).scaleb(-places), rounding=decimal.ROUND_HALF_UP)
    s = format(q, 'f')
    int_part, _, frac = s.partition('.')
    if ',' in f:
        int_part = group(int_part)
    out = int_part + ('.' + frac if frac else '')
    if percent:
        out += '%'
    if sign == 'paren':
        out = '(' + out + ')'
    elif sign == '-':
        out = '-' + out
    return out


def format_date(v, fmt):
    if isinstance(v, dt.datetime) and (v.hour or v.minute or v.second):
        return v.strftime('%Y-%m-%d %H:%M')
    return v.strftime('%Y-%m-%d')


def cell_value(v, fmt):
    """(value, valueType, text)"""
    if v is None:
        return None, 'blank', ''
    if isinstance(v, bool):
        return ('TRUE' if v else 'FALSE'), 'boolean', ('TRUE' if v else 'FALSE')
    if isinstance(v, (int, float, decimal.Decimal)):
        try:
            text = format_number(v, fmt)
        except Exception:
            text = dec_str(v)
        return dec_str(v), 'number', text
    if isinstance(v, (dt.datetime, dt.date)):
        d = v.date() if isinstance(v, dt.datetime) else v
        return d.isoformat(), 'date', format_date(v, fmt)
    if isinstance(v, dt.time):
        return v.isoformat(), 'string', v.strftime('%H:%M')
    s = str(v)
    if s.startswith('#') and s.endswith(('!', '?', 'A')) and len(s) <= 8:
        return s, 'error', s
    return s, 'string', s


def color_hex(color):
    if color is None:
        return None
    if getattr(color, 'type', None) == 'rgb' and isinstance(color.rgb, str) and len(color.rgb) == 8:
        if color.rgb[:2] == '00' and color.rgb[2:] == '000000':
            return None
        return '#' + color.rgb[2:].upper()
    if getattr(color, 'type', None) == 'indexed':
        from openpyxl.styles.colors import COLOR_INDEX
        try:
            rgb = COLOR_INDEX[color.indexed]
            return '#' + rgb[2:].upper()
        except (IndexError, TypeError):
            return None
    if getattr(color, 'type', None) == 'theme':
        # 主题色换算要读主题文件；常见的浅色背景先按灰度近似。
        return THEME_FILL.get(color.theme)
    return None


THEME_FILL = {0: '#FFFFFF', 1: '#000000', 2: '#E7E6E6', 3: '#44546A', 4: '#DDEBF7', 5: '#FCE4D6', 6: '#EDEDED', 7: '#FFF2CC', 8: '#D9E1F2', 9: '#E2EFDA'}


def style_of(c):
    s = {}
    if c.font is not None:
        if c.font.b:
            s['bold'] = True
        if c.font.i:
            s['italic'] = True
    if c.alignment is not None:
        h = c.alignment.horizontal
        if h in ('center', 'centerContinuous'):
            s['align'] = 'center'
        elif h in ('right',):
            s['align'] = 'right'
        elif h == 'left':
            s['align'] = 'left'
        if c.alignment.wrap_text:
            s['wrap'] = True
    fill = c.fill
    if fill is not None and fill.fill_type == 'solid':
        hx = color_hex(fill.fgColor)
        if hx and hx != '#FFFFFF':
            s['fill'] = hx
    return s or None


# ---------- sheet.view ----------

def parse_range(r):
    c0, r0, c1, r1 = range_boundaries(r)
    return r0, c0, r1, c1


def sheet_view(p):
    path = p['path']
    if path.lower().endswith('.csv'):
        return csv_sheet(p)
    fwb, vwb = open_book(path)
    name = p.get('sheet') or fwb.active.title
    if name not in fwb.sheetnames:
        raise Fail('REF_SHEET', '没有工作表 ' + name)
    ws, vs = fwb[name], vwb[name]
    used = ws.calculate_dimension() if ws.max_row and ws.max_column else 'A1:A1'
    if ':' not in used:
        used = used + ':' + used
    ur0, uc0, ur1, uc1 = parse_range(used)
    ur0, uc0 = 1, 1
    used = 'A1:' + get_column_letter(uc1) + str(ur1)
    rng = p.get('range') or ('A1:' + get_column_letter(uc1) + str(min(ur1, max(1, MAX_CELLS // max(uc1, 1)))))
    r0, c0, r1, c1 = parse_range(rng)
    if (r1 - r0 + 1) * (c1 - c0 + 1) > MAX_CELLS:
        raise Fail('ARG_RANGE', '单次最多 5,000 格')
    cells = []
    for row in ws.iter_rows(min_row=r0, max_row=min(r1, ur1), min_col=c0, max_col=min(c1, uc1)):
        for c in row:
            if c.__class__.__name__ == 'MergedCell':
                continue
            raw = c.value
            formula = None
            array = None
            if isinstance(raw, str) and raw.startswith('='):
                formula = raw
            elif raw is not None and raw.__class__.__name__ == 'ArrayFormula':
                formula = raw.text if raw.text.startswith('=') else '=' + raw.text
                array = raw.ref
            elif raw is not None and raw.__class__.__name__ == 'DataTableFormula':
                formula = '=TABLE()'
            cached = vs.cell(row=c.row, column=c.column).value
            fmt = c.number_format if c.number_format != 'General' else None
            style = style_of(c)
            if formula is None and raw is None and style is None:
                continue
            value_src = cached if formula is not None else raw
            value, vtype, text = cell_value(value_src, c.number_format)
            item = {'cell': c.coordinate, 'value': value, 'valueType': vtype, 'text': text, 'formula': formula}
            if fmt:
                item['numFmt'] = fmt
            if style:
                item['style'] = style
            if array:
                item['array'] = array
            if formula is not None and cached is None:
                item['stale'] = True
            cells.append(item)
    merges = [str(m) for m in ws.merged_cells.ranges]
    row_heights = {str(i): d.height for i, d in ws.row_dimensions.items() if d.height and r0 <= i <= r1}
    col_widths = {}
    for key, d in ws.column_dimensions.items():
        if d.width and not d.hidden:
            lo = d.min or column_index_from_string(key)
            hi = d.max or lo
            for ci in range(lo, min(hi, uc1) + 1):
                col_widths[get_column_letter(ci)] = round(d.width, 2)
        elif d.hidden:
            col_widths[key] = 0
    out = {
        'sheet': name,
        'sheets': [({'name': s.title, 'hidden': True} if s.sheet_state != 'visible' else {'name': s.title}) for s in fwb.worksheets],
        'usedRange': used,
        'range': rng,
        'cells': cells,
        'merges': merges,
        'rowHeights': row_heights,
        'colWidths': col_widths,
    }
    fp = ws.freeze_panes
    if fp:
        col, row = coordinate_from_string(fp)
        rows, cols = row - 1, column_index_from_string(col) - 1
        if rows or cols:
            out['freeze'] = {'rows': rows, 'cols': cols}
    return out


def read_csv(path):
    for enc in ('utf-8-sig', 'gb18030'):
        try:
            with open(path, newline='', encoding=enc) as f:
                return list(csv.reader(f))
        except UnicodeDecodeError:
            continue
    raise Fail('IO_ENCODING', '无法识别 CSV 编码')


NUM = re.compile(r'^-?\d+(\.\d+)?$')


def csv_sheet(p):
    rows = read_csv(p['path'])
    ncol = max((len(r) for r in rows), default=1)
    used = 'A1:' + get_column_letter(max(ncol, 1)) + str(max(len(rows), 1))
    rng = p.get('range') or ('A1:' + get_column_letter(ncol) + str(min(len(rows), MAX_CELLS // max(ncol, 1))))
    r0, c0, r1, c1 = parse_range(rng)
    cells = []
    for ri in range(r0, min(r1, len(rows)) + 1):
        row = rows[ri - 1]
        for ci in range(c0, min(c1, len(row)) + 1):
            v = row[ci - 1]
            if v == '':
                continue
            numeric = ri > 1 and NUM.match(v.replace(',', ''))
            item = {'cell': get_column_letter(ci) + str(ri), 'value': v.replace(',', '') if numeric else v,
                    'valueType': 'number' if numeric else 'string', 'text': v, 'formula': None}
            if ri == 1:
                item['style'] = {'bold': True}
            cells.append(item)
    name = os.path.splitext(os.path.basename(p['path']))[0]
    return {'sheet': name, 'sheets': [{'name': name}], 'usedRange': used, 'range': rng, 'cells': cells,
            'merges': [], 'rowHeights': {}, 'colWidths': {}, 'freeze': {'rows': 1, 'cols': 0}}


# ---------- 文件信息、表格分页 ----------

def file_info(p):
    path = p['path']
    if path.lower().endswith(('.xlsx', '.xlsm')):
        fwb, _ = open_book(path)
        return {'sheets': [s.title for s in fwb.worksheets if s.sheet_state == 'visible']}
    return {}


def table_view(p):
    """把一张表（CSV 或工作表的第一行作表头）按 table.view 的形状分页返回。"""
    path = p['path']
    if path.lower().endswith('.csv'):
        rows = read_csv(path)
    else:
        _, vwb = open_book(path)
        ws = vwb[p['sheet']] if p.get('sheet') else vwb.active
        rows = [[cell_value(v, None)[2] if v is not None else '' for v in r] for r in ws.iter_rows(values_only=True)]
    header = rows[0] if rows else []
    body = rows[1:]
    ncol = len(header)
    numeric = []
    for ci in range(ncol):
        sample = [r[ci] for r in body[:200] if ci < len(r) and r[ci] not in ('', None)]
        numeric.append(bool(sample) and all(NUM.match(str(x).replace(',', '')) for x in sample))
    columns = [{'key': 'c%d' % i, 'name': str(h) if h not in (None, '') else get_column_letter(i + 1),
                'type': 'decimal' if numeric[i] else 'text'} for i, h in enumerate(header)]
    offset = int(p.get('offset') or 0)
    limit = int(p.get('limit') or 200)
    locate = p.get('locate')
    if locate is not None and not p.get('offset'):
        offset = max(0, int(locate) - 1 - limit // 4)
    page = body[offset:offset + limit]
    out_rows = []
    for i, r in enumerate(page):
        vals = []
        for ci in range(ncol):
            v = r[ci] if ci < len(r) else ''
            v = None if v in ('', None) else str(v)
            if v is not None and numeric[ci]:
                v = v.replace(',', '')
            vals.append(v)
        out_rows.append({'values': vals, 'source': {'file': p.get('file', ''), 'sheet': p.get('sheet') or '', 'row': offset + i + 2}})
    return {'columns': columns, 'rows': out_rows, 'total': len(body), 'offset': offset,
            'highlight': (int(locate) - 1) if locate is not None else None}


class Fail(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


METHODS = {'sheet.view': sheet_view, 'file.info': file_info, 'table.view': table_view}


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req = json.loads(line)
        try:
            result = METHODS[req['method']](req.get('params') or {})
            resp = {'id': req['id'], 'ok': True, 'result': result}
        except Fail as e:
            resp = {'id': req['id'], 'ok': False, 'error': {'code': e.code, 'message': str(e)}}
        except FileNotFoundError as e:
            resp = {'id': req['id'], 'ok': False, 'error': {'code': 'IO_NOT_FOUND', 'message': '找不到文件：' + str(e.filename or '')}}
        except Exception as e:  # noqa: BLE001 — 进程要一直服务下去，错误原样回给宿主
            traceback.print_exc(file=sys.stderr)
            resp = {'id': req['id'], 'ok': False, 'error': {'code': 'IO_READ', 'message': '%s: %s' % (type(e).__name__, e)}}
        sys.stdout.write(json.dumps(resp, ensure_ascii=False) + '\n')
        sys.stdout.flush()


if __name__ == '__main__':
    main()
