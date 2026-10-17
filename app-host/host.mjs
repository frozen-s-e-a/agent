// 应用宿主：实现《接口约定》的前端命令（audit-app/1），把对话转给 Harness，把 Harness 的通知转成流程事件（audit-events/1）。
// 传输层（HTTP + SSE，或以后的 Electron IPC）在 server.mjs，这里不关心。
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DSH_VERSION, normalizeBaseURL } from '../harness/launch.mjs'
import { Conversation } from './conversation.mjs'
import { HarnessProcess } from './harness.mjs'
import { NAME_PATTERN, confirmTools, patchEnv, testServer, writePatch } from './mcp.mjs'
import { SheetReader } from './sheets.mjs'
import { Store, shortId } from './store.mjs'

export class HostError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const now = () => new Date().toISOString()
const quoteSheet = name => (/^[\p{L}\p{N}_]+$/u.test(name) ? name : `'${name.replace(/'/g, "''")}'`)
const unquoteSheet = name => (/^'.*'$/.test(name) ? name.slice(1, -1).replace(/''/g, "'") : name)

/** 拟写值的显示文字：数值按单元格格式的小数位加千分位。 */
function planText(value, valueType, numFmt) {
  if (value === null || value === undefined) return ''
  if (valueType !== 'number' || !/^-?\d+(\.\d+)?$/.test(String(value))) return String(value)
  const percent = /%/.test(numFmt ?? '')
  const decimals = (/0\.(0+)/.exec(numFmt ?? '')?.[1].length) ?? (percent ? 0 : 2)
  const n = Number(value) * (percent ? 100 : 1)
  const text = Math.abs(n).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (n < 0 ? '-' : '') + text + (percent ? '%' : '')
}
const EXCEL = /\.(xlsx|xlsm)$/i
const TABLE_FILE = /\.(xlsx|xlsm|csv)$/i

/** 工具清单（审计工具的说明和参数中文名），用于动作确认卡。 */
function loadAuditTools(appRoot) {
  try {
    const list = JSON.parse(fs.readFileSync(path.join(appRoot, 'src', 'resources', 'audit-task-tools.json'), 'utf8').replace(/^﻿/, ''))
    return new Map(list.map(t => [t.name, t]))
  } catch {
    return new Map()
  }
}

export class AppHost {
  /**
   * @param {object} options
   * @param {string} options.dataDir
   * @param {string} [options.python]
   * @param {string} [options.pythonPath]
   * @param {string} [options.appRoot]
   * @param {string[]} [options.patches] 额外的 Harness 配置层（例如编排插件）
   * @param {Record<string,string>} [options.harnessEnv] 额外给 Harness 进程的环境变量（测试用）
   */
  constructor(options) {
    this.options = options
    this.store = new Store(options.dataDir)
    this.python = options.python ?? (process.platform === 'win32' ? 'python.exe' : 'python3')
    this.appRoot = options.appRoot ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    this.listeners = new Set()
    this.conversations = new Map()
    this.sheets = new SheetReader({ python: this.python, pythonPath: options.pythonPath })
    this.auditTools = loadAuditTools(this.appRoot)
    /** 当前的 Harness 进程：{ project, proc } */
    this.active = null
    this.starting = null
    this.lastBridgeStatus = null
    this.resolvedUrls = new Map()
    this.testedModels = new Map()
    this.mcpState = new Map()
    // 启动时试连一遍外部服务，设置页和左栏要显示在线状态
    this.mcpReady = Promise.all(this.store.settings.mcp.map(s => this.refreshMcp(s).catch(() => {})))
  }

  // ---------- 事件 ----------

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  broadcast(event) {
    for (const l of this.listeners) l(event)
  }

  // ---------- Harness 进程 ----------

  modelReady() {
    const s = this.store.settings
    return Boolean(s.baseUrl && s.model && this.store.secrets.model)
  }

  /** 拿到服务这个项目的 Harness 进程；换项目时换进程（接口约定 1.1）。 */
  async harnessFor(project) {
    if (this.active?.project === project && !this.active.proc.closed) return this.active.proc
    if (this.starting?.project === project) return this.starting.promise
    const promise = (async () => {
      if (this.starting) await this.starting.promise.catch(() => {})
      await this.stopHarness()
      // 上一个进程退出后的收尾（撤回卡片、任务标为中断）做完再起新进程
      await this.draining
      if (!this.modelReady()) throw new HostError('ENV_MODEL', '模型还没连上，先到设置里连接模型')
      const p = this.store.project(project)
      if (!p) throw new HostError('REF_PROJECT', `没有项目 ${project}`)
      const settings = this.store.settings
      const patch = writePatch(settings.mcp, this.store.file('mcp.patch.yml'))
      const proc = new HarnessProcess({
        projectRoot: p.folder,
        dataDir: this.store.dir,
        baseURL: settings.baseUrl,
        apiKey: this.store.secrets.model,
        model: settings.model,
        python: this.python,
        pythonPath: this.options.pythonPath,
        confirmTools: confirmTools(settings.mcp),
        patches: [...(this.options.patches ?? []), ...(patch ? [patch] : [])],
        env: { ...patchEnv(settings.mcp, this.store.secrets), ...this.options.harnessEnv },
      })
      // 通知按到达顺序逐条处理：有的要先向编排插件取号（ids/allocate），后面的通知等它处理完
      proc.queue = Promise.resolve()
      proc.on('notification', (method, params) => {
        proc.queue = proc.queue.then(() => this.onHarness(project, method, params)).catch(error => console.error(`[host] ${method}:`, error))
      })
      proc.on('exit', ({ code, signal, stderr }) => {
        if (this.active?.proc === proc) this.active = null
        const reason = code === 0 ? 'Harness 已退出' : `Harness 进程意外退出（${signal ?? code}）`
        if (code !== 0 && !proc.stopping) console.error(`[host] Harness exited (${signal ?? code})\n${stderr.slice(-2000)}`)
        proc.queue = proc.queue.then(() => this.harnessGone(project, reason)).catch(error => console.error('[host] exit:', error))
        this.draining = proc.queue
      })
      await proc.start()
      this.active = { project, proc }
      this.lastBridgeStatus = await proc.request('bridge/status', {}).catch(() => null)
      this.lastBridgeStatus && (this.lastBridgeStatus.at = now())
      await this.syncTasks(project, proc)
      return proc
    })()
    this.starting = { project, promise }
    try {
      return await promise
    } finally {
      if (this.starting?.promise === promise) this.starting = null
    }
  }

