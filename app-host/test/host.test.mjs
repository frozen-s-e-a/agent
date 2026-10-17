// 宿主测试：真实的 Harness（固定版本 + 桥接插件 + 审计工具 MCP 服务）+ 假模型。
// 运行：node --test app-host/test/（需要先 cd harness && npm ci；python3 及 pandas、openpyxl）
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { fakeModel } from '../../harness/test/fake-model.mjs'
import { AppHost } from '../host.mjs'
import { createServer } from '../server.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const python = process.env.AUDIT_TEST_PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3')
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-host-'))
after(() => fs.rmSync(scratch, { recursive: true, force: true }))

const SELECT = { name: 'mcp__audit__select_column', args: { folder_path: '资料/余额表.xlsx', should_merge: '是', sheet_keywords: '', columns_to_keep: '科目,期末余额' } }

function makeWorkbook(dir) {
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, '余额表.xlsx')
  execFileSync(python, ['-c', `import pandas as pd; pd.DataFrame({'科目':['1001','1002','1122'],'名称':['库存现金','银行存款','应收账款'],'期末余额':[100.5,2000,35000]}).to_excel(r'''${file}''', index=False)`])
  return file
}

/** 收集宿主推送的事件，等满足条件的那条。 */
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
    of: session => events.filter(e => e.session === session),
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

async function setup(model, extra = {}) {
  const dataDir = extra.dataDir ?? fs.mkdtempSync(path.join(scratch, 'data-'))
  const host = new AppHost({ dataDir, python, ...extra.options })
  const rec = recorder(host)
  if (!extra.skipSettings) {
    // 用户填的地址不带 /v1：连接测试补上
    const bare = model.baseURL.replace(/\/v1$/, '')
    const t = await host.dispatch('connection.test', { baseUrl: bare, key: 'sk-test-only' })
    assert.equal(t.ok, true, JSON.stringify(t))
    await host.dispatch('settings.save', { baseUrl: bare, model: 'audit-fixture' })
    await host.dispatch('secret.save', { key: 'model', value: 'sk-test-only' })
  }
  return { host, rec, dataDir }
}

