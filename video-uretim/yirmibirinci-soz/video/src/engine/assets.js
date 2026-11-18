// assets.js — reusable painted assets of the S-050 world, built only from engine primitives.
// Light comes from the upper right. Every factory is seeded and returns Painted sprites (or small
// objects around them) with `.draw(ctx, x, y, opts)`; opts.p is the dab-in progress where relevant.
//
//   makeSun      disc + two-layer breathing halo         makeFlower   white 5-petal, pink centre
//   makeMosque   green ribbed dome, drum, base, minaret  makeBud      small pink bud
//   makeFoliage  soft layered ground mass (or hill)      makeLeaf     stencil leaf
//   (clouds live in backdrop.js: makeCloud)              makePlant    stem + leaves (+ head), sways

import { PAL, tone } from './surface.js';
import { makeRng, seedOf, noise1 } from './rng.js';
import { clamp, lerp, smoothstep, TAU, spring } from './ease.js';
import { makeCluster } from './sponge.js';
import { shape, bakeStencil, bakeSprite, group } from './stencil.js';
import { breathe, makeGlow } from './fx.js';
import { dabP } from './motion.js';

/** Pseudo-sphere lighting 0..1 (1 = facing the upper-right light) over an ellipse (cx, cy, rx, ry). */
export function sphereLight(cx, cy, rx, ry) {
  const lx = 0.56, ly = -0.6, lz = 0.57;
  return (x, y) => {
    const nx = (x - cx) / rx, ny = (y - cy) / ry;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    return clamp(0.5 + 0.5 * (nx * lx + ny * ly + nz * lz));
  };
}

// ------------------------------------------------------------------ sun

/**
 * Sun: stencil disc (orange, lighter dabs, pale highlight upper right) + sponge halo.
 * draw(ctx, x, y, {t, p, haloP, pop, glow}): t drives the breathing; p / haloP = dab-in progress;
 * pop = scale multiplier (use a spring for the entrance); glow = halo opacity multiplier.
 */
export function makeSun({ r = 90, seed = 1, reveal = {} } = {}) {
  const L = sphereLight(0, 0, r, r);
  // three flat tones with crisp stippled boundaries (orange -> yellow on the lit side -> a pale
  // highlight cloud upper right); never a soft radial gradient
  const hot = (x, y) => smoothstep(r * 0.5, r * 0.4, Math.hypot(x - r * 0.18, y + r * 0.2));
  const disc = bakeStencil({
    shape: shape.ellipse(0, 0, r), base: '#EDA42C', seed: seedOf('sun', seed), anchor: [0, 0],
    layers: [
      { color: '#E3951F', coverage: 0.3, size: r * 0.7, pores: 0.3, patch: { scale: r * 1.2, amount: 0.5 } },
      { color: '#F5C54A', coverage: 0.85, size: r * 0.7, pores: 0.3, maskFn: (x, y) => smoothstep(0.6, 0.68, L(x, y)) },
      { color: '#FBE698', coverage: 0.92, size: r * 0.5, stamps: 'body', opacity: 1, pores: 0.3, maskFn: hot },
      { color: '#FFF6CF', coverage: 0.6, size: r * 0.36, stamps: 'speck', opacity: 1, maskFn: (x, y) => hot(x, y) ** 2 },
    ],
    bleed: { color: PAL.gold }, reveal: { steps: 4, ...reveal },
  });
  // halo: chunky OPAQUE dabs of yellow (inner) and yellow / peach (outer) with sky showing in the
  // holes between them — never a haze
  const inner = makeGlow({ r: r * 2.5, color: PAL.sunYellow, core: '#FBE8A6', density: 0.8, falloff: 0.75, seed: seedOf('halo', seed) });
  const outer = makeCluster({
    points: [{ x: 0, y: 0, r: r * 3.7 }], seed: seedOf('halo2', seed), edgeSoftness: 0.5, anchor: [0, 0],
    layers: [
      { color: PAL.peach, coverage: 0.32, size: r * 1.6, band: [0, 0.6], stamps: 'body', opacity: [0.92, 1], pores: 0.3, patch: { scale: r * 2.4, amount: 0.55 } },
      { color: PAL.sunYellow, coverage: 0.28, size: r * 1.6, band: [0.1, 0.75], stamps: 'body', opacity: [0.92, 1], pores: 0.3, patch: { scale: r * 2, amount: 0.5 } },
    ],
    reveal: { steps: 5, order: 'radial', from: [0, 0] },
  });
  return {
    r, disc, inner, outer,
    draw(ctx, x, y, { t = 0, p = 1, haloP = p, pop = 1, glow = 1 } = {}) {
      if (glow > 0) {
        // opaque paint: the halo breathes by SCALE only (alpha stays 1, no veils)
        outer.draw(ctx, x, y, { p: haloP, scale: pop * breathe(t, 7.3, 0.03, 0.4), alpha: glow });
        inner.draw(ctx, x, y, { p: haloP, scale: pop * breathe(t, 4.6, 0.04), alpha: glow });
      }
      disc.draw(ctx, x, y, { p, scale: pop });
    },
  };
}

// ------------------------------------------------------------------ mosque

function crescent(cx, cy, R) {
  const a0 = (-52 * Math.PI) / 180, a1 = (232 * Math.PI) / 180; // horn tips on the outer circle
  const tip = [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R];
  const icy = cy - R * 0.46, ir = Math.hypot(tip[0] - cx, tip[1] - icy);
  const b0 = Math.atan2(tip[1] - icy, tip[0] - cx), b1 = Math.PI - b0;
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const a = lerp(a0, a1, i / 24);
    pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
  }
  for (let i = 0; i <= 24; i++) {
    const b = lerp(b1, b0, i / 24);
    pts.push([cx + Math.cos(b) * ir, icy + Math.sin(b) * ir]);
  }
  return shape.polygon(pts);
}