  async stopHarness() {
    const cur = this.active
    this.active = null
    if (cur) {
      cur.proc.stopping = true
      await cur.proc.stop()
    }
  }

  /** 设置改了：下次用到时按新设置重启。 */
  async restartHarness() {
    const project = this.active?.project
    await this.stopHarness()
    if (project && this.modelReady()) this.harnessFor(project).catch(() => {})
  }

  /** Harness 进程没了：进行中的回复结束、未答的卡撤回；在跑的任务标为中断，等用户从检查点继续。 */
  harnessGone(project, reason) {
    for (const c of this.conversations.values()) if (c.project === project) c.harnessGone(reason)
    for (const t of this.store.state(project).tasks) {
      if (t.status !== 'running') continue
      const conv = this.convOf(t.session)
      conv?.emit('task.blocked', { where: t.stage ?? 'understand', why: '应用重启或切换了项目，任务中断', suggest: '继续任务' }, t.task)
    }
    this.saveState(project)
  }

  /**
   * Harness 启动后对一遍任务状态：编排插件把上次没跑完的任务标为暂停（paused），
   * 宿主这边还记着“进行中”的，补一条 task.blocked，前端据此显示“从检查点继续”。
   */
  async syncTasks(project, proc) {
    const list = await proc.request('task/list', {}).catch(() => null)
    if (!Array.isArray(list)) return
    const state = this.store.state(project)
    for (const item of list) {
      const t = state.tasks.find(x => x.task === item.task)
      if (!t) continue
      if (t.status === 'running' && ['paused', 'blocked'].includes(item.status)) {
        const snap = await proc.request('task/get', { task: item.task }).catch(() => null)
        const blocked = snap?.blocked ?? { where: t.stage ?? 'understand', why: '应用重启，任务中断', suggest: '继续任务' }
        this.convOf(t.session)?.emit('task.blocked', blocked, t.task)
      }
    }
    this.saveState(project)
  }

  /** 项目内唯一的 C-、O- 号：从编排插件的项目计数取（接口约定 2.1）。Harness 不在时退回宿主自己的序号。 */
  async allocate(project, prefix) {
    const proc = this.active?.project === project ? this.active.proc : null
    if (proc && !proc.closed) {
      try {
        return (await proc.request('ids/allocate', { prefix })).id
      } catch {}
    }
    const n = this.store.next(project, prefix === 'C' ? 'card' : 'output')
    return `${prefix}-h${String(n).padStart(prefix === 'C' ? 3 : 4, '0')}`
  }

  /** 按会话编号找对话；后台任务的事件可能在对话还没加载时到达。 */
  convOf(sessionId) {
    if (!sessionId) return undefined
    try {
      return this.conversation(sessionId)
    } catch {
      return undefined
    }
  }

  async onHarness(project, method, params) {
    const conv = this.convOf(params.sessionId)
    switch (method) {
      case 'session.event':
        await conv?.onSessionEvent(params.event)
        if (params.event?.type === 'turn/end' && conv) this.saveState(conv.project)
        return
      case 'assistant.stream':
        conv?.onStream(params.frame)
        return
      case 'approval.request':
        await conv?.onApproval(params)
        return
      case 'question.request':
        await conv?.onQuestion(params)
        return
      case 'approval.closed':
      case 'question.closed':
        // 这两个通知不带会话编号，按桥接编号找
        for (const c of this.conversations.values()) if (c.project === project) c.onBridgeClosed(params.id, params.withdrawn)
        return
      case 'card.opened':
        conv?.emit('card.opened', { ...params.card, session: params.sessionId }, params.card.task)
        return
      case 'card.closed':
        // 宿主已经撤回过的卡（进程退出时），编排插件续跑时会再撤回一次，不重复推
        if (!conv?.open.has(params.card)) return
        conv.emit('card.closed', params.withdrawn ? { card: params.card, withdrawn: true } : { card: params.card, answer: params.answer }, params.task)
        return
      case 'task.event': {
        // 编排插件的流程事件（4.2）：宿主补 seq 和外层信封；task.created 补 project、message、文件名
        if (!conv || !params.type) return
        let data = params.data ?? {}
        if (params.type === 'task.created') {
          const files = this.store.state(project).files
          data = {
            ...data,
            project,
            message: data.message ?? conv.lastUserMessage,
            files: (data.files ?? []).map(f => ({ ...f, name: f.name ?? files.find(x => x.file === f.file)?.name ?? f.file })),
          }
        }
        conv.emit(params.type, data, params.task)
        if (['task.created', 'task.finished', 'task.blocked', 'output.ready'].includes(params.type)) this.saveState(project)
        return
      }
    }
  }

  // ---------- 对话 ----------

  conversation(session) {
    let conv = this.conversations.get(session)
    if (conv) return conv
    const found = this.store.findSession(session)
    if (!found) throw new HostError('REF_SESSION', `没有对话 ${session}`)
    conv = new Conversation(this, found.project, found.rec)
    this.conversations.set(session, conv)
    // 宿主重启后，上次没答的卡已随旧的 Harness 进程消失（接口约定 1.1）
    if (conv.open.size && !(this.active?.project === found.project && this.active.proc.sessions.has(session))) {
      for (const card of [...conv.open.keys()]) conv.emit('card.closed', { card, withdrawn: true })
    }
    return conv
  }

