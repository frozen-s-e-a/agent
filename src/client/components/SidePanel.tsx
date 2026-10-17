import React, {useEffect, useState} from 'react';
import {ChevronRight, Eye, File, Folder, Loader2, RefreshCw, X} from 'lucide-react';
import {api} from '../api';
import {errorMessage} from '../lib/format';
import {AUTO_RESUME_PREFIX, buildTurns} from '../lib/turns';
import {useWorkspace} from '../lib/workspace';
import {ResultCard} from './Turn';
import type {FileEntry, Project, SessionRecord} from '../types';

export type PanelTab = 'files' | 'results';

interface Props {
  project: Project;
  record: SessionRecord | null;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  scope: string[];
  onScope: (value: string[]) => void;
  onClose: () => void;
}

/** Project material the Agent can read, and every result this conversation produced. */
export function SidePanel({project, record, tab, onTab, scope, onScope, onClose}: Props) {
  const outputs = record ? buildTurns(record).filter(turn => turn.tasks.some(task => task.result?.outputs?.length)) : [];
  const count = outputs.reduce((sum, turn) => sum + turn.tasks.reduce((n, task) => n + (task.result?.outputs?.length || 0), 0), 0);
  return <aside className="side-panel" aria-label="项目资料与成果">
    <div className="panel-tabs" role="tablist">
      <button role="tab" aria-selected={tab === 'files'} className={tab === 'files' ? 'active' : ''} onClick={() => onTab('files')}>项目资料</button>
      <button role="tab" aria-selected={tab === 'results'} className={tab === 'results' ? 'active' : ''} onClick={() => onTab('results')}>本对话成果{count > 0 && <span className="tab-count">{count}</span>}</button>
      <button className="icon-button small" aria-label="收起侧栏" onClick={onClose}><X size={14} /></button>
    </div>
    {tab === 'files'
      ? <FilesTab key={project.id} project={project} scope={scope} onScope={onScope} />
      : <div className="panel-body">
        {!outputs.length && <p className="muted empty">这个对话还没有产出文件。</p>}
        {outputs.map(turn => <div key={turn.id} className="result-group">
          <p className="result-group-title">{(turn.run?.objective || turn.request?.text || '').replace(AUTO_RESUME_PREFIX, '').split('。')[0]}</p>
          {turn.tasks.filter(task => task.result?.outputs?.length).map(task => <ResultCard key={task.id} task={task} />)}
        </div>)}
      </div>}
  </aside>;
}

function FilesTab({project, scope, onScope}: {project: Project; scope: string[]; onScope: (value: string[]) => void}) {
  const [version, setVersion] = useState(0);
  const toggle = (path: string) => onScope(scope.includes(path) ? scope.filter(item => item !== path) : [...scope, path]);
  return <div className="panel-body files">
    <div className="files-note">
      <p className="muted small">勾选后，下一条任务只使用勾选的文件或文件夹；不勾选时，Agent 可以读取全部项目资料。</p>
      <div className="files-tools">
        {scope.length > 0 && <button className="link-button" onClick={() => onScope([])}>清除勾选（{scope.length}）</button>}
        <button className="icon-button small" aria-label="刷新资料列表" title="刷新" onClick={() => setVersion(version + 1)}><RefreshCw size={13} /></button>
      </div>
    </div>
    <FileTree key={version} project={project} path="" depth={0} scope={scope} onToggle={toggle} />
  </div>;
}

function FileTree({project, path, depth, scope, onToggle}: {project: Project; path: string; depth: number; scope: string[]; onToggle: (path: string) => void}) {
  const {openPreview} = useWorkspace();
  const [entries, setEntries] = useState<FileEntry[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState('');
  useEffect(() => {
    api('files.list', {projectId: project.id, path}).then(setEntries).catch(reason => setError(errorMessage(reason)));
  }, [project.id, path]);
  const preview = async (entry: FileEntry) => {
    setLoading(entry.path);
    try { openPreview({...await api('files.preview', {projectId: project.id, file: entry.path}), name: entry.path}); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setLoading(''); }
  };

  if (error) return <p className="inline-error small" style={{paddingLeft: depth * 14 + 8}}>{error}</p>;
  if (!entries) return <p className="muted small tree-loading" style={{paddingLeft: depth * 14 + 8}}><Loader2 size={12} className="spin" />读取中…</p>;
  if (!entries.length) return <p className="muted small" style={{paddingLeft: depth * 14 + 8}}>空文件夹</p>;
  const sorted = [...entries].sort((a, b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name, 'zh'));
  return <ul className="tree">
    {sorted.map(entry => <li key={entry.path}>
      <div className={'tree-row' + (scope.includes(entry.path) ? ' checked' : '')} style={{paddingLeft: depth * 14 + 4}}>
        {entry.directory
          ? <button className="tree-toggle" aria-label={(open[entry.path] ? '收起 ' : '展开 ') + entry.name} onClick={() => setOpen({...open, [entry.path]: !open[entry.path]})}><ChevronRight size={13} className={open[entry.path] ? 'chevron open' : 'chevron'} /></button>
          : <span className="tree-toggle" />}
        <input type="checkbox" aria-label={`限定使用 ${entry.path}`} checked={scope.includes(entry.path)} onChange={() => onToggle(entry.path)} />
        {entry.directory ? <Folder size={14} className="tree-icon" /> : <File size={14} className="tree-icon" />}
        <span className="tree-name" title={entry.path}>{entry.name}</span>
        {!entry.directory && <button className="icon-button small tree-preview" aria-label={`预览 ${entry.name}`} title="预览" disabled={loading === entry.path} onClick={() => preview(entry)}>
          {loading === entry.path ? <Loader2 size={13} className="spin" /> : <Eye size={13} />}
        </button>}
      </div>
      {entry.directory && open[entry.path] && <FileTree project={project} path={entry.path} depth={depth + 1} scope={scope} onToggle={onToggle} />}
    </li>)}
  </ul>;
}
