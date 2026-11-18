# Yirminci Mektup videosu — sahne yönergesi

Mektubat, Yirminci Mektup, 243. sayfa. Ses kaydı (`veri/ses.mp3`, 109,5 sn) okunurken, o an okunan cümledeki
manaları yansıtan dinamik animasyon. Biçim: **dikey 9:16, 1080 × 1920, 30 fps**. Model: "Kurzgesagt – In a
Nutshell"ın anlatım modeli (okunan manaya paralel animasyon) — **tema uzay değildir**, tema metnin manasıdır.
Üslup: Atölye Stil Kataloğu **S-232 "Filmde Renkli Kalem"** (mat polyester çizim filminde renkli kalem).

Hedef: Kurzgesagt'ın kalitesine yetişmek ve geçmek. Her kare özenli, kompozisyonu net, hareketi yumuşak olmalı.

## 1. Kesin kurallar (kullanıcının istekleri)

1. **Dinamiklik ölçüsü Kurzgesagt kadar**: her kelimeye ayrı görsel YOK. Görsel fikir cümlenin ana parçalarında
   (yan cümle / öbek) değişir: kabaca 1,5–3 sn'de bir yeni fikir; arada sürekli, sakin hareket (kamera kayması,
   salınım, nefes alma, yaprak sallanması). Bir saniyede ikiden fazla yeni öğe girmesin. İzleyici yetişebilmeli.
2. Görseller o an okunan manaya paralel olmalı: öğe, karşılık geldiği kelimenin **ilk harfiyle** (± 0,1 sn)
   girmeye başlar. Zamanlar `motor/zaman.mjs` → `kb('kelime', kaçıncı)` (ilk harf, 0,04 sn erkene alınmış) ve
   `ks(...)` (kelimenin sonu). Kelime anahtarları normal biçimdir (aşağıdaki listeye bakın).
3. **Ekranda yazı yok** (tek istisna motorun çizdiği sözlük altyazısı ve kapanıştaki kaynak). Etiket, harf, rakam,
   soru işareti, ok üstünde yazı vb. koymayın.
4. İnsan çizilecekse **erkek**, sade, ayrıntısız, ölçüleri normal: yalnız `motor/insan.mjs` (`insanYan`,
   `insanOn`). Yüz çizgisi yok. Kadın figür yok. Kalabalıklar da erkek figürlerden oluşur.
5. Allah, peygamber, melek tasviri **yok**. İlahi manalar ışık, nur, düzen, simge ile anlatılır. Cin: yüzsüz,
   saydam, dumansız ateş gibi soluk lila-mavi kıvrımlar (korkutucu değil).
6. Arka planda müzik yok; ses efektleri kısık (sahne dosyasında `sesler` listesi, bkz. §6).
7. Sözlük altyazısı motor tarafından alt bantta çizilir (taban y = 1548, iki satırda 1468 ve 1548, metin
   ortalı, x ≈ 200–880). **y 1380–1640 bandını sakin tutun**: metnin tam arkasına çok parlak ışık merkezi, yoğun
   küçük ayrıntı ya da sert kontrast koymayın (çimen, gök, yumuşak tarama sorun değil).

## 2. Üslup (S-232) — her öğe bu dille çizilir

- Zemin: çıplak film `#F7F9F9`. Renk iki katmanlıdır: **arka yüz buğusu** (yumuşak, bulanık açık renk) + **ön yüz
  taraması** (uçları incelen, saten, hafif saydam kalem çizgileri; ton koyulaştıkça çizgi katları artar) +
  **kontur** (yerel rengin koyu kalemi, basıncı hafifçe değişen temiz çizgi). Bunların hepsi `motor/kalem.mjs`
  `oge({...})` ile yapılır. Düz vektör dolgu (tek renk, taramasız alan) kullanmayın; ışık ve hale efektleri hariç.
- Gök: `gokTuvali` (uzun, ~-9° eğimli saten süpürüşler, ufka doğru leylağa çalan parıltı). Bulut: `bulutOge`
  (çıplak film, altında lila çizgiler). Güneş: `gunesOge`.
