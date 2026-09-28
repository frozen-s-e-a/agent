import React, { useState } from 'react';
import {
  Command, ArrowUp, Square, Settings,
  MoreVertical, Trash2,
} from 'lucide-react';
import type { Tool } from './types';
import { AttachmentList } from './Attachments';
import { AttachmentPicker } from './Attachments';

interface ComposerProps {
  sessionId: string;
  text: string;
  onTextChange: (v: string) => void;
  onSend: () => void;
  busy: boolean;
  streaming: boolean;
  attachments: any[];
  attachmentBusy: boolean;
  onRemoveAttachment: (id: string) => void;
  mode: string;
  onModeChange: (m: string) => void;
  sessionModel: string;
  onModelChange: (m: string) => void;
  settingsModels: string[];
  visionModel: string;
  settingsModel: string;
  onToolSelect: () => void;
  onSettingsClick: () => void;
  usageTotal: number;
  setAttachmentBusy: (busy: boolean) => void;
  refreshSession: () => Promise<void>;
  onError: (e: unknown) => void;
  onNotice: (message: string) => void;
  onStop: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

const modes: Record<string, string> = {
  auto: '自动',
  'local-light': '轻量本地',
  'local-batch': '大批量',
};

export function Composer({
  sessionId, text, onTextChange, onSend, busy, streaming,
  attachments, attachmentBusy, onRemoveAttachment,
  mode, onModeChange,
  sessionModel, onModelChange, settingsModels, visionModel, settingsModel,
  onToolSelect, onSettingsClick, usageTotal,
  setAttachmentBusy, refreshSession, onError, onNotice, onStop,
  onDelete, showDelete,
}: ComposerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="composer-area">
      <div className="composer">
        <AttachmentList
          items={attachments}
          sessionId={sessionId}
          disabled={attachmentBusy || busy || streaming}
          onRemove={onRemoveAttachment}
        />
        <textarea
          aria-label="发送消息"
          placeholder="描述你的审计任务，或输入 / 选择工具…"
          value={text}
          onChange={e => onTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="composer-toolbar">
          <div>
            <AttachmentPicker
              sessionId={sessionId}
              busy={attachmentBusy || busy || streaming}
              setBusy={setAttachmentBusy}
              refresh={refreshSession}
              onError={onError}
              onNotice={onNotice}
            />
            <button className="text-tool" onClick={onToolSelect}>
              <Command size={14}/>工具
            </button>
            <span className="toolbar-divider"/>
            <div className="mode-toggle">
              {Object.entries(modes).map(([k, v]) => (
                <button
                  key={k}
                  className={mode === k ? 'active' : ''}
                  onClick={() => onModeChange(k)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
            <select
              className="desktop-model-select"
              aria-label="对话模型"
              value={sessionModel || ''}
              disabled={streaming || busy}
              onChange={e => onModelChange(e.target.value)}
            >
              <option value="">
                {(attachments as any[]).some((a: any) => a.kind === 'image')
                  ? (visionModel || '请选择视觉模型')
                  : settingsModel}
              </option>
              {[...settingsModels, settingsModel, visionModel, sessionModel]
                .filter((m, i, a) => m && a.indexOf(m) === i)
                .map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
            </select>
            <button
              className="icon-btn"
              title="模型连接设置"
              onClick={onSettingsClick}
            >
              <Settings size={15}/>
            </button>
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                className="icon-btn"
                title="更多"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <MoreVertical size={15}/>
              </button>
              {menuOpen && (
                <div className="composer-menu">
                  {showDelete && onDelete && (
                    <button
                      className="composer-menu-item delete"
                      onClick={() => { onDelete(); setMenuOpen(false); }}
                    >
                      <Trash2 size={14}/>删除此对话
                    </button>
                  )}
                </div>
              )}
            </div>
            {streaming ? (
              <button className="send stop" title="停止生成" aria-label="停止生成" onClick={onStop}>
                <Square size={16}/>
              </button>
            ) : (
              <button
                className="send"
                title="发送"
                disabled={busy || attachmentBusy || (!text.trim() && !attachments.length)}
                onClick={onSend}
              >
                <ArrowUp size={20}/>
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="composer-caption">
        <span>发送会将文本、文件摘录、图片及工具结果交给所选模型。</span>
        <span>
          {usageTotal ? `本会话 ${usageTotal.toLocaleString()} Tokens` : '本地工具无需模型 Token'}
        </span>
      </div>
    </div>
  );
}
