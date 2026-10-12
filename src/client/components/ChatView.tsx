import React from 'react';
import {api} from '../api';
import {isActiveTask} from '../lib/format';
import {Composer} from './Composer';
import {MessageStream} from './MessageStream';
import type {Boot, Project, SessionRecord} from '../types';

interface Props {
  boot: Boot;
  project: Project;
  sessionId: string;
  record: SessionRecord | null;
  reload: (id?: string) => Promise<SessionRecord | null>;
  draft: string;
  setDraft: (value: string) => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
  onRefresh: () => Promise<Boot>;
  onError: (error: unknown) => void;
  onNotice: (message: string) => void;
}

export function ChatView({boot, project, sessionId, record, reload, draft, setDraft, busy, setBusy, onRefresh, onError, onNotice}: Props) {
  // A record for another conversation may still be on screen for one poll after switching.
  const ready = !!sessionId && record?.id === sessionId;
  const streaming = !!record?.streaming;
  const working = streaming || !!record?.tasks?.some(task => isActiveTask(task.status));
  const attachments = ready ? record.attachments || [] : [];

  const send = async () => {
    const text = draft.trim();
    if ((!text && !attachments.length) || !ready || busy || streaming) return;
    setBusy(true);
    setDraft('');
    try {
      await api('chat.send', {sessionId, text, attachments: attachments.map(item => item.id)});
      await reload();
      await onRefresh();
      onNotice('Agent 已开始处理，会在对话中报告进度和必要问题。');
    } catch (error) {
      setDraft(text);
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    try {
      await api('chat.cancel', {sessionId});
      await reload();
      onNotice('已停止当前 Agent 回合，已完成的成果仍保留。');
    } catch (error) { onError(error); }
  };

  const addAttachments = async () => {
    try {
      const result = await api('attachments.choose', {sessionId, kind: 'files'});
      if (result?.attachments?.length) await reload();
    } catch (error) { onError(error); }
  };

  const removeAttachment = async (id: string) => {
    try {
      await api('attachments.remove', {sessionId, id});
      await reload();
    } catch (error) { onError(error); }
  };

  return <>
    <MessageStream
      key={sessionId}
      record={ready ? record : null}
      demo={boot.settings.model === 'offline-demo'}
      onSuggestion={setDraft}
      onReload={reload}
      onError={onError}
    />
    {boot.settings.localModel === false && <p className="composer-warning" role="note">当前模型地址不是本机服务，测试版会拒绝发送。请在「运行设置」里改成本机模型地址。</p>}
    <Composer
      projectName={project.name}
      draft={draft}
      setDraft={setDraft}
      attachments={attachments}
      disabled={busy || !ready || streaming}
      working={working}
      onSend={send}
      onStop={stop}
      onAttach={addAttachments}
      onRemoveAttachment={removeAttachment}
    />
  </>;
}
