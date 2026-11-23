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

Çerçevesiz: çubuk, cam zemin, kapsül, nokta ya da çizgi yok; yalnız üç simge yan yana. Ölçüler 390 genişliğe göre,
`--u` ile ölçeklenir.

| Öğe | Değer |
| --- | --- |
| Yerleşim | genişlik min(ekran − 32, 300), 390'da 300 × 64; alttan 16 (en az güvenli alan + 6); üç sekme 100 × 64 (merkezler arası 100) |
| Ana ekran | fildişi beyazı kabartma: simge üstte #fff, alta doğru #f0eadf (`#isik-24`, `#isik-dugum`); gölgeler 0 1 .5 rgba(0,8,34,.7), 0 3 5 rgba(0,10,40,.42), 0 7 12 rgba(0,10,40,.22); seçili sekme yok |
| Açık zemin (Kenz, Güneş) | seçili #022064, çizgi +0,2 (düğüm konturu 26), sıcak hafif kalkık gölge; öbürleri #5b6890, altta ince beyaz ışık |
| Simgeler | dünya 29 (halka 1,25; Natural Earth karaları, ortografik, 20°D 16°K ortada; kara dolu, deniz boş); düğüm 27 (kullanıcının `#dugum`'u aynen, aynı renkte kontur 20); güneş 30 (çizgi 1,2). 390'da çizgiler ≈ 1,5 px |
| Etiketler | Oku / Kenz / Güneş görünmez; ekran okuyucu için durur |
| Odak, basma | yalnız klavye odağında 50 × 50 yumuşak köşeli halka; basınca 1 px iner ve .94 küçülür (hareket azaltılmışsa yalnız solar) |

Tasarımla karşılaştırma: `npm run build && npm run test:visual`.
