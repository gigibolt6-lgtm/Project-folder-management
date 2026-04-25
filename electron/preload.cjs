const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('folderApi', {
  openFolder: (targetPath) => ipcRenderer.invoke('folder:open', targetPath),
});
