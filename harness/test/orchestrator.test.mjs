// 编排插件端到端测试：真实的 Harness 进程 + 配置层 + 桥接插件 + 编排插件 + 假审计工具服务（MCP）+ 假模型。
// 场景与 orchestrator-flow.test.mjs 相同（scenarios/receivables.mjs）。
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { fakeModel } from './fake-model.mjs'
import { startHarness } from './client.mjs'
import { FILES, PROMPT, R5, R6, createScenario } from './scenarios/receivables.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-orch-e2e-'))
after(() => fs.rmSync(scratch, { recursive: true, force: true }))

const textOf = content => typeof content === 'string' ? content : (content ?? []).map(part => part.text ?? '').join('')

/** 假模型：编排节点按场景回答；对话第一轮调用 audit_task_start，看到工具结果后回一句话。 */
function router(scenario, seen) {
  return (body) => {
    const system = textOf(body.messages.find(m => m.role === 'system')?.content)
    const node = system.match(/【编排节点:(\w+)】/)?.[1]
    if (node) {
      seen.push({ node, body })
      const out = scenario.respond(node, JSON.parse(textOf(body.messages.at(-1).content)))
      return out.submit !== undefined ? { tools: [{ name: 'submit', args: out.submit }] } : { text: out.text }
    }
    seen.push({ node: 'chat', body })
    if (body.messages.at(-1).role === 'tool') return { text: '已登记底稿任务，正在后台填写，需要确认的地方会出卡片。' }
    return { tools: [{ name: 'audit_task_start', args: { text: PROMPT, files: Object.values(FILES).map(f => f.file) } }] }
  }
}

async function open({ dataDir, project, options = {}, seen = [] }) {
  const scenario = createScenario(options)
  const model = await fakeModel({ respond: router(scenario, seen) })
  const harness = startHarness({
    projectRoot: project, dataDir,
    baseURL: model.baseURL, apiKey: 'sk-test-only', model: 'audit-fixture',
    patches: [path.join(here, 'plugins', 'fake-tools.patch.yml')],
    env: {
      FAKE_TOOLS_SCENARIO: path.join(here, 'scenarios', 'receivables.mjs'),
      FAKE_TOOLS_OPTIONS: JSON.stringify(options),
      FAKE_TOOLS_LOG: path.join(dataDir, 'tools.log'),
      FAKE_TOOLS_STATE: path.join(dataDir, 'tools-state.json'),
      AUDIT_SEMANTICS_SAMPLES: '1',
    },
  })
  await harness.request('initialize', harness.launch.initialize)
  return { harness, model, seen }
}

/** 按卡片类型自动回答；answers[kind] 为 null 时不回答。 */
function answerCards(harness, answers = {}) {
  const done = new Set()
  const timer = setInterval(() => {
    for (const n of harness.notifications) {
      if (n.method !== 'card.opened' || done.has(n.params.card.card)) continue
      const card = n.params.card
      if (card.kind in answers && answers[card.kind] === null) continue
      done.add(card.card)
      if (!card.blocking && card.kind === 'result_summary') continue
      harness.request('card/answer', { card: card.card, ...(answers[card.kind] ?? { action: card.defaultAction ?? 'confirm' }) }).catch(() => {})
    }
  }, 20)
  return () => clearInterval(timer)
}

const taskEvents = (harness, task) => harness.notifications.filter(n => n.method === 'task.event' && (!task || n.params.task === task)).map(n => n.params)
const finishedEvent = (harness, task) => harness.waitFor(n => n.method === 'task.event' && n.params.type === 'task.finished' && (!task || n.params.task === task), 60000, 'task.finished')

