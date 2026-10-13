import React, {useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {AlertTriangle, CheckCircle2, ChevronRight, Circle, CircleDashed, Eye, ExternalLink, FileText, History, Loader2, MessageCircleQuestion, Paperclip, Play, RotateCcw, Sparkles, XCircle} from 'lucide-react';
import {api} from '../api';
import {fullTime, isResumable, shortTime, statusLabel, statusTone} from '../lib/format';
import {AUTO_RESUME_PREFIX, toolName, type Turn as TurnData} from '../lib/turns';
import {useWorkspace} from '../lib/workspace';
import type {AgentQuestion, AgentRun, Attachment, PlanStep, SessionRecord, Task, TaskOutput, TextEvent, ToolCall} from '../types';

interface Props {
  turn: TurnData;
  record: SessionRecord;
  latest: boolean;
  attachments: Attachment[];
  onReload: () => Promise<unknown>;
}

/** One request and the Agent's whole response to it, with its results and audit trail underneath. */
export function Turn({turn, record, latest, attachments, onReload}: Props) {
  const {run, request} = turn;
  const live = latest && !!record.streaming;
  const autoResume = !!run?.resumeOf && !!request?.text.startsWith(AUTO_RESUME_PREFIX);
  const openQuestions = (run?.questions || []).filter(question => question.status === 'open');
  const asking = latest && !live && run?.status === 'waiting_for_user' && openQuestions.length > 0;
  const activeTask = latest ? record.tasks.find(task => task.agentRunId === run?.id && ['queued', 'running', 'cancelling'].includes(task.status)) : undefined;

  return <section className="turn">
    {request && (autoResume
      ? <div className="turn-marker"><RotateCcw size={13} />继续上次任务 · {shortTime(request.at)}</div>
      : <Request event={request} />)}
    {run && !!run.plan?.steps.length && <PlanCard run={run} live={live} />}
    {turn.blocks.map(block => block.kind === 'steps'
      ? <StepGroup key={block.id} calls={block.calls} />
      : <Message key={block.event.id} event={block.event} />)}
    {live && <div className="live" aria-busy="true">
      <div className="avatar agent"><Sparkles size={14} /></div>
      <div className="live-body">
        <span className="live-phase"><Loader2 size={14} className="spin" />{record.phase || 'Agent 正在分析…'}</span>
        <details className="live-explanation"><summary>查看当前处理说明</summary><p>{record.turn || '正在处理资料…'}</p></details>
      </div>
    </div>}
    {activeTask && <div className="task-progress"><Loader2 size={15} className="spin" /><span>{activeTask.phase || '审计程序正在执行…'}</span><small>写入成果后会显示在这一轮下面。</small></div>}
    {asking && <QuestionCard run={run!} questions={openQuestions} attachments={attachments} onReload={onReload} />}
    {turn.tasks.map(task => <ResultCard key={task.id} task={task} onReload={onReload} />)}
    {run && !live && latest && !asking && isResumable(run.status) && <ResumeBar run={run} attachments={attachments} onReload={onReload} />}
    {run && !live && <RunTrail run={run} record={record} />}
  </section>;
}

function Request({event}: {event: Extract<TextEvent, {type: 'user'}>}) {
  const scope = [...(event.projectFiles || []), ...(event.attachments || []).map(item => item.name)];
  return <article className="message from-user">
    <div className="bubble">
      <div className="message-meta">任务要求<time>{shortTime(event.at)}</time></div>
      <div className="markdown"><p>{event.text}</p></div>
      {scope.length > 0 && <div className="request-scope"><Paperclip size={12} />{scope.slice(0, 4).join('、')}{scope.length > 4 && ` 等 ${scope.length} 项`}</div>}
    </div>
  </article>;
}

export function Message({event}: {event: TextEvent}) {
  const {onError} = useWorkspace();
  if (event.type === 'error') {
    return <div className="message-error" role="note">
      <AlertTriangle size={16} />
      <div><strong>这次处理没有完成</strong><p>{event.text}</p></div>
    </div>;
  }
  return <article className="message from-agent">
    <div className="avatar agent"><Sparkles size={14} /></div>
    <div className="bubble">
      <div className="message-meta">审计 Agent<time>{shortTime(event.at)}</time></div>
      <div className="markdown">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{a: ({href, children}) => <button className="text-link" onClick={() => api('link.open', {url: href}).catch(onError)}>{children}</button>}}
        >{event.text || ''}</ReactMarkdown>
      </div>
    </div>
  </article>;
}

const STEP_ICON: Record<string, React.ReactNode> = {
  running: <Loader2 size={14} className="spin" />,
  succeeded: <CheckCircle2 size={14} />,
  completed: <CheckCircle2 size={14} />,
  failed: <XCircle size={14} />,
  pending: <Circle size={14} />,
};

