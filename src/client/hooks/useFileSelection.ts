import { useState, useCallback } from 'react';

/**
 * Manages a set of selected file paths with toggle and clear operations.
 */
export function useFileSelection(initial: string[] = []) {
  const [selected, setSelected] = useState<string[]>(initial);

  const toggle = useCallback((path: string) => {
    setSelected(prev =>
      prev.includes(path)
        ? prev.filter(x => x !== path)
        : [...prev, path]
    );
  }, []);

  const clear = useCallback(() => setSelected([]), []);

  return { selected, toggle, clear };
}
