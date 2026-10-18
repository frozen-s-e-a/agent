// 编排流程测试（进程内）：真实的 flow、model、tools、store；模型、工具注册表和桥接插件用替身。
// 场景见 scenarios/receivables.mjs，与《接口约定》第六节的事件回放样例相同。
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { mergeSamples } from '../plugins/orchestrator/flow.mjs'
import { createModel, fitInput } from '../plugins/orchestrator/model.mjs'
import { NODES } from '../plugins/orchestrator/prompts.mjs'
import { validate } from '../plugins/orchestrator/schema.mjs'
import { autoAnswer, makeKit } from './orchestrator-kit.mjs'
import { R5, R6 } from './scenarios/receivables.mjs'

const REPLAY = fileURLToPath(new URL('../../docs/实现设计/样例/事件回放-底稿填写.json', import.meta.url))
const types = (events, type) => events.filter(e => e.type === type)
const checks = (events, check, region) => types(events, 'check.result').filter(e => e.data.check === check && (region === undefined || e.data.region === region)).map(e => e.data)
const finished = events => types(events, 'task.finished').at(-1)?.data

describe('回放样例的场景', () => {
  test('完整跑通：阶段、重做、卡片、产出与样例一致', async () => {
    const kit = makeKit()
    autoAnswer(kit.cards)
    const runner = kit.create()
    await runner.start()
    const events = kit.events(runner.state.task)

    assert.deepEqual(types(events, 'stage.changed').map(e => e.data.stage), ['understand', 'workpaper', 'data', 'basis', 'compute', 'fill', 'notes', 'review'])
    assert.deepEqual(kit.cardsOpened().map(c => c.kind), ['workpaper_understanding', 'basis_confirmation', 'write_confirmation', 'result_summary'])
    // 账龄区域：控制数第一次差 -500.00，带原因重做一次后通过；前五名区域一次通过
    assert.deepEqual(checks(events, 'control', R5).map(c => [c.attempt, c.passed]), [[1, false], [2, true]])
    assert.equal(checks(events, 'control', R5)[0].detail.diff, '-500.00')
    const retry = types(events, 'node.retry')
    assert.equal(retry.length, 1)
    assert.deepEqual([retry[0].data.node, retry[0].data.region, retry[0].data.attempt], ['basis', R5, 2])
    assert.match(retry[0].data.reason, /控制数差额 -500\.00/)
    assert.deepEqual(checks(events, 'control', R6).map(c => [c.attempt, c.passed]), [[1, true]])
    // 口径确认卡不阻塞：账龄区域等卡时，前五名区域照常计算
    const basisCard = kit.cardsOpened().find(c => c.kind === 'basis_confirmation')
    assert.equal(basisCard.blocking, false)
    assert.equal(basisCard.body.questions[0].region, R5)
    assert.deepEqual(basisCard.body.questions[0].options.map(o => o.impact), ['1年以内 1,199,500.00；1-2年 435,000.00；2-3年 150,000.00；…', '1年以内 1,150,000.00；1-2年 485,000.00；2-3年 150,000.00；…'])
    // 写入确认之后才写
    const write = kit.cardsOpened().find(c => c.kind === 'write_confirmation')
    const apply = kit.toolCalls.find(c => c.tool === 'fill_apply')
    assert.equal(apply.args.approvedCard, write.card)
    assert.deepEqual(types(events, 'output.ready').map(e => [e.data.output, e.data.kind]), [['O-0001', 'workpaper'], ['O-0002', 'report']])
    const result = kit.cardsOpened().at(-1)
    assert.deepEqual(result.body.checks, { passed: 18, failed: 0, retried: 1 })
    assert.equal(result.body.manual, 4)
    assert.equal(result.body.notes[0].status, 'suggested')
    assert.equal(finished(events).status, 'completed')
    const snapshot = runner.snapshot()
    assert.deepEqual(snapshot.regions.map(r => [r.region, r.state, r.attempt]), [[R5, 'written', 2], [R6, 'written', 1], ['W-003#R7', 'skipped', 0]])
    assert.deepEqual(snapshot.openCards, [result.card])
    // 编排工具调用也推送工具事件
    assert.equal(types(events, 'tool.started').length, types(events, 'tool.finished').length)
    assert.ok(types(events, 'tool.started').every(e => e.data.system === '审计工具' && e.data.tool.startsWith('mcp__audit__')))
  })

  test('事件和卡片的字段覆盖样例里出现的字段', async () => {
    const replay = JSON.parse(fs.readFileSync(REPLAY, 'utf8'))
    const kit = makeKit()
    autoAnswer(kit.cards)
    await kit.create().start()
    const ours = [...kit.events(), ...kit.notifications.filter(n => n.method.startsWith('card.')).map(n => ({ type: n.method, data: n.method === 'card.opened' ? n.params.card : n.params }))]
    const keys = list => list.reduce((m, e) => { for (const k of Object.keys(e.data)) (m[e.type] ??= new Set()).add(k); return m }, {})
    const mine = keys(ours)
    // 宿主补的字段：task.created 的 project、message（对话里登记的任务）；node.progress 需要工具服务推送进度
    const hostAdds = { 'task.created': ['project', 'message'] }
    for (const [type, fields] of Object.entries(keys(replay.events.filter(e => !e.type.startsWith('message.') && e.type !== 'node.progress')))) {
      assert.ok(mine[type], `缺少事件 ${type}`)
      assert.deepEqual([...fields].filter(k => !mine[type].has(k) && !(hostAdds[type] ?? []).includes(k)), [], `${type} 缺字段`)
    }
    for (const e of replay.events.filter(e => e.type === 'card.opened')) {
      const card = ours.find(o => o.type === 'card.opened' && o.data.kind === e.data.kind).data
      assert.deepEqual(Object.keys(e.data).filter(k => !(k in card)), [], `${e.data.kind} 卡片缺字段`)
      assert.deepEqual(Object.keys(e.data.body).filter(k => !(k in card.body)), [], `${e.data.kind} 卡片 body 缺字段`)
    }
  })
})

