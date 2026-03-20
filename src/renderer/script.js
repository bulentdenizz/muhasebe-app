let translations = {};
let currentLang = localStorage.getItem('appLang') || 'tr';

window.onload = async () => {
    await initLanguage();
    dashboardYukle();
    carileriYukle();
    stoklariYukle();
    satisFormlariniDoldur();
};

async function initLanguage() {
    await loadLanguage(currentLang);
}

async function loadLanguage(lang) {
    try {
        const response = await fetch(`locales/${lang}.json`);
        translations = await response.json();
        currentLang = lang;
        localStorage.setItem('appLang', lang);
        applyTranslations();
    } catch (error) {
        console.error("Language load error:", error);
    }
}

function applyTranslations() {
    // data-i18n olan tüm elementleri çevir
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            // Eğer elementin içinde sadece metin varsa veya span varsa
            // Bazı elementlerin içinde SVG olabilir, onları korumak lazım
            const span = el.querySelector('span');
            if (span) {
                span.innerText = translations[key];
            } else if (el.children.length === 0) {
                el.innerText = translations[key];
            }
        }
    });

    // placeholder çevirisi
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[key]) {
            el.placeholder = translations[key];
        }
    });
}

function changeLanguage(lang) {
    loadLanguage(lang);
}

// Çeviri yardımcı fonksiyonu (JS içindeki metinler için)
function t(key) {
    return translations[key] || key;
}

// Global Data Storage for easy price calculation
let globalStokVerileri = [];
let globalCariVerileri = [];
let stokSecenekHTML = '<option value="">-- Ürün Seçin --</option>'; // Kalem selectlerini doldurmak için cache
let dashboardChartIstance = null; // Grafik referansı