describe('对话转发', () => {
  let model, host, rec, project, session, dataDir
  const outside = fs.mkdtempSync(path.join(scratch, 'outside-'))
  before(async () => {
    const question = { id: 'q1', question: '只要科目和期末余额两列吗？', options: [{ label: '是' }, { label: '再加名称' }] }
    model = await fakeModel({
      script: [
        { text: '我先提取这两列。', tools: [SELECT] },
        { text: '已提取 3 行。' },
        { tools: [{ name: 'ask_user_question', args: { questions: [question] } }] },
        (body) => ({ text: body.messages.some(m => m.role === 'tool' && String(m.content).includes('再加名称')) ? '好，加上名称。' : '没收到回答。' }),
      ],
    })
    ;({ host, rec, dataDir } = await setup(model))
    const folder = path.join(scratch, '某公司2025')
    project = await host.dispatch('project.create', { name: '某公司 2025 年报', folder })
    await host.dispatch('project.open', { project: project.project })
    session = (await host.dispatch('session.create', { project: project.project })).session
  })
  after(async () => { await host.close(); await model.close() })

  test('设置里不回传 Key', async () => {
    const s = await host.dispatch('settings.get', {})
    assert.equal(s.connected, true)
    assert.equal(s.hasKey, true)
    assert.deepEqual(s.models, ['audit-fixture'])
    assert.ok(!JSON.stringify(s).includes('sk-test-only'))
  })

  test('连接测试：原样连不上时补 /v1，保存时用补好的地址；Key 无效时说明', async () => {
    const http = await import('node:http')
    const stub = http.createServer((req, res) => {
      if (req.headers.authorization !== 'Bearer good') { res.writeHead(401); return res.end() }
      if (req.url === '/gw/v1/models') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ data: [{ id: 'qwen-72b' }] })) }
      res.writeHead(404); res.end()
    })
    await new Promise(r => stub.listen(0, '127.0.0.1', r))
    const url = `http://127.0.0.1:${stub.address().port}/gw/chat/completions/`
    const other = new AppHost({ dataDir: fs.mkdtempSync(path.join(scratch, 'conn-')), python })
    try {
      const bad = await other.dispatch('connection.test', { baseUrl: url, key: 'nope' })
      assert.equal(bad.ok, false)
      assert.equal(bad.error.code, 'AUTH')
      const ok = await other.dispatch('connection.test', { baseUrl: url, key: 'good' })
      assert.deepEqual(ok.models, ['qwen-72b'])
      const saved = await other.dispatch('settings.save', { baseUrl: url, model: 'qwen-72b' })
      assert.equal(saved.baseUrl, `http://127.0.0.1:${stub.address().port}/gw/v1`)
      assert.equal(saved.connected, false, '还没存 Key')
    } finally {
      stub.close()
      await other.close()
    }
  })

  test('项目外的资料复制进项目，按内容哈希编号，表格能打开', async () => {
    const src = makeWorkbook(outside)
    const { files: [f] } = await host.dispatch('files.add', { project: project.project, paths: [src] })
    assert.match(f.file, /^F-[0-9a-f]{12}$/)
    assert.deepEqual(f.sheets, ['Sheet1'])
    assert.ok(fs.existsSync(path.join(project.folder, '资料', '余额表.xlsx')))
    const again = await host.dispatch('files.add', { project: project.project, paths: [src] })
    assert.equal(again.files[0].file, f.file)
    assert.equal((await host.dispatch('files.list', { project: project.project })).files.length, 1)
    const view = await host.dispatch('sheet.view', { file: f.file })
    assert.equal(view.sheet, 'Sheet1')
    assert.equal(view.usedRange, 'A1:C4')
    const c4 = view.cells.find(c => c.cell === 'C4')
    assert.equal(c4.value, '35000')
    assert.equal(c4.valueType, 'number')
    assert.equal(view.cells.find(c => c.cell === 'A1').value, '科目')
  })

  test('一轮对话：流式片段、工具调用、对话产出，结束时引用产出', async () => {
    const { files: [f] } = await host.dispatch('files.list', { project: project.project })
    const { message } = await host.dispatch('message.send', { session, text: '从余额表提取科目和期末余额', files: [f.file] })
    assert.match(message, /^M-\d{4}$/)
    const done = await rec.wait(e => e.session === session && e.type === 'message.completed', 'completed')
    const evs = rec.of(session)
    const types = evs.map(e => e.type)
    assert.equal(types[0], 'message.created')
    assert.deepEqual(evs[0].data.files, [f.file])
    const started = evs.find(e => e.type === 'tool.started')
    assert.equal(started.data.tool, 'mcp__audit__select_column')
    assert.equal(started.data.system, '审计工具')
    assert.match(started.data.argsSummary, /columns_to_keep=科目,期末余额/)
    const finished = evs.find(e => e.type === 'tool.finished')
    assert.equal(finished.data.ok, true)
    assert.match(finished.data.resultSummary, /3 行/)
    assert.deepEqual(finished.data.refs, ['O-0001'])
    const ready = evs.find(e => e.type === 'output.ready')
    assert.equal(ready.data.output, 'O-0001')
    assert.equal(ready.data.kind, 'table')
    assert.ok(!ready.task)
    const streamed = evs.filter(e => e.type === 'message.delta' && e.data.message === done.data.message).map(e => e.data.text).join('')
    assert.equal(streamed, '我先提取这两列。\n\n已提取 3 行。')
    assert.equal(done.data.text, streamed)
    assert.deepEqual(done.data.refs, ['O-0001'])
    // seq 严格递增
    assert.deepEqual(evs.map(e => e.seq), evs.map((_, i) => i + 1))
    // 产出能列出、能打开
    const { outputs } = await host.dispatch('outputs.list', { project: project.project })
    assert.equal(outputs[0].output, 'O-0001')
    assert.equal(outputs[0].session, session)
    const out = await host.dispatch('sheet.view', { file: 'O-0001' })
    assert.ok(out.cells.some(c => c.value === '期末余额'))
    const table = await host.dispatch('table.view', { table: 'O-0001', limit: 2 })
    assert.equal(table.total, 3)
    assert.equal(table.rows.length, 2)
    const list = await host.dispatch('session.list', { project: project.project })
    assert.equal(list.sessions[0].title, '从余额表提取科目和期末余额')
  })

  test('模型追问以卡片出现，回答回到模型', async () => {
    await host.dispatch('message.send', { session, text: '还要别的列吗' })
    const opened = await rec.wait(e => e.session === session && e.type === 'card.opened', 'question card')
    assert.equal(opened.data.kind, 'question')
    assert.equal(opened.data.body.questions[0].text, '只要科目和期末余额两列吗？')
    assert.deepEqual(opened.data.body.questions[0].options.map(o => o.label), ['是', '再加名称'])
    assert.equal((await host.dispatch('session.list', { project: project.project })).sessions[0].openCards, 1)
    await host.dispatch('card.answer', { card: opened.data.card, action: 'confirm', edits: { q1: 1 }, note: '' })
    const closed = await rec.wait(e => e.type === 'card.closed' && e.data.card === opened.data.card, 'card closed')
    assert.equal(closed.data.answer.edits.q1, 1)
    const done = await rec.wait(e => e.session === session && e.type === 'message.completed' && e.seq > closed.seq, 'completed')
    assert.equal(done.data.text, '好，加上名称。')
    await assert.rejects(host.dispatch('card.answer', { card: opened.data.card, action: 'confirm' }), /已经处理过/)
  })

  test('宿主重启后补取事件，对话续上', async () => {
    const before = (await host.dispatch('session.events', { session, after: 0 })).events
    await host.close()
    const second = new AppHost({ dataDir, python })
    try {
      const evs = (await second.dispatch('session.events', { session, after: 0 })).events
      assert.deepEqual(evs, before)
      const tail = (await second.dispatch('session.events', { session, after: before.length - 2 })).events
      assert.equal(tail.length, 2)
      model.push({ text: '还记得：已经提取过了。' })
      const rec2 = recorder(second)
      await second.dispatch('message.send', { session, text: '刚才做了什么' })
      const done = await rec2.wait(e => e.type === 'message.completed', 'completed')
      assert.equal(done.data.text, '还记得：已经提取过了。')
      assert.ok(done.seq > before.length, 'seq 接着重启前的往后排')
      const last = model.chats().at(-1)
      assert.ok(last.messages.some(m => m.role === 'user' && JSON.stringify(m.content).includes('从余额表提取科目和期末余额')), '历史随会话续上')
    } finally {
      await second.close()
    }
  })
})

