// 底稿任务经宿主走一遍：真实的 Harness + 桥接插件 + 编排插件 + 假审计工具服务（harness/test/scenarios/receivables.mjs）+ 假模型。
// 对话中登记任务 → 流程事件补 seq → 卡片经 card.answer 回到插件 → 完成；表格叠加、来源、结果表；退出后从检查点继续。
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { fakeModel } from '../../harness/test/fake-model.mjs'
import { FILES, PROMPT, R5, createScenario } from '../../harness/test/scenarios/receivables.mjs'
import { AppHost } from '../host.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const harnessTest = path.join(here, '..', '..', 'harness', 'test')
const python = process.env.AUDIT_TEST_PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3')
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-host-task-'))
after(() => fs.rmSync(scratch, { recursive: true, force: true }))

const textOf = content => typeof content === 'string' ? content : (content ?? []).map(part => part.text ?? '').join('')

/** 假模型：编排节点按场景回答；对话里调用 audit_task_start，看到工具结果后回一句话。 */
function router(scenario) {
  return (body) => {
    const system = textOf(body.messages.find(m => m.role === 'system')?.content)
    const node = system.match(/【编排节点:(\w+)】/)?.[1]
    if (node) {
      const out = scenario.respond(node, JSON.parse(textOf(body.messages.at(-1).content)))
      return out.submit !== undefined ? { tools: [{ name: 'submit', args: out.submit }] } : { text: out.text }
    }
    if (body.messages.at(-1).role === 'tool') return { text: '已登记底稿任务，正在后台填写。' }
    return { tools: [{ name: 'audit_task_start', args: { text: PROMPT, files: Object.values(FILES).map(f => f.file) } }] }
  }
}

function recorder(host) {
  const events = []
  const waiters = []
  host.subscribe((e) => {
    events.push(e)
    for (const w of [...waiters]) if (w.match(e)) {
      waiters.splice(waiters.indexOf(w), 1)
      w.resolve(e)
    }
  })
  return {
    events,
    wait(match, label = 'event', ms = 60000) {
      const seen = events.find(match)
      if (seen) return Promise.resolve(seen)
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timed out waiting for ' + label)), ms)
        waiters.push({ match, resolve: (e) => { clearTimeout(timer); resolve(e) } })
      })
    },
  }
}

/** 按卡片类型自动回答；hold 里的类型不答。 */
function autoAnswer(host, rec, hold = []) {
  const done = new Set()
  const timer = setInterval(() => {
    for (const e of rec.events) {
      if (e.type !== 'card.opened' || done.has(e.data.card) || hold.includes(e.data.kind) || e.data.kind === 'result_summary') continue
      done.add(e.data.card)
      host.dispatch('card.answer', { card: e.data.card, action: e.data.defaultAction ?? 'confirm' }).catch(() => {})
    }
  }, 20)
  return () => clearInterval(timer)
}

async function openHost(dataDir, model) {
  const toolsState = path.join(dataDir, 'tools-state.json')
  const host = new AppHost({
    dataDir, python,
    patches: [path.join(harnessTest, 'plugins', 'fake-tools.patch.yml')],
    harnessEnv: {
      FAKE_TOOLS_SCENARIO: path.join(harnessTest, 'scenarios', 'receivables.mjs'),
      FAKE_TOOLS_STATE: toolsState,
      AUDIT_SEMANTICS_SAMPLES: '1',
    },
  })
  const rec = recorder(host)
  const bare = model.baseURL.replace(/\/v1$/, '')
  if (!host.modelReady()) {
    assert.equal((await host.dispatch('connection.test', { baseUrl: bare, key: 'sk-test-only' })).ok, true)
    await host.dispatch('settings.save', { baseUrl: bare, model: 'audit-fixture' })
    await host.dispatch('secret.save', { key: 'model', value: 'sk-test-only' })
  }
  return { host, rec }
}

