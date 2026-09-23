import fs from 'node:fs';
let s=fs.readFileSync('docs/使用说明.md','utf8').replaceAll('0.1.0-internal.3','0.1.0-internal.4');const start=s.indexOf('在“设置→模型服务”'),end=s.indexOf('## 两种本地模式',start);s=s.slice(0,start)+`1. 打开“设置 → 模型服务”，填写服务地址和密钥。支持兼容 API 的 HTTPS 地址及本机/内网 HTTP 地址；根地址遇到 404/405 时会尝试 /v1。
2. 点击“获取可用模型”，分别选择文本模型与视觉模型；也可以展开“手动填写模型名称”。模型列表不提供可靠的视觉能力标识，请按供应商说明选择。
3. 点击“测试文本连接”或“测试视觉连接”。测试使用当前填写的配置，无需先保存；发送一条短文本，最多请求 32 个输出 Token，可能产生少量用量。成功代表对话接口可用，不代表已验证图片识别能力。
4. 保存设置。密钥由 Windows 加密保护，留空保留现有密钥。401 提示检查凭据；403 提示检查模型授权、账号权限、IP 白名单和网关策略。
5. 在对话输入框右下方选择模型，每个对话独立记忆。自动模式对纯文本使用文本模型，有图片时使用视觉模型。未配置视觉模型时会要求先选择。

点击输入框左下方回形针，选择“添加文件”“添加文件夹”或“添加图片”。无需创建项目也可使用。文件夹递归收集文件，显示清单；图片显示缩略图，附件可在发送前移除。添加时只保存本地副本，**点击发送后，文本、附件摘录与图片会发送到配置的模型服务**。原文件不会修改。连接失败或停止生成后，附件保留在草稿，便于重试。

附件读取边界：

- TXT、Markdown、CSV、TSV、JSON 等文本：每文件最多 12,000 字符，UTF-8 优先，失败尝试 GB18030。
- Excel（xlsx/xlsm）：前 5 个工作表、每表前 50 行和前 40 列；公式保留为文本，不重算。
- Word（docx）：正文与表格文字，不包含嵌入图片；PDF：前 20 页文本，扫描页明确提示需要 OCR。
- PNG、JPEG、WebP、GIF：以图片输入发送，需要所选模型支持。其他格式仅提供文件信息，明确标记没有读取正文。
- 每条草稿最多 20 项、200 个文件、100 MiB；单文件 20 MiB，单图片 8 MiB，文件夹最多 12 层，不跟随内部符号链接。
- 每轮最多摘录 30 个非图片文件、48,000 字符，超出部分明确标记为未读取。当前及最近历史合计最多发送 6 张图片，较早未重发图片会在模型上下文说明。附件摘录不是完整审计核查。

支持流式回复、停止生成、对话保存、供应商用量和已发送附件记录。附件的本地副本与摘录留存在本机应用数据目录，暂未提供自动清理功能。没有接入自动工具调用循环；本地工具仍通过命令和参数卡片执行。

本次采用隔离的本机兼容协议测试服务验证，未使用用户真实密钥或付费服务进行联调。实际服务的授权、余额与视觉支持需通过当前配置验证。费用估算、MCP/Skills 执行和插件管理尚未实现。

`+s.slice(end);fs.writeFileSync('docs/使用说明.md',s);
fs.writeFileSync('docs/模型与附件更新.md',`# 0.1.0-internal.4 模型与附件更新

新增连接测试、获取服务端模型列表、文本/视觉默认模型和每个对话的模型选择。401/403 提供不同原因提示，错误详情会隐藏当前密钥。测试使用未保存配置，保存后密钥继续由 Windows 加密。

对话通过原生窗口选择文件、文件夹和图片，复制到本地附件目录并校验 SHA-256。发送时读取有界摘录与图片，支持无项目对话、文件清单、缩略图、移除和失败后重试。文件格式与容量限制见《使用说明》。旧项目和对话沿用原数据目录。

验证包含连接协议及权限错误、不同对话的附件隔离、图片真实请求结构、原件不变和副本校验；独立 Python 进程读取 Excel/Word/PDF；Electron 界面操作及 Windows 打包运行。本机测试服务模拟供应商响应，业务附件读取和桌面管道未模拟。未调用用户真实付费服务。

当前仍为内部测试版，原工具箱全部功能迁移范围和待验收项没有改变。
`);
let fixture=fs.readFileSync('tests/fixtures/model-server.mjs','utf8').replace('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a53cAAAAASUVORK5CYII=','iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAE0lEQVR4nGOQS3H7//8/AxADWQA0hAeLJb+m9wAAAABJRU5ErkJggg==');fs.writeFileSync('tests/fixtures/model-server.mjs',fixture);
let test=fs.readFileSync('tests/e2e/models-attachments.mjs','utf8').replace("await choose('添加图片',img);","await choose('添加图片',img);await expect(page.locator('.composer img[alt=\"票据.png\"]')).toBeVisible();");fs.writeFileSync('tests/e2e/models-attachments.mjs',test);
