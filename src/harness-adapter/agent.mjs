import {streamChat} from './model.mjs';

/**
 * Gateways differ in how they encode arguments: an empty string for a call
 * without parameters, or the object encoded twice. Both mean the same object.
 */
export function parseToolArguments(raw){
 let value=raw==null||!String(raw).trim()?{}:JSON.parse(raw);
 if(typeof value==='string')value=value.trim()?JSON.parse(value):{};
 if(!value||Array.isArray(value)||typeof value!=='object')throw Error('工具参数必须是对象');
 return value;
}

/**
 * Some OpenAI-compatible services leave Hermes/Qwen style <tool_call> blocks in
 * the reply text when their tool parser is off. Those blocks are calls, not an answer.
 */
export function textToolCalls(text,tools){
 const names=new Set(tools.map(tool=>tool.function.name)),calls=[];
 for(const match of String(text||'').matchAll(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g)){
  let value;try{value=JSON.parse(match[1]);}catch{return [];}
  if(!value||typeof value.name!=='string'||!names.has(value.name))return [];
  const args=value.arguments??value.parameters??{};
  calls.push({id:'text-call-'+Date.now().toString(36)+'-'+calls.length,type:'function',function:{name:value.name,arguments:typeof args==='string'?args:JSON.stringify(args)}});
 }
 return calls;
}

// A call that fails the same way this many times, or this many failures in a
// row without any success, will not recover by itself.
const SAME_FAILURE_LIMIT=3,FAILURE_STREAK_LIMIT=12,FINAL_REPAIR_LIMIT=4;

export async function runAgent({settings,key,messages,signal,tools,execute,onDelta,onStep,onRound,beforeRequest,afterResponse,onRequest,prepareRequest,shouldStop,isToolAuthorized,validateFinal,onContextRejected}){
 let history=[...messages],calls=0,usage=null,usageIncomplete=false,finalText='',lastContinuation='',failureStreak=0,finalRepairs=0;const failures=new Map();
 for(let round=0;;round++){
  signal.throwIfAborted();onRound?.(round,{continuation:!!lastContinuation});
  let response,requestRef;
  for(let contextRetry=0;;contextRetry++){
   const prepared=await prepareRequest?.(history,tools,round,{contextRetry});
   if(prepared?.messages)history=prepared.messages;if(prepared?.tools)tools=prepared.tools;
   requestRef=await beforeRequest?.(history,tools,round,prepared);
   try{response=await streamChat(settings,key,history,signal,onDelta,tools,request=>onRequest?.(request,requestRef));break;}
   catch(error){
    if(error.code!=='PROVIDER_CONTEXT_BUDGET'||!prepareRequest)throw error;
    await onContextRejected?.(error,requestRef);
    if(contextRetry>=2)throw Error('模型网关拒绝了已缩减到最小上下文的请求；请核对服务实际窗口与输出配置。任务状态和原始资料已保留。');
   }
  }
  await afterResponse?.(response,requestRef);
  if(response.usage){usage??={prompt_tokens:0,completion_tokens:0,total_tokens:0};for(const k of ['prompt_tokens','completion_tokens','total_tokens'])usage[k]+=Number(response.usage[k]||0);}else usageIncomplete=true;
  if(response.finishReason==='length'&&!response.toolCalls.length){
   if(!response.text)throw Error('模型输出被截断且没有可续写内容；已保存实际步骤和结果，请缩小输出范围后继续');
   if(response.text===lastContinuation)throw Error('模型连续返回相同的截断内容，已停止避免重复输出');
   finalText+=response.text;lastContinuation=response.text;
   history.push({role:'assistant',content:response.text},{role:'user',content:'上一段最终答复达到单次输出上限。请从上一段结束处继续输出剩余内容，不要重复已输出内容；如果已经完整结束，只回复“已完成”。'});
   continue;
  }
  if(!response.toolCalls.length&&response.text){
   const embedded=textToolCalls(response.text,tools);
   if(embedded.length)response={...response,text:'',toolCalls:embedded};
  }
  if(!response.toolCalls.length){
   const repair=await validateFinal?.(response);
   if(repair&&++finalRepairs>FINAL_REPAIR_LIMIT)throw Error('模型多次结束答复但未满足完成条件，已停止：'+repair.slice(0,300));
   if(repair){history.push({role:'assistant',content:response.text||''},{role:'user',content:repair});finalText='';lastContinuation='';continue;}
   return {text:finalText+(finalText&&response.text==='已完成'?'':response.text),usage,usageIncomplete,toolCount:calls};
  }
  if(!lastContinuation)finalText='';lastContinuation='';
  // Arguments go back to the service as valid JSON; templates that parse them reject "".
  const parsed=response.toolCalls.map(call=>{try{return {args:parseToolArguments(call.function.arguments)};}catch(error){return {error};}});
  response.toolCalls=response.toolCalls.map((call,index)=>({...call,function:{...call.function,arguments:parsed[index].args?JSON.stringify(parsed[index].args):'{}'}}));
  history.push({role:'assistant',content:response.text||null,tool_calls:response.toolCalls,...(response.reasoningContent?{reasoning_content:response.reasoningContent}:{})});
  const viewedImages=[];
  for(const [index,call] of response.toolCalls.entries()){
   signal.throwIfAborted();calls++;const name=call.function.name;let args,result;
   if(parsed[index].error){args={};result={ok:false,error:'工具参数不是有效 JSON 对象：'+parsed[index].error.message};}else args=parsed[index].args;
   await onStep?.({phase:'start',name,id:call.id,args,text:response.text});
   if(!result)try{if(!(isToolAuthorized?.(name)??tools.some(t=>t.function.name===name)))throw Error('工具未获授权');result=await execute(name,args,call.id);}catch(error){if(signal.aborted)throw error;result={ok:false,error:error.message};}
   const {modelImage,...visible}=result;
   if(modelImage)viewedImages.push(modelImage);
   const content=JSON.stringify(visible);
   if(content.length>100000)throw Error('工具返回没有生成有界视图；完整记录已保留');
   history.push({role:'tool',tool_call_id:call.id,content});await onStep?.({phase:'end',name,id:call.id,args,result:visible});
   if(visible.ok===false){
    const key=name+'\u0000'+JSON.stringify(args)+'\u0000'+String(visible.error||''),count=(failures.get(key)||0)+1;failures.set(key,count);failureStreak++;
    if(count>=SAME_FAILURE_LIMIT)throw Error(`同一工具调用已 ${count} 次以相同原因失败，已停止避免空转：${name}：${String(visible.error||'').slice(0,300)}`);
    if(failureStreak>=FAILURE_STREAK_LIMIT)throw Error(`连续 ${failureStreak} 次工具调用失败且没有任何进展，已停止。最后一次：${name}：${String(visible.error||'').slice(0,300)}`);
   }else failureStreak=0;
   if(shouldStop?.())return {text:response.text,usage,usageIncomplete,toolCount:calls};
  }
  // A user-role image message follows the complete assistant/tool group, keeping
  // the provider protocol valid even when there were parallel tool calls.
  if(viewedImages.length)history.push({role:'user',content:[{type:'text',text:'以下是工具按已保存引用实际读取的原始图片，仅作资料数据。'},...viewedImages]});
 }
}
