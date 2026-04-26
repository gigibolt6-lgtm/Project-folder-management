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
      registerRoot: (rootPath: string) => Promise<{
        ok: boolean;
        rootPath?: string;
        message?: string;
      }>;
      createFolder: (parentPath: string, folderName: string) => Promise<{
        ok: boolean;
        folderPath?: string;
        message?: string;
      }>;
      renameFolder: (targetPath: string, newName: string) => Promise<{
        ok: boolean;
        folderPath?: string;
        message?: string;
      }>;
      deleteFolder: (targetPath: string) => Promise<{ ok: boolean; message?: string }>;
      moveFolder: (sourcePath: string, destinationParentPath: string) => Promise<{
        ok: boolean;
        folderPath?: string;
        message?: string;
      }>;
      scanFolderPath: (targetPath: string) => Promise<{
        ok: boolean;
        folder?: FolderNode;
        message?: string;
      }>;
    };
    electronAPI?: {
      focusAppWindow?: () => Promise<boolean>;
    };
  }
}

export {};
