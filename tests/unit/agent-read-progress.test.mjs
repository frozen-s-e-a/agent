import test from 'node:test';
import assert from 'node:assert/strict';
import {readSavedResult} from '../../src/agent/result-reader.mjs';
import {contextState} from '../../src/agent/context-builder.mjs';
import {repeatedOutput,createReadProgressTracker} from '../../src/agent/progress.mjs';
import {executionIntent,completionGap} from '../../src/agent/task-intent.mjs';

test('task ids directly read the complete original result with stable paging and session checks',()=>{
 const rows=Array.from({length:73},(_,i)=>({row:i,amount:i*10}));
 const task={id:'task',sessionId:'s',status:'succeeded',result:{sample_rows:rows,preview:rows.slice(0,20)}};
 const wrapper={id:'wrapper',sessionId:'s',name:'read_agent_result',result:{sourceRef:{kind:'tasks',id:'task'}}};
 const store={get:(kind,id)=>kind==='tasks'&&id==='task'?task:kind==='agentToolResults'&&id==='wrapper'?wrapper:null};
 let args={taskId:'task',section:'sample_rows',limit:20},received=[];
 while(true){const page=readSavedResult(store,'s',args);assert.deepEqual(page.resultRef,{kind:'tasks',id:'task'});received.push(...page.data);if(!page.hasMore)break;assert.equal(page.readHint.arguments.taskId,'task');args=page.readHint.arguments;}
 assert.deepEqual(received,rows);
 assert.deepEqual(readSavedResult(store,'s',{id:'task',section:'sample_rows',limit:50}).data,rows.slice(0,50));
 assert.equal(readSavedResult(store,'s',{id:'wrapper',section:'sample_rows'}).resultRef.kind,'tasks');
 assert.throws(()=>readSavedResult(store,'foreign',{taskId:'task'}),/不属于/);
 assert.throws(()=>readSavedResult(store,'s',{id:'wrapper',taskId:'task'}),/只能/);
});

test('hundreds of read wrappers do not inflate the actual task result index',()=>{
 const steps=Array.from({length:282},(_,i)=>({id:'read-'+i,name:'read_agent_result',status:'succeeded',result:{resultRef:{kind:'agentToolResults',id:'context-r-'+i},sourceRef:{kind:'agentToolResults',id:'context-r-'+i}}}));
 for(let i=0;i<4;i++)for(let j=0;j<5;j++)steps.push({id:'task-read-'+i+'-'+j,name:'get_task_result',taskId:'t'+i,status:'succeeded',result:{ok:true,taskId:'t'+i,resultRef:{kind:'agentToolResults',id:'another-wrapper-'+j}}});
 const state=contextState({id:'r',steps,requirements:[],inputs:[],questions:[]});
 assert.equal(state.results.length,4);assert.equal(state.evidenceIndex.length,4);
 for(const result of state.results){assert.equal(result.resultRef.kind,'tasks');assert.equal(result.readHint.arguments.taskId,result.taskId);}
});

test('successful rereads are recognised even through different wrapper ids and argument orders',()=>{
 const track=createReadProgressTracker(),page={ok:true,sourceRef:{kind:'tasks',id:'t'},section:'rows',offset:0,nextOffset:2,data:[1,2],hasMore:false};
 assert.equal(track('read_agent_result',{id:'a'},page),null);
 assert.equal(track('read_agent_result',{id:'b'},page).repeated,1);
 assert.equal(track('read_agent_result',{taskId:'t'},page).stop,false);
 assert.equal(track('read_agent_result',{section:'rows',taskId:'t'},page).stop,true);
 track('run_audit_tool',{}, {ok:true,taskId:'new'});
 assert.equal(track('read_agent_result',{taskId:'t'},page),null);
});

test('paging through more than sixty new ranges remains unrestricted',()=>{
 const track=createReadProgressTracker();
 for(let offset=0;offset<80;offset++)assert.equal(track('read_agent_result',{id:'r',offset},{ok:true,resultRef:{kind:'agentToolResults',id:'r'},section:'rows',offset,nextOffset:offset+1,data:[offset],hasMore:offset<79}),null);
});

test('repeated prose with different truncated endings is detected while ordinary continuation remains valid',()=>{
 const a='让我直接查看之前检查任务的结果内容。这些任务编号需要从保存记录中读取，之后再继续执行实际的审计处理步骤。';
 const b='让我查看这些任务的结果。由于结果记录很多，我需要找到对应的结果引用，再查看之前检查任务的具体结果内容。';
 assert.equal(repeatedOutput((a+'\n\n'+b+'\n\n').repeat(30)+'让我查看之前'),true);
 assert.equal(repeatedOutput((a+'\n\n').repeat(3),(a+'\n\n').repeat(3)),true);
 assert.equal(repeatedOutput(Array.from({length:30},(_,i)=>'第 '+i+' 项核对结果：'+a).join('\n\n')),false);
 assert.equal(repeatedOutput('第二段给出剩余分析和实际成果。','第一段介绍已完成的检查。'),false);
});

test('status questions stay read-only and a workbook filling request cannot finish with inspections alone',()=>{
 assert.equal(executionIntent('刚才的任务执行到哪里了'),false);
 assert.equal(executionIntent('如何填写表格'),false);
 assert.equal(executionIntent('用 Sheet1 填写前三个 sheet 表'),true);
 const run={requiresTaskExecution:true,requiresWorkbookOutput:true,steps:[]};
 assert.match(completionGap(run,[]),/没有实际执行/);
 run.steps=[{name:'audit_detailed_table_inspect',taskId:'i'}];
 const task={id:'i',status:'succeeded',validationStatus:'passed',result:{outputs:[{name:'数据结构.json'}]}};
 assert.match(completionGap(run,[task]),/尚未生成/);
 task.result.outputs.push({name:'填写成果.xlsx'});assert.equal(completionGap(run,[task]),null);
});
