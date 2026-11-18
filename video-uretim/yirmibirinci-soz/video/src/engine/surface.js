// Offscreen surfaces + colour helpers.
// A "surface" is a canvas whose drawing coordinates are LOGICAL pixels (1080x1920 world);
// its backing store is logical * env.res so previews (?scale=0.5) bake proportionally less.

export const env = { res: 1, W: 1080, H: 1920, FPS: 30 };

/** Create an offscreen surface of logical size w x h. ctx is pre-scaled to logical units. */
export function surface(w, h, res = env.res) {
  const cw = Math.max(1, Math.ceil(w * res)), ch = Math.max(1, Math.ceil(h * res));
  const canvas = new OffscreenCanvas(cw, ch);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx, w: cw / res, h: ch / res, res };
}

/** Reset a surface to fully transparent (keeps the logical transform). */
export function clearSurface(s) {
  s.ctx.setTransform(1, 0, 0, 1, 0, 0);
  s.ctx.globalAlpha = 1;
  s.ctx.globalCompositeOperation = 'source-over';
  s.ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
  s.ctx.setTransform(s.res, 0, 0, s.res, 0, 0);
}

/** Draw surface s onto ctx with its top-left at logical (x,y). */
export function blit(ctx, s, x = 0, y = 0) {
  ctx.drawImage(s.canvas, x, y, s.w, s.h);
}

export function copySurface(s) {
  const c = surface(s.w, s.h, s.res);
  blit(c.ctx, s);
  return c;
}

// ---------------------------------------------------------------- colour

/** The catalogue palette of S-050 plus the allowed extensions (bible §2). */
export const PAL = {
  primer: '#EFE4CF', lightBlue: '#80BED6', cobalt: '#4E94CE', lavender: '#A498D2',
  deepGreen: '#2C7048', yellowGreen: '#96C654', gold: '#F0A82E', pink: '#EEA0BA',
  white: '#FBF8F0', ivory: '#EDE3D2', maroon: '#4A2328', brick: '#B4553A',
  ochre: '#C98A3C', peach: '#F4C79A', skin: '#E0A47C', brown: '#3B2620',
  // derived helpers that stay inside the family
  midGreen: '#4E9A46', darkGreen: '#1F5C3A', sunYellow: '#F8DC78', paleYellow: '#FBEDB4',
  mauve: '#B9A2A4', cloudWhite: '#FDFCF8',
};

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const h2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
export const rgbToHex = (r, g, b) => `#${h2(r)}${h2(g)}${h2(b)}`.toUpperCase();
export const rgba = (hex, a = 1) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

/** Mix two hex colours (t=0 -> a, t=1 -> b). */
export function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

/** Lighten (amt > 0) or darken (amt < 0) a hex colour, staying matte (mixes toward warm white / deep umber). */
export const tone = (hex, amt) => (amt >= 0 ? mixHex(hex, '#FFF8EA', amt) : mixHex(hex, '#2A1C1C', -amt));

/**
 * n deterministic tint variants of a colour (small lightness + temperature wobble) —
 * a handful of discrete tints per layer is what makes overlapping dabs read as separate prints.
 */
export function tintSet(hex, n, amount, rng) {
  const [r, g, b] = hexToRgb(hex);
  const out = [];
  for (let i = 0; i < n; i++) {
    const l = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1..1 dark..light
    const k = 1 + l * amount;
    const warm = rng.sym(amount * 0.5);
    out.push(rgbToHex(r * k * (1 + warm), g * k, b * k * (1 - warm)));
  }
  return out;
}
