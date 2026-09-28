import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import type { FileSystemEntry } from '../types';

interface UseFilesReturn {
  files: FileSystemEntry[];
  folder: string;
  setFolder: (f: string) => void;
  refresh: () => Promise<void>;
}

export function useFiles(
  projectId: string | null,
  folder: string,
  onError: (e: unknown) => void,
): UseFilesReturn {
  const [files, setFiles] = useState<FileSystemEntry[]>([]);
  const [folderState, setFolder] = useState(folder);

  useEffect(() => {
    setFolder('');
  }, [projectId]);

  useEffect(() => {
    let alive = true;
    if (projectId) {
      api('files.list', { projectId, path: folderState })
        .then(f => { if (alive) setFiles(f); })
        .catch(onError);
    } else {
      setFiles([]);
    }
    return () => { alive = false; };
  }, [projectId, folderState, onError]);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    try {
      const f = await api('files.list', { projectId, path: folderState });
      setFiles(f);
    } catch (e) { onError(e); }
  }, [projectId, folderState, onError]);

  return { files, folder: folderState, setFolder, refresh };
}
