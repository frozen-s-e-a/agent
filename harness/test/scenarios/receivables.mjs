// 测试场景：与《接口约定》第六节的事件回放样例相同——一份应收账款底稿两个区域，
// 账龄区域（R5）触发一次口径确认和一次控制数差异重做，前五名客户区域（R6）一次通过。
//
// tools：按《接口约定》第三节信封返回固定结果的假审计工具（fake-audit-tools.mjs 在 MCP 服务里加载，
//        进程内测试直接调用）；respond：编排各节点的假模型回答。
//
// options：
//   alwaysBuggy        账龄查询每次都漏掉 12 月 31 日（重做用尽 → 差异卡）
//   semanticsFailures  R5 区域语义前 N 次校验不通过
//   compareMismatch    第二路复算结果不同，judge 判断不了
//   invalidValues      序时账导入时报 DATA_INVALID_VALUES
//   badSubmit          understand 节点第一次交回不合格的结果（测格式修复）
export const FILES = {
  workpaper: { file: 'F-9a1be04c77d2', name: '应收账款底稿.xlsx' },
  balance: { file: 'F-1c44d0e2a7b9', name: '科目余额表2025.xlsx' },
  journal: { file: 'F-6e02f5a1c3d8', name: '序时账2025.xlsx' },
}
export const PROMPT = '用余额表和序时账填写应收账款底稿，期间2025年'
export const R5 = 'W-003#R5'
export const R6 = 'W-003#R6'

const ok = (data, refs = []) => ({ ok: true, data, warnings: [], refs, truncated: false, next: null })
const fail = (code, message, extra = {}) => ({ ok: false, error: { code, message, retryable: /^(ARG_|REF_|HEADER_)/.test(code), ...extra } })

const AGING = {
  buggy: [['1年以内', '1199500.00'], ['1-2年', '435000.00'], ['2-3年', '150000.00'], ['3年以上', '50000.00']],
  fixed: [['1年以内', '1200000.00'], ['1-2年', '435000.00'], ['2-3年', '150000.00'], ['3年以上', '50000.00']],
  invoice: [['1年以内', '1150000.00'], ['1-2年', '485000.00'], ['2-3年', '150000.00'], ['3年以上', '50000.00']],
}
const TOP5 = [['甲公司', '500000.00'], ['乙公司', '400000.00'], ['丙公司', '300000.00'], ['丁公司', '200000.00'], ['戊公司', '120000.00']]
const sum = rows => rows.reduce((n, row) => n + Math.round(Number(row[1]) * 100), 0)
const money = cents => (cents / 100).toFixed(2)
const CONTROL = { '1122/closing': '1835000.00', '1122/top5': '1520000.00' }

