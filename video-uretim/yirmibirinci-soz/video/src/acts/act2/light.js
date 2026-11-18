// light.js — the TRUE FUTURE: pure soft light in a deepened sky (far slot, parallax 0.7, LAYER px), the five
// light-beads that step down from it (mid slot, world px) and the cream COVER that grows out of it (top slot,
// frame px).
//
//   16.63 / 16.73 / 16.83   the deep cool sky round the place of the light cross-dabs in from the ground up
//   16.83 / 16.93 / 17.00 / 17.07   the light in four passes: broad peach, gold, the dense white core, pink rim
//   17.07 ->                it only breathes (2 % over 3 s); a few specks rise in it
//   17.80 … 18.20           five light-beads step down to the plateau (on threes)
//   23.10                   LINK 3: the light swells by one pass and stays swelled
//   23.40 … 23.70           the cover: 15 / 40 / 65 / 85 % (frame 714 = the bare primer plate, drawn by the scene)
//
// The light is a tall, soft POINTED ARCH (it rhymes with lock plate, doorway and mihrab): no disc, no rays, no
// hard edge. A matte wall has no glow, so it is painted against a sky that is first deepened round it.

export function makeLight(E, W, U) {
  const L = W.layout, P = L.pal, { clamp, lerp, smoothstep: ss } = E;
  const { TL: T, ft, on, nf, kf, pop3, field } = U;
  const F = L.farLight, B = F.layer_bbox, S = F.surround.layer_bbox;
  const once = (k, f) => E.once('act2/light/' + k, f);
  const PAR = W.planes?.far ?? F.parallax;

  // ------------------------------------------------------------------ the arch (layer px)
  const CX = F.layer_core_centre[0], CY = F.layer_core_centre[1];           // 965, 300
  const HW = (B.x1 - B.x0) / 2, APEX = B.y0, BASE = B.y1;                    // 200, 60, 1150
  const RAD = 2 * HW, SPRING = APEX + Math.sqrt(RAD * RAD - (RAD - HW) ** 2); // equilateral pointed arch: springs at y ~406
  const halfW = (y) => (y <= APEX ? 0 : y < SPRING ? Math.sqrt(RAD * RAD - (SPRING - y) ** 2) - (RAD - HW) : HW + (y - SPRING) * 0.035);
  const wob = (x, y) => 10 * Math.sin(y / 71 + 1.3) + 6 * Math.sin(y / 29 + x / 90);
  /** signed distance to the arch's edge (px, < 0 inside) — horizontal below the apex, radial above it */
  const sd = (x, y) => (y >= APEX ? Math.abs(x - CX) - halfW(y) : Math.hypot(x - CX, APEX - y)) + wob(x, y);
  // the white core: a smaller pointed arch round (965, 300), y 180–420, dissolving downward into the gold
  const C0 = F.in_ACT2_screen.core_y[0] - 4, C1 = F.in_ACT2_screen.core_y[1], CHW = (F.in_ACT2_screen.core_x[1] - F.in_ACT2_screen.core_x[0]) / 2;
  const coreArch = (k) => {
    const hw = CHW * k, rad = 2 * hw, apex = CY - (CY - C0) * k, spring = apex + Math.sqrt(rad * rad - (rad - hw) ** 2), foot = CY + (C1 - CY) * k;
    return (x, y) => {
      const w = y <= apex ? -1 : y < spring ? Math.sqrt(rad * rad - (spring - y) ** 2) - (rad - hw) : hw;
      return clamp(Math.min((w - Math.abs(x - CX) + 4 * Math.sin(y / 23)) / 24, (foot - y) / 44));
    };
  };

  const rFar = L.visibleRect(PAR, 30, ['ACT2', 'ACT2_TAIL']);
  const SBOX = [S.x0 - 30, Math.min(S.y0, rFar[1]) - 10, Math.max(S.x1, rFar[2]) + 10, BASE + 14];
  const LBOX = [B.x0 - 70, APEX - 60, B.x1 + 70, BASE + 14];
  const tf = P('true_future'), sur = P('true_future_surround');

  const A = once('all', () => {
    const a = {};
    // --- the deepened sky: lavender far out, violet-blue near the light, a rim of indigo right at its edge,
    //     cobalt prints at the outside so that it melts into the day sky
    const sDepth = (x, y) => clamp(Math.min(1 - sd(x, y) / 250, (x - S.x0 + 20 + 16 * Math.sin(y / 97)) / 110, (BASE + 30 - y) / 60));
    a.surround = field({ box: SBOX, depth: sDepth, seed: 2301, edge: 0.62, k: 1,
      reveal: { steps: 3, mode: 'mask', order: 'sweep', angle: -Math.PI / 2, jitter: 0.18, dab: 170 },
      layers: [
        { color: sur[0], coverage: 0.86, size: 136, tint: 0.035, pores: 0.3, patch: { scale: 300, amount: 0.2, sharp: 0.4 } },
        { color: sur[2], coverage: 0.4, size: 104, sizeJitter: 0.18, stamps: 'dense', even: true, pores: 0.3, maskFn: (x, y) => ss(60, 190, sd(x, y)), patch: { scale: 320, amount: 0.4, sharp: 0.3 } },
        { color: sur[1], coverage: 0.86, size: 118, tint: 0.04, pores: 0.3, maskFn: (x, y) => ss(170, 70, sd(x, y)), patch: { scale: 260, amount: 0.16 } },
        { color: '#6A63A8', coverage: 0.6, size: 86, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(84, 24, sd(x, y)), patch: { scale: 200, amount: 0.3 } },
        { color: '#5A5598', coverage: 0.3, size: 60, stamps: 'open', maskFn: (x, y) => ss(46, 6, sd(x, y)) * ss(-60, -10, sd(x, y)), patch: { scale: 150, amount: 0.5 } },
        { color: P('primer'), coverage: 0.05, size: 60, stamps: 'soft', maskFn: (x, y) => ss(120, 220, sd(x, y)) },
      ] });

    // --- pass 1 (16.83): broad peach, deepening to rose and pink toward its foot (no white, no pale gold below y 600)
    const d1 = (x, y) => clamp((-sd(x, y) + 16) / 74);
    a.peach = field({ box: LBOX, depth: d1, seed: 2302, edge: 0.6, reveal: { steps: 1 }, layers: [
      { color: tf.peach, coverage: 0.92, size: 116, tint: 0.03, pores: 0.3 },
      { color: '#F8D7AE', coverage: 0.5, size: 86, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(640, 420, y), patch: { scale: 200, amount: 0.36 } },
      { color: '#F1B39A', coverage: 0.66, size: 100, pores: 0.3, maskFn: (x, y) => ss(560, 800, y), patch: { scale: 220, amount: 0.22 } },
      { color: tf.rim_pink, coverage: 0.4, size: 90, stamps: 'open', pores: 0.3, maskFn: (x, y) => ss(700, 1000, y), patch: { scale: 200, amount: 0.4 } },
    ] });
    // --- pass 2 (16.93): gold inside it, round the place of the core
    const d2 = (x, y) => clamp(Math.min((-sd(x, y) - 36) / 64, (720 - y) / 230));
    a.gold = field({ box: LBOX, depth: d2, seed: 2303, edge: 0.6, reveal: { steps: 1 }, layers: [
      { color: tf.gold, coverage: 0.9, size: 96, tint: 0.03, pores: 0.3 },
      { color: '#FBEDB4', coverage: 0.6, size: 72, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(-70, -120, sd(x, y)) * ss(560, 440, y), patch: { scale: 150, amount: 0.3 } },
      { color: '#F6C56A', coverage: 0.2, size: 60, stamps: 'open', maskFn: (x, y) => ss(480, 640, y), patch: { scale: 150, amount: 0.5 } },
    ] });
    // --- pass 3 (17.00): the white core, dense (no primer gaps)
    a.core = field({ box: [CX - CHW - 50, C0 - 50, CX + CHW + 50, C1 + 40], depth: coreArch(1), seed: 2304, edge: 0.5, reveal: { steps: 1 }, layers: [
      { color: tf.core, coverage: 0.99, size: 60, even: true, tints: 2, tint: 0.01, pores: 0 },
      { color: tf.core, coverage: 0.94, size: 42, tints: 2, tint: 0.01, pores: 0 },
      { color: '#FFF6D8', coverage: 0.16, size: 30, stamps: 'soft', maskFn: (x, y) => ss(CY, C1, y) },
    ] });
    // --- pass 4 (17.07), the brightest: a pink rim along the arch's edge and a breath of pale light round the core
    const band = (x, y) => clamp(1 - Math.abs(sd(x, y) + 8) / 34);
    a.rim = field({ box: LBOX, depth: (x, y) => band(x, y) * ss(BASE, BASE - 120, y), seed: 2305, edge: 0.8, reveal: { steps: 1 }, layers: [
      { color: tf.rim_pink, coverage: 0.56, size: 66, stamps: 'open', pores: 0.3, patch: { scale: 150, amount: 0.3 } },
      { color: '#F7C6D2', coverage: 0.3, size: 40, stamps: 'soft', patch: { scale: 120, amount: 0.4 } },
    ] });
    const halo = coreArch(1.42);
    a.halo = field({ box: [CX - CHW * 1.5 - 50, C0 - 130, CX + CHW * 1.5 + 50, C1 + 150], depth: (x, y) => halo(x, y) * (1 - coreArch(1)(x, y) * 0.999), seed: 2306, edge: 0.8, reveal: { steps: 1 }, layers: [
      { color: '#FFF6D8', coverage: 0.5, size: 50, stamps: 'body', pores: 0.3, patch: { scale: 110, amount: 0.3 } },
      { color: tf.core, coverage: 0.3, size: 34, stamps: 'open' },
    ] });
    // --- the swell (23.10): the core one pass larger, pale light further out — the cover grows from here
    const big = coreArch(1.34), bigger = coreArch(1.8);
    a.swell = field({ box: [CX - CHW * 1.9 - 60, C0 - 230, CX + CHW * 1.9 + 60, C1 + 250], depth: (x, y) => Math.max(big(x, y), bigger(x, y) * 0.6), seed: 2307, edge: 0.7, reveal: { steps: 1 }, layers: [
      { color: '#FFF6D8', coverage: 0.5, size: 60, stamps: 'body', pores: 0.3, maskFn: (x, y) => 1 - big(x, y), patch: { scale: 120, amount: 0.3 } },
      { color: tf.core, coverage: 0.97, size: 56, tints: 2, tint: 0.01, pores: 0, maskFn: (x, y) => ss(0.2, 0.7, big(x, y)) },
      { color: tf.core, coverage: 0.3, size: 34, stamps: 'open', maskFn: (x, y) => 1 - big(x, y) },
    ] });
    // --- a few specks that rise in the light
    a.specks = E.makeSpecks({ seed: 2308, count: 9, bounds: [CX - 150, APEX + 30, 300, 620], colors: [tf.core, '#FBEDB4', '#F7C6D2', tf.core],
      size: [6, 10], speed: [9, 17], angle: -Math.PI / 2, spread: 0.22, wobble: 9, twinkle: 0.3, edgeFade: 90 });

    // --- light-beads: warm-white stencil dots with a 4 px brick rim (the same dots as the course of the days)
    const LB = L.lightBeads.from_glow_to_chest;
    a.beads = LB.r.map((r, i) => {
      const rimS = E.bakeStencil({ shape: E.shape.ellipse(0, 0, r), base: P('light_bead_rim'), anchor: [0, 0], seed: 2310 + i, bleed: false,
        layers: [{ color: '#8E3F2A', coverage: 0.3, size: 16, stamps: 'open' }, { color: '#C9785A', coverage: 0.3, size: 12, stamps: 'body', maskFn: (x, y) => ss(-2, 5, x - y) }] });
      const inner = E.bakeStencil({ shape: E.shape.ellipse(0, 0, r - 4), base: P('light_bead'), anchor: [0, 0], seed: 2320 + i, bleed: false,
        layers: [{ color: '#FBEDB4', coverage: 0.3, size: 12, stamps: 'body', maskFn: (x, y) => ss(2, -5, x - y) }, { color: '#FFFFFF', coverage: 0.3, size: 10, stamps: 'soft', tints: 1 }] });
      return E.bakeSprite({ bounds: [-r - 3, -r - 3, r + 3, r + 3], anchor: [0, 0], seed: 2330 + i, density: 2, draw: (c) => { rimS.draw(c, 0, 0); inner.draw(c, 0, 0); } });
    });
    return a;
  });

  // ------------------------------------------------------------------ far slot (layer px)
  const breath = (t) => L.motion.farLightBreath(t);
  function drawFar(ctx, t) {
    const sp = L.count(t, T.turn) / T.turn.length;
    if (sp <= 0) return;
    A.surround.draw(ctx, { p: sp });
    const n = L.count(t, T.light);
    if (!n) return;
    ctx.save();
    const s = breath(t);
    ctx.translate(CX, CY); ctx.scale(s, s); ctx.translate(-CX, -CY);
    A.peach.draw(ctx);
    if (n >= 2) A.gold.draw(ctx);
    if (n >= 4) A.rim.draw(ctx);
    if (n >= 4) A.halo.draw(ctx);
    if (n >= 3) A.core.draw(ctx);
    if (on(t, T.swell)) A.swell.draw(ctx);
    ctx.restore();
    if (n >= 4) A.specks.draw(ctx, t, { alpha: E.tween(t, ft(T.light[3]), ft(T.light[3]) + 0.5, 0, 0.9, E.ease.sine.inOut) });
  }

  // ------------------------------------------------------------------ light-beads (mid slot, world px)
  const LB = L.lightBeads.from_glow_to_chest;
  const mAt = (t) => ({ body: on(t, T.chest.body[0]), dome: on(t, T.morph.m1[0]) });
  function drawBeads(ctx, t) {
    if (!on(t, T.lbeads[0]) || on(t, 20.10)) return;
    const { body, dome } = mAt(t);
    LB.ys.forEach((y, i) => {
      const n = nf(t, T.lbeads[i]);
      if (n < -1e-6) return;
      let sc = pop3(n), dy = 0;
      if (i >= 2 && body) {
        // beads 3–5 are taken into the chest as its body is printed (18.27): they sink into it and are gone
        const k = clamp(nf(t, T.chest.body[0]) / 2);
        if (i > 2 || k >= 1) return;
        sc *= 1 - 0.7 * k; dy = 46 * k * k;
      } else if (i < 2 && dome) {
        // beads 1 and 2 are taken into the rising dome (19.97–20.10)
        const k = clamp(nf(t, T.morph.m1[0]) / 4);
        if (k >= 1) return;
        sc *= 1 - 0.8 * k; dy = (i ? 30 : 46) * k * k;
      }
      // a breath of life: each bead floats a pixel or two on its own phase
      const bob = 1.6 * Math.sin(t * 1.9 + i * 1.3);
      A.beads[i].draw(ctx, LB.x, y + dy + bob, { scale: sc });
    });
  }

  // ------------------------------------------------------------------ the cream cover (top slot, FRAME px)
  // The bare primer wall seen through an ordered mask of big sponge prints that grows out of the light's core
  // (screen 802, 256). Mask stages are even in area, so p = 0.15 / 0.40 / 0.65 / 0.85 IS the covered share.
  // The order is a soft super-ellipse round the core (taller than wide, slower toward the left), so that the
  // right column goes first and the man and his dial last. At the core the first two passes are warm white.
  const O = L.sb.endcard.cover.origin_screen;                                // [802, 256]
  const COVER_STEPS = 20;
  const coverKey = (x, y, rng) => {
    const dx = x < O[0] ? (O[0] - x) * 1.4 : (x - O[0]) * 0.8, dy = y > O[1] ? (y - O[1]) / 2.6 : (O[1] - y);
    return clamp(Math.pow(dx ** 4 + dy ** 4, 0.25) / 1130 * 0.9 + rng.next() * 0.07);
  };
  const cover = once('cover', () => {
    const c = {};
    c.wall = E.Painted.fromSurface(W.wall, { ax: 0, ay: 0, seed: 2390, steps: COVER_STEPS, dabSize: 210, reveal: { order: coverKey } });
    const glow = (r, seed) => E.makeCluster({
      points: [{ x: 0, y: 0, r, rx: r * 0.86, ry: r * 1.2 }], anchor: [0, 0], seed, edgeSoftness: 0.75, reveal: { steps: 2, mode: 'mask', order: 'radial', from: [0, 0] },
      layers: [
        { color: '#FFF6D8', coverage: 0.5, size: r * 0.5, stamps: 'body', pores: 0.3 },
        { color: tf.core, coverage: 0.93, size: r * 0.46, tints: 2, tint: 0.01, pores: 0.3, band: [0.3, 1] },
      ],
    });
    c.white = [glow(210, 2391), glow(330, 2392)];
    return c;
  });
  const coverStage = (t) => L.count(t, T.cover);                              // 0 … 4 inside act 2 (5 = the plate)
  function drawCover(ctx, t) {
    const k = coverStage(t);
    if (!k) return;
    cover.wall.draw(ctx, 0, 0, { p: T.coverPct[k - 1] });
    // warm white at the core, thinning to the cream of the wall within the first passes
    if (k === 1) cover.white[0].draw(ctx, O[0], O[1]);
    else if (k === 2) cover.white[1].draw(ctx, O[0], O[1]);
    else if (k === 3) cover.white[1].draw(ctx, O[0], O[1], { p: 0.5 });
  }

  return { drawFar, drawBeads, drawCover, coverStage, sprites: A, cover, geometry: { CX, CY, sd, halfW } };
}
