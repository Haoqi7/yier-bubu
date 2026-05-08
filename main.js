const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let settingsWindow = null;
let drawWindow = null;
let helpWindow = null;
let tray = null;
let petMode = 'both';
let isFocusMode = false;
let currentWindowSize = 'fullscreen';
let savedPetBounds = null;

const settingsPath = path.join(app.getPath('userData'), 'pet-settings.json');
const diaryPath = path.join(app.getPath('userData'), 'pet-diary.json');

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return {};
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function loadDiaryData() {
  try {
    if (fs.existsSync(diaryPath)) {
      return JSON.parse(fs.readFileSync(diaryPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load diary:', e);
  }
  return [];
}

function saveDiaryData(data) {
  try {
    fs.writeFileSync(diaryPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save diary:', e);
  }
}

function getWindowBounds(size) {
  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;
  const { x: sx, y: sy } = display.workArea;

  switch (size) {
    case 'fullscreen':
      return { x: sx, y: sy, width: sw, height: sh };
    case 'half':
      return { x: sx, y: sy, width: Math.floor(sw / 2), height: Math.floor(sh / 2) };
    case 'third':
      return { x: sx, y: sy, width: Math.floor(sw / 3), height: Math.floor(sh / 3) };
    case 'sixth':
      return { x: sx, y: sy, width: Math.floor(sw / 6), height: Math.floor(sh / 6) };
    default:
      return { x: sx, y: sy, width: sw, height: sh };
  }
}

function applyWindowSize(size) {
  currentWindowSize = size;
  const bounds = getWindowBounds(size);
  if (mainWindow) {
    mainWindow.setBounds(bounds, true);
    mainWindow.webContents.send('window-resized', bounds);
  }
  const settings = loadSettings();
  settings.windowSize = size;
  settings.customWidth = null;
  settings.customHeight = null;
  saveSettings(settings);
  return { width: bounds.width, height: bounds.height };
}

function applyCustomSize(x, y, width, height) {
  currentWindowSize = 'custom';
  const bounds = { x, y, width, height };
  if (mainWindow) {
    mainWindow.setBounds(bounds, true);
    mainWindow.webContents.send('window-resized', bounds);
  }
  const settings = loadSettings();
  settings.windowSize = 'custom';
  settings.customX = x;
  settings.customY = y;
  settings.customWidth = width;
  settings.customHeight = height;
  saveSettings(settings);
  return bounds;
}

function createWindow() {
  const settings = loadSettings();
  currentWindowSize = settings.windowSize || 'fullscreen';
  let bounds;
  if (currentWindowSize === 'custom' && settings.customWidth && settings.customHeight) {
    bounds = { x: settings.customX || 0, y: settings.customY || 0, width: settings.customWidth, height: settings.customHeight };
  } else {
    bounds = getWindowBounds(currentWindowSize);
  }

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const savedSettings = loadSettings();
  if (savedSettings.passthrough) {
    isPassthrough = true;
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('passthrough-changed', true);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 420,
    height: 440,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadFile('settings.html');
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createHelpWindow() {
  if (helpWindow && !helpWindow.isDestroyed()) {
    helpWindow.focus();
    return;
  }

  helpWindow = new BrowserWindow({
    width: 560,
    height: 620,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  helpWindow.loadFile('help.html');
  helpWindow.on('closed', () => {
    helpWindow = null;
  });
}

function createDrawWindow() {
  if (drawWindow && !drawWindow.isDestroyed()) {
    drawWindow.focus();
    return;
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.hide();
  }

  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  const { x, y } = display.workArea;

  drawWindow = new BrowserWindow({
    x, y, width, height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  drawWindow.loadFile('draw.html');
  drawWindow.setIgnoreMouseEvents(false);
  drawWindow.on('closed', () => {
    drawWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'yier', 'idle', 'frame_001.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch (e) {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('一二与布布');
  rebuildTrayMenu();
}

function rebuildTrayMenu() {
  if (!tray) return;
  const contextMenu = Menu.buildFromTemplate([
    { label: '📊 查看状态', click: () => mainWindow?.webContents.send('show-status') },
    { label: '📖 宠物日记', click: () => mainWindow?.webContents.send('show-diary') },
    { label: '🎞️ GIF 状态', click: () => mainWindow?.webContents.send('show-gif-manager') },
    { label: '🎭 GIF 绑定管理', click: () => mainWindow?.webContents.send('show-gif-state-panel') },
    { label: '⚙️ 设置', click: () => createSettingsWindow() },
    { label: '❓ 帮助', click: () => createHelpWindow() },
    { type: 'separator' },
    {
      label: '🐾 切换模式',
      submenu: [
        { label: '一二与布布', type: 'radio', checked: petMode === 'both', click: () => switchMode('both') },
        { label: '仅一二', type: 'radio', checked: petMode === 'yier', click: () => switchMode('yier') },
        { label: '仅布布', type: 'radio', checked: petMode === 'bubu', click: () => switchMode('bubu') }
      ]
    },
    { type: 'separator' },
    {
      label: isFocusMode ? '🎯 退出专注模式' : '🎯 专注模式',
      click: () => {
        isFocusMode = !isFocusMode;
        mainWindow?.webContents.send('toggle-focus', isFocusMode);
        rebuildTrayMenu();
      }
    },
    { type: 'separator' },
    { label: '❌ 退出', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
}

function switchMode(mode) {
  petMode = mode;
  mainWindow?.webContents.send('switch-mode', mode);
  rebuildTrayMenu();
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.handle('get-screen-info', () => {
  if (!mainWindow) return { width: 1920, height: 1080 };
  const bounds = mainWindow.getBounds();
  return { width: bounds.width, height: bounds.height };
});

ipcMain.handle('get-pet-mode', () => petMode);

ipcMain.on('set-ignore-mouse-events', (_, ignore) => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

let isPassthrough = false;

ipcMain.on('set-passthrough', (_, enabled) => {
  isPassthrough = enabled;
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(enabled, { forward: true });
    mainWindow.webContents.send('passthrough-changed', enabled);
  }
  const s = loadSettings();
  s.passthrough = enabled;
  saveSettings(s);
});

ipcMain.on('flash-tray', () => {});

ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.handle('set-window-size', (_, size) => {
  return applyWindowSize(size);
});

ipcMain.handle('set-window-size-custom', (_, x, y, width, height) => {
  return applyCustomSize(x, y, width, height);
});

ipcMain.handle('get-settings', () => {
  const settings = loadSettings();
  settings.windowSize = settings.windowSize || 'fullscreen';
  settings.autoLaunch = app.getLoginItemSettings().openAtLogin;
  settings.screenWidth = screen.getPrimaryDisplay().workAreaSize.width;
  settings.screenHeight = screen.getPrimaryDisplay().workAreaSize.height;
  return settings;
});

ipcMain.on('set-auto-launch', (_, enabled) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: app.getPath('exe')
  });
  const settings = loadSettings();
  settings.autoLaunch = enabled;
  saveSettings(settings);
});

ipcMain.on('show-settings', () => {
  createSettingsWindow();
});

ipcMain.on('close-settings', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
  }
});

ipcMain.on('open-gif-state-panel', () => {
  if (mainWindow) {
    mainWindow.webContents.send('show-gif-state-panel');
  }
});

ipcMain.on('start-draw', () => {
  createDrawWindow();
});

ipcMain.on('draw-confirm', (_, x, y, w, h) => {
  if (drawWindow && !drawWindow.isDestroyed()) {
    drawWindow.close();
  }
  applyCustomSize(x, y, w, h);
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.webContents.send('draw-result', x, y, w, h);
  }
});

ipcMain.on('draw-cancel', () => {
  if (drawWindow && !drawWindow.isDestroyed()) {
    drawWindow.close();
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
  }
});

ipcMain.on('expand-window-for-panel', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (currentWindowSize === 'fullscreen') return;
  savedPetBounds = mainWindow.getBounds();
  const display = screen.getPrimaryDisplay().workArea;
  mainWindow.setBounds({ x: display.x, y: display.y, width: display.width, height: display.height }, true);
});

ipcMain.on('restore-window-after-panel', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (savedPetBounds) {
    mainWindow.setBounds(savedPetBounds, true);
    mainWindow.webContents.send('window-resized', { width: savedPetBounds.width, height: savedPetBounds.height });
    savedPetBounds = null;
  }
});

ipcMain.on('save-diary', (_, entry) => {
  const data = loadDiaryData();
  data.push({
    ...entry,
    timestamp: Date.now()
  });
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const filtered = data.filter(d => d.timestamp && d.timestamp > threeDaysAgo);
  saveDiaryData(filtered);
});

ipcMain.handle('load-diary', () => {
  const data = loadDiaryData();
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  return data.filter(d => d.timestamp && d.timestamp > threeDaysAgo);
});
