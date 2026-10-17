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
  const settings=page.getByRole('button',{name:'运行设置',exact:true});
  const input=page.getByRole('textbox',{name:'任务输入',exact:true});
  const settingsHeading=page.getByRole('heading',{name:'模型服务与查询授权',exact:true});
  const title=page.locator('.agent-topbar h1');
  const row=name=>page.locator('.conversation-row').filter({hasText:name}).locator('.conversation-open');
  const requireChat=async()=>{await input.waitFor({state:'visible'});await settingsHeading.waitFor({state:'hidden'});await expect(input).toBeEnabled();};
  await requireChat();
  await settings.click();await settingsHeading.waitFor();await page.getByRole('button',{name:'关闭运行设置',exact:true}).click();await requireChat();report.checks.push('settings_close_to_chat');
  await settings.click();await settingsHeading.waitFor();await row('导航验收第二段').click();await requireChat();await title.filter({hasText:'导航验收第二段'}).waitFor();
  assert.equal(await row('导航验收第二段').getAttribute('aria-current'),'page');report.checks.push('conversation_switch_from_settings');
  await row('导航验收第一段').click();await requireChat();await title.filter({hasText:'导航验收第一段'}).waitFor();
  await input.fill('切换后可以正常输入');assert.equal(await input.inputValue(),'切换后可以正常输入');report.checks.push('conversation_switch_and_input');
  await settings.click();await settingsHeading.waitFor();await page.getByRole('button',{name:'新建对话',exact:true}).click();await requireChat();await title.filter({hasText:'新对话'}).waitFor();report.checks.push('new_chat_from_settings');
  await settings.click();await settingsHeading.waitFor();await page.getByRole('button',{name:'当前项目'}).click();await page.getByRole('menuitemradio',{name:'导航验收另一个项目'}).click();await requireChat();
  await page.getByRole('button',{name:'当前项目'}).filter({hasText:'导航验收另一个项目'}).waitFor();report.checks.push('project_switch_from_settings');
  await page.getByRole('button',{name:'当前项目'}).click();await page.getByRole('menuitem',{name:'新建项目'}).click();await page.getByRole('dialog',{name:'新建项目'}).waitFor();await page.keyboard.press('Escape');await requireChat();report.checks.push('close_new_project_dialog');
  assert.deepEqual(report.errors,[]);
  const window=await app.browserWindow(page);await window.evaluate(win=>{win.show();win.focus();});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const png=await window.evaluate(async win=>(await win.capturePage()).toPNG().toString('base64'));fs.writeFileSync(path.join(out,'navigation-ready.png'),Buffer.from(png,'base64'));
  report.passed=true;console.log(JSON.stringify({passed:true,checks:report.checks.length,report:path.join(out,'navigation.json')}));
}catch(error){report.error=error.message;throw error;}
finally{fs.writeFileSync(path.join(out,'navigation.json'),JSON.stringify(report,null,2));await app.close();provider.close();}
