// sponge.js — the heart of S-050 "Sünger Boyama".
//
//  1. STAMPS   a set of natural-sea-sponge prints (alpha masks): noise-distorted blob outline, a
//              porous body with round pores of three sizes and a rim that erodes into powdery
//              stipple. The paint load is OPAQUE (matte wall paint): a print covers or leaves a hole.
//  2. DABS     a "dab" is one stamp press: {x, y, size, rot, flip, squash, stamp, color, alpha, li, rank}.
//              Every painted thing is nothing but a list of dabs. li = colour layer (z-order),
//              rank = 0..1 position in the reveal order (independent of z-order).
//  3. LAYERS   every colour layer is pressed on its own scratch canvas, round pores are punched
//              through the whole layer (so they survive overlapping dabs of the same colour) and
//              the layer is then laid over the ones below: colours show through each other's gaps.
//  4. PAINTED  a baked sprite that remembers its dab list, so it can be drawn at any reveal
//              progress p in [0,1] in K discrete stages, either as a true build-up ('build') or as
//              the finished print appearing through an ordered sponge mask ('mask').
//
// All randomness is seeded and independent of the render scale: a ?scale=0.5 bake and a supersampled
// ?scale=2 bake are the same painting, only smaller / finer (same dabs, same stamps, same reveal
// stages). `node tools/check.mjs` asserts it (identical dab lists at scale 0.5, 1 and 2).

import { makeRng, hashInt, hash2, hashStr, valueNoise2, fbm2, seedOf } from './rng.js';
import { clamp, lerp, smoothstep, TAU } from './ease.js';
import { surface, clearSurface, blit, tintSet, env } from './surface.js';

// ------------------------------------------------------------------ stamps

// Stamp tiles exist at several pixel sizes ("levels"). The sponge grain (stipple, pores) has the
// same absolute size on every level, exactly like one real sponge used for big and small dabs; a
// dab picks the level closest to its LOGICAL size (never the render scale).
const LEVELS = [18, 28, 44, 72, 120, 192, 320];
// Stamp tiles are generated at Q device pixels per logical pixel: 1 normally, 2 for supersampled
// renders (res >= 1.5). The print is the SAME (same shapes, same grain in logical px) but its stipple
// is cut hard at the device resolution, so a supersampled frame keeps crisp grain instead of the
// soft edges of magnified tiles.
let Q = 1;               // tile density of the engine's own render scale (set by initSponge)
/** Tile density for a surface: the engine's Q, or 2 for a sprite baked denser than that (density: 2). */
const qOf = (res) => (Q > 1 || res >= 1.5 ? 2 : 1);
const GRAIN = 2.6;      // px wavelength of the fine stipple
const SAND = 84;        // strength of the sandy tonal grain inside every print (0 = flat colour)
const PREFILTER = 0.12; // 0 = pixel-hard stipple … 1 = full 3x3 tent (softer print, calmer when resampled)

// Recipes: core = normalised radius where the body starts to erode into stipple (small = lacy),
// body = coverage level of the body, poreGate = how many pores, holes = punched bubbles,
// top = max density (specks stay sparse).
const RECIPES = [
  { kind: 'dense', body: 1.0, core: 0.60, poreGate: 0.16, holes: [1, 3], rough: 0.20, top: 1.0 },
  { kind: 'dense', body: 1.0, core: 0.52, poreGate: 0.22, holes: [1, 4], rough: 0.28, top: 1.0 },
  { kind: 'dense', body: 1.0, core: 0.56, poreGate: 0.12, holes: [0, 2], rough: 0.34, top: 1.0 },
  { kind: 'dense', body: 1.0, core: 0.46, poreGate: 0.26, holes: [2, 4], rough: 0.24, top: 1.0 },
  { kind: 'mid', body: 0.93, core: 0.46, poreGate: 0.32, holes: [2, 5], rough: 0.30, top: 1.0 },
  { kind: 'mid', body: 0.93, core: 0.38, poreGate: 0.38, holes: [3, 6], rough: 0.36, top: 1.0 },
  { kind: 'mid', body: 0.93, core: 0.50, poreGate: 0.28, holes: [2, 5], rough: 0.26, top: 1.0 },
  { kind: 'mid', body: 0.93, core: 0.34, poreGate: 0.42, holes: [3, 6], rough: 0.40, top: 1.0 },
  { kind: 'airy', body: 0.85, core: 0.20, poreGate: 0.46, holes: [3, 7], rough: 0.36, top: 0.94 },
  { kind: 'airy', body: 0.85, core: 0.12, poreGate: 0.52, holes: [4, 8], rough: 0.42, top: 0.88 },
  { kind: 'airy', body: 0.85, core: 0.26, poreGate: 0.44, holes: [3, 7], rough: 0.30, top: 0.96 },
  { kind: 'airy', body: 0.85, core: 0.06, poreGate: 0.50, holes: [4, 7], rough: 0.44, top: 0.82 },
  { kind: 'speck', body: 1.0, core: 0.05, poreGate: 0.1, holes: [0, 0], rough: 0.30, top: 0.50 },
  { kind: 'speck', body: 1.0, core: 0.02, poreGate: 0.1, holes: [0, 0], rough: 0.40, top: 0.40 },
  { kind: 'speck', body: 1.0, core: 0.10, poreGate: 0.1, holes: [0, 0], rough: 0.36, top: 0.58 },
  { kind: 'speck', body: 1.0, core: 0.00, poreGate: 0.1, holes: [0, 0], rough: 0.46, top: 0.32 },
];

/** Round pore depth (0 = none, 1 = pore centre) from a jittered cell grid of size g. */
function pores(x, y, g, seed, gate, rmax, aa = 1.5) {
  const cx = Math.floor(x / g), cy = Math.floor(y / g);
  let best = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const h = hashInt(cx + i, cy + j, seed);
      if ((h & 1023) / 1023 > gate) continue;
      const px = (cx + i + ((h >>> 10) & 1023) / 1023) * g;
      const py = (cy + j + ((h >>> 20) & 1023) / 1023) * g;
      const q = hash2(cx + i, cy + j, seed + 7);
      const r = g * rmax * (0.25 + 0.75 * q * q);
      const cov = (r - Math.hypot(x - px, y - py)) / aa + 0.5;
      if (cov > best) best = cov;
    }
  }
  return best > 1 ? 1 : best;
}