/** The saved plan: every audit program the Agent intends to run, in order, with live status. */
function PlanCard({run, live}: {run: AgentRun; live: boolean}) {
  const {toolNames} = useWorkspace();
  const steps = run.plan!.steps;
  const done = steps.filter(step => ['succeeded', 'completed'].includes(step.status)).length;
  return <section className="card plan-card" aria-label="执行计划">
    <header className="plan-head">
      <strong>执行计划</strong>
      <span className="muted">{done} / {steps.length} 步完成</span>
      <span className="plan-bar"><i style={{width: `${steps.length ? done / steps.length * 100 : 0}%`}} /></span>
    </header>
    <ol className="plan-steps">
      {steps.map((step: PlanStep, index) => {
        const status = live || step.status !== 'running' ? step.status : 'pending';
        return <li key={step.id} className={'tone-' + statusTone(status)}>
          <span className="plan-icon">{STEP_ICON[status] || <CircleDashed size={14} />}</span>
          <span className="plan-index">{index + 1}</span>
          <span className="plan-name">{toolName(toolNames, step.toolId)}</span>
          {!!step.files?.length && <small className="plan-files">{step.files.join('、')}</small>}
          <small className="plan-status">{statusLabel(status)}</small>
        </li>;
      })}
    </ol>
  </section>;
}

/** Execution updates do not change the user's expansion choice. */
function StepGroup({calls}: {calls: ToolCall[]}) {
  const running = calls.some(call => call.status === 'running');
  const failed = calls.filter(call => statusTone(call.status) === 'danger').length;
  const [open, setExpanded] = useState(false);
  const current = calls.filter(call => call.status === 'running').at(-1);
  return <div className={'steps' + (open ? ' open' : '')}>
    <button className="steps-head" aria-expanded={open} onClick={() => setExpanded(!open)}>
      <ChevronRight size={14} className="chevron" />
      {running ? <Loader2 size={13} className="spin" /> : <i className={'dot tone-' + (failed ? 'warning' : 'success')} />}
      <span className="steps-title">本地步骤 · {calls.length}</span>
      <small className="steps-note" title={current?.label || current?.name}>{running ? (current?.label || current?.name || '执行中') + '…' : failed > 0 ? `${failed} 个步骤未完成` : '步骤已完成'}</small>
    </button>
    {open && <ol className="steps-list">
      {calls.map(call => <li key={call.id} className={'tone-' + statusTone(call.status)}>
        <i className="dot" />
        <span>{call.label || call.name || '执行本地步骤'}</span>
        <small>{statusLabel(call.status)}</small>
      </li>)}
    </ol>}
  </div>;
}

/** Open questions from the Agent as a form; the answers resume the same task. */
function QuestionCard({run, questions, attachments, onReload}: {run: AgentRun; questions: AgentQuestion[]; attachments: Attachment[]; onReload: () => Promise<unknown>}) {
  const {onError} = useWorkspace();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const ready = questions.every(question => answers[question.id]?.trim());
  const submit = async () => {
    setBusy(true);
    try {
      const text = '补充说明：\n' + questions.map((question, index) => `${index + 1}. ${question.text}\n回答：${answers[question.id].trim()}`).join('\n');
      await api('agent.resume', {id: run.id, text, attachments: attachments.map(item => item.id)});
      await onReload();
    } catch (error) { onError(error); } finally { setBusy(false); }
  };
  return <section className="card question-card agent-question-card" aria-label="需要你补充">
    <header className="card-head">
      <span className="card-icon warning"><MessageCircleQuestion size={16} /></span>
      <div><strong>需要你补充</strong><p className="muted">回答后 Agent 会接着这次任务继续，已完成的步骤不会重做。</p></div>
    </header>
    <form className="stack" onSubmit={event => { event.preventDefault(); if (ready && !busy) submit(); }}>
      {questions.map((question, index) => <label key={question.id} className="field question">
        <span>{questions.length > 1 ? `${index + 1}. ` : ''}{question.text}</span>
        <textarea rows={2} aria-label={`回答：${question.text}`} value={answers[question.id] || ''} onChange={event => setAnswers({...answers, [question.id]: event.target.value})} placeholder="在这里填写" />
      </label>)}
      <div className="form-actions">
        <small className="muted">也可以直接在下方输入框回复。</small>
        <button type="submit" className="button primary" disabled={!ready || busy}>{busy && <Loader2 size={14} className="spin" />}提交回答</button>
      </div>
    </form>
  </section>;
}

function ResumeBar({run, attachments, onReload}: {run: AgentRun; attachments: Attachment[]; onReload: () => Promise<unknown>}) {
  const {onError} = useWorkspace();
  const [busy, setBusy] = useState(false);
  const resume = async () => {
    setBusy(true);
    try { await api('agent.resume', {id: run.id, attachments: attachments.map(item => item.id)}); await onReload(); } catch (error) { onError(error); } finally { setBusy(false); }
  };
  return <div className={'resume tone-' + statusTone(run.status)}>
    <span>{statusLabel(run.status)}，已保存资料和执行结果。</span>
    <button className="button" disabled={busy} onClick={resume}><Play size={14} aria-hidden="true" />继续任务</button>
  </div>;
}

