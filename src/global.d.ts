import type { FolderNode } from './types';

declare global {
  interface Window {
    folderApi?: {
      openFolder: (path: string) => Promise<{ ok: boolean; message?: string }>;
      selectAndScanFolder: () => Promise<{
        ok: boolean;
        cancelled?: boolean;
        folder?: FolderNode;
        message?: string;
      }>;
    };
  }
}

export {};
