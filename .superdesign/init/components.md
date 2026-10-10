# Shared UI components

The client uses React 19 + TypeScript, Lucide React icons, and one vanilla CSS file. There is no third-party component library.

## Sidebar
- Source: `src/client/Sidebar.tsx`
- Renders projects, sessions, new chat actions, settings, migration entry, and local status.

```tsx
import React from 'react';
import { Folder, Settings, Plus, ChevronRight, Layers, MessageSquare, Trash2 } from 'lucide-react';
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
  onOpenSettings: () => void;
  onShowMigration: () => void;
}

export function Sidebar({
  projects, sessions, activeProjectId, activeSessionId, page, boot,
  onNewChat, onNewStandalone, onSelectProject, onSelectSession, onDeleteSession,
  onOpenProjectModal, onOpenSettings, onShowMigration,
}: SidebarProps) {
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
            <div key={p.id}>
              <button
                className={'nav-item project-item' + (isActive ? ' active' : '')}
                onClick={() => onSelectProject(p)}
                title={p.name}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="project-dot" style={{ display: isActive ? 'block' : 'none' }} />
                <Folder size={15} />
                <span className="row-label">{p.name}</span>
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
                    >
                      <button
                        className={'nav-item' + (activeSessionId === s.id ? ' selected' : '')}
                        onClick={() => onSelectSession(s.id)}
                        title={s.title}
                          aria-current={activeSessionId === s.id ? 'page' : undefined}
                      >
                        <span className="session-dot" style={{ display: activeSessionId === s.id ? 'block' : 'none' }} />
                        <MessageSquare size={12} />
                        <span className="row-label">{s.title}</span>
                      </button>
                      <button
                        className="session-delete"
                        title="删除此对话"
                        aria-label={`删除对话：${s.title}`}
                        onClick={e => { e.stopPropagation(); onDeleteSession(s.id); }}
                      >
                        <Trash2 size={11} />
                      </button>
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
          >
            <button
              className={'nav-item' + (activeSessionId === s.id && page === 'chat' ? ' selected' : '')}
              onClick={() => onSelectSession(s.id)}
              title={s.title}
              aria-current={activeSessionId === s.id && page === 'chat' ? 'page' : undefined}
            >
              <span className="session-dot" style={{ display: activeSessionId === s.id ? 'block' : 'none' }} />
              <MessageSquare size={12} />
              <span className="row-label">{s.title}</span>
            </button>
            <button
              className="session-delete"
              title="删除此对话"
              aria-label={`删除对话：${s.title}`}
              onClick={e => { e.stopPropagation(); onDeleteSession(s.id); }}
            >
              <Trash2 size={11} />
            </button>
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
          aria-current={page === 'settings' ? 'page' : undefined}
        >
          <Settings size={15} /><span className="row-label">设置</span>
        </button>
        <div className="local-state">
          <i />
          本地运行
        </div>
      </div>
    </aside>
  );
}

```

## WelcomePage
- Source: `src/client/WelcomePage.tsx`
- Renders the empty-state start screen and two launch actions.

```tsx
import React from 'react';
import { Folder, Sparkles } from 'lucide-react';

interface WelcomePageProps {
  toolCount: number;
  legacyToolCount: number;
  onCreateProject: () => void;
  onDemo: () => void;
}

export function WelcomePage({
  toolCount, legacyToolCount,
  onCreateProject, onDemo,
}: WelcomePageProps) {
  return (
    <div className="welcome">
      <div className="welcome-glow" aria-hidden="true"/>
      <div className="welcome-center">
        <div className="welcome-title">你好，准备开始审计了吗？</div>
        <div className="welcome-desc">
          输入任务描述开始对话，或使用输入框工具菜单选择（{toolCount} 个本地工具）
          {legacyToolCount > 0 && <span className="welcome-legacy-count"> · 原版兼容工具 {legacyToolCount} 项</span>}
        </div>
        <div className="welcome-actions">
          <button
            className="welcome-action"
            onClick={onCreateProject}
          >
            <span className="welcome-action-icon"><Folder size={20}/></span>
            <span>
              <strong>选择项目</strong>
              <small>划定资料范围</small>
            </span>
          </button>
          <button
            className="welcome-action"
            onClick={onDemo}
          >
            <span className="welcome-action-icon"><Sparkles size={20}/></span>
            <span>
              <strong>使用合成示例</strong>
              <small>快速体验完整流程</small>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

```

## Composer
- Source: `src/client/Composer.tsx`
- Renders the prompt composer, attachments, mode/model controls, tool menu, and send/stop actions.

