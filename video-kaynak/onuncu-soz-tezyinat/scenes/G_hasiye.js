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
 *   (30.06 the centre seam brightens; the light column has its own decay, it never switches off)
 *   30.79 six masterpieces pop (0.08 s): sapphire butterfly, peacock feather, snowflake / nautilus, cut
 *         pomegranate, tulip · 31.37 gold halos + tiny Star8 seals · cam 1.05→1.1 drifting to the butterfly
 *  Part 2 macro (signature #4): 32.08–33.40 log zoom Z 1.1→40 (+ slow creep to 34.49) into the butterfly's
 *   forewing, locked to screen (540,700). Layers by zoom: gallery → overlapping scale shingles (mip tiles drawn
 *   near native size; overlay first so the wing keeps its colour and spots; ridged once magnified; masked by the
 *   wing) → girih tessellation growing out of the wing (wing-masked until Z≈11, then its own circular lens)
 *   · 32.60 "sanatı": light runs along the scales/girih · 33.23 relief rises + central rosette blooms + rings of
 *   light sweep out · 34.10 hue wave + glints (bloom .72) · 34.49–35.13 fast reverse (trapezoid ease, layer
 *   crossfades on wider zoom ranges ≈5 frames) to the gallery; frost creeps in from the left.
 *  Part 3: 35.42 push toward the snowflake → melts to a droplet → mist wisps; butterfly scatters into glitter,
 *   tulip droops and drops petals, pomegranate seeds dull · 36.27–36.79 halos shrink to a dot and blink out
 *   (peacock last, on "azdır") · each item leaves a ghost line drawing (Sobel of the item, 'lighter').
 *  End (hand-off to H_numune, see below): 37.0 the page around the star turns into H's walnut kafes (thin gold →
 *   14 px walnut, spreading out from the frame), evening falls, the niche dissolves into H's own shop (H's draw,
 *   read back without its kafes and ghosts); camera eases back 1.1→1.0 then accelerates through the window,
 *   meeting H's kafes star exactly (R, speed) at 37.70; the ghosts fly onto H's shelf slots as H's own ghost
 *   drawings (G's drawing dissolves into H's over the whole flight, ≥0.3 s). The kafes front travels out from the
 *   star over ≈13 frames (in-out ease). H's still 37.60 frame is pre-rolled with H's own camera motion so the shop
 *   doesn't start moving with a jolt at 37.60. From 37.70 G draws H (gecisler: cut at 37.70 between identical frames).
 *  Gloss 32.07–33.41: lower page in shadow before the zoom covers it; macro view is a circular lens field that
 *   falls off before the band + soft scrim ≤0.22 (lifts 33.6–33.95, after the gloss has gone).
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
    E.at(ctx, x, y, 1, 0, (c) => star8a(c, { r, open: 0, draw: 1, girih: false, glow: 0.7, lineW: r * 0.045, col: '#C69A42' }));
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
  const BF = { s: 84, rot: -0.12 };
  const WB = (() => { const lx = 0.55 * BF.s, ly = -0.45 * BF.s, c = Math.cos(BF.rot), s = Math.sin(BF.rot); return [ITEMS[0].x + lx * c - ly * s, ITEMS[0].y + lx * s + ly * c]; })();
  const STAR16 = (() => { const o = []; for (let k = 0; k < 16; k++) { const a = k * PI / 8 + (k % 2 ? 0 : 0), rr = k % 2 ? RW : RW * 0.76537; o.push([SCX + Math.cos(a) * rr, SCY + Math.sin(a) * rr]); } return o; })();
  // inner vertices at 0°,45°,… (r .765·RW); outer at 22.5°+k·45° (RW) — matches A.star8 open=1
  const starPath = (inset = 0) => { const p = new Path2D(); STAR16.forEach((q, i) => { const x = SCX + (q[0] - SCX) * (1 - inset), y = SCY + (q[1] - SCY) * (1 - inset); i ? p.lineTo(x, y) : p.moveTo(x, y); }); p.closePath(); return p; };
  /** the window star with a given inner-vertex ratio (G's own window 0.765 → H's kafes star 0.82 at the hand-off) */
  const IR0 = 0.76537, IR_H = 0.82;
  const starVerts = (ir, inset = 0) => { const o = []; for (let k = 0; k < 16; k++) { const a = k * PI / 8, rr = (k % 2 ? RW : RW * ir) * (1 - inset); o.push([SCX + Math.cos(a) * rr, SCY + Math.sin(a) * rr]); } return o; };
  const starPathIR = (ir, inset = 0) => { const p = new Path2D(); starVerts(ir, inset).forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; };

  /* ---------------------------- hand-off to H_numune ----------------------------
   * H opens (37.60) on a walnut kafes wall with a star window (S.starPath R 500, inner 0.82, centred (540,760))
   * growing as exp(5.2·(t−37.6)), its shop seen through it, G's six ghosts held on their shelf slots.
   * G: the page around the window turns into that kafes (thin gold → walnut), the niche dissolves into H's own
   * shop (H's draw, read back without its kafes layer and ghosts), the camera eases back a little and then
   * accelerates forward through the window, meeting H's kafes exactly (R = 500·e^(5.2·0.1), same speed) at 37.70;
   * the ghosts fly onto H's slots as H's own ghost drawings. From 37.70 G simply draws H (gecisler: cut 37.70),
   * so the G→H seam is identical frames. */
  const TH = 37.6, TS = 37.7, V_H = 5.2, Z_S = 500 * Math.exp(V_H * (TS - TH)) / RW;
  const Z_MIN = 1.0, TP0 = 36.98, TL0 = 37.28, FL1 = 37.56;
  const hScene = () => E.scenes.find((s) => s.id === 'H_numune');
  /** absolute ln(zoom) of the end move: ease back (anticipation), then accelerate into H's push */
  function endLogZ(t, lz0) {
    const L1 = lerp(lz0, lg(Z_MIN), P(t, TP0, TL0, 'inOutSine'));
    const D = lg(Z_S) - lg(Z_MIN), q = V_H * (TS - TL0) / D, u = clamp((t - TL0) / (TS - TL0));
    return L1 + D * Math.pow(u, q);
  }
  function endK(t) {
    return {
      rev: P(t, 37.0, 37.44, 'inOutSine'),    // kafes spreads out from the star frame over the page (front travels ≈13 frames)
      mk: P(t, 37.1, 37.42, 'inOutSine'),     // thin gold girih → walnut kafes (2 → 14 px)
      nk: P(t, 37.1, 37.36, 'inOutSine'),     // niche → H's shop behind the window
      bgk: P(t, 37.18, 37.44, 'inOutSine'),   // the page behind the kafes → H's evening street (once the front is well out)
      fk: P(t, 37.16, 37.42, 'inOutSine'),    // gold star frame → H's walnut star frame
      ir: lerp(IR0, IR_H, P(t, 37.28, 37.52, 'inOutSine')),
      blur: lerp(0.8, 3.5, E.p(t, TH, 37.95, 'inQuad')),   // = H_numune drawLatticeFG
    };
  }
  const FLORD = { naut: 0, pom: 1, tul: 2, bf: 3, pea: 4, snow: 5 };
  /** the flying ghost takes over from the gallery ghost at flightStart (same spot); it starts moving FL_LEAD later and
   *  lands at FL1; G's drawing dissolves into H's over the whole flight on a TIME envelope (≥0.3 s, ≥9 frames) */
  const flightStart = (i) => 37.06 + 0.03 * FLORD[ITEMS[i].k], FL_LEAD = 0.04;
  const H_GHOST_OF = [0, 1, 2, 4, 5, 3];     // H draws its ghosts butterfly, peacock, snowflake, tulip, nautilus, pomegranate
  const H_INDEX = [0, 1, 2, 6, 7, 5];        // H ITEMS index of each G item (H's ghost flicker phase)
  const hFlick = (iH, t) => 0.86 + 0.14 * Math.sin(t * 9 + iH * 1.7);
  function alphaBox(cv) {
    const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { bx: (x0 + x1) / 2, by: (y0 + y1) / 2, bs: Math.max(1, x1 - x0, y1 - y0) };
  }
  const hBoxes = new Map();
  /** H holds its 37.60 frame and then starts its camera at full speed (log-zoom 1.03 → 1.0, outCubic over 0.28 s:
   *  d ln z/dt = −3·ln1.03/0.28). G's still capture of that frame is pre-rolled with the same motion ramping up from
   *  rest (scale about H's pivot (540,960), = 1 at 37.60), so the shop and the landed ghosts don't start with a jolt. */
  const PRE_V = 3 * Math.log(1.03) / 0.28, PRE_D = 0.24;
  function preF(t) { const u = clamp(t, TH - PRE_D, TH) - (TH - PRE_D); return Math.exp(PRE_V * (PRE_D * PRE_D - u * u) / (2 * PRE_D)); }
  /** H's frame at time tc (H holds 37.60 before its start) without its kafes layer and its ghosts (both drawn by
   *  G), plus H's ghost sprites with their exact screen placement and alpha — read from H's own draw, so G always
   *  lands on exactly what H shows. The 37.60 frame is kept; 37.60–37.70 is read live (3 frames). */
  function captureH(tc) {
    const live = tc > TH + 1e-6;
    if (!live && SP.hcap !== undefined) return SP.hcap;
    if (live && SP.hlive && SP.hlive.tc === tc) return SP.hlive;
    const hs = hScene();
    if (!hs || !hs.draw) { if (!live) SP.hcap = null; return null; }
    const b = live ? (SP.hbufL || (SP.hbufL = E.canvas(W, H))) : E.canvas(W, H), x = b.x, gh = [];
    if (x.reset) x.reset();
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, W, H);
    let latt = 0;
    const di = x.drawImage;
    x.drawImage = function (img, ...a) {
      if (this.globalCompositeOperation === 'lighter' && a.length === 2 && img && img.width === 360 && img.height === 440) { gh.push({ img, m: this.getTransform(), a: this.globalAlpha, dx: a[0], dy: a[1] }); return; }
      const bl = /blur\(([\d.]+)px\)/.exec(this.filter || '');
      if (img && img.width === W / 2 && img.height === H / 2 && a.length === 4 && this.globalAlpha > 0.9 && bl && +bl[1] < 1.2) { latt++; return; }   // the kafes layer
      return di.apply(this, [img].concat(a));
    };
    let res = null;
    try { x.save(); hs.draw(x, tc, {}); x.restore(); } catch (err) { console.error('G_hasiye: H capture failed', err); } finally { delete x.drawImage; }
    if (gh.length === 6 && latt === 1) {
      const g = ITEMS.map((_, i) => {
        const r = gh[H_GHOST_OF[i]];
        if (!hBoxes.has(r.img)) hBoxes.set(r.img, alphaBox(r.img));
        const bb = hBoxes.get(r.img), k = r.m.a;
        return { img: r.img, m: r.m, dx: r.dx, dy: r.dy, bx: bb.bx, by: bb.by, bs: bb.bs, cx: r.m.e + k * (bb.bx + r.dx), cy: r.m.f + r.m.d * (bb.by + r.dy), S: bb.bs * k, a: r.a, iH: H_INDEX[i] };
      });
      res = { bg: b.c, g, tc };
    } else console.warn('G_hasiye: unexpected H hand-off capture', tc, gh.length, latt);
    if (live) SP.hlive = res; else SP.hcap = res;
    return res;
  }

  /* ---------------------------- camera ---------------------------- */
  /** macro log-zoom fraction: eases in at 31.9 (band dark before the gloss), girih resolved by ≈32.6, 40× by 33.4 */
  /** ease with a linear-velocity ramp in/out and a constant middle (peak speed 1/(1−a)× the mean; inOutCubic is 3×) */
  function trapE(u, a = 0.32) { u = clamp(u); const v = 1 / (1 - a); return u < a ? v * u * u / (2 * a) : u > 1 - a ? 1 - v * (1 - u) * (1 - u) / (2 * a) : v * (a / 2 + u - a); }
  /** the reverse zoom (34.49–35.13) uses trapE so the macro → gallery layer crossfades last ≈5 frames, not one */
  function macroM(t) { return ez.inOutSine(Math.pow(clamp((t - 31.9) / 1.5), 0.7)) * (1 - trapE((t - 34.49) / 0.64)); }
  const RET = 34.49;   // after this the macro layers fade on wider zoom ranges (fast reverse: a dissolve, not a cut)
  function camG(t) {
    const d = camDrift(t);
    const zb = seamZoom(t) * (1 + 0.02 * P(t, 28.93, 29.5)) * (1 + 0.045 * P(t, 30.23, 31.9));
    let fx = SCX - 22 * P(t, 30.23, 31.9) * (1 - P(t, 34.6, 35.2)), fy = SCY - 14 * P(t, 30.23, 31.9) * (1 - P(t, 34.6, 35.2));
    let sx = SCX, sy = SCY;
    // a real push onto the snowflake (centred ≈(540,700), ×1.75), eased back slowly, no roll
    const sp = P(t, 35.42, 35.95) * (1 - P(t, 36.2, 36.95));
    fx = lerp(fx, ITEMS[2].x, sp); fy = lerp(fy, ITEMS[2].y, sp); sx = lerp(sx, 540, sp); sy = lerp(sy, 700, sp);
    let z = zb * (1 + 0.75 * sp);
    // macro
    const m = macroM(t), mf = sm(clamp(m * 3.2));
    fx = lerp(fx, WB[0], mf); fy = lerp(fy, WB[1], mf); sx = lerp(sx, 540, mf); sy = lerp(sy, 700, mf);
    const slow = lg(1.22) * P(t, 33.35, 34.49, 'inOutSine') * (1 - P(t, 34.49, 34.9));
    z = z * Math.exp(m * lg(40 / zb) + slow);
    // end: breathe back, then lunge through the window into H's push (exactly R 500 and 5.2/s at 37.60)
    if (t > TP0) z = Math.exp(endLogZ(t, lg(z)));
    // the hand-drift settles out so the window centre sits exactly on H's (540,760) at the hand-off
    const ed = 1 - P(t, 36.95, 37.3, 'inOutSine'), dd = (1 - mf) * ed;
    return { fx, fy, sx: sx + d.x * dd, sy: sy + d.y * dd, z, rot: d.r * (1 - sp) * ed + 0.12 * m, m, mf };
  }
  function applyCam(ctx, c, p = 1) { const z = 1 + (c.z - 1) * p; ctx.translate(c.sx, c.sy); ctx.rotate(c.rot * p); ctx.scale(z, z); ctx.translate(-c.fx, -c.fy); }
  const toScreen = (c, x, y) => { const dx = (x - c.fx) * c.z, dy = (y - c.fy) * c.z, cs = Math.cos(c.rot), sn = Math.sin(c.rot); return [c.sx + dx * cs - dy * sn, c.sy + dx * sn + dy * cs]; };

  /* ---------------------------- items ---------------------------- */
  function drawItem(ctx, i, t, o = {}) {
    const it = ITEMS[i], bob = 2.2 * Math.sin(t * 1.4 + i * 1.1) * (o.still ? 0 : o.bobK === undefined ? 1 : o.bobK), tt = o.still ? 0 : t;
    if (it.k === 'bf') E.at(ctx, it.x, it.y + bob, 1, BF.rot, (c) => A.butterfly(c, { size: BF.s, pattern: 'sapphire', flap: o.flap === undefined ? 1 : o.flap, hz: 1e-4, t }));
    else if (it.k === 'pea') { // a fanned plume of three feathers (a single eye-on-a-stalk read as a map pin)
      for (const [dx, ang, len] of [[-16, -0.36, 186], [16, 0.36, 186], [0, 0, 214]]) E.at(ctx, it.x + dx * 0.3, it.y + 104 + bob, 1, ang, (c) => A.peacockFeather(c, { len, t: tt + dx * 0.01 }));
    }
    else if (it.k === 'snow') E.at(ctx, it.x, it.y + bob, 1, 0, (c) => A.snowflake(c, { r: 80, melt: o.melt || 0, t: tt }));
    else if (it.k === 'naut') E.at(ctx, it.x, it.y + bob, 1, 0.08 * Math.sin(t * 0.6) * (o.still ? 0 : 1), (c) => A.nautilus(c, { r: 78 }));
    else if (it.k === 'pom') E.at(ctx, it.x, it.y + 6 + bob, 1, 0, (c) => A.pomegranate(c, { r: 70, cut: true, t: tt }));
    else E.at(ctx, it.x, it.y + 84 + bob, 1, o.droop || 0, (c) => A.flowerSet(c, { type: 'tulip', size: 64, stem: 82, t: tt, sway: o.still ? 0 : 1 }));
  }
  /** ghost outline helper: a luminous LINE DRAWING of the item — Sobel edges of its luminance·alpha (so inner
   *  structure like petals, chambers and barbs shows) plus its silhouette edge, then a soft glow */
  function makeGhost(i) {
    const it = ITEMS[i], sc = 2, bw = 300, bh = 300, cw = bw * sc, ch = bh * sc;
    const src = E.canvas(cw, ch); src.x.scale(sc, sc); src.x.translate(bw / 2 - it.x, bh / 2 - it.y);
    drawItem(src.x, i, 0, { still: true, flap: 1 });
    let rd = src.x;
    if (it.k === 'pea') { // the plume's fine barbs merge into one soft vane first: only vane outline, shafts and eyes edge
      const sb = E.canvas(cw, ch); sb.x.filter = 'blur(2.5px)'; sb.x.drawImage(src.c, 0, 0); rd = sb.x;
    }
    const id = rd.getImageData(0, 0, cw, ch), d = id.data, L = new Float32Array(cw * ch), Al = new Float32Array(cw * ch);
    for (let q = 0, p = 0; q < L.length; q++, p += 4) { const a = d[p + 3] / 255; Al[q] = a; L[q] = a * (0.3 * d[p] + 0.59 * d[p + 1] + 0.11 * d[p + 2]) / 255; }
    const out = src.x.createImageData(cw, ch), o = out.data;
    // the plume's dense barbs saturate a plain luminance edge into a filled fan: there only the strong edges
    // (shafts, eye rings) count, so it stays a line drawing like the others
    const pea = it.k === 'pea', at = pea ? 0.3 : 0.5, ar = pea ? 0.7 : 1.2, lt = pea ? 0.14 : 0.22, lr = pea ? 0.3 : 0.5, lk = 0.85;
    for (let y = 1; y < ch - 1; y++) for (let x = 1; x < cw - 1; x++) {
      const q = y * cw + x;
      const sob = (A2) => { const gx = A2[q - cw + 1] + 2 * A2[q + 1] + A2[q + cw + 1] - A2[q - cw - 1] - 2 * A2[q - 1] - A2[q + cw - 1], gy = A2[q + cw - 1] + 2 * A2[q + cw] + A2[q + cw + 1] - A2[q - cw - 1] - 2 * A2[q - cw] - A2[q - cw + 1]; return Math.hypot(gx, gy); };
      const e = Math.max(sm((sob(Al) - at) / ar), sm((sob(L) - lt) / lr) * lk);
      const p = q * 4; o[p] = 255; o[p + 1] = 246; o[p + 2] = 224; o[p + 3] = e * 255;
    }
    const edge = E.canvas(cw, ch); edge.x.putImageData(out, 0, 0);
    const g = E.canvas(cw, ch);
    g.x.filter = 'blur(6px)'; g.x.drawImage(edge.c, 0, 0); g.x.filter = 'none'; g.x.globalAlpha = 0.9; g.x.drawImage(edge.c, 0, 0);
    return Object.assign({ c: g.c, w: bw, h: bh }, alphaBox(g.c));
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
  /** butterfly-wing scales: rounded, overlapping shingles in offset rows, sapphire with an iridescent sheen */
  function makeScaleTile(pw) {
    const cols = 4, rows = 4, rh = Math.round(pw * 0.5), Wt = cols * pw, Ht = rows * rh, cv = E.canvas(Wt, Ht), x = cv.x;
    const hw = pw * 0.52, L = rh * 2.1;
    const shp = new Path2D(); shp.moveTo(-hw, -L * 0.2); shp.lineTo(-hw, L - hw); shp.arc(0, L - hw, hw, PI, 0, true); shp.lineTo(hw, -L * 0.2); shp.closePath();
    const pal = ['#2148C0', '#2C5EE0', '#3870F0', '#2752D0', '#3486D8', '#3F4AE0'];
    x.fillStyle = '#0E1A4A'; x.fillRect(0, 0, Wt, Ht);
    for (let r = rows + 1; r >= -3; r--) for (let c = -1; c <= cols; c++) {
      const ri = ((r % rows) + rows) % rows, ci = ((c % cols) + cols) % cols, h1 = E.hash(ci + ri * 7, 91), h2 = E.hash(ci + ri * 7, 92);
      const cx = (c + (ri & 1 ? 0.5 : 0) + 0.5) * pw, cy = r * rh;
      const base = pal[(h1 * pal.length) | 0];
      x.save(); x.translate(cx, cy); x.rotate((h2 - 0.5) * 0.05);
      x.shadowColor = 'rgba(4,8,30,0.55)'; x.shadowBlur = pw * 0.12; x.shadowOffsetY = pw * 0.05;
      x.fillStyle = E.lin(x, 0, 0, 0, L, [[0, E.shade(base, -0.45)], [0.55, base], [1, E.shade(base, 0.22)]]); x.fill(shp);
      x.shadowColor = 'rgba(0,0,0,0)';
      x.save(); x.clip(shp);
      x.globalCompositeOperation = 'screen';
      x.fillStyle = E.lin(x, -hw, L * 0.3, hw, L, [[0, '#6FF0FF', 0.32], [0.5, '#6FF0FF', 0.0], [1, '#B48CFF', 0.3]]); x.fillRect(-hw, -L * 0.2, 2 * hw, L * 1.3);
      x.fillStyle = E.rad(x, -hw * 0.3, L - hw * 1.2, 0, hw * 0.9, [[0, '#E8FDFF', 0.22 + 0.15 * h1], [1, '#E8FDFF', 0]]); x.fillRect(-hw, -L * 0.2, 2 * hw, L * 1.3);
      x.restore();
      if (pw >= 70) {   // a magnified scale shows its longitudinal ridges and faint cross-ribs
        x.save(); x.clip(shp); const nR = 7, top = -L * 0.2, bot = L;
        for (let q = 0; q < nR; q++) {
          const rx = -hw + (q + 0.5) * 2 * hw / nR;
          x.strokeStyle = 'rgba(6,14,58,0.42)'; x.lineWidth = pw * 0.024; x.beginPath(); x.moveTo(rx, top); x.lineTo(rx, bot); x.stroke();
          x.strokeStyle = 'rgba(170,236,255,0.38)'; x.lineWidth = pw * 0.01; x.beginPath(); x.moveTo(rx + pw * 0.013, top); x.lineTo(rx + pw * 0.013, bot); x.stroke();
        }
        x.strokeStyle = 'rgba(170,236,255,0.12)'; x.lineWidth = pw * 0.006;
        for (let yy = top; yy < bot; yy += pw * 0.085) { x.beginPath(); x.moveTo(-hw, yy); x.lineTo(hw, yy); x.stroke(); }
        x.restore();
      }
      x.strokeStyle = 'rgba(190,240,255,0.55)'; x.lineWidth = Math.max(0.7, pw * 0.02); x.beginPath(); x.arc(0, L - hw, hw * 0.97, PI * 0.08, PI * 0.92); x.stroke();
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
  function drawFrame(ctx, a, t, ir = IR0) {
    if (a <= 0.002) return;
    const p = starPathIR(ir), p2 = starPathIR(ir, 0.034), SV = starVerts(ir);
    ctx.save(); ctx.globalAlpha *= a; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(58,36,8,0.55)'; ctx.lineWidth = 11; ctx.stroke(p);
    ctx.strokeStyle = goldGrad(ctx, SCX - RW, SCY - RW, SCX + RW, SCY + RW); ctx.lineWidth = 6.5; ctx.stroke(p);
    ctx.strokeStyle = 'rgba(255,248,222,0.85)'; ctx.lineWidth = 1.6; ctx.stroke(p);
    ctx.strokeStyle = E.rgba('#D8B26E', 0.75); ctx.lineWidth = 1.4; ctx.stroke(p2);
    // shimmer travelling along the frame
    const k = (t * 0.22) % 1, q = SV[Math.floor(k * 16)];
    ctx.restore();
    if (q) S.sparkle(ctx, q[0], q[1], 14, 0.55 * a * Math.pow(Math.sin(k * 16 % 1 * PI), 2), '#FFF6E0', t);
  }
  /** macro scale layer on the WHOLE wing (wing-masked): first only as an overlay (the wing keeps its colour and
   *  spots), then partly opaque; the shingles are always drawn from the mip tile nearest their screen size */
  const SCL_K = 8;   // shingle width in world px (≈10 across a forewing)
  function drawScales(ctx, t, c, sA) {
    if (sA <= 0.003) return;
    const bk = sm((lg(c.z) - lg(3.6)) / (lg(6.5) - lg(3.6)));
    scaleLayer(ctx, t, c, sA, 'overlay');
    if (bk > 0.01) scaleLayer(ctx, t, c, sA * bk * 0.5, 'source-over');
  }
  function scaleLayer(ctx, t, c, sA, op) {
    const s = SCL_K * c.z, lv = SP.tiles, lz = lg(c.z);
    let li = lv.length - 1; for (let j = 0; j < lv.length; j++) if (lv[j].pw >= s) { li = j; break; }
    const f = li > 0 ? sm((s - lv[li - 1].pw) / (lv[li].pw - lv[li - 1].pw)) : 1;
    const pick = li > 0 ? [[li - 1, 1 - f], [li, f]] : [[0, 1]];
    E.layer(ctx, (l) => {
      fresh(l, false);
      for (const [j, w] of pick) {
        if (w <= 0.01) continue;
        const tile = lv[j], k = s / tile.pw, pat = l.createPattern(tile.c, 'repeat');
        pat.setTransform(new DOMMatrix().translate(c.sx, c.sy).rotate((c.rot - 0.5) * 180 / PI).scale(k).translate(-0.925 * tile.pw, -0.275 * tile.pw));
        l.globalAlpha = w; l.fillStyle = pat; l.fillRect(0, 0, W, H);
      }
      l.globalAlpha = 1; l.globalCompositeOperation = 'screen';
      const sx = c.sx + Math.sin(t * 1.3) * 500;
      l.fillStyle = E.lin(l, sx - 300, 0, sx + 300, H, [[0, '#FFFFFF', 0], [0.5, '#DFFBFF', 0.1], [1, '#FFFFFF', 0]]); l.fillRect(0, 0, W, H);
      const sw2 = clamp((t - 32.6) / 0.5);
      if (sw2 > 0 && sw2 < 1) { const bx = lerp(-700, W + 700, ez.inOutSine(sw2)); l.fillStyle = E.lin(l, bx - 240, H * 0.2, bx + 240, H * 0.8, [[0, '#FFE66D', 0], [0.5, '#FFF6C8', 0.45], [1, '#FFE66D', 0]]); l.fillRect(0, 0, W, H); }
      // only on the wing while the wing is smaller than the frame
      const wm = 1 - sm((lz - lg(18)) / (lg(30) - lg(18)));
      if (wm > 0.01) E.layer(l, (b) => {
        fresh(b, false);
        if (wm < 1) { b.fillStyle = E.rgba('#000', 1 - wm); b.fillRect(0, 0, W, H); }
        b.save(); applyCam(b, c); drawItem(b, 0, t, { flap: 1, bobK: 1 - c.mf }); b.restore();
      }, { op: 'destination-in' });
    }, { op, alpha: sA });
  }

  /* ---------------------------- scene ---------------------------- */
  E.scene({
    id: 'G_hasiye', t0: T0, t1: T1,
    async setup() {
      SP.parch = makeParchment();
      SP.niche = makeNiche();
      SP.shut = makeShutters();
      SP.tiles = [16, 27, 46, 78, 132].map(makeScaleTile);   // mip chain: always drawn near native size
      SP.frost = makeFrost();
      SP.ghost = ITEMS.map((_, i) => makeGhost(i));
    },
    post(T) {
      const t = clamp(T, T0, T1), m = macroM(t), hs = hScene();
      if (t >= TH && hs && hs.post) return typeof hs.post === 'function' ? hs.post(t) : hs.post;   // (G shows H's shop from here)
      const hw = E.env(t, 34.05, 34.75, 0.12, 0.4);
      const g = { bloom: lerp(0.3 + 0.08 * P(t, 30.2, 30.8), 0.5, sm(m * 2)) + 0.22 * hw, vignette: lerp(0.18, 0.34, sm(m * 2)), grain: 0.05 };
      // converge on H's own post values at the hand-off
      const k = P(t, 37.1, TH, 'inOutSine');
      if (k > 0) { const hp = Object.assign({ bloom: 0.4, vignette: 0.3, grain: 0.035 }, hs && hs.post ? (typeof hs.post === 'function' ? hs.post(TH) : hs.post) : {}); for (const key of ['bloom', 'vignette', 'grain']) g[key] = lerp(g[key], hp[key], k); }
      return g;
    },
    draw(ctx, T) {
      const t = clamp(T, T0, T1);
      // from the hand-off on, G is H (the G→H seam is identical frames)
      if (t >= TS) { const hs = hScene(); if (hs) { hs.draw(ctx, t, {}); return; } }
      const cap = t > 37.05 ? captureH(Math.max(t, TH)) : null, ek = endK(t);
      const c = camG(t), Z = c.z, lz = lg(Z);
      const world = (fn) => { ctx.save(); applyCam(ctx, c); fn(ctx); ctx.restore(); };
      const macroBG = t > RET ? sm((lz - lg(2.6)) / (lg(13) - lg(2.6))) : sm((lz - lg(4)) / (lg(9) - lg(4)));
      
      /* ---- page ---- */
      if (!cap) { ek.bgk = 0; ek.nk = 0; }
      const pa = 1 - ek.bgk;   // at the end the page itself gives way to H's evening street behind the kafes
      if (cap && (ek.bgk > 0 || ek.nk > 0)) { const f = cap.tc > TH + 1e-6 ? 1 : preF(t); ctx.drawImage(cap.bg, 540 - 540 * f, 960 - 960 * f, W * f, H * f); }
      // (the page never shows inside the window: there the niche dissolves straight into H's shop)
      const pageClip = !!cap && ek.nk > 0;
      if (pageClip) { ctx.save(); applyCam(ctx, c); const pcl = new Path2D(); pcl.rect(-3000, -3000, 7000, 8000); pcl.addPath(starPathIR(ek.ir)); ctx.clip(pcl, 'evenodd'); ctx.setTransform(1, 0, 0, 1, 0, 0); }
      if (macroBG < 1 && pa > 0.002) {
        drawParchment(ctx, SP.parch, (cx) => applyCam(cx, c), pa, 1 - P(t, 37.0, 37.3));
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
          }, { alpha: 0.92 * pa });
        }
        // evening falls on the page (bazaar palette) as the kafes spreads, before the street shows through
        const dk = 0.6 * P(t, 37.0, 37.32, 'inOutSine');
        if (dk > 0) { ctx.save(); ctx.globalAlpha = dk * pa; ctx.fillStyle = E.lin(ctx, 0, 0, 0, H, [[0, '#241634'], [0.5, '#4A2A45'], [1, '#6E3B3B']]); ctx.fillRect(0, 0, W, H); ctx.restore(); }
        // the lower page falls into shadow while the gloss is up (band stays mid-toned; gloss out 33.41 + 0.28)
        const gs = P(t, 31.62, 31.92, 'inOutSine') * (1 - P(t, 33.6, 33.95, 'inOutSine'));
        if (gs > 0) { ctx.fillStyle = E.lin(ctx, 0, 900, 0, H, [[0, '#3A2618', 0], [0.4, '#3A2618', 0.5 * gs], [1, '#2A1A10', 0.62 * gs]]); ctx.fillRect(0, 900, W, H - 900); }
        // footnote rule
        const rk = P(t, 28.93, 29.6, 'outCubic');
        if (rk > 0) world((h) => { h.strokeStyle = E.rgba('#5A2A2F', 0.4 * pa); h.lineWidth = 1.2; h.beginPath(); h.moveTo(540 - 400 * rk, 1180); h.lineTo(540 + 400 * rk, 1180); h.stroke(); });
      }
      if (pageClip) ctx.restore();

      /* ---- window world ---- */
      const openK = clamp((t - 28.82) / 0.95), rS = 60 + (RW - 60) * (ez.inOutCubic(openK) + 0.03 * Math.sin(PI * clamp((openK - 0.65) / 0.35))), oS = P(t, 28.86, 29.55);
      const winK = P(t, 29.36, 29.8, 'inOutSine');        // niche / frame appear (shutters reveal radially)
      const shutK = clamp((t - 30.18) / 0.6), shutE = ez.inOutCubic(shutK);   // (no inward squeeze: the halves never overlap)
      const vis = 1 - (t > RET ? sm((lz - lg(5)) / (lg(16) - lg(5))) : sm((lz - lg(7)) / (lg(12) - lg(7))));   // world visibility during macro
      if (vis > 0.002) world((h) => {
        h.save(); h.globalAlpha *= vis;
        // light spill on the page once open
        const spill = P(t, 30.2, 30.9) * (1 - 0.5 * P(t, 36.4, 37.2)) * (1 - P(t, 37.0, 37.3));
        if (spill > 0) {
          h.fillStyle = E.rad(h, SCX, SCY, RW * 0.6, RW * 1.9, [[0, '#FFE2A8', 0.42 * spill], [1, '#FFE2A8', 0]]); h.fillRect(SCX - 900, SCY - 900, 1800, 1800);
          h.save(); h.globalCompositeOperation = 'source-over';
          for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + PI / 16 + t * 0.03, L = 760 + 90 * Math.sin(t + i); h.fillStyle = E.rad(h, SCX, SCY, RW, L, [[0, '#FFD98A', 0.16 * spill], [1, '#FFD98A', 0]]); h.beginPath(); h.moveTo(SCX, SCY); h.lineTo(SCX + Math.cos(a - 0.05) * L, SCY + Math.sin(a - 0.05) * L); h.lineTo(SCX + Math.cos(a + 0.05) * L, SCY + Math.sin(a + 0.05) * L); h.closePath(); h.fill(); }
          h.restore();
        }
        // the star (opening) — before the niche covers its interior
        footMotes(h, t, SCX, SCY, 1 - P(t, 28.85, 29.3));
        if (openK <= 0) drawFootStar(h, t, SCX, SCY, 60, 1);
        else {
          // the footnote mark's own halo carries on and eases out while the star opens
          const pulse = 1 + 0.12 * Math.sin(t * 3.1), ha = 1 - P(t, 28.95, 29.75), hr = 60 * 3.6 * pulse + (rS - 60) * 1.3;
          if (ha > 0) { h.save(); h.globalAlpha *= ha; h.fillStyle = E.rad(h, SCX, SCY, 0, hr, [[0, '#FFE7B0', 0.9], [0.35, '#FFDC94', 0.42 + 0.08 * Math.sin(t * 3.1)], [1, '#FFE7B0', 0]]); h.fillRect(SCX - hr, SCY - hr, 2 * hr, 2 * hr); h.restore(); }
          const lw = lerp(2.7, 3.2, oS), col = E.hexOf(E.mix('#C69A42', '#B08030', oS)), fa = 1 - P(t, 37.0, 37.3);
          h.save(); h.globalAlpha *= fa; E.at(h, SCX, SCY, 1, 0, (cc) => star8a(cc, { r: rS, open: oS, draw: 1, girih: false, glow: 0.7 * (1 - winK * 0.6), lineW: lw, col })); h.restore();
          // clean 8-fold construction: each square edge runs on to one circumscribing circle and stops there
          if (oS > 0.01) {
            const ea = ez.inOutCubic(oS), rC = rS * 1.24, ext = new Path2D();
            for (const rot of [ea * PI / 8, ea * PI / 8 + PI / 4]) {
              const v = []; for (let i = 0; i < 4; i++) { const an = rot - PI / 2 + i * PI / 2; v.push([SCX + Math.cos(an) * rS, SCY + Math.sin(an) * rS]); }
              for (let i = 0; i < 4; i++) {
                const a0 = v[i], a1 = v[(i + 1) % 4], L = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]), ux = (a1[0] - a0[0]) / L, uy = (a1[1] - a0[1]) / L;
                for (const [q, sx, sy] of [[a1, ux, uy], [a0, -ux, -uy]]) {
                  const px = q[0] - SCX, py = q[1] - SCY, b = px * sx + py * sy, sL = -b + Math.sqrt(Math.max(0, b * b - rS * rS + rC * rC));
                  ext.moveTo(q[0], q[1]); ext.lineTo(q[0] + sx * sL * oS, q[1] + sy * sL * oS);
                }
              }
            }
            ext.moveTo(SCX + rC, SCY); ext.arc(SCX, SCY, rC, 0, TAU * oS);
            h.save(); h.globalAlpha *= fa * sm(oS * 1.5); h.lineCap = 'round';
            h.strokeStyle = 'rgba(58,36,8,0.4)'; h.lineWidth = lw * 1.5; h.stroke(ext);
            h.strokeStyle = col; h.lineWidth = lw * 0.7; h.stroke(ext);
            h.restore();
          }
        }
        if (winK > 0) {
          const clip = starPathIR(ek.ir);
          // niche (dissolves into H's shop, already drawn behind, at the end)
          if (ek.nk < 1) { h.save(); h.clip(clip); h.globalAlpha *= P(t, 29.88, 29.96, 'linear') * (1 - ek.nk);
            const n = SP.niche; h.drawImage(n.c, SCX - n.size / 2, SCY - n.size / 2, n.size, n.size);
            h.restore(); }
          // items, halos, seals
          h.save(); h.clip(clip);
          drawGallery(h, t, c);
          // the ghosts leave the niche for H's shelf slots (behind the window plane: clipped by it, under the frame)
          if (t >= flightStart(0) - 0.2) { h.save(); h.setTransform(1, 0, 0, 1, 0, 0); h.globalCompositeOperation = 'lighter'; drawFlight(h, t, c, cap); h.restore(); }
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
              const kk = Math.max(0.02, ez.inOutSine(rev)), sk = starPath(1 - kk);   // the recess grows as a STAR from the centre
              E.layer(h, (l) => { fresh(l, false); l.save(); l.setTransform(m); l.clip(sk); drawSh(l); l.restore(); });
              h.save(); h.globalCompositeOperation = 'lighter'; h.lineJoin = 'round'; h.strokeStyle = E.rgba('#FFE7B0', 0.45 * (1 - rev)); h.lineWidth = 9; h.stroke(sk); h.strokeStyle = E.rgba('#FFF6E0', 0.8 * (1 - rev)); h.lineWidth = 2; h.stroke(sk); h.restore();
            } else drawSh(h);
          }
          // the light between the shutters: the seam brightens first (anticipation, 30.06 →), opens into a column
          // as they part and then decays on its own envelope (it no longer switches off when the shutters are gone)
          const lc = 0.75 * (1 - 0.7 * shutK) * sm((t - 30.06) / 0.16) * (1 - sm((t - 30.5) / 0.55));
          if (lc > 0.002) { h.save(); h.globalCompositeOperation = 'lighter'; const gw = Math.max(2, shutE * (RW + 20) * 2); h.fillStyle = E.lin(h, SCX - gw / 2 - 30, 0, SCX + gw / 2 + 30, 0, [[0, '#FFE7B0', 0], [0.5, '#FFF6E0', lc], [1, '#FFE7B0', 0]]); h.fillRect(SCX - gw / 2 - 30, SCY - RW, gw + 60, 2 * RW); h.restore(); }
          h.restore();
          // frame (G's gold → H's walnut star frame, drawn by drawKafes)
          drawFrame(h, winK * (1 - ek.fk), t, ek.ir);
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
      // wing → overlapping scale shingles (ridged once they are big) → the girih grows out of the wing
      const sA = sm((lz - lg(1.9)) / (lg(3.0) - lg(1.9))) * (1 - sm((lz - lg(9)) / (lg(12.5) - lg(9))));
      drawScales(ctx, t, c, sA);
      const giA = t > RET ? sm((lz - lg(6)) / (lg(18) - lg(6))) : sm((lz - lg(7.5)) / (lg(11.5) - lg(7.5)));
      if (giA > 0.003) {
        const cell = 4.5 * Z, relief = P(t, 33.23, 33.97), hue = t * 0.22;
        const sweep = t < 33.2 ? clamp((t - 32.6) / 0.6) : clamp(((t - 33.25) % 0.75) / 0.75) * (t < 34.0 ? 1 : 0);
        const scl = cell / 100, sw = sweep > 0 && sweep < 1 ? sweep * 900 / (1800 * scl) : undefined;
        const hb = clamp((t - 34.05) / 0.62);   // 'güzel': a travelling colour band, not a full-frame strobe
        E.layer(ctx, (l) => {
          fresh(l, false);
          l.translate(c.sx, c.sy); l.rotate(c.rot + 0.2); l.scale(scl, scl);
          A.girih(l, { cx: 0, cy: 0, r: 1800, cell: 100, lineW: 3.4, hue, relief, sweep: sw, glow: 0.55 });
          l.setTransform(1, 0, 0, 1, 0, 0);
          if (hb > 0 && hb < 1) {
            const bx = lerp(-400, W + 400, ez.inOutSine(hb)), by = lerp(1500, 200, ez.inOutSine(hb));
            l.globalCompositeOperation = 'source-atop';
            l.fillStyle = E.lin(l, bx - 220, by + 120, bx + 220, by - 120, [[0, '#6FF0FF', 0], [0.3, '#B48CFF', 0.4], [0.55, '#FF7AD9', 0.45], [0.8, '#FFE66D', 0.4], [1, '#FFE66D', 0]]); l.fillRect(0, 0, W, H);
          }
          // while it resolves the girih lives only on the wing (it comes out of the scales, not around them)
          const gwm = 1 - sm((lz - lg(11)) / (lg(17) - lg(11)));
          if (gwm > 0.01) E.layer(l, (b) => {
            fresh(b, false);
            if (gwm < 1) { b.fillStyle = E.rgba('#000', 1 - gwm); b.fillRect(0, 0, W, H); }
            b.save(); applyCam(b, c); drawItem(b, 0, t, { flap: 1, bobK: 1 - c.mf }); b.restore();
          }, { op: 'destination-in' });
          l.globalCompositeOperation = 'destination-in';
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

      /* ---- end: the page has become H's kafes wall around the star window ---- */
      if (t > 36.99) drawKafes(ctx, t, c, ek);

      /* gloss band guard (macro) */
      const g = P(t, 31.9, 32.15, 'inOutSine') * (1 - P(t, 33.6, 33.95, 'inOutSine'));   // gloss 32.07–33.41 (+0.28 out)
      if (g > 0) { ctx.save(); ctx.translate(540, 1400); ctx.scale(1, 230 / 640); ctx.fillStyle = E.rad(ctx, 0, 0, 0, 640, [[0, '#06101A', 0.22 * g], [1, '#06101A', 0]]); ctx.fillRect(-640, -640, 1280, 1280); ctx.restore(); }
    },
  });

  /* gallery: items with pop, halos, seals, decay, ghosts */
  function drawGallery(h, t, c) {
    const halo = (it, k) => {
      if (k <= 0) return;
      h.save(); h.globalCompositeOperation = 'lighter';
      const hr = 112 * k + 1; h.fillStyle = E.rad(h, it.x, it.y, 0, hr, [[0, '#FFD98A', 0.2 * k], [0.6, '#FFC870', 0.08 * k], [1, '#FFC870', 0]]); h.fillRect(it.x - hr, it.y - hr, 2 * hr, 2 * hr);
      h.restore();
      h.save(); h.globalAlpha *= Math.min(1, k * 1.5); h.strokeStyle = E.rgba('#FFD98A', 0.65); h.lineWidth = 1.5; h.beginPath(); h.arc(it.x, it.y, 98 * k, 0, TAU); h.stroke(); h.restore();
    };
    for (let i = 0; i < ITEMS.length; i++) {
      const it = ITEMS[i];
      const pk = clamp((t - it.pop) / 0.45);
      if (pk <= 0) continue;
      const out0 = clamp((t - it.out) / 0.16);
      // soft contact shadow under the item, only as it pops (none before), gone with it
      { const sa = 0.42 * sm(pk * 1.6) * (1 - out0); if (sa > 0.01) { h.save(); h.translate(it.x, it.y + 86); h.scale(1, 0.3); h.fillStyle = E.rad(h, 0, 0, 0, 96, [[0, '#08040A', sa], [1, '#08040A', 0]]); h.fillRect(-100, -100, 200, 200); h.restore(); } }
      const out = out0, hk0 = ez.outBack(clamp((t - (31.37 + i * 0.05)) / 0.4));
      // halo: shrink to a dot, blink, gone
      const sh = clamp((t - (it.out - 0.12)) / 0.12);
      const hk = hk0 * (1 - ez.inBack(sh, 1.4));
      if (sh < 1) halo(it, Math.max(0, hk));
      if (sh > 0.7 && out < 1) { h.save(); h.globalCompositeOperation = 'lighter'; h.fillStyle = E.rad(h, it.x, it.y, 0, 30 * (1 - out) + 4, [[0, '#FFF0C8', 0.8 * (1 - out)], [1, '#FFF0C8', 0]]); h.fillRect(it.x - 40, it.y - 40, 80, 80); h.restore(); }
      // item
      const ia = 1 - out;
      if (ia > 0.003) {
        const s = ez.outBack(pk, 1.6);
        const o = { flap: lerp(0.86 + 0.14 * Math.sin(t * 1.9), 1, P(t, 31.8, 32.08)), bobK: 1 - c.mf };
        if (t > 35.1) o.flap = 1 - 0.12 * P(t, 35.1, 35.4) * (0.5 + 0.5 * Math.sin(t * 2.2));
        if (it.k === 'snow') o.melt = P(t, 35.55, 36.05, 'inOutSine');
        if (it.k === 'tul') o.droop = 0.32 * P(t, 35.6, 36.3);
        let a = ia;
        if (it.k !== 'bf') a *= 1 - 0.85 * P(t, 31.85, 32.25) * (1 - P(t, 34.75, 35.1));   // rack focus onto the butterfly for the macro dive
        if (it.k === 'bf') a *= 1 - 0.65 * P(t, 35.6, 36.2);
        if (it.k === 'tul') a *= 1 - 0.3 * P(t, 35.7, 36.3);
        if (it.k === 'snow') a *= 1 - P(t, 36.05, 36.4);
        h.save(); h.globalAlpha *= a;
        E.at(h, it.x, it.y, s, 0, () => { h.translate(-it.x, -it.y); drawItem(h, i, t, o); });
        if (it.k === 'pom') { const dull = P(t, 35.6, 36.2); if (dull > 0) { h.globalCompositeOperation = 'saturation'; h.globalAlpha = a * dull * 0.85; h.fillStyle = '#808080'; h.beginPath(); h.arc(it.x, it.y + 6, 68, 0, TAU); h.fill(); h.globalCompositeOperation = 'multiply'; h.globalAlpha = a * dull * 0.4; h.fillStyle = '#8A7A80'; h.fill(); } }
        h.restore();
        if (pk < 1) { h.save(); h.globalCompositeOperation = 'lighter'; h.fillStyle = E.rad(h, it.x, it.y, 0, 90, [[0, '#FFF4D2', 0.55 * (1 - pk)], [1, '#FFF4D2', 0]]); h.fillRect(it.x - 90, it.y - 90, 180, 180); h.restore(); }
        // glints while alive
        if (t > 31.5 && t < 35.5 || (t > 34.9 && t < 35.5)) { const gl = Math.pow(E.osc(t, 1.3 + i * 0.17, i * 0.29), 7); { const gx = it.x + 34 * Math.cos(i * 2.3), gy = it.y - 30 * Math.sin(i * 1.7 + 1); h.save(); h.globalCompositeOperation = 'lighter'; h.fillStyle = E.rad(h, gx, gy, 0, 16, [[0, '#FFFFFF', 0.8 * gl * ia], [1, '#FFFFFF', 0]]); h.fillRect(gx - 16, gy - 16, 32, 32); h.restore(); } }
      }
      // seal
      const sk = hk0 * (1 - clamp((t - it.out + 0.05) / 0.15));
      if (sk > 0.01) E.at(h, it.x + 78, it.y + 70, sk, 0, (cc) => star8a(cc, { r: 11, open: 0.6, draw: 1, glow: 0.6, lineW: 1.5, col: '#D8B26E', fill: 'rgba(216,178,110,0.35)' }));
      // ghost
      const ga = 0.6 * sm((t - it.out) / 0.3) * (t < flightStart(i) ? 1 : 0);   // hands over to the flying ghost (same spot)
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
    // snow droplet → a soft rising mist (wide, blurred, low-alpha puffs; no strokes)
    if (t > 35.95 && t < 37.4) {
      const it = ITEMS[2];
      h.save(); h.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 6; k++) {
        const age = t - (36.0 + k * 0.07); if (age < 0 || age > 1.2) continue;
        const u = age / 1.2, x = it.x + (E.hash(k, 51) - 0.5) * 40 + Math.sin(age * 2 + k) * 14 * u, y = it.y + 4 - 110 * ez.outCubic(u), r = 22 + 70 * u;
        h.fillStyle = E.rad(h, x, y, 0, r, [[0, '#DDF2FF', 0.2 * Math.sin(PI * u)], [1, '#DDF2FF', 0]]); h.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
      h.restore();
    }
  }
  /* the page around the window becomes H's kafes wall: H_numune drawLatticeFG re-drawn on G's camera (screen R =
   * RW·z, same cell/line/star/frame/half-res blur), grown out from the star frame (rev), thin gold → walnut (mk),
   * frame gold → walnut (fk), star inner ratio 0.765 → 0.82. At 37.60 (R 500) it is H's own first frame. */
  function drawKafes(ctx, t, c, ek) {
    if (ek.rev <= 0.001 && ek.fk <= 0.001) return;
    const R = RW * c.z, s = R / 500, pc = toScreen(c, SCX, SCY);
    const star = new Path2D(); star.addPath(S.starPath(R, 8, ek.ir, PI / 8), new DOMMatrix().translate(pc[0], pc[1]).rotate(c.rot * 180 / PI));
    E.layer(ctx, (l) => {
      fresh(l, true);
      if (ek.rev > 0.001) {
        const outer = new Path2D(); outer.rect(-300, -300, W + 600, H + 600); outer.addPath(star);
        l.save(); l.clip(outer, 'evenodd');
        l.save(); l.translate(pc[0], pc[1]); if (c.rot) l.rotate(c.rot); l.scale(s, s);
        A.lattice(l, { w: (W + 700) / s, h: (H + 900) / s, cell: 78, lineW: 14 * lerp(0.26, 1, ek.mk), stroke: ek.mk >= 1 ? '#4A2E1C' : E.hexOf(E.mix('#D8B26E', '#4A2E1C', ek.mk)) });
        l.restore();
        if (ek.rev < 1) {   // spreads outward from the frame
          // the front starts just inside the star's notches (nothing visible at e=0) and its opaque edge is past the
          // farthest corner (≈1280 px) before the mask is dropped at e=1
          const e = ek.rev, r2 = R * (0.74 + 3.3 * e), r1 = Math.max(0, r2 - R * 0.7);
          l.globalCompositeOperation = 'destination-in';
          l.fillStyle = E.rad(l, pc[0], pc[1], r1, r2, [[0, '#000', 1], [1, '#000', 0]]); l.fillRect(-300, -300, W + 600, H + 600);
        }
        l.globalCompositeOperation = 'source-atop';
        l.fillStyle = E.rad(l, pc[0], pc[1], R * 0.9, R * 1.9, [[0, '#E0905A', 0.22 * ek.mk], [1, '#E0905A', 0]]); l.fillRect(0, 0, W, H);
        l.restore();
      }
      if (ek.fk > 0.001) {
        l.globalAlpha = ek.fk; l.lineJoin = 'miter';
        l.strokeStyle = '#2E1A10'; l.lineWidth = 40 * s; l.stroke(star);
        l.strokeStyle = E.lin(l, 0, pc[1] - R, 0, pc[1] + R, [[0, '#8E6444'], [0.5, '#6E4A32'], [1, '#4A2E1C']]); l.lineWidth = 26 * s; l.stroke(star);
        l.strokeStyle = 'rgba(232,194,122,0.85)'; l.lineWidth = Math.max(1.5, 3 * s); l.stroke(star);
      }
    }, { lo: true, blur: ek.blur });
  }
  /* each ghost glides from its niche spot onto its H shelf slot and becomes H's own ghost drawing there (same
   * place, size, alpha and flicker as H_numune drawGhosts at 37.60); screen space, inside the window clip */
  function drawFlight(h, t, c, cap) {
    const base = h.globalAlpha;
    for (let i = 0; i < ITEMS.length; i++) {
      const t0 = flightStart(i); if (t < t0) continue;
      const it = ITEMS[i], gG = SP.ghost[i];
      const aG = 0.6 * (it.k === 'snow' ? 0.62 : 1) * (0.9 + 0.1 * Math.sin(t * 3 + i));
      const p0 = toScreen(c, it.x, it.y), k0 = c.z / 2;                  // G sprite: 2 px per world unit
      const C0 = [p0[0] + (gG.bx - 300) * k0, p0[1] + (gG.by - 300) * k0], S0 = gG.bs * k0;
      if (!cap) { const a = aG * (1 - P(t, 37.2, 37.5)); if (a > 0.003) { h.globalAlpha = base * a; h.setTransform(k0, 0, 0, k0, C0[0] - k0 * gG.bx, C0[1] - k0 * gG.by); h.drawImage(gG.c, 0, 0); } continue; }
      const hg0 = cap.g[i], pf = cap.tc > TH + 1e-6 ? 1 : preF(t), hg = pf === 1 ? hg0 : Object.assign({}, hg0, { cx: 540 + (hg0.cx - 540) * pf, cy: 960 + (hg0.cy - 960) * pf, S: hg0.S * pf });
      const w = ez.inOutSine(clamp((t - t0 - FL_LEAD) / (FL1 - t0 - FL_LEAD)));
      const Cx = lerp(C0[0], hg.cx, w), Cy = lerp(C0[1], hg.cy, w), Sz = Math.exp(lerp(lg(S0), lg(hg.S), w));
      const x = E.smoother((t - t0) / (FL1 - 0.03 - t0)), aH = hg.a * hFlick(hg.iH, t) / hFlick(hg.iH, cap.tc);
      if (x < 1) { const k = Sz / gG.bs; h.globalAlpha = base * aG * (1 - x); h.setTransform(k, 0, 0, k, Cx - k * gG.bx, Cy - k * gG.by); h.drawImage(gG.c, 0, 0); }
      if (x > 0) { const k = Sz / hg.bs; h.globalAlpha = base * Math.min(1, aH) * x; h.setTransform(k, 0, 0, k, Cx - k * hg.bx, Cy - k * hg.by); h.drawImage(hg.img, 0, 0); }
    }
    h.globalAlpha = base; h.setTransform(1, 0, 0, 1, 0, 0);
  }
})();
