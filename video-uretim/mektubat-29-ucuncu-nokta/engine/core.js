// core.js — gouache (S-041 Guaj) drawing toolkit for the video engine.
// All drawing happens on a 1080x1920 Canvas2D, then a WebGL pass (post.js) adds paper, relief and edge break.

export const W = 1080, H = 1920, FPS = 30;

// ---------------------------------------------------------------- math
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invlerp = (a, b, x) => clamp((x - a) / (b - a));
export const remap = (x, a, b, c, d) => lerp(c, d, invlerp(a, b, x));
export const TAU = Math.PI * 2;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const smoother = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const E = {
  linear: (t) => clamp(t),
  inQuad: (t) => (t = clamp(t)) * t,
  outQuad: (t) => { t = clamp(t); return 1 - (1 - t) * (1 - t); },
  inOutQuad: (t) => { t = clamp(t); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
  inCubic: (t) => (t = clamp(t)) * t * t,
  outCubic: (t) => { t = clamp(t); return 1 - Math.pow(1 - t, 3); },
  inOutCubic: (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  outQuart: (t) => { t = clamp(t); return 1 - Math.pow(1 - t, 4); },
  inOutQuart: (t) => { t = clamp(t); return t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2; },
  outQuint: (t) => { t = clamp(t); return 1 - Math.pow(1 - t, 5); },
  inOutQuint: (t) => { t = clamp(t); return t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2; },
  inOutSine: (t) => { t = clamp(t); return -(Math.cos(Math.PI * t) - 1) / 2; },
  outSine: (t) => Math.sin((clamp(t) * Math.PI) / 2),
  outBack: (t, s = 1.70158) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; },
  outBackSoft: (t) => E.outBack(t, 1.1),
  inOutBack: (t, s = 1.2) => { t = clamp(t); const c = s * 1.525; return t < 0.5 ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2 : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2; },
  outElastic: (t) => { t = clamp(t); if (t === 0 || t === 1) return t; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1; },
  // gentle settle (damped spring) — Kurzgesagt-like pop that is not cartoonish
  settle: (t, k = 7, f = 2.2) => { t = clamp(t); return 1 - Math.exp(-k * t) * Math.cos(f * Math.PI * t) * (1 - t) - 0 * t; },
};
/** progress of t inside [a,b] with easing */
export const seg = (t, a, b, ease = E.inOutCubic) => ease(invlerp(a, b, t));
/** in-hold-out envelope: 0 before a, ramps to 1 over [a,a+fi], holds, ramps to 0 over [b-fo,b] */
export const env = (t, a, b, fi = 0.3, fo = 0.3, ease = smooth) => Math.min(ease(invlerp(a, a + fi, t)), 1 - ease(invlerp(b - fo, b, t)));

// ---------------------------------------------------------------- random / noise
export function rng(seed) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hash1(i, s) { let h = (i * 374761393 + s * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function hash2(i, j, s) { return hash1(i * 7919 + j * 104729, s); }
/** 1D value noise in [-1,1] */
export function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (lerp(hash1(i, seed), hash1(i + 1, seed), u) * 2 - 1); }
export function fbm1(x, seed = 0, oct = 3) { let a = 0, amp = 1, n = 0; for (let o = 0; o < oct; o++) { a += noise1(x, seed + o * 17) * amp; n += amp; amp *= 0.5; x *= 2.03; } return a / n; }
export function noise2(x, y, seed = 0) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash2(i, j, seed), hash2(i + 1, j, seed), ux), lerp(hash2(i, j + 1, seed), hash2(i + 1, j + 1, seed), ux), uy) * 2 - 1;
}

// ---------------------------------------------------------------- color
const _hexCache = new Map();
export function rgb(hex) {
  if (typeof hex !== 'string') return hex;
  let c = _hexCache.get(hex); if (c) return c;
  const h = hex.replace('#', '');
  c = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  _hexCache.set(hex, c); return c;
}
export const css = (c, a = 1) => { c = rgb(c); return a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; };
export const mix = (a, b, t) => { a = rgb(a); b = rgb(b); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };
export const mixc = (a, b, t, al = 1) => css(mix(a, b, t), al);
export const shade = (c, k) => (k >= 0 ? mix(c, [255, 250, 238], k) : mix(c, [20, 24, 30], -k));

