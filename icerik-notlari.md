> **Kurtarma notu (15.10.2026):** Bu dosya, kaybolan geliştirme ortamından oturum kaydı üzerinden kurtarıldı (son tam görüntü 05.10.2026). O tarihten sonraki kararlar: B18–B21 (Komiteler çelişkisi, T.C. kimlik no, 01.01.0000 tarihleri, yazım hataları) için kullanıcı "dokunma" dedi (05.10.2026); 01.01.0000 tarihleri 15.10.2026'da kullanıcı isteğiyle kaldırıldı (5 haber, liste ve arama verisi; `araclar/degisiklikler/2026-10-15e-tarihsiz-haberler.py`); B1 15.10.2026'da düzeltildi.

# İçerik Notları — mevcut sitede fark edilen hatalar, eskimiş içerikler ve sorular

Kural gereği bunların **hiçbiri değiştirilmemiştir**; envanterde ve yeni sitede metinler aynen taşınır. Karar sizindir. Her satır: nerede → ne görüldü → öneri (isteğe bağlı). Durum: ☐ karar bekliyor.

## A. Yapısal / dil

| # | Nerede | Bulgu | Öneri | Durum |
|---|--------|-------|-------|-------|
| A1 | EN site geneli | EN menünün büyük kısmı boş: "About Us" altındaki 8 alt sayfa, Yİ'de 30+ alt kategori adı ve ana sayfadaki "Şirket Profili" kutusu `*` olarak görünüyor; EN'de haber yok ("News & announcements has not been added to the site yet."). Yİ belge sayfalarının çoğu EN'de var ama başlıkları `*`. | EN çevirileri **yeni metin** sayılır; yazılması için onayınız gerekir. Onay verilirse `onay-bekleyen-metinler.md`'ye ayrı bölüm olarak eklenir; onay yoksa EN sayfalar mevcut hâliyle (boş/`*`) taşınır. | **15.10.2026 yapıldı** (kullanıcı kararı: başlıklar, menüler, liste ve belge adları İngilizce; uzun metinler Türkçe). EN sayfaların hepsi TR asıldan kuruldu; çeviriler `araclar/ceviri/bellek/`, yeni metinler `onay-bekleyen-metinler.md` §12. | ☑ |
| A2 | EN menü ve EN sayfa adları | "Annual Repots", "General Assembly Informations", "Wage Policy" gibi mevcut EN etiketler. | **15.10.2026 düzeltildi** (kullanıcı "saçma çeviri hatası yapmadan" istedi): Annual Repots → Annual Reports; General Assembly Informations → General Assembly Information; The List Of Attendees → List of Attendees; IPO Prospectuses And Circulars → Prospectuses and Public Offering Circulars; Internal Instruction → Internal Directive; About REIT → About REITs; Material Event Disclosure (bölüm) → Material Event Disclosures; The Audit Committee → Audit Committee; The Risk Assessment Committee → Early Detection of Risk Committee (TTK 378 "riskin erken saptanması"); Properties Portfolio → Our Real Estate Portfolio; Wage Policy → Remuneration Policy (önceden düzeltilmişti). Yanlış sayfa adları: "82" (Olağandışı Fiyat ve Miktar Hareketi), izahname sayfalarında "Annual Reports" / "IPO Prospectuses And Circulars", tek tek portföy tablolarında "Portfolio Tables", tek tek hazirun sayfalarında "The List Of Attendees", yıl sayfalarında "Annual reports" / "2025"; 100 sayfada `*`. | ☑ |
| A3 | EN Yİ detay sayfaları (110 sayfa) | 11 tanesinde Türkçe metin var (çeviri yapılmamış), diğerleri yalnızca tarih + belge bağlantısı. | Bilgi. | — |
| A4 | Ana sayfa (TR/EN) | Üst banner Flash (`swf/banner_tr.swf`, `banner_en.swf`); modern tarayıcılarda görünmüyor, içeriği kurtarılamadı. | Yeni hero bu alanın yerini alır (hero başlığı önerileri `onay-bekleyen-metinler.md`). | ☐ |
| A5 | İletişim | "Hareketli kroki" da Flash (`swf/kroki.swf`). Statik kroki görseli (`resimler/iletisim/b_kroki.jpg`) mevcut ve arşivlendi. | Statik kroki + harita bileşeni. | ☐ |
| A6 | Ana sayfa meta | `description` = "İdealist GYO, " (boş), `keywords` = ", , İdealist, GYO, ". Sayfa `<title>` yalnızca "İdealist GYO". | Yeni meta metinleri `onay-bekleyen-metinler.md` §7. | ☐ |
| A7 | Site geneli | Alt bilgide "İstanbul Menkul Kıymetler Borsası" logosu ve `imkb.gov.tr` bağlantısı; "Linkler" sayfasında "İMKB »" → `imkb.gov.tr/Home.aspx`. İMKB 2013'te Borsa İstanbul oldu; adres artık borsaistanbul.com'a yönleniyor. | Bağlantı hedefinin güncellenmesi (metin aynen kalabilir) kararınıza bağlı. | ☐ |
| A8 | Site geneli | `<meta name="author"/"designer">` Birtek; alt bilgide "Tasarım & Yazılım: Birtek" logosu; Google Analytics `UA-3844282-4` (Universal Analytics kapandı, veri toplamıyor). | Yeni sitede kaldırılır/değişir (analitik tercihi rapor sorusu). | ☐ |
| A9 | Ortaklık Yapısı (`Hakkimizda&id=3`) | Sayfa metin değil, gömülü PNG görsel (tablo). Erişilebilirlik ve arama açısından metin olmalı. Görsel arşivlendi: `docs/eski-site-gorselleri/d622defa97e7.png`. İçerik (görselden okunan): İbrahim EKŞİ A Nama 7.500.000 %5,00; İbrahim EKŞİ B Hamiline 15.765.000 %10,51; Mustafa EKŞİ A 2.500.020 %1,67; Mustafa EKŞİ B 4.504.995 %3,00; Eyüp EKŞİ A 2.499.990 %1,67; Eyüp EKŞİ B 3.004.995 %2,00; Mehmet Akif EKŞİ A 2.499.990 %1,67; Mehmet Akif EKŞİ B 3.000.000 %2,00; İdealist Gayrimenkul ve Girişim Sermayesi Portföy Yönetimi A.Ş. B 5.250.000 %3,50; Halka Açık B 103.475.010 %68,98; Toplam 150.000.000 %100,00. 23.01.2026 tarihli izahnamedeki (07.08.2025 GK) tabloyla birebir aynı. | Görsel korunur; ek olarak aynı verinin HTML tablo olarak verilmesi (onayınızla). | ☐ |
| A10 | Ticaret Sicil Bilgileri | Yalnızca "Tescil tarihi: 28.11.2007 / Tescil sicil no: 646759". Ticaret sicil müdürlüğü, MERSİS no, vergi dairesi yok. | Eklenmesi isteniyorsa kaynak belgeyle birlikte iletin (uydurulmaz). | ☐ |
| A11 | İletişim | Adres sitede "Kısıklı Mah. Hanım Seti Sok No:38 Üsküdar / İstanbul"; KAP ve izahnamede "Kısıklı Mahallesi, Hanımseti Sokak, No:38 Kat:3 Ofis:6 Üsküdar / İstanbul". Faks 0216 523 13 58 (KAP'ta faks yok). | Hangisi kullanılacak? Site metni aynen taşınır; seçim sizin. | ☐ |
| A12 | Yatırımcı ilişkileri iletişim | Sitede Yİ birimi iletişim bilgisi yok. KAP'ta "Yusuf ŞİMŞEK – Yatırımcı İlişkileri Yöneticisi, yi@idealistgyo.com, 0216 443 82 90". | Yİ giriş sayfasına eklenmesi önerilir (KAP kaynaklı; onayınızla). | ☐ |
| A13 | Sigorta Poliçeleri | "Henüz sitemize sigorta poliçelerimiz eklenmemiştir." (TR/EN). | Aynen taşınır; belge varsa iletin. | ☐ |
| A14 | Paylaşım görselleri (TR) | Uzun başlıklı en az 2 haber görselinde (Mercek sözleşmesi 2011 ve 2012) başlık logonun üstüne taşıyor, bölüm adı kesiliyor. EN görseller 15.10.2026'da yazı küçülten yeni araçla (`araclar/ceviri/og.mjs`) çizildi. | TR görseller de aynı araçla yeniden çizilebilir (onayınızla). | ☐ |
| A15 | Alt bilgi ve Linkler: SPK bağlantısı | `http://www.spk.gov.tr/index.aspx` SPK sitesinde "404 İçerik Bulunamadı" sayfasına gidiyordu. **15.10.2026 son kontrolde https://spk.gov.tr/ yapıldı** (bağlantı yazısı aynı). | — | ☑ |
| A16 | Basında Biz: Emlak Kulisi haberi | Eski haber adresi (emlakkulisi.com/…-88233.html) otomatik denetimde Cloudflare doğrulamasına takılıyor (403); gerçek tarayıcıda açılıp açılmadığı buradan doğrulanamadı. | Bir kez tarayıcıdan açıp bakın; kalktıysa bağlantı kaldırılabilir veya arşiv adresi verilebilir. | ☐ |

## B. Metin içi hatalar (değiştirilmedi)

| # | Nerede | Bulgu | Durum |
|---|--------|-------|-------|
| B1 | Şirket Profili (TR, ana sayfa özeti dâhil) | "Sermaye Piyasası **Kurumu** Mevzuatı" (Kurulu); "Gayrimenkul Yatırım Ortaklıklarına İlişkin Esaslar Tebliği (Seri VI, No: 11)" — yürürlükteki tebliğ III-48.1 (2013); "…öncü şirketler arasında yer alma amacındadır. Bu" cümlesi kaynakta "yer alma amacındadır. B" + "u düşünceyle" olarak bölünmüş (görünümde sorun yok). **15.10.2026 kullanıcı onayıyla düzeltildi:** "Sermaye Piyasası Kurulu Mevzuatı ve … Esaslar Tebliği'ne (Seri: VI, No: 11) göre kurulan" (ana sayfa, Hakkımızda, Şirket Profili, arama verisi). Tebliğ adı kuruluş tarihindeki (2007) mevzuatı gösterdiği için korundu. | ☑ |
| B2 | Haber "2016 Yılı Olağan Genel Kurul Toplantısı Hk." ve diğer haberler | Kesme işareti yerine "?" karakteri: "saat: 14:00?da" (eski kodlama artığı); "Toplantısı nın" (kesme yok); "22 / 02 / 2017tarihinde" kaynakta boşluksuz. | ☐ |
| B3 | Yönetim Kurulu ve Üst Yönetim | "Yönetim Kurulu Başkan Yrd." (tabloda "BAŞKAN VEKİLİ"); üst yönetimde "Muhammed Ali DEMİRCİ – İhale ve Pazarlamadan Sorumlu Genel Müdür Yardımcısı" — izahnamede (Ocak 2026) üst yönetim listesi karşılaştırılacak (izahname s.76-77: YK 5 üye aynı; görev süreleri 04.08.2023–04.08.2026). | ☐ |
| B4 | GYO'lar Hakkında | Mevzuat tarihli ("Seri: VI, No: 11" atıfları, eski vergi/oran ifadeleri). Uzun metin; güncellik kontrolü hukuk/Yİ birimine ait. | ☐ |
| B5 | Mali Tablo ve Raporlar | 2025 satırında iki adet "12 Aylık" (id 578 ve 586; farklı dosyalar). Etiket ayrımı yok. | ☐ |
| B6 | Uyum Raporu | Yalnızca 2019 yılı uyum raporu ve 2018 bilgi formu var; 2020+ KAP'ta olabilir. | ☐ |
| B7 | Özel Durum Açıklamaları | Arşiv 2021'de bitiyor; 2021 sayfası KAP'a yönlendiriyor (metin aynen korunur). 2015 yılı kategorisi yok. | — |
| B8 | Haber & Duyurular | Son kayıt 22.02.2017. 2017 sonrası duyurular yalnızca ÖDA/KAP'ta. | ☐ |
| B9 | Basında Biz | Tek kayıt (21.09.2011, Emlak Kulisi); bağlantı hedefi dış site. | — |
| B10 | Faaliyet Raporları menüsü | "2026 Yılı Faaliyet Raporları" (3 ve 6 aylık ara dönem raporları). Alt kategori adı "Yılı Faaliyet Raporları" ara dönemleri de kapsıyor. | — |
| B11 | Değerleme Raporları | Bazı başlıklarda çift boşluk ("İdealist Cadde/ Koru"), tutarsız biçim ("2022 Yılı İde…"). | — |
| B12 | Portföy Tabloları | Yalnızca 2009–2011 dönemleri (xls). 2012+ portföy tabloları faaliyet raporlarının içinde olabilir. | ☐ |
| B13 | Ana sayfa "Haber & Duyurular" kutusu | 2017 tarihli 3 haber gösteriliyor. | — |
| B14 | Telif satırı | "Copyright © 2026" otomatik yıl. | — |
| B15 | Aliağa parseli (izahname) | 23.01.2026 tarihli izahnamede aynı arsa bazı bölümlerde "1147 Ada 1(A) Parsel", bazı bölümlerde "1147 Ada 4 Parsel" olarak geçiyor (imar sonrası yeni parsel no olabilir). Prototipte 1(A) kullanıldı, dipnotla işaretlendi. | ☐ |
| B17 | Mali Tablo ve Raporlar (TR ve EN) | Sayfada belgesiz, boş ek tablolar var: TR'de başlıkları "2025", "2025", "2025", "2026"; EN'de "Annual reports", "finanacial report" (×3). İçerikleri olmadığı için yeni siteye taşınmadı (sadakat testinde bilinen fark). | ☐ |
| B16 | Gayrimenkul Portföyümüz görseli | "İzmir/Aliağa Lojistik Depo Yapımı" bağlantısı bir uydu ekran görüntüsü (Yandex filigranlı, kırmızı parsel çizgili) açıyor; kurumsal sitede kullanımı ve telif durumu sorgulanmalı. | ☐ |
| B22 | EN Özel Durum Açıklamaları ve 2024 sayfası; EN Sigorta Poliçeleri | Eski EN bilgi notları: "Contents has not been added to this category yet." (Content has / Contents have) ve "Our insurance policies has not been added to the site yet." (have). Aynen korundu. | ☐ |

## C. Rakamlar (kaynağı belli olanlar — yeni sitede kullanılabilir)

| Rakam | Değer | Kaynak |
|-------|-------|--------|
| Kuruluş / tescil tarihi | 28.11.2007 | Şirket Profili, Ticaret Sicil Bilgileri |
| Ticaret sicil no | 646759 | Ticaret Sicil Bilgileri |
| Çıkarılmış sermaye | 150.000.000 TL | Ortaklık Yapısı görseli; izahname 23.01.2026 |
| Kayıtlı sermaye tavanı | 750.000.000 TL (2024–2028) | izahname 23.01.2026, md. 20.2 |
| Planlanan bedelli sermaye artırımı | 150.000.000 → 525.000.000 TL (%250) | izahname 23.01.2026 (SPK onayına sunulan) — **onay durumu sorulacak** |
| Halka açıklık | %68,98 | Ortaklık Yapısı görseli; izahname |
| Aliağa arsa | İzmir Aliağa, 1147 Ada 1(A) Parsel, 10.000 m² | izahname; 2023–2025 Aliağa arsa değerleme raporları |
| Aliağa lojistik depo | 14.390 m² inşaat alanı; 4 ünite; toplam kullanım alanı 6.291,59 m²; yapı ruhsatı 28.12.2023; bütçe 170 milyon TL | izahname s.30, 48 |
| İdealist Cadde/Koru | Cadde etabı 3.521,69 m² (91/205), Koru etabı 14.923,93 m² (70/82); toplam inşaat alanı 22.465,18 m²; hasılat payı %78 (İş Ortaklığı) / %22 (Emlak Konut); İş Ortaklığı payı İdealist GYO %49 | izahname s.48 |
| 12 (önce 9) ticari ünite | 9 ünite ihale bedeli KDV dâhil 16.370.000 TL (1.387,46 m²) | izahname |
| Borsa kodu / pazar | IDGYO / Alt Pazar; BIST TÜM, BIST MALİ, BIST GYO, BIST KATILIM TÜM | KAP |
| Bağımsız denetçi | KARAR Bağımsız Denetim ve Danışmanlık A.Ş. | site (YK sayfası), KAP |

Portföy toplam değeri ve net aktif değer gibi rakamlar **son faaliyet raporundan** alınacak (2026 6 aylık, `download.php?…id=589`); rapor indirildikten sonra bu tabloya eklenecek (Aşama 2 öncesi).

## D. Belgeler

| # | Bulgu | Durum |
|---|-------|-------|
| D1 | Belgeler `download.php?d=tr&s=icerik&id=N&kid=K` üzerinden veriliyor; sunucu `Content-Disposition` ile orijinal dosya adını dönüyor (ör. `Faaliyet_Raporu_Haziran2018docdocson_1.pdf`). Bu adlar manifestte aynen korunur. | — |
| D2 | Aynı belge TR ve EN sayfalardan (`d=tr` / `d=en`) veriliyor; 202 çiftin tamamı SHA-256 ile birebir aynı doğrulandı → tek kopya. | — |
| D3 | Dosya adlarında Türkçe karakterler düşmüş (`Olaan_Genel_Kurul…`, `Esas_Szleme…`). Kural gereği yeniden adlandırılmaz. | — |
| D4 | Mali Tablo / Dipnot belgeleri `<select>` seçicisiyle veriliyor (bağlantı yok); 92 TR + 92 EN adres ayrıca tespit edilip indirildi. | — |
| D5 | Uzantılar: pdf 471, xls 53, xlsx 12, doc 12, docx 2 (adres bazında). Aynen korunur. | — |
| D6 | 55 benzersiz dosyanın yılı sayfa bağlamından çıkarılamadı (ör. 2010 halka arz ekleri, tarihsiz genel kurul davet/tutanakları, komite esasları); manifestte `yil: ""`, klasör `tarihsiz/`. | ☐ |
> **22.10.2026 (kullanıcı isteği):** Alt bilgi ve iletişim adres satırı "Kısıklı Mah. Hanım Seti Sok No:38 Üsküdar / İstanbul" →
> "Kısıklı Mah. Hanımseti Sok. No:38 Üsküdar / İstanbul" (sokak adı şirket belgelerindeki bitişik yazımla; "Sok." noktalı).
> Belge ve haber metinlerindeki adresler eski kayıt olarak değişmedi (`araclar/degisiklikler/2026-10-22c-adres.py`).
