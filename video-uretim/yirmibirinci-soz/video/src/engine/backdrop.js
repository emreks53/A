// backdrop.js — the wall everything is painted on, and the sponge-dabbed sky.
//
//   makeWall({w, h, seed})   cream primer, matte sandy faux-finish (opaque surface, baked once)
//   makeCloud({w, h, seed})  soft white cluster with a lavender-grey dab underneath (drifts freely)
//   makeSky({...})           light-blue ground, discrete cobalt prints, lavender; yellow + peach toward
//                            the sun, primer visible between dabs, optional static clouds; any size
//                            (pan a camera over it); dab-by-dab reveal via sky.draw(ctx, x, y, {p})

import { fbm2, hash2, makeRng, seedOf } from './rng.js';
import { clamp, lerp, smoothstep } from './ease.js';
import { surface, blit, PAL, tone, env } from './surface.js';
import { Painted, scatterDabs, paintDabs, clusterDabs, joinDabs, patchFn } from './sponge.js';

let grainTile = null;
/** 256 px device-pixel tile of fine sandy grain (near-white; meant for 'multiply'). */
function sandTile() {
  if (grainTile) return grainTile;
  const S = 256;
  grainTile = new OffscreenCanvas(S, S);
  const ctx = grainTile.getContext('2d');
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const fine = hash2(x, y, 901);
      const soft = (hash2(x >> 1, y >> 1, 902) + hash2((x + 1) >> 1, (y + 1) >> 1, 903)) / 2;
      let v = 1 - 0.022 * fine - 0.016 * soft; // mean ~0.981
      const sp = hash2(x, y, 904);
      if (sp < 0.006) v -= 0.055;         // darker sand grains
      else if (sp > 0.994) v += 0.02;     // brighter ones
      const i = (y * S + x) * 4;
      img.data[i] = 255 * Math.min(1, v);
      img.data[i + 1] = 255 * Math.min(1, v * 0.996);
      img.data[i + 2] = 255 * Math.min(1, v * 0.985);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return grainTile;
}

/**
 * Multiply device-pixel sand grain over a surface. The pattern is not scaled down with res
 * (previews keep a visible grain); supersampled renders (res 2) use 2x2 grains so the grain
 * survives the downscale unchanged.
 */
export function sandGrain(s, alpha = 1) {
  const c = s.ctx;
  const k = Math.max(1, Math.round(s.res));
  const pat = c.createPattern(sandTile(), 'repeat');
  c.save();
  c.setTransform(k, 0, 0, k, 0, 0);
  c.imageSmoothingEnabled = false;
  c.globalCompositeOperation = 'multiply';
  c.globalAlpha = alpha;
  c.fillStyle = pat;
  c.fillRect(0, 0, s.canvas.width / k, s.canvas.height / k);
  c.restore();
}

/** Soft low-frequency tonal mottling (multiply), ±amount around 1. */
export function mottle(s, seed, amount, scale) {
  const gw = Math.ceil(s.w / 24), gh = Math.ceil(s.h / 24);
  const g = new OffscreenCanvas(gw, gh);
  const gc = g.getContext('2d');
  const img = gc.createImageData(gw, gh);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const n = fbm2((x * 24) / scale, (y * 24) / scale, seed, 3) - 0.5;
      const v = 255 * clamp(1 - amount + n * amount * 2.4, 0, 1);
      const i = (y * gw + x) * 4;
      img.data[i] = v; img.data[i + 1] = v * 0.997; img.data[i + 2] = v * 0.988; img.data[i + 3] = 255;
    }
  }
  gc.putImageData(img, 0, 0);
  const c = s.ctx;
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.drawImage(g, 0, 0, s.w, s.h);
  c.restore();
}

/** The primed wall: opaque cream with faint sponge prints, tonal mottling and sand grain. */
export function makeWall({ w = env.W, h = env.H, seed = 7 } = {}) {
  const s = surface(w, h);
  s.ctx.fillStyle = '#F4E9D4'; // primer, pre-lightened by what the grain multiply takes away
  s.ctx.fillRect(0, 0, w, h);
  // the primer itself was sponged on: barely visible lighter / darker cream prints
  paintDabs(s, scatterDabs([
    { color: tone(PAL.primer, 0.32), coverage: 0.45, size: 230, opacity: [0.3, 0.6], stamps: 'any', tints: 1, pores: 0 },
    { color: tone(PAL.primer, -0.03), coverage: 0.4, size: 200, opacity: [0.35, 0.65], stamps: 'any', tints: 1, pores: 0 },
    { color: tone(PAL.primer, 0.4), coverage: 0.14, size: 120, opacity: [0.35, 0.7], stamps: 'soft', tints: 1 },
  ], { w, h, seed }));
  mottle(s, seed + 1, 0.016, 420);
  sandGrain(s, 1);
  return s;
}