describe('检查点与续跑', () => {
  test('进程中断后续跑：已完成的节点不重做，未答的卡撤回并换新编号', async () => {
    const kit = makeKit()
    const runner = kit.create()
    const task = runner.state.task
    const first = runner.start()
    await kit.until(() => kit.cards.openCards().length === 1)
    const oldCard = kit.cards.openCards()[0]
    const understandCalls = kit.modelCalls.filter(c => c.node === 'understand').length
    // 模拟进程退出：丢掉运行中的 runner，从磁盘上的检查点重建
    runner.controller.abort(new (await import('../plugins/orchestrator/flow.mjs')).TaskShutdown())
    await first
    assert.equal(kit.store.load(task).status, 'paused')
    autoAnswer(kit.cards)
    const resumed = kit.resume(task)
    await resumed.start()
    const withdrawn = kit.notifications.filter(n => n.method === 'card.closed' && n.params.card === oldCard)
    assert.ok(withdrawn.some(n => n.params.withdrawn), '旧卡应撤回')
    assert.notEqual(kit.cardsOpened().filter(c => c.kind === 'workpaper_understanding').at(-1).card, oldCard)
    assert.equal(kit.modelCalls.filter(c => c.node === 'understand').length, understandCalls, '需求理解不应重做')
    assert.equal(finished(kit.events(task)).status, 'completed')
  })

  test('取消：等待中的卡片撤回，任务以 cancelled 结束', async () => {
    const kit = makeKit()
    const runner = kit.create()
    const done = runner.start()
    await kit.until(() => kit.cards.openCards().length === 1)
    const card = kit.cards.openCards()[0]
    assert.equal(runner.cancel(), true)
    await done
    assert.ok(kit.notifications.some(n => n.method === 'card.closed' && n.params.card === card && n.params.withdrawn))
    assert.equal(finished(kit.events()).status, 'cancelled')
    assert.equal(kit.store.load(runner.state.task).status, 'cancelled')
  })

  test('模型服务不可用：任务挂起（blocked），服务恢复后续跑完成', async () => {
    let down = true
    const kit = makeKit({ options: { unavailable: node => down && node === 'basis' } })
    autoAnswer(kit.cards)
    const runner = kit.create()
    await runner.start()
    const blocked = types(kit.events(), 'task.blocked')
    assert.equal(blocked.length, 1)
    assert.equal(blocked[0].data.where, 'basis')
    assert.equal(runner.state.status, 'blocked')
    assert.equal(finished(kit.events()), undefined)
    down = false
    await runner.start()
    assert.equal(finished(kit.events()).status, 'completed')
    assert.equal(kit.modelCalls.filter(c => c.node === 'region_semantics').length, 2, '区域语义不应重做')
  })
})

