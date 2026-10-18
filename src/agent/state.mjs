import {createHash} from 'node:crypto';

export const AGENT_STATE_VERSION = 'audit-agent-state/1';
export const AGENT_RUN_STATES = Object.freeze([
  'running',
  'waiting_for_user',
  'completed',
  'failed',
  'stopped',
  'interrupted',
]);

const transitions = Object.freeze({
  running: new Set(['running', 'waiting_for_user', 'completed', 'failed', 'stopped', 'interrupted']),
  waiting_for_user: new Set(['waiting_for_user', 'running', 'completed', 'failed', 'stopped', 'interrupted']),
  completed: new Set(['completed']),
  failed: new Set(['failed', 'running']),
  stopped: new Set(['stopped', 'running']),
  interrupted: new Set(['interrupted', 'running', 'failed', 'stopped']),
});

const iso = () => new Date().toISOString();
const shortHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

export function createAgentRun({sessionId, objective, requirements = [], workflowVersion, version = 'audit-agent/1'}) {
  const now = iso();
  return {
    id: undefined,
    stateVersion: AGENT_STATE_VERSION,
    sessionId,
    version,
    workflowVersion,
    status: 'running',
    objective: String(objective || '').slice(0, 32000),
    requirements: requirements.map((item, index) => ({
      id: String(item.id || `requirement-${index + 1}`),
      text: String(item.text || '').slice(0, 32000),
      status: item.status || 'provided',
      source: item.source || 'user',
    })),
    workflowIds: [],
    plan: {version: workflowVersion, status: 'pending', steps: []},
    inputs: [],
    modelInputs: [],
    steps: [],
    questions: [],
    checkpoints: [],
    transitions: [{from: null, to: 'running', at: now, reason: 'created'}],
    usage: {prompt_tokens: 0, completion_tokens: 0, total_tokens: 0},
    requestCount: 0,
    currentNode: 'scope',
    revision: 0,
    startedAt: now,
    updatedAt: now,
  };
}

export function ensureAgentRun(run) {
  if (!run || typeof run !== 'object') throw Error('Agent 运行记录无效');
  const now = iso();
  return {
    stateVersion: AGENT_STATE_VERSION,
    workflowIds: [],
    plan: {version: run.workflowVersion, status: 'pending', steps: []},
    inputs: [], modelInputs: [], steps: [], questions: [], checkpoints: [],
    transitions: [], usage: {prompt_tokens: 0, completion_tokens: 0, total_tokens: 0},
    requestCount: 0, currentNode: 'scope', revision: 0, updatedAt: now,
    ...run,
  };
}

export function transitionAgentRun(run, status, {node, reason, error, store} = {}) {
  const next = ensureAgentRun(run);
  if (!AGENT_RUN_STATES.includes(status)) throw Error(`未知 Agent 状态：${status}`);
  const from = next.status || 'running';
  if (!transitions[from]?.has(status)) throw Error(`Agent 状态不能从 ${from} 转为 ${status}`);
  const at = iso();
  next.status = status;
  if (node) next.currentNode = node;
  if (error !== undefined) next.error = String(error).slice(0, 4000);
  if (status !== 'failed' && error === undefined) delete next.error;
  if (reason) next.lastTransitionReason = String(reason).slice(0, 500);
  next.transitions = [...(next.transitions || []), {from, to: status, at, reason: reason || undefined}].slice(-100);
  next.revision = Number(next.revision || 0) + 1;
  next.updatedAt = at;
  if (['completed', 'failed', 'stopped', 'interrupted'].includes(status)) next.finishedAt = next.finishedAt || at;
  if (store) store.put('agentRuns', next);
  return next;
}

export function addAgentStep(run, step) {
  const next = ensureAgentRun(run);
  const record = {
    id: String(step.id),
    name: String(step.name || ''),
    toolId: step.toolId || step.name,
    workflowIds: [...new Set(step.workflowIds || [])],
    nodeId: step.nodeId || 'execute',
    status: step.status || 'running',
    attempts: Number(step.attempts || 1),
    inputRefs: step.inputRefs || [],
    outputRefs: step.outputRefs || [],
    startedAt: step.startedAt || iso(),
    ...step,
  };
  const index = next.steps.findIndex(item => item.id === record.id);
  if (index < 0) next.steps.push(record); else next.steps[index] = {...next.steps[index], ...record};
  next.revision = Number(next.revision || 0) + 1;
  next.updatedAt = iso();
  return next;
}

export function finishAgentStep(run, id, result, {status, checkpoint} = {}) {
  const next = ensureAgentRun(run);
  const index = next.steps.findIndex(item => item.id === id);
  if (index < 0) return next;
  const step = next.steps[index];
  const finalStatus = status || (result?.ok === false ? 'failed' : 'succeeded');
  next.steps[index] = {
    ...step,
    status: finalStatus,
    result: result || undefined,
    taskId: result?.taskId || step.taskId,
    checkpoint: checkpoint || step.checkpoint,
    finishedAt: iso(),
  };
  if (checkpoint) next.checkpoints = [...(next.checkpoints || []), checkpoint].slice(-100);
  next.revision = Number(next.revision || 0) + 1;
  next.updatedAt = iso();
  return next;
}

export function addAgentQuestion(run, question) {
  const next = ensureAgentRun(run);
  const item = {id: question.id || `question-${shortHash(question)}`, text: String(question.text || question), status: question.status || 'open', source: question.source || 'agent', at: iso()};
  const index = next.questions.findIndex(q => q.id === item.id);
  if (index < 0) next.questions.push(item); else next.questions[index] = {...next.questions[index], ...item};
  next.updatedAt = iso();
  return next;
}

export function addAgentCheckpoint(run, checkpoint) {
  const next = ensureAgentRun(run);
  next.checkpoints = [...(next.checkpoints || []), {...checkpoint, at: checkpoint.at || iso()}].slice(-100);
  next.updatedAt = iso();
  return next;
}

export function recoverAgentRuns(store) {
  for (const original of store.all('agentRuns')) {
    let run=ensureAgentRun(original);
    if(original.stateVersion!==AGENT_STATE_VERSION){run.stateVersion=AGENT_STATE_VERSION;run.migration={from:original.stateVersion || original.version || 'legacy',at:iso()};}
    if (original.status==='running') {
      run = transitionAgentRun(run, 'interrupted', {node: 'repair', reason: '应用启动时发现未完成的 Agent 运行'});
      run.recovery = {required: true, message: '上次运行未完成；已保留请求、步骤和成果，可继续发送消息核对或重试。', at: iso()};
      for(const step of run.steps){if(!step.taskId)continue;const task=store.get('tasks',step.taskId);if(task?.status==='succeeded'&&task.validationStatus==='passed'){step.status='succeeded';step.result={ok:true,taskId:task.id,status:task.status,validationStatus:task.validationStatus,outputs:task.result?.outputs};step.recoveredAt=iso();}else if(step.status==='running')step.status='interrupted';}
    }
    store.put('agentRuns',run);
  }
}

export function latestAgentRun(store, sessionId) {
  return store.all('agentRuns').filter(run => run.sessionId === sessionId).sort((a, b) => String(b.updatedAt || b.startedAt || '').localeCompare(String(a.updatedAt || a.startedAt || '')))[0] || null;
}
