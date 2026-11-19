# Suluboya motoru — kısa kılavuz (öğe yazanlar için)

Video 1080×1920 (9:16), 30 fps. Stil: **Atölye S-146 Dijital Suluboya** — dokulu soğuk pres kâğıt, saydam ve
temiz lavi katmanları, kenarlarda ince pigment birikimi (ıslak kenar), hafif granülasyon; sıçrama ve leke yok;
beyazlar boş bırakılan kâğıttır. Referans kare: `python3 deneme` çıktısı `…/scratchpad/deneme_stil.png` ve stil
örneği `…/scratchpad/s146.png` (yeşil kubbe, minare, şakayıklar, okaliptüs).

## Temel kavramlar (`motor.py`)

- **Tuval** `t = Tuval()` kâğıt renginde başlar. Her boya geçişi `t.lavi(yollar, M, renk, **ayar)`.
  Renkler çarpımsal (multiply) birikir: üst üste binen saydam katmanlar koyulaşır.
- **Önden arkaya boyama + saklama.** Sahneler nesneleri ÖNDEN ARKAYA çizer. Bir nesne bitince
  `t.sakla_ekle(siluet_yollari, M)` ile silueti saklamaya yazılır; ondan sonra çizilen (arkadaki) her şey o
  alanı boş bırakır (suluboyacının "saklama"sı). Bir nesnenin İÇİNDE parçalar da önden arkaya çizilir; aynı
  parçanın üst üste binen saydam katmanları (ör. yan yana taç yaprakları) saklamasız boyanır, bir katman
  (halka, kol, gövde) bitince saklamaya yazılır. Sonuç: renkler çamurlaşmaz, arkadaki biçim öndekinin
  altından geçiyormuş gibi yalnız dışarıda görünür. Saklamaya yazmayan saydam efektler (yağmur, pus,
  ışık) `sakla=False` ile ya da saklama eklemeden çizilir.
- **M** yerel → ekran 3×3 matristir (numpy). Yardımcılar: `M_bilesik(A, B, ...)` (A·B·...),
  `M_oteleme(x,y)`, `M_olcek(sx,sy)`, `M_donme(derece)`, `M_yerlestir(x, y, olcek, aci, ox, oy)`.
  Öğeler kendi yerel koordinatlarında çizilir; sahne `M = kamera.M() @ M_yerlestir(...)` verir.
  Dokular (kenar dalgası, akış) nesnenin yerel koordinatına bağlıdır → nesne hareket edince doku kaymaz.
- **Yollar** skia.Path: `yol_egri(noktalar, kapali, gerilim)` (Catmull-Rom), `yol_cokgen`, `yol_daire`,
  `yol_elips(cx,cy,rx,ry,aci)`, `yol_dikdortgen(x0,y0,x1,y1,r)`, `yol_serit(omurga, yari_genislikler)`
  (sap, uzuv, yaprak), `yol_op(a, b, 'fark'|'kesisim'|'birlesim')`, `yol_donustur(yol, M)`,
  `damla_blob(...)`, `bezier_noktalar(p0,p1,p2,p3,n)`.