- Palet: `PALET` (kalem.mjs) — gök mavileri, yeşiller, krem, sıcak gri, lila, koyu lila, sarı, oker, gül.
  Işık: çıplak film + soluk sarı tarama + altın kontur + yumuşak hale (`hale`, `isinlar`, `nurKuresi`).
- Karanlık/hüzünlü sahneler (s07–s09): yine çizim filmi üzerinde kalem; gök gri-lila (`#A7A1BA`, `#6E6784`,
  `#5E5752`), zemin `tepeOge({renk:'gri'})`, renk doygunluğu düşük, tarama yoğun. Siyah zemin YOK. Ölçülü bir
  hüzün; korku filmi değil. Gerekirse katmana `ctx.filter = 'saturate(0.45) brightness(0.93)'` uygulanabilir.
- Çizgi kalınlıkları ekranda ~1,8–2,6 px (kontur), tarama ~1,1–1,4 px. Öğeyi ekranda büyütecekseniz `olcek`
  parametresini büyütün (gösterim ölçeği / olcek ≤ ~1,2 olsun, yoksa bulanıklaşır).

## 3. Motor (okuyun: `motor/*.mjs`, örnek: `sahneler/s01.mjs`)

- `temel.mjs`: `W,H`, `rng(tohum)` (Math.random YASAK, her şey tohumlu ve belirlenimci), `ease.*`,
  `an(t, t0, sure, ease)` (0..1 ilerleme), `pop(t, t0, sure)` (taşmalı ölçek), `zarf`, `lerp`, `clamp`, `rampa`.
- `sekil.mjs`: şekil = alt yol listesi. `svg('M… C… Z')` (SVG yol yazısı), `elips`, `daire`, `cokgen`,
  `yuvarlakDikdortgen`, `yaprak`, `damla`, `kalp`, `yildiz`, `sivriKemer`, `donustur`, `yolKes` (çizerek giriş).
- `kalem.mjs`: `oge(spec)` → önbellekli sprite (ad, sekil, olcek, arka, tarama:{ton, renkler, yon|yonF, aralik,
  boy, esikler, alfa, sekil?}, kontur, konturKal, detay(ctx, api)); `ogeCiz(ctx, o, x, y, {s, sx, sy, r, alfa,
  pivot})`; `ogeAcarak(ctx, o, x, y, ilerleme, {mod:'sil'|'daire', yon})` (çizerek/silerek açılış);
  `konturCiz(ctx, pts, {renk, kal, kapali, cizim})` (canlı çizgi, `cizim` 0..1 ile çizilerek); `tara(...)`;
  `TON.kure / silindir / dogrusal / radyal / gurultulu` (ton haritaları); `gokTuvali`, `bulutSekli`.
- `motifler.mjs` (ortak, sahneler arası tutarlılık için bunları kullanın): `nurKuresi` (iman nuru), `marifetDeseni`
  (marifetullah: sekiz kollu yıldız örgüsü, `cizim` ve `dolgu` ilerlemeli), `gul` (muhabbetullah, `acilma`),
  `nektarDamla`, `halkaYayil` (lezzet-i ruhaniye halkaları), `agac`/`agacCiz` (meyveli/çıplak/kuru, büyüme),
  `meyveOge`, `cicekOge`, `yaprakOge`, `tepeOge`, `bulutOge`, `gunesOge`, `kus`, `hale`, `isinlar`,
  `parcaciklar`.
