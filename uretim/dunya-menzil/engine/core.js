/* Dünya Menzil — engine core: constants, math, easing, noise, colour, word timing.
   Everything is deterministic: the same t always produces the same frame. */
(function () {
  const E = (window.E = window.E || {});
  E.W = 1080;
  E.H = 1920;
  E.FPS = 30;

  // ---------- math ----------
  E.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  E.lerp = (a, b, t) => a + (b - a) * t;
  /** normalised progress of t through [a, b], clamped to 0..1 */
  E.seg = (t, a, b) => E.clamp((t - a) / (b - a));
  E.smooth = (t) => t * t * (3 - 2 * t);
  E.smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  E.TAU = Math.PI * 2;
  E.rad = (d) => (d * Math.PI) / 180;
  E.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

  // ---------- easing ----------
  const c1 = 1.70158, c3 = c1 + 1;
  E.ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inQuart: (t) => t * t * t * t,
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outSine: (t) => Math.sin((t * Math.PI) / 2),
    inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
    outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutExpo: (t) =>
      t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    outBack: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
    outBackSoft: (t) => { const k = 0.9, kk = k + 1; return 1 + kk * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2); },
    outElastic: (t) =>
      t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  };

  /** progress of t through [a,b] with easing (name or function) */
  E.ep = (t, a, b, ease = 'inOutCubic') => {
    const f = typeof ease === 'function' ? ease : E.ease[ease];
    return f(E.seg(t, a, b));
  };

  /** keyframe tween. keys: [[time, value, easeIntoThisKey?], ...]; values numbers or arrays of numbers */
  E.tween = (t, keys) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const k = keys[i];
      if (t <= k[0]) {
        const p = keys[i - 1];
        const f = typeof k[2] === 'function' ? k[2] : E.ease[k[2] || 'inOutCubic'];
        const u = f((t - p[0]) / (k[0] - p[0]));
        if (Array.isArray(p[1])) return p[1].map((v, j) => v + (k[1][j] - v) * u);
        return p[1] + (k[1] - p[1]) * u;
      }
    }
    return keys[keys.length - 1][1];
  };

  /** critically damped "settle" curve: overshoot-free spring towards 1 after start */
  E.spring = (t, start, stiff = 9, damp = 0.55) => {
    const x = t - start;
    if (x <= 0) return 0;
    const w = stiff, z = damp;
    if (z >= 1) return 1 - (1 + w * x) * Math.exp(-w * x);
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + ((z * w) / wd) * Math.sin(wd * x));
  };

  // ---------- deterministic random & noise ----------
  E.rng = (seed) => {
    let a = (seed * 2654435761) >>> 0 || 1;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const hash = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  E.hash = hash;
  E.noise1 = (x, seed = 0) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return E.lerp(hash(i, 0, seed), hash(i + 1, 0, seed), u) * 2 - 1;
  };
  E.noise2 = (x, y, seed = 0) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
    return (E.lerp(E.lerp(a, b, ux), E.lerp(c, d, ux), uy)) * 2 - 1;
  };
  E.fbm1 = (x, seed = 0, oct = 3) => {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += a * E.noise1(x * f, seed + i * 17); f *= 2; a *= 0.5; }
    return v;
  };
  E.fbm2 = (x, y, seed = 0, oct = 3) => {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += a * E.noise2(x * f, y * f, seed + i * 31); f *= 2; a *= 0.5; }
    return v;
  };
  /** gentle idle drift (for floating objects, breathing, handheld camera) */
  E.drift = (t, seed = 0, speed = 0.35) => E.fbm1(t * speed, seed, 2);

  // ---------- colour ----------
  E.rgb = (hex) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  E.hex = (c) => '#' + c.map((v) => Math.round(E.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  E.mix = (h1, h2, t) => {
    const a = E.rgb(h1), b = E.rgb(h2);
    return E.hex(a.map((v, i) => v + (b[i] - v) * t));
  };
  E.rgba = (hex, a = 1) => {
    const c = E.rgb(hex);
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  };
  /** lighten (k>0, toward white) or darken (k<0, toward a deeper version of itself) a watercolour pigment */
  E.shade = (hex, k) => {
    const c = E.rgb(hex);
    if (k >= 0) return E.hex(c.map((v) => v + (255 - v) * k));
    // darker glaze: multiply by itself (like a second layer of the same pigment)
    const g = -k;
    return E.hex(c.map((v) => v * (1 - g) + ((v * v) / 255) * g * 0.85));
  };
  /** desaturate a colour toward its luminance by k (0..1) */
  E.desat = (hex, k) => {
    const c = E.rgb(hex);
    const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    return E.hex(c.map((v) => v + (l - v) * k));
  };

  /** Pigment palette (S-001 Suluboya family, extended). Use these names in scenes for a coherent look. */
  E.P = {
    paper: '#F7F4EC',
    ultramarine: '#5C7CB7',
    cerulean: '#7FA7CF',
    skyWash: '#A9C6E2',
    indigo: '#34497A',
    nightIndigo: '#26314F',
    sap: '#9FB571',        // sap green
    leaf: '#6E9A5A',
    viridian: '#35694C',
    deepGreen: '#24493A',
    sienna: '#C2862F',     // raw sienna / gold ochre
    ochre: '#D9AE5B',
    gold: '#C9A04A',
    gamboge: '#E8C25A',
    rose: '#AD657A',       // quinacridone rose
    blush: '#D89AA0',
    crimson: '#9B3B4A',
    terracotta: '#C2765A',
    umber: '#7A5A44',
    sepia: '#5A4636',
    warmGrey: '#A99E9C',
    stone: '#C9C1B6',
    lavender: '#9C93B8',
    skin: '#E2B08E',
    skinShadow: '#C98F70',
    hair: '#4A3528',
    coat: '#3F5A86',       // the man's coat (indigo blue)
    coatShadow: '#2F4569',
    trousers: '#B9A27E',
    shoes: '#5A4031',
    ink: '#2B2A33',        // pencil / ink lines
  };

  // ---------- narration timing ----------
  /** WORDS: [{w, s, e}] from forced alignment (data/words.js). T(i) = onset of word i (seconds). */
  E.T = (i) => E.WORDS[i].s;
  E.Te = (i) => E.WORDS[i].e;
  /** onset of the n-th (1-based) occurrence of a word (case-insensitive, exact token) */
  E.Tw = (word, n = 1) => {
    let k = 0;
    const lw = word.toLocaleLowerCase('tr');
    for (const w of E.WORDS) if (w.w.toLocaleLowerCase('tr') === lw && ++k === n) return w.s;
    throw new Error('word not found: ' + word + ' #' + n);
  };
})();
