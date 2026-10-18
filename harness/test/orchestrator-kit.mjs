// 编排流程的进程内测试工具：真实的 flow / model / tools / store，替换掉 dsh 的模型服务、工具注册表和桥接插件。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { TaskRunner, newTaskState } from '../plugins/orchestrator/flow.mjs'
import { createModel } from '../plugins/orchestrator/model.mjs'
import { Store } from '../plugins/orchestrator/store.mjs'
import { createToolCaller } from '../plugins/orchestrator/tools.mjs'
import { FILES, PROMPT, createScenario } from './scenarios/receivables.mjs'

/** 按系统提示词里的节点名调用场景的 respond，产出 dsh 模型流的分片。 */
export function stubLlm(respond, calls) {
  return {
    async *stream(options) {
      const node = options.system.match(/【编排节点:(\w+)】/)?.[1]
      const input = JSON.parse(options.messages[0].content[0].text)
      calls.push({ node, input, options })
      if (respond.unavailable?.(node)) {
        yield { type: 'finish', reason: { kind: 'error', failure: { code: 'NETWORK', message: 'connect ECONNREFUSED' } } }
        return
      }
      const out = respond(node, input)
      if (out.submit !== undefined) yield { type: 'tool-call-delta', index: 0, id: 'call_1', name: 'submit', argumentsDelta: JSON.stringify(out.submit) }
      if (out.text !== undefined) yield { type: 'text-delta', index: 0, text: out.text }
      yield { type: 'usage', usage: { inputTokens: 10, outputTokens: 5 } }
      yield { type: 'finish', reason: { kind: out.submit !== undefined ? 'tool-calls' : 'stop' } }
    },
  }
}

/** 与 dsh ToolRuntime.execute 的结果形状一致。 */
export function stubTools(handlers, calls) {
  return {
    async execute({ name, arguments: args, signal }) {
      signal?.throwIfAborted()
      const tool = name.replace(/^mcp__audit__/, '')
      calls.push({ tool, args: structuredClone(args) })
      await new Promise(resolve => setImmediate(resolve))
      const handler = handlers[tool]
      if (!handler) return { isError: true, error: { code: 'UNKNOWN_TOOL', message: 'unknown tool ' + name }, content: [{ type: 'text', text: 'unknown tool' }] }
      const envelope = handler(structuredClone(args))
      const content = [{ type: 'text', text: JSON.stringify(envelope) }]
      return envelope.ok ? { isError: false, value: { content, structuredContent: envelope }, content } : { isError: true, error: { code: 'TOOL_FAILED', message: content[0].text }, content }
    },
  }
}

/** 桥接插件 auditCards 的替身：记录卡片，测试按卡片类型自动或手动回答。 */
export function stubCards(notify) {
  const open = new Map()
  const listeners = []
  return {
    open(target, card, signal) {
      return new Promise((resolve, reject) => {
        const onAbort = () => {
          open.delete(card.card)
          notify('card.closed', { sessionId: target.sessionId, card: card.card, task: card.task, withdrawn: true })
          reject(signal.reason)
        }
        if (signal?.aborted) return reject(signal.reason)
        signal?.addEventListener('abort', onAbort, { once: true })
        open.set(card.card, { card, resolve: (answer) => {
          open.delete(card.card)
          signal?.removeEventListener('abort', onAbort)
          notify('card.closed', { sessionId: target.sessionId, card: card.card, task: card.task, answer })
          resolve(answer)
        } })
        notify('card.opened', { sessionId: target.sessionId, card })
        for (const listener of listeners) listener(card)
      })
    },
    withdraw(sessionId, card, task) { notify('card.closed', { sessionId, card, task, withdrawn: true }) },
    answer(id, answer) {
      const item = open.get(id)
      if (!item) throw new Error('no open card ' + id)
      item.resolve({ card: id, action: answer.action ?? 'confirm', edits: answer.edits ?? {}, note: answer.note ?? '' })
    },
    onOpen(listener) { listeners.push(listener) },
    openCards: () => [...open.keys()],
  }
}

/** 默认的卡片回答：全部按建议确认。answers[kind] 可覆盖，返回 null 表示不自动回答。 */
export function autoAnswer(cards, answers = {}) {
  cards.onOpen((card) => {
    const custom = answers[card.kind]
    // 结果卡不阻塞流程，用户通常不回答；默认不自动回答
    const fallback = card.kind === 'result_summary' ? null : { action: card.defaultAction ?? 'confirm' }
    const answer = typeof custom === 'function' ? custom(card) : card.kind in answers ? custom : fallback
    if (answer) setImmediate(() => { if (cards.openCards().includes(card.card)) cards.answer(card.card, answer) })
  })
}

export function makeKit({ options = {}, config = {}, dir } = {}) {
  const scenario = createScenario(options)
  const stateDir = dir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'audit-orch-'))
  const store = new Store(stateDir)
  const notifications = []
  const modelCalls = []
  const toolCalls = []
  const notify = (method, params) => notifications.push({ method, params })
  const cards = stubCards(notify)
  const respond = Object.assign((node, input) => scenario.respond(node, input), { unavailable: options.unavailable })
  const model = createModel({ llm: stubLlm(respond, modelCalls), provider: 'enterprise', model: 'audit-fixture', store })
  const tools = createToolCaller({ tools: stubTools(scenario.tools, toolCalls) })
  const fullConfig = { samples: 1, recompute: true, maxAttempts: 3, maxReidentify: 2, trivialThreshold: '0', ...config }
  const create = ({ sessionId = 'S-test', text = PROMPT, files = Object.values(FILES) } = {}) => {
    const state = newTaskState({ task: store.newTaskId(), sessionId, text, files })
    store.save(state)
    const runner = new TaskRunner({ state, store, tools, model, cards, notify, config: fullConfig })
    runner.emit('task.created', { text, files: state.files })
    return runner
  }
  const resume = (task) => new TaskRunner({ state: store.load(task), store, tools, model, cards, notify, config: fullConfig })
  const events = (task) => notifications.filter(n => n.method === 'task.event' && (!task || n.params.task === task)).map(n => n.params)
  const cardsOpened = () => notifications.filter(n => n.method === 'card.opened').map(n => n.params.card)
  const until = async (check, timeoutMs = 5000) => {
    const end = Date.now() + timeoutMs
    while (!check()) {
      if (Date.now() > end) throw new Error('condition not met in time')
      await new Promise(resolve => setTimeout(resolve, 5))
    }
  }
  return { scenario, store, stateDir, notifications, modelCalls, toolCalls, cards, create, resume, events, cardsOpened, until, config: fullConfig }
}
