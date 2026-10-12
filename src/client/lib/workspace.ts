import {createContext, useContext} from 'react';
import type {FilePreviewData} from '../types';

/** Services every part of the open workspace needs without threading props through each card. */
export interface WorkspaceServices {
  onError: (error: unknown) => void;
  openPreview: (value: FilePreviewData) => void;
  /** Audit program id → display name, for plan steps. */
  toolNames: Map<string, string>;
}

export const WorkspaceContext = createContext<WorkspaceServices>({
  onError: () => undefined,
  openPreview: () => undefined,
  toolNames: new Map(),
});

export const useWorkspace = () => useContext(WorkspaceContext);
