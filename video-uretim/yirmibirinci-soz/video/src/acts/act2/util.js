// util.js — small helpers and the EVENT TIMES of act 2 (storyboard §4, written as the storyboard writes
// them: two decimals on the 30 fps grid; every use snaps them to the exact frame time with L.ft).
//
// Owner: act-2 team. Everything here is a pure function of absolute time.

/** Storyboard times of everything act 2 draws (seconds, as written in storyboard.json). */
export const TL = {
  hand: { print: 12.47, sweep: [12.87, 13.40], settle: 13.50 },
  beads: { first: 12.93, every: 2, perStep: 3 },                        // 8 steps on twos, 3 beads per step
  gold: { dab: [13.80, 13.87], dip: 13.90, pop: 13.97, hands: 14.00, settled: 14.23, float: 14.57, land: 15.37 },
  glint: [15.40, 15.47, 15.53], glintOff: 15.60,
  toSide: [15.77, 16.03],
  turn: [16.63, 16.73, 16.83],                                           // the right column turns over (on threes)
  light: [16.83, 16.90, 16.97], swell: 23.23,                            // far light: peach, gold, white core + pink rim (settled 4 frames before «gelecek» 17.14); swell = LINK 3
  lbeads: [17.80, 17.90, 18.00, 18.10, 18.20],
  chest: { body: [18.27, 18.40, 18.53], lid: 18.77, lidRest: 18.87, seam: [19.50, 19.57] },   // lid printed f563, at rest f566 (gloss 18.92)
  morph: { squash: 19.87, m1: [19.97, 20.27], m2: [20.00, 20.27], m3: [20.13, 20.30], m3rest: 20.33, fin1: 20.33, fin2: 20.37, rest: 20.43 },
  rug: { spill: 21.27, roll: [21.33, 21.40], unroll: [21.43, 21.93], glow: [21.73, 21.80], flick: [21.90, 21.97] },
  // client round («seccadeye at» is figurative): he raises both hands in prayer, the hour on his open right palm, and
  // GIVES it — it dabs out into light in four passes; the light rises to the far light. Nothing is thrown, nothing lands.
  coin: { raise: [22.00, 22.50], give: [22.57, 22.67, 22.77, 22.87], reach: 23.23 },   // frames 660–675 · 677 / 680 / 683 / 686 · the stream's head is in the far light on 697
  links: { bloom: 22.90, door: 23.07, far: 23.23 },                      // the three answers, 5 frames apart (687 / 692 / 697); `bloom` = the niche's glow swells (rug.js)
  cover: [23.90, 24.00, 24.10, 24.20, 24.30],   // the covered share of each pass: light.js (COVER_P)
};

