import { useCallback, useEffect, useState } from 'react';

// A new notification restarts its own lifetime, including repeated messages.
export function useTransientNotice<T>(
  empty: T,
  delay = 3000,
): [T, (value: T) => void] {
  const [entry, setEntry] = useState({ value: empty as T, revision: 0 });

  const show = useCallback((value: T) => {
    setEntry(previous => ({ value, revision: previous.revision + 1 }));
  }, []);

  useEffect(() => {
    if (Object.is(entry.value, empty) || delay <= 0) return;

    const timer = window.setTimeout(
      () => setEntry(current =>
        current.revision === entry.revision
          ? { ...current, value: empty as T }
          : current
      ),
      delay,
    );

    return () => window.clearTimeout(timer);
  }, [entry, empty, delay]);

  return [entry.value, show];
}
