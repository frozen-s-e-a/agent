import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {inside,listFiles} from '../file-ops/paths.mjs';import {worker} from '../task-scheduler/scheduler.mjs';
import {boundedToolResult} from '../agent/context-builder.mjs';
const source={type:'string',enum:['project','attachments'],description:'project 为当前项目，attachments 为当前对话已发送附件'};
const parameters={type:'object',description:'工具参数。表格可指定 headerRow（1 起）、sheets（工作表名逗号分隔）、encoding。业务字段按 get_audit_tools 返回填写。',additionalProperties:true};
const define=(name,description,properties,required=[])=>({type:'function',function:{name,description,parameters:{type:'object',properties,required,additionalProperties:false}}});
export const localToolDefinitions=[
 define('list_local_files','列出当前项目文件夹或本对话已发送附件。先列出确认文件引用，不能猜测路径。',{source,path:{type:'string',description:'仅 project：相对文件夹路径，根目录为空'},offset:{type:'integer',minimum:0}},['source']),
 define('preview_local_file','真实读取本地文件。Excel 返回工作表、隐藏状态、合并范围、表头、样本及单元格格式；文本/PDF/Word 返回有界摘录。可改 headerRow/sheets 继续读取。',{source,file:{type:'string',description:'list_local_files 返回的 file 引用'},parameters},['source','file']),
 define('get_audit_tools','查看工具目录；传 toolIds 获取指定工具的完整参数合同，执行前核对。',{toolIds:{type:'array',items:{type:'string'},maxItems:8}}),
 define('run_audit_tool','运行 get_audit_tools 目录中的审计工具并等待真实结果（含 mcp_ 开头的独立工具）。files 使用项目路径或附件编号，parameters 按实际工具合同填写；附件编号会转换为工作副本路径。原文件不覆盖，输出新文件，不猜测业务规则。',{source,tool:{type:'string',description:'get_audit_tools 返回的 id'},files:{type:'array',items:{type:'string'},minItems:1,maxItems:200},parameters,mode:{type:'string',enum:['auto','local-light','local-batch']}},['source','tool','files','parameters']),
 define('get_task_result','读取已执行审计任务的真实状态、结果样本及输出文件。仅接受 run_audit_tool 或 audit_* 返回的 taskId；文件预览的 agentToolResults 引用使用 read_agent_result。',{taskId:{type:'string',description:'真实执行任务的 taskId，不能使用工具调用编号或预览结果编号'}},['taskId'])
];
export const toolLabels={list_local_files:'浏览本地文件',preview_local_file:'读取文件内容',get_audit_tools:'选择审计工具',run_audit_tool:'执行本地审计',get_task_result:'读取执行结果'};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function summary(t){return {ok:t.status==='succeeded',taskId:t.id,status:t.status,tool:t.tool,validationStatus:t.validationStatus||'not_checked',publicationStatus:t.publicationStatus||'not_published',error:t.error||undefined,...(t.result?{inputRows:t.result.inputRows,inputUnit:t.result.inputUnit||'输入记录',resultRows:t.result.rowCount,resultUnit:t.result.resultUnit||'结果记录',structureOnly:!!t.result.structureOnly,columns:t.result.columns,preview:t.result.preview?.slice(0,20),previewIsSample:true,outputs:t.result.outputs,workbookValidation:t.result.workbookValidation,warningCount:t.result.warningCount,warnings:t.result.warnings?.slice(0,5),note:'任务已实际执行；样本最多 20 行，完整结果可在任务卡打开。兼容性：'+t.result.compatibility}:{phase:t.phase})};}
export const TASK_WAIT_MS=10*60*1000;
export function createModelTools({store,scheduler,attachments,session,settings,selectedProjectFiles=[],catalog,signal,onPhase,validateTask,runTask,boundResults=true,taskTimeoutMs=TASK_WAIT_MS}){
 const repeated=new Map();
 const selectedSet=new Set(selectedProjectFiles.filter(f=>typeof f==='string').map(f=>path.normalize(f)));
 const project=()=>{const p=session.projectId&&store.get('projects',session.projectId);if(!p)throw Error('当前对话未关联项目，请使用已上传附件，或先创建项目选择文件夹');return p;};
 const sent=()=>store.all('attachments').filter(a=>a.sessionId===session.id&&a.used&&!a.removed);
 const attachmentFiles=()=>sent().flatMap(a=>(a.children||[a]).map(f=>({record:f,file:a.children?a.id+'/'+f.id:a.id,name:a.children?a.name+'/'+f.name:f.name,size:f.size,kind:f.kind})));
 function resolve(scope,file){if(typeof file!=='string'||!file||file.length>2000)throw Error('文件引用无效');if(scope==='project'){const p=project();if(!fs.existsSync(path.resolve(p.root,file)))throw Error('文件不存在：'+file+'。请用 list_local_files 返回的 file 引用');const filePath=inside(p.root,file),relative=path.normalize(path.relative(p.root,filePath)),stat=fs.statSync(filePath);if(selectedSet.size&&!selectedSet.has(relative))throw Error('文件未在当前对话选择范围内');if(!stat.isFile())throw Error('请选择文件而不是文件夹');return {filePath,name:path.relative(p.root,filePath),size:stat.size,project:p};}if(scope==='attachments'){const a=attachmentFiles().find(a=>a.file===file);if(!a)throw Error('附件引用不存在、未发送或不属于当前对话');const filePath=inside(attachments.root,a.record.filePath);if(hash(fs.readFileSync(filePath))!==a.record.sha256)throw Error('附件副本已改变，请重新添加');return {...a.record,filePath,name:a.name,reference:file};}throw Error('文件来源无效');}
 async function preview(file,params){
  if(!['.csv','.tsv','.xlsx','.xlsm'].includes(path.extname(file.filePath).toLowerCase())){if(file.kind==='image')return {ok:true,name:file.name,note:'图片已作为视觉输入随对话发送；请依据图像分析，不能按表格读取。'};return {ok:true,name:file.name,...await attachments.extract(file,signal)};}
  return new Promise((resolve,reject)=>{let result,error,settled=false;const child=worker({protocolVersion:1,taskId:'model-preview',root:path.dirname(file.filePath),tool:'__structure',files:[path.basename(file.filePath)],mode:'auto',parameters:params,limits:{memoryMiB:512,threads:1}},e=>{if(e.type==='result')result=e.result;if(e.type==='error')error=e.message;});const finish=(err,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);err?reject(err):resolve(value);};const cancel=()=>{child.kill();finish(Error('已停止文件读取'));};const timer=setTimeout(()=>{child.kill();finish(Error('文件预览超过 20 秒，已停止，可改用大批量工具'));},20000);signal.addEventListener('abort',cancel,{once:true});child.once('close',()=>finish(result?null:Error(error||'文件读取失败'),{ok:true,...result,name:file.name,file:file.reference||file.name,previewIsSample:true,note:(result?.note||'这是结构与有限样本。')+' 完整数据处理请调用审计工具，不要重复预览获取全表。'}));if(signal.aborted)cancel();});
 }
 async function attachmentProject(files){
  let p=store.all('projects').find(p=>p.internal&&p.attachmentSessionId===session.id);if(!p){const root=path.join(store.root,'workspaces',session.id);fs.mkdirSync(root,{recursive:true});inside(store.root,root);p=store.create('projects',{name:'对话附件结果',root,internal:true,attachmentSessionId:session.id});}
  const copied=[];for(const f of files){signal.throwIfAborted();const relative=path.join('inputs',f.reference.split('/')[0],f.name),dest=path.resolve(p.root,relative);if(!dest.startsWith(path.resolve(p.root)+path.sep))throw Error('附件目标超出工作范围');fs.mkdirSync(path.dirname(dest),{recursive:true});inside(p.root,path.dirname(dest));if(!fs.existsSync(dest))fs.copyFileSync(f.filePath,dest,fs.constants.COPYFILE_EXCL);if(hash(fs.readFileSync(inside(p.root,dest)))!==f.sha256)throw Error('附件工作副本已改变，请重新添加');copied.push(path.relative(p.root,dest));}return {project:p,files:copied};
 }
 async function execute(name,args){
  signal.throwIfAborted();onPhase(toolLabels[name]||'处理本地请求');
  if(!localToolDefinitions.some(t=>t.function.name===name))throw Error('工具未获授权');
  const allowed=Object.keys(localToolDefinitions.find(t=>t.function.name===name).function.parameters.properties);if(Object.keys(args).some(k=>!allowed.includes(k)))throw Error('包含不支持的参数');
  if(name==='get_audit_tools')return {ok:true,tools:catalog.filter(tool=>!args.toolIds||args.toolIds.includes(tool.id)).map(({id,name,description,fields})=>({id,name,description,fields})),rules:JSON.parse(fs.readFileSync(new URL('../resources/jet-rules.json',import.meta.url),'utf8')).rules.map(r=>r.name),note:'以实际列名、用户要求和明确规则填写参数。输出始终是新文件。'};
  if(name==='list_local_files'){const offset=args.offset??0;if(!Number.isInteger(offset)||offset<0)throw Error('分页位置无效');if(args.source==='project'){const allFiles=listFiles(project().root,args.path||''),files=selectedSet.size?allFiles.filter(f=>!f.directory&&selectedSet.has(path.normalize(f.path))):allFiles;return {ok:true,source:'project',files:files.slice(offset,offset+100).map(f=>({...f,file:f.path})),hasMore:offset+100<files.length,note:selectedSet.size?'仅显示当前对话已选择的文件。':'当前目录最多列出 500 项；子文件夹需要继续列出。'};}if(args.source!=='attachments')throw Error('文件来源无效');const files=attachmentFiles().map(({record,...f})=>f);return {ok:true,source:'attachments',files:files.slice(offset,offset+100),hasMore:offset+100<files.length};}
  if(name==='preview_local_file'){
   const params={...validParameters(args.parameters||{})};
   for(const [alias,key] of [['sheet_name','sheets'],['header_row','headerRow']])if(params[alias]!==undefined){if(params[key]!==undefined&&String(params[key])!==String(params[alias]))throw Error('预览参数冲突：'+alias+' / '+key);params[key]=params[alias];delete params[alias];}
   if(Object.keys(params).some(key=>!['headerRow','sheets','encoding'].includes(key)))throw Error('文件结构预览只支持 headerRow、sheets 和 encoding；完整数据处理请调用审计工具');
   if(params.sheets!==undefined&&typeof params.sheets!=='string')throw Error('sheets 必须为工作表名称文本');
   return preview(resolve(args.source,args.file),validParameters(params));
  }
  if(name==='get_task_result'){const t=store.get('tasks',args.taskId);if(!t||t.sessionId!==session.id)throw Error('任务不存在或不属于此对话；taskId 必须来自实际审计执行返回，工具调用编号不是任务编号。文件预览的 agentToolResults 引用请用 read_agent_result 读取');return {...summary(t),resultRef:{kind:'tasks',id:t.id},readHint:{tool:'read_agent_result',arguments:{taskId:t.id}},note:'这是任务状态与有限样本。完整原始返回用 read_agent_result 的 taskId 直接分页读取，无需搜索结果索引。'};}
  if(name==='run_audit_tool'){
   const tool=catalog.find(t=>t.id===args.tool);if(!tool)throw Error('此审计工具尚未实现');if(!Array.isArray(args.files)||!args.files.length||args.files.length>200||new Set(args.files).size!==args.files.length)throw Error('请选择 1–200 个不重复文件');const params=validParameters(args.parameters||{},tool.id==='workbook_fill'?512000:32000);for(const field of tool.fields)if(field.required&&!String(params[field.key]??'').trim())throw Error('缺少必填参数：'+field.label);const mode=settings.requestedMode||args.mode||settings.defaultMode;if(!['auto','local-light','local-batch'].includes(mode))throw Error('处理模式无效');
   const signature=JSON.stringify({source:args.source,tool:tool.id,files:args.files,parameters:params,mode});
   if(repeated.has(signature))return repeated.get(signature);
   const files=args.files.map(f=>resolve(args.source,f));const input=args.source==='project'?{project:project(),files:files.map(f=>f.name)}:await attachmentProject(files);signal.throwIfAborted();
   // With runTask the caller owns reuse (its keys include input versions); this lookup only covers direct use.
   const existing=runTask?null:store.all('tasks').filter(item=>item.sessionId===session.id&&item.idempotencyKey===signature).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0];
   if(existing?.status==='succeeded'){
    const cached=summary(existing);repeated.set(signature,cached);return cached;
   }
   const task=runTask?await runTask({sessionId:session.id,project:input.project,tool:tool.id,files:input.files,mode,parameters:params,idempotencyKey:signature}):scheduler.queue(session,input.project,tool.id,input.files,mode,params,settings);
   if(!runTask){if(!task.idempotencyKey)task.idempotencyKey=signature;task.agentSessionId=session.id;store.put('tasks',task);}
   const cancel=()=>runTask?runTask({cancel:task.id}):scheduler.cancel(task.id);signal.addEventListener('abort',cancel,{once:true});const deadline=Date.now()+taskTimeoutMs;
   try{while(true){signal.throwIfAborted();const current=store.get('tasks',task.id);if(!['queued','running','cancelling'].includes(current.status)){
      if(current.status==='succeeded'&&validateTask){try{validateTask(current);}catch(error){current.status='failed';current.error=error.message;current.validationStatus='failed';current.publicationStatus='rejected';store.put('tasks',current);}}
      const result=summary(store.get('tasks',task.id));if(result.ok)repeated.set(signature,result);return result;
    }if(Date.now()>deadline){await cancel();const latest=store.get('tasks',task.id);return {...summary(latest),ok:false,error:`本地任务超过 ${Math.round(taskTimeoutMs/60000)} 分钟，已请求停止；当前状态：${latest.status}`};}onPhase(tool.name+' · '+(current.phase||'执行中'));await new Promise(r=>setTimeout(r,250));}}finally{signal.removeEventListener('abort',cancel);}
  }
  throw Error('未知本地工具');
 }
  return {definitions:localToolDefinitions,execute:async(name,args)=>{const r=await execute(name,args);return boundResults?boundedToolResult(r,{limit:90000,resultRef:r?.taskId?{kind:'tasks',id:r.taskId}:undefined}):r;},scope:{project:session.projectId?{name:project().name}:null,attachments:attachmentFiles().map(({record,...f})=>f).slice(0,100)}};
}
function validParameters(params,maxBytes=32000){if(!params||Array.isArray(params)||typeof params!=='object'||JSON.stringify(params).length>maxBytes)throw Error('工具参数无效');if(params.headerRow!==undefined&&(!Number.isInteger(Number(params.headerRow))||Number(params.headerRow)<1||Number(params.headerRow)>10000))throw Error('表头行必须在 1–10000');return params;}
