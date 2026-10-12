import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {pythonPath} from '../task-scheduler/scheduler.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const tools=JSON.parse(fs.readFileSync(path.join(root,'src/resources/audit-task-tools.json'),'utf8'));

export class IndependentTaskClient {
 constructor({workDir=root,taskId,settings={},onProgress=()=>{}}={}){this.workDir=workDir;this.taskId=taskId;this.settings=settings;this.onProgress=onProgress;this.child=null;this.closed=false;}
 available(){try{return fs.existsSync(pythonPath())&&fs.existsSync(path.join(root,'src/audit-domain/task_worker.py'));}catch{return false;}}
 async listTools(){return tools;}
 async call(name,args){
  if(this.closed)throw Error('任务执行器已关闭');
  if(!tools.some(t=>t.name===name))throw Error('未知审计任务');
  if(this.child)throw Error('执行器已有正在处理的任务');
  return new Promise((resolve,reject)=>{
   const child=spawn(pythonPath(),['-X','utf8','-B',path.join(root,'src/audit-domain/task_worker.py')],{cwd:root,windowsHide:true,env:{...process.env,PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8',PYTHONPATH:[path.join(root,'runtime/python-packages'),path.join(root,'build/python-packages')].join(path.delimiter)}});
   this.child=child;let buffer='',result,error,finished=false;
   const timer=setTimeout(()=>{error='任务处理超时，请缩小输入范围后重试';child.kill();},30*60*1000);
   const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);this.child=null;const data=result||{runtime:'independent-python',success:false,status:'failed',message:error||'工作进程退出，未生成完整结果',outputs:[]};resolve({content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data,isError:data.success===false});};
   child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{buffer+=chunk;if(buffer.length>8_000_000){error='工作进程返回过大';child.kill();return;}let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);let event;try{event=JSON.parse(line);}catch{continue;}if(event.type==='progress')this.onProgress(event);else if(event.type==='result')result=event.result;else if(event.type==='error')error=event.message;}});
   child.stderr.on('data',()=>{});child.on('error',e=>{error=e.message;finish();});child.once('close',finish);child.stdin.on('error',()=>{});
   child.stdin.end(JSON.stringify({root:this.workDir,taskId:this.taskId||randomUUID(),name,arguments:args,settings:this.settings})+'\n');
  });
 }
 async close(){this.closed=true;this.child?.kill();}
}

export {mcpToOpenAiTool,constrainMcpArgs} from './arguments.mjs';
