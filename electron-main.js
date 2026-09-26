import { app, BrowserWindow, ipcMain, shell, dialog, session } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
ipcMain.handle('save-image-file', async (event, { fileName, base64Data, defaultPath }) => {
  try {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const targetDir = defaultPath || app.getPath('downloads');
    const targetPath = path.join(targetDir, fileName);
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
    const fileName = path.basename(filePath);

    return { success: true, filePath, fileName, base64Data };
  } catch (err) {
    console.error('Error in show-open-image-dialog:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('show-save-image-dialog', async (event, { defaultName, base64Data }) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || (BrowserWindow.getAllWindows().length > 0 ? BrowserWindow.getAllWindows()[0] : null);
    const dialogOptions = {
      title: 'Save Pixel Model PNG',
      defaultPath: path.join(app.getPath('downloads'), defaultName),
      filters: [{ name: 'PNG Images (*.png)', extensions: ['png'] }]
    };

    const { canceled, filePath } = win 
      ? await dialog.showSaveDialog(win, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);

    if (canceled || !filePath) {
      return { canceled: true };
    }

    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
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

ipcMain.handle('open-path', async (event, fullPath) => {
  return shell.openPath(fullPath);
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
    const assetsDir = path.join(__dirname, 'Assets', 'model');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    const targetPath = path.join(assetsDir, fileName);
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
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
  shell.showItemInFolder(fullPath);
  return true;
});

// Redirect UserData directory to a local Temp folder to bypass OneDrive sync locking and AppData permission conflicts
const tempUserDataPath = path.join(os.tmpdir(), 'circle-mini-battle-userdata');
if (!fs.existsSync(tempUserDataPath)) {
  fs.mkdirSync(tempUserDataPath, { recursive: true });
}
app.setPath('userData', tempUserDataPath);

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

      // F10: Toggle exactly 1920x1080 windowed size (centered)
      if (input.key === 'F10') {
        event.preventDefault();
        if (win.isFullScreen()) {
          win.setFullScreen(false);
        }
        const [width, height] = win.getSize();
        win.setResizable(true);
        if (Math.abs(width - 1920) < 5 && Math.abs(height - 1080) < 5) {
          win.setSize(540, 960);
        } else {
          win.setSize(1920, 1080);
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
