import React, {useEffect, useState} from 'react';
import {CheckCircle2, ChevronDown, Cpu, KeyRound, Loader2, ShieldCheck, X, XCircle} from 'lucide-react';
import {api} from '../api';
import {errorMessage, fullTime} from '../lib/format';
import type {AppSettings, Boot, RuntimeStatus} from '../types';

interface Props {
  boot: Boot;
  onRefresh: () => Promise<Boot>;
  onNotice: (message: string) => void;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

type Feedback = {tone: 'success' | 'error'; text: string} | null;
type Action = 'save' | 'test' | 'models' | 'clearKey' | 'cicpaLogin' | 'cicpaCheck' | 'cicpaImport';
type ModelForm = Pick<AppSettings, 'baseUrl' | 'model' | 'visionModel' | 'defaultMode'>;

const formOf = (settings: AppSettings): ModelForm => ({
  baseUrl: settings.baseUrl || '',
  model: settings.model || '',
  visionModel: settings.visionModel || '',
  defaultMode: settings.defaultMode || 'auto',
});
const sameForm = (a: ModelForm, b: ModelForm) => (Object.keys(a) as (keyof ModelForm)[]).every(key => (a[key] || '').trim() === (b[key] || '').trim());

export function SettingsView({boot, onRefresh, onNotice, onClose, onDirtyChange}: Props) {
  const [cookies, setCookies] = useState('');
  const [pending, setPending] = useState<Action | null>(null);
  const [cicpaFeedback, setCicpaFeedback] = useState<Feedback>(null);
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [runtimeError, setRuntimeError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [dirty, setDirty] = useState(false);
  const busy = pending !== null;

  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
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
        setCicpaFeedback({tone: status.state === 'authorized' ? 'success' : 'error', text: status.message});
        await onRefresh();
      } catch (error) {
        setLoggingIn(false);
        setCicpaFeedback({tone: 'error', text: errorMessage(error)});
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [loggingIn, onRefresh]);

  const cicpaAction = (action: Action, work: () => Promise<Feedback>) => async () => {
    setPending(action);
    setCicpaFeedback(null);
    try { setCicpaFeedback(await work()); }
    catch (error) { setCicpaFeedback({tone: 'error', text: errorMessage(error)}); }
    finally { setPending(null); }
  };
  const loginCicpa = cicpaAction('cicpaLogin', async () => {
    await api('service.cicpa.login');
    setLoggingIn(true);
    return {tone: 'success', text: '已打开注协官网，请在新窗口完成登录，授权会自动保存。'};
  });
  const checkCicpa = cicpaAction('cicpaCheck', async () => {
    if (!boot.settings.hasCicpaCookies) throw Error('还没有注协授权，请先登录注协。');
    const result = await api('service.cicpa.test');
    return {tone: 'success', text: result.message};
  });
  const importCicpa = cicpaAction('cicpaImport', async () => {
    try { JSON.parse(cookies); } catch { throw Error('导入内容不是有效的 Cookie JSON。'); }
    await api('secret.cicpa.save', {cookies});
    setCookies('');
    await onRefresh();
    return {tone: 'success', text: '已导入授权，可以点“检查注协授权”确认是否有效。'};
  });

  const close = () => {
    if (dirty && !window.confirm('模型服务有未保存的修改，确定放弃吗？')) return;
    onClose();
  };

  return <div className="settings-scroll">
    <div className="settings">
      <div className="settings-intro">
        <div>
          <h2>运行设置</h2>
          <p className="muted">模型服务和授权只影响当前本机，不会写入项目成果。</p>
        </div>
        <button className="icon-button" aria-label="关闭运行设置" onClick={close}><X size={16} /></button>
      </div>

      <section className="card settings-card">
        <header className="card-head">
          <span className="card-icon"><KeyRound size={16} /></span>
          <div><h3>模型服务与查询授权</h3><p className="muted">Agent 对话和 AI 提取使用下面的模型服务；工商查询使用注协登录授权。</p></div>
        </header>

        <ModelServiceForm boot={boot} onRefresh={onRefresh} onNotice={onNotice} onDirtyChange={setDirty} />

        <div className="settings-group">
          <div className="group-head">
            <h4>注协工商资料</h4>
            {boot.settings.hasCicpaCookies
              ? <span className="pill tone-success"><i className="dot" />已保存授权</span>
              : <span className="pill tone-neutral"><i className="dot" />未授权</span>}
          </div>
          <div className="authorization">
            <ShieldCheck size={18} />
            <div><p className="muted">通过注协官网登录后自动保存授权，用于工商查询、资料导出和在线股权穿透。</p></div>
            <button className="button" disabled={busy || loggingIn} onClick={loginCicpa}>
              {loggingIn ? <><Loader2 size={14} className="spin" />等待官网登录…</> : boot.settings.hasCicpaCookies ? '重新登录注协' : '登录注协'}
            </button>
            <button className="button" disabled={busy || loggingIn} onClick={checkCicpa}>{pending === 'cicpaCheck' && <Loader2 size={14} className="spin" />}检查注协授权</button>
          </div>
          <button className="disclosure" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}>
            <ChevronDown size={14} className="chevron" />{advanced ? '收起' : '展开'}高级授权导入
          </button>
          {advanced && <div className="field">
            <span>导入已有会话（可选）</span>
            <div className="input-group">
              <input type="password" autoComplete="new-password" aria-label="导入已有会话" value={cookies} onChange={event => setCookies(event.target.value)} placeholder="粘贴 Cookie JSON；通常直接登录注协即可" />
              <button className="button" disabled={busy || !cookies.trim()} onClick={importCicpa}>{pending === 'cicpaImport' && <Loader2 size={14} className="spin" />}导入授权</button>
            </div>
          </div>}
          {cicpaFeedback && <FeedbackLine value={cicpaFeedback} />}
        </div>

