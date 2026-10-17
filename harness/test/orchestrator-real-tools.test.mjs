// 编排流程接真实审计工具：真实的 flow / model / tools / store + src/audit-mcp/server.py（新工具，Python）。
// 模型仍用替身，回答里的 SQL 按合成资料写（tests/unit/audit_tools_fixtures.py）：应收账款账龄和前五名客户。
// 检查编排插件解析的结果形状与工具实际返回一致，填好的底稿数字正确。
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { TaskRunner, newTaskState } from '../plugins/orchestrator/flow.mjs'
import { createModel } from '../plugins/orchestrator/model.mjs'
import { Store } from '../plugins/orchestrator/store.mjs'
import { createToolCaller } from '../plugins/orchestrator/tools.mjs'
import { autoAnswer, stubCards, stubLlm } from './orchestrator-kit.mjs'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const python = process.env.AUDIT_PYTHON || 'python3'
const ready = spawnSync(python, ['-c', 'import duckdb, openpyxl'], { encoding: 'utf8' }).status === 0
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-real-'))
after(() => fs.rmSync(scratch, { recursive: true, force: true }))

/** 标准输入输出上的最小 MCP 客户端，结果形状与 dsh ToolRuntime.execute 一致。 */
function startServer(project, stateDir) {
  const child = spawn(python, ['-X', 'utf8', '-B', path.join(repo, 'src', 'audit-mcp', 'server.py')], {
    env: { ...process.env, AUDIT_PROJECT_ROOT: project, AUDIT_STATE_DIR: stateDir }, stdio: ['pipe', 'pipe', 'inherit'],
  })
  const pending = new Map()
  let next = 1
  readline.createInterface({ input: child.stdout }).on('line', (line) => {
    const message = JSON.parse(line)
    pending.get(message.id)?.(message)
    pending.delete(message.id)
  })
  const request = (method, params) => new Promise((resolve) => {
    const id = next++
    pending.set(id, resolve)
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
  })
  const calls = []
  return {
    calls,
    init: () => request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } }),
    stop: () => child.kill(),
    async execute({ name, arguments: args }) {
      const tool = name.replace(/^mcp__audit__/, '')
      calls.push({ tool, args: structuredClone(args) })
      const { result } = await request('tools/call', { name: tool, arguments: args })
      const content = result.content
      return result.isError ? { isError: true, error: { code: 'TOOL_FAILED', message: content[0].text }, content } : { isError: false, value: { content, structuredContent: result.structuredContent }, content }
    },
  }
}

const fileId = file => 'F-' + crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12)

const AGING = `WITH t AS (SELECT CASE WHEN aging_days("日期", DATE '2025-12-31') <= 365 THEN '1年以内'
  WHEN aging_days("日期", DATE '2025-12-31') <= 730 THEN '1-2年' WHEN aging_days("日期", DATE '2025-12-31') <= 1095 THEN '2-3年'
  ELSE '3年以上' END AS 账龄, "借方金额" - "贷方金额" AS 金额 FROM D002 WHERE "科目编码" = '1122')
SELECT 账龄, SUM(金额) AS 金额 FROM t GROUP BY 账龄 ORDER BY CASE 账龄 WHEN '1年以内' THEN 1 WHEN '1-2年' THEN 2 WHEN '2-3年' THEN 3 ELSE 4 END`
const AGING_2 = `SELECT 账龄, SUM(金额) AS 金额 FROM (SELECT CASE WHEN "日期" > DATE '2024-12-31' THEN '1年以内' WHEN "日期" > DATE '2023-12-31' THEN '1-2年'
  WHEN "日期" > DATE '2022-12-31' THEN '2-3年' ELSE '3年以上' END AS 账龄, "借方金额" - "贷方金额" AS 金额 FROM D002 WHERE "科目编码" = '1122') GROUP BY 账龄`
const TOP5 = `SELECT "客户" AS 客户, SUM("借方金额" - "贷方金额") AS 金额 FROM D002 WHERE "科目编码" = '1122'
  GROUP BY "客户" HAVING SUM("借方金额" - "贷方金额") <> 0 ORDER BY 金额 DESC LIMIT 5`
const TOP5_2 = `WITH c AS (SELECT "客户", SUM("借方金额") - SUM("贷方金额") AS 金额 FROM D002 WHERE "科目编码" = '1122' GROUP BY 1)
  SELECT "客户" AS 客户, 金额 FROM c WHERE 金额 <> 0 ORDER BY 金额 DESC LIMIT 5`
const JOURNAL = [['A', '日期', 'voucher_date', 'date'], ['B', '凭证号', 'voucher_no', 'text'], ['C', '科目编码', 'account_code', 'text'], ['D', '摘要', 'summary', 'text'],
  ['E', '客户', 'counterparty', 'text'], ['F', '借方金额', 'debit', 'decimal'], ['G', '贷方金额', 'credit', 'decimal']]
