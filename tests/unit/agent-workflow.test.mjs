import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../../src/conversations/store.mjs';
import {buildAgentWorkflows,verifyPlan} from '../../src/agent/definitions.mjs';
import {recordRequest} from '../../src/agent/context.mjs';
import {buildCatalog} from '../../src/workflows/contracts.mjs';

const catalog=buildCatalog(JSON.parse(fs.readFileSync('src/resources/tools.json','utf8')),JSON.parse(fs.readFileSync('src/resources/audit-task-tools.json','utf8')));
const workflows=buildAgentWorkflows(catalog);

test('all registered capabilities are bound to a built-in Agent workflow',()=>{
  assert.equal(catalog.length,79);
  assert.equal(workflows.length,9);
  assert.deepEqual(catalog.filter(tool=>!workflows.some(flow=>flow.toolIds.includes(tool.id))),[]);
});

test('Agent plans only use ordered tools inside a selected workflow',()=>{
  const flow=workflows.find(item=>item.id==='monthly');
  const plan=verifyPlan({workflowIds:['monthly'],steps:[{id:'inspect',toolId:flow.toolIds.includes('inspect')?'inspect':'mcp_monthly_preview',files:['本期.xlsx'],parameters:{},parameterSources:{files:'user-objective'}}]},catalog,workflows);
  assert.equal(plan[0].status,'pending');
  assert.throws(()=>verifyPlan({workflowIds:['monthly'],steps:[{id:'bad',toolId:'not-a-tool',files:[],parameters:{}}]},catalog,workflows),/不属于选定工作流|未知工具/);
});

test('actual model input and conservative budget are persisted for recovery',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-context-'));const store=new Store(root);
  try {
    const run=store.create('agentRuns',{sessionId:'session-1',version:'audit-agent/1',workflowVersion:'audit-workflows/1',requirements:[{id:'user-objective'}],inputs:[],questions:[]});
    const input=recordRequest(store,run,'understand',[{role:'user',content:'检查资料'}],[{type:'function',function:{name:'list_local_files'}}],{model:'fixture',baseUrl:'http://127.0.0.1',maxTokens:256,contextWindow:128000});
    assert.equal(input.rendererVersion,'audit-node-context/1');
    assert.equal(store.all('agentModelInputs').length,1);
    assert.equal(store.get('agentModelInputs',input.id).budget.measuredTokenizer,false);
  } finally {store.close();fs.rmSync(root,{recursive:true,force:true});}
});