/** Gold finial: stacked balls on a spike with a crescent; base centre at (0,0), grows upward. */
function makeFinial(S, seed) {
  const parts = [
    shape.ellipse(0, -3 * S, 21 * S, 7 * S), shape.ellipse(0, -19 * S, 11.5 * S, 11 * S),
    shape.ellipse(0, -38 * S, 7.5 * S, 7.5 * S), shape.ellipse(0, -52 * S, 4.6 * S, 4.6 * S),
    shape.polygon([[-2.4 * S, -52 * S], [2.4 * S, -52 * S], [1 * S, -72 * S], [-1 * S, -72 * S]]),
    crescent(0, -80 * S, 9.5 * S),
  ];
  return bakeStencil({
    shape: shape.union(...parts), base: PAL.gold, seed, anchor: [0, 0], pad: 4,
    layers: [
      { color: PAL.ochre, coverage: 0.3, size: 24 * S },
      { color: '#F7CE62', coverage: 0.5, size: 20 * S, maskFn: (x) => smoothstep(-6 * S, 6 * S, x) },
    ],
    bleed: false, reveal: { steps: 3, order: 'sweep' },
  });
}

/**
 * The green-domed mosque of the reference. Origin = bottom centre of the base; everything grows
 * upward (negative y). scale 1.4 gives a ~760 px wide, ~1000 px tall building.
 * Returns { parts: {base, drum, dome, minaret, domeFinial, minaretFinial} (Painted),
 *           anchors: {domeTop, minaretTop, door, domeCentre} (local [x, y]), width, height,
 *           draw(ctx, x, y, {p, alpha}) } — p reveals base -> drum -> dome -> minaret -> finials.
 */
