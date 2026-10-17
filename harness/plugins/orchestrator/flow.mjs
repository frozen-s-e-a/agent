// 一个底稿任务的流程（设计第三到八节）：A 需求理解 → B 底稿识别 → C 资料导入 → 理解确认 →
// D 定口径 → E 口径确认 → F 计算与核对 → G 填写 → H 说明 → 结果卡。
//
// 流程由代码推进：何时开始、结束、是否通过都在这里判断；模型只在节点里做一件事（model.mjs）。
// 每个节点的输出存为检查点（state.steps）；续跑时已完成的节点直接取检查点，不重复调用、不重复推送事件。
// 事件按《接口约定》4.2 推送（task.event 通知，宿主补上 seq 和信封）；卡片经 auditCards（桥接插件）发出。
import { NODES } from './prompts.mjs'
import { ToolError } from './tools.mjs'

export const STAGES = ['understand', 'workpaper', 'data', 'basis', 'confirm', 'compute', 'fill', 'notes', 'review']
const stageIndex = stage => STAGES.indexOf(stage)
const FINAL = new Set(['completed', 'partial', 'cancelled', 'failed'])
const DONE_REGION = new Set(['checked', 'written', 'manual', 'skipped', 'failed'])

/** 用户停止任务、否定理解或在差异卡上选择停止。 */
export class TaskStop extends Error {
  constructor(message, status = 'cancelled') { super(message); this.status = status }
}

/** Harness 进程退出：任务停在当前检查点，状态记为暂停，下次 task/resume 继续。 */
export class TaskShutdown extends Error {}

/** 需要人处理才能继续（文件或环境问题、模型服务不可用）。任务挂起，可以续跑。 */
class TaskBlocked extends Error {
  constructor({ where, why, suggest }) { super(why); this.where = where; this.why = why; this.suggest = suggest }
}

/** 受控查询的参数或引用错误：回填给定口径的模型修正（设计 7.2）。 */
class QueryError extends Error {
  constructor(error) { super(error.message); this.error = error }
}

const isAbort = (error, signal) => signal?.aborted || error?.name === 'AbortError' || error?.code === 'ABORTED'

