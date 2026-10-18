// Harness 接入测试：固定版本的 dsh + 本目录的配置层和桥接插件 + 审计工具 MCP 服务 + 假模型。
// 运行：cd harness && npm test（需要 python3 及 pandas、openpyxl；可用 AUDIT_TEST_PYTHON 指定）
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { fakeModel } from './fake-model.mjs'
import { startHarness, waitIdle } from './client.mjs'
import { matchesPatterns } from '../plugins/host-bridge.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const python = process.env.AUDIT_TEST_PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3')
const guard = path.join(here, '..', 'tools', 'egress-guard.mjs')
const cardPatch = path.join(here, 'plugins', 'card-demo.patch.yml')
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-harness-'))

const SELECT = { name: 'mcp__audit__select_column', args: { folder_path: '余额表.xlsx', should_merge: '是', sheet_keywords: '', columns_to_keep: '科目,期末余额' } }

function makeProject() {
  const root = fs.mkdtempSync(path.join(scratch, 'project-'))
  execFileSync(python, ['-c', `import pandas as pd; pd.DataFrame({'科目':['1001','1002','1122'],'名称':['库存现金','银行存款','应收账款'],'期末余额':[100.5,2000,35000]}).to_excel(r'''${path.join(root, '余额表.xlsx')}''', index=False)`])
  return root
}

async function open(model, extra = {}, nodeOptions) {
  const harness = startHarness({
    projectRoot: extra.projectRoot ?? makeProject(),
    dataDir: extra.dataDir ?? fs.mkdtempSync(path.join(scratch, 'data-')),
    baseURL: model.baseURL,
    apiKey: 'sk-test-only',
    model: 'audit-fixture',
    python,
    ...extra,
  }, { nodeOptions })
  await harness.request('initialize', harness.launch.initialize)
  return harness
}

