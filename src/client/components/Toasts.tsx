import React from 'react';
import {AlertCircle, Check, X} from 'lucide-react';
import type {Toast} from '../hooks/useToasts';

export function Toasts({toasts, onDismiss}: {toasts: Toast[]; onDismiss: (id: number) => void}) {
  if (!toasts.length) return null;
  return <div className="toasts">
    {toasts.map(toast => <div key={toast.id} className={'toast ' + toast.tone} role={toast.tone === 'error' ? 'alert' : 'status'}>
      {toast.tone === 'error' ? <AlertCircle size={17} /> : <Check size={17} />}
      <span>{toast.text}</span>
      <button className="icon-button small" aria-label={toast.tone === 'error' ? '关闭错误提示' : '关闭通知'} onClick={() => onDismiss(toast.id)}><X size={14} /></button>
    </div>)}
  </div>;
}