export function makeMosque({ scale: S = 1.4, seed = 1, reveal = {} } = {}) {
  const sd = (k) => seedOf('mosque', k, seed);
  const rv = (o) => ({ steps: 5, ...o, ...reveal });
  const ivory = '#EFE7D8', dc = 6 * S; // dc: x of the dome / drum axis
  const brick = '#A9604C';             // dusty brick of the ornament prints
  const arches = (ctx, xs, bottom, w, h, color, point = 0.4) => {
    ctx.fillStyle = color;
    for (const x of xs) ctx.fill(shape.arch(x, bottom, w, h, point).path);
  };

  // --- base building (ivory stone, mauve sponge shadow under the cornice, maroon windows)
  const base = bakeStencil({
    shape: shape.union(shape.rect(-270 * S, -104 * S, 540 * S, 104 * S), shape.rect(-277 * S, -113 * S, 554 * S, 13 * S)),
    base: ivory, seed: sd(1), anchor: [0, 0],
    layers: [
      { color: '#FAF5EA', coverage: 0.5, size: 90 * S, tint: 0.015, pores: 0.3, patch: { scale: 150 * S, amount: 0.45 } },
      // sponge shadow: pale taupe patches (heavier on the left, away from the light) with a darker heart
      { color: '#DFCEBF', coverage: 0.6, size: 66 * S, tint: 0.02, stamps: 'open', pores: 0.3, maskFn: (x) => lerp(1, 0.3, smoothstep(-200 * S, 160 * S, x)), patch: { scale: 150 * S, amount: 0.56, sharp: 0.4, seed: 5 } },
      { color: '#CDB8AE', coverage: 0.36, size: 44 * S, tint: 0.025, stamps: 'open', pores: 0.3, maskFn: (x) => lerp(1, 0.2, smoothstep(-220 * S, 120 * S, x)), patch: { scale: 150 * S, amount: 0.68, sharp: 0.4, seed: 5 } },
      // a row of discrete mauve dabs under the cornice
      { color: '#B8A09E', coverage: 0.7, size: 27 * S, sizeJitter: 0.2, tint: 0.03, stamps: 'body', even: true, pores: 0.3, maskFn: (x, y) => smoothstep(-101 * S, -97 * S, y) * smoothstep(-80 * S, -86 * S, y), patch: { scale: 60 * S, amount: 0.3, sharp: 0.5 } },
      { color: PAL.primer, coverage: 0.12, size: 50 * S, stamps: 'soft' },
    ],
    details: (ctx) => arches(ctx, [-128 * S, 4 * S, 134 * S], -24 * S, 27 * S, 54 * S, PAL.maroon),
    bleed: { color: PAL.mauve, amount: 0.7 }, reveal: rv({ order: 'sweep', angle: 0 }),
  });

  // --- drum: two deep, cool green tiers; a lighter sponge band under each cornice, lights only on
  //     the lit (right) third; dark arched openings
  const xsUp = Array.from({ length: 14 }, (_, i) => dc + (i - 6.5) * 27.6 * S);
  const xsLo = Array.from({ length: 12 }, (_, i) => dc + (i - 5.5) * 36 * S);
  const litX = (x) => smoothstep(dc + 40 * S, dc + 190 * S, x);
  const drum = bakeStencil({
    shape: shape.union(shape.rect(dc - 226 * S, -192 * S, 452 * S, 88 * S), shape.rect(dc - 205 * S, -248 * S, 410 * S, 58 * S)),
    base: '#174A33', seed: sd(2), anchor: [0, 0],
    layers: [
      // three tones: dark base, mid green in patches, light green only on the lit (right) third
      { color: '#0F3A28', coverage: 0.3, size: 60 * S, pores: 0.3, patch: { scale: 120 * S, amount: 0.5 } },
      { color: '#2B7045', coverage: 0.66, size: 56 * S, pores: 0.3, maskFn: (x) => 0.55 + 0.45 * litX(x), patch: { scale: 130 * S, amount: 0.44, sharp: 0.4 } },
      { color: '#4F9A4A', coverage: 0.8, size: 50 * S, pores: 0.3, maskFn: (x) => smoothstep(dc + 96 * S, dc + 150 * S, x), patch: { scale: 110 * S, amount: 0.36, sharp: 0.4 } },
      // a lighter sponge band just under each cornice (discrete yellow-green prints)
      { color: '#7DB750', coverage: 0.66, size: 19 * S, sizeJitter: 0.2, stamps: 'body', even: true, pores: 0.3, maskFn: (x, y) => Math.max(smoothstep(-238 * S, -243 * S, y), smoothstep(-182 * S, -187 * S, y) * smoothstep(-193 * S, -190 * S, y)), patch: { scale: 70 * S, amount: 0.3, sharp: 0.5 } },
      { color: '#9CCB58', coverage: 0.5, size: 36 * S, stamps: 'open', pores: 0.3, maskFn: (x) => smoothstep(dc + 130 * S, dc + 200 * S, x), patch: { scale: 90 * S, amount: 0.6 } },
      { color: PAL.primer, coverage: 0.2, size: 30 * S, stamps: 'soft', patch: { scale: 80 * S, amount: 0.74, sharp: 0.4 } },
    ],
    details: (ctx) => {
      arches(ctx, xsUp, -200 * S, 9.5 * S, 27 * S, '#06180F', 0.3);
      arches(ctx, xsLo, -116 * S, 15 * S, 47 * S, '#06180F', 0.3);
    },
    bleed: { color: PAL.deepGreen, amount: 0.8 }, reveal: rv({ order: 'sweep', angle: 0 }),
  });

  // --- dome: THREE bold tones (dark base -> mid -> light) with tight, stippled boundaries and a pale
  //     core where the light hits (upper right); ribs printed through narrow slits: uneven
  //     thickness, a little wobbly, tapering to the apex, skipping here and there
  const dw = 398 * S, dh = 258 * S, dy = -247 * S;
  const domeShape = shape.dome(dc, dy, dw, dh);
  const prof = domeShape.profile;
  const ribRng = makeRng(sd(31));
  const ribW = Math.max(2, 2.15 * S);
  const ribs = [];
  for (let k = -6; k <= 6; k++) {                                          // 13 ribs: the apex stays open
    const u = Math.sin((k / 7) * (Math.PI / 2) * 0.93);
    const ph = ribRng.next() * TAU;
    const pts = prof.slice(0, -2).filter((_, i) => i % 3 === 0).map(([hw, hh], i, all) => {
      const v = i / (all.length - 1);                                   // the stencil slit bows a little
      return [dc + u * hw + Math.sin(v * Math.PI) * S * (1.3 * Math.sin(v * 4.2 + ph) + ribRng.sym(0.45)), dy - hh - (i ? 0 : 2 * S)];
    });
    const wide = ribW * (0.62 + 0.38 * Math.cos((k / 7) * (Math.PI / 2))) * ribRng.range(0.7, 1.4);
    ribs.push(shape.ribbon(pts, [wide * 1.1, wide * 0.2]));
  }
  const DL = sphereLight(dc + dw * 0.05, dy - dh * 0.44, dw * 0.52, dh * 0.62);
  const lit = (a, b) => (x, y) => smoothstep(a, b, DL(x, y));
  const dome = bakeStencil({
    shape: domeShape, base: '#174A33', seed: sd(3), anchor: [0, 0],
    layers: [
      { color: '#103B29', coverage: 0.32, size: 66 * S, pores: 0.3, patch: { scale: 150 * S, amount: 0.5 } },
      { color: '#27693F', coverage: 0.55, size: 64 * S, pores: 0.3, maskFn: lit(0.26, 0.5), patch: { scale: 140 * S, amount: 0.4 } },
      { color: '#439747', coverage: 0.9, size: 62 * S, pores: 0.3, poreScale: 0.7, maskFn: lit(0.555, 0.615) },
      { color: '#92C456', coverage: 0.9, size: 70 * S, pores: 0.3, poreScale: 0.6, maskFn: lit(0.735, 0.79) },
      { color: '#C6DF80', coverage: 0.8, size: 58 * S, stamps: 'body', pores: 0.3, poreScale: 0.7, maskFn: lit(0.885, 0.93) },
      // sprays of fine stipple carry each tone a little past its frontier (powdery boundaries)
      { color: '#439747', coverage: 0.14, size: 60 * S, stamps: 'speck', opacity: 1, maskFn: (x, y) => lit(0.46, 0.54)(x, y) * lit(0.64, 0.56)(x, y) },
      { color: '#92C456', coverage: 0.14, size: 60 * S, stamps: 'speck', opacity: 1, maskFn: (x, y) => lit(0.64, 0.72)(x, y) * lit(0.82, 0.74)(x, y) },
      { color: '#174A33', coverage: 0.07, size: 56 * S, stamps: 'speck', opacity: 1, maskFn: (x, y) => lit(0.52, 0.58)(x, y) * lit(0.8, 0.7)(x, y) },
      // a few dark prints straying over the mid tone, cream primer peeking through the dark side
      { color: PAL.darkGreen, coverage: 0.1, size: 34 * S, stamps: 'open', pores: 0, maskFn: (x, y) => lit(0.53, 0.6)(x, y) * lit(0.75, 0.67)(x, y) },
      { color: PAL.primer, coverage: 0.3, size: 30 * S, stamps: 'soft', maskFn: lit(0.56, 0.24), patch: { scale: 70 * S, amount: 0.66, sharp: 0.4 } },
    ],
    slits: { shape: shape.union(...ribs), width: ribW, color: '#0B2F1F', opacity: 0.86 },
    bleed: { color: PAL.deepGreen, amount: 0.8 }, reveal: rv({ steps: 6, order: 'sweep', angle: -Math.PI / 2 }),
  });

  // --- minaret: ivory shaft, two balconies on brick corbels, zigzag band, pointed cap
  const mx = -252 * S;
  const R = (hw, y0, y1) => shape.rect(mx - hw * S, y0 * S, 2 * hw * S, (y1 - y0) * S);
  const corbel = (hwTop, hwBot, y0, y1) => shape.polygon([[mx - hwTop * S, y0 * S], [mx + hwTop * S, y0 * S], [mx + hwBot * S, y1 * S], [mx - hwBot * S, y1 * S]]);
  const cap = shape.polygon([[mx - 25 * S, -596 * S], [mx - 21 * S, -618 * S], [mx - 9 * S, -645 * S], [mx, -656 * S], [mx + 9 * S, -645 * S], [mx + 21 * S, -618 * S], [mx + 25 * S, -596 * S]]);
  const corbels = [corbel(52, 31, -322, -296), corbel(44, 27, -502, -480)];
  const minaret = bakeStencil({
    shape: shape.union(R(31, -300, 0), R(27, -482, -300), R(23, -598, -482), R(52, -362, -322), R(44, -534, -502), ...corbels, cap),
    base: ivory, seed: sd(4), anchor: [0, 0],
    layers: [
      { color: '#FAF5EA', coverage: 0.5, size: 60 * S, tint: 0.015, pores: 0.3, maskFn: (x) => smoothstep(mx - 10 * S, mx + 20 * S, x) },
      // sponge shadow down the left side: pale taupe with a few darker mauve prints
      { color: '#DFCEBF', coverage: 0.6, size: 46 * S, tint: 0.02, stamps: 'open', pores: 0.3, maskFn: (x) => lerp(1, 0.3, smoothstep(mx - 20 * S, mx + 14 * S, x)), patch: { scale: 80 * S, amount: 0.5, seed: 6 } },
      { color: '#C9B2AA', coverage: 0.42, size: 34 * S, tint: 0.025, stamps: 'open', pores: 0.3, maskFn: (x) => lerp(1, 0.15, smoothstep(mx - 22 * S, mx + 8 * S, x)), patch: { scale: 80 * S, amount: 0.62, seed: 6 } },
      { color: PAL.primer, coverage: 0.1, size: 40 * S, stamps: 'soft' },
    ],
    details: [
      { // brick ornaments: broken, stippled prints with the stone showing through
        print: 'print',
        draw: (ctx) => {
          ctx.fillStyle = brick;
          for (const c of corbels) ctx.fill(c.path);
          ctx.fillRect(mx - 25 * S, -606 * S, 50 * S, 10 * S);
          for (const [hw, y, n] of [[52, -352, 7], [44, -526, 6]]) {
            for (let i = 0; i < n; i++) ctx.fillRect(mx + lerp(-hw + 9, hw - 14, i / (n - 1)) * S, y * S, 5 * S, 15 * S);
          }
          ctx.strokeStyle = brick;
          ctx.lineWidth = 4.6 * S;
          ctx.lineJoin = 'miter';
          for (const y of [-272, -250, -228]) {
            ctx.beginPath();
            for (let i = 0; i <= 8; i++) {
              const px = mx + lerp(-27, 27, i / 8) * S, py = (y + (i % 2 ? -9 : 9)) * S;
              if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
            }
            ctx.stroke();
          }
        },
      },
      (ctx) => { // window openings stay nearly solid
        arches(ctx, [mx], -545 * S, 15 * S, 33 * S, PAL.maroon);
        arches(ctx, [mx], -404 * S, 18 * S, 40 * S, PAL.maroon);
        arches(ctx, [mx], -150 * S, 20 * S, 46 * S, PAL.maroon);
      },
    ],
    bleed: { color: PAL.mauve, amount: 0.7 }, reveal: rv({ steps: 6, order: 'sweep', angle: -Math.PI / 2 }),
  });

  const domeFinial = makeFinial(S * 1.0, sd(5));
  const minaretFinial = makeFinial(S * 0.74, sd(6));
  const anchors = {
    domeTop: [dc, dy - dh], domeCentre: [dc, dy - dh * 0.45], minaretTop: [mx, -656 * S], door: [4 * S, -24 * S],
  };
  const fin = [anchors.domeTop[0], anchors.domeTop[1] + 4 * S];
  const g = group([
    { node: base, from: 0, to: 0.45 },
    { node: drum, from: 0.2, to: 0.6 },
    { node: dome, from: 0.4, to: 0.9 },
    { node: domeFinial, x: fin[0], y: fin[1], from: 0.85, to: 1 },
    { node: minaret, from: 0.1, to: 0.8 },
    { node: minaretFinial, x: mx, y: -652 * S, from: 0.85, to: 1 },
  ]);
  // timed dab-in: [part, delay (s), dx, dy] in draw order; every part advances one stage on twos
  const sched = [[base, 0, 0, 0], [drum, 0.133, 0, 0], [dome, 0.267, 0, 0], [domeFinial, 0.667, fin[0], fin[1]], [minaret, 0.067, 0, 0], [minaretFinial, 0.6, mx, -652 * S]];
  return {
    parts: { base, drum, dome, minaret, domeFinial, minaretFinial }, anchors,
    width: 554 * S, height: 740 * S, buildTime: 0.9,
    /**
     * draw(ctx, x, y, {p}) reveals base -> drum -> dome -> minaret -> finials over p = 0..1;
     * draw(ctx, x, y, {t, t0}) dabs the parts in on twos from time t0 (takes `buildTime` seconds).
     */
    draw(ctx, x, y, o = {}) {
      if (o.t === undefined) { g.draw(ctx, x, y, o); return; }
      for (const [node, delay, dx, dy] of sched) {
        const p = dabP(o.t, (o.t0 ?? 0) + delay, { steps: node.steps });
        if (p > 0) node.draw(ctx, x + dx, y + dy, { alpha: o.alpha ?? 1, p });
      }
    },
  };
}

