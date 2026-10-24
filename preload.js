const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getApiKey: () => ipcRenderer.invoke('config:getApiKey'),
  saveApiKey: (key) => ipcRenderer.invoke('config:saveApiKey', key),
  getLanguages: () => ipcRenderer.invoke('config:getLanguages'),
  getCoverFonts: () => ipcRenderer.invoke('config:getCoverFonts'),
  selectPdf: () => ipcRenderer.invoke('pdf:select'),
  translate: (params) => ipcRenderer.invoke('translate:run', params),
  onTranslateProgress: (callback) => {
    ipcRenderer.on('translate:progress', (_event, data) => callback(data));
  },
  saveOutput: (segments) => ipcRenderer.invoke('output:save', segments),
  buildBook: (params) => ipcRenderer.invoke('book:build', params),
});