/** 场景里的资料编号是固定的：直接登记进项目（真实流程由 files.add 按内容哈希编号）。底稿做一张真表，sheet.view 要读。 */
function seedFiles(host, project) {
  const folder = host.store.project(project).folder
  fs.mkdirSync(path.join(folder, '资料'), { recursive: true })
  const wp = path.join(folder, '资料', FILES.workpaper.name)
  execFileSync(python, ['-c', `
import openpyxl
wb = openpyxl.Workbook(); ws = wb.active; ws.title = '应收账款'
ws['A5'] = '账龄'; ws['C5'] = '期末余额'; ws['D5'] = '占比'
for i, t in enumerate(['1年以内', '1-2年', '2-3年', '3年以上']): ws.cell(7 + i, 1, t)
ws['A11'] = '合计'; ws['C11'] = '=SUM(C7:C10)'
ws['C7'].number_format = '#,##0.00'
wb.save(r'''${wp}''')`])
  const state = host.store.state(project)
  for (const f of Object.values(FILES)) state.files.push({ file: f.file, name: f.name, path: '资料/' + f.name, kind: /底稿/.test(f.name) ? 'workpaper' : 'data', sizeBytes: 0, addedAt: new Date().toISOString() })
  host.saveState(project)
}

describe('底稿任务（编排插件）', () => {
  test('对话中登记任务：流程事件、卡片、快照、表格叠加、来源、结果表', async () => {
    const model = await fakeModel({ respond: router(createScenario()) })
    const dataDir = fs.mkdtempSync(path.join(scratch, 'data-'))
    const { host, rec } = await openHost(dataDir, model)
    const stop = autoAnswer(host, rec)
    try {
      const project = (await host.dispatch('project.create', { name: '应收', folder: path.join(scratch, '应收') })).project
      await host.dispatch('project.open', { project })
      seedFiles(host, project)
      const session = (await host.dispatch('session.create', { project })).session
      const { message } = await host.dispatch('message.send', { session, text: PROMPT })

      const finished = await rec.wait(e => e.type === 'task.finished', 'task.finished')
      assert.equal(finished.data.status, 'completed')
      const task = finished.task
      const events = rec.events.filter(e => e.session === session)
      // seq 在对话内严格递增，任务事件带 task
      events.forEach((e, i) => i && assert.ok(e.seq > events[i - 1].seq))
      const created = events.find(e => e.type === 'task.created')
      assert.equal(created.task, task)
      assert.equal(created.data.project, project)
      assert.equal(created.data.message, message)
      assert.equal(created.data.files.find(f => f.file === FILES.workpaper.file).name, FILES.workpaper.name)
      assert.deepEqual(events.filter(e => e.type === 'stage.changed').map(e => e.data.stage), ['understand', 'workpaper', 'data', 'basis', 'compute', 'fill', 'notes', 'review'])
      // 编排插件调审计工具也出工具事件，带区域
      assert.ok(events.some(e => e.type === 'tool.started' && e.task === task && e.data.region === R5))
      // 卡片：编号来自插件；关闭事件带 task
      const cards = events.filter(e => e.type === 'card.opened')
      assert.deepEqual(cards.map(e => e.data.kind), ['workpaper_understanding', 'basis_confirmation', 'write_confirmation', 'result_summary'])
      const closed = events.filter(e => e.type === 'card.closed')
      assert.equal(closed.length, 3)
      assert.ok(closed.every(e => e.task === task && e.data.answer))

      // 产出登记进项目，带任务；之后宿主取号接着插件的计数
      const outputs = (await host.dispatch('outputs.list', { project })).outputs
      assert.deepEqual(outputs.map(o => [o.output, o.task]).sort(), [['O-0001', task], ['O-0002', task]])
      assert.equal(await host.allocate(project, 'O'), 'O-0003')
      assert.equal(await host.allocate(project, 'C'), 'C-005')

      // 快照（插件的）和列表
      const snap = await host.dispatch('task.get', { task })
      assert.equal(snap.status, 'completed')
      assert.equal(snap.lastSeq, events.filter(e => e.task === task).at(-1).seq)
      assert.equal(snap.regions.find(r => r.region === R5).state, 'written')
      const list = await host.dispatch('task.list', { project })
      assert.deepEqual(list.tasks.map(t => [t.task, t.status]), [[task, 'completed']])
      const s = await host.dispatch('session.get', { session })
      assert.equal(s.tasks[0].task, task)
      assert.equal(s.tasks[0].layout, undefined)

      // 表格叠加：区域来自底稿理解卡，状态来自 region.state；写入计划来自 fill_preview
      const regions = await host.dispatch('sheet.view', { file: FILES.workpaper.file, sheet: '应收账款', overlay: { workpaper: 'W-003' } })
      assert.deepEqual(regions.overlay.regions.map(r => [r.region, r.range, r.state]), [[R5, 'A5:E11', 'written'], ['W-003#R6', 'A15:D20', 'written']])
      assert.deepEqual(regions.overlay.regions[0].manual, ['E7:E10'])
      const plan = await host.dispatch('sheet.view', { file: FILES.workpaper.file, sheet: '应收账款', overlay: { workpaper: 'W-003', plan: 'FP-001' } })
      assert.deepEqual(plan.cells.find(c => c.cell === 'C7').plan, { value: '1200000.00', text: '1,200,000.00', from: 'R-014#1', overwrite: false })

      // 单元格来源、结果表：经 audit/tool
      const trace = await host.dispatch('cell.trace', { output: 'O-0001', cell: '应收账款!C7' })
      assert.equal(trace.from.result, 'R-014')
      const table = await host.dispatch('table.view', { table: 'R-012', offset: 0, limit: 50 })
      assert.equal(table.table, 'R-012')
      await assert.rejects(host.dispatch('task.get', { task: 'T-ffff' }), e => e.code === 'REF_TASK')
    } finally {
      stop()
      await host.close()
      await model.close()
    }
  })

  test('应用退出时任务中断：重开后显示卡住、未答的卡撤回，从检查点继续跑完', async () => {
    const model = await fakeModel({ respond: router(createScenario()) })
    const dataDir = fs.mkdtempSync(path.join(scratch, 'data-'))
    let { host, rec } = await openHost(dataDir, model)
    let stop = autoAnswer(host, rec, ['basis_confirmation'])
    let project, session, task, held
    try {
      project = (await host.dispatch('project.create', { name: '应收', folder: path.join(scratch, '应收-续跑') })).project
      await host.dispatch('project.open', { project })
      seedFiles(host, project)
      session = (await host.dispatch('session.create', { project })).session
      // 前端在底稿上直接点“开始填写”
      task = (await host.dispatch('task.create', { session, text: PROMPT, files: Object.values(FILES).map(f => f.file) })).task
      held = await rec.wait(e => e.type === 'card.opened' && e.data.kind === 'basis_confirmation', 'basis card')
      assert.equal(held.task, task)
    } finally {
      stop()
      await host.close()
    }
    assert.equal(rec.events.find(e => e.type === 'card.closed' && e.data.card === held.data.card)?.data.withdrawn, true)
    assert.equal(rec.events.find(e => e.type === 'task.blocked')?.data.suggest, '继续任务')

    ;({ host, rec } = await openHost(dataDir, model))
    stop = autoAnswer(host, rec)
    try {
      await host.dispatch('project.open', { project })
      assert.equal((await host.dispatch('task.get', { task })).status, 'blocked')
      assert.equal((await host.dispatch('session.get', { session })).openCards.length, 0)
      assert.deepEqual(await host.dispatch('task.resume', { task }), { resumed: true })
      const finished = await rec.wait(e => e.type === 'task.finished', 'task.finished')
      assert.equal(finished.data.status, 'completed')
      // 续跑出的新卡用新编号
      const again = rec.events.find(e => e.type === 'card.opened' && e.data.kind === 'basis_confirmation')
      assert.notEqual(again.data.card, held.data.card)
      const log = (await host.dispatch('session.events', { session, after: 0 })).events
      log.forEach((e, i) => i && assert.ok(e.seq > log[i - 1].seq))
      assert.equal((await host.dispatch('task.list', { project })).tasks[0].status, 'completed')
    } finally {
      stop()
      await host.close()
      await model.close()
    }
  })
})
