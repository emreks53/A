# Üslup ve teknik rehber (sahne yazarları için)

Proje kökü: `/tmp/claude-0/-home-user-A/6aea1c78-0ca0-5fa6-8d2c-56009bb4c71b/scratchpad/video/`
Dikey Shorts videosu 1080×1920, 30 fps, ~122 sn. Arkada Risale-i Nur'dan bir metin okunuyor (Yirmi Beşinci Lem'a, hastalar risalesi). Kurzgesagt modelinde: okunan cümlenin manası o anda ekranda dinamik, animasyonlu, görselli olarak yansır. Tema uzay DEĞİL; metnin manasından (insan, ömür, dünya, hastalık, uyanış) gelir.

## Hedef kalite
Kurzgesagt'ın kalitesine yetişmek ve geçmek. Her kare kendi başına bir akrilik tablo gibi güzel olmalı; hareket akıcı, zamanlama okumaya tam oturmalı. "Yeter" değil, "olabilecek en iyi".

## Görsel üslup: Atölye Stil Kataloğu S-042 "Akrilik"
- Doygun, parlak renkler (kobalt mavisi → turkuaz; fıstık yeşili → sarı-yeşil; mor-pembe gölgeler; turuncu-kırmızı astar). Palet `engine/paint.js` içindeki `PAL`'dadır ama onunla sınırlı değilsin.
- Işık-gölge degradesiz, keskin sınırlı DÜZ TON katlarıyla kurulur (`P.toneShape`, `P.toneUnion`). Sınırlarda darbeler birbirine geçer.
- Düz uçlu fırçanın keskin kenarlı darbeleri: gökte/zeminde uzun yatay (`P.bandFill`, `P.fillStrokes`), dikey nesnelerde dikey, yuvarlak nesnelerde biçimi izleyen. Çiçek/yaprak/bulutlar tek tek darbelerle (`P.stroke`, `P.curveStroke`).
- Biçimlerin çevresinde yer yer görünen ince turuncu-kırmızı astar (`toneShape`/`toneUnion` bunu `rim` ile kendiliğinden yapar).
- Kıl izleri ve boya sırtları darbelerde kendiliğinden var. Tuval bezi dokusu, saten parlama ve köşe kararması SON İŞLEMDE (`P.finish`) bütün kareye eklenir: sen ekleme.
- Varsayılan ışık sol üstten (lightAng ≈ -2.3 rad). Gölgeler soğuk (mor-mavi), ışıklar sıcak.
- Kontur çizgisi kullanma (çok küçük ayrıntılar hariç). Siyah yerine koyu lacivert/mor (`#1D1B2E`).
- Örnek: `scenes/s01.js` + `scenes/_room.js` (referans sahne) ve `tests/t3.png` (ortak nesneler). Önce bunlara bak.

