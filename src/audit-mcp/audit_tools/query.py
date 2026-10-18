"""受控查询（《接口约定》3.6，实现设计 7.2、7.3）。

模型用 SQL 表达计算，代码先解析检查，再在项目分析库上执行，结果存成带编号的结果表（R-）。
只允许一条 SELECT 或 WITH；只能引用声明过的资料表、结果表和查询里自己定义的 CTE；
函数按白名单；不能读写文件。数字不经模型转述，后续核对和填写都按编号引用。
"""
import datetime
import json
import re
import threading
import unicodedata
from decimal import Decimal

from .common import Result, ToolError, plain, require
from .store import sql_name

TIMEOUT_SECONDS = 120
MAX_ROWS = 50000
HEAD = 20

ALLOWED = {
    # 聚合与窗口
    'sum', 'count', 'count_star', 'avg', 'min', 'max', 'any_value', 'first', 'last', 'arg_min', 'arg_max', 'string_agg', 'group_concat',
    'median', 'quantile_cont', 'quantile_disc', 'stddev', 'stddev_samp', 'stddev_pop', 'variance', 'var_samp', 'var_pop', 'bool_and', 'bool_or',
    'row_number', 'rank', 'dense_rank', 'percent_rank', 'cume_dist', 'ntile', 'lag', 'lead', 'first_value', 'last_value', 'nth_value',
    # 数值
    'abs', 'round', 'floor', 'ceil', 'ceiling', 'trunc', 'sign', 'mod', 'power', 'pow', 'sqrt', 'ln', 'log', 'log10', 'greatest', 'least',
    'coalesce', 'ifnull', 'nullif', 'if', 'try_cast', 'isfinite',
    # 日期
    'date_diff', 'datediff', 'date_sub', 'date_part', 'datepart', 'date_trunc', 'datetrunc', 'date_add', 'year', 'month', 'day', 'quarter',
    'week', 'weekday', 'dayofweek', 'dayofmonth', 'dayofyear', 'yearweek', 'last_day', 'make_date', 'strftime', 'strptime', 'try_strptime',
    'to_days', 'to_months', 'to_years', 'extract', 'age',
    # 文本
    'length', 'char_length', 'lower', 'upper', 'trim', 'ltrim', 'rtrim', 'substring', 'substr', 'left', 'right', 'replace', 'reverse',
    'regexp_matches', 'regexp_extract', 'regexp_replace', 'regexp_full_match', 'contains', 'starts_with', 'ends_with', 'prefix', 'suffix',
    'concat', 'concat_ws', 'split_part', 'instr', 'strpos', 'position', 'lpad', 'rpad', 'repeat', 'like_escape', 'ilike_escape', 'format', 'printf',
    'md5', 'hash',
    # 通用函数（7.3，本服务提供）
    'name_norm', 'name_sim', 'aging_days', 'extract_invoice_no', 'extract_contract_no', 'first_digit',
}


# ---------------------------------------------------------------------------
# 通用函数（7.3）：SQL 不好写、又容易写错的操作。每个都有单元测试。

SUFFIXES = ['股份有限公司', '有限责任公司', '有限公司', '集团公司', '股份公司', '公司', '分公司', '总公司', '集团', '厂', '商行', '经营部']


def name_norm(name):
    """单位名称规范化：全角转半角，去括号内容和空白，去"有限公司"等后缀。"""
    if name is None:
        return None
    text = unicodedata.normalize('NFKC', str(name))
    text = re.sub(r'[\(（][^)）]*[\)）]', '', text)
    text = re.sub(r'\s+', '', text)
    changed = True
    while changed:
        changed = False
        for suffix in SUFFIXES:
            if text.endswith(suffix) and len(text) > len(suffix):
                text, changed = text[:-len(suffix)], True
    return text


def name_sim(a, b):
    """规范化后两个名称的相似度（0～1），按字符二元组的 Dice 系数。"""
    a, b = name_norm(a), name_norm(b)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    grams = lambda s: [s[i:i + 2] for i in range(len(s) - 1)] or [s]
    x, y = grams(a), grams(b)
    common, pool = 0, list(y)
    for g in x:
        if g in pool:
            pool.remove(g)
            common += 1
    return round(2 * common / (len(x) + len(y)), 4)


def aging_days(start, end):
    """账龄天数：end - start，任一为空时为空。"""
    if start is None or end is None:
        return None
    return (end - start).days


def extract_invoice_no(text):
    """从摘要中取发票号：'发票号'、'发票'、'票号' 后的 8～20 位数字。"""
    match = re.search(r'(?:发票号码?|发票|票号)[:：\s]*([0-9]{8,20})', str(text or ''))
    return match.group(1) if match else None


def extract_contract_no(text):
    """从摘要中取合同号：'合同号'、'合同' 后的字母数字串。"""
    match = re.search(r'合同(?:号|编号)?[:：\s]*([A-Za-z0-9][A-Za-z0-9\-_/]{3,30})', str(text or ''))
    return match.group(1) if match else None


