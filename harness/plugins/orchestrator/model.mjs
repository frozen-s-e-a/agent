// 编排节点的模型调用：每个节点一次干净的单轮请求（设计第三节 3.3、第十二节）。
// - 结构化输出：给模型一个 submit 工具，参数 schema 即节点输出 schema；不调用工具时从文字里取 JSON。
//   dsh 的模型请求不支持 response_format，企业网关是否支持也未知，这两条路都能用。
// - 校验不通过时把错误回填重做，最多 2 次（设计 11.3）。
// - 输入按预算裁剪，固定锚点不动；裁剪写进调用记录，不静默截断（设计第十二节）。
import { extractJson, validate } from './schema.mjs'

/** 设计 11.2 的按角色设参（初始值）。 */
export const ROLES = {
  router: { temperature: 0, maxTokens: 2000 },
  extractor: { temperature: 0, maxTokens: 4000 },
  planner: { temperature: 0.2, maxTokens: 4000 },
  judge: { temperature: 0, maxTokens: 2000 },
  writer: { temperature: 0.3, maxTokens: 2000 },
}

export class ModelError extends Error {
  constructor(message, { code, unavailable = false, errors } = {}) {
    super(message)
    this.code = code
    this.unavailable = unavailable
    this.errors = errors
  }
}

// 服务不可用一类：挂起任务，恢复后从检查点续跑（设计第十三节失败矩阵）。
const UNAVAILABLE = new Set(['NETWORK', 'TIMEOUT', 'RATE_LIMIT', 'SERVER', 'OVERLOADED', 'UNAVAILABLE', 'AUTH', 'MISSING_CREDENTIAL', 'QUOTA', 'NO_ADAPTER'])

/** 粗估 token：汉字按 1，其余字符按 0.3。只用于预算裁剪，不用于计费。 */
export function estimateTokens(text) {
  let cjk = 0
  for (const ch of text) if (ch.codePointAt(0) > 0x2e80) cjk++
  return Math.ceil(cjk + (text.length - cjk) * 0.3)
}

/**
 * 把输入裁到预算内：反复把最长的数组减半、把最长的字符串截短。keep 里的顶层字段（固定锚点）不动。
 * @returns {{ value, trimmed: string[] }}
 */
export function fitInput(input, budget, keep = ['anchors']) {
  const value = structuredClone(input)
  const trimmed = []
  for (let round = 0; round < 60 && estimateTokens(JSON.stringify(value)) > budget; round++) {
    let best
    const visit = (node, path) => {
      if (Array.isArray(node)) {
        if (node.length > 1 && (!best || JSON.stringify(node).length > best.size)) best = { node, path, size: JSON.stringify(node).length, kind: 'array' }
        node.forEach((item, index) => visit(item, `${path}[${index}]`))
      } else if (node && typeof node === 'object') {
        for (const [key, item] of Object.entries(node)) {
          if (path === '$' && keep.includes(key)) continue
          visit(item, `${path}.${key}`)
        }
      }
    }
    visit(value, '$')
    if (!best) break
    const keepCount = Math.max(1, Math.floor(best.node.length / 2))
    trimmed.push(`${best.path}: ${best.node.length} → ${keepCount} 项`)
    best.node.splice(keepCount)
  }
  return { value, trimmed }
}

export function createModel({ llm, provider, model, store, inputBudget = 4000, maxRepairs = 2 }) {
  async function once({ system, text, schema, role, signal }) {
    const params = ROLES[role] ?? ROLES.planner
    const tools = schema ? [{ name: 'submit', description: '提交本节点的结果（唯一的输出方式）。', parameters: schema }] : undefined
    const started = Date.now()
    let out = ''
    let usage
    const calls = new Map()
    for await (const chunk of llm.stream({
      provider, model, system,
      messages: [{ role: 'user', content: [{ type: 'text', text }] }],
      ...(tools ? { tools } : {}),
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      signal,
    })) {
      if (chunk.type === 'text-delta') out += chunk.text
      else if (chunk.type === 'tool-call-delta') {
        const call = calls.get(chunk.id) ?? { name: '', args: '' }
        if (chunk.name) call.name = chunk.name
        call.args += chunk.argumentsDelta ?? ''
        calls.set(chunk.id, call)
      } else if (chunk.type === 'usage') usage = chunk.usage
      else if (chunk.type === 'finish') {
        if (chunk.reason.kind === 'aborted') throw signal?.reason ?? new ModelError('模型请求已取消', { code: 'ABORTED' })
        if (chunk.reason.kind === 'error') {
          const code = chunk.reason.failure?.code
          throw new ModelError(`模型请求失败：${chunk.reason.failure?.message ?? code}`, { code, unavailable: UNAVAILABLE.has(code) || code === undefined })
        }
      }
    }
    const submit = [...calls.values()].find(call => call.name === 'submit')
    return { text: out, submit: submit?.args, usage, ms: Date.now() - started }
  }

  /**
   * 调用一个编排节点。
   * @param {object} request
   * @param {string} request.task 任务编号（调用记录写到任务目录）
   * @param {string} request.node 节点名，写进系统提示词，便于调用日志和测试区分
   * @param {string} [request.region]
   * @param {string} request.role ROLES 之一
   * @param {string} request.prompt 角色提示词；request.version 其版本
   * @param {object} request.input 节点输入（JSON）；anchors 字段为固定锚点
   * @param {object} [request.schema] 输出 schema；省略时返回文字
   * @param {(value) => string[]} [request.check] 结构之外的代码校验，返回错误清单
   */
  async function call({ task, node, region, role, prompt, version, input, schema, check, signal }) {
    const { value: fitted, trimmed } = fitInput(input, inputBudget)
    const system = `${prompt}\n\n【编排节点:${node}】${schema ? '\n只通过调用 submit 工具提交结果，不要输出其他内容。' : ''}`
    let feedback
    for (let attempt = 1; attempt <= maxRepairs + 1; attempt++) {
      signal?.throwIfAborted()
      const payload = feedback ? { ...fitted, 上次输出: feedback.raw, 上次输出的问题: feedback.errors } : fitted
      const text = JSON.stringify(payload, null, 1)
      const result = await once({ system, text, schema, role, signal })
      let value = result.text
      let errors = []
      if (schema) {
        const raw = result.submit ?? result.text
        value = typeof raw === 'string' ? (result.submit !== undefined ? safeParse(raw) : extractJson(raw)) : raw
        if (value === undefined) errors = ['没有可解析的 JSON 结果，请调用 submit 工具提交']
        else errors = validate(schema, value)
      }
      if (!errors.length && check) errors = check(value) ?? []
      store?.appendCall(task, {
        at: new Date().toISOString(), node, region, role, promptVersion: version, attempt,
        input: payload, trimmed, output: result.submit ?? result.text, usage: result.usage, ms: result.ms, errors,
      })
      if (!errors.length) return value
      feedback = { raw: String(result.submit ?? result.text).slice(0, 2000), errors }
    }
    throw new ModelError(`${node} 的输出 ${maxRepairs + 1} 次都没有通过校验：${feedback.errors.join('；')}`, { code: 'FORMAT', errors: feedback.errors })
  }

  return { call }
}

function safeParse(text) {
  try { return JSON.parse(text) } catch { return extractJson(text) }
}
