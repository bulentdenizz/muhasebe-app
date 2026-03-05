const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    cariEkle: (veriler) => ipcRenderer.invoke('cari-ekle', veriler),
    carileriGetir: () => ipcRenderer.invoke('carileri-getir'),
    cariGetirDetay: (id) => ipcRenderer.invoke('cari-getir-detay', id),
    cariSil: (id) => ipcRenderer.invoke('cari-sil', id),
    stokEkle: (veriler) => ipcRenderer.invoke('stok-ekle', veriler),
    stokGuncelle: (veriler) => ipcRenderer.invoke('stok-guncelle', veriler),
    stoklariGetir: () => ipcRenderer.invoke('stoklari-getir'),
    stokGetirDetay: (id) => ipcRenderer.invoke('stok-getir-detay', id),
    stokSil: (id) => ipcRenderer.invoke('stok-sil', id),
    satisYap: (veri) => ipcRenderer.invoke('satis-yap', veri),
    getDashboardData: () => ipcRenderer.invoke('get-dashboard-data'),
    islemEkle: (veri) => ipcRenderer.invoke('islem-ekle', veri)
});