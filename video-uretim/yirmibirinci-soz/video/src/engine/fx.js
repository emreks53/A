// fx.js — deterministic particles, light, whole-frame dab transitions and the global finishing pass.
//
//   makeSpecks(opts)          a field of slowly drifting sponge specks (pure function of t)
//   makeBurst(painted, opts)  specks that peel off a sprite while it is dabbed out
//   makeTrail(opts)           specks travelling along a path once (a throw, a sparkle trail)
//   makeStream(opts)          a continuous stream of specks along a path
//   makeGlow(opts)            soft glow cluster (halo, light), round or elliptical
//   makeRays(opts)            sponge light rays fanning out from a source
//   makeDabMask / drawThrough whole-scene dab transition (anything drawn through sponge prints)
//   breathe(t, ...)           slow scale / alpha pulse for glows and halos
//   makeFinish()              wall grain over the whole frame (keeps everything on the same wall)

import { makeRng, noise1, seedOf, valueNoise2 } from './rng.js';
import { clamp, lerp, smoothstep, TAU, ease } from './ease.js';
import { env, blit, tone, surface } from './surface.js';
import { sandGrain, mottle } from './backdrop.js';
import { revealOrder, makeCluster, clusterDabs, scatterDabs, Painted } from './sponge.js';
import { shape, bakeStencil, scratch } from './stencil.js';
import { curve } from './motion.js';

// ------------------------------------------------------------------ crumbs (speck sprites)

// A crumb is a tiny piece of sponge print: an irregular, grainy, slightly porous blob with a soft
// edge — never a flat polygon. Masks are generated once; tinted copies are cached per colour.
const CRUMB_N = 10, CRUMB_S = 32;
let crumbMasks = null;
const crumbCache = new Map();

function crumbMask(i) {
  if (!crumbMasks) crumbMasks = [];
  if (crumbMasks[i]) return crumbMasks[i];
  const S = CRUMB_S, seed = seedOf('crumb', i), rng = makeRng(seed);
  const c = new OffscreenCanvas(S, S), ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  const el = 1 + rng.sym(0.3), rot = rng.next() * TAU, cr = Math.cos(rot), sr = Math.sin(rot);
  const h = [2, 3, 4].map((k) => [k, rng.range(0.06, 0.2), rng.next() * TAU]);
  const pore = [S / 2 + rng.sym(S * 0.16), S / 2 + rng.sym(S * 0.16), rng.range(1.6, 3.2)];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx0 = x + 0.5 - S / 2, dy0 = y + 0.5 - S / 2;
      const dx = (dx0 * cr + dy0 * sr) * el, dy = (-dx0 * sr + dy0 * cr) / el;
      const an = Math.atan2(dy, dx);
      let ro = 1;
      for (const [k, a, ph] of h) ro += a * Math.sin(k * an + ph);
      const d = Math.hypot(dx, dy) / (S * 0.4 * ro);
      if (d >= 1.15) continue;
      let cov = lerp(1.0, -0.25, smoothstep(0.22, 1.1, d));
      cov -= 1.2 * clamp((pore[2] - Math.hypot(x - pore[0], y - pore[1])) / 1.5 + 0.5);
      let g = 0.6 * valueNoise2(x / 3.4, y / 3.4, seed) + 0.4 * valueNoise2(x / 1.6, y / 1.6, seed + 1);
      g = clamp(0.5 + (g - 0.5) * 2.2);
      const a = smoothstep(-0.2, 0.2, cov - g) * (0.82 + 0.18 * valueNoise2(x / 5, y / 5, seed + 2));
      const o = (y * S + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  crumbMasks[i] = c;
  return c;
}

/** Tinted crumb sprite (cached): variant i, CSS colour. */
function crumbSprite(i, color) {
  const key = (i % CRUMB_N) + color;
  let c = crumbCache.get(key);
  if (!c) {
    c = new OffscreenCanvas(CRUMB_S, CRUMB_S);
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, CRUMB_S, CRUMB_S);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(crumbMask(i % CRUMB_N), 0, 0);
    crumbCache.set(key, c);
  }
  return c;
}

function crumb(ctx, img, x, y, size, rot, alpha) {
  if (size <= 0.4 || alpha <= 0.004) return;
  const c = Math.cos(rot), s = Math.sin(rot), k = (size * 1.25) / CRUMB_S;
  const prev = ctx.globalAlpha;
  ctx.save();
  ctx.transform(c * k, s * k, -s * k, c * k, x, y);
  ctx.globalAlpha = prev * Math.min(1, alpha);
  ctx.drawImage(img, -CRUMB_S / 2, -CRUMB_S / 2);
  ctx.restore();
}

