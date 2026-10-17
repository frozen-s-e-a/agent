import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {createBackend} from '../../src/host/service.mjs';
import {digest} from '../../src/agent/context.mjs';
import {agentServer} from '../fixtures/agent-server.mjs';
const root=path.resolve('artifacts/test-results');fs.mkdirSync(root,{recursive:true});

test('a resumed oversized task reads every original requirement and completes after a gateway budget rejection',async()=>{
 const dir=fs.mkdtempSync(path.join(root,'agent-context-window-')),requests=[],pages=new Map(),requirements=Array.from({length:6},(_,i)=>({id:'large-'+i,text:'第'+i+'项要求：'+'保持单位'.repeat(7500)+'最后必须保留原文件',status:'provided',source:'user'}));
 let ref,index=0,offset=0;
 const server=http.createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));requests.push(body);
  if(requests.length===1){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:'maximum context length exceeded'}}));return;}
  const last=body.messages.filter(m=>m.role==='tool').at(-1),result=last&&JSON.parse(last.content);
  if(result?.section?.startsWith('state.requirements.')&&typeof result.data==='string'){
   pages.set(result.section+':'+result.offset,result.data);
   if(result.hasMore)offset=result.nextOffset;else{index++;offset=0;}
  }
  const stateMessage=body.messages.find(m=>m.role==='system'&&String(m.content).startsWith('以下为应用从持久化记录重建'));
  const state=JSON.parse(stateMessage.content.slice(stateMessage.content.indexOf('\n')+1));ref??=state.sourceRef.id;
  let call;
  if(requests.length===2)call=null; // completion barrier must reject this answer
  else if(index<7)call={name:'read_agent_result',args:{id:ref,section:'state.requirements.'+index+'.text',offset}};
  else if(!result?.taskId)call={name:'run_audit_tool',args:{source:'project',tool:'inspect',files:['客户余额.csv'],parameters:{}}};
  res.setHeader('Content-Type','text/event-stream');
  const value=call?{choices:[{delta:{tool_calls:[{index:0,id:'context-call-'+requests.length,type:'function',function:{name:call.name,arguments:JSON.stringify(call.args)}}]},finish_reason:'tool_calls'}]}:{choices:[{delta:{content:'完成'},finish_reason:'stop'}]};
  res.end('data: '+JSON.stringify(value)+'\n\ndata: [DONE]\n\n');
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{
  const {s}=await project(backend,dir);
  const previous=backend.store.create('agentRuns',{sessionId:s.id,status:'failed',objective:'大任务',requirements,inputs:[],questions:[],steps:[],checkpoints:[],plan:{status:'pending',steps:[]}});
  await backend.action('settings.save',{baseUrl:'http://127.0.0.1:'+server.address().port,model:'fixture'});
  await backend.action('agent.resume',{id:previous.id,text:'继续完成全部已保存要求'});
  const state=await settle(backend,s.id),run=state.agentRuns.at(-1);
  assert.equal(run.status,'completed',JSON.stringify(state.events.at(-1)));assert.equal(state.tasks.length,1);assert.equal(state.tasks[0].status,'succeeded');
  for(let i=0;i<6;i++){const restored=[...pages].filter(([key])=>key.startsWith('state.requirements.'+i+'.text:')).sort(([a],[b])=>Number(a.split(':').at(-1))-Number(b.split(':').at(-1))).map(([,text])=>text).join('');assert.equal(digest(restored),digest(requirements[i].text),'requirement '+i+': restored '+restored.length+' of '+requirements[i].text.length+' characters');}
  const inputs=backend.store.bySession('agentModelInputs',s.id).filter(input=>input.runId===run.id);
  assert.ok(inputs.some(input=>input.response?.rejected));assert.ok(inputs.every(input=>input.budget.inputUpperBound+12288<=128000));assert.ok(inputs.some(input=>input.context.rendererVersion==='audit-context-builder/4'));
 }finally{backend.close();await new Promise(r=>server.close(r));}
});
async function settle(backend,id){for(let i=0;i<500;i++){const state=await backend.action('session.get',{id});if(!state.streaming)return state;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Agent timeout');}
async function scripted(calls,{answer={records:[{客户:'甲公司',余额:6000}]},finish='stop'}={}){const requests=[],server=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);requests.push(body);if(body.stream===undefined||body.stream===false){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(answer)},finish_reason:finish}],usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}}));return;}const turn=body.messages.slice(body.messages.findLastIndex(item=>item.role==='user')+1),results=turn.filter(item=>item.role==='tool').map(item=>JSON.parse(item.content)),call=typeof calls==='function'?calls(results):calls[results.length];res.setHeader('Content-Type','text/event-stream');const value=call?{choices:[{delta:{tool_calls:[{index:0,id:'call-'+results.length,type:'function',function:{name:call.name,arguments:JSON.stringify(call.args)}}]},finish_reason:'tool_calls'}]}:{choices:[{delta:{content:'模拟模型声明完成'},finish_reason:'stop'}]};res.end('data: '+JSON.stringify(value)+'\n\ndata: [DONE]\n\n');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {requests,baseUrl:`http://127.0.0.1:${server.address().port}/v1`,close:()=>new Promise(resolve=>server.close(resolve))};}
async function project(backend,dir){const inputs=path.join(dir,'inputs');fs.mkdirSync(inputs);fs.writeFileSync(path.join(inputs,'客户余额.csv'),'客户,余额,备注\n甲公司,6000,已核对\n乙公司,4000,待核对\n');const p=await backend.action('project.create',{name:'闭环测试',root:inputs}),s=await backend.action('session.create',{projectId:p.id});return {p,s,inputs};}

