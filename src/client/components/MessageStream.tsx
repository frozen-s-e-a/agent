import React, {useLayoutEffect, useRef} from 'react';
import {Loader2, Sparkles} from 'lucide-react';
import {isActiveTask} from '../lib/format';
import {Message} from './Message';
import {StepGroup} from './StepGroup';
import {RunPanel} from './RunPanel';
import type {ChatEvent, SessionRecord, TextEvent, ToolCall} from '../types';

const SUGGESTIONS = [
  {label: '检查资料结构', text: '检查项目资料结构，输出文件清单。'},
  {label: '提取需要的字段', text: '提取公司、凭证日期、科目名称、借方金额、贷方金额五列，输出新表。'},
  {label: '检查借贷平衡', text: '读取示例序时账，检查借贷是否平衡，生成差异清单。'},
];

type Block = {kind: 'event'; event: TextEvent} | {kind: 'steps'; id: string; calls: ToolCall[]};

/** Consecutive tool events become one collapsible block so a turn reads as request → steps → answer. */
function toBlocks(events: ChatEvent[], calls: ToolCall[]): Block[] {
  const blocks: Block[] = [];
  for (const event of events) {
    if (event.type === 'tool') {
      const call = calls.find(item => item.id === event.callId) || {id: event.callId, name: '', status: 'running'};
      const last = blocks.at(-1);
      if (last?.kind === 'steps') last.calls.push(call);
      else blocks.push({kind: 'steps', id: event.id, calls: [call]});
    } else if (event.type === 'user' || event.type === 'assistant' || event.type === 'error') {
      blocks.push({kind: 'event', event});
    }
  }
  return blocks;
}

interface Props {
  record: SessionRecord | null;
  demo: boolean;
  onSuggestion: (text: string) => void;
  onReload: () => Promise<unknown>;
  onError: (error: unknown) => void;
}

export function MessageStream({record, demo, onSuggestion, onReload, onError}: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const blocks = record ? toBlocks(record.events, record.calls) : [];
  const activeTask = record?.tasks?.find(task => isActiveTask(task.status));

  // Follow new output only while the reader is at the bottom; scrolling up to read stops following.
  useLayoutEffect(() => {
    const node = scroller.current;
    if (node && pinned.current) node.scrollTop = node.scrollHeight;
  });

  return <div
    className="stream"
    ref={scroller}
    onScroll={event => {
      const node = event.currentTarget;
      pinned.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
    }}
  >
    <div className="stream-inner">
      {record && !blocks.length && !record.streaming && <section className="welcome">
        <div className="welcome-mark"><Sparkles size={22} /></div>
        <h2>这次想完成什么审计工作？</h2>
        <p className="muted">直接说目标、资料范围和希望得到的成果。Agent 会先读取资料，再选择可用的独立审计程序；资料或关键口径不足时，会在这里集中提问。</p>
        <div className="suggestions">
          {SUGGESTIONS.map(item => <button key={item.label} className="suggestion" aria-label={item.label} title={item.text} onClick={() => onSuggestion(item.text)}>
            <strong>{item.label}</strong><small>{item.text}</small>
          </button>)}
        </div>
        {demo && <p className="demo-note">本机体验使用模拟模型编排，审计程序实际处理文件。</p>}
      </section>}
      {!record && <div className="stream-loading"><Loader2 size={18} className="spin" />正在打开对话…</div>}
      {blocks.map(block => block.kind === 'steps'
        ? <StepGroup key={block.id} calls={block.calls} />
        : <Message key={block.event.id} event={block.event} onError={onError} />)}
      {record?.streaming && <div className="live">
        <div className="avatar agent"><Sparkles size={15} /></div>
        <div className="live-body">
          <span className="live-phase"><Loader2 size={14} className="spin" />{record.phase || 'Agent 正在分析…'}</span>
          {record.turn && <p>{record.turn}</p>}
        </div>
      </div>}
      {activeTask && <div className="task-progress">
        <Loader2 size={16} className="spin" />
        <span>{activeTask.phase || '独立审计程序正在执行…'}</span>
        <small>成果写入完成后会回到当前对话。</small>
      </div>}
      {record && <RunPanel record={record} onReload={onReload} onError={onError} />}
    </div>
  </div>;
}
