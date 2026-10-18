// 桌面版走一遍：真正启动 Electron 外壳（开发版或打包好的程序），连假模型，从首次使用走到导出日志和退出。
// 检查：IPC 命令和事件、选文件夹、按本机路径加资料、凭据加密保存（没有明文）、用 Excel 打开、导出日志不含 API Key、
// 退出时 Harness 一起关掉。
//
//   node desktop/test/walk.mjs [截图目录]                          开发版（desktop/node_modules/electron + 仓库里的代码）
//   node desktop/test/walk.mjs [截图目录] --app <打包好的程序>      打包版，例如 desktop/out/<版本>/linux-x64/审计助手/audit-agent
// Linux 上没有显示器时用 xvfb-run。需要 frontend 的依赖（playwright-core）、harness 的依赖和带 pandas、openpyxl 的 python3。
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import zlib from 'node:zlib'
import { fakeModel } from '../../harness/test/fake-model.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..', '..')
const { _electron: electron } = createRequire(path.join(repo, 'frontend', 'package.json'))('playwright-core')
const { values, positionals } = parseArgs({ options: { app: { type: 'string' } }, allowPositionals: true })
const out = path.resolve(positionals[0] ?? path.join(repo, 'desktop', 'out', 'walk'))
fs.mkdirSync(out, { recursive: true })

const python = process.env.AUDIT_TEST_PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3')
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'walk-desktop-'))
const dataDir = path.join(scratch, '数据')
const projectDir = path.join(scratch, '华东示例制造2025')
// Playwright 按路径选文件时路径里有中文就不触发 change（真实的系统对话框没这个问题），资料文件名用英文；项目文件夹仍用中文
const src = path.join(scratch, 'external', 'balance2025.xlsx')
fs.mkdirSync(path.dirname(src), { recursive: true })
execFileSync(python, ['-c', `import pandas as pd; pd.DataFrame({'科目编码':['1001','1002','1122','2202'],'科目名称':['库存现金','银行存款','应收账款','应付账款'],'期初余额':[1200.5,880000,1250000,-640000],'期末余额':[980.25,1035000,1835000,-712500]}).to_excel(r'''${src}''', index=False)`])

const KEY = 'sk-walk-desktop-0123456789'
const model = await fakeModel({
  script: [
    { text: '我先从余额表里提取科目和期末余额。', tools: [{ name: 'mcp__audit__select_column', args: { folder_path: '资料/balance2025.xlsx', should_merge: '是', sheet_keywords: '', columns_to_keep: '科目编码,科目名称,期末余额' } }] },
    { text: '已提取 4 个科目的期末余额，结果放在「合并列提取结果.xlsx」里。' },
  ],
})

const env = { ...process.env, AUDIT_DATA_DIR: dataDir, AUDIT_PYTHON: python, AUDIT_SAFESTORAGE_BASIC: '1' }
delete env.ELECTRON_RUN_AS_NODE
const app = values.app
  ? await electron.launch({ executablePath: path.resolve(values.app), args: ['--no-sandbox'], env })
  : await electron.launch({ executablePath: createRequire(path.join(repo, 'desktop', 'package.json'))('electron'), args: ['--no-sandbox', path.join(repo, 'desktop')], env })

