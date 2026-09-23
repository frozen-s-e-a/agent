import fs from 'node:fs';
import {McpStdioClient} from './client.mjs';

/** Bridge for the frozen original application. The original executable must expose MCP over stdio. */
export async function connectOriginalBridge({executable,workdir,args=['--mcp-stdio'],timeoutMs=8000}={}){
  if(!executable||!fs.existsSync(executable)) throw new Error('找不到原版可执行文件');
  const client=new McpStdioClient({command:executable,args,cwd:workdir,timeoutMs});
  try { await client.connect(); const tools=await client.listTools(); return {client,tools,mode:'stdio'}; }
  catch(error){ client.close(); throw new Error(`原版程序未暴露 MCP stdio 接口：${error.message}`); }
}
