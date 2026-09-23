export type Project = { id: string; name: string; root: string };
export type Session = { id: string; projectId: string | null; title: string; model?: string };
export type Tool = { id: string; name: string; group: string; description: string; fields: { key: string; label: string; required?: boolean; default?: string }[] };
export type Boot = { version: string; projects: Project[]; sessions: Session[]; tools: Tool[]; legacyTools?: Tool[]; settings: any; jetRules: any[]; counts: any; coverage: any };
export type TaskCard = { id: string; tool: string; files: string[]; parameters: Record<string, string>; mode: string; selectedMode?: string; status: string; phase?: string; rows?: number; error?: string; result?: { inputRows: number; rowCount: number; inputUnit?: string; resultUnit?: string; warningCount: number; warnings: string[]; outputs: { name: string }[]; preview: any[]; columns: string[]; durationSeconds?: number }; createdAt: string };
