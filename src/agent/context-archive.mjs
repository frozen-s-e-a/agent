import {digest} from './context.mjs';
import {gzipSync} from 'node:zlib';

/** Content-addressed, session-scoped originals used by read_agent_result. */
export function archiveContext(store,run,data) {
  const id='context-'+run.id+'-'+digest(data);
  if(!store.get('agentToolResults',id))store.put('agentToolResults',{id,sessionId:run.sessionId,runId:run.id,name:'agent_context_archive',payloadEncoding:'json+gzip',payloadSha256:digest(data),payload:gzipSync(Buffer.from(JSON.stringify(data),'utf8')).toString('base64'),createdAt:new Date().toISOString()});
  return {kind:'agentToolResults',id};
}
function accept(run,id,hash,start,end) {
  const item=(run.requirements||[]).find(r=>r.id===id&&digest(r.text||'')===hash);
  if(!item)return;
  run.contextCoverage??={};
  const previous=run.contextCoverage[id]?.hash===hash?run.contextCoverage[id].intervals:[];
  const intervals=[...previous,[Math.max(0,start),Math.min(String(item.text||'').length,end)]].sort((a,b)=>a[0]-b[0]),merged=[];
  for(const range of intervals){const last=merged.at(-1);if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else merged.push(range);}
  run.contextCoverage[id]={hash,intervals:merged};
}
export function recordVisibleRequirements(run,visible) {
  for(const item of visible||[]){const req=run.requirements.find(r=>r.id===item.id);if(req)accept(run,item.id,item.hash,0,String(req.text||'').length);}
}
export function recordContextRead(run,record,result) {
  if(record.name!=='agent_context_archive'||result.overview||result.data===undefined)return;
  const requirements=record.result.state?.requirements||[],section=result.section||'';
  const match=/^state\.requirements\.(\d+)\.text$/.exec(section);
  if(match&&typeof result.data==='string'){
    const req=requirements[Number(match[1])];if(req)accept(run,req.id,digest(req.text||''),result.offset||0,result.nextOffset??req.text.length);return;
  }
  const full=section===''?result.data.state?.requirements:section==='state'?result.data.requirements:section==='state.requirements'?result.data:/^state\.requirements\.\d+$/.test(section)?[result.data]:[];
  for(const req of Array.isArray(full)?full:[])if(req&&typeof req.text==='string')accept(run,req.id,digest(req.text),0,req.text.length);
}
export function missingContextRequirements(run) {
  if(!run.contextArchiveRef)return [];
  return (run.requirements||[]).flatMap((req,index)=>{
    const hash=digest(req.text||''),coverage=run.contextCoverage?.[req.id],ranges=coverage?.hash===hash?coverage.intervals:[],end=ranges[0]?.[0]===0?ranges[0][1]:0,total=String(req.text||'').length;
    return end>=total?[]:[{id:req.id,total,readHint:{tool:'read_agent_result',arguments:{id:run.contextArchiveRef.id,section:'state.requirements.'+index+'.text',offset:end}}}];
  });
}
