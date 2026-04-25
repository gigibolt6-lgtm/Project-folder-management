const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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
      console.warn('[folder:open] path not found:', normalizedPath);
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

const MAX_SCAN_DEPTH = 8;

function scanDirectoryTree(absolutePath, depth = 0) {
  const node = {
    id: crypto.randomUUID(),
    name: path.basename(absolutePath),
    path: absolutePath,
    tags: [],
    metadata: { description: '', department: '', owner: '', remark: '' },
    children: [],
  };

  if (depth >= MAX_SCAN_DEPTH) return node;

  let entries = [];
  try {
    entries = fs.readdirSync(absolutePath, { withFileTypes: true });
  } catch (_error) {
    return node;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const childPath = path.join(absolutePath, entry.name);
    try {
      node.children.push(scanDirectoryTree(childPath, depth + 1));
    } catch (_error) {
      // skip unreadable directories
    }
  }

  return node;
}

ipcMain.handle('folder:selectAndScan', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'フォルダを選択',
      properties: ['openDirectory'],
    });

    if (result.canceled || !result.filePaths?.length) {
      return { ok: false, cancelled: true };
    }

    const selectedPath = result.filePaths[0];
    if (!selectedPath || !fs.existsSync(selectedPath)) {
      return { ok: false, message: 'フォルダが存在しません' };
    }

    const folder = scanDirectoryTree(selectedPath);
    return { ok: true, folder };
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
