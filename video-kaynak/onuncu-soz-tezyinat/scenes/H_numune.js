/* =============================================================================
 * H_numune · 37.60–47.80 · "samples; images of other things; they turn the customers' gazes to their originals"
 * -----------------------------------------------------------------------------
 * PLAN (world = L3 coords; at the rest camera (540,960) zoom 1 → world == screen)
 *  Layers  L0 sky p.05 · dusk gradient #120A22→#241634→#4A2A45→#7A3E4C, stars, radiance at the end
 *          L1 far p.25 · warm haze + the 9 ORIGINALS, immense (rose ≈ 1000 px at the wide shot, 8–20× the
 *             samples), soft luminous line-and-glow forms rising behind the rooftops and seen through the
 *             vitrine's open back glass; 4 heroes (rose, butterfly, tulip, pomegranate), 5 faint
 *          L2 p.6 distant skyline + luminous mist on the rooftops · cloud banks p.55/1.3–1.45 (final tilt only)
 *          L3 p1 · our shop (A.archGate w1000 h970, opening x141–939 y300–1150, A.lattice tympanum, shelves,
 *             9 A.bellJar samples, 3 A.hangingLantern on the eave) between two darker neighbour shops,
 *             tiled roofs, plinth, perspective setts with puddles reflecting the lit shop
 *          FG · blurred walnut counter rising into the foot band in the wide shots (lantern reflections)
 *          L5 screen · kafes lattice rushing past 37.60–38.03 (covers ~85 % of the frame at 37.60)
 *  CAMERA (log-zoom keys) 37.6 z1.03 → 37.88 z1 (contract framing) → 38.86 z1.08 settle → 38.86–39.6 push in
 *          to the rose jar z2.05, framed low + RACK FOCUS → 39.66–40.95 eased pull-back to the wide hold z0.6
 *          (shop low, originals uncropped in y 160–590, plinth under the gloss line) → hold to 45.9 with lateral
 *          sway (z 0.6→0.62) → 45.9–47.9 tilt up 2200 at constant zoom through opaque clouds coming from above.
 *  BEATS   37.60 crisp walnut kafes with a straight-edged star frame (continues G's push) scaling past the edges ·
 *          38.36+0.07·rank ghosts fill in, domes set down, tags swing (new ghosts only appear after the flights) ·
 *          38.84 spec sweep · 39.0/.25/.5 lanterns · 39.7 originals appear huge behind the back glass and rise
 *          into the sky as the camera pulls back · 40.80 projection lines (heroes, only onto visible originals) ·
 *          41.39 solidify · 43.38 12 gaze filaments from the L/R edges (y 980–1180) · 44.06 focus · 44.76 prism:
 *          a 4-colour ribbon rises from each jar's knob along its own lane (never across a jar above) ·
 *          45.30–45.95 each gaze filament MORPHS (outCubic) into its jar's beam: knob → lane → its own original,
 *          which ignites where the beam lands · 45.95+ beams rise from the originals to the meeting point ·
 *          46.85 the gate traces on (pointed arch bright, frame at 25 %), originals fade to ≤ 0.2 ·
 *          47.42–47.80 fly through the arch (vertical-gradient fill) into #FFFDF7.
 *  Band    smooth gloss envelope (no booleans): band shows plinth + dark wet setts, scrim ≤ 0.2.
 * ========================================================================== */
