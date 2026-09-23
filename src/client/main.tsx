import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Plus, Search, Settings, Folder, MessageSquare, ChevronRight,
  ChevronDown, ArrowLeft, X, Check, FileSpreadsheet, FileText,
  Paperclip, ShieldCheck, Loader2, RefreshCw, Database,
  Layers, Activity, KeyRound, Info, ArrowUpRight,
  PanelRightClose, PanelRightOpen, Sparkles, ArrowUp, Zap,
  Square, SlidersHorizontal, AlertCircle, Trash2,
} from 'lucide-react';
import { api, desktop } from './api';
import './style.css';
import { Sidebar } from './Sidebar';
import { WelcomePage } from './WelcomePage';
import { Composer } from './Composer';
import { Messages } from './Messages';
import { ContextPanel } from './ContextPanel';
import { TaskCard } from './TaskCard';
import { MarkdownMessage } from './MarkdownMessage';
import { useTransientNotice } from './useTransientNotice';
import { AttachmentList, AttachmentPicker } from './Attachments';
import { ToolCallCard } from './ToolCallCard';
import { ModelSettings } from './ModelSettings';

type Project = { id: string; name: string; root: string };
type Session = { id: string; projectId: string | null; title: string; model?: string };
type Tool = { id: string; name: string; group: string; description: string; fields: { key: string; label: string; required?: boolean; default?: string }[] };
type Boot = { version: string; projects: Project[]; sessions: Session[]; tools: Tool[]; legacyTools?: Tool[]; settings: any; jetRules: any[]; counts: any; coverage: any };

const modes: Record<string, string> = {
  auto: '自动', 'local-light': '轻量本地', 'local-batch': '大批量',
};

function DataTable({ columns, rows }: { columns: string[]; rows: any[][] }) {
  return (
    <div className="data-table">
      <table>
        <thead><tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((v, j) => <td key={j} title={String(v ?? '')}>{String(v ?? '')}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="empty-small">没有符合条件的记录</div>}
    </div>
  );
}

