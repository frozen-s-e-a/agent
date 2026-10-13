import test from 'node:test';
import assert from 'node:assert/strict';
import {readSavedResult,RESULT_BYTES} from '../../src/agent/result-reader.mjs';
import {boundedToolResult,evidenceRequestAllowed} from '../../src/agent/context-builder.mjs';
const fixture=result=>({get:(_,id)=>id==='original'?{id,sessionId:'s',name:'preview_local_file',result}:undefined});
const size=value=>Buffer.byteLength(JSON.stringify(value),'utf8');

test('large workbook retains a navigable sheet index and pages rows without loss',()=>{
 const rows=Array.from({length:37},(_,i)=>[i,'说明'.repeat(1400)]),data={ok:true,sampleOnly:true,sheets:[{name:'Sheet1'}],previews:[{sheet:'Sheet1',columns:['行号','说明'],preview:rows}]},store=fixture(data);
 const initial=boundedToolResult({...data,resultRef:{kind:'agentToolResults',id:'original'}});
 assert.ok(size(initial)<=RESULT_BYTES);assert.equal(initial.summary.previews.items[0].sheet,'Sheet1');
 assert.equal(initial.summary.previews.items[0].preview.section,'previews.0.preview');
 const overview=readSavedResult(store,'s',{id:'original'});assert.equal(overview.overview,true);assert.equal(overview.readHint.arguments.section,'previews.0.preview');assert.ok(readSavedResult(store,'s',overview.readHint.arguments).data.length>0);
 let offset=0,received=[];
 do{const page=readSavedResult(store,'s',{id:'original',section:'previews.0.preview',offset,limit:50});assert.ok(size(page)<=RESULT_BYTES);assert.equal(page.resultRef.id,'original');received.push(...page.data);assert.ok(page.nextOffset>offset);offset=page.nextOffset;if(!page.hasMore)break;assert.equal(page.readHint.arguments.offset,offset);}while(true);
 assert.deepEqual(received,rows);
});
test('one oversized row provides field paths and long Unicode text is completely readable',()=>{
 const text='汉字😀\\\n'.repeat(9000),store=fixture({rows:[{说明:text,金额:123}]}),row=readSavedResult(store,'s',{id:'original',section:'rows'});
 assert.equal(row.overview,true);assert.equal(row.summary.说明.section,'rows.0.说明');assert.equal(row.continuation.arguments.offset,1);
 let offset=0,joined='';while(true){const page=readSavedResult(store,'s',{id:'original',section:'rows.0.说明',offset});assert.ok(size(page)<=RESULT_BYTES);joined+=page.data;assert.ok(page.nextOffset>offset);offset=page.nextOffset;if(!page.hasMore)break;}
 assert.equal(joined,text);
});
test('legacy nested read results resolve to the original reference and enforce session scope',()=>{
 const records={original:{id:'original',sessionId:'s',name:'preview_local_file',result:{rows:[1,2,3]}},old:{id:'old',sessionId:'s',name:'read_agent_result',result:{sourceRef:{kind:'agentToolResults',id:'original'},data:{rows:[1,2,3]}}},newer:{id:'newer',sessionId:'s',name:'read_agent_result',result:{sourceRef:{kind:'agentToolResults',id:'old'},data:{}}}},store={get:(_,id)=>records[id]};
 const page=readSavedResult(store,'s',{id:'newer',section:'rows'});assert.equal(page.resultRef.id,'original');assert.deepEqual(page.data,[1,2,3]);
 records.old.sessionId='other';assert.throws(()=>readSavedResult(store,'s',{id:'newer'}),/不属于/);
 records.old.sessionId='s';records.old.result.sourceRef.id='newer';assert.throws(()=>readSavedResult(store,'s',{id:'newer'}),/循环/);
});
test('reader rejects missing fields, inherited properties and invalid offsets',()=>{
 const store=fixture({rows:[1]});for(const section of ['__proto__','rows.constructor','rows.9'])assert.throws(()=>readSavedResult(store,'s',{id:'original',section}),/不存在/);
 assert.throws(()=>readSavedResult(store,'s',{id:'original',offset:-1}),/分页/);assert.throws(()=>readSavedResult(store,'s',{id:'call-not-a-result'}),/工具调用编号/);
 const empty=readSavedResult(store,'s',{id:'original',section:'rows',offset:1});assert.deepEqual(empty.data,[]);assert.equal(empty.hasMore,false);
});
test('bounded execution responses retain task identity and no task lookup hint is given for previews',()=>{
 const view=boundedToolResult({ok:true,taskId:'task-1',status:'succeeded',tool:'inspect',preview:['x'.repeat(50000)],resultRef:{kind:'agentToolResults',id:'original'}});
 assert.equal(view.taskId,'task-1');assert.equal(view.status,'succeeded');assert.equal(view.readHint.tool,'read_agent_result');assert.ok(size(view)<=RESULT_BYTES);
});
test('evidence accepts the captured attachment aliases while rejecting foreign references',()=>{
 const inputs=[{id:'attachment-a',path:'模板.xlsx',reference:'a',workPath:'inputs/a/模板.xlsx'}];
 for(const ref of ['a','attachment-a','模板.xlsx','inputs/a/模板.xlsx'])assert.deepEqual(evidenceRequestAllowed({files:[ref]},inputs).files,[ref]);
 assert.throws(()=>evidenceRequestAllowed({files:['outside']},inputs),/范围/);
});
