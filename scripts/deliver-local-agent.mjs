import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const target='C:/Users/Install/Desktop/ai助手',version='0.1.0-internal.5';const before=JSON.parse(fs.readFileSync('build/ui-polish-before.json','utf8'));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),files=[];
for(const dir of ['src','tests','scripts','docs'])for(const f of fs.readdirSync(dir,{recursive:true,withFileTypes:true}))if(f.isFile()&&!f.parentPath.includes('__pycache__'))files.push(path.join(f.parentPath,f.name));files.push('package.json','启动AI助手.cmd');
const changed=files.filter(f=>!before[f]||hash(f)!==before[f]),output='artifacts/test/windows-x64/'+version;
if(fs.existsSync(path.join(target,output)))throw Error('交付版本已存在，停止覆盖');
for(const f of changed){const dest=path.join(target,f);if(fs.existsSync(dest)&&hash(dest)!==hash(f)&&hash(dest)!==before[f])throw Error('目标已有其他修改，未覆盖：'+f);}
for(const f of changed){const dest=path.join(target,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(f,dest);}
fs.cpSync('build/client',path.join(target,'build/client'),{recursive:true});fs.cpSync(output,path.join(target,output),{recursive:true});
for(const name of ['09-soft-focus-notice.png','10-local-agent-result.png']){const dest=path.join(target,'artifacts/test-results/ui',name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join('artifacts/test-results/ui',name),dest);}
fs.appendFileSync(path.join(target,'README.md'),'\n\n### 自动本地处理与界面更新 · '+version+'\n\n已接通模型调用本地工具、等待真实执行结果并继续分析的流程，支持项目文件和已发送附件。输入框移除深色焦点外圈，提示在 3 秒后消失。请关闭旧窗口后重新打开“AI助手桌面版”。详见 [本地工具与界面更新](docs/界面与提示更新.md)。模型服务需要支持兼容工具调用。\n');
fs.writeFileSync(path.join(target,'artifacts/test-results/local-agent-delivery.json'),JSON.stringify({version,deliveredAt:new Date().toISOString(),files:changed.map(file=>({file,sha256:hash(file)})),validation:{nodeTests:16,pythonAttachmentStructureTests:4,packagedAgentAndNotices:true,packagedModelsAndAttachments:true,packagedLocalTool:true,realUserProviderUsed:false}},null,2));
for(const f of changed)if(hash(path.join(target,f))!==hash(f))throw Error('交付校验失败：'+f);
console.log(JSON.stringify({delivered:true,version,changedFiles:changed.length,executable:path.join(target,output,'AI助手/AI助手.exe')}));
