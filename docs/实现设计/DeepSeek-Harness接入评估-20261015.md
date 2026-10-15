# 套用 DeepSeek Harness 的评估

日期：2026-10-15。

**依据：**
- 上游 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（下称 dsh）的最新提交 `86a402200d`，即 0.2.1-alpha.4（2026-10-15）。
- 只阅读了源码和文档，没有运行。
- 下文的文件位置都相对于上游仓库根目录。

---

## 结论

**方向可行，也是仓库最早定下的路线。**
- 实现分支的 `docs/项目方案.md` 第 3 节，当初就选定"固定版本的 dsh + 本项目适配层"。
- 后来因为 Windows 构建没有完成，改成了自写的最小适配器（`docs/implementation-notes.md` 的 ADR-009）。
- 现有程序里反复出问题的那套 Node 对话循环，就是这个替代品。

**dsh 能直接提供的：**
- 对话循环和上下文压缩；
- 大工具结果落盘，只给模型预览；
- 会话日志逐步落盘，崩溃后可以续跑；
- 工具执行管线和拦截点；
- 子 Agent：干净上下文、限定工具、按 schema 输出；
- MCP 工具挂载、技能目录；
- Windows x64 桌面打包。

这些正好是现有自写运行时最薄弱、新设计第九、十一、十二、十四节原本要自己写的部分。

**dsh 不会自动解决审计准确性。**
- 它的主循环同样是"模型自己挑工具"，弱模型在复杂任务上的问题不会因换框架消失。
- 跑通之后，底稿识别、口径与计算、核对、填写仍按设计做，只是改成 dsh 上的插件和工具（第四节）。

**接入前必须处理的 4 件事：**
1. **企业模型的接口格式。**
   - dsh 原生的 DeepSeek 适配器用 Anthropic Messages 格式（`/v1/messages`），不是 OpenAI 格式。
   - 企业服务如果只支持 OpenAI 格式（`/chat/completions`），要改用 pi-ai 适配器，并在配置里写死模型参数。
2. **数据外发默认开着，必须全部关掉。**
   - 每次模型请求都附带会话日志，内容包括用户内容、工具参数和结果。
   - 遥测发往 `deepseeksvc.com`，联网搜索走 `api.deepseek.com`。
3. **版本变化极快。**
   - 开发者预览，6 月以来发了 29 个版本。
   - 最初方案固定的版本之后又有 6,257 个提交，每个版本都有破坏性变更。
   - 必须固定版本，升级单独评估。
4. **嵌入接口不全。**
   - SDK 没有取消、审批和提问。
   - ACP 有取消和"允许一次 / 拒绝"，没有提问。
   - 我们的确认卡和追问要自己写一个插件转发。

---

## 一、dsh 是什么

- DeepSeek 官方开源的 Agent 框架，MIT 许可，运行在 Node 上（要求 `^22.19.0 || >=24.0.0`）。
- 采用插件架构：模型适配器、工具、会话日志、对话循环本身都是插件，都可以通过配置替换（`docs/architecture.zh.md`）。
- **启动方式（profile）：**
  - `web`：浏览器界面；
  - `headless`：一次性运行；
  - `sdk`、`sdk-minimal`：标准输入输出上的 JSON-RPC；
  - `acp`：Agent Client Protocol。
- 另有 Electron 桌面版，Windows x64，NSIS 安装包。
- **状态：**开发者预览，README 明确写了"将出现破坏兼容性的变更"。最新 0.2.1-alpha.4，还没有正式版。

---

## 二、对照我们的需要

| 需要 | dsh 现状 | 怎么处理 |
|---|---|---|
| 用户只填地址和 Key | 原生适配器：Anthropic 格式，可改 `baseURL`。pi-ai 适配器：支持 OpenAI 格式，但要声明 `api`、`models`、`contextWindow`、`compat`（`packages/llm/llm-pi-ai/README.zh.md`） | 地址和 Key 以外的参数由我们写进配置，用户仍只填两项 |
| 128K 上下文 | 默认按 1M 或 262K 计算。压缩余量默认 65,536，按 128K 算约 4.9 万 token 就开始压缩。中文 token 估算偏少（`packages/compaction/compaction-basic/README.zh.md`） | 按 128K 配置窗口、输出上限，余量改为 8K～16K |
| 结构化输出 | 没有 `response_format` 和 JSON schema 约束。做法是让模型调用 `structured_output` 工具，再校验、出错重试（`packages/subagent/subagent/src/structured.ts`） | 和设计的约束解码不同，准确性靠校验 |
| 思考内容回传 | 原生适配器按 thinking 块回传；pi-ai 路由的回传方式未验证 | 实测 |
| 30 分钟以上的长任务 | 会话日志每步落盘，崩溃后可续跑。但对话循环没有步数上限；后台任务和 workflow 运行不能跨重启续跑 | 用插件补步数上限和阶段记录 |
| 审计工具 | 自定义工具要写成 TypeScript 插件或 MCP 服务器（`packages/mcp/mcp-client`） | 现有 63 项 Python 工具不是 MCP 服务器，要写一个薄封装 |
| 每个判断节点一个干净上下文 | 子 Agent 支持新上下文、限定工具、输出 schema（`docs/subsystems/subagent.md`） | 对应设计的逐区域判断 |
| 流程由代码控制 | 有宿主自带固定脚本的先例（`packages/experimental/tool-ralph`）。workflow 引擎不能注入自定义函数，不能续跑 | 编排写成我们自己的插件 |
| 校验与重做 | `tools/post-execute` 可以拦下结果、要求重做；`agent/turn-stopping` 可以阻止结束并追加反馈。没有内置验证器 | 设计第十三节的验证器挂在这两处 |
| 确认与追问 | 有审批和提问机制，但 SDK 不转发给宿主，ACP 只有允许和拒绝 | 写转发插件 |
| 技能 | 目录只列名称和描述，由模型决定加载（`packages/skill/tool-skill`） | 现有 SKILL.md 可以转过来，比按触发词注入合理 |
| Windows | 桌面版和 Python SDK 支持 x64。shell 换成 PowerShell，5.1 版下中文输入可能乱码。沙箱只限制写入 | 关掉 shell，只开放审计工具 |
| 内网 | 遥测、联网搜索、会话日志上传、DeepSeek 账号、桌面版自动更新默认会外连（`packages/bundle/base/cordis.patch.yml`） | 全部关闭；npm 包用内网镜像或离线包 |

