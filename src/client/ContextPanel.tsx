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
