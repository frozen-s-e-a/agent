/**
 * 审计助手编排插件：按固定流程推进底稿任务（设计第三到八节，《接口约定》第三到五节）。
 *
 * 任务从两处开始：
 * - 对话中模型调用 audit_task_start（模型判断这一轮要填底稿）；
 * - 宿主请求 task/create（前端在打开的底稿上点"开始填写"）。
 * 任务在后台运行，不占用对话的轮次：停止对话回复（session/cancel）不影响任务。
 *
 * 宿主请求（经桥接插件 auditBridge 注册）：
 *   task/create  { sessionId, text, files, message? }   → { task }
 *   task/get     { task }                               → 任务快照（4.4，lastSeq 由宿主补）
 *   task/list    {}                                     → [{ task, session, status, text, deliverables, createdAt, finishedAt }]
 *   task/message { task, text }                         → { regions, rerunCard }（4.6）
 *   task/cancel  { task }                               → { cancelled }
 *   task/resume  { task }                               → { resumed }（从检查点继续）
 *   task/rerun   { task, scope, note }                  → { queued }（4.7）
 *   ids/allocate { prefix: 'C' | 'O' }                  → { id }（宿主出的卡片和对话产出也从这里取号）
 *   audit/tool   { name, arguments }                    → 工具信封（只限 trace_cell、fill_preview、table_view）
 *
 * 通知：task.event { sessionId, task, type, data, ts }，type 为 4.2 的事件类型；宿主补 seq 并包成 audit-events/1 信封。
 * 卡片走桥接插件的 card.opened / card.closed（card.task 为任务编号）。
 */
import path from 'node:path'
import Schema from '@deepseek-ai/schemastery'
import { createModel } from './model.mjs'
import { Store } from './store.mjs'
import { TaskRunner, TaskShutdown, newTaskState } from './flow.mjs'
import { createToolCaller } from './tools.mjs'

export const name = 'audit-orchestrator'
export const inject = ['tools', 'llm', 'agents', 'auditCards', 'auditBridge']

/** 《接口约定》3.1 中只由编排或宿主调用的工具，不交给模型。 */
export const ORCHESTRATION_TOOLS = [
  'workpaper_parse', 'workpaper_region_view', 'workpaper_semantics_check', 'template_match',
  'data_inspect', 'data_import', 'data_quality',
  'check_basis', 'check_conservation', 'check_control', 'check_compare',
  'fill_compile', 'fill_apply',
]
export const HOST_TOOLS = ['trace_cell', 'fill_preview', 'table_view']

export const Config = Schema.object({
  provider: Schema.string().default('enterprise'),
  model: Schema.string().required(),
  stateDir: Schema.string().required(),
  server: Schema.string().default('audit'),
  samples: Schema.natural().default(3),
  recompute: Schema.boolean().default(true),
  maxAttempts: Schema.natural().default(3),
  maxReidentify: Schema.natural().default(2),
  trivialThreshold: Schema.string().default('0'),
  inputBudget: Schema.natural().default(4000),
  maxOutput: Schema.natural().default(8192),
  maxRows: Schema.natural().default(5000),
})

function invalidParams(message) {
  return Object.assign(new Error(message), { code: -32602 })
}