function genStampAlpha(S, recipe, seed, q = 1) {
  const rng = makeRng(seed);
  const N = S * q, aa = 1.5 / q;     // N = tile size in device px; all maths below is in LOGICAL px
  const raw = new Float32Array(N * N);
  const c = S / 2, R = S * 0.5;
  const harm = [];
  for (let k = 2; k <= 7; k++) harm.push([k, (rng.range(0.3, 1) * recipe.rough) / Math.pow(k, 0.75), rng.next() * TAU]);
  const rot = rng.next() * TAU, el = 1 + rng.sym(0.16);
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const s1 = seed + 11, s2 = seed + 23, s3 = seed + 37, s4 = seed + 41, s5 = seed + 53, s6 = seed + 67;
  const nHoles = Math.round(rng.int(recipe.holes[0], recipe.holes[1]) * Math.sqrt(S / 192));
  const holes = [];
  for (let i = 0; i < nHoles; i++) {
    const a = rng.next() * TAU, d = Math.sqrt(rng.next()) * R * 0.6;
    const q = rng.next();
    holes.push([c + Math.cos(a) * d, c + Math.sin(a) * d, S >= 60 ? lerp(3, 6 + S * 0.03, q * q) : lerp(1.6, 2.4 + S * 0.03, q * q)]);
  }
  const wob = S * 0.2;
  // the rim that erodes into stipple is 7–22 px wide whatever the tile size, so that small dabs
  // still have a solid heart and read as PRINTS, not as mist
  const core = Math.min(recipe.core, 1 - clamp(R * 0.48, Math.min(7, R * 0.4), 22) / (R * 0.8));
  const gate = Math.min(0.8, recipe.poreGate + 0.14);
  const speck = recipe.kind === 'speck';
  for (let Y = 0; Y < N; Y++) {
    const y = (Y + 0.5) / q - 0.5;
    for (let X = 0; X < N; X++) {
      const x = (X + 0.5) / q - 0.5;
      const dx0 = x - c, dy0 = y - c;
      const dx = (dx0 * cr + dy0 * sr) * el, dy = (-dx0 * sr + dy0 * cr) / el;
      const rad = Math.hypot(dx, dy) / R;
      if (rad > 1.02) continue;
      const ang = Math.atan2(dy, dx);
      let ro = 1;
      for (const [k, a, ph] of harm) ro += a * Math.sin(k * ang + ph);
      ro += 0.24 * (valueNoise2(x / wob, y / wob, s1) - 0.5);
      const d = rad / (ro * 0.80);
      if (d >= 1) continue;
      // coverage field: body falling to nothing at the rim, gently clumped
      const wx = x + 3 * (valueNoise2(x / 17, y / 17, s2) - 0.5);
      const wy = y + 3 * (valueNoise2(x / 17 + 31.7, y / 17 - 12.4, s2) - 0.5);
      const mid = 0.6 * valueNoise2(wx / 30, wy / 30, s3) + 0.4 * valueNoise2(wx / 12, wy / 12, s3 + 1);
      let cov = (lerp(recipe.body, -0.3, smoothstep(core, 1, d)) + 0.38 * (mid - 0.5)) * recipe.top;
      // round pores at three scales + a few punched bubbles
      if (!speck) {
        const qx = wx + 5 * (valueNoise2(x / 7, y / 7, s4 + 3) - 0.5), qy = wy + 5 * (valueNoise2(x / 7 + 11.3, y / 7 - 4.7, s4 + 3) - 0.5);
        // (big pores only on tiles that can hold them: a small dab keeps its body)
        const p1 = S >= 100 ? pores(qx, qy, 26, s4, gate * 0.8, 0.46, aa) : 0;
        const p2 = S >= 60 ? pores(qx + 3.1, qy - 1.7, 13, s5, gate, 0.46, aa) : 0;
        const p3 = pores(qx - 5.3, qy + 2.9, 6.5, s5 + 91, gate * (S >= 60 ? 0.9 : 0.6), 0.44, aa);
        cov -= 1.6 * Math.max(p1, p2, p3);
        for (const [hx, hy, hr] of holes) {
          const hc = (hr - Math.hypot(wx - hx, wy - hy)) / (1.6 / q) + 0.5;
          if (hc > 0) cov -= 1.5 * (hc > 1 ? 1 : hc);
        }
      }
      if (cov <= -0.2) continue;
      // fine stipple: where coverage < 1 the print breaks up into powdery sponge grain
      let g = 0.62 * valueNoise2(x / GRAIN, y / GRAIN, s6) + 0.38 * valueNoise2(x / (GRAIN / 2.1), y / (GRAIN / 2.1), s6 + 1);
      g = clamp(0.5 + (g - 0.5) * 2.4);
      // paint load: OPAQUE matte wall paint — a print either covers or leaves a hole (colours show
      // through each other's GAPS, never by transparency); only a breath thinner toward the rim
      const load = 0.985 + 0.015 * smoothstep(0.2, 0.8, valueNoise2(x / 21, y / 21, s6 + 5));
      const rim = lerp(1, 0.975, smoothstep(core * 0.7, 1, d));
      const dust = 0.99 + 0.01 * valueNoise2(x / 1.3, y / 1.3, s6 + 9);
      raw[Y * N + X] = smoothstep(-0.03, 0.03, cov - g) * load * rim * dust;
    }
  }
  // pre-filter: a light tent blur takes the pixel-hard edge off the stipple (crisp 1-3 px grain is
  // part of the look; the sub-pixel shimmer of moving sprites is removed by supersampling, see
  // ENGINE.md "Known limits")
  const alpha = new Uint8ClampedArray(N * N);
  let sum = 0;
  for (let y = 0; y < N; y++) {
    const y0 = y > 0 ? y - 1 : y, y1 = y < N - 1 ? y + 1 : y;
    for (let x = 0; x < N; x++) {
      const x0 = x > 0 ? x - 1 : x, x1 = x < N - 1 ? x + 1 : x;
      const m = raw[y * N + x];
      const blur = (4 * m + 2 * (raw[y * N + x0] + raw[y * N + x1] + raw[y0 * N + x] + raw[y1 * N + x])
        + raw[y0 * N + x0] + raw[y0 * N + x1] + raw[y1 * N + x0] + raw[y1 * N + x1]) / 16;
      const a = Math.round(lerp(m, blur, PREFILTER) * 255);
      alpha[y * N + x] = a;
      sum += a;
    }
  }
  return { alpha, fill: sum / (255 * N * N) };
}

// Mean alpha ("fill") of every stamp tile, [level][recipe]. scatterDabs derives the NUMBER of presses
// of a layer from it, so it must never depend on the tile density Q — a supersampled render would
// otherwise scatter a different painting (it did: 4.5 % more ink at Q = 2 -> other counts, other grids).
// These are the measured fills of the 2x tiles of initSponge(50), the tiles every style review was
// made on; they are constants now, at every scale. tools/check.mjs re-measures them (and fails if the
// recipes / levels / seed were changed without refreshing this table: run it with --fills to print one).
const FILL_SEED = 50;
const FILL = [
  [0.14277112079399662, 0.23284011135318325, 0.18530016945049624, 0.18254054708303075, 0.16227003146937788, 0.16709331880900508, 0.17935729847494553, 0.10848160251755024, 0.07819232631324134, 0.025248123940934397, 0.12653413217138706, 0.05403050108932462, 0.05256596465746793, 0.06581033648027113, 0.09688634713144517, 0.10260530137981118],
  [0.19518057222889157, 0.24075880352140858, 0.23794392757102842, 0.21286264505802321, 0.1788965586234494, 0.1344562825130052, 0.22692702080832333, 0.15060899359743898, 0.07922418967587035, 0.087437474989996, 0.13006202480992396, 0.0731655162064826, 0.07429096638655462, 0.047486494597839136, 0.05350390156062425, 0.04762780112044818],
  [0.17572567250040513, 0.22202337546588882, 0.1583029492788851, 0.16237289337222494, 0.175411197536866, 0.17424951385512882, 0.16485375141792255, 0.13771623318748988, 0.10995634824177605, 0.095034232701345, 0.14241816561335277, 0.07275309917355371, 0.06194549100631988, 0.051762275157997084, 0.10498703613676875, 0.02808955193647707],
  [0.14580836964415395, 0.1568606647906076, 0.2147380325587025, 0.16177416182522392, 0.1456273828976035, 0.14820355997337206, 0.17843534404502542, 0.1564903700677802, 0.07990706699346405, 0.060679541878479785, 0.09782986111111111, 0.0535282014040184, 0.07560688241345921, 0.057443907346889374, 0.09623748033163883, 0.04172548263132413],
  [0.2275023148148148, 0.1998171977124183, 0.2227894880174292, 0.15717020697167755, 0.16384974128540306, 0.12093464052287582, 0.14958728213507624, 0.11771044389978214, 0.0867953431372549, 0.05049135348583878, 0.09721834150326797, 0.04898665577342048, 0.059238902505446625, 0.06938385076252723, 0.071291598583878, 0.04361683006535948],
  [0.21647574231515523, 0.18905258012493192, 0.234573344311683, 0.1880563374438317, 0.16425355732570807, 0.12321293317674292, 0.18665885842184096, 0.13731952742034315, 0.06904637288943355, 0.05375170738868464, 0.09068409373297931, 0.041262797436683006, 0.06413005089188453, 0.05645706741898148, 0.08354622502212691, 0.04923670151654412],
  [0.21655679381127452, 0.18596590647977942, 0.2334017022824755, 0.15653871783088236, 0.15721461397058822, 0.12699951171875, 0.1831285520067402, 0.11969712201286764, 0.0850228151807598, 0.05687023207720588, 0.09239582375919117, 0.04988687193627451, 0.0625638978247549, 0.053748726639093136, 0.0837613645067402, 0.04915668083639706],
];

