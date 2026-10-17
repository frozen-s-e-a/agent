// 测试用的外部 MCP 服务（stdio）：一个只读查询工具、一个会改数据的审批工具。
// 每次调用审批工具都在 FAKE_MCP_LOG 指定的文件里记一行，测试据此判断有没有真的执行。
import fs from 'node:fs'
import readline from 'node:readline'

const tools = [
  { name: 'query_expense', description: '按单号查询报销单', inputSchema: { type: 'object', properties: { billNo: { type: 'string' } }, required: ['billNo'] } },
  { name: 'approve', description: '审批报销单', inputSchema: { type: 'object', properties: { billNo: { type: 'string' }, opinion: { type: 'string' } }, required: ['billNo', 'opinion'] } },
]

const write = message => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n')

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const msg = JSON.parse(line)
  if (msg.id === undefined) return
  switch (msg.method) {
    case 'initialize':
      return write({ id: msg.id, result: { protocolVersion: msg.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'oa-mcp', version: '1.4.0' } } })
    case 'tools/list':
      return write({ id: msg.id, result: { tools } })
    case 'tools/call': {
      const { name, arguments: args } = msg.params
      if (name === 'approve' && process.env.FAKE_MCP_LOG) fs.appendFileSync(process.env.FAKE_MCP_LOG, JSON.stringify(args) + '\n')
      const text = name === 'approve' ? `已审批 ${args.billNo}` : `报销单 ${args.billNo}：金额 3260.00`
      return write({ id: msg.id, result: { content: [{ type: 'text', text }] } })
    }
    case 'ping':
      return write({ id: msg.id, result: {} })
    default:
      return write({ id: msg.id, error: { code: -32601, message: 'method not found' } })
  }
})
