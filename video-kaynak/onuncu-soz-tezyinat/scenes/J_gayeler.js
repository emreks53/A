/* =============================================================================
 * J_gayeler · 61.60–68.60 · "şükür içindir, usûl-ü daimîsine teşvik içindir.
 *                            Başka gayet ulvi gayeler içindir."
 * =============================================================================
 * PLAN (all positions are A.garden plate coords; plate → screen via toS(cs,x,y,parallax))
 *
 *  Layers (side view, back → front)
 *    L0 sky gradient + garden glow/rays (A.garden 'J', its own sun parked BEHIND the hills)
 *    L0 our dawn sun (r70→77, #FFF4D6, corona #FFD98A r300) clipped to the sky above strata 0/1
 *    L0.1 the everlasting originals: luminous outlines in the clouds (heroRose 'outline' + Sobel line-art
 *         of a pomegranate tree and an overflowing Iznik bowl), wispy cloud strands drifting through them
 *    L0.45 Masjid an-Nabawi silhouette (w 220) on a shelf of hill stratum 2 at (800,991) — modest, hazed
 *    L1 meadow / path / grass / 180 flowers (A.garden, bow = gratitude wave fn(x,y))
 *    L1 revived HeroRose (R116, stem base (365,1405)), hoopoe on a branch (870,1172), butterflies
 *    L1→0.1 light-path ribbon: B's path lights up from (470,1212) and lifts as a bridge to the rose original
 *    L1.9 blurred dark foreground leaves (own sprite)
 *    FX: dust motes in the sun, sun shaft across the garden, wind streaks, soft-light grade #FF9A6A@.12
 *
 *  Camera: start tilted up (plate +250 px) so the sun sits ON the far hill crest at (540,1020) = I's
 *    handoff; 61.9–62.9 tilt down into the garden while the sun clears the hills (no sinking);
 *    zoom .93→1.0 push-in; 64.6–65.95 slow tilt up after the petals (≤~140 px/s while the gloss is up),
 *    66.0–66.36 whip up ("Başka"), 66.27–66.62 swoop down: the ground plane (Mode-7 strips of the plan
 *    sprite, banked −0.3 rad) rises from below, wiping over the side view while it pitches 14°→90°
 *    (66.38–66.98); then plan zoom 1→.45 (67.0–67.9) and the final push .45→3.0 (68.0–68.5, inCubic).
 *
 *  Beats
 *    61.60–61.90  I→J cross-fade: sun disc (540,1020) r70 on the horizon, faint ivory wash fading out.
 *    62.38 "şükür" gratitude wave: flowers lean +12° toward the sun rippling outward by distance
 *                 (outBack), the rose & stem bow, hoopoe bows, mosque dome catches first light,
 *                 long thin sun shaft draws across the garden.
 *    63.59 "usûl-ü daimîsine" originals fade in (α .3), 63.75–64.65 the path lifts as a ribbon of light.
 *    64.68 "teşvik" breeze: wind streaks, flowers swing toward the path, 30 petals + 5 hero-rose petals,
 *                 pollen and 3 butterflies lift and travel UP the ribbon (firak inverted); originals brighten.
 *    66.19 "Başka" crane over → plan view: the garden seen from above IS an 8-fold Rub el Hizb charbagh
 *                 whose paths are the girih lines (beds = stars, pools = 4-stars).
 *    66.72–67.45 "gayet ulvi" gold girih lights up from the centre out, the star wall draws, the central
 *                 fountain becomes a rosette; plan rotates 0.04 rad/s.
 *    67.00–67.90 zoom out: the garden becomes one tile of an endless girih field.
 *    67.54 "gayeler" 7 rosettes bloom in a ring (B,D,E,F,G,H,I key colours).
 *    68.02 "içindir" everything converges into the centre, ivory flare #FFF6E6 fills the frame by 68.26;
 *                 gold lines fade into 14 faint ink lines (reverse of A) until 68.60.
 *  Gloss band (63.49–66.12): only the dark meadow sits there; particles start above y 1200, scrim on.
 * ========================================================================== */