  saveState(project) {
    this.store.saveState(project)
  }

  /**
   * 任务事件累积成本地快照（4.4）。Harness 在跑时 task.get 以编排插件的快照为准，
   * 这份用于 Harness 不在时的 task.list / session.get，以及表格叠加（底稿区域、写入计划）。
   */
  trackTask(conv, event) {
    if (!event.task) return
    const state = this.store.state(conv.project)
    let t = state.tasks.find(x => x.task === event.task)
    if (!t) {
      if (event.type !== 'task.created') return
      t = { task: event.task, session: conv.id, status: 'running', stage: null, blocked: null, text: event.data.text, deliverables: [], regions: [], openCards: [], outputs: [], createdAt: event.ts, finishedAt: null, workpaper: null, plan: null, layout: {} }
      state.tasks.push(t)
    }
    t.lastSeq = event.seq
    // 中断或阻塞后又有进展（从检查点继续、重跑）：回到进行中
    if (['paused', 'blocked'].includes(t.status) && ['stage.changed', 'node.started', 'region.state', 'task.rerun'].includes(event.type)) {
      t.status = 'running'
      t.blocked = null
    }
    const d = event.data
    switch (event.type) {
      case 'task.understood': t.deliverables = d.deliverables ?? []; break
      case 'stage.changed': t.stage = d.stage; break
      case 'node.finished':
        for (const ref of d.refs ?? []) {
          if (ref.startsWith('W-')) t.workpaper = ref
          if (ref.startsWith('FP-')) t.plan = ref
        }
        break
      case 'region.state': {
        const r = t.regions.find(x => x.region === d.region)
        if (r) Object.assign(r, d)
        else t.regions.push({ ...d })
        break
      }
      case 'card.opened':
        t.openCards.push(d.card)
        // 底稿理解卡里有各区域的范围和用途，sheet.view 叠加区域时用
        if (d.kind === 'workpaper_understanding' && d.body?.workpaper) {
          t.layout ??= {}
          t.layout[d.body.workpaper] = (d.body.regions ?? []).map(r => ({ region: r.region, range: r.range, type: r.type, purpose: r.purpose, manual: r.manual ?? [] }))
        }
        break
      case 'card.closed': {
        t.openCards = t.openCards.filter(c => c !== d.card)
        const opened = conv.log.find(e => e.type === 'card.opened' && e.data.card === d.card)
        if (opened?.data.kind === 'workpaper_understanding' && d.answer?.edits?.regions) {
          const layout = t.layout?.[opened.data.body.workpaper] ?? []
          for (const edit of d.answer.edits.regions) {
            const r = edit.region && layout.find(x => x.region === edit.region)
            if (r) Object.assign(r, Object.fromEntries(['range', 'type', 'purpose'].filter(k => edit[k] !== undefined).map(k => [k, edit[k]])))
          }
        }
        break
      }
      case 'output.ready':
        t.outputs.push(d.output)
        if (!state.outputs.some(o => o.output === d.output)) {
          state.outputs.push({ output: d.output, file: d.file, name: path.basename(d.file), kind: d.kind, session: conv.id, task: event.task, checks: d.checks, at: event.ts })
        }
        break
      case 'task.blocked': t.status = 'blocked'; t.blocked = d; break
      case 'task.finished':
        t.status = d.status
        t.finishedAt = event.ts
        if (d.deliverables) t.deliverables = d.deliverables
        break
    }
  }

  describeTool(tool) {
    const m = /^mcp__([A-Za-z0-9_]+?)__(.+)$/.exec(tool)
    if (m?.[1] === 'audit') {
      const t = this.auditTools.get(m[2])
      const labels = Object.fromEntries(Object.entries(t?.inputSchema?.properties ?? {}).map(([k, v]) => [k, String(v.description ?? k).split(/[:：]/)[0]]))
      return { operation: String(t?.description ?? m[2]).split(/[—\-（(：:。]/)[0].trim() || m[2], labels }
    }
    if (m) {
      const server = this.store.settings.mcp.find(s => s.name === m[1])
      const t = server?.tools?.find(x => x.tool === m[2])
      return { operation: (t?.description || m[2]).split(/[。.\n]/)[0], labels: {} }
    }
    return { operation: tool, labels: {} }
  }

  /** 资料、产出编号 → 项目里的绝对路径 */
  resolveFile(project, id) {
    const p = this.store.project(project)
    const state = this.store.state(project)
    const rec = id.startsWith('F-') ? state.files.find(f => f.file === id) : id.startsWith('O-') ? state.outputs.find(o => o.output === id) : null
    const rel = rec ? (rec.path ?? rec.file) : id
    const abs = path.resolve(p.folder, rel)
    if (!abs.startsWith(path.resolve(p.folder) + path.sep)) throw new HostError('REF_FILE', `不在项目文件夹里：${id}`)
    if (!rec && !fs.existsSync(abs)) throw new HostError('REF_FILE', `没有文件 ${id}`)
    return abs
  }

  /** 找到文件或产出编号所属的项目（编号在项目内唯一，先找当前项目）。 */
  projectOfFile(id) {
    const order = [this.active?.project, ...this.store.projects.map(p => p.project)].filter(Boolean)
    for (const project of order) {
      const s = this.store.state(project)
      if (s.files.some(f => f.file === id) || s.outputs.some(o => o.output === id)) return project
    }
    if (this.active?.project) return this.active.project
    throw new HostError('REF_FILE', `没有文件 ${id}`)
  }

  async addFile(project, src) {
    const p = this.store.project(project)
    const state = this.store.state(project)
    const abs = path.resolve(src)
    if (!fs.existsSync(abs)) throw new HostError('IO_NOT_FOUND', `找不到文件 ${src}`)
    const hash = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex')
    const id = 'F-' + hash.slice(0, 12)
    let rel = path.relative(p.folder, abs)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      // 项目外的文件复制进项目的「资料」文件夹，审计工具只能访问项目目录
      const dir = path.join(p.folder, '资料')
      fs.mkdirSync(dir, { recursive: true })
      let dest = path.join(dir, path.basename(abs))
      if (fs.existsSync(dest) && crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex') !== hash) {
        const ext = path.extname(dest)
        dest = path.join(dir, path.basename(abs, ext) + '-' + hash.slice(0, 6) + ext)
      }
      if (!fs.existsSync(dest)) fs.copyFileSync(abs, dest)
      rel = path.relative(p.folder, dest)
    }
    rel = rel.split(path.sep).join('/')
    const known = state.files.find(f => f.file === id)
    if (known) return known
    const name = path.basename(rel)
    const rec = { file: id, name, path: rel, kind: /底稿/.test(name) ? 'workpaper' : TABLE_FILE.test(name) ? 'data' : 'other', sizeBytes: fs.statSync(abs).size, addedAt: now() }
    if (EXCEL.test(name)) rec.sheets = (await this.sheets.call('file.info', { path: path.join(p.folder, rel) }).catch(() => ({}))).sheets
    state.files.push(rec)
    this.saveState(project)
    return rec
  }

