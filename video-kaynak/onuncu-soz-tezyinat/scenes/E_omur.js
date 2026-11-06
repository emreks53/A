/* =====================================================================================
 * E_omur · 16.10–22.50 · "Çünkü ya onun ömrü kısa, ya senin ömrün kısadır. Doymaya kâfi değil."
 * -------------------------------------------------------------------------------------
 * PLAN (1080×1920 · no gloss in E · darkest frame of the film at ≈21.8)
 *  Layers, back → front
 *   L0  teal wall #0E2433→#17485A→#2D6E74 + soft backlight behind the hourglass; faint dashed
 *       "time rings" turning slowly around it (no numerals)
 *   L1  far bokeh (cyan / sand-gold), parallax 0.3
 *   L2  glossy dark teal floor (horizon ≈ y1040 = D's surface line), horizon sheen
 *   L3  HERO: hourglass (A.hourglass) with mini rose + butterfly in the top bulb;
 *       kandil (A.kandil) on a small turned stand = "you"; later the bowl (A.iznikBowl)
 *   L4  floating sand motes ('lighter'), kandil light flood + long teal-violet shadows
 *   L5  blurred foreground motes / dark blobs, parallax 1.5
 *  Camera (world→screen, E.drift breathing always on):
 *   16.30 neck (540,1000), zoom 1 → 16.50–17.45 push in on the top bulb (zoom 1.45) so the
 *   miniature life reads on a phone → 18.66–19.62 pan right + zoom out (1.02): hourglass on the
 *   left third (320,1000), kandil (≈815,880) → 19.62–21.60 slow push-in (1.08) → 21.98–22.50 tilt
 *   up after the rising ember.
 *  Beats
 *   15.90–16.45 MORPH (also drawn for D through DE.drawE): glass outline draws around the bowl +
 *     reflection, the reflection turns solid, silhouette lerps (128 pts) to the hourglass,
 *     palette plum→teal, hanging motes pour in as sand, four glide to the neck = first grains
 *   16.56 "Çünkü" sand flows · 17.06 "ya onun" mini rose (R 31) sprouts, butterfly arrives ·
 *   17.92 "ömrü kısa" sand rush (flow 2), rose blooms & withers in 0.5 s, butterfly dissolves into
 *     particles that fall through the neck · 18.88 "senin" kandil lights (outBack), warm flood,
 *     long shadows · 19.32–20.0 oil drops, flame shrinks 30%, top bulb empties at 19.97 ·
 *   20.62 "Doymaya" hourglass un-morphs to the bowl (reflection detaches) and slides to centre ·
 *   21.02 "kâfi" gauge ring climbs the inner wall and stops at ≈10% · 21.47 "değil" last grain lands,
 *     everything stops, flame gutters to an ember, exposure −40% · 21.79 near-black: faint rim,
 *     one ember, grain · 21.95–22.50 ember rises on a wobble, sharpens into a hexagonal ruby
 *     (22.34–22.46), violet glow, F palette at 60% → handoff (540,760) r34.
 * ===================================================================================== */