## Dinamiklik ölçüsü (çok önemli)
- Kurzgesagt ölçüsünde: her ifade/cümle parçasına (≈2–4 sn) bir görsel fikir. Her KELİMEYE ayrı görsel YOK — izleyici yetişemez.
- Yeni öğeler `C.pop()` (aşmalı ölçek) ya da yumuşak kayma/solma ile gelir; ikincil hareket hep sürer (nefes alan kamera `R.breathe`, salınan dallar, süzülen parçacıklar, yürüyen figür). 1.5 sn'den uzun donuk kare olmasın, ama telaş da olmasın.
- Görsel vuruşlar kelimenin başladığı ana oturmalı (zamanlar aşağıda ve `timing.json`'da, ±0.03 sn hassasiyet). Vuruşu kelimeden 0.1–0.2 sn önce başlatmak doğal durur.
- Kamera: yavaş itme/kaydırma/eğme (`R.camera`), sahne içinde 1–2 kamera hareketi yeter.

## Kompozisyon (9:16)
- Ana özne y≈250–1250 arasında. Kelime anlamları (alt yazılar) motor tarafından y≈1290–1560 bandında çizilir (en yeni satır 1482'de, eskiler yukarı kayar). Anlamın göründüğü anlarda bu bantta önemli ayrıntı ya da yazıyla karışacak çok parlak/karışık şey olmasın; zemin, çimen, su gibi sakin dokular olabilir.
- Alt %8 (y>1770) uygulama arayüzüne yakın: önemli şey koyma.
- Ekranda HİÇBİR yazı/etiket/harf yok (anlamları motor yazar). Rakam, kelime, Arapça harf, sahte yazı kullanma.

## İnsan figürü
- Yalnız `M.drawMan(ctx, pose, opts)` (engine/man.js). Erkek, sade, ayrıntısız ama normal oranlı. Kıyafet rengini değiştirme (fildişi gömlek, lacivert pantolon) — bütün videoda aynı adam. İstisna: yaşlılık `age:0..1` (saç-sakal ağarır), `cane:true`.
- Pozlar: `M.pose({...})`, yürüyüş `M.walk(faz, {stride, age})`, geçiş `M.lerpPose(a,b,t)`. Açılar radyan (`C.deg()`): armN/armF (dikeyden ileri +), elbowN/F (+ önkolu öne/yukarı), thighN/F, kneeN/F (+ baldır geri), torso (ileri eğilme +), head (aşağı +), eye 0..1, brow (+ endişe), mouth (+ gülümseme), grip, rot (tüm gövde dönüşü), px/py (kök kayması, boy oranı).
- `opts`: `x, y` (ayakların bastığı nokta), `h` (boy, px), `dir` (1 sağa, -1 sola), `light` (ışık açısı), `age`, `cane`, `parts` (yalnız bazı parçalar), `behind/mid/front(ctx, skel, h)` geri çağrıları (eline nesne vermek için; iskelet noktaları yerel koordinatta, `M.toWorld` ile dünyaya çevrilir).
- Figür hatasız olmalı: ayak yere bassın (kayma yok), eklemler doğal açılarda, kollar gövdeye saplanmasın, el nesneyi gerçekten tutsun.
- Yürüyüşte faz hızı adım uzunluğuyla uyumlu olsun (ayak kaymasın): adım başına kök ilerlemesi ≈ 0.55·h·stride.

## Din ve saygı
- Allah, melek, peygamber tasviri YOK. "Seni yaratanı düşün" gibi yerlerde yalnız gök, ışık, yıldızlar, doğa.
- Kabir ve ölüm sakin, saygılı, korkutucu değil: servi, basit mezar taşı, alacakaranlık.
- Kur'an ya da yazı tasviri sahnelerde yok.

## Teknik kurallar
- Sahne modülü: `module.exports = { init?(), draw(ctx, t, lt, sc), sfx: [...] }`. `t` küresel saniye, `lt = t - sc.start`. Sahne, kendi aralığının biraz dışındaki `t` değerlerinde de düzgün çizebilmeli (geçişler önceki/sonraki sahneyi 0.25–0.5 sn taşır).
- Determinizm: `Math.random`/`Date` YASAK. `C.rng(seed)` kullan, tohumları sabit tut (karede değişmesin; titreme olmasın).
- Performans: kare başına hedef < 300 ms. Hareket etmeyen büyük katmanları (gök, tepeler, duvar) `R.cached(key, w, h, fn)` ile bir kez çiz, sonra `drawImage` ile (kamerayla) bas. Kareye her seferinde binlerce darbe çizme.
- Darbe tohumları nesneye bağlı olsun ki nesne hareket edince doku "kaynamasın" (titremesin).
- Sadece kendine verilen dosyalara yaz: `scenes/sNN.js` ve gerekirse `scenes/_sNN_*.js`. `engine/` ve başka sahneleri DEĞİŞTİRME (okuyabilir, içe aktarabilirsin). Motorda bir hata/eksik görürsen kendi dosyanda geçici çözüm yap ve son mesajında bildir.
- Ses efektleri: `sfx: [{ t: <küresel sn>, type, gain }]`. Türler: tick, rustle, whoosh, pop, chime, sparkle, wind, thud, swell, bubble, coin, birds, sand, crack, bell, heartbeat, water, step, paper, glass, flame, rumble. gain 0.1–0.6 (göreli; miks hepsini konuşmanın çok altında tutar). Az ve yerinde kullan (sahne başına 2–6).

## Deneme ve gözden geçirme
- `node render.js scene sNN 8` → `render/scene_sNN.png` (8 karelik temas sayfası, anlamlar dahil).
- `node render.js frames sNN 4 render/frames_sNN` → tam boy kareler; `node render.js still 12.34 out.png` → tek kare.
- `node render.js sheet 12.4 15.6 12 out.png` → istediğin aralık (geçişleri de görmek için komşu sahnelerin sınırlarını da kontrol et).
- Görselleri Read aracıyla aç ve dürüstçe eleştir: Kurzgesagt kalitesinde mi? Akrilik üslup tutarlı mı? İnsan hatasız mı? Zamanlama kelimelere oturuyor mu? Anlam bandı temiz mi? En az 3 tur yinele.
- Hızı ölç: `time node render.js still <t>` (ilk kare önbellek kurar; ikinci karenin süresine bak).
