import { Files, BookOpenCheck, ChartNoAxesCombined, ListChecks, Landmark, FileSpreadsheet, Link2, Network, ScanSearch } from 'lucide-react';
import { workflowDefinitions } from '../workflows/definitions.mjs';
export interface TaskStage { id: string; kind: 'input' | 'execute' | 'review'; title: string; description: string; tools: string[]; outputs: string[]; optional?: boolean }
export interface TaskDefinition { id: string; title: string; group: string; description: string; inputHint: string; note?: string; stages: TaskStage[] }
export const TASK_DEFINITIONS = workflowDefinitions as TaskDefinition[];
export const TASK_ICONS = { data: Files, ledger: BookOpenCheck, monthly: ChartNoAxesCombined, sampling: ListChecks, bank: Landmark, workpaper: FileSpreadsheet, disclosure: Link2, external: Network, aux: ScanSearch };
export const TASK_GROUPS = ['全部任务', ...new Set(TASK_DEFINITIONS.map(t => t.group))];
