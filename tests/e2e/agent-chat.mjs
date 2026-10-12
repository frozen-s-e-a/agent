import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createBackend} from '../../src/host/service.mjs';
import {demoProvider} from '../../src/agent/demo-provider.mjs';

const packageDir=process.argv[2]?path.resolve(process.argv[2]):null;
const out=fs.mkdtempSync(path.resolve('artifacts/agent-ui-')),dataRoot=path.join(out,'state'),provider=await demoProvider({delayMs:100});
const root=packageDir?path.join(packageDir,'resources/app'):process.cwd();
process.env.AUDIT_PYTHON=path.resolve('build/python/python.exe');
const backend=await createBackend({dataRoot});try{await backend.action('settings.save',{baseUrl:provider.baseUrl,model:'offline-demo',defaultMode:'auto'});await backend.action('demo.create');}finally{backend.close();}
const env={...process.env,AUDIT_DATA_DIR:dataRoot};delete env.ELECTRON_RUN_AS_NODE;
if(packageDir){delete env.AUDIT_NODE;delete env.AUDIT_PYTHON;delete env.PYTHONPATH;}else{env.AUDIT_NODE=path.resolve('build/runtime/node.exe');env.AUDIT_PYTHON=path.resolve('build/python/python.exe');}
const app=await electron.launch({executablePath:packageDir?path.join(packageDir,'AI助手.exe'):path.resolve('node_modules/electron/dist/electron.exe'),args:[root],env,timeout:30000});
const report={packageDir,state:dataRoot,errors:[],checks:[],screens:[]};
try{
 const page=await app.firstWindow({timeout:30000});page.setDefaultTimeout(15000);page.on('pageerror',error=>report.errors.push(error.message));
 const invoke=(method,payload={})=>page.evaluate(({method,payload})=>window.audit.invoke(method,payload),{method,payload});
 const capture=async name=>{const file=path.join(out,name+'.png'),window=await app.browserWindow(page);await window.evaluate(win=>{win.show();win.focus();});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(null)))));const png=await window.evaluate(async win=>(await win.capturePage()).toPNG().toString('base64'));fs.writeFileSync(file,Buffer.from(png,'base64'));report.screens.push(file);};
 await page.getByRole('heading',{name:'这次想完成什么审计工作？'}).waitFor();assert.equal(await page.locator('.task-card-new').count(),0);await capture('01-chat-ready');report.checks.push('chat_is_default');
 await page.getByRole('button',{name:'检查借贷平衡',exact:true}).click();await page.getByRole('button',{name:'发送任务',exact:true}).click();
 await page.getByText('已实际执行完成。',{exact:false}).first().waitFor({timeout:60000});await page.locator('.agent-result-card').first().waitFor();
 const boot=await invoke('bootstrap'),session=boot.sessions.find(item=>item.title.includes('读取示例序时账'));assert.ok(session);
 let state=await invoke('session.get',{id:session.id});assert.equal(state.agentRuns.at(-1).status,'completed');assert.equal(state.tasks[0].validationStatus,'passed');assert.equal(state.tasks[0].result.rowCount,1);await capture('02-real-result');report.checks.push('natural_language_to_real_voucher_result');
 const csv=page.locator('.agent-result-file').filter({hasText:'.csv'}).first();await csv.getByRole('button',{name:'预览',exact:true}).click();await page.getByRole('dialog',{name:'文件预览'}).waitFor();assert.ok(await page.locator('.agent-preview-table tbody tr').count()>0);await capture('03-result-preview');await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'文件预览'}).waitFor({state:'hidden'});report.checks.push('result_preview_and_escape');
 await page.locator('.agent-run-records>summary').click();await page.locator('.agent-run-record details>summary').first().click();await page.locator('.agent-source-row').first().click();await page.getByRole('dialog',{name:'文件预览'}).waitFor();assert.equal(await page.locator('.agent-preview-table tbody tr').count(),8);await capture('04-source-preview');await page.keyboard.press('Escape');report.checks.push('source_snapshot_readback');
 await page.getByRole('button',{name:'新建对话',exact:true}).first().click();await page.getByRole('button',{name:'提取需要的字段',exact:true}).click();await page.getByRole('button',{name:'发送任务',exact:true}).click();await page.getByText('已实际执行完成。',{exact:false}).first().waitFor({timeout:60000});await page.locator('.agent-result-file').filter({hasText:'.csv'}).first().getByRole('button',{name:'预览',exact:true}).click();await page.getByRole('button',{name:'查看第 2 行来源',exact:true}).click();await page.getByText('来源第 2 行。',{exact:false}).waitFor();assert.ok((await page.locator('.agent-source-highlight').textContent()).includes('示例公司'));await capture('05-row-source-preview');await page.keyboard.press('Escape');report.checks.push('row_to_saved_source');
 await page.getByRole('button',{name:'新建对话',exact:true}).first().click();await page.getByRole('heading',{name:'这次想完成什么审计工作？'}).waitFor();await page.getByRole('textbox',{name:'任务输入'}).fill('请做预算预测');await page.getByRole('button',{name:'发送任务',exact:true}).click();await page.getByText('等待补充，已保存资料和执行结果。',{exact:true}).waitFor();await capture('05-waiting-for-user');report.checks.push('explicit_waiting_state');
 await page.getByRole('button',{name:'新建对话',exact:true}).first().click();await page.getByRole('textbox',{name:'任务输入'}).fill('检查借贷平衡');await page.getByRole('button',{name:'发送任务',exact:true}).click();await page.getByRole('button',{name:'停止当前处理',exact:true}).click();await page.getByText('已停止，已保存资料和执行结果。',{exact:true}).waitFor();await page.getByRole('button',{name:'继续任务',exact:true}).click();await page.getByText('已实际执行完成。',{exact:false}).first().waitFor({timeout:60000});await page.locator('.agent-result-card').first().waitFor();await capture('06-stop-and-resume');report.checks.push('stop_and_resume');
 await page.getByRole('button',{name:/历史对话/}).click();const historyRow=page.locator('.agent-history-row').filter({hasText:'读取示例序时账'});await historyRow.click();await page.locator('.agent-result-card').first().waitFor();await page.reload();await page.getByRole('textbox',{name:'任务输入'}).waitFor();report.checks.push('history_and_reload');
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1100,height:760});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);await capture('07-compact-view');report.checks.push('compact_layout_reduced_motion');
 assert.deepEqual(report.errors,[]);report.passed=true;console.log(JSON.stringify({passed:true,checks:report.checks.length,report:path.join(out,'Agent界面验收.json'),screens:report.screens}));
}finally{fs.writeFileSync(path.join(out,'Agent界面验收.json'),JSON.stringify(report,null,2));await app.close();provider.close();}
