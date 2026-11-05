/* Onuncu Söz · Tezyinat — çizim motoru (çekirdek)
 * Her kare t (saniye) için tamamen belirlenimli (deterministic) çizilir: aynı t → aynı görüntü.
 * Koordinatlar her zaman 1080 x 1920 (9:16). Sahneler E.scene(...) ile kaydolur.
 *
 * ÖNEMLİ (Canvas 2D):
 *  - ctx.filter = 'blur(Npx)' ve ctx.shadowBlur dönüşüm matrisinden ETKİLENMEZ (piksel cinsinden).
 *  - Math.random() KULLANMAYIN: E.rng(seed) / E.hash(i, seed) kullanın (her kare yeniden çizilir).
 */
(function () {
  'use strict';
  const W = 1080, H = 1920, FPS = 30;
  const E = (window.E = {
    W, H, FPS, CX: W / 2, CY: H / 2,
    scenes: [], transitions: [], ready: false,
    params: new URLSearchParams(location.search),
  });
  E.only = E.params.get('only');
  E.noGloss = E.params.has('noglosses');
  E.noPost = E.params.has('nopost');

  /* ---------------- matematik ---------------- */
  const clamp = (E.clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v));
  const lerp = (E.lerp = (a, b, t) => a + (b - a) * t);
  E.inv = (a, b, v) => (v - a) / (b - a);
  E.remap = (v, a, b, c, d) => c + (d - c) * clamp((v - a) / (b - a));
  E.smooth = (t) => (t = clamp(t), t * t * (3 - 2 * t));
  E.smoother = (t) => (t = clamp(t), t * t * t * (t * (t * 6 - 15) + 10));
  E.TAU = Math.PI * 2;
  E.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

  const ease = (E.ease = {
    linear: (t) => t,
    inQuad: (t) => t * t, outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: (t) => t * t * t, outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inQuart: (t) => t * t * t * t, outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
    inSine: (t) => 1 - Math.cos((t * Math.PI) / 2), outSine: (t) => Math.sin((t * Math.PI) / 2),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutExpo: (t) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
    inOutBack: (t, s = 1.70158 * 1.525) => t < 0.5 ? (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2 : (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2,
    outElastic: (t) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
    // yumuşak yay (Kurzgesagt tarzı hafif taşma + oturma)
    spring: (t) => 1 - Math.exp(-6.5 * t) * Math.cos(9.5 * t),
  });

  /** p(t, t0, t1, easing): t0→t1 aralığında 0..1 ilerleme (kırpılmış, yumuşatılmış). easing: isim ya da fonksiyon */
  E.p = (t, t0, t1, e = 'inOutCubic') => {
    const f = typeof e === 'function' ? e : ease[e] || ease.inOutCubic;
    return f(clamp((t - t0) / (t1 - t0)));
  };
  /** 0→1→0 tepe: t0'da başlar, t0+up'ta 1, t1-down'da 1, t1'de 0 */
  E.env = (t, t0, t1, up = 0.3, down = 0.3, e = 'inOutSine') => Math.min(E.p(t, t0, t0 + up, e), 1 - E.p(t, t1 - down, t1, e));
  /** sinüs nabız (0..1) */
  E.osc = (t, period = 1, phase = 0) => 0.5 + 0.5 * Math.sin(((t / period) + phase) * E.TAU);

  /* ---------------- belirlenimli rastgele + gürültü ---------------- */
  E.rng = (seed = 1) => {
    let a = seed >>> 0 || 1;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  E.hash = (i, seed = 0) => {
    let h = (Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed | 0, 0xc2b2ae35)) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  E.rand = (i, seed, a = 0, b = 1) => a + (b - a) * E.hash(i, seed);
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  /** 1B pürüzsüz gürültü (-1..1) */
  E.noise = (x, seed = 0) => {
    const i = Math.floor(x), f = x - i;
    const g0 = E.hash(i, seed) * 2 - 1, g1 = E.hash(i + 1, seed) * 2 - 1;
    return lerp(g0 * f, g1 * (f - 1), fade(f)) * 2;
  };
  /** 2B değer gürültüsü (-1..1) */
  E.noise2 = (x, y, seed = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const h = (a, b) => E.hash(a * 374761393 + b * 668265263, seed) * 2 - 1;
    const u = fade(xf), v = fade(yf);
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
  };
  /** fbm: katmanlı gürültü */
  E.fbm = (x, y, seed = 0, oct = 4) => {
    let s = 0, a = 0.5, f = 1;
    for (let o = 0; o < oct; o++) { s += a * E.noise2(x * f, y * f, seed + o * 17); f *= 2; a *= 0.5; }
    return s;
  };

  /* ---------------- renk ---------------- */
  const hexCache = new Map();
  E.rgb = (c) => {
    if (Array.isArray(c)) return c;
    if (hexCache.has(c)) return hexCache.get(c);
    if (c.startsWith('rgb')) { const m = c.match(/[\d.]+/g).slice(0, 3).map(Number); hexCache.set(c, m); return m; }
    let h = c.replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    hexCache.set(c, v); return v;
  };
  /** iki rengi karıştır → 'rgb(...)' ya da alfa verilirse 'rgba(...)' */
  E.mix = (a, b, t, alpha) => {
    const A = E.rgb(a), B = E.rgb(b);
    const r = Math.round(lerp(A[0], B[0], t)), g = Math.round(lerp(A[1], B[1], t)), bl = Math.round(lerp(A[2], B[2], t));
    return alpha === undefined ? `rgb(${r},${g},${bl})` : `rgba(${r},${g},${bl},${alpha})`;
  };
  E.rgba = (c, a = 1) => { const v = E.rgb(c); return `rgba(${v[0]},${v[1]},${v[2]},${a})`; };
  /** açıklaştır (t>0) / koyulaştır (t<0) */
  E.shade = (c, t) => (t >= 0 ? E.mix(c, '#ffffff', t) : E.mix(c, '#000000', -t));
  E.hexOf = (c) => '#' + E.rgb(c).map((v) => v.toString(16).padStart(2, '0')).join('');
  /** çok duraklı gradyan: stops = [[0,'#hex'],[1,'#hex',alpha?]] */
  E.lin = (ctx, x0, y0, x1, y1, stops) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const s of stops) g.addColorStop(clamp(s[0]), s[2] === undefined ? s[1] : E.rgba(s[1], s[2]));
    return g;
  };
  E.rad = (ctx, x, y, r0, r1, stops, x1, y1) => {
    const g = ctx.createRadialGradient(x, y, r0, x1 === undefined ? x : x1, y1 === undefined ? y : y1, r1);
    for (const s of stops) g.addColorStop(clamp(s[0]), s[2] === undefined ? s[1] : E.rgba(s[1], s[2]));
    return g;
  };

  /** Ortak palet (storyboard.md'deki renk senaryosuyla uyumlu tutun) */
  E.PAL = {
    ivory: '#FFF7E8', cream: '#F7EBD3', parchment: '#EADBC0',
    gold: '#F2C14E', goldLight: '#FFE3A1', goldDeep: '#C8922A', amber: '#F59E3B',
    rose: '#E2637A', roseLight: '#F6A5B3', roseDeep: '#B23A55', coral: '#F2836B',
    leaf: '#3FA36B', leafLight: '#7CCB8A', leafDeep: '#1F6B4E', mint: '#A8E6C1',
    sky: '#6FB7E9', skyLight: '#BFE3F7', teal: '#167C80', tealDeep: '#0F4C5C',
    night: '#13213D', navy: '#1B2A4A', indigo: '#2E2A6B', lavender: '#9D8DF1', violet: '#5B3F8C',
    cold: '#4A6FA5', coldDeep: '#22334F', ash: '#8C96A8',
    peach: '#F6B48F', dawn: '#FFD3A5', plum: '#6B2E5C',
    risale: '#D45A63', risaleLight: '#E7848A', risaleDeep: '#A8343F',
  };

  /* ---------------- tuval (canvas) yardımcıları ---------------- */
  E.canvas = (w = W, h = H) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); return { c, x, w, h };
  };
  // Katman havuzu: iç içe katmanlar için yığın
  const pool = { full: [], half: [], depthF: 0, depthH: 0 };
  function acquire(kind) {
    const list = pool[kind], d = kind === 'full' ? pool.depthF++ : pool.depthH++;
    if (!list[d]) list[d] = kind === 'full' ? E.canvas(W, H) : E.canvas(W / 2, H / 2);
    const b = list[d]; if (b.x.reset) b.x.reset(); b.x.setTransform(1, 0, 0, 1, 0, 0); b.x.globalAlpha = 1; b.x.globalCompositeOperation = 'source-over'; b.x.filter = 'none';
    b.x.clearRect(0, 0, b.w, b.h); return b;
  }
  function release(kind) { if (kind === 'full') pool.depthF--; else pool.depthH--; }

  /**
   * layer(ctx, fn, opts): fn(lctx) ayrı bir katmana çizer, sonra ctx'e
   * opts: {blur:px, alpha, op:'source-over'|'lighter'|'screen'|..., lo:true (yarım çözünürlük — bulanık katmanlar için hızlı)}
   * Katman, çağrının o anki dönüşümünü DEVRALMAZ: fn içinde ekran koordinatlarında (1080x1920) çizin.
   */
  E.layer = (ctx, fn, opts = {}) => {
    const lo = !!opts.lo, kind = lo ? 'half' : 'full';
    const b = acquire(kind);
    if (lo) b.x.setTransform(0.5, 0, 0, 0.5, 0, 0);
    try { fn(b.x, b); } finally {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = (opts.alpha === undefined ? 1 : opts.alpha) * (ctx.__alpha || 1);
      ctx.globalCompositeOperation = opts.op || 'source-over';
      const blur = opts.blur ? (lo ? opts.blur / 2 : opts.blur) : 0;
      if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(2)}px)`;
      ctx.drawImage(b.c, 0, 0, W, H);
      ctx.restore(); release(kind);
    }
  };

  /** Işıma (glow): fn'i bulanık + 'lighter' olarak bir kez, sonra net olarak çizer */
  E.glow = (ctx, fn, { blur = 30, alpha = 0.8, sharp = true, lo = true, op = 'lighter' } = {}) => {
    E.layer(ctx, (l) => { const m = ctx.getTransform(); if (lo) l.setTransform(m.a / 2, m.b / 2, m.c / 2, m.d / 2, m.e / 2, m.f / 2); else l.setTransform(m); fn(l); }, { blur, alpha, op, lo });
    if (sharp) fn(ctx);
  };

  /** Kamera: dünya (x,y) noktası ekran merkezine, zoom ve dönme ile. fn(ctx) içinde dünya koordinatları. */
  E.cam = (ctx, cam, fn) => {
    ctx.save();
    ctx.translate(W / 2 + (cam.ox || 0), H / 2 + (cam.oy || 0));
    if (cam.rot) ctx.rotate(cam.rot);
    const z = cam.zoom || 1; ctx.scale(z, z);
    ctx.translate(-(cam.x === undefined ? W / 2 : cam.x), -(cam.y === undefined ? H / 2 : cam.y));
    fn(ctx); ctx.restore();
  };
  /** Paralaks: depth 0 = sonsuz uzak (sabit), 1 = kamerayla birebir, >1 = ön plan (daha hızlı) */
  E.parallax = (ctx, cam, depth, fn) => {
    const z = 1 + ((cam.zoom || 1) - 1) * depth;
    const cx = W / 2 + ((cam.x === undefined ? W / 2 : cam.x) - W / 2) * depth;
    const cy = H / 2 + ((cam.y === undefined ? H / 2 : cam.y) - H / 2) * depth;
    E.cam(ctx, { x: cx, y: cy, zoom: z, rot: (cam.rot || 0) * depth, ox: cam.ox, oy: cam.oy }, fn);
  };
  /** Kısa yol: dönüşümle çiz */
  E.at = (ctx, x, y, s = 1, r = 0, fn) => { ctx.save(); ctx.translate(x, y); if (r) ctx.rotate(r); if (s !== 1) ctx.scale(s, s); fn(ctx); ctx.restore(); };
  /** Kamera sarsıntısı yerine çok hafif "el kamerası" süzülmesi (organik) */
  E.drift = (t, amp = 6, speed = 0.25, seed = 3) => ({ x: E.noise(t * speed, seed) * amp, y: E.noise(t * speed, seed + 9) * amp, r: E.noise(t * speed * 0.7, seed + 21) * 0.004 });

  /** Görseller (PNG dizileri vb.) */
  const imgCache = new Map();
  E.loadImage = (url) => {
    if (imgCache.has(url)) return imgCache.get(url).p;
    const img = new Image(); img.decoding = 'sync';
    const p = new Promise((res) => { img.onload = () => res(img); img.onerror = () => { console.warn('img fail', url); res(null); }; });
    img.src = url; imgCache.set(url, { img, p, used: 0 }); return p;
  };
  E.img = (url) => { const e = imgCache.get(url); return e && e.img.complete && e.img.naturalWidth ? e.img : null; };
  E.dropImagesExcept = (keep) => { for (const [k] of imgCache) if (!keep.has(k)) imgCache.delete(k); };

  /* ---------------- sahne kaydı ---------------- */
  /**
   * E.scene({ id, t0, t1, setup?(), prepare?(t) → url[] , draw(ctx, t, s), post?: {bloom, vignette, grain} | (t)=>({...}) })
   * draw: ekrana tam kare çizmeli (arka plan dahil). s yardımcıları: s.lt (yerel zaman), s.d (süre), s.p(a,b,e) = E.p(t,a,b,e)
   */
  E.scene = (def) => { E.scenes.push(def); return def; };
  /**
   * E.transition({ from, to, at, dur, type, x?, y?, color? })
   * type: 'fade' | 'light' | 'dip' | 'zoom' | 'iris' | 'blur' | 'wipe' | 'cut'
   */
  E.transition = (def) => { E.transitions.push(def); return def; };

  E.activeScenes = (t) => {
    if (E.only) return E.scenes.filter((s) => s.id === E.only);
    return E.scenes.filter((s) => t >= s.t0 && t < s.t1);
  };

  function sceneHelper(sc, t) {
    return { t0: sc.t0, t1: sc.t1, lt: t - sc.t0, d: sc.t1 - sc.t0, p: (a, b, e) => E.p(t, a, b, e), env: (a, b, u, d, e) => E.env(t, a, b, u, d, e) };
  }
  function drawScene(sc, ctx, t) {
    ctx.save();
    try { sc.draw(ctx, t, sceneHelper(sc, t)); }
    catch (err) { console.error('scene error', sc.id, err); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#f0f'; ctx.fillRect(0, 0, W, 40); }
    ctx.restore();
  }
  function postOf(sc, t) {
    const d = { bloom: 0.35, vignette: 0.32, grain: 0.06 };
    if (!sc || !sc.post) return d;
    const p = typeof sc.post === 'function' ? sc.post(t) : sc.post;
    return Object.assign(d, p);
  }

  /* ---------------- geçişler ---------------- */
  function applyTransition(ctx, tr, A, B, t, sa, sb) {
    const k = clamp((t - tr.at) / tr.dur);
    const type = tr.type || 'fade';
    const bufA = acquire('full'), bufB = acquire('full');
    drawScene(sa, bufA.x, t); drawScene(sb, bufB.x, t);
    ctx.save();
    const fx = tr.x === undefined ? W / 2 : tr.x, fy = tr.y === undefined ? H / 2 : tr.y;
    if (type === 'cut') {
      ctx.drawImage(k < 0.5 ? bufA.c : bufB.c, 0, 0);
    } else if (type === 'fade') {
      ctx.drawImage(bufA.c, 0, 0); ctx.globalAlpha = ease.inOutSine(k); ctx.drawImage(bufB.c, 0, 0);
    } else if (type === 'blur') {
      const e = ease.inOutSine(k);
      ctx.filter = `blur(${(e * 18).toFixed(1)}px)`; ctx.drawImage(bufA.c, 0, 0);
      ctx.filter = `blur(${((1 - e) * 18).toFixed(1)}px)`; ctx.globalAlpha = e; ctx.drawImage(bufB.c, 0, 0);
    } else if (type === 'light' || type === 'dip') {
      const col = tr.color || (type === 'light' ? '#FFF6E2' : '#0B1020');
      if (k < 0.5) { ctx.drawImage(bufA.c, 0, 0); ctx.globalAlpha = ease.inQuad(k * 2); }
      else { ctx.drawImage(bufB.c, 0, 0); ctx.globalAlpha = 1 - ease.outQuad((k - 0.5) * 2); }
      if (type === 'light') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = E.rad(ctx, fx, fy, 0, H * 0.95, [[0, '#FFFFFF'], [0.45, col], [1, E.mix(col, '#F2C14E', 0.35)]]);
      } else ctx.fillStyle = col;
      ctx.fillRect(0, 0, W, H);
    } else if (type === 'zoom') {
      // A, odak noktasına doğru büyüyerek kaybolur; B küçükten (0.82) açılır
      const e = ease.inOutCubic(k);
      ctx.save(); ctx.translate(fx, fy); ctx.scale(1 + e * (tr.zoomA || 2.2), 1 + e * (tr.zoomA || 2.2)); ctx.translate(-fx, -fy);
      ctx.filter = `blur(${(e * 10).toFixed(1)}px)`; ctx.drawImage(bufA.c, 0, 0); ctx.restore();
      ctx.save(); ctx.globalAlpha = E.smooth(E.remap(k, 0.25, 0.8, 0, 1)); const sB = lerp(tr.zoomB || 0.82, 1, e);
      ctx.translate(fx, fy); ctx.scale(sB, sB); ctx.translate(-fx, -fy);
      ctx.filter = `blur(${((1 - e) * 8).toFixed(1)}px)`; ctx.drawImage(bufB.c, 0, 0); ctx.restore();
    } else if (type === 'iris') {
      ctx.drawImage(bufA.c, 0, 0);
      const R = ease.inOutCubic(k) * Math.hypot(W, H) * 1.05;
      const m = acquire('full');
      m.x.drawImage(bufB.c, 0, 0); m.x.globalCompositeOperation = 'destination-in';
      m.x.fillStyle = E.rad(m.x, fx, fy, Math.max(0, R - 120), R + 1, [[0, '#000', 1], [1, '#000', 0]]);
      m.x.fillRect(0, 0, W, H);
      ctx.drawImage(m.c, 0, 0); release('full');
    } else if (type === 'wipe') {
      ctx.drawImage(bufA.c, 0, 0);
      const ang = tr.angle === undefined ? -Math.PI / 2 : tr.angle; // varsayılan: aşağıdan yukarı
      const m = acquire('full');
      m.x.drawImage(bufB.c, 0, 0); m.x.globalCompositeOperation = 'destination-in';
      const dx = Math.cos(ang), dy = Math.sin(ang), L = Math.hypot(W, H);
      const e = ease.inOutCubic(k), cx = W / 2 - dx * L / 2 + dx * L * e, cy = H / 2 - dy * L / 2 + dy * L * e;
      const g = m.x.createLinearGradient(cx - dx * 160, cy - dy * 160, cx + dx * 160, cy + dy * 160);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      m.x.fillStyle = g; m.x.fillRect(0, 0, W, H);
      ctx.drawImage(m.c, 0, 0); release('full');
    }
    ctx.restore();
    release('full'); release('full');
    return k;
  }

  /* ---------------- son işlem (post) ---------------- */
  let grainTiles = null, vignetteC = null, bloomA = null, bloomB = null;
  function initPost() {
    grainTiles = [];
    for (let k = 0; k < 6; k++) {
      const g = E.canvas(540, 960), id = g.x.createImageData(540, 960), r = E.rng(1000 + k);
      for (let i = 0; i < id.data.length; i += 4) {
        // yaklaşık gauss gren
        const v = 128 + ((r() + r() + r() - 1.5) * 95);
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
      }
      g.x.putImageData(id, 0, 0); grainTiles.push(g.c);
    }
    vignetteC = E.canvas(W, H);
    const vg = vignetteC.x.createRadialGradient(W / 2, H * 0.47, H * 0.28, W / 2, H * 0.5, H * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.6, 'rgba(0,0,0,0.35)'); vg.addColorStop(1, 'rgba(0,0,0,1)');
    vignetteC.x.fillStyle = vg; vignetteC.x.fillRect(0, 0, W, H);
    bloomA = E.canvas(W / 4, H / 4); bloomB = E.canvas(W / 4, H / 4);
  }
  function bloom(ctx, src, strength) {
    if (strength <= 0.001) return;
    const a = bloomA.x, b = bloomB.x, w = W / 4, h = H / 4;
    a.globalCompositeOperation = 'copy'; a.filter = 'none'; a.globalAlpha = 1; a.drawImage(src, 0, 0, w, h);
    // parlak bölgeleri vurgula (x^3 benzeri eşik)
    a.globalCompositeOperation = 'multiply'; a.drawImage(bloomA.c, 0, 0); a.drawImage(bloomA.c, 0, 0);
    b.globalCompositeOperation = 'copy'; b.filter = 'blur(5px)'; b.drawImage(bloomA.c, 0, 0);
    b.globalCompositeOperation = 'lighter'; b.filter = 'blur(16px)'; b.globalAlpha = 0.9; b.drawImage(bloomA.c, 0, 0); b.globalAlpha = 1; b.filter = 'none';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = clamp(strength, 0, 1.5);
    ctx.drawImage(bloomB.c, 0, 0, W, H); if (strength > 1) { ctx.globalAlpha = strength - 1; ctx.drawImage(bloomB.c, 0, 0, W, H); }
    ctx.restore();
  }
  function post(ctx, cfg, frame) {
    if (E.noPost) return;
    bloom(ctx, ctx.canvas, cfg.bloom);
    if (cfg.vignette > 0) { ctx.save(); ctx.globalAlpha = cfg.vignette; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(vignetteC.c, 0, 0); ctx.restore(); ctx.save(); ctx.globalAlpha = cfg.vignette * 0.55; ctx.drawImage(vignetteC.c, 0, 0); ctx.restore(); }
    if (cfg.grain > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = cfg.grain;
      const tile = grainTiles[frame % grainTiles.length], ox = (E.hash(frame, 77) * 300) | 0, oy = (E.hash(frame, 78) * 300) | 0;
      ctx.translate(-ox, -oy); ctx.drawImage(tile, 0, 0, 540 * 2.6, 960 * 2.6);
      ctx.restore();
    }
  }

  /* ---------------- anlam alt yazıları (gloss) ---------------- */
  const G = (E.gloss = {
    y: 1376, size: 74, lineH: 84, size2: 66, lineH2: 78, maxW: 900, font: '"Cormorant Garamond"', weight: 600,
    color: '#FFF8EC', inDur: 0.42, outDur: 0.36,
  });
  let glossBuf = null, lumBuf = null;
  /** alt yazı bandının ortalama parlaklığı (0..1): parlak zeminde yazı koyu kahveye döner */
  function bandLuma(ctx) {
    if (!lumBuf) { const c = document.createElement('canvas'); c.width = 48; c.height = 16; lumBuf = { c, x: c.getContext('2d', { willReadFrequently: true }) }; }
    const x = lumBuf.x; x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'copy'; x.filter = 'none'; x.globalAlpha = 1;
    x.drawImage(ctx.canvas, 140, G.y - 120, 800, 200, 0, 0, 48, 16);
    const d = x.getImageData(0, 0, 48, 16).data; let s = 0;
    for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return s / (d.length / 4) / 255;
  }
  function wrapLines(x, text, maxW) {
    const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) { const tryS = cur ? cur + ' ' + w : w; if (x.measureText(tryS).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryS; }
    if (cur) lines.push(cur);
    // iki satırda dengeli böl
    if (lines.length === 2) {
      let best = null; const ws = text.split(' ');
      for (let i = 1; i < ws.length; i++) { const a = ws.slice(0, i).join(' '), b = ws.slice(i).join(' '); const m = Math.max(x.measureText(a).width, x.measureText(b).width); if (m <= maxW && (!best || m < best.m)) best = { a, b, m }; }
      if (best) return [best.a, best.b];
    }
    return lines;
  }
  E.glossActive = (t) => (window.TIMING ? TIMING.glosses.some((g) => t >= g.in - 0.1 && t <= g.out + 0.4) : false);
  function drawGloss(ctx, g, t) {
    const kin = clamp((t - g.in) / G.inDur), kout = clamp((t - g.out) / G.outDur);
    if (kin <= 0 || kout >= 1) return;
    const ein = ease.outCubic(kin), eout = ease.inCubic(kout);
    const a = ein * (1 - eout);
    const dy = (1 - ein) * 26 - eout * 16;
    const blur = (1 - ein) * 7 + eout * 6;
    const track = (1 - ein) * 7 + eout * 3;
    if (!glossBuf) glossBuf = E.canvas(W, 420);
    const b = glossBuf.x; b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, W, 420);
    const multi = g.text.includes('\n');
    const size = multi ? G.size2 : G.size, lineH = multi ? G.lineH2 : G.lineH;
    b.font = `${G.weight} ${size}px ${G.font}`; b.textAlign = 'center'; b.textBaseline = 'alphabetic';
    b.letterSpacing = `${(1.2 + track).toFixed(2)}px`;
    const lines = multi ? g.text.split('\n') : wrapLines(b, g.text, G.maxW);
    const n = lines.length, baseY = 210 - ((n - 1) * lineH) / 2 + size * 0.32;
    // ana yazı (fildişi; çok parlak zeminde derin sıcak kahve), ince sıcak altın parıltı süpürmesi ile
    const dark = E.smooth(E.remap(bandLuma(ctx), 0.73, 0.79, 0, 1));
    b.fillStyle = E.mix(G.color, '#3A2316', dark);
    lines.forEach((ln, i) => b.fillText(ln, W / 2, baseY + i * lineH));
    const sweep = clamp((t - g.in - 0.05) / 0.95);
    if (sweep > 0 && sweep < 1) {
      b.globalCompositeOperation = 'source-atop';
      const sx = lerp(-200, W + 200, ease.inOutSine(sweep));
      const gr = b.createLinearGradient(sx - 160, 0, sx + 160, 0);
      gr.addColorStop(0, 'rgba(255,214,140,0)'); gr.addColorStop(0.5, 'rgba(255,214,140,0.85)'); gr.addColorStop(1, 'rgba(255,214,140,0)');
      b.fillStyle = gr; b.fillRect(0, 0, W, 420); b.globalCompositeOperation = 'source-over';
    }
    const top = G.y - 210 + dy;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    // okunabilirlik: geniş yumuşak gölge + dar gölge (kutu yok)
    const lightPass = dark < 0.999, darkPass = dark > 0.001;
    if (lightPass) {
      ctx.globalAlpha = a * 0.62 * (1 - dark); ctx.filter = `blur(${(16 + blur).toFixed(1)}px) brightness(0)`; ctx.drawImage(glossBuf.c, 0, top + 4);
      ctx.globalAlpha = a * 0.55 * (1 - dark); ctx.filter = `blur(${(3 + blur).toFixed(1)}px) brightness(0)`; ctx.drawImage(glossBuf.c, 0, top + 2);
      ctx.globalAlpha = a * 0.35 * (1 - dark); ctx.filter = `blur(${(10 + blur).toFixed(1)}px)`; ctx.globalCompositeOperation = 'screen'; ctx.drawImage(glossBuf.c, 0, top);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (darkPass) { // parlak zeminde: yazının çevresinde yumuşak açık hale (kutu değil)
      ctx.globalAlpha = a * 0.7 * dark; ctx.filter = `blur(${(14 + blur).toFixed(1)}px) brightness(0) invert(1)`; ctx.drawImage(glossBuf.c, 0, top + 2);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; ctx.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : 'none';
    ctx.drawImage(glossBuf.c, 0, top);
    ctx.restore();
  }
  function drawGlosses(ctx, t) {
    if (E.noGloss || !window.TIMING) return;
    for (const g of TIMING.glosses) drawGloss(ctx, g, t);
  }

  /* ---------------- kare çizimi ---------------- */
  let mainCtx = null;
  E.frameTime = (i) => i / FPS;
  E.duration = () => (window.TIMING ? TIMING.duration : 72.41);
  E.totalFrames = () => Math.round(E.duration() * FPS);

  E.init = async () => {
    const c = document.getElementById('c'); c.width = W; c.height = H;
    mainCtx = c.getContext('2d', { alpha: false });
    initPost();
    await document.fonts.ready;
    // yazı tiplerini zorla yükle
    const fams = ['600 40px "Cormorant Garamond"', '500 40px "Cormorant Garamond"', '700 40px "Cormorant Garamond"', 'italic 500 40px "Cormorant Garamond"', '400 40px Amiri', '700 40px Amiri', '40px "Amiri Quran"', '600 40px Cinzel'];
    await Promise.all(fams.map((f) => document.fonts.load(f, 'AaŞşİıĞğÖöÜüÇçâîû الرحمن')));
    E.scenes.sort((a, b) => a.t0 - b.t0);
    for (const s of E.scenes) if (s.setup) { try { await s.setup(); } catch (err) { console.error('setup error', s.id, err && err.stack || err); s.draw = () => { throw err; }; } }
    E.ready = true;
  };

  /**
   * Hareket bulanıklığı: hızlı hareketli karelerde n alt kare (180° deklanşör) çizilip ortalanır.
   * Yalnız render aracı çağırır (tools/hareket-bulanikligi.py → out/mb.json).
   */
  let accBuf = null;
  E.renderFrameMB = async (i, n = 4, shutter = 0.5) => {
    if (!accBuf) accBuf = E.canvas(W, H);
    const a = accBuf.x; a.setTransform(1, 0, 0, 1, 0, 0); a.filter = 'none'; a.globalCompositeOperation = 'source-over';
    for (let k = 0; k < n; k++) {
      const t = (i + shutter * ((k + 0.5) / n - 0.5)) / FPS;
      await E.renderFrame(i, t);
      a.globalAlpha = 1 / (k + 1); a.drawImage(mainCtx.canvas, 0, 0);
    }
    mainCtx.setTransform(1, 0, 0, 1, 0, 0); mainCtx.globalAlpha = 1; mainCtx.globalCompositeOperation = 'copy'; mainCtx.filter = 'none';
    mainCtx.drawImage(accBuf.c, 0, 0); mainCtx.globalCompositeOperation = 'source-over';
    return true;
  };

  /** i. kareyi çizer (async: gerekli görselleri yükler) */
  E.renderFrame = async (i, tOverride) => {
    const t = tOverride === undefined ? i / FPS : tOverride;
    const frame = i;
    const act = E.activeScenes(t);
    // görsel ön yükleme
    const urls = [];
    for (const s of act) if (s.prepare) urls.push(...(s.prepare(t) || []));
    if (urls.length) await Promise.all(urls.map(E.loadImage));
    const ctx = mainCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    let cfg;
    if (act.length === 0) { cfg = postOf(null, t); }
    else if (act.length === 1) { drawScene(act[0], ctx, t); cfg = postOf(act[0], t); }
    else {
      const [sa, sb] = act.slice(-2);
      let tr = E.transitions.find((x) => x.from === sa.id && x.to === sb.id);
      if (!tr) tr = { from: sa.id, to: sb.id, at: sb.t0, dur: Math.max(0.05, sa.t1 - sb.t0), type: 'fade' };
      let k;
      if (t < tr.at) { drawScene(sa, ctx, t); k = 0; }
      else if (t >= tr.at + tr.dur) { drawScene(sb, ctx, t); k = 1; }
      else k = applyTransition(ctx, tr, null, null, t, sa, sb);
      const pa = postOf(sa, t), pb = postOf(sb, t);
      cfg = { bloom: lerp(pa.bloom, pb.bloom, k), vignette: lerp(pa.vignette, pb.vignette, k), grain: lerp(pa.grain, pb.grain, k) };
    }
    post(ctx, cfg, frame);
    drawGlosses(ctx, t);
    return true;
  };
})();