---

## 三、接入方式

### A. 先用 dsh 自带的 Web 界面跑通（验证用）

- **做法：**
  - 在一台能连企业模型的 Windows 电脑上，装固定版本的 dsh；
  - 加载我们写的配置：模型接法、关闭外发、关闭 shell 和文件写入、挂上审计工具；
  - 用 dsh 自带界面跑真实任务。
- **好处：**最快知道"能不能用"，同时就是阶段 0 的基准。
- **缺点：**界面是 dsh 的；需要 Node 环境和 npm 包。

### B. 嵌入现有程序

- **做法：**
  - Node 后端以子进程方式启动 dsh（ACP profile）；
  - 客户端显示 dsh 的会话事件；
  - 写一个插件，把确认和提问转给我们的界面。
- **好处：**保留现有界面、项目、附件和打包。
- **缺点：**工作量中等偏大。dsh 没有面向第三方桌面程序的嵌入指南。

### 建议：先 A 后 B

A 用到的配置文件和工具封装，B 原样复用。A 验证通过再做 B，避免在不确定的底座上先做大量界面工作。

---

## 四、在 dsh 上怎么落实审计设计

### 4.1 由 dsh 取代的设计内容

| 设计章节 | 由 dsh 的什么取代 |
|---|---|
| 第十一节 模型网关 | 大部分由 LLM 适配器、重试、空闲超时、usage 计量取代。约束解码 dsh 没有，改为校验 |
| 第十二节 上下文管理器 | 压缩、大结果落盘、子 Agent 的干净上下文 |
| 第十四节 状态存储与编排 | 会话日志与续跑取代一部分；阶段记录仍要自己做 |
| 第九节 自由模式 | dsh 的主循环就是自由模式 |

### 4.2 仍按设计做，改成 dsh 上的部件

- **Python 计算侧改为 MCP 服务器。**
  - 内容：底稿结构解析、资料导入、受控 SQL、自动核对、填写与回读。
  - 沿用 DuckDB、openpyxl 和 `workbook_plan.py`。
  - 对应设计第五到八节。
- **编排写成 TypeScript 插件。**
  - 按设计第三节的阶段推进；
  - 每个判断节点起一个子 Agent：干净上下文、限定工具、输出 schema；
  - 代码核对不通过，就带着原因重做。
- **验证器：**挂在 `tools/post-execute` 和 `agent/turn-stopping` 上。
- **确认卡与追问：**由转发插件交给我们的界面。
- **技能：**口径要素、手册框架等审计指南。

### 4.3 与原设计的变化

- 设计 2.1 的"Python Agent 服务"不再负责编排，Python 只做计算工具。
- 编排放在 dsh 插件里，用 TypeScript 写。

---

## 五、现有代码的改动

| 类别 | 内容 |
|---|---|
| 移除 | `src/agent/`、`src/harness-adapter/`、`src/workflows/`、`src/mcp/independent-client.mjs`（由 MCP 服务器取代）、技能加载器 |
| 新增 | dsh 固定版本依赖和配置补丁；审计工具 MCP 服务器（Python，封装 `task_worker.py` 与 `audit-worker`）；Node 后端启动 dsh 并转发事件；确认与提问转发插件；底稿流程编排插件 |
| 保留 | 桌面外壳、项目、会话、附件、凭据、内置 Python、审计工具本身 |
| 打包 | 打包用的 Node 要 ≥22.19（开发环境是 22.22，打包用的 `node.exe` 版本待查）；Windows x64 原生模块 koffi、node-pty；第三方许可清单（LibreOffice 套件为 MPL-2.0） |

---

## 六、第一步

**不依赖企业环境、可以先做的：**
1. 写 dsh 配置补丁：
   - 企业模型的两种接法（Anthropic 格式、OpenAI 格式）；
   - 128K 窗口和压缩参数；
   - 关闭全部外发；
   - 关闭 shell 和文件写入。
2. 把现有审计工具封装成 MCP 服务器，在 dsh 里挂载。
3. 固定 0.2.1-alpha.4，用仓库已有的假模型服务跑通一个端到端例子：工具能被调用，结果能返回。npm 上已有这个版本。
4. 写一份企业电脑上的安装与验证步骤。

**需要企业环境确认的：**企业模型服务支持哪种接口格式。在能访问模型的电脑上运行下面两条命令，看哪条返回正常内容（把地址、Key、模型名换成实际值）：

```
curl -s <地址>/v1/messages -H "x-api-key: <Key>" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" -d "{\"model\":\"<模型名>\",\"max_tokens\":16,\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}"

curl -s <地址>/v1/chat/completions -H "Authorization: Bearer <Key>" -H "content-type: application/json" -d "{\"model\":\"<模型名>\",\"max_tokens\":16,\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}"
```
