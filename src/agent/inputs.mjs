import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {inside} from '../file-ops/paths.mjs';

export const MAX_INPUT_FILES = 2000;
const EXCLUDED_DIRECTORIES = new Set(['outputs','output','node_modules','build','artifacts','runtime','logs']);

export function fileHash(file) {
  const hash = createHash('sha256'), fd = fs.openSync(file, 'r'), buffer = Buffer.alloc(1024*1024);
  try { let count; while((count = fs.readSync(fd, buffer, 0, buffer.length, null))) hash.update(buffer.subarray(0,count)); }
  finally { fs.closeSync(fd); }
  return hash.digest('hex');
}

// Source files that keep their size and modification time are not re-read on
// every message. The cache lives for the process; a restart re-hashes once.
const knownHashes = new Map();
const statKey = (file, stat) => `${file}|${stat.size}|${stat.mtimeMs}|${stat.ino}`;

export const workspaceRoot = store => path.join(store.root, 'agent-workspaces');
const blobRoot = store => path.join(workspaceRoot(store), 'blobs');

/**
 * Store one immutable copy per distinct file content and return its sha256.
 * Blobs are read-only so a tool cannot change the evidence behind another run.
 */
function storeBlob(store, source) {
  const blobs = blobRoot(store);
  fs.mkdirSync(blobs, {recursive:true});
  const before = fs.statSync(source), key = statKey(source, before), known = knownHashes.get(key);
  if (known && fs.existsSync(path.join(blobs, known))) return known;
  const temporary = path.join(blobs, '.incoming-' + randomUUID());
  try {
    fs.copyFileSync(source, temporary, fs.constants.COPYFILE_EXCL);
    const sha256 = fileHash(temporary), after = fs.statSync(source);
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) throw Error('资料在读取中发生变化：' + path.basename(source));
    const blob = path.join(blobs, sha256);
    if (fs.existsSync(blob)) fs.rmSync(temporary, {force:true});
    else { fs.renameSync(temporary, blob); fs.chmodSync(blob, 0o444); }
    knownHashes.set(key, sha256);
    return sha256;
  } finally {
    fs.rmSync(temporary, {force:true});
  }
}

/** Place a blob at `destination` without duplicating its bytes when the file system allows it. */
function linkBlob(store, sha256, destination) {
  const blob = path.join(blobRoot(store), sha256);
  try { fs.linkSync(blob, destination); }
  catch { fs.copyFileSync(blob, destination, fs.constants.COPYFILE_EXCL); fs.chmodSync(destination, 0o444); }
}

/**
 * Snapshot the project files for one run. Every run gets its own directory tree
 * (tools run against it), but identical content is stored once and hard-linked.
 */
export function captureInputs(store, session, files, runId) {
  if(!session.projectId) return {inputs:[], workProjectId:null};
  const project = store.get('projects',session.projectId);
  if(!project) throw Error('任务项目不存在');
  const root = path.join(workspaceRoot(store), runId);
  fs.mkdirSync(root,{recursive:true});
  const found = new Set();
  function collect(relative, depth=0) {
    if(depth > 16) throw Error('资料目录过深，请缩小任务资料范围');
    const file = inside(project.root,relative);
    if(fs.statSync(file).isDirectory()) {
      for(const entry of fs.readdirSync(file,{withFileTypes:true})) {
        if(entry.name.startsWith('.') || entry.isSymbolicLink() || EXCLUDED_DIRECTORIES.has(entry.name)) continue;
        collect(path.relative(project.root,path.join(file,entry.name)), depth+1);
      }
    } else found.add(path.relative(project.root,file));
    if(found.size > MAX_INPUT_FILES) throw Error(`资料超过 ${MAX_INPUT_FILES} 个文件，请选择本任务需要的文件或子目录`);
  }
  for(const relative of files.length ? files : ['.']) collect(relative);
  const inputs = [...found].map(relative => {
    const source = inside(project.root,relative), destination = path.resolve(root,relative);
    fs.mkdirSync(path.dirname(destination),{recursive:true}); inside(root,path.dirname(destination));
    const sha256 = storeBlob(store, source);
    linkBlob(store, sha256, destination);
    return {id:'input-'+createHash('sha256').update(relative).digest('hex').slice(0,16), path:relative, sourceProjectId:project.id, sourcePath:source, snapshotPath:destination, sha256, size:fs.statSync(destination).size, status:'captured'};
  });
  const workProject = store.create('projects',{name:project.name,root,internal:true,agentRunId:runId,sourceProjectId:project.id});
  return {inputs,workProjectId:workProject.id};
}

