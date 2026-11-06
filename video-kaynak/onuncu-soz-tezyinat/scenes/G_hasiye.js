/* =============================================================================
 * G_hasiye · 28.50–37.80 · "Hâşiye. Evet, madem her şeyin kıymeti ve dekaik-ı sanatı gayet yüksek ve güzel
 *                           olduğu halde müddeti kısa, ömrü azdır."
 * -----------------------------------------------------------------------------
 * PLAN (world = page px; SC = star/window centre (540,760); RW = window radius 420)
 *  Part 1 parchment (identical to F's last frames): gradient + fibres + double-rule page frame · Star8 r40.
 *   28.85 Star8 OPENS r40→420 (outBack), girih extensions grow · footnote rule draws x140→940 @ y1180
 *   29.36 interior becomes a recessed window: walnut shutters (gold girih + the star's inner geometry, same
 *         lines as A.star8 open=1) grow radially from the centre; gold bevel frame (16-gon = union of the two
 *         squares) · 30.18 click → shutters slide apart, light slit, warm light spills onto the page
 *   niche = dark velvet jewel-box with warm top light and drifting motes
 *   30.79 six masterpieces pop (0.08 s): sapphire butterfly, peacock feather, snowflake / nautilus, cut
 *         pomegranate, tulip · 31.37 gold halos + tiny Star8 seals · cam 1.05→1.1 drifting to the butterfly
 *  Part 2 macro (signature #4): 32.08–33.40 log zoom Z 1.1→40 (+ slow creep to 34.49) into the butterfly's
 *   forewing, locked to screen (540,700). Layers by zoom: gallery → iridescent scale shingles (3 mip tiles,
 *   ridges in the big one, masked by the wing itself) → girih tessellation (A.girih iridescent, own circular
 *   lens mask) fading in Z 15–30 · 32.60 "sanatı": light runs along the scale ridges · 33.23 relief rises +
 *   central rosette blooms + rings of light sweep out · 34.10 hue wave + glints (bloom .72) ·
 *   34.49–35.13 fast reverse to the gallery; frost creeps in from the left (#DDEFFF/#A8D4F5/#6E9CC9 + crystals).
 *  Part 3: 35.42 push toward the snowflake → melts to a droplet → mist wisps; butterfly scatters into glitter,
 *   tulip droops and drops petals, pomegranate seeds dull · 36.27–36.79 halos shrink to a dot and blink out
 *   (peacock last, on "azdır") · each item leaves a ghost outline (local helper: silhouette → eroded edge
 *   + glow, 'lighter') · 37.12 slight pull back · 37.22 gold girih grille in the window · 37.28 the page falls
 *   into the bazaar's evening (#241634/#4A2A45/#6E3B3B) while the H vitrine (same A.archGate w1000 h970 @
 *   (540,1150) as H) appears inside the window · 37.42–37.80 we fly forward THROUGH the window (z ×2.6): grille
 *   → walnut kafes (2→14 px, blurred, opening in the centre) passing the camera; ghosts glide to H's hand-off
 *   points (H_numune ITEMS[].g at 37.60) and follow H's own path toward the shelves.
 *  Gloss 32.07–34.16: lower page in shadow before the zoom covers it; macro view is a circular lens field that
 *   falls off before the band + soft scrim ≤0.22.
 * ========================================================================== */
