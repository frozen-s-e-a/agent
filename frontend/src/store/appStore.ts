// 应用状态：事件累积出来的部分（reduce.ts）+ 界面自己的部分（打开的标签、对话显示方式等）。
// 订阅宿主事件；断线重连后按每个对话的 lastSeq 补取（session.events）。
import { useSyncExternalStore } from "react";
import type { HostClient } from "../host/client";
import type { AuditEvent, Card, Project, SessionSummary } from "../protocol/types";
import type { SheetMode } from "../components/sheet/paint";
import { emptyState, isOpen, reduce, reduceAll, type EventState } from "./reduce";

export type ChatMode = "float" | "left" | "right" | "full";

export type WorkspaceTab =
  | {
      id: string;
      kind: "sheet";
      title: string;
      file: string; // F- 编号、O- 编号或产出路径
      task?: string;
      sheet?: string;
      mode: SheetMode;
      showFormulas: boolean;
      selected: { row: number; col: number } | null;
      focusRegion: string | null;
      /** 变了就滚到 focusRegion */
      focusNonce: number;
      scrollTo: { row: number; col: number; nonce: number } | null;
    }
  | { id: string; kind: "table"; title: string; table: string; locate: number | null; nonce: number };

/** 底稿理解卡确认前暂存的修改（在表上拖区域边界、标人工格、新增区域） */
export interface UnderstandingDraft {
  uncertain: Record<string, number | string>;
  regions: Record<string, { range?: string; type?: string }>;
  added: { range: string; type: string; purpose?: string }[];
  manualAdd: string[];
  manualRemove: string[];
  history: Omit<UnderstandingDraft, "history">[];
}

export function draftChanges(d: UnderstandingDraft | undefined): number {
  if (!d) return 0;
  return Object.keys(d.regions).length + d.added.length + d.manualAdd.length + d.manualRemove.length;
}

export interface UiState {
  project: string | null;
  projects: Project[];
  session: string | null;
  sessions: SessionSummary[];
  tabs: WorkspaceTab[];
  activeTab: string | null;
  chatMode: ChatMode;
  dockWidth: number;
  historyOpen: boolean;
  /** 铺满时底稿收起，点标签或"在表上查看"重新展开 */
  collapsed: boolean;
  theme: "light" | "dark";
  page: "main" | "settings";
  settingsDirty: boolean;
  leftTab: "sessions" | "files" | "outputs";
  /** 正在切换到的项目（宿主换进程，约 2 秒） */
  switching: string | null;
  /** 产出列表变了（对话产出就绪），左栏据此重新取 outputs.list */
  outputsVersion: number;
  /** 项目资料变了（加了文件） */
  filesVersion: number;
  connected: boolean;
  modelReady: boolean | null; // null：还没查
  attach: string[]; // 待随下一条消息发送的 F- 编号
  focusCard: string | null;
  drafts: Record<string, UnderstandingDraft>;
  /** 校验没通过、退回理解卡时标在表上的格（"行,列"） */
  draftErrors: Record<string, string[]>;
}

export interface AppSnapshot {
  ev: EventState;
  ui: UiState;
}

const LS = "audit-ui/v1";

function loadPrefs(): Partial<UiState> {
  try {
    return JSON.parse(localStorage.getItem(LS) ?? "{}");
  } catch {
    return {};
  }
}

function savePrefs(ui: UiState) {
  try {
    localStorage.setItem(LS, JSON.stringify({ chatMode: ui.chatMode, dockWidth: ui.dockWidth, theme: ui.theme }));
  } catch {
    /* 浏览器存储不可用时不记 */
  }
}

export class AppStore {
  private snap: AppSnapshot;
  private listeners = new Set<() => void>();
  private catchingUp = false;

