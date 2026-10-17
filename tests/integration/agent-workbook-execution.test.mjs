import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {createBackend} from '../../src/host/service.mjs';
import {fileHash} from '../../src/agent/inputs.mjs';

const resultRoot=path.resolve('artifacts/test-results');fs.mkdirSync(resultRoot,{recursive:true});
const python=process.env.AUDIT_PYTHON||path.resolve('build/python/python.exe');
function createFixture(dir){
 const env={...process.env,PYTHONPATH:path.resolve('build/python-packages')};
 execFileSync(python,['-X','utf8','-B','-c','import sys,json;from pathlib import Path;sys.path.insert(0,sys.argv[2]);from test_workbook_plan import fixture;f,p=fixture(Path(sys.argv[1]));(f.parent/"plan.json").write_text(json.dumps(p,ensure_ascii=False),encoding="utf-8")',dir,path.resolve('tests/integration')],{env,windowsHide:true});
 return {file:path.join(dir,'普通模板.xlsx'),plan:JSON.parse(fs.readFileSync(path.join(dir,'plan.json'),'utf8'))};
}
function createLedger(dir){
 const env={...process.env,PYTHONPATH:path.resolve('build/python-packages')};
 execFileSync(python,['-X','utf8','-B','-c','import sys,json;from pathlib import Path;sys.path.insert(0,sys.argv[2]);from test_workbook_plan import ledger_fixture;f,p=ledger_fixture(Path(sys.argv[1]));(f.parent/"plan.json").write_text(json.dumps(p,ensure_ascii=False),encoding="utf-8")',dir,path.resolve('tests/integration')],{env,windowsHide:true});
 return {file:path.join(dir,'投资收益底稿.xlsx'),plan:JSON.parse(fs.readFileSync(path.join(dir,'plan.json'),'utf8'))};
}
function references(plan,id){
 const rewrite=value=>Array.isArray(value)?value.map(rewrite):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,key==='file_path'?id:rewrite(item)])):value;
 return rewrite(plan);
}
async function model(next){
 const requests=[];const server=http.createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));requests.push(body);
  try{
   const action=next(requests.length-1,body);
   if(action?.error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:action.error}}));return;}
   const delta=action?{tool_calls:[{index:0,id:'workbook-call-'+requests.length,type:'function',function:{name:action.name,arguments:JSON.stringify(action.args)}}]}:{content:'三个目标工作表已填写，实际工作簿已逐项重读核对。'};
   res.setHeader('Content-Type','text/event-stream');res.end('data: '+JSON.stringify({choices:[{delta,finish_reason:action?'tool_calls':'stop'}]})+'\n\ndata: [DONE]\n\n');
  }catch(error){res.writeHead(500);res.end(error.message);}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {requests,url:'http://127.0.0.1:'+server.address().port+'/v1',close:()=>new Promise(resolve=>server.close(resolve))};
}
async function settle(backend,id){for(let i=0;i<500;i++){const state=await backend.action('session.get',{id});if(!state.streaming)return state;await new Promise(resolve=>setTimeout(resolve,40));}throw Error('workbook Agent timed out');}
function savedPlan(body){return body.messages.filter(message=>message.role==='tool').map(message=>{try{return JSON.parse(message.content);}catch{return null;}}).findLast(result=>result?.planHash);}

