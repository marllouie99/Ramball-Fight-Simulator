import { app, BrowserWindow, ipcMain, shell, dialog, session } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sanitizeSafeFilename(fileName, defaultExt = '.png') {
  if (typeof fileName !== 'string') return `export_${Date.now()}${defaultExt}`;
  const base = path.basename(fileName).replace(/[^a-zA-Z0-9_.-]/g, '_');
  if (!base || base === '.' || base === '..') return `export_${Date.now()}${defaultExt}`;
  return base;
}

function isPathInside(childPath, parentDir) {
  const relative = path.relative(path.resolve(parentDir), path.resolve(childPath));
  return Boolean(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

// Auto-sync & scan function for ARENA-BGMUSIC folder:
function scanAndSyncBgmFolder() {
  try {
    const bgmDir = path.join(__dirname, 'Assets', 'Sound Effects', 'ARENA-BGMUSIC');
    if (!fs.existsSync(bgmDir)) {
      fs.mkdirSync(bgmDir, { recursive: true });
    }
    const files = fs.readdirSync(bgmDir);
    const audioFiles = files.filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f));
    
    // Auto-update manifest.json so web / offline loaders stay 100% in sync
    const manifestPath = path.join(bgmDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(audioFiles, null, 2), 'utf-8');
    
    return audioFiles;
  } catch (err) {
    console.error('Error scanning BGM folder:', err);
    return [];
  }
}

ipcMain.handle('scan-bgm-folder', () => {
  return scanAndSyncBgmFolder();
});

ipcMain.handle('open-bgm-folder', () => {
  const bgmDir = path.join(__dirname, 'Assets', 'Sound Effects', 'ARENA-BGMUSIC');
  shell.openPath(bgmDir);
  return true;
});

