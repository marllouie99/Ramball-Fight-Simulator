const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

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

// Disable HTTP and GPU cache to completely eliminate "Access Denied" disk-caching conflicts on Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');

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
    useContentSize: false, // Disabling this forces the absolute physical window size to 540x960
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
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
