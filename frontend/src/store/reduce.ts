// 按事件累积界面状态。纯函数：同一串事件不管分几次到、有没有重复，结果都一样（重连补取靠这个）。
import type {
  AuditEvent,
  Card,
  CardAnswer,
  CheckDetail,
  FileRef,
  McpStatus,
  RegionState,
  Stage,
  TaskStatus,
} from "../protocol/types";

export interface ToolCall {
  call: string;
  tool: string;
  system: string;
  argsSummary?: string;
  ok?: boolean;
  resultSummary?: string;
  refs?: string[];
  durationMs?: number;
  startedAt: string;
}

export type ChatItem =
  | { kind: "user"; id: string; message: string; text: string; files?: string[]; ts: string }
  | {
      kind: "assistant";
      id: string;
      message: string | null;
      text: string;
      refs: string[];
      done: boolean;
      tools: string[];
      ts: string;
    }
  | { kind: "card"; id: string; card: string; ts: string }
  | { kind: "progress"; id: string; task: string; ts: string }
  | { kind: "note"; id: string; text: string; task?: string; ts: string };

export interface NodeRun {
  node: string;
  kind: string;
  region?: string;
  outcome?: "passed" | "failed" | "skipped";
  refs?: string[];
  progress?: { message: string; done?: number; total?: number };
  startedAt: string;
  finishedAt?: string;
}

export interface CheckRun {
  check: string;
  passed: boolean;
  attempt: number;
  region?: string;
  detail?: CheckDetail;
  ts: string;
}

export interface RegionRun {
  region: string;
  state: RegionState;
  attempt: number;
  refs: string[];
  card: string | null;
  activity: string | null; // 正在做什么
  retries: { attempt: number; reason: string; node: string }[];
}

export interface TaskState {
  task: string;
  session: string;
  status: TaskStatus;
  stage: Stage | null;
  stages: Stage[];
  text: string;
  files: FileRef[];
  workpaperFile: string | null;
  workpaper: string | null; // W-
  plan: string | null; // FP-
  understood?: { period?: string; constraints?: string[]; scope?: Record<string, unknown> };
  regions: Record<string, RegionRun>;
  nodes: NodeRun[];
  checks: CheckRun[];
  outputs: { output: string; file: string; kind: string; checks?: { passed: number; failed: number } }[];
  userMessages: string[];
  blocked?: { where: string; why: string; suggest?: string };
  createdAt: string;
  lastEventAt: string;
  finishedAt?: string;
}

export interface CardState {
  card: Card;
  session: string;
  task?: string;
  answer?: CardAnswer;
  withdrawn?: boolean;
  openedAt: string;
}

export interface SessionState {
  session: string;
  lastSeq: number;
  items: ChatItem[];
  tasks: Record<string, TaskState>;
  cards: Record<string, CardState>;
  tools: Record<string, ToolCall>;
}

export interface EventState {
  sessions: Record<string, SessionState>;
  mcp: Record<string, McpStatus>;
}

export const emptyState: EventState = { sessions: {}, mcp: {} };

export function emptySession(session: string): SessionState {
  return { session, lastSeq: 0, items: [], tasks: {}, cards: {}, tools: {} };
}

const NODE_LABEL: Record<string, string> = {
  understand: "理解需求",
  workpaper_parse: "解析底稿结构",
  region_semantics: "识别区域含义",
  data_inspect: "识别资料表",
  field_semantics: "识别字段含义",
  data_import: "导入资料",
  basis: "整理口径",
  query: "计算",
  recompute: "双路复算",
  fill_compile: "编译写入计划",
  fill_apply: "写入并回读核对",
  notes: "生成说明文字",
};

export function nodeLabel(node: string) {
  return NODE_LABEL[node] ?? node;
}

export function reduceAll(state: EventState, events: AuditEvent[]): EventState {
  return events.reduce(reduce, state);
}

export function reduce(state: EventState, ev: AuditEvent): EventState {
  if (ev.type === "mcp.status") {
    return { ...state, mcp: { ...state.mcp, [ev.data.name]: ev.data } };
  }
  const sid = ev.session;
  if (!sid) return state;
  const prev = state.sessions[sid] ?? emptySession(sid);
  if (ev.seq != null && ev.seq <= prev.lastSeq) return state; // 重复或已补取过
  const s: SessionState = {
    ...prev,
    lastSeq: ev.seq ?? prev.lastSeq,
    items: prev.items,
    tasks: prev.tasks,
    cards: prev.cards,
    tools: prev.tools,
  };
  apply(s, ev);
  return { ...state, sessions: { ...state.sessions, [sid]: s } };
}

function patchTask(s: SessionState, id: string | undefined, ts: string, fn: (t: TaskState) => void) {
  if (!id) return;
  const prev = s.tasks[id];
  if (!prev) return;
  const t: TaskState = {
    ...prev,
    regions: { ...prev.regions },
    nodes: prev.nodes.slice(),
    checks: prev.checks.slice(),
    outputs: prev.outputs.slice(),
    stages: prev.stages.slice(),
    userMessages: prev.userMessages.slice(),
    lastEventAt: ts,
  };
  fn(t);
  s.tasks = { ...s.tasks, [id]: t };
}

function patchRegion(t: TaskState, region: string, fn: (r: RegionRun) => void) {
  const prev = t.regions[region] ?? {
    region,
    state: "pending" as RegionState,
    attempt: 1,
    refs: [],
    card: null,
    activity: null,
    retries: [],
  };
  const r = { ...prev, retries: prev.retries.slice() };
  fn(r);
  t.regions[region] = r;
}

function lastAssistant(s: SessionState): number {
  for (let i = s.items.length - 1; i >= 0; i--) {
    const it = s.items[i];
    if (it.kind === "assistant") return it.done ? -1 : i;
    if (it.kind === "user") return -1;
  }
  return -1;
}

function upsertAssistant(s: SessionState, ts: string, message: string | null, fn: (a: Extract<ChatItem, { kind: "assistant" }>) => void) {
  let idx = message ? s.items.findIndex((i) => i.kind === "assistant" && i.message === message) : -1;
  if (idx < 0) idx = lastAssistant(s);
  const items = s.items.slice();
  if (idx < 0) {
    items.push({ kind: "assistant", id: `a-${message ?? ts}-${items.length}`, message, text: "", refs: [], done: false, tools: [], ts });
    idx = items.length - 1;
  }
  const a = { ...(items[idx] as Extract<ChatItem, { kind: "assistant" }>) };
  a.tools = a.tools.slice();
  if (message && !a.message) a.message = message;
  fn(a);
  items[idx] = a;
  s.items = items;
}

function apply(s: SessionState, ev: AuditEvent) {
  const ts = ev.ts;
  switch (ev.type) {
    case "message.created":
      s.items = [...s.items, { kind: "user", id: `u-${ev.data.message}`, message: ev.data.message, text: ev.data.text, files: ev.data.files, ts }];
      return;
    case "message.delta":
      upsertAssistant(s, ts, ev.data.message, (a) => {
        a.text += ev.data.text;
      });
      return;
    case "message.completed":
      upsertAssistant(s, ts, ev.data.message, (a) => {
        a.text = ev.data.text;
        a.refs = ev.data.refs ?? [];
        a.done = true;
      });
      return;
    case "tool.started":
      s.tools = { ...s.tools, [ev.data.call]: { ...ev.data, startedAt: ts } };
      if (!ev.task) {
        upsertAssistant(s, ts, null, (a) => {
          a.tools.push(ev.data.call);
        });
      }
      return;
    case "tool.finished": {
      const prev = s.tools[ev.data.call];
      if (prev) s.tools = { ...s.tools, [ev.data.call]: { ...prev, ...ev.data } };
      return;
    }
    case "task.created": {
      const id = ev.task!;
      if (s.tasks[id]) return;
      const wp = ev.data.files.find((f) => /底稿/.test(f.name)) ?? ev.data.files[0];
      s.tasks = {
        ...s.tasks,
        [id]: {
          task: id,
          session: s.session,
          status: "running",
          stage: null,
          stages: [],
          text: ev.data.text,
          files: ev.data.files,
          workpaperFile: wp?.file ?? null,
          workpaper: null,
          plan: null,
          regions: {},
          nodes: [],
          checks: [],
          outputs: [],
          userMessages: [],
          createdAt: ts,
          lastEventAt: ts,
        },
      };
      s.items = [...s.items, { kind: "progress", id: `p-${id}`, task: id, ts }];
      return;
    }
    case "task.understood":
      patchTask(s, ev.task, ts, (t) => {
        t.understood = { period: ev.data.period, constraints: ev.data.constraints, scope: ev.data.scope };
        const d = ev.data.deliverables.find((x) => x.kind === "workpaper");
        if (d) t.workpaperFile = d.file;
      });
      return;
    case "stage.changed":
      patchTask(s, ev.task, ts, (t) => {
        t.stage = ev.data.stage;
        if (!t.stages.includes(ev.data.stage)) t.stages.push(ev.data.stage);
      });
      return;
    case "node.started":
      patchTask(s, ev.task, ts, (t) => {
        t.nodes.push({ node: ev.data.node, kind: ev.data.kind, region: ev.data.region, startedAt: ts });
        if (ev.data.region) patchRegion(t, ev.data.region, (r) => (r.activity = nodeLabel(ev.data.node)));
      });
      return;
    case "node.progress":
      patchTask(s, ev.task, ts, (t) => {
        const run = findOpenNode(t, ev.data.node, ev.data.region);
        if (run) {
          const i = t.nodes.indexOf(run);
          t.nodes[i] = { ...run, progress: { message: ev.data.message, done: ev.data.done, total: ev.data.total } };
        }
        if (ev.data.region) patchRegion(t, ev.data.region, (r) => (r.activity = ev.data.message));
      });
      return;
    case "node.finished":
      patchTask(s, ev.task, ts, (t) => {
        const run = findOpenNode(t, ev.data.node, ev.data.region);
        if (run) {
          const i = t.nodes.indexOf(run);
          t.nodes[i] = { ...run, outcome: ev.data.outcome, refs: ev.data.refs, finishedAt: ts };
        }
        for (const ref of ev.data.refs ?? []) {
          if (ref.startsWith("W-")) t.workpaper = ref;
          if (ref.startsWith("FP-")) t.plan = ref;
        }
        if (ev.data.region) patchRegion(t, ev.data.region, (r) => (r.activity = null));
      });
      return;
    case "check.result":
      patchTask(s, ev.task, ts, (t) => {
        t.checks.push({ check: ev.data.check, passed: ev.data.passed, attempt: ev.data.attempt ?? 1, region: ev.data.region, detail: ev.data.detail, ts });
      });
      return;
    case "node.retry":
      patchTask(s, ev.task, ts, (t) => {
        if (ev.data.region)
          patchRegion(t, ev.data.region, (r) => {
            r.attempt = ev.data.attempt;
            r.retries.push({ attempt: ev.data.attempt, reason: ev.data.reason, node: ev.data.node });
          });
      });
      return;
    case "region.state":
      patchTask(s, ev.task, ts, (t) => {
        patchRegion(t, ev.data.region, (r) => {
          r.state = ev.data.state;
          if (ev.data.attempt) r.attempt = ev.data.attempt;
          if (ev.data.refs) r.refs = ev.data.refs;
          r.card = ev.data.state === "awaiting_confirmation" ? (ev.data.card ?? r.card) : null;
          if (ev.data.state !== "computing" && ev.data.state !== "checking" && ev.data.state !== "understanding") r.activity = null;
        });
      });
      return;
    case "card.opened": {
      const card = ev.data;
      if (s.cards[card.card]) return;
      s.cards = { ...s.cards, [card.card]: { card, session: s.session, task: card.task ?? ev.task, openedAt: ts } };
      s.items = [...s.items, { kind: "card", id: `c-${card.card}`, card: card.card, ts }];
      return;
    }
    case "card.closed": {
      const prev = s.cards[ev.data.card];
      if (!prev) return;
      s.cards = { ...s.cards, [ev.data.card]: { ...prev, answer: ev.data.answer, withdrawn: ev.data.withdrawn } };
      return;
    }
    case "user.message":
      patchTask(s, ev.task, ts, (t) => t.userMessages.push(ev.data.text));
      s.items = [...s.items, { kind: "note", id: `n-${ev.seq}`, text: `已补充给任务：${ev.data.text}`, task: ev.task, ts }];
      return;
    case "task.rerun":
      patchTask(s, ev.task, ts, (t) => {
        t.status = "running";
        for (const r of ev.data.scope.regions ?? Object.keys(t.regions)) patchRegion(t, r, (x) => (x.state = "pending"));
      });
      s.items = [...s.items, { kind: "note", id: `n-${ev.seq}`, text: `重跑${ev.data.note ? `：${ev.data.note}` : ""}`, task: ev.task, ts }];
      return;
    case "output.ready":
      patchTask(s, ev.task, ts, (t) => t.outputs.push({ output: ev.data.output, file: ev.data.file, kind: ev.data.kind, checks: ev.data.checks }));
      return;
    case "task.blocked":
      patchTask(s, ev.task, ts, (t) => {
        t.status = "blocked";
        t.blocked = ev.data;
      });
      return;
    case "task.finished":
      patchTask(s, ev.task, ts, (t) => {
        t.status = ev.data.status;
        t.finishedAt = ts;
        for (const r of Object.values(t.regions)) r.activity = null;
      });
      return;
  }
}

function findOpenNode(t: TaskState, node: string | undefined, region: string | undefined): NodeRun | undefined {
  for (let i = t.nodes.length - 1; i >= 0; i--) {
    const n = t.nodes[i];
    if ((!node || n.node === node) && n.region === region && !n.finishedAt) return n;
  }
  return undefined;
}

/** 卡片是否还在等用户 */
export function isOpen(c: CardState) {
  return !c.answer && !c.withdrawn;
}

export function openCards(s: SessionState | undefined): CardState[] {
  if (!s) return [];
  return Object.values(s.cards).filter(isOpen);
}
