const { app, BrowserWindow } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

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
  const win = new BrowserWindow({
    width: 540,
    height: 960,
    useContentSize: false, // Disabling this forces the absolute physical window size to 540x960
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
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