const text = blocks => (blocks ?? []).filter(b => b.type === 'text').map(b => b.text).join('')
const lastAssistant = events => events.filter(e => e.type === 'assistant/message').map(e => text(e.data.message.content)).filter(Boolean).at(-1)
const toolResults = events => events.filter(e => e.type === 'tool/result').map(e => e.data.message)
const until = async (check, timeoutMs = 30000) => {
  const end = Date.now() + timeoutMs
  while (!check()) {
    if (Date.now() > end) throw new Error('condition not met in time')
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

after(() => fs.rmSync(scratch, { recursive: true, force: true }))

// 由 audit.patch.yml 关掉的条目
const DISABLED = new Set(`llm-deepseek llm-deepseek-account deepseek-account deepseek-llm-api-extensions session-log-deepseek plugin-package-inventory-deepseek otel session-telemetry-otel web web-search-deepseek web-deepseek-api web-fetch-http tool-web plugin-manager bash-sandbox pwsh-sandbox tool-bash tool-pwsh shell-env permission tool-jobs tool-fs tool-fs-search tool-working-directory ptc-runtime workflow-ptc tool-workflow tool-goal command-goal goal-round-driver goal plan-mode tool-subagent tool-subagent-fork tool-subagent-control tool-subagent-list-agents mcp-resources agent-instructions tool-plugin-manager`.split(/\s+/))
// sdk profile 本来就关闭或按环境变量关闭的条目
const SDK_DISABLED = new Set(['include', 'sdk-jsonrpc-server', 'hmr', 'session-title-llm', 'workspace-dependencies', 'skill-office'])


describe('配置与端到端', () => {
  let model, harness, project
  const egressLog = path.join(scratch, 'egress.log')
  before(async () => {
    model = await fakeModel({ script: [{ tools: [SELECT] }, { text: '已提取 3 行。' }] })
    project = makeProject()
    harness = await open(model, { projectRoot: project, env: { AUDIT_EGRESS_LOG: egressLog } }, `--import=${pathToFileURL(guard).href}`)
  })
  after(async () => { await harness.stop(); await model.close() })

  test('模型路由只有企业模型，DeepSeek 官方路由未挂载', async () => {
    const status = await harness.request('bridge/status', {})
    assert.deepEqual(status.providers, ['enterprise'])
    const active = new Set(status.entries.filter(e => e.active).map(e => e.id))
    for (const id of ['llm-deepseek', 'llm-deepseek-account', 'deepseek-account', 'session-log-deepseek', 'otel', 'session-telemetry-otel', 'web', 'web-search-deepseek', 'web-deepseek-api', 'tool-web', 'plugin-manager']) {
      assert.ok(!active.has(id), `${id} 应当未启用`)
    }
    assert.ok(active.has('mcp-audit') && active.has('audit-host-bridge'))
    // 没启用的条目只能是配置层关掉的，或 sdk profile 本来就关的；其他没起来的说明配置有误。
    const unexpected = status.entries.filter(e => !e.active && !DISABLED.has(e.id) && !SDK_DISABLED.has(e.id)).map(e => e.id)
    assert.deepEqual(unexpected, [])
  })

  test('模型看不到 shell、文件读写、联网、代码执行和自由派生子 Agent', async () => {
    const { tools } = await harness.request('bridge/status', {})
    const forbidden = ['bash', 'pwsh', 'read', 'write', 'edit', 'read_image', 'glob', 'grep', 'web_search', 'web_fetch', 'run_code', 'workflow', 'subagent', 'subagent_fork', 'send_message', 'interrupt_agent', 'list_agents', 'working_directory', 'job_list', 'job_output', 'job_kill', 'create_goal', 'exit_plan_mode', 'plugin_manager']
    for (const name of forbidden) assert.ok(!tools.includes(name), `${name} 不应对模型可见`)
    assert.ok(tools.filter(name => name.startsWith('mcp__audit__')).length >= 50)
    assert.ok(!tools.includes('mcp__audit__announcement'), '联网工具默认不提供')
  })

  test('模型调用审计工具，信封结果回到模型，产出写在项目 outputs 下', async () => {
    await harness.request('session/prompt', { sessionId: 'S-e2e', contentBlocks: [{ type: 'text', text: '从余额表提取科目和期末余额' }] })
    await harness.request('session/wait', { sessionId: 'S-e2e' })
    const events = harness.events('S-e2e')
    const [result] = toolResults(events)
    const envelope = JSON.parse(text(result.content))
    assert.equal(envelope.ok, true)
    assert.equal(envelope.data.rowCount, 3)
    assert.ok(envelope.refs.some(ref => ref.endsWith('合并列提取结果.xlsx')))
    assert.ok(fs.existsSync(path.join(project, envelope.refs[0])))
    assert.equal(lastAssistant(events), '已提取 3 行。')
    const streamed = harness.notifications
      .filter(n => n.method === 'assistant.stream' && n.params.sessionId === 'S-e2e' && n.params.frame.chunk?.type === 'text-delta')
      .map(n => n.params.frame.chunk.text).join('')
    assert.equal(streamed, '已提取 3 行。', '回复的流式片段转发给宿主')
    const [first, second] = model.chats()
    assert.equal(first.model, 'audit-fixture')
    assert.equal(first.max_tokens, 8192)
    assert.ok(!('store' in first) && !('reasoning_effort' in first))
    assert.equal(first.messages[0].role, 'system')
    assert.ok(second.messages.some(m => m.role === 'tool' && m.content.includes('"ok":true')))
  })

  test('除本机假模型外没有任何外连，请求里也没有会话日志字段', async () => {
    const lines = fs.readFileSync(egressLog, 'utf8').trim().split('\n').map(line => JSON.parse(line))
    const outside = lines.filter(entry => !entry.allowed)
    assert.deepEqual(outside, [])
    assert.ok(lines.some(entry => entry.kind === 'connect' && Number(entry.port) === Number(new URL(model.baseURL).port)))
    for (const request of model.requests) {
      assert.equal(request.headers.authorization, 'Bearer sk-test-only')
      assert.ok(!JSON.stringify(request.body ?? {}).includes('dsh_session_log'))
    }
  })
})

describe('宿主控制', () => {
  test('session/cancel 停止进行中的一轮，会话可以继续', async () => {
    const model = await fakeModel({ script: [{ hold: true }, { text: '继续处理。' }] })
    const harness = await open(model)
    try {
      await harness.request('session/prompt', { sessionId: 'S-cancel', contentBlocks: [{ type: 'text', text: '开始' }] })
      await until(() => model.chats().length === 1)
      const since = harness.notifications.length
      assert.deepEqual(await harness.request('session/cancel', { sessionId: 'S-cancel' }), { cancelled: true })
      await waitIdle(harness, 'S-cancel', since)
      const ended = harness.events('S-cancel').filter(e => e.type === 'turn/end').at(-1)
      assert.equal(ended.data.reason.kind, 'aborted')
      await harness.request('session/prompt', { sessionId: 'S-cancel', contentBlocks: [{ type: 'text', text: '接着来' }] })
      await harness.request('session/wait', { sessionId: 'S-cancel' })
      assert.equal(lastAssistant(harness.events('S-cancel')), '继续处理。')
      assert.deepEqual(await harness.request('session/cancel', { sessionId: 'S-cancel' }), { cancelled: false })
    } finally { await harness.stop(); await model.close() }
  })

  test('Harness 进程被强行结束后，会话可以续上，历史还在', async () => {
    const model = await fakeModel({ script: [{ hold: true }, { text: '续上了。' }] })
    const dataDir = fs.mkdtempSync(path.join(scratch, 'data-'))
    const projectRoot = makeProject()
    const first = await open(model, { dataDir, projectRoot })
    await first.request('session/prompt', { sessionId: 'S-resume', contentBlocks: [{ type: 'text', text: '第一句话' }] })
    await until(() => model.chats().length === 1)
    first.child.kill('SIGKILL')
    await first.exited
    const second = await open(model, { dataDir, projectRoot })
    try {
      await second.request('session/resume', { sessionId: 'S-resume' })
      await second.request('session/prompt', { sessionId: 'S-resume', contentBlocks: [{ type: 'text', text: '第二句话' }] })
      await second.request('session/wait', { sessionId: 'S-resume' })
      const lastRequest = model.chats().at(-1)
      const userTexts = lastRequest.messages.filter(m => m.role === 'user').map(m => typeof m.content === 'string' ? m.content : text(m.content))
      assert.ok(userTexts.includes('第一句话') && userTexts.includes('第二句话'))
      assert.equal(lastAssistant(second.events('S-resume')), '续上了。')
    } finally { await second.stop(); await model.close() }
  })

  test('需要确认的工具：拒绝时不执行，允许一次时执行', async () => {
    const model = await fakeModel({ script: [{ tools: [SELECT] }, { text: '已取消。' }, { tools: [SELECT] }, { text: '已提取。' }] })
    const projectRoot = makeProject()
    const harness = await open(model, { projectRoot, confirmTools: ['mcp__audit__select_*'] })
    try {
      await harness.request('session/prompt', { sessionId: 'S-approve', contentBlocks: [{ type: 'text', text: '提取' }] })
      const ask1 = await harness.waitFor(n => n.method === 'approval.request')
      assert.equal(ask1.params.toolName, 'mcp__audit__select_column')
      assert.equal(ask1.params.sessionId, 'S-approve')
      assert.ok(ask1.params.callId)
      await harness.request('approval/respond', { id: ask1.params.id, outcome: 'rejected' })
      const closed1 = await harness.waitFor(n => n.method === 'approval.closed' && n.params.id === ask1.params.id)
      assert.equal(closed1.params.sessionId, 'S-approve')
      await harness.request('session/wait', { sessionId: 'S-approve' })
      assert.ok(!fs.existsSync(path.join(projectRoot, 'outputs')) || fs.readdirSync(path.join(projectRoot, 'outputs')).length === 0)
      const rejected = toolResults(harness.events('S-approve'))[0]
      assert.equal(rejected.isError, true)

      await harness.request('session/prompt', { sessionId: 'S-approve', contentBlocks: [{ type: 'text', text: '再来' }] })
      const ask2 = await harness.waitFor(n => n.method === 'approval.request' && n.params.id !== ask1.params.id)
      await harness.request('approval/respond', { id: ask2.params.id, outcome: 'allowed-once' })
      await harness.request('session/wait', { sessionId: 'S-approve' })
      const allowed = toolResults(harness.events('S-approve'))[1]
      assert.equal(JSON.parse(text(allowed.content)).ok, true)
      await assert.rejects(harness.request('approval/respond', { id: ask2.params.id, outcome: 'rejected' }), /nothing pending/)
    } finally { await harness.stop(); await model.close() }
  })

  test('工具名匹配：前缀和排除项', () => {
    const patterns = ['mcp__oa__*', '!mcp__oa__query_*', 'mcp__erp__post']
    assert.equal(matchesPatterns(patterns, 'mcp__oa__approve'), true)
    assert.equal(matchesPatterns(patterns, 'mcp__oa__query_expense'), false)
    assert.equal(matchesPatterns(patterns, 'mcp__erp__post'), true)
    assert.equal(matchesPatterns(patterns, 'mcp__erp__get'), false)
    assert.equal(matchesPatterns(['!mcp__oa__x'], 'mcp__oa__x'), false)
  })

  test('设置里停用的工具：模型看不到，调用也被拦下', async () => {
    const model = await fakeModel({ script: [{ tools: [SELECT] }, { text: '这个工具不能用。' }] })
    const projectRoot = makeProject()
    const harness = await open(model, { projectRoot, disabledTools: ['mcp__audit__select_*'] })
    try {
      await harness.request('session/prompt', { sessionId: 'S-off', contentBlocks: [{ type: 'text', text: '提取' }] })
      await harness.request('session/wait', { sessionId: 'S-off' })
      const names = (model.chats()[0].tools ?? []).map(t => t.function?.name ?? t.name)
      assert.ok(!names.includes('mcp__audit__select_column'))
      assert.ok(names.some(name => name.startsWith('mcp__audit__')), names.join())
      const result = toolResults(harness.events('S-off'))[0]
      assert.equal(result.isError, true)
      assert.ok(!fs.existsSync(path.join(projectRoot, 'outputs')) || fs.readdirSync(path.join(projectRoot, 'outputs')).length === 0)
    } finally { await harness.stop(); await model.close() }
  })

  test('模型追问转给宿主，回答回到模型', async () => {
    const question = { id: 'q1', question: '账龄从哪一天开始算？', options: [{ label: '凭证日期' }, { label: '发票日期' }] }
    const model = await fakeModel({ script: [{ tools: [{ name: 'ask_user_question', args: { questions: [question] } }] }, { text: '按凭证日期计算。' }] })
    const harness = await open(model)
    try {
      await harness.request('session/prompt', { sessionId: 'S-ask', contentBlocks: [{ type: 'text', text: '做账龄分析' }] })
      const ask = await harness.waitFor(n => n.method === 'question.request')
      assert.equal(ask.params.questions[0].question, question.question)
      assert.ok(ask.params.callId)
      await harness.request('question/respond', { id: ask.params.id, answers: [{ id: 'q1', selected: ['凭证日期'] }] })
      const closed = await harness.waitFor(n => n.method === 'question.closed' && n.params.id === ask.params.id)
      assert.equal(closed.params.sessionId, 'S-ask')
      await harness.request('session/wait', { sessionId: 'S-ask' })
      assert.equal(toolResults(harness.events('S-ask'))[0].toolCallId, ask.params.callId)
      await harness.request('session/wait', { sessionId: 'S-ask' })
      const toolMessage = model.chats()[1].messages.find(m => m.role === 'tool')
      assert.match(toolMessage.content, /凭证日期/)
      assert.equal(lastAssistant(harness.events('S-ask')), '按凭证日期计算。')
    } finally { await harness.stop(); await model.close() }
  })
})

describe('卡片回答怎么送回 Harness（接口约定 1.1）', () => {
  test('桥接请求直接送达等待中的插件；同一时刻用会话消息送回答会排在队里送不到', async () => {
    const model = await fakeModel({ script: [{ tools: [{ name: 'demo_card', args: { title: '请确认对底稿的理解' } }] }, { text: '已确认，继续。' }] })
    const harness = await open(model, { patches: [cardPatch] })
    try {
      await harness.request('session/prompt', { sessionId: 'S-card', contentBlocks: [{ type: 'text', text: '填底稿' }] })
      const opened = await harness.waitFor(n => n.method === 'card.opened')
      assert.equal(opened.params.card.card, 'C-001')
      assert.equal(opened.params.sessionId, 'S-card')

      // 原暂定方案：把回答作为带标记的消息发进会话。工具还在等卡片，这条消息只能排在收件箱里。
      const tagged = '[card-answer] C-001 confirm'
      await harness.request('session/prompt', { sessionId: 'S-card', contentBlocks: [{ type: 'text', text: tagged }] })
      await new Promise(resolve => setTimeout(resolve, 1500))
      const committed = harness.events('S-card').filter(e => e.type === 'user/message' && text(e.data.content) === tagged)
      assert.equal(committed.length, 0, '工具等待期间，带标记的消息不会进入会话，插件拿不到')
      assert.deepEqual((await harness.request('bridge/status', {})).openCards, ['C-001'])

      // 桥接方案：card/answer 直接交给等待中的插件。
      await harness.request('card/answer', { card: 'C-001', action: 'confirm', note: '' })
      await harness.waitFor(n => n.method === 'card.closed' && n.params.card === 'C-001')
      await harness.request('session/wait', { sessionId: 'S-card' })
      const result = JSON.parse(text(toolResults(harness.events('S-card'))[0].content))
      assert.deepEqual(result, { card: 'C-001', action: 'confirm', note: '' })
      // 排队的那条消息直到工具返回后才被取出，作为下一步的普通用户输入交给模型。
      const claimedAfter = harness.events('S-card').findIndex(e => e.type === 'user/message' && text(e.data.content) === tagged)
      const resultAt = harness.events('S-card').findIndex(e => e.type === 'tool/result')
      assert.ok(claimedAfter > resultAt)
    } finally { await harness.stop(); await model.close() }
  })

  test('取消这一轮时撤回卡片', async () => {
    const model = await fakeModel({ script: [{ tools: [{ name: 'demo_card', args: { title: '确认' } }] }] })
    const harness = await open(model, { patches: [cardPatch] })
    try {
      await harness.request('session/prompt', { sessionId: 'S-withdraw', contentBlocks: [{ type: 'text', text: '开始' }] })
      const opened = await harness.waitFor(n => n.method === 'card.opened')
      await harness.request('session/cancel', { sessionId: 'S-withdraw' })
      const closed = await harness.waitFor(n => n.method === 'card.closed' && n.params.card === opened.params.card.card)
      assert.equal(closed.params.withdrawn, true)
      await assert.rejects(harness.request('card/answer', { card: opened.params.card.card, action: 'confirm' }), /no open card/)
    } finally { await harness.stop(); await model.close() }
  })
})
