// Çekirdek yardımcılar: tuval boyutu, tohumlu rastgele, gürültü, yumuşatma eğrileri, renk.
'use strict';

const W = 1080, H = 1920, FPS = 30;

// ---------- tohumlu rastgele ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function strSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
class Rng {
  constructor(seed) { this.f = mulberry32(typeof seed === 'string' ? strSeed(seed) : (seed >>> 0) || 1); }
  next() { return this.f(); }
  range(a, b) { return a + (b - a) * this.f(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
  sign() { return this.f() < 0.5 ? -1 : 1; }
  gauss() { let u = 0, v = 0; while (!u) u = this.f(); while (!v) v = this.f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  chance(p) { return this.f() < p; }
}
const rng = (seed) => new Rng(seed);

// ---------- gürültü (değer gürültüsü, yumuşak) ----------
function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function noise2(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct = 4, s = 0) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { sum += amp * noise2(x * f, y * f, s + i * 17); norm += amp; amp *= 0.5; f *= 2.03; }
  return sum / norm;
}
// 1B düzgün gürültü (titreşim, nefes)
function noise1(x, s = 0) { return noise2(x, 0.5, s); }

// ---------- sayısal ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const invlerp = (a, b, x) => clamp((x - a) / (b - a));
const remap = (x, a, b, c, d) => lerp(c, d, invlerp(a, b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const deg = (d) => d * Math.PI / 180;

// ---------- yumuşatma ----------
const E = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  inOutBack: (t, s = 1.70158 * 1.525) => (t < 0.5 ? (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2 : (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2),
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  smooth: (t) => t * t * (3 - 2 * t),
  smoother: (t) => t * t * t * (t * (t * 6 - 15) + 10),
};
// Kurzgesagt tarzı "pop": 0'dan aşarak 1'e oturan ölçek
function pop(t, t0, dur = 0.45, s = 1.9) { const k = seg(t, t0, t0 + dur); return k <= 0 ? 0 : E.outBack(k, s); }
// giriş-çıkış penceresi: [a,b] aralığında görünür, kenarlarda in/out süresiyle yumuşar
function win(t, a, b, fin = 0.35, fout = 0.35) { return Math.min(E.smooth(seg(t, a, a + fin)), 1 - E.smooth(seg(t, b - fout, b))); }
// sönümlü yay (kısa sarsıntı/oturma)
function spring(t, t0, freq = 3, damp = 5) { const x = t - t0; if (x < 0) return 0; return 1 - Math.exp(-damp * x) * Math.cos(TAU * freq * x); }

// ---------- renk ----------
function hex2rgb(h) {
  if (Array.isArray(h)) return h;
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb2hex(c) { return '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); }
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]); }
function rgba(c, a) { const A = hex2rgb(c); return `rgba(${A[0] | 0},${A[1] | 0},${A[2] | 0},${a})`; }
function rgb2hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
  }
  return [h, s, l];
}
function hsl2rgb([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255];
}
// açık/koyu (l kaydırma), doygunluk, ton döndürme
function shade(c, dl = 0, ds = 0, dh = 0) {
  const [h, s, l] = rgb2hsl(hex2rgb(c));
  return rgb2hex(hsl2rgb([(h + dh + 1) % 1, clamp(s + ds), clamp(l + dl)]));
}
// akrilik gölge: koyulaştır + soğuk (mavi-mor) tarafa kaydır; ışık: aç + sıcak tarafa kaydır
function coolShadow(c, amt = 0.18) { return mix(shade(c, -amt, 0.05), '#3B2F7A', amt * 0.9); }
function warmLight(c, amt = 0.14) { return mix(shade(c, amt, 0.02), '#FFE7A8', amt * 0.9); }

module.exports = {
  W, H, FPS, Rng, rng, strSeed, hash2, noise1, noise2, fbm, clamp, lerp, invlerp, remap, seg, TAU, deg, E, pop, win, spring,
  hex2rgb, rgb2hex, mix, rgba, shade, coolShadow, warmLight, rgb2hsl, hsl2rgb,
};