(function () {
  'use strict';
  const W = 1080, H = 1920, TAU = Math.PI * 2, PI = Math.PI;
  const cl = E.clamp, lerp = E.lerp, ease = E.ease;
  const pp = (t, a, b, e) => E.p(t, a, b, e);
  const DE = (window.DE = window.DE || {});
  const PAL = { top: '#0E2433', mid: '#17485A', bot: '#2D6E74', rim: '#7FE0D2', glass: '#CFF3FF', sand: '#F2C46B', sandHi: '#FFE29A', flame: '#FFB34D', night: '#05101A' };
  const FPAL = ['#160F38', '#34206B', '#5E2C86'];
  const NECK = [540, 1000];                    // hourglass neck (world)
  const KAN = { x: 990, y: 1183.5, size: 420 }; // kandil foot (world) — "you", a co-hero beside the hourglass
  const KS = 1.8;                               // stand scale (stand art is authored small)
  const STAND_B = 1353.5;                       // stand base on the floor (world)
  const HZ = 920.6;                             // floor/wall line (world) — lands exactly on D's ledge line at the morph
  const BOWL_S = 300 / 330;                     // final bowl scale (asset units → world): rx ≈ 330 px on screen
  const BOWL_FOOT = [590, 1400];                // final bowl foot (world): left of the kandil, never crossing its stand
  const EMBER_RISE = [548, 915];                // screen: the ember hangs here at 22.12, then rises to F's (540,760) at 22.47
  const WICK = [KAN.x, KAN.y - 170 * (KAN.size / 200)];
  let SPR = null;

  /* ------------------------------------------------------------------ camera */
  function camE(t) {
    let x = 540, y = 966.67, z = 1.2;                                       // 16.30: neck (540,1000), bowl-sized glass
    const a = pp(t, 16.3, 17.25, 'inOutCubic'); y = lerp(y, 880, a); z = lerp(z, 2.0, a);           // big, centred: mini-life reads
    const b = pp(t, 18.05, 18.9, 'inOutSine'); x = lerp(x, 749.6, b); y = lerp(y, 978, b); z = lerp(z, 1.145, b);   // unlit kandil in frame by 18.80
    const c = pp(t, 19.7, 21.4, 'inOutSine'); x = lerp(x, 726.5, c); y = lerp(y, 972, c); z = lerp(z, 1.1, c);     // bowl + kandil side by side
    const d = pp(t, 21.98, 22.5, 'inOutSine'); y = lerp(y, 850, d);
    const dr = E.drift(t, 4, 0.3, 11);
    return { x, y, z, ox: dr.x, oy: dr.y };
  }
  const toS = (cam, wx, wy) => [540 + cam.ox + (wx - cam.x) * cam.z, 960 + cam.oy + (wy - cam.y) * cam.z];
  const camAt = (ctx, cam, wx, wy, s, fn) => { const p = toS(cam, wx, wy); E.at(ctx, p[0], p[1], s * cam.z, 0, fn); };

  /* ------------------------------------------------------------------ hourglass state */
  const SKEYS = [[16.56, 0.32], [17.92, 0.26], [18.42, 0.13], [19.9, 0.0]];
  const linS = (tt) => { if (tt <= SKEYS[0][0]) return SKEYS[0][1]; for (let i = 0; i < SKEYS.length - 1; i++) { const [a, va] = SKEYS[i], [b, vb] = SKEYS[i + 1]; if (tt <= b) return va + (vb - va) * (tt - a) / (b - a); } return 0; };
  function sandTop(t) { let s = 0; for (let k = -5; k <= 5; k++) s += linS(t + k * 0.012); return Math.max(0, s / 11); }
  function flowAt(t) {
    let f = pp(t, 16.5, 16.75, 'outCubic');
    f += pp(t, 17.86, 17.98, 'outCubic') * (1 - pp(t, 18.42, 18.75, 'inOutSine'));
    return f * (1 - pp(t, 19.93, 20.06, 'linear'));
  }
  function hgState(t) {
    const r = pp(t, 16.3, 17.0, 'inOutCubic');
    const h = lerp(520, 600, r), w = lerp(640, 420, r), sT = sandTop(t);
    return { h, w, sT, sB: 0.04 + (0.32 - sT) * 2.3, flow: flowAt(t) };
  }
  /** geometry mirror of A.hourglass internals (for placing things inside the bulbs) */
  function hgGeo(st) {
    const h = st.h, w = st.w, neck = w * 0.06, capH = h * 0.05, H2 = h / 2 - capH, nr = neck / 2, Wr = w / 2;
    const sm = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
    const X = (y) => { const u = cl(1 - Math.abs(y) / H2); const g = Math.pow(Math.max(0, 1 - Math.pow(u, 2.3)), 0.62); const sh = 0.84 + 0.16 * sm(u / 0.17); return nr + (Wr - nr) * g * sh; };
    const yL = lerp(-nr * 2, -H2 + capH * 0.3, Math.pow(Math.max(0, st.sT), 0.72));
    const baseH = st.sB * H2 * 0.4, coneH = st.sB * H2 * 0.36 + 3, yPk = H2 - baseH - coneH;
    return { h, w, nr, H2, capH, X, yL, yPk, capR: w * 0.54 };
  }
  // un-morph / slide (20.62–21.15)
  const unK = (t) => A.morphEase(pp(t, 20.62, 21.04, 'linear'), 0.05);
  function objPos(t) { const e = pp(t, 20.62, 21.04, 'inOutCubic'); return [lerp(NECK[0], BOWL_FOOT[0], e), lerp(NECK[1], BOWL_FOOT[1], e)]; }
  /** circular moving-average smoothing: removes the cap/glass notches from a silhouette (outline use only) */
  function smoothSil(P, it = 3) { let Q = P; for (let k = 0; k < it; k++) { const n = Q.length; Q = Q.map((p, i) => { const a = Q[(i + n - 2) % n], b = Q[(i + n - 1) % n], c2 = Q[(i + 1) % n], d = Q[(i + 2) % n]; return [(a[0] + b[0] + p[0] + c2[0] + d[0]) / 5, (a[1] + b[1] + p[1] + c2[1] + d[1]) / 5]; }); } return Q; }
  /** A.hourglass with the glass tucked behind the brass posts (the asset's bulb otherwise bulges past them) */
  function hgDraw(ctx, o) {
    const w = o.w, h = o.h, capR = w * 0.54, ry = capR * 0.2, capH = h * 0.05;
    ctx.save(); ctx.beginPath();
    ctx.rect(-capR - 6, -h / 2 - ry - 6, 2 * capR + 12, capH + 2 * ry + 12);
    ctx.rect(-capR - 6, h / 2 - capH - ry - 6, 2 * capR + 12, capH + 2 * ry + 14);
    ctx.rect(-w * 0.452, -h / 2, w * 0.904, h); // posts sit at ±0.421w (r 0.024w)
    ctx.clip(); A.hourglass(ctx, o); ctx.restore();
  }

  /* ------------------------------------------------------------------ silhouettes */
  const silC = new Map();
  function hgSil(h, w) { const k = Math.round(h) + '|' + Math.round(w); let s = silC.get(k); if (!s) { if (silC.size > 120) silC.clear(); s = smoothSil(A.hourglassSilhouette({ h: Math.round(h), w: Math.round(w) })); silC.set(k, s); } return s; }
  function bowlSilD(c) { // D's bowl (+mirror) at camera state c, in NECK-relative screen px (foot at 0)
    const o = { rx: 330, ry: 110 + 90 * c.crane, depth: 220, tilt: c.tilt, widen: c.widen };
    const k = [o.ry, o.tilt, o.widen].map((v) => v.toFixed(3)).join('|');
    let s = silC.get('b' + k); if (!s) { s = smoothSil(A.bowlSilhouette(o), 2); silC.set('b' + k, s); }
    const depth = 220 * (1 + 0.3 * c.widen);
    return s.map(([x, y]) => [x * c.z, (y - depth) * c.z]);
  }
  let BOWL_E = null;
  const bowlSilE = () => BOWL_E || (BOWL_E = smoothSil(A.bowlSilhouette({}), 2).map(([x, y]) => [x * BOWL_S, (y - 220) * BOWL_S]));
  function polyLen(P) { const c = [0]; for (let i = 1; i <= P.length; i++) { const a = P[i - 1], b = P[i % P.length]; c.push(c[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); } return c; }
  /** symmetric draw-on of a closed shape from its top-most point (index 0) both ways */
  function strokeDrawOn(ctx, P, k) {
    if (k >= 0.999) { A.strokeShape(ctx, P); return; }
    const n = P.length, m = Math.max(2, Math.round((n / 2) * k));
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i <= m; i++) ctx.lineTo(P[i % n][0], P[i % n][1]);
    ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i <= m; i++) ctx.lineTo(P[(n - i) % n][0], P[(n - i) % n][1]);
    ctx.stroke();
  }
  function glassLine(ctx, P, k, a, wd = 2.6) {
    if (a <= 0.01) return;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = E.rgba(PAL.glass, 0.16 * a); ctx.lineWidth = wd * 6; strokeDrawOn(ctx, P, k);
    ctx.strokeStyle = E.rgba(PAL.glass, 0.35 * a); ctx.lineWidth = wd * 2.4; strokeDrawOn(ctx, P, k);
    ctx.strokeStyle = E.rgba('#FFFFFF', 0.9 * a); ctx.lineWidth = wd; strokeDrawOn(ctx, P, k);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ sprites */
  function glowSpr(r, col, core) { const c = E.canvas(r * 2, r * 2), x = c.x; x.fillStyle = E.rad(x, r, r, 0, r, [[0, core || col, 1], [0.2, col, 0.8], [0.5, col, 0.25], [1, col, 0]]); x.fillRect(0, 0, r * 2, r * 2); return c.c; }
  function bokehSpr(r, col) { const c = E.canvas(r * 2 + 16, r * 2 + 16), x = c.x, m = r + 8; x.filter = 'blur(5px)'; x.fillStyle = E.rad(x, m, m, 0, r, [[0, col, 0.2], [0.7, col, 0.17], [0.92, col, 0.12], [1, col, 0]]); x.beginPath(); x.arc(m, m, r, 0, TAU); x.fill(); return c.c; }
  const FGP = 260; // fg sprite padding (no clipped blur edges when it slides)
  function fgSpr() {
    const c = E.canvas(W + FGP * 2, 820), x = c.x;
    x.translate(FGP, 0); x.filter = 'blur(8px)';
    for (const [bx, by, br, ba, col] of [[250, 560, 30, 0.2, '#F2C46B'], [930, 430, 40, 0.13, '#7FE0D2'], [120, 380, 20, 0.16, '#F2C46B'], [780, 640, 24, 0.15, '#F2C46B']]) {
      x.fillStyle = E.rad(x, bx, by, 0, br, [[0, col, ba * 0.5], [0.85, col, ba], [1, col, 0]]); x.beginPath(); x.arc(bx, by, br, 0, TAU); x.fill();
    }
    return c.c;
  }

  /* ------------------------------------------------------------------ environment */
  const BOK = [];
  for (let i = 0; i < 9; i++) BOK.push({ x: E.hash(i, 401) * 1080, y: 120 + E.hash(i, 402) * 900, s: 0.5 + 0.8 * E.hash(i, 403), gold: E.hash(i, 404) > 0.7, ph: E.hash(i, 405) * TAU });
  function drawEnv(ctx, t, cam, o) {
    const hz = toS(cam, 0, HZ)[1], hp = o.hp;
    ctx.fillStyle = E.lin(ctx, 0, hz - 1150 * cam.z, 0, hz, [[0, PAL.top], [0.58, PAL.mid], [1, PAL.bot]]);
    ctx.fillRect(0, 0, W, H);
    // soft backlight behind the hourglass / bowl (glass reads against it)
    const bl = toS(cam, hp[0], hp[1] - 80);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = E.rad(ctx, bl[0], bl[1], 0, 760 * cam.z, [[0, '#4FA6A2', 0.42], [0.45, '#2D6E74', 0.18], [1, '#2D6E74', 0]]);
    ctx.fillRect(0, 0, W, H); ctx.restore();
    // far bokeh (parallax 0.3)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < BOK.length; i++) {
      const b = BOK[i], px = b.x - (cam.x - 540) * 0.3 + E.noise(t * 0.15, i + 40) * 20, py = b.y - (cam.y - 960) * 0.3 + E.noise(t * 0.13, i + 60) * 16;
      S.drawSprite(ctx, b.gold ? SPR.bokG : SPR.bokC, px, py, b.s * (1 + (cam.z - 1) * 0.3), 0, 0.55 + 0.3 * Math.sin(t * 0.9 + b.ph));
    }
    ctx.restore();
    // glossy floor below the horizon: glazed çini tiles in true perspective under a deep teal glaze
    ctx.fillStyle = E.lin(ctx, 0, hz, 0, H, [[0, '#215B64'], [0.06, '#163F49'], [0.5, '#0B2730'], [1, '#05141A']]);
    ctx.fillRect(0, hz, W, H - hz);
    const wx0 = cam.x - (540 + 40) / cam.z, wx1 = cam.x + (540 + 40) / cam.z, wyB = cam.y + (960 + 20) / cam.z;
    E.layer(ctx, (l) => {
      l.setTransform(cam.z, 0, 0, cam.z, 540 + cam.ox - cam.x * cam.z, 960 + cam.oy - cam.y * cam.z);
      l.beginPath(); l.rect(wx0, HZ, wx1 - wx0, wyB - HZ); l.clip();
      DE.tileFloor(l, { cx: 700, hzT: 600, F: 1400, hc: 746, y0: HZ, y1: wyB, T: 150, xo: 75, zo: 0, x0: wx0, x1: wx1, band: 5 / cam.z,
        blur: (y) => cl((y - 1400) / 260, 0, 2) });
    }, { alpha: 0.17 });
    ctx.fillStyle = E.lin(ctx, 0, hz, 0, H, [[0, '#123A44', 0.45], [0.35, '#0B2730', 0.2], [1, '#04121A', 0.5]]); ctx.fillRect(0, hz, W, H - hz);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = E.lin(ctx, 0, hz - 3, 0, hz + 5, [[0, PAL.rim, 0], [0.5, PAL.rim, 0.14], [1, PAL.rim, 0]]); ctx.fillRect(0, hz - 3, W, 8);
    ctx.translate(bl[0], hz + 30 * cam.z); ctx.scale(1, 0.12);
    ctx.fillStyle = E.rad(ctx, 0, 0, 0, 620 * cam.z, [[0, '#4FA6A2', 0.22], [1, '#4FA6A2', 0]]); ctx.fillRect(-700 * cam.z, -700 * cam.z, 1400 * cam.z, 1400 * cam.z);
    ctx.restore();
    return hz;
  }
  /** floating sand motes (time frozen after "değil") */
  function drawDust(ctx, t, cam, a) {
    if (a <= 0.01) return;
    const tf = t < 21.47 ? t : 21.47 + (t - 21.47) * 0.04;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const par = 0.6 + 0.9 * E.hash(i, 501);
      const bx = ((E.hash(i, 502) * 1300 + E.noise(tf * 0.12 + i, 503) * 60 + tf * (E.hash(i, 504) - 0.5) * 16 - (cam.x - 540) * par) % 1300 + 1300) % 1300 - 110;
      const by = ((E.hash(i, 505) * 2100 - tf * (6 + 10 * E.hash(i, 506)) - (cam.y - 960) * par) % 2100 + 2100) % 2100 - 90;
      const tw = 0.45 + 0.55 * E.osc(tf, 1.4 + 2 * E.hash(i, 507), E.hash(i, 508));
      S.drawSprite(ctx, SPR.mote, bx, by, (0.18 + 0.32 * E.hash(i, 509)) * (0.8 + 0.4 * par), 0, a * tw * (0.35 + 0.4 * E.hash(i, 510)));
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ kandil + stand */
  function standPath(x, y0, y1) {
    const p = new Path2D(), n = 40, pts = [];
    const prof = (u) => { const y = lerp(y0, y1, u); let r = 10 + 3 * u; r += 30 * Math.exp(-Math.pow(u / 0.05, 2)); r += 13 * Math.exp(-Math.pow((u - 0.2) / 0.045, 2)); r += 17 * Math.exp(-Math.pow((u - 0.5) / 0.07, 2)); r += 10 * Math.exp(-Math.pow((u - 0.74) / 0.04, 2)); r += 44 * Math.exp(-Math.pow((u - 1) / 0.09, 2)); return [r, y]; };
    for (let i = 0; i <= n; i++) { const [r, y] = prof(i / n); pts.push([x + r, y]); }
    for (let i = n; i >= 0; i--) { const [r, y] = prof(i / n); pts.push([x - r, y]); }
    p.moveTo(pts[0][0], pts[0][1]); for (const q of pts) p.lineTo(q[0], q[1]); p.closePath();
    return p;
  }
  let STAND = null;
  function drawStand(ctx, warm) {
    const hgt = (STAND_B - KAN.y) / KS;
    if (!STAND) STAND = standPath(0, 0, hgt);
    ctx.fillStyle = E.lin(ctx, -54, 0, 54, 0, [[0, '#0A1A1E'], [0.28, '#3A2A22'], [0.56, '#7A5634'], [0.8, '#2E1E16'], [1, '#0A0E10']]); ctx.fill(STAND);
    ctx.save(); ctx.clip(STAND);
    ctx.fillStyle = E.lin(ctx, -54, 0, -18, 0, [[0, PAL.rim, 0.4], [1, PAL.rim, 0]]); ctx.fillRect(-54, 0, 40, hgt);
    ctx.strokeStyle = 'rgba(255,214,150,0.18)'; ctx.lineWidth = 1.2; // turned grooves
    for (const u of [0.12, 0.2, 0.28, 0.43, 0.57, 0.74, 0.9]) { ctx.beginPath(); ctx.ellipse(0, u * hgt, 50, 3, 0, 0, PI); ctx.stroke(); }
    if (warm > 0.01) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = E.lin(ctx, 0, 0, 0, hgt * 0.7, [[0, PAL.flame, 0.5 * warm], [1, PAL.flame, 0]]); ctx.fillRect(-54, 0, 108, hgt); }
    ctx.restore();
    // top dish
    ctx.fillStyle = E.lin(ctx, -50, 0, 50, 0, [[0, '#2A1A10'], [0.6, '#A87A3E'], [1, '#2A1A10']]);
    ctx.beginPath(); ctx.ellipse(0, 3, 50, 10, 0, 0, TAU); ctx.fill();
  }
  function kandilOpts(t) {
    const lit = cl(pp(t, 18.9, 18.98, 'linear'));
    const pop = ease.outBack(pp(t, 18.9, 19.22, 'linear'), 2.2);
    const shrink = lerp(1, 0.7, pp(t, 19.3, 20.05, 'inOutSine'));
    const gut = 1 - 0.72 * pp(t, 21.25, 21.47, 'inQuad');
    const jit = 1 + (0.05 + 0.14 * pp(t, 19.3, 20.0) + 0.22 * pp(t, 21.1, 21.45)) * (0.7 * E.noise(t * 4.2, 31) + 0.3 * E.noise(t * 6, 32));
    return {
      t, size: KAN.size, lit, flameBase: Math.max(0, pop * shrink * gut), flame: Math.max(0, pop * shrink * gut * jit), oil: lerp(0.9, 0.12, pp(t, 19.25, 20.1, 'inOutSine')),
      ember: pp(t, 21.42, 21.64, 'inOutSine') * (1 - pp(t, 21.9, 22.05)), lightR: 380,
    };
  }

  /** last few % of the top sand: the asset drops its lens at sandTop 0.004 while it is still wide; drain it smoothly */
  function drawTopLens(ctx, G, st) {
    const s0 = 0.03, yA = lerp(-G.nr * 2, -G.H2 + G.capH * 0.3, Math.pow(s0, 0.72)), k = cl(st.sT / s0);
    const yL = lerp(-G.nr * 0.6, yA, Math.pow(k, 0.8)); if (yL > -1) return;
    const pts = [], n = 14, wf = lerp(0.08, 1, Math.pow(k, 0.6)); // the last sand pulls in to a point at the neck
    for (let i = 0; i <= n; i++) { const y = lerp(yL, 2, i / n); pts.push([Math.max(G.nr * 0.5, G.X(y) * wf) + 1, y]); }
    for (let i = n; i >= 0; i--) { const y = lerp(yL, 2, i / n); pts.push([-Math.max(G.nr * 0.5, G.X(y) * wf) - 1, y]); }
    const xr = Math.max(G.nr * 0.5, G.X(yL) * wf);
    ctx.save(); ctx.globalAlpha *= 0.92 * cl(k * 4);
    ctx.fillStyle = E.lin(ctx, -xr, 0, xr, 0, [[0, '#FFDF8E'], [0.47, '#F5C25E'], [0.53, '#DDA042'], [1, '#A86E28']]);
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
    ctx.fillStyle = E.lin(ctx, -xr, 0, xr, 0, [[0, '#FFEDB0'], [0.5, '#F9D683'], [1, '#E2AE55']]);
    ctx.beginPath(); ctx.ellipse(0, yL, xr, Math.max(0.5, xr * 0.2), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(176,122,52,0.55)'; ctx.beginPath(); ctx.ellipse(0, yL + xr * 0.02, xr * 0.4, Math.max(0.4, xr * 0.12), 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ------------------------------------------------------------------ mini life (top bulb) */
  function drawMiniLife(ctx, t, G) {
    if (t < 17.0 || t > 18.75) return;
    const yL = G.yL;
    // rose
    const grow = ease.outBack(pp(t, 17.04, 17.46, 'linear'), 1.6);
    const sink = pp(t, 18.15, 18.6, 'inCubic');
    if (grow > 0.01 && sink < 0.99) {
      const bloom = pp(t, 17.74, 17.98, 'outCubic'), wilt = pp(t, 17.98, 18.26, 'inOutSine');
      const bx = lerp(-G.X(yL) * 0.16, 0, sink), by = lerp(yL + 1, -G.nr * 0.5, ease.inQuad(sink));
      const L = 48 * grow * (1 - 0.25 * wilt), lean = 0.12 * Math.sin(t * 2.1) + 0.5 * wilt - 0.08;
      const tip = [bx + Math.sin(lean) * L, by - Math.cos(lean) * L];
      ctx.save(); ctx.globalAlpha *= 1 - sink; ctx.translate(bx, by); ctx.scale(1 - 0.6 * sink, 1 - 0.6 * sink); ctx.translate(-bx, -by);
      ctx.strokeStyle = E.mix('#3E9A62', '#7A7440', wilt); ctx.lineWidth = 3.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + Math.sin(lean) * L * 0.2, by - L * 0.6, tip[0], tip[1]); ctx.stroke();
      ctx.fillStyle = E.mix('#4CAF6E', '#7A7440', wilt);
      for (const [u, sd] of [[0.45, -1], [0.62, 1]]) {
        if (grow < u) continue;
        const lx = lerp(bx, tip[0], u), ly = lerp(by, tip[1], u);
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(sd * (0.9 + 0.5 * wilt) + lean); ctx.beginPath(); ctx.ellipse(sd * 10, 0, 11 * grow, 4.4 * grow, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      E.at(ctx, tip[0], tip[1], Math.min(1, grow), lean, (c) => A.heroRose(c, { R: 54, variant: 'mini', bloom: lerp(0.12, 1, bloom), wilt, t, tilt: 0.7 }));
      ctx.restore();
      // falling petals while withering
      if (wilt > 0.3) for (let i = 0; i < 4; i++) {
        const u = cl((t - 18.08 - i * 0.06) / 0.4); if (u <= 0 || u >= 1) continue;
        const px = tip[0] + (i - 1.5) * 10 + Math.sin(u * 7 + i) * 5, py = lerp(tip[1], yL + 2, ease.inQuad(u));
        ctx.fillStyle = E.rgba(E.mix('#FF6F91', '#8C4A63', u), 1 - u * 0.6);
        ctx.beginPath(); ctx.ellipse(px, py, 6, 3.4, u * 5 + i, 0, TAU); ctx.fill();
      }
    }
    // butterfly
    const bIn = pp(t, 17.25, 17.55, 'outCubic'), bOut = pp(t, 17.92, 18.04, 'linear');
    if (bIn > 0.01 && bOut < 1) {
      const hw = Math.max(20, G.X(yL - 56) - 22);
      const x = lerp(-hw - 30, 0, bIn) + Math.sin(t * 1.9) * hw * 0.55, y = yL - 58 - 9 * Math.sin(t * 3.1) - 30 * (1 - bIn);
      ctx.save(); ctx.globalAlpha *= bIn * (1 - bOut);
      E.at(ctx, x, y, 1, 0.25 * Math.sin(t * 1.9 + 1.2), (c) => A.butterfly(c, { size: 34, t, pattern: 'sapphire', hz: 6.5, sheen: 1 }));
      S.light(ctx, x, y, 46, '#7FB4FF', 0.22);
      ctx.restore();
    }
    // butterfly → particles falling through the neck with the sand
    if (t > 17.92) { // wing dust: swirls into the funnel and streams down through the neck with the sand
      const x0 = Math.sin(17.94 * 1.9) * Math.max(20, G.X(yL - 56) - 22) * 0.55, y0 = yL - 58 - 9 * Math.sin(17.94 * 3.1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 22; i++) {
        const u = (t - 17.94 - i * 0.016) / 0.7; if (u <= 0 || u >= 1) continue;
        const sx = x0 + (E.hash(i, 601) - 0.5) * 40, sy = y0 + (E.hash(i, 602) - 0.5) * 20;
        let px, py, al = 1;
        if (u < 0.42) { const e = ease.inOutSine(u / 0.42), sw = Math.sin(u * 12 + i) * 14 * (1 - e); px = lerp(sx, 0, e) + sw; py = lerp(sy, yL + 1, e); }
        else if (u < 0.58) { const e = (u - 0.42) / 0.16; px = (E.hash(i, 603) - 0.5) * 4 * (1 - e); py = lerp(yL + 1, -G.nr, e); al = 0.75; }
        else { const e = ease.inQuad((u - 0.58) / 0.42); px = (E.hash(i, 603) - 0.5) * 3; py = lerp(-G.nr, G.yPk, e); al = 1 - e * 0.4; }
        S.drawSprite(ctx, SPR.blue, px, py, 0.3 + 0.16 * E.hash(i, 604), 0, al * (0.8 + 0.2 * Math.sin(t * 9 + i)));
      }
      ctx.restore();
    }
  }

  /* ------------------------------------------------------------------ bowl (end of E) */
  function bowlEOpts(t) { return { t, dim: 1, lit: 0, reflection: true, rimCol: PAL.rim, shadow: true }; }
  const Q10 = 0.316; // normalised floor radius of a 10 % fill (depth 1−q² = 0.9)
  function drawBowlE(ctx, t, cam, pos, alpha) {
    const rimW = [pos[0], pos[1] - 220 * BOWL_S], s = BOWL_S * cam.z, rp = toS(cam, rimW[0], rimW[1]);
    const veil = 0.42 + 0.3 * pp(t, 20.9, 21.6);
    E.layer(ctx, (l) => {
      E.at(l, rp[0], rp[1], s, 0, (c) => {
        A.iznikBowl(c, bowlEOpts(t));
        // the thin layer of sand (≈10 %)
        const SQ = Q10 * 0.9, sA = pp(t, 20.75, 21.05), irx = 320.76, iry = 106.9, yo = 55, cy = yo * (1 - SQ * SQ);
        if (sA > 0.01) {
          c.save(); c.globalAlpha *= sA;
          c.fillStyle = E.lin(c, -SQ * irx, 0, SQ * irx, 0, [[0, '#B88438'], [0.4, PAL.sand], [0.7, PAL.sandHi], [1, '#C8913E']]);
          c.beginPath(); c.ellipse(0, cy, SQ * irx, SQ * iry, 0, 0, TAU); c.fill();
          c.fillStyle = 'rgba(120,70,20,0.35)';
          for (let i = 0; i < 22; i++) { const a = E.hash(i, 701) * TAU, q = Math.sqrt(E.hash(i, 702)) * 0.9; c.beginPath(); c.arc(Math.cos(a) * q * SQ * irx, cy + Math.sin(a) * q * SQ * iry, 1.6, 0, TAU); c.fill(); }
          c.restore();
        }
      });
      l.globalCompositeOperation = 'source-atop'; l.fillStyle = `rgba(5,22,30,${veil.toFixed(3)})`; l.fillRect(0, 0, W, H);
    }, { alpha });
    // gauge ring climbing the inner wall, stopping at ≈10 % ("kâfi")
    const gk = pp(t, 20.98, 21.16, 'linear');
    if (gk > 0 && t < 21.9) {
      const q = Q10 * ease.outBack(gk, 2.4) + 0.02, yo = 55 * s, irx = 320.76 * s, iry = 106.9 * s;
      const ga = (0.6 + 0.4 * E.env(t, 21.12, 21.42, 0.03, 0.25)) * (1 - pp(t, 21.42, 21.85)) * alpha;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.ellipse(rp[0], rp[1] + yo * (1 - q * q), q * irx, Math.max(0.5, q * iry), 0, 0, TAU);
      ctx.strokeStyle = E.rgba(PAL.glass, 0.16 * ga); ctx.lineWidth = 12 * cam.z; ctx.stroke();
      ctx.strokeStyle = E.rgba(PAL.glass, 0.4 * ga); ctx.lineWidth = 4.5 * cam.z; ctx.stroke();
      ctx.strokeStyle = E.rgba('#FFFFFF', 0.85 * ga); ctx.lineWidth = 1.6 * cam.z; ctx.stroke();
      // faint "full" mark at the rim: everything above the ring stays empty
      const fa = E.env(t, 21.06, 21.7, 0.1, 0.35) * 0.7 * alpha;
      ctx.setLineDash([4 * cam.z, 10 * cam.z]); ctx.strokeStyle = E.rgba(PAL.glass, fa); ctx.lineWidth = 2.2 * cam.z;
      ctx.beginPath(); ctx.ellipse(rp[0], rp[1], irx * 0.985, iry * 0.985, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    return { rp, s };
  }

  /* ------------------------------------------------------------------ gem / ember */
  function drawEmberGem(ctx, x, y, r, k, t, a = 1) {
    ctx.save(); ctx.globalAlpha *= a;
    const glowCol = E.mix('#FF7A3D', '#FF3D6E', k);
    S.light(ctx, x, y, r * (10 - 5 * k) + 50, glowCol, 0.55 - 0.3 * k);
    const pts = k <= 0 ? null : A.lerpShape(A.circlePts(r, 128), A.polyPts(r, 6, 128), A.morphEase(k, 0.08));
    ctx.translate(x, y);
    if (!pts) {
      ctx.fillStyle = E.rad(ctx, 0, 0, 0, r * 1.4, [[0, '#FFF0C0'], [0.35, '#FFB060'], [0.7, '#FF7A3D'], [1, '#B0301A']]);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = E.rad(ctx, -r * 0.2, -r * 0.25, 0, r * 1.3, [[0, E.mix('#FFF0C0', '#FF8AA8', k)], [0.4, E.mix('#FFB060', '#FF3D6E', k)], [1, E.mix('#B0301A', '#B0103E', k)]]);
      A.fillShape(ctx, pts, false);
      if (k > 0.25) { // facets: table + 6 trapezoids, shaded toward an upper-left light
        const fk = cl((k - 0.25) / 0.6);
        ctx.save(); ctx.globalAlpha *= fk;
        const outer = [], inner = [];
        for (let i = 0; i < 6; i++) { const an = -PI / 2 + (i / 6) * TAU; outer.push([Math.cos(an) * r, Math.sin(an) * r]); inner.push([Math.cos(an) * r * 0.52, Math.sin(an) * r * 0.52 - r * 0.04]); }
        const L = -2.3;
        for (let i = 0; i < 6; i++) {
          const j = (i + 1) % 6, mid = -PI / 2 + ((i + 0.5) / 6) * TAU, sh = 0.5 + 0.5 * Math.cos(mid - L);
          ctx.fillStyle = sh > 0.6 ? E.mix('#FF3D6E', '#FF8AA8', (sh - 0.6) / 0.4) : E.mix('#B0103E', '#FF3D6E', sh / 0.6);
          ctx.beginPath(); ctx.moveTo(outer[i][0], outer[i][1]); ctx.lineTo(outer[j][0], outer[j][1]); ctx.lineTo(inner[j][0], inner[j][1]); ctx.lineTo(inner[i][0], inner[i][1]); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = E.rad(ctx, -r * 0.15, -r * 0.2, 0, r * 0.6, [[0, '#FFC2D2'], [1, '#FF4F7B']]);
        ctx.beginPath(); inner.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,214,226,0.55)'; ctx.lineWidth = Math.max(0.8, r * 0.04);
        ctx.beginPath(); for (let i = 0; i < 6; i++) { ctx.moveTo(outer[i][0], outer[i][1]); ctx.lineTo(inner[i][0], inner[i][1]); } ctx.stroke();
        ctx.beginPath(); inner.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = E.rad(ctx, 0, 0, 0, r * 0.9, [[0, '#FFF0D8', 0.55 * (1 - k * 0.8)], [1, '#FFF0D8', 0]]); ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, TAU); ctx.fill();
    ctx.restore();
    if (k > 0.5) S.sparkle(ctx, x - r * 0.4, y - r * 0.48, r * 0.42 * (0.75 + 0.25 * Math.sin(t * 9)), 0.85 * cl((k - 0.5) * 2), '#FFFFFF', 0.2);
  }

  /* ------------------------------------------------------------------ morph helpers */
  /** the 4 leftover glints slide along the glass to the neck and fall as the first grains */
  function neckGlints(ctx, t, g, hp, cam) {
    if (t < 15.98 || t > 16.75) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const s = DE.moteState(i, 15.98); if (!s) continue;
      const p0 = g.map(s.px, s.py, s.h);
      const u = cl((t - 15.98 - i * 0.05) / 0.42), e = ease.inOutSine(u);
      const side = p0[0] < hp[0] ? -1 : 1;
      const mid = [hp[0] + side * 150 * cam.z, hp[1] - 150 * cam.z];
      let x, y;
      if (u < 1) { const a1 = 1 - e; x = a1 * a1 * p0[0] + 2 * a1 * e * mid[0] + e * e * hp[0]; y = a1 * a1 * p0[1] + 2 * a1 * e * mid[1] + e * e * hp[1]; }
      else { const v = cl((t - 15.98 - i * 0.05 - 0.42) / 0.3); if (v >= 1) continue; x = hp[0]; y = hp[1] + ease.inQuad(v) * 250 * cam.z; }
      S.drawSprite(ctx, DE.SPR_D.mote, x, y, 0.42, 0, 0.9);
    }
    ctx.restore();
  }
  function gradeE(ctx, t, mult = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = E.rgba('#1E5A66', 0.12 * mult); ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  /* ------------------------------------------------------------------ main frame (15.90 → 22.50)
   * One function for everything from the start of the D→E morph, so D (which calls it from 15.90)
   * and E produce identical frames across the 16.10–16.30 overlap. */
  function drawE(ctx, t) {
    const morph = t < 16.5;
    const cam = camE(t), st = hgState(t), G = hgGeo(st);
    const m = pp(t, 16.0, 16.36, 'inOutSine');               // palette plum → teal
    const c = morph ? DE.camD(t) : null, g = morph ? DE.bowlGeo(c) : null;
    const uk = unK(t), pos = objPos(t), litK = pp(t, 18.9, 19.05);
    const ko = kandilOpts(t);
    const flameK = ko.lit * (1 - ko.ember) * cl(ko.flameBase, 0, 1.3) * (1 + 0.02 * E.noise(t * 3, 33)); // room light: steady (±2 %)
    const kanA = pp(t, 18.05, 18.5, 'inOutSine');
    // ---------- environment (D's plum stage dissolving into the teal room) ----------
    if (m < 0.999) DE.drawStageD(ctx, t, g);
    const envO = { hp: pos };
    if (m >= 0.999) drawEnv(ctx, t, cam, envO); else if (m > 0.001) E.layer(ctx, (l) => drawEnv(l, t, cam, envO), { alpha: m });
    const hzS = toS(cam, 0, HZ)[1];
    const hs = toS(cam, pos[0], pos[1]);
    // warm pool of kandil light on the glossy floor (the long shadow cuts through it)
    if (flameK > 0.02) {
      const kb = toS(cam, KAN.x - 200, STAND_B + 30);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(kb[0], kb[1]); ctx.scale(1, 0.26);
      ctx.fillStyle = E.rad(ctx, 0, 0, 0, 1000 * cam.z, [[0, '#FFB34D', 0.55 * flameK], [0.4, '#FF9A3A', 0.22 * flameK], [1, '#FF9A3A', 0]]);
      ctx.fillRect(-1000 * cam.z, -1000 * cam.z, 2000 * cam.z, 2000 * cam.z); ctx.restore();
    }
    // long teal-violet shadow thrown by the kandil across the floor
    if (flameK > 0.02 && uk < 0.98) {
      const sil = hgSil(st.h, st.w), wk = flameK * (1 - uk);
      E.layer(ctx, (l) => {
        l.fillStyle = '#0B1030';
        const base = toS(cam, pos[0], pos[1] + st.h / 2 + 20);
        l.save(); l.translate(base[0], base[1]); l.transform(1, 0, 0.8, -0.42, 0, 0);
        E.at(l, 0, -st.h / 2 * cam.z, cam.z, 0, (cc) => A.fillShape(cc, sil, false));
        l.restore();
      }, { lo: true, blur: 22, alpha: 0.62 * wk });
    }
    // contact shadows on the floor
    if (m > 0.01) {
      ctx.save(); ctx.globalAlpha *= m;
      const cs = toS(cam, pos[0], pos[1] + lerp(st.h / 2 + 8, 0, uk));
      ctx.fillStyle = E.rad(ctx, cs[0], cs[1], 0, 300 * cam.z, [[0, '#020A0E', 0.55], [1, '#020A0E', 0]]);
      ctx.translate(cs[0], cs[1]); ctx.scale(1, 0.14); ctx.beginPath(); ctx.arc(0, 0, 300 * cam.z, 0, TAU); ctx.fill(); ctx.restore();
      const ks = toS(cam, KAN.x, STAND_B);
      ctx.save(); ctx.globalAlpha *= m * kanA; ctx.fillStyle = E.rad(ctx, ks[0], ks[1], 0, 150 * cam.z, [[0, '#020A0E', 0.6], [1, '#020A0E', 0]]);
      ctx.translate(ks[0], ks[1]); ctx.scale(1, 0.18); ctx.beginPath(); ctx.arc(0, 0, 150 * cam.z, 0, TAU); ctx.fill(); ctx.restore();
    }
    // ---------- kandil on its stand (dark & unlit until "senin"; emerges as the camera pans) ----------
    if (m * kanA > 0.01) {
      const kVeil = lerp(0.84, 0.6, pp(t, 18.6, 19.0)) * (1 - litK) + 0.25 * pp(t, 21.4, 21.8);
      E.layer(ctx, (l) => {
        const kb = toS(cam, KAN.x, STAND_B)[1];
        l.save(); l.globalAlpha = 0.16; l.translate(0, 2 * kb); l.scale(1, -1); // mirror in the glazed floor
        camAt(l, cam, KAN.x, KAN.y, KS, (cc) => drawStand(cc, flameK));
        camAt(l, cam, KAN.x, KAN.y, 1, (cc) => A.kandil(cc, Object.assign({}, ko, { light: false })));
        l.restore();
        camAt(l, cam, KAN.x, KAN.y, KS, (cc) => drawStand(cc, flameK));
        camAt(l, cam, KAN.x, KAN.y, 1, (cc) => A.kandil(cc, Object.assign({}, ko, { light: false })));
        if (kVeil > 0.005) { l.globalCompositeOperation = 'source-atop'; l.fillStyle = `rgba(4,18,26,${kVeil.toFixed(3)})`; l.fillRect(0, 0, W, H); }
      }, { alpha: m * kanA });
    }
    // ---------- hourglass ----------
    const hgO = { t, h: st.h, w: st.w, sandTop: st.sT, sandBottom: st.sB, flow: st.flow };
    if (morph) {
      const k = A.morphEase(pp(t, 16.08, 16.3, 'linear'), 0.07);
      const hp = toS(cam, NECK[0], NECK[1]);
      const P = A.lerpShape(bowlSilD(c), hgSil(st.h, st.w).map(([x, y]) => [x * cam.z, y * cam.z]), k).map(([x, y]) => [x + hp[0], y + hp[1]]);
      const path = A.shapePath(P, false);
      // porcelain bowl (+ its reflection turning solid), squeezed by the glass outline
      const bA = 1 - pp(t, 16.12, 16.34, 'inOutSine');
      if (bA > 0.003) {
        const rs = 0.7 * pp(t, 15.98, 16.16, 'inOutSine');
        E.layer(ctx, (l) => {
          l.save(); if (k > 0.001) l.clip(path);
          DE.drawBowlD(l, t, g, { honey: 46 * pp(t, 15.95, 16.22, 'outCubic'), veil: 0 });
          if (rs > 0.003) { // solid mirror image of the bowl below the surface line
            l.save(); l.globalAlpha = rs; l.translate(0, 2 * g.footY); l.scale(1, -1);
            E.at(l, g.x, g.rimY, g.z, 0, (cc) => A.iznikBowl(cc, Object.assign(DE.bowlOptsD(t, c), { reflection: false, shadow: false, honey: 0 })));
            l.restore();
            l.globalCompositeOperation = 'source-atop'; l.fillStyle = E.rgba('#9FD8EA', 0.22 * rs); l.fillRect(0, g.footY, W, H - g.footY);
          }
          l.restore();
        }, { alpha: bA });
      }
      // the hourglass materialises (with its faint floor reflection)
      const hA = ease.inQuad(pp(t, 16.1, 16.32, 'linear'));
      if (hA > 0.003) {
        const fy = toS(cam, 0, NECK[1] + st.h / 2 + 0.2 * st.w * 0.54)[1];
        ctx.save(); ctx.globalAlpha *= 0.13 * hA; ctx.translate(0, 2 * fy); ctx.scale(1, -1);
        E.at(ctx, hs[0], hs[1], cam.z, 0, (cc) => hgDraw(cc, Object.assign({}, hgO, { flow: 0 }))); ctx.restore();
        ctx.save(); ctx.globalAlpha *= hA;
        E.at(ctx, hp[0], hp[1], cam.z, 0, (cc) => hgDraw(cc, hgO));
        ctx.restore();
      }
      // glass body + glowing outline
      const gf = E.env(t, 15.95, 16.5, 0.15, 0.2);
      ctx.save(); ctx.fillStyle = E.rgba(PAL.glass, 0.1 * gf); ctx.fill(path); ctx.restore();
      const drawK = pp(t, 15.86, 16.12, 'inOutSine'), la = Math.min(1, drawK * 3) * (1 - pp(t, 16.3, 16.5, 'inOutSine'));
      glassLine(ctx, P, drawK, la, 2.4);
      const sw = pp(t, 16.12, 16.42, 'inOutSine');
      if (sw > 0 && sw < 1) { // shimmer sweep while the glass forms
        ctx.save(); ctx.clip(path); ctx.globalCompositeOperation = 'lighter';
        const sx = lerp(hp[0] - 520, hp[0] + 520, sw), gr = ctx.createLinearGradient(sx - 120, 0, sx + 120, 300);
        gr.addColorStop(0, 'rgba(207,243,255,0)'); gr.addColorStop(0.5, `rgba(235,252,255,${(0.45 * Math.sin(PI * sw)).toFixed(3)})`); gr.addColorStop(1, 'rgba(207,243,255,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      // hanging motes pour into the bowl (they become the top sand); four glide to the neck
      DE.drawMotes(ctx, t, g, { gather: pp(t, 15.72, 16.2, 'inCubic'), alpha: 1, skip: (i) => i < 4 && t > 15.98 });
      neckGlints(ctx, t, g, hp, cam);
    } else if (uk < 0.999) {
      const Ph = hgSil(st.h, st.w);
      const P = uk > 0.001 ? A.lerpShape(Ph, bowlSilE(), uk) : Ph;
      const Ps = P.map(([x, y]) => [hs[0] + x * cam.z, hs[1] + y * cam.z]);
      const path = A.shapePath(Ps, false);
      const hA = 1 - pp(t, 20.62, 20.86, 'inOutSine');
      const rfl = 0.13 * (1 - pp(t, 20.6, 20.78, 'inOutSine'));
      if (rfl > 0.003) { // faint reflection of the hourglass in the glossy floor (fades as it un-morphs)
        const fy = toS(cam, 0, pos[1] + st.h / 2 + 0.2 * st.w * 0.54)[1];
        ctx.save(); ctx.globalAlpha *= rfl; ctx.translate(0, 2 * fy); ctx.scale(1, -1);
        E.at(ctx, hs[0], hs[1], cam.z, 0, (cc) => hgDraw(cc, Object.assign({}, hgO, { flow: 0 }))); ctx.restore();
      }
      if (t < 16.75) neckGlints(ctx, t, DE.bowlGeo(DE.camD(t)), toS(cam, NECK[0], NECK[1]), cam);
      ctx.save(); ctx.globalAlpha *= hA; // (not clipped: the wooden frame dissolves around the morphing glass)
      E.at(ctx, hs[0], hs[1], cam.z, 0, (cc) => { hgDraw(cc, Object.assign({}, hgO, { sandTop: st.sT >= 0.03 ? st.sT : 0 })); if (st.sT > 0 && st.sT < 0.03) drawTopLens(cc, G, st); drawMiniLife(cc, t, G); });
      ctx.restore();
      if (flameK > 0.02 && hA > 0.02) { // warm kandil light on the glass (right edge)
        ctx.save(); ctx.clip(path); ctx.globalCompositeOperation = 'lighter';
        const xr = hs[0] + G.capR * cam.z;
        ctx.fillStyle = E.lin(ctx, xr - 170 * cam.z, 0, xr, 0, [[0, PAL.flame, 0], [1, PAL.flame, 0.28 * flameK * hA]]); ctx.fillRect(xr - 200 * cam.z, 0, 220 * cam.z, H);
        ctx.restore();
      }
      if (uk > 0.001) drawBowlE(ctx, t, cam, pos, E.smooth((uk - 0.42) / 0.55)); // the bowl firms up once the frame has gone
    } else {
      drawBowlE(ctx, t, cam, pos, 1);
    }
    // glass outline of the un-morph: upper half fades 21.05–21.35; the mirrored lower half dissolves earlier
    const la = E.env(t, 20.6, 21.35, 0.08, 0.3);
    if (!morph && la > 0.01) {
      const P = A.lerpShape(hgSil(st.h, st.w), bowlSilE(), uk).map(([x, y]) => [hs[0] + x * cam.z, hs[1] + y * cam.z]);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hs[1]); ctx.clip(); glassLine(ctx, P, 1, la, 2.2); ctx.restore();
      const lb = la * (1 - pp(t, 20.82, 21.06, 'inOutSine'));
      if (lb > 0.01) { ctx.save(); ctx.beginPath(); ctx.rect(0, hs[1], W, H - hs[1]); ctx.clip(); glassLine(ctx, P, 1, lb, 2.2); ctx.restore(); }
    }
    // ---------- the last grain ("değil") ----------
    if (t > 21.2 && t < 21.75) {
      const rimW = [pos[0], pos[1] - 220 * BOWL_S], land = toS(cam, rimW[0], rimW[1] + 55 * (1 - Q10 * Q10) * BOWL_S);
      const u = cl((t - 21.22) / 0.25);
      if (u < 1) {
        const y = lerp(land[1] - 330 * cam.z, land[1], u * u);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = E.lin(ctx, 0, y - 40 * u, 0, y, [[0, PAL.sandHi, 0], [1, PAL.sandHi, 0.8]]); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(land[0], y - 40 * u); ctx.lineTo(land[0], y); ctx.stroke();
        S.drawSprite(ctx, SPR.mote, land[0], y, 0.3, 0, 1); ctx.restore();
      } else {
        A.sparks(ctx, t, { x: land[0], y: land[1], t0: 21.47, n: 7, seed: 5, col: PAL.sandHi, speed: 120, life: 0.28, gravity: 600, dir: -PI / 2, spread: 2.4, size: 1.4 });
        S.drawSprite(ctx, SPR.mote, land[0], land[1], 0.3, 0, 1 - pp(t, 21.47, 21.7));
      }
    }
    // ---------- light: kandil flood ----------
    const wick = toS(cam, WICK[0], WICK[1]);
    if (flameK > 0.01) {
      const fl = flameK;
      S.light(ctx, wick[0], wick[1] - 30, 640 * cam.z * lerp(0.4, 1, ease.outCubic(cl(ko.lit * ko.flameBase))), '#FFB34D', 0.42 * fl);
      S.light(ctx, wick[0], wick[1] - 40 * cam.z, 130 * cam.z, '#FFC870', 0.3 * ko.lit * (1 - ko.ember) * cl(ko.flame, 0, 1.3)); // live flicker, flame only
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = E.lin(ctx, W, 0, 300, 0, [[0, '#FFB34D', 0.24 * fl], [1, '#FFB34D', 0]]); ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    // ignition "fwoomp": a soft warm burst as the kandil catches ("senin")
    const ig = E.env(t, 18.9, 19.32, 0.05, 0.36);
    if (ig > 0.01) { S.light(ctx, wick[0], wick[1] - 20, 420 * cam.z, '#FFD58A', 0.55 * ig); S.sparkle(ctx, wick[0], wick[1] - 34 * cam.z, 110 * cam.z * ig, ig, '#FFF4D6', 0.1); }
    // ---------- front layers ----------
    if (morph) DE.drawShaftD(ctx, t, g, 1 - m);
    drawDust(ctx, t, cam, m * (1 - 0.6 * pp(t, 21.4, 21.8)));
    if (morph) DE.drawFGD(ctx, t, g, 1 - m);
    if (m > 0.005) { ctx.save(); ctx.globalAlpha *= 0.95 * m; ctx.drawImage(SPR.fg, -FGP - (cam.x - 540) * 0.5 + E.noise(t * 0.2, 9) * 12, 1160 - (cam.y - 960) * 0.5 - (cam.z - 1) * 120 + (1 - m) * 160); ctx.restore(); }
    if (morph) DE.gradeD(ctx, t, 1 - m);
    gradeE(ctx, t, m);

    // ---------- darkness ----------
    const grade = 0.4 * pp(t, 20.2, 21.8, 'inOutSine'), expo = 0.4 * pp(t, 21.47, 21.6), nf = pp(t, 21.5, 21.8, 'inOutSine');
    if (grade > 0.002) { ctx.fillStyle = `rgba(0,0,0,${grade.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    if (expo > 0.002) { ctx.fillStyle = `rgba(0,0,0,${expo.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    const nA = 0.8 * nf + 0.2 * pp(t, 21.95, 22.3, 'inOutSine');
    if (nA > 0.002) { ctx.fillStyle = E.rgba(PAL.night, nA); ctx.fillRect(0, 0, W, H); }
    // F palette creeping in at the very end (60 %)
    const fk = pp(t, 22.26, 22.5, 'inOutSine');
    if (fk > 0.002) { ctx.save(); ctx.globalAlpha = 0.6 * fk; ctx.fillStyle = E.lin(ctx, 0, 0, 0, H, [[0, FPAL[0]], [0.55, FPAL[1]], [1, FPAL[2]]]); ctx.fillRect(0, 0, W, H); ctx.restore(); }
    // survivors of the dark: faint bowl rim + one ember
    if (nf > 0.01) {
      const rimW = [pos[0], pos[1] - 220 * BOWL_S], rp = toS(cam, rimW[0], rimW[1]), rx = 330 * BOWL_S * cam.z, ry = 110 * BOWL_S * cam.z;
      const ra = nf * (1 - pp(t, 22.0, 22.28, 'inOutSine')) * (0.88 + 0.12 * Math.sin(t * 2.3));
      ctx.save();
      // not pure black: a breath of deep teal haze around the bowl
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = E.rad(ctx, rp[0], rp[1] - 60, 0, 620, [[0, '#123A44', 0.55 * ra], [1, '#123A44', 0]]); ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const rg = E.lin(ctx, rp[0] - rx, 0, rp[0] + rx, 0, [[0, '#6FB8B4', 0.12 * ra], [0.6, '#9FDCD6', 0.3 * ra], [1, '#FFB070', 0.42 * ra]]);
      ctx.strokeStyle = E.rgba('#6FB8B4', 0.08 * ra); ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(rp[0], rp[1], rx, ry, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rg; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.ellipse(rp[0], rp[1], rx, ry, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = E.rgba('#FFC890', 0.32 * ra); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(rp[0], rp[1], rx, ry, 0, -0.75, -0.15); ctx.stroke();
      ctx.restore();
    }
    const ea = pp(t, 21.5, 21.72);
    if (ea > 0.003) {
      // 21.85–22.12 drifts off the wick to hang low over the bowl; 22.12–22.47 rises straight up 155 px to (540,760)
      const u1 = pp(t, 21.85, 22.12, 'inOutSine'), u2 = pp(t, 22.12, 22.47, 'inOutSine'), u = pp(t, 21.85, 22.47, 'linear');
      let x = lerp(wick[0], EMBER_RISE[0], u1) + 12 * Math.sin(u1 * PI * 2) * (1 - u1), y = lerp(wick[1], EMBER_RISE[1], u1) - 28 * Math.sin(PI * u1);
      if (u2 > 0) { x = lerp(EMBER_RISE[0], 540, u2) + 6 * Math.sin(u2 * PI * 1.5) * (1 - u2); y = lerp(EMBER_RISE[1], 760, u2); }
      const r = lerp(11 * (0.92 + 0.08 * E.noise(t * 3, 7)), 34, ease.outCubic(pp(t, 22.2, 22.47, 'linear')));
      const gk = pp(t, 22.34, 22.46, 'linear');
      const vb = pp(t, 22.24, 22.5, 'outCubic'); // violet bloom behind the gem
      if (vb > 0.002) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = E.rad(ctx, x, y, 0, 560 * vb + 40, [[0, '#7A44B8', 0.5 * vb], [0.3, FPAL[2], 0.4 * vb], [1, FPAL[2], 0]]); ctx.fillRect(0, 0, W, H); ctx.restore(); }
      S.light(ctx, x, y, 60 * cam.z + r * 3, '#FF7A3D', 0.32 * ea * (1 - gk * 0.7));
      // its reflection in the glossy floor (only while it is still low)
      const hzN = toS(cam, 0, HZ)[1], ry2 = 2 * hzN - y, rfa = ea * (1 - pp(t, 21.95, 22.25)) * 0.5;
      if (rfa > 0.01 && ry2 < H) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, ry2); ctx.scale(0.35, 1.6); S.light(ctx, 0, 0, 40, '#FF7A3D', rfa); ctx.restore(); }
      if (u < 0.25) A.wisps(ctx, t, { x, y: y - 6, n: 3, seed: 77, col: '#9C8CA8', rise: 30, life: 2.4, spread: 3, w: 2.2, curl: 6, op: 'source-over', alpha: 0.25 * ea * (1 - u / 0.25) });
      drawEmberGem(ctx, x, y, r, gk, t, ea);
    }
  }
  DE.drawE = drawE;

  E.scene({
    id: 'E_omur', t0: 16.1, t1: 22.5,
    async setup() {
      SPR = {
        mote: glowSpr(24, '#F2C46B', '#FFF4D6'), cyan: glowSpr(20, '#CFF6FF', '#FFFFFF'), blue: glowSpr(20, '#4C8DFF', '#DCEBFF'),
        bokC: bokehSpr(44, '#7FE0D2'), bokG: bokehSpr(34, '#F2C46B'), fg: fgSpr(),
      };
    },
    post: (t) => {
      const lit = pp(t, 18.9, 19.1) * (1 - pp(t, 21.3, 21.6)), nf = pp(t, 21.45, 21.8);
      return {
        bloom: t < 16.3 ? 0.42 : 0.4 + 0.18 * lit + 0.35 * nf + 0.15 * pp(t, 22.2, 22.5),
        vignette: 0.36 + 0.12 * nf, grain: 0.06 + 0.03 * nf,
      };
    },
    draw(ctx, t) { drawE(ctx, cl(t, 16.1, 22.5)); },
  });
})();
