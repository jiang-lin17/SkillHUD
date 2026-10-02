const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('skillhud', {
  // 窗口控制（渲染进程 → 主进程，单向）
  send: (channel, data) => ipcRenderer.send(channel, data),
  // 主进程状态回推（collapsed-state / top-state）
  on: (channel, cb) => ipcRenderer.on(channel, (_, data) => cb(data)),
  // 扫描本机真实 Skill（含 overlay 合并）
  scan: () => ipcRenderer.invoke('scan-skills'),
});