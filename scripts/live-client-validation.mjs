// Interactive client for the user to configure credentials. Never reads secrets.
import {_electron as electron} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
const out=path.resolve('artifacts/independent-live-validation');fs.mkdirSync(out,{recursive:true});
const delivery=process.argv[2]&&path.resolve(process.argv[2]);
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
if(delivery){delete env.AUDIT_NODE;delete env.AUDIT_PYTHON;delete env.AUDIT_WORKBENCH_PREVIEW;}
else{env.AUDIT_NODE=path.resolve('build/runtime/node.exe');env.AUDIT_PYTHON=path.resolve('build/python/python.exe');}
const app=await electron.launch({executablePath:delivery?path.join(delivery,'AI助手.exe'):path.resolve('node_modules/electron/dist/electron.exe'),args:delivery?[]:['.'],env,timeout:30000});
const page=await app.firstWindow({timeout:30000});
await page.getByRole('button',{name:'运行设置',exact:true}).click();
await page.getByRole('button',{name:/^(登录注协|重新登录注协)$/}).waitFor();
console.log(JSON.stringify({ready:true,version:JSON.parse(fs.readFileSync(delivery?path.join(delivery,'resources/app/package.json'):'package.json','utf8')).version,packaged:!!delivery}));
const input=readline.createInterface({input:process.stdin});
for await(const line of input){
 try{
  const request=JSON.parse(line);
  if(request.method==='close'){await app.close();break;}
  if(request.method==='capture'){
   const win=await app.browserWindow(page);fs.writeFileSync(path.join(out,'client.png'),Buffer.from(await win.evaluate(async w=>(await w.capturePage()).toPNG().toString('base64')),'base64'));
   console.log(JSON.stringify({image:path.join(out,'client.png')}));continue;
  }
  const allowed=['bootstrap','runtime.status','connection.test','service.cicpa.test','service.cicpa.login','service.cicpa.loginStatus','project.create','session.create','task.run','session.get','project.activity'];
  if(!allowed.includes(request.method))throw Error('Unsupported validation operation');
  const result=await page.evaluate(({method,payload})=>window.audit.invoke(method,payload||{}),request);
  if(request.method==='bootstrap')console.log(JSON.stringify({version:result.version,hasKey:result.settings.hasKey,hasCicpaCookies:result.settings.hasCicpaCookies,hasVisionModel:!!result.settings.visionModel,taskCount:result.legacyTools?.length}));
  else console.log(JSON.stringify({method:request.method,result}));
 }catch(e){console.log(JSON.stringify({error:e.message}));}
}
