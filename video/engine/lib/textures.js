// Procedural (code-generated) textures. No image files needed.
// Every generator returns { map, normalMap, roughnessMap } as THREE.CanvasTexture (tileable, RepeatWrapping).
import * as THREE from 'three';
import { rng, clamp, lerp } from './util.js';

const cache = new Map();

// ---- tileable gradient noise -------------------------------------------------
function makePerlin(seed, period) {
  const r = rng(seed);
  const G = new Float32Array(period * period * 2);
  for (let i = 0; i < period * period; i++) { const a = r() * Math.PI * 2; G[i * 2] = Math.cos(a); G[i * 2 + 1] = Math.sin(a); }
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const g = (ix, iy, dx, dy) => { const k = (((iy % period) + period) % period) * period + (((ix % period) + period) % period); return G[k * 2] * dx + G[k * 2 + 1] * dy; };
    const u = fade(xf), v = fade(yf);
    const n00 = g(xi, yi, xf, yf), n10 = g(xi + 1, yi, xf - 1, yf), n01 = g(xi, yi + 1, xf, yf - 1), n11 = g(xi + 1, yi + 1, xf - 1, yf - 1);
    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v) * 1.41; // ~[-1,1]
  };
}

// Fractal tileable noise field over [0,1)^2. base = lattice cells at octave 0.
export function fbmField(seed = 1, base = 4, octaves = 5, gain = 0.5) {
  const ps = []; for (let o = 0; o < octaves; o++) ps.push(makePerlin(seed * 31 + o * 101, base << o));
  return (u, v) => { let a = 0, amp = 1, norm = 0; for (let o = 0; o < octaves; o++) { const f = base << o; a += amp * ps[o](u * f, v * f); norm += amp; amp *= gain; } return a / norm; };
}

// ---- canvas helpers ------------------------------------------------------------
export function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }

export function texFromCanvas(c, { srgb = true, repeat = [1, 1], aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true; return t;
}

// Build color/height/roughness from a per-pixel function f(u,v) -> {c:[r,g,b] 0..1, h:0..1, r:0..1}
export function bake(size, f, { normalStrength = 2.0 } = {}) {
  const cC = canvas(size), cR = canvas(size), cN = canvas(size);
  const xC = cC.getContext('2d'), xR = cR.getContext('2d'), xN = cN.getContext('2d');
  const iC = xC.createImageData(size, size), iR = xR.createImageData(size, size), iN = xN.createImageData(size, size);
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const o = f(x / size, y / size), k = y * size + x, p = k * 4;
    iC.data[p] = clamp(o.c[0]) * 255; iC.data[p + 1] = clamp(o.c[1]) * 255; iC.data[p + 2] = clamp(o.c[2]) * 255; iC.data[p + 3] = 255;
    const rr = clamp(o.r ?? 0.8) * 255; iR.data[p] = iR.data[p + 1] = iR.data[p + 2] = rr; iR.data[p + 3] = 255;
    H[k] = o.h ?? 0.5;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const hx = H[y * size + ((x + 1) % size)] - H[y * size + ((x - 1 + size) % size)];
    const hy = H[((y + 1) % size) * size + x] - H[((y - 1 + size) % size) * size + x];
    let nx = -hx * normalStrength, ny = hy * normalStrength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const p = (y * size + x) * 4; iN.data[p] = (nx * .5 + .5) * 255; iN.data[p + 1] = (ny * .5 + .5) * 255; iN.data[p + 2] = (nz * .5 + .5) * 255; iN.data[p + 3] = 255;
  }
  xC.putImageData(iC, 0, 0); xR.putImageData(iR, 0, 0); xN.putImageData(iN, 0, 0);
  return { colorCanvas: cC, roughCanvas: cR, normalCanvas: cN };
}

