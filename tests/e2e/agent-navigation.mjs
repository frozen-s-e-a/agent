import {_electron as electron,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createBackend} from '../../src/host/service.mjs';
import {demoProvider} from '../../src/agent/demo-provider.mjs';

const packageDir=process.argv[2]?path.resolve(process.argv[2]):null;
const out=fs.mkdtempSync(path.resolve('artifacts/agent-navigation-')),dataRoot=path.join(out,'state'),provider=await demoProvider();
const backend=await createBackend({dataRoot});
try{
  await backend.action('settings.save',{baseUrl:provider.baseUrl,model:'offline-demo',defaultMode:'auto'});
  const project=await backend.action('demo.create');
  await backend.action('session.create',{projectId:project.id,title:'导航验收第一段'});
  await backend.action('session.create',{projectId:project.id,title:'导航验收第二段'});
  const other=path.join(out,'other-project');fs.mkdirSync(other);
  await backend.action('project.create',{name:'导航验收另一个项目',root:other});
}finally{backend.close();}
const env={...process.env,AUDIT_DATA_DIR:dataRoot};delete env.ELECTRON_RUN_AS_NODE;
if(packageDir){delete env.AUDIT_NODE;delete env.AUDIT_PYTHON;delete env.PYTHONPATH;}
else{env.AUDIT_NODE=path.resolve('build/runtime/node.exe');env.AUDIT_PYTHON=path.resolve('build/python/python.exe');}
const app=await electron.launch({executablePath:packageDir?path.join(packageDir,'AI助手.exe'):path.resolve('node_modules/electron/dist/electron.exe'),args:[packageDir?path.join(packageDir,'resources/app'):process.cwd()],env,timeout:30000});
const report={packageDir,checks:[],errors:[],passed:false};
try{
  const page=await app.firstWindow();page.setDefaultTimeout(7000);page.on('pageerror',error=>report.errors.push(error.message));
  const chat=page.getByRole('button',{name:'任务对话',exact:true});
  const settings=page.getByRole('button',{name:'运行设置',exact:true});
  const history=page.getByRole('button',{name:/历史对话/});
  const input=page.getByRole('textbox',{name:'任务输入',exact:true});
  const settingsHeading=page.getByRole('heading',{name:'模型服务与查询授权',exact:true});
  const title=page.locator('.agent-topbar h1');
  const requireChat=async()=>{await input.waitFor({state:'visible'});await settingsHeading.waitFor({state:'hidden'});await expect(input).toBeEnabled();};
  await requireChat();
  await settings.click();await settingsHeading.waitFor();await chat.click();await requireChat();
  assert.equal(await chat.getAttribute('aria-current'),'page');report.checks.push('settings_to_chat_navigation');
  await settings.click();await settingsHeading.waitFor();await history.click();
  await page.locator('.agent-history-row').filter({hasText:'导航验收第二段'}).click();await requireChat();await title.filter({hasText:'导航验收第二段'}).waitFor();
  assert.equal(await page.locator('.agent-history-panel').count(),0);report.checks.push('history_switch_from_settings');
  await history.click();await page.locator('.agent-history-row').filter({hasText:'导航验收第一段'}).click();await requireChat();await title.filter({hasText:'导航验收第一段'}).waitFor();
  await input.fill('切换后可以正常输入');assert.equal(await input.inputValue(),'切换后可以正常输入');report.checks.push('history_switch_and_input');
  await settings.click();await settingsHeading.waitFor();await page.getByRole('button',{name:'新建对话',exact:true}).first().click();await requireChat();await title.filter({hasText:'新对话'}).waitFor();report.checks.push('new_chat_from_settings');
  await settings.click();await settingsHeading.waitFor();await page.getByRole('combobox',{name:'当前项目',exact:true}).selectOption({label:'导航验收另一个项目'});await requireChat();report.checks.push('project_switch_from_settings');
  await settings.click();await settingsHeading.waitFor();await page.getByRole('button',{name:'添加项目',exact:true}).click();await page.getByRole('button',{name:'返回当前对话',exact:true}).click();await requireChat();report.checks.push('return_from_add_project');
  assert.deepEqual(report.errors,[]);
  const window=await app.browserWindow(page);await window.evaluate(win=>{win.show();win.focus();});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const png=await window.evaluate(async win=>(await win.capturePage()).toPNG().toString('base64'));fs.writeFileSync(path.join(out,'navigation-ready.png'),Buffer.from(png,'base64'));
  report.passed=true;console.log(JSON.stringify({passed:true,checks:report.checks.length,report:path.join(out,'navigation.json')}));
}catch(error){report.error=error.message;throw error;}
finally{fs.writeFileSync(path.join(out,'navigation.json'),JSON.stringify(report,null,2));await app.close();provider.close();}
