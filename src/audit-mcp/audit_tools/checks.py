"""自动核对（《接口约定》3.7，实现设计 7.1、7.4～7.6）。

核对都由代码计算两边再比较，模型只提供口径和查询。每次核对的结果都记下来，供 trace_cell 查看。
"""
import datetime
import re
from decimal import Decimal

from .common import Result, ToolError, plain, require
from .data import meaning_column, quoted
from .query import result_rows
from .store import sql_name

BASIS_TAGS = {'user', 'confirmed', 'template', 'profile', 'data', 'inferred'}
ELEMENTS = [('sources', '数据来源'), ('period', '期间'), ('scope', '范围'), ('amount', '金额与方向'), ('grouping', '分组与对应'), ('unit', '单位与精度'), ('control', '控制数')]
FIELDS = {'closing': 'closing', 'opening': 'opening', 'debit': 'debit', 'credit': 'credit', '期末': 'closing', '期初': 'opening'}


def record(ctx, check, region, result, passed, detail):
    log = ctx.store.index('checks')
    log.setdefault(result or region or '-', []).append({'check': check, 'region': region, 'passed': passed, 'detail': detail,
                                                       'at': datetime.datetime.now().isoformat(timespec='seconds')})
    ctx.store.save_index('checks', log)


def decimal(value, where):
    try:
        return Decimal(str(value))
    except Exception:
        raise ToolError('ARG_INVALID', '%s 不是数值：%r' % (where, value))


def check_basis(ctx, args):
    region = args.get('region')
    basis = require(args, 'basis', dict)
    missing = []
    for key, label in ELEMENTS:
        value = basis.get(key)
        if value in (None, '', [], {}):
            missing.append(label)
            continue
        items = value if isinstance(value, list) else [value]
        if key == 'sources':
            for item in items:
                table = item.get('table') if isinstance(item, dict) else item
                if not ctx.store.exists(table):
                    missing.append('数据来源 %s 不存在' % table)
            continue
        for item in items:
            tag = item.get('basis') if isinstance(item, dict) else None
            if tag is None:
                missing.append('%s的依据' % label)
            elif tag not in BASIS_TAGS:
                missing.append('%s的依据 %s 无效' % (label, tag))
    control = basis.get('control') or {}
    if isinstance(control, dict) and control and not control.get('right'):
        missing.append('控制数的来源')
    steps = basis.get('steps')
    if steps is not None and not steps:
        missing.append('计算步骤')
    passed = not missing
    record(ctx, 'basis_complete', region, None, passed, {'missing': missing})
    if region:
        # 口径留给 trace_cell 显示每格的期间、范围等依据。
        saved = ctx.store.index('basis')
        saved[region] = basis
        ctx.store.save_index('basis', saved)
    return Result({'passed': passed, 'missing': missing})


def column_index(obj, column):
    names = [c['name'] for c in obj['columns']]
    if column not in names:
        raise ToolError('REF_UNKNOWN_COLUMN', '结果 %s 没有列 %s' % (obj['id'], column), hint='结果列：%s' % '、'.join(names))
    return names.index(column)


def total(ctx, ref, column, op='sum'):
    obj, rows = result_rows(ctx, ref)
    i = column_index(obj, column)
    values = [Decimal(str(r[i])) for r in rows if r[i] is not None]
    if op == 'sum':
        return sum(values, Decimal(0))
    if op == 'count':
        return Decimal(len(rows))
    if op == 'value':
        if len(rows) != 1:
            raise ToolError('ARG_INVALID', '结果 %s 有 %d 行，op=value 只适用于一行的结果' % (ref, len(rows)))
        return values[0] if values else Decimal(0)
    raise ToolError('ARG_INVALID', 'op 应为 sum、count 或 value')


def describe(item):
    detail = item['detail']
    return {
        'amount_nulls': lambda: '%d 行金额为空' % detail['count'],
        'unassigned_rows': lambda: '%d 行没有归入任何分组，金额 %s' % (detail['count'], detail['amount']),
        'duplicate_groups': lambda: '分组重复：%s' % '、'.join('/'.join(str(v) for v in key) for key in detail['samples']),
        'amount_conserved': lambda: '来源金额 %s，纳入 %s，排除 %s，差 %s' % (detail['source'], detail['included'], detail['excluded'], detail['diff']),
    }[item['check']]()