def first_digit(value):
    """首位数字（1～9），用于首位数字分布；零和空为空。"""
    if value is None:
        return None
    digits = re.sub(r'[^0-9]', '', format(abs(Decimal(str(value))), 'f')).lstrip('0')
    return int(digits[0]) if digits else None


def register(con):
    try:
        import duckdb.sqltypes as t
    except ImportError:
        import duckdb.typing as t
    specs = [
        ('name_norm', name_norm, [t.VARCHAR], t.VARCHAR),
        ('name_sim', name_sim, [t.VARCHAR, t.VARCHAR], t.DOUBLE),
        ('aging_days', aging_days, [t.DATE, t.DATE], t.BIGINT),
        ('extract_invoice_no', extract_invoice_no, [t.VARCHAR], t.VARCHAR),
        ('extract_contract_no', extract_contract_no, [t.VARCHAR], t.VARCHAR),
        ('first_digit', first_digit, [t.DOUBLE], t.BIGINT),
    ]
    for name, fn, args, ret in specs:
        con.create_function(name, fn, args, ret, null_handling='special')


# ---------------------------------------------------------------------------
# 检查


def walk(node, tables, functions, ctes, bad):
    if isinstance(node, dict):
        cte_map = node.get('cte_map')
        if isinstance(cte_map, dict):
            for entry in cte_map.get('map', []):
                ctes.add(str(entry.get('key', '')).lower())
        kind = node.get('type')
        if kind == 'BASE_TABLE':
            tables.add((node.get('schema_name') or '', node.get('table_name') or ''))
        elif kind == 'TABLE_FUNCTION':
            bad.append('表函数 %s' % node.get('function', {}).get('function_name'))
        if node.get('class') == 'FUNCTION' and node.get('function_name'):
            functions.add(node['function_name'])
        for value in node.values():
            walk(value, tables, functions, ctes, bad)
    elif isinstance(node, list):
        for value in node:
            walk(value, tables, functions, ctes, bad)


def declared(ctx, inputs):
    if not isinstance(inputs, list) or not inputs:
        raise ToolError('REF_NO_INPUTS', '没有声明 inputs', hint='inputs 列出查询用到的资料表和结果表编号，如 ["D-002"]')
    out = {}
    for ref in inputs:
        if not isinstance(ref, str) or not re.fullmatch(r'(D|R)-\d{3,}', ref):
            raise ToolError('ARG_INVALID', 'inputs 里的 %r 不是资料表或结果表编号' % (ref,))
        obj = ctx.store.get(ref)
        out[sql_name(ref).lower()] = (ref, obj.get('version', 1))
    return out


def check(ctx, sql, inputs):
    if not isinstance(sql, str) or not sql.strip():
        raise ToolError('ARG_MISSING', '缺少 sql')
    names = declared(ctx, inputs)
    with ctx.store.lock:
        ast = json.loads(ctx.store.db.execute('SELECT json_serialize_sql(?)', [sql]).fetchone()[0])
    if ast.get('error'):
        message = ast.get('error_message', '')
        if 'Only SELECT' in message:
            raise ToolError('ARG_NOT_SELECT', '只允许 SELECT 和 WITH 查询')
        raise ToolError('ARG_SQL_SYNTAX', 'SQL 语法错误：%s' % message, hint='用 DuckDB 方言；中文列名加双引号')
    if len(ast['statements']) != 1:
        raise ToolError('ARG_MULTIPLE_STATEMENTS', '一次只能执行一条查询')
    tables, functions, ctes, bad = set(), set(), set(), []
    walk(ast['statements'][0]['node'], tables, functions, ctes, bad)
    if bad:
        raise ToolError('ARG_FUNCTION_NOT_ALLOWED', '不能使用%s' % '、'.join(bad), hint='查询只能读项目分析库里的表')
    unknown = sorted(t for s, t in tables if s or (t.lower() not in names and t.lower() not in ctes))
    if unknown:
        raise ToolError('REF_UNDECLARED_TABLE', 'SQL 引用了没有声明的表：%s' % '、'.join(unknown),
                        hint='已声明：%s；表名写作 D002、R011' % '、'.join(n.upper() for n in names))
    blocked = sorted(f for f in functions if re.match(r'^[a-z_][a-z0-9_]*$', f, re.I) and f.lower() not in ALLOWED)
    if blocked:
        raise ToolError('ARG_FUNCTION_NOT_ALLOWED', '函数不在白名单里：%s' % '、'.join(blocked))
    return names


def bind(ctx, sql):
    """让 DuckDB 绑定一次（不取数据），列名写错时给出它的提示。"""
    import duckdb
    try:
        with ctx.store.lock:
            con = ctx.store.db
            con.execute('SELECT * FROM (%s) AS q LIMIT 0' % sql)
            return [(d[0], str(d[1])) for d in con.description]
    except duckdb.BinderException as error:
        raise ToolError('REF_UNKNOWN_COLUMN', '列或表达式无效：%s' % str(error).split('\n')[0], hint=str(error)[:400])
    except duckdb.ParserException as error:
        raise ToolError('ARG_SQL_SYNTAX', 'SQL 语法错误：%s' % str(error).split('\n')[0])
    except duckdb.Error as error:
        raise ToolError('ARG_SQL_INVALID', '查询无法执行：%s' % str(error).split('\n')[0])


