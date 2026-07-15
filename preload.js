const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  listDevices: () => ipcRenderer.invoke('list-devices'),
  captureScreen: (serial) => ipcRenderer.invoke('capture-screen', serial),
  sendTap: (payload) => ipcRenderer.invoke('send-tap', payload),
  sendSwipe: (payload) => ipcRenderer.invoke('send-swipe', payload),
  sendText: (payload) => ipcRenderer.invoke('send-text', payload),
  sendKey: (payload) => ipcRenderer.invoke('send-key', payload)
});