(function () {
  'use strict';
  const W = E.W, H = E.H, TAU = Math.PI * 2, PI = Math.PI;
  const clamp = E.clamp, lerp = E.lerp, sm = E.smooth, ez = E.ease;
  const P = (t, a, b, e) => E.p(t, a, b, e || 'inOutCubic');
  const T0 = 28.5, T1 = 37.8, SCX = 540, SCY = 760, RW = 420;
  const SP = {};
  /** pooled layer buffers may carry a stale clip from elsewhere: start every layer from a clean state */
  const fresh = (l, lo) => { if (l.reset) { l.reset(); if (lo) l.setTransform(0.5, 0, 0, 0.5, 0, 0); } };

  /* ======================= shared with F_kiymet (keep identical) ======================= */
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
  const lg = Math.log;

  /* ---------------------------- layout ---------------------------- */
  const ITEMS = [
    { k: 'bf', x: 305, y: 640, pop: 30.79, out: 36.41 },
    { k: 'pea', x: 540, y: 636, pop: 30.87, out: 36.79 },
    { k: 'snow', x: 775, y: 640, pop: 30.95, out: 36.27 },
    { k: 'naut', x: 305, y: 884, pop: 31.03, out: 36.68 },
    { k: 'pom', x: 540, y: 884, pop: 31.11, out: 36.59 },
    { k: 'tul', x: 775, y: 884, pop: 31.19, out: 36.50 },
  ];
  const SLOTS = [[292, 560], [540, 560], [788, 560], [292, 780], [540, 780], [788, 780]];
  const BF = { s: 70, rot: -0.12 };
  const WB = (() => { const lx = 0.55 * BF.s, ly = -0.45 * BF.s, c = Math.cos(BF.rot), s = Math.sin(BF.rot); return [ITEMS[0].x + lx * c - ly * s, ITEMS[0].y + lx * s + ly * c]; })();
  const STAR16 = (() => { const o = []; for (let k = 0; k < 16; k++) { const a = k * PI / 8 + (k % 2 ? 0 : 0), rr = k % 2 ? RW : RW * 0.76537; o.push([SCX + Math.cos(a) * rr, SCY + Math.sin(a) * rr]); } return o; })();
  // inner vertices at 0°,45°,… (r .765·RW); outer at 22.5°+k·45° (RW) — matches A.star8 open=1
  const starPath = (inset = 0) => { const p = new Path2D(); STAR16.forEach((q, i) => { const x = SCX + (q[0] - SCX) * (1 - inset), y = SCY + (q[1] - SCY) * (1 - inset); i ? p.lineTo(x, y) : p.moveTo(x, y); }); p.closePath(); return p; };

  /* ---------------------------- camera ---------------------------- */
  function macroM(t) { return P(t, 32.08, 33.4, 'inOutSine') * (1 - P(t, 34.49, 35.13, 'inOutCubic')); }
  function camG(t) {
    const d = camDrift(t);
    const zb = 1 + 0.05 * P(t, 28.93, 29.5) + 0.05 * P(t, 30.23, 31.9);
    let fx = SCX - 22 * P(t, 30.23, 31.9) * (1 - P(t, 34.6, 35.2)), fy = SCY - 14 * P(t, 30.23, 31.9) * (1 - P(t, 34.6, 35.2));
    let sx = SCX, sy = SCY;
    // snowflake push
    const sp = E.env(t, 35.42, 36.42, 0.5, 0.36);
    fx = lerp(fx, ITEMS[2].x, 0.42 * sp); fy = lerp(fy, ITEMS[2].y, 0.42 * sp);
    let z = zb * (1 + 0.2 * sp);
    // end: pull back, then fly forward through the window
    const pb = P(t, 37.12, 37.5), rush = ez.inCubic(clamp((t - 37.42) / 0.38));
    z *= lerp(1, 0.92, pb) * (1 + 1.6 * rush);
    // macro
    const m = macroM(t), mf = sm(clamp(m * 3.2));
    fx = lerp(fx, WB[0], mf); fy = lerp(fy, WB[1], mf); sx = lerp(sx, 540, mf); sy = lerp(sy, 700, mf);
    const slow = lg(1.22) * P(t, 33.35, 34.49, 'inOutSine') * (1 - P(t, 34.49, 34.9));
    z = z * Math.exp(m * lg(40 / zb) + slow);
    const dd = 1 - mf;
    return { fx, fy, sx: sx + d.x * dd, sy: sy + d.y * dd, z, rot: d.r + 0.12 * m, m, mf };
  }
  function applyCam(ctx, c, p = 1) { const z = 1 + (c.z - 1) * p; ctx.translate(c.sx, c.sy); ctx.rotate(c.rot * p); ctx.scale(z, z); ctx.translate(-c.fx, -c.fy); }
  const toScreen = (c, x, y) => { const dx = (x - c.fx) * c.z, dy = (y - c.fy) * c.z, cs = Math.cos(c.rot), sn = Math.sin(c.rot); return [c.sx + dx * cs - dy * sn, c.sy + dx * sn + dy * cs]; };

  /* ---------------------------- items ---------------------------- */
  function drawItem(ctx, i, t, o = {}) {
    const it = ITEMS[i], bob = 2.2 * Math.sin(t * 1.4 + i * 1.1) * (o.still ? 0 : o.bobK === undefined ? 1 : o.bobK);
    if (it.k === 'bf') E.at(ctx, it.x, it.y + bob, 1, BF.rot, (c) => A.butterfly(c, { size: BF.s, pattern: 'sapphire', flap: o.flap === undefined ? 1 : o.flap, hz: 1e-4, t }));
    else if (it.k === 'pea') E.at(ctx, it.x + 6, it.y + 92 + bob, 1, 0.14, (c) => A.peacockFeather(c, { len: 188, t: o.still ? 0 : t }));
    else if (it.k === 'snow') E.at(ctx, it.x, it.y + bob, 1, 0, (c) => A.snowflake(c, { r: 68, melt: o.melt || 0, t: o.still ? 0 : t }));
    else if (it.k === 'naut') E.at(ctx, it.x, it.y + bob, 1, 0.08 * Math.sin(t * 0.6) * (o.still ? 0 : 1), (c) => A.nautilus(c, { r: 66 }));
    else if (it.k === 'pom') E.at(ctx, it.x, it.y + 6 + bob, 1, 0, (c) => A.pomegranate(c, { r: 60, cut: true, t: o.still ? 0 : t }));
    else E.at(ctx, it.x, it.y + 72 + bob, 1, o.droop || 0, (c) => A.flowerSet(c, { type: 'tulip', size: 54, stem: 70, t: o.still ? 0 : t, sway: o.still ? 0 : 1 }));
  }
  /** ghost outline helper: silhouette → (silhouette − eroded silhouette) + blurred glow + faint fill */
  function makeGhost(i) {
    const it = ITEMS[i], sc = 2, bw = 260, bh = 260, cw = bw * sc, ch = bh * sc;
    const src = E.canvas(cw, ch); src.x.scale(sc, sc); src.x.translate(bw / 2 - it.x, bh / 2 - it.y);
    drawItem(src.x, i, 0, { still: true, flap: 1 });
    const sil = E.canvas(cw, ch); sil.x.drawImage(src.c, 0, 0);
    const id = sil.x.getImageData(0, 0, cw, ch), dd = id.data;
    for (let p = 0; p < dd.length; p += 4) { const a = dd[p + 3] / 255, k = sm((a - 0.22) / 0.3); dd[p] = 255; dd[p + 1] = 246; dd[p + 2] = 224; dd[p + 3] = k * 255; }
    sil.x.putImageData(id, 0, 0);
    const er = E.canvas(cw, ch); er.x.drawImage(sil.c, 0, 0); er.x.globalCompositeOperation = 'destination-in';
    const dS = 2.6 * sc / 2;
    for (let k = 0; k < 8; k++) { const a = k * PI / 4; er.x.drawImage(sil.c, Math.cos(a) * dS, Math.sin(a) * dS); }
    const edge = E.canvas(cw, ch); edge.x.drawImage(sil.c, 0, 0); edge.x.globalCompositeOperation = 'destination-out'; edge.x.drawImage(er.c, 0, 0);
    const g = E.canvas(cw, ch);
    g.x.globalAlpha = 0.07; g.x.drawImage(sil.c, 0, 0);
    g.x.globalAlpha = 1; g.x.filter = 'blur(7px)'; g.x.drawImage(edge.c, 0, 0); g.x.drawImage(edge.c, 0, 0);
    g.x.filter = 'none'; g.x.drawImage(edge.c, 0, 0);
    return { c: g.c, w: bw, h: bh };
  }
  function drawGhost(ctx, i, x, y, s, a) {
    if (a <= 0.003) return;
    const g = SP.ghost[i];
    ctx.save(); ctx.globalAlpha *= a; ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(g.c, x - g.w / 2 * s, y - g.h / 2 * s, g.w * s, g.h * s);
    ctx.restore();
  }

  /* ---------------------------- sprites ---------------------------- */
  function makeNiche() {
    const s = 1.25, size = 880, cv = E.canvas(size * s, size * s), x = cv.x;
    x.scale(s, s); x.translate(size / 2 - SCX, size / 2 - SCY);
    const p = starPath(0); x.save(); x.clip(p);
    x.fillStyle = E.rad(x, SCX, SCY - 160, 40, 560, [[0, '#4E2C44'], [0.5, '#2E1A2E'], [1, '#170C18']]); x.fillRect(SCX - 440, SCY - 440, 880, 880);
    A.girih(x, { cx: SCX, cy: SCY, r: 430, cell: 96, lineW: 2.2, col: '#8A6428', vector: true, alpha: 0.22 });
    x.fillStyle = E.rad(x, SCX, SCY - 330, 0, 520, [[0, '#FFD9A0', 0.32], [0.5, '#FFB870', 0.1], [1, '#FFB870', 0]]); x.fillRect(SCX - 440, SCY - 440, 880, 880);
    for (const it of ITEMS) { x.fillStyle = E.rad(x, it.x, it.y + 70, 0, 90, [[0, '#08040A', 0.45], [1, '#08040A', 0]]); x.save(); x.translate(it.x, it.y + 70); x.scale(1, 0.32); x.beginPath(); x.arc(0, 0, 90, 0, TAU); x.restore(); x.fill(); }
    x.filter = 'blur(18px)'; x.lineWidth = 70; x.strokeStyle = 'rgba(8,3,10,0.75)'; x.stroke(p); x.filter = 'none';
    x.restore();
    return { c: cv.c, s, size };
  }
  function makeShutters() {
    const s = 1.25, size = 880, cv = E.canvas(size * s, size * s), x = cv.x;
    x.scale(s, s); x.translate(size / 2 - SCX, size / 2 - SCY);
    const p = starPath(0); x.save(); x.clip(p);
    x.fillStyle = E.rad(x, SCX - 120, SCY - 200, 30, 640, [[0, '#6A4226'], [0.55, '#4A2C1A'], [1, '#2A170C']]); x.fillRect(SCX - 440, SCY - 440, 880, 880);
    A.girih(x, { cx: SCX, cy: SCY, r: 430, cell: 84, lineW: 2.6, col: '#B8862E', vector: true, alpha: 0.75 });
    E.at(x, SCX, SCY, 1, 0, (c) => A.star8(c, { r: RW, open: 1, draw: 1, girih: false, lineW: 3.2, col: '#D8B26E' }));
    x.strokeStyle = 'rgba(20,8,2,0.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(SCX, SCY - RW); x.lineTo(SCX, SCY + RW); x.stroke();
    x.restore();
    return { c: cv.c, s, size };
  }
  function makeScaleTile(pw, detail) {
    const cols = 4, rows = 4, rh = Math.round(pw * 0.62), Wt = cols * pw, Ht = rows * rh, cv = E.canvas(Wt, Ht), x = cv.x;
    const L = rh * 1.78, hw = pw * 0.47;
    const shape = () => {
      const p = new Path2D(); p.moveTo(-hw * 0.8, 0); p.lineTo(hw * 0.8, 0);
      p.bezierCurveTo(hw * 0.96, L * 0.3, hw, L * 0.66, hw * 0.92, L * 0.84);
      const n = 4; let xa = hw * 0.92;
      for (let k = 0; k < n; k++) { const xb = hw * 0.92 - (k + 1) * (hw * 1.84 / n), xm = (xa + xb) / 2; p.quadraticCurveTo(xm, L * 1.03, xb, L * (k === n - 1 ? 0.84 : 0.9)); xa = xb; }
      p.bezierCurveTo(-hw, L * 0.66, -hw * 0.96, L * 0.3, -hw * 0.8, 0); p.closePath(); return p;
    };
    const shp = shape(), pal = ['#3A6BEF', '#4C8DFF', '#4FD6E8', '#6FF0FF', '#8A6CFF', '#B48CFF'];
    x.fillStyle = '#0B1A3A'; x.fillRect(0, 0, Wt, Ht);
    for (let r = rows + 1; r >= -2; r--) for (let c = -1; c <= cols; c++) {
      const ri = ((r % rows) + rows) % rows, ci = ((c % cols) + cols) % cols, h1 = E.hash(ci + ri * 7, 91), h2 = E.hash(ci + ri * 7, 92);
      const cx = (c + (ri & 1 ? 0.5 : 0) + 0.5) * pw, cy = r * rh - L * 0.08;
      const base = E.mix(pal[(h1 * 3) | 0], pal[3 + ((h2 * 3) | 0)], 0.25 + 0.5 * h2);
      x.save(); x.translate(cx, cy); x.rotate((h1 - 0.5) * 0.07);
      x.shadowColor = 'rgba(2,6,24,0.6)'; x.shadowBlur = pw * 0.14; x.shadowOffsetY = pw * 0.07;
      x.fillStyle = E.lin(x, 0, 0, 0, L, [[0, '#0E1847'], [0.35, E.shade(base, -0.25)], [0.8, base], [1, E.shade(base, 0.35)]]); x.fill(shp);
      x.shadowColor = 'rgba(0,0,0,0)';
      x.save(); x.clip(shp);
      x.fillStyle = E.lin(x, -hw, L * 0.2, hw, L * 0.9, [[0, '#FFFFFF', 0], [0.45, '#E8FDFF', 0], [0.55, '#E8FDFF', 0.22 + 0.15 * h1], [0.68, '#E8FDFF', 0], [1, '#FFFFFF', 0]]); x.fillRect(-hw, 0, 2 * hw, L * 1.1);
      if (detail > 0) {
        const n = 13, sp = (2 * hw) / n;
        x.lineWidth = Math.max(0.6, sp * 0.22);
        for (let k = 0; k <= n; k++) { const xx = -hw + k * sp; x.strokeStyle = 'rgba(4,10,40,0.38)'; x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx * 0.96, L); x.stroke(); x.strokeStyle = 'rgba(210,250,255,0.28)'; x.beginPath(); x.moveTo(xx + sp * 0.35, 0); x.lineTo((xx + sp * 0.35) * 0.96, L); x.stroke(); }
        if (detail > 1) { x.strokeStyle = 'rgba(200,240,255,0.14)'; x.lineWidth = Math.max(0.5, sp * 0.1); for (let k = 0; k < n; k++) for (let y = sp; y < L; y += sp * 0.8) { const xx = -hw + (k + 0.5) * sp; x.beginPath(); x.moveTo(xx - sp * 0.3, y); x.lineTo(xx + sp * 0.3, y); x.stroke(); } }
      }
      x.restore();
      x.strokeStyle = E.rgba(E.shade(base, 0.55), 0.6); x.lineWidth = Math.max(0.8, pw * 0.012); x.stroke(shp);
      x.restore();
    }
    return { c: cv.c, pw };
  }
  function makeFrost() {
    const cv = E.canvas(1200, 2100), x = cv.x, rnd = E.rng(3301);
    x.lineCap = 'round';
    const br = (px, py, a, len, w, d) => {
      if (len < 4 || d > 5) return;
      const ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len;
      x.strokeStyle = `rgba(255,255,255,${0.55 + 0.08 * (5 - d)})`; x.lineWidth = w; x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke();
      const nb = 3 + ((rnd() * 3) | 0);
      for (let k = 1; k <= nb; k++) { const f = k / (nb + 1), qx = px + (ex - px) * f, qy = py + (ey - py) * f, l2 = len * (0.42 - 0.25 * f) * (0.7 + 0.5 * rnd()); br(qx, qy, a + PI / 3, l2, w * 0.62, d + 1); br(qx, qy, a - PI / 3, l2, w * 0.62, d + 1); }
    };
    const seeds = () => {
      for (let i = 0; i < 18; i++) { const py = 40 + i * 116 + rnd() * 60; br(-10, py, (rnd() - 0.5) * 0.9, 170 + rnd() * 190, 3, 0); }
      for (let i = 0; i < 8; i++) br(rnd() * 900, 2110, -PI / 2 + (rnd() - 0.5) * 0.8, 130 + rnd() * 150, 2.6, 0);
      for (let i = 0; i < 7; i++) br(rnd() * 900, -10, PI / 2 + (rnd() - 0.5) * 0.8, 130 + rnd() * 120, 2.6, 0);
      for (let i = 0; i < 26; i++) { const px = 80 + rnd() * 1040, py = 80 + rnd() * 1940, n = 6; for (let k = 0; k < n; k++) br(px, py, k * TAU / n + rnd() * 0.2, 26 + rnd() * 34, 1.6, 2); }
    };
    seeds();
    const g = E.canvas(1200, 2100); g.x.filter = 'blur(5px)'; g.x.globalAlpha = 0.9; g.x.drawImage(cv.c, 0, 0); g.x.filter = 'none'; g.x.globalAlpha = 1; g.x.drawImage(cv.c, 0, 0);
    return g.c;
  }

  /* ---------------------------- pieces ---------------------------- */
  function drawFrame(ctx, a, t) {
    if (a <= 0) return;
    const p = starPath(0), p2 = starPath(0.034);
    ctx.save(); ctx.globalAlpha *= a; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(58,36,8,0.55)'; ctx.lineWidth = 11; ctx.stroke(p);
    ctx.strokeStyle = goldGrad(ctx, SCX - RW, SCY - RW, SCX + RW, SCY + RW); ctx.lineWidth = 6.5; ctx.stroke(p);
    ctx.strokeStyle = 'rgba(255,248,222,0.85)'; ctx.lineWidth = 1.6; ctx.stroke(p);
    ctx.strokeStyle = E.rgba('#D8B26E', 0.75); ctx.lineWidth = 1.4; ctx.stroke(p2);
    // shimmer travelling along the frame
    const k = (t * 0.22) % 1, q = STAR16[Math.floor(k * 16)];
    ctx.restore();
    if (q) S.sparkle(ctx, q[0], q[1], 14, 0.55 * a * Math.pow(Math.sin(k * 16 % 1 * PI), 2), '#FFF6E0', t);
  }
  function drawScales(ctx, t, c, alpha) {
    if (alpha <= 0.003) return;
    const sw = 4.2, s = sw * c.z, rM = Math.min(70 * c.z, 1100);
    const lv = SP.tiles, lz = lg(c.z);
    const pick = s < 36 ? [[0, 1]] : s < 46 ? [[0, 1 - (s - 36) / 10], [1, (s - 36) / 10]] : s < 104 ? [[1, 1]] : s < 122 ? [[1, 1 - (s - 104) / 18], [2, (s - 104) / 18]] : [[2, 1]];
    E.layer(ctx, (l) => {
      fresh(l, false);
      for (const [li, w] of pick) {
        if (w <= 0.01) continue;
        const tile = lv[li], k = s / tile.pw;
        const pat = l.createPattern(tile.c, 'repeat');
        pat.setTransform(new DOMMatrix().translate(c.sx, c.sy).rotate((c.rot - 0.5) * 180 / PI).scale(k).translate(-37, -11));
        l.globalAlpha = w; l.fillStyle = pat; l.fillRect(0, 0, W, H);
      }
      l.globalAlpha = 1;
      // iridescent drift + sheen
      l.globalCompositeOperation = 'soft-light';
      const ph = t * 0.6 + lz * 0.8, ca = Math.cos(ph), sa = Math.sin(ph);
      l.fillStyle = E.lin(l, c.sx - ca * 900, c.sy - sa * 900, c.sx + ca * 900, c.sy + sa * 900, [[0, '#6FF0FF', 0.45], [0.35, '#4C8DFF', 0.35], [0.65, '#B48CFF', 0.4], [1, '#6FF0FF', 0.45]]); l.fillRect(0, 0, W, H);
      l.globalCompositeOperation = 'screen';
      const sx = c.sx + Math.sin(t * 1.3) * 500;
      l.fillStyle = E.lin(l, sx - 300, 0, sx + 300, H, [[0, '#FFFFFF', 0], [0.5, '#DFFBFF', 0.14], [1, '#FFFFFF', 0]]); l.fillRect(0, 0, W, H);
      const sw2 = clamp((t - 32.6) / 0.45);
      if (sw2 > 0 && sw2 < 1) { // "sanatı": light runs along the scale ridges
        const bx = lerp(-700, W + 700, ez.inOutSine(sw2));
        l.fillStyle = E.lin(l, bx - 260, H * 0.2, bx + 260, H * 0.8, [[0, '#FFE66D', 0], [0.45, '#FFF6C8', 0.5], [0.55, '#FFFFFF', 0.6], [1, '#FFE66D', 0]]); l.fillRect(0, 0, W, H);
      }
      l.globalCompositeOperation = 'destination-in';
      l.fillStyle = E.rad(l, c.sx, c.sy, rM * 0.55, rM, [[0, '#000', 1], [1, '#000', 0]]); l.fillRect(0, 0, W, H);
      // only on the wing while the wing is smaller than the frame
      const wm = 1 - sm((lz - lg(22)) / (lg(34) - lg(22)));
      if (wm > 0.01) {
        E.layer(l, (b) => {
          fresh(b, false);
          if (wm < 1) { b.fillStyle = E.rgba('#000', 1 - wm); b.fillRect(0, 0, W, H); }
          b.save(); applyCam(b, c); drawItem(b, 0, t, { flap: 1, bobK: 1 - c.mf }); b.restore();
        }, { op: 'destination-in' });
      }
    }, { alpha });
  }

  /* ---------------------------- scene ---------------------------- */
  E.scene({
    id: 'G_hasiye', t0: T0, t1: T1,
    async setup() {
      SP.parch = makeParchment();
      SP.niche = makeNiche();
      SP.shut = makeShutters();
      SP.tiles = [makeScaleTile(40, 0), makeScaleTile(110, 1), makeScaleTile(300, 2)];
      SP.frost = makeFrost();
      SP.ghost = ITEMS.map((_, i) => makeGhost(i));
    },
    post(T) {
      const t = clamp(T, T0, T1), m = macroM(t);
      const hw = E.env(t, 34.05, 34.75, 0.12, 0.4), end = P(t, 37.4, 37.8);
      return { bloom: lerp(0.3 + 0.08 * P(t, 30.2, 30.8), 0.5, sm(m * 2)) + 0.22 * hw + 0.08 * end, vignette: lerp(lerp(0.18, 0.34, sm(m * 2)), 0.3, end), grain: 0.05 };
    },
    draw(ctx, T) {
      const t = clamp(T, T0, T1);
      const c = camG(t), Z = c.z, lz = lg(Z);
      const world = (fn) => { ctx.save(); applyCam(ctx, c); fn(ctx); ctx.restore(); };
      const macroBG = sm((lz - lg(6)) / (lg(15) - lg(6)));
      const endK = P(t, 37.42, 37.78, 'inOutSine');

      /* ---- page ---- */
      if (macroBG < 1) {
        drawParchment(ctx, SP.parch, (cx) => applyCam(cx, c));
        // frost creeping in from the left (34.6 →): only the edges and corners, crystals as wisps
        const fk = clamp((t - 34.55) / 2.0);
        if (fk > 0) {
          const e = ez.inOutSine(fk);
          E.layer(ctx, (l) => {
            fresh(l, false);
            l.globalAlpha = 0.55; l.fillStyle = E.lin(l, 0, 0, 0, H, [[0, '#DDEFFF'], [0.55, '#A8D4F5'], [1, '#6E9CC9']]); l.fillRect(0, 0, W, H);
            l.globalAlpha = 1; l.save(); applyCam(l, c); l.drawImage(SP.frost, 540 - 600, 960 - 1050); l.restore();
            l.globalCompositeOperation = 'destination-in';
            const cxm = lerp(1500, 640, e), ri = lerp(1400, 480, e);
            l.save(); l.translate(cxm, 900); l.scale(1, 1.75); l.fillStyle = E.rad(l, 0, 0, ri, ri + 320, [[0, '#000', 0], [1, '#000', 1]]); l.fillRect(-3000, -3000, 6000, 6000); l.restore();
          }, { alpha: 0.92 });
        }
        // evening falls on the page (bazaar palette)
        const dk = P(t, 37.28, 37.62, 'inOutSine');
        if (dk > 0) { ctx.save(); ctx.globalAlpha = dk; ctx.fillStyle = E.lin(ctx, 0, 0, 0, H, [[0, '#241634'], [0.5, '#4A2A45'], [1, '#6E3B3B']]); ctx.fillRect(0, 0, W, H); ctx.restore(); }
        // the lower page falls into shadow while the gloss is up (band stays mid-toned)
        const gs = P(t, 31.85, 32.12, 'inOutSine') * (1 - P(t, 34.4, 34.7, 'inOutSine'));
        if (gs > 0) { ctx.fillStyle = E.lin(ctx, 0, 980, 0, H, [[0, '#3A2618', 0], [0.42, '#3A2618', 0.4 * gs], [1, '#3A2618', 0.5 * gs]]); ctx.fillRect(0, 980, W, H - 980); }
        // footnote rule
        const rk = P(t, 28.93, 29.6, 'outCubic');
        if (rk > 0) world((h) => { h.strokeStyle = E.rgba('#5A2A2F', 0.4); h.lineWidth = 1.2; h.beginPath(); h.moveTo(540 - 400 * rk, 1180); h.lineTo(540 + 400 * rk, 1180); h.stroke(); });
      }

      /* ---- window world ---- */
      const openK = clamp((t - 28.85) / 0.8), rS = 60 + (RW - 60) * ez.outBack(openK, 1.1), oS = P(t, 28.88, 29.5);
      const winK = P(t, 29.36, 29.8, 'inOutSine');        // niche / frame appear (shutters reveal radially)
      const shutK = clamp((t - 30.18) / 0.6), shutE = ez.inOutCubic(shutK) - 0.012 * Math.sin(PI * clamp((t - 30.1) / 0.1));
      const vis = 1 - sm((lz - lg(9)) / (lg(16) - lg(9)));   // world visibility during macro
      if (vis > 0.002) world((h) => {
        h.save(); h.globalAlpha *= vis;
        // light spill on the page once open
        const spill = P(t, 30.2, 30.9) * (1 - 0.5 * P(t, 36.4, 37.2)) * (1 - P(t, 37.3, 37.55));
        if (spill > 0) {
          h.fillStyle = E.rad(h, SCX, SCY, RW * 0.6, RW * 1.9, [[0, '#FFE2A8', 0.42 * spill], [1, '#FFE2A8', 0]]); h.fillRect(SCX - 900, SCY - 900, 1800, 1800);
          h.save(); h.globalCompositeOperation = 'source-over';
          for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + PI / 16 + t * 0.03, L = 760 + 90 * Math.sin(t + i); h.fillStyle = E.rad(h, SCX, SCY, RW, L, [[0, '#FFD98A', 0.16 * spill], [1, '#FFD98A', 0]]); h.beginPath(); h.moveTo(SCX, SCY); h.lineTo(SCX + Math.cos(a - 0.05) * L, SCY + Math.sin(a - 0.05) * L); h.lineTo(SCX + Math.cos(a + 0.05) * L, SCY + Math.sin(a + 0.05) * L); h.closePath(); h.fill(); }
          h.restore();
        }
        // the star (opening) — before the niche covers its interior
        footMotes(h, t, SCX, SCY, 1 - P(t, 28.85, 29.3));
        if (t < 28.85) drawFootStar(h, t, SCX, SCY, 60, 1);
        else {
          const glow = 1 - P(t, 29.0, 29.6);
          h.fillStyle = E.rad(h, SCX, SCY, 0, rS * 1.6, [[0, '#FFE7B0', 0.55 * glow], [1, '#FFE7B0', 0]]); h.fillRect(SCX - rS * 1.7, SCY - rS * 1.7, rS * 3.4, rS * 3.4);
          h.save(); h.globalAlpha *= 1 - P(t, 37.25, 37.55); E.at(h, SCX, SCY, 1, 0, (cc) => star8a(cc, { r: rS, open: oS, draw: 1, glow: 0.7 * (1 - winK * 0.6), lineW: lerp(2.7, 3.2, oS), col: E.hexOf(E.mix('#C69A42', '#B08030', oS)) })); h.restore();
        }
        if (winK > 0) {
          const clip = starPath(0);
          // niche
          h.save(); h.clip(clip); h.globalAlpha *= P(t, 29.88, 29.96, 'linear');
          const n = SP.niche; h.drawImage(n.c, SCX - n.size / 2, SCY - n.size / 2, n.size, n.size);
          const rv = P(t, 37.3, 37.6, 'inOutSine');
          if (rv > 0) { h.save(); h.setTransform(1, 0, 0, 1, 0, 0); h.globalAlpha = rv; drawBazaar(h, t); h.restore(); }
          h.restore();
          // items, halos, seals
          h.save(); h.clip(clip);
          drawGallery(h, t, c);
          // dust motes drifting in the niche's warm light
          if (shutK > 0) { h.save(); h.globalCompositeOperation = 'lighter'; for (let i = 0; i < 16; i++) { const px = SCX - 330 + E.hash(i, 61) * 660 + 18 * Math.sin(t * 0.5 + i), py = SCY + 340 - ((E.hash(i, 62) * 680 + t * (10 + 8 * E.hash(i, 63))) % 680), tw = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.1); h.globalAlpha = 0.5 * tw * P(t, 30.3, 30.9) * (1 - P(t, 36.6, 37.2)); h.fillStyle = E.rad(h, px, py, 0, 5, [[0, '#FFE7B0', 1], [1, '#FFE7B0', 0]]); h.fillRect(px - 5, py - 5, 10, 10); } h.restore(); }
          // shutters
          if (shutK < 1) {
            const sh = SP.shut, off = shutE * (RW + 20), rev = P(t, 29.36, 29.95, 'inOutSine');
            const drawSh = (g) => { for (const side of [-1, 1]) {
              g.save(); g.beginPath(); if (side < 0) g.rect(SCX - RW - 10 - off, SCY - RW - 10, RW + 10, 2 * RW + 20); else g.rect(SCX + off, SCY - RW - 10, RW + 10, 2 * RW + 20); g.clip();
              g.drawImage(sh.c, SCX - sh.size / 2 + side * off, SCY - sh.size / 2, sh.size, sh.size); g.restore();
            } };
            if (rev < 1) {
              const m = h.getTransform();
              const rr = lerp(10, RW * 1.25, ez.inOutSine(rev));
              E.layer(h, (l) => { fresh(l, false); l.save(); l.setTransform(m); l.clip(starPath(0)); drawSh(l); l.globalCompositeOperation = 'destination-in'; l.fillStyle = E.rad(l, SCX, SCY, rr * 0.86, rr, [[0, '#000', 1], [1, '#000', 0]]); l.fillRect(SCX - RW - 20, SCY - RW - 20, 2 * RW + 40, 2 * RW + 40); l.restore(); });
              h.save(); h.clip(starPath(0)); h.globalCompositeOperation = 'lighter'; h.strokeStyle = E.rgba('#FFE7B0', 0.5 * (1 - rev)); h.lineWidth = 10; h.beginPath(); h.arc(SCX, SCY, rr * 0.93, 0, TAU); h.stroke(); h.strokeStyle = E.rgba('#FFF6E0', 0.8 * (1 - rev)); h.lineWidth = 2; h.stroke(); h.restore();
            } else drawSh(h);
            if (shutK > 0) { h.globalCompositeOperation = 'lighter'; const gw = Math.max(2, off * 2); h.fillStyle = E.lin(h, SCX - gw / 2 - 30, 0, SCX + gw / 2 + 30, 0, [[0, '#FFE7B0', 0], [0.5, '#FFF6E0', 0.75 * (1 - shutK * 0.7)], [1, '#FFE7B0', 0]]); h.fillRect(SCX - gw / 2 - 30, SCY - RW, gw + 60, 2 * RW); }
          }
          h.restore();
          // ghosts' grille + frame
          drawFrame(h, winK, t);
        }
        h.restore();
      });

      /* ---- macro ---- */
      if (macroBG > 0) {
        ctx.save(); ctx.globalAlpha = macroBG;
        ctx.fillStyle = E.lin(ctx, 0, 0, 0, H, [[0, '#0B1A2A'], [0.5, '#10364A'], [1, '#0F4F5C']]); ctx.fillRect(0, 0, W, H);
        ctx.restore();
        if (vis > 0.002) world((h) => { h.globalAlpha = vis; drawItem(h, 0, t, { flap: 1, bobK: 1 - c.mf }); });
      }
      const scA = sm((lz - lg(3.0)) / (lg(6) - lg(3.0))) * (1 - 0.85 * sm((lz - lg(24)) / (lg(36) - lg(24))));
      if (scA > 0.003) drawScales(ctx, t, c, scA);
      const giA = sm((lz - lg(15)) / (lg(30) - lg(15)));
      if (giA > 0.003) {
        const cell = 3.4 * Z, relief = P(t, 33.23, 33.97), hue = t * 0.22 + 1.1 * P(t, 34.05, 34.65, 'inOutSine');
        const sweep = t < 33.2 ? clamp((t - 32.62) / 0.6) : clamp(((t - 33.25) % 0.75) / 0.75) * (t < 34.0 ? 1 : 0);
        const scl = cell / 100, sw = sweep > 0 && sweep < 1 ? sweep * 900 / (1800 * scl) : undefined;
        E.layer(ctx, (l) => {
          fresh(l, false);
          l.translate(c.sx, c.sy); l.rotate(c.rot + 0.2); l.scale(scl, scl);
          A.girih(l, { cx: 0, cy: 0, r: 1800, cell: 100, lineW: 3.4, hue, relief, sweep: sw, glow: 0.55 });
          l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'destination-in';
          l.fillStyle = E.rad(l, c.sx, c.sy, 360, 900, [[0, '#000', 1], [1, '#000', 0]]); l.fillRect(0, 0, W, H);
        }, { alpha: giA });
        const ro = P(t, 33.3, 34.0, 'outCubic');
        if (ro > 0) { E.at(ctx, c.sx, c.sy, 1, c.rot + 0.2, (cc) => A.rosetteFlower(cc, { r: cell * 0.5, fill: ro, t, lighter: false, rays: false, alpha: 0.9 * giA })); }
        const gw = E.env(t, 34.05, 34.7, 0.1, 0.3);
        if (gw > 0) {
          const pts = []; const cs = Math.cos(c.rot + 0.2), sn = Math.sin(c.rot + 0.2);
          for (let i = -3; i <= 3; i++) for (let j = -4; j <= 4; j++) { const x = i * cell, y = j * cell; if (Math.hypot(x, y) > 640) continue; pts.push([c.sx + x * cs - y * sn, c.sy + x * sn + y * cs]); }
          ctx.save(); ctx.globalAlpha = gw * giA; A.glints(ctx, t, { pts, seed: 12, r: 18, col: '#FFFFFF', period: 0.7, duty: 0.4 }); ctx.restore();
        }
      }

      /* ---- end: through the window into the bazaar ---- */
      if (t > 37.2) drawEnd(ctx, t, c, endK);

      /* gloss band guard (macro) */
      const g = P(t, 31.9, 32.15, 'inOutSine') * (1 - P(t, 34.3, 34.6, 'inOutSine'));
      if (g > 0) { ctx.save(); ctx.translate(540, 1400); ctx.scale(1, 230 / 640); ctx.fillStyle = E.rad(ctx, 0, 0, 0, 640, [[0, '#06101A', 0.22 * g], [1, '#06101A', 0]]); ctx.fillRect(-640, -640, 1280, 1280); ctx.restore(); }
    },
  });

  /* gallery: items with pop, halos, seals, decay, ghosts */
  function drawGallery(h, t, c) {
    const halo = (it, k) => {
      if (k <= 0) return;
      h.save(); h.globalCompositeOperation = 'lighter';
      h.fillStyle = E.rad(h, it.x, it.y, 0, 96 * k, [[0, '#FFD98A', 0.2 * k], [0.6, '#FFC870', 0.08 * k], [1, '#FFC870', 0]]); h.fillRect(it.x - 100, it.y - 100, 200, 200);
      h.restore();
      h.save(); h.globalAlpha *= Math.min(1, k * 1.5); h.strokeStyle = E.rgba('#FFD98A', 0.65); h.lineWidth = 1.5; h.beginPath(); h.arc(it.x, it.y, 80 * k, 0, TAU); h.stroke(); h.restore();
    };
    for (let i = 0; i < ITEMS.length; i++) {
      const it = ITEMS[i];
      const pk = clamp((t - it.pop) / 0.45);
      if (pk <= 0) continue;
      const out = clamp((t - it.out) / 0.16), hk0 = ez.outBack(clamp((t - (31.37 + i * 0.05)) / 0.4));
      // halo: shrink to a dot, blink, gone
      const sh = clamp((t - (it.out - 0.12)) / 0.12);
      const hk = hk0 * (1 - ez.inBack(sh, 1.4));
      if (sh < 1) halo(it, Math.max(0, hk));
      if (sh > 0.7 && out < 1) S.sparkle(h, it.x, it.y, 22 * (1 - out), (1 - out) * 0.9, '#FFF0C8', 0);
      // item
      const ia = 1 - out;
      if (ia > 0.003) {
        const s = ez.outBack(pk, 1.6);
        const o = { flap: lerp(0.86 + 0.14 * Math.sin(t * 1.9), 1, P(t, 31.8, 32.08)), bobK: 1 - c.mf };
        if (t > 35.1) o.flap = 1 - 0.12 * P(t, 35.1, 35.4) * (0.5 + 0.5 * Math.sin(t * 2.2));
        if (it.k === 'snow') o.melt = P(t, 35.55, 36.05, 'inOutSine');
        if (it.k === 'tul') o.droop = 0.32 * P(t, 35.6, 36.3);
        let a = ia;
        if (it.k === 'bf') a *= 1 - 0.65 * P(t, 35.6, 36.2);
        if (it.k === 'tul') a *= 1 - 0.3 * P(t, 35.7, 36.3);
        if (it.k === 'snow') a *= 1 - P(t, 36.05, 36.4);
        h.save(); h.globalAlpha *= a;
        E.at(h, it.x, it.y, s, 0, () => { h.translate(-it.x, -it.y); drawItem(h, i, t, o); });
        if (it.k === 'pom') { const dull = P(t, 35.6, 36.2); if (dull > 0) { h.globalCompositeOperation = 'saturation'; h.globalAlpha = a * dull * 0.85; h.fillStyle = '#808080'; h.beginPath(); h.arc(it.x, it.y + 6, 58, 0, TAU); h.fill(); h.globalCompositeOperation = 'multiply'; h.globalAlpha = a * dull * 0.4; h.fillStyle = '#8A7A80'; h.fill(); } }
        h.restore();
        if (pk < 1) S.sparkle(h, it.x, it.y, 60 * (1 - pk), 1 - pk, '#FFF4D2', i);
        // glints while alive
        if (t > 31.5 && t < 35.5 || (t > 34.9 && t < 35.5)) { const gl = Math.pow(E.osc(t, 1.3 + i * 0.17, i * 0.29), 7); S.sparkle(h, it.x + 34 * Math.cos(i * 2.3), it.y - 30 * Math.sin(i * 1.7 + 1), 12, gl * ia, '#FFFFFF', t); }
      }
      // seal
      const sk = hk0 * (1 - clamp((t - it.out + 0.05) / 0.15));
      if (sk > 0.01) E.at(h, it.x + 66, it.y - 62, sk, 0, (cc) => star8a(cc, { r: 11, open: 0.6, draw: 1, glow: 0.6, lineW: 1.5, col: '#D8B26E', fill: 'rgba(216,178,110,0.35)' }));
      // ghost
      const ga = 0.6 * sm((t - it.out) / 0.3) * (1 - sm((t - 37.42) / 0.08));
      if (ga > 0) drawGhost(h, i, it.x, it.y, 1, ga * (it.k === 'snow' ? 0.62 : 1) * (0.9 + 0.1 * Math.sin(t * 3 + i)));
    }
    // decay particles
    decay(h, t);
  }
  function decay(h, t) {
    // butterfly glitter
    if (t > 35.58 && t < 37.0) {
      const it = ITEMS[0];
      h.save(); h.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 46; k++) {
        const tau = 35.6 + E.hash(k, 21) * 0.6, age = t - tau; if (age < 0 || age > 1.1) continue;
        const a0 = E.hash(k, 22) * TAU, r0 = 10 + 50 * E.hash(k, 23), x0 = it.x + Math.cos(a0) * r0, y0 = it.y + Math.sin(a0) * r0 * 0.6;
        const vx = Math.cos(a0) * (40 + 60 * E.hash(k, 24)), vy = -30 + 60 * E.hash(k, 25);
        const x = x0 + vx * age, y = y0 + vy * age + 70 * age * age, life = 1 - age / 1.1;
        const col = ['#6FF0FF', '#4C8DFF', '#B48CFF', '#FFFFFF'][k % 4];
        h.fillStyle = E.rgba(col, 0.9 * life * (0.6 + 0.4 * Math.sin(age * 20 + k))); h.beginPath(); h.arc(x, y, 1.4 + 1.6 * E.hash(k, 26), 0, TAU); h.fill();
      }
      h.restore();
    }
    // tulip petals
    if (t > 35.6 && t < 37.2) { const it = ITEMS[5]; A.petals(h, t, { n: 6, seed: 31, t0: 35.62, origin: { x: it.x + 8, y: it.y - 4, w: 30 }, dir: PI / 2 + 0.3, spread: 1.2, speed: 60, gravity: 90, life: 1.4, stagger: 0.12, col: ['#FF7A3D', '#E03C31', '#FF9A5C'], size: 16 }); }
    // snow droplet → mist
    if (t > 35.95 && t < 37.4) { const it = ITEMS[2]; A.wisps(h, t, { x: it.x, y: it.y + 4, n: 7, seed: 41, col: '#DDF2FF', rise: 90, life: 1.3, spread: 26, w: 6, t0: 36.0, stagger: 0.08, alpha: 0.75 }); }
  }
  /* the window's girih grille: gold (37.22) → walnut kafes rushing past as a blurred foreground with an opening */
  function drawLattice(ctx, t, c) {
    const gk = P(t, 37.22, 37.48, 'outCubic');
    if (gk <= 0) return;
    const rush = clamp((t - 37.42) / 0.38), re = ez.inCubic(rush);
    const col = E.hexOf(E.mix('#D8B26E', '#5A3A24', P(t, 37.4, 37.66))), lw = lerp(2, 5.8, re), lo = rush > 0.02, pc = toScreen(c, SCX, SCY);
    E.layer(ctx, (l) => {
      fresh(l, lo);
      l.save(); applyCam(l, c);
      l.clip(starPath(0));
      const half = RW;
      if (rush < 1) { l.save(); l.globalCompositeOperation = 'lighter'; l.globalAlpha = 0.45 * (1 - rush); A.lattice(l, { x: SCX - half, y: SCY - half, w: 2 * half, h: 2 * half, cell: 78, lineW: 6, stroke: '#FFE7B0', clip: false }); l.restore(); }
      A.lattice(l, { x: SCX - half, y: SCY - half, w: 2 * half, h: 2 * half, cell: 78, lineW: lw, stroke: col, clip: false });
      l.restore();
      if (rush > 0) {
        l.save(); l.setTransform(lo ? 0.5 : 1, 0, 0, lo ? 0.5 : 1, 0, 0); l.globalCompositeOperation = 'destination-out';
        const hole = lerp(40, 560, ez.inOutSine(rush));
        l.fillStyle = E.rad(l, pc[0], pc[1], hole * 0.5, hole * 1.15, [[0, '#000', 1], [1, '#000', 0]]); l.fillRect(0, 0, W, H);
        l.restore();
      }
    }, { lo, blur: lo ? 1 + 10 * re : 0, alpha: gk });
  }
  /* bazaar world behind + kafes lattice rushing past + ghosts flying to shelf slots */
  function drawBazaar(l, t) {
    l.fillStyle = E.lin(l, 0, 0, 0, H, [[0, '#241634'], [0.5, '#4A2A45'], [1, '#6E3B3B']]); l.fillRect(0, 0, W, H);
    l.fillStyle = E.rad(l, 540, 720, 0, 760, [[0, '#FFAE42', 0.18], [1, '#FFAE42', 0]]); l.fillRect(0, 0, W, H);
    l.fillStyle = E.rad(l, 540, 760, 40, 470, [[0, '#FFE9B8', 0.95], [0.45, '#FFBE6A', 0.6], [1, '#6E3B3B', 0]]); l.fillRect(140, 300, 800, 850);
    E.at(l, 540, 1150, 1, 0, (cc) => A.archGate(cc, { t, w: 1000, h: 970, lattice: false, back: null }));   // = H_numune vitrine (opening x141–939, apex y300)
    for (const [x, y] of [[300, 190], [540, 150], [780, 190]]) { l.fillStyle = E.rad(l, x, y, 0, 160, [[0, '#FFE3A3', 0.55], [0.3, '#FFAE42', 0.22], [1, '#FFAE42', 0]]); l.fillRect(x - 160, y - 160, 320, 320); }
    l.strokeStyle = 'rgba(201,154,74,0.75)'; l.lineWidth = 6; for (const y of [620, 840, 1060]) { l.beginPath(); l.moveTo(200, y); l.lineTo(880, y); l.stroke(); }
  }
  /* bazaar full frame + kafes lattice rushing past + ghosts flying to shelf slots */
  function drawEnd(ctx, t, c, endK) {
    const ek = P(t, 37.64, 37.8, 'inOutSine') * 0.6;
    if (ek > 0) { ctx.save(); ctx.globalAlpha = ek; drawBazaar(ctx, t); ctx.restore(); }
    // ghosts fly to H's hand-off points (H_numune ITEMS[].g at 37.60), then follow H's own path to the shelves
    const HG = [[277, 589, 1.96], [540, 587, 1.27], [803, 589, 1.79], [277, 843, 1.59], [540, 843, 1.68], [803, 843, 1.51]];
    const HEND = [[310, 610], [540, 610], [770, 610], [310, 1060], [540, 1060], [770, 835]];
    for (let i = 0; i < ITEMS.length; i++) {
      const it = ITEMS[i], g = HG[i];
      let x, y, sc;
      if (t < 37.6) {
        const k1 = ez.inOutCubic(clamp((t - 37.42) / 0.18)), p0 = toScreen(c, it.x, it.y);
        x = lerp(p0[0], g[0], k1); y = lerp(p0[1], g[1], k1); sc = lerp(c.z, 0.91, k1);
      } else {
        const k = ez.inOutCubic(clamp((t - 37.6) / 0.6)), e = HEND[i], cx = (g[0] + e[0]) / 2, cy = (g[1] + e[1]) / 2 - 24;
        x = (1 - k) * (1 - k) * g[0] + 2 * (1 - k) * k * cx + k * k * e[0]; y = (1 - k) * (1 - k) * g[1] + 2 * (1 - k) * k * cy + k * k * e[1];
        sc = 0.91 * lerp(g[2], 1, k) / g[2] * lerp(1.05, 1.0, ez.outCubic(clamp((t - 37.6) / 0.35))) / 1.05;
      }
      drawGhost(ctx, i, x, y, sc, 0.62 * (0.86 + 0.14 * Math.sin(t * 9 + i * 1.7)) * sm((t - 37.42) / 0.08));
    }
    drawLattice(ctx, t, c);
  }
})();
