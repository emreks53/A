// give.js — THE HOUR IS GIVEN (act 2, 22.57–23.67; client round: «seccadeye at» is figurative).
//
// He stands in prayer, the cupped hands close before his chest, the gold hour in his right hand. Nothing is thrown and
// nothing lands anywhere:
//
//   22.57 / 22.67 / 22.77 / 22.87   the hour lifts 7 px off his palm and is DABBED OUT in four passes (the sponge takes
//                   a quarter of it each time, from the top down); behind what is left a soft gold light is printed,
//                   and with every pass two soft dabs of light are born where the paint has just gone — eight in all
//   22.57 → 23.67   they rise: slowly at first, like breath, then drawn toward the FAR LIGHT (the true future) above
//                   the mescid, in a loose, gently curving stream — up past the dial, over to the right, BEHIND the
//                   minaret and into the light, where they are seen in gold on the white and melt into it. They
//                   grow smaller as they go (it is far away). The first one touches the light's flank on 23.23
//                   (frame 697: the far light swells, light.js); the last is dabbed out on 23.67 (frame 710)
//
// The dabs speak the call-ring's and the light-beads' language: a white-gold sponge dab with a porous warm fringe.
// Everything is a pure function of absolute time. Slots: `hands` (what is left of the coin, behind his fingers),
// `front` (the dabs near him), `mid` before the minaret (the dabs that have gone behind it).

