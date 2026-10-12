import {streamChat} from './model.mjs';
export async function runAgent({settings,key,messages,signal,tools,execute,onDelta,onStep,onRound,beforeRequest,afterResponse,onRequest,prepareRequest,shouldStop,maxRounds=8,maxToolCalls=16}){
 let history=[...messages];let calls=0,usage=null,usageIncomplete=false;
 for(let round=0;round<maxRounds;round++){
  signal.throwIfAborted();onRound?.(round);const prepared=await prepareRequest?.(history,tools,round);if(prepared?.messages)history=prepared.messages;if(prepared?.tools)tools=prepared.tools;const requestRef=await beforeRequest?.(history,tools,round,prepared);const response=await streamChat(settings,key,history,signal,onDelta,tools,request=>onRequest?.(request,requestRef));await afterResponse?.(response,requestRef);
  if(response.usage){usage??={prompt_tokens:0,completion_tokens:0,total_tokens:0};for(const k of ['prompt_tokens','completion_tokens','total_tokens'])usage[k]+=Number(response.usage[k]||0);}else usageIncomplete=true;
  if(response.finishReason==='length')throw Error('模型输出被截断，已保存实际步骤和结果，请缩小输出范围后继续');
  if(!response.toolCalls.length)return {text:response.text,usage,usageIncomplete,toolCount:calls};
  history.push({role:'assistant',content:response.text||null,tool_calls:response.toolCalls,...(response.reasoningContent?{reasoning_content:response.reasoningContent}:{})});
  for(const call of response.toolCalls){
   signal.throwIfAborted();if(++calls>maxToolCalls)throw Error('本轮已达到 '+maxToolCalls+' 次工具调用上限，请根据已显示结果继续提问');
   const name=call.function.name;let args,result;
   try{args=JSON.parse(call.function.arguments);if(!args||Array.isArray(args)||typeof args!=='object')throw Error('工具参数必须是对象');}catch(e){args={};result={ok:false,error:e.message};}
   await onStep?.({phase:'start',name,id:call.id,args,text:response.text});
   if(!result)try{if(!tools.some(t=>t.function.name===name))throw Error('工具未获授权');result=await execute(name,args,call.id);}catch(e){if(signal.aborted)throw e;result={ok:false,error:e.message};}
   const content=JSON.stringify(result);if(content.length>100000)throw Error('工具返回数据超过上下文预算');history.push({role:'tool',tool_call_id:call.id,content});await onStep?.({phase:'end',name,id:call.id,args,result});
   if(shouldStop?.())return {text:response.text,usage,usageIncomplete,toolCount:calls};
  }
 }
 throw Error('本轮已达到 '+maxRounds+' 轮模型调用上限；本地结果已保留，可继续提问');
}
