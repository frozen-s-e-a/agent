import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import http from 'node:http';import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {createBackend} from '../../src/host/service.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'progress-')),backend=await createBackend({dataRoot:path.join(root,'state')});
await backend.action('settings.save',{baseUrl:'http://127.0.0.1:12345/v1',model:'fixture'});
const project=await backend.action('project.create',{name:'页面稳定性测试',root}),session=await backend.action('session.create',{projectId:project.id});
backend.store.append(session.id,{type:'user',text:'验证读取过程的页面位置'});
backend.store.append(session.id,{type:'assistant',text:Array.from({length:35},(_,i)=>`历史处理说明 ${i+1}：已保存的内容。`).join('\n\n')});
const first=backend.store.create('toolCalls',{sessionId:session.id,name:'read_agent_result',label:'回查已保存证据',status:'running'});
backend.store.append(session.id,{type:'tool',callId:first.id});
let count=1,running=true,text='让我读取结果';
const server=http.createServer((req,res)=>{const file=path.resolve('build/client',req.url==='/'?'index.html':decodeURIComponent(req.url.split('?')[0].slice(1)));if(!file.startsWith(path.resolve('build/client')+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1200,height:800}}),report={passed:false,checks:[],errors:[]};
page.on('pageerror',error=>report.errors.push(error.message));
await page.exposeFunction('invokeFixture',async(method,payload)=>{const result=await backend.action(method,payload);if(method!=='session.get')return result;const calls=Array.from({length:count},(_,i)=>({...first,id:i===0?first.id:'fixture-'+i,status:i===count-1&&running?'running':'succeeded'}));return {...result,streaming:true,phase:running?'回查已保存证据执行中':'Agent 正在分析…',turn:text,calls,events:[...result.events,...calls.slice(1).map(call=>({type:'tool',id:'event-'+call.id,callId:call.id}))]};});
await page.addInitScript(()=>{window.audit={desktop:true,invoke:(method,payload={})=>window.invokeFixture(method,payload)};});
const geometry=()=>page.evaluate(()=>{const stream=document.querySelector('.stream'),steps=document.querySelector('.steps'),composer=document.querySelector('.composer');return {scroll:stream.scrollTop,height:stream.scrollHeight,steps:steps.getBoundingClientRect().height,composer:composer?.getBoundingClientRect().y};});
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('.steps-head').waitFor();await expect(page.locator('.steps-head')).toHaveAttribute('aria-expanded','false');
 const initial=await geometry();
 for(let i=2;i<=6;i++){count=i;running=i%2===0;text=running?'让我读取结果\n'.repeat(20):'';await expect(page.locator('.steps-title')).toHaveText('本地步骤 · '+i);const next=await geometry();assert.equal(next.steps,initial.steps);assert.ok(Math.abs(next.height-initial.height)<=1);assert.ok(Math.abs(next.scroll-initial.scroll)<=1);assert.equal(next.composer,initial.composer);}
 report.checks.push('collapsed_height_and_scroll_stable_during_result_reads');
 await page.locator('.steps-head').click();await expect(page.locator('.steps-head')).toHaveAttribute('aria-expanded','true');count=18;running=false;await expect(page.locator('.steps-title')).toHaveText('本地步骤 · 18');await expect(page.locator('.steps-head')).toHaveAttribute('aria-expanded','true');assert.ok(await page.locator('.steps-list').evaluate(node=>node.clientHeight<=260));report.checks.push('manual_expansion_persists_with_bounded_list');
 await page.locator('.stream').evaluate(node=>{node.scrollTop=100;node.dispatchEvent(new Event('scroll'));});const before=await geometry();count=19;running=true;await expect(page.locator('.steps-title')).toHaveText('本地步骤 · 19');assert.ok(Math.abs((await geometry()).scroll-before.scroll)<=1);report.checks.push('reading_history_does_not_follow_execution');
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.error=error.message;process.exitCode=1;}
finally{fs.mkdirSync('artifacts/branch-review',{recursive:true});fs.writeFileSync('artifacts/branch-review/progress-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();await new Promise(resolve=>server.close(resolve));backend.close();}
