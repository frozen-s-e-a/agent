"""底稿任务的新工具（《接口约定》第三节 audit-tools/1）。

和旧工具挂在同一个 audit 服务里，但在服务进程内执行：编号、结构图和分析库要跨调用保留。
每个工具返回 2.4 的信封；业务错误用 ToolError 表达，代码异常记为 ENV_ 错误。
"""
import threading
import traceback

from . import checks, data, fill, query, workpaper
from .common import ToolError
from .files import Files
from .store import Store

S, I, B, A, O = {'type': 'string'}, {'type': 'integer'}, {'type': 'boolean'}, {'type': 'array'}, {'type': 'object'}


def schema(required=(), **props):
    return {'type': 'object', 'properties': props, 'required': list(required)}


# 名称 → (函数, 说明, 参数)。说明给模型看，写清楚什么时候用、不能做什么。
TOOLS = {
    'workpaper_parse': (workpaper.parse, '解析底稿结构：区域、表头、行标签、待填位置、公式、合计行和页眉信息。只读，不调用模型。',
                        schema(['file'], file=S, sheets={'type': ['array', 'null'], 'items': S})),
    'workpaper_region_view': (workpaper.region_view, '取一个区域的紧凑文字渲染，用于判断区域语义。',
                              schema(['region'], region=S, rows={'type': 'array', 'items': I})),
    'workpaper_semantics_check': (workpaper.semantics_check, '校验区域语义：引用的表头和行标签是否与底稿实际文字一致，期间、单位是否一致，待填位置是否都有归属。',
                                  schema(['workpaper', 'regions'], workpaper=S, regions={'type': 'array', 'items': O})),
    'template_match': (workpaper.template_match, '按结构指纹查已确认过的底稿模板。', schema(['fingerprint'], fingerprint=S, workpaper=S)),
    'template_save': (workpaper.template_save, '把用户确认过的区域语义按指纹存入模板库（只存结构和语义，不存客户数据）。',
                      schema(['workpaper', 'regions'], workpaper=S, regions={'type': 'array', 'items': O})),
    'data_inspect': (data.inspect, '识别资料文件里的表：表头行、数据区、列类型、合计行和资料类型猜测。', schema(['file'], file=S)),
    'data_import': (data.import_table, '按确认的字段含义把一张资料表导入项目分析库，生成 D- 编号。无法解析的值不当作 0；超过阈值时报 DATA_INVALID_VALUES，excludeInvalid 为 true 时排除这些行。',
                    schema(['candidate', 'fields'], candidate=S, kind=S, fields={'type': 'array', 'items': O}, excludeInvalid=B)),
    'data_profile': (data.profile, '取资料表的字段统计和样例。', schema(['table'], table=S)),
    'data_quality': (data.quality, '运行数据质量检查：无效值、借贷平衡、余额勾稽、空值。', schema(['table'], table=S)),
    'query_validate': (query.validate, '校验受控查询：只允许 SELECT/WITH，只能读 inputs 声明的表（SQL 里写作 D002、R011），函数在白名单内。',
                       schema(['sql', 'inputs'], sql=S, inputs={'type': 'array', 'items': S})),
    'query_run': (query.run, '执行受控查询，生成结果表 R-；返回列、行数、金额列合计和前 20 行。',
                  schema(['sql', 'inputs'], sql=S, inputs={'type': 'array', 'items': S}, purpose=S, region=S, maxRows=I)),
    'result_get': (query.get, '分页读取结果表。', schema(['result'], result=S, offset=I, limit=I)),
    'check_basis': (checks.check_basis, '校验口径要素是否齐全、每项是否有依据。', schema(['basis'], region=S, basis=O)),
    'check_conservation': (checks.check_conservation, '检查金额空值、未归类的行、关联放大，可选核对来源金额守恒。',
                           schema(['from', 'result', 'amount'], **{'from': S}, result=S, amount=S, excluded=S, excludedAmount=S,
                                  sourceAmount=S, sourceFilter=S, region=S)),
    'check_control': (checks.check_control, '控制数核对：结果表某列的合计与余额表、另一结果或给定值比较。',
                      schema(['left', 'right'], region=S, left=O, right=O, tolerance=S, excluded=S)),
    'check_compare': (checks.check_compare, '双路复算比较：两张结果表按非金额列对齐后逐行比较。',
                      schema(['left', 'right'], region=S, left=S, right=S, mapping=O)),
    'fill_compile': (fill.fill_compile, '编译写入计划：每个写入位置都必须来自结果表、项目资料或卡片确认的文字，不能直接给数值。',
                     schema(['task', 'workpaper', 'bindings'], task=S, workpaper=S, bindings={'type': 'array', 'items': O}, overwrite={'type': 'array', 'items': S})),
    'fill_apply': (fill.fill_apply, '按已确认的写入计划写出底稿副本，重新打开逐项核对，生成填写核对表。',
                   schema(['task', 'plan', 'approvedCard'], task=S, plan=S, approvedCard=S, excelRecalc=B)),
    'fill_preview': (fill.fill_preview, '列出写入计划中每格的拟写值、来源和是否覆盖。', schema(['plan'], plan=S, range=S, offset=I)),
    'trace_cell': (fill.trace_cell, '查某个写入单元格的来源、口径和核对结果。', schema(['output', 'cell'], output=S, cell=S)),
    'table_view': (data.table_view, '分页查看资料表或结果表，可定位到某行。',
                   schema(['table'], table=S, offset=I, limit=I, locate=I, columns={'type': ['array', 'null'], 'items': S})),
}


class Ctx:
    def __init__(self, root):
        self.store = Store(root)
        self.files = Files(self.store)
        query.register(self.store.db)


_contexts, _lock = {}, threading.Lock()


def context(root):
    key = str(root)
    with _lock:
        if key not in _contexts:
            _contexts[key] = Ctx(root)
        return _contexts[key]


def listing():
    return [{'name': name, 'description': desc, 'inputSchema': params,
             'annotations': {'readOnlyHint': name not in ('fill_apply',), 'destructiveHint': False, 'idempotentHint': False, 'openWorldHint': False}}
            for name, (_, desc, params) in TOOLS.items()]


def call(root, name, arguments):
    """→ 2.4 信封。同一项目的调用依次执行：分析库连接不能并发使用。"""
    try:
        ctx = context(root)
        if not isinstance(arguments, dict):
            raise ToolError('ARG_INVALID', '参数应为对象')
        with ctx.store.lock:
            return TOOLS[name][0](ctx, arguments).envelope()
    except ToolError as error:
        return error.envelope()
    except Exception as error:  # 代码缺陷：不让服务退出，把位置留给维护人员。
        where = traceback.extract_tb(error.__traceback__)[-1]
        return ToolError('ENV_TOOL_FAILED', '工具内部错误：%s' % (str(error)[:300] or type(error).__name__),
                         hint='%s:%d' % (where.filename.rsplit('/', 1)[-1], where.lineno)).envelope()


def interrupt(root):
    ctx = _contexts.get(str(root))
    if ctx:
        ctx.store.db.interrupt()