def check_conservation(ctx, args):
    """守恒（7.4）：分组没有遗漏或重复，金额没有空值；给出来源金额时核对来源 = 纳入 + 排除。

    可选参数 sourceAmount、sourceFilter 是来源表上的 SQL 表达式（如 "借方金额 - 贷方金额"、
    "科目编码 = '1122'"），用于金额守恒；没有给出时只做结构上的检查。
    """
    ref = require(args, 'result')
    amount = require(args, 'amount')
    obj, rows = result_rows(ctx, ref)
    i = column_index(obj, amount)
    keys = [k for k, c in enumerate(obj['columns']) if k != i and c['type'] in ('text', 'date', 'integer')]
    items = []
    nulls = [r for r in rows if r[i] is None]
    items.append({'check': 'amount_nulls', 'passed': not nulls, 'detail': {'count': len(nulls)}})
    unassigned = [r for r in rows if keys and all(r[k] is None for k in keys)]
    items.append({'check': 'unassigned_rows', 'passed': not unassigned, 'detail': {'count': len(unassigned), 'amount': plain(sum((Decimal(str(r[i])) for r in unassigned if r[i] is not None), Decimal(0)))}})
    seen, duplicates = set(), []
    for r in rows:
        key = tuple(r[k] for k in keys)
        if keys and key in seen:
            duplicates.append([plain(v) for v in key])
        seen.add(key)
    items.append({'check': 'duplicate_groups', 'passed': not duplicates, 'detail': {'samples': duplicates[:5]}})
    included = sum((Decimal(str(r[i])) for r in rows if r[i] is not None), Decimal(0))
    excluded = Decimal(0)
    if args.get('excluded'):
        excluded = total(ctx, args['excluded'], args.get('excludedAmount') or amount)
    source = args.get('from')
    data = {'result': ref, 'included': plain(included), 'excluded': plain(excluded)}
    if source and args.get('sourceAmount'):
        if not ctx.store.exists(source):
            raise ToolError('REF_NOT_FOUND', '找不到 %s' % source)
        where = args.get('sourceFilter')
        import duckdb
        try:
            with ctx.store.lock:
                row = ctx.store.db.execute('SELECT COUNT(*), SUM(%s) FROM %s%s' % (args['sourceAmount'], sql_name(source), ' WHERE %s' % where if where else '')).fetchone()
        except duckdb.Error as error:
            raise ToolError('ARG_SQL_INVALID', '来源金额表达式无效：%s' % str(error).split('\n')[0])
        source_total = Decimal(str(row[1] or 0))
        diff = source_total - included - excluded
        items.append({'check': 'amount_conserved', 'passed': diff == 0, 'detail': {'source': plain(source_total), 'included': plain(included), 'excluded': plain(excluded), 'diff': plain(diff), 'rowsIn': row[0]}})
        data['rowsIn'] = row[0]
    passed = all(item['passed'] for item in items)
    data.update({'passed': passed, 'items': items})
    if not passed:
        data['message'] = '；'.join(describe(item) for item in items if not item['passed'])
    record(ctx, 'conservation', args.get('region'), ref, passed, {k: v for k, v in data.items() if k != 'items'})
    return Result(data)


