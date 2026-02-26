const Database = require('better-sqlite3');
const path = require('path');

// Veritabanı dosyasını oluştur (muhasebe.db adında bir dosya yaratır)
const db = new Database('muhasebe.db', { verbose: console.log });

// Cari Tablosunu Oluştur (Eğer yoksa)
const createCariTable = `
CREATE TABLE IF NOT EXISTS cariler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unvan TEXT NOT NULL,
    telefon TEXT,
    bakiye DECIMAL(18, 2) DEFAULT 0,
    durum TEXT DEFAULT 'Alacaklı'
);`;

db.exec(createCariTable);

module.exports = db;