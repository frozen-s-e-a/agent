# 应用宿主（app-host）

新前端和 Harness 之间的那一层，对应《接口约定》第一节图里的“应用宿主（Node）”：

- 按 `audit-app/1` 响应前端命令：设置、凭据、项目、资料、对话、卡片、表格、外部 MCP 服务、数据与安全。
- 一个项目一个 Harness 进程（`harness/launch.mjs` 启动，桥接插件和编排插件在里面）。对话转成 `session/prompt`，Harness 的通知按接口约定 4.8 的对应表转成 `audit-events/1` 事件，分配 `seq`、写事件日志、推给前端。
- 底稿任务由编排插件推进：`task.*` 命令转成 `task/*` 请求，流程事件来自 `task.event` 通知；`cell.trace`、`R-`/`D-` 表的 `table.view`、`sheet.view` 的写入计划叠加经 `audit/tool` 调审计工具（接口约定 1.2）。
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
node --test --test-concurrency=1 app-host/test/*.test.mjs   # 真实 Harness + 假模型，12 项（底稿任务用假审计工具服务）
cd frontend && node scripts/walk-real.mjs screens/real          # 浏览器里从首次使用走到动作确认，各步截图
cd frontend && node scripts/walk-task.mjs screens/task          # 浏览器里走底稿任务：三张卡、完成、重启后从检查点继续
```

## 文件

| 文件 | 作用 |
|---|---|
| `host.mjs` | 命令实现、Harness 进程管理、任务命令转发、任务快照、表格叠加 |
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
| 编排卡片 | `card.opened` / `card.closed` 原样转；任务的卡片信封带 `task` |
| 流程事件（`task.*`、`stage.changed`、`node.*`、`check.result`、`region.state`、`user.message`、任务的 `tool.*` 和 `output.ready`） | `task.event`，宿主补 `seq` 和信封；`task.created` 补 `project`、`message`（这一轮的用户消息）和文件名 |
| 卡片撤回 | Harness 进程退出（切项目、改设置、崩溃、宿主重启）时，未答的卡都推 `card.closed`（`withdrawn: true`）；插件续跑时再撤回同一张卡不重复推 |
| 任务中断 | 正常关闭时编排插件自己发 `task.blocked`（`paused: true`，状态 `paused`）；进程意外退出时宿主替它补，重启后 `task/list` 报 `paused` 而宿主还记着进行中的也补。前端“从检查点继续”调 `task.resume`，插件发 `task.resumed` 后回到进行中 |

`C-`、`O-` 号：宿主出的卡（动作确认、追问）和对话产出从 `ids/allocate` 取，和编排插件共用项目计数。Harness 不在时退回宿主自己的 `C-h001` / `O-h0001`。

通知按到达顺序逐条处理（要取号的会等），进程退出后的收尾做完才起新进程。

**表格叠加**（`sheet.view` 的 `overlay`）：区域的范围、用途、表头行、合计行、人工格和状态取自编排插件的 `task/get`（Harness 不在时取底稿理解卡和 `region.state`）；写入计划和“已写入”标记来自 `fill_preview`（`output` 按产出所属任务的写入计划）。依赖拟写格的公式重算要本机 Excel，浏览器开发版不做，这些格不带 `plan`。

## 外部服务的确认和停用

之前提给桥接插件和编排插件的缺口（续跑事件、快照里的区域信息、`confirmTools` 排除项、停用工具、追问和关闭通知的编号）已在 PR #3 补上，宿主已按《接口补充（二）》对接：

- 外部服务的确认名单写成 `mcp__<服务>__*` 加只读工具的排除项（`!mcp__<服务>__<工具>`），服务端之后新出现的工具默认要确认；
- 设置里停用的工具作为 `disabledTools` 传给 Harness，改动后重启 Harness。

## 还缺的

- API Key 和令牌现在存在数据目录的 `secrets.json`（权限 600），Windows 版要换成 DPAPI 加密。
- `output.open`（用本机 Excel 打开）、`logs.export`、Electron IPC 外壳。
- 写入计划叠加时依赖格的重算（要本机 Excel）。
- `sheet.view` 里主题色只按常见浅色近似。
