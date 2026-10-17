# Harness 接入

审计助手以 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（下称 dsh）为底座。本目录是接入层：固定版本、配置层、宿主桥接插件、测试和企业环境验证脚本。审计工具 MCP 服务在 `src/audit-mcp/`。

实测结论见 [docs/实现设计/Harness接入实测-20261017.md](../docs/实现设计/Harness接入实测-20261017.md)。

## 目录

| 文件 | 作用 |
|---|---|
| `package.json`、`package-lock.json` | 固定 `@deepseek-ai/dsh@0.2.1-rc.2` 及全部依赖 |
| `profile/audit.patch.yml` | 叠在 dsh `sdk` profile 上的配置层：企业模型接法、关闭外发、不给模型 shell 和文件读写、挂载审计工具 |
| `plugins/host-bridge.mjs` | 替换 dsh 自带的 SDK 服务：协议兼容，补上取消、动作确认、追问、卡片、流式片段、状态查询；给其他插件提供 `auditCards`（开卡片、撤回）和 `auditBridge`（发通知、加请求方法） |
| `plugins/orchestrator/` | 编排插件：底稿任务按固定阶段在后台跑完（见下文“编排插件”） |
| `launch.mjs` | 宿主启动 Harness 用的命令和环境变量 |
| `skills/` | 随应用提供的技能（审计指南）；不读项目目录和用户目录里的技能 |
| `tools/egress-guard.mjs` | 外连检查：记录并拦下除允许主机外的所有连接 |
| `tools/verify-enterprise.mjs` | 在能连企业模型的电脑上运行的验证脚本 |
| `test/` | 假模型、假审计工具服务、应收账款底稿场景、测试用宿主端、测试用卡片插件、测试 |

## 运行测试

需要 Node ≥ 22.19，Python 3 及 pandas、openpyxl。

```sh
cd harness
npm ci
npm test                                   # 34 项：配置、外连、端到端、取消、续跑、确认、追问、卡片、编排流程
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
| `task/create` | `{ sessionId, text, files, message? }` | 宿主直接登记底稿任务，返回 `{ task }`；`message` 是触发它的消息编号 |
| `task/get` | `{ task }` | 任务快照：状态、阶段、交付物、各区域状态、未答卡片、输出编号、阻塞原因 |
| `task/list` | `{}` | 本项目的所有任务 |
| `task/message` | `{ task, text }` | 任务进行中用户补充的话；影响已算完的区域时发卡片问是否重跑 |
| `task/cancel` | `{ task }` | 取消，返回 `{ cancelled }`；未答卡片撤回 |
| `task/resume` | `{ task }` | 续跑暂停或阻塞的任务，已完成的节点不重做 |
| `task/rerun` | `{ task, scope: { regions?, fromStage? }, note? }` | 从某阶段起重跑某些区域，默认从 `basis`；运行中则排队 |
| `ids/allocate` | `{ prefix: 'C' \| 'O' }` | 取卡片或输出编号，返回 `{ id }`；与编排插件共用一个项目计数 |
| `audit/tool` | `{ name, arguments }` | 调宿主专用的审计工具（`trace_cell`、`fill_preview`、`table_view`），返回工具信封 |
| `shutdown` | — | 结束 |

### 通知（Harness → 宿主）

| 方法 | 内容 |
|---|---|
| `session.event` | 落盘的会话事件（`user/message`、`assistant/message`、`tool/call`、`tool/result`、`turn/end` 等） |
| `session.status` | `running` / `idle` |
| `assistant.stream` | 回复的流式片段，`frame.chunk.type === 'text-delta'` 时取 `text` |
| `approval.request` / `approval.closed` | 动作确认，带 `toolName`、`callId` |
| `question.request` / `question.closed` | 模型追问 |
| `card.opened` / `card.closed` | 编排插件发出的卡片；`withdrawn: true` 表示撤回；任务的卡片两条通知都带 `task` |
| `task.event` | `{ sessionId, task, type, data, ts }`，流程事件（接口约定第四节），`seq` 由宿主加 |

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
| `AUDIT_STATE_DIR` | 编排状态目录：`<数据目录>/harness/audit-projects/<项目路径哈希>` |
| `AUDIT_SEMANTICS_SAMPLES` | 区域语义的独立采样次数，默认 3（经 `options.env` 传） |
| `AUDIT_RECOMPUTE` | 设为 `off` 关闭双路复算（经 `options.env` 传） |
| `AUDIT_TRIVIAL_THRESHOLD` | 明显微小错报临界值，默认 `0`（经 `options.env` 传） |

## 编排插件

用户在对话里要求填底稿时，模型调用 `audit_task_start` 登记任务（宿主也可以用 `task/create` 直接登记），之后任务在后台按固定阶段跑：`understand → workpaper → data → basis → confirm → compute → fill → notes → review`。对话那一轮立刻结束，进度经 `task.event` 发给宿主，需要用户拿主意的地方发卡片。

- **模型调用**：每个编排节点是一次干净的单轮请求（`plugins/orchestrator/prompts.mjs` 里的提示词和结果结构），结果经 `submit` 工具提交，按结构校验，不合格带着问题最多补救 2 次。每次调用记在 `<状态目录>/tasks/<任务>/calls.jsonl`，不含 Key。
- **工具调用**：编排专用的审计工具（解析底稿、导入、各类核对、写入）对对话模型隐藏，只由插件调用；宿主专用工具只走 `audit/tool`。
- **检查点**：每个节点的结果存在 `task.json`。Harness 被结束后任务标为 `paused`，`task/resume` 从中断处续跑；之前没答的卡片撤回后重发。
- **失败处理**：语义校验不过重新识别；差异超过临界值发 `discrepancy` 卡片；两路复算不一致又判断不了时请用户选；资料有问题发 `question` 卡片；模型连不上或文件读不了时任务转 `blocked`，修好后续跑。
- **最终状态**：`completed`、`partial`（有区域失败或底稿未写完）、`cancelled`、`failed`。

`test/orchestrator-flow.test.mjs` 用应收账款底稿场景（`test/scenarios/receivables.mjs`）把整个流程和各条失败路径在进程内跑一遍，并对照 `事件回放-底稿填写.json` 的字段；`test/orchestrator.test.mjs` 在真实 Harness 里配假审计工具服务（`test/fake-audit-tools.mjs`）跑对话登记、强行结束后续跑和取消。审计工具线交付真实工具后，换掉 `test/plugins/fake-tools.patch.yml` 即可。

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
