const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { scanSkills } = require('./scanner');

let win;
let collapsed = false;
let alwaysTop = true;
let theme = 'light';
let panelW = 0;   // 展开态目标宽（停靠时也用它，避免被跟随逻辑改写的尺寸污染）
let panelH = 0;   // 展开态目标高

const DEFAULT_W = 360;
const DEFAULT_H = 560;
const MIN_W = 320;
const MIN_H = 400;
const COLLAPSED_H = 34;
const BG = { light: '#F4F5F7', dark: '#101216' };

// ===== 吸附停靠：跟随 TRAE 主窗口 =====
// TRAE 是 Electron/Chromium 应用 → 窗口类名 Chrome_WidgetWin_1。
// 注意：不要按窗口标题匹配（标题随工作区变化）。
const DOCK_TARGET = { procName: 'TRAE SOLO CN', className: 'Chrome_WidgetWin_1', titleLike: '' };
const DOCK_MARGIN = 8;       // 与 TRAE 窗口上沿的间距（DIP）
const DOCK_LOST_MS = 4000;   // TRAE 窗口消失多久后自行退出（watchdog 另有兜底）

let dockProc = null;
let docked = false;          // 已进入停靠跟随模式
let sawTrae = false;         // 是否曾检测到 TRAE 窗口
let traeFocused = false;     // TRAE 是否是前台窗口
let lastDock = null;         // 最近一次有效样本（物理像素）
let lostTimer = null;

const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');

function loadState(){
  try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')) || {}; }
  catch { return {}; }
}

function saveState(){
  if(!win || win.isDestroyed()) return;
  let rec;
  if(docked){
    // 停靠期间窗口位置 / 尺寸由 TRAE 决定，绝不能覆盖用户手动摆放的状态
    rec = { ...loadState(), w: panelW, h: panelH, pinned: alwaysTop, theme };
  } else {
    const [x, y] = win.getPosition();
    const [w, h] = win.getSize();
    rec = { x, y, w, h, pinned: alwaysTop, theme };
  }
  try { fs.writeFileSync(stateFile(), JSON.stringify(rec)); } catch {}
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

// ===== 停靠控制器 =====

function applyTop(){
  if(!win || win.isDestroyed()) return;
  // 用户手动置顶，或 TRAE 当前在前台时，浮在 TRAE 之上
  const want = alwaysTop || traeFocused;
  if(win.isAlwaysOnTop() !== want) win.setAlwaysOnTop(want, want ? 'floating' : 'normal');
}

// 把面板吸附到 TRAE 窗口内侧上沿、水平居中（上沿是标题/标签栏，不挡工作区）；越界时兜回工作区
function applyDockBounds(d){
  // Win32 返回物理像素，Electron setBounds 吃 DIP → 必须换算（null = 按 rect 所在显示器换算）
  const trae = screen.screenToDipRect(null, { x: d.x, y: d.y, width: d.w, height: d.h });
  const maxW = Math.max(trae.width - DOCK_MARGIN * 2, MIN_W);
  const maxH = Math.max(trae.height - DOCK_MARGIN * 2, COLLAPSED_H);
  const w = Math.max(MIN_W, Math.min(panelW, maxW));
  const h = collapsed
    ? COLLAPSED_H
    : Math.max(MIN_H, Math.min(panelH, maxH));

  const area = screen.getDisplayMatching(trae).workArea;
  const x = Math.min(Math.max(trae.x + Math.floor((trae.width - w) / 2), area.x), area.x + area.width - w);
  const y = Math.min(Math.max(trae.y + DOCK_MARGIN, area.y), area.y + area.height - h);

  const cur = win.getBounds();
  if(cur.x !== x || cur.y !== y || cur.width !== w || cur.height !== h){
    win.setBounds({ x, y, width: w, height: h });
  }
}

function onDockLine(line){
  const s = line.replace(/^\uFEFF/, '').trim();
  if(!s || s[0] !== '{') return;

  let d;
  try { d = JSON.parse(s); } catch { return; }
  if(!win || win.isDestroyed()) return;

  // TRAE 主窗口不存在（没启动 / 已关闭）→ 留在原地当普通悬浮窗；若曾跟随过则退出
  if(!d.procFound || !d.w || !d.h){
    if(sawTrae && !lostTimer){
      lostTimer = setTimeout(() => {
        lostTimer = null;
        if(win && !win.isDestroyed()) app.quit();
      }, DOCK_LOST_MS);
    }
    return;
  }
  if(lostTimer){ clearTimeout(lostTimer); lostTimer = null; }

  sawTrae = true;
  docked = true;
  lastDock = d;

  // 最小化 / 不可见 → 跟着收起
  if(d.minimized || !d.visible){
    if(win.isVisible()) win.hide();
    return;
  }

  traeFocused = !!d.foreground || win.isFocused();
  applyDockBounds(d);
  applyTop();
  if(!win.isVisible()) win.showInactive();
}

function startDocking(){
  const script = path.join(__dirname, 'dock.ps1');
  if(!fs.existsSync(script)) return;

  const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script,
    '-ProcName', DOCK_TARGET.procName];
  if(DOCK_TARGET.className) args.push('-ClassName', DOCK_TARGET.className);
  if(DOCK_TARGET.titleLike) args.push('-TitleLike', DOCK_TARGET.titleLike);

  try {
    dockProc = spawn('powershell.exe', args, { windowsHide: true });
  } catch { dockProc = null; return; }

  dockProc.stdout.setEncoding('utf8');
  let buf = '';
  dockProc.stdout.on('data', chunk => {
    buf += chunk;
    let i;
    while((i = buf.indexOf('\n')) >= 0){
      onDockLine(buf.slice(0, i));
      buf = buf.slice(i + 1);
    }
  });
  dockProc.on('error', () => { dockProc = null; });
  // 脚本异常退出：退回普通悬浮窗（不自杀，生命周期交给 watchdog）
  dockProc.on('exit', () => { dockProc = null; docked = false; lastDock = null; });
}

function stopDocking(){
  if(lostTimer){ clearTimeout(lostTimer); lostTimer = null; }
  if(dockProc){ try { dockProc.kill(); } catch {} dockProc = null; }
}

// ===== IPC =====

function applyPanelSize(){
  if(!win || win.isDestroyed()) return;
  if(collapsed) win.setSize(panelW, COLLAPSED_H);
  else win.setSize(panelW, panelH);
  if(docked && lastDock) applyDockBounds(lastDock);
}

function registerIpc(){
  ipcMain.handle('scan-skills', () => scanSkills());

  ipcMain.on('toggle-collapse', () => {
    if(!win || win.isDestroyed()) return;
    collapsed = !collapsed;
    win.setMinimumSize(MIN_W, collapsed ? COLLAPSED_H : MIN_H);
    applyPanelSize();
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
  panelW = b.w;
  panelH = b.h;

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

  // 位置 / 大小持久化（拖动、缩放后防抖写入）；停靠期间由 TRAE 决定，不记录
  let saveTimer = null;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 300);
  };
  win.on('resize', () => {
    if(!docked && !collapsed){
      const [w, h] = win.getSize();
      panelW = w; panelH = h;
    }
    if(!docked) scheduleSave();
  });
  win.on('move', () => { if(!docked) scheduleSave(); });
  win.on('closed', () => { stopDocking(); win = null; });

  // 首屏同步真实状态
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('top-state', alwaysTop);
    win.webContents.send('collapsed-state', collapsed);
  });

  startDocking();
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
app.on('before-quit', () => { stopDocking(); saveState(); });