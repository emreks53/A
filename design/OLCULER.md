# Ana ekran ölçüleri

Kaynak: `mockup-ana-ekran.png` (854 × 1842 px). Bu görsel 390 × 841,2 CSS piksellik bir telefon ekranı olarak
yorumlanmıştır (cihaz piksel oranı 854 / 390 = 2,1897). Aşağıdaki değerler CSS pikselidir; `src/styles.css`
içinde `--u` ile çarpılarak her ekrana ölçeklenir (referans ekranda `--u` = 1px).

## Arka plan

- Tasarımdaki yazı ve alt menü kaldırılmış (LaMa ile boyama), menü altı çayır yeniden üretilmiş,
  Real-ESRGAN ile 2× büyütülmüş görsel: `src/assets/bg/bg-portrait-*`.
- Geniş ekranlar için ortası net, yanları aynalanıp yumuşak bulanıklaştırılmış sürüm: `bg-wide-*`.
- Ekran oranı 3:5'ten genişse geniş sürüm kullanılır.

## Alıntı

| Özellik | Değer |
| --- | --- |
| Yazı tipi | Tinos Bold Italic (Times uyumlu), dikeyde %111 ölçek |
| Boyut / satır aralığı | 27,85 / 29,49 (ölçek öncesi) → satırlar arası 32,73 |
| Konum | Blok merkezi ekran yüksekliğinin %35,8'i, ince ayar x +1,2 / y −2,28 |
| Renk / gölge | #FFFFFF; `0 0 8 rgba(40,148,225,.2), 0 0 24 rgba(40,148,225,.45)` |

## Alt menü

| Öğe | Değer |
| --- | --- |
| Çubuk | 352,2 × 81,3, köşe 25,1, alttan / yanlardan 18,95; dolgu #FCFAF5 → #FBF7EF |
| Seçili sekme zemini | 100 × 76,7, köşe 21,9, üstten 2,28; #FEF6E3 → #FCF1D8 → #FDF4DC |
| Sekme merkezleri (çubuk merkezine göre) | Oku −106 · Kenz +0,9 · Güneş +109,4 |
| Dünya ikonu | Ø 29,7 (32 kutu), merkez çubuk üstünden 25,04 |
| Düğüm ikonu | 30,95 × 33,66, üstten 14,12 |
| Güneş ikonu | 37,4 kutu, disk r ≈ 9,8, 8 ışın; üstten 10,45 |
| Etiketler | Encode Sans Bold 15,53; Oku #022064, Kenz #8E540A, Güneş #1F3E7F → #201D69 |

Tasarımla karşılaştırma: `npm run build && npm run test:visual`.
