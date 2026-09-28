import React from 'react';
import { Layers, AlertCircle, Loader2 } from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';
import { ToolCallCard } from './ToolCallCard';
import { AttachmentList } from './Attachments';
import { TaskCard } from './TaskCard';

interface MessagesProps {
  events: any[];
  calls: any[];
  tasks: any[];
  tools: any[];
  streaming: boolean;
  turn: string;
  phase: string;
  sessionId: string;
  busy: boolean;
  onError: (e: any) => void;
  onRetry: (event: any) => void;
}

export function Messages({
  events, calls, tasks, tools,
  streaming, turn, phase, sessionId, busy, onError, onRetry,
}: MessagesProps) {
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: streaming ? 'auto' : 'smooth' });
  }, [events.length, streaming, turn]);

  return (
    <section className="conversation" aria-label="对话记录">
      <div className="message-scroll">
        <div className="messages">
          {events.map(e => (
            <React.Fragment key={e.id}>
              {e.type === 'tool' && (
                <ToolCallCard call={calls?.find((c: any) => c.id === e.callId)} />
              )}
              {e.type === 'task' && (
                <TaskCard
                  task={tasks.find((t: any) => t.id === e.taskId)}
                  tools={tools}
                  onError={onError}
                />
              )}
              {e.type !== 'tool' && e.type !== 'task' && (
                <div className={'message ' + e.type} role={e.type === 'error' ? 'alert' : undefined}>
                  <div className="message-avatar">
                    {e.type === 'user' ? '你' :
                      e.type === 'error' ? <AlertCircle size={18}/> :
                        <Layers size={18}/>}
                  </div>
                  <div className="message-body">
                    <div className="message-author">
                      {e.type === 'user' ? '你' : e.type === 'error' ? '回复失败' : 'AI 助手'}
                      <span>{new Date(e.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {e.type === 'assistant' ? (
                      <div className="message-content">
                        <MarkdownMessage text={e.text} onError={onError} />
                      </div>
                    ) : e.type === 'error' ? (
                      <div className="message-text">{e.text}</div>
                    ) : (
                      <div className="message-content">{e.text}</div>
                    )}
                    {e.model && e.type === 'assistant' && <small className="message-model">{e.model}</small>}
                    {e.type === 'error' && (() => {
                      const failedUser = e.userEventId
                        ? events.find((candidate: any) => candidate.id === e.userEventId && candidate.type === 'user')
                        : undefined;
                      return failedUser ? (
                        <div className="message-error-actions">
                          <span>本轮没有生成可用结果</span>
                          <button disabled={busy || streaming} onClick={() => onRetry(failedUser)}>重新发送</button>
                        </div>
                      ) : null;
                    })()}
                    <AttachmentList items={e.attachments} sessionId={sessionId} />
                    {e.attachmentNotes?.length > 0 && (
                      <details className="attachment-notes">
                        <summary>附件读取范围</summary>
                        {e.attachmentNotes.map((n: string, i: number) => <p key={i}>{n}</p>)}
                      </details>
                    )}
                    {e.type === 'assistant' && e.usage?.total_tokens !== undefined && (
                      <details className="usage-detail">
                        <summary>{e.usage.total_tokens.toLocaleString()} Tokens · 用量详情</summary>
                        <pre>{JSON.stringify(e.usage || { 说明: '供应商未返回完整用量' }, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}

          {streaming && (
            <div className="message assistant">
              <div className="message-avatar"><Layers size={18}/></div>
              <div className="message-body">
                <div className="message-author">
                  AI 助手 <Loader2 className="spin" size={13}/>
                </div>
                <div className="message-content">
                  {turn ? (
                    <MarkdownMessage text={turn} onError={onError} />
                  ) : (
                    <div className="message-text">{phase || '正在连接模型…'}</div>
                  )}
                  <span className="cursor"/>
                </div>
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>
      </div>
    </section>
  );
}