  publicFile(f) {
    const { path: _rel, ...rest } = f
    return rest
  }

  // ---------- 命令 ----------

  async dispatch(method, params = {}) {
    const fn = this.commands[method]
    if (!fn) throw new HostError('ARG_METHOD', `宿主不认识命令 ${method}`)
    return fn.call(this, params)
  }

  commands = {
    'settings.get'() {
      const s = this.store.settings
      return { baseUrl: s.baseUrl, model: s.model, models: s.models ?? [], hasKey: Boolean(this.store.secrets.model), connected: this.modelReady() }
    },
    async 'settings.save'(p) {
      const s = this.store.settings
      if (p.baseUrl !== undefined) {
        s.baseUrl = p.baseUrl ? this.resolvedUrls.get(p.baseUrl) ?? normalizeBaseURL(p.baseUrl) : ''
        if (this.testedModels.has(s.baseUrl)) s.models = this.testedModels.get(s.baseUrl)
      }
      if (p.model !== undefined) s.model = p.model
      this.store.saveSettings()
      await this.restartHarness()
      return this.commands['settings.get'].call(this)
    },
    async 'secret.save'(p) {
      if (p.key !== 'model') throw new HostError('ARG_KEY', '只支持 model')
      this.store.secrets.model = p.value
      this.store.saveSecrets()
      await this.restartHarness()
      return { saved: true }
    },
    async 'connection.test'(p) {
      const input = p.baseUrl ?? this.store.settings.baseUrl
      const key = p.key ?? this.store.secrets.model
      if (!input) return { ok: false, error: { code: 'ARG_URL', message: '没有填写模型地址' } }
      let base
      try {
        base = normalizeBaseURL(input)
      } catch (error) {
        return { ok: false, error: { code: 'ARG_URL', message: error.message } }
      }
      // 先试原样，再试补 /v1（Harness 接入实测第三节）
      const candidates = /\/v\d+$/.test(base) ? [base] : [base, base + '/v1']
      let last
      for (const url of candidates) {
        const started = Date.now()
        try {
          const res = await fetch(url + '/models', { headers: key ? { Authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(15000) })
          if (res.status === 401 || res.status === 403) return { ok: false, error: { code: 'AUTH', message: `API Key 无效（${res.status}）` } }
          if (!res.ok) {
            last = { code: 'HTTP_' + res.status, message: `${url}/models 返回 ${res.status}` }
            continue
          }
          const body = await res.json()
          const models = (body.data ?? body.models ?? []).map(m => (typeof m === 'string' ? m : m.id)).filter(Boolean)
          this.resolvedUrls.set(input, url)
          this.testedModels.set(url, models)
          if (input === this.store.settings.baseUrl || url === this.store.settings.baseUrl) {
            this.store.settings.models = models
            this.store.saveSettings()
          }
          if (p.model && models.length && !models.includes(p.model)) {
            return { ok: false, models, latencyMs: Date.now() - started, error: { code: 'MODEL', message: `模型列表里没有 ${p.model}` } }
          }
          return { ok: true, models, latencyMs: Date.now() - started }
        } catch (error) {
          last = { code: 'UNREACHABLE', message: `连不上 ${url}：${error.cause?.code ?? error.message}` }
        }
      }
      return { ok: false, error: last }
    },

    'project.list'() {
      return { projects: [...this.store.projects].sort((a, b) => String(b.lastActive ?? '').localeCompare(String(a.lastActive ?? ''))) }
    },
    'project.create'(p) {
      if (!p.name?.trim()) throw new HostError('ARG_NAME', '项目名不能为空')
      const folder = path.resolve(p.folder?.trim() || path.join(os.homedir(), '审计项目', p.name.trim()))
      fs.mkdirSync(folder, { recursive: true })
      const existing = this.store.projects.find(x => path.resolve(x.folder) === folder)
      if (existing) return existing
      const project = { project: shortId('P'), name: p.name.trim(), folder, lastActive: now() }
      this.store.projects.unshift(project)
      this.store.saveProjects()
      return project
    },
    async 'project.open'(p) {
      const project = this.store.project(p.project)
      if (!project) throw new HostError('REF_PROJECT', `没有项目 ${p.project}`)
      project.lastActive = now()
      this.store.saveProjects()
      // 打开项目时启动它的 Harness 进程；模型还没配好时等配好再启动
      if (this.modelReady()) await this.harnessFor(p.project)
      return project
    },
    'project.rename'(p) {
      const project = this.store.project(p.project)
      if (!project) throw new HostError('REF_PROJECT', `没有项目 ${p.project}`)
      project.name = p.name
      this.store.saveProjects()
      return project
    },
    async 'project.remove'(p) {
      if (this.active?.project === p.project) await this.stopHarness()
      this.store.projects = this.store.projects.filter(x => x.project !== p.project)
      this.store.saveProjects()
      return { removed: true }
    },

    async 'files.add'(p) {
      if (!this.store.project(p.project)) throw new HostError('REF_PROJECT', `没有项目 ${p.project}`)
      const files = []
      for (const src of p.paths ?? []) files.push(this.publicFile(await this.addFile(p.project, src)))
      return { files }
    },
    'files.list'(p) {
      return { files: this.store.state(p.project).files.map(f => this.publicFile(f)) }
    },
    'outputs.list'(p) {
      return { outputs: [...this.store.state(p.project).outputs].sort((a, b) => b.at.localeCompare(a.at)) }
    },
    'output.open'(p) {
      // 桌面版用本机 Excel 打开；浏览器开发模式下宿主只返回路径
      const project = this.projectOfFile(p.file)
      return { opened: true, path: this.resolveFile(project, p.file) }
    },

    'session.list'(p) {
      const state = this.store.state(p.project)
      const sessions = state.sessions.map((rec) => {
        const conv = this.conversations.get(rec.session)
        const tasks = state.tasks.filter(t => t.session === rec.session).map(t => ({ task: t.task, status: t.status }))
        return { session: rec.session, project: p.project, title: rec.title, lastActive: rec.lastActive, tasks, openCards: conv ? conv.openCards : 0 }
      })
      return { sessions: sessions.sort((a, b) => b.lastActive.localeCompare(a.lastActive)) }
    },
    'session.create'(p) {
      if (!this.store.project(p.project)) throw new HostError('REF_PROJECT', `没有项目 ${p.project}`)
      const rec = { session: shortId('S'), title: p.title ?? '新对话', lastActive: now() }
      this.store.state(p.project).sessions.push(rec)
      this.saveState(p.project)
      return { session: rec.session }
    },
    'session.get'(p) {
      const conv = this.conversation(p.session)
      const tasks = this.store.state(conv.project).tasks.filter(t => t.session === p.session).map(t => this.taskSnapshot(t))
      return { session: p.session, title: conv.rec.title, tasks, openCards: [...conv.open.values()], lastSeq: conv.seq }
    },
    'session.rename'(p) {
      const conv = this.conversation(p.session)
      conv.rec.title = p.title
      this.saveState(conv.project)
      return { session: p.session }
    },
    'session.delete'(p) {
      const found = this.store.findSession(p.session)
      if (!found) return { deleted: true }
      const state = this.store.state(found.project)
      state.sessions = state.sessions.filter(s => s.session !== p.session)
      this.conversations.delete(p.session)
      this.saveState(found.project)
      return { deleted: true }
    },
    'session.events'(p) {
      const conv = this.conversation(p.session)
      return { events: conv.log.filter(e => e.seq > (p.after ?? 0)) }
    },
    async 'message.send'(p) {
      const conv = this.conversation(p.session)
      if (!p.text?.trim()) throw new HostError('ARG_TEXT', '消息不能为空')
      const harness = await this.harnessFor(conv.project)
      const message = conv.userMessage(p.text, p.files)
      const blocks = [{ type: 'text', text: p.text }]
      if (p.files?.length) {
        const state = this.store.state(conv.project)
        const lines = p.files.map((id) => {
          const f = state.files.find(x => x.file === id)
          return f ? `- ${f.path}（${id}${f.sheets?.length ? '，工作表：' + f.sheets.join('、') : ''}）` : `- ${id}`
        })
        blocks.push({ type: 'text', text: '附上的资料（路径相对于项目目录）：\n' + lines.join('\n') })
      }
      this.saveState(conv.project)
      await harness.ensureSession(conv.id, conv.log.some(e => e.type === 'message.completed'))
      await harness.request('session/prompt', { sessionId: conv.id, contentBlocks: blocks })
      return { message }
    },
    async 'message.stop'(p) {
      const conv = this.conversation(p.session)
      if (this.active?.project === conv.project && !this.active.proc.closed && this.active.proc.sessions.has(conv.id)) {
        await this.active.proc.request('session/cancel', { sessionId: conv.id }).catch(() => {})
      }
      return { stopped: true }
    },
    async 'card.answer'(p) {
      const conv = [...this.conversations.values()].find(c => c.open.has(p.card))
      if (!conv) throw new HostError('ARG_CARD_CLOSED', '这张卡已经处理过了')
      const answer = { action: p.action, edits: p.edits ?? {}, note: p.note ?? '' }
      if (await conv.answerHostCard(p.card, answer)) return { accepted: true }
      const harness = await this.harnessFor(conv.project)
      await harness.request('card/answer', { card: p.card, ...answer })
      return { accepted: true }
    },

    // ---------- 底稿任务：由编排插件推进（task/* 请求，接口约定 1.2） ----------
    async 'task.list'(p) {
      const tasks = this.store.state(p.project).tasks
      const live = this.active?.project === p.project && !this.active.proc.closed ? await this.active.proc.request('task/list', {}).catch(() => null) : null
      return {
        tasks: tasks.map((t) => {
          const l = live?.find(x => x.task === t.task)
          // 编排插件那边的 paused 是“应用退出时中断”，宿主已经按 task.blocked 推给前端，这里保持一致
          return { ...this.taskSnapshot(t), ...(l ? { status: l.status === 'paused' && t.status === 'blocked' ? 'blocked' : l.status, deliverables: l.deliverables, finishedAt: l.finishedAt } : {}) }
        }),
      }
    },
    async 'task.get'(p) {
      const { project, task } = this.findTask(p.task)
      if (this.active?.project === project && !this.active.proc.closed) {
        const snap = await this.active.proc.request('task/get', { task: p.task }).catch(() => null)
        if (snap) return { ...snap, status: snap.status === 'paused' && task.status === 'blocked' ? 'blocked' : snap.status, lastSeq: task.lastSeq ?? 0 }
      }
      return this.taskSnapshot(task)
    },
    'task.events'(p) {
      const { task } = this.findTask(p.task)
      return { events: this.conversation(task.session).log.filter(e => e.task === p.task && e.seq > (p.after ?? 0)) }
    },
    async 'task.create'(p) {
      const conv = this.conversation(p.session)
      if (!p.text?.trim()) throw new HostError('ARG_TEXT', '任务说明不能为空')
      const harness = await this.harnessFor(conv.project)
      const state = this.store.state(conv.project)
      const files = (p.files ?? []).map((id) => {
        const f = state.files.find(x => x.file === id)
        if (!f) throw new HostError('REF_FILE', `没有资料 ${id}`)
        return { file: id, name: f.name }
      })
      if (conv.rec.title === '新对话') conv.rec.title = p.text.replace(/\s+/g, ' ').slice(0, 20)
      const { task } = await this.taskRequest(harness, 'task/create', { sessionId: conv.id, text: p.text, files, ...(p.message ? { message: p.message } : {}) })
      return { task }
    },
    async 'task.message'(p) {
      const { harness } = await this.taskHarness(p.task)
      const r = await this.taskRequest(harness, 'task/message', { task: p.task, text: p.text })
      return { accepted: true, ...r }
    },
    async 'task.cancel'(p) {
      const { harness } = await this.taskHarness(p.task)
      return this.taskRequest(harness, 'task/cancel', { task: p.task })
    },
    async 'task.resume'(p) {
      const { harness } = await this.taskHarness(p.task)
      return this.taskRequest(harness, 'task/resume', { task: p.task })
    },
    async 'task.rerun'(p) {
      const { harness } = await this.taskHarness(p.task)
      return this.taskRequest(harness, 'task/rerun', { task: p.task, scope: p.scope ?? {}, ...(p.note ? { note: p.note } : {}) })
    },

    // ---------- 表格 ----------
    async 'sheet.view'(p) {
      const project = this.projectOfFile(p.file)
      const file = this.resolveFile(project, p.file)
      if (!TABLE_FILE.test(file)) throw new HostError('ARG_FILE', '只能打开 Excel 或 CSV 文件')
      const view = await this.sheets.call('sheet.view', { path: file, sheet: p.sheet, range: p.range })
      if (p.overlay) await this.overlay(project, view, p.overlay)
      return view
    },
    async 'table.view'(p) {
      if (/^[DR]-/.test(p.table)) {
        // 资料表、结果表：审计工具的 table_view
        const project = this.active?.project
        if (!project) throw new HostError('REF_TABLE', `没有表 ${p.table}`)
        const harness = await this.harnessFor(project)
        return this.auditTool(harness, 'table_view', { table: p.table, offset: p.offset ?? 0, limit: p.limit ?? 200, ...(p.locate !== undefined ? { locate: p.locate } : {}), ...(p.columns ? { columns: p.columns } : {}) })
      }
      if (!/^[FO]-/.test(p.table)) throw new HostError('REF_TABLE', `没有表 ${p.table}`)
      const project = this.projectOfFile(p.table)
      const file = this.resolveFile(project, p.table)
      const view = await this.sheets.call('table.view', { path: file, file: p.table, offset: p.offset, limit: p.limit, locate: p.locate })
      return { table: p.table, title: path.basename(file), ...view }
    },
    async 'cell.trace'(p) {
      const project = this.projectOfFile(p.output)
      const rec = this.store.state(project).outputs.find(o => o.output === p.output)
      if (!rec) throw new HostError('REF_FILE', `没有产出 ${p.output}`)
      if (!rec.task) return { cell: p.cell, value: null, from: null }
      const harness = await this.harnessFor(project)
      const sheet = p.cell.includes('!') ? '' : (p.sheet ? quoteSheet(p.sheet) + '!' : '')
      return this.auditTool(harness, 'trace_cell', { output: rec.file, cell: sheet + p.cell })
    },

    // ---------- 外部 MCP 服务 ----------
    'mcp.list'() {
      return { servers: this.store.settings.mcp.map(s => this.publicMcp(s)) }
    },
    async 'mcp.add'(p) {
      const { token, secrets, ...cfg } = p
      this.checkMcpName(cfg.name)
      if (this.store.settings.mcp.some(s => s.name === cfg.name)) throw new HostError('MCP_NAME_TAKEN', `服务名 ${cfg.name} 已经有了`)
      const server = { name: cfg.name, title: cfg.title || cfg.name, enabled: cfg.enabled ?? true, transport: cfg.transport, command: cfg.command, args: cfg.args ?? [], env: cfg.env ?? {}, secretEnv: cfg.secretEnv ?? Object.keys(secrets ?? {}), url: cfg.url, hasToken: Boolean(token), tools: [] }
      this.store.secrets.mcp ??= {}
      this.store.secrets.mcp[server.name] = { token, env: secrets ?? {} }
      this.store.saveSecrets()
      this.store.settings.mcp.push(server)
      this.store.saveSettings()
      await this.refreshMcp(server)
      await this.restartHarness()
      return this.publicMcp(server)
    },
    async 'mcp.update'(p) {
      const server = this.store.settings.mcp.find(s => s.name === p.name)
      if (!server) throw new HostError('REF_MCP', `没有服务 ${p.name}`)
      const { name: _name, token, secrets, tools, ...rest } = p
      for (const k of ['title', 'enabled', 'transport', 'command', 'args', 'env', 'url', 'secretEnv']) if (rest[k] !== undefined) server[k] = rest[k]
      this.store.secrets.mcp ??= {}
      const sec = (this.store.secrets.mcp[server.name] ??= { env: {} })
      if (token) {
        sec.token = token
        server.hasToken = true
      }
      if (secrets) sec.env = { ...sec.env, ...secrets }
      for (const t of tools ?? []) {
        const tool = server.tools.find(x => x.tool === t.tool)
        if (tool) Object.assign(tool, t)
        else server.tools.push({ enabled: true, sideEffect: 'mutating', ...t })
      }
      this.store.saveSecrets()
      this.store.saveSettings()
      const reconnect = ['enabled', 'transport', 'command', 'args', 'env', 'url'].some(k => rest[k] !== undefined) || token || secrets
      if (reconnect) await this.refreshMcp(server)
      else this.emitMcp(server)
      await this.restartHarness()
      return this.publicMcp(server)
    },
    async 'mcp.remove'(p) {
      this.store.settings.mcp = this.store.settings.mcp.filter(s => s.name !== p.name)
      if (this.store.secrets.mcp) delete this.store.secrets.mcp[p.name]
      this.store.saveSecrets()
      this.store.saveSettings()
      this.mcpState.delete(p.name)
      await this.restartHarness()
      return { removed: true }
    },
    async 'mcp.test'(p) {
      if (p.transport) {
        this.checkMcpName(p.name)
        const known = this.store.settings.mcp.find(s => s.name === p.name)
        const saved = this.store.secrets.mcp?.[p.name] ?? {}
        return testServer({ ...known, ...p }, { token: p.token ?? saved.token, env: { ...saved.env, ...p.secrets } })
      }
      const server = this.store.settings.mcp.find(s => s.name === p.name)
      if (!server) return { ok: false, error: { code: 'MCP_UNREACHABLE', message: `没有服务 ${p.name}` } }
      const sec = this.store.secrets.mcp?.[server.name] ?? {}
      return testServer(server, { token: sec.token, env: sec.env })
    },

    // ---------- 数据与安全、关于 ----------
    async 'privacy.status'() {
      let status = this.lastBridgeStatus
      if (!status && this.active && !this.active.proc.closed) status = await this.active.proc.request('bridge/status', {}).catch(() => null)
      const active = new Set((status?.entries ?? []).filter(e => e.active).map(e => e.id))
      const verified = Boolean(status)
      const off = (item, label, ids) => {
        const on = verified && ids.some(id => active.has(id))
        return { item, label, state: on ? 'on' : 'off', ...(on ? { warning: true } : {}) }
      }
      // stdio 服务是本机程序，不算外连；只列 http 服务的地址
      const remote = this.store.settings.mcp.filter(s => s.enabled && s.transport === 'http')
      return {
        outbound: [
          { item: 'model', label: '模型请求', state: this.store.settings.baseUrl ? 'on' : 'off', target: this.store.settings.baseUrl || undefined, ...(verified && status.providers?.some(x => x !== 'enterprise') ? { warning: true } : {}) },
          { item: 'mcp', label: '外部 MCP 服务', state: remote.length ? 'on' : 'off', target: remote.map(s => s.url) },
          off('telemetry', '遥测', ['otel', 'session-telemetry-otel']),
          off('sessionLogUpload', '会话日志随请求上传', ['session-log-deepseek', 'deepseek-llm-api-extensions']),
          off('webSearch', '联网搜索', ['web', 'web-search-deepseek', 'web-deepseek-api', 'web-fetch-http', 'tool-web']),
          off('account', 'DeepSeek 账号服务', ['deepseek-account', 'llm-deepseek', 'llm-deepseek-account']),
          off('pluginInstall', '插件安装', ['plugin-manager', 'tool-plugin-manager']),
          { item: 'autoUpdate', label: '自动更新', state: 'off' },
        ],
        shell: verified && (status.tools ?? []).some(t => ['bash', 'pwsh'].includes(t)) ? 'on' : 'off',
        verifiedAt: status?.at ?? null,
      }
    },
    'app.info'() {
      return {
        version: JSON.parse(fs.readFileSync(path.join(this.appRoot, 'package.json'), 'utf8')).version,
        buildTime: '开发版',
        harness: `DeepSeek Harness ${DSH_VERSION}（固定版本）`,
        tools: '审计工具服务 0.1.0',
        interfaces: { tools: 'audit-tools/1', events: 'audit-events/1', app: 'audit-app/1', cards: 'audit-cards/1' },
        runtimes: { node: process.versions.node, python: this.python },
        dataDir: this.store.dir,
      }
    },
    'logs.export'() {
      throw new HostError('ENV_NOT_READY', '导出日志还没做')
    },
  }

  findTask(id) {
    for (const p of this.store.projects) {
      const task = this.store.state(p.project).tasks.find(x => x.task === id)
      if (task) return { project: p.project, task }
    }
    throw new HostError('REF_TASK', `没有任务 ${id}`)
  }

  async taskHarness(id) {
    const { project, task } = this.findTask(id)
    return { project, task, harness: await this.harnessFor(project) }
  }

  /** 编排插件的请求：参数错误（-32602）转成前端看得懂的错误。 */
  async taskRequest(harness, method, params) {
    try {
      return await harness.request(method, params)
    } catch (error) {
      if (error.code === -32602) throw new HostError(/unknown task/.test(error.message) ? 'REF_TASK' : 'ARG_INVALID', error.message)
      if (error.code === -32601) throw new HostError('ENV_NOT_READY', '编排插件没有加载')
      throw error
    }
  }

  /** 宿主专用的审计工具（audit/tool）：成功返回 data，失败按工具的错误码抛出。 */
  async auditTool(harness, name, args) {
    const env = await this.taskRequest(harness, 'audit/tool', { name, arguments: args })
    if (!env?.ok) throw new HostError(env?.error?.code ?? 'TOOL_FAILED', env?.error?.message ?? `${name} 失败`)
    return env.data
  }

  taskSnapshot(t) {
    return { task: t.task, session: t.session, status: t.status, blocked: t.blocked ?? null, stage: t.stage, lastSeq: t.lastSeq ?? 0, deliverables: t.deliverables, regions: t.regions, openCards: t.openCards, outputs: t.outputs, createdAt: t.createdAt, finishedAt: t.finishedAt ?? null }
  }

  /**
   * sheet.view 的叠加（4.5）：
   * - workpaper：区域范围、用途、人工格取自底稿理解卡（含用户的修改），状态取自任务的 region.state；
   * - plan：fill_preview 的拟写值；
   * - output：产出文件里由任务写入的格，按产出所属任务的写入计划标出。
   * 依赖拟写格的公式重算要本机 Excel，浏览器开发版不做，这些格不带 plan。
   */
  async overlay(project, view, overlay) {
    const tasks = this.store.state(project).tasks
    const onSheet = (ref) => {
      const i = String(ref).lastIndexOf('!')
      if (i < 0) return ref
      return unquoteSheet(ref.slice(0, i)) === view.sheet ? ref.slice(i + 1) : null
    }
    if (overlay.workpaper) {
      const t = [...tasks].reverse().find(x => x.layout?.[overlay.workpaper])
      const regions = []
      for (const r of t?.layout[overlay.workpaper] ?? []) {
        const range = onSheet(r.range)
        if (!range || r.type === 'none') continue
        const state = t.regions.find(x => x.region === r.region)?.state ?? 'pending'
        regions.push({ region: r.region, range, type: r.type, purpose: r.purpose, manual: (r.manual ?? []).map(onSheet).filter(Boolean), state })
      }
      view.overlay = { ...view.overlay, regions }
    }
    const plan = overlay.plan ?? (overlay.output ? tasks.find(t => t.task === this.store.state(project).outputs.find(o => o.output === overlay.output)?.task)?.plan : null)
    if (!plan) return
    let preview
    try {
      const harness = await this.harnessFor(project)
      preview = await this.auditTool(harness, 'fill_preview', { plan, range: `${quoteSheet(view.sheet)}!${view.range}` })
    } catch (error) {
      // 叠加拿不到时照常显示表格
      console.error('[host] fill_preview:', error.message)
      return
    }
    const byCell = new Map(view.cells.map(c => [c.cell, c]))
    const task = tasks.find(t => t.plan === plan)?.task
    for (const p of preview?.cells ?? []) {
      const cell = onSheet(p.cell)
      if (!cell) continue
      let c = byCell.get(cell)
      if (!c) {
        c = { cell, value: null, valueType: 'blank', text: '', formula: null }
        view.cells.push(c)
        byCell.set(cell, c)
      }
      if (overlay.output) {
        if (!p.manual && p.from) c.written = { from: p.from, ...(task ? { task } : {}) }
      } else {
        c.plan = p.manual ? { manual: true } : { value: p.value, text: planText(p.value, p.valueType, c.numFmt), from: p.from, overwrite: Boolean(p.overwrite) }
      }
    }
  }

  checkMcpName(name) {
    if (!name || !NAME_PATTERN.test(name)) throw new HostError('MCP_NAME_INVALID', '服务名只能用字母、数字和下划线')
    if (name.toLowerCase() === 'audit') throw new HostError('MCP_NAME_RESERVED', '服务名 audit 留给内置审计工具')
  }

  publicMcp(s) {
    const st = this.mcpState.get(s.name) ?? { state: s.enabled ? 'connecting' : 'disabled' }
    const { tools, ...cfg } = s
    return { ...cfg, ...st, tools: tools ?? [] }
  }

  emitMcp(s) {
    const st = this.mcpState.get(s.name) ?? { state: s.enabled ? 'connecting' : 'disabled' }
    this.broadcast({ v: 'audit-events/1', ts: now(), type: 'mcp.status', data: { name: s.name, ...st, toolCount: (s.tools ?? []).filter(t => t.enabled !== false).length } })
  }

  /** 试连一个服务并合并工具清单：新出现的工具按默认值（启用、mutating），消失的保留属性不显示。 */
  async refreshMcp(server) {
    if (!server.enabled) {
      this.mcpState.set(server.name, { state: 'disabled' })
      this.emitMcp(server)
      return
    }
    this.mcpState.set(server.name, { state: 'connecting' })
    this.emitMcp(server)
    const sec = this.store.secrets.mcp?.[server.name] ?? {}
    const r = await testServer(server, { token: sec.token, env: sec.env })
    if (r.ok) {
      const old = new Map(server.tools.map(t => [t.tool, t]))
      server.tools = r.tools.map(t => ({ ...t, ...(old.has(t.tool) ? { enabled: old.get(t.tool).enabled, sideEffect: old.get(t.tool).sideEffect } : {}) }))
      this.store.saveSettings()
      this.mcpState.set(server.name, { state: 'connected' })
    } else {
      this.mcpState.set(server.name, { state: 'failed', error: r.error })
    }
    this.emitMcp(server)
  }

  async close() {
    await this.mcpReady
    await this.stopHarness()
    await this.draining
    this.sheets.stop()
  }
}