const errors = []
const page = await app.firstWindow()
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => m.type() === 'error' && errors.push(m.text()))
const shot = name => page.screenshot({ path: path.join(out, `${name}.png`) })
const step = s => console.log('·', s)
const lastText = () => page.locator('.msg-ai .text').last().innerText()
async function waitText(re, ms = 60000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    const t = await lastText().catch(() => '')
    if (re.test(t)) return t
    await page.waitForTimeout(200)
  }
  throw new Error(`等不到回复 ${re}：${await lastText().catch(() => '')}`)
}
/** 读宿主导出的 zip（app-host/logs.mjs 写的：本地文件头里带大小，deflate）：{ 文件名: Buffer }。Windows 没有 unzip，不用外部程序 */
function readZip(buf) {
  const out = {}
  for (let i = 0; buf.readUInt32LE(i) === 0x04034b50;) {
    const size = buf.readUInt32LE(i + 18)
    const nameLen = buf.readUInt16LE(i + 26)
    const start = i + 30 + nameLen + buf.readUInt16LE(i + 28)
    out[buf.subarray(i + 30, i + 30 + nameLen).toString('utf8')] = zlib.inflateRawSync(buf.subarray(start, start + size))
    i = start + size
  }
  return out
}
const check = (ok, what) => {
  if (!ok) throw new Error('不对：' + what)
  console.log('  ✓', what)
}