/** Materialize sent attachments in the same run workspace used by every engine. */
export function captureAttachmentInputs(store, run) {
  const attachments=run.inputs.filter(input=>input.source==='attachment');
  if(!attachments.length)return;
  let project=run.snapshotProjectId&&store.get('projects',run.snapshotProjectId);
  if(!project){
    const root=path.join(workspaceRoot(store),run.id);fs.mkdirSync(root,{recursive:true});inside(store.root,root);
    project=store.create('projects',{name:'对话附件工作副本',root,internal:true,agentRunId:run.id});run.snapshotProjectId=project.id;
  }
  for(const input of attachments){
    const source=inside(store.root,input.sourcePath);
    if(fileHash(source)!==input.sha256)throw Error('附件副本已改变：'+input.path);
    const destination=path.resolve(project.root,input.workPath),relative=path.relative(project.root,destination);
    if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('附件目标超出工作范围');
    fs.mkdirSync(path.dirname(destination),{recursive:true});inside(project.root,path.dirname(destination));
    if(!fs.existsSync(destination))fs.copyFileSync(source,destination,fs.constants.COPYFILE_EXCL);
    if(fileHash(inside(project.root,destination))!==input.sha256)throw Error('附件工作副本与发送的版本不一致：'+input.path);
    fs.chmodSync(destination,0o444);input.snapshotPath=destination;
  }
}

export function changedInputs(run) {
  return run.inputs.filter(input => {
    try { return fileHash(input.sourcePath)!==input.sha256 || fileHash(input.snapshotPath)!==input.sha256; }
    catch { return true; }
  });
}

/** Read-only files cannot be unlinked on Windows, so clear the flag before removing a tree. */
export function removeTree(target) {
  if(!fs.existsSync(target)) return;
  const stack = [target];
  const sharedReadOnly = [];
  try {
    while(stack.length) {
      const current = stack.pop(), stat = fs.lstatSync(current);
      if(stat.isDirectory()) for(const entry of fs.readdirSync(current)) stack.push(path.join(current, entry));
      else if(!stat.isSymbolicLink()) {
        // chmod affects every hard link. Keep the inode open so surviving
        // snapshots regain their original permissions after this tree is removed.
        if(stat.nlink > 1 && !(stat.mode & 0o222)) sharedReadOnly.push({fd:fs.openSync(current,'r'),mode:stat.mode & 0o777});
        fs.chmodSync(current, 0o644);
      }
    }
    fs.rmSync(target, {recursive:true, force:true});
  } finally {
    try { for(const {fd,mode} of sharedReadOnly) fs.fchmodSync(fd,mode); }
    finally { for(const {fd} of sharedReadOnly) fs.closeSync(fd); }
  }
}

/** Delete blobs that no remaining run references. */
export function collectUnusedBlobs(store) {
  const blobs = blobRoot(store);
  if(!fs.existsSync(blobs)) return 0;
  const referenced = new Set(store.all('agentRuns').flatMap(run => (run.inputs || []).map(input => input.sha256)));
  let removed = 0;
  for(const name of fs.readdirSync(blobs)) {
    if(referenced.has(name)) continue;
    const file = path.join(blobs, name);
    fs.chmodSync(file, 0o644); fs.rmSync(file, {force:true}); removed++;
  }
  return removed;
}
