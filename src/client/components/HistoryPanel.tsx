import React, {useEffect, useState} from 'react';
import {Search, X} from 'lucide-react';
import {shortTime, statusLabel, statusTone} from '../lib/format';
import type {Session} from '../types';

interface Props {
  sessions: Session[];
  selectedId: string;
  busy: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function HistoryPanel({sessions, selectedId, busy, onSelect, onClose}: Props) {
  const [query, setQuery] = useState('');
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const needle = query.trim().toLowerCase();
  const visible = needle ? sessions.filter(item => item.title.toLowerCase().includes(needle)) : sessions;
  return <aside className="drawer agent-history-panel" aria-label="历史对话">
    <div className="panel-head">
      <strong>历史对话</strong>
      <button className="icon-button" aria-label="关闭历史对话" onClick={onClose}><X size={16} /></button>
    </div>
    <label className="search">
      <Search size={15} />
      <input aria-label="搜索历史对话" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索对话" autoFocus />
    </label>
    <div className="history-list">
      {visible.map(item => {
        const status = item.streaming ? 'running' : item.agentStatus;
        return <button
          key={item.id}
          disabled={busy}
          className={'history-row agent-history-row' + (item.id === selectedId ? ' selected' : '')}
          aria-current={item.id === selectedId ? 'true' : undefined}
          onClick={() => onSelect(item.id)}
        >
          <span className="history-title">{item.title}</span>
          <small><i className={'dot tone-' + statusTone(status)} />{item.streaming ? '正在处理' : statusLabel(item.agentStatus) || '尚未执行'} · {shortTime(item.updatedAt || item.createdAt)}</small>
        </button>;
      })}
      {!visible.length && <p className="muted empty">{sessions.length ? '没有匹配的对话。' : '还没有对话。'}</p>}
    </div>
  </aside>;
}
