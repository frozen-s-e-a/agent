import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {demoProvider} from '../src/agent/demo-provider.mjs';
import {createBackend} from '../src/host/service.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const packaged=fs.existsSync(path.join(root,'runtime/node.exe'));
const dataRoot=process.env.AUDIT_DATA_DIR || path.join(process.env.LOCALAPPDATA || root,'AuditAgentOfflineTest');
const executable=packaged?path.resolve(root,'../../AI助手.exe'):path.join(root,'node_modules/electron/dist/electron.exe');
const env={...process.env,AUDIT_DATA_DIR:dataRoot,AUDIT_NODE:process.execPath,AUDIT_PYTHON:path.join(root,packaged?'runtime/python/python.exe':'build/python/python.exe')};delete env.ELECTRON_RUN_AS_NODE;
fs.mkdirSync(dataRoot,{recursive:true});
const lockFile=path.join(dataRoot,'offline-helper.pid');
if(fs.existsSync(lockFile)){
  const previous=Number(fs.readFileSync(lockFile,'utf8'));let alive=false;
  try{if(Number.isInteger(previous)&&previous>0){process.kill(previous,0);alive=true;}}catch{}
  if(alive){spawn(executable,[root],{cwd:root,env,windowsHide:true,stdio:'ignore'}).unref();process.exit(0);}
  fs.unlinkSync(lockFile);
}
const lock=fs.openSync(lockFile,'wx');fs.writeFileSync(lock,String(process.pid));fs.closeSync(lock);
process.once('exit',()=>{try{if(fs.readFileSync(lockFile,'utf8')===String(process.pid))fs.unlinkSync(lockFile);}catch{}});
const provider=await demoProvider();
const backend=await createBackend({dataRoot});
try{await backend.action('settings.save',{baseUrl:provider.baseUrl,model:'offline-demo',visionModel:'',defaultMode:'auto'});await backend.action('demo.create');}finally{backend.close();}
const child=spawn(executable,[root],{cwd:root,env,windowsHide:true,stdio:'ignore'});
child.once('error',error=>{provider.close();console.error(error.message);process.exitCode=1;});
child.once('close',code=>{provider.close();process.exitCode=code || 0;});
