import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Loader2, Sparkles} from 'lucide-react';
import {api} from './api';
import {byRecent} from './lib/format';
import {WorkspaceContext, type WorkspaceServices} from './lib/workspace';
import {useSessionRecord} from './hooks/useSessionRecord';
import {useToasts} from './hooks/useToasts';
import {Sidebar} from './components/Sidebar';
import {Conversation} from './components/Conversation';
import {SidePanel, type PanelTab} from './components/SidePanel';
import {SettingsView} from './components/SettingsView';
import {Onboarding} from './components/Onboarding';
import {ProjectDialog} from './components/Projects';
import {FilePreview} from './components/FilePreview';
import {Toasts} from './components/Toasts';
import type {Boot, FilePreviewData, Project, Session, SourceOrigin} from './types';

export function App() {
  const {toasts, dismiss, reportError, notify} = useToasts();
  const [boot, setBoot] = useState<Boot | null>(null);
  const [setupProject, setSetupProject] = useState('');

  const refresh = useCallback(async () => {
    const next = await api('bootstrap') as Boot;
    setBoot(next);
    return next;
  }, []);
  useEffect(() => { refresh().catch(reportError); }, [refresh, reportError]);

  let body: React.ReactNode;
  if (!boot) {
    body = <div className="boot-screen">
      <div className="boot-mark"><Sparkles size={20} /></div>
      <Loader2 className="spin" size={18} />
      <strong>正在打开审计 Agent</strong>
    </div>;
  } else if (!boot.settings.baseUrl || !boot.settings.model || !boot.projects.length) {
    body = <Onboarding boot={boot} onRefresh={refresh} onProject={project => { setSetupProject(project.id); refresh().catch(reportError); }} />;
  } else {
    body = <Workspace boot={boot} initialProject={setupProject} onRefresh={refresh} onError={reportError} onNotice={notify} />;
  }
  return <>{body}<Toasts toasts={toasts} onDismiss={dismiss} /></>;
}

interface WorkspaceProps {
  boot: Boot;
  initialProject: string;
  onRefresh: () => Promise<Boot>;
  onError: (error: unknown) => void;
  onNotice: (message: string) => void;
}

