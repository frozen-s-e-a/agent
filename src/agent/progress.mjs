import {digest} from './context.mjs';

/** Detect repeated prose within one reply, including continuations with different endings. */
export function repeatedOutput(text,previous=''){
 const paragraphs=String(previous+'\n\n'+text).split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>p.length>=48);
 const counts=new Map();let repeated=0,total=0;
 for(const paragraph of paragraphs){total+=paragraph.length;const count=(counts.get(paragraph)||0)+1;counts.set(paragraph,count);if(count>=3)repeated+=paragraph.length;}
 if(repeated>=192&&repeated>=total*.4)return true;
 const normalized=String(text).replace(/\s+/g,' ').trim(),tail=normalized.slice(-6000);
 for(let width=48;width<=Math.min(1000,Math.floor(tail.length/3));width++){
  const block=tail.slice(-width);
  if(tail.endsWith(block.repeat(3))&&width*3>=normalized.length*.6)return true;
 }
 return false;
}

const READ_TOOLS=new Set(['read_agent_result','get_task_result','preview_local_file','get_agent_evidence','list_local_files','get_audit_tools','get_agent_workflows','read_workbook_range']);
const skipped=new Set(['resultRef','sourceRef','readHint','keyPageHint','note','readProgress']);
const stable=value=>JSON.stringify(value,(key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);

/** New pages and changed task states are progress; another wrapper UUID is not. */
export function createReadProgressTracker(){
 const pages=new Map(),seen=new Map();
 return (name,args,result)=>{
  if(!READ_TOOLS.has(name)){if(result.ok!==false&&(name==='execute_workbook_plan'||name==='run_audit_tool'||name.startsWith('audit_'))){pages.clear();seen.clear();}return null;}
  if(result.ok===false)return null;
  const ref=result.sourceRef||result.resultRef;
  const key=name==='read_agent_result'?stable({ref,section:result.section||''}):stable({name,args});
  let progressed=false;
  if(name==='read_agent_result'&&!result.overview&&(Array.isArray(result.data)||typeof result.data==='string')){
   const start=result.offset||0,end=result.nextOffset??start+result.data.length,ranges=pages.get(key)||[];
   progressed=end>start&&!ranges.some(([a,b])=>a<=start&&b>=end);
   const merged=[];for(const range of [...ranges,[start,end]].sort((a,b)=>a[0]-b[0])){const last=merged.at(-1);if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else merged.push([...range]);}pages.set(key,merged);
  }
  const view=Object.fromEntries(Object.entries(result).filter(([key])=>!skipped.has(key))),signature=key+':'+digest(stable(view)),prior=seen.get(signature);
  const count=progressed||prior===undefined?0:prior+1;seen.set(signature,count);
  return count?{repeated:count,stop:count>=3,note:'这份结果已实际返回且没有新增数据。请使用已返回的证据、按 nextOffset 读下一页，或执行尚未完成的审计步骤；不要重复查找引用。'}:null;
 };
}
