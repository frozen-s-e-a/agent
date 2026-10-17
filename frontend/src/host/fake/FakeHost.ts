// 假宿主：按接口约定响应前端命令，按回放文件推送事件。可以暂停、单步、跳到某个 seq，模拟断线。
// 回放到 card.closed 时，如果用户还没回答那张卡，就停下来等 card.answer，再用用户的回答发出 card.closed。
import { cellAddr, parseRange } from "../../lib/address";
import type {
  AuditEvent,
  Card,
  CardAnswer,
  CellTrace,
  McpServer,
  McpStatus,
  Method,
  OutputFile,
  ParamsOf,
  Project,
  ProjectFile,
  RegionState,
  ResultOf,
  SessionSummary,
  Settings,
  SheetCell,
  SheetRegionOverlay,
  SheetView,
  TaskSnapshot,
} from "../../protocol/types";
import { HostError } from "../../protocol/types";
import type { HostClient } from "../client";
import replay from "./replay-workpaper-fill.json";
import { hasTable, tableView } from "./tables";
import { cellText, filledCells, OUTPUT_FILES, planCells, WORKBOOKS, type FixtureSheet } from "./workbooks";

type Listener = (e: AuditEvent) => void;

const REPLAY = (replay as { events: AuditEvent[] }).events;
const REPLAY_SESSION = "S-41d2";

/** 底稿 W-003 的区域结构（workpaper_parse 的结果） */
const WORKPAPER_REGIONS: Omit<SheetRegionOverlay, "state">[] = [
  {
    region: "W-003#R5",
    range: "A5:E11",
    type: "fixed_table",
    purpose: "应收账款账龄分析",
    headerRows: [5, 6],
    totals: [11],
    manual: ["E7:E10"],
  },
  { region: "W-003#R6", range: "A15:D20", type: "detail_table", purpose: "期末余额前五名客户", headerRows: [15], manual: [] },
];

export interface ReplayState {
  session: string | null;
  cursor: number; // 下一条要发的回放事件下标
  total: number;
  playing: boolean;
  waitingCard: string | null;
  speed: number;
  connected: boolean;
  lastSeq: number;
}

interface SessionRec {
  summary: SessionSummary;
  log: AuditEvent[];
  seq: number;
}

export class FakeHost implements HostClient {
  private listeners = new Set<Listener>();
  private connListeners = new Set<(c: boolean) => void>();
  private stateListeners = new Set<(s: ReplayState) => void>();
  private connected = true;
  private sessions = new Map<string, SessionRec>();
  private answers = new Map<string, CardAnswer>();
  private openCards = new Map<string, Card>();
  private regionStates = new Map<string, RegionState>();
  private outputs: OutputFile[] = [];
  private replaySession: string | null = null;
  private cursor = 0;
  private playing = false;
  private speed = 1;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private settings: Settings;
  private projects: Project[] = [
    { project: "P-7f3a", name: "华东示例制造 2025年报审计", folder: "D:\\审计项目\\华东示例制造2025", lastActive: "2026-10-17T08:00:00Z" },
    { project: "P-2b19", name: "江南示例科技 2025年报审计", folder: "D:\\审计项目\\江南示例科技2025", lastActive: "2026-10-12T06:30:00Z" },
  ];
  private files: ProjectFile[] = [
    { file: "F-9a1be04c77d2", name: "应收账款底稿.xlsx", kind: "workpaper", sizeBytes: 48211, addedAt: "2026-10-17T07:58:00Z", sheets: ["应收账款", "审定表"] },
    { file: "F-1c44d0e2a7b9", name: "科目余额表2025.xlsx", kind: "data", sizeBytes: 96530, addedAt: "2026-10-17T07:58:00Z", sheets: ["余额表"] },
    { file: "F-6e02f5a1c3d8", name: "序时账2025.xlsx", kind: "data", sizeBytes: 8_412_330, addedAt: "2026-10-17T07:58:00Z", sheets: ["序时账"] },
  ];
  private mcp: McpServer[] = [
    {
      name: "oa",
      title: "OA 系统",
      enabled: true,
      transport: "stdio",
      command: "C:\\tools\\oa-mcp\\oa-mcp.exe",
      args: ["--profile", "prod"],
      env: { OA_REGION: "hq" },
      secretEnv: ["OA_TOKEN"],
      state: "connected",
      tools: [
        { tool: "query_expense", description: "按单号或日期查询报销单", argsSummary: "billNo?, from?, to?", enabled: true, sideEffect: "readonly", readOnlyHint: true },
        { tool: "approve", description: "审批报销单", argsSummary: "billNo, opinion", enabled: true, sideEffect: "mutating" },
        { tool: "list_pending", description: "列出待我审批的单据", argsSummary: "type?", enabled: true, sideEffect: "mutating", readOnlyHint: true },
      ],
    },
    {
      name: "contract",
      title: "合同系统",
      enabled: true,
      transport: "http",
      url: "https://contract.intra.example/mcp",
      hasToken: true,
      state: "failed",
      error: { code: "MCP_AUTH", message: "令牌无效或已过期" },
      tools: [],
    },
  ];
  private chatCounter = 1;