describe('停止和动作确认', () => {
  test('停止这一轮：回复标为已停止，会话可以继续', async () => {
    const model = await fakeModel({ script: [{ hold: true }, { text: '继续。' }] })
    const { host, rec } = await setup(model)
    try {
      const project = await host.dispatch('project.create', { name: 'p', folder: path.join(scratch, 'stop') })
      const { session } = await host.dispatch('session.create', { project: project.project })
      await host.dispatch('message.send', { session, text: '开始' })
      while (model.chats().length < 1) await new Promise(r => setTimeout(r, 50))
      await host.dispatch('message.stop', { session })
      const done = await rec.wait(e => e.type === 'message.completed', 'stopped')
      assert.equal(done.data.text, '（已停止）')
      await host.dispatch('message.send', { session, text: '接着来' })
      const next = await rec.wait(e => e.type === 'message.completed' && e.seq > done.seq, 'next')
      assert.equal(next.data.text, '继续。')
    } finally { await host.close(); await model.close() }
  })

  test('外部 MCP 服务：会改数据的工具出动作确认卡，拒绝不执行，确认后执行；只读工具直接调用', async () => {
    const log = path.join(scratch, 'oa-calls.log')
    const model = await fakeModel({
      script: [
        { tools: [{ name: 'mcp__oa__approve', args: { billNo: 'BX-2025-1188', opinion: '同意' } }] },
        { text: '已按你的意思不审批。' },
        { tools: [{ name: 'mcp__oa__query_expense', args: { billNo: 'BX-2025-1188' } }, { name: 'mcp__oa__approve', args: { billNo: 'BX-2025-1188', opinion: '同意' } }] },
        { text: '已审批。' },
      ],
    })
    const { host, rec } = await setup(model, { options: { harnessEnv: { FAKE_MCP_LOG: log } } })
    try {
      const cfg = { name: 'oa', title: 'OA 系统', enabled: true, transport: 'stdio', command: process.execPath, args: [path.join(here, 'fake-mcp.mjs')], env: { FAKE_MCP_LOG: log } }
      const tested = await host.dispatch('mcp.test', cfg)
      assert.equal(tested.ok, true, JSON.stringify(tested))
      assert.deepEqual(tested.tools.map(t => [t.tool, t.sideEffect, t.argsSummary]), [['query_expense', 'mutating', 'billNo'], ['approve', 'mutating', 'billNo, opinion']])
      await assert.rejects(host.dispatch('mcp.add', { ...cfg, name: 'audit' }), /留给内置审计工具/)
      const added = await host.dispatch('mcp.add', cfg)
      assert.equal(added.state, 'connected')
      await host.dispatch('mcp.update', { name: 'oa', tools: [{ tool: 'query_expense', sideEffect: 'readonly' }] })
      const project = await host.dispatch('project.create', { name: 'p', folder: path.join(scratch, 'oa') })
      const { session } = await host.dispatch('session.create', { project: project.project })

      await host.dispatch('message.send', { session, text: '审批 BX-2025-1188' })
      const card = await rec.wait(e => e.type === 'card.opened', 'action card')
      assert.equal(card.data.kind, 'action_confirmation')
      assert.equal(card.data.defaultAction, 'reject')
      assert.equal(card.data.body.system, 'OA 系统')
      assert.equal(card.data.body.operation, '审批报销单')
      assert.equal(card.data.body.tool, 'mcp__oa__approve')
      assert.deepEqual(card.data.body.argsSummary, [{ label: 'billNo', value: 'BX-2025-1188' }, { label: 'opinion', value: '同意' }])
      assert.equal(card.data.body.reversible, null)
      await host.dispatch('card.answer', { card: card.data.card, action: 'reject' })
      await rec.wait(e => e.type === 'card.closed' && e.data.card === card.data.card && e.data.answer?.action === 'reject', 'closed')
      const first = await rec.wait(e => e.type === 'message.completed', 'first done')
      assert.equal(first.data.text, '已按你的意思不审批。')
      assert.ok(!fs.existsSync(log), '拒绝后不执行')

      await host.dispatch('message.send', { session, text: '还是审批吧' })
      const card2 = await rec.wait(e => e.type === 'card.opened' && e.data.card !== card.data.card, 'second card')
      const query = rec.events.find(e => e.type === 'tool.started' && e.data.tool === 'mcp__oa__query_expense')
      assert.equal(query.data.system, 'OA 系统')
      assert.equal(card2.data.body.tool, 'mcp__oa__approve', '只读工具不出卡')
      await host.dispatch('card.answer', { card: card2.data.card, action: 'confirm' })
      const second = await rec.wait(e => e.type === 'message.completed' && e.seq > first.seq, 'second done')
      assert.equal(second.data.text, '已审批。')
      assert.equal(fs.readFileSync(log, 'utf8').trim().split('\n').length, 1)

      const privacy = await host.dispatch('privacy.status', {})
      const byItem = Object.fromEntries(privacy.outbound.map(o => [o.item, o]))
      assert.equal(byItem.telemetry.state, 'off')
      assert.equal(byItem.webSearch.state, 'off')
      assert.ok(!privacy.outbound.some(o => o.warning), JSON.stringify(privacy))
      assert.equal(privacy.shell, 'off')
      assert.ok(privacy.verifiedAt)
    } finally { await host.close(); await model.close() }
  })

  test('编排插件的卡片原样转给前端，回答送回插件；未配置模型时发消息报错', async () => {
    const model = await fakeModel({ script: [{ tools: [{ name: 'demo_card', args: { title: '请确认对底稿的理解' } }] }, { text: '已确认。' }] })
    const { host, rec } = await setup(model, { options: { patches: [path.join(here, '..', '..', 'harness', 'test', 'plugins', 'card-demo.patch.yml')] } })
    const bare = new AppHost({ dataDir: fs.mkdtempSync(path.join(scratch, 'bare-')), python })
    try {
      const project = await host.dispatch('project.create', { name: 'p', folder: path.join(scratch, 'plugin') })
      const { session } = await host.dispatch('session.create', { project: project.project })
      await host.dispatch('message.send', { session, text: '填底稿' })
      const opened = await rec.wait(e => e.type === 'card.opened', 'plugin card')
      assert.equal(opened.data.card, 'C-001')
      assert.equal(opened.data.title, '请确认对底稿的理解')
      await host.dispatch('card.answer', { card: 'C-001', action: 'confirm', note: '' })
      const closed = await rec.wait(e => e.type === 'card.closed', 'closed')
      assert.equal(closed.data.answer.action, 'confirm')
      const done = await rec.wait(e => e.type === 'message.completed', 'done')
      assert.equal(done.data.text, '已确认。')

      const p2 = await bare.dispatch('project.create', { name: 'p', folder: path.join(scratch, 'bare') })
      const s2 = await bare.dispatch('session.create', { project: p2.project })
      await assert.rejects(bare.dispatch('message.send', { session: s2.session, text: 'hi' }), e => e.code === 'ENV_MODEL')
    } finally { await host.close(); await bare.close(); await model.close() }
  })
})