def column_type(duck):
    duck = duck.upper()
    if duck.startswith(('DECIMAL', 'DOUBLE', 'FLOAT', 'REAL', 'HUGEINT')):
        return 'decimal'
    if duck in ('BIGINT', 'INTEGER', 'SMALLINT', 'TINYINT', 'UBIGINT', 'UINTEGER'):
        return 'integer'
    if duck.startswith(('DATE', 'TIMESTAMP')):
        return 'date'
    if duck == 'BOOLEAN':
        return 'boolean'
    return 'text'


def validate(ctx, args):
    sql = require(args, 'sql')
    names = check(ctx, sql, args.get('inputs'))
    columns = bind(ctx, sql)
    return Result({'valid': True, 'inputs': [v[0] for v in names.values()], 'columns': [{'name': n, 'type': column_type(t)} for n, t in columns]})


def run(ctx, args):
    sql = require(args, 'sql')
    names = check(ctx, sql, args.get('inputs'))
    columns = bind(ctx, sql)
    if len({n for n, _ in columns}) != len(columns) or any(n.startswith('_') for n, _ in columns):
        raise ToolError('ARG_DUPLICATE_COLUMNS', '结果列名重复或以下划线开头：%s' % '、'.join(n for n, _ in columns), hint='给每个结果列起不同的别名')
    limit = min(int(args.get('maxRows') or 5000), MAX_ROWS)
    import duckdb
    with ctx.store.lock:
        con = ctx.store.db
        timer = threading.Timer(TIMEOUT_SECONDS, con.interrupt)
        timer.start()
        try:
            rows = con.execute('SELECT * FROM (%s) AS q LIMIT %d' % (sql, limit + 1)).fetchall()
        except duckdb.InterruptException:
            raise ToolError('ARG_QUERY_TIMEOUT', '查询超过 %d 秒，已停止' % TIMEOUT_SECONDS, hint='缩小范围或先汇总再关联')
        except duckdb.Error as error:
            raise ToolError('ARG_SQL_INVALID', '查询执行出错：%s' % str(error).split('\n')[0])
        finally:
            timer.cancel()
        if len(rows) > limit:
            raise ToolError('ARG_TOO_MANY_ROWS', '结果超过 %d 行' % limit, hint='按需要的粒度汇总，或调高 maxRows')
        ref = ctx.store.allocate('R')
        name = sql_name(ref)
        con.execute('CREATE TABLE %s AS SELECT 0::BIGINT AS _row, * FROM (%s) AS q LIMIT 0' % (name, sql))
        if rows:
            con.executemany('INSERT INTO %s VALUES (%s)' % (name, ', '.join(['?'] * (len(columns) + 1))), [[i] + list(r) for i, r in enumerate(rows, start=1)])
    cols = [{'name': n, 'type': column_type(t)} for n, t in columns]
    sums = {}
    for i, c in enumerate(cols):
        if c['type'] == 'decimal':
            total = sum((Decimal(str(r[i])) for r in rows if r[i] is not None), Decimal(0))
            sums[c['name']] = plain(total)
    inputs = ['%s@v%d' % v for v in names.values()]
    obj = {'kind': 'result', 'id': ref, 'sql': sql, 'inputs': inputs, 'purpose': args.get('purpose'), 'region': args.get('region'),
           'columns': cols, 'rows': len(rows), 'sums': sums, 'createdAt': datetime.datetime.now().isoformat(timespec='seconds')}
    ctx.store.put(ref, obj)
    head = [[plain(v) for v in r] for r in rows[:HEAD]]
    return Result({'result': ref, 'rows': len(rows), 'columns': cols, 'sums': sums, 'head': head, 'lineage': {'inputs': inputs, 'sql': sql}},
                  refs=[ref], truncated=len(rows) > HEAD, next={'result': ref, 'offset': HEAD} if len(rows) > HEAD else None)


def result_rows(ctx, ref):
    obj = ctx.store.get(ref, 'result')
    with ctx.store.lock:
        rows = ctx.store.db.execute('SELECT * EXCLUDE (_row) FROM %s ORDER BY _row' % sql_name(ref)).fetchall()
    return obj, rows


def get(ctx, args):
    ref = require(args, 'result')
    obj = ctx.store.get(ref, 'result')
    offset, limit = int(args.get('offset') or 0), min(int(args.get('limit') or 50), 200)
    with ctx.store.lock:
        rows = ctx.store.db.execute('SELECT * EXCLUDE (_row) FROM %s ORDER BY _row LIMIT %d OFFSET %d' % (sql_name(ref), limit, offset)).fetchall()
    more = offset + len(rows) < obj['rows']
    return Result({'result': ref, 'columns': obj['columns'], 'offset': offset, 'rows': [[plain(v) for v in r] for r in rows], 'total': obj['rows'], 'sums': obj['sums']},
                  truncated=more, next={'result': ref, 'offset': offset + len(rows), 'limit': limit} if more else None)