  constructor(opts: { connected?: boolean } = {}) {
    this.settings = {
      baseUrl: opts.connected === false ? "" : "https://llm.intra.example/v1",
      model: opts.connected === false ? "" : "qwen2.5-72b-instruct",
      models: ["qwen2.5-72b-instruct", "deepseek-v3"],
      hasKey: opts.connected !== false,
      connected: opts.connected !== false,
    };
    const now = "2026-10-17T08:00:00Z";
    this.addSession({ session: REPLAY_SESSION, project: "P-7f3a", title: "应收账款底稿填写", lastActive: now, tasks: [] });
    this.addSession({ session: "S-52e1", project: "P-7f3a", title: "前五大客户回款情况", lastActive: "2026-10-16T09:20:00Z", tasks: [] });
    this.addSession({ session: "S-3a07", project: "P-7f3a", title: "存货监盘计划", lastActive: "2026-10-15T02:10:00Z", tasks: [{ task: "T-09aa", status: "completed" }] });
    this.seedChat("S-52e1");
    this.sessions.get("S-52e1")!.summary.lastActive = "2026-10-16T09:20:00Z"; // 预置内容不算新活动
  }

  // ---------- HostClient ----------

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    queueMicrotask(() => {
      for (const s of this.mcp) listener(this.mcpEvent(s));
    });
    return () => this.listeners.delete(listener);
  }

  onConnectionChange(listener: (c: boolean) => void) {
    this.connListeners.add(listener);
    return () => this.connListeners.delete(listener);
  }

  async request<M extends Method>(method: M, params: ParamsOf<M>): Promise<ResultOf<M>> {
    await delay(method === "sheet.view" || method === "table.view" ? 60 : 120);
    if (!this.connected && method !== "session.events" && method !== "task.events") {
      throw new HostError("ENV_DISCONNECTED", "和宿主的连接已断开");
    }
    const fn = (this.handlers as Record<string, (p: unknown) => unknown>)[method];
    if (!fn) throw new HostError("ARG_UNKNOWN_METHOD", `假宿主还没实现 ${method}`);
    return fn.call(this, params) as ResultOf<M>;
  }

  // ---------- 回放控制（开发面板用） ----------

  onReplayState(l: (s: ReplayState) => void) {
    this.stateListeners.add(l);
    l(this.replayState());
    return () => this.stateListeners.delete(l);
  }

  replayState(): ReplayState {
    const next = REPLAY[this.cursor];
    const waiting = this.waitingFor(next);
    return {
      session: this.replaySession,
      cursor: this.cursor,
      total: REPLAY.length,
      playing: this.playing,
      waitingCard: waiting,
      speed: this.speed,
      connected: this.connected,
      lastSeq: this.replaySession ? this.sessions.get(this.replaySession)!.seq : 0,
    };
  }

  startReplay(session = REPLAY_SESSION, userText?: string) {
    this.replaySession = session;
    this.cursor = 0;
    this.userText = userText;
    this.play();
  }
  private userText?: string;

  play() {
    if (!this.replaySession) this.replaySession = REPLAY_SESSION;
    this.playing = true;
    this.schedule();
    this.notifyState();
  }

  pause() {
    this.playing = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.notifyState();
  }

  step() {
    if (!this.replaySession) this.replaySession = REPLAY_SESSION;
    this.emitNext();
    this.notifyState();
  }

  setSpeed(s: number) {
    this.speed = s;
    this.notifyState();
  }

  /** 一口气发到 seq（含）。途中的卡片用回放里录好的回答 */
  jumpTo(seq: number) {
    if (!this.replaySession) this.replaySession = REPLAY_SESSION;
    this.pause();
    while (this.cursor < REPLAY.length && (REPLAY[this.cursor].seq ?? 0) <= seq) {
      const ev = REPLAY[this.cursor];
      if (ev.type === "card.closed" && !this.answers.has(ev.data.card)) this.answers.set(ev.data.card, ev.data.answer!);
      this.emitNext();
    }
    this.notifyState();
  }

  setConnected(c: boolean) {
    this.connected = c;
    for (const l of this.connListeners) l(c);
    this.notifyState();
  }

  // ---------- 内部 ----------

  private notifyState() {
    const s = this.replayState();
    for (const l of this.stateListeners) l(s);
  }

  private waitingFor(ev: AuditEvent | undefined): string | null {
    if (ev?.type === "card.closed" && !this.answers.has(ev.data.card)) return ev.data.card;
    return null;
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.playing || this.cursor >= REPLAY.length) {
      if (this.cursor >= REPLAY.length) this.playing = false;
      return;
    }
    const next = REPLAY[this.cursor];
    if (this.waitingFor(next)) {
      this.notifyState();
      return; // 等用户回答
    }
    const prev = REPLAY[this.cursor - 1];
    const gap = prev ? Date.parse(next.ts) - Date.parse(prev.ts) : 0;
    const wait = Math.min(1600, Math.max(140, gap)) / this.speed;
    this.timer = setTimeout(() => {
      this.emitNext();
      this.schedule();
      this.notifyState();
    }, wait);
  }

  private emitNext() {
    const raw = REPLAY[this.cursor];
    if (!raw) return;
    if (this.waitingFor(raw)) return;
    this.cursor++;
    let ev: AuditEvent = { ...raw, session: this.replaySession!, ts: new Date().toISOString() } as AuditEvent;
    if (ev.type === "card.closed") ev = { ...ev, data: { ...ev.data, answer: this.answers.get(ev.data.card) } };
    if ((ev.type === "message.created" || ev.type === "task.created") && this.userText)
      ev = { ...ev, data: { ...ev.data, text: this.userText } } as AuditEvent;
    this.push(ev);
  }

  private push(ev: AuditEvent) {
    const rec = ev.session ? this.sessions.get(ev.session) : undefined;
    if (rec) {
      rec.seq += 1;
      ev = { ...ev, seq: rec.seq };
      rec.log.push(ev);
      rec.summary.lastActive = new Date().toISOString();
    }
    this.track(ev);
    if (this.connected) for (const l of this.listeners) l(ev);
  }

  private track(ev: AuditEvent) {
    const rec = ev.session ? this.sessions.get(ev.session) : undefined;
    switch (ev.type) {
      case "task.created":
        if (rec && !rec.summary.tasks.some((t) => t.task === ev.task)) rec.summary.tasks.push({ task: ev.task!, status: "running" });
        break;
      case "task.finished":
        if (rec) for (const t of rec.summary.tasks) if (t.task === ev.task) t.status = ev.data.status;
        break;
      case "region.state":
        this.regionStates.set(ev.data.region, ev.data.state);
        break;
      case "card.opened":
        this.openCards.set(ev.data.card, ev.data);
        break;
      case "card.closed":
        this.openCards.delete(ev.data.card);
        break;
      case "output.ready": {
        const n = this.outputs.length + 1;
        const name = ev.data.file.split("/").pop()!;
        this.outputs.push({
          output: `O-${String(n).padStart(4, "0")}`,
          file: ev.data.file,
          name,
          kind: ev.data.kind,
          session: ev.session!,
          task: ev.task,
          checks: ev.data.checks,
          at: ev.ts,
        });
        break;
      }
    }
    if (rec) rec.summary.openCards = [...this.openCards.values()].filter((c) => (c.session ?? REPLAY_SESSION) === rec.summary.session || (c.task && rec.summary.tasks.some((t) => t.task === c.task))).length;
  }

  private addSession(s: SessionSummary) {
    this.sessions.set(s.session, { summary: s, log: [], seq: 0 });
  }

  private ev<T extends AuditEvent["type"]>(session: string, type: T, data: Extract<AuditEvent, { type: T }>["data"], task?: string) {
    this.push({ v: "audit-events/1", session, task, ts: new Date().toISOString(), type, data } as AuditEvent);
  }

  private seedChat(session: string) {
    this.ev(session, "message.created", { message: "M-0001", text: "前五大客户今年的回款情况怎么样？" });
    this.ev(session, "tool.started", { call: "call_1", tool: "query_run", system: "审计工具", argsSummary: "D-002 按往来单位汇总 2025 年贷方发生额" });
    this.ev(session, "tool.finished", { call: "call_1", ok: true, resultSummary: "生成 R-021，7 行", refs: ["R-021"], durationMs: 820 });
    this.ev(session, "message.completed", {
      message: "M-0002",
      text: "前五大客户 2025 年共回款 8,960,000.00 元，回款率 83%。苏州恒信电子回款最慢，年末仍有 420,000.00 元未收，其中 1 年以上 60,000.00 元。",
      refs: ["R-011"],
    });
  }

  private mcpEvent(s: McpServer): AuditEvent {
    const data: McpStatus = { name: s.name, state: s.enabled ? s.state : "disabled", toolCount: s.tools.length };
    if (s.error) data.error = s.error;
    return { v: "audit-events/1", ts: new Date().toISOString(), type: "mcp.status", data };
  }

  /** 普通对话：工具调用 + 流式回复；提到审批时出动作确认卡 */
  private async chatReply(session: string, text: string) {
    const msg = `M-${String(++this.chatCounter + 100).padStart(4, "0")}`;
    const call = `call_${this.chatCounter}`;
    if (/审批|批准|approve/i.test(text)) {
      this.ev(session, "tool.started", { call: `${call}a`, tool: "mcp__oa__query_expense", system: "OA 系统", argsSummary: "billNo=BX-2025-1188" });
      await delay(500);
      this.ev(session, "tool.finished", { call: `${call}a`, ok: true, resultSummary: "报销单 BX-2025-1188：差旅费 3,260.00 元，待审批", durationMs: 460 });
      const card: Card = {
        card: `C-1${this.chatCounter}`,
        kind: "action_confirmation",
        session,
        title: "确认提交报销审批",
        blocking: true,
        body: {
          system: "OA 系统",
          operation: "提交审批",
          target: "报销单 BX-2025-1188",
          argsSummary: [
            { label: "审批意见", value: "同意" },
            { label: "金额", value: "3,260.00" },
          ],
          reversible: false,
          reverseHow: null,
          tool: "mcp__oa__approve",
          call,
        },
        actions: ["confirm", "reject"],
        defaultAction: "reject",
      };
      this.ev(session, "card.opened", card);
      this.pendingAction.set(card.card, { session, msg, call });
      return;
    }
    this.ev(session, "tool.started", { call, tool: "result_get", system: "审计工具", argsSummary: "R-011 前 5 行" });
    await delay(600);
    this.ev(session, "tool.finished", { call, ok: true, resultSummary: "5 行，合计 1,300,000.00", refs: ["R-011"], durationMs: 540 });
    const reply = "期末余额前五名客户合计 1,300,000.00 元，占应收账款期末余额的 70.85%。最大的一户是苏州恒信电子有限公司，420,000.00 元。";
    await this.stream(session, msg, reply, ["R-011"]);
  }
  private pendingAction = new Map<string, { session: string; msg: string; call: string }>();

  private async stream(session: string, msg: string, text: string, refs: string[] = []) {
    this.stopped.delete(session);
    for (let i = 0; i < text.length; i += 4) {
      if (this.stopped.has(session)) {
        this.ev(session, "message.completed", { message: msg, text: text.slice(0, i) + "（已停止）", refs: [] });
        return;
      }
      this.ev(session, "message.delta", { message: msg, text: text.slice(i, i + 4) });
      await delay(45);
    }
    this.ev(session, "message.completed", { message: msg, text, refs });
  }
  private stopped = new Set<string>();

  private sheetFor(file: string, sheet?: string): { sheets: FixtureSheet[]; s: FixtureSheet; output: boolean } {
    const out = OUTPUT_FILES[file];
    const wb = WORKBOOKS[out ? out.base : file] ?? WORKBOOKS[this.outputs.find((o) => o.output === file)?.file ? OUTPUT_FILES[this.outputs.find((o) => o.output === file)!.file].base : ""];
    if (!wb) throw new HostError("REF_FILE", `没有文件 ${file}`);
    const s = sheet ? wb.sheets.find((x) => x.name === sheet) : wb.sheets[0];
    if (!s) throw new HostError("REF_SHEET", `没有工作表 ${sheet}`);
    return { sheets: wb.sheets, s, output: !!out || file.startsWith("O-") };
  }

  // ---------- 命令 ----------

  private handlers: { [M in Method]?: (p: ParamsOf<M>) => ResultOf<M> | Promise<ResultOf<M>> } = {
    "settings.get": () => ({ ...this.settings }),
    "settings.save": (p) => {
      Object.assign(this.settings, p);
      return { ...this.settings };
    },
    "secret.save": () => {
      this.settings.hasKey = true;
      return { saved: true };
    },
    "connection.test": async (p) => {
      await delay(700);
      const url = p.baseUrl ?? this.settings.baseUrl;
      if (!url || !/^https?:\/\//.test(url)) return { ok: false, error: { code: "ENV_BAD_URL", message: "地址要以 http:// 或 https:// 开头" } };
      if (/fail|bad/.test(url)) return { ok: false, error: { code: "ENV_UNREACHABLE", message: "连不上这个地址：连接超时（10 秒）" } };
      this.settings.connected = true;
      return { ok: true, models: this.settings.models, latencyMs: 230 };
    },
    "project.list": () => ({ projects: this.projects }),
    "project.create": (p) => {
      const pr = { project: `P-${Math.random().toString(16).slice(2, 6)}`, name: p.name, folder: p.folder, lastActive: new Date().toISOString() };
      this.projects.unshift(pr);
      return pr;
    },
    // 真宿主切换项目要换 Harness 进程，约 2 秒
    "project.open": async (p) => (await delay(1500), this.projects.find((x) => x.project === p.project)!),
    "project.rename": (p) => {
      const pr = this.projects.find((x) => x.project === p.project)!;
      pr.name = p.name;
      return pr;
    },
    "project.remove": (p) => {
      this.projects = this.projects.filter((x) => x.project !== p.project);
      return { removed: true };
    },
    "files.list": () => ({ files: this.files }),
    "files.add": (p) => {
      const added = p.paths.map((path, i) => {
        const name = path.split(/[\\/]/).pop()!;
        const f: ProjectFile = { file: `F-${(Date.now() + i).toString(16).slice(-12)}`, name, kind: /底稿/.test(name) ? "workpaper" : "data", addedAt: new Date().toISOString() };
        return f;
      });
      this.files.push(...added);
      return { files: added };
    },
    "session.list": (p) => ({
      sessions: [...this.sessions.values()].map((r) => r.summary).filter((s) => s.project === p.project).sort((a, b) => b.lastActive.localeCompare(a.lastActive)),
    }),
    "session.create": (p) => {
      const id = `S-${Math.random().toString(16).slice(2, 6)}`;
      this.addSession({ session: id, project: p.project, title: p.title ?? "新对话", lastActive: new Date().toISOString(), tasks: [] });
      return { session: id };
    },
    "session.get": (p) => {
      const rec = this.sessions.get(p.session);
      if (!rec) throw new HostError("REF_SESSION", `没有对话 ${p.session}`);
      return { session: p.session, title: rec.summary.title, tasks: [], openCards: [], lastSeq: rec.seq };
    },
    "session.rename": (p) => {
      this.sessions.get(p.session)!.summary.title = p.title;
      return { session: p.session };
    },
    "session.delete": (p) => {
      this.sessions.delete(p.session);
      return { deleted: true };
    },
    "session.events": (p) => ({ events: (this.sessions.get(p.session)?.log ?? []).filter((e) => (e.seq ?? 0) > p.after) }),
    "task.events": (p) => {
      const all = [...this.sessions.values()].flatMap((r) => r.log);
      return { events: all.filter((e) => e.task === p.task && (e.seq ?? 0) > p.after) };
    },
    "message.send": (p) => {
      const rec = this.sessions.get(p.session)!;
      if (rec.summary.title === "新对话") rec.summary.title = p.text.slice(0, 16);
      const isWorkpaper = /底稿|填写/.test(p.text) && !this.replaySession;
      if (isWorkpaper) {
        this.startReplay(p.session, p.text);
        return { message: "M-0001" };
      }
      const id = `M-${String(++this.chatCounter + 100).padStart(4, "0")}`;
      this.ev(p.session, "message.created", { message: id, text: p.text, files: p.files });
      void this.chatReply(p.session, p.text);
      return { message: id };
    },
    "message.stop": (p) => {
      this.stopped.add(p.session);
      return { stopped: true };
    },
    "task.create": (p) => {
      this.startReplay(p.session, p.text);
      return { task: "T-0c21" };
    },
    "task.get": (p) => this.snapshot(p.task),
    "task.list": () => ({ tasks: this.replaySession ? [this.snapshot("T-0c21")] : [] }),
    "task.message": (p) => {
      if (this.replaySession) this.ev(this.replaySession, "user.message", { text: p.text, regions: [] }, p.task);
      return { accepted: true };
    },
    "task.cancel": () => {
      this.pause();
      if (this.replaySession) this.ev(this.replaySession, "task.finished", { status: "cancelled" }, "T-0c21");
      return { cancelled: true };
    },
    "task.resume": () => {
      this.play();
      return { resumed: true };
    },
    "task.rerun": (p) => {
      if (this.replaySession) this.ev(this.replaySession, "task.rerun", { scope: p.scope, note: p.note, voided: [] }, p.task);
      return { accepted: true };
    },
    "card.answer": (p) => {
      if (this.answers.has(p.card) || !this.openCards.has(p.card)) throw new HostError("ARG_CARD_CLOSED", "这张卡已经处理过了");
      const answer: CardAnswer = { action: p.action, edits: p.edits ?? {}, note: p.note ?? "" };
      const action = this.pendingAction.get(p.card);
      if (action) {
        this.pendingAction.delete(p.card);
        this.answers.set(p.card, answer);
        this.ev(action.session, "card.closed", { card: p.card, answer });
        void this.afterAction(action, p.action === "confirm");
        return { accepted: true };
      }
      this.answers.set(p.card, answer);
      // 回放里没录这张卡的关闭（比如不阻塞的结果卡）：直接关
      const session = [...this.sessions.values()].find((r) => r.log.some((e) => e.type === "card.opened" && e.data.card === p.card));
      if (!REPLAY.slice(this.cursor).some((e) => e.type === "card.closed" && e.data.card === p.card)) {
        this.openCards.delete(p.card);
        if (session) this.ev(session.summary.session, "card.closed", { card: p.card, answer });
        return { accepted: true };
      }
      // 回放正停在这张卡上：继续
      if (this.playing) this.schedule();
      else if (REPLAY[this.cursor]?.type === "card.closed") this.emitNext();
      this.notifyState();
      return { accepted: true };
    },
    "outputs.list": () => ({ outputs: this.outputs }),
    "output.open": () => ({ opened: true }),
    "sheet.view": (p) => this.sheetView(p),
    "table.view": (p) => {
      if (!hasTable(p.table)) throw new HostError("REF_TABLE", `没有表 ${p.table}`);
      return tableView(p.table, p.offset ?? 0, p.limit ?? 200, p.locate ?? null);
    },
    "cell.trace": (p) => this.trace(p.cell),
    "mcp.list": () => ({ servers: this.mcp.map((s) => ({ ...s })) }),
    "mcp.add": async (p) => {
      if (p.name.toLowerCase() === "audit") throw new HostError("MCP_NAME_RESERVED", "服务名 audit 留给内置审计工具");
      const { token, secrets, ...cfg } = p;
      void secrets;
      const s: McpServer = { ...cfg, hasToken: !!token || cfg.hasToken, state: "connecting", tools: [] };
      this.mcp.push(s);
      this.push(this.mcpEvent(s));
      await delay(600);
      s.state = "connected";
      s.tools = [{ tool: "search", description: "检索记录", argsSummary: "q, limit?", enabled: true, sideEffect: "mutating", readOnlyHint: true }];
      this.push(this.mcpEvent(s));
      return { ...s };
    },
    "mcp.update": (p) => {
      const s = this.mcp.find((x) => x.name === p.name);
      if (!s) throw new HostError("REF_MCP", `没有服务 ${p.name}`);
      const { tools, token, secrets, ...rest } = p;
      void secrets;
      Object.assign(s, rest);
      if (token) s.hasToken = true;
      for (const t of tools ?? []) {
        const tool = s.tools.find((x) => x.tool === t.tool);
        if (tool) Object.assign(tool, t);
      }
      this.push(this.mcpEvent(s));
      return { ...s };
    },
    "mcp.remove": (p) => {
      this.mcp = this.mcp.filter((x) => x.name !== p.name);
      return { removed: true };
    },
    "mcp.test": async (p) => {
      await delay(800);
      const cfg = "transport" in p ? p : this.mcp.find((x) => x.name === p.name);
      if (!cfg) return { ok: false, error: { code: "MCP_UNREACHABLE", message: "没有这个服务" } };
      if (cfg.transport === "http" && cfg.url?.includes("contract")) return { ok: false, error: { code: "MCP_AUTH", message: "令牌无效或已过期（401）" } };
      if (cfg.transport === "stdio" && !cfg.command) return { ok: false, error: { code: "MCP_SPAWN_FAILED", message: "没有填写程序路径" } };
      const known = this.mcp.find((x) => x.name === cfg.name);
      return {
        ok: true,
        serverInfo: { name: `${cfg.name}-mcp`, version: "1.4.0" },
        latencyMs: 180,
        tools: known?.tools.length ? known.tools : [
          { tool: "search", description: "检索记录", argsSummary: "q, limit?", enabled: true, sideEffect: "mutating", readOnlyHint: true },
          { tool: "create", description: "新建记录", argsSummary: "title, body", enabled: true, sideEffect: "mutating" },
        ],
      };
    },
    "privacy.status": () => ({
      outbound: [
        { item: "model", label: "模型请求", state: "on", target: this.settings.baseUrl || "未配置" },
        { item: "mcp", label: "外部 MCP 服务", state: "on", target: this.mcp.filter((s) => s.url).map((s) => s.url!) },
        { item: "telemetry", label: "遥测", state: "off" },
        { item: "sessionLogUpload", label: "会话日志随请求上传", state: "off" },
        { item: "webSearch", label: "联网搜索", state: "off" },
        { item: "account", label: "DeepSeek 账号服务", state: "off" },
        { item: "autoUpdate", label: "自动更新", state: "off" },
        { item: "pluginInstall", label: "插件安装", state: "off" },
      ],
      shell: "off",
      verifiedAt: new Date().toISOString(),
    }),
    "app.info": () => ({
      version: "0.1.0",
      buildTime: "2026-10-17 17:20",
      harness: "DeepSeek Harness 0.9.4（固定版本）",
      tools: "审计工具服务 0.3.0",
      interfaces: { tools: "audit-tools/1", events: "audit-events/1", app: "audit-app/1", cards: "audit-cards/1" },
      runtimes: { node: "22.11.0", python: "3.12.7" },
      dataDir: "C:\\Users\\auditor\\AppData\\Roaming\\审计助手",
    }),
    "logs.export": async () => {
      await delay(900);
      return { file: "C:\\Users\\auditor\\Desktop\\audit-agent-logs-20261017.zip", sizeBytes: 1832204 };
    },
  };

  private async afterAction(a: { session: string; msg: string; call: string }, confirmed: boolean) {
    if (confirmed) {
      this.ev(a.session, "tool.started", { call: a.call, tool: "mcp__oa__approve", system: "OA 系统", argsSummary: "billNo=BX-2025-1188, opinion=同意" });
      await delay(700);
      this.ev(a.session, "tool.finished", { call: a.call, ok: true, resultSummary: "已提交，审批单号 SP-20261017-031", durationMs: 690 });
      await this.stream(a.session, a.msg, "已在 OA 系统提交报销单 BX-2025-1188 的审批，意见为“同意”，审批单号 SP-20261017-031。");
    } else {
      this.ev(a.session, "tool.finished", { call: a.call, ok: false, resultSummary: "用户拒绝", durationMs: 0 });
      await this.stream(a.session, a.msg, "好的，没有提交审批。报销单 BX-2025-1188 仍是待审批状态。");
    }
  }

  private snapshot(task: string): TaskSnapshot {
    return {
      task,
      status: "running",
      stage: "compute",
      lastSeq: this.replaySession ? this.sessions.get(this.replaySession)!.seq : 0,
      deliverables: [],
      regions: WORKPAPER_REGIONS.map((r) => ({ region: r.region, state: this.regionStates.get(r.region) ?? "pending" })),
      openCards: [...this.openCards.keys()],
      outputs: this.outputs.map((o) => o.file),
    };
  }

  private sheetView(p: ParamsOf<"sheet.view">): SheetView {
    const { sheets, s, output } = this.sheetFor(p.file, p.sheet);
    const used = parseRange(s.usedRange);
    const req = p.range ? parseRange(p.range) : used;
    const box = { c0: req.c0, r0: req.r0, c1: Math.min(req.c1, used.c1), r1: Math.min(req.r1, used.r1) };
    const cellsN = (box.c1 - box.c0 + 1) * (box.r1 - box.r0 + 1);
    if (cellsN > 5000 + used.c1 + 1) throw new HostError("ARG_RANGE_TOO_LARGE", `一次最多 5,000 格，这次要了 ${cellsN} 格`);
    const plan = p.overlay?.plan ? planCells() : null;
    const filled = output && s.name === "应收账款" ? filledCells() : null;
    const cells: SheetCell[] = [];
    for (let r = box.r0; r <= box.r1; r++) {
      const gen = s.rowGen && r + 1 >= s.rowGen.fromRow && r + 1 <= s.rowGen.toRow ? s.rowGen.gen(r + 1) : null;
      for (let c = box.c0; c <= box.c1; c++) {
        const addr = cellAddr(c, r);
        const fc = gen ? gen[c] : s.cells[addr];
        const pc = plan && s.name === "应收账款" ? plan[addr] : undefined;
        const fl = filled?.[addr];
        if (!fc && !pc && !fl) continue;
        const base = fc ?? {};
        const value = fl ? fl.v : (base.v ?? null);
        const cell: SheetCell = {
          cell: addr,
          value,
          valueType: base.t ?? (value != null && base.fmt ? "number" : value == null ? "blank" : "string"),
          text: fl ? cellText({ ...base, t: base.fmt ? undefined : base.t, v: fl.v }) : cellText(base),
          numFmt: base.fmt ?? null,
          formula: base.f ?? null,
        };
        if (fl) cell.valueType = base.fmt ? "number" : "string";
        if (base.stale && !fl) cell.stale = true;
        if (base.style) cell.style = base.style;
        if (pc) cell.plan = { value: pc.value, stale: pc.stale, from: pc.from, overwrite: pc.overwrite, manual: pc.manual };
        if (fl && fl.from) cell.written = { from: fl.from };
        cells.push(cell);
      }
    }
    const view: SheetView = {
      sheet: s.name,
      sheets: sheets.map((x) => ({ name: x.name })),
      range: `${cellAddr(box.c0, box.r0)}:${cellAddr(box.c1, box.r1)}`,
      usedRange: s.usedRange,
      cells,
      merges: s.merges,
      rowHeights: s.rowHeights,
      colWidths: s.colWidths,
      freeze: s.freeze,
    };
    if ((p.overlay?.workpaper || p.overlay?.plan || output) && s.name === "应收账款" && this.regionStates.size) {
      view.overlay = {
        regions: WORKPAPER_REGIONS.map((r) => ({ ...r, state: this.regionStates.get(r.region) ?? "pending" })),
      };
    }
    return view;
  }

  private trace(cell: string): CellTrace {
    const addr = cell.includes("!") ? cell.slice(cell.lastIndexOf("!") + 1) : cell;
    const fl = filledCells()[addr];
    const pc = planCells()[addr];
    const from = fl?.from ?? pc?.from;
    if (!from) {
      return { cell, value: fl?.v ?? null, from: null, checks: [{ check: "formulas", passed: true, label: "公式重算一致" }] };
    }
    const [result, rowS] = from.split("#");
    const row = Number(rowS);
    const isAging = result === "R-014";
    return {
      cell,
      value: fl?.v ?? pc?.value ?? null,
      from: { result, row, column: isAging ? (addr.startsWith("B") ? "户数" : "金额") : addr.startsWith("A") ? "客户编码" : addr.startsWith("B") ? "客户名称" : "期末余额" },
      source: isAging
        ? { table: "D-002", file: "序时账2025.xlsx", sheet: "序时账", rows: [118, 2304, 5127], rowCount: [1289, 214, 61, 9][row - 1] }
        : { table: "D-002", file: "序时账2025.xlsx", sheet: "序时账", rows: [342, 1876, 40211], rowCount: [86, 64, 52, 41, 23][row - 1] },
      basis: isAging
        ? [
            { label: "账龄起算", value: "凭证日期", basis: "confirmed" },
            { label: "截止日", value: "2025-12-31（含）", basis: "template" },
            { label: "科目", value: "1122 应收账款", basis: "data" },
            { label: "单位", value: "元", basis: "template" },
          ]
        : [
            { label: "口径", value: "按客户汇总期末余额，取前五名", basis: "template" },
            { label: "截止日", value: "2025-12-31", basis: "template" },
            { label: "单位", value: "元", basis: "template" },
          ],
      checks: isAging
        ? [
            { check: "control", passed: true, label: "账龄合计 = 余额表 1122 期末（1,835,000.00）" },
            { check: "compare", passed: true, label: "双路复算一致（R-014 / R-015）" },
            { check: "readback", passed: true, label: "写入后回读一致" },
          ]
        : [
            { check: "control", passed: true, label: "按客户汇总合计 = 余额表 1122 期末" },
            { check: "compare", passed: true, label: "双路复算一致（R-011 / R-012）" },
            { check: "readback", passed: true, label: "写入后回读一致" },
          ],
    };
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
