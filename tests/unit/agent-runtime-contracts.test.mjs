import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../../src/conversations/store.mjs';
import {createAgentRun,transitionAgentRun,recoverAgentRuns} from '../../src/agent/state.mjs';
import {rebuildContext,requiredStateFingerprint,boundedToolResult,evidenceRequestAllowed} from '../../src/agent/context-builder.mjs';
import {normalizeToolResult} from '../../src/agent/tool-results.mjs';
import {assertLocalModel} from '../../src/agent/runtime.mjs';
import {buildAgentWorkflows,verifyWorkflowPlan} from '../../src/agent/definitions.mjs';
import {buildCatalog} from '../../src/workflows/contracts.mjs';
const catalog=buildCatalog(JSON.parse(fs.readFileSync('src/resources/tools.json','utf8')),JSON.parse(fs.readFileSync('src/resources/audit-task-tools.json','utf8'))),flows=buildAgentWorkflows(catalog);

test('every capability has executable node input, output, failure and dependency contracts',()=>{
  for(const tool of catalog){const nodes=flows.flatMap(flow=>flow.stages.filter(stage=>stage.toolIds.includes(tool.id)));assert.ok(nodes.length,tool.id);for(const node of nodes){assert.ok(node.inputs&&node.outputs&&node.completion&&node.failure);assert.ok(Array.isArray(node.dependsOn));}}
  assert.throws(()=>verifyWorkflowPlan({workflowIds:['data'],steps:[{id:'one',toolId:'inspect',stageId:'not-a-stage',files:['x.csv'],parameters:{}}]},catalog,flows),/节点/);
  assert.throws(()=>verifyWorkflowPlan({workflowIds:['data'],steps:[{id:'one',toolId:'inspect',files:['x.csv'],parameters:{},dependsOn:['two']}]},catalog,flows),/依赖/);
});

test('run transitions reject completion reversal and restart retains pending state',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-states-')),store=new Store(dir);
  try{let run=store.create('agentRuns',createAgentRun({sessionId:'s',objective:'按万元检查',requirements:[{id:'unit',text:'万元'}],workflowVersion:'audit-workflows/1'}));run.questions=[{id:'q',text:'主体是谁',status:'open'}];run.steps=[{id:'one',name:'inspect',status:'succeeded',taskId:'t'}];store.put('agentRuns',run);recoverAgentRuns(store);const restored=store.get('agentRuns',run.id);assert.equal(restored.status,'interrupted');assert.equal(restored.questions[0].status,'open');assert.equal(restored.steps[0].taskId,'t');run=transitionAgentRun(restored,'running');run=transitionAgentRun(run,'completed');assert.throws(()=>transitionAgentRun(run,'running'),/不能/);}finally{store.close();}
});

test('context rebuilding archives whole old turns and preserves constraints, candidates and current tools',()=>{
  const run={id:'r',objective:'核对账表',requirements:[{id:'unit',text:'万元',status:'provided'}],inputs:[{id:'i',path:'账表.csv',sha256:'abc',status:'captured'}],questions:[{id:'q',text:'期间不明',status:'open'}],steps:[],checkpoints:[]};
  const before=requiredStateFingerprint(run),current=[{role:'user',content:'继续核对'},{role:'assistant',content:null,tool_calls:[{id:'call',function:{name:'inspect',arguments:'{}'}}]},{role:'tool',tool_call_id:'call',content:'{"ok":true,"previewIsSample":true}'}];
  const messages=[{role:'system',content:'业务约束'},...Array.from({length:5},(_,i)=>[{role:'user',content:'早先任务 '+i},{role:'assistant',content:'旧过程'.repeat(1200)}]).flat(),...current];
  const result=rebuildContext({messages,run,settings:{contextWindow:14000,maxTokens:256},retainTurns:1});assert.equal(result.rebuilt,true);assert.deepEqual(result.messages.slice(-3),current);assert.equal(requiredStateFingerprint(run),before);assert.match(result.messages[1].content,/万元/);assert.match(result.messages[1].content,/期间不明/);
  const next=rebuildContext({messages:result.messages,run,settings:{contextWindow:14000,maxTokens:256}});assert.equal(next.messages.filter(item=>String(item.content).startsWith('以下为应用')).length,1);
});

test('oversized necessary evidence fails instead of silently truncating the current task',()=>{
  const run={id:'r',requirements:[{id:'r1',text:'必需证据'.repeat(4000)}],inputs:[],questions:[],steps:[]};
  assert.throws(()=>rebuildContext({messages:[{role:'user',content:'当前任务'}],run,settings:{contextWindow:14000,maxTokens:256}}),error=>error.code==='CONTEXT_BUDGET');
});

test('bounded results preserve status and stable refs, and evidence access rejects foreign refs',()=>{
  const result=boundedToolResult({ok:true,taskId:'t',status:'succeeded',outputs:[{name:'out.csv'}],preview:['x'.repeat(50000)]},{limit:1000});assert.equal(result.truncated,true);assert.equal(result.previewIsSample,true);assert.deepEqual(result.resultRef,{kind:'tasks',id:'t'});assert.equal(result.preview,undefined);assert.throws(()=>evidenceRequestAllowed({files:['outside.csv']},[{id:'i',path:'inside.csv'}]),/范围/);
});

test('tool contracts keep failed, pending, waiting and unknown submissions distinct',()=>{
  for(const tool of catalog){assert.equal(normalizeToolResult({structuredContent:{success:false,status:'failed',message:tool.id}}).status,'failed');assert.equal(normalizeToolResult({structuredContent:{success:true,status:'success'}}).status,'succeeded');}
  assert.equal(normalizeToolResult({isError:true,content:[{type:'text',text:'error'}]}).ok,false);
  assert.equal(normalizeToolResult({structuredContent:{status:'processing',task_id:'remote-id'}}).status,'remote_pending');
  assert.equal(normalizeToolResult({structuredContent:{status:'submission_unknown'}}).retryPolicy,'verify_remote_status_before_retry');
  assert.equal(normalizeToolResult({structuredContent:{needs_confirmation:true}}).status,'awaiting_input');
});

test('offline execution explicitly rejects external model endpoints',()=>{
  assertLocalModel({baseUrl:'http://127.0.0.1:1234/v1'});
  for(const address of ['https://model.example/v1','http://example.com/v1','http://127.0.0.1@outside.example'])assert.throws(()=>assertLocalModel({baseUrl:address}),/本机/);
});

test('metadata transaction commits a complete checkpoint or rolls back both records',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-transaction-')),store=new Store(dir);
  try{assert.throws(()=>store.transaction(()=>{store.put('a',{id:'1'});store.put('b',{id:'2'});throw Error('interrupted');}));assert.equal(store.get('a','1'),null);assert.equal(store.get('b','2'),null);store.transaction(()=>{store.put('a',{id:'1'});store.put('b',{id:'2'});});assert.ok(store.get('a','1'));assert.ok(store.get('b','2'));}finally{store.close();}
});
