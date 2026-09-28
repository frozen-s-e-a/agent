import { useState, useCallback } from 'react';
import { api } from '../api';
import type { AppSettings } from '../types';

interface UseNotificationsReturn {
  error: string;
  notice: string;
  setError: (e: string) => void;
  setNotice: (n: string) => void;
}

export function useNotifications(boot: { version: string }): UseNotificationsReturn {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const report = useCallback((e: unknown) => {
    setError(typeof e === 'object' && e !== null && 'message' in e
      ? String(e.message)
      : String(e));
  }, []);

  // Reuse transient notice for error display
  return { error, notice, setError, setNotice };
}

export function useTransientNotice<T>(
  empty: T,
  delay = 3000,
): [T, (value: T) => void] {
  const [entry, setEntry] = useState({ value: empty as T, revision: 0 });

  const show = useCallback((value: T) => {
    setEntry(prev => ({ value, revision: prev.revision + 1 }));
  }, []);

  // We don't use the useEffect here because the original hook does —
  // instead callers use a separate useEffect if they need auto-dismiss.
  // For backward compatibility, the useNotifications hook below wraps this.
  return [entry.value, show];
}
