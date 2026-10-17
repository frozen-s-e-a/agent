import {worker} from '../task-scheduler/scheduler.mjs';
import {randomUUID} from 'node:crypto';

const define=(name,description,properties,required=[])=>({type:'function',function:{name,description,parameters:{type:'object',properties,required,additionalProperties:false}}});
export const workbookControls=[
 define('read_workbook_range','读取工作簿的实际坐标、原值、公式及缓存。未指定 sheet/range 时返回工作表清单和结构样本；指定明确矩形范围可分页。不要把样本第一行自动当表头。完整汇总由填写执行器读取全部明细。',{file:{type:'string'},sheet:{type:'string'},range:{type:'string'},offset:{type:'integer',minimum:0},limit:{type:'integer',minimum:1,maximum:1200}},['file']),
 define('save_workbook_plan','保存并验证普通模板填写计划，无需批注或额外配置工作簿。plan: {file_path:模板引用,targetSheets:目标表名数组,required:[{sheet,range:必填矩形}],headers:[{file_path,sheet,row,columns:{A:实际表头文字}}],periodChecks:[{source:{file_path,sheet,cell:期间标签},target:{file_path,sheet,cell:期间标签}}],writes:[{sheet,cell,expr,reason:来源与口径依据}]}。目标列表头带年份时需要 periodChecks；来源没有任何期间标签、但用户已在要求或回答中说明年份时，source 写 {file_path,sheet,confirmedYear:"2025"}，不需要 cell。expr 只能使用受控规则：cell({file_path,sheet,cell})；sum/lookup/count({file_path,sheet,headerRow,column:列字母,startRow,endRow:整数或auto,filters:[{column,op:equals/contains/starts_with/not_equals,value}]})，sum 加 allowEmpty:true 时没有匹配行按 0；add/subtract/multiply/divide/round/concat/trim/text_before/text_after({args:表达式数组,digits,delimiter,occurrence,separator})；scale({value:表达式,factor:单位或方向系数})。按 Excel 规则，空白或“-”金额计为 0。cell 可引用模板中本计划写入的单元格或依赖它们的公式，按写入后的结果计算。逐行填写可用 writes 项 {sheet,range,expr,reason}，expr 中的 cell 可用 B{row} 引用当前目标行；filters 可用 valueExpr 从模板行读取匹配键，程序据此汇总全量来源。复制矩形可用 writes 项 {sheet,range,source:{file_path,sheet,range},reason}。不能传猜测的业务数值或任意代码。模板公式单元格不要写入，列入 required 即由程序重算核对。已有非空值（0 和“-”除外）需 allowOverwrite:true 和 expectedOld。计划问题返回 plan_revision，在上次计划上修改后重新保存；只有业务口径或资料缺失才保存问题等待用户。',{plan:{type:'object',additionalProperties:true}},['plan']),
 define('execute_workbook_plan','执行已验证并持久保存的填写计划，计算全量来源、生成新工作簿并独立重读所有必填位置。成功后返回真实成果及核对记录。',{planHash:{type:'string'}},['planHash']),
];
export const workbookLabels={read_workbook_range:'读取工作簿范围',save_workbook_plan:'保存填写方案',execute_workbook_plan:'填写并核对工作簿'};

export function requestedSheetCount(text){
 const m=String(text).match(/前\s*([一二两三四五六七八九十\d]+)\s*(?:个|张)?\s*(?:sheet|工作表|表)/i);
 if(!m)return null;
 const count=Number(m[1])||({一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10})[m[1]];
 return Number.isInteger(count)&&count>0&&count<=100?count:null;
}
/** The sheets "the first N sheets" means: visible ones, leaving out a sheet the request names as the source. */
export function expectedTargetSheets(objective,sheets,count){
 const visible=sheets.filter(sheet=>(sheet.state||'visible')==='visible');
 const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const source=visible.filter(sheet=>new RegExp('(?:用|根据|按照?|依据|从|以)\\s*'+escape(sheet.name)+'(?![\\w])','i').test(String(objective||'')));
 return visible.filter(sheet=>!source.includes(sheet)).slice(0,count).map(sheet=>sheet.name);
}
export function workbookFiles(plan){
 const refs=new Set();
 const visit=value=>{if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){if(key==='file_path'&&typeof item==='string')refs.add(item);else visit(item);}};
 visit(plan);return [...refs];
}
export function workbookSummary(book){
 if(!book)return null;
 return {phase:book.phase,planHash:book.prepared?.planHash,template:book.plan?.file_path,targetSheets:book.targetSheets||book.plan?.targetSheets||[],writeCount:book.prepared?.writeCount,taskId:book.taskId,...(book.lastPlan&&book.phase!=='ready'&&book.phase!=='verified'?{lastPlanStatus:book.lastPlan.status,lastPlanIssue:book.lastPlan.issue||book.lastPlan.error}:{}),nextAction:book.phase==='ready'?'execute_workbook_plan':book.phase==='verified'?'deliver_verified_workbook':'read_workbook_range_then_save_workbook_plan_or_ask_user_questions'};
}
export function workbookGuide(run){
 return '工作簿填写任务执行规则：已有普通模板填写工具 read_workbook_range、save_workbook_plan、execute_workbook_plan。不要因为没有批注而继续搜索旧的明细生成器。先读取模板目录及目标区域，再查看来源真实表头和少量代表性记录。依据用户要求与标签确定期间、方向和单位，歧义用 ask_user_questions；用户在要求或回答中已说明的年份，用 periodChecks 的 confirmedYear 记录，不要重复提问。将全量来源规则与必填范围存入 save_workbook_plan；验证通过后下一步必须 execute_workbook_plan。不能用预览、结构检查或列提取代替实际填写。无需把全部明细分页读入上下文，sum/lookup 会读取全部指定行。模板的已有公式和样式保留。业务数值由来源表达式产生，不能猜测调整额为零。\n当前执行状态（数据）：'+JSON.stringify(workbookSummary(run.workbook))+(run.workbook?.lastPlan?.plan&&run.workbook.phase!=='ready'&&run.workbook.phase!=='verified'?'\n上次提交的填写计划（数据，在此基础上修订，不要从头重写）：'+JSON.stringify({status:run.workbook.lastPlan.status,issue:run.workbook.lastPlan.issue||run.workbook.lastPlan.error,hint:run.workbook.lastPlan.hint,plan:run.workbook.lastPlan.plan}):'');
}
export function workbookProbe(root,files,tool,parameters,signal){
 return new Promise((resolve,reject)=>{
  let result,error,done=false;
  const child=worker({protocolVersion:1,taskId:'workbook-'+randomUUID(),root,tool,files,mode:'auto',parameters,limits:{memoryMiB:1024,threads:1}},event=>{if(event.type==='result')result=event.result;if(event.type==='error')error=event.message;});
  const finish=(err,value)=>{if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);err?reject(err):resolve(value);};
  const cancel=()=>{child.kill();finish(Error('已停止工作簿读取'));};
  const timer=setTimeout(()=>{child.kill();finish(Error('工作簿读取或计划校验超时，请缩小取证范围'));},60000);
  signal.addEventListener('abort',cancel,{once:true});child.once('error',e=>finish(e));child.once('close',()=>finish(result?null:Error(error||'工作簿处理失败'),result));if(signal.aborted)cancel();
 });
}
