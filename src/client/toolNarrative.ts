import type { Tool, ToolCall } from './types';

export type IslandStatus = 'pending' | 'active' | 'success' | 'error' | 'cancelled' | 'expired';

const statusMap: Record<string, IslandStatus> = {
  queued: 'pending', pending: 'pending', running: 'active', active: 'active',
  succeeded: 'success', success: 'success', completed: 'success',
  failed: 'error', error: 'error', cancelled: 'cancelled', canceled: 'cancelled',
  expired: 'expired',
};

const actionNames: Record<string, string> = {
  list_local_files: '浏览文件',
  preview_local_file: '读取文件',
  get_audit_tools: '匹配审计工具',
  run_audit_tool: '执行本地审计',
  get_task_result: '读取执行结果',
};

export function islandStatus(status?: string): IslandStatus {
  return statusMap[String(status || '').toLowerCase()] || 'active';
}

export function toolDisplayName(call: ToolCall | any, tools: Tool[] = []) {
  const id = String(call?.name || call?.tool || '');
  const match = tools.find(tool => tool.id === id || tool.name === id);
  return String(call?.label || match?.name || actionNames[id] || (id.startsWith('legacy_') ? `原版 MCP · ${id.slice(7)}` : id) || '本地工具');
}

export function toolNarrative(call: ToolCall | any, tools: Tool[] = []) {
  const status = islandStatus(call?.status);
  const label = toolDisplayName(call, tools);
  const result = call?.result;
  if (status === 'pending') return `${label} 已排队，等待执行`;
  if (status === 'active') return `${label} 正在处理资料`;
  if (status === 'success') return result?.rowCount || result?.outputs?.length
    ? `${label} 已完成，结果已发布`
    : `${label} 已完成`;
  if (status === 'error') return `${label} 执行失败${result?.error ? `：${result.error}` : ''}`;
  if (status === 'cancelled') return `${label} 已取消`;
  if (status === 'expired') return `${label} 已过期，可重新执行`;
  return `${label} 等待更新`;
}

export function callTimestamp(call: any) {
  const raw = call?.finishedAt || call?.createdAt || call?.startedAt;
  const time = raw ? Date.parse(raw) : 0;
  return Number.isFinite(time) ? time : 0;
}
