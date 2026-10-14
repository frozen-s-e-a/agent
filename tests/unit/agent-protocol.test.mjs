import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {runAgent} from '../../src/harness-adapter/agent.mjs';
const definition=[{type:'function',function:{name:'read_file',description:'fixture',parameters:{type:'object',properties:{},additionalProperties:false}}}];
async function provider(frames){const requests=[];const server=http.createServer(async(req,res)=>{let raw='';for await(const b of req)raw+=b;requests.push(JSON.parse(raw));res.setHeader('Content-Type','text/event-stream');res.end(frames(requests.length));});await new Promise(r=>server.listen(0,'127.0.0.1',r));return {requests,url:`http://127.0.0.1:${server.address().port}/v1`,close:()=>new Promise(r=>server.close(r))};}
const frame=(name,args,finish=true)=>'data: '+JSON.stringify({choices:[{delta:{tool_calls:[{index:0,id:'call-1',type:'function',function:{name,arguments:args}}]},...(finish?{finish_reason:'tool_calls'}:{})}]})+'\n\n'+(finish?'data: [DONE]\n\n':'');
const done='data: '+JSON.stringify({choices:[{delta:{content:'结束'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n';
test('unknown tools and malformed arguments are returned as errors without execution',async()=>{for(const [name,args] of [['shell','{}'],['read_file','{broken']]){let count=0;const p=await provider(n=>n===1?frame(name,args):done);try{const r=await runAgent({settings:{baseUrl:p.url,model:'fixture'},key:'',messages:[],signal:new AbortController().signal,tools:definition,execute:()=>{count++;return {ok:true};},onDelta:()=>{}});assert.equal(count,0);assert.equal(r.text,'结束');assert.equal(JSON.parse(p.requests[1].messages.at(-1).content).ok,false);}finally{await p.close();}}});
test('a dropped tool stream cannot execute incomplete arguments',async()=>{let count=0;const p=await provider(()=>frame('read_file','{}',false));try{await assert.rejects(runAgent({settings:{baseUrl:p.url,model:'fixture'},key:'',messages:[],signal:new AbortController().signal,tools:definition,execute:()=>{count++;},onDelta:()=>{}}),/不完整/);assert.equal(count,0);}finally{await p.close();}});
test('agent completes after exceeding all former round and tool-call limits',async()=>{
 let count=0;const rounds=[],p=await provider(n=>n<=60?frame('read_file','{}'):done);
 try{
  const result=await runAgent({settings:{baseUrl:p.url,model:'fixture'},key:'',messages:[],signal:new AbortController().signal,tools:definition,execute:()=>{count++;return {ok:true};},onRound:round=>rounds.push(round),onDelta:()=>{}});
  assert.equal(result.text,'结束');assert.equal(count,60);assert.equal(result.toolCount,60);assert.equal(p.requests.length,61);assert.deepEqual(rounds,Array.from({length:61},(_,i)=>i));
 }finally{await p.close();}
});
test('an unbounded agent loop still stops when cancelled',async()=>{
 let count=0;const controller=new AbortController(),p=await provider(()=>frame('read_file','{}'));
 try{
  await assert.rejects(runAgent({settings:{baseUrl:p.url,model:'fixture'},key:'',messages:[],signal:controller.signal,tools:definition,execute:()=>{count++;if(count===25)controller.abort();return {ok:true};},onDelta:()=>{}}),{name:'AbortError'});
  assert.equal(count,25);assert.equal(p.requests.length,25);
 }finally{await p.close();}
});
test('an unbounded agent loop can pause for user input',async()=>{
 let count=0;const p=await provider(()=>frame('read_file','{}'));
 try{
  const result=await runAgent({settings:{baseUrl:p.url,model:'fixture'},key:'',messages:[],signal:new AbortController().signal,tools:definition,execute:()=>{count++;return {ok:true};},shouldStop:()=>count===25,onDelta:()=>{}});
  assert.equal(result.toolCount,25);assert.equal(count,25);assert.equal(p.requests.length,25);
 }finally{await p.close();}
});
test('a text response that hits the output limit is continued instead of failing the run',async()=>{
 const requests=[];const server=http.createServer(async(req,res)=>{let raw='';for await(const b of req)raw+=b;requests.push(JSON.parse(raw));res.setHeader('Content-Type','text/event-stream');const value=requests.length===1?{choices:[{delta:{content:'第一段'},finish_reason:'length'}]}:{choices:[{delta:{content:'已完成'},finish_reason:'stop'}]};res.end('data: '+JSON.stringify(value)+'\n\ndata: [DONE]\n\n');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const result=await runAgent({settings:{baseUrl:`http://127.0.0.1:${server.address().port}`,model:'fixture'},key:'',messages:[],signal:new AbortController().signal,tools:[],execute:()=>{throw Error('should not run');},onDelta:()=>{}});assert.equal(result.text,'第一段');assert.equal(requests.length,2);assert.match(requests[1].messages.at(-1).content,/继续输出剩余内容/);}finally{await new Promise(r=>server.close(r));}
});

test('provider context rejection rebuilds the request before any tool execution',async()=>{
 const requests=[],rejected=[];let executed=0;
 const server=http.createServer(async(req,res)=>{let raw='';for await(const b of req)raw+=b;requests.push(JSON.parse(raw));
  if(requests.length===1){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:'maximum context length exceeded'}}));return;}
  res.setHeader('Content-Type','text/event-stream');res.end(requests.length===2?frame('read_file','{}'):done);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const result=await runAgent({settings:{baseUrl:'http://127.0.0.1:'+server.address().port,model:'fixture'},key:'',messages:[{role:'user',content:'大输入'.repeat(10000)}],signal:new AbortController().signal,tools:definition,
   execute:()=>{executed++;return {ok:true};},onDelta:()=>{},onContextRejected:e=>rejected.push(e.code),
   prepareRequest:(messages,tools,round,meta)=>({messages:meta.contextRetry?[{role:'user',content:'保存引用后继续'}]:messages,tools})});
  assert.equal(result.text,'结束');assert.equal(executed,1);assert.deepEqual(rejected,['PROVIDER_CONTEXT_BUDGET']);assert.ok(JSON.stringify(requests[1]).length<JSON.stringify(requests[0]).length);
 }finally{await new Promise(r=>server.close(r));}
});

test('a premature completion continues until omitted requirements have been read',async()=>{
 let read=false;const p=await provider(n=>n===2?frame('read_file','{}'):done);
 try{const r=await runAgent({settings:{baseUrl:p.url,model:'fixture'},key:'',messages:[],signal:new AbortController().signal,tools:definition,
  execute:()=>{read=true;return {ok:true};},validateFinal:()=>read?null:'请读取尚未完整提供的任务要求。',onDelta:()=>{}});
  assert.equal(r.text,'结束');assert.equal(r.toolCount,1);assert.equal(p.requests.length,3);assert.match(p.requests[1].messages.at(-1).content,/任务要求/);
 }finally{await p.close();}
});
