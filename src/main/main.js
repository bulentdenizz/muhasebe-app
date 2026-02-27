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
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT INTO cariler (unvan, telefon, bakiye, durum) VALUES (?, ?, ?, ?)');
        stmt.run([veri.unvan, veri.telefon, veri.bakiye, veri.durum], function (err) {
            if (err) {
                console.error("Veritabanı Kayıt Hatası:", err);
                reject(err);
            } else {
                resolve({ changes: this.changes, lastInsertRowid: this.lastID });
            }
        });
        stmt.finalize();
    });
});

ipcMain.handle('carileri-getir', async () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM cariler ORDER BY id DESC', [], (err, rows) => {
            if (err) {
                console.error("Veri Getirme Hatası:", err);
                // Hata olsa bile arayüze boş dönüyoruz ki tamamen çökmesin
                resolve([]);
            } else {
                resolve(rows);
            }
        });
    });
});

ipcMain.handle('cari-sil', async (event, id) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('DELETE FROM cariler WHERE id = ?');
        stmt.run(id, function (err) {
            if (err) {
                console.error("Silme hatası:", err);
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
        stmt.finalize();
    });
});

app.whenReady().then(createWindow);