test('large Excel attachment is paged, read as directed evidence and then executed',async()=>{
 const dir=fs.mkdtempSync(path.join(root,'agent-large-read-')),file=path.join(dir,'大表.xlsx');
 execFileSync(path.resolve('build/python/python.exe'),['-B','-c',"import sys; sys.path.insert(0,sys.argv[2]); import openpyxl; w=openpyxl.Workbook(); s=w.active; s.title='Sheet1'; s.append(['客户']+['备注'+str(i) for i in range(10)]); [s.append(['客户'+str(i)]+['长说明'*350 for _ in range(10)]) for i in range(9)]; w.save(sys.argv[1])",file,path.resolve('build/python-packages')],{windowsHide:true});
 let attachmentId,readRef;const pages=[];
 const server=await scripted(results=>{
  if(!results.length)return {name:'preview_local_file',args:{source:'attachments',file:attachmentId,parameters:{sheets:'Sheet1'}}};
  if(results.length===1){assert.equal(results[0].truncated,true);readRef=results[0].resultRef.id;return {name:'read_agent_result',args:{id:readRef}};}
  if(results.length===2){assert.equal(results[1].overview,true);return {name:'read_agent_result',args:{id:readRef,section:'previews.0.preview',limit:50}};}
  const last=results.at(-1);
  if(last.section==='previews.0.preview'){assert.equal(last.resultRef.id,readRef);assert.ok(Buffer.byteLength(JSON.stringify(last))<=24000);pages.push(...last.data);if(last.hasMore)return {name:'read_agent_result',args:last.readHint.arguments};return {name:'get_agent_evidence',args:{files:[attachmentId],fields:['客户'],purpose:'核对客户样本',parameters:{sheets:'Sheet1'}}};}
  if(last.evidence){assert.ok(last.evidence[0].preview.length>0);assert.equal(last.evidence[0].sheet,'Sheet1');assert.deepEqual(last.evidence[0].columns,['客户']);return {name:'run_audit_tool',args:{source:'attachments',tool:'select_column',files:[attachmentId],parameters:{sheets:'Sheet1',columns:'客户'}}};}
 }),backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{
  const p=await backend.action('project.create',{name:'大结果测试',root:dir}),s=await backend.action('session.create',{projectId:p.id});
  const items=await backend.action('attachments.import',{sessionId:s.id,paths:[file]});attachmentId=items.attachments[0].id;
  await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('chat.send',{sessionId:s.id,text:'读取 Sheet1 后提取客户',attachments:[attachmentId]});
  const state=await settle(backend,s.id);assert.equal(state.agentRuns.at(-1).status,'completed',JSON.stringify(state.events.at(-1)));assert.equal(state.tasks.length,1);assert.equal(state.tasks[0].validationStatus,'passed');assert.equal(state.tasks[0].result.rowCount,9);assert.equal(pages.length,5);assert.equal(new Set(pages.map(row=>row[0])).size,5);
 }finally{backend.close();await server.close();}
});

