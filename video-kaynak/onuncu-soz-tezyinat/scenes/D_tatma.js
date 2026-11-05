/* =====================================================================================
 * D_tatma · 11.50–16.30 · "Sana tattırır, iştihanı açar, fakat doyurmaz."
 * -------------------------------------------------------------------------------------
 * PLAN (1080×1920 · hero zone y192–1152 · gloss 'acı' visible until ≈12.47 → band calm/dark)
 *  Layers, back → front
 *   L0  plum wall #2A1633→#4A2346→#6E3448 (lerps in from C's night 11.50–11.80) + warm key
 *       blob from the right #FF9D5C (ramps at "Sana")
 *   L1  far bokeh (two distant warm lamps), parallax 0.35
 *   L2  Ottoman niche: pointed arch, raised frame, faint çini rosettes, lit left jamb —
 *       pre-blurred sprite (depth of field) + its mirror in the glossy ledge #1C1024
 *   L3  HERO: Iznik bowl (A.iznikBowl), honey drop / splash / pool, craving motes, wisps
 *   L4  light shaft from the upper right + dust in it ('lighter')
 *   L5  foreground: blurred dark vessel rim + honey bokeh, parallax 1.6
 *  Camera: the fall (drop locked at (540,880), world scrolls up ~1100 px/s, decelerates)
 *   → lands 12.27 + spring overshoot 12 px + tiny shake → crane up & push in 13.30–14.30
 *   (ry 110→220, zoom 1→1.12, pool kept near frame centre) → pull back + crane down
 *   15.0–16.0 to the 3/4 view (screen rx 330, rim (540,780), foot y1000)
 *   → 15.90+: MORPH bowl+reflection → hourglass, drawn by E_omur (DE.drawE) so that both
 *   scenes produce identical frames over the 16.10–16.30 overlap.
 *  Beats (accents 2–4 frames early)
 *   11.50 petal→honey-drop morph (C handoff) · 11.97 "Sana": bowl tilts 6° toward camera,
 *   warm key ramps · 12.27 "tattırır": drop lands — 12-droplet crown, Worthington jet,
 *   3 ripples, pool r40, çini lit only where honey touches (r 0→120) · 13.22 "iştihanı":
 *   60 craving motes spiral in · 13.70 "açar": bowl widens (rx×1.27), tulips unfurl, rim
 *   light sweep · 14.52 "fakat": vortex freezes, motes hang · 14.88 "doyurmaz": pool
 *   evaporates into 20 wisps, pattern dims to #2A3550, hollow rings run to the rim.
 * Shared with E_omur through window.DE: palette, bowl state/renderer, background, motes.
 * ===================================================================================== */
