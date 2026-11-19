// light.js — the TRUE FUTURE: pure soft light in a deepened sky (far slot, parallax 0.7, LAYER px), the five
// light-beads that step down from it (mid slot, world px) and the cream COVER that grows out of it (top slot,
// frame px).
//
//   16.63 / 16.73 / 16.83   the deep cool sky round the place of the light cross-dabs in from the ground up
//   16.83 / 16.93 / 17.00 / 17.07   the light in four passes: broad peach, gold, the dense white core, pink rim
//   17.07 ->                it only breathes (2 % over 3 s); a few specks rise in it
//   17.80 … 18.20           five light-beads step down to the plateau (on threes)
//   23.23                   LINK 3: the light swells by one pass and stays swelled
//   23.40 … 23.70           the cover: four coats of sponge prints growing out of the core (frame 714 = the bare primer plate)
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
  // (the body narrows a little toward its foot: a flame / almond rather than a door-shaped slab)
  const halfW = (y) => (y <= APEX ? 0 : y < SPRING ? Math.sqrt(RAD * RAD - (SPRING - y) ** 2) - (RAD - HW) : HW * (1 - 0.1 * ss(SPRING + 60, 1000, y)));
  // the outline wobbles, and not the same way on both sides: the left shoulder bulges low, the right one is
  // dented high and bulges further down — a cluster of sponge prints, never a drawn arch
  const wob = (x, y) => 13 * Math.sin(y / 71 + 1.3) + 7 * Math.sin(y / 29 + x / 90) + 9 * Math.sin(y / 173 + (x > CX ? 2.2 : 0.4))
    + (x < CX ? -20 * Math.exp(-(((y - 340) / 80) ** 2)) + 12 * Math.exp(-(((y - 200) / 50) ** 2)) : 18 * Math.exp(-(((y - 235) / 60) ** 2)) - 22 * Math.exp(-(((y - 455) / 90) ** 2)));
  /** signed distance to the arch's edge (px, < 0 inside) — horizontal below the apex, radial above it */
  const sd = (x, y) => (y >= APEX ? Math.abs(x - CX) - halfW(y) : Math.hypot(x - CX, APEX - y)) + wob(x, y);
  // a few prints ESCAPE the shoulders into the deep sky ([dx from the axis, y, r]): the contour is broken, no doorway
  const ESC = [[-200, 212, 25], [-246, 322, 19], [-130, 112, 20], [204, 196, 23], [250, 318, 20], [122, 100, 17], [-262, 486, 18], [258, 560, 21], [-18, 16, 16]];
  const sdE = (x, y) => { let d = sd(x, y); for (const [ex, ey, er] of ESC) { const v = Math.hypot(x - CX - ex, y - ey) - er; if (v < d) d = v; } return d; };
  // the white core: a pointed ALMOND round (965, 300), y 180–420 — pointed above, rounded below, its edge pure speckle
  const C0 = F.in_ACT2_screen.core_y[0] - 4, C1 = F.in_ACT2_screen.core_y[1], CHW = (F.in_ACT2_screen.core_x[1] - F.in_ACT2_screen.core_x[0]) / 2;
  const coreArch = (k, soft = 34) => {
    const hw = CHW * k, rad = 2 * hw, apex = CY - (CY - C0) * k, spring = apex + Math.sqrt(rad * rad - (rad - hw) ** 2), foot = CY + (C1 - CY) * k + 26 * k;
    return (x, y) => {
      const w = y <= apex ? -1 : y < spring ? Math.sqrt(rad * rad - (spring - y) ** 2) - (rad - hw) : y < foot ? hw * Math.sqrt(1 - ((y - spring) / (foot - spring)) ** 2) : -1;
      return clamp((w - Math.abs(x - CX) + 5 * Math.sin(y / 23) + 4 * Math.sin(x / 17 + y / 41)) / soft);
    };
  };

  const rFar = L.visibleRect(PAR, 30, ['ACT2', 'ACT2_TAIL']);
  const SBOX = [S.x0 - 30, Math.min(S.y0, rFar[1]) - 10, Math.max(S.x1, rFar[2]) + 10, BASE + 14];
  const LBOX = [B.x0 - 70, APEX - 60, B.x1 + 70, BASE + 14];
  const tf = P('true_future'), sur = P('true_future_surround');
  const LB = L.lightBeads.from_glow_to_chest;
  const LBR = [18, 19, 20, 21, 22], LBY = [430, 494, 566, 648, 736];        // storyboard: r 13–18, y 440 … 740 in even steps

  const A = once('all', () => {
    const a = {};
    // --- the deepened sky: lavender far out, violet-blue near the light, a rim of indigo right at its edge,
    //     cobalt prints at the outside so that it melts into the day sky
    const sDepth = (x, y) => clamp(Math.min(1 - sd(x, y) / 250, (x - S.x0 + 20 + 16 * Math.sin(y / 97)) / 110, (BASE + 30 - y) / 60));
    a.surround = field({ box: SBOX, depth: sDepth, seed: 2301, edge: 0.62, k: 1,
      reveal: { steps: 2, mode: 'mask', order: 'sweep', angle: -Math.PI / 2, jitter: 0.18, dab: 170 },
      layers: [
        { color: sur[0], coverage: 0.86, size: 136, tint: 0.035, pores: 0.3, patch: { scale: 300, amount: 0.2, sharp: 0.4 } },
        { color: sur[2], coverage: 0.4, size: 104, sizeJitter: 0.18, stamps: 'dense', even: true, pores: 0.3, maskFn: (x, y) => ss(60, 190, sd(x, y)), patch: { scale: 320, amount: 0.4, sharp: 0.3 } },
        { color: sur[1], coverage: 0.86, size: 118, tint: 0.04, pores: 0.3, maskFn: (x, y) => ss(170, 70, sd(x, y)), patch: { scale: 260, amount: 0.16 } },
        { color: '#6A63A8', coverage: 0.6, size: 86, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(84, 24, sd(x, y)), patch: { scale: 200, amount: 0.3 } },
        { color: '#5A5598', coverage: 0.3, size: 60, stamps: 'open', maskFn: (x, y) => ss(46, 6, sd(x, y)) * ss(-60, -10, sd(x, y)), patch: { scale: 150, amount: 0.5 } },
        { color: P('primer'), coverage: 0.05, size: 60, stamps: 'soft', maskFn: (x, y) => ss(120, 220, sd(x, y)) },
      ] });

    // --- pass 1 (16.83): broad peach, deepening to rose and pink toward its foot (no white, no pale gold below y 600).
    //     Its inside is a closed coat (a pore that shows the DARK sky inside the light reads as dirt) — but not a
    //     flat one: lighter and deeper peach prints lie in it, and the foot has real pores of pale peach and primer.
    //     Its edge dissolves in a wide stippled frontier, a powdery spray, and a few prints that escape the shoulders.
    const d1 = (x, y) => clamp((-sdE(x, y) + 26) / 104);
    const inner = (a, b) => (x, y) => ss(a, b, sd(x, y));
    const wy = (x, y) => y + 58 * Math.sin((x - CX) / 66 + 0.9) + 26 * Math.sin((x - CX) / 27 + 2.4);   // no tone ever ends on a level line
    a.aura = field({ box: [LBOX[0] - 50, LBOX[1] - 50, LBOX[2] + 50, LBOX[3]], depth: (x, y) => clamp(1 - Math.abs(sdE(x, y) - 12) / 62) * ss(BASE, BASE - 160, y), seed: 2309, edge: 0.9, reveal: { steps: 1 }, layers: [
      { color: tf.rim_pink, coverage: 0.2, size: 44, stamps: 'open', patch: { scale: 130, amount: 0.46 } },
      { color: tf.peach, coverage: 0.2, size: 34, stamps: 'soft', patch: { scale: 110, amount: 0.4 } },
      { color: '#F7C6D2', coverage: 0.08, size: 40, stamps: 'speck' },
    ] });
    a.peach = field({ box: LBOX, depth: d1, seed: 2302, edge: 0.78, reveal: { steps: 1 }, layers: [
      { color: tf.peach, coverage: 0.99, size: 74, even: true, tint: 0.02, pores: 0, maskFn: inner(-44, -78) },
      { color: tf.peach, coverage: 0.92, size: 110, tint: 0.03, pores: 0.3 },
      { color: '#F8D7AE', coverage: 0.5, size: 86, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(660, 420, wy(x, y)) * inner(-30, -70)(x, y), patch: { scale: 200, amount: 0.36 } },
      { color: '#F1B39A', coverage: 0.66, size: 96, stamps: 'body', pores: 0.4, maskFn: (x, y) => ss(540, 800, wy(x, y)) * inner(-34, -74)(x, y), patch: { scale: 220, amount: 0.22 } },
      { color: tf.rim_pink, coverage: 0.4, size: 84, stamps: 'body', pores: 0.4, maskFn: (x, y) => ss(700, 1000, wy(x, y)) * inner(-34, -74)(x, y), patch: { scale: 200, amount: 0.4 } },
      // the foot's second tones and pores: deeper peach in clumps, pale-peach and primer pinholes
      { color: '#EBA487', coverage: 0.3, size: 64, stamps: 'open', pores: 0.3, maskFn: (x, y) => ss(520, 700, wy(x, y)) * inner(-30, -70)(x, y), patch: { scale: 150, amount: 0.44, seed: 12 } },
      { color: '#F9DDB6', coverage: 0.2, size: 44, stamps: 'open', maskFn: (x, y) => ss(500, 640, wy(x, y)) * inner(-30, -70)(x, y), patch: { scale: 120, amount: 0.5, seed: 4 } },
      { color: '#FBE6C0', coverage: 0.1, size: 26, stamps: 'soft', maskFn: (x, y) => ss(480, 620, y) * inner(-24, -60)(x, y) },
      { color: P('primer'), coverage: 0.055, size: 22, stamps: 'soft', maskFn: (x, y) => ss(480, 620, y) * inner(-24, -60)(x, y) },
      { color: tf.rim_pink, coverage: 0.5, size: 60, stamps: 'open', maskFn: inner(-56, -8), patch: { scale: 160, amount: 0.34 } },
    ] });
    // --- pass 2 (16.90): gold inside it, round the place of the core. It INTERLEAVES with the peach: its lower edge
    //     hangs in long tongues (80–120 px into the peach, single prints further), and peach prints rise into it
    const footG = (x) => 742 + 78 * Math.sin((x - CX) / 52 + 0.6) + 36 * Math.sin((x - CX) / 21 + 2.1);
    const d2 = (x, y) => clamp(Math.min((-sd(x, y) - 36) / 64, (footG(x) - y) / 150));
    a.gold = field({ box: LBOX, depth: d2, seed: 2303, edge: 0.7, reveal: { steps: 1 }, layers: [
      { color: tf.gold, coverage: 0.94, size: 96, tint: 0.03, pores: 0.3, band: [0.3, 1] },
      { color: tf.gold, coverage: 0.6, size: 78, stamps: 'body', tint: 0.03, pores: 0.4, band: [0, 0.5] },
      { color: '#FBEDB4', coverage: 0.6, size: 72, stamps: 'body', tint: 0.015, pores: 0.3, maskFn: (x, y) => ss(-70, -120, sd(x, y)) * ss(580, 440, wy(x, y)), patch: { scale: 150, amount: 0.3 } },
      { color: '#F6C56A', coverage: 0.24, size: 60, stamps: 'open', maskFn: (x, y) => ss(470, 640, wy(x, y)), patch: { scale: 150, amount: 0.5 } },
      { color: tf.peach, coverage: 0.3, size: 66, stamps: 'open', pores: 0.3, maskFn: (x, y) => ss(480, 620, wy(x, y)), patch: { scale: 140, amount: 0.46, seed: 21 } },
      { color: '#F8D7AE', coverage: 0.16, size: 44, stamps: 'open', maskFn: (x, y) => ss(440, 600, wy(x, y)), patch: { scale: 120, amount: 0.5, seed: 22 } },
      { color: tf.gold, coverage: 0.1, size: 70, stamps: 'speck', band: [0, 0.3] },
    ] });
    // --- pass 3 (16.97): the white core — dense in its heart (no primer gaps), its edge nothing but prints and powder
    a.core = field({ box: [CX - CHW - 70, C0 - 60, CX + CHW + 70, C1 + 90], depth: coreArch(1), seed: 2304, edge: 0.8, reveal: { steps: 1 }, layers: [
      { color: tf.core, coverage: 0.99, size: 60, even: true, tints: 2, tint: 0.01, pores: 0, band: [0.5, 1] },
      { color: tf.core, coverage: 0.95, size: 44, tints: 2, tint: 0.01, pores: 0, band: [0.3, 1] },
      { color: tf.core, coverage: 0.72, size: 38, stamps: 'body', tints: 2, tint: 0.01, pores: 0.3, band: [0.04, 0.5] },
      { color: tf.core, coverage: 0.14, size: 50, stamps: 'speck', tints: 1, band: [0, 0.3] },
      { color: '#FFF6D8', coverage: 0.16, size: 30, stamps: 'soft', tint: 0.01, maskFn: (x, y) => ss(CY, C1, y) },
    ] });
    // --- with it, the brightest: a pink rim along the arch's edge and a breath of pale light round the core
    const band = (x, y) => clamp(1 - Math.abs(sdE(x, y) + 14) / 48);
    a.rim = field({ box: LBOX, depth: (x, y) => band(x, y) * ss(BASE, BASE - 120, y), seed: 2305, edge: 0.9, reveal: { steps: 1 }, layers: [
      { color: tf.rim_pink, coverage: 0.5, size: 62, stamps: 'open', patch: { scale: 150, amount: 0.3 } },
      { color: '#F7C6D2', coverage: 0.34, size: 40, stamps: 'soft', patch: { scale: 120, amount: 0.36 } },
      { color: '#FBE3C4', coverage: 0.2, size: 30, stamps: 'soft', patch: { scale: 100, amount: 0.5 } },
    ] });
    const halo = coreArch(1.42);
    a.halo = field({ box: [CX - CHW * 1.5 - 50, C0 - 130, CX + CHW * 1.5 + 50, C1 + 190], depth: (x, y) => halo(x, y) * (1 - coreArch(1)(x, y) * 0.999), seed: 2306, edge: 0.8, reveal: { steps: 1 }, layers: [
      { color: '#FFF6D8', coverage: 0.5, size: 50, stamps: 'body', tint: 0.01, pores: 0.3, patch: { scale: 110, amount: 0.3 } },
      { color: tf.core, coverage: 0.3, size: 34, stamps: 'open', tint: 0.01 },
    ] });
    // --- the swell (23.23, LINK 3): the core one pass larger, pale light further out — the cover grows from here
    const big = coreArch(1.34), bigger = coreArch(1.8);
    a.swell = field({ box: [CX - CHW * 1.9 - 60, C0 - 230, CX + CHW * 1.9 + 60, C1 + 300], depth: (x, y) => Math.max(big(x, y), bigger(x, y) * 0.6), seed: 2307, edge: 0.7, reveal: { steps: 1 }, layers: [
      { color: '#FFF6D8', coverage: 0.5, size: 60, stamps: 'body', tint: 0.01, pores: 0.3, maskFn: (x, y) => 1 - big(x, y), patch: { scale: 120, amount: 0.3 } },
      { color: tf.core, coverage: 0.97, size: 56, tints: 2, tint: 0.01, pores: 0, maskFn: (x, y) => ss(0.2, 0.7, big(x, y)) },
      { color: tf.core, coverage: 0.3, size: 34, stamps: 'open', tint: 0.01, maskFn: (x, y) => 1 - big(x, y) },
    ] });
    // --- a few specks that rise in the light
    a.specks = E.makeSpecks({ seed: 2308, count: 9, bounds: [CX - 150, APEX + 30, 300, 620], colors: [tf.core, '#FBEDB4', '#F7C6D2', tf.core],
      size: [6, 10], speed: [9, 17], angle: -Math.PI / 2, spread: 0.22, wobble: 9, twinkle: 0.3, edgeFade: 90 });

    // --- light-beads: printed like the hour-beads of the dial (review, L6) — a warm-white stencil disc with a
    //     speckled inside, a sponge-printed peach / brick shadow INSIDE its lower-left edge (no outline ring) and
    //     white lights upper right; each lies on a slightly larger, loose brick-peach under-dab, so the light has
    //     its dark on peach, gold and white alike. Bigger than the storyboard's (r 18–22): a path of light on a phone.
    a.beads = LBR.map((r, i) => {
      const bl = E.sphereLight(0, 0, r, r);
      const disc = E.bakeStencil({ shape: E.shape.ellipse(0, 0, r), base: P('light_bead'), anchor: [0, 0], seed: 2320 + i, density: 2, bleed: false,
        layers: [
          { color: '#F3C9A6', coverage: 0.72, size: 18, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.5, 0.32, bl(x, y)) },
          { color: '#E3A07C', coverage: 0.5, size: 12, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.34, 0.18, bl(x, y)) },
          { color: '#FFFFFF', coverage: 0.6, size: 14, stamps: 'body', tints: 1, maskFn: (x, y) => ss(0.66, 0.84, bl(x, y)) },
          { color: '#FBEDB4', coverage: 0.07, size: 9, stamps: 'soft' },
        ],
        edge: { color: P('light_bead_rim'), width: 4.4, opacity: 0.5 } });
      const under = E.makeCluster({ points: [{ x: -1.5, y: 2, r: r + 8 }], anchor: [0, 0], seed: 2310 + i, edgeSoftness: 0.5, reveal: { steps: 1 },
        layers: [
          { color: '#D98C6C', coverage: 0.8, size: 20, stamps: 'body', pores: 0.4 },
          { color: P('light_bead_rim'), coverage: 0.4, size: 14, stamps: 'open', offset: [-2, 3] },
          { color: '#EDB092', coverage: 0.3, size: 12, stamps: 'open' },
        ] });
      return { disc, under };
    });
    return a;
  });

  // ------------------------------------------------------------------ far slot (layer px)
  const breath = (t) => L.motion.farLightBreath(t);
  const NL = T.light.length;                                                 // the last pass: white core + pink rim + halo in ONE step
  function drawFar(ctx, t) {
    const sp = Math.max(0, L.count(t, T.turn) - 1) / 2;                       // one step behind the knoll: 16.73 / 16.83
    if (sp <= 0) return;
    A.surround.draw(ctx, { p: sp });
    const n = L.count(t, T.light);
    if (!n) return;
    ctx.save();
    const s = breath(t);
    ctx.translate(CX, CY); ctx.scale(s, s); ctx.translate(-CX, -CY);
    A.aura.draw(ctx);
    A.peach.draw(ctx);
    if (n >= 2) A.gold.draw(ctx);
    if (n >= NL) A.rim.draw(ctx);
    if (n >= NL) A.halo.draw(ctx);
    if (n >= NL) A.core.draw(ctx);
    if (on(t, T.swell)) A.swell.draw(ctx);
    ctx.restore();
    if (n >= NL) A.specks.draw(ctx, t, { alpha: E.tween(t, ft(T.light[NL - 1]), ft(T.light[NL - 1]) + 0.5, 0, 0.9, E.ease.sine.inOut) });
  }

  // ------------------------------------------------------------------ light-beads (mid slot, world px)
  // five, stepping DOWN from the foot of the white core to the plateau in a falling rhythm: each one lands a
  // little lower than the gap before it promised (the gaps grow 64 -> 88 px), drops the last 12 px into its place
  // and pops; the two that stay above the chest keep a breath of life
  const mAt = (t) => ({ body: on(t, T.chest.body[0]), dome: on(t, T.morph.m1[0]) });
  function drawBeads(ctx, t) {
    if (!on(t, T.lbeads[0]) || on(t, 20.10)) return;
    const { body, dome } = mAt(t);
    LBY.forEach((y, i) => {
      const n = nf(t, T.lbeads[i]);
      if (n < -1e-6) return;
      let sc = pop3(n), dy = -12 * (1 - clamp(n / 2)) ** 2;
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
      const bob = 1.6 * Math.sin(t * 1.9 + i * 1.3);
      A.beads[i].under.draw(ctx, LB.x, y + dy + bob, { scale: sc });
      A.beads[i].disc.draw(ctx, LB.x, y + dy + bob, { scale: sc });
    });
  }

  // ------------------------------------------------------------------ the cream cover (top slot, FRAME px)
  // Cream sponge paint that grows out of the light's core (screen 802, 256) in the storyboard's five stepped
  // passes: the swell of 23.23 simply keeps going. It is PAINT, not a wipe (review, L3):
  //   * every pass is a coat of real overlapping sponge prints (a soft cluster, ~65 % covered, full of gaps and
  //     pores) laid in a ring that reaches further out than the last one: the picture shows through the gaps of
  //     pass n until pass n + 1 closes them with the solid primer wall (seen through an ordered mask of prints);
  //   * the front is a lobed, wobbling line (angular lobes + low-frequency noise on the distance from the core):
  //     never straight, never a circle. Distances count 0.8 downward, so the first coat veils the WHOLE mescid at
  //     once and the second takes it whole (never half a mosque); a bay is held back round the man, who is reached
  //     last (veiled in pass 3, gone in pass 4); the lower-left corner closes with the plate;
  //   * the white of the light belongs to pass 1 only (a warm-white heart over the light's own core); from pass 2
  //     the heart is primer with a paler cream mottle that thins away pass by pass — no white on primer;
  //   * the old coats stay where they were printed (two close cream tones over the wall), so the covered part
  //     looks dabbed until pass 5 = the bare primer plate, exactly (frame 714; the scene draws it itself).
  const O = L.sb.endcard.cover.origin_screen;                                // [802, 256]
  const FW = L.W, FH = L.H;
  const lobes = (th) => 1 + 0.12 * Math.sin(3 * th + 0.9) + 0.07 * Math.sin(5 * th + 2.3) + 0.045 * Math.sin(8 * th + 0.4);
  /** the plain front field (px-like): lobed, wobbling distance from the core; the lower-left corner is far */
  const G0 = (x, y) => {
    const dx = x - O[0], dy = (y - O[1]) * 0.8, r = Math.hypot(dx, dy);
    const n = E.fbm2(x / 380, y / 380, 2391, 3);
    return r / (lobes(Math.atan2(dy, dx)) * (0.84 + 0.32 * n)) + 260 * ss(1250, 1920, y) * ss(600, 80, x);
  };
  // Two things are taken WHOLE, not eaten from one side: the mescid (the first bloom is the light swelling BEHIND
  // it — its silhouette stands against the white for one pass; pass 2 veils all of it, pass 3 closes it) and the
  // man (veiled in pass 3, closed in pass 4). Their places on screen at the hand-off framing:
  const tCov = ft(T.cover[0]);
  const scr = (x, y) => W.toScreen(x, y, tCov, 1);
  const sbox = (x0, y0, x1, y1, m) => { const a = scr(x0, y0), b = scr(x1, y1); return (x, y) => clamp(1 + Math.min(x - a[0], b[0] - x, y - a[1], b[1] - y) / m); };
  const Mq = L.mosque, mb = Mq.body, md = Mq.dome, mn = Mq.minaret;
  const HELD = [sbox(mb.x0 - 6, md.y1 - 10, mb.x1 + 6, mb.y1 + 8, 30), sbox(mn.x0, mn.finial_top_y - 6, mn.x1 + 30, mn.base_y + 8, 26),
    sbox((md.x0 + md.x1) / 2 - 14, Mq.dome_finial_top_y - 8, (md.x0 + md.x1) / 2 + 14, md.y0 + 20, 22)];
  const domeC = scr((md.x0 + md.x1) / 2, md.y1), domeR = [(scr(md.x1, 0)[0] - scr(md.x0, 0)[0]) / 2 + 4, scr(0, md.y1)[1] - scr(0, md.y0)[1] + 4];
  const inMosque = (x, y) => {
    let f = clamp(1 + (1 - Math.hypot((x - domeC[0]) / domeR[0], (y - domeC[1]) / domeR[1])) * domeR[0] / 30);
    for (const h of HELD) { const v = h(x, y); if (v > f) f = v; }
    return f;
  };
  const manX = scr(L.man.x ?? 540, 0)[0];
  const inMan = (x, y) => clamp(1 + Math.min(x - (manX - 82), manX + 118 - x, y - 590, 1216 - y) / 50);
  const REACH = [0.26, 0.53, 0.78, 0.945];                                  // share of the frame inside the front of passes 1..4
  const CLOSE_LAG = 0.14;                                                    // pass k closes everything up to pass-time k - 1 - lag
  const cov = once('coverField', () => {
    // the field's distribution over the frame (12 px grid): quantiles give the fronts, the CDF gives the mask order
    const st = 12, v0 = [];
    for (let y = st / 2; y < FH; y += st) for (let x = st / 2; x < FW; x += st) v0.push(G0(x, y));
    const s0 = Float64Array.from(v0).sort(), q0 = (a) => s0[Math.floor(a * s0.length)];
    const LIFT1 = q0(0.41), LIFT2 = q0(0.67);                                // the middle of pass 2 / of pass 3
    const G = (x, y) => { const g = G0(x, y); return g + inMosque(x, y) * Math.max(0, LIFT1 - g) + inMan(x, y) * Math.max(0, LIFT2 - g); };
    const v = [];
    for (let y = st / 2; y < FH; y += st) for (let x = st / 2; x < FW; x += st) v.push(G(x, y));
    const sorted = Float64Array.from(v).sort();
    const q = (a) => sorted[Math.min(sorted.length - 1, Math.floor(a * sorted.length))];
    const R = [0, ...REACH.map(q), sorted[sorted.length - 1] + 1];
    const cdf = (g) => { let lo = 0, hi = sorted.length; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < g) lo = m + 1; else hi = m; } return lo / sorted.length; };
    /** pass-time: k - 1 … k inside the ring that pass k adds */
    const T = (x, y) => { const g = G(x, y); let k = 1; while (k < 5 && g > R[k]) k++; return k - 1 + (g - R[k - 1]) / (R[k] - R[k - 1]); };
    const gOfT = (tt) => { const k = Math.min(4, Math.max(0, Math.floor(tt))); return R[k] + (R[k + 1] - R[k]) * (tt - k); };
    // bounding box of everything a pass can touch
    const boxOf = (lim) => {
      let x0 = FW, y0 = FH, x1 = 0, y1 = 0, i = 0;
      for (let y = st / 2; y < FH; y += st) for (let x = st / 2; x < FW; x += st) { if (v[i++] < lim) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      return [Math.max(0, x0 - 90), Math.max(0, y0 - 90), Math.min(FW, x1 + 90), Math.min(FH, y1 + 90)];
    };
    return { G, T, cdf, gOfT, boxOf, closedP: [1, 2, 3, 4].map((k) => (k === 1 ? 0 : cdf(gOfT(k - 1 - CLOSE_LAG)))) };
  });
  const passTime = (x, y) => cov.T(x, y);
  const COVER_STEPS = 240, COVER_DAB = 150;
  const CREAM = '#F4E9D4';                                                    // the wall's own cream (E.makeWall), before the grain finish
  // (baked on its first frame, not with the act: four frame-sized coats are only needed for the last 12 frames)
  const getCover = () => once('cover', () => {
    const c = {};
    // the solid wall, closing pass by pass behind the newest coat
    c.wall = E.Painted.fromSurface(W.wall, { ax: 0, ay: 0, seed: 2390, steps: COVER_STEPS, dabSize: COVER_DAB,
      reveal: { order: (x, y, rng) => clamp(cov.cdf(cov.G(x, y)) * 0.985 + rng.next() * 0.012) } });
    // the coat of pass k: sponge prints in the ring k - 1 … k (it overlaps the coat before it), densest inside,
    // breaking up into single prints and a spray toward its front
    const coat = (k) => {
      const d = (x, y) => { const tt = cov.T(x, y); return clamp(Math.min((k - tt) / 0.5, (tt - (k - 1.42)) / 0.3)); };
      const hot = k === 1 ? (x, y) => ss(0.3, 0.56, cov.T(x, y)) : null;      // pass 1: no cream on the light's own white heart
      return field({ box: cov.boxOf(cov.gOfT(k + 0.12)), depth: d, seed: 2392 + k, edge: 0.8, reveal: { steps: 1 }, layers: [
        { color: CREAM, coverage: 0.68, size: 132, stamps: 'body', pores: 0.55, tint: 0.012, tints: 3, maskFn: hot },
        { color: CREAM, coverage: 0.55, size: 104, stamps: 'body', pores: 0.5, tint: 0.012, tints: 3, band: [0.36, 1], maskFn: hot },
        { color: '#FCF5E6', coverage: 0.3, size: 88, stamps: 'open', tints: 2, tint: 0.01, band: [0.2, 1], maskFn: hot, patch: { scale: 240, amount: 0.3 } },
        { color: '#E6D8BA', coverage: 0.22, size: 72, stamps: 'open', tints: 2, tint: 0.01, band: [0.3, 1], maskFn: hot, patch: { scale: 220, amount: 0.4, seed: 9 } },
        { color: CREAM, coverage: 0.09, size: 96, stamps: 'speck', tints: 2, band: [0, 0.34] },
      ] });
    };
    c.coat = [1, 2, 3, 4].map(coat);
    // pass 1: the light's own warm white, blooming over its core and thinning to the cream of the first coat
    const hb = cov.boxOf(cov.gOfT(0.8));
    c.heart = field({ box: hb, depth: (x, y) => clamp((0.66 - cov.T(x, y)) / 0.4), seed: 2397, edge: 0.8, reveal: { steps: 1 }, layers: [
      { color: '#FFF6D8', coverage: 0.6, size: 96, stamps: 'body', pores: 0.4 },
      { color: tf.core, coverage: 0.93, size: 100, tints: 2, tint: 0.01, pores: 0.3, band: [0.25, 1] },
      { color: '#FBF3E3', coverage: 0.1, size: 80, stamps: 'speck', band: [0, 0.3] },
    ] });
    // passes 2-4: where the heart was, the primer is a shade paler and warmer — a mottle that thins away
    c.warm = field({ box: cov.boxOf(cov.gOfT(1.1)), depth: (x, y) => clamp((1.0 - cov.T(x, y)) / 0.7), seed: 2398, edge: 0.85, reveal: { steps: 1 }, layers: [
      { color: '#FAF2E0', coverage: 0.6, size: 110, stamps: 'body', pores: 0.5, tints: 2, tint: 0.008 },
      { color: '#FDF8EC', coverage: 0.4, size: 84, stamps: 'open', tints: 2, tint: 0.008, band: [0.4, 1], patch: { scale: 200, amount: 0.3 } },
    ] });
    return c;
  });
  const WARM_A = [0, 0.95, 0.62, 0.3];
  const coverStage = (t) => L.count(t, T.cover);                              // 0 … 4 inside act 2 (5 = the plate)
  function drawCover(ctx, t) {
    const k = coverStage(t);
    if (!k) return;
    if (k > 4) { E.blit(ctx, W.wall, 0, 0); return; }                        // 23.80: the bare plate (the scene draws it itself)
    const cover = getCover(), p = cov.closedP[k - 1];
    if (p > 0) cover.wall.draw(ctx, 0, 0, { p });
    if (k >= 2) cover.warm.draw(ctx, { alpha: WARM_A[k - 1] });
    for (let j = 0; j < k; j++) cover.coat[j].draw(ctx);
    if (k === 1) cover.heart.draw(ctx);
  }

  return { drawFar, drawBeads, drawCover, coverStage, passTime, REACH, sprites: A, get cover() { return getCover(); }, geometry: { CX, CY, sd, halfW } };
}
