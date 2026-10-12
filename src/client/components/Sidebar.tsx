import React from 'react';
import {Bot, FolderPlus, History, Plus, Settings2, Sparkles} from 'lucide-react';
import type {Boot, Project} from '../types';

export type View = 'chat' | 'settings' | 'project';

interface Props {
  boot: Boot;
  project?: Project;
  sessionCount?: number;
  view?: View;
  historyOpen?: boolean;
  busy?: boolean;
  onProject?: (id: string) => void;
  onNewChat?: () => void;
  onView?: (view: View) => void;
  onToggleHistory?: () => void;
}

export function Sidebar({boot, project, sessionCount = 0, view, historyOpen, busy, onProject, onNewChat, onView, onToggleHistory}: Props) {
  const chatActive = view === 'chat' && !historyOpen;
  const settingsActive = view === 'settings' && !historyOpen;
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><strong>审计 Agent</strong></div>
    {project && onProject ? <>
      <label className="field sidebar-project">
        <span>当前项目</span>
        <select aria-label="当前项目" disabled={busy} value={project.id} onChange={event => onProject(event.target.value)}>
          {boot.projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <button className="button primary block" disabled={busy} onClick={onNewChat}><Plus size={16} />新建对话</button>
      <nav className="nav" aria-label="主导航">
        <button className={chatActive ? 'active' : ''} aria-current={chatActive ? 'page' : undefined} onClick={() => onView?.('chat')}><Bot size={17} />任务对话</button>
        <button className={historyOpen ? 'active' : ''} aria-expanded={!!historyOpen} onClick={onToggleHistory}><History size={17} />历史对话<span className="nav-count">{sessionCount}</span></button>
        <button className={settingsActive ? 'active' : ''} aria-current={settingsActive ? 'page' : undefined} onClick={() => onView?.('settings')}><Settings2 size={17} />运行设置</button>
        <button className={view === 'project' ? 'active' : ''} onClick={() => onView?.('project')}><FolderPlus size={17} />添加项目</button>
      </nav>
    </> : <p className="sidebar-note">用自然语言下任务，程序负责执行、核对与留痕。</p>}
    <footer className="sidebar-foot"><span>本机测试版</span><small>{boot.version}</small></footer>
  </aside>;
}
