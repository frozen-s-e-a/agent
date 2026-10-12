import {streamChat} from './model.mjs';
export async function runAgent({settings,key,messages,signal,tools,execute,onDelta,onStep,onRound}){
 const history=[...messages];let calls=0,usage=null,usageIncomplete=false;
 for(let round=0;round<8;round++){
  signal.throwIfAborted();onRound?.(round);const response=await streamChat(settings,key,history,signal,onDelta,tools);
  if(response.usage){usage??={prompt_tokens:0,completion_tokens:0,total_tokens:0};for(const k of ['prompt_tokens','completion_tokens','total_tokens'])usage[k]+=Number(response.usage[k]||0);}else usageIncomplete=true;
  if(!response.toolCalls.length)return {text:response.text,usage,usageIncomplete,toolCount:calls};
  history.push({role:'assistant',content:response.text||null,tool_calls:response.toolCalls,...(response.reasoningContent?{reasoning_content:response.reasoningContent}:{})});
  for(const call of response.toolCalls){
   signal.throwIfAborted();if(++calls>16)throw Error('本轮已达到 16 次工具调用上限，请根据已显示结果继续提问');
   const name=call.function.name;let args,result;onStep?.({phase:'start',name,id:call.id,text:response.text});
   try{args=JSON.parse(call.function.arguments);if(!args||Array.isArray(args)||typeof args!=='object')throw Error('工具参数必须是对象');if(!tools.some(t=>t.function.name===name))throw Error('工具未获授权');result=await execute(name,args);}catch(e){if(signal.aborted)throw e;result={ok:false,error:e.message};}
   const content=JSON.stringify(result);if(content.length>100000)throw Error('工具返回数据超过上下文预算');history.push({role:'tool',tool_call_id:call.id,content});onStep?.({phase:'end',name,id:call.id,result});
  }
 }
 throw Error('本轮已达到 8 轮模型调用上限；本地结果已保留，可继续提问');
}
