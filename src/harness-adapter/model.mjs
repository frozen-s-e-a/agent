import {modelRequest} from './connection.mjs';

const textValue=value=>{
 if(typeof value==='string')return value;
 if(!Array.isArray(value))return '';
 return value.map(part=>typeof part==='string'?part:(typeof part?.text==='string'?part.text:'')).join('');
};

function addToolCall(calls,part){
 if(!Number.isInteger(part.index)||part.index<0||part.index>7)throw Error('单轮工具调用超过限制');
 const call=calls.get(part.index)||{id:'',type:'function',function:{name:'',arguments:''}};
 if(part.id)call.id+=part.id;
 if(part.type&&part.type!=='function')throw Error('不支持的工具调用类型');
 if(part.function?.name)call.function.name+=part.function.name;
 if(typeof part.function?.arguments==='string')call.function.arguments+=part.function.arguments;
 if(call.id.length>256||call.function.name.length>128||call.function.arguments.length>64000)throw Error('工具参数超过长度限制');
 calls.set(part.index,call);
}

function completeToolCalls(calls){return [...calls.entries()].sort((a,b)=>a[0]-b[0]).map(x=>x[1]);}

function validateToolCalls(toolCalls,finished,finishReason){
 if(toolCalls.length&&finishReason==='length')throw Error('工具参数超过输出长度，未执行');
 if(toolCalls.length&&(!finished||toolCalls.some(c=>!c.id||!c.function.name)||new Set(toolCalls.map(c=>c.id)).size!==toolCalls.length))throw Error('工具调用响应不完整，未执行');
}

function parseToolMessages(value){
 const calls=new Map();
 for(const [index,part] of (Array.isArray(value)?value:[]).entries())addToolCall(calls,{...part,index:Number.isInteger(part?.index)?part.index:index});
 return completeToolCalls(calls);
}

async function nonStreamingFallback(settings,key,messages,signal,tools){
 const body={model:settings.model,messages,stream:false,temperature:settings.temperature,max_tokens:settings.maxTokens,...(tools?.length?{tools,tool_choice:'auto'}:{})};
 let response;
 try{({response}=await modelRequest(settings,key,'chat/completions',body,signal));}
 catch(e){if(tools?.length&&/HTTP 400|HTTP 422/.test(e.message))throw Error(e.message+'\n本轮包含本地工具定义，请确认所选模型及服务已启用兼容的工具调用。');throw e;}
 let data;try{data=JSON.parse(await response.text());}catch{throw Error('模型返回了无效的非流式消息');}
 if(data?.error)throw Error('模型流返回错误，请重试。');
 const choice=data.choices?.[0]||{},message=choice.message||{};
 const text=textValue(message.content),reasoningContent=textValue(message.reasoning_content??message.reasoning??message.thinking);
 const toolCalls=parseToolMessages(message.tool_calls);
 const finishReason=choice.finish_reason||null;
 validateToolCalls(toolCalls,true,finishReason);
 return {text,reasoningContent,toolCalls,usage:data.usage||null,usageIncomplete:!data.usage};
}

export async function streamChat(settings,key,messages,signal,onDelta,tools){
 const body={model:settings.model,messages,stream:true,stream_options:{include_usage:true},temperature:settings.temperature,max_tokens:settings.maxTokens,...(tools?.length?{tools,tool_choice:'auto'}:{})};
 let response;try{({response}=await modelRequest(settings,key,'chat/completions',body,signal));}catch(e){if(tools?.length&&/HTTP 400|HTTP 422/.test(e.message))throw Error(e.message+'\n本轮包含本地工具定义，请确认所选模型及服务已启用兼容的工具调用。');throw e;}
 const reader=response.body.getReader(),decoder=new TextDecoder(),calls=new Map();let buffer='',text='',reasoningContent='',usage=null,finished=false,finishReason=null;
 function line(raw){
  const value=raw.trim();if(!value.startsWith('data:'))return;const data=value.slice(5).trim();if(data==='[DONE]'){finished=true;return;}
  let v;try{v=JSON.parse(data);}catch{throw Error('模型返回了无效的流式消息');}
  if(v.error)throw Error('模型流返回错误，请重试。');if(v.usage)usage=v.usage;
  const choice=v.choices?.[0],delta=choice?.delta||choice?.message||{};
  if(choice?.finish_reason){finishReason=choice.finish_reason;finished=true;}
  const chunk=textValue(delta.content);if(chunk){text+=chunk;if(text.length>1_000_000)throw Error('模型回复超出限制');onDelta(chunk);}
  const reasoning=textValue(delta.reasoning_content??delta.reasoning??delta.thinking);if(reasoning){reasoningContent+=reasoning;if(reasoningContent.length>200000)throw Error('模型推理内容超过限制');}
  for(const part of delta.tool_calls||[])addToolCall(calls,part);
 }
 try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});if(buffer.length>2_000_000)throw Error('模型流式数据超出限制');let i;while((i=buffer.indexOf('\n'))>=0){line(buffer.slice(0,i));buffer=buffer.slice(i+1);}}buffer+=decoder.decode();if(buffer.trim())line(buffer);}finally{await reader.cancel().catch(()=>{});}
 const toolCalls=completeToolCalls(calls);validateToolCalls(toolCalls,finished,finishReason);
 if(text||toolCalls.length)return {text,usage,usageIncomplete:!usage,toolCalls,reasoningContent};

 // 部分 vLLM/网关在思考模型上会结束一个空的 SSE 流，但非流式接口能正常
 // 返回 message.content 或 tool_calls。只在空流时重试一次，避免重复正常请求。
 let fallback;
 try{fallback=await nonStreamingFallback(settings,key,messages,signal,tools);}catch(e){
  if(reasoningContent)throw Error('模型只返回了思考过程，没有生成最终答复；请提高最大输出 Token，或切换到非思考模型。');
  throw e;
 }
 if(fallback.text)onDelta(fallback.text);
 if(!fallback.text&&!fallback.toolCalls.length){
  if(reasoningContent||fallback.reasoningContent)throw Error('模型只返回了思考过程，没有生成最终答复；请提高最大输出 Token，或切换到非思考模型。');
  throw Error('模型未返回回复或工具调用');
 }
 return fallback;
}