(function () {
  'use strict';
  const W = 1080, H = 1920, TAU = Math.PI * 2, PI = Math.PI;
  const cl = E.clamp, lerp = E.lerp, ease = E.ease;
  const pp = (t, a, b, e) => E.p(t, a, b, e);
  const DE = (window.DE = window.DE || {});

  const PAL = { top: '#2A1633', mid: '#4A2346', bot: '#6E3448', floor: '#1C1024', key: '#FF9D5C', honey: '#FFB547', honeyHi: '#FFE7A0' };
  const NIGHT = ['#2B2A4F', '#3E3560', '#1A1830'];
  const T = { land: 12.27, morph: 15.9 };
  DE.PAL_D = PAL; DE.T_D = T;

  /* ------------------------------------------------------------------ camera */
  const herm = (p0, m0, p1, m1, d, u) => { const u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 * d + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1 * d; };
  /** how far (screen px) the bowl world still sits below its rest position */
  function scrollY(t) {
    if (t < 11.8) return 530 + (11.8 - t) * 1100;
    if (t < T.land) return herm(530, -1100, 30, -420, T.land - 11.8, (t - 11.8) / (T.land - 11.8));
    const tau = t - T.land, w = 14, z = 0.4, wd = w * Math.sqrt(1 - z * z), A = 30, B = (-420 + z * w * A) / wd;
    return Math.exp(-z * w * tau) * (A * Math.cos(wd * tau) + B * Math.sin(wd * tau));
  }
  function camD(t) {
    const sy = scrollY(t);
    const cIn = pp(t, 13.30, 14.30, 'inOutCubic'), cOut = pp(t, 15.0, 16.0, 'inOutCubic');
    const crane = cIn * (1 - cOut);
    const z = lerp(lerp(1, 0.98, cIn), 0.787, cOut);
    const tilt = 0.105 * ease.outBack(pp(t, 11.95, 12.45, 'linear'), 1.3) * (1 - cOut);
    const widen = pp(t, 13.70, 14.22, 'inOutCubic');
    const bump = 1 + 0.03 * Math.sin(PI * cl((t - 13.92) / 0.42)) * (t > 13.92 ? 1 : 0);
    const fcBase = lerp(lerp(850, 872, cIn), 830, cOut);
    const dr = E.drift(t, 4, 0.3, 11);
    const sh = t > T.land ? Math.exp(-(t - T.land) * 11) : 0;
    const shx = E.noise(t * 38, 5) * 4 * sh, shy = E.noise(t * 41, 6) * 3 * sh;
    return { sy, crane, z: z * bump, tilt, widen, fcY: fcBase + sy + dr.y + shy, x: 540 + dr.x + shx, cOut };
  }
  /** bowl geometry on screen (mirrors A.iznikBowl's internal maths) */
  function bowlGeo(c) {
    const rx = 330 * (1 + 0.27 * c.widen);
    const ry0 = (110 + 90 * c.crane) * (1 + 0.27 * c.widen);
    const ry = Math.min(rx * 0.97, ry0 + rx * Math.sin(c.tilt) * 0.9);
    const depth = 220 * (1 + 0.3 * c.widen);
    const th = rx * 0.028, irx = rx - th, iry = ry * (irx / rx), yo = ry * 0.5, s = ry / rx;
    const rimY = c.fcY - yo * c.z;
    const g = { rx, ry, depth, irx, iry, yo, s, x: c.x, rimY, z: c.z, footY: rimY + depth * c.z, c };
    /** floor-local normalised (px,py) (q=1 → rim) + height above the floor (local px) → screen */
    g.map = (px, py, h = 0) => { const q2 = px * px + py * py; return [g.x + px * irx * g.z, g.rimY + (py * iry + yo * Math.max(0, 1 - q2) - h) * g.z]; };
    g.fc = [g.x, g.rimY + yo * g.z];
    return g;
  }
  DE.camD = camD; DE.bowlGeo = bowlGeo;

  /* ------------------------------------------------------------------ sprites */
  let SPR = null;
  function archPath(p, x0, x1, ySpring, yApex, yBase) {
    const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2, hh = ySpring - yApex;
    p.moveTo(x0, yBase); p.lineTo(x0, ySpring);
    p.bezierCurveTo(x0, ySpring - hh * 0.58, cx - hw * 0.42, yApex + hh * 0.16, cx, yApex);
    p.bezierCurveTo(cx + hw * 0.42, yApex + hh * 0.16, x1, ySpring - hh * 0.58, x1, ySpring);
    p.lineTo(x1, yBase); p.closePath();
  }
  // niche sprite: local coords x 0..1080 (centre 540), horizon at y=0, art above (−930..0) and mirror below
  const NS = { w: 1080, top: 1000, bot: 520 };
  function makeNiche() {
    const art = E.canvas(NS.w, NS.top), a = art.x;
    a.translate(0, NS.top);
    const outer = new Path2D(); archPath(outer, 112, 968, -520, -930, 0);
    const frame = new Path2D(); archPath(frame, 140, 940, -510, -892, 0);
    const recess = new Path2D(); archPath(recess, 176, 904, -498, -846, 0);
    // raised frame band
    a.fillStyle = E.lin(a, 0, -930, 0, 0, [[0, '#5B2B4E', 0.55], [1, '#7A3A52', 0.5]]); a.fill(outer);
    a.fillStyle = E.lin(a, 0, -900, 0, 0, [[0, '#3A1B3C'], [1, '#4E2340']]); a.fill(frame);
    // fine double moulding lines
    a.lineWidth = 2.2; a.strokeStyle = 'rgba(214,160,128,0.22)'; a.stroke(outer);
    a.lineWidth = 1.4; a.strokeStyle = 'rgba(214,160,128,0.16)'; a.stroke(frame);
    // recess
    a.fillStyle = E.lin(a, 0, -846, 0, 0, [[0, '#170A1F'], [0.55, '#21102B'], [1, '#2E1636']]); a.fill(recess);
    a.save(); a.clip(recess);
    // faint çini rosettes (staggered grid) — tile relief in shadow
    for (let row = 0; row < 12; row++) for (let col = 0; col < 9; col++) {
      const x = 176 + col * 92 + (row % 2 ? 46 : 0), y = -830 + row * 76;
      a.save(); a.translate(x, y);
      a.fillStyle = 'rgba(70,52,110,0.32)';
      for (let k = 0; k < 8; k++) { const an = (k / 8) * TAU; a.beginPath(); a.ellipse(Math.cos(an) * 11, Math.sin(an) * 11, 8, 4, an, 0, TAU); a.fill(); }
      a.fillStyle = 'rgba(150,70,80,0.30)'; a.beginPath(); a.arc(0, 0, 5, 0, TAU); a.fill();
      a.strokeStyle = 'rgba(70,52,110,0.18)'; a.lineWidth = 1.5; a.beginPath(); a.moveTo(-46, 38); a.lineTo(0, 0); a.lineTo(46, 38); a.stroke();
      a.restore();
    }
    // light from the right: lit LEFT inner jamb, shadowed right jamb, falloff toward the top
    a.fillStyle = E.lin(a, 176, 0, 262, 0, [[0, '#B25A54', 0.55], [0.35, '#8A3E4C', 0.25], [1, '#8A3E4C', 0]]); a.fillRect(176, -900, 120, 900);
    a.fillStyle = E.lin(a, 904, 0, 790, 0, [[0, '#0C0412', 0.75], [1, '#0C0412', 0]]); a.fillRect(780, -900, 124, 900);
    a.fillStyle = E.lin(a, 0, -846, 0, -560, [[0, '#0C0412', 0.6], [1, '#0C0412', 0]]); a.fillRect(0, -900, NS.w, 360);
    a.fillStyle = E.lin(a, 0, -140, 0, 0, [[0, '#FF9D5C', 0], [1, '#FF9D5C', 0.10]]); a.fillRect(0, -140, NS.w, 140);
    a.restore();
    // warm edge where the frame catches the key light (right side of the outer band)
    a.save(); a.clip(outer); a.globalCompositeOperation = 'lighter';
    a.fillStyle = E.lin(a, 760, 0, 968, 0, [[0, '#FF9D5C', 0], [1, '#FF9D5C', 0.20]]); a.fillRect(760, -930, 220, 930); a.restore();
    // assemble with depth-of-field blur + mirror
    const spr = E.canvas(NS.w, NS.top + NS.bot), s = spr.x;
    s.filter = 'blur(2.2px)'; s.drawImage(art.c, 0, 0); s.filter = 'none';
    s.save(); s.translate(0, NS.top * 2); s.scale(1, -1); s.globalAlpha = 0.32; s.filter = 'blur(7px)'; s.drawImage(art.c, 0, 0); s.restore();
    s.globalCompositeOperation = 'destination-out';
    s.fillStyle = E.lin(s, 0, NS.top, 0, NS.top + NS.bot, [[0, '#000', 0], [0.55, '#000', 0.75], [1, '#000', 1]]); s.fillRect(0, NS.top, NS.w, NS.bot);
    return spr.c;
  }
  function makeGlow(r, col, core) {
    const c = E.canvas(r * 2, r * 2), x = c.x;
    x.fillStyle = E.rad(x, r, r, 0, r, [[0, core || col, 1], [0.18, col, 0.85], [0.45, col, 0.28], [1, col, 0]]); x.fillRect(0, 0, r * 2, r * 2);
    return c.c;
  }
  function makeBokeh(r, col) {
    const c = E.canvas(r * 2 + 8, r * 2 + 8), x = c.x, m = r + 4;
    x.filter = 'blur(2px)';
    x.fillStyle = E.rad(x, m, m, 0, r, [[0, col, 0.18], [0.82, col, 0.28], [0.95, col, 0.5], [1, col, 0]]);
    x.beginPath(); x.arc(m, m, r, 0, TAU); x.fill();
    return c.c;
  }
  const FGP = 200; // padding so blurred edges never get clipped when the sprite slides
  function makeFG() { // bottom foreground strip: blurred dark vessel rim at bottom-left + honey bokeh
    const c = E.canvas(W + FGP * 2, 900), x = c.x;
    x.translate(FGP, 0); x.filter = 'blur(16px)';
    x.fillStyle = '#12081A'; x.beginPath(); x.ellipse(70, 640, 330, 300, -0.25, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,150,100,0.10)'; x.beginPath(); x.ellipse(60, 650, 300, 280, -0.25, 0, TAU); x.fill();
    x.fillStyle = '#12081A'; x.beginPath(); x.ellipse(1080, 760, 260, 200, 0.3, 0, TAU); x.fill();
    x.filter = 'blur(9px)';
    const bk = [[330, 520, 46, 0.22], [420, 610, 28, 0.18], [860, 470, 38, 0.16], [960, 590, 22, 0.2]];
    for (const [bx, by, br, ba] of bk) { x.fillStyle = E.rad(x, bx, by, 0, br, [[0, '#FFB547', ba * 0.6], [0.85, '#FFB547', ba], [1, '#FFB547', 0]]); x.beginPath(); x.arc(bx, by, br, 0, TAU); x.fill(); }
    return c.c;
  }
  function makeStreak() { // vertical soft honey streak (motion blur ghost), fades upward
    const c = E.canvas(44, 190), x = c.x;
    x.filter = 'blur(5px)';
    x.fillStyle = E.lin(x, 0, 0, 0, 190, [[0, '#FFB547', 0], [0.7, '#FFB547', 0.35], [1, '#FFE7A0', 0.9]]);
    x.beginPath(); x.moveTo(22, 6); x.quadraticCurveTo(34, 150, 22, 184); x.quadraticCurveTo(10, 150, 22, 6); x.fill();
    return c.c;
  }
  function makeShaft() { // soft diagonal light beam, lo-res
    const c = E.canvas(540, 960), x = c.x;
    x.filter = 'blur(18px)';
    const g = x.createLinearGradient(520, 0, 230, 560);
    g.addColorStop(0, 'rgba(255,170,110,0.9)'); g.addColorStop(0.55, 'rgba(255,160,100,0.35)'); g.addColorStop(1, 'rgba(255,160,100,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(470, -40); x.lineTo(620, -40); x.lineTo(330, 600); x.lineTo(150, 600); x.closePath(); x.fill();
    return c.c;
  }

  /* ------------------------------------------------------------------ drop */
  const silCache = new Map();
  const tearSil = (r) => { const k = Math.round(r * 4) / 4; let s = silCache.get('t' + k); if (!s) { s = A.teardropSilhouette(k); silCache.set('t' + k, s); } return s; };
  let PETAL = null;
  function petalSil() { // C's hero petal, roughly as it reaches the warm light (tilted, ≈110 px)
    if (!PETAL) { const P = A.petalSilhouette(92), ca = Math.cos(-0.55), sa = Math.sin(-0.55); PETAL = A.resample(P.map(([x, y]) => [x * ca - y * sa, x * sa + y * ca]), 128); }
    return PETAL;
  }
  /** honey drop (point up). k: 0 = still C's petal colour/shape, 1 = drop. sq: squash (+ wide) */
  function drawDrop(ctx, x, y, r, o = {}) {
    const k = o.k === undefined ? 1 : o.k, t = o.t || 0, sq = o.sq || 0, a = o.alpha === undefined ? 1 : o.alpha;
    const pts = k >= 1 ? tearSil(r) : A.lerpShape(petalSil(), tearSil(r), A.morphEase(k));
    const wob = 0.045 * Math.sin(t * TAU * 5.5) * (o.wob === undefined ? 1 : o.wob);
    const sx = (1 + wob) * (1 + sq), syy = (1 - wob) / (1 + sq * 0.8);
    ctx.save(); ctx.globalAlpha *= a;
    S.light(ctx, x, y + r * 0.2, r * 5.2, '#FFB547', 0.30 * k + 0.08);
    ctx.translate(x, y); ctx.scale(sx, syy);
    const c0 = E.mix('#FFD1DC', '#FFF1C0', k), c1 = E.mix('#F7A3B5', PAL.honeyHi, k), c2 = E.mix('#F28BA0', PAL.honey, k), c3 = E.mix('#C2185B', '#D07A16', k);
    ctx.fillStyle = E.rad(ctx, -r * 0.28, r * 0.25, 0, r * 1.7, [[0, c0], [0.32, c1], [0.68, c2], [1, c3]]);
    A.fillShape(ctx, pts);
    // inner glow (honey is translucent, lit from within by the key)
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = E.rad(ctx, r * 0.1, r * 0.35, 0, r * 0.9, [[0, PAL.honeyHi, 0.55 * k], [1, PAL.honeyHi, 0]]);
    ctx.beginPath(); ctx.arc(r * 0.1, r * 0.35, r * 0.9, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // warm rim light on the right edge
    ctx.save(); ctx.beginPath(); ctx.rect(r * 0.15, -r * 3, r * 2, r * 6); ctx.clip();
    ctx.strokeStyle = 'rgba(255,244,214,0.75)'; ctx.lineWidth = Math.max(1.2, r * 0.08); A.strokeShape(ctx, pts); ctx.restore();
    // specular
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.05, r * 0.13, r * 0.33, 0.32, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.55, r * 0.07, 0, TAU); ctx.fill();
    ctx.restore();
  }
  DE.drawDrop = drawDrop;

  /* ------------------------------------------------------------------ background */
  function key(t) { return lerp(0.22, 1, pp(t, 11.97, 12.55, 'inOutSine')); }
  /** full plum stage behind the bowl (wall, key, bokeh, niche, ledge). g = bowlGeo */
  function drawStage(ctx, t, g) {
    const c = g.c, nk = pp(t, 11.5, 11.8, 'inOutSine'), kk = key(t);
    const top = E.mix(NIGHT[0], PAL.top, nk), mid = E.mix(NIGHT[1], PAL.mid, nk), bot = E.mix(NIGHT[2], PAL.bot, nk);
    // horizon (wall/ledge line): just behind the bowl foot, parallax 0.85, rises with the crane
    const zp = 1 + (g.z - 1) * 0.85;
    const hz = 1000 + (g.footY - 1000) * 0.85 - c.crane * 330 * g.z - 6 * zp;
    ctx.fillStyle = E.lin(ctx, 0, hz - 1100, 0, hz, [[0, top], [0.6, mid], [1, bot]]);
    ctx.fillRect(0, 0, W, H);
    // warm key from the right
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = E.rad(ctx, 1180, hz - 520, 0, 1250, [[0, PAL.key, 0.34 * kk], [0.45, PAL.key, 0.12 * kk], [1, PAL.key, 0]]);
    ctx.fillRect(0, 0, W, H); ctx.restore();
    // far bokeh (distant lamps)
    const fp = 0.35, fy = (g.footY - 1000) * fp - c.crane * 120;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const BK = [[70, 300, 1.0, 0], [1010, 180, 0.8, 1], [60, 760, 0.55, 1], [1030, 690, 0.7, 0], [540, 70, 0.6, 1]];
    BK.forEach(([bx, by, bs, kind], i) => {
      const s = bs * (1 + 0.06 * Math.sin(t * 0.9 + i)), al = (0.55 + 0.25 * Math.sin(t * 1.3 + i * 2)) * (0.5 + 0.5 * kk);
      S.drawSprite(ctx, kind ? SPR.bokR : SPR.bokA, bx + E.noise(t * 0.2, i) * 12, by + fy, s, 0, al);
    });
    ctx.restore();
    // niche (sprite: horizon at sprite y = NS.top)
    ctx.save(); ctx.translate(g.x, hz); ctx.scale(zp, zp);
    ctx.globalAlpha *= lerp(0.35, 1, nk) * lerp(0.75, 1, kk);
    ctx.drawImage(SPR.niche, -540, -NS.top);
    ctx.restore();
    // ledge / glossy floor below the horizon
    ctx.fillStyle = E.lin(ctx, 0, hz, 0, hz + 700, [[0, '#2B1431', 0.85], [0.12, PAL.floor, 0.9], [1, '#0E0714', 0.96]]);
    ctx.fillRect(0, hz, W, H - hz + 2);
    ctx.save(); ctx.translate(g.x, hz); ctx.scale(zp, zp); ctx.globalAlpha *= 0.85 * lerp(0.5, 1, kk);
    ctx.drawImage(SPR.niche, 0, NS.top, NS.w, NS.bot, -540, 0, NS.w, NS.bot); ctx.restore();
    // ledge edge highlight + key glare on the gloss
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = E.lin(ctx, 0, hz - 2, 0, hz + 3, [[0, '#FFB38A', 0], [0.5, '#FFB38A', 0.16 * kk], [1, '#FFB38A', 0]]); ctx.fillRect(0, hz - 2, W, 5);
    ctx.translate(860, hz + 40 * zp); ctx.scale(1, 0.16);
    ctx.fillStyle = E.rad(ctx, 0, 0, 0, 420, [[0, PAL.key, 0.22 * kk], [1, PAL.key, 0]]); ctx.fillRect(-420, -420, 840, 840);
    ctx.restore();
    return hz;
  }
  DE.drawStageD = drawStage;

  /* ------------------------------------------------------------------ craving motes */
  const MOTES = [];
  for (let i = 0; i < 60; i++) MOTES.push({
    a0: E.hash(i, 301) * TAU, q0: 1.05 + 0.95 * E.hash(i, 302), h0: 60 + 300 * E.hash(i, 303), w: 1.0 + 0.6 * E.hash(i, 304),
    ta: 13.22 + 0.42 * E.hash(i, 305), sz: 0.55 + 0.6 * E.hash(i, 306), tw: E.hash(i, 307),
  });
  DE.MOTES = MOTES;
  const tauEff = (t) => (t < 14.52 ? t - 13.22 : 1.30 + 0.14 * (cl((t - 14.52) / 0.14) - 0.5 * cl((t - 14.52) / 0.14) ** 2));
  /** mote i state: floor-local normalised position + height (local px). gather 0..1 pulls into the floor centre */
  function moteState(i, t) {
    const m = MOTES[i], te = tauEff(t) - (m.ta - 13.22);
    if (te <= 0) return null;
    const q = m.q0 * Math.exp(-0.42 * te) + 0.14, an = m.a0 - m.w * te, h = m.h0 * Math.exp(-0.5 * te);
    return { px: Math.cos(an) * q, py: Math.sin(an) * q, h, te, fade: cl(te / 0.3) };
  }
  DE.moteState = moteState;
  function drawMotes(ctx, t, g, o = {}) {
    const gather = o.gather || 0, al = o.alpha === undefined ? 1 : o.alpha;
    if (t < 13.22 || al <= 0) return;
    const moving = t < 14.62 ? 1 : 0;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < MOTES.length; i++) {
      const m = MOTES[i], s = moteState(i, t); if (!s) continue;
      if (o.skip && o.skip(i)) continue;
      const gi = cl(gather * 1.6 - m.tw * 0.6);
      const bob = moving ? 0 : 2.2 * Math.sin(t * 2.1 + i);
      let px = s.px * (1 - gi), py = s.py * (1 - gi), h = s.h * (1 - ease.inQuad(gi)) + bob;
      const [x, y] = g.map(px, py, h);
      const twk = 0.65 + 0.35 * Math.sin(t * (3 + 3 * m.tw) + i * 1.7);
      const a = s.fade * twk * al * (gi > 0.85 ? (1 - gi) / 0.15 : 1) * (t > 14.88 ? lerp(1, 0.72, pp(t, 14.88, 15.4)) : 1);
      if (a <= 0.01) continue;
      const spd = t < 14.52 ? 1 : 1 - cl((t - 14.52) / 0.14);
      if (spd > 0.02 && gi < 0.05) { // curved spiral trail (tapered)
        let prev = [x, y];
        for (let j = 1; j <= 7; j++) {
          const s2 = moteState(i, t - j * 0.045 * spd); if (!s2) break;
          const q2 = g.map(s2.px, s2.py, s2.h), k = 1 - j / 8;
          ctx.strokeStyle = E.rgba('#FFD27A', 0.42 * a * k); ctx.lineWidth = 2.8 * m.sz * g.z * k + 0.4;
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q2[0], q2[1]); ctx.stroke(); prev = q2;
        }
      }
      S.drawSprite(ctx, SPR.mote, x, y, m.sz * g.z * 0.62, 0, a);
    }
    ctx.restore();
  }
  DE.drawMotes = drawMotes;

  /* ------------------------------------------------------------------ splash */
  const SPL = [];
  for (let i = 0; i < 12; i++) SPL.push({ a: (i / 12) * TAU + (E.hash(i, 51) - 0.5) * 0.35, reach: 0.26 + 0.3 * E.hash(i, 52), up: 260 + 170 * E.hash(i, 53), sz: 7 + 6 * E.hash(i, 54) });
  function drawSplash(ctx, t, g) {
    const tau = t - T.land; if (tau < 0 || tau > 1.4) return;
    const z = g.z, fc = g.fc, G = 1500;
    ctx.save();
    // flash
    S.light(ctx, fc[0], fc[1], 260 * z, '#FFD27A', 0.75 * Math.exp(-tau * 7));
    // ripples (3 ellipses in rim perspective)
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const u = (tau - 0.06 - k * 0.13) / 0.85; if (u <= 0 || u >= 1) continue;
      const q = 0.05 + 0.5 * ease.outCubic(u), al = (1 - u) * (1 - u) * 0.75;
      const cy = g.rimY + g.yo * (1 - q * q) * z;
      ctx.strokeStyle = E.rgba('#FFE7A0', al); ctx.lineWidth = (2.6 - k * 0.5) * z;
      ctx.beginPath(); ctx.ellipse(fc[0], cy, q * g.irx * z, Math.max(0.5, q * g.iry * z), 0, 0, TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // crown sheet (brief)
    if (tau < 0.2) {
      const u = tau / 0.2, q = 0.06 + 0.14 * u, hc = 58 * Math.sin(PI * u) * z;
      ctx.strokeStyle = E.rgba(PAL.honey, 0.85 * (1 - u)); ctx.lineWidth = Math.max(1, hc * 0.45);
      ctx.beginPath(); ctx.ellipse(fc[0], fc[1] - hc * 0.5, q * g.irx * z, Math.max(0.5, q * g.iry * z), 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = E.rgba('#FFF3C4', 0.8 * (1 - u)); ctx.lineWidth = Math.max(0.8, hc * 0.12);
      ctx.beginPath(); ctx.ellipse(fc[0], fc[1] - hc, q * g.irx * z, Math.max(0.5, q * g.iry * z), 0, PI, TAU); ctx.stroke();
    }
    // Worthington jet
    const tj = (tau - 0.07) / 0.42;
    if (tj > 0 && tj < 1) {
      const hj = 120 * Math.sin(PI * Math.min(tj, 0.62) / 1.24) * z * (tj > 0.62 ? 1 - (tj - 0.62) / 0.38 : 1), wj = (13 - 8 * tj) * z;
      ctx.lineCap = 'round'; ctx.strokeStyle = E.lin(ctx, 0, fc[1], 0, fc[1] - hj, [[0, PAL.honey], [1, PAL.honeyHi]]); ctx.lineWidth = wj;
      ctx.beginPath(); ctx.moveTo(fc[0], fc[1]); ctx.lineTo(fc[0], fc[1] - hj); ctx.stroke();
      // detached top droplet
      const td = tau - 0.27;
      if (td > 0) { const yd = fc[1] - (120 * z + 260 * z * td - 0.5 * G * z * td * td); if (yd < fc[1]) drawBlob(ctx, fc[0], yd, 8 * z, 0); }
      else { drawBlob(ctx, fc[0], fc[1] - hj, wj * 0.75, 0); }
    }
    // crown droplets on parabolic arcs
    for (let i = 0; i < SPL.length; i++) {
      const d = SPL[i], Tf = (2 * d.up) / G, u = tau / Tf;
      if (u < 0) continue;
      if (u <= 1) {
        const q = 0.05 + d.reach * u, h = d.up * tau - 0.5 * G * tau * tau;
        const [x, y] = g.map(Math.cos(d.a) * q, Math.sin(d.a) * q, Math.max(0, h));
        const vx = Math.cos(d.a) * d.reach / Tf * g.irx * z, vy = (Math.sin(d.a) * d.reach / Tf * g.iry - (d.up - G * tau)) * z;
        drawBlob(ctx, x, y, d.sz * z * (1 - 0.35 * u), Math.atan2(vy, vx), Math.min(2.2, 1 + Math.hypot(vx, vy) / 900));
      } else if (u < 1.8) { // landing spot fades into the floor
        const q = 0.05 + d.reach, [x, y] = g.map(Math.cos(d.a) * q, Math.sin(d.a) * q, 0), k = (u - 1) / 0.8;
        ctx.fillStyle = E.rgba(PAL.honey, 0.7 * (1 - k)); ctx.beginPath(); ctx.ellipse(x, y, d.sz * z * 0.9, d.sz * z * 0.9 * g.s, 0, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawBlob(ctx, x, y, r, ang, stretch = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(stretch, 1 / Math.sqrt(stretch));
    ctx.fillStyle = E.rad(ctx, -r * 0.3, -r * 0.3, 0, r * 1.3, [[0, '#FFF3C4'], [0.45, PAL.honey], [1, '#C8761A']]);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.28, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ------------------------------------------------------------------ bowl */
  function honeyR(t) {
    const grow = ease.outBack(pp(t, T.land, T.land + 0.38, 'linear'), 1.4);
    const evap = pp(t, 14.88, 15.36, 'inCubic');
    return 40 * grow * (1 - evap) + (grow > 0 && evap < 1 ? 1.4 * Math.sin(t * 7.3) * (1 - evap) : 0);
  }
  function bowlOpts(t, c) {
    const lit = 1 - pp(t, 14.88, 15.45, 'inOutSine');
    return {
      t, rx: 330, ry: 110 + 90 * c.crane, depth: 220, tilt: c.tilt, widen: c.widen,
      lit, litRadius: 120 * pp(t, T.land, T.land + 0.75, 'outCubic'),
      dim: 0.5 * pp(t, 14.88, 15.5), honey: Math.max(0, honeyR(t)), reflection: true, rimCol: '#B9A6FF',
    };
  }
  /** bowl + its reflection. veil: darken the bowl only (pre-key); the reflection fades while craning */
  function drawBowl(ctx, t, g, extra) {
    const o = Object.assign(bowlOpts(t, g.c), extra || {});
    const veil = (extra && extra.veil !== undefined) ? extra.veil : 0.72 * (1 - pp(t, 11.97, 12.5, 'inOutSine'));
    const rf = cl(g.c.crane * 1.4);
    if (veil < 0.005 && rf < 0.005) { E.at(ctx, g.x, g.rimY, g.z, 0, (c) => A.iznikBowl(c, o)); return; }
    E.layer(ctx, (l) => {
      E.at(l, g.x, g.rimY, g.z, 0, (c) => A.iznikBowl(c, o));
      if (rf > 0.005) {
        l.globalCompositeOperation = 'destination-out';
        const y0 = g.footY + 10 * g.z;
        l.fillStyle = E.lin(l, 0, y0, 0, y0 + 60 * g.z, [[0, '#000', 0], [1, '#000', rf]]); l.fillRect(0, y0, W, H - y0);
      }
      if (veil > 0.005) { l.globalCompositeOperation = 'source-atop'; l.fillStyle = `rgba(22,9,30,${veil.toFixed(3)})`; l.fillRect(0, 0, W, H); }
    });
  }
  DE.drawBowlD = drawBowl; DE.bowlOptsD = bowlOpts;

  /** honey-pool sparkle + pool glints (secondary motion on the honey) */
  function drawPoolLife(ctx, t, g) {
    const hr = honeyR(t); if (hr < 2) return;
    const fc = g.fc, z = g.z;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    S.light(ctx, fc[0], fc[1], hr * 3.2 * z, '#FFB547', 0.28 + 0.06 * Math.sin(t * 3.1));
    const pts = [];
    for (let i = 0; i < 4; i++) { const a = t * (0.7 + i * 0.23) + i * 1.9, q = 0.45 + 0.3 * Math.sin(t * 1.3 + i); pts.push([fc[0] + Math.cos(a) * hr * q * z, fc[1] + Math.sin(a) * hr * q * g.s * z]); }
    ctx.restore();
    A.glints(ctx, t, { pts, r: 7 * z, period: 1.1, duty: 0.45, col: '#FFF6E0', seed: 9 });
  }

  /** "doyurmaz": the honey pool evaporates into 20 curling golden ribbons that fade by ≈15.6 */
  function drawVapor(ctx, t, g) {
    const z = g.z, fc = g.fc;
    const ribbons = (c, pass) => {
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (let i = 0; i < 20; i++) {
        const t0 = 14.86 + E.hash(i, 91) * 0.24, life = 0.6 + 0.2 * E.hash(i, 92), age = t - t0;
        if (age <= 0 || age > life) continue;
        const an = E.hash(i, 93) * TAU, rr = 34 * Math.sqrt(E.hash(i, 94)), dir = Math.cos(an) * (0.5 + 0.9 * E.hash(i, 95));
        const ox = fc[0] + Math.cos(an) * rr * z, oy = fc[1] + Math.sin(an) * rr * g.s * z;
        const rise = (620 + 380 * E.hash(i, 96)) * z, ph = E.hash(i, 97) * TAU, cu = (26 + 34 * E.hash(i, 98)) * z;
        const P = (u) => [ox + dir * 240 * z * u * u + Math.sin(u * 8 + ph) * cu * Math.min(1, u * 3), oy - rise * u * (1 - 0.3 * u)];
        const k = age / life, tail = Math.min(age, 0.36), al = Math.pow(1 - k, 1.2) * Math.min(1, age * 7);
        let prev = P(age - tail);
        for (let j = 1; j <= 12; j++) {
          const u = age - tail + (tail * j) / 12, q = P(u), w = j / 12;
          if (pass === 0) { c.strokeStyle = E.rgba('#EE9A2E', 0.42 * al * w); c.lineWidth = 13 * z * (0.5 + w) * (1 + k); }
          else { c.strokeStyle = E.rgba('#FFE7A0', 0.9 * al * w); c.lineWidth = 2.6 * z * (0.4 + w); }
          c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(q[0], q[1]); c.stroke(); prev = q;
        }
      }
    };
    E.layer(ctx, (l) => ribbons(l, 0), { lo: true, blur: 7, alpha: 0.95 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ribbons(ctx, 1); ctx.restore();
  }

  /* ------------------------------------------------------------------ light shaft + dust */
  function drawShaft(ctx, t, g, kk, mult = 1) {
    const a = 0.16 * kk * (1 - 0.6 * g.c.crane) * mult;
    if (a < 0.01) return;
    const oy = (g.footY - 1000) * 0.6 - g.c.crane * 200;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= a * (0.9 + 0.1 * Math.sin(t * 0.8));
    ctx.drawImage(SPR.shaft, 0, oy, W, H); ctx.restore();
    // dust motes drifting inside the beam
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 34; i++) {
      const u = (E.hash(i, 71) + t * 0.018 * (0.5 + E.hash(i, 72))) % 1, v = E.hash(i, 73) - 0.5;
      const bx = lerp(1000, 430, u) + v * lerp(150, 330, u) + E.noise(t * 0.3 + i, 74) * 18;
      const by = lerp(0, 1150, u) + oy + E.noise(t * 0.25 + i, 75) * 22;
      if (E.glossActive(t) && by > 1180 && by < 1620) continue;
      const al = a * 3.2 * (0.4 + 0.6 * E.osc(t, 1.7 + E.hash(i, 76) * 2, E.hash(i, 77))) * Math.sin(PI * u);
      S.drawSprite(ctx, SPR.dust, bx, by, 0.25 + 0.35 * E.hash(i, 78), 0, al);
    }
    ctx.restore();
  }
  /** L5 foreground (parallax 1.6) */
  function drawFG(ctx, t, g, mult = 1) {
    const fgy = 1250 + (g.footY - 1000) * 1.6 + g.c.crane * 260 + E.noise(t * 0.2, 91) * 10;
    if (fgy < H && mult > 0.005) { ctx.save(); ctx.globalAlpha *= 0.95 * mult; ctx.drawImage(SPR.fg, -FGP + E.noise(t * 0.17, 92) * 14, fgy); ctx.restore(); }
  }
  /** grade: soft-light #FF8A5C @ 0.08 (+ a touch more once the key is on) */
  function gradeD(ctx, t, mult = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = E.rgba('#FF8A5C', (0.08 + 0.04 * key(t)) * mult); ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  DE.drawShaftD = (ctx, t, g, mult) => drawShaft(ctx, t, g, key(t), mult); DE.drawFGD = drawFG; DE.gradeD = gradeD;
  /** fall speed streaks (world rushing up past the camera) */
  function drawSpeed(ctx, t) {
    if (t > T.land) return;
    const v = Math.abs(scrollY(t + 0.01) - scrollY(t)) / 0.01; if (v < 60) return;
    const k = cl(v / 1300), band = E.glossActive(t);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const x = 40 + E.hash(i, 81) * 1000, len = (60 + 140 * E.hash(i, 82)) * k;
      const y = ((E.hash(i, 83) * 2200 - scrollY(t) * (0.8 + 0.9 * E.hash(i, 84))) % 2200 + 2200) % 2200 - 140;
      if (band && y > 1150 && y < 1640) continue;
      if (Math.abs(x - 540) < 70 && y > 700 && y < 1000) continue;
      const al = (0.05 + 0.1 * E.hash(i, 85)) * k;
      ctx.strokeStyle = E.lin(ctx, 0, y, 0, y + len, [[0, '#FFD7B0', 0], [0.5, '#FFD7B0', al], [1, '#FFD7B0', 0]]);
      ctx.lineWidth = 1.5 + 2.5 * E.hash(i, 86); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ main */
  function drawD(ctx, t) {
    const c = camD(t), g = bowlGeo(c), kk = key(t);
    drawStage(ctx, t, g);
    // the bowl (plus its own glossy reflection)
    drawBowl(ctx, t, g);
    // pre-key darkness: the room is lit only by the falling honey drop until "Sana"
    const dark = 0.30 * (1 - pp(t, 11.97, 12.6, 'inOutSine'));
    if (dark > 0.005) { ctx.fillStyle = `rgba(16,6,22,${dark.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    drawPoolLife(ctx, t, g);
    // hollow rings after "doyurmaz" (run out from the floor to the rim)
    if (t > 14.9 && t < 15.9) {
      ctx.save();
      for (let k = 0; k < 3; k++) {
        const u = (t - 14.92 - k * 0.2) / 0.75; if (u <= 0 || u >= 1) continue;
        const q = 0.06 + 0.92 * ease.outQuad(u), al = Math.sin(PI * u);
        ctx.beginPath(); ctx.ellipse(g.x, g.rimY + g.yo * (1 - q * q) * g.z, q * g.irx * g.z, Math.max(0.5, q * g.iry * g.z), 0, 0, TAU);
        ctx.strokeStyle = E.rgba('#3A2E5C', 0.13 * al); ctx.lineWidth = 16 * g.z; ctx.stroke();
        ctx.strokeStyle = E.rgba('#3A2E5C', 0.42 * al); ctx.lineWidth = (2.6 - 0.5 * k) * g.z; ctx.stroke();
      }
      ctx.restore();
    }
    // evaporation wisps
    if (t > 14.86 && t < 15.8) drawVapor(ctx, t, g);
    drawSplash(ctx, t, g);
    drawMotes(ctx, t, g);
    // the falling drop (locked at (540,880) until it lands)
    if (t < T.land + 0.03) {
      const k = pp(t, 11.5, 11.8, 'linear');
      const v = Math.abs(scrollY(t + 0.01) - scrollY(t)) / 0.01;
      const sqz = t > T.land - 0.02 ? ease.inQuad(cl((t - (T.land - 0.02)) / 0.05)) : 0;
      const dx = (c.x - 540) * pp(t, 11.8, T.land, 'inOutSine'), dy = 0;
      // fall trail
      if (v > 50) { // soft motion-blur streak above the drop
        const L = cl(v / 1300);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * k * L;
        ctx.drawImage(SPR.streak, 540 + dx - 22, 880 - 26 - 190 * (0.5 + 0.5 * L), 44, 190 * (0.5 + 0.5 * L)); ctx.restore();
      }
      // warm glow the drop throws on whatever lies below it
      S.light(ctx, 540 + dx, 900 + dy, 320, '#FFB547', 0.16 * k);
      drawDrop(ctx, 540 + dx, 880 + dy - sqz * 10, 26, { k, t, sq: sqz * 0.9, alpha: 1 - sqz, wob: k });
    }
    drawShaft(ctx, t, g, kk);
    drawSpeed(ctx, t);
    drawFG(ctx, t, g);
    gradeD(ctx, t);
    // band guard while the 'acı' gloss is up: soft feathered darkening (no box)
    const bg = 1 - pp(t, 12.1, 12.5, 'inOutSine');
    if (bg > 0.01 && E.glossActive(t)) {
      ctx.save(); ctx.translate(540, 1400); ctx.scale(1, 0.36);
      ctx.fillStyle = E.rad(ctx, 0, 0, 0, 640, [[0, '#080612', 0.24 * bg], [0.7, '#080612', 0.12 * bg], [1, '#080612', 0]]);
      ctx.fillRect(-640, -640, 1280, 1280); ctx.restore();
    }
  }
  DE.drawD = drawD;

  E.scene({
    id: 'D_tatma', t0: 11.5, t1: 16.3,
    async setup() {
      SPR = {
        niche: makeNiche(), fg: makeFG(), shaft: makeShaft(), streak: makeStreak(),
        mote: makeGlow(24, '#FFC46A', '#FFF6D8'), dust: makeGlow(14, '#FFC9A0', '#FFF0DC'),
        bokA: makeBokeh(46, '#FFB27A'), bokR: makeBokeh(34, '#E8728A'),
      };
      DE.SPR_D = SPR;
    },
    post: (t) => ({
      bloom: 0.42 + 0.3 * E.env(t, 12.22, 12.9, 0.05, 0.5) + 0.12 * E.env(t, 13.7, 14.4, 0.2, 0.3),
      vignette: 0.36, grain: 0.06,
    }),
    draw(ctx, t) {
      t = cl(t, 11.5, 16.3);
      if (t >= T.morph && DE.drawE) return DE.drawE(ctx, t);
      drawD(ctx, t);
    },
  });
})();