try {
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {})
  check(page.url().startsWith('app://ui/'), `界面从 app://ui/ 加载（${page.url()}）`)
  check(await page.evaluate(() => typeof window.auditDesktop?.invoke === 'function' && typeof window.require === 'undefined'), '界面只拿到 auditDesktop，拿不到 Node')

  step('首次使用：连接模型')
  await page.getByText('开始之前').waitFor({ timeout: 30000 })
  await page.getByPlaceholder(/OpenAI 兼容格式/).fill(model.baseURL.replace(/\/v1$/, ''))
  await page.getByPlaceholder('粘贴 API Key').fill(KEY)
  await page.getByRole('button', { name: '测试连接' }).click()
  await page.getByText(/连接正常/).waitFor()
  await shot('1-连接模型')
  await page.getByRole('button', { name: '下一步' }).click()

  step('新建项目：点“选择…”弹系统对话框（测试里替换成固定结果）')
  fs.mkdirSync(projectDir, { recursive: true })
  await app.evaluate(({ dialog }, folder) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] })
  }, projectDir)
  await page.getByRole('button', { name: '选择…' }).click()
  await page.getByPlaceholder(/项目名称/).fill('华东示例制造 2025年报审计')
  check((await page.getByPlaceholder(/项目文件夹/).inputValue()) === projectDir, '选中的文件夹填进了输入框')
  await shot('2-新建项目')
  await page.getByRole('button', { name: /创\s*建/ }).click()
  await page.getByText('要做什么？').waitFor({ timeout: 30000 })

  step('凭据')
  check(fs.existsSync(path.join(dataDir, 'secrets.enc')), '数据目录里有 secrets.enc')
  check(!fs.existsSync(path.join(dataDir, 'secrets.json')), '没有明文 secrets.json')
  check(!fs.readFileSync(path.join(dataDir, 'secrets.enc')).includes(KEY), 'secrets.enc 里找不到 API Key 原文')

  step('加资料：按本机路径')
  await page.locator('.side-tab', { hasText: '资料' }).click()
  await page.locator('.side-actions input[type=file]').setInputFiles(src)
  await page.locator('.file-row', { hasText: 'balance2025.xlsx' }).waitFor({ timeout: 30000 })
  check(fs.existsSync(path.join(projectDir, '资料', 'balance2025.xlsx')), '项目外的文件复制进了项目的「资料」')
  await shot('3-资料已加入')

  step('发消息：调审计工具，出产出')
  const input = page.locator('.composer textarea')
  await input.fill('从余额表里提取各科目的期末余额')
  await input.press('Enter')
  await waitText(/已提取 4 个科目/)
  await page.waitForTimeout(500)
  await shot('4-工具调用和回复')

  step('用 Excel 打开产出（测试里替换 shell.openPath，记下路径）')
  await app.evaluate(({ shell }) => {
    globalThis.__opened = []
    shell.openPath = async (p) => (globalThis.__opened.push(p), '')
  })
  const outputs = await page.evaluate(async () => {
    const r = await window.auditDesktop.invoke('project.list', {})
    return window.auditDesktop.invoke('outputs.list', { project: r.result.projects[0].project })
  })
  const output = outputs.result.outputs[0]
  check(Boolean(output), `有产出 ${output?.name}`)
  const opened = await page.evaluate(file => window.auditDesktop.invoke('output.open', { file }), output.output)
  check(opened.ok, 'output.open 成功')
  const openedPaths = await app.evaluate(() => globalThis.__opened)
  check(openedPaths.length === 1 && openedPaths[0].endsWith(output.name) && fs.existsSync(openedPaths[0]), `交给系统打开的是产出文件（${openedPaths[0]}）`)

  step('导出日志（测试里替换保存对话框）')
  const zipPath = path.join(scratch, 'logs.zip')
  await app.evaluate(({ dialog }, file) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: file })
  }, zipPath)
  const today = new Date().toISOString().slice(0, 10)
  const exported = await page.evaluate(d => window.auditDesktop.invoke('logs.export', { from: d, to: d, includeContent: true }), today)
  check(exported.ok && exported.result.file === zipPath && fs.statSync(zipPath).size === exported.result.sizeBytes, `导出了 ${(exported.result?.sizeBytes / 1024).toFixed(0)} KB`)
  const entries = readZip(fs.readFileSync(zipPath))
  const names = Object.keys(entries)
  check(names.includes('app-info.json') && names.some(n => n.startsWith('events/')) && names.some(n => n.startsWith('logs/host-')), 'zip 里有 app-info、事件和宿主日志')
  const leaked = names.filter(n => entries[n].includes(KEY))
  check(!leaked.length, `日志里没有 API Key 原文（含资料内容时也没有）${leaked.join('、')}`)
  const cancelled = await (async () => {
    await app.evaluate(({ dialog }) => {
      dialog.showSaveDialog = async () => ({ canceled: true })
    })
    return page.evaluate(() => window.auditDesktop.invoke('logs.export', { from: '2026-01-01', to: '2026-12-31', includeContent: false }))
  })()
  check(!cancelled.ok && cancelled.error.code === 'USER_CANCELLED', '取消保存时返回 USER_CANCELLED')

  step('关于')
  const info = await page.evaluate(() => window.auditDesktop.invoke('app.info', {}))
  console.log('  ', JSON.stringify(info.result))
  check(info.result.dataDir === dataDir, '数据目录是 AUDIT_DATA_DIR')

  step('设置页')
  await page.locator('.side-foot, .sidebar').getByText('设置').first().click().catch(() => {})
  await page.getByText('关于').first().click().catch(() => {})
  await page.waitForTimeout(600)
  await shot('5-关于')
} catch (error) {
  await shot('x-失败').catch(() => {})
  console.error('失败：', error.message)
  process.exitCode = 1
} finally {
  if (errors.length) console.log('页面错误：\n' + errors.join('\n'))
  if (process.exitCode) {
    for (const f of fs.readdirSync(path.join(dataDir, 'logs')).filter(f => f.startsWith('host-'))) console.log(`--- ${f}\n` + fs.readFileSync(path.join(dataDir, 'logs', f), 'utf8').slice(-4000))
  }
  const pid = app.process().pid
  await app.close()
  // 退出后没有留下 Harness 进程（Harness 用本程序以 Node 方式运行，环境变量里带 AUDIT_PROJECT_ROOT=项目目录）
  if (process.platform === 'linux') {
    const left = fs.readdirSync('/proc').filter(p => /^\d+$/.test(p)).filter((p) => {
      try {
        return fs.readFileSync(`/proc/${p}/environ`, 'utf8').includes(`AUDIT_DATA_DIR=${dataDir}`) && Number(p) !== pid
      } catch {
        return false
      }
    })
    if (left.length) {
      console.error('失败：退出后还有进程', left)
      process.exitCode = 1
    } else {
      console.log('  ✓ 退出后没有留下进程')
    }
  }
  await model.close()
  fs.rmSync(scratch, { recursive: true, force: true })
}
