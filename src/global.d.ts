declare global {
  interface Window {
    folderApi?: {
      openFolder: (path: string) => Promise<{ ok: boolean; message?: string }>;
    };
  }
}

export {};
