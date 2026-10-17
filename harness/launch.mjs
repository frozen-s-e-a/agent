// 组装启动 Harness 的命令和环境。宿主（Node 后端）和测试共用。
// 一个 Harness 进程服务一个项目：项目目录决定审计工具能访问的范围。
import crypto from 'node:crypto'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

/** 固定的 dsh 版本（harness/package.json）。 */
export const DSH_VERSION = require('@deepseek-ai/dsh/package.json').version
export const DSH_BIN = path.join(path.dirname(require.resolve('@deepseek-ai/dsh/package.json')), 'lib', 'bin.js')
export const PATCH = path.join(here, 'profile', 'audit.patch.yml')
export const APP_ROOT = path.resolve(here, '..')

/**
 * 用户填的地址规范化成 OpenAI 兼容的 baseURL：去掉空白、末尾斜杠和误填的 /chat/completions。
 * 是否需要补 /v1 由连接测试决定（宿主先试原样，再试补 /v1），这里不猜。
 */
export function normalizeBaseURL(value) {
  let url = String(value ?? '').trim().replace(/\/+$/, '')
  url = url.replace(/\/chat\/completions$/i, '').replace(/\/+$/, '')
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('模型地址必须以 http:// 或 https:// 开头')
  return url
}

/**
 * @param {object} options
 * @param {string} options.projectRoot 项目目录
 * @param {string} options.dataDir 应用数据目录；Harness 的会话日志放在其下 harness/
 * @param {string} options.baseURL 企业模型地址
 * @param {string} options.apiKey API Key，只放进子进程环境
 * @param {string} options.model 模型名
 * @param {number} [options.contextWindow]
 * @param {number} [options.maxTokens]
 * @param {string} [options.python] 内置 Python 路径
 * @param {string} [options.pythonPath] 内置 Python 依赖目录（PYTHONPATH）
 * @param {string[]} [options.confirmTools] 每次调用都要用户确认的工具名或前缀（如 mcp__oa__*）；`!` 开头为排除项（如 !mcp__oa__query_*）
 * @param {string[]} [options.disabledTools] 设置里停用的工具，写法同 confirmTools；对模型隐藏且不能调用
 * @param {string[]} [options.patches] 追加的配置层（例如宿主生成的外部 MCP 服务配置）
 * @param {Record<string,string>} [options.env] 额外环境变量
 */
export function harnessLaunch(options) {
  const projectRoot = path.resolve(options.projectRoot)
  const harnessHome = path.join(path.resolve(options.dataDir), 'harness')
  // 编排状态按项目分目录；用项目路径的哈希命名，路径里的中文和符号不进目录名
  const projectKey = crypto.createHash('sha256').update(process.platform === 'win32' ? projectRoot.toLowerCase() : projectRoot).digest('hex').slice(0, 16)
  const env = {
    ...process.env,
    ...options.env,
    DSH_HOME: harnessHome,
    AUDIT_STATE_DIR: path.join(harnessHome, 'audit-projects', projectKey),
    AUDIT_PROJECT_ROOT: projectRoot,
    AUDIT_APP_ROOT: APP_ROOT,
    AUDIT_LLM_BASE_URL: normalizeBaseURL(options.baseURL),
    AUDIT_LLM_API_KEY: options.apiKey,
    AUDIT_LLM_MODEL: options.model,
    AUDIT_LLM_CONTEXT_WINDOW: String(options.contextWindow ?? 131072),
    AUDIT_LLM_MAX_TOKENS: String(options.maxTokens ?? 8192),
    AUDIT_PYTHON: options.python ?? (process.platform === 'win32' ? 'python.exe' : 'python3'),
    AUDIT_PYTHONPATH: options.pythonPath ?? '',
    AUDIT_CONFIRM_TOOLS: JSON.stringify(options.confirmTools ?? []),
    AUDIT_DISABLED_TOOLS: JSON.stringify(options.disabledTools ?? []),
  }
  // 遥测插件已在配置层关闭；这两个变量再兜一层，避免被外部环境重新打开。
  delete env.DSH_TELEMETRY_MODE
  delete env.DSH_TELEMETRY_OTLP_URL
  delete env.DEEPSEEK_API_KEY
  const args = [DSH_BIN, '--profile', 'sdk', '--patch', PATCH]
  for (const patch of options.patches ?? []) args.push('--patch', path.resolve(patch))
  return {
    command: process.execPath,
    args,
    options: { cwd: projectRoot, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
    initialize: { cwd: projectRoot, provider: 'enterprise', model: options.model },
  }
}