  constructor(readonly host: HostClient) {
    const prefs = loadPrefs();
    this.snap = {
      ev: emptyState,
      ui: {
        project: null,
        projects: [],
        session: null,
        sessions: [],
        tabs: [],
        activeTab: null,
        chatMode: prefs.chatMode ?? "float",
        dockWidth: prefs.dockWidth ?? 420,
        historyOpen: false,
        collapsed: false,
        theme: prefs.theme ?? "light",
        page: "main",
        settingsDirty: false,
        leftTab: "sessions",
        switching: null,
        outputsVersion: 0,
        filesVersion: 0,
        connected: true,
        modelReady: null,
        attach: [],
        focusCard: null,
        drafts: {},
        draftErrors: {},
      },
    };
    host.subscribe((e) => this.onEvent(e));
    host.onConnectionChange?.((c) => {
      this.setUi({ connected: c });
      if (c) void this.catchUp();
    });
  }

  get = () => this.snap;

  subscribeStore = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private emit() {
    for (const l of this.listeners) l();
  }

  setUi(patch: Partial<UiState> | ((ui: UiState) => Partial<UiState>)) {
    const p = typeof patch === "function" ? patch(this.snap.ui) : patch;
    const ui = { ...this.snap.ui, ...p };
    this.snap = { ...this.snap, ui };
    if ("chatMode" in p || "dockWidth" in p || "theme" in p) savePrefs(ui);
    this.emit();
  }

  private onEvent(e: AuditEvent) {
    const before = this.snap.ev;
    const ev = reduce(before, e);
    if (ev === before) return;
    this.snap = { ...this.snap, ev };
    this.react(e);
    this.emit();
  }

  /** 补取断线期间漏掉的事件 */
  async catchUp() {
    if (this.catchingUp) return;
    this.catchingUp = true;
    try {
      for (const s of Object.values(this.snap.ev.sessions)) {
        const { events } = await this.host.request("session.events", { session: s.session, after: s.lastSeq });
        // 逐条走 onEvent：漏掉的卡片、成果也要触发界面联动（切视图、开成果）
        for (const e of events) this.onEvent(e);
      }
      void this.refreshSessions();
    } finally {
      this.catchingUp = false;
    }
  }

  /** 事件带来的界面联动：开底稿、切视图（设计方案"切换规则"） */
  private react(e: AuditEvent) {
    if (e.session !== this.snap.ui.session) {
      if (e.type === "card.opened") {
        void this.refreshSessions();
        notify(e.data.title);
      }
      return;
    }
    const task = e.task ? this.snap.ev.sessions[e.session!]?.tasks[e.task] : undefined;
    switch (e.type) {
      case "task.created":
        if (task?.workpaperFile) this.openSheet(task.workpaperFile, { task: task.task, mode: "regions" });
        void this.refreshSessions();
        break;
      case "card.opened": {
        const c = e.data;
        this.setUi({ focusCard: c.card });
        if (document.hidden) notify(c.title);
        if (task?.workpaperFile) {
          // 卡片在表格右侧，表格滚到卡片说的第一个区域
          if (c.kind === "workpaper_understanding") this.patchSheetTab(task.workpaperFile, { mode: "regions", focusRegion: c.body.regions[0]?.region ?? null });
          if (c.kind === "write_confirmation") this.patchSheetTab(task.workpaperFile, { mode: "plan", focusRegion: c.body.regions[0]?.region ?? null });
          if (c.kind === "basis_confirmation") {
            const region = c.body.questions[0]?.region;
            this.patchSheetTab(task.workpaperFile, { mode: "regions", focusRegion: region ?? null });
          }
          if (c.kind === "discrepancy") this.patchSheetTab(task.workpaperFile, { mode: "regions", focusRegion: c.body.region });
        }
        break;
      }
      case "output.ready":
        this.fileNames.set(e.data.output, e.data.file.split(/[\\/]/).pop()!);
        this.setUi((u) => ({ outputsVersion: u.outputsVersion + 1 }));
        if (e.data.kind === "workpaper" && task?.workpaperFile) {
          // 成果就绪：底稿标签换成成果文件，"已填"视图
          const tab = this.findSheetTab(task.workpaperFile);
          if (tab) this.updateTab(tab.id, { file: e.data.output, mode: "filled", title: e.data.file.split("/").pop()! });
        }
        break;
      case "task.finished":
      case "card.closed":
        void this.refreshSessions();
        break;
    }
  }

