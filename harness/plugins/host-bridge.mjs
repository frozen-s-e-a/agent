/**
 * 审计助手宿主桥接：替换 sdk profile 的 `sdk-jsonrpc-server`。
 *
 * 标准输出上的 JSON-RPC（换行分帧）与 dsh SDK 协议完全兼容，并补上 SDK 缺的几样：
 *
 * 宿主 → Harness（请求）
 *   initialize / session/prompt / session/resume / session/wait /
 *   session/working-directory/get|set / shutdown        原样交给 dsh 的 SDK 服务
 *   session/cancel   { sessionId }                     停止这一轮，会话可继续
 *   approval/respond { id, outcome }                   回答动作确认（allowed-once | rejected）
 *   question/respond { id, answers }                   回答模型的追问（ask_user_question）
 *   card/answer      { card, action, edits?, note? }   回答编排插件发出的卡片
 *   bridge/status    {}                                实际生效的插件、模型路由、模型可见工具
 *   其他插件经 `auditBridge.handle(method, fn)` 注册的请求（编排插件的 task/*、ids/allocate、audit/tool）
 *
 * Harness → 宿主（通知）
 *   session.event / session.status / subagent.*        与 dsh SDK 相同
 *   assistant.stream { sessionId, frame }              回复的流式片段（dsh SDK 不转发，前端逐字显示要用）
 *   approval.request { id, sessionId, toolName, callId, reason }
 *   approval.closed  { id, outcome }
 *   question.request { id, sessionId, callId, questions }
 *   question.closed  { id }
 *   card.opened      { sessionId, card }
 *   card.closed      { sessionId, card, task?, answer | withdrawn }
 *   其他插件经 `auditBridge.notify(method, params)` 发出的通知（编排插件的 task.event）
 *
 * 编排插件通过本插件提供的 `auditCards` 服务出卡片：`await ctx.auditCards.open(target, card, signal)`，
 * target 是 Agent 或 `{ sessionId }`（后台进行的底稿任务不在某一轮对话里）。
 * 卡片回答走宿主请求直接送达等待中的插件，不经过会话消息，也就不会先排进 Agent 的收件箱。
 *
 * 本文件依赖 dsh 的 SDK 服务类和传输类，与 harness/package.json 固定的 dsh 版本一起升级。
 */
import Schema from '@deepseek-ai/schemastery'
import { JsonRpcLineTransport } from '@deepseek-ai/dsh-sdk-protocol'
import { HarnessSdkJsonRpcServer } from '@deepseek-ai/dsh-sdk-jsonrpc-server'

export const name = 'audit-host-bridge'
export const inject = ['agents', 'workingDirectory']

export const Config = Schema.object({
  maxTokensAsSuccess: Schema.boolean().default(true),
  confirmTools: Schema.array(Schema.string()).default([]),
})

/** 工具名匹配：精确名，或以 `*` 结尾的前缀（如 `mcp__oa__*`）。 */
export function matchesAny(patterns, toolName) {
  return patterns.some(pattern => pattern.endsWith('*') ? toolName.startsWith(pattern.slice(0, -1)) : pattern === toolName)
}

function invalidParams(message) {
  return Object.assign(new Error(message), { code: -32602 })
}

