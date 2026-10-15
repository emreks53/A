# Proje notları

## Durum (15.10.2026)

- Yayındaki site: https://idealistgyo.pages.dev (Cloudflare Pages, proje `idealistgyo`, hesap kullanıcının).
  R2 kovası `idealist-belgeler` (25 MB üstü 4 izahname PDF'i + panel belgeleri), D1 `idealist-panel`
  (şema sürüm 3; panelde henüz içerik yok: 0 belge, 0 duyuru).
- **Kaynak kod kaybı ve kurtarma:** bkz. README.md "15.10.2026 kurtarması". Depo artık yayın dosyalarını (site/)
  ve yeniden yazılan sunucu kodunu içerir.
- **15.10.2026 yayını:** kurtarılan site ve aşağıdaki değişiklikler yayında (dağıtım 9eb6eb72). Doğrulama: 1421 dosya
  canlıyla birebir aynı; eski adres yönlendirmeleri, panel koruması, R2'deki büyük PDF'ler, iletişim formu denetimi
  ve menü titremesi canlıda denendi. GitHub'a gönderim hâlâ 403 (Claude GitHub uygulamasının yazma izni gerekiyor).

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

## Kullanıcı kararları (özet)

- Hero: "Ülkemize faydalı, prestijli gayrimenkul projelerini ideal şekilde gerçekleştirmek." / EN "…in an ideal way."
  (05.10.2026).
- İçerik notlarındaki B18–B21 (Komiteler çelişkisi, T.C. kimlik no, 01.01.0000 tarihleri, yazım hataları): dokunma.
- Hero görseli: denizi ve binanın tamamını gösteren en yüksek çözünürlüklü kadraj; masaüstünde ufuk çizgisi menü
  yazılarının altına değiyor. Vitrin: projelerin bitmiş hâlleri (Şile, İdealist Cadde).
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
