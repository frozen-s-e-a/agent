// ─── 项目与会话 ───

export interface Project {
  id: string;
  name: string;
  root: string;
}

export interface Session {
  id: string;
  projectId: string | null;
  title: string;
  model?: string;
  parentSessionId?: string | null;
  branchedFromEventId?: string | null;
}

// ─── 工具 ───

export interface ToolField {
  key: string;
  label: string;
  required?: boolean;
  default?: string;
}

export interface Tool {
  id: string;
  name: string;
  group: string;
  description: string;
  fields: ToolField[];
}

// ─── 任务 ───

export interface TaskResult {
  inputRows: number;
  rowCount: number;
  inputUnit?: string;
  resultUnit?: string;
  warningCount: number;
  warnings: string[];
  outputs: { name: string }[];
  preview: any[];
  columns: string[];
  durationSeconds?: number;
}

export interface TaskCard {
  id: string;
  tool: string;
  files: string[];
  parameters: Record<string, string>;
  mode: string;
  selectedMode?: string;
  status: string;
  phase?: string;
  rows?: number;
  error?: string;
  result?: TaskResult;
  createdAt: string;
}

// ─── 消息事件 ───

export interface AttachmentItem {
  id: string;
  name: string;
  kind: 'file' | 'folder' | 'image';
  size: number;
  readable?: boolean;
  count?: number;
  children?: { id: string; name: string; readable?: boolean }[];
}

export interface MessageUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface MessageEvent {
  id: string;
  type: 'user' | 'assistant' | 'error' | 'tool' | 'task';
  text?: string;
  callId?: string;
  taskId?: string;
  at: string;
  model?: string;
  projectFiles?: string[];
  usage?: MessageUsage;
  attachments?: AttachmentItem[];
  attachmentNotes?: string[];
}

// ─── 模型调用卡 ───

export interface ToolCall {
  id: string;
  label: string;
  status: string;
  result?: {
    error?: string;
    taskId?: string;
    [key: string]: unknown;
  };
}

// ─── 引导数据 ───

export interface Boot {
  version: string;
  projects: Project[];
  sessions: Session[];
  tools: Tool[];
  legacyTools?: Tool[];
  settings: AppSettings;
  jetRules: any[];
  counts: { templates: number; modules: number };
  coverage: { implemented: number };
}

// ─── 应用设置 ───

export interface AppSettings {
  baseUrl: string;
  model: string;
  visionModel: string;
  models: string[];
  defaultMode?: string;
  hasKey?: boolean;
}

// ─── 文件 ───

export interface FileSystemEntry {
  name: string;
  path: string;
  directory: boolean;
  size?: number;
}

// ─── 迁移数据 ───

export interface WorkPackage {
  id: string;
  title: string;
  status?: string;
}

// ─── 用量 ───

export interface UsageSummary {
  input: number;
  output: number;
  total: number;
}

// ─── 模态框类型 ───

export type ModalType = 'project' | 'tools' | null;