let STAMPS = null;           // [level][i] -> {canvas, kind, fill (frozen), measured}   (tile density Q)
let STAMPS2 = null;          // the same prints at 2 device px per logical px (lazy; density-2 sprites at Q = 1)
let KIND = null;             // {dense:[i..], mid:[..], airy:[..], speck:[..], any, body, open, soft}
const tintCache = new Map(); // "level|i|#hex" -> canvas (LRU by pixel budget)
const TINT_BUDGET = 14e6;    // px (~56 MB RGBA)
let tintPx = 0;

/** Generate the stamp set. Call once (engine init does). */
function genStampSet(seed, q) {
  return LEVELS.map((S, lv) => RECIPES.map((recipe, i) => {
    const { alpha, fill } = genStampAlpha(S, recipe, seedOf('stamp', i, lv, seed), q);
    const N = S * q;
    const canvas = new OffscreenCanvas(N, N);
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(N, N);
    for (let p = 0; p < N * N; p++) {
      img.data[p * 4] = img.data[p * 4 + 1] = img.data[p * 4 + 2] = 255;
      img.data[p * 4 + 3] = alpha[p];
    }
    ctx.putImageData(img, 0, 0);
    // fill: the frozen, scale-independent value (a custom seed has no table: its own measurement)
    return { canvas, kind: recipe.kind, fill: seed === FILL_SEED ? FILL[lv][i] : fill, measured: fill };
  }));
}
let stampSeed = FILL_SEED;
/** The stamp set at tile density q (1 | 2); the 2x set is generated on first use when Q = 1. */
function stampSet(q) {
  if (q === Q) return STAMPS;
  if (!STAMPS2) STAMPS2 = genStampSet(stampSeed, 2);
  return STAMPS2;
}

export function initSponge(seed = 50) {
  Q = env.res >= 1.5 ? 2 : 1;
  stampSeed = seed;
  STAMPS = genStampSet(seed, Q);
  STAMPS2 = null;
  KIND = { dense: [], mid: [], airy: [], speck: [] };
  RECIPES.forEach((r, i) => KIND[r.kind].push(i));
  KIND.any = [...KIND.dense, ...KIND.mid, ...KIND.airy];
  KIND.body = [...KIND.dense, ...KIND.mid];
  KIND.open = [...KIND.mid, ...KIND.airy];
  KIND.soft = [...KIND.airy, ...KIND.speck];
  tintCache.clear();
  tintPx = 0;
  holeTiles.clear();
  scaledHoles.clear();
}

export const stampCount = () => RECIPES.length;
/** Measured mean alpha of every stamp tile at the current tile density: [level][recipe] (diagnostics). */
export const stampFillTable = () => ({ q: Q, frozen: FILL, measured: STAMPS.map((lv) => lv.map((s) => s.measured)) });
/** Indices of the stamps of a kind ('dense' | 'mid' | 'airy' | 'speck' | 'any' | 'body' | 'open' | 'soft'). */
export const stampsOf = (kind) => KIND[kind];

/** Stamp level whose tile best matches a dab of `px` LOGICAL pixels. */
function levelFor(px) {
  for (let lv = 0; lv < LEVELS.length; lv++) if (LEVELS[lv] >= px * 0.92) return lv;
  return LEVELS.length - 1;
}

let sandCanvas = null;
/**
 * Grey-centred sandy noise tile (for 'soft-light'): gives every print the fine tonal and slightly
 * chromatic grain of matte wall paint. It is part of the stamp, so it moves with the object.
 */
function paintSand() {
  if (sandCanvas) return sandCanvas;
  const S = 256;
  sandCanvas = new OffscreenCanvas(S, S);
  const ctx = sandCanvas.getContext('2d');
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const fine = hash2(x, y, 911) - 0.5;
      const soft = (hash2(x >> 1, y >> 1, 912) + hash2((x + 1) >> 1, (y + 1) >> 1, 913)) / 2 - 0.5;
      const v = 128 + SAND * (0.62 * fine + 0.6 * soft);
      const o = (y * S + x) * 4;
      img.data[o] = v + SAND * 0.22 * (hash2(x, y, 914) - 0.5);
      img.data[o + 1] = v;
      img.data[o + 2] = v + SAND * 0.3 * (hash2(x, y, 915) - 0.5);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return sandCanvas;
}

/** A stamp pre-multiplied with a colour + sandy paint grain (cached, LRU). */
function tintedStamp(lv, i, color, q = Q) {
  const key = (q === Q ? '' : 'x') + lv + '|' + i + color;
  let c = tintCache.get(key);
  if (c) {
    tintCache.delete(key);
    tintCache.set(key, c);
    return c;
  }
  const S = LEVELS[lv] * q;
  c = new OffscreenCanvas(S, S);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, S);
  if (SAND > 0) {
    // the sand grain keeps its LOGICAL size (q x q device px per grain, unsmoothed)
    const h = hashInt(lv * 64 + i, hashStr(color), 77), T = 256 * q, ox = (h & 127) * q, oy = ((h >>> 8) & 127) * q;
    ctx.globalCompositeOperation = 'soft-light';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(paintSand(), -ox, -oy, T, T);
    ctx.drawImage(paintSand(), T - ox, -oy, T, T);
    ctx.drawImage(paintSand(), -ox, T - oy, T, T);
    ctx.drawImage(paintSand(), T - ox, T - oy, T, T);
  }
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(stampSet(q)[lv][i].canvas, 0, 0);
  tintCache.set(key, c);
  tintPx += S * S;
  while (tintPx > TINT_BUDGET * (Q > 1 ? 2.5 : 1)) {
    const [k, old] = tintCache.entries().next().value;
    tintCache.delete(k);
    tintPx -= old.width * old.height;
  }
  return c;
}

/**
 * A single tinted stamp as a canvas (for particles and other small sprites): stamp index i from
 * stampsOf(kind), colour #RRGGBB, at the smallest level that holds `px` logical pixels. The canvas
 * is square; draw it scaled to the size you need (its pixel size is the tile size x 1 or x 2).
 */
