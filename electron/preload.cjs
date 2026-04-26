const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('folderApi', {
  openFolder: (targetPath) => ipcRenderer.invoke('folder:open', targetPath),
  selectAndScanFolder: () => ipcRenderer.invoke('folder:selectAndScan'),
  registerRoot: (rootPath) => ipcRenderer.invoke('folder:registerRoot', { rootPath }),
  createFolder: (parentPath, folderName) => ipcRenderer.invoke('folder:create', { parentPath, folderName }),
  renameFolder: (targetPath, newName) => ipcRenderer.invoke('folder:rename', { targetPath, newName }),
  deleteFolder: (targetPath) => ipcRenderer.invoke('folder:delete', { targetPath }),
  moveFolder: (sourcePath, destinationParentPath) =>
    ipcRenderer.invoke('folder:move', { sourcePath, destinationParentPath }),
  scanFolderPath: (targetPath) => ipcRenderer.invoke('folder:scanPath', { targetPath }),
});

contextBridge.exposeInMainWorld('electronAPI', {
  focusAppWindow: () => ipcRenderer.invoke('focus-app-window'),
  showFolderContextMenu: (payload) => ipcRenderer.invoke('folder:show-context-menu', payload),
  onRendererRefocusRequest: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('app:renderer-refocus-request', listener);
    return () => {
      ipcRenderer.removeListener('app:renderer-refocus-request', listener);
    };
  },
  onFolderContextMenuCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('folder:context-menu-command', listener);
    return () => {
      ipcRenderer.removeListener('folder:context-menu-command', listener);
    };
  },
});
