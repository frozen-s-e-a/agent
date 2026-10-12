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
    if(!stat.isFile()) throw Error('成果不是文件：'+output.name);
    const sha256 = fileHash(file);
    if(output.sha256 && sha256!==output.sha256) throw Error('成果哈希与执行记录不一致：'+output.name);
    const extension = path.extname(file).toLowerCase();
    if(extension==='.json') JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
    if(['.xlsx','.xlsm','.docx','.pdf','.parquet'].includes(extension)) {
      const fd = fs.openSync(file,'r'), header = Buffer.alloc(5); try { fs.readSync(fd,header); } finally { fs.closeSync(fd); }
      const expected = extension==='.pdf' ? '%PDF-' : extension==='.parquet' ? 'PAR1' : 'PK';
      if(!header.toString('ascii').startsWith(expected)) throw Error('成果文件格式不正确：'+output.name);
    }
    return {...output,path:relative,size:stat.size,sha256};
  });
  if(!outputs.length && !task.result.structureOnly && !task.result.columns?.length && !task.result.preview?.length && !task.result.content?.length) throw Error('执行没有返回可核查成果');
  const validation = {status:'passed', level:'execution_and_file_integrity', checkedAt:new Date().toISOString(), checks:['business_status','project_scope','actual_file_read','file_format','sha256'], semanticReview:'task_specific_business_rules_are_not_implied_by_file_integrity'};
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