export function stampCanvas(i, color, px = 72) {
  return tintedStamp(levelFor(px), i, color);
}

/** Press dabs[from..to) onto a surface, in order (no layer handling: see paintLayered). */
export function paintDabs(surf, dabs, from = 0, to = dabs.length) {
  const { ctx, res } = surf;
  const q = qOf(res);
  ctx.save();
  ctx.imageSmoothingQuality = res / q >= 0.85 ? 'low' : 'medium'; // stamps are never minified below ~0.6 at full scale
  for (let i = from; i < to; i++) {
    const d = dabs[i];
    const lv = levelFor(d.size), S = LEVELS[lv] * q;
    const k = (d.size * res) / S;
    const c = Math.cos(d.rot) * k, s = Math.sin(d.rot) * k;
    const f = d.flip ? -1 : 1;
    ctx.setTransform(c * f, s * f, -s * d.squash, c * d.squash, d.x * res, d.y * res);
    ctx.globalAlpha = d.alpha;
    ctx.drawImage(tintedStamp(lv, d.stamp, d.color, q), -S / 2, -S / 2);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ layer pores

// Tileable masks of round holes (jittered grid, clustered by low-frequency noise). One is punched
// through every colour layer after its dabs are pressed, so pores survive same-colour overlap.
const HOLE_T = 384, HOLE_G = 12;
const HOLE_DENSITY = [0, 0.2, 0.42, 0.72, 0.05]; // chance of a hole per cell for levels 1..3 (before clustering); 4 = sparse
const holeTiles = new Map();

function holeTile(level, variant) {
  const key = level * 8 + variant;
  let c = holeTiles.get(key);
  if (c) return c;
  const T = HOLE_T, g = HOLE_G, n = T / g, seed = seedOf('holes', level, variant);
  // tileable value noise with lattice period P
  const pn = (x, y, P, sd) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const h = (i, j) => hash2(((i % P) + P) % P, ((j % P) + P) % P, sd);
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
  };
  const cells = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const h = hashInt(i, j, seed);
      const cx = (i + ((h >>> 10) & 1023) / 1023) * g, cy = (j + ((h >>> 20) & 1023) / 1023) * g;
      const cl = pn((cx / T) * 5, (cy / T) * 5, 5, seed + 3); // pores gather in clusters
      const prob = HOLE_DENSITY[level] * (0.12 + 1.9 * smoothstep(0.3, 0.72, cl));
      if ((h & 1023) / 1023 >= prob) { cells.push(null); continue; }
      const q = hash2(i, j, seed + 7);
      cells.push({
        x: cx, y: cy, r: 1.1 + 5.6 * Math.pow(q, 2.6), el: 1 + (hash2(i, j, seed + 8) - 0.5) * 0.9,
        rot: hash2(i, j, seed + 9) * Math.PI, a: 1,
      });
    }
  }
  c = new OffscreenCanvas(T, T);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(T, T);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      // warped lookup: holes become irregular flecks and blobs instead of punched circles
      const wx = x + 5.5 * (pn(x / 8, y / 8, 48, seed + 21) - 0.5) + 2.6 * (pn(x / 3, y / 3, 128, seed + 22) - 0.5);
      const wy = y + 5.5 * (pn(x / 8 + 7.3, y / 8 + 3.1, 48, seed + 23) - 0.5) + 2.6 * (pn(x / 3 + 5.2, y / 3 + 9.7, 128, seed + 24) - 0.5);
      const ci = Math.floor(wx / g), cj = Math.floor(wy / g);
      let best = 0;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const wi = (((ci + i) % n) + n) % n, wj = (((cj + j) % n) + n) % n;
          const hc = cells[wj * n + wi];
          if (!hc) continue;
          let dx = wx - hc.x, dy = wy - hc.y;
          dx -= Math.round(dx / T) * T;
          dy -= Math.round(dy / T) * T;
          const cr = Math.cos(hc.rot), sr = Math.sin(hc.rot);
          const ex = (dx * cr + dy * sr) * hc.el, ey = (-dx * sr + dy * cr) / hc.el;
          const v = clamp((hc.r - Math.hypot(ex, ey)) / 1.1 + 0.5) * hc.a;
          if (v > best) best = v;
        }
      }
      const o = (y * T + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = Math.round(best * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  holeTiles.set(key, c);
  return c;
}

const HOLE_SCALES = [0.5, 0.65, 0.8, 1, 1.15];
const scaledHoles = new Map();
/** Hole tile pre-scaled to one of a few sizes, so punching is a plain (fast) pattern fill. */
function scaledHoleTile(level, variant, si) {
  const key = (level * 8 + variant) * 8 + si;
  let c = scaledHoles.get(key);
  if (c) return c;
  const src = holeTile(level, variant), k = HOLE_SCALES[si];
  if (k === 1) c = src;
  else {
    const T = Math.round(HOLE_T * k);
    c = new OffscreenCanvas(T, T);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, T, T);
  }
  scaledHoles.set(key, c);
  return c;
}