test('ordinary attachment is planned, filled across three sheets and verified by the real worker',async()=>{
 const dir=fs.mkdtempSync(path.join(resultRoot,'workbook-flow-')),fixture=createFixture(dir);let attachment;
 const server=await model((index,body)=>[
  {name:'read_workbook_range',args:{file:attachment}},
  {name:'save_workbook_plan',args:{plan:references(fixture.plan,attachment)}},
  {name:'execute_workbook_plan',args:{planHash:savedPlan(body)?.planHash}},
 ][index]);const backend=await createBackend({dataRoot:path.join(dir,'state')});const original=fileHash(fixture.file);
 try{
  const session=await backend.action('session.create');attachment=(await backend.action('attachments.import',{sessionId:session.id,paths:[fixture.file]})).attachments[0].id;
  await backend.action('settings.save',{baseUrl:server.url,model:'local-scripted-contract'});await backend.action('chat.send',{sessionId:session.id,text:'用 Sheet1 的实际年度列填写前三个 sheet，保留已有差额和比例公式',attachments:[attachment]});
  const state=await settle(backend,session.id),run=state.agentRuns.at(-1),task=state.tasks[0];
  assert.equal(run.status,'completed',JSON.stringify(state.events.at(-1)));assert.equal(state.tasks.length,1);assert.equal(task.tool,'workbook_fill');assert.equal(task.validation.level,'mapped_write_and_reread');
  assert.equal(run.workbook.phase,'verified');assert.equal(run.plan.steps[0].status,'succeeded');assert.equal(task.result.workbookValidation.verifiedCount,12);assert.deepEqual(task.result.workbookValidation.targetSheets,['Lead Schedule','Disclosure','BKD24']);
  assert.equal(fileHash(fixture.file),original);assert.ok(fs.existsSync(path.join(task.root,task.result.outputs.find(output=>output.name==='填写成果.xlsx').path)));
  const receipt=JSON.parse(fs.readFileSync(path.join(task.root,task.result.outputs.find(output=>output.name==='填写核对.json').path),'utf8'));
  assert.equal(receipt.cells.find(cell=>cell.sheet==='Lead Schedule'&&cell.cell==='C3').expected,'7260');assert.equal(receipt.cells.find(cell=>cell.sheet==='Lead Schedule'&&cell.cell==='E3').expected,'6660');
  assert.equal(server.requests.length,4);assert.ok(server.requests[2].messages.some(message=>String(message.content).includes('execute_workbook_plan')));
 }finally{backend.close();await server.close();}
});

test('a period conflict goes back to the model, which corrects the mapping before any write task',async()=>{
 const dir=fs.mkdtempSync(path.join(resultRoot,'workbook-period-')),fixture=createFixture(dir);let attachment;
 const conflicting=structuredClone(fixture.plan);conflicting.periodChecks[0].target.cell='D2';
 const server=await model((index,body)=>[{name:'read_workbook_range',args:{file:attachment}},{name:'save_workbook_plan',args:{plan:references(conflicting,attachment)}},{name:'save_workbook_plan',args:{plan:references(fixture.plan,attachment)}},{name:'execute_workbook_plan',args:{planHash:savedPlan(body)?.planHash}}][index]);const backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{
  const session=await backend.action('session.create');attachment=(await backend.action('attachments.import',{sessionId:session.id,paths:[fixture.file]})).attachments[0].id;
  await backend.action('settings.save',{baseUrl:server.url,model:'local-scripted-contract'});await backend.action('chat.send',{sessionId:session.id,text:'用 Sheet1 填写前三个 sheet',attachments:[attachment]});
  const state=await settle(backend,session.id),run=state.agentRuns.at(-1);
  const revision=JSON.parse(server.requests[2].messages.filter(message=>message.role==='tool').at(-1).content);assert.equal(revision.status,'plan_revision');assert.match(revision.error,/期间/);
  assert.equal(run.status,'completed',JSON.stringify(state.events.at(-1)));assert.equal(run.questions.length,0);assert.equal(state.tasks.length,1);
 }finally{backend.close();await server.close();}
});

