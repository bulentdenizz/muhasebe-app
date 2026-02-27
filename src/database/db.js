const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Veritabanı dosyasını oluştur (muhasebe.db adında bir dosya yaratır)
const db = new sqlite3.Database('muhasebe.db', (err) => {
    if (err) {
        console.error('Veritabanına bağlanılamadı:', err.message);
    } else {
        console.log('muhasebe.db veritabanına bağlanıldı.');
    }
});

// Cari Tablosunu Oluştur (Eğer yoksa)
const createCariTable = `
CREATE TABLE IF NOT EXISTS cariler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unvan TEXT NOT NULL,
    telefon TEXT,
    bakiye DECIMAL(18, 2) DEFAULT 0,
    durum TEXT DEFAULT 'Alacaklı'
);`;

db.run(createCariTable, (err) => {
    if (err) {
        console.error("Tablo oluşturma hatası", err);
    }
});

module.exports = db;