// ------------------------------------------------------------------ flowers & plants

/**
 * White five-petal flower (anchor = centre): distinct, slightly irregular petals; cream-speckled
 * white, a small dabbed pink centre, yellow core. The shade is a patchy, DABBED lavender blush on the
 * petals away from the light (lower left) plus one thin, broken print inside that stencil edge —
 * never a continuous band (that reads as a digital bevel).
 * popScale(tau) gives the entrance scale for a time since "bloom".
 */
export function makeFlower({ r = 60, seed = 1, petals = 5 } = {}) {
  const rng = makeRng(seedOf('flower', seed));
  const rad = (x, y) => Math.hypot(x, y) / r;
  const cx = rng.sym(r * 0.05), cy = rng.sym(r * 0.05);
  const core = (x, y) => Math.hypot(x - cx, y - cy) / r;
  // the pink reaches a little further along the petals than between them
  const sph = rng.next() * TAU;
  const star = (x, y) => 1 - 0.09 * Math.cos(petals * Math.atan2(y - cy, x - cx) + sph);
  return bakeStencil({
    shape: shape.flower(0, 0, r, petals, { notch: 0.5, rot: rng.next() * TAU, wobble: 0.16, petalJitter: 0.16, seed }),
    base: PAL.white, seed: seedOf('flowertex', seed), anchor: [0, 0],
    layers: [
      // (big flowers keep their white cleaner: they sit among the cream flecks of a meadow)
      { color: '#EFE6D3', coverage: r >= 70 ? 0.28 : 0.4, size: r * 0.34, stamps: 'open', pores: 0.3 },
      { color: '#FFFFFF', coverage: 0.5, size: r * 0.55, tints: 1, pores: 0, maskFn: (x, y) => smoothstep(0.2, 0.6, rad(x, y)) },
      // lavender blush: powdery dabs gathered on the shaded petals only
      { color: '#CFC6E6', coverage: 0.42, size: r * 0.3, stamps: 'soft', maskFn: (x, y) => smoothstep(0.2, 0.65, (-0.62 * x + 0.78 * y) / r), patch: { scale: r * 0.9, amount: 0.4, sharp: 0.3 } },
      { color: '#B9AEDD', coverage: 0.16, size: r * 0.24, stamps: 'speck', maskFn: (x, y) => smoothstep(0.4, 0.8, (-0.62 * x + 0.78 * y) / r) },
      // crisp stippled pink centre (flat tone, broken edge) with a deeper heart and a gold core
      { color: PAL.pink, coverage: 0.94, size: r * 0.34, stamps: 'body', opacity: 1, pores: 0.3, maskFn: (x, y) => smoothstep(0.33, 0.25, core(x, y) * star(x, y)) },
      { color: PAL.pink, coverage: 0.5, size: r * 0.2, stamps: 'speck', opacity: 1, maskFn: (x, y) => smoothstep(0.5, 0.3, core(x, y) * star(x, y)) },
      { color: '#E487AB', coverage: 0.7, size: r * 0.22, stamps: 'body', opacity: 1, pores: 0.3, maskFn: (x, y) => smoothstep(0.2, 0.14, core(x, y)) },
      { color: PAL.gold, coverage: 0.96, size: r * 0.2, pores: 0, opacity: 1, maskFn: (x, y) => smoothstep(0.11, 0.07, core(x, y)), stamps: 'dense' },
      { color: '#F7CE62', coverage: 0.5, size: r * 0.12, opacity: 1, maskFn: (x, y) => smoothstep(0.08, 0.04, core(x, y)), stamps: 'speck' },
    ],
    // one thin print just inside the lower-left edge; the lacy tile makes it break and skip
    edge: { color: PAL.lavender, width: Math.max(3, r * 0.07), opacity: 0.5, dir: [-0.62, 0.78], tile: r < 40 ? 'fine' : 'pore' },
    bleed: false, reveal: { steps: 4, order: 'radial', from: [0, 0] },
  });
}