export function makeGive(E, W, U, acting, dial) {
  const L = W.layout, fps = L.fps, { clamp, lerp, smoothstep: ss } = E;
  const { TL: T, kf } = U;
  const once = (k, f) => E.once('act2/give/' + k, f);
  const K2 = acting.K2;
  const PASS = T.coin.give.map((ts) => L.fr(ts));                           // 677, 680, 683, 686
  const F0 = PASS[0], F_REACH = L.fr(T.coin.reach);                         // 677, 697
  const coinAtFrame = (f) => { const h = acting.held(f / fps); return [h.x, h.y]; };

  // ------------------------------------------------------------------ the stream's spine (world px, plane 1.0)
  // from the coin (pose rework: it now stands close before him, centre ~(633, 788) — 60 px right of his head's edge):
  // straight up past his head (breath), then bending over to the right in one long curve — clear of the dial's bead
  // ring, behind the minaret just under its cap (x 858–886, y ~398) and into the white core, left of its middle
  const C0 = coinAtFrame(F0);
  const END = [1030, 324];                                                  // (the core's centre is at ~(1035, 316) on this plane)
  const spine = E.curve([C0, [C0[0] + 5, C0[1] - 60], [C0[0] + 20, C0[1] - 118], [C0[0] + 50, C0[1] - 174], [C0[0] + 94, C0[1] - 219], [772, 524], [826, 462], [878, 398], [950, 350], END], { tension: 0.5 });
  const LEN = spine.length;
  const at = (s) => spine.at(clamp(s / LEN));
  const sWhere = (pred) => { for (let s = 0; s <= LEN; s += 2) if (pred(at(s))) return s; return LEN; };
  const S_BEHIND = sWhere((q) => q[0] >= 812);                              // from here on a dab is drawn BEHIND the minaret (pure sky on both layers here)
  const S_FLANK = sWhere((q) => q[0] >= 842);                               // the far light's flank: the first dab is here on 23.23
  const S_SWAP = sWhere((q) => q[0] >= 872);                                // hidden behind the minaret's shaft: from here on it is painted GOLD (below)
  const S_FADE = LEN - 62, S_GONE = LEN - 14;                               // dabbed out inside the core, in three quick steps

  // ------------------------------------------------------------------ the eight dabs
  // [pass, birth offset from the coin's centre (where the paint has just gone: top first), white core r, frames to the
  //  flank, slow-start a (frames), its side of the spine (px, + = toward the mescid), sway amplitude px, sway phase]
  // The two of a pass travel side by side, one a little ahead: a loose ribbon about 40 px wide, never a string of beads.
  // The later ones are drawn in a little faster (the light takes them): 20 frames to the flank for the first, 17 for the last pair.
  const DABS = [
    [0, [-8, -13], 22, 20.0, 15, -9, 6, 0.4], [0, [11, -8], 17, 21.2, 17, 13, 7, 2.6],
    [1, [10, -1], 21, 19.4, 14, 12, 6, 4.1], [1, [-12, 2], 16, 20.4, 16, -13, 8, 1.2],
    [2, [-3, 9], 20, 18.4, 14, -8, 7, 5.3], [2, [11, 11], 17, 19.3, 16, 15, 6, 3.3],
    [3, [3, 13], 18, 17.0, 13, 9, 6, 0.9], [3, [-9, 12], 15, 17.8, 15, -12, 7, 2.0],
  ].map(([pass, off, r, n, a, side, sway, ph], i) => ({ i, born: PASS[pass], off, r, a, side, sway, ph, V: (S_FLANK * (n + a)) / (n * n), from: coinAtFrame(PASS[pass]) }));
  /** distance travelled along the spine, tau frames after birth: from rest, quadratic at first, then at V px a frame */
  const travel = (d, tau) => (d.V * tau * tau) / (tau + d.a);
  function dabAt(d, f) {
    const tau = f - d.born;
    if (tau < -1e-6) return null;
    const s = travel(d, tau);
    if (s >= S_GONE) return null;
    const q = at(s), q2 = at(Math.min(LEN, s + 3)), nx = -(q2[1] - q[1]) / 3, ny = (q2[0] - q[0]) / 3;
    const own = 1 - ss(0, 150, s);                                          // it leaves from its own place in the coin and joins the stream
    const w = (d.side + d.sway * Math.sin(d.ph + 0.27 * tau)) * ss(10, 110, s) * (1 - 0.7 * ss(S_FLANK - 40, S_FADE + 40, s));
    return {
      x: q[0] + (d.from[0] + d.off[0] - C0[0]) * own + nx * w, y: q[1] + (d.from[1] + d.off[1] - C0[1]) * own + ny * w, s,
      scale: kf(tau, [[0, 0.4], [1, 0.58], [2, 0.73], [3, 0.85], [4, 0.94], [6, 1]]) * (1 - 0.3 * ss(120, S_FLANK + 60, s)) * (1 - 0.3 * ss(S_SWAP + 40, S_GONE, s)),
      p: s < S_FADE ? 1 : s < S_FADE + 22 ? 2 / 3 : s < S_FADE + 42 ? 1 / 3 : 0,
      gold: s >= S_SWAP,
      rot: d.ph + 0.02 * tau,
    };
  }

  // ------------------------------------------------------------------ sprites
  const A = once('all', () => {
    const a = {};
    // what is left of the coin: the same coin, as one print, taken off through a sponge mask in four passes — from the
    // top down with a good deal of chance in it (rank 0 = the last print to go)
    a.coin = E.bakeSprite({
      bounds: [-40, -40, 40, 40], anchor: [0, 0], seed: 2601, density: 2,
      reveal: { steps: 4, mode: 'mask', dab: 20, order: (x, y, rng) => clamp(0.5 * (1 - y / 80) + 0.5 * rng.next()) },
      draw: (c) => dial.drawCoin(c, 0, 0, { k: K2, rim: 1 }),
    });
    // the soft gold light it turns into (behind what is left of it): a powdery warm print, pale in the middle
    a.glow = E.makeCluster({
      points: [{ x: 0, y: 0, r: 40 }, { x: -9, y: 7, r: 27 }, { x: 10, y: -8, r: 26 }], seed: 2602, edgeSoftness: 0.6, anchor: [0, 0],
      reveal: { steps: 3, mode: 'mask', order: 'random', dab: 22 },
      layers: [
        { color: '#EDB442', coverage: 0.42, size: 13, stamps: 'open', pores: 0.3, tint: 0.03 },
        { color: '#F3C95A', coverage: 0.74, size: 14, band: [0.12, 1], stamps: 'body', pores: 0.3 },
        { color: '#F8DC78', coverage: 0.9, size: 13, band: [0.3, 1], stamps: 'body', pores: 0.2 },
        { color: '#FBEDB4', coverage: 0.9, size: 12, band: [0.48, 1], stamps: 'body', pores: 0 },
        { color: '#FFF6D8', coverage: 0.8, size: 10, band: [0.68, 1], stamps: 'body', tints: 1, pores: 0 },
      ],
    });
    // the dabs of light: a broad white core in pale gold, a porous fringe of deeper gold prints, a smaller puff
    // off-centre (never a drawn ring). On the day sky and the deep sky the white draws them, on the light's white the
    // gold fringe does — until they are dabbed out in it.
    a.dabs = DABS.map((d) => {
      const r = d.r, g = r / 17;
      return E.makeCluster({
        points: [{ x: 0, y: 0, r: r / 0.74 }, { x: [-4, 3, -3, 4, -3, 3, 4, -3][d.i] * g, y: [3, 4, -4, 3, 4, -3, 3, 3][d.i] * g, r: r * 0.72 }],
        seed: 2610 + d.i, edgeSoftness: 0.45, anchor: [0, 0],
        reveal: { steps: 3, mode: 'mask', order: 'random', dab: Math.round(r * 1.1) },
        layers: [
          { color: '#EDB442', coverage: 0.62, size: 11 * g, stamps: 'open', pores: 0.3, tint: 0.03 },
          { color: '#F3C95A', coverage: 0.74, size: 10.5 * g, band: [0.04, 1], stamps: 'body', pores: 0.3 },
          { color: '#F6D46C', coverage: 0.92, size: 11 * g, band: [0.1, 1], stamps: 'dense', tint: 0.02, pores: 0 },
          { color: '#FBEDB4', coverage: 0.92, size: 10.5 * g, band: [0.18, 1], stamps: 'body', pores: 0 },
          { color: '#FFF8E2', coverage: 0.95, size: 10 * g, band: [0.3, 1], stamps: 'body', tints: 1, pores: 0 },
          { color: '#FFFFFF', coverage: 0.7, size: 8 * g, band: [0.56, 1], stamps: 'body', tints: 1, pores: 0 },
        ],
      });
    });
    // … and the same dabs as they are seen INSIDE the far light, beyond the minaret: on the core's white a white dab
    // is nothing, so there the light of the hour is painted in its gold (as the minting's glints are carried by a
    // gold under-dab) — the far light's own gold: a gold fringe, a pale-gold body, a pale heart — growing smaller, and
    // dabbed out as it melts into the white.
    // The swap happens while the dab is behind the minaret's shaft.
    a.gold = DABS.map((d) => {
      const r = d.r, g = r / 17;
      return E.makeCluster({
        points: [{ x: 0, y: 0, r: r / 0.8 }, { x: [-4, 3, -3, 4, -3, 3, 4, -3][d.i] * g, y: [3, 4, -4, 3, 4, -3, 3, 3][d.i] * g, r: r * 0.7 }],
        seed: 2630 + d.i, edgeSoftness: 0.45, anchor: [0, 0],
        reveal: { steps: 3, mode: 'mask', order: 'random', dab: Math.round(r * 1.1) },
        layers: [
          { color: '#EDB442', coverage: 0.5, size: 11 * g, stamps: 'open', pores: 0.3, tint: 0.03 },
          { color: '#F3C95A', coverage: 0.86, size: 10.5 * g, band: [0.05, 1], stamps: 'body', pores: 0.25 },
          { color: '#F8DC78', coverage: 0.92, size: 11 * g, band: [0.24, 1], stamps: 'dense', tint: 0.02, pores: 0 },
          { color: '#FBEDB4', coverage: 0.88, size: 10 * g, band: [0.5, 1], stamps: 'body', pores: 0 },
          { color: '#FFF6D8', coverage: 0.7, size: 8 * g, band: [0.74, 1], stamps: 'body', tints: 1, pores: 0 },
        ],
      });
    });
    return a;
  });

  // ------------------------------------------------------------------ draw
  /** slot `hands`: the soft gold light and what is left of the coin (22.57–22.97), behind his fingers */
  function drawHands(ctx, t) {
    const f = t * fps, n = f - F0;
    if (n < -1e-6 || n >= 12 - 1e-6) return;
    const [x, y] = coinAtFrame(Math.min(f, PASS[3]));
    // the light: printed with the first pass, whole with the second, thinning once the coin is gone (22.87), gone 22.97
    const gp = n < 3 - 1e-6 ? 2 / 3 : n < 9 - 1e-6 ? 1 : n < 10.5 - 1e-6 ? 2 / 3 : 1 / 3;
    const gs = kf(n, [[0, 0.72], [1, 0.84], [3, 0.92], [4, 1], [9, 1], [11, 0.86]]);
    A.glow.draw(ctx, x, y, { p: gp, scale: gs });
    const coin = dial.coinAt(t);
    if (coin && coin.given) A.coin.draw(ctx, coin.x, coin.y, { p: 1 - coin.given / 4 });
  }
  const drawDabs = (ctx, t, behind) => {
    const f = t * fps;
    if (f < F0 - 1e-6) return;
    for (const d of DABS) {
      const q = dabAt(d, f);
      if (!q || q.p <= 0 || (q.s >= S_BEHIND) !== behind) continue;
      (q.gold ? A.gold : A.dabs)[d.i].draw(ctx, q.x, q.y, { scale: q.scale, p: q.p, rot: q.rot });
    }
  };
  /** slot `front`: the dabs while they are near him */
  const drawFront = (ctx, t) => drawDabs(ctx, t, false);
  /** slot `mid`, before the minaret: the dabs that have gone behind it, into the far light */
  const drawMid = (ctx, t) => drawDabs(ctx, t, true);

  return { drawHands, drawFront, drawMid, dabAt, DABS, spine, at, frames: { F0, F_REACH, PASS }, S: { LEN, S_BEHIND, S_FLANK, S_SWAP, S_FADE, S_GONE }, sprites: A };
}
