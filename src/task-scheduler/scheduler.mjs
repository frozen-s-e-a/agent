import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inside} from '../file-ops/paths.mjs';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export function pythonPath(){
 const options=[process.env.AUDIT_PYTHON,path.join(root,'runtime/python/python.exe'),path.join(root,'build/python/python.exe')];
 const found=options.find(p=>p&&fs.existsSync(p));if(!found)throw new Error('缺少应用 Python 运行时，请重新构建测试包');return found;
}
export function worker(request,onEvent){
 const child=spawn(pythonPath(),['-B',path.join(root,'src/audit-worker/worker.py')],{cwd:root,windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8',PYTHONUTF8:'1',PYTHONPATH:[path.join(root,'runtime/python-packages'),path.join(root,'build/python-packages')].join(path.delimiter)}});
 let line='',error='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
 child.stdout.on('data',chunk=>{line+=chunk;if(line.length>4_000_000){child.kill();onEvent({type:'error',message:'工作进程消息超出限制'});return;}let i;while((i=line.indexOf('\n'))>=0){const raw=line.slice(0,i);line=line.slice(i+1);try{onEvent(JSON.parse(raw));}catch{}}});
 child.stderr.on('data',d=>{error=(error+d).slice(-2000);});child.on('error',e=>onEvent({type:'error',message:e.message}));child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(request)+'\n');
 return child;
}
export class Scheduler{
 constructor(store){this.store=store;this.active=null;this.closed=false;
  for(const t of store.all('tasks'))if(['queued','running','cancelling'].includes(t.status)){t.status='interrupted';t.error='应用关闭中断了任务。可以核对输入后重试。';store.put('tasks',t);store.append(t.sessionId,{type:'task',taskId:t.id});}
 }
 queue(session,project,tool,files,mode,parameters,settings){
  files.forEach(f=>inside(project.root,f));
  const t=this.store.create('tasks',{sessionId:session.id,projectId:project.id,tool,files,mode,parameters,status:'queued',phase:'等待执行',limits:{memoryMiB:settings.memoryMiB,threads:settings.threads},root:project.root});
  this.store.append(session.id,{type:'task',taskId:t.id});this.pump();return t;
 }
 pump(){if(this.closed||this.active)return;const task=this.store.all('tasks').find(t=>t.status==='queued'&&t.engine!=='mcp');if(!task)return;
  task.status='running';task.startedAt=new Date().toISOString();this.store.put('tasks',task);let result=null;let failure=null;
  let child;try{child=worker({protocolVersion:1,taskId:task.id,root:task.root,tool:task.tool,files:task.files,mode:task.mode,parameters:task.parameters,limits:task.limits},ev=>{
   if(ev.type==='result')result=ev.result;else if(ev.type==='error')failure=ev.message;else if(ev.type==='strategy'){task.selectedMode=ev.mode;task.reason=ev.reason;}else if(ev.type==='progress'){task.phase=ev.phase;task.rows=ev.rows;}this.store.put('tasks',task);
  });}catch(e){task.status='failed';task.error=e.message;this.store.put('tasks',task);queueMicrotask(()=>this.pump());return;}
  this.active={id:task.id,child,task};
  const finish=async()=>{
   if(this.closed)return;
   if(result){task.result=result;task.status='succeeded';task.phase='结果已发布';}
   else{
    const completed=path.join(task.root,'outputs',task.id,'manifest.json');
    // Publication may win the race with cancellation. A published manifest is recovered, never silently retried.
    if(fs.existsSync(completed)){try{inside(task.root,completed);const manifest=JSON.parse(fs.readFileSync(completed,'utf8'));if(manifest.taskId!==task.id||manifest.status!=='succeeded')throw Error();for(const x of manifest.outputs){const filename=inside(path.dirname(completed),x.name);const h=createHash('sha256');for await(const b of fs.createReadStream(filename))h.update(b);if(h.digest('hex')!==x.sha256)throw Error();}task.result=manifest;task.status='succeeded';task.phase='已恢复并校验发布记录';}catch{task.status='interrupted';task.error='发现结果发布记录，需校验后恢复';}}
    else{task.status=task.status==='cancelling'?'cancelled':'failed';task.error=failure||(task.status==='cancelled'?'任务已取消，未发布结果':'执行进程退出，未发布完整结果');}
   }
   task.finishedAt=new Date().toISOString();this.store.put('tasks',task);this.active=null;this.pump();
  };child.once('close',finish);
 }
 retry(id){const t=this.store.get('tasks',id);if(!t||!['failed','interrupted','cancelled'].includes(t.status))throw new Error('此任务不能重试');t.attempts=[...(t.attempts||[]),{status:t.status,error:t.error,finishedAt:t.finishedAt}];t.status='queued';t.error=null;t.phase='等待恢复';this.store.put('tasks',t);this.pump();return t;}
 cancel(id){const task=this.active?.id===id?this.active.task:this.store.get('tasks',id);if(!task)throw new Error('任务不存在');if(task.status==='queued'){task.status='cancelled';this.store.put('tasks',task);}else if(task.status==='running'&&this.active?.id===id){task.status='cancelling';this.store.put('tasks',task);this.active.child.kill();}return task;}
 stop(){this.closed=true;this.active?.child.kill();}
}
