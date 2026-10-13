import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../../src/conversations/store.mjs';
import {captureInputs,collectUnusedBlobs,removeTree,workspaceRoot} from '../../src/agent/inputs.mjs';
import {matchPlannedStep,isBareContinue,isExecutionStep} from '../../src/agent/runtime.mjs';
import {pendingRuns,contextState} from '../../src/agent/context-builder.mjs';
import {estimateTokens} from '../../src/agent/context.mjs';
import {loadSkills,skillContext} from '../../src/skills/loader.mjs';
import {createBackend} from '../../src/host/service.mjs';

const temp=prefix=>fs.mkdtempSync(path.join(os.tmpdir(),prefix));
const picked=(skills,query)=>(skillContext(skills,query).match(/任务指南：(\S+)/g) || []).map(item=>item.slice(5));

test('identical project files are stored once across runs and snapshots stay read-only', () => {
  const dir=temp('agent-inputs-'),project=temp('agent-project-'),store=new Store(dir);
  try {
    fs.writeFileSync(path.join(project,'账表.csv'),'a,b\n1,2\n');fs.writeFileSync(path.join(project,'副本.csv'),'a,b\n1,2\n');
    const saved=store.create('projects',{name:'p',root:project}),session={id:'s',projectId:saved.id};
    const first=captureInputs(store,session,[],'run-1'),second=captureInputs(store,session,[],'run-2');
    assert.equal(first.inputs.length,2);assert.equal(first.inputs[0].sha256,second.inputs[0].sha256);
    const blobs=fs.readdirSync(path.join(workspaceRoot(store),'blobs')).filter(name=>!name.startsWith('.'));
    assert.equal(blobs.length,1);
    assert.equal(fs.readFileSync(second.inputs[0].snapshotPath,'utf8'),'a,b\n1,2\n');
    assert.equal(fs.statSync(first.inputs[0].snapshotPath).mode & 0o222,0);
    store.put('agentRuns',{id:'run-2',sessionId:'s',inputs:second.inputs});
    removeTree(path.join(workspaceRoot(store),'run-1'));assert.equal(collectUnusedBlobs(store),0);
    assert.equal(fs.statSync(second.inputs[0].snapshotPath).mode & 0o222,0,'surviving snapshot must remain read-only');
    const blob=path.join(workspaceRoot(store),'blobs',blobs[0]);
    assert.equal(fs.statSync(blob).mode & 0o222,0,'shared blob must remain read-only');
    if(process.platform==='win32')assert.throws(()=>fs.writeFileSync(second.inputs[0].snapshotPath,'changed'),{code:'EPERM'});
    assert.equal(fs.readFileSync(blob,'utf8'),'a,b\n1,2\n');
    store.delete('agentRuns','run-2');assert.equal(collectUnusedBlobs(store),1);
  } finally {store.close();removeTree(dir);fs.rmSync(project,{recursive:true,force:true});}
});

test('deleting a conversation removes its runs, model inputs and snapshots', async () => {
  const dir=temp('agent-delete-'),project=temp('agent-project-');
  fs.writeFileSync(path.join(project,'账表.csv'),'a\n1\n');
  const backend=await createBackend({dataRoot:dir});
  try {
    const saved=await backend.action('project.create',{name:'p',root:project}),session=await backend.action('session.create',{projectId:saved.id});
    const captured=captureInputs(backend.store,session,[],'run-x');
    backend.store.put('agentRuns',{id:'run-x',sessionId:session.id,inputs:captured.inputs});
    backend.store.create('agentModelInputs',{sessionId:session.id,runId:'run-x'});
    backend.store.create('agentToolResults',{sessionId:session.id,runId:'run-x'});
    await backend.action('session.delete',{id:session.id});
    for(const kind of ['agentRuns','agentModelInputs','agentToolResults'])assert.deepEqual(backend.store.all(kind),[],kind);
    assert.equal(fs.existsSync(path.join(workspaceRoot(backend.store),'run-x')),false);
    assert.deepEqual(fs.readdirSync(path.join(workspaceRoot(backend.store),'blobs')),[]);
    assert.equal(backend.store.all('projects').filter(item=>item.internal).length,0);
  } finally {backend.close();removeTree(dir);fs.rmSync(project,{recursive:true,force:true});}
});

test('plan nodes that reuse a tool are matched by files and parameters', () => {
  const plan={steps:[
    {id:'jan',toolId:'voucher_check',files:['1月.csv'],parameters:{debit:'借方'},dependsOn:[],status:'succeeded'},
    {id:'feb',toolId:'voucher_check',files:['2月.csv'],parameters:{debit:'借方'},dependsOn:[],status:'pending'},
    {id:'mar',toolId:'voucher_check',files:['3月.csv'],parameters:{debit:'借方'},dependsOn:[],status:'pending'},
  ]};
  assert.equal(matchPlannedStep(plan,'voucher_check',['3月.csv'],{debit:'借方'}).id,'mar');
  assert.equal(matchPlannedStep(plan,'voucher_check',['2月.csv'],{debit:'借方'}).id,'feb');
  // No exact fit: the first runnable node comes back so the caller can name the mismatch.
  assert.equal(matchPlannedStep(plan,'voucher_check',['4月.csv'],{debit:'借方'}).id,'feb');
  assert.equal(matchPlannedStep(plan,'select_column',['x.csv'],{}),null);
});

