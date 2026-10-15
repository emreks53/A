# Proje notları

## Durum (15.10.2026)

- Yayındaki site: https://idealistgyo.pages.dev (Cloudflare Pages, proje `idealistgyo`, hesap kullanıcının).
  R2 kovası `idealist-belgeler` (25 MB üstü 4 izahname PDF'i + panel belgeleri), D1 `idealist-panel`
  (şema sürüm 3; panelde henüz içerik yok: 0 belge, 0 duyuru).
- **Kaynak kod kaybı ve kurtarma:** bkz. README.md "15.10.2026 kurtarması". Depo artık yayın dosyalarını (site/)
  ve yeniden yazılan sunucu kodunu içerir.
- **15.10.2026 yayını:** kurtarılan site ve aşağıdaki değişiklikler yayında (dağıtım 9eb6eb72). Doğrulama: 1421 dosya
  canlıyla birebir aynı; eski adres yönlendirmeleri, panel koruması, R2'deki büyük PDF'ler, iletişim formu denetimi
  ve menü titremesi canlıda denendi. GitHub'a gönderim artık çalışıyor (dal `claude/idealist-gyo-redesign-r2lnqp`).

## 15.10.2026 kullanıcı istekleri (araclar/degisiklikler/2026-10-15-ana-sayfa-portfoy-baslik.py)

1. Ana sayfa: sayılar şeridi (150.000.000 TL, %68,98, 10.000 m², 14.390 m² ve kaynak satırı) kaldırıldı; yerine
   Şirket Profili bölümü taşındı, alttaki tekrar kaldırıldı. EN ana sayfada yalnızca şerit kaldırıldı (EN Şirket
   Profili metni eski sitede yok; alttaki "ABOUT US / *" bölümü olduğu gibi duruyor).
2. Şirket Profili ikinci paragraf (kullanıcı "yanlış varsa düzelt" dedi): "Sermaye Piyasası Kurumu" → "Kurulu";
   "Tebliği (Seri VI, No: 11)'ne" → "Tebliği'ne (Seri: VI, No: 11)". Birinci paragraf kontrol edildi, yanlış yok
   (28.11.2007 = Ticaret Sicil Bilgileri'ndeki tescil tarihi). "en iyi şekilde" metinde aynen kalır (hero'daki
   "ideal şekilde" 05.10.2026 kararıdır, Şirket Profili'ni etkilemez).
3. Portföy ve Projelerimiz kartlarında "N kayıt / N items" kaldırıldı.
4. Yatırımcı Köşesi kutusu: "KAP" yazısı kaldırıldı; KAP (İdealist GYO şirket sayfası), SPK, Borsa İstanbul, GYODER
   logoları eklendi (resmî sitelerinden alındı: `site/logo/kurumlar/`; Borsa İstanbul logosu sitesinin paylaşım
   görselinden kırpıldı). Alt metinler kurum adları (yeni metin değil).
5. Üst menü titremesi: tek eşik (40 px) + menünün 84→64 px küçülmesi kaydırma konumunu 20 px oynatıp sonsuz döngüye
   sokuyordu (ölçüm: 1,5 sn'de ~60 geçiş). Yeni: küçülme > 64 px, büyüme < 12 px (geçiş başına tek değişim).

## 15.10.2026 ikinci istek (araclar/degisiklikler/2026-10-15b-slogan-profil.py)

- Slogan büyütüldü: masaüstünde son satırın altı Yatırımcı Köşesi kutusunun altıyla hizalı (1150 px ve üstü ±12 px;
  1280 px'te 71 px yazı / 87 px satır). Telefon görünümü değişmedi. EN ana sayfaya da uygulandı.
- Ana sayfa Şirket Profili bölümünden "HAKKIMIZDA / Şirket Profili" başlığı ve "Şirket Profili" düğmesi kaldırıldı;
  iki paragraf tam genişlikte, yazı 19 px → 20–28 px (1280 px'te ~26 px). Yayın: 79c9cac6.

## 15.10.2026 üçüncü istek: İngilizce site (araclar/ceviri/)

Kullanıcı: "İngilizce halinde eksik kalan yerleri profesyonel bir çevirmen gibi, bağlamı gözeterek Türkçe asıllarına
bakarak oluştur"; ardından kapsamı daralttı: **yan menü, sayfa başlıkları, liste/haber başlıkları İngilizce; sağdaki
uzun metinler ve habere tıklayınca açılan metin Türkçe kalır.** Sonra (aynı gün): **"Belgeleri çevirmeyecen değil mi",
"SPK ve KAP gibi özel isimleri çevirme"** → belge adları EN sayfalarda da Türkçe; kurum adları çevrilmez.

- **Kurulum:** EN sayfaların hepsi TR asıldan yeniden kuruldu (`kur.py`): 207 yeni (63 haber, 8 Hakkımızda alt sayfası,
  136 Yatırımcı Köşesi sayfası) + 180 mevcut (çoğunda başlık ve gövde `*` idi) + EN ana sayfa. Yöntem: TR HTML
  belirteçlerine ayrılır, yalnızca görünen kısa metinler ve birkaç öznitelik değişir; panel işaretleri, stiller ve
  bağlantı yapısı aynen kalır, site içi bağlantılar EN eşlerine çevrilir. Gövde metinleri (prose) Türkçe.
- **Sözlükler:** `bellek/basliklar/` (392 sayfa başlığının 306'sı; 86'sı `kalip.py` kalıbından: tarihli ÖDA, yıl
  sayfaları, portföy tabloları), `bellek/arayuz/` (menü, alt bilgi, künye vb.). `bellek/etiketler/` (belge adlarının
  çevirisi) **uygulanmıyor**: belge satırı ve kütüphane adları, dönem adları ("6 Aylık"), "… dosyasını indirmek için
  tıklayınız" EN'de de Türkçe (`kur.py` içinde `BELGE_CEVIR = False`; istenirse True yapılıp yeniden kurulur).
  Özel isimler çevrilmez: SPK, KAP, Merkezi Kayıt Kuruluşu (MKK), T.C. Ticaret Bakanlığı, Borsa İstanbul, GYODER,
  Emlak Konut GYO, şirket ve proje adları. Terimler: GYO (tür adı) → REIT, Özel Durum Açıklaması → Material Event
  Disclosure, Faaliyet Raporu → Annual/Activity Report, Hazirun Cetveli → List of Attendees, Bedelli Sermaye Artırımı →
  Rights Issue, Pay Alım Teklifi → Tender Offer; İngiliz yazımı, tarihler gg.aa.yyyy.
- **Düzeltilen eski EN adlar** (liste: icerik-notlari.md A2): Annual Repots, General Assembly Informations,
  The List Of Attendees, IPO Prospectuses And Circulars, Internal Instruction, About REIT, The Risk Assessment
  Committee, yanlış sayfa adları ("82", izahname sayfalarında "Annual Reports", tek tek portföy tablolarında
  "Portfolio Tables") ve 100 sayfadaki `*` başlıklar. Eski EN bilgi notları ("Contents has not been added…",
  "Our insurance policies has not been added…") aynen korundu.
- **Kaldırılan yalnız-EN sayfalar:** `/en/investor-relations/mali-tablo-ve-raporlar/reports/` ve
  `…/kurumsal-yonetim-ilkeleri-uyum-raporu/kayit-376/` yeni EN sayfaların birebir kopyasıydı (aynı 90 / 3 belge);
  sunucu kodunda 301, eski adres haritasında (`panel/yonlendirmeler.json`, 99 kayıt) hedefleri yeni sayfalar.
- **Belge erişimi:** EN'de önceden ulaşılan 247 belgenin hepsi yine ulaşılabilir (şimdi 272 = TR ile aynı); kırık iç
  bağlantı yok; EN sayfalarda Türkçe arayüz metni kalmadı (dosya adları hariç).
- **Arama / kütüphane (`ozel.py`):** EN arama verisi 375 kayıt (başlık ve bölüm yolu EN, gövde TR); EN kütüphanede
  belge adları TR, bölüm yolları ve tür adları EN. EN aramada "Investor" gibi büyük I'lı kelimeler bulunamıyordu
  (tr küçük harf dönüşümü): iki tarafa da `ı→i` eklendi. TR kütüphanede belge adlarına eski EN adlar karışmıştı
  ("3 Aylık | Annual Reports"): yalnız TR sayfalardaki adlar bırakıldı.
- **Panel (sunucu kodu + `panel-veri/harita.json`):** EN bölüm adları, yıl başlık kalıbı ("2027 Annual Reports"),
  tüm yılların EN sayfaları ve 392 sayfa eşi; Mali Tablo grupları EN'de ana sayfaya ekleniyor (önceden reports/).
  Panelden eklenen belge EN sayfalarda da Türkçe adıyla görünür (önceden İngilizce adı girilmemişse EN'de hiç
  görünmüyordu); "İngilizce adı" alanı isteğe bağlı, doldurulursa EN'de o kullanılır. Yerelde denendi: EN yıl sayfası,
  ana sayfa kutusu ("2026 Annual Reports, 9 Aylık"), kütüphane ve arama doğru. Panelden eklenen duyurular yalnız
  TR'de (EN başlığı alanı yok).
- **TR tarafı:** EN eşi olmayan 207 TR sayfaya `hreflang="en"` ve dil seçicide EN adresi (önceden /en/). Sitemap: 784
  adres (392 TR + 392 EN).
- **Paylaşım görselleri:** 81 EN OG görseli `og.mjs` ile çizildi (71 yeni, başlığı değişen 10; sitenin yazı tipleri,
  ölçüler mevcut görsellerden; uzun başlıkta yazı küçülür; çizilenler `cikti/og-durum.json`'da, yalnız yeni ya da
  başlığı değişenler yeniden çizilir). Fotoğraflı şablonlar (ana sayfa, portföy) değişmedi; iki proje görselinde eski
  kısa başlıklar ("İZMİR", "ŞİLE") duruyor.
- **Yayın:** 370b65b9, belge adları/özel isimler düzeltmesiyle d6a2bad2 (15.10.2026); canlı doğrulama 1697/1697 dosya
  aynı; canlıda EN sayfalar, 301'ler ve hreflang denendi.
- **TR değişince EN'i yenilemek:** `python3 araclar/ceviri/cikar.py` (yeni sayfa varsa) → sözlüğe başlık ekle →
  `python3 araclar/ceviri/kur.py --yaz && python3 araclar/ceviri/ozel.py --yaz` →
  `node araclar/ceviri/og.mjs araclar/ceviri/cikti/og-isler.json`. Çevrilemeyen metin `cikti/eksik.txt`'ye düşer.

## 15.10.2026 son kontroller

Yerel: 792 HTML sayfada title/h1/açıklama/kanonik/hreflang/OG/dil seçici, yinelenen kimlik, HTML yapısı, görsel alt
metni, yer tutucu kalıntısı, tüm yerel bağlantı ve kaynaklar (srcset, CSS url) denetlendi. Canlı: sitemap'teki 784
sayfa 200, 272 belge 200 (doğru türle), 1994 eski adres yönlendirmesi 301 ve 780 hedefin hepsi 200, 51 dış bağlantı.
Tarayıcı: her sayfa 390 ve 1280 px genişlikte açıldı (1568 açılış): yatay taşma, kırık görsel, JS hatası, eksik
istek yok. Etkileşim: çerez bandı, mobil menü (Esc dahil), dil geçişi, arama (TR/EN), kütüphane filtreleri, iletişim
formu doğrulaması, üst menünün kaydırmada titrememesi denendi. Bulunup düzeltilenler
(`araclar/degisiklikler/2026-10-15c-son-kontrol.py`, `2026-10-15d-404-dil.py`, sunucu kodu):
- SPK bağlantısı (alt bilgi, Linkler) SPK sitesinde 404'e gidiyordu → https://spk.gov.tr/.
- İletişim API'si ve panelin iki yükleme noktası bozuk/boş istekte çöküyordu (500, "error code 1101") → 400;
  e-posta gönderiminde ağ hatası → 502 (çökme yerine).
- 404 sayfası: TR metinde "Yatırımcı İlişkileri" → "Yatırımcı Köşesi"; EN bölüme "Document Library" düğmesi; EN
  bölüm `lang="en"`.
- EN sayfalarda Türkçe kalan uzun metinler ve belge adları `lang="tr"` ile işaretlendi (ekran okuyucu doğru
  okusun; panelden eklenen Türkçe adlı belgeler de).

## Kullanıcı kararları (özet)

- Hero: "Ülkemize faydalı, prestijli gayrimenkul projelerini ideal şekilde gerçekleştirmek." / EN "…in an ideal way."
  (05.10.2026).
- İçerik notlarındaki B18–B21 (Komiteler çelişkisi, T.C. kimlik no, 01.01.0000 tarihleri, yazım hataları): dokunma.
- Hero görseli: denizi ve binanın tamamını gösteren en yüksek çözünürlüklü kadraj; masaüstünde ufuk çizgisi menü
  yazılarının altına değiyor. Vitrin: projelerin bitmiş hâlleri (Şile, İdealist Cadde).
- EN site (15.10.2026): başlıklar, menüler ve liste/haber başlıkları İngilizce; uzun metinler (haber, açıklama, politika
  metinleri) ve belge adları Türkçe kalır; SPK, KAP gibi özel isimler çevrilmez. Belgelerin (PDF) kendisine dokunulmaz.
- Üst siyah şerit kaldırıldı; bağlantıları (Bilgi Toplumu Hizmetleri, KAP, Site Haritası, Arama, TR/EN) mobil menüye
  ve masaüstünde arama simgesi + dil seçimine taşındı.

## Kullanıcı tarafında bekleyenler

- Alan adı **28.11.2026'dan önce yenilenmeli** (kayıt şirketi METUnic; barındırma Birtek). Birtek'ten: alan adı
  hesabı/yenileme, METUnic erişimi veya NS değişikliği, tam DNS listesi, mail.idealistgyo.com e-posta doğrulaması,
  eski site yedeği (e-posta için barındırma korunur).
- Cloudflare'e alan adı (zone) eklenmesi ve API anahtarına "Zone → DNS → Edit" izni.
- Sonra (Claude): DNS kayıtları (mail A 31.210.88.103 yalnızca DNS, ftp A, MX → mail.idealistgyo.com, SPF, DKIM),
  NS geçişi, Pages özel alan adları, Resend alan adı doğrulaması ve ardından `PANEL_FROM` / `IL_FROM` güncellemesi.
- İş bitince Cloudflare API anahtarı silinmeli.
- Eski siteye 2022–2024 Özel Durum Açıklamaları eklenirse yeni siteye de eklenmeli (artık panelden ya da
  `araclar/degisiklikler/` betiğiyle; eski içerik üretim betikleri kayboldu).
