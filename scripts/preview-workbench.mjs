import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {seedWorkbenchDemo} from './workbench-demo.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
process.env.AUDIT_DATA_DIR=path.join(root,'artifacts/workbench-preview-state');
process.env.AUDIT_NODE=process.execPath;
process.env.AUDIT_PYTHON=path.join(root,'build/python/python.exe');
process.env.AUDIT_WORKBENCH_PREVIEW='1';
delete process.env.ELECTRON_RUN_AS_NODE;
try{
 await seedWorkbenchDemo(process.env.AUDIT_DATA_DIR);
 const child=spawn(process.execPath,[path.join(root,'scripts/dev.mjs')],{cwd:root,env:process.env,windowsHide:true,stdio:'inherit'});
 child.on('error',error=>{console.error(error);process.exitCode=1;});
 child.on('exit',code=>{process.exitCode=code||0;});
}catch(error){console.error(error.message);process.exitCode=1;}
