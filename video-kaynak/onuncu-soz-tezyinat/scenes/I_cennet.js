/* =====================================================================================
 * I_cennet · 47.60–61.90 · "Öyle ise elbette şu dünyadaki o çeşit tezyinat, bir Rahman-ı
 * Rahîm'in rahmetiyle, sevdiği ibadına hazırladığı niam-ı cennetin numuneleridir, denilebilir
 * ve denilir ve öyledir."   — the emotional peak (brightest frame 60.15)
 * -------------------------------------------------------------------------------------
 * COMPOSITION / PARALLAX RIG (world = hero layer p 1, nominal cam (540,960) z 1)
 *   L0 sky      p .05  #FFFDF7 → #FFF1D6 → #E8F7EE, sourceless top light (no disc), light clouds
 *   L1 far      p .20  palace terrace y 300–520: golden central dome + 2 marble köşks, cypresses, haze
 *   L2 mid      p .55  4 terraced tiers y 520–1060 (#A6E3C9/#6FD1A9/#39C98C), marble walls w/ gold trim,
 *                      three S-curve rivers (water / milk / honey) with cascades, fruit trees, cypresses
 *   L3 hero     p 1    marble terrace y 905–1132 (gold trims): 7 seccades + kandils + low tables,
 *                      bounties (paradise HeroRose R290 @ (740,540), pomegranate tree, gold grapes,
 *                      overflowing Iznik bowl on the central plinth), crescendo rings; below it the
 *                      deep-green garden with a dark canal (gloss band stays #2E7F62 → #1F5E4C)
 *   L4 jar      p 1.35 bell jar with the earthly mini garden + the world's mini rose (sample)
 *   L5 fg       p 1.8  marble balustrade + rose bushes, pre-blurred (foot band)
 * CAMERA: 47.6–49.75 crane down from gate height (y 560→960, z 1.3→1, outQuint) · 49.65–51.4 push to the jar
 *   (z 1.12, x −60) · 51.9–53.9 reverent stillness (y −40 only) · 54.1–56.15 lateral dolly right (x→740)
 *   · 56.12–57.1 push & align on the rose (z 1.15) · breaths 1.15→1.08→1.0→0.92 on the 3 crescendo words.
 * BEATS: 47.6 whiteout decays, vista blur 14→3 · 49.0 "elbette" snap to focus + clear ring pulse ·
 *   49.77 jar floats in (vista blur 4) · 50.41 bloom-wave replay inside the jar · 52.0 light from above +
 *   light rain; flowers bloom where it lands · 53.09 +15 % exposure, 5 soft shafts · 54.2 rose-gold love
 *   wave · 54.68 7 seccades unroll · 55.13 kandils light, low tables with fruit · 56.18 bounties materialise
 *   from light · 56.6 bowl overflows · 57.12 jar-rose concentric with the paradise rose, grows into it
 *   (gold contour on the shared 128-pt silhouette), glass → sparkles · 57.88 ring 1 (thin star8) · 59.15
 *   ring 2, ring 1 locks (+22.5°) · 60.08 ring 3 rosette + bloom flash (brightest) · 60.6 rosette folds into
 *   the footnote star8 (r 40), vista → white → dawn · 61.3 star descends to the horizon (y 1020) and
 *   morphs (128 pts) into J's dawn sun (r 70 #FFF4D6, glow #FFD98A r 300).
 * BAND (y 1229–1574): always the dark garden; rain there is sparse/slow (lightRain bandSlow); no blooms,
 *   exposure lifts are masked out of it, feathered scrim ≤ 0.22 while a gloss is up.
 * No beings, no figures, no text. Light is sourceless and comes from above.
 * ===================================================================================== */
