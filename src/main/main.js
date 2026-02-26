const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('../database/db');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('src/renderer/index.html');
}

// Cari Ekleme IPC kanalı
ipcMain.handle('cari-ekle', async (event, veri) => {
    const stmt = db.prepare('INSERT INTO cariler (unvan, telefon, bakiye, durum) VALUES (?, ?, ?, ?)');
    return stmt.run(veri.unvan, veri.telefon, veri.bakiye, veri.durum);
});

app.whenReady().then(createWindow);