/**
 * Drifting specks inside bounds [x, y, w, h] (they wrap around, fading at the borders).
 * opts: seed, count, colors[], size [min, max] px, speed [min, max] px/s, angle (rad, direction of
 * travel; -PI/2 = up), spread (rad), wobble (px), twinkle (0..1), edgeFade (px).
 * Returns { draw(ctx, t, {alpha = 1, exclude, excludeAlpha = 1, excludeFade = 40}) }.
 *   exclude: [x, y, w, h] in FRAME coordinates (whatever camera the specks are drawn under): specks
 *   inside it fade out by `excludeAlpha` (0 = unchanged … 1 = gone), over `excludeFade` px at its
 *   border. Keep the words of a gloss clear:  exclude: [140, 1300, 800, 220], excludeAlpha: E.glossAlpha(t, g).
 */
export function makeSpecks({
  seed = 1, count = 26, bounds = [0, 0, env.W, env.H], colors = ['#FBF8F0'], size = [4, 9],
  speed = [8, 20], angle = -0.5, spread = 0.5, wobble = 12, twinkle = 0.35, edgeFade = 70,
} = {}) {
  const rng = makeRng(seedOf('specks', seed));
  const [bx, by, bw, bh] = bounds;
  const ps = Array.from({ length: count }, (_, i) => {
    const a = angle + rng.sym(spread), v = rng.range(speed[0], speed[1]);
    return {
      x: rng.next() * bw, y: rng.next() * bh, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      size: rng.range(size[0], size[1]), img: crumbSprite(i, rng.pick(colors)), rot: rng.next() * TAU,
      spin: rng.sym(0.6), ph: rng.next() * 100, tw: rng.range(2.5, 5),
    };
  });
  return {
    draw(ctx, t, { alpha = 1, exclude = null, excludeAlpha = 1, excludeFade = 40 } = {}) {
      if (alpha <= 0) return;
      // frame position of a local point under the current transform (for `exclude`)
      const m = exclude && excludeAlpha > 0 ? ctx.getTransform() : null;
      for (const p of ps) {
        const x = (((p.x + p.vx * t) % bw) + bw) % bw, y = (((p.y + p.vy * t) % bh) + bh) % bh;
        const edge = smoothstep(0, edgeFade, Math.min(x, bw - x, y, bh - y));
        let a = alpha * edge * (1 - twinkle * (0.5 + 0.5 * Math.sin((t / p.tw) * TAU + p.ph)));
        if (a <= 0.01) continue;
        const px = bx + x + Math.sin(t * 0.7 + p.ph) * wobble, py = by + y + Math.sin(t * 0.53 + p.ph * 1.7) * wobble;
        if (m) {
          const fx = (m.a * px + m.c * py + m.e) / env.res, fy = (m.b * px + m.d * py + m.f) / env.res;
          const inside = Math.min(fx - exclude[0], exclude[0] + exclude[2] - fx, fy - exclude[1], exclude[1] + exclude[3] - fy);
          a *= 1 - excludeAlpha * smoothstep(-p.size, excludeFade, inside);
          if (a <= 0.01) continue;
        }
        crumb(ctx, p.img, px, py, p.size, p.rot + p.spin * t, a);
      }
    },
  };
}

/**
 * Specks that peel off a Painted while it is dabbed out. Colours and start points are sampled
 * from the sprite's own pixels. Use together with painted.draw(..., {p: 1 - tau / duration}):
 * pass the same `order` (reveal spec) the sprite was baked with so specks leave where paint goes.
 * opts: seed, count, duration (s of the dab-out), order (reveal spec), wind [vx, vy] px/s,
 *       spread px, life [min, max] s, size [min, max] px.
 * Returns { draw(ctx, x, y, tau, {scale = 1, rot = 0, alpha = 1}) } — (x, y) is where the sprite's
 * anchor is drawn; rot / scale follow a rotated / scaled sprite. Specks shrink to nothing.
 */
