import fs from 'node:fs';
import path from 'node:path';
import {workflowDefinitions} from './definitions.mjs';
import {loadSkills} from '../skills/loader.mjs';
import {inside} from '../file-ops/paths.mjs';
const skillIds={monthly:['monthly-analysis-mcp'],workpaper:['detailed-table-generation'],ledger:['jet-test'],external:['related-party-identification','cicpa-query']};
const active=s=>['queued','running','cancelling'].includes(s);
export function workflowService(store,root){
 const skills=loadSkills(root);
 const get=id=>{const s=store.get('sessions',id);if(!s?.workflow)throw Error('工作流不存在');return s;};
 const def=s=>workflowDefinitions.find(x=>x.id===s.workflow.definitionId);
 const save=s=>{s.updatedAt=new Date().toISOString();return store.put('sessions',s);};
 const checkBefore=(s,stageId)=>{const stages=def(s).stages;const i=stages.findIndex(x=>x.id===stageId);if(i<0)throw Error('阶段不存在');for(const prev of stages.slice(0,i))if(!['confirmed','skipped'].includes(s.workflow.stages[prev.id]?.status))throw Error('请先完成或明确跳过：'+prev.title);return stages[i];};
 const invalidate=(s,stageId)=>{const stages=def(s).stages;for(const stage of stages.slice(stages.findIndex(x=>x.id===stageId))){s.workflow.stages[stage.id]={status:'pending',confirmedAt:null};}delete s.workflow.archive;s.workflow.status='in_progress';};
 function runAllowed(id,stageId,toolId){const s=get(id);if(s.workflow.status==='archived')throw Error('已归档任务不能执行，请新建任务');const stage=checkBefore(s,stageId);if(!stage.tools.includes(toolId))throw Error('能力不属于当前阶段');return s;}
 function attachTask(id,stageId,taskId){const s=get(id);invalidate(s,stageId);s.workflow.stages[stageId]={...s.workflow.stages[stageId],taskId,status:'running'};save(s);}
 function read(id){const s=get(id),tasks=store.all('tasks').filter(t=>t.sessionId===id);let changed=false;for(const state of Object.values(s.workflow.stages)){if(!state.taskId||['confirmed','skipped'].includes(state.status))continue;const task=tasks.find(t=>t.id===state.taskId);if(task){const status=task.status==='succeeded'?'awaiting_confirmation':task.status;if(state.status!==status){state.status=status;changed=true;}}}if(changed)save(s);return {session:s,workflow:s.workflow,tasks,guides:skills.filter(x=>(skillIds[s.workflow.definitionId]||[]).includes(x.id)).map(x=>({id:x.id,name:x.name,text:x.text.replace(/^---[\s\S]*?---\s*/,''),description:x.description}))};}
 async function action(method,p){
  if(method==='workflow.create'){
   const definition=workflowDefinitions.find(x=>x.id===p.definitionId);if(!definition)throw Error('任务类型不存在');if(!store.get('projects',p.projectId))throw Error('请先选择项目');
   const s=store.create('sessions',{projectId:p.projectId,title:'审计任务 · '+definition.title,workflow:{definitionId:definition.id,status:'in_progress',activeStage:'input',files:[],drafts:{},stages:{},review:''}});return read(s.id);
  }
  if(method==='workflow.get'){
   const s=store.get('sessions',p.id);if(!s)throw Error('记录不存在');
   if(!s.workflow){const d=workflowDefinitions.find(x=>s.title?.includes(x.title));if(!d)throw Error('此记录不是审计工作流');const runs=store.all('tasks').filter(t=>t.sessionId===s.id);s.workflow={definitionId:d.id,status:'in_progress',activeStage:'input',files:[...new Set(runs.flatMap(t=>t.files||[]))],drafts:{},stages:{},review:'',legacyImported:true};for(const t of runs){const tool=t.result?.mcp&&!t.tool.startsWith('mcp_')?'mcp_'+t.tool:t.tool;const stage=d.stages.find(st=>st.tools.includes(tool));if(stage){s.workflow.stages[stage.id]={taskId:t.id,status:t.status==='succeeded'?'awaiting_confirmation':t.status};s.workflow.drafts[stage.id]={toolId:tool,parameters:t.parameters||{},files:t.files||[]};}}save(s);}
   return read(p.id);
  }
  const s=get(p.id),w=s.workflow;
  if(method==='workflow.save'){
   if(w.status==='archived')throw Error('已归档记录只读');
   if(p.activeStage){if(!def(s).stages.some(x=>x.id===p.activeStage))throw Error('阶段无效');w.activeStage=p.activeStage;}
   if(p.files){if(!Array.isArray(p.files)||p.files.length>1000)throw Error('资料数量无效');const project=store.get('projects',s.projectId);p.files.forEach(f=>inside(project.root,f));if(JSON.stringify(w.files)!==JSON.stringify(p.files)){if(store.all('tasks').some(t=>t.sessionId===s.id&&active(t.status)))throw Error('任务执行中，请等待结束后修改资料范围');invalidate(s,'input');w.files=[...new Set(p.files)];}}
   if(p.stageId&&p.draft){if(!def(s).stages.some(x=>x.id===p.stageId))throw Error('阶段无效');if(JSON.stringify(w.drafts[p.stageId])!==JSON.stringify(p.draft)){if(store.all('tasks').some(t=>t.sessionId===s.id&&active(t.status)))throw Error('任务执行中，请等待结束后修改参数');invalidate(s,p.stageId);w.drafts[p.stageId]=p.draft;}}
   if(p.review!==undefined)w.review=String(p.review).slice(0,16000);save(s);return read(p.id);
  }
  if(method==='workflow.confirm'){
   if(w.status==='archived')throw Error('任务已经归档');const stage=checkBefore(s,p.stageId);
   if(store.all('tasks').some(t=>t.sessionId===s.id&&active(t.status)))throw Error('仍有任务执行中，请等待完成');
   if(p.skip){if(!stage.optional)throw Error('此阶段不能跳过');if(!String(p.reason||'').trim())throw Error('请填写跳过原因');w.stages[stage.id]={...w.stages[stage.id],status:'skipped',reason:p.reason,confirmedAt:new Date().toISOString()};}
   else if(stage.kind==='input'){if(!stage.optional&&!w.files.length)throw Error('请选择本任务的资料');w.stages[stage.id]={status:'confirmed',files:[...w.files],confirmedAt:new Date().toISOString()};}
   else if(stage.kind==='execute'){const task=store.get('tasks',w.stages[stage.id]?.taskId);if(task?.status!=='succeeded'||task.result?.isError)throw Error('本阶段尚无成功结果，不能确认');w.stages[stage.id]={...w.stages[stage.id],status:'confirmed',confirmedAt:new Date().toISOString()};}
   else{
    if(store.all('tasks').some(t=>t.sessionId===s.id&&active(t.status)))throw Error('仍有任务执行中');
    if(!String(p.review||w.review||'').trim())throw Error('请填写复核意见');w.review=String(p.review||w.review).slice(0,16000);w.status='archived';w.stages[stage.id]={status:'confirmed',confirmedAt:new Date().toISOString()};
    const project=store.get('projects',s.projectId),dir=path.join(project.root,'outputs','review-'+s.id);fs.mkdirSync(dir,{recursive:true});inside(project.root,dir);
    const tasks=store.all('tasks').filter(t=>t.sessionId===s.id);const packet={version:1,project:{id:project.id,name:project.name},sessionId:s.id,archivedAt:new Date().toISOString(),workflow:w,tasks};
    fs.writeFileSync(path.join(dir,'任务记录包.json'),JSON.stringify(packet,null,2));fs.writeFileSync(path.join(dir,'复核意见.md'),`# ${s.title}\n\n${w.review}\n\n归档时间：${packet.archivedAt}\n\n`+def(s).stages.map(st=>`- ${st.title}：${w.stages[st.id]?.status||'pending'}${w.stages[st.id]?.reason?'（'+w.stages[st.id].reason+'）':''}`).join('\n'));
    w.archive={directory:path.relative(project.root,dir),files:['任务记录包.json','复核意见.md'],at:packet.archivedAt};
   }
   const index=def(s).stages.findIndex(x=>x.id===stage.id);w.activeStage=def(s).stages[index+1]?.id||stage.id;save(s);return read(p.id);
  }
  if(method==='workflow.archivePath'){if(!w.archive||!w.archive.files.includes(p.name))throw Error('归档文件不存在');return inside(store.get('projects',s.projectId).root,path.join(w.archive.directory,p.name));}
  throw Error('未知工作流操作');
 }
 return {action,runAllowed,attachTask,skills};
}
