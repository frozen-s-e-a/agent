import React, {useEffect, useState} from 'react';
import {FolderOpen, PlayCircle, Trash2, X} from 'lucide-react';
import {api} from '../api';
import {errorMessage} from '../lib/format';
import type {Project} from '../types';

/** Name and folder for a new project; also offers the bundled sample project. */
export function ProjectForm({onCreated, submitLabel = '建立项目'}: {onCreated: (project: Project) => void; submitLabel?: string}) {
  const [name, setName] = useState('');
  const [root, setRoot] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ready = !!name.trim() && !!root.trim();

  const perform = async (work: () => Promise<Project>) => {
    setBusy(true);
    setError('');
    try { onCreated(await work()); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
  };
  const choose = async () => {
    const value = await api('choose.directory') as string | null;
    if (!value) return;
    setRoot(value);
    if (!name.trim()) setName(value.split(/[\\/]/).filter(Boolean).at(-1) || '');
  };

  return <form className="stack" onSubmit={event => { event.preventDefault(); if (ready && !busy) perform(() => api('project.create', {name: name.trim(), root: root.trim()})); }}>
    <label className="field"><span>资料目录</span>
      <span className="input-group">
        <input aria-label="资料目录" value={root} onChange={event => setRoot(event.target.value)} placeholder="存放本项目底稿和资料的文件夹" />
        <button type="button" className="button" onClick={() => choose().catch(reason => setError(errorMessage(reason)))}><FolderOpen size={15} />选择</button>
      </span>
    </label>
    <label className="field"><span>项目名称</span>
      <input aria-label="项目名称" value={name} onChange={event => setName(event.target.value)} placeholder="例如：华东制造 2026 年审" />
    </label>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <div className="form-actions">
      <button type="button" className="button ghost" disabled={busy} onClick={() => perform(() => api('demo.create'))}><PlayCircle size={15} />打开示例项目</button>
      <button type="submit" className="button primary" disabled={busy || !ready}>{submitLabel}</button>
    </div>
  </form>;
}

interface DialogProps {
  project?: Project;
  canRemove: boolean;
  onCreated: (project: Project) => void;
  onRenamed: () => void;
  onRemoved: (project: Project) => void;
  onClose: () => void;
}

/** Create a project, or rename / remove the current one. */
export function ProjectDialog({project, canRemove, onCreated, onRenamed, onRemoved, onClose}: DialogProps) {
  const [name, setName] = useState(project?.name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const perform = async (work: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await work(); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
  };
  const rename = () => perform(async () => { await api('project.rename', {id: project!.id, name}); onRenamed(); });
  const remove = () => perform(async () => {
    if (!window.confirm(`从应用中移除「${project!.name}」及其全部对话记录？资料目录里的文件不会被删除。`)) return;
    await api('project.remove', {id: project!.id});
    onRemoved(project!);
  });

  return <div className="backdrop" onClick={onClose}>
    <div className="dialog narrow" role="dialog" aria-modal="true" aria-label={project ? '管理项目' : '新建项目'} onClick={event => event.stopPropagation()}>
      <div className="panel-head">
        <strong className="dialog-title">{project ? '管理项目' : '新建项目'}</strong>
        <button className="icon-button" aria-label="关闭" onClick={onClose}><X size={16} /></button>
      </div>
      {project ? <form className="stack" onSubmit={event => { event.preventDefault(); if (name.trim() && !busy) rename(); }}>
        <label className="field"><span>项目名称</span><input aria-label="项目名称" value={name} autoFocus onChange={event => setName(event.target.value)} /></label>
        <div className="field"><span>资料目录</span><code className="path">{project.root}</code></div>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="button danger-ghost" disabled={busy || !canRemove} title={canRemove ? '' : '至少保留一个项目'} onClick={remove}><Trash2 size={14} />移除项目</button>
          <button type="submit" className="button primary" disabled={busy || !name.trim() || name.trim() === project.name}>保存名称</button>
        </div>
      </form> : <ProjectForm onCreated={onCreated} />}
    </div>
  </div>;
}
