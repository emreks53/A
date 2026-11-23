# Ana ekran ölçüleri

Ölçüler CSS pikselidir; `src/styles.css` içinde `--u` ile çarpılarak her ekrana ölçeklenir (390 × 844'lük
referans telefonda `--u` = 1px).

## Arka plan

Kullanıcının "Ege Kıyısı Ufuk" görseli, 12 en-boy oranında; söz ("Güneşten daha parlak ve cennet gibi güzel
hakikatler") görselin içinde yazılıdır, HTML'de yalnız ekran okuyucular için gizli metin olarak durur.

| Oran | Cihazlar | Dosya genişlikleri |
| --- | --- | --- |
| 9:20 | uzun Android telefonlar | 860, 1290 |
| 9:19,5 | iPhone X–16 | 860, 1290 (+ JPG yedek 860) |
| 9:16 | iPhone SE, eski Android, tarayıcı çubukları açıkken | 860, 1290 |
| 10:16 | Android tabletler (dikey) | 1200, 2048 |
| 2:3 | iPad mini, iPad Air, iPad Pro 11" (dikey) | 1200, 1717 |
| 3:4 | iPad, iPad Pro 13" (dikey) | 1200, 1932 |
| 4:3 | iPad (yatay) | 1440, 2576 |
| 3:2 | Surface, MacBook, iPad Pro 11" (yatay) | 1440, 2576 |
| 16:10 | MacBook, 16:10 dizüstüler, Android tablet (yatay) | 1440, 2576 |
| 16:9 | çoğu dizüstü ve monitör | 1440, 2576 |
| 2:1 | bilgisayarda tarayıcı penceresi, yeni telefonlar (yatay) | 1440, 2576 |
| 21:9 | ultra geniş monitörler, uzun telefonlar (yatay) | 1440, 2576 |

- Dosyalar `src/assets/bg/bg-<oran>-<genişlik>.avif|webp` (`9x19` = 9:19,5).
- `index.html` `<picture>`: ekranın oranına en yakın görsel seçilir; sınırlar iki komşu oranın geometrik
  ortasıdır (ör. 9:16 ile 10:16 arası 0,5929). `object-fit: cover` ile kalan fark en çok %3–4'tür
  (ör. 844 × 390 yatay telefonda yanlardan %3,6).

## Alt menü

Açık ten temasıyla her ekranda aynı fildişi cam (ilk tasarımdaki krem çubuk ve altın seçili sekme kaldırıldı). Ölçüler 390 genişliğe göre,
`--u` ile ölçeklenir.

| Öğe | Değer |
| --- | --- |
| Çubuk | genişlik min(ekran − 32, 420), 390'da 358 × 64; köşe 22; alttan 16 (en az güvenli alan + 6); iç boşluk 5 |
| Zemin | her ekranda fildişi cam rgba(251,248,241,.94); ana ekranda lacivert gölge, öteki ekranlarda sıcak gölge |
| Seçili sekme | kum rengi #F3E9DF kapsül, .5 px altın kıl çizgi rgba(130,97,42,.3), köşe 17; simge ve yazı #022064 (ana ekranda seçili sekme yok) |
| Simgeler | 24 × 24, tek renk çizgi (1,1): dünya ve güneş; Kenz kullanıcının düğümü (`#dugum`, dolgu) |
| Etiketler | Encode Sans 600, 11, büyük harf, harf aralığı .12em; ana ekranda #022064, öteki ekranlarda seçili olmayanlar #022064 %64 |

Tasarımla karşılaştırma: `npm run build && npm run test:visual`.
