// Shapes returned by the desktop backend (src/host/service.mjs, src/agent/runtime.mjs).
// Only the fields the client reads are declared; the backend may send more.

export interface Project {
  id: string;
  name: string;
  root: string;
}

export interface Session {
  id: string;
  projectId: string | null;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  agentStatus?: string;
  streaming?: boolean;
}

export interface AppSettings {
  baseUrl: string;
  model: string;
  visionModel: string;
  models: string[];
  defaultMode?: string;
  hasKey?: boolean;
  hasCicpaCookies?: boolean;
}

/** A registered audit program; plan steps refer to it by id. */
export interface CatalogTool {
  id: string;
  name: string;
}

export interface Boot {
  version: string;
  build?: string | null;
  projects: Project[];
  sessions: Session[];
  settings: AppSettings;
  tools: CatalogTool[];
  legacyTools?: CatalogTool[];
}

export interface Attachment {
  id: string;
  name: string;
  kind?: string;
  size?: number;
}

export type ChatEvent =
  | {id: string; type: 'user'; text: string; at?: string; runId?: string; projectFiles?: string[]; attachments?: {name: string}[]}
  | {id: string; type: 'assistant'; text: string; at?: string; runId?: string; toolCount?: number; runStatus?: string}
  | {id: string; type: 'tool'; callId: string; at?: string; runId?: string}
  | {id: string; type: 'error'; text: string; at?: string; runId?: string}
  | {id: string; type: 'task' | 'attachment-context' | 'tool-evidence'; at?: string; runId?: string};

/** Events rendered as chat text; other event kinds are bookkeeping. */
export type TextEvent = Extract<ChatEvent, {type: 'user' | 'assistant' | 'error'}>;

export interface ToolCall {
  id: string;
  runId?: string;
  name: string;
  label?: string;
  status: string;
}

export interface TaskOutput {
  name: string;
  path?: string;
}

export interface Task {
  id: string;
  tool: string;
  status: string;
  phase?: string;
  error?: string;
  agentRunId?: string;
  validationStatus?: string;
  createdAt?: string;
  result?: {
    inputRows?: number;
    rowCount?: number;
    outputs?: TaskOutput[];
    warnings?: string[];
  };
}

export interface AgentStep {
  id: string;
  name: string;
  callId?: string;
  status: string;
  result?: {error?: string};
}

export interface PlanStep {
  id: string;
  toolId: string;
  files?: string[];
  status: string;
  taskId?: string;
}

export interface AgentQuestion {
  id: string;
  text: string;
  status: string;
}

export interface AgentInput {
  id: string;
  path: string;
  source?: string;
}

export interface AgentRun {
  id: string;
  status: string;
  objective: string;
  resumeOf?: string;
  startedAt?: string;
  createdAt?: string;
  plan?: {status?: string; steps: PlanStep[]};
  questions?: AgentQuestion[];
  steps: AgentStep[];
  inputs: AgentInput[];
  changedInputs?: string[];
}

export interface SessionRecord {
  id: string;
  projectId?: string | null;
  title: string;
  events: ChatEvent[];
  calls: ToolCall[];
  tasks: Task[];
  attachments: Attachment[];
  agentRuns: AgentRun[];
  turn?: string;
  phase?: string;
  streaming?: boolean;
}

export interface FileEntry {
  name: string;
  path: string;
  directory: boolean;
  size?: number;
}

export interface SourceOrigin {
  sessionId: string;
  runId: string;
  inputId: string;
  path: string;
  row: number;
  sheet?: string;
  headerRow?: number;
}

export interface FilePreviewData {
  name: string;
  text?: string;
  columns?: string[];
  preview?: (unknown[] | Record<string, unknown>)[];
  sourceRows?: number[];
  sourceOrigins?: (SourceOrigin | null)[];
  highlightedSourceRow?: number;
}

export interface RuntimeStatus {
  mcpAvailable: boolean;
  excel: string | null;
  skills: {id: string; name: string}[];
}
