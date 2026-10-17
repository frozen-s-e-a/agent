// OpenAI 兼容格式的假模型服务，供 Harness 接入测试使用。
// 每次 /chat/completions 请求按顺序取剧本里的一步作答；剧本用完后回答“完成”。
// 剧本的一步可以是：
//   { text }                       普通回复
//   { tools: [{ name, args }] }    要求调用工具
//   { hold: true }                 不作答，直到请求被取消（测试中途取消）
//   (body) => 上面任一种            按请求内容决定
import http from 'node:http'

export async function fakeModel({ script = [], models = ['audit-fixture'] } = {}) {
  const requests = []
  const steps = [...script]
  const server = http.createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    const body = raw ? JSON.parse(raw) : null
    requests.push({ method: req.method, url: req.url, headers: req.headers, body })
    if (req.method === 'GET' && req.url.endsWith('/models')) {
      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ object: 'list', data: models.map(id => ({ id, object: 'model' })) }))
    }
    if (req.method !== 'POST' || !req.url.endsWith('/chat/completions')) {
      res.writeHead(404)
      return res.end('{}')
    }
    let step = steps.length ? steps.shift() : { text: '完成' }
    if (typeof step === 'function') step = step(body)
    if (step.hold) {
      req.on('close', () => res.destroy())
      res.on('close', () => {})
      return
    }
    const id = 'chatcmpl-' + requests.length
    const toolCalls = (step.tools ?? []).map((call, index) => ({
      index, id: 'call_' + requests.length + '_' + index, type: 'function',
      function: { name: call.name, arguments: JSON.stringify(call.args ?? {}) },
    }))
    const finish = toolCalls.length ? 'tool_calls' : 'stop'
    const usage = { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 }
    if (!body.stream) {
      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({
        id, object: 'chat.completion', model: body.model,
        choices: [{ index: 0, finish_reason: finish, message: { role: 'assistant', content: step.text ?? null, ...(toolCalls.length ? { tool_calls: toolCalls.map(({ index, ...call }) => call) } : {}) } }],
        usage,
      }))
    }
    res.setHeader('Content-Type', 'text/event-stream')
    const emit = value => res.write('data: ' + JSON.stringify({ id, object: 'chat.completion.chunk', model: body.model, ...value }) + '\n\n')
    if (step.text) emit({ choices: [{ index: 0, delta: { role: 'assistant', content: step.text }, finish_reason: null }] })
    if (toolCalls.length) emit({ choices: [{ index: 0, delta: { role: 'assistant', tool_calls: toolCalls }, finish_reason: null }] })
    emit({ choices: [{ index: 0, delta: {}, finish_reason: finish }] })
    if (body.stream_options?.include_usage) emit({ choices: [], usage })
    res.end('data: [DONE]\n\n')
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return {
    baseURL: `http://127.0.0.1:${server.address().port}/v1`,
    requests,
    chats: () => requests.filter(r => r.url.endsWith('/chat/completions')).map(r => r.body),
    push: (...more) => steps.push(...more),
    close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve) }),
  }
}