test('explicit plan runs dependencies, records actual inputs and exposes results and sources after restart',async()=>{
 const dir=fs.mkdtempSync(path.join(root,'agent-plan-'));
 const server=await scripted([{name:'list_local_files',args:{source:'project'}},{name:'preview_local_file',args:{source:'project',file:'客户余额.csv'}},{name:'set_agent_plan',args:{workflowIds:['data'],steps:[{id:'read',toolId:'inspect',files:['客户余额.csv'],parameters:{}},{id:'write',toolId:'select_column',files:['客户余额.csv'],parameters:{columns:'客户,余额'},dependsOn:['read']}]}},{name:'run_audit_tool',args:{source:'project',tool:'inspect',files:['客户余额.csv'],parameters:{}}},{name:'run_audit_tool',args:{source:'project',tool:'select_column',files:['客户余额.csv'],parameters:{columns:'客户,余额'}}}]);
 let backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{const {s,inputs}=await project(backend,dir);await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('chat.send',{sessionId:s.id,text:'检查结构，再提取客户、余额两列'});let state=await settle(backend,s.id),run=state.agentRuns.at(-1);assert.equal(run.status,'completed');assert.equal(run.plan.status,'completed');assert.ok(run.plan.steps.every(step=>step.status==='succeeded'));assert.equal(state.tasks.length,2);assert.ok(state.tasks.every(task=>task.validationStatus==='passed'));assert.ok(run.modelInputs.length>=6);assert.ok(!state.tasks.some(task=>task.root===inputs));const result=state.tasks.at(-1),out=result.result.outputs.find(output=>output.name.endsWith('.csv'));assert.ok(out);const preview=await backend.action('result.preview',{id:result.id,name:out.name});assert.equal(preview.preview.length,2);assert.equal(preview.sourceOrigins[0].row,2);const origin=preview.sourceOrigins[1],rowSource=await backend.action('agent.sourcePreview',{sessionId:s.id,id:origin.runId,inputId:origin.inputId,row:origin.row,sheet:origin.sheet,headerRow:origin.headerRow});assert.equal(rowSource.sourceRows[0],3);assert.equal(rowSource.highlightedSourceRow,3);assert.ok(rowSource.preview[0].includes('乙公司'));const source=await backend.action('agent.sourcePreview',{sessionId:s.id,id:run.id,inputId:run.inputs[0].id});assert.equal(source.preview.length,2);backend.close();backend=await createBackend({dataRoot:path.join(dir,'state')});state=await backend.action('session.get',{id:s.id});assert.equal(state.agentRuns.at(-1).status,'completed');assert.equal(state.tasks.at(-1).publicationStatus,'published');assert.ok(fs.existsSync(await backend.action('result.path',{id:result.id,name:out.name})));}finally{backend.close();await server.close();}
});

test('premature final text cannot complete a failed or unfinished plan',async()=>{
 const dir=fs.mkdtempSync(path.join(root,'agent-gates-')),server=await scripted([{name:'set_agent_plan',args:{workflowIds:['data'],steps:[{id:'read',toolId:'inspect',files:['客户余额.csv'],parameters:{}},{id:'write',toolId:'select_column',files:['客户余额.csv'],parameters:{columns:'客户'},dependsOn:['read']}]}},{name:'run_audit_tool',args:{source:'project',tool:'select_column',files:['客户余额.csv'],parameters:{columns:'客户'}}}]),backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{const {s}=await project(backend,dir);await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('chat.send',{sessionId:s.id,text:'检查后提取'});const state=await settle(backend,s.id);assert.equal(state.agentRuns.at(-1).status,'failed');assert.equal(state.tasks.length,0);assert.match(state.events.at(-1).text,/尚未全部完成/);}finally{backend.close();await server.close();}
});