export function createScenario(options = {}) {
  const state = { nextResult: 11, results: {}, semanticsChecks: 0, imports: {} }

  function rowsFor(sql) {
    if (sql.includes('TOP5')) return { label: '客户', rows: TOP5 }
    if (sql.includes('INVOICE')) return { label: '账龄段', rows: AGING.invoice }
    if (sql.includes('AGING')) return { label: '账龄段', rows: sql.includes("< '2025-12-31'") ? AGING.buggy : AGING.fixed }
    return undefined
  }

  const tools = {
    workpaper_parse: ({ file }) => file !== FILES.workpaper.file ? fail('IO_NOT_FOUND', '找不到底稿 ' + file) : ok({
      workpaper: 'W-003', fingerprint: 'TPL-51c0e2a9b3f1',
      sheets: [{
        name: '应收账款', hidden: false, protected: false, usedRange: 'A1:H30', meta: [{ label: '单位：元', cell: '应收账款!E2', kind: 'unit', unit: '元', scope: 'sheet' }],
        regions: [
          { id: R5, range: '应收账款!A5:E11', type: 'fixed_table', typeCertain: true, headerRows: [5, 6], columns: [{ col: 'C', path: ['期末余额'], labelCells: ['应收账款!C5'] }, { col: 'D', path: ['占比'], labelCells: ['应收账款!D5'] }], rowLabels: [{ row: 7, text: '1年以内', level: 1, cell: '应收账款!A7' }, { row: 8, text: '1-2年', level: 1, cell: '应收账款!A8' }, { row: 9, text: '2-3年', level: 1, cell: '应收账款!A9' }, { row: 10, text: '3年以上', level: 1, cell: '应收账款!A10' }], totals: [{ row: 11, text: '合计', formula: true }], inputCells: 8, formulaCells: 2, ambiguities: [] },
          { id: R6, range: '应收账款!A15:D20', type: 'fixed_table', typeCertain: true, headerRows: [15], columns: [{ col: 'B', path: ['客户名称'], labelCells: ['应收账款!B15'] }, { col: 'C', path: ['期末余额'], labelCells: ['应收账款!C15'] }], rowLabels: [], totals: [], inputCells: 10, formulaCells: 5, ambiguities: [] },
          { id: 'W-003#R7', range: '应收账款!A24:H24', type: 'none', typeCertain: true, headerRows: [], columns: [], rowLabels: [], totals: [], inputCells: 0, formulaCells: 0, ambiguities: [] },
        ],
      }],
    }, ['W-003']),
    template_match: () => ok({ known: false }),
    workpaper_region_view: ({ region }) => ok({ region, text: region === R5 ? 'A5 账龄 | C5 期末余额 | D5 占比\nA7 1年以内 | C7 [待填] | D7 =C7/C11\n…\nA11 合计 | C11 =SUM(C7:C10)' : 'A15 序号 | B15 客户名称 | C15 期末余额 | D15 占比\nB16 [待填] | C16 [待填] | D16 =C16/$C$11\n…' }),
    workpaper_semantics_check: ({ regions }) => {
      if (regions.some(r => r.region === R5) && state.semanticsChecks++ < (options.semanticsFailures ?? 0)) {
        return fail('HEADER_MISMATCH', '应收账款!C5 实际文字为“期末余额”，与引用的“期初余额”不同', { where: '应收账款!C5', hint: '核对区域语义中引用的坐标和原文' })
      }
      return ok({ errors: [] })
    },
    data_inspect: ({ file }) => {
      if (file === FILES.balance.file) return ok([{ candidate: `${file}/科目余额表/1`, sheet: '科目余额表', headerRows: [1], dataRange: 'A2:F121', rows: 120, columns: [{ col: 'A', header: '科目编码', types: { text: 120 }, nulls: 0, samples: ['1122'] }, { col: 'B', header: '科目名称', types: { text: 120 }, nulls: 0, samples: ['应收账款'] }, { col: 'F', header: '期末余额', types: { decimal: 120 }, nulls: 0, samples: ['1835000.00'] }], totalsRows: [], kindGuess: null }])
      if (file === FILES.journal.file) return ok([{ candidate: `${file}/序时账/1`, sheet: '序时账', headerRows: [1], dataRange: 'A2:N48210', rows: 48209, columns: [{ col: 'A', header: '日期', types: { date: 48209 }, nulls: 0, samples: ['2025-01-02'] }, { col: 'C', header: '科目编码', types: { text: 48209 }, nulls: 0, samples: ['1122'] }, { col: 'D', header: '摘要', types: { text: 48209 }, nulls: 0, samples: ['销售商品 发票号 00123'] }, { col: 'H', header: '借方金额', types: { decimal: 48206, text: 3 }, nulls: 0, samples: ['500.00'] }, { col: 'I', header: '贷方金额', types: { decimal: 48209 }, nulls: 0, samples: ['0.00'] }], totalsRows: [48211], kindGuess: null }])
      return fail('IO_NOT_FOUND', '找不到资料 ' + file)
    },
    data_import: ({ candidate, excludeInvalid }) => {
      const table = candidate.includes('科目余额表') ? 'D-001' : 'D-002'
      if (table === 'D-002' && options.invalidValues && !excludeInvalid) return fail('DATA_INVALID_VALUES', '借方金额列有 3 个值无法解析（如第 102 行“12万”），超过阈值', { detail: { col: 'H', count: 3 } })
      const invalid = table === 'D-002' && !excludeInvalid ? [{ col: 'H', count: 3, samples: [{ row: 102, value: '12万' }] }] : []
      return ok({ table, rows: table === 'D-001' ? 120 : 48209 - (excludeInvalid ? 3 : 0), invalid }, [table])
    },
    data_quality: ({ table }) => ok({ table, passed: true, checks: [{ check: 'balanced', passed: true }] }),
    check_basis: ({ basis }) => {
      const missing = ['sources', 'period', 'scope', 'amount', 'grouping', 'unit', 'control'].filter(k => !basis?.[k])
      return ok({ passed: missing.length === 0, missing })
    },
    query_validate: ({ sql, inputs }) => {
      if (!/^\s*(SELECT|WITH)\b/i.test(sql)) return fail('ARG_NOT_SELECT', '只允许 SELECT 和 WITH')
      if (!inputs?.length) return fail('REF_NO_INPUTS', '没有声明 inputs')
      return ok({ valid: true })
    },
    query_run: ({ sql, inputs }) => {
      const found = rowsFor(sql)
      if (!found) return fail('REF_UNKNOWN_TABLE', 'SQL 引用了未声明的表')
      const id = 'R-' + String(state.nextResult++).padStart(3, '0')
      const total = money(sum(found.rows))
      state.results[id] = { rows: found.rows, total }
      return ok({ result: id, rows: found.rows.length, columns: [{ name: found.label, type: 'text' }, { name: '金额', type: 'decimal' }], sums: { 金额: total }, head: found.rows, lineage: { inputs: inputs.map(i => i + '@v1'), sql } }, [id])
    },
    check_conservation: () => ok({ passed: true, rowsIn: 412, rowsIncluded: 412, rowsExcluded: 0 }),
    check_control: ({ left, right }) => {
      const value = state.results[left.result]?.total
      const expected = CONTROL[`${right.account}/${right.field}`]
      if (value === undefined || expected === undefined) return fail('REF_UNKNOWN_RESULT', '找不到结果或控制数')
      const diff = money(Math.round(Number(value) * 100) - Math.round(Number(expected) * 100))
      return ok({ passed: value === expected, left: value, right: expected, diff, explainedBy: [] })
    },
    check_compare: ({ left, right }) => {
      const a = state.results[left]?.total
      const b = state.results[right]?.total
      const passed = !options.compareMismatch && a === b
      return ok({ passed, left: a, right: b, ...(passed ? {} : { differences: [{ aspect: '期间', left: '凭证日期 ≤ 2025-12-31', right: '凭证日期 < 2025-12-31' }] }) })
    },
    fill_compile: ({ workpaper, bindings, task }) => ok({ plan: 'FP-001', workpaper, cells: bindings.reduce((n, b) => n + b.cells.length, 0), manual: bindings.reduce((n, b) => n + b.manual.length, 0), overwrites: [], expand: [], output: `输出/${task ?? 'T-0000'}/应收账款底稿-填写成果.xlsx` }, ['FP-001']),
    fill_apply: ({ plan, approvedCard, task }) => !approvedCard ? fail('NEEDS_INPUT', '没有已批准的写入确认卡') : ok({
      output: `输出/${task ?? 'T-0000'}/应收账款底稿-填写成果.xlsx`, plan,
      checks: { readback: 'passed', formulas: 'passed', crossFoot: 'passed', untouched: 'passed', completeness: 'passed', excel: 'passed' },
      manualCells: ['应收账款!E7:E10'], report: `输出/${task ?? 'T-0000'}/填写核对.xlsx`,
    }),
    trace_cell: ({ cell }) => ok({ cell, value: '1200000.00', text: '1,200,000.00', from: { result: 'R-014', row: 1, column: '金额' } }),
    fill_preview: ({ plan }) => ok({ cells: [{ cell: '应收账款!C7', value: '1200000.00', valueType: 'number', from: 'R-014#1', old: null, overwrite: false }], next: null, plan }),
    table_view: ({ table }) => ok({ table, title: table, columns: [], rows: [], total: 0, offset: 0 }),
    // 模型可见的工具也挂一个，确认它对模型可见
    data_profile: ({ table }) => ok({ table, columns: [] }),
  }

  let understandCalls = 0
  /** 编排节点的假模型：返回 { submit } 或 { text }。 */
  function respond(node, input) {
    switch (node) {
      case 'understand':
        if (options.badSubmit && understandCalls++ === 0) return { submit: { deliverables: 'workpaper' } }
        return { submit: { deliverables: [{ kind: 'workpaper', file: FILES.workpaper.file }], period: '2025', scope: { accounts: ['应收账款'] }, constraints: ['期间2025年'], unclear: [], subtasks: [] } }
      case 'region_semantics':
        if (input.region.id === R5) return { submit: { region: R5, type: 'fixed_table', purpose: '应收账款账龄分析', columns: [{ col: 'C', measure: '期末余额', period: '2025-12-31', unit: '元', direction: 'debit', basis: 'template', basisRef: '应收账款!C5', confidence: 'high' }, { col: 'D', measure: '占比', period: '2025-12-31', unit: '%', basis: 'template', basisRef: '应收账款!D5', confidence: 'high' }], rows: [{ row: 7, text: '1年以内' }, { row: 8, text: '1-2年' }, { row: 9, text: '2-3年' }, { row: 10, text: '3年以上' }, { row: 11, text: '合计', formula: true }], manual: ['应收账款!E7:E10'], uncertain: [] } }
        return { submit: { region: R6, type: 'fixed_table', purpose: '期末余额前五名客户', columns: [{ col: 'B', measure: '客户名称', basis: 'template', basisRef: '应收账款!B15', confidence: 'high' }, { col: 'C', measure: '期末余额', period: '2025-12-31', unit: '元', direction: 'debit', basis: 'template', basisRef: '应收账款!C15', confidence: 'high' }], manual: [], uncertain: [] } }
      case 'field_semantics':
        if (input.table.candidate.includes('科目余额表')) return { submit: { kind: 'trial_balance', fields: [{ col: 'A', name: '科目编码', meaning: 'account_code', type: 'text', basis: 'data' }, { col: 'B', name: '科目名称', meaning: 'account_name', type: 'text', basis: 'data' }, { col: 'F', name: '期末余额', meaning: 'closing', type: 'decimal', basis: 'data' }] } }
        return { submit: { kind: 'journal', fields: [{ col: 'A', name: '凭证日期', meaning: 'voucher_date', type: 'date', basis: 'data' }, { col: 'C', name: '科目编码', meaning: 'account_code', type: 'text', basis: 'data' }, { col: 'D', name: '摘要', meaning: 'summary', type: 'text', basis: 'data' }, { col: 'H', name: '借方金额', meaning: 'debit', type: 'decimal', basis: 'data' }, { col: 'I', name: '贷方金额', meaning: 'credit', type: 'decimal', basis: 'data' }] } }
      case 'basis': {
        const region = input.region.id
        const common = {
          region,
          sources: [{ table: 'D-002', columns: ['凭证日期', '科目编码', '借方金额', '贷方金额'] }],
          period: { value: '2025-01-01/2025-12-31', basis: 'user', basisRef: 'M-0001' },
          scope: { include: "科目编码 = '1122'", exclude: [], basis: 'template' },
          amount: { column: '金额', direction: 'debit', sign: '借方减贷方', basis: 'data' },
          unit: { scale: '1', rounding: '0.01', basis: 'template' },
        }
        if (region === R5) {
          const buggy = options.alwaysBuggy || !input.lastFailure
          return { submit: {
            ...common,
            grouping: { description: '按账龄段汇总，依次对应第 7～10 行', basis: 'template' },
            control: { label: '账龄合计', column: '金额', right: { kind: 'balance', table: 'D-001', account: '1122', field: 'closing' }, rightLabel: '余额表 1122 期末', basis: 'data' },
            steps: [{ sql: `SELECT 账龄段, SUM(借方金额 - 贷方金额) AS 金额 FROM D002 WHERE 科目编码 = '1122' AND 凭证日期 ${buggy ? '<' : '<='} '2025-12-31' /* AGING */ GROUP BY 账龄段`, inputs: ['D-002'], purpose: `${R5} 账龄分段` }],
            bindings: [7, 8, 9, 10].map((row, i) => ({ cell: `应收账款!C${row}`, row: i + 1, column: '金额' })),
            manual: [],
            inferred: [{ id: 'q1', item: '账龄起算', text: '账龄从哪一天开始算？', suggest: 0, options: [{ label: '凭证日期' }, { label: '摘要中的发票日期（312 笔可识别，其余用凭证日期）', steps: [{ sql: "SELECT 账龄段, SUM(借方金额 - 贷方金额) AS 金额 FROM D002 WHERE 科目编码 = '1122' /* AGING INVOICE */ GROUP BY 账龄段", inputs: ['D-002'], purpose: `${R5} 账龄分段（发票日期）` }] }] }],
            summary: '账龄按凭证日期起算；单位元',
          } }
        }
        return { submit: {
          ...common,
          grouping: { description: '按客户汇总期末余额，取前五名，依次对应第 16～20 行', basis: 'template' },
          control: { label: '前五名合计', column: '金额', right: { kind: 'balance', table: 'D-001', account: '1122', field: 'top5' }, rightLabel: '往来明细前五名合计', basis: 'data' },
          steps: [{ sql: "SELECT 客户, SUM(借方金额 - 贷方金额) AS 金额 FROM D002 WHERE 科目编码 = '1122' /* TOP5 */ GROUP BY 客户 ORDER BY 金额 DESC LIMIT 5", inputs: ['D-002'], purpose: `${R6} 前五名客户` }],
          bindings: [16, 17, 18, 19, 20].flatMap((row, i) => [{ cell: `应收账款!B${row}`, row: i + 1, column: '客户' }, { cell: `应收账款!C${row}`, row: i + 1, column: '金额' }]),
          manual: [], inferred: [], summary: '按客户汇总期末余额，取前五名；单位元',
        } }
      }
      case 'recompute':
        return { submit: { steps: [{ sql: input.region.id === R5 ? "WITH t AS (SELECT * FROM D002 WHERE 科目编码 = '1122' AND 凭证日期 <= '2025-12-31') SELECT 账龄段, SUM(借方金额) - SUM(贷方金额) AS 金额 FROM t /* AGING */ GROUP BY 1" : "SELECT 客户, SUM(借方金额) - SUM(贷方金额) AS 金额 FROM D002 WHERE 科目编码 = '1122' /* TOP5 */ GROUP BY 1 ORDER BY 2 DESC LIMIT 5", inputs: ['D-002'], purpose: `${input.region.id} 双路复算` }], note: '第二路：先筛选再汇总' } }
      case 'judge':
        return { submit: { verdict: 'undecided', reason: '两路的期间条件不同，无法从底稿判断' } }
      case 'notes':
        return { text: '应收账款期末余额 1,835,000.00 元，与科目余额表一致；前五名客户合计 1,520,000.00 元。' }
      case 'message_scope':
        return { submit: { regions: input.text.includes('前五名') ? [R6] : [], reason: '补充说明涉及前五名客户' } }
      default:
        throw new Error('unexpected node ' + node)
    }
  }

  return { tools, respond, state }
}