  // ---------- 理解卡草稿 ----------

  updateDraft(card: string, fn: (d: UnderstandingDraft) => void) {
    this.setUi((ui) => {
      const prev = ui.drafts[card] ?? { uncertain: {}, regions: {}, added: [], manualAdd: [], manualRemove: [], history: [] };
      const { history, ...snapshot } = prev;
      const next: UnderstandingDraft = {
        uncertain: { ...prev.uncertain },
        regions: { ...prev.regions },
        added: prev.added.slice(),
        manualAdd: prev.manualAdd.slice(),
        manualRemove: prev.manualRemove.slice(),
        history: [...history, structuredClone(snapshot)],
      };
      fn(next);
      return { drafts: { ...ui.drafts, [card]: next } };
    });
  }

  undoDraft(card: string) {
    this.setUi((ui) => {
      const d = ui.drafts[card];
      if (!d?.history.length) return {};
      const prev = d.history[d.history.length - 1];
      return { drafts: { ...ui.drafts, [card]: { ...structuredClone(prev), history: d.history.slice(0, -1) } } };
    });
  }

  /** 当前对话里等确认的底稿理解卡 */
  openUnderstandingCard(): string | null {
    const s = this.snap.ui.session ? this.snap.ev.sessions[this.snap.ui.session] : undefined;
    if (!s) return null;
    const c = Object.values(s.cards).find((c) => c.card.kind === "workpaper_understanding" && !c.answer && !c.withdrawn);
    return c?.card.card ?? null;
  }

  // ---------- 工作区标签 ----------

  findSheetTab(file: string) {
    return this.snap.ui.tabs.find((t) => t.kind === "sheet" && t.file === file) as Extract<WorkspaceTab, { kind: "sheet" }> | undefined;
  }

  openSheet(file: string, opts: { task?: string; mode?: SheetMode; title?: string; sheet?: string; select?: { row: number; col: number }; focusRegion?: string | null } = {}) {
    let tab = this.findSheetTab(file);
    if (!tab) {
      // 成果就绪后标签换成了成果文件，编号还是底稿的；同一份底稿再开一个任务时另起编号
      let id = `sheet:${file}`;
      for (let n = 2; this.snap.ui.tabs.some((t) => t.id === id); n++) id = `sheet:${file}#${n}`;
      tab = {
        id,
        kind: "sheet",
        title: opts.title ?? this.fileName(file),
        file,
        task: opts.task,
        sheet: opts.sheet,
        mode: opts.mode ?? "raw",
        showFormulas: false,
        selected: null,
        focusRegion: null,
        focusNonce: 0,
        scrollTo: null,
      };
      this.setUi((ui) => ({ tabs: [...ui.tabs, tab!] }));
    }
    const patch: Partial<Extract<WorkspaceTab, { kind: "sheet" }>> = {};
    if (opts.mode) patch.mode = opts.mode;
    if (opts.sheet) patch.sheet = opts.sheet;
    if (opts.focusRegion !== undefined) {
      patch.focusRegion = opts.focusRegion;
      patch.focusNonce = Date.now();
    }
    if (opts.select) {
      patch.selected = opts.select;
      patch.scrollTo = { ...opts.select, nonce: Date.now() };
    }
    this.updateTab(tab.id, patch);
    this.setUi({ activeTab: tab.id, collapsed: false });
  }

  openTable(table: string, locate: number | null = null, title?: string) {
    const id = `table:${table}`;
    if (!this.snap.ui.tabs.some((t) => t.id === id)) {
      this.setUi((ui) => ({ tabs: [...ui.tabs, { id, kind: "table", title: title ?? table, table, locate, nonce: Date.now() }] }));
    } else this.updateTab(id, { locate, nonce: Date.now() } as Partial<WorkspaceTab>);
    this.setUi({ activeTab: id, collapsed: false });
  }

  patchSheetTab(file: string, patch: Partial<Extract<WorkspaceTab, { kind: "sheet" }>>) {
    const tab = this.findSheetTab(file);
    // 换了定位区域要带新的 nonce，表格才会滚过去
    if (tab) this.updateTab(tab.id, patch.focusRegion ? { focusNonce: Date.now(), ...patch } : patch);
  }

