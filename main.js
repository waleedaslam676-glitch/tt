const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { execFile } = require('child_process');

// If you place adb.exe in the same folder as this app, it will be used automatically.
// Otherwise it falls back to "adb" from your system PATH.
const ADB_PATH = require('fs').existsSync(path.join(__dirname, 'adb.exe'))
  ? path.join(__dirname, 'adb.exe')
  : 'adb';

function runAdb(args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(ADB_PATH, args, { maxBuffer: 1024 * 1024 * 20, ...opts }, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout);
    });
  });
}

// Returns raw PNG buffer from device screenshot
function runAdbBinary(args) {
  return new Promise((resolve, reject) => {
    execFile(ADB_PATH, args, { maxBuffer: 1024 * 1024 * 20, encoding: 'buffer' }, (err, stdout, stderr) => {
      if (err) return reject(stderr ? stderr.toString() : err.message);
      resolve(stdout);
    });
  });
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Multi-Droid Control (Free)',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------- IPC Handlers ----------

// List connected devices with serial + model + resolution
ipcMain.handle('list-devices', async () => {
  const out = await runAdb(['devices']);
  const lines = out.split('\n').map(l => l.trim()).filter(Boolean);
  const serials = lines.slice(1)
    .filter(l => l.includes('\tdevice') || l.endsWith('device'))
    .map(l => l.split(/\s+/)[0]);

  const devices = [];
  for (const serial of serials) {
    let model = 'Unknown';
    let resolution = { w: 1080, h: 1920 };
    try {
      const modelOut = await runAdb(['-s', serial, 'shell', 'getprop', 'ro.product.model']);
      model = modelOut.trim();
    } catch (e) {}
    try {
      const sizeOut = await runAdb(['-s', serial, 'shell', 'wm', 'size']);
      const match = sizeOut.match(/(\d+)x(\d+)/);
      if (match) resolution = { w: parseInt(match[1]), h: parseInt(match[2]) };
    } catch (e) {}
    devices.push({ serial, model, resolution });
  }
  return devices;
});

// Capture a screenshot (PNG) from a device, returns base64 string
ipcMain.handle('capture-screen', async (event, serial) => {
  try {
    const buf = await runAdbBinary(['-s', serial, 'exec-out', 'screencap', '-p']);
    return buf.toString('base64');
  } catch (e) {
    return null;
  }
});

// Send a tap at normalized coordinates (0-1 range) - scaled per device resolution
ipcMain.handle('send-tap', async (event, { serial, nx, ny, resolution }) => {
  const x = Math.round(nx * resolution.w);
  const y = Math.round(ny * resolution.h);
  try {
    await runAdb(['-s', serial, 'shell', 'input', 'tap', String(x), String(y)]);
    return true;
  } catch (e) {
    return false;
  }
});

// Send a swipe using normalized start/end coordinates
ipcMain.handle('send-swipe', async (event, { serial, nx1, ny1, nx2, ny2, resolution, duration }) => {
  const x1 = Math.round(nx1 * resolution.w);
  const y1 = Math.round(ny1 * resolution.h);
  const x2 = Math.round(nx2 * resolution.w);
  const y2 = Math.round(ny2 * resolution.h);
  try {
    await runAdb(['-s', serial, 'shell', 'input', 'swipe', String(x1), String(y1), String(x2), String(y2), String(duration || 200)]);
    return true;
  } catch (e) {
    return false;
  }
});

// Send text input (works when a text field is focused)
ipcMain.handle('send-text', async (event, { serial, text }) => {
  // input text requires spaces escaped as %s
  const escaped = text.replace(/ /g, '%s');
  try {
    await runAdb(['-s', serial, 'shell', 'input', 'text', escaped]);
    return true;
  } catch (e) {
    return false;
  }
});

// Send a key event (e.g. BACK=4, HOME=3, ENTER=66)
ipcMain.handle('send-key', async (event, { serial, keycode }) => {
  try {
    await runAdb(['-s', serial, 'shell', 'input', 'keyevent', String(keycode)]);
    return true;
  } catch (e) {
    return false;
  }
});
