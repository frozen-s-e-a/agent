import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createBackend} from '../../src/host/service.mjs';

const root=path.resolve('artifacts/test-results');fs.mkdirSync(root,{recursive:true});
async function provider(next){
 const requests=[];
 const server=http.createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);requests.push(body);
  const step=next(requests.length-1,body),call=step.call;
  const delta=call?{tool_calls:[{index:0,id:'call-'+requests.length,type:'function',function:{name:call.name,arguments:JSON.stringify(call.args)}}]}:{content:step.text||'已完成'};
  res.setHeader('Content-Type','text/event-stream');res.end('data: '+JSON.stringify({choices:[{delta,finish_reason:call?'tool_calls':step.finish||'stop'}]})+'\n\ndata: [DONE]\n\n');
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {requests,baseUrl:'http://127.0.0.1:'+server.address().port,close:()=>{server.closeAllConnections();server.close();}};
}
async function settle(backend,id){for(let i=0;i<400;i++){const state=await backend.action('session.get',{id});if(!state.streaming)return state;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('test run did not settle');}
async function fixture(next){
 const dir=fs.mkdtempSync(path.join(root,'agent-read-progress-')),server=await provider(next),backend=await createBackend({dataRoot:path.join(dir,'state')});
 await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});
 const folder=path.join(dir,'project');fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'客户余额.csv'),'客户,余额\n甲公司,100\n乙公司,200\n');
 const project=await backend.action('project.create',{name:'读取进展回归',root:folder}),session=await backend.action('session.create',{projectId:project.id});
 const oldTask=backend.store.create('tasks',{sessionId:session.id,tool:'mcp_detailed_table_inspect',status:'succeeded',validationStatus:'passed',result:{columns:['客户','余额'],sample_rows:[{客户:'甲公司',余额:100},{客户:'乙公司',余额:200}],preview:[{客户:'甲公司',余额:100}],outputs:[]}});
 return {dir,server,backend,session,oldTask,close:()=>{backend.close();server.close();}};
}

test('the captured repeated narration fails immediately instead of continuing text and marking completion',async()=>{
 const prose='让我直接查看之前检查任务的结果内容。这些任务编号需要从保存记录中读取，然后继续完成用户要求的表格填写步骤。\n\n让我查看这些任务的结果。由于结果记录很多，我需要找到对应的结果引用，再查看之前检查任务的具体结果内容。\n\n';
 const f=await fixture(()=>({text:prose.repeat(30)+'让我直接查看之前',finish:'length'}));
 try{
  await f.backend.action('chat.send',{sessionId:f.session.id,text:'用 Sheet1 填写前三个表'});
  const state=await settle(f.backend,f.session.id);
  assert.equal(state.agentRuns.at(-1).status,'failed');assert.equal(f.server.requests.length,1);assert.equal(state.tasks.length,1);
  assert.match(state.events.at(-1).text,/重复输出.*任务尚未完成/);
  const inputs=f.backend.store.bySession('agentModelInputs',f.session.id);assert.equal(inputs[0].response.finishReason,'repetition');
 }
 finally{f.close();}
});

test('a repeated successful task read stops without pretending that inspection filled the workbook',async()=>{
 let taskId;const f=await fixture(()=>({call:{name:'read_agent_result',args:{taskId,section:'sample_rows'}}}));taskId=f.oldTask.id;
 try{
  await f.backend.action('chat.send',{sessionId:f.session.id,text:'用 Sheet1 填写前三个表'});
  const state=await settle(f.backend,f.session.id),run=state.agentRuns.at(-1);
  assert.equal(run.status,'failed');assert.equal(f.server.requests.length,4);assert.equal(state.calls.length,4);
  assert.ok(state.calls.every(call=>call.status==='succeeded'));assert.match(state.events.at(-1).text,/重复读取.*没有新增数据/);
  assert.equal(state.calls.at(-1).result.readProgress.stop,true);
 }finally{f.close();}
});

