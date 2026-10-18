import React, {useEffect, useRef} from 'react';
import {X} from 'lucide-react';
import type {FilePreviewData, SourceOrigin} from '../types';

const COLUMN_LABELS: Record<string, string> = {
  _source_file: '来源文件',
  _source_sheet: '来源工作表',
  _source_row: '来源行',
  _row_id: '记录序号',
};

const cellText = (cell: unknown) => cell == null ? '' : typeof cell === 'object' ? JSON.stringify(cell) : String(cell);

interface Props {
  value: FilePreviewData;
  onClose: () => void;
  onSource: (source: SourceOrigin) => void;
}

/** Modal sample of a result or source file. Traps focus, closes on Escape, restores focus on close. */
export function FilePreview({value, onClose, onSource}: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    return () => previous?.focus();
  }, []);
  useEffect(() => { closeButton.current?.focus(); }, [value.name]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
    if (event.key !== 'Tab') return;
    const focusable = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
    if (!focusable?.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const columns = value.columns || [];
  const hasSources = !!value.sourceOrigins?.some(Boolean);
  return <div className="backdrop" onClick={onClose}>
    <div ref={dialog} className="dialog" role="dialog" aria-modal="true" aria-label="文件预览" onKeyDown={onKeyDown} onClick={event => event.stopPropagation()}>
      <div className="panel-head">
        <div>
          <strong className="dialog-title">{value.name}</strong>
          <p className="muted">{value.highlightedSourceRow ? `来源第 ${value.highlightedSourceRow} 行。` : ''}预览只显示样本，完整内容请打开文件查看。</p>
        </div>
        <button ref={closeButton} className="icon-button" aria-label="关闭文件预览" onClick={onClose}><X size={18} /></button>
      </div>
      {value.text ? <pre className="preview-text">{value.text}</pre>
        : value.preview?.length ? <div className="table-wrap agent-preview-table"><table>
          <thead><tr>
            {columns.map((column, index) => <th key={index}>{COLUMN_LABELS[column] || column}</th>)}
            {hasSources && <th>资料来源</th>}
          </tr></thead>
          <tbody>{value.preview.map((row, index) => {
            const sourceRow = value.sourceRows?.[index];
            const origin = value.sourceOrigins?.[index];
            const cells = Array.isArray(row) ? row : columns.map(column => row[column]);
            return <tr key={index} className={value.highlightedSourceRow && value.highlightedSourceRow === sourceRow ? 'agent-source-highlight' : ''} data-source-row={sourceRow}>
              {cells.map((cell, column) => <td key={column}>{cellText(cell)}</td>)}
              {hasSources && <td>{origin && <button className="button small" onClick={() => onSource(origin)}>查看第 {origin.row} 行来源</button>}</td>}
            </tr>;
          })}</tbody>
        </table></div>
        : <p className="muted">文件没有可展示的文本样本，请打开成果查看。</p>}
    </div>
  </div>;
}