export function makeBurst(painted, {
  seed = 1, count = 150, duration = 1.2, order = painted.reveal ?? {}, wind = [60, -40], spread = 44,
  life = [0.9, 1.7], size = [4, 10],
} = {}) {
  const rng = makeRng(seedOf('burst', seed));
  const { canvas, res } = painted.final;
  const img = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  // the order is laid over the INK box (like the mask reveal itself), so specks leave where and
  // when the paint goes
  const [ix, iy, ix1, iy1] = typeof order.order === 'function' ? [0, 0, painted.lw, painted.lh] : painted._occupancy().box;
  const spec = { ...order, jitter: 0, ...(order.from && { from: [order.from[0] - ix, order.from[1] - iy] }) };
  const keyIn = revealOrder(spec, ix1 - ix, iy1 - iy);
  const key = (x, y, r) => keyIn(x - ix, y - iy, r);
  const mid = { next: () => 0.5 };
  const ps = [];
  // sample on a fixed logical lattice so the particles are the same at every render scale
  for (let tries = 0; ps.length < count && tries < count * 60; tries++) {
    const x = rng.next() * painted.lw, y = rng.next() * painted.lh;
    const px = Math.min(canvas.width - 1, Math.floor(x * res)), py = Math.min(canvas.height - 1, Math.floor(y * res));
    const o = (py * canvas.width + px) * 4;
    const born = (1 - key(x, y, mid)) * duration * 0.92 + rng.next() * duration * 0.08;
    const lf = rng.range(life[0], life[1]), sz = rng.range(size[0], size[1]);
    const rot = rng.next() * TAU, spin = rng.sym(2.2), ph = rng.next() * 100, k = rng.range(0.7, 1.3);
    if (img[o + 3] < 140) continue;
    const q = (v) => Math.round(v / 8) * 8; // a few dozen distinct tints at most
    ps.push({
      x: x - painted.ax, y: y - painted.ay, born, life: lf, size: sz, rot, spin, ph, k, a: 0.55 + 0.45 * ((ph * 7.3) % 1),
      img: crumbSprite(ps.length, `rgb(${q(img[o])},${q(img[o + 1])},${q(img[o + 2])})`),
    });
  }
  return {
    draw(ctx, x, y, tau, { scale = 1, rot = 0, alpha = 1 } = {}) {
      const cr = Math.cos(rot), sr = Math.sin(rot);
      for (const p of ps) {
        const u = tau - p.born;
        if (u <= 0 || u >= p.life) continue;
        const v = u / p.life;
        const a = alpha * p.a * smoothstep(0, 0.05, u) * (1 - smoothstep(0.55, 1, v));
        const travel = u * (0.55 + 0.5 * u) * p.k;
        const turb = spread * smoothstep(0, 0.6, u);
        const lx = p.x * cr - p.y * sr, ly = p.x * sr + p.y * cr;
        crumb(ctx, p.img,
          x + (lx * scale + wind[0] * travel + noise1(u * 1.1 + p.ph, 21) * turb),
          y + (ly * scale + wind[1] * travel + noise1(u * 1.1 + p.ph, 22) * turb),
          p.size * (1 - smoothstep(0.3, 1, v)) * scale, p.rot + rot + p.spin * u, a);
      }
    },
  };
}

/**
 * Specks travelling along a path, one after another (a cast coin's sparkle, a stream of light,
 * seeds on the wind…).
 *   path      E.curve(...) / E.arc(...) object, or a list of [x, y] points (smoothed)
 *   count     number of specks;  duration  s one speck needs for the whole path
 *   stagger   s between the first and the last speck's start (0 = a single clump)
 *   spread    px of sideways scatter;  size [min, max] px (use >= 10 px for anything that must be
 *             noticed on a phone);  colors [#RRGGBB…];  easing (u) -> u
 *   head      optional Painted (a coin, a bead, a big speck) that LEADS the trail: it travels the
 *             path with the first speck's timing, drawn on top; headScale / headSpin (rad/s) shape it
 * Returns { draw(ctx, tau, {alpha = 1}), total, headAt(tau) -> [x, y] | null } — tau = seconds since
 * the first speck starts; `total` = duration + stagger. Specks fade in, shrink and fade out at the
 * end of the path; the head simply ends there (draw the landed object yourself from tau >= duration).
 * A trail is ONE-SHOT. For a stream that keeps flowing use makeStream (never `tau % total`: the
 * whole trail would restart at once).
 */
