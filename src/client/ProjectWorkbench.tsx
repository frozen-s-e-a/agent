import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ArrowRight, BookOpenCheck, Check, ChevronRight, Clock3, Command, FileSpreadsheet, FileText, Folder, FolderOpen, History, LayoutTemplate, Loader2, MoreHorizontal, Plus, Search, Settings2, Star, X} from 'lucide-react';
import {api} from './api';
import {DataPreview, Dialog, statusLabel, Workflow} from './Workflow';
import {Settings} from './RedesignedApp';
import {WorkbenchOperation, type OpenWork} from './WorkbenchOperation';
import {actionTitle, baseName, extension, fileKind, searchActions, sizeLabel, suggestedActions} from './workbenchActions';
import {TASK_DEFINITIONS, type TaskDefinition} from './taskDefinitions';
import type {Boot, FileSystemEntry, Project, Session, TaskCard, Tool} from './types';
import './project-workbench.css';

interface Props {
  boot: Boot; initialProject?: Project; allTools: Tool[]; onRefresh: () => Promise<Boot>;
  onSelectProject: (p: Project) => void; onCreateProject: (name: string, root: string) => Promise<void>;
  onDemo: () => Promise<void>; onError: (e: unknown) => void; onNotice: (s: string) => void;
}
type Activity = {sessions: Session[]; tasks: TaskCard[]};
type PaletteContext = {sources: string[]; sessionId?: string; query?: string};
const active = (s: string) => ['running', 'queued', 'cancelling'].includes(s);
const time = (value?: string) => value ? new Date(value).toLocaleString('zh-CN', {month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) : '';
function readFavorites() { try { return JSON.parse(localStorage.getItem('workbench-favorites') || '[]') as string[]; } catch { return []; } }

function ActionPalette({tools, context, favorites, onFavorite, onChoose, onClose}: {
  tools: Tool[]; context: PaletteContext; favorites: string[]; onFavorite: (id: string) => void;
  onChoose: (tool: Tool) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState(context.query || ''), [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null), list = useRef<HTMLDivElement>(null);
  const options = searchActions(tools, query, context.sources, favorites);
  useEffect(() => { const frame = requestAnimationFrame(() => input.current?.focus()); return () => cancelAnimationFrame(frame); }, []);
  useEffect(() => { setCursor(0); }, [query]);
  return <Dialog title="开始一项工作" onClose={onClose}><div className="wb-palette">
    <div className="wb-palette-search"><Search size={21}/><input ref={input} aria-label="搜索操作" role="combobox" aria-controls="workbench-actions" aria-expanded="true" aria-autocomplete="list" aria-activedescendant={options[cursor] ? 'action-' + options[cursor].id : undefined} value={query} onChange={e => setQuery(e.target.value)} placeholder="例如：下载招股书、核对流水、提取列" onKeyDown={e => {
      if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); const next = Math.max(0, Math.min(options.length - 1, cursor + (e.key === 'ArrowDown' ? 1 : -1))); setCursor(next); list.current?.children[next]?.scrollIntoView({block: 'nearest'}); }
      if (e.key === 'Enter' && options[cursor]) { e.preventDefault(); onChoose(options[cursor]); }
    }}/>{query && <button aria-label="清空搜索" onClick={() => {setQuery(''); input.current?.focus();}}><X size={16}/></button>}</div>
    <div className="wb-palette-context"><span>{context.sources.length ? `当前已选 ${context.sources.length} 项资料，按操作需要使用` : '可以查询、下载资料，也可以选择文件进行处理'}</span><small>{options.length} 项操作</small></div>
    <div className="wb-command-list" role="listbox" aria-label="操作搜索结果" id="workbench-actions" ref={list}>{options.map((tool, i) => <div role="option" aria-selected={cursor === i} id={'action-' + tool.id} className={'wb-command-option ' + (cursor === i ? 'focused' : '')} key={tool.id}>
      <button className="wb-command-choice" data-tool={tool.id} onClick={() => onChoose(tool)}><span className="wb-command-icon">{tool.id.includes('ipo') || tool.id.includes('announcement') ? <FolderOpen size={19}/> : tool.contract?.inputMode === 'none' ? <Search size={19}/> : <FileSpreadsheet size={19}/>}</span><span><strong>{actionTitle(tool)}</strong><small>{tool.description.replace(/^[^—]* — /, '').slice(0,110)}</small></span><ArrowRight size={17}/></button>
      <button className={'wb-star ' + (favorites.includes(tool.id) ? 'saved' : '')} aria-label={(favorites.includes(tool.id) ? '取消收藏 ' : '收藏 ') + actionTitle(tool)} aria-pressed={favorites.includes(tool.id)} onClick={() => onFavorite(tool.id)}><Star size={16}/></button>
    </div>)}</div>{!options.length && <div className="wb-empty">没有找到操作，试试工具名称或资料类型。</div>}
    <footer className="wb-palette-footer"><span>↑ ↓ 选择操作</span><span>Enter 打开</span><span>Esc 返回</span></footer>
  </div></Dialog>;
}