function Workspace({boot, initialProject, onRefresh, onError, onNotice}: WorkspaceProps) {
  const [projectId, setProjectId] = useState(() => boot.projects.find(item => item.id === initialProject)?.id || boot.projects[0].id);
  const [sessionId, setSessionId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panel, setPanel] = useState<PanelTab | null>(null);
  const [projectDialog, setProjectDialog] = useState<'new' | 'edit' | null>(null);
  const [preview, setPreview] = useState<FilePreviewData | null>(null);
  const [draft, setDraft] = useState('');
  const [scope, setScope] = useState<string[]>([]);
  const settingsDirty = useRef(false);
  const {record, reload} = useSessionRecord(sessionId, onError);
  const markSettingsDirty = useCallbackRef(settingsDirty);

  const project = boot.projects.find(item => item.id === projectId) || boot.projects[0];
  const sessions = useMemo(
    () => boot.sessions.filter(item => item.projectId === project.id).sort(byRecent),
    [boot.sessions, project.id],
  );
  const latestBoot = useRef(boot);
  latestBoot.current = boot;

  const services = useMemo<WorkspaceServices>(() => ({
    onError,
    openPreview: setPreview,
    toolNames: new Map([...(boot.legacyTools || []), ...boot.tools].map(tool => [tool.id, tool.name])),
  }), [onError, boot.tools, boot.legacyTools]);

  // Opening a project resumes its most recent conversation, or starts one.
  useEffect(() => {
    let cancelled = false;
    const existing = latestBoot.current.sessions.filter(item => item.projectId === project.id).sort(byRecent)[0];
    (async () => {
      const session = existing || await api('session.create', {projectId: project.id, title: '新对话'}) as Session;
      if (cancelled) return;
      setSessionId(session.id);
      if (!existing) await onRefresh();
    })().catch(onError);
    return () => { cancelled = true; };
  }, [project.id, onRefresh, onError]);

  // Titles and statuses in the conversation list come from bootstrap; refresh when a turn ends.
  const wasStreaming = useRef(false);
  useEffect(() => {
    const streaming = !!record?.streaming;
    if (wasStreaming.current && !streaming) onRefresh().catch(onError);
    wasStreaming.current = streaming;
  }, [record?.streaming, onRefresh, onError]);

  /** Leaving settings with unsaved model edits asks first, whichever way the user leaves. */
  const leaveSettings = () => {
    if (settingsOpen && settingsDirty.current && !window.confirm('模型服务有未保存的修改，确定放弃吗？')) return false;
    setSettingsOpen(false);
    return true;
  };
  const openSession = (id: string) => {
    if (!leaveSettings()) return;
    if (id !== sessionId) { setDraft(''); setScope([]); }
    setSessionId(id);
  };
  const openProject = (id: string) => {
    if (!leaveSettings()) return;
    setDraft('');
    setScope([]);
    setProjectId(id);
  };
  const newChat = async () => {
    if (!leaveSettings()) return;
    // An untouched conversation is reused instead of piling up empty ones.
    if (record && record.id === sessionId && !record.events.length && !record.attachments.length) { setDraft(''); return; }
    try {
      const session = await api('session.create', {projectId: project.id, title: '新对话'}) as Session;
      setDraft('');
      setScope([]);
      setSessionId(session.id);
      await onRefresh();
    } catch (error) { onError(error); }
  };
  const renameSession = (id: string, title: string) => api('session.rename', {id, title}).then(onRefresh).catch(onError);
  const deleteSession = async (session: Session) => {
    if (!window.confirm(`删除对话「${session.title}」？对话记录、执行快照和本对话的附件都会被清理，已导出的成果文件不受影响。`)) return;
    try {
      await api('session.delete', {id: session.id});
      const next = await onRefresh();
      if (session.id !== sessionId) return;
      const fallback = next.sessions.filter(item => item.projectId === project.id).sort(byRecent)[0];
      setSessionId(fallback?.id || (await api('session.create', {projectId: project.id, title: '新对话'}) as Session).id);
      if (!fallback) await onRefresh();
    } catch (error) { onError(error); }
  };
  const previewSource = async (source: SourceOrigin) => {
    try {
      const value = await api('agent.sourcePreview', {sessionId: source.sessionId, id: source.runId, inputId: source.inputId, row: source.row, sheet: source.sheet, headerRow: source.headerRow});
      setPreview({...value, name: source.path});
    } catch (error) { onError(error); }
  };

  return <WorkspaceContext.Provider value={services}>
    <div className={'shell' + (panel && !settingsOpen ? ' with-panel' : '')}>
      <Sidebar
        projects={boot.projects}
        project={project}
        sessions={sessions}
        sessionId={sessionId}
        settings={boot.settings}
        settingsOpen={settingsOpen}
        onProject={openProject}
        onNewProject={() => setProjectDialog('new')}
        onEditProject={() => setProjectDialog('edit')}
        onNewChat={newChat}
        onOpenSession={openSession}
        onRenameSession={renameSession}
        onDeleteSession={deleteSession}
        onSettings={() => setSettingsOpen(true)}
      />
      <main className="main">
        {settingsOpen
          ? <SettingsView boot={boot} onRefresh={onRefresh} onNotice={onNotice} onClose={() => setSettingsOpen(false)} onDirtyChange={markSettingsDirty} />
          : <div className="workspace">
            <Conversation
              project={project}
              sessionId={sessionId}
              record={record}
              reload={reload}
              draft={draft}
              setDraft={setDraft}
              scope={scope}
              setScope={setScope}
              panelOpen={!!panel}
              onTogglePanel={() => setPanel(panel ? null : 'files')}
              onPickScope={() => setPanel('files')}
              onTurnStarted={onRefresh}
            />
            {panel && <SidePanel project={project} record={record?.id === sessionId ? record : null} tab={panel} onTab={setPanel} scope={scope} onScope={setScope} onClose={() => setPanel(null)} />}
          </div>}
      </main>
    </div>
    {projectDialog && <ProjectDialog
      project={projectDialog === 'edit' ? project : undefined}
      canRemove
      onClose={() => setProjectDialog(null)}
      onCreated={async created => { setProjectDialog(null); await onRefresh(); openProject(created.id); }}
      onRenamed={() => { setProjectDialog(null); onRefresh().catch(onError); }}
      onRemoved={async removed => {
        setProjectDialog(null);
        const next = await onRefresh();
        const fallback = next.projects.find(item => item.id !== removed.id);
        if (fallback) openProject(fallback.id);
      }}
    />}
    {preview && <FilePreview value={preview} onClose={() => setPreview(null)} onSource={previewSource} />}
  </WorkspaceContext.Provider>;
}

/** Stable setter that mirrors a child's dirty flag into a ref without re-rendering the workspace. */
function useCallbackRef(target: React.MutableRefObject<boolean>) {
  return useCallback((value: boolean) => { target.current = value; }, [target]);
}
