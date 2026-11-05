# Motor (engine) — sahne geliştiricileri için kısa başvuru

Video: 1080×1920, 30 fps, 72.41 s. Her kare `E.renderFrame(i)` ile **belirlenimli** çizilir (aynı t → aynı görüntü).
Tarayıcı: Chromium (yazılım Skia), Canvas 2D. Sahne kodu düz JavaScript (modül değil, global `E` ve `S` kullanır).

## Dosyalar
- `index.html` — tüm scriptleri sırayla yükler (sahne dosyaları sabit: `scenes/A_…` … `scenes/K_…`, `scenes/gecisler.js`).
- `engine/timing.js` — `TIMING.words[]`, `TIMING.phrases[]`, `TIMING.glosses[]` (zorunlu hizalama, saniye). Elle düzenlemeyin (`tools/make_timing.py`).
- `engine/core.js` — `E` (matematik, easing, gürültü, renk, katman/ışıma, kamera, sahne & geçiş kaydı, post: bloom/vinyet/gren, gloss alt yazıları).
- `engine/shapes.js` — `S` (ortak temel çizimler: çiçek, yaprak, kelebek, parıltı, toz, ışın, rozet, bulut, ışık).
- `engine/assets_*.js` — paylaşılan kahraman öğeler (HeroRose vb.; `storyboard.md` §1).
- `storyboard.md` — **bağlayıcı** senaryo: her sekans, vuruş (beat) tablosu, renkler, devir-teslim (handoff) sözleşmeleri.

## Sahne kaydı
```js
E.scene({
  id: 'B_bahce', t0: 2.30, t1: 6.70,          // pencere (örtüşmeler geçiş bölgesidir)
  async setup() { /* bir kez: offscreen sprite üretimi vb. (isteğe bağlı) */ },
  prepare(t) { return [/* bu karede gereken görsel URL'leri */]; },   // isteğe bağlı
  post: { bloom: 0.45, vignette: 0.3, grain: 0.06 },                  // ya da (t) => ({...})
  draw(ctx, t, s) {
    // t: video saniyesi (global). s.lt = t - t0, s.d = süre, s.p(a,b,'outBack') = E.p(t,a,b,…)
    // Tam kare çizin (arka plan dahil). ctx dönüşümü birim matristir; save/restore sizin işiniz.
  },
});
```
Geçişler `scenes/gecisler.js` içinde (entegrasyonda): `E.transition({from, to, at, dur, type: 'fade'|'light'|'dip'|'zoom'|'iris'|'blur'|'wipe'|'cut', x, y, color})`.
Storyboard'daki **eşleşmeli devir-teslimler** (ör. "petal → honey drop") genellikle sahnelerin *kendi içinde* yapılır: iki sahne
örtüşme penceresinde aynı nesneyi aynı ekran konumunda çizer, varsayılan kısa çapraz geçiş birleştirir.

## Sık kullanılanlar (`E`)
- Zaman: `E.p(t, t0, t1, ease)` → 0..1 · `E.env(t, t0, t1, up, down)` → 0→1→0 · `E.osc(t, period, phase)`
- Easing: `E.ease.{linear,inOutCubic,outCubic,outQuint,outExpo,inOutSine,outBack,inOutBack,outElastic,spring,…}`
- Matematik: `E.clamp, E.lerp, E.remap(v,a,b,c,d), E.smooth, E.smoother, E.TAU, E.dist`
- Rastgele (**Math.random YASAK**): `E.hash(i, seed)` → [0,1) · `E.rand(i, seed, a, b)` · `E.rng(seed)()` · `E.noise(x, seed)` (−1..1) · `E.noise2(x,y,seed)` · `E.fbm(x,y,seed,oct)`
- Renk: `E.mix(a,b,t[,alpha])` · `E.rgba(hex,a)` · `E.shade(hex, +açık/−koyu)` · `E.lin(ctx,x0,y0,x1,y1,[[0,'#hex'],[1,'#hex',alpha]])` · `E.rad(ctx,x,y,r0,r1,stops)` · palet `E.PAL`
- Kamera: `E.cam(ctx, {x,y,zoom,rot}, fn)` (dünya (x,y) ekran merkezine) · `E.parallax(ctx, cam, depth, fn)` (0 uzak … 1 kahraman … >1 ön plan) · `E.drift(t)` (organik süzülme)
- Katman: `E.layer(ctx, (l)=>{…}, {blur, alpha, op, lo})` — l ekran koordinatlarında (dönüşüm devralınmaz). `lo:true` yarım çözünürlük: bulanık arka/ön plan için **hızlı** (alan derinliği).
- Işıma: `E.glow(ctx, (c)=>{…}, {blur, alpha, sharp, lo, op})` — çizimi bulanık+'lighter' olarak ekler (mevcut dönüşümü korur).
- `E.at(ctx, x, y, scale, rot, fn)` · `E.canvas(w,h)` → {c,x} (setup'ta sprite üretmek için)
- `E.glossActive(t)` → alt yazı görünüyorsa true (bant %64–82, y≈1229–1574: o sırada sakin tutun).

## Kurallar
- `ctx.filter='blur()'` ve `shadowBlur` dönüşümden etkilenmez (piksel). Büyük bulanıklıkları `E.layer(..., {lo:true})` ile yapın.
- Performans hedefi: kare başına ≤ ~600 ms çizim. Tam ekran bulanık katmanı kare başına 2–4 ile sınırlayın; karmaşık statik
  çizimleri `setup()` içinde offscreen sprite'a önceden çizin ve `drawImage` ile kullanın.
- Metin YOK (yalnız motorun gloss alt yazıları ve K'deki künye). İnsan/insan uzvu YOK (el, göz, yüz, siluet). Kadın/kız YOK.
- Sahne `t` aralığının tamamında (örtüşmeler dahil) tam kare çizmeli; `t0`'dan önce/sonra da çağrılabilir (`?only=`), kırpın.
- Kenarlar: telefon arayüzü için üst %8 ve sağ kenar 90 px'te kritik öğe koymayın.

## Araçlar
- Önizleme: `node tools/onizleme.mjs --range 2.3:6.7:0.25 --only B_bahce --out out/onizleme/B.jpg --cols 6 --w 220`
  (`--t 3.1,4.2` tek tek; `--full` tam çözünürlüklü kareleri de kaydeder; `--noglosses`). Çıktıyı Read ile **görün**.
- Tam render: `node tools/render.mjs --workers 3 --fmt png` → `out/kareler/`.
