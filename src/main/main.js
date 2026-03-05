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

// Cari Ekleme IPC kanalı (Güncellendi)
ipcMain.handle('cari-ekle', async (event, veri) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT INTO cariler (unvan, telefon, bakiye, durum, segment) VALUES (?, ?, ?, ?, ?)');
        stmt.run([veri.unvan, veri.telefon, veri.bakiye, veri.durum, veri.segment || 'Standart'], function (err) {
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

// Yeni: Cari Detay ve İşlem Geçmişini Getirme
ipcMain.handle('cari-getir-detay', async (event, cariId) => {
    return new Promise((resolve, reject) => {
        // Önce carinin kendisini getirelim
        db.get('SELECT * FROM cariler WHERE id = ?', [cariId], (err, cari) => {
            if (err) {
                console.error("Cari Detay Hatası:", err);
                return resolve({ cari: null, islemler: [] });
            }
            if (!cari) return resolve({ cari: null, islemler: [] });

            // Sonra bu cariye ait işlem geçmişini getirelim
            db.all('SELECT * FROM islemler WHERE cari_id = ? ORDER BY tarih DESC', [cariId], (err, islemler) => {
                if (err) {
                    console.error("Cari İşlem Geçmişi Hatası:", err);
                    resolve({ cari, islemler: [] });
                } else {
                    resolve({ cari, islemler });
                }
            });
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

// STOK IPC Kanalları
ipcMain.handle('stok-ekle', async (event, veri) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT INTO stoklar (urun_adi, barkod, alis_fiyati, satis_fiyati, kdv_orani, stok_miktari) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run([veri.urun_adi, veri.barkod, veri.alis_fiyati, veri.satis_fiyati, veri.kdv_orani, veri.stok_miktari], function (err) {
            if (err) {
                console.error("Stok Kayıt Hatası:", err);
                reject(err);
            } else {
                resolve({ changes: this.changes, lastInsertRowid: this.lastID });
            }
        });
        stmt.finalize();
    });
});

ipcMain.handle('stoklari-getir', async () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM stoklar ORDER BY id DESC', [], (err, rows) => {
            if (err) {
                console.error("Stok Getirme Hatası:", err);
                resolve([]);
            } else {
                resolve(rows);
            }
        });
    });
});

// YENİ: SATIŞ / FATURA İŞLEMİ (ÇOKLU SEPET MANTIĞI - Week 3)
ipcMain.handle('satis-yap', async (event, satisData) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION", (err) => {
                if (err) return reject(err);

                // Toplam bakiyeyi müşteri hesabına yükle (İşlem 1)
                const updateCari = db.prepare('UPDATE cariler SET bakiye = bakiye + ? WHERE id = ?');
                updateCari.run([satisData.genel_toplam, satisData.cari_id], function (err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject(err);
                    }

                    // İşlem bittiğinde çağrılacak sayaç. Tüm ürünler bitince COMMIT yapacağız.
                    const sepetUrunleri = satisData.sepet_icerik;
                    let islemSayaci = 0;

                    if (sepetUrunleri.length === 0) {
                        db.run("ROLLBACK");
                        return reject(new Error("Sepet boş, fatura kesilemez."));
                    }

                    // Stok güncelleme ve geçmiş tablosu hazırlıkları
                    const updateStok = db.prepare('UPDATE stoklar SET stok_miktari = stok_miktari - ? WHERE id = ? AND stok_miktari >= ?');
                    const insertIslem = db.prepare('INSERT INTO islemler (cari_id, islem_tipi, aciklama, tutar, vade_tarihi, stok_id) VALUES (?, ?, ?, ?, ?, ?)');

                    sepetUrunleri.forEach((urun, index) => {
                        // 1. Stok Düş
                        updateStok.run([urun.adet, urun.stok_id, urun.adet], function (err) {
                            if (err || this.changes === 0) {
                                db.run("ROLLBACK");
                                return reject(new Error(`Hata! '${urun.urun_adi}' için stok yetersiz veya bulunamıyor.`));
                            }

                            // 2. İşlem Geçmişine Ekle
                            insertIslem.run([
                                satisData.cari_id,
                                'Satış Faturası Kalemi',
                                `${urun.adet} Adet x ${urun.urun_adi} (${urun.kdv_orani}% KDV)`,
                                urun.tutar,
                                satisData.vade_tarihi || null,
                                urun.stok_id
                            ], function (err) {
                                if (err) {
                                    db.run("ROLLBACK");
                                    return reject(err);
                                }

                                islemSayaci++;
                                // Tüm döngü kalemleri başarılıysa
                                if (islemSayaci === sepetUrunleri.length) {
                                    updateStok.finalize();
                                    insertIslem.finalize();
                                    db.run("COMMIT", (err) => {
                                        if (err) return reject(err);
                                        resolve({ success: true, islemSayisi: islemSayaci });
                                    });
                                }
                            });
                        });
                    });
                });
            });
        });
    });
});