### `t.lavi(...)` ayarları
| ad | anlam | tipik |
| --- | --- | --- |
| `yog` | yoğunluk (opaklık) | açık lavi 0.2–0.35, orta 0.4–0.55, koyu sır 0.6–0.8 |
| `kenar` | kenar yumuşatma (px) | 0.8–1.6 (net), büyük biçimde 2 |
| `dalga` | kenar gürültüsü | 0.04–0.08 küçük/temiz, 0.12–0.2 doğa |
| `islak`, `islak_gen` | ıslak kenar gücü, bandı (px) | 0.6–1.2, 2–4 px (S-146'nın ince pigment kenarı) |
| `gran` | granülasyon (kâğıt çukurları) | 0.06–0.16 |
| `akis` | geniş renk dalgalanması | 0.1–0.3 |
| `yumusak` | eşiksiz, ıslak-üstüne-ıslak dağılma (px) | 0 (kapalı) ya da 6–30 |
| `cizgi` | yolu çizgi olarak (kalınlık) | ince fırça çizgisi 1.5–4 |
| `maske_fn(m,X,Y)` | yerel ızgarayla maske değiştir | açılma, kısmi gölge |
| `yog_fn(X,Y)` | yoğunluk çarpanı haritası | degrade gölge |
| `renk_fn(X,Y)` | (h,w,3) renk haritası | iki pigment geçişi |
| `sakla` | saklamaya uy (varsayılan True) | efektlerde False |
| `opak` | örtücü (guaj gibi) | yalnız istisna: beyaz vurgu |

- Gölge: aynı biçime ikinci bir koyu sır, gölge yarısında (`maske_fn` ya da ayrı yol). Işıklı yan boş/açık.
- `t.isik(yollar, M, renk, guc, yumusak)` ölçülü parıltı (screen). Nur/ışık anlarında az kullanın.
- `t.kaldir(yollar, M, miktar, yumusak)` boyayı kaldırma (ıslak süngerle açma), kenarında hafif halka.
- `t.degrade_lavi(duraklar, ...)` tam ekran gök vb.
- **Görünürlük / açılma:** `with t.gorunurluk(alfa, maske_fn, M=Mnesne): ...` içindeki bütün lavi, saklama
  ve ışık çağrılarına opaklık ve maske uygular (saklama da aynı oranda zayıflar, böylece yarı saydam nesne
  arkasını tamamen silmez). Hazır açılma maskeleri: `acilma_radyal(ilerleme, cx, cy, R, ...)` (boyanın
  bir noktadan organik kenarla yayılması), `acilma_yonlu(ilerleme, x0, y0, dx, dy, L, ...)` (fırça yönünde).
- Yumuşatma eğrileri: `e_io, e_io5, e_out, e_in, e_back, e_yay, ilerle(t, a, b, egri)`; `sstep(a,b,x)`.
- Son işlem (kâğıt kabartması, hafif vinyet): `son_islem(t.R)`; PNG için
  `cv2.imwrite(yol, cv2.cvtColor(rgb8(son_islem(t.R)), cv2.COLOR_RGB2BGR))`.

## Ortak öğeler (`elemanlar.py`)
`P` paleti; `gok(t, M, bulutlar=[(cx,cy,gen,yuk,tohum)])`, `bulut_yolu`, `uzak_agac_sirasi`, `tepe_sirasi`,
`yaprak_yolu`, `okaliptus_dali`, `sakayik(t, M, x, y, r, renk_='allik'|'seftali'|'beyaz'|'gul', acilma=0..1)`,
`yaprak_kumesi`. Bunlar stil ölçüsüdür: yeni öğeler bu yoğunluk ve kenar dilinde olmalı.

## Öğe yazma kuralları
1. Her öğe bir fonksiyondur: `ciz_xxx(t, M, ..., zaman/ilerleme parametreleri)`. Kendi içinde önden arkaya
   boyar ve sonunda **kendi silüetini saklamaya yazar** (arkasındaki sahne boş kalsın), istenirse
   `sakla_sonra=False` ile kapatılabilir. Animasyon parametreleri 0..1 arası ilerleme ya da açıkça saniye.
2. Deterministik: rastgelelik yalnız `np.random.default_rng(tohum)` ile; aynı parametre → aynı kare
   (titreme olmasın). Zamanla değişen her şey parametrelerden türesin.
3. Palet: S-146 (kobalt-seruleum gök, adaçayı, okaliptüs yeşili, allık pembesi, şeftali, kum, lavanta-gri
   gölge, mor-kahve pencere) ve gerekirse ölçülü altın/okra. Renkler açık, havadar; koyu yerler bile şeffaf.
4. Sınırlar ve ölçek: sahne birimi ekran pikseli (zum 1'de). Kalite kontrolü için öğeyi büyük ve küçük
   ölçekte deneme karesi olarak çizip kendiniz bakın (Read ile PNG).
5. Hız: tek öğe tipik olarak < 0.3 s/kare. Kare başına toplam bütçe ~2 s.