function pack(key, b, repeat) {
  const out = {
    map: texFromCanvas(b.colorCanvas, { repeat }),
    roughnessMap: texFromCanvas(b.roughCanvas, { srgb: false, repeat }),
    normalMap: texFromCanvas(b.normalCanvas, { srgb: false, repeat }),
  };
  cache.set(key, out); return out;
}
const hex = c => { const C = new THREE.Color(c); return [C.r, C.g, C.b].map(v => Math.pow(v, 1)); };
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ---- presets -------------------------------------------------------------------
// Each preset takes options and caches by key. Colors are sRGB hex.
export function sand({ size = 512, seed = 3, a = '#e9c58f', b = '#c99a5e', repeat = [8, 8] } = {}) {
  const key = 'sand' + size + seed + a + b + repeat; if (cache.has(key)) return cache.get(key);
  const n = fbmField(seed, 4, 5), g = fbmField(seed + 9, 64, 2), A = hex(a), B = hex(b);
  return pack(key, bake(size, (u, v) => { const big = n(u, v) * .5 + .5, grain = g(u, v) * .5 + .5; const ripple = Math.sin((u * 6 + n(u, v) * 1.5) * Math.PI * 2 * 3) * .5 + .5; const t = clamp(big * .8 + grain * .25 - .1); return { c: mixc(A, B, t), h: ripple * .35 + grain * .4 + big * .25, r: .92 - grain * .08 }; }, { normalStrength: 3 }), repeat);
}

export function plaster({ size = 512, seed = 5, a = '#d9b88c', b = '#b48a5e', repeat = [2, 2] } = {}) { // mudbrick / lime plaster walls
  const key = 'plaster' + size + seed + a + b + repeat; if (cache.has(key)) return cache.get(key);
  const n = fbmField(seed, 3, 6), f = fbmField(seed + 4, 32, 3), A = hex(a), B = hex(b);
  return pack(key, bake(size, (u, v) => { const big = n(u, v) * .5 + .5, fine = f(u, v) * .5 + .5; const t = clamp(big * .9 + fine * .3 - .2); return { c: mixc(A, B, t), h: big * .6 + fine * .4, r: .9 }; }, { normalStrength: 4 }), repeat);
}

export function stone({ size = 512, seed = 7, a = '#bfae95', b = '#857560', repeat = [1, 1], blocks = 0 } = {}) {
  const key = 'stone' + size + seed + a + b + repeat + blocks; if (cache.has(key)) return cache.get(key);
  const n = fbmField(seed, 4, 6), A = hex(a), B = hex(b);
  return pack(key, bake(size, (u, v) => {
    const big = n(u, v) * .5 + .5; let h = big, m = 0;
    if (blocks) { const by = v * blocks, row = Math.floor(by), bx = u * blocks / 2 + (row % 2) * .5; const fx = bx - Math.floor(bx), fy = by - row; const e = Math.min(fx, 1 - fx, fy * .5, (1 - fy) * .5); m = clamp(1 - e * 30); h = h * .7 + (1 - m) * .3; }
    return { c: mixc(mixc(A, B, clamp(big * 1.2 - .1)), [.25, .2, .16], m * .5), h, r: .85 + m * .1 };
  }, { normalStrength: 3 }), repeat);
}

export function wood({ size = 512, seed = 11, a = '#8a5a34', b = '#5a361d', rings = 18, repeat = [1, 1] } = {}) {
  const key = 'wood' + size + seed + a + b + rings + repeat; if (cache.has(key)) return cache.get(key);
  const n = fbmField(seed, 2, 5), f = fbmField(seed + 3, 64, 2), A = hex(a), B = hex(b);
  return pack(key, bake(size, (u, v) => { const w = v * rings + n(u, v) * 2.2 + u * .3; const ring = Math.pow(Math.abs(Math.sin(w * Math.PI)), .6); const fib = f(u, v) * .5 + .5; const t = clamp(ring * .7 + fib * .35); return { c: mixc(A, B, t), h: ring * .5 + fib * .5, r: .55 + ring * .15 }; }, { normalStrength: 1.5 }), repeat);
}

export function leather({ size = 512, seed = 13, a = '#7a2a1c', b = '#4a160d', repeat = [1, 1] } = {}) {
  const key = 'leather' + size + seed + a + b + repeat; if (cache.has(key)) return cache.get(key);
  const n = fbmField(seed, 4, 4), c = fbmField(seed + 5, 48, 2), A = hex(a), B = hex(b);
  return pack(key, bake(size, (u, v) => { const big = n(u, v) * .5 + .5; const cell = Math.abs(c(u, v)); return { c: mixc(A, B, clamp(big * .9 + (1 - cell) * .2 - .1)), h: cell, r: .55 + big * .2 }; }, { normalStrength: 2.5 }), repeat);
}

