import React, {useState} from 'react';
import {ChevronRight, Eye, ExternalLink, FileText, History, Play} from 'lucide-react';
import {api} from '../api';
import {fullTime, isResumable, statusLabel, statusTone} from '../lib/format';
import {FilePreview} from './FilePreview';
import type {AgentRun, FilePreviewData, SessionRecord, SourceOrigin, Task, TaskOutput} from '../types';

interface Props {
  record: SessionRecord;
  onReload: () => Promise<unknown>;
  onError: (error: unknown) => void;
}

/** Results, resume control and the audit trail for the open conversation. */
export function RunPanel({record, onReload, onError}: Props) {
  const [preview, setPreview] = useState<FilePreviewData | null>(null);
  const [busy, setBusy] = useState(false);
  const runs = record.agentRuns || [];
  const latest = runs.at(-1);
  const withOutputs = (record.tasks || []).filter(task => task.result?.outputs?.length);

  const perform = async (work: () => Promise<void>) => {
    setBusy(true);
    try { await work(); } catch (error) { onError(error); } finally { setBusy(false); }
  };
  const resume = (run: AgentRun) => perform(async () => { await api('agent.resume', {id: run.id}); await onReload(); });
  const previewOutput = (task: Task, output: TaskOutput) => perform(async () => {
    const value = await api('result.preview', {id: task.id, name: output.name, path: output.path});
    setPreview({...value, name: output.name});
  });
  const openOutput = (task: Task, output: TaskOutput) => perform(async () => { await api('result.open', {id: task.id, name: output.name, path: output.path}); });
  const previewInput = (run: AgentRun, inputId: string, name: string) => perform(async () => {
    const value = await api('agent.sourcePreview', {sessionId: record.id, id: run.id, inputId});
    setPreview({...value, name});
  });
  const previewOrigin = (source: SourceOrigin) => perform(async () => {
    const value = await api('agent.sourcePreview', {sessionId: source.sessionId, id: source.runId, inputId: source.inputId, row: source.row, sheet: source.sheet, headerRow: source.headerRow});
    setPreview({...value, name: source.path});
  });

  return <div className="results">
    {latest && !record.streaming && isResumable(latest.status) && <div className={'resume tone-' + statusTone(latest.status)}>
      <span>{statusLabel(latest.status)}，已保存资料和执行结果。</span>
      <button className="button" disabled={busy} onClick={() => resume(latest)}><Play size={15} aria-hidden="true" />继续任务</button>
    </div>}

    {withOutputs.map(task => <section className="card result-card agent-result-card" key={task.id}>
      <header className="card-head">
        <span className="card-icon"><FileText size={16} aria-hidden="true" /></span>
        <div>
          <strong>任务成果</strong>
          <p className="muted">
            {task.validationStatus === 'passed' ? '执行与文件完整性检查通过' : '阶段成果已保留，请查看实际验证状态'}
            {task.result?.inputRows !== undefined && ` · 输入 ${task.result.inputRows} 行`}
            {task.result?.rowCount !== undefined && ` · 输出 ${task.result.rowCount} 行`}
          </p>
        </div>
        <span className={'pill tone-' + statusTone(task.status)}><i className="dot" />{statusLabel(task.status)}</span>
      </header>
      <ul className="file-list">
        {task.result!.outputs!.map((output, index) => <li className="file-row agent-result-file" key={output.path || output.name + index}>
          <FileType name={output.name} />
          <span className="file-name">{output.name}</span>
          <button className="button small ghost" disabled={busy} onClick={() => previewOutput(task, output)}><Eye size={14} aria-hidden="true" />预览</button>
          <button className="button small ghost" disabled={busy} onClick={() => openOutput(task, output)}><ExternalLink size={14} aria-hidden="true" />打开成果</button>
        </li>)}
      </ul>
      {!!task.result?.warnings?.length && <details className="warnings">
        <summary>查看 {task.result.warnings.length} 条提示</summary>
        {task.result.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
      </details>}
    </section>)}

    {runs.length > 0 && <details className="card records agent-run-records">
      <summary><ChevronRight size={15} className="chevron" /><History size={15} />执行记录与资料来源（{runs.length} 次）</summary>
      {runs.slice().reverse().map(run => <section className="record agent-run-record" key={run.id}>
        <header className="record-head">
          <span className={'pill tone-' + statusTone(run.status)}><i className="dot" />{statusLabel(run.status)}</span>
          <small className="muted">{fullTime(run.startedAt || run.createdAt)}</small>
        </header>
        <p className="record-objective">{run.objective}</p>
        <ol className="record-steps">
          {run.steps.map(step => <li key={step.id} className={'tone-' + statusTone(step.status)}>
            <i className="dot" />
            <span>{record.calls?.find(call => call.id === step.callId)?.label || step.name}</span>
            <small>{statusLabel(step.status)}</small>
            {step.result?.error && <p className="step-error">{step.result.error}</p>}
          </li>)}
        </ol>
        <details className="sources">
          <summary><ChevronRight size={14} className="chevron" />本次资料来源（{run.inputs.length}）</summary>
          {run.inputs.map(input => <button className="source-row agent-source-row" key={input.id} disabled={busy} onClick={() => previewInput(run, input.id, input.path)}>
            <FileText size={14} aria-hidden="true" /><span>{input.path}</span><Eye size={14} aria-hidden="true" />
          </button>)}
        </details>
        {!!run.changedInputs?.length && <p className="changed-note">原资料有变化：{run.changedInputs.join('、')}。本次成果对应已保存快照。</p>}
        {isResumable(run.status) && <button className="button small" disabled={busy || record.streaming} onClick={() => resume(run)}><Play size={14} aria-hidden="true" />继续这次任务</button>}
      </section>)}
    </details>}

    {preview && <FilePreview value={preview} onClose={() => setPreview(null)} onSource={previewOrigin} />}
  </div>;
}

/** Extension badge, coloured by family so tables, workbooks and data files are told apart at a glance. */
function FileType({name}: {name: string}) {
  const ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] || 'file').toLowerCase();
  const family = ['xlsx', 'xlsm', 'xls'].includes(ext) ? 'sheet' : ['csv', 'tsv', 'txt'].includes(ext) ? 'text' : ['parquet', 'duckdb', 'json'].includes(ext) ? 'data' : ['pdf', 'docx', 'doc'].includes(ext) ? 'doc' : 'other';
  return <span className={'file-type type-' + family} aria-hidden="true">{ext.slice(0, 4).toUpperCase()}</span>;
}
