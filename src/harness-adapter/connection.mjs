const LOCAL=/^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;
export function normalizeBase(value){
 let url;try{url=new URL(String(value||'').trim());}catch{throw Error('服务地址无效，请填写完整的 https://… 或本机/内网 http://… 地址。');}
 if(url.username||url.password||url.search||url.hash)throw Error('服务地址不能包含账号、密钥、查询参数或 # 片段；请把密钥填入 API 密钥栏。');
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&LOCAL.test(url.hostname)))throw Error('公网模型服务须使用 HTTPS；本机和受信任内网地址可使用 HTTP。');
 url.pathname=url.pathname.replace(/\/+$/,'').replace(/\/(chat\/completions|models)$/,'');return url.href.replace(/\/$/,'');
}
export function normalizeKey(value){const key=String(value||'').trim().replace(/^Bearer\s+/i,'').trim();if(/[\r\n]/.test(key))throw Error('API 密钥包含换行，请重新粘贴完整密钥。');return key;}
export function describeHttp(status,detail=''){
 const help=({401:'身份验证失败：请检查 API 密钥是否完整、是否属于当前服务地址，以及是否已过期。',403:'访问被拒绝：服务已拒绝当前请求，请检查模型授权、账号权限、IP 白名单或网关策略；仅更换模型名未必能解决。',404:'接口或模型不存在：检查服务地址是否需要 /v1，以及模型名称是否与服务端一致。',405:'当前地址不接受此请求，请填写 API 基础地址，而不是网页登录地址。',429:'请求限流或余额/配额不足，请检查服务额度，稍后重试。',400:'模型不接受当前请求参数或输入类型；图片需要选择支持视觉的模型。',413:'请求过大，请减少附件数量或图片大小。'})[status]||'模型服务返回错误，请检查服务状态与接口配置。';
 return `HTTP ${status} · ${help}`+(detail?`\n服务提示：${detail}`:'');
}
async function errorDetail(response,key){
 let text='';try{const r=response.body.getReader();const first=await r.read();await r.cancel();const raw=new TextDecoder().decode(first.value||new Uint8Array()).slice(0,4096);const v=JSON.parse(raw);text=String(v.error?.message||v.message||'');}catch{}
 if(key)text=text.split(key).join('[已隐藏]');return text.replace(/Bearer\s+[^\s"']+/gi,'Bearer [已隐藏]').replace(/sk-[\w-]+/g,'[已隐藏]').replace(/[\x00-\x1f]/g,' ').slice(0,300);
}
export async function modelRequest(settings,key,endpoint,body,signal){
 const base=normalizeBase(settings.baseUrl);key=normalizeKey(key);const root=new URL(base).pathname.replace(/\/$/,'');const bases=root===''?[base,base+'/v1']:[base];
 for(let i=0;i<bases.length;i++){
  let response;try{response=await fetch(bases[i]+'/'+endpoint,{method:body?'POST':'GET',headers:{...(key?{Authorization:'Bearer '+key}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal,redirect:'error'});}
  catch(e){if(signal?.aborted)throw e;const code=e.cause?.code;throw Error(code==='ENOTFOUND'?'无法解析服务地址，请检查域名和网络。':code==='ECONNREFUSED'?'无法连接模型服务，请检查端口和服务是否启动。':'无法连接模型服务，请检查网络、代理、证书和服务地址。');}
  if(!response.ok){if([404,405].includes(response.status)&&i+1<bases.length){await response.body?.cancel();continue;}throw Error(describeHttp(response.status,await errorDetail(response,key)));}
  return {response,baseUrl:bases[i]};
 }
}
async function jsonResponse(response){
 const reader=response.body.getReader();let text='';const decoder=new TextDecoder();while(true){const {value,done}=await reader.read();if(done)break;text+=decoder.decode(value,{stream:true});if(text.length>1_000_000){await reader.cancel();throw Error('模型服务返回的数据超过限制');}}
 try{return JSON.parse(text);}catch{throw Error('服务返回了非 JSON 内容；请确认填写的是 API 地址，而不是网页或登录页。');}
}
export async function listModels(settings,key){
 const signal=AbortSignal.timeout(20000);try{const {response,baseUrl}=await modelRequest(settings,key,'models',null,signal);const data=await jsonResponse(response);if(!Array.isArray(data.data))throw Error('服务未返回兼容的模型列表；可以手动填写模型名称。');const models=[...new Set(data.data.map(m=>m.id).filter(x=>typeof x==='string'&&x.length<=256))].slice(0,2000);if(!models.length)throw Error('服务返回了空模型列表，请检查账号的模型权限。');return {models,baseUrl,count:models.length};}catch(e){if(signal.aborted)throw Error('获取模型列表超时（20 秒），请检查连接。');throw e;}
}
export async function testConnection(settings,key){
 if(!String(settings.model||'').trim())throw Error('请先获取并选择模型，或手动填写模型名称。');const started=Date.now(),signal=AbortSignal.timeout(20000);
 try{const {response,baseUrl}=await modelRequest(settings,key,'chat/completions',{model:settings.model,messages:[{role:'user',content:'Reply with OK.'}],max_tokens:32,stream:false},signal);const data=await jsonResponse(response);if(!data.choices?.[0]?.message)throw Error('接口可达，但没有返回兼容的对话结果。');return {ok:true,baseUrl,model:data.model||settings.model,latencyMs:Date.now()-started,reply:String(data.choices[0].message.content||'').slice(0,200),usage:data.usage||null};}catch(e){if(signal.aborted)throw Error('连接测试超时（20 秒），请检查服务状态或模型加载情况。');throw e;}
}
