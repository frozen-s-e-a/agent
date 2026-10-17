import http from 'node:http';

// A declared fixture for trying the desktop workflow without credentials.
// This is not the production intent router described by G03.
export async function demoProvider({delayMs=0}={}) {
  const requests=[];
  const server=http.createServer(async(req,res)=>{
    if(req.method==='GET'&&req.url.endsWith('/models')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:[{id:'offline-demo'}]}));return;}
    if(req.method!=='POST'||!req.url.endsWith('/chat/completions')){res.writeHead(404);res.end();return;}
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2_000_000){res.writeHead(413);res.end();return;}}
    const body=JSON.parse(raw);requests.push({model:body.model,messageCount:body.messages?.length});
    if(delayMs)await new Promise(resolve=>setTimeout(resolve,delayMs));
    if(body.stream===false){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:'OK'},finish_reason:'stop'}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}));return;}
    res.setHeader('Content-Type','text/event-stream');const emit=value=>res.write('data: '+JSON.stringify(value)+'\n\n');
    const lastUser=body.messages.findLastIndex(message=>message.role==='user'),current=body.messages.slice(lastUser+1),allResults=current.filter(message=>message.role==='tool').map(message=>JSON.parse(message.content)),results=allResults.filter(result=>!result.resolvedQuestions);
    const stateText=body.messages.find(message=>message.role==='system'&&typeof message.content==='string'&&message.content.startsWith('以下为应用从持久化记录重建的当前任务状态。'))?.content;
    const pending=stateText?JSON.parse(stateText.slice(stateText.indexOf('\n')+1)).questions || []:[];
    const requestText=body.messages[lastUser]?.content,fullText=typeof requestText==='string'?requestText:requestText?.[0]?.text || '';
    // The application's appended file scope is data, not part of the user's intent.
    const text=fullText.split('\n当前资料范围（数据）：')[0];
    let call,reply='';
    const balance=/借贷|平衡|差异/.test(text),extract=/提取|选择.*列|五列|两列/.test(text),inventory=/清单|结构|资料/.test(text),retry=/重试|修复|失败/.test(text);
    if(!balance&&!extract&&!inventory&&!retry){call={name:'ask_user_questions',args:{questions:['离线体验支持：检查借贷平衡、提取指定列、检查资料结构。请描述其中一项；完整自由任务需要接入正式模型。']}};}
    else if(pending.length&&!allResults.some(result=>result.resolvedQuestions))call={name:'resolve_agent_questions',args:{ids:[...new Set(pending.map(question=>question.id))],resolution:'用户已说明受支持的离线处理任务：'+text}};
    else if(!results.length)call={name:'list_local_files',args:{source:'project'}};
    else if(!results[0].files?.some(file=>!file.directory)){call={name:'ask_user_questions',args:{questions:['当前项目根目录没有可处理的文件。请添加 CSV 或 Excel 文件，再告诉我要处理哪份资料。']}};}
    else if(results.length===1)call={name:'preview_local_file',args:{source:'project',file:results[0].files.find(file=>!file.directory).file,parameters:{headerRow:1}}};
    else if(results.length===2)call={name:'get_audit_tools',args:{}};
    else if(results.length===3){
      const preview=results[1],columns=preview.columns || preview.sheets?.[0]?.columns || [];
      const params=balance?{keys:'公司,凭证日期,凭证编号',debit:'借方金额',credit:'贷方金额',tolerance:'0.01'}:extract?{columns:columns.filter(column=>text.includes(column)).join(',')}:{};
      if(extract&&!params.columns)call={name:'ask_user_questions',args:{questions:['需要提取哪些列？实际列名为：'+columns.join('、')]}};
      else call={name:'run_audit_tool',args:{source:'project',tool:balance?'voucher_check':extract?'select_column':'file_inventory',files:[results[0].files.find(file=>!file.directory).file],parameters:params,mode:'auto'}};
    }else if(results.length===4&&results.at(-1).taskId)call={name:'get_task_result',args:{taskId:results.at(-1).taskId}};
    else {
      const result=results.at(-1);
      if(!result?.ok)reply='本次处理未完成：'+(result?.error || '请查看执行记录');
      else reply=`已实际执行完成。输入 ${result.inputRows ?? '已登记'} 行，输出 ${result.resultRows ?? '已登记'} 行。\n\n成果文件：\n`+(result.outputs || []).map(output=>'- '+output.name).join('\n')+'\n\n可以在下方预览或打开成果，展开执行记录查看资料来源。\n\n本机体验使用模拟模型，文件处理由真实审计程序执行。';
    }
    if(call){const id='demo-call-'+allResults.length;emit({choices:[{delta:{tool_calls:[{index:0,id,type:'function',function:{name:call.name,arguments:JSON.stringify(call.args)}}]},finish_reason:'tool_calls'}]});}
    else emit({choices:[{delta:{content:reply},finish_reason:'stop'}]});
    emit({choices:[],usage:{prompt_tokens:20,completion_tokens:5,total_tokens:25}});res.end('data: [DONE]\n\n');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {baseUrl:`http://127.0.0.1:${server.address().port}/v1`,requests,close:()=>{server.closeAllConnections();server.close();}};
}
