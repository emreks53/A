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