// The palette: S-041 Guaj base + extensions chosen for the text's meanings
export const P = {
  // catalog S-041
  blue: '#3B6F95', skyPale: '#8AB5BD', greenDeep: '#184731', green: '#44894D', greenLight: '#93C077', lilac: '#ABA5AE', ochre: '#D8B47E', cream: '#EAE0CA',
  // extensions
  paper: '#EDE4D0', ink: '#22303A', indigo: '#26325A', dusk: '#4B4A78', violet: '#6E6496', mauve: '#A58BA6', rose: '#D9A08F', peach: '#EBC08F',
  gold: '#D9A441', goldLight: '#F2D288', goldDeep: '#A8742A', amber: '#E8A23A', ivory: '#F6EFDD', warmWhite: '#FBF5E6',
  terracotta: '#B8644A', earth: '#8A6448', earthDark: '#5C4636', soil: '#6B4E3A', sand: '#D9BF8E', stone: '#9C9590', stoneDark: '#6F6A6C',
  leaf: '#4E8A4F', leafDark: '#2C5E3B', leafLight: '#8DBE6E', fruit: '#E07A3C', fruitLight: '#F2A65A', fruitGold: '#F0B54A',
  skin: '#CC9670', skinShade: '#A9724F', hair: '#3A2C25', shirt: '#F1E9D6', shirtShade: '#D3C6AE', vest: '#7A5640', vestShade: '#5C4031', trousers: '#434A55', trousersShade: '#323741', shoe: '#3B2C24',
  storm: '#4F5868', stormDark: '#353C4A', rain: '#9FB4C8', night: '#1E2A44',
};

// ---------------------------------------------------------------- textures (loaded in main.js)
export const TEX = { bristle: null, dabs: null, paper: null };
let _ctxPatterns = new WeakMap();
function pat(ctx, name) {
  let m = _ctxPatterns.get(ctx); if (!m) { m = {}; _ctxPatterns.set(ctx, m); }
  if (!m[name]) m[name] = ctx.createPattern(TEX[name], 'repeat');
  return m[name];
}

// ---------------------------------------------------------------- shapes → points → rough Path2D
export function ellipsePts(cx, cy, rx, ry, n = 0, rot = 0) {
  n = n || Math.max(24, Math.round((rx + ry) * 0.35));
  const pts = []; const c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return pts;
}
export function rectPts(x, y, w, h, r = 0) {
  if (r <= 0) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  r = Math.min(r, w / 2, h / 2); const pts = []; const k = 6;
  const corner = (cx, cy, a0) => { for (let i = 0; i <= k; i++) { const a = a0 + (i / k) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
  return pts;
}
/** sample cubic bezier chain: segs = [[p0,c1,c2,p1],[p1,c1,c2,p2],...] */
export function bezPts(segs, per = 16) {
  const out = [];
  segs.forEach((s, k) => {
    const [a, b, c, d] = s;
    for (let i = k === 0 ? 0 : 1; i <= per; i++) {
      const t = i / per, u = 1 - t;
      out.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]);
    }
  });
  return out;
}
/** Catmull-Rom through points (closed or open) */
export function crPts(P0, closed = true, per = 8) {
  const n = P0.length, out = [];
  const g = (i) => (closed ? P0[(i + n) % n] : P0[clamp(i, 0, n - 1)]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(P0[n - 1]);
  return out;
}
/** subdivide polyline so no segment exceeds step */
export function resample(pts, step = 5, closed = true) {
  const out = []; const n = pts.length; const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]); const k = Math.max(1, Math.ceil(d / step));
    for (let j = 0; j < k; j++) out.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]);
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
/** displace a closed polygon along normals with arc-length noise → hand-painted edge */
export function roughen(pts, { amp = 1.4, freq = 0.035, fine = 0.45, seed = 1, step = 5, closed = true } = {}) {
  const r = resample(pts, step, closed); const n = r.length; let s = 0; const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = r[(i - 1 + n) % n], b = r[(i + 1) % n], p = r[i];
    if (i > 0) s += Math.hypot(p[0] - r[i - 1][0], p[1] - r[i - 1][1]);
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const d = amp * fbm1(s * freq, seed, 2) + fine * noise1(s * 0.3, seed + 5);
    out[i] = [p[0] + nx * d, p[1] + ny * d];
  }
  return out;
}
export function toPath(pts, closed = true, path = new Path2D()) {
  if (!pts.length) return path;
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
  if (closed) path.closePath();
  return path;
}
export const rough = (pts, o = {}) => toPath(roughen(pts, o), o.closed !== false);
export const transformPts = (pts, tx, ty, s = 1, rot = 0) => { const c = Math.cos(rot) * s, si = Math.sin(rot) * s; return pts.map(([x, y]) => [tx + x * c - y * si, ty + x * si + y * c]); };

// ---------------------------------------------------------------- painting
/** Fill a path with flat opaque gouache + brush striation oriented by dir (radians, local space).
 * o.tex: striation strength (0..1), o.scale: striation scale, o.tx/ty: texture offset, o.kind: 'bristle'|'dabs' */
