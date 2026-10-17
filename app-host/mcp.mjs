// 外部 MCP 服务（接口约定 4.10）：试连、生成 Harness 配置层、需要逐次确认的工具名。
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const harnessDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'harness')
// 用 dsh 自带的 MCP 客户端（和 Harness 里挂服务的是同一个包），不另装依赖。
const requireFromHarness = createRequire(path.join(harnessDir, 'node_modules', '@deepseek-ai', 'dsh-mcp-client', 'package.json'))
const load = spec => import(pathToFileURL(requireFromHarness.resolve(spec)).href)

export const NAME_PATTERN = /^[A-Za-z0-9_]+$/

/** 敏感值在 Harness 进程环境里的变量名：令牌和 stdio 的敏感变量都不写进配置文件。 */
export const tokenEnv = name => `AUDIT_MCP_${name.toUpperCase()}_TOKEN`
export const secretEnv = (name, key) => `AUDIT_MCP_${name.toUpperCase()}_${key}`

function argsSummary(schema) {
  const props = schema?.properties ?? {}
  const required = new Set(schema?.required ?? [])
  return Object.keys(props).map(k => (required.has(k) ? k : k + '?')).join(', ')
}

/** 连一次服务，列出工具。cfg 是 4.10 的服务配置；secrets 是 { token } 或 { 变量名: 值 }。 */
export async function testServer(cfg, secrets = {}, timeoutMs = 15000) {
  const { Client, StreamableHTTPClientTransport } = await load('@modelcontextprotocol/client')
  const started = Date.now()
  let transport
  try {
    if (cfg.transport === 'stdio') {
      if (!cfg.command) return { ok: false, error: { code: 'MCP_SPAWN_FAILED', message: '没有填写程序路径' } }
      const { StdioClientTransport } = await load('@modelcontextprotocol/client/stdio')
      transport = new StdioClientTransport({ command: cfg.command, args: cfg.args ?? [], env: { ...process.env, ...cfg.env, ...secrets.env }, stderr: 'pipe' })
    } else {
      if (!cfg.url) return { ok: false, error: { code: 'MCP_UNREACHABLE', message: '没有填写地址' } }
      const headers = secrets.token ? { Authorization: `Bearer ${secrets.token}` } : {}
      transport = new StreamableHTTPClientTransport(new URL(cfg.url), { requestInit: { headers } })
    }
    const client = new Client({ name: 'audit-host', version: '0.1.0' })
    const timeout = new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('连接超时'), { mcp: 'MCP_TIMEOUT' })), timeoutMs))
    await Promise.race([client.connect(transport), timeout])
    const listed = await Promise.race([client.listTools(), timeout])
    const info = client.getServerVersion?.() ?? {}
    await client.close().catch(() => {})
    const known = new Map((cfg.tools ?? []).map(t => [t.tool, t]))
    return {
      ok: true,
      serverInfo: { name: info.name ?? cfg.name, version: info.version ?? '' },
      latencyMs: Date.now() - started,
      tools: (listed.tools ?? []).map(t => ({
        tool: t.name,
        description: t.description ?? '',
        argsSummary: argsSummary(t.inputSchema),
        enabled: known.get(t.name)?.enabled ?? true,
        sideEffect: known.get(t.name)?.sideEffect ?? 'mutating',
        ...(t.annotations?.readOnlyHint ? { readOnlyHint: true } : {}),
      })),
    }
  } catch (error) {
    await transport?.close?.().catch(() => {})
    return { ok: false, error: classify(error, cfg) }
  }
}

function classify(error, cfg) {
  const message = String(error?.message ?? error)
  if (error?.mcp) return { code: error.mcp, message }
  if (cfg.transport === 'stdio' && /ENOENT|spawn/i.test(message)) return { code: 'MCP_SPAWN_FAILED', message: '程序启动不了：' + message }
  if (/401|403|unauthori[sz]ed|forbidden/i.test(message)) return { code: 'MCP_AUTH', message: '令牌无效或已过期：' + message }
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|ETIMEDOUT/i.test(message)) return { code: 'MCP_UNREACHABLE', message: '地址连不上：' + message }
  return { code: 'MCP_PROTOCOL', message }
}

const yaml = value => JSON.stringify(value)

/**
 * 为启用的服务生成 Harness 配置层（每个服务一条 dsh-mcp-client），写到 file。
 * 令牌和敏感变量只用 `!!js process.env.…` 引用，原文由宿主放进 Harness 进程的环境。
 * 没有启用的服务时返回 null。
 */
export function writePatch(servers, file) {
  const enabled = servers.filter(s => s.enabled)
  if (!enabled.length) return null
  const lines = ['# 宿主生成：用户在设置里添加的外部 MCP 服务（接口约定 4.10）。不要手改。', '- insert:']
  for (const s of enabled) {
    lines.push(`    - id: ${yaml('mcp-ext-' + s.name)}`, `      name: '@deepseek-ai/dsh-mcp-client'`, '      config:', `        serverName: ${yaml(s.name)}`)
    if (s.transport === 'stdio') {
      lines.push('        transport: stdio', `        command: ${yaml(s.command)}`, `        args: ${yaml(s.args ?? [])}`, '        env:')
      for (const [k, v] of Object.entries(s.env ?? {})) lines.push(`          ${yaml(k)}: ${yaml(v)}`)
      for (const k of s.secretEnv ?? []) lines.push(`          ${yaml(k)}: !!js process.env[${yaml(secretEnv(s.name, k))}] || ''`)
      if (!Object.keys(s.env ?? {}).length && !(s.secretEnv ?? []).length) lines[lines.length - 1] = '        env: {}'
    } else {
      lines.push('        transport: streamable-http', `        url: ${yaml(s.url)}`)
      if (s.hasToken) lines.push('        headers:', `          Authorization: !!js "Bearer " + (process.env[${yaml(tokenEnv(s.name))}] || '')`)
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, lines.join('\n') + '\n')
  return file
}

/** Harness 进程里需要的敏感环境变量。 */
export function patchEnv(servers, secrets) {
  const env = {}
  for (const s of servers.filter(x => x.enabled)) {
    const sec = secrets.mcp?.[s.name] ?? {}
    if (s.transport === 'http' && sec.token) env[tokenEnv(s.name)] = sec.token
    for (const k of s.secretEnv ?? []) if (sec.env?.[k] !== undefined) env[secretEnv(s.name, k)] = sec.env[k]
  }
  return env
}

/** 要逐次确认的工具：启用服务里 sideEffect 为 mutating 的工具（默认 mutating，服务端新出现的工具也按 mutating）。 */
export function confirmTools(servers) {
  const out = []
  for (const s of servers.filter(x => x.enabled)) {
    const readonly = (s.tools ?? []).filter(t => t.sideEffect === 'readonly').map(t => t.tool)
    if (!readonly.length) out.push(`mcp__${s.name}__*`)
    else for (const t of s.tools ?? []) if (t.sideEffect !== 'readonly') out.push(`mcp__${s.name}__${t.tool}`)
  }
  return out
}
