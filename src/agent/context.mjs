import {createHash} from 'node:crypto';

export const CONTEXT_VERSION = 'audit-node-context/1';
export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const CJK = /[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/g;

/**
 * Conservative token estimate without a tokenizer for the configured gateway.
 * CJK characters count 1.5 tokens each, everything else one token per 3 characters;
 * common tokenizers produce fewer, so the estimate stays an upper bound.
 */
export function estimateTokens(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const cjk = text.match(CJK)?.length || 0;
  return Math.ceil(cjk * 1.5 + (text.length - cjk) / 3);
}

export function checkRequestBudget(messages, tools = [], settings = {}) {
  const tokens = estimateTokens({messages, tools});
  // Never truncate required evidence: callers rebuild history or fail with CONTEXT_BUDGET.
  const window = settings.contextWindow || 128000;
  const output = settings.maxTokens || 4096;
  const margin = 8192;
  const budget = {method:'character-estimate', measuredTokenizer:false, inputUpperBound:tokens, outputReserved:output, safetyMargin:margin, contextWindow:window};
  if(tokens + output + margin > window) {
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
