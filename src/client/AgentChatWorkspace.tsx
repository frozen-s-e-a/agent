import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Bot, Check, ChevronRight, CircleStop, FilePlus2, FolderOpen, Loader2, Paperclip, Plus, Send, Settings2, Sparkles, X} from 'lucide-react';
import {api} from './api';
import {Settings} from './ServiceSettings';
import type {Boot, Project} from './types';
import './agent-chat.css';

type Props = {
  boot: Boot; initialProject?: Project; onRefresh: () => Promise<Boot>;
  onSelectProject: (project: Project) => void; onCreateProject: (name: string, root: string) => Promise<void>;
  onDemo: () => Promise<void>; onError: (value: unknown) => void; onNotice: (message: string) => void;
};
type SessionRecord = {id: string; projectId?: string | null; title: string; events: any[]; calls: any[]; tasks: any[]; attachments: any[]; turn?: string; phase?: string; streaming?: boolean; agentRuns?: any[]};
const active = (status?: string) => ['queued','running','cancelling'].includes(status || '');
const time = (value?: string) => value ? new Date(value).toLocaleString('zh-CN', {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'}) : '';

function Message({event, calls}: {event: any; calls: any[]}) {
  if (event.type === 'tool') {
    const call = calls.find(item => item.id === event.callId);
    return <div className="agent-tool-event"><span className={'agent-tool-dot ' + (call?.status || 'running')}><Bot size={14}/></span><span><strong>{call?.label || call?.name || '执行本地步骤'}</strong><small>{call?.status === 'running' ? '正在处理资料…' : call?.status === 'failed' ? '步骤失败，结果已保留' : '步骤完成，已记录实际结果'}</small></span>{call?.status === 'running' && <Loader2 size={15} className="agent-spin"/>}</div>;
  }
  if (event.type === 'error') return <div className="agent-message agent-message-error"><strong>这次处理没有完成</strong><p>{event.text}</p></div>;
  if (!['user','assistant'].includes(event.type)) return null;
  return <article className={'agent-message ' + event.type}>
    <div className="agent-avatar">{event.type === 'user' ? '你' : <Sparkles size={16}/>}</div>
    <div className="agent-bubble"><div className="agent-message-meta">{event.type === 'user' ? '任务要求' : '审计 Agent'}<time>{time(event.at)}</time></div><div className="agent-message-text">{event.text || (event.type === 'assistant' ? '已完成。' : '')}</div>{event.type === 'assistant' && event.toolCount > 0 && <small className="agent-evidence-note">已调用 {event.toolCount} 个本地步骤；计算结果和成果文件以执行记录为准。</small>}</div>
  </article>;
}

function NewProject({busy, onDemo, onCreate}: {busy: boolean; onDemo: () => Promise<void>; onCreate: (name: string, root: string) => Promise<void>}) {
  const [name, setName] = useState(''), [root, setRoot] = useState('');
  return <section className="agent-empty-project"><div className="agent-empty-mark"><FolderOpen size={26}/></div><h1>先把资料放进一个项目</h1><p>之后你只需要用自然语言说清楚想核查什么，Agent 会在项目范围内读取资料并执行可用的审计程序。</p><div className="agent-project-form"><input aria-label="项目名称" value={name} onChange={e => setName(e.target.value)} placeholder="项目名称，例如：华东制造 2026 年审"/><div className="agent-path-field"><input aria-label="资料目录" value={root} onChange={e => setRoot(e.target.value)} placeholder="资料目录路径"/><button onClick={async () => {const value = await api('choose.directory'); if(value) setRoot(value);}}>选择</button></div><div className="agent-empty-actions"><button onClick={() => onDemo()} disabled={busy}>打开示例项目</button><button className="primary" onClick={() => onCreate(name.trim(),root.trim())} disabled={busy || !name.trim() || !root.trim()}>建立项目</button></div></div></section>;
}

export function AgentChatWorkspace({boot,initialProject,onRefresh,onSelectProject,onCreateProject,onDemo,onError,onNotice}: Props) {
  const [project, setProject] = useState(initialProject), [sessionId, setSessionId] = useState(''), [record, setRecord] = useState<SessionRecord | null>(null);
  const [draft, setDraft] = useState(''), [busy, setBusy] = useState(false), [settingsOpen, setSettingsOpen] = useState(false), [historyOpen, setHistoryOpen] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]), [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => setProject(initialProject), [initialProject?.id]);
  const reload = useCallback(async (id = sessionId) => { if(!id) return null; const next = await api('session.get',{id}) as SessionRecord; setRecord(next); setAttachments(next.attachments || []); return next; }, [sessionId]);
  const openOrCreate = useCallback(async (nextProject?: Project) => {
    const selected = nextProject || project;
    if(!selected) {setSessionId('');setRecord(null);return;}
    const sessions = boot.sessions.filter(item => item.projectId === selected.id).sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    const existing = sessions.find(item => !item.workflow) || sessions[0];
    const session = existing || await api('session.create',{projectId:selected.id,title:'新对话'}) as any;
    setSessionId(session.id); await reload(session.id);
  }, [boot.sessions, project, reload]);
  useEffect(() => {openOrCreate().catch(onError);}, [project?.id]);
  useEffect(() => {if(!sessionId)return;const timer = window.setInterval(() => reload().catch(onError), record?.streaming || busy ? 650 : 1800);return () => window.clearInterval(timer);}, [sessionId,record?.streaming,busy,reload,onError]);
  useEffect(() => {const node=scrollRef.current;if(node)node.scrollTop=node.scrollHeight;}, [record?.events.length,record?.turn,record?.phase]);
  const send = async () => {
    const text = draft.trim(); if((!text && !attachments.length) || !sessionId || busy)return;
    setBusy(true);setDraft('');
    try {await api('chat.send',{sessionId,text,attachments:attachments.map(item => item.id)});setAttachments([]);await reload();onNotice('Agent 已开始处理，会在对话中报告进度和必要问题。');}
    catch(error){setDraft(text);onError(error);} finally {setBusy(false);}
  };
  const addAttachments = async () => {if(!sessionId)return;try{const result=await api('attachments.choose',{sessionId,kind:'files'});setAttachments(result.attachments || []);}catch(error){onError(error);}};
  const stop = async () => {if(sessionId)await api('chat.cancel',{sessionId});await reload();onNotice('已停止当前 Agent 回合，已完成的成果仍保留。');};
  const newChat = async () => {if(!project)return;const session=await api('session.create',{projectId:project.id,title:'新对话'});setSessionId(session.id);await reload(session.id);setDraft('');setHistoryOpen(false);};
  const chooseProject = async (id: string) => {const next=boot.projects.find(item=>item.id===id);if(next){setProject(next);onSelectProject(next);await openOrCreate(next);}};
  const sessions = useMemo(() => boot.sessions.filter(item => item.projectId===project?.id).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))), [boot.sessions,project?.id]);
  const calls = record?.calls || [];
  const activeTask = record?.tasks?.find(task => active(task.status));
  const visibleEvents = (record?.events || []).filter(event => event.type !== 'attachment-context');
  if(!project) return <div className="agent-shell"><aside className="agent-sidebar"><div className="agent-brand"><Sparkles size={20}/><strong>审计 Agent</strong></div><p className="agent-sidebar-note">用自然语言下任务，程序负责执行、核对与留痕。</p></aside><main className="agent-main"><NewProject busy={busy} onDemo={async()=>{await onDemo();await onRefresh();}} onCreate={async(name,root)=>{await onCreateProject(name,root);}}/></main></div>;
  return <div className="agent-shell">
    <aside className="agent-sidebar"><div className="agent-brand"><Sparkles size={20}/><strong>审计 Agent</strong></div><label className="agent-project-select"><span>当前项目</span><select aria-label="当前项目" value={project.id} onChange={e=>chooseProject(e.target.value)}>{boot.projects.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="agent-new-chat" onClick={newChat}><Plus size={16}/>新建对话</button><nav className="agent-nav"><button className="active"><Bot size={17}/>任务对话</button><button onClick={()=>setHistoryOpen(!historyOpen)}><FilePlus2 size={17}/>历史对话<span>{sessions.length}</span></button><button onClick={()=>setSettingsOpen(!settingsOpen)}><Settings2 size={17}/>运行设置</button></nav><div className="agent-sidebar-foot"><span>独立审计运行时</span><small>{boot.version}</small></div></aside>
    <main className="agent-main"><header className="agent-topbar"><div><span className="agent-eyebrow">{project.name}</span><h1>{record?.title || '审计任务对话'}</h1></div><div className="agent-top-actions"><span className={'agent-run-state ' + (record?.streaming ? 'running' : activeTask ? 'working' : '')}>{record?.streaming ? <><Loader2 size={14} className="agent-spin"/> Agent 正在处理</> : activeTask ? '本地步骤执行中' : '随时可以下达任务'}</span><button aria-label="新建对话" onClick={newChat}><Plus size={17}/></button></div></header>
      {historyOpen && <aside className="agent-history-panel"><div className="agent-panel-head"><strong>历史对话</strong><button aria-label="关闭历史对话" onClick={()=>setHistoryOpen(false)}><X size={16}/></button></div><input aria-label="搜索历史对话" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索对话"/>{sessions.filter(s=>s.title.toLowerCase().includes(query.toLowerCase())).map(s=><button key={s.id} className={'agent-history-row '+(s.id===sessionId?'selected':'')} onClick={async()=>{setSessionId(s.id);await reload(s.id);setHistoryOpen(false);}}><span>{s.title}</span><small>{time(s.updatedAt)}</small></button>)}</aside>}
      {settingsOpen ? <section className="agent-settings-panel"><div className="agent-panel-head"><div><strong>运行设置</strong><p>模型服务和授权只影响当前本机，不会写入项目成果。</p></div><button aria-label="关闭运行设置" onClick={()=>setSettingsOpen(false)}><X size={16}/></button></div><Settings boot={boot} onRefresh={onRefresh} onError={onError} onNotice={onNotice}/></section> : <>
        <div className="agent-chat-scroll" ref={scrollRef}>{!visibleEvents.length && !record?.streaming && <section className="agent-welcome"><div className="agent-welcome-mark"><Sparkles size={24}/></div><h2>这次想完成什么审计工作？</h2><p>直接说目标、资料范围和希望得到的成果。Agent 会先读取资料，再选择可用的独立审计程序；资料或关键口径不足时，会在这里集中提问。</p><div className="agent-suggestions"><button onClick={()=>setDraft('检查项目资料是否齐全，并列出缺失字段和需要补充的文件。')}>检查资料完整性</button><button onClick={()=>setDraft('分析本年度收入的月间波动，生成分析表并标出需要回查的异常。')}>分析月间波动</button><button onClick={()=>setDraft('核对银行流水和序时账，输出匹配结果、差异清单和未匹配记录。')}>核对银行与账簿</button></div></section>}{visibleEvents.map(event=><Message key={event.id} event={event} calls={calls}/>)}{record?.streaming && <div className="agent-live-response"><div className="agent-avatar"><Sparkles size={16}/></div><div><span>{record.phase || 'Agent 正在分析…'}</span>{record.turn && <p>{record.turn}</p>}</div></div>}{activeTask && <div className="agent-task-progress"><Loader2 size={16} className="agent-spin"/><span>{activeTask.phase || '独立审计程序正在执行…'}</span><small>成果写入完成后会回到当前对话。</small></div>}</div>
        <div className="agent-composer-wrap"><div className="agent-scope-line"><span><FolderOpen size={14}/>Agent 可读取：{project.name} 的项目资料</span><span>原文件不覆盖，成果另存</span></div>{attachments.length>0 && <div className="agent-attachments">{attachments.map(item=><span key={item.id}><Paperclip size={13}/>{item.name}<button aria-label={`移除 ${item.name}`} onClick={()=>api('attachments.remove',{sessionId,id:item.id}).then(value=>setAttachments(value)).catch(onError)}><X size={12}/></button></span>)}</div>}<div className="agent-composer"><button className="agent-icon-button" aria-label="添加资料" onClick={addAttachments} disabled={busy}><Paperclip size={19}/></button><textarea aria-label="任务输入" value={draft} disabled={busy} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder="例如：检查这些资料的收入确认风险，并生成异常清单…" rows={3}/>{record?.streaming || activeTask ? <button className="agent-stop" aria-label="停止当前处理" onClick={stop}><CircleStop size={19}/></button> : <button className="agent-send" aria-label="发送任务" onClick={send} disabled={!draft.trim()&&!attachments.length}><Send size={18}/></button>}</div><div className="agent-composer-help"><span>Enter 发送 · Shift + Enter 换行</span><span>Agent 会自动选择工作流并保留执行依据</span></div></div>
      </>}
    </main>
  </div>;
}