- `insan.mjs`: `insanYan(ctx, x, y, poz, {s, yon, olcek, alfa})` (y = ayak tabanı; yon 1 sağa bakar),
  `yuruyus(faz)` (yürüyüş pozu; bir döngüde `DONGU_YOLU` birim yol alınır: x'i fazla birlikte ilerletin ki ayak
  kaymasın), `DURUS`, `pozKaristir(a, b, t)`, `insanOn(ctx, x, y, poz, {s, arka})` (önden/arkadan; `kol:[sol,sağ]`
  açılır, `dirsek`, `bas`), `kucukInsan`. Poz alanları: `govde, bas, kalca[2], diz[2], bilek[2], omuz[2],
  dirsek[2], zipla, serbest` (serbest: ayaklar zemine oturtulmaz; diz çökme / oturma için). Figürün boyu `s = 1`'de
  ~384 px. Yakın çekimde `olcek: 2–3`.
- `sahne.mjs`: `kameraYolu([{t, x, y, z, e}])` (yakınlaşma log uzayında), `kameraIle(ctx, cam, fn, f)` (f:
  paralaks; dünya koordinatları nötr görünüşte (540, 960, z=1) ekranla aynıdır), `ekranda(cam, x, y, f)`,
  `salinim(t)`. Kompozisyon, film dokusu ve altyazı motorda; sahne yalnız kendi içeriğini çizer.
- `zaman.mjs`: `kb`, `ks`, `KELIMELER`, `CUMLELER`. `veri/zaman-tablosu.md`: her sahnenin kelime zamanları ve
  altyazıları.

### Sahne dosyası

`sahneler/sNN.mjs` → `export default { sesler: [...], gecis?: {tip}, hazirla() {...}, ciz(ctx, t) {...} }`.
`t` mutlak saniyedir. Zaman aralığı `sahneler/index.mjs`'teki `ZAMAN`'dadır (değiştirmeyin). Komşu sahneyle 0,4
sn çakışma vardır; motor varsayılan olarak çapraz geçiş yapar (`gecis: {tip: 'karisim'}`; başka: `'beyaz'`,
`'daire'`, `'kesme'`). Sahne, çakışma süresinde de tam kare çizmelidir. `ciz` her karede tüm ekranı kaplamalı:
kamera hareketinde boş kenar/beyaz şerit kalmasın (gök ve zemin tuvallerini yeterince büyük yapın).

- Ağır işi (sprite üretimi) `hazirla()`'da yapın. Tam çözünürlükte kare başına ≤ ~600 ms hedefleyin.
- `motor/` dosyalarını ve başka sahneleri DEĞİŞTİRMEYİN (paralel çalışılıyor). Gerekirse kendi yardımcılarınızı
  `sahneler/sNN-*.mjs` içine koyun. Motor fonksiyonu yetersizse kendi dosyanızda sarmalayın/kopyalayın.

## 4. Deneme ve öz denetim (zorunlu)

```bash
node render.mjs --png deneme/sNN --kareler 8.1,9.4,11.2          # tek kareler
node render.mjs --sahne sNN --png deneme/sNN --adim 0.5           # sahne boyunca her 0,5 sn
node render.mjs --sahne sNN --cikti deneme/sNN.mp4 --olcek 0.5 --ses   # yarım çözünürlük önizleme, sesli
```
PNG'leri Read aracıyla mutlaka **bakarak** inceleyin; PIL ile temas sayfası yapabilirsiniz. Her ipucu kelimesinde
ve her geçişte kareye bakın. Hareketi değerlendirmek için 0,1–0,2 sn aralıklı kare dizilerine bakın. Kontrol listesi:
kompozisyon ve odak, telefonda okunurluk, hareket eğrileri (giriş/çıkış yumuşak, taşmalı pop), ikincil hareket,
renk uyumu, kontur kalınlığı tutarlılığı, dikiş/artefakt yok, ekran kenarları dolu, altyazı bandı sakin, insan
figürü doğal (eklemler kopuk değil, ayak zemine basıyor, kayma yok), görsel tam kelimesinde giriyor.
Bir kez çalıştı diye bırakmayın: en az 3 tur bakıp düzeltin.

## 5. Sahneler arası süreklilik (devir teslim)

