// Modal Kontrolleri
function modalAc() {
    document.getElementById('cariModal').classList.remove('hidden');
}

function modalKapat() {
    document.getElementById('cariModal').classList.add('hidden');
}

function sayfaDegistir(sayfaId, baslik) {
    // Tüm bölümleri gizle
    document.querySelectorAll('section').forEach(section => {
        section.classList.add('hidden');
    });

    // İlgili bölümü göster
    document.getElementById('section-' + sayfaId).classList.remove('hidden');
    
    // Başlığı güncelle
    document.getElementById('pageTitle').innerText = baslik;

    // Menüdeki aktif rengi güncellemek için de burayı kullanabiliriz
}

// Kaydetme İşlemi
async function cariKaydet() {
    const unvan = document.getElementById('unvan').value;
    const telefon = document.getElementById('telefon').value;
    const bakiye = document.getElementById('bakiye').value;

    if (!unvan) {
        alert("Lütfen unvan giriniz!");
        return;
    }

    const veri = {
        unvan: unvan,
        telefon: telefon,
        bakiye: parseFloat(bakiye) || 0,
        durum: 'Alacakli'
    };

    try {
        const sonuc = await window.api.cariEkle(veri);
        if (sonuc.changes > 0) {
            alert("Başarıyla kaydedildi!");
            modalKapat();
            // Formu temizle
            document.getElementById('unvan').value = "";
            document.getElementById('telefon').value = "";
            document.getElementById('bakiye').value = "0";
            location.reload(); // Şimdilik listeyi yenilemek için
        }
    } catch (error) {
        console.error("Hata:", error);
        alert("Kaydedilemedi!");
    }
}