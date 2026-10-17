import fs from 'node:fs';
import path from 'node:path';
import {inside} from '../file-ops/paths.mjs';
import {fileHash} from './inputs.mjs';

export function verifyTaskArtifacts(task, store) {
  if(task.status!=='succeeded' || task.result?.isError || task.result?.success===false || task.result?.valid===false || task.result?.validation_passed===false) throw Error(task.error || task.result?.message || '业务执行没有通过，不能发布成果');
  const root = store.get('projects',task.projectId)?.root;
  if(!root) throw Error('成果项目不存在');
  const outputs = (task.result.outputs || []).map(output => {
    const relative = output.path || path.join(task.result.outputDir || '',output.name);
    const file = inside(root,relative), stat = fs.statSync(file);
    if(!stat.isFile() || stat.size===0) throw Error('成果不是完整文件：'+output.name);
    const sha256 = fileHash(file);
    if(output.sha256 && sha256!==output.sha256) throw Error('成果哈希与执行记录不一致：'+output.name);
    const extension = path.extname(file).toLowerCase();
    if(extension==='.json') JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
    if(['.xlsx','.xlsm','.docx','.pdf','.parquet'].includes(extension)) {
      const fd = fs.openSync(file,'r'), header = Buffer.alloc(5); try { fs.readSync(fd,header); } finally { fs.closeSync(fd); }
      const expected = extension==='.pdf' ? '%PDF-' : extension==='.parquet' ? 'PAR1' : 'PK';
      if(!header.toString('ascii').startsWith(expected)) throw Error('成果文件格式不正确：'+output.name);
    }
    return {...output,path:path.relative(root,file),size:stat.size,sha256};
  });
  if(!outputs.length && !task.result.structureOnly && !task.result.columns?.length && !task.result.preview?.length && !task.result.content?.length) throw Error('执行没有返回可核查成果');
  let workbookValidation;
  if(task.tool==='workbook_fill'){
    const report=outputs.find(output=>output.name==='填写核对.json');
    if(!report)throw Error('填写成果缺少独立重读核对记录');
    workbookValidation=JSON.parse(fs.readFileSync(inside(root,report.path),'utf8'));
    if(workbookValidation.status!=='passed'||!workbookValidation.requiredCount||workbookValidation.verifiedCount+(workbookValidation.recalcCount||0)!==workbookValidation.requiredCount||workbookValidation.planHash!==task.parameters.expectedPlanHash)throw Error('填写成果与已验证计划或必填覆盖不一致');
    if(JSON.stringify(task.result.workbookValidation)!==JSON.stringify(Object.fromEntries(Object.entries(workbookValidation).filter(([key])=>key!=='cells'))))throw Error('填写核对摘要与实际文件不一致');
  }
  const validation = {status:'passed', level:'execution_and_file_integrity', checkedAt:new Date().toISOString(), checks:['business_status','project_scope','actual_file_read','file_format','sha256'], semanticReview:'task_specific_business_rules_are_not_implied_by_file_integrity'};
  if(workbookValidation){validation.level='mapped_write_and_reread';validation.checks.push(...workbookValidation.checks);}
  task.result.outputs = outputs; task.validationStatus='passed'; task.publicationStatus='published'; task.validation=validation;
  store.put('tasks',task);
  return {outputs,validation};
}

export function checkpointValid(node, store) {
  if(node.status!=='succeeded' || !node.taskId || !node.checkpoint) return false;
  try {
    const task = store.get('tasks',node.taskId);
    const root = store.get('projects',task.projectId)?.root;
    return !!root && task.status==='succeeded' && node.checkpoint.outputs.every(output => fileHash(inside(root,output.path))===output.sha256);
  } catch { return false; }
}

export function recoverPublishedTask(task,store) {
  if(!['interrupted','running','cancelling','cancelled'].includes(task.status))return false;
  const project=store.get('projects',task.projectId);if(!project)return false;
  const manifestPath=path.join(project.root,'outputs',task.id,'manifest.json');
  if(!fs.existsSync(manifestPath))return false;
  const manifest=JSON.parse(fs.readFileSync(inside(project.root,manifestPath),'utf8'));
  if(manifest.taskId!==task.id || manifest.status!=='succeeded' || !Array.isArray(manifest.outputs) || !manifest.outputs.length)throw Error('发布记录不完整，不能恢复为成功');
  for(const output of manifest.outputs){const file=inside(project.root,output.path || path.join('outputs',task.id,output.name));if(!output.sha256 || fileHash(file)!==output.sha256)throw Error('已发布成果与记录不一致，不能自动重试');}
  task.result={...(task.result || {}),...manifest,outputs:manifest.outputs.map(output=>({...output,path:output.path || path.join('outputs',task.id,output.name)}))};task.status='succeeded';task.phase='已恢复并校验发布记录';task.recoveredAt=new Date().toISOString();delete task.error;
  verifyTaskArtifacts(task,store);return true;
}
