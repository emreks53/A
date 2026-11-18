// Temel araçlar: tuval, yazı tipleri, tohumlu rastgele, yumuşatma (easing), matematik.
import { createCanvas, GlobalFonts, Path2D, loadImage } from '@napi-rs/canvas';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export { createCanvas, Path2D, loadImage };

export const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const W = 1080; // video eni
export const H = 1920; // video boyu (9:16)
export const FPS = 30;

let fontlarYuklendi = false;
export function fontlariYukle() {
  if (fontlarYuklendi) return;
  const dir = path.join(KOK, 'yazitipi');
  for (const f of readdirSync(dir)) if (f.endsWith('.ttf')) GlobalFonts.registerFromPath(path.join(dir, f));
  fontlarYuklendi = true;
}

export function tuval(w, h) {
  const c = createCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
  return c;
}

// ---------------------------------------------------------------- tohumlu rastgele (mulberry32)
export function rng(tohum = 1) {
  let a = (typeof tohum === 'string' ? hashStr(tohum) : tohum) >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.ara = (a0, b0) => a0 + (b0 - a0) * r();
  r.tam = (a0, b0) => Math.floor(a0 + (b0 - a0 + 1) * r());
  r.sec = (dizi) => dizi[Math.floor(r() * dizi.length)];
  r.normal = () => {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return r;
}
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------------------------------------------------------------- değer gürültüsü (2B, yumuşak)
export function gurultu2(tohum = 7) {
  const r = rng(tohum);
  const P = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  const G = new Float32Array(256);
  for (let i = 0; i < 256; i++) G[i] = r() * 2 - 1;
  const f = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const a = G[P[P[X] + Y]], b = G[P[P[X + 1] + Y]], c = G[P[P[X] + Y + 1]], d = G[P[P[X + 1] + Y + 1]];
    const u = f(xf), v = f(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; // -1..1
  };
  n.fbm = (x, y, ok = 4) => {
    let s = 0, amp = 0.5, fr = 1, top = 0;
    for (let i = 0; i < ok; i++) {
      s += amp * n(x * fr, y * fr);
      top += amp;
      amp *= 0.5;
      fr *= 2.03;
    }
    return s / top;
  };
  return n;
}

// ---------------------------------------------------------------- matematik
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const ters = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const harita = (v, a, b, c, d) => lerp(c, d, clamp(ters(a, b, v)));
export const smooth = (a, b, v) => {
  const t = clamp(ters(a, b, v));
  return t * t * (3 - 2 * t);
};
export const TAU = Math.PI * 2;
export const dereceRad = (d) => (d * Math.PI) / 180;

// ---------------------------------------------------------------- yumuşatmalar
export const ease = {
  lin: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outBackHafif: (t) => ease.outBack(t, 1.1),
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  // yaylı oturma: hafif sekme ile 1'e yerleşir (Kurzgesagt "pop")
  yay: (t, sonum = 6.5, frekans = 2.2) => (t >= 1 ? 1 : 1 - Math.exp(-sonum * t) * Math.cos(frekans * TAU * t * 0.5 + 0) * (1 - t * 0.0)),
};

/** t anında [t0, t0+sure] aralığındaki ilerleme (0..1), yumuşatmalı */
export function an(t, t0, sure, e = ease.inOutCubic) {
  if (sure <= 0) return t >= t0 ? 1 : 0;
  return e(clamp((t - t0) / sure));
}
/** Giriş-çıkış zarfı: t0'da girer (giris sürede), t1'de çıkar (cikis sürede) */
export function zarf(t, t0, t1, giris = 0.4, cikis = 0.4, e = ease.inOutCubic) {
  return Math.min(an(t, t0, giris, e), 1 - an(t, t1 - cikis, cikis, e));
}
/** Pop: 0'dan 1'e hafif taşmayla (ölçek için) */
export function pop(t, t0, sure = 0.5) {
  if (t <= t0) return 0;
  const u = clamp((t - t0) / sure);
  return ease.outBack(u, 1.6);
}

// ---------------------------------------------------------------- renk
export function hex(h) {
  const s = h.replace('#', '');
  const v = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
export function rgba(c, a = 1) {
  const [r, g, b] = typeof c === 'string' ? hex(c) : c;
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}
export function renkKaristir(c1, c2, t) {
  const a = typeof c1 === 'string' ? hex(c1) : c1;
  const b = typeof c2 === 'string' ? hex(c2) : c2;
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
export function renkHex(c) {
  const [r, g, b] = c.map((v) => clamp(Math.round(v), 0, 255));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
/** Renk rampası: [[0,'#..'],[0.5,'#..'],[1,'#..']] üzerinden t'deki renk */
export function rampa(duraklar, t) {
  t = clamp(t);
  for (let i = 1; i < duraklar.length; i++) {
    if (t <= duraklar[i][0]) {
      const [t0, c0] = duraklar[i - 1];
      const [t1, c1] = duraklar[i];
      return renkKaristir(c0, c1, ters(t0, t1, t));
    }
  }
  return hex(duraklar[duraklar.length - 1][1]);
}
