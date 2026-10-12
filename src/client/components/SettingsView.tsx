import React, {useEffect, useState} from 'react';
import {CheckCircle2, ChevronDown, Cpu, KeyRound, Loader2, ShieldCheck, X, XCircle} from 'lucide-react';
import {api} from '../api';
import {errorMessage, fullTime, isLocalModelUrl} from '../lib/format';
import type {AppSettings, Boot, RuntimeStatus} from '../types';

interface Props {
  boot: Boot;
  onRefresh: () => Promise<Boot>;
  onNotice: (message: string) => void;
  onClose: () => void;
}

type Feedback = {tone: 'success' | 'error'; text: string; models?: string[]} | null;

export function SettingsView({boot, onRefresh, onNotice, onClose}: Props) {
  // Edits are local until saved; later bootstrap refreshes must not overwrite them.
  const [config, setConfig] = useState<AppSettings>({...boot.settings});
  const [key, setKey] = useState('');
  const [cookies, setCookies] = useState('');
  const [busy, setBusy] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [runtimeError, setRuntimeError] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    api('runtime.status').then(setRuntime).catch(error => setRuntimeError(errorMessage(error)));
  }, []);

  useEffect(() => {
    if (!loggingIn) return;
    const timer = window.setInterval(async () => {
      try {
        const status = await api('service.cicpa.loginStatus');
        if (status.state === 'waiting') return;
        setLoggingIn(false);
        setFeedback({tone: status.state === 'authorized' ? 'success' : 'error', text: status.message});
        await onRefresh();
      } catch (error) {
        setLoggingIn(false);
        setFeedback({tone: 'error', text: errorMessage(error)});
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [loggingIn, onRefresh]);

  const perform = async (work: () => Promise<Feedback | void>) => {
    setBusy(true);
    setFeedback(null);
    try { const result = await work(); if (result) setFeedback(result); }
    catch (error) { setFeedback({tone: 'error', text: errorMessage(error)}); }
    finally { setBusy(false); }
  };

  const update = (patch: Partial<AppSettings>) => setConfig(current => ({...current, ...patch}));

  const save = () => perform(async () => {
    if (cookies.trim()) JSON.parse(cookies);
    await api('settings.save', config);
    if (key.trim()) { await api('secret.save', {key}); setKey(''); }
    if (cookies.trim()) { await api('secret.cicpa.save', {cookies}); setCookies(''); }
    await onRefresh();
    onNotice('模型服务与授权已保存');
  });
  const testConnection = () => perform(async () => {
    const result = await api('connection.test', {settings: config, key: key || undefined});
    return {tone: 'success', text: `连接正常 · 模型 ${result.model} · 响应 ${result.latencyMs} ms`};
  });
  const listModels = () => perform(async () => {
    const result = await api('models.list', {settings: config, key: key || undefined});
    return {tone: 'success', text: `服务提供 ${result.count} 个模型，点击即可填入文本模型：`, models: result.models};
  });
  const checkCicpa = () => perform(async () => {
    if (cookies.trim()) { await api('secret.cicpa.save', {cookies}); setCookies(''); await onRefresh(); }
    const result = await api('service.cicpa.test');
    return {tone: 'success', text: result.message};
  });
  const loginCicpa = () => perform(async () => {
    await api('service.cicpa.login');
    setLoggingIn(true);
    return {tone: 'success', text: '请在注协官网窗口完成登录。'};
  });

  return <div className="settings-scroll">
    <div className="settings">
      <div className="settings-intro">
        <div>
          <h2>运行设置</h2>
          <p className="muted">模型服务和授权只影响当前本机，不会写入项目成果。</p>
        </div>
        <button className="icon-button" aria-label="关闭运行设置" onClick={onClose}><X size={16} /></button>
      </div>

      <section className="card settings-card">
        <header className="card-head">
          <span className="card-icon"><KeyRound size={16} /></span>
          <div><h3>模型服务与查询授权</h3><p className="muted">AI 提取使用文本或视觉模型，工商查询使用注协登录授权。</p></div>
        </header>
        <div className="form-grid">
          <label className="field wide"><span>API 地址</span><input value={config.baseUrl} onChange={event => update({baseUrl: event.target.value})} />
            {!isLocalModelUrl(config.baseUrl) && <small className="field-warning">当前测试版的 Agent 对话只接受本机模型服务（http://127.0.0.1 或 localhost）。这个地址可以保存给审计程序使用，但发送对话会被拒绝。</small>}
          </label>
          <label className="field"><span>文本模型</span><input value={config.model} onChange={event => update({model: event.target.value})} /></label>
          <label className="field"><span>视觉模型</span><input value={config.visionModel || ''} onChange={event => update({visionModel: event.target.value})} placeholder="用于图片和扫描件" /></label>
          <label className="field"><span>API 密钥</span><input type="password" autoComplete="new-password" value={key} onChange={event => setKey(event.target.value)} placeholder={boot.settings.hasKey ? '已保存，留空保留' : '输入密钥'} /></label>
          <label className="field"><span>默认执行方式</span>
            <select value={config.defaultMode || 'auto'} onChange={event => update({defaultMode: event.target.value})}>
              <option value="auto">自动选择</option>
              <option value="local-light">本地轻量</option>
              <option value="local-batch">本地批量</option>
            </select>
          </label>
        </div>

        <div className="authorization">
          <ShieldCheck size={18} />
          <div>
            <strong>注协工商资料</strong>
            <p className="muted">{boot.settings.hasCicpaCookies ? '已保存登录授权，可检查有效性。' : '通过官网登录后自动保存授权，用于工商查询、资料导出和在线股权穿透。'}</p>
          </div>
          <button className="button" disabled={busy || loggingIn} onClick={loginCicpa}>
            {loggingIn ? <><Loader2 size={14} className="spin" />等待官网登录…</> : boot.settings.hasCicpaCookies ? '重新登录注协' : '登录注协'}
          </button>
        </div>

        <button className="disclosure" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}>
          <ChevronDown size={14} className="chevron" />{advanced ? '收起' : '展开'}高级授权导入
        </button>
        {advanced && <label className="field"><span>导入已有会话（可选）</span>
          <input type="password" autoComplete="new-password" value={cookies} onChange={event => setCookies(event.target.value)} placeholder="仅用于导入已有 Cookie JSON；通常使用官网登录即可" />
        </label>}

        <p className="muted small">密钥和注协授权使用系统加密保存在本机，不写入项目成果或任务参数。</p>

        {feedback && <div role="status" className={'feedback ' + feedback.tone}>
          {feedback.tone === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <div>
            <p>{feedback.text}</p>
            {feedback.models && <div className="model-chips">
              {feedback.models.slice(0, 60).map(model => <button key={model} className={'chip' + (model === config.model ? ' selected' : '')} onClick={() => update({model})}>{model}</button>)}
              {feedback.models.length > 60 && <small className="muted">另有 {feedback.models.length - 60} 个，可手动填写。</small>}
            </div>}
          </div>
        </div>}

        <div className="actions">
          <button className="button primary" disabled={busy} onClick={save}>保存设置</button>
          <button className="button" disabled={busy} onClick={testConnection}>测试模型连接</button>
          <button className="button" disabled={busy} onClick={listModels}>查看模型</button>
          <button className="button" disabled={busy} onClick={checkCicpa}>检查注协授权</button>
        </div>
      </section>

      <section className="card settings-card">
        <header className="card-head">
          <span className="card-icon"><Cpu size={16} /></span>
          <div><h3>运行环境</h3><p className="muted">本机审计程序与配套软件的检测结果。</p></div>
        </header>
        {runtime ? <dl className="runtime">
          <RuntimeRow label="审计处理器" ok={runtime.mcpAvailable} value={runtime.mcpAvailable ? '随程序内置' : '运行库缺失，请重新安装程序包'} note="63 项审计任务使用独立运行时。" />
          <RuntimeRow label="Microsoft Excel" ok={!!runtime.excel} value={runtime.excel ? '已找到 Excel' : '未检测到标准安装位置'} note="用于打开成果及重算底稿公式。" />
          <RuntimeRow label="工作流规范" ok value={`已加载 ${runtime.skills.length} 项规范`} note="在各业务阶段查看处理要求和复核要点。" />
          <RuntimeRow label="当前版本" ok value={boot.version} note={fullTime(boot.build)} />
        </dl> : <p className="muted">{runtimeError || '正在检查运行环境…'}</p>}
      </section>
    </div>
  </div>;
}

function RuntimeRow({label, ok, value, note}: {label: string; ok: boolean; value: string; note?: string}) {
  return <div className="runtime-row">
    <dt>{label}</dt>
    <dd><span className={'pill tone-' + (ok ? 'success' : 'warning')}><i className="dot" />{value}</span>{note && <small className="muted">{note}</small>}</dd>
  </div>;
}