  updateTab(id: string, patch: Partial<WorkspaceTab>) {
    this.setUi((ui) => ({ tabs: ui.tabs.map((t) => (t.id === id ? ({ ...t, ...patch } as WorkspaceTab) : t)) }));
  }

  closeTab(id: string) {
    this.setUi((ui) => {
      const i = ui.tabs.findIndex((t) => t.id === id);
      const tabs = ui.tabs.filter((t) => t.id !== id);
      const activeTab = ui.activeTab === id ? (tabs[Math.max(0, i - 1)]?.id ?? null) : ui.activeTab;
      return { tabs, activeTab };
    });
  }

  fileName(file: string): string {
    const known: Record<string, string> = {
      "F-9a1be04c77d2": "应收账款底稿.xlsx",
      "F-1c44d0e2a7b9": "科目余额表2025.xlsx",
      "F-6e02f5a1c3d8": "序时账2025.xlsx",
    };
    if (known[file] ?? this.fileNames.get(file)) return known[file] ?? this.fileNames.get(file)!;
    if (file.startsWith("O-"))
      for (const s of Object.values(this.snap.ev.sessions))
        for (const t of Object.values(s.tasks)) {
          const o = t.outputs.find((x) => x.output === file);
          if (o) return o.file.split("/").pop()!;
        }
    return file.split("/").pop() ?? file;
  }
  fileNames = new Map<string, string>();

  /** 卡片或回复里引用的编号：在工作区打开并定位（切换规则第 2 条） */
  openRef(ref: string, ctx: { task?: string; session?: string } = {}) {
    const [id, row] = ref.split("#");
    if (/^[DR]-/.test(id)) return this.openTable(id, row ? Number(row) : null);
    if (/^W-/.test(id)) {
      const t = this.findTaskOfWorkpaper(ctx.session, ctx.task);
      if (t?.workpaperFile) this.openSheet(t.workpaperFile, { mode: "regions", focusRegion: row ? ref : null, task: t.task });
      return;
    }
    if (/^F-|^O-|\.xlsx$/.test(id)) return this.openSheet(id);
  }

  findTaskOfWorkpaper(session?: string, task?: string) {
    const s = this.snap.ev.sessions[session ?? this.snap.ui.session ?? ""];
    if (!s) return undefined;
    return task ? s.tasks[task] : Object.values(s.tasks).at(-1);
  }

  /** 定位到区域：打开底稿、高亮区域、滚过去 */
  focusRegion(region: string, task?: string) {
    const t = this.findTaskOfWorkpaper(undefined, task);
    if (!t?.workpaperFile) return;
    const tab = this.findSheetTab(t.workpaperFile) ?? this.findSheetTabByTask(t.task);
    const file = tab?.file ?? t.workpaperFile;
    this.openSheet(file, { task: t.task, focusRegion: region });
    this.patchSheetTab(file, { focusNonce: Date.now() });
  }

  findSheetTabByTask(task: string) {
    return this.snap.ui.tabs.find((t) => t.kind === "sheet" && t.task === task) as Extract<WorkspaceTab, { kind: "sheet" }> | undefined;
  }

  // ---------- 项目、对话 ----------

  async loadProjects() {
    void this.loadMcp();
    const { projects } = await this.host.request("project.list", {});
    this.setUi({ projects, project: this.snap.ui.project ?? projects[0]?.project ?? null });
    await this.refreshSessions();
  }

  /** 打开项目（真宿主要为它启动 Harness），再打开最近的对话；没有对话时新建一个 */
  /** 外部 MCP 服务的当前状态（之后的变化由 mcp.status 事件推送） */
  async loadMcp() {
    const { servers } = await this.host.request("mcp.list", {});
    const events = servers.map((s): AuditEvent => ({
      v: "audit-events/1",
      ts: new Date().toISOString(),
      type: "mcp.status",
      data: { name: s.name, state: s.state, error: s.error, toolCount: s.tools.filter((t) => t.enabled !== false).length },
    }));
    this.snap = { ...this.snap, ev: reduceAll(this.snap.ev, events) };
    this.emit();
  }

