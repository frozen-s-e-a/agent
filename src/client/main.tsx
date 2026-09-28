import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ChevronRight, X, Check,
  Loader2, Layers, ShieldCheck,
  PanelRightClose, PanelRightOpen, AlertCircle, Trash2,
} from 'lucide-react';
import { api, desktop } from './api';
import './style.css';
import { Sidebar } from './Sidebar';
import { WelcomePage } from './WelcomePage';
import { Composer } from './Composer';
import { Messages } from './Messages';
import { ContextPanel } from './ContextPanel';
import { SettingsPage } from './SettingsPage';
import { ProjectModal } from './ProjectModal';
import { ToolSearchModal } from './ToolSearchModal';
import { ToolParameterModal } from './ToolParameterModal';
import { useTransientNotice } from './useTransientNotice';
import { useFileSelection } from './hooks/useFileSelection';
import type { Project, Tool, Boot, AppSettings, ModalType } from './types';

// ─── App ───

function App() {
  // ── State ──
  const [boot, setBoot] = useState<Boot | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [timeline, setTimeline] = useState<any>({ events: [], tasks: [] });
  const [page, setPage] = useState<'chat' | 'settings'>('chat');
  const [error, setError] = useTransientNotice('', boot ? 3000 : 0);
  const [notice, setNotice] = useTransientNotice('');
  const [text, setText] = useState('');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [currentTool, setCurrentTool] = useState<Tool | null>(null);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('auto');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [files, setFiles] = useState<any[]>([]);
  const [folder, setFolder] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectRoot, setProjectRoot] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});
  const [advanced, setAdvanced] = useState('{}');
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [migration, setMigration] = useState<any>(null);
  const [settingsTab, setSettingsTab] = useState('模型服务');
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({} as AppSettings);
  const [apiKey, setApiKey] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Derived ──
  const session = boot?.sessions.find(s => s.id === sessionId);
  const project = boot?.projects.find(p => p.id === session?.projectId);
  const allTools: Tool[] = useMemo(() => {
    const unique = new Map<string, Tool>();
    for (const tool of [...(boot?.tools || []), ...(boot?.legacyTools || [])]) {
      unique.set(tool.id, tool);
    }
    return [...unique.values()];
  }, [boot]);

  // ── File selection ──
  const { selected: selectedFiles, toggle: toggleFile, clear: clearSelection } = useFileSelection();

  // ── Helpers ──
  const report = useCallback((e: unknown) => {
    setError(typeof e === 'object' && e !== null && 'message' in e
      ? String((e as any).message) : String(e));
  }, [setError]);

  const refresh = useCallback(async () => {
    const b = await api('bootstrap') as Boot;
    setBoot(b);
    return b;
  }, []);

  const refreshSession = useCallback(async () => {
    if (!sessionId) return;
    setTimeline(await api('session.get', { id: sessionId }) as any);
  }, [sessionId]);

  // ── Boot ──
  useEffect(() => {
    refresh().then(async b => {
      setSettings(b.settings);
      setMode(b.settings.defaultMode || 'auto');
      if (b.sessions.length) setSessionId(b.sessions.at(-1)!.id);
      else {
        const s = await api('session.create') as { id: string };
        setSessionId(s.id);
        await refresh();
      }
    }).catch(report);
  }, [refresh, report]);

  // ── Session polling ──
  useEffect(() => {
    if (!sessionId) return;
    let alive = true, lastError = '';
    const tick = () => {
      api('session.get', { id: sessionId })
        .then(r => { if (alive) setTimeline(r); })
        .catch(e => {
          if (alive && lastError !== e.message) { lastError = e.message; report(e); }
        });
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => { alive = false; clearInterval(timer); };
  }, [sessionId, report]);

  // ── File listing ──
  useEffect(() => { setFolder(''); clearSelection(); setPreview(null); }, [project?.id, clearSelection]);
  useEffect(() => {
    let alive = true;
    if (project) {
      api('files.list', { projectId: project.id, path: folder })
        .then(f => { if (alive) setFiles(f); })
        .catch(report);
    } else { setFiles([]); }
    return () => { alive = false; };
  }, [project?.id, folder, report]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearch(''); setModalType('tools'); }
      if (e.key === 'Escape') { setModalType(null); setCurrentTool(null); setDeleteConfirm(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── CRUD handlers ──
  const createSession = useCallback(async (projectId: string | null = null) => {
    try {
      const s = await api('session.create', { projectId }) as { id: string };
      await refresh(); setSessionId(s.id); setPage('chat'); setTimeline({ events: [], tasks: [] });
    } catch (e) { report(e); }
  }, [refresh, report]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        void createSession(project?.id || null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [createSession, project?.id]);

  const selectProject = useCallback(async (p: Project) => {
    const existing = boot?.sessions.filter(s => s.projectId === p.id).at(-1);
    if (existing) { setSessionId(existing.id); setPage('chat'); }
    else await createSession(p.id);
  }, [boot, createSession]);

  const createProject = useCallback(async () => {
    setBusy(true);
    try {
      const p = await api('project.create', { name: projectName, root: projectRoot }) as Project;
      await refresh(); await createSession(p.id);
      setModalType(null); setProjectName(''); setProjectRoot('');
    } catch (e) { report(e); } finally { setBusy(false); }
  }, [projectName, projectRoot, refresh, createSession, report]);

  const demo = useCallback(async () => {
    try {
      const p = await api('demo.create') as Project;
      await refresh(); await createSession(p.id);
      setNotice('已创建合成示例项目。');
    } catch (e) { report(e); }
  }, [refresh, createSession, setNotice, report]);

  const openTool = useCallback((t: Tool) => {
    setCurrentTool(t); setModalType(null);
    setAdvanced('{}'); setPreview(null);
    setParams(Object.fromEntries(t.fields.map(f => [f.key, f.default || ''])));
  }, []);

  const loadPreview = useCallback(async () => {
    if (!project || !selectedFiles.length) return;
    setBusy(true);
    try {
      const r = await api('files.preview', { projectId: project.id, file: selectedFiles[0] }) as any;
      setPreview(r);
      const guesses: Record<string, string[]> = {
        date: ['凭证日期', '日期'], subject: ['科目编码', '科目代码'],
        debit: ['借方金额', '借方'], credit: ['贷方金额', '贷方'],
      };
      setParams(prev => {
        const n = { ...prev };
        for (const [k, vs] of Object.entries(guesses)) {
          if (!n[k]) n[k] = vs.find(x => r.columns.includes(x)) || '';
        }
        return n;
      });
    } catch (e) { report(e); } finally { setBusy(false); }
  }, [project, selectedFiles, report]);

  const runTool = useCallback(async () => {
    if (!currentTool) return;
    setBusy(true);
    try {
      const extra = JSON.parse(advanced);
      if (!extra || Array.isArray(extra) || typeof extra !== 'object') throw Error('高级参数必须是 JSON 对象');
      await api('task.run', {
        sessionId, tool: currentTool.id, files: selectedFiles, mode,
        parameters: { ...params, ...extra },
      });
      setCurrentTool(null);
      setTimeline(await api('session.get', { id: sessionId }) as any);
    } catch (e) { report(e); } finally { setBusy(false); }
  }, [currentTool, sessionId, selectedFiles, mode, params, advanced, report]);

  const send = useCallback(async () => {
    if (busy || attachmentBusy || timeline.streaming || (!text.trim() && !timeline.attachments?.length)) return;
    if (text.startsWith('/')) {
      const name = text.slice(1).trim();
      const t = allTools.find(t => t.id === name || t.name === name);
      if (t) { openTool(t); setText(''); return; }
      setSearch(name); setModalType('tools'); return;
    }
    setBusy(true);
    try {
      await api('chat.send', {
        sessionId, text, projectFiles: selectedFiles,
        mode,
        model: session?.model || '',
        attachments: (timeline.attachments || []).map((a: any) => a.id),
      });
      setText(''); await refresh(); setTimeline(await api('session.get', { id: sessionId }) as any);
    } catch (e) { report(e); } finally { setBusy(false); }
  }, [allTools, busy, attachmentBusy, timeline, text, selectedFiles, mode, session, refresh, report, openTool, sessionId]);

  const retryMessage = useCallback(async (event: any) => {
    if (busy || attachmentBusy || timeline.streaming || !event?.text) return;
    setBusy(true);
    try {
      await api('chat.send', {
        sessionId,
        text: event.text,
        projectFiles: event.projectFiles ?? selectedFiles,
        mode,
        model: session?.model || '',
        attachments: (event.attachments || []).map((a: any) => a.id),
      });
      await refresh();
      setTimeline(await api('session.get', { id: sessionId }) as any);
    } catch (e) { report(e); } finally { setBusy(false); }
  }, [busy, attachmentBusy, timeline.streaming, sessionId, selectedFiles, mode, session, refresh, report]);

  const saveSettings = useCallback(async () => {
    setBusy(true);
    try {
      await api('settings.save', settings);
      if (apiKey) await api('secret.save', { key: apiKey });
      setApiKey('');
      const b = await refresh(); setSettings(b.settings);
      setNotice('设置已保存' + (desktop ? '，模型密钥由 Windows 加密保护。' : '。'));
    } catch (e) { report(e); } finally { setBusy(false); }
  }, [settings, apiKey, refresh, setNotice, report]);

  const showMigration = useCallback(async () => {
    try { setMigration(await api('migration.get') as any); setPage('settings'); setSettingsTab('迁移与诊断'); }
    catch (e) { report(e); }
  }, [report]);

  const deleteSession = useCallback(async (id: string) => {
    setBusy(true);
    try {
      const deleted = boot?.sessions.find(s => s.id === id);
      await api('session.delete', { id });
      const nextBoot = await refresh();
      if (sessionId === id) {
        const sameProject = nextBoot.sessions.filter(s => s.id !== id && s.projectId === deleted?.projectId);
        const remaining = sameProject.length
          ? sameProject
          : nextBoot.sessions.filter(s => s.id !== id);
        if (remaining.length) {
          setSessionId(remaining.at(-1)!.id);
        } else {
          const replacement = await api('session.create', { projectId: deleted?.projectId || null }) as { id: string };
          await refresh();
          setSessionId(replacement.id);
        }
        setTimeline({ events: [], tasks: [] });
      }
      setDeleteConfirm(null);
      setNotice('对话已删除');
    } catch (e) { report(e); } finally { setBusy(false); }
  }, [sessionId, boot, refresh, setNotice, report]);

  const usage = useMemo(() => {
    return timeline.events.filter((x: any) => x.usage).reduce((a: any, x: any) => ({
      input: a.input + (x.usage.prompt_tokens || 0),
      output: a.output + (x.usage.completion_tokens || 0),
      total: a.total + (x.usage.total_tokens || 0),
    }), { input: 0, output: 0, total: 0 });
  }, [timeline.events]);

  // ── Loading ──
  if (!boot) {
    return (
      <div className="loading">
        <div className="brand-mark" style={{ margin: '0 auto 12px' }}>
          <Layers size={32} />
        </div>
        <Loader2 className="spin" size={24} />
        <h2>正在打开审计工作空间</h2>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="app-shell">
      <Sidebar
        projects={boot.projects}
        sessions={boot.sessions}
        activeProjectId={project?.id || null}
        activeSessionId={sessionId}
        page={page}
        boot={boot}
        onNewChat={() => createSession(project?.id || null)}
        onNewStandalone={() => createSession()}
        onSelectProject={selectProject}
        onSelectSession={(id) => { setSessionId(id); setPage('chat'); }}
        onDeleteSession={(id) => setDeleteConfirm(id)}
        onOpenProjectModal={() => setModalType('project')}
        onOpenSearch={() => { setSearch(''); setModalType('tools'); }}
        onOpenSettings={() => { setPage('settings'); setSettingsTab('模型服务'); setSettings(boot.settings); }}
        onShowMigration={showMigration}
      />

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{page === 'settings' ? '偏好设置' : project?.name || '独立对话'}</span>
            <ChevronRight size={14} />
            <strong>{page === 'settings' ? settingsTab : session?.title || '新对话'}</strong>
          </div>
          <div className="top-actions">
            <span className="local-pill" title="本地工具在本机执行；对话内容按所选模型服务配置处理"><ShieldCheck size={14} />本地工具执行</span>
            {page === 'chat' && (
              <button title="项目文件" aria-label="切换项目文件面板" className="icon-btn" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
                {rightPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
              </button>
            )}
          </div>
        </header>

        {/* Notifications */}
        {(error || notice) && (
          <div className="notification-stack">
            {error && (
              <div role="alert" className="banner error">
                <AlertCircle size={17} /><span>{error}</span>
                <button className="icon-btn" onClick={() => setError('')}><X size={15} /></button>
              </div>
            )}
            {notice && (
              <div role="status" className="banner success">
                <Check size={17} /><span>{notice}</span>
                <button className="icon-btn" onClick={() => setNotice('')}><X size={15} /></button>
              </div>
            )}
          </div>
        )}

        {page === 'chat' ? (
          <div className="workspace">
            <div className="workspace-content">
              {timeline.events.length === 0 ? (
                <WelcomePage
                  toolCount={boot.tools.length}
                  legacyToolCount={boot.legacyTools?.length || 0}
                  project={project}
                  tools={allTools}
                  onCreateProject={() => setModalType('project')}
                  onOpenSearch={() => { setSearch(''); setModalType('tools'); }}
                  onOpenTool={openTool}
                  onDemo={demo}
                />
              ) : (
                <Messages
                  events={timeline.events}
                  calls={timeline.calls}
                  tasks={timeline.tasks}
                  tools={allTools}
                  streaming={timeline.streaming}
                  turn={timeline.turn}
                  phase={timeline.phase || ''}
                  sessionId={sessionId}
                  busy={busy}
                  onError={report}
                  onRetry={retryMessage}
                />
              )}
              {rightPanelOpen && (
                <ContextPanel
                  project={project}
                  files={files}
                  folder={folder}
                  selected={selectedFiles}
                  onFolderChange={setFolder}
                  onSelectFile={toggleFile}
                  onCreateProject={() => setModalType('project')}
                  onRefresh={() => project && api('files.list', { projectId: project.id, path: folder }).then(setFiles).catch(report)}
                  onClearSelection={clearSelection}
                  onUseTools={() => setModalType('tools')}
                />
              )}
            </div>

            {/* Composer */}
            <Composer
              sessionId={sessionId}
              text={text} onTextChange={setText} onSend={send}
              busy={busy} streaming={timeline.streaming}
              attachments={timeline.attachments || []}
              attachmentBusy={attachmentBusy}
              onRemoveAttachment={(id) => api('attachments.remove', { sessionId, id })
                .then(() => api('session.get', { id: sessionId })).then(setTimeline).catch(report)}
              mode={mode} onModeChange={setMode}
              sessionModel={session?.model || ''}
              onModelChange={(m) => api('session.model', { id: sessionId, model: m }).then(refresh).catch(report)}
              settingsModels={boot.settings?.models || []}
              visionModel={boot.settings?.visionModel || ''}
              settingsModel={boot.settings?.model || ''}
              onToolSelect={() => { setSearch(''); setModalType('tools'); }}
              onSettingsClick={() => { setPage('settings'); setSettingsTab('模型服务'); setSettings(boot.settings); }}
              usageTotal={usage.total}
              setAttachmentBusy={setAttachmentBusy}
              refreshSession={refreshSession}
              onError={report}
              onNotice={setNotice}
              onStop={() => api('chat.cancel', { sessionId }).catch(report)}
              showDelete={!!session && page === 'chat'}
              onDelete={session ? () => setDeleteConfirm(session.id) : undefined}
            />
          </div>
        ) : (
          <SettingsPage
            boot={boot}
            tab={settingsTab}
            onTabChange={setSettingsTab}
            settings={settings}
            setSettings={setSettings}
            keyValue={apiKey}
            setKey={setApiKey}
            busy={busy}
            saveSettings={saveSettings}
            showMigration={showMigration}
            usage={usage}
            migration={migration}
          />
        )}
      </main>

      {/* Modals */}
      {modalType === 'project' && (
        <ProjectModal
          projectName={projectName} setProjectName={setProjectName}
          projectRoot={projectRoot} setProjectRoot={setProjectRoot}
          busy={busy} onCreate={createProject} onCancel={() => setModalType(null)}
          onError={report}
        />
      )}

      {modalType === 'tools' && (
        <ToolSearchModal
          search={search} onSearchChange={setSearch}
          allTools={allTools} onOpenTool={openTool}
          onClose={() => setModalType(null)} showMigration={showMigration}
        />
      )}

      {currentTool && (
        <ToolParameterModal
          tool={currentTool}
          project={project}
          files={files}
          folder={folder}
          selected={selectedFiles}
          params={params}
          setParams={setParams}
          advanced={advanced}
          setAdvanced={setAdvanced}
          preview={preview}
          mode={mode}
          onModeChange={setMode}
          boot={boot}
          busy={busy}
          onFolderChange={setFolder}
          onSelectFile={toggleFile}
          onRefresh={() => project && api('files.list', { projectId: project.id, path: folder }).then(setFiles).catch(report)}
          onRunTool={runTool}
          onCancel={() => setCurrentTool(null)}
          onCreateProject={() => { setCurrentTool(null); setModalType('project'); }}
          onLoadPreview={loadPreview}
          onDemo={demo}
        />
      )}

      {deleteConfirm && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-label="删除对话">
            <div className="modal-header">
              <h2>删除对话</h2>
              <button className="icon-btn" aria-label="关闭删除确认" onClick={() => setDeleteConfirm(null)}><X size={20} /></button>
            </div>
            <p className="muted">此对话及其所有消息和工具记录将被永久删除，无法恢复。</p>
            <div className="modal-footer">
              <span></span>
              <button className="secondary" onClick={() => setDeleteConfirm(null)}>取消</button>
              <button className="primary" style={{ background: 'var(--danger)' }} disabled={busy} onClick={() => deleteSession(deleteConfirm)}>
                {busy ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                确认删除
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
