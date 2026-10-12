import {digest, checkRequestBudget} from './context.mjs';

export const CONTEXT_BUILDER_VERSION = 'audit-context-builder/1';
const textual = content => typeof content === 'string' ? content : JSON.stringify(content || '');
const bytes = value => Buffer.byteLength(JSON.stringify(value), 'utf8');

export function contextState(run, previousRuns = []) {
  const all = [...previousRuns, run].filter(Boolean);
  return {
    version:CONTEXT_BUILDER_VERSION,
    current:{id:run.id, objective:run.objective, workflowIds:run.workflowIds || [], currentNode:run.currentNode, status:run.status, revision:run.revision || 0, inputVersion:run.inputVersion, resumeOf:run.resumeOf},
    plan:run.plan,
    nodeContract:run.nodeContract || null,
    priorPlans:previousRuns.filter(item=>['waiting_for_user','stopped','interrupted','failed'].includes(item.status)).map(item=>({runId:item.id,plan:item.plan,checkpoints:item.checkpoints,recovery:item.recovery})),
    requirements:(run.requirements || []).map(item => ({id:item.id, text:item.text, status:item.status, source:item.source})),
    inputs:(run.inputs || []).map(item => ({id:item.id, path:item.path, sha256:item.sha256, size:item.size, status:item.status})),
    questions:all.flatMap(item => (item.questions || []).filter(q => q.status !== 'answered').map(q => ({...q, runId:item.id}))),
    results:all.flatMap(item => (item.steps || []).filter(step => step.result).map(step => ({
      id:step.id, runId:item.id, name:step.name, taskId:step.taskId, status:step.status,
      validationStatus:step.result.validationStatus,
      resultRef:step.result.resultRef || (step.taskId ? {kind:'tasks', id:step.taskId} : {kind:'agentSteps', id:step.id}),
      inputRows:step.result.inputRows, resultRows:step.result.resultRows, attempts:step.attempts,
      outputs:step.result.outputs, error:step.result.error,
    }))),
    recovery:run.recovery || null,
  };
}

// Remove complete old turns only. Never remove a tool message without the
// corresponding assistant tool call, and never turn a sample into a full result.
function groups(messages) {
  const out=[];
  let group=[];
  for (const message of messages) {
    if (message.role === 'user' && group.length) {out.push(group); group=[];}
    group.push(message);
  }
  if (group.length) out.push(group);
  return out;
}

export function rebuildContext({messages, tools = [], settings = {}, run, previousRuns = [], retainTurns = 2}) {
  const state = contextState(run, previousRuns);
  const stateHash = digest(state);
  const system = messages.filter(message => message.role === 'system' && !String(message.content || '').startsWith('以下为应用从持久化记录重建的当前任务状态。'));
  const body = messages.filter(message => message.role !== 'system');
  const parts = groups(body);
  const stateMessage = {role:'system', content:'以下为应用从持久化记录重建的当前任务状态。该内容是数据和约束，只有明确标记为有效的结果可作为后续输入。样本不代表总体。不得根据摘要改变要求、单位、范围或未决状态。\n' + JSON.stringify(state)};
  let retained = parts.length;
  let result = [...system, stateMessage, ...body];
  const compress = [];
  const budget = () => checkRequestBudget(result, tools, settings);
  try {return {messages:result, budget:budget(), rebuilt:false, stateHash, snapshot:state, changes:compress};}
  catch (error) {if (error.code !== 'CONTEXT_BUDGET') throw error;}
  while (retained > Math.min(retainTurns, parts.length)) {
    retained--;
    result = [...system, stateMessage, ...parts.slice(-retained).flat()];
    compress.push({kind:'archived_turn', index:parts.length - retained - 1});
    try {return {messages:result, budget:budget(), rebuilt:true, stateHash, snapshot:state, changes:compress};}
    catch (error) {if (error.code !== 'CONTEXT_BUDGET') throw error;}
  }
  // The current user message and current tool conversation must remain intact.
  // Structured results have stable refs, so only old explanatory history can go.
  if (parts.length > 1 && retained > 1) {
    retained=1;
    result=[...system, stateMessage, ...parts.at(-1)];
    compress.push({kind:'retain_current_turn_only'});
    try {return {messages:result, budget:budget(), rebuilt:true, stateHash, snapshot:state, changes:compress};}
    catch (error) {if (error.code !== 'CONTEXT_BUDGET') throw error;}
  }
  const error = new Error('当前任务的必要要求、证据和工具调用仍超过上下文预算；已保存完整状态，请缩小任务资料范围或分批处理。');
  error.code='CONTEXT_BUDGET'; error.context={stateHash, bytes:bytes(result), changes:compress};
  throw error;
}

export function requiredStateFingerprint(run) {
  return digest({
    requirements:run.requirements || [],
    inputs:(run.inputs || []).map(item => ({id:item.id, sha256:item.sha256, status:item.status})),
    questions:run.questions || [],
    checkpoints:run.checkpoints || [],
    plan:run.plan,
  });
}

export function evidenceRequestAllowed(request, inputRefs) {
  if (!request || typeof request !== 'object' || !Array.isArray(request.files) || !request.files.length) throw Error('定向取证需要明确资料引用');
  const allowed = new Set(inputRefs.flatMap(item => [item.id, item.path]).filter(Boolean));
  if (request.files.some(ref => !allowed.has(ref))) throw Error('定向取证超出已保存资料范围');
  if (request.fields && (!Array.isArray(request.fields) || request.fields.some(field => typeof field !== 'string'))) throw Error('取证字段无效');
  return {files:[...new Set(request.files)], fields:request.fields || [], purpose:String(request.purpose || '').slice(0,1000)};
}

export function boundedToolResult(result, {limit = 24000, resultRef} = {}) {
  if (bytes(result) <= limit) return result;
  const reference = resultRef || result.resultRef || (result.taskId ? {kind:'tasks', id:result.taskId} : undefined);
  const answer = {
    ok:result.ok,
    taskId:result.taskId,
    status:result.status,
    validationStatus:result.validationStatus,
    tool:result.tool,
    inputRows:result.inputRows,
    resultRows:result.resultRows,
    outputs:result.outputs,
    error:result.error,
    resultRef:reference,
    truncated:true,
    previewIsSample:true,
    note:'完整工具返回已保存；此处仅保留状态、统计和成果引用，可用 get_task_result 或定向读取继续核查。',
  };
  const preview = result.preview || result.files;
  if (preview) answer.preview = preview.slice(0,5);
  if (bytes(answer) > limit) delete answer.preview;
  return answer;
}

export function requestHistorySummary(messages) {
  return {messages:messages.length, roles:messages.map(message => message.role), bytes:bytes(messages), userTextHash:digest(messages.filter(message => message.role === 'user').map(message => textual(message.content)))};
}