- s01 → s02: s01 sonunda nur küresi ekranın (540, ~860) noktasında, yarıçap ~150 px, sıcak açık zemin.
- s02 → s03: s02 sonunda marifet deseni (540, 900), R ≈ 400 px, soluk altın/krem ışık zemini üzerinde.
- s03 → s04: s03 sonunda gül (540, 900), R ≈ 300 px, tam açık, soluk pembe-krem buğulu zemin.
- s04 → s05: s04 sonunda altın halkalar (540, 900) merkezli yayılıp soluyor, açık krem zemin.
- s05 → s06: s05 sonunda kaynak sönmüş, simgeler gri, loş-soluk zemin. s06 şafakla açılır.
- s06 → s07: s06 sonunda adam (yan) nur altında, ağacın yanında, aydınlık yeşil manzara. s07 aynı dünyada başlar,
  sonra renkler çekilir.
- s07 → s08: s07 sonu gri, diz çökmüş adam. s08 gri-lila "perişan dünya".
- s08 → s09: s08 sonu: servet toz olup savrulmuş, adam yalnız oturuyor (gri).
- s09 → s10: s09 sonu: kuşbakışı devasa labirent, ortasında küçücük adam (gri).
- s10 → kapanış: s10 sonu aydınlık çarşı/bahçe; kapanışa beyaz nur parlamasıyla geçilir (kapanışı biz yaparız).

## 6. Ses efektleri

`sesler: [{ t, tur, guc, sure?, tekrar?, ara? }]` — t mutlak sn; guc 0..1 (miks yine kısık yapılır). Türler:
`kalem` (kalem cızırtısı, çizerek giriş), `firca`, `pop` (yumuşak), `whoosh` (kamera/geçiş), `nur` (sıcak ışıltılı
çınlama), `parilti`, `kanat`, `damla`, `ruzgar`, `gok` (uzak, yumuşak gök gürlemesi), `yagmur`, `kalp`, `zincir`,
`toz`, `adim`, `kapi`, `kus`, `para`. Seyrek ve zevkli: sahne başına ~4–10 ipucu.

## 7. Normal biçimli kelime anahtarları (indeks:anahtar)

Aynı anahtar tekrar ediyorsa `kb('anahtar', 2)`.

```
0:katiyen 1:bil 2:ki 3:hilkatin 4:en 5:yüksek 6:gayesi 7:ve 8:fıtratın 9:en 10:yüce 11:neticesi 12:imanı 13:billahtır
14:ve 15:insaniyetin 16:en 17:ali 18:mertebesi 19:ve 20:beşeriyetin 21:en 22:büyük 23:makamı 24:imanı 25:billah
26:içindeki 27:marifetullahtır 28:cin 29:ve 30:insin 31:en 32:parlak 33:saadeti 34:ve 35:en 36:tatlı 37:nimeti 38:o
39:marifetullah 40:içindeki 41:muhabbetullahtır 42:ve 43:ruhu 44:beşer 45:için 46:en 47:halis 48:sürur 49:ve 50:kalbi
51:insan 52:için 53:en 54:safi 55:sevinç 56:o 57:muhabbetullah 58:içindeki 59:lezzeti 60:ruhaniyedir 61:evet 62:bütün
63:hakiki 64:saadet 65:ve 66:halis 67:sürur 68:ve 69:şirin 70:nimet 71:ve 72:safi 73:lezzet 74:elbette
75:marifetullah 76:ve 77:muhabbetullahtadır 78:onlar 79:onsuz 80:olamaz 81:cenabı 82:hakkı 83:tanıyan 84:ve 85:seven
86:nihayetsiz 87:saadete 88:nimete 89:envara 90:esrara 91:ya 92:bilkuvve 93:veya 94:bilfiil 95:mazhardır 96:onu
97:hakiki 98:tanımayan 99:sevmeyen 100:nihayetsiz 101:şakavete 102:alama 103:ve 104:evhama 105:manen 106:ve
107:maddeten 108:müptela 109:olur 110:evet 111:şu 112:perişan 113:dünyada 114:avare 115:nevi 116:beşer 117:içinde
118:semeresiz 119:bir 120:hayatta 121:sahipsiz 122:hamisiz 123:bir 124:surette 125:aciz 126:miskin 127:bir
128:insan 129:bütün 130:dünyanın 131:sultanı 132:da 133:olsa 134:kaç 135:para 136:eder 137:işte 138:bu 139:avare
140:nevi 141:beşer 142:içinde 143:bu 144:perişan 145:fani 146:dünyada 147:insan 148:sahibini 149:tanımazsa
150:malikini 151:bulmazsa 152:ne 153:kadar 154:biçare 155:sergerdan 156:olduğunu 157:herkes 158:anlar 159:eğer
160:sahibini 161:bulsa 162:malikini 163:tanısa 164:o 165:vakit 166:rahmetine 167:iltica 168:eder 169:kudretine
170:istinad 171:eder 172:o 173:vahşetgah 174:dünya 175:bir 176:tenezzühgaha 177:döner 178:ve 179:bir
180:ticaretgah 181:olur
```

