# Ortak sahne: Yeşil Kubbe

Atölyedeki her stilin örnek görseli **aynı sahneyi** çizer: Medine'deki Mescid-i Nebevî'nin Yeşil Kubbesi
(Kubbe-i Hadrâ), solunda arkada minare, önde ve iki yanda çiçekler. Böylece stiller yan yana konunca
aradaki fark yalnızca **render stili**nden gelir.

| Başvuru | Dosya |
| --- | --- |
| Doğal renkli başvuru çizimi | `referans.webp` (kaynağı `referans.html`) |
| Ölçülü çizgi başvurusu (64 px ızgara) | `referans-cizgi.webp` (kaynağı `referans-cizgi.html`) |
| Geometri ve yardımcılar | `sahne.js` → `window.SAHNE` |

## Kompozisyon (1024 × 1024 tuval)

| Öğe | Yer ve ölçü |
| --- | --- |
| Işık | Sağ üstten; güneş (880, 140). Gölgeler sola düşer. |
| Yer çizgisi | y = 800 |
| Kubbe | Taban x 360–760, y = 555; hafif sivri tepe (560, 300); 16 dilimli dikey kaburgalar |
| Alem (kubbe) | Tepeden yukarı: yaka, çubuk, üç küre, boynuzları yukarı bakan hilal; hilalin tepesi y ≈ 187 |
| Üst kasnak | x 352–768, y 555–610, 15 küçük sivri kemerli niş |
| Alt kasnak | x 334–786, y 610–692, 13 sivri kemerli pencere (silindir olduğu için kenarlara doğru daralır) |
| Kaide (beyaz taş yapı) | Korniş y 692–704 (x 290–830), gövde x 300–820, y 704–800, üç kemerli pencere |
| Minare | Eksen x = 300, kubbenin solunda ve arkasında; alt gövde (68 geniş), zikzak bant y 522–582, iki şerefe (y ≈ 456 ve 290) korkuluklu, üst gövde, bilezik, soğan biçimli topuz, alem; tepe y ≈ 82 |
| Çiçekler | Önde y 780–1024 şeridinde beş taç yapraklı beyaz çiçekler ve yapraklar; iki yanda (x 30–260 ve 780–1000) y ≈ 520'ye kadar yükselen dallar, tomurcuklar |
| Gök | Arkada; sağ üstte güneş ışıltısı, birkaç yumuşak bulut |

Stil kendi karakteri gereği yeniden kurgulayabilir (izometrik, kübist, yansıma vb.), ama konu ve öğelerin
kabaca yerleri tanınır kalmalıdır. Çiçeğin türü stile göre değişebilir (lale, karanfil, şakayık, sakura…).

## `sahne.js` (window.SAHNE)

| Ad | Ne verir |
| --- | --- |
| `SAHNE.tuval(canvas, olcek)` | Tuvali 1024 koordinatına kurar, 2B bağlamı döner (olcek > 1 → daha yüksek iç çözünürlük) |
| `SAHNE.yeniTuval(w, h)` | Ekran dışı tuval |
| `SAHNE.rng(tohum)` | Tohumlu rastgele sayı üreteci; **Math.random kullanılmaz**, görsel hep aynı çıkmalı |
| `SAHNE.hazir()` | Çizim bitti işareti; çizim aracı bunu bekler (zaman uyumsuz çizimlerde en sonda çağırın) |
| `SAHNE.ciz(ctx, {bolge, cicek, gok})` | Doğal renkli başvuru çizimi; `bolge:true` → her bölge düz renk (`SAHNE.BOLGE`) |
| `SAHNE.renkHaritasi(o)` | Başvuru çiziminin piksel verisi; `.renk(x, y)` → [r,g,b,a] (fırça, nokta, mozaik stilleri için) |
| `SAHNE.bolgeHaritasi()` | Bölge haritası; `.bolge(x, y)` → 'gok', 'kubbe', 'kasnak', 'kaide', 'minare', 'altin', 'pencere', 'yaprak', 'sap', 'cicek', 'cicekOrta', 'zemin', 'gunes' |
| `SAHNE.yollar()` | Her öğenin SVG yol dizgisi: kubbe, kaburgalar, kasnakUst/Alt, kasnakPencereleri, kaide, kornis, kaidePencereleri, minare (parçalar), minarePencereleri, zikzak, minareAlem, alem, saplar, yapraklar, tomurcuklar, cicekler. SVG'de `d=` olarak, canvas'ta `new Path2D(yol)` ile kullanılır |
| `SAHNE.kubbeYolu`, `kubbeProfili(n)`, `kubbeNoktalari(n)`, `kaburgalar(adet)`, `kubbedeMi(x,y)` | Kubbe geometrisi (profil: tabandan tepeye {y, r}; kaburga: {u, boylam, noktalar}) |
| `SAHNE.kasnak`, `kasnakPencereleri(kat)` | Kasnak katları (0 üst, 1 alt) ve pencereleri {x, y, w, h, aci} |
| `SAHNE.kaide` | Kaide, korniş ve pencereleri |
| `SAHNE.minareParcalari()`, `minarePencereleri`, `zikzakCizgileri()` | Minare parçaları (aşağıdan yukarı) |
| `SAHNE.alemParcalari(cx, taban, olcek)`, `hilalYolu(cx, cy, R)` | Alem ve hilal |
| `SAHNE.bitki` | `saplar`, `yapraklar` {x,y,uzunluk,genislik,aci}, `cicekler` {x,y,r,aci}, `tomurcuklar` {x,y,r,aci} |
| `SAHNE.yaprakYolu(y)`, `yaprakDamari(y)`, `tacYapraklari(c)`, `tomurcukYolu(t)` | Bitki biçimleri |
| `SAHNE.kemerYolu(x, y, w, h)`, `elipsYolu(e)`, `daireYolu(cx, cy, r)`, `yol(noktalar, kapali)` | Biçim yardımcıları |
| `SAHNE.renk` | Doğal başvuru paleti |
