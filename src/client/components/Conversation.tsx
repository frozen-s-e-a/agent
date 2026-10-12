import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Columns3, FolderSearch, Loader2, PanelRight, Scale, Sparkles} from 'lucide-react';
import {api} from '../api';
import {isActiveTask, statusLabel, statusTone} from '../lib/format';
import {buildTurns} from '../lib/turns';
import {useWorkspace} from '../lib/workspace';
import {Composer} from './Composer';
import {Turn} from './Turn';
import type {Project, SessionRecord} from '../types';

const SUGGESTIONS = [
  {label: '检查资料结构', text: '检查项目资料结构，输出文件清单。', icon: FolderSearch},
  {label: '提取需要的字段', text: '提取公司、凭证日期、科目名称、借方金额、贷方金额五列，输出新表。', icon: Columns3},
  {label: '检查借贷平衡', text: '读取序时账，检查借贷是否平衡，生成差异清单。', icon: Scale},
];

interface Props {
  project: Project;
  sessionId: string;
  record: SessionRecord | null;
  reload: () => Promise<SessionRecord | null>;
  draft: string;
  setDraft: (value: string) => void;
  scope: string[];
  setScope: (value: string[]) => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onPickScope: () => void;
  onTurnStarted: () => Promise<unknown>;
}

export function Conversation(props: Props) {
  const {project, sessionId, record, reload, draft, setDraft, scope, setScope} = props;
  const {onError} = useWorkspace();
  const [sending, setSending] = useState(false);
  // A record for another conversation may still be on screen for one poll after switching.
  const ready = !!sessionId && record?.id === sessionId;
  const current = ready ? record : null;
  const streaming = !!current?.streaming;
  const working = streaming || !!current?.tasks.some(task => isActiveTask(task.status));
  const attachments = current?.attachments || [];
  const turns = useMemo(() => current ? buildTurns(current) : [], [current]);
  const latestRun = current?.agentRuns.at(-1);

  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useLayoutEffect(() => {
    const node = scroller.current;
    if (node && pinned.current) node.scrollTop = node.scrollHeight;
  });
  useLayoutEffect(() => { pinned.current = true; }, [sessionId]);

  const send = async () => {
    const text = draft.trim();
    if ((!text && !attachments.length) || !ready || sending || streaming) return;
    setSending(true);
    setDraft('');
    pinned.current = true;
    try {
      await api('chat.send', {sessionId, text, attachments: attachments.map(item => item.id), projectFiles: scope});
      setScope([]);
      await reload();
      await props.onTurnStarted();
    } catch (error) {
      setDraft(text);
      onError(error);
    } finally {
      setSending(false);
    }
  };
  const stop = () => api('chat.cancel', {sessionId}).then(() => reload()).catch(onError);
  const attach = async (kind: 'files' | 'folder' | 'images') => {
    try {
      const result = await api('attachments.choose', {sessionId, kind});
      if (result?.attachments?.length) await reload();
    } catch (error) { onError(error); }
  };
  const removeAttachment = (id: string) => api('attachments.remove', {sessionId, id}).then(() => reload()).catch(onError);

  const [tone, label] = streaming ? ['running', 'Agent 正在处理']
    : working ? ['running', '审计程序执行中']
    : latestRun ? [statusTone(latestRun.status), statusLabel(latestRun.status)]
    : ['neutral', '随时可以下达任务'];

  return <div className="conversation">
    <header className="topbar agent-topbar">
      <div className="topbar-title">
        <span className="eyebrow">{project.name}</span>
        <h1>{current?.title || '新对话'}</h1>
      </div>
      <div className="topbar-actions">
        <span className={'pill tone-' + tone}>{tone === 'running' ? <Loader2 size={12} className="spin" /> : <i className="dot" />}{label}</span>
        <button className={'icon-button' + (props.panelOpen ? ' active' : '')} aria-label="项目资料与成果" aria-pressed={props.panelOpen} title="项目资料与成果" onClick={props.onTogglePanel}><PanelRight size={17} /></button>
      </div>
    </header>

    <div className="stream" ref={scroller} onScroll={event => {
      const node = event.currentTarget;
      pinned.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
    }}>
      <div className="stream-inner">
        {!current && <div className="stream-loading"><Loader2 size={18} className="spin" />正在打开对话…</div>}
        {current && !turns.length && !streaming && <section className="welcome">
          <div className="welcome-mark"><Sparkles size={20} /></div>
          <h2>这次想完成什么审计工作？</h2>
          <p className="muted">直接说目标、资料范围和希望得到的成果。Agent 会先读取「{project.name}」的资料，制定计划后调用审计程序执行；口径不清时会先向你提问。</p>
          <div className="suggestions">
            {SUGGESTIONS.map(item => <button key={item.label} className="suggestion" aria-label={item.label} title={item.text} onClick={() => setDraft(item.text)}>
              <span className="suggestion-icon"><item.icon size={15} aria-hidden="true" /></span>
              <strong>{item.label}</strong><small>{item.text}</small>
            </button>)}
          </div>
        </section>}
        {current && turns.map((turn, index) => <Turn key={turn.id} turn={turn} record={current} latest={index === turns.length - 1} onReload={reload} />)}
      </div>
    </div>

    <Composer
      draft={draft}
      setDraft={setDraft}
      attachments={attachments}
      scope={scope}
      disabled={sending || !ready || streaming}
      working={working}
      onSend={send}
      onStop={stop}
      onAttach={attach}
      onRemoveAttachment={removeAttachment}
      onRemoveScope={path => setScope(scope.filter(item => item !== path))}
      onPickScope={props.onPickScope}
    />
  </div>;
}