def balance_value(ctx, right):
    table = require(right, 'table')
    obj = ctx.store.get(table, 'table')
    field = FIELDS.get(str(right.get('field', 'closing')), right.get('field'))
    column = meaning_column(obj, field) or (right.get('column') if right.get('column') else None)
    code = meaning_column(obj, 'account_code')
    if not column:
        raise ToolError('REF_UNKNOWN_COLUMN', '资料表 %s 没有含义为 %s 的列' % (table, field), hint='导入时 fields 的 meaning 要标出 opening、debit、credit、closing')
    if not code:
        raise ToolError('REF_UNKNOWN_COLUMN', '资料表 %s 没有含义为 account_code 的列' % table)
    account = str(require(right, 'account')).strip()
    with ctx.store.lock:
        rows = ctx.store.db.execute('SELECT %s, %s FROM %s WHERE TRIM(CAST(%s AS VARCHAR)) = ?' % (quoted(code), quoted(column), sql_name(table), quoted(code)), [account]).fetchall()
        if not rows and right.get('children'):
            rows = ctx.store.db.execute('SELECT %s, %s FROM %s WHERE CAST(%s AS VARCHAR) LIKE ?' % (quoted(code), quoted(column), sql_name(table), quoted(code)), [account + '_%']).fetchall()
        # 模型常把科目写成名称（应收账款）而不是编码（1122）；编码对不上时按科目名称找
        name = meaning_column(obj, 'account_name')
        if not rows and name:
            rows = ctx.store.db.execute('SELECT %s, %s FROM %s WHERE TRIM(CAST(%s AS VARCHAR)) = ?' % (quoted(code), quoted(column), sql_name(table), quoted(name)), [account]).fetchall()
    if not rows:
        raise ToolError('REF_NOT_FOUND', '资料表 %s 里没有科目 %s' % (table, account))
    if len(rows) > 1 and not right.get('children'):
        raise ToolError('ARG_INVALID', '资料表 %s 里科目 %s 有 %d 行' % (table, account, len(rows)), hint='科目编码重复，检查资料是否含明细行')
    return sum((Decimal(str(r[1])) for r in rows if r[1] is not None), Decimal(0))


def side(ctx, spec, where):
    if not isinstance(spec, dict):
        raise ToolError('ARG_INVALID', '%s 应为对象' % where)
    kind = spec.get('kind') or ('result' if spec.get('result') else None)
    if kind == 'result':
        return total(ctx, require(spec, 'result'), require(spec, 'column'), spec.get('op', 'sum')), spec['result']
    if kind == 'balance':
        return balance_value(ctx, spec), spec['table']
    if kind == 'value':
        return decimal(require(spec, 'value'), where), None
    if kind == 'query':
        from .query import check
        check(ctx, require(spec, 'sql'), spec.get('inputs'))
        with ctx.store.lock:
            row = ctx.store.db.execute('SELECT * FROM (%s) AS q' % spec['sql']).fetchall()
        if len(row) != 1 or len(row[0]) != 1:
            raise ToolError('ARG_INVALID', '控制数查询要返回一行一列')
        return Decimal(str(row[0][0] or 0)), None
    raise ToolError('ARG_INVALID', '%s 的 kind 应为 result、balance、value 或 query' % where)


def check_control(ctx, args):
    left, lref = side(ctx, require(args, 'left'), 'left')
    right, rref = side(ctx, require(args, 'right'), 'right')
    tolerance = abs(decimal(args.get('tolerance') or '0', 'tolerance'))
    diff = left - right
    explained = []
    if diff and args.get('excluded'):
        excluded = total(ctx, args['excluded'], args.get('excludedAmount') or require(args['left'], 'column'))
        if left + excluded - right == 0 or left - excluded - right == 0:
            explained.append(args['excluded'])
    passed = abs(diff) <= tolerance or bool(explained)
    data = {'passed': passed, 'left': plain(left), 'right': plain(right), 'diff': plain(diff), 'explainedBy': explained, 'leftRef': lref, 'rightRef': rref}
    record(ctx, 'control', args.get('region'), lref, passed, data)
    return Result(data)


DATE_LITERAL = re.compile(r"(?:DATE\s*)?'(\d{4}-\d{2}-\d{2})'", re.I)
COMPARE_DATE = re.compile(r"(<=|>=|<|>|=)\s*(?:DATE\s*)?'(\d{4}-\d{2}-\d{2})'", re.I)


