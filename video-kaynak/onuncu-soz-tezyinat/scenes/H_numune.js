/* =============================================================================
 * H_numune · 37.60–47.80 · "samples; images of other things; they turn the customers' gazes to their originals"
 * -----------------------------------------------------------------------------
 * PLAN (world = L3 coords; at the rest camera (540,960) zoom 1 → world == screen)
 *  Layers  L0 sky p.05 (plum gradient #241634→#4A2A45→#6E3B3B, faint stars revealed by the final tilt)
 *          L1 far p.30 (luminous haze behind the vitrine's open back glass, mist, motes, the 9 ORIGINALS)
 *          L3 facade p1 (plum masonry wall, wooden eave + tiled roof, A.archGate vitrine: frame x40–1040,
 *             opening x141–939 apex y300 base y1150; A.lattice tympanum y300–460 + rail/valance; 2 shelves + sill;
 *             9 A.bellJar samples; stone plinth; cobbled street in band/foot)
 *          L4 p1.4 (3 A.hangingLantern, pierced light dots) · L5 screen (kafes lattice rushing past, 37.6–38.03)
 *  Grid    cols x 310/540/770, jar bases y 705/925/1145 (content centres ≈ 620/840/1060)
 *          R1 butterfly | peacock | snowflake · R2 carnation | ROSE | tulip · R3 nautilus | pomegranate | cherries
 *          (G's 3×2 gallery ghosts land straight below their G cells; rose/carnation/cherries are new)
 *  ORIGINALS: each = the SAME asset drawing, scaled ×3–7, turned into a luminous silhouette (offscreen →
 *          'source-in' #FFF6E0, eroded contour, luminance tint, blurred #FFD27A halo); the rose uses
 *          A.heroRose 'outline'. They sit concentric behind their own jar (aligned at t≈41.6) so the sample
 *          reads as the original's image; parallax separates them in the final tilt (they are far & immense).
 *  Beats   37.60–38.03 lattice (star-shaped kafes hole) rushes past, camera settles 1.05→1.0, ghosts fly to shelves
 *          38.36+0.07·rank (rank = distance from centre) ghost fills in bottom→top, dome drops & bounces, tag swings
 *          38.84–39.34 specular band sweeps L→R across all jars · 39.0/39.25/39.5 lanterns ignite
 *          38.03–39.7 push in 1.0→1.1
 *          40.12 originals bloom out of their samples (scale .45→1, alpha →.25, soft) · 40.80 dotted radial
 *          projection lines sample-contour → original-contour (dash 4/8, flowing) · 41.39–42.07 lines solidify,
 *          originals .25→.40 · 40.15–42.07 tilt up 55 px · 42.07–43.07 originals breathe, lanterns sway
 *          43.40–43.95 12 gaze filaments enter from L/R edges at y 980–1180, land on jars (glow + sparks)
 *          44.08 filaments narrow & focus · 44.76 jar glass = prism → 4-hair spectrum
 *          45.33 all spectra turn upward at once (spring .6 s), recombine to gold, reach the original's crown,
 *          originals ignite (.40→.85, bloom↑) · 45.95+ beams rise from the originals to one point high above
 *          46.0–48.2 tilt up 1400 + zoom 1.12→1.3 (vitrine slides out, originals revealed above the roofline)
 *          46.85–47.35 luminous A.archGate forms where the beams converge, centred (540,520)
 *          47.42–47.80 pass through the gate: arch scales past the frame, white bloom #FFFDF7
 *  Band    glosses 40.79–42.67 / 44.03–45.91: band = dark plinth/street, faint scrim, filaments never below 1182
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
  const T_TILT0 = 46.0, T_TILT1 = 47.75, T_GATE = 46.8, T_PASS = 47.42;
  const PF = 0.25, PL = 1.15;            // far-plane / lantern parallax

  /* ---------------- camera ---------------- */
  function camAt(t) {
    const tilt = pp(t, T_TILT0, T_TILT1, 'inOutCubic');
    let z = lerp(1.05, 1.0, pp(t, 37.6, 37.95, 'outCubic'));
    z = lerp(z, 1.1, pp(t, 38.03, 39.7));
    z = lerp(z, 1.12, pp(t, 43.07, 44.71, 'inOutSine'));
    z = lerp(z, 1.3, tilt);
    let y = 960;
    y = lerp(y, 985, pp(t, 38.03, 39.7));
    y = lerp(y, 930, pp(t, 40.15, 42.07, 'inOutSine'));
    y = lerp(y, 940, pp(t, 43.07, 44.71, 'inOutSine'));
    y += 14 * E.env(t, 45.62, 46.3, 0.3, 0.38);           // anticipation before the big tilt
    y -= 1400 * tilt;
    y += 2 * Math.sin(0.29 * t + 1);
    const x = 540 + 3 * Math.sin(0.37 * t);
    return { x, y, zoom: z, rot: (0.15 * PI / 180) * Math.sin(0.21 * t), tilt };
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
    E.at(x, tip.x, tip.y, 1, tip.angle, () => A.heroRose(x, { R: 27, bloom: 1, t: pose ? 0 : t, variant: variant || (pose ? 'normal' : 'mini') }));
  });
  const ITEMS = [
    { key: 'butterfly', r: 0, c: 0, g: [277, 589, 1.96], stand: 'rod', rod: 66, tgt: 300,
      art: (x, t, pose) => E.at(x, 0, -82, 1, -0.05, () => A.butterfly(x, { size: 31, t: pose ? 0 : t, pattern: 'sapphire', flap: pose ? 0.96 : 0.9 + 0.08 * Math.sin(t * 1.25) })) },
    { key: 'peacock', r: 0, c: 1, g: [540, 587, 1.27], stand: 'cup', tgt: 330,
      art: (x, t, pose) => E.at(x, 0, -9, 1, 0.07, () => A.peacockFeather(x, { len: 128, t: pose ? 0 : t, sway: pose ? 0 : 0.5 })) },
    { key: 'snowflake', r: 0, c: 2, g: [803, 589, 1.79], stand: 'rod', rod: 50, tgt: 280,
      art: (x, t, pose) => E.at(x, 0, -84, 1, 0, () => A.snowflake(x, { r: 33, t: pose ? 0 : t })) },
    { key: 'carnation', r: 1, c: 0, g: null, stand: 'vase', tgt: 285,
      art: (x, t, pose) => E.at(x, 0, -24, 1, 0, () => A.flowerSet(x, { type: 'carnation', size: 29, stem: 62, t: pose ? 0 : t, sway: pose ? 0 : 0.45, phase: 1.3 })) },
    { key: 'rose', r: 1, c: 1, g: null, stand: 'vase', tgt: 360,
      art: (x, t, pose) => E.at(x, 0, -24, 1, 0, () => {
        const tip = A.stem(x, Object.assign({}, ROSE_STEM, { t: pose ? 0 : t, sway: pose ? 0 : ROSE_STEM.sway }));
        E.at(x, tip.x, tip.y, 1, tip.angle, () => A.heroRose(x, { R: 27, bloom: 1, t: pose ? 0 : t, variant: pose ? 'normal' : 'mini' }));
      }),
      oart: (x, t, pose) => roseHead(x, t, pose) },
    { key: 'tulip', r: 1, c: 2, g: [803, 843, 1.51], stand: 'vase', tgt: 285,
      art: (x, t, pose) => E.at(x, 0, -24, 1, 0, () => A.flowerSet(x, { type: 'tulip', size: 31, stem: 60, t: pose ? 0 : t, sway: pose ? 0 : 0.45, phase: 2.1 })) },
    { key: 'nautilus', r: 2, c: 0, g: [277, 843, 1.59], stand: 'dish', tgt: 270,
      art: (x, t, pose) => E.at(x, 0, -47, 1, pose ? 0 : 0.02 * Math.sin(t * 0.7), () => A.nautilus(x, { r: 36 })) },
    { key: 'pomegranate', r: 2, c: 1, g: [540, 843, 1.68], stand: 'dish', tgt: 275,
      art: (x, t, pose) => E.at(x, 0, -40, 1, 0, () => A.pomegranate(x, { r: 31, t: pose ? 0 : t })) },
    { key: 'cherries', r: 2, c: 2, g: null, stand: 'dish', tgt: 270,
      art: (x, t, pose) => E.at(x, 0, -54, 1, pose ? 0 : 0.03 * Math.sin(t * 0.9 + 1), () => A.cherries(x, { size: 74 })) },
  ];
  ITEMS.forEach((it, i) => {
    it.i = i; it.jx = COLX[it.c]; it.jy = ROWY[it.r]; it.fy = it.jy - JBH;           // jar base / floor
    const d = Math.hypot(it.c - 1, (it.r - 1) * 0.95);
    it.d = d;
  });
  ITEMS.slice().sort((a, b) => a.d - b.d || a.r - b.r || a.c - b.c).forEach((it, k) => { it.rank = k; it.tLand = T_LAND0 + 0.07 * k; });
  const byKey = {}; ITEMS.forEach((it) => (byKey[it.key] = it));

  /* 12 gaze filaments: [side (-1 = enters from left), target, entry screen y] */
  const FILS = [
    [-1, 'butterfly', 992], [1, 'snowflake', 998], [-1, 'carnation', 1062], [1, 'tulip', 1070],
    [-1, 'rose', 1112], [1, 'rose', 1104], [-1, 'nautilus', 1150], [1, 'cherries', 1158],
    [-1, 'peacock', 1030], [1, 'peacock', 1022], [-1, 'pomegranate', 1178], [1, 'pomegranate', 1172],
  ].map((f, k) => ({ side: f[0], it: byKey[f[1]], ey: f[2], k, ta: T_FIL + 0.05 * k + 0.42 }));
  const HAIR = ['#FF6F91', '#FFD27A', '#6FF0FF', '#B48CFF'], HAIR_D = [-0.27, -0.09, 0.09, 0.27];
  /* one saturated spectrum hair (quadratic), additive, with a soft glow and a travelling sparkle */
  function hair(ctx, P0, P1, P2, col, a, tt) {
    if (a <= 0.003) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const path = new Path2D(); path.moveTo(P0[0], P0[1]); path.quadraticCurveTo(P1[0], P1[1], P2[0], P2[1]);
    ctx.strokeStyle = E.rgba(E.hexOf(col), 0.22 * a); ctx.lineWidth = 7; ctx.stroke(path);
    ctx.strokeStyle = E.rgba(E.hexOf(col), 0.95 * a); ctx.lineWidth = 1.7; ctx.stroke(path);
    ctx.setLineDash([3, 22]); ctx.lineDashOffset = -tt * 80; ctx.strokeStyle = E.rgba('#FFFFFF', 0.7 * a); ctx.lineWidth = 1.6; ctx.stroke(path);
    ctx.restore();
  }

  /* lanterns (L4 coords == screen at rest) */
  const LANTS = [{ x: 205, y: 96, size: 104, ph: 0.0 }, { x: 540, y: 92, size: 112, ph: 1.9 }, { x: 875, y: 96, size: 104, ph: 3.7 }];

  /* ---------------- sprites (setup) ---------------- */
  const SP = {};
  function spriteWorld(x0, y0, w, h, k, fn) { const b = E.canvas(Math.ceil(w * k), Math.ceil(h * k)); b.x.scale(k, k); b.x.translate(-x0, -y0); fn(b.x); return { c: b.c, x0, y0, w, h }; }
  const drawSpr = (ctx, s) => ctx.drawImage(s.c, s.x0, s.y0, s.w, s.h);

  function buildFacade() {
    // wall + eave + roof + plinth (opening cut out). World x −20..1100, y −70..1252 (sky above the roof)
    SP.facade = spriteWorld(-20, -70, 1120, 1322, 1.12, (x) => {
      x.fillStyle = E.lin(x, 0, 60, 0, 1250, [[0, '#2A1729'], [0.3, '#3A2238'], [0.8, '#4C2B42'], [1, '#5A3346']]);
      x.fillRect(-20, 40, 1120, 1212);
      // alternating stone / brick courses (Ottoman almaşık)
      for (let y = 150, i = 0; y < 1150; y += 58, i++) {
        x.fillStyle = 'rgba(120,70,96,0.10)'; x.fillRect(-20, y, 1120, 13);
        x.fillStyle = 'rgba(10,4,12,0.16)'; x.fillRect(-20, y + 13, 1120, 2);
        x.fillStyle = 'rgba(10,4,12,0.10)';
        for (let k = 0; k < 24; k++) { const jx = ((k * 61 + (i % 2) * 30) % 1180) - 40; x.fillRect(jx, y + 15, 2, 43); }
      }
      // shadow under the eave
      x.fillStyle = E.lin(x, 0, 94, 0, 300, [[0, '#0E0610', 0.66], [1, '#0E0610', 0]]); x.fillRect(-20, 94, 1120, 206);
      // eave beam
      x.fillStyle = E.lin(x, 0, 48, 0, 96, [[0, '#4A2E1E'], [0.35, '#5E3B26'], [1, '#22130C']]); x.fillRect(-20, 48, 1120, 48);
      x.fillStyle = 'rgba(255,214,160,0.16)'; x.fillRect(-20, 50, 1120, 2);
      x.fillStyle = '#C99A4A'; x.globalAlpha = 0.5; x.fillRect(-20, 86, 1120, 2.5); x.globalAlpha = 1;
      // corbels
      for (let cx = 0; cx <= 1090; cx += 122) {
        const p = new Path2D(); p.moveTo(cx - 13, 96); p.lineTo(cx + 13, 96); p.lineTo(cx + 13, 106); p.bezierCurveTo(cx + 13, 122, cx + 4, 126, cx + 3, 136); p.lineTo(cx - 3, 136); p.bezierCurveTo(cx - 4, 126, cx - 13, 122, cx - 13, 106); p.closePath();
        x.fillStyle = E.lin(x, cx - 13, 0, cx + 13, 0, [[0, '#5E3B26'], [0.5, '#3E2618'], [1, '#1E100A']]); x.fill(p);
        x.fillStyle = 'rgba(10,4,8,0.35)'; x.fillRect(cx + 13, 96, 7, 26);
      }
      // roof tiles (two courses, scalloped)
      x.fillStyle = E.lin(x, 0, -44, 0, 50, [[0, '#1C1020'], [1, '#34202C']]); x.fillRect(-20, -44, 1120, 94);
      for (let row = 0; row < 2; row++) {
        const yb = 52 - row * 44;
        for (let cx = -20 + (row % 2) * 17; cx < 1110; cx += 34) {
          x.fillStyle = E.lin(x, 0, yb - 44, 0, yb, [[0, '#2A1824'], [0.8, '#4A2E3A'], [1, '#5E3A44']]);
          x.beginPath(); x.moveTo(cx - 17, yb - 46); x.lineTo(cx - 17, yb - 8); x.quadraticCurveTo(cx, yb + 4, cx + 17, yb - 8); x.lineTo(cx + 17, yb - 46); x.closePath(); x.fill();
          x.strokeStyle = 'rgba(8,3,8,0.5)'; x.lineWidth = 1.5; x.stroke();
        }
      }
      // ridge
      x.fillStyle = E.lin(x, 0, -60, 0, -40, [[0, '#5A3A44'], [1, '#24141E']]); x.fillRect(-20, -58, 1120, 16);
      x.fillStyle = 'rgba(255,200,170,0.18)'; x.fillRect(-20, -58, 1120, 2);
      // plinth
      x.fillStyle = E.lin(x, 0, 1150, 0, 1252, [[0, '#5A3448'], [0.18, '#4A2A40'], [1, '#2E1A2A']]); x.fillRect(-20, 1150, 1120, 102);
      x.fillStyle = '#6E4458'; x.fillRect(-20, 1150, 1120, 9); x.fillStyle = 'rgba(255,220,190,0.16)'; x.fillRect(-20, 1150, 1120, 2);
      x.fillStyle = 'rgba(10,4,12,0.35)'; x.fillRect(-20, 1159, 1120, 4);
      for (let k = 0; k < 9; k++) { x.fillStyle = 'rgba(10,4,12,0.18)'; x.fillRect(k * 136 - 10, 1163, 2, 89); }
      // cut the vitrine opening
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; x.fill(OPEN_PATH); x.globalCompositeOperation = 'source-over';
    });
    // street (cobbles) world y 1240..2040
    SP.street = spriteWorld(-20, 1240, 1120, 800, 1.0, (x) => {
      x.fillStyle = E.lin(x, 0, 1240, 0, 2040, [[0, '#24151F'], [0.4, '#2A1A26'], [1, '#1A0E17']]); x.fillRect(-20, 1240, 1120, 800);
      x.fillStyle = '#3A2434'; x.fillRect(-20, 1248, 1120, 10); x.fillStyle = 'rgba(255,210,180,0.10)'; x.fillRect(-20, 1248, 1120, 2);
      x.fillStyle = '#170C14'; x.fillRect(-20, 1258, 1120, 790);
      let y = 1260, row = 0;
      const rng = E.rng(4711);
      while (y < 2050) {
        const rh = 6.5 + (y - 1260) * 0.058, gap = Math.max(1.3, rh * 0.14), sc = 1 + (y - 1260) / 640;
        let cx = -30 - rng() * 30 * sc;
        while (cx < 1120) {
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
        y += rh; row++;
      }
    });
  }

  function buildFrame() {
    // vitrine frame: A.archGate + lattice tympanum + rail + lambrequin valance; opening left transparent
    SP.frame = spriteWorld(30, 120, 1020, 1040, 1.3, (x) => {
      // inner reveal (depth of the jambs)
      x.save(); x.clip(OPEN_PATH);
      x.lineJoin = 'round';
      x.strokeStyle = 'rgba(16,6,10,0.55)'; x.lineWidth = 40; x.stroke(OPEN_PATH);
      x.strokeStyle = 'rgba(16,6,10,0.35)'; x.lineWidth = 80; x.stroke(OPEN_PATH);
      // tympanum lattice
      x.save(); x.beginPath(); x.rect(100, 290, 880, 172); x.clip();
      A.lattice(x, { x: 141, y: 296, w: 798, h: 166, cell: 54, lineW: 7.5, stroke: '#6E4A32' });
      x.restore();
      // rail
      x.fillStyle = E.lin(x, 0, 456, 0, 480, [[0, '#8E6444'], [0.4, '#6E4A32'], [1, '#2E1A10']]); x.fillRect(100, 456, 880, 24);
      x.fillStyle = '#C99A4A'; x.fillRect(100, 458, 880, 2.5); x.fillRect(100, 474, 880, 2);
      // lambrequin valance
      for (let cx = 160; cx < 940; cx += 36) {
        const p = new Path2D(); p.moveTo(cx - 18, 480); p.lineTo(cx + 18, 480); p.lineTo(cx + 18, 486); p.bezierCurveTo(cx + 12, 492, cx + 5, 494, cx, 504); p.bezierCurveTo(cx - 5, 494, cx - 12, 492, cx - 18, 486); p.closePath();
        x.fillStyle = E.lin(x, 0, 480, 0, 504, [[0, '#6E4A32'], [1, '#3A2416']]); x.fill(p);
        x.strokeStyle = 'rgba(201,154,74,0.75)'; x.lineWidth = 1.2; x.stroke(p);
        x.fillStyle = '#E8C27A'; x.beginPath(); x.arc(cx, 499, 1.6, 0, TAU); x.fill();
      }
      x.restore();
      E.at(x, AR.x, AR.y, 1, 0, () => A.archGate(x, { w: AR.w, h: AR.h, lattice: false, muqarnas: false }));
      // night grade: plum shadow, deeper toward the street (lanterns re-light the top at runtime)
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = E.lin(x, 0, 120, 0, 1160, [[0, '#2A1430', 0.42], [0.45, '#24102A', 0.5], [1, '#160818', 0.62]]);
      x.fillRect(30, 120, 1020, 1040);
      x.globalCompositeOperation = 'source-over';
    });
    // shelves (behind the jars)
    SP.shelves = spriteWorld(130, 660, 820, 520, 1.3, (x) => {
      x.save(); x.clip(OPEN_PATH);
      for (const ys of [ROWY[0], ROWY[1], ROWY[2]]) {
        const sill = ys === ROWY[2];
        // shadow cast down onto the back glass
        x.fillStyle = E.lin(x, 0, ys + 20, 0, ys + 70, [[0, '#120610', 0.5], [1, '#120610', 0]]); x.fillRect(130, ys + 20, 820, 50);
        // top surface
        x.fillStyle = E.lin(x, 0, ys - 18, 0, ys + 14, [[0, '#9A6E4A'], [0.25, '#7A5236'], [1, '#4E3020']]); x.fillRect(130, ys - 18, 820, 32);
        x.fillStyle = 'rgba(255,226,180,0.55)'; x.fillRect(130, ys - 18, 820, 1.6);
        // front edge + brass strip
        const fh = sill ? 30 : 14;
        x.fillStyle = E.lin(x, 0, ys + 14, 0, ys + 14 + fh, [[0, '#5A3A26'], [1, '#2A160C']]); x.fillRect(130, ys + 14, 820, fh);
        x.fillStyle = BRASS(x, 130, 950); x.fillRect(130, ys + 14, 820, 3.2);
        x.fillStyle = 'rgba(255,240,200,0.5)'; x.fillRect(130, ys + 14, 820, 1);
      }
      x.restore();
    });
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

  /* ---- luminous-silhouette helper: offscreen → source-in recolour → contour + luminance + halo ---- */
  function erodeEdge(maskC, w, h, k) {
    const er = E.canvas(w, h); er.x.drawImage(maskC, 0, 0); er.x.globalCompositeOperation = 'destination-in';
    for (let a = 0; a < 8; a++) er.x.drawImage(maskC, Math.round(Math.cos(a * PI / 4) * k), Math.round(Math.sin(a * PI / 4) * k));
    const ed = E.canvas(w, h); ed.x.drawImage(maskC, 0, 0); ed.x.globalCompositeOperation = 'destination-out'; ed.x.drawImage(er.c, 0, 0);
    return ed.c;
  }
  function tinted(src, w, h, col) { const b = E.canvas(w, h); b.x.drawImage(src, 0, 0); b.x.globalCompositeOperation = 'source-in'; b.x.fillStyle = col; b.x.fillRect(0, 0, w, h); return b.c; }
  /* luminous line drawing of the same art: Sobel edges of luminance·alpha and of alpha → cream lines */
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
  function luminous(artC, w, h, o = {}) {
    const mask = tinted(artC, w, h, '#FFF6E0'), lines = lineArt(artC, w, h);
    const out = E.canvas(w, h), x = out.x;
    x.globalCompositeOperation = 'lighter';
    x.filter = `blur(${o.halo || 30}px)`; x.globalAlpha = 0.2; x.drawImage(tinted(artC, w, h, '#FFD27A'), 0, 0);
    x.filter = 'none'; x.globalAlpha = o.fillA === undefined ? 0.05 : o.fillA; x.drawImage(mask, 0, 0);
    x.filter = 'blur(4px)'; x.globalAlpha = 0.75; x.drawImage(lines, 0, 0);
    x.filter = 'none'; x.globalAlpha = 1; x.drawImage(lines, 0, 0);
    return out.c;
  }

  function measure(it) {
    // 2× render of the sample art (for bbox, ghost outline) and of the original art (polar contour)
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
    // polar contour around the original-art centre (72 rays, local units)
    const cxp = (bb.x0 + bb.x1) / 2, cyp = (bb.y0 + bb.y1) / 2, N = 72, R = [], maxR = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2 + 4;
    for (let k = 0; k < N; k++) {
      const an = (k / N) * TAU; let last = 0;
      for (let r = 0; r < maxR; r += 1) { const px = Math.round(cxp + Math.cos(an) * r), py = Math.round(cyp + Math.sin(an) * r); if (px < 0 || py < 0 || px >= cw || py >= ch) break; if (bb.d[(py * cw + px) * 4 + 3] > 40) last = r; }
      R.push(last / S2);
    }
    it.polar = R;
    it.ghostCl = [(it.sbb.x0 + it.sbb.x1) / 2, (it.sbb.y0 + it.sbb.y1) / 2];
  }

  function buildOriginal(it) {
    const M = (it.M = it.tgt / it.maxDim), bb = it.obb, pad = 90;
    const w = Math.ceil((bb.x1 - bb.x0) * M + pad * 2), h = Math.ceil((bb.y1 - bb.y0) * M + pad * 2);
    const art = E.canvas(w, h); art.x.translate(pad - bb.x0 * M, pad - bb.y0 * M); art.x.scale(M, M);
    (it.oart || it.art)(art.x, 0, true);
    const c = luminous(art.c, w, h, { halo: 30 });
    if (it.key === 'rose') {   // crisp petal contours from the shared 'outline' variant
      const x = c.getContext('2d'); x.save(); x.globalCompositeOperation = 'lighter';
      x.translate(pad - bb.x0 * M, pad - bb.y0 * M); x.scale(M, M);
      roseHead(x, 0, true, 'outline');
      x.restore();
    }
    const soft = E.canvas(w, h); soft.x.filter = 'blur(3.5px)'; soft.x.drawImage(c, 0, 0); soft.x.filter = 'none'; soft.x.globalAlpha = 0.5; soft.x.drawImage(c, 0, 0);
    it.orig = { c, soft: soft.c, w, h };
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

  /* ---------------- per-frame helpers ---------------- */
  function itemWorld(it) { return [it.jx + it.cl[0], it.fy + it.cl[1]]; }
  const REF = { t: 41.6 };
  function setupOriginals() {
    const cam = camAt(REF.t), L1 = lp(cam, PF), L3 = lp(cam, 1);
    for (const it of ITEMS) {
      const s = scr(L3, ...itemWorld(it)); it.O = unscr(L1, s[0], s[1]);
      it.Oscale = L3.z / L1.z;    // keep the on-screen magnification = M at the reference camera
    }
    const c2 = camAt(43.8), L3b = lp(c2, 1);
    for (const f of FILS) f.E = unscr(L3b, f.side < 0 ? -50 : W + 50, f.ey);
  }
  function origBreath(it, t) { return 1 + 0.015 * Math.sin(t * TAU / 3.2 + it.i * 0.9); }
  function origScale(it, t) {
    const grow = E.ease.outQuint(clamp((t - T_ORIG - it.rank * 0.03) / 0.8));
    return it.Oscale * lerp(0.42, 1, grow) * origBreath(it, t);
  }
  function origAlpha(it, t) {
    const a0 = 0.25 * pp(t, T_ORIG + it.rank * 0.03, T_ORIG + 0.75 + it.rank * 0.03, 'outCubic');
    const a1 = 0.15 * pp(t, T_SOLID, T_SOLID1, 'inOutSine');
    const ig = 0.32 * ignite(it, t);
    return a0 + a1 + ig;
  }
  function ignite(it, t) { return pp(t, 45.58 + it.rank * 0.022, 45.95 + it.rank * 0.022, 'outCubic'); }
  /* world point on the original contour at angle a (L1 coords) */
  function origPt(it, t, a, rr) { const s = origScale(it, t) * it.M * (rr === undefined ? it.polarAt(a) : rr); return [it.O[0] + Math.cos(a) * s, it.O[1] + Math.sin(a) * s]; }
  ITEMS.forEach((it) => {
    it.polarAt = (a) => { const N = it.polar.length, f = ((a / TAU) * N + N * 8) % N, i = Math.floor(f), u = f - i; return lerp(it.polar[i], it.polar[(i + 1) % N], u); };
  });
  function crownWorld(it, t) {          // top of the original (where the up-beam lands)
    const s = origScale(it, t) * it.M; return [it.O[0], it.O[1] - Math.max(it.polarAt(-PI / 2), 18) * s * 0.92];
  }

  function gateState(t, cam) {
    const pRef = E.ease.inOutCubic((47.4 - T_TILT0) / (T_TILT1 - T_TILT0));
    const y = 520 + (cam.tilt - pRef) * 1000;
    const s = 0.9 + 0.12 * cam.tilt;
    const pass = E.ease.inCubic(clamp((t - T_PASS) / (T1 - T_PASS)));
    const sp = s * (1 + 6.5 * pass);
    const oc = [540, y + (-GT.h / 2 + 30) * s];               // opening centre (scaling pivot)
    const org = [540, y + (GT.h / 2) * s];                     // archGate origin (bottom centre) before the pass
    return { s: sp, pass, oc, org: [oc[0] + (org[0] - oc[0]) * (sp / s), oc[1] + (org[1] - oc[1]) * (sp / s)], G: [oc[0], oc[1] - 40 * s] };
  }

  /* ---------------- drawing ---------------- */
  function drawSky(ctx, t, cam) {
    const L0 = lp(cam, 0.05);
    inL(ctx, L0, (c) => {
      c.fillStyle = E.lin(c, 0, -300, 0, 2100, [[0, '#1A0F28'], [0.22, '#241634'], [0.55, '#4A2A45'], [1, '#6E3B3B']]);
      c.fillRect(-200, -400, 1480, 2700);
      // stars (only seen during the final tilt)
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 46; i++) {
        const x = E.hash(i, 31) * 1080, y = 40 + E.hash(i, 32) * 1100, tw = 0.35 + 0.65 * E.osc(t, 1.6 + E.hash(i, 33) * 2.4, E.hash(i, 34));
        const r = 0.8 + E.hash(i, 35) * 1.4;
        c.fillStyle = E.rgba('#FFE9D0', 0.5 * tw); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      }
      c.restore();
    });
  }

  function drawFar(ctx, t, cam) {
    const L1 = lp(cam, PF);
    const ign = pp(t, 45.55, 46.1, 'outCubic');
    const blur = lerp(lerp(6, 3.6, pp(t, T_SOLID, T_SOLID1)), 2.2, ign);
    E.layer(ctx, (l) => {
      inL(l, L1, (c) => {
        // luminous haze beyond the back glass
        const hz = 1 + 0.12 * ign;
        c.fillStyle = E.rad(c, 540, 760, 0, 860, [[0, '#F7C49A', 0.46 * hz], [0.3, '#D88A7A', 0.32 * hz], [0.62, '#8A4660', 0.18], [1, '#4A2A45', 0]]);
        c.fillRect(-300, -700, 1680, 2600);
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) {     // slow mist bands
          const mx = 540 + 260 * Math.sin(t * 0.06 + i * 1.7), my = 380 + i * 190 + 18 * Math.sin(t * 0.11 + i);
          c.save(); c.translate(mx, my); c.scale(1, 0.12);
          c.fillStyle = E.rad(c, 0, 0, 0, 560, [[0, '#FFE2C2', 0.07], [1, '#FFE2C2', 0]]); c.fillRect(-560, -560, 1120, 1120);
          c.restore();
        }
        for (let i = 0; i < 5; i++) {     // sourceless shafts falling through the lattice
          const x0 = 300 + i * 120 + 14 * Math.sin(t * 0.3 + i * 2), a = 0.05 + 0.03 * Math.sin(t * 0.7 + i * 1.3);
          c.fillStyle = E.lin(c, 0, 300, 0, 1160, [[0, '#FFE6C0', a * (1 + ign)], [1, '#FFE6C0', 0]]);
          c.beginPath(); c.moveTo(x0 - 22, 300); c.lineTo(x0 + 22, 300); c.lineTo(x0 + 70 - i * 18, 1160); c.lineTo(x0 - 10 - i * 18, 1160); c.closePath(); c.fill();
        }
        S.dust(c, t, { n: 34, seed: 811, x: 120, y: 240, w: 840, h: 980, col: '#FFE3B0', rMin: 0.8, rMax: 2.2, speed: 7, alpha: 0.55 });
      });
    }, { lo: true, blur });
    // originals: soft while they appear, crisp once they "solidify" and ignite
    const crispK = Math.max(0.25 + 0.55 * pp(t, T_SOLID, T_SOLID1), ign);
    inL(ctx, L1, (c) => { for (const it of ITEMS) drawOriginal(c, it, t, crispK); });
  }
  function drawOriginal(c, it, t, crispK) {
    const a = origAlpha(it, t); if (a <= 0.003) return;
    const s = origScale(it, t), o = it.orig;
    c.save(); c.globalCompositeOperation = 'lighter';
    c.translate(it.O[0], it.O[1]); c.scale(s, s);
    if (crispK < 1) { c.globalAlpha = Math.min(1, a * (1 - crispK)); c.drawImage(o.soft, -o.w / 2, -o.h / 2); }
    c.globalAlpha = Math.min(1, a * crispK); c.drawImage(o.c, -o.w / 2, -o.h / 2);
    c.restore();
  }

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
    let drop = 42 * (1 - k * k);                                    // set down from just above (accelerating) …
    const dt = t - (tl + 0.26);
    if (dt > 0) drop = 9 * Math.exp(-8 * dt) * Math.abs(Math.sin(dt * 18));      // … then a soft spring bounce
    const domeA = sm(clamp((t - (tl + 0.04)) / 0.14));
    const fill = E.ease.outCubic(clamp((t - tl) / 0.26));
    // tag: a single swing kicked by the landing
    const sw = dt > 0 ? 0.07 + 0.32 * sm(dt / 0.1) * Math.exp(-1.6 * dt) : 0.07;
    // spec band sweeping L→R across the vitrine
    const u = (it.jx - 140) / 800, gpos = lerp(-0.25, 1.25, clamp((t - T_SPEC) / 0.5));
    const spec = (gpos - u) * 2.4 + 0.5;
    return { drop, domeA, fill, swing: sw, spec: spec > 0.01 && spec < 0.99 ? spec : undefined, landed: t > tl + 0.3 };
  }

  function drawJar(ctx, it, t, st, glow) {
    E.at(ctx, it.jx, it.jy, 1, 0, () => {
      const tagT = t + it.i * 0.73;
      const content = sampleContent(it, t, st.fill);
      const inner = (c) => {
        content(c);
        if (glow > 0.01) {   // gaze glow inside the dome
          c.save(); c.globalCompositeOperation = 'lighter';
          S.light(c, it.cl[0], it.cl[1], 92, '#FFE3A3', 0.42 * glow);
          c.restore();
        }
      };
      if (st.domeA >= 0.999 && st.drop < 0.3) {
        A.bellJar(ctx, { w: JW, h: JH, t: tagT, swing: st.swing, spec: st.spec, content: inner });
        return;
      }
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
      a += 0.6 * E.env(t, it.tLand - 0.04, it.tLand + 0.2, 0.06, 0.14) * (1 - fillK);   // flash as it fills in
      if (a <= 0.003) continue;
      const g = it.ghost;
      ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.translate(x, y); ctx.scale(s / 2, s / 2);
      ctx.drawImage(g.c, -g.cx, -g.cy); ctx.restore();
    }
    ctx.restore();
  }

  function drawProjection(ctx, t, L1, L3) {
    if (t < T_LINES || t > 45.3) return;
    const solid = pp(t, T_SOLID, T_SOLID1, 'inOutSine');
    let alpha = lerp(0.36, 0.48, solid) * (1 - 0.6 * pp(t, 43.05, 43.6, 'inOutSine')) * (1 - pp(t, 44.6, 45.25, 'inOutSine'));
    if (alpha <= 0.003) return;
    const gap = lerp(8, 0, solid);
    ctx.save();
    ctx.clip(OPEN_PATH_SCR(L3));
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const NR = 8;
    for (const it of ITEMS) {
      const C = itemWorld(it);
      for (let k = 0; k < NR; k++) {
        const an = ((k + 0.5) / NR) * TAU + it.i * 0.21, rs = it.polarAt(an);
        if (rs < 5) continue;
        const dr = E.ease.outCubic(clamp((t - T_LINES - it.rank * 0.035 - k * 0.009) / 0.38));
        if (dr <= 0) continue;
        const a = scr(L3, C[0] + Math.cos(an) * rs, C[1] + Math.sin(an) * rs), b = scr(L1, ...origPt(it, t, an, rs));
        const ex = lerp(a[0], b[0], dr), ey = lerp(a[1], b[1], dr);
        ctx.strokeStyle = E.rgba('#FFE3A3', alpha * 0.22); ctx.lineWidth = 3.5; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = E.rgba('#FFE3A3', alpha); ctx.lineWidth = 1.15;
        if (gap > 0.4) { ctx.setLineDash([4, gap]); ctx.lineDashOffset = -t * 26; } else ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(ex, ey); ctx.stroke();
        if (dr > 0.96) { ctx.setLineDash([]); ctx.fillStyle = E.rgba('#FFF6E0', alpha * 1.2); ctx.beginPath(); ctx.arc(b[0], b[1], 1.8, 0, TAU); ctx.fill(); }
      }
    }
    ctx.setLineDash([]);
    ctx.restore();
  }
  function OPEN_PATH_SCR(L3) { const p = new Path2D(); const m = new DOMMatrix(); m.translateSelf(540, 960); if (L3.r) m.rotateSelf(L3.r * 180 / PI); m.scaleSelf(L3.z, L3.z); m.translateSelf(-L3.cx, -L3.cy); p.addPath(OPEN_PATH, m); return p; }

  function filPts(f, t, L3) {
    const it = f.it, C = itemWorld(it), Cs = scr(L3, C[0], C[1]), z = L3.z;
    const Es = scr(L3, f.E[0], f.E[1]);
    const Hs = [Cs[0] + f.side * JRW * 0.9 * z, Cs[1] + 6 * z];
    const wv = 7 * Math.sin(t * 1.6 + f.k * 1.3);
    const m1 = [lerp(Es[0], Hs[0], 0.34), Math.min(1182, lerp(Es[1], Hs[1], 0.34) + 24 + wv)];
    const m2 = [lerp(Es[0], Hs[0], 0.7), Math.min(1182, lerp(Es[1], Hs[1], 0.7) + 10 - wv * 0.5)];
    return { pts: [Es, m1, m2, Hs], Hs, Xs: [Cs[0] - f.side * JRW * 0.9 * z, Cs[1] + 6 * z], Cs, z };
  }

  function drawGazes(ctx, t, L1, L3) {
    if (t < T_FIL) return;
    const focus = pp(t, T_FOCUS, T_FOCUS + 0.35, 'inOutSine');
    const fade = 1 - pp(t, 46.5, 47.3, 'inOutSine');
    if (fade <= 0) return;
    const turnRaw = clamp((t - T_TURN) / 0.6), turn = turnRaw <= 0 ? 0 : E.ease.spring(turnRaw), kc = clamp(turn);
    for (const f of FILS) {
      const st = T_FIL + 0.05 * f.k, dr = E.ease.outCubic(clamp((t - st) / 0.42));
      if (dr <= 0) continue;
      const G = filPts(f, t, L3);
      // incoming gaze
      const inA = lerp(0.72, 1, focus) * fade * (1 - 0.55 * pp(t, 45.4, 45.95, 'inOutSine'));
      A.filament(ctx, G.pts, { t: t + f.k * 0.3, draw: dr, w: lerp(2.5, 1.5, focus), halo: lerp(9, 7, focus), col: '#FFE3A3', flow: 70, alpha: inA, head: dr < 1 });
      if (t > f.ta && t < f.ta + 0.6) A.sparks(ctx, t, { x: G.Hs[0], y: G.Hs[1], t0: f.ta, n: 10, seed: 50 + f.k, col: '#FFE3A3', speed: 170, life: 0.5, gravity: 140, size: 1.5 });
      if (t > f.ta - 0.05 && t < f.ta + 0.35) S.sparkle(ctx, G.Hs[0], G.Hs[1], 13 * E.env(t, f.ta - 0.05, f.ta + 0.35, 0.05, 0.3), 1, '#FFF6E0', t * 2);
      // prism: through the glass, then a 4-hair spectrum
      const thr = pp(t, T_PRISM + f.k * 0.006, T_PRISM + 0.12 + f.k * 0.006, 'outCubic');
      if (thr <= 0) continue;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.strokeStyle = E.rgba('#FFFFFF', 0.75 * fade * (1 - 0.6 * kc)); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(G.Hs[0], G.Hs[1]); ctx.lineTo(lerp(G.Hs[0], G.Xs[0], thr), lerp(G.Hs[1], G.Xs[1], thr)); ctx.stroke();
      ctx.restore();
      const fan = pp(t, T_PRISM + 0.1, T_PRISM + 0.45, 'outCubic');
      if (fan <= 0) continue;
      const th0 = f.side < 0 ? 0 : PI, dth = f.side < 0 ? -PI / 2 : PI / 2;
      const crown = scr(L1, ...origPt(f.it, t, -PI / 2 - f.side * 0.62)), X = G.Xs;   // lands on the original's shoulder
      const Lf = 132 * G.z * fan;
      const L2 = Math.hypot(crown[0] - X[0], crown[1] - X[1]);
      const Lc = lerp(Lf, L2, kc);
      const hairA = (1 - sm(clamp((turnRaw - 0.45) / 0.4))) * fade;
      for (let h = 0; h < 4; h++) {
        if (hairA <= 0.003) break;
        const th = th0 + HAIR_D[h] * (1 - kc) + dth * turn;
        const P1 = [X[0] + Math.cos(th0 + dth * turn) * Lc * 0.4, X[1] + Math.sin(th0 + dth * turn) * Lc * 0.4];
        let P2 = [X[0] + Math.cos(th) * Lc, X[1] + Math.sin(th) * Lc];
        P2 = [lerp(P2[0], crown[0], kc * kc), lerp(P2[1], crown[1], kc * kc)];
        hair(ctx, X, P1, P2, E.mix(HAIR[h], '#FFD27A', kc), 0.95 * hairA, t + h * 0.21);
      }
      // recombined gold beam: exit point → original's crown
      if (kc > 0.3) {
        const P1 = [X[0], X[1] - L2 * 0.4];
        const goldA = sm((turnRaw - 0.3) / 0.45) * fade;
        A.filament(ctx, [X, P1, crown], { t, w: 2, halo: 10, col: '#FFD27A', flow: 90, draw: clamp(kc * 1.05), alpha: goldA, head: kc < 0.98 });
      }
    }
  }

  function drawRise(ctx, t, cam, L1) {
    // from each original's crown up to the convergence point high above
    if (t < 45.9) return;
    const gs = gateState(t, cam), G = gs.G;
    const fade = 1 - pp(t, 47.45, 47.75);
    for (const it of ITEMS) {
      const dr = E.ease.inOutSine(clamp((t - 45.92 - it.rank * 0.035) / 0.95));
      if (dr <= 0) continue;
      const c = scr(L1, ...crownWorld(it, t));
      const m1 = [c[0], c[1] - 150], m2 = [lerp(c[0], G[0], 0.55), lerp(c[1], G[1], 0.62)];
      A.filament(ctx, [c, m1, m2, G], { t, w: 2.1, halo: 11, col: '#FFD27A', flow: 120, draw: dr, alpha: 0.95 * fade, head: dr < 1 });
      if (t > 45.62 && t < 46.3) S.light(ctx, c[0], c[1], 90, '#FFE7B0', 0.5 * E.env(t, 45.62 + it.rank * 0.022, 46.3, 0.08, 0.4));
    }
  }

  function gateHalves() {        // symmetric half-outlines (top centre → base) for the draw-on, gate-local coords
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
  function drawGate(ctx, t, cam) {
    const gs = gateState(t, cam), G = gs.G, s = gs.s;
    const conv = pp(t, 46.5, 46.95, 'inOutSine');
    const trace = pp(t, T_GATE, T_GATE + 0.4, 'inOutSine'), body = pp(t, T_GATE + 0.18, T_GATE + 0.6, 'outCubic');
    if (conv > 0) {   // warm sky glow + convergence flare
      S.light(ctx, G[0], G[1], 1000, '#FFC890', 0.2 * conv + 0.1 * body);
      S.light(ctx, G[0], G[1], 150, '#FFF6E0', 0.6 * conv * (1 - 0.7 * body));
    }
    if (trace <= 0) return;
    if (!GATE_H) GATE_H = gateHalves();
    const g = SP.gate;
    ctx.save(); ctx.translate(gs.org[0], gs.org[1]); ctx.scale(s, s);
    ctx.globalCompositeOperation = 'lighter';
    if (body > 0) {
      ctx.globalAlpha = body;
      ctx.fillStyle = E.lin(ctx, 0, -GT.h, 0, 0, [[0, '#FFFFFF', 0.5], [0.45, '#FFF0D0', 0.26], [1, '#FFD9A0', 0.1]]); ctx.fill(SP.gateOpen);
      ctx.globalAlpha = 0.45 * body; ctx.drawImage(g.glow, -g.ox, -g.oy, g.w, g.h);
      ctx.globalAlpha = body; ctx.drawImage(g.c, -g.ox, -g.oy, g.w, g.h);
    }
    // luminous contour drawn on from the apex down both sides
    ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const hp of GATE_H) {
      ctx.setLineDash([hp.len * trace, hp.len + 10]);
      ctx.strokeStyle = E.rgba('#FFE7B0', 0.16); ctx.lineWidth = 16 / s; ctx.stroke(hp.p);
      ctx.strokeStyle = E.rgba('#FFF6E0', 0.9); ctx.lineWidth = 3 / s; ctx.stroke(hp.p);
    }
    ctx.setLineDash([]);
    // pass-through: the opening becomes white light
    if (gs.pass > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, Math.pow(gs.pass, 0.6)); ctx.fillStyle = '#FFFDF7'; ctx.fill(SP.gateOpen); }
    ctx.restore();
    // flash
    const fl = E.ease.inQuad(pp(t, 47.38, T1, 'linear'));
    if (fl > 0) { ctx.save(); ctx.fillStyle = E.rgba('#FFFDF7', 0.95 * fl); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }

  function drawLanterns(ctx, t, cam) {
    const L4 = lp(cam, PL);
    inL(ctx, L4, (c) => {
      LANTS.forEach((ln, k) => {
        const b = pp(t, T_LANT[k], T_LANT[k] + 0.32, 'outCubic');
        const lit = b * (1 - 0.45 * (1 - b) * (0.5 + 0.5 * Math.sin(t * 57 + k * 2)));
        E.at(c, ln.x, ln.y, 1, 0, () => A.hangingLantern(c, { size: ln.size, lit, t, phase: ln.ph, swing: 3, hz: 0.6 }));
      });
    });
  }
  function lanternLight(ctx, t, cam) {
    const L4 = lp(cam, PL);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    LANTS.forEach((ln, k) => {
      const lit = pp(t, T_LANT[k], T_LANT[k] + 0.32, 'outCubic');
      if (lit <= 0) return;
      const p = scr(L4, ln.x, ln.y + ln.size * 1.05);
      ctx.fillStyle = E.rad(ctx, p[0], p[1], 0, 520, [[0, '#FFB458', 0.2 * lit], [0.4, '#FF9A4A', 0.08 * lit], [1, '#FF9A4A', 0]]);
      ctx.fillRect(p[0] - 520, p[1] - 520, 1040, 1040);
    });
    ctx.restore();
  }

  function drawLatticeFG(ctx, t) {
    if (t > 38.05) return;
    const k = clamp((t - T0) / (38.05 - T0));
    const s = lerp(1.7, 2.4, clamp((t - T0) / 0.2)) * (1 + 1.25 * E.ease.inCubic(clamp((t - 37.8) / 0.25)));
    const a = 1 - pp(t, 37.86, 38.04, 'inQuad');
    if (a <= 0.003) return;
    E.layer(ctx, (l) => {
      l.save(); l.translate(540, 780); l.scale(s, s); l.rotate(0.02 * (1 - k));
      A.lattice(l, { w: 1500, h: 2100, cell: 74, lineW: 12, stroke: '#24140C' });
      l.globalCompositeOperation = 'destination-out'; l.fillStyle = '#000';
      l.fill(S.starPath(330, 8, 0.8, PI / 8));
      l.restore();
      // warm rim from the lit vitrine behind
      l.globalCompositeOperation = 'source-atop';
      l.fillStyle = E.rad(l, 540, 800, 300 * s, 700 * s, [[0, '#E0905A', 0.16], [1, '#E0905A', 0]]); l.fillRect(0, 0, W, H);
      l.fillStyle = 'rgba(20,8,14,0.35)'; l.fillRect(0, 0, W, H);
    }, { lo: true, blur: lerp(3, 16, E.ease.inCubic(k)), alpha: a });
  }

  function drawStreetLight(ctx, t, L3) {
    // window light spilling onto the wet cobbles + soft vertical reflections (kept mid-toned for the gloss band)
    const g = E.glossActive(t) ? 0.8 : 1, lit = pp(t, 39.0, 39.8);
    inL(ctx, L3, (c) => {
      c.save(); c.globalCompositeOperation = 'lighter';
      const p = new Path2D(); p.moveTo(150, 1252); p.lineTo(930, 1252); p.lineTo(1240, 2050); p.lineTo(-160, 2050); p.closePath();
      c.fillStyle = E.lin(c, 0, 1252, 0, 1900, [[0, '#FFB070', 0.12 * g], [0.45, '#FF9A5A', 0.045 * g], [1, '#FF9A5A', 0]]); c.fill(p);
      const refl = (x, w, a0, col) => {
        const sh = 0.85 + 0.15 * Math.sin(t * 2.1 + x * 0.05);
        c.save(); c.translate(x, 1262); c.scale(w / 100, 1);
        c.fillStyle = E.lin(c, 0, 0, 0, 560, [[0, col, a0 * sh], [0.5, col, a0 * 0.4 * sh], [1, col, 0]]);
        c.beginPath(); c.moveTo(-100, 0); c.lineTo(100, 0); c.lineTo(60, 560); c.lineTo(-60, 560); c.closePath();
        c.fill(); c.restore();
      };
      for (const x of COLX) refl(x, 62, 0.07 * g, '#FFD9B0');
      for (const ln of LANTS) refl(ln.x, 26, 0.09 * g * lit, '#FFB050');
      c.restore();
    });
  }
  /* wet cobbles: blurred mirror of the lit shop front in two puddles (foot band only, never in the gloss band) */
  let PUD = null;
  function drawPuddles(ctx, t, L3) {
    const yl = scr(L3, 540, 1252)[1];
    if (yl > H - 40) return;
    if (!PUD) PUD = E.canvas(W / 2, H / 2);
    const m = PUD.x; m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, W / 2, H / 2); m.setTransform(0.5, 0, 0, 0.5, 0, 0);
    inL(m, L3, (c) => {
      for (const [x, y, rx, ry, a] of [[300, 1640, 300, 58, 1], [800, 1700, 270, 52, 0.9], [560, 1590, 150, 22, 0.6]]) {
        c.save(); c.translate(x + 6 * Math.sin(t * 0.4 + x), y); c.scale(1, ry / rx);
        c.fillStyle = E.rad(c, 0, 0, rx * 0.3, rx, [[0, '#000', a], [1, '#000', 0]]); c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill();
        c.restore();
      }
    });
    E.layer(ctx, (l) => {
      l.save(); l.translate(0, 2 * yl); l.scale(1, -1); l.drawImage(ctx.canvas, 0, 0, W, H); l.restore();
      l.save(); l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'destination-in'; l.drawImage(PUD.c, 0, 0); l.restore();
    }, { lo: true, blur: 3, alpha: 0.42 });
  }

  /* dev profiler (only when window.__HPROF is set) */
  let PRt = 0;
  function PR(ctx, name) {
    if (!window.__HPROF) return;
    ctx.getImageData(0, 0, 1, 1);
    const n = performance.now(); if (name) window.__HPROF[name] = (window.__HPROF[name] || 0) + n - PRt; PRt = n;
  }

  /* ---------------- scene ---------------- */
  E.scene({
    id: 'H_numune', t0: T0, t1: T1,
    async setup() {
      buildFacade(); buildFrame(); buildGate();
      for (const it of ITEMS) { measure(it); buildOriginal(it); }
      setupOriginals();
    },
    post: (t) => {
      const ign = pp(t, 45.5, 46.0, 'outCubic'), fl = pp(t, 47.1, T1, 'inQuad');
      return { bloom: 0.42 + 0.06 * pp(t, T_SOLID, T_SOLID1) + 0.2 * ign + 0.35 * fl, vignette: lerp(0.32, 0.14, pp(t, 46.3, 47.6)), grain: 0.05 };
    },
    draw(ctx, t) {
      t = clamp(t, T0, T1);
      const cam = camAt(t), L1 = lp(cam, PF), L3 = lp(cam, 1);
      PR(ctx, null); drawSky(ctx, t, cam); PR(ctx, 'sky');
      drawFar(ctx, t, cam); PR(ctx, 'far');
      // facade, street, shelves
      inL(ctx, L3, (c) => { drawSpr(c, SP.street); drawSpr(c, SP.facade); });
      drawStreetLight(ctx, t, L3); PR(ctx, 'facade');
      inL(ctx, L3, (c) => {
        drawSpr(c, SP.shelves);
        for (const it of ITEMS) drawJar(c, it, t, jarState(it, t), jarGlow(it, t));
      });
      PR(ctx, 'jars'); drawGhosts(ctx, t, L3);
      inL(ctx, L3, (c) => drawSpr(c, SP.frame));
      {   // focus: deepen the outer facade so the lit vitrine carries the eye
        const fc = scr(L3, 540, 760);
        ctx.save(); ctx.translate(fc[0], fc[1]); ctx.scale(1, 1.35);
        ctx.fillStyle = E.rad(ctx, 0, 0, 380 * L3.z, 980 * L3.z, [[0, '#0C0410', 0], [1, '#0C0410', 0.5]]); ctx.fillRect(-1400, -1400, 2800, 2800);
        ctx.restore();
      }
      lanternLight(ctx, t, cam); PR(ctx, 'frame');
      drawPuddles(ctx, t, L3); PR(ctx, 'puddle');
      // sample pulse on "suretleri"
      const pulse = E.env(t, 40.74, 41.5, 0.12, 0.5);
      if (pulse > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const it of ITEMS) { const p = scr(L3, ...itemWorld(it)); S.light(ctx, p[0], p[1], 80 * L3.z, '#FFE3A3', 0.35 * pulse); } ctx.restore(); }
      drawProjection(ctx, t, L1, L3); PR(ctx, 'proj');
      drawGazes(ctx, t, L1, L3); PR(ctx, 'gaze');
      drawRise(ctx, t, cam, L1);
      PR(ctx, 'rise'); drawLanterns(ctx, t, cam); PR(ctx, 'lantern');
      // drifting motes in the lantern light
      inL(ctx, lp(cam, 1.2), (c) => S.dust(c, t, { n: 26, seed: 377, x: 60, y: 100, w: 960, h: 1080, col: '#FFD9A0', rMin: 0.9, rMax: 2.4, speed: 9, alpha: 0.35 * pp(t, 39.0, 39.8) }));
      PR(ctx, 'dust'); drawGate(ctx, t, cam); PR(ctx, 'gate');
      drawLatticeFG(ctx, t); PR(ctx, 'lattice');
      // band guard scrim + grade
      if (E.glossActive(t)) {
        ctx.save(); ctx.translate(540, 1400); ctx.scale(1, 220 / 640);
        ctx.fillStyle = E.rad(ctx, 0, 0, 0, 640, [[0, '#080612', 0.2], [1, '#080612', 0]]); ctx.fillRect(-640, -640, 1280, 1280);
        ctx.restore();
      }
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.1; ctx.fillStyle = '#FF9A4A'; ctx.fillRect(0, 0, W, H); ctx.restore();
    },
  });
})();