test('all independent calls enter managed tasks; business failures remain failed',async()=>{
 const dir=fs.mkdtempSync(path.join(root,'agent-independent-')),server=await scripted([{name:'audit_monthly_preview',args:{file_path:'客户余额.csv',preview_rows:2}}]),backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{const {s}=await project(backend,dir);await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('chat.send',{sessionId:s.id,text:'预览资料'});const state=await settle(backend,s.id),task=state.tasks[0];assert.equal(task.engine,'mcp');assert.equal(task.status,'succeeded',task.error);assert.equal(task.validationStatus,'passed');assert.equal(task.resultContractVersion,'audit-tool-result/1');assert.equal(state.agentRuns.at(-1).steps[0].taskId,task.id);assert.equal(state.agentRuns.at(-1).status,'completed');}finally{backend.close();await server.close();}
});

test('waiting is an explicit persisted state and interrupted execution can resume',async()=>{
 const dir=fs.mkdtempSync(path.join(root,'agent-wait-')),server=await scripted([{name:'ask_user_questions',args:{questions:['请补充期间和单位']} }]);let backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{const {s}=await project(backend,dir);await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('chat.send',{sessionId:s.id,text:'处理资料'});const state=await settle(backend,s.id);assert.equal(state.agentRuns.at(-1).status,'waiting_for_user');assert.equal(state.agentRuns.at(-1).questions.length,1);assert.match(state.events.at(-1).text,/补充期间/);const run=backend.store.create('agentRuns',{sessionId:s.id,status:'running',objective:'继续提取客户余额',requirements:[{id:'objective',text:'客户、余额两列'}],inputs:[],steps:[],questions:[]});backend.close();backend=await createBackend({dataRoot:path.join(dir,'state')});assert.equal((await backend.action('agent.get',{id:run.id})).status,'interrupted');await backend.action('agent.resume',{id:run.id,text:'2026 年，单位元'});const resumed=await settle(backend,s.id);assert.ok(resumed.agentRuns.at(-1).requirements.some(item=>item.text==='客户、余额两列'));}finally{backend.close();await server.close();}
});

test('resuming a task carries pending conversation attachments into the new run',async()=>{
 const dir=fs.mkdtempSync(path.join(root,'agent-resume-attachments-')),server=await scripted([{name:'ask_user_questions',args:{questions:['请补充期间']} }]),backend=await createBackend({dataRoot:path.join(dir,'state')} );
 try{const {s,inputs}=await project(backend,dir);const extra=path.join(inputs,'补充口径.txt');fs.writeFileSync(extra,'期间为 2025 年，单位为元');await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('chat.send',{sessionId:s.id,text:'处理资料'});let state=await settle(backend,s.id);const prior=state.agentRuns.at(-1);const imported=(await backend.action('attachments.import',{sessionId:s.id,paths:[extra]})).attachments[0];await server.close();const continuation=await scripted([{name:'resolve_agent_questions',args:{ids:[prior.questions[0].id],resolution:'附件中已明确期间和单位'}}]);try{await backend.action('settings.save',{baseUrl:continuation.baseUrl,model:'fixture'});await backend.action('agent.resume',{id:prior.id,text:'已补充，请按附件继续',attachments:[imported.id]});state=await settle(backend,s.id);const resumed=state.agentRuns.at(-1);assert.ok(resumed.inputs.some(input=>input.source==='attachment'&&input.path==='补充口径.txt'));assert.equal(resumed.status,'completed');}finally{await continuation.close();}}finally{backend.close();}
});

