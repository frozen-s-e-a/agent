#!/usr/bin/env node
// 启动宿主（浏览器开发版）：node app-host/main.mjs [--port 8787] [--data <数据目录>] [--python <python>]
// 前端开发时 `cd frontend && npm run dev:real`，Vite 把 /rpc、/events、/upload 转到这里。
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { AppHost } from './host.mjs'
import { createServer } from './server.mjs'

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: process.env.AUDIT_HOST_PORT ?? '8787' },
    data: { type: 'string', default: process.env.AUDIT_DATA_DIR ?? path.join(os.homedir(), '.audit-assistant') },
    python: { type: 'string', default: process.env.AUDIT_PYTHON },
    'python-path': { type: 'string', default: process.env.AUDIT_PYTHONPATH },
  },
})

const here = path.dirname(fileURLToPath(import.meta.url))
const host = new AppHost({ dataDir: values.data, python: values.python, pythonPath: values['python-path'] })
const server = createServer(host, { staticDir: path.join(here, '..', 'frontend', 'dist') })
server.listen(Number(values.port), '127.0.0.1', () => {
  console.log(`[host] http://127.0.0.1:${values.port}  数据目录 ${host.store.dir}`)
})

let closing = false
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    if (closing) return
    closing = true
    server.close()
    await host.close()
    process.exit(0)
  })
}
