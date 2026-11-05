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
 *  CAMERA (log-zoom keys) 37.6 z1.04 → 37.88 z1 (contract framing) → 38.86 z1.08 settle larger & lower →
 *          38.86–39.95 push in to the rose jar z2.15 + RACK FOCUS (neighbours blur 0→7 px) → 40.12–41.5
 *          pull back & tilt up z2.2→0.5: the far plane, the sky and the originals are revealed → 41.5–43.07 wide
 *          hold with lateral drift → 43.07–44.45 push to a medium shot z0.82 (filaments, prisms) →
 *          46.0–47.7 continuous tilt up 1400 + zoom →1.3 through soft cloud banks into a radiant sky.
 *          Handheld drift (x 6·sin .37t + 3·sin .71t, y 4·sin .29t…, roll .18°) is always on.
 *  BEATS   37.60 lattice rush · ghosts (G's six + rose/carnation/cherries) fly to their shelves
 *          38.36+0.07·rank ghost fills in bottom→top, glass dome set down + bounce, tag swings · 38.84 spec
 *          sweep · 39.0/.25/.5 lanterns ignite · 40.12 originals fade in (first seen as giant petals glowing
 *          behind the little rose jar) · 40.80 dotted projection lines (heroes only, 14 lines) from each sample's
 *          contour to its original's · 41.39 lines solidify, originals brighten · 42.07 breathe
 *          43.38 12 gaze filaments from the L/R frame edges (y 980–1180) land on the jars · 44.06 focus ·
 *          44.76 prism → 4-hair spectrum · 45.33 spectra turn up (spring), recombine to gold and shoot up to
 *          each sample's own original in the sky · 45.58 originals ignite · 45.92+ beams rise from the
 *          originals to one point · 46.8 luminous gate traces on, centred (540,520), framed by the originals ·
 *          47.42–47.80 fly through the gate into #FFFDF7.
 *  Band    glosses 40.79–42.67 / 44.03–45.91: band shows plinth + dark wet setts, scrim ≤ 0.2.
 * ========================================================================== */
(function () {
  'use strict';
  const W = E.W, H = E.H, TAU = Math.PI * 2, PI = Math.PI;
  const clamp = E.clamp, lerp = E.lerp, sm = E.smooth;
  const pp = (t, a, b, e) => E.p(t, a, b, e || 'inOutCubic');
  const T0 = 37.6, T1 = 47.8;

  /* ---------------- timing ---------------- */
  const T_LAND0 = 38.36, T_SPEC = 38.84, T_LANT = [39.0, 39.25, 39.5];
  const T_ORIG = 40.12, T_LINES = 40.8, T_SOLID = 41.39, T_SOLID1 = 42.07;
  const T_FIL = 43.38, T_FOCUS = 44.06, T_PRISM = 44.76, T_TURN = 45.33;
  const T_TILT0 = 46.0, T_TILT1 = 47.7, T_GATE = 46.8, T_PASS = 47.42;
  const PF = 0.25, PS = 0.6, TILT = 1750;     // TILT: world units the camera rises in the final move                  // far plane (originals) / distant skyline parallax

  /* ---------------- camera (log-zoom keyframes) ---------------- */
  const KZ = [[37.6, 1.04], [37.88, 1.0, 'outCubic'], [38.86, 1.08, 'inOutSine'], [39.95, 2.55, 'inOutCubic'], [40.12, 2.62, 'linear'],
    [41.5, 0.5, 'inOutCubic'], [43.07, 0.52, 'linear'], [44.45, 0.82, 'inOutCubic'], [45.95, 0.845, 'linear']];
  const KY = [[37.6, 960], [37.88, 960], [38.86, 905, 'inOutSine'], [39.95, 868, 'inOutCubic'], [40.12, 866, 'linear'],
    [41.5, 652, 'inOutCubic'], [43.07, 656, 'linear'], [44.45, 830, 'inOutCubic'], [45.95, 832, 'linear']];
  const KX = [[37.6, 540], [41.5, 540], [43.07, 560, 'inOutSine'], [44.45, 540, 'inOutSine']];
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
    const z = Math.exp(lerp(Math.log(key(KZ, t, true)), Math.log(1.3), pp(t, 46.3, T_TILT1, 'inOutCubic')));
    let y = key(KY, t) + 14 * E.env(t, 45.62, 46.3, 0.3, 0.38) - TILT * tilt;
    y += 4 * Math.sin(0.29 * t + 1) + 2 * Math.sin(0.83 * t);
    const x = key(KX, t) + 6 * Math.sin(0.37 * t) + 3 * Math.sin(0.71 * t + 2);
    return { x, y, zoom: z, rot: (0.18 * PI / 180) * Math.sin(0.21 * t), tilt };
  }
  const focusBlur = (t) => 7 * pp(t, 39.05, 39.75, 'inOutSine') * (1 - pp(t, 40.12, 40.42, 'inOutSine'));
  const tiltBlur = (t) => 4 * Math.pow(Math.sin(PI * clamp((t - 46.3) / 0.95)), 2);
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
    { key: 'butterfly', r: 0, c: 0, g: [277, 589, 1.96], stand: 'rod', rod: 66, OL: [215, 250, 470, -0.16, 1],
      art: (x, t, pose) => E.at(x, 0, -82, 1, -0.05, () => A.butterfly(x, { size: 31, t: pose ? 0 : t, pattern: 'sapphire', flap: pose ? 0.96 : 0.9 + 0.08 * Math.sin(t * 1.25) })) },
    { key: 'peacock', r: 0, c: 1, g: [540, 587, 1.27], stand: 'cup', OL: [1005, 200, 380, 0.2, 0],
      art: (x, t, pose) => E.at(x, 0, -9, 1, 0.07, () => A.peacockFeather(x, { len: 128, t: pose ? 0 : t, sway: pose ? 0 : 0.5 })) },
    { key: 'snowflake', r: 0, c: 2, g: [803, 589, 1.79], stand: 'rod', rod: 50, OL: [800, 95, 210, 0, 0],
      art: (x, t, pose) => E.at(x, 0, -84, 1, 0, () => A.snowflake(x, { r: 33, t: pose ? 0 : t })) },
    { key: 'carnation', r: 1, c: 0, g: null, stand: 'vase', OL: [45, 430, 320, -0.12, 0],
      art: (x, t, pose) => E.at(x, 0, -24, 1, 0, () => A.flowerSet(x, { type: 'carnation', size: 29, stem: 62, t: pose ? 0 : t, sway: pose ? 0 : 0.45, phase: 1.3 })) },
    { key: 'rose', r: 1, c: 1, g: null, stand: 'vase', OL: [540, 660, 920, 0, 1],
      art: (x, t, pose) => E.at(x, 0, -24, 1, 0, () => {
        const tip = A.stem(x, Object.assign({}, ROSE_STEM, { t: pose ? 0 : t, sway: pose ? 0 : ROSE_STEM.sway }));
        E.at(x, tip.x, tip.y, 1, tip.angle, () => A.heroRose(x, { R: 27, bloom: 1, t: pose ? 0 : t }));
      }),
      oart: (x, t, pose) => roseHead(x, t, pose) },
    { key: 'tulip', r: 1, c: 2, g: [803, 843, 1.51], stand: 'vase', OL: [885, 400, 640, 0.04, 1],
      art: (x, t, pose) => E.at(x, 0, -24, 1, 0, () => A.flowerSet(x, { type: 'tulip', size: 31, stem: 60, t: pose ? 0 : t, sway: pose ? 0 : 0.45, phase: 2.1 })) },
    { key: 'nautilus', r: 2, c: 0, g: [277, 843, 1.59], stand: 'dish', OL: [290, 85, 200, -0.2, 0],
      art: (x, t, pose) => E.at(x, 0, -47, 1, pose ? 0 : 0.02 * Math.sin(t * 0.7), () => A.nautilus(x, { r: 36 })) },
    { key: 'pomegranate', r: 2, c: 1, g: [540, 843, 1.68], stand: 'dish', OL: [170, 475, 390, 0.08, 1],
      art: (x, t, pose) => E.at(x, 0, -40, 1, 0, () => A.pomegranate(x, { r: 31, t: pose ? 0 : t })) },
    { key: 'cherries', r: 2, c: 2, g: null, stand: 'dish', OL: [1030, 625, 230, 0.1, 0],
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
  const HAIR = ['#FF6F91', '#FFD27A', '#6FF0FF', '#B48CFF'], HAIR_D = [-0.27, -0.09, 0.09, 0.27];

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
      x.fillStyle = '#170C14'; x.fillRect(-620, 1240, 2320, 1400);
      x.fillStyle = '#3A2434'; x.fillRect(-620, 1248, 2320, 10); x.fillStyle = 'rgba(255,210,180,0.10)'; x.fillRect(-620, 1248, 2320, 2);
      let y = 1260;
      const rng = E.rng(4711);
      while (y < 2650) {
        const rh = 6.5 + (y - 1260) * 0.058, gap = Math.max(1.3, rh * 0.14), sc = 1 + (y - 1260) / 640;
        let cx = -640 - rng() * 30 * sc;
        while (cx < 1720) {
          const w = sc * (24 + rng() * 22), h = rh - gap, yy = y + gap * 0.5 + (rng() - 0.5) * gap * 0.6;
          const v = rng(), base = v < 0.3 ? '#2E1B29' : v < 0.65 ? '#36212F' : v < 0.9 ? '#3E2636' : '#46293A';
          const r = Math.min(h * 0.45, w * 0.3), j = () => (rng() - 0.5) * h * 0.18;
          x.beginPath();
          x.moveTo(cx + r, yy + j()); x.lineTo(cx + w - gap - r, yy + j()); x.quadraticCurveTo(cx + w - gap, yy, cx + w - gap + j() * 0.5, yy + r);
          x.lineTo(cx + w - gap + j() * 0.5, yy + h - r); x.quadraticCurveTo(cx + w - gap, yy + h, cx + w - gap - r, yy + h + j() * 0.4);
          x.lineTo(cx + r, yy + h + j() * 0.4); x.quadraticCurveTo(cx, yy + h, cx + j() * 0.5, yy + h - r); x.lineTo(cx + j() * 0.5, yy + r); x.quadraticCurveTo(cx, yy, cx + r, yy); x.closePath();
          x.fillStyle = E.lin(x, 0, yy, 0, yy + h, [[0, E.shade(base, 0.1)], [0.5, base], [1, E.shade(base, -0.25)]]); x.fill();
          x.strokeStyle = 'rgba(255,196,160,' + (0.05 + rng() * 0.07).toFixed(3) + ')'; x.lineWidth = Math.max(1, rh * 0.07);
          x.beginPath(); x.moveTo(cx + r, yy + 1); x.lineTo(cx + w - gap - r, yy + 1); x.stroke();
          if (rng() < 0.18) { x.fillStyle = 'rgba(255,214,180,0.06)'; x.beginPath(); x.ellipse(cx + w * 0.45, yy + h * 0.35, w * 0.25, h * 0.14, 0, 0, TAU); x.fill(); }
          cx += w;
        }
        y += rh;
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
    const w = 1320, h = 560, b = E.canvas(w, h), x = b.x;
    x.fillStyle = E.lin(x, 0, 0, 0, 74, [[0, '#4A2A1C'], [0.5, '#3A2016'], [1, '#2A140C']]); x.fillRect(0, 0, w, 74);
    x.globalCompositeOperation = 'lighter';
    x.save(); x.translate(660, 26); x.scale(1, 0.09); x.fillStyle = E.rad(x, 0, 0, 0, 560, [[0, '#FFB070', 0.32], [1, '#FFB070', 0]]); x.fillRect(-560, -560, 1120, 1120); x.restore();
    for (const sx of [482, 650, 818]) { x.save(); x.translate(sx, 34); x.scale(0.18, 1); x.fillStyle = E.rad(x, 0, 0, 0, 60, [[0, '#FFD09A', 0.45], [1, '#FFD09A', 0]]); x.fillRect(-60, -60, 120, 120); x.restore(); }
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = 'rgba(255,214,170,0.45)'; x.fillRect(0, 70, w, 2.5);
    x.fillStyle = E.lin(x, 0, 74, 0, h, [[0, '#2A160E'], [0.4, '#1E0E08'], [1, '#100604']]); x.fillRect(0, 74, w, h - 74);
    x.fillStyle = BRASS(x, 0, w, 0.8); x.fillRect(0, 84, w, 4);
    for (let px = 40; px < w; px += 230) { x.strokeStyle = 'rgba(255,200,150,0.12)'; x.lineWidth = 3; x.strokeRect(px, 120, 190, 300); x.strokeStyle = 'rgba(0,0,0,0.35)'; x.strokeRect(px + 4, 124, 190, 300); }
    const o = E.canvas(w, h); o.x.filter = 'blur(6px)'; o.x.drawImage(b.c, 0, 0);
    SP.counter = o.c;
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
    { p: 0.5, t: 47.4, x: 250, y: 1080, s: 1.15, a: 0.9, i: 0, back: true },
    { p: 0.5, t: 47.4, x: 900, y: 1180, s: 1.05, a: 0.85, i: 1, back: true },
    { p: 0.62, t: 47.2, x: 560, y: 980, s: 1.35, a: 0.7, i: 2, back: true },
    { p: 1.3, t: 46.95, x: 300, y: 860, s: 1.25, a: 0.62, i: 1, back: false, blur: 1 },
    { p: 1.45, t: 47.12, x: 840, y: 700, s: 1.45, a: 0.58, i: 0, back: false, blur: 1 },
    { p: 1.0, t: 47.45, x: 380, y: 1620, s: 1.9, a: 0.95, i: 2, back: false, low: true },
    { p: 1.0, t: 47.45, x: 900, y: 1700, s: 1.7, a: 0.95, i: 1, back: false, low: true },
  ];
  function setupPlacements() {
    for (const c of CLOUDS) { const L = lp(camAt(c.t), c.p); c.W = unscr(L, c.x, c.y); c.ws = c.s / L.z; }
    const Lw = lp(camAt(42.3), PS); SP.skyW = unscr(Lw, -1100, 585); SP.skyS = 1 / Lw.z;
  }

  /* ---------------- per-frame helpers ---------------- */
  function itemWorld(it) { return [it.jx + it.cl[0], it.fy + it.cl[1]]; }
  function origBreath(it, t) { return 1 + 0.015 * Math.sin(t * TAU / 3.2 + it.i * 0.9); }
  function ignite(it, t) { return pp(t, 45.58 + it.rank * 0.022, 45.95 + it.rank * 0.022, 'outCubic'); }
  function origAlpha(it, t) {
    const a0 = 0.4 * pp(t, T_ORIG + it.rank * 0.03, T_ORIG + 0.8 + it.rank * 0.03, 'inOutSine');
    const a1 = 0.14 * pp(t, T_SOLID, T_SOLID1, 'inOutSine');
    const endDim = 1 - 0.4 * pp(t, 46.6, 47.3, 'inOutSine');            // let the gate carry the end
    return (a0 + a1 + 0.26 * ignite(it, t)) * (it.hero ? 1 : 0.45) * endDim;
  }
  /* far-world point on the original's contour at screen angle a */
  function origPt(it, t, a) {
    const r = it.polarAt(a - it.orot) * it.M / RES * origBreath(it, t);
    return [it.O[0] + Math.cos(a) * r, it.O[1] + Math.sin(a) * r];
  }

  function gateState(t, cam) {
    const pRef = E.ease.inOutCubic((47.4 - T_TILT0) / (T_TILT1 - T_TILT0));
    const y = 520 + (cam.tilt - pRef) * 1000;
    const s = 0.9 + 0.12 * cam.tilt;
    const pass = E.ease.inCubic(clamp((t - T_PASS) / (T1 - T_PASS)));
    const sp = s * (1 + 6.5 * pass);
    const oc = [540, y + (-GT.h / 2 + 30) * s];
    const org = [540, y + (GT.h / 2) * s];
    return { s: sp, pass, oc, org: [oc[0] + (org[0] - oc[0]) * (sp / s), oc[1] + (org[1] - oc[1]) * (sp / s)], G: [oc[0], oc[1] - 40 * s] };
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
    c.translate(it.O[0], it.O[1]); c.rotate(it.orot); c.scale(s, s);
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
  function drawClouds(ctx, t, cam, back) {
    const tl = cam.tilt;
    const vis = sm((tl - 0.04) / 0.25);
    if (vis <= 0.003) return;
    for (const cl of CLOUDS) {
      if (cl.back !== back) continue;
      const L = lp(cam, cl.p), spr = SP.clouds[cl.i], drift = 30 * Math.sin(t * 0.3 + cl.i);
      const a = cl.a * vis * (back || cl.low ? 1 : 1 - sm((tl - 0.86) / 0.12));
      if (a <= 0.003) continue;
      inL(ctx, L, (c) => {
        c.save(); c.globalAlpha = a; c.translate(cl.W[0] + drift, cl.W[1]); c.scale(cl.ws, cl.ws);
        if (cl.blur) c.filter = 'blur(4px)';
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
      } else { a = 0.62 * pp(t, 37.72, 38.12, 'outCubic'); s *= lerp(0.82, 1, pp(t, 37.72, 38.2, 'outCubic')); }
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
    const g = E.glossActive(t) ? 0.8 : 1, lit = pp(t, 39.0, 39.8);
    inL(ctx, L3, (c) => {
      c.save(); c.globalCompositeOperation = 'lighter';
      const p = new Path2D(); p.moveTo(150, 1262); p.lineTo(930, 1262); p.lineTo(1300, 2300); p.lineTo(-220, 2300); p.closePath();
      c.fillStyle = E.lin(c, 0, 1262, 0, 2100, [[0, '#FFB070', 0.13 * g], [0.45, '#FF9A5A', 0.05 * g], [1, '#FF9A5A', 0]]); c.fill(p);
      const refl = (x, w, a0, col) => {
        const sh = 0.85 + 0.15 * Math.sin(t * 2.1 + x * 0.05);
        c.save(); c.translate(x, 1272); c.scale(w / 100, 1);
        c.fillStyle = E.lin(c, 0, 0, 0, 700, [[0, col, a0 * sh], [0.5, col, a0 * 0.4 * sh], [1, col, 0]]);
        c.beginPath(); c.moveTo(-100, 0); c.lineTo(100, 0); c.lineTo(60, 700); c.lineTo(-60, 700); c.closePath(); c.fill(); c.restore();
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
    const gap = lerp(9, 0, solid);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    let n = 0;
    for (const key in PLINES) {
      const it = byKey[key], C = itemWorld(it);
      PLINES[key].forEach((an, k) => {
        const dr = E.ease.outCubic(clamp((t - T_LINES - n++ * 0.03) / 0.5));
        if (dr <= 0) return;
        const rs = it.polarAt(an), a = scr(L3, C[0] + Math.cos(an) * rs, C[1] + Math.sin(an) * rs), b = scr(L1, ...origPt(it, t, an));
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
    const Hs = [Cs[0] + f.side * JRW * 0.9 * z, Cs[1] + 6 * z];
    const wv = 7 * Math.sin(t * 1.6 + f.k * 1.3);
    const lim = 1182 + TILT * cam.tilt * z;
    const m1 = [lerp(Es[0], Hs[0], 0.34), Math.min(lim, lerp(Es[1], Hs[1], 0.34) + 24 + wv)];
    const m2 = [lerp(Es[0], Hs[0], 0.7), Math.min(lim, lerp(Es[1], Hs[1], 0.7) + 10 - wv * 0.5)];
    return { pts: [Es, m1, m2, Hs], Hs, Xs: [Cs[0] - f.side * JRW * 0.9 * z, Cs[1] + 6 * z], Cs, z };
  }
  function drawGazes(ctx, t, cam, L1, L3) {
    if (t < T_FIL) return;
    const focus = pp(t, T_FOCUS, T_FOCUS + 0.35, 'inOutSine');
    const fade = 1 - pp(t, 46.5, 47.3, 'inOutSine');
    if (fade <= 0) return;
    const turnRaw = clamp((t - T_TURN) / 0.6), turn = turnRaw <= 0 ? 0 : E.ease.spring(turnRaw), kc = clamp(turn);
    for (const f of FILS) {
      const st = T_FIL + 0.05 * f.k, dr = E.ease.outCubic(clamp((t - st) / 0.42));
      if (dr <= 0) continue;
      const G = filPts(f, t, L3, cam);
      const inA = lerp(0.72, 1, focus) * fade * (1 - 0.6 * pp(t, 45.4, 45.95, 'inOutSine'));
      A.filament(ctx, G.pts, { t: t + f.k * 0.3, draw: dr, w: lerp(2.5, 1.5, focus) * Math.min(1, 0.6 + L3.z * 0.5), halo: lerp(9, 7, focus), col: '#FFE3A3', flow: 70, alpha: inA, head: dr < 1 });
      if (t > f.ta && t < f.ta + 0.6) A.sparks(ctx, t, { x: G.Hs[0], y: G.Hs[1], t0: f.ta, n: 10, seed: 50 + f.k, col: '#FFE3A3', speed: 170, life: 0.5, gravity: 140, size: 1.5 });
      if (t > f.ta - 0.05 && t < f.ta + 0.35) S.sparkle(ctx, G.Hs[0], G.Hs[1], 13 * E.env(t, f.ta - 0.05, f.ta + 0.35, 0.05, 0.3), 1, '#FFF6E0', t * 2);
      const thr = pp(t, T_PRISM + f.k * 0.006, T_PRISM + 0.12 + f.k * 0.006, 'outCubic');
      if (thr <= 0) continue;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.strokeStyle = E.rgba('#FFFFFF', 0.75 * fade * (1 - 0.6 * kc)); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(G.Hs[0], G.Hs[1]); ctx.lineTo(lerp(G.Hs[0], G.Xs[0], thr), lerp(G.Hs[1], G.Xs[1], thr)); ctx.stroke();
      ctx.restore();
      const fan = pp(t, T_PRISM + 0.1, T_PRISM + 0.45, 'outCubic');
      if (fan <= 0) continue;
      const th0 = f.side < 0 ? 0 : PI, dth = f.side < 0 ? -PI / 2 : PI / 2, X = G.Xs;
      // target: the point of the sample's own original that faces the jar
      const Oc = scr(L1, f.it.O[0], f.it.O[1]), aim = Math.atan2(G.Cs[1] - Oc[1], G.Cs[0] - Oc[0]);
      const tgt = scr(L1, ...origPt(f.it, t, aim));
      const Lf = 132 * G.z * fan, L2 = Math.hypot(tgt[0] - X[0], tgt[1] - X[1]), Lc = lerp(Lf, L2, kc);
      const hairA = (1 - sm(clamp((turnRaw - 0.45) / 0.4))) * fade;
      for (let h = 0; h < 4; h++) {
        if (hairA <= 0.003) break;
        const th = th0 + HAIR_D[h] * (1 - kc) + dth * turn;
        const P1 = [X[0] + Math.cos(th0 + dth * turn) * Lc * 0.4, X[1] + Math.sin(th0 + dth * turn) * Lc * 0.4];
        let P2 = [X[0] + Math.cos(th) * Lc, X[1] + Math.sin(th) * Lc];
        P2 = [lerp(P2[0], tgt[0], kc * kc), lerp(P2[1], tgt[1], kc * kc)];
        hair(ctx, X, P1, P2, E.mix(HAIR[h], '#FFD27A', kc), 0.95 * hairA, t + h * 0.21);
      }
      if (kc > 0.3) {
        const P1 = [X[0], X[1] - Math.min(L2 * 0.4, 260)];
        const goldA = sm((turnRaw - 0.3) / 0.45) * fade * (f.it.hero ? 1 : 0.75);
        A.filament(ctx, [X, P1, tgt], { t, w: f.it.hero ? 2 : 1.4, halo: 10, col: '#FFD27A', flow: 90, draw: clamp(kc * 1.05), alpha: goldA, head: kc < 0.98 });
      }
    }
  }
  function drawRise(ctx, t, cam, L1) {
    if (t < 45.9) return;
    const gs = gateState(t, cam), G = gs.G;
    const fade = 1 - pp(t, 47.45, 47.75);
    for (const it of ITEMS) {
      const dr = E.ease.inOutSine(clamp((t - 45.92 - it.rank * 0.035) / 0.95));
      if (dr <= 0) continue;
      const Oc = scr(L1, it.O[0], it.O[1]), aim = Math.atan2(G[1] - Oc[1], G[0] - Oc[0]);
      const c = scr(L1, ...origPt(it, t, aim));
      const m1 = [lerp(c[0], G[0], 0.2), c[1] - 160], m2 = [lerp(c[0], G[0], 0.62), lerp(c[1], G[1], 0.62)];
      A.filament(ctx, [c, m1, m2, G], { t, w: it.hero ? 2.2 : 1.3, halo: it.hero ? 11 : 6, col: '#FFD27A', flow: 120, draw: dr, alpha: (it.hero ? 0.95 : 0.6) * fade, head: dr < 1 });
      if (t > 45.62 && t < 46.4) S.light(ctx, c[0], c[1], it.hero ? 130 : 70, '#FFE7B0', 0.5 * E.env(t, 45.62 + it.rank * 0.022, 46.4, 0.08, 0.4));
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
    const trace = pp(t, T_GATE, T_GATE + 0.4, 'inOutSine'), body = pp(t, T_GATE + 0.18, T_GATE + 0.6, 'outCubic');
    if (conv > 0) {
      S.light(ctx, G[0], G[1], 700, '#FFC890', 0.12 * conv + 0.06 * body);
      S.light(ctx, G[0], G[1], 150, '#FFF6E0', 0.55 * conv * (1 - 0.8 * body));
    }
    if (trace <= 0) return;
    if (!GATE_H) GATE_H = gateHalves();
    const g = SP.gate;
    ctx.save(); ctx.translate(gs.org[0], gs.org[1]); ctx.scale(s, s);
    ctx.globalCompositeOperation = 'lighter';
    if (body > 0) {
      ctx.globalAlpha = body;
      ctx.fillStyle = E.lin(ctx, 0, -GT.h, 0, 0, [[0, '#FFFFFF', 0.32], [0.45, '#FFF0D0', 0.16], [1, '#FFD9A0', 0.06]]); ctx.fill(SP.gateOpen);
      ctx.globalAlpha = 0.32 * body; ctx.drawImage(g.glow, -g.ox, -g.oy, g.w, g.h);
      ctx.globalAlpha = body; ctx.drawImage(g.c, -g.ox, -g.oy, g.w, g.h);
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const hp of GATE_H) {
      ctx.setLineDash([hp.len * trace, hp.len + 10]);
      ctx.strokeStyle = E.rgba('#FFE7B0', 0.16); ctx.lineWidth = 16 / s; ctx.stroke(hp.p);
      ctx.strokeStyle = E.rgba('#FFF6E0', 0.9); ctx.lineWidth = 3 / s; ctx.stroke(hp.p);
    }
    ctx.setLineDash([]);
    if (gs.pass > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, Math.pow(gs.pass, 0.6)); ctx.fillStyle = '#FFFDF7'; ctx.fill(SP.gateOpen); }
    ctx.restore();
    const fl = E.ease.inQuad(pp(t, 47.38, T1, 'linear'));
    if (fl > 0) { ctx.save(); ctx.fillStyle = E.rgba('#FFFDF7', 0.95 * fl); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  function drawCounter(ctx, t, cam) {
    const top = 1600 + 380 * sm((cam.zoom - 0.52) / 0.9) + 2200 * cam.tilt;
    if (top >= H) return;
    const x = -120 + (540 - cam.x) * 0.6;
    ctx.drawImage(SP.counter, x, top);
  }
  function drawLatticeFG(ctx, t) {
    if (t > 38.05) return;
    const k = clamp((t - T0) / (38.05 - T0));
    const s = 0.9 * Math.exp(4.9 * (t - T0));
    const a = 1 - pp(t, 37.88, 38.04, 'inQuad');
    if (a <= 0.003) return;
    E.layer(ctx, (l) => {
      l.save(); l.translate(540, 780); l.scale(s, s); l.rotate(0.03 * (1 - k));
      A.lattice(l, { w: 1500, h: 2600, cell: 74, lineW: 12.5, stroke: '#24140C' });
      l.globalCompositeOperation = 'destination-out'; l.fillStyle = '#000';
      l.fill(S.starPath(330, 8, 0.8, PI / 8));
      l.restore();
      l.globalCompositeOperation = 'source-atop';
      l.fillStyle = E.rad(l, 540, 800, 300 * s, 700 * s, [[0, '#E0905A', 0.18], [1, '#E0905A', 0]]); l.fillRect(0, 0, W, H);
      l.fillStyle = 'rgba(20,8,14,0.3)'; l.fillRect(0, 0, W, H);
    }, { lo: true, blur: lerp(2, 15, E.ease.inCubic(k)), alpha: a });
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
      const fb = focusBlur(t), mb = tiltBlur(t), roseApart = fb > 0.3;
      drawSky(ctx, t, cam);
      drawFar(ctx, t, cam);
      drawSkyline(ctx, t, cam);
      drawClouds(ctx, t, cam, true);
      drawShop(ctx, t, cam, roseApart);
      // depth of field: rack focus onto the rose jar / softness during the fast tilt
      const blur = Math.max(fb, mb);
      if (blur > 0.3) E.layer(ctx, (l) => l.drawImage(ctx.canvas, 0, 0, W, H), { lo: true, blur });
      if (roseApart) inL(ctx, L3, (c) => drawJar(c, ROSE, t, jarState(ROSE, t), jarGlow(ROSE, t)));
      const pulse = E.env(t, 40.74, 41.5, 0.12, 0.5);
      if (pulse > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const it of ITEMS) { const p = scr(L3, ...itemWorld(it)); S.light(ctx, p[0], p[1], 80 * L3.z, '#FFE3A3', 0.35 * pulse); } ctx.restore(); }
      drawProjection(ctx, t, L1, L3);
      drawGazes(ctx, t, cam, L1, L3);
      drawRadiance(ctx, t, cam);
      drawRise(ctx, t, cam, L1);
      drawClouds(ctx, t, cam, false);
      inL(ctx, lp(cam, 1.1), (c) => S.dust(c, t, { n: 30, seed: 377, x: -200, y: 0, w: 1480, h: 1250, col: '#FFD9A0', rMin: 0.9, rMax: 2.4, speed: 9, alpha: 0.32 * pp(t, 39.0, 39.8) }));
      drawCounter(ctx, t, cam);
      drawGate(ctx, t, cam);
      drawLatticeFG(ctx, t);
      if (E.glossActive(t)) {
        ctx.save(); ctx.translate(540, 1400); ctx.scale(1, 220 / 640);
        ctx.fillStyle = E.rad(ctx, 0, 0, 0, 640, [[0, '#080612', 0.2], [1, '#080612', 0]]); ctx.fillRect(-640, -640, 1280, 1280);
        ctx.restore();
      }
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.1; ctx.fillStyle = '#FF9A4A'; ctx.fillRect(0, 0, W, H); ctx.restore();
    },
  });
})();
