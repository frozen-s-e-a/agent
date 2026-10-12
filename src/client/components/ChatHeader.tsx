import React from 'react';
import {Loader2, Plus} from 'lucide-react';
import {isActiveTask, statusLabel, statusTone} from '../lib/format';
import type {Project, SessionRecord} from '../types';

export function ChatHeader({project, record, busy, onNewChat}: {project: Project; record: SessionRecord | null; busy: boolean; onNewChat: () => void}) {
  const latestRun = record?.agentRuns?.at(-1);
  const taskRunning = record?.tasks?.some(task => isActiveTask(task.status));
  const [tone, label] = record?.streaming ? ['running', 'Agent 正在处理']
    : taskRunning ? ['running', '本地步骤执行中']
    : latestRun ? [statusTone(latestRun.status), statusLabel(latestRun.status)]
    : ['neutral', '随时可以下达任务'];
  return <header className="topbar agent-topbar">
    <div className="topbar-title">
      <span className="eyebrow">{project.name}</span>
      <h1>{record?.title || '审计任务对话'}</h1>
    </div>
    <div className="topbar-actions">
      <span className={'pill tone-' + tone}>{tone === 'running' ? <Loader2 size={13} className="spin" /> : <i className="dot" />}{label}</span>
      <button className="icon-button" aria-label="新建对话" title="新建对话" disabled={busy} onClick={onNewChat}><Plus size={18} /></button>
    </div>
  </header>;
}