describe('传输层', () => {
  test('命令走 POST /rpc，事件走 SSE；跨站请求被拒', async () => {
    const host = new AppHost({ dataDir: fs.mkdtempSync(path.join(scratch, 'http-')), python })
    const server = createServer(host)
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    const base = `http://127.0.0.1:${server.address().port}`
    try {
      const rpc = (method, params, headers = { 'X-Audit-Host': '1' }) => fetch(base + '/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ id: '1', method, params }) })
      assert.equal((await rpc('project.list', {}, {})).status, 403)
      const r = await (await rpc('project.create', { name: '传输', folder: path.join(scratch, 'http-project') })).json()
      assert.equal(r.ok, true)
      const bad = await (await rpc('session.get', { session: 'S-none' })).json()
      assert.deepEqual(bad, { id: '1', ok: false, error: { code: 'REF_SESSION', message: '没有对话 S-none' } })

      const controller = new AbortController()
      const res = await fetch(base + '/events', { signal: controller.signal })
      const reader = res.body.getReader()
      const { session } = (await (await rpc('session.create', { project: r.result.project })).json()).result
      host.conversation(session).emit('message.created', { message: 'M-0001', text: '你好' })
      let text = ''
      while (!text.includes('message.created')) text += new TextDecoder().decode((await reader.read()).value)
      const event = JSON.parse(text.split('\n').find(l => l.startsWith('data: ')).slice(6))
      assert.equal(event.type, 'message.created')
      assert.equal(event.seq, 1)
      controller.abort()

      const up = await (await fetch(`${base}/upload?project=${r.result.project}&name=${encodeURIComponent('说明.txt')}`, { method: 'POST', headers: { 'X-Audit-Host': '1' }, body: '内容' })).json()
      assert.equal(up.ok, true)
      assert.equal(up.result.files[0].name, '说明.txt')
      assert.equal(up.result.files[0].kind, 'other')
    } finally {
      server.close()
      await host.close()
    }
  })
})
