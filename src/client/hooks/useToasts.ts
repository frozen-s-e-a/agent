import {useCallback, useRef, useState} from 'react';
import {errorMessage} from '../lib/format';

export interface Toast {
  id: number;
  tone: 'error' | 'success';
  text: string;
}

const NOTICE_MS = 3600;

/** Errors stay until dismissed; notices fade on their own. Repeats of a visible message are not stacked. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts(current => current.filter(item => item.id !== id)), []);

  const push = useCallback((tone: Toast['tone'], text: string) => {
    const id = ++nextId.current;
    setToasts(current => current.some(item => item.text === text && item.tone === tone)
      ? current
      : [...current.slice(-3), {id, tone, text}]);
    if (tone === 'success') window.setTimeout(() => dismiss(id), NOTICE_MS);
  }, [dismiss]);

  const reportError = useCallback((value: unknown) => push('error', errorMessage(value)), [push]);
  const notify = useCallback((text: string) => push('success', text), [push]);

  return {toasts, dismiss, reportError, notify};
}
