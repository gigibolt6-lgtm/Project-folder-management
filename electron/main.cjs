const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
const registeredRoots = new Set();
const INVALID_FOLDER_NAME_CHARS = /[<>:"/\\|?*]/;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.focus();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }
}

ipcMain.handle('focus-app-window', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (!win || win.isDestroyed()) {
    console.warn('[focus-app-window] target window not found');
    return false;
  }

  if (win.isMinimized()) {
    win.restore();
  }
  if (!win.isVisible()) {
    win.show();
  }
  try {
    win.moveTop();
  } catch (error) {
    console.warn('[focus-app-window] moveTop failed', error);
  }
  if (process.platform === 'darwin') {
    app.focus({ steal: true });
  }
  win.focus();
  win.webContents.focus();

  const focused = win.isFocused();
  if (!focused) {
    console.warn('[focus-app-window][warn] window is not focused after focus request', {
      isVisible: win.isVisible(),
      isMinimized: win.isMinimized(),
      isDestroyed: win.isDestroyed(),
    });
  }
  return focused;
});

ipcMain.handle('folder:show-context-menu', async (event, payload) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (!win || win.isDestroyed()) {
    console.warn('[folder-context-menu][warn] target window not found');
    return false;
  }

  const folderId = payload?.folderId;
  const folderPath = payload?.folderPath;
  const folderName = payload?.folderName;
  if (!folderId) {
    console.warn('[folder-context-menu][warn] folderId is missing', payload);
    return false;
  }

  const sendCommand = (action) => {
    if (win.isDestroyed()) return;
    win.webContents.send('folder:context-menu-command', {
      action,
      folderId,
      folderPath,
      folderName,
    });
  };

  const menu = Menu.buildFromTemplate([
    { label: 'フォルダ名変更', click: () => sendCommand('rename') },
    { label: '子フォルダ作成', click: () => sendCommand('create-child') },
    { type: 'separator' },
    { label: 'フォルダ削除', click: () => sendCommand('delete') },
  ]);

  menu.popup({ window: win });
  return true;
});

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

const normalizePath = (targetPath) => path.resolve(String(targetPath || '').trim());
const toStableNodeId = (absolutePath) => {
  const normalized = normalizePath(absolutePath);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
};

const hasInvalidFolderName = (name) => INVALID_FOLDER_NAME_CHARS.test(name);

const ensureValidFolderName = (name) => {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    return { ok: false, message: 'フォルダ名を入力してください' };
  }
  if (hasInvalidFolderName(trimmedName)) {
    return { ok: false, message: 'フォルダ名に使用できない文字が含まれています' };
  }
  return { ok: true, value: trimmedName };
};

