// 编排插件调用审计工具服务（MCP，挂载名 audit）。经 dsh 的工具注册表执行，不带 agent：
// 走全局视图，所以对模型隐藏的编排专用工具（见 index.mjs）这里照样能调。
// 每次调用推送 tool.started / tool.finished（《接口约定》4.8，带 task）。
import { extractJson } from './schema.mjs'

export class ToolError extends Error {
  constructor(error) {
    super(error.message ?? error.code)
    this.code = error.code
    this.where = error.where
    this.hint = error.hint
    this.retryable = error.retryable
    this.envelope = { ok: false, error }
  }
}

function oneLine(value, limit = 80) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.length > limit ? text.slice(0, limit - 1) + '…' : text
}

export function argsSummary(args) {
  return oneLine(Object.entries(args ?? {}).map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`).join(', '))
}

function resultSummary(envelope) {
  if (!envelope.ok) return oneLine(`${envelope.error?.code ?? 'ERROR'}：${envelope.error?.message ?? ''}`)
  const data = envelope.data ?? {}
  const parts = []
  if (envelope.refs?.length) parts.push(envelope.refs.join('、'))
  for (const key of ['rows', 'cells', 'passed']) if (data[key] !== undefined) parts.push(`${key}=${data[key]}`)
  if (envelope.truncated) parts.push('已截断')
  return oneLine(parts.join('；') || '完成')
}

/** MCP 结果 → 《接口约定》2.4 的信封。 */
export function envelopeOf(result) {
  if (result.isError) {
    const text = (result.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('\n')
    const parsed = extractJson(text)
    if (parsed && parsed.ok === false && parsed.error) return parsed
    return { ok: false, error: { code: result.error?.code === 'UNKNOWN_TOOL' ? 'ENV_TOOL_MISSING' : 'TOOL_FAILED', message: result.error?.message ?? text } }
  }
  const value = result.value ?? {}
  if (value.structuredContent && typeof value.structuredContent === 'object' && 'ok' in value.structuredContent) return value.structuredContent
  const text = (value.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('\n')
  const parsed = extractJson(text)
  if (parsed && typeof parsed === 'object' && 'ok' in parsed) return parsed
  return { ok: true, data: parsed ?? text, warnings: [], refs: [], truncated: false, next: null }
}

export function createToolCaller({ tools, server = 'audit' }) {
  let seq = 0
  /**
   * @param {string} name 工具名（不带 mcp__audit__ 前缀）
   * @param {object} args
   * @param {{ signal: AbortSignal, emit?: Function, region?: string }} options
   * @returns {Promise<object>} 成功信封；失败时抛 ToolError（带错误分类 code）
   */
  async function call(name, args, { signal, emit, region } = {}) {
    const tool = `mcp__${server}__${name}`
    const callId = `orch-${Date.now().toString(36)}-${++seq}`
    const started = Date.now()
    emit?.('tool.started', { call: callId, tool, system: '审计工具', argsSummary: argsSummary(args), ...(region ? { region } : {}) })
    const result = await tools.execute({ callId, name: tool, arguments: args, signal })
    if (signal?.aborted) throw signal.reason ?? new Error('aborted')
    const envelope = envelopeOf(result)
    emit?.('tool.finished', { call: callId, ok: envelope.ok, resultSummary: resultSummary(envelope), refs: envelope.refs ?? [], durationMs: Date.now() - started })
    if (!envelope.ok) throw new ToolError(envelope.error ?? { code: 'TOOL_FAILED', message: '工具调用失败' })
    return envelope
  }
  return { call }
}
