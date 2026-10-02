const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('skillhud', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, cb) => ipcRenderer.on(channel, (_, data) => cb(data)),
});
