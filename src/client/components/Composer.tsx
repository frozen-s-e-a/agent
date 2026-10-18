import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {CircleStop, File, FileImage, Folder, FolderOpen, Paperclip, Plus, Send, X} from 'lucide-react';
import type {Attachment} from '../types';

interface Props {
  draft: string;
  setDraft: (value: string) => void;
  attachments: Attachment[];
  scope: string[];
  disabled: boolean;
  working: boolean;
  onSend: () => void;
  onStop: () => void;
  onAttach: (kind: 'files' | 'folder' | 'images') => void;
  onRemoveAttachment: (id: string) => void;
  onRemoveScope: (path: string) => void;
  onPickScope: () => void;
}

const MAX_HEIGHT = 220;

export function Composer(props: Props) {
  const {draft, setDraft, attachments, scope, disabled, working} = props;
  const input = useRef<HTMLTextAreaElement>(null);
  const [menu, setMenu] = useState(false);
  useLayoutEffect(() => {
    const node = input.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = Math.min(node.scrollHeight, MAX_HEIGHT) + 'px';
  }, [draft]);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);
  const canSend = !disabled && (!!draft.trim() || attachments.length > 0);
  const attach = (kind: 'files' | 'folder' | 'images') => { setMenu(false); props.onAttach(kind); };

  return <div className="composer-wrap">
    <div className="composer">
      <div className="composer-scope-row">
        <button className="scope-button" onClick={props.onPickScope} title="在右侧项目资料里勾选本次要用的文件">
          <FolderOpen size={13} />{scope.length ? `限定 ${scope.length} 项项目资料` : '可读取全部项目资料'}
        </button>
        {scope.map(item => <span className="chip" key={item}><File size={11} />{item}<button aria-label={`不再限定 ${item}`} onClick={() => props.onRemoveScope(item)}><X size={11} /></button></span>)}
        {attachments.map(item => <span className="chip attachment" key={item.id}><Paperclip size={11} />{item.name}
          <button aria-label={`移除 ${item.name}`} disabled={disabled} onClick={() => props.onRemoveAttachment(item.id)}><X size={11} /></button>
        </span>)}
      </div>
      <textarea
        ref={input}
        aria-label="任务输入"
        rows={2}
        value={draft}
        disabled={disabled}
        placeholder="说清楚要核查什么、用哪些资料、希望得到什么成果…"
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (canSend) props.onSend();
          }
        }}
      />
      <div className="composer-bar">
        <div className="attach">
          <button className="icon-button" aria-label="添加资料" aria-haspopup="menu" aria-expanded={menu} title="添加附件" disabled={disabled} onClick={event => { event.stopPropagation(); setMenu(!menu); }}><Plus size={18} /></button>
          {menu && <div className="menu up" role="menu">
            <button role="menuitem" className="menu-item" onClick={() => attach('files')}><File size={14} /><span className="menu-item-text">添加文件</span></button>
            <button role="menuitem" className="menu-item" onClick={() => attach('folder')}><Folder size={14} /><span className="menu-item-text">添加文件夹</span></button>
            <button role="menuitem" className="menu-item" onClick={() => attach('images')}><FileImage size={14} /><span className="menu-item-text">添加图片</span></button>
          </div>}
        </div>
        <span className="composer-hint">Enter 发送，Shift + Enter 换行。原文件不会被修改，成果另存。</span>
        {working
          ? <button className="send-button stop" aria-label="停止当前处理" title="停止当前处理" onClick={props.onStop}><CircleStop size={17} /></button>
          : <button className="send-button" aria-label="发送任务" title="发送（Enter）" onClick={props.onSend} disabled={!canSend}><Send size={16} /></button>}
      </div>
    </div>
  </div>;
}
