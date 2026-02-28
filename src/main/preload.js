const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    cariEkle: (veriler) => ipcRenderer.invoke('cari-ekle', veriler),
    carileriGetir: () => ipcRenderer.invoke('carileri-getir'),
    cariGetirDetay: (id) => ipcRenderer.invoke('cari-getir-detay', id),
    cariSil: (id) => ipcRenderer.invoke('cari-sil', id),
    stokEkle: (veriler) => ipcRenderer.invoke('stok-ekle', veriler),
    stoklariGetir: () => ipcRenderer.invoke('stoklari-getir'),
    stokSil: (id) => ipcRenderer.invoke('stok-sil', id),
    satisYap: (veri) => ipcRenderer.invoke('satis-yap', veri)
});