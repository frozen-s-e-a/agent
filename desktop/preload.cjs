// 界面能用的桌面能力：调宿主命令、收流程事件、取拖入或选中文件的本机路径、选文件夹。
const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('auditDesktop', {
  invoke: (method, params) => ipcRenderer.invoke('audit:rpc', method, params),
  onEvent: (listener) => {
    const handler = (_event, value) => listener(value)
    ipcRenderer.on('audit:event', handler)
    return () => ipcRenderer.removeListener('audit:event', handler)
  },
  pathForFile: file => webUtils.getPathForFile(file),
  chooseFolder: title => ipcRenderer.invoke('audit:choose-folder', title),
})