ipcMain.handle('stok-sil', async (event, id) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('DELETE FROM stoklar WHERE id = ?');
        stmt.run(id, function (err) {
            if (err) {
                console.error("Stok Silme hatası:", err);
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
        stmt.finalize();
    });
});

ipcMain.handle('stok-getir-detay', async (event, stokId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM stoklar WHERE id = ?', [stokId], (err, stok) => {
            if (err) {
                console.error("Stok Detay Hatası:", err);
                return resolve({ stok: null, islemler: [] });
            }
            if (!stok) return resolve({ stok: null, islemler: [] });

            db.all(`
                SELECT islemler.*, cariler.unvan 
                FROM islemler 
                LEFT JOIN cariler ON islemler.cari_id = cariler.id 
                WHERE islemler.stok_id = ? 
                ORDER BY islemler.tarih DESC
            `, [stokId], (err, islemler) => {
                if (err) {
                    console.error("Stok İşlem Geçmişi Hatası:", err);
                    resolve({ stok, islemler: [] });
                } else {
                    resolve({ stok, islemler });
                }
            });
        });
    });
});

// YENİ: DASHBOARD (ANA SAYFA) İSTATİSTİKLERİNİ GETİRME
ipcMain.handle('get-dashboard-data', async () => {
    return new Promise((resolve, reject) => {
        const dashboardData = {
            toplamKasa: 0,
            gelecekOdemeler: 0,
            gecikenBorclar: 0,
            aylikSatislar: []
        };

        db.serialize(() => {
            // 1. CARİ BAKİYELERİ HESAPLAMA (Gelecek ödemeler ve borçlar)
            // Eğer müşteri bakiyesi pozitifse alacaklıyız (Gelecek ödeme), negatifse borçluyuz (Bizim borcumuz).
            db.get(`
                SELECT 
                    SUM(CASE WHEN bakiye > 0 THEN bakiye ELSE 0 END) as toplamAlacak,
                    SUM(CASE WHEN bakiye < 0 THEN ABS(bakiye) ELSE 0 END) as toplamBorc
                FROM cariler
            `, (err, bakiyeRow) => {
                if (!err && bakiyeRow) {
                    dashboardData.gelecekOdemeler = bakiyeRow.toplamAlacak || 0;
                    dashboardData.gecikenBorclar = bakiyeRow.toplamBorc || 0;
                }

                // 2. TOPLAM KASA HESABI (Basitçe, tüm tahsilatların ve ödemelerin farkı vs. olabilir ama 
                // şimdilik tüm satışların toplamını "Toplam Satış Hacmi" olarak gösterebiliriz veya basit bir kasa mantığı)
                // Şimdilik sadece Satış faturalarının toplamını alalım
                db.get(`
                    SELECT SUM(tutar) as toplamKasa FROM islemler WHERE islem_tipi = 'Satış Faturası Kalemi'
                `, (err, kasaRow) => {
                    if (!err && kasaRow) {
                        dashboardData.toplamKasa = kasaRow.toplamKasa || 0;
                    }

                    // 3. AYLIK SATIŞ GRAFİĞİ İÇİN VERİ (Son 6 Ay)
                    // SQLite'da strftime ile aya göre gruplama yapıyoruz
                    db.all(`
                        SELECT 
                            strftime('%Y-%m', tarih) as ay, 
                            SUM(tutar) as toplam 
                        FROM islemler 
                        WHERE islem_tipi = 'Satış Faturası Kalemi' 
                        GROUP BY ay 
                        ORDER BY ay DESC 
                        LIMIT 6
                    `, (err, chartRows) => {
                        if (!err && chartRows) {
                            // Backendden grafiğe uygun formatta, ayları eskiden yeniye doğru gönderelim
                            dashboardData.aylikSatislar = chartRows.reverse();
                        }

                        resolve(dashboardData);
                    });
                });
            });
        });
    });
});

app.whenReady().then(createWindow);