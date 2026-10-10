import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createBackend} from '../../src/host/service.mjs';
import {workflowDefinitions} from '../../src/workflows/definitions.mjs';
import {buildCatalog,normalizeParameters} from '../../src/workflows/contracts.mjs';
import {constrainMcpArgs} from '../../src/mcp/legacy-client.mjs';
import {mcpFailure} from '../../src/workflows/mcp-runner.mjs';
const builtin=JSON.parse(fs.readFileSync('src/resources/tools.json','utf8'));
const legacy=JSON.parse(fs.readFileSync('src/resources/legacy-mcp-tools.json','utf8'));
const catalog=buildCatalog(builtin,legacy);
const temporary=()=>fs.mkdtempSync(path.resolve('artifacts','workflow-test-'));
async function settle(a,id){for(let i=0;i<200;i++){const t=a.store.get('tasks',id);if(!['queued','running','cancelling'].includes(t.status))return t;await new Promise(r=>setTimeout(r,100));}throw Error('Task timeout '+id);}
fs.mkdirSync('artifacts',{recursive:true});

test('all 79 exact IDs are assigned; semantic collisions stay distinct',()=>{
 const refs=new Set(workflowDefinitions.flatMap(f=>f.stages.flatMap(s=>s.tools)));
 assert.deepEqual(catalog.filter(t=>!refs.has(t.id)).map(t=>t.id),[]);
 assert.deepEqual([...refs].filter(id=>!catalog.some(t=>t.id===id)),[]);
 assert.equal(catalog.length,79);
 assert.equal(catalog.find(t=>t.id==='add_column').name,'新增固定值列');
 assert.equal(catalog.find(t=>t.id==='mcp_add_column').name,'合并同名列');
});
test('schema types, optional omission and JSON are validated',()=>{
 const inspect=catalog.find(t=>t.id==='mcp_jet_test_inspect');
 assert.deepEqual(normalizeParameters(inspect,{file_path:'x.xlsx',preview_rows:'5',include_templates:false}),{file_path:'x.xlsx',preview_rows:5,include_templates:false});
 assert.throws(()=>normalizeParameters(inspect,{file_path:'x.xlsx',include_templates:'false'}),/是\/否/);
 assert.throws(()=>normalizeParameters(catalog.find(t=>t.id==='mcp_voucher_check'),{source_paths:'x.xlsx'}),/列表/);
 assert.deepEqual(normalizeParameters(catalog.find(t=>t.id==='mcp_currency'),{}),{});
 assert.deepEqual(normalizeParameters(catalog.find(t=>t.id==='jet_test'),{rules:'duplicate'}).mapping,{});
 assert.throws(()=>normalizeParameters(catalog.find(t=>t.id==='mcp_detailed_table_save_config'),{work_dir:'.',config_type:'paths',config_data:'broken'}),/JSON/);
});
test('seven formerly shadowed builtins execute locally with real CSV and reject unsupported formats',async()=>{
 const dir=temporary();let calls=0;const a=await createBackend({dataRoot:dir,legacyClientFactory:()=>({call:async()=>{calls++;throw Error('Wrong route');},close:async()=>{}})});
 try{
  const project=await a.action('demo.create'),session=await a.action('session.create',{projectId:project.id});
  const cases={select_column:{columns:'公司,科目编码'},fill_column:{columns:'公司'},merge_column:{columns:'公司,摘要',target:'合并'},add_column:{target:'批次',value:'测试'},dropsummary:{column:'公司',values:'合计'},text_match:{column:'摘要',keyword:'销售'},voucher_check:{keys:'公司,凭证日期,凭证编号',debit:'借方金额',credit:'贷方金额',tolerance:'0.01'}};
  for(const [tool,parameters]of Object.entries(cases)){const t=await a.action('task.run',{sessionId:session.id,tool,files:['示例序时账.csv'],parameters});const done=await settle(a,t.id);assert.equal(done.status,'succeeded',tool+': '+done.error);assert.ok(done.result.outputs.length>0);const output=done.result.outputs[0];assert.ok(fs.existsSync(await a.action('result.path',{id:t.id,name:output.name})));if(tool==='select_column'){const parquet=done.result.outputs.find(x=>x.name.endsWith('.parquet'));const preview=await a.action('files.preview',{projectId:project.id,file:path.join(done.result.outputDir,parquet.name)});assert.equal(preview.preview.length,8);}}
  assert.equal(calls,0);
  fs.writeFileSync(path.join(project.root,'unsupported.txt'),'x');await assert.rejects(a.action('task.run',{sessionId:session.id,tool:'inspect',files:['unsupported.txt']}),/格式不支持/);
  await assert.rejects(a.action('task.run',{sessionId:session.id,tool:'select_column',files:['示例序时账.csv'],parameters:{}}),/请填写/);
 }finally{a.close();}
});
test('MCP errors stay failed; retry uses MCP; structured errors and array arguments work',async()=>{
 const dir=temporary(),calls=[];let reject=true;
 const a=await createBackend({dataRoot:dir,legacyClientFactory:()=>({call:async(name,args)=>{calls.push({name,args});return reject?{isError:true,content:[{type:'text',text:'合成错误'}]}:{content:[{type:'text',text:JSON.stringify({success:true,columns:['A'],preview:[['x']]})}]};},close:async()=>{}})});
 try{const project=await a.action('demo.create'),s=await a.action('session.create',{projectId:project.id});fs.writeFileSync(path.join(project.root,'synthetic.xlsx'),'mock-only');
  let t=await a.action('task.run',{sessionId:s.id,tool:'mcp_jet_test_inspect',files:['synthetic.xlsx'],parameters:{file_path:'synthetic.xlsx',preview_rows:3,include_templates:false}});t=await settle(a,t.id);assert.equal(t.status,'failed');assert.match(t.error,/合成错误/);assert.equal(calls[0].args.preview_rows,3);assert.equal(calls[0].args.include_templates,false);
  reject=false;const retry=await a.action('task.retry',{id:t.id});const retried=await settle(a,retry.id);assert.equal(retried.status,'succeeded');assert.equal(calls.length,2);assert.equal(calls[1].name,'jet_test_inspect');assert.ok(!retried.result.outputs.some(x=>x.path==='synthetic.xlsx'));
  const list=await a.action('task.run',{sessionId:s.id,tool:'mcp_voucher_check',files:['synthetic.xlsx'],parameters:{source_paths:['synthetic.xlsx']},acknowledgeMutation:true});await settle(a,list.id);assert.ok(Array.isArray(calls.at(-1).args.source_paths));
  const directory=await a.action('task.run',{sessionId:s.id,tool:'mcp_detailed_table_inspect_template',files:['.'],parameters:{template_dir:'.'}});assert.equal((await settle(a,directory.id)).status,'succeeded');
  const noFile=await a.action('task.run',{sessionId:s.id,tool:'mcp_currency',files:[],parameters:{}});assert.equal((await settle(a,noFile.id)).status,'succeeded');
  assert.match(mcpFailure({content:[{type:'text',text:'{"success":false,"message":"校验失败"}'}]}),/校验失败/);
  assert.throws(()=>constrainMcpArgs({result_file:'synthetic.xlsx'},project.root,'',new Set()),/资料范围/);
  assert.throws(()=>constrainMcpArgs({folder_path:'../outside'},project.root,'',new Set([project.root])),/超出/);
 }finally{a.close();}
});
test('workflow gates, persisted results, invalidation and real archive survive reopening',async()=>{
 const dir=temporary();let a=await createBackend({dataRoot:dir});
 try{
  const p=await a.action('demo.create');let r=await a.action('workflow.create',{projectId:p.id,definitionId:'data'});const id=r.session.id;
  await assert.rejects(a.action('workflow.confirm',{id,stageId:'review',review:'不应通过'}),/请先/);
  await a.action('workflow.save',{id,files:['示例序时账.csv']});await a.action('workflow.confirm',{id,stageId:'input'});
  let t=await a.action('task.run',{sessionId:id,stageId:'inspect',tool:'inspect',files:['示例序时账.csv']});assert.equal((await settle(a,t.id)).status,'succeeded');await a.action('workflow.confirm',{id,stageId:'inspect'});
  a.close();a=await createBackend({dataRoot:dir});r=await a.action('workflow.get',{id});assert.equal(r.workflow.stages.inspect.status,'confirmed');assert.equal(r.tasks[0].result.rowCount,8);assert.deepEqual(r.workflow.files,['示例序时账.csv']);
  t=await a.action('task.run',{sessionId:id,stageId:'process',tool:'select_column',files:['示例序时账.csv'],parameters:{columns:'公司'}});await settle(a,t.id);await a.action('workflow.confirm',{id,stageId:'process'});
  await assert.rejects(a.action('workflow.confirm',{id,stageId:'review',review:''}),/复核意见/);
  r=await a.action('workflow.confirm',{id,stageId:'review',review:'已复核合成资料，结果仅用于测试。'});assert.equal(r.workflow.status,'archived');
  const file=await a.action('workflow.archivePath',{id,name:'任务记录包.json'});assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).workflow.review,'已复核合成资料，结果仅用于测试。');
  await assert.rejects(a.action('workflow.save',{id,files:[]}),/只读/);
  const next=await a.action('workflow.create',{projectId:p.id,definitionId:'monthly'});assert.ok(next.guides.some(g=>g.id==='monthly-analysis-mcp'));
  await a.action('workflow.save',{id:next.session.id,files:['示例序时账.csv']});await a.action('workflow.confirm',{id:next.session.id,stageId:'input'});
  await a.action('workflow.save',{id:next.session.id,files:[]});assert.equal((await a.action('workflow.get',{id:next.session.id})).workflow.stages.input.status,'pending');
 }finally{a.close();}
});