export function fillG(ctx, path, color, o = {}) {
  const a = o.alpha ?? 1;
  if (a <= 0) return;
  ctx.save();
  if (a < 1) ctx.globalAlpha *= a;
  ctx.fillStyle = typeof color === 'string' ? color : css(color);
  ctx.fill(path);
  const k = o.tex ?? 0.55;
  if (k > 0 && TEX.bristle) {
    const p = pat(ctx, o.kind || 'bristle');
    const s = o.scale ?? 0.6;
    const m = new DOMMatrix().translateSelf(o.tx ?? 0, o.ty ?? 0).rotateSelf(((o.dir ?? 0) * 180) / Math.PI).scaleSelf(s, s * (o.squash ?? 1));
    p.setTransform(m);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = (a < 1 ? a : 1) * k * (ctx.globalAlpha > 0 ? 1 : 0);
    ctx.fillStyle = p; ctx.fill(path);
  }
  ctx.restore();
}
/** Paint many gouache dabs (short opaque strokes) clipped to a path. Used for pre-rendered static art. */
export function dabs(ctx, path, { colors, n = 200, len = [30, 90], wid = [6, 14], dir = 0, dirJit = 0.06, seed = 1, bbox, alpha = 1, mask } = {}) {
  const R = rng(seed);
  ctx.save(); ctx.clip(path);
  const [x0, y0, x1, y1] = bbox;
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, R()), y = lerp(y0, y1, R());
    if (mask && !mask(x, y, R)) continue;
    const L = lerp(len[0], len[1], R()), Wd = lerp(wid[0], wid[1], R());
    const c = colors[Math.floor(R() * colors.length)];
    brushDab(ctx, x, y, L, Wd, dir + (R() - 0.5) * 2 * dirJit, c, R, alpha);
  }
  ctx.restore();
}
/** single flat dab with ragged ends and bristle striation */
export function brushDab(ctx, x, y, L, Wd, ang, color, R = Math.random, alpha = 1) {
  const pts = []; const n = 10;
  const seed = Math.floor(R() * 1e6);
  for (let i = 0; i <= n; i++) { const u = i / n; const xx = lerp(-L / 2, L / 2, u); const w = (Wd / 2) * (1 - Math.pow(Math.abs(u * 2 - 1), 6) * 0.5); pts.push([xx, -w + noise1(u * 4, seed) * Wd * 0.08]); }
  for (let i = n; i >= 0; i--) { const u = i / n; const xx = lerp(-L / 2, L / 2, u) + noise1(u * 3, seed + 3) * 2; const w = (Wd / 2) * (1 - Math.pow(Math.abs(u * 2 - 1), 6) * 0.5); pts.push([xx, w + noise1(u * 4, seed + 9) * Wd * 0.08]); }
  // ragged ends: jitter the end points
  const P2 = transformPts(pts.map(([px, py], i) => (Math.abs(px) > L / 2 - 3 ? [px + (R() - 0.5) * Wd * 0.7, py] : [px, py])), x, y, 1, ang);
  const path = toPath(P2);
  fillG(ctx, path, color, { tex: 0.5, dir: ang, scale: 0.35, alpha, tx: R() * 500, ty: R() * 500 });
}
/** tapered brush stroke along a polyline (for stems, outlines, rays). w: width or fn(u) */
export function strokeG(ctx, pts, w, color, o = {}) {
  if (pts.length < 2) return;
  const P0 = o.smooth === false ? pts : pts;
  const n = P0.length; const left = [], right = [];
  let total = 0; const acc = [0];
  for (let i = 1; i < n; i++) { total += Math.hypot(P0[i][0] - P0[i - 1][0], P0[i][1] - P0[i - 1][1]); acc.push(total); }
  const seed = o.seed ?? 3;
  for (let i = 0; i < n; i++) {
    const a = P0[Math.max(0, i - 1)], b = P0[Math.min(n - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const u = total ? acc[i] / total : 0;
    let ww = typeof w === 'function' ? w(u) : w * (o.taper === false ? 1 : Math.min(1, 0.25 + Math.min(u, 1 - u) * 6) );
    ww *= 1 + (o.wobble ?? 0.08) * noise1(acc[i] * 0.05, seed);
    left.push([P0[i][0] + nx * ww / 2, P0[i][1] + ny * ww / 2]); right.push([P0[i][0] - nx * ww / 2, P0[i][1] - ny * ww / 2]);
  }
  const poly = left.concat(right.reverse());
  const path = toPath(poly);
  const d = Math.atan2(P0[n - 1][1] - P0[0][1], P0[n - 1][0] - P0[0][0]);
  fillG(ctx, path, color, { tex: o.tex ?? 0.45, dir: o.dir ?? d, scale: o.scale ?? 0.35, alpha: o.alpha });
  return path;
}

// ---------------------------------------------------------------- sprites (offscreen cache for static art)
const _sprites = new Map();
export function sprite(key, w, h, draw) {
  let s = _sprites.get(key);
  if (s) return s;
  const c = new OffscreenCanvas(Math.ceil(w), Math.ceil(h));
  const g = c.getContext('2d');
  draw(g, w, h);
  s = c; _sprites.set(key, s);
  if (_sprites.size > 600) { const k = _sprites.keys().next().value; _sprites.delete(k); }
  return s;
}
export function clearSprites() { _sprites.clear(); }

// ---------------------------------------------------------------- halos / light (painted concentric rings, not airbrush)
/** concentric flat rings with rough edges, like the sun in the catalog sample */
export function ringHalo(ctx, x, y, r, colors, { seed = 4, amp = 2.2, alpha = 1, spread = 1 } = {}) {
  // colors: outer→inner; radii shrink geometrically
  const n = colors.length;
  for (let i = 0; i < n; i++) {
    const rr = r * Math.pow(0.78, i * spread);
    const p = rough(ellipsePts(x, y, rr, rr, Math.max(36, rr * 0.4)), { amp, freq: 0.05, seed: seed + i * 13, step: 6 });
    fillG(ctx, p, colors[i], { tex: 0.35, dir: 0, scale: 0.5, alpha });
  }
}
/** soft glow (very restrained; gouache artists paint light, so use sparingly) */
export function glow(ctx, x, y, r, color, a = 0.35) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, css(color, a)); g.addColorStop(0.45, css(color, a * 0.45)); g.addColorStop(1, css(color, 0));
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------- camera
/** apply camera: world point (cx,cy) appears at screen center, zoom z, rotation rot */
export function applyCam(ctx, cam) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(W / 2, H / 2);
  if (cam.rot) ctx.rotate(cam.rot);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);
}
export const camLerp = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), t)), rot: lerp(a.rot || 0, b.rot || 0, t) });
/** keyframed camera: keys=[{t, x,y,z,rot, ease}] */
export function camAt(keys, t) {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.t) return camLerp(a, b, (b.ease || E.inOutCubic)(invlerp(a.t, b.t, t)));
  }
  return keys[keys.length - 1];
}
/** generic keyframed number track: [[t,v,ease?],...] */
export function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) return lerp(a[1], b[1], (b[2] || E.inOutCubic)(invlerp(a[0], b[0], t)));
  }
  return keys[keys.length - 1][1];
}

