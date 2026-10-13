import path from 'node:path';
import {INPUT_PATH_KEYS} from '../workflows/contracts.mjs';

const normalized=value=>path.normalize(value).replaceAll('\\','/');
export function findAgentTool(catalog,id){
  return catalog.find(tool=>tool.id===id||(tool.engine==='mcp'&&(id===tool.mcpName||id==='audit_'+tool.mcpName)));
}

/** Resolve persisted evidence identities before interpreting any value as a path. */
export function resolveInputReference(run,value,{source,preferSource}={}){
  if(typeof value!=='string'||!value.trim())throw Error('文件引用无效');
  const reference=normalized(value),inputs=run.inputs||[];
  let matches=inputs.filter(input=>[input.id,input.reference,input.workPath].filter(Boolean).some(alias=>normalized(alias)===reference));
  if(!matches.length)matches=inputs.filter(input=>normalized(input.path)===reference);
  if(source==='attachments')matches=matches.filter(input=>input.source==='attachment');
  if(matches.length>1&&(source==='project'||preferSource)){
    const preferred=matches.filter(input=>(input.source==='attachment')===((preferSource||source)==='attachments'));
    if(preferred.length)matches=preferred;
  }
  if(matches.length>1)throw Error('文件名对应多个资料，请使用附件编号或完整工作路径：'+value);
  if(matches.length===1)return path.normalize(matches[0].source==='attachment'?matches[0].workPath:matches[0].path);
  // A folder attachment is an explicit set of already captured child files.
  const children=inputs.filter(input=>input.source==='attachment'&&input.reference?.startsWith(value+'/'));
  if(children.length){
    const folder=normalized(children[0].workPath).split('/').slice(0,3).join('/');
    if(children.every(input=>normalized(input.workPath).startsWith(folder+'/')))return path.normalize(folder);
  }
  if(source==='attachments')throw Error('附件引用不存在、未发送或不属于当前任务：'+value);
  // Existing derived results and project directories are checked by the engine's scope guard.
  return path.normalize(value);
}

export function resolveAuditParameters(run,tool,raw,options={}){
  if(raw!==undefined&&(!raw||Array.isArray(raw)||typeof raw!=='object'))throw Error('工具参数必须为对象');
  function rewrite(value,key=''){
    if(Array.isArray(value))return value.map(item=>rewrite(item,key));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([name,item])=>[name,rewrite(item,name)]));
    if(typeof value==='string'&&value.trim()&&INPUT_PATH_KEYS.has(key))return resolveInputReference(run,value,options);
    return value;
  }
  const result={};
  for(const [key,value] of Object.entries(raw||{})){
    if(tool?.fields.some(field=>field.key===key&&field.kind==='json')&&typeof value==='string'&&value.trim()){
      result[key]=JSON.stringify(rewrite(JSON.parse(value)));
    }else result[key]=rewrite(value,key);
  }
  return result;
}
