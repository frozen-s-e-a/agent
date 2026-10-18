# 桌面版（desktop）

双击运行的 Windows 程序：Electron 外壳 + 应用宿主（`app-host`）+ Harness（`harness`）+ 新前端（`frontend`）+ 审计工具服务（`src/audit-mcp` 等）+ 内置 Python。

## 结构

- 宿主直接跑在 Electron 主进程里，界面和宿主之间走 IPC（`preload.cjs` 暴露 `window.auditDesktop`，前端用 `frontend/src/host/desktop/IpcHost.ts`），不开本机端口。
- 界面从 `app://ui/` 加载 `frontend/dist`；外部链接交给系统浏览器，其他导航和权限请求一律拒绝。
- Harness 用本程序自己以 Node 方式运行（`ELECTRON_RUN_AS_NODE=1`，Electron 44 自带 Node 24），不另带 node.exe。
- Python：打包版用 `resources/python/python.exe`（nuget 上的官方完整版 Python 3.13），`requirements.txt` 的依赖直接装在它的 `Lib/site-packages` 里。
- API Key 和 MCP 令牌：用 Electron `safeStorage` 加密存成数据目录下的 `secrets.enc`。Windows 上 `safeStorage` 的密钥由 DPAPI 保护，只有当前 Windows 用户能解开。以前的明文 `secrets.json` 第一次启动时迁移后删除。
- 产出“用 Excel 打开”交给系统默认程序；“导出日志”弹系统保存对话框，zip 里不含 API Key 和令牌。
- 退出时先正常关掉 Harness（进行中的任务存成检查点），最多等 15 秒。

数据目录：`%LOCALAPPDATA%\AuditAgent`（`AUDIT_DATA_DIR` 可改），和浏览器开发版的 `~/.audit-assistant` 分开。Electron 自己的配置在其下 `electron\`，宿主日志在 `logs\`。

## 开发时运行

```sh
cd harness && npm ci
cd frontend && npm ci && npm run build
cd desktop && npm ci && npm start          # 用系统的 python（AUDIT_PYTHON 可指定）；F12 打开开发者工具
```

## 打包

```sh
cd desktop && npm ci
npm run package           # 程序文件夹 + 安装包（有 NSIS 时）
npm run package:zip       # 再加一个免安装 zip
npm run package:folder    # 程序文件夹 + 免安装 zip，不出安装包
node package.mjs --zip --no-installer --skip-frontend   # 直接传参数
```

Windows PowerShell 里 `npm run package -- --zip` 的 `--` 会被吃掉；用上面的 `package:zip` / `package:folder`，或直接 `node package.mjs ...`（脚本也会认 npm 转来的 `--zip`、`--no-installer`）。

在 Windows 或 Linux 上都能打 Windows x64 版：

- Electron 从 GitHub 下载，按 `SHASUMS256.txt` 校验；Python 从 nuget 下载；都缓存在 `desktop/.cache`。
- Harness 的 npm 依赖按目标平台装（`npm ci --os=win32 --cpu=x64`），去掉审计配置层用不到的文档预览（LibreOffice）和语音识别包。
- Python 依赖用本机的 `python -m pip` 按 `win_amd64` 下载 wheel 装进内置 Python（本机要有 python 和 pip，能连 PyPI）。
- 程序图标和版本信息用 `resedit` 写进 exe。
- 有 NSIS（`makensis`）时出安装包：装到 `%LOCALAPPDATA%\Programs\AuditAgent`，不要管理员权限，建桌面和开始菜单快捷方式；卸载只删程序文件，数据目录保留。

输出在 `desktop/out/<版本>/`：

| 文件 | 说明 |
|---|---|
| `审计助手-<版本>-安装.exe` | 安装包 |
| `审计助手-<版本>-win-x64.zip` | 免安装版（`--zip`），解压后双击 `审计助手.exe` |
| `win32-x64/审计助手/` | 程序文件夹 |

`--target linux-x64` 打一个 Linux 版程序文件夹（用系统的 python3），只用来在 Linux 上验证打包内容是否齐全。

## 测试

```sh
node --test app-host/test/desktop.test.mjs                 # 凭据加密和迁移、用本机程序打开、导出日志
xvfb-run -a node desktop/test/walk.mjs [截图目录]          # 真正启动 Electron 走一遍（开发版）
xvfb-run -a node desktop/test/walk.mjs [截图目录] --app desktop/out/<版本>/linux-x64/审计助手/audit-agent   # 打包版
```

`walk.mjs` 连假模型，从首次使用（连模型、选文件夹建项目）走到加资料、调审计工具出产出、用 Excel 打开、导出日志，检查凭据没有明文、日志里没有 API Key、退出后没有留下进程。Windows 上直接 `node desktop/test/walk.mjs`。

## 还没做

- 代码签名：安装包和程序没有签名，第一次运行时 Windows SmartScreen 可能提示“未知发布者”，点“更多信息 → 仍要运行”。
- 自动更新：没有，新版本重新运行安装包覆盖安装。
- 写入计划叠加时依赖格的重算（要本机 Excel，见 `app-host/README.md`）。
