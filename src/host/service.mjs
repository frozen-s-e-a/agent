import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {Store} from '../conversations/store.mjs';
import {inside,listFiles} from '../file-ops/paths.mjs';
import {Scheduler,worker} from '../task-scheduler/scheduler.mjs';
import {listModels,testConnection,normalizeBase,normalizeKey} from '../harness-adapter/connection.mjs';
import {Attachments,publicAttachment} from '../conversations/attachments.mjs';
import {IndependentTaskClient,mcpToOpenAiTool,constrainMcpArgs} from '../mcp/independent-client.mjs';
import {buildCatalog,normalizeParameters,INPUT_PATH_KEYS} from '../workflows/contracts.mjs';
import {workflowService} from '../workflows/state.mjs';
import {createMcpRunner} from '../workflows/mcp-runner.mjs';
import {createHash} from 'node:crypto';
import {buildAgentWorkflows} from '../agent/definitions.mjs';
import {verifyTaskArtifacts,recoverPublishedTask} from '../agent/validation.mjs';
import {createAgentRuntime,isLocalModel} from '../agent/runtime.mjs';
import {fileHash,removeTree,workspaceRoot,collectUnusedBlobs} from '../agent/inputs.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const readJSON=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const tools=readJSON('src/resources/tools.json');
const legacyToolMetadata=readJSON('src/resources/audit-task-tools.json');
const catalog=buildCatalog(tools,legacyToolMetadata);
const agentWorkflows=buildAgentWorkflows(catalog);
const verificationPath=path.join(ROOT,'src/resources/verification.json');
const verification=fs.existsSync(verificationPath)?readJSON('src/resources/verification.json'):{};
const jet=readJSON('src/resources/jet-rules.json');
// This build only talks to a local model service (see assertLocalModel), so the defaults point there.
const defaults={id:'settings',baseUrl:'http://127.0.0.1:11434/v1',model:'',visionModel:'',models:[],temperature:0.2,maxTokens:4096,contextWindow:128000,memoryMiB:2048,threads:2,defaultMode:'auto'};
export async function createBackend(options={}){
 const dataRoot=options.dataRoot||process.env.AUDIT_DATA_DIR||path.join(process.env.LOCALAPPDATA||os.homedir(),'AuditAssistant');
 const store=new Store(dataRoot),scheduler=new Scheduler(store);let apiKey='',cicpaCookies='';const streams=new Map();let previews=0;
 const workflows=workflowService(store,ROOT),mcpRunner=createMcpRunner(store,{clientFactory:options.legacyClientFactory});
 const attachments=new Attachments(store);let closed=false;let legacyMeta=null;
 for(const task of store.all('tasks').filter(task=>task.status==='interrupted'))try{recoverPublishedTask(task,store);}catch(error){task.recoveryError=error.message;task.publicationStatus='requires_review';store.put('tasks',task);}
 const legacyCatalog=async()=>{if(legacyMeta)return legacyMeta;legacyMeta=legacyToolMetadata;return legacyMeta;};
 const legacyUiTools=async()=>catalog.filter(t=>t.engine==='mcp');
 for(const c of store.all('toolCalls'))if(c.status==='running')store.put('toolCalls',{...c,status:'cancelled',result:{ok:false,error:'上次应用关闭中断了调用；已产生的结果可在任务卡核对'}});
 const settings=()=>{const value={...defaults,...store.get('settings','settings'),hasKey:!!apiKey,hasCicpaCookies:!!cicpaCookies};return {...value,localModel:isLocalModel(value)};};
 const agents=createAgentRuntime({store,scheduler,mcpRunner,attachments,catalog,workflows:agentWorkflows,skills:workflows.skills,settings,secrets:()=>({apiKey}),streams});
 const must=(kind,id)=>{const x=store.get(kind,id);if(!x)throw new Error('找不到指定的'+kind);return x;};
 async function action(method,p={}){
  if((method.startsWith('agent.')&&method!=='agent.sourcePreview')||method.startsWith('chat.'))return agents.action(method,p);
  if(method.startsWith('workflow.'))return workflows.action(method,p);
  switch(method){
   case 'templates.copy':{const project=must('projects',p.projectId),tool=catalog.find(t=>t.id===p.tool);if(!tool?.contract.templates?.length)throw Error('此操作没有关联的配置模板');const source=path.join(ROOT,'src/resources/templates'),directory=path.join(project.root,'input');if(fs.existsSync(directory))inside(project.root,directory);else fs.mkdirSync(directory);const files=tool.contract.templates.map(name=>{const src=inside(source,name),target=path.join(directory,name),existed=fs.existsSync(target);if(existed)inside(project.root,target);else fs.copyFileSync(src,target,fs.constants.COPYFILE_EXCL);return {name,path:path.relative(project.root,target),existed,templateHash:createHash('sha256').update(fs.readFileSync(src)).digest('hex')};});return {files};}
   case 'bootstrap':{const legacy=await legacyUiTools();return {version:readJSON('package.json').version,preview:process.env.AUDIT_WORKBENCH_PREVIEW==='1',build:fs.existsSync(path.join(ROOT,'build/client/index.html'))?fs.statSync(path.join(ROOT,'build/client/index.html')).mtime.toISOString():null,projects:store.all('projects').filter(p=>!p.internal),sessions:agents.sessionSummaries(store.all('sessions')),tools:catalog.filter(t=>t.engine==='builtin'),legacyTools:legacy,settings:settings(),jetRules:jet.rules,counts:{modules:legacy.length,templates:new Set(catalog.flatMap(t=>t.contract.templates||[])).size,skills:workflows.skills.length,mcp:legacy.length,legacyMcp:legacy.length,agentWorkflows:agentWorkflows.length},agentWorkflows:agentWorkflows.map(({id,version,title,goal,toolIds,nodes})=>({id,version,title,goal,toolIds,nodes})),coverage:{implemented:catalog.length,independentTasks:legacy.length,fixtureVerified:verification.localBusiness?.tasksCovered||0,liveServicesVerified:false,verification},activeTurns:[...streams.keys()]};}
   case 'runtime.status':{const client=new IndependentTaskClient();const excel=[process.env.ProgramFiles,process.env['ProgramFiles(x86)']].filter(Boolean).flatMap(base=>['Microsoft Office/root/Office16/EXCEL.EXE','Microsoft Office/Office16/EXCEL.EXE'].map(x=>path.join(base,x))).find(x=>fs.existsSync(x));return {mcpAvailable:client.available(),mcpPath:null,independent:true,taskCount:63,excel:excel||null,skills:workflows.skills.map(({id,name,description})=>({id,name,description}))};}
   case 'project.create':{const root=fs.realpathSync(p.root);if(!fs.statSync(root).isDirectory())throw new Error('请选择项目文件夹');if(typeof p.name!=='string'||!p.name.trim())throw new Error('请填写项目名称');return store.create('projects',{name:p.name.trim().slice(0,120),root});}
   case 'session.create':{if(p.projectId)must('projects',p.projectId);if(p.parentSessionId)must('sessions',p.parentSessionId);return store.create('sessions',{projectId:p.projectId||null,title:p.title?.slice(0,100)||'新对话',parentSessionId:p.parentSessionId||null,branchedFromEventId:p.branchedFromEventId||null});}
   case 'session.get':return agents.sessionRecord(p.id);
   case 'session.model':{const s=must('sessions',p.id);if(typeof p.model!=='string'||p.model.length>256)throw Error('模型名称无效');s.model=p.model.trim();return store.put('sessions',s);}
   case 'attachments.import':return attachments.import(p.sessionId,p.paths);
   case 'attachments.list':must('sessions',p.sessionId);return attachments.list(p.sessionId);
   case 'attachments.remove':return attachments.remove(p.sessionId,p.id);
   case 'attachments.path':return attachments.file(p.sessionId,p.id,p.childId);
   case 'models.list':return listModels({...settings(),...p.settings},p.key?.trim()?normalizeKey(p.key):apiKey);
   case 'connection.test':return testConnection({...settings(),...p.settings},p.key?.trim()?normalizeKey(p.key):apiKey);
   case 'session.rename':{const s=must('sessions',p.id);s.title=String(p.title||'新对话').slice(0,100);return store.put('sessions',s);}
    case 'session.delete':{
     const id=p.id;must('sessions',id);if(streams.has(id))throw Error('当前对话仍在执行，请先停止');
     fs.rmSync(path.join(dataRoot,'sessions',id+'.jsonl'),{force:true});
     const runIds=new Set(store.all('agentRuns').filter(run=>run.sessionId===id).map(run=>run.id));
     for(const kind of ['toolCalls','tasks','attachments','agentToolResults','agentModelInputs'])for(const item of store.all(kind).filter(item=>item.sessionId===id))store.delete(kind,item.id);
     for(const runId of runIds){store.delete('agentRuns',runId);removeTree(path.join(workspaceRoot(store),runId));}
     for(const project of store.all('projects').filter(item=>item.internal&&(runIds.has(item.agentRunId)||item.attachmentSessionId===id)))store.delete('projects',project.id);
     for(const directory of ['workspaces','attachments'])removeTree(path.join(dataRoot,directory,id));collectUnusedBlobs(store);
     store.delete('sessions',id);return {deleted:id};
    }
   case 'files.list':return listFiles(must('projects',p.projectId).root,p.path||'');
   case 'project.activity':{must('projects',p.projectId);return {sessions:store.all('sessions').filter(s=>s.projectId===p.projectId),tasks:store.all('tasks').filter(t=>t.projectId===p.projectId)};}
   case 'files.preview':{
    if(previews>=2)throw new Error('预览正在处理，请稍后重试');const project=must('projects',p.projectId);const inputFile=inside(project.root,p.file);if(fs.statSync(inputFile).isDirectory())return {columns:['名称','类型','大小'],preview:listFiles(project.root,p.file).slice(0,50).map(f=>[f.name,f.directory?'文件夹':'文件',f.size||0]),previewOnly:true};
    if(['.json','.txt','.md'].includes(path.extname(inputFile).toLowerCase())){const fd=fs.openSync(inputFile,'r');try{const buffer=Buffer.alloc(Math.min(fs.statSync(inputFile).size,100000));fs.readSync(fd,buffer);return {text:buffer.toString('utf8'),previewOnly:true,truncated:fs.statSync(inputFile).size>100000};}finally{fs.closeSync(fd);}}
    previews++;
    try{return await new Promise((resolve,reject)=>{let result,err;const child=worker({protocolVersion:1,taskId:'preview',root:project.root,tool:'__preview',files:[p.file],mode:'auto',parameters:p.parameters||{},limits:{memoryMiB:512,threads:1}},ev=>{if(ev.type==='result')result=ev.result;if(ev.type==='error')err=ev.message;});const timer=setTimeout(()=>{child.kill();reject(Error('预览超时'));},20000);child.once('close',()=>{clearTimeout(timer);result?resolve(result):reject(Error(err||'预览失败'));});});}finally{previews--;}
   }
   case 'demo.create':{
    const root=path.join(dataRoot,'合成示例项目');fs.mkdirSync(root,{recursive:true});const f=path.join(root,'示例序时账.csv');
    if(!fs.existsSync(f))fs.writeFileSync(f,'\ufeff公司,凭证日期,凭证编号,科目编码,科目名称,借方金额,贷方金额,摘要,制单人,审核人\r\n示例公司,2026-01-05,记001,1002,银行存款,100000,0,销售回款,张三,李四\r\n示例公司,2026-01-05,记001,6001,主营业务收入,0,100000,销售回款,张三,李四\r\n示例公司,2026-02-08,记002,6602,管理费用,5200,0,服务费,张三,张三\r\n示例公司,2026-02-08,记002,1002,银行存款,0,5000,服务费,张三,张三\r\n示例公司,2026-02-10,记003,1002,银行存款,2000000,0,销售回款,王五,李四\r\n示例公司,2026-02-10,记003,6001,主营业务收入,0,2000000,销售回款,王五,李四\r\n示例公司,2026-03-09,记004,6602,管理费用,-100,0,调整,张三,李四\r\n示例公司,2026-03-09,记004,1002,银行存款,0,-100,调整,张三,李四\r\n','utf8');
    const existing=store.all('projects').find(p=>p.root===root);return existing||store.create('projects',{name:'合成示例 · 审计流程',root});
   }
   case 'settings.save':{
    const s={...settings(),...p,id:'settings'};s.baseUrl=normalizeBase(s.baseUrl);
    for(const k of ['model','visionModel']){if(typeof s[k]!=='string'||s[k].length>256)throw Error('模型名称无效');s[k]=s[k].trim();}
    if(!s.model)throw Error('请选择文本模型');
    if(!Array.isArray(s.models)||s.models.length>2000||s.models.some(m=>typeof m!=='string'||!m||m.length>256))throw Error('模型列表无效');
    if(!Number.isInteger(s.memoryMiB)||s.memoryMiB<256||s.memoryMiB>8192)throw new Error('内存预算应在 256–8192 MiB');
    if(!Number.isInteger(s.threads)||s.threads<1||s.threads>8)throw new Error('线程数应在 1–8');
    if(!Number.isFinite(s.temperature)||s.temperature<0||s.temperature>2)throw new Error('温度应在 0–2');
    if(!Number.isInteger(s.maxTokens)||s.maxTokens<128||s.maxTokens>32768)throw new Error('单轮最大输出应在 128–32768');
    if(!Number.isInteger(s.contextWindow)||s.contextWindow<16384||s.contextWindow>2000000)throw new Error('上下文窗口应在 16384–2000000');
    if(!['auto','local-light','local-batch'].includes(s.defaultMode))throw new Error('默认模式无效');
    const safe=Object.fromEntries(Object.keys(defaults).map(k=>[k,s[k]]));store.put('settings',safe);return settings();
   }
   case 'secret.set':apiKey=normalizeKey(p.key||'');return {hasKey:!!apiKey};
   case 'secret.cicpa.set':{const raw=String(p.cookies||'').trim();if(raw){let data;try{data=JSON.parse(raw);}catch{throw Error('注协授权必须是有效 Cookie JSON');}if(!data||typeof data!=='object'||raw.length>100000)throw Error('注协授权格式无效');}cicpaCookies=raw;return {hasCicpaCookies:!!cicpaCookies};}
   case 'service.cicpa.test':{if(!cicpaCookies)throw Error('请先保存注协授权');const checkRoot=path.join(dataRoot,'service-checks');fs.mkdirSync(checkRoot,{recursive:true});const client=new IndependentTaskClient({workDir:checkRoot,settings:{cicpaCookies}});try{const result=await client.call('cicpa_query',{query_mode:'check_cookies'});if(result.isError)throw Error(result.content?.[0]?.text||'授权检查失败');return {authorized:true,message:'注协授权检查通过'};}finally{await client.close();}}
   case 'task.run':{
    const session=must('sessions',p.sessionId);if(!session.projectId)throw new Error('请先关联项目再操作文件');const project=must('projects',session.projectId);
    const tool=catalog.find(t=>t.id===p.tool);if(!tool)throw Error('工具未实现，不能执行');
    const requestedFiles=Array.isArray(p.files)?p.files:[],mode=p.mode||settings().defaultMode;
    if(requestedFiles.length>1000||new Set(requestedFiles).size!==requestedFiles.length)throw Error('资料不能重复，且最多 1000 项');
    if(!['auto','local-light','local-batch'].includes(mode))throw Error('处理模式无效');
    const params=normalizeParameters(tool,p.parameters||{});const permitted=requestedFiles.map(f=>inside(project.root,f));
    if(session.workflow){workflows.runAllowed(session.id,p.stageId,p.tool);if(store.all('tasks').some(t=>t.sessionId===session.id&&['queued','running','cancelling'].includes(t.status)))throw Error('当前任务仍在执行');}
    const checkFormat=(file,extensions=tool.contract.extensions)=>{if(extensions?.length&&!extensions.includes(path.extname(file).toLowerCase()))throw Error(path.basename(file)+' 格式不支持；'+tool.contract.format);};
    let task;
    if(tool.engine==='mcp'){
      if(tool.contract.mutates&&p.acknowledgeMutation!==true)throw Error('请确认此操作可能写入或修改所选资料，并使用已备份的工作副本');
      for(const field of tool.fields.filter(f=>INPUT_PATH_KEYS.has(f.key))){const vals=Array.isArray(params[field.key])?params[field.key]:[params[field.key]];for(const v of vals.filter(Boolean)){const file=inside(project.root,v);if(fs.statSync(file).isFile())checkFormat(file,field.key==='config_file'?['.xlsx','.xlsm']:tool.contract.extensions);else if(field.kind==='file'&&field.key!=='source_paths')throw Error(field.label+'需要选择文件');}}
      const args=constrainMcpArgs(params,project.root,'',new Set(permitted));
      if(tool.id==='mcp_related_party')inside(project.root,'input/关联方核查配置表.xlsx');
      for(const field of tool.fields.filter(f=>f.kind==='json'&&args[f.key]))args[field.key]=JSON.stringify(constrainMcpArgs(JSON.parse(args[field.key]),project.root,'',new Set(permitted)));
      for(const [key,value]of Object.entries({api_key:apiKey,base_url:settings().baseUrl,model_name:settings().model,visual_model_name:settings().visionModel}))if(tool.fields.some(f=>f.key===key)&&!args[key]&&value)args[key]=value;
      const safeParams=Object.fromEntries(Object.entries(params).filter(([k])=>!tool.fields.some(f=>f.key===k&&f.kind==='secret')));
      task=store.create('tasks',{sessionId:session.id,projectId:project.id,stageId:p.stageId,tool:tool.id,mcpName:tool.mcpName,engine:'mcp',files:requestedFiles,mode,parameters:safeParams,acknowledgeMutation:p.acknowledgeMutation===true,status:'running',root:project.root});store.append(session.id,{type:'task',taskId:task.id});
      if(session.workflow)workflows.attachTask(session.id,p.stageId,task.id);mcpRunner.launch(task,args,{...settings(),api_key:apiKey,cicpaCookies});
    }else{
      const files=[];const expand=(file,depth=0)=>{if(depth>12||files.length>=1000)throw Error('目录过深或超过 1000 个文件，请缩小资料范围');if(fs.statSync(file).isDirectory()){for(const e of fs.readdirSync(file,{withFileTypes:true})){if(e.name.startsWith('.')||e.isSymbolicLink()||['output','outputs'].includes(e.name))continue;const f=inside(project.root,path.join(file,e.name));if(e.isDirectory()||!tool.contract.extensions||tool.contract.extensions.includes(path.extname(f).toLowerCase()))expand(f,depth+1);}}else{checkFormat(file);files.push(path.relative(project.root,file));}};permitted.forEach(f=>expand(f));
      if(!files.length)throw Error('请选择本功能支持的资料：'+tool.contract.format);
      task=scheduler.queue(session,project,tool.id,[...new Set(files)],mode,params,settings());task.stageId=p.stageId;store.put('tasks',task);if(session.workflow)workflows.attachTask(session.id,p.stageId,task.id);
    }
    return task;
   }
   case 'task.cancel':return must('tasks',p.id).engine==='mcp'?mcpRunner.cancel(p.id):scheduler.cancel(p.id);
   case 'task.retry':{const t=must('tasks',p.id);if(!['failed','interrupted','cancelled'].includes(t.status))throw Error('此任务不能重试');if(t.agentRunId)return agents.action('agent.resume',{id:t.agentRunId});return action('task.run',{sessionId:t.sessionId,stageId:t.stageId,tool:t.tool,files:t.files,mode:t.mode,parameters:t.parameters,acknowledgeMutation:t.acknowledgeMutation});}
   case 'result.path':{const t=must('tasks',p.id);if(!t.result)throw Error('任务尚无结果');const root=must('projects',t.projectId).root;const output=t.result.outputs?.find(x=>x.name===p.name&&(p.path===undefined||x.path===p.path));if(!output)throw Error('成果文件不在任务记录中');return inside(root,output.path||path.join(t.result.outputDir,output.name));}
   case 'result.preview':{const task=must('tasks',p.id),file=await action('result.path',p),project=must('projects',task.projectId),value=await action('files.preview',{projectId:project.id,file:path.relative(project.root,file)}),run=task.agentRunId&&store.get('agentRuns',task.agentRunId);if(!run)return value;const columns=value.columns || [],fileIndex=columns.indexOf('_source_file'),rowIndex=columns.indexOf('_source_row'),sheetIndex=columns.indexOf('_source_sheet');if(fileIndex<0||rowIndex<0)return value;value.sourceOrigins=(value.preview || []).map(row=>{const input=run.inputs.find(input=>path.normalize(input.path)===path.normalize(String(row[fileIndex] || ''))),sourceRow=Number(row[rowIndex]);return input&&Number.isInteger(sourceRow)&&sourceRow>0?{runId:run.id,sessionId:run.sessionId,inputId:input.id,path:input.path,row:sourceRow,sheet:row[sheetIndex],headerRow:Number(task.parameters?.headerRow || 1)}:null;});return value;}
   case 'agent.sourcePreview':{const run=must('agentRuns',p.id);if(run.sessionId!==p.sessionId)throw Error('资料来源不属于当前对话');const input=run.inputs.find(item=>item.id===p.inputId);if(!input)throw Error('资料未登记在此任务中');if(fileHash(input.snapshotPath)!==input.sha256)throw Error('已保存的资料副本与任务版本不一致');const root=path.dirname(inside(dataRoot,input.snapshotPath));let project=store.all('projects').find(item=>item.internal&&item.root===root);if(!project)project=store.create('projects',{internal:true,name:'任务资料来源',root});const parameters={};if(p.row!==undefined){if(!Number.isInteger(p.row)||p.row<2||p.row>10000000||!Number.isInteger(p.headerRow || 1))throw Error('来源行无效');parameters.previewStartRow=p.row;parameters.headerRow=p.headerRow || 1;if(p.sheet)parameters.sheets=String(p.sheet);}return {...await action('files.preview',{projectId:project.id,file:path.basename(input.snapshotPath),parameters}),highlightedSourceRow:p.row};}
   case 'migration.get':return {runtime:'independent-python',taskCount:legacyToolMetadata.length,tools:legacyToolMetadata.map(t=>({id:t.name,description:t.description})),verification};
   default:throw new Error('未知操作');
  }
 }
 return {store,action,close:()=>{closed=true;agents.close();mcpRunner.close();scheduler.stop();for(const x of streams.values())x.controller.abort();store.close();}};
}

