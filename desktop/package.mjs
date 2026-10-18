#!/usr/bin/env node
// 打包桌面版：Electron 外壳 + 应用宿主 + Harness（含依赖）+ 新前端 + 审计工具服务 + 内置 Python（含依赖）。
//
//   cd desktop && npm ci && npm run package            Windows x64：程序文件夹、安装包（有 makensis 时）
//   npm run package:zip                                 另出一个免安装 zip（等同 node desktop/package.mjs --zip）
//   npm run package:folder                              只出程序文件夹和 zip，不出安装包
//   node desktop/package.mjs --target linux-x64         Linux 版程序文件夹，只用来在 Linux 上验证打包内容（用系统的 python3）
//
// 在 Windows 和 Linux 上都能打 Windows 版：Electron、Python 从官方源下载（按 SHA256 / 版本固定，缓存在 desktop/.cache），
// Harness 的 npm 依赖按目标平台装（npm ci --os --cpu），Python 依赖按 requirements.txt 下载 win_amd64 的 wheel 装进内置 Python。
// 需要：Node ≥ 22、npm、能联网的 python（带 pip），出安装包还要 NSIS（makensis）。
//
// 输出：desktop/out/<版本>/<目标>/审计助手/（双击 审计助手.exe）
//       desktop/out/<版本>/审计助手-<版本>-安装.exe、审计助手-<版本>-win-x64.zip
import { execFileSync, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values: args } = parseArgs({
  options: {
    target: { type: 'string', default: 'win32-x64' },
    zip: { type: 'boolean', default: false },
    installer: { type: 'boolean', default: true },
    'skip-frontend': { type: 'boolean', default: false },
    python: { type: 'string', default: process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3') },
  },
  allowNegative: true,
})
// Windows PowerShell 里 `npm run package -- --zip` 的 `--` 会被 npm.ps1 吃掉，--zip 就成了 npm 自己的配置项（npm_config_zip），
// 脚本收不到参数。这里把 npm 转来的这几项也认上，并且报出认不出的项，免得静默打出不想要的东西。
for (const [name, value] of Object.entries(process.env)) {
  const m = /^npm_config_(zip|installer|skip_frontend)$/.exec(name)
  if (!m) continue
  const key = m[1].replace('_', '-')
  if (process.argv.slice(2).some(a => a.replace(/^--(no-)?/, '').split('=')[0] === key)) continue
  args[key] = !['false', ''].includes(value)
  console.log(`（从 npm 参数取 --${key}=${args[key]}）`)
}

const PYTHON_VERSION = '3.13.16' // nuget 包 python（完整布局，认 PYTHONPATH 和脚本目录）；和 requirements.txt 的 wheel 对应
const PRODUCT = '审计助手'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(here, 'package.json'), 'utf8'))
const ELECTRON_VERSION = pkg.devDependencies.electron
const version = pkg.version
const [major, minor, patch] = version.split(/[.-]/).map(Number)
const build = Number(/(\d+)$/.exec(version)?.[1] ?? 0)
const target = args.target
const win = target.startsWith('win32')
if (!['win32-x64', 'linux-x64'].includes(target)) throw new Error(`不支持的目标：${target}`)

const cache = path.join(here, '.cache')
const outRoot = path.join(here, 'out', version)
const appDir = path.join(outRoot, target, PRODUCT)
const resources = path.join(appDir, 'resources')
const appRoot = path.join(resources, 'app')
fs.mkdirSync(cache, { recursive: true })

const step = msg => console.log(`\n== ${msg}`)
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const run = (cmd, argv, options = {}) => {
  const r = spawnSync(cmd, argv, { stdio: 'inherit', shell: process.platform === 'win32' && /^(npm|npx)$/.test(cmd), ...options })
  if (r.status !== 0) throw new Error(`${cmd} ${argv.join(' ')} 失败（${r.status ?? r.error?.message}）`)
}

