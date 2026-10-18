#!/usr/bin/env node
// 企业模型验证：在能连企业模型的电脑上运行，生成一份报告，发回来即可。
//
//   node harness/tools/verify-enterprise.mjs --url <模型地址> --model <模型名> [--python <python 路径>] [--context]
//
// API Key 从环境变量 AUDIT_LLM_API_KEY 读取；没设置时会提示输入。报告里不会出现 Key。
// 做两件事：
//   1. 直接探测接口：模型列表、普通回复、流式、工具调用、JSON 输出约束、思考字段、（可选）实际上下文窗口。
//   2. 用固定版本的 Harness + 审计工具跑一个真实小任务，同时检查除模型地址外有没有任何外连。
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DSH_VERSION, normalizeBaseURL } from '../launch.mjs'
import { startHarness } from '../test/client.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))

function argValue(name, fallback) {
  const index = process.argv.indexOf('--' + name)
  return index > 0 ? process.argv[index + 1] : fallback
}
const flag = name => process.argv.includes('--' + name)

const rawURL = argValue('url')
const modelName = argValue('model')
const python = argValue('python', process.platform === 'win32' ? 'python' : 'python3')
if (!rawURL || !modelName) {
  console.error('用法：node harness/tools/verify-enterprise.mjs --url <模型地址> --model <模型名> [--python <python 路径>] [--context]')
  process.exit(2)
}
let apiKey = process.env.AUDIT_LLM_API_KEY
if (!apiKey) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  apiKey = (await rl.question('API Key：')).trim()
  rl.close()
}

const report = {
  createdAt: new Date().toISOString(),
  dsh: DSH_VERSION,
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  proxyEnv: ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'].filter(name => process.env[name]),
  input: { url: rawURL, model: modelName },
  probes: {},
  harness: null,
  suggestions: [],
}
const mask = text => String(text ?? '').split(apiKey).join('***')
const log = (...parts) => console.log(...parts.map(mask))