async function dashboardYukle() {
    try {
        const data = await window.api.getDashboardData();

        // 1. Text Metrikleri Güncelle
        document.getElementById('metric-kasa').innerText = (currentLang === 'tr' ? "₺ " : "$ ") + parseFloat(data.toplamKasa).toLocaleString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2 });
        document.getElementById('metric-alacak').innerText = (currentLang === 'tr' ? "₺ " : "$ ") + parseFloat(data.gelecekOdemeler).toLocaleString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2 });
        document.getElementById('metric-borc').innerText = (currentLang === 'tr' ? "₺ " : "$ ") + parseFloat(data.gecikenBorclar).toLocaleString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2 });

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
                    label: t('total_sales') + (currentLang === 'tr' ? ' (₺)' : ' ($)'),
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
                                return (currentLang === 'tr' ? '₺' : '$') + value.toLocaleString(currentLang === 'tr' ? 'tr-TR' : 'en-US');
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

            const displaySegment = t('segment_' + (cari.segment || 'Standard').toLowerCase());

            const satir = `
                <tr class="hover:bg-gray-50 border-b border-gray-200 transition">
                    <td class="p-4 font-medium text-gray-800">${cari.unvan}</td>
                    <td class="p-4 text-gray-600">${cari.telefon || '-'}</td>
                    <td class="p-4"><span class="px-2.5 py-1 text-xs font-semibold rounded-md ${segmentClass}">${segmentIcon}${displaySegment}</span></td>
                    <td class="p-4 font-bold ${cari.bakiye >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${currentLang === 'tr' ? '₺' : '$'} ${parseFloat(cari.bakiye).toLocaleString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td class="p-4"><span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">${t(cari.durum.toLowerCase())}</span></td>
                    <td class="p-4 text-right whitespace-nowrap">
                        <button onclick="cariProfilAc(${cari.id})" class="text-indigo-600 hover:text-indigo-800 font-bold mr-3 bg-indigo-50 px-3 py-1.5 rounded-md transition hover:bg-indigo-100">${t('examine')}</button>
                        <button onclick="cariSil(${cari.id})" class="text-gray-400 hover:text-red-600 font-medium transition px-2">${t('delete')}</button>
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
function modalAc() {
    document.getElementById('cariModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('unvan').focus(), 100);
}
function modalKapat() { document.getElementById('cariModal').classList.add('hidden'); }

function sayfaDegistir(sayfaId, baslikKey) {
    document.querySelectorAll('section').forEach(section => section.classList.add('hidden'));
    document.getElementById('section-' + sayfaId).classList.remove('hidden');
    document.getElementById('pageTitle').innerText = t(sayfaId);
}

async function cariKaydet() {
    const unvanKutusu = document.getElementById('unvan');
    const telefonKutusu = document.getElementById('phone');
    const bakiyeKutusu = document.getElementById('balance');
    const segmentKutusu = document.getElementById('segment');

    if (!unvanKutusu.value) return alert(t('enter_title_error'));

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
            alert(t('success_customer'));
            modalKapat();
            carileriYukle(); // Sayfayı yenilemek yerine listeyi tazele
            dashboardYukle(); // Dashboard metrikleri (bekleyen ödemeler vs. değişebilir)
        }
    } catch (error) {
        console.error("Hata:", error);
    }
}

async function cariSil(id) {
    if (confirm(t('confirm_delete'))) {
        try {
            const sonuc = await window.api.cariSil(id);
            if (sonuc.changes > 0) {
                alert(t('record_deleted'));
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
        sayfaDegistir('cari-detay', cari.unvan + ' ' + t('profile'));

        // Üst Kısım Bilgileri
        document.getElementById('islem_cari_id').value = cari.id; // Fiş modalı için ID'yi saklıyoruz
        document.getElementById('detayUnvan').innerText = cari.unvan;
        document.getElementById('detaySegmentTag').innerText = t('segment_' + (cari.segment || 'Standard').toLowerCase());
        document.getElementById('detayBakiye').innerText = `${currentLang === 'tr' ? '₺' : '$'} ${parseFloat(cari.bakiye).toLocaleString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2 })}`;

        // İşlem İstatistikleri
        document.getElementById('detayIslemSayisi').innerText = islemler.length;
        document.getElementById('detaySonIslem').innerText = islemler.length > 0 ? (new Date(islemler[0].tarih)).toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US') : '-';

        // Segment renk sınıfı
        const tagBox = document.getElementById('detaySegmentTag');
        tagBox.innerText = t('segment_' + (cari.segment || 'standard').toLowerCase() + '_tag');
        tagBox.className = 'inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded border ';
        if (cari.segment === 'VIP') tagBox.className += 'bg-purple-100 text-purple-800 border-purple-400';
        else if (cari.segment === 'Riskli') tagBox.className += 'bg-red-100 text-red-800 border-red-400';
        else tagBox.className += 'bg-blue-100 text-blue-800 border-blue-400'; // Standart/Toptancı

        // İşlem Listesi Tablosu
        const tabloGövdesi = document.getElementById('islemListesi');
        tabloGövdesi.innerHTML = "";

        if (islemler.length === 0) {
            tabloGövdesi.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400 italic">${t('no_transaction_history')}</td></tr>`;
        } else {
            islemler.forEach(islem => {
                const tarihStr = new Date(islem.tarih).toLocaleString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                // Satış/Tahsilat yeşil, Alış/Ödeme kırmızı mantığı (örnektir)
                const renk = (islem.islem_tipi === 'Satış' || islem.islem_tipi === 'Tahsilat') ? 'text-green-600' : 'text-red-600';
                const onEk = (islem.islem_tipi === 'Satış' || islem.islem_tipi === 'Tahsilat') ? '+' : '-';

                tabloGövdesi.innerHTML += `
                    <tr class="hover:bg-gray-50 transition-colors group">
                        <td class="px-6 py-4 text-sm text-gray-500">${tarihStr}</td>
                        <td class="px-6 py-4"><span class="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-1 rounded">${t(islem.islem_tipi.toLowerCase()) || islem.islem_tipi}</span></td>
                        <td class="px-6 py-4 text-sm text-gray-700">${islem.aciklama || '-'}</td>
                        <td class="px-6 py-4 text-sm font-bold text-right ${renk}">${onEk}${currentLang === 'tr' ? '₺' : '$'}${parseFloat(islem.tutar).toLocaleString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error("Cari profil yüklenirken hata:", error);
    }
}

function islemModalAc(cariId) {
    if (!cariId) return;
    document.getElementById('islem_cari_id').value = cariId;
    document.getElementById('islem_tutar').value = '';
    document.getElementById('islem_aciklama').value = '';
    document.getElementById('islemModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('islem_tutar').focus(), 100);
}

function islemModalKapat() {
    document.getElementById('islemModal').classList.add('hidden');
}

async function islemKaydet() {
    const cariId = document.getElementById('islem_cari_id').value;
    const islemTipi = document.getElementById('islem_tipi').value;
    const tutar = parseFloat(document.getElementById('islem_tutar').value) || 0;
    const aciklama = document.getElementById('islem_aciklama').value;

    if (!cariId) return alert(t('cari_id_error'));
    if (tutar <= 0) return alert(t('tutar_error'));

    const veri = {
        cari_id: cariId,
        islem_tipi: islemTipi,
        tutar: tutar,
        aciklama: aciklama
    };

    try {
        const sonuc = await window.api.islemEkle(veri);
        if (sonuc.success) {
            alert(t('transaction_success'));
            islemModalKapat();

            // Ekranları tazeliyoruz
            cariProfilAc(cariId); // Mevcut profili yenile
            carileriYukle(); // Genel cari listeyi arka planda yenile
            dashboardYukle(); // Kasa/Bakiye özetleri değişmiş olabilir
        } else {
            alert(t('transaction_error'));
        }
    } catch (error) {
        console.error("İşlem kaydetme hatası:", error);
        alert(t('transaction_error') + ":\n" + error);
    }
}

// --- STOK MODÜLÜ (2. HAFTA) ---

function stokModalAc(stokId = null) {
    const adKutu = document.getElementById('urun_adi');
    const barkodKutu = document.getElementById('barkod');
    const alisKutu = document.getElementById('alis_fiyati');
    const satisKutu = document.getElementById('satis_fiyati');
    const kdvKutu = document.getElementById('kdv_orani');
    const stokKutu = document.getElementById('stok_miktari');
    const baslik = document.getElementById('stokModalBaslik');
    const submitBtn = document.getElementById('stokKaydetBtn');

    if (stokId) {
        const stok = globalStokVerileri.find(s => s.id === stokId);
        if (!stok) return;

        document.getElementById('edit_stok_id').value = stok.id;
        adKutu.value = stok.urun_adi;
        barkodKutu.value = stok.barkod || '';
        alisKutu.value = stok.alis_fiyati;
        satisKutu.value = stok.satis_fiyati;
        kdvKutu.value = stok.kdv_orani;
        stokKutu.value = stok.stok_miktari;

        baslik.innerText = t('edit_product');
        submitBtn.innerText = t('update');
        submitBtn.setAttribute('onclick', 'stokGuncelle()');
    } else {
        document.getElementById('edit_stok_id').value = "";
        adKutu.value = "";
        barkodKutu.value = "";
        alisKutu.value = "0";
        satisKutu.value = "0";
        stokKutu.value = "0";
        kdvKutu.value = "20";

        baslik.innerText = t('new_product');
        submitBtn.innerText = t('save_product');
        submitBtn.setAttribute('onclick', 'stokKaydet()');
    }

    document.getElementById('stokModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('urun_adi').focus(), 100);
}
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
                    <td class="p-4 font-bold text-blue-600">${stok.stok_miktari} ${t('quantity_unit')}</td>
                    <td class="p-4">
                        <span class="text-sm text-gray-500 line-through">${currentLang === 'tr' ? '₺' : '$'}${alisStr}</span><br>
                        <span class="font-bold text-green-600">${currentLang === 'tr' ? '₺' : '$'}${satisStr}</span>
                    </td>
                    <td class="p-4"><span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">%${stok.kdv_orani}</span></td>
                    <td class="p-4 text-right">
                        <button onclick="stokProfilAc(${stok.id})" class="text-indigo-600 hover:text-indigo-800 font-bold mr-3 bg-indigo-50 px-3 py-1.5 rounded-md transition hover:bg-indigo-100">${t('examine')}</button>
                        <button onclick="stokModalAc(${stok.id})" class="text-blue-600 hover:text-blue-800 font-medium mr-3">${t('edit')}</button>
                        <button onclick="stokSil(${stok.id})" class="text-red-600 hover:text-red-800 font-medium">${t('delete')}</button>
                    </td>
                </tr>
            `;
            tabloGövdesi.innerHTML += satir;
        });
    } catch (error) {
        console.error("Stok Listeleme hatası:", error);
    }
}

