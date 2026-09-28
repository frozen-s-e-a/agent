import React, { useEffect, useState } from 'react';
import { FileText, Folder, Image, Paperclip, X, Loader2 } from 'lucide-react';
import { api } from './api';

interface ThumbnailProps {
  item: { id: string };
  sessionId: string;
}

function Thumbnail({ item, sessionId }: ThumbnailProps) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let alive = true;
    api('attachments.thumbnail', { sessionId, id: item.id })
      .then(s => { if (alive) setSrc(s || ''); })
      .catch(() => {});
    return () => { alive = false; };
  }, [item.id, sessionId]);

  return src ? <img src={src} alt={item.id} /> : <Image size={22} />;
}

interface AttachmentListProps {
  items?: any[];
  sessionId: string;
  onRemove?: (id: string) => void;
  disabled?: boolean;
}

export function AttachmentList({
  items = [],
  sessionId,
  onRemove,
  disabled = false,
}: AttachmentListProps) {
  if (!items.length) return null;

  return (
    <div className="attachment-list">
      {items.map(a => (
        <div className="attachment-chip" key={a.id}>
          {a.kind === 'image'
            ? <Thumbnail item={a} sessionId={sessionId} />
            : a.kind === 'folder'
              ? <Folder size={22} />
              : <FileText size={22} />
          }
          <div>
            <strong title={a.name}>{a.name}</strong>
            <small>
              {a.kind === 'folder' ? `${a.count} 个文件 · ` : ''}
              {a.size < 1024
                ? `${a.size} B`
                : `${(a.size / 1024 / 1024).toFixed(2)} MiB`
              }
              {a.readable === false ? ' · 仅文件信息' : ''}
            </small>
            {a.children && (
              <details>
                <summary>查看文件清单</summary>
                <ul>
                  {a.children.map((f: any) => (
                    <li key={f.id}>
                      {f.name}
                      {f.readable === false ? '（仅文件信息）' : ''}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          {onRemove && (
            <button
              className="icon-btn"
              aria-label={`移除 ${a.name}`}
              disabled={disabled}
              onClick={() => onRemove(a.id)}
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

interface AttachmentPickerProps {
  sessionId: string;
  busy: boolean;
  setBusy: (b: boolean) => void;
  refresh: () => Promise<void>;
  onError: (e: unknown) => void;
  onNotice: (s: string) => void;
}

export function AttachmentPicker({
  sessionId,
  busy,
  setBusy,
  refresh,
  onError,
  onNotice,
}: AttachmentPickerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [sessionId]);

  const choose = async (kind: string) => {
    setOpen(false);
    setBusy(true);
    try {
      const r = await api('attachments.choose', { sessionId, kind });
      if (r.warnings?.length) onNotice(r.warnings.join('；'));
    } catch (e) { onError(e); }
    finally { await refresh().catch(onError); setBusy(false); }
  };

  return (
    <div className="attachment-picker">
      <button
        className="icon-btn"
        title="添加附件"
        aria-label="添加附件"
        disabled={busy}
        onClick={() => setOpen(!open)}
      >
        {busy ? <Loader2 className="spin" size={18} /> : <Paperclip size={18} />}
      </button>
      {open && (
        <>
          <button
            className="attachment-dismiss"
            aria-label="关闭附件菜单"
            onClick={() => setOpen(false)}
          />
          <div className="attachment-menu">
            {([
              ['files', '添加文件', FileText],
              ['folder', '添加文件夹', Folder],
              ['images', '添加图片', Image],
            ] as const).map(([kind, label, Icon]) => (
              <button key={kind} onClick={() => choose(kind)}>
                <Icon size={17} />
                {label}
              </button>
            ))}
            <small>添加到当前对话，发送时交给模型</small>
          </div>
        </>
      )}
    </div>
  );
}
