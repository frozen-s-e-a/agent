import React, {useState} from 'react';
import {ArrowLeft, FolderOpen, PlayCircle} from 'lucide-react';
import {api} from '../api';

interface Props {
  busy: boolean;
  onCreate: (name: string, root: string) => Promise<void>;
  onDemo: () => Promise<void>;
  onBack?: () => void;
}

export function ProjectSetup({busy, onCreate, onDemo, onBack}: Props) {
  const [name, setName] = useState('');
  const [root, setRoot] = useState('');
  const ready = !!name.trim() && !!root.trim();
  const choose = async () => {
    const value = await api('choose.directory') as string | null;
    if (value) setRoot(value);
  };
  return <section className="setup">
    {onBack && <button className="button ghost setup-back" onClick={onBack}><ArrowLeft size={16} />返回当前对话</button>}
    <div className="setup-card">
      <div className="setup-mark"><FolderOpen size={24} /></div>
      <h1>先把资料放进一个项目</h1>
      <p className="muted">之后你只需要用自然语言说清楚想核查什么，Agent 会在项目范围内读取资料并执行可用的审计程序。原文件不会被覆盖，成果另存。</p>
      <form className="setup-form" onSubmit={event => { event.preventDefault(); if (ready && !busy) onCreate(name.trim(), root.trim()); }}>
        <label className="field"><span>项目名称</span>
          <input aria-label="项目名称" value={name} onChange={event => setName(event.target.value)} placeholder="例如：华东制造 2026 年审" />
        </label>
        <label className="field"><span>资料目录</span>
          <span className="input-group">
            <input aria-label="资料目录" value={root} onChange={event => setRoot(event.target.value)} placeholder="资料目录路径" />
            <button type="button" className="button" onClick={() => choose().catch(() => undefined)}>选择</button>
          </span>
        </label>
        <div className="setup-actions">
          <button type="button" className="button" onClick={() => onDemo()} disabled={busy}><PlayCircle size={16} />打开示例项目</button>
          <button type="submit" className="button primary" disabled={busy || !ready}>建立项目</button>
        </div>
      </form>
    </div>
  </section>;
}
