import React, {useLayoutEffect, useRef} from 'react';
import {CircleStop, FolderOpen, Paperclip, Send, X} from 'lucide-react';
import type {Attachment} from '../types';

interface Props {
  projectName: string;
  draft: string;
  setDraft: (value: string) => void;
  attachments: Attachment[];
  disabled: boolean;
  working: boolean;
  onSend: () => void;
  onStop: () => void;
  onAttach: () => void;
  onRemoveAttachment: (id: string) => void;
}

const MAX_HEIGHT = 220;

export function Composer({projectName, draft, setDraft, attachments, disabled, working, onSend, onStop, onAttach, onRemoveAttachment}: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const node = input.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = Math.min(node.scrollHeight, MAX_HEIGHT) + 'px';
  }, [draft]);
  const canSend = !disabled && (!!draft.trim() || attachments.length > 0);
  return <div className="composer-wrap">
    <div className="composer">
      {attachments.length > 0 && <div className="chips">
        {attachments.map(item => <span className="chip" key={item.id}>
          <Paperclip size={12} />{item.name}
          <button aria-label={`移除 ${item.name}`} disabled={disabled} onClick={() => onRemoveAttachment(item.id)}><X size={12} /></button>
        </span>)}
      </div>}
      <textarea
        ref={input}
        aria-label="任务输入"
        rows={2}
        value={draft}
        disabled={disabled}
        placeholder="例如：提取公司、科目名称、借方金额和贷方金额列，输出新表…"
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (canSend) onSend();
          }
        }}
      />
      <div className="composer-bar">
        <button className="icon-button" aria-label="添加资料" title="添加资料" onClick={onAttach} disabled={disabled}><Paperclip size={18} /></button>
        <span className="composer-scope"><FolderOpen size={13} />可读取「{projectName}」的项目资料 · 原文件不覆盖，成果另存</span>
        {working
          ? <button className="send-button stop" aria-label="停止当前处理" title="停止当前处理" onClick={onStop}><CircleStop size={18} /></button>
          : <button className="send-button" aria-label="发送任务" title="发送（Enter）" onClick={onSend} disabled={!canSend}><Send size={17} /></button>}
      </div>
    </div>
    <p className="composer-help">Enter 发送 · Shift + Enter 换行 · Agent 会自动选择工作流并保留执行依据</p>
  </div>;
}