/**
 * Entrance scale for flowers / buds / leaves: 0 before tau = 0, a small overshoot (~9 %), settles
 * on 1 in about 0.45 s without a visible undershoot. Vary `freq` ±10 % per item for life.
 */
export const popScale = (tau, { freq = 3, damping = 0.6 } = {}) => (tau <= 0 ? 0 : spring(tau, { freq, damping }));

/** Small twist that decays smoothly after a pop (add to the rotation): popTwist(tau) -> rad. */
export const popTwist = (tau, amount = 0.5) => (tau <= 0 ? amount : amount * Math.exp(-tau * 12));

/** Small pink bud (anchor = base of the bud, it points up). */
export function makeBud({ r = 16, seed = 1 } = {}) {
  return bakeStencil({
    shape: shape.smooth([[0, 0], [-r * 0.78, -r * 0.9], [-r * 0.3, -r * 1.9], [0, -r * 2.3], [r * 0.3, -r * 1.9], [r * 0.78, -r * 0.9]], 0.6),
    base: PAL.pink, seed: seedOf('bud', seed), anchor: [0, 0], pad: 4,
    layers: [
      { color: '#E07FA6', coverage: 0.5, size: r * 1.2, pores: 0.3 },
      { color: '#F7C9D8', coverage: 0.5, size: r, stamps: 'open', pores: 0.3, maskFn: (x) => smoothstep(-r * 0.2, r * 0.5, x) },
    ],
    bleed: false, reveal: { steps: 3 },
  });
}

/**
 * Stencil leaf (anchor = base, tip along +x): dark blue-green with a fine STIPPLED lighter patch on
 * its lit half (one side of the midrib, per seed — or `lit: 1 | -1` = the +y / -y side), and a thin
 * BROKEN cream sliver on one edge where the stencil sat a little off. `light` = colour of the stipple.
 */
export function makeLeaf({ len = 110, wid = 46, bend = 0, seed = 1, sliver = seed % 3 !== 1, light = '#6FB24A', lit = null } = {}) {
  // the lighter stipple sits on ONE half of the leaf (never a blotch framed by dark: that reads as
  // variegated / watermelon rind), over a stretch of its length that varies per seed
  const lr = makeRng(seedOf('leaflight', seed));
  const side = lit ?? (lr.chance(0.5) ? 1 : -1), x0 = lr.range(0.1, 0.3), x1 = lr.range(0.72, 0.95);
  const mid = (x, y) => smoothstep(wid * 0.05, -wid * 0.3, (y - bend * 0.7) * -side) * smoothstep(x0, x0 + 0.2, x / len) * smoothstep(x1, x1 - 0.3, x / len);
  return bakeStencil({
    shape: shape.leaf(len, wid, bend), base: '#1C5339', seed: seedOf('leaf', seed), anchor: [0, 0], pad: 4,
    layers: [
      { color: '#23603F', coverage: 0.5, size: wid * 0.9, pores: 0.3 },
      { color: '#123F2B', coverage: 0.25, size: wid * 0.6, stamps: 'open', pores: 0.3 },
      // powdery mid green on the lit half, then a fine spray of the light tone inside it
      { color: '#3F8A45', coverage: 0.62, size: wid * 0.46, stamps: 'soft', maskFn: mid },
      { color: light, coverage: 0.34, size: wid * 0.4, stamps: 'airy', opacity: 1, pores: 0, maskFn: (x, y) => smoothstep(0.45, 0.85, mid(x, y)) },
      { color: light, coverage: 0.4, size: wid * 0.5, stamps: 'speck', opacity: 1, maskFn: (x, y) => smoothstep(0.3, 0.8, mid(x, y)) },
    ],
    edge: sliver ? { color: PAL.primer, width: Math.max(1.8, wid * 0.055), opacity: 0.6, dir: [0.25, -0.97], tile: 'fine' } : null,
    bleed: false, reveal: { steps: 3, order: 'sweep', angle: 0 },
  });
}