test('the reported fill asks once for the trial balance year and completes after the answer',async()=>{
 const dir=fs.mkdtempSync(path.join(resultRoot,'workbook-ledger-')),fixture=createLedger(dir);let attachment,asked;
 // First attempt points the period check at the untitled trial balance; the model then asks for the year.
 const guess=structuredClone(fixture.plan);for(const check of guess.periodChecks)if(check.source.confirmedYear)check.source={file_path:check.source.file_path,sheet:'Sheet1',cell:'A1'};
 const server=await model((index,body)=>{
  if(index===0)return {name:'save_workbook_plan',args:{plan:references(guess,attachment)}};
  if(index===1){asked=JSON.parse(body.messages.at(-1).content);return {name:'ask_user_questions',args:{questions:['Sheet1 科目余额表没有标示期间，是哪一年的数据？']}};}
  if(index===2){
   // The continuation sees the plan it was revising and the answer, then records the stated year.
   assert.ok(body.messages.some(message=>message.role==='system'&&String(message.content).includes('上次提交的填写计划')&&String(message.content).includes('科目余额表')));
   return {name:'save_workbook_plan',args:{plan:references(fixture.plan,attachment)}};
  }
  if(index===3)return {name:'execute_workbook_plan',args:{planHash:savedPlan(body)?.planHash}};
  return null;
 });const backend=await createBackend({dataRoot:path.join(dir,'state')});const original=fileHash(fixture.file);
 try{
  const session=await backend.action('session.create');attachment=(await backend.action('attachments.import',{sessionId:session.id,paths:[fixture.file]})).attachments[0].id;
  await backend.action('settings.save',{baseUrl:server.url,model:'local-scripted-contract'});await backend.action('chat.send',{sessionId:session.id,text:'用sheet1表格填写前三个sheet表',attachments:[attachment]});
  let state=await settle(backend,session.id);const first=state.agentRuns.at(-1);
  assert.equal(asked.status,'plan_revision');assert.match(asked.hint,/confirmedYear/);assert.equal(first.status,'waiting_for_user');assert.equal(state.tasks.length,0);
  await backend.action('agent.resume',{id:first.id,text:'补充说明：\n1. Sheet1 科目余额表没有标示期间，是哪一年的数据？\n回答：2025年',attachments:[]});
  state=await settle(backend,session.id);const run=state.agentRuns.at(-1),task=state.tasks[0];
  assert.equal(run.status,'completed',JSON.stringify(state.events.at(-1)));assert.equal(state.agentRuns[0].questions[0].status,'answered');
  assert.equal(task.result.workbookValidation.verifiedCount,41);assert.equal(fileHash(fixture.file),original);
  const receipt=JSON.parse(fs.readFileSync(path.join(task.root,task.result.outputs.find(output=>output.name==='填写核对.json').path),'utf8'));
  const cell=(sheet,ref)=>receipt.cells.find(item=>item.sheet===sheet&&item.cell===ref).expected;
  assert.equal(cell('Lead Schedule','B5'),'3300000');assert.equal(cell('Lead Schedule','D8'),'-12000');assert.equal(cell('Disclosure','B4'),'3300000');assert.equal(cell('BKD24','J4'),'2500000');assert.equal(cell('Lead Schedule','G6'),'#DIV/0!');
 }finally{backend.close();await server.close();}
});

test('a year typed in the chat instead of the question form also revises the waiting plan',async()=>{
 const dir=fs.mkdtempSync(path.join(resultRoot,'workbook-typed-')),fixture=createLedger(dir);let attachment,question;
 const guess=structuredClone(fixture.plan);for(const check of guess.periodChecks)if(check.source.confirmedYear)check.source={file_path:check.source.file_path,sheet:'Sheet1',cell:'A1'};
 const server=await model((index,body)=>{
  if(index===0)return {name:'save_workbook_plan',args:{plan:references(guess,attachment)}};
  if(index===1)return {name:'ask_user_questions',args:{questions:['Sheet1 科目余额表没有标示期间，是哪一年的数据？']}};
  if(index===2){assert.ok(body.messages.some(message=>message.role==='system'&&String(message.content).includes('上次提交的填写计划')));return {name:'resolve_agent_questions',args:{ids:[question],resolution:'用户在对话中说明是 2025 年'}};}
  if(index===3)return {name:'save_workbook_plan',args:{plan:references(fixture.plan,attachment)}};
  if(index===4)return {name:'execute_workbook_plan',args:{planHash:savedPlan(body)?.planHash}};
  return null;
 });const backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{
  const session=await backend.action('session.create');attachment=(await backend.action('attachments.import',{sessionId:session.id,paths:[fixture.file]})).attachments[0].id;
  await backend.action('settings.save',{baseUrl:server.url,model:'local-scripted-contract'});await backend.action('chat.send',{sessionId:session.id,text:'用sheet1表格填写前三个sheet表',attachments:[attachment]});
  let state=await settle(backend,session.id);assert.equal(state.agentRuns.at(-1).status,'waiting_for_user');question=state.agentRuns.at(-1).questions[0].id;
  await backend.action('chat.send',{sessionId:session.id,text:'是2025年的数据'});
  state=await settle(backend,session.id);const run=state.agentRuns.at(-1);
  assert.equal(run.status,'completed',JSON.stringify(state.events.at(-1)));assert.equal(state.tasks[0].result.workbookValidation.verifiedCount,41);
 }finally{backend.close();await server.close();}
});

