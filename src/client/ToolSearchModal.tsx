import React from 'react';
import { X, Search, ChevronRight, FileSpreadsheet } from 'lucide-react';
import type { Tool } from './types';

interface ToolSearchModalProps {
  search: string;
  onSearchChange: (v: string) => void;
  allTools: Tool[];
  onOpenTool: (t: Tool) => void;
  onClose: () => void;
  showMigration: () => Promise<void>;
}

export function ToolSearchModal({ search, onSearchChange, allTools, onOpenTool, onClose, showMigration }: ToolSearchModalProps) {
  const localCount = allTools.filter(t => t.group !== '原版 MCP').length;
  const legacyCount = allTools.length - localCount;
  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal tool-search" role="dialog" aria-modal="true" aria-label="搜索工具">
        <div className="modal-header"><h2>工具与命令</h2>
          <button className="icon-btn" aria-label="关闭工具搜索" onClick={onClose}><X size={20}/></button>
        </div>
        <div className="search-input">
          <Search size={19}/><input autoFocus placeholder="搜索工具名称、用途或原命令…"
            value={search} onChange={e => onSearchChange(e.target.value)}/>
          <kbd>ESC</kbd>
        </div>
        <div className="search-results">
          {allTools.filter(t => (t.name + t.id + t.description).toLowerCase().includes(search.toLowerCase())).map(t => (
            <button key={t.id} onClick={() => onOpenTool(t)}>
              <div className="tool-icon"><FileSpreadsheet size={20}/></div>
              <div><strong>{t.name}</strong><small>{t.description}</small></div>
              <span>{t.group}</span><ChevronRight size={17}/>
            </button>
          ))}
          {!allTools.some(t => (t.name + t.id + t.description).toLowerCase().includes(search.toLowerCase())) && (
            <p className="empty-small">没有匹配的工具，试试名称、用途或原命令。</p>
          )}
        </div>
        <div className="search-footer">
          <span>{localCount} 项本地工具{legacyCount ? ` · ${legacyCount} 项原版兼容工具` : ''} · 完整兼容验收尚未完成</span>
          <button onClick={() => { onClose(); showMigration(); }}>查看迁移总账</button>
        </div>
      </section>
    </div>
  );
}