function cloudSpec({ w = 380, h = 130, seed = 1, reveal = {} } = {}) {
  const rng = makeRng(seedOf('cloud', seed));
  const n = Math.max(3, Math.round(w / (h * 0.6)));
  const points = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const r = h * (0.3 + 0.24 * Math.sin(u * Math.PI) + rng.sym(0.05));
    points.push({ x: lerp(-w / 2 + r, w / 2 - r, u), y: h * 0.16 - r * 0.42 + rng.sym(h * 0.05), r });
  }
  return {
    points, seed: seedOf('cloudtex', seed), edgeSoftness: 0.7, anchor: [0, 0],
    layers: [
      // lavender-grey dab underneath: a clear band of open, powdery prints (opaque paint) that gives
      // the cloud its weight — never a slab
      { color: PAL.lavender, coverage: 0.74, size: h * 0.52, offset: [w * 0.03, h * 0.33], grow: 0.84, stamps: 'open', opacity: [0.9, 1], pores: 0.3 },
      { color: '#BDB2DE', coverage: 0.45, size: h * 0.42, offset: [0, h * 0.26], grow: 0.9, stamps: 'soft', opacity: [0.9, 1] },
      // white body with a powdery stipple fringe
      { color: PAL.cloudWhite, coverage: 0.9, size: h * 0.58, tint: 0.012, opacity: [0.92, 1], pores: 0.3 },
      { color: '#FFFFFF', coverage: 0.86, size: h * 0.46, band: [0.26, 1], stamps: 'body', tints: 1, pores: 0.3 },
      { color: '#FFFFFF', coverage: 0.4, size: h * 0.3, stamps: 'speck', grow: 1.12, tints: 1, opacity: [0.75, 1] },
    ],
    reveal: { steps: 5, mode: 'mask', order: 'sweep', angle: 0, jitter: 0.3, dab: clamp(h * 0.8, 60, 150), ...reveal },
  };
}

/**
 * Soft white cloud (anchor = centre) with a lavender-grey dab underneath. w, h = rough extents.
 * It reveals in 'mask' mode: the finished cloud appears / disappears print by print (pass
 * reveal: {mode: 'build'} for lavender-first build-up).
 */
export function makeCloud(opts) {
  return new Painted(clusterDabs(cloudSpec(opts)));
}

/**
 * Sky.
 *   w, h      logical size (make it larger than the frame if the camera pans / zooms out)
 *   sun       {x, y, r} warm region: yellow clouds inside ~0.6 r, peach patches out to ~1.5 r, blues
 *             held back there. null = plain blue sky.
 *   horizon   y below which peach / pale warm dabs gather (default: none)
 *   mood      0..1 how much cobalt + lavender (0.5 default = the airy reference sky: about one sixth
 *             of the upper sky is cobalt; 0.25 = calm and light, 1 = heavy, busy)
 *   zenith    [y0, y1] sky rows between which the cobalt prints thin out (dense above y0, only a few
 *             stray prints below y1; default [h * 0.1, h * 0.36]): the lower sky stays a calm light
 *             blue behind the subject
 *   calm      {y0, y1, amount = 1} sky rows kept free of cobalt / lavender prints (a calm light-blue /
 *             cream field, relative luminance >= 0.4: dark gloss ink reads at >= 6.5 : 1 on it)
 *   solid     [[x, y, r = 160], …] discs (sky coordinates) where the sky stays blue — no island of
 *             bare primer, no yellow / peach dabs: behind ivory / white / gold things (minaret, finial)
 *   palette   override colours: {ground, ground2, dab, dab2, accent, warm, warm2, glow, primer} (#RRGGBB)
 *             — e.g. dusk or pre-dawn skies keep the recipe and change only the paint
 *             (dab = the cobalt prints, dab2 = their lighter, powdery rim tone)
 *   clouds    [{x, y, w, h, seed}] static clouds baked into the sky (they dab in last); use
 *             makeCloud() sprites instead for clouds that drift
 *   reveal    {steps = 10, order, from, even, ...}; default: a build-up sweeping out from the sun in
 *             stages of equal paint (even: 'area')
 * Returns { w, h, paint (Painted, transparent between dabs), draw(ctx, x, y, {p}) } — draw() puts the
 * wall underneath, so the primer shows between dabs; p >= 1 is a single opaque blit.
 *
 * The look (reference): an airy light-blue field; ISLANDS OF BARE PRIMER that are real gaps in the
 * paint (the blues keep away from them, so cream is always bordered by light blue, never by cobalt);
 * discrete round cobalt prints (~100 px, in loose groups, each with a powdery stippled rim of a
 * lighter blue) sitting on the light blue; a little lavender; a few small cream flecks.
 */
