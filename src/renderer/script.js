window.onload = () => {
    dashboardYukle();
    carileriYukle();
    stoklariYukle();
    satisFormlariniDoldur();
};

// Global Data Storage for easy price calculation
let globalStokVerileri = [];
let globalCariVerileri = [];
let stokSecenekHTML = '<option value="">-- Ürün Seçin --</option>'; // Kalem selectlerini doldurmak için cache
let dashboardChartIstance = null; // Grafik referansı

async function dashboardYukle() {
    try {
        const data = await window.api.getDashboardData();

        // 1. Text Metrikleri Güncelle
        document.getElementById('metric-kasa').innerText = "₺ " + parseFloat(data.toplamKasa).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        document.getElementById('metric-alacak').innerText = "₺ " + parseFloat(data.gelecekOdemeler).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        document.getElementById('metric-borc').innerText = "₺ " + parseFloat(data.gecikenBorclar).toLocaleString('tr-TR', { minimumFractionDigits: 2 });

        // 2. Grafiği Çiz (veya güncelle)
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        // Ay ve Tutar arraylerini ayır
        const aylar = data.aylikSatislar.map(row => row.ay); // Örn: ['2023-10', '2023-11']
        const tutarlar = data.aylikSatislar.map(row => row.toplam);

        // Grafik zaten varsa yok edip yenisini çizmek daha temiz olur
        if (dashboardChartIstance) {
            dashboardChartIstance.destroy();
        }

        dashboardChartIstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: aylar,
                datasets: [{
                    label: 'Toplam Satış (₺)',
                    data: tutarlar,
                    backgroundColor: 'rgba(99, 102, 241, 0.5)', // indigo-500 %50
                    borderColor: 'rgb(99, 102, 241)', // indigo-500
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '₺' + value.toLocaleString('tr-TR');
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

    } catch (err) {
        console.error("Dashboard yüklenirken hata:", err);
    }
}

async function carileriYukle() {
    try {
        const cariler = await window.api.carileriGetir();
        globalCariVerileri = cariler; // Cache it

        const tabloGövdesi = document.getElementById('cariListesi');

        if (!tabloGövdesi) return;

        tabloGövdesi.innerHTML = ""; // Önce tabloyu boşalt

        cariler.forEach(cari => {
            // Segment rengini ayarlama
            let segmentClass = 'bg-gray-100 text-gray-700';
            let segmentIcon = '';
            if (cari.segment === 'VIP') { segmentClass = 'bg-purple-100 text-purple-700 border-purple-200 border'; segmentIcon = '⭐ '; }
            else if (cari.segment === 'Toptancı') { segmentClass = 'bg-blue-100 text-blue-700'; }
            else if (cari.segment === 'Riskli') { segmentClass = 'bg-red-100 text-red-700 font-bold border-red-200 border'; }

            const satir = `
                <tr class="hover:bg-gray-50 border-b border-gray-200 transition">
                    <td class="p-4 font-medium text-gray-800">${cari.unvan}</td>
                    <td class="p-4 text-gray-600">${cari.telefon || '-'}</td>
                    <td class="p-4"><span class="px-2.5 py-1 text-xs font-semibold rounded-md ${segmentClass}">${segmentIcon}${cari.segment || 'Standart'}</span></td>
                    <td class="p-4 font-bold ${cari.bakiye >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ₺ ${parseFloat(cari.bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td class="p-4"><span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">${cari.durum}</span></td>
                    <td class="p-4 text-right whitespace-nowrap">
                        <button onclick="cariProfilAc(${cari.id})" class="text-indigo-600 hover:text-indigo-800 font-bold mr-3 bg-indigo-50 px-3 py-1.5 rounded-md transition hover:bg-indigo-100">İncele</button>
                        <button onclick="cariSil(${cari.id})" class="text-gray-400 hover:text-red-600 font-medium transition px-2">Sil</button>
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
    const segmentKutusu = document.getElementById('segment');

    if (!unvanKutusu.value) return alert("Lütfen bir unvan giriniz!");

    const veri = {
        unvan: unvanKutusu.value,
        telefon: telefonKutusu.value,
        bakiye: parseFloat(bakiyeKutusu.value) || 0,
        durum: 'Alacakli',
        segment: segmentKutusu ? segmentKutusu.value : 'Standart'
    };

    try {
        const sonuc = await window.api.cariEkle(veri);
        if (sonuc.changes > 0) {
            alert("Müşteri başarıyla kaydedildi!");
            modalKapat();
            carileriYukle(); // Sayfayı yenilemek yerine listeyi tazele
            dashboardYukle(); // Dashboard metrikleri (bekleyen ödemeler vs. değişebilir)
        }
    } catch (error) {
        console.error("Hata:", error);
    }
}

async function cariSil(id) {
    if (confirm("Bu müşteri kaydını silmek istediğinize emin misiniz?")) {
        try {
            const sonuc = await window.api.cariSil(id);
            if (sonuc.changes > 0) {
                alert("Kayıt silindi.");
                carileriYukle(); // Listeyi tazele
                dashboardYukle();
            }
        } catch (error) {
            alert("Silme işlemi sırasında hata oluştu!");
        }
    }
}

// --- MÜŞTERİ (CARİ) PROFİLİ / HESAP ÖZETİ EKRANI ---
async function cariProfilAc(id) {
    try {
        const { cari, islemler } = await window.api.cariGetirDetay(id);
        if (!cari) return alert("Müşteri bulunamadı!");

        // Ekranı değiştir
        sayfaDegistir('cari-detay', cari.unvan + ' Profili');

        // Üst Kısım Bilgileri
        document.getElementById('detayUnvan').innerText = cari.unvan;
        document.getElementById('detaySegmentTag').innerText = cari.segment || 'Standart';
        document.getElementById('detayBakiye').innerText = `₺ ${parseFloat(cari.bakiye).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

        // İşlem İstatistikleri
        document.getElementById('detayIslemSayisi').innerText = islemler.length;
        document.getElementById('detaySonIslem').innerText = islemler.length > 0 ? (new Date(islemler[0].tarih)).toLocaleDateString('tr-TR') : '-';

        // Segment renk sınıfı
        const tagBox = document.getElementById('detaySegmentTag');
        tagBox.className = 'inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded border ';
        if (cari.segment === 'VIP') tagBox.className += 'bg-purple-100 text-purple-800 border-purple-400';
        else if (cari.segment === 'Riskli') tagBox.className += 'bg-red-100 text-red-800 border-red-400';
        else tagBox.className += 'bg-blue-100 text-blue-800 border-blue-400'; // Standart/Toptancı

        // İşlem Listesi Tablosu
        const tabloGövdesi = document.getElementById('islemListesi');
        tabloGövdesi.innerHTML = "";

        if (islemler.length === 0) {
            tabloGövdesi.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400 italic">Henüz geçmiş bir işlem (alım/satım) bulunmuyor.</td></tr>`;
        } else {
            islemler.forEach(islem => {
                const tarihStr = new Date(islem.tarih).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                // Satış/Tahsilat yeşil, Alış/Ödeme kırmızı mantığı (örnektir)
                const renk = (islem.islem_tipi === 'Satış' || islem.islem_tipi === 'Tahsilat') ? 'text-green-600' : 'text-red-600';
                const onEk = (islem.islem_tipi === 'Satış' || islem.islem_tipi === 'Tahsilat') ? '+' : '-';

                tabloGövdesi.innerHTML += `
                    <tr class="hover:bg-gray-50 transition-colors group">
                        <td class="px-6 py-4 text-sm text-gray-500">${tarihStr}</td>
                        <td class="px-6 py-4"><span class="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-1 rounded">${islem.islem_tipi}</span></td>
                        <td class="px-6 py-4 text-sm text-gray-700">${islem.aciklama || '-'}</td>
                        <td class="px-6 py-4 text-sm font-bold text-right ${renk}">${onEk}₺${parseFloat(islem.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error("Cari profil yüklenirken hata:", error);
    }
}

// --- STOK MODÜLÜ (2. HAFTA) ---

function stokModalAc() { document.getElementById('stokModal').classList.remove('hidden'); }
function stokModalKapat() { document.getElementById('stokModal').classList.add('hidden'); }

async function stoklariYukle() {
    try {
        const stoklar = await window.api.stoklariGetir();
        globalStokVerileri = stoklar; // Cache it

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
                        <button onclick="stokProfilAc(${stok.id})" class="text-indigo-600 hover:text-indigo-800 font-bold mr-3 bg-indigo-50 px-3 py-1.5 rounded-md transition hover:bg-indigo-100">İncele</button>
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

// --- STOK PROFİLİ / GEÇMİŞ İŞLEMLER ---
async function stokProfilAc(id) {
    try {
        const { stok, islemler } = await window.api.stokGetirDetay(id);
        if (!stok) return alert("Ürün bulunamadı!");

        sayfaDegistir('stok-detay', stok.urun_adi + ' Profili');

        document.getElementById('detayStokAdi').innerText = stok.urun_adi;
        document.getElementById('detayStokBarkod').innerText = stok.barkod || 'Barkod Yok';
        document.getElementById('detayStokMiktar').innerText = `${stok.stok_miktari} Adet`;

        const alisGosterim = parseFloat(stok.alis_fiyati).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        const satisGosterim = parseFloat(stok.satis_fiyati).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        document.getElementById('detayStokFiyat').innerText = `₺${alisGosterim} / ₺${satisGosterim}`;

        const detayStokMiktarEl = document.getElementById('detayStokMiktar');
        if (stok.stok_miktari <= 0) {
            detayStokMiktarEl.className = 'text-2xl font-bold mt-1 text-red-600';
        } else {
            detayStokMiktarEl.className = 'text-2xl font-bold mt-1 text-green-600';
        }

        const tabloGövdesi = document.getElementById('stokIslemListesi');
        tabloGövdesi.innerHTML = "";

        if (islemler.length === 0) {
            tabloGövdesi.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400 italic">Bu ürüne ait geçmiş bir işlem bulunmuyor.</td></tr>`;
        } else {
            islemler.forEach(islem => {
                const tarihStr = new Date(islem.tarih).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const unvanStr = islem.unvan ? islem.unvan : 'Bilinmeyen Müşteri';

                tabloGövdesi.innerHTML += `
                    <tr class="hover:bg-gray-50 transition-colors group">
                        <td class="px-6 py-4 text-sm text-gray-500">${tarihStr}</td>
                        <td class="px-6 py-4"><span class="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-1 rounded">${islem.islem_tipi}</span></td>
                        <td class="px-6 py-4 text-sm text-gray-700">${islem.aciklama || '-'} <br><span class="text-xs text-gray-500">Müşteri: ${unvanStr}</span></td>
                        <td class="px-6 py-4 text-sm font-bold text-right text-gray-800">₺${parseFloat(islem.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error("Stok profil yüklenirken hata:", error);
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

// --- FATURA / SATIŞ MODÜLÜ (3. HAFTA: LİSTE SİSTEMİ) ---

async function satisFormlariniDoldur() {
    const cariSelect = document.getElementById('satisCariSecim');
    if (!cariSelect) return;

    // Önce temizle
    cariSelect.innerHTML = '<option value="">-- Müşteri Seçin --</option>';
    stokSecenekHTML = '<option value="">-- Ürün Seçin --</option>';

    // Tüm carileri getir (Global listemizi güncel çekiyoruz)
    const cariler = await window.api.carileriGetir();
    cariler.forEach(c => {
        cariSelect.innerHTML += `<option value="${c.id}">${c.unvan} (${c.segment}) - Bakiye: ₺${c.bakiye}</option>`;
    });

    // Tüm stokları getir
    const stoklar = await window.api.stoklariGetir();
    stoklar.forEach(s => {
        // Stoğu biten ürünleri göster ama engelle veya belirt
        const stokBilgisi = s.stok_miktari > 0 ? `(Stok: ${s.stok_miktari})` : `(STOKTA YOK)`;
        stokSecenekHTML += `<option value="${s.id}" data-fiyat="${s.satis_fiyati}" data-stok="${s.stok_miktari}" data-kdv="${s.kdv_orani}" ${s.stok_miktari <= 0 ? 'disabled' : ''}>${s.urun_adi} - ₺${s.satis_fiyati} ${stokBilgisi}</option>`;
    });

    document.getElementById('faturaSatirlari').innerHTML = "";
    faturaGenelToplamHesapla();
    satirEkle(); // İlk açıldığında 1 adet boş satır ekle
}

function satirEkle() {
    const tbody = document.getElementById('faturaSatirlari');
    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-50 border-b border-gray-100 fatura-satiri";

    tr.innerHTML = `
        <td class="px-4 py-3">
            <select class="urun-secim w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm" onchange="hesaplaSatirTutar(this)">
                ${stokSecenekHTML}
            </select>
        </td>
        <td class="px-4 py-3 text-gray-500">
            <input type="number" readonly class="birim-fiyat w-full bg-transparent border-0 p-0 text-sm outline-none text-gray-500 font-mono" value="0.00">
        </td>
        <td class="px-4 py-3 font-bold">
            <input type="number" class="satir-adet w-full border border-gray-300 p-2 text-center rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value="1" min="1" onchange="hesaplaSatirTutar(this)" onkeyup="hesaplaSatirTutar(this)">
        </td>
        <td class="px-4 py-3 font-bold text-right text-indigo-600 whitespace-nowrap">
            <span class="satir-tutar-gosterim">₺0,00</span>
            <input type="hidden" class="satir-tutar-deger" value="0">
            <input type="hidden" class="satir-kdv-orani" value="0">
        </td>
        <td class="px-4 py-3 text-right">
            <button onclick="satirSil(this)" class="text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition">&times;</button>
        </td>
    `;
    tbody.appendChild(tr);
    faturaGenelToplamHesapla();
}

function satirSil(btn) {
    const satir = btn.closest('tr');
    satir.remove();
    faturaGenelToplamHesapla();
}

function hesaplaSatirTutar(element) {
    const satir = element.closest('tr');
    const select = satir.querySelector('.urun-secim');
    const adetInput = satir.querySelector('.satir-adet');
    const birimFiyatInput = satir.querySelector('.birim-fiyat');
    const tutarGosterim = satir.querySelector('.satir-tutar-gosterim');
    const tutarDeger = satir.querySelector('.satir-tutar-deger');
    const kdvDeger = satir.querySelector('.satir-kdv-orani');

    const secilenOption = select.options[select.selectedIndex];

    if (!secilenOption || !secilenOption.value) {
        birimFiyatInput.value = "0.00";
        tutarGosterim.innerText = "₺0,00";
        tutarDeger.value = "0";
        kdvDeger.value = "0";
        faturaGenelToplamHesapla();
        return;
    }

    const fiyat = parseFloat(secilenOption.getAttribute('data-fiyat')) || 0;
    const mevcutStok = parseInt(secilenOption.getAttribute('data-stok')) || 0;
    const kdv = parseFloat(secilenOption.getAttribute('data-kdv')) || 0;
    let adet = parseInt(adetInput.value) || 1;

    // Stok kontrolü (uyarı verir, düzeltir)
    if (adet > mevcutStok) {
        alert("Uyarı: Yeterli stok yok! (Mevcut: " + mevcutStok + ")");
        adet = mevcutStok;
        adetInput.value = adet;
    }

    birimFiyatInput.value = fiyat.toFixed(2);
    kdvDeger.value = kdv;

    // Tutar = (Fiyat * Adet) + KDV
    const hamTutar = fiyat * adet;
    const kdvTutari = hamTutar * (kdv / 100);
    const toplamTutar = hamTutar + kdvTutari;

    tutarGosterim.innerText = "₺" + toplamTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    tutarDeger.value = toplamTutar;

    faturaGenelToplamHesapla();
}

function faturaGenelToplamHesapla() {
    const satirlar = document.querySelectorAll('.fatura-satiri');
    let genelToplam = 0;
    let doluSatirSayisi = 0;

    satirlar.forEach(satir => {
        const urun = satir.querySelector('.urun-secim').value;
        if (urun) {
            const tutar = parseFloat(satir.querySelector('.satir-tutar-deger').value) || 0;
            genelToplam += tutar;
            doluSatirSayisi++;
        }
    });

    const genelToplamLabel = document.getElementById('genelToplamTutar');
    const sepetSayisiLabel = document.getElementById('sepetUrunSayisi');

    genelToplamLabel.innerText = "₺ " + genelToplam.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    genelToplamLabel.setAttribute('data-hesaplanan', genelToplam);
    sepetSayisiLabel.innerText = `${doluSatirSayisi} Kalem`;
}

async function satisIsleminiTamamla() {
    const cariId = document.getElementById('satisCariSecim').value;
    const vadeTarihi = document.getElementById('satisVade').value;
    const genelToplam = parseFloat(document.getElementById('genelToplamTutar').getAttribute('data-hesaplanan'));

    if (!cariId) return alert("Hata: Lütfen faturanın kesileceği Müşteriyi (Cari) seçin!");

    // Satırlardaki veriyi toplayalım
    const satirlar = document.querySelectorAll('.fatura-satiri');
    const toplananListe = [];

    satirlar.forEach(satir => {
        const select = satir.querySelector('.urun-secim');
        const secilenOption = select.options[select.selectedIndex];

        if (secilenOption && secilenOption.value) {
            toplananListe.push({
                stok_id: secilenOption.value,
                urun_adi: secilenOption.text.split(' - ')[0], // Adı ayıklayalım
                kdv_orani: parseFloat(secilenOption.getAttribute('data-kdv')) || 0,
                net_birim_fiyat: parseFloat(secilenOption.getAttribute('data-fiyat')) || 0,
                adet: parseInt(satir.querySelector('.satir-adet').value) || 1,
                tutar: parseFloat(satir.querySelector('.satir-tutar-deger').value) || 0
            });
        }
    });

    if (toplananListe.length === 0) return alert("Hata: Faturada en az bir geçerli ürün seçili olmalıdır.");

    const faturaPaketi = {
        cari_id: cariId,
        vade_tarihi: vadeTarihi || null,
        genel_toplam: genelToplam,
        sepet_icerik: toplananListe // Backend tarafı 'sepet_icerik' ismi bekliyordu
    };

    try {
        const sonuc = await window.api.satisYap(faturaPaketi);
        if (sonuc.success) {
            alert(`Fatura başarıyla kaydedildi! (${sonuc.islemSayisi} adet kalem işlendi.)`);

            document.getElementById('satisCariSecim').value = "";
            document.getElementById('satisVade').value = "";

            // Güncel verileri tazele (bu aynı zamanda tabloyu temizleyip 1 satırla başlatacak)
            carileriYukle();
            stoklariYukle();
            satisFormlariniDoldur();
            dashboardYukle(); // Satış yapıldı, kasa ve grafik güncellenmeli!
        }
    } catch (error) {
        alert("Satış işleminde hata oluştu!\n(Veritabanı işlemleri geri alındı)\n\n" + error);
        console.error(error);
    }
}