// Native PNG Image Saving IPC Handlers for Desktop Electron App
ipcMain.handle('save-image-file', async (event, { fileName, base64Data }) => {
  try {
    const safeName = sanitizeSafeFilename(fileName, '.png');
    const downloadsDir = path.resolve(app.getPath('downloads'));
    const targetPath = path.join(downloadsDir, safeName);
    
    if (!isPathInside(targetPath, downloadsDir) && targetPath !== downloadsDir) {
      throw new Error('Target path is outside allowed downloads directory');
    }

    const cleanBase64 = typeof base64Data === 'string' ? base64Data.replace(/^data:image\/\w+;base64,/, '') : '';
    const buffer = Buffer.from(cleanBase64, 'base64');
    fs.writeFileSync(targetPath, buffer);
    return { success: true, filePath: targetPath };
  } catch (err) {
    console.error('Error in save-image-file:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('show-open-image-dialog', async (event) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || (BrowserWindow.getAllWindows().length > 0 ? BrowserWindow.getAllWindows()[0] : null);
    const dialogOptions = {
      title: 'Select Image File to Import',
      properties: ['openFile'],
      filters: [
        { name: 'All Supported Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] },
        { name: 'PNG Images (*.png)', extensions: ['png'] },
        { name: 'JPEG Images (*.jpg; *.jpeg)', extensions: ['jpg', 'jpeg'] },
        { name: 'WebP Images (*.webp)', extensions: ['webp'] },
        { name: 'All Files (*.*)', extensions: ['*'] }
      ]
    };

    const { canceled, filePaths } = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (canceled || !filePaths || filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = filePaths[0];
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '') || 'png';
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/png';
    const base64Data = `data:${mimeType};base64,${buffer.toString('base64')}`;
    const fileName = sanitizeSafeFilename(path.basename(filePath), `.${ext}`);

    return { success: true, filePath, fileName, base64Data };
  } catch (err) {
    console.error('Error in show-open-image-dialog:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('show-save-image-dialog', async (event, { defaultName, base64Data }) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || (BrowserWindow.getAllWindows().length > 0 ? BrowserWindow.getAllWindows()[0] : null);
    const safeName = sanitizeSafeFilename(defaultName, '.png');
    const dialogOptions = {
      title: 'Save Pixel Model PNG',
      defaultPath: path.join(app.getPath('downloads'), safeName),
      filters: [{ name: 'PNG Images (*.png)', extensions: ['png'] }]
    };

    const { canceled, filePath } = win 
      ? await dialog.showSaveDialog(win, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);

    if (canceled || !filePath) {
      return { canceled: true };
    }

    const cleanBase64 = typeof base64Data === 'string' ? base64Data.replace(/^data:image\/\w+;base64,/, '') : '';
    const buffer = Buffer.from(cleanBase64, 'base64');
    fs.writeFileSync(filePath, buffer);

    try {
      shell.showItemInFolder(filePath);
    } catch (e) {
      // ignore
    }

    return { success: true, filePath };
  } catch (err) {
    console.error('Error in show-save-image-dialog:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-downloads-folder', async () => {
  const dl = app.getPath('downloads');
  shell.openPath(dl);
  return true;
});

ipcMain.handle('open-assets-folder', async () => {
  const assetsDir = path.join(__dirname, 'Assets', 'model');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  shell.openPath(assetsDir);
  return true;
});

ipcMain.handle('save-to-assets-model', async (event, { fileName, base64Data }) => {
  try {
    const assetsDir = path.resolve(__dirname, 'Assets', 'model');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    const safeName = sanitizeSafeFilename(fileName, '.png');
    const targetPath = path.join(assetsDir, safeName);

    if (!isPathInside(targetPath, assetsDir)) {
      throw new Error('Invalid path traversal attempt in save-to-assets-model');
    }

    const cleanBase64 = typeof base64Data === 'string' ? base64Data.replace(/^data:image\/\w+;base64,/, '') : '';
    const buffer = Buffer.from(cleanBase64, 'base64');
    fs.writeFileSync(targetPath, buffer);
    try {
      shell.showItemInFolder(targetPath);
    } catch (e) {
      // ignore
    }
    return { success: true, filePath: targetPath };
  } catch (err) {
    console.error('Error in save-to-assets-model:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('show-item-in-folder', async (event, fullPath) => {
  try {
    if (typeof fullPath !== 'string') return false;
    const resolved = path.resolve(fullPath);
    const downloadsDir = path.resolve(app.getPath('downloads'));
    const assetsDir = path.resolve(__dirname, 'Assets');

    if (isPathInside(resolved, downloadsDir) || isPathInside(resolved, assetsDir) || resolved === downloadsDir || resolved === assetsDir) {
      shell.showItemInFolder(resolved);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
});

// Auto-export & sync skin customizations database to disk (js/configs/skinCustomizationsDatabase.js)
ipcMain.handle('save-skin-database', async (event, { codeContent }) => {
  try {
    if (typeof codeContent !== 'string' || !codeContent.includes('SKIN_CUSTOMIZATIONS_DATABASE')) {
      throw new Error('Invalid codeContent: Expected valid SKIN_CUSTOMIZATIONS_DATABASE module.');
    }
    const dbPath = path.join(__dirname, 'js', 'configs', 'skinCustomizationsDatabase.js');
    fs.writeFileSync(dbPath, codeContent, 'utf-8');
    return { success: true, filePath: dbPath };
  } catch (err) {
    console.error('Error in save-skin-database IPC:', err);
    return { success: false, error: err.message };
  }
});

// Dynamic Desktop Window Resizing IPC Handlers (Vertical 9:16 <-> Horizontal 16:9)
let currentWindowOrientation = 'vertical';
ipcMain.handle('set-window-orientation', async (event, orientation) => {
  currentWindowOrientation = (orientation === 'horizontal') ? 'horizontal' : 'vertical';
  try {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || (BrowserWindow.getAllWindows().length > 0 ? BrowserWindow.getAllWindows()[0] : null);
    if (!win) return false;
    if (win.isFullScreen()) return true;

    win.setResizable(true);
    if (orientation === 'horizontal') {
      win.setContentSize(960, 540);
    } else {
      win.setContentSize(540, 960);
    }
    win.center();
    win.setResizable(false);
    return true;
  } catch (err) {
    console.error('Error in set-window-orientation IPC:', err);
    return false;
  }
});

ipcMain.handle('set-window-size', async (event, { width, height, center = true }) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || (BrowserWindow.getAllWindows().length > 0 ? BrowserWindow.getAllWindows()[0] : null);
    if (!win) return false;
    if (win.isFullScreen()) return true;

    win.setResizable(true);
    win.setContentSize(width, height);
    if (center) win.center();
    win.setResizable(false);
    return true;
  } catch (err) {
    console.error('Error in set-window-size IPC:', err);
    return false;
  }
});

ipcMain.handle('drag-window', async (event, { deltaX, deltaY }) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || (BrowserWindow.getAllWindows().length > 0 ? BrowserWindow.getAllWindows()[0] : null);
    if (!win || win.isFullScreen()) return false;
    const [x, y] = win.getPosition();
    win.setPosition(Math.round(x + (deltaX || 0)), Math.round(y + (deltaY || 0)));
    return true;
  } catch (err) {
    return false;
  }
});

// Configure dedicated UserData directory in AppData to isolate from temporary/multi-user directories and bypass OneDrive locking
const appDataRoot = app.getPath('appData') || os.tmpdir();
const safeUserDataPath = path.join(appDataRoot, 'circle-mini-battle-userdata');
if (!fs.existsSync(safeUserDataPath)) {
  try {
    fs.mkdirSync(safeUserDataPath, { recursive: true });
  } catch (e) {
    // Fallback if permission error
  }
}
try {
  app.setPath('userData', safeUserDataPath);
} catch (e) {
  // Use default userData if setting fails
}

// Force Electron to ignore Windows display scaling (e.g. 125%, 150%)
// This prevents Windows from blowing up the window size and clamping it to the monitor height!
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-device-scale-factor', '1');

// Enable GPU shader disk cache & HTTP cache inside tempUserDataPath (outside OneDrive)
// to persist compiled WebGL shaders and audio buffers across sessions, eliminating cold-start shader compilation drops.

// Prevent Chromium from throttling the game loop to 15-30 FPS when the window is unfocused or occluded by OBS
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

function createWindow () {
  // Sync BGM folder immediately on window creation
  scanAndSyncBgmFolder();

  const win = new BrowserWindow({
    width: 540,
    height: 960,
    useContentSize: true, // Ensures web content viewport is exactly 540x960px
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    frame: false, // Removes the Windows title bar and borders for a perfect 9:16 capture
    autoHideMenuBar: true
  });
  // win.setAspectRatio(9 / 16); // Removed to allow black bars (letterboxing) on taller window sizes
  
  // Intercept reload shortcuts to perform a clean relaunch of the process.
  // This prevents OBS from losing the WebGL/GPU hook and falling back to a blurry GDI capture.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      const isR = input.key.toLowerCase() === 'r';
      const isF5 = input.key === 'F5';
      if (isF5 || (input.control && isR) || (input.meta && isR)) {
        event.preventDefault();
        app.relaunch();
        app.exit(0);
      }

      // F11 or Alt+Enter: Toggle standard Fullscreen
      if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
        event.preventDefault();
        const isFullScreen = win.isFullScreen();
        win.setResizable(true);
        win.setFullScreen(!isFullScreen);
        if (isFullScreen) {
          win.setResizable(false);
        }
      }

      // F10: Toggle 1X <-> 2X windowed size (centered)
      if (input.key === 'F10') {
        event.preventDefault();
        if (win.isFullScreen()) {
          win.setFullScreen(false);
        }
        const [width, height] = win.getContentSize();
        win.setResizable(true);
        const isHorizontal = currentWindowOrientation === 'horizontal';
        if (isHorizontal) {
          if (Math.abs(width - 1920) < 10 && Math.abs(height - 1080) < 10) {
            win.setContentSize(960, 540);
          } else {
            win.setContentSize(1920, 1080);
          }
        } else {
          // Vertical: original behavior (1920x1080 letterboxed <-> native 540x960)
          if (Math.abs(width - 1920) < 10 && Math.abs(height - 1080) < 10) {
            win.setContentSize(540, 960);
          } else {
            win.setContentSize(1920, 1080);
          }
        }
        win.center();
        win.setResizable(false);
      }
    }
  });

  win.loadFile('index.html');
}

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
