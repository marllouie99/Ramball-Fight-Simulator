const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scanBgmFolder: () => ipcRenderer.invoke('scan-bgm-folder'),
  openBgmFolder: () => ipcRenderer.invoke('open-bgm-folder'),
  showOpenImageDialog: () => ipcRenderer.invoke('show-open-image-dialog'),
  saveImageFile: (data) => ipcRenderer.invoke('save-image-file', data),
  showSaveImageDialog: (data) => ipcRenderer.invoke('show-save-image-dialog', data),
  saveToAssetsModel: (data) => ipcRenderer.invoke('save-to-assets-model', data),
  openDownloadsFolder: () => ipcRenderer.invoke('open-downloads-folder'),
  openAssetsFolder: () => ipcRenderer.invoke('open-assets-folder'),
  showItemInFolder: (p) => ipcRenderer.invoke('show-item-in-folder', p),
  saveSkinDatabase: (data) => ipcRenderer.invoke('save-skin-database', data),
  setWindowOrientation: (orientation) => ipcRenderer.invoke('set-window-orientation', orientation),
  setWindowSize: (data) => ipcRenderer.invoke('set-window-size', data),
  dragWindow: (deltaX, deltaY) => ipcRenderer.invoke('drag-window', { deltaX, deltaY })
});
