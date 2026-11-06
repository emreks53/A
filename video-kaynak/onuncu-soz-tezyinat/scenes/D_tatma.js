/* =====================================================================================
 * D_tatma · 11.50–16.30 · "Sana tattırır, iştihanı açar, fakat doyurmaz."
 * -------------------------------------------------------------------------------------
 * PLAN (1080×1920 · hero zone y192–1152 · gloss 'acı' visible until ≈12.47 → band calm/dark)
 *  Layers, back → front
 *   L0  plum wall #2A1633→#4A2346→#6E3448 (lerps in from C's night 11.50–11.80) + warm key
 *       blob from the right #FF9D5C (ramps at "Sana")
 *   L1  far bokeh (two distant warm lamps), parallax 0.35
 *   L2  warm plum wall with a glazed çini dado and soft drapery at the sides (no arch / niche),
 *       pre-blurred sprite (depth of field) + its mirror in the glossy çini floor
 *   L3  HERO: Iznik bowl (A.iznikBowl), honey drop / splash / pool, craving motes, wisps
 *   L4  light shaft from the upper right + dust in it ('lighter')
 *   L5  foreground: blurred dark vessel rim + honey bokeh, parallax 1.6
 *  Camera: the fall (drop locked at (540,880), world scrolls up ~1100 px/s, decelerates)
 *   → lands 12.27 + spring overshoot 12 px + tiny shake → slow push 12.6–13.3 → crane up
 *   13.30–14.30 (ry 110→200; the widening bowl itself grows ×1.27 so camera zoom stays ≈1 and
 *   the rim stays inside the frame; reflection fades, floor petals rise into view) → pull back + crane down
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
    if (t < T.land) return herm(530, -1100, 140, -160, T.land - 11.8, (t - 11.8) / (T.land - 11.8));
    const tau = t - T.land; // settle + a small impact bounce
    return 140 * (1 - E.smoother(tau / 0.85)) - 10 * Math.sin(tau * 16) * Math.exp(-tau * 7);
  }
  function camD(t) {
    const sy = scrollY(t);
    const cIn = pp(t, 13.30, 14.30, 'inOutCubic'), cOut = pp(t, 15.0, 16.0, 'inOutCubic');
    const crane = cIn * (1 - cOut);
    // after the landing the camera dollies in on the bowl (pivot = the drop, so nothing before 12.12 changes)
    const Zd = lerp(1, 1.3, pp(t, 12.12, 13.05, 'inOutSine')) * (1 + 0.025 * pp(t, 13.0, 13.3, 'inOutSine'));
    const z = lerp(lerp(Zd, 1.07, cIn), 0.945, cOut);
    const tilt = 0.105 * ease.outBack(pp(t, 11.95, 12.45, 'linear'), 1.3) * (1 - cOut);
    const widen = pp(t, 13.70, 14.22, 'inOutCubic');
    const bump = 1 + 0.03 * Math.sin(PI * cl((t - 13.92) / 0.42)) * (t > 13.92 ? 1 : 0);
    const dr = E.drift(t, 4, 0.3, 11);
    const sh = t > T.land ? Math.exp(-(t - T.land) * 11) : 0;
    const shx = E.noise(t * 38, 5) * 4 * sh, shy = E.noise(t * 41, 6) * 3 * sh;
    const fcFall = 880 + (850 + sy + dr.y + shy - 880) * Zd + 64 * pp(t, 12.3, 13.05, 'inOutSine');
    // crane: pool near frame centre · morph: bowl foot exactly on E's hourglass neck (540,1000)
    const fcY = lerp(lerp(fcFall, 1000 + dr.y, cIn), 795.7 + dr.y, cOut);
    return { sy, crane, z: z * bump, tilt, widen, fcY, x: 540 + dr.x + shx, cOut };
  }
  /** bowl geometry on screen (mirrors A.iznikBowl's internal maths) */
  function bowlGeo(c) {
    const rx = 330 * (1 + 0.27 * c.widen);
    const ry0 = (110 + 120 * c.crane) * (1 + 0.27 * c.widen);
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
  // wall sprite (no arch): glazed çini dado + soft drapery at the sides; local x = screen x at zoom 1, floor line y = 0
  const WS = { x0: -340, w: 1760, top: 2100, bot: 520 }; // tall enough to cover the whole fall (wall line ≤ y1750)
  function makeWall() {
    if (!TILE) TILE = makeTile();
    const art = E.canvas(WS.w, WS.top), a = art.x;
    a.translate(-WS.x0, WS.top);
    // dado of glazed tiles under a dark plum glaze, with a cobalt moulding on top
    const pat = a.createPattern(TILE[0], 'repeat'); pat.setTransform(new DOMMatrix([150 / 256, 0, 0, 150 / 256, 0, -20]));
    a.fillStyle = pat; a.fillRect(WS.x0, -320, WS.w, 320);
    a.fillStyle = E.lin(a, 0, -320, 0, 0, [[0, '#2A1232', 0.62], [1, '#1A0A20', 0.72]]); a.fillRect(WS.x0, -320, WS.w, 320);
    a.fillStyle = 'rgba(28,54,104,0.75)'; a.fillRect(WS.x0, -346, WS.w, 26);
    a.fillStyle = 'rgba(255,196,150,0.22)'; a.fillRect(WS.x0, -348, WS.w, 2.5);
    a.fillStyle = 'rgba(10,4,14,0.35)'; a.fillRect(WS.x0, -320, WS.w, 6);
    // soft drapery framing both sides (vertical folds)
    const fold = (x0, x1, n, flip) => {
      for (let k = 0; k < n; k++) {
        const fx0 = lerp(x0, x1, k / n), fx1 = lerp(x0, x1, (k + 1) / n), dk = flip ? (n - k) / n : (k + 1) / n;
        a.fillStyle = E.lin(a, fx0, 0, fx1, 0, [[0, '#1E0A24', 0.9], [0.45, E.mix('#3A1638', '#6A2E4C', dk * 0.8), 0.9], [1, '#1E0A24', 0.9]]);
        a.fillRect(fx0, -WS.top, fx1 - fx0 + 1, WS.top);
      }
    };
    fold(WS.x0, 230, 6, false); fold(850, WS.x0 + WS.w, 6, true);
    a.globalCompositeOperation = 'destination-out'; // feather the very top (never a hard edge)
    a.fillStyle = E.lin(a, 0, -WS.top, 0, -WS.top + 320, [[0, '#000', 1], [1, '#000', 0]]); a.fillRect(WS.x0, -WS.top, WS.w, 320);
    a.globalCompositeOperation = 'source-over';
    const spr = E.canvas(WS.w, WS.top + WS.bot), sx = spr.x;
    sx.filter = 'blur(2.5px)'; sx.drawImage(art.c, 0, 0); sx.filter = 'none';
    sx.save(); sx.translate(0, WS.top * 2); sx.scale(1, -1); sx.globalAlpha = 0.3; sx.filter = 'blur(8px)'; sx.drawImage(art.c, 0, 0); sx.restore();
    sx.globalCompositeOperation = 'destination-out';
    sx.fillStyle = E.lin(sx, 0, WS.top, 0, WS.top + WS.bot, [[0, '#000', 0], [0.55, '#000', 0.75], [1, '#000', 1]]); sx.fillRect(0, WS.top, WS.w, WS.bot);
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
    x.translate(FGP, 0); x.filter = 'blur(9px)';
    const bk = [[330, 520, 46, 0.22], [420, 610, 28, 0.18], [860, 470, 38, 0.16], [960, 590, 22, 0.2], [120, 420, 34, 0.14], [640, 700, 52, 0.12]];
    for (const [bx, by, br, ba] of bk) { x.fillStyle = E.rad(x, bx, by, 0, br, [[0, '#FFB547', ba * 0.6], [0.85, '#FFB547', ba], [1, '#FFB547', 0]]); x.beginPath(); x.arc(bx, by, br, 0, TAU); x.fill(); }
    // fallen rose petals lying on the gloss near the lens (C callback), out of focus, with faint mirror
    const PET = [[150, 620, 160, 0.4, 0.55, 8], [380, 720, 125, -0.6, 0.7, 10], [790, 650, 145, 2.3, 0.6, 8], [960, 540, 105, 1.2, 0.75, 6], [560, 590, 90, 3.6, 0.5, 5]];
    for (const [px, py, pr, rot, wl, bl] of PET) {
      x.save(); x.filter = `blur(${bl}px)`; x.translate(px, py); x.scale(1, 0.55);
      x.globalAlpha = 0.85; A.heroPetal(x, { R: pr, rot, wilt: wl, t: 0 });
      x.restore();
      x.save(); x.filter = `blur(${bl + 5}px)`; x.translate(px, py + pr * 0.32); x.scale(1, -0.3); x.globalAlpha = 0.22; A.heroPetal(x, { R: pr, rot, wilt: wl, t: 0 }); x.restore();
    }
    return c.c;
  }
  function makeShaft() { // soft diagonal light beam, lo-res; covers screen x −200..1700, y −700..1900
    const c = E.canvas(950, 1300), x = c.x;
    x.scale(0.5, 0.5); x.translate(200, 700); x.filter = 'blur(36px)';
    const g = x.createLinearGradient(1400, -700, 480, 1200);
    g.addColorStop(0, 'rgba(255,170,110,0.9)'); g.addColorStop(0.45, 'rgba(255,165,105,0.7)'); g.addColorStop(0.8, 'rgba(255,160,100,0.25)'); g.addColorStop(1, 'rgba(255,160,100,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(1250, -760); x.lineTo(1580, -760); x.lineTo(660, 1200); x.lineTo(300, 1200); x.closePath(); x.fill();
    return c.c;
  }


  /* ------------------------------------------------------------------ glazed çini floor (shared with E)
   * Exact perspective via thin horizontal bands, each filled with the repeating tile pattern under a
   * band-local affine (u scale = F/Z, v scale = dy/dZ). Depth of field = pre-blurred pattern variants. */
  const FL = { F: 1400, back: 380 };
  const TS = 256; let TILE = null;
  function makeTile() {
    const c = E.canvas(TS, TS), x = c.x, S = TS, q = S / 2;
    x.fillStyle = '#F4EEE2'; x.fillRect(0, 0, S, S);
    const petal = (cx, cy, r, n, w, col, rot = 0) => { x.fillStyle = col; for (let k = 0; k < n; k++) { const a = rot + (k / n) * TAU; x.beginPath(); x.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.5, r * w, a, 0, TAU); x.fill(); } };
    for (const [cx, cy] of [[0, 0], [S, 0], [0, S], [S, S]]) { petal(cx, cy, S * 0.2, 8, 0.2, '#2A9A8E', PI / 8); x.fillStyle = '#D9473A'; x.beginPath(); x.arc(cx, cy, S * 0.06, 0, TAU); x.fill(); }
    // saz leaves on the diagonals
    for (let k = 0; k < 4; k++) { const a = PI / 4 + (k * PI) / 2; x.save(); x.translate(q + Math.cos(a) * S * 0.3, q + Math.sin(a) * S * 0.3); x.rotate(a); x.fillStyle = '#4FA3E0'; x.beginPath(); x.ellipse(0, 0, S * 0.11, S * 0.035, 0, 0, TAU); x.fill(); x.restore(); }
    petal(q, q, S * 0.3, 8, 0.17, '#1F5FA8'); petal(q, q, S * 0.17, 8, 0.2, '#3CC6C0', PI / 8);
    x.fillStyle = '#D9473A'; x.beginPath(); x.arc(q, q, S * 0.06, 0, TAU); x.fill();
    x.strokeStyle = '#1F5FA8'; x.lineWidth = S * 0.018; x.strokeRect(S * 0.05, S * 0.05, S * 0.9, S * 0.9);
    x.strokeStyle = '#6A5A62'; x.lineWidth = 3; x.strokeRect(0, 0, S, S);
    const out = [c.c];
    for (const bl of [4, 10]) { // seamless blur: blur a 3×3 mosaic, keep the centre
      const m = E.canvas(S * 3, S * 3); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m.x.drawImage(c.c, i * S, j * S);
      const o = E.canvas(S, S); o.x.filter = `blur(${bl}px)`; o.x.drawImage(m.c, -S, -S); out.push(o.c);
    }
    return out;
  }
  const patCache = new WeakMap();
  DE.tileFloor = (ctx, o) => {
    if (!TILE) TILE = makeTile();
    let pats = patCache.get(ctx); if (!pats) { pats = TILE.map((c) => ctx.createPattern(c, 'repeat')); patCache.set(ctx, pats); }
    const band = o.band || 5; // draws OPAQUE (crossfades between blur variants); fade it with a layer
    ctx.save();
    for (let y = o.y0; y < o.y1; y += band) {
      const yc = y + band / 2; if (yc <= o.hzT + 1) continue;
      const Z = (o.F * o.hc) / (yc - o.hzT), a = (o.F / Z) * (o.T / TS), d = ((o.F * o.hc) / (Z * Z)) * (o.T / TS);
      const e = o.cx - (o.xo * o.F) / Z, vc = ((o.zo - Z) * TS) / o.T, f = yc - d * vc;
      const b = o.blur ? cl(o.blur(yc), 0, 2) : 0, b0 = Math.min(1, Math.floor(b)), w = b - b0;
      for (const [k, al] of [[b0, 1], [b0 + 1, w]]) {
        if (al < 0.01) continue;
        const p = pats[k]; p.setTransform(new DOMMatrix([a, 0, 0, d, e, f]));
        ctx.globalAlpha = al; ctx.fillStyle = p; ctx.fillRect(o.x0, y, o.x1 - o.x0, band + 0.75);
      }
    }
    ctx.restore();
  };

  /* ------------------------------------------------------------------ drop */
  const silCache = new Map();
  const tearSil = (r) => { const k = Math.round(r * 4) / 4; let s = silCache.get('t' + k); if (!s) { s = A.teardropSilhouette(k); silCache.set('t' + k, s); } return s; };
  let ROUND = null;
  const roundSil = (r) => { if (!ROUND) { ROUND = A.resample(A.circlePts(1, 128).map(([x, y]) => [x, y * 1.08 + (y < 0 ? y * y * -0.35 : 0) + 0.12]), 128); } return ROUND.map(([x, y]) => [x * r * 1.02, y * r]); };
  let PETAL = null;
  function petalSil() { // C's hero petal, roughly as it reaches the warm light (tilted, ≈110 px)
    if (!PETAL) { const P = A.petalSilhouette(92), ca = Math.cos(-0.55), sa = Math.sin(-0.55); PETAL = A.resample(P.map(([x, y]) => [x * ca - y * sa, x * sa + y * ca]), 128); }
    return PETAL;
  }
  /** honey drop (point up). k: 0 = still C's petal colour/shape, 1 = drop. sq: squash (+ wide) */
  function drawDrop(ctx, x, y, r, o = {}) {
    const k = o.k === undefined ? 1 : o.k, t = o.t || 0, sq = o.sq || 0, a = o.alpha === undefined ? 1 : o.alpha, hk = o.honey || 0, st = o.stretch || 0;
    let pts = k >= 1 ? tearSil(r) : A.lerpShape(petalSil(), tearSil(r), A.morphEase(k));
    if (hk > 0.001) pts = A.lerpShape(pts, roundSil(r), 0.55 * hk); // honey: a heavy rounded drop, not a flame
    const wob = 0.045 * Math.sin(t * TAU * 5.5) * (o.wob === undefined ? 1 : o.wob);
    const sx = (1 + wob) * (1 + sq) * (1 - 0.07 * st), syy = (1 - wob) / (1 + sq * 0.8) * (1 + 0.18 * st);
    ctx.save(); ctx.globalAlpha *= a;
    S.light(ctx, x, y + r * 0.2, r * (5.2 - 2.4 * hk), '#FFB547', (0.30 * k + 0.08) * (1 - 0.8 * hk));
    ctx.translate(x, y); ctx.scale(sx, syy);
    // C's petal→drop colours, then thick amber honey: dark core, light transmitted at the rim
    const c0 = E.mix(E.mix('#FFD1DC', '#FFF1C0', k), '#A04A0C', hk), c1 = E.mix(E.mix('#F7A3B5', PAL.honeyHi, k), '#D27A1C', hk);
    const c2 = E.mix(E.mix('#F28BA0', PAL.honey, k), '#F0A63E', hk), c3 = E.mix(E.mix('#C2185B', '#D07A16', k), '#FFD27A', hk);
    ctx.fillStyle = E.rad(ctx, -r * 0.28 * (1 - hk), r * 0.25, 0, r * 1.7 - r * 0.35 * hk, [[0, c0], [0.32, c1], [0.68, c2], [1, c3]]);
    A.fillShape(ctx, pts);
    // inner glow (honey is translucent, lit from within by the key)
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = E.rad(ctx, r * 0.1, r * 0.35, 0, r * 0.9, [[0, PAL.honeyHi, 0.55 * k * (1 - 0.75 * hk)], [1, PAL.honeyHi, 0]]);
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
    const hzOld = 1000 + (g.footY - 1000) * 0.85 - c.crane * 330 * g.z - 6 * zp;
    const Zc = FL.F / g.z, hzP = g.footY - FL.F * g.s * FL.back / (Zc + FL.back); // ledge back edge, true perspective
    const hz = lerp(hzOld, hzP, pp(t, 12.12, 12.9, 'inOutSine'));
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
    // wall: çini dado + drapery (sprite: floor line at sprite y = WS.top)
    ctx.save(); ctx.translate(g.x, hz); ctx.scale(zp, zp);
    ctx.globalAlpha *= lerp(0.35, 1, nk) * lerp(0.75, 1, kk);
    ctx.drawImage(SPR.wall, WS.x0 - 540, -WS.top);
    ctx.restore();
    // ledge / glossy floor below the horizon
    ctx.fillStyle = E.lin(ctx, 0, hz, 0, hz + 700, [[0, '#2B1431', 0.85], [0.12, PAL.floor, 0.9], [1, '#0E0714', 0.96]]);
    ctx.fillRect(0, hz, W, H - hz + 2);
    // glazed çini platform in perspective (revealed by the key light), blurred toward the lens
    const ta = pp(t, 11.97, 12.5, 'inOutSine');
    if (ta > 0.01) {
      E.layer(ctx, (l) => {
        l.beginPath(); l.rect(0, hz, W, H - hz); l.clip();
        DE.tileFloor(l, { cx: g.x, hzT: g.footY - FL.F * g.s, F: FL.F, hc: g.s * Zc, y0: Math.floor(hz), y1: H, T: 140, xo: 70, zo: Zc + 70,
          x0: 0, x1: W, band: 5, blur: (y) => cl((y - g.footY - 260) / 300, 0, 2) });
      }, { alpha: 0.2 * ta });
      ctx.save(); ctx.beginPath(); ctx.rect(0, hz, W, H - hz); ctx.clip();
      // dark plum glaze: deeper toward the lens and the sides, so the tiles stay a whisper under the gloss
      ctx.fillStyle = E.lin(ctx, 0, hz, 0, H, [[0, '#2B1431', 0.55], [0.35, '#1C1024', 0.28], [1, '#0E0714', 0.55]]); ctx.fillRect(0, hz, W, H - hz);
      ctx.fillStyle = E.lin(ctx, 0, 0, W, 0, [[0, '#0E0714', 0.5], [0.3, '#0E0714', 0], [0.7, '#0E0714', 0], [1, '#0E0714', 0.35]]); ctx.fillRect(0, hz, W, H - hz);
      ctx.restore();
    }
    ctx.save(); ctx.translate(g.x, hz); ctx.scale(zp, zp); ctx.globalAlpha *= 0.85 * lerp(0.5, 1, kk);
    ctx.drawImage(SPR.wall, 0, WS.top, WS.w, WS.bot, WS.x0 - 540, 0, WS.w, WS.bot); ctx.restore();
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
    a0: E.hash(i, 301) * TAU, q0: 0.95 + 0.5 * E.hash(i, 302), h0: 40 + 170 * E.hash(i, 303), w: 0.35 + 0.25 * E.hash(i, 304),
    ta: 13.22 + 1.0 * E.hash(i, 305), dur: 1.2 + 0.5 * E.hash(i, 308), sz: 0.55 + 0.5 * E.hash(i, 306), tw: E.hash(i, 307),
  });
  DE.MOTES = MOTES;
  const tauEff = (t) => (t < 14.52 ? t - 13.22 : 1.30 + 0.14 * (cl((t - 14.52) / 0.14) - 0.5 * cl((t - 14.52) / 0.14) ** 2));
  /** mote i state: floor-local normalised position + height (local px). gather 0..1 pulls into the floor centre */
  function moteState(i, t) {
    const m = MOTES[i], te = tauEff(t) - (m.ta - 13.22);
    if (te <= 0) return null;
    const u = te / m.dur; if (u >= 1) return null; // absorbed by the honey
    const q = lerp(m.q0, 0.04, ease.inOutSine(u)), an = m.a0 - m.w * TAU * u, h = m.h0 * Math.pow(1 - u, 1.6);
    return { px: Math.cos(an) * q, py: Math.sin(an) * q, h, te, u, fade: cl(te / 0.2) * (u > 0.85 ? (1 - u) / 0.15 : 1) };
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
        for (let j = 1; j <= 3; j++) {
          const s2 = moteState(i, t - j * 0.016 * spd); if (!s2) break;
          const q2 = g.map(s2.px, s2.py, s2.h), k = 1 - j / 4;
          ctx.strokeStyle = E.rgba('#FFD27A', 0.2 * a * k); ctx.lineWidth = 9 * m.sz * g.z * k + 0.5;
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q2[0], q2[1]); ctx.stroke(); prev = q2;
        }
      }
      S.drawSprite(ctx, SPR.mote, x, y, m.sz * g.z * 0.85, 0, a);
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
    const evap = pp(t, 14.88, 15.3, 'inOutSine');
    return 40 * grow * (1 - evap) + (grow > 0 && evap < 1 ? 1.4 * Math.sin(t * 7.3) * (1 - evap) : 0);
  }
  function bowlOpts(t, c) {
    const lit = 1 - pp(t, 14.88, 15.45, 'inOutSine');
    return {
      t, rx: 330, ry: 110 + 120 * c.crane, depth: 220, tilt: c.tilt, widen: c.widen,
      lit, litRadius: 120 * pp(t, T.land, T.land + 0.75, 'outCubic'),
      dim: 0.5 * pp(t, 14.88, 15.5), honey: Math.max(0, honeyR(t)), reflection: true, rimCol: '#B9A6FF',
    };
  }
  /** bowl + its reflection. veil: darken the bowl only (pre-key); the reflection fades while craning */
  function drawBowl(ctx, t, g, extra) {
    const o = Object.assign(bowlOpts(t, g.c), extra || {});
    const veil = (extra && extra.veil !== undefined) ? extra.veil : lerp(0.72, 0.38, pp(t, 11.6, 11.95)) * (1 - pp(t, 11.97, 12.5, 'inOutSine'));
    const rf = 0; // keep the glossy reflection through the crane
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
        const rise = (420 + 240 * E.hash(i, 96)) * z, ph = E.hash(i, 97) * TAU, cu = (20 + 24 * E.hash(i, 98)) * z;
        const P = (u) => [ox + dir * 420 * z * u + Math.sin(u * 8 + ph) * cu * Math.min(1, u * 3), oy - rise * u * (1 - 0.3 * u)];
        const k = age / life, tail = Math.min(age, 0.36), al = Math.pow(1 - k, 1.2) * Math.min(1, age * 7);
        let prev = P(age - tail);
        for (let j = 1; j <= 12; j++) {
          const u = age - tail + (tail * j) / 12, q = P(u), w = j / 12;
          if (pass === 0) { c.strokeStyle = E.rgba('#FFF0CC', 0.2 * al * w); c.lineWidth = 26 * z * (0.5 + w) * (1 + 1.5 * k); }
          else { c.strokeStyle = E.rgba('#FFF4DC', 0.12 * al * w); c.lineWidth = 3 * z * (0.4 + w); }
          c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(q[0], q[1]); c.stroke(); prev = q;
        }
      }
    };
    E.layer(ctx, (l) => ribbons(l, 0), { lo: true, blur: 14, alpha: 0.9, op: 'screen' });
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ribbons(ctx, 1); ctx.restore();
  }

  /* ------------------------------------------------------------------ light shaft + dust */
  function drawShaft(ctx, t, g, kk, mult = 1) {
    const a = 0.16 * kk * (1 - 0.6 * g.c.crane) * mult;
    if (a < 0.01) return;
    const oy = (g.footY - 1000) * 0.6 - g.c.crane * 200;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= a * (0.9 + 0.1 * Math.sin(t * 0.8));
    ctx.drawImage(SPR.shaft, -200, oy - 700, 1900, 2600); ctx.restore();
    // dust motes drifting inside the beam
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 34; i++) {
      const u = (E.hash(i, 71) + t * 0.018 * (0.5 + E.hash(i, 72))) % 1, v = E.hash(i, 73) - 0.5;
      const bx = lerp(1000, 430, u) + v * lerp(150, 330, u) + E.noise(t * 0.3 + i, 74) * 18;
      const by = lerp(0, 1150, u) + oy + E.noise(t * 0.25 + i, 75) * 22;
      const bgk = by > 1180 && by < 1620 ? 1 - 0.85 * bandG(t) : 1;
      const al = bgk * a * 3.2 * (0.4 + 0.6 * E.osc(t, 1.7 + E.hash(i, 76) * 2, E.hash(i, 77))) * Math.sin(PI * u);
      S.drawSprite(ctx, SPR.dust, bx, by, 0.25 + 0.35 * E.hash(i, 78), 0, al);
    }
    ctx.restore();
  }
  /** L5 foreground (parallax 1.6) */
  function drawFG(ctx, t, g, mult = 1) {
    const fgy = 1250 + g.c.sy * 1.6 - 110 * pp(t, 12.3, 13.05, 'inOutSine') - g.c.crane * 300 + 40 * g.c.cOut + E.noise(t * 0.2, 91) * 10;
    if (fgy < H && mult > 0.005) { ctx.save(); ctx.globalAlpha *= 0.95 * mult; ctx.drawImage(SPR.fg, -FGP + E.noise(t * 0.17, 92) * 14, fgy); ctx.restore(); }
  }
  /** grade: soft-light #FF8A5C @ 0.08 (+ a touch more once the key is on) */
  function gradeD(ctx, t, mult = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = E.rgba('#FF8A5C', (0.08 + 0.04 * key(t)) * mult); ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  DE.drawShaftD = (ctx, t, g, mult) => drawShaft(ctx, t, g, key(t), mult); DE.drawFGD = drawFG; DE.gradeD = gradeD;
  /** fall: soft round warm motes rising past the camera (no thin lines) */
  function drawFallMotes(ctx, t) {
    if (t > T.land + 0.35) return;
    const v = Math.abs(scrollY(t + 0.01) - scrollY(t)) / 0.01, k = cl(v / 1100) * (1 - pp(t, T.land, T.land + 0.35));
    if (k < 0.02) return;
    const sy = scrollY(t), bg = bandG(t);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const par = 0.5 + 0.9 * E.hash(i, 81), x = 40 + E.hash(i, 82) * 1000 + E.noise(t * 0.5 + i, 83) * 20;
      const y = ((E.hash(i, 84) * 2300 + sy * par) % 2300 + 2300) % 2300 - 190;
      if (Math.abs(x - 540) < 70 && y > 760 && y < 1060) continue;
      const ba = y > 1180 && y < 1620 ? 1 - 0.85 * bg : 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 1 + 0.5 * k);
      S.drawSprite(ctx, SPR.dust, 0, 0, 0.6 + 1.0 * E.hash(i, 85), 0, 0.3 * k * ba * (0.5 + 0.5 * E.hash(i, 86)));
      ctx.restore();
    }
    ctx.restore();
  }
  /** smooth band-guard envelope (0..1) around every gloss cue */
  const bandG = (t) => { let g = 0; if (window.TIMING) for (const q of TIMING.glosses) g = Math.max(g, Math.min(pp(t, q.in - 0.35, q.in - 0.1, 'inOutSine'), 1 - pp(t, q.out + 0.35, q.out + 0.6, 'inOutSine'))); return g; };

  /* ------------------------------------------------------------------ main */
  function drawD(ctx, t) {
    const c = camD(t), g = bowlGeo(c), kk = key(t);
    drawStage(ctx, t, g);
    // the bowl (plus its own glossy reflection)
    drawBowl(ctx, t, g);
    // pre-key darkness: the room is lit only by the falling honey drop until "Sana"
    const dark = lerp(0.30, 0.1, pp(t, 11.6, 11.95)) * (1 - pp(t, 11.97, 12.6, 'inOutSine'));
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
    // the falling drop: locked at (540,880) through C's handoff, then it visibly falls into the bowl
    if (t < T.land + 0.03) {
      const k = pp(t, 11.5, 11.8, 'linear'), hk = pp(t, 11.6, 11.95, 'inOutSine'), uf = pp(t, 11.8, T.land, 'linear');
      const yLand = camD(T.land).fcY, yd = lerp(880, yLand, ease.inQuad(uf));
      const sqz = t > T.land - 0.02 ? ease.inQuad(cl((t - (T.land - 0.02)) / 0.05)) : 0;
      const dx = (c.x - 540) * pp(t, 11.8, T.land, 'inOutSine') + 5 * Math.sin(t * 5.2) * hk * (1 - uf);
      S.light(ctx, 540 + dx, yd + 20, 320, '#FFB547', 0.16 * k * (1 - hk));
      drawDrop(ctx, 540 + dx, yd - sqz * 10, 26, { k, t, sq: sqz * 0.9, alpha: 1 - sqz, wob: k, honey: hk, stretch: hk * (0.45 + 0.55 * uf) });
    }
    drawShaft(ctx, t, g, kk);
    drawFallMotes(ctx, t);
    drawFG(ctx, t, g);
    gradeD(ctx, t);
    // band guard while the 'acı' gloss is up: soft feathered darkening (no box)
    const bg = bandG(t);
    if (bg > 0.01) {
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
        wall: makeWall(), fg: makeFG(), shaft: makeShaft(),
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
