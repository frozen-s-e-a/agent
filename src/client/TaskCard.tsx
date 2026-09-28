import React, { useState } from 'react';
import {
  Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, ExternalLink,
  ChevronRight, ChevronDown, RefreshCw, Folder, Clock, ShieldCheck, Square,
} from 'lucide-react';
import { DataTable } from './components/DataTable';

interface TaskCardProps {
  task: any;
  tools: any[];
  onError: (e: any) => void;
}

const taskStatus: Record<string, string> = {
  queued: '排队中', running: '执行中', cancelling: '正在停止',
  cancelled: '已取消', failed: '执行失败', interrupted: '待恢复', succeeded: '已完成',
};

export function TaskCard({ task: t, tools, onError }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [pathNote, setPathNote] = useState('');
  if (!t) return null;
  const running = ['queued', 'running', 'cancelling'].includes(t.status);
  const tool = tools.find((x: any) => x.id === t.tool);

  const open = async (name = '') => {
    try {
      const result = await (window as any).audit?.invoke('result.open', { id: t.id, name });
      if (typeof result === 'string') setPathNote(result);
    } catch (e) { onError(e); }
  };

  return (
    <div className={'task-card ' + t.status}>
      <div className="task-card-heading">
        <div className="task-symbol">
          {running ? <Loader2 className="spin" size={19}/> :
            t.status === 'succeeded' ? <CheckCircle2 size={19}/> : <AlertCircle size={19}/>}
        </div>
        <div>
          <strong>{tool?.name || t.tool}</strong>
          <small>{taskStatus[t.status]} · {t.selectedMode || t.mode}{t.result?.durationSeconds !== undefined && ` · ${t.result.durationSeconds} 秒`}</small>
        </div>
        <span className={'pill ' + (t.status === 'succeeded' ? 'green' : running ? 'blue' : 'amber')}>
          {taskStatus[t.status]}
        </span>
      </div>

      {running && (
        <div className="task-progress">
          <div className="indeterminate"/>
          <p>{t.phase}{t.rows !== undefined && ` · 已处理 ${t.rows.toLocaleString()} 行`}</p>
          <button onClick={() => (window as any).audit?.invoke('task.cancel', { id: t.id }).catch(onError)}>
            <Square size={12}/>取消任务
          </button>
        </div>
      )}

      {t.error && <div className="task-error">{t.error}</div>}

      {t.result && (
        <>
          <div className="result-summary">
            <span><b>{t.result.inputRows.toLocaleString()}</b>{t.result.inputUnit || '输入记录'}</span>
            <span><b>{t.result.rowCount.toLocaleString()}</b>{t.result.resultUnit || '结果记录'}</span>
            <span><ShieldCheck size={16}/>已校验并发布</span>
          </div>
          {t.result.warningCount > 0 && (
            <div className="task-error">{t.result.warningCount} 条提示：{t.result.warnings[0]}</div>
          )}
          <div className="output-files">
            {t.result.outputs.map((f: any) => (
              <button key={f.name} onClick={() => open(f.name)}>
                <FileSpreadsheet size={18}/><span>{f.name}</span><ExternalLink size={13}/>
              </button>
            ))}
          </div>
          {!t.result.outputs.length && <p className="empty-small result-empty">此任务没有生成可下载文件，详细结果请查看下方预览。</p>}
          <button className="preview-toggle" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
            结果预览（前 {t.result.preview.length} 行 / 共 {t.result.rowCount} 行）
          </button>
          {expanded && <DataTable columns={t.result.columns} rows={t.result.preview}/>}
          <div className="result-note">内部规则实现结果 · 尚未完成原程序兼容验收 · 请复核</div>
        </>
      )}

      {pathNote && <div className="path-note">{pathNote}</div>}

      <details className="task-details">
        <summary>执行参数与来源</summary>
        <pre>{JSON.stringify({ 文件: t.files, 参数: t.parameters, 路由原因: t.reason, 任务编号: t.id }, null, 2)}</pre>
      </details>

      <div className="task-actions">
        <span><Clock size={12}/>{new Date(t.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
        {['failed', 'interrupted', 'cancelled'].includes(t.status) && (
          <button onClick={() => (window as any).audit?.invoke('task.retry', { id: t.id }).catch(onError)}>
            <RefreshCw size={13}/>重试
          </button>
        )}
        {t.result && (
          <button onClick={() => open()}><Folder size={13}/>打开结果文件夹</button>
        )}
      </div>
    </div>
  );
}