test('only audit-program steps count toward the outcome, and a bare continue answers nothing', () => {
  assert.equal(isExecutionStep({name:'run_audit_tool'}),true);
  assert.equal(isExecutionStep({name:'audit_jet_run'}),true);
  assert.equal(isExecutionStep({name:'preview_local_file'}),false);
  for(const text of ['继续','好的','继续吧。','OK','go on'])assert.equal(isBareContinue(text),true,text);
  for(const text of ['期间是 2026 年','金额单位为万元，继续'])assert.equal(isBareContinue(text),false,text);
});

test('a conversation can use a remote model service once address and model are set', async () => {
  const dir=temp('agent-remote-'),backend=await createBackend({dataRoot:dir});
  try {
    const project=await backend.action('demo.create'),session=await backend.action('session.create',{projectId:project.id});
    await assert.rejects(backend.action('chat.send',{sessionId:session.id,text:'检查借贷平衡'}),/服务地址/);
    // A remote HTTPS gateway is accepted; the unresolvable host fails later inside the turn, not at the gate.
    await backend.action('settings.save',{baseUrl:'https://model.invalid/v1',model:'enterprise-128k'});
    await backend.action('chat.send',{sessionId:session.id,text:'检查借贷平衡'});
    for(let i=0;i<100&&(await backend.action('session.get',{id:session.id})).streaming;i++)await new Promise(resolve=>setTimeout(resolve,100));
    const events=(await backend.action('session.get',{id:session.id})).events;
    assert.ok(events.some(event=>event.type==='error'&&!/本机/.test(event.text)),'turn ends with a connection error');
  } finally {backend.close();removeTree(dir);}
});

test('questions of runs before the last completed run are no longer pending', () => {
  const old={id:'a',status:'waiting_for_user',questions:[{id:'q1',text:'旧问题',status:'open'}]};
  const done={id:'b',status:'completed',questions:[]};
  const recent={id:'c',status:'stopped',questions:[{id:'q2',text:'新问题',status:'open'}]};
  assert.deepEqual(pendingRuns([old,done,recent]).map(run=>run.id),['c']);
  const state=contextState({id:'d',requirements:[],inputs:[],questions:[],steps:[]},[old,done,recent]);
  assert.deepEqual(state.questions.map(question=>question.id),['q2']);
});

test('token estimate is closer to real usage for Chinese than the byte count', () => {
  const text='检查借贷是否平衡'.repeat(100);
  assert.equal(estimateTokens(text),1200);
  assert.ok(estimateTokens(text)<Buffer.byteLength(text));
  assert.equal(estimateTokens('abcdef'),2);
});

test('Chinese requests reach the matching task guide and authoring skills stay out', () => {
  const skills=loadSkills(process.cwd());
  assert.deepEqual(picked(skills,'帮我做JET测试，筛选凭证'),['jet-test']);
  assert.deepEqual(picked(skills,'做一下月度分析'),['monthly-analysis-mcp']);
  assert.deepEqual(picked(skills,'识别关联方'),['related-party-identification']);
  assert.deepEqual(picked(skills,'生成明细表'),['detailed-table-generation']);
  assert.deepEqual(picked(skills,'创建skill'),[]);
});

test('event log reads only appended bytes and repairs a partial trailing line', () => {
  const dir=temp('agent-events-'),store=new Store(dir);
  try {
    for(let index=0;index<3;index++)store.append('s1',{type:'user',text:'第'+index+'条'});
    assert.deepEqual(store.events('s1').map(event=>event.seq),[1,2,3]);
    fs.appendFileSync(path.join(dir,'sessions','s1.jsonl'),'{"broken":');
    assert.equal(store.events('s1').length,3);
    store.append('s1',{type:'assistant',text:'恢复后'});
    assert.deepEqual(store.events('s1').map(event=>event.seq),[1,2,3,4]);
    store.put('tasks',{id:'t1',sessionId:'s1'});store.put('tasks',{id:'t2',sessionId:'s2'});
    assert.deepEqual(store.bySession('tasks','s1').map(task=>task.id),['t1']);
  } finally {store.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('a project can be renamed and removed with its conversations, leaving its folder alone', async () => {
  const dir=temp('agent-project-remove-'),project=temp('agent-project-');
  fs.writeFileSync(path.join(project,'账表.csv'),'a\n1\n');
  const backend=await createBackend({dataRoot:dir});
  try {
    const saved=await backend.action('project.create',{name:'旧名',root:project});
    await backend.action('session.create',{projectId:saved.id});
    assert.equal((await backend.action('project.rename',{id:saved.id,name:'新名'})).name,'新名');
    await backend.action('project.remove',{id:saved.id});
    assert.deepEqual(backend.store.all('projects'),[]);
    assert.deepEqual(backend.store.all('sessions'),[]);
    assert.ok(fs.existsSync(path.join(project,'账表.csv')));
  } finally {backend.close();removeTree(dir);fs.rmSync(project,{recursive:true,force:true});}
});