export function makeUtil(E, W) {
  const L = W.layout, fps = L.fps;
  const { clamp, lerp } = E;

  /** exact frame time of a storyboard time */
  const ft = (ts) => L.ft(ts);
  /** has the stepped event written as storyboard time `ts` happened at t? */
  const on = (t, ts) => t >= L.ft(ts) - 1e-6;
  /** frames since a storyboard time (continuous; negative before it) */
  const nf = (t, ts) => (t - L.ft(ts)) * fps;
  /** 0..1 progress between two storyboard times (clamped, linear) */
  const prog = (t, a, b) => clamp((t - L.ft(a)) / (L.ft(b) - L.ft(a)));
  /** number of entries of a list of storyboard times that have happened */
  const count = (t, list) => L.count(t, list);

  /**
   * Keyframed number by FRAMES since an event: keys [[frame, value], …] (ascending), linear in between,
   * held outside. kf(nf(t, 13.97), [[0, 0.8], [1, 1.15], [2, 1.03], [3, 1]]).
   */
  const kf = (n, keys) => {
    if (n <= keys[0][0]) return keys[0][1];
    const last = keys[keys.length - 1];
    if (n >= last[0]) return last[1];
    let i = 0;
    while (n > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1];
    return lerp(a[1], b[1], (n - a[0]) / (b[0] - a[0]));
  };
  /** A small print's pop: nothing before its frame, then 0.82 -> 1.15 -> 1.03 -> 1 (settled after 3 frames). */
  const POP3 = [[0, 0.82], [1, 1.15], [2, 1.04], [3, 1]];
  const pop3 = (n) => (n < -1e-6 ? 0 : kf(n, POP3));
  /** Softer pop for groups that must not strobe: 0.86 -> 1.09 -> 1.02 -> 1. */
  const POP3S = [[0, 0.86], [1, 1.09], [2, 1.02], [3, 1]];
  const pop3s = (n) => (n < -1e-6 ? 0 : kf(n, POP3S));
  /** Ease that overshoots its goal by `over` and settles: 0 -> 1 + over (at `peak` of the way) -> 1. */
  const overshoot = (u, over = 0.06, peak = 0.72) => {
    const x = clamp(u);
    if (x < peak) return (1 + over) * E.ease.cubic.out(x / peak);
    return 1 + over * (1 - E.ease.sine.inOut((x - peak) / (1 - peak)));
  };

  /**
   * Soft sponge region given in its plane's coordinates: box [x0, y0, x1, y1], depth(x, y) -> 0..1 inside
   * the shape, layers with maskFn / shadeFn in the same coordinates (the world builder's helper, rebuilt
   * here because world.js does not export it). k > 1 bakes it oversampled.
   * -> { painted, box, draw(ctx, opts) }  — draws at its own place.
   */
  function field({ box, depth, layers, seed, edge = 0.5, reveal = {}, k = 1 }) {
    const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0;
    const spec = {
      w, h, seed, edgeSoftness: edge, anchor: [0, 0], reveal,
      shapeFn: (x, y) => depth(x + x0, y + y0),
      layers: layers.map((l) => ({
        ...l,
        maskFn: l.maskFn ? (x, y) => l.maskFn(x + x0, y + y0) : undefined,
        shadeFn: l.shadeFn ? (x, y) => l.shadeFn(x + x0, y + y0) : undefined,
      })),
    };
    let painted;
    if (k > 1) {
      const c = E.clusterDabs(spec);
      const s = E.surface(c.w, c.h, E.res * k);
      E.paintLayered(s, c.dabs, c.dabs.meta);
      painted = E.Painted.fromSurface(s, { ax: 0, ay: 0, w: c.w, h: c.h, seed, steps: reveal.steps ?? 4, reveal });
    } else painted = E.makeCluster(spec);
    return { painted, box, draw: (ctx, o) => painted.draw(ctx, x0, y0, o) };
  }

  /** Polygon of a symmetric bezier profile: P = 4 control points [halfWidth, height] from the base corner to the apex. */
  const profilePts = (cx, baseY, P, n = 26) => {
    const half = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n, u = 1 - s;
      const b = [u * u * u, 3 * u * u * s, 3 * u * s * s, s * s * s];
      half.push([b[0] * P[0][0] + b[1] * P[1][0] + b[2] * P[2][0] + b[3] * P[3][0], b[0] * P[0][1] + b[1] * P[1][1] + b[2] * P[2][1] + b[3] * P[3][1]]);
    }
    return [...half.map(([hw, hh]) => [cx + hw, baseY - hh]), ...half.slice(0, -1).reverse().map(([hw, hh]) => [cx - hw, baseY - hh])];
  };

  /** Crescent (horns up) as polygon points; R = outer radius. */
  const crescentPts = (cx, cy, R) => {
    const a0 = (-52 * Math.PI) / 180, a1 = (232 * Math.PI) / 180;
    const tip = [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R];
    const icy = cy - R * 0.46, ir = Math.hypot(tip[0] - cx, tip[1] - icy);
    const b0 = Math.atan2(tip[1] - icy, tip[0] - cx), b1 = Math.PI - b0;
    const pts = [];
    for (let i = 0; i <= 24; i++) { const a = lerp(a0, a1, i / 24); pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
    for (let i = 0; i <= 24; i++) { const b = lerp(b1, b0, i / 24); pts.push([cx + Math.cos(b) * ir, icy + Math.sin(b) * ir]); }
    return pts;
  };

  return { TL, L, fps, ft, on, nf, prog, count, kf, pop3, pop3s, overshoot, field, profilePts, crescentPts };
}