describe('编排插件（真实 Harness）', () => {
  test('对话中登记底稿任务，后台跑完回放样例的流程', async () => {
    const dataDir = fs.mkdtempSync(path.join(scratch, 'data-'))
    const project = fs.mkdtempSync(path.join(scratch, 'project-'))
    const { harness, model, seen } = await open({ dataDir, project })
    const stop = answerCards(harness)
    try {
      const sessionId = 'S-e2e1'
      await harness.request('session/prompt', { sessionId, contentBlocks: [{ type: 'text', text: PROMPT }] })
      const finished = await finishedEvent(harness)
      assert.equal(finished.params.data.status, 'completed', harness.stderr().slice(-3000))
      const task = finished.params.task
      assert.equal(finished.params.sessionId, sessionId)

      // 模型看到的工具：能登记任务、能用模型可见的审计工具；看不到编排和宿主专用的工具
      const chat = seen.find(s => s.node === 'chat').body
      const names = (chat.tools ?? []).map(t => t.function?.name ?? t.name)
      assert.ok(names.includes('audit_task_start'))
      assert.ok(names.includes('mcp__audit__data_profile'))
      for (const hidden of ['mcp__audit__workpaper_parse', 'mcp__audit__fill_apply', 'mcp__audit__check_control', 'mcp__audit__trace_cell']) assert.ok(!names.includes(hidden), hidden)

      // 编排节点：每个节点一次干净的单轮请求，按角色设参，结果经 submit 工具提交
      const basis = seen.find(s => s.node === 'basis').body
      assert.equal(basis.messages.length, 2)
      assert.equal(basis.temperature, 0.2)
      assert.deepEqual((basis.tools ?? []).map(t => t.function?.name ?? t.name), ['submit'])
      assert.equal(seen.find(s => s.node === 'understand').body.temperature, 0)

      // 流程事件
      const events = taskEvents(harness, task)
      assert.deepEqual(events.filter(e => e.type === 'stage.changed').map(e => e.data.stage), ['understand', 'workpaper', 'data', 'basis', 'compute', 'fill', 'notes', 'review'])
      assert.equal(events[0].type, 'task.created')
      assert.equal(events[0].data.text, PROMPT)
      assert.ok(events.every(e => e.sessionId === sessionId && typeof e.ts === 'string'))
      assert.deepEqual(events.filter(e => e.type === 'node.retry').map(e => [e.data.region, e.data.attempt]), [[R5, 2]])

      // 卡片：带 task；关闭通知也带 task
      const opened = harness.notifications.filter(n => n.method === 'card.opened').map(n => n.params.card)
      assert.deepEqual(opened.map(c => c.kind), ['workpaper_understanding', 'basis_confirmation', 'write_confirmation', 'result_summary'])
      assert.ok(opened.every(c => c.task === task))
      const closed = harness.notifications.filter(n => n.method === 'card.closed').map(n => n.params)
      assert.equal(closed.length, 3)
      assert.ok(closed.every(c => c.task === task && c.answer))

      // 快照、列表
      const snapshot = await harness.request('task/get', { task })
      assert.deepEqual(snapshot.regions.filter(r => r.region !== 'W-003#R7').map(r => [r.region, r.state, r.attempt]), [[R5, 'written', 2], [R6, 'written', 1]])
      // 区域覆盖层要用的字段
      const r5 = snapshot.regions.find(r => r.region === R5)
      assert.equal(r5.range, '应收账款!A5:E11')
      assert.equal(r5.type, 'fixed_table')
      assert.equal(typeof r5.purpose, 'string')
      assert.deepEqual(r5.headerRows, [5, 6])
      assert.deepEqual(r5.totals, [11])
      assert.ok(Array.isArray(r5.manual))
      assert.deepEqual(snapshot.outputs, ['O-0001', 'O-0002'])
      assert.deepEqual(snapshot.openCards, [opened.at(-1).card])
      const list = await harness.request('task/list', {})
      assert.deepEqual(list.map(t => [t.task, t.status]), [[task, 'completed']])

      // 编号：宿主从同一个计数取号
      assert.deepEqual(await harness.request('ids/allocate', { prefix: 'C' }), { id: 'C-005' })
      assert.deepEqual(await harness.request('ids/allocate', { prefix: 'O' }), { id: 'O-0003' })

      // 宿主专用工具：经 audit/tool 调用；编排专用工具不对宿主开放
      const trace = await harness.request('audit/tool', { name: 'trace_cell', arguments: { output: '输出/x.xlsx', cell: '应收账款!C7' } })
      assert.equal(trace.ok, true)
      assert.equal(trace.data.cell, '应收账款!C7')
      await assert.rejects(harness.request('audit/tool', { name: 'fill_apply', arguments: {} }), /not a host tool/)

      // 写入工具收到的参数
      const toolLog = fs.readFileSync(path.join(dataDir, 'tools.log'), 'utf8').trim().split('\n').map(JSON.parse)
      const apply = toolLog.find(c => c.tool === 'fill_apply')
      assert.equal(apply.args.approvedCard, opened.find(c => c.kind === 'write_confirmation').card)
      assert.equal(apply.args.task, task)

      // 对话回复
      const reply = harness.events(sessionId).filter(e => e.type === 'assistant/message').at(-1)
      assert.match(textOf(reply.data.message.content), /已登记底稿任务/)
    } finally {
      stop()
      await harness.stop()
      await model.close()
    }
  })

  test('宿主直接提交任务；Harness 被强行结束后续跑，已完成的节点不重做', async () => {
    const dataDir = fs.mkdtempSync(path.join(scratch, 'data-'))
    const project = fs.mkdtempSync(path.join(scratch, 'project-'))
    const seen = []
    let { harness, model } = await open({ dataDir, project, seen })
    let stop = answerCards(harness, { basis_confirmation: null })
    let task
    let oldCard
    try {
      ;({ task } = await harness.request('task/create', { sessionId: 'S-e2e2', text: PROMPT, files: Object.values(FILES), message: 'M-0001' }))
      const created = await harness.waitFor(n => n.method === 'task.event' && n.params.type === 'task.created')
      assert.equal(created.params.data.message, 'M-0001')
      const pending = await harness.waitFor(n => n.method === 'card.opened' && n.params.card.kind === 'basis_confirmation', 60000, 'basis card')
      oldCard = pending.params.card.card
      stop()
      harness.child.kill('SIGKILL')
      await harness.exited
      await model.close()
    } catch (error) {
      stop()
      await harness.stop()
      await model.close()
      throw error
    }

    const before = seen.filter(s => s.node === 'understand' || s.node === 'region_semantics').length
    ;({ harness, model } = await open({ dataDir, project, seen }))
    stop = answerCards(harness)
    try {
      const list = await harness.request('task/list', {})
      assert.deepEqual(list.map(t => [t.task, t.status]), [[task, 'paused']])
      assert.deepEqual(await harness.request('task/resume', { task }), { resumed: true })
      const finished = await finishedEvent(harness, task)
      assert.equal(finished.params.data.status, 'completed', JSON.stringify(taskEvents(harness, task).filter(e => e.type === 'task.blocked')) + harness.stderr().slice(-3000))
      const withdrawn = harness.notifications.find(n => n.method === 'card.closed' && n.params.card === oldCard)
      assert.equal(withdrawn?.params.withdrawn, true)
      const reopened = harness.notifications.find(n => n.method === 'card.opened' && n.params.card.kind === 'basis_confirmation').params.card
      assert.notEqual(reopened.card, oldCard)
      assert.equal(seen.filter(s => s.node === 'understand' || s.node === 'region_semantics').length, before, '需求理解和区域语义不应重做')
      // 续跑从中断处的阶段往后走，不再回到前面的阶段
      const stages = taskEvents(harness, task).filter(e => e.type === 'stage.changed').map(e => e.data.stage)
      assert.deepEqual(stages.slice(-3), ['fill', 'notes', 'review'])
      assert.ok(!stages.some(s => ['understand', 'workpaper', 'data', 'basis'].includes(s)), stages.join())
    } finally {
      stop()
      await harness.stop()
      await model.close()
    }
  })

  test('正常退出：进行中的任务暂停并通知宿主；继续时发 task.resumed', async () => {
    const dataDir = fs.mkdtempSync(path.join(scratch, 'data-'))
    const project = fs.mkdtempSync(path.join(scratch, 'project-'))
    let { harness, model } = await open({ dataDir, project })
    let stop = answerCards(harness, { basis_confirmation: null })
    let task
    try {
      ;({ task } = await harness.request('task/create', { sessionId: 'S-e2e4', text: PROMPT, files: Object.values(FILES) }))
      await harness.waitFor(n => n.method === 'card.opened' && n.params.card.kind === 'basis_confirmation', 60000, 'basis card')
    } finally {
      stop()
      await harness.stop()
      await model.close()
    }
    const paused = taskEvents(harness, task).filter(e => e.type === 'task.blocked')
    assert.equal(paused.length, 1)
    assert.equal(paused[0].data.paused, true)
    assert.equal(paused[0].data.suggest, '继续任务')

    ;({ harness, model } = await open({ dataDir, project }))
    stop = answerCards(harness)
    try {
      assert.deepEqual((await harness.request('task/list', {})).map(t => [t.task, t.status]), [[task, 'paused']])
      await harness.request('task/resume', { task })
      const resumed = await harness.waitFor(n => n.method === 'task.event' && n.params.type === 'task.resumed', 10000, 'task.resumed')
      assert.equal(resumed.params.data.from, 'paused')
      assert.equal(resumed.params.data.stage, 'compute')
      const finished = await finishedEvent(harness, task)
      assert.equal(finished.params.data.status, 'completed')
    } finally {
      stop()
      await harness.stop()
      await model.close()
    }
  })

  test('取消任务：等待中的卡片撤回；停止对话回复不影响后台任务', async () => {
    const dataDir = fs.mkdtempSync(path.join(scratch, 'data-'))
    const project = fs.mkdtempSync(path.join(scratch, 'project-'))
    const { harness, model } = await open({ dataDir, project })
    try {
      const { task } = await harness.request('task/create', { sessionId: 'S-e2e3', text: PROMPT, files: Object.values(FILES).map(f => f.file) })
      const card = await harness.waitFor(n => n.method === 'card.opened' && n.params.card.task === task, 60000, 'card')
      await harness.request('session/cancel', { sessionId: 'S-e2e3' }).catch(() => {})
      assert.equal((await harness.request('task/get', { task })).status, 'running')
      assert.deepEqual(await harness.request('task/cancel', { task }), { cancelled: true })
      const finished = await finishedEvent(harness, task)
      assert.equal(finished.params.data.status, 'cancelled')
      assert.ok(harness.notifications.some(n => n.method === 'card.closed' && n.params.card === card.params.card.card && n.params.withdrawn))
    } finally {
      await harness.stop()
      await model.close()
    }
  })
})
