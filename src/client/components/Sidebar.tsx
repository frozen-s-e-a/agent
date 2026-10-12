import React, {useEffect, useRef, useState} from 'react';
import {Check, ChevronsUpDown, FolderPlus, Pencil, Plus, Search, Settings2, Sparkles, Trash2, X} from 'lucide-react';
import {shortTime, statusLabel, statusTone} from '../lib/format';
import type {AppSettings, Project, Session} from '../types';

interface Props {
  projects: Project[];
  project: Project;
  sessions: Session[];
  sessionId: string;
  settings: AppSettings;
  settingsOpen: boolean;
  onProject: (id: string) => void;
  onNewProject: () => void;
  onEditProject: () => void;
  onNewChat: () => void;
  onOpenSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (session: Session) => void;
  onSettings: () => void;
}

export function Sidebar(props: Props) {
  const {project, sessions, sessionId, settings, settingsOpen} = props;
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const visible = needle ? sessions.filter(item => item.title.toLowerCase().includes(needle)) : sessions;
  const modelReady = !!settings.baseUrl && !!settings.model;

  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark"><Sparkles size={15} /></span><strong>审计 Agent</strong></div>
    <ProjectSwitcher {...props} />
    <button className="button block new-chat" onClick={props.onNewChat}><Plus size={15} />新建对话</button>

    <nav className="conversations" aria-label="对话列表">
      <div className="conversations-head">
        <span>对话</span>
        <small>{sessions.length}</small>
      </div>
      {sessions.length > 6 && <label className="search">
        <Search size={14} />
        <input aria-label="搜索对话" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索对话" />
      </label>}
      <ul className="conversation-list">
        {visible.map(item => <ConversationRow
          key={item.id}
          session={item}
          active={item.id === sessionId && !settingsOpen}
          onOpen={() => props.onOpenSession(item.id)}
          onRename={title => props.onRenameSession(item.id, title)}
          onDelete={() => props.onDeleteSession(item)}
        />)}
      </ul>
      {!visible.length && <p className="muted empty">{sessions.length ? '没有匹配的对话。' : '还没有对话。'}</p>}
    </nav>

    <footer className="sidebar-foot">
      <button className={'settings-entry' + (settingsOpen ? ' active' : '')} aria-current={settingsOpen ? 'page' : undefined} aria-label="运行设置" onClick={props.onSettings}>
        <Settings2 size={16} />
        <span className="settings-entry-text">
          <span>运行设置</span>
          <small><i className={'dot tone-' + (modelReady ? 'success' : 'warning')} />{modelReady ? settings.model : '模型未配置'}</small>
        </span>
      </button>
    </footer>
  </aside>;
}

function ProjectSwitcher({projects, project, onProject, onNewProject, onEditProject}: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', close); };
  }, [open]);
  const pick = (action: () => void) => () => { setOpen(false); action(); };

  return <div className="project-switcher" ref={root}>
    <button className="project-current" aria-label="当前项目" aria-haspopup="menu" aria-expanded={open} title={project.root} onClick={() => setOpen(!open)}>
      <span className="project-avatar">{project.name.slice(0, 1)}</span>
      <span className="project-text"><strong>{project.name}</strong><small>{project.root}</small></span>
      <ChevronsUpDown size={14} />
    </button>
    {open && <div className="menu" role="menu" aria-label="切换项目">
      <div className="menu-label">项目</div>
      {projects.map(item => <button key={item.id} role="menuitemradio" aria-checked={item.id === project.id} className="menu-item" onClick={pick(() => onProject(item.id))}>
        <span className="project-avatar small">{item.name.slice(0, 1)}</span>
        <span className="menu-item-text">{item.name}</span>
        {item.id === project.id && <Check size={14} />}
      </button>)}
      <div className="menu-sep" />
      <button role="menuitem" className="menu-item" onClick={pick(onEditProject)}><Pencil size={14} /><span className="menu-item-text">管理当前项目</span></button>
      <button role="menuitem" className="menu-item" onClick={pick(onNewProject)}><FolderPlus size={14} /><span className="menu-item-text">新建项目</span></button>
    </div>}
  </div>;
}

function ConversationRow({session, active, onOpen, onRename, onDelete}: {session: Session; active: boolean; onOpen: () => void; onRename: (title: string) => void; onDelete: () => void}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(session.title);
  const status = session.streaming ? 'running' : session.agentStatus;
  const finish = (save: boolean) => {
    setEditing(false);
    if (save && title.trim() && title.trim() !== session.title) onRename(title.trim());
    else setTitle(session.title);
  };
  if (editing) return <li className="conversation-row editing">
    <input aria-label="对话名称" value={title} autoFocus onChange={event => setTitle(event.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={event => { if (event.key === 'Enter') finish(true); if (event.key === 'Escape') finish(false); }} />
    <button className="icon-button small" aria-label="取消改名" onMouseDown={event => event.preventDefault()} onClick={() => finish(false)}><X size={13} /></button>
  </li>;
  return <li className={'conversation-row agent-history-row' + (active ? ' active' : '')}>
    <button className="conversation-open" aria-current={active ? 'page' : undefined} onClick={onOpen} onDoubleClick={() => setEditing(true)}>
      <i className={'dot tone-' + statusTone(status)} title={session.streaming ? '正在处理' : statusLabel(status) || '尚未执行'} />
      <span className="conversation-title">{session.title}</span>
      <small>{shortTime(session.updatedAt || session.createdAt).split(' ')[0]}</small>
    </button>
    <span className="conversation-actions">
      <button className="icon-button small" aria-label={`重命名 ${session.title}`} title="重命名" onClick={() => { setTitle(session.title); setEditing(true); }}><Pencil size={13} /></button>
      <button className="icon-button small" aria-label={`删除 ${session.title}`} title="删除" disabled={session.streaming} onClick={onDelete}><Trash2 size={13} /></button>
    </span>
  </li>;
}
