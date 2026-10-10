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
  updatedAt?: string;
  workflow?: any;
}

export interface ToolField {
  key: string;
  label: string;
  required?: boolean;
  default?: any;
  type?: string;
  kind?: string;
  help?: string;
  enum?: string[];
  items?: any;
  allowBlank?: boolean;
}

export interface Tool {
  id: string;
  name: string;
  group: string;
  description: string;
  fields: ToolField[];
  legacy?: string;
  mcpName?: string;
  engine?: string;
  contract?: { extensions: string[] | null; format: string; formatVerified?: boolean; inputMode: string; mutates: boolean; dependency?: string; templates?: string[] };
}

export interface TaskResult {
  inputRows: number;
  rowCount: number;
  inputUnit?: string;
  resultUnit?: string;
  warningCount: number;
  warnings: string[];
  outputs: { name: string; path?: string }[];
  columns: string[];
  preview: any[];
  durationSeconds?: number;
  content?: any[];
  [key: string]: unknown;
}

export interface TaskCard {
  id: string;
  tool: string;
  files: string[];
  parameters: Record<string, unknown>;
  mode: string;
  selectedMode?: string;
  status: string;
  phase?: string;
  rows?: number;
  error?: string;
  result?: TaskResult;
  createdAt: string;
  sessionId?: string;
  projectId?: string;
}

export interface Boot {
  version: string;
  preview?: boolean;
  build?: string;
  projects: Project[];
  sessions: Session[];
  tools: Tool[];
  legacyTools?: Tool[];
  settings: AppSettings;
  jetRules: any[];
  counts: { templates: number; modules: number };
  coverage: { implemented: number };
}

export interface AppSettings {
  baseUrl: string;
  model: string;
  visionModel: string;
  models: string[];
  defaultMode?: string;
  hasKey?: boolean;
}

export interface FileSystemEntry {
  name: string;
  path: string;
  directory: boolean;
  size?: number;
}
