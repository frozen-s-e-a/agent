import {digest} from './context.mjs';

export const TOOL_RESULT_VERSION='audit-tool-result/1';
export function parseResult(result) {
  const values=(result?.content || []).filter(item=>item.type==='text').flatMap(item=>{try{return [JSON.parse(item.text)];}catch{return [];}});
  return result?.structuredContent || values.find(item=>item && typeof item==='object') || result || {};
}
export function normalizeToolResult(result) {
  const data=parseResult(result);
  const candidates=[data,...(result?.content || []).filter(item=>item.type==='text').flatMap(item=>{try{return [JSON.parse(item.text)];}catch{return [];}})];
  const failed=result?.isError===true || candidates.some(item=>item?.isError===true || item?.ok===false || item?.success===false || item?.valid===false || item?.validation_passed===false || ['error','failed','failure'].includes(item?.status));
  const waiting=data.needs_confirmation===true || data.requires_confirmation===true || ['needs_confirmation','pending_confirmation','awaiting_confirmation','awaiting_input','waiting_for_user'].includes(data.status);
  const unknown=['submission_unknown','submitted_unknown'].includes(data.status);
  const pending=['pending','processing','running','queued'].includes(data.status);
  const status=failed?'failed':unknown?'submission_unknown':waiting?'awaiting_input':pending?'remote_pending':'succeeded';
  const error=failed?String(data.error?.message || data.error || data.message || (result?.content || []).map(item=>item.text||'').join('\n') || '工具返回执行错误'):undefined;
  return {
    data,
    contractVersion:TOOL_RESULT_VERSION,
    status,
    ok:status==='succeeded',
    error,
    errorCode:failed?String(data.errorType || data.error_code || 'TOOL_FAILED'):undefined,
    retryPolicy:unknown?'verify_remote_status_before_retry':pending?'query_original_remote_task':failed?'bounded_retry_with_recorded_attempt':'no_retry_needed',
    remoteTaskId:data.task_id || data.remoteTaskId || null,
    rawHash:digest(result),
  };
}

export function taskSummary(task) {
  const result=task.result || {};
  return {
    ok:task.status==='succeeded' && task.validationStatus!=='failed' && !result.isError,
    taskId:task.id, tool:task.tool, status:task.status,
    validationStatus:task.validationStatus || 'not_checked', publicationStatus:task.publicationStatus || 'not_published',
    error:task.error || undefined, errorCode:task.errorCode || undefined,
    inputRows:result.inputRows, resultRows:result.rowCount, columns:result.columns,
    preview:result.preview?.slice(0,20), previewIsSample:true, structureOnly:!!result.structureOnly,
    outputs:result.outputs || [], warnings:result.warnings || [],
    remoteTaskId:task.remoteTaskId, retryPolicy:task.retryPolicy,
    resultRef:{kind:'tasks',id:task.id},
    note:'执行状态与文件完整性检查已记录；尚未实现的逐任务业务语义验收不包含在此验证级别。',
  };
}