describe('失败矩阵', () => {
  test('区域语义校验不通过：带具体错误重新识别', async () => {
    const kit = makeKit({ options: { semanticsFailures: 1 } })
    autoAnswer(kit.cards)
    const runner = kit.create()
    await runner.start()
    const events = kit.events()
    assert.deepEqual(checks(events, 'semantics', R5).map(c => [c.attempt, c.passed]), [[1, false], [2, true]])
    const retry = types(events, 'node.retry').find(e => e.data.node === 'region_semantics')
    assert.match(retry.data.reason, /应收账款!C5/)
    const second = kit.modelCalls.filter(c => c.node === 'region_semantics' && c.input.region.id === R5)[1]
    assert.match(second.input.lastFailure, /期初余额/)
    assert.equal(finished(events).status, 'completed')
  })

  test('重做用尽仍有差异：出差异卡；接受差异后继续完成', async () => {
    const kit = makeKit({ options: { alwaysBuggy: true } })
    autoAnswer(kit.cards, { discrepancy: { action: 'accept_with_note', note: '差额为 12 月 31 日未入账的一笔，已另行记录' } })
    const runner = kit.create()
    await runner.start()
    const events = kit.events()
    assert.deepEqual(checks(events, 'control', R5).map(c => c.passed), [false, false, false])
    const card = kit.cardsOpened().find(c => c.kind === 'discrepancy')
    assert.deepEqual([card.body.region, card.body.diff, card.body.left.value, card.body.right.value], [R5, '-500.00', '1834500.00', '1835000.00'])
    assert.deepEqual(card.actions, ['accept_with_note', 'fix_data', 'stop'])
    assert.ok(runner.state.anchors.some(a => a.text.includes('已另行记录')))
    assert.equal(runner.snapshot().regions.find(r => r.region === R5).state, 'written')
  })

  test('差异卡选择修正资料：该区域阻塞，其他区域照常写入，任务部分完成', async () => {
    const kit = makeKit({ options: { alwaysBuggy: true } })
    autoAnswer(kit.cards, { discrepancy: { action: 'fix_data' } })
    const runner = kit.create()
    await runner.start()
    const regions = Object.fromEntries(runner.snapshot().regions.map(r => [r.region, r.state]))
    assert.equal(regions[R5], 'failed')
    assert.equal(regions[R6], 'written')
    assert.equal(finished(kit.events()).status, 'partial')
    assert.deepEqual(kit.cardsOpened().at(-1).body.failed.map(f => f.region), [R5])
  })

  test('差异卡选择停止：任务停止', async () => {
    const kit = makeKit({ options: { alwaysBuggy: true } })
    autoAnswer(kit.cards, { discrepancy: { action: 'stop' } })
    await kit.create().start()
    assert.equal(finished(kit.events()).status, 'cancelled')
  })

  test('双路复算不一致且判断不了：作为口径问题问用户，附两种算法和结果', async () => {
    const kit = makeKit({ options: { compareMismatch: true } })
    autoAnswer(kit.cards)
    await kit.create().start()
    const cards = kit.cardsOpened().filter(c => c.kind === 'basis_confirmation' && c.title.includes('两种算法'))
    assert.equal(cards.length, 2)
    assert.equal(cards[0].body.questions[0].options.length, 2)
    assert.ok(cards[0].body.questions[0].options.every(o => o.impact))
    assert.equal(kit.modelCalls.filter(c => c.node === 'judge').length, 2)
    assert.equal(kit.cardsOpened().at(-1).body.checks.failed, 2, 'compare 最新一次仍不一致，结果卡照实计数')
    assert.equal(finished(kit.events()).status, 'completed')
  })

  test('数据问题：出卡片，直接确认即按建议排除无效值后重新导入', async () => {
    const kit = makeKit({ options: { invalidValues: true } })
    autoAnswer(kit.cards, { question: card => ({ action: 'confirm' }) })
    const runner = kit.create()
    await runner.start()
    const card = kit.cardsOpened().find(c => c.kind === 'question')
    assert.match(card.body.questions[0].text, /无法解析/)
    assert.equal(card.body.questions[0].suggest, 0)
    const imports = kit.toolCalls.filter(c => c.tool === 'data_import' && c.args.candidate.includes('序时账'))
    assert.deepEqual(imports.map(c => !!c.args.excludeInvalid), [false, true])
    assert.equal(finished(kit.events()).status, 'completed')
  })

  test('否定底稿理解：任务停止', async () => {
    const kit = makeKit()
    autoAnswer(kit.cards, { workpaper_understanding: { action: 'reject' } })
    await kit.create().start()
    assert.equal(finished(kit.events()).status, 'cancelled')
    assert.ok(!kit.toolCalls.some(c => c.tool === 'query_run'))
  })

  test('修改底稿理解：改过的区域重新校验，确认后的修改依据记为 user', async () => {
    const kit = makeKit()
    autoAnswer(kit.cards, {
      workpaper_understanding: { action: 'edit', edits: { regions: [{ region: R5, columns: [{ col: 'C', measure: '期末余额', period: '2025-12-31', unit: '元', direction: 'debit' }] }], manual: { add: ['应收账款!D8'] } } },
    })
    const runner = kit.create()
    await runner.start()
    const recheck = kit.toolCalls.filter(c => c.tool === 'workpaper_semantics_check').at(-1)
    assert.deepEqual(recheck.args.regions.map(r => r.region), [R5])
    assert.equal(runner.state.regions[R5].semantics.columns.find(c => c.col === 'C').basis, 'user')
    assert.ok(runner.state.regions[R5].semantics.manual.includes('应收账款!D8'))
  })

  test('格式不合格：把错误回填给模型重做，调用记录写明错误', async () => {
    const kit = makeKit({ options: { badSubmit: true } })
    autoAnswer(kit.cards)
    const runner = kit.create()
    await runner.start()
    const calls = kit.modelCalls.filter(c => c.node === 'understand')
    assert.equal(calls.length, 2)
    assert.ok(calls[1].input.上次输出的问题.some(e => e.includes('deliverables')))
    const log = fs.readFileSync(path.join(kit.store.taskDir(runner.state.task), 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
    assert.deepEqual(log.filter(l => l.node === 'understand').map(l => l.errors.length > 0), [true, false])
    assert.equal(finished(kit.events()).status, 'completed')
  })
})

describe('任务中补充与重跑', () => {
  test('补充的话影响已算好的区域：出卡确认，只重跑这个区域', async () => {
    const kit = makeKit()
    autoAnswer(kit.cards)
    const runner = kit.create()
    await runner.start()
    const basisBefore = kit.modelCalls.filter(c => c.node === 'basis').map(c => c.input.region.id)
    const before = runner.snapshot().regions.find(r => r.region === R6).refs
    const reply = await runner.message('前五名按客户名称合并同一集团')
    assert.deepEqual(reply, { regions: [R6], rerunCard: true })
    await kit.until(() => types(kit.events(), 'task.finished').length === 2)
    const events = kit.events()
    const msg = types(events, 'user.message')[0].data
    assert.deepEqual(msg.regions, [R6])
    const rerun = types(events, 'task.rerun')[0].data
    assert.deepEqual(rerun.scope, { regions: [R6], fromStage: 'basis' })
    assert.ok(before.every(ref => rerun.invalidated.includes(ref)))
    const basisAfter = kit.modelCalls.filter(c => c.node === 'basis').map(c => c.input.region.id).slice(basisBefore.length)
    assert.deepEqual(basisAfter, [R6], '只有前五名区域重新定口径')
    assert.ok(kit.modelCalls.filter(c => c.node === 'basis').at(-1).input.anchors.some(a => a.text.includes('同一集团')))
    const after = runner.snapshot().regions.find(r => r.region === R6)
    assert.equal(after.state, 'written')
    assert.notDeepEqual(after.refs, before)
    assert.equal(kit.cardsOpened().filter(c => c.kind === 'write_confirmation').length, 2, '重跑后写入要重新确认')
    const results = kit.cardsOpened().filter(c => c.kind === 'result_summary')
    assert.equal(results.length, 2)
    assert.ok(kit.notifications.some(n => n.method === 'card.closed' && n.params.card === results[0].card && n.params.withdrawn), '旧的结果卡撤回')
    assert.deepEqual(runner.snapshot().openCards, [results[1].card])
    assert.equal(finished(events).status, 'completed')
  })

  test('补充的话不影响任何区域：只记为锚点', async () => {
    const kit = makeKit()
    autoAnswer(kit.cards)
    const runner = kit.create()
    await runner.start()
    const reply = await runner.message('注意编制人写张三')
    assert.deepEqual(reply.regions, [])
    assert.equal(types(kit.events(), 'task.rerun').length, 0)
  })

  test('task.rerun：从口径阶段重跑指定区域，note 作为用户口径', async () => {
    const kit = makeKit()
    autoAnswer(kit.cards)
    const runner = kit.create()
    await runner.start()
    const result = runner.rerun({ regions: [R5], fromStage: 'basis' }, '账龄改从发票日期起算')
    assert.deepEqual(result, { queued: false })
    await runner.running
    const events = kit.events()
    assert.equal(types(events, 'task.finished').length, 2)
    assert.ok(runner.state.anchors.some(a => a.text === '账龄改从发票日期起算' && a.basis === 'user'))
    const last = kit.modelCalls.filter(c => c.node === 'basis').at(-1)
    assert.equal(last.input.region.id, R5)
    assert.throws(() => runner.rerun({ regions: ['W-999#R1'] }), /unknown region/)
  })

  test('运行中要求重跑：排队，当前一轮跑完后执行', async () => {
    const kit = makeKit()
    autoAnswer(kit.cards, { write_confirmation: null })
    const runner = kit.create()
    const done = runner.start()
    await kit.until(() => kit.cardsOpened().some(c => c.kind === 'write_confirmation'))
    assert.deepEqual(runner.rerun({ regions: [R6], fromStage: 'basis' }, '重新取前五名'), { queued: true })
    kit.cards.answer(kit.cards.openCards()[0], { action: 'confirm' })
    await kit.until(() => kit.cardsOpened().filter(c => c.kind === 'write_confirmation').length === 2)
    kit.cards.answer(kit.cards.openCards().find(id => kit.cardsOpened().find(c => c.card === id)?.kind === 'write_confirmation'), { action: 'confirm' })
    await done
    assert.equal(types(kit.events(), 'task.rerun').length, 1)
    assert.equal(finished(kit.events()).status, 'completed')
  })
})

describe('小件', () => {
  test('多次采样不一致的列进入待确认', () => {
    const base = { region: R5, type: 'fixed_table', purpose: 'x', manual: [], uncertain: [], columns: [{ col: 'D', measure: '期初余额', period: '2025-01-01', unit: '元', direction: 'debit', basis: 'template', confidence: 'high' }] }
    const other = structuredClone(base)
    other.columns[0].period = '2024-12-31'
    const merged = mergeSamples([base, other, base])
    assert.equal(merged.uncertain.length, 1)
    assert.equal(merged.uncertain[0].suggest, 0)
    assert.equal(merged.columns[0].confidence, 'low')
    assert.deepEqual(mergeSamples([base, base, base]).uncertain, [])
  })

  test('结构校验拦下真实模型常见的写法：人工格写成说明、资料类型写成节点名', () => {
    const semantics = NODES.region_semantics.schema
    const base = { region: R5, type: 'fixed_table', purpose: 'x', columns: [], uncertain: [] }
    assert.deepEqual(validate(semantics, { ...base, manual: ['应收账款!E7', '应收账款!C7:C10', 'E8'] }), [])
    const errors = validate(semantics, { ...base, manual: ['应收账款!A15=1 … A19=5', '审计说明正文由人工撰写'] })
    assert.equal(errors.length, 2)
    assert.match(errors[0], /^\$\.manual\[0\] 格式不对/)
    assert.match(validate(NODES.field_semantics.schema, { kind: 'field_semantics', fields: [{ col: 'A', name: '日期', meaning: 'voucher_date', type: 'date', basis: 'data' }] })[0], /^\$\.kind 只能取/)
  })

  test('输出到上限被截断：说明截断，重做时给到模型的输出上限；区域编号由编排填上', async () => {
    const seen = []
    const llm = {
      async *stream(options) {
        seen.push(options.maxTokens)
        if (seen.length === 1) {
          yield { type: 'reasoning-delta', index: 0, text: '想'.repeat(50) }
          yield { type: 'finish', reason: { kind: 'max-tokens' } }
          return
        }
        yield { type: 'tool-call-delta', index: 0, id: 'c1', name: 'submit', argumentsDelta: JSON.stringify({ ok: true }) }
        yield { type: 'finish', reason: { kind: 'tool-calls' } }
      },
    }
    const records = []
    const model = createModel({ llm, provider: 'p', model: 'm', maxOutput: 12000, store: { appendCall: (_task, record) => records.push(record) } })
    const value = await model.call({ task: 'T', node: 'region_semantics', role: 'extractor', fixed: { region: 'W-001#R1' }, prompt: 'x', version: 'v', input: {}, schema: { type: 'object', required: ['ok'], properties: { ok: { type: 'boolean' } } } })
    assert.deepEqual(value, { ok: true, region: 'W-001#R1' })
    assert.deepEqual(seen, [8000, 12000])
    assert.match(records[0].errors[0], /8000 tokens 上限被截断.*思考用了 50 字/)
    assert.equal(records[0].finish, 'max-tokens')
    // 配置的上限比角色设参小时不超过它
    seen.length = 0
    await createModel({ llm, provider: 'p', model: 'm', maxOutput: 4096 }).call({ task: 'T', node: 'basis', role: 'planner', prompt: 'x', version: 'v', input: {}, schema: { type: 'object' } })
    assert.deepEqual(seen, [4096, 4096])
  })

  test('输入超预算时裁剪数组，固定锚点不动，并记录裁剪', () => {
    const input = { anchors: Array.from({ length: 50 }, (_, i) => ({ text: '用户原话'.repeat(10) + i })), tables: Array.from({ length: 400 }, (_, i) => ({ name: '字段' + i, samples: ['样例值样例值'] })) }
    const { value, trimmed } = fitInput(input, 1500)
    assert.equal(value.anchors.length, 50)
    assert.ok(value.tables.length < 400)
    assert.ok(trimmed.length > 0 && trimmed[0].startsWith('$.tables'))
  })

  test('编号项目内唯一：卡片和产出编号连续分配，重启后继续', () => {
    const kit = makeKit()
    assert.equal(kit.store.allocate('C'), 'C-001')
    assert.equal(kit.store.allocate('C'), 'C-002')
    assert.equal(kit.store.allocate('O'), 'O-0001')
    const again = makeKit({ dir: kit.stateDir })
    assert.equal(again.store.allocate('C'), 'C-003')
  })
})