/**
 * Tall plant: a curved stem with alternating leaves, baked as ONE sprite that grows bottom-up when
 * revealed, plus an optional head (flower / bud Painted) that sways with a little lag. The stem
 * BENDS when it sways: the sprite is drawn as a chain of `segments` (default 3) overlapping slabs,
 * each turning a little more and a little later than the one below (segments: 1 = rigid pivot).
 * Origin = foot of the stem. Returns { sprite, top: [x, y], nodes: [[x, y, side]...], segments,
 *   draw(ctx, x, y, {t, p, sway = 1, head, headScale = 1}) }.
 */
export function makePlant({ height = 460, seed = 1, lean = 0.1, leaves = 7, leafLen = 80, segments = 3 } = {}) {
  const rng = makeRng(seedOf('plant', seed));
  const ph = rng.next() * TAU, ph2 = rng.next() * 50;
  const at = (u) => [lean * height * u + Math.sin(u * Math.PI * 1.15 + ph) * height * 0.035, -height * u];
  const pts = Array.from({ length: 7 }, (_, i) => at(i / 6));
  const stem = bakeStencil({
    shape: shape.ribbon(pts, [7, 3.5]), base: '#2A6A43', seed: seedOf('stem', seed), anchor: [0, 0], pad: 4,
    layers: [
      { color: '#17492E', coverage: 0.4, size: 26, stamps: 'open', pores: 0.3 },
      { color: '#3C8442', coverage: 0.36, size: 22, stamps: 'open', pores: 0.3 },
    ],
    bleed: false,
  });
  const nodes = [];
  const placed = [];
  for (let i = 0; i < leaves; i++) {
    const u = lerp(0.14, 0.9, (i + rng.range(0.1, 0.5)) / leaves), side = i % 2 ? 1 : -1;
    const [x, y] = at(u), [x2, y2] = at(u + 0.02);
    const dir = Math.atan2(y2 - y, x2 - x);
    const len = leafLen * lerp(1.1, 0.7, u) * rng.range(0.85, 1.1);
    placed.push({ leaf: makeLeaf({ len, wid: len * 0.44, bend: side * -len * 0.05, seed: seed * 97 + i }), x, y, rot: dir + side * rng.range(0.75, 1.15) });
    nodes.push([x, y, side]);
  }
  const m = leafLen * 1.3;
  const top = at(1);
  const bx0 = Math.min(0, top[0]) - m, bx1 = Math.max(0, top[0]) + m;
  const sprite = bakeSprite({
    bounds: [bx0, -height - 12, bx1, 8],
    anchor: [0, 0], seed: seedOf('plantmask', seed), steps: 7, dabSize: 90,
    reveal: { order: 'sweep', angle: -Math.PI / 2, jitter: 0.12 },
    draw: (ctx) => {
      for (const l of placed.filter((_, i) => i % 2)) l.leaf.draw(ctx, l.x, l.y, { rot: l.rot });
      stem.draw(ctx, 0, 0);
      for (const l of placed.filter((_, i) => !(i % 2))) l.leaf.draw(ctx, l.x, l.y, { rot: l.rot });
    },
  });
  const swayAt = (t, k) => k * (0.02 * Math.sin(t * 1.25 + ph) + 0.012 * noise1(t * 0.5 + ph2, 5));
  // bending stem: the one baked sprite is drawn as a chain of `segments` slabs; each slab turns a
  // little more about the stem point at its lower edge and a little later than the one below, so
  // the foot stays planted and the tip leads the sway (slabs overlap by 8 px: no gap can open)
  const N = Math.max(1, Math.round(segments));
  const cut = Array.from({ length: N + 1 }, (_, j) => j / N);                 // u of the slab borders
  const wRaw = Array.from({ length: N }, (_, j) => 0.5 + 0.6 * (N > 1 ? j / (N - 1) : 0));
  const tipGain = wRaw.reduce((a, w, j) => a + w * (1 - cut[j]), 0);          // tip travel vs a rigid turn
  const weight = wRaw.map((w) => w / tipGain);
  const LAG = 0.22;                                                             // s of delay per slab
  const chain = (t, sway) => {
    // -> per slab [cos, sin, tx, ty] of its transform (plant-local -> swayed), accumulated bottom-up
    const out = [];
    let c = 1, s = 0, tx = 0, ty = 0;
    for (let j = 0; j < N; j++) {
      const a = swayAt(t - LAG * j, sway) * weight[j];
      const [px, py] = at(cut[j]);
      // M = M * T(p) * R(a) * T(-p)
      const ca = Math.cos(a), sa = Math.sin(a);
      const qx = px - (ca * px - sa * py), qy = py - (sa * px + ca * py);     // translation of R about p
      const nc = c * ca - s * sa, ns = s * ca + c * sa;
      tx += c * qx - s * qy; ty += s * qx + c * qy;
      c = nc; s = ns;
      out.push([c, s, tx, ty]);
    }
    return out;
  };
  return {
    sprite, top, nodes, height, segments: N,
    /** draw(ctx, x, y, {t, p, sway = 1, head, headScale = 1}) */
    draw(ctx, x, y, { t = 0, p = 1, sway = 1, head = null, headScale = 1 } = {}) {
      const ch = chain(t, sway);
      if (N === 1 || sway === 0) sprite.draw(ctx, x, y, { p, rot: Math.atan2(ch[0][1], ch[0][0]) });
      else {
        for (let j = 0; j < N; j++) {
          const [c, s, tx, ty] = ch[j];
          const yLo = -height * cut[j] + (j ? 8 : 12), yHi = j === N - 1 ? -height - 14 : -height * cut[j + 1];
          ctx.save();
          ctx.transform(c, s, -s, c, x + tx, y + ty);
          ctx.beginPath();
          ctx.rect(bx0 - 2, yHi, bx1 - bx0 + 4, yLo - yHi);
          ctx.clip();
          sprite.draw(ctx, 0, 0, { p });
          ctx.restore();
        }
      }
      if (head && headScale > 0) {
        const [c, s, tx, ty] = ch[N - 1];
        const a = Math.atan2(s, c);
        head.draw(ctx, x + tx + top[0] * c - top[1] * s, y + ty + top[0] * s + top[1] * c, { rot: a + swayAt(t - LAG * N, sway) * 2.2, scale: headScale });
      }
    },
  };
}

