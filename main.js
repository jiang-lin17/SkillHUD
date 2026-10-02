const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { scanSkills } = require('./scanner');

let win;
let collapsed = false;
let alwaysTop = true;
let theme = 'light';
let expandedBounds = null;

const DEFAULT_W = 360;
const DEFAULT_H = 560;
const MIN_W = 320;
const MIN_H = 400;
const COLLAPSED_H = 34;
const BG = { light: '#F4F5F7', dark: '#101216' };

const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');

function loadState(){
  try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')) || {}; }
  catch { return {}; }
}

function saveState(){
  if(!win || win.isDestroyed()) return;
  const [x, y] = win.getPosition();
  const [w, h] = (collapsed && expandedBounds)
    ? [expandedBounds.width, expandedBounds.height]
    : win.getSize();
  try {
    fs.writeFileSync(stateFile(), JSON.stringify({ x, y, w, h, pinned: alwaysTop, theme }));
  } catch {}
}

function onScreen(x, y, w, h){
  return screen.getAllDisplays().some(({ workArea: a }) =>
    x < a.x + a.width && x + w > a.x && y < a.y + a.height && y + h > a.y);
}

function initialBounds(){
  const s = loadState();
  const area = screen.getPrimaryDisplay().workArea;
  const w = Math.max(MIN_W, Math.min(s.w || DEFAULT_W, area.width));
  const h = Math.max(MIN_H, Math.min(s.h || DEFAULT_H, area.height));
  if(typeof s.x === 'number' && typeof s.y === 'number' && onScreen(s.x, s.y, w, h)){
    return { x: s.x, y: s.y, w, h };
  }
  return {
    x: area.x + area.width - w - 20,
    y: area.y + Math.floor((area.height - h) / 2),
    w, h,
  };
}

function registerIpc(){
  ipcMain.handle('scan-skills', () => scanSkills());

  ipcMain.on('toggle-collapse', () => {
    if(!win || win.isDestroyed()) return;
    if(!collapsed){
      expandedBounds = win.getBounds();
      collapsed = true;
      win.setMinimumSize(MIN_W, COLLAPSED_H);
      win.setSize(expandedBounds.width, COLLAPSED_H);
    } else {
      collapsed = false;
      win.setMinimumSize(MIN_W, MIN_H);
      const e = expandedBounds || { width: DEFAULT_W, height: DEFAULT_H };
      win.setSize(e.width, e.height);
    }
    win.webContents.send('collapsed-state', collapsed);
    saveState();
  });

  ipcMain.on('minimize-window', () => {
    if(win && !win.isDestroyed()) win.minimize();
  });

  // 关闭（无托盘，直接退出；否则窗口会被永久隐藏且无法找回）
  ipcMain.on('close-window', () => { saveState(); app.quit(); });

  ipcMain.on('toggle-top', () => {
    if(!win || win.isDestroyed()) return;
    alwaysTop = !alwaysTop;
    win.setAlwaysOnTop(alwaysTop, alwaysTop ? 'floating' : 'normal');
    win.webContents.send('top-state', alwaysTop);
    saveState();
  });

  // 主题持久化到窗口底色，避免深色启动白闪
  ipcMain.on('theme', (_, value) => {
    theme = value === 'dark' ? 'dark' : 'light';
    if(win && !win.isDestroyed()) win.setBackgroundColor(BG[theme]);
    saveState();
  });
}

function createWindow(){
  const saved = loadState();
  const b = initialBounds();
  alwaysTop = saved.pinned !== false;
  theme = saved.theme === 'dark' ? 'dark' : 'light';

  win = new BrowserWindow({
    width: b.w, height: b.h, x: b.x, y: b.y,
    minWidth: MIN_W, minHeight: MIN_H,
    frame: false,
    transparent: false,
    alwaysOnTop: alwaysTop,
    resizable: true,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    hasShadow: true,
    skipTaskbar: false,
    backgroundColor: BG[theme],
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.setAlwaysOnTop(alwaysTop, alwaysTop ? 'floating' : 'normal');
  win.setVisibleOnAllWorkspaces(true);
  win.loadFile('index.html');
  win.once('ready-to-show', () => win.show());

  // 位置 / 大小持久化（拖动、缩放后防抖写入）
  let saveTimer = null;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 300);
  };
  win.on('resize', scheduleSave);
  win.on('move', scheduleSave);
  win.on('closed', () => { win = null; });

  // 首屏同步真实状态
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('top-state', alwaysTop);
    win.webContents.send('collapsed-state', collapsed);
  });
}

const gotLock = app.requestSingleInstanceLock();
if(!gotLock){
  app.quit();
} else {
  app.on('second-instance', () => {
    if(win){
      if(win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    registerIpc();
    createWindow();
  });
}

app.on('window-all-closed', () => { app.quit(); });
app.on('before-quit', saveState);