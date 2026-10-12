import {useCallback, useEffect, useRef, useState} from 'react';
import {api} from '../api';
import {isActiveTask} from '../lib/format';
import type {SessionRecord} from '../types';

const FAST_POLL_MS = 650;
const IDLE_POLL_MS = 1800;

/**
 * Loads one conversation and keeps it fresh while it is open.
 * Polls quickly while the agent is streaming or a local task runs, slowly otherwise.
 * Responses for a conversation that is no longer selected are dropped.
 */
export function useSessionRecord(sessionId: string, onError: (error: unknown) => void) {
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const selected = useRef(sessionId);
  selected.current = sessionId;
  const reportError = useRef(onError);
  reportError.current = onError;

  const reload = useCallback(async (id: string = selected.current) => {
    if (!id) return null;
    const next = await api('session.get', {id}) as SessionRecord;
    if (selected.current === id) setRecord(next);
    return next;
  }, []);

  useEffect(() => {
    setRecord(null);
    if (!sessionId) return;
    let alive = true, timer = 0;
    const tick = async () => {
      let fast = false;
      try {
        const next = await reload(sessionId);
        fast = !!next?.streaming || !!next?.tasks.some(task => isActiveTask(task.status));
      } catch (error) {
        if (alive) reportError.current(error);
      }
      if (alive) timer = window.setTimeout(tick, fast ? FAST_POLL_MS : IDLE_POLL_MS);
    };
    tick();
    return () => { alive = false; window.clearTimeout(timer); };
  }, [sessionId, reload]);

  return {record, reload};
}
