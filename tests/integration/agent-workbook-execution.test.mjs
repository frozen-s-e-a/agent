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

test('period conflict becomes a persisted question before any write task',async()=>{
 const dir=fs.mkdtempSync(path.join(resultRoot,'workbook-period-')),fixture=createFixture(dir);let attachment;
 fixture.plan.periodChecks[0].target.cell='D2';
 const server=await model(index=>[{name:'read_workbook_range',args:{file:attachment}},{name:'save_workbook_plan',args:{plan:references(fixture.plan,attachment)}}][index]);const backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{
  const session=await backend.action('session.create');attachment=(await backend.action('attachments.import',{sessionId:session.id,paths:[fixture.file]})).attachments[0].id;
  await backend.action('settings.save',{baseUrl:server.url,model:'local-scripted-contract'});await backend.action('chat.send',{sessionId:session.id,text:'用 Sheet1 填写前三个 sheet',attachments:[attachment]});
  const state=await settle(backend,session.id),run=state.agentRuns.at(-1);assert.equal(run.status,'waiting_for_user');assert.equal(state.tasks.length,0);assert.match(run.questions[0].text,/期间不同/);assert.equal(server.requests.length,2);
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
