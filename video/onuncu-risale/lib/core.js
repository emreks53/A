// Çekirdek: matematik, yumuşatma eğrileri, gürültü, tohumlu rastgele, renk araçları.
'use strict';
const W = 1080, H = 1920, FPS = 30;

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, v) => clamp((v - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const E = {
  lin: (t) => t,
  in2: (t) => t * t,
  out2: (t) => 1 - (1 - t) * (1 - t),
  io2: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  in3: (t) => t * t * t,
  out3: (t) => 1 - Math.pow(1 - t, 3),
  io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out4: (t) => 1 - Math.pow(1 - t, 4),
  io4: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  out5: (t) => 1 - Math.pow(1 - t, 5),
  ioSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t, s = 1.55) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outBackSoft: (t) => E.outBack(t, 1.15),
  // yaylı oturma: hafif taşma, sönümlü
  spring: (t, k = 7.5, d = 5.2) => (t >= 1 ? 1 : 1 - Math.exp(-d * t) * Math.cos(k * t)),
};
// zaman aralığında 0→1 ilerleme (yumuşatmalı)
const tw = (t, t0, t1, ease = E.io3) => ease(inv(t0, t1, t));
// içeri-çıkış penceresi: [a,b] arasında görünür, kenarlarda f saniyelik geçiş
const win = (t, a, b, fi = 0.3, fo = 0.3, ei = E.out3, eo = E.in2) =>
  t < a || t > b + fo ? 0 : t < a + fi ? ei(inv(a, a + fi, t)) : t > b ? 1 - eo(inv(b, b + fo, t)) : 1;

// ---- tohumlu rastgele (mulberry32)
function rng(seed) {
  let a = seed >>> 0 || 1;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a0, b0) => a0 + (b0 - a0) * r();
  r.int = (a0, b0) => Math.floor(a0 + (b0 - a0 + 1) * r());
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < 0.5 ? -1 : 1);
  r.gauss = () => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return r;
}
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// ---- 2B değer gürültüsü + fbm (tohumlu)
function makeNoise(seed = 1) {
  const r = rng(seed); const P = new Uint8Array(512); const G = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; G[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = P[i]; P[i] = P[j]; P[j] = t; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const v = (x, y) => G[P[(P[x & 255] + y) & 511]];
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; // 0..1
  };
  n.fbm = (x, y, oct = 4) => { let s = 0, amp = 0.5, f = 1, norm = 0; for (let i = 0; i < oct; i++) { s += amp * n(x * f, y * f); norm += amp; amp *= 0.5; f *= 2.03; } return s / norm; };
  return n;
}
const NOISE = makeNoise(7);

// ---- renk
const hex2rgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb2hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const rgba = (h, a) => { const [r, g, b] = hex2rgb(h); return `rgba(${r},${g},${b},${a})`; };
const s2l = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const l2s = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
function rgb2oklab(r, g, b) {
  r = s2l(r); g = s2l(g); b = s2l(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function oklab2rgb(L, a, b) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [l2s(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), l2s(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), l2s(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
}
const hex2lch = (h) => { const [L, a, b] = rgb2oklab(...hex2rgb(h)); return [L, Math.hypot(a, b), Math.atan2(b, a)]; };
const lch2hex = (L, C, Hh) => rgb2hex(...oklab2rgb(L, C * Math.cos(Hh), C * Math.sin(Hh)));
// tonu kaydır: dL açıklık, kC doygunluk çarpanı, dh derece
function shade(h, dL = 0, kC = 1, dh = 0) { const [L, C, Hh] = hex2lch(h); return lch2hex(clamp(L + dL, 0, 1), C * kC, Hh + (dh * Math.PI) / 180); }
function mix(h1, h2, t) { const a = rgb2oklab(...hex2rgb(h1)), b = rgb2oklab(...hex2rgb(h2)); return rgb2hex(...oklab2rgb(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t))); }
// boya tonu basamakları: koyu → açık. Gölgeler maviye-mora, ışıklar sarıya kayar (akrilik ressam paleti).
function ramp(base, n = 5, o = {}) {
  const { span = 0.36, cool = 26, warm = 14, chromaDark = 1.08, chromaLight = 0.82, lift = 0 } = o;
  const [L, C, Hh] = hex2lch(base);
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1); const d = t - 0.5;
    const L2 = clamp(L + lift + d * span, 0.04, 0.985);
    const coolH = 4.71; // ~270°
    const warmH = 1.57; // ~90°
    const towards = (h0, h1, amt) => { let dd = h1 - h0; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI; return h0 + clamp(amt, -Math.abs(dd), Math.abs(dd)) * Math.sign(dd); };
    let h2 = d < 0 ? towards(Hh, coolH, (-d * 2 * cool * Math.PI) / 180) : towards(Hh, warmH, (d * 2 * warm * Math.PI) / 180);
    const C2 = C * (d < 0 ? lerp(1, chromaDark, -d * 2) : lerp(1, chromaLight, d * 2));
    out.push(lch2hex(L2, C2, h2));
  }
  return out;
}

// ---- yol (Path2D) yardımcıları
// yumuşak kapalı eğri (Catmull-Rom → Bezier)
function smoothPath(pts, closed = true, tension = 0.5, path = new Path2D()) {
  const n = pts.length; if (n < 2) return path;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1) | 0]);
  path.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const k = tension / 3;
    path.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  if (closed) path.closePath();
  return path;
}
function ellipsePath(cx, cy, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); return p; }
function rectPath(x, y, w, h, r = 0) { const p = new Path2D(); if (r) p.roundRect(x, y, w, h, r); else p.rect(x, y, w, h); return p; }
// gürültüyle bozulmuş daire / blob
function blobPts(cx, cy, rx, ry, n = 24, amp = 0.06, seed = 1, rot = 0) {
  const r = rng(seed); const ph = r() * 10; const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2; const k = 1 + amp * (Math.sin(a * 3 + ph) * 0.5 + Math.sin(a * 5 + ph * 1.7) * 0.3 + (r() - 0.5) * 0.4);
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return out;
}
const blob = (cx, cy, rx, ry, n, amp, seed, rot) => smoothPath(blobPts(cx, cy, rx, ry, n, amp, seed, rot));

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