async function stokGuncelle() {
    const editId = document.getElementById('edit_stok_id').value;
    const adKutu = document.getElementById('urun_adi');
    const barkodKutu = document.getElementById('barkod');
    const alisKutu = document.getElementById('alis_fiyati');
    const satisKutu = document.getElementById('satis_fiyati');
    const kdvKutu = document.getElementById('kdv_orani');
    const stokKutu = document.getElementById('stok_miktari');

    if (!adKutu.value) return alert(t('enter_product_name_error'));

    const veri = {
        id: editId,
        urun_adi: adKutu.value,
        barkod: barkodKutu.value,
        alis_fiyati: parseFloat(alisKutu.value) || 0,
        satis_fiyati: parseFloat(satisKutu.value) || 0,
        kdv_orani: parseInt(kdvKutu.value) || 20,
        stok_miktari: parseInt(stokKutu.value) || 0
    };

    try {
        const sonuc = await window.api.stokGuncelle(veri);
        if (sonuc.changes > 0) {
            alert(t('product_update_success'));
            stokModalKapat();
            stoklariYukle();
        }
    } catch (error) {
        console.error("Stok Güncelleme Hatası:", error);
    }
}

async function stokKaydet() {
    const adKutu = document.getElementById('urun_adi');
    const barkodKutu = document.getElementById('barkod');
    const alisKutu = document.getElementById('alis_fiyati');
    const satisKutu = document.getElementById('satis_fiyati');
    const kdvKutu = document.getElementById('kdv_orani');
    const stokKutu = document.getElementById('stok_miktari');

    if (!adKutu.value) return alert(t('enter_product_name_error'));

    const veri = {
        urun_adi: adKutu.value,
        barkod: barkodKutu.value,
        alis_fiyati: parseFloat(alisKutu.value) || 0,
        satis_fiyati: parseFloat(satisKutu.value) || 0,
        kdv_orani: parseInt(kdvKutu.value) || 20,
        stok_miktari: parseInt(stokKutu.value) || 0
    };

    try {
        const sonuc = await window.api.stokEkle(veri);
        if (sonuc.changes > 0) {
            alert(t('product_success'));
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
    if (confirm(t('confirm_delete_product'))) {
        try {
            const sonuc = await window.api.stokSil(id);
            if (sonuc.changes > 0) {
                alert(t('product_deleted'));
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
            tabloGövdesi.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400 italic">${t('no_product_moves')}</td></tr>`;
        } else {
            islemler.forEach(islem => {
                const tarihStr = new Date(islem.tarih).toLocaleString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const unvanStr = islem.unvan ? islem.unvan : t('unknown_customer');

                tabloGövdesi.innerHTML += `
                    <tr class="hover:bg-gray-50 transition-colors group">
                        <td class="px-6 py-4 text-sm text-gray-500">${tarihStr}</td>
                        <td class="px-6 py-4"><span class="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-1 rounded">${t(islem.islem_tipi.toLowerCase()) || islem.islem_tipi}</span></td>
                        <td class="px-6 py-4 text-sm text-gray-700">${islem.aciklama || '-'} <br><span class="text-xs text-gray-500">${t('customer')}: ${unvanStr}</span></td>
                        <td class="px-6 py-4 text-sm font-bold text-right text-gray-800">${currentLang === 'tr' ? '₺' : '$'}${parseFloat(islem.tutar).toLocaleString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2 })}</td>
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
    cariSelect.innerHTML = `<option value="">-- ${t('select_customer')} --</option>`;
    stokSecenekHTML = `<option value="">-- ${t('select_product')} --</option>`;

    // Tüm carileri getir (Global listemizi güncel çekiyoruz)
    const cariler = await window.api.carileriGetir();
    cariler.forEach(c => {
        cariSelect.innerHTML += `<option value="${c.id}">${c.unvan} (${c.segment}) - Bakiye: ₺${c.bakiye}</option>`;
    });

    // Tüm stokları getir
    const stoklar = await window.api.stoklariGetir();
    stoklar.forEach(s => {
        // Stoğu biten ürünleri göster ama engelle veya belirt
        const stokBilgisi = s.stok_miktari > 0 ? `(${t('stock')}: ${s.stok_miktari})` : `(${t('out_of_stock')})`;
        stokSecenekHTML += `<option value="${s.id}" data-fiyat="${s.satis_fiyati}" data-stok="${s.stok_miktari}" data-kdv="${s.kdv_orani}" ${s.stok_miktari <= 0 ? 'disabled' : ''}>${s.urun_adi} - ${currentLang === 'tr' ? '₺' : '$'}${s.satis_fiyati} ${stokBilgisi}</option>`;
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
            <input type="number" step="0.01" class="birim-fiyat w-full border border-gray-300 p-2 text-right rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-700 font-bold" value="0.00" onchange="hesaplaSatirTutar(this, true)" onkeyup="hesaplaSatirTutar(this, true)">
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

function hesaplaSatirTutar(element, fiyatManuelDegisti = false) {
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

    // Fiyat manuel değiştirilmediyse listedeki varsayılan fiyatı al
    let fiyat = parseFloat(birimFiyatInput.value) || 0;
    if (!fiyatManuelDegisti) {
        fiyat = parseFloat(secilenOption.getAttribute('data-fiyat')) || 0;
        birimFiyatInput.value = fiyat.toFixed(2);
    }

    const mevcutStok = parseInt(secilenOption.getAttribute('data-stok')) || 0;
    const kdv = parseFloat(secilenOption.getAttribute('data-kdv')) || 0;
    let adet = parseInt(adetInput.value) || 1;

    // Stok kontrolü (uyarı verir, düzeltir)
    if (adet > mevcutStok) {
        alert(t('no_stock_warning') + " (" + t('current') + ": " + mevcutStok + ")");
        adet = mevcutStok;
        adetInput.value = adet;
    }

    birimFiyatInput.value = fiyat; // Manuel girildiği için toFixed'i kaldırırız ki kullanıcı sildikçe bozulmasın, string olarak kalır
    kdvDeger.value = kdv;

    // Tutar = (Fiyat * Adet) + KDV
    const hamTutar = fiyat * adet;
    const kdvTutari = hamTutar * (kdv / 100);
    const toplamTutar = hamTutar + kdvTutari;

    tutarGosterim.innerText = (currentLang === 'tr' ? "₺" : "$") + toplamTutar.toLocaleString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    genelToplamLabel.innerText = (currentLang === 'tr' ? "₺ " : "$ ") + genelToplam.toLocaleString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    genelToplamLabel.setAttribute('data-hesaplanan', genelToplam);
    sepetSayisiLabel.innerText = `${doluSatirSayisi} ${t('item_count')}`;
}

// Yeni Vade Tarihi Hesaplama Fonksiyonu
function vadeEkle(gunSayisi) {
    const vadeInput = document.getElementById('satisVade');
    const bugun = new Date();
    bugun.setDate(bugun.getDate() + gunSayisi);

    // API beklenen formatını yyyy-mm-dd elde edelim
    const yil = bugun.getFullYear();
    const ay = String(bugun.getMonth() + 1).padStart(2, '0');
    const gun = String(bugun.getDate()).padStart(2, '0');

    vadeInput.value = `${yil}-${ay}-${gun}`;
}

async function satisIsleminiTamamla() {
    const cariId = document.getElementById('satisCariSecim').value;
    const vadeTarihi = document.getElementById('satisVade').value;
    const genelToplam = parseFloat(document.getElementById('genelToplamTutar').getAttribute('data-hesaplanan'));

    if (!cariId) return alert(t('select_customer_error'));

    // Satırlardaki veriyi toplayalım
    const satirlar = document.querySelectorAll('.fatura-satiri');
    const toplananListe = [];

    satirlar.forEach(satir => {
        const select = satir.querySelector('.urun-secim');
        const secilenOption = select.options[select.selectedIndex];

        if (secilenOption && secilenOption.value) {
            const girilenFiyat = parseFloat(satir.querySelector('.birim-fiyat').value) || 0;
            toplananListe.push({
                stok_id: secilenOption.value,
                urun_adi: secilenOption.text.split(' - ')[0], // Adı ayıklayalım
                kdv_orani: parseFloat(secilenOption.getAttribute('data-kdv')) || 0,
                net_birim_fiyat: girilenFiyat, // Artık manuel girilen fiyatı alıyoruz
                adet: parseInt(satir.querySelector('.satir-adet').value) || 1,
                tutar: parseFloat(satir.querySelector('.satir-tutar-deger').value) || 0
            });
        }
    });

    if (toplananListe.length === 0) return alert(t('invoice_error_empty'));

    const faturaPaketi = {
        cari_id: cariId,
        vade_tarihi: vadeTarihi || null,
        genel_toplam: genelToplam,
        sepet_icerik: toplananListe // Backend tarafı 'sepet_icerik' ismi bekliyordu
    };

    try {
        const sonuc = await window.api.satisYap(faturaPaketi);
        if (sonuc.success) {
            alert(t('invoice_success') + ` (${sonuc.islemSayisi} ${t('item_count')})`);

            document.getElementById('satisCariSecim').value = "";
            document.getElementById('satisVade').value = "";

            // Güncel verileri tazele (bu aynı zamanda tabloyu temizleyip 1 satırla başlatacak)
            carileriYukle();
            stoklariYukle();
            satisFormlariniDoldur();
            dashboardYukle(); // Satış yapıldı, kasa ve grafik güncellenmeli!
        }
    } catch (error) {
        alert(t('invoice_error') + "\n\n" + error);
        console.error(error);
    }
}