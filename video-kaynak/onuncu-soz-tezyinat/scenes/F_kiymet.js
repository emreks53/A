/* =============================================================================
 * F_kiymet · 22.30–28.70 · "Demek kıymeti yüksek, müddeti kısa olan şu tezyinat; ibret içindir,"
 * -----------------------------------------------------------------------------
 * PLAN (hero coords = screen px at zoom 1; RC = gem-rose visual centre, x 540)
 *  L0  violet gradient #160F38→#34206B→#5E2C86 + soft key blob behind RC (screen space)
 *  L1  far girih "treasury dome" (pre-blurred sprite, p .25, slow spin, screen-blend .1) + far bokeh (p .3)
 *  L2  top spotlight cone #FFE9A8 · 12 god rays around RC · gold octagram + lens ring (p 1)
 *  L3  HERO: gold plinth (sprite) · ember→hex ruby→gem HeroRose R180 → ruby 8-blade iris · life-ring ·
 *      8 star-tile jewel medallions on an orbit
 *  L4  facet glints, ruby shed, fuse sparks · L5 near bokeh (p 1.6, big + soft)
 *  Camera: tilt-up parallax on the lift (bg moves down 150·p), push 1→1.08, dive z 1.08→12 with roll 8°.
 *  22.30 ember follows E's exact path (≈(602,755) → (540,760) by 22.47), r 27→34, circle→hexagon with E's
 *        facet shading, orange→ruby (E handoff: (540,760) r34, BG ≈60%)
 *  22.88 flash + shock ring; the 6 hex facets fly apart and the gem HeroRose R180 unfolds (outBack)
 *  23.40 gold plinth rises from below the frame, contact bounce at 23.8
 *  23.90 lift RC 760→600 (inOutCubic + tiny overshoot) · god rays + spotlight bloom in
 *  24.72 golden life-ring r300 draws clockwise · 25.22 burns 360°→50° with an ember head + sparks,
 *        ruby facets shed from the petal tips · 25.62 settle, remnant fades
 *  26.03 8 medallions pop (0.06 s stagger) from the rose to orbit r350 (0.06 rad/s) + gold octagram
 *  27.05 orbit accelerates and tightens into a bright lens ring; the gem rose swells, spins and (behind a
 *        sparkle) becomes an 8-petal ruby iris whose blades rotate open on ivory light with the footnote star
 *        geometry glimpsed inside · 27.15–28.40 dive (inCubic → outExpo), roll +8°
 *  27.45–28.00 16-wedge kaleidoscope (mirrored), masked to a soft circle r≈520 @ (540,760)
 *  27.90–28.30 ivory flood from the centre (band last) → 28.15 parchment fibres + footnote Star8 r40 @
 *        (540,760), open 0 (G handoff; parchment/star code is identical in G_hasiye.js)
 *  Gloss 26.09–27.93: band kept violet/dark, near bokeh dimmed, soft feathered scrim ≤0.2.
 * ========================================================================== */
