import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const target='C:/Users/Install/Desktop/ai助手';const before=JSON.parse(fs.readFileSync('build/desktop-before.json','utf8'));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const files=[];
for(const dir of ['src','tests','scripts','docs'])for(const f of fs.readdirSync(dir,{recursive:true,withFileTypes:true}))if(f.isFile())files.push(path.join(f.parentPath,f.name));
files.push('package.json','启动AI助手.cmd');
const changed=files.filter(f=>!before[f]||hash(f)!==before[f]);
for(const f of changed){const dest=path.join(target,f);if(fs.existsSync(dest)&&hash(dest)!==hash(f)&&hash(dest)!==before[f])throw Error('目标文件有其他修改，未覆盖：'+f);}
const retired='src/host/server.mjs';const oldKey=Object.keys(before).find(k=>k.replaceAll('\\','/')===retired);const retiredTarget=path.join(target,retired);
if(fs.existsSync(retiredTarget)&&hash(retiredTarget)!==before[oldKey])throw Error('旧后台文件已有其他修改');
for(const f of changed){const dest=path.join(target,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(f,dest);}
if(fs.existsSync(retiredTarget))fs.unlinkSync(retiredTarget);
fs.cpSync('build/client',path.join(target,'build/client'),{recursive:true});
const output='artifacts/test/windows-x64/0.1.0-internal.3';if(fs.existsSync(path.join(target,output)))throw Error('交付版本已存在，停止覆盖');fs.cpSync(output,path.join(target,output),{recursive:true});
const readme=path.join(target,'README.md');fs.writeFileSync(readme,fs.readFileSync(readme,'utf8').replaceAll('0.1.0-internal.2','0.1.0-internal.3')+'\n\n### 桌面版更新\n\n已调整为 Windows 桌面专用应用，双击桌面或本目录的“AI助手桌面版”快捷方式启动。直接加载本地界面，后台用管道通信，不启动网页服务。详见 [桌面版更新](docs/桌面版更新.md)。\n');
console.log('Desktop files delivered: '+changed.length);
