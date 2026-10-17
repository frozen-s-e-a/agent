// 假审计工具服务（MCP，标准输入输出，换行分帧）：按《接口约定》第三节的信封返回场景里的固定结果。
// 编排线在审计工具线交付新工具之前用它测试（《接口约定》第六节）。
//   FAKE_TOOLS_SCENARIO  场景模块路径（导出 createScenario(options) → { tools }）
//   FAKE_TOOLS_OPTIONS   场景选项（JSON）
//   FAKE_TOOLS_LOG       调用记录文件（每行 { tool, args }），可选
//   FAKE_TOOLS_STATE     场景状态文件，可选；真实工具把结果存在项目库里，Harness 重启后结果编号仍可用，这里用文件模拟
import fs from 'node:fs'
import readline from 'node:readline'
import { pathToFileURL } from 'node:url'

const PROTOCOL_VERSIONS = ['2026-07-28', '2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']
const { createScenario } = await import(pathToFileURL(process.env.FAKE_TOOLS_SCENARIO).href)
const scenario = createScenario(JSON.parse(process.env.FAKE_TOOLS_OPTIONS || '{}'))
const log = process.env.FAKE_TOOLS_LOG
const stateFile = process.env.FAKE_TOOLS_STATE
if (stateFile && fs.existsSync(stateFile)) Object.assign(scenario.state, JSON.parse(fs.readFileSync(stateFile, 'utf8')))

const send = message => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n')

function handle(method, params) {
  if (method === 'initialize') {
    const requested = params?.protocolVersion
    return {
      protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'fake-audit-tools', version: '0.0.0' },
    }
  }
  if (method === 'ping') return {}
  if (method === 'tools/list') {
    return { tools: Object.keys(scenario.tools).map(name => ({ name, description: `假工具 ${name}`, inputSchema: { type: 'object', additionalProperties: true } })) }
  }
  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params
    if (log) fs.appendFileSync(log, JSON.stringify({ tool: name, args }) + '\n')
    const handler = scenario.tools[name]
    const envelope = handler ? handler(args) : { ok: false, error: { code: 'ARG_UNKNOWN_TOOL', message: '未知工具：' + name } }
    if (stateFile) fs.writeFileSync(stateFile, JSON.stringify(scenario.state))
    return { content: [{ type: 'text', text: JSON.stringify(envelope) }], structuredContent: envelope, isError: !envelope.ok }
  }
  return undefined
}

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return
  let message
  try { message = JSON.parse(line) } catch { return }
  if (message.id === undefined) return
  try {
    const result = handle(message.method, message.params)
    if (result === undefined) send({ id: message.id, error: { code: -32601, message: 'method not found: ' + message.method } })
    else send({ id: message.id, result })
  } catch (error) {
    send({ id: message.id, error: { code: -32603, message: error.message } })
  }
})