export function apply(ctx, config) {
  const rootFiber = ctx.root.fiber
  const input = config.input ?? process.stdin
  const output = config.output ?? process.stdout
  const exit = config.exit ?? (code => process.exit(code))
  const transport = new JsonRpcLineTransport(input, output)
  const server = new HarnessSdkJsonRpcServer(ctx, transport, { maxTokensAsSuccess: config.maxTokensAsSuccess })

  let nextId = 0
  /** 等待宿主回答的事项：id → { kind, resolve, sessionId } */
  const pending = new Map()

  const sessionOf = agent => String(agent.session.id)
  /** 由 SDK 会话编号找到存活的 Agent。dsh 的 SDK 服务把会话表放在私有字段 sessions 里。 */
  const agentOf = (sessionId) => {
    const record = server.sessions?.get(sessionId)
    const agent = record?.handle.agent
    if (agent === undefined || ctx.agents.get(agent.id) !== agent) return undefined
    return agent
  }

  /** 发出一件需要宿主回答的事，返回回答；signal 中止时撤回。 */
  function ask(kind, notify, closed, payload, signal) {
    const id = kind + '-' + (++nextId)
    return new Promise((resolve, reject) => {
      const settle = (value) => {
        if (!pending.delete(id)) return
        signal?.removeEventListener('abort', onAbort)
        resolve(value)
      }
      const onAbort = () => {
        if (!pending.delete(id)) return
        transport.notify(closed, { id, withdrawn: true })
        reject(signal.reason ?? new Error('withdrawn'))
      }
      if (signal?.aborted) return reject(signal.reason ?? new Error('withdrawn'))
      signal?.addEventListener('abort', onAbort, { once: true })
      pending.set(id, { kind, resolve: settle, sessionId: payload.sessionId })
      transport.notify(notify, { id, ...payload })
    })
  }

  // ---------- 流式回复：dsh SDK 只转发落盘的会话事件，逐字显示需要这些临时片段 ----------
  ctx.on('agent/assistant-stream', ({ agent, frame }) => {
    if (server.sessions?.get(sessionOf(agent))?.handle.agent !== agent) return
    transport.notify('assistant.stream', { sessionId: sessionOf(agent), frame })
  })

  // ---------- 动作确认：外部系统中会改数据的工具，每次调用都问 ----------
  ctx.on('tools/pre-execute', (exec, next) => {
    if (exec.agent === undefined || !matchesAny(config.confirmTools, exec.name)) return next()
    return Promise.resolve(next()).then(decision => decision.kind === 'allow' ? { kind: 'ask', reason: 'confirm:' + exec.name } : decision)
  })

  ctx.on('approval/request', (request, next) => {
    if (request.agent === undefined) return next()
    const payload = {
      sessionId: sessionOf(request.agent),
      toolName: request.toolName,
      callId: request.callId,
      reason: request.reason,
    }
    return ask('approval', 'approval.request', 'approval.closed', payload, request.signal)
      .then(outcome => outcome === 'allowed-once' ? 'allowed-once' : 'rejected', () => 'cancelled')
  })

  // ---------- 模型追问 ----------
  ctx.on('user-questions/request', (request, next) => {
    if (request.agent === undefined) return next()
    const payload = { sessionId: sessionOf(request.agent), callId: request.wait?.callId, questions: request.questions }
    return ask('question', 'question.request', 'question.closed', payload, request.signal)
  })

  // ---------- 卡片 ----------
  const cards = new Map()
  const sessionOfTarget = target => typeof target?.sessionId === 'string' ? target.sessionId : sessionOf(target)
  ctx.provide('auditCards', {
    /**
     * 发出一张卡片并等用户回答。回答格式见《接口约定》5.1：{ card, action, edits, note }。
     * signal 中止（任务取消、轮次取消）时撤回卡片，并以中止原因拒绝。
     */
    open(target, card, signal) {
      if (typeof card?.card !== 'string') throw new TypeError('card.card is required')
      if (cards.has(card.card)) throw new Error('card already open: ' + card.card)
      const sessionId = sessionOfTarget(target)
      const task = card.task
      return new Promise((resolve, reject) => {
        const onAbort = () => {
          if (!cards.delete(card.card)) return
          transport.notify('card.closed', { sessionId, card: card.card, ...(task ? { task } : {}), withdrawn: true })
          reject(signal.reason ?? new Error('withdrawn'))
        }
        if (signal?.aborted) return reject(signal.reason ?? new Error('withdrawn'))
        signal?.addEventListener('abort', onAbort, { once: true })
        cards.set(card.card, {
          sessionId,
          task,
          resolve: (answer) => {
            cards.delete(card.card)
            signal?.removeEventListener('abort', onAbort)
            transport.notify('card.closed', { sessionId, card: card.card, ...(task ? { task } : {}), answer })
            resolve(answer)
          },
        })
        transport.notify('card.opened', { sessionId, card })
      })
    },
    /** 撤回一张已不在内存里的卡片（Harness 重启前发出、续跑时作废的卡片）。 */
    withdraw(sessionId, cardId, task) {
      if (cards.has(cardId)) return
      transport.notify('card.closed', { sessionId, card: cardId, ...(task ? { task } : {}), withdrawn: true })
    },
    /** 当前未回答的卡片编号。 */
    openCards: () => [...cards.keys()],
  })

  // ---------- 供其他插件扩展的请求和通知 ----------
  const extraMethods = new Map()
  ctx.provide('auditBridge', {
    notify: (method, params) => transport.notify(method, params),
    /** 注册一个宿主请求；返回注销函数。 */
    handle(method, fn) {
      if (extraMethods.has(method)) throw new Error('method already handled: ' + method)
      extraMethods.set(method, fn)
      return () => { if (extraMethods.get(method) === fn) extraMethods.delete(method) }
    },
  })

  function status() {
    // cordis FiberState.ACTIVE === 2
    const entries = [...(ctx.get('loader')?.entries?.() ?? [])].map(entry => ({
      id: entry.options.id,
      name: entry.options.name,
      active: !entry.disabled && entry.fiber?.state === 2,
    }))
    const llm = ctx.get('llm')
    const tools = ctx.get('tools')
    return {
      entries,
      providers: llm?.listProviders().map(provider => provider.id) ?? [],
      tools: tools?.schemas().map(schema => schema.name) ?? [],
      openCards: [...cards.keys()],
      pending: [...pending.entries()].map(([id, item]) => ({ id, kind: item.kind, sessionId: item.sessionId })),
    }
  }

  async function handle(method, params) {
    switch (method) {
      case 'initialize':
        // 与 dsh 的 SDK 服务相同：等全部插件（包括 MCP 工具发现）就绪后才算初始化完成。
        await ctx.get('loader')?.await()
        return server.handleRequest(method, params)
      case 'session/cancel': {
        const agent = agentOf(params?.sessionId)
        if (agent === undefined) throw invalidParams('unknown session: ' + params?.sessionId)
        const running = agent.status === 'running'
        if (running) agent.cancel({ kind: 'user' })
        return { cancelled: running }
      }
      case 'approval/respond':
      case 'question/respond': {
        const item = pending.get(params?.id)
        const kind = method === 'approval/respond' ? 'approval' : 'question'
        if (item === undefined || item.kind !== kind) throw invalidParams('nothing pending with id ' + params?.id)
        if (kind === 'approval') {
          if (!['allowed-once', 'rejected'].includes(params.outcome)) throw invalidParams('outcome must be allowed-once or rejected')
          item.resolve(params.outcome)
          transport.notify('approval.closed', { id: params.id, outcome: params.outcome })
        } else {
          if (!Array.isArray(params.answers)) throw invalidParams('answers must be an array')
          item.resolve({ answers: params.answers })
          transport.notify('question.closed', { id: params.id })
        }
        return {}
      }
      case 'card/answer': {
        const item = cards.get(params?.card)
        if (item === undefined) throw invalidParams('no open card ' + params?.card)
        if (typeof params.action !== 'string') throw invalidParams('action is required')
        item.resolve({ card: params.card, action: params.action, edits: params.edits ?? {}, note: params.note ?? '' })
        return {}
      }
      case 'bridge/status':
        return status()
      default:
        if (extraMethods.has(method)) return extraMethods.get(method)(params ?? {})
        return server.handleRequest(method, params)
    }
  }

  let exitTask
  const disposeAndExit = () => {
    exitTask ??= (async () => {
      await Promise.allSettled([Promise.resolve().then(() => transport.flush())])
      await Promise.allSettled([Promise.resolve().then(() => rootFiber.dispose())])
      exit(0)
    })()
    return exitTask
  }

  transport.onRequest(async (method, params) => {
    const result = await handle(method, params)
    if (method === 'shutdown') setImmediate(() => { void disposeAndExit() })
    return result
  })

  ctx.effect(() => {
    transport.start()
    return async () => {
      await server.shutdown()
      transport.close()
    }
  }, 'audit-host-bridge.serve')
}