export function parchment({ size = 512, seed = 17, a = '#f3e2bf', b = '#d6b98a', repeat = [1, 1] } = {}) {
  const key = 'parch' + size + seed + a + b + repeat; if (cache.has(key)) return cache.get(key);
  const n = fbmField(seed, 3, 6), f = fbmField(seed + 1, 96, 2), A = hex(a), B = hex(b);
  return pack(key, bake(size, (u, v) => { const big = n(u, v) * .5 + .5, fib = f(u, v) * .5 + .5; const edge = Math.min(u, 1 - u, v, 1 - v); const burn = clamp(1 - edge * 8) * .35; return { c: mixc(mixc(A, B, clamp(big * .8 + fib * .2)), [.45, .3, .15], burn), h: fib * .4 + big * .2, r: .9 }; }, { normalStrength: 1 }), repeat);
}

export function fabric({ size = 512, seed = 19, a = '#2f5e3a', b = '#1c3a23', weave = 120, repeat = [1, 1] } = {}) {
  const key = 'fabric' + size + seed + a + b + weave + repeat; if (cache.has(key)) return cache.get(key);
  const n = fbmField(seed, 4, 4), A = hex(a), B = hex(b);
  return pack(key, bake(size, (u, v) => { const wx = Math.sin(u * weave * Math.PI * 2) * .5 + .5, wy = Math.sin(v * weave * Math.PI * 2) * .5 + .5; const over = ((Math.floor(u * weave) + Math.floor(v * weave)) % 2) ? wx : wy; const big = n(u, v) * .5 + .5; return { c: mixc(A, B, clamp(big * .6 + over * .3)), h: over, r: .95 }; }, { normalStrength: 1.2 }), repeat);
}

export function brushedMetal({ size = 512, seed = 23, a = '#d9b45a', b = '#a07a2e', repeat = [1, 1] } = {}) {
  const key = 'metal' + size + seed + a + b + repeat; if (cache.has(key)) return cache.get(key);
  const n = fbmField(seed, 2, 3), s = fbmField(seed + 7, 2, 1), A = hex(a), B = hex(b);
  const streak = makePerlin(seed + 77, 256);
  return pack(key, bake(size, (u, v) => { const st = streak(u * 2, v * 256) * .5 + .5; const big = n(u, v) * .5 + .5; return { c: mixc(A, B, clamp(big * .7 + st * .2)), h: st * .3, r: .28 + st * .15 + big * .1 }; }, { normalStrength: .6 }), repeat);
}

// Generic noise grayscale texture (for alpha masks, clouds, etc.)
export function noiseTex({ size = 256, seed = 29, base = 4, octaves = 5, contrast = 1, repeat = [1, 1] } = {}) {
  const key = 'noise' + size + seed + base + octaves + contrast; if (cache.has(key)) return cache.get(key);
  const n = fbmField(seed, base, octaves), c = canvas(size), x = c.getContext('2d'), im = x.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let i = 0; i < size; i++) { const v = clamp((n(i / size, y / size) * contrast) * .5 + .5) * 255, p = (y * size + i) * 4; im.data[p] = im.data[p + 1] = im.data[p + 2] = v; im.data[p + 3] = 255; }
  x.putImageData(im, 0, 0); const t = texFromCanvas(c, { srgb: false, repeat }); cache.set(key, t); return t;
}

// Soft round sprite for particles (white, radial falloff)
export function softDot(size = 64, hardness = 0.0) {
  const key = 'dot' + size + hardness; if (cache.has(key)) return cache.get(key);
  const c = canvas(size), x = c.getContext('2d'); const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(clamp(hardness, 0, .95), 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; cache.set(key, t); return t;
}

// Draw a 2D canvas (e.g. book cover with text/ornaments) and return a texture. draw(ctx2d, w, h)
export function drawTexture(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t;
}

// Simple linear/radial gradient texture (vertical by default)
export function gradientTex(stops, { w = 4, h = 256, radial = false } = {}) {
  return drawTexture(w, h, (x, W, H) => {
    const g = radial ? x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) / 2) : x.createLinearGradient(0, 0, 0, H);
    stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; x.fillRect(0, 0, W, H);
  });
}
