import React, { useState } from 'react';
import { Folder, Settings, Plus, Search, ChevronRight, Layers, MessageSquare, Trash2 } from 'lucide-react';
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
  onDeleteSession: (id: string) => void;
  onOpenProjectModal: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onShowMigration: () => void;
}

export function Sidebar({
  projects, sessions, activeProjectId, activeSessionId, page, boot,
  onNewChat, onNewStandalone, onSelectProject, onSelectSession, onDeleteSession,
  onOpenProjectModal, onOpenSearch, onOpenSettings, onShowMigration,
}: SidebarProps) {
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  const projectSessions = (projectId: string) =>
    sessions.filter(s => s.projectId === projectId);
  const standaloneSessions = sessions.filter(s => !s.projectId);

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="brand">
        <div className="brand-mark"><Layers size={18} /></div>
        <div>
          <span className="brand-title">AI 助手</span>
          <span className="brand-subtitle">审计</span>
        </div>
      </div>

      {/* New Chat */}
      <button className="new-chat" onClick={onNewChat}>
        <Plus size={18} />新建对话
        <span className="kbd-hint">Ctrl+Shift+N</span>
      </button>

      {/* Search */}
      <button className="nav-search" onClick={onOpenSearch}>
        <Search size={16} />搜索功能
        <kbd>Ctrl+K</kbd>
      </button>

      {/* Projects */}
      <div className="sidebar-section">
        <span>项目</span>
        <button className="icon-btn" title="新建项目" onClick={onOpenProjectModal}>
          <Plus size={14} />
        </button>
      </div>
      <div className="project-list">
        {projects.map(p => {
          const pSessions = projectSessions(p.id);
          const isActive = activeProjectId === p.id;
          return (
            <div key={p.id} onMouseEnter={() => setHoveredProject(p.id)} onMouseLeave={() => setHoveredProject(null)}>
              <button
                className={'nav-item project-item' + (isActive ? ' active' : '')}
                onClick={() => onSelectProject(p)}
                title={p.name}
              >
                <span className="project-dot" style={{ display: isActive ? 'block' : 'none' }} />
                <Folder size={15} />
                <span>{p.name}</span>
                {pSessions.length > 0 && (
                  <span className="session-count">{pSessions.length}</span>
                )}
                {isActive && <ChevronRight size={12} />}
              </button>
              {isActive && (
                <div className="nested-sessions">
                  {pSessions.map(s => (
                    <div
                      key={s.id}
                      className="session-row"
                      onMouseEnter={() => setHoveredSession(s.id)}
                      onMouseLeave={() => setHoveredSession(null)}
                    >
                      <button
                        className={'nav-item' + (activeSessionId === s.id ? ' selected' : '')}
                        onClick={() => onSelectSession(s.id)}
                        title={s.title}
                      >
                        <span className="session-dot" style={{ display: activeSessionId === s.id ? 'block' : 'none' }} />
                        <MessageSquare size={12} />
                        <span>{s.title}</span>
                      </button>
                      {hoveredSession === s.id && (
                        <button
                          className="session-delete"
                          title="删除此对话"
                          onClick={e => { e.stopPropagation(); onDeleteSession(s.id); }}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!projects.length && (
          <div className="sidebar-empty">
            <button onClick={onOpenProjectModal}>
              <Plus size={12} />选择文件夹
            </button>
            <p className="empty-hint">也可以先创建一个独立对话，不需要选择文件夹。</p>
            <button onClick={onNewStandalone}>
              <Plus size={12} />新建独立对话
            </button>
          </div>
        )}
      </div>

      {/* Independent */}
      <div className="sidebar-section">
        <span>独立对话</span>
        <button className="icon-btn" title="新建独立对话" onClick={onNewStandalone}>
          <Plus size={14} />
        </button>
      </div>
      <div className="standalone-list">
        {standaloneSessions.map(s => (
          <div
            key={s.id}
            className="session-row"
            onMouseEnter={() => setHoveredSession(s.id)}
            onMouseLeave={() => setHoveredSession(null)}
          >
            <button
              className={'nav-item' + (activeSessionId === s.id && page === 'chat' ? ' selected' : '')}
              onClick={() => onSelectSession(s.id)}
              title={s.title}
            >
              <span className="session-dot" style={{ display: activeSessionId === s.id ? 'block' : 'none' }} />
              <MessageSquare size={12} />
              <span>{s.title}</span>
            </button>
            {hoveredSession === s.id && (
              <button
                className="session-delete"
                title="删除此对话"
                onClick={e => { e.stopPropagation(); onDeleteSession(s.id); }}
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <button className="nav-item migration-link" onClick={onShowMigration}>
          <Layers size={15} />版本信息<small>{boot?.coverage.implemented ?? 0} 项工具已实现</small>
        </button>
        <button
          className={'nav-item settings-nav' + (page === 'settings' ? ' selected' : '')}
          onClick={onOpenSettings}
        >
          <Settings size={15} /><span>设置</span>
        </button>
        <div className="local-state">
          <i />
          本地运行
        </div>
      </div>
    </aside>
  );
}
