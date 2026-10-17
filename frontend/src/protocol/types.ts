// 接口约定-20261017 的前端侧类型：流程事件 audit-events/1、前端命令 audit-app/1、界面卡片 audit-cards/1。

export type Decimal = string; // 十进制字符串，前端不转浮点数计算

export type Basis = "user" | "confirmed" | "template" | "profile" | "data" | "inferred";

export type Stage =
  | "understand"
  | "workpaper"
  | "data"
  | "basis"
  | "confirm"
  | "compute"
  | "fill"
  | "notes"
  | "review";

export type RegionState =
  | "pending"
  | "understanding"
  | "awaiting_confirmation"
  | "computing"
  | "checking"
  | "checked"
  | "written"
  | "manual"
  | "failed"
  | "skipped";

export type TaskStatus = "running" | "completed" | "partial" | "cancelled" | "failed" | "blocked";

// ---------- 4.1 事件信封 ----------

export interface EventEnvelope<T extends string = string, D = unknown> {
  v: "audit-events/1";
  session?: string; // mcp.status 没有
  task?: string;
  seq?: number; // mcp.status 没有
  ts: string;
  type: T;
  data: D;
}

export interface FileRef {
  file: string;
  name: string;
}

export type AuditEvent =
  | EventEnvelope<"message.created", { message: string; text: string; files?: string[] }>
  | EventEnvelope<"message.delta", { message: string; text: string }>
  | EventEnvelope<"message.completed", { message: string; text: string; refs?: string[] }>
  | EventEnvelope<
      "tool.started",
      { call: string; tool: string; system: string; argsSummary?: string; message?: string }
    >
  | EventEnvelope<
      "tool.finished",
      { call: string; ok: boolean; resultSummary?: string; refs?: string[]; durationMs?: number }
    >
  | EventEnvelope<
      "task.created",
      { message?: string; text: string; files: FileRef[]; project?: string; deliverables?: Deliverable[] }
    >
  | EventEnvelope<
      "task.understood",
      {
        deliverables: Deliverable[];
        period?: string;
        scope?: Record<string, unknown>;
        constraints?: string[];
        subtasks?: unknown[];
      }
    >
  | EventEnvelope<"stage.changed", { stage: Stage }>
  | EventEnvelope<"node.started", { node: string; kind: "code" | "model" | "human" | "check"; region?: string }>
  | EventEnvelope<"node.progress", { node?: string; message: string; done?: number; total?: number; region?: string }>
  | EventEnvelope<
      "node.finished",
      { node: string; outcome: "passed" | "failed" | "skipped"; refs?: string[]; region?: string }
    >
  | EventEnvelope<"check.result", { check: string; passed: boolean; attempt?: number; detail?: CheckDetail; region?: string }>
  | EventEnvelope<"node.retry", { node: string; attempt: number; reason: string; region?: string }>
  | EventEnvelope<"card.opened", Card>
  | EventEnvelope<"card.closed", { card: string; answer?: CardAnswer; withdrawn?: boolean }>
  | EventEnvelope<
      "region.state",
      { region: string; state: RegionState; card?: string; attempt?: number; refs?: string[] }
    >
  | EventEnvelope<"user.message", { text: string; seq?: number; regions?: string[] }>
  | EventEnvelope<
      "task.rerun",
      { scope: { regions?: string[]; fromStage?: Stage }; note?: string; voided?: string[] }
    >
  | EventEnvelope<
      "output.ready",
      { output: string; file: string; kind: string; checks?: { passed: number; failed: number } }
    >
  | EventEnvelope<"task.blocked", { where: string; why: string; suggest?: string }>
  | EventEnvelope<
      "task.finished",
      { status: TaskStatus; deliverables?: (Deliverable & { status?: string; output?: string })[] }
    >
  | EventEnvelope<"mcp.status", McpStatus>;

export type AuditEventType = AuditEvent["type"];
export type EventOf<T extends AuditEventType> = Extract<AuditEvent, { type: T }>;

export interface Deliverable {
  kind: string;
  file: string;
  status?: string;
}

export interface CheckDetail {
  left?: { label: string; value: Decimal; ref?: string } | string;
  right?: { label: string; value: Decimal; ref?: string } | string;
  diff?: Decimal;
  explainedBy?: unknown[];
  items?: string[];
  [k: string]: unknown;
}

