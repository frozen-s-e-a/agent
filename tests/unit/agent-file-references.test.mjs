import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {Store} from '../../src/conversations/store.mjs';
import {captureAttachmentInputs,fileHash} from '../../src/agent/inputs.mjs';
import {findAgentTool,resolveInputReference,resolveAuditParameters} from '../../src/agent/file-references.mjs';
import {constrainMcpArgs} from '../../src/mcp/arguments.mjs';

const run={inputs:[{id:'attachment-a',reference:'a',path:'同名.xlsx',source:'attachment',workPath:'inputs/a/同名.xlsx'},{id:'project-p',path:'同名.xlsx'}]};
test('explicit attachment identities cannot select a same-name project file',()=>{
  for(const ref of ['attachment-a','a','inputs\\a\\同名.xlsx','inputs/a/同名.xlsx'])assert.equal(resolveInputReference(run,ref),path.normalize('inputs/a/同名.xlsx'));
  assert.equal(resolveInputReference(run,'同名.xlsx',{source:'attachments'}),path.normalize('inputs/a/同名.xlsx'));
  assert.equal(resolveInputReference(run,'同名.xlsx',{source:'project'}),'同名.xlsx');
  assert.equal(resolveAuditParameters(run,{fields:[]},{file_path:'同名.xlsx'},{preferSource:'attachments'}).file_path,path.normalize('inputs/a/同名.xlsx'));
  assert.equal(resolveAuditParameters(run,{fields:[]},{file_path:'同名.xlsx'},{preferSource:'project'}).file_path,'同名.xlsx');
  assert.throws(()=>resolveInputReference(run,'同名.xlsx'),/多个资料/);
  assert.throws(()=>resolveInputReference(run,'foreign',{source:'attachments'}),/不属于当前任务/);
});
test('folder children, arrays and nested configuration use the same canonical references',()=>{
  const folder={inputs:[{id:'child-a',reference:'folder/a',path:'凭证/深层/a.csv',source:'attachment',workPath:'inputs/folder/凭证/深层/a.csv'}]};
  assert.equal(resolveInputReference(folder,'folder'),path.normalize('inputs/folder/凭证'));
  const tool={fields:[{key:'config_data',kind:'json'}]};
  const result=resolveAuditParameters(folder,tool,{file_paths:['folder/a'],config_data:JSON.stringify({file_path:'child-a',description:'folder/a'}),output_path:'new.xlsx'});
  assert.deepEqual(result.file_paths,[path.normalize('inputs/folder/凭证/深层/a.csv')]);
  assert.equal(JSON.parse(result.config_data).file_path,result.file_paths[0]);
  assert.equal(JSON.parse(result.config_data).description,'folder/a');assert.equal(result.output_path,'new.xlsx');
  assert.throws(()=>resolveAuditParameters(folder,tool,'not-an-object'),/对象/);
});
test('registered tool ids and model function names resolve without admitting unknown tools',()=>{
  const tool={id:'mcp_detailed_table_inspect',mcpName:'detailed_table_inspect',engine:'mcp'};
  for(const id of [tool.id,tool.mcpName,'audit_'+tool.mcpName])assert.equal(findAgentTool([tool],id),tool);
  assert.equal(findAgentTool([tool],'audit_unregistered'),undefined);
});
test('attachment workspaces retain the sent version and still reject out-of-scope paths',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-input-references-')),store=new Store(dir);
  try{
    const source=path.join(dir,'sent.csv');fs.writeFileSync(source,'客户,余额\n附件客户,123\n');
    const input={id:'attachment-a',reference:'a',path:'同名.csv',workPath:'inputs/a/同名.csv',source:'attachment',sourcePath:source,sha256:fileHash(source)};
    const task={id:'run',inputs:[input]};captureAttachmentInputs(store,task);
    const project=store.get('projects',task.snapshotProjectId);
    assert.equal(fileHash(input.snapshotPath),input.sha256);assert.notEqual(input.snapshotPath,source);
    const resolved=resolveAuditParameters(task,{fields:[]},{file_path:'a'});
    assert.equal(constrainMcpArgs(resolved,project.root).file_path,input.snapshotPath);
    assert.throws(()=>constrainMcpArgs(resolveAuditParameters(task,{fields:[]},{file_path:'../../sent.csv'}),project.root),/路径超出/);
    fs.writeFileSync(source,'改过的资料');assert.equal(fileHash(input.snapshotPath),input.sha256);
    assert.throws(()=>captureAttachmentInputs(store,task),/附件副本已改变/);
  }finally{store.close();}
});