```tsx
import React, { useState } from 'react';
import {
  Command, ArrowUp, Square, Settings,
  MoreVertical, Trash2,
} from 'lucide-react';
import type { Tool } from './types';
import { AttachmentList } from './Attachments';
import { AttachmentPicker } from './Attachments';

interface ComposerProps {
  sessionId: string;
  text: string;
  onTextChange: (v: string) => void;
  onSend: () => void;
  busy: boolean;
  streaming: boolean;
  attachments: any[];
  attachmentBusy: boolean;
  onRemoveAttachment: (id: string) => void;
  mode: string;
  onModeChange: (m: string) => void;
  sessionModel: string;
  onModelChange: (m: string) => void;
  settingsModels: string[];
  visionModel: string;
  settingsModel: string;
  onToolSelect: () => void;
  onSettingsClick: () => void;
  usageTotal: number;
  setAttachmentBusy: (busy: boolean) => void;
  refreshSession: () => Promise<void>;
  onError: (e: unknown) => void;
  onNotice: (message: string) => void;
  onStop: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

const modes: Record<string, string> = {
  auto: '自动',
  'local-light': '轻量本地',
  'local-batch': '大批量',
};

export function Composer({
  sessionId, text, onTextChange, onSend, busy, streaming,
  attachments, attachmentBusy, onRemoveAttachment,
  mode, onModeChange,
  sessionModel, onModelChange, settingsModels, visionModel, settingsModel,
  onToolSelect, onSettingsClick, usageTotal,
  setAttachmentBusy, refreshSession, onError, onNotice, onStop,
  onDelete, showDelete,
}: ComposerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="composer-area">
      <div className="composer">
        <AttachmentList
          items={attachments}
          sessionId={sessionId}
          disabled={attachmentBusy || busy || streaming}
          onRemove={onRemoveAttachment}
        />
        <textarea
          aria-label="发送消息"
          placeholder="描述你的审计任务，或输入 / 选择工具…"
          value={text}
          onChange={e => onTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="composer-toolbar">
          <div>
            <AttachmentPicker
              sessionId={sessionId}
              busy={attachmentBusy || busy || streaming}
              setBusy={setAttachmentBusy}
              refresh={refreshSession}
              onError={onError}
              onNotice={onNotice}
            />
            <button className="text-tool" onClick={onToolSelect}>
              <Command size={14}/>工具
            </button>
            <span className="toolbar-divider"/>
            <div className="mode-toggle">
              {Object.entries(modes).map(([k, v]) => (
                <button
                  key={k}
                  className={mode === k ? 'active' : ''}
                  onClick={() => onModeChange(k)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
            <select
              className="desktop-model-select"
              aria-label="对话模型"
              value={sessionModel || ''}
              disabled={streaming || busy}
              onChange={e => onModelChange(e.target.value)}
            >
              <option value="">
                {(attachments as any[]).some((a: any) => a.kind === 'image')
                  ? (visionModel || '请选择视觉模型')
                  : settingsModel}
              </option>
              {[...settingsModels, settingsModel, visionModel, sessionModel]
                .filter((m, i, a) => m && a.indexOf(m) === i)
                .map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
            </select>
            <button
              className="icon-btn"
              title="模型连接设置"
              onClick={onSettingsClick}
            >
              <Settings size={15}/>
            </button>
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                className="icon-btn"
                title="更多"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <MoreVertical size={15}/>
              </button>
              {menuOpen && (
                <div className="composer-menu">
                  {showDelete && onDelete && (
                    <button
                      className="composer-menu-item delete"
                      onClick={() => { onDelete(); setMenuOpen(false); }}
                    >
                      <Trash2 size={14}/>删除此对话
                    </button>
                  )}
                </div>
              )}
            </div>
            {streaming ? (
              <button className="send stop" title="停止生成" aria-label="停止生成" onClick={onStop}>
                <Square size={16}/>
              </button>
            ) : (
              <button
                className="send"
                title="发送"
                disabled={busy || attachmentBusy || (!text.trim() && !attachments.length)}
                onClick={onSend}
              >
                <ArrowUp size={20}/>
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="composer-caption">
        <span>发送会将文本、文件摘录、图片及工具结果交给所选模型。</span>
        <span>
          {usageTotal ? `本会话 ${usageTotal.toLocaleString()} Tokens` : '本地工具无需模型 Token'}
        </span>
      </div>
    </div>
  );
}

```

## ContextPanel
- Source: `src/client/ContextPanel.tsx`
- Renders project scope, files, tool parameters, and preview controls.

