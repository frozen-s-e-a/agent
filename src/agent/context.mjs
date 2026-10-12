import {createHash} from 'node:crypto';

export const CONTEXT_VERSION = 'audit-node-context/1';
export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export function checkRequestBudget(messages, tools = [], settings = {}) {
  const bytes = Buffer.byteLength(JSON.stringify({messages, tools}), 'utf8');
  // UTF-8 bytes provide a conservative upper bound without claiming a measured
  // tokenizer for the enterprise gateway. Never truncate required evidence.
  const window = settings.contextWindow || 128000;
  const output = settings.maxTokens || 4096;
  const margin = 8192;
  const budget = {method:'utf8-byte-upper-bound', measuredTokenizer:false, inputUpperBound:bytes, outputReserved:output, safetyMargin:margin, contextWindow:window};
  if(bytes + output + margin > window) {
    const error = new Error('当前问题的必要要求与证据超过上下文预算，请缩小资料范围或拆成关联子任务。完整资料和已有成果已保留。');
    error.code = 'CONTEXT_BUDGET'; error.budget = budget; throw error;
  }
  return budget;
}

export function recordRequest(store, run, nodeId, messages, tools, settings) {
  const budget = checkRequestBudget(messages, tools, settings);
  return store.create('agentModelInputs', {
    runId:run.id, sessionId:run.sessionId, nodeId, taskVersion:run.version,
    rendererVersion:CONTEXT_VERSION, model:settings.model, baseUrl:settings.baseUrl,
    messages, tools, requestHash:digest({messages, tools}), budget,
    requirementRefs:run.requirements.map(r => r.id), inputRefs:run.inputs.map(i => ({id:i.id, sha256:i.sha256})),
    unresolvedItems:run.questions || [], credentialRef:'runtime-model-settings',
  });
}

export function resultForModel(task) {
  const result = task.result || {};
  return {
    ok:task.status === 'succeeded' && !result.isError, taskId:task.id, tool:task.tool,
    status:task.status, validationStatus:task.validationStatus || 'not_checked',
    error:task.error || undefined, inputRows:result.inputRows, resultRows:result.rowCount,
    structureOnly:!!result.structureOnly, columns:result.columns,
    preview:result.preview?.slice(0,20), previewIsSample:true,
    outputs:result.outputs, warnings:result.warnings,
    resultRef:{kind:'tasks', id:task.id},
    note:'统计来自实际执行，预览是样本；完整数据由业务处理器计算，不能把样本视为总体。',
  };
}
