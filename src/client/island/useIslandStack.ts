import { useMemo } from 'react';
import { callTimestamp } from '../toolNarrative';

const MAX_VISIBLE_ISLANDS = 8;

export function useIslandStack(calls: any[] = []) {
  return useMemo(() => {
    const items = [...calls]
      .sort((a, b) => callTimestamp(b) - callTimestamp(a) || String(b?.id || '').localeCompare(String(a?.id || '')))
      .slice(0, MAX_VISIBLE_ISLANDS);
    const hiddenCount = Math.max(0, calls.length - items.length);
    const completed = calls.length > 0 && calls.every(call => ['succeeded', 'failed', 'cancelled', 'expired', 'success', 'error'].includes(String(call.status).toLowerCase()));
    return { items, hiddenCount, completed, total: calls.length };
  }, [calls]);
}
