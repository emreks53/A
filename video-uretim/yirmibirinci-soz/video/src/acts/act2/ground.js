// ground.js — the knoll of the right column (act 2, mid slot, plane 1.0) and what lies on it:
//
//   16.63 / 16.73 / 16.83   the knoll cross-dabs in from the ground up (with the world's mist leaving and the
//                           deep sky, light.js, arriving) — plateau y 770, its face sloping toward us; the warm
//                           mist at its foot arrives with the first step
//   17.07                   with the far light's brightest pass the plateau's rim and the upper face catch its
//                           light (yellow-green lights, a grass fringe on the rim)
//   21.27                   the doorway's light spills down the knoll's face (one soft warm fan, sill -> y 860)
//
// The knoll is a HILL, not a hedge: a rounded shoulder, a flank that runs out behind the flowered rise, a
// crown that falls away at the far right; lighter and bluer than the hedge and printed with finer dabs
// (aerial perspective); three tones — a teal shadow on the flank and the foot, a mid green face, lights
// gathered in clumps toward the rim. The grass fringe of the rim is drawn AFTER the buildings, so chest,
// mescid and minaret stand IN the grass (a stencil building never floats).

export function makeGround(E, W, U) {
  const L = W.layout, P = L.pal, { clamp, lerp, smoothstep: ss } = E;
  const { TL: T, ft, on, field } = U;
  const K = L.knoll;
  const once = (k, f) => E.once('act2/ground/' + k, f);
  const FLOOR = W.lightFloor ?? 1203;                    // nothing lighter than hedge_mid below this row

  // ------------------------------------------------------------------ geometry (world px)
  const PLAT = K.plateau_y;                              // 770
  const X1 = L.visibleRect(1, 14)[2];
  // The outline as one line y = sil(x). Left part: a table through these points (shoulder at x ~ 850 so the
  // minaret has ground; through the storyboard's flank about (810, 900), (765, 1040); running out to the left
  // below y 1100, where the flowered rise stands in front of it).
  const SH = [[610, 1290], [648, 1232], [690, 1172], [728, 1108], [757, 1040], [781, 966], [802, 894], [822, 838], [844, 800], [869, 779], [899, 771], [936, 769]];
  const TAB = (() => {
    const c = E.curve(SH, { tension: 0.5 }), n = 480, xs = [], ys = [];
    for (let i = 0; i <= n; i++) { const [x, y] = c.at(i / n); if (!xs.length || x > xs[xs.length - 1] + 1e-3) { xs.push(x); ys.push(y); } }
    return { xs, ys };
  })();
  const look = (a, b, v, rev) => {                       // piecewise-linear lookup b(a = v); a ascending (or descending when rev)
    let lo = 0, hi = a.length - 1;
    if (rev ? v >= a[0] : v <= a[0]) return b[0];
    if (rev ? v <= a[hi] : v >= a[hi]) return b[hi];
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rev ? a[m] >= v : a[m] <= v) lo = m; else hi = m; }
    return lerp(b[lo], b[hi], (v - a[lo]) / (a[hi] - a[lo]));
  };
  const XS = SH[SH.length - 1][0];                       // 936: the plateau begins
  const crown = (x) => PLAT - 1 + 2.4 * Math.sin(x / 61 + 0.7) + 1.4 * Math.sin(x / 23) + 38 * ss(1215, 1470, x) ** 1.3;
  /** the knoll's upper outline */
  const sil = (x) => (x >= XS ? crown(x) : look(TAB.xs, TAB.ys, x) + (crown(XS) - SH[SH.length - 1][1]) * ss(880, XS, x));
  /** its left outline x(y) for rows below the plateau */
  const flank = (y) => (y <= SH[SH.length - 1][1] ? XS : look(TAB.ys, TAB.xs, y, true));
  const lump = (x, y) => 5 * Math.sin(y / 43 + 1) + 3 * Math.sin(y / 17 + x / 60);
  const dTop = (x, y) => y - sil(x);
  const dSide = (x, y) => x - flank(y) - lump(x, y);
  /** px inside the outline (approximately) */
  const inside = (x, y) => Math.min(dTop(x, y), y > PLAT + 10 ? dSide(x, y) * 0.94 : 1e4);
  const depth = (x, y) => clamp((inside(x, y) + 10) / 42);
  const BOX = [SH[0][0] - 10, PLAT - 46, X1, L.lipY + 36];
  const lightOK = (size) => (x, y) => (y + size * 0.7 <= FLOOR ? 1 : 0);
  /** 1 = the rim and the upper face on the light's side; 0 = the flank and the foot */
  const lit = (x, y) => clamp(0.92 * ss(210, 0, dTop(x, y)) + 0.3 * ss(860, 1240, x) - 0.75 * ss(150, 10, dSide(x, y)) - 0.2 * ss(1040, 1180, y));

  const kc = P('knoll');                                 // ['#3E8A5C', '#5FA36A', '#A9D38A']
  const G0 = '#3C8865';                                  // base: a blue-green one step lighter than the hedge
  const A = once('all', () => {
    const a = {};
    const base = [
      { color: G0, coverage: 0.985, size: 40, even: true, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(60, 34, inside(x, y)) },
      { color: G0, coverage: 0.985, size: 92, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(26, 52, inside(x, y)) },
    ];
    const coat = [
      // the shadow side: the flank and the foot, teal
      { color: '#2D7257', coverage: 0.74, size: 58, stamps: 'body', pores: 0.5, maskFn: (x, y) => ss(0.42, 0.2, lit(x, y)), patch: { scale: 170, amount: 0.26 } },
      { color: '#24614C', coverage: 0.4, size: 40, stamps: 'open', maskFn: (x, y) => ss(0.3, 0.06, lit(x, y)), patch: { scale: 130, amount: 0.42, sharp: 0.3 } },
      // the face: mid green in clumps, denser toward the rim
      { color: '#4B9870', coverage: 0.66, size: 52, stamps: 'body', pores: 0.5, maskFn: (x, y) => ss(0.3, 0.52, lit(x, y)), patch: { scale: 160, amount: 0.3, sharp: 0.3, seed: 31 } },
      { color: '#5FA878', coverage: 0.5, size: 38, stamps: 'body', pores: 0.4, maskFn: (x, y) => ss(0.5, 0.74, lit(x, y)) * lightOK(38)(x, y), patch: { scale: 150, amount: 0.34, sharp: 0.3, seed: 31 } },
      // powdery frontier between shadow and face
      { color: '#4B9870', coverage: 0.12, size: 44, stamps: 'speck', maskFn: (x, y) => ss(0.16, 0.3, lit(x, y)) * ss(0.46, 0.34, lit(x, y)) },
      { color: '#24614C', coverage: 0.14, size: 30, stamps: 'soft', patch: { scale: 110, amount: 0.6 } },
      { color: P('primer'), coverage: 0.05, size: 22, stamps: 'soft', maskFn: (x, y) => ss(90, 10, dTop(x, y)), patch: { scale: 110, amount: 0.6 } },
    ];
    const f = field({ box: BOX, depth, seed: 2201, edge: 0.5, layers: [...base, ...coat], k: 1.25,
      reveal: { steps: 2, order: 'sweep', angle: -Math.PI / 2, jitter: 0.16, dab: 150 } });
    // opaque inside (the engine does the same for stencils with a base): the base colour is laid under the dabs
    {
      const c = f.painted.final.ctx;
      c.save();
      c.translate(-BOX[0], -BOX[1]);
      c.globalCompositeOperation = 'destination-over';
      c.fillStyle = G0;
      c.beginPath();
      c.moveTo(BOX[2] + 2, BOX[3] + 2);
      for (let x = BOX[2] + 2; x >= XS - 40; x -= 6) c.lineTo(x, sil(x) + 18);
      for (let y = sil(XS - 40) + 22; y <= BOX[3] + 2; y += 6) c.lineTo(flank(y) + lump(0, y) + 22, y);
      c.lineTo(flank(BOX[3]) + 22, BOX[3] + 2);
      c.closePath();
      c.fill();
      c.restore();
    }
    a.knoll = f;

    // --- the rim and the upper face in the far light (17.07): yellow-green lights in clumps, a few warm ones
    const LITP = { scale: 140, amount: 0.3, sharp: 0.3, seed: 47 };
    a.lit = field({ box: BOX, depth, seed: 2202, edge: 0.5, k: 1.25, reveal: { steps: 1 }, layers: [
      { color: '#7DBB80', coverage: 0.6, size: 44, stamps: 'body', pores: 0.4, maskFn: (x, y) => ss(0.62, 0.8, lit(x, y)), patch: LITP },
      { color: kc[2], coverage: 0.62, size: 34, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.8, 0.94, lit(x, y)), patch: { ...LITP, amount: 0.36 } },
      { color: '#D3E6A0', coverage: 0.4, size: 22, stamps: 'body', maskFn: (x, y) => ss(0.9, 1.02, lit(x, y)) * ss(46, 6, dTop(x, y)), patch: { ...LITP, amount: 0.46 } },
      { color: '#7DBB80', coverage: 0.1, size: 40, stamps: 'speck', maskFn: (x, y) => ss(0.48, 0.62, lit(x, y)) * ss(0.78, 0.66, lit(x, y)) },
      { color: '#F5E2A6', coverage: 0.1, size: 16, stamps: 'soft', maskFn: (x, y) => ss(34, 4, dTop(x, y)) * ss(880, 960, x) },
    ] });

    // --- the grass fringe of the rim, drawn after the buildings: tufts along the plateau's front edge
    const FB = [840, PLAT - 30, X1, PLAT + 52];
    const tuft = (x) => 5 * Math.sin(x / 13) + 3 * Math.sin(x / 5.3 + 1) + 2.5 * Math.sin(x / 31 + 2);
    const fd = (x, y) => clamp(Math.min((y - (sil(x) - 3 + tuft(x))) / 12, (sil(x) + 46 - y) / 30, (x - 846) / 26));
    a.fringe = field({ box: FB, depth: fd, seed: 2203, edge: 0.55, k: 1.25, reveal: { steps: 1 }, layers: [
      { color: '#4B9870', coverage: 0.94, size: 24, pores: 0.3, tint: 0.03 },
      { color: '#69AE78', coverage: 0.62, size: 20, stamps: 'body', pores: 0.3, patch: { scale: 70, amount: 0.3 } },
      { color: kc[2], coverage: 0.56, size: 16, stamps: 'body', maskFn: (x, y) => ss(sil(x) + 20, sil(x) + 2, y), patch: { scale: 60, amount: 0.34 } },
      { color: '#D3E6A0', coverage: 0.3, size: 11, stamps: 'open', maskFn: (x, y) => ss(sil(x) + 10, sil(x) - 2, y), patch: { scale: 50, amount: 0.44 } },
      { color: '#2D7257', coverage: 0.22, size: 15, stamps: 'open', maskFn: (x, y) => ss(sil(x) + 8, sil(x) + 30, y), patch: { scale: 60, amount: 0.4 } },
    ] });

    // --- warm mist along the foot of the knoll: a low bank of the same make as tomorrow's mist (big soft prints,
    //     a darker under-dab, pale puffs on top), only warm — peach-gold under cream and white-gold. Its foot
    //     lies behind the hedge lip; it is CUT at the light floor (nothing light below it while a gloss is up)
    //     and keeps clear of the rug's fringe (y 1103).
    const MB = K.base_mist;
    const mTop = (x) => MB.y0 + 2 + 9 * Math.sin(x / 83 + 2) + 5 * Math.sin(x / 31) - 34 * ss(880, 770, x) - 24 * ss(1185, 1300, x);
    const mBox = [MB.x0 - 70, MB.y0 - 80, Math.min(MB.x1 + 40, X1), FLOOR + 40];
    const under = (x, y) => y - mTop(x);
    const md = (x, y) => clamp(Math.min((under(x, y) + 14) / 70, (x - MB.x0 + 40) / 120));
    {
      const [x0, y0, x1, y1] = mBox;
      const sh = (fn) => (x, y) => fn(x + x0, y + y0);
      const c = E.clusterDabs({ w: x1 - x0, h: y1 - y0, seed: 2204, edgeSoftness: 0.7, anchor: [0, 0], shapeFn: sh(md), layers: [
        { color: '#EDC49A', coverage: 0.9, size: 84, tint: 0.03, opacity: [0.8, 1], pores: 0.3 },
        { color: '#F1B39A', coverage: 0.24, size: 62, stamps: 'open', opacity: [0.5, 0.8], patch: { scale: 180, amount: 0.5 } },
        { color: '#F7E2BC', coverage: 0.72, size: 74, stamps: 'body', tint: 0.02, opacity: [0.85, 1], pores: 0.4, maskFn: sh((x, y) => ss(6, 32, under(x, y))), patch: { scale: 200, amount: 0.28 } },
        { color: P('warm_mist', 0), coverage: 0.62, size: 58, stamps: 'body', tint: 0.012, pores: 0.3, maskFn: sh((x, y) => ss(22, 48, under(x, y))), patch: { scale: 170, amount: 0.34 } },
        { color: '#FFFFFF', coverage: 0.2, size: 44, stamps: 'speck', tints: 1, opacity: [0.7, 1] },
      ] });
      const sf = E.surface(c.w, c.h, E.res);
      E.paintLayered(sf, c.dabs, c.dabs.meta);
      sf.ctx.clearRect(0, FLOOR - y0, c.w, c.h);
      a.mist = E.Painted.fromSurface(sf, { ax: 0, ay: 0, w: c.w, h: c.h, seed: 2204, steps: 2, dabSize: 120, reveal: { order: 'sweep', angle: -Math.PI / 2, jitter: 0.2 } });
      a.mistAt = [x0, y0];
    }

    // --- the doorway's light on the grass (21.27): a soft fan from the sill, wider than the rolled rug: the
    //     grass lit yellow-green, pale gold close to the door, the light itself only on the sill
    const D = L.mosque.door, dcx = (D.x0 + D.x1) / 2, y0 = PLAT - 2, y1 = 876;
    const sBox = [dcx - 200, y0 - 14, dcx + 200, y1 + 40];
    const hw = (y) => lerp(36, 158, clamp((y - y0) / (y1 - y0)) ** 0.75);
    const sdp = (x, y) => clamp(Math.min((hw(y) - Math.abs(x - dcx)) / 54, (y - y0 + 10) / 16, (y1 + 24 - y) / 60));
    const ax = (a0, b0) => (x) => ss(a0, b0, Math.abs(x - dcx));
    a.spill = field({ box: sBox, depth: sdp, seed: 2205, edge: 0.85, reveal: { steps: 1 }, layers: [
      { color: '#8DC585', coverage: 0.6, size: 30, stamps: 'body', pores: 0.4, patch: { scale: 80, amount: 0.2 } },
      { color: kc[2], coverage: 0.62, size: 24, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(y1 + 10, y0 + 40, y) * ax(150, 60)(x), patch: { scale: 70, amount: 0.24 } },
      { color: '#DDE9A0', coverage: 0.56, size: 19, stamps: 'body', maskFn: (x, y) => ss(y0 + 84, y0 + 14, y) * ax(104, 36)(x), patch: { scale: 60, amount: 0.26 } },
      { color: P('today_pale'), coverage: 0.6, size: 15, stamps: 'body', maskFn: (x, y) => ss(y0 + 46, y0 + 6, y) * ax(58, 22)(x), patch: { scale: 50, amount: 0.24 } },
      { color: P('seam_light'), coverage: 0.6, size: 12, stamps: 'body', maskFn: (x, y) => ss(y0 + 24, y0, y) * ax(30, 12)(x) },
    ] });
    return a;
  });

  // ------------------------------------------------------------------ draw
  // the turn-over runs from the ground up: knoll 16.63 (lower half) / 16.73 (whole); the deep sky follows one step
  // behind (light.js: 16.73 / 16.83), so no violet ever shows where the knoll is about to stand
  const knollP = (t) => Math.min(1, L.count(t, T.turn) / 2);
  /** behind the buildings */
  function drawBack(ctx, t) {
    const p = knollP(t);
    if (p <= 0) return;
    A.knoll.draw(ctx, { p });
    if (on(t, T.light[3])) A.lit.draw(ctx);
    // the mist at its foot: there from the first step, complete with the second; it drifts a few px
    const dx = 5 * Math.sin((t - 16.6) * 0.7);
    ctx.save();
    ctx.translate(dx, 0);
    A.mist.draw(ctx, A.mistAt[0], A.mistAt[1], { p });
    ctx.restore();
  }
  /** in front of the buildings: the grass their bases stand in, then the door's light */
  function drawFront(ctx, t) {
    if (!on(t, T.light[3])) return;
    A.fringe.draw(ctx);
    if (on(t, T.rug.spill)) A.spill.draw(ctx);
  }
  return { drawBack, drawFront, sil, flank, sprites: A, box: BOX };
}