  async switchProject(project: string, force = false) {
    if (project === this.snap.ui.project && !force) return;
    this.setUi({ switching: project, session: null, sessions: [], tabs: [], activeTab: null, page: "main" });
    try {
      await this.host.request("project.open", { project });
      this.setUi({ project });
      await this.refreshSessions();
      const { files } = await this.host.request("files.list", { project });
      for (const f of files) this.fileNames.set(f.file, f.name);
    } finally {
      this.setUi({ switching: null });
    }
    const latest = this.snap.ui.sessions[0];
    if (latest) await this.openSession(latest.session);
    else await this.newSession();
  }

  async refreshSessions() {
    const project = this.snap.ui.project;
    if (!project) return;
    try {
      const { sessions } = await this.host.request("session.list", { project });
      this.setUi({ sessions });
    } catch (e) {
      // 断线时不刷，重连补取后再刷
      if ((e as { code?: string }).code !== "ENV_DISCONNECTED") throw e;
    }
  }

  async openSession(session: string) {
    this.setUi({ session, tabs: [], activeTab: null, historyOpen: false, focusCard: null, attach: [] });
    const known = this.snap.ev.sessions[session];
    const { events } = await this.host.request("session.events", { session, after: known?.lastSeq ?? 0 });
    for (const e of events) if (e.type === "output.ready") this.fileNames.set(e.data.output, e.data.file.split(/[\\/]/).pop()!);
    this.snap = { ...this.snap, ev: reduceAll(this.snap.ev, events) };
    this.emit();
    // 重新打开对话时，恢复进行中任务的底稿
    const s = this.snap.ev.sessions[session];
    const t = s && Object.values(s.tasks).at(-1);
    if (t?.workpaperFile) {
      const out = t.outputs.find((o) => o.kind === "workpaper");
      const writing = Object.values(s.cards).some((c) => isOpen(c) && c.card.kind === "write_confirmation" && c.card.task === t.task);
      this.openSheet(out?.output ?? t.workpaperFile, { task: t.task, mode: out ? "filled" : writing && t.plan ? "plan" : "regions" });
    }
  }

  async newSession() {
    const cur = this.snap.ui.session && this.snap.ev.sessions[this.snap.ui.session];
    // 当前对话还是空的就不再新建（设计方案：避免堆积空对话）
    if (this.snap.ui.session && (!cur || cur.items.length === 0)) return;
    const { session } = await this.host.request("session.create", { project: this.snap.ui.project! });
    await this.refreshSessions();
    await this.openSession(session);
  }

  /** 浏览器里选或拖进来的文件加入项目，并附到下一条消息 */
  async addBrowserFiles(files: File[]) {
    const project = this.snap.ui.project;
    if (!project || !files.length) return;
    const added = this.host.addFiles
      ? await this.host.addFiles(project, files)
      : (await this.host.request("files.add", { project, paths: files.map((f) => f.name) })).files;
    for (const f of added) this.fileNames.set(f.file, f.name);
    this.setUi((u) => ({ attach: [...new Set([...u.attach, ...added.map((f) => f.file)])], filesVersion: u.filesVersion + 1 }));
  }

  async send(text: string) {
    const session = this.snap.ui.session;
    if (!session) return;
    const files = this.snap.ui.attach;
    this.setUi({ attach: [] });
    await this.host.request("message.send", { session, text, files: files.length ? files : undefined });
  }

  async answer(card: Card, action: string, edits?: Record<string, unknown>, note?: string) {
    await this.host.request("card.answer", { card: card.card, action, edits: edits ?? {}, note: note ?? "" });
  }
}

function notify(title: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
      new Notification("审计助手：有卡片等你处理", { body: title });
    }
  } catch {
    /* 没有通知权限时忽略 */
  }
}

export function useStore<T>(store: AppStore, sel: (s: AppSnapshot) => T): T {
  return useSyncExternalStore(store.subscribeStore, () => sel(store.get()));
}
