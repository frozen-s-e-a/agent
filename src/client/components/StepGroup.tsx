import React, {useState} from 'react';
import {ChevronRight, Loader2} from 'lucide-react';
import {statusLabel, statusTone} from '../lib/format';
import type {ToolCall} from '../types';

/** One turn's tool calls. Open while work is running; collapses to a summary once it finishes. */
export function StepGroup({calls}: {calls: ToolCall[]}) {
  const running = calls.some(call => call.status === 'running');
  const failed = calls.filter(call => statusTone(call.status) === 'danger').length;
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const open = expanded ?? running;
  const current = calls.filter(call => call.status === 'running').at(-1);
  return <div className={'steps' + (open ? ' open' : '')}>
    <button className="steps-head" aria-expanded={open} onClick={() => setExpanded(!open)}>
      <ChevronRight size={15} className="chevron" />
      {running ? <Loader2 size={14} className="spin" /> : <i className={'dot tone-' + (failed ? 'warning' : 'success')} />}
      <span>{running ? (current?.label || current?.name || '执行本地步骤') + '…' : `执行了 ${calls.length} 个本地步骤`}</span>
      {!running && failed > 0 && <small className="steps-note">{failed} 个步骤未完成</small>}
    </button>
    {open && <ol className="steps-list">
      {calls.map(call => <li key={call.id} className={'tone-' + statusTone(call.status)}>
        <i className="dot" />
        <span>{call.label || call.name || '执行本地步骤'}</span>
        <small>{statusLabel(call.status) || '执行记录'}</small>
        {call.status === 'running' && <Loader2 size={13} className="spin" />}
      </li>)}
    </ol>}
  </div>;
}