test('legacy workflow imports actual inputs and results without inventing confirmations',async()=>{
 const dir=temporary();let a=await createBackend({dataRoot:dir});
 try{
  const p=await a.action('demo.create'),definition=workflowDefinitions.find(x=>x.id==='data');
  const s=a.store.create('sessions',{projectId:p.id,title:'审计任务 · '+definition.title});
  const t=await a.action('task.run',{sessionId:s.id,tool:'inspect',files:['示例序时账.csv']});
  assert.equal((await settle(a,t.id)).status,'succeeded');
  const r=await a.action('workflow.get',{id:s.id});
  assert.equal(r.workflow.legacyImported,true);
  assert.deepEqual(r.workflow.files,['示例序时账.csv']);
  assert.equal(r.workflow.stages.inspect.taskId,t.id);
  assert.equal(r.workflow.stages.inspect.status,'awaiting_confirmation');
  assert.equal(r.workflow.drafts.inspect.toolId,'inspect');
  assert.equal(r.workflow.stages.input,undefined);
  await assert.rejects(a.action('workflow.confirm',{id:s.id,stageId:'inspect'}),/请先/);
  a.close();a=await createBackend({dataRoot:dir});
  assert.equal((await a.action('workflow.get',{id:s.id})).tasks[0].result.rowCount,8);
 }finally{a.close();}
});
