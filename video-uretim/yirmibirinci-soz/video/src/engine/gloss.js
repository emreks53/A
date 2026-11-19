// gloss.js — the word-gloss subtitle ("elit, hoş ve kaliteli"): only the modern meaning, no box.
//
// Design: EB Garamond 600, ink-centred in the 64–82 % band. Two inks, chosen per gloss:
//   ink: 'light' (default)  warm ivory with a tight double halo of dark brown — for mid-to-dark fields
//   ink: 'dark'             deep maroon-brown with a tight ivory halo and an umber hairline — for light
//                           fields (sky, glow, stone)
// Legibility comes from the halo that hugs the glyphs (no outline look, no wide muddy haze) —
// never a rectangle. The scene must still keep the band calm: behind light ink below relative
// luminance 0.2 (>= 4.5 : 1), behind dark ink above 0.4 (>= 6.5 : 1). A tapered hairline with a tiny lozenge grows outward from the centre
// underneath. Everything is baked once (prepareGlosses) and only transformed per frame: the text
// is fully formed from the first frame and settles with a continuous, sub-pixel-smooth squeeze.

import { env, surface } from './surface.js';
import { clamp, ease } from './ease.js';

const SIZE = 96;                 // px at 1080 wide
const MAX_WIDTH = 0.74;          // of the frame width (auto-shrink beyond): ink stays inside x 140–940 (Shorts-safe)
const BASELINE = 1424;           // band 1229–1574: x-height centre sits on the band centre
const TRACK = 0.012;             // letter spacing (em)
const INKS = {
  light: { fill: '#FFF9EC', halo: [40, 24, 16], passes: [[0.34, 0.2], [0.14, 0.42], [0.05, 0.95], [0.05, 0.95]], stroke: 'rgba(40, 26, 20, 0.6)', line: '#F2C76E', lineEdge: 'rgba(40, 26, 20, 0.55)', lineShadow: 'rgba(40, 26, 20, 0.6)' },
  // (on blue the old gold hairline #B8862B nearly vanished: the dark ink has a deep umber line, a little thicker)
  dark: { fill: '#3A1F1B', halo: [255, 249, 236], passes: [[0.30, 0.5], [0.12, 0.6], [0.05, 0.9]], stroke: 'rgba(255, 249, 236, 0.7)', line: '#7A4A1E', lineEdge: 'rgba(255, 249, 236, 0.6)', lineShadow: 'rgba(255, 249, 236, 0.7)', lineT: 2.8 },
};
const inkOf = (g) => (INKS[g?.ink] ? g.ink : 'light');
const IN = 0.14, OUT = 0.3;      // fade in / out durations (s)
const SETTLE = 0.42, SQUEEZE = 0.045; // the line starts 4.5 % wide and settles (continuous)
// "disappear by" times from the bible (timing.json only carries the start)
const END_BY_TEXT = { sahipsin: 8.65, 'en az': 13.95, gelecek: 18.72, 'âhirete ait sandıkçık': 20.95 };

let timing = null;
const sprites = new Map(); // ink|text -> {s, ax, ay, inkW, px, line, loz}
const fontOf = (px) => `600 ${px}px "EB Garamond"`;

/** Fetch timing.json (default: /home/user/work/timing.json, three levels above this module). */
export async function loadTiming(url = new URL('../../../timing.json', import.meta.url)) {
  timing = await (await fetch(url)).json();
  return timing;
}

/** The four real glosses as [{text, t, end, ink}] (video seconds; ink 'light' unless timing.json says otherwise). */
export function timingGlosses() {
  return timing.glosses.map((g) => ({ text: g.text, t: g.t, end: g.end ?? END_BY_TEXT[g.text] ?? g.t + 1.6, ink: inkOf(g) }));
}

function setType(ctx, px) {
  ctx.font = fontOf(px);
  ctx.letterSpacing = `${px * TRACK}px`;
  ctx.fontKerning = 'normal';
  ctx.textRendering = 'optimizeLegibility';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/** Font size that keeps the settled text inside MAX_WIDTH. */
function fitSize(text) {
  const c = new OffscreenCanvas(8, 8).getContext('2d');
  setType(c, SIZE);
  const m = c.measureText(text);
  const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  // one size for every gloss that fits (lead's decision after the film review: "en az" at 1.2x made the
  // glosses change voice from word to word); only a long gloss shrinks to the frame
  const boost = 1;
  return Math.min(Math.round(SIZE * boost), Math.floor((SIZE * env.W * MAX_WIDTH) / (w * (1 + SQUEEZE))));
}

/** Tapered hairline (unit: full length) and lozenge, each baked with its soft dark edge. */
function flourishSprites(halfLen, ink) {
  const T = ink.lineT ?? 2.2, padX = 14, padY = 14;
  const line = surface(halfLen * 2 + padX * 2, padY * 2);
  const loz = surface(40, 40);
  const paint = (s, shapeFn) => {
    const { ctx, res } = s;
    ctx.shadowColor = ink.lineShadow;
    ctx.shadowBlur = 6 * res;
    ctx.shadowOffsetY = 1 * res;
    ctx.fillStyle = ink.line;
    shapeFn(ctx);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1;
    ctx.strokeStyle = ink.lineEdge;
    shapeFn(ctx);
    ctx.stroke();
    ctx.fill();
  };
  paint(line, (ctx) => {
    const cx = halfLen + padX, y = padY, N = 32;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * 2 - 1;
      const th = T * (1 - Math.pow(Math.abs(u), 1.7));
      if (i) ctx.lineTo(cx + u * halfLen, y - th); else ctx.moveTo(cx + u * halfLen, y - th);
    }
    for (let i = N; i >= 0; i--) {
      const u = (i / N) * 2 - 1;
      ctx.lineTo(cx + u * halfLen, y + T * (1 - Math.pow(Math.abs(u), 1.7)));
    }
    ctx.closePath();
  });
  paint(loz, (ctx) => {
    const d = 6.5;
    ctx.beginPath();
    ctx.moveTo(20, 20 - d);
    ctx.lineTo(20 + d * 1.25, 20);
    ctx.lineTo(20, 20 + d);
    ctx.lineTo(20 - d * 1.25, 20);
    ctx.closePath();
  });
  return { line, loz };
}

