/** Only concrete processing requests require a tool-produced result. Status questions remain read-only. */
export function executionIntent(text){
 const value=String(text||'');
 if(/(?:如何|怎么|怎样|解释|介绍|说明|执行到哪|任务进度|任务状态)/.test(value)&&!/(?:请|帮我|直接|继续).*(?:执行|生成|填写|填充|提取|合并)/.test(value))return false;
 return /(?:填写|填充|生成|制作|导出|提取|汇总|合并|替换|拆分|插入|转换|计算|借贷.*平衡|执行.*(?:检查|审计|任务))/.test(value);
}
export function statusRequest(text){return /(?:执行到哪|进度|任务状态|完成了什么|做了什么|完成哪些)/.test(String(text||''))&&!/(?:继续|接着).*(?:做|执行|完成)/.test(String(text||''));}
export function continuationRequirements(previousRuns,explicit){
 return explicit||[...previousRuns].reverse().find(run=>(run.requirements||[]).some(item=>executionIntent(item.text)));
}
export function executionObjective(requirements,fallback){
 const item=[...requirements].reverse().find(item=>executionIntent(item.text)&&!String(item.text).startsWith('继续上次任务：'));
 return item?.text||fallback;
}
export function completionGap(run,tasks){
 if(!run.requiresTaskExecution)return null;
 if(run.workbook&&run.requiresWorkbookOutput){
  const task=tasks.find(task=>task.id===run.workbook.taskId),validation=task?.result?.workbookValidation;
  if(task?.status!=='succeeded'||task.validationStatus!=='passed'||validation?.status!=='passed'||validation.planHash!==run.workbook.prepared?.planHash||validation.verifiedCount!==validation.requiredCount)return '填写任务尚未完成。先用 read_workbook_range 识别实际模板和来源，再 save_workbook_plan 保存映射并 execute_workbook_plan 生成、重读真实成果。口径缺失用 ask_user_questions 集中提问。';
  if(!run.workbook.plan.targetSheets.every(sheet=>validation.targetSheets.includes(sheet)))return '填写成果遗漏了目标工作表，不能结束。';
 }
 const execution=run.steps.filter(step=>step.name==='execute_workbook_plan'||step.name==='run_audit_tool'||String(step.name).startsWith('audit_'));
 if(!execution.length)return '任务尚未全部完成：当前只有读取或说明，没有实际执行审计任务。按原始要求继续调用已登记工具；已知任务结果可用 read_agent_result 的 taskId 直接读取，无需遍历结果索引。缺少口径时用 ask_user_questions 提问。';
 if(run.requiresWorkbookOutput){
  const completed=execution.map(step=>tasks.find(task=>task.id===step.taskId)).filter(task=>task?.status==='succeeded'&&task.validationStatus==='passed');
  if(completed.length&&!completed.some(task=>(task.result?.outputs||[]).some(output=>/\.(xlsx|xlsm|xls|csv|tsv)$/i.test(output.name||output.path))))return '任务尚未全部完成：已执行的只是结构检查，尚未生成可核对的填写成果。请实际填写并输出新工作簿；检查结果或读取样本不能替代填写成果。';
 }
 return null;
}
