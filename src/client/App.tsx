import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Loader2, Sparkles} from 'lucide-react';
import {api} from './api';
import {byRecent} from './lib/format';
import {useSessionRecord} from './hooks/useSessionRecord';
import {useToasts} from './hooks/useToasts';
import {Sidebar, type View} from './components/Sidebar';
import {ChatHeader} from './components/ChatHeader';
import {ChatView} from './components/ChatView';
import {HistoryPanel} from './components/HistoryPanel';
import {ProjectSetup} from './components/ProjectSetup';
import {SettingsView} from './components/SettingsView';
import {Toasts} from './components/Toasts';
import type {Boot, Project, Session} from './types';

export function App() {
  const {toasts, dismiss, reportError, notify} = useToasts();
  const [boot, setBoot] = useState<Boot | null>(null);

  const refresh = useCallback(async () => {
    const next = await api('bootstrap') as Boot;
    setBoot(next);
    return next;
  }, []);

  useEffect(() => { refresh().catch(reportError); }, [refresh, reportError]);

  if (!boot) {
    return <div className="boot-screen">
      <div className="boot-mark"><Sparkles size={22} /></div>
      <Loader2 className="spin" size={20} />
      <strong>正在打开审计 Agent</strong>
      <Toasts toasts={toasts} onDismiss={dismiss} />
    </div>;
  }
  return <>
    <Workspace boot={boot} onRefresh={refresh} onError={reportError} onNotice={notify} />
    <Toasts toasts={toasts} onDismiss={dismiss} />
  </>;
}

interface WorkspaceProps {
  boot: Boot;
  onRefresh: () => Promise<Boot>;
  onError: (error: unknown) => void;
  onNotice: (message: string) => void;
}

function Workspace({boot, onRefresh, onError, onNotice}: WorkspaceProps) {
  const [projectId, setProjectId] = useState(boot.projects[0]?.id || '');
  const [sessionId, setSessionId] = useState('');
  const [view, setView] = useState<View>('chat');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const {record, reload} = useSessionRecord(sessionId, onError);

  const project = boot.projects.find(item => item.id === projectId);
  const sessions = useMemo(
    () => boot.sessions.filter(item => item.projectId === projectId).sort(byRecent),
    [boot.sessions, projectId],
  );

  // Keep the latest boot data reachable from async work without re-running effects on every refresh.
  const latestBoot = useRef(boot);
  latestBoot.current = boot;

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    try { await work(); } catch (error) { onError(error); } finally { setBusy(false); }
  }, [onError]);

  // Opening a project resumes its most recent conversation, or starts one.
  useEffect(() => {
    if (!projectId) { setSessionId(''); return; }
    let cancelled = false;
    const existing = latestBoot.current.sessions
      .filter((item: Session) => item.projectId === projectId && !item.workflow)
      .sort(byRecent)[0];
    (async () => {
      const session = existing || await api('session.create', {projectId, title: '新对话'}) as Session;
      if (cancelled) return;
      setSessionId(session.id);
      if (!existing) await onRefresh();
    })().catch(onError);
    return () => { cancelled = true; };
  }, [projectId, onRefresh, onError]);

  // Session titles and statuses in the sidebar come from bootstrap; refresh once a turn ends.
  const wasStreaming = useRef(false);
  useEffect(() => {
    const streaming = !!record?.streaming;
    if (wasStreaming.current && !streaming) onRefresh().catch(onError);
    wasStreaming.current = streaming;
  }, [record?.streaming, onRefresh, onError]);

  const showChat = () => { setView('chat'); setHistoryOpen(false); };

  const openSession = (id: string) => {
    if (busy) return;
    showChat();
    setDraft('');
    setSessionId(id);
  };

  const openProject = (id: string) => {
    showChat();
    setDraft('');
    setProjectId(id);
  };

  const newChat = () => {
    if (!project || busy) return;
    run(async () => {
      showChat();
      setDraft('');
      const session = await api('session.create', {projectId: project.id, title: '新对话'}) as Session;
      setSessionId(session.id);
      await onRefresh();
    });
  };

  const adoptProject = async (created: Project, message: string) => {
    await onRefresh();
    openProject(created.id);
    onNotice(message);
  };
  const createProject = (name: string, root: string) => run(async () => {
    const created = await api('project.create', {name, root}) as Project;
    await adoptProject(created, '项目已创建，可以在对话中下达审计任务。');
  });
  const createDemo = () => run(async () => {
    const created = await api('demo.create') as Project;
    await adoptProject(created, '已加载示例项目，可以直接体验任务流程。');
  });

  if (!project) {
    return <div className="shell">
      <Sidebar boot={boot} />
      <main className="main"><ProjectSetup busy={busy} onCreate={createProject} onDemo={createDemo} /></main>
    </div>;
  }

  return <div className="shell">
    <Sidebar
      boot={boot}
      project={project}
      sessionCount={sessions.length}
      view={view}
      historyOpen={historyOpen}
      busy={busy}
      onProject={openProject}
      onNewChat={newChat}
      onView={next => { setView(next); setHistoryOpen(false); }}
      onToggleHistory={() => setHistoryOpen(open => !open)}
    />
    <main className="main">
      {view === 'project'
        ? <ProjectSetup busy={busy} onCreate={createProject} onDemo={createDemo} onBack={showChat} />
        : <>
          <ChatHeader project={project} record={record} busy={busy} onNewChat={newChat} />
          {view === 'settings'
            ? <SettingsView boot={boot} onRefresh={onRefresh} onNotice={onNotice} onClose={showChat} />
            : <ChatView
              boot={boot}
              project={project}
              sessionId={sessionId}
              record={record}
              reload={reload}
              draft={draft}
              setDraft={setDraft}
              busy={busy}
              setBusy={setBusy}
              onRefresh={onRefresh}
              onError={onError}
              onNotice={onNotice}
            />}
        </>}
      {historyOpen && <HistoryPanel
        sessions={sessions}
        selectedId={sessionId}
        busy={busy}
        onSelect={openSession}
        onClose={() => setHistoryOpen(false)}
      />}
    </main>
  </div>;
}
