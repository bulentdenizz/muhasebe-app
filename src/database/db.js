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
    durum TEXT DEFAULT 'Alacaklı',
    segment TEXT DEFAULT 'Standart'
);`;

db.run(createCariTable, (err) => {
    if (err) {
        console.error("Tablo oluşturma hatası", err);
    } else {
        // Eski tablolarda segment kolonu yoksa ekleyelim (Migrate)
        db.run(`ALTER TABLE cariler ADD COLUMN segment TEXT DEFAULT 'Standart'`, (err) => {
            // Kolon zaten varsa hata verir, yoksayabiliriz.
        });
    }
});

// Stok Tablosunu Oluştur (Eğer yoksa)
const createStokTable = `
CREATE TABLE IF NOT EXISTS stoklar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    urun_adi TEXT NOT NULL,
    barkod TEXT,
    alis_fiyati DECIMAL(18, 2) DEFAULT 0,
    satis_fiyati DECIMAL(18, 2) DEFAULT 0,
    kdv_orani INTEGER DEFAULT 18,
    stok_miktari INTEGER DEFAULT 0
);`;

db.run(createStokTable, (err) => {
    if (err) {
        console.error("Stok tablosu oluşturma hatası", err);
    }
});

// Müşteri İşlem Geçmişi Tablosunu Oluştur (Fatura / Ödeme Hareketleri)
const createIslemlerTable = `
CREATE TABLE IF NOT EXISTS islemler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cari_id INTEGER NOT NULL,
    islem_tipi TEXT NOT NULL,
    aciklama TEXT,
    tutar DECIMAL(18, 2) NOT NULL,
    vade_tarihi DATE,
    stok_id INTEGER,
    tarih DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(cari_id) REFERENCES cariler(id) ON DELETE CASCADE,
    FOREIGN KEY(stok_id) REFERENCES stoklar(id) ON DELETE SET NULL
);`;

db.run(createIslemlerTable, (err) => {
    if (err) {
        console.error("İşlemler tablosu oluşturma hatası", err);
    } else {
        // Eski tablolarda vade_tarihi veya stok_id yoksa ekleyelim (Migrate)
        db.run(`ALTER TABLE islemler ADD COLUMN vade_tarihi DATE`, (err) => { });
        db.run(`ALTER TABLE islemler ADD COLUMN stok_id INTEGER REFERENCES stoklar(id) ON DELETE SET NULL`, (err) => { });
    }
});

// Foreign Key desteğini açalım (SQLite default olarak kapalı tutar)
db.run("PRAGMA foreign_keys = ON;");

module.exports = db;