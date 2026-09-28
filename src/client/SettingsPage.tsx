import React from 'react';
import { Check, Database, ShieldCheck, FileSpreadsheet, Layers, Info, Folder } from 'lucide-react';
import { ModelSettings } from './ModelSettings';

interface SettingsPageProps {
  boot: any;
  tab: string;
  onTabChange: (tab: string) => void;
  settings: any;
  setSettings: (s: any) => void;
  key: string;
  setKey: (k: string) => void;
  busy: boolean;
  saveSettings: () => Promise<void>;
  showMigration: () => Promise<void>;
  usage: { input: number; output: number; total: number };
  migration: any;
}

const modes: Record<string, string> = {
  auto: '自动', 'local-light': '轻量本地', 'local-batch': '大批量',
};

export function SettingsPage({ boot, tab, onTabChange, settings, setSettings, key, setKey, busy, saveSettings, showMigration, usage, migration }: SettingsPageProps) {
  return (
    <div className="settings-layout">
      <nav className="settings-tabs">
        {['模型服务', '资源与权限', '用量统计', '扩展能力', '迁移与诊断'].map(t => (
          <button key={t} className={tab === t ? 'active' : ''}
            onClick={() => { onTabChange(t); if (t === '迁移与诊断') void showMigration(); }}>{t}</button>
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
                ? boot.projects.map((p: any) => (
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
  );
}
