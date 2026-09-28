import { useEffect, useRef, useCallback, useState } from 'react';
import { api } from '../api';

interface UseSessionPollingReturn {
  sessionId: string;
  setSessionId: (id: string) => void;
  timeline: any;
  reportError: (e: string) => void;
}

export function useSessionPolling(
  initialSessionId: string,
  onError: (e: string) => void,
): UseSessionPollingReturn {
  const [sessionId, _setSessionId] = useState(initialSessionId);
  const [timeline, setTimeline] = useState<any>({ events: [], tasks: [] });
  const aliveRef = useRef(true);
  const lastErrorRef = useRef('');

  const setSessionId = useCallback((id: string) => {
    _setSessionId(id);
  }, []);

  // Session polling
  useEffect(() => {
    if (!sessionId) return;

    aliveRef.current = true;

    const tick = () => {
      api('session.get', { id: sessionId })
        .then(r => {
          if (aliveRef.current) setTimeline(r);
        })
        .catch(e => {
          if (aliveRef.current && lastErrorRef.current !== e.message) {
            lastErrorRef.current = e.message;
            onError(e.message || String(e));
          }
        });
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => {
      aliveRef.current = false;
      clearInterval(timer);
    };
  }, [sessionId, onError]);

  return { sessionId, setSessionId, timeline, reportError: onError };
}
