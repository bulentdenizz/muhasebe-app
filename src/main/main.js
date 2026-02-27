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
    try {
        const stmt = db.prepare('INSERT INTO cariler (unvan, telefon, bakiye, durum) VALUES (?, ?, ?, ?)');
        const result = stmt.run(veri.unvan, veri.telefon, veri.bakiye, veri.durum);
        return result; // Başarılıysa changes: 1 döner
    } catch (error) {
        console.error("Veritabanı Kayıt Hatası:", error);
        throw error;
    }
});

ipcMain.handle('carileri-getir', async () => {
    try {
        return db.prepare('SELECT * FROM cariler ORDER BY id DESC').all();
    } catch (error) {
        console.error("Veri Getirme Hatası:", error);
        return [];
    }
});

ipcMain.handle('cari-sil', async (event, id) => {
    try {
        const stmt = db.prepare('DELETE FROM cariler WHERE id = ?');
        return stmt.run(id);
    } catch (error) {
        console.error("Silme hatası:", error);
        throw error;
    }
});

app.whenReady().then(createWindow);