// Live public services through the same host/worker pipeline as the desktop.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createBackend} from '../../src/host/service.mjs';
const base=fs.mkdtempSync(path.resolve('artifacts/public-client-'));
const root=path.join(base,'project');fs.mkdirSync(root);
const backend=await createBackend({dataRoot:path.join(base,'state')});
const cases=['ipo_sz','ipo_sh','ipo_bj'].map(task=>[task,{start_date:'2026-10-09',end_date:'2026-10-09',update_mode:'文件'}]);
cases.push(['currency',{}],['announcement',{stock_codes:['000001'],start_date:'2026-03-01',end_date:'2026-04-30',market_type:'京沪深',category_name:'年报',keyword:'2025年年度报告'}]);
const records=[];
try{
 const project=await backend.action('project.create',{name:'公开服务客户端验收',root});
 const session=await backend.action('session.create',{projectId:project.id,title:'公开资料下载实测'});
 for(const [task,parameters] of cases){
  const record={task,parameters,mode:'live-public'};
  try{
   const started=await backend.action('task.run',{sessionId:session.id,tool:'mcp_'+task,files:[],parameters});
   const deadline=Date.now()+300000;let done;
   do{done=backend.store.get('tasks',started.id);if(!['running','queued'].includes(done.status))break;await new Promise(r=>setTimeout(r,500));}while(Date.now()<deadline);
   assert.equal(done.status,'succeeded',done.error||done.phase);
   assert.equal(done.result.runtime,'independent-python');
   for(const item of done.result.outputs){const file=await backend.action('result.path',{id:done.id,name:item.name,path:item.path});assert.ok(fs.statSync(file).isFile());assert.ok(item.path.startsWith(path.join('outputs',done.id)));}
   const pdfs=done.result.outputs.filter(x=>x.name.endsWith('.pdf'));
   if(task!=='currency')assert.ok(pdfs.length>0,'No PDF downloaded');
   if(task==='currency')assert.ok(done.result.latest_date>='2026-10-01');
   record.passed=true;record.taskId=done.id;record.outputs=done.result.outputs;record.pdfCount=pdfs.length;
   console.log('PASS '+task+' '+pdfs.length+' PDFs');
  }catch(error){record.passed=false;record.error=error.message;console.log('FAIL '+task+': '+error.message);}
  records.push(record);
 }
}finally{
 backend.close();const report={passed:records.filter(r=>r.passed).length,total:cases.length,CICPA:'skipped-by-user',records};
 fs.writeFileSync(path.join(base,'公开服务客户端验收.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({report:path.join(base,'公开服务客户端验收.json'),passed:report.passed,total:report.total}));
 if(report.passed!==report.total)process.exitCode=1;
}
