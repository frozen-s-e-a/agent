// Launch the delivered EXE with no source runtime overrides or toolbox bridge.
import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const directory=path.resolve(process.argv[2]);
const fixtures=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const expected=JSON.parse(fs.readFileSync(path.join(directory,'resources/app/package.json'),'utf8')).version;
const out=fs.mkdtempSync(path.resolve('artifacts/package-validation-'));
const env={...process.env,AUDIT_DATA_DIR:path.join(out,'state')};
for(const key of ['AUDIT_NODE','AUDIT_PYTHON','AUDIT_MCP_EXE','AUDIT_WORKBENCH_PREVIEW','ELECTRON_RUN_AS_NODE','PYTHONPATH'])delete env[key];
assert.deepEqual(fs.readdirSync(path.join(directory,'resources/app/src/mcp')).sort(),['arguments.mjs','independent-client.mjs']);
assert.ok(!fs.existsSync(path.join(directory,'resources/app/src/resources/legacy-inventory.json')));
const app=await electron.launch({executablePath:path.join(directory,'AI助手.exe'),args:[],env,timeout:30000});
const report={version:expected,standalone:true,originalToolboxRequired:false,errors:[],records:[]};
try{
 const actual=await app.evaluate(({app})=>app.getAppPath());assert.equal(path.resolve(actual),path.join(directory,'resources/app'));
 const page=await app.firstWindow({timeout:30000});page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.getByRole('heading',{name:'资料工作台',exact:true}).waitFor();
 const invoke=(method,payload={})=>page.evaluate(({method,payload})=>window.audit.invoke(method,payload),{method,payload});
 const boot=await invoke('bootstrap');assert.equal(boot.version,expected);assert.equal(boot.legacyTools.length,63);assert.equal(boot.tools.length,16);
 assert.equal(boot.settings.hasKey,false);assert.equal(boot.settings.hasCicpaCookies,false);
 const runtime=await invoke('runtime.status');assert.equal(runtime.independent,true);assert.equal(runtime.mcpAvailable,true);assert.equal(runtime.mcpPath,null);
 const project=await invoke('project.create',{root:fixtures.project,name:'独立程序包验证'});
 const session=await invoke('session.create',{projectId:project.id,title:'程序包实际执行'});
 for(const label of ['bank_company_account_scope','bank_many_to_many','multi_period_aging_group_mapping_formula','empty_template_per_company','gross_margin_analysis','qcc_processor']){
  const fixture=fixtures.results.find(r=>r.case===label);assert.ok(fixture,label);
  const started=await invoke('task.run',{sessionId:session.id,tool:'mcp_'+fixture.task,files:['.'],parameters:fixture.arguments});
  let task;const deadline=Date.now()+60000;
  while(Date.now()<deadline){const activity=await invoke('project.activity',{projectId:project.id});task=activity.tasks.find(t=>t.id===started.id);if(task&&!['queued','running','cancelling'].includes(task.status))break;await new Promise(r=>setTimeout(r,100));}
  assert.equal(task?.status,'succeeded',task?.error||label);assert.equal(task.result.runtime,'independent-python');assert.ok(task.result.outputs.length);
  for(const output of task.result.outputs){const file=path.resolve(fixtures.project,output.path);const relative=path.relative(fixtures.project,file);assert.ok(!relative.startsWith('..')&&!path.isAbsolute(relative));assert.ok(fs.statSync(file).isFile());}
  report.records.push({case:label,task:fixture.task,taskId:task.id,status:task.status,outputs:task.result.outputs});console.log('PASS package '+label);
 }
 await page.reload();await page.getByRole('heading',{name:'资料工作台',exact:true}).waitFor();
 await page.getByRole('button',{name:'运行设置',exact:true}).click();
 await page.getByText('63 项审计任务使用独立运行时。',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'检查注协授权',exact:true}).isEnabled(),true);
 await page.getByText(expected,{exact:true}).waitFor();
 const window=await app.browserWindow(page);fs.writeFileSync(path.join(out,'运行设置.png'),Buffer.from(await window.evaluate(async win=>(await win.capturePage()).toPNG().toString('base64')),'base64'));
 assert.deepEqual(report.errors,[]);report.passed=true;
 console.log(JSON.stringify({standalone:true,passed:true,cases:report.records.length,report:path.join(out,'程序包启动验收.json')}));
}finally{
 fs.writeFileSync(path.join(out,'程序包启动验收.json'),JSON.stringify(report,null,2));await app.close();
}
