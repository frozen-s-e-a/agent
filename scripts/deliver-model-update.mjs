import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const target='C:/Users/Install/Desktop/ai助手';const before=JSON.parse(fs.readFileSync('build/attachments-before.json','utf8'));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');const files=[];
for(const dir of ['src','tests','scripts','docs'])for(const f of fs.readdirSync(dir,{recursive:true,withFileTypes:true}))if(f.isFile()&&!f.parentPath.includes('__pycache__'))files.push(path.join(f.parentPath,f.name));
files.push('package.json','启动AI助手.cmd');const changed=files.filter(f=>!before[f]||hash(f)!==before[f]);
const output='artifacts/test/windows-x64/0.1.0-internal.4';if(fs.existsSync(path.join(target,output)))throw Error('目标版本已存在，停止覆盖');
for(const f of changed){const dest=path.join(target,f);if(fs.existsSync(dest)&&hash(dest)!==hash(f)&&hash(dest)!==before[f])throw Error('目标文件有其他修改，未覆盖：'+f);}
for(const f of changed){const dest=path.join(target,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(f,dest);}
fs.cpSync('build/client',path.join(target,'build/client'),{recursive:true});fs.cpSync(output,path.join(target,output),{recursive:true});
for(const name of ['06-model-settings.png','07-attachments-draft.png','08-attachments-sent.png']){const dest=path.join(target,'artifacts/test-results/ui',name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join('artifacts/test-results/ui',name),dest);}
const readme=path.join(target,'README.md');fs.appendFileSync(readme,'\n\n### 模型与附件更新 · 0.1.0-internal.4\n\n桌面版新增连接测试、模型获取及文本/视觉模型选择；对话支持切换模型和添加文件、文件夹、图片。关闭旧窗口后通过“AI助手桌面版”快捷方式打开新版。详见 [模型与附件更新](docs/模型与附件更新.md) 和 [使用说明](docs/使用说明.md)。\n');
const manifest={version:'0.1.0-internal.4',deliveredAt:new Date().toISOString(),changedFiles:changed.map(file=>({file,sha256:hash(file)})),validation:{nodeTests:9,attachmentPythonTests:3,packagedDesktop:true,packagedModelsAndAttachments:true,realProviderUsed:false}};
fs.writeFileSync(path.join(target,'artifacts/test-results/model-update-delivery.json'),JSON.stringify(manifest,null,2));
for(const f of changed)if(hash(path.join(target,f))!==hash(f))throw Error('交付文件校验失败：'+f);
console.log(JSON.stringify({delivered:true,files:changed.length,executable:path.join(target,output,'AI助手/AI助手.exe')}));
