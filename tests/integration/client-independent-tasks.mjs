// Exercise the real host -> scoped MCP arguments -> worker -> result pipeline.
// Only the model endpoint is a declared local fixture. No legacy client or EXE.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {createBackend} from '../../src/host/service.mjs';

const source=process.argv[2];
if(!source)throw Error('Pass the Python business acceptance report path');
const fixtures=JSON.parse(fs.readFileSync(source,'utf8'));
assert.equal(fixtures.missingTasks.length,0,'Business acceptance must pass first');
const root=fixtures.project;
const state=fs.mkdtempSync(path.resolve('artifacts/client-pipeline-'));
let response,modelCalls=0;
const server=http.createServer((req,res)=>{
 if(req.method!=='POST'||!req.url.endsWith('/chat/completions')){res.writeHead(404);res.end();return;}
 let body='';req.setEncoding('utf8');req.on('data',chunk=>body+=chunk);req.on('end',()=>{
  const parsed=JSON.parse(body);assert.ok(parsed.messages.length);
  modelCalls++;res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(response)}}]}));
 });
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const backend=await createBackend({dataRoot:state});
const results=[];
async function settle(id){
 const deadline=Date.now()+60000;
 while(Date.now()<deadline){const t=backend.store.get('tasks',id);if(!['queued','running','cancelling'].includes(t.status))return t;await new Promise(r=>setTimeout(r,100));}
 await backend.action('task.cancel',{id});throw Error('Task timeout '+id);
}
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
try{
 await backend.action('settings.save',{baseUrl:`http://127.0.0.1:${server.address().port}`,model:'fixture-text',visionModel:'fixture-vision'});
 await backend.action('secret.set',{key:'synthetic-local-fixture'});
 const project=await backend.action('project.create',{name:'独立处理器客户端验收',root});
 const session=await backend.action('session.create',{projectId:project.id,title:'真实任务入口验证'});
 for(const fixture of fixtures.results.filter(r=>r.mode!=='fixture-http')){
  const record={task:fixture.task,case:fixture.case,mode:fixture.mode};
  try{
   response=fixture.fixtureAnswer;
   const beforeCalls=modelCalls;
   const parameters=structuredClone(fixture.arguments);
   if(parameters.header_start_rows)parameters.header_start_rows=parameters.header_start_rows.map(String);
   const started=await backend.action('task.run',{sessionId:session.id,tool:'mcp_'+fixture.task,files:['.'],parameters});
   const task=await settle(started.id);
   assert.equal(task.status,fixture.case==='gross_margin_confirmation'?'awaiting_input':'succeeded',task.error||task.phase);
   assert.equal(task.result.runtime,'independent-python');
   assert.ok(task.result.outputs.length);
   for(const item of task.result.outputs){
    const file=await backend.action('result.path',{id:task.id,name:item.name,path:item.path});
    assert.ok(fs.statSync(file).isFile());
    if(item.name!=='阶段结果.json'&&fixture.task!=='detailed_table_save_config')assert.ok(item.path.startsWith(path.join('outputs',task.id)),item.path);
    if(item.sha256)assert.equal(hash(file),item.sha256);
   }
   if(fixture.mode==='fixture-model')assert.ok(modelCalls>beforeCalls,'Model task made no call');
   const persisted=await backend.action('session.get',{id:session.id});
   assert.ok(persisted.tasks.some(t=>t.id===task.id&&t.status===task.status));
   record.passed=true;record.taskId=task.id;record.status=task.status;record.outputCount=task.result.outputs.length;
   console.log('PASS '+fixture.case);
  }catch(error){record.passed=false;record.error=error.message;console.log('FAIL '+fixture.case+': '+error.message);}
  results.push(record);
 }
 // Errors must remain isolated from the successful output immediately above.
 const missing=await backend.action('task.run',{sessionId:session.id,tool:'mcp_tool_execute',files:['.'],parameters:{file_path:'cleanup.xlsx',header_row:1,code_column:'不存在',code_name_column:'不存在'}});
 const failed=await settle(missing.id);
 assert.equal(failed.status,'failed');
 assert.ok(failed.result.outputs.every(x=>x.path.startsWith(path.join('outputs',failed.id))));
 assert.ok(!failed.result.outputs.some(x=>x.name==='manifest.json'));
 results.push({task:'tool_execute',case:'error-output-isolation',passed:true,status:failed.status});
 const report={source:path.resolve(source),state,project:root,passed:results.filter(x=>x.passed).length,total:results.length,modelFixtureCalls:modelCalls,liveCicpa:'skipped-by-user',results};
 fs.writeFileSync(path.join(state,'客户端任务入口验收.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({report:path.join(state,'客户端任务入口验收.json'),passed:report.passed,total:report.total}));
 if(report.passed!==report.total)process.exitCode=1;
}finally{backend.close();await new Promise(resolve=>server.close(resolve));}