export function makeTrail({
  path, count = 24, duration = 1, stagger = 0.5, spread = 10, size = [10, 22], colors = ['#F8DC78', '#FBF8F0'],
  seed = 1, easing = ease.sine.inOut, head = null, headScale = 1, headSpin = 0,
} = {}) {
  const cv = Array.isArray(path) ? curve(path) : path;
  const rng = makeRng(seedOf('trail', seed));
  const ps = Array.from({ length: count }, (_, i) => ({
    delay: count > 1 ? (i / (count - 1)) * stagger * rng.range(0.85, 1.15) : 0,
    side: rng.sym(1), size: rng.range(size[0], size[1]), img: crumbSprite(i, rng.pick(colors)),
    rot: rng.next() * TAU, spin: rng.sym(3), ph: rng.next() * 100, k: rng.range(0.9, 1.1),
  }));
  const headAt = (tau) => (tau < 0 || tau >= duration ? null : cv.at(easing(tau / duration)));
  return {
    total: duration + stagger, headAt,
    draw(ctx, tau, { alpha = 1 } = {}) {
      for (const p of ps) {
        const v = (tau - p.delay) / (duration * p.k);
        if (v <= 0 || v >= 1) continue;
        const u = easing(v);
        const [x, y] = cv.at(u), an = cv.angle(u);
        const off = spread * (p.side * (0.4 + 0.6 * smoothstep(0, 0.3, v)) + 0.35 * Math.sin(v * 9 + p.ph));
        const a = alpha * smoothstep(0, 0.08, v) * (1 - smoothstep(0.8, 1, v));
        crumb(ctx, p.img, x - Math.sin(an) * off, y + Math.cos(an) * off, p.size * (1 - 0.55 * smoothstep(0.5, 1, v)), p.rot + p.spin * tau, a);
      }
      const h = head ? headAt(tau) : null;
      if (h) head.draw(ctx, h[0], h[1], { alpha, scale: headScale, rot: headSpin * tau });
    },
  };
}

/**
 * A CONTINUOUS stream of specks along a path (light pouring in, sand in an hourglass, seeds on the
 * wind): every speck travels the path in `life` seconds and starts again on its own, spread evenly
 * in time, so there is no moment at which the whole stream restarts.
 *   path      E.curve(...) / E.arc(...) / [[x, y], …];  count = specks on the path at any time
 *             (or rate = specks per second: count = rate x life);  life  s for the whole path
 *   spread    px of sideways scatter;  size [min, max] px;  colors;  easing (u) -> u (default linear)
 * Returns { draw(ctx, t, {alpha = 1, start = -Infinity, stop = Infinity}) }: a speck is shown only if
 * it LEFT the source between `start` and `stop` (seconds, same clock as t) — the stream starts
 * flowing at `start`, speck by speck, and runs dry after `stop` while the last ones finish the path.
 */
export function makeStream({
  path, count = null, rate = 16, life = 1.2, spread = 8, size = [8, 16], colors = ['#F8DC78', '#FBF8F0'],
  seed = 1, easing = (u) => u,
} = {}) {
  const cv = Array.isArray(path) ? curve(path) : path;
  const rng = makeRng(seedOf('stream', seed));
  const n = Math.max(1, Math.round(count ?? rate * life));
  const ps = Array.from({ length: n }, (_, i) => ({
    off: (i + rng.next() * 0.8) / n, side: rng.sym(1), size: rng.range(size[0], size[1]), img: crumbSprite(i, rng.pick(colors)),
    rot: rng.next() * TAU, spin: rng.sym(3), ph: rng.next() * 100,
  }));
  return {
    count: n, life,
    draw(ctx, t, { alpha = 1, start = -Infinity, stop = Infinity } = {}) {
      if (alpha <= 0) return;
      for (const p of ps) {
        const c = t / life + p.off, v = c - Math.floor(c), born = t - v * life;
        if (born < start - 1e-9 || born > stop + 1e-9) continue;
        const u = easing(v);
        const [x, y] = cv.at(u), an = cv.angle(u);
        const off = spread * (p.side * (0.4 + 0.6 * smoothstep(0, 0.3, v)) + 0.35 * Math.sin(v * 9 + p.ph));
        const a = alpha * smoothstep(0, 0.1, v) * (1 - smoothstep(0.82, 1, v));
        crumb(ctx, p.img, x - Math.sin(an) * off, y + Math.cos(an) * off, p.size * (1 - 0.5 * smoothstep(0.55, 1, v)), p.rot + p.spin * t, a);
      }
    },
  };
}

