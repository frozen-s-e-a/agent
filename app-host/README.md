# 应用宿主（app-host）

新前端和 Harness 之间的那一层，对应《接口约定》第一节图里的“应用宿主（Node）”：

- 按 `audit-app/1` 响应前端命令：设置、凭据、项目、资料、对话、卡片、表格、外部 MCP 服务、数据与安全。
- 一个项目一个 Harness 进程（`harness/launch.mjs` 启动，桥接插件在里面）。对话转成 `session/prompt`，Harness 的通知按接口约定 4.8 的对应表转成 `audit-events/1` 事件，分配 `seq`、写事件日志、推给前端。
- 表格（`sheet.view`、`table.view`）由常驻的 Python 进程读（`py/sheet_worker.py`，openpyxl），只读。

## 运行

先装好 Harness：`cd harness && npm ci`。需要 Node ≥ 22.19，Python 3 及 pandas、openpyxl。

```sh
node app-host/main.mjs                 # 默认 127.0.0.1:8787，数据目录 ~/.audit-assistant
cd frontend && npm run dev:real        # 另开终端；浏览器打开 http://127.0.0.1:5173
```

`frontend` 里 `npm run dev` 仍然用假宿主回放样例事件；`?host=real` / `?host=fake` 可以临时切换。`npm run build` 之后宿主也会直接提供 `frontend/dist`。

## 测试

```sh
node --test --test-concurrency=1 app-host/test/*.test.mjs   # 真实 Harness + 假模型，10 项
cd frontend && node scripts/walk-real.mjs screens/real          # 浏览器里从首次使用走到动作确认，各步截图
```

## 文件

| 文件 | 作用 |
|---|---|
| `host.mjs` | 命令实现、Harness 进程管理、任务快照 |
| `conversation.mjs` | 一个对话：Harness 通知 → 流程事件；动作确认卡、追问卡 |
| `harness.mjs` | 一个 Harness 进程的 JSON-RPC 收发 |
| `mcp.mjs` | 外部 MCP 服务：试连、生成 Harness 配置层、要逐次确认的工具 |
| `sheets.mjs`、`py/sheet_worker.py` | 表格读取 |
| `store.mjs` | 本地数据（数据目录下的 JSON / JSONL） |
| `server.mjs`、`main.mjs` | 浏览器开发版的传输层：`POST /rpc`、`GET /events`（SSE）、`POST /upload`；只监听本机 |

## 转换规则

| 前端看到的 | 来自 |
|---|---|
| `message.created` | `message.send` 时宿主自己发（Harness 的 `user/message` 里还有运行时上下文，不转） |
| `message.delta` | `assistant.stream` 的 `text-delta`；同一轮多步的文字之间补一个空行 |
| `message.completed` | `turn/end`；全文是这一轮各步 `assistant/message` 的文字，`refs` 是这一轮的产出。被停止时加“（已停止）” |
| `tool.started` / `tool.finished` | `tool/call` / `tool/result`；摘要从结果信封生成（行数、列数、提示数、错误原文）。`ask_user_question` 不列成工具 |
| `output.ready`（对话产出） | 工具结果信封 `refs` 里的项目内文件，登记为 `O-` |
| 动作确认卡 | `approval.request`；参数取自同一调用的 `tool/call`，`operation` 取工具说明 |
| 追问卡 | `question.request` |
| 编排卡片 | `card.opened` / `card.closed` 原样转 |
| 卡片撤回 | Harness 进程退出（切项目、改设置、崩溃、宿主重启）时，未答的卡都推 `card.closed`（`withdrawn: true`） |

宿主出的卡（动作确认、追问）编号是 `C-h001` 这种，和编排插件的 `C-` 序号分开。

## 还缺的

**要桥接插件或编排线补的**（已转给 Harness 接入线程）：

1. **编排插件的流程事件没有通道。** `task.*`、`stage.changed`、`node.*`、`check.result`、`region.state`、任务的 `output.ready` 现在到不了宿主。建议桥接插件提供 `ctx.auditEvents.emit(agent, { type, task, data })`，发通知 `audit.event { sessionId, event: { type, task, data } }`；`seq` 和 `ts` 由宿主分配。宿主已经按这个格式接好。
2. **任务级命令没有通道。** `task.create`（要返回 `T-`）、`task.message`、`task.rerun`、`task.resume`、按任务的 `task.cancel` 需要桥接请求直达编排插件。现在宿主的临时做法：`task.message` 当普通消息发，`task.cancel` 停整轮，其余返回“要等编排插件”。
3. **宿主要直接调审计工具。** `sheet.view` 的区域和拟写值叠加、`R-`/`D-` 表的 `table.view`、`cell.trace` 要调 `workpaper_parse`、`fill_preview`、`table_view`、`trace_cell`，不经过模型。建议桥接插件加请求 `tool/call { name, args }`，用 Harness 里已挂好的审计工具服务执行。
4. **`confirmTools` 不能排除。** 只支持精确名和 `前缀*`。一个服务里有工具标了只读时，宿主只能逐个列出会改数据的工具，之后服务端新出现的工具就不会出确认卡。建议支持排除写法（如 `!mcp__oa__query_expense`）。
5. **停用的外部工具还在模型面前。** `dsh-mcp-client` 没有按工具过滤的配置，设置里停用的工具模型仍然能看到、能调。需要桥接插件按名单过滤工具注册，或 `dsh-mcp-client` 加白名单。
6. 小问题：`question.request` 没带 `callId`（这一版 dsh 的 `request.wait` 为空）；`approval.closed`、`question.closed` 没带 `sessionId`，宿主按编号在所有对话里找。

**宿主自己还没做的：**

- API Key 和令牌现在存在数据目录的 `secrets.json`（权限 600），Windows 版要换成 DPAPI 加密。
- `output.open`（用本机 Excel 打开）、`logs.export`、Electron IPC 外壳。
- `sheet.view` 里主题色只按常见浅色近似。