        <p className="muted small">密钥和注协授权使用系统加密保存在本机，不写入项目成果或任务参数。</p>
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

interface ModelFormProps {
  boot: Boot;
  onRefresh: () => Promise<Boot>;
  onNotice?: (message: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** First-run setup: saving is the way forward, so it is always offered and named accordingly. */
  onboarding?: boolean;
  onSaved?: () => void;
}

/** Address, key and model names of the model service, with connection test and model list. */
export function ModelServiceForm({boot, onRefresh, onNotice, onDirtyChange, onboarding, onSaved}: ModelFormProps) {
  // Edits stay local until saved; `saved` is what the backend holds, so the form can tell what is unsaved.
  const [saved, setSaved] = useState<ModelForm>(() => formOf(boot.settings));
  const [form, setForm] = useState<ModelForm>(saved);
  const [models, setModels] = useState<string[]>(boot.settings.models || []);
  const [key, setKey] = useState('');
  const [pending, setPending] = useState<Action | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [advanced, setAdvanced] = useState(false);
  const dirty = !sameForm(form, saved) || !!key.trim();
  const busy = pending !== null;
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const action = (name: Action, work: () => Promise<Feedback>) => async () => {
    setPending(name);
    setFeedback(null);
    try { setFeedback(await work()); }
    catch (error) { setFeedback({tone: 'error', text: errorMessage(error)}); }
    finally { setPending(null); }
  };
  const update = (patch: Partial<ModelForm>) => setForm(current => ({...current, ...patch}));
  const draft = () => ({...form, baseUrl: form.baseUrl.trim(), model: form.model.trim(), visionModel: (form.visionModel || '').trim()});
  const requireAddress = () => { if (!form.baseUrl.trim()) throw Error('请先填写 API 地址。'); };

  const save = action('save', async () => {
    requireAddress();
    if (!form.model.trim()) throw Error('请填写文本模型，或先点“获取模型列表”再选择。');
    const next = draft();
    await api('settings.save', {...next, models});
    setSaved(next);
    setForm(next);
    if (key.trim()) {
      try { await api('secret.save', {key}); setKey(''); }
      catch (error) { await onRefresh(); return {tone: 'error', text: `模型设置已保存，但密钥没有保存：${errorMessage(error)}`}; }
    }
    await onRefresh();
    onNotice?.('模型服务设置已保存');
    onSaved?.();
    return {tone: 'success', text: '已保存。新的对话会使用这些设置。'};
  });
  const testConnection = action('test', async () => {
    requireAddress();
    const result = await api('connection.test', {settings: draft(), key: key || undefined});
    return {tone: 'success', text: `连接正常 · 模型 ${result.model} · 响应 ${result.latencyMs} ms${dirty ? '。当前修改还没有保存。' : ''}`};
  });
  const listModels = action('models', async () => {
    requireAddress();
    const result = await api('models.list', {settings: draft(), key: key || undefined});
    setModels(result.models);
    if (!result.models.length) return {tone: 'error', text: '服务没有返回可用模型，请手动填写模型名称。'};
    return {tone: 'success', text: `服务提供 ${result.count} 个模型，已放进文本模型和视觉模型的下拉列表。保存设置时会一并记住这份列表。`};
  });
  const clearKey = action('clearKey', async () => {
    await api('secret.save', {key: ''});
    setKey('');
    await onRefresh();
    return {tone: 'success', text: '已清除保存的密钥。'};
  });

  return <form className="settings-group" onSubmit={event => { event.preventDefault(); if (!busy) save(); }}>
    <div className="group-head">
      <h4>模型服务</h4>
      {dirty
        ? <span className="pill tone-warning"><i className="dot" />有未保存的修改</span>
        : saved.baseUrl && saved.model ? <span className="pill tone-success"><i className="dot" />已保存</span>
        : <span className="pill tone-neutral"><i className="dot" />尚未配置</span>}
    </div>
    <div className="form-grid">
      <label className="field wide"><span>API 地址</span>
        <input value={form.baseUrl} onChange={event => update({baseUrl: event.target.value})} placeholder="例如 https://模型网关地址/v1；企业内网服务可用 http" />
      </label>
      <label className="field wide"><span>API 密钥</span>
        <input type="password" autoComplete="new-password" value={key} onChange={event => setKey(event.target.value)} placeholder={boot.settings.hasKey ? '已保存，留空则继续使用' : '服务不需要密钥时可留空'} />
        {boot.settings.hasKey && <small className="field-hint">已保存一把密钥。<button type="button" className="link-button" disabled={busy} onClick={clearKey}>清除已保存的密钥</button></small>}
      </label>
      <ModelField label="文本模型" value={form.model} options={models} required onChange={model => update({model})} />
      <ModelField label="视觉模型" value={form.visionModel || ''} options={models} onChange={visionModel => update({visionModel})} />
    </div>
    {!onboarding && <>
      <button type="button" className="disclosure" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}>
        <ChevronDown size={14} className="chevron" />{advanced ? '收起' : '展开'}高级选项
      </button>
      {advanced && <label className="field narrow-field"><span>审计程序执行方式</span>
        <select value={form.defaultMode} onChange={event => update({defaultMode: event.target.value})}>
          <option value="auto">自动选择（推荐）</option>
          <option value="local-light">轻量：资料少时更快</option>
          <option value="local-batch">批量：资料多时更稳</option>
        </select>
      </label>}
    </>}
    {feedback && <FeedbackLine value={feedback} />}
    <div className="actions">
      <button type="submit" className="button primary" disabled={busy || (!dirty && !onboarding)}>{pending === 'save' && <Loader2 size={14} className="spin" />}{onboarding ? '保存并继续' : '保存设置'}</button>
      <button type="button" className="button" disabled={busy} onClick={testConnection}>{pending === 'test' && <Loader2 size={14} className="spin" />}测试模型连接</button>
      <button type="button" className="button" disabled={busy} onClick={listModels}>{pending === 'models' && <Loader2 size={14} className="spin" />}获取模型列表</button>
    </div>
  </form>;
}

const MANUAL = '__manual__';

/** A model name picked from the fetched list, or typed by hand when the list lacks it or was never fetched. */
function ModelField({label, value, options, required, onChange}: {label: string; value: string; options: string[]; required?: boolean; onChange: (value: string) => void}) {
  const [manual, setManual] = useState(false);
  const listed = options.length > 0 && !manual && (!value || options.includes(value));
  return <label className="field"><span>{label}</span>
    {listed
      ? <select value={value} onChange={event => event.target.value === MANUAL ? setManual(true) : onChange(event.target.value)}>
          <option value="">{required ? '请选择模型' : '不使用'}</option>
          {options.map(option => <option key={option} value={option}>{option}</option>)}
          <option value={MANUAL}>手动填写…</option>
        </select>
      : <input value={value} onChange={event => onChange(event.target.value)} placeholder={required ? '填写模型名称，或先获取模型列表' : '用于图片和扫描件，可留空'} />}
    {!listed && options.length > 0 && <small className="field-hint"><button type="button" className="link-button" onClick={() => { setManual(false); if (!options.includes(value)) onChange(''); }}>从模型列表选择</button></small>}
  </label>;
}

function FeedbackLine({value}: {value: NonNullable<Feedback>}) {
  return <div role="status" className={'feedback ' + value.tone}>
    {value.tone === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
    <div><p>{value.text}</p></div>
  </div>;
}

function RuntimeRow({label, ok, value, note}: {label: string; ok: boolean; value: string; note?: string}) {
  return <div className="runtime-row">
    <dt>{label}</dt>
    <dd><span className={'pill tone-' + (ok ? 'success' : 'warning')}><i className="dot" />{value}</span>{note && <small className="muted">{note}</small>}</dd>
  </div>;
}