export function apply(ctx, config) {
  const store = new Store(path.resolve(config.stateDir))
  const model = createModel({ llm: ctx.llm, provider: config.provider, model: config.model, store, inputBudget: config.inputBudget, maxOutput: config.maxOutput })
  const tools = createToolCaller({ tools: ctx.tools, server: config.server })
  const notify = (method, params) => ctx.auditBridge.notify(method, params)
  const runners = new Map()
  const hidden = [...ORCHESTRATION_TOOLS, ...HOST_TOOLS].map(tool => `mcp__${config.server}__${tool}`)

  // 上次进程退出时还在运行的任务：标为暂停，等 task/resume。
  for (const state of store.list()) {
    if (state.status === 'running') {
      state.status = 'paused'
      state.blocked = { where: state.stage, why: '应用重启，任务中断', suggest: '继续任务' }
      store.save(state)
    }
  }

  function runnerOf(task) {
    if (typeof task !== 'string') throw invalidParams('task is required')
    let runner = runners.get(task)
    if (runner) return runner
    const state = store.load(task)
    if (!state) throw invalidParams('unknown task: ' + task)
    runner = new TaskRunner({ state, store, tools, model, cards: ctx.auditCards, notify, config })
    runners.set(task, runner)
    return runner
  }

  function createTask({ sessionId, text, context, files = [], message }) {
    if (typeof sessionId !== 'string' || !sessionId) throw invalidParams('sessionId is required')
    if (typeof text !== 'string' || !text.trim()) throw invalidParams('text is required')
    if (!Array.isArray(files)) throw invalidParams('files must be an array')
    if (context !== undefined && typeof context !== 'string') throw invalidParams('context must be a string')
    const task = store.newTaskId()
    const state = newTaskState({ task, sessionId, text, context, files, message })
    store.save(state)
    const runner = runnerOf(task)
    runner.emit('task.created', { ...(message ? { message } : {}), text, files: state.files })
    void runner.start().catch(error => ctx.logger?.('audit-orchestrator')?.error?.(error))
    return { task }
  }

  // ---------- 模型可见的工具：在对话中登记底稿任务 ----------
  ctx.effect(() => ctx.tools.register({
    name: 'audit_task_start',
    description: [
      '登记一个底稿任务并在后台按固定流程完成：识别底稿、导入资料、定口径、计算核对、写入新文件。',
      '只在用户要把数据填进一份现成的底稿（有表头、待填空格的审计工作底稿）时调用，而且要同时有底稿和取数用的资料（科目余额表、序时账等）。',
      '只是提取列、筛选、汇总、把结果另存成新的 Excel，或者只给了一份资料、没有要填的底稿时，不要调用，直接用其他审计工具完成。',
      'text 原样抄录用户这一轮的原话，不改写；用户这一轮只是答复（如“需要”“好的”“就这样”）时，在 context 里用一两句话写清用户要做什么、用哪些文件，取自前面的对话。',
      'files 为相关的资料和底稿编号（F-…）。登记后任务在后台进行，进度和需要用户确认的卡片会显示在界面上，你只需告诉用户任务已开始。',
    ].join(''),
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '用户原话' },
        context: { type: 'string', description: '用户这一轮只是答复时，前面对话里用户要做的事；否则不填' },
        files: { type: 'array', items: { type: 'string' }, description: '资料和底稿的 F- 编号' },
      },
      required: ['text'],
    },
    output: {
      schema: { type: 'object' },
      render: (_args, value) => [{ type: 'text', text: `已登记底稿任务 ${value.task}，在后台进行。` }],
    },
    async execute(args, exec) {
      if (!exec.agent) throw new Error('audit_task_start 只能在对话中调用')
      return createTask({ sessionId: String(exec.agent.session.id), text: args.text, context: args.context, files: args.files ?? [] })
    },
  }), 'audit-orchestrator.tool')

  // ---------- 编排专用工具不交给模型（《接口约定》3.1） ----------
  ctx.on('agent/created', ({ agent }) => {
    const deny = hidden.filter(tool => ctx.tools.get(tool) !== undefined)
    if (deny.length) agent.ctx.tools.restrict({ deny })
  })

  // ---------- 宿主请求 ----------
  const methods = {
    'task/create': params => createTask(params),
    'task/get': ({ task }) => runnerOf(task).snapshot(),
    'task/list': () => store.list().map(s => ({ task: s.task, session: s.sessionId, status: s.status, text: s.text, deliverables: s.deliverables, createdAt: s.createdAt, finishedAt: s.finishedAt ?? null }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    'task/message': ({ task, text }) => {
      if (typeof text !== 'string' || !text.trim()) throw invalidParams('text is required')
      return runnerOf(task).message(text)
    },
    'task/cancel': ({ task }) => {
      const runner = runnerOf(task)
      if (runner.cancel()) return { cancelled: true }
      if (['paused', 'blocked'].includes(runner.state.status)) {
        for (const card of runner.state.openCards) ctx.auditCards.withdraw(runner.state.sessionId, card, task)
        runner.state.openCards = []
        runner.finish('cancelled')
        return { cancelled: true }
      }
      return { cancelled: false }
    },
    'task/resume': ({ task }) => {
      const runner = runnerOf(task)
      if (runner.running) return { resumed: false, running: true }
      void runner.start()
      return { resumed: true }
    },
    'task/rerun': ({ task, scope, note }) => runnerOf(task).rerun(scope, note),
    'ids/allocate': ({ prefix }) => {
      if (!['C', 'O'].includes(prefix)) throw invalidParams('prefix must be C or O')
      return { id: store.allocate(prefix) }
    },
    'audit/tool': ({ name: tool, arguments: args }) => {
      if (!HOST_TOOLS.includes(tool)) throw invalidParams('not a host tool: ' + tool)
      return tools.call(tool, args ?? {}, { signal: AbortSignal.timeout(120000) }).catch(error => error.envelope ?? { ok: false, error: { code: 'TOOL_FAILED', message: error.message } })
    },
  }
  for (const [method, fn] of Object.entries(methods)) ctx.effect(() => ctx.auditBridge.handle(method, fn), `audit-orchestrator.${method}`)

  // 应用退出：进行中的任务暂停并发 task.blocked。宿主发 shutdown 时先于输出关闭执行；插件被卸载时再兜一次
  const pauseAll = () => {
    for (const runner of runners.values()) {
      if (!runner.running) continue
      runner.pause()
      runner.controller.abort(new TaskShutdown('harness shutting down'))
    }
  }
  ctx.effect(() => ctx.auditBridge.onShutdown(pauseAll), 'audit-orchestrator.pause')
  ctx.effect(() => pauseAll, 'audit-orchestrator.shutdown')
}