async function http(url, { method = 'GET', body, stream = false, timeoutMs = 120000 } = {}) {
  const started = Date.now()
  try {
    const response = await fetch(url, {
      method,
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', accept: stream ? 'text/event-stream' : 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const text = await response.text()
    let json
    try { json = JSON.parse(text) } catch {}
    return { status: response.status, ms: Date.now() - started, text: mask(text.slice(0, 4000)), json, contentType: response.headers.get('content-type') }
  } catch (error) {
    return { status: 0, ms: Date.now() - started, error: mask(error.cause?.code ?? error.message) }
  }
}

function sseChunks(text) {
  return text.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).filter(line => line && line !== '[DONE]').map(line => { try { return JSON.parse(line) } catch { return { unparsed: line } } })
}

// ---------- 1. 地址 ----------
let base = normalizeBaseURL(rawURL)
log('探测模型列表：', base + '/models')
let models = await http(base + '/models')
if (models.status !== 200 && !/\/v\d+$/.test(base)) {
  const withV1 = await http(base + '/v1/models')
  report.probes.modelsWithoutV1 = { status: models.status, error: models.error }
  if (withV1.status === 200) { base = base + '/v1'; models = withV1 }
}
report.baseURL = base
report.probes.models = { status: models.status, ms: models.ms, error: models.error, ids: models.json?.data?.map(item => item.id).slice(0, 50), raw: models.json ? undefined : models.text }
log('  ->', models.status, models.json?.data?.length ?? '', '个模型')

const chat = base + '/chat/completions'
const say = content => [{ role: 'system', content: '你是测试助手。' }, { role: 'user', content }]

// ---------- 2. 普通回复 ----------
const plain = await http(chat, { method: 'POST', body: { model: modelName, max_tokens: 64, messages: say('用一句话介绍你自己。') } })
const plainMessage = plain.json?.choices?.[0]?.message
report.probes.plain = {
  status: plain.status, ms: plain.ms, error: plain.error ?? (plain.status !== 200 ? plain.text : undefined),
  content: plainMessage?.content, finish: plain.json?.choices?.[0]?.finish_reason, usage: plain.json?.usage,
  reasoningField: plainMessage ? Object.keys(plainMessage).filter(key => /reason|think/i.test(key)) : undefined,
  model: plain.json?.model,
}
log('普通回复：', plain.status, plainMessage?.content ?? plain.error ?? plain.text?.slice(0, 200))

// ---------- 3. 流式（带 / 不带用量） ----------
const streamBody = { model: modelName, max_tokens: 64, stream: true, messages: say('数到五。') }
const streamUsage = await http(chat, { method: 'POST', stream: true, body: { ...streamBody, stream_options: { include_usage: true } } })
const chunks = streamUsage.status === 200 ? sseChunks(streamUsage.text) : []
report.probes.streamWithUsage = {
  status: streamUsage.status, ms: streamUsage.ms, contentType: streamUsage.contentType, chunks: chunks.length,
  usage: chunks.find(chunk => chunk.usage)?.usage, finish: chunks.map(chunk => chunk.choices?.[0]?.finish_reason).filter(Boolean),
  reasoningDelta: chunks.some(chunk => Object.keys(chunk.choices?.[0]?.delta ?? {}).some(key => /reason|think/i.test(key))),
  error: streamUsage.status !== 200 ? (streamUsage.error ?? streamUsage.text) : undefined,
}
if (streamUsage.status !== 200) {
  const streamPlain = await http(chat, { method: 'POST', stream: true, body: streamBody })
  report.probes.streamWithoutUsage = { status: streamPlain.status, error: streamPlain.status !== 200 ? (streamPlain.error ?? streamPlain.text) : undefined }
  if (streamPlain.status === 200) report.suggestions.push('网关不接受 stream_options：配置层 compat 加 supportsUsageInStreaming: false')
}
log('流式：', streamUsage.status, chunks.length, '个片段')

// ---------- 4. 工具调用（两轮：调用 → 回传结果） ----------
const tools = [{ type: 'function', function: { name: 'get_balance', description: '查询科目余额', parameters: { type: 'object', properties: { account: { type: 'string', description: '科目编码' } }, required: ['account'] } } }]
const toolAsk = say('请调用 get_balance 查询科目 1122 的余额，不要直接回答。')
const call1 = await http(chat, { method: 'POST', body: { model: modelName, max_tokens: 256, tools, tool_choice: 'auto', messages: toolAsk } })
const toolMessage = call1.json?.choices?.[0]?.message
const toolCall = toolMessage?.tool_calls?.[0]
report.probes.toolCall = {
  status: call1.status, finish: call1.json?.choices?.[0]?.finish_reason, error: call1.status !== 200 ? (call1.error ?? call1.text) : undefined,
  nativeToolCall: Boolean(toolCall), name: toolCall?.function?.name, arguments: toolCall?.function?.arguments,
  argumentsType: typeof toolCall?.function?.arguments, textInstead: toolCall ? undefined : toolMessage?.content,
}
if (toolCall) {
  const followUp = [...toolAsk, { role: 'assistant', content: toolMessage.content ?? null, tool_calls: toolMessage.tool_calls }, { role: 'tool', tool_call_id: toolCall.id, content: '{"account":"1122","closing":"35000.00"}' }]
  const call2 = await http(chat, { method: 'POST', body: { model: modelName, max_tokens: 128, tools, messages: followUp } })
  report.probes.toolResult = { status: call2.status, content: call2.json?.choices?.[0]?.message?.content, error: call2.status !== 200 ? (call2.error ?? call2.text) : undefined }
  if (call2.status !== 200) {
    const named = followUp.map(message => message.role === 'tool' ? { ...message, name: toolCall.function.name } : message)
    const call3 = await http(chat, { method: 'POST', body: { model: modelName, max_tokens: 128, tools, messages: named } })
    report.probes.toolResultWithName = { status: call3.status }
    if (call3.status === 200) report.suggestions.push('工具结果需要带 name：compat 加 requiresToolResultName: true')
  }
} else {
  report.suggestions.push('模型没有返回标准 tool_calls，Harness 无法调用审计工具，需要先确认网关是否开启工具调用')
}
log('工具调用：', call1.status, toolCall ? `${toolCall.function?.name}(${toolCall.function?.arguments})` : '没有标准 tool_calls')

// ---------- 5. JSON 输出约束（以后编排插件的结构化输出要用） ----------
const schema = { type: 'object', properties: { period: { type: 'string' }, unit: { type: 'string' } }, required: ['period', 'unit'], additionalProperties: false }
const jsonSchema = await http(chat, { method: 'POST', body: { model: modelName, max_tokens: 128, messages: say('表头写着“2025年12月31日 单位：万元”。给出期间和单位。'), response_format: { type: 'json_schema', json_schema: { name: 'basis', schema, strict: true } } } })
const jsonObject = await http(chat, { method: 'POST', body: { model: modelName, max_tokens: 128, messages: say('用 JSON 回答：表头写着“2025年12月31日 单位：万元”，给出 period 和 unit。'), response_format: { type: 'json_object' } } })
report.probes.responseFormat = {
  jsonSchema: { status: jsonSchema.status, content: jsonSchema.json?.choices?.[0]?.message?.content, error: jsonSchema.status !== 200 ? (jsonSchema.error ?? jsonSchema.text?.slice(0, 500)) : undefined },
  jsonObject: { status: jsonObject.status, content: jsonObject.json?.choices?.[0]?.message?.content, error: jsonObject.status !== 200 ? (jsonObject.error ?? jsonObject.text?.slice(0, 500)) : undefined },
}
log('JSON 约束：json_schema', jsonSchema.status, '/ json_object', jsonObject.status)

// ---------- 6. developer 角色 ----------
const developer = await http(chat, { method: 'POST', body: { model: modelName, max_tokens: 16, messages: [{ role: 'developer', content: '只回答 OK。' }, { role: 'user', content: 'hi' }] } })
report.probes.developerRole = { status: developer.status }

// ---------- 7. 实际上下文窗口（可选，消耗较多 token） ----------
if (flag('context')) {
  report.probes.context = []
  for (const chars of [60000, 100000, 120000]) {
    const filler = '审计底稿数据行。'.repeat(Math.ceil(chars / 8)).slice(0, chars)
    const probe = await http(chat, { method: 'POST', timeoutMs: 300000, body: { model: modelName, max_tokens: 16, messages: say(filler + '\n以上内容不用理会，只回答 OK。') } })
    report.probes.context.push({ chars, status: probe.status, promptTokens: probe.json?.usage?.prompt_tokens, error: probe.status !== 200 ? (probe.error ?? probe.text?.slice(0, 300)) : undefined })
    log('上下文', chars, '字：', probe.status, probe.json?.usage?.prompt_tokens ?? '')
    if (probe.status !== 200) break
  }
}

// ---------- 8. Harness + 审计工具跑一个真实小任务 ----------
if (report.probes.plain.status === 200 && report.probes.toolCall.nativeToolCall) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-verify-'))
  const project = path.join(work, 'project')
  fs.mkdirSync(project)
  const made = spawnSync(python, ['-c', `import pandas as pd; pd.DataFrame({'科目':['1001','1002','1122'],'名称':['库存现金','银行存款','应收账款'],'期末余额':[100.5,2000,35000]}).to_excel(r'''${path.join(project, '余额表.xlsx')}''', index=False)`], { encoding: 'utf8' })
  if (made.status !== 0) {
    report.harness = { skipped: '生成样例表格失败，Python 需要 pandas 和 openpyxl：' + (made.stderr || made.error?.message) }
  } else {
    const egressLog = path.join(work, 'egress.log')
    const host = new URL(base).hostname
    const started = Date.now()
    const harness = startHarness({
      projectRoot: project, dataDir: path.join(work, 'data'), baseURL: base, apiKey, model: modelName, python,
      env: { AUDIT_EGRESS_LOG: egressLog, AUDIT_EGRESS_ALLOW: host },
    }, { nodeOptions: `--import=${pathToFileURL(path.join(here, 'egress-guard.mjs')).href}` })
    const result = { startedMs: 0 }
    try {
      await harness.request('initialize', harness.launch.initialize)
      result.startedMs = Date.now() - started
      const status = await harness.request('bridge/status', {})
      result.tools = status.tools.length
      await harness.request('session/prompt', { sessionId: 'S-verify', contentBlocks: [{ type: 'text', text: '项目里有一份 余额表.xlsx。请用 select_column 工具提取“科目”和“期末余额”两列（folder_path 填 余额表.xlsx，should_merge 填 是，sheet_keywords 留空），然后告诉我一共提取了几行、应收账款期末余额是多少。' }] })
      await Promise.race([
        harness.request('session/wait', { sessionId: 'S-verify' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('超过 5 分钟没有完成')), 300000)),
      ])
      const events = harness.events('S-verify')
      const calls = events.filter(e => e.type === 'tool/call').map(e => ({ name: e.data.name, arguments: e.data.arguments }))
      const results = events.filter(e => e.type === 'tool/result').map(e => (e.data.message.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('').slice(0, 600))
      const answers = events.filter(e => e.type === 'assistant/message').map(e => (e.data.message.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('')).filter(Boolean)
      Object.assign(result, {
        totalMs: Date.now() - started, calls, results, answer: answers.at(-1),
        turnEnd: events.filter(e => e.type === 'turn/end').at(-1)?.data.reason,
        errors: events.filter(e => /error|attempt/.test(e.type)).map(e => ({ type: e.type, data: JSON.stringify(e.data).slice(0, 500) })),
      })
    } catch (error) {
      result.error = mask(error.message)
    } finally {
      await harness.stop()
      result.stderrTail = mask(harness.stderr().slice(-3000))
    }
    const egress = fs.existsSync(egressLog) ? fs.readFileSync(egressLog, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : []
    result.egress = { allowedHosts: [...new Set(egress.filter(e => e.allowed).map(e => e.host))], blocked: egress.filter(e => !e.allowed) }
    report.harness = result
    log('Harness 任务：', result.error ?? `${result.calls?.length ?? 0} 次工具调用，用时 ${result.totalMs} 毫秒`)
    log('外连：允许', result.egress.allowedHosts.join(', ') || '无', '；拦下', result.egress.blocked.length, '次')
  }
} else {
  report.harness = { skipped: '普通回复或工具调用没通过，先不跑 Harness' }
}

const out = path.resolve(argValue('out', `verify-report-${new Date().toISOString().slice(0, 10)}.json`))
fs.writeFileSync(out, mask(JSON.stringify(report, null, 2)))
console.log('\n报告已写到：' + out + '\n请把这个文件发回来。')

