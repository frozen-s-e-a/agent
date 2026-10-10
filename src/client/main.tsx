import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2, Sparkles, X } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { api } from './api';
import { ProjectWorkbench } from './ProjectWorkbench';
import type { Boot, Project, Tool } from './types';
import './style.css';

function App() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const report = useCallback((value: unknown) => {
    const message = typeof value === 'object' && value !== null && 'message' in value
      ? String((value as { message?: unknown }).message)
      : String(value);
    setError(message);
  }, []);

  const notify = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(current => current === message ? '' : current), 3600);
  }, []);

  const refresh = useCallback(async () => {
    const result = await api('bootstrap') as Boot;
    setBoot(result);
    return result;
  }, []);

  useEffect(() => {
    let alive = true;
    api('bootstrap').then(result => {
      if (!alive) return;
      const next = result as Boot;
      setBoot(next);
      setProjectId(next.projects[0]?.id || '');
    }).catch(errorValue => { if (alive) report(errorValue); });
    return () => { alive = false; };
  }, [report]);

  const createProject = useCallback(async (name: string, root: string) => {
    const project = await api('project.create', { name, root }) as Project;
    const next = await refresh();
    setProjectId(next.projects.find(item => item.id === project.id)?.id || project.id);
    notify('项目已创建，可以开始选择审计任务。');
  }, [notify, refresh]);

  const createDemo = useCallback(async () => {
    const project = await api('demo.create') as Project;
    const next = await refresh();
    setProjectId(next.projects.find(item => item.id === project.id)?.id || project.id);
    notify('已加载示例项目，可以直接体验任务流程。');
  }, [notify, refresh]);

  if (!boot) {
    return <div className="new-loading"><div className="new-loading-mark"><Sparkles size={21} /></div><Loader2 className="spin" size={24} /><strong>正在打开审计工作台</strong>{error && <p>{error}</p>}</div>;
  }

  const project = boot.projects.find(item => item.id === projectId) || boot.projects[0];
  const allTools: Tool[] = [...(boot.tools || []), ...(boot.legacyTools || [])].reduce<Tool[]>((items, tool) => items.some(item => item.id === tool.id) ? items : [...items, tool], []);

  return <div className="new-app-root">
    <ProjectWorkbench
      boot={boot}
      initialProject={project}
      allTools={allTools}
      onRefresh={refresh}
      onSelectProject={selected => setProjectId(selected.id)}
      onCreateProject={createProject}
      onDemo={createDemo}
      onError={report}
      onNotice={notify}
    />
    {(error || notice) && <div className="redesign-notifications">{error && <div className="banner error" role="alert"><AlertCircle size={17} /><span>{error}</span><button className="icon-btn" aria-label="关闭错误提示" onClick={() => setError('')}><X size={15} /></button></div>}{notice && <div className="banner success" role="status"><Check size={17} /><span>{notice}</span><button className="icon-btn" aria-label="关闭通知" onClick={() => setNotice('')}><X size={15} /></button></div>}</div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
