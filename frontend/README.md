# 新前端

按《新前端设计方案》做的桌面端界面：React 18 + Ant Design X（对话、输入框）+ Glide Data Grid（底稿和资料表）。只依赖接口约定（`audit-events/1`、`audit-app/1`、`audit-cards/1`），不直接接触 Harness。

## 运行

```bash
npm install
npm run dev        # 假宿主，回放样例事件；http://127.0.0.1:5173
npm run dev:real   # 真实宿主：先另开终端 node ../app-host/main.mjs（见 app-host/README.md）
npm test           # 状态累积、断线补取、撤回卡、数字格式
npm run build      # 打包版连真实宿主，由 app-host 直接提供
```

宿主有两种，都实现 `HostClient`（`src/host/client.ts`），界面代码不分：

- 真实宿主（`src/host/http/`）：连 `app-host`，它再连 Harness。浏览器里命令走 `POST /rpc`、事件走 SSE，拖进来的文件经 `/upload` 存进项目。
- 假宿主（`src/host/fake/`）：用回放文件《事件回放-底稿填写》驱动，开发界面和截图用。

`?host=real` / `?host=fake` 可以临时切换。

## 调试参数

| 参数 | 作用 |
|---|---|
| `?seq=74` | 直接回放到第 74 条事件（途中的卡片用回放里录好的回答） |
| `?theme=dark` | 深色 |
| `?chat=right` | 对话停靠右侧（`left`、`full`、`float`） |
| `?page=settings` | 打开设置 |
| `?onboarding` | 模型未连接，走首次使用 |
| `?session=S-52e1` | 打开别的对话 |
| `?dev=0` | 隐藏右上角的回放面板 |
| `?spike=grid` | 表格组件验证页 |

以上除主题和停靠位置外只对假宿主有效。右上角的回放面板可以播放、暂停、单步、跳到某个 seq、调速度、模拟断线。

## 走查脚本

```bash
node scripts/walk.mjs screens/walk light   # 从第 1 屏发消息走到成果，逐张卡点主按钮，途中断线重连，各屏截图
node scripts/shot.mjs "/?seq=29" out.png   # 单张截图
node scripts/walk-real.mjs screens/real    # 连真实宿主和 Harness（假模型）：首次使用、加资料、调审计工具、追问卡、动作确认卡、刷新后补回历史
```

用预装的 Chromium（`/opt/pw-browsers/chromium`，可用 `CHROMIUM` 环境变量改）。

## 接口缺口

前端提的接口缺口已全部补进接口约定，对照表见 [docs/接口缺口.md](docs/接口缺口.md)。
