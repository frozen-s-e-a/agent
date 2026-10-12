import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inside} from '../file-ops/paths.mjs';

export function fileHash(file) {
  const hash = createHash('sha256'), fd = fs.openSync(file, 'r'), buffer = Buffer.alloc(1024*1024);
  try { let count; while((count = fs.readSync(fd, buffer, 0, buffer.length, null))) hash.update(buffer.subarray(0,count)); }
  finally { fs.closeSync(fd); }
  return hash.digest('hex');
}

export function captureInputs(store, session, files, runId) {
  if(!session.projectId) return {inputs:[], workProjectId:null};
  const project = store.get('projects',session.projectId);
  if(!project) throw Error('任务项目不存在');
  const root = path.join(store.root,'agent-workspaces',runId);
  fs.mkdirSync(root,{recursive:true});
  const found = new Set(), excluded = new Set(['outputs','output','node_modules','build','artifacts','runtime','logs']);
  function collect(relative, depth=0) {
    if(depth > 16) throw Error('资料目录过深，请缩小任务资料范围');
    const file = inside(project.root,relative);
    if(fs.statSync(file).isDirectory()) {
      for(const entry of fs.readdirSync(file,{withFileTypes:true})) {
        if(entry.name.startsWith('.') || entry.isSymbolicLink() || excluded.has(entry.name)) continue;
        collect(path.relative(project.root,path.join(file,entry.name)), depth+1);
      }
    } else found.add(path.relative(project.root,file));
    if(found.size > 2000) throw Error('资料超过 2000 个文件，请选择本任务需要的文件或子目录');
  }
  for(const relative of files.length ? files : ['.']) collect(relative);
  const inputs = [...found].map(relative => {
    const source = inside(project.root,relative), destination = path.resolve(root,relative);
    fs.mkdirSync(path.dirname(destination),{recursive:true}); inside(root,path.dirname(destination));
    const sha256 = fileHash(source);
    fs.copyFileSync(source,destination,fs.constants.COPYFILE_EXCL);
    if(fileHash(destination)!==sha256 || fileHash(source)!==sha256) throw Error('资料在读取中发生变化：' + relative);
    return {id:'input-'+createHash('sha256').update(relative).digest('hex').slice(0,16), path:relative, sourceProjectId:project.id, sourcePath:source, snapshotPath:destination, sha256, size:fs.statSync(destination).size, status:'captured'};
  });
  const workProject = store.create('projects',{name:project.name,root,internal:true,agentRunId:runId,sourceProjectId:project.id});
  return {inputs,workProjectId:workProject.id};
}

export function changedInputs(run) {
  return run.inputs.filter(input => {
    try { return fileHash(input.sourcePath)!==input.sha256 || fileHash(input.snapshotPath)!==input.sha256; }
    catch { return true; }
  });
}
