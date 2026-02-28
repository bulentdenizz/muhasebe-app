// Sayfa yüklendiğinde carileri otomatik getir
window.onload = () => {
    carileriYukle();
    stoklariYukle();
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
                        ₺ ${parseFloat(cari.bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
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

// --- STOK MODÜLÜ (2. HAFTA) ---

function stokModalAc() { document.getElementById('stokModal').classList.remove('hidden'); }
function stokModalKapat() { document.getElementById('stokModal').classList.add('hidden'); }

async function stoklariYukle() {
    try {
        const stoklar = await window.api.stoklariGetir();
        const tabloGövdesi = document.getElementById('stokListesi');

        if (!tabloGövdesi) return;

        tabloGövdesi.innerHTML = ""; // Önce tabloyu boşalt

        stoklar.forEach(stok => {
            const alisStr = parseFloat(stok.alis_fiyati).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
            const satisStr = parseFloat(stok.satis_fiyati).toLocaleString('tr-TR', { minimumFractionDigits: 2 });

            const satir = `
                <tr class="hover:bg-gray-50 border-b border-gray-200 transition">
                    <td class="p-4 font-medium text-gray-800">${stok.urun_adi}</td>
                    <td class="p-4 text-gray-600">${stok.barkod || '-'}</td>
                    <td class="p-4 font-bold text-blue-600">${stok.stok_miktari} Adet</td>
                    <td class="p-4">
                        <span class="text-sm text-gray-500 line-through">₺${alisStr}</span><br>
                        <span class="font-bold text-green-600">₺${satisStr}</span>
                    </td>
                    <td class="p-4"><span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">%${stok.kdv_orani}</span></td>
                    <td class="p-4 text-right">
                        <button class="text-blue-600 hover:text-blue-800 font-medium mr-3">Düzenle</button>
                        <button onclick="stokSil(${stok.id})" class="text-red-600 hover:text-red-800 font-medium">Sil</button>
                    </td>
                </tr>
            `;
            tabloGövdesi.innerHTML += satir;
        });
    } catch (error) {
        console.error("Stok Listeleme hatası:", error);
    }
}

async function stokKaydet() {
    const adKutu = document.getElementById('urun_adi');
    const barkodKutu = document.getElementById('barkod');
    const alisKutu = document.getElementById('alis_fiyati');
    const satisKutu = document.getElementById('satis_fiyati');
    const kdvKutu = document.getElementById('kdv_orani');
    const stokKutu = document.getElementById('stok_miktari');

    if (!adKutu.value) return alert("Lütfen bir Ürün Adı giriniz!");

    const veri = {
        urun_adi: adKutu.value,
        barkod: barkodKutu.value,
        alis_fiyati: parseFloat(alisKutu.value) || 0,
        satis_fiyati: parseFloat(satisKutu.value) || 0,
        kdv_orani: parseInt(kdvKutu.value) || 18,
        stok_miktari: parseInt(stokKutu.value) || 0
    };

    try {
        const sonuc = await window.api.stokEkle(veri);
        if (sonuc.changes > 0) {
            alert("Ürün başarıyla kaydedildi!");
            stokModalKapat();

            // Temizlik
            adKutu.value = "";
            barkodKutu.value = "";
            alisKutu.value = "0";
            satisKutu.value = "0";
            stokKutu.value = "0";

            stoklariYukle(); // Listeyi tazele
        }
    } catch (error) {
        console.error("Stok Kayıt Hatası:", error);
    }
}

async function stokSil(id) {
    if (confirm("Bu ürünü tamamen silmek istediğinize emin misiniz?")) {
        try {
            const sonuc = await window.api.stokSil(id);
            if (sonuc.changes > 0) {
                alert("Ürün silindi.");
                stoklariYukle(); // Listeyi tazele
            }
        } catch (error) {
            alert("Silme işlemi sırasında hata oluştu!");
        }
    }
}

// --- ORTAK ARAMA FONKSİYONU ---
function aramaYap(girdiId, tabloId) {
    // Arama kutusundaki metni alıp küçük harfe çevirelim
    const aramaMetni = document.getElementById(girdiId).value.toLowerCase();
    // Hedef tablonun gövdesindeki (tbody) tüm satırları bulalım (tr)
    const satirlar = document.getElementById(tabloId).getElementsByTagName('tr');

    // Her satırı dolaşıp eşleşme arayalım
    for (let i = 0; i < satirlar.length; i++) {
        let eslesmeVar = false;
        // İlgili satırın içindeki hücreleri (td) alalım
        const hucreler = satirlar[i].getElementsByTagName('td');

        // Sadece ilk iki hücrede (ör: Unvan/Telefon veya Ad/Barkod) arama yapmak yeterli
        const aranacakSutunSayisi = Math.min(hucreler.length, 2);

        for (let j = 0; j < aranacakSutunSayisi; j++) {
            if (hucreler[j]) {
                const hucreMetni = hucreler[j].textContent || hucreler[j].innerText;
                if (hucreMetni.toLowerCase().indexOf(aramaMetni) > -1) {
                    eslesmeVar = true;
                    break;
                }
            }
        }

        // Eğer eşleşme varsa satırı göster, yoksa gizle
        if (eslesmeVar) {
            satirlar[i].style.display = "";
        } else {
            satirlar[i].style.display = "none";
        }
    }
}