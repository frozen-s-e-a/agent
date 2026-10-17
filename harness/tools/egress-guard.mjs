// 外连检查：用 NODE_OPTIONS="--import <本文件>" 预加载到 Harness 进程（及其 Node 子进程）里，
// 记录每一次域名解析和网络连接，并拦下不在允许清单里的连接。
//
//   AUDIT_EGRESS_LOG    记录文件（每行一条 JSON），不设则只拦不记
//   AUDIT_EGRESS_ALLOW  允许连接的主机，逗号分隔（例如企业模型的主机名）；本机回环地址总是允许
//   AUDIT_EGRESS_MODE   block（默认）拦下并报错；log 只记录、放行
//
// 只覆盖 Node 进程。审计工具的 Python 进程由 transport.py 的 local_only 限制，另行检查。
import dns from 'node:dns'
import fs from 'node:fs'
import net from 'node:net'

const logFile = process.env.AUDIT_EGRESS_LOG
const allow = new Set((process.env.AUDIT_EGRESS_ALLOW ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean))
const block = (process.env.AUDIT_EGRESS_MODE ?? 'block') !== 'log'

function record(entry) {
  if (!logFile) return
  try { fs.appendFileSync(logFile, JSON.stringify({ pid: process.pid, ts: new Date().toISOString(), ...entry }) + '\n') } catch {}
}

function isLoopback(host) {
  if (!host) return true
  const h = String(host).toLowerCase().replace(/^\[|\]$/g, '')
  return h === 'localhost' || h === '::1' || h.startsWith('127.') || h === '0.0.0.0' || h === '::ffff:127.0.0.1'
}

function allowed(host) {
  return isLoopback(host) || allow.has(String(host).toLowerCase())
}

const originalConnect = net.Socket.prototype.connect
net.Socket.prototype.connect = function (...args) {
  const first = args[0]
  let host, port, path
  if (Array.isArray(first)) {
    // 内部重载：connect([options, cb])
    ({ host, port, path } = first[0] ?? {})
  } else if (first && typeof first === 'object') {
    ({ host, port, path } = first)
  } else if (typeof first === 'string' && isNaN(Number(first))) {
    path = first
  } else {
    port = first
    host = typeof args[1] === 'string' ? args[1] : 'localhost'
  }
  if (path !== undefined) return originalConnect.apply(this, args)
  const ok = allowed(host)
  record({ kind: 'connect', host: host ?? 'localhost', port, allowed: ok })
  if (!ok && block) {
    const error = Object.assign(new Error(`egress blocked: ${host}:${port}`), { code: 'EGRESS_BLOCKED' })
    process.nextTick(() => this.destroy(error))
    return this
  }
  return originalConnect.apply(this, args)
}

const originalLookup = dns.lookup
dns.lookup = function (hostname, ...rest) {
  record({ kind: 'lookup', host: hostname, allowed: allowed(hostname) })
  return originalLookup.call(this, hostname, ...rest)
}
const originalPromisesLookup = dns.promises.lookup
dns.promises.lookup = function (hostname, ...rest) {
  record({ kind: 'lookup', host: hostname, allowed: allowed(hostname) })
  return originalPromisesLookup.call(this, hostname, ...rest)
}