/** 十进制字符串加千分位，保留原有小数位。 */
export function formatAmount(value) {
  if (value === null || value === undefined) return '—'
  const text = String(value)
  const match = text.match(/^(-?)(\d+)(\.\d+)?$/)
  if (!match) return text
  return match[1] + match[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (match[3] ?? '')
}

const toNumber = value => Number(String(value ?? '').replace(/,/g, ''))

/** 文字里的数字（含千分位、小数、百分号）。 */
function numbersIn(text) {
  return [...String(text).matchAll(/-?\d[\d,]*(?:\.\d+)?%?/g)].map(m => m[0]).filter(n => /\d{2,}|\./.test(n.replace(/[,%-]/g, '')) || n.includes('.'))
}

/** 新任务的初始状态。files 为 F- 编号或 { file, name }。 */
export function newTaskState({ task, sessionId, text, files = [], message }) {
  return {
    task, sessionId, text, message: message ?? null, createdAt: new Date().toISOString(),
    files: files.map(f => typeof f === 'string' ? { file: f } : { file: f.file, ...(f.name ? { name: f.name } : {}) }),
    status: 'running', stage: null, stageIndex: -1, deliverables: [],
    anchors: [{ text, basis: 'user', ...(message ? { message } : {}) }],
    regions: {}, tables: [], steps: {}, checks: [], openCards: [], outputs: [], notes: [],
  }
}

export class TaskRunner {
  /**
   * @param {object} options
   * @param {object} options.state 任务状态（持久化到 task.json）
   * @param {import('./store.mjs').Store} options.store
   * @param {{ call: Function }} options.tools 审计工具调用（tools.mjs）
   * @param {{ call: Function }} options.model 节点模型调用（model.mjs）
   * @param {object} options.cards 桥接插件的 auditCards 服务
   * @param {(method: string, params: object) => void} options.notify
   * @param {object} options.config 编排插件配置
   */
  constructor({ state, store, tools, model, cards, notify, config }) {
    Object.assign(this, { state, store, tools, model, cards, notify, config })
    this.controller = undefined
    this.running = undefined
  }

  get signal() { return this.controller?.signal }

  // ---------- 状态与事件 ----------

  save() { this.store.save(this.state) }

  emit(type, data) {
    const { sessionId, task } = this.state
    this.notify('task.event', { sessionId, task, type, data, ts: new Date().toISOString() })
  }

  setStage(stage) {
    if (stageIndex(stage) <= (this.state.stageIndex ?? -1)) return
    this.state.stageIndex = stageIndex(stage)
    this.state.stage = stage
    this.save()
    this.emit('stage.changed', { stage })
  }

  region(id) { return this.state.regions[id] }

  setRegion(id, patch) {
    const region = this.region(id)
    const changed = Object.entries(patch).some(([key, value]) => JSON.stringify(region[key]) !== JSON.stringify(value))
    Object.assign(region, patch)
    this.save()
    if (!changed) return
    const data = { region: id, state: region.state }
    for (const key of ['attempt', 'refs', 'card']) if (key in patch) data[key] = patch[key]
    this.emit('region.state', data)
  }

  /** 检查点：key 已完成时直接返回保存的输出。stage、region 用于重跑时判断哪些检查点作废（4.7）。 */
  async step(key, { stage, region } = {}, fn) {
    const saved = this.state.steps[key]
    if (saved) return saved.value
    const value = await fn()
    this.state.steps[key] = { stage: stage ?? this.state.stage, ...(region ? { region } : {}), value: value ?? null }
    this.save()
    return value ?? null
  }

  /** 一个节点：推送 node.started / node.finished。fn 返回 { value, refs } 或直接返回值。 */
  async node(node, kind, { region } = {}, fn) {
    this.emit('node.started', { node, kind, ...(region ? { region } : {}) })
    try {
      const out = await fn()
      const refs = out && typeof out === 'object' && Array.isArray(out.refs) ? out.refs : []
      this.emit('node.finished', { node, outcome: 'passed', refs, ...(region ? { region } : {}) })
      return out && typeof out === 'object' && 'value' in out ? out.value : out
    } catch (error) {
      if (!isAbort(error, this.signal)) this.emit('node.finished', { node, outcome: 'failed', refs: [], ...(region ? { region } : {}), reason: error.message })
      throw error
    }
  }

  check(check, passed, { region, attempt = 1, detail } = {}) {
    this.state.checks.push({ check, region: region ?? null, attempt, passed, stage: this.state.stage })
    this.save()
    this.emit('check.result', { check, passed, attempt, ...(region ? { region } : {}), ...(detail ? { detail } : {}) })
  }

  retry(node, region, attempt, reason) {
    this.emit('node.retry', { node, ...(region ? { region } : {}), attempt, reason })
  }

  tool(name, args, region) {
    return this.tools.call(name, args, { signal: this.signal, region, emit: (type, data) => this.emit(type, data) })
  }

  ask(node, region, input, check) {
    const spec = NODES[node]
    return this.model.call({
      task: this.state.task, node, region, role: spec.role, prompt: spec.prompt, version: spec.version, schema: spec.schema,
      input: { anchors: this.state.anchors, ...input }, check, signal: this.signal,
    })
  }

  /**
   * 出一张卡片并等回答。回答作为检查点保存：续跑时已答的卡不再出。
   * 未答的卡记在 state.openCards，进程重启续跑时先撤回（新卡用新编号，《接口约定》1.1）。
   */
  async card(key, { stage, region, signal } = {}, card, { wait = true } = {}) {
    const saved = this.state.steps[key]
    if (saved) return saved.value
    const id = this.store.allocate('C')
    const full = { card: id, task: this.state.task, ...card }
    this.state.openCards.push(id)
    this.save()
    const answered = this.cards.open({ sessionId: this.state.sessionId }, full, signal ?? this.signal).then((answer) => {
      this.state.openCards = this.state.openCards.filter(c => c !== id)
      this.state.steps[key] = { stage: stage ?? this.state.stage, ...(region ? { region } : {}), value: answer }
      this.save()
      return answer
    }, (error) => {
      this.state.openCards = this.state.openCards.filter(c => c !== id)
      this.save()
      throw error
    })
    if (!wait) {
      answered.catch(() => {})
      return { card: id, answered }
    }
    return { ...(await answered), card: id }
  }

  // ---------- 运行 ----------

  /** 开始或继续运行；已在运行时返回同一个 Promise。 */
  start() {
    if (this.running) return this.running
    this.controller = new AbortController()
    for (const card of this.state.openCards) this.cards.withdraw(this.state.sessionId, card, this.state.task)
    this.state.openCards = []
    const from = this.state.status
    this.state.status = 'running'
    this.state.blocked = null
    this.save()
    // 暂停或阻塞后继续：宿主据此马上把任务显示回进行中，不用等下一条进度
    if (['paused', 'blocked'].includes(from)) this.emit('task.resumed', { from, stage: this.state.stage ?? null })
    this.running = this.loop().finally(() => { this.running = undefined })
    return this.running
  }

  /**
   * 应用退出时暂停：存盘并发 task.blocked（paused: true）。
   * 宿主发 shutdown 时在输出关闭前同步调用；之后流程收到中止再调一次时不重复发。
   */
  pause() {
    if (this.state.status === 'paused') return
    this.state.status = 'paused'
    this.state.blocked = { where: this.state.stage ?? null, why: '应用退出，任务中断', suggest: '继续任务', paused: true }
    this.save()
    this.emit('task.blocked', this.state.blocked)
  }

  cancel() {
    if (!this.running) return false
    this.controller.abort(new TaskStop('用户停止了任务'))
    return true
  }

  async loop() {
    try {
      for (;;) {
        await this.pipeline()
        const rerun = this.state.pendingRerun
        if (!rerun) break
        this.state.pendingRerun = null
        this.applyRerun(rerun)
      }
    } catch (error) {
      if (this.signal?.reason instanceof TaskShutdown) {
        this.pause()
        return
      }
      if (error instanceof TaskStop || isAbort(error, this.signal)) {
        const reason = this.signal?.reason instanceof TaskStop ? this.signal.reason : error
        return this.finish(reason instanceof TaskStop ? reason.status : 'cancelled')
      }
      if (error instanceof TaskBlocked) {
        this.state.status = 'blocked'
        this.state.blocked = { where: error.where, why: error.why, suggest: error.suggest }
        this.save()
        this.emit('task.blocked', this.state.blocked)
        return
      }
      this.state.blocked = { where: this.state.stage, why: error.message, suggest: '查看日志后重试' }
      this.emit('task.blocked', this.state.blocked)
      return this.finish('failed')
    }
  }

  finish(status) {
    this.state.status = status
    this.state.finishedAt = new Date().toISOString()
    for (const d of this.state.deliverables) {
      if (d.status === 'in_progress') d.status = status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'failed'
    }
    this.save()
    this.emit('task.finished', { status, deliverables: this.state.deliverables })
  }

  /** 把工具错误按《接口约定》2.4 的分类转成流程动作。 */
  blockOn(error, where) {
    if (error instanceof ToolError && /^(IO_|ENV_)/.test(error.code ?? '')) {
      throw new TaskBlocked({ where, why: error.message, suggest: error.hint ?? '检查文件和运行环境后继续任务' })
    }
    if (error?.unavailable) throw new TaskBlocked({ where, why: error.message, suggest: '模型服务恢复后继续任务' })
    throw error
  }

  async pipeline() {
    const s = this.state
    // ---------- A 需求理解 ----------
    this.setStage('understand')
    const understanding = await this.step('understand', { stage: 'understand' }, async () => {
      const value = await this.node('understand', 'model', {}, () => this.ask('understand', undefined, { files: s.files }, (v) => {
        const text = s.anchors.map(a => a.text).join('\n')
        return v.constraints.filter(c => !text.includes(c)).map(c => `constraints 中的“${c}”不是用户原话`)
      })).catch(e => this.blockOn(e, 'understand'))
      this.emit('task.understood', { deliverables: value.deliverables, period: value.period, scope: value.scope, constraints: value.constraints, subtasks: value.subtasks })
      return value
    })
    if (!s.deliverables.length) {
      s.deliverables = understanding.deliverables.map(d => ({ ...d, status: 'in_progress' }))
      this.save()
    }
    if (understanding.unclear?.length) {
      const answer = await this.card('card:unclear', { stage: 'understand' }, {
        kind: 'question', title: '需要先确认几件事', blocking: true,
        body: { questions: understanding.unclear.map((q, i) => ({ id: 'q' + (i + 1), text: q.item + (q.why ? `（${q.why}）` : ''), options: q.options.map(label => ({ label })), suggest: q.suggest, allowText: true })) },
        actions: ['confirm'], defaultAction: 'confirm',
      })
      if (!s.steps['anchors:unclear']) {
        understanding.unclear.forEach((q, i) => {
          const picked = answer.edits?.['q' + (i + 1)] ?? q.suggest
          s.anchors.push({ text: `${q.item}：${typeof picked === 'number' ? q.options[picked] : picked}`, basis: 'user', card: answer.card })
        })
        s.steps['anchors:unclear'] = { stage: 'understand', value: true }
        this.save()
      }
    }

    const workpaperFile = understanding.deliverables.find(d => d.kind === 'workpaper' && d.file)?.file
    const dataFiles = s.files.map(f => f.file).filter(f => f !== workpaperFile)

    // ---------- B 底稿识别 ----------
    let template = null
    if (workpaperFile) {
      this.setStage('workpaper')
      const parsed = await this.step('workpaper_parse', { stage: 'workpaper' }, () => this.node('workpaper_parse', 'code', {}, async () => {
        const env = await this.tool('workpaper_parse', { file: workpaperFile, sheets: null }).catch(e => this.blockOn(e, 'workpaper_parse'))
        return { value: env.data, refs: [env.data.workpaper] }
      }))
      s.workpaper = { workpaper: parsed.workpaper, fingerprint: parsed.fingerprint, file: workpaperFile }
      for (const sheet of parsed.sheets ?? []) {
        for (const r of sheet.regions ?? []) {
          s.regions[r.id] ??= { region: r.id, range: r.range, type: r.type, state: 'pending', attempt: 0, attemptBase: 0, refs: [], card: null, parsed: r, confirmed: [] }
        }
      }
      this.save()
      template = await this.step('template_match', { stage: 'workpaper' }, async () => {
        const env = await this.tool('template_match', { fingerprint: parsed.fingerprint }).catch(e => this.blockOn(e, 'template_match'))
        return env.data
      })
      const regions = Object.values(s.regions)
      for (const r of regions) if (r.type === 'none' && r.state === 'pending') this.setRegion(r.region, { state: 'skipped' })
      await this.settleAll(regions.filter(r => r.type !== 'none').map(r => () => this.regionSemantics(r.region, template)))
    }

    // ---------- C 资料识别与导入 ----------
    if (dataFiles.length) {
      this.setStage('data')
      for (const file of dataFiles) await this.importFile(file)
    }

    // ---------- 底稿理解确认（首次使用的模板） ----------
    if (workpaperFile && !template?.known) await this.confirmUnderstanding()

    // ---------- D/E/F 每个区域定口径、确认、计算与核对 ----------
    const work = Object.values(s.regions).filter(r => !['none', 'text'].includes(r.type) && !['skipped', 'manual', 'failed'].includes(r.state))
    if (work.length || !workpaperFile) this.setStage('basis')
    await this.settleAll(work.filter(r => !['checked', 'written'].includes(r.state)).map(r => () => this.regionCompute(r.region)))

    // ---------- G 填写 ----------
    if (workpaperFile) await this.fill()

    // ---------- H 说明 ----------
    await this.notes()

    // ---------- 结果卡与结束 ----------
    this.setStage('review')
    await this.review()
  }

  /** 并行跑多个区域；一个区域出错不影响其他区域，取消和挂起向上抛。 */
  async settleAll(jobs) {
    // 一个区域上用户选择停止：中止整个任务，其他区域等待中的卡片随之撤回
    const results = await Promise.allSettled(jobs.map(job => job().catch((error) => {
      if (error instanceof TaskStop && !this.signal.aborted) this.controller.abort(error)
      throw error
    })))
    const fatal = results.find(r => r.status === 'rejected' && (r.reason instanceof TaskStop || r.reason instanceof TaskBlocked || isAbort(r.reason, this.signal)))
    if (fatal) throw fatal.reason
    const other = results.find(r => r.status === 'rejected')
    if (other) throw other.reason
  }

  failRegion(id, reason) {
    this.region(id).failure = reason
    this.setRegion(id, { state: 'failed', card: null })
  }

  // ---------- B2 区域语义 ----------

  async regionSemantics(id, template) {
    const r = this.region(id)
    if (r.semantics) return
    const known = template?.known ? template.regions?.find(t => t.region === id) : undefined
    if (known) {
      r.semantics = { ...known, basis: 'template' }
      this.save()
      return
    }
    this.setRegion(id, { state: 'understanding' })
    const view = await this.step(`region_view:${id}`, { stage: 'workpaper', region: id }, async () => {
      const env = await this.tool('workpaper_region_view', { region: id }, id).catch(e => this.blockOn(e, 'workpaper_region_view'))
      return env.data
    })
    let feedback
    const rounds = 1 + (this.config.maxReidentify ?? 2)
    for (let attempt = 1; attempt <= rounds; attempt++) {
      const semantics = await this.step(`semantics:${id}:${attempt}`, { stage: 'workpaper', region: id }, () => this.node('region_semantics', 'model', { region: id }, async () => {
        const input = { understanding: this.understandingSummary(), region: { id, range: r.range, type: r.type, typeCertain: r.parsed?.typeCertain, ambiguities: r.parsed?.ambiguities, columns: r.parsed?.columns, rowLabels: r.parsed?.rowLabels, totals: r.parsed?.totals, view }, ...(feedback ? { lastFailure: feedback } : {}) }
        const samples = []
        for (let i = 0; i < Math.max(1, this.config.samples ?? 1); i++) samples.push(await this.ask('region_semantics', id, input, v => v.region === id ? [] : [`region 应为 ${id}`]).catch(e => this.blockOn(e, 'region_semantics')))
        return mergeSamples(samples)
      }))
      const result = await this.step(`semantics_check:${id}:${attempt}`, { stage: 'workpaper', region: id }, async () => {
        try {
          const env = await this.tool('workpaper_semantics_check', { workpaper: this.state.workpaper.workpaper, regions: [semantics] }, id)
          const errors = env.data?.errors ?? []
          return { passed: errors.length === 0, errors }
        } catch (error) {
          if (error instanceof ToolError && /^(HEADER_|REF_|ARG_)/.test(error.code)) return { passed: false, errors: [{ code: error.code, message: error.message, where: error.where }] }
          return this.blockOn(error, 'workpaper_semantics_check')
        }
      })
      this.check('semantics', result.passed, { region: id, attempt, ...(result.passed ? {} : { detail: { errors: result.errors } }) })
      if (result.passed) {
        r.semantics = semantics
        if (semantics.type !== r.type) r.type = semantics.type
        this.save()
        if (semantics.type === 'none') this.setRegion(id, { state: 'skipped' })
        return
      }
      feedback = result.errors.map(e => (e.where ? `${e.where}：` : '') + e.message).join('；')
      if (attempt < rounds) this.retry('region_semantics', id, attempt + 1, feedback)
    }
    this.failRegion(id, `区域语义没有通过校验：${feedback}`)
  }

  understandingSummary() {
    const u = this.state.steps.understand?.value ?? {}
    return { period: u.period, scope: u.scope, constraints: u.constraints }
  }

  // ---------- C 资料 ----------

  async importFile(file) {
    const s = this.state
    const inspected = await this.step(`data_inspect:${file}`, { stage: 'data' }, () => this.node('data_inspect', 'code', {}, async () => {
      const env = await this.tool('data_inspect', { file }).catch(e => this.blockOn(e, 'data_inspect'))
      return Array.isArray(env.data) ? env.data : env.data?.tables ?? []
    }))
    for (const candidate of inspected) {
      const key = candidate.candidate
      if (s.tables.some(t => t.candidate === key)) continue
      const fields = await this.step(`field_semantics:${key}`, { stage: 'data' }, () => this.node('field_semantics', 'model', {}, () =>
        this.ask('field_semantics', undefined, { table: { candidate: key, sheet: candidate.sheet, rows: candidate.rows, columns: candidate.columns, totalsRows: candidate.totalsRows } }, (v) => {
          const cols = new Set((candidate.columns ?? []).map(c => c.col))
          return v.fields.filter(f => cols.size && !cols.has(f.col)).map(f => `列 ${f.col} 不在资料表中`)
        }).catch(e => this.blockOn(e, 'field_semantics'))))
      let imported = await this.step(`data_import:${key}`, { stage: 'data' }, () => this.node('data_import', 'code', {}, async () => {
        try {
          const env = await this.tool('data_import', { candidate: key, kind: fields.kind, fields: fields.fields })
          return { value: env.data, refs: [env.data.table] }
        } catch (error) {
          if (error instanceof ToolError && /^DATA_/.test(error.code)) return { value: { error: error.envelope.error }, refs: [] }
          return this.blockOn(error, 'data_import')
        }
      }))
      if (imported.error) imported = await this.dataProblem(key, candidate, fields, imported.error)
      if (!imported) continue
      const quality = await this.step(`data_quality:${imported.table}`, { stage: 'data' }, async () => {
        const env = await this.tool('data_quality', { table: imported.table }).catch(e => this.blockOn(e, 'data_quality'))
        return env.data
      })
      this.check('data_quality', quality?.passed !== false, { ...(quality?.passed === false ? { detail: quality } : {}) })
      s.tables.push({ table: imported.table, candidate: key, file, sheet: candidate.sheet, kind: fields.kind, rows: imported.rows, fields: fields.fields, invalid: imported.invalid ?? [] })
      this.save()
    }
  }

  /** 数据问题（DATA_）：暂停这张表，出卡片让用户决定（2.4）。 */
  async dataProblem(key, candidate, fields, error) {
    const answer = await this.card(`card:data:${key}`, { stage: 'data' }, {
      kind: 'question', title: `资料“${candidate.sheet ?? key}”有无法解析的值`, blocking: true,
      body: { questions: [{ id: 'q1', text: error.message, options: [{ label: '排除这些值所在的行，继续导入' }, { label: '不用这张表' }], suggest: 0, allowText: false }], error },
      actions: ['confirm', 'reject'], defaultAction: 'confirm',
    })
    // 不改选项直接确认按建议项：排除无效行继续导入（排除的事记进锚点，结果卡里可见）
    if (answer.action === 'reject' || (answer.edits?.q1 ?? 0) === 1) return null
    return this.step(`data_import:${key}:exclude`, { stage: 'data' }, () => this.node('data_import', 'code', {}, async () => {
      const env = await this.tool('data_import', { candidate: key, kind: fields.kind, fields: fields.fields, excludeInvalid: true }).catch(e => this.blockOn(e, 'data_import'))
      this.state.anchors.push({ text: `资料“${candidate.sheet ?? key}”中无法解析的值所在行已排除`, basis: 'user', card: answer.card })
      return { value: env.data, refs: [env.data.table] }
    }))
  }

  // ---------- 底稿理解卡（5.2） ----------

  async confirmUnderstanding() {
    const s = this.state
    const regions = Object.values(s.regions).filter(r => r.semantics && r.state !== 'failed')
    if (!regions.length) return
    for (let round = 1; ; round++) {
      const key = `card:understanding:${round}`
      if (!s.steps[key]) for (const r of regions) this.setRegion(r.region, { state: 'awaiting_confirmation' })
      const errors = s.understandingErrors ?? []
      const answer = await this.card(key, { stage: 'data' }, {
        kind: 'workpaper_understanding', title: '请确认对底稿的理解', blocking: true,
        body: {
          workpaper: s.workpaper.workpaper,
          template: { fingerprint: s.workpaper.fingerprint, known: false },
          regions: regions.map(r => ({ region: r.region, range: r.range, ...r.semantics })),
          ...(errors.length ? { errors } : {}),
        },
        actions: ['confirm', 'edit', 'reject'], defaultAction: 'confirm',
      })
      if (answer.action === 'reject') throw new TaskStop('用户否定了对底稿的理解，任务停止')
      if (answer.action === 'confirm') this.applyUncertain(regions, {})
      if (answer.action === 'edit') {
        const changed = this.applyEdits(answer.edits ?? {})
        const check = await this.step(`understanding_check:${round}`, { stage: 'data' }, async () => {
          if (!changed.length) return { errors: [] }
          try {
            const env = await this.tool('workpaper_semantics_check', { workpaper: s.workpaper.workpaper, regions: changed.map(id => s.regions[id].semantics) })
            return { errors: env.data?.errors ?? [] }
          } catch (error) {
            if (error instanceof ToolError && /^(HEADER_|REF_|ARG_)/.test(error.code)) return { errors: [{ code: error.code, message: error.message, where: error.where }] }
            return this.blockOn(error, 'workpaper_semantics_check')
          }
        })
        if (check.errors.length) {
          s.understandingErrors = check.errors
          this.save()
          continue
        }
      }
      s.understandingErrors = []
      // 要计算的区域接着进入 computing，不再插一个 pending；不填写和文字区单独落状态
      for (const r of Object.values(s.regions)) {
        if (r.state !== 'awaiting_confirmation') continue
        if (r.type === 'none') this.setRegion(r.region, { state: 'skipped' })
        else if (r.type === 'text') this.setRegion(r.region, { state: 'pending' })
        else r.state = 'pending'
      }
      this.save()
      return
    }
  }

  /** 不确定项的回答进入区域的已确认口径；确认时取建议项。 */
  applyUncertain(regions, picks) {
    for (const r of regions) {
      for (const u of r.semantics.uncertain ?? []) {
        const key = `${r.region}/${u.item}`
        if (r.confirmed.some(c => c.item === u.item)) continue
        const pick = picks[key] ?? u.suggest
        r.confirmed.push({ item: u.item, value: typeof pick === 'number' ? u.options[pick] : String(pick), basis: key in picks ? 'user' : 'confirmed' })
      }
    }
    this.save()
  }

  /** 5.2 的 edits：改区域类型、范围、列语义，新增区域，标记人工填写。返回需要重新校验的区域。 */
  applyEdits(edits) {
    const s = this.state
    const changed = new Set()
    for (const item of edits.regions ?? []) {
      if (item.add) {
        const id = `${s.workpaper.workpaper}#U${Object.keys(s.regions).length + 1}`
        s.regions[id] = { region: id, range: item.add.range, type: item.add.type, state: 'pending', attempt: 0, attemptBase: 0, refs: [], card: null, confirmed: [], semantics: { region: id, type: item.add.type, purpose: item.add.purpose, columns: [], manual: [], uncertain: [], basis: 'user' } }
        changed.add(id)
        continue
      }
      const r = s.regions[item.region]
      if (!r?.semantics) continue
      if (item.type) { r.type = item.type; r.semantics.type = item.type }
      if (item.range) { r.range = item.range; r.semantics.range = item.range }
      for (const col of item.columns ?? []) {
        const at = r.semantics.columns.findIndex(c => c.col === col.col)
        const merged = { ...(at >= 0 ? r.semantics.columns[at] : {}), ...col, basis: 'user', confidence: 'high' }
        if (at >= 0) r.semantics.columns[at] = merged
        else r.semantics.columns.push(merged)
      }
      changed.add(item.region)
    }
    const manual = edits.manual ?? {}
    for (const r of Object.values(s.regions)) {
      if (!r.semantics) continue
      const before = r.semantics.manual ?? []
      const add = (manual.add ?? []).filter(cell => inRange(cell, r.range))
      const next = [...new Set([...before.filter(c => !(manual.remove ?? []).includes(c)), ...add])]
      if (next.length !== before.length || next.some((c, i) => c !== before[i])) { r.semantics.manual = next; changed.add(r.region) }
    }
    const picks = {}
    for (const [key, value] of Object.entries(edits.uncertain ?? {})) picks[key] = value
    this.applyUncertain(Object.values(s.regions).filter(r => r.semantics), picks)
    for (const id of changed) if (s.regions[id].type === 'none') s.regions[id].state = 'skipped'
    this.save()
    return [...changed].filter(id => s.regions[id].type !== 'none')
  }

  // ---------- D/E/F 定口径、确认、计算与核对 ----------

  tablesForModel() {
    return this.state.tables.map(t => ({
      table: t.table, sqlName: t.table.replace('-', ''), kind: t.kind, sheet: t.sheet, rows: t.rows,
      fields: t.fields.map(f => ({ name: f.name, meaning: f.meaning, type: f.type })),
      ...(t.invalid?.length ? { invalid: t.invalid.map(i => ({ col: i.col, count: i.count })) } : {}),
    }))
  }

  regionInput(r) {
    return { region: { id: r.region, range: r.range, type: r.type, ...r.semantics }, confirmed: r.confirmed, tables: this.tablesForModel() }
  }

  /** 按顺序执行受控查询；@stepN 指代第 N 步的结果表。返回最后一步的结果。 */
  async runSteps(steps, region) {
    const results = []
    for (const step of steps) {
      const sub = text => String(text).replace(/@step(\d+)/g, (_, n) => results[n - 1]?.result.replace('-', '') ?? `@step${n}`)
      const inputs = step.inputs.map(i => /^@step\d+$/.test(i) ? results[Number(i.slice(5)) - 1]?.result ?? i : i)
      try {
        const env = await this.tool('query_run', { sql: sub(step.sql), inputs, purpose: step.purpose, maxRows: this.config.maxRows ?? 5000 }, region)
        results.push(env.data)
      } catch (error) {
        if (error instanceof ToolError && /^(ARG_|REF_)/.test(error.code)) throw new QueryError(error.envelope.error)
        return this.blockOn(error, 'query_run')
      }
    }
    return results.at(-1)
  }

  /** 定口径，查询有参数或引用错误时回填修正，最多 2 次（7.2）。 */
  async planBasis(id, attempt, lastFailure) {
    const r = this.region(id)
    let queryError
    for (let fix = 0; ; fix++) {
      const key = `basis:${id}:${attempt}${fix ? ':fix' + fix : ''}`
      const basis = await this.step(key, { stage: 'basis', region: id }, () => this.node('basis', 'model', { region: id }, () =>
        this.ask('basis', id, { ...this.regionInput(r), ...(lastFailure ? { lastFailure } : {}), ...(queryError ? { queryError } : {}) }, v => v.region === id ? [] : [`region 应为 ${id}`])
          .catch(e => this.blockOn(e, 'basis'))))
      const invalid = await this.step(`query_validate:${id}:${attempt}:${fix}`, { stage: 'basis', region: id }, async () => {
        for (const step of basis.steps) {
          if (/@step\d+/.test(step.sql)) continue
          try {
            await this.tool('query_validate', { sql: step.sql, inputs: step.inputs, purpose: step.purpose, maxRows: this.config.maxRows ?? 5000 }, id)
          } catch (error) {
            if (error instanceof ToolError && /^(ARG_|REF_)/.test(error.code)) return error.envelope.error
            return this.blockOn(error, 'query_validate')
          }
        }
        return null
      })
      if (!invalid) return { basis, fix }
      if (fix >= 2) return { basis, fix, invalid }
      queryError = `${invalid.code}：${invalid.message}${invalid.hint ? '（' + invalid.hint + '）' : ''}`
    }
  }

  async regionCompute(id) {
    const r = this.region(id)
    const max = this.config.maxAttempts ?? 3
    let failure = null
    let last = null
    this.setRegion(id, { state: 'computing', card: null })
    for (let n = 1; n <= max; n++) {
      const attempt = r.attemptBase + n
      if (n > 1) this.setRegion(id, { state: 'computing', attempt })
      else r.attempt = attempt
      const planned = await this.planBasis(id, attempt, failure)
      let basis = planned.basis
      if (planned.invalid) {
        failure = `查询无法通过校验：${planned.invalid.message}`
        last = { kind: 'query', failure }
        if (n < max) this.retry('basis', id, attempt + 1, failure)
        continue
      }
      const complete = await this.step(`check_basis:${id}:${attempt}`, { stage: 'basis', region: id }, async () => {
        try {
          const env = await this.tool('check_basis', { region: id, basis }, id)
          return { passed: env.data?.passed !== false, missing: env.data?.missing ?? [] }
        } catch (error) {
          if (error instanceof ToolError && /^(CHECK_|ARG_)/.test(error.code)) return { passed: false, missing: [error.message] }
          return this.blockOn(error, 'check_basis')
        }
      })
      this.check('basis_complete', complete.passed, { region: id, attempt, ...(complete.passed ? {} : { detail: { missing: complete.missing } }) })
      if (!complete.passed) {
        failure = `口径要素不完整：${complete.missing.join('、')}`
        last = { kind: 'basis', failure }
        if (n < max) this.retry('basis', id, attempt + 1, failure)
        continue
      }

      // E 推断且影响结果的口径：出口径确认卡，等待期间其他区域照常进行（非阻塞）
      basis = await this.confirmInferred(id, attempt, basis)

      // F 计算与核对
      r.lastBasis = basis
      this.save()
      this.setStage('compute')
      let result
      try {
        result = await this.step(`query:${id}:${attempt}`, { stage: 'compute', region: id }, () => this.node('query', 'code', { region: id }, async () => {
          const data = await this.runSteps(basis.steps, id)
          return { value: data, refs: [data.result] }
        }))
      } catch (error) {
        if (!(error instanceof QueryError)) throw error
        failure = `查询执行出错：${error.message}`
        last = { kind: 'query', failure }
        if (n < max) this.retry('basis', id, attempt + 1, failure)
        continue
      }
      const conservation = await this.step(`conservation:${id}:${attempt}`, { stage: 'compute', region: id }, async () => {
        const env = await this.tool('check_conservation', { from: basis.sources[0].table, result: result.result, amount: basis.control.column, excluded: null }, id).catch(e => this.checkFailure(e, 'check_conservation'))
        return env.data ?? env
      })
      this.check('conservation', conservation.passed !== false, { region: id, attempt, ...(conservation.passed === false ? { detail: conservation } : {}) })
      if (conservation.passed === false) {
        failure = `守恒核对不通过：${conservation.message ?? JSON.stringify(conservation.items ?? conservation).slice(0, 300)}`
        last = { kind: 'conservation', failure, detail: conservation }
        if (n < max) this.retry('basis', id, attempt + 1, failure)
        continue
      }
      this.setRegion(id, { state: 'checking', attempt, refs: [result.result] })
      const control = await this.step(`control:${id}:${attempt}`, { stage: 'compute', region: id }, async () => {
        const env = await this.tool('check_control', { region: id, left: { result: result.result, column: basis.control.column, op: 'sum' }, right: basis.control.right, tolerance: '0' }, id).catch(e => this.checkFailure(e, 'check_control'))
        return env.data ?? env
      })
      const controlDetail = {
        left: { label: basis.control.label, value: control.left, ref: result.result },
        right: { label: basis.control.rightLabel ?? describeRight(basis.control.right), value: control.right, ref: basis.control.right?.table ?? null },
        diff: control.diff ?? null, explainedBy: control.explainedBy ?? [],
      }
      const controlPassed = control.passed === true || (control.explainedBy?.length > 0 && control.passed !== false)
      this.check('control', controlPassed, { region: id, attempt, detail: controlDetail })
      if (!controlPassed) {
        failure = `控制数差额 ${control.diff}：${basis.control.label} ${formatAmount(control.left)}，${controlDetail.right.label} ${formatAmount(control.right)}`
        last = { kind: 'control', failure, detail: controlDetail, result: result.result }
        if (n < max) this.retry('basis', id, attempt + 1, failure)
        continue
      }

      // 关键数双路复算（7.6）
      if (this.config.recompute !== false) {
        const outcome = await this.recompute(id, attempt, basis, result)
        if (outcome.retry) {
          failure = outcome.reason
          last = { kind: 'compare', failure, detail: outcome.detail, result: result.result }
          if (n < max) this.retry('basis', id, attempt + 1, failure)
          continue
        }
        result = outcome.result
      }
      this.complete(id, basis, result)
      return
    }
    // 重做用尽
    if (last && ['control', 'compare'].includes(last.kind)) return this.discrepancy(id, last)
    this.failRegion(id, last?.failure ?? '计算没有通过核对')
  }

  checkFailure(error, where) {
    if (error instanceof ToolError && /^CHECK_/.test(error.code)) return { passed: false, message: error.message, ...(error.envelope.error.detail ?? {}) }
    return this.blockOn(error, where)
  }

  complete(id, basis, result) {
    const r = this.region(id)
    r.basis = basis
    r.result = result.result
    r.resultData = { result: result.result, rows: result.rows, columns: result.columns, sums: result.sums, head: result.head }
    this.save()
    this.setRegion(id, { state: 'checked', attempt: r.attempt, refs: [result.result] })
  }

  /** 推断的口径要素 → 口径确认卡（5.3）；impact 由代码执行各选项的查询得出。 */
  async confirmInferred(id, attempt, basis) {
    const r = this.region(id)
    const open = (basis.inferred ?? []).filter(q => !r.confirmed.some(c => c.item === (q.item ?? q.text)))
    if (!open.length) return basis
    const impacts = await this.step(`impact:${id}:${attempt}`, { stage: 'basis', region: id }, async () => {
      const out = {}
      for (const q of open) {
        out[q.id] = []
        for (const [index, option] of q.options.entries()) {
          const steps = option.steps ?? (index === q.suggest ? basis.steps : undefined)
          if (!steps) { out[q.id].push(null); continue }
          try { out[q.id].push(impactText(await this.runSteps(steps, id))) } catch (error) {
            if (error instanceof QueryError) out[q.id].push(null)
            else throw error
          }
        }
      }
      return out
    })
    const key = `card:basis:${id}:${attempt}`
    const pending = !this.state.steps[key]
    const opened = await this.card(key, { stage: 'basis', region: id }, {
      kind: 'basis_confirmation', title: `${r.semantics?.purpose ?? id}的口径需要确认`, blocking: false,
      body: { questions: open.map(q => ({ id: q.id, region: id, text: q.text, options: q.options.map((o, i) => ({ label: o.label, impact: impacts[q.id]?.[i] ?? null })), suggest: q.suggest, allowText: true })) },
      actions: ['confirm'], defaultAction: 'confirm',
    }, { wait: false })
    if (pending && opened.card) this.setRegion(id, { state: 'awaiting_confirmation', card: opened.card })
    const answer = opened.answered ? await opened.answered : opened
    this.setRegion(id, { state: 'computing', card: null })
    let next = basis
    let replan = false
    for (const q of open) {
      const picked = answer.edits?.[q.id] ?? q.suggest
      const option = typeof picked === 'number' ? q.options[picked] : undefined
      r.confirmed.push({ item: q.item ?? q.text, value: option ? option.label : String(picked), basis: 'user' })
      if (option && picked !== q.suggest) {
        if (option.steps) next = { ...next, steps: option.steps }
        else replan = true
      }
      if (!option) replan = true
    }
    if (answer.note) this.state.anchors.push({ text: answer.note, basis: 'user', card: answer.card })
    this.save()
    if (!replan) return { ...next, inferred: [] }
    // 用户选了没有现成查询的选项或写了文字：带着已确认的口径重新定口径
    const again = await this.step(`basis:${id}:${attempt}:confirmed`, { stage: 'basis', region: id }, () => this.node('basis', 'model', { region: id }, () =>
      this.ask('basis', id, this.regionInput(r), v => v.region === id ? [] : [`region 应为 ${id}`]).catch(e => this.blockOn(e, 'basis'))))
    return { ...again, inferred: [] }
  }

  async recompute(id, attempt, basis, result) {
    const r = this.region(id)
    let second
    try {
      second = await this.step(`recompute:${id}:${attempt}`, { stage: 'compute', region: id }, () => this.node('recompute', 'model', { region: id }, async () => {
        const plan = await this.ask('recompute', id, { ...this.regionInput(r), resultColumns: (result.columns ?? []).map(c => c.name) }).catch(e => this.blockOn(e, 'recompute'))
        const data = await this.runSteps(plan.steps, id)
        return { value: { plan, data }, refs: [data.result] }
      }))
    } catch (error) {
      if (!(error instanceof QueryError)) throw error
      return { retry: true, reason: `第二路复算的查询出错：${error.message}` }
    }
    const compare = await this.step(`compare:${id}:${attempt}`, { stage: 'compute', region: id }, async () => {
      const env = await this.tool('check_compare', { left: result.result, right: second.data.result, mapping: { columns: (result.columns ?? []).map(c => c.name) } }, id).catch(e => this.checkFailure(e, 'check_compare'))
      return env.data ?? env
    })
    this.check('compare', compare.passed !== false, { region: id, attempt, ...(compare.passed === false ? { detail: compare } : {}) })
    if (compare.passed !== false) return { result }
    const verdict = await this.step(`judge:${id}:${attempt}`, { stage: 'compute', region: id }, () => this.node('judge', 'model', { region: id }, () =>
      this.ask('judge', id, { region: { id, ...r.semantics }, first: { summary: basis.summary, steps: basis.steps, sums: result.sums }, second: { steps: second.plan.steps, sums: second.data.sums }, differences: compare.differences ?? compare }).catch(e => this.blockOn(e, 'judge'))))
    if (verdict.verdict === 'first') return { result }
    if (verdict.verdict === 'second') return { retry: true, reason: `双路复算不一致，第二路的口径更符合区域语义：${verdict.reason}`, detail: compare }
    // 判断不了：作为口径问题问用户，附两种算法和结果
    const answer = await this.card(`card:compare:${id}:${attempt}`, { stage: 'compute', region: id }, {
      kind: 'basis_confirmation', title: `${r.semantics?.purpose ?? id}两种算法结果不同`, blocking: false,
      body: { questions: [{ id: 'q1', region: id, text: `两种算法结果不同，采用哪一种？${verdict.reason}`, options: [{ label: basis.summary ?? '第一种算法', impact: impactText(result) }, { label: second.plan.note ?? '第二种算法', impact: impactText(second.data) }], suggest: 0, allowText: true }] },
      actions: ['confirm'], defaultAction: 'confirm',
    })
    const picked = answer.edits?.q1 ?? 0
    r.confirmed.push({ item: '算法选择', value: picked === 1 ? (second.plan.note ?? '第二种算法') : (basis.summary ?? '第一种算法'), basis: 'user' })
    this.save()
    if (picked === 1) return { result: second.data }
    if (typeof picked === 'string') return { retry: true, reason: `用户说明：${picked}` }
    return { result }
  }

  /** 重做后仍有差异（5.4）：小于临界值的记录后通过，否则出差异卡由用户决定。 */
  async discrepancy(id, last) {
    const r = this.region(id)
    const threshold = this.config.trivialThreshold ?? '0'
    const diff = last.detail?.diff
    if (diff !== undefined && diff !== null && Math.abs(toNumber(diff)) <= Math.abs(toNumber(threshold)) && toNumber(threshold) > 0) {
      r.note = `差额 ${diff} 未超过明显微小错报临界值 ${threshold}`
      return this.complete(id, this.latestBasis(id), this.latestResult(id) ?? { result: last.result })
    }
    const key = `card:discrepancy:${id}:${r.attempt}`
    const pending = !this.state.steps[key]
    const opened = await this.card(key, { stage: 'compute', region: id }, {
      kind: 'discrepancy', title: `${r.semantics?.purpose ?? id}核对仍有差异`, blocking: false,
      body: {
        region: id, check: last.kind === 'compare' ? 'compare' : 'control',
        left: last.detail?.left ?? null, right: last.detail?.right ?? null, diff: diff ?? null, threshold,
        candidates: this.discrepancyCandidates(id), reason: last.failure,
      },
      actions: ['accept_with_note', 'fix_data', 'stop'], defaultAction: 'fix_data',
    }, { wait: false })
    if (pending && opened.answered) this.setRegion(id, { state: 'awaiting_confirmation', card: opened.card })
    const reply = opened.answered ? await opened.answered : opened
    if (reply.action === 'stop') throw new TaskStop('用户在差异卡上停止了任务')
    if (reply.action === 'accept_with_note') {
      r.note = reply.note || '用户接受差异'
      this.state.anchors.push({ text: `${r.semantics?.purpose ?? id}：${r.note}`, basis: 'user', card: reply.card })
      return this.complete(id, this.latestBasis(id), this.latestResult(id) ?? { result: last.result })
    }
    this.failRegion(id, '等待修正资料后重跑')
  }

  discrepancyCandidates(id) {
    return this.state.tables.flatMap(t => (t.invalid ?? []).flatMap(i => (i.samples ?? []).slice(0, 3).map(sample => ({ label: `第 ${sample.row} 行 ${i.col} 列无法解析（“${sample.value}”）`, ref: `${t.table}#${sample.row}` })))).slice(0, 5)
  }

  latestBasis(id) {
    return this.region(id).lastBasis
  }

  latestResult(id) {
    const r = this.region(id)
    return this.state.steps[`query:${id}:${r.attempt}`]?.value
  }

  // ---------- G 填写（第八节） ----------

  async fill() {
    const s = this.state
    const regions = Object.values(s.regions).filter(r => r.state === 'checked' && r.basis)
    const deliverable = s.deliverables.find(d => d.kind === 'workpaper')
    if (!regions.length) {
      if (deliverable && deliverable.status === 'in_progress') deliverable.status = 'failed'
      this.save()
      return
    }
    this.setStage('fill')
    const manual = [...new Set(Object.values(s.regions).flatMap(r => [...(r.semantics?.manual ?? []), ...(r.basis?.manual ?? [])]))]
    const bindings = regions.map(r => ({
      region: r.region,
      cells: (r.basis.bindings ?? []).map(b => ({ cell: b.cell, from: { result: r.result, row: b.row, column: b.column }, scale: r.basis.unit?.scale ?? '1' })),
      manual: [...new Set([...(r.semantics?.manual ?? []), ...(r.basis?.manual ?? [])])],
    }))
    let plan = await this.step('fill_compile', { stage: 'fill' }, () => this.node('fill_compile', 'code', {}, async () => {
      const env = await this.tool('fill_compile', { task: s.task, workpaper: s.workpaper.workpaper, bindings, overwrite: [] }).catch(e => this.blockOn(e, 'fill_compile'))
      return { value: env.data, refs: [env.data.plan] }
    }))
    const target = s.files.find(f => f.file === s.workpaper.file)?.name ?? s.workpaper.file
    const answer = await this.card('card:write', { stage: 'fill' }, {
      kind: 'write_confirmation', title: '确认写入底稿', blocking: true,
      body: {
        plan: plan.plan, target, output: plan.output ?? null,
        regions: regions.map(r => ({ region: r.region, cells: (r.basis.bindings ?? []).length, sources: [r.result], basis: r.basis.summary ?? '' })),
        manual, overwrites: plan.overwrites ?? [], ...(plan.expand?.length ? { expand: plan.expand } : {}),
      },
      actions: ['confirm', 'reject'], defaultAction: 'confirm',
    })
    if (answer.action !== 'confirm') {
      if (deliverable) deliverable.status = 'rejected'
      this.save()
      return
    }
    if (plan.overwrites?.length) {
      plan = await this.step('fill_compile:overwrite', { stage: 'fill' }, () => this.node('fill_compile', 'code', {}, async () => {
        const env = await this.tool('fill_compile', { task: s.task, workpaper: s.workpaper.workpaper, bindings, overwrite: plan.overwrites.map(o => o.cell ?? o) }).catch(e => this.blockOn(e, 'fill_compile'))
        return { value: env.data, refs: [env.data.plan] }
      }))
    }
    const applied = await this.step('fill_apply', { stage: 'fill' }, () => this.node('fill_apply', 'code', {}, async () => {
      try {
        const env = await this.tool('fill_apply', { task: s.task, plan: plan.plan, approvedCard: answer.card, excelRecalc: true })
        return { value: env.data, refs: [] }
      } catch (error) {
        if (error instanceof ToolError && /^CHECK_/.test(error.code)) return { value: { failed: error.envelope.error }, refs: [] }
        return this.blockOn(error, 'fill_apply')
      }
    }))
    if (applied.failed) {
      if (deliverable) deliverable.status = 'failed'
      this.save()
      throw new TaskBlocked({ where: 'fill_apply', why: applied.failed.message, suggest: applied.failed.hint ?? '查看填写核对表后重跑相关区域' })
    }
    const checks = Object.entries(applied.checks ?? {})
    if (!s.steps['fill:checks']) {
      for (const [check, value] of checks) this.check(check, value === 'passed' || value === 'skipped', { ...(value !== 'passed' ? { detail: { result: value } } : {}) })
      s.steps['fill:checks'] = { stage: 'fill', value: true }
    }
    const failed = checks.filter(([, v]) => v !== 'passed' && v !== 'skipped')
    if (failed.length) {
      if (deliverable) deliverable.status = 'failed'
      this.save()
      throw new TaskBlocked({ where: 'fill_apply', why: `写入后核对不通过：${failed.map(([k]) => k).join('、')}`, suggest: '查看填写核对表后重跑相关区域' })
    }
    for (const r of regions) this.setRegion(r.region, { state: 'written' })
    s.manualCells = applied.manualCells ?? manual
    const summary = { passed: checks.length, failed: 0 }
    for (const [file, kind] of [[applied.output, 'workpaper'], [applied.report, 'report']]) {
      if (!file) continue
      await this.step(`output:${file}`, { stage: 'fill' }, async () => {
        const output = this.store.allocate('O')
        s.outputs.push({ output, file, kind })
        this.emit('output.ready', { output, file, kind, checks: summary })
        return output
      })
    }
    if (deliverable) { deliverable.status = 'completed'; deliverable.output = applied.output }
    this.save()
  }

  // ---------- H 说明（8.4） ----------

  async notes() {
    const s = this.state
    const done = Object.values(s.regions).filter(r => ['checked', 'written'].includes(r.state) && r.resultData)
    if (!done.length) return
    this.setStage('notes')
    const textRegions = Object.values(s.regions).filter(r => r.type === 'text' && r.semantics)
    const sections = textRegions.length ? textRegions.map(r => ({ section: r.semantics.purpose ?? '审计说明', region: r.region })) : [{ section: '审计说明' }]
    const figures = done.map(r => ({ region: r.region, purpose: r.semantics?.purpose, sums: r.resultData.sums, head: r.resultData.head, columns: (r.resultData.columns ?? []).map(c => c.name) }))
    const allowed = new Set()
    const addNumber = value => { const n = toNumber(String(value).replace('%', '')); if (Number.isFinite(n)) allowed.add(n.toFixed(2)) }
    for (const f of figures) {
      for (const v of Object.values(f.sums ?? {})) addNumber(v)
      for (const row of f.head ?? []) for (const v of row) addNumber(v)
    }
    for (const a of s.anchors) for (const n of numbersIn(a.text)) addNumber(n)
    for (const n of numbersIn(JSON.stringify(this.understandingSummary()))) addNumber(n)
    s.notes = []
    for (const section of sections) {
      const key = `notes:${section.region ?? section.section}`
      const text = await this.step(key, { stage: 'notes', region: section.region }, () => this.node('notes', 'model', section.region ? { region: section.region } : {}, async () => {
        let feedback
        for (let attempt = 1; attempt <= 3; attempt++) {
          const draft = await this.ask('notes', section.region, { section: section.section, figures, ...(feedback ? { lastFailure: feedback } : {}) }).catch(e => this.blockOn(e, 'notes'))
          const missing = numbersIn(draft).filter(n => {
            const value = toNumber(n.replace('%', ''))
            if (n.endsWith('%')) return ![...allowed].some(a => Math.abs(Number(a) * 100 - value) < 0.01 || Math.abs(Number(a) - value) < 0.01)
            return !allowed.has(value.toFixed(2))
          })
          this.check('traceable', missing.length === 0, { attempt, ...(section.region ? { region: section.region } : {}), ...(missing.length ? { detail: { missing } } : {}) })
          if (!missing.length) return draft.trim()
          feedback = `这些数字在结果中找不到：${missing.join('、')}。只使用 figures 中的数字。`
        }
        return null
      }))
      if (text) s.notes.push({ section: section.section, ...(section.region ? { region: section.region } : {}), text, status: 'suggested' })
    }
    this.save()
  }

  // ---------- 结果卡与结束（5.7） ----------

  async review() {
    const s = this.state
    const latest = new Map()
    const history = new Map()
    for (const c of s.checks) {
      const key = `${c.check}|${c.region ?? ''}`
      if (!latest.has(key) || latest.get(key).attempt <= c.attempt) latest.set(key, c)
      history.set(key, [...(history.get(key) ?? []), c])
    }
    const final = [...latest.values()]
    const checks = {
      passed: final.filter(c => c.passed).length,
      failed: final.filter(c => !c.passed).length,
      retried: [...latest.entries()].filter(([key, c]) => c.passed && history.get(key).some(h => !h.passed)).length,
    }
    const regions = Object.values(s.regions)
    const failedRegions = regions.filter(r => r.state === 'failed')
    const deliverable = s.deliverables.find(d => d.kind === 'workpaper')
    // 核对没通过但已由用户决定的（选了算法、接受差异）照实计入 checks.failed，不影响任务是否完成
    const status = failedRegions.length || (deliverable && deliverable.status !== 'completed') ? 'partial' : 'completed'
    // 结果卡不阻塞：任务结束后它仍然打开；重跑时撤回旧的结果卡
    this.resultCard = new AbortController()
    const signal = AbortSignal.any([this.resultCard.signal, ...(this.signal ? [this.signal] : [])])
    await this.card('card:result', { stage: 'review', signal }, {
      kind: 'result_summary', title: status === 'completed' ? (deliverable ? '底稿已填写' : '任务已完成') : '任务部分完成',
      blocking: false,
      body: {
        outputs: s.outputs.map(o => ({ output: o.output, file: o.file, kind: o.kind })),
        checks, manual: countCells(s.manualCells ?? []),
        notes: s.notes ?? [], computedBy: 'code', suggestedBy: s.notes?.length ? ['notes'] : [],
        ...(failedRegions.length ? { failed: failedRegions.map(r => ({ region: r.region, reason: r.failure })) } : {}),
      },
      actions: ['confirm'], defaultAction: 'confirm',
    }, { wait: false })
    for (const d of s.deliverables) if (d.status === 'in_progress') d.status = status === 'completed' ? 'completed' : 'failed'
    this.finish(status)
  }

  // ---------- 任务中补充与重跑（4.6、4.7） ----------

  /** 任务进行中用户补充的话。返回受影响的区域。 */
  async message(text) {
    const s = this.state
    s.anchors.push({ text, basis: 'user', at: new Date().toISOString() })
    this.save()
    const candidates = Object.values(s.regions).filter(r => r.semantics && r.type !== 'none').map(r => ({ region: r.region, purpose: r.semantics.purpose, state: r.state }))
    let scope = { regions: [], reason: '' }
    if (candidates.length) {
      const spec = NODES.message_scope
      scope = await this.model.call({
        task: s.task, node: 'message_scope', role: spec.role, prompt: spec.prompt, version: spec.version, schema: spec.schema,
        input: { anchors: s.anchors, text, regions: candidates },
        check: v => v.regions.filter(id => !s.regions[id]).map(id => `区域 ${id} 不存在`),
      })
    }
    this.emit('user.message', { text, regions: scope.regions, reason: scope.reason })
    const computed = scope.regions.filter(id => ['checked', 'written', 'failed'].includes(s.regions[id].state))
    if (computed.length) {
      const purposes = computed.map(id => s.regions[id].semantics?.purpose ?? id).join('、')
      const key = `card:message:${s.anchors.length}`
      const controller = this.controller ?? new AbortController()
      const id = this.store.allocate('C')
      const card = { card: id, task: s.task, kind: 'basis_confirmation', title: '按补充的说明重做？', blocking: false,
        body: { questions: [{ id: 'q1', text: `“${text}”影响已经算好的${purposes}，要按这句话重做吗？`, options: [{ label: '重做这些区域', impact: null }, { label: '不重做', impact: null }], suggest: 0, allowText: false }] },
        actions: ['confirm'], defaultAction: 'confirm' }
      s.openCards.push(id)
      this.save()
      this.cards.open({ sessionId: s.sessionId }, card, controller.signal).then((answer) => {
        s.openCards = s.openCards.filter(c => c !== id)
        s.steps[key] = { stage: 'review', value: answer }
        this.save()
        if ((answer.edits?.q1 ?? 0) === 0) this.rerun({ regions: computed, fromStage: 'basis' }, text, { anchored: true })
      }, () => {
        s.openCards = s.openCards.filter(c => c !== id)
        this.save()
      })
    }
    return { regions: scope.regions, rerunCard: computed.length > 0 }
  }

  /** 重跑：正在运行时排队，当前一轮跑完后执行；否则立即开始。 */
  rerun(scope, note, { anchored = false } = {}) {
    const request = { scope: { regions: scope?.regions ?? [], fromStage: scope?.fromStage ?? 'basis' }, note: note ?? '', anchored }
    if (!STAGES.includes(request.scope.fromStage)) throw Object.assign(new Error('unknown stage: ' + request.scope.fromStage), { code: -32602 })
    for (const id of request.scope.regions) if (!this.state.regions[id]) throw Object.assign(new Error('unknown region: ' + id), { code: -32602 })
    if (this.running) {
      this.state.pendingRerun = request
      this.save()
      return { queued: true }
    }
    this.applyRerun(request)
    this.start()
    return { queued: false }
  }

  applyRerun({ scope, note, anchored }) {
    const s = this.state
    this.resultCard?.abort(new Error('rerun'))
    this.resultCard = undefined
    const from = stageIndex(scope.fromStage)
    const regions = scope.regions.length ? scope.regions : Object.keys(s.regions)
    const invalidated = new Set()
    for (const id of regions) {
      const r = s.regions[id]
      for (const ref of [...(r.refs ?? []), r.result].filter(Boolean)) invalidated.add(ref)
    }
    for (const [key, step] of Object.entries(s.steps)) {
      const at = stageIndex(step.stage)
      if (at < from) continue
      if (step.region === undefined ? (at >= stageIndex('fill') || !scope.regions.length || at <= stageIndex('data')) : regions.includes(step.region)) delete s.steps[key]
    }
    for (const id of regions) {
      const r = s.regions[id]
      if (from <= stageIndex('workpaper')) { delete r.semantics; r.confirmed = [] }
      delete r.basis; delete r.lastBasis; delete r.result; delete r.resultData; delete r.failure; delete r.note
      r.attemptBase = r.attempt
      r.state = r.type === 'none' ? 'skipped' : 'pending'
      r.refs = []
      r.card = null
    }
    if (from <= stageIndex('data')) s.tables = []
    if (from <= stageIndex('understand')) s.deliverables = []
    for (const d of s.deliverables) { d.status = 'in_progress'; delete d.output }
    if (note && !anchored) s.anchors.push({ text: note, basis: 'user', at: new Date().toISOString() })
    s.stageIndex = from - 1
    s.status = 'running'
    delete s.finishedAt
    this.save()
    this.emit('task.rerun', { scope: { regions: scope.regions, fromStage: scope.fromStage }, note, invalidated: [...invalidated] })
    for (const id of regions) this.emit('region.state', { region: id, state: s.regions[id].state })
  }

  // ---------- 快照（4.4） ----------

  snapshot() {
    const s = this.state
    return {
      task: s.task, session: s.sessionId, status: s.status, stage: s.stage ?? null,
      deliverables: s.deliverables.map(d => ({ kind: d.kind, file: d.file ?? null, status: d.status, ...(d.output ? { output: d.output } : {}) })),
      regions: Object.values(s.regions).map(r => ({
        region: r.region, range: r.range, type: r.type, purpose: r.semantics?.purpose ?? null,
        // 宿主画 sheet.view 的区域覆盖层要用（《接口约定》overlay.regions）：表头行、合计行行号、人工填写的格
        headerRows: r.parsed?.headerRows ?? [], totals: (r.parsed?.totals ?? []).map(t => t.row),
        manual: [...new Set([...(r.semantics?.manual ?? []), ...(r.basis?.manual ?? [])])],
        state: r.state, attempt: r.attempt, refs: r.refs ?? [], card: r.card ?? null, ...(r.failure ? { reason: r.failure } : {}),
      })),
      openCards: [...s.openCards],
      outputs: s.outputs.map(o => o.output),
      ...(s.blocked ? { blocked: s.blocked } : {}),
    }
  }

  static isFinal(status) { return FINAL.has(status) }
  static regionDone(state) { return DONE_REGION.has(state) }
}

/** 关键语义多次采样（5.3）：期间、指标、单位、方向不一致的列，列为待确认。 */
export function mergeSamples(samples) {
  const [first, ...rest] = samples
  if (!rest.length) return first
  const merged = structuredClone(first)
  for (const column of merged.columns) {
    const variants = samples.map(s => s.columns.find(c => c.col === column.col)).map(c => c ? `${c.measure}｜${c.period ?? ''}｜${c.unit ?? ''}｜${c.direction ?? ''}` : '（未识别）')
    const distinct = [...new Set(variants)]
    if (distinct.length > 1) {
      const counts = distinct.map(v => variants.filter(x => x === v).length)
      merged.uncertain.push({ item: `${column.col} 列`, options: distinct, suggest: counts.indexOf(Math.max(...counts)), why: `${samples.length} 次独立识别结果不一致` })
      column.confidence = 'low'
    }
  }
  return merged
}

function impactText(data) {
  if (!data) return null
  const head = data.head ?? []
  if (head.length && head[0].length >= 2) {
    const text = head.slice(0, 3).map(row => `${row[0]} ${formatAmount(row[row.length - 1])}`).join('；')
    return head.length > 3 ? `${text}；…` : text
  }
  const sums = Object.entries(data.sums ?? {})
  return sums.length ? sums.map(([k, v]) => `${k}合计 ${formatAmount(v)}`).join('；') : null
}

function describeRight(right) {
  if (!right) return '控制数'
  if (right.kind === 'balance') return `余额表 ${right.account ?? ''} ${right.field === 'opening' ? '期初' : '期末'}`.replace(/\s+/g, ' ').trim()
  return right.label ?? right.kind ?? '控制数'
}

function countCells(refs) {
  let total = 0
  for (const ref of refs) {
    const range = String(ref).split('!').pop()
    const m = range.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/)
    if (!m) { total++; continue }
    if (!m[3]) { total++; continue }
    const col = s => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0)
    total += (Math.abs(col(m[3]) - col(m[1])) + 1) * (Math.abs(Number(m[4]) - Number(m[2])) + 1)
  }
  return total
}

function inRange(cell, range) {
  const [sheetA, a] = String(cell).includes('!') ? String(cell).split('!') : [null, cell]
  const [sheetB, b] = String(range ?? '').includes('!') ? String(range).split('!') : [null, range]
  if (!b) return false
  if (sheetA && sheetB && sheetA.replace(/'/g, '') !== sheetB.replace(/'/g, '')) return false
  const parse = ref => { const m = String(ref).match(/^([A-Z]+)(\d+)$/); return m ? [m[1], Number(m[2])] : null }
  const [start, end] = b.split(':')
  const p = parse(a.split(':')[0]); const s = parse(start); const e = parse(end ?? start)
  if (!p || !s || !e) return false
  const col = x => [...x].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0)
  return col(p[0]) >= col(s[0]) && col(p[0]) <= col(e[0]) && p[1] >= s[1] && p[1] <= e[1]
}