export function makeSky({ w = env.W, h = env.H, seed = 11, sun = null, horizon = null, mood = 0.5, zenith = [h * 0.1, h * 0.36], calm = null, solid = [], palette = {}, clouds = [], reveal = {} } = {}) {
  const C = {
    ground: PAL.lightBlue, ground2: '#97CEE4', dab: PAL.cobalt, dab2: '#6CA6D4', accent: PAL.lavender,
    warm: PAL.peach, warm2: '#F7DDB5', glow: PAL.sunYellow, glow2: '#FBE49A', primer: PAL.primer, ...palette,
  };
  // solid: [[x, y, r], …] discs where the sky stays BLUE: no island of primer, no warm sun / horizon dabs
  // (behind an ivory minaret, a gold finial)
  const keep = solid.length ? (x, y) => {
    let m = 1;
    for (const [sx, sy, sr = 160] of solid) m = Math.min(m, smoothstep(sr * 0.7, sr, Math.hypot(x - sx, y - sy)));
    return m;
  } : () => 1;
  const warm = sun ? (x, y) => 1 - smoothstep(sun.r * 0.45, sun.r * 1.35, Math.hypot(x - sun.x, y - sun.y)) : () => 0;
  const cool = (x, y) => 1 - warm(x, y) * keep(x, y);
  const high = (x, y) => lerp(1, 0.12, smoothstep(zenith[0], zenith[1], y)); // cobalt gathers toward the zenith
  const low = horizon === null ? () => 0 : (x, y) => smoothstep(horizon - h * 0.22, horizon, y);
  const quiet = calm ? (y) => 1 - (calm.amount ?? 1) * smoothstep(calm.y0 - 70, calm.y0 - 10, y) * smoothstep(calm.y1 + 70, calm.y1 + 10, y) : () => 1;
  const A = seed * 31 + 5, B = seed * 31 + 9, Cs = seed * 31 + 13;
  const k = lerp(0.45, 1.0, mood);
  // islands of bare primer: REAL gaps. Every blue layer is multiplied by (1 - gap) sampled a little
  // around the dab (so a print keeps its distance and only its stippled rim reaches the island);
  // the cobalt keeps twice the distance: cream is always bordered by light blue.
  const gapP = patchFn({ scale: 190, amount: 0.8, sharp: 0.6, seed: Cs });
  const gapAt = (x, y) => gapP(x, y) * (1 - 0.3 * high(x, y)) * keep(x, y);
  const near = (r) => (x, y) => Math.max(gapAt(x, y), gapAt(x - r, y), gapAt(x + r, y), gapAt(x, y - r), gapAt(x, y + r));
  const g1 = near(28), g2 = near(68);
  const open1 = (x, y) => 1 - g1(x, y), open2 = (x, y) => 1 - g2(x, y);
  const cobalt = (x, y) => cool(x, y) ** 2 * high(x, y) * open2(x, y) * quiet(y);
  const layers = [
    { color: C.ground, coverage: 0.95, size: 150, tint: 0.03, pores: 0.15, poreScale: 0.6, maskFn: (x, y) => (1 - 0.8 * warm(x, y) * keep(x, y)) * open1(x, y) },
    { color: C.ground2, coverage: 0.46, size: 124, tint: 0.025, stamps: 'open', pores: 0.15, poreScale: 0.6, maskFn: (x, y) => cool(x, y) * open1(x, y), patch: { scale: 250, amount: 0.5, seed: B } },
    // discrete cobalt prints: a jittered grid whose cells are a little wider than a dab, of which the
    // patch map fills about two in three (groups in the middle of a patch, lone prints at its fringe);
    // each print gets a powdery stippled rim of the lighter tone (dab2) underneath and of itself on top
    { color: C.dab2, coverage: 0.22 * k, size: 110, stamps: 'speck', maskFn: (x, y) => cobalt(x, y) * (1 - 0.7 * low(x, y)), patch: { scale: 420, amount: 0.36, sharp: 0.3, seed: A } },
    { color: C.dab2, coverage: clamp(0.5 * k), size: 112, sizeJitter: 0.18, tint: 0.035, stamps: 'open', even: true, pores: 0.15, poreScale: 0.6, maskFn: (x, y) => 0.45 * cobalt(x, y) * (1 - 0.7 * low(x, y)), patch: { scale: 420, amount: 0.42, sharp: 0.3, seed: A } },
    { color: C.dab, coverage: clamp(0.76 * k), size: 100, sizeJitter: 0.2, tint: 0.045, stamps: 'body', even: true, pores: 0.15, poreScale: 0.6, maskFn: (x, y) => 0.95 * cobalt(x, y) * (1 - 0.7 * low(x, y)), patch: { scale: 420, amount: 0.36, sharp: 0.3, seed: A } },
    { color: C.dab, coverage: 0.16 * k, size: 100, stamps: 'speck', maskFn: (x, y) => cobalt(x, y) * (1 - 0.7 * low(x, y)), patch: { scale: 420, amount: 0.4, sharp: 0.3, seed: A } },
        // lavender: a few powdery dabs, mostly up where the cobalt is
    { color: C.accent, coverage: clamp(0.3 * k), size: 112, stamps: 'airy', pores: 0, maskFn: (x, y) => cool(x, y) * (0.2 + 0.8 * high(x, y)) * open2(x, y) * quiet(y), patch: { scale: 300, amount: 0.78, sharp: 0.5, seed: B + 3 } },
    { color: C.accent, coverage: 0.1 * k, size: 100, stamps: 'speck', maskFn: (x, y) => cool(x, y) * (0.2 + 0.8 * high(x, y)) * open2(x, y) * quiet(y), patch: { scale: 300, amount: 0.7, sharp: 0.4, seed: B + 3 } },
    // a few small flecks of primer, gathered in a few places on the light blue
    { color: C.primer, coverage: 0.09, size: 70, stamps: 'soft', tint: 0.01, pores: 0, patch: { scale: 230, amount: 0.74, sharp: 0.4, seed: Cs + 4 } },
  ];
  if (calm) {
    // the calm band: one more pass of the light ground tone, so the field there is light blue + cream only
    layers.splice(2, 0, { color: C.ground2, coverage: 0.8, size: 130, tint: 0.025, pores: 0.15, poreScale: 0.6, maskFn: (x, y) => (1 - quiet(y)) * cool(x, y) * open1(x, y) });
  }
  if (sun) {
    const d = (x, y) => Math.hypot(x - sun.x, y - sun.y) / sun.r;
    layers.push(
      // chunky opaque dabs of peach (outside) and yellow (inside) with blue holes between them
      { color: C.warm, coverage: 0.5, size: 140, stamps: 'body', pores: 0.3, maskFn: (x, y) => smoothstep(1.7, 1.0, d(x, y)) * smoothstep(0.3, 0.7, d(x, y)) * keep(x, y), patch: { scale: 260, amount: 0.55, seed: A + 2 } },
      { color: C.glow, coverage: 0.56, size: 130, stamps: 'body', pores: 0.3, maskFn: (x, y) => smoothstep(1.0, 0.4, d(x, y)) * keep(x, y), patch: { scale: 260, amount: 0.5, seed: B + 5 } },
    );
  }
  if (horizon !== null) {
    layers.push(
      { color: C.warm, coverage: 0.42, size: 130, stamps: 'body', pores: 0.3, maskFn: (x, y) => low(x, y) * keep(x, y), patch: { scale: 280, amount: 0.5, seed: A + 7 } },
      { color: C.warm2, coverage: 0.3, size: 110, stamps: 'open', pores: 0.3, maskFn: (x, y) => low(x, y) * keep(x, y), patch: { scale: 220, amount: 0.55, seed: B + 7 } },
    );
  }
  const rv = { steps: 10, order: 'radial', from: sun ? [sun.x, sun.y] : [w * 0.5, h * 0.3], jitter: 0.35, even: 'area', ...reveal };
  let dabs = scatterDabs(layers, { w, h, seed, reveal: rv });
  clouds.forEach((c, i) => {
    const cl = clusterDabs(cloudSpec({ seed: seed * 13 + i, ...c }));
    const moved = cl.dabs.map((d) => ({ ...d, x: d.x - cl.ax + c.x, y: d.y - cl.ay + c.y }));
    moved.meta = cl.dabs.meta;
    dabs = joinDabs(dabs, moved, { at: 0.86 });
  });
  const paint = new Painted({ w, h, dabs, steps: rv.steps, mode: rv.mode ?? 'build', reveal: rv, seed });
  const wall = makeWall({ w, h, seed: seed + 100 });
  const flat = surface(w, h);
  blit(flat.ctx, wall);
  blit(flat.ctx, paint.final);
  return {
    w, h, paint, wall,
    draw(ctx, x = 0, y = 0, { p = 1 } = {}) {
      if (p >= 1) { paint.at(1); blit(ctx, flat, x, y); return; } // at(1): lets the reveal scratch be released
      blit(ctx, wall, x, y);
      paint.draw(ctx, x, y, { p });
    },
  };
}