// ------------------------------------------------------------------ light

/**
 * Glow cluster (anchor = centre of light): chunky sponge prints, dense in the middle, thinning to
 * stipple toward the rim.
 *   r         VISIBLE radius: the coverage falls to ~5 % at r and to nothing just beyond it (the
 *             cluster disc itself is laid out 1/0.72 larger). rx, ry make it an ellipse.
 *   color     body colour; core = colour of the smaller prints in the middle (default: a lighter tone)
 *   density   coverage in the centre (default 0.9; 0.5 = an open, airy glow)
 *   falloff   0..1 part of the radius over which the prints thin out (default 0.8 = from the centre;
 *             0.3 = a full disc with a short stippled rim)
 *   stamps    stamp family of the prints (default: all body stamps, turning to fine stipple at the
 *             rim; 'body' = chunky to the edge, 'soft' = powdery throughout)
 *   opacity   per-dab opacity (default [0.92, 1]); pass e.g. [0.45, 0.8] for a translucent veil
 * The sprite is re-centred on the centroid of its own prints, so it sits exactly on (x, y).
 * Pulse it when drawing: glow.draw(ctx, x, y, { scale: breathe(t, 4.6, 0.04), alpha }). On dusk /
 * night grounds draw it with { blend: 'screen' } and put a second, smaller and paler glow on top as
 * the core: paint that is merely lighter than a dark ground does not read as LIGHT on its own.
 */
export function makeGlow({
  r = 200, rx = r, ry = r, color = '#F8DC78', core = tone(color, 0.35), density = 0.9, falloff = 0.8,
  stamps = null, opacity = [0.92, 1], seed = 1, reveal = {},
} = {}) {
  const K = 1 / 0.72, m = Math.min(rx, ry);
  const spec = clusterDabs({
    points: [{ x: 0, y: 0, r: Math.max(rx, ry) * K, rx: rx * K, ry: ry * K }], seed, edgeSoftness: falloff, anchor: [0, 0],
    layers: [
      { color, coverage: density, size: m * 0.62, ...(stamps && { stamps }), opacity, pores: 0.3 },
      { color: core, coverage: density * 0.6, size: m * 0.44, band: [0.5, 1], ...(stamps && { stamps }), opacity, pores: 0.3 },
    ],
    reveal: { steps: 5, order: 'radial', from: [0, 0], ...reveal },
  });
  // re-centre on the measured centroid of the baked paint (from the sprite's coarse alpha map)
  const glow = new Painted(spec);
  const { cell, cols, rows, a } = glow._occupancy();
  let sw = 0, sx = 0, sy = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = a[y * cols + x];
      sw += v; sx += v * (x + 0.5); sy += v * (y + 0.5);
    }
  }
  if (sw > 0) { glow.ax = (sx / sw) * cell; glow.ay = (sy / sw) * cell; }
  return glow;
}

/**
 * Sponge light rays (anchor = the source point).
 *   count     number of rays;  angle = centre direction (rad, -PI/2 = up);  spread = fan angle
 *             (TAU = all round)
 *   parallel  true: PARALLEL beams instead of a fan (window light, a shaft through a door): all run in
 *             direction `angle`, side by side `gap` px apart (centre to centre); the anchor is the
 *             middle of the line they start from
 *   inner     radius / distance where rays start;  length  ray length (px), jittered by `jitter` (0..1)
 *   width     [w0, w1] ray width at the start / at the end
 *   colors    [#RRGGBB…] (first = body, others = lighter dabs)
 *   soft      true: soft-edged sponge clusters (light in haze) · false: stencil-sharp beams
 *   split     true: every ray is its own sprite -> { rays: [Painted…], draw(ctx, x, y, {t, shimmer =
 *             0.35, sway = 0.012, speed = 1, alpha, p, rot, scale}) }: each ray breathes on its own
 *             phase (alpha down to 1 - shimmer, a tiny turn of ±sway rad about the source; parallel
 *             beams slide ±sway x 100 px sideways instead) — light that is alive, never a flicker
 * Returns a Painted (or the split object): draw with { rot, alpha, scale, p } (p grows the rays outward).
 */