def lineage_differences(left, right):
    out = []
    li, ri = sorted(i.split('@')[0] for i in left['inputs']), sorted(i.split('@')[0] for i in right['inputs'])
    if li != ri:
        out.append({'aspect': '来源', 'left': '、'.join(li), 'right': '、'.join(ri)})
    lc, rc = sorted(COMPARE_DATE.findall(left['sql'])), sorted(COMPARE_DATE.findall(right['sql']))
    if lc != rc:
        out.append({'aspect': '期间', 'left': '；'.join('%s %s' % c for c in lc) or '无日期条件', 'right': '；'.join('%s %s' % c for c in rc) or '无日期条件'})
    lw = re.findall(r"=\s*'([^']+)'", left['sql'])
    rw = re.findall(r"=\s*'([^']+)'", right['sql'])
    if sorted(set(lw) - set(DATE_LITERAL.findall(left['sql']))) != sorted(set(rw) - set(DATE_LITERAL.findall(right['sql']))):
        out.append({'aspect': '范围', 'left': '、'.join(sorted(set(lw))) or '无', 'right': '、'.join(sorted(set(rw))) or '无'})
    for word, aspect in (('贷方', '方向'), ('借方', '方向')):
        if (word in left['sql']) != (word in right['sql']):
            out.append({'aspect': aspect, 'left': '用%s' % word if word in left['sql'] else '不用%s' % word, 'right': '用%s' % word if word in right['sql'] else '不用%s' % word})
            break
    return out


def check_compare(ctx, args):
    lref, rref = require(args, 'left'), require(args, 'right')
    lobj, lrows = result_rows(ctx, lref)
    robj, rrows = result_rows(ctx, rref)
    mapping = args.get('mapping') or {}
    amounts = [c['name'] for c in lobj['columns'] if c['type'] == 'decimal']
    wanted = [c for c in (mapping.get('columns') or []) if c in amounts] or amounts
    rnames = [c['name'] for c in robj['columns']]
    pairs = {c: (mapping.get('right') or {}).get(c, c) for c in wanted}
    missing = [r for r in pairs.values() if r not in rnames]
    rdec = [c['name'] for c in robj['columns'] if c['type'] == 'decimal']
    if missing and len(wanted) == 1 and len(rdec) == 1:
        pairs = {wanted[0]: rdec[0]}
        missing = []
    if missing:
        raise ToolError('REF_UNKNOWN_COLUMN', '结果 %s 没有列 %s' % (rref, '、'.join(missing)), hint='mapping.right 写出左边列对应的右边列名')
    lnames = [c['name'] for c in lobj['columns']]
    lkeys = [k for k, c in enumerate(lobj['columns']) if c['type'] != 'decimal']
    rkeys = [k for k, c in enumerate(robj['columns']) if c['type'] != 'decimal']

    def index(rows, keys):
        # 按非金额列对齐；没有这样的列时按行号对齐。
        return {(tuple(plain(r[k]) for k in keys) if keys else (n,)): r for n, r in enumerate(rows, start=1)}

    def amount(row, names, column):
        value = row[names.index(column)] if row is not None else None
        return Decimal(str(value)) if value is not None else None

    li, ri = index(lrows, lkeys), index(rrows, rkeys)
    differences = []
    for key in sorted(set(li) | set(ri), key=str):
        for lc, rc in pairs.items():
            a, b = amount(li.get(key), lnames, lc), amount(ri.get(key), rnames, rc)
            if a != b:
                differences.append({'key': list(key), 'column': lc, 'left': plain(a), 'right': plain(b), 'diff': plain((a or 0) - (b or 0))})
    lt = {lc: plain(sum((amount(r, lnames, lc) or 0 for r in lrows), Decimal(0))) for lc in pairs}
    rt = {lc: plain(sum((amount(r, rnames, rc) or 0 for r in rrows), Decimal(0))) for lc, rc in pairs.items()}
    passed = not differences
    data = {'passed': passed, 'left': lt, 'right': rt, 'differences': differences[:50]}
    if not passed:
        data['lineage'] = lineage_differences(lobj, robj)
    record(ctx, 'compare', args.get('region'), lref, passed, {'right': rref, 'differences': len(differences)})
    return Result(data)