const isSameOrChildPath = (targetPath, rootPath) => {
  const relative = path.relative(rootPath, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const isUnderRegisteredRoots = (targetPath) => {
  for (const rootPath of registeredRoots) {
    if (isSameOrChildPath(targetPath, rootPath)) {
      return true;
    }
  }
  return false;
};

const isRegisteredRootPath = (targetPath) => {
  for (const rootPath of registeredRoots) {
    if (rootPath === targetPath) return true;
  }
  return false;
};

const ensurePathExists = async (targetPath) => {
  try {
    const stats = await fs.promises.stat(targetPath);
    if (!stats.isDirectory()) {
      return { ok: false, message: 'フォルダではありません' };
    }
    return { ok: true };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { ok: false, message: 'フォルダが存在しません' };
    }
    throw error;
  }
};

function scanDirectoryTree(absolutePath, depth = 0) {
  const normalizedAbsolutePath = normalizePath(absolutePath);
  const node = {
    id: toStableNodeId(normalizedAbsolutePath),
    name: path.basename(normalizedAbsolutePath),
    path: normalizedAbsolutePath,
    tags: [],
    metadata: { description: '', department: '', owner: '', remark: '' },
    children: [],
  };

  if (depth >= MAX_SCAN_DEPTH) return node;

  let entries = [];
  try {
    entries = fs.readdirSync(normalizedAbsolutePath, { withFileTypes: true });
  } catch (_error) {
    return node;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const childPath = path.join(normalizedAbsolutePath, entry.name);
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

    const normalizedSelectedPath = normalizePath(selectedPath);
    console.log('[folder:selectAndScan] selected:', normalizedSelectedPath);

    const folder = scanDirectoryTree(normalizedSelectedPath);
    registeredRoots.add(normalizedSelectedPath);

    return { ok: true, folder };
  } catch (error) {
    console.error('[folder:selectAndScan]', error);

    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle('folder:registerRoot', async (_event, payload) => {
  try {
    const rootPath = normalizePath(payload?.rootPath);
    console.log('[folder:registerRoot] input:', payload);
    if (!rootPath) {
      console.warn('[folder:registerRoot] invalid path');
      return { ok: false, message: 'ルートパスが不正です' };
    }
    const exists = await ensurePathExists(rootPath);
    if (!exists.ok) {
      console.warn('[folder:registerRoot] path check failed:', rootPath, exists.message);
      return exists;
    }
    registeredRoots.add(rootPath);
    return { ok: true, rootPath };
  } catch (error) {
    console.error('[folder:registerRoot]', error);
    return { ok: false, message: 'ルート登録に失敗しました' };
  }
});

ipcMain.handle('folder:create', async (_event, payload) => {
  try {
    console.log('[folder:create] input:', payload);
    const parentPath = normalizePath(payload?.parentPath);
    const folderNameResult = ensureValidFolderName(payload?.folderName);
    if (!parentPath || !folderNameResult.ok) {
      console.warn('[folder:create] invalid input:', payload);
      return { ok: false, message: folderNameResult.message || 'パスが不正です' };
    }
    if (!isUnderRegisteredRoots(parentPath)) {
      console.warn('[folder:create] outside registered roots:', parentPath);
      return { ok: false, message: '操作対象が許可されたルート外です' };
    }
    const parentExists = await ensurePathExists(parentPath);
    if (!parentExists.ok) return parentExists;

    const folderPath = path.resolve(parentPath, folderNameResult.value);
    if (fs.existsSync(folderPath)) {
      console.warn('[folder:create] duplicate folder:', folderPath);
      return { ok: false, message: '同名フォルダが既に存在します' };
    }

    await fs.promises.mkdir(folderPath);
    return { ok: true, folderPath };
  } catch (error) {
    console.error('[folder:create]', error);
    return { ok: false, message: '子フォルダの作成に失敗しました' };
  }
});

ipcMain.handle('folder:rename', async (_event, payload) => {
  try {
    console.log('[folder:rename] input:', payload);
    const targetPath = normalizePath(payload?.targetPath);
    const folderNameResult = ensureValidFolderName(payload?.newName);
    if (!targetPath || !folderNameResult.ok) {
      console.warn('[folder:rename] invalid input:', payload);
      return { ok: false, message: folderNameResult.message || 'パスが不正です' };
    }
    if (!isUnderRegisteredRoots(targetPath)) {
      console.warn('[folder:rename] outside registered roots:', targetPath);
      return { ok: false, message: '操作対象が許可されたルート外です' };
    }
    if (isRegisteredRootPath(targetPath)) {
      console.warn('[folder:rename] blocked for root path:', targetPath);
      return { ok: false, message: 'ルートフォルダ名は変更できません' };
    }
    const exists = await ensurePathExists(targetPath);
    if (!exists.ok) return exists;

    const newPath = path.resolve(path.dirname(targetPath), folderNameResult.value);
    if (newPath === targetPath) {
      console.warn('[folder:rename] unchanged path:', targetPath);
      return { ok: false, message: '変更後の名前が同じです' };
    }
    if (fs.existsSync(newPath)) {
      console.warn('[folder:rename] duplicate target:', newPath);
      return { ok: false, message: '同名フォルダが既に存在します' };
    }
    await fs.promises.rename(targetPath, newPath);
    return { ok: true, folderPath: newPath };
  } catch (error) {
    console.error('[folder:rename]', error);
    return { ok: false, message: 'フォルダ名変更に失敗しました' };
  }
});

ipcMain.handle('folder:delete', async (_event, payload) => {
  try {
    console.log('[folder:delete] input:', payload);
    const targetPath = normalizePath(payload?.targetPath);
    if (!targetPath) {
      console.warn('[folder:delete] invalid input:', payload);
      return { ok: false, message: 'パスが不正です' };
    }
    if (!isUnderRegisteredRoots(targetPath)) {
      console.warn('[folder:delete] outside registered roots:', targetPath);
      return { ok: false, message: '操作対象が許可されたルート外です' };
    }
    if (isRegisteredRootPath(targetPath)) {
      console.warn('[folder:delete] blocked for root path:', targetPath);
      return { ok: false, message: 'ルートフォルダは削除できません' };
    }
    const exists = await ensurePathExists(targetPath);
    if (!exists.ok) return exists;

    await fs.promises.rm(targetPath, { recursive: true, force: false });
    return { ok: true };
  } catch (error) {
    console.error('[folder:delete]', error);
    return { ok: false, message: 'フォルダ削除に失敗しました' };
  }
});

ipcMain.handle('folder:move', async (_event, payload) => {
  try {
    console.log('[folder:move] input:', payload);
    const sourcePath = normalizePath(payload?.sourcePath);
    const destinationParentPath = normalizePath(payload?.destinationParentPath);
    if (!sourcePath || !destinationParentPath) {
      console.warn('[folder:move] invalid input:', payload);
      return { ok: false, message: 'パスが不正です' };
    }
    if (!isUnderRegisteredRoots(sourcePath) || !isUnderRegisteredRoots(destinationParentPath)) {
      console.warn('[folder:move] outside registered roots:', sourcePath, destinationParentPath);
      return { ok: false, message: '操作対象が許可されたルート外です' };
    }
    if (isRegisteredRootPath(sourcePath)) {
      console.warn('[folder:move] blocked for root path:', sourcePath);
      return { ok: false, message: 'ルートフォルダは移動できません' };
    }
    const sourceExists = await ensurePathExists(sourcePath);
    if (!sourceExists.ok) return sourceExists;
    const destinationExists = await ensurePathExists(destinationParentPath);
    if (!destinationExists.ok) return destinationExists;

    if (sourcePath === destinationParentPath || isSameOrChildPath(destinationParentPath, sourcePath)) {
      console.warn('[folder:move] blocked self/descendant move:', sourcePath, destinationParentPath);
      return { ok: false, message: '自分自身または子フォルダ配下へは移動できません' };
    }

    const newPath = path.resolve(destinationParentPath, path.basename(sourcePath));
    if (fs.existsSync(newPath)) {
      console.warn('[folder:move] duplicate destination:', newPath);
      return { ok: false, message: '移動先に同名フォルダが存在します' };
    }
    await fs.promises.rename(sourcePath, newPath);
    return { ok: true, folderPath: newPath };
  } catch (error) {
    console.error('[folder:move]', error);
    return { ok: false, message: 'フォルダ移動に失敗しました' };
  }
});

ipcMain.handle('folder:scanPath', async (_event, payload) => {
  try {
    console.log('[folder:scanPath] input:', payload);
    const targetPath = normalizePath(payload?.targetPath);
    if (!targetPath) {
      console.warn('[folder:scanPath] invalid input:', payload);
      return { ok: false, message: 'パスが不正です' };
    }
    const exists = await ensurePathExists(targetPath);
    if (!exists.ok) return exists;
    if (!isUnderRegisteredRoots(targetPath)) {
      console.warn('[folder:scanPath] auto-register root:', targetPath);
      registeredRoots.add(targetPath);
    }

    const folder = scanDirectoryTree(targetPath);
    return { ok: true, folder };
  } catch (error) {
    console.error('[folder:scanPath]', error);
    return { ok: false, message: 'フォルダ再スキャンに失敗しました' };
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