const BALANCE = [['A', '科目编码', 'account_code', 'text'], ['B', '科目名称', 'account_name', 'text'], ['C', '期初余额', 'opening', 'decimal'],
  ['D', '本期借方', 'debit', 'decimal'], ['E', '本期贷方', 'credit', 'decimal'], ['F', '期末余额', 'closing', 'decimal']]
const fields = list => list.map(([col, name, meaning, type]) => ({ col, name, meaning, type, basis: 'data' }))

function respond(files) {
  return (node, input) => {
    const id = input.region?.id
    const common = {
      region: id, sources: [{ table: 'D-002' }],
      period: { value: '2025-01-01/2025-12-31', basis: 'user', basisRef: 'M-0001' },
      scope: { include: "科目编码 = '1122'", exclude: [], basis: 'template' },
      amount: { column: '金额', direction: 'debit', sign: '借方减贷方', basis: 'data' },
      unit: { scale: '1', rounding: '0.01', basis: 'template' }, inferred: [], manual: [],
    }
    switch (node) {
      case 'understand':
        return { submit: { deliverables: [{ kind: 'workpaper', file: files.workpaper }], period: '2025', scope: { accounts: ['应收账款'] }, constraints: ['期间2025年'], unclear: [], subtasks: [] } }
      case 'region_semantics':
        if (id.endsWith('#R1')) return { submit: { region: id, type: 'fixed_table', purpose: '应收账款账龄分析', columns: [{ col: 'B', measure: '期末账面余额', period: '2025-12-31', unit: '元', basis: 'template', basisRef: '应收账款!B6', confidence: 'high' }], rows: [7, 8, 9, 10].map((row, i) => ({ row, text: ['1年以内', '1-2年', '2-3年', '3年以上'][i] })), manual: ['应收账款!C7:C10', '应收账款!E7:E10'], uncertain: [] } }
        if (id.endsWith('#R2')) return { submit: { region: id, type: 'detail_table', purpose: '期末余额前五名客户', columns: [{ col: 'B', measure: '客户名称', basis: 'template', basisRef: '应收账款!B14', confidence: 'high' }, { col: 'C', measure: '期末余额', period: '2025-12-31', unit: '元', basis: 'template', basisRef: '应收账款!C14', confidence: 'high' }], manual: [], uncertain: [] } }
        return { submit: { region: id, type: 'text', purpose: '审计说明', columns: [], manual: [], uncertain: [] } }
      case 'field_semantics':
        return { submit: input.table.candidate.includes('科目余额表') ? { kind: 'trial_balance', fields: fields(BALANCE) } : { kind: 'journal', fields: fields(JOURNAL) } }
      case 'basis':
        if (id.endsWith('#R1')) return { submit: { ...common,
          grouping: { description: '按凭证日期起算账龄，依次对应第 7～10 行', basis: 'template' },
          control: { label: '账龄合计', column: '金额', right: { kind: 'balance', table: 'D-001', account: '1122', field: 'closing' }, rightLabel: '余额表 1122 期末', basis: 'data' },
          steps: [{ sql: AGING, inputs: ['D-002'], purpose: `${id} 账龄分段` }],
          bindings: [7, 8, 9, 10].map((row, i) => ({ cell: `应收账款!B${row}`, row: i + 1, column: '金额' })), summary: '账龄按凭证日期起算；单位元' } }
        return { submit: { ...common,
          grouping: { description: '按客户汇总期末余额，取前五名，依次对应第 15～19 行', basis: 'template' },
          control: { label: '前五名合计', column: '金额', right: { kind: 'query', sql: `SELECT SUM(金额) FROM (${TOP5})`, inputs: ['D-002'] }, rightLabel: '按客户汇总的前五名合计', basis: 'data' },
          steps: [{ sql: TOP5, inputs: ['D-002'], purpose: `${id} 前五名客户` }],
          bindings: [15, 16, 17, 18, 19].flatMap((row, i) => [{ cell: `应收账款!B${row}`, row: i + 1, column: '客户' }, { cell: `应收账款!C${row}`, row: i + 1, column: '金额' }]), summary: '按客户汇总期末余额取前五名；单位元' } }
      case 'recompute':
        return { submit: { steps: [{ sql: id.endsWith('#R1') ? AGING_2 : TOP5_2, inputs: ['D-002'], purpose: `${id} 双路复算` }], note: '第二路' } }
      case 'notes':
        return { text: '应收账款期末余额 1,835,000.00 元，与科目余额表一致；前五名客户合计 1,635,000.00 元。' }
      default:
        throw new Error('unexpected node ' + node)
    }
  }
}