/** Punch a layer's pores through whatever is on the surface (sprite-anchored, scale independent). */
function punchPores(surf, m, x, y, w, h) {
  if (!m || !m.level) return;
  const { ctx } = surf;
  const rng = makeRng(m.seed);
  let si = 0;
  for (let i = 1; i < HOLE_SCALES.length; i++) if (Math.abs(HOLE_SCALES[i] - m.scale) < Math.abs(HOLE_SCALES[si] - m.scale)) si = i;
  const pat = ctx.createPattern(scaledHoleTile(m.level, rng.int(0, 1), si), 'repeat');
  pat.setTransform(new DOMMatrix().translateSelf(rng.int(0, HOLE_T), rng.int(0, HOLE_T)));
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = 1;
  ctx.fillStyle = pat;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

let scratchCanvas = null;
/** Engine-owned scratch surface of at least w x h logical px; the rect (x, y, rw, rh) is cleared. */
function layerScratch(w, h, res, x, y, rw, rh) {
  const cw = Math.ceil(w * res), ch = Math.ceil(h * res);
  if (!scratchCanvas || scratchCanvas.width < cw || scratchCanvas.height < ch) {
    scratchCanvas = new OffscreenCanvas(Math.max(cw, scratchCanvas?.width ?? 0), Math.max(ch, scratchCanvas?.height ?? 0));
  }
  const ctx = scratchCanvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(x, y, rw, rh);
  ctx.setTransform(res, 0, 0, res, 0, 0);
  return { canvas: scratchCanvas, ctx, res };
}

/**
 * Paint a layered dab list (sorted by layer, then rank) onto a surface: each colour layer is
 * pressed on a scratch canvas, its pores are punched, and it is laid over the layers below.
 * Only dabs with rank < upTo are painted (reveal stage).
 */
export function paintLayered(surf, dabs, meta = dabs.meta, upTo = Infinity) {
  let i = 0;
  const N = dabs.length, res = surf.res, CW = surf.canvas.width, CH = surf.canvas.height;
  while (i < N) {
    const li = dabs[i].li ?? 0;
    let j = i, n = i;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    while (j < N && (dabs[j].li ?? 0) === li) {
      const d = dabs[j];
      if ((d.rank ?? 0) < upTo) {
        n = j + 1;
        const r = d.size * 0.8;
        if (d.x - r < x0) x0 = d.x - r;
        if (d.y - r < y0) y0 = d.y - r;
        if (d.x + r > x1) x1 = d.x + r;
        if (d.y + r > y1) y1 = d.y + r;
      }
      j++;
    }
    if (n > i) {
      const m = meta ? meta[li] : null;
      if (m && m.level) {
        // device-pixel rect that this layer can touch
        const px = Math.max(0, Math.floor(x0 * res)), py = Math.max(0, Math.floor(y0 * res));
        const pw = Math.min(CW, Math.ceil(x1 * res)) - px, ph = Math.min(CH, Math.ceil(y1 * res)) - py;
        if (pw > 0 && ph > 0) {
          const sc = layerScratch(surf.w, surf.h, res, px, py, pw, ph);
          sc.ctx.save();
          sc.ctx.beginPath();
          sc.ctx.rect(px / res, py / res, pw / res, ph / res);
          sc.ctx.clip();
          paintDabs(sc, dabs, i, n);
          sc.ctx.restore();
          punchPores(sc, m, px / res, py / res, pw / res, ph / res);
          const c = surf.ctx;
          c.save();
          c.setTransform(1, 0, 0, 1, 0, 0);
          c.globalAlpha = 1;
          c.globalCompositeOperation = 'source-over';
          c.drawImage(sc.canvas, px, py, pw, ph, px, py, pw, ph);
          c.restore();
        }
      } else paintDabs(surf, dabs, i, n);
    }
    i = j;
  }
}

// ------------------------------------------------------------------ dab scattering

/** Low-frequency "patchiness" probability: paint gathers in islands instead of an even mist. */
export function patchFn({ scale = 300, amount = 0.5, sharp = 0.5, seed = 1, invert = false } = {}) {
  const th = 0.5 + (amount - 0.5) * 0.56;
  const soft = lerp(0.2, 0.025, sharp);
  return (x, y) => {
    const v = smoothstep(th - soft, th + soft, fbm2(x / scale, y / scale, seed, 3));
    return invert ? 1 - v : v;
  };
}

/** Reveal-order function (x, y, rng) -> 0..1 for a reveal spec over a w x h area. */
export function revealOrder(spec = {}, w, h) {
  if (typeof spec.order === 'function') return spec.order;
  const jit = spec.jitter ?? 0.16;
  if (spec.order === 'radial') {
    const [fx, fy] = spec.from ?? [w / 2, h / 2];
    const far = Math.max(Math.hypot(fx, fy), Math.hypot(w - fx, fy), Math.hypot(fx, h - fy), Math.hypot(w - fx, h - fy));
    return (x, y, rng) => clamp((Math.hypot(x - fx, y - fy) / far) * (1 - jit) + rng.next() * jit);
  }
  if (spec.order === 'sweep') {
    const a = spec.angle ?? -Math.PI / 2; // direction the reveal travels (default: bottom -> top)
    const ux = Math.cos(a), uy = Math.sin(a);
    const cs = [0, 0, w, 0, 0, h, w, h];
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < 8; i += 2) {
      const v = cs[i] * ux + cs[i + 1] * uy;
      lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
    return (x, y, rng) => clamp(((x * ux + y * uy - lo) / (hi - lo)) * (1 - jit) + rng.next() * jit);
  }
  return (x, y, rng) => rng.next();
}

/**
 * Re-time a ranked dab list so that equal steps of rank lay down equal amounts of PAINT (reveal:
 * {even: 'area'}): the order of the dabs is kept, only their rank values move. "Paint" = the cells
 * of a 4 px grid a dab newly covers within its own colour layer, so the big ground prints of a sky
 * (which cover most of the wall with the first few dozen presses) are spread over several stages
 * instead of slamming in at once, and upper layers still count for what they repaint.
 */
export function evenRanksByArea(dabs, w, h) {
  const cell = 4, cols = Math.max(1, Math.ceil(w / cell)), rows = Math.max(1, Math.ceil(h / cell));
  const grids = new Map();
  const idx = dabs.map((_, i) => i).sort((a, b) => dabs[a].rank - dabs[b].rank || a - b);
  const gain = new Float64Array(dabs.length);
  let total = 0;
  for (const i of idx) {
    const d = dabs[i];
    let g = grids.get(d.li);
    if (!g) grids.set(d.li, (g = new Uint8Array(cols * rows)));
    const r = d.size * 0.36, r2 = r * r;
    const cx0 = Math.max(0, Math.floor((d.x - r) / cell)), cx1 = Math.min(cols - 1, Math.floor((d.x + r) / cell));
    const cy0 = Math.max(0, Math.floor((d.y - r) / cell)), cy1 = Math.min(rows - 1, Math.floor((d.y + r) / cell));
    let n = 0;
    for (let y = cy0; y <= cy1; y++) {
      for (let x = cx0; x <= cx1; x++) {
        const k = y * cols + x, dx = (x + 0.5) * cell - d.x, dy = (y + 0.5) * cell - d.y;
        if (!g[k] && dx * dx + dy * dy <= r2) { g[k] = 1; n++; }
      }
    }
    gain[i] = n + 0.02;          // (a print that only repeats what is there still takes its turn)
    total += gain[i];
  }
  let acc = 0;
  for (const i of idx) {
    dabs[i].rank = (acc + 0.5 * gain[i]) / total;
    acc += gain[i];
  }
  return dabs;
}

const PORE_LEVEL = (p) => (p <= 0 ? 0 : p < 0.2 ? 4 : p < 0.4 ? 1 : p < 0.8 ? 2 : 3);   // < 0.2: a few stray pores only

/** Give every dab its reveal rank (uniform 0..1 by key) and sort by layer, then rank. */
export function rankDabs(dabs) {
  const byKey = dabs.map((d, i) => [d, i]).sort((a, b) => a[0].key - b[0].key || a[1] - b[1]);
  byKey.forEach(([d], i) => { d.rank = (i + 0.5) / byKey.length; });
  return dabs.map((d, i) => [d, i]).sort((a, b) => a[0].li - b[0].li || a[0].rank - b[0].rank || a[1] - b[1]).map((e) => e[0]);
}

/**
 * Turn layer specs into a dab list (sorted by layer, then reveal rank; `.meta` = per-layer pore info).
 * layer: { color | colors[] (#RRGGBB), coverage (0..~0.99 inked fraction where probability = 1),
 *          size (px), opacity (number | [lo,hi] per dab; default [0.97, 1]), jitter (1 = natural dab-to-dab variation, 0 = none;
 *          scales the defaults of sizeJitter 0.3, tint 0.05 colour wobble, squash 0.18), tints (5),
 *          stamps ('any'|'dense'|'mid'|'airy'|'speck'|'body' = dense+mid|'open' = mid+airy|
 *                  'soft' = airy+speck), even (bool),
 *          pores (0..1 round pores punched through the whole layer; default 0.6, 0 for soft/speck),
 *          poreScale (size of those pores relative to the default for this dab size; 0.5..1.6),
 *          maskFn(x,y), shadeFn(x,y) -> 0..1 probability multipliers, patch: {scale, amount, sharp, seed} }
 * field (clusters only): (x,y,layer) -> 0..1 "depth inside the shape"; drives the soft edge.
 * reveal.layerMix: 1 = colour layers arrive strictly one after another, 0 = purely spatial;
 *                  default 0.4 (lower layers lead, but every layer is present from the first stage).
 * reveal.even: 'area' re-times the ranks so that every build stage lays down the same amount of
 *                  paint (default: the same NUMBER of dabs per stage).
 * The list never depends on the render scale.
 */
export function scatterDabs(layers, { w, h, seed = 1, reveal = {}, field = null, edge = 0.35 }) {
  const order = revealOrder(reveal, w, h);
  const layerMix = reveal.layerMix ?? 0.4;
  const dabs = [];
  const meta = [];
  const L = layers.length;
  layers.forEach((layer, li) => {
    const rng = makeRng(seedOf('layer', li, seed));
    const kindName = layer.stamps ?? 'any';
    const kind = KIND[kindName];
    if (!kind) throw new Error(`sponge layer ${li}: unknown stamps "${kindName}"`);
    const size = layer.size ?? 90;
    const jit = layer.jitter ?? 1;
    const sizeJ = layer.sizeJitter ?? 0.3 * jit;
    const op = Array.isArray(layer.opacity) ? layer.opacity : layer.opacity === undefined ? [0.97, 1] : [layer.opacity, layer.opacity];
    const squash = layer.squash ?? 0.18 * jit;
    const base = layer.colors ?? [layer.color];
    if (!base.every((c) => /^#[0-9a-f]{6}$/i.test(c ?? ''))) throw new Error(`sponge layer ${li}: color / colors must be #RRGGBB hex`);
    const colors = base.flatMap((c) => tintSet(c, layer.tints ?? 5, layer.tint ?? 0.05 * jit, rng));
    const patch = layer.patch ? patchFn({ seed: seedOf('patch', li, seed), ...layer.patch }) : null;
    const pore = layer.pores ?? (kindName === 'soft' || kindName === 'speck' ? 0 : 0.6);
    meta.push({ level: PORE_LEVEL(pore === true ? 0.6 : +pore || 0), scale: clamp((size / 120) * (layer.poreScale ?? 1), 0.5, 1.15), seed: seedOf('pores', li, seed) });
    const lvl = STAMPS[levelFor(size)];
    const fill = kind.reduce((a, i) => a + lvl[i].fill, 0) / kind.length;   // frozen table: the same at every scale
    const m = size * 0.2; // candidates may sit a little outside so borders are covered like the middle
    const cov = clamp(layer.coverage ?? 0.8, 0.005, 0.996);
    const n = Math.ceil((-Math.log(1 - cov) * (w + 2 * m) * (h + 2 * m)) / (fill * size * size * (1 + sizeJ * sizeJ / 3)));
    const even = layer.even ?? cov >= 0.9;
    const cols = Math.max(1, Math.round(Math.sqrt((n * (w + 2 * m)) / (h + 2 * m))));
    const rows = Math.max(1, Math.ceil(n / cols));
    const total = even ? cols * rows : n;
    for (let i = 0; i < total; i++) {
      let x, y;
      if (even) {
        x = -m + ((i % cols) + rng.next()) * ((w + 2 * m) / cols);
        y = -m + (Math.floor(i / cols) + rng.next()) * ((h + 2 * m) / rows);
      } else {
        x = -m + rng.next() * (w + 2 * m);
        y = -m + rng.next() * (h + 2 * m);
      }
      let p = 1, sz = size, stampSet = kind;
      if (field) {
        const f = field(x, y, layer);
        if (f <= 0) continue;
        const e = smoothstep(0, edge, f);
        p *= e * e;
        sz *= lerp(0.5, 1, smoothstep(0, edge * 1.4, f));
        if (f < edge * 0.45 && !layer.stamps) stampSet = KIND.soft; // spray-like stipple right at the rim
      }
      if (layer.maskFn) p *= layer.maskFn(x, y);
      if (p > 0 && layer.shadeFn) p *= layer.shadeFn(x, y);
      if (p > 0 && patch) p *= patch(x, y);
      if (p <= 0 || rng.next() >= p) continue;
      const u = order(x, y, rng);
      dabs.push({
        x, y,
        size: sz * (1 + rng.sym(sizeJ)),
        rot: rng.next() * TAU,
        flip: rng.chance(0.5),
        squash: 1 + rng.sym(squash),
        stamp: rng.pick(stampSet),
        color: rng.pick(colors),
        alpha: lerp(op[0], op[1], rng.next()),
        li,
        key: layerMix * ((li + u) / L) + (1 - layerMix) * u,
      });
    }
  });
  const out = rankDabs(dabs);
  if (reveal.even === 'area') evenRanksByArea(out, w, h);
  out.meta = meta;
  return out;
}

/**
 * Append dab list b on top of a: b's layers go above a's and are revealed in the last (1 - at)
 * part of the progress. Returns a new list (with .meta).
 */
export function joinDabs(a, b, { at = 0.8 } = {}) {
  const L = a.meta.length;
  const out = [
    ...a.map((d) => ({ ...d, rank: d.rank * at })),
    ...b.map((d) => ({ ...d, li: d.li + L, rank: at + (1 - at) * d.rank })),
  ];
  out.meta = [...a.meta, ...b.meta];
  return out;
}

// ------------------------------------------------------------------ Painted

const KEEP_ALL_PX = 3e6; // sprites whose (backing px * steps) fit this budget cache every stage while revealing
const IDLE_FRAMES = 8;   // final-only draws before the reveal scratch memory is released

/**
 * A baked, drawable piece of sponge painting.
 *   .draw(ctx, x, y, {p, alpha, rot, scale, sx, sy, blend, mode})   anchor (ax, ay) lands on (x, y)
 *   .at(p, mode) -> surface | null                                  stage surface for reveal progress p
 *   .masked(revealSpec) -> Painted                                  same picture, other mask reveal
 * p is quantised to `steps` discrete stages; p >= 1 uses the final bake (zero overhead).
 * Reveal modes:
 *   'build'  the dabs with rank < p, layer over layer (a true build-up; default for soft clusters)
 *   'mask'   the FINISHED picture seen through an ordered mask of sponge prints (the look is intact
 *            at every stage; default for stencils with a base, wrapped surfaces and dab-outs)
 */
export class Painted {
  constructor({ w, h, ax = 0, ay = 0, dabs = [], meta = dabs.meta ?? null, steps = 8, post = null, image = null,
    mode = 'build', reveal = {}, seed = 1, maskDab = null, origin = [0, 0], res = env.res }) {
    this.ax = ax; this.ay = ay;
    this.origin = origin;   // local-coordinate origin of the builder, in sprite pixels (for masked())
    this.dabs = dabs;
    this.meta = meta;
    this.steps = steps;
    this.post = post;       // (surface, isFinal, p) => void : stencil cut, edge print, slits…
    this.mode = image ? 'mask' : mode;
    this.reveal = reveal;   // spec used for the mask order
    this.seed = seed;
    this.maskDab = maskDab;
    if (image) this.final = image;
    else {
      this.final = surface(w, h, res);
      paintLayered(this.final, dabs, meta);
      if (post) post(this.final, true, 1);
    }
    this.res = this.final.res;   // device px per logical px of this sprite (env.res x its bake density)
    this.w = this.final.w; this.h = this.final.h;
    // exact logical size (surface sizes are rounded to device pixels): reveal masks are laid out
    // on it, so they are identical at every render scale
    this.lw = w ?? this.final.w; this.lh = h ?? this.final.h;
    this._mask = null; this._maskN = null; this._macc = null; this._maccN = 0; this._occ = null;
    this._stages = new Map(); this._outs = [];
    this._idle = 0;
    this._keepAll = this.final.canvas.width * this.final.canvas.height * steps <= KEEP_ALL_PX;
  }

  /** Wrap any finished surface; its reveal works through an ordered mask of sponge prints. */
  static fromSurface(surf, { ax = 0, ay = 0, seed = 1, steps = 8, dabSize = null, reveal = {}, origin = [0, 0], w = surf.w, h = surf.h } = {}) {
    const rv = reveal.from ? { ...reveal, from: [reveal.from[0] + origin[0], reveal.from[1] + origin[1]] } : reveal;
    return new Painted({ image: surf, w, h, ax, ay, steps, seed, reveal: rv, maskDab: dabSize ?? reveal.dab ?? null, origin });
  }

  /**
   * The same finished picture with another mask reveal (e.g. a dab-out that travels differently).
   * reveal.from is in the builder's local coordinates, like the bake-time spec.
   */
  masked(reveal = {}, { steps = reveal.steps ?? this.steps, seed = this.seed + 1, dabSize = reveal.dab ?? this.maskDab } = {}) {
    return Painted.fromSurface(this.final, { ax: this.ax, ay: this.ay, seed, steps, dabSize, reveal, origin: this.origin, w: this.lw, h: this.lh });
  }

  at(p = 1, mode = this.mode) {
    if (p >= 1) {
      if ((this._macc || this._outs.length || this._stages.size) && ++this._idle > IDLE_FRAMES) this.release();
      return this.final;
    }
    const k = Math.round(clamp(p) * this.steps);
    if (k <= 0) return null;
    if (k >= this.steps) return this.final;
    this._idle = 0;
    return this._stage(k, this.dabs.length && mode !== 'mask' ? 'build' : 'mask');
  }

  /**
   * Coarse map of where the finished sprite has paint: {cell (logical px), cols, rows, a: Uint8Array}
   * plus the ink bounding box. Computed once, lazily, from a small copy of the final bake.
   */
  _occupancy() {
    if (this._occ) return this._occ;
    const cell = 4, cols = Math.max(1, Math.ceil(this.lw / cell)), rows = Math.max(1, Math.ceil(this.lh / cell));
    const c = new OffscreenCanvas(cols, rows), g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(this.final.canvas, 0, 0, this.final.w / cell, this.final.h / cell);
    const d = g.getImageData(0, 0, cols, rows).data, a = new Uint8Array(cols * rows);
    let x0 = cols, y0 = rows, x1 = -1, y1 = -1;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = d[(y * cols + x) * 4 + 3];
        a[y * cols + x] = v;
        if (v > 20) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    const box = x1 < 0 ? [0, 0, this.lw, this.lh] : [x0 * cell, y0 * cell, Math.min(this.lw, (x1 + 1) * cell), Math.min(this.lh, (y1 + 1) * cell)];
    this._occ = { cell, cols, rows, a, box };
    return this._occ;
  }

  /**
   * Bounding box of the visible paint, relative to the ANCHOR: {x0, y0, x1, y1, w, h} in logical px
   * (accurate to ~4 px). A sprite drawn at (x, y) has its ink inside [x + x0, y + y0, x + x1, y + y1].
   */
  get inkBounds() {
    const [x0, y0, x1, y1] = this._occupancy().box;
    return { x0: x0 - this.ax, y0: y0 - this.ay, x1: x1 - this.ax, y1: y1 - this.ay, w: x1 - x0, h: y1 - y0 };
  }

  _maskDabs() {
    if (!this._mask) {
      const size = this.maskDab ?? clamp(Math.min(this.lw, this.lh) * 0.5, 40, 200);
      const all = scatterDabs([{ color: '#FFFFFF', coverage: 0.992, size, stamps: 'body', tints: 1, pores: 0 }],
        { w: this.lw, h: this.lh, seed: seedOf('mask', this.seed), reveal: { ...this.reveal, layerMix: 0 } });
      // keep only the prints that touch paint and rank those: every reveal stage then adds (or
      // removes) VISIBLE paint, so dabP timing is literal — no stage is spent on a transparent margin
      const { cell, cols, rows, a } = this._occupancy();
      const inked = (d) => {
        const r = d.size * 0.36;
        const cx0 = Math.max(0, Math.floor((d.x - r) / cell)), cx1 = Math.min(cols - 1, Math.floor((d.x + r) / cell));
        const cy0 = Math.max(0, Math.floor((d.y - r) / cell)), cy1 = Math.min(rows - 1, Math.floor((d.y + r) / cell));
        let sum = 0;
        for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) sum += a[y * cols + x];
        return sum > 255 * 2.5;          // at least a few cells' worth of paint under the print
      };
      const kept = all.filter(inked);
      const md = this._mask = kept.length ? rankDabs(kept) : all;
      // how many prints each stage needs so that stage k uncovers k / steps of the PAINT (prints
      // overlap heavily, so equal print counts would show most of the picture in the first stage)
      const hit = new Uint8Array(cols * rows);
      let total = 0;
      for (let i = 0; i < a.length; i++) if (a[i] > 40) total++;
      const cum = new Float32Array(md.length);
      let got = 0;
      md.forEach((d, i) => {
        const r = d.size * 0.4, r2 = r * r;
        const cx0 = Math.max(0, Math.floor((d.x - r) / cell)), cx1 = Math.min(cols - 1, Math.floor((d.x + r) / cell));
        const cy0 = Math.max(0, Math.floor((d.y - r) / cell)), cy1 = Math.min(rows - 1, Math.floor((d.y + r) / cell));
        for (let y = cy0; y <= cy1; y++) {
          for (let x = cx0; x <= cx1; x++) {
            const k = y * cols + x, dx = (x + 0.5) * cell - d.x, dy = (y + 0.5) * cell - d.y;
            if (!hit[k] && a[k] > 40 && dx * dx + dy * dy <= r2) { hit[k] = 1; got++; }
          }
        }
        cum[i] = got / Math.max(1, total);
      });
      const top = cum.length ? cum[cum.length - 1] : 1;
      this._maskN = Array.from({ length: this.steps + 1 }, (_, k) => {
        if (k >= this.steps) return md.length;
        const want = (k / this.steps) * top;
        let lo = 0, hi = md.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] >= want) hi = mid; else lo = mid + 1; }
        return k ? Math.min(md.length, lo + 1) : 0;
      });
    }
    return this._mask;
  }

  _stage(k, mode) {
    const key = mode === 'mask' ? -k : k;
    const hit = this._stages.get(key);
    if (hit) return hit;
    let out;
    if (this._keepAll) out = surface(this.w, this.h, this.res);
    else {
      // big sprites keep only the two most recent stages
      if (this._outs.length >= 2) {
        const old = this._outs.shift();
        this._stages.delete(old.key);
        out = old.s;
        clearSurface(out);
      } else out = surface(this.w, this.h, this.res);
      this._outs.push({ key, s: out });
    }
    const p = k / this.steps;
    if (mode === 'mask') {
      const md = this._maskDabs();
      const n = this._maskN ? this._maskN[k] : Math.round(md.length * p);
      if (!this._macc) { this._macc = surface(this.w, this.h, this.res); this._maccN = 0; }
      if (this._maccN > n) { clearSurface(this._macc); this._maccN = 0; }
      paintDabs(this._macc, md, this._maccN, n);
      this._maccN = n;
      const c = out.ctx;
      for (let i = 0; i < 3; i++) blit(c, this._macc); // translucent prints -> near-opaque mask
      c.globalCompositeOperation = 'source-in';
      blit(c, this.final);
      c.globalCompositeOperation = 'source-over';
    } else {
      paintLayered(out, this.dabs, this.meta, p);
      if (this.post) this.post(out, false, p);
    }
    this._stages.set(key, out);
    return out;
  }

  /** Free the scratch memory used by reveal stages (the final bake stays). */
  release() {
    this._macc = null; this._maccN = 0; this._outs = []; this._idle = 0;
    this._stages.clear();
  }

  draw(ctx, x = 0, y = 0, o) {
    const s = this.at(o?.p ?? 1, o?.mode ?? this.mode);
    if (!s) return;
    const a = o?.alpha ?? 1;
    if (a <= 0) return;
    const prev = ctx.globalAlpha, prevOp = ctx.globalCompositeOperation;
    ctx.globalAlpha = prev * Math.min(1, a);
    if (o?.blend) ctx.globalCompositeOperation = o.blend;
    if (o && (o.rot || o.scale !== undefined || o.sx !== undefined || o.sy !== undefined)) {
      const sc = o.scale ?? 1;
      ctx.save();
      ctx.translate(x, y);
      if (o.rot) ctx.rotate(o.rot);
      ctx.scale(sc * (o.sx ?? 1), sc * (o.sy ?? 1));
      ctx.drawImage(s.canvas, -this.ax, -this.ay, s.w, s.h);
      ctx.restore();
    } else ctx.drawImage(s.canvas, x - this.ax, y - this.ay, s.w, s.h);
    ctx.globalAlpha = prev;
    if (o?.blend) ctx.globalCompositeOperation = prevOp;
  }
}