// ---------------------------------------------------------------- misc helpers
export function withAlpha(ctx, a, fn) { if (a <= 0.001) return; ctx.save(); ctx.globalAlpha *= a; fn(); ctx.restore(); }
export function at(ctx, x, y, s = 1, rot = 0, fn) { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (s !== 1) ctx.scale(s, s); fn(); ctx.restore(); }
/** draw a full-bleed vertical band background with dab transitions (pre-rendered) */
export function bandSky(g, w, h, bands, { seed = 11, overlap = 70, dabN = 900, dabLen = [40, 150], dabW = [8, 18] } = {}) {
  // bands: [{y, color}] top→bottom, y = top edge of band
  const R = rng(seed);
  for (let i = 0; i < bands.length; i++) {
    const y0 = bands[i].y, y1 = i + 1 < bands.length ? bands[i + 1].y : h;
    g.fillStyle = css(bands[i].color); g.fillRect(0, y0, w, y1 - y0 + 1);
  }
  // texture whole sky with dabs of near colors
  const full = new Path2D(); full.rect(0, 0, w, h);
  fillG(g, full, 'rgba(0,0,0,0)', { tex: 0.0 });
  for (let i = 0; i < bands.length; i++) {
    const y0 = bands[i].y, y1 = i + 1 < bands.length ? bands[i + 1].y : h;
    const c = bands[i].color;
    const area = (y1 - y0) * w;
    const n = Math.round((area / (w * h)) * dabN);
    for (let k = 0; k < n; k++) {
      const x = R() * w, y = lerp(y0, y1, R());
      brushDab(g, x, y, lerp(dabLen[0], dabLen[1], R()), lerp(dabW[0], dabW[1], R()), (R() - 0.5) * 0.08, mix(c, R() < 0.5 ? '#ffffff' : '#000000', R() * 0.07), R);
    }
    // boundary interlock with next band
    if (i + 1 < bands.length) {
      const c2 = bands[i + 1].color; const yb = bands[i + 1].y;
      for (let k = 0; k < w / 9; k++) {
        const x = R() * w, y = yb + (R() - 0.5) * overlap;
        const col = y < yb ? c2 : c;
        brushDab(g, x, y, lerp(dabLen[0], dabLen[1], R()), lerp(dabW[0], dabW[1], R()), (R() - 0.5) * 0.08, mix(col, R() < 0.5 ? '#ffffff' : '#000000', R() * 0.05), R);
      }
    }
  }
}

// ---------------------------------------------------------------- shared frame state
export const FRAME = { t: 0, debug: false };