export function makeRays({
  count = 7, angle = -Math.PI / 2, spread = TAU, inner = 60, length = 360, width = [26, 70], jitter = 0.25,
  colors = ['#F8DC78', '#FBEDB4'], soft = true, seed = 1, reveal = {}, parallel = false, gap = null, split = false,
} = {}) {
  const rng = makeRng(seedOf('rays', seed));
  const full = spread >= TAU - 1e-6;
  const step = parallel ? (gap ?? width[1] * 1.5) : spread / (full ? count : Math.max(1, count - 1));
  const rays = Array.from({ length: count }, (_, i) => {
    if (parallel) {
      const off = (i - (count - 1) / 2) * step + rng.sym(step * 0.12);
      return { a: angle + rng.sym(0.02), ox: -Math.sin(angle) * off, oy: Math.cos(angle) * off, len: length * (1 - jitter * rng.next()), k: rng.range(0.8, 1.15) };
    }
    const u = full ? i / count : count > 1 ? i / (count - 1) - 0.5 : 0;
    // (same draw order from the rng as ever: a fan baked before round 3 keeps its rays)
    return { a: angle + u * spread + rng.sym(step * 0.16), ox: 0, oy: 0, len: length * (1 - jitter * rng.next()), k: rng.range(0.8, 1.15) };
  });
  const quad = (r) => {
    const c = Math.cos(r.a), s = Math.sin(r.a), h0 = (width[0] * r.k) / 2, h1 = (width[1] * r.k) / 2, e = inner + r.len;
    return [[c * inner + s * h0, s * inner - c * h0], [c * e + s * h1, s * e - c * h1], [c * e - s * h1, s * e + c * h1], [c * inner - s * h0, s * inner + c * h0]]
      .map(([x, y]) => [x + r.ox, y + r.oy]);
  };
  const dab = clamp(width[1] * 0.8, 24, 110);
  const layers = [
    { color: colors[0], coverage: 0.86, size: dab, stamps: 'open', opacity: [0.6, 0.92], pores: 0.3 },
    ...colors.slice(1).map((c, i) => ({ color: c, coverage: 0.42, size: dab * (0.75 - i * 0.12), stamps: 'soft', opacity: [0.6, 0.9] })),
  ];
  const rv = { steps: 5, order: 'radial', from: [0, 0], jitter: 0.12, ...reveal };
  const build = (list, sd) => {
    const all = list.flatMap(quad);
    const pad = soft ? width[1] * 0.4 + 8 : 4;
    const x0 = Math.floor(Math.min(...all.map((p) => p[0])) - pad), y0 = Math.floor(Math.min(...all.map((p) => p[1])) - pad);
    const x1 = Math.ceil(Math.max(...all.map((p) => p[0])) + pad), y1 = Math.ceil(Math.max(...all.map((p) => p[1])) + pad);
    if (!soft) {
      return bakeStencil({
        shape: shape.union(...list.map((r) => shape.polygon(quad(r)))), bounds: [x0, y0, x1, y1], anchor: [0, 0], seed: sd,
        layers, bleed: false, reveal: { mode: 'mask', ...rv },
      });
    }
    const depth = (x, y) => {
      const px = x + x0, py = y + y0;
      let best = 0;
      for (const r of list) {
        const dx = px - r.ox, dy = py - r.oy, c = Math.cos(r.a), s = Math.sin(r.a);
        const along = dx * c + dy * s, lat = Math.abs(dy * c - dx * s), u = (along - inner) / r.len;
        if (u <= 0 || u >= 1) continue;
        const hw = (lerp(width[0], width[1], u) * r.k) / 2;
        const d = Math.min(1 - lat / hw, u * 6, (1 - u) * 2.2);
        if (d > best) best = d;
      }
      return clamp(best);
    };
    return makeCluster({
      w: x1 - x0, h: y1 - y0, shapeFn: depth, anchor: [-x0, -y0], seed: sd, edgeSoftness: 0.55, layers,
      reveal: { ...rv, from: [-x0, -y0] },
    });
  };
  if (!split) return build(rays, seed);
  const parts = rays.map((r, i) => ({ sprite: build([r], seedOf('ray', i, seed)), ph: rng.next() * TAU, f: rng.range(0.7, 1.3), nx: -Math.sin(r.a), ny: Math.cos(r.a) }));
  return {
    rays: parts.map((q) => q.sprite), steps: rv.steps,
    draw(ctx, x = 0, y = 0, { t = 0, shimmer = 0.35, sway = 0.012, speed = 1, alpha = 1, p = 1, rot = 0, scale = 1 } = {}) {
      for (const q of parts) {
        const w1 = Math.sin(t * 0.9 * speed * q.f + q.ph), w2 = Math.sin(t * 0.53 * speed * q.f + q.ph * 1.7);
        const a = alpha * (1 - shimmer * (0.5 + 0.5 * w1));
        if (a <= 0.004) continue;
        if (parallel) {
          const d = sway * 100 * w2, c = Math.cos(rot), s = Math.sin(rot);
          q.sprite.draw(ctx, x + (q.nx * c - q.ny * s) * d * scale, y + (q.nx * s + q.ny * c) * d * scale, { alpha: a, p, rot, scale });
        } else q.sprite.draw(ctx, x, y, { alpha: a, p, rot: rot + sway * w2, scale });
      }
    },
  };
}

