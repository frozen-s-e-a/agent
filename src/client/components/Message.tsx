import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {AlertTriangle, Sparkles} from 'lucide-react';
import {api} from '../api';
import {shortTime} from '../lib/format';
import type {TextEvent} from '../types';

export function Message({event, onError}: {event: TextEvent; onError: (error: unknown) => void}) {
  if (event.type === 'error') {
    return <div className="message-error" role="note">
      <AlertTriangle size={16} />
      <div><strong>这次处理没有完成</strong><p>{event.text}</p></div>
    </div>;
  }
  const user = event.type === 'user';
  return <article className={'message ' + (user ? 'from-user' : 'from-agent')}>
    {!user && <div className="avatar agent"><Sparkles size={15} /></div>}
    <div className="bubble">
      <div className="message-meta">{user ? '任务要求' : '审计 Agent'}<time>{shortTime(event.at)}</time></div>
      <div className="markdown">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{a: ({href, children}) => <button className="text-link" onClick={() => api('link.open', {url: href}).catch(onError)}>{children}</button>}}
        >{event.text || ''}</ReactMarkdown>
      </div>
      {event.type === 'assistant' && !!event.toolCount && <small className="evidence-note">已调用 {event.toolCount} 个本地步骤；计算结果和成果文件以执行记录为准。</small>}
    </div>
  </article>;
}