(function () {
  'use strict';
  const TAU = Math.PI * 2, PI = Math.PI, clamp = E.clamp, lerp = E.lerp, sm = E.smooth, H = E.hash;
  const P = (t, a, b, e) => E.p(t, a, b, e);
  const W = { sukur: 62.453, usul: 63.673, daim: 64.073, tesvik: 64.754, baska: 66.194, gayet: 66.794, ulvi: 67.234, gayeler: 67.614, icindir: 68.054 };
  const SPR = {};

  /* ---------------- garden geometry mirrored from A.garden ('J') ---------------- */
  const HZ = 1020;
  const STRATA = [[HZ - 175, 62, 0.0036, 1.3, 0.15], [HZ - 110, 52, 0.0052, 4.1, 0.25], [HZ - 45, 48, 0.0046, 2.2, 0.45], [HZ + 22, 30, 0.0064, 5.7, 0.7]];
  const hillY = (x, s) => s[0] - s[1] * (0.6 * Math.sin(x * s[2] + s[3]) + 0.3 * Math.sin(x * s[2] * 2.3 + s[3] * 1.7) + 0.12 * Math.sin(x * s[2] * 5.1 + s[3] * 3.1));
  const SKY = [[0, '#2A2148'], [330, '#6B3F72'], [650, '#E58A78'], [880, '#FFC98F'], [1010, '#FFE7B5']];
  const skyAt = (y) => {
    if (y <= SKY[0][0]) return SKY[0][1];
    for (let i = 1; i < SKY.length; i++) if (y <= SKY[i][0]) return E.mix(SKY[i - 1][1], SKY[i][1], (y - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0]));
    return SKY[SKY.length - 1][1];
  };

  /* ---------------- camera ---------------- */
  function camAt(t) {
    const delta = 250 * (1 - P(t, 61.9, 62.9, 'inOutCubic'));
    // tilt up after the petals (≤ ~140 px/s while the gloss is up), whip up, then pitch down (crane-over)
    const T = 120 * P(t, 64.62, 65.95, 'inOutSine') + 150 * P(t, 66.0, 66.28, 'inOutSine'); // then the crane camera takes over
    const zoom = 0.93 + 0.07 * P(t, 61.9, 63.4, 'outCubic') + 0.035 * P(t, 63.4, 65.4, 'inOutSine');
    return { cx: 540, cy: 960 + delta + 0.25 * T, cam: { x: 540 + 3 * Math.sin(0.37 * t), y: 960 - 0.75 * T + 2 * Math.sin(0.29 * t + 1), zoom }, T, delta };
  }
  /** plate point at parallax p → screen [x, y, scale] (exactly A.garden's layer mapping) */
  function toS(cs, x, y, p) {
    const z = 1 + (cs.cam.zoom - 1) * p, kx = 540 + (cs.cam.x - 540) * p, ky = 960 + (cs.cam.y - 960) * p;
    return [cs.cx + z * (x - kx), cs.cy + z * (y - ky), z];
  }
  function layerXf(ctx, cs, p) {
    const z = 1 + (cs.cam.zoom - 1) * p, kx = 540 + (cs.cam.x - 540) * p, ky = 960 + (cs.cam.y - 960) * p;
    ctx.translate(cs.cx, cs.cy); ctx.scale(z, z); ctx.translate(-kx, -ky);
  }
  function sunAt(t, cs) {
    const crest = toS(cs, 540, 834, 0.15)[1];
    const rise = 72 * P(t, 61.98, 63.3, 'inOutSine') + 24 * P(t, 63.3, 66.0, 'inOutSine');
    return { x: toS(cs, 540, 0, 0.04)[0], y: crest - 66 - rise, r: 70 + 7 * P(t, 62.0, 63.6) };
  }
  const glossK = (t) => {
    let g = 0;
    for (const q of TIMING.glosses) g = Math.max(g, Math.min(P(t, q.in - 0.35, q.in, 'inOutSine'), 1 - P(t, q.out + 0.1, q.out + 0.45, 'inOutSine')));
    return g;
  };
  const bandAtt = (y, g) => 1 - 0.7 * g * sm((y - 1212) / 40) * (1 - sm((y - 1560) / 40));

  /* ---------------- small helpers ---------------- */
  function crSample(pts, per = 10) {
    const out = [], n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      for (let k = 0; k < per; k++) {
        const u = k / per, u2 = u * u, u3 = u2 * u;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
        out.push(p1.map((_, j) => f(p0[j], p1[j], p2[j], p3[j])));
      }
    }
    out.push(pts[n - 1].slice());
    return out;
  }
  function petalShape(sz) {
    const k = Math.max(2, Math.round(sz * 2) / 2);
    return SPR['pp' + k] || (SPR['pp' + k] = S.petalPath(k, k * 0.62, 0.3, 0.14));
  }

  /* =============================================================================
   * SETUP SPRITES
   * ============================================================================= */
  /** luminous line-art from any drawing: Sobel edges of alpha + luminance → ivory lines + glow + faint body */
  function ghostFrom(w, h, ax, ay, draw, ga = 1.4, gl = 2.6) {
    const src = E.canvas(w, h); src.x.translate(ax, ay); draw(src.x);
    const d = src.x.getImageData(0, 0, w, h).data, N = w * h, Al = new Float32Array(N), Lu = new Float32Array(N);
    for (let i = 0; i < N; i++) { const a = d[i * 4 + 3] / 255; Al[i] = a; Lu[i] = (a * (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2])) / 255; }
    const out = E.canvas(w, h), od = out.x.createImageData(w, h), o = od.data, hot = [];
    const sob = (F, i) => {
      const gx = -F[i - w - 1] - 2 * F[i - 1] - F[i + w - 1] + F[i - w + 1] + 2 * F[i + 1] + F[i + w + 1];
      const gy = -F[i - w - 1] - 2 * F[i - w] - F[i - w + 1] + F[i + w - 1] + 2 * F[i + w] + F[i + w + 1];
      return Math.sqrt(gx * gx + gy * gy);
    };
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, e = Math.max(sob(Al, i) * ga, sob(Lu, i) * gl * Math.min(1, Al[i] * 1.5 + 0.2));
      const v = Math.pow(clamp(e - 0.06), 0.85);
      o[i * 4] = 255; o[i * 4 + 1] = 246; o[i * 4 + 2] = 226; o[i * 4 + 3] = (v * 255) | 0;
      if (v > 0.9 && H(i, 7) < 0.012) hot.push([x - ax, y - ay]);
    }
    out.x.putImageData(od, 0, 0);
    const glow = E.canvas(Math.ceil(w / 2), Math.ceil(h / 2)); glow.x.filter = 'blur(5px)'; glow.x.drawImage(out.c, 0, 0, w / 2, h / 2); glow.x.drawImage(out.c, 0, 0, w / 2, h / 2);
    const fill = E.canvas(w, h); fill.x.filter = 'blur(6px)'; fill.x.drawImage(src.c, 0, 0); fill.x.filter = 'none'; fill.x.globalCompositeOperation = 'source-in';
    fill.x.fillStyle = E.lin(fill.x, 0, 0, 0, h, [[0, '#FFF6E0'], [1, '#FFD9A8']]); fill.x.fillRect(0, 0, w, h);
    const pts = []; for (let i = 0; i < hot.length && pts.length < 9; i += Math.max(1, Math.floor(hot.length / 9))) pts.push(hot[i]);
    return { line: out.c, glow: glow.c, fill: fill.c, w, h, ax, ay, pts };
  }
  function pomTreeArt(x) {
    // trunk
    x.fillStyle = '#6B4A32';
    x.beginPath(); x.moveTo(-14, 0); x.bezierCurveTo(-10, -60, -26, -110, -8, -150); x.lineTo(8, -150); x.bezierCurveTo(22, -110, 12, -60, 14, 0); x.closePath(); x.fill();
    x.lineWidth = 9; x.strokeStyle = '#6B4A32'; x.lineCap = 'round';
    x.beginPath(); x.moveTo(-4, -120); x.quadraticCurveTo(-50, -150, -80, -190); x.moveTo(4, -125); x.quadraticCurveTo(50, -150, 86, -200); x.moveTo(0, -145); x.lineTo(4, -215); x.stroke();
    // canopy as lobed crown
    const lobes = [[0, -240, 92], [-90, -215, 70], [90, -220, 72], [-130, -165, 52], [130, -170, 54], [-55, -290, 62], [60, -292, 64], [0, -175, 70]];
    x.fillStyle = '#3FA36B';
    for (const [lx, ly, r] of lobes) { x.beginPath(); x.arc(lx, ly, r, 0, TAU); x.fill(); }
    x.fillStyle = '#2F7D5B';
    for (const [lx, ly, r] of lobes) { x.beginPath(); x.arc(lx + r * 0.2, ly + r * 0.25, r * 0.55, 0, TAU); x.fill(); }
    // leaf fringe
    for (let i = 0; i < 46; i++) {
      const L = lobes[i % lobes.length], a = H(i, 3) * TAU, rr = L[2] * (0.95 + 0.1 * H(i, 4));
      x.save(); x.translate(L[0] + Math.cos(a) * rr, L[1] + Math.sin(a) * rr); x.rotate(a + PI / 2);
      x.fillStyle = '#4FB57A'; x.fill(S.petalPath(-22, 8, 0.75)); x.restore();
    }
    // fruits
    const fr = [[-70, -170, 21], [50, -160, 23], [-10, -215, 19], [100, -230, 18], [-110, -230, 17], [20, -290, 17], [-40, -130, 18]];
    for (const [fx, fy, r] of fr) { x.save(); x.translate(fx, fy); A.pomegranate(x, { r, t: 0 }); x.restore(); }
  }

  /* ---------- plan view (charbagh) geometry: girih 4.8.8 polygons, same maths as A.girih ---------- */
  const CELL = 120, GANG = (67.5 * PI) / 180, STAR_R = 480;
  function polyStar(cx, cy, n, ap, a0, th) {
    const half = PI / n, tn = Math.tan(half), sl = (ap * tn) / (Math.cos(th) + Math.sin(th) * tn);
    const px = ap - sl * Math.sin(th), py = sl * Math.cos(th), poly = [];
    for (let k = 0; k < n; k++) { const a = a0 + k * 2 * half, ca = Math.cos(a), sa = Math.sin(a); poly.push([cx + ap * ca, cy + ap * sa], [cx + px * ca - py * sa, cy + px * sa + py * ca]); }
    return poly;
  }
  function starOutline(r) { // Rub el Hizb outline (union of two squares), 16 vertices
    const pts = [], ri = r * Math.cos(PI / 4) / Math.cos(PI / 8);
    for (let i = 0; i < 16; i++) { const a = -PI / 2 + (i * PI) / 8 + PI / 8 * 0, rr = i % 2 ? ri : r; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    return pts;
  }
  const pathOf = (pts) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; };

  function buildPlan() {
    const K = 1.3, HW = 780, size = Math.round(HW * 2 * K), c = E.canvas(size, size), x = c.x;
    x.translate(size / 2, size / 2); x.scale(K, K);
    const star = pathOf(starOutline(STAR_R)), starIn = pathOf(starOutline(STAR_R - 14));
    // outer meadow, fading out
    x.fillStyle = x.createPattern(SPR.meadow, 'repeat'); x.fillRect(-HW, -HW, HW * 2, HW * 2);
    // 8 avenues from the star tips into the meadow, lined with cypress rows
    for (let i = 0; i < 8; i++) {
      const a = -PI / 2 + (i * PI) / 4, ca = Math.cos(a), sa = Math.sin(a), r0 = STAR_R - 10, r1 = HW + 20;
      x.lineCap = 'butt';
      x.strokeStyle = '#2A5446'; x.lineWidth = 34; x.beginPath(); x.moveTo(ca * r0, sa * r0); x.lineTo(ca * r1, sa * r1); x.stroke();
      x.strokeStyle = '#B88A5C'; x.lineWidth = 16; x.stroke(); x.strokeStyle = '#E2BC8A'; x.lineWidth = 12; x.stroke();
      for (let k = 0; k < 5; k++) for (const sd of [-1, 1]) {
        const rr = r0 + 40 + k * 56, px = ca * rr - sa * sd * 26, py = sa * rr + ca * sd * 26, tr = 8 + (k % 2) * 1.5;
        x.fillStyle = 'rgba(8,20,24,0.32)'; x.beginPath(); x.ellipse(px + tr * 1.3, py + tr * 1.05, tr * 1.7, tr * 0.65, 0.62, 0, TAU); x.fill();
        x.fillStyle = E.rad(x, px - tr * 0.35, py - tr * 0.35, 0, tr, [[0, '#4F9A6E'], [0.7, '#2C6650'], [1, '#1A4438']]); x.beginPath(); x.arc(px, py, tr, 0, TAU); x.fill();
      }
    }
    // scattered round trees and flower patches in the meadow
    for (let i = 0; i < 70; i++) {
      const a = H(i, 81) * TAU, r = STAR_R + 60 + H(i, 82) * (HW - STAR_R - 60), px = Math.cos(a) * r, py = Math.sin(a) * r;
      const ang = Math.atan2(py, px), da = Math.abs(((ang + PI / 2) % (PI / 4) + PI / 4) % (PI / 4) - PI / 8);
      if (da > PI / 8 - 0.12) continue; // keep the avenues clear
      if (H(i, 83) < 0.45) {
        const tr = 10 + H(i, 84) * 9;
        x.fillStyle = 'rgba(8,20,24,0.3)'; x.beginPath(); x.ellipse(px + tr * 1.2, py + tr, tr * 1.6, tr * 0.7, 0.62, 0, TAU); x.fill();
        x.fillStyle = E.rad(x, px - tr * 0.35, py - tr * 0.4, 0, tr, [[0, '#5AA77A'], [0.7, '#2F6E54'], [1, '#1D4A3C']]); x.beginPath(); x.arc(px, py, tr, 0, TAU); x.fill();
      } else {
        const cols = ['#FF6F91', '#FFB547', '#FFFFFF', '#A88BFF', '#FF7A3D'], col = cols[i % cols.length];
        for (let k = 0; k < 14; k++) { x.fillStyle = col; x.globalAlpha = 0.8; x.beginPath(); x.arc(px + (H(k, i + 90) - 0.5) * 40, py + (H(k, i + 91) - 0.5) * 26, 2 + H(k, i + 92) * 1.6, 0, TAU); x.fill(); }
        x.globalAlpha = 1;
      }
    }
    // meadow speckle + outer trees
    for (let i = 0; i < 900; i++) {
      const a = H(i, 11) * TAU, r = STAR_R * 0.75 + H(i, 12) * (HW - STAR_R * 0.75), px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (x.isPointInPath(star, size / 2 + px * K, size / 2 + py * K)) continue;
      x.fillStyle = E.rgba(H(i, 13) < 0.5 ? '#3D7A64' : '#1C3C3A', 0.5 * (1 - r / HW)); x.beginPath(); x.arc(px, py, 2 + H(i, 14) * 3, 0, TAU); x.fill();
    }
    // star-shaped garden: lawn
    x.save(); x.clip(star);
    x.fillStyle = E.rad(x, -120, -160, 0, 620, [[0, '#4C9474'], [0.6, '#3A7C62'], [1, '#2C6252']]); x.fillRect(-HW, -HW, HW * 2, HW * 2);
    // fine lawn texture
    for (let i = 0; i < 2200; i++) { const px = (H(i, 21) - 0.5) * 2 * STAR_R, py = (H(i, 22) - 0.5) * 2 * STAR_R; x.fillStyle = E.rgba(H(i, 23) < 0.5 ? '#6DB892' : '#2E6652', 0.35); x.fillRect(px, py, 1.6, 1.6); }
    // girih beds
    const n = Math.ceil(STAR_R / CELL) + 1, oct = [], sq = [];
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      oct.push({ poly: polyStar(i * CELL, j * CELL, 8, CELL / 2, 0, GANG), cx: i * CELL, cy: j * CELL });
      sq.push({ poly: polyStar((i + 0.5) * CELL, (j + 0.5) * CELL, 4, CELL * (0.5 - 0.5 / Math.SQRT2) * Math.SQRT2, PI / 4, GANG), cx: (i + 0.5) * CELL, cy: (j + 0.5) * CELL });
    }
    const BED = [['#FF4F7B', '#FF8FA8', '#C2185B'], ['#FF7A3D', '#FFB36B', '#E03C31'], ['#A88BFF', '#8E7CFF', '#C9B8FF'], ['#FFFFFF', '#FFD36E', '#FFF4F0'], ['#D9473A', '#FF6F91', '#FFB547']];
    // paths: sand strokes along every girih edge (drawn first, wide), then beds inset on top
    x.lineJoin = 'round'; x.lineCap = 'round';
    const allEdges = new Path2D(); for (const o of oct.concat(sq)) { const p = pathOf(o.poly); allEdges.addPath(p); }
    x.strokeStyle = '#B88A5C'; x.lineWidth = 12; x.stroke(allEdges);
    x.strokeStyle = '#EBC694'; x.lineWidth = 8.5; x.stroke(allEdges);
    x.strokeStyle = 'rgba(255,240,215,0.45)'; x.lineWidth = 2; x.stroke(allEdges);
    for (const o of oct) {
      const d = Math.hypot(o.cx, o.cy); if (d > STAR_R + CELL) continue;
      const p = pathOf(o.poly.map((q) => [o.cx + (q[0] - o.cx) * 0.9, o.cy + (q[1] - o.cy) * 0.9]));
      if (d < 1) { // central pool
        x.fillStyle = E.rad(x, 0, 0, 0, CELL * 0.5, [[0, '#E6FBFF'], [0.45, '#8FDCFF'], [1, '#3C8DB5']]); x.fill(p);
        x.strokeStyle = '#E8C8A0'; x.lineWidth = 4; x.stroke(p); continue;
      }
      const ring = Math.round(d / CELL), pal = BED[(ring - 1 + BED.length * 4) % BED.length];
      x.fillStyle = '#2C5E4E'; x.fill(p);
      x.strokeStyle = '#24503F'; x.lineWidth = 5; x.stroke(p);
      x.save(); x.clip(p);
      for (let k = 0; k < 210; k++) {
        const px = o.cx + (H(k, ring * 31 + o.cx) - 0.5) * CELL * 0.95, py = o.cy + (H(k, ring * 37 + o.cy + 5) - 0.5) * CELL * 0.95, r = 2.4 + H(k, 9 + o.cx) * 2.4;
        const col = pal[Math.floor(H(k, 3 + o.cy) * 3)];
        x.fillStyle = 'rgba(10,30,24,0.45)'; x.beginPath(); x.arc(px + 1.2, py + 1.4, r, 0, TAU); x.fill();
        x.fillStyle = col; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
        x.fillStyle = 'rgba(255,255,240,0.55)'; x.beginPath(); x.arc(px - r * 0.3, py - r * 0.35, r * 0.35, 0, TAU); x.fill();
      }
      x.restore();
    }
    for (const o of sq) { // little reflecting pools
      if (Math.hypot(o.cx, o.cy) > STAR_R + CELL) continue;
      const p = pathOf(o.poly.map((q) => [o.cx + (q[0] - o.cx) * 0.7, o.cy + (q[1] - o.cy) * 0.7]));
      x.fillStyle = E.lin(x, o.cx - 20, o.cy - 20, o.cx + 20, o.cy + 20, [[0, '#BDF0FF'], [0.5, '#7FCBEB'], [1, '#3F8FB8']]); x.fill(p);
      x.strokeStyle = 'rgba(232,200,160,0.9)'; x.lineWidth = 2.5; x.stroke(p);
    }
    x.restore();
    // star wall + shadow
    x.save(); x.translate(7, 9); x.strokeStyle = 'rgba(8,20,24,0.4)'; x.lineWidth = 18; x.stroke(star); x.restore();
    x.strokeStyle = '#B08A68'; x.lineWidth = 18; x.stroke(star);
    x.strokeStyle = '#EED3AE'; x.lineWidth = 12; x.stroke(star);
    x.strokeStyle = 'rgba(255,248,230,0.7)'; x.lineWidth = 2.5; x.stroke(starIn);
    // cypress at the 8 tips and 8 inner corners, with long dawn shadows (sun upper-left)
    const so = starOutline(STAR_R + 34);
    so.forEach((q, i) => {
      const r = i % 2 ? 11 : 15, px = i % 2 ? q[0] * 0.93 : q[0], py = i % 2 ? q[1] * 0.93 : q[1];
      x.save(); x.translate(px, py);
      x.fillStyle = 'rgba(8,20,24,0.35)'; x.beginPath(); x.ellipse(r * 1.6, r * 1.3, r * 2.0, r * 0.75, 0.62, 0, TAU); x.fill();
      x.fillStyle = E.rad(x, -r * 0.35, -r * 0.35, 0, r, [[0, '#4F9A6E'], [0.7, '#2C6650'], [1, '#1A4438']]); x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
      x.restore();
    });
    // dawn light: warm from upper-left, cool shade lower-right
    x.globalCompositeOperation = 'soft-light';
    x.fillStyle = E.rad(x, -140, -170, 0, 640, [[0, '#FFD98A', 0.7], [0.6, '#FFD98A', 0.25], [1, '#FFD98A', 0]]); x.fillRect(-HW, -HW, HW * 2, HW * 2);
    // soft circular edge (applied last so the soft-light never paints the transparent corners)
    x.globalCompositeOperation = 'destination-in';
    x.fillStyle = E.rad(x, 0, 0, 0, HW, [[0, '#000', 1], [0.86, '#000', 1], [1, '#000', 0]]); x.fillRect(-HW, -HW, HW * 2, HW * 2);
    x.globalCompositeOperation = 'source-over';
    SPR.plan = c.c; SPR.planK = K; SPR.planHW = HW;
  }

  /** seamless 512-unit meadow tile seen from above (ground of the crane shot and of the finale) */
  function buildMeadow() {
    const T = 512, c = E.canvas(T, T), x = c.x;
    const wrap = (px, py, r, fn) => { for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) { if (px + ox + r < 0 || px + ox - r > T || py + oy + r < 0 || py + oy - r > T) continue; x.save(); x.translate(px + ox, py + oy); fn(); x.restore(); } };
    x.fillStyle = '#2F6152'; x.fillRect(0, 0, T, T);
    for (let i = 0; i < 30; i++) {
      const px = H(i, 301) * T, py = H(i, 302) * T, r = 50 + H(i, 303) * 100, col = H(i, 304) < 0.5 ? '#3C7860' : '#244C43';
      wrap(px, py, r, () => { x.fillStyle = E.rad(x, 0, 0, 0, r, [[0, col, 0.6], [1, col, 0]]); x.fillRect(-r, -r, r * 2, r * 2); });
    }
    for (let i = 0; i < 1600; i++) { x.fillStyle = E.rgba(H(i, 311) < 0.55 ? '#6AB48C' : '#1F463D', 0.4); x.fillRect(H(i, 312) * T, H(i, 313) * T, 1.6, 1.6); }
    const FC = [['#FF6F91', '#FF9DB5'], ['#FFB547', '#FF7A3D'], ['#FFFFFF', '#FFD36E'], ['#A88BFF', '#C9B8FF'], ['#E03C31', '#FF7A3D']];
    for (let i = 0; i < 16; i++) {
      const px = H(i, 321) * T, py = H(i, 322) * T, pal = FC[i % FC.length];
      wrap(px, py, 40, () => { for (let k = 0; k < 18; k++) { const r = 1.8 + H(k, i + 330) * 1.8, fx = (H(k, i + 331) - 0.5) * 60, fy = (H(k, i + 332) - 0.5) * 34; x.fillStyle = 'rgba(10,30,24,0.35)'; x.beginPath(); x.arc(fx + 1, fy + 1.2, r, 0, TAU); x.fill(); x.fillStyle = pal[k % 2]; x.beginPath(); x.arc(fx, fy, r, 0, TAU); x.fill(); } });
    }
    for (let i = 0; i < 5; i++) {
      const px = H(i, 341) * T, py = H(i, 342) * T, tr = 11 + H(i, 343) * 7;
      wrap(px, py, tr * 3, () => {
        x.fillStyle = 'rgba(8,20,24,0.3)'; x.beginPath(); x.ellipse(tr * 1.2, tr, tr * 1.6, tr * 0.7, 0.62, 0, TAU); x.fill();
        x.fillStyle = E.rad(x, -tr * 0.35, -tr * 0.4, 0, tr, [[0, '#5AA77A'], [0.7, '#2F6E54'], [1, '#1D4A3C']]); x.beginPath(); x.arc(0, 0, tr, 0, TAU); x.fill();
      });
    }
    x.globalCompositeOperation = 'soft-light'; x.fillStyle = E.rgba('#FFD98A', 0.3); x.fillRect(0, 0, T, T); x.globalCompositeOperation = 'source-over';
    SPR.meadow = c.c; SPR.meadowPat = E.canvas(2, 2).x.createPattern(c.c, 'repeat');
  }
  /** standing trees / flowers for the crane shot (ground coords X, Z = −plan y) */
  function buildBillboards() {
    const mk = (w, h, draw) => {
      const c = E.canvas(w, h), hz = E.canvas(w, h); draw(c.x, w, h);
      hz.x.drawImage(c.c, 0, 0); hz.x.globalCompositeOperation = 'source-in'; hz.x.fillStyle = '#ECBA9C'; hz.x.fillRect(0, 0, w, h);
      return { c: c.c, hz: hz.c };
    };
    const cyp = mk(48, 200, (x, w, h) => {
      const p = new Path2D(); p.moveTo(w / 2, h - 6); p.bezierCurveTo(w * 0.02, h * 0.72, w * 0.08, h * 0.25, w / 2, 0); p.bezierCurveTo(w * 0.92, h * 0.25, w * 0.98, h * 0.72, w / 2, h - 6); p.closePath();
      x.fillStyle = '#4A3424'; x.fillRect(w / 2 - 3, h - 14, 6, 14);
      x.fillStyle = E.lin(x, 0, 0, w, 0, [[0, '#14372E'], [0.55, '#1F4F3E'], [1, '#2E6650']]); x.fill(p);
      x.save(); x.clip(p); x.strokeStyle = 'rgba(255,217,160,0.55)'; x.lineWidth = 3; x.stroke(p); x.restore();
    });
    const rnd = mk(96, 120, (x, w, h) => {
      x.fillStyle = '#4A3424'; x.fillRect(w / 2 - 4, h * 0.55, 8, h * 0.45);
      const p = new Path2D(); p.arc(w / 2, h * 0.42, w * 0.44, 0, TAU);
      x.fillStyle = E.rad(x, w * 0.62, h * 0.28, 0, w * 0.55, [[0, '#4F9A6E'], [0.6, '#2C6650'], [1, '#173F33']]); x.fill(p);
      x.save(); x.clip(p); x.strokeStyle = 'rgba(255,217,160,0.45)'; x.lineWidth = 3; x.stroke(p); x.restore();
    });
    const bb = [];
    for (let i = 0; i < 8; i++) { // avenue rows (as in the plan texture)
      const a = -PI / 2 + (i * PI) / 4, ca = Math.cos(a), sa = Math.sin(a);
      for (let k = 0; k < 5; k++) for (const sd of [-1, 1]) { const rr = STAR_R - 10 + 40 + k * 56, px = ca * rr - sa * sd * 26, py = sa * rr + ca * sd * 26; bb.push({ X: px, Z: -py, w: 20, h: 78 + (k % 2) * 10, spr: cyp }); }
    }
    starOutline(STAR_R + 34).forEach((q, i) => { const px = i % 2 ? q[0] * 0.93 : q[0], py = i % 2 ? q[1] * 0.93 : q[1]; bb.push({ X: px, Z: -py, w: i % 2 ? 22 : 26, h: i % 2 ? 80 : 96, spr: cyp }); });
    for (let i = 0; i < 70; i++) { // the plan texture's round trees
      const a = H(i, 81) * TAU, r = STAR_R + 60 + H(i, 82) * (780 - STAR_R - 60), px = Math.cos(a) * r, py = Math.sin(a) * r;
      const ang = Math.atan2(py, px), da = Math.abs((((ang + PI / 2) % (PI / 4)) + PI / 4) % (PI / 4) - PI / 8);
      if (da > PI / 8 - 0.12 || H(i, 83) >= 0.45) continue;
      const tr = 10 + H(i, 84) * 9; bb.push({ X: px, Z: -py, w: tr * 2.3, h: tr * 2.9, spr: rnd });
    }
    for (let i = 0; i < 170; i++) { // the wider landscape to the horizon
      const X = (H(i, 501) - 0.5) * 6400, Z = -2300 + H(i, 502) * 9000;
      if (Math.hypot(X, Z) < 860 || (Math.abs(X) < 520 && Z < -650)) continue;
      const cy = H(i, 503) < 0.55; bb.push({ X, Z, w: cy ? 24 + H(i, 504) * 10 : 44 + H(i, 504) * 24, h: cy ? 90 + H(i, 505) * 50 : 56 + H(i, 505) * 30, spr: cy ? cyp : rnd });
    }
    const FT = ['tulip', 'daisy', 'lavender', 'tulip', 'carnation', 'daisy', 'hyacinth'];
    for (let i = 0; i < 170; i++) { // near-field flowers (match the side view's meadow, sweep out under the camera)
      const X = (H(i, 601) - 0.5) * 2600, Z = -1520 + H(i, 602) * 980;
      bb.push({ X, Z, w: 26 + H(i, 603) * 16, h: 70, fl: FT[i % FT.length] });
    }
    SPR.bb = bb;
  }
  function drawCraneMotes(ctx, t) {
    const a = E.env(t, CR0, CR1, 0.2, 0.3); if (a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) { // soft warm bokeh drifting up past the lens as the camera pitches down
      const sp = 380 + H(i, 401) * 520, x0 = H(i, 402) * E.W, y = ((((H(i, 403) * 2300 - (t - CR0) * sp) % 2300) + 2300) % 2300) - 190;
      const r = 7 + H(i, 404) * 16, x = x0 + (x0 - 540) * 0.35 * (t - CR0), al = 0.22 * a * (0.5 + 0.5 * H(i, 405));
      ctx.fillStyle = E.rad(ctx, x, y, 0, r, [[0, '#FFF1D0', al], [0.6, '#FFD9A0', al * 0.45], [1, '#FFD9A0', 0]]); ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  function buildMisc() {
    // foreground leaves (plate units 1600×720, top-left at (-280,1420)); pre-blurred, half-res
    const fw = 800, fh = 360, tmp = E.canvas(fw * 2, fh * 2), l = tmp.x;
    const LEAVES = [[-30, 720, -0.62, 560, 120], [150, 730, -0.3, 430, 96], [300, 740, 0.05, 280, 70], [1600, 700, 0.66, 560, 126], [1430, 730, 0.34, 420, 98], [1290, 740, 0.02, 290, 72], [700, 760, -0.05, 170, 54], [930, 760, 0.12, 200, 58]];
    for (const [lx, ly, a, len, w] of LEAVES) {
      l.save(); l.translate(lx, ly); l.rotate(a);
      const p = S.petalPath(-len, w, 0.72);
      l.fillStyle = E.lin(l, -w, 0, w, 0, [[0, '#1E4446'], [0.5, '#122C2E'], [1, '#0A1A1C']]); l.fill(p);
      l.strokeStyle = 'rgba(70,120,110,0.5)'; l.lineWidth = 5; l.beginPath(); l.moveTo(0, 0); l.quadraticCurveTo(w * 0.06, -len * 0.5, 0, -len * 0.92); l.stroke();
      l.restore();
    }
    // a few dark tulip silhouettes on the left
    for (const [tx, ty, s] of [[90, 470, 1], [230, 520, 0.8]]) {
      l.strokeStyle = '#10282A'; l.lineWidth = 7 * s; l.beginPath(); l.moveTo(tx, 760); l.quadraticCurveTo(tx + 10, ty + 150, tx + 4, ty); l.stroke();
      l.save(); l.translate(tx + 4, ty); l.scale(s, s); l.fillStyle = '#3A1A26'; l.beginPath(); l.moveTo(-26, 0); l.quadraticCurveTo(-30, -50, -10, -70); l.lineTo(0, -40); l.lineTo(10, -70); l.quadraticCurveTo(30, -50, 26, 0); l.quadraticCurveTo(0, 18, -26, 0); l.fill(); l.restore();
    }
    const fg = E.canvas(fw, fh); fg.x.filter = 'blur(4px)'; fg.x.drawImage(tmp.c, 0, 0, fw, fh); SPR.fg = fg.c;
    // cloud strands (pre-blurred) for the originals
    const cw = 900, ch = 220, cl = E.canvas(cw, ch);
    for (let i = 0; i < 16; i++) {
      const wx = 90 + H(i, 5) * 720, wy = 95 + (H(i, 6) - 0.5) * 70, rx = 90 + H(i, 7) * 150, ry = 9 + H(i, 8) * 16;
      cl.x.save(); cl.x.translate(wx, wy); cl.x.scale(1, ry / rx);
      cl.x.fillStyle = E.rad(cl.x, 0, 0, 0, rx, [[0, i % 3 ? '#FFD2B0' : '#F0A8A0', 0.55], [0.6, '#E8A0A0', 0.25], [1, '#C9708A', 0]]);
      cl.x.beginPath(); cl.x.arc(0, 0, rx, 0, TAU); cl.x.fill(); cl.x.restore();
    }
    SPR.cloud = cl.c;
  }

  /* =============================================================================
   * SIDE VIEW COMPONENTS
   * ============================================================================= */
  function hillClip(ctx, cs, li) {
    const s = STRATA[li], p = new Path2D(); let first = null, last = null;
    for (let x = -900; x <= 1980; x += 30) { const q = toS(cs, x, hillY(x, s), s[4]); if (!first) { first = q; p.moveTo(q[0], q[1]); } else p.lineTo(q[0], q[1]); last = q; }
    p.lineTo(last[0], -3000); p.lineTo(first[0], -3000); p.closePath();
    ctx.clip(p);
  }

  function drawSun(ctx, t, cs, sun, g) {
    const { x, y, r } = sun;
    // atmospheric bloom that bleeds over the crests
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = E.rad(ctx, x, y + 20, 0, 520, [[0, '#FFD98A', 0.42], [0.3, '#FFC98F', 0.16], [1, '#FFC98F', 0]]); ctx.fillRect(x - 520, y - 500, 1040, 1040);
    ctx.restore();
    ctx.save(); hillClip(ctx, cs, 0); hillClip(ctx, cs, 1);
    ctx.globalCompositeOperation = 'screen';
    const pulse = 1 + 0.03 * Math.sin(t * 2.1);
    ctx.fillStyle = E.rad(ctx, x, y, r * 0.8, 300 * pulse, [[0, '#FFD98A', 0.85], [0.25, '#FFD98A', 0.42], [0.6, '#FFC98F', 0.12], [1, '#FFC98F', 0]]); ctx.fillRect(x - 320, y - 320, 640, 640);
    // crepuscular rays (after the sun clears the hills)
    const kr = P(t, 62.2, 63.0);
    if (kr > 0) S.rays(ctx, x, y, { n: 13, len: 1150, angle: -PI / 2, spread: 2.9, col: '#FFE7B0', alpha: (0.07 - 0.025 * P(t, 63.6, 64.4)) * kr, t, width: 0.022, seed: 5 });
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = E.rad(ctx, x - r * 0.28, y - r * 0.3, 0, r * 1.02, [[0, '#FFFFFF'], [0.55, '#FFF8E6'], [0.85, '#FFF4D6'], [1, '#FFE2AE']]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    // thin haze bands across the low sun (fade as it climbs)
    const hb = 1 - P(t, 62.1, 63.2);
    if (hb > 0) {
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
      for (let i = 0; i < 3; i++) { const yy = y + r * (0.15 + i * 0.27) + Math.sin(t * 0.8 + i) * 3; ctx.fillStyle = E.rgba('#E89A86', (0.35 - i * 0.07) * hb); ctx.fillRect(x - r, yy, r * 2, 5 + i * 3); }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawMosque(ctx, t, cs) {
    ctx.save();
    // hide the base behind the meadow's far edge (A.garden meadow top line, parallax 1)
    const mp = new Path2D(); let f0 = null;
    for (let x = 560; x <= 1060; x += 20) { const q = toS(cs, x, HZ + 30 + 14 * Math.sin(x * 0.004 + 1) + 8 * Math.sin(x * 0.011), 1); if (!f0) { f0 = q; mp.moveTo(q[0], q[1]); } else mp.lineTo(q[0], q[1]); }
    mp.lineTo(toS(cs, 1060, 0, 1)[0], -2000); mp.lineTo(f0[0], -2000); mp.closePath(); ctx.clip(mp);
    layerXf(ctx, cs, 0.45);
    const MY = 1046;
    const rim = P(t, W.sukur - 0.25, W.sukur + 0.5, 'inOutSine');
    E.at(ctx, 806, MY, 1, 0, () => A.mosque(ctx, { w: 220, col: E.mix('#2A2140', skyAt(930), 0.14), dome: '#3E8E5E', rim, sun: -1, lights: lerp(0.32, 0.12, P(t, 62.4, 64.5)), rimCol: '#FFC98F', t }));
    // first light touching the dome
    if (rim > 0) S.light(ctx, 806 + 70 * 220 / 700 - 4, MY - 46 * 220 / 700 - 40 * 220 / 700, 46, '#FFE7B0', 0.35 * rim * (0.85 + 0.15 * Math.sin(t * 3)));
    ctx.restore();
  }

  // originals in the sky (plate coords, parallax .1)
  const ORIG = { rose: [540, 472, 176], tree: [205, 600], bowl: [868, 520] };
  function drawGhost(ctx, g, x, y, s, a, t, seed) {
    if (a <= 0.005) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.globalAlpha = a * 0.14; ctx.drawImage(g.fill, -g.ax, -g.ay);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * 0.8; ctx.drawImage(g.glow, -g.ax, -g.ay, g.w, g.h);
    ctx.globalAlpha = a; ctx.drawImage(g.line, -g.ax, -g.ay);
    ctx.globalAlpha = 1; A.glints(ctx, t, { pts: g.pts, r: 11, col: '#FFF6E0', period: 2.2, duty: 0.35, seed, alpha: Math.min(1, a * 2) });
    ctx.restore();
  }
  function drawOriginals(ctx, t, cs, k, arrive) {
    if (k <= 0.004) return;
    const br = 1 + 0.012 * Math.sin(TAU * t / 3.4);
    const [rx, ry, rz] = toS(cs, ORIG.rose[0], ORIG.rose[1], 0.1);
    const [tx, ty, tz] = toS(cs, ORIG.tree[0], ORIG.tree[1], 0.1);
    const [bx, by, bz] = toS(cs, ORIG.bowl[0], ORIG.bowl[1], 0.1);
    // soft halo behind them
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = E.rad(ctx, rx, ry - 60, 0, 420, [[0, '#FFE7C8', 0.2 * k + 0.16 * arrive], [1, '#FFE7C8', 0]]); ctx.fillRect(rx - 420, ry - 480, 840, 840);
    ctx.restore();
    const a = 0.3 * k + 0.25 * arrive;
    drawGhost(ctx, SPR.gTree, tx, ty + Math.sin(t * 0.7) * 4, tz * 0.95 * br, a * 0.9, t, 3);
    drawGhost(ctx, SPR.gBowl, bx, by + Math.sin(t * 0.6 + 1) * 4, bz * br, a * 0.9, t, 5);
    ctx.save(); ctx.translate(rx, ry + Math.sin(t * 0.55 + 2) * 3); ctx.scale(rz * br, rz * br);
    ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(SPR.gRose.c, -SPR.gRose.ax, -SPR.gRose.ay);
    ctx.globalAlpha = Math.min(1, a * 1.6); A.glints(ctx, t, { pts: [[-90, -70], [70, -110], [120, -10], [-130, 10], [10, -150], [30, 30]], r: 13, col: '#FFF6E0', period: 2.0, duty: 0.3, seed: 9 });
    ctx.restore();
    // cloud strands drifting through the lower parts
    ctx.save(); ctx.globalAlpha = 0.55 * k;
    for (const [px, py, sp, sc] of [[-200, 640, 9, 1], [300, 700, -6, 0.8], [560, 585, 7, 0.9]]) {
      const [cx, cy, cz] = toS(cs, px + ((t * sp) % 600), py, 0.12);
      ctx.drawImage(SPR.cloud, cx, cy - 110 * cz * sc, 900 * cz * sc, 220 * cz * sc);
    }
    ctx.restore();
  }

  // light-path ribbon: [x, y, parallax, width]
  const RIB = [[470, 1212, 1, 44], [556, 1144, 1, 32], [612, 1098, 0.97, 20], [600, 985, 0.75, 13], [452, 832, 0.45, 10], [338, 668, 0.24, 9], [372, 545, 0.14, 9], [478, 470, 0.11, 10], [540, 448, 0.1, 6]];
  function ribbonGeom(cs) {
    const ctrl = RIB.map(([x, y, p, w]) => { const s = toS(cs, x, y, p); return [s[0], s[1], w * s[2]]; });
    const pts = crSample(ctrl, 12), cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1];
    const at = (s) => {
      const d = clamp(s) * L; let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
      const a = pts[i - 1], b = pts[i], u = clamp((d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]));
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      return { x: a[0] + dx * u, y: a[1] + dy * u, w: a[2] + (b[2] - a[2]) * u, nx: -dy / l, ny: dx / l, tx: dx / l, ty: dy / l };
    };
    return { pts, cum, L, at };
  }
  function drawRibbon(ctx, t, rg, f, g) {
    if (f <= 0.002) return;
    const N = 90, L = [], R = [], C = [];
    for (let i = 0; i <= N; i++) { const q = rg.at((i / N) * f); const w = q.w * (0.75 + 0.25 * Math.sin(i * 0.4 - t * 3)) * 0.5 + q.w * 0.5; L.push([q.x + q.nx * w * 0.5, q.y + q.ny * w * 0.5]); R.push([q.x - q.nx * w * 0.5, q.y - q.ny * w * 0.5]); C.push([q.x, q.y, q.w]); }
    const s0 = C[0], s1 = C[C.length - 1];
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // wide glow (chunks with decreasing width)
    ctx.globalCompositeOperation = 'lighter';
    for (let c = 0; c < 6; c++) {
      const a0 = Math.floor((c / 6) * N), a1 = Math.floor(((c + 1) / 6) * N);
      ctx.beginPath(); for (let i = a0; i <= a1; i++) i === a0 ? ctx.moveTo(C[i][0], C[i][1]) : ctx.lineTo(C[i][0], C[i][1]);
      const w = C[Math.floor((a0 + a1) / 2)][2];
      ctx.strokeStyle = E.rgba('#FFC98F', 0.055); ctx.lineWidth = w * 3.4 + 30; ctx.stroke();
      ctx.strokeStyle = E.rgba('#FFE0A8', 0.09); ctx.lineWidth = w * 1.7 + 8; ctx.stroke();
    }
    // body
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = E.lin(ctx, s0[0], s0[1], s1[0], s1[1], [[0, '#FFE7B0', 0.72], [1, '#FFFFFF', 0.85]]);
    ctx.beginPath(); L.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath(); ctx.fill();
    // bright edges + core with upward flow
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = E.rgba('#FFF6E0', 0.55); ctx.lineWidth = 1.6;
    for (const side of [L, R]) { ctx.beginPath(); side.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); }
    ctx.beginPath(); C.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.setLineDash([12, 30]); ctx.lineDashOffset = -t * 150; ctx.strokeStyle = E.rgba('#FFFFFF', 0.85); ctx.lineWidth = 2.6; ctx.stroke(); ctx.setLineDash([]);
    // draw-on head
    if (f < 1) { S.light(ctx, s1[0], s1[1], 70, '#FFE7B0', 0.8); S.sparkle(ctx, s1[0], s1[1], 22, 1, '#FFFFFF', t * 2); }
    // lift-off glow pool on the path
    const lp = rg.at(0.16);
    S.light(ctx, lp.x, lp.y, 120, '#FFE0A8', 0.35 * Math.min(1, f * 4) * bandAtt(lp.y, g));
    ctx.restore();
  }

  function drawPetal(ctx, x, y, sz, rot, flip, col, a, light) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, 0.22 + 0.78 * Math.abs(flip)); ctx.translate(0, -sz * 0.5); ctx.globalAlpha = a;
    const p = petalShape(sz);
    if (light) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = E.rad(ctx, 0, sz * 0.5, 0, sz * 0.9, [[0, '#FFFFFF', 0.95], [0.5, col, 0.6], [1, col, 0]]); ctx.fill(p); }
    else {
      const back = flip < 0;
      ctx.fillStyle = E.lin(ctx, 0, 0, 0, sz, [[0, E.shade(col, back ? -0.35 : -0.18)], [0.55, back ? E.shade(col, -0.12) : col], [1, E.shade(col, back ? 0.05 : 0.3)]]); ctx.fill(p);
      ctx.fillStyle = E.rgba('#FFF4E0', back ? 0.06 : 0.22); ctx.beginPath(); ctx.ellipse(-sz * 0.12, sz * 0.62, sz * 0.12, sz * 0.26, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // petals/pollen/butterflies rising along the path
  const PETAL_COLS = ['#FF4F7B', '#FF8FA8', '#FF6F91', '#FFB3C4', '#FF7A3D', '#FFF4F0'];
  function riser(t, rg, cs, i, seed, ts, dur, ox, oy, op) {
    const u = (t - ts) / dur; if (u <= 0 || u >= 1.04) return null;
    const e = 0.45 * E.ease.inOutSine(clamp(u)) + 0.55 * clamp(u), o = toS(cs, ox, oy, op);
    const s0 = 0.1 + 0.1 * H(i, seed + 1), q = rg.at(lerp(s0, 1, e));
    const join = sm(clamp(e / 0.28));
    const hel = Math.sin(TAU * (e * (1.2 + H(i, seed + 2)) + H(i, seed + 3))) * (22 + 46 * (1 - e)) * (0.6 + 0.4 * H(i, seed + 4));
    const x = lerp(o[0], q.x + q.nx * hel, join), y = lerp(o[1], q.y + q.ny * hel, join) - Math.sin(PI * clamp(e / 0.28)) * 30 * (1 - join);
    return { x, y, e, z: lerp(o[2], q.w / 22, join), a: sm(u / 0.08) * (1 - sm((u - 0.9) / 0.12)) };
  }
  function drawRisers(ctx, t, cs, rg, g) {
    if (t < 64.55) return;
    // pollen (glowing motes)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 48; i++) {
      const ts = 64.58 + H(i, 51) * 1.6, r = riser(t, rg, cs, i, 50, ts, 1.3 + H(i, 52) * 0.6, 380 + H(i, 53) * 420, 1110 + H(i, 54) * 90, 1);
      if (!r) continue;
      const rr = (1.6 + H(i, 55) * 2.2) * Math.max(0.5, r.z), a = r.a * bandAtt(r.y, g);
      ctx.fillStyle = E.rad(ctx, r.x, r.y, 0, rr * 4, [[0, '#FFF6D8', a], [0.3, '#FFE08A', a * 0.5], [1, '#FFE08A', 0]]); ctx.fillRect(r.x - rr * 4, r.y - rr * 4, rr * 8, rr * 8);
    }
    ctx.restore();
    // garden petals
    for (let i = 0; i < 46; i++) {
      const ts = W.tesvik - 0.12 + Math.pow(H(i, 61), 1.3) * 1.25, r = riser(t, rg, cs, i, 60, ts, 1.55 + H(i, 62) * 0.7, 380 + H(i, 63) * 380, 1105 + H(i, 64) * 90, 1);
      if (!r) continue;
      const sz = (19 + H(i, 65) * 12) * lerp(1, 0.55, r.e) * Math.max(0.6, cs.cam.zoom);
      const rot = H(i, 66) * TAU + t * (H(i, 67) - 0.5) * 3 + Math.sin(t * 2 + i) * 0.6, flip = Math.cos(t * (2 + H(i, 68) * 2) + i);
      const light = i % 6 === 0;
      drawPetal(ctx, r.x, r.y, sz, rot, flip, light ? '#FFE7B0' : PETAL_COLS[i % PETAL_COLS.length], r.a * bandAtt(r.y, g), light);
      if (r.e > 0.93) S.sparkle(ctx, r.x, r.y, 9, (r.e - 0.93) * 12 * r.a, '#FFF6E0');
    }
  }
  function drawRosePetals(ctx, t, cs, rg, rosePos, g) {
    if (t < W.tesvik - 0.15) return;
    for (let i = 0; i < 7; i++) {
      const ts = W.tesvik - 0.1 + i * 0.12, dur = 1.8 + 0.1 * i, u = (t - ts) / dur;
      if (u <= 0 || u >= 1.04) continue;
      const e = E.ease.inOutSine(clamp(u)), off = [[-60, -40], [55, -55], [-20, -80], [80, -10], [-85, 5], [30, -90], [70, -60]][i];
      const ox = rosePos[0] + off[0] * rosePos[2], oy = rosePos[1] + off[1] * rosePos[2];
      const q = rg.at(lerp(0.08 + 0.03 * i, 1, e)), join = sm(clamp(e / 0.3));
      const hel = Math.sin(TAU * (e * 1.6 + i * 0.21)) * (30 + 40 * (1 - e));
      const x = lerp(ox, q.x + q.nx * hel, join), y = lerp(oy, q.y + q.ny * hel, join) - Math.sin(PI * clamp(e / 0.3)) * 40 * (1 - join);
      const sc = rosePos[2] * lerp(0.48, 0.26, e), a = sm(u / 0.06) * (1 - sm((u - 0.9) / 0.12)) * bandAtt(y, g);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
      A.heroPetal(ctx, { R: 116 * sc, t, flip: Math.cos(t * 2.4 + i * 1.7), rot: i * 1.3 + t * (i % 2 ? 1.1 : -0.9) });
      ctx.restore();
      if (e > 0.93) S.sparkle(ctx, x, y, 12, (e - 0.93) * 12, '#FFF6E0');
    }
  }
  const BFLY = [[668, 1150, 'swallowtail', 64.7], [742, 1200, 'monarch', 64.84], [250, 1186, 'sapphire', 64.98]];
  function drawButterflies(ctx, t, cs, rg, g) {
    BFLY.forEach(([bx, by, pat, ts], i) => {
      const dur = 2.3, u = (t - ts) / dur;
      if (u >= 1.03) return;
      const rest = toS(cs, bx, by, 1);
      let x = rest[0], y = rest[1], size = 22 * rest[2], rot = -0.35 + 0.7 * i / 2 + Math.sin(t * 0.7 + i) * 0.08, flap, a = 1;
      if (u <= 0) { flap = 0.3 + 0.35 * E.osc(t, 1.6 + i * 0.3, i * 0.3); }
      else {
        const pos = (uu) => {
          const e = E.ease.inOutSine(clamp(uu)), q = rg.at(lerp(0.12, 0.99, e)), join = sm(clamp(e / 0.3));
          const hel = Math.sin(TAU * (e * 1.4 + i * 0.33)) * 46 * (1 - e) * q.w / 18;
          return [lerp(rest[0], q.x + q.nx * hel, join), lerp(rest[1], q.y + q.ny * hel, join) - Math.sin(PI * clamp(e / 0.3)) * 50 * (1 - join), e, q.w];
        };
        const p0 = pos(u), p1 = pos(u + 0.012);
        x = p0[0]; y = p0[1]; size = lerp(22 * rest[2], 9, Math.pow(p0[2], 0.8)); rot = Math.atan2(p1[0] - p0[0], -(p1[1] - p0[1])) * 0.85;
        flap = undefined; a = 1 - sm((u - 0.88) / 0.14);
      }
      ctx.save(); ctx.globalAlpha = a * bandAtt(y, g); E.at(ctx, x, y, 1, 0, () => A.butterfly(ctx, { size, t, pattern: pat, flap, hz: 5.2, phase: i * 1.3, rot }));
      ctx.restore();
    });
  }

  function drawRose(ctx, t, cs, bowK) {
    const [x, y, z] = toS(cs, 365, 1405, 1), revive = P(t, 61.85, 62.8, 'inOutSine');
    let head = null;
    E.at(ctx, x, y, z, 0, () => {
      const tip = A.stem(ctx, { len: 318, t, bend: 0.05 + 0.3 * bowK, leaves: 2, thorns: 4, width: 9, wilt: 0.35 * (1 - revive), phase: 0.6 });
      E.at(ctx, tip.x, tip.y, 1, tip.angle + 0.24 * bowK, () => {
        A.heroRose(ctx, { R: 116, bloom: lerp(0.84, 1, revive), wilt: 0.38 * (1 - revive), t, light: -1.15 });
        A.glints(ctx, t, { pts: [[-46, -48], [38, -66], [66, -18], [-74, -6], [8, -92], [-20, 18]], r: 9, col: '#FFE7B5', period: 1.7, duty: 0.4, alpha: revive, seed: 13 });
      });
      head = [x + tip.x * z, y + (tip.y - 50) * z, z];
    });
    return head;
  }
  function drawHoopoe(ctx, t, cs) {
    const [bx, by, z] = toS(cs, 872, 1172, 1.02);
    const bow = 0.95 * E.env(t, W.sukur - 0.05, 63.65, 0.38, 0.75) + 0.12 * E.env(t, 61.8, 62.35, 0.2, 0.2);
    const fan = 0.22 + 0.78 * E.ease.outBack(P(t, W.tesvik - 0.12, W.tesvik + 0.32)) * (1 - 0.45 * P(t, 65.3, 66.0)) + 0.3 * E.env(t, 62.2, 62.7, 0.12, 0.3);
    E.at(ctx, bx, by, z, 0, () => {
      // branch from the right edge
      ctx.fillStyle = E.lin(ctx, 0, -10, 0, 30, [[0, '#7A5A40'], [0.5, '#5A3E2A'], [1, '#2E2018']]);
      ctx.beginPath(); ctx.moveTo(-46, 4); ctx.bezierCurveTo(40, -2, 140, 30, 260, 120); ctx.lineTo(260, 146); ctx.bezierCurveTo(140, 50, 40, 14, -46, 10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,150,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-40, 4); ctx.bezierCurveTo(40, -1, 140, 31, 255, 119); ctx.stroke();
      for (const [lx, ly, a, len] of [[30, 2, -2.2, 46], [110, 20, -1.2, 52], [170, 52, -2.5, 40], [-30, 6, -1.0, 36]]) {
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(a + 0.06 * Math.sin(t * 1.5 + lx)); S.leaf(ctx, len, len * 0.32, '#2F7A5E'); ctx.restore();
      }
      A.hoopoe(ctx, { size: 44, t, fan, pose: bow, flip: true });
    });
  }

  function drawWind(ctx, t, g) {
    const k = E.env(t, W.tesvik - 0.15, 65.7, 0.25, 0.6);
    if (k <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const t0 = W.tesvik - 0.15 + H(i, 71) * 0.7, u = (t - t0) / 0.9; if (u <= 0 || u >= 1) continue;
      const y0 = 1180 - H(i, 72) * 520, x0 = -200 + u * 1500, len = 220 + H(i, 73) * 160;
      ctx.beginPath();
      for (let s = 0; s <= 12; s++) { const xx = x0 - len + (s / 12) * len, yy = y0 - (xx - 300) * 0.22 + Math.sin(xx * 0.01 + i) * 18; s ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.strokeStyle = E.rgba('#FFF1D0', 0.3 * k * Math.sin(PI * u) * bandAtt(y0, g)); ctx.lineWidth = 2.6; ctx.stroke();
    }
    ctx.restore();
  }

  function drawShaft(ctx, t, sun, g) {
    const k = P(t, W.sukur - 0.15, W.sukur + 0.6, 'outCubic');
    if (k <= 0) return;
    const len = 1300 * k, x0 = sun.x, y0 = sun.y + sun.r * 0.4, ang = PI / 2 + 0.13, x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    E.layer(ctx, (l) => {
    const ctx = l;
    const gr = ctx.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, E.rgba('#FFE7B0', 0.34)); gr.addColorStop(0.45, E.rgba('#FFE7B0', 0.16)); gr.addColorStop(Math.min(1, (1229 - y0) / Math.max(1, y1 - y0)), E.rgba('#FFE7B0', 0.09 * (1 - 0.6 * g))); gr.addColorStop(1, E.rgba('#FFE7B0', 0));
    ctx.fillStyle = gr;
    const w0 = sun.r * 0.5, w1 = 120 + 160 * k, nx = -Math.sin(ang), ny = Math.cos(ang);
    ctx.beginPath(); ctx.moveTo(x0 + nx * w0, y0 + ny * w0); ctx.lineTo(x1 + nx * w1, y1 + ny * w1); ctx.lineTo(x1 - nx * w1 * 0.6, y1 - ny * w1 * 0.6); ctx.lineTo(x0 - nx * w0, y0 - ny * w0); ctx.closePath(); ctx.fill();
    }, { lo: true, blur: 34, op: 'screen' });
  }

  /** "şükür": a ring of warm light sweeps outward over the meadow in step with the bow ripple */
  function drawGratitudeWave(ctx, t, cs, g) {
    const k0 = W.sukur - 0.1, u = (t - k0) / 1.15;
    if (u <= 0 || u >= 1) return;
    const R = (u * 1.15 / (0.9 * 0.75)) * 1400, c = toS(cs, 540, 830, 1), a = Math.sin(PI * Math.min(1, u * 1.6)) * (1 - u);
    ctx.save();
    const mp = new Path2D(); let f0 = null;
    for (let x = -200; x <= 1280; x += 40) { const q = toS(cs, x, HZ + 34 + 14 * Math.sin(x * 0.004 + 1) + 8 * Math.sin(x * 0.011), 1); if (!f0) { f0 = q; mp.moveTo(q[0], q[1]); } else mp.lineTo(q[0], q[1]); }
    mp.lineTo(2000, 3000); mp.lineTo(-1000, 3000); mp.closePath(); ctx.clip(mp);
    ctx.globalCompositeOperation = 'screen';
    const w = 150 + 120 * u, r0 = Math.max(0, R - w), r1 = R + w * 0.4;
    ctx.fillStyle = E.rad(ctx, c[0], c[1], r0, r1, [[0, '#FFE7B0', 0], [0.72, '#FFE7B0', 0.42 * a * (1 - 0.6 * g)], [1, '#FFE7B0', 0]]);
    ctx.fillRect(0, 0, E.W, E.H);
    ctx.restore();
  }

  /* ---------------- the whole side view ---------------- */
  function drawSide(ctx, t, crane) {
    const cs = camAt(t), sun = sunAt(t, cs), g = glossK(t);
    // garden's own sun parked 330 px under ours (glow from below the crest, disc hidden by the hills)
    const z04 = 1 + (cs.cam.zoom - 1) * 0.04, ky04 = 960 + (cs.cam.y - 960) * 0.04;
    const gSunY = ky04 + (sun.y + 330 - cs.cy) / z04;
    const k0 = W.sukur - 0.1;
    const bowFn = (x, y) => {
      const d = (Math.hypot(x - 540, y - 830) / 1400) * 0.9 * 0.75;
      const b = E.ease.outBack(clamp((t - k0 - d) / 0.62), 1.6);
      const hold = lerp(1, 0.8 + 0.07 * Math.sin(t * 1.6 + x * 0.013), P(t, k0 + d + 0.5, k0 + d + 1.3));
      const swing = 1 - 0.3 * P(t, 64.6, 65.2, 'inOutSine') + 0.25 * E.env(t, W.tesvik - 0.1, 65.6, 0.2, 0.6) * Math.sin(t * 5 + x * 0.01);
      return 1.7 * b * hold * swing;
    };
    A.garden(ctx, t, { palette: 'J', cx: cs.cx, cy: cs.cy, cam: cs.cam, sunX: 540, sunY: gSunY, bow: bowFn, fg: false, flowers: 180, span: [-200, 1280] });
    drawSun(ctx, t, cs, sun, g);
    // originals + ribbon
    const kO = P(t, W.usul - 0.1, W.usul + 0.55, 'inOutSine'), ribF = P(t, 63.75, 64.65, 'inOutSine');
    const arrive = E.env(t, 64.55, 66.4, 0.25, 1.2) * 0.6 + P(t, 64.55, 64.9) * 0.4;
    drawOriginals(ctx, t, cs, kO, arrive);
    drawMosque(ctx, t, cs);
    drawShaft(ctx, t, sun, g);
    const rg = ribbonGeom(cs);
    drawRibbon(ctx, t, rg, ribF, g);
    // dust motes floating in the sunlight
    S.dust(ctx, t, { n: 34, x: 0, y: 260, w: 1080, h: 900, col: '#FFE7B0', rMin: 0.9, rMax: 2.4, speed: 12, alpha: 0.45, seed: 17 });
    drawGratitudeWave(ctx, t, cs, g);
    // near layers: during the crane they drop out under the camera (instead of riding up with the sky)
    const nearLayers = (c) => {
      const rosePos = drawRose(c, t, cs, Math.min(1, bowFn(380, 1080) / 1.6));
      drawHoopoe(c, t, cs);
      drawButterflies(c, t, cs, rg, g);
      drawRosePetals(c, t, cs, rg, rosePos, g);
      drawWind(c, t, g);
      const [fx, fy, fz] = toS(cs, -280, 1300, 1.9); // blurred foreground leaves (parallax 1.9)
      c.drawImage(SPR.fg, fx + Math.sin(t * 0.9) * 6, fy + Math.sin(t * 1.1 + 1) * 4, 1600 * fz, 720 * fz);
    };
    if (!crane) nearLayers(ctx);
    else {
      const na = 1 - sm(crane.k / 0.3);
      if (na > 0.01) { const m = ctx.getTransform(); E.layer(ctx, (l) => { l.setTransform(m); l.translate(0, -crane.dy + 520 * crane.k * crane.k + 160 * crane.k); nearLayers(l); }, { alpha: na }); }
    }
    drawRisers(ctx, t, cs, rg, g);
    // grade + band scrim
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = E.rgba('#FF9A6A', 0.12); ctx.fillRect(0, 0, E.W, E.H); ctx.restore();
    if (g > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = E.lin(ctx, 0, 1100, 0, 1760, [[0, '#6E5C80', 0], [0.22, '#6E5C80', 0.42 * g], [0.72, '#6E5C80', 0.42 * g], [1, '#6E5C80', 0]]); ctx.fillRect(0, 1100, E.W, 660);
      ctx.restore();
    }
    if (g > 0) { ctx.save(); ctx.translate(540, 1400); ctx.scale(1, 220 / 640); ctx.fillStyle = E.rad(ctx, 0, 0, 0, 640, [[0, '#080612', 0.16 * g], [1, '#080612', 0]]); ctx.fillRect(-640, -640, 1280, 1280); ctx.restore(); }
    return { cs, sun };
  }

  /* =============================================================================
   * PLAN VIEW (crane-over + finale)
   * Ground coords: garden centre at the origin, X right, Z forward (= −plan y). One pinhole camera
   * (focal 1500, height h, ground position c, pitch φ) is flown from the side view's eye line
   * (looking 17° up at the originals) to directly above the garden; c is solved each frame so the
   * garden glides monotonically from the bottom edge to (540,800) while the sky/sun stay above the
   * horizon for the first half of the move.
   * ============================================================================= */
  const ROS_COLS = ['#FF4F7B', '#FFB547', '#7FE0D2', '#B47CFF', '#6FF0FF', '#FFAE42', '#2FBF7F'];
  const CR0 = 66.28, CR1 = 66.98, FOC = 1500;
  let HS = null;
  function sideHorizon(cs) { return toS(cs, 540, HZ + 30 + 14 * Math.sin(540 * 0.004 + 1) + 8 * Math.sin(540 * 0.011), 1)[1]; }
  function craneCam(t) {
    if (HS === null) HS = sideHorizon(camAt(CR0));
    const u = clamp((t - CR0) / (CR1 - CR0)), e = E.ease.inOutSine(u);
    const cy0 = lerp(960, 800, e), phi = lerp(Math.atan((960 - HS) / FOC), PI / 2, e);
    const h = lerp(330, 1500, Math.pow(e, 0.8)), gy = lerp(1640, 800, e);
    const q = (cy0 - gy) / FOC, sp = Math.sin(phi), cp = Math.cos(phi);
    const c = (-h * (cp + q * sp)) / (sp - q * cp);
    return { u, e, phi, h, c, cy0, sp, cp, H: cp > 1e-5 ? cy0 - (FOC * sp) / cp : -1e9 };
  }
  function proj(cc, X, Z) {
    const dz = Z - cc.c, depth = cc.h * cc.sp + dz * cc.cp, yup = -cc.h * cc.cp + dz * cc.sp;
    return depth > 1 ? [540 + (FOC * X) / depth, cc.cy0 - (FOC * yup) / depth, FOC / depth, depth] : null;
  }
  const hazeOf = (cc, depth) => 0.86 * (1 - Math.exp(-Math.max(0, depth - 1.1 * cc.h) / 3400));
  function planView(t) {
    let zoom = lerp(1, 0.45, P(t, 67.0, 67.9, 'inOutCubic'));
    zoom *= lerp(1, 3.0 / 0.45, P(t, 68.0, 68.5, 'inCubic'));
    return { cx: 540, cy: 800 + 70 * E.env(t, 67.0, 68.25, 0.9, 0.3), zoom, rot: 0.04 * Math.max(0, t - CR1) };
  }
  /** the ground seen through the crane camera: meadow tiles + plan texture in 4-px perspective strips,
   *  distance haze, then standing trees/flowers (billboards) for real parallax */
  function drawGround(ctx, t, cc, alpha) {
    const tex = SPR.plan, k = SPR.planK, tw = tex.width, th = tex.height, tcx = tw / 2, tcy = th / 2, pat = SPR.meadowPat;
    E.layer(ctx, (l) => {
      const top = Math.max(-8, Math.floor(cc.H)), step = 4;
      for (let y = top; y < E.H; y += step) {
        const ysA = (cc.cy0 - y) / FOC, ysB = (cc.cy0 - y - step) / FOC, dA = cc.sp - ysA * cc.cp, dB = cc.sp - ysB * cc.cp;
        if (dA <= 1e-5) continue;
        const ZA = cc.c + (cc.h * (cc.cp + ysA * cc.sp)) / dA, ZB = cc.c + (cc.h * (cc.cp + ysB * cc.sp)) / dB;
        const depth = cc.h / ((dA + dB) / 2), s = FOC / depth, hh = step + 0.7, dyz = step / (ZB - ZA);
        pat.setTransform(new DOMMatrix([s, 0, 0, -dyz, 540, y - ZA * dyz]));
        l.fillStyle = pat; l.fillRect(-10, y, E.W + 20, hh);
        const rA0 = tcy - ZA * k, rB0 = tcy - ZB * k;
        if (rB0 > 0 && rA0 < th) {
          let rA = rA0, rB = rB0, yA = y, yB = y + step;
          if (rA < 0) { yA = y + ((0 - rA0) / (rB0 - rA0)) * step; rA = 0; }
          if (rB > th) { yB = y + ((th - rA0) / (rB0 - rA0)) * step; rB = th; }
          l.drawImage(tex, 0, rA, tw, rB - rA, 540 - (tcx / k) * s, yA, (tw / k) * s, yB - yA + 0.7);
        }
        const hz = hazeOf(cc, depth);
        if (hz > 0.004) { l.fillStyle = `rgba(236,186,156,${hz.toFixed(3)})`; l.fillRect(-10, y, E.W + 20, hh); }
      }
      // standing trees & flowers (fade out as the view turns top-down)
      const bf = 1 - sm((cc.phi - 0.9) / 0.5);
      if (bf > 0.01) {
        const vis = [];
        for (const b of SPR.bb) {
          const q = proj(cc, b.X, b.Z); if (!q || q[3] < 80) continue;
          const hgt = b.h * q[2] * Math.max(0, cc.cp);
          if (q[0] < -260 || q[0] > E.W + 260 || q[1] - hgt > E.H || q[1] < cc.H) continue;
          vis.push([q, b, hgt]);
        }
        vis.sort((a, b) => b[0][3] - a[0][3]);
        for (const [q, b, hgt] of vis) {
          const hz = hazeOf(cc, q[3]), w = b.w * q[2];
          l.globalAlpha = bf;
          if (b.fl) {
            l.save(); l.translate(q[0], q[1]); l.scale(1, Math.max(0.12, cc.cp));
            A.drawFlower(l, b.fl, 0, 0, b.w * q[2], { pop: 1, rot: 0.06 * Math.sin(t * 1.3 + b.X * 0.01), palette: 'J' }); l.restore();
          } else {
            l.drawImage(b.spr.c, q[0] - w / 2, q[1] - hgt, w, hgt);
            if (hz > 0.01) { l.globalAlpha = bf * hz; l.drawImage(b.spr.hz, q[0] - w / 2, q[1] - hgt, w, hgt); }
          }
        }
        l.globalAlpha = 1;
      }
      // feather the far edge into the side view's own hills/meadow (no hard horizon seam)
      if (cc.H > -260) {
        l.globalCompositeOperation = 'destination-in';
        l.fillStyle = E.lin(l, 0, cc.H, 0, cc.H + 230, [[0, '#000', 0], [0.55, '#000', 0.7], [1, '#000', 1]]); l.fillRect(-10, -10, E.W + 20, E.H + 20);
        l.globalCompositeOperation = 'source-over';
      }
      // overlays (girih draw-on etc.) once nearly top-down: local affine of the projection at the centre
      if (cc.phi > 1.25) {
        const p0 = proj(cc, 0, 0), pu = proj(cc, 0, 100), pd = proj(cc, 0, -100);
        l.save(); l.translate(p0[0], p0[1]); l.scale(p0[2], (pd[1] - pu[1]) / 200); planWater(l, t); planOverlays(l, t, { rot: 0 }); l.restore();
      }
    }, { alpha });
  }
  function warmSurround(ctx, a) {
    if (a <= 0.003) return;
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = E.rad(ctx, 540, 820, 340, 1250, [[0, '#FFFFFF', 0], [0.5, '#9A6070', 0.4 * a], [1, '#4A2448', 0.9 * a]]); ctx.fillRect(0, 0, E.W, E.H);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = E.rad(ctx, 540, 800, 0, 900, [[0, '#FFD98A', 0.18 * a], [1, '#FFD98A', 0]]); ctx.fillRect(0, 0, E.W, E.H);
    ctx.fillStyle = E.lin(ctx, 0, 0, 0, 520, [[0, '#E58A78', 0.16 * a], [1, '#E58A78', 0]]); ctx.fillRect(0, 0, E.W, 520);
    ctx.restore();
  }
  const starClip = () => pathOf(starOutline(STAR_R - 10));
  function planWater(ctx, t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = -4; i <= 3; i++) for (let j = -4; j <= 3; j++) {
      const gx = (i + 0.5) * CELL, gy = (j + 0.5) * CELL; if (Math.hypot(gx, gy) > STAR_R * 0.85) continue;
      const tw2 = Math.pow(E.osc(t, 1.3 + H(i * 9 + j, 3), H(i * 9 + j, 4)), 4);
      ctx.fillStyle = E.rgba('#FFFFFF', 0.35 * tw2); ctx.beginPath(); ctx.ellipse(gx - 5, gy - 4, 6, 2.5, -0.6, 0, TAU); ctx.fill();
    }
    for (let r = 0; r < 3; r++) { const u = (t * 0.7 + r / 3) % 1; ctx.strokeStyle = E.rgba('#FFFFFF', 0.5 * (1 - u)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 6 + u * 40, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
  function drawPlanTop(ctx, t, v) {
    const k = SPR.planK, tex = SPR.plan, HW = SPR.planHW;
    ctx.save(); ctx.translate(v.cx, v.cy); ctx.rotate(v.rot); ctx.scale(v.zoom, v.zoom);
    const ext = 1800 / v.zoom;
    SPR.meadowPat.setTransform(new DOMMatrix()); ctx.fillStyle = SPR.meadowPat; ctx.fillRect(-ext, -ext, ext * 2, ext * 2);
    ctx.drawImage(tex, -HW, -HW, tex.width / k, tex.height / k);
    // as the camera pulls back the surround sinks into deep emerald (calm base for the gold field + rosettes)
    const zk = P(t, 67.0, 67.75, 'inOutSine');
    if (zk > 0) { ctx.fillStyle = E.rad(ctx, 0, 0, 500, 1500, [[0, '#0E3A2D', 0], [0.35, '#0E3A2D', 0.6 * zk], [1, '#0C2E26', 0.86 * zk]]); ctx.fillRect(-ext, -ext, ext * 2, ext * 2); }
    // endless girih field outside the garden: crisp near the garden, softened (blurred + dimmed) far out
    const grow = P(t, 67.02, 67.95, 'inOutSine');
    if (grow > 0) {
      const M = lerp(500, 3700, grow), m = ctx.getTransform(), R1 = 700, R2 = 1550, fa = Math.min(1, grow * 2.5);
      const field = (l, scl) => {
        l.setTransform(m.a * scl, m.b * scl, m.c * scl, m.d * scl, m.e * scl, m.f * scl);
        A.girih(l, { r: 3700, cell: CELL, lineW: 3.6, draw: 1, glow: 0.8, t, fill: 'rgba(60,175,125,0.32)', fill2: 'rgba(110,200,235,0.26)' });
        l.globalCompositeOperation = 'destination-in';
        l.fillStyle = E.rad(l, 0, 0, 0, M, [[0, '#000', 1], [0.8, '#000', 1], [1, '#000', 0]]); l.fillRect(-M, -M, M * 2, M * 2);
        l.globalCompositeOperation = 'destination-out'; l.fillStyle = '#000'; l.fill(pathOf(starOutline(STAR_R - 6)));
      };
      if (M > R1) E.layer(ctx, (l) => { field(l, 0.5); l.fillStyle = E.rad(l, 0, 0, R1 * 0.8, R2, [[0, '#000', 1], [1, '#000', 0]]); l.fillRect(-M, -M, M * 2, M * 2); }, { lo: true, blur: 7, alpha: fa * 0.5 });
      E.layer(ctx, (l) => { field(l, 1); l.globalCompositeOperation = 'destination-in'; l.fillStyle = E.rad(l, 0, 0, R1 * 0.8, R2, [[0, '#000', 1], [1, '#000', 0]]); l.fillRect(-M, -M, M * 2, M * 2); }, { alpha: fa });
    }
    planWater(ctx, t);
    planOverlays(ctx, t, v);
    ctx.restore();
  }
  function planOverlays(ctx, t, v) {
    // gold girih lighting up line by line inside the star garden
    const dr = P(t, 66.76, 67.45, 'inOutSine');
    if (dr > 0) {
      ctx.save(); ctx.clip(starClip());
      A.girih(ctx, { r: 560, cell: CELL, lineW: 3.4, draw: dr, glow: 0.8, t, sweep: P(t, 67.3, 67.9) });
      ctx.restore();
    }
    const ds = P(t, 66.8, 67.32, 'inOutSine');
    if (ds > 0) A.star8(ctx, { r: STAR_R, open: 0, draw: ds, lineW: 6, glow: 0.9, ext: 0.3, rot: 0 });
    // central rosette in the fountain
    const fr = P(t, 66.84, 67.6, 'linear');
    if (fr > 0) A.rosetteFlower(ctx, { r: 76, fill: fr, t, rays: true });
    // ring of 7 rosettes ("gayeler"), each on a soft dark cushion so it reads against the field
    const conv = P(t, 67.94, 68.2, 'inOutSine');
    for (let i = 0; i < 7; i++) {
      const fi = P(t, W.gayeler - 0.1 + i * 0.055, W.gayeler - 0.1 + i * 0.055 + 0.55, 'linear');
      if (fi <= 0) continue;
      const a = -PI / 2 + (i * TAU) / 7 - v.rot * 0.5, rho = 790 * (1 - conv);
      const sc = 1 - 0.75 * conv, al = 1 - conv * conv;
      E.at(ctx, Math.cos(a) * rho, Math.sin(a) * rho, sc, 0, () => {
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = E.rad(ctx, 0, 0, 120, 420, [[0, '#1E3A30', 0.6 * fi * al], [1, '#1E3A30', 0]]); ctx.fillRect(-420, -420, 840, 840); ctx.restore();
        S.light(ctx, 0, 0, 380, ROS_COLS[i], 0.35 * fi * al);
        A.rosetteFlower(ctx, { r: 235, fill: fi, t: t + i, col: ROS_COLS[i], core: E.hexOf(E.mix(ROS_COLS[i], '#FFFFFF', 0.72)), lighter: false, alpha: al });
      });
      if (conv > 0 && conv < 1) { // light trail toward the centre
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = E.rgba(ROS_COLS[i], 0.5 * (1 - conv)); ctx.lineWidth = 30 * (1 - conv); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * rho, Math.sin(a) * rho); ctx.lineTo(Math.cos(a) * Math.min(790, rho + 420), Math.sin(a) * Math.min(790, rho + 420)); ctx.stroke(); ctx.restore();
      }
    }
  }
  function drawFlare(ctx, t) {
    const pre = P(t, 67.92, 68.08, 'inQuad'), kf = P(t, 68.06, 68.26, 'inQuad');
    if (pre <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = E.rad(ctx, 540, 800, 0, 260 + 900 * kf, [[0, '#FFFFFF', 0.6 * pre], [1, '#FFE7B0', 0]]); ctx.fillRect(0, 0, E.W, E.H);
    ctx.globalCompositeOperation = 'source-over';
    if (kf > 0) {
      const R = 40 + 2100 * kf;
      ctx.fillStyle = E.rad(ctx, 540, 800, 0, R, [[0, '#FFFFFF', 1], [0.35, '#FFF6E6', 1], [0.8, '#FFF6E6', 0.85 * Math.min(1, kf * 3)], [1, '#FFF6E6', 0]]); ctx.fillRect(0, 0, E.W, E.H);
    }
    ctx.restore();
  }
  function drawIvoryEnd(ctx, t) {
    const k = P(t, 68.2, 68.3);
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k;
    ctx.fillStyle = E.rad(ctx, 540, 820, 0, 1300, [[0, '#FFFFFF'], [0.4, '#FFF8EC'], [1, '#FFF6E6']]); ctx.fillRect(0, 0, E.W, E.H);
    ctx.restore();
    // gold rosette arcs relaxing into 14 faint ink lines (reverse of A's ink → stems)
    const m = P(t, 68.28, 68.6, 'inOutSine'), a = P(t, 68.22, 68.36) * (0.32 - 0.04 * m);
    if (a <= 0) return;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const y = 482 + i * 52, x0 = 190, x1 = i === 13 ? 640 : 890, side = y < 820 ? -1 : 1, amp = (90 + 30 * Math.abs(y - 820) / 340) * (1 - m);
      ctx.beginPath();
      for (let s = 0; s <= 24; s++) {
        const x = lerp(x0, x1, s / 24), q = (x - 540) / 360, yy = y + side * amp * (1 - q * q) - side * amp * 0.5;
        s ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
      }
      ctx.strokeStyle = E.mix('#D8B26E', '#5A2A2F', m, a); ctx.lineWidth = lerp(2, 3, m); ctx.stroke();
    }
    ctx.restore();
  }

  /* =============================================================================
   * SCENE
   * ============================================================================= */
  E.scene({
    id: 'J_gayeler', t0: 61.6, t1: 68.6,
    async setup() {
      buildMisc();
      buildMeadow();
      buildBillboards();
      buildPlan();
      SPR.gTree = ghostFrom(420, 420, 210, 400, (x) => pomTreeArt(x));
      SPR.gBowl = ghostFrom(330, 300, 165, 92, (x) => A.iznikBowl(x, { rx: 120, ry: 40, depth: 82, overflow: 0.85, t: 0, shadow: false }));
      const rc = E.canvas(620, 560); rc.x.translate(310, 360);
      A.heroRose(rc.x, { R: ORIG.rose[2], bloom: 1, t: 0, variant: 'outline', col: '#FFF6E0', lw: 2.2, glow: 1 });
      SPR.gRose = { c: rc.c, ax: 310, ay: 360 };
    },
    post: (t) => {
      const fin = P(t, 66.3, 66.9), fl = P(t, 68.0, 68.3);
      return { bloom: lerp(lerp(0.42, 0.55, fin), 0.6, fl) + 0.12 * E.env(t, 64.5, 66.4, 0.3, 0.8), vignette: lerp(lerp(0.26, 0.15, fin), 0.03, fl), grain: lerp(0.05, 0.02, fl) };
    },
    draw(ctx, T) {
      const t = clamp(T, 61.6, 68.599);
      if (t < CR0) {
        drawSide(ctx, t);
        // ivory wash continuing I's whiteout
        const iw = 0.24 * (1 - P(t, 61.62, 62.35, 'inOutSine'));
        if (iw > 0) { ctx.fillStyle = E.rgba('#FFF6E6', iw); ctx.fillRect(0, 0, E.W, E.H); }
      } else if (t < CR1) {
        // crane-over: sky & sun (side view, everything at infinity) ride up with the horizon while the
        // ground plane slides under the camera
        const cc = craneCam(t), dy = cc.H - HS;
        if (cc.H > -80) { ctx.save(); ctx.translate(0, dy); drawSide(ctx, t, { dy, k: cc.u }); ctx.restore(); }
        drawGround(ctx, t, cc, P(t, CR0, CR0 + 0.16, 'inOutSine'));
        warmSurround(ctx, 0.6 * P(t, 66.6, CR1, 'inOutSine'));
        const sy = sunAt(t, camAt(t)).y + dy, ga = E.env(t, CR0, CR1, 0.2, 0.4);
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = E.rad(ctx, 540, Math.max(-300, sy), 0, 1150, [[0, '#FFF1D8', 0.72 * ga], [0.35, '#FFD9A0', 0.34 * ga], [1, '#E58A78', 0]]); ctx.fillRect(0, 0, E.W, E.H);
        ctx.restore();
        drawCraneMotes(ctx, t);
      } else {
        drawPlanTop(ctx, t, planView(t));
        warmSurround(ctx, 0.6);
      }
      drawFlare(ctx, t);
      drawIvoryEnd(ctx, t);
    },
  });
})();