test('identical retries reuse verified output, changed source creates a new task',async()=>{
 const dir=fs.mkdtempSync(path.join(root,'agent-idempotent-')),server=await agentServer({source:'project',operation:'select_column'}),backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{const {s,inputs}=await project(backend,dir);await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('chat.send',{sessionId:s.id,text:'提取客户、余额'});await settle(backend,s.id);await backend.action('chat.send',{sessionId:s.id,text:'再次提取客户、余额'});let state=await settle(backend,s.id);assert.equal(state.tasks.length,1);fs.appendFileSync(path.join(inputs,'客户余额.csv'),'丙公司,10,新增\n');await backend.action('chat.send',{sessionId:s.id,text:'重新提取客户、余额'});state=await settle(backend,s.id);assert.equal(state.tasks.length,2);assert.notEqual(state.agentRuns[0].inputVersion,state.agentRuns.at(-1).inputVersion);}finally{backend.close();await server.close();}
});

for(const finish of ['stop','length'])test('task-internal model inputs are recorded and truncated outputs are blocked: '+finish,async()=>{
 const dir=fs.mkdtempSync(path.join(root,'agent-inner-')),server=await scripted([{name:'audit_info_extract',args:{folder:'说明.txt',role_prompt:'提取客户和余额',max_workers:1}}],{finish}),backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{const {s,inputs}=await project(backend,dir);fs.writeFileSync(path.join(inputs,'说明.txt'),'甲公司，余额 6000 元');await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('chat.send',{sessionId:s.id,text:'从说明中提取客户和余额'});const state=await settle(backend,s.id),task=state.tasks[0];assert.equal(task.status,finish==='stop'?'succeeded':'failed',task.error);const requests=backend.store.all('agentModelInputs').filter(input=>input.taskId===task.id);assert.ok(requests.length>=1);assert.match(JSON.stringify(requests[0].messages),/6000/);assert.ok(state.agentRuns.at(-1).modelInputs.includes(requests[0].id));assert.equal(requests[0].budget.measuredTokenizer,false);assert.equal(requests.at(-1).response.finishReason,finish);if(finish==='length')assert.equal(state.agentRuns.at(-1).status,'failed');}finally{backend.close();await server.close();}
});

test('a task published before interruption is recovered and no new output is generated',async()=>{
 const dir=fs.mkdtempSync(path.join(root,'agent-publication-')),server=await agentServer({source:'project',operation:'select_column'});let backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{const {s}=await project(backend,dir);await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('chat.send',{sessionId:s.id,text:'提取客户、余额'});const state=await settle(backend,s.id),task=state.tasks[0];backend.store.put('tasks',{...task,status:'running',result:null});backend.close();backend=await createBackend({dataRoot:path.join(dir,'state')});const recovered=backend.store.get('tasks',task.id);assert.equal(recovered.status,'succeeded',recovered.recoveryError);assert.equal(recovered.validationStatus,'passed');assert.ok(recovered.recoveredAt);assert.equal(backend.store.all('tasks').length,1);}finally{backend.close();await server.close();}
});

test('changes to an unrelated input keep the verified node output reusable',async()=>{
 const dir=fs.mkdtempSync(path.join(root,'agent-scoped-version-')),server=await agentServer({source:'project',operation:'select_column'}),backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{const {s,inputs}=await project(backend,dir);fs.mkdirSync(path.join(inputs,'其他资料'));fs.writeFileSync(path.join(inputs,'其他资料','备注.txt'),'旧说明');await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('chat.send',{sessionId:s.id,text:'提取客户、余额'});let state=await settle(backend,s.id);assert.equal(state.tasks.length,1);const version=state.agentRuns.at(-1).inputVersion;fs.writeFileSync(path.join(inputs,'其他资料','备注.txt'),'新说明');await backend.action('chat.send',{sessionId:s.id,text:'再次提取客户、余额'});state=await settle(backend,s.id);assert.equal(state.tasks.length,1);assert.equal(state.agentRuns.at(-1).status,'completed');assert.notEqual(state.agentRuns.at(-1).inputVersion,version);}finally{backend.close();await server.close();}
});

