import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts(
  onSearch: () => void,
  onCloseModal: () => void,
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onSearch();
      }
      if (e.key === 'Escape') {
        onCloseModal();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSearch, onCloseModal]);
}