// ---------- 4.4 任务快照 ----------

export interface RegionSnapshot {
  region: string;
  state: RegionState;
  attempt?: number;
  refs?: string[];
  card?: string | null;
}

export interface TaskSnapshot {
  task: string;
  status: TaskStatus;
  stage: Stage;
  lastSeq: number;
  deliverables: Deliverable[];
  regions: RegionSnapshot[];
  openCards: string[];
  outputs: string[];
}

// ---------- 第五节 卡片 ----------

export type CardKind =
  | "workpaper_understanding"
  | "basis_confirmation"
  | "discrepancy"
  | "write_confirmation"
  | "question"
  | "result_summary"
  | "action_confirmation";

export interface CardBase<K extends CardKind, B> {
  card: string;
  kind: K;
  task?: string;
  session?: string;
  title: string;
  blocking: boolean;
  body: B;
  actions: string[];
  defaultAction?: string;
}

export interface UnderstandingColumn {
  col: string;
  measure: string;
  period?: string;
  unit?: string;
  direction?: "debit" | "credit";
  basis?: Basis;
  basisRef?: string;
  confidence?: "high" | "medium" | "low";
}

export interface UncertainItem {
  item: string;
  options: string[];
  suggest?: number;
  why?: string;
}

export interface UnderstandingRegion {
  region: string;
  range: string;
  type?: string;
  purpose: string;
  columns: UnderstandingColumn[];
  rows?: { row: number; text: string; formula?: boolean }[];
  manual?: string[];
  uncertain?: UncertainItem[];
}

export interface UnderstandingBody {
  workpaper: string;
  template?: { fingerprint: string; known: boolean };
  regions: UnderstandingRegion[];
}

export interface Question {
  id: string;
  region?: string;
  text: string;
  options: { label: string; impact?: string }[];
  suggest?: number;
  allowText?: boolean;
}

export interface DiscrepancyBody {
  region: string;
  check: string;
  left: { label: string; value: Decimal; ref?: string };
  right: { label: string; value: Decimal; ref?: string };
  diff: Decimal;
  threshold?: Decimal;
  candidates?: { label: string; ref?: string }[];
  actions?: string[];
}

export interface WriteConfirmationBody {
  plan: string;
  target: string;
  output: string;
  regions: { region: string; cells: number; sources: string[]; basis: string }[];
  manual: string[];
  overwrites: string[];
}

export interface ResultSummaryBody {
  outputs: { output?: string; file: string; kind: string }[];
  checks: { passed: number; failed: number; retried?: number };
  manual: number;
  notes?: { section: string; text: string; status: "suggested" | "confirmed" }[];
  computedBy?: string;
  suggestedBy?: string[];
}

export interface ActionConfirmationBody {
  system: string;
  operation: string;
  /** 取不到时为 null */
  target: string | null;
  argsSummary: { label: string; value: string }[];
  /** 取不到时为 null，按不可撤销处理 */
  reversible: boolean | null;
  reverseHow?: string | null;
  tool: string;
  call: string;
}

export type Card =
  | CardBase<"workpaper_understanding", UnderstandingBody>
  | CardBase<"basis_confirmation", { questions: Question[] }>
  | CardBase<"discrepancy", DiscrepancyBody>
  | CardBase<"write_confirmation", WriteConfirmationBody>
  | CardBase<"question", { questions: Question[] }>
  | CardBase<"result_summary", ResultSummaryBody>
  | CardBase<"action_confirmation", ActionConfirmationBody>;

export interface UnderstandingEdits {
  uncertain?: Record<string, number | string>;
  regions?: (
    | { region: string; type?: string; range?: string; columns?: UnderstandingColumn[] }
    | { add: { range: string; type: string; purpose?: string } }
  )[];
  manual?: { add?: string[]; remove?: string[] };
}

export interface CardAnswer {
  card?: string;
  action: string;
  edits?: Record<string, unknown> | UnderstandingEdits;
  note?: string;
}

// ---------- 4.5 工作表网格 ----------