/** Files one audit program produced, or why it produced none. */
export function ResultCard({task, onReload}: {task: Task; onReload?: () => Promise<unknown>}) {
  const {onError, openPreview, toolNames} = useWorkspace();
  const [busy, setBusy] = useState(false);
  const outputs = task.result?.outputs || [];
  const perform = async (work: () => Promise<void>) => {
    setBusy(true);
    try { await work(); } catch (error) { onError(error); } finally { setBusy(false); }
  };
  const preview = (output: TaskOutput) => perform(async () => {
    const value = await api('result.preview', {id: task.id, name: output.name, path: output.path});
    openPreview({...value, name: output.name});
  });
  const open = (output: TaskOutput) => perform(async () => { await api('result.open', {id: task.id, name: output.name, path: output.path}); });
  const retry = () => perform(async () => { await api('task.retry', {id: task.id}); await onReload?.(); });
  if (!outputs.length && !['failed', 'interrupted', 'cancelled'].includes(task.status)) return null;

  return <section className="card result-card agent-result-card">
    <header className="card-head">
      <span className={'card-icon' + (outputs.length ? '' : ' danger')}><FileText size={16} aria-hidden="true" /></span>
      <div>
        <strong>{toolName(toolNames, task.tool)}</strong>
        <p className="muted">
          {outputs.length ? (task.validationStatus === 'passed' ? '执行与文件完整性检查通过' : '成果已保留，请查看实际验证状态') : task.error || '这一步没有产出成果'}
          {task.result?.inputRows !== undefined && ` · 输入 ${task.result.inputRows} 行`}
          {task.result?.rowCount !== undefined && ` · 输出 ${task.result.rowCount} 行`}
        </p>
      </div>
      <span className={'pill tone-' + statusTone(task.status)}><i className="dot" />{statusLabel(task.status)}</span>
    </header>
    {outputs.length > 0 && <ul className="file-list">
      {outputs.map((output, index) => <li className="file-row agent-result-file" key={output.path || output.name + index}>
        <FileType name={output.name} />
        <span className="file-name">{output.name}</span>
        <button className="button small ghost" disabled={busy} onClick={() => preview(output)}><Eye size={14} aria-hidden="true" />预览</button>
        <button className="button small ghost" disabled={busy} onClick={() => open(output)}><ExternalLink size={14} aria-hidden="true" />打开成果</button>
      </li>)}
    </ul>}
    {!!task.result?.warnings?.length && <details className="warnings">
      <summary>查看 {task.result.warnings.length} 条提示</summary>
      {task.result.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
    </details>}
    {!outputs.length && onReload && <div className="card-actions"><button className="button small" disabled={busy} onClick={retry}><RotateCcw size={13} />重试这一步</button></div>}
  </section>;
}

/** What the run read and did, kept with the turn so every result can be traced back. */
function RunTrail({run, record}: {run: AgentRun; record: SessionRecord}) {
  const {onError, openPreview} = useWorkspace();
  const previewInput = async (inputId: string, name: string) => {
    try {
      const value = await api('agent.sourcePreview', {sessionId: record.id, id: run.id, inputId});
      openPreview({...value, name});
    } catch (error) { onError(error); }
  };
  return <details className="run-trail agent-run-records">
    <summary><ChevronRight size={14} className="chevron" /><History size={14} />执行记录与资料来源<small>{fullTime(run.startedAt || run.createdAt)} · {statusLabel(run.status)}</small></summary>
    <div className="agent-run-record">
      {run.steps.length > 0 && <ol className="record-steps">
        {run.steps.map(step => <li key={step.id} className={'tone-' + statusTone(step.status)}>
          <i className="dot" />
          <span>{record.calls.find(call => call.id === step.callId)?.label || step.name}</span>
          <small>{statusLabel(step.status)}</small>
          {step.result?.error && <p className="step-error">{step.result.error}</p>}
        </li>)}
      </ol>}
      <details className="sources">
        <summary><ChevronRight size={13} className="chevron" />本次资料来源（{run.inputs.length}）</summary>
        {run.inputs.map(input => <button className="source-row agent-source-row" key={input.id} onClick={() => previewInput(input.id, input.path)}>
          <FileText size={14} aria-hidden="true" /><span>{input.path}</span><Eye size={14} aria-hidden="true" />
        </button>)}
      </details>
      {!!run.changedInputs?.length && <p className="changed-note">原资料有变化：{run.changedInputs.join('、')}。本次成果对应已保存的快照。</p>}
    </div>
  </details>;
}

/** Extension badge, coloured by family so tables, workbooks and data files are told apart at a glance. */
export function FileType({name}: {name: string}) {
  const ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] || 'file').toLowerCase();
  const family = ['xlsx', 'xlsm', 'xls'].includes(ext) ? 'sheet' : ['csv', 'tsv', 'txt'].includes(ext) ? 'text' : ['parquet', 'duckdb', 'json'].includes(ext) ? 'data' : ['pdf', 'docx', 'doc'].includes(ext) ? 'doc' : 'other';
  return <span className={'file-type type-' + family} aria-hidden="true">{ext.slice(0, 4).toUpperCase()}</span>;
}