/** 建合成项目、启动审计工具服务，跑完一个底稿任务。invalid 时序时账里有一个"12万"。 */
async function runTask(name, { invalid = false, answers = {} } = {}) {
  const project = path.join(scratch, name, 'project')
  const stateDir = path.join(scratch, name, 'state')
  fs.mkdirSync(project, { recursive: true })
  const built = spawnSync(python, ['-c', 'import sys; sys.path.insert(0, sys.argv[1]); import audit_tools_fixtures as fx; fx.build(__import__("pathlib").Path(sys.argv[2]), invalid=sys.argv[3] == "1")', path.join(repo, 'tests', 'unit'), project, invalid ? '1' : '0'], { encoding: 'utf8' })
  assert.equal(built.status, 0, built.stderr)
  const files = { workpaper: fileId(path.join(project, '应收账款底稿.xlsx')), balance: fileId(path.join(project, '科目余额表2025.xlsx')), journal: fileId(path.join(project, '序时账2025.xlsx')) }
  const server = startServer(project, stateDir)
  after(() => server.stop())
  await server.init()

  const store = new Store(stateDir)
  const notifications = []
  const notify = (method, params) => notifications.push({ method, params })
  const cards = stubCards(notify)
  autoAnswer(cards, answers)
  const model = createModel({ llm: stubLlm(respond(files), []), provider: 'enterprise', model: 'audit-fixture', store })
  const tools = createToolCaller({ tools: server })
  const state = newTaskState({ task: store.newTaskId(), sessionId: 'S-real', text: '用余额表和序时账填写应收账款底稿，期间2025年',
    files: [{ file: files.workpaper, name: '应收账款底稿.xlsx' }, { file: files.balance, name: '科目余额表2025.xlsx' }, { file: files.journal, name: '序时账2025.xlsx' }] })
  store.save(state)
  const runner = new TaskRunner({ state, store, tools, model, cards, notify, config: { samples: 1, recompute: true, maxAttempts: 3, maxReidentify: 2, trivialThreshold: '0' } })
  await runner.start()

  const events = notifications.filter(n => n.method === 'task.event').map(n => n.params)
  return { project, server, tools, state, events, cards: notifications.filter(n => n.method === 'card.opened').map(n => n.params.card) }
}

describe('编排插件 + 真实审计工具', { skip: !ready && 'Python 缺少 duckdb 或 openpyxl' }, () => {
  test('账龄和前五名：从解析到写入回读全部跑通', async () => {
    const { project, server, tools, state, events } = await runTask('plain')
    const failedTools = events.filter(e => e.type === 'tool.finished' && !e.data.ok)
    assert.deepEqual(failedTools, [], '没有工具调用失败')
    const finished = events.filter(e => e.type === 'task.finished').at(-1)?.data
    assert.equal(finished?.status, 'completed', JSON.stringify(events.filter(e => e.type === 'task.blocked').map(e => e.data)))
    const checks = events.filter(e => e.type === 'check.result').map(e => e.data)
    assert.deepEqual(checks.filter(c => !c.passed), [], '全部核对通过')
    assert.ok(['control', 'compare', 'conservation', 'readback', 'crossFoot'].every(name => checks.some(c => c.check === name)))

    const outputs = events.filter(e => e.type === 'output.ready').map(e => e.data)
    assert.deepEqual(outputs.map(o => o.kind), ['workpaper', 'report'])
    assert.equal(outputs[0].file, `输出/${state.task}/应收账款底稿-填写成果.xlsx`)
    const read = spawnSync(python, ['-c', `import openpyxl, json, sys
ws = openpyxl.load_workbook(sys.argv[1], data_only=True)['应收账款']
print(json.dumps([[ws['B%d' % r].value for r in range(7, 12)], [ws['B%d' % r].value for r in range(15, 20)], ws['C20'].value], ensure_ascii=False))`, path.join(project, outputs[0].file)], { encoding: 'utf8' })
    assert.equal(read.status, 0, read.stderr)
    assert.deepEqual(JSON.parse(read.stdout), [[1200000, 435000, 150000, 50000, 1835000], ['甲公司', '乙公司', '丙公司', '戊公司', '丁公司'], 1635000])

    // 宿主经 audit/tool 用的两个工具，按 fill_apply 的产出路径查
    const trace = await tools.call('trace_cell', { output: outputs[0].file, cell: '应收账款!B7' })
    assert.equal(trace.data.value, '1200000')
    assert.equal(trace.data.source.table, 'D-002')
    const plan = server.calls.find(c => c.tool === 'fill_apply').args.plan
    const preview = await tools.call('fill_preview', { plan, range: '应收账款!B15:C15' })
    assert.deepEqual(preview.data.cells.map(c => [c.cell, c.value]), [['应收账款!B15', '甲公司'], ['应收账款!C15', '500000']])
  })

  test('序时账有无法解析的值：追问卡默认排除该行，确认后继续', async () => {
    const { events, cards } = await runTask('invalid', { invalid: true })
    const question = cards.find(c => c.kind === 'question')
    assert.equal(question.body.error.code, 'DATA_INVALID_VALUES')
    assert.equal(question.body.error.detail.invalid[0].samples[0].value, '12万')
    assert.equal(events.filter(e => e.type === 'task.finished').at(-1)?.data.status, 'completed')
    assert.deepEqual(events.filter(e => e.type === 'check.result' && !e.data.passed).map(e => e.data), [])
  })
})
