import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const target='C:/Users/Install/Desktop/ai助手',version='0.1.0-internal.6',before=JSON.parse(fs.readFileSync('build/inspect-before.json','utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),files=[];
for(const dir of ['src','tests','scripts','docs'])for(const f of fs.readdirSync(dir,{recursive:true,withFileTypes:true}))if(f.isFile()&&!f.parentPath.includes('__pycache__'))files.push(path.join(f.parentPath,f.name));files.push('package.json','pnpm-lock.yaml','启动AI助手.cmd');const changed=files.filter(f=>!before[f]||hash(f)!==before[f]),output='artifacts/test/windows-x64/'+version;
if(fs.existsSync(path.join(target,output)))throw Error('交付版本已存在，停止覆盖');
for(const f of changed){const dest=path.join(target,f);if(fs.existsSync(dest)&&hash(dest)!==hash(f)&&hash(dest)!==before[f])throw Error('目标文件有其他修改，未覆盖：'+f);}
for(const f of changed){const dest=path.join(target,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(f,dest);}fs.cpSync('build/client',path.join(target,'build/client'),{recursive:true});fs.cpSync(output,path.join(target,output),{recursive:true});
fs.copyFileSync('artifacts/test-results/ui/11-markdown.png',path.join(target,'artifacts/test-results/ui/11-markdown.png'));
fs.appendFileSync(path.join(target,'README.md'),'\n\n### 工作簿结构与 Markdown · '+version+'\n\n修复空白首行和非规则底稿导致“查看数据结构”失败的问题，Excel 结构查看不再依赖首行表头。对话加入 Markdown 标题、列表、表格和代码块排版。已用报错底稿的本地副本验证 14 个工作表成功；原件未改变。关闭旧窗口后重新打开桌面快捷方式，原失败任务可点击重试。详见 [工作簿结构修复](docs/工作簿结构修复.md)。\n');
fs.writeFileSync(path.join(target,'artifacts/test-results/inspect-markdown-delivery.json'),JSON.stringify({version,deliveredAt:new Date().toISOString(),files:changed.map(file=>({file,sha256:hash(file)})),validation:{workerTests:25,attachmentTests:4,layoutRegressionTests:1,nodeTests:16,reportedWorkbook:{sheetCount:14,originalUnchanged:true,packagedDesktopPassed:true},packagedMarkdownPassed:true}},null,2));
for(const f of changed)if(hash(f)!==hash(path.join(target,f)))throw Error('交付校验失败：'+f);console.log(JSON.stringify({delivered:true,version,changedFiles:changed.length}));
