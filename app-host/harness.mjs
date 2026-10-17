// 一个 Harness 进程：按 harness/launch.mjs 启动，在标准输入输出上按行收发 JSON-RPC（接口约定 1.1）。
// 一个进程只服务一个项目；切换项目时宿主换进程。
import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { harnessLaunch } from '../harness/launch.mjs'

export class HarnessProcess extends EventEmitter {
  /** @param {Parameters<typeof harnessLaunch>[0]} options */
  constructor(options) {
    super()
    this.options = options
    this.pending = new Map()
    this.nextId = 0
    this.stderr = ''
    this.closed = false
    /** 本进程里已经建立或续上的会话 */
    this.sessions = new Set()
  }

  async start() {
    const launch = harnessLaunch(this.options)
    this.child = spawn(launch.command, launch.args, launch.options)
    let buffer = ''
    this.child.stdout.setEncoding('utf8')
    this.child.stdout.on('data', (chunk) => {
      buffer += chunk
      let index
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index)
        buffer = buffer.slice(index + 1)
        if (line.trim()) this.onLine(line)
      }
    })
    this.child.stderr.setEncoding('utf8')
    this.child.stderr.on('data', (chunk) => {
      this.stderr = (this.stderr + chunk).slice(-20000)
    })
    this.exited = new Promise(resolve => this.child.on('exit', (code, signal) => {
      this.closed = true
      for (const { reject } of this.pending.values()) reject(Object.assign(new Error('Harness 进程已退出'), { code: 'ENV_HARNESS_EXITED' }))
      this.pending.clear()
      this.emit('exit', { code, signal, stderr: this.stderr })
      resolve({ code, signal })
    }))
    this.child.on('error', error => this.emit('error', error))
    await this.request('initialize', launch.initialize)
    return this
  }

  onLine(line) {
    let message
    try {
      message = JSON.parse(line)
    } catch {
      return
    }
    if (message.id !== undefined && message.method === undefined) {
      const request = this.pending.get(message.id)
      this.pending.delete(message.id)
      if (message.error) request?.reject(Object.assign(new Error(message.error.message), { code: message.error.code, rpc: true }))
      else request?.resolve(message.result)
    } else if (message.method) {
      this.emit('notification', message.method, message.params ?? {})
    }
  }

  request(method, params) {
    if (this.closed) return Promise.reject(Object.assign(new Error('Harness 进程已退出'), { code: 'ENV_HARNESS_EXITED' }))
    const id = ++this.nextId
    this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }

  /** 会话第一次在这个进程里用到时：有历史的先续上。 */
  async ensureSession(sessionId, hasHistory) {
    if (this.sessions.has(sessionId)) return
    if (hasHistory) {
      try {
        await this.request('session/resume', { sessionId })
      } catch {
        // Harness 那边没有这个会话（例如数据目录换过）：当作新会话
      }
    }
    this.sessions.add(sessionId)
  }

  async stop() {
    if (this.closed || !this.child) return
    this.request('shutdown').catch(() => {})
    const timer = setTimeout(() => this.child.kill('SIGKILL'), 10000)
    await this.exited
    clearTimeout(timer)
  }
}
