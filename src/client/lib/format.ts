export const STATUS_LABELS: Record<string, string> = {
  running: '执行中',
  queued: '排队中',
  cancelling: '正在停止',
  succeeded: '步骤完成',
  completed: '已完成',
  failed: '未完成',
  stopped: '已停止',
  cancelled: '已取消',
  interrupted: '上次运行中断',
  waiting_for_user: '等待补充',
  awaiting_input: '等待补充',
  remote_pending: '远端处理中',
  submission_unknown: '提交状态待核对',
  pending: '待执行',
};

export const statusLabel = (status?: string) => (status && STATUS_LABELS[status]) || status || '';

/** Run statuses the backend accepts for `agent.resume`. */
export const isResumable = (status?: string) => ['stopped', 'interrupted', 'failed', 'waiting_for_user'].includes(status || '');

export const isActiveTask = (status?: string) => ['queued', 'running', 'cancelling'].includes(status || '');

/** Tone used for status pills and dots. */
export function statusTone(status?: string): 'running' | 'success' | 'warning' | 'danger' | 'neutral' {
  if (['running', 'queued', 'cancelling', 'remote_pending'].includes(status || '')) return 'running';
  if (['succeeded', 'completed'].includes(status || '')) return 'success';
  if (['waiting_for_user', 'awaiting_input', 'stopped', 'interrupted', 'submission_unknown', 'cancelled'].includes(status || '')) return 'warning';
  if (status === 'failed') return 'danger';
  return 'neutral';
}

export function shortTime(value?: string) {
  return value ? new Date(value).toLocaleString('zh-CN', {month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) : '';
}

export function fullTime(value?: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN') : '';
}

export function errorMessage(value: unknown) {
  if (typeof value === 'object' && value !== null && 'message' in value) return String((value as {message?: unknown}).message);
  return String(value);
}

export const byRecent = <T extends {updatedAt?: string; createdAt?: string}>(a: T, b: T) =>
  String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));

/** Mirrors isLocalModel in src/agent/runtime.mjs: this build only chats with a model on this machine. */
export function isLocalModelUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}
