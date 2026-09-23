import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

/** Bridge to the original SW 审计工具箱 MCP stdio server. */
export class LegacyMcpClient {
  constructor({executable, workDir, restrictedModules=[]}={}) {
    const candidates=[executable,process.env.SW_AUDIT_TOOLBOX_EXE,path.resolve(process.cwd(),'..','SW审计工具箱','sw audit tool box.exe'),process.env.USERPROFILE&&path.join(process.env.USERPROFILE,'Desktop','SW审计工具箱','sw audit tool box.exe')].filter(Boolean);
    this.executable = candidates.find(p=>fs.existsSync(p)) || candidates[0] || path.resolve(process.cwd(),'..','SW审计工具箱','sw audit tool box.exe');
    this.workDir = path.resolve(workDir || process.cwd());
    this.restrictedModules = restrictedModules;
    this.child = null; this.nextId = 1; this.pending = new Map(); this.buffer = ''; this.tools = [];
  }
  available() { return fs.existsSync(this.executable); }
  async start() {
    if (this.child) return this;
    if (!this.available()) throw new Error(`未找到原版 MCP 工具箱：${this.executable}`);
    fs.mkdirSync(this.workDir,{recursive:true});
    const args=['--mcp-server','--work-dir',this.workDir,'--restricted-modules',JSON.stringify(this.restrictedModules)];
    const home=path.join(this.workDir,'.legacy-home'); fs.mkdirSync(home,{recursive:true});
    this.child=spawn(this.executable,args,{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,HOME:home,USERPROFILE:home,PYTHONIOENCODING:'utf-8',PYTHONUTF8:'1'}});
    this.child.stdout.setEncoding('utf8'); this.child.stdout.on('data',d=>this.#onData(d));
    this.child.stderr.setEncoding('utf8'); this.child.stderr.on('data',d=>this.stderr=(this.stderr||'').concat(d).slice(-4000));
    this.child.on('error',e=>this.#fail(e)); this.child.on('exit',(code,signal)=>{if(this.child){this.#fail(new Error(`原版 MCP 服务已退出（${code??signal}）`));this.child=null;}});
    await this.#request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'ai-assistant',version:'0.1.0'}});
    this.#notify('notifications/initialized',{});
    const listed=await this.#request('tools/list',{}); this.tools=listed?.tools||[]; return this;
  }
  async listTools(){await this.start(); return this.tools;}
  async call(name,args={}) { await this.start(); if(!this.tools.some(t=>t.name===name)) throw new Error(`原版 MCP 工具不存在：${name}`); return this.#request('tools/call',{name,arguments:args}); }
  async close(){if(this.child){this.child.kill();this.child=null;}for(const [,p] of this.pending)p.reject(new Error('MCP 服务已关闭'));this.pending.clear();}
  #notify(method,params){this.child?.stdin.write(JSON.stringify({jsonrpc:'2.0',method,params})+'\n');}
  #request(method,params){return new Promise((resolve,reject)=>{const id=this.nextId++;this.pending.set(id,{resolve,reject,timer:setTimeout(()=>{this.pending.delete(id);reject(new Error(`MCP 请求超时：${method}`));},120000)});try{this.child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n')}catch(e){this.pending.delete(id);reject(e)}})}
  #onData(data){this.buffer+=data;let i;while((i=this.buffer.indexOf('\n'))>=0){const line=this.buffer.slice(0,i).trim();this.buffer=this.buffer.slice(i+1);if(!line)continue;let msg;try{msg=JSON.parse(line)}catch{continue}if(msg.id===undefined)continue;const p=this.pending.get(msg.id);if(!p)continue;clearTimeout(p.timer);this.pending.delete(msg.id);if(msg.error)p.reject(new Error(msg.error.message||'MCP 调用失败'));else p.resolve(msg.result)}}
  #fail(error){for(const [,p] of this.pending){clearTimeout(p.timer);p.reject(error)}this.pending.clear()}
}
export function mcpToOpenAiTool(tool,prefix='legacy_') {
  const name=prefix+String(tool.name||'').replace(/[^A-Za-z0-9_-]/g,'_');
  return {type:'function',function:{name,description:`原版 MCP：${tool.description||tool.name}`,parameters:tool.inputSchema||{type:'object',properties:{},additionalProperties:true}}};
}
const pathKeys=/^(file|files|file_path|file_paths|config_file|config_files|work_dir|output_dir|output_path|template_dir|data_dir|result_file|this_year_file|last_year_file|gl_path|bank_path)$/i;
export function constrainMcpArgs(value,root,key='') {
  if(Array.isArray(value)) return value.map(v=>constrainMcpArgs(v,root,key));
  if(value&&typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,constrainMcpArgs(v,root,k)]));
  if(typeof value==='string'&&pathKeys.test(key)) {
    const resolved=path.resolve(root,value); if(!resolved.startsWith(root+path.sep)&&resolved!==root) throw new Error(`MCP 路径超出当前项目：${value}`); return resolved;
  }
  return value;
}
