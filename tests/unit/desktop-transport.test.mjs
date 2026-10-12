import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';
test('desktop pipe correlates concurrent calls and exposes no browser service',async()=>{
 const directory=path.resolve('artifacts/test-results/transport-'+Date.now());fs.mkdirSync(directory,{recursive:true});
 const child=spawn(process.execPath,['src/host/stdio.mjs'],{windowsHide:true,env:{...process.env,AUDIT_DATA_DIR:directory}});
 const pending=new Map();let line='';let readyResolve;const ready=new Promise(r=>readyResolve=r);const timer=setTimeout(()=>child.kill(),10000);
 child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{line+=chunk;let i;while((i=line.indexOf('\n'))>=0){const value=JSON.parse(line.slice(0,i));line=line.slice(i+1);if(value.type==='ready')readyResolve(value);else pending.get(value.id)?.(value);}});
 const send=(id,method,payload={})=>new Promise(resolve=>{pending.set(id,resolve);child.stdin.write(JSON.stringify({id,method,payload})+'\n');});
 try{const protocol=await ready;assert.equal(protocol.transport,'stdio');assert.equal(protocol.port,undefined);const [a,b]=await Promise.all([send('a','bootstrap'),send('b','invalid')]);assert.equal(a.id,'a');assert.equal(a.ok,true);assert.equal(a.result.tools.length,16);assert.equal(b.id,'b');assert.equal(b.ok,false);assert.ok(!fs.readFileSync('src/host/service.mjs','utf8').includes('createServer'));assert.ok(!fs.readFileSync('src/client/api.ts','utf8').includes('fetch('));}
 finally{clearTimeout(timer);child.stdin.end();await new Promise(r=>child.once('close',r));fs.rmSync(directory,{recursive:true,force:true});}
});
