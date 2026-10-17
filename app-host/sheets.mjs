// 表格读取：常驻一个 Python 进程（py/sheet_worker.py），按行收发 JSON。
// 工作簿在修改时间不变时由它缓存，分块加载不用每块重新解析。
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'py', 'sheet_worker.py')

export class SheetReader {
  constructor({ python, pythonPath }) {
    this.python = python
    this.pythonPath = pythonPath
    this.pending = new Map()
    this.nextId = 0
  }

  start() {
    const env = { ...process.env, PYTHONIOENCODING: 'utf-8' }
    if (this.pythonPath) env.PYTHONPATH = this.pythonPath
    this.child = spawn(this.python, ['-I', WORKER], { stdio: ['pipe', 'pipe', 'pipe'], env, windowsHide: true })
    let buffer = ''
    this.child.stdout.setEncoding('utf8')
    this.child.stdout.on('data', (chunk) => {
      buffer += chunk
      let index
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index)
        buffer = buffer.slice(index + 1)
        if (!line.trim()) continue
        const message = JSON.parse(line)
        const request = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.ok) request?.resolve(message.result)
        else request?.reject(Object.assign(new Error(message.error.message), { code: message.error.code }))
      }
    })
    this.child.stderr.on('data', () => {})
    this.child.on('exit', () => {
      for (const { reject } of this.pending.values()) reject(Object.assign(new Error('表格读取进程已退出'), { code: 'ENV_SHEET_READER' }))
      this.pending.clear()
      this.child = undefined
    })
  }

  call(method, params) {
    if (!this.child) this.start()
    const id = ++this.nextId
    this.child.stdin.write(JSON.stringify({ id, method, params }) + '\n')
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }

  stop() {
    this.child?.kill()
  }
}
