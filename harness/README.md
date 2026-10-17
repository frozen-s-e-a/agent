# Harness 接入

审计助手以 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（下称 dsh）为底座。本目录是接入层：固定版本、配置层、宿主桥接插件、测试和企业环境验证脚本。审计工具 MCP 服务在 `src/audit-mcp/`。

实测结论见 [docs/实现设计/Harness接入实测-20261017.md](../docs/实现设计/Harness接入实测-20261017.md)。

## 目录

| 文件 | 作用 |
|---|---|
| `package.json`、`package-lock.json` | 固定 `@deepseek-ai/dsh@0.2.1-rc.2` 及全部依赖 |
| `profile/audit.patch.yml` | 叠在 dsh `sdk` profile 上的配置层：企业模型接法、关闭外发、不给模型 shell 和文件读写、挂载审计工具 |
| `plugins/host-bridge.mjs` | 替换 dsh 自带的 SDK 服务：协议兼容，补上取消、动作确认、追问、卡片、流式片段、状态查询 |
| `launch.mjs` | 宿主启动 Harness 用的命令和环境变量 |
| `skills/` | 随应用提供的技能（审计指南）；不读项目目录和用户目录里的技能 |
| `tools/egress-guard.mjs` | 外连检查：记录并拦下除允许主机外的所有连接 |
| `tools/verify-enterprise.mjs` | 在能连企业模型的电脑上运行的验证脚本 |
| `test/` | 假模型、测试用宿主端、测试用卡片插件、测试 |

## 运行测试

需要 Node ≥ 22.19，Python 3 及 pandas、openpyxl。

```sh
cd harness
npm ci
npm test                                   # 10 项：配置、外连、端到端、取消、续跑、确认、追问、卡片
cd .. && python -m unittest tests/unit/test_audit_mcp.py   # 审计工具 MCP 服务 8 项
```

## 宿主怎么用

```js
import { spawn } from 'node:child_process'
import { harnessLaunch } from './harness/launch.mjs'

const launch = harnessLaunch({
  projectRoot, dataDir,              // 一个进程服务一个项目
  baseURL, apiKey, model,            // 用户填的地址和 Key，模型名从 /models 里选
  python, pythonPath,                // 内置 Python 及其依赖目录
  confirmTools: ['mcp__oa__approve'], // 外部系统中会改数据的工具
  patches: [externalMcpPatch],       // 用户添加的外部 MCP 服务（宿主生成的配置层）
})
const child = spawn(launch.command, launch.args, launch.options)
// 标准输入输出上按行收发 JSON-RPC；先 initialize(launch.initialize)
```

### 请求（宿主 → Harness）

| 方法 | 参数 | 说明 |
|---|---|---|
| `initialize` | `{ cwd, provider, model }` | 用 `launch.initialize`；返回前等所有插件（含审计工具）就绪 |
| `session/prompt` | `{ sessionId, contentBlocks }` | 发一条用户消息；未知会话自动创建 |
| `session/wait` | `{ sessionId }` | 等这个会话空闲 |
| `session/cancel` | `{ sessionId }` | 停止进行中的一轮，返回 `{ cancelled }`；会话可以继续 |
| `session/resume` | `{ sessionId }` | Harness 重启后续上已有会话 |
| `approval/respond` | `{ id, outcome }` | 回答动作确认：`allowed-once` 或 `rejected` |
| `question/respond` | `{ id, answers }` | 回答模型追问，`answers` 为 `[{ id, selected, custom? }]` |
| `card/answer` | `{ card, action, edits?, note? }` | 回答卡片（接口约定 5.1） |
| `bridge/status` | `{}` | 实际生效的插件、模型路由、模型可见的工具、未答卡片 |
| `shutdown` | — | 结束 |

### 通知（Harness → 宿主）

| 方法 | 内容 |
|---|---|
| `session.event` | 落盘的会话事件（`user/message`、`assistant/message`、`tool/call`、`tool/result`、`turn/end` 等） |
| `session.status` | `running` / `idle` |
| `assistant.stream` | 回复的流式片段，`frame.chunk.type === 'text-delta'` 时取 `text` |
| `approval.request` / `approval.closed` | 动作确认，带 `toolName`、`callId` |
| `question.request` / `question.closed` | 模型追问 |
| `card.opened` / `card.closed` | 编排插件发出的卡片；`withdrawn: true` 表示撤回 |

## 环境变量（由 `launch.mjs` 设置）

| 变量 | 说明 |
|---|---|
| `DSH_HOME` | `<数据目录>/harness`，会话日志等 |
| `AUDIT_PROJECT_ROOT` | 项目目录，审计工具只能访问这里 |
| `AUDIT_LLM_BASE_URL` / `AUDIT_LLM_API_KEY` / `AUDIT_LLM_MODEL` | 企业模型 |
| `AUDIT_LLM_CONTEXT_WINDOW` / `AUDIT_LLM_MAX_TOKENS` | 默认 131072 / 8192 |
| `AUDIT_PYTHON` / `AUDIT_PYTHONPATH` | 内置 Python |
| `AUDIT_CONFIRM_TOOLS` | 需逐次确认的工具，JSON 数组，支持 `前缀*` |
| `AUDIT_MCP_TOOLS` / `AUDIT_MCP_DENY` / `AUDIT_MCP_ALLOW_NETWORK` | 审计工具的白名单、黑名单、是否提供联网工具 |

## 企业模型验证

在能连企业模型的 Windows 电脑上：

```bat
cd harness
npm ci
set AUDIT_LLM_API_KEY=<你的 Key>
node tools\verify-enterprise.mjs --url <模型地址> --model <模型名> --python <python.exe 路径>
```

加 `--context` 会再测实际上下文窗口（发 6 万到 12 万字，较耗 token）。脚本生成 `verify-report-<日期>.json`，报告里不含 Key。

## 升级 dsh

1. 改 `package.json` 的版本，`npm install` 更新锁文件。
2. `npm test`。
3. 重点看桥接插件依赖的 dsh 内部结构：`HarnessSdkJsonRpcServer` 的 `sessions` 字段、`JsonRpcLineTransport`、`approval/request` 与 `user-questions/request` 两个事件、`tools/pre-execute` 的返回值。
4. `npm test` 里的外连检查必须仍然通过。