function glossSprite(text, inkName = 'light') {
  const key = inkName + '|' + text, ink = INKS[inkName];
  let sp = sprites.get(key);
  if (sp) return sp;
  const px = fitSize(text);
  const probe = new OffscreenCanvas(8, 8).getContext('2d');
  setType(probe, px);
  const m = probe.measureText(text);
  const inkL = m.actualBoundingBoxLeft, inkW = inkL + m.actualBoundingBoxRight;
  const pad = Math.ceil(px * 0.7);
  const s = surface(inkW + pad * 2, px * 2.2);
  const { ctx, res } = s;
  const x = pad + inkL, y = px * 1.35;
  setType(ctx, px);
  // halo passes: draw the text far off-canvas and keep only its blurred shadow. One faint wide
  // pass for separation, then tight passes that give the edge definition instead of an outline.
  const FAR = 6000;
  ctx.fillStyle = '#000';
  for (const [blur, alpha] of ink.passes) {
    ctx.shadowColor = `rgba(${ink.halo.join(', ')}, ${alpha})`;
    ctx.shadowBlur = px * blur * res;
    ctx.shadowOffsetX = FAR;
    ctx.shadowOffsetY = px * 0.02 * res;
    ctx.fillText(text, x - FAR / res, y);
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
  ctx.lineJoin = 'round';
  ctx.lineWidth = px * 0.03;
  ctx.strokeStyle = ink.stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = ink.fill;
  ctx.fillText(text, x, y);
  const halfLen = clamp(inkW * 0.28, 90, 240);
  sp = { s, ax: pad + inkW / 2, ay: y, inkW, px, halfLen, ...flourishSprites(halfLen, ink) };
  sprites.set(key, sp);
  return sp;
}

/** Bake the sprites of a gloss list up front (main.js does this in init; nothing is created in draw). */
export function prepareGlosses(list = timingGlosses()) {
  for (const g of list) glossSprite(g.text, inkOf(g));
}

/** Onset used for the animation: the frame that CONTAINS g.t already shows the gloss (never lags). */
const leadStart = (g) => Math.floor(g.t * env.FPS + 1e-6) / env.FPS - 1 / env.FPS;

/** Draw one gloss at time t (frame coordinates). */
function drawGloss(ctx, t, g) {
  const tau = t - leadStart(g), left = g.end - t;
  if (tau <= 0 || left <= 0) return;
  const sp = glossSprite(g.text, inkOf(g));
  const aIn = 1 - Math.pow(1 - clamp(tau / IN), 3);
  const aOut = ease.sine.inOut(clamp(left / OUT));
  const alpha = aIn * aOut;
  const rise = 14 * (1 - ease.cubic.out(clamp(tau / 0.24))) - 5 * (1 - aOut);
  const sx = 1 + SQUEEZE * (1 - ease.cubic.out(clamp(tau / SETTLE)));
  const cx = env.W / 2, by = BASELINE + rise;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(cx, by);
  ctx.save();
  ctx.scale(sx, 1);
  ctx.drawImage(sp.s.canvas, -sp.ax, -sp.ay, sp.s.w, sp.s.h);
  ctx.restore();
  // flourish: the hairline grows outward from the centre, the lozenge pops first
  const grow = ease.quart.out(clamp((tau - 0.05) / 0.5));
  if (grow > 0) {
    const fy = sp.px * 0.4;
    ctx.save();
    ctx.translate(0, fy);
    ctx.scale(Math.max(0.001, grow), 1);
    ctx.drawImage(sp.line.canvas, -sp.line.w / 2, -sp.line.h / 2, sp.line.w, sp.line.h);
    ctx.restore();
    const k = Math.min(1, grow * 3);
    ctx.drawImage(sp.loz.canvas, -20 * k, fy - 20 * k, 40 * k, 40 * k);
  }
  ctx.restore();
}

/** Draw every gloss active at time t. list defaults to the real glosses of timing.json. */
export function drawGlosses(ctx, t, list = timingGlosses()) {
  for (const g of list) drawGloss(ctx, t, g);
}

/** Opacity (0..1) of a gloss at time t — handy for tests and for scenes that calm the band under it. */
export function glossAlpha(t, g) {
  const tau = t - leadStart(g), left = g.end - t;
  if (tau <= 0 || left <= 0) return 0;
  return (1 - Math.pow(1 - clamp(tau / IN), 3)) * ease.sine.inOut(clamp(left / OUT));
}
