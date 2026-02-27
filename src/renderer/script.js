// Sayfa yüklendiğinde carileri otomatik getir
window.onload = () => {
    carileriYukle();
};

async function carileriYukle() {
    try {
        // Preload.js'deki isme göre çağırdık
        const cariler = await window.api.carileriGetir();
        const tabloGövdesi = document.getElementById('cariListesi'); // HTML'deki id ile aynı olmalı
        
        if (!tabloGövdesi) return;

        tabloGövdesi.innerHTML = ""; // Önce tabloyu boşalt

        cariler.forEach(cari => {
            const satir = `
                <tr class="hover:bg-gray-50 border-b border-gray-200 transition">
                    <td class="p-4 font-medium text-gray-800">${cari.unvan}</td>
                    <td class="p-4 text-gray-600">${cari.telefon || '-'}</td>
                    <td class="p-4 font-bold ${cari.bakiye >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ₺ ${parseFloat(cari.bakiye).toLocaleString('tr-TR', {minimumFractionDigits: 2})}
                    </td>
                    <td class="p-4"><span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">${cari.durum}</span></td>
                    <td class="p-4 text-right">
                        <button class="text-blue-600 hover:text-blue-800 font-medium mr-3">Düzenle</button>
                        <button onclick="cariSil(${cari.id})" class="text-red-600 hover:text-red-800 font-medium">Sil</button>
                    </td>
                </tr>
            `;
            tabloGövdesi.innerHTML += satir;
        });
    } catch (error) {
        console.error("Listeleme hatası:", error);
    }
}

// --- Senin Mevcut Fonksiyonların (Aynen Kalsın) ---
function modalAc() { document.getElementById('cariModal').classList.remove('hidden'); }
function modalKapat() { document.getElementById('cariModal').classList.add('hidden'); }

function sayfaDegistir(sayfaId, baslik) {
    document.querySelectorAll('section').forEach(section => section.classList.add('hidden'));
    document.getElementById('section-' + sayfaId).classList.remove('hidden');
    document.getElementById('pageTitle').innerText = baslik;
}

async function cariKaydet() {
    const unvanKutusu = document.getElementById('unvan');
    const telefonKutusu = document.getElementById('phone');
    const bakiyeKutusu = document.getElementById('balance');

    if (!unvanKutusu.value) return alert("Lütfen bir unvan giriniz!");

    const veri = {
        unvan: unvanKutusu.value,
        telefon: telefonKutusu.value,
        bakiye: parseFloat(bakiyeKutusu.value) || 0,
        durum: 'Alacakli'
    };

    try {
        const sonuc = await window.api.cariEkle(veri);
        if (sonuc.changes > 0) {
            alert("Cari başarıyla kaydedildi!");
            modalKapat();
            carileriYukle(); // Sayfayı yenilemek yerine listeyi tazele
        }
    } catch (error) {
        console.error("Hata:", error);
    }
}

async function cariSil(id) {
    if (confirm("Bu cari kaydını silmek istediğinize emin misiniz?")) {
        try {
            const sonuc = await window.api.cariSil(id);
            if (sonuc.changes > 0) {
                alert("Kayıt silindi.");
                carileriYukle(); // Listeyi tazele
            }
        } catch (error) {
            alert("Silme işlemi sırasında hata oluştu!");
        }
    }
}