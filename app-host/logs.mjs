// 宿主日志和日志导出（接口约定 4.11 的 logs.export）。
//
// <数据目录>/logs/host-YYYY-MM-DD.log   宿主的输出（console），含 Harness 意外退出时的 stderr
//
// 导出的 zip：
//   app-info.json、privacy-status.json、settings.json（不含凭据）
//   logs/host-*.log                       日期范围内的宿主日志
//   events/<项目>/<对话>.jsonl            日期范围内的流程事件；不含资料内容时只留类型、编号、工具名、耗时和错误
//   harness/…                             只在含资料内容时：Harness 和审计工具服务的会话日志（日期范围内改动过的）
// API Key 和令牌在任何情况下都不进 zip：凭据原文在所有文件里替换成等长的 *。
import fs from 'node:fs'
import path from 'node:path'
import util from 'node:util'
import zlib from 'node:zlib'

const day = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 把 console 的输出同时追加到 <dir>/host-YYYY-MM-DD.log。 */
export function installFileLog(dir) {
  fs.mkdirSync(dir, { recursive: true })
  for (const level of ['log', 'info', 'warn', 'error']) {
    const original = console[level].bind(console)
    console[level] = (...args) => {
      try {
        original(...args)
      } catch {
        // 桌面版没有控制台时 stdout 可能已关闭
      }
      try {
        fs.appendFileSync(path.join(dir, `host-${day()}.log`), `${new Date().toISOString()} [${level}] ${util.format(...args)}\n`)
      } catch {}
    }
  }
}

// ---------- zip ----------

function dosTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
  const d = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, date: d }
}

/** 最小的 zip 写入（deflate，UTF-8 文件名）。entries: [{ name, data: Buffer | string, mtime? }] */
export function zip(entries) {
  const parts = []
  const central = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name.replace(/\\/g, '/'), 'utf8')
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8')
    const packed = zlib.deflateRawSync(data)
    const crc = zlib.crc32(data)
    const { time, date } = dosTime(entry.mtime ?? new Date())
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6) // 文件名是 UTF-8
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(packed.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    const head = Buffer.alloc(46)
    head.writeUInt32LE(0x02014b50, 0)
    head.writeUInt16LE(20, 4)
    head.writeUInt16LE(20, 6)
    head.writeUInt16LE(0x0800, 8)
    head.writeUInt16LE(8, 10)
    head.writeUInt16LE(time, 12)
    head.writeUInt16LE(date, 14)
    head.writeUInt32LE(crc, 16)
    head.writeUInt32LE(packed.length, 20)
    head.writeUInt32LE(data.length, 24)
    head.writeUInt16LE(name.length, 28)
    head.writeUInt32LE(offset, 42)
    parts.push(local, name, packed)
    central.push(head, name)
    offset += local.length + name.length + packed.length
  }
  const size = central.reduce((n, b) => n + b.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(size, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, ...central, end])
}

// ---------- 导出 ----------

/** 不含资料内容时事件里留下的字段：类型、编号、状态、工具名、耗时和错误 */
const KEEP = ['tool', 'call', 'status', 'durationMs', 'ok', 'error', 'stage', 'node', 'region', 'state', 'card', 'kind', 'output', 'attempt', 'paused', 'withdrawn', 'name', 'toolCount']

function stripEvent(event) {
  const data = event.data ?? {}
  const kept = Object.fromEntries(KEEP.filter(k => data[k] !== undefined).map(k => [k, data[k]]))
  if (kept.error && typeof kept.error === 'object') kept.error = { code: kept.error.code, message: kept.error.message }
  const { v, seq, ts, type, session, task } = event
  return { v, seq, ts, type, session, task, data: kept }
}

/** 凭据原文：API Key、MCP 令牌和敏感环境变量 */
function secretValues(secrets) {
  const out = []
  const walk = (v) => {
    if (typeof v === 'string') {
      if (v.length >= 6) out.push(v)
    } else if (v && typeof v === 'object') {
      for (const x of Object.values(v)) walk(x)
    }
  }
  walk(secrets)
  return out.sort((a, b) => b.length - a.length)
}

function* walkFiles(dir) {
  let list
  try {
    list = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of list) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* walkFiles(p)
    else if (e.isFile()) yield p
  }
}

/**
 * @param {import('./host.mjs').AppHost} host
 * @param {{ from: string, to: string, includeContent: boolean }} range 日期 YYYY-MM-DD，含两端
 * @returns {Buffer} zip 内容
 */
export async function buildLogArchive(host, { from, to, includeContent }) {
  const store = host.store
  const inRange = (ts) => {
    const d = typeof ts === 'string' ? ts.slice(0, 10) : day(ts)
    return (!from || d >= from) && (!to || d <= to)
  }
  const entries = []
  const json = (name, value) => entries.push({ name, data: JSON.stringify(value, null, 2) })

  json('app-info.json', await host.dispatch('app.info', {}))
  json('privacy-status.json', await host.dispatch('privacy.status', {}).catch(error => ({ error: error.message })))
  const { baseUrl, model, models, mcp } = store.settings
  json('settings.json', { baseUrl, model, models, mcp: mcp.map(s => ({ ...s, env: Object.keys(s.env ?? {}) })) })

  for (const file of walkFiles(store.file('logs'))) {
    const m = /^host-(\d{4}-\d{2}-\d{2})\.log$/.exec(path.basename(file))
    if (m && inRange(m[1])) entries.push({ name: 'logs/' + path.basename(file), data: fs.readFileSync(file), mtime: fs.statSync(file).mtime })
  }

  for (const p of store.projects) {
    for (const file of walkFiles(store.file('projects', p.project, 'events'))) {
      const lines = []
      for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        if (!line.trim()) continue
        let event
        try {
          event = JSON.parse(line)
        } catch {
          continue
        }
        if (inRange(event.ts)) lines.push(JSON.stringify(includeContent ? event : stripEvent(event)))
      }
      if (lines.length) entries.push({ name: `events/${p.project}/${path.basename(file)}`, data: lines.join('\n') + '\n' })
    }
  }

  if (includeContent) {
    const root = store.file('harness')
    for (const file of walkFiles(root)) {
      const stat = fs.statSync(file)
      if (!inRange(stat.mtime) || stat.size > 50 << 20) continue
      entries.push({ name: 'harness/' + path.relative(root, file).split(path.sep).join('/'), data: fs.readFileSync(file), mtime: stat.mtime })
    }
  }

  // 按字节等长替换成 *，二进制文件（如会话数据库）也不会被改坏
  const secrets = secretValues(store.secrets).map(s => Buffer.from(s, 'utf8'))
  for (const e of entries) {
    const data = Buffer.from(e.data)
    for (const s of secrets) {
      for (let i = data.indexOf(s); i >= 0; i = data.indexOf(s, i + s.length)) data.fill(0x2a, i, i + s.length)
    }
    e.data = data
  }
  return zip(entries)
}

export const logArchiveName = (d = new Date()) => `audit-agent-logs-${day(d).replace(/-/g, '')}.zip`
