const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }
}

ipcMain.handle('folder:open', async (_event, folderPath) => {
  try {
    if (!folderPath || typeof folderPath !== 'string' || !folderPath.trim()) {
      return { ok: false, message: 'フォルダパスが不正です' };
    }

    const normalizedPath = folderPath.trim();
    if (!fs.existsSync(normalizedPath)) {
      return { ok: false, message: 'フォルダが存在しません' };
    }

    const openResult = await shell.openPath(normalizedPath);
    if (openResult === '') {
      return { ok: true };
    }

    return { ok: false, message: openResult };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