(function () {
  'use strict';
  const W = E.W, H = E.H, TAU = Math.PI * 2, PI = Math.PI;
  const clamp = E.clamp, lerp = E.lerp, sm = E.smooth, ez = E.ease;
  const P = (t, a, b, e) => E.p(t, a, b, e || 'inOutCubic');
  const T0 = 22.3, T1 = 28.7, R = 180, CX = 540;
  const SP = {};
  /** pooled layer buffers may carry a stale clip from elsewhere: start every layer from a clean state */
  const fresh = (l, lo) => { if (l.reset) { l.reset(); if (lo) l.setTransform(0.5, 0, 0, 0.5, 0, 0); } };

  /* ======================= shared with G_hasiye (keep identical) ======================= */
  /** A.star8 whose glow respects the caller's globalAlpha (the asset sets glow alpha absolutely) */
  function star8a(ctx, o) { const ga = ctx.globalAlpha; ctx.save(); ctx.globalAlpha = 1; A.star8(ctx, Object.assign({}, o, { alpha: (o.alpha === undefined ? 1 : o.alpha) * ga })); ctx.restore(); }
  function camDrift(t) { return { x: 3 * Math.sin(0.37 * t) + 2 * E.noise(t * 0.3, 41), y: 2 * Math.sin(0.29 * t + 1) + 2 * E.noise(t * 0.3, 43), r: 0.0026 * Math.sin(0.21 * t) }; }
  function makeParchment() {
    const w = 1340, h = 2300, cv = E.canvas(w, h), x = cv.x, rnd = E.rng(9137);
    for (let i = 0; i < 80; i++) {
      const px = rnd() * w, py = rnd() * h, r = 60 + rnd() * 240, light = rnd() < 0.45;
      x.fillStyle = E.rad(x, px, py, 0, r, [[0, light ? '#FFF9EE' : '#E2CCA4', 0.09 + rnd() * 0.08], [1, light ? '#FFF9EE' : '#E2CCA4', 0]]);
      x.fillRect(px - r, py - r, 2 * r, 2 * r);
    }
    x.lineCap = 'round';
    for (let i = 0; i < 1900; i++) {
      const px = rnd() * w, py = rnd() * h, L = 7 + rnd() * 36, a = (rnd() - 0.5) * 1.6 + (rnd() < 0.62 ? 0 : PI / 2), bend = (rnd() - 0.5) * L * 0.6;
      const k = rnd();
      x.strokeStyle = k < 0.72 ? 'rgba(227,211,181,0.32)' : k < 0.92 ? 'rgba(196,172,132,0.16)' : 'rgba(255,252,244,0.5)';
      x.lineWidth = 0.6 + rnd() * 1.1;
      const ca = Math.cos(a), sa = Math.sin(a);
      x.beginPath(); x.moveTo(px - ca * L / 2, py - sa * L / 2); x.quadraticCurveTo(px - sa * bend, py + ca * bend, px + ca * L / 2, py + sa * L / 2); x.stroke();
    }
    // page frame (double rule, like the book's cetvel)
    const ox = (w - 1080) / 2, oy = (h - 1920) / 2;
    x.strokeStyle = 'rgba(168,116,42,0.34)'; x.lineWidth = 1.6; x.strokeRect(ox + 58, oy + 58, 1080 - 116, 1920 - 116);
    x.strokeStyle = 'rgba(168,116,42,0.22)'; x.lineWidth = 0.9; x.strokeRect(ox + 68, oy + 68, 1080 - 136, 1920 - 136);
    // greeked text on its own (fadeable) layer: thin, slightly irregular ink strokes with square ends, softly
    // out of focus; no letters. Main block, a short footnote rule, the footnote lines.
    const tc = E.canvas(w, h), tx = tc.x, gr = E.rng(4417), tx0 = ox + 128, tx1 = ox + 1080 - 128;
    const clear = (gx, gw, gy) => Math.abs(gy - (oy + 760)) < 104 && gx < ox + 690 && gx + gw > ox + 390;
    tx.lineCap = 'butt';
    const line = (gy, lw, al, endF, indent) => {
      let gx = tx0 + (indent ? 46 : 0); const end = tx0 + (tx1 - tx0) * endF;
      while (gx < end - 8) {
        const gw = Math.min(end - gx, gr() < 0.25 ? 10 + gr() * 18 : 26 + gr() * 80);
        if (gw > 5 && !clear(gx, gw, gy)) {
          tx.strokeStyle = `rgba(78,56,40,${(al * (0.7 + 0.5 * gr())).toFixed(3)})`; tx.lineWidth = lw * (0.75 + 0.5 * gr());
          const j0 = (gr() - 0.5) * 1.6, j1 = (gr() - 0.5) * 1.6, jm = (gr() - 0.5) * 1.4;
          tx.beginPath(); tx.moveTo(gx, gy + j0); tx.quadraticCurveTo(gx + gw / 2, gy + jm, gx + gw, gy + j1); tx.stroke();
        }
        gx += gw + 8 + gr() * 6;
      }
    };
    let para = 0;
    for (let gy = oy + 156; gy <= oy + 1136; gy += 43) {
      const last = para > 4 + gr() * 4; line(gy, 3.2, 0.12, last ? 0.3 + 0.45 * gr() : 1, para === 0); para = last ? 0 : para + 1;
    }
    tx.strokeStyle = 'rgba(90,42,47,0.2)'; tx.lineWidth = 1; tx.beginPath(); tx.moveTo(tx0, oy + 1180); tx.lineTo(tx0 + 250, oy + 1180); tx.stroke();
    for (let k = 0; k < 7; k++) line(oy + 1218 + k * 33, 2.4, 0.1, k === 6 ? 0.42 : 1, k === 0);
    const tb = E.canvas(w, h); tb.x.filter = 'blur(0.9px)'; tb.x.drawImage(tc.c, 0, 0);
    return { c: cv.c, txt: tb.c };
  }
  /** parchment page: gradient (screen) + fibres and text (world, under the current transform). */
  function drawParchment(ctx, spr, applyWorld, a = 1, textA = 1) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = E.lin(ctx, 0, 0, 0, H, [[0, '#F7EEDC'], [0.6, '#F1E3C9'], [1, '#EBD9BB']]); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = E.rad(ctx, 540, 760, 0, 980, [[0, '#FFFAF0', 0.6], [0.55, '#FFF6E6', 0.22], [1, '#FFF6E6', 0]]); ctx.fillRect(0, 0, W, H);
    ctx.save(); applyWorld(ctx); ctx.drawImage(spr.c, 540 - spr.c.width / 2, 960 - spr.c.height / 2);
    if (textA > 0) { ctx.globalAlpha *= textA; ctx.drawImage(spr.txt, 540 - spr.c.width / 2, 960 - spr.c.height / 2); }
    ctx.restore();
    ctx.restore();
  }
  /** the slow page push used across the F/G seam (identical in both scenes) */
  function seamZoom(t) { return 1 + 0.03 * E.p(t, 28.1, 29.0, 'inOutSine'); }
  function drawFootStar(ctx, t, x, y, r, a = 1) {
    if (a <= 0) return;
    const pulse = 1 + 0.12 * Math.sin(t * 3.1);
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = E.rad(ctx, x, y, 0, r * 3.6 * pulse, [[0, '#FFE7B0', 0.9], [0.35, '#FFDC94', 0.42 + 0.08 * Math.sin(t * 3.1)], [1, '#FFE7B0', 0]]);
    ctx.fillRect(x - r * 4.4, y - r * 4.4, r * 8.8, r * 8.8);
    E.at(ctx, x, y, 1, 0, (c) => star8a(c, { r, open: 0, draw: 1, glow: 0.7, lineW: r * 0.045, col: '#C69A42' }));
    ctx.restore();
  }
  function footMotes(ctx, t, x, y, a = 1) {
    if (a <= 0) return;
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const ang = i * 0.9 + t * (0.18 + 0.05 * (i % 3)), rr = 96 + 22 * i + 10 * Math.sin(t * 0.7 + i), px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr * 0.8 - 6 * Math.sin(t + i);
      const tw = 0.5 + 0.5 * Math.sin(t * 2.1 + i * 1.7);
      ctx.globalAlpha = a * (0.25 + 0.4 * tw);
      ctx.fillStyle = E.rad(ctx, px, py, 0, 7, [[0, '#FFF4D2', 1], [0.4, '#E8C27A', 0.7], [1, '#E8C27A', 0]]); ctx.fillRect(px - 7, py - 7, 14, 14);
    }
    ctx.restore();
  }
  /* ===================================================================================== */

  const goldGrad = (ctx, x0, y0, x1, y1, a = 1) => E.lin(ctx, x0, y0, x1, y1, [[0, '#8A5A1E', a], [0.22, '#FFE9A8', a], [0.42, '#D9A548', a], [0.6, '#FFF3C4', a], [0.8, '#B8862E', a], [1, '#FFCF5A', a]]);
  const JEWEL = ['#FFCF5A', '#2EE6A6', '#4C8DFF', '#B47CFF', '#FF3D6E', '#FFE9A8'];

  /* ------------------------------ camera ------------------------------ */
  /* 'yüksek' (24.005): the lift starts 3 frames early with a quick, eased rise (outQuad) and a small overshoot */
  function liftE(t) { const k = clamp((t - 23.9) / 0.85); return (1 - (1 - k) * (1 - k)) + 0.045 * Math.sin(PI * clamp((k - 0.6) / 0.4)); }
  function baseRCY(t) { return 760 - 230 * liftE(t); }
  /* E's ember path (matches E_omur: wick ≈ (819,876) → (540,760) by 22.47) */
  function emberPos(t) {
    const u = clamp((t - 21.95) / 0.52), e = ez.inOutSine(u);
    const tx = 540 + 26 * Math.sin(u * PI * 2.4) * (1 - u) * Math.min(1, u * 4), ty = 760 - 70 * Math.sin(PI * u) * (1 - u * 0.4);
    return [lerp(819, tx, e), lerp(876, ty, e)];
  }
  function roseCY(t) {
    const bob = 5 * Math.sin(t * 2.2) * P(t, 22.5, 23.0) * (1 - P(t, 23.5, 23.82));
    const nudge = -6 * Math.sin(PI * clamp((t - 23.76) / 0.14)) * (t > 23.76 ? 1 : 0);
    return baseRCY(t) + bob + nudge;
  }
  function diveZ(t) {
    if (t <= 27.15) return 1;
    const u = clamp((t - 27.15) / 1.25), e = u < 0.55 ? 0.42 * ez.inCubic(u / 0.55) : 0.42 + 0.58 * ez.outExpo((u - 0.55) / 0.45);
    return Math.pow(12 / 1.08, e);
  }
  /** close framing: push in on the ruby after the E handoff (z 1→1.6 ⇒ rose R180 ≈ 288 px), small push on
   *  "müddeti", ease back to ≈1.38 so the medallion orbit fills the width, then the dive. */
  function zBase(t) { return (1 + 0.6 * P(t, 22.42, 22.98, 'inOutSine')) * (1 + 0.05 * P(t, 24.79, 25.84)) * lerp(1, 0.82, P(t, 25.85, 26.45)); }
  function camF(t) {
    const d = camDrift(t), rcy = roseCY(t), dv = P(t, 27.3, 27.95);
    let sy = lerp(760, 720, P(t, 22.5, 23.1));
    sy = lerp(sy, 600, clamp(liftE(t))); sy = lerp(sy, 640, P(t, 25.85, 26.45)); sy = lerp(sy, 760, dv);
    const zb = zBase(t);
    return { fx: CX, fy: rcy, sx: CX + d.x * (1 - dv), sy: sy + d.y * (1 - dv), z: zb * diveZ(t), zb, rot: d.r + (8 * PI / 180) * P(t, 27.15, 28.4), rcy, lift: liftE(t) };
  }
  /** parallax rig: p = depth (0 static … 1 hero … >1 foreground); the hero's focus point (fx,fy) sits at (sx,sy) */
  function applyCam(ctx, c, p) {
    const z = 1 + (c.z - 1) * p;
    const cx = c.fx - (c.sx - 540) / c.z, cy = c.fy - (c.sy - 960) / c.z;
    const fx = 540 + (cx - 540) * p + (c.sx - 540) / z, fy = 960 + (cy - 960) * p + (c.sy - 960) / z;
    ctx.translate(c.sx, c.sy); ctx.rotate(c.rot * p); ctx.scale(z, z); ctx.translate(-fx, -fy);
  }
  const FY = 960;   // lacquered floor plane (hero coords)
  const toScr = (c, x, y) => [c.sx + (x - c.fx) * c.z, c.sy + (y - c.fy) * c.z];

  /* ------------------------------ sprites ------------------------------ */
  function makeBokeh(col) {
    return S.sprite('F_bokeh|' + col, 128, 128, (x) => {
      x.fillStyle = E.rad(x, 64, 64, 0, 62, [[0, col, 0.55], [0.72, col, 0.42], [0.9, col, 0.7], [1, col, 0]]);
      x.beginPath(); x.arc(64, 64, 62, 0, TAU); x.fill();
    });
  }
  function makeDome() {
    const s = 1500, cv = E.canvas(s, s), x = cv.x;
    A.girih(x, { cx: s / 2, cy: s / 2, r: 720, cell: 150, lineW: 3.6, col: '#B8862E', relief: 0.7, vector: true });
    const b = E.canvas(s, s); b.x.filter = 'blur(1.2px)'; b.x.drawImage(cv.c, 0, 0);
    return b.c;
  }
  function makePlinth() {
    const sc = 1.5, w = 380, h = 800, cv = E.canvas(w * sc, h * sc), x = cv.x;
    x.scale(sc, sc); x.translate(w / 2, 12);
    const shaftG = (a = 1) => E.lin(x, -92, 0, 92, 0, [[0, '#5A3408', a], [0.1, '#A87412', a], [0.3, '#FFC83A', a], [0.45, '#FFF0B0', a], [0.56, '#FFCF48', a], [0.78, '#B8800E', a], [1, '#4A2A04', a]]);
    // shaft (slight entasis), three facets
    const shaft = new Path2D(); shaft.moveTo(-84, 92); shaft.lineTo(84, 92); shaft.lineTo(92, 790); shaft.lineTo(-92, 790); shaft.closePath();
    x.fillStyle = shaftG(); x.fill(shaft);
    x.save(); x.clip(shaft);
    x.fillStyle = 'rgba(70,36,4,0.26)'; x.beginPath(); x.moveTo(-84, 92); x.lineTo(-40, 92); x.lineTo(-43, 790); x.lineTo(-92, 790); x.closePath(); x.fill();
    x.fillStyle = 'rgba(70,36,4,0.12)'; x.beginPath(); x.moveTo(40, 92); x.lineTo(84, 92); x.lineTo(92, 790); x.lineTo(43, 790); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,246,206,0.6)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(-40, 92); x.lineTo(-43, 790); x.moveTo(40, 92); x.lineTo(43, 790); x.stroke();
    // engraved OPEN running rumi vine: one wavy stem, leaves and tendrils ALTERNATE sides (never mirrored,
    // never closing into a loop), punched-dot borders
    const eng = new Path2D(), stemX = (y) => 9 * Math.sin(y / 34);
    eng.moveTo(stemX(100), 100); for (let y = 104; y <= 700; y += 4) eng.lineTo(stemX(y), y);
    for (let k = 0, y = 118; y < 690; k++, y += 36) {
      const g = k % 2 ? 1 : -1, bx = stemX(y);
      // pointed saz leaf, open at the base, leaning upward and outward
      eng.moveTo(bx, y); eng.quadraticCurveTo(bx + g * 14, y - 4, bx + g * 25, y - 15); eng.moveTo(bx, y); eng.quadraticCurveTo(bx + g * 8, y - 13, bx + g * 25, y - 15);
      // tendril curling the other way, an open half-spiral
      const ty = y + 18, tb = stemX(ty);
      eng.moveTo(tb, ty); eng.bezierCurveTo(tb - g * 12, ty + 2, tb - g * 22, ty + 10, tb - g * 20, ty + 20); eng.quadraticCurveTo(tb - g * 18, ty + 26, tb - g * 13, ty + 24);
    }
    for (const [dx, col, lw] of [[0.9, 'rgba(255,248,214,0.8)', 1.1], [0, 'rgba(110,64,16,0.85)', 1.7]]) {
      x.save(); x.translate(-dx, -dx); x.strokeStyle = col; x.lineWidth = lw; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(eng); x.restore();
    }
    for (let y = 104; y < 700; y += 9) for (const bx of [-37, 37]) { x.fillStyle = 'rgba(110,64,16,0.6)'; x.beginPath(); x.arc(bx, y, 1.3, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,248,214,0.6)'; x.beginPath(); x.arc(bx - 0.6, y - 0.6, 0.7, 0, TAU); x.fill(); }
    // strong specular streaks (polished gold), soft occlusion under the neck
    x.fillStyle = E.lin(x, -32, 0, -12, 0, [[0, 'rgba(255,255,236,0)'], [0.5, 'rgba(255,255,236,0.55)'], [1, 'rgba(255,255,236,0)']]); x.fillRect(-32, 92, 20, 700);
    x.fillStyle = E.lin(x, 52, 0, 62, 0, [[0, 'rgba(255,240,190,0)'], [0.5, 'rgba(255,240,190,0.3)'], [1, 'rgba(255,240,190,0)']]); x.fillRect(52, 92, 10, 700);
    x.fillStyle = E.lin(x, 0, 92, 0, 120, [[0, 'rgba(60,30,4,0.45)'], [1, 'rgba(60,30,4,0)']]); x.fillRect(-92, 92, 184, 30);
    // horizontal rings on the shaft
    for (const y of [124, 300, 520]) {
      x.fillStyle = E.lin(x, 0, y - 6, 0, y + 6, [[0, '#FFF3C4'], [0.5, '#B8862E'], [1, '#6E4414']]); x.fillRect(-92, y - 4, 184, 8);
    }
    x.restore();
    // neck band with cabochons
    x.fillStyle = shaftG(); x.beginPath(); x.roundRect(-106, 68, 212, 26, 6); x.fill();
    x.strokeStyle = 'rgba(80,44,10,0.6)'; x.lineWidth = 1.2; x.stroke();
    [['#FF3D6E', '#B0103E'], ['#2EE6A6', '#0E7A58'], ['#4C8DFF', '#1F3FB8'], ['#2EE6A6', '#0E7A58'], ['#FF3D6E', '#B0103E']].forEach(([c1, c2], i) => {
      const gx = -72 + i * 36, gy = 81;
      x.fillStyle = E.rad(x, gx - 2, gy - 3, 0, 8, [[0, '#FFFFFF'], [0.25, c1], [1, c2]]); x.beginPath(); x.ellipse(gx, gy, 8, 7, 0, 0, TAU); x.fill();
      x.strokeStyle = '#FFE9A8'; x.lineWidth = 1.4; x.stroke();
    });
    // ogee moulding under the capital
    const og = new Path2D(); og.moveTo(-150, 34); og.bezierCurveTo(-150, 52, -112, 46, -110, 68); og.lineTo(110, 68); og.bezierCurveTo(112, 46, 150, 52, 150, 34); og.closePath();
    x.fillStyle = E.lin(x, -150, 0, 150, 0, [[0, '#6E4414'], [0.25, '#E8B84A'], [0.45, '#FFF3C4'], [0.6, '#E8B84A'], [1, '#5A3610']]); x.fill(og);
    x.save(); x.clip(og); x.fillStyle = 'rgba(60,20,40,0.25)'; x.fillRect(-150, 52, 300, 16); x.restore();
    // muqarnas niches on the moulding
    for (let i = 0; i < 9; i++) { const nx = -96 + i * 24; x.fillStyle = 'rgba(90,50,12,0.55)'; x.beginPath(); x.moveTo(nx - 8, 66); x.lineTo(nx - 8, 56); x.quadraticCurveTo(nx, 46, nx + 8, 56); x.lineTo(nx + 8, 66); x.closePath(); x.fill(); }
    // capital slab
    x.fillStyle = E.lin(x, -156, 0, 156, 0, [[0, '#7A4C16'], [0.18, '#E8B84A'], [0.42, '#FFF3C4'], [0.55, '#FFE08A'], [0.8, '#C8922A'], [1, '#5A3610']]);
    x.beginPath(); x.roundRect(-156, 4, 312, 32, 5); x.fill();
    x.fillStyle = 'rgba(255,250,225,0.9)'; x.fillRect(-152, 4, 304, 2.2);
    x.strokeStyle = 'rgba(110,64,16,0.55)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-150, 28); x.lineTo(150, 28); x.stroke();
    for (let i = 0; i < 13; i++) { const dx = -132 + i * 22; x.fillStyle = 'rgba(255,248,214,0.8)'; x.beginPath(); x.arc(dx, 18, 2.2, 0, TAU); x.fill(); x.fillStyle = 'rgba(110,64,16,0.5)'; x.beginPath(); x.arc(dx + 0.6, 18.8, 1.2, 0, TAU); x.fill(); }
    // top surface (very thin, seen from slightly below) + ruby light pool
    x.fillStyle = E.lin(x, 0, -6, 0, 6, [[0, '#B8862E'], [1, '#FFE9A8']]); x.beginPath(); x.ellipse(0, 4, 152, 6, 0, PI, TAU); x.fill();
    // fade into violet mist at the bottom
    return { c: cv.c, sc, ax: w / 2, ay: 12 };
  }
  function makeMist() {
    const cv = E.canvas(1400, 600), x = cv.x, rnd = E.rng(771);
    x.filter = 'blur(18px)';
    for (let i = 0; i < 30; i++) { const px = 120 + rnd() * 1160, py = 200 + rnd() * 240, rx = 90 + rnd() * 200, ry = 40 + rnd() * 70; x.fillStyle = E.rad(x, px, py, 0, rx, [[0, ['#7A44B0', '#5E2C86', '#9A6AD8', '#6E3AA0'][i % 4], 0.22 + rnd() * 0.14], [1, '#5E2C86', 0]]); x.save(); x.translate(px, py); x.scale(1, ry / rx); x.translate(-px, -py); x.beginPath(); x.arc(px, py, rx, 0, TAU); x.fill(); x.restore(); }
    return cv.c;
  }
  /** velvet drapery (left side; mirrored for the right): folds compress at the tie-back, gold braid, tassel */
  function makeDrape() {
    const w = 420, h = 2200, cv = E.canvas(w, h), x = cv.x;
    const edge = (y) => (y < 1220 ? lerp(300, 140, ez.inOutSine(y / 1220)) : lerp(140, 240, ez.outCubic((y - 1220) / (h - 1220))));
    const N = 7;
    for (let y = 0; y < h; y += 8) {
      const ew = edge(y), g = x.createLinearGradient(0, 0, ew, 0);
      for (let k = 0; k <= N * 2; k++) { const f = k / (N * 2), c = k % 2 ? (k % 4 === 1 ? '#7A2A5E' : '#6A2252') : '#1E0820'; g.addColorStop(f, c); }
      x.fillStyle = g; x.fillRect(0, y, ew, 9);
    }
    // soft vertical sheen + shading toward the outer edge and the floor
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = E.lin(x, 0, 0, w, 0, [[0, '#08020C', 0.65], [0.5, '#08020C', 0.1], [1, '#08020C', 0]]); x.fillRect(0, 0, w, h);
    x.fillStyle = E.lin(x, 0, 0, 0, h, [[0, '#08020C', 0.35], [0.3, '#08020C', 0], [0.8, '#08020C', 0.2], [1, '#08020C', 0.6]]); x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
    // gold braid along the inner edge + rim light
    x.beginPath(); for (let y = 0; y <= h; y += 10) { const ex = edge(y); y ? x.lineTo(ex, y) : x.moveTo(ex, y); }
    x.strokeStyle = 'rgba(255,140,190,0.35)'; x.lineWidth = 10; x.stroke();
    x.strokeStyle = '#8A5A1E'; x.lineWidth = 6; x.stroke(); x.strokeStyle = '#FFCF5A'; x.lineWidth = 3.2; x.stroke(); x.strokeStyle = 'rgba(255,248,214,0.85)'; x.lineWidth = 1; x.stroke();
    // tie-back rope + tassel
    x.translate(-10, 400);
    x.lineCap = 'round'; x.strokeStyle = '#C8922A'; x.lineWidth = 9; x.beginPath(); x.moveTo(0, 800); x.quadraticCurveTo(90, 846, 158, 820); x.stroke();
    x.strokeStyle = 'rgba(255,240,190,0.7)'; x.lineWidth = 2.5; x.stroke();
    x.fillStyle = E.lin(x, 150, 820, 190, 960, [[0, '#FFE9A8'], [0.5, '#C8922A'], [1, '#6E4414']]);
    x.beginPath(); x.moveTo(160, 822); x.quadraticCurveTo(196, 900, 184, 960); x.lineTo(140, 960); x.quadraticCurveTo(132, 900, 160, 822); x.fill();
    x.strokeStyle = 'rgba(110,64,16,0.6)'; x.lineWidth = 1; for (let k = 0; k < 7; k++) { x.beginPath(); x.moveTo(146 + k * 6, 900); x.lineTo(144 + k * 6.4, 958); x.stroke(); }
    x.fillStyle = '#FFE08A'; x.beginPath(); x.arc(161, 826, 9, 0, TAU); x.fill();
    return cv.c;
  }
  function makeHexBokeh(col) {
    return S.sprite('F_hex|' + col, 160, 160, (x) => {
      x.filter = 'blur(5px)';
      const p = new Path2D(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.3; k ? p.lineTo(80 + Math.cos(a) * 62, 80 + Math.sin(a) * 62) : p.moveTo(80 + Math.cos(a) * 62, 80 + Math.sin(a) * 62); } p.closePath();
      x.fillStyle = E.rad(x, 70, 70, 0, 70, [[0, col, 0.35], [0.8, col, 0.5], [1, col, 0.75]]); x.fill(p);
      x.strokeStyle = E.rgba(col, 0.8); x.lineWidth = 3; x.stroke(p);
    });
  }
  function hoopoeFeather(x) {
    x.save(); x.rotate(0.35);
    const f = new Path2D(); f.moveTo(0, 42); f.bezierCurveTo(-15, 18, -16, -22, -2, -44); f.bezierCurveTo(10, -28, 14, 14, 0, 42); f.closePath();
    x.fillStyle = E.lin(x, 0, 42, 0, -44, [[0, '#C9783A'], [0.5, '#E8A15C'], [0.66, '#F2B877'], [0.67, '#F6F0E6'], [0.78, '#F6F0E6'], [0.79, '#1E1A1A'], [1, '#1E1A1A']]);
    x.fill(f);
    x.save(); x.clip(f); x.fillStyle = 'rgba(80,30,10,0.28)'; x.fillRect(0, -50, 20, 100);
    x.strokeStyle = 'rgba(255,240,220,0.35)'; x.lineWidth = 0.6; x.beginPath(); for (let i = 0; i < 16; i++) { const y = 38 - i * 5.2; x.moveTo(0, y); x.lineTo(-14, y - 7); x.moveTo(0, y); x.lineTo(13, y - 7); } x.stroke();
    x.restore();
    x.strokeStyle = '#F6E2C4'; x.lineWidth = 1.3; x.beginPath(); x.moveTo(0, 50); x.quadraticCurveTo(-1, 0, -2, -40); x.stroke();
    x.restore();
  }
  const STONE = ['#3FD9A0', '#5A8CFF', '#B07CFF', '#FFB43A', '#36C99A', '#FF5A84', '#4FD6C8', '#9A7CFF'];
  /** jewel ornament: a cut, faceted stone (octagonal brilliant, top view) in gold prongs, the motif set on its table */
  function makeMedallion(i) {
    const S2 = 2.2, size = 150, cv = E.canvas(size * S2, size * S2), x = cv.x, col = STONE[i];
    x.scale(S2, S2); x.translate(size / 2, size / 2);
    const N = 8, ro = 58, ri = 36, out = [], tb = [];
    for (let k = 0; k < N; k++) { const a = -PI / 2 + PI / 8 + k * TAU / N; out.push([Math.cos(a) * ro, Math.sin(a) * ro]); tb.push([Math.cos(a) * ri, Math.sin(a) * ri - 3]); }
    for (let k = 0; k < N; k++) {
      const j = (k + 1) % N, mid = -PI / 2 + PI / 8 + (k + 0.5) * TAU / N, sh = 0.5 + 0.5 * Math.cos(mid + 2.3);
      const m = [(out[k][0] + out[j][0]) / 2, (out[k][1] + out[j][1]) / 2];
      x.fillStyle = E.mix(E.shade(col, -0.45), E.shade(col, 0.55), sh); x.beginPath(); x.moveTo(out[k][0], out[k][1]); x.lineTo(m[0], m[1]); x.lineTo(tb[k][0], tb[k][1]); x.closePath(); x.fill();
      x.fillStyle = E.mix(E.shade(col, -0.3), E.shade(col, 0.7), sh * 0.9); x.beginPath(); x.moveTo(m[0], m[1]); x.lineTo(out[j][0], out[j][1]); x.lineTo(tb[j][0], tb[j][1]); x.lineTo(tb[k][0], tb[k][1]); x.closePath(); x.fill();
    }
    x.fillStyle = E.rad(x, -10, -14, 2, ri * 1.2, [[0, E.shade(col, 0.55)], [0.6, col], [1, E.shade(col, -0.35)]]);
    x.beginPath(); tb.forEach((q, k) => (k ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]))); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 0.9; x.stroke();
    x.beginPath(); for (let k = 0; k < N; k++) { x.moveTo(out[k][0], out[k][1]); x.lineTo(tb[k][0], tb[k][1]); } x.strokeStyle = 'rgba(255,255,255,0.35)'; x.stroke();
    x.beginPath(); out.forEach((q, k) => (k ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]))); x.closePath();
    x.strokeStyle = 'rgba(60,30,6,0.55)'; x.lineWidth = 3.2; x.stroke(); x.strokeStyle = goldGrad(x, -ro, -ro, ro, ro); x.lineWidth = 2; x.stroke();
    // gold prongs
    for (const q of out) { x.fillStyle = E.rad(x, q[0] - 1, q[1] - 1, 0, 5, [[0, '#FFFBEA'], [0.6, '#E8B84A'], [1, '#8A5A1E']]); x.beginPath(); x.arc(q[0], q[1], 4.2, 0, TAU); x.fill(); }
    // the motif on the table, with a soft pearly bed so it reads
    x.fillStyle = E.rad(x, 0, -2, 0, 40, [[0, '#FFFFFF', 0.4], [1, '#FFFFFF', 0]]); x.beginPath(); x.arc(0, -2, 40, 0, TAU); x.fill();
    const t0 = 0.4;
    if (i === 0) E.at(x, 0, 18, 1.15, 0, (c) => A.flowerSet(c, { type: 'tulip', size: 30, stem: 0, t: t0, sway: 0 }));
    else if (i === 1) E.at(x, 6, 42, 1, 0.3, (c) => A.peacockFeather(c, { len: 86, t: t0, sway: 0 }));
    else if (i === 2) E.at(x, 0, 4, 1, 0, (c) => A.butterfly(c, { size: 30, pattern: 'sapphire', gem: true, flap: 0.96, t: t0 }));
    else if (i === 3) E.at(x, 0, 6, 1, 0, (c) => A.pomegranate(c, { r: 24, gem: true, t: t0 }));
    else if (i === 4) E.at(x, 0, 18, 1.1, 0, (c) => A.flowerSet(c, { type: 'carnation', size: 30, stem: 0, t: t0, sway: 0 }));
    else if (i === 5) E.at(x, 0, -2, 0.85, 0, hoopoeFeather);
    else if (i === 6) E.at(x, 0, 0, 1, 0, (c) => A.cherries(c, { size: 56, t: t0 }));
    else E.at(x, 0, 16, 1.05, 0, (c) => A.flowerSet(c, { type: 'lily', size: 32, stem: 0, t: t0, sway: 0 }));
    // crown sheen
    x.fillStyle = E.lin(x, -ro, -ro, ro * 0.2, ro * 0.2, [[0, '#FFFFFF', 0.3], [0.5, '#FFFFFF', 0.06], [1, '#FFFFFF', 0]]);
    x.beginPath(); out.forEach((q, k) => (k ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]))); x.closePath(); x.fill();
    return { c: cv.c, s: S2, size };
  }
  /** soft additive glint (round core + faint thin cross), never a hard 4-point star */
  function softGlint(ctx, x, y, r, a, col = '#FFF6E6') {
    if (a <= 0.01 || r <= 0.5) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= a;
    ctx.fillStyle = E.rad(ctx, x, y, 0, r, [[0, col, 0.85], [0.25, col, 0.3], [1, col, 0]]); ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.strokeStyle = E.lin(ctx, x - r * 1.6, y, x + r * 1.6, y, [[0, col, 0], [0.5, col, 0.45], [1, col, 0]]); ctx.lineWidth = Math.max(0.8, r * 0.06);
    ctx.beginPath(); ctx.moveTo(x - r * 1.6, y); ctx.lineTo(x + r * 1.6, y); ctx.stroke();
    ctx.strokeStyle = E.lin(ctx, x, y - r * 1.6, x, y + r * 1.6, [[0, col, 0], [0.5, col, 0.45], [1, col, 0]]);
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x, y + r * 1.6); ctx.stroke();
    ctx.restore();
  }

  /* ------------------------------ elements ------------------------------ */
  let BOKEH = [];
  function initBokeh() {
    const rnd = E.rng(5521);
    const add = (n, p, r0, r1, a0, a1) => { for (let i = 0; i < n; i++) BOKEH.push({ p, x: -200 + rnd() * 1480, y: -300 + rnd() * 2500, r: lerp(r0, r1, rnd()), a: lerp(a0, a1, rnd()), col: JEWEL[(rnd() * JEWEL.length) | 0], sp: 6 + rnd() * 18, ph: rnd() * 10 }); };
    add(10, 0.3, 18, 34, 0.08, 0.16); add(8, 0.6, 22, 40, 0.07, 0.13);
    for (let i = 0; i < 10; i++) BOKEH.push({ p: 1.7, x: i % 2 ? 860 + rnd() * 420 : -200 + rnd() * 420, y: -300 + rnd() * 2500, r: lerp(50, 120, rnd()), a: lerp(0.1, 0.2, rnd()), col: ['#FF3D6E', '#FFCF5A', '#B47CFF', '#FF8AA8'][i % 4], sp: 14 + rnd() * 16, ph: rnd() * 10, hex: true });
  }
  function bandGuard(t) { return P(t, 25.85, 26.1, 'inOutSine') * (1 - P(t, 27.2, 27.45, 'inOutSine')); }
  function drawBokeh(ctx, t, c, layerSel, vis) {
    const g = bandGuard(t);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const b of BOKEH) {
      if (!layerSel(b.p)) continue;
      ctx.save(); applyCam(ctx, c, b.p);
      const yy = ((b.y - (t - T0) * b.sp - 0) % 2500 + 2500) % 2500 - 300, xx = b.x + E.noise(t * 0.25 + b.ph, 7) * 30;
      const m = ctx.getTransform(), sy = m.f + m.d * yy + m.b * xx;
      const inBand = sy > 1180 && sy < 1620 ? 1 : 0;
      const tw = 0.75 + 0.25 * Math.sin(t * 1.3 + b.ph * 3);
      ctx.globalAlpha = b.a * tw * vis * (1 - 0.7 * g * inBand);
      const spr = b.hex ? makeHexBokeh(b.col) : makeBokeh(b.col);
      ctx.drawImage(spr, xx - b.r, yy - b.r, b.r * 2, b.r * 2);
      ctx.restore();
    }
    ctx.restore();
  }

  function hexPts(r, morph, n = 48) {
    const o = [];
    for (let i = 0; i < n; i++) {
      const a = -PI / 2 + (i / n) * TAU;
      const seg = Math.floor((i / n) * 6), u = (i / n) * 6 - seg;
      const a0 = -PI / 2 + seg * TAU / 6, a1 = a0 + TAU / 6;
      const hx = lerp(Math.cos(a0), Math.cos(a1), u) * r, hy = lerp(Math.sin(a0), Math.sin(a1), u) * r;
      o.push([lerp(Math.cos(a) * r, hx, morph), lerp(Math.sin(a) * r, hy, morph)]);
    }
    return o;
  }
  function drawGem(ctx, t, x, y, r, morph, unfold, alpha) {
    if (alpha <= 0.003) return;
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= alpha;
    const ruby = morph;
    // halos
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = E.rad(ctx, 0, 0, 0, r * 4.2, [[0, E.mix('#FF7A3D', '#FF3D6E', ruby), 0.55 * (1 - unfold)], [0.3, E.mix('#FF7A3D', '#B0103E', ruby), 0.2 * (1 - unfold)], [1, '#5E2C86', 0]]);
    ctx.fillRect(-r * 4.2, -r * 4.2, r * 8.4, r * 8.4); ctx.restore();
    if (unfold < 1) S.light(ctx, 0, 0, (r * (10 - 3 * ruby) + 60) * (1 - unfold * 0.5), E.mix('#FF7A3D', '#FF3D6E', ruby), (0.55 - 0.3 * ruby) * (1 - unfold));
    if (unfold <= 0) {
      const pts = hexPts(r, morph);
      ctx.fillStyle = E.rad(ctx, -r * 0.2, -r * 0.3, 0, r * 1.1, [[0, E.mix('#FFF4C2', '#FF8AA8', ruby)], [0.45, E.mix('#FFB34D', '#FF3D6E', ruby)], [1, E.mix('#FF7A3D', '#B0103E', ruby)]]);
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
      if (morph > 0.25) {
        const fk = clamp((morph - 0.25) / 0.6), outer = [], inner = [];
        ctx.save(); ctx.globalAlpha *= fk;
        for (let i = 0; i < 6; i++) { const an = -PI / 2 + (i / 6) * TAU; outer.push([Math.cos(an) * r, Math.sin(an) * r]); inner.push([Math.cos(an) * r * 0.52, Math.sin(an) * r * 0.52 - r * 0.04]); }
        for (let i = 0; i < 6; i++) {
          const j = (i + 1) % 6, mid = -PI / 2 + ((i + 0.5) / 6) * TAU, sh = 0.5 + 0.5 * Math.cos(mid + 2.3);
          ctx.fillStyle = sh > 0.6 ? E.mix('#FF3D6E', '#FF8AA8', (sh - 0.6) / 0.4) : E.mix('#B0103E', '#FF3D6E', sh / 0.6);
          ctx.beginPath(); ctx.moveTo(outer[i][0], outer[i][1]); ctx.lineTo(outer[j][0], outer[j][1]); ctx.lineTo(inner[j][0], inner[j][1]); ctx.lineTo(inner[i][0], inner[i][1]); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = E.rad(ctx, -r * 0.15, -r * 0.2, 0, r * 0.6, [[0, '#FFC2D2'], [1, '#FF4F7B']]);
        ctx.beginPath(); inner.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,214,226,0.55)'; ctx.lineWidth = Math.max(0.8, r * 0.04); ctx.stroke();
        ctx.beginPath(); for (let i = 0; i < 6; i++) { ctx.moveTo(inner[i][0], inner[i][1]); ctx.lineTo(outer[i][0], outer[i][1]); } ctx.stroke();
        ctx.beginPath(); outer.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.strokeStyle = 'rgba(255,214,226,0.8)'; ctx.lineWidth = Math.max(1, r * 0.045); ctx.stroke();
        ctx.restore();
      }
      S.sparkle(ctx, -r * 0.3, -r * 0.42, r * (0.35 + 0.15 * Math.sin(t * 5)), 0.9 * sm(morph), '#FFFFFF', t * 0.6);
    } else {
      const shades = ['#FF8AA8', '#FF3D6E', '#D41E52', '#B0103E', '#D41E52', '#FF5A84'], u = ez.outCubic(unfold);
      for (let k = 0; k < 6; k++) {
        const a0 = -PI / 2 + k * TAU / 6, a1 = a0 + TAU / 6, am = (a0 + a1) / 2;
        ctx.save(); ctx.translate(Math.cos(am) * r * 3.2 * u, Math.sin(am) * r * 3.2 * u); ctx.rotate((k % 2 ? 1 : -1) * u * 1.4); ctx.scale(1 + 1.6 * u, 1 + 1.6 * u);
        ctx.globalAlpha *= 1 - unfold;
        ctx.fillStyle = shades[k]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r); ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,220,230,0.8)'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawRays(ctx, t, x, y, k) {
    if (k <= 0.005) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const spin = t * 0.05;
    for (let i = 0; i < 12; i++) {
      const a = spin + (i / 12) * TAU, L = (i % 2 ? 640 : 900) * (0.85 + 0.15 * Math.sin(t * 0.9 + i * 1.7)), w = i % 2 ? 0.045 : 0.07;
      ctx.fillStyle = E.rad(ctx, x, y, 60, L, [[0, '#FFE9A8', 0.09 * k], [0.5, '#FFE9A8', 0.035 * k], [1, '#FFE9A8', 0]]);
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a - w * 0.3) * 60, y + Math.sin(a - w * 0.3) * 60); ctx.lineTo(x + Math.cos(a - w) * L, y + Math.sin(a - w) * L); ctx.lineTo(x + Math.cos(a + w) * L, y + Math.sin(a + w) * L); ctx.lineTo(x + Math.cos(a + w * 0.3) * 60, y + Math.sin(a + w * 0.3) * 60); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawSpot(ctx, t, x, ybot, k) {
    if (k <= 0.005) return;
    const m = ctx.getTransform();
    E.layer(ctx, (l) => {
      fresh(l, true);
      l.setTransform(m.a / 2, m.b / 2, m.c / 2, m.d / 2, m.e / 2, m.f / 2);
      const topW = 110, botW = 780, y0 = ybot - 1500;
      l.fillStyle = E.lin(l, x - botW / 2, 0, x + botW / 2, 0, [[0, '#FFE9A8', 0], [0.28, '#FFE9A8', 0.35], [0.5, '#FFF4D6', 1], [0.72, '#FFE9A8', 0.35], [1, '#FFE9A8', 0]]);
      l.beginPath(); l.moveTo(x - topW / 2, y0); l.lineTo(x + topW / 2, y0); l.lineTo(x + botW / 2, ybot); l.lineTo(x - botW / 2, ybot); l.closePath(); l.fill();
      l.fillStyle = E.rad(l, x, ybot - 160, 0, 360, [[0, '#FFE9A8', 0.5], [1, '#FFE9A8', 0]]); l.fillRect(x - 400, ybot - 560, 800, 800);
      l.globalCompositeOperation = 'destination-in';
      l.fillStyle = E.lin(l, 0, y0, 0, ybot + 200, [[0, '#000', 0.25], [0.55, '#000', 1], [0.85, '#000', 0.6], [1, '#000', 0]]); l.fillRect(x - 600, y0 - 100, 1200, ybot - y0 + 400);
    }, { lo: true, blur: 14, alpha: 0.3 * k, op: 'lighter' });
  }

  function drawLifeRing(ctx, t, cx, cy) {
    const rr = 280;
    const dk = ez.outCubic(clamp((t - 24.72) / 0.42));
    if (dk <= 0) return;
    const bk = clamp((t - 25.22) / 0.5), be = ez.inOutSine(bk);
    const span = (t < 25.22 ? 360 * dk : lerp(360, 50, be)) * PI / 180;
    const fade = 1 - P(t, 25.95, 26.35, 'inOutSine');
    if (fade <= 0) return;
    const a0 = -PI / 2, a1 = a0 + span;
    ctx.save(); ctx.globalAlpha *= fade; ctx.lineCap = 'round';
    // afterglow of burnt section
    if (t > 25.22) {
      const prev = (lerp(360, 50, ez.inOutSine(clamp((t - 0.16 - 25.22) / 0.5))) * PI) / 180;
      if (prev > span + 0.01) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createConicGradient(a0, cx, cy);
        const f0 = span / TAU, f1 = prev / TAU;
        g.addColorStop(clamp(f0), 'rgba(255,140,60,0.55)'); g.addColorStop(clamp(f1), 'rgba(255,90,40,0)'); g.addColorStop(clamp(f1 + 0.001), 'rgba(0,0,0,0)');
        if (f0 > 0.001) g.addColorStop(0, 'rgba(0,0,0,0)'), g.addColorStop(clamp(f0 - 0.001), 'rgba(0,0,0,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, rr, a1, a0 + prev); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,207,90,0.16)'; ctx.lineWidth = 18; ctx.stroke(); ctx.strokeStyle = 'rgba(255,233,168,0.22)'; ctx.lineWidth = 8; ctx.stroke(); ctx.restore();
    ctx.strokeStyle = 'rgba(60,24,0,0.45)'; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = goldGrad(ctx, cx - rr, cy - rr, cx + rr, cy + rr); ctx.lineWidth = 3.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,250,228,0.9)'; ctx.lineWidth = 1.1; ctx.stroke();
    // head
    const hx = cx + Math.cos(a1) * rr, hy = cy + Math.sin(a1) * rr;
    if (t < 25.22) { if (dk < 1) S.sparkle(ctx, hx, hy, 16, 0.9, '#FFF3C4', t * 3); }
    else {
      const burning = bk < 1 ? 1 : 1 - P(t, 25.72, 25.95);
      if (burning > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = E.rad(ctx, hx, hy, 0, 40, [[0, '#FFFFFF', 0.9 * burning], [0.25, '#FFB34D', 0.6 * burning], [1, '#FF5A2A', 0]]); ctx.fillRect(hx - 40, hy - 40, 80, 80);
        ctx.restore();
        S.sparkle(ctx, hx, hy, 18 + 6 * Math.sin(t * 40), burning, '#FFF4C2', t * 8);
      }
      // sparks emitted along the burn path
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let k = 0; k < 44; k++) {
        const tau = 25.22 + k * 0.0115, age = t - tau;
        if (age < 0 || age > 0.6) continue;
        const sp = (lerp(360, 50, ez.inOutSine(clamp((tau - 25.22) / 0.5))) * PI) / 180, ha = a0 + sp;
        const px = cx + Math.cos(ha) * rr, py = cy + Math.sin(ha) * rr;
        const dir = ha + PI / 2 * (E.hash(k, 3) < 0.5 ? 1 : -1) * 0.4 + (E.hash(k, 4) - 0.5) * 2.2, v = 90 + 180 * E.hash(k, 5);
        const vx = Math.cos(dir) * v + Math.cos(ha) * 60, vy = Math.sin(dir) * v + Math.sin(ha) * 60;
        const x1 = px + vx * age, y1 = py + vy * age + 300 * age * age, life = 1 - age / 0.6;
        ctx.strokeStyle = E.mix('#FFF4C2', '#FF7A3D', 1 - life, 0.9 * life); ctx.lineWidth = 2.2 * life + 0.6;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - vx * 0.035, y1 - (vy + 600 * age) * 0.035); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function drawShed(ctx, t, cx, cy) {
    if (t < 25.25 || t > 27.2) return;
    for (let i = 0; i < 14; i++) {
      const tau = 25.24 + i * 0.045, age = t - tau;
      if (age < 0 || age > 1.6) continue;
      const th = -PI * 0.95 + (i / 13) * PI * 0.9 + (E.hash(i, 11) - 0.5) * 0.3 + (i % 2 ? PI * 0.9 : 0);
      const r0 = R * (0.72 + 0.15 * E.hash(i, 12)), sx = cx + Math.cos(th) * r0, sy = cy + Math.sin(th) * r0 * 0.75 + 10;
      const vx = Math.cos(th) * 30 + (E.hash(i, 13) - 0.5) * 40, vy = 30 + 50 * E.hash(i, 14);
      const x = sx + vx * age + Math.sin(age * 5 + i) * 10, y = sy + vy * age + 40 * age * age, life = 1 - sm(age / 1.6);
      const s = 5 + 4 * E.hash(i, 15), rot = age * (3 + 3 * E.hash(i, 16)) + i, flip = Math.cos(age * 7 + i);
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(flip, 1); ctx.globalAlpha *= life;
      ctx.fillStyle = E.lin(ctx, -s, -s, s, s, [[0, '#FF8AA8'], [0.5, '#FF3D6E'], [1, '#B0103E']]);
      ctx.beginPath(); ctx.moveTo(0, -s * 1.3); ctx.lineTo(s, 0); ctx.lineTo(0, s * 1.3); ctx.lineTo(-s, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (E.hash(i, 17) < 0.6) S.sparkle(ctx, x, y, 6 * life, life * (0.5 + 0.5 * Math.sin(age * 12 + i)), '#FFE3EC', age);
    }
  }

  /* --- treasury environment --- */
  function drawWall(ctx, t, c, rayK, vis) {
    const dome = SP.dome;
    const place = (g) => { applyCam(g, c, 0.45); g.translate(CX, FY - 500); g.rotate(t * 0.008); g.scale(1.5, 1.5); g.drawImage(dome, -dome.width / 2, -dome.height / 2); };
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.05 * vis; place(ctx); ctx.restore();
    if (rayK > 0.01) {
      const rs = toScr(c, CX, c.rcy), spin = t * 0.05;
      E.layer(ctx, (l) => {
        fresh(l, false); l.save(); place(l); l.restore();
        const g = l.createConicGradient(spin, rs[0], rs[1]), w0 = 0.07 / TAU * 2.6;
        for (let i = 0; i < 12; i++) { const f = i / 12, w = (i % 2 ? 0.045 : 0.07) / TAU * 2.6; g.addColorStop(Math.max(0, f - w), 'rgba(0,0,0,0)'); g.addColorStop(f, 'rgba(0,0,0,1)'); g.addColorStop(f + w, 'rgba(0,0,0,0)'); }
        g.addColorStop(1 - w0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
        l.globalCompositeOperation = 'destination-in'; l.fillStyle = g; l.fillRect(0, 0, W, H);
        l.fillStyle = E.rad(l, rs[0], rs[1], 120, 950, [[0, '#000', 1], [1, '#000', 0]]); l.fillRect(0, 0, W, H);
        l.globalCompositeOperation = 'source-atop'; l.fillStyle = 'rgba(255,196,96,0.55)'; l.fillRect(0, 0, W, H);
      }, { op: 'screen', alpha: 0.1 * rayK * vis });
    }
  }
  function drawDrapes(ctx, t, c, a) {
    if (a <= 0.003) return;
    const dr = SP.drape, out = (c.zb - 1) * 45 + 95 * P(t, 25.8, 26.35) + (c.z / c.zb - 1) * 140, dy = -70 + 60 * c.lift, k = 0.86;
    for (const side of [-1, 1]) {
      ctx.save(); ctx.globalAlpha *= a;
      if (side < 0) ctx.translate(-60 - out, dy); else { ctx.translate(W + 60 + out, dy); ctx.scale(-1, 1); }
      ctx.transform(1, 0, 0.014 * Math.sin(t * 0.6 + side * 1.3), 1, 0, 0);
      ctx.drawImage(dr, 0, 0, dr.width * k, dr.height * k);
      ctx.restore();
    }
  }
  /** dark violet marble (veined), drawn stretched in perspective as the polished treasury floor */
  function makeMarble() {
    const w = 1400, hh = 700, cv = E.canvas(w, hh), x = cv.x, rnd = E.rng(6121);
    x.fillStyle = E.lin(x, 0, 0, w, hh, [[0, '#1E1034'], [0.5, '#160C28'], [1, '#1C0F30']]); x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 26; i++) { const px = rnd() * w, py = rnd() * hh, r = 60 + rnd() * 200; x.fillStyle = E.rad(x, px, py, 0, r, [[0, rnd() < 0.5 ? '#2C1A48' : '#0E0718', 0.5], [1, '#160C28', 0]]); x.fillRect(px - r, py - r, 2 * r, 2 * r); }
    x.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      let px = rnd() * w, py = rnd() * hh; const a0 = rnd() * TAU, n = 6 + ((rnd() * 6) | 0);
      x.strokeStyle = `rgba(${rnd() < 0.7 ? '190,160,235' : '235,205,160'},${(0.05 + rnd() * 0.1).toFixed(3)})`; x.lineWidth = 0.6 + rnd() * 2.4;
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < n; k++) { const a = a0 + (rnd() - 0.5) * 1.2, L = 30 + rnd() * 70, qx = px + Math.cos(a) * L * 0.5 + (rnd() - 0.5) * 30, qy = py + Math.sin(a) * L * 0.5 + (rnd() - 0.5) * 30; px += Math.cos(a) * L; py += Math.sin(a) * L; x.quadraticCurveTo(qx, qy, px, py); }
      x.stroke();
    }
    const b = E.canvas(w, hh); b.x.filter = 'blur(0.7px)'; b.x.drawImage(cv.c, 0, 0);
    return b.c;
  }
  function drawFloor(h, t, gem) {
    h.fillStyle = '#120A22'; h.fillRect(-3000, FY - 2, 7000, 5000);
    h.drawImage(SP.marble, CX - 1700, FY - 2, 3400, 1100);
    h.fillStyle = E.lin(h, 0, FY - 2, 0, FY + 1100, [[0, '#3A2266', 0.35], [0.06, '#120A22', 0], [0.55, '#07030E', 0.35], [1, '#07030E', 0.85]]); h.fillRect(-3000, FY - 2, 7000, 1110);
    h.save(); h.globalCompositeOperation = 'lighter';
    h.fillStyle = E.lin(h, 0, FY - 30, 0, FY + 20, [[0, '#7A44B0', 0], [0.7, '#9A70D0', 0.1], [1, '#7A44B0', 0]]); h.fillRect(-3000, FY - 30, 7000, 50);
    h.translate(CX, FY + 26); h.scale(1, 0.2); h.fillStyle = E.rad(h, 0, 0, 0, 420, [[0, '#FF3D6E', 0.26 * gem], [0.5, '#B47CFF', 0.1 * gem], [1, '#B47CFF', 0]]); h.fillRect(-440, -440, 880, 880);
    h.restore();
  }
  function makeFgGem(c1, c2, c3, n) {
    const cv = E.canvas(260, 200), x = cv.x, cx = 130, cy = 110, rx = 110, ry = 70;
    const P2 = []; for (let k = 0; k < n; k++) { const a = -PI / 2 + k * TAU / n; P2.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    const tbl = P2.map((q) => [cx + (q[0] - cx) * 0.5, cy - 14 + (q[1] - cy) * 0.45]);
    for (let k = 0; k < n; k++) { const j = (k + 1) % n, sh = 0.5 + 0.5 * Math.cos(-PI / 2 + (k + 0.5) * TAU / n + 2.3); x.fillStyle = E.mix(c3, c1, sh); x.beginPath(); x.moveTo(P2[k][0], P2[k][1]); x.lineTo(P2[j][0], P2[j][1]); x.lineTo(tbl[j][0], tbl[j][1]); x.lineTo(tbl[k][0], tbl[k][1]); x.closePath(); x.fill(); }
    x.fillStyle = E.rad(x, cx - 20, cy - 30, 0, 70, [[0, '#FFFFFF'], [0.3, c1], [1, c2]]); x.beginPath(); tbl.forEach((q, i) => (i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]))); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.45)'; x.lineWidth = 2; x.stroke();
    return cv.c;
  }
  function drawFgGems(ctx, t, c, a) {
    if (a <= 0.003) return;
    const fyS = toScr(c, CX, FY)[1], out = (c.z / c.zb - 1) * 400;
    E.layer(ctx, (l) => {
      fresh(l, true);
      SP.fg.forEach((g, i) => {
        const [x0, y0, s, rot] = [[40, 1850, 1.6, -0.2], [1030, 1790, 1.35, 0.25], [230, 2010, 1.2, 0.1], [860, 2030, 1.7, -0.1]][i];
        const x = x0 + (x0 < 540 ? -out : out) + 6 * Math.sin(t * 0.4 + i), y = y0 + out * 0.6 + (fyS - 1150) * 0.3;
        l.save(); l.translate(x, y); l.rotate(rot); l.scale(s, s); l.drawImage(g, -130, -110); l.restore();
        l.save(); l.globalCompositeOperation = 'lighter'; l.globalAlpha = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 2); l.fillStyle = E.rad(l, x - 30, y - 40, 0, 60, [[0, '#FFFFFF', 0.6], [1, '#FFFFFF', 0]]); l.fillRect(x - 90, y - 100, 120, 120); l.restore();
      });
      l.globalCompositeOperation = 'source-atop'; l.fillStyle = 'rgba(14,6,26,0.35)'; l.fillRect(0, 0, W, H);
    }, { lo: true, blur: 11, alpha: 0.8 * a });
  }
  function spotMotes(h, t, x, ytop, ybot, k) {
    if (k <= 0.01) return;
    h.save(); h.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 28; i++) {
      const u = ((E.hash(i, 81) + t * (0.02 + 0.02 * E.hash(i, 82))) % 1), y = lerp(ytop, ybot, u), hw = lerp(60, 380, u) * 0.8;
      const px = x + (E.hash(i, 83) * 2 - 1) * hw + 14 * Math.sin(t * 0.7 + i), tw = 0.5 + 0.5 * Math.sin(t * 2.3 + i * 1.9);
      h.globalAlpha = k * tw * 0.7 * Math.sin(PI * u); h.fillStyle = E.rad(h, px, y, 0, 4, [[0, '#FFF4D6', 1], [1, '#FFE9A8', 0]]); h.fillRect(px - 4, y - 4, 8, 8);
    }
    h.restore();
  }
  function drawReflection(ctx, c, draws, alpha) {
    const fyS = toScr(c, CX, FY)[1];
    if (alpha <= 0.003 || fyS > H + 10) return;
    E.layer(ctx, (l) => {
      fresh(l, true);
      l.save(); applyCam(l, c, 1); l.beginPath(); l.rect(-3000, FY, 7000, 5000); l.clip(); l.translate(0, 2 * FY); l.scale(1, -1); draws(l); l.restore();
      l.setTransform(0.5, 0, 0, 0.5, 0, 0); l.globalCompositeOperation = 'destination-in';
      l.fillStyle = E.lin(l, 0, fyS, 0, fyS + 430, [[0, '#000', 0.9], [1, '#000', 0]]); l.fillRect(0, 0, W, H);
    }, { lo: true, blur: 3, alpha });
  }

  /* --- kaleidoscope (16 mirrored wedges of 22.5°) --- */
  let KA = null, KB = null;
  function kaleido(ctx, t, k) {
    if (k <= 0.003) return;
    const s = 1040, hr = s / 2, cx = 540, cy = 760;
    if (!KA) { KA = E.canvas(s, s); KB = E.canvas(s, s); }
    const a = KA.x, b = KB.x;
    a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'copy'; a.globalAlpha = 1; a.filter = 'none';
    // source: zoomed slice of the frame (slightly magnified + turning)
    const mag = 1.25 + 0.6 * clamp((t - 27.45) / 0.5);
    a.translate(hr, hr); a.rotate(t * 1.6); a.scale(mag, mag); a.drawImage(ctx.canvas, cx - hr, cy - hr, s, s, -hr, -hr, s, s);
    a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'source-over';
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.globalAlpha = 1; b.clearRect(0, 0, s, s);
    const wa = TAU / 8, spin = -t * 0.9;
    for (let i = 0; i < 8; i++) {
      b.save(); b.translate(hr, hr); b.rotate(spin + i * wa); if (i % 2) { b.rotate(wa); b.scale(1, -1); }
      b.beginPath(); b.moveTo(0, 0); b.arc(0, 0, hr * 1.02, -0.004, wa + 0.004); b.closePath(); b.clip();
      b.drawImage(KA.c, -hr, -hr);
      b.restore();
    }
    // soft circular mask
    b.globalCompositeOperation = 'destination-in';
    b.fillStyle = E.rad(b, hr, hr, hr * 0.62, hr, [[0, '#000', 1], [1, '#000', 0]]); b.fillRect(0, 0, s, s);
    b.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = k;
    ctx.drawImage(KB.c, cx - hr, cy - hr);
    // chromatic fringe (≤0.3 s): offset warm/cool copies, additive and faint
    const ch = E.env(t, 27.5, 27.82, 0.08, 0.12);
    if (ch > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16 * ch * k; ctx.drawImage(KB.c, cx - hr - 4, cy - hr); ctx.drawImage(KB.c, cx - hr + 4, cy - hr + 1); }
    ctx.restore();
  }

  /* ------------------------------ scene ------------------------------ */
  E.scene({
    id: 'F_kiymet', t0: T0, t1: T1,
    async setup() {
      SP.parch = makeParchment();
      SP.dome = makeDome();
      SP.plinth = makePlinth();
      SP.mist = makeMist();
      SP.med = []; for (let i = 0; i < 8; i++) SP.med.push(makeMedallion(i));
      JEWEL.forEach(makeBokeh); ['#FF3D6E', '#FFCF5A', '#B47CFF', '#FF8AA8'].forEach(makeHexBokeh);
      SP.drape = makeDrape();
      SP.marble = makeMarble();
      SP.fg = [makeFgGem('#FF8AA8', '#FF3D6E', '#7A0828', 8), makeFgGem('#7AF0C8', '#2EE6A6', '#0A5A40', 6), makeFgGem('#9CC4FF', '#4C8DFF', '#142A6A', 8), makeFgGem('#FFF0B0', '#FFCF5A', '#7A5010', 6)];
      initBokeh();
      SP.sil = A.heroRoseSilhouette(R, 1, { variant: 'gem' });
    },
    post(T) {
      const t = clamp(T, T0, T1);
      const flash = E.env(t, 22.84, 23.4, 0.06, 0.4), ib = E.env(t, 27.0, 28.15, 0.3, 0.3) * 0.6, par = P(t, 28.05, 28.4);
      return { bloom: lerp(0.42 + 0.22 * flash + 0.3 * ib, 0.3, par), vignette: lerp(0.34, 0.18, par), grain: 0.05 };
    },
    draw(ctx, T) {
      const t = clamp(T, T0, T1);
      const c = camF(t), rcy = c.rcy, lift = liftE(t);
      const bgK = lerp(0.25, 1, ez.outSine(clamp((t - 22.3) / 0.85)));
      const warm = P(t, 27.7, 28.1, 'inOutSine');
      const vis = bgK * (1 - P(t, 27.8, 28.05));
      const hero = (fn) => { ctx.save(); applyCam(ctx, c, 1); fn(ctx); ctx.restore(); };

      /* L0 back wall of the treasury (violet lacquer) + glow behind the gem */
      const top = E.mix(E.mix('#05101A', '#160F38', bgK), '#FFE9C8', warm * 0.8), mid = E.mix(E.mix('#05101A', '#34206B', bgK), '#FFF1DA', warm * 0.8), bot = E.mix(E.mix('#05101A', '#5E2C86', bgK), '#FFE2C0', warm * 0.8);
      ctx.fillStyle = E.lin(ctx, 0, 0, 0, H, [[0, top], [0.55, mid], [1, bot]]); ctx.fillRect(0, 0, W, H);
      { const rs = toScr(c, CX, rcy); ctx.fillStyle = E.rad(ctx, rs[0], rs[1], 0, 820, [[0, '#8A4FFF', 0.34 * bgK * (1 - warm)], [0.45, '#5E2C86', 0.17 * bgK], [1, '#5E2C86', 0]]); ctx.fillRect(0, 0, W, H); }

      /* L1 carved girih wall catching the god-rays · far bokeh · velvet drapes */
      const spotK = P(t, 23.3, 24.1) * vis, rayK = P(t, 23.88, 24.25, 'outCubic') * vis * (1 - 0.5 * P(t, 27.05, 27.5));
      drawWall(ctx, t, c, Math.max(rayK, 0.35 * P(t, 22.6, 23.2) * vis), vis);
      drawBokeh(ctx, t, c, (p) => p < 1, vis);
      /* L2 spotlight (volumetric, with motes) + god rays — behind the drapes */
      hero((h) => { drawSpot(h, t, CX, FY, spotK); drawRays(h, t, CX, rcy, rayK); });
      drawDrapes(ctx, t, c, bgK * (1 - P(t, 27.4, 27.75)));

      /* L2.5 octagram + lens ring + ornaments (behind & around) */
      const orbA = 0.06 * (t - 26.0) + 1.1 * ez.inCubic(clamp((t - 27.0) / 0.9));
      const rOrb = lerp(325, 285, P(t, 27.02, 27.45));
      const octK = P(t, 26.12, 26.75, 'outCubic'), lens = P(t, 27.0, 27.3), ornOut = 1 - P(t, 27.55, 27.85);
      hero((h) => {
        if (octK > 0) {
          h.save(); h.globalAlpha *= (0.55 - 0.35 * lens) * ornOut;
          E.at(h, CX, rcy, 1, 0, (cc) => star8a(cc, { r: rOrb, open: 0, draw: octK, girih: false, glow: 0.4, lineW: 2, rot: orbA + PI / 8 }));
          h.restore();
          h.save(); h.globalAlpha *= octK * ornOut; h.beginPath(); h.arc(CX, rcy, rOrb, 0, TAU);
          h.globalCompositeOperation = 'lighter'; h.strokeStyle = E.rgba('#FFCF5A', 0.08 + 0.25 * lens); h.lineWidth = 10 + 18 * lens; h.stroke();
          h.globalCompositeOperation = 'source-over'; h.strokeStyle = E.rgba('#FFE9A8', 0.35 + 0.55 * lens); h.lineWidth = 1.4 + 2.4 * lens; h.stroke();
          h.restore();
        }
      });

      /* L3 hero: lacquered floor + reflections, plinth rising out of the floor, gem, rose, iris */
      const pk = P(t, 23.4, 23.84, 'outCubic');
      const py = t < 23.84 ? lerp(FY + 8, baseRCY(23.84) + 0.36 * R, pk) : baseRCY(t) + 0.36 * R;
      const envA = 1 - P(t, 27.5, 27.8);
      const gRose = (h) => {
        const gA = clamp((t - 22.86) / 0.12);
        if (gA <= 0) return;
        const g = ez.outBack(clamp((t - 22.86) / 0.58), 1.5), sc = lerp(0.22, 1, g);
        const bloom = lerp(0.12, 1, ez.outCubic(clamp((t - 22.86) / 0.75)));
        // 'ibret': the gem-rose's own facets rotate open (spin + spread) around an opening heart of light
        const spin = 0.5 * ez.inCubic(clamp((t - 26.95) / 0.3)) + 2.4 * ez.inOutCubic(clamp((t - 27.1) / 1.0)), swell = (1 + 0.12 * P(t, 26.95, 27.24)) * (1 + 0.5 * P(t, 27.15, 27.95));
        h.save(); h.globalAlpha *= gA;
        E.at(h, CX, rcy, sc * swell, spin, (cc) => { cc.translate(0, 0.16 * R); A.heroRose(cc, { R, bloom, variant: 'gem', t, tilt: 0.85 }); });   // spins about its visual centre
        h.restore();
        return sc;
      };
      const gPlinth = (h) => {
        if (pk <= 0) return;
        const pl = SP.plinth, PS = 0.78;
        h.save(); h.beginPath(); h.rect(-3000, -3000, 7000, 3000 + FY); h.clip();
        h.drawImage(pl.c, CX - pl.ax * PS, py - pl.ay * PS, pl.c.width / pl.sc * PS, pl.c.height / pl.sc * PS);
        h.globalCompositeOperation = 'lighter';
        h.fillStyle = E.rad(h, CX, py + 4, 0, 130, [[0, '#FF5A84', 0.1 * P(t, 23.75, 24.0)], [1, '#FF5A84', 0]]); h.fillRect(CX - 140, py - 60, 280, 140);
        h.restore();
      };
      hero((h) => { h.save(); h.globalAlpha *= envA; drawFloor(h, t, bgK); h.restore(); });
      drawReflection(ctx, c, (l) => { gPlinth(l); gRose(l); }, 0.34 * envA * bgK);
      hero((h) => {
        h.save(); h.globalAlpha *= envA;
        gPlinth(h);
        // emergence: light ring on the floor around the rising plinth
        const er = E.env(t, 23.36, 24.3, 0.12, 0.5);
        if (er > 0) { h.save(); h.globalCompositeOperation = 'lighter'; h.translate(CX, FY); h.scale(1, 0.16); h.strokeStyle = E.rgba('#FFCF5A', 0.55 * er); h.lineWidth = 14; h.beginPath(); h.arc(0, 0, 150 + 120 * P(t, 23.36, 24.3, 'outCubic'), 0, TAU); h.stroke(); h.restore(); }
        // low haze on the floor
        h.globalAlpha *= 0.5; for (const [dx, sp] of [[0, 9], [260, -6]]) { const mx = ((dx + t * sp) % 700 + 700) % 700 - 350; h.drawImage(SP.mist, CX - 700 + mx * 0.3, FY - 330, 1400, 600); }
        h.restore();
      });
      hero((h) => {
        // gem (E handoff) → unfolds
        const morph = A.morphEase(clamp((t - 22.34) / 0.12), 0.08), unfold = clamp((t - 22.86) / 0.36);
        const ep = t < 22.47 ? emberPos(t) : [CX, rcy], gr = lerp(6.5, 34, ez.outCubic(clamp((t - 22.2) / 0.27)));
        drawGem(h, t, ep[0], ep[1], gr, morph, unfold, 1);
        // flash
        const fl = E.env(t, 22.84, 23.3, 0.05, 0.38);
        if (fl > 0) {
          const u = clamp((t - 22.84) / 0.5);
          S.sparkle(h, CX, rcy, 150 * fl, fl, '#FFF4E8', 0.3);
          h.save(); h.globalCompositeOperation = 'lighter'; h.strokeStyle = E.rgba('#FFE9A8', 0.6 * (1 - u)); h.lineWidth = 3 + 6 * (1 - u); h.beginPath(); h.arc(CX, rcy, 40 + 360 * ez.outCubic(u), 0, TAU); h.stroke(); h.restore();
        }
        // gem rose (+ its opening heart from 27.1) + facet glints
        const ah = R * (1 + 0.12 * P(t, 26.95, 27.24)) * (1 + 0.5 * P(t, 27.15, 27.95)) * (0.38 * ez.inOutCubic(clamp((t - 27.1) / 0.55)) + 0.9 * ez.inOutCubic(clamp((t - 27.72) / 0.4)));
        let rsc;
        if (ah > 0.5) {
          h.save(); h.fillStyle = E.rad(h, CX, rcy, 0, ah * 1.15, [[0, '#FFF6E2'], [0.55, '#FFE9C4'], [1, '#F7C890']]); h.beginPath(); h.arc(CX, rcy, ah * 1.15, 0, TAU); h.fill();
          E.at(h, CX, rcy, 1, -t * 0.6, (cc) => star8a(cc, { r: ah * 0.5, open: 1, draw: 1, glow: 0.3, lineW: Math.max(1.4, ah * 0.02), col: '#B08030' })); h.restore();
          const m = h.getTransform();
          E.layer(h, (l) => { fresh(l, false); l.setTransform(m); rsc = gRose(l); l.globalCompositeOperation = 'destination-out'; l.fillStyle = E.rad(l, CX, rcy, ah * 0.7, ah, [[0, '#000', 1], [1, '#000', 0]]); l.fillRect(CX - ah - 4, rcy - ah - 4, 2 * ah + 8, 2 * ah + 8); });
          h.save(); h.globalCompositeOperation = 'lighter'; h.fillStyle = E.rad(h, CX, rcy, ah * 0.6, ah * 1.5, [[0, '#FFE9C8', 0.18], [1, '#FF8AA8', 0]]); h.fillRect(CX - ah * 1.7, rcy - ah * 1.7, ah * 3.4, ah * 3.4); h.restore();
        } else rsc = gRose(h);
        if (rsc > 0.7) {
          const gA = 1 - P(t, 27.1, 27.4);
          const pts = []; for (let i = 0; i < 128; i += 11) { const p = SP.sil[i]; pts.push([CX + p[0] * 0.78 * rsc, rcy + 0.16 * R * rsc + p[1] * 0.78 * rsc]); }
          h.save(); h.globalAlpha *= gA; A.glints(h, t, { pts, seed: 4, r: 13, col: '#FFFFFF', period: 1.5, duty: 0.32 }); h.restore();
        }
        // life ring + sparks + shed
        drawLifeRing(h, t, CX, rcy);
        drawShed(h, t, CX, rcy);
        // ornaments: faceted jewels on the orbit (offset 22.5° so none sits on the plinth or the tassels)
        for (let i = 0; i < 8; i++) {
          const pk = clamp((t - (26.03 + i * 0.06)) / 0.5);
          if (pk <= 0) continue;
          const s = ez.outBack(pk, 1.5) * lerp(1.0, 0.86, lens), rr = lerp(150, rOrb, ez.outCubic(pk));
          const a = -PI / 2 + PI / 8 + i * PI / 4 + orbA;
          const x = CX + Math.cos(a) * rr, y = rcy + Math.sin(a) * rr + 3 * Math.sin(t * 1.7 + i);
          const m = SP.med[i], dw = (m.size * s);
          h.save(); h.globalAlpha *= ornOut;
          { const gr = 100 * Math.max(0.05, s); h.save(); h.globalCompositeOperation = 'lighter'; h.fillStyle = E.rad(h, x, y, 0, gr, [[0, STONE[i], 0.32 + 0.25 * lens], [1, STONE[i], 0]]); h.fillRect(x - gr, y - gr, 2 * gr, 2 * gr); h.restore(); }
          h.translate(x, y); h.rotate(0.05 * Math.sin(t * 1.3 + i * 0.8));
          h.drawImage(m.c, -dw / 2, -dw / 2, dw, dw);
          h.restore();
          if (pk < 1) softGlint(h, x, y, 70 * (1 - pk), (1 - pk) * 0.8 * ornOut, '#FFF4D2');
          const gl = Math.pow(E.osc(t, 1.7 + i * 0.13, i * 0.37), 6);
          softGlint(h, x - 22 * s, y - 24 * s, 16 * s, gl * ornOut);
        }
      });

      /* L5 near: jewels lying on the floor close to the lens (blurred) + facet bokeh */
      drawFgGems(ctx, t, c, bgK * (1 - P(t, 27.35, 27.7)) * (1 - 0.45 * bandGuard(t)));
      drawBokeh(ctx, t, c, (p) => p > 1, vis);

      /* dive: kaleidoscope + ivory flood */
      const kk = E.env(t, 27.38, 28.04, 0.22, 0.22);
      if (kk > 0) kaleido(ctx, t, kk);
      // whiteout: the whole frame floods evenly to warm ivory (no gloss is up any more)
      const fl2 = P(t, 27.8, 28.12, 'inOutSine');
      if (fl2 > 0) { ctx.save(); ctx.globalAlpha = fl2; ctx.fillStyle = '#FFF6E6'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      // band scrim during the gloss (violet, feathered)
      const g = bandGuard(t) * (1 - warm);
      if (g > 0) { ctx.save(); ctx.translate(540, 1400); ctx.scale(1, 220 / 640); ctx.fillStyle = E.rad(ctx, 0, 0, 0, 640, [[0, '#0A0618', 0.2 * g], [1, '#0A0618', 0]]); ctx.fillRect(-640, -640, 1280, 1280); ctx.restore(); }

      /* G handoff: parchment + footnote star */
      const pa = P(t, 28.12, 28.42, 'inOutSine');
      if (pa > 0) {
        const d = camDrift(t);
        const sz = seamZoom(t);
        drawParchment(ctx, SP.parch, (cx) => { cx.translate(540 + d.x, 760 + d.y); cx.rotate(d.r); cx.scale(sz, sz); cx.translate(-540, -760); }, pa);
        const sa = P(t, 28.2, 28.5, 'outCubic');
        ctx.save(); ctx.translate(540 + d.x, 760 + d.y); ctx.rotate(d.r); ctx.scale(sz, sz); ctx.translate(-540, -760);
        E.at(ctx, 540, 760, lerp(0.6, 1, ez.outBack(sa)), 0, (cc) => drawFootStar(cc, t, 0, 0, 60, sa * pa));
        footMotes(ctx, t, 540, 760, sa * pa);
        ctx.restore();
      }
    },
  });
})();
