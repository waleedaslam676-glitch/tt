let devices = [];       // {serial, model, resolution}
let mainSerial = null;  // currently controlled device
let syncedSerials = new Set(); // devices that mirror the main device's actions
let pollTimer = null;
let lastImg = new Image();
let downPoint = null; // {nx, ny, t}

const deviceListEl = document.getElementById('deviceList');
const canvas = document.getElementById('screenCanvas');
const ctx = canvas.getContext('2d');
const mainDeviceLabel = document.getElementById('mainDeviceLabel');
const syncToggle = document.getElementById('syncToggle');
const liveToggle = document.getElementById('liveToggle');

async function refreshDevices() {
  deviceListEl.innerHTML = '<div style="color:#888;font-size:12px;">Scanning...</div>';
  devices = await window.api.listDevices();
  renderDeviceList();
}

function renderDeviceList() {
  deviceListEl.innerHTML = '';
  if (devices.length === 0) {
    deviceListEl.innerHTML = '<div style="color:#888;font-size:12px;">No devices found. Connect via USB with debugging enabled.</div>';
    return;
  }
  devices.forEach(d => {
    const div = document.createElement('div');
    div.className = 'device-item' + (d.serial === mainSerial ? ' main-selected' : '');

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'mainDevice';
    radio.checked = d.serial === mainSerial;
    radio.title = 'Set as MAIN (controlled) device';
    radio.addEventListener('change', () => {
      mainSerial = d.serial;
      mainDeviceLabel.textContent = `Main: ${d.model} (${d.serial})`;
      renderDeviceList();
      startPolling();
    });

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = syncedSerials.has(d.serial);
    check.title = 'Sync actions to this device';
    check.addEventListener('change', () => {
      if (check.checked) syncedSerials.add(d.serial);
      else syncedSerials.delete(d.serial);
    });

    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `<div class="model">${d.model}</div><div class="serial">${d.serial} · ${d.resolution.w}x${d.resolution.h}</div>`;

    div.appendChild(radio);
    div.appendChild(check);
    div.appendChild(info);
    deviceListEl.appendChild(div);
  });
}

async function pollScreen() {
  if (!mainSerial || !liveToggle.checked) return;
  const b64 = await window.api.captureScreen(mainSerial);
  if (b64) {
    lastImg.src = 'data:image/png;base64,' + b64;
    lastImg.onload = () => {
      canvas.width = lastImg.width;
      canvas.height = lastImg.height;
      ctx.drawImage(lastImg, 0, 0);
    };
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(pollScreen, 500); // ~2 fps refresh, adjustable
  pollScreen();
}

function getDevice(serial) {
  return devices.find(d => d.serial === serial);
}

function canvasToNormalized(evt) {
  const rect = canvas.getBoundingClientRect();
  const nx = (evt.clientX - rect.left) / rect.width;
  const ny = (evt.clientY - rect.top) / rect.height;
  return { nx, ny };
}

async function broadcastTap(nx, ny) {
  const targets = [mainSerial, ...syncedSerials].filter((v, i, a) => v && a.indexOf(v) === i);
  for (const serial of targets) {
    const dev = getDevice(serial);
    if (!dev) continue;
    await window.api.sendTap({ serial, nx, ny, resolution: dev.resolution });
  }
}

async function broadcastSwipe(nx1, ny1, nx2, ny2, duration) {
  const targets = [mainSerial, ...syncedSerials].filter((v, i, a) => v && a.indexOf(v) === i);
  for (const serial of targets) {
    const dev = getDevice(serial);
    if (!dev) continue;
    await window.api.sendSwipe({ serial, nx1, ny1, nx2, ny2, resolution: dev.resolution, duration });
  }
}

async function broadcastText(text) {
  const targets = [mainSerial, ...syncedSerials].filter((v, i, a) => v && a.indexOf(v) === i);
  for (const serial of targets) {
    await window.api.sendText({ serial, text });
  }
}

async function broadcastKey(keycode) {
  const targets = [mainSerial, ...syncedSerials].filter((v, i, a) => v && a.indexOf(v) === i);
  for (const serial of targets) {
    await window.api.sendKey({ serial, keycode });
  }
}

canvas.addEventListener('mousedown', (e) => {
  downPoint = { ...canvasToNormalized(e), t: Date.now() };
});

canvas.addEventListener('mouseup', async (e) => {
  if (!downPoint || !mainSerial) return;
  const up = { ...canvasToNormalized(e), t: Date.now() };
  const dist = Math.hypot(up.nx - downPoint.nx, up.ny - downPoint.ny);
  const duration = up.t - downPoint.t;

  if (dist < 0.01) {
    // Treated as a tap
    await broadcastTap(up.nx, up.ny);
  } else {
    // Treated as a swipe
    await broadcastSwipe(downPoint.nx, downPoint.ny, up.nx, up.ny, Math.max(duration, 100));
  }
  downPoint = null;
  // Refresh screen shortly after interaction
  setTimeout(pollScreen, 300);
});

document.getElementById('refreshBtn').addEventListener('click', refreshDevices);

document.getElementById('sendTextBtn').addEventListener('click', async () => {
  const val = document.getElementById('textInput').value;
  if (!val) return;
  await broadcastText(val);
  document.getElementById('textInput').value = '';
  setTimeout(pollScreen, 300);
});

document.querySelectorAll('.key-box button').forEach(btn => {
  btn.addEventListener('click', async () => {
    await broadcastKey(btn.dataset.key);
    setTimeout(pollScreen, 300);
  });
});

syncToggle.addEventListener('change', () => {
  if (!syncToggle.checked) syncedSerials.clear();
  renderDeviceList();
});

// Initial load
refreshDevices();
