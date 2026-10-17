import fs from 'node:fs';
import path from 'node:path';

export function mcpToOpenAiTool(tool,prefix='audit_') {
 const name=prefix+String(tool.name||'').replace(/[^A-Za-z0-9_-]/g,'_');
 return {type:'function',function:{name,description:tool.description||tool.name,parameters:tool.inputSchema||{type:'object',properties:{},additionalProperties:true}}};
}
const pathKeys=/^(file|files|file_path|file_paths|config_file|config_files|work_dir|output_dir|output_path|template_dir|data_dir|result_file|this_year_file|last_year_file|gl_path|bank_path|folder|folder_path|directory|target_path|source_paths|this_data_path|last_data_path)$/i;
const outputPathKeys=/^(output_dir|output_path)$/i;
function within(root,candidate){const relative=path.relative(root,candidate);return relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);}
export function constrainMcpArgs(value,root,key='',allowedFiles=null) {
 if(Array.isArray(value))return value.map(v=>constrainMcpArgs(v,root,key,allowedFiles));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,constrainMcpArgs(v,root,k,allowedFiles)]));
 if(typeof value==='string'&&value.trim()&&pathKeys.test(key)){
  const realRoot=fs.realpathSync(root),resolved=path.resolve(realRoot,value);if(!within(realRoot,resolved))throw Error('路径超出当前项目：'+value);
  let ancestor=resolved;while(!fs.existsSync(ancestor)&&path.dirname(ancestor)!==ancestor)ancestor=path.dirname(ancestor);
  if(!within(realRoot,fs.realpathSync(ancestor)))throw Error('路径超出当前项目：'+value);
  if(!outputPathKeys.test(key)&&!fs.existsSync(resolved))throw Error('输入不存在：'+value);
  if(allowedFiles&&!outputPathKeys.test(key)&&![...allowedFiles].some(p=>{const permitted=path.resolve(realRoot,p);return permitted===resolved||(fs.existsSync(permitted)&&fs.statSync(permitted).isDirectory()&&within(permitted,resolved));}))throw Error('文件未在当前资料范围内：'+value);
  return resolved;
 }
 return value;
}
