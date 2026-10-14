import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createBackend} from '../../src/host/service.mjs';
import {parseToolArguments,textToolCalls} from '../../src/harness-adapter/agent.mjs';
import {matchPlannedStep,parameterObject} from '../../src/agent/runtime.mjs';

const P={keys:'公司,凭证日期,凭证编号',debit:'借方金额',credit:'贷方金额',tolerance:'0.01'};

/** Replies with the next scripted step; a step is {call:[{name,args|raw}]} or {text}. */
async function scripted(steps){
 const requests=[];
 const server=http.createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);requests.push(body);
  const step=steps[Math.min(requests.length-1,steps.length-1)];
  const value=step.call?{choices:[{delta:{tool_calls:step.call.map((call,index)=>({index,id:'call-'+requests.length+'-'+index,type:'function',function:{name:call.name,arguments:call.raw??JSON.stringify(call.args)}}))},finish_reason:'tool_calls'}]}:{choices:[{delta:{content:step.text},finish_reason:'stop'}]};
  res.setHeader('Content-Type','text/event-stream');res.end('data: '+JSON.stringify(value)+'\n\ndata: [DONE]\n\n');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {requests,baseUrl:'http://127.0.0.1:'+server.address().port,close:()=>{server.closeAllConnections();server.close();}};
}

async function runTask(steps,text='检查序时账借贷是否平衡'){
 const provider=await scripted(steps),backend=await createBackend({dataRoot:fs.mkdtempSync(path.join(os.tmpdir(),'agent-tolerance-'))});
 try{
  await backend.action('settings.save',{baseUrl:provider.baseUrl,model:'fixture'});
  const project=await backend.action('demo.create'),session=await backend.action('session.create',{projectId:project.id});
  await backend.action('chat.send',{sessionId:session.id,text});
  for(let i=0;i<600&&(await backend.action('session.get',{id:session.id})).streaming;i++)await new Promise(resolve=>setTimeout(resolve,50));
  return {state:await backend.action('session.get',{id:session.id}),requests:provider.requests};
 }finally{provider.close();await backend.close?.();}
}

test('argument encodings real gateways send are read as the same object',()=>{
 assert.deepEqual(parseToolArguments(''),{});
 assert.deepEqual(parseToolArguments('  '),{});
 assert.deepEqual(parseToolArguments(JSON.stringify(JSON.stringify({a:1}))),{a:1});
 assert.throws(()=>parseToolArguments('[1]'),/对象/);
 assert.deepEqual(parameterObject('{"x":"1"}'),{x:'1'});
 assert.deepEqual(parameterObject(''),{});
 assert.equal(parameterObject('not json'),'not json');
 const tools=[{function:{name:'run_audit_tool'}}];
 const calls=textToolCalls('先执行\n<tool_call>\n{"name":"run_audit_tool","arguments":{"tool":"inspect"}}\n</tool_call>',tools);
 assert.equal(calls.length,1);assert.deepEqual(JSON.parse(calls[0].function.arguments),{tool:'inspect'});
 assert.deepEqual(textToolCalls('<tool_call>{"name":"rm_rf","arguments":{}}</tool_call>',tools),[]);
 assert.deepEqual(textToolCalls('普通答复',tools),[]);
});

test('plan parameters match the call whether written as numbers or text',()=>{
 const plan={steps:[{id:'a',toolId:'voucher_check',files:['x.csv'],parameters:{tolerance:0.01},dependsOn:[],status:'pending'},{id:'b',toolId:'voucher_check',files:['x.csv'],parameters:{tolerance:'1'},dependsOn:[],status:'pending'}]};
 assert.equal(matchPlannedStep(plan,'voucher_check',['x.csv'],{tolerance:'1'}).id,'b');
 assert.equal(matchPlannedStep(plan,'voucher_check',['x.csv'],{tolerance:'0.01'}).id,'a');
});

test('a task runs when the model omits arguments, sends parameters as text or writes calls into the reply',async()=>{
 const {state,requests}=await runTask([
  {call:[{name:'get_audit_tools',raw:''}]},
  {call:[{name:'run_audit_tool',args:{source:'project',tool:'voucher_check',files:['示例序时账.csv'],parameters:JSON.stringify(P)}}]},
  {text:'<tool_call>\n'+JSON.stringify({name:'get_task_result',arguments:{taskId:'later'}})+'\n</tool_call>'},
  {text:'已完成'},
 ]);
 const run=state.agentRuns.at(-1);
 assert.equal(state.tasks.length,1);assert.equal(state.tasks[0].status,'succeeded');assert.equal(run.status,'completed');
 // Calls go back to the service with valid JSON arguments, never "".
 const assistant=requests[1].messages.find(message=>message.role==='assistant'&&message.tool_calls);
 assert.equal(assistant.tool_calls[0].function.arguments,'{}');
 assert.equal(state.calls.find(call=>call.name==='get_task_result')?.status,'failed');
});

test('a saved plan follows the actual call instead of rejecting a reformatted parameter',async()=>{
 const {state}=await runTask([
  {call:[{name:'set_agent_plan',args:{workflowIds:['ledger'],steps:[{id:'s1',toolId:'inspect',files:['示例序时账.csv'],parameters:{}},{id:'s2',toolId:'voucher_check',files:['示例序时账.csv'],parameters:{...P,tolerance:0.01},dependsOn:['s1']}]}}]},
  {call:[{name:'run_audit_tool',args:{source:'project',tool:'inspect',files:['示例序时账.csv'],parameters:{}}}]},
  // A revised plan keeps the node that already ran.
  {call:[{name:'set_agent_plan',args:{workflowIds:['ledger'],steps:[{id:'s1',toolId:'inspect',files:['示例序时账.csv'],parameters:{}},{id:'s2',toolId:'voucher_check',files:['示例序时账.csv'],parameters:{...P,tolerance:'0.05'},dependsOn:['s1']}]}}]},
  {call:[{name:'run_audit_tool',args:{source:'project',tool:'voucher_check',files:['示例序时账.csv'],parameters:{...P,tolerance:'0.1'}}}]},
  {text:'已完成'},
 ]);
 const run=state.agentRuns.at(-1);
 assert.equal(run.status,'completed',JSON.stringify(state.calls.map(call=>[call.name,call.result?.error])));
 assert.deepEqual(state.tasks.map(task=>task.tool),['inspect','voucher_check']);
 const node=run.plan.steps.find(step=>step.id==='s2');
 assert.equal(node.parameters.tolerance,'0.1');assert.equal(node.revisions.length,1);
});

test('a call that keeps failing the same way stops the run instead of looping',async()=>{
 const {state,requests}=await runTask([{call:[{name:'run_audit_tool',args:{source:'project',tool:'voucher_check',files:['不存在.csv'],parameters:P}}]}]);
 assert.equal(requests.length,3);
 assert.equal(state.agentRuns.at(-1).status,'failed');
 assert.match(state.events.at(-1).text,/3 次以相同原因失败/);
 assert.match(state.calls[0].result.error,/文件不存在：不存在\.csv/);
});
