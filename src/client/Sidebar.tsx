import React from 'react';
import { Folder, Settings, Plus, Search, ChevronRight, Layers, ArrowUpRight, MessageSquare } from 'lucide-react';
import type { Project, Session, Boot } from './types';

interface SidebarProps {
  projects: Project[];
  sessions: Session[];
  activeProjectId: string | null;
  activeSessionId: string;
  page: string;
  boot: Boot | null;
  onNewChat: () => void;
  onNewStandalone: () => void;
  onSelectProject: (p: Project) => void;
  onSelectSession: (id: string) => void;
  onOpenProjectModal: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onShowMigration: () => void;
}

export function Sidebar({
  projects, sessions, activeProjectId, activeSessionId, page, boot,
  onNewChat, onNewStandalone, onSelectProject, onSelectSession,
  onOpenProjectModal, onOpenSearch, onOpenSettings, onShowMigration,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="brand">
        <div className="brand-mark"><Layers size={18}/></div>
        <div>
          <span className="brand-title">AI 助手</span>
          <span className="brand-subtitle">审计</span>
        </div>
      </div>

      {/* New Chat */}
      <button className="new-chat" onClick={onNewChat}>
        <Plus size={18}/>新建对话
      </button>

      {/* Search */}
      <button className="nav-search" onClick={onOpenSearch}>
        <Search size={16}/>搜索功能
      </button>

      {/* Projects */}
      <div className="sidebar-section">
        <span>项目</span>
        <button className="icon-btn" title="新建项目" onClick={onOpenProjectModal}><Plus size={14}/></button>
      </div>
      <div className="project-list">
        {projects.map(p => (
          <div key={p.id}>
            <button
              className={'nav-item project-item ' + (activeProjectId === p.id ? 'active' : '')}
              onClick={() => onSelectProject(p)}
              title={p.name}
            >
              <Folder size={15}/><span>{p.name}</span>
              {activeProjectId === p.id && <ChevronRight size={12}/>}
            </button>
            {activeProjectId === p.id && (
              <div className="nested-sessions">
                {sessions.filter(s => s.projectId === p.id).map(s => (
                  <button
                    key={s.id}
                    className={'nav-item ' + (activeSessionId === s.id ? 'selected' : '')}
                    onClick={() => onSelectSession(s.id)}
                    title={s.title}
                  >
                    <MessageSquare size={12}/><span>{s.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {!projects.length && (
          <div className="sidebar-empty">
            <button onClick={onOpenProjectModal}>
              <Plus size={12}/>选择文件夹
            </button>
            <p className="empty-hint">也可以先创建一个独立对话，不需要选择文件夹。</p>
            <button onClick={onNewStandalone}>
              <Plus size={12}/>新建独立对话
            </button>
          </div>
        )}
      </div>

      {/* Independent */}
      <div className="sidebar-section">
        <span>独立对话</span>
        <button className="icon-btn" title="新建独立对话" onClick={onNewStandalone}><Plus size={14}/></button>
      </div>
      <div className="standalone-list">
        {sessions.filter(s => !s.projectId).map(s => (
          <button
            key={s.id}
            className={'nav-item ' + (activeSessionId === s.id && page === 'chat' ? 'selected' : '')}
            onClick={() => onSelectSession(s.id)}
            title={s.title}
          >
            <MessageSquare size={12}/><span>{s.title}</span>
          </button>
        ))}
      </div>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <button className="nav-item migration-link" onClick={onShowMigration}>
          <Layers size={15}/>版本信息<small>{boot?.coverage.implemented ?? 0} 项工具已实现</small>
        </button>
        <button className={'nav-item settings-nav ' + (page === 'settings' ? 'selected' : '')} onClick={onOpenSettings}>
          <Settings size={15}/><span>设置</span>
        </button>
        <div className="local-state"><i/>本地运行</div>
      </div>
    </aside>
  );
}