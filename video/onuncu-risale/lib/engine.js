// Zaman çizelgesi: perdeler (act) sırayla/örtüşerek çizilir; üstte tuval dokusu ve alt yazı.
'use strict';
const Engine = (() => {
  const acts = [];
  let align = null;
  // kelime zamanı: WT(i) → başlangıç, WE(i) → bitiş (hizalama.json)
  const WT = (i) => (align ? (ONSET[i] ?? align[i].start) : 0);
  const WE = (i) => (align ? align[i].end : 0);
  let ONSET = {};
  function add(act) { acts.push(act); acts.sort((a, b) => (a.z ?? 0) - (b.z ?? 0)); }
  async function init() {
    align = window.HIZALAMA; const on = window.BASLANGIC;
    for (const k of Object.keys(on)) if (!k.startsWith('_')) ONSET[+k] = on[k];
    Subs.build(align, ONSET);
    await document.fonts.load('italic 500 66px "EB Garamond"');
    await document.fonts.load('500 66px "EB Garamond"');
    await document.fonts.load('600 66px "EB Garamond"');
  }
  async function render(ctx, t) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = Paint.UNDER; ctx.fillRect(0, 0, W, H); ctx.restore();
    for (const a of acts) {
      if (t < a.t0 || t >= a.t1) continue;
      ctx.save(); await a.draw(ctx, t, t - a.t0); ctx.restore();
    }
    const photo = acts.find((a) => a.photo && t >= a.t0 && t < a.t1);
    Post.apply(ctx, { weave: photo ? photo.weaveAt?.(t) ?? 0 : 0.55, vignette: photo ? photo.vigAt?.(t) ?? 0 : 1 });
    for (const a of acts) if (a.overlay && t >= a.t0 && t < a.t1) { ctx.save(); await a.overlay(ctx, t, t - a.t0); ctx.restore(); }
    Subs.draw(ctx, t);
  }
  return { add, init, render, WT, WE, get align() { return align; }, acts };
})();
const WT = (i) => Engine.WT(i), WE = (i) => Engine.WE(i);

// ---- kamera: dünya koordinatından ekrana (merkez cx,cy; ölçek z; dönüş r)
function camApply(ctx, cam) {
  ctx.translate(W / 2, H / 2); if (cam.r) ctx.rotate(cam.r); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
}
// anahtar karelerle kamera: keys = [[t, {x,y,z,r}, ease], ...]
function camAt(keys, t) {
  if (t <= keys[0][0]) return { ...keys[0][1] };
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i], [t1, b, ease] = keys[i + 1];
    if (t <= t1) {
      const p = (ease || E.io3)(inv(t0, t1, t));
      // yakınlaştırmada logaritmik ara değer (doğal hissettirir)
      const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), p));
      return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), z, r: lerp(a.r || 0, b.r || 0, p) };
    }
  }
  return { ...keys[keys.length - 1][1] };
}
// hafif el kamerası salınımı (çok küçük; nefes alan kadraj)
const breathe = (t, amp = 1) => ({ x: Math.sin(t * 0.7) * 3 * amp + Math.sin(t * 1.9) * 1.2 * amp, y: Math.cos(t * 0.53) * 3 * amp, r: Math.sin(t * 0.41) * 0.0018 * amp });

// ---- fırça silme geçişi: büyük düz fırça darbeleri ekranı süpürür. p: 0..1, seed sabit.
const BrushWipe = (() => {
  const cache = {};
  function strokes(seed) {
    if (cache[seed]) return cache[seed];
    const r = rng(seed); const list = [];
    const rows = 15; const rh = H / rows;
    for (let i = 0; i < rows; i++) {
      const y = (i + 0.5) * rh + (r() - 0.5) * 30; const d = r() < 0.5 ? -1 : 1; const base = (i / rows) * 0.3 + r() * 0.1;
      // her satırda biri kalın, ikisi ince üç darbe: kenarlar düzensiz, boyalı görünür
      list.push({ y, d, delay: base, w: rh * (1.35 + r() * 0.25), ang: (r() - 0.5) * 0.07 });
      list.push({ y: y - rh * (0.42 + r() * 0.15), d: -d, delay: base + 0.06 + r() * 0.08, w: rh * (0.62 + r() * 0.2), ang: (r() - 0.5) * 0.09 });
      list.push({ y: y + rh * (0.42 + r() * 0.15), d, delay: base + 0.1 + r() * 0.1, w: rh * (0.55 + r() * 0.2), ang: (r() - 0.5) * 0.09 });
    }
    return (cache[seed] = list);
  }
  // maske yolu: geçişin ilerleyişine göre darbelerin kapladığı alan
  function mask(p, seed = 5) {
    const path = new Path2D(); const L = strokes(seed);
    for (const s of L) {
      const q = E.io2(clamp((p * 1.12 - s.delay) / 0.5));
      if (q <= 0) continue;
      const len = (W + 400) * q; const x0 = s.d > 0 ? -200 : W + 200;
      const sh = Paint.strokeShape(len, s.w, rng(Math.floor(s.y)));
      const m = new DOMMatrix().translate(x0 + (s.d * len) / 2, s.y).rotate((s.ang * 180) / Math.PI);
      path.addPath(sh, m);
    }
    return path;
  }
  return { mask };
})();