// ------------------------------------------------------------------ whole-frame dab transition

/**
 * An ordered mask of sponge prints covering w x h (default: the frame) for drawThrough.
 * opts: steps = 8, dab = 240 (print size), order / from / angle / jitter (reveal order), seed.
 */
export function makeDabMask({ w = env.W, h = env.H, steps = 8, dab = 240, seed = 1, ...order } = {}) {
  const dabs = scatterDabs([{ color: '#FFFFFF', coverage: 0.993, size: dab, stamps: 'body', tints: 1, pores: 0.3 }],
    { w, h, seed: seedOf('dabmask', seed), reveal: { ...order, layerMix: 0 } });
  // translucent prints -> near-opaque mask (draw the stage over itself)
  const post = (s) => {
    const c = s.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.drawImage(s.canvas, 0, 0);
    c.drawImage(s.canvas, 0, 0);
    c.restore();
  };
  return new Painted({ w, h, dabs, steps, post, mode: 'build', seed });
}

/**
 * Draw anything through a dab mask: at progress p (0..1, quantised to the mask's steps) only the
 * part of drawFn's picture under the first sponge prints is visible; p >= 1 draws it plainly.
 *   scene A -> scene B:   A.draw(ctx, …);  E.drawThrough(ctx, mask, p, (c) => B.draw(c, …));
 *   dab something OUT:    E.drawThrough(ctx, mask, 1 - p, (c) => old.draw(c, …)) over the new picture.
 * Call it in FRAME coordinates (outside camera transforms; apply cameras inside drawFn). (x, y) =
 * where the mask's top-left sits on the frame.
 */
export function drawThrough(ctx, mask, p, drawFn, { x = 0, y = 0 } = {}) {
  if (p <= 0) return;
  const m = p >= 1 ? mask.final : mask.at(p);
  if (!m) return;
  if (m === mask.final) {
    if (p >= 1) mask.at(1);
    drawFn(ctx);
    return;
  }
  const s = scratch(env.W, env.H, 'frame'), c = s.ctx;
  c.imageSmoothingQuality = ctx.imageSmoothingQuality;
  c.save();
  drawFn(c);
  c.restore();
  c.setTransform(s.res, 0, 0, s.res, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'destination-in';
  blit(c, m, x, y);
  c.globalCompositeOperation = 'source-over';
  const cw = Math.round(env.W * s.res), ch = Math.round(env.H * s.res);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(s.canvas, 0, 0, cw, ch, 0, 0, cw, ch);
  ctx.restore();
}

/** 1 ± amount, sinusoidal: breathe(t, 4, 0.03) -> scale factor for a softly pulsing halo. */
export const breathe = (t, period = 4, amount = 0.03, phase = 0) => 1 + amount * Math.sin((t / period + phase) * TAU);

/**
 * Finishing layer for the whole frame: device-pixel sand grain + faint mottling + a vignette of
 * about 5 %. Returns finish(ctx); main.js calls it after every scene draw (scene.finish !== false).
 */
export function makeFinish({ seed = 3 } = {}) {
  const s = surface(env.W, env.H);
  const { ctx } = s;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, env.W, env.H);
  const g = ctx.createRadialGradient(env.W / 2, env.H * 0.48, env.H * 0.4, env.W / 2, env.H * 0.5, env.H * 0.7);
  g.addColorStop(0, 'rgba(120,96,70,0)');
  g.addColorStop(1, 'rgba(120,96,70,0.08)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, env.W, env.H);
  mottle(s, seed, 0.01, 300);
  sandGrain(s, 0.75);
  return (target) => {
    target.save();
    target.globalCompositeOperation = 'multiply';
    target.globalAlpha = 1;
    blit(target, s);
    target.restore();
  };
}
