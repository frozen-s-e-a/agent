// 测试用的宿主端：启动 Harness，收发换行分帧的 JSON-RPC。
import { spawn } from 'node:child_process'
import { harnessLaunch } from '../launch.mjs'

export function startHarness(launchOptions, { nodeOptions } = {}) {
  const launch = harnessLaunch(launchOptions)
  if (nodeOptions) launch.options.env.NODE_OPTIONS = [launch.options.env.NODE_OPTIONS, nodeOptions].filter(Boolean).join(' ')
  const child = spawn(launch.command, launch.args, launch.options)
  const notifications = []
  const waiters = []
  const pending = new Map()
  let stderr = ''
  let buffer = ''
  let nextId = 0
  child.stderr.on('data', chunk => { stderr += chunk })
  child.stdout.on('data', (chunk) => {
    buffer += chunk
    let index
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index)
      buffer = buffer.slice(index + 1)
      if (!line.trim()) continue
      let message
      try { message = JSON.parse(line) } catch { continue }
      if (message.id !== undefined && message.method === undefined) {
        const request = pending.get(message.id)
        pending.delete(message.id)
        if (message.error) request?.reject(Object.assign(new Error(message.error.message), { code: message.error.code }))
        else request?.resolve(message.result)
      } else if (message.method) {
        notifications.push(message)
        for (const waiter of [...waiters]) {
          if (waiter.match(message)) {
            waiters.splice(waiters.indexOf(waiter), 1)
            waiter.resolve(message)
          }
        }
      }
    }
  })
  const exited = new Promise(resolve => child.on('exit', (code, signal) => {
    // 进程退了还没回的请求直接失败，带上 stderr，免得测试一直等
    for (const [id, request] of pending) {
      pending.delete(id)
      request.reject(new Error(`harness exited (code ${code}, signal ${signal})\n--- stderr ---\n${stderr.slice(-4000)}`))
    }
    resolve({ code, signal })
  }))

  function request(method, params) {
    if (child.exitCode !== null || child.signalCode !== null) return Promise.reject(new Error(`harness already exited\n--- stderr ---\n${stderr.slice(-4000)}`))
    const id = ++nextId
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
  }

  /** 等一条满足条件的通知（包括已经收到的）。 */
  function waitFor(match, timeoutMs = 60000, label = 'notification') {
    const seen = notifications.find(match)
    if (seen) return Promise.resolve(seen)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${label}\n--- stderr ---\n${stderr.slice(-4000)}`)), timeoutMs)
      waiters.push({ match, resolve: (message) => { clearTimeout(timer); resolve(message) } })
    })
  }

  /** 会话事件（session.event 的 event 部分）。 */
  const events = sessionId => notifications
    .filter(n => n.method === 'session.event' && (sessionId === undefined || n.params.sessionId === sessionId))
    .map(n => n.params.event)

  async function stop() {
    if (child.exitCode === null) {
      request('shutdown').catch(() => {})
      const timer = setTimeout(() => child.kill('SIGKILL'), 10000)
      await exited
      clearTimeout(timer)
    }
  }

  return { child, launch, request, waitFor, events, notifications, stop, exited, stderr: () => stderr }
}

/** 等某个会话回到空闲（一轮结束）。从 since 条通知之后找。 */
export function waitIdle(harness, sessionId, since = 0, timeoutMs = 60000) {
  return harness.waitFor(
    message => message.method === 'session.status' && message.params.sessionId === sessionId && message.params.status === 'idle' && harness.notifications.indexOf(message) >= since,
    timeoutMs, `idle ${sessionId}`)
}
