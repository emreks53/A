// Deterministic randomness: seeded PRNG, integer hashes, value noise / fbm, simplex.
// Nothing here ever touches Math.random — every result is a pure function of its seed.

const U32 = 4294967296;

/** mulberry32: fast seeded PRNG. Returns a function yielding floats in [0,1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / U32;
  };
}

/** Integer lattice hash -> uint32. */
export function hashInt(x, y = 0, seed = 0) {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Integer lattice hash -> float in [0,1). */
export const hash2 = (x, y = 0, seed = 0) => hashInt(x, y, seed) / U32;

/** FNV-1a string hash -> uint32. */
export function hashStr(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Combine numbers / strings into one uint32 seed: seedOf('cloud', 3, baseSeed). */
export function seedOf(...parts) {
  let h = 0x9e3779b9;
  for (const p of parts) {
    const v = typeof p === 'string' ? hashStr(p) : Math.floor(p) | 0;
    h = hashInt(v, h, 0x51ed27);
  }
  return h >>> 0;
}

/** Convenience RNG object around mulberry32. */
export function makeRng(seed) {
  const next = mulberry32(typeof seed === 'string' ? hashStr(seed) : seed);
  const rng = {
    next,
    /** float in [a,b) */
    range: (a, b) => a + (b - a) * next(),
    /** integer in [a,b] inclusive */
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    /** symmetric float in [-a,a) */
    sym: (a = 1) => (next() * 2 - 1) * a,
    /** approx. normal(0,1) (sum of 4 uniforms) */
    gauss: () => (next() + next() + next() + next() - 2) * 1.7320508,
    /** independent child generator */
    fork: (label = 0) => makeRng(seedOf(label, Math.floor(next() * U32))),
  };
  return rng;
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/** 2D value noise in [0,1], smooth (quintic). */
export function valueNoise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = fade(x - xi), v = fade(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal value noise in [0,1]. */
export function fbm2(x, y, seed = 0, octaves = 4, lacunarity = 2, gain = 0.5) {
  let amp = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise2(x, y, seed + o * 1013);
    norm += amp;
    amp *= gain;
    x = x * lacunarity + 17.3;
    y = y * lacunarity - 9.1;
  }
  return sum / norm;
}

/** 1D smooth noise in [-1,1]; handy for drift / sway (continuous in x). */
export function noise1(x, seed = 0) {
  const xi = Math.floor(x), u = fade(x - xi);
  const a = hash2(xi, 0, seed), b = hash2(xi + 1, 0, seed);
  return (a + (b - a) * u) * 2 - 1;
}

const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 0, 1, 0, -1];

/** 2D simplex noise in [-1,1]. */
export function simplex2(x, y, seed = 0) {
  const s = (x + y) * F2;
  const i = Math.floor(x + s), j = Math.floor(y + s);
  const t = (i + j) * G2;
  const x0 = x - (i - t), y0 = y - (j - t);
  const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  let n = 0;
  let a = 0.5 - x0 * x0 - y0 * y0;
  if (a > 0) {
    const g = (hashInt(i, j, seed) & 7) * 2;
    a *= a; n += a * a * (GRAD[g] * x0 + GRAD[g + 1] * y0);
  }
  a = 0.5 - x1 * x1 - y1 * y1;
  if (a > 0) {
    const g = (hashInt(i + i1, j + j1, seed) & 7) * 2;
    a *= a; n += a * a * (GRAD[g] * x1 + GRAD[g + 1] * y1);
  }
  a = 0.5 - x2 * x2 - y2 * y2;
  if (a > 0) {
    const g = (hashInt(i + 1, j + 1, seed) & 7) * 2;
    a *= a; n += a * a * (GRAD[g] * x2 + GRAD[g + 1] * y2);
  }
  return 70 * n;
}
