// props.js — the PAINTED THINGS of act 1 (owner: act-1 team). Everything is baked once (E.once keys
// 'act1/…'), in WORLD px on the subject plane, light from the upper right like the rest of the film.
//
//   veil       the veil cloud over today's sun: two overlapping halves, peach-gold rim, lavender under-dab
//   callDabs   the white-gold dabs of the «Ey nefis!» ring, each on a violet-blue under-dab
//   sun        yesterday's sun: stencil disc r 100 in three passes (deep orange / orange / peach-gold lights) + halo
//   afterglow  the soft peach / pink cluster on the ridge, with its specks
//   dots       the deep-ochre course dots (stencil r 12, maroon inner edge), a few variants
//   deed       the ghost title-deed: primer sheet, dashed maroon edge, folded corner, dashed lines, ochre seal
//
// Painting rule (ENGINE.md §6): opaque matte prints with holes, three tones + a pale core, tight
// stippled frontiers, cream primer peeking through; soft things are clusters, sharp things stencils.

export function makeProps(E, W) {
  const L = W.layout, P = L.pal, { smoothstep: ss, clamp, tone } = E;
  const once = (key, make) => E.once('act1/' + key, make);

  // ------------------------------------------------------------------ veil cloud (plane 1.0)
  // 560 x 290 round (540, 335). Two halves that overlap in the middle; each leaves from the middle
  // outward (mask sweep), so the first of the four dab-out steps opens a gap exactly over the disc.
  const veil = once('veil', () => {
    const upper = (x, y) => ss(84, 0, y);                                  // the warm lining lives on the top and the shoulders
    const pts = {
      // (the last ellipse of each half is the belly: it carries the white body well below the disc's lower limb, y +115)
      L: [{ x: -160, y: 30, rx: 128, ry: 88 }, { x: -22, y: -44, r: 112 }, { x: -228, y: 52, r: 60 }, { x: -70, y: 30, rx: 130, ry: 92 }, { x: -34, y: 66, rx: 122, ry: 86 }],
      R: [{ x: 158, y: 34, rx: 126, ry: 84 }, { x: 52, y: -36, r: 100 }, { x: 226, y: 56, r: 58 }, { x: 70, y: 34, rx: 128, ry: 88 }, { x: 40, y: 68, rx: 116, ry: 84 }],
    };
    const depthOf = (list) => (x, y) => { let f = 0; for (const q of list) { const v = 1 - Math.hypot((x - q.x) / (q.rx ?? q.r), (y - q.y) / (q.ry ?? q.r)); if (v > f) f = v; } return f; };
    const depthL = depthOf(pts.L);
    // The right half lies over the left one: where the left half has its white body, the right half prints
    // neither its under-dab nor its rim, so the two halves read as ONE cloud until they part.
    const freeOfL = (x, y) => ss(0.2, 0.04, depthL(x, y));
    const layers = (s) => {
      const edgeOnly = s > 0 ? freeOfL : () => 1;
      return [
        // lavender-grey under-dab: the weight of the cloud (as the small cloud has it)
        { color: P('cloud_under_dab'), coverage: 0.74, size: 112, offset: [10 * s, 36], grow: 0.86, stamps: 'open', pores: 0.3, maskFn: edgeOnly },
        { color: '#CBC2E3', coverage: 0.44, size: 88, offset: [0, 26], grow: 0.92, stamps: 'soft', maskFn: edgeOnly },
        // the white body: dense in the core (nothing shows through it), powdery at the fringe
        { color: P('cloud_white'), coverage: 0.95, size: 138, band: [0.1, 1], tint: 0.012, pores: 0.25 },
        { color: '#FFFFFF', coverage: 0.92, size: 112, band: [0.26, 1], stamps: 'body', tints: 1, pores: 0.18 },
        { color: '#FFFFFF', coverage: 0.9, size: 96, band: [0.4, 1], stamps: 'dense', tints: 1, pores: 0 },
        { color: '#EFEAF5', coverage: 0.3, size: 76, band: [0.26, 1], stamps: 'open', tint: 0.01, maskFn: (x, y) => ss(0, 80, y), patch: { scale: 170, amount: 0.45 } },
      ];
    };
    const half = (k, s, seed) => E.makeCluster({ points: pts[k], seed, edgeSoftness: 0.62, anchor: [0, 0], layers: layers(s) });
    // peach-gold rim, printed over the white edge of the WHOLE cloud (never inside it): the light of what
    // the cloud hides shows along its top. One sprite per half, so that it parts with its half.
    const depthR = depthOf(pts.R);
    const rim = (k, s, seed) => {
      const outer = s < 0 ? (x, y) => ss(0.16, 0.02, depthR(x, y)) : (x, y) => ss(0.16, 0.02, depthL(x, y));
      const m = (x, y) => upper(x, y) * outer(x, y);
      return E.makeCluster({
        points: pts[k], seed, edgeSoftness: 0.09, anchor: [0, 0],
        layers: [
          { color: P('yesterday_light'), coverage: 0.68, size: 62, band: [0.03, 0.23], stamps: 'open', pores: 0.3, maskFn: m, patch: { scale: 150, amount: 0.2 } },
          { color: '#F6B96A', coverage: 0.2, size: 38, band: [0.03, 0.15], stamps: 'open', maskFn: m, patch: { scale: 110, amount: 0.45 } },
          { color: P('today_light'), coverage: 0.5, size: 42, band: [0.02, 0.14], stamps: 'open', maskFn: m, patch: { scale: 120, amount: 0.28 } },
          { color: '#FFFFFF', coverage: 0.42, size: 44, band: [0.12, 0.34], stamps: 'soft', tints: 1, maskFn: m },
        ],
      });
    };
    // rim glimmer: two sparse sets of pale-gold prints along the top edge; each comes and goes print by
    // print on a slow stepped cycle (matte paint, no alpha)
    const all = [...pts.L, ...pts.R];
    const glimmer = (seed) => E.makeCluster({
      points: all, seed, edgeSoftness: 0.08, anchor: [0, 0],
      layers: [
        { color: '#FBE9B0', coverage: 0.5, size: 40, band: [0.0, 0.15], stamps: 'open', maskFn: (x, y) => ss(40, -30, y), patch: { scale: 110, amount: 0.42, seed } },
        { color: '#FFF6D8', coverage: 0.34, size: 26, band: [0.02, 0.13], stamps: 'body', maskFn: (x, y) => ss(40, -30, y), patch: { scale: 110, amount: 0.5, seed } },
      ],
      reveal: { steps: 3, mode: 'mask', order: 'random', dab: 46 },
    });
    // One print per half (white body + its rim): it leaves in EIGHT stages from the middle outward — the prints
    // nearest the column over today's sun (local x 0) go first, with a ragged, speckled frontier, so that the
    // first step opens holes over the disc ("first gold shows") instead of cutting a clean window, and the
    // cloud PARTS like a curtain (height counts for little: no arc of cloud is left standing over the disc).
    const whole = (k, s, seed) => {
      const body = half(k, s, seed), lining = rim(k, s, seed + 2);
      const a = body.inkBounds, b = lining.inkBounds;
      const bounds = [Math.floor(Math.min(a.x0, b.x0)) - 6, Math.floor(Math.min(a.y0, b.y0)) - 6, Math.ceil(Math.max(a.x1, b.x1)) + 6, Math.ceil(Math.max(a.y1, b.y1)) + 6];
      const [fx, fy] = [0 - bounds[0], 5 - bounds[1]], far = 300, jit = 0.2;
      return E.bakeSprite({
        bounds, anchor: [0, 0], seed: seed + 20, steps: 8, dabSize: 62,
        reveal: { order: (x, y, rng) => clamp((1 - clamp(Math.hypot(x - fx, (y - fy) * 0.42) / far)) * (1 - jit) + rng.next() * jit) },
        draw: (c) => { body.draw(c, 0, 0); lining.draw(c, 0, 0); },
      });
    };
    return { L: whole('L', -1, 6101), R: whole('R', 1, 6102), glimmer: [glimmer(6111), glimmer(6117)] };
  });

  // ------------------------------------------------------------------ call-ring dabs
  // Round prints of light: warm white with a gold fringe and a white-hot core, each on a slightly larger
  // violet-blue under-dab (as the clouds have theirs) so that the light reads on the pale sky.
  const callDabs = once('call', () => Array.from({ length: 6 }, (_, i) => E.makeCluster({
    points: [{ x: 0, y: 0, rx: 25, ry: 23 }], seed: 6201 + i, edgeSoftness: 0.4, anchor: [0, 0],
    layers: [
      // the dark the light is painted on: a violet-blue print a little larger than the dab, showing all round
      // it as a speckled rim (heavier below, as under the clouds)
      { color: P('call_ring_under'), coverage: 0.86, size: 22, offset: [-2, 4], grow: 1.2, stamps: 'open', pores: 0.25 },
      { color: '#A7A0D6', coverage: 0.3, size: 14, offset: [-2, 4], grow: 1.3, stamps: 'soft' },
      // the light itself: warm white, a powdery pale-gold fringe with a few gold prints, a white-hot core
      { color: P('call_ring', 0), coverage: 0.97, size: 22, tint: 0.01, stamps: 'dense', pores: 0 },
      { color: '#FBE9B0', coverage: 0.6, size: 14, band: [0.0, 0.46], stamps: 'open' },
      { color: P('call_ring', 1), coverage: 0.34, size: 11, band: [0.0, 0.4], stamps: 'body', patch: { scale: 26, amount: 0.42, seed: 6201 + i } },
      { color: '#FFFFFF', coverage: 0.92, size: 15, band: [0.42, 1], stamps: 'body', tints: 1, pores: 0 },
    ],
    reveal: { steps: 3, mode: 'mask', order: 'random', dab: 22 },
  })));

  // ------------------------------------------------------------------ yesterday's sun
  const Y = L.yesterday, R = Y.r;
  const sun = once('sun', () => {
    const lit = E.sphereLight(0, 0, R, R);
    const hot = (x, y) => ss(R * 0.4, R * 0.26, Math.hypot(x - R * 0.32, y + R * 0.36));
    // three flat tones that meet at tight stippled frontiers, and a pale core where the light hits
    const A = [                                                              // pass 1: deep orange base with its shade (lower left)
      { color: '#B5462A', coverage: 0.74, size: R * 0.6, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.44, 0.34, lit(x, y)) },
      { color: '#C9532B', coverage: 0.3, size: R * 0.46, stamps: 'open', pores: 0.2, patch: { scale: R * 1.1, amount: 0.5 } },
    ];
    const B = [                                                              // pass 2: orange mid tone
      { color: '#EC8A2E', coverage: 0.92, size: R * 0.7, pores: 0.3, maskFn: (x, y) => ss(0.5, 0.57, lit(x, y)) },
      { color: '#EC8A2E', coverage: 0.13, size: R * 0.5, stamps: 'speck', maskFn: (x, y) => ss(0.36, 0.46, lit(x, y)) * ss(0.56, 0.48, lit(x, y)) },
    ];
    const C = [                                                              // pass 3: peach-gold lights on the upper right
      { color: '#F5B04A', coverage: 0.92, size: R * 0.52, pores: 0.3, maskFn: (x, y) => ss(0.75, 0.81, lit(x, y)) },
      { color: '#F5B04A', coverage: 0.12, size: R * 0.44, stamps: 'speck', maskFn: (x, y) => ss(0.62, 0.72, lit(x, y)) * ss(0.8, 0.73, lit(x, y)) },
      { color: '#F8CA86', coverage: 0.9, size: R * 0.34, stamps: 'body', pores: 0.3, maskFn: hot },
      { color: '#FBDDAA', coverage: 0.55, size: R * 0.2, stamps: 'open', maskFn: (x, y) => hot(x, y) ** 3 },
    ];
    const disc = (layers) => E.bakeStencil({
      shape: E.shape.ellipse(0, 0, R), base: P('yesterday_base'), seed: 6301, anchor: [0, 0], layers,
      edge: { color: '#8E3324', width: 5, opacity: 0.45, dir: [-0.7, 0.7], tile: 'fine' },
      bleed: { color: P('yesterday_base'), amount: 0.7 },
    });
    // halo: peach / pink dabs to r 180, sky showing in the holes between them (never a haze)
    const HR = Y.halo_r;
    const RC = HR * 1.1, f = (r) => 1 - r / RC;                            // cluster depth at radius r
    const halo = E.makeCluster({
      points: [{ x: 0, y: 0, r: RC }], seed: 6305, edgeSoftness: 0.1, anchor: [0, 0],
      layers: [
        { color: P('afterglow', 1), coverage: 0.56, size: 88, band: [0, f(128)], stamps: 'open', pores: 0.3, patch: { scale: 170, amount: 0.3 } },
        { color: P('afterglow', 0), coverage: 0.8, size: 92, band: [f(170), f(96)], stamps: 'any', pores: 0.3, patch: { scale: 200, amount: 0.14 } },
        { color: '#F6B96A', coverage: 0.66, size: 70, band: [f(140), f(90)], stamps: 'body', pores: 0.3, patch: { scale: 150, amount: 0.26 } },
        { color: '#FBE3B8', coverage: 0.3, size: 46, band: [f(180), f(110)], stamps: 'soft' },
      ],
      reveal: { steps: 3, mode: 'mask', order: 'random', dab: 96 },
    });
    return { stages: [disc(A), disc([...A, ...B]), disc([...A, ...B, ...C])], halo };
  });

  // ------------------------------------------------------------------ afterglow on the ridge
  const afterglow = once('afterglow', () => {
    const glow = E.makeCluster({
      points: [{ x: 0, y: 0, rx: 172, ry: 140 }], seed: 6401, edgeSoftness: 0.36, anchor: [0, 0],
      layers: [
        { color: P('afterglow', 1), coverage: 0.82, size: 92, stamps: 'any', pores: 0.3 },
        { color: P('afterglow', 0), coverage: 0.84, size: 84, band: [0.12, 1], stamps: 'any', pores: 0.3, patch: { scale: 150, amount: 0.16 } },
        { color: '#F6B96A', coverage: 0.7, size: 66, band: [0.3, 1], stamps: 'body', pores: 0.3 },
        { color: '#FBE3B8', coverage: 0.5, size: 44, band: [0.46, 1], stamps: 'open' },
      ],
      reveal: { steps: 3, mode: 'mask', order: 'radial', from: [0, 26], jitter: 0.3, dab: 84 },
    });
    // it breaks into about a dozen specks that drift up (sampled from its own paint)
    const burst = E.makeBurst(glow, { seed: 6402, count: 13, duration: 0.14, wind: [46, -390], spread: 30, life: [0.34, 0.46], size: [22, 36] });
    return { glow, burst };
  });

  // ------------------------------------------------------------------ course dots
  const DR = L.arc.dotR;
  const dots = once('dots', () => Array.from({ length: 5 }, (_, i) => E.bakeStencil({
    shape: E.shape.ellipse(0, 0, DR), base: P('arc_dots'), anchor: [0, 0], seed: 6501 + i, bleed: false, pad: 3,
    layers: [
      { color: '#B4712A', coverage: 0.5, size: 13, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(-5, 4, x - y) },
      { color: '#C98A3C', coverage: 0.3, size: 8, stamps: 'open', maskFn: (x, y) => ss(0, 8, x - y) },
      { color: '#7C4418', coverage: 0.3, size: 9, stamps: 'soft', maskFn: (x, y) => ss(2, -6, x - y) },
    ],
    edge: [{ color: P('arc_dots_edge'), width: 3.5, opacity: 0.8, dir: [-0.7, 0.7], tile: 'fine' }, { color: P('arc_dots_edge'), width: 2.5, opacity: 0.32, dir: null, tile: 'fine' }],
    reveal: { steps: 2, mode: 'mask', dab: 13 },
  })));

  // ------------------------------------------------------------------ the deed (senet)
  // Local px round its centre: 140 x 175, folded corner top-right (36 px). A GHOST: bare primer with one thin
  // pass of ivory dabs — the sky keeps showing through its pores — inside a bold dashed maroon edge.
  const D = L.deed, dw = D.w / 2, dh = D.h / 2, FOLD = 36;
  const deed = once('deed', () => {
    const maroon = P('deed_edge'), ochre = P('tomorrow_dashes');
    const sheetPts = [[-dw, -dh], [dw - FOLD, -dh], [dw, -dh + FOLD], [dw, dh], [-dw, dh]];
    const sheetShape = E.shape.polygon(sheetPts);
    const bounds = [-dw - 10, -dh - 10, dw + 10, dh + 10];
    // pass 1a: the bare-primer body, a holed print
    const body = E.bakeStencil({
      shape: sheetShape, anchor: [0, 0], seed: 6601, bleed: false,
      layers: [
        { color: P('primer'), coverage: 0.7, size: 44, stamps: 'body', tint: 0.015, pores: 0.5 },
        { color: '#E6D8C2', coverage: 0.2, size: 30, stamps: 'open', tint: 0.01, maskFn: (x, y) => ss(-40, 60, y - x * 0.6) },
      ],
    });
    // pass 1b: bold dashed maroon edge, 12 px dashes
    const edge = E.bakeStencil({
      shape: sheetShape, outline: { width: 6.5, dash: 12, gap: 8.5, cap: 'butt', side: 'center' }, anchor: [0, 0], seed: 6602, bleed: false,
      base: maroon, layers: [{ color: '#6E3438', coverage: 0.4, size: 12, stamps: 'open' }, { color: '#2F1518', coverage: 0.2, size: 10, stamps: 'soft' }],
    });
    // the folded corner: the flap lies on the sheet, a tone darker, with the fold line printed
    const flapShape = E.shape.polygon([[dw - FOLD, -dh], [dw, -dh + FOLD], [dw - FOLD, -dh + FOLD]]);
    const flap = E.bakeStencil({
      shape: flapShape, anchor: [0, 0], seed: 6603, bleed: false, base: '#DCCDB8',
      layers: [{ color: '#C7B9C4', coverage: 0.5, size: 16, stamps: 'open', maskFn: (x, y) => ss(-dh + FOLD - 22, -dh + FOLD, y) }, { color: P('primer'), coverage: 0.3, size: 12, stamps: 'soft' }],
      edge: { color: maroon, width: 3.5, opacity: 0.8, dir: [-0.7, 0.7], tile: 'fine' },
    });
    // pass 2: one thin pass of pale ivory dabs
    const ivory = E.bakeStencil({
      shape: sheetShape, anchor: [0, 0], seed: 6604, bleed: false,
      layers: [
        { color: P('deed_body_dabs'), coverage: 0.62, size: 40, stamps: 'body', tint: 0.008, pores: 0.4 },
        { color: '#FFFFFF', coverage: 0.2, size: 24, stamps: 'open', tints: 1, maskFn: (x, y) => ss(40, -50, y - x * 0.6) },
      ],
    });
    // pass 3: three dashed lines of 'writing' (never letters)
    const lineY = [-34, -8, 18], lineX1 = [34, 46, 6];
    const lines = E.bakeStencil({
      shape: E.shape.union(...lineY.map((y, i) => E.shape.dashes([[-48, y], [lineX1[i], y]], { dash: [17, 13, 15][i], gap: 8, width: 6.5, cap: 'round', phase: [0, 5, 2][i] }))),
      anchor: [0, 0], seed: 6605, bleed: false, base: '#5C2C30',
      layers: [{ color: '#7B4444', coverage: 0.45, size: 12, stamps: 'open' }],
    });
    // the seal: a miniature of tomorrow's ring — dashed ochre ring r 23 round one full ochre pass
    const SR = D.seal_r, SX = 34, SY = 54;
    const sealRing = E.bakeStencil({
      shape: E.shape.dashes(E.shape.ellipse(0, 0, SR), { dash: 10.5, gap: 7.5, width: 5.5 }), anchor: [0, 0], seed: 6606, bleed: false,
      base: '#BE7F31', layers: [{ color: ochre, coverage: 0.5, size: 12, stamps: 'body' }, { color: '#A1641F', coverage: 0.25, size: 9, stamps: 'soft' }],
    });
    const sealDisc = E.bakeStencil({
      shape: E.shape.ellipse(0, 0, SR - 7.5), anchor: [0, 0], seed: 6607, bleed: false, base: '#C0802F',
      layers: [
        { color: '#D79A45', coverage: 0.6, size: 14, stamps: 'body', pores: 0.4, maskFn: (x, y) => ss(-4, 6, x - y) },
        { color: '#A1641F', coverage: 0.3, size: 10, stamps: 'open', maskFn: (x, y) => ss(3, -7, x - y) },
        { color: P('primer'), coverage: 0.12, size: 8, stamps: 'soft' },
      ],
    });
    const seal = E.bakeSprite({ bounds: [-SR - 5, -SR - 5, SR + 5, SR + 5], anchor: [0, 0], seed: 6608, draw: (c) => { sealDisc.draw(c, 0, 0); sealRing.draw(c, 0, 0); } });
    const drawParts = (c, n, sealOpts = null) => {
      // n = number of passes that are on (1 outline, 2 + ivory, 3 + writing, 4 + seal)
      body.draw(c, 0, 0);
      if (n >= 2) ivory.draw(c, 0, 0);
      flap.draw(c, 0, 0);
      edge.draw(c, 0, 0);
      if (n >= 3) lines.draw(c, 0, 0);
      if (n >= 4) seal.draw(c, SX, SY, sealOpts ?? undefined);
    };
    // the finished deed as ONE print: it crumbles in three steps, from the far corner toward the ring
    const whole = E.bakeSprite({
      bounds, anchor: [0, 0], seed: 6609, steps: 3, dabSize: 58,
      reveal: { order: 'sweep', angle: Math.PI * 1.22, jitter: 0.3 },
      draw: (c) => drawParts(c, 4),
    });
    // «yok»: the DASHES fall apart — the specks are sampled from the inked parts only (maroon, ochre), never from the pale sheet
    const ink = E.bakeSprite({
      bounds, anchor: [0, 0], seed: 6609, steps: 3, dabSize: 58, reveal: { order: 'sweep', angle: Math.PI * 1.22, jitter: 0.3 },
      draw: (c) => { edge.draw(c, 0, 0); lines.draw(c, 0, 0); seal.draw(c, SX, SY); },
    });
    // (a speck is at full size for the first third of its life and fades over the last half: the wind is set so
    // that it visibly travels ~70 px toward the ring in that time; the last one is gone at 6.37 + 0.10 + 0.42 = 6.89)
    const burst = E.makeBurst(ink, { seed: 6610, count: 15, duration: 0.1, wind: [430, 175], spread: 22, life: [0.32, 0.42], size: [22, 36] });
    return { drawParts, whole, burst, seal: [SX, SY], bounds };
  });

  return { veil, callDabs, sun, afterglow, dots, deed };
}
