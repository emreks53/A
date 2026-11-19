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
  const LIT_T = T.light[T.light.length - 1];            // the far light's last (brightest) pass: rim + fringe take its light
  const FLOOR = W.lightFloor ?? 1203;                    // nothing lighter than hedge_mid below this row

  // ------------------------------------------------------------------ geometry (world px)
  const PLAT = K.plateau_y;                              // 770
  const X1 = L.visibleRect(1, 14)[2];
  // The outline as one line y = sil(x): an S-curve. It runs out flat to the left behind the flowered rise
  // (concave foot), climbs, and turns over a ROUND shoulder into the plateau that carries chest / mescid
  // (x 866–1190); right of the mescid the crown rolls away toward the frame's edge. The upper flank keeps clear
  // of his hand and the coin (x <= 760 at y 800–900).
  const SH = [[470, 1300], [540, 1222], [600, 1154], [650, 1094], [694, 1036], [729, 980], [757, 924], [779, 872], [800, 828], [824, 796], [852, 778], [888, 771], [930, 769]];
  const TAB = (() => {
    const c = E.curve(SH, { tension: 0.5 }), n = 520, xs = [], ys = [];
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
  const XS = SH[SH.length - 1][0];                       // 930: the plateau begins
  const ROLL = 1196;                                     // right of the mescid's wall the crown rolls away
  const crown = (x) => PLAT - 1 + 2.2 * Math.sin(x / 61 + 0.7) + 1.3 * Math.sin(x / 23)
    + 96 * ((Math.max(0, x - ROLL) / 190) ** 1.7) + ss(ROLL - 10, ROLL + 60, x) * (3.5 * Math.sin(x / 15.5 + 1) + 2.5 * Math.sin(x / 7.1));
  /** the knoll's upper outline */
  const sil = (x) => (x >= XS ? crown(x) : look(TAB.xs, TAB.ys, x) + (crown(XS) - SH[SH.length - 1][1]) * ss(880, XS, x));
  /** its left outline x(y) for rows below the plateau */
  const flank = (y) => (y <= SH[SH.length - 1][1] ? XS : look(TAB.ys, TAB.xs, y, true));
  const lump = (x, y) => 6 * Math.sin(y / 39 + 1) + 3.5 * Math.sin(y / 15 + x / 60) + 2 * Math.sin(y / 6.7);   // foliage clumps along the flank
  const dTop = (x, y) => y - sil(x);
  const dSide = (x, y) => x - flank(y) - lump(x, y);
  /** px inside the outline (approximately) */
  const inside = (x, y) => Math.min(dTop(x, y), y > PLAT + 10 ? dSide(x, y) * 0.9 : 1e4);
  const depth = (x, y) => clamp((inside(x, y) + 10) / 42);
  const BOX = [SH[0][0] - 10, PLAT - 70, X1, L.lipY + 36];
  const FOOT = L.lipY + 6;
  /**
   * The MODELLING: 1 at the crown, 0 at the foot — three sponge tone bands (deep foot / mid face / light crown)
   * whose frontiers bow with the hill: they sag in the middle of the face (it bulges toward us), climb toward the
   * side the light is on (right) and dive along the left flank, which turns away from the light.
   */
  const relief = (x, y) => {
    const h = 1 - dTop(x, y) / (FOOT - sil(x));
    const bow = 0.07 * Math.sin((x - 800) / 170) + 0.035 * Math.sin(x / 47 + y / 90) + 0.025 * Math.sin(x / 23 - y / 31);
    return h + bow + 0.1 * ss(980, 1300, x) - 0.3 * ss(230, 0, dSide(x, y)) * ss(PLAT - 20, PLAT + 90, y);
  };
  const Z1 = 0.36, Z2 = 0.66;                            // frontiers: deep | mid | light
  const zone = (a, b, w = 0.035) => (x, y) => { const r = relief(x, y); return ss(a - w, a + w, r) * ss(b + w, b - w, r); };
  const below = (a, w = 0.035) => (x, y) => ss(a + w, a - w, relief(x, y));
  const above = (a, w = 0.035) => (x, y) => ss(a - w, a + w, relief(x, y));

  const kc = P('knoll');                                 // ['#3E8A5C', '#5FA36A', '#A9D38A']
  const G0 = '#3B8760';                                  // the mid face: a blue-green one step lighter than the hedge
  const DEEP = P('hedge_deep'), DARK = '#225F48';        // the foot is the hedge's own deep green: one land
  // stencil leaves: a few leaf tips break the contour, a few lie tone-on-tone in the face (it is foliage, not a wall)
  const leaf = (len, wid, bend, seed, base, mid, light, side) => {
    const m = (x, y) => ss(wid * 0.05, -wid * 0.3, (y - bend * 0.7) * -side) * ss(0.12, 0.34, x / len) * ss(0.95, 0.6, x / len);
    return E.bakeStencil({ shape: E.shape.leaf(len, wid, bend), base, seed, anchor: [0, 0], pad: 4, bleed: false, reveal: { steps: 1 },
      layers: [
        { color: E.tone(base, 0.04), coverage: 0.5, size: wid * 0.9, pores: 0.3 },
        { color: E.tone(base, -0.05), coverage: 0.25, size: wid * 0.6, stamps: 'open', pores: 0.3 },
        { color: mid, coverage: 0.62, size: wid * 0.46, stamps: 'soft', maskFn: m },
        { color: light, coverage: 0.36, size: wid * 0.4, stamps: 'airy', pores: 0, maskFn: (x, y) => ss(0.45, 0.85, m(x, y)) },
      ] });
  };
  const DEG = Math.PI / 180;
  // [x, rot°, len, wid, bend, lit side] — bases a few px inside the outline, tips outside it
  const TIPS = [[676, -128, 50, 21, 3, -1], [716, -150, 44, 19, -3, 1], [744, -118, 56, 23, 4, -1], [768, -146, 46, 20, -2, 1], [790, -112, 52, 22, 3, -1],
    [818, -128, 42, 18, -3, 1], [1214, -74, 46, 20, 3, 1], [1252, -98, 54, 22, -4, -1], [1296, -66, 48, 20, 3, 1]];
  const tipAt = (x) => { const y = sil(x); return x < XS ? [flank(y) + 9, y + 7] : [x, y + 9]; };
  const INNER = [[742, 1118, -32, 62, 26, 5, 1], [826, 968, -58, 58, 24, -4, -1], [868, 1126, -24, 66, 27, 4, 1], [1226, 948, -128, 60, 25, 4, -1],
    [1284, 1076, -150, 64, 26, -5, 1], [1196, 1146, -36, 58, 24, 3, -1], [884, 868, -70, 50, 21, 3, 1]];

  const A = once('all', () => {
    const a = {};
    const base = [
      { color: G0, coverage: 0.985, size: 40, even: true, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(60, 34, inside(x, y)) },
      { color: G0, coverage: 0.985, size: 92, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(26, 52, inside(x, y)) },
    ];
    const coat = [
      // the FOOT: deep green, darkest where it meets the hedge
      { color: DEEP, coverage: 0.9, size: 56, stamps: 'body', pores: 0.4, maskFn: below(Z1), patch: { scale: 170, amount: 0.12 } },
      { color: DARK, coverage: 0.5, size: 44, stamps: 'open', pores: 0.3, maskFn: below(Z1 - 0.1, 0.06), patch: { scale: 130, amount: 0.34, sharp: 0.3 } },
      { color: P('hedge_dark'), coverage: 0.3, size: 34, stamps: 'open', maskFn: below(Z1 - 0.22, 0.06), patch: { scale: 110, amount: 0.4 } },
      // the FACE: mid green in clumps
      { color: '#44916A', coverage: 0.5, size: 50, stamps: 'body', pores: 0.5, maskFn: zone(Z1, Z2), patch: { scale: 150, amount: 0.3, sharp: 0.3, seed: 31 } },
      { color: DEEP, coverage: 0.16, size: 36, stamps: 'open', maskFn: zone(Z1, Z2 - 0.1), patch: { scale: 120, amount: 0.5 } },
      // the CROWN and upper slope: a clear step lighter (still green: the yellow lights come with the far light)
      { color: '#56A072', coverage: 0.9, size: 50, stamps: 'body', pores: 0.4, maskFn: above(Z2), patch: { scale: 170, amount: 0.1 } },
      { color: '#69AE78', coverage: 0.5, size: 38, stamps: 'body', pores: 0.4, maskFn: above(Z2 + 0.1, 0.05), patch: { scale: 140, amount: 0.3, sharp: 0.3, seed: 31 } },
      // powdery frontiers: each tone sprays a little into its neighbour
      { color: DEEP, coverage: 0.1, size: 44, stamps: 'speck', maskFn: zone(Z1 + 0.02, Z1 + 0.12, 0.03) },
      { color: '#44916A', coverage: 0.1, size: 44, stamps: 'speck', maskFn: zone(Z1 - 0.12, Z1 - 0.02, 0.03) },
      { color: '#56A072', coverage: 0.1, size: 44, stamps: 'speck', maskFn: zone(Z2 - 0.12, Z2 - 0.02, 0.03) },
      { color: '#3F8A62', coverage: 0.09, size: 40, stamps: 'speck', maskFn: zone(Z2 + 0.02, Z2 + 0.12, 0.03) },
      { color: P('primer'), coverage: 0.04, size: 20, stamps: 'soft', maskFn: (x, y) => ss(90, 10, dTop(x, y)), patch: { scale: 110, amount: 0.6 } },
    ];
    const f = field({ box: BOX, depth, seed: 2201, edge: 0.5, layers: [...base, ...coat], k: 1.25,
      reveal: { steps: 2, order: 'sweep', angle: -Math.PI / 2, jitter: 0.16, dab: 150 } });
    {
      const c = f.painted.final.ctx;
      c.save();
      c.translate(-BOX[0], -BOX[1]);
      // leaf tips first (behind the mass, so only what breaks the contour shows) ...
      c.globalCompositeOperation = 'destination-over';
      TIPS.forEach(([x, rot, len, wid, bend, side], i) => {
        const [px, py] = tipAt(x), hi = relief(px, py + 30) > Z2 - 0.1;
        leaf(len, wid, bend, 2230 + i, hi ? '#3E8A5C' : '#2A6E4C', hi ? '#56A072' : '#3B8760', hi ? '#7DBB80' : '#4B9870', side).draw(c, px, py, { rot: rot * DEG });
      });
      // ... then the base colour under the dabs: opaque inside (the engine does the same for stencils with a base)
      c.fillStyle = G0;
      c.beginPath();
      c.moveTo(BOX[2] + 2, BOX[3] + 2);
      for (let x = BOX[2] + 2; x >= XS - 40; x -= 6) c.lineTo(x, sil(x) + 18);
      for (let y = sil(XS - 40) + 22; y <= BOX[3] + 2; y += 6) c.lineTo(flank(y) + lump(0, y) + 24, y);
      c.lineTo(flank(BOX[3]) + 24, BOX[3] + 2);
      c.closePath();
      c.fill();
      // tone-on-tone leaves lying in the face: one small tone step off their ground, a powdery lighter half
      c.globalCompositeOperation = 'source-atop';
      INNER.forEach(([x, y, rot, len, wid, bend, side], i) => {
        const r = relief(x, y), g = r > Z2 ? '#56A072' : r > Z1 ? G0 : DEEP;
        leaf(len, wid, bend, 2250 + i, E.tone(g, -0.045), E.tone(g, 0.02), E.tone(g, 0.08), side).draw(c, x, y, { rot: rot * DEG, alpha: 0.9 });
      });
      c.restore();
    }
    a.knoll = f;

    // --- the crown and the upper slope in the far light (with its last pass): yellow-green lights in clumps,
    //     pale yellow along the rim, a few warm ones — and the crown's leaf tips catch it
    const LITP = { scale: 140, amount: 0.24, sharp: 0.3, seed: 47 };
    const rimK = (x, y) => ss(70, 6, dTop(x, y)) * ss(0, 60, dSide(x, y) - 10 + (y < PLAT + 10 ? 200 : 0));
    a.lit = field({ box: BOX, depth, seed: 2202, edge: 0.5, k: 1.25, reveal: { steps: 1 }, layers: [
      { color: '#7DBB80', coverage: 0.66, size: 46, stamps: 'body', pores: 0.4, maskFn: above(Z2 - 0.02), patch: LITP },
      { color: kc[2], coverage: 0.66, size: 36, stamps: 'body', pores: 0.3, maskFn: above(Z2 + 0.1, 0.05), patch: { ...LITP, amount: 0.3 } },
      { color: '#CDE49A', coverage: 0.5, size: 24, stamps: 'body', maskFn: (x, y) => above(Z2 + 0.2, 0.05)(x, y) * ss(110, 20, dTop(x, y)), patch: { ...LITP, amount: 0.4 } },
      { color: '#E6EDA6', coverage: 0.34, size: 17, stamps: 'body', maskFn: rimK, patch: { ...LITP, scale: 90, amount: 0.46 } },
      { color: '#7DBB80', coverage: 0.1, size: 40, stamps: 'speck', maskFn: zone(Z2 - 0.16, Z2 - 0.02, 0.03) },
      { color: '#69AE78', coverage: 0.2, size: 34, stamps: 'open', maskFn: zone(Z1 + 0.12, Z2 - 0.02, 0.05), patch: { scale: 130, amount: 0.5, seed: 47 } },
      { color: '#F5E2A6', coverage: 0.1, size: 16, stamps: 'soft', maskFn: (x, y) => ss(34, 4, dTop(x, y)) * ss(880, 960, x) },
    ] });
    {
      const c = a.lit.painted.final.ctx;
      c.save();
      c.translate(-BOX[0], -BOX[1]);
      c.globalCompositeOperation = 'destination-over';
      TIPS.forEach(([x, rot, len, wid, bend, side], i) => {
        const [px, py] = tipAt(x);
        if (relief(px, py + 30) > Z2 - 0.1) leaf(len, wid, bend, 2230 + i, '#5FA36A', '#8CC383', '#CDE49A', side).draw(c, px, py, { rot: rot * DEG });
      });
      c.restore();
    }

    // --- the grass fringe of the rim, drawn after the buildings: tufts along the plateau's front edge
    const FB = [840, PLAT - 30, X1, PLAT + 52 + 64];                 // (the crown rolls 55 px down toward the frame's edge)
    const tuft = (x) => 5 * Math.sin(x / 13) + 3 * Math.sin(x / 5.3 + 1) + 2.5 * Math.sin(x / 31 + 2);
    const fd = (x, y) => clamp(Math.min((y - (sil(x) - 3 + tuft(x))) / 12, (sil(x) + 46 - y) / 30, (x - 846) / 26));
    a.fringe = field({ box: FB, depth: fd, seed: 2203, edge: 0.55, k: 1.25, reveal: { steps: 1 }, layers: [
      { color: '#4B9870', coverage: 0.94, size: 24, pores: 0.3, tint: 0.03 },
      { color: '#69AE78', coverage: 0.62, size: 20, stamps: 'body', pores: 0.3, patch: { scale: 70, amount: 0.3 } },
      { color: kc[2], coverage: 0.56, size: 16, stamps: 'body', maskFn: (x, y) => ss(sil(x) + 20, sil(x) + 2, y), patch: { scale: 60, amount: 0.34 } },
      { color: '#D3E6A0', coverage: 0.3, size: 11, stamps: 'open', maskFn: (x, y) => ss(sil(x) + 10, sil(x) - 2, y), patch: { scale: 50, amount: 0.44 } },
      { color: '#2D7257', coverage: 0.22, size: 15, stamps: 'open', maskFn: (x, y) => ss(sil(x) + 8, sil(x) + 30, y), patch: { scale: 60, amount: 0.4 } },
    ] });

    // --- warm mist along the foot of the knoll: MIST, not ground — a thin, broken veil of pale gold-rose wisps
    //     (long lens shapes at different heights, translucent, full of pores) lying IN FRONT of the knoll's deep
    //     foot, which shows through it and joins the hedge between the wisps. No cream, no white: its lightest
    //     tone is a pale gold. It is CUT at the light floor (nothing light below it while a gloss is up) and
    //     keeps clear of the rug's fringe (y 1103).
    const MB = K.base_mist;
    // density: 1 low at the foot, thinning upward to a wavering top (y ~1105–1150) that hangs in three long wisps
    const mTop = (x) => 1100 + 18 * Math.sin(x / 96 + 2.2) + 9 * Math.sin(x / 41 + 0.6) + 4 * Math.sin(x / 17);
    const dens = (x, y) => clamp((y - mTop(x)) / 92) * ss(MB.x0 - 80, MB.x0 + 40, x) * (0.66 + 0.34 * Math.sin(x / 74 + 1.1) ** 2);
    const mBox = [MB.x0 - 90, MB.y0 - 70, Math.min(MB.x1 + 40, X1), FLOOR + 40];
    {
      const [x0, y0, x1, y1] = mBox;
      const sh = (fn) => (x, y) => fn(x + x0, y + y0);
      const c = E.clusterDabs({ w: x1 - x0, h: y1 - y0, seed: 2204, edgeSoftness: 0.95, anchor: [0, 0], shapeFn: sh((x, y) => clamp(dens(x, y) * 1.5 + 0.03)), layers: [
        // a veil, like tomorrow's mist — only warm: translucent lacy prints of gold-rose, pale gold powder in it, a
        // little light where it is densest; the knoll's deep foot shows through all of it
        { color: '#E6B4A4', coverage: 0.5, size: 76, stamps: 'airy', opacity: [0.4, 0.62], maskFn: sh((x, y) => ss(0.05, 0.45, dens(x, y))) },
        { color: '#EFCBA2', coverage: 0.56, size: 62, stamps: 'airy', opacity: [0.5, 0.72], maskFn: sh((x, y) => ss(0.25, 0.7, dens(x, y))), patch: { scale: 160, amount: 0.16 } },
        { color: '#EFCBA2', coverage: 0.2, size: 60, stamps: 'speck', opacity: [0.6, 0.9], maskFn: sh((x, y) => ss(0.0, 0.3, dens(x, y))) },
        { color: '#F5DDAE', coverage: 0.5, size: 48, stamps: 'soft', opacity: [0.6, 0.85], maskFn: sh((x, y) => ss(0.5, 0.9, dens(x, y))), patch: { scale: 120, amount: 0.24 } },
        { color: '#E6B4A4', coverage: 0.1, size: 50, stamps: 'speck', opacity: [0.6, 0.9] },
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
    if (on(t, LIT_T)) A.lit.draw(ctx);
    // the mist at its foot: there from the first step, complete with the second; it drifts a few px
    const dx = 5 * Math.sin((t - 16.6) * 0.7);
    ctx.save();
    ctx.translate(dx, 0);
    A.mist.draw(ctx, A.mistAt[0], A.mistAt[1], { p });
    ctx.restore();
  }
  /** in front of the buildings: the grass their bases stand in, then the door's light */
  function drawFront(ctx, t) {
    if (!on(t, LIT_T)) return;
    A.fringe.draw(ctx);
    if (on(t, T.rug.spill)) A.spill.draw(ctx);
  }
  return { drawBack, drawFront, sil, flank, sprites: A, box: BOX };
}