async function download(url, file) {
  if (fs.existsSync(file)) return file
  console.log(`下载 ${url}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`下载失败 ${res.status}：${url}`)
  const tmp = file + '.part'
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()))
  fs.renameSync(tmp, file)
  return file
}

function unzip(file, dest) {
  fs.mkdirSync(dest, { recursive: true })
  // Windows 10 起自带的 tar（bsdtar）能解 zip；Linux 用 unzip
  if (process.platform === 'win32') run('tar', ['-xf', file, '-C', dest])
  else run('unzip', ['-q', '-o', file, '-d', dest])
}

const skip = src => {
  const base = path.basename(src)
  return base !== '__pycache__' && !base.endsWith('.pyc') && base !== 'test' && base !== '.DS_Store'
}
const copy = (from, to, filter = skip) => fs.cpSync(path.join(repo, from), path.join(appRoot, to ?? from), { recursive: true, filter, dereference: true })

// ---------- 0. 清空输出 ----------
step(`打包 ${PRODUCT} ${version}（${target}）`)
fs.rmSync(path.join(outRoot, target), { recursive: true, force: true })

// ---------- 1. 前端 ----------
if (!args['skip-frontend']) {
  step('构建前端')
  run('npm', ['run', 'build'], { cwd: path.join(repo, 'frontend') })
}
if (!fs.existsSync(path.join(repo, 'frontend', 'dist', 'index.html'))) throw new Error('没有 frontend/dist，先在 frontend 里 npm ci && npm run build')

// ---------- 2. Electron ----------
step(`Electron ${ELECTRON_VERSION}`)
const base = `https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}`
const zipName = `electron-v${ELECTRON_VERSION}-${target}.zip`
const sums = await download(`${base}/SHASUMS256.txt`, path.join(cache, `electron-${ELECTRON_VERSION}-SHASUMS256.txt`))
const expected = fs.readFileSync(sums, 'utf8').split('\n').find(l => l.endsWith('*' + zipName))?.split(' ')[0]
if (!expected) throw new Error(`SHASUMS256.txt 里没有 ${zipName}`)
const electronZip = await download(`${base}/${zipName}`, path.join(cache, zipName))
if (sha256(electronZip) !== expected) {
  fs.rmSync(electronZip)
  throw new Error(`${zipName} 校验不对，已删除，重新运行会重新下载`)
}
unzip(electronZip, appDir)
fs.rmSync(path.join(resources, 'default_app.asar'), { force: true })
const exe = path.join(appDir, win ? `${PRODUCT}.exe` : 'audit-agent')
fs.renameSync(path.join(appDir, win ? 'electron.exe' : 'electron'), exe)
if (win) {
  // 程序图标和版本信息（任务管理器、属性里显示“审计助手”而不是 Electron）
  const ResEdit = await import('resedit')
  const image = ResEdit.NtExecutable.from(fs.readFileSync(exe), { ignoreCert: true })
  const res = ResEdit.NtExecutableResource.from(image)
  const icon = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(here, 'icon.ico')))
  const group = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries)[0]
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, group?.id ?? 1, group?.lang ?? 1033, icon.icons.map(i => i.data))
  const info = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0]
  info.setFileVersion(major, minor, patch, build, 1033)
  info.setProductVersion(major, minor, patch, build, 1033)
  for (const lang of info.getAllLanguagesForStringValues()) {
    info.setStringValues(lang, { ProductName: PRODUCT, FileDescription: PRODUCT, CompanyName: '', LegalCopyright: '', OriginalFilename: `${PRODUCT}.exe`, InternalName: PRODUCT, FileVersion: version, ProductVersion: version })
  }
  info.outputToResourceEntries(res.entries)
  res.outputResource(image)
  fs.writeFileSync(exe, Buffer.from(image.generate()))
}

// ---------- 3. 应用代码 ----------
step('应用代码')
fs.mkdirSync(appRoot, { recursive: true })
for (const f of ['main.mjs', 'preload.cjs', 'icon.png']) copy(path.join('desktop', f))
copy('app-host')
copy('frontend/dist')
for (const dir of ['audit-mcp', 'audit-domain', 'audit-worker', 'resources']) copy(path.join('src', dir))
for (const f of ['launch.mjs', 'package.json', 'package-lock.json', 'README.md']) copy(path.join('harness', f))
for (const dir of ['plugins', 'profile', 'skills']) copy(path.join('harness', dir))
copy('docs/THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.md')
fs.writeFileSync(path.join(appRoot, 'package.json'), JSON.stringify({ name: pkg.name, productName: PRODUCT, version, private: true, type: 'module', main: 'desktop/main.mjs' }, null, 2))

// ---------- 4. Harness 的依赖（按目标平台） ----------
step('Harness 依赖')
const lockHash = sha256(path.join(repo, 'harness', 'package-lock.json')).slice(0, 12)
const modules = path.join(cache, `harness-modules-${target}-${lockHash}`)
if (!fs.existsSync(path.join(modules, 'node_modules'))) {
  fs.rmSync(modules, { recursive: true, force: true })
  fs.mkdirSync(modules, { recursive: true })
  for (const f of ['package.json', 'package-lock.json']) fs.copyFileSync(path.join(repo, 'harness', f), path.join(modules, f))
  const [os, cpu] = target.split('-')
  run('npm', ['ci', '--omit=dev', `--os=${os}`, `--cpu=${cpu}`, '--no-audit', '--no-fund', '--ignore-scripts'], { cwd: modules })
}
// 审计配置层用不到的大件：文档预览（LibreOffice）、语音识别
const unused = name => /^(libreoffice-kit-|sherpa-onnx-)/.test(name)
fs.cpSync(path.join(modules, 'node_modules'), path.join(appRoot, 'harness', 'node_modules'), {
  recursive: true,
  filter: src => !unused(path.basename(src)),
})

// ---------- 5. Python ----------
let pythonVersion = 'system python3'
if (win) {
  step(`Python ${PYTHON_VERSION}`)
  const nupkg = await download(`https://api.nuget.org/v3-flatcontainer/python/${PYTHON_VERSION}/python.${PYTHON_VERSION}.nupkg`, path.join(cache, `python.${PYTHON_VERSION}.nupkg`))
  const unpacked = path.join(cache, `python-${PYTHON_VERSION}`)
  if (!fs.existsSync(path.join(unpacked, 'tools', 'python.exe'))) {
    fs.rmSync(unpacked, { recursive: true, force: true })
    unzip(nupkg, unpacked)
  }
  const py = path.join(resources, 'python')
  // 去掉开发用的部分：头文件、导入库、测试、图形界面库、pip
  const dropPy = new Set(['include', 'libs', 'test', 'idlelib', 'tkinter', 'turtledemo', 'ensurepip', 'tcl', '__pycache__'])
  fs.cpSync(path.join(unpacked, 'tools'), py, { recursive: true, filter: src => !dropPy.has(path.basename(src)) && !/^pip(-|$)/.test(path.basename(src)) })
  const site = path.join(py, 'Lib', 'site-packages')
  run(args.python, ['-m', 'pip', 'install', '--disable-pip-version-check', '--no-warn-script-location', '--target', site,
    '--platform', 'win_amd64', '--python-version', PYTHON_VERSION.split('.').slice(0, 2).join('.'), '--implementation', 'cp',
    '--only-binary=:all:', '--no-deps', '--no-compile', '-r', path.join(repo, 'requirements.txt')])
  fs.rmSync(path.join(site, 'bin'), { recursive: true, force: true })
  pythonVersion = PYTHON_VERSION
}

