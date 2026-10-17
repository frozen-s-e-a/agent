const {contextBridge,ipcRenderer}=require('electron');

contextBridge.exposeInMainWorld('audit',{desktop:true,invoke:(method,payload)=>ipcRenderer.invoke('audit:invoke',method,payload)});