test('restart and continue recover the validated mapping and execute without reading again',async()=>{
 const dir=fs.mkdtempSync(path.join(resultRoot,'workbook-restart-')),fixture=createFixture(dir),dataRoot=path.join(dir,'state');let attachment,mode='plan',hash;
 const server=await model((index,body)=>{
  if(mode==='plan')return [{name:'read_workbook_range',args:{file:attachment}},{name:'save_workbook_plan',args:{plan:references(fixture.plan,attachment)}},{error:'controlled interruption after saving the plan'}][index];
  if(mode==='execute'){mode='done';assert.ok(body.messages.some(message=>String(message.content).includes(hash)));return {name:'execute_workbook_plan',args:{planHash:hash}};}
  return null;
 });let backend=await createBackend({dataRoot});
 try{
  const session=await backend.action('session.create');attachment=(await backend.action('attachments.import',{sessionId:session.id,paths:[fixture.file]})).attachments[0].id;
  await backend.action('settings.save',{baseUrl:server.url,model:'local-scripted-contract'});await backend.action('chat.send',{sessionId:session.id,text:'用 Sheet1 填写前三个 sheet',attachments:[attachment]});
  let state=await settle(backend,session.id);const prior=state.agentRuns.at(-1);assert.equal(prior.status,'failed');hash=prior.workbook.prepared.planHash;assert.ok(hash);assert.equal(state.tasks.length,0);
  backend.close();backend=await createBackend({dataRoot});mode='execute';await backend.action('chat.send',{sessionId:session.id,text:'那继续做'});
  state=await settle(backend,session.id);assert.equal(state.agentRuns.at(-1).status,'completed',JSON.stringify(state.events.at(-1)));assert.equal(state.agentRuns.at(-1).workbook.prepared.planHash,hash);assert.equal(state.tasks.length,1);
  assert.deepEqual(state.calls.filter(call=>call.runId===state.agentRuns.at(-1).id).map(call=>call.name),['execute_workbook_plan']);
 }finally{backend.close();await server.close();}
});

test('a plan defect goes back to the model, which corrects it and fills without asking the user',async()=>{
 const dir=fs.mkdtempSync(path.join(resultRoot,'workbook-revise-')),fixture=createFixture(dir);let attachment;
 const incomplete={...fixture.plan,periodChecks:[]};
 const server=await model((index,body)=>[
  {name:'save_workbook_plan',args:{plan:references(incomplete,attachment)}},
  {name:'save_workbook_plan',args:{plan:references(fixture.plan,attachment)}},
  {name:'execute_workbook_plan',args:{planHash:savedPlan(body)?.planHash}},
 ][index]);const backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{
  const session=await backend.action('session.create');attachment=(await backend.action('attachments.import',{sessionId:session.id,paths:[fixture.file]})).attachments[0].id;
  await backend.action('settings.save',{baseUrl:server.url,model:'local-scripted-contract'});await backend.action('chat.send',{sessionId:session.id,text:'用 Sheet1 填写前三个 sheet',attachments:[attachment]});
  const state=await settle(backend,session.id),run=state.agentRuns.at(-1);
  const first=JSON.parse(server.requests[1].messages.filter(message=>message.role==='tool').at(-1).content);
  assert.equal(first.status,'plan_revision');assert.match(first.error,/计划没有核对来源期间/);assert.match(first.hint,/periodChecks/);
  assert.equal(run.status,'completed',JSON.stringify(state.events.at(-1)));assert.equal(run.questions.length,0);assert.equal(state.tasks[0].status,'succeeded');
 }finally{backend.close();await server.close();}
});
