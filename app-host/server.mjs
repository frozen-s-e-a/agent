// 宿主的传输层（浏览器开发版）：只监听本机。
//   POST /rpc      前端命令 { id, method, params } → { id, ok, result } | { id, ok: false, error: { code, message } }
//   GET  /events   流程事件推送（Server-Sent Events），每条 data 是一个 audit-events/1 事件
//   POST /upload   浏览器拖进来的文件（浏览器拿不到本机路径）：存进项目再按 files.add 登记
//   其他           frontend/dist 的静态文件（先 npm run build）
// 桌面版用 Electron IPC 调同一个 AppHost，不经过这里。
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { HostError } from './host.mjs'

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' }
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

async function body(req, limit) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new HostError('ARG_TOO_LARGE', '内容太大')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

function send(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(value))
}

/** @param {import('./host.mjs').AppHost} host */
export function createServer(host, { staticDir } = {}) {
  return http.createServer(async (req, res) => {
    // 防 DNS 重绑定：只接受本机地址；写操作要求自定义头（跨站页面发不出来，预检也不放行）
    if (!LOCAL.test(req.headers.host ?? '')) return send(res, 403, { ok: false, error: { code: 'FORBIDDEN', message: 'host' } })
    const url = new URL(req.url, 'http://localhost')
    if (req.method === 'POST' && req.headers['x-audit-host'] !== '1') return send(res, 403, { ok: false, error: { code: 'FORBIDDEN', message: 'header' } })
    try {
      if (req.method === 'POST' && url.pathname === '/rpc') {
        const { id, method, params } = JSON.parse((await body(req, 4 << 20)).toString('utf8'))
        try {
          const result = await host.dispatch(method, params)
          return send(res, 200, { id, ok: true, result })
        } catch (error) {
          if (!(error instanceof HostError) && !error.code) console.error(`[host] ${method}:`, error)
          return send(res, 200, { id, ok: false, error: { code: error.code ?? 'ENV_INTERNAL', message: error.message } })
        }
      }
      if (req.method === 'GET' && url.pathname === '/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' })
        res.write(': connected\n\n')
        const off = host.subscribe(event => res.write(`data: ${JSON.stringify(event)}\n\n`))
        const ping = setInterval(() => res.write(': ping\n\n'), 15000)
        req.on('close', () => {
          off()
          clearInterval(ping)
        })
        return
      }
      if (req.method === 'POST' && url.pathname === '/upload') {
        const project = url.searchParams.get('project')
        const name = path.basename(url.searchParams.get('name') ?? '')
        if (!project || !name) throw new HostError('ARG_UPLOAD', '缺少 project 或 name')
        const dir = path.join(host.store.dir, 'uploads', String(Date.now()))
        fs.mkdirSync(dir, { recursive: true })
        const file = path.join(dir, name)
        fs.writeFileSync(file, await body(req, 512 << 20))
        try {
          return send(res, 200, { ok: true, result: await host.dispatch('files.add', { project, paths: [file] }) })
        } finally {
          fs.rmSync(dir, { recursive: true, force: true })
        }
      }
      if (req.method === 'GET' && staticDir) {
        let file = path.join(staticDir, decodeURIComponent(url.pathname))
        if (!file.startsWith(staticDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(staticDir, 'index.html')
        if (fs.existsSync(file)) {
          res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' })
          return fs.createReadStream(file).pipe(res)
        }
      }
      send(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: url.pathname } })
    } catch (error) {
      send(res, 400, { ok: false, error: { code: error.code ?? 'ARG_BAD_REQUEST', message: error.message } })
    }
  })
}
