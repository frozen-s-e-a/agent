import React from 'react';
import { Layers, MoreHorizontal } from 'lucide-react';
import type { Tool } from '../types';
import { useIslandStack } from './useIslandStack';
import { ToolIsland } from './ToolIsland';

interface IslandRailProps {
  calls?: any[];
  tools?: Tool[];
  phase?: string;
  streaming?: boolean;
  onCancel?: (call: any) => void;
  onRetry?: (call: any) => void;
}

export function IslandRail({ calls = [], tools = [], phase, streaming, onCancel, onRetry }: IslandRailProps) {
  const { items, hiddenCount, completed, total } = useIslandStack(calls);
  const [collapsed, setCollapsed] = React.useState(false);
  React.useEffect(() => {
    setCollapsed(false);
    if (!completed || total <= 1) return;
    const timer = window.setTimeout(() => setCollapsed(true), 2000);
    return () => window.clearTimeout(timer);
  }, [completed, total, calls.map(call => `${call.id}:${call.status}`).join('|')]);
  return (
    <aside className="island-rail" aria-label="工具调用通道">
      <div className="island-rail-header">
        <span className="island-rail-title"><Layers size={15}/>灵动岛</span>
        {total > 0 && <span className="island-count">{total}</span>}
        <button className="icon-btn" title="工具调用说明" aria-label="工具调用说明"><MoreHorizontal size={15}/></button>
      </div>
      {streaming && !items.length && <div className="island-phase"><span className="status-dot" />{phase || '正在连接模型…'}</div>}
      <div className="island-rail-scroll">
        {!collapsed && items.map(call => <ToolIsland key={call.id} call={call} tools={tools} onCancel={onCancel} onRetry={onRetry} />)}
        {!items.length && !streaming && <div className="island-empty">工具调用会显示在这里</div>}
      </div>
      {completed && total > 1 && (
        <button className="island-summary" onClick={() => setCollapsed(value => !value)} aria-expanded={!collapsed}>
          ✓ {collapsed ? `展开本轮 ${total} 个工具调用` : `本轮已完成 ${total} 个工具调用`}{hiddenCount ? `，另有 ${hiddenCount} 个已折叠` : ''}
        </button>
      )}
    </aside>
  );
}