## 8. Senaryo (sahne sahne)

Aşağıdaki planlar yön gösterir; manaya daha güzel hizmet eden bir fikir bulursanız geliştirebilirsiniz, ama
ipucu kelimeleri, devir teslim ve kurallar bağlayıcıdır. Kelime zamanları: `veri/zaman-tablosu.md`.

### s01 (0–7,8) — yapıldı (örnek)
Boş filmde ufuk çizilir; tepeler ve büyük ağaç belirir (Kat'iyen bil ki) → çiçekler, kuşlar, bulutlar, güneş
(Hilkatin) → kamera ağacın tepesine çıkar (en yüksek gayesi) → taçta meyveler, tepede altın meyve (fıtratın en
yüce neticesi) → altın meyve nura döner (iman-ı billahtır).

### s02 (7,4–16,6) — "Ve insaniyetin en âlî mertebesi ve beşeriyetin en büyük makamı, iman-ı billah içindeki marifetullahtır."
- Başlangıç: s01'den gelen nur küresi (540, 860, r≈150). Küre yukarı süzülür ve küçülür (r≈90, y≈330); kamera
  geri çekilip aşağıda göğe doğru yükselen, krem taştan zarif bir **merdiven / basamaklı sekiler** dizisini açar
  (mertebe = basamak). Nur, merdivenin en üstünün üzerinde.
- 8,20 "insaniyetin": adam merdivenin dibinde belirir ve çıkmaya başlar (yan görünüş; basamakta adım başına
  kalça yükselir; ayak basamağa basar).
- 9,30 "en âlî mertebesi": kamera onu yukarı izler; geçtiği her basamakta küçük bir ışık yanar (her mertebe).
- 11,06 "beşeriyetin en büyük makamı": zirvede altın konturlu sivri bir **kemer (makam)**; adam kemerin altına
  varır ve durur; nur küresi kemerin içinde, üstünde.
- 13,18 "iman-ı billah": kamera nur küresine doğru itilir; küre büyüyüp ekranı doldurur (ışığın içine girilir).
- 13,92 "içindeki" → 14,68 "marifetullahtır": nurun içinde **marifet deseni** merkezden dışa çizilerek belirir,
  dolgu gelir, yavaşça döner, bütün çizgiler merkezde parlayan noktaya çıkar.
- Bitiş: marifet deseni (540, 900), R≈400, soluk altın-krem ışık zemininde.

### s03 (16,2–24,8) — "Cin ve insin en parlak saadeti ve en tatlı nimeti, o marifetullah içindeki muhabbetullahtır."
- Başlangıç: marifet deseni (540, 900, R≈400). Kamera geri çekilir: desen gökte, tepede parlayan bir madalyon olur.
- 17,02 "Cin": tepelerin ardında, uzakta soluk lila-mavi, saydam, dumansız ateş kıvrımları (cin) belirir.
- 17,42 "insin": önde tepelerde pek çok erkek figür (farklı ölçek/derinlik; yan ve önden; ayakta), hepsi madalyona
  dönük.
- 17,96 "en parlak saadeti": madalyon parlar, ışık kalabalığın üzerine yayılır, figürlerin göğüslerinde yumuşak
  ışık, kenar ışığı.
- 19,54 "en tatlı nimeti": üzerlerine yavaşça ışıklı altın çiçekler / taç yaprakları süzülerek yağar.
- 21,32 "o marifetullah": kamera hızla madalyona (desene) dalar, desen ekranı doldurur.
- 22,04 "içindeki": desenin merkezi açılır (iç rozet aralanır).
- 22,72 "muhabbetullahtır": merkezden **gül** açar (acilma 0→1); desen geri çekilip solar, gül hâkim olur.
- Bitiş: gül (540, 900), R≈300, tam açık, soluk pembe-krem buğu.

### s04 (24,4–34,8) — "Ve ruh-u beşer için en hâlis sürur ve kalb-i insan için en safi sevinç, o muhabbetullah içindeki lezzet-i ruhaniyedir."
- Başlangıç: gül (540, 900, R≈300). 25,28–25,72 "Ve ruh-u beşer": gül küçülerek adamın (önden, belden yukarı
  büyük plan, `insanOn` s≈2,4–2,8, olcek 3) göğsüne yerleşir; göğsünde yumuşak bir ışık (ruh) olur.
- 26,64 "en hâlis sürur": göğüsteki ışık nabız gibi parlar, ince ışık çizgileri yayılır; adamın başı hafifçe
  kalkar, kolları hafifçe açılır.
- 28,16 "kalb-i insan": kamera göğse yaklaşır; stilize (anatomik olmayan) bir **kalp** belirir (gül pembesi).
- 29,58 "en safi sevinç": kalbin içi berrak, saf bir suyla dolar (ışık yansımaları, küçük halkalar).
- 31,10 "o muhabbetullah": kalbin içinde gül yeniden belirir; kamera gülün merkezine iner.
- 31,86 "içindeki": gülün merkezinde altın bir **nektar damlası** oluşur.
- 32,62 "lezzet-i ruhaniyedir": damla parlar ve düşer; **altın halkalar** yayılarak ekranı doldurur.
- Bitiş: altın halkalar (540, 900) merkezli, açık krem zeminde soluyor.

### s05 (34,4–46,8) — "Evet, bütün hakiki saadet ve hâlis sürur ve şirin nimet ve safi lezzet, elbette marifetullah ve muhabbetullahtadır. Onlar, onsuz olamaz."
- Temiz, infografik bir düzen (yazısız). Üstte ortada kaynak: **marifet deseni madalyonu, merkezinde gül** (küçük,
  başta loş). Halkalar söner.
- Dört simge, kelimelerinde birer birer (taşmalı pop) alt yarıda bir yay üzerinde belirir (altyazı bandının
  üstünde kalın: y ≈ 1050–1300):
  36,28 "saadet" → ışık saçan bir **kandil**; 37,66 "sürur" → çiçekli dalda öten bir **kuş**; 39,00 "nimet" →
  yarılmış, taneleri görünen bir **nar**; 40,44 "lezzet" → **bal** (petek ve damla / bal kabı).
- 41,54 "elbette" → 42,02 "marifetullah" (desen halkası parlar) → 43,00 "muhabbetullahtadır" (merkezdeki gül
  parlar): kaynaktan dört simgeye eğri ışık iplikleri akar; simgeler canlanır, parlar.
- 44,86 "Onlar," → 45,24 "onsuz" → 45,64 "olamaz": kaynak söner/örtülür; iplikler kararır; simgeler griye döner
  (kandil söner, kuş susar, nar kurur, bal donuklaşır). Loş ve sessiz bir an.
- Bitiş: loş, gri simgeler.

### s06 (46,4–57,4) — "Cenab-ı Hakk'ı tanıyan ve seven, nihayetsiz saadete, nimete, envara, esrara ya bi'l-kuvve veya bilfiil mazhardır."
- Başlangıç: loşluktan şafak açılır: geniş manzara; adam (yan, sağa bakar) bir tepede, ufuktan ışık doğuyor.
- 47,80 "tanıyan": başını kaldırır; çevresindeki her şeyde (çiçek, ağaç, kuş) küçük ışık izleri belirir ve ince
  ışık çizgileriyle ufuktaki nura bağlanır (her şey Sahibini gösterir).
- 48,36 "ve seven": elini göğsüne koyar; göğsünde sıcak bir ışık.
- 49,18 "nihayetsiz saadete": kamera geniş çekilir: önünde ufka, sonsuza uzanan bir yol; yol boyunca küçülerek
  sonsuza giden kandiller.
- 50,98 "nimete": yol boyunca ağaçlar meyveye durur.
- 52,04 "envara": gökte yükselen nurlar (ışık zerreleri, fenerler).
- 52,88 "esrara": ufukta zarif kemerli küçük kapılar aralanır, içlerinden ışık sızar (sırlar).
- 54,16 "ya bi'l-kuvve": yakın plan: toprak kesitinde bir **tohum**; üstünde tam bir ağacın soluk, kesik çizgili
  hayali (potansiyel).
- 55,46 "veya bilfiil": tohum filizlenir, hayalin çizgilerini doldurarak gerçek ağaç olur, meyve verir (fiilen).
- 56,02 "mazhardır": yukarıdan adamın üzerine nur iner; adam ağacın yanında ışıkla yıkanır.

### s07 (57,0–67,6) — "Onu hakiki tanımayan, sevmeyen nihayetsiz şakavete, âlâma ve evhama manen ve maddeten müptela olur."
- 57,76 "Onu hakiki tanımayan": aynı dünyada bir adam ışığa sırtını döner, ters yöne (sola) yürür; yürüdükçe renk
  çekilir, gök gri-lilaya döner, tarama koyulaşır.
- 59,38 "sevmeyen": göğsündeki sıcak ışık titreyip söner.
- 60,50 "nihayetsiz şakavete": kamera çekilir: önünde sonsuza uzanan gri, sisli bir çorak ova; ağır bulutlar.
- 62,46 "âlâma": ayaklarının dibinden dikenli çalılar büyür, ona dolanır (acılar).
- 63,22 "ve evhama": çevresinde dönen koyu sis biçimleri, belirsiz büyük gölgeler (kuruntular). Yüz ve vahşet yok.
- 64,24 "manen": göğsünde koyu bir bulut; 64,90 "ve maddeten": dışarıdan üzerine ağır yağmur/yük; omuzları çöker.
- 65,62 "müptela olur": dizlerinin üstüne çöker; kamera yavaşça yaklaşır. Bitiş: gri, ıssız, loş.

### s08 (67,2–82,9) — "Evet, şu perişan dünyada, âvâre nev-i beşer içinde, semeresiz bir hayatta; sahipsiz, hâmisiz bir surette; âciz, miskin bir insan, bütün dünyanın sultanı da olsa kaç para eder."
- Palet gri-lila, soluk; altın yalnız servette.
- 67,97 "şu perişan dünyada": dağınık bir dünya: rüzgârda savrulan yapraklar ve kâğıtlar, eğri evler, kırık
  çitler, çatlak yol, rüzgâr çizgileri.
- 70,22 "âvâre nev-i beşer içinde": yüksekten bakış: bir meydanda rastgele yönlere yürüyen, birbirinin yolunu kesen,
  dönüp duran çok sayıda küçük adam (yürüyüş döngüleriyle).
- 72,34 "semeresiz bir hayatta": kuru toprakta meyvesiz, çıplak bir ağaç (s01'in meyveli ağacının karşıtı); son
  yaprak düşer.
- 74,44 "sahipsiz" → 75,33 "hâmisiz": geniş, boş bir ovada küçücük yalnız adam; rüzgâr ve yağmur yaklaşır,
  sığınak yok; kolunu yüzüne siper eder.
- 77,45 "âciz, miskin bir insan": daha yakın: yere büzülüp oturmuş, küçük, güçsüz.
- 79,53 "bütün dünyanın sultanı da olsa": birden başında taç; altında altın sikkeler ve hazineler yığını üstünde bir
  taht yükselir; kamera dramatik biçimde yükselir.
- 81,47 "kaç para eder": taht, taç ve altınlar gri toza dönüşüp rüzgârda savrulur; adam yine yalnız, yerde oturur.

### s09 (82,5–96,5) — "İşte bu âvâre nev-i beşer içinde, bu perişan fâni dünyada; insan, sahibini tanımazsa mâlikini bulmazsa ne kadar bîçare sergerdan olduğunu herkes anlar."
- 83,17 "İşte bu âvâre nev-i beşer içinde": uzun bir yolda farklı derinliklerde sağa sola yürüyen, hiçbir yere
  varmayan adamlar (yan görünüş, s08'den farklı kompozisyon); kimi kendi etrafında döner.
- 86,10 "bu perişan fâni dünyada": geçicilik: bir sıra çiçek açıp hemen solar, yapraklar düşer; çizimin parçaları
  bir **silgiyle silinir** gibi çıplak filme döner (fânilik).
- 88,53 "insan, sahibini tanımazsa": kuşbakışı **labirent**; içinde adam (kuşbakışı basit figür: saç dairesi ve
  omuzlar) çıkmaz bir yola girer.
- 90,79 "mâlikini bulmazsa": çevresinde her yöne bakan yazısız yön levhaları/oklar; adam dönüp durur.
- 92,97 "ne kadar bîçare sergerdan": labirent yavaşça döner, oklar fırıl fırıl; adam ellerini başına koyar.
- 94,93 "herkes anlar": kamera labirentten çok yükseğe çekilir: labirentin uçsuz bucaksızlığı ve adamın küçüklüğü
  apaçık görünür. Bitiş: kuşbakışı devasa gri labirent.

### s10 (96,1–110,9) — "Eğer sahibini bulsa mâlikini tanısa o vakit rahmetine iltica eder, kudretine istinad eder. O vahşetgâh dünya, bir tenezzühgâha döner ve bir ticaretgâh olur."
- Başlangıç: s09'un labirenti (gri). 96,75 "Eğer sahibini bulsa": bulutları yaran bir ışık huzmesi labirentteki
  adamın üzerine iner; labirent duvarları ışığa dönüşerek erir, ışığa giden düz bir yol açılır.
- 98,53 "mâlikini tanısa": yan görünüşe geçilir: adam başını kaldırır; çevresine renk dalga dalga geri gelir.
- 100,55 "rahmetine iltica eder": yumuşak, ışıklı bir rahmet yağmuru; kuru toprak yeşerir; adam koruyucu büyük bir
  ağacın / ışıklı bir sayvanın altına sığınır.
- 102,29 "kudretine istinad eder": sırtını sarsılmaz, heybetli bir dağa / kayaya dayar; sakin ve emin.
- 104,31 "O vahşetgâh dünya": geniş çekim: karanlık, ürkütücü bir yaban: sık, eğri ağaçlı koyu orman, karanlıkta
  birkaç çift parlayan göz, dikenler, sis (ölçülü).
- 106,21 "bir tenezzühgâha döner": merkezden yayılan bir renk dalgası koyu ormanı aydınlık bir gezinti bahçesine
  çevirir: çiçekler açar, yollar, bir çeşme, kuşlar; adam keyifle yürür.
- 107,79 "ve bir ticaretgâh olur": bahçe zarif, canlı bir **çarşıya** uzanır: kemerler, tenteli tezgâhlar,
  fenerler, terazi, alışveriş eden adamlar; adam bir sepet taşır. Işıklı ve sıcak. 110,9'a kadar sürer
  (110,3'ten sonra beyaz nur parlamasıyla kapanışa geçilir).
