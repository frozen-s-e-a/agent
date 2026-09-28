import React from 'react';
import { X, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { api, desktop } from './api';

interface ProjectModalProps {
  projectName: string;
  setProjectName: (v: string) => void;
  projectRoot: string;
  setProjectRoot: (v: string) => void;
  busy: boolean;
  onCreate: () => void;
  onCancel: () => void;
  onError: (e: any) => void;
}

export function ProjectModal({ projectName, setProjectName, projectRoot, setProjectRoot, busy, onCreate, onCancel, onError }: ProjectModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-label="创建项目">
        <div className="modal-header">
          <h2>创建项目</h2>
          <button className="icon-btn" onClick={onCancel}><X size={20}/></button>
        </div>
        <p className="muted">以一个文件夹为工作范围，保存相关对话与执行记录。</p>
        <label>项目名称
          <input autoFocus placeholder="例如：2026 年度财务审计"
            value={projectName} onChange={e => setProjectName(e.target.value)}/>
        </label>
        <label>项目文件夹
          <div className="input-button">
            <input placeholder="输入文件夹的完整路径" value={projectRoot}
              onChange={e => setProjectRoot(e.target.value)}/>
            {desktop && (
              <button className="secondary" onClick={async () => {
                try { const root = await api('choose.directory');
                  if (root) { setProjectRoot(root); if (!projectName) setProjectName(root.split(/[\\/]/).at(-1) || ''); }
                } catch (e) { onError(e); }
              }}>浏览</button>
            )}
          </div>
        </label>
        <div className="info-box"><ShieldCheck size={17}/>
          <p>只读取已授权范围内的文件。新结果保存到 outputs 子文件夹。</p>
        </div>
        <div className="modal-footer">
          <span><ShieldCheck size={15}/>原文件保持不变</span>
          <button className="secondary" onClick={onCancel}>取消</button>
          <button className="primary" disabled={busy || !projectName.trim() || !projectRoot.trim()}
            onClick={onCreate}>创建项目 <ArrowUpRight size={16}/></button>
        </div>
      </section>
    </div>
  );
}