import React, { useState } from 'react';
import { Check, RefreshCw, PlugZap, Loader2, Info } from 'lucide-react';
import { api } from './api';
import { useTransientNotice } from './useTransientNotice';

interface ModelSettingsProps {
  settings: any;
  setSettings: (s: any) => void;
  keyValue: string;
  setKey: (k: string) => void;
  busy: boolean;
  save: () => void;
}

export function ModelSettings({ settings: s, setSettings: set, keyValue, setKey, busy, save }: ModelSettingsProps) {
  const [pending, setPending] = useState('');
  const [result, setResult] = useTransientNotice<{ ok: boolean; text: string } | null>(null);
  const change = (key: string, value: any) => { set({ ...s, [key]: value }); setResult(null); };

  const run = async (kind: string) => {
    setPending(kind);
    setResult(null);
    try {
      const r = await api(
        kind === 'list' ? 'models.list' : 'connection.test',
        { settings: { ...s, model: kind === 'vision' ? s.visionModel : s.model }, key: keyValue }
      );
      if (kind === 'list') {
        const models = r.models || [];
        // 只把名称明确表示支持视觉的模型推荐给视觉输入，避免误把普通模型当成视觉模型。
        const visionCandidate = models.find(
          (m: string) => /vision|img|image/i.test(m)
        ) || '';
        const textCandidate = models.find((m: string) => m !== visionCandidate) || models[0];
        set({ ...s, baseUrl: r.baseUrl, models, model: textCandidate || '', visionModel: visionCandidate || '' });
        setResult({ ok: true, text: `已获取 ${r.count} 个模型。已自动推荐文本和视觉模型，请确认后保存。` });
      } else {
        set({ ...s, baseUrl: r.baseUrl });
        setResult({ ok: true, text: `连接成功 · ${r.model} · ${r.latencyMs} 毫秒。已收到真实对话响应；测试不验证图片识别能力。` });
      }
    } catch (e: any) {
      setResult({ ok: false, text: e.message });
    } finally {
      setPending('');
    }
  };

  const options = Array.from(new Set<string>([...(s.models || []), s.model, s.visionModel].filter(Boolean)));

  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">MODEL & CONNECTION</span>
        <h1>模型服务</h1>
        <p>连接你的模型服务，分别设置文本和视觉模型。</p>
      </div>

      <div className="settings-card">
        <h3>连接设置</h3>
        <label>
          服务地址
          <input aria-label="服务地址" value={s.baseUrl || ''} onChange={e => change('baseUrl', e.target.value)} />
          <small>填写兼容接口的基础地址，支持本机及内网服务；自动识别常见 /v1 路径。</small>
        </label>
        <label>
          API 密钥
          <input
            aria-label="API 密钥"
            type="password"
            autoComplete="new-password"
            placeholder={s.hasKey ? '已配置；留空保留现有密钥' : '输入模型服务的 API 密钥'}
            value={keyValue}
            onChange={e => { setKey(e.target.value); setResult(null); }}
          />
          <small>通过 Windows 加密保存。测试直接使用当前填写的配置，无需先保存。</small>
        </label>

        <div className="connection-actions">
          <button className="secondary" disabled={!!pending || busy} onClick={() => run('list')}>
            {pending === 'list' ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            获取可用模型
          </button>
          <span>从服务端读取模型列表</span>
        </div>

        <div className="model-fields">
          {/* 文本模型 */}
          <div className="model-field">
            <label>
              文本模型
              <select aria-label="文本模型" value={s.model || ''} onChange={e => change('model', e.target.value)}>
                <option value="">请选择模型</option>
                {options.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <details className="manual-model">
              <summary>手动填写模型名称</summary>
              <input
                aria-label="手动填写文本模型"
                placeholder="也可手动填写模型名称"
                value={s.model || ''}
                onChange={e => change('model', e.target.value)}
              />
            </details>
          </div>

          {/* 视觉模型 */}
          <div className="model-field vision-field">
            <label>
              视觉模型
              <select aria-label="视觉模型" value={s.visionModel || ''} onChange={e => change('visionModel', e.target.value)}>
                <option value="">尚未设置视觉模型</option>
                {options.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <details className="manual-model">
              <summary>手动填写模型名称</summary>
              <input
                aria-label="手动填写视觉模型"
                placeholder="也可手动填写模型名称"
                value={s.visionModel || ''}
                onChange={e => change('visionModel', e.target.value)}
              />
            </details>
          </div>
        </div>

        <small className="muted">模型列表不代表视觉能力，请按服务商说明选择支持图片输入的模型。</small>

        <div className="connection-actions">
          <button className="secondary" disabled={!!pending || busy} onClick={() => run('text')}>
            <PlugZap size={16} />
            {pending === 'text' ? '正在测试…' : '测试文本连接'}
          </button>
          <button className="secondary" disabled={!!pending || busy || !s.visionModel} onClick={() => run('vision')}>
            <PlugZap size={16} />
            {pending === 'vision' ? '正在测试…' : '测试视觉连接'}
          </button>
        </div>

        {result && (
          <div role="status" className={'connection-result ' + (result.ok ? 'ok' : 'failed')}>
            {result.text}
          </div>
        )}

        <small className="muted">连接测试会发送一条短消息，最多请求 32 个 Token。</small>

        <div className="modal-footer" style={{ marginTop: 16 }}>
          <span></span>
          <button className="primary" disabled={busy} onClick={save}>
            {busy ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
            保存设置
          </button>
        </div>
      </div>
    </>
  );
}
