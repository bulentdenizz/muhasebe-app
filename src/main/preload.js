const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    cariEkle: (veriler) => ipcRenderer.invoke('cari-ekle', veriler),
    carileriGetir: () => ipcRenderer.invoke('carileri-getir'),
    cariSil: (id) => ipcRenderer.invoke('cari-sil', id),
});