export interface SheetCell {
  cell: string; // 不带工作表名，例如 "C7"
  value: string | null;
  valueType?: "number" | "string" | "boolean" | "date" | "error" | "blank";
  text?: string;
  numFmt?: string | null;
  formula?: string | null;
  stale?: boolean;
  array?: string;
  plan?: { value?: string; text?: string; stale?: boolean; from?: string; overwrite?: boolean; manual?: boolean };
  /** 打开产出文件时，由任务写入的格（overlay.output） */
  written?: { from: string; task?: string };
  /** 只在和默认不同时出现；fill 为 #RRGGBB */
  style?: { bold?: boolean; italic?: boolean; align?: "left" | "center" | "right"; wrap?: boolean; fill?: string };
}

export interface SheetRegionOverlay {
  region: string;
  range: string; // 不带工作表名
  type?: string;
  state: RegionState;
  purpose?: string;
  headerRows?: number[];
  totals?: number[];
  manual?: string[];
}

export interface SheetView {
  sheet: string;
  sheets?: { name: string; hidden?: boolean }[];
  range: string;
  usedRange?: string;
  cells: SheetCell[];
  merges: string[];
  rowHeights: Record<string, number>;
  colWidths: Record<string, number>;
  freeze?: { rows: number; cols: number }; // 没有冻结时省略
  overlay?: { regions?: SheetRegionOverlay[] };
}

export interface SheetViewParams {
  file: string;
  sheet?: string;
  range?: string;
  overlay?: { workpaper?: string | null; plan?: string | null; output?: string | null };
}

// ---------- 3.11 table.view ----------

export interface TableColumn {
  key: string;
  name: string;
  type: "text" | "decimal" | "date" | "integer";
  meaning?: string; // 识别出的字段含义（英文键）
  meaningLabel?: string; // 给人看的中文名；未识别时和 meaning 一起省略
  group?: string;
}

export interface TableView {
  table: string;
  title?: string;
  columns: TableColumn[];
  rows: { values: (string | null)[]; source?: { file: string; sheet: string; row: number }; invalid?: number[] }[];
  total: number;
  offset: number;
  highlight?: number | null;
}

// ---------- cell.trace ----------

export interface CellTrace {
  cell: string;
  value: Decimal | string | null;
  text?: string;
  from: { result: string; row: number; column: string } | null;
  source?: { table: string; file: string; sheet: string; rows: number[]; rowCount?: number };
  basis?: { label: string; value: string; basis?: Basis }[];
  checks?: { check: string; passed: boolean; label?: string }[];
}

// ---------- 4.10 MCP ----------

export interface McpTool {
  tool: string;
  description?: string;
  argsSummary?: string;
  enabled: boolean;
  sideEffect: "readonly" | "mutating";
  readOnlyHint?: boolean;
}

export interface McpServerConfig {
  name: string;
  title: string;
  enabled: boolean;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  secretEnv?: string[];
  url?: string;
  hasToken?: boolean;
}

export interface McpServer extends McpServerConfig {
  state: McpStatus["state"];
  error?: { code: string; message: string };
  tools: McpTool[];
}

export interface McpStatus {
  name: string;
  state: "connecting" | "connected" | "failed" | "disabled";
  error?: { code: string; message: string };
  toolCount?: number;
}

export interface McpTestResult {
  ok: boolean;
  serverInfo?: { name: string; version: string };
  latencyMs?: number;
  tools?: McpTool[];
  error?: { code: string; message: string };
}

// ---------- 项目、对话、文件、产出 ----------

export interface Project {
  project: string;
  name: string;
  folder: string;
  lastActive?: string;
}

export interface SessionSummary {
  session: string;
  project: string;
  title: string;
  lastActive: string;
  tasks: { task: string; status: TaskStatus }[];
  /** 未处理卡片数，左栏状态点用 */
  openCards?: number;
}

export interface ProjectFile {
  file: string;
  name: string;
  kind: "workpaper" | "data" | "other";
  sizeBytes?: number;
  addedAt?: string;
  sheets?: string[];
}

export interface OutputFile {
  output: string; // O- 编号
  file: string; // 路径
  name: string;
  kind: string;
  session: string;
  task?: string;
  checks?: { passed: number; failed: number };
  at: string;
}

export interface Settings {
  baseUrl: string;
  model: string;
  models?: string[];
  hasKey: boolean;
  connected?: boolean;
}

export interface ConnectionTestResult {
  ok: boolean;
  models?: string[];
  latencyMs?: number;
  error?: { code: string; message: string };
}

export interface PrivacyStatus {
  outbound: { item: string; label: string; state: "on" | "off"; target?: string | string[]; warning?: boolean }[];
  shell: "on" | "off";
  verifiedAt: string;
}

