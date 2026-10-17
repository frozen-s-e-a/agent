// Saved results stay complete. Only the model-facing view is bounded.
import {gunzipSync} from 'node:zlib';
import {digest} from './context.mjs';
export const RESULT_BYTES = 24000;
const bytes = value => Buffer.byteLength(JSON.stringify(value), 'utf8');
const readHint = (ref, section, offset) => ({tool:'read_agent_result',arguments:{...(ref.kind==='tasks'?{taskId:ref.id}:{id:ref.id}),...(section?{section}:{}),...(offset!==undefined?{offset}:{})}});
const childPath = (base, key) => base ? base + '.' + key : String(key);

function describe(value, section, depth) {
  if (bytes(value) <= 700) return value;
  if (typeof value === 'string') return {type:'string',length:value.length,section};
  if (Array.isArray(value)) return {type:'array',length:value.length,section,...(depth>0&&value.some(item=>item&&typeof item==='object')?{items:value.slice(0,8).map((item,index)=>describe(item,childPath(section,index),depth-1))}:{})};
  if (value && typeof value === 'object') return depth>0 ? Object.fromEntries(Object.entries(value).slice(0,50).map(([key,item])=>[key,describe(item,childPath(section,key),depth-1)])) : {type:'object',section,keys:Object.keys(value).slice(0,50),totalKeys:Object.keys(value).length};
  return value;
}

export function resultOverview(data, ref, {section='', byteLimit=RESULT_BYTES, offset=0, limit=20}={}) {
  const keys=data&&!Array.isArray(data)&&typeof data==='object'?Object.keys(data):null;
  const selected=keys?Object.fromEntries(keys.slice(offset,offset+limit).map(key=>[key,data[key]])):data;
  const nextSection=data?.previews?.[0]?.preview ? childPath(section,'previews.0.preview')
    : data && !Array.isArray(data) && typeof data==='object'
      ? childPath(section,['preview','rawRows',...Object.keys(data)].find(key=>Object.hasOwn(data,key)&&bytes(data[key])>700) || Object.keys(data)[0])
      : section;
  const result={ok:true,resultRef:ref,sourceRef:ref,section,overview:true,hasMore:true,
    readHint:readHint(ref,nextSection),...(keys?{totalKeys:keys.length,keyOffset:offset,nextKeyOffset:Math.min(keys.length,offset+limit),moreKeys:offset+limit<keys.length,...(offset+limit<keys.length?{keyPageHint:readHint(ref,section,offset+limit)}:{})}:{}),
    note:'这是内容索引，不是完整数据。按 summary 的 section 读取所需部分；数组/文本按 nextOffset 继续，对象目录按 keyPageHint 继续。引用始终指向原始结果。'};
  for (let depth=4;depth>=0;depth--) {
    const view={...result,summary:describe(selected,section,depth)};
    if (bytes(view)<=byteLimit) return view;
  }
  throw Error('结果索引超过返回预算，请指定更小的读取部分');
}

/** Follow old read-result wrappers without copying another wrapper into the model history. */
export function originalResult(store, sessionId, id, kind) {
  const seen=new Set();let record;
  while (true) {
    if (seen.has(id)) throw Error('证据引用存在循环');seen.add(id);
    record=kind==='tasks'?null:store.get('agentToolResults',id);
    if (!record) {
      const task=store.get('tasks',id);
      if(!task)throw Error('结果记录不存在；请使用实际任务编号或保存结果的引用编号，工具调用编号不能读取结果');
      if(task.sessionId!==sessionId)throw Error('证据记录不属于当前对话');
      if(!task.result)throw Error('任务尚未保存结果，请用 get_task_result 核对当前状态');
      return {id:task.id,sessionId:task.sessionId,runId:task.agentRunId,name:'task_result',referenceKind:'tasks',result:task.result};
    }
    if (record.sessionId!==sessionId) throw Error('证据记录不属于当前对话');
    if(record.name==='agent_context_archive'&&record.payloadEncoding==='json+gzip'){
      const result=JSON.parse(gunzipSync(Buffer.from(record.payload,'base64')).toString('utf8'));
      if(digest(result)!==record.payloadSha256)throw Error('上下文原始记录校验失败');
      return {...record,result};
    }
    if (record.name!=='read_agent_result'||!['agentToolResults','tasks'].includes(record.result?.sourceRef?.kind)) return record;
    id=record.result.sourceRef.id;kind=record.result.sourceRef.kind;
  }
}

function atSection(data, section) {
  if (!section) return data;
  // Keep existing top-level names working, including names containing dots.
  if (data && Object.hasOwn(data,section)) return data[section];
  for (const key of section.split('.')) {
    if (!data || typeof data!=='object' || !Object.hasOwn(data,key)) throw Error('返回中不存在所需部分；请使用内容索引里的 section');
    data=data[key];
  }
  return data;
}

export function readSavedResult(store, sessionId, args, {byteLimit=RESULT_BYTES}={}) {
  if(args.id&&args.taskId)throw Error('只能指定一个结果引用 id 或任务编号 taskId');
  const id=args.taskId??args.id;
  if(typeof id!=='string'||!id.trim())throw Error('请提供任务编号 taskId 或结果引用 id');
  const offset=args.offset??0,limit=args.limit??20,section=args.section??'';
  if (typeof section!=='string'||!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>50) throw Error('证据分页范围无效');
  const record=originalResult(store,sessionId,id,args.taskId?'tasks':undefined),ref={kind:record.referenceKind||'agentToolResults',id:record.id},data=atSection(record.result,section);
  const base={ok:true,resultRef:ref,sourceRef:ref,section,offset};
  if (Array.isArray(data)) {
    const page=[];let next=offset;
    while (next<data.length&&page.length<limit) {
      const candidate={...base,data:[...page,data[next]],total:data.length,nextOffset:next+1,hasMore:next+1<data.length,readHint:readHint(ref,section,next+1)};
      if (bytes(candidate)>byteLimit) break;
      page.push(data[next++]);
    }
    if (!page.length && offset<data.length) return {...resultOverview(data[offset],ref,{section:childPath(section,offset),byteLimit:byteLimit-400}),continuation:readHint(ref,section,offset+1)};
    const hasMore=next<data.length;
    return {...base,data:page,total:data.length,nextOffset:next,hasMore,...(hasMore?{readHint:readHint(ref,section,next)}:{})};
  }
  if (typeof data==='string') {
    // String offsets count UTF-16 units; do not split a surrogate pair.
    if (offset>0&&offset<data.length&&/[\uDC00-\uDFFF]/.test(data[offset])&&/[\uD800-\uDBFF]/.test(data[offset-1])) throw Error('文本分页位置在字符中间，请使用返回的 nextOffset');
    let low=0,high=Math.max(0,data.length-offset);
    while (low<high) {const count=Math.ceil((low+high)/2);if(bytes({...base,data:data.slice(offset,offset+count),total:data.length,nextOffset:offset+count,hasMore:true,readHint:readHint(ref,section,offset+count)})<=byteLimit)low=count;else high=count-1;}
    let next=offset+low;if(next<data.length&&next>offset&&/[\uD800-\uDBFF]/.test(data[next-1]))next--;
    if(next===offset&&offset<data.length)throw Error('文本返回预算不足');
    const hasMore=next<data.length;
    return {...base,data:data.slice(offset,next),total:data.length,nextOffset:next,hasMore,...(hasMore?{readHint:readHint(ref,section,next)}:{})};
  }
  const response={...base,data,hasMore:false};
  return bytes(response)<=byteLimit ? response : resultOverview(data,ref,{section,byteLimit,offset,limit});
}
