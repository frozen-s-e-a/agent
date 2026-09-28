import { useCallback, useState } from 'react';
import { useTransientNotice } from '../useTransientNotice';
import type { Boot } from '../types';

interface UseBootReturn {
  boot: Boot | null;
  refresh: () => Promise<Boot>;
}

export function useBoot(onError: (e: string) => void): UseBootReturn {
  const [boot, setBoot] = useState<Boot | null>(null);

  const refresh = useCallback(async (): Promise<Boot> => {
    const raw = await (window as any).audit?.invoke('bootstrap') as Boot;
    const merged = {
      ...raw,
      tools: [...(raw.tools || []), ...(raw.legacyTools || [])],
    };
    setBoot(merged as Boot);
    return merged as Boot;
  }, [onError]);

  return { boot, refresh };
}
