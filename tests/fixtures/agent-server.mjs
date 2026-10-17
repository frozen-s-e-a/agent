import http from 'node:http';
export async function agentServer({source='project',operation='inspect',failOnce=false}={}){
 const requests=[];const server=http.createServer(async(req,res)=>{let raw='';for await(const b of req)raw+=b;const body=JSON.parse(raw);requests.push(body);res.setHeader('Content-Type','text/event-stream');const emit=v=>res.write('data: '+JSON.stringify(v)+'\n\n');
  const results=body.messages.filter(m=>m.role==='tool').map(m=>JSON.parse(m.content));let call;
  if(!results.length)call={name:'list_local_files',args:{source}};
  else if(results.length===1){const file=results[0].files.find(f=>!f.directory);call={name:'preview_local_file',args:{source,file:file.file,parameters:{headerRow:1}}};}
  else if(results.length===2)call={name:'get_audit_tools',args:{}};
  else if(results.length===3)call={name:'run_audit_tool',args:{source,tool:operation,files:[results[0].files.find(f=>!f.directory).file],parameters:operation==='select_column'?{columns:failOnce?'不存在的列':'客户,余额'}:{},mode:'auto'}};
  else if(failOnce&&results.length===4)call={name:'run_audit_tool',args:{source,tool:operation,files:[results[0].files.find(f=>!f.directory).file],parameters:{columns:'客户,余额'},mode:'auto'}};
  else if(results.length===(failOnce?5:4))call={name:'get_task_result',args:{taskId:results.at(-1).taskId}};
  if(call){const args=JSON.stringify(call.args),id='local-call-'+results.length;emit({choices:[{delta:{reasoning_content:'需要以真实工具结果为依据。',tool_calls:[{index:0,id,type:'function',function:{name:call.name,arguments:args.slice(0,9)}}]}}]});emit({choices:[{delta:{tool_calls:[{index:0,function:{arguments:args.slice(9)}}]},finish_reason:'tool_calls'}]});}
  else{const result=results.at(-1);emit({choices:[{delta:{content:result.ok?`已实际处理 ${result.inputRows} 行，结果文件已生成。`:'工具失败：'+result.error},finish_reason:'stop'}]});}
  emit({choices:[],usage:{prompt_tokens:20,completion_tokens:5,total_tokens:25}});res.end('data: [DONE]\n\n');
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));return {requests,baseUrl:`http://127.0.0.1:${server.address().port}/v1`,close:()=>new Promise(r=>server.close(r))};
}
