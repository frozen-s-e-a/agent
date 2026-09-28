import React from 'react';
import { X, Search, RefreshCw, Folder, FileSpreadsheet, FileText, ChevronRight, Check, ShieldCheck, ArrowUpRight, ArrowLeft, Zap, Database, SlidersHorizontal, Loader2 } from 'lucide-react';
import { DataTable } from './components/DataTable';
import type { Tool } from './types';

interface ToolParameterModalProps {
  tool: Tool | null;
  project: { id: string; name: string; root: string } | undefined;
  files: any[];
  folder: string;
  selected: string[];
  params: Record<string, string>;
  setParams: (p: Record<string, string>) => void;
  advanced: string;
  setAdvanced: (a: string) => void;
  preview: any;
  mode: string;
  onModeChange: (m: string) => void;
  boot: any;
  busy: boolean;
  onFolderChange: (f: string) => void;
  onSelectFile: (path: string) => void;
  onRefresh: () => void;
  onRunTool: () => void;
  onCancel: () => void;
  onLoadPreview: () => void;
  onDemo: () => Promise<void>;
}

const modes: Record<string, string> = {
  auto: '自动', 'local-light': '轻量本地', 'local-batch': '大批量',
};

export function ToolParameterModal({
  tool, project, files, folder, selected, params, setParams, advanced, setAdvanced, preview,
  mode, onModeChange, boot, busy, onFolderChange, onSelectFile, onRefresh,
  onRunTool, onCancel, onLoadPreview, onDemo,
}: ToolParameterModalProps) {
  if (!tool) return null;

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <section className="modal parameter-modal" role="dialog" aria-modal="true" aria-label={tool.name}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">LOCAL AUDIT TOOL</span>
            <h2>{tool.name}</h2>
          </div>
          <button className="icon-btn" onClick={onCancel}><X size={20}/></button>
        </div>
        <p className="muted">{tool.description}</p>
        <div className="parameter-scroll">
          {project ? (
            <>
              {/* Step 1: Select files */}
              <div className="parameter-section">
                <h3><span>01</span>选择输入文件<small>{selected.length} 项已选择</small></h3>
                <div className="file-breadcrumb">
                  <button className="icon-btn" title="返回上级" disabled={!folder}
                    onClick={() => onFolderChange(folder.split(/[\\/]/).slice(0, -1).join('/'))}>
                    <ArrowLeft size={15}/>
                  </button>
                  <span title={folder}>{folder || '项目根目录'}</span>
                  <button className="icon-btn" title="刷新文件" onClick={onRefresh}>
                    <RefreshCw size={14}/>
                  </button>
                </div>
                <div className="file-list">
                  {files.map((f: any) => (
                    <div className={'file-row ' + (selected.includes(f.path) ? 'chosen' : '')} key={f.path}>
                      {f.directory ? (
                        <button onClick={() => onFolderChange(f.path)}>
                          <Folder size={17}/><span>{f.name}</span><ChevronRight size={14}/>
                        </button>
                      ) : (
                        <label>
                          <input type="checkbox" checked={selected.includes(f.path)}
                            onChange={() => onSelectFile(f.path)}/>
                          {/\.(?:xlsx?|csv)$/i.test(f.name) ? <FileSpreadsheet size={17}/> : <FileText size={17}/>}
                          <span title={f.path}>{f.name}</span>
                          <small>{f.size < 1024 ? '1 KB' : Math.round(f.size / 1024) + ' KB'}</small>
                        </label>
                      )}
                    </div>
                  ))}
                  {!files.length && <p className="muted empty-small">此文件夹暂无可选文件</p>}
                </div>
                {selected.length > 0 && (
                  <div className="selected-chips">
                    {selected.map(f => (
                      <button key={f} onClick={() => onSelectFile(f)}>
                        {f.split(/[\\/]/).at(-1)}<X size={11}/>
                      </button>
                    ))}
                  </div>
                )}
                <button className="secondary" disabled={!selected.length || busy} onClick={onLoadPreview}>
                  <Search size={14}/>预览首个文件与字段
                </button>
                {preview && (
                  <>
                    <div className="preview-label">{preview.sheet} · 前 {preview.preview.length} 行预览</div>
                    <DataTable columns={preview.columns} rows={preview.preview}/>
                  </>
                )}
              </div>

              {/* Step 2: Parameters */}
              <div className="parameter-section">
                <h3><span>02</span>确认字段与参数</h3>
                <datalist id="column-names">
                  {preview?.columns.map((c: string) => <option key={c} value={c}/>)}</datalist>
                <div className="field-grid">
                  {tool.fields.map(f => (
                    <label key={f.key}>
                      {f.label}{f.required && <b className="required"> *</b>}
                      <input list="column-names" value={params[f.key] || ''}
                        placeholder={f.default || '输入实际字段或参数'}
                        onChange={e => setParams({ ...params, [f.key]: e.target.value })}/>
                    </label>
                  ))}
                </div>
                {!tool.fields.length && <p className="muted">此工具无需额外业务参数。</p>}
                {tool.id === 'jet_test' && (
                  <div className="rule-options">
                    {boot.jetRules.map((r: any) => (
                      <label key={r.name} title={JSON.stringify(r.conditions)}>
                        <input type="checkbox" checked={(params.rules || '').split(',').includes(r.name)}
                          onChange={e => {
                            let rs = (params.rules || '').split(',').filter(Boolean);
                            setParams({ ...params, rules: (e.target.checked ? [...rs, r.name] : rs.filter(x => x !== r.name)).join(',') });
                          }}/>{r.name}
                      </label>
                    ))}
                  </div>
                )}
                <details className="advanced">
                  <summary><SlidersHorizontal size={14}/>高级参数（表头、工作表、字段映射）</summary>
                  <p>使用 JSON 对象。JET 借贷不平须提供 keys；规则覆盖使用 ruleOverrides。</p>
                  <textarea aria-label="高级参数" value={advanced}
                    onChange={e => setAdvanced(e.target.value)}/>
                </details>
              </div>

              {/* Step 3: Mode & output */}
              <div className="parameter-section">
                <h3><span>03</span>处理方式与输出</h3>
                <div className="mode-cards">
                  {Object.entries(modes).map(([k, v]) => (
                    <button key={k} className={mode === k ? 'active' : ''}
                      onClick={() => onModeChange(k)}>
                      {k === 'local-batch' ? <Database size={17}/> : <Zap size={17}/>}
                      <span>{v}</span>
                      {mode === k && <Check size={14}/>}
                    </button>
                  ))}
                </div>
                <p className="muted">结果另存为 Excel / 分卷 CSV / Parquet，带来源索引与校验清单。复杂原模板、全部参数分支尚未通过迁移验收。</p>
              </div>
            </>
          ) : (
            <div className="no-project">
              <Folder size={32}/>
              <h3>先选择项目文件夹</h3>
              <p>本地工具需要明确的文件工作范围。</p>
              <button className="primary" onClick={onCancel}>创建项目</button>
              <button className="text-tool" onClick={async () => { onCancel(); await onDemo(); }}>使用合成示例</button>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <span className="muted"><ShieldCheck size={15}/>原文件保持不变</span>
          <button className="primary" disabled={busy || !project || !selected.length} onClick={onRunTool}>
            {busy ? <Loader2 className="spin" size={16}/> : <ArrowUpRight size={16}/>}
            确认并执行
          </button>
        </div>
      </section>
    </div>
  );
}