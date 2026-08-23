const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scanBgmFolder: () => ipcRenderer.invoke('scan-bgm-folder'),
  openBgmFolder: () => ipcRenderer.invoke('open-bgm-folder')
});
