// 桌面版外壳（Electron 主进程）：应用宿主（app-host）直接跑在这里，界面和宿主之间走 IPC，不开本机端口。
//
// - 界面：frontend/dist，经 app://ui/ 提供（Vite 产物用绝对路径，file:// 下找不到资源）
// - 命令：preload.cjs 的 auditDesktop.invoke → ipcMain 'audit:rpc' → AppHost.dispatch
// - 事件：AppHost.subscribe → webContents.send('audit:event')
// - Harness：用本程序自己（ELECTRON_RUN_AS_NODE=1）当 Node 跑，不另带 node.exe
// - Python：打包版用 resources/python/python.exe（依赖装在它自己的 site-packages 里）
// - 凭据：Electron safeStorage 加密成 secrets.enc；Windows 上由 DPAPI 保护，只有当前 Windows 用户能解开
//
// 数据目录：%LOCALAPPDATA%\AuditAgent（AUDIT_DATA_DIR 可改），和浏览器开发版的 ~/.audit-assistant 分开。
import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, safeStorage, screen, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { AppHost } from '../app-host/host.mjs'
import { installFileLog } from '../app-host/logs.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const ui = path.join(root, 'frontend', 'dist')
const ORIGIN = 'app://ui'

const dataDir = path.resolve(process.env.AUDIT_DATA_DIR || path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'AuditAgent'))
// Electron 自己的配置（含 safeStorage 的密钥）放在数据目录下，单实例锁也在这里
app.setPath('userData', path.join(dataDir, 'electron'))
app.setName('审计助手')
app.setAppUserModelId('cn.audit.agent')
installFileLog(path.join(dataDir, 'logs'))

/** 打包时写入的构建信息（desktop/package.mjs） */
function buildInfo() {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'))
  } catch {
    return null
  }
}

function pythonPath() {
  if (process.env.AUDIT_PYTHON) return process.env.AUDIT_PYTHON
  const bundled = path.join(process.resourcesPath, 'python', 'python.exe')
  if (app.isPackaged && fs.existsSync(bundled)) return bundled
  return process.platform === 'win32' ? 'python.exe' : 'python3'
}

/** 凭据加密存取：safeStorage（Windows 上是 DPAPI）。 */
function secretBox() {
  const file = path.join(dataDir, 'secrets.enc')
  return {
    load() {
      if (!fs.existsSync(file)) return undefined
      try {
        return JSON.parse(safeStorage.decryptString(fs.readFileSync(file)))
      } catch (error) {
        // 换了 Windows 用户或电脑、Electron 的密钥丢了：解不开就留个备份，让用户重新填 API Key
        console.error('[desktop] 凭据解不开，需要重新填写 API Key:', error.message)
        fs.renameSync(file, `${file}.${Date.now()}.bad`)
        return {}
      }
    },
    save(value) {
      const tmp = file + '.' + process.pid + '.tmp'
      fs.writeFileSync(tmp, safeStorage.encryptString(JSON.stringify(value)), { mode: 0o600 })
      fs.renameSync(tmp, file)
    },
  }
}

let win = null
let host = null

function createWindow() {
  const area = screen.getPrimaryDisplay().workAreaSize
  win = new BrowserWindow({
    width: Math.min(1440, Math.max(1100, area.width - 48)),
    height: Math.min(940, Math.max(720, area.height - 48)),
    minWidth: 1000,
    minHeight: 680,
    show: false,
    title: '审计助手',
    backgroundColor: '#f5f6f8',
    autoHideMenuBar: true,
    icon: path.join(here, 'icon.png'),
    webPreferences: { preload: path.join(here, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  })
  // 界面只在 app://ui/ 里；外部链接交给系统浏览器，其他导航（包括把文件拖进窗口）一律拦下
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ORIGIN + '/')) event.preventDefault()
  })
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  if (!app.isPackaged || process.env.AUDIT_DEVTOOLS === '1') {
    win.webContents.on('before-input-event', (_e, input) => {
      if (input.type === 'keyDown' && (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i'))) win.webContents.toggleDevTools()
    })
  }
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => (win = null))
  void win.loadURL(ORIGIN + '/index.html')
}

function fromUi(event) {
  return event.sender === win?.webContents && event.senderFrame?.url.startsWith(ORIGIN + '/')
}

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }])

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    protocol.handle('app', (request) => {
      const url = new URL(request.url)
      let file = path.join(ui, decodeURIComponent(url.pathname))
      if (url.host !== 'ui' || !file.startsWith(ui + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ui, 'index.html')
      return net.fetch(pathToFileURL(file).href)
    })

    const info = buildInfo()
    // Linux 上没有钥匙串时 safeStorage 不可用；测试时可用固定密钥的 basic 方式走通加密存取（Windows 上始终是 DPAPI）
    if (process.platform === 'linux' && process.env.AUDIT_SAFESTORAGE_BASIC === '1') safeStorage.setUsePlainTextEncryption(true)
    if (!safeStorage.isEncryptionAvailable()) console.warn('[desktop] 系统加密不可用，凭据存成明文 secrets.json')
    try {
      if (!fs.existsSync(path.join(ui, 'index.html'))) throw new Error(`没有界面文件：${ui}（先在 frontend 里 npm run build）`)
      host = new AppHost({
        dataDir,
        python: pythonPath(),
        harnessEnv: { ELECTRON_RUN_AS_NODE: '1' },
        secretBox: safeStorage.isEncryptionAvailable() ? secretBox() : undefined,
        version: info?.version ?? app.getVersion(),
        buildTime: info?.builtAt ?? '开发版',
        openPath: file => shell.openPath(file),
        chooseSavePath: async (defaultName) => {
          const r = await dialog.showSaveDialog(win, { title: '导出日志', defaultPath: path.join(app.getPath('desktop'), defaultName), filters: [{ name: 'zip', extensions: ['zip'] }] })
          return r.canceled ? null : r.filePath
        },
      })
    } catch (error) {
      console.error('[desktop] 启动失败:', error)
      dialog.showErrorBox('审计助手启动失败', String(error.message ?? error))
      app.exit(1)
      return
    }
    console.log(`[desktop] ${app.getVersion()} 数据目录 ${dataDir}  Python ${host.python}`)
    host.subscribe(event => win?.webContents.send('audit:event', event))

    ipcMain.handle('audit:rpc', async (event, method, params) => {
      if (!fromUi(event)) throw new Error('无效调用来源')
      try {
        return { ok: true, result: await host.dispatch(method, params ?? {}) }
      } catch (error) {
        if (!error.code) console.error(`[host] ${method}:`, error)
        return { ok: false, error: { code: String(error.code ?? 'ENV_INTERNAL'), message: error.message } }
      }
    })
    ipcMain.handle('audit:choose-folder', async (event, title) => {
      if (!fromUi(event)) throw new Error('无效调用来源')
      const r = await dialog.showOpenDialog(win, { title: title || '选择项目文件夹', properties: ['openDirectory', 'createDirectory'] })
      return r.canceled ? null : r.filePaths[0]
    })

    createWindow()
  })

  app.on('window-all-closed', () => app.quit())

  // 退出前正常关掉 Harness：编排插件把进行中的任务存成检查点，下次可以“从检查点继续”
  let closing = null
  let closed = false
  app.on('before-quit', (event) => {
    if (closed || !host) return
    event.preventDefault()
    if (closing) return
    closing = Promise.race([host.close(), new Promise(resolve => setTimeout(resolve, 15000))])
      .catch(error => console.error('[desktop] 关闭:', error))
      .finally(() => {
        closed = true
        app.quit()
      })
  })
}