test('continue after a progress answer carries the original filling goal and refuses read-only completion',async()=>{
 const f=await fixture(()=>({text:'已完成'}));
 try{
  const original=f.backend.store.create('agentRuns',{sessionId:f.session.id,status:'failed',objective:'用 Sheet1 填写前三个表',requirements:[{id:'goal',text:'用 Sheet1 填写前三个表',source:'user',status:'provided'}],inputs:[],questions:[],steps:[],checkpoints:[],plan:{status:'pending',steps:[]}});
  f.backend.store.create('agentRuns',{sessionId:f.session.id,status:'completed',objective:'刚才的任务执行到哪里了',requirements:[{id:'progress',text:'刚才的任务执行到哪里了'}],inputs:[],questions:[],steps:[],checkpoints:[],plan:{status:'pending',steps:[]}});
  await f.backend.action('chat.send',{sessionId:f.session.id,text:'那继续做'});
  const state=await settle(f.backend,f.session.id),run=state.agentRuns.at(-1);
  assert.equal(run.continuationOf,original.id);assert.equal(run.executionObjective,original.objective);assert.ok(run.requirements.some(item=>item.id==='goal'));
  assert.equal(run.requiresTaskExecution,true);assert.equal(run.status,'failed');assert.match(state.events.at(-1).text,/没有实际执行审计任务/);
 }finally{f.close();}
});

test('an ordinary progress question can finish without executing the unfinished filling task',async()=>{
 const f=await fixture(()=>({text:'目前只完成了结构检查，尚未填写工作簿。'}));
 try{
  f.backend.store.create('agentRuns',{sessionId:f.session.id,status:'failed',objective:'用 Sheet1 填写前三个表',requirements:[{id:'goal',text:'用 Sheet1 填写前三个表'}],inputs:[],questions:[],steps:[],checkpoints:[],plan:{status:'pending',steps:[]}});
  await f.backend.action('chat.send',{sessionId:f.session.id,text:'刚才的任务执行到哪里了'});
  const state=await settle(f.backend,f.session.id),run=state.agentRuns.at(-1);
  assert.equal(run.requiresTaskExecution,false);assert.equal(run.status,'completed');assert.equal(f.server.requests.length,1);
 }finally{f.close();}
});

test('direct task lookup can lead to a real new artifact without scanning hundreds of wrapper references',async()=>{
 let taskId;const f=await fixture((index,body)=>{
  if(index===0){const stateMessage=body.messages.find(m=>m.role==='system'&&String(m.content).startsWith('以下为应用从持久化记录重建'));const state=JSON.parse(stateMessage.content.slice(stateMessage.content.indexOf('\n')+1));assert.equal(state.results.length,1);assert.equal(state.results[0].taskId,taskId);return {call:{name:'get_task_result',args:{taskId}}};}
  if(index===1)return {call:{name:'read_agent_result',args:{taskId,section:'sample_rows'}}};
  if(index===2)return {call:{name:'run_audit_tool',args:{source:'project',tool:'select_column',files:['客户余额.csv'],parameters:{columns:'客户,余额'}}}};
  return {text:'已实际提取两行数据，并生成新成果。'};
 });taskId=f.oldTask.id;
 try{
  const old=f.backend.store.create('agentRuns',{sessionId:f.session.id,status:'failed',objective:'提取客户余额两列',requirements:[{id:'goal',text:'提取客户余额两列'}],inputs:[],questions:[],checkpoints:[],plan:{status:'pending',steps:[]},steps:Array.from({length:282},(_,i)=>({id:'old-'+i,name:'read_agent_result',status:'succeeded',result:{resultRef:{kind:'agentToolResults',id:'context-old-'+i}}}))});
  f.backend.store.create('agentRuns',{sessionId:f.session.id,status:'completed',objective:'刚才的任务执行到哪里了',requirements:[{id:'progress',text:'刚才的任务执行到哪里了'}],inputs:[],questions:[],steps:[],checkpoints:[],plan:{status:'pending',steps:[]}});
  await f.backend.action('chat.send',{sessionId:f.session.id,text:'那继续做'});
  const state=await settle(f.backend,f.session.id),run=state.agentRuns.at(-1);assert.equal(run.status,'completed',JSON.stringify(state.events.at(-1)));assert.equal(run.continuationOf,old.id);
  const task=state.tasks.find(task=>task.tool==='select_column');assert.equal(task.status,'succeeded');assert.equal(task.validationStatus,'passed');assert.equal(task.result.rowCount,2);
  const output=task.result.outputs.find(file=>file.name.endsWith('.csv'));assert.ok(output);assert.ok(fs.existsSync(path.join(task.root,output.path)));
  assert.deepEqual(state.calls[0].result.resultRef,{kind:'tasks',id:taskId});assert.equal(state.calls[1].result.data.length,2);assert.equal(f.server.requests.length,4);
 }finally{f.close();}
});