/**
 * Soft foreground foliage mass (anchor = top-left of its w x h box). The upper edge undulates
 * around y = h * 0.2 (or follows top(x) -> local y: hills, mounds) and dissolves into sponge
 * stipple; the mass is solid below. warm = amount of soft terracotta / ochre / peach along the TOP
 * of the mass (the undertone peeking out where the green thins). calm: {y0, y1, amount = 0.94} keeps
 * a local y range free of light / warm / primer dabs — a calm mid-to-dark field (e.g. behind a gloss;
 * amount 1 = nothing light at all) that still carries dark sponge texture and pores. fade = height
 * (px) of the stippled canopy edge: the mass is solid from topAt(x) + fade downward (default h * 0.14).
 * avoid: [[x, y, r = 140], …] local discs kept free of cream primer gaps (where white flowers sit).
 * Returns { mass (Painted), topAt(x) -> local y of the canopy line, draw(ctx, x, y, {p}) }.
 */
export function makeFoliage({ w = 1200, h = 620, seed = 1, warm = 0.5, top = null, calm = null, fade = h * 0.14, avoid = [], reveal = {} } = {}) {
  const s1 = seedOf('fol', seed);
  const topAt = top ?? ((x) => h * 0.2 + Math.sin(x / (w * 0.21) + seed) * h * 0.035 + noise1(x / 140, s1) * h * 0.06);
  const depth = (x, y) => clamp((y - topAt(x)) / (fade / 0.7));
  const lit = (x, y) => 1 - 0.8 * smoothstep(0, h * 0.9, y - topAt(x));
  // calm: {y0, y1, amount = 0.94} — local y range kept free of light / warm / primer dabs (a calm
  // mid-to-dark field, e.g. behind a gloss)
  const WARM = ['#C98E5E', '#CFAB71', '#DDB58E', '#E6D0AE'];  // brick-ochre … peach (reference foliage dabs)
  const quiet = calm ? (y) => 1 - (calm.amount ?? 0.94) * smoothstep(calm.y0 - 24, calm.y0 + 16, y) * smoothstep(calm.y1 + 40, calm.y1 - 10, y) : () => 1;
  const band = (x, y) => (0.06 + 0.94 * (1 - smoothstep(0, h * 0.17, y - topAt(x)))) * quiet(y);
  const inBand = (x, y) => 1 - quiet(y);
  // avoid: [[x, y, r], …] local discs kept free of cream primer gaps (white flowers will sit there)
  const clear = avoid.length ? (x, y) => {
    let m = 1;
    for (const [ax, ay, ar = 140] of avoid) m = Math.min(m, smoothstep(ar * 0.75, ar, Math.hypot(x - ax, y - ay)));
    return m;
  } : () => 1;
  const mass = makeCluster({
    w, h, shapeFn: depth, seed: s1, edgeSoftness: 0.7, anchor: [0, 0],
    layers: [
      // a closed dark-green underlay beneath the body of the mass: the pores of the greens show a
      // deeper green, never whatever stands behind the foliage (the canopy edge stays open stipple);
      // the cream primer appears as chunky gaps printed on top (last layer), where `calm` allows it
      { color: '#2E6540', coverage: 0.985, size: 150, stamps: 'dense', tint: 0.02, pores: 0, band: [0.3, 1] },
      // warm undertone: it peeks out above the canopy line and through the gaps of the green
      { colors: WARM, coverage: 1.5 * warm, size: 104, stamps: 'any', pores: 0.3, offset: [0, -h * 0.055], maskFn: band, patch: { scale: 230, amount: 0.42, sharp: 0.3 } },
      // ground: a mid olive green; the darks sit ON it as patchy prints (never a dark slab)
      { color: '#457C46', coverage: 0.97, size: 150, pores: 0.5 },
      { color: '#34693F', coverage: 0.5, size: 120, pores: 0.3, patch: { scale: 230, amount: 0.46, sharp: 0.4, seed: 71 } },
      { color: '#225639', coverage: 0.45, size: 104, pores: 0.3, maskFn: (x, y) => Math.min(1, 0.55 + 0.45 * (1 - lit(x, y)) + 0.15 * (1 - quiet(y))), patch: { scale: 230, amount: 0.58, sharp: 0.4, seed: 71 } },
      { color: '#174832', coverage: 0.3, size: 90, stamps: 'open', pores: 0.3, maskFn: (x, y) => 0.4 + 0.6 * (1 - lit(x, y)), patch: { scale: 230, amount: 0.7, sharp: 0.4, seed: 71 } },
      // the calm band is not a dead stripe: where the lights are held back it gets DARK sponge texture
      // instead (lacy deep-green prints with pores + a dark spray) — still below luminance 0.2 everywhere
      { color: '#174832', coverage: 0.46, size: 84, stamps: 'open', pores: 0.5, maskFn: inBand, patch: { scale: 150, amount: 0.46, sharp: 0.5 } },
      { color: '#0F3A28', coverage: 0.18, size: 80, stamps: 'speck', opacity: 1, maskFn: inBand },
      { color: '#407846', coverage: 0.34, size: 70, stamps: 'open', pores: 0.5, maskFn: inBand, patch: { scale: 130, amount: 0.56, sharp: 0.5, seed: 83 } },
      { color: '#4A8349', coverage: 0.1, size: 76, stamps: 'speck', opacity: 1, maskFn: inBand },
      { colors: WARM.slice(0, 3), coverage: 0.42 * warm, size: 84, stamps: 'open', pores: 0.3, maskFn: (x, y) => 0.12 * quiet(y) + 0.88 * band(x, y), patch: { scale: 190, amount: 0.66, sharp: 0.3 } },
      // lights: chunky prints in clumps (mid -> light -> highlight share one patch map, away from the darks)
      // (each tone is followed by a spray of fine stipple of the same paint: the powdery frontier)
      { color: '#225639', coverage: 0.1, size: 96, stamps: 'speck', opacity: 1 },
      { color: '#6B9A4E', coverage: 0.6, size: 110, stamps: 'body', opacity: 1, pores: 0.3, maskFn: (x, y) => (0.45 + 0.55 * lit(x, y)) * quiet(y), patch: { scale: 210, amount: 0.43, sharp: 0.4, seed: 77 } },
      { color: '#6B9A4E', coverage: 0.12, size: 90, stamps: 'speck', opacity: 1, maskFn: (x, y) => quiet(y), patch: { scale: 210, amount: 0.34, sharp: 0.3, seed: 77 } },
      { color: '#8BAF58', coverage: 0.48, size: 84, opacity: 1, pores: 0.3, maskFn: (x, y) => (0.35 + 0.65 * lit(x, y)) * quiet(y), patch: { scale: 210, amount: 0.55, sharp: 0.4, seed: 77 } },
      { color: '#8BAF58', coverage: 0.1, size: 80, stamps: 'speck', opacity: 1, maskFn: (x, y) => (0.35 + 0.65 * lit(x, y)) * quiet(y), patch: { scale: 210, amount: 0.46, sharp: 0.3, seed: 77 } },
      { color: '#AEC76A', coverage: 0.34, size: 60, stamps: 'open', opacity: 1, pores: 0.3, maskFn: (x, y) => (0.25 + 0.75 * lit(x, y)) * quiet(y), patch: { scale: 210, amount: 0.67, sharp: 0.4, seed: 77 } },
      // flecks: a few terracotta / peach dabs and chunky gaps of cream primer
      { colors: WARM, coverage: 0.1 * (warm / 0.5), size: 64, stamps: 'body', pores: 0.3, maskFn: (x, y) => quiet(y), patch: { scale: 170, amount: 0.72, sharp: 0.5 } },
      // (small lacy gaps, not blossom-sized clumps: they must not compete with white flowers)
      { color: PAL.primer, coverage: 0.08, size: 46, stamps: 'open', tint: 0.01, pores: 0.3, maskFn: (x, y) => quiet(y) * clear(x, y), patch: { scale: 170, amount: 0.7, sharp: 0.45 } },
      { color: PAL.primer, coverage: 0.03, size: 60, stamps: 'speck', tint: 0.01, opacity: 1, maskFn: (x, y) => quiet(y) * clear(x, y), patch: { scale: 170, amount: 0.6, sharp: 0.3 } },
    ],
    reveal: { steps: 7, order: 'sweep', angle: -Math.PI / 2, jitter: 0.4, even: 'area', ...reveal },
  });
  return { mass, topAt, w, h, draw: (ctx, x, y, o) => mass.draw(ctx, x, y, o) };
}