export function ProjectWorkbench({boot, initialProject: project, allTools, onRefresh, onSelectProject, onCreateProject, onDemo, onError, onNotice}: Props) {
  const [view, setView] = useState('workspace'), [folder, setFolder] = useState(''), [entries, setEntries] = useState<FileSystemEntry[]>([]), [selected, setSelected] = useState<string[]>([]);
  const [activity, setActivity] = useState<Activity>({sessions: [], tasks: []}), [loading, setLoading] = useState(false), [fileQuery, setFileQuery] = useState('');
  const [palette, setPalette] = useState<PaletteContext | null>(null), [favorites, setFavorites] = useState(readFavorites), [work, setWork] = useState<OpenWork | null>(null);
  const [templateWork, setTemplateWork] = useState<{id: string; definition: TaskDefinition; project: Project} | null>(null);
  const [create, setCreate] = useState(false), [name, setName] = useState(''), [root, setRoot] = useState(''), [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any>(), [previewFile, setPreviewFile] = useState(''), [reading, setReading] = useState(false), [fileError, setFileError] = useState('');
  const previewRequest = useRef(0);
  const reload = useCallback(async () => {
    if (!project) return;
    const data = await api('project.activity', {projectId: project.id}); setActivity(data);
  }, [project?.id]);
  const refresh = async () => { await onRefresh(); await reload(); };
  useEffect(() => { setFolder(''); setSelected([]); setPreview(undefined); setWork(null); setTemplateWork(null); setView('workspace'); }, [project?.id]);
  useEffect(() => {
    if (!project) {setEntries([]); return;}
    let alive = true; setLoading(true); setFileError('');
    api('files.list', {projectId: project.id, path: folder}).then(data => alive && setEntries(data)).catch(e => alive && setFileError(e.message)).finally(() => alive && setLoading(false));
    return () => {alive = false;};
  }, [project?.id, folder, activity.tasks.map(t => t.id + t.status).join(',')]);
  useEffect(() => { reload().catch(onError); }, [reload, boot.sessions.length]);
  useEffect(() => {
    if (!activity.tasks.some(t => active(t.status))) return;
    const timer = window.setInterval(() => reload().catch(onError), 1500);
    return () => clearInterval(timer);
  }, [activity.tasks.some(t => active(t.status)), reload]);
  useEffect(() => { const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {e.preventDefault(); setPalette({sources: work?.sources || selected, sessionId: work?.sessionId});} }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [selected, work]);
  const perform = async (fn: () => Promise<any>) => { setBusy(true); try {await fn();} catch (e) {onError(e);} finally {setBusy(false);} };
  const toggleFavorite = (id: string) => setFavorites(current => {const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id]; localStorage.setItem('workbench-favorites', JSON.stringify(next)); return next;});
  const chooseAction = (tool: Tool, context = palette || {sources: selected}) => {
    if (!project) {setCreate(true); setPalette(null); onNotice('先建立项目，操作和成果会保存到项目中'); return;}
    setWork({tool, sources: tool.contract?.inputMode === 'none' ? [] : context.sources, sessionId: context.sessionId}); setPalette(null); setPreview(undefined);
  };
  const openTask = (task: TaskCard) => {
    const tool = allTools.find(t => t.id === task.tool);
    if (!tool) {onError(Error('此记录的操作已不在工具列表中')); return;}
    setWork({tool, sources: task.files, sessionId: task.sessionId, taskId: task.id}); setTemplateWork(null);
  };
  const openSession = (session: Session) => perform(async () => {
    if (session.workflow && project) {const definition = TASK_DEFINITIONS.find(d => d.id === session.workflow.definitionId); if (definition) {setTemplateWork({id: session.id, definition, project}); return;}}
    const task = activity.tasks.filter(t => t.sessionId === session.id).at(-1);
    if (task) openTask(task);
  });
  const inspect = async (file: string) => {
    if (!project) return;
    const request = ++previewRequest.current; setReading(true); setPreviewFile(file); setPreview(undefined); setFileError('');
    try {const data = await api('files.preview', {projectId: project.id, file}); if (request === previewRequest.current) setPreview(data);}
    catch (e: any) {if (request === previewRequest.current) setFileError(e.message);} finally {if (request === previewRequest.current) setReading(false);}
  };
  const select = (entry: FileSystemEntry, event?: React.MouseEvent | React.KeyboardEvent) => {
    if (entry.directory) {setFolder(entry.path); setSelected([]); setPreview(undefined); return;}
    if (event?.ctrlKey || event?.metaKey || event?.shiftKey) setSelected(current => current.includes(entry.path) ? current.filter(x => x !== entry.path) : [...current, entry.path]);
    else setSelected([entry.path]);
  };
  const recommendations = suggestedActions(allTools, selected, preview?.columns?.map((x: any) => typeof x === 'string' ? x : x.name));
  const sortedEntries = entries.filter(x => x.name.toLowerCase().includes(fileQuery.toLowerCase())).sort((a, b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name, 'zh-CN'));
  const sessionTime = (s: Session) => activity.tasks.filter(t => t.sessionId === s.id).at(-1)?.createdAt || s.updatedAt || (s as any).createdAt || '';
  const sessions = activity.sessions.filter(s => activity.tasks.some(t => t.sessionId === s.id) || s.workflow).slice().sort((a, b) => sessionTime(b).localeCompare(sessionTime(a)));
  const outputs = activity.tasks.flatMap(task => (task.result?.outputs || []).map((output, index) => ({task, output, key: task.id + ':' + index, path: output.path || `${task.result!.outputDir}/${output.name}`}))).reverse();
  const templates = [{id: 'monthly', name: '月间分析', description: '确认字段与科目，生成月度汇总，继续分析变动原因。', steps: '预览资料 → 确认口径 → 分析 → 复核'}, {id: 'ledger', name: '会计分录测试', description: '检查账簿字段，选择规则与阈值，筛选需要复核的分录。', steps: '检查数据 → 配置规则 → 执行测试 → 复核'}, {id: 'workpaper', name: '明细底稿生成', description: '把源数据与底稿模板对应，校验配置后生成底稿。', steps: '检查源与模板 → 配置映射 → 校验 → 生成'}];
  const openTemplate = (id: string) => perform(async () => {
    if (!project) {setCreate(true); return;}
    const definition = TASK_DEFINITIONS.find(d => d.id === id)!;
    const r = await api('workflow.create', {projectId: project.id, definitionId: id});
    if (selected.length) await api('workflow.save', {id: r.session.id, files: selected});
    setTemplateWork({id: r.session.id, definition, project}); await refresh();
  });
  const recentRows = (limit?: number) => <div className="wb-records">{sessions.slice(0, limit).map(session => {
    const runs = activity.tasks.filter(t => t.sessionId === session.id), task = runs.at(-1);
    return <button className="wb-record" key={session.id} onClick={() => openSession(session)}><span className="wb-record-icon"><History size={18}/></span><span className="wb-record-title"><strong>{session.title.replace('审计任务 · ', '')}</strong><small>{runs.length} 次处理{task?.files.length ? `，使用 ${task.files.length} 项资料` : ''}</small></span><span className={'wb-status ' + (task?.status || '')}>{session.workflow?.status === 'archived' ? '已归档' : statusLabel(task?.status || 'pending')}</span><small className="wb-record-time">{time(task?.createdAt)}</small><ChevronRight size={17}/></button>;
  })}{!sessions.length && <div className="wb-empty compact">处理资料后，工作记录会保存在这里。</div>}</div>;

  return <div className="wb-shell"><aside className="wb-sidebar">
    <div className="wb-brand"><BookOpenCheck size={25}/><strong>审计工作台</strong></div>
    <div className="wb-project-switch"><span>当前项目</span><select aria-label="当前项目" value={project?.id || ''} onChange={e => {const p = boot.projects.find(x => x.id === e.target.value); if (p) onSelectProject(p);}}><option value="" disabled>选择项目</option>{boot.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button onClick={() => setCreate(true)}><Plus size={14}/>新建项目</button></div>
    <nav aria-label="项目导航">{[{id: 'workspace', label: '资料工作台', Icon: FolderOpen}, {id: 'history', label: '工作记录', Icon: History}, {id: 'results', label: '成果文件', Icon: FileSpreadsheet}, {id: 'templates', label: '工作模板', Icon: LayoutTemplate}].map(({id, label, Icon}) => <button key={id} aria-current={view === id && !work && !templateWork ? 'page' : undefined} className={view === id && !work && !templateWork ? 'active' : ''} onClick={() => {setView(id); setWork(null); setTemplateWork(null);}}><Icon size={18}/>{label}{id === 'history' && sessions.length > 0 && <span>{sessions.length}</span>}</button>)}</nav>
    <div className="wb-favorites"><div><span>常用操作</span><Star size={13}/></div>{favorites.length ? favorites.map(id => allTools.find(t => t.id === id)).filter((t): t is Tool => Boolean(t)).map(tool => <button key={tool.id} onClick={() => chooseAction(tool, {sources: selected})}>{actionTitle(tool)}<ChevronRight size={13}/></button>) : <p>在操作搜索中收藏，随时从这里打开。</p>}</div>
    <div className="wb-sidebar-footer"><button className={view === 'settings' ? 'active' : ''} onClick={() => {setView('settings'); setWork(null); setTemplateWork(null);}}><Settings2 size={17}/>运行设置</button><small>{boot.preview ? '交互预览' : '本地工作空间'}<span>{boot.version.replace('0.1.0-internal.', '版本 ')}</span></small></div>
  </aside><div className="wb-page"><header className="wb-topbar"><div><Folder size={16}/><span>{project?.name || '创建项目，开始工作'}</span>{boot.preview && <span className="wb-preview-badge">示例资料</span>}</div><button className="wb-global-search" onClick={() => setPalette({sources: selected})}><Search size={16}/><span>搜索操作</span><kbd>Ctrl K</kbd></button></header>
    {templateWork ? <div className="wb-template-work"><Workflow key={templateWork.id} {...templateWork} boot={boot} allTools={allTools} onError={onError} onNotice={onNotice} onBack={() => {setTemplateWork(null); refresh().catch(onError);}}/></div> : work && project ? <WorkbenchOperation key={`${project.id}:${work.tool.id}:${work.sessionId || 'new'}:${work.taskId || 'draft'}`} work={work} project={project} boot={boot} tools={allTools} onBack={() => {setWork(null); refresh().catch(onError);}} onChooseAction={(sources, sessionId) => setPalette({sources, sessionId})} onOpenTask={openTask} onRefresh={refresh} onError={onError} onNotice={onNotice}/> : <main className="wb-main">
      <header className="wb-page-heading"><div><h1>{({workspace: '资料工作台', history: '工作记录', results: '成果文件', templates: '工作模板', settings: '运行设置'} as any)[view]}</h1><p>{({workspace: '从资料开始，处理、核查，再把成果用于下一项工作。', history: '查看做过的工作，沿着已有结果继续。', results: '每份成果都保留来源，可以预览、打开或继续处理。', templates: '复杂工作按步骤展开，简单操作随时单独使用。', settings: '配置模型服务与本机运行环境。'} as any)[view]}</p></div>{view !== 'settings' && <button className="primary wb-start" onClick={() => setPalette({sources: selected})}><Plus size={17}/>开始工作</button>}</header>
      {!project && <section className="wb-first-project"><FolderOpen size={32}/><h2>把资料放进一个项目</h2><p>项目会保存你的资料范围、处理过程和生成的成果。</p><div><button className="primary" onClick={() => setCreate(true)}>建立项目</button><button disabled={busy} onClick={() => perform(onDemo)}>打开示例项目</button></div></section>}
      {view === 'workspace' && <>
        <button className="wb-intent-entry" onClick={() => setPalette({sources: selected})}><span className="wb-intent-icon"><Command size={22}/></span><span><strong>这次想做什么？</strong><small>下载招股书、核对流水、整理表格……搜索后直接开始</small></span><kbd>Ctrl K</kbd><ArrowRight size={19}/></button>
        <section className="wb-materials"><div className="wb-section-head"><div><h2>项目资料 <span>{entries.length}</span></h2><div className="wb-breadcrumb"><button onClick={() => {setFolder(''); setSelected([]);}}>项目目录</button>{folder && <><ChevronRight size={13}/><span>{folder.replace(/\\/g, ' / ')}</span></>}</div></div><label className="wb-file-search"><Search size={15}/><input aria-label="筛选资料" placeholder="查找资料" value={fileQuery} onChange={e => setFileQuery(e.target.value)}/></label></div>
          <div className={'wb-context-actions ' + (selected.length ? 'has-selection' : '')}><div className="wb-selection-label">{selected.length ? <><span className="wb-selection-dot"/><strong role="status">已选 {selected.length} 项资料</strong><button aria-label="取消资料选择" onClick={() => setSelected([])}><X size={15}/></button></> : <span>选择资料后，这里会出现适合的操作</span>}</div><div className="wb-recommended">{(selected.length ? recommendations.slice(0, 3) : []).map(tool => <button key={tool.id} onClick={() => chooseAction(tool, {sources: selected})}>{actionTitle(tool)}</button>)}<button onClick={() => setPalette({sources: selected})}>{selected.length ? '更多操作' : '浏览全部操作'}<MoreHorizontal size={16}/></button></div></div>
          {fileError && <p className="wb-inline-error" role="alert">{fileError}</p>}<div className="wb-material-table"><table><thead><tr><th>名称</th><th>类型</th><th>大小</th><th><span className="wb-table-hint">Ctrl / Shift 多选</span></th></tr></thead><tbody>{sortedEntries.map(entry => <tr key={entry.path} tabIndex={0} aria-selected={selected.includes(entry.path)} className={selected.includes(entry.path) ? 'selected' : ''} onClick={e => select(entry, e)} onKeyDown={e => {if (['Enter', ' '].includes(e.key)) {e.preventDefault(); select(entry, e);}}}>
            <td><span className={'wb-file-icon ' + (entry.directory ? 'folder' : /\.(xlsx|csv|xlsm)$/.test(entry.name) ? 'spreadsheet' : '')}>{entry.directory ? <Folder size={20}/> : /\.(xlsx|csv|xlsm)$/.test(entry.name) ? <FileSpreadsheet size={20}/> : <FileText size={20}/>}</span><span className="wb-file-name"><strong>{entry.name}</strong><small>{/输出|成果|output/i.test(entry.path) ? '处理成果' : /序时/.test(entry.name) ? '账簿资料' : /流水/.test(entry.name) ? '银行资料' : entry.directory ? '项目内目录' : '原始资料'}</small></span></td><td>{fileKind(entry)}</td><td>{entry.directory ? '—' : sizeLabel(entry.size)}</td><td><button onClick={e => {e.stopPropagation(); if (entry.directory) select(entry); else {setSelected([entry.path]); inspect(entry.path);}}}>{entry.directory ? '打开' : '预览'}<ChevronRight size={14}/></button></td>
          </tr>)}</tbody></table></div>{loading ? <div className="wb-reading"><Loader2 size={18} className="spin"/>正在读取项目资料…</div> : !sortedEntries.length && <div className="wb-empty">{project ? '当前目录没有匹配的资料。' : '建立项目后，在这里查看你的资料。'}</div>}
          <footer className="wb-material-footer"><span>资料来自项目目录</span><span>{project?.root || '尚未选择项目'}</span></footer>
        </section>
        {(reading || preview) && <section className="wb-source-preview"><div className="wb-section-head"><div><h2>{baseName(previewFile)}</h2><span>资料预览</span></div><button aria-label="关闭预览" onClick={() => {previewRequest.current++; setPreview(undefined); setReading(false);}}><X size={17}/></button></div>{reading ? <div className="wb-reading"><Loader2 size={18} className="spin"/>正在读取资料…</div> : preview?.text ? <pre>{preview.text}</pre> : <DataPreview data={preview}/>}</section>}
        <section className="wb-recent"><div className="wb-section-head"><h2>最近的工作</h2><button className="wb-text-button" onClick={() => setView('history')}>全部记录<ArrowRight size={15}/></button></div>{recentRows(3)}</section>
        <div className="wb-template-shortcut"><LayoutTemplate size={19}/><span>经常重复的复杂工作，可以从工作模板开始。</span><button className="wb-text-button" onClick={() => setView('templates')}>查看模板<ArrowRight size={15}/></button></div>
      </>}
      {view === 'history' && recentRows()}
      {view === 'results' && <section className="wb-all-results"><div className="wb-result-count">共 {outputs.length} 份成果</div>{outputs.map(({task, output, key, path}) => <div className="wb-result-file" key={key}><span className="wb-file-icon result"><FileText size={21}/></span><span><strong>{output.name}</strong><small>{actionTitle(allTools.find(t => t.id === task.tool))}　{time(task.createdAt)}</small></span><button onClick={() => openTask(task)}>查看来源</button><button onClick={() => perform(() => api('result.open', {id: task.id, name: output.name, path: output.path}))}>打开</button><button className="wb-continue" onClick={() => setPalette({sources: [path], sessionId: task.sessionId})}>继续处理<ArrowRight size={14}/></button></div>)}{!outputs.length && <div className="wb-empty">运行操作后，真实生成的文件会显示在这里。</div>}</section>}
      {view === 'templates' && <div className="wb-templates">{templates.map(t => <section key={t.id}><span className="wb-template-symbol"><LayoutTemplate size={23}/></span><div><h2>{t.name}</h2><p>{t.description}</p><span>{t.steps}</span></div><button disabled={busy} onClick={() => openTemplate(t.id)}>使用模板<ArrowRight size={16}/></button></section>)}<p className="wb-template-note">模板中的每次执行都会留存资料、参数和结果，关键配置与成果由你确认。</p></div>}
      {view === 'settings' && <Settings boot={boot} onRefresh={onRefresh} onError={onError} onNotice={onNotice}/>}
    </main>}
  </div>
  {palette && <ActionPalette tools={allTools} context={palette} favorites={favorites} onFavorite={toggleFavorite} onChoose={tool => chooseAction(tool)} onClose={() => setPalette(null)}/>}
  {create && <Dialog title="建立项目" onClose={() => !busy && setCreate(false)}><div className="project-form"><label>项目名称<input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="例如：华东制造 2026 年审"/></label><label>资料目录<div className="path-control"><input value={root} onChange={e => setRoot(e.target.value)} placeholder="选择资料所在目录"/><button onClick={() => perform(async () => {const dir = await api('choose.directory'); if (dir) setRoot(dir);})}>选择目录</button></div></label><button className="primary" disabled={busy || !name.trim() || !root.trim()} onClick={() => perform(async () => {await onCreateProject(name.trim(), root.trim()); setCreate(false); setName(''); setRoot('');})}>建立项目</button></div></Dialog>}
  </div>;
}
