import fs from 'node:fs';
import path from 'node:path';
import {LegacyMcpClient} from '../mcp/legacy-client.mjs';
import {inside} from '../file-ops/paths.mjs';
function outputsSnapshot(root){const found=new Map();let count=0;const visit=(dir,depth)=>{if(depth>12||count>10000)return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name.startsWith('.')||e.isSymbolicLink())continue;const p=path.join(dir,e.name);if(e.isDirectory())visit(p,depth+1);else{const s=fs.statSync(p);found.set(p,`${s.size}:${s.mtimeMs}`);count++;}}};for(const name of ['output','outputs']){const p=path.join(root,name);if(fs.existsSync(p))visit(p,0);}return found;}
function unwrap(result){return (result?.content||[]).filter(x=>x.type==='text').map(x=>{try{return JSON.parse(x.text);}catch{return x.text;}});}
export function mcpFailure(result){const values=[result?.structuredContent,...unwrap(result)].filter(x=>x&&typeof x==='object');const failed=values.find(x=>x.ok===false||x.success===false||x.valid===false||x.validation_passed===false||['error','failed'].includes(x.status)||x.isError===true);return result?.isError||failed?String(failed?.error?.message||failed?.error||failed?.message||(result.content||[]).map(x=>x.text||'').join('\n')||'工具返回执行错误'):null;}
function outputFiles(root,before,result){const candidates=new Set();for(const [p,stamp]of outputsSnapshot(root))if(before.get(p)!==stamp)candidates.add(p);
 const walk=(x,key='')=>{if(typeof x==='string'){if(/output|saved_to|result_path|成果|输出/.test(key))candidates.add(path.resolve(root,x));}else if(Array.isArray(x))x.forEach(v=>walk(v,key));else if(x&&typeof x==='object')Object.entries(x).forEach(([k,v])=>walk(v,key+'.'+k));};
 walk(result?.structuredContent);unwrap(result).forEach(x=>walk(x));
 return [...candidates].flatMap(p=>{try{const f=inside(root,p);if(!fs.statSync(f).isFile())return [];return [{name:path.basename(f),path:path.relative(root,f),size:fs.statSync(f).size}];}catch{return [];}});
}
export function createMcpRunner(store,options={}){
 const running=new Map();let closed=false;
 function launch(task,args){
  const client=options.clientFactory?options.clientFactory({workDir:task.root}):new LegacyMcpClient({workDir:task.root});const state={client,cancelled:false};running.set(task.id,state);
  const before=outputsSnapshot(task.root);task.status='running';task.phase='工具箱正在处理';task.startedAt=new Date().toISOString();store.put('tasks',task);
  void (async()=>{try{
   const result=await client.call(task.mcpName,args);if(closed||state.cancelled)return;
   const error=mcpFailure(result),data=unwrap(result).find(x=>x&&typeof x==='object')||result.structuredContent||{};
   const outputs=outputFiles(task.root,before,result),dir=path.join(task.root,'outputs',task.id);fs.mkdirSync(dir,{recursive:true});inside(task.root,dir);fs.writeFileSync(path.join(dir,'阶段结果.json'),JSON.stringify(result,null,2));outputs.push({name:'阶段结果.json',path:path.relative(task.root,path.join(dir,'阶段结果.json'))});
   const waiting=data.needs_confirmation===true||data.requires_confirmation===true||['needs_confirmation','pending_confirmation','awaiting_confirmation'].includes(data.status);
   task.result={...data,mcp:true,isError:!!error,content:result.content||[],outputs,rowCount:data.rowCount??data.row_count??data.total_rows,columns:data.columns||data.files?.[0]?.columns||[],preview:data.preview||data.sample_rows||data.files?.flatMap(x=>x.preview||[])||[],warnings:data.warnings||[]};
   task.status=error?'failed':waiting?'awaiting_input':'succeeded';task.error=error;task.phase=error?'工具返回错误':waiting?'请审阅检测结果，确认参数后再次执行':'结果已记录';
  }catch(e){if(!closed&&!state.cancelled){task.status='failed';task.error=e.message;task.phase='执行失败';}}
  finally{await client.close().catch(()=>{});running.delete(task.id);if(!closed&&!state.cancelled){task.finishedAt=new Date().toISOString();store.put('tasks',task);}}})();return task;
 }
 function cancel(id){const state=running.get(id),task=store.get('tasks',id);if(!task)throw Error('任务不存在');if(state){state.cancelled=true;void state.client.close();task.status='cancelled';task.phase='已停止';task.error='调用已停止。外部工具可能已写出部分文件，请检查输出目录后重试。';task.finishedAt=new Date().toISOString();store.put('tasks',task);}return task;}
 return {launch,cancel,close(){closed=true;for(const state of running.values())void state.client.close();}};
}
