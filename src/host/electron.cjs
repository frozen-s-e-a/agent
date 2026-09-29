const {app,BrowserWindow,ipcMain,dialog,shell,safeStorage,nativeImage,screen}=require('electron');
const {spawn,spawnSync}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
let win,host,requestId=0;const pending=new Map();const root=path.resolve(__dirname,'../..');
const dataDir=process.env.AUDIT_DATA_DIR||path.join(process.env.LOCALAPPDATA,'AuditAssistant');
// Keep Electron's profile beside the app data so the single-instance lock is
// created in the same writable location as the backend data.
app.setPath('userData',path.join(dataDir,'electron'));
function invoke(method,payload={}){return new Promise((resolve,reject)=>{
 if(!host||host.killed||!host.stdin.writable)return reject(Error('后台进程不可用，请重启应用'));
 const id=String(++requestId);const frame=JSON.stringify({id,method,payload})+'\n';if(Buffer.byteLength(frame)>2_000_000)return reject(Error('请求超过大小限制'));
 const timer=setTimeout(()=>{pending.delete(id);reject(Error('后台操作超时'));},30000);pending.set(id,{resolve,reject,timer});
 host.stdin.write(frame,error=>{if(error){clearTimeout(timer);pending.delete(id);reject(error);}});
});}
function rejectPending(){for(const r of pending.values()){clearTimeout(r.timer);r.reject(Error('后台进程已停止'));}pending.clear();}
app.setName('AI助手审计工具箱');app.setAppUserModelId('cn.auditassistant.desktop');
if(!app.requestSingleInstanceLock())app.quit();else{
 app.on('second-instance',()=>{if(win?.isMinimized())win.restore();win?.show();win?.focus();});
 app.whenReady().then(()=>{
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('no-sandbox');
  fs.mkdirSync(dataDir,{recursive:true});
  host=spawn(process.env.AUDIT_NODE||path.join(root,'runtime/node.exe'),[path.join(root,'src/host/stdio.mjs')],{cwd:root,windowsHide:true,env:{...process.env,AUDIT_DATA_DIR:dataDir},stdio:['pipe','pipe','pipe']});let buffer='';
  host.on('error',e=>{rejectPending();dialog.showErrorBox('启动失败',e.message);});host.stdin.on('error',()=>{});host.stderr.on('data',()=>{});host.stdout.setEncoding('utf8');
  const startup=setTimeout(()=>{dialog.showErrorBox('启动超时','后台未能正常启动，请关闭后重试。');app.quit();},20000);
  host.stdout.on('data',async chunk=>{
   buffer+=chunk;if(Buffer.byteLength(buffer)>8_000_000){host.kill();return;}let i;
   while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);let v;try{v=JSON.parse(line);}catch{continue;}
    if(v.type==='ready'){
     clearTimeout(startup);const secret=path.join(dataDir,'model-key.enc');if(fs.existsSync(secret)&&safeStorage.isEncryptionAvailable())try{await invoke('secret.set',{key:safeStorage.decryptString(fs.readFileSync(secret))});}catch{}
     const workArea=screen.getPrimaryDisplay().workAreaSize;
     const windowWidth=Math.min(1440,Math.max(1000,workArea.width-48));
     const windowHeight=Math.min(940,Math.max(700,workArea.height-48));
     win=new BrowserWindow({width:windowWidth,height:windowHeight,minWidth:1000,minHeight:700,show:false,backgroundColor:'#f8f9fc',title:'AI助手 · 桌面审计工作空间',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
     win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
     win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
     win.once('ready-to-show',()=>{win.maximize();win.show();});win.loadFile(path.join(root,'build/client/index.html')).catch(e=>dialog.showErrorBox('界面加载失败',e.message));
    }else if(v.id&&pending.has(v.id)){const r=pending.get(v.id);pending.delete(v.id);clearTimeout(r.timer);v.ok?r.resolve(v.result):r.reject(Error(v.error||'操作失败'));}
   }
  });
  host.on('exit',()=>{clearTimeout(startup);rejectPending();if(!app.isQuitting)dialog.showErrorBox('后台已停止','请重新打开应用。已保存的项目和对话会保留，未完成任务可重试。');});
 });
 const allowed=new Set(['bootstrap','project.create','session.create','session.get','session.rename','session.model','models.list','connection.test','attachments.list','attachments.remove','files.list','files.preview','demo.create','settings.save','task.run','task.cancel','task.retry','chat.send','chat.cancel','migration.get']);
 ipcMain.handle('audit:invoke',async(event,method,p={})=>{
  if(event.sender!==win?.webContents||event.senderFrame!==win.webContents.mainFrame||event.senderFrame.url!==pathToFileURL(path.join(root,'build/client/index.html')).href)throw Error('无效调用来源');
  if(method==='choose.directory'){const r=await dialog.showOpenDialog(win,{properties:['openDirectory','createDirectory']});return r.canceled?null:r.filePaths[0];}
  if(method==='attachments.choose'){await invoke('session.get',{id:p.sessionId});if(!['files','folder','images'].includes(p.kind))throw Error('附件类型无效');const r=await dialog.showOpenDialog(win,{title:p.kind==='folder'?'添加文件夹':p.kind==='images'?'添加图片':'添加文件',properties:p.kind==='folder'?['openDirectory']:['openFile','multiSelections'],...(p.kind==='images'?{filters:[{name:'图片',extensions:['png','jpg','jpeg','webp','gif']}]}:{})});return r.canceled?{attachments:[],warnings:[]}:invoke('attachments.import',{sessionId:p.sessionId,paths:r.filePaths});}
  if(method==='attachments.thumbnail'){const f=await invoke('attachments.path',p);if(f.kind!=='image')return null;const img=nativeImage.createFromPath(f.path);return img.isEmpty()?null:img.resize({width:120,height:90,quality:'good'}).toDataURL();}
  if(method==='secret.save'){if(!safeStorage.isEncryptionAvailable())throw Error('系统凭据加密不可用，密钥未保存');const key=String(p.key||'');fs.writeFileSync(path.join(dataDir,'model-key.enc'),safeStorage.encryptString(key));return invoke('secret.set',{key});}
  if(method==='result.open'){const target=await invoke('result.path',p);const error=await shell.openPath(target);if(error)throw Error(error);return true;}
  if(method==='link.open'){let url;try{url=new URL(p.url);}catch{throw Error('链接无效');}if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('不支持此链接类型');await shell.openExternal(url.href);return true;}
  if(!allowed.has(method))throw Error('未授权操作');return invoke(method,p);
 });
 app.on('window-all-closed',()=>app.quit());app.on('before-quit',()=>{app.isQuitting=true;rejectPending();if(host?.pid)spawnSync('taskkill',['/PID',String(host.pid),'/T','/F'],{windowsHide:true,stdio:'ignore',timeout:5000});});
}
