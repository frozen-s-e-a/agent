import fs from 'node:fs';
let s=fs.readFileSync('src/host/service.mjs','utf8');
function change(a,b){if(!s.includes(a))throw Error('Missing service anchor');s=s.replace(a,b);}
change("const attachments=new Attachments(store);","const attachments=new Attachments(store);let closed=false;");
change("const history=events.filter(e=>['user','assistant'].includes(e.type)).slice(-20).map(e=>({role:e.type,content:events.find(c=>c.type==='attachment-context'&&c.userEventId===e.id)?.text||e.text}));","const failed=new Set(events.filter(e=>e.type==='error').map(e=>e.userEventId));const historyEvents=events.filter(e=>['user','assistant'].includes(e.type)&&!failed.has(e.id)).slice(-20);const history=historyEvents.map(e=>({role:e.type,content:events.find(c=>c.type==='attachment-context'&&c.userEventId===e.id)?.text||e.text}));");
change(".then(async built=>{if(items.length)",".then(async built=>{if(closed||controller.signal.aborted)throw Error('已停止生成');let budget=6-built.imageCount;for(let i=history.length-1;i>=0;i--){if(historyEvents[i].attachments?.length){const images=await attachments.historyImages(s.id,historyEvents[i].attachments,history[i].content,budget);history[i].content=images.content;budget-=images.count;}}if(items.length)");
change("store.append(s.id,{type:'assistant',...r,model:","if(!closed)store.append(s.id,{type:'assistant',...r,model:");
change(".catch(e=>{for(const a of items)",".catch(e=>{if(closed)return;for(const a of items)");
change("{type:'error',text:controller.signal.aborted?","{type:'error',userEventId:user.id,text:controller.signal.aborted?");
change("close:()=>{scheduler.stop();","close:()=>{closed=true;scheduler.stop();");
fs.writeFileSync('src/host/service.mjs',s);
let ui=fs.readFileSync('src/client/ModelSettings.tsx','utf8');ui=ui.replace('<input aria-label={\'手动填写\'+label}',"<details className=\"manual-model\"><summary>手动填写模型名称</summary><input aria-label={'手动填写'+label}").replace("onChange={e=>change(field,e.target.value)}/></div>","onChange={e=>change(field,e.target.value)}/></details></div>");fs.writeFileSync('src/client/ModelSettings.tsx',ui);
fs.appendFileSync('src/client/style.css','\n.manual-model{font-size:11px;color:#72877a}.manual-model summary{cursor:pointer;margin:8px 0}.manual-model input{margin:0!important}\n');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));pkg.version='0.1.0-internal.4';fs.writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n');
fs.writeFileSync('启动AI助手.cmd',fs.readFileSync('启动AI助手.cmd','utf8').replaceAll('0.1.0-internal.3','0.1.0-internal.4'));