// ---------- 6. 构建信息 ----------
let revision = 'unknown'
let dirty = true
try {
  revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim()
  dirty = Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' }).trim())
} catch {}
const builtAt = new Date().toISOString()
fs.writeFileSync(path.join(appRoot, 'build-info.json'), JSON.stringify({ product: PRODUCT, version, builtAt, target, revision, dirty, electron: ELECTRON_VERSION, python: pythonVersion, dsh: JSON.parse(fs.readFileSync(path.join(appRoot, 'harness', 'node_modules', '@deepseek-ai', 'dsh', 'package.json'), 'utf8')).version }, null, 2))

let files = 0
let bytes = 0
const count = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) count(p)
    else {
      files++
      bytes += fs.statSync(p).size
    }
  }
}
count(appDir)
console.log(`\n程序文件夹：${appDir}（${files} 个文件，${(bytes / 1e6).toFixed(0)} MB）`)
if (!win) process.exit(0)

// ---------- 7. 免安装 zip、安装包 ----------
if (args.zip) {
  step('免安装 zip')
  const zipOut = path.join(outRoot, `${PRODUCT}-${version}-win-x64.zip`)
  fs.rmSync(zipOut, { force: true })
  if (process.platform === 'win32') {
    // 系统自带的 tar 打这么多文件（超过 65535 个）、中文文件名的 zip 不可靠；用 .NET 的 ZipFile（支持 zip64 和 UTF-8 文件名），路径经环境变量传，避开命令行编码
    const script = "Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:ZIP_SRC, $env:ZIP_OUT, [IO.Compression.CompressionLevel]::Optimal, $true)"
    run('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, ZIP_SRC: appDir, ZIP_OUT: zipOut } })
  } else {
    run('zip', ['-qry', zipOut, PRODUCT], { cwd: path.dirname(appDir) })
  }
  if (!fs.existsSync(zipOut)) throw new Error(`没有生成 zip：${zipOut}`)
  console.log(`\n免安装 zip：${zipOut}（${(fs.statSync(zipOut).size / 1e6).toFixed(0)} MB）`)
}

if (args.installer) {
  const makensis = [process.env.MAKENSIS, 'makensis', 'C:\\Program Files (x86)\\NSIS\\makensis.exe', 'C:\\Program Files\\NSIS\\makensis.exe'].find(c => c && spawnSync(c, ['-VERSION']).status === 0)
  if (!makensis) {
    console.log('\n没有找到 NSIS（makensis），跳过安装包；程序文件夹可以直接用。')
  } else {
    step('安装包')
    // 安装和卸载时只动程序文件夹顶层的这些项，避免装到已有文件夹里时误删别的文件
    const top = fs.readdirSync(appDir, { withFileTypes: true })
    const lines = top.map(e => (e.isDirectory() ? `  RMDir /r "$INSTDIR\\${e.name}"` : `  Delete "$INSTDIR\\${e.name}"`))
    const nsh = path.join(outRoot, 'remove-files.nsh')
    fs.writeFileSync(nsh, '\uFEFF!macro RemoveAppFiles\n' + lines.join('\n') + '\n!macroend\n')
    const setup = path.join(outRoot, `${PRODUCT}-${version}-安装.exe`)
    const size = Math.ceil(bytes / 1024)
    // Linux 上的 makensis 按区域设置转换参数，路径里有中文时要 UTF-8
    const nsisEnv = process.platform === 'win32' ? process.env : { ...process.env, LC_ALL: 'C.UTF-8', LANG: 'C.UTF-8' }
    run(makensis, ['-V2', '-INPUTCHARSET', 'UTF8', `-DVERSION=${version}`, `-DVERSION_NUM=${major}.${minor}.${patch}.${build}`, `-DSRC=${appDir}`, `-DOUTFILE=${setup}`, `-DREMOVE_NSH=${nsh}`, `-DICON=${path.join(here, 'icon.ico')}`, `-DSIZE_KB=${size}`, path.join(here, 'installer.nsi')], { env: nsisEnv })
    console.log(`\n安装包：${setup}（${(fs.statSync(setup).size / 1e6).toFixed(0)} MB）`)
  }
}
