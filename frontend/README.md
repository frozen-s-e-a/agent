# 新前端

按《新前端设计方案》做的桌面端界面：React 18 + Ant Design X（对话、输入框）+ Glide Data Grid（底稿和资料表）。只依赖接口约定（`audit-events/1`、`audit-app/1`、`audit-cards/1`），不依赖 Harness。

## 运行

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm test           # 状态累积、断线补取、撤回卡、数字格式
npm run build
```

现在接的是假宿主（`src/host/fake/`），用回放文件《事件回放-底稿填写》驱动。接真宿主只换 `HostClient` 这一层（`src/host/client.ts`）。

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

右上角的回放面板可以播放、暂停、单步、跳到某个 seq、调速度、模拟断线。

## 走查脚本

```bash
node scripts/walk.mjs screens/walk light   # 从第 1 屏发消息走到成果，逐张卡点主按钮，途中断线重连，各屏截图
node scripts/shot.mjs "/?seq=29" out.png   # 单张截图
```

用预装的 Chromium（`/opt/pw-browsers/chromium`，可用 `CHROMIUM` 环境变量改）。

## 接口缺口

前端提的接口缺口已全部补进接口约定，对照表见 [docs/接口缺口.md](docs/接口缺口.md)。
