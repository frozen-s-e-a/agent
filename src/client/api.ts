declare global {interface Window {audit?:{desktop:boolean;invoke:(method:string,payload?:unknown)=>Promise<any>}}}
export const desktop=!!window.audit?.desktop;
export async function api(method:string,payload:unknown={}):Promise<any>{
 if(!window.audit?.desktop)throw Error('请双击 AI助手桌面版 启动应用。此界面仅在桌面程序内运行。');
 return window.audit.invoke(method,payload);
}