test('validated prior output can feed a later task and directed evidence retains its source',async()=>{
 const dir=fs.mkdtempSync(path.join(root,'agent-result-chain-'));let priorId,priorPath;
 const server=await scripted(results=>!priorId?[{name:'run_audit_tool',args:{source:'project',tool:'select_column',files:['客户余额.csv'],parameters:{columns:'客户,余额'}}}][results.length]:[
 {name:'load_task_outputs',args:{taskId:priorId,paths:[priorPath]}},
 {name:'get_agent_evidence',args:{files:[results[0]?.files?.[0]?.inputRef],fields:['余额'],purpose:'核对已完成的两行余额'}},
 {name:'run_audit_tool',args:{source:'project',tool:'inspect',files:[results[0]?.files?.[0]?.file],parameters:{}}}
 ][results.length]),backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{const {s}=await project(backend,dir);await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('chat.send',{sessionId:s.id,text:'提取客户、余额'});let state=await settle(backend,s.id);priorId=state.tasks[0].id;priorPath=state.tasks[0].result.outputs.find(output=>output.name.endsWith('.csv')).path;await backend.action('chat.send',{sessionId:s.id,text:'使用刚才成果核查余额结构'});state=await settle(backend,s.id);assert.equal(state.agentRuns.at(-1).status,'completed',JSON.stringify(state.events.at(-1)));assert.equal(state.tasks.length,2);const run=state.agentRuns.at(-1);assert.ok(run.inputs.some(input=>input.sourceTaskId===priorId&&input.status==='validated_result'));const evidence=backend.store.all('agentToolResults').find(result=>result.runId===run.id&&result.name==='get_agent_evidence').result;assert.deepEqual(evidence.evidence[0].columns,['余额']);assert.equal(evidence.evidence[0].preview.length,2);assert.equal(evidence.evidence[0].previewIsSample,true);const outer=backend.store.all('agentModelInputs').find(input=>input.runId===run.id);assert.ok(outer.transportRequests[0].body.stream);assert.deepEqual(outer.messages,outer.transportRequests[0].body.messages);assert.ok(!JSON.stringify(outer).includes('Authorization'));}finally{backend.close();await server.close();}
});

test('an explicit user reply resolves persisted questions with its original message reference',async()=>{
 const dir=fs.mkdtempSync(path.join(root,'agent-answer-'));let questionId;
 const server=await scripted(results=>[questionId?{name:'resolve_agent_questions',args:{ids:[questionId],resolution:'期间为 2026 年，金额单位元'}}:{name:'ask_user_questions',args:{questions:['请说明期间和单位']}}][results.length]),backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{const {s}=await project(backend,dir);await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('chat.send',{sessionId:s.id,text:'核查客户余额'});let state=await settle(backend,s.id);const prior=state.agentRuns.at(-1);questionId=prior.questions[0].id;await backend.action('chat.send',{sessionId:s.id,text:'期间为2026年，金额单位元'});state=await settle(backend,s.id);const answered=backend.store.get('agentRuns',prior.id).questions[0];assert.equal(answered.status,'answered');assert.equal(answered.responseText,'期间为2026年，金额单位元');assert.ok(state.events.some(event=>event.id===answered.userEventId&&event.type==='user'));assert.equal(state.agentRuns.at(-1).status,'completed');}finally{backend.close();await server.close();}
});

test('independent publication survives restart with its actual structured result',async()=>{
 const dir=fs.mkdtempSync(path.join(root,'agent-mcp-publication-')),server=await scripted([{name:'audit_monthly_preview',args:{file_path:'客户余额.csv',preview_rows:2}}]);let backend=await createBackend({dataRoot:path.join(dir,'state')});
 try{const {s}=await project(backend,dir);await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('chat.send',{sessionId:s.id,text:'预览资料'});const state=await settle(backend,s.id),task=state.tasks[0];assert.equal(task.status,'succeeded');const files=task.result.files;backend.store.put('tasks',{...task,status:'running',result:null});backend.close();backend=await createBackend({dataRoot:path.join(dir,'state')});const recovered=backend.store.get('tasks',task.id);assert.equal(recovered.status,'succeeded',recovered.recoveryError);assert.equal(recovered.validationStatus,'passed');assert.deepEqual(recovered.result.files,files);assert.equal(backend.store.all('tasks').length,1);}finally{backend.close();await server.close();}
});