(function () {
  'use strict';
  const W = 1080, H = 1920, TAU = Math.PI * 2, PI = Math.PI;
  const clamp = E.clamp, lerp = E.lerp, sm = E.smooth;
  const P = (t, a, b, e) => E.p(t, a, b, e);
  const hs = (i, s) => E.hash(i, s);

  /* ---------------- palette ---------------- */
  const C = {
    sky0: '#FFFDF7', sky1: '#FFF1D6', sky2: '#E8F7EE', sky3: '#BDEBD8',
    t1: '#A6E3C9', t2: '#6FD1A9', t3: '#39C98C', band0: '#2E7F62', band1: '#1F5E4C', band2: '#163F35',
    marble: '#FFFBF3', marbleS: '#E9DDCB', marbleD: '#CFC0A8', gold: '#E6B85C', goldL: '#FFE3A1', goldD: '#B8862E',
    water: '#8FDCFF', milk: '#FFFDF5', honey: '#FFC15E', rose: '#FF6F91', rose2: '#FF9DB5', pom: '#E8384F',
    gold2: '#FFD27A', emerald: '#2FBF7F', love: '#FFC7D6', cyp: '#1F8F64', cypD: '#14684A',
  };

  /* ---------------- key world positions (hero layer p 1) ---------------- */
  const ROSE = { x: 740, y: 540, R: 290 };            // visual centre of the paradise rose
  const RUG_X = (i) => 740 + (i - 3) * 132;          // 7 seccades
  const RUG_Y = 1000, KAN_Y = 962, PLINTH_Y = 905, PLINTH_TOP = 881;
  const JAR = { w: 250, h: 375, wx: 372, wy: 650, p: 1.35, ROFF: 0.42 };   // ROFF: mini-rose centre height (×h) above base
  const MINI = 0.12;

  /* ======================= CAMERA ======================= */
  function camAt(t) {
    const a = P(t, 47.6, 49.85, 'outCubic');
    let x = 540, y = lerp(380, 790, a), z = lerp(1.3, 1.0, a);
    const b = P(t, 49.65, 51.4, 'inOutCubic'); x = lerp(x, 480, b); z = lerp(z, 1.12, b);
    y -= 20 * P(t, 51.9, 53.9, 'inOutSine');
    const d = P(t, 54.1, 56.15, 'inOutCubic'); x = lerp(x, 740, d); z = lerp(z, 1.0, d); y = lerp(y, 805, d);
    const e = P(t, 56.12, 57.1, 'inOutCubic');
    let zr = 1.15;
    zr = lerp(zr, 1.08, P(t, 57.86, 58.24, 'outCubic'));
    zr = lerp(zr, 1.0, P(t, 59.14, 59.52, 'outCubic'));
    zr = lerp(zr, 0.92, P(t, 60.06, 60.44, 'outCubic'));
    z = lerp(z, zr, e);
    x = lerp(x, ROSE.x, e); y = lerp(y, ROSE.y + 100 / z + 220 / z, e);   // rose centre lands on screen (540, 640)
    x += 3 * Math.sin(0.37 * t); y += 2 * Math.sin(0.29 * t + 1);
    return { x, y, zoom: z };
  }
  function camX0(t) { const b = P(t, 49.65, 51.4, 'inOutCubic'), d = P(t, 54.1, 56.15, 'inOutCubic'), e = P(t, 56.12, 57.1, 'inOutCubic'); return lerp(lerp(lerp(540, 480, b), 740, d), ROSE.x, e) + 3 * Math.sin(0.37 * t); }
  function toScreen(cam, p, wx, wy) {
    const z = 1 + (cam.zoom - 1) * p, cx = 540 + (cam.x - 540) * p, cy = 960 + (cam.y - 960) * p;
    return [540 + (wx - cx) * z, 960 + (wy - cy) * z, z];
  }
  const lay = (ctx, cam, p, fn) => E.parallax(ctx, cam, p, fn);

  /* ======================= AUTHORING HELPERS ======================= */
  const LG = (x, x0, y0, x1, y1, st) => E.lin(x, x0, y0, x1, y1, st);
  function archPath(p, x, yb, w, h) {
    const hw = w / 2, ys = yb - h + w * 0.62;
    p.moveTo(x - hw, yb); p.lineTo(x - hw, ys);
    p.bezierCurveTo(x - hw, ys - w * 0.38, x - hw * 0.32, yb - h + w * 0.1, x, yb - h);
    p.bezierCurveTo(x + hw * 0.32, yb - h + w * 0.1, x + hw, ys - w * 0.38, x + hw, ys);
    p.lineTo(x + hw, yb); p.closePath();
  }
  function domePath(cx, by, w, h) {
    const p = new Path2D(), hw = w / 2;
    p.moveTo(cx - hw, by);
    p.bezierCurveTo(cx - hw * 1.17, by - h * 0.4, cx - hw * 0.66, by - h * 0.8, cx, by - h);
    p.bezierCurveTo(cx + hw * 0.66, by - h * 0.8, cx + hw * 1.17, by - h * 0.4, cx + hw, by);
    p.closePath(); return p;
  }
  function finial(x, cx, by, h, col) {
    x.fillStyle = LG(x, cx - h * 0.08, 0, cx + h * 0.08, 0, [[0, C.goldL], [0.5, col || C.gold], [1, C.goldD]]);
    x.fillRect(cx - h * 0.025, by - h, h * 0.05, h);
    for (const [yy, r] of [[0.25, 0.085], [0.55, 0.065], [0.78, 0.04]]) { x.beginPath(); x.arc(cx, by - h * yy, h * r, 0, TAU); x.fill(); }
    x.beginPath(); x.moveTo(cx - h * 0.03, by - h * 0.9); x.lineTo(cx, by - h * 1.12); x.lineTo(cx + h * 0.03, by - h * 0.9); x.fill();
  }
  function dome(x, cx, by, w, h, gilded) {
    const p = domePath(cx, by, w, h);
    const base = gilded ? ['#FFF4CF', '#F6CF72', '#D49A36', '#94621A'] : ['#FFFFFF', '#FAF4EA', '#DCD2C8', '#B4A8A6'];
    x.fillStyle = LG(x, cx - w * 0.6, by - h, cx + w * 0.55, by, [[0, base[0]], [0.36, base[1]], [0.7, base[2]], [1, base[3]]]); x.fill(p);
    x.save(); x.clip(p);
    // cool shadow side (right), warm bounce at the base
    x.fillStyle = LG(x, cx, 0, cx + w * 0.6, 0, [[0, gilded ? '#7A4A10' : '#8C86A8', 0], [1, gilded ? '#7A4A10' : '#8C86A8', gilded ? 0.32 : 0.22]]); x.fillRect(cx, by - h, w, h);
    x.fillStyle = E.rad(x, cx - w * 0.2, by - h * 0.74, 0, w * 0.42, [[0, '#FFFFFF', 0.9], [1, '#FFFFFF', 0]]); x.fillRect(cx - w, by - h * 1.2, w * 2, h * 1.4);
    x.strokeStyle = E.rgba(gilded ? '#FFF3CF' : C.gold, gilded ? 0.6 : 0.55); x.lineWidth = Math.max(0.8, w * 0.012);
    for (let k = -3; k <= 3; k++) { const f = k / 3.6; x.beginPath(); x.ellipse(cx, by, Math.abs(f) * w * 0.58 + 0.5, h, 0, PI, TAU); x.stroke(); }
    x.restore();
    // rim light on the lit (left/top) edge
    x.save(); x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = Math.max(1, w * 0.018); x.beginPath(); x.moveTo(cx - w / 2, by);
    x.bezierCurveTo(cx - w * 0.585, by - h * 0.4, cx - w * 0.33, by - h * 0.8, cx, by - h); x.stroke(); x.restore();
    x.fillStyle = LG(x, cx - w / 2, 0, cx + w / 2, 0, [[0, C.goldL], [0.4, C.gold], [1, '#8E5E1C']]);
    x.fillRect(cx - w * 0.52, by - h * 0.035, w * 1.04, h * 0.07);
    finial(x, cx, by - h + h * 0.02, h * 0.42, gilded ? '#F2C66A' : null);
  }
  function pavilion(x, cx, gy, w, h, n, o = {}) {
    const top = gy - h;
    x.fillStyle = LG(x, cx - w / 2, 0, cx + w / 2, 0, [[0, '#FFFFFF'], [0.5, C.marble], [1, '#E3D8CC']]); x.fillRect(cx - w / 2, top, w, h);
    const aw = (w / n) * 0.62, ah = h * 0.66;
    for (let i = 0; i < n; i++) {
      const ax = cx - w / 2 + (w / n) * (i + 0.5), p = new Path2D(); archPath(p, ax, gy - h * 0.08, aw, ah);
      x.fillStyle = LG(x, 0, gy - h * 0.08 - ah, 0, gy, [[0, '#FFFDF4'], [0.45, '#FFE7B0'], [1, '#F2B860']]); x.fill(p);
      x.save(); x.clip(p); x.fillStyle = 'rgba(150,100,40,0.25)'; x.fillRect(ax - aw / 2, gy - h * 0.08 - ah, aw * 0.22, ah); x.restore();
      x.strokeStyle = C.goldD; x.lineWidth = Math.max(1, w * 0.007); x.stroke(p);
    }
    x.fillStyle = 'rgba(110,90,110,0.16)'; x.fillRect(cx - w / 2, top + h * 0.03, w, h * 0.05);
    x.fillStyle = C.gold; x.fillRect(cx - w / 2 - w * 0.02, top - h * 0.02, w * 1.04, Math.max(1.5, h * 0.045));
    x.fillStyle = C.goldL; x.fillRect(cx - w / 2 - w * 0.02, top - h * 0.02, w * 1.04, Math.max(0.8, h * 0.015));
    x.fillStyle = E.rgba(C.goldD, 0.85); x.fillRect(cx - w / 2, gy - h * 0.07, w, Math.max(1, h * 0.025));
    x.fillStyle = E.rgba(C.goldD, 0.8);
    const nd = Math.max(4, Math.round(w / (h * 0.12)));
    for (let i = 0; i < nd; i++) { x.beginPath(); x.arc(cx - w / 2 + (w / nd) * (i + 0.5), top + h * 0.06, Math.max(0.7, h * 0.014), 0, TAU); x.fill(); }
    // cool shadow side + rim light
    x.fillStyle = LG(x, cx + w * 0.05, 0, cx + w / 2, 0, [[0, 'rgba(96,88,130,0)'], [1, 'rgba(96,88,130,0.26)']]); x.fillRect(cx + w * 0.05, top, w * 0.45, h);
    x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(cx - w / 2, top, Math.max(1, w * 0.012), h);
    if (o.turrets) {
      for (const s of [-1, 1]) {
        const tx = cx + s * (w / 2 - w * 0.05), tw = w * 0.1;
        x.fillStyle = LG(x, tx - tw / 2, 0, tx + tw / 2, 0, [[0, '#FFFFFF'], [1, '#D9CEC8']]); x.fillRect(tx - tw / 2, top - h * 0.35, tw, h * 0.35);
        dome(x, tx, top - h * 0.35, tw * 1.3, tw * 1.25, false);
      }
    }
  }
  function cypress(x, bx, by, h, w, col, rim) {
    const p = new Path2D();
    p.moveTo(bx, by - h);
    p.bezierCurveTo(bx + w * 0.42, by - h * 0.72, bx + w * 0.62, by - h * 0.25, bx + w * 0.3, by);
    p.lineTo(bx - w * 0.3, by);
    p.bezierCurveTo(bx - w * 0.62, by - h * 0.25, bx - w * 0.42, by - h * 0.72, bx, by - h); p.closePath();
    x.fillStyle = LG(x, bx - w / 2, 0, bx + w / 2, 0, [[0, E.shade(col, 0.18)], [0.45, col], [1, E.shade(col, -0.3)]]); x.fill(p);
    x.save(); x.clip(p); x.strokeStyle = E.rgba(rim, 0.5); x.lineWidth = Math.max(1, w * 0.1);
    x.beginPath(); x.moveTo(bx, by - h); x.bezierCurveTo(bx - w * 0.42, by - h * 0.72, bx - w * 0.62, by - h * 0.25, bx - w * 0.3, by); x.stroke();
    x.strokeStyle = E.rgba(E.shade(col, -0.35), 0.35); x.lineWidth = Math.max(0.6, w * 0.04);
    for (let i = 0; i < 6; i++) { const yy = by - h * (0.12 + i * 0.13), ww = w * 0.32 * Math.sin(PI * (yy - (by - h)) / h); x.beginPath(); x.moveTo(bx - ww, yy); x.quadraticCurveTo(bx, yy + w * 0.1, bx + ww, yy - w * 0.04); x.stroke(); }
    x.restore();
  }
  /** round canopy tree; kind 0 fruit (gold+red), 1 blossom pink, 2 pomegranate */
  function roundTree(x, bx, by, r, col, kind, seed) {
    x.strokeStyle = '#8A6A4A'; x.lineWidth = Math.max(1, r * 0.14); x.lineCap = 'round';
    x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(bx + r * 0.08, by - r * 0.6, bx, by - r * 1.05); x.stroke();
    const cy = by - r * 1.55, blobs = 7, cl = E.shade(col, 0.22), cd = E.shade(col, -0.28);
    for (let i = 0; i < blobs; i++) {
      const a = (i / blobs) * TAU + hs(i, seed) * 0.6, rr = r * (0.48 + 0.18 * hs(i, seed + 1));
      const px = bx + Math.cos(a) * r * 0.5, py = cy + Math.sin(a) * r * 0.36;
      x.fillStyle = E.rad(x, px - rr * 0.35, py - rr * 0.45, 0, rr * 1.2, [[0, cl], [0.6, col], [1, cd]]);
      x.beginPath(); x.arc(px, py, rr, 0, TAU); x.fill();
    }
    x.fillStyle = E.rad(x, bx - r * 0.25, cy - r * 0.3, 0, r * 0.75, [[0, cl], [1, col]]); x.beginPath(); x.arc(bx, cy - r * 0.08, r * 0.62, 0, TAU); x.fill();
    x.save(); x.globalCompositeOperation = 'source-atop';
    x.fillStyle = LG(x, 0, cy - r, 0, cy, [[0, '#FFFBEA', 0.45], [1, '#FFFBEA', 0]]); x.fillRect(bx - r * 1.3, cy - r * 1.2, r * 2.6, r * 1.2);
    x.fillStyle = LG(x, 0, cy, 0, cy + r * 0.8, [[0, '#0E4A36', 0], [1, '#0E4A36', 0.22]]); x.fillRect(bx - r * 1.3, cy, r * 2.6, r * 0.9);
    x.restore();
    const n = kind === 1 ? 16 : 9;
    for (let i = 0; i < n; i++) {
      const a = hs(i, seed + 5) * TAU, d = Math.sqrt(hs(i, seed + 6)) * r * 0.85;
      const fx = bx + Math.cos(a) * d, fy = cy + Math.sin(a) * d * 0.7, fr = r * (kind === 1 ? 0.09 : 0.11);
      const fc = kind === 1 ? (i % 3 ? C.rose2 : '#FFFFFF') : kind === 2 ? C.pom : (i % 2 ? C.gold2 : C.pom);
      x.fillStyle = E.rad(x, fx - fr * 0.3, fy - fr * 0.3, 0, fr * 1.2, [[0, E.shade(fc, 0.45)], [0.6, fc], [1, E.shade(fc, -0.25)]]);
      x.beginPath(); x.arc(fx, fy, fr, 0, TAU); x.fill();
    }
  }
  function hazeOver(x, w, h, col, a) { x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = E.rgba(col, a); x.fillRect(0, 0, w, h); x.restore(); }
  function leaf(x, len, wid, col) {
    const p = S.petalPath(-len, wid, 0.72);
    x.fillStyle = LG(x, -wid, 0, wid, -len * 0.3, [[0, E.shade(col, 0.22)], [0.5, col], [1, E.shade(col, -0.3)]]); x.fill(p);
    x.strokeStyle = E.rgba(E.shade(col, 0.45), 0.6); x.lineWidth = Math.max(0.8, wid * 0.08);
    x.beginPath(); x.moveTo(0, -len * 0.05); x.quadraticCurveTo(wid * 0.06, -len * 0.5, 0, -len * 0.9); x.stroke();
  }

  /* ======================= SPRITES ======================= */
  const SP = {};
  // L1 far palace: world x −320..1400, y 120..880
  const FAR = { x0: -320, y0: 120, w: 1720, h: 760 };
  function buildFar() {
    const b = E.canvas(FAR.w, FAR.h), x = b.x; x.translate(-FAR.x0, -FAR.y0);
    x.fillStyle = LG(x, 0, 380, 0, 880, [[0, '#DCEFEE'], [1, '#C6E6DD']]);
    x.beginPath(); x.moveTo(FAR.x0, 880);
    for (let wx = FAR.x0; wx <= FAR.x0 + FAR.w; wx += 20) x.lineTo(wx, 470 - 40 * Math.sin(wx * 0.004 + 1) - 22 * Math.sin(wx * 0.011 + 2));
    x.lineTo(FAR.x0 + FAR.w, 880); x.closePath(); x.fill();
    const gy = 520;
    x.fillStyle = LG(x, 0, gy - 40, 0, gy + 60, [[0, '#FFFFFF'], [0.5, C.marble], [1, C.marbleS]]); x.fillRect(FAR.x0, gy - 34, FAR.w, 120);
    x.fillStyle = C.gold; x.fillRect(FAR.x0, gy - 36, FAR.w, 3);
    for (let wx = FAR.x0 + 10; wx < FAR.x0 + FAR.w; wx += 26) { const p = new Path2D(); archPath(p, wx, gy - 6, 12, 22); x.fillStyle = 'rgba(255,236,190,0.9)'; x.fill(p); x.strokeStyle = E.rgba(C.gold, 0.6); x.lineWidth = 1; x.stroke(p); }
    for (let i = 0; i < 22; i++) {
      const wx = FAR.x0 + 40 + i * 78 + hs(i, 3) * 30, hh = 70 + hs(i, 4) * 60;
      if (i % 3 === 0) roundTree(x, wx, gy - 30, 22 + hs(i, 5) * 8, C.t2, i % 2, i + 1);
      else cypress(x, wx, gy - 30, hh, 18 + hs(i, 6) * 6, '#4AAE8E', '#F4FFF8');
    }
    for (const [cx, w, h, dw] of [[30, 120, 70, 70], [1090, 120, 70, 70]]) {
      pavilion(x, cx, gy - 30, w, h, 3, {});
      x.fillStyle = C.gold; x.beginPath(); x.moveTo(cx - w * 0.55, gy - 30 - h); x.lineTo(cx, gy - 30 - h - dw * 0.8); x.lineTo(cx + w * 0.55, gy - 30 - h); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.moveTo(cx - w * 0.55, gy - 30 - h); x.lineTo(cx, gy - 30 - h - dw * 0.8); x.lineTo(cx - w * 0.1, gy - 30 - h); x.closePath(); x.fill();
      finial(x, cx, gy - 30 - h - dw * 0.78, 30);
    }
    for (const cx of [300, 820]) {
      pavilion(x, cx, gy - 30, 170, 92, 3, { turrets: true });
      x.fillStyle = LG(x, cx - 50, 0, cx + 50, 0, [[0, '#FFFFFF'], [1, C.marbleS]]); x.fillRect(cx - 46, gy - 30 - 92 - 26, 92, 26);
      x.fillStyle = C.gold; x.fillRect(cx - 50, gy - 30 - 92 - 28, 100, 3);
      dome(x, cx, gy - 30 - 92 - 26, 104, 96, false);
    }
    {
      const cx = 560, w = 330, h = 128;
      pavilion(x, cx, gy - 30, w, h, 5, { turrets: true });
      x.fillStyle = LG(x, cx - 90, 0, cx + 90, 0, [[0, '#FFFFFF'], [1, C.marbleS]]); x.fillRect(cx - 88, gy - 30 - h - 44, 176, 44);
      for (let i = 0; i < 6; i++) { const p = new Path2D(); archPath(p, cx - 70 + i * 28, gy - 30 - h - 6, 12, 28); x.fillStyle = '#FFF0CC'; x.fill(p); }
      x.fillStyle = C.gold; x.fillRect(cx - 94, gy - 30 - h - 46, 188, 4);
      dome(x, cx, gy - 30 - h - 44, 196, 190, true);
      for (const s of [-1, 1]) dome(x, cx + s * 128, gy - 30 - h, 54, 52, false);
    }
    x.fillStyle = LG(x, 0, gy - 20, 0, gy + 140, [[0, '#F2FBF8', 0], [0.6, '#F2FBF8', 0.4], [1, '#F2FBF8', 0.65]]); x.fillRect(FAR.x0, gy - 20, FAR.w, 400);
    hazeOver(x, FAR.w, FAR.h, '#EAF4F3', 0.08);
    SP.far = b.c;
  }

  // L2 mid terraces: world x −380..1460, y 470..1240
  const MID = { x0: -380, y0: 470, w: 1840, h: 770 };
  const TIERS = [ // [lip base y, bulge, wall height, grass colour, back colour]
    [585, 10, 14, '#A7E2CC', '#CBEDE2'], [668, 16, 20, '#74D3AE', '#A7E2CC'], [770, 22, 27, '#45C593', '#74D3AE'], [895, 30, 34, '#27B37C', '#45C593'], [1060, 40, 42, '#1C9D68', '#27B37C'],
  ];
  const lipY = (k, wx) => { const T = TIERS[k], u = (wx - 560) / 820; return T[0] + T[1] * (1 - u * u) - 6 * Math.sin(wx * 0.006 + k); };
  const RIVERS = [
    { col: C.water, edge: '#4FAED8', hi: '#FFFFFF', pts: [[470, 528, 7], [425, 600, 14], [475, 690, 24], [360, 800, 36], [300, 935, 56], [170, 1080, 84], [90, 1240, 110]] },
    { col: C.milk, edge: '#BCCBD3', hi: '#FFFFFF', pts: [[560, 528, 7], [590, 600, 14], [535, 700, 26], [605, 812, 38], [525, 945, 58], [575, 1085, 86], [540, 1240, 112]] },
    { col: C.honey, edge: '#D88A22', hi: '#FFF1C4', pts: [[650, 528, 7], [705, 605, 14], [655, 702, 24], [775, 808, 36], [830, 938, 56], [945, 1082, 84], [1030, 1240, 110]] },
  ];
  function riverSample(r, n = 96) {
    const pts = r.pts, out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const m = Math.ceil(n / (pts.length - 1));
      for (let k = 0; k < m; k++) {
        const u = k / m, u2 = u * u, u3 = u2 * u;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function ribbon(sp, wk = 1, dx = 0) {
    const L = [], R = [];
    for (let i = 0; i < sp.length; i++) {
      const a = sp[Math.max(0, i - 1)], c = sp[Math.min(sp.length - 1, i + 1)], ddx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(ddx, dy) || 1;
      const nx = -dy / l, ny = ddx / l, w = sp[i][2] * 0.5 * wk;
      L.push([sp[i][0] + dx * sp[i][2] + nx * w, sp[i][1] + ny * w * 0.35]); R.push([sp[i][0] + dx * sp[i][2] - nx * w, sp[i][1] - ny * w * 0.35]);
    }
    const p = new Path2D(); p.moveTo(L[0][0], L[0][1]); for (const q of L) p.lineTo(q[0], q[1]); for (let i = R.length - 1; i >= 0; i--) p.lineTo(R[i][0], R[i][1]); p.closePath();
    return p;
  }
  function buildMid() {
    const b = E.canvas(MID.w, MID.h), x = b.x; x.translate(-MID.x0, -MID.y0);
    const X0 = MID.x0, X1 = MID.x0 + MID.w;
    let prevBottom = (wx) => 515 + 6 * Math.sin(wx * 0.01);
    for (let k = 0; k < TIERS.length; k++) {
      const [, , wh, col, back] = TIERS[k];
      const top = prevBottom;
      const surf = new Path2D(); surf.moveTo(X0, 1300);
      for (let wx = X0; wx <= X1; wx += 20) surf.lineTo(wx, top(wx)); surf.lineTo(X1, 1300); surf.closePath();
      const ty = top(560), ly = lipY(k, 560);
      x.fillStyle = LG(x, 0, ty, 0, ly, [[0, back], [0.35, col], [1, E.shade(col, -0.07)]]); x.fill(surf);
      x.save(); x.clip(surf);
      if (k > 0) { x.fillStyle = LG(x, 0, ty, 0, ty + 34, [[0, '#0F5A3E', 0.42], [1, '#0F5A3E', 0]]); x.fillRect(X0, ty - 10, X1 - X0, 60); }
      // soft lit patches (light from above through the canopy)
      for (let i = 0; i < 10; i++) { const wx = X0 + hs(i, 90 + k) * (X1 - X0), yy = lerp(ty, ly, 0.3 + 0.4 * hs(i, 95 + k)); x.fillStyle = E.rad(x, wx, yy, 0, 120 + k * 30, [[0, '#F4FFE8', 0.22], [1, '#F4FFE8', 0]]); x.fillRect(wx - 200, yy - 200, 400, 400); }
      const nS = 280 + k * 70;
      for (let i = 0; i < nS; i++) {
        const wx = X0 + hs(i, 100 + k) * (X1 - X0), yy = lerp(top(wx) + 4, lipY(k, wx) - 2, hs(i, 120 + k));
        const r = (0.8 + k * 0.45) * (0.6 + hs(i, 130 + k));
        const fc = [C.rose2, '#FFFFFF', C.gold2, C.rose, '#FFE9F0', '#BFA8FF'][Math.floor(hs(i, 140 + k) * 6)];
        if (hs(i, 150 + k) < 0.55) { x.strokeStyle = E.rgba(E.shade(col, -0.25), 0.35); x.lineWidth = 0.6 + k * 0.25; x.beginPath(); x.moveTo(wx, yy); x.lineTo(wx + (hs(i, 160) - 0.5) * 3, yy - (2 + k * 1.6)); x.stroke(); }
        else { x.fillStyle = E.rgba(fc, 0.85); x.beginPath(); x.arc(wx, yy, r, 0, TAU); x.fill(); }
      }
      x.restore();
      const wall = new Path2D(); wall.moveTo(X0, lipY(k, X0));
      for (let wx = X0; wx <= X1; wx += 20) wall.lineTo(wx, lipY(k, wx));
      for (let wx = X1; wx >= X0; wx -= 20) wall.lineTo(wx, lipY(k, wx) + wh);
      wall.closePath();
      x.fillStyle = LG(x, 0, ly, 0, ly + wh, [[0, '#FFFFFF'], [0.45, C.marble], [1, C.marbleS]]); x.fill(wall);
      x.save(); x.clip(wall);
      const aw = 10 + k * 5, step = aw * 1.9;
      for (let wx = X0 + 6; wx < X1; wx += step) { const p = new Path2D(); archPath(p, wx, lipY(k, wx) + wh * 0.88, aw, wh * 0.62); x.fillStyle = 'rgba(214,196,168,0.45)'; x.fill(p); x.strokeStyle = E.rgba(C.gold, 0.55); x.lineWidth = 0.6 + k * 0.2; x.stroke(p); }
      x.restore();
      x.strokeStyle = C.gold; x.lineWidth = 1.2 + k * 0.5; x.beginPath();
      for (let wx = X0; wx <= X1; wx += 20) (wx === X0 ? x.moveTo(wx, lipY(k, wx)) : x.lineTo(wx, lipY(k, wx))); x.stroke();
      x.strokeStyle = 'rgba(255,248,226,0.95)'; x.lineWidth = 0.8 + k * 0.25; x.beginPath();
      for (let wx = X0; wx <= X1; wx += 20) (wx === X0 ? x.moveTo(wx, lipY(k, wx) - 1.2 - k * 0.3) : x.lineTo(wx, lipY(k, wx) - 1.2 - k * 0.3)); x.stroke();
      prevBottom = ((kk, hh) => (wx) => lipY(kk, wx) + hh)(k, wh);
    }
    for (const r of RIVERS) {
      const sp = riverSample(r); r.sp = sp;
      x.fillStyle = E.rgba('#2E8F6A', 0.35); x.fill(ribbon(sp, 1.3));
      x.fillStyle = E.rgba(C.marble, 0.95); x.save(); x.translate(0, -1); x.fill(ribbon(sp, 1.15)); x.restore();
      const body = ribbon(sp, 1);
      x.fillStyle = LG(x, 0, 520, 0, 1240, [[0, E.shade(r.col, 0.5)], [0.4, r.col], [1, E.shade(r.col, -0.06)]]); x.fill(body);
      x.save(); x.clip(body);
      x.strokeStyle = E.rgba(r.edge, 0.6); x.lineWidth = 3.5; x.stroke(body);
      x.fillStyle = E.rgba(r.hi, 0.4); x.fill(ribbon(sp, 0.38, -0.12));
      x.restore();
      for (let k = 0; k < TIERS.length; k++) {
        const wh = TIERS[k][2];
        for (let i = 1; i < sp.length; i++) {
          if (sp[i - 1][1] < lipY(k, sp[i - 1][0]) && sp[i][1] >= lipY(k, sp[i][0])) {
            const cx = sp[i][0], cw = sp[i][2] * 0.95, ly = lipY(k, cx);
            x.fillStyle = LG(x, 0, ly, 0, ly + wh, [[0, E.shade(r.col, 0.35)], [0.7, r.col], [1, '#FFFFFF']]);
            x.fillRect(cx - cw / 2, ly - 1, cw, wh + 2);
            x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 0.8;
            for (let s = 0; s < 6; s++) { const sx = cx - cw / 2 + cw * (s + 0.5) / 6; x.beginPath(); x.moveTo(sx, ly); x.lineTo(sx, ly + wh); x.stroke(); }
            x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.ellipse(cx, ly + wh, cw * 0.62, 2 + k, 0, 0, TAU); x.fill();
            r.falls = r.falls || []; r.falls.push([cx, ly, cw, wh]);
            break;
          }
        }
      }
      x.fillStyle = E.rad(x, sp[0][0], sp[0][1], 0, 30, [[0, '#FFFFFF', 0.95], [1, '#FFFFFF', 0]]); x.fillRect(sp[0][0] - 34, sp[0][1] - 34, 68, 68);
    }
    SP.mid = b.c;
  }
  const MID_TREES = [];
  function planTrees() {
    const rivX = (r, wy) => { const sp = r.sp; for (let i = 1; i < sp.length; i++) if (sp[i][1] >= wy) return [sp[i][0], sp[i][2]]; return [sp[sp.length - 1][0], 100]; };
    let id = 0;
    for (let k = 0; k < TIERS.length - 1; k++) {
      const n = 9 + k * 2;
      for (let i = 0; i < n; i++) {
        const wx = MID.x0 + 60 + (i + hs(i, 200 + k) * 0.7) * ((MID.w - 120) / n);
        const wy = lipY(k, wx) - 3 - hs(i, 210 + k) * 6;
        const s = 0.46 + k * 0.22;
        let ok = true; for (const r of RIVERS) { const [rx, rw] = rivX(r, wy), [rx2] = rivX(r, wy - 120 * s); if (Math.abs(wx - rx) < rw * 0.7 + 34 * s + 8 || Math.abs(wx - rx2) < 30 * s + 10) ok = false; }
        if (!ok) continue;
        const kind = hs(i, 220 + k) < 0.42 ? 'c' : hs(i, 230 + k) < 0.5 ? 'f' : hs(i, 240 + k) < 0.5 ? 'b' : 'p';
        MID_TREES.push({ wx, wy, kind, s, tier: k, id: id++ });
      }
    }
  }
  const TREE_SPR = {};
  function treeSprite(kind, tier) {
    const key = kind + tier; if (TREE_SPR[key]) return TREE_SPR[key];
    const haze = [0.34, 0.24, 0.14, 0.06, 0][tier];
    const w = 140, h = 220, b = E.canvas(w, h), x = b.x;
    if (kind === 'c') cypress(x, w / 2, h - 4, 200, 40, C.cyp, '#E8FFF0');
    else roundTree(x, w / 2, h - 4, 46, kind === 'b' ? '#56C99A' : C.t3, kind === 'b' ? 1 : kind === 'p' ? 2 : 0, tier * 7 + kind.charCodeAt(0));
    if (haze > 0) hazeOver(x, w, h, '#F4FBF4', haze);
    TREE_SPR[key] = { c: b.c, ax: w / 2, ay: h - 4 };
    return TREE_SPR[key];
  }

  // L3 hero marble terrace (1.25×); the reflecting pool begins at its foot (y 1092)
  const TER = { x0: -220, y0: 868, w: 2000, h: 232, k: 1.25 };
  function buildTerrace() {
    const k = TER.k, b = E.canvas(TER.w * k, TER.h * k), x = b.x; x.scale(k, k); x.translate(-TER.x0, -TER.y0);
    const X0 = TER.x0, X1 = TER.x0 + TER.w, yB = 905, yF = 1062, yBot = 1092;
    x.fillStyle = LG(x, 0, 868, 0, 910, [[0, '#3FAF7E'], [1, '#227A57']]);
    x.beginPath(); x.moveTo(X0, 910);
    for (let wx = X0; wx <= X1; wx += 14) x.lineTo(wx, 884 - 7 * Math.abs(Math.sin(wx * 0.045)) - 3 * Math.sin(wx * 0.13));
    x.lineTo(X1, 910); x.closePath(); x.fill();
    for (let i = 0; i < 260; i++) {
      const wx = X0 + hs(i, 301) * (X1 - X0), wy = 878 + hs(i, 302) * 22, r = 1.6 + hs(i, 303) * 2.2;
      x.fillStyle = [C.rose, C.rose2, '#FFFFFF', C.gold2][Math.floor(hs(i, 304) * 4)];
      x.beginPath(); x.arc(wx, wy, r, 0, TAU); x.fill();
    }
    const floor = new Path2D(); floor.rect(X0, yB, X1 - X0, yF - yB);
    x.fillStyle = LG(x, 0, yB, 0, yF, [[0, '#E6D8C2'], [0.2, '#F5EBDA'], [0.65, '#FBF2E4'], [1, '#EFDFC8']]); x.fill(floor);
    x.save(); x.clip(floor);
    x.fillStyle = LG(x, 0, yB, 0, yB + 26, [[0, '#4E6E58', 0.3], [1, '#4E6E58', 0]]); x.fillRect(X0, yB, X1 - X0, 26);
    x.strokeStyle = 'rgba(176,150,112,0.42)'; x.lineWidth = 1.1;
    for (let i = -26; i <= 34; i++) { const bx = 740 + i * 70; x.beginPath(); x.moveTo(740 + (bx - 740) * 0.4, yB); x.lineTo(bx, yF); x.stroke(); }
    for (let j = 0; j < 9; j++) { const u = j / 8, yy = yB + (yF - yB) * Math.pow(u, 1.6); x.beginPath(); x.moveTo(X0, yy); x.lineTo(X1, yy); x.stroke(); }
    // faint marble veins
    x.strokeStyle = 'rgba(200,184,160,0.22)'; x.lineWidth = 1.2;
    for (let i = 0; i < 40; i++) { const wx = X0 + hs(i, 330) * (X1 - X0), wy = yB + hs(i, 331) * (yF - yB); x.beginPath(); x.moveTo(wx, wy); x.bezierCurveTo(wx + 30, wy + 6, wx + 50, wy - 4, wx + 90 + hs(i, 332) * 60, wy + 8); x.stroke(); }
    x.strokeStyle = E.rgba(C.gold, 0.7); x.lineWidth = 2; x.beginPath(); x.moveTo(X0, yF - 16); x.lineTo(X1, yF - 16); x.stroke();
    x.strokeStyle = E.rgba('#3FA88A', 0.45); x.lineWidth = 3; x.beginPath(); x.moveTo(X0, yF - 10); x.lineTo(X1, yF - 10); x.stroke();
    for (let wx = X0 + 30; wx < X1; wx += 60) { x.save(); x.translate(wx, yF - 13); x.scale(1, 0.35); x.fillStyle = E.rgba(C.gold, 0.8); x.fill(S.starPath(7, 8, 0.55, PI / 8)); x.restore(); }
    x.fillStyle = LG(x, 0, yB, 0, yF, [[0, '#FFFFFF', 0.0], [0.5, '#FFFFFF', 0.25], [1, '#FFFFFF', 0]]); x.fillRect(X0, yB, X1 - X0, yF - yB);
    x.restore();
    x.fillStyle = LG(x, 0, yB - 4, 0, yB + 4, [[0, C.goldL], [1, C.goldD]]); x.fillRect(X0, yB - 3, X1 - X0, 5);
    x.fillStyle = LG(x, 0, yF, 0, yF + 8, [[0, '#FFFFFF'], [1, C.goldL]]); x.fillRect(X0, yF - 2, X1 - X0, 6);
    const face = new Path2D(); face.rect(X0, yF + 4, X1 - X0, yBot - yF - 4);
    x.fillStyle = LG(x, 0, yF, 0, yBot, [[0, '#D9CAAE'], [1, '#9C8C72']]); x.fill(face);
    x.fillStyle = C.gold; x.fillRect(X0, yF + 4, X1 - X0, 3); x.fillRect(X0, yBot - 4, X1 - X0, 2);
    x.save(); x.clip(face);
    for (let wx = X0 + 20; wx < X1; wx += 44) {
      const p = new Path2D(); archPath(p, wx, yBot - 6, 18, 18); x.fillStyle = 'rgba(70,58,44,0.35)'; x.fill(p); x.strokeStyle = E.rgba(C.gold, 0.8); x.lineWidth = 1.1; x.stroke(p);
    }
    x.restore();
    x.fillStyle = 'rgba(12,40,36,0.55)'; x.fillRect(X0, yBot - 2, X1 - X0, 4);
    SP.ter = b.c;
  }
  /* reflecting pool: far edge at the terrace foot, widening toward camera */
  const POOL = { y0: 1092, cx: 740, hw0: 250, k: 0.44 };
  const poolHW = (wy) => POOL.hw0 + (wy - POOL.y0) * POOL.k;
  const BED = { x0: -520, y0: 1088, w: 2520, h: 1240, k: 0.5 };
  function poolPath(p, y1 = 2400) { p.moveTo(POOL.cx - poolHW(POOL.y0), POOL.y0); p.lineTo(POOL.cx + poolHW(POOL.y0), POOL.y0); p.lineTo(POOL.cx + poolHW(y1), y1); p.lineTo(POOL.cx - poolHW(y1), y1); p.closePath(); }
  function buildBeds() {
    const k = BED.k, b = E.canvas(BED.w * k, BED.h * k), x = b.x; x.scale(k, k); x.translate(-BED.x0, -BED.y0);
    const X0 = BED.x0, X1 = X0 + BED.w, Y0 = POOL.y0, Y1 = BED.y0 + BED.h;
    const outer = new Path2D(); outer.rect(X0, BED.y0, BED.w, BED.h); poolPath(outer, Y1 + 10);
    x.save(); x.clip(outer, 'evenodd');
    x.fillStyle = LG(x, 0, Y0, 0, Y1, [[0, '#2E9467'], [0.12, '#22805A'], [0.4, '#1A6248'], [1, '#0F3B2F']]); x.fillRect(X0, BED.y0, BED.w, BED.h);
    // lawn texture
    for (let i = 0; i < 1300; i++) {
      const wy = Y0 + Math.pow(hs(i, 1401), 0.85) * (Y1 - Y0), d = (wy - Y0) / (Y1 - Y0), wx = X0 + hs(i, 1402) * BED.w;
      x.strokeStyle = E.rgba(hs(i, 1403) < 0.5 ? '#5BC190' : '#0B3A2C', 0.18 + 0.1 * d); x.lineWidth = 1.6 + d * 4;
      x.beginPath(); x.moveTo(wx, wy); x.quadraticCurveTo(wx + 3, wy - 6 - d * 18, wx + (hs(i, 1404) - 0.5) * 12, wy - 12 - d * 34); x.stroke();
    }
    // flowering beds hugging the pool coping (perspective strips) + low hedge behind
    for (const s of [-1, 1]) {
      const edge = (wy, off) => POOL.cx + s * (poolHW(wy) + off(wy));
      const o1 = (wy) => 12 + (wy - Y0) * 0.035, o2 = (wy) => 30 + (wy - Y0) * 0.17, o3 = (wy) => 46 + (wy - Y0) * 0.24;
      const strip = (oa, ob) => { const p = new Path2D(); p.moveTo(edge(Y0, oa), Y0); for (let wy = Y0; wy <= Y1; wy += 20) p.lineTo(edge(wy, oa), wy); for (let wy = Y1; wy >= Y0; wy -= 20) p.lineTo(edge(wy, ob), wy); p.closePath(); return p; };
      x.fillStyle = LG(x, 0, Y0, 0, Y1, [[0, '#2A6E4A'], [1, '#143A2A']]); x.fill(strip(o1, o2));
      const n = 520;
      for (let i = 0; i < n; i++) {
        const v = Math.pow(hs(i, 1410 + s), 1.25), wy = Y0 + 6 + v * (Y1 - Y0 - 10), u = hs(i, 1420 + s), wx = lerp(edge(wy, o1), edge(wy, o2), u);
        const r = 1.6 + (wy - Y0) * 0.014 * (0.6 + 0.8 * hs(i, 1430 + s));
        x.fillStyle = [C.rose, C.rose2, '#FFFFFF', C.gold2, '#C9A8FF', '#FF8A5C'][Math.floor(hs(i, 1440 + s) * 6)];
        x.globalAlpha = 0.9; x.beginPath(); x.arc(wx, wy - r * 0.6, r, 0, TAU); x.fill();
        if (i % 3 === 0) { x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.arc(wx - r * 0.3, wy - r, r * 0.35, 0, TAU); x.fill(); }
      }
      x.globalAlpha = 1;
      const hedge = strip(o2, o3);
      x.fillStyle = LG(x, 0, Y0, 0, Y1, [[0, '#1F7A55'], [1, '#0E3226']]); x.fill(hedge);
      x.save(); x.clip(hedge); x.strokeStyle = 'rgba(160,240,200,0.28)'; x.lineWidth = 3; x.beginPath(); for (let wy = Y0; wy <= Y1; wy += 20) (wy === Y0 ? x.moveTo(edge(wy, o2) + s * 2, wy) : x.lineTo(edge(wy, o2) + s * 2, wy)); x.stroke(); x.restore();
      // marble coping along the water
      const cop = strip((wy) => 0, o1);
      x.fillStyle = LG(x, 0, Y0, 0, Y1, [[0, '#DCD8C8'], [0.3, '#9FAE9E'], [1, '#4E6658']]); x.fill(cop);
      x.strokeStyle = 'rgba(255,248,226,0.55)'; x.lineWidth = 1.5; x.beginPath(); for (let wy = Y0; wy <= Y1; wy += 20) (wy === Y0 ? x.moveTo(edge(wy, () => 0), wy) : x.lineTo(edge(wy, () => 0), wy)); x.stroke();
    }
    // stone ledge under the terrace foot
    x.fillStyle = 'rgba(8,30,24,0.45)'; x.fillRect(X0, Y0 - 4, BED.w, 14);
    x.restore();
    SP.beds = b.c;
  }
  // per-frame pool furniture (world coords): cypress rows, lanterns, spouts, lilies
  const POOL_CYP = [1112, 1190, 1300, 1450, 1650, 1910];
  const POOL_LANT = [1150, 1245, 1375, 1550, 1780];
  const LILIES = [];
  function planPool() {
    for (let i = 0; i < 22; i++) {
      const wy = POOL.y0 + 60 + Math.pow(hs(i, 1501), 1.1) * 900, hw = poolHW(wy), u = (hs(i, 1502) - 0.5) * 2;
      if (Math.abs(u) < 0.35 && wy < 1500) continue;
      LILIES.push({ wy, u: u * 0.85, r: 9 + (wy - POOL.y0) * 0.045, rot: hs(i, 1503) * TAU, fl: hs(i, 1504) < 0.4 ? (hs(i, 1505) < 0.5 ? '#FFD3E0' : '#FFFFFF') : null, id: i });
    }
  }
  function cypSprite() {
    if (SP.cyp) return SP.cyp;
    const b = E.canvas(80, 330), x = b.x; cypress(x, 40, 326, 320, 64, '#17714E', '#B6F2D2'); SP.cyp = b.c; return b.c;
  }
  function drawPoolFurniture(ctx, t, st) {
    const cs = cypSprite();
    for (const s of [-1, 1]) {
      // cypress rows receding along the hedges
      for (let i = POOL_CYP.length - 1; i >= 0; i--) {
        const wy = POOL_CYP[i], d = wy - POOL.y0, wx = POOL.cx + s * (poolHW(wy) + 46 + d * 0.24 + 10 + d * 0.06), h = 110 + d * 0.62, w = h * 0.24;
        const sway = 0.012 * Math.sin(t * 1.1 + wy * 0.01 + s);
        ctx.save(); ctx.translate(wx, wy); ctx.rotate(sway); ctx.drawImage(cs, -w / 2, -h, w, h); ctx.restore();
      }
      // lanterns on the coping (always lit) + their streak in the water
      for (const wy of POOL_LANT) {
        const d = wy - POOL.y0, sc = 0.5 + d * 0.0028, wx = POOL.cx + s * (poolHW(wy) + 6 + d * 0.018);
        const fl = 0.85 + 0.15 * Math.sin(t * 6 + wy) * Math.sin(t * 3.7 + s);
        ctx.save(); ctx.translate(wx, wy); ctx.scale(sc, sc);
        ctx.fillStyle = LG(ctx, -5, 0, 5, 0, [[0, '#F2E8D6'], [1, '#A8987C']]); ctx.fillRect(-4, -46, 8, 46);
        ctx.fillStyle = LG(ctx, -12, 0, 12, 0, [[0, '#E9C27A'], [1, '#9C6A24']]); ctx.fillRect(-12, -50, 24, 5);
        ctx.fillStyle = E.rad(ctx, 0, -64, 0, 14, [[0, '#FFFBE6'], [0.5, '#FFD27A'], [1, '#E9A23A']]); ctx.beginPath(); ctx.moveTo(-10, -50); ctx.lineTo(10, -50); ctx.lineTo(8, -74); ctx.lineTo(-8, -74); ctx.closePath(); ctx.fill();
        ctx.fillStyle = LG(ctx, -12, 0, 12, 0, [[0, '#E9C27A'], [1, '#9C6A24']]); ctx.beginPath(); ctx.moveTo(-12, -74); ctx.lineTo(12, -74); ctx.lineTo(0, -86); ctx.closePath(); ctx.fill();
        ctx.restore();
        S.light(ctx, wx, wy - 64 * sc, 60 * sc, '#FFC870', 0.55 * fl, 'screen');
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        const rx = wx - s * 10 * sc, ry0 = wy + 6, ry1 = wy + 130 * sc;
        ctx.fillStyle = LG(ctx, 0, ry0, 0, ry1, [[0, '#FFC870', 0.4 * fl], [1, '#FFC870', 0]]); ctx.fillRect(rx - 5 * sc, ry0, 10 * sc, ry1 - ry0);
        ctx.restore();
      }
    }
  }
  function drawPoolSurface(ctx, t, st) {
    // little fountains: spouts from the terrace foot + low jets from the coping
    ctx.save(); ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      const sx = POOL.cx + i * 92, sy = POOL.y0 - 10, ex = sx + i * 6, ey = POOL.y0 + 26;
      ctx.strokeStyle = 'rgba(220,250,255,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + i * 3, sy + 10, ex, ey); ctx.stroke();
      ctx.setLineDash([3, 6]); ctx.lineDashOffset = -t * 50 - i * 7; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.setLineDash([]);
      const k = (t * 1.6 + i * 0.37) % 1; ctx.strokeStyle = E.rgba('#E6FBFF', 0.5 * (1 - k)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(ex, ey, 4 + k * 16, (4 + k * 16) * 0.3, 0, 0, TAU); ctx.stroke();
    }
    for (const [wy, s] of [[1520, -1], [1520, 1], [1830, -1], [1830, 1]]) {
      const hw = poolHW(wy), d = wy - POOL.y0, x0 = POOL.cx + s * (hw - 4), x1 = POOL.cx + s * hw * 0.42, hgt = 30 + d * 0.1;
      const arc = (q) => [lerp(x0, x1, q), wy + 6 - Math.sin(PI * q) * hgt + q * 18];
      ctx.beginPath(); for (let q = 0; q <= 1.0001; q += 0.1) { const a = arc(q); q ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1]); }
      ctx.strokeStyle = 'rgba(210,248,255,0.4)'; ctx.lineWidth = 2 + d * 0.004; ctx.stroke();
      ctx.setLineDash([4, 9]); ctx.lineDashOffset = -t * 90; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2 + d * 0.002; ctx.stroke(); ctx.setLineDash([]);
      const e = arc(1), k = (t * 1.3 + wy * 0.01) % 1; ctx.strokeStyle = E.rgba('#E6FBFF', 0.45 * (1 - k)); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(e[0], e[1], 6 + k * 26, (6 + k * 26) * 0.28, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    // lily pads + lotus
    for (const L of LILIES) {
      const wx = POOL.cx + L.u * poolHW(L.wy), bob = Math.sin(t * 0.9 + L.id) * 1.5;
      ctx.save(); ctx.translate(wx, L.wy + bob); ctx.scale(1, 0.36); ctx.rotate(L.rot + 0.1 * Math.sin(t * 0.4 + L.id));
      ctx.fillStyle = E.rad(ctx, -L.r * 0.3, -L.r * 0.3, 0, L.r * 1.2, [[0, '#4FB07A'], [1, '#1E6B47']]);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, L.r, 0.25, TAU - 0.25); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(180,240,200,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      if (L.fl) { ctx.save(); ctx.translate(wx + L.r * 0.15, L.wy + bob - L.r * 0.2); for (let j = 0; j < 6; j++) { ctx.save(); ctx.rotate(-PI / 2 + (j - 2.5) * 0.42); ctx.fillStyle = E.lin(ctx, 0, 0, 0, -L.r * 0.7, [[0, L.fl], [1, '#FFFFFF']]); ctx.beginPath(); ctx.ellipse(0, -L.r * 0.32, L.r * 0.14, L.r * 0.36, 0, 0, TAU); ctx.fill(); ctx.restore(); } ctx.fillStyle = '#FFD27A'; ctx.beginPath(); ctx.arc(0, -L.r * 0.1, L.r * 0.1, 0, TAU); ctx.fill(); ctx.restore(); }
    }
    // light-rain ripples on the water
    if (st.rainK > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.lineWidth = 1.3;
      for (let i = 0; i < 46; i++) {
        const per = 0.7 + 0.5 * hs(i, 1601), ph = (t / per + hs(i, 1602)) % 1, cyc = Math.floor(t / per + hs(i, 1602));
        if (hs(i * 31 + cyc, 1603) > st.rainK) continue;
        const wy = POOL.y0 + 20 + Math.pow(hs(i * 7 + cyc, 1604), 1.2) * 800, wx = POOL.cx + (hs(i * 13 + cyc, 1605) - 0.5) * 1.8 * poolHW(wy), r = (4 + ph * 24) * (0.6 + (wy - POOL.y0) * 0.0016);
        ctx.strokeStyle = E.rgba('#E9FFF6', 0.42 * (1 - ph)); ctx.beginPath(); ctx.ellipse(wx, wy, r, r * 0.3, 0, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
    // drifting mist over the water (calm, low alpha)
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 6; i++) {
      const wy = POOL.y0 + 20 + i * 70 + 10 * Math.sin(t * 0.3 + i), wx = POOL.cx + ((hs(i, 1701) * 900 + t * (14 + 6 * hs(i, 1702))) % 900) - 450, rw = 200 + i * 40;
      ctx.fillStyle = E.rad(ctx, wx, wy, 0, rw, [[0, '#F2FFFA', 0.13], [1, '#F2FFFA', 0]]);
      ctx.save(); ctx.translate(wx, wy); ctx.scale(1, 0.16); ctx.beginPath(); ctx.arc(0, 0, rw, 0, TAU); ctx.restore(); ctx.fill();
    }
    ctx.restore();
  }
  /** mirror the vista above the pool's far edge into the water (half-res, rippled, deep teal) */
  let REF = null;
  function drawPool(target, src, t, cam, st) {
    const ye = toScreen(cam, 1, 0, POOL.y0)[1];
    if (ye >= H - 4) return;
    const Hp = Math.ceil(H - ye), Hs = Math.max(8, Math.min(ye - 4, Hp / 0.58));
    if (!REF) REF = E.canvas(W / 2, H / 2);
    const x = REF.x;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.filter = 'none'; x.globalCompositeOperation = 'copy';
    x.setTransform(1, 0, 0, -1, 0, Hp / 2);
    x.drawImage(src, 0, ye - Hs, W, Hs, 0, 0, W / 2, Hp / 2);
    const m = target.getTransform(), ks = m.a;        // 1 or 0.5 (lo layer)
    target.save();
    lay(target, cam, 1, () => { const p = new Path2D(); poolPath(p); target.clip(p); });
    target.setTransform(ks, 0, 0, ks, 0, 0);
    for (let y = 0; y < Hp; y += 4) {
      const d = y / 500, amp = 1.2 + 7 * d;
      const dx = amp * Math.sin((ye + y) * 0.05 - t * 1.7) + amp * 0.45 * Math.sin((ye + y) * 0.13 + t * 2.6);
      target.drawImage(REF.c, 0, y / 2, W / 2, 2.4, dx - 10, ye + y, W + 20, 4.8);
    }
    // deep teal water body: tint + depth darkening + sky sheen at the far edge
    target.globalCompositeOperation = 'multiply';
    target.fillStyle = E.lin(target, 0, ye, 0, H, [[0, '#5FA898'], [0.4, '#3A877B'], [0.75, '#4C978A'], [1, '#6AAE9F']]); target.fillRect(0, ye, W, H - ye);
    target.globalCompositeOperation = 'source-over';
    target.fillStyle = E.lin(target, 0, ye, 0, H, [[0, '#0C3A35', 0.08], [0.35, '#0C3A35', 0.26], [0.7, '#0C3A35', 0.16], [1, '#0A302C', 0.1]]); target.fillRect(0, ye, W, H - ye);
    target.globalCompositeOperation = 'screen';
    target.fillStyle = E.lin(target, 0, ye, 0, ye + 90, [[0, '#CFF3E6', 0.3], [1, '#CFF3E6', 0]]); target.fillRect(0, ye, W, 90);
    if (st.g > 0.01) {   // calm the reflections behind a gloss
      target.globalCompositeOperation = 'source-over';
      target.fillStyle = E.lin(target, 0, 1190, 0, 1620, [[0, '#0A2E2A', 0], [0.2, '#0A2E2A', 0.3 * st.g], [0.8, '#0A2E2A', 0.3 * st.g], [1, '#0A2E2A', 0]]); target.fillRect(0, 1190, W, 430);
    }
    target.restore();
    lay(target, cam, 1, () => { drawPoolSurface(target, t, st); target.drawImage(SP.beds, BED.x0, BED.y0, BED.w, BED.h); drawPoolFurniture(target, t, st); });
    A.glints(target, t, { pts: LILIES.slice(0, 9).map((L) => toScreen(cam, 1, POOL.cx - L.u * 0.6 * poolHW(L.wy + 40), L.wy + 40)), seed: 1801, r: 7, period: 2.6, duty: 0.22, alpha: 0.55 });
  }
  // L5 foreground: corner rose bushes + branches, screen-periodic strip (period 1080: corner hands over to corner)
  const FGS = { w: 2160, h: 560, k: 0.5 };
  function rosette(x, px, py, fr, seed) {
    x.fillStyle = E.rad(x, px - fr * 0.3, py - fr * 0.35, 0, fr * 1.15, [[0, '#FFE3EA'], [0.5, C.rose2], [0.85, C.rose], [1, '#B8164E']]); x.beginPath(); x.arc(px, py, fr, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(176,24,74,0.45)'; x.lineWidth = Math.max(1.5, fr * 0.09); x.lineCap = 'round';
    for (let j = 0; j < 3; j++) { const rr = fr * (0.78 - j * 0.24), a0 = hs(j, seed) * TAU; x.beginPath(); x.arc(px + fr * 0.05, py + fr * 0.05, rr, a0, a0 + 3.6); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,0.55)'; x.beginPath(); x.ellipse(px - fr * 0.35, py - fr * 0.4, fr * 0.22, fr * 0.12, -0.6, 0, TAU); x.fill();
  }
  function buildFg() {
    const k = FGS.k, tmp = E.canvas(FGS.w * k, FGS.h * k), x = tmp.x; x.scale(k, k);
    const cluster = (cx, seed) => {
      x.save(); x.translate(cx, FGS.h);
      for (const fs of [1, -1]) {
        x.save(); x.scale(fs, 1);
        x.strokeStyle = '#3B5A2C'; x.lineWidth = 11; x.lineCap = 'round';
        x.beginPath(); x.moveTo(60, -40); x.bezierCurveTo(120, -230, 220, -330, 340, -360); x.stroke();
        x.lineWidth = 6; x.beginPath(); x.moveTo(200, -290); x.quadraticCurveTo(260, -280, 300, -230); x.stroke();
        for (let i = 0; i < 14; i++) { const u = 0.12 + i / 16, px = lerp(60, 340, u) + 16 * Math.sin(u * 7), py = -40 - 320 * Math.sin(u * PI * 0.55); x.save(); x.translate(px, py); x.rotate((i % 2 ? 1 : -1) * (0.7 + hs(i, seed + (fs > 0 ? 0 : 50)) * 0.6) + 0.4); leaf(x, 64 + hs(i, seed + 1) * 26, 21, E.mix('#2E8C5C', '#174F38', hs(i, seed + 2))); x.restore(); }
        rosette(x, 342, -364, 20, seed + 3); rosette(x, 300, -228, 15, seed + 4);
        x.restore();
      }
      for (let i = 0; i < 12; i++) { const px = -150 + hs(i, seed + 3) * 300, py = -hs(i, seed + 4) * 170, rr = 70 + hs(i, seed + 5) * 60; x.fillStyle = E.rad(x, px - rr * 0.3, py - rr * 0.4, 0, rr * 1.2, [[0, '#2C8A5E'], [0.7, '#185840'], [1, '#0D3528']]); x.beginPath(); x.arc(px, py, rr, 0, TAU); x.fill(); }
      for (let i = 0; i < 18; i++) { x.save(); x.translate(-150 + hs(i, seed + 6) * 300, -50 - hs(i, seed + 7) * 190); x.rotate((hs(i, seed + 8) - 0.5) * 2.6); leaf(x, 80 + hs(i, seed + 9) * 36, 25, E.mix('#36A06A', '#1A5E42', hs(i, seed + 10))); x.restore(); }
      for (let i = 0; i < 6; i++) rosette(x, -120 + hs(i, seed + 11) * 240, -70 - hs(i, seed + 12) * 170, 20 + hs(i, seed + 13) * 12, seed + 20 + i);
      x.restore();
    };
    cluster(0, 2101); cluster(1080, 2201); cluster(2160, 2101);
    const b = E.canvas(FGS.w * k, FGS.h * k);
    b.x.filter = 'blur(3.5px)'; b.x.drawImage(tmp.c, 0, 0); b.x.filter = 'none';
    SP.fg = b.c;
  }
  function buildDapple() {
    const w = 1400, h = 200, b = E.canvas(w, h), x = b.x;
    for (let i = 0; i < 70; i++) { const cx = hs(i, 1201) * w, cy = hs(i, 1202) * h, r = 20 + hs(i, 1203) * 46; x.fillStyle = E.rad(x, cx, cy, 0, r, [[0, '#3E6E52', 0.5], [0.6, '#3E6E52', 0.25], [1, '#3E6E52', 0]]); x.save(); x.translate(cx, cy); x.scale(1, 0.32); x.beginPath(); x.arc(0, 0, r, 0, TAU); x.restore(); x.fill(); }
    SP.dapple = b.c;
  }
  function buildCloud() {
    const b = E.canvas(520, 200), x = b.x;
    for (let i = 0; i < 9; i++) { const cx = 70 + i * 47 + hs(i, 601) * 20, cy = 120 - Math.sin((i / 8) * PI) * 40 + hs(i, 602) * 14, r = 44 + Math.sin((i / 8) * PI) * 36; x.fillStyle = E.rad(x, cx, cy - r * 0.2, 0, r, [[0, '#FFFFFF', 0.95], [0.6, '#FFFDF6', 0.55], [1, '#FFFDF6', 0]]); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = E.lin(x, 0, 60, 0, 200, [[0, '#FFFFFF', 0], [1, '#F7D9A8', 0.55]]); x.fillRect(0, 0, 520, 200);
    SP.cloud = b.c;
  }
  /* bounties: pomegranate tree sprite (world size 640×700, anchor = trunk base) */
  function buildPomTree() {
    const w = 640, h = 720, b = E.canvas(w, h), x = b.x, bx = w / 2, by = h - 6;
    // trunk + branches
    x.strokeStyle = LG(x, bx - 30, 0, bx + 30, 0, [[0, '#B48A62'], [0.5, '#8A6242'], [1, '#5A3E28']]); x.lineCap = 'round';
    for (const [w0, pts] of [[26, [[bx, by], [bx - 10, by - 160], [bx + 8, by - 280], [bx - 6, by - 380]]], [14, [[bx - 6, by - 250], [bx - 90, by - 360], [bx - 160, by - 420]]], [12, [[bx + 6, by - 290], [bx + 100, by - 380], [bx + 170, by - 430]]], [10, [[bx - 4, by - 360], [bx - 40, by - 470], [bx - 30, by - 540]]]]) {
      x.lineWidth = w0; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) x.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); x.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); x.stroke();
    }
    // canopy: many leaves in clusters
    const cy = by - 430;
    for (let i = 0; i < 26; i++) {
      const a = hs(i, 901) * TAU, d = Math.sqrt(hs(i, 902)) * 210, px = bx + Math.cos(a) * d * 1.15, py = cy + Math.sin(a) * d * 0.62, rr = 58 + hs(i, 903) * 40;
      const col = E.mix('#2FBF7F', '#1E8A5C', hs(i, 904));
      x.fillStyle = E.rad(x, px - rr * 0.3, py - rr * 0.5, 0, rr * 1.2, [[0, E.shade(col, 0.28)], [0.65, col], [1, E.shade(col, -0.3)]]);
      x.beginPath(); x.arc(px, py, rr, 0, TAU); x.fill();
    }
    for (let i = 0; i < 70; i++) {
      const a = hs(i, 911) * TAU, d = Math.sqrt(hs(i, 912)) * 250, px = bx + Math.cos(a) * d * 1.12, py = cy + Math.sin(a) * d * 0.62;
      x.save(); x.translate(px, py); x.rotate(a + PI / 2 + (hs(i, 913) - 0.5)); leaf(x, 34 + hs(i, 914) * 16, 10, E.mix('#43D08E', '#1F8F64', hs(i, 915))); x.restore();
    }
    x.save(); x.globalCompositeOperation = 'source-atop';
    x.fillStyle = LG(x, 0, cy - 260, 0, cy + 60, [[0, '#FFFBE6', 0.5], [1, '#FFFBE6', 0]]); x.fillRect(0, 0, w, h);
    x.fillStyle = LG(x, 0, cy + 20, 0, cy + 200, [[0, '#0D4A34', 0], [1, '#0D4A34', 0.3]]); x.fillRect(0, cy, w, 260);
    x.restore();
    // fruits (pomegranates heavy on the branches)
    const fruits = [[-150, 40, 26], [-60, 92, 30], [60, 74, 28], [150, 24, 25], [-205, -50, 22], [205, -60, 22], [0, -30, 24], [-110, -120, 20], [110, -130, 20], [20, 140, 26], [-30, 30, 22]];
    for (const [fx, fy, r] of fruits) { x.save(); x.translate(bx + fx, cy + fy); A.pomegranate(x, { r, t: 0, rot: (hs(fx + 300, 920) - 0.5) * 0.5 }); x.restore(); }
    SP.pomTree = { c: b.c, ax: bx, ay: by, fruits: fruits.map(([fx, fy, r]) => [fx, fy - 430 - 6 + 0, r]) };
  }
  function buildVine() {
    const w = 560, h = 420, b = E.canvas(w, h), x = b.x;
    // vine enters from top-right, curls left
    x.strokeStyle = LG(x, 0, 0, w, 0, [[0, '#8A6A3A'], [1, '#6A4A2A']]); x.lineCap = 'round';
    x.lineWidth = 12; x.beginPath(); x.moveTo(w + 10, 20); x.bezierCurveTo(w - 140, 30, w - 200, 120, w - 330, 90); x.bezierCurveTo(w - 420, 70, w - 480, 120, w - 540, 100); x.stroke();
    x.lineWidth = 5; x.beginPath(); x.moveTo(w - 330, 90); x.quadraticCurveTo(w - 360, 150, w - 410, 160); x.stroke();
    for (let i = 0; i < 26; i++) {
      const u = i / 25, px = lerp(w - 20, 30, u) + (hs(i, 931) - 0.5) * 40, py = 40 + Math.sin(u * PI * 1.3) * 60 + (hs(i, 932) - 0.5) * 50;
      x.save(); x.translate(px, py); x.rotate(PI + (hs(i, 933) - 0.5) * 2.2);
      const col = E.mix('#4FD18F', '#23905E', hs(i, 934)), L = 48 + hs(i, 935) * 26;
      x.fillStyle = LG(x, -L * 0.5, 0, L * 0.5, -L, [[0, E.shade(col, 0.25)], [0.6, col], [1, E.shade(col, -0.3)]]);
      x.beginPath(); for (let q = 0; q <= 10; q++) { const a = -PI / 2 + (q / 10 - 0.5) * 2.6, rr = L * (0.55 + 0.25 * (q % 2)); const qx = Math.cos(a) * rr, qy = Math.sin(a) * rr - L * 0.1; q ? x.lineTo(qx, qy) : x.moveTo(qx, qy); } x.lineTo(0, 0); x.closePath(); x.fill();
      x.strokeStyle = E.rgba('#E8FFF0', 0.5); x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -L * 0.6); x.stroke();
      x.restore();
    }
    x.strokeStyle = '#7A9A3A'; x.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const px = 60 + i * 70, py = 90 + (i % 2) * 30; x.beginPath(); x.moveTo(px, py); for (let q = 0; q < 14; q++) { const a = q * 0.9; x.lineTo(px + Math.cos(a) * (8 - q * 0.4), py + q * 2 + Math.sin(a) * (8 - q * 0.4)); } x.stroke(); }
    SP.vine = { c: b.c, w, h };
  }
  /* low table with tray of fruit (world size ~120×70, anchor = bottom centre) */
  function buildTables() {
    const mk = (withFruit) => {
      const w = 200, h = 150, b = E.canvas(w, h), x = b.x, cx = w / 2, by = h - 4;
      x.fillStyle = 'rgba(40,30,20,0.18)'; x.beginPath(); x.ellipse(cx, by - 2, 60, 9, 0, 0, TAU); x.fill();
      x.fillStyle = LG(x, cx - 50, 0, cx + 50, 0, [[0, '#B88A50'], [0.4, '#E8C27A'], [1, '#8A5E2A']]);
      for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * 40, by - 34); x.lineTo(cx + s * 48, by); x.lineTo(cx + s * 40, by); x.lineTo(cx + s * 34, by - 34); x.closePath(); x.fill(); }
      x.fillRect(cx - 6, by - 34, 12, 34);
      x.fillStyle = LG(x, cx - 64, 0, cx + 64, 0, [[0, '#C9973E'], [0.35, '#FFE7A0'], [1, '#9C6A24']]); x.beginPath(); x.ellipse(cx, by - 36, 64, 15, 0, 0, TAU); x.fill();
      x.fillStyle = LG(x, cx - 58, 0, cx + 58, 0, [[0, '#E9C27A'], [0.4, '#FFF2C8'], [1, '#C8963E']]); x.beginPath(); x.ellipse(cx, by - 39, 57, 12, 0, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(160,110,40,0.6)'; x.lineWidth = 1; x.beginPath(); x.ellipse(cx, by - 39, 42, 8.5, 0, 0, TAU); x.stroke();
      if (withFruit) {
        x.save(); x.translate(cx - 22, by - 54); A.grapes(x, { size: 40, gold: false }); x.restore();
        for (const [fx, fy, r] of [[8, -50, 14], [26, -46, 13], [-2, -60, 11]]) { x.save(); x.translate(cx + fx, by + fy); A.pomegranate(x, { r }); x.restore(); }
        x.save(); x.translate(cx + 38, by - 56); A.grapes(x, { size: 30, gold: true }); x.restore();
      }
      return { c: b.c, ax: cx, ay: by, w, h };
    };
    SP.table = mk(true); SP.plinth = (() => {
      const w = 220, h = 90, b = E.canvas(w, h), x = b.x, cx = w / 2, by = h - 4;
      x.fillStyle = 'rgba(40,30,20,0.2)'; x.beginPath(); x.ellipse(cx, by - 2, 86, 10, 0, 0, TAU); x.fill();
      x.fillStyle = LG(x, cx - 80, 0, cx + 80, 0, [[0, '#FFFFFF'], [0.5, '#F4EBDD'], [1, '#C9B89A']]); x.fillRect(cx - 74, by - 30, 148, 30);
      x.fillStyle = C.gold; x.fillRect(cx - 80, by - 34, 160, 6); x.fillRect(cx - 76, by - 6, 152, 4);
      for (let i = 0; i < 4; i++) { const p = new Path2D(); archPath(p, cx - 54 + i * 36, by - 8, 16, 18); x.fillStyle = 'rgba(176,150,112,0.4)'; x.fill(p); x.strokeStyle = E.rgba(C.gold, 0.85); x.lineWidth = 1.2; x.stroke(p); }
      x.fillStyle = LG(x, 0, by - 40, 0, by - 30, [[0, '#FFFFFF'], [1, '#EFE4D2']]); x.beginPath(); x.ellipse(cx, by - 34, 80, 9, 0, 0, TAU); x.fill();
      return { c: b.c, ax: cx, ay: by, w, h };
    })();
  }
  /* mini rose silhouette (paradise) for the contour; visual centre offset from origin */
  const SIL = {};
  function buildSil() {
    const pts = A.heroRoseSilhouette(ROSE.R, 1, { variant: 'paradise' });
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    SIL.pts = pts; SIL.cx = (x0 + x1) / 2; SIL.cy = (y0 + y1) / 2;   // origin → visual centre offset
    // jar dome outline points (local jar coords, base origin) for the dissolve sparkles
    const rw = JAR.w / 2, yb = -JAR.h * 0.075, yTop = -JAR.h + JAR.w * 0.07 * 2.1, rTop = rw * 0.92;
    SIL.jar = []; for (let i = 0; i < 46; i++) { const u = i / 45; let px, py; if (u < 0.25) { px = -rw; py = lerp(yb, yTop + rTop, u / 0.25); } else if (u < 0.75) { const a = PI + ((u - 0.25) / 0.5) * PI; px = Math.cos(a) * rw; py = yTop + rTop + Math.sin(a) * rTop * 1.02; } else { px = rw; py = lerp(yTop + rTop, yb, (u - 0.75) / 0.25); } SIL.jar.push([px, py]); }
  }

  /* ======================= LAYER DRAWERS ======================= */
  function drawSky(ctx, t, cam) {
    ctx.fillStyle = E.lin(ctx, 0, 0, 0, H, [[0, '#FFF3D6'], [0.16, C.sky0], [0.28, '#F4F7EA'], [0.42, '#E1F2EA'], [0.7, '#CDEBDD'], [1, C.sky3]]); ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = E.rad(ctx, 540, -240, 0, 1000, [[0, '#FFFFFF', 0.55], [0.45, '#FFF4DA', 0.18], [1, '#FFF4DA', 0]]); ctx.fillRect(0, 0, W, 1100);
    ctx.restore();
    lay(ctx, cam, 0.08, () => {
      for (let i = 0; i < 6; i++) {
        const cw = 420 + hs(i, 611) * 360, cx = ((hs(i, 612) * 1700 + t * (5 + hs(i, 613) * 6)) % 1700) - 300, cy = 120 + hs(i, 614) * 300;
        ctx.globalAlpha = 0.45 + 0.3 * hs(i, 615);
        ctx.drawImage(SP.cloud, cx - cw / 2, cy - cw * 0.19, cw, cw * 0.385);
      }
      ctx.globalAlpha = 1;
    });
  }
  function drawFar(ctx, t, cam) { lay(ctx, cam, 0.2, () => ctx.drawImage(SP.far, FAR.x0, FAR.y0)); }
  function drawMid(ctx, t, cam, st) {
    lay(ctx, cam, 0.55, () => {
      ctx.drawImage(SP.mid, MID.x0, MID.y0);
      ctx.save(); ctx.lineCap = 'round';
      RIVERS.forEach((r, ri) => {
        const sp = r.sp;
        for (const [off, a, dl, sp2, lw] of [[-0.2, 0.8, 22, 60, 1.8], [0.22, 0.55, 14, 46, 1.3], [0, 0.45, 30, 80, 2.6]]) {
          ctx.beginPath();
          sp.forEach((q, i) => { const xx = q[0] + q[2] * off, yy = q[1]; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); });
          ctx.setLineDash([dl, dl * 2.6]); ctx.lineDashOffset = -t * sp2 - ri * 37;
          ctx.strokeStyle = E.rgba(ri === 1 ? '#C8D8E0' : r.hi, a * (ri === 1 ? 0.55 : 1) * (1 + 0.6 * st.sparkle)); ctx.lineWidth = lw; ctx.stroke();
        }
        ctx.setLineDash([]);
        // cascades shimmer
        for (const [fx, fy, fw, fh] of r.falls || []) {
          ctx.save(); ctx.beginPath(); ctx.rect(fx - fw / 2, fy, fw, fh + 3); ctx.clip();
          ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 5]); ctx.lineDashOffset = -t * 90;
          for (let s = 0; s < 5; s++) { const sx = fx - fw / 2 + fw * (s + 0.3 + 0.4 * hs(s, ri)) / 5; ctx.beginPath(); ctx.moveTo(sx, fy); ctx.lineTo(sx, fy + fh + 2); ctx.stroke(); }
          ctx.restore();
          ctx.fillStyle = E.rgba('#FFFFFF', 0.35 + 0.15 * Math.sin(t * 7 + fx)); ctx.beginPath(); ctx.ellipse(fx, fy + fh, fw * 0.7, 3 + fh * 0.12, 0, 0, TAU); ctx.fill();
        }
      });
      ctx.restore();
      const gl = [];
      RIVERS.forEach((r, ri) => { for (let i = 0; i < 10; i++) { const q = r.sp[Math.floor(hs(i, 700 + ri) * (r.sp.length - 1))]; gl.push([q[0] + (hs(i, 710 + ri) - 0.5) * q[2] * 0.6, q[1]]); } });
      A.glints(ctx, t, { pts: gl, seed: 720, r: 7 + 7 * st.sparkle, period: 1.6, duty: 0.35 + 0.25 * st.sparkle, alpha: 0.9 });
      for (const tr of MID_TREES) {
        const s = treeSprite(tr.kind, tr.tier), sway = 0.025 * Math.sin(1.1 * t + tr.wx * 0.013) + 0.01 * Math.sin(2.3 * t + tr.id);
        ctx.save(); ctx.translate(tr.wx, tr.wy); ctx.rotate(sway); ctx.scale(tr.s, tr.s); ctx.drawImage(s.c, -s.ax, -s.ay); ctx.restore();
      }
      drawBlooms(ctx, t, 0);
    });
  }

  /* ---------------- rain blooms ---------------- */
  const BLOOMS = [];
  function planBlooms() {
    const TYPES = ['tulip', 'daisy', 'carnation', 'lily', 'hyacinth', 'tulip', 'daisy'];
    let i = 0;
    for (let k = 1; k < 4; k++) {
      for (let j = 0; j < 16; j++, i++) {
        const wx = 0 + hs(i, 801) * 1100, top = k === 0 ? 520 : lipY(k - 1, wx) + TIERS[k - 1][2], wy = lerp(top + 8, lipY(k, wx) - 4, 0.25 + 0.7 * hs(i, 802));
        BLOOMS.push({ L: 0, wx, wy, size: 7 + k * 3.4 + hs(i, 803) * 3, type: TYPES[i % TYPES.length], t: 52.12 + hs(i, 804) * 1.8, id: i });
      }
    }
    for (let j = 0; j < 18; j++, i++) BLOOMS.push({ L: 1, wx: 230 + j * 66 + hs(i, 805) * 40, wy: 899 + hs(i, 806) * 5, size: 16 + hs(i, 807) * 7, type: TYPES[i % TYPES.length], t: 52.2 + hs(i, 808) * 1.6, id: i });
  }
  function drawBlooms(ctx, t, L) {
    if (t < 52.1) return;
    for (const b of BLOOMS) {
      if (b.L !== L) continue;
      const age = t - b.t; if (age < 0) continue;
      A.drawFlower(ctx, b.type, b.wx, b.wy, b.size, { pop: clamp(age / 0.4), rot: 0.06 * Math.sin(1.3 * t + b.wx * 0.01) });
      if (age < 0.6) {
        const k = age / 0.6, rr = 4 + k * b.size * 1.6;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = E.rgba('#FFF6D8', 0.85 * (1 - k)); ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.ellipse(b.wx, b.wy, rr, rr * 0.32, 0, 0, TAU); ctx.stroke();
        ctx.restore();
        S.sparkle(ctx, b.wx, b.wy - b.size * 0.8, b.size * 0.75 * Math.sin(PI * k), 0.95, '#FFF6D8');
      }
    }
  }

  /* ---------------- hero layer: bounties, terrace, prepared places ---------------- */
  function drawHero(ctx, t, cam, st) {
    lay(ctx, cam, 1, () => {
      // ring 3 rosette behind everything of the hero plane
      if (st.r3 > 0 && st.out < 1) {
        E.at(ctx, ROSE.x, ROSE.y, 1, 0, () => {
          ctx.globalAlpha = (1 - st.out);
          const rr = 640 * (0.8 + 0.2 * E.ease.outCubic(st.r3));
          ctx.fillStyle = E.rad(ctx, 0, 0, 0, rr, [[0, '#FFF6DA', 0], [0.42, '#FBD27A', 0.5 * st.r3], [0.86, '#F2B44A', 0.42 * st.r3], [1, '#F2B44A', 0]]); ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.fill();
          A.rosetteFlower(ctx, { r: 600 * (0.82 + 0.18 * E.ease.outCubic(st.r3)), fill: st.r3, t, col: '#F2B44A', core: '#FFF4D6', rays: true, alpha: 0.95 });
          ctx.globalAlpha = 1;
        });
      }
      // bounties materialise from light
      const ap = st.appear;
      if (ap > 0) {
        const glowK = E.env(t, 56.12, 57.0, 0.18, 0.6);
        if (glowK > 0) { S.light(ctx, ROSE.x, ROSE.y, 520, '#FFF6E0', 0.9 * glowK, 'screen'); S.light(ctx, 440, 470, 300, '#FFF6E0', 0.6 * glowK, 'screen'); S.light(ctx, 1060, 420, 260, '#FFF6E0', 0.6 * glowK, 'screen'); }
        const shine = st.shine;
        // pomegranate tree (left)
        {
          const s = SP.pomTree, k = E.ease.outBack(clamp(ap * 1.1), 1.2), sway = 0.012 * Math.sin(t * 0.9) + 0.005 * Math.sin(t * 2.1);
          ctx.save(); ctx.translate(440, 905); ctx.rotate(sway); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); ctx.globalAlpha = clamp(ap * 1.4);
          ctx.drawImage(s.c, -s.ax, -s.ay);
          if (shine > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.12 * shine; ctx.drawImage(s.c, -s.ax, -s.ay); ctx.globalCompositeOperation = 'source-over'; }
          ctx.restore();
          const gp = s.fruits.map((f) => [440 + f[0], 905 + f[1] + 6]);
          if (ap > 0.5) A.glints(ctx, t, { pts: gp, seed: 940, r: 10 + 6 * shine, period: 2.2, duty: 0.25 + 0.3 * shine, alpha: 0.9 * clamp(ap * 2 - 1) });
        }
        // golden grapes on a vine (right)
        {
          const s = SP.vine; ctx.save(); ctx.globalAlpha = clamp(ap * 1.4);
          ctx.drawImage(s.c, 1250 - s.w, 300);
          const clusters = [[1250 - 470, 390, 120, 0], [1250 - 380, 418, 150, 1], [1250 - 285, 396, 132, 2], [1250 - 190, 372, 112, 3]];
          for (const [gx, gy, gs, i] of clusters) {
            const sw = 0.06 * Math.sin(t * 1.2 + i * 1.7);
            ctx.save(); ctx.translate(gx, gy); ctx.rotate(sw); ctx.translate(0, gs * 0.62);
            const k = E.ease.outBack(clamp(ap * 1.3 - i * 0.08), 1.6); ctx.scale(k, k);
            A.grapes(ctx, { size: gs, gold: true, t: t + i });
            ctx.restore();
          }
          ctx.restore();
        }
      }
      // rings 1 & 2 (behind the rose)
      drawRings(ctx, t, st);
      // paradise rose on its stem
      if (ap > 0) {
        const k = E.ease.outBack(clamp(ap), 1.3), ox = ROSE.x - SIL.cx, oy = ROSE.y - SIL.cy;   // receptacle
        ctx.save(); ctx.globalAlpha = clamp(ap * 1.5);
        const tip = A.stemTip({ len: 330, t, sway: 0.25, bend: 0.12 });
        E.at(ctx, ox - tip.x, oy - tip.y, 1, 0, () => A.stem(ctx, { len: 330, t, sway: 0.25, bend: 0.12, leaves: 3, thorns: 4, width: 13 }));
        E.at(ctx, ROSE.x, ROSE.y, 0.86 + 0.14 * k, 0, () => {
          E.at(ctx, -SIL.cx, -SIL.cy, 1, 0, () => A.heroRose(ctx, { R: ROSE.R, bloom: 0.55 + 0.45 * clamp(ap * 1.2), variant: 'paradise', t, rot: 0 }));
        });
        ctx.restore();
        if (st.shine > 0) S.light(ctx, ROSE.x, ROSE.y, 380, '#FFF3D0', 0.25 * st.shine, 'lighter');
      }
      // terrace
      ctx.drawImage(SP.ter, TER.x0, TER.y0, TER.w, TER.h);
      ctx.save(); ctx.beginPath(); ctx.rect(TER.x0, 906, TER.w, 170); ctx.clip(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.32;
      ctx.drawImage(SP.dapple, -40 + 14 * Math.sin(t * 0.35), 908 + 3 * Math.sin(t * 0.5), 1400, 160); ctx.drawImage(SP.dapple, 1100 - 12 * Math.sin(t * 0.3 + 1), 912, 1400, 160);
      ctx.restore();
      drawBlooms(ctx, t, 1);
      drawPlaces(ctx, t, st);
    });
  }
  function drawPlaces(ctx, t, st) {
    // seccades
    for (let i = 0; i < 7; i++) {
      const t0 = 54.6 + i * 0.09, a = P(t, t0 - 0.12, t0 + 0.05, 'outCubic');
      if (a <= 0) continue;
      const un = P(t, t0, t0 + 0.55, 'inOutCubic');
      ctx.save(); ctx.globalAlpha = a;
      ctx.translate(RUG_X(i), RUG_Y); ctx.scale(1.08, 0.56); A.seccade(ctx, { w: 104, h: 196, unroll: un, palette: [0, 1, 2, 0, 1, 2, 0][i], persp: 0.7, t });
      ctx.restore();
    }
    // plinth + tables (appear at "hazırladığı")
    const tb = P(t, 55.2, 55.62, 'outBack');
    if (tb > 0) {
      const draw = (spr, x, y, s, k) => { ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k); ctx.globalAlpha = clamp(k * 1.5); ctx.drawImage(spr.c, -spr.ax, -spr.ay); ctx.restore(); };
      draw(SP.table, RUG_X(1) + 66, PLINTH_Y + 2, 0.62, clamp(tb * 1.05));
      draw(SP.table, RUG_X(4) + 66, PLINTH_Y + 2, 0.62, clamp(tb * 1.05 - 0.05));
      draw(SP.plinth, ROSE.x, PLINTH_Y, 0.7, clamp(tb));
    }
    // iznik bowl on the plinth: overflowing (answers "doyurmaz")
    const bw = st.bowl;
    if (bw > 0) {
      const sc = 0.42;
      ctx.save(); ctx.globalAlpha = clamp(bw * 1.6);
      if (bw < 1) S.light(ctx, ROSE.x, PLINTH_TOP - 50, 200, '#FFF4D8', 0.8 * (1 - bw), 'screen');
      E.at(ctx, ROSE.x, PLINTH_TOP - 220 * sc, sc * (0.85 + 0.15 * E.ease.outBack(clamp(bw * 1.4))), 0, () => A.iznikBowl(ctx, { t, overflow: st.overflow, honey: 0, shadow: false, lit: 1, tilt: 0.2 }));
      ctx.restore();
      if (st.overflow > 0.3) {
        // honey-light trickles down the plinth and pools on the marble
        const k = clamp((st.overflow - 0.3) / 0.5);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = E.rad(ctx, ROSE.x, PLINTH_Y + 6, 0, 120, [[0, '#FFC15E', 0.55 * k], [1, '#FFC15E', 0]]);
        ctx.save(); ctx.translate(ROSE.x, PLINTH_Y + 6); ctx.scale(1, 0.25); ctx.beginPath(); ctx.arc(0, 0, 120, 0, TAU); ctx.restore(); ctx.fill();
        ctx.strokeStyle = E.rgba('#FFD27A', 0.8 * k); ctx.lineWidth = 3; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * 60;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ROSE.x + s * 50, PLINTH_TOP + 2); ctx.lineTo(ROSE.x + s * 52, PLINTH_Y + 2); ctx.stroke(); }
        ctx.setLineDash([]); ctx.restore();
      }
    }
    // kandils (lit forever)
    for (let i = 0; i < 7; i++) {
      const ta = 54.95 + i * 0.05, a = P(t, ta, ta + 0.25, 'outCubic');
      if (a <= 0) continue;
      const tl = 55.13 + i * 0.07, lit = P(t, tl, tl + 0.32, 'outBack');
      ctx.save(); ctx.globalAlpha = a;
      E.at(ctx, RUG_X(i), KAN_Y, 0.3, 0, () => A.kandil(ctx, { size: 200, lit, oil: 0.75, lightR: 300, t: t + i * 0.37 }));
      ctx.restore();
      if (lit > 0 && lit < 1.2 && t < tl + 0.45) A.sparks(ctx, t, { x: RUG_X(i), y: KAN_Y - 54, t0: tl, n: 8, seed: 970 + i, col: '#FFE3A3', speed: 110, life: 0.45, gravity: -60, size: 1.6 });
    }
  }
  /** star8 outline (two squares) as a path, for the soft halo band under A.star8 */
  function star8Path(r, rot) {
    const p = new Path2D();
    for (const a0 of [rot, rot + PI / 4]) { for (let i = 0; i < 4; i++) { const a = a0 - PI / 2 + (i / 4) * TAU; i ? p.lineTo(Math.cos(a) * r, Math.sin(a) * r) : p.moveTo(Math.cos(a) * r, Math.sin(a) * r); } p.closePath(); }
    return p;
  }
  function haloStroke(ctx, path, k, wide, col) {
    ctx.save(); ctx.lineJoin = 'round';
    ctx.strokeStyle = E.rgba(col, 0.16 * k); ctx.lineWidth = wide; ctx.stroke(path);
    ctx.strokeStyle = E.rgba(col, 0.22 * k); ctx.lineWidth = wide * 0.45; ctx.stroke(path);
    ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = E.rgba('#FFFFFF', 0.55 * k); ctx.lineWidth = wide * 0.2; ctx.stroke(path);
    ctx.restore();
  }
  function drawRings(ctx, t, st) {
    if (st.r1 <= 0 || st.out >= 1) return;
    E.at(ctx, ROSE.x, ROSE.y, 1, 0, () => {
      ctx.globalAlpha = 1 - st.out;
      const lock = st.lock;   // ring 1 rotates 22.5° and locks into ring 2's alignment (micro-snap)
      const rot1 = (PI / 8) * (1 - lock) + t * 0.012 * (1 - clamp(lock));
      // ring 1 — thin, faint: circle + star8 (r 330)
      const c1 = new Path2D(); c1.arc(0, 0, 336, -PI / 2, -PI / 2 + TAU * st.r1);
      haloStroke(ctx, c1, st.r1, 18, '#F2BE58');
      haloStroke(ctx, star8Path(330, rot1), st.r1 * st.r1 * (0.8 + 0.4 * st.r2), 14, '#F2BE58');
      ctx.save(); ctx.strokeStyle = E.rgba('#C38E2E', 0.75 * st.r1); ctx.lineWidth = 2; ctx.stroke(c1); ctx.restore();
      A.star8(ctx, { r: 330, draw: st.r1, open: 0, rot: rot1, lineW: 2.6 + 1.4 * st.r2, glow: 0.6, alpha: 0.85, girih: false, col: '#D9A441' });
      if (st.r2 > 0) {
        // ring 2 — thicker, brighter (r 440 star8 + r 452 circle with 16 pearls)
        const c2 = new Path2D(); c2.arc(0, 0, 452, -PI / 2, -PI / 2 + TAU * clamp(st.r2 * 1.3));
        haloStroke(ctx, c2, st.r2, 34, '#F2BE58');
        haloStroke(ctx, star8Path(440, 0), st.r2, 24, '#F2BE58');
        ctx.save(); ctx.strokeStyle = E.rgba('#B9832A', 0.95 * st.r2); ctx.lineWidth = 4.5; ctx.stroke(c2);
        ctx.strokeStyle = E.rgba('#FFF2C8', 0.9 * st.r2); ctx.lineWidth = 1.5; ctx.stroke(c2); ctx.restore();
        A.star8(ctx, { r: 440, draw: st.r2, open: 0.35 * st.r2, rot: 0, lineW: 4.8, glow: 0.9, alpha: 1, girih: true, ext: 0.18, col: '#D9A441' });
        for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, k = clamp(st.r2 * 1.6 - (i / 16) * 0.5); if (k <= 0) continue; S.sparkle(ctx, Math.cos(a) * 452, Math.sin(a) * 452, 9 * k * (0.8 + 0.2 * Math.sin(t * 3 + i)), 0.9, '#FFFFFF'); ctx.fillStyle = E.rgba('#FFF6E0', k); ctx.beginPath(); ctx.arc(Math.cos(a) * 452, Math.sin(a) * 452, 5, 0, TAU); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    });
  }

  /* ---------------- the jar (sample) ---------------- */
  function jarAt(t, cam) {
    // anchor = mini-rose visual centre (screen), s = scale
    let [x, y, s] = toScreen(cam, JAR.p, JAR.wx, JAR.wy);
    const fi = E.ease.outBack(clamp((t - 49.5) / 0.75), 1.15);       // float in from the left
    x = lerp(-170, x, fi); y = lerp(y + 90, y, E.ease.outCubic(clamp((t - 49.5) / 0.75)));
    y += 6 * Math.sin(t * 1.7) * (1 - P(t, 56.4, 57.0)); x += 3 * Math.sin(t * 1.1 + 1) * (1 - P(t, 56.4, 57.0));
    const park = P(t, 54.2, 55.9, 'inOutCubic'); x -= 135 * park; y -= 120 * park; s *= 1 - 0.14 * park;
    const g = P(t, 56.3, 57.1, 'inOutCubic');
    const [rx, ry, rz] = toScreen(cam, 1, ROSE.x, ROSE.y);
    x = lerp(x, rx, g); y = lerp(y, ry, g) - 50 * Math.sin(PI * g); s = lerp(s, rz, g);
    const rot = (0.025 * Math.sin(t * 1.3) - 0.06 * (1 - fi)) * (1 - g);
    return { x, y, s, rot, on: t > 49.5 };
  }
  function jarContent(ctx, t, withRose) {
    // the earthly garden in miniature (B palette), bloom-wave replays at "o çeşit tezyinat"
    A.garden(ctx, t, { palette: 'mini', scale: 0.19, cx: 0, cy: -170, wave: (t - 50.08) * 1.25, rose: false, flowers: 90 });
    // tiny glints as the miniature bloom-wave passes (callback to B's signature wave)
    if (t > 50.35 && t < 51.6) {
      for (let i = 0; i < 14; i++) {
        const tt = 50.42 + i * 0.065 + hs(i, 1301) * 0.1, a = t - tt; if (a < 0 || a > 0.45) continue;
        const px = (hs(i, 1302) - 0.5) * JAR.w * 0.8, py = -14 - hs(i, 1303) * JAR.h * 0.32;
        S.sparkle(ctx, px, py, 7 * Math.sin(PI * a / 0.45), 1, '#FFF6D8');
      }
    }
    if (withRose) {
      const R = ROSE.R * MINI, oy = -JAR.h * JAR.ROFF + JAR.h * 0.075 - SIL.cy * MINI, ox = -SIL.cx * MINI;
      const tip = A.stemTip({ len: -oy - 4, t, sway: 0.4 });
      E.at(ctx, ox - tip.x, 0, 1, 0, () => A.stem(ctx, { len: -oy - 4, t, sway: 0.4, leaves: 2, thorns: 2, width: 3.2 }));
      E.at(ctx, ox, oy, 1, 0, () => A.heroRose(ctx, { R, bloom: 0.72 + 0.28 * P(t, 50.4, 51.0, 'outBack'), variant: 'mini', t }));
    }
  }
  function drawJar(ctx, t, cam, st) {
    const J = jarAt(t, cam); if (!J.on) return J;
    const dis = st.dissolve;   // glass → sparkles
    if (dis < 1) {
      ctx.save(); ctx.translate(J.x, J.y); ctx.rotate(J.rot); ctx.scale(J.s, J.s); ctx.translate(0, JAR.h * JAR.ROFF);
      ctx.globalAlpha = 1 - E.ease.inCubic(dis);
      // soft floating halo under the jar
      S.light(ctx, 0, -JAR.h * 0.35, JAR.w * 1.1, '#FFF6DE', 0.35, 'screen');
      A.bellJar(ctx, { w: JAR.w, h: JAR.h, t, tag: true, spec: st.jarSpec, content: (c) => { if (st.contentFade < 1) { c.globalAlpha *= 1 - st.contentFade; jarContent(c, t, st.grow <= 0); } } });
      if (st.rainK > 0.05) A.glints(ctx, t, { pts: SIL.jar.filter((_, i) => i % 3 === 0), seed: 980, r: 9, period: 0.9, duty: 0.3 * st.rainK, alpha: 0.95 });
      ctx.restore();
    }
    if (dis > 0 && dis < 1.4) {
      // the glass dissolves into sparkles rising along its outline
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      SIL.jar.forEach((p, i) => {
        const d0 = hs(i, 990) * 0.35, age = dis - d0; if (age <= 0 || age > 1) return;
        const px = J.x + (p[0] + (hs(i, 991) - 0.5) * 60 * age) * J.s, py = J.y + (p[1] + JAR.h * JAR.ROFF - 90 * age - 30 * age * age) * J.s;
        S.sparkle(ctx, px, py, (5 + 7 * hs(i, 992)) * Math.sin(PI * age), 1, i % 2 ? '#FFFFFF' : '#FFE7A8', age * 2);
      });
      ctx.restore();
    }
    return J;
  }
  /* the sample grows into its original: mini rose scales 0.12→1, gold contour on the shared silhouette */
  function drawGrow(ctx, t, cam, st) {
    const g = st.grow; if (g <= 0 || g >= 1.6) return;
    const [rx, ry, rz] = toScreen(cam, 1, ROSE.x, ROSE.y);
    const k = A.morphEase(clamp(g), 0.05), s = lerp(MINI, 1, k);
    const fade = 1 - sm(clamp((k - 0.62) / 0.38)), mP = sm(clamp((k - 0.02) / 0.5));
    if (fade > 0.01) {
      ctx.save(); ctx.translate(rx, ry); ctx.scale(rz * s, rz * s); ctx.translate(-SIL.cx, -SIL.cy);
      if (mP < 0.99) { ctx.globalAlpha = fade * (1 - mP); A.heroRose(ctx, { R: ROSE.R, bloom: 1, variant: s * ROSE.R * rz < 40 ? 'mini' : 'normal', t }); }
      if (mP > 0.01) { ctx.globalAlpha = fade * mP; A.heroRose(ctx, { R: ROSE.R, bloom: 1, variant: 'paradise', t }); }
      ctx.restore();
    }
    // gold contour shimmer tracing the shared outline
    const ca = E.env(g, 0, 1.55, 0.12, 0.45);
    if (ca > 0.01) {
      const pts = SIL.pts.map((p) => [rx + (p[0] - SIL.cx) * s * rz, ry + (p[1] - SIL.cy) * s * rz]);
      const path = A.shapePath(pts, true);
      ctx.save(); ctx.lineJoin = 'round';
      ctx.strokeStyle = E.rgba('#F2C66A', 0.3 * ca); ctx.lineWidth = 16; ctx.stroke(path);
      ctx.strokeStyle = E.rgba('#9A6418', 0.4 * ca); ctx.lineWidth = 5.5; ctx.stroke(path);
      ctx.strokeStyle = E.rgba('#F2BE55', 1 * ca); ctx.lineWidth = 3.4; ctx.stroke(path);
      ctx.strokeStyle = E.rgba('#FFF4D0', 0.9 * ca); ctx.lineWidth = 1.1; ctx.stroke(path);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = E.rgba('#FFE7B0', 0.45 * ca); ctx.lineWidth = 12; ctx.stroke(path);
      // travelling highlight
      const n = pts.length, head = Math.floor(((g * 1.1) % 1) * n);
      for (let j = 0; j < 22; j++) { const q = pts[(head - j + n * 4) % n], a = (1 - j / 22) * ca; S.sparkle(ctx, q[0], q[1], 9 * a + 2, a, '#FFFFFF', 0); }
      ctx.restore();
    }
  }

  /* ======================= overlays ======================= */
  function drawLightFromAbove(ctx, t, st) {
    if (st.top > 0.003) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = E.rad(ctx, 540, -380, 0, 1150, [[0, '#FFFFFF', 0.9 * st.top], [0.35, '#FFF6DC', 0.42 * st.top], [0.7, '#FFF6DC', 0.08 * st.top], [1, '#FFF6DC', 0]]); ctx.fillRect(0, 0, W, 800);
      ctx.restore();
    }
    if (st.shafts > 0.003) {
      // 5 soft vertical shafts (6° slant, like the rain); each lands as a pool of light on the marble
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const sl = Math.tan(6 * PI / 180), L = 1040;
      for (let i = 0; i < 5; i++) {
        const x0 = 110 + i * 200 + 18 * Math.sin(t * 0.3 + i * 1.7) + (hs(i, 1001) - 0.5) * 50, w = 60 + hs(i, 1002) * 70;
        const a = st.shafts * (0.42 + 0.16 * hs(i, 1003)) * (0.85 + 0.15 * Math.sin(t * 0.9 + i));
        ctx.fillStyle = E.lin(ctx, 0, 0, 0, L, [[0, '#FFFFFF', a], [0.55, '#FFF4D8', a * 0.6], [0.92, '#FFF4D8', a * 0.35], [1, '#FFF4D8', 0]]);
        ctx.beginPath(); ctx.moveTo(x0 - w * 0.35, 0); ctx.lineTo(x0 + w * 0.35, 0); ctx.lineTo(x0 + w * 0.6 + L * sl, L); ctx.lineTo(x0 - w * 0.6 + L * sl, L); ctx.closePath(); ctx.fill();
        const px = x0 + L * sl * 0.97, py = L - 30;
        ctx.fillStyle = E.rad(ctx, px, py, 0, w * 1.4, [[0, '#FFFBEA', a * 1.1], [1, '#FFFBEA', 0]]);
        ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.24); ctx.beginPath(); ctx.arc(0, 0, w * 1.4, 0, TAU); ctx.restore(); ctx.fill();
      }
      ctx.restore();
    }
  }
  function drawRain(ctx, t, st) {
    if (st.rainK <= 0.01) return;
    A.lightRain(ctx, t, { n: 400, seed: 11, density: st.rainK, speed: 380, len: [22, 46], col: '#FFFFFF', halo: E.hexOf(E.mix('#FFFFFF', '#FFE7A8', st.warm)), alpha: 1, bandSlow: true });
    // a faint warm core so drops also read against the bright sky
    ctx.save(); ctx.globalAlpha = 0.42 * st.rainK; ctx.globalCompositeOperation = 'multiply';
    A.lightRain(ctx, t, { n: 420, seed: 11, density: st.rainK, speed: 380, len: [18, 40], col: '#F3D9A0', halo: '#FFF6E6', alpha: 1, bandSlow: true, area: { x: 0, y: 0, w: W, h: 880 } });
    ctx.restore();
  }
  function drawLove(ctx, t) {
    // "sevdiği": love as warmth — a rose-gold wave radiates from the centre (no symbols)
    const k = E.env(t, 54.12, 56.6, 0.22, 1.0); if (k <= 0) return;
    const R = 60 + 1200 * P(t, 54.12, 55.45, 'outCubic'), base = P(t, 54.4, 55.1);
    E.layer(ctx, (l) => {
      l.fillStyle = E.rad(l, 540, 800, Math.max(0, R - 300), R, [[0, '#FFB8CB', 0], [0.6, '#FF9DB5', 0.55], [1, '#FF9DB5', 0]]); l.fillRect(0, 0, W, H);
      l.fillStyle = E.rad(l, 540, 800, 0, 700, [[0, '#FFD0A8', 0.35 * base], [1, '#FFD0A8', 0]]); l.fillRect(0, 0, W, H);
      l.globalCompositeOperation = 'destination-in';
      l.fillStyle = E.lin(l, 0, 0, 0, H, [[0, '#000', 1], [0.57, '#000', 1], [0.635, '#000', 0], [1, '#000', 0]]); l.fillRect(0, 0, W, H);
    }, { lo: true, op: 'multiply', alpha: 0.55 * k });
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = E.rad(ctx, 540, 800, Math.max(0, R - 220), R, [[0, '#FFD27A', 0], [0.6, '#FFE3B0', 0.35 * k], [1, '#FFE3B0', 0]]); ctx.fillRect(0, 0, W, 1200);
    ctx.fillStyle = E.rad(ctx, 540, 800, 0, 560, [[0, '#FFE6C8', 0.3 * k * base], [1, '#FFE6C8', 0]]); ctx.fillRect(0, 240, W, 1120);
    ctx.restore();
  }
  function drawRingPulse(ctx, t) {
    const k = clamp((t - 49.0) / 0.9); if (k <= 0 || k >= 1) return;
    const e = E.ease.outCubic(k), R = 40 + 980 * e;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = E.rgba('#FFFFFF', 0.32 * (1 - k)); ctx.lineWidth = 34 * (1 - e) + 5;
    ctx.beginPath(); ctx.arc(540, 820, R, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function bandGuard(t) {
    if (!window.TIMING) return 0;
    let g = 0; for (const q of TIMING.glosses) g = Math.max(g, E.env(t, q.in - 0.3, q.out + 0.45, 0.25, 0.3));
    return g;
  }
  function drawExposure(ctx, t, st, g) {
    const ex = st.exp; if (ex <= 0.003) return;
    const kb = 1 - 0.85 * g, a = Math.min(1, ex * 2.4);
    ctx.save(); ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = E.lin(ctx, 0, 0, 0, H, [[0, '#FFFBF2', a], [0.6, '#FFFBF2', a], [0.64, '#FFFBF2', a * kb], [0.82, '#FFFBF2', a * kb], [0.86, '#FFFBF2', a], [1, '#FFFBF2', a]]);
    ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  /* ---------------- outro: footnote star → dawn sun ---------------- */
  const STAR_PTS = A.starPts(1, 8, 0.72, 128), CIRC_PTS = A.circlePts(1, 128);
  function drawOutro(ctx, t, cam) {
    if (t < 60.55) return;
    const wK = P(t, 60.55, 60.95, 'inOutSine');      // the vista dissolves into warm light
    const dK = P(t, 60.8, 61.55, 'inOutSine');       // warm light → J's dawn (never a grey frame)
    const path3 = (a, b, c, k) => (k < 0.5 ? E.mix(a, b, k * 2) : E.mix(b, c, (k - 0.5) * 2));
    const SW = ['#FFF8EC', '#FFF5E3', '#FFF2D9', '#FFEFCD', '#FFEBC0'], SP3 = ['#E8CCE2', '#F3C8CE', '#FFD0A8', '#FFDDA9', '#FFEBC2'], SD = ['#2A2148', '#6B3F72', '#E58A78', '#FFC98F', '#FFE7B5'];
    const stops = [0, 0.32, 0.64, 0.86, 1];
    ctx.save(); ctx.globalAlpha = wK;
    ctx.fillStyle = E.lin(ctx, 0, 0, 0, 1020, stops.map((q, i) => [q, path3(SW[i], SP3[i], E.mix(SW[i], SD[i], 0.88), dK)])); ctx.fillRect(0, 0, W, 1021);
    // gold horizon glow
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = E.rad(ctx, 540, 1020, 0, 760, [[0, '#FFE2A8', 0.55 * dK], [0.5, '#FFC98F', 0.2 * dK], [1, '#FFC98F', 0]]); ctx.fillRect(0, 300, W, 1000);
    ctx.globalCompositeOperation = 'source-over';
    // far range, then the green hill silhouette with a gold rim
    const far = (x) => 1006 + 16 * Math.sin(x * 0.005 + 1) + 8 * Math.sin(x * 0.017), near = (x) => 1052 + 30 * Math.sin(x * 0.0042 + 2.2) + 12 * Math.sin(x * 0.013);
    ctx.fillStyle = path3('#FFF3DE', '#F0C6B4', E.mix('#FFF3DE', '#B08A86', 0.88), dK);
    ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 24) ctx.lineTo(x, far(x)); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = E.lin(ctx, 0, 1020, 0, H, [[0, path3('#FFF0D8', '#A9D2B9', '#3F7F6E', dK)], [0.35, path3('#FFEDD2', '#86B8A2', '#2C5E58', dK)], [1, path3('#FFEACB', '#5E8E80', '#163838', dK)]]);
    ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 24) ctx.lineTo(x, near(x)); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = E.rgba('#FFD98A', 0.85 * dK); ctx.lineWidth = 3; ctx.beginPath(); for (let x = 0; x <= W; x += 24) (x ? ctx.lineTo(x, near(x)) : ctx.moveTo(x, near(x))); ctx.stroke();
    ctx.restore();
    // the footnote star: rosette folds into the star8, which glows on, descends and becomes the sun
    const [rx, ry, rz] = toScreen(cam, 1, ROSE.x, ROSE.y);
    const c = P(t, 60.6, 61.15, 'inOutCubic'), dsc = P(t, 61.15, 61.72, 'inOutCubic'), mo = P(t, 61.32, 61.74, 'inOutCubic');
    const RS = 64, r = lerp(600 * rz, RS, c), cx0 = lerp(rx, 540, c), sx = cx0, sy = lerp(ry, 1020, dsc);
    if (c < 0.98) { ctx.save(); ctx.translate(cx0, ry); ctx.globalAlpha = wK * (1 - sm(c * 1.5)); A.rosetteFlower(ctx, { r, fill: 1, t, col: '#F2B44A', core: '#FFF4D6', alpha: 0.95 }); ctx.restore(); }
    const sa = sm(c * 2.2);
    if (sa > 0) {
      const R = lerp(r, 70, mo), gr = lerp(Math.max(r * 2.4, 230), 300, mo);
      // warm halo that reads on the white field as well as on the dawn sky
      ctx.save();
      ctx.fillStyle = E.rad(ctx, sx, sy, 0, gr * 1.15, [[0, '#FFD98A', 0.42 * sa], [0.45, '#FFD98A', 0.18 * sa], [1, '#FFD98A', 0]]); ctx.fillRect(sx - gr * 1.2, sy - gr * 1.2, gr * 2.4, gr * 2.4);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = E.rad(ctx, sx, sy, 0, gr, [[0, '#FFF4D6', 0.9 * sa], [0.3, '#FFD98A', 0.5 * sa], [1, '#FFD98A', 0]]); ctx.fillRect(sx - gr, sy - gr, gr * 2, gr * 2);
      ctx.restore();
      if (mo < 1) {
        ctx.save(); ctx.translate(sx, sy); ctx.globalAlpha = sa * (1 - sm(mo * 1.6));
        A.star8(ctx, { r: R, open: 1 - c, draw: 1, glow: 1, lineW: Math.max(2.6, R * 0.06), girih: true, ext: 0.22, rot: t * 0.15 });
        ctx.restore();
      }
      const fillK = Math.max(sm(mo * 2.5), 0.35 * sm(c));
      if (fillK > 0) {
        const pts = A.lerpShape(STAR_PTS, CIRC_PTS, A.morphEase(mo, 0.04)).map((p) => [sx + p[0] * R * (mo > 0 ? 1 : 0.62), sy + p[1] * R * (mo > 0 ? 1 : 0.62)]);
        ctx.save(); ctx.globalAlpha = fillK;
        ctx.fillStyle = E.rad(ctx, sx - R * 0.3, sy - R * 0.3, 0, R * 1.1, [[0, '#FFFFFF'], [0.7, '#FFF4D6'], [1, '#FFE6B0']]);
        A.fillShape(ctx, pts, true);
        ctx.restore();
      }
    }
  }

  /* ======================= STATE ======================= */
  function stateAt(t) {
    const st = {};
    let vb = 14;
    vb = lerp(vb, 3, P(t, 47.8, 48.39, 'outCubic'));
    vb = lerp(vb, 0, P(t, 48.97, 49.09, 'outCubic'));
    vb = lerp(vb, 4, P(t, 49.7, 50.25, 'inOutSine'));
    vb = lerp(vb, 0, P(t, 51.85, 52.5, 'inOutSine'));
    vb = lerp(vb, 2.2, P(t, 56.15, 56.8, 'inOutSine'));      // background softens behind the bounties
    st.blurBG = vb;
    st.g = bandGuard(t);
    let mb = vb; if (t > 56) mb = 0; st.blurMID = mb;
    st.top = P(t, 51.97, 52.45, 'inOutSine') * (1 - 0.5 * P(t, 55.5, 57.0));
    st.rainK = 0.5 * P(t, 51.98, 52.42, 'inOutSine') + 0.38 * P(t, 52.45, 52.8, 'inOutSine') - 0.88 * P(t, 54.0, 55.4, 'inOutSine');
    st.warm = P(t, 52.45, 52.9);
    st.shafts = P(t, 53.0, 53.55, 'inOutSine') * (1 - P(t, 55.6, 56.6, 'inOutSine'));
    st.sparkle = E.env(t, 52.4, 56.0, 0.5, 1.4);
    st.appear = P(t, 56.12, 56.75, 'linear');
    st.bowl = P(t, 56.5, 56.85, 'outCubic');
    st.overflow = P(t, 56.58, 57.4, 'outCubic');
    st.jarSpec = clamp((t - 57.0) / 0.45);
    st.grow = (t - 57.12) / 0.62;
    st.dissolve = clamp((t - 57.16) / 0.5) + Math.max(0, (t - 57.66) / 0.5) * 0.4;
    st.contentFade = P(t, 57.1, 57.42, 'inOutSine');
    st.r1 = P(t, 57.88, 58.35, 'outCubic');
    st.r2 = P(t, 59.15, 59.55, 'outCubic');
    st.lock = E.ease.outBack(clamp((t - 59.15) / 0.3), 2.2);
    st.r3 = P(t, 59.97, 60.26, 'outCubic');
    st.shine = 0.4 * st.r1 + 0.3 * st.r2 + 0.6 * E.env(t, 60.07, 60.9, 0.1, 0.6) + 0.3 * st.r3;
    st.out = P(t, 60.6, 61.05, 'inOutSine');
    const flash = E.env(t, 60.05, 60.75, 0.1, 0.5);
    st.flash = flash;
    st.exp = 0.035 * P(t, 49.0, 49.3) + 0.09 * P(t, 53.05, 53.4) * (1 - 0.6 * P(t, 55.0, 56.5)) + 0.03 * st.r1 + 0.05 * st.r2 + 0.04 * flash + 0.02 * st.r3;
    return st;
  }

  /* ======================= SCENE ======================= */
  E.scene({
    id: 'I_cennet', t0: 47.6, t1: 61.9,
    async setup() {
      buildFar(); buildMid(); planTrees(); buildTerrace(); buildBeds(); planPool(); buildFg(); buildCloud(); buildDapple(); buildPomTree(); buildVine(); buildTables(); buildSil(); planBlooms();
      for (const k of ['c', 'f', 'b', 'p']) for (let i = 0; i < 5; i++) treeSprite(k, i);
    },
    post: (t) => {
      const f = E.env(t, 60.06, 60.85, 0.09, 0.6);
      let bloom = 0.16 + 0.07 * E.env(t, 49.0, 49.8, 0.08, 0.6) + 0.04 * E.env(t, 52.0, 55.5, 0.5, 1.0) + 0.08 * E.env(t, 57.1, 58.0, 0.1, 0.5) + 0.03 * P(t, 57.88, 58.3) + 0.04 * P(t, 59.15, 59.5) + 0.16 * f;
      bloom = lerp(bloom, 0.32, P(t, 60.9, 61.8));
      return { bloom, vignette: lerp(0.2, 0.28, P(t, 61.0, 61.8)), grain: 0.035 };
    },
    draw(ctx, t) {
      const cam = camAt(t), st = stateAt(t), g = bandGuard(t);
      const bg = (c) => { drawSky(c, t, cam); drawFar(c, t, cam); drawMid(c, t, cam, st); };
      if (st.blurBG > 0.5 && Math.abs(st.blurBG - st.blurMID) < 0.3) E.layer(ctx, (l) => { bg(l); drawHero(l, t, cam, st); }, { blur: st.blurBG, lo: true });
      else {
        if (st.blurBG > 0.5) E.layer(ctx, (l) => bg(l), { blur: st.blurBG, lo: true }); else bg(ctx);
        drawHero(ctx, t, cam, st);
      }
      drawRingPulse(ctx, t);
      drawLightFromAbove(ctx, t, st);
      drawLove(ctx, t);
      drawJar(ctx, t, cam, st);
      drawGrow(ctx, t, cam, st);
      const src = ctx.canvas, pb = Math.max(st.blurBG, st.blurMID) * 0.85;
      if (pb > 0.6) E.layer(ctx, (l) => drawPool(l, src, t, cam, st), { blur: pb, lo: true }); else drawPool(ctx, src, t, cam, st);
      drawRain(ctx, t, st);
      if (st.r3 > 0 && t < 61.2) A.petals(ctx, t, { t0: 60.1, origin: (() => { const q = toScreen(cam, 1, ROSE.x, ROSE.y); return { x: q[0], y: q[1] }; })(), n: 46, seed: 1100, speed: 1100, spread: TAU, life: 1.5, light: true, size: 26, gravity: 0, stagger: 0.12, wind: [0, -20] });
      if (t > 56.2) A.petals(ctx, t, { area: { x: 0, y: 0, w: W, h: 1150 }, n: 14, seed: 1110, light: true, size: 20, wind: [14, 26], alpha: 0.75 * P(t, 56.2, 57.0) });
      drawFg(ctx, t, cam);
      drawExposure(ctx, t, st, g);
      if (st.flash > 0.01) { const q = toScreen(cam, 1, ROSE.x, ROSE.y); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = E.rad(ctx, q[0], q[1], 0, 760, [[0, '#FFFFFF', 0.42 * st.flash], [0.3, '#FFF3D2', 0.22 * st.flash], [1, '#FFF3D2', 0]]); ctx.fillRect(0, 0, W, 1240); ctx.restore(); }
      if (g > 0.01) { ctx.save(); ctx.fillStyle = E.rad(ctx, 540, 1400, 0, 640, [[0, '#082A22', 0.22 * g], [0.7, '#082A22', 0.12 * g], [1, '#082A22', 0]]); ctx.translate(540, 1400); ctx.scale(1, 220 / 640); ctx.translate(-540, -1400); ctx.fillRect(-100, 760, 1280, 1280); ctx.restore(); }
      // grade: warm soft-light
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = E.rgba('#FFE7B0', 0.10); ctx.fillRect(0, 0, W, H); ctx.restore();
      drawOutro(ctx, t, cam);
      const wo = t < 47.8 ? 0.9 : 0.9 * (1 - P(t, 47.8, 48.55, 'inOutSine'));
      if (wo > 0.003) { ctx.fillStyle = E.rgba(C.sky0, wo); ctx.fillRect(0, 0, W, H); }
    },
  });
  function drawFg(ctx, t, cam) {
    // screen-periodic strip: one corner cluster hands over to the other during the dolly (period 880 px)
    const off = 1080 * P(t, 54.1, 56.15, 'inOutCubic') + 1.5 * (lerp(540, 480, P(t, 49.65, 51.4, 'inOutCubic')) - 480) + 1.5 * (cam.x - camX0(t)), [, ys, z] = toScreen(cam, 1.1, 540, 1513);
    const sc = 0.8 + 0.1 * z, bottom = Math.max(ys + 230, 1965) + Math.sin(t * 1.1 + 1) * 4, sw = Math.sin(t * 0.8) * 6;
    if (bottom - FGS.h * sc > H) return;
    ctx.save(); ctx.translate(540, bottom); ctx.scale(sc, sc);
    for (let k = -1; k <= 1; k++) { const x0 = -540 - off + k * FGS.w + sw; if (x0 > 540 / sc + 40 || x0 + FGS.w < -540 / sc - 40) continue; ctx.drawImage(SP.fg, x0, -FGS.h, FGS.w, FGS.h); }
    ctx.restore();
  }
})();
