import React, {useEffect, useState} from 'react';
import {api} from './api';
import type {Boot} from './types';

export function Settings({boot,onRefresh,onError,onNotice}:{boot:Boot;onRefresh:()=>Promise<Boot>;onError:(e:unknown)=>void;onNotice:(s:string)=>void}) {
 const [config,setConfig]=useState({...boot.settings});
 const [key,setKey]=useState(''),[cookies,setCookies]=useState(''),[busy,setBusy]=useState(false);
 const [runtime,setRuntime]=useState<any>(),[message,setMessage]=useState(''),[loggingIn,setLoggingIn]=useState(false),[advanced,setAdvanced]=useState(false);
 useEffect(()=>{api('runtime.status').then(setRuntime).catch(onError);},[]);
 useEffect(()=>{if(!loggingIn)return;const timer=window.setInterval(async()=>{try{const status=await api('service.cicpa.loginStatus');if(status.state!=='waiting'){setMessage(status.message);setLoggingIn(false);await onRefresh();}}catch(e){setLoggingIn(false);onError(e);}},2000);return()=>window.clearInterval(timer);},[loggingIn]);
 const perform=async(fn:()=>Promise<void>)=>{setBusy(true);setMessage('');try{await fn();}catch(e:any){setMessage(e.message);onError(e);}finally{setBusy(false);}};
 const save=()=>perform(async()=>{
  if(cookies.trim())JSON.parse(cookies);
  await api('settings.save',config);
  if(key.trim()){await api('secret.save',{key});setKey('');}
  if(cookies.trim()){await api('secret.cicpa.save',{cookies});setCookies('');}
  await onRefresh();onNotice('模型服务与授权已保存');
 });
 return <div className="settings-layout">
  <section className="workspace-card">
   <h2>模型服务与查询授权</h2>
   <p>AI 提取使用文本或视觉模型，工商查询使用注协登录授权。</p>
   <div className="settings-fields">
    <label>API 地址<input value={config.baseUrl} onChange={e=>setConfig({...config,baseUrl:e.target.value})}/></label>
    <label>文本模型<input value={config.model} onChange={e=>setConfig({...config,model:e.target.value})}/></label>
    <label>视觉模型<input value={config.visionModel||''} onChange={e=>setConfig({...config,visionModel:e.target.value})} placeholder="用于图片和扫描件"/></label>
    <label>API 密钥<input type="password" autoComplete="new-password" value={key} onChange={e=>setKey(e.target.value)} placeholder={boot.settings.hasKey?'已保存，留空保留':'输入密钥'}/></label>
    <label>默认执行方式<select value={config.defaultMode||'auto'} onChange={e=>setConfig({...config,defaultMode:e.target.value})}><option value="auto">自动选择</option><option value="local-light">本地轻量</option><option value="local-batch">本地批量</option></select></label>
   </div>
   <div className="settings-authorization"><strong>注协工商资料</strong><p>{boot.settings.hasCicpaCookies?'已保存登录授权，可检查有效性。':'通过官网登录后自动保存授权，用于工商查询、资料导出和在线股权穿透。'}</p><button disabled={busy||loggingIn} onClick={()=>perform(async()=>{await api('service.cicpa.login');setLoggingIn(true);setMessage('请在注协官网窗口完成登录。');})}>{loggingIn?'等待官网登录…':boot.settings.hasCicpaCookies?'重新登录注协':'登录注协'}</button></div>
   <p className="helper">密钥和注协授权使用系统加密保存在本机，不写入项目成果或任务参数。</p>
   <div className="settings-actions">
    <button className="primary" disabled={busy} onClick={save}>保存设置</button>
    <button disabled={busy} onClick={()=>perform(async()=>{const r=await api('connection.test',{settings:config,key:key||undefined});setMessage('模型连接测试完成：'+JSON.stringify(r));})}>测试模型连接</button>
    <button disabled={busy} onClick={()=>perform(async()=>{if(cookies.trim()){await api('secret.cicpa.save',{cookies});setCookies('');await onRefresh();}const r=await api('service.cicpa.test');setMessage(r.message);})}>检查注协授权</button>
    <button disabled={busy} onClick={()=>perform(async()=>{const r=await api('models.list',{settings:config,key:key||undefined});setMessage('可用模型：'+JSON.stringify(r));})}>查看模型</button>
   </div>
   <button className="advanced-toggle" onClick={()=>setAdvanced(!advanced)}>{advanced?'收起':'展开'}高级授权导入</button>
   {advanced&&<label>导入已有会话（可选）<input type="password" autoComplete="new-password" value={cookies} onChange={e=>setCookies(e.target.value)} placeholder="仅用于导入已有 Cookie JSON；通常使用官网登录即可"/></label>}
   {message&&<p role="status" className="settings-feedback">{message}</p>}
  </section>
  <section className="workspace-card">
   <h2>运行环境</h2>
   {runtime?<div className="runtime-list">
    <div><strong>审计处理器</strong><span>{runtime.mcpAvailable?'随程序内置':'运行库缺失，请重新安装程序包'}</span><small>63 项审计任务使用独立运行时。</small></div>
    <div><strong>Microsoft Excel</strong><span>{runtime.excel?'已找到 Excel':'未检测到标准安装位置'}</span><small>用于打开成果及重算底稿公式。</small></div>
    <div><strong>工作流规范</strong><span>已加载 {runtime.skills.length} 项规范</span><small>在各业务阶段查看处理要求和复核要点。</small></div>
    <div><strong>当前版本</strong><span>{boot.version}</span><small>{boot.build&&new Date(boot.build).toLocaleString('zh-CN')}</small></div>
   </div>:<p>正在检查运行环境…</p>}
  </section>
 </div>;
}
