import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../../src/conversations/store.mjs';
import {rebuildContext,requiredStateFingerprint} from '../../src/agent/context-builder.mjs';
import {archiveContext,recordVisibleRequirements,recordContextRead,missingContextRequirements} from '../../src/agent/context-archive.mjs';
import {readSavedResult,originalResult} from '../../src/agent/result-reader.mjs';
import {estimateTokens} from '../../src/agent/context.mjs';
const settings={contextWindow:128000,maxTokens:4096};
const task=()=>({id:'r',sessionId:'s',objective:'完成全部工作',requirements:[],inputs:[],questions:[],steps:[],checkpoints:[]});

test('zero retained cycles removes whole tool pairs even when the last call has huge arguments',()=>{
 const run=task(),argumentsText=JSON.stringify({mapping:'甲'.repeat(90000)});
 const messages=[{role:'system',content:'真实工具约束'},{role:'user',content:'执行任务'},{role:'assistant',content:null,tool_calls:[{id:'c',function:{name:'inspect',arguments:argumentsText}}]},{role:'tool',tool_call_id:'c',content:'{"ok":true}'}];
 const result=rebuildContext({messages,run,settings});
 assert.ok(result.changes.some(c=>c.retainedCycles===0));assert.ok(!result.messages.some(m=>m.tool_calls||m.role==='tool'));assert.equal(messages[2].tool_calls[0].function.arguments,argumentsText);
});

test('very large state, history, contracts and mid-text requirements remain exactly recoverable',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'context-window-')),store=new Store(dir),run=task();
 try{
  const text='要求开始\n'+'凭证'.repeat(45000)+'\n中部特殊要求：金额按万元\n'+'底稿'.repeat(45000)+'\n最后要求：不得覆盖原文件';
  run.requirements=[{id:'r1',text}];run.inputs=Array.from({length:1000},(_,i)=>({id:'i'+i,path:'项目资料'+i+'.xlsx',sha256:'hash'+i,status:'captured'}));
  run.plan={status:'ready',steps:Array.from({length:500},(_,i)=>({id:'n'+i,parameters:{rules:'规则'.repeat(1000)},status:'pending'}))};
  const before=requiredStateFingerprint(run),messages=[{role:'system',content:'原文件不覆盖'},{role:'user',content:'<attachments>'+text+'</attachments>'}],tools=Array.from({length:79},(_,i)=>({type:'function',function:{name:'audit_'+i,description:'合同'.repeat(6000),parameters:{type:'object'}}}));
  const result=rebuildContext({messages,tools,run,settings,archive:data=>archiveContext(store,run,data)});
  assert.ok(result.budget.inputUpperBound+12288<=128000);assert.equal(requiredStateFingerprint(run),before);run.contextArchiveRef=result.archiveRef;
  recordVisibleRequirements(run,result.visibleRequirements);assert.equal(missingContextRequirements(run).length,1);
  let restored='',offset=0;
  do{const page=readSavedResult(store,'s',{id:result.archiveRef.id,section:'state.requirements.0.text',offset});restored+=page.data;recordContextRead(run,originalResult(store,'s',result.archiveRef.id),page);offset=page.nextOffset;if(!page.hasMore)break;}while(true);
  assert.equal(restored,text);assert.equal(missingContextRequirements(run).length,0);
  const second=archiveContext(store,run,{state:result.snapshot,messages,tools});assert.equal(second.id,result.archiveRef.id);
  assert.throws(()=>readSavedResult(store,'foreign',{id:result.archiveRef.id}),/不属于/);
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('out-of-order pages cannot bypass coverage of missing requirement text',()=>{
 const run=task();run.requirements=[{id:'r1',text:'abcdefghi'}];run.contextArchiveRef={id:'archive'};
 const record={name:'agent_context_archive',result:{state:{requirements:run.requirements}}};
 recordContextRead(run,record,{section:'state.requirements.0.text',offset:6,nextOffset:9,data:'ghi'});
 assert.equal(missingContextRequirements(run)[0].readHint.arguments.offset,0);
 recordContextRead(run,record,{section:'state.requirements.0.text',offset:0,nextOffset:3,data:'abc'});
 assert.equal(missingContextRequirements(run)[0].readHint.arguments.offset,3);
 recordContextRead(run,record,{section:'state.requirements.0.text',offset:3,nextOffset:6,data:'def'});
 assert.deepEqual(missingContextRequirements(run),[]);
});

test('large object key indexes can be paged through to the last field',()=>{
 const result=Object.fromEntries(Array.from({length:1800},(_,i)=>['field'+i,'原文'.repeat(400)]));
 const store={get:(kind,id)=>id==='result'?{id,sessionId:'s',name:'preview',result}:null};
 let offset=0,keys=[];
 for(;;){const page=readSavedResult(store,'s',{id:'result',offset,limit:50});keys.push(...Object.keys(page.summary));if(!page.moreKeys)break;offset=page.nextKeyOffset;}
 assert.equal(keys.length,1800);const last=readSavedResult(store,'s',{id:'result',section:'field1799'});assert.equal(last.data,result.field1799);
});

test('image budgeting accounts for image tokens, not its base64 text length',()=>{
 const small={messages:[{role:'user',content:[{type:'image_url',image_url:{url:'data:image/png;base64,AA'}}]}]};
 const large=structuredClone(small);large.messages[0].content[0].image_url.url+='A'.repeat(4000000);
 assert.equal(estimateTokens(small),estimateTokens(large));assert.ok(estimateTokens(large)>=16384);
});
