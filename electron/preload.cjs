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
});
