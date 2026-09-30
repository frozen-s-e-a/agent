import React, { useState } from 'react';
import { AlertCircle, Check, ChevronDown, Clock3, Loader2, RotateCcw, Square } from 'lucide-react';
import type { Tool, ToolCall } from '../types';
import { islandStatus, toolDisplayName, toolNarrative } from '../toolNarrative';

interface ToolIslandProps {
  call: ToolCall | any;
  tools?: Tool[];
  onCancel?: (call: any) => void;
  onRetry?: (call: any) => void;
}

const statusIcon = {
  pending: Clock3,
  active: Loader2,
  success: Check,
  error: AlertCircle,
  cancelled: Square,
  expired: RotateCcw,
};

export function ToolIsland({ call, tools = [], onCancel, onRetry }: ToolIslandProps) {
  const [expanded, setExpanded] = useState(false);
  const status = islandStatus(call?.status);
  const Icon = statusIcon[status];
  const label = toolDisplayName(call, tools);
  const narrative = toolNarrative(call, tools);
  const detail = call?.result?.error || call?.result?.message || call?.result?.content?.[0]?.text;
  return (
    <article className={`tool-island island-${status} ${expanded ? 'is-expanded' : ''}`} aria-label={`${label}：${narrative}`}>
      <button className="island-main" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>
        <span className="island-status-icon"><Icon size={15} className={status === 'active' ? 'spin' : undefined} /></span>
        <span className="island-copy">
          <strong>{label}</strong>
          <span>{narrative}</span>
        </span>
        <ChevronDown size={14} className="island-chevron" />
      </button>
      {expanded && (
        <div className="island-detail">
          {detail && <p>{String(detail)}</p>}
          <div className="island-actions">
            {status === 'active' && onCancel && <button onClick={e => { e.stopPropagation(); onCancel(call); }}><Square size={12}/>停止</button>}
            {(status === 'error' || status === 'cancelled' || status === 'expired') && onRetry && <button onClick={e => { e.stopPropagation(); onRetry(call); }}><RotateCcw size={12}/>重试</button>}
          </div>
        </div>
      )}
    </article>
  );
}
