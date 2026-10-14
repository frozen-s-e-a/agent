import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {createBackend} from '../../src/host/service.mjs';
import {fileHash} from '../../src/agent/inputs.mjs';
const root=path.resolve('artifacts/test-results');fs.mkdirSync(root,{recursive:true});
const python=process.env.AUDIT_PYTHON||path.resolve('build/python/python.exe');
function workbook(file,customer){execFileSync(python,['-X','utf8','-B','-c','import sys;sys.path.insert(0,sys.argv[3]);from openpyxl import Workbook;w=Workbook();w.active.title="默认表";w.active.append(["默认表字段"]);s=w.create_sheet("Sheet1");s.append([]);s.append(["客户","余额"]);s.append([sys.argv[2],123]);w.save(sys.argv[1])',file,customer,path.resolve('build/python-packages')],{windowsHide:true});}
async function script(next){
  const requests=[];const server=http.createServer(async(req,res)=>{
    const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));requests.push(body);
    const call=next(requests.length-1,body),delta=call?{tool_calls:[{index:0,id:'attachment-call-'+requests.length,type:'function',function:{name:call.name,arguments:JSON.stringify(call.args)}}]}:{content:'已检查附件'};
    res.setHeader('Content-Type','text/event-stream');res.end('data: '+JSON.stringify({choices:[{delta,finish_reason:call?'tool_calls':'stop'}]})+'\n\ndata: [DONE]\n\n');
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {baseUrl:'http://127.0.0.1:'+server.address().port+'/v1',requests,close:()=>new Promise(resolve=>server.close(resolve))};
}
async function settle(backend,id){for(let i=0;i<500;i++){const state=await backend.action('session.get',{id});if(!state.streaming)return state;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Agent timeout');}

for(const [withProject,wrapped,source='attachments'] of [[false,false],[true,true],[true,true,'project']])test('sent Excel reaches the independent audit worker: '+(withProject?'same-name project + wrapper '+source:'attachment-only + direct'),async()=>{
  const dir=fs.mkdtempSync(path.join(root,'agent-attachment-mcp-')),folder=path.join(dir,'project');fs.mkdirSync(folder);
  const file=path.join(dir,'投资收益.xlsx');workbook(file,'聊天附件客户');workbook(path.join(folder,'投资收益.xlsx'),'项目文件客户');
  const original=fileHash(file);let attachment;
  const server=await script(index=>[
    {name:'get_audit_tools',args:{toolIds:['audit_detailed_table_inspect']}},
    {name:'preview_local_file',args:{source:'attachments',file:attachment,parameters:{sheet_name:'Sheet1',header_row:2}}},
    wrapped?{name:'run_audit_tool',args:{source,tool:'mcp_detailed_table_inspect',files:[source==='project'?'投资收益.xlsx':attachment],parameters:{file_path:source==='project'?'投资收益.xlsx':attachment,sheet_name:'Sheet1',header_row:2,preview_rows:20}}}:{name:'audit_detailed_table_inspect',args:{file_path:attachment,sheet_name:'Sheet1',header_row:2,preview_rows:20}},
  ][index]);const backend=await createBackend({dataRoot:path.join(dir,'state')});
  try{
    const p=withProject?await backend.action('project.create',{name:'同名资料',root:folder}):null,s=await backend.action('session.create',{projectId:p?.id});
    attachment=(await backend.action('attachments.import',{sessionId:s.id,paths:[file]})).attachments[0].id;
    await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('chat.send',{sessionId:s.id,text:'检查我携带的 Sheet1',attachments:[attachment]});
    const state=await settle(backend,s.id),run=state.agentRuns.at(-1),task=state.tasks[0];
    assert.equal(run.status,'completed',JSON.stringify(state.events.at(-1)));assert.equal(state.calls.filter(call=>call.status==='failed').length,0);assert.equal(state.tasks.length,1);assert.equal(task.status,'succeeded',task.error);
    assert.equal(fileHash(path.resolve(task.root,task.files[0])),source==='project'?fileHash(path.join(folder,'投资收益.xlsx')):original);if(source==='attachments')assert.match(task.files[0],/^inputs[\\/]/);assert.equal(fileHash(file),original);
    assert.ok(JSON.stringify(task.result).includes(source==='project'?'项目文件客户':'聊天附件客户'));assert.ok(!JSON.stringify(task.result).includes(source==='project'?'聊天附件客户':'项目文件客户'));
    assert.deepEqual(task.result.columns,['客户','余额']);assert.equal(task.parameters.header_row,2);
    const preview=backend.store.all('agentToolResults').find(item=>item.runId===run.id&&item.name==='preview_local_file').result;
    assert.equal(preview.previews[0].sheet,'Sheet1');assert.equal(preview.file,attachment);
    const contract=backend.store.all('agentToolResults').find(item=>item.runId===run.id&&item.name==='get_audit_tools').result.tools[0];
    assert.equal(contract.id,'mcp_detailed_table_inspect');assert.equal(contract.functionName,'audit_detailed_table_inspect');
  }finally{backend.close();await server.close();}
});

test('resumed folder attachments and plans accept child ids and canonical paths interchangeably',async()=>{
  const dir=fs.mkdtempSync(path.join(root,'agent-folder-mcp-')),folder=path.join(dir,'发送的资料');fs.mkdirSync(folder);workbook(path.join(folder,'数据.xlsx'),'恢复附件客户');let child,workPath;
  const server=await script(index=>[
    {name:'set_agent_plan',args:{workflowIds:['workpaper'],steps:[{id:'inspect',toolId:'audit_detailed_table_inspect',files:[child],parameters:{file_path:child,sheet_name:'Sheet1',header_row:2,preview_rows:2},dependsOn:[]}]}},
    {name:'audit_detailed_table_inspect',args:{file_path:workPath.replaceAll('\\','/'),sheet_name:'Sheet1',header_row:2,preview_rows:2}},
  ][index]),backend=await createBackend({dataRoot:path.join(dir,'state')});
  try{
    const s=await backend.action('session.create'),a=(await backend.action('attachments.import',{sessionId:s.id,paths:[folder]})).attachments[0];
    backend.store.put('attachments',{...backend.store.get('attachments',a.id),used:true});
    const record=backend.store.get('attachments',a.id);child=a.id+'/'+record.children[0].id;workPath=path.join('inputs',a.id,a.name,record.children[0].name);
    const prior=backend.store.create('agentRuns',{sessionId:s.id,status:'failed',objective:'检查附件',requirements:[],inputs:[],questions:[],steps:[],checkpoints:[],plan:{status:'pending',steps:[]}});
    await backend.action('settings.save',{baseUrl:server.baseUrl,model:'fixture'});await backend.action('agent.resume',{id:prior.id,text:'继续检查附件'});
    const state=await settle(backend,s.id),run=state.agentRuns.at(-1);assert.equal(run.status,'completed',JSON.stringify(state.events.at(-1)));assert.equal(run.plan.steps[0].status,'succeeded');assert.deepEqual(run.plan.steps[0].files,[workPath]);assert.equal(run.plan.steps[0].parameters.file_path,workPath);assert.equal(state.tasks[0].validationStatus,'passed');assert.ok(JSON.stringify(state.tasks[0].result).includes('恢复附件客户'));
  }finally{backend.close();await server.close();}
});