// ------------------------------------------------------------------ builders

const baseLayer = (color, size) => ({ color, coverage: 0.985, size, stamps: 'dense', tint: 0.02, pores: 0, opacity: 1 });

/**
 * Rectangular sponge texture: colour layers dabbed over each other (first = bottom).
 * base: optional colour — the support is first dabbed in that colour and the final bake is made
 *       opaque with it.
 * reveal: { steps = 8, mode, order: 'random' | 'radial' | 'sweep' | fn(x,y,rng)->0..1, from, angle, jitter, layerMix }
 */
export function makeSpongeTexture({ w, h, seed = 1, base = null, layers, reveal = {} }) {
  const all = base ? [baseLayer(base, Math.max(60, Math.min(w, h) * 0.45)), ...layers] : layers;
  const dabs = scatterDabs(all, { w, h, seed, reveal });
  const post = base ? (s, final) => {
    if (!final) return;
    s.ctx.globalCompositeOperation = 'destination-over';
    s.ctx.fillStyle = base;
    s.ctx.fillRect(0, 0, s.w, s.h);
    s.ctx.globalCompositeOperation = 'source-over';
  } : null;
  return new Painted({ w, h, dabs, steps: reveal.steps ?? 8, post, mode: reveal.mode ?? (base ? 'mask' : 'build'), reveal, seed, maskDab: reveal.dab });
}