export interface AppInfo {
  version: string;
  buildTime: string;
  harness: string;
  tools: string;
  interfaces: Record<string, string>;
  runtimes: Record<string, string>;
  dataDir: string;
}

// ---------- 4.3 前端命令 ----------

export interface CommandMap {
  "settings.get": { params: Record<string, never>; result: Settings };
  "settings.save": { params: { baseUrl?: string; model?: string }; result: Settings };
  "secret.save": { params: { key: "model"; value: string }; result: { saved: true } };
  "connection.test": { params: { baseUrl?: string; key?: string; model?: string }; result: ConnectionTestResult };
  "project.list": { params: Record<string, never>; result: { projects: Project[] } };
  "project.create": { params: { name: string; folder: string }; result: Project };
  "project.open": { params: { project: string }; result: Project };
  "project.rename": { params: { project: string; name: string }; result: Project };
  "project.remove": { params: { project: string }; result: { removed: true } };
  "files.add": { params: { project: string; paths: string[] }; result: { files: ProjectFile[] } };
  "files.list": { params: { project: string }; result: { files: ProjectFile[] } };
  "session.list": { params: { project: string }; result: { sessions: SessionSummary[] } };
  "session.create": { params: { project: string; title?: string }; result: { session: string } };
  "session.get": {
    params: { session: string };
    result: { session: string; title: string; tasks: TaskSnapshot[]; openCards: Card[]; lastSeq: number };
  };
  "session.rename": { params: { session: string; title: string }; result: { session: string } };
  "session.delete": { params: { session: string }; result: { deleted: true } };
  "session.events": { params: { session: string; after: number }; result: { events: AuditEvent[] } };
  "message.send": { params: { session: string; text: string; files?: string[] }; result: { message: string } };
  "message.stop": { params: { session: string }; result: { stopped: true } };
  "task.create": { params: { session: string; text: string; files: string[] }; result: { task: string } };
  "task.list": { params: { project: string }; result: { tasks: TaskSnapshot[] } };
  "task.get": { params: { task: string }; result: TaskSnapshot };
  "task.events": { params: { task: string; after: number }; result: { events: AuditEvent[] } };
  "task.message": { params: { task: string; text: string }; result: { accepted: true } };
  "task.cancel": { params: { task: string }; result: { cancelled: true } };
  "task.resume": { params: { task: string }; result: { resumed: true } };
  "task.rerun": {
    params: { task: string; scope: { regions?: string[]; fromStage?: Stage }; note?: string };
    result: { accepted: true };
  };
  "card.answer": { params: CardAnswer & { card: string }; result: { accepted: true } };
  "outputs.list": { params: { project: string }; result: { outputs: OutputFile[] } };
  "sheet.view": { params: SheetViewParams; result: SheetView };
  "table.view": {
    params: { table: string; offset?: number; limit?: number; locate?: number | null; columns?: string[] | null };
    result: TableView;
  };
  "cell.trace": { params: { output: string; cell: string }; result: CellTrace };
  "output.open": { params: { file: string }; result: { opened: true } };
  "mcp.list": { params: Record<string, never>; result: { servers: McpServer[] } };
  "mcp.add": {
    params: McpServerConfig & { token?: string; secrets?: Record<string, string> };
    result: McpServer;
  };
  "mcp.update": {
    params: Partial<McpServerConfig> & {
      name: string;
      token?: string;
      secrets?: Record<string, string>;
      tools?: { tool: string; enabled?: boolean; sideEffect?: "readonly" | "mutating" }[];
    };
    result: McpServer;
  };
  "mcp.remove": { params: { name: string }; result: { removed: true } };
  "mcp.test": {
    params: { name: string } | (McpServerConfig & { token?: string; secrets?: Record<string, string> });
    result: McpTestResult;
  };
  "privacy.status": { params: Record<string, never>; result: PrivacyStatus };
  "app.info": { params: Record<string, never>; result: AppInfo };
  "logs.export": {
    params: { from: string; to: string; includeContent: boolean };
    result: { file: string; sizeBytes: number };
  };
}

export type Method = keyof CommandMap;
export type ParamsOf<M extends Method> = CommandMap[M]["params"];
export type ResultOf<M extends Method> = CommandMap[M]["result"];

export interface CommandError {
  code: string;
  message: string;
}

export class HostError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}