/**
 * Mask that keeps joints calm: 0 inside the joint circles (radius r x 1.1 + margin), rising to 1
 * over `ramp` px outside them. jointCalm(len, r0, r1) for a capsule limb (joints at (0,0) and
 * (len,0)), or jointCalm([[x, y, r], …]) for any part (a torso: discs at the shoulders and hips).
 * Use it as the maskFn of porous / contrasty layers so that overlapping joint caps stay seamless.
 */
export function jointCalm(len, r0 = 0, r1 = r0, { margin = 0, ramp = 10 } = {}) {
  const js = Array.isArray(len) ? len : [[0, 0, r0], [len, 0, r1]];
  return (x, y) => {
    let m = 1;
    for (const [jx, jy, r] of js) {
      const v = smoothstep(r * 1.1 + margin, r * 1.1 + margin + ramp, Math.hypot(x - jx, y - jy));
      if (v < m) m = v;
    }
    return m;
  };
}

/**
 * Paint recipe for puppet limbs and other parts that overlap at joints.
 *   limbLayers(color, width)                         the CALM recipe: low contrast, small dabs
 *       (<= 1/3 of the limb width), no pores, no primer — a round joint cap never shows as a seam.
 *   limbLayers(color, width, { len, r0, r1, rich: 1 })  calm base + properly porous sponge layers
 *       (darker and lighter prints with pores, a few primer specks) that fade out inside the two
 *       joint circles of a capsule(len, r0, r1): the limb shows real S-050 texture along its length
 *       while the overlapping caps stay calm. For other parts pass joints: [[x, y, r], …] instead of
 *       len / r0 / r1 (torso: shoulders and hips); with neither, the rich layers cover the whole part.
 *       rich scales their contrast (1 = ±0.14 tone); lit: (x, y) -> 0..1 puts the lighter prints
 *       on the lit side only (e.g. E.sphereLight or a simple x / y ramp).
 *   bakeStencil({ shape: E.shape.capsule(len, r0, r1), anchor: [0, 0], base: color,
 *                 layers: E.limbLayers(color, 2 * r0, { len, r0, r1, rich: 1 }), bleed: false })
 */
export function limbLayers(color, width = 40, { contrast = 1, rich = 0, len = null, r0 = width / 2, r1 = r0, joints = null, lit = null } = {}) {
  const size = clamp(width * 0.32, 9, 44);
  const calm = [
    { color: tone(color, -0.07 * contrast), coverage: 0.42, size, tint: 0.012, stamps: 'open', pores: 0, opacity: [0.5, 0.8] },
    { color: tone(color, 0.08 * contrast), coverage: 0.36, size: size * 0.9, tint: 0.012, stamps: 'soft', opacity: [0.5, 0.8] },
  ];
  if (!(rich > 0)) return calm;
  const big = clamp(width * 0.46, 12, 60);
  const spec = joints ?? (len !== null ? [[0, 0, r0], [len, 0, r1]] : []);
  const keep = (sz) => (spec.length ? jointCalm(spec, 0, 0, { margin: sz * 0.42, ramp: sz * 0.5 }) : () => 1);
  const kd = keep(big), kl = keep(big * 0.85), kp = keep(big * 0.5);
  return [
    ...calm,
    { color: tone(color, -0.14 * rich), coverage: 0.5, size: big, tint: 0.03, stamps: 'body', pores: 0.5, maskFn: kd },
    { color: tone(color, 0.14 * rich), coverage: 0.42, size: big * 0.85, tint: 0.03, stamps: 'open', pores: 0.5, maskFn: lit ? (x, y) => kl(x, y) * lit(x, y) : kl },
    { color: PAL.primer, coverage: 0.03, size: big * 0.5, stamps: 'speck', maskFn: kp },
  ];
}
