import React, {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, CheckCircle2, FileText, FolderOpen, Loader2, Play, Plus, RotateCcw, Square, X} from 'lucide-react';
import {api} from './api';
import {DataPreview, FileChooser, ParameterForm, statusLabel} from './Workflow';
import {actionTitle, baseName, businessPreview, initialParameters} from './workbenchActions';
import type {Boot, Project, TaskCard, Tool, ToolField} from './types';

export interface OpenWork {tool: Tool; sources: string[]; sessionId?: string; taskId?: string}
const active = (s?: string) => ['running', 'queued', 'cancelling'].includes(s || '');

export function WorkbenchOperation({work, project, boot, tools, onBack, onChooseAction, onOpenTask, onRefresh, onError, onNotice}: {
  work: OpenWork; project: Project; boot: Boot; tools: Tool[]; onBack: () => void;
  onChooseAction: (sources: string[], sessionId?: string) => void; onOpenTask: (task: TaskCard) => void; onRefresh: () => Promise<void>;
  onError: (e: unknown) => void; onNotice: (s: string) => void;
}) {
  const tool = work.tool;
  const draftKey = `workbench-draft:${project.id}:${tool.id}:${work.sessionId || 'new'}`;
  const [files, setFiles] = useState<string[]>(work.sources);
  const [params, setParams] = useState<any>(() => {
    try { const draft = JSON.parse(localStorage.getItem(draftKey) || 'null'); if (draft && !work.taskId) return {...initialParameters(tool, work.sources), ...draft}; } catch {}
    return initialParameters(tool, work.sources);
  });
  const [sessionId, setSessionId] = useState(work.sessionId), [tasks, setTasks] = useState<TaskCard[]>([]), [selectedTask, setSelectedTask] = useState(work.taskId);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [picker, setPicker] = useState<ToolField | null>(null);
  const [preview, setPreview] = useState<any>(), [previewFile, setPreviewFile] = useState(''), [previewing, setPreviewing] = useState(false);
  const [ack, setAck] = useState(false), [editing, setEditing] = useState(!work.taskId);
  const [showSources, setShowSources] = useState(false);
  const live = useRef(true);
  const task = tasks.find(t => t.id === selectedTask) || tasks.filter(t => t.tool === tool.id).at(-1);
  const executing = busy || active(task?.status);
  const columns = (preview?.columns || []).map((c: any) => typeof c === 'string' ? c : c.name || c.column);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const reload = async (id = sessionId) => {
    if (!id) return;
    const data = await api('session.get', {id});
    if (live.current) setTasks(data.tasks);
  };
  useEffect(() => {
    if (!sessionId) return;
    let stopped = false;
    const poll = async () => { try { await reload(sessionId); } catch (e: any) { if (!stopped) setError(e.message); } };
    poll(); const timer = window.setInterval(poll, 1200);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [sessionId]);
  useEffect(() => {
    if (task && !active(task.status)) onRefresh().catch(onError);
  }, [task?.id, task?.status]);
  useEffect(() => {
    const safe = Object.fromEntries(Object.entries(params).filter(([k]) => !tool.fields.some(f => f.key === k && f.kind === 'secret')));
    localStorage.setItem(draftKey, JSON.stringify(safe));
  }, [params, draftKey]);
  useEffect(() => {
    if (work.taskId && task?.id === work.taskId) { setParams(task.parameters); setFiles(task.files); }
  }, [task?.id]);
  const perform = async (fn: () => Promise<any>) => { setBusy(true); setError(''); try { await fn(); } catch (e: any) { setError(e.message); } finally { if (live.current) setBusy(false); } };
  const inspect = async (file: string) => {
    setPreviewing(true); setPreviewFile(file); setPreview(undefined);
    try { const result = await api('files.preview', {projectId: project.id, file}); if (live.current) setPreview(result); }
    catch (e: any) { if (live.current) setError(e.message); } finally { if (live.current) setPreviewing(false); }
  };
  const run = () => perform(async () => {
    const session = sessionId ? {id: sessionId} : await api('session.create', {projectId: project.id, title: actionTitle(tool) + (files[0] ? ' · ' + baseName(files[0]) : '')});
    setSessionId(session.id);
    const t = await api('task.run', {sessionId: session.id, tool: tool.id, files, parameters: params, acknowledgeMutation: ack});
    setSelectedTask(t.id); setTasks(current => [...current, t]); setEditing(false); localStorage.removeItem(draftKey); await onRefresh();
  });
  const chooseFile = (file: string) => {
    if (picker?.key !== '$files') {
      const key = picker!.key;
      const value = picker?.type === 'array' ? [...new Set([...(params[key] || []), file])] : file;
      const next = {...params, [key]: value};
      if (tool.id === 'mcp_bankflowmerge' && Array.isArray(value)) for (const f of tool.fields.filter(f => f.type === 'array' && f.key !== 'file_paths')) next[f.key] = value.map((_: any, i: number) => params[f.key]?.[i] || (f.key === 'header_start_rows' ? '1' : f.key === 'header_start_cols' ? 'A' : ''));
      setParams(next);
    }
    setFiles(current => [...new Set([...current, file])]); setPicker(null);
  };
  const outputs = task?.result?.outputs || [];
  const outputPath = (output: {name: string; path?: string}) => output.path || `${task!.result!.outputDir}/${output.name}`;
  const canPreview = (file: string) => /\.(csv|tsv|xlsx|xlsm|parquet|json|txt|md|pdf|docx)$/i.test(file);
  const effectiveTool = ['mcp_ipo_sh', 'mcp_ipo_sz', 'mcp_ipo_bj'].includes(tool.id) ? {...tool, fields: tool.fields.map(f => f.key === 'update_mode' ? {...f, enum: ['项目', '文件']} : f)} : tool;
  const outputRow = (output: {name: string; path?: string}, i: number) => <div key={i}><div className="wb-file-icon result"><FileText size={20}/></div><span><strong>{output.name}</strong><small>来自本次处理</small></span>{canPreview(output.name) && <button onClick={() => inspect(outputPath(output))}>预览</button>}<button onClick={() => perform(() => api('result.open', {id: task!.id, name: output.name, path: output.path}))}>打开文件</button><button className="wb-continue" onClick={() => onChooseAction([outputPath(output)], sessionId)}>继续处理<ArrowRight size={14}/></button></div>;

  return <div className="wb-operation">
    <div className="wb-work-top"><button className="wb-back" onClick={onBack}><ArrowLeft size={17}/>返回工作台</button><span>{project.name}</span><span className="wb-save-note">{sessionId ? '记录自动保存' : '参数草稿已保存'}</span></div>
    <header className="wb-work-heading"><div><h1>{actionTitle(tool)}</h1><p>{tool.description.split(' — ').at(-1)}</p></div>{task && <span className={`wb-status ${task.status}`}>{active(task.status) && <Loader2 size={14} className="spin"/>}{statusLabel(task.status)}</span>}</header>
    {tasks.length > 1 && <nav className="wb-work-trail" aria-label="本项工作的处理过程">{tasks.map((t, i) => <React.Fragment key={t.id}>{i > 0 && <ArrowRight size={14}/>}<button className={t.id === selectedTask ? 'current' : ''} onClick={() => { if (t.tool === tool.id) { setSelectedTask(t.id); setEditing(false); } else onOpenTask(t); }}><span className={t.status === 'succeeded' ? 'trail-check' : ''}>{t.status === 'succeeded' ? <CheckCircle2 size={15}/> : i + 1}</span>{actionTitle(tools.find(x => x.id === t.tool))}</button></React.Fragment>)}</nav>}
    {error && <div className="wb-inline-error" role="alert">{error}<button aria-label="关闭错误" onClick={() => setError('')}><X size={15}/></button></div>}

    {(editing || !task) && <section className="wb-config-panel">
      <div className="wb-section-head"><div><h2>准备这项工作</h2><span>{tool.contract?.format}</span></div>{tool.contract?.dependency && <small>{tool.contract.dependency}</small>}</div>
      {tool.contract?.inputMode !== 'none' && <div className="wb-input-sources"><div><strong>使用的资料</strong><button disabled={executing} onClick={() => setPicker({key: '$files', label: '使用的资料', kind: 'path'})}><Plus size={15}/>添加资料</button></div>{files.length ? <ul>{files.map(file => <li key={file}><FileText size={16}/><span>{baseName(file)}<small>{file}</small></span><button onClick={() => inspect(file)} disabled={previewing}>预览</button><button aria-label={`移除 ${baseName(file)}`} disabled={executing} onClick={() => setFiles(files.filter(x => x !== file))}><X size={15}/></button></li>)}</ul> : <p>选择资料后再执行；可以使用项目内的文件或目录。</p>}</div>}
      {Boolean(tool.contract?.templates?.length) && <div className="wb-template-prepare"><FolderOpen size={17}/><span>这项操作使用配置模板</span><button disabled={executing} onClick={() => perform(async () => {
        const r = await api('templates.copy', {projectId: project.id, tool: tool.id}); setFiles(current => [...new Set([...current, ...r.files.map((f: any) => f.path)])]); if (tool.fields.some(f => f.key === 'config_file')) setParams((p: any) => ({...p, config_file: r.files[0].path})); onNotice('模板已放入项目，可以填写后执行');
      })}>准备配置模板</button></div>}
      <ParameterForm key={tool.id} tool={effectiveTool} params={params} onChange={(k, v) => setParams((p: any) => ({...p, [k]: v}))} onPick={setPicker} columns={columns} jetRules={boot.jetRules} disabled={executing} onPreview={inspect}/>
      {tool.contract?.mutates && <label className="wb-write-consent"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}/>已确认使用工作副本；此操作可能修改所选文件</label>}
      <footer className="wb-run-footer"><span>执行后保留本次资料、参数和成果记录</span><button className="primary" disabled={executing || (tool.contract?.mutates && !ack)} onClick={run}><Play size={16}/>{busy ? '正在提交…' : '开始处理'}</button></footer>
    </section>}

    {task && !editing && <section className="wb-result-panel">
      <div className="wb-section-head"><div><h2>{active(task.status) ? '正在处理资料' : task.status === 'succeeded' ? '本次工作成果' : '处理情况'}</h2><span>{new Date(task.createdAt).toLocaleString('zh-CN')}</span></div>{!active(task.status) && <button onClick={() => setEditing(true)}><RotateCcw size={15}/>调整参数</button>}</div>
      {active(task.status) && <div className="wb-running"><Loader2 size={28} className="spin"/><div><strong>{task.phase || '工具正在执行'}</strong><p>完成后，成果会出现在这里。可以返回工作台继续查看其他资料。</p></div><button disabled={busy} onClick={() => perform(() => api('task.cancel', {id: task.id}))}><Square size={14}/>停止</button></div>}
      {task.error && <p className="wb-inline-error" role="alert">{task.error}</p>}
      {task.status === 'succeeded' && <>
        <div className="wb-result-summary"><CheckCircle2 size={22}/><div><strong>处理完成</strong><span>{typeof task.result?.rowCount === 'number' ? `结果 ${task.result.rowCount.toLocaleString()} 行` : '已保存工具结果'}{outputs.length ? `，生成 ${outputs.length} 份成果` : ''}</span></div></div>
        <div className="wb-output-list">{outputs.filter(output => !output.name.endsWith('.parquet')).map(outputRow)}</div>
        {outputs.some(output => output.name.endsWith('.parquet')) && <details className="wb-additional-files"><summary>其他数据文件（{outputs.filter(output => output.name.endsWith('.parquet')).length}）</summary><div className="wb-output-list">{outputs.filter(output => output.name.endsWith('.parquet')).map(outputRow)}</div></details>}
        {task.result?.preview?.length ? <div className="wb-preview-options"><strong>数据预览</strong><button aria-pressed={showSources} onClick={() => setShowSources(!showSources)}>{showSources ? '隐藏来源列' : '显示来源列'}</button></div> : null}
        <DataPreview data={businessPreview(task.result, showSources)}/>
      </>}
      <details className="wb-run-details"><summary>查看输入、参数与工具原始返回</summary><strong>输入资料</strong><p>{task.files.join('、') || '本次操作不需要文件'}</p><pre>{JSON.stringify(task.parameters, null, 2)}</pre>{task.result?.content && <pre>{JSON.stringify(task.result.content, null, 2)}</pre>}</details>
      {!active(task.status) && <div className="wb-next-step"><span>继续使用本次资料开展其他工作</span><button onClick={() => onChooseAction(task.files, sessionId)}>选择下一项操作<ArrowRight size={16}/></button></div>}
    </section>}

    {(previewing || preview) && <section className="wb-source-preview"><div className="wb-section-head"><div><h2>{baseName(previewFile)}</h2><span>资料预览</span></div><button aria-label="关闭资料预览" onClick={() => {setPreview(undefined); setPreviewFile('');}}><X size={17}/></button></div>{previewing ? <div className="wb-reading"><Loader2 size={20} className="spin"/>正在读取资料…</div> : preview?.text ? <pre>{preview.text}</pre> : <DataPreview data={preview}/>}</section>}
    {picker && <FileChooser project={project} kind={picker.kind || 'path'} extensions={picker.key === 'config_file' ? ['.xlsx', '.xlsm'] : tool.contract?.extensions} onChoose={chooseFile} onClose={() => setPicker(null)}/>}</div>;
}