(function () {
  'use strict';
  const W = E.W, H = E.H, TAU = Math.PI * 2, PI = Math.PI;
  const clamp = E.clamp, lerp = E.lerp, sm = E.smooth;
  const pp = (t, a, b, e) => E.p(t, a, b, e || 'inOutCubic');
  const T0 = 37.6, T1 = 47.8;

  /* ---------------- timing ---------------- */
  const T_LAND0 = 38.36, T_SPEC = 38.84, T_LANT = [39.0, 39.25, 39.5];
  const T_ORIG = 39.7, T_LINES = 40.8, T_SOLID = 41.39, T_SOLID1 = 42.07;
  const T_FIL = 43.38, T_FOCUS = 44.06, T_PRISM = 44.76, T_TURN = 45.3, T_BEND = 0.65;
  const T_TILT0 = 45.9, T_TILT1 = 47.9, T_GATE = 46.85, T_PASS = 47.42;
  const PF = 0.25, PS = 0.6, TILT = 2200;     // far plane / distant skyline parallax; TILT = world units of the final rise

  /* ---------------- camera (log-zoom keyframes) ---------------- */
  const KZ = [[37.6, 1.03], [37.88, 1.0, 'outCubic'], [38.86, 1.08, 'inOutSine'], [39.6, 2.05, 'inOutCubic'], [39.66, 2.06, 'linear'],
    [40.95, 0.6, 'inOutSine'], [43.07, 0.61, 'linear'], [44.45, 0.62, 'inOutSine'], [45.9, 0.62, 'linear']];
  const KY = [[37.6, 960], [37.88, 960], [38.86, 905, 'inOutSine'], [39.6, 818, 'inOutCubic'], [39.66, 818, 'linear'],
    [40.95, 651, 'inOutSine'], [43.07, 653, 'linear'], [44.45, 655, 'inOutSine'], [45.9, 655, 'linear']];
  const KX = [[37.6, 540], [40.95, 540], [42.0, 556, 'inOutSine'], [43.07, 528, 'inOutSine'], [44.45, 548, 'inOutSine'], [45.9, 540, 'inOutSine']];
  function key(K, t, log) {
    if (t <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) if (t <= K[i][0]) {
      const a = K[i - 1], b = K[i], u = E.ease[b[2] || 'inOutCubic'](clamp((t - a[0]) / (b[0] - a[0])));
      return log ? Math.exp(lerp(Math.log(a[1]), Math.log(b[1]), u)) : lerp(a[1], b[1], u);
    }
    return K[K.length - 1][1];
  }
  function camAt(t) {
    const tilt = pp(t, T_TILT0, T_TILT1, 'inOutCubic');
    const z = key(KZ, t, true);                                   // zoom held during the rise
    const y = key(KY, t) - TILT * tilt + 4 * Math.sin(0.29 * t + 1) + 2 * Math.sin(0.83 * t);
    const x = key(KX, t) + 6 * Math.sin(0.37 * t) + 3 * Math.sin(0.71 * t + 2);
    return { x, y, zoom: z, rot: (0.18 * PI / 180) * Math.sin(0.21 * t), tilt };
  }
  const focusBlur = (t) => 10 * pp(t, 39.0, 39.45, 'inOutSine') * (1 - pp(t, 39.62, 39.95, 'inOutSine'));
  /* smooth gloss envelope (never a boolean): ramps over [in−.35, in−.1] and [out+.35, out+.6] */
  function glossK(t) {
    if (!window.TIMING) return 0;
    let k = 0;
    for (const g of TIMING.glosses) k = Math.max(k, sm((t - (g.in - 0.35)) / 0.25) * (1 - sm((t - (g.out + 0.35)) / 0.25)));
    return k;
  }
  const lp = (cam, p) => ({ cx: 540 + (cam.x - 540) * p, cy: 960 + (cam.y - 960) * p, z: 1 + (cam.zoom - 1) * p, r: cam.rot * p });
  function scr(L, x, y) {
    let dx = (x - L.cx) * L.z, dy = (y - L.cy) * L.z;
    if (L.r) { const c = Math.cos(L.r), s = Math.sin(L.r), ex = dx * c - dy * s; dy = dx * s + dy * c; dx = ex; }
    return [540 + dx, 960 + dy];
  }
  function unscr(L, sx, sy) {
    let dx = sx - 540, dy = sy - 960;
    if (L.r) { const c = Math.cos(-L.r), s = Math.sin(-L.r), ex = dx * c - dy * s; dy = dx * s + dy * c; dx = ex; }
    return [L.cx + dx / L.z, L.cy + dy / L.z];
  }
  function inL(ctx, L, fn) { ctx.save(); ctx.translate(540, 960); if (L.r) ctx.rotate(L.r); ctx.scale(L.z, L.z); ctx.translate(-L.cx, -L.cy); fn(ctx); ctx.restore(); }

  /* ---------------- arch geometry (same maths as A.archGate) ---------------- */
  function archSide(hw, ys, apexY, sgn, n = 26) {
    const archH = ys - apexY, P0 = [sgn * hw, ys], P1 = [sgn * hw, ys - archH * 0.56], P2 = [sgn * hw * 0.42, apexY + archH * 0.16], P3 = [0, apexY], out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, a = (1 - u) ** 3, b = 3 * u * (1 - u) ** 2, c = 3 * u * u * (1 - u), d = u ** 3;
      out.push([a * P0[0] + b * P1[0] + c * P2[0] + d * P3[0], a * P0[1] + b * P1[1] + c * P2[1] + d * P3[1]]);
    }
    return out;
  }
  function archGeom(w, h) {
    const ft = w * 0.075, hw = w / 2 - ft * 1.35, apexY = -h + ft * 1.6, archH = hw * 1.28, ys = apexY + archH;
    const L = archSide(hw, ys, apexY, -1), R = archSide(hw, ys, apexY, 1).reverse();
    return { ft, hw, apexY, ys, open: [[-hw, 0]].concat(L, R.slice(1), [[hw, 0]]) };
  }
  const polyP = (pts, ox = 0, oy = 0, s = 1) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(ox + q[0] * s, oy + q[1] * s) : p.moveTo(ox + q[0] * s, oy + q[1] * s))); p.closePath(); return p; };
  const AR = { x: 540, y: 1150, w: 1000, h: 970 }, AG = archGeom(AR.w, AR.h);
  const OPEN_PATH = polyP(AG.open, AR.x, AR.y);
  const GT = { w: 440, h: 680 }, GG = archGeom(GT.w, GT.h);     // luminous gate (handoff to I)

  /* ---------------- jars & samples ---------------- */
  const COLX = [310, 540, 770], ROWY = [705, 925, 1145];
  const JW = 124, JH = 178, JRW = JW / 2, JBH = JH * 0.075, JS = 0.16;
  const BRASS = (ctx, x0, x1, a = 1) => E.lin(ctx, x0, 0, x1, 0, [[0, '#5E3E14', a], [0.22, '#E8C27A', a], [0.36, '#FFF0C0', a], [0.55, '#C99A4A', a], [0.82, '#8A6428', a], [1, '#4A3010', a]]);
  const ROSE_STEM = { len: 60, sway: 0.35, leaves: 1, thorns: 2, width: 3.3 };
  const roseHead = (x, t, pose, variant) => E.at(x, 0, -24, 1, 0, () => {
    const tip = A.stemTip(Object.assign({}, ROSE_STEM, { t: pose ? 0 : t, sway: pose ? 0 : ROSE_STEM.sway }));
    E.at(x, tip.x, tip.y, 1, tip.angle, () => A.heroRose(x, { R: 27, bloom: 1, t: pose ? 0 : t, variant: variant || 'normal' }));
  });
  /* OL = the original's layout at the WIDE reference shot (screen x, y, max size px, rot, hero) */
  const ITEMS = [
    { key: 'butterfly', r: 0, c: 0, g: [277, 589, 1.96], stand: 'rod', rod: 66, OL: [170, 255, 270, -0.16, 1],
      art: (x, t, pose) => E.at(x, 0, -82, 1, -0.05, () => A.butterfly(x, { size: 31, t: pose ? 0 : t, pattern: 'sapphire', flap: pose ? 0.96 : 0.9 + 0.08 * Math.sin(t * 1.25) })) },
    { key: 'peacock', r: 0, c: 1, g: [540, 587, 1.27], stand: 'cup', OL: [405, 150, 120, 0.15, 0],
      art: (x, t, pose) => E.at(x, 0, -9, 1, 0.07, () => A.peacockFeather(x, { len: 128, t: pose ? 0 : t, sway: pose ? 0 : 0.5 })) },
    { key: 'snowflake', r: 0, c: 2, g: [803, 589, 1.79], stand: 'rod', rod: 50, OL: [725, 150, 90, 0, 0],
      art: (x, t, pose) => E.at(x, 0, -84, 1, 0, () => A.snowflake(x, { r: 33, t: pose ? 0 : t })) },
    { key: 'carnation', r: 1, c: 0, g: null, stand: 'vase', OL: [52, 515, 125, -0.1, 0],
      art: (x, t, pose) => E.at(x, 0, -24, 1, 0, () => A.flowerSet(x, { type: 'carnation', size: 29, stem: 62, t: pose ? 0 : t, sway: pose ? 0 : 0.45, phase: 1.3 })) },
    { key: 'rose', r: 1, c: 1, g: null, stand: 'vase', OL: [540, 385, 530, 0, 1],
      art: (x, t, pose) => E.at(x, 0, -24, 1, 0, () => {
        const tip = A.stem(x, Object.assign({}, ROSE_STEM, { t: pose ? 0 : t, sway: pose ? 0 : ROSE_STEM.sway }));
        E.at(x, tip.x, tip.y, 1, tip.angle, () => A.heroRose(x, { R: 27, bloom: 1, t: pose ? 0 : t }));
      }),
      oart: (x, t, pose) => roseHead(x, t, pose) },
    { key: 'tulip', r: 1, c: 2, g: [803, 843, 1.51], stand: 'vase', OL: [935, 355, 370, 0.04, 1],
      art: (x, t, pose) => E.at(x, 0, -24, 1, 0, () => A.flowerSet(x, { type: 'tulip', size: 31, stem: 60, t: pose ? 0 : t, sway: pose ? 0 : 0.45, phase: 2.1 })) },
    { key: 'nautilus', r: 2, c: 0, g: [277, 843, 1.59], stand: 'dish', OL: [290, 122, 80, -0.2, 0],
      art: (x, t, pose) => E.at(x, 0, -47, 1, pose ? 0 : 0.02 * Math.sin(t * 0.7), () => A.nautilus(x, { r: 36 })) },
    { key: 'pomegranate', r: 2, c: 1, g: [540, 843, 1.68], stand: 'dish', OL: [238, 510, 170, 0.08, 1],
      art: (x, t, pose) => E.at(x, 0, -40, 1, 0, () => A.pomegranate(x, { r: 31, t: pose ? 0 : t })) },
    { key: 'cherries', r: 2, c: 2, g: null, stand: 'dish', OL: [1012, 125, 85, 0.1, 0],
      art: (x, t, pose) => E.at(x, 0, -54, 1, pose ? 0 : 0.03 * Math.sin(t * 0.9 + 1), () => A.cherries(x, { size: 74 })) },
  ];
  ITEMS.forEach((it, i) => { it.i = i; it.jx = COLX[it.c]; it.jy = ROWY[it.r]; it.fy = it.jy - JBH; it.d = Math.hypot(it.c - 1, (it.r - 1) * 0.95); it.hero = it.OL[4]; });
  ITEMS.slice().sort((a, b) => a.d - b.d || a.r - b.r || a.c - b.c).forEach((it, k) => { it.rank = k; it.tLand = T_LAND0 + 0.07 * k; });
  const byKey = {}; ITEMS.forEach((it) => (byKey[it.key] = it));
  const ROSE = byKey.rose;
  /* projection lines (heroes only): contour angles */
  const PLINES = { rose: [PI, -0.75 * PI, -0.5 * PI, -0.25 * PI, 0], butterfly: [PI, -0.6 * PI, -0.1 * PI], tulip: [-0.85 * PI, -0.5 * PI, 0], pomegranate: [0.9 * PI, -0.5 * PI, -0.05 * PI] };

  /* 12 gaze filaments: [side (-1 = enters from left), target, entry screen y] */
  const FILS = [
    [-1, 'butterfly', 992], [1, 'snowflake', 998], [-1, 'carnation', 1062], [1, 'tulip', 1070],
    [-1, 'rose', 1112], [1, 'rose', 1104], [-1, 'nautilus', 1150], [1, 'cherries', 1158],
    [-1, 'peacock', 1030], [1, 'peacock', 1022], [-1, 'pomegranate', 1172], [1, 'pomegranate', 1166],
  ].map((f, k) => ({ side: f[0], it: byKey[f[1]], ey: f[2], k, ta: T_FIL + 0.05 * k + 0.42 }));
  const HAIR = ['#FF6F91', '#FFD27A', '#6FF0FF', '#B48CFF'], HAIR_D = [-1.5, -0.5, 0.5, 1.5];
  /* lanes (world x) through the vitrine so no beam ever crosses a jar above it; target contour angle on the original */
  const LANE = { butterfly: 310, peacock: 540, snowflake: 770, carnation: 222, rose: 642, tulip: 858, nautilus: 412, pomegranate: 442, cherries: 672 };
  const AIM = { butterfly: 0.3 * PI, rose: 0.5 * PI, tulip: 0.5 * PI, pomegranate: 0.05 * PI };
  FILS.forEach((f) => { f.primary = !FILS.some((g) => g.it === f.it && g.k < f.k); });

  /* lanterns hang from our eave (L3) */
  const LANTS = [{ x: 205, y: 140, size: 100, ph: 0.0 }, { x: 540, y: 140, size: 108, ph: 1.9 }, { x: 875, y: 140, size: 100, ph: 3.7 }];

  /* ---------------- sprites (setup) ---------------- */
  const SP = {};
  function spriteWorld(x0, y0, w, h, k, fn) { const b = E.canvas(Math.ceil(w * k), Math.ceil(h * k)); b.x.scale(k, k); b.x.translate(-x0, -y0); fn(b.x); return { c: b.c, x0, y0, w, h }; }
  const drawSpr = (ctx, s) => ctx.drawImage(s.c, s.x0, s.y0, s.w, s.h);

  function masonry(x, x0, x1, y0, y1, c0, c1, seed) {
    x.fillStyle = E.lin(x, 0, y0, 0, y1, [[0, c0], [1, c1]]); x.fillRect(x0, y0, x1 - x0, y1 - y0);
    for (let y = y0 + 34, i = 0; y < y1 - 10; y += 58, i++) {
      x.fillStyle = 'rgba(120,70,96,0.09)'; x.fillRect(x0, y, x1 - x0, 13);
      x.fillStyle = 'rgba(10,4,12,0.16)'; x.fillRect(x0, y + 13, x1 - x0, 2);
      x.fillStyle = 'rgba(10,4,12,0.10)';
      for (let jx = x0 + ((i * 29 + seed) % 61); jx < x1; jx += 61) x.fillRect(jx, y + 15, 2, Math.min(43, y1 - y - 15));
    }
  }
  function roofRun(x, x0, x1, ridge, eaveTop, eaveBot, corbels) {
    x.fillStyle = E.lin(x, 0, eaveBot, 0, eaveBot + 210, [[0, '#0E0610', 0.62], [1, '#0E0610', 0]]); x.fillRect(x0, eaveBot, x1 - x0, 210);
    x.fillStyle = E.lin(x, 0, ridge, 0, eaveTop, [[0, '#1C1020'], [1, '#34202C']]); x.fillRect(x0, ridge, x1 - x0, eaveTop - ridge + 4);
    const rows = Math.max(1, Math.round((eaveTop - ridge) / 30)), rh = (eaveTop - ridge) / rows;
    for (let r = 0; r < rows; r++) {
      const yb = eaveTop + 4 - r * rh;
      for (let cx = x0 + (r % 2) * 15; cx < x1 + 15; cx += 30) {
        x.fillStyle = E.lin(x, 0, yb - rh, 0, yb, [[0, '#2A1824'], [0.8, '#4A2E3A'], [1, '#5E3A44']]);
        x.beginPath(); x.moveTo(cx - 15, yb - rh - 6); x.lineTo(cx - 15, yb - 8); x.quadraticCurveTo(cx, yb + 4, cx + 15, yb - 8); x.lineTo(cx + 15, yb - rh - 6); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(8,3,8,0.5)'; x.lineWidth = 1.4; x.stroke();
      }
    }
    x.fillStyle = E.lin(x, 0, ridge - 14, 0, ridge + 2, [[0, '#6A4450'], [1, '#24141E']]); x.fillRect(x0, ridge - 14, x1 - x0, 16);
    x.fillStyle = 'rgba(255,196,170,0.28)'; x.fillRect(x0, ridge - 14, x1 - x0, 2);
    x.fillStyle = E.lin(x, 0, eaveTop, 0, eaveBot, [[0, '#4A2E1E'], [0.35, '#5E3B26'], [1, '#22130C']]); x.fillRect(x0, eaveTop, x1 - x0, eaveBot - eaveTop);
    x.fillStyle = 'rgba(255,214,160,0.16)'; x.fillRect(x0, eaveTop + 2, x1 - x0, 2);
    x.fillStyle = 'rgba(201,154,74,0.5)'; x.fillRect(x0, eaveBot - 9, x1 - x0, 2.5);
    if (corbels) for (let cx = x0 + 40; cx < x1 - 20; cx += 120) {
      const p = new Path2D(); p.moveTo(cx - 12, eaveBot); p.lineTo(cx + 12, eaveBot); p.lineTo(cx + 12, eaveBot + 9); p.bezierCurveTo(cx + 12, eaveBot + 24, cx + 4, eaveBot + 28, cx + 3, eaveBot + 38); p.lineTo(cx - 3, eaveBot + 38); p.bezierCurveTo(cx - 4, eaveBot + 28, cx - 12, eaveBot + 24, cx - 12, eaveBot + 9); p.closePath();
      x.fillStyle = E.lin(x, cx - 12, 0, cx + 12, 0, [[0, '#5E3B26'], [0.5, '#3E2618'], [1, '#1E100A']]); x.fill(p);
    }
  }
  function litWindow(x, x0, y0, w, h, glow) {      // a neighbour's pointed window, warm interior + lattice
    const g = archGeom(w * 1.25, h * 1.12), open = polyP(g.open.map(([a, b]) => [a * (w / 2) / g.hw, b * h / -g.apexY]), x0 + w / 2, y0 + h);
    x.fillStyle = '#2A160E'; x.save(); x.translate(0, 0); x.lineWidth = 16; x.strokeStyle = '#3E2618'; x.stroke(open); x.restore();
    x.save(); x.clip(open);
    x.fillStyle = E.rad(x, x0 + w / 2, y0 + h * 0.6, 10, h * 0.8, [[0, '#FFC890', glow], [0.5, '#C8705A', glow * 0.7], [1, '#4A2430', 1]]); x.fillRect(x0, y0, w, h);
    A.lattice(x, { x: x0, y: y0, w, h, cell: 34, lineW: 4, stroke: '#3A2416' });
    x.restore();
    x.strokeStyle = 'rgba(201,154,74,0.6)'; x.lineWidth = 2; x.stroke(open);
    x.fillStyle = '#4A2E1E'; x.fillRect(x0 - 14, y0 + h, w + 28, 12); x.fillStyle = 'rgba(255,214,160,0.2)'; x.fillRect(x0 - 14, y0 + h, w + 28, 2);
  }

  function buildFacade() {
    // wide street front: left neighbour | our shop | right neighbour.  World x −620..1700, y −140..1262
    SP.facade = spriteWorld(-620, -140, 2320, 1402, 1.0, (x) => {
      // left neighbour (closed shutters, dim transom)
      masonry(x, -620, 0, 150, 1150, '#2B192D', '#41273C', 7);
      roofRun(x, -620, 0, 44, 110, 150, true);
      x.fillStyle = '#24141C'; x.fillRect(-405, -40, 42, 90); x.fillStyle = '#3E2836'; x.fillRect(-412, -48, 56, 12);
      x.fillStyle = E.lin(x, -560, 0, -70, 0, [[0, '#2A1810'], [0.5, '#3A2218'], [1, '#22140C']]); x.fillRect(-560, 330, 490, 820);
      x.fillStyle = 'rgba(10,4,4,0.55)'; for (let px = -560; px < -70; px += 24) x.fillRect(px, 330, 2, 820);
      for (let px = -536; px < -70; px += 48) { x.fillStyle = E.lin(x, 0, 330, 0, 1150, [[0, '#FFB070', 0.05], [0.5, '#FFB070', 0.22], [1, '#FFB070', 0.06]]); x.fillRect(px, 330, 2, 820); }
      x.fillStyle = E.rad(x, -315, 1150, 0, 300, [[0, '#FFA060', 0.16], [1, '#FFA060', 0]]); x.fillRect(-615, 850, 600, 300);
      x.fillStyle = '#1A100C'; for (const y of [440, 760, 1060]) x.fillRect(-560, y, 490, 9);
      x.fillStyle = 'rgba(201,154,74,0.5)'; for (const y of [440, 760, 1060]) for (let px = -548; px < -70; px += 48) { x.beginPath(); x.arc(px, y + 4.5, 2.2, 0, TAU); x.fill(); }
      x.fillStyle = '#4A2E1E'; x.fillRect(-575, 308, 520, 24); x.fillStyle = 'rgba(201,154,74,0.55)'; x.fillRect(-575, 328, 520, 2);
      litWindow(x, -420, 196, 200, 100, 0.42);
      // right neighbour (two warm windows)
      masonry(x, 1080, 1700, 118, 1150, '#30203A', '#47293F', 13);
      roofRun(x, 1080, 1700, -8, 74, 118, true);
      x.fillStyle = '#24141C'; x.fillRect(1560, -110, 40, 110); x.fillStyle = '#3E2836'; x.fillRect(1553, -118, 54, 12);
      litWindow(x, 1150, 420, 210, 560, 0.62); litWindow(x, 1440, 420, 210, 560, 0.5);
      // our shop
      masonry(x, 0, 1080, 140, 1150, '#3A2238', '#5A3346', 3);
      roofRun(x, -10, 1090, 26, 96, 140, false);
      // pilasters between shops
      for (const px of [-20, 1060]) { x.fillStyle = E.lin(x, px, 0, px + 40, 0, [[0, '#4A2C40'], [0.4, '#6A4258'], [1, '#2E1A28']]); x.fillRect(px, 140, 40, 1010); }
      // plinth
      x.fillStyle = E.lin(x, 0, 1150, 0, 1262, [[0, '#5A3448'], [0.18, '#4A2A40'], [1, '#2E1A2A']]); x.fillRect(-620, 1150, 2320, 112);
      x.fillStyle = '#6E4458'; x.fillRect(-620, 1150, 2320, 9); x.fillStyle = 'rgba(255,220,190,0.16)'; x.fillRect(-620, 1150, 2320, 2);
      x.fillStyle = 'rgba(10,4,12,0.35)'; x.fillRect(-620, 1159, 2320, 4);
      for (let k = -4; k < 13; k++) { x.fillStyle = 'rgba(10,4,12,0.18)'; x.fillRect(k * 136 - 10, 1163, 2, 99); }
      // neighbours sit a little darker (our shop is the lit one)
      x.fillStyle = 'rgba(14,6,16,0.32)'; x.fillRect(-620, 40, 600, 1222); x.fillRect(1100, -20, 600, 1282);
      // cut the vitrine opening
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; x.fill(OPEN_PATH); x.globalCompositeOperation = 'source-over';
    });
    // street (perspective setts) world y 1240..2640
    SP.street = spriteWorld(-620, 1240, 2320, 1400, 0.8, (x) => {
      x.fillStyle = '#150A12'; x.fillRect(-620, 1240, 2320, 1400);
      x.fillStyle = '#3A2434'; x.fillRect(-620, 1248, 2320, 10); x.fillStyle = 'rgba(255,210,180,0.10)'; x.fillRect(-620, 1248, 2320, 2);
      const VX = 540, sc = (v) => 0.42 + (v - 1258) / 640;           // ground → screen-x scale (perspective)
      const rng = E.rng(4711);
      let v = 1260;
      while (v < 2650) {
        const s0 = sc(v), rh = 9 * s0, v1 = v + rh, s1 = sc(v1), gap = Math.max(1.2, rh * 0.12);
        let u = VX - 1300 / s0 - rng() * 60;
        while (VX + (u - VX) * s0 < 1720) {
          const bw = 46 + rng() * 34, u1 = u + bw;
          const xa0 = VX + (u - VX) * s0, xb0 = VX + (u1 - VX) * s0 - gap, xa1 = VX + (u - VX) * s1, xb1 = VX + (u1 - VX) * s1 - gap;
          const y0 = v + gap * 0.5, y1 = v1 - gap * 0.5, rv = rng(), base = rv < 0.3 ? '#2E1B29' : rv < 0.65 ? '#36212F' : rv < 0.9 ? '#3E2636' : '#46293A';
          const r = Math.min((y1 - y0) * 0.4, (xb0 - xa0) * 0.25);
          x.beginPath(); x.moveTo(xa0 + r, y0); x.lineTo(xb0 - r, y0); x.quadraticCurveTo(xb0, y0, xb0 + (xb1 - xb0) * 0.3, y0 + r);
          x.lineTo(xb1, y1 - r); x.quadraticCurveTo(xb1, y1, xb1 - r, y1); x.lineTo(xa1 + r, y1); x.quadraticCurveTo(xa1, y1, xa1, y1 - r);
          x.lineTo(xa0 + (xa1 - xa0) * 0.3, y0 + r); x.quadraticCurveTo(xa0, y0, xa0 + r, y0); x.closePath();
          x.fillStyle = E.lin(x, 0, y0, 0, y1, [[0, E.shade(base, 0.12)], [0.55, base], [1, E.shade(base, -0.3)]]); x.fill();
          x.strokeStyle = 'rgba(255,200,165,' + (0.06 + rng() * 0.08).toFixed(3) + ')'; x.lineWidth = Math.max(1, rh * 0.09);
          x.beginPath(); x.moveTo(xa0 + r, y0 + 1); x.lineTo(xb0 - r, y0 + 1); x.stroke();
          if (rng() < 0.22) { x.fillStyle = 'rgba(255,214,180,0.09)'; x.beginPath(); x.ellipse((xa0 + xb0) / 2, y0 + (y1 - y0) * 0.35, (xb0 - xa0) * 0.3, (y1 - y0) * 0.16, 0, 0, TAU); x.fill(); }
          u = u1;
        }
        v = v1;
      }
    });
  }

  function buildFrame() {
    SP.frame = spriteWorld(30, 120, 1020, 1040, 1.3, (x) => {
      x.save(); x.clip(OPEN_PATH);
      x.lineJoin = 'round';
      x.strokeStyle = 'rgba(16,6,10,0.55)'; x.lineWidth = 40; x.stroke(OPEN_PATH);
      x.strokeStyle = 'rgba(16,6,10,0.35)'; x.lineWidth = 80; x.stroke(OPEN_PATH);
      x.save(); x.beginPath(); x.rect(100, 290, 880, 172); x.clip();
      A.lattice(x, { x: 141, y: 296, w: 798, h: 166, cell: 54, lineW: 7.5, stroke: '#6E4A32' });
      x.restore();
      x.fillStyle = E.lin(x, 0, 456, 0, 480, [[0, '#8E6444'], [0.4, '#6E4A32'], [1, '#2E1A10']]); x.fillRect(100, 456, 880, 24);
      x.fillStyle = '#C99A4A'; x.fillRect(100, 458, 880, 2.5); x.fillRect(100, 474, 880, 2);
      for (let cx = 160; cx < 940; cx += 36) {
        const p = new Path2D(); p.moveTo(cx - 18, 480); p.lineTo(cx + 18, 480); p.lineTo(cx + 18, 486); p.bezierCurveTo(cx + 12, 492, cx + 5, 494, cx, 504); p.bezierCurveTo(cx - 5, 494, cx - 12, 492, cx - 18, 486); p.closePath();
        x.fillStyle = E.lin(x, 0, 480, 0, 504, [[0, '#6E4A32'], [1, '#3A2416']]); x.fill(p);
        x.strokeStyle = 'rgba(201,154,74,0.75)'; x.lineWidth = 1.2; x.stroke(p);
        x.fillStyle = '#E8C27A'; x.beginPath(); x.arc(cx, 499, 1.6, 0, TAU); x.fill();
      }
      x.restore();
      E.at(x, AR.x, AR.y, 1, 0, () => A.archGate(x, { w: AR.w, h: AR.h, lattice: false, muqarnas: false }));
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = E.lin(x, 0, 120, 0, 1160, [[0, '#2A1430', 0.42], [0.45, '#24102A', 0.5], [1, '#160818', 0.62]]);
      x.fillRect(30, 120, 1020, 1040);
      x.globalCompositeOperation = 'source-over';
    });
    SP.shelves = spriteWorld(130, 660, 820, 520, 1.3, (x) => {
      x.save(); x.clip(OPEN_PATH);
      for (const ys of ROWY) {
        const sill = ys === ROWY[2];
        x.fillStyle = E.lin(x, 0, ys + 20, 0, ys + 70, [[0, '#120610', 0.5], [1, '#120610', 0]]); x.fillRect(130, ys + 20, 820, 50);
        x.fillStyle = E.lin(x, 0, ys - 18, 0, ys + 14, [[0, '#9A6E4A'], [0.25, '#7A5236'], [1, '#4E3020']]); x.fillRect(130, ys - 18, 820, 32);
        x.fillStyle = 'rgba(255,226,180,0.55)'; x.fillRect(130, ys - 18, 820, 1.6);
        const fh = sill ? 30 : 14;
        x.fillStyle = E.lin(x, 0, ys + 14, 0, ys + 14 + fh, [[0, '#5A3A26'], [1, '#2A160C']]); x.fillRect(130, ys + 14, 820, fh);
        x.fillStyle = BRASS(x, 130, 950); x.fillRect(130, ys + 14, 820, 3.2);
        x.fillStyle = 'rgba(255,240,200,0.5)'; x.fillRect(130, ys + 14, 820, 1);
      }
      x.restore();
    });
  }

  /* foreground walnut counter (screen units, pre-blurred) with lantern & window reflections */
  function buildCounter() {
    const w = 1320, h = 600, b = E.canvas(w, h), x = b.x, top = 120;
    // polished walnut top reflecting the lit shop and the lanterns
    x.fillStyle = E.lin(x, 0, top, 0, top + 80, [[0, '#5A3424'], [0.45, '#3E2216'], [1, '#2A140C']]); x.fillRect(0, top, w, 80);
    x.globalCompositeOperation = 'lighter';
    x.save(); x.translate(660, top + 30); x.scale(1, 0.1); x.fillStyle = E.rad(x, 0, 0, 0, 520, [[0, '#FFB070', 0.42], [0.5, '#E07858', 0.16], [1, '#E07858', 0]]); x.fillRect(-520, -520, 1040, 1040); x.restore();
    for (const sx of [482, 650, 818]) { x.save(); x.translate(sx, top + 40); x.scale(1, 0.16); x.fillStyle = E.rad(x, 0, 0, 0, 70, [[0, '#FFD09A', 0.4], [1, '#FFD09A', 0]]); x.fillRect(-70, -70, 140, 140); x.restore(); }
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = 'rgba(255,214,170,0.5)'; x.fillRect(0, top + 76, w, 2.5);
    // front face: carved panels
    x.fillStyle = E.lin(x, 0, top + 80, 0, h, [[0, '#3A2014'], [0.35, '#2A160E'], [1, '#120806']]); x.fillRect(0, top + 80, w, h - top - 80);
    x.fillStyle = BRASS(x, 0, w, 0.85); x.fillRect(0, top + 90, w, 4);
    for (let px = 30; px < w; px += 210) {
      x.fillStyle = E.lin(x, 0, top + 120, 0, top + 420, [[0, '#4A2A1A'], [1, '#22100A']]); x.fillRect(px, top + 120, 180, 300);
      x.strokeStyle = 'rgba(255,200,150,0.18)'; x.lineWidth = 3; x.strokeRect(px, top + 120, 180, 300);
      x.save(); x.translate(px + 90, top + 270); x.fillStyle = 'rgba(201,154,74,0.55)'; x.fill(S.starPath(14, 8, 0.6, PI / 8)); x.restore();
    }
    // a brass tray with two tulip-shaped tea glasses (left) and a brass ibrik (right)
    const tray = (cx, cy) => {
      x.fillStyle = BRASS(x, cx - 130, cx + 130); x.beginPath(); x.ellipse(cx, cy, 130, 24, 0, 0, TAU); x.fill();
      x.fillStyle = 'rgba(40,20,8,0.45)'; x.beginPath(); x.ellipse(cx, cy - 2, 112, 17, 0, 0, TAU); x.fill();
      for (const gx of [cx - 48, cx + 44]) {
        const gy = cy - 10;
        x.fillStyle = '#F4EEE4'; x.beginPath(); x.ellipse(gx, gy, 38, 9, 0, 0, TAU); x.fill();          // saucer
        x.strokeStyle = 'rgba(200,150,60,0.9)'; x.lineWidth = 2; x.beginPath(); x.ellipse(gx, gy, 38, 9, 0, 0, TAU); x.stroke();
        const g = new Path2D(), hT = 92;                                                                 // ince belli: rim, waist, round bowl
        g.moveTo(gx - 19, gy - hT); g.bezierCurveTo(gx - 19, gy - hT + 26, gx - 8, gy - hT + 34, gx - 8, gy - 52);
        g.bezierCurveTo(gx - 8, gy - 40, gx - 17, gy - 30, gx - 17, gy - 16); g.bezierCurveTo(gx - 17, gy - 6, gx - 10, gy - 3, gx, gy - 3);
        g.bezierCurveTo(gx + 10, gy - 3, gx + 17, gy - 6, gx + 17, gy - 16); g.bezierCurveTo(gx + 17, gy - 30, gx + 8, gy - 40, gx + 8, gy - 52);
        g.bezierCurveTo(gx + 8, gy - hT + 34, gx + 19, gy - hT + 26, gx + 19, gy - hT); g.closePath();
        x.fillStyle = 'rgba(255,240,225,0.18)'; x.fill(g);
        x.save(); x.clip(g); x.fillStyle = E.lin(x, 0, gy - 78, 0, gy, [[0, '#E8873A'], [0.5, '#B8461A'], [1, '#7A2A10']]); x.fillRect(gx - 22, gy - 76, 44, 76); x.restore();
        x.strokeStyle = 'rgba(255,245,230,0.55)'; x.lineWidth = 1.5; x.stroke(g);
        x.fillStyle = 'rgba(255,240,220,0.6)'; x.fillRect(gx - 13, gy - 84, 3, 26); x.fillRect(gx - 12, gy - 34, 3, 16);
      }
    };
    tray(230, top + 52);
    const ib = (cx, cy) => {      // brass ibrik, spout toward the centre
      const p = new Path2D(); p.moveTo(cx - 14, cy - 140); p.bezierCurveTo(cx - 18, cy - 100, cx - 54, cy - 84, cx - 54, cy - 38); p.bezierCurveTo(cx - 54, cy - 8, cx - 28, cy, cx, cy);
      p.bezierCurveTo(cx + 28, cy, cx + 54, cy - 8, cx + 54, cy - 38); p.bezierCurveTo(cx + 54, cy - 84, cx + 18, cy - 100, cx + 14, cy - 140); p.closePath();
      x.fillStyle = BRASS(x, cx - 54, cx + 54); x.fill(p);
      x.strokeStyle = BRASS(x, cx - 120, cx + 60); x.lineWidth = 8; x.lineCap = 'round';
      x.beginPath(); x.moveTo(cx - 46, cy - 56); x.quadraticCurveTo(cx - 96, cy - 84, cx - 104, cy - 138); x.stroke();
      x.beginPath(); x.moveTo(cx + 46, cy - 36); x.quadraticCurveTo(cx + 92, cy - 66, cx + 36, cy - 112); x.stroke();
      x.fillStyle = BRASS(x, cx - 22, cx + 22); x.beginPath(); x.ellipse(cx, cy - 142, 22, 7, 0, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,240,200,0.5)'; x.fillRect(cx - 34, cy - 80, 5, 48);
    };
    ib(1000, top + 56);
    const o = E.canvas(w, h); o.x.filter = 'blur(3px)'; o.x.drawImage(b.c, 0, 0);
    SP.counter = { c: o.c, top };
  }

  /* soft dusk cloud banks with warm rim light (pre-blurred, half res) */
  function buildClouds() {
    SP.clouds = [11, 23, 37].map((seed) => {
      const w = 1700, h = 520, k = 0.5, r = E.rng(seed);
      const U = E.canvas(w * k, h * k), u = U.x; u.scale(k, k);
      for (let i = 0; i < 30; i++) {
        const px = w * 0.06 + r() * w * 0.88, edge = 1 - Math.abs(px / w - 0.5) * 1.5, pr = h * (0.1 + r() * 0.2) * Math.max(0.35, edge), py = h * 0.66 - pr * (0.2 + r() * 0.55);
        u.fillStyle = '#000'; u.beginPath(); u.arc(px, py, pr, 0, TAU); u.fill();
      }
      u.globalCompositeOperation = 'destination-out'; u.fillStyle = E.lin(u, 0, h * 0.6, 0, h * 0.8, [[0, '#000', 0], [1, '#000', 1]]); u.fillRect(0, h * 0.6, w, h * 0.4);
      const out = E.canvas(w * k, h * k), x = out.x;
      x.drawImage(U.c, 0, 0); x.globalCompositeOperation = 'source-in';
      x.fillStyle = E.lin(x, 0, 0, 0, h * k, [[0, '#E0A08E'], [0.3, '#A8687A'], [0.7, '#7A4664'], [1, '#5A3054']]); x.fillRect(0, 0, w * k, h * k);
      const rim = E.canvas(w * k, h * k); rim.x.drawImage(U.c, 0, 0); rim.x.globalCompositeOperation = 'destination-out'; rim.x.drawImage(U.c, 0, 7);
      rim.x.globalCompositeOperation = 'source-in'; rim.x.fillStyle = '#FFE0C0'; rim.x.fillRect(0, 0, w * k, h * k);
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 0.9; x.drawImage(rim.c, 0, 0);
      const o = E.canvas(w * k, h * k); o.x.filter = 'blur(5px)'; o.x.drawImage(out.c, 0, 0);
      return { c: o.c, w, h };
    });
  }

  /* distant skyline (L2): hazy rooftops + cypresses, base hidden behind our roofs */
  function buildSkyline() {
    const w = 3400, h = 320, k = 0.5, b = E.canvas(w * k, h * k), x = b.x, r = E.rng(77);
    x.scale(k, k);
    x.fillStyle = '#000';
    let px = 0;
    x.beginPath(); x.moveTo(0, h);
    while (px < w) {
      const bw = 120 + r() * 220, bh = 90 + r() * 130, roof = 20 + r() * 34;
      x.lineTo(px, h - bh); x.lineTo(px + bw * 0.5, h - bh - roof); x.lineTo(px + bw, h - bh);
      if (r() < 0.3) { const cx = px + bw * (0.2 + r() * 0.6); x.lineTo(cx, h - bh - 4); x.lineTo(cx, h - bh - roof - 26); x.lineTo(cx + 16, h - bh - roof - 26); x.lineTo(cx + 16, h - bh - 4); }
      px += bw;
    }
    x.lineTo(w, h); x.closePath(); x.fill();
    for (const cx of [520, 1460, 1530, 2580]) { x.beginPath(); x.ellipse(cx, h - 150, 18, 120, 0, 0, TAU); x.fill(); }
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = E.lin(x, 0, 0, 0, h, [[0, '#6A3C5A'], [0.5, '#4E2C4A'], [1, '#3A2040']]); x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,190,120,' + (0.25 + r() * 0.35).toFixed(2) + ')'; x.fillRect(r() * w, h - 40 - r() * 120, 4, 6); }
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = E.lin(x, 0, h * 0.55, 0, h, [[0, '#000', 0], [1, '#000', 1]]); x.fillRect(0, 0, w, h);
    SP.skyline = { c: b.c, w, h };
  }

  /* jar base: exact copy of A.bellJar's brass base (used while the dome is lifted) */
  function jarBase(ctx) {
    const rw = JRW, s = JS, bh = JBH;
    const tier = (y0, y1, r) => {
      const ry = r * s, p = new Path2D();
      p.moveTo(-r, y0); p.lineTo(-r, y1); p.ellipse(0, y1, r, ry, 0, PI, 0, true); p.lineTo(r, y0); p.closePath();
      ctx.fillStyle = BRASS(ctx, -r, r); ctx.fill(p);
      ctx.fillStyle = E.lin(ctx, -r, 0, r, 0, [[0, '#B8873A'], [0.35, '#F2D58E'], [1, '#9A6E2A']]);
      ctx.beginPath(); ctx.ellipse(0, y0, r, ry, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,200,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, y0, r, ry, 0, PI * 0.05, PI * 0.95); ctx.stroke();
    };
    ctx.fillStyle = 'rgba(8,4,12,0.35)'; ctx.beginPath(); ctx.ellipse(0, 3, rw * 1.3, rw * 1.3 * s, 0, 0, TAU); ctx.fill();
    tier(-bh * 0.42, 0, rw * 1.12); tier(-bh, -bh * 0.42, rw * 1.03);
  }

  /* display stands (not part of the sample's silhouette / original) */
  function drawStand(ctx, it) {
    if (it.stand === 'rod') {
      ctx.fillStyle = BRASS(ctx, -13, 13); ctx.beginPath(); ctx.ellipse(0, -1, 13, 3.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = BRASS(ctx, -2, 2); ctx.fillRect(-1.2, -it.rod, 2.4, it.rod);
      ctx.strokeStyle = BRASS(ctx, -7, 7); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -it.rod - 3, 6, 0.15 * PI, 0.85 * PI); ctx.stroke();
    } else if (it.stand === 'cup') {
      ctx.fillStyle = BRASS(ctx, -11, 11); ctx.beginPath(); ctx.ellipse(0, -1, 11, 3, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-6.5, -13); ctx.lineTo(6.5, -13); ctx.lineTo(4, -2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3A2410'; ctx.beginPath(); ctx.ellipse(0, -13, 6.5, 1.8, 0, 0, TAU); ctx.fill();
    } else if (it.stand === 'vase') {      // tiny Iznik bud vase
      const p = new Path2D();
      p.moveTo(-5, -26); p.bezierCurveTo(-5, -22, -3, -21, -3.4, -17); p.bezierCurveTo(-4, -13, -11, -11, -11, -5); p.bezierCurveTo(-11, -1, -6, 0, 0, 0);
      p.bezierCurveTo(6, 0, 11, -1, 11, -5); p.bezierCurveTo(11, -11, 4, -13, 3.4, -17); p.bezierCurveTo(3, -21, 5, -22, 5, -26); p.closePath();
      ctx.fillStyle = E.lin(ctx, -11, 0, 11, 0, [[0, '#B9AE9E'], [0.35, '#FFFBF2'], [0.7, '#E8DECD'], [1, '#9C9284']]); ctx.fill(p);
      ctx.save(); ctx.clip(p);
      ctx.fillStyle = '#1F5FA8'; ctx.fillRect(-12, -9, 24, 3.2); ctx.fillStyle = '#3CC6C0'; ctx.fillRect(-12, -5.2, 24, 1.2);
      ctx.fillStyle = '#D9473A'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.arc(k * 4.4, -12.2, 1.1, 0, TAU); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#2A2018'; ctx.beginPath(); ctx.ellipse(0, -26, 5, 1.4, 0, 0, TAU); ctx.fill();
    } else if (it.stand === 'dish') {
      ctx.fillStyle = BRASS(ctx, -24, 24); ctx.beginPath(); ctx.ellipse(0, -2, 15, 3.6, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-26, -9); ctx.quadraticCurveTo(0, 2, 26, -9); ctx.quadraticCurveTo(0, -4, -26, -9); ctx.fill();
      ctx.fillStyle = E.lin(ctx, 0, -14, 0, -6, [[0, '#F2D58E'], [1, '#9A6E2A']]); ctx.beginPath(); ctx.ellipse(0, -9, 26, 5.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(40,20,8,0.45)'; ctx.beginPath(); ctx.ellipse(0, -9.4, 21, 3.8, 0, 0, TAU); ctx.fill();
    }
  }

  /* ---- luminous helpers: offscreen render → 'source-in' recolour, eroded contour, Sobel line drawing ---- */
  function erodeEdge(maskC, w, h, k) {
    const er = E.canvas(w, h); er.x.drawImage(maskC, 0, 0); er.x.globalCompositeOperation = 'destination-in';
    for (let a = 0; a < 8; a++) er.x.drawImage(maskC, Math.round(Math.cos(a * PI / 4) * k), Math.round(Math.sin(a * PI / 4) * k));
    const ed = E.canvas(w, h); ed.x.drawImage(maskC, 0, 0); ed.x.globalCompositeOperation = 'destination-out'; ed.x.drawImage(er.c, 0, 0);
    return ed.c;
  }
  function tinted(src, w, h, col) { const b = E.canvas(w, h); b.x.drawImage(src, 0, 0); b.x.globalCompositeOperation = 'source-in'; b.x.fillStyle = col; b.x.fillRect(0, 0, w, h); return b.c; }
  function lineArt(artC, w, h) {
    const d = artC.getContext('2d').getImageData(0, 0, w, h).data, n = w * h;
    const Lm = new Float32Array(n), Al = new Float32Array(n);
    for (let i = 0; i < n; i++) { const a = d[i * 4 + 3] / 255; Al[i] = a; Lm[i] = a * (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]) / 255; }
    const out = E.canvas(w, h), id = out.x.createImageData(w, h), o = id.data;
    const sob = (F, i) => {
      const gx = F[i - w + 1] + 2 * F[i + 1] + F[i + w + 1] - F[i - w - 1] - 2 * F[i - 1] - F[i + w - 1];
      const gy = F[i + w - 1] + 2 * F[i + w] + F[i + w + 1] - F[i - w - 1] - 2 * F[i - w] - F[i - w + 1];
      return Math.hypot(gx, gy);
    };
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, e = Math.max(sob(Al, i) / 2.6, sob(Lm, i) * 1.25);
      const v = sm((e - 0.06) / 0.5);
      if (v <= 0) continue;
      o[i * 4] = 255; o[i * 4 + 1] = 246; o[i * 4 + 2] = 224; o[i * 4 + 3] = v * 255;
    }
    out.x.putImageData(id, 0, 0);
    return out.c;
  }
  /* an immense original: soft halo + faint luminous body + softened line drawing, fading into haze below */
  function immense(artC, w, h, hero) {
    const mask = tinted(artC, w, h, '#FFF2DC'), lines = lineArt(artC, w, h);
    const out = E.canvas(w, h), x = out.x;
    x.globalCompositeOperation = 'lighter';
    x.filter = 'blur(30px)'; x.globalAlpha = hero ? 0.3 : 0.24; x.drawImage(tinted(artC, w, h, '#FFB888'), 0, 0);
    x.filter = 'blur(6px)'; x.globalAlpha = 0.1; x.drawImage(mask, 0, 0);
    x.filter = 'blur(2.2px)'; x.globalAlpha = 0.85; x.drawImage(lines, 0, 0);
    x.filter = 'none'; x.globalAlpha = 0.6; x.drawImage(lines, 0, 0);
    x.globalCompositeOperation = 'destination-in'; x.globalAlpha = 1;
    x.fillStyle = E.lin(x, 0, 0, 0, h, [[0, '#000', 1], [0.55, '#000', 0.95], [1, '#000', 0.45]]); x.fillRect(0, 0, w, h);
    return out.c;
  }

  function measure(it) {
    const S2 = 2, cw = 360, ch = 440, ox = 180, oy = 410;
    const run = (fn) => { const b = E.canvas(cw, ch); b.x.translate(ox, oy); b.x.scale(S2, S2); fn(b.x, 0, true); return b; };
    const bbox = (b) => {
      const d = b.x.getImageData(0, 0, cw, ch).data; let x0 = cw, y0 = ch, x1 = 0, y1 = 0;
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (d[(y * cw + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return { d, x0, y0, x1, y1 };
    };
    const a = run(it.art), ba = bbox(a);
    it.ghost = { c: E.canvas(cw, ch).c, cx: (ba.x0 + ba.x1) / 2, cy: (ba.y0 + ba.y1) / 2 };
    { const mask = tinted(a.c, cw, ch, '#FFF6E0'), edge = erodeEdge(mask, cw, ch, 3), g = it.ghost.c.getContext('2d');
      g.filter = 'blur(5px)'; g.globalAlpha = 0.7; g.drawImage(tinted(a.c, cw, ch, '#FFD27A'), 0, 0); g.globalAlpha = 0.35; g.drawImage(edge, 0, 0);
      g.filter = 'none'; g.globalAlpha = 0.5; g.drawImage(tinted(a.c, cw, ch, '#FFF0D0'), 0, 0); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.85; g.drawImage(mask, 0, 0);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.drawImage(edge, 0, 0); g.drawImage(edge, 0, 0); }
    it.sbb = { x0: (ba.x0 - ox) / S2, y0: (ba.y0 - oy) / S2, x1: (ba.x1 - ox) / S2, y1: (ba.y1 - oy) / S2 };
    const b = it.oart ? run(it.oart) : a, bb = it.oart ? bbox(b) : ba;
    it.obb = { x0: (bb.x0 - ox) / S2, y0: (bb.y0 - oy) / S2, x1: (bb.x1 - ox) / S2, y1: (bb.y1 - oy) / S2 };
    it.cl = [(it.obb.x0 + it.obb.x1) / 2, (it.obb.y0 + it.obb.y1) / 2];
    it.maxDim = Math.max(it.obb.x1 - it.obb.x0, it.obb.y1 - it.obb.y0);
    const cxp = (bb.x0 + bb.x1) / 2, cyp = (bb.y0 + bb.y1) / 2, N = 72, R = [], maxR = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2 + 4;
    for (let k = 0; k < N; k++) {
      const an = (k / N) * TAU; let last = 0;
      for (let r = 0; r < maxR; r += 1) { const px = Math.round(cxp + Math.cos(an) * r), py = Math.round(cyp + Math.sin(an) * r); if (px < 0 || py < 0 || px >= cw || py >= ch) break; if (bb.d[(py * cw + px) * 4 + 3] > 40) last = r; }
      R.push(last / S2);
    }
    it.polar = R;
    it.ghostCl = [(it.sbb.x0 + it.sbb.x1) / 2, (it.sbb.y0 + it.sbb.y1) / 2];
  }
  ITEMS.forEach((it) => {
    it.polarAt = (a) => { const N = it.polar.length, f = ((a / TAU) * N + N * 8) % N, i = Math.floor(f), u = f - i; return lerp(it.polar[i], it.polar[(i + 1) % N], u); };
  });

  /* far-plane placement: OL is given in screen px at the wide reference shot (t 42.3) */
  const RES = 0.55;                       // sprite px per far-world unit (soft, upscaled on screen)
  function buildOriginal(it) {
    const L1r = lp(camAt(42.3), PF), [sx, sy, size, rot] = it.OL;
    it.O = unscr(L1r, sx, sy); it.orot = rot;
    it.Sw = size / L1r.z;                                   // far-world size of the max dimension
    const M = (it.Sw * RES) / it.maxDim, bb = it.obb, pad = 70;
    it.M = M;
    const w = Math.ceil((bb.x1 - bb.x0) * M + pad * 2), h = Math.ceil((bb.y1 - bb.y0) * M + pad * 2);
    const art = E.canvas(w, h); art.x.translate(pad - bb.x0 * M, pad - bb.y0 * M); art.x.scale(M, M);
    (it.oart || it.art)(art.x, 0, true);
    const c = immense(art.c, w, h, it.hero);
    if (it.key === 'rose') {
      const x = c.getContext('2d'); x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.8;
      x.translate(pad - bb.x0 * M, pad - bb.y0 * M); x.scale(M, M);
      roseHead(x, 0, true, 'outline');
      x.restore();
    }
    it.orig = { c, w, h };
  }

  function buildGate() {
    const k = 1.5, pad = 110, w = GT.w + pad * 2, h = GT.h + pad * 2 + 60, W2 = Math.ceil(w * k), H2 = Math.ceil(h * k);
    const make = (lum) => { const b = E.canvas(W2, H2); b.x.scale(k, k); b.x.translate(w / 2, h - pad); A.archGate(b.x, { w: GT.w, h: GT.h, luminous: lum, lattice: false, muqarnas: true }); return b.c; };
    const wood = make(0), lumC = make(1), lines = lineArt(wood, W2, H2);
    const out = E.canvas(W2, H2), x = out.x; x.globalCompositeOperation = 'lighter';
    x.globalAlpha = 0.2; x.drawImage(lumC, 0, 0);
    x.filter = 'blur(5px)'; x.globalAlpha = 0.8; x.drawImage(lines, 0, 0);
    x.filter = 'none'; x.globalAlpha = 1; x.drawImage(lines, 0, 0);
    const g = E.canvas(W2, H2); g.x.filter = 'blur(24px)'; g.x.drawImage(out.c, 0, 0);
    SP.gate = { c: out.c, glow: g.c, w, h, ox: w / 2, oy: h - pad };
    SP.gateOpen = polyP(GG.open);
  }

  /* cloud banks for the final tilt: placed by (layer p, time, screen x/y at that time, scale, alpha, sprite) */
  const CLOUDS = [
    { p: 0.92, t: 47.3, x: 250, y: 1060, s: 1.25, a: 1, i: 0 },
    { p: 0.92, t: 47.3, x: 860, y: 1130, s: 1.2, a: 1, i: 1 },
    { p: 0.95, t: 47.3, x: 540, y: 1320, s: 1.6, a: 1, i: 2 },
    { p: 0.8, t: 47.3, x: 140, y: 820, s: 0.8, a: 1, i: 1 },
    { p: 0.8, t: 47.3, x: 960, y: 860, s: 0.75, a: 1, i: 2 },
  ];
  function setupPlacements() {
    for (const c of CLOUDS) { const L = lp(camAt(c.t), c.p); c.W = unscr(L, c.x, c.y); c.ws = c.s / L.z; }
    const Lw = lp(camAt(42.3), PS); SP.skyW = unscr(Lw, -1100, 640); SP.skyS = 1 / Lw.z;
  }

  /* ---------------- per-frame helpers ---------------- */
  function itemWorld(it) { return [it.jx + it.cl[0], it.fy + it.cl[1]]; }
  /* the originals rise from behind the vitrine (seen through its back glass) into the sky as the camera pulls back */
  const riseY = (t) => 620 * (1 - E.ease.inOutSine(clamp((t - T_ORIG) / 1.25)));
  const oPos = (it, t) => [it.O[0], it.O[1] + riseY(t)];
  function origBreath(it, t) { return 1 + 0.015 * Math.sin(t * TAU / 3.2 + it.i * 0.9); }
  function ignite(it, t) { return pp(t, T_TURN + T_BEND * 0.8, T_TURN + T_BEND + 0.3, 'outCubic'); }
  function origAlpha(it, t) {
    const a0 = 0.4 * pp(t, T_ORIG + it.rank * 0.02, T_ORIG + 0.45 + it.rank * 0.02, 'inOutSine');
    const a1 = 0.14 * pp(t, T_SOLID, T_SOLID1, 'inOutSine');
    const endDim = 1 - 0.8 * pp(t, 46.75, 47.2, 'inOutSine');           // ≤ 0.2 while the gate forms
    return (a0 + a1 + 0.26 * ignite(it, t)) * (it.hero ? 1 : 0.62) * endDim;
  }
  /* far-world point on the original's contour at screen angle a */
  function origPt(it, t, a) {
    const r = it.polarAt(a - it.orot) * it.M / RES * origBreath(it, t), O = oPos(it, t);
    return [O[0] + Math.cos(a) * r, O[1] + Math.sin(a) * r];
  }

  function gateState(t, cam) {
    // the beams' meeting point descends into view with the rise, then the gate forms there, fixed (apex ≥ y 250)
    const s0 = 0.86, pass = E.ease.inCubic(clamp((t - T_PASS) / (T1 - T_PASS))), sp = s0 * (1 + 6.5 * pass);
    const oc = [540, lerp(-280, 520, E.ease.outCubic(clamp((t - 45.95) / 0.95)))];
    const openC = -GT.h + GT.w * 0.075 * 1.6;                    // opening apex (local); opening centre = apexY / 2
    const org = [oc[0], oc[1] - (openC / 2) * sp];
    return { s: sp, pass, oc, org, G: oc };
  }
  /* ---------------- drawing: background ---------------- */
  function drawSky(ctx, t, cam) {
    inL(ctx, lp(cam, 0.05), (c) => {
      c.fillStyle = E.lin(c, 0, -300, 0, 2100, [[0, '#120A22'], [0.22, '#1E1230'], [0.4, '#3A2042'], [0.55, '#5E3048'], [0.75, '#7A3E4C'], [1, '#8A4A50']]);
      c.fillRect(-300, -500, 1680, 2900);
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 70; i++) {
        const x = E.hash(i, 31) * 1080, y = -20 + E.hash(i, 32) * 900, tw = 0.35 + 0.65 * E.osc(t, 1.6 + E.hash(i, 33) * 2.4, E.hash(i, 34));
        c.fillStyle = E.rgba('#FFE9D0', 0.55 * tw * (1 - y / 1000)); c.beginPath(); c.arc(x, y, 0.8 + E.hash(i, 35) * 1.4, 0, TAU); c.fill();
      }
      c.restore();
    });
  }
  function drawFar(ctx, t, cam) {
    const L1 = lp(cam, PF), ign = pp(t, 45.55, 46.1, 'outCubic'), rose = ROSE.O;
    E.layer(ctx, (l) => {
      inL(l, L1, (c) => {
        c.fillStyle = E.rad(c, rose[0], rose[1] + 160, 0, 1500, [[0, '#F0B890', 0.34 + 0.06 * ign], [0.3, '#C87A74', 0.2], [0.65, '#7A3E5A', 0.1], [1, '#4A2A45', 0]]);
        c.fillRect(rose[0] - 1600, rose[1] - 1500, 3200, 3200);
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) {
          const mx = 540 + 420 * Math.sin(t * 0.05 + i * 1.7), my = rose[1] - 700 + i * 260 + 22 * Math.sin(t * 0.11 + i);
          c.save(); c.translate(mx, my); c.scale(1, 0.13);
          c.fillStyle = E.rad(c, 0, 0, 0, 900, [[0, '#FFE2C2', 0.06], [1, '#FFE2C2', 0]]); c.fillRect(-900, -900, 1800, 1800);
          c.restore();
        }
        S.dust(c, t, { n: 40, seed: 811, x: -300, y: rose[1] - 900, w: 1700, h: 1500, col: '#FFE3B0', rMin: 0.8, rMax: 2.4, speed: 7, alpha: 0.5 });
      });
    }, { lo: true, blur: 3 });
    inL(ctx, L1, (c) => { for (const it of ITEMS) drawOriginal(c, it, t); });
  }
  function drawOriginal(c, it, t) {
    const a = origAlpha(it, t); if (a <= 0.003) return;
    const o = it.orig, s = origBreath(it, t) / RES;
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, a);
    const O = oPos(it, t);
    c.translate(O[0], O[1]); c.rotate(it.orot); c.scale(s, s);
    c.drawImage(o.c, -o.w / 2, -o.h / 2);
    c.restore();
  }
  function drawSkyline(ctx, t, cam) {
    const L2 = lp(cam, PS);
    inL(ctx, L2, (c) => {
      c.drawImage(SP.skyline.c, SP.skyW[0], SP.skyW[1], SP.skyline.w * SP.skyS, SP.skyline.h * SP.skyS);
      // luminous mist lying on the rooftops
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const mx = 540 + 300 * Math.sin(t * 0.07 + i * 2.3), my = SP.skyW[1] + SP.skyline.h * SP.skyS * (0.55 + i * 0.14);
        c.save(); c.translate(mx, my); c.scale(1, 0.1);
        c.fillStyle = E.rad(c, 0, 0, 0, 1300, [[0, '#FFC8A0', 0.12], [1, '#FFC8A0', 0]]); c.fillRect(-1300, -1300, 2600, 2600);
        c.restore();
      }
      c.restore();
    });
  }
  function drawClouds(ctx, t, cam) {
    const vis = sm((cam.tilt - 0.02) / 0.15);
    if (vis <= 0.003) return;
    for (const cl of CLOUDS) {
      const L = lp(cam, cl.p), spr = SP.clouds[cl.i], drift = 24 * Math.sin(t * 0.3 + cl.i);
      inL(ctx, L, (c) => {
        c.save(); c.globalAlpha = cl.a * vis; c.translate(cl.W[0] + drift, cl.W[1]); c.scale(cl.ws, cl.ws);
        c.drawImage(spr.c, -spr.w / 2, -spr.h * 0.62, spr.w, spr.h);
        c.restore();
      });
    }
  }
  /* ---------------- drawing: the shop ---------------- */
  function sampleContent(it, t, fill) {
    return (c) => {
      drawStand(c, it);
      if (fill <= 0) return;
      if (fill >= 1) { it.art(c, t, false); return; }
      const y0 = it.sbb.y0 - 2, y1 = it.sbb.y1 + 2, yc = lerp(y1, y0, fill);
      c.save(); c.beginPath(); c.rect(-80, yc, 160, y1 - yc + 4); c.clip(); it.art(c, t, false); c.restore();
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = E.lin(c, 0, yc - 6, 0, yc + 6, [[0, '#FFF6E0', 0], [0.5, '#FFF6E0', 0.75], [1, '#FFF6E0', 0]]);
      c.beginPath(); c.rect(it.sbb.x0 - 4, yc - 6, it.sbb.x1 - it.sbb.x0 + 8, 12); c.clip();
      c.globalAlpha = 0.9; it.art(c, t, false); c.restore();
    };
  }
  function jarState(it, t) {
    const tl = it.tLand, k = clamp((t - (tl + 0.06)) / 0.2);
    let drop = 42 * (1 - k * k);
    const dt = t - (tl + 0.26);
    if (dt > 0) drop = 9 * Math.exp(-8 * dt) * Math.abs(Math.sin(dt * 18));
    const domeA = sm(clamp((t - (tl + 0.04)) / 0.14));
    const fill = E.ease.outCubic(clamp((t - tl) / 0.26));
    const sw = dt > 0 ? 0.07 + 0.32 * sm(dt / 0.1) * Math.exp(-1.6 * dt) : 0.07;
    const u = (it.jx - 140) / 800, gpos = lerp(-0.25, 1.25, clamp((t - T_SPEC) / 0.5));
    const spec = (gpos - u) * 2.4 + 0.5;
    return { drop, domeA, fill, swing: sw, spec: spec > 0.01 && spec < 0.99 ? spec : undefined };
  }
  function drawJar(ctx, it, t, st, glow) {
    E.at(ctx, it.jx, it.jy, 1, 0, () => {
      const tagT = t + it.i * 0.73;
      const content = sampleContent(it, t, st.fill);
      const inner = (c) => {
        content(c);
        if (glow > 0.01) { c.save(); c.globalCompositeOperation = 'lighter'; S.light(c, it.cl[0], it.cl[1], 92, '#FFE3A3', 0.42 * glow); c.restore(); }
      };
      if (st.domeA >= 0.999 && st.drop < 0.3) { A.bellJar(ctx, { w: JW, h: JH, t: tagT, swing: st.swing, spec: st.spec, content: inner }); return; }
      jarBase(ctx);
      ctx.save(); ctx.translate(0, -JBH); inner(ctx); ctx.restore();
      if (st.domeA <= 0.001) return;
      ctx.save(); ctx.globalAlpha *= st.domeA; ctx.translate(0, -st.drop);
      ctx.save(); ctx.beginPath(); ctx.rect(-JW, -JH - 60, JW * 2, JH + 60 - JBH); ctx.clip();
      A.bellJar(ctx, { w: JW, h: JH, t: tagT, swing: st.swing, spec: st.spec });
      ctx.restore();
      ctx.fillStyle = E.rgba('#BFE8FF', 0.18); ctx.beginPath(); ctx.ellipse(0, -JBH, JRW, JRW * JS, 0, 0, PI); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(1.2, JW * 0.012); ctx.beginPath(); ctx.ellipse(0, -JBH, JRW, JRW * JS, 0, PI * 0.1, PI * 0.9); ctx.stroke();
      ctx.restore();
    });
  }
  function jarGlow(it, t) {
    let g = 0;
    for (const f of FILS) if (f.it === it) g = Math.max(g, pp(t, f.ta - 0.02, f.ta + 0.1, 'outCubic') * (0.5 + 0.5 * Math.exp(-3.5 * Math.max(0, t - f.ta))));
    g *= 1 - 0.4 * pp(t, 46.2, 46.9);
    return g + 0.3 * ignite(it, t) * (1 - pp(t, 46.4, 47.2));
  }
  function drawGhosts(ctx, t, L3) {
    if (t > 39.4) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const it of ITEMS) {
      const fillK = clamp((t - it.tLand) / 0.26);
      if (fillK >= 1) continue;
      const end = scr(L3, it.jx + it.ghostCl[0], it.fy + it.ghostCl[1]);
      let x = end[0], y = end[1], s = L3.z, a;
      if (it.g) {
        const k = E.ease.inOutCubic(clamp((t - T0) / 0.6));
        const c = [(it.g[0] + end[0]) / 2, (it.g[1] + end[1]) / 2 - 24];
        x = (1 - k) * (1 - k) * it.g[0] + 2 * (1 - k) * k * c[0] + k * k * end[0];
        y = (1 - k) * (1 - k) * it.g[1] + 2 * (1 - k) * k * c[1] + k * k * end[1];
        s *= lerp(it.g[2], 1, k); a = 0.62;
      } else { a = 0.62 * pp(t, 38.04, 38.3, 'outCubic'); s *= lerp(0.85, 1, pp(t, 38.04, 38.32, 'outCubic')); }
      a *= 0.86 + 0.14 * Math.sin(t * 9 + it.i * 1.7);
      a *= 1 - E.ease.inCubic(fillK);
      a += 0.6 * E.env(t, it.tLand - 0.04, it.tLand + 0.2, 0.06, 0.14) * (1 - fillK);
      if (a <= 0.003) continue;
      const g = it.ghost;
      ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.translate(x, y); ctx.scale(s / 2, s / 2);
      ctx.drawImage(g.c, -g.cx, -g.cy); ctx.restore();
    }
    ctx.restore();
  }
  function drawLanterns(c, t) {
    LANTS.forEach((ln, k) => {
      const b = pp(t, T_LANT[k], T_LANT[k] + 0.32, 'outCubic');
      const lit = b * (1 - 0.45 * (1 - b) * (0.5 + 0.5 * Math.sin(t * 57 + k * 2)));
      E.at(c, ln.x, ln.y, 1, 0, () => A.hangingLantern(c, { size: ln.size, lit, t, phase: ln.ph, swing: 3, hz: 0.6, chain: 26 }));
    });
  }
  function lanternLight(ctx, t, L3) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    LANTS.forEach((ln, k) => {
      const lit = pp(t, T_LANT[k], T_LANT[k] + 0.32, 'outCubic');
      if (lit <= 0) return;
      const p = scr(L3, ln.x, ln.y + 90), r = 520 * L3.z;
      ctx.fillStyle = E.rad(ctx, p[0], p[1], 0, r, [[0, '#FFB458', 0.2 * lit], [0.4, '#FF9A4A', 0.08 * lit], [1, '#FF9A4A', 0]]);
      ctx.fillRect(p[0] - r, p[1] - r, 2 * r, 2 * r);
    });
    ctx.restore();
  }
  function drawStreetLight(ctx, t, L3) {
    const g = 1 - 0.2 * glossK(t), lit = pp(t, 39.0, 39.8);
    inL(ctx, L3, (c) => {
      c.save(); c.globalCompositeOperation = 'lighter';
      const p = new Path2D(); p.moveTo(150, 1262); p.lineTo(930, 1262); p.lineTo(1300, 2300); p.lineTo(-220, 2300); p.closePath();
      c.fillStyle = E.lin(c, 0, 1262, 0, 2100, [[0, '#FFB070', 0.13 * g], [0.45, '#FF9A5A', 0.05 * g], [1, '#FF9A5A', 0]]); c.fill(p);
      const refl = (x, w, a0, col) => {
        const sh = 0.85 + 0.15 * Math.sin(t * 2.1 + x * 0.05);
        c.save(); c.translate(x, 1272); c.scale(w / 100, 1);
        c.fillStyle = E.lin(c, 0, 0, 0, 700, [[0, col, a0 * sh], [0.5, col, a0 * 0.4 * sh], [1, col, 0]]);
        c.beginPath(); c.moveTo(-100, 0); c.lineTo(100, 0); c.lineTo(60, 700); c.lineTo(-60, 700); c.closePath(); c.fill();
        c.fillStyle = E.lin(c, 0, 0, 0, 520, [[0, col, a0 * 1.6 * sh], [1, col, 0]]);
        c.beginPath(); c.moveTo(-14, 0); c.lineTo(14, 0); c.lineTo(8, 520); c.lineTo(-8, 520); c.closePath(); c.fill(); c.restore();
      };
      for (const x of COLX) refl(x, 62, 0.08 * g, '#FFD9B0');
      for (const ln of LANTS) refl(ln.x, 26, 0.1 * g * lit, '#FFB050');
      refl(1260, 90, 0.07 * g, '#FFC080'); refl(1545, 90, 0.06 * g, '#FFC080'); refl(-320, 70, 0.04 * g, '#FFB070');
      c.restore();
    });
  }
  let PUD = null;
  function drawPuddles(ctx, t, L3) {
    const yl = scr(L3, 540, 1262)[1];
    if (yl > H - 30) return;
    if (!PUD) PUD = E.canvas(W / 2, H / 2);
    const m = PUD.x; m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, W / 2, H / 2); m.setTransform(0.5, 0, 0, 0.5, 0, 0);
    inL(m, L3, (c) => {
      for (const [x, y, rx, ry, a] of [[300, 1440, 320, 52, 1], [820, 1520, 300, 50, 0.9], [560, 1370, 170, 18, 0.6], [-260, 1600, 340, 60, 0.8], [1340, 1640, 330, 58, 0.8], [540, 1760, 420, 70, 0.9]]) {
        c.save(); c.translate(x + 6 * Math.sin(t * 0.4 + x), y); c.scale(1, ry / rx);
        c.fillStyle = E.rad(c, 0, 0, rx * 0.3, rx, [[0, '#000', a], [1, '#000', 0]]); c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill();
        c.restore();
      }
    });
    E.layer(ctx, (l) => {
      l.save(); l.translate(0, 2 * yl); l.scale(1, -1); l.drawImage(ctx.canvas, 0, 0, W, H); l.restore();
      l.save(); l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'destination-in'; l.drawImage(PUD.c, 0, 0); l.restore();
    }, { lo: true, blur: 3, alpha: 0.5 });
  }
  function drawShop(ctx, t, cam, skipRose) {
    const L3 = lp(cam, 1);
    inL(ctx, L3, (c) => { drawSpr(c, SP.street); drawSpr(c, SP.facade); });
    drawStreetLight(ctx, t, L3);
    inL(ctx, L3, (c) => {
      drawSpr(c, SP.shelves);
      for (const it of ITEMS) if (!(skipRose && it === ROSE)) drawJar(c, it, t, jarState(it, t), jarGlow(it, t));
    });
    drawGhosts(ctx, t, L3);
    inL(ctx, L3, (c) => { drawSpr(c, SP.frame); });
    // focus: deepen the outer facade around the lit vitrine in the rest/medium shots
    const fa = 0.45 * sm((cam.zoom - 0.62) / 0.3) * (1 - cam.tilt);
    if (fa > 0.004) {
      const fc = scr(L3, 540, 760);
      ctx.save(); ctx.translate(fc[0], fc[1]); ctx.scale(1, 1.35);
      ctx.fillStyle = E.rad(ctx, 0, 0, 380 * L3.z, 980 * L3.z, [[0, '#0C0410', 0], [1, '#0C0410', fa]]); ctx.fillRect(-5000, -5000, 10000, 10000);
      ctx.restore();
    }
    inL(ctx, L3, (c) => drawLanterns(c, t));
    lanternLight(ctx, t, L3);
    drawPuddles(ctx, t, L3);
  }

  /* ---------------- drawing: overlays ---------------- */
  function drawProjection(ctx, t, L1, L3) {
    if (t < T_LINES || t > 45.3) return;
    const solid = pp(t, T_SOLID, T_SOLID1, 'inOutSine');
    const alpha = lerp(0.45, 0.6, solid) * (1 - 0.55 * pp(t, 43.05, 43.6, 'inOutSine')) * (1 - pp(t, 44.6, 45.25, 'inOutSine'));
    if (alpha <= 0.003) return;
    const gap = lerp(9, 0, solid), roofY = scr(L3, 540, 0)[1] - 6;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    let n = 0;
    for (const key in PLINES) {
      const it = byKey[key], C = itemWorld(it);
      PLINES[key].forEach((an, k) => {
        const rs = it.polarAt(an), a = scr(L3, C[0] + Math.cos(an) * rs, C[1] + Math.sin(an) * rs), b = scr(L1, ...origPt(it, t, an));
        if (b[1] > roofY || b[0] < 8 || b[0] > W - 8) return;           // only lines that land on a visible original
        const dr = E.ease.outCubic(clamp((t - T_LINES - n++ * 0.03) / 0.5));
        if (dr <= 0) return;
        const ex = lerp(a[0], b[0], dr), ey = lerp(a[1], b[1], dr);
        ctx.setLineDash([]); ctx.strokeStyle = E.rgba('#FFE3A3', alpha * 0.18); ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = E.rgba('#FFE3A3', alpha); ctx.lineWidth = 1.4;
        if (gap > 0.4) { ctx.setLineDash([5, gap]); ctx.lineDashOffset = -t * 34; } else ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.setLineDash([]);
        S.sparkle(ctx, a[0], a[1], 4, alpha * 1.2, '#FFF6E0');
        if (dr > 0.96) S.sparkle(ctx, b[0], b[1], 9, alpha * 1.4, '#FFF6E0', t * 0.5 + k);
      });
    }
    ctx.restore();
  }
  function hair(ctx, P0, P1, P2, col, a, tt) {
    if (a <= 0.003) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const path = new Path2D(); path.moveTo(P0[0], P0[1]); path.quadraticCurveTo(P1[0], P1[1], P2[0], P2[1]);
    ctx.strokeStyle = E.rgba(E.hexOf(col), 0.22 * a); ctx.lineWidth = 7; ctx.stroke(path);
    ctx.strokeStyle = E.rgba(E.hexOf(col), 0.95 * a); ctx.lineWidth = 1.7; ctx.stroke(path);
    ctx.setLineDash([3, 22]); ctx.lineDashOffset = -tt * 80; ctx.strokeStyle = E.rgba('#FFFFFF', 0.7 * a); ctx.lineWidth = 1.6; ctx.stroke(path);
    ctx.restore();
  }
  function filPts(f, t, L3, cam) {
    const it = f.it, C = itemWorld(it), Cs = scr(L3, C[0], C[1]), z = L3.z;
    const Es = [f.side < 0 ? -40 : W + 40, f.ey + TILT * cam.tilt * z];
    // bottom-row jars are hit high on the dome so nothing reaches the gloss band
    const hy = it.r === 2 ? scr(L3, 0, it.jy - JH * 0.62)[1] : Cs[1] + 6 * z;
    const Hs = [Cs[0] + f.side * JRW * 0.88 * z, hy];
    const wv = 7 * Math.sin(t * 1.6 + f.k * 1.3), lim = 1182 + TILT * cam.tilt * z;
    const m1 = [lerp(Es[0], Hs[0], 0.34), Math.min(lim, lerp(Es[1], Hs[1], 0.34) + 24 + wv)];
    const m2 = [lerp(Es[0], Hs[0], 0.7), Math.min(lim, lerp(Es[1], Hs[1], 0.7) + 10 - wv * 0.5)];
    return { pts: [Es, m1, m2, Hs], Hs, Cs, z };
  }
  /* the up-beam: jar knob → own lane → above the vitrine → a point ON the sample's own original */
  function beamRoute(it, t, L1, L3) {
    const lx = LANE[it.key], top = it.jy - JH - 6;
    const J0 = scr(L3, it.jx, top);
    const J1 = it.r === 0 ? scr(L3, lx, top - 70) : scr(L3, lx, top - 16);
    const J2 = scr(L3, lx, 470), J3 = scr(L3, lx, 300);
    const Oc = scr(L1, ...oPos(it, t));
    const aim = AIM[it.key] !== undefined ? AIM[it.key] : Math.atan2(J3[1] - Oc[1], J3[0] - Oc[0]);
    const T = scr(L1, ...origPt(it, t, aim));
    const S4 = [lerp(J3[0], T[0], 0.35), lerp(J3[1], T[1], 0.55)];
    return { pts: [J0, J1, J2, J3, S4, T], T };
  }
  function drawGazes(ctx, t, cam, L1, L3) {
    if (t < T_FIL) return;
    const focus = pp(t, T_FOCUS, T_FOCUS + 0.35, 'inOutSine');
    const fade = 1 - pp(t, 46.55, 47.25, 'inOutSine');
    if (fade <= 0) return;
    const kb = E.ease.outCubic(clamp((t - T_TURN) / T_BEND));            // the visible 0.65 s bend
    for (const f of FILS) {
      const st = T_FIL + 0.05 * f.k, dr = E.ease.outCubic(clamp((t - st) / 0.42));
      if (dr <= 0) continue;
      const G = filPts(f, t, L3, cam), it = f.it, hero = it.hero;
      const R = t >= T_PRISM ? beamRoute(it, t, L1, L3) : null;
      // prism: from the knob a widening 4-colour ribbon rises along the jar's own lane
      const fan = pp(t, T_PRISM, T_PRISM + 0.4, 'outCubic') * (1 - sm((t - T_TURN - 0.15) / 0.45));
      if (R && f.primary && fan > 0.003) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let h = 0; h < 4; h++) {
          const off = (q) => [R.pts[q][0] + HAIR_D[h] * [0, 5, 11, 19][q] * (1 - kb), R.pts[q][1]];
          const pl = A.sampleCurve([off(0), off(1), off(2), off(3)], 24), n = Math.max(2, Math.round(pl.length * fan));
          const path = new Path2D(); pl.slice(0, n).forEach((q, i) => (i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1])));
          ctx.strokeStyle = E.rgba(HAIR[h], 0.25 * fade); ctx.lineWidth = 6; ctx.stroke(path);
          ctx.strokeStyle = E.rgba(HAIR[h], 0.9 * fade); ctx.lineWidth = 1.8; ctx.stroke(path);
        }
        ctx.restore();
      }
      if (t < T_TURN || !R) {
        const inA = lerp(0.72, 1, focus) * fade;
        A.filament(ctx, G.pts, { t: t + f.k * 0.3, draw: dr, w: lerp(2.5, 1.5, focus) * Math.min(1, 0.6 + L3.z * 0.5), halo: lerp(9, 7, focus), col: '#FFE3A3', flow: 70, alpha: inA, head: dr < 1 });
        if (t > f.ta && t < f.ta + 0.6) A.sparks(ctx, t, { x: G.Hs[0], y: G.Hs[1], t0: f.ta, n: 10, seed: 50 + f.k, col: '#FFE3A3', speed: 170, life: 0.5, gravity: 140, size: 1.5 });
        if (t > f.ta - 0.05 && t < f.ta + 0.35) S.sparkle(ctx, G.Hs[0], G.Hs[1], 13 * E.env(t, f.ta - 0.05, f.ta + 0.35, 0.05, 0.3), 1, '#FFF6E0', t * 2);
        continue;
      }
      // MORPH: the gaze filament itself swings up — anchored at the jar, its far end travels from the street to the original
      const pl = A.sampleCurve(G.pts, 40), Fr = [1, 0.8, 0.6, 0.4, 0.2, 0].map((u) => pl[Math.round(u * (pl.length - 1))]).reverse();
      const pts = Fr.map((q, i) => [lerp(q[0], R.pts[i][0], kb), lerp(q[1], R.pts[i][1], kb)]);
      const a = (f.primary ? 1 : 1 - kb) * fade * (hero ? 1 : 0.7);
      A.filament(ctx, pts, { t, w: lerp(1.5, hero ? 2.3 : 1.4, kb), halo: hero ? 11 : 7, col: E.hexOf(E.mix('#FFE3A3', '#FFD27A', kb)), flow: 90, alpha: a, head: false });
      if (f.primary && kb < 0.98) S.sparkle(ctx, pts[5][0], pts[5][1], 10, 0.9 * fade, '#FFF6E0', t * 3);
      if (f.primary) {   // the beam lands ON its original as it ignites
        const hit = E.env(t, T_TURN + T_BEND * 0.75, T_TURN + T_BEND + 0.6, 0.12, 0.45);
        if (hit > 0) { S.light(ctx, R.T[0], R.T[1], hero ? 120 : 70, '#FFE7B0', 0.7 * hit); S.sparkle(ctx, R.T[0], R.T[1], (hero ? 18 : 11) * hit, 1, '#FFFFFF', t); }
      }
    }
  }
  function drawRise(ctx, t, cam, L1) {
    if (t < T_TURN + T_BEND) return;
    const G = gateState(t, cam).G, fade = 1 - pp(t, 47.45, 47.75);
    for (const it of ITEMS) {
      const dr = E.ease.inOutSine(clamp((t - T_TURN - T_BEND - it.rank * 0.035) / 0.95));
      if (dr <= 0) continue;
      const c = scr(L1, ...origPt(it, t, -PI / 2));
      const m1 = [lerp(c[0], G[0], 0.15), c[1] - 120], m2 = [lerp(c[0], G[0], 0.65), lerp(c[1], G[1], 0.6)];
      A.filament(ctx, [c, m1, m2, G], { t, w: it.hero ? 2.1 : 1.2, halo: it.hero ? 10 : 6, col: '#FFD27A', flow: 120, draw: dr, alpha: (it.hero ? 0.9 : 0.5) * fade, head: dr < 1 });
    }
  }
  function gateHalves() {
    const w = GT.w, h = GT.h, op = GG.open, ap = (op.length - 1) / 2;
    const L = op.slice(0, ap + 1).reverse(), R = op.slice(ap);
    const oL = [[0, -h], [-w / 2, -h], [-w / 2, 0]], oR = [[0, -h], [w / 2, -h], [w / 2, 0]];
    return [L, R, oL, oR].map((pts) => {
      const q = new Path2D(); let len = 0;
      pts.forEach((v, i) => { if (i) { q.lineTo(v[0], v[1]); len += Math.hypot(v[0] - pts[i - 1][0], v[1] - pts[i - 1][1]); } else q.moveTo(v[0], v[1]); });
      return { p: q, len };
    });
  }
  let GATE_H = null;
  function drawRadiance(ctx, t, cam) {
    const rad = pp(t, 46.25, 47.45, 'inOutSine');
    if (rad <= 0) return;
    const G = gateState(t, cam).G;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = E.lin(ctx, 0, 0, 0, H, [[0, '#FFD8B0', 0.12 * rad], [0.45, '#FFC090', 0.06 * rad], [1, '#FFC090', 0]]); ctx.fillRect(0, 0, W, H);
    ctx.restore();
    S.light(ctx, G[0], G[1], 1250, '#FFCFA0', 0.18 * rad);
    S.rays(ctx, G[0], G[1], { n: 11, len: 1700, angle: PI / 2, spread: 2.6, width: 0.035, alpha: 0.07 * rad, col: '#FFE9C8', t });
  }
  function drawGate(ctx, t, cam) {
    const gs = gateState(t, cam), G = gs.G, s = gs.s;
    const conv = pp(t, 46.5, 46.95, 'inOutSine');
    const trace = pp(t, T_GATE, T_GATE + 0.42, 'inOutSine'), body = pp(t, T_GATE + 0.18, T_GATE + 0.6, 'outCubic');
    if (conv > 0) {
      S.light(ctx, G[0], G[1], 700, '#FFC890', 0.12 * conv + 0.06 * body);
      S.light(ctx, G[0], G[1], 150, '#FFF6E0', 0.55 * conv * (1 - 0.8 * body));
    }
    if (trace <= 0) return;
    if (!GATE_H) GATE_H = gateHalves();
    const g = SP.gate, ap = GG.apexY;
    ctx.save(); ctx.translate(gs.org[0], gs.org[1]); ctx.scale(s, s);
    ctx.globalCompositeOperation = 'lighter';
    if (body > 0) {
      // portal light: bright under the apex, fading out toward the threshold (no hard bottom edge)
      ctx.globalAlpha = body; ctx.fillStyle = E.lin(ctx, 0, ap, 0, 0, [[0, '#FFFFFF', 0.42], [0.5, '#FFF0D0', 0.16], [1, '#FFD9A0', 0]]); ctx.fill(SP.gateOpen);
      ctx.globalAlpha = 0.25 * body; ctx.drawImage(g.c, -g.ox, -g.oy, g.w, g.h);        // the frame stays a whisper
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    GATE_H.forEach((hp, i) => {
      const k = i < 2 ? 1 : 0.25;                                    // pointed arch bright, outer box faint
      ctx.setLineDash([hp.len * trace, hp.len + 10]);
      ctx.strokeStyle = E.rgba('#FFE7B0', 0.2 * k); ctx.lineWidth = 22 / s; ctx.stroke(hp.p);
      ctx.strokeStyle = E.rgba('#FFF6E0', 0.95 * k); ctx.lineWidth = 3.2 / s; ctx.stroke(hp.p);
    });
    ctx.setLineDash([]);
    if (gs.pass > 0) {
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, Math.pow(gs.pass, 0.6));
      ctx.fillStyle = E.lin(ctx, 0, ap, 0, 0, [[0, '#FFFDF7', 1], [0.7, '#FFFDF7', 0.85], [1, '#FFFDF7', 0.4]]); ctx.fill(SP.gateOpen);
    }
    ctx.restore();
    const fl = E.ease.inQuad(pp(t, 47.38, T1, 'linear'));
    if (fl > 0) { ctx.save(); ctx.fillStyle = E.rgba('#FFFDF7', 0.95 * fl); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  function drawCounter(ctx, t, cam) {
    const top = 1600 + 380 * sm((cam.zoom - 0.52) / 0.9) + 2200 * cam.tilt;
    if (top >= H) return;
    const x = -120 + (540 - cam.x) * 0.6;
    ctx.drawImage(SP.counter.c, x, top - SP.counter.top);
  }
  function drawLatticeFG(ctx, t) {
    // continues G's push through the star window: a crisp walnut kafes with a straight-edged star frame scaling past the edges
    if (t > 37.99) return;
    const R = 500 * Math.exp(5.2 * (t - T0)), s = R / 500;
    const a = 1 - pp(t, 37.82, 37.97, 'inQuad');
    if (a <= 0.003) return;
    E.layer(ctx, (l) => {
      const star = new Path2D(); star.addPath(S.starPath(R, 8, 0.82, PI / 8), new DOMMatrix().translate(540, 760));
      const outer = new Path2D(); outer.rect(-300, -300, W + 600, H + 600); outer.addPath(star);
      l.save(); l.clip(outer, 'evenodd');
      l.save(); l.translate(540, 760); l.scale(s, s);
      A.lattice(l, { w: (W + 700) / s, h: (H + 900) / s, cell: 78, lineW: 14, stroke: '#4A2E1C' });
      l.restore();
      l.globalCompositeOperation = 'source-atop';
      l.fillStyle = E.rad(l, 540, 760, R * 0.9, R * 1.9, [[0, '#E0905A', 0.22], [1, '#E0905A', 0]]); l.fillRect(0, 0, W, H);
      l.restore();
      l.lineJoin = 'miter';
      l.strokeStyle = '#2E1A10'; l.lineWidth = 40 * s; l.stroke(star);
      l.strokeStyle = E.lin(l, 0, 760 - R, 0, 760 + R, [[0, '#8E6444'], [0.5, '#6E4A32'], [1, '#4A2E1C']]); l.lineWidth = 26 * s; l.stroke(star);
      l.strokeStyle = 'rgba(232,194,122,0.85)'; l.lineWidth = Math.max(1.5, 3 * s); l.stroke(star);
    }, { lo: true, blur: lerp(0.8, 3.5, pp(t, T0, 37.95, 'inQuad')), alpha: a });
  }
  /* ---------------- scene ---------------- */
  E.scene({
    id: 'H_numune', t0: T0, t1: T1,
    async setup() {
      buildFacade(); buildFrame(); buildGate(); buildCounter(); buildClouds(); buildSkyline();
      for (const it of ITEMS) { measure(it); buildOriginal(it); }
      setupPlacements();
    },
    post: (t) => {
      const ign = pp(t, 45.5, 46.0, 'outCubic'), fl = pp(t, 47.1, T1, 'inQuad');
      return { bloom: 0.4 + 0.04 * pp(t, T_SOLID, T_SOLID1) + 0.14 * ign + 0.4 * pp(t, 47.4, T1, 'inQuad'), vignette: lerp(0.3, 0.14, pp(t, 46.3, 47.6)), grain: 0.035 };
    },
    draw(ctx, t) {
      t = clamp(t, T0, T1);
      const cam = camAt(t), L1 = lp(cam, PF), L3 = lp(cam, 1);
      const fb = focusBlur(t), roseApart = fb > 0.3;
      drawSky(ctx, t, cam);
      drawFar(ctx, t, cam);
      drawSkyline(ctx, t, cam);
      drawClouds(ctx, t, cam);
      drawShop(ctx, t, cam, roseApart);
      // depth of field: rack focus onto the rose jar / softness during the fast tilt
      const blur = fb;
      if (blur > 0.3) E.layer(ctx, (l) => l.drawImage(ctx.canvas, 0, 0, W, H), { lo: true, blur });
      if (roseApart) inL(ctx, L3, (c) => drawJar(c, ROSE, t, jarState(ROSE, t), jarGlow(ROSE, t)));
      const pulse = E.env(t, 40.74, 41.5, 0.12, 0.5);
      if (pulse > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const it of ITEMS) { const p = scr(L3, ...itemWorld(it)); S.light(ctx, p[0], p[1], 80 * L3.z, '#FFE3A3', 0.35 * pulse); } ctx.restore(); }
      drawProjection(ctx, t, L1, L3);
      drawGazes(ctx, t, cam, L1, L3);
      drawRadiance(ctx, t, cam);
      drawRise(ctx, t, cam, L1);
      inL(ctx, lp(cam, 1.1), (c) => S.dust(c, t, { n: 30, seed: 377, x: -200, y: 0, w: 1480, h: 1250, col: '#FFD9A0', rMin: 0.9, rMax: 2.4, speed: 9, alpha: 0.32 * pp(t, 39.0, 39.8) }));
      drawCounter(ctx, t, cam);
      drawGate(ctx, t, cam);
      drawLatticeFG(ctx, t);
      const gk = glossK(t);
      if (gk > 0.002) {
        ctx.save(); ctx.translate(540, 1400); ctx.scale(1, 220 / 640);
        ctx.fillStyle = E.rad(ctx, 0, 0, 0, 640, [[0, '#080612', 0.2 * gk], [1, '#080612', 0]]); ctx.fillRect(-640, -640, 1280, 1280);
        ctx.restore();
      }
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.1; ctx.fillStyle = '#FF9A4A'; ctx.fillRect(0, 0, W, H); ctx.restore();
    },
  });
})();
