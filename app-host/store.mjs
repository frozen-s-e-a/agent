// 宿主的本地数据：设置、凭据、项目、对话、资料、产出、事件日志。都放在数据目录下的 JSON / JSONL 文件里。
//
// <数据目录>/
//   settings.json            模型地址、模型名、外部 MCP 服务配置（不含令牌原文）
//   secrets.json             API Key 和 MCP 令牌（只在本机，不回传前端）。浏览器开发版用明文（权限 600）；
//                            桌面版传入 secretBox，存成 secrets.enc（Windows 上由 DPAPI 加密），旧的明文文件迁移后删除
//   projects.json            项目列表
//   projects/<P->/state.json 对话、资料、产出、计数器
//   projects/<P->/events/<S->.jsonl  对话事件（audit-events/1），按 seq 追加
//   harness/                 Harness 的会话日志（DSH_HOME）
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

function writeJson(file, value, mode) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = file + '.' + process.pid + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), mode ? { mode } : undefined)
  fs.renameSync(tmp, file)
}

export const shortId = prefix => prefix + '-' + crypto.randomBytes(2).toString('hex')

export class Store {
  /**
   * @param {string} dataDir
   * @param {object} [options]
   * @param {{ load(): object | undefined, save(value: object): void }} [options.secretBox] 凭据的加密存取（桌面版）
   */
  constructor(dataDir, { secretBox } = {}) {
    this.dir = path.resolve(dataDir)
    fs.mkdirSync(this.dir, { recursive: true })
    this.settings = readJson(this.file('settings.json'), { baseUrl: '', model: '', models: [], mcp: [] })
    this.settings.mcp ??= []
    this.secretBox = secretBox
    if (secretBox) {
      this.secrets = secretBox.load()
      const plain = this.file('secrets.json')
      if (!this.secrets) {
        this.secrets = readJson(plain, {})
        // 有旧的明文才迁移；还没填过的不建空的 secrets.enc
        if (fs.existsSync(plain)) secretBox.save(this.secrets)
      }
      fs.rmSync(plain, { force: true })
    } else {
      this.secrets = readJson(this.file('secrets.json'), {})
    }
    this.projects = readJson(this.file('projects.json'), [])
    this.states = new Map()
  }

  file(...parts) {
    return path.join(this.dir, ...parts)
  }

  saveSettings() {
    writeJson(this.file('settings.json'), this.settings)
  }

  saveSecrets() {
    if (this.secretBox) this.secretBox.save(this.secrets)
    else writeJson(this.file('secrets.json'), this.secrets, 0o600)
  }

  saveProjects() {
    writeJson(this.file('projects.json'), this.projects)
  }

  project(id) {
    return this.projects.find(p => p.project === id)
  }

  /** 项目的对话、资料、产出。 */
  state(project) {
    let s = this.states.get(project)
    if (!s) {
      s = readJson(this.file('projects', project, 'state.json'), { sessions: [], files: [], outputs: [], tasks: [], counters: {} })
      s.tasks ??= []
      s.counters ??= {}
      this.states.set(project, s)
    }
    return s
  }

  saveState(project) {
    writeJson(this.file('projects', project, 'state.json'), this.state(project))
  }

  /** 项目内的序号：M-0001、O-0001、C-h001。 */
  next(project, kind) {
    const s = this.state(project)
    s.counters[kind] = (s.counters[kind] ?? 0) + 1
    return s.counters[kind]
  }

  findSession(session) {
    for (const p of this.projects) {
      const rec = this.state(p.project).sessions.find(s => s.session === session)
      if (rec) return { project: p.project, rec }
    }
    return undefined
  }

  eventsFile(project, session) {
    return this.file('projects', project, 'events', session + '.jsonl')
  }

  appendEvent(project, event) {
    const file = this.eventsFile(project, event.session)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.appendFileSync(file, JSON.stringify(event) + '\n')
  }

  readEvents(project, session) {
    try {
      return fs.readFileSync(this.eventsFile(project, session), 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line))
    } catch (error) {
      if (error.code === 'ENOENT') return []
      throw error
    }
  }
}