/**
 * Soft-edged sponge cluster (cloud, glow, mist, foliage mass…).
 * Shape: points [{x, y, r}] (union of soft discs) or shapeFn(x, y) -> 0..1 depth with explicit w, h.
 * Extra per-layer options: offset [dx, dy] (shift the shape for this layer), band [lo, hi]
 * (only where depth is inside the band, e.g. [0.5, 1] = core only), grow (scale disc radii).
 * edgeSoftness: fraction of the depth range over which dabs thin out, shrink and turn to stipple.
 * anchor: [x, y] in the same coordinates as points/shapeFn (default: bbox centre).
 */
export function makeCluster(spec) {
  return new Painted(clusterDabs(spec));
}

/** The dab list of a cluster without baking it: {w, h, ax, ay, dabs, steps, …} (see makeCluster). */
export function clusterDabs({ points = null, shapeFn = null, w, h, layers, edgeSoftness = 0.35, seed = 1, anchor = null, pad = null, reveal = {} }) {
  let ox = 0, oy = 0;
  if (points) {
    const maxSize = Math.max(...layers.map((l) => l.size ?? 90));
    const maxOff = Math.max(...layers.map((l) => Math.hypot(...(l.offset ?? [0, 0])) + ((l.grow ?? 1) - 1) * 200));
    const margin = pad ?? maxSize * 0.3 + maxOff;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of points) {
      const rx = p.rx ?? p.r, ry = p.ry ?? p.r;
      x0 = Math.min(x0, p.x - rx); y0 = Math.min(y0, p.y - ry);
      x1 = Math.max(x1, p.x + rx); y1 = Math.max(y1, p.y + ry);
    }
    ox = Math.floor(x0 - margin); oy = Math.floor(y0 - margin);
    w = Math.ceil(x1 + margin) - ox; h = Math.ceil(y1 + margin) - oy;
  }
  const depth = points
    ? (x, y, grow) => {
      let f = 0;
      for (const p of points) {
        const v = 1 - Math.hypot((x - p.x) / ((p.rx ?? p.r) * grow), (y - p.y) / ((p.ry ?? p.r) * grow));
        if (v > f) f = v;
      }
      return f;
    }
    : (x, y) => shapeFn(x, y);
  const field = (x, y, layer) => {
    const off = layer.offset;
    const f = depth(x + ox - (off ? off[0] : 0), y + oy - (off ? off[1] : 0), layer.grow ?? 1);
    if (layer.band) return f < layer.band[0] || f > layer.band[1] ? 0 : Math.min(f - layer.band[0], 1);
    return f;
  };
  const local = layers.map((l) => ({
    ...l,
    maskFn: l.maskFn ? (x, y) => l.maskFn(x + ox, y + oy) : undefined,
    shadeFn: l.shadeFn ? (x, y) => l.shadeFn(x + ox, y + oy) : undefined,
  }));
  const rv = reveal.from ? { ...reveal, from: [reveal.from[0] - ox, reveal.from[1] - oy] } : reveal;
  const dabs = scatterDabs(local, { w, h, seed, reveal: rv, field, edge: edgeSoftness });
  const a = anchor ?? [ox + w / 2, oy + h / 2];
  return { w, h, ax: a[0] - ox, ay: a[1] - oy, dabs, steps: reveal.steps ?? 8, mode: reveal.mode ?? 'build', reveal: rv, seed, maskDab: reveal.dab, origin: [-ox, -oy] };
}

/**
 * Tileable sponge pattern tiles (white on transparent, at res 1) used by stencil edge prints,
 * ornament prints and slit break-up. `boost` re-draws the tile over itself (denser, more opaque).
 */
export function makePoreTile(size, seed, { coverage = 0.6, dab = 70, stamps = 'any', boost = 1 } = {}) {
  const s = surface(size, size, 1);
  const dabs = scatterDabs([{ color: '#FFFFFF', coverage, size: dab, stamps, tints: 1, pores: 0 }], { w: size, h: size, seed });
  const one = boost > 1 ? surface(size, size, 1) : s;
  // draw 3x3 so dabs wrap around the tile borders
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      paintDabs(one, dabs.map((d) => ({ ...d, x: d.x + i * size, y: d.y + j * size })));
    }
  }
  if (boost > 1) for (let i = 0; i < boost; i++) blit(s.ctx, one);
  return s;
}