function App() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [timeline, setTimeline] = useState<any>({ events: [], tasks: [] });
  const [page, setPage] = useState('chat');
  const [error, setError] = useTransientNotice('', boot ? 3000 : 0);
  const [notice, setNotice] = useTransientNotice('');
  const [text, setText] = useState('');
  const [modal, setModal] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('auto');
  const [right, setRight] = useState(true);
  const [files, setFiles] = useState<any[]>([]);
  const [folder, setFolder] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');
  const [projectRoot, setProjectRoot] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});
  const [advanced, setAdvanced] = useState('{}');
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [migration, setMigration] = useState<any>(null);
  const [tab, setTab] = useState('模型服务');
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [key, setKey] = useState('');

  const session = boot?.sessions.find(s => s.id === sessionId);
  const project = boot?.projects.find(p => p.id === session?.projectId);
  const report = (e: any) => setError(e.message || String(e));
  const refresh = async () => {
    const b = await api('bootstrap');
    const merged = { ...b, tools: [...(b.tools || []), ...(b.legacyTools || [])] };
    setBoot(merged as Boot);
    return merged as Boot;
  };

  // Boot
  useEffect(() => {
    refresh().then(async b => {
      setSettings(b.settings);
      setMode(b.settings.defaultMode || 'auto');
      if (b.sessions.length) setSessionId(b.sessions.at(-1)!.id);
      else { const s = await api('session.create'); setSessionId(s.id); await refresh(); }
    }).catch(report);
  }, []);

  // Session polling
  useEffect(() => {
    if (!sessionId) return;
    let alive = true, lastError = '';
    const tick = () => api('session.get', { id: sessionId }).then(r => {
      if (alive) { setTimeline(r); lastError = ''; }
    }).catch(e => {
      if (alive && lastError !== e.message) { lastError = e.message; report(e); }
    });
    tick();
    const timer = setInterval(tick, 1000);
    return () => { alive = false; clearInterval(timer); };
  }, [sessionId]);

  // Files listing
  useEffect(() => { setFolder(''); setSelected([]); setPreview(null); }, [project?.id]);
  useEffect(() => {
    let alive = true;
    if (project) api('files.list', { projectId: project.id, path: folder })
      .then(f => { if (alive) setFiles(f); }).catch(report);
    else setFiles([]);
    return () => { alive = false; };
  }, [project?.id, folder]);

  // Keyboard shortcuts
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearch(''); setModal('tools'); }
      if (e.key === 'Escape') { setModal(null); setTool(null); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  const createSession = async (projectId: string | null = null) => {
    try {
      const s = await api('session.create', { projectId });
      await refresh(); setSessionId(s.id); setPage('chat'); setTimeline({ events: [], tasks: [] });
    } catch (e) { report(e); }
  };

  const selectProject = async (p: Project) => {
    const existing = boot?.sessions.filter(s => s.projectId === p.id).at(-1);
    if (existing) { setSessionId(existing.id); setPage('chat'); }
    else await createSession(p.id);
  };

  const createProject = async () => {
    setBusy(true);
    try {
      const p = await api('project.create', { name: projectName, root: projectRoot });
      await refresh(); await createSession(p.id);
      setModal(null); setProjectName(''); setProjectRoot('');
    } catch (e) { report(e); } finally { setBusy(false); }
  };

  const demo = async () => {
    try { const p = await api('demo.create'); await refresh(); await createSession(p.id); setNotice('已创建合成示例项目。'); }
    catch (e) { report(e); }
  };

  const openTool = (t: Tool) => {
    setTool(t); setModal(null);
    setAdvanced('{}'); setPreview(null);
    setParams(Object.fromEntries(t.fields.map(f => [f.key, f.default || ''])));
  };

  const loadPreview = async () => {
    if (!project || !selected.length) return;
    setBusy(true);
    try {
      const r = await api('files.preview', { projectId: project.id, file: selected[0] });
      setPreview(r);
      const guesses: Record<string, string[]> = {
        date: ['凭证日期', '日期'], subject: ['科目编码', '科目代码'],
        debit: ['借方金额', '借方'], credit: ['贷方金额', '贷方'],
      };
      setParams(prev => {
        const n = { ...prev };
        for (const [k, vs] of Object.entries(guesses))
          if (!n[k]) n[k] = vs.find(x => r.columns.includes(x)) || '';
        return n;
      });
    } catch (e) { report(e); } finally { setBusy(false); }
  };

  const runTool = async () => {
    if (!tool) return;
    setBusy(true);
    try {
      const extra = JSON.parse(advanced);
      if (!extra || Array.isArray(extra) || typeof extra !== 'object') throw Error('高级参数必须是 JSON 对象');
      await api('task.run', { sessionId, tool: tool.id, files: selected, mode, parameters: { ...params, ...extra } });
      setTool(null); setTimeline(await api('session.get', { id: sessionId }));
    } catch (e) { report(e); } finally { setBusy(false); }
  };

  const send = async () => {
    if (busy || attachmentBusy || timeline.streaming || (!text.trim() && !timeline.attachments?.length)) return;
    if (text.startsWith('/')) {
      const name = text.slice(1).trim();
      const t = boot?.tools.find(t => t.id === name || t.name === name);
      if (t) { openTool(t); setText(''); return; }
      setSearch(name); setModal('tools'); return;
    }
    setBusy(true);
    try {
      await api('chat.send', { sessionId, text, projectFiles: selected, model: session?.model || '', attachments: (timeline.attachments || []).map((a: any) => a.id) });
      setText(''); await refresh(); setTimeline(await api('session.get', { id: sessionId }));
    } catch (e) { report(e); } finally { setBusy(false); }
  };

  const saveSettings = async () => {
    setBusy(true);
    try {
      await api('settings.save', settings);
      if (key) await api('secret.save', { key });
      setKey('');
      const b = await refresh(); setSettings(b.settings);
      setNotice('设置已保存' + (desktop ? '，模型密钥由 Windows 加密保护。' : '。'));
    } catch (e) { report(e); } finally { setBusy(false); }
  };

  const showMigration = async () => {
    try { setMigration(await api('migration.get')); setPage('settings'); setTab('迁移与诊断'); }
    catch (e) { report(e); }
  };

  const deleteSession = async (id: string) => {
    try {
      await api('session.delete', { id });
      await refresh();
      if (sessionId === id) {
        const remaining = boot?.sessions.filter(s => s.id !== id);
        setSessionId(remaining?.at(-1)?.id || '');
        setTimeline({ events: [], tasks: [] });
      }
      setNotice('对话已删除');
    } catch (e) { report(e); }
  };

  const usage = timeline.events.filter((x: any) => x.usage).reduce((a: any, x: any) => ({
    input: a.input + (x.usage.prompt_tokens || 0),
    output: a.output + (x.usage.completion_tokens || 0),
    total: a.total + (x.usage.total_tokens || 0),
  }), { input: 0, output: 0, total: 0 });

  if (!boot) return <div className="loading"><Loader2 className="spin"/><h2>正在打开审计工作空间</h2>{error && <p className="error-text">{error}</p>}</div>;

  const allTools: Tool[] = [...(boot.tools || []), ...(boot.legacyTools || [])];

  return (
    <div className="app-shell">
      <Sidebar
        projects={boot.projects}
        sessions={boot.sessions}
        activeProjectId={project?.id || null}
        activeSessionId={sessionId}
        page={page}
        boot={boot}
        onNewChat={() => createSession(project?.id || null)}
        onNewStandalone={() => createSession()}
        onSelectProject={selectProject}
        onSelectSession={(id) => { setSessionId(id); setPage('chat'); }}
        onDeleteSession={deleteSession}
        onOpenProjectModal={() => setModal('project')}
        onOpenSearch={() => { setSearch(''); setModal('tools'); }}
        onOpenSettings={() => { setPage('settings'); setSettings(boot.settings); }}
        onShowMigration={showMigration}
      />

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{page === 'settings' ? '偏好设置' : project?.name || '独立对话'}</span>
            <ChevronRight size={14}/>
            <strong>{page === 'settings' ? tab : session?.title || '新对话'}</strong>
          </div>
          <div className="top-actions">
            <span className="local-pill"><ShieldCheck size={14}/>数据处理在本机</span>
            {page === 'chat' && (
              <button title="项目文件" className="icon-btn" onClick={() => setRight(!right)}>
                {right ? <PanelRightClose size={18}/> : <PanelRightOpen size={18}/>}
              </button>
            )}
          </div>
        </header>

        {/* Notifications */}
        {(error || notice) && (
          <div className="notification-stack">
            {error && (
              <div role="alert" className="banner error">
                <AlertCircle size={17}/><span>{error}</span>
                <button className="icon-btn" onClick={() => setError('')}><X size={15}/></button>
              </div>
            )}
            {notice && (
              <div role="status" className="banner success">
                <Check size={17}/><span>{notice}</span>
                <button className="icon-btn" onClick={() => setNotice('')}><X size={15}/></button>
              </div>
            )}
          </div>
        )}

        {page === 'chat' ? (
          <div className="workspace">
            {timeline.events.length === 0 ? (
              <WelcomePage
                toolCount={allTools.length}
                project={project}
                tools={allTools}
                onCreateProject={() => setModal('project')}
                onOpenSearch={() => { setSearch(''); setModal('tools'); }}
                onOpenTool={openTool}
                onDemo={demo}
              />
            ) : (
              <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                <Messages
                  events={timeline.events}
                  calls={timeline.calls}
                  tasks={timeline.tasks}
                  tools={allTools}
                  streaming={timeline.streaming}
                  turn={timeline.turn}
                  phase={timeline.phase || ''}
                  sessionId={sessionId}
                  onError={report}
                />
                {right && (
                  <ContextPanel
                    project={project}
                    files={files}
                    folder={folder}
                    selected={selected}
                    right={right}
                    onToggleRight={() => setRight(!right)}
                    onFolderChange={setFolder}
                    onSelectFile={(path) => setSelected(s => s.includes(path) ? s.filter(x => x !== path) : [...s, path])}
                    onCreateProject={() => setModal('project')}
                    onRefresh={() => project && api('files.list', { projectId: project.id, path: folder }).then(setFiles).catch(report)}
                    onClearSelection={() => setSelected([])}
                    onUseTools={() => setModal('tools')}
                  />
                )}
              </div>
            )}

            {/* Composer - always visible */}
            <Composer
              text={text} onTextChange={setText} onSend={send}
              busy={busy} streaming={timeline.streaming}
              attachments={timeline.attachments || []}
              attachmentBusy={attachmentBusy}
              onRemoveAttachment={(id) => api('attachments.remove', { sessionId, id })
                .then(() => api('session.get', { id: sessionId })).then(setTimeline).catch(report)}
              mode={mode} onModeChange={setMode}
              sessionModel={session?.model || ''}
              onModelChange={(m) => api('session.model', { id: sessionId, model: m }).then(refresh).catch(report)}
              settingsModels={boot.settings?.models || []}
              visionModel={boot.settings?.visionModel || ''}
              settingsModel={boot.settings?.model || ''}
              onToolSelect={() => { setSearch(''); setModal('tools'); }}
              onSettingsClick={() => { setPage('settings'); setTab('模型服务'); setSettings(boot.settings); }}
              usageTotal={usage.total}
              onAddAttachment={() => {}}
              showDelete={!!session && page === 'chat'}
              onDelete={session ? () => deleteSession(session.id) : undefined}
            />
          </div>
        ) : (
          <div className="settings-layout">
            <nav className="settings-tabs">
              {['模型服务', '资源与权限', '用量统计', '扩展能力', '迁移与诊断'].map(t => (
                <button key={t} className={tab === t ? 'active' : ''}
                  onClick={() => { setTab(t); if (t === '迁移与诊断' && !migration) showMigration(); }}>{t}</button>
              ))}
            </nav>
            <div className="settings-content">
              {tab === '模型服务' && (
                <ModelSettings settings={settings} setSettings={setSettings}
                  keyValue={key} setKey={setKey} busy={busy} save={saveSettings} />
              )}
              {tab === '资源与权限' && (
                <>
                  <div className="page-heading">
                    <span className="eyebrow">LOCAL EXECUTION</span>
                    <h1>资源与权限</h1>
                    <p>两种模式均在本机执行，输入文件保持不变。</p>
                  </div>
                  <div className="settings-card">
                    <h3><Database size={18}/>处理模式</h3>
                    <label>默认处理模式
                      <select value={settings.defaultMode || 'auto'}
                        onChange={e => setSettings({ ...settings, defaultMode: e.target.value })}>
                        {Object.entries(modes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </label>
                    <p className="muted">自动模式根据任务大小选择最优处理方式；大批量模式适合文件较多的场景。</p>
                    <button className="primary" disabled={busy} onClick={saveSettings}>保存设置</button>
                  </div>
                  <div className="settings-card">
                    <h3><ShieldCheck size={18}/>项目授权范围</h3>
                    {boot.projects.length
                      ? boot.projects.map(p => (
                        <div className="permission-row" key={p.id}>
                          <Folder size={18}/>
                          <div><strong>{p.name}</strong><small>{p.root}</small></div>
                          <span className="pill">读取 · 生成新结果</span>
                        </div>
                      ))
                      : <p className="muted">尚未授权项目文件夹。</p>}
                  </div>
                </>
              )}
              {tab === '用量统计' && (
                <>
                  <div className="page-heading">
                    <span className="eyebrow">USAGE</span>
                    <h1>用量统计</h1>
                    <p>当前会话的模型实际使用量。</p>
                  </div>
                  <div className="stat-grid">
                    {[['输入', usage.input], ['输出', usage.output], ['总计', usage.total]].map(([k, v]) => (
                      <div className="stat" key={k}>
                        <span>{k} Tokens</span>
                        <strong>{usage.total ? Number(v).toLocaleString() : '—'}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="info-box"><Info size={18}/>
                    <p>Token 数反映模型处理的数据量，不直接换算为费用。中断请求可能导致用量记录不完整。</p>
                  </div>
                </>
              )}
              {tab === '扩展能力' && (
                <>
                  <div className="page-heading">
                    <span className="eyebrow">CAPABILITIES</span>
                    <h1>功能能力</h1>
                    <p>本工具内置的本地数据处理能力，全部在您的电脑上运行。</p>
                  </div>
                  <div className="settings-card">
                    <h3><FileSpreadsheet size={18}/>Excel / CSV 数据处理<span className="pill green">已就绪</span></h3>
                    <p className="muted">支持读取工作表、预览数据、提取指定列并输出为新的 Excel 或 CSV 文件。从左侧边栏选择"工具与命令"即可使用。</p>
                  </div>
                  <div className="settings-card">
                    <h3><ShieldCheck size={18}/>凭证审计校验<span className="pill green">已就绪</span></h3>
                    <p className="muted">可识别凭证字段（借方、贷方、科目等），自动校验借贷平衡并标注异常条目。</p>
                  </div>
                  <div className="settings-card">
                    <h3><Layers size={18}/>插件扩展<span className="pill amber">规划中</span></h3>
                    <p className="muted">原 Skills 文件和 MCP 工具的完整兼容接入在后续版本中推进。当前版本已实现核心数据处理功能。</p>
                  </div>
                </>
              )}
              {tab === '迁移与诊断' && (
                <>
                  <div className="page-heading">
                    <span className="eyebrow">ABOUT THIS VERSION</span>
                    <h1>关于当前版本</h1>
                    <p>这是一个内部测试版本，核心功能已可运行。我们正在持续完善全部功能的兼容性。</p>
                  </div>
                  <div className="stat-grid">
                    <div className="stat"><span>本地工具已实现</span><strong>{boot.coverage.implemented}</strong><small>支持日常数据处理</small></div>
                    <div className="stat"><span>原模板已盘点</span><strong>{boot.counts.templates}</strong><small>包含公式与宏的模板</small></div>
                    <div className="stat"><span>模块文件已分析</span><strong>{boot.counts.modules}</strong><small>用于功能兼容性验收</small></div>
                  </div>
                  <div className="info-box"><Info size={18}/>
                    <p>此版本为可运行的内部测试版。全部原功能通过兼容验收后，将发布全功能首版。当前已实现的功能可通过工具面板直接使用。</p>
                  </div>
                  {migration?.workPackages && (
                    <div className="settings-card migration-table">
                      <h3>待完善功能清单</h3>
                      {migration.workPackages.map((w: any) => (
                        <div className="migration-row" key={w.id}>
                          <code>{w.id}</code><span>{w.title}</span>
                          <span className="pill amber">待完善</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Project creation modal */}
      {modal === 'project' && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-label="创建项目">
            <div className="modal-header">
              <h2>创建项目</h2>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={20}/></button>
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
                    } catch (e) { report(e); }
                  }}>浏览</button>
                )}
              </div>
            </label>
            <div className="info-box"><ShieldCheck size={17}/>
              <p>只读取已授权范围内的文件。新结果保存到 outputs 子文件夹。</p>
            </div>
            <div className="modal-footer">
              <span><ShieldCheck size={15}/>原文件保持不变</span>
              <button className="secondary" onClick={() => setModal(null)}>取消</button>
              <button className="primary" disabled={busy || !projectName.trim() || !projectRoot.trim()}
                onClick={createProject}>创建项目 <ArrowUpRight size={16}/></button>
            </div>
          </section>
        </div>
      )}

      {/* Tool search modal */}
      {modal === 'tools' && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <section className="modal tool-search" role="dialog" aria-modal="true" aria-label="搜索工具">
            <div className="modal-header"><h2>工具与命令</h2>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={20}/></button>
            </div>
            <div className="search-input">
              <Search size={19}/><input autoFocus placeholder="搜索工具名称、用途或原命令…"
                value={search} onChange={e => setSearch(e.target.value)}/>
              <kbd>ESC</kbd>
            </div>
            <div className="search-results">
              {allTools.filter(t => (t.name + t.id + t.description).toLowerCase().includes(search.toLowerCase())).map(t => (
                <button key={t.id} onClick={() => openTool(t)}>
                  <div className="tool-icon"><FileSpreadsheet size={20}/></div>
                  <div><strong>{t.name}</strong><small>{t.description}</small></div>
                  <span>{t.group}</span><ChevronRight size={17}/>
                </button>
              ))}
            </div>
            <div className="search-footer">
              <span>{allTools.length} 项本地工具 · 完整兼容验收尚未完成</span>
              <button onClick={() => { setModal(null); showMigration(); }}>查看迁移总账</button>
            </div>
          </section>
        </div>
      )}

      {/* Tool parameter modal */}
      {tool && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setTool(null); }}>
          <section className="modal parameter-modal" role="dialog" aria-modal="true" aria-label={tool.name}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">LOCAL AUDIT TOOL</span>
                <h2>{tool.name}</h2>
              </div>
              <button className="icon-btn" onClick={() => setTool(null)}><X size={20}/></button>
            </div>
            <p className="muted">{tool.description}</p>
            <div className="parameter-scroll">
              {project ? (
                <>
                  {/* Step 1: Select files */}
                  <div className="parameter-section">
                    <h3><span>01</span>选择输入文件<small>{selected.length} 项已选择</small></h3>
                    <div className="file-breadcrumb">
                      <button className="icon-btn" title="返回上级" disabled={!folder}
                        onClick={() => setFolder(folder.split(/[\\/]/).slice(0, -1).join('/'))}>
                        <ArrowLeft size={15}/>
                      </button>
                      <span title={folder}>{folder || '项目根目录'}</span>
                      <button className="icon-btn" title="刷新文件"
                        onClick={() => project && api('files.list', { projectId: project.id, path: folder }).then(setFiles).catch(report)}>
                        <RefreshCw size={14}/>
                      </button>
                    </div>
                    <div className="file-list">
                      {files.map(f => (
                        <div className={'file-row ' + (selected.includes(f.path) ? 'chosen' : '')} key={f.path}>
                          {f.directory ? (
                            <button onClick={() => setFolder(f.path)}>
                              <Folder size={17}/><span>{f.name}</span><ChevronRight size={14}/>
                            </button>
                          ) : (
                            <label>
                              <input type="checkbox" checked={selected.includes(f.path)}
                                onChange={() => setSelected(s => s.includes(f.path) ? s.filter(x => x !== f.path) : [...s, f.path])}/>
                              {/\.(?:xlsx?|csv)$/i.test(f.name) ? <FileSpreadsheet size={17}/> : <FileText size={17}/>}
                              <span title={f.path}>{f.name}</span>
                              <small>{f.size < 1024 ? '1 KB' : Math.round(f.size / 1024) + ' KB'}</small>
                            </label>
                          )}
                        </div>
                      ))}
                      {!files.length && <p className="muted empty-small">此文件夹暂无可选文件</p>}
                    </div>
                    {selected.length > 0 && (
                      <div className="selected-chips">
                        {selected.map(f => (
                          <button key={f} onClick={() => setSelected(s => s.filter(x => x !== f))}>
                            {f.split(/[\\/]/).at(-1)}<X size={11}/>
                          </button>
                        ))}
                      </div>
                    )}
                    <button className="secondary" disabled={!selected.length || busy} onClick={loadPreview}>
                      <Search size={14}/>预览首个文件与字段
                    </button>
                    {preview && (
                      <>
                        <div className="preview-label">{preview.sheet} · 前 {preview.preview.length} 行预览</div>
                        <DataTable columns={preview.columns} rows={preview.preview}/>
                      </>
                    )}
                  </div>

                  {/* Step 2: Parameters */}
                  <div className="parameter-section">
                    <h3><span>02</span>确认字段与参数</h3>
                    <datalist id="column-names">
                      {preview?.columns.map((c: string) => <option key={c} value={c}/>)}</datalist>
                    <div className="field-grid">
                      {tool.fields.map(f => (
                        <label key={f.key}>
                          {f.label}{f.required && <b className="required"> *</b>}
                          <input list="column-names" value={params[f.key] || ''}
                            placeholder={f.default || '输入实际字段或参数'}
                            onChange={e => setParams({ ...params, [f.key]: e.target.value })}/>
                        </label>
                      ))}
                    </div>
                    {!tool.fields.length && <p className="muted">此工具无需额外业务参数。</p>}
                    {tool.id === 'jet_test' && (
                      <div className="rule-options">
                        {boot.jetRules.map((r: any) => (
                          <label key={r.name} title={JSON.stringify(r.conditions)}>
                            <input type="checkbox" checked={(params.rules || '').split(',').includes(r.name)}
                              onChange={e => {
                                let rs = (params.rules || '').split(',').filter(Boolean);
                                setParams({ ...params, rules: (e.target.checked ? [...rs, r.name] : rs.filter(x => x !== r.name)).join(',') });
                              }}/>{r.name}
                          </label>
                        ))}
                      </div>
                    )}
                    <details className="advanced">
                      <summary><SlidersHorizontal size={14}/>高级参数（表头、工作表、字段映射）</summary>
                                            <p>使用 JSON 对象。JET 借贷不平须提供 keys；规则覆盖使用 ruleOverrides。</p>
                      <textarea aria-label="高级参数" value={advanced}
                        onChange={e => setAdvanced(e.target.value)}/>
                    </details>
                  </div>

                  {/* Step 3: Mode & output */}
                  <div className="parameter-section">
                    <h3><span>03</span>处理方式与输出</h3>
                    <div className="mode-cards">
                      {Object.entries(modes).map(([k, v]) => (
                        <button key={k} className={mode === k ? 'active' : ''}
                          onClick={() => setMode(k)}>
                          {k === 'local-batch' ? <Database size={17}/> : <Zap size={17}/>}
                          <span>{v}</span>
                          {mode === k && <Check size={14}/>}
                        </button>
                      ))}
                    </div>
                    <p className="muted">结果另存为 Excel / 分卷 CSV / Parquet，带来源索引与校验清单。复杂原模板、全部参数分支尚未通过迁移验收。</p>
                  </div>
                </>
              ) : (
                <div className="no-project">
                  <Folder size={32}/>
                  <h3>先选择项目文件夹</h3>
                  <p>本地工具需要明确的文件工作范围。</p>
                  <button className="primary" onClick={() => { setTool(null); setModal('project'); }}>创建项目</button>
                  <button className="text-tool" onClick={async () => { setTool(null); await demo(); }}>使用合成示例</button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <span className="muted"><ShieldCheck size={15}/>原文件保持不变</span>
              <button className="primary" disabled={busy || !project || !selected.length} onClick={runTool}>
                {busy ? <Loader2 className="spin" size={16}/> : <ArrowUpRight size={16}/>}
                确认并执行
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-label="删除对话">
            <div className="modal-header">
              <h2>删除对话</h2>
              <button className="icon-btn" onClick={() => setDeleteConfirm(null)}><X size={20}/></button>
            </div>
            <p className="muted">此对话及其所有消息和工具记录将被永久删除，无法恢复。</p>
            <div className="modal-footer">
              <span></span>
              <button className="secondary" onClick={() => setDeleteConfirm(null)}>取消</button>
              <button className="primary" style={{ background: 'var(--danger)' }} disabled={busy} onClick={() => deleteSession(deleteConfirm)}>
                {busy ? <Loader2 className="spin" size={16}/> : <Trash2 size={16}/>}
                确认删除
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
