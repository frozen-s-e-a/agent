// 一个对话（S-）：把 Harness 桥接插件的通知转成《接口约定》的流程事件（4.8 的对应表），
// 分配 seq、写事件日志、推给前端。
import fs from 'node:fs'
import path from 'node:path'

const now = () => new Date().toISOString()
const pad = (n, width = 4) => String(n).padStart(width, '0')
const textOf = blocks => (blocks ?? []).filter(b => b.type === 'text').map(b => b.text).join('')

/** 工具名 → 所属系统（4.8"工具事件里的名字"） */
export function systemOf(tool, mcpServers) {
  const m = /^mcp__([A-Za-z0-9_]+?)__/.exec(tool)
  if (!m) return 'Agent'
  if (m[1] === 'audit') return '审计工具'
  return mcpServers.find(s => s.name === m[1])?.title ?? m[1]
}

function clip(value, max) {
  const s = String(value)
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function parseArgs(raw) {
  if (raw && typeof raw === 'object') return raw
  try {
    return JSON.parse(raw || '{}')
  } catch {
    return { 参数: String(raw ?? '') }
  }
}

/** 一行参数摘要：key=value，过长截断。 */
export function argsLine(args) {
  const parts = Object.entries(args ?? {})
    .filter(([, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `${k}=${clip(typeof v === 'string' ? v : JSON.stringify(v), 40)}`)
  return clip(parts.join(', '), 120)
}

/** 工具结果（2.4 信封）→ { ok, summary, paths }。不是信封的结果按普通文字处理。 */
export function readEnvelope(message) {
  const raw = textOf(message.content)
  let env
  try {
    env = JSON.parse(raw)
  } catch {
    return { ok: !message.isError, summary: clip(raw.replace(/\s+/g, ' ').trim() || (message.isError ? '失败' : '完成'), 120), paths: [] }
  }
  if (env && typeof env === 'object' && 'ok' in env) {
    if (!env.ok) return { ok: false, summary: clip(env.error?.message ?? '失败', 160), paths: [] }
    const d = env.data ?? {}
    const bits = []
    if (typeof d.rowCount === 'number') bits.push(`${d.rowCount} 行`)
    if (Array.isArray(d.columns)) bits.push(`${d.columns.filter(c => !String(c).startsWith('_')).length} 列`)
    if (typeof d.summary === 'string') bits.push(clip(d.summary, 80))
    if (env.warnings?.length) bits.push(`${env.warnings.length} 条提示`)
    const paths = (env.refs ?? []).filter(r => typeof r === 'string' && /[\\/]/.test(r))
    return { ok: !message.isError, summary: bits.join('，') || '完成', paths }
  }
  return { ok: !message.isError, summary: clip(raw, 120), paths: [] }
}

const OUTPUT_KIND = { '.xlsx': 'table', '.xlsm': 'table', '.xls': 'table', '.csv': 'table', '.docx': 'report', '.pdf': 'report', '.md': 'report' }

export class Conversation {
  /**
   * @param {import('./host.mjs').AppHost} host
   * @param {string} project
   * @param {{ session: string, title: string, lastActive: string }} rec
   */
  constructor(host, project, rec) {
    this.host = host
    this.project = project
    this.rec = rec
    this.log = host.store.readEvents(project, rec.session)
    this.seq = this.log.at(-1)?.seq ?? 0
    this.turn = null
    this.calls = new Map()
    /** 宿主出的卡（动作确认、追问）：C- → { kind, bridgeId, answer } */
    this.hostCards = new Map()
    /** 未关闭的卡片编号 → 卡片 */
    this.open = new Map()
    for (const e of this.log) {
      if (e.type === 'card.opened') this.open.set(e.data.card, e.data)
      if (e.type === 'card.closed') this.open.delete(e.data.card)
    }
  }

  get id() {
    return this.rec.session
  }

  emit(type, data, task) {
    const event = { v: 'audit-events/1', session: this.id, ...(task ? { task } : {}), seq: ++this.seq, ts: now(), type, data }
    this.log.push(event)
    this.host.store.appendEvent(this.project, event)
    this.rec.lastActive = event.ts
    if (type === 'card.opened') this.open.set(data.card, data)
    if (type === 'card.closed') this.open.delete(data.card)
    this.host.trackTask(this, event)
    this.host.broadcast(event)
    return event
  }

  get openCards() {
    return this.open.size
  }

  // ---------- 前端 → Harness ----------

  userMessage(text, files) {
    const message = 'M-' + pad(this.host.store.next(this.project, 'message'))
    this.emit('message.created', { message, text, ...(files?.length ? { files } : {}) })
    if (this.rec.title === '新对话') this.rec.title = clip(text.replace(/\s+/g, ' '), 20)
    return message
  }

  /** Harness 进程没了：进行中的这一轮结束，未答的卡撤回（接口约定 1.1：未答的卡片不落盘）。 */
  harnessGone(reason) {
    if (this.turn) this.finishTurn({ kind: 'error', message: reason })
    for (const card of [...this.open.keys()]) this.emit('card.closed', { card, withdrawn: true })
    this.hostCards.clear()
  }

  // ---------- Harness → 前端 ----------

  beginTurn() {
    if (this.turn) return this.turn
    this.turn = { message: 'M-' + pad(this.host.store.next(this.project, 'message')), streamed: '', committed: [], refs: [], stepHadText: false }
    return this.turn
  }

  finishTurn(reason) {
    const turn = this.turn
    if (!turn) return
    this.turn = null
    let text = turn.committed.join('\n\n')
    if (!text && turn.streamed) text = turn.streamed
    if (reason?.kind === 'aborted') text = text ? text + '\n\n（已停止）' : '（已停止）'
    else if (reason?.kind && reason.kind !== 'completed') text = (text ? text + '\n\n' : '') + `（这一轮出错：${reason.message ?? reason.kind}）`
    // 还在等结果的工具调用一并结束
    for (const [call, info] of this.calls) {
      if (!info.finished) this.emit('tool.finished', { call, ok: false, resultSummary: '没有完成', durationMs: Date.now() - info.startedAt })
    }
    this.calls.clear()
    this.emit('message.completed', { message: turn.message, text, refs: turn.refs })
  }

  onStream(frame) {
    if (frame.type === 'start') {
      const turn = this.beginTurn()
      turn.stepHadText = false
      return
    }
    if (frame.type !== 'chunk' || frame.chunk?.type !== 'text-delta' || !frame.chunk.text) return
    const turn = this.beginTurn()
    let text = frame.chunk.text
    if (!turn.stepHadText && turn.streamed) text = '\n\n' + text
    turn.stepHadText = true
    turn.streamed += text
    this.emit('message.delta', { message: turn.message, text })
  }

  onSessionEvent(event) {
    switch (event.type) {
      case 'turn/start':
        this.beginTurn()
        return
      case 'assistant/message': {
        const turn = this.beginTurn()
        const text = textOf(event.data.message?.content)
        if (text) {
          // 没有流式片段的模型（或片段丢了）：补一段增量，保证前端看到的文字和落盘的一致
          const before = turn.committed.join('\n\n')
          const after = before ? before + '\n\n' + text : text
          if (!turn.streamed.startsWith(after) && after.startsWith(turn.streamed)) {
            const missing = after.slice(turn.streamed.length)
            turn.streamed = after
            this.emit('message.delta', { message: turn.message, text: missing })
          }
          turn.committed.push(text)
        }
        return
      }
      case 'tool/call': {
        const { callId, name, arguments: raw } = event.data
        if (name === 'ask_user_question') return // 追问以卡片出现，不再列成工具调用
        this.beginTurn()
        const args = parseArgs(raw)
        this.calls.set(callId, { tool: name, args, startedAt: Date.now() })
        this.emit('tool.started', { call: callId, tool: name, system: systemOf(name, this.host.store.settings.mcp), argsSummary: argsLine(args), message: this.turn.message })
        return
      }
      case 'tool/result': {
        const message = event.data.message ?? {}
        const callId = message.toolCallId ?? message.source?.callId
        const info = this.calls.get(callId)
        if (!info) return
        info.finished = true
        const { ok, summary, paths } = readEnvelope(message)
        const refs = ok ? this.registerOutputs(paths) : []
        if (this.turn) this.turn.refs.push(...refs)
        this.emit('tool.finished', { call: callId, ok, resultSummary: summary, refs, durationMs: Date.now() - info.startedAt })
        return
      }
      case 'turn/end':
        this.finishTurn(event.data.reason)
        return
      case 'session/title':
        if (this.rec.title === '新对话' && event.data.title) this.rec.title = clip(event.data.title, 20)
        return
    }
  }

  /** 工具产出的文件登记为对话产出（4.9），推送 output.ready。 */
  registerOutputs(paths) {
    const root = this.host.store.project(this.project).folder
    const state = this.host.store.state(this.project)
    const ids = []
    for (const rel of paths) {
      const norm = rel.replace(/\\/g, '/')
      if (/manifest\.json$/i.test(norm)) continue
      const abs = path.resolve(root, norm)
      if (!abs.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(abs)) continue
      const known = state.outputs.find(o => o.file === norm)
      if (known) {
        ids.push(known.output)
        continue
      }
      const output = 'O-' + pad(this.host.store.next(this.project, 'output'))
      const kind = OUTPUT_KIND[path.extname(norm).toLowerCase()] ?? 'other'
      const rec = { output, file: norm, name: path.basename(norm), kind, session: this.id, at: now() }
      state.outputs.push(rec)
      this.emit('output.ready', { output, file: norm, kind })
      ids.push(output)
    }
    this.host.store.saveState(this.project)
    return ids
  }

  /** 动作确认（5.8）：approval.request → action_confirmation 卡。 */
  onApproval(params) {
    const card = 'C-h' + pad(this.host.store.next(this.project, 'card'), 3)
    const call = this.calls.get(params.callId)
    const args = call?.args ?? {}
    const tool = params.toolName
    const described = this.host.describeTool(tool)
    this.hostCards.set(card, { kind: 'approval', bridgeId: params.id })
    this.emit('card.opened', {
      card,
      kind: 'action_confirmation',
      session: this.id,
      title: `确认${described.operation}`,
      blocking: true,
      body: {
        system: systemOf(tool, this.host.store.settings.mcp),
        operation: described.operation,
        target: null,
        argsSummary: Object.entries(args).map(([label, value]) => ({ label: described.labels[label] ?? label, value: clip(typeof value === 'string' ? value : JSON.stringify(value), 200) })),
        reversible: null,
        reverseHow: null,
        tool,
        call: params.callId ?? null,
      },
      actions: ['confirm', 'reject'],
      defaultAction: 'reject',
    })
  }

  /** 模型追问（5.6）：question.request → question 卡。 */
  onQuestion(params) {
    const card = 'C-h' + pad(this.host.store.next(this.project, 'card'), 3)
    this.hostCards.set(card, { kind: 'question', bridgeId: params.id, questions: params.questions })
    const questions = (params.questions ?? []).slice(0, 3).map((q, i) => ({
      id: q.id ?? 'q' + (i + 1),
      text: q.question ?? q.text ?? '',
      options: (q.options ?? []).map(o => ({ label: typeof o === 'string' ? o : o.label })),
      allowText: true,
    }))
    this.emit('card.opened', {
      card,
      kind: 'question',
      session: this.id,
      title: questions.length === 1 ? '回答后继续' : `有 ${questions.length} 个问题，回答后继续`,
      blocking: true,
      body: { questions },
      actions: ['confirm'],
      defaultAction: 'confirm',
    })
  }

  /** 桥接插件的 approval.closed / question.closed（带 id）。 */
  onBridgeClosed(bridgeId, withdrawn) {
    for (const [card, item] of this.hostCards) {
      if (item.bridgeId !== bridgeId) continue
      this.hostCards.delete(card)
      if (withdrawn || !item.answer) this.emit('card.closed', { card, withdrawn: true })
      else this.emit('card.closed', { card, answer: item.answer })
    }
  }

  /** 前端回答宿主出的卡 → 桥接请求。返回 false 表示不是宿主出的卡。 */
  async answerHostCard(card, answer) {
    const item = this.hostCards.get(card)
    if (!item) return false
    const harness = await this.host.harnessFor(this.project)
    item.answer = answer
    if (item.kind === 'approval') {
      await harness.request('approval/respond', { id: item.bridgeId, outcome: answer.action === 'confirm' ? 'allowed-once' : 'rejected' })
    } else {
      const edits = answer.edits ?? {}
      const answers = (item.questions ?? []).map((q, i) => {
        const id = q.id ?? 'q' + (i + 1)
        const v = edits[id]
        const options = (q.options ?? []).map(o => (typeof o === 'string' ? o : o.label))
        if (typeof v === 'number' && options[v] !== undefined) return { id, selected: [options[v]] }
        return { id, selected: [], custom: String(v ?? answer.note ?? '') }
      })
      await harness.request('question/respond', { id: item.bridgeId, answers })
    }
    return true
  }
}