```tsx
import React from 'react';
import {
  Folder, ArrowLeft, RefreshCw, FileSpreadsheet, FileText,
  ArrowUpRight, Plus, ChevronRight,
} from 'lucide-react';
import { ToolParameterModal } from './ToolParameterModal';
import type { Tool } from './types';

interface ContextPanelProps {
  open: boolean;
  tool?: Tool | null;
  params?: Record<string, string>;
  setParams?: (p: Record<string, string>) => void;
  advanced?: string;
  setAdvanced?: (a: string) => void;
  preview?: any;
  mode?: string;
  onModeChange?: (m: string) => void;
  boot?: any;
  busy?: boolean;
  onRunTool?: () => void;
  onCancelTool?: () => void;
  onLoadPreview?: () => void;
  onDemo?: () => Promise<void>;
  project: { id: string; name: string; root: string } | undefined;
  files: any[];
  folder: string;
  selected: string[];
  onFolderChange: (f: string) => void;
  onSelectFile: (path: string) => void;
  onCreateProject: () => void;
  onRefresh: () => void;
  onClearSelection: () => void;
  onUseTools: () => void;
}

export function ContextPanel({
  open, tool, params = {}, setParams = () => {}, advanced = '{}', setAdvanced = () => {}, preview,
  mode = 'auto', onModeChange = () => {}, boot, busy = false, onRunTool = () => {}, onCancelTool = () => {}, onLoadPreview = () => {}, onDemo = async () => {},
  project, files, folder, selected,
  onFolderChange, onSelectFile, onCreateProject,
  onRefresh, onClearSelection, onUseTools,
}: ContextPanelProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const panelClass = 'context-panel ' + (open ? 'is-open' : 'is-closed');
  if (tool) {
    return (
      <aside className={panelClass} aria-hidden={!open}>
        <ToolParameterModal
          embedded
          tool={tool}
          project={project}
          files={files}
          folder={folder}
          selected={selected}
          params={params}
          setParams={setParams}
          advanced={advanced}
          setAdvanced={setAdvanced}
          preview={preview}
          mode={mode}
          onModeChange={onModeChange}
          boot={boot}
          busy={busy}
          onFolderChange={onFolderChange}
          onSelectFile={onSelectFile}
          onRefresh={onRefresh}
          onRunTool={onRunTool}
          onCancel={onCancelTool}
          onCreateProject={onCreateProject}
          onLoadPreview={onLoadPreview}
          onDemo={onDemo}
        />
      </aside>
    );
  }
  if (!project) {
    return (
      <aside className={panelClass} aria-hidden={!open}>
        <div className="context-heading">
          <h3>项目资料</h3>
          <span>未选择</span>
        </div>
        <div className="no-project">
          <div className="outline-folder"><Folder size={28}/></div>
          <strong>为资料划定工作范围</strong>
          <p>选择一个文件夹作为项目。<br/>每个项目的文件与对话独立保存。</p>
          <button className="secondary" onClick={onCreateProject}>
            <Plus size={14}/>创建项目
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={panelClass} aria-hidden={!open}>
      <div className="context-heading">
        <h3>项目资料</h3>
        <span>已授权</span>
      </div>
      <div className="project-scope">
        <Folder size={18}/>
        <div>
          <strong>{project.name}</strong>
          <small title={project.root}>{project.root}</small>
        </div>
      </div>
      <div className="section-label">
        输入文件<small>{selected.length ? `已选 ${selected.length} 项` : ''}</small>
      </div>

      {/* Breadcrumb + refresh */}
      <div className="file-breadcrumb">
        <button
          className="icon-btn"
          title="返回上级"
          disabled={!folder}
          onClick={() => onFolderChange(folder.split(/[\\/]/).slice(0, -1).join('/'))}
        >
          <ArrowLeft size={15}/>
        </button>
        <span title={folder}>{folder || '项目根目录'}</span>
        <button className="icon-btn" title="刷新文件" onClick={onRefresh}>
          <RefreshCw size={14}/>
        </button>
      </div>

      {/* File list */}
      <div className="file-list">
        {files.map(f => (
          <div className={'file-row ' + (selected.includes(f.path) ? 'chosen' : '')} key={f.path}>
            {f.directory ? (
              <button onClick={() => onFolderChange(f.path)}>
                <Folder size={17}/>
                <span>{f.name}</span>
                <ChevronRight size={14}/>
              </button>
            ) : (
              <label>
                <input
                  type="checkbox"
                  checked={selected.includes(f.path)}
                  onChange={() => onSelectFile(f.path)}
                />
                {/\.(?:xlsx?|csv)$/i.test(f.name)
                  ? <FileSpreadsheet size={17}/>
                  : <FileText size={17}/>}
                <span title={f.path}>{f.name}</span>
                <small>{formatSize(f.size || 0)}</small>
              </label>
            )}
          </div>
        ))}
        {!files.length && <p className="muted empty-small">此文件夹暂无可选文件</p>}
      </div>

      {/* Selection actions */}
      {selected.length > 0 && (
        <div className="selected-files">
          <button onClick={onClearSelection}>清除选择</button>
          <button onClick={onUseTools}>使用工具 <ArrowUpRight size={13}/></button>
        </div>
      )}

    </aside>
  );
}

```
