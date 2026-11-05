/* =====================================================================================
 * engine/assets_objects.js — OBJECTS & GEOMETRY asset library  (namespace: window.A)
 * =====================================================================================
 * Every function draws in LOCAL coordinates of the current ctx transform (place/scale with
 * E.at(ctx, x, y, scale, rot, fn)). Units are px at scale 1. Fully deterministic (no Math.random):
 * pass the global video time `t` for idle motion. Colours are '#RRGGBB'. Functions save/restore ctx.
 *
 * ── PORCELAIN / GLASS / LAMPS ────────────────────────────────────────────────────────────
 * A.iznikBowl(ctx, o) → geom   ORIGIN = rim-ellipse centre. Body hangs below to foot bottom y=depth
 *    (= glossy surface line). o: { rx=330, ry=110 (rim ellipse; 3/4 view), depth=220,
 *      tilt=0 (rad, tips opening toward camera → ry grows), widen 0..1 (rx×1.27, depth×1.3, inner
 *      tulips unfurl +25°, light sweep runs along the rim while 0<widen<1),
 *      lit 0..1 (=1) + litRadius (px; inner çini revealed radially from the floor centre; omit → all),
 *      dim 0..1 (pattern → #2A3550), honey (px radius of honey pool on the floor, 0 = none),
 *      overflow 0..1 (bowl brims with honey-light, 5 streams pour over the rim & pool on the surface),
 *      reflection:false (mirror below y=depth, alpha .35, blurred; set true on a glossy floor),
 *      shadow:true (contact shadow), rimCol '#A9E4FF' (cool rim light, left), spin (rad, outer pattern),
 *      innerDepth=1 (apparent floor drop), t }
 *    Returns { rx, ry, depth, floor:[x,y] (honey-pool centre), s (ry/rx), ... }.
 * A.bowlSilhouette(o) → 128 pts (bowl + mirror reflection, wide-narrow-wide; same o as bowl;
 *    neck = foot at y=depth; top-most first, clockwise). Morph with A.hourglassSilhouette.
 * A.hourglass(ctx, o) → geom   ORIGIN = neck centre. o: { h=640 (total incl. caps), w=h*0.7 (bulb
 *    width; use 2*rx of the bowl for the D→E morph), neck=w*0.06, sandTop 0..1, sandBottom 0..1,
 *    flow 0..2 (stream intensity; 0 = stopped, 1 normal, 2 rush), glassAlpha 0..1, view=0.2, t }
 * A.hourglassSilhouette(o) → 128 pts (caps + glass), centred on the neck.
 * A.kandil(ctx, o) → {fx, fy, fh}   ORIGIN = bottom centre of the foot (sits on y=0). Flame above.
 *    o: { size=200 (foot→collar px), lit 0..1 (flame & light on; animate for lighting), flame 0..2
 *      (flame size), oil 0..1 (reservoir level), ember false|true|0..1 (flame → tiny glowing coal),
 *      light:true (warm pool radius lightR=size*1.9, #FFB34D), lightR, t }. fx,fy = flame centre.
 * A.bellJar(ctx, o)   ORIGIN = bottom centre of brass base. o: { w=200, h=300, t, tag:true,
 *      swing=0.07 (rad tag sway), spec (0..1 highlight band sweeping L→R; omit = none),
 *      content: fn(ctx) — called BEFORE the glass with origin moved to the jar floor centre
 *      (y<0 is up), clipped to the dome (clip:false to disable), view=0.16, tint '#BFE8FF' }
 * A.hangingLantern(ctx, o) → {x,y}   ORIGIN = hanging point (top of chain).
 *    o: { size=120 (body height), lit 0..1, t, chain=size*0.6, swing=3 (deg), hz=0.6, phase,
 *      dots:true (casts pierced-pattern light dots around, #FFAE42), dotR=size*3.4 }. Returns body centre.
 *
 * ── ARCHITECTURE / TEXTILE ───────────────────────────────────────────────────────────────
 * A.archGate(ctx, o)   ORIGIN = bottom centre (ground). Spans x ±w/2, y -h..0.
 *    o: { w=600, h=900, luminous 0..1 (wood #6E4A32 → light #FFF6E0, inner white glow),
 *      lattice:true (kafes 8-star lattice in the opening), muqarnas:true, cell=w*0.16, back (opening
 *      fill colour or null = see-through), t }
 * A.lattice(ctx, o)   kafes lattice in a rect. o: { x,y (top-left; default centred on origin), w, h,
 *      cell=80, lineW=cell*0.12, stroke '#6E4A32', luminous 0..1 (→ #FFF6E0 + white core), angle=67.5,
 *      clip:true, alpha }  (foreground lattice passing camera: just draw it big)
 * A.seccade(ctx, o)   ORIGIN = centre of the fully-unrolled rug (lying on the floor, far end = top).
 *    o: { w=120, h=220, unroll 0..1 (roll travels far→near, radius shrinks), palette 0|1|2
 *      (#A8323E / #2F7D5B / #2E5FA3), persp 0..1 (far edge narrower, height compressed), t }
 * A.mosque(ctx, o)   ORIGIN = ground centre (y=0 ground). Abstract Masjid an-Nabawi: low arcade, small
 *    domes, green dome, 4 minarets with crescent finials. o: { w=700, col '#2A2140' (silhouette),
 *      dome '#3E8E5E', rim 0..1 (dome rim #8FE3A8 + warm edge light), sun:1 (+1 right, -1 left),
 *      lights 0..1 (warm arcade windows), t }
 *
 * ── GEOMETRY (gold reads as gold: dark under-stroke + metallic gradient + bright core) ─────
 * A.star8(ctx, o)   Rub el Hizb. ORIGIN = centre. o: { r=40, open 0..1 (outer squares rotate +22.5°,
 *      inner star rotates −22.5° & appears, girih extensions grow), draw 0..1 (draw-on), girih:true,
 *      ext=0.45 (extension length ×r; grows with open), col (metal base; default gold), glow 0..1 (cheap
 *      halo strokes), lineW=max(1.5,r*.035), fill (css, optional), rot, alpha }. Draw-on grows every edge
 *      from its midpoint (symmetric), extensions after draw>0.55.
 * A.girih(ctx, o)   real 8-fold tessellation (Hankin on 4.8.8: 8-pt stars + 4-pt stars + kites).
 *    o: { cx=0, cy=0, r=500 (field radius, soft edge), cell=120, draw 0..1 (radial from centre),
 *      relief 0..1 (3 stacked offset copies), hue (number → iridescent #6FF0FF/#B48CFF/#FF7AD9/#FFE66D
 *      wave phase; undefined → gold), lineW=3, angle=67.5 (contact °; 45 → straight-line khatam),
 *      col (gold base hex for gold mode, e.g. '#B8862E' on parchment), fill / fill2 (css for 8-stars /
 *      4-stars), sweep 0..1 (bright ring travelling out), glow 0..1, rot, alpha, vector:false }.
 *      draw>=1 → fast path: periodic tile sprite + pattern fill + tint layer (~35 ms full-frame);
 *      draw<1 → vector line-by-line growth (~120 ms full-frame at cell 100; use during draw-on only).
 * A.rosetteFlower(ctx, o)   radiant filled 8-fold rosette (8-pt star, 16 almond petals, 16 ogee scallops,
 *      rays). o: { r=300, fill 0..1 (blooms centre→out in stages), t (slow spin/shimmer), col '#FFD27A',
 *      core '#FFFDF5', lighter:false (additive — only on dark backgrounds), rays:true, alpha }
 * A.filament(ctx, pts, o)  glowing thread through control pts [[x,y],…] (Catmull-Rom).
 *    o: { t, w=2 (core px), halo=8, col '#FFE3A3', flow=60 (dash px/s), draw 0..1, snap 0..1 (breaks at
 *      breakAt=0.5, halves spring back with wobble + spark burst), alpha, head:true }
 *
 * ── PARTICLES (analytic functions of t; cheap; 'lighter' unless noted) ───────────────────
 * A.petals(ctx, t, o)   rigid tumbling petals (normal blend). Modes: (a) area loop {area:{x,y,w,h},
 *      wind:[vx,vy]}; (b) burst {t0, origin:{x,y,w?}, dir, spread, speed, gravity, life, stagger};
 *      (c) path {along:(u,i)→[x,y], life}. Common: n=24, seed, col (hex | [hex…]), size=22, alpha, light
 *      (true → glowing light-petals #FFE7B0 'lighter').
 * A.lightRain(ctx, t, o)  {n=300, seed, area, density 0..1, slant=6° (rad), speed=380, len=[18,40],
 *      col '#FFFFFF', halo '#FFE7A8', alpha=.8, bandSlow:true (gloss band y1229–1574: 20% drops, slower)}
 * A.sand(ctx, t, o)    falling grain stream {x, y (top), len, flow=1, w=1.6, speed=420, col, seed}
 * A.sparks(ctx, t, o)  burst {x, y, t0, n=16, seed, col, speed=380, life=.7, gravity=520, dir, spread, size}
 * A.wisps(ctx, t, o)   curling smoke-light {x, y, n=6, seed, col '#FFE3A3', rise=80, life=2.4, spread,
 *      w=5, t0 (one-shot; omit → continuous), stagger, drift, op ('lighter'|'source-over'), alpha}
 * A.glints(ctx, t, o)  4-point twinkles {pts:[[x,y]…], seed, r=12, col, period=1.8, duty=.3, alpha}
 *
 * ── MORPH UTILITIES (shapes = arrays of [x,y]) ───────────────────────────────────────────
 * A.resample(pts, n=128)  closed polyline → n pts, equal arc length, top-most first, clockwise (screen).
 * A.lerpShape(a, b, k) · A.morphEase(k, jelly=0.06) (inOutCubic + tiny end overshoot)
 * A.fillShape(ctx, pts, smooth=true) · A.strokeShape(ctx, pts, smooth=true) · A.shapePath(pts, smooth)
 * A.circlePts(r, n) · A.ellipsePts(rx, ry, n) · A.teardropPts(r, n, tip=1.7) (tip up) ·
 * A.polyPts(r, sides, n) (e.g. hexagon facet) · A.starPts(r, points=8, inner=0.5, n)
 * A.sampleCurve(pts, res) (Catmull-Rom → polyline) · A.crPath(ctxOrPath2D, pts, closed)
 *
 * NOTE: S.flower 'rose'/'peony' and S.flower without explicit col2 currently throw in shapes.js
 *   (E.shade on an rgb() string) — pass hex col AND col2.
 * Debug showcase scenes (never in film): X_objects (t 9200–9206, one page per second:
 *   0 overview · 1 bowl states · 2 hourglass+kandil · 3 jar/gate/lantern/lattice · 4 seccade+mosque ·
 *   5 star8/girih/filament/particles) and X_geo (t 9300–9303: hero girih · gold draw-on · rosette).
 * ===================================================================================== */
window.A = window.A || {};
(function () {
  'use strict';
  const A = window.A;
  const TAU = Math.PI * 2, PI = Math.PI;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const dv = (v, d) => (v === undefined || v === null ? d : v);
  const sm = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const mod = (a, n) => ((a % n) + n) % n;
  // colour helper: accepts '#hex' or 'rgb(r,g,b)' (E.mix/E.shade output) → '#hex'
  const hxC = new Map();
  const hx = (c) => {
    if (c[0] === '#') return c;
    let v = hxC.get(c); if (v) return v;
    const m = c.match(/(\d+)\D+(\d+)\D+(\d+)/);
    v = '#' + [m[1], m[2], m[3]].map((q) => (+q).toString(16).padStart(2, '0')).join('');
    hxC.set(c, v); return v;
  };
  const mixH = (a, b, t) => hx(E.mix(hx(a), hx(b), t));
  const shadeH = (c, t) => hx(E.shade(hx(c), t));

  /* ───────────────────────── path helpers ───────────────────────── */
  function crPath(p, pts, closed, k = 1 / 6) {
    const n = pts.length; if (n < 2) return;
    const P = (i) => (closed ? pts[(i + n) % n] : pts[i < 0 ? 0 : i > n - 1 ? n - 1 : i]);
    p.moveTo(pts[0][0], pts[0][1]);
    const m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
    }
    if (closed) p.closePath();
  }
  function polyPath(p, pts, closed) {
    if (!pts.length) return;
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    if (closed) p.closePath();
  }
  function sampleCurve(pts, res = 64) {
    const n = pts.length;
    if (n < 2) return pts.slice();
    const out = [], seg = n - 1, per = Math.max(2, Math.ceil(res / seg));
    for (let i = 0; i < seg; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      for (let j = 0; j < per; j++) {
        const u = j / per, u2 = u * u, u3 = u2 * u;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push([pts[n - 1][0], pts[n - 1][1]]);
    return out;
  }
  function cumLen(pl) { const c = [0]; for (let i = 1; i < pl.length; i++) c.push(c[i - 1] + Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1])); return c; }
  function subPoly(pl, cum, a, b) {
    const out = []; if (b <= a) return out;
    const at = (d) => { let i = 1; while (i < cum.length - 1 && cum[i] < d) i++; const s = cum[i] - cum[i - 1] || 1, u = clamp((d - cum[i - 1]) / s); return [lerp(pl[i - 1][0], pl[i][0], u), lerp(pl[i - 1][1], pl[i][1], u)]; };
    out.push(at(a));
    for (let i = 0; i < pl.length; i++) if (cum[i] > a && cum[i] < b) out.push(pl[i]);
    out.push(at(b));
    return out;
  }
  A.crPath = crPath; A.sampleCurve = sampleCurve;

  /* metallic gold */
  function goldGrad(ctx, x0, y0, x1, y1, a = 1) {
    return E.lin(ctx, x0, y0, x1, y1, [[0, '#A8742A', a], [0.2, '#FFE4A0', a], [0.4, '#D9A548', a], [0.58, '#FFF2C8', a], [0.78, '#C88E34', a], [1, '#F4CE78', a]]);
  }
  function metalGrad(ctx, col, x0, y0, x1, y1) {
    if (!col) return goldGrad(ctx, x0, y0, x1, y1);
    return E.lin(ctx, x0, y0, x1, y1, [[0, shadeH(col, -0.32)], [0.2, shadeH(col, 0.45)], [0.4, col], [0.58, shadeH(col, 0.62)], [0.78, shadeH(col, -0.18)], [1, shadeH(col, 0.25)]]);
  }
  const BRASS = (ctx, x0, x1, a = 1) => E.lin(ctx, x0, 0, x1, 0, [[0, '#5E3E14', a], [0.22, '#E8C27A', a], [0.36, '#FFF0C0', a], [0.55, '#C99A4A', a], [0.82, '#8A6428', a], [1, '#4A3010', a]]);
  function metalStroke(ctx, lw, style, o = {}) {
    const a = dv(o.alpha, 1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.under !== false) { ctx.strokeStyle = o.underStyle || E.rgba(o.dark || '#4A300C', 0.55 * a); ctx.lineWidth = lw * 2.0; ctx.stroke(); }
    ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.stroke();
    if (o.hi !== false) { ctx.strokeStyle = o.hiStyle || E.rgba(o.hiCol || '#FFF8E0', 0.75 * a); ctx.lineWidth = Math.max(0.5, lw * 0.3); ctx.stroke(); }
  }
  function scaleOf(ctx) { const m = ctx.getTransform(); return Math.hypot(m.a, m.b) || 1; }

  /* ───────────────────────── morph utilities ───────────────────────── */
  A.resample = (pts, n = 128) => {
    let P = pts.map((p) => [p[0], p[1]]);
    if (P.length > 2) { const a = P[0], b = P[P.length - 1]; if (Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) P.pop(); }
    let ar = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; ar += a[0] * b[1] - b[0] * a[1]; }
    if (ar < 0) P.reverse();
    let cx = 0; for (const p of P) cx += p[0]; cx /= P.length;
    let bi = 0;
    for (let i = 1; i < P.length; i++) { const p = P[i], q = P[bi]; if (p[1] < q[1] - 1e-6 || (Math.abs(p[1] - q[1]) <= 1e-6 && Math.abs(p[0] - cx) < Math.abs(q[0] - cx))) bi = i; }
    P = P.slice(bi).concat(P.slice(0, bi));
    const m = P.length, cum = [0];
    for (let i = 1; i <= m; i++) { const a = P[i - 1], b = P[i % m]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const L = cum[m], out = []; let j = 0;
    for (let k = 0; k < n; k++) {
      const d = (k / n) * L;
      while (j < m - 1 && cum[j + 1] < d) j++;
      const a = P[j], b = P[(j + 1) % m], seg = cum[j + 1] - cum[j] || 1, u = (d - cum[j]) / seg;
      out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
    }
    return out;
  };
  A.lerpShape = (a, b, k) => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * k, p[1] + (b[i][1] - p[1]) * k]);
  A.morphEase = (k, j = 0.06) => { k = clamp(k); return E.ease.inOutCubic(k) + j * Math.sin(clamp((k - 0.72) / 0.28) * PI); };
  A.shapePath = (pts, smooth = true) => { const p = new Path2D(); smooth ? crPath(p, pts, true) : polyPath(p, pts, true); return p; };
  A.fillShape = (ctx, pts, smooth = true) => { ctx.beginPath(); smooth ? crPath(ctx, pts, true) : polyPath(ctx, pts, true); ctx.fill(); };
  A.strokeShape = (ctx, pts, smooth = true) => { ctx.beginPath(); smooth ? crPath(ctx, pts, true) : polyPath(ctx, pts, true); ctx.stroke(); };
  A.circlePts = (r, n = 128) => { const o = []; for (let i = 0; i < n; i++) { const a = -PI / 2 + (i / n) * TAU; o.push([Math.cos(a) * r, Math.sin(a) * r]); } return o; };
  A.ellipsePts = (rx, ry, n = 128) => { const o = []; for (let i = 0; i < n; i++) { const a = -PI / 2 + (i / n) * TAU; o.push([Math.cos(a) * rx, Math.sin(a) * ry]); } return o; };
  A.teardropPts = (r, n = 128, tip = 1.7) => {
    const d = r * tip, b = Math.asin(clamp(r / d, 0, 0.999)), o = [[0, -d]];
    for (let i = 0; i <= 40; i++) { const a = -b + (i / 40) * (PI + 2 * b); o.push([Math.cos(a) * r, Math.sin(a) * r]); }
    return A.resample(o, n);
  };
  A.polyPts = (r, sides = 6, n = 128) => { const o = []; for (let i = 0; i < sides; i++) { const a = -PI / 2 + (i / sides) * TAU; o.push([Math.cos(a) * r, Math.sin(a) * r]); } return A.resample(o, n); };
  A.starPts = (r, k = 8, inner = 0.5, n = 128) => { const o = []; for (let i = 0; i < k * 2; i++) { const a = -PI / 2 + (i / (k * 2)) * TAU, rr = i % 2 ? r * inner : r; o.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return A.resample(o, n); };

  /* =====================================================================================
   * IZNIK BOWL
   * ===================================================================================== */
  const BC = { cobalt: '#1F5FA8', blue: '#4FA3E0', turq: '#3CC6C0', red: '#D9473A', outline: '#163C70', stem: '#2A9A8E', white: '#FBF8F1', dim: '#2A3550', redDeep: '#9E2A20' };

  function bowlGeom(rx, ry, depth) {
    const s = clamp(ry / rx, 0.04, 0.97);
    const fR = rx * 0.34, fR2 = rx * 0.37;
    const yFB = depth - fR2 * s, footH = Math.max(4, depth * 0.1), yFT = yFB - footH;
    const fr = 0.33;
    const R = (v) => rx * (fr + (1 - fr) * (Math.sqrt(Math.max(0, 1 - v * v)) * 0.8 + (1 - v) * 0.2));
    const Y = (v) => v * yFT;
    const surf = (th, v) => { const r = R(v); return [r * Math.sin(th), Y(v) + r * s * Math.cos(th)]; };
    const low = [];
    for (let i = 0; i <= 60; i++) {
      const x = rx * Math.sin(-PI / 2 + (PI * i) / 60);
      let best = -1e9;
      for (let j = 0; j <= 36; j++) { const v = j / 36, r = R(v); if (r < Math.abs(x)) break; const y = Y(v) + s * Math.sqrt(r * r - x * x); if (y > best) best = y; }
      low.push([x, best < -1e8 ? 0 : best]);
    }
    return { rx, ry, depth, s, fR, fR2, yFB, yFT, footH, R, Y, surf, low };
  }
  function bowlParams(o) {
    const widen = clamp(o.widen || 0), tilt = o.tilt || 0;
    const rx = dv(o.rx, 330) * (1 + 0.27 * widen);
    let ry = dv(o.ry, 110) * (1 + 0.27 * widen);
    ry = Math.min(rx * 0.97, ry + rx * Math.sin(tilt) * 0.9);
    const depth = dv(o.depth, 220) * (1 + 0.3 * widen);
    return { rx, ry, depth, widen };
  }
  function bowlBodyPath(G) {
    const p = new Path2D();
    p.moveTo(G.rx, 0); p.ellipse(0, 0, G.rx, G.ry, 0, 0, PI, false);
    for (const q of G.low) p.lineTo(q[0], q[1]);
    p.closePath(); return p;
  }
  function bowlFootPath(G) {
    const p = new Path2D();
    p.moveTo(-G.fR, G.yFT); p.lineTo(-G.fR2, G.yFB);
    p.ellipse(0, G.yFB, G.fR2, Math.max(0.5, G.fR2 * G.s), 0, PI, 0, true);
    p.lineTo(G.fR, G.yFT); p.closePath(); return p;
  }
  // petal-like lens in local spray coords (x side, y growth), ang from +y toward +x
  function lens(b, ang, len, wid, curl = 0, n = 8) {
    const dx = Math.sin(ang), dy = Math.cos(ang), nx = Math.cos(ang), ny = -Math.sin(ang);
    const L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, hw = wid * Math.pow(Math.sin(PI * u), 0.8) * (1 - 0.3 * u);
      const cx = b[0] + dx * len * u + nx * curl * len * u * u, cy = b[1] + dy * len * u + ny * curl * len * u * u;
      L.push([cx + nx * hw, cy + ny * hw]); if (i > 0 && i < n) R.push([cx - nx * hw, cy - ny * hw]);
    }
    return L.concat(R.reverse());
  }
  function sazLeaf(sd, sc) {
    const P0 = [sd * 0.01, 0.05], P1 = [sd * 0.03, 0.42 * sc], P2 = [sd * 0.42 * sc, 0.68 * sc];
    const outer = [], inner = [], n = 14;
    for (let i = 0; i <= n; i++) {
      const u = i / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
      const x = a * P0[0] + b * P1[0] + c * P2[0], y = a * P0[1] + b * P1[1] + c * P2[1];
      const tx = 2 * (1 - u) * (P1[0] - P0[0]) + 2 * u * (P2[0] - P1[0]), ty = 2 * (1 - u) * (P1[1] - P0[1]) + 2 * u * (P2[1] - P1[1]);
      const tl = Math.hypot(tx, ty) || 1; let nx = -ty / tl, ny = tx / tl; if (nx * sd < 0) { nx = -nx; ny = -ny; }
      const hw = 0.075 * Math.pow(Math.sin(PI * u), 0.7) * sc;
      const ser = i > 0 && i < n ? (i % 2 ? 1.35 : 0.85) : 1;
      outer.push([x + nx * hw * ser, y + ny * hw * ser]);
      if (i > 0 && i < n) inner.push([x - nx * hw * 0.75, y - ny * hw * 0.75]);
    }
    return outer.concat(inner.reverse());
  }
  function drawSpray(ctx, F, kind, cm, unf, lw) {
    const mp = (arr) => arr.map((p) => F(p[0], p[1]));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = cm(BC.stem); ctx.lineWidth = lw * 1.4;
    ctx.beginPath(); crPath(ctx, mp([[0, 0], [0.03, 0.26], [0, 0.56]]), false); ctx.stroke();
    for (const sd of [-1, 1]) {
      ctx.beginPath(); crPath(ctx, mp(sazLeaf(sd, kind === 'tulip' ? 1 : 0.85)), true);
      ctx.fillStyle = cm(BC.cobalt); ctx.fill();
      ctx.strokeStyle = cm(BC.outline); ctx.lineWidth = lw * 0.5; ctx.stroke();
      ctx.strokeStyle = cm(BC.turq); ctx.lineWidth = lw * 0.55;
      ctx.beginPath(); crPath(ctx, mp([[sd * 0.02, 0.12], [sd * 0.05, 0.42], [sd * 0.3, 0.6]]), false); ctx.stroke();
      ctx.beginPath(); crPath(ctx, mp(lens([sd * 0.02, 0.24], sd * 0.75, 0.15, 0.04)), true); ctx.fillStyle = cm(BC.turq); ctx.fill();
    }
    if (kind === 'tulip') {
      const sa = 0.3 + 0.44 * unf;
      const pet = [lens([-0.03, 0.55], -sa, 0.34, 0.085, -0.12), lens([0.03, 0.55], sa, 0.34, 0.085, 0.12), lens([0, 0.54], 0, 0.42, 0.08, 0)];
      for (const p of pet) {
        ctx.beginPath(); crPath(ctx, mp(p), true);
        ctx.fillStyle = cm(BC.red); ctx.fill(); ctx.strokeStyle = cm(BC.outline); ctx.lineWidth = lw * 0.5; ctx.stroke();
      }
      ctx.strokeStyle = cm(BC.white); ctx.lineWidth = lw * 0.45;
      ctx.beginPath(); crPath(ctx, mp([[0, 0.62], [0, 0.78], [0, 0.88]]), false); ctx.stroke();
    } else {
      ctx.beginPath(); crPath(ctx, mp(lens([0, 0.49], 0, 0.15, 0.075)), true); ctx.fillStyle = cm(BC.cobalt); ctx.fill();
      const fan = [[0.07, 0.6]];
      for (let j = 0; j <= 28; j++) { const a = 1.25 - (2.5 * j) / 28, rr = 0.25 * (0.84 + 0.16 * Math.abs(Math.sin((j / 28) * 7 * PI))); fan.push([Math.sin(a) * rr, 0.6 + Math.cos(a) * rr]); }
      fan.push([-0.07, 0.6]);
      ctx.beginPath(); polyPath(ctx, mp(fan), true); ctx.fillStyle = cm(BC.red); ctx.fill();
      ctx.strokeStyle = cm(BC.outline); ctx.lineWidth = lw * 0.45; ctx.stroke();
      ctx.strokeStyle = cm(BC.redDeep); ctx.lineWidth = lw * 0.45; ctx.beginPath();
      for (let j = 0; j < 5; j++) { const a = -0.9 + (1.8 * j) / 4; const q = mp([[0, 0.63], [Math.sin(a) * 0.19, 0.6 + Math.cos(a) * 0.19]]); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); }
      ctx.stroke();
      ctx.beginPath(); crPath(ctx, mp(lens([0, 0.58], 0, 0.08, 0.05)), true); ctx.fillStyle = cm(BC.white); ctx.fill();
    }
  }
  function bowlInnerPattern(ctx, W, cm, unf, lw) {
    const ring = (rho, n = 72) => { const p = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; p.push(W(rho * Math.cos(a), rho * Math.sin(a))); } return p; };
    ctx.fillStyle = cm(BC.cobalt);
    ctx.beginPath(); polyPath(ctx, ring(0.975), true); polyPath(ctx, ring(0.865).reverse(), true); ctx.fill();
    const wave = []; for (let i = 0; i < 176; i++) { const a = (i / 176) * TAU, rho = 0.92 + 0.03 * Math.sin(a * 22); wave.push(W(rho * Math.cos(a), rho * Math.sin(a))); }
    ctx.strokeStyle = cm(BC.white); ctx.lineWidth = lw * 1.1; ctx.beginPath(); polyPath(ctx, wave, true); ctx.stroke();
    ctx.fillStyle = cm(BC.turq);
    for (let i = 0; i < 22; i++) { const a = ((i + 0.25) / 22) * TAU, q = W(0.945 * Math.cos(a), 0.945 * Math.sin(a)); ctx.beginPath(); ctx.arc(q[0], q[1], lw * 0.9, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = cm(BC.red); ctx.lineWidth = lw * 0.8; ctx.beginPath(); polyPath(ctx, ring(0.84), true); ctx.stroke();
    ctx.strokeStyle = cm(BC.cobalt); ctx.lineWidth = lw * 0.5; ctx.beginPath(); polyPath(ctx, ring(0.815), true); ctx.stroke();
    for (let k = 0; k < 8; k++) {
      const ph = (k * TAU) / 8 + PI / 8, c = Math.cos(ph), s = Math.sin(ph), L = 0.5, bx = 0.27 * c, by = 0.27 * s;
      const F = (lx, ly) => W(bx + c * ly * L - s * lx * L, by + s * ly * L + c * lx * L);
      drawSpray(ctx, F, k % 2 ? 'carn' : 'tulip', cm, unf, lw);
    }
    const id = (x, y) => W(x, y);
    for (let k = 0; k < 8; k++) {
      ctx.beginPath(); crPath(ctx, lens([0, 0], (k * TAU) / 8, 0.17, 0.05).map((p) => id(p[0], p[1])), true);
      ctx.fillStyle = cm(BC.cobalt); ctx.fill(); ctx.strokeStyle = cm(BC.outline); ctx.lineWidth = lw * 0.4; ctx.stroke();
      ctx.beginPath(); crPath(ctx, lens([0, 0], (k * TAU) / 8 + PI / 8, 0.11, 0.035).map((p) => id(p[0], p[1])), true);
      ctx.fillStyle = cm(BC.turq); ctx.fill();
    }
    ctx.fillStyle = cm(BC.red); ctx.beginPath(); polyPath(ctx, ring(0.04, 24), true); ctx.fill();
    ctx.fillStyle = cm(BC.white); ctx.beginPath(); polyPath(ctx, ring(0.015, 16), true); ctx.fill();
    ctx.strokeStyle = cm(BC.cobalt); ctx.lineWidth = lw * 0.7; ctx.beginPath(); polyPath(ctx, ring(0.215), true); ctx.stroke();
    ctx.fillStyle = cm(BC.red);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, q = W(0.24 * Math.cos(a), 0.24 * Math.sin(a)); ctx.beginPath(); ctx.arc(q[0], q[1], lw * 0.75, 0, TAU); ctx.fill(); }
  }
  function bowlExterior(ctx, G, o, cm, t) {
    const { rx, s } = G, lw = rx * 0.009;
    const foot = bowlFootPath(G);
    ctx.fillStyle = E.lin(ctx, -G.fR2, 0, G.fR2, 0, [[0, '#B4A89C'], [0.62, '#EFE8DB'], [1, '#C9BEB0']]); ctx.fill(foot);
    ctx.save(); ctx.clip(foot);
    ctx.strokeStyle = cm(BC.cobalt); ctx.lineWidth = lw * 1.4;
    ctx.beginPath(); ctx.ellipse(0, G.yFB - G.footH * 0.45, G.fR2, Math.max(0.5, G.fR2 * s), 0, 0, PI); ctx.stroke();
    ctx.restore();
    const body = bowlBodyPath(G);
    ctx.fillStyle = E.lin(ctx, -rx, 0, rx, 0, [[0, '#C2B6AC'], [0.28, '#E6DED1'], [0.6, '#FAF6EE'], [0.8, '#FFFFFF'], [1, '#DDD2C3']]);
    ctx.fill(body);
    ctx.save(); ctx.clip(body);
    // rim band (cobalt with white dots)
    const band = [];
    for (let i = 0; i <= 40; i++) band.push(G.surf(-PI / 2 + (PI * i) / 40, 0.0));
    for (let i = 40; i >= 0; i--) band.push(G.surf(-PI / 2 + (PI * i) / 40, 0.075));
    ctx.fillStyle = cm(BC.cobalt); ctx.beginPath(); polyPath(ctx, band, true); ctx.fill();
    ctx.fillStyle = cm(BC.white);
    for (let i = 0; i < 26; i++) { const th = -PI / 2 + ((i + 0.5) / 26) * PI; if (Math.cos(th) < 0.08) continue; const q = G.surf(th, 0.04); ctx.beginPath(); ctx.ellipse(q[0], q[1], lw * 0.9 * Math.cos(th) + 0.4, lw * 0.9, 0, 0, TAU); ctx.fill(); }
    const fb = [];
    for (let i = 0; i <= 40; i++) fb.push(G.surf(-PI / 2 + (PI * i) / 40, 0.9));
    ctx.strokeStyle = cm(BC.turq); ctx.lineWidth = lw * 0.9; ctx.beginPath(); polyPath(ctx, fb, false); ctx.stroke();
    // sprays wrapped on the body
    const spin = o.spin || 0;
    for (let k = -3; k <= 3; k++) {
      const thk = k * 0.6 + mod(spin + 0.3, 1.2) - 0.3;
      if (Math.cos(thk) < 0.12) continue;
      const F = (lx, ly) => { const v = clamp(0.86 - ly * 0.68, 0, 1); return G.surf(thk + (lx * 0.42 * rx) / G.R(v), v); };
      drawSpray(ctx, F, (k + 10) % 2 ? 'carn' : 'tulip', cm, 0, lw * 0.85);
    }
    // ambient occlusion toward the foot + two-tone shade on the left
    ctx.fillStyle = E.lin(ctx, 0, G.ry * 0.3, 0, G.depth, [[0, '#3A2848', 0], [1, '#3A2848', 0.34]]); ctx.fillRect(-rx, 0, rx * 2, G.depth);
    ctx.fillStyle = 'rgba(52,36,78,0.17)';
    ctx.beginPath(); ctx.moveTo(-rx * 1.1, -4); ctx.lineTo(-rx * 0.32, -4); ctx.bezierCurveTo(-rx * 0.38, G.depth * 0.3, -rx * 0.28, G.depth * 0.7, -rx * 0.12, G.depth * 1.1); ctx.lineTo(-rx * 1.1, G.depth * 1.1); ctx.closePath(); ctx.fill();
    // glaze highlight streak (key light from right)
    const hs = [];
    for (let i = 0; i <= 12; i++) hs.push(G.surf(0.66, 0.05 + i * 0.055));
    for (let i = 12; i >= 0; i--) hs.push(G.surf(0.8, 0.05 + i * 0.055));
    ctx.fillStyle = E.lin(ctx, 0, 0, 0, G.depth * 0.75, [[0, '#FFFFFF', 0.75], [0.6, '#FFFFFF', 0.25], [1, '#FFFFFF', 0]]);
    ctx.beginPath(); crPath(ctx, hs, true); ctx.fill();
    const sp = G.surf(0.56, 0.1); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(sp[0], sp[1], rx * 0.018, rx * 0.04, -0.3, 0, TAU); ctx.fill();
    // cool rim light on the left silhouette
    ctx.strokeStyle = E.lin(ctx, -rx, 0, -rx * 0.35, 0, [[0, o.rimCol || '#A9E4FF', 0.85], [1, o.rimCol || '#A9E4FF', 0]]);
    ctx.lineWidth = rx * 0.022; ctx.stroke(body);
    ctx.restore();
  }
  function bowlStreams(ctx, G, ov, t) {
    const th = [-0.98, -0.45, 0.06, 0.55, 1.02], wk = [0.75, 1.0, 1.3, 0.95, 0.7];
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let k = 0; k < 5; k++) {
      const prog = clamp(ov * 1.5 - k * 0.07 - (k % 2) * 0.06);
      if (prog <= 0) continue;
      const a = th[k] + 0.03 * Math.sin(t * 0.7 + k);
      const pts = [[G.rx * Math.sin(a) * 0.985, G.ry * Math.cos(a) - G.rx * 0.012]];
      for (let j = 1; j <= 9; j++) { const q = G.surf(a, (j / 9) * 0.84); pts.push([q[0] * 1.012, q[1]]); }
      const last = pts[pts.length - 1], land = G.depth + G.ry * 0.1 * Math.cos(a) + G.rx * 0.04;
      pts.push([last[0] * 1.03, lerp(last[1], land, 0.5)], [last[0] * 1.045, land]);
      const pl = sampleCurve(pts, 40), cum = cumLen(pl), L = cum[cum.length - 1];
      const seg = subPoly(pl, cum, 0, L * prog), wd = G.rx * 0.05 * wk[k];
      if (seg.length < 2) continue;
      const path = new Path2D(); polyPath(path, seg, false);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,181,71,0.22)'; ctx.lineWidth = wd * 3.2; ctx.stroke(path);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#FFB547'; ctx.lineWidth = wd; ctx.stroke(path);
      ctx.strokeStyle = '#FFE7A0'; ctx.lineWidth = wd * 0.5; ctx.stroke(path);
      ctx.setLineDash([wd * 1.2, wd * 3.4]); ctx.lineDashOffset = -t * 160 - k * 37;
      ctx.strokeStyle = 'rgba(255,253,240,0.9)'; ctx.lineWidth = wd * 0.28; ctx.stroke(path); ctx.setLineDash([]);
      const hd = seg[seg.length - 1];
      if (prog < 1) { ctx.fillStyle = '#FFD27A'; ctx.beginPath(); ctx.arc(hd[0], hd[1], wd * 0.62, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }

  let reflBuf = null, reflBuf2 = null;
  A.iznikBowl = (ctx, o = {}) => {
    const t = o.t || 0, bp = bowlParams(o), { rx, ry, depth, widen } = bp;
    const G = bowlGeom(rx, ry, depth), s = G.s;
    const dim = clamp(o.dim || 0), lit = clamp(dv(o.lit, 1)), honey = Math.max(0, o.honey || 0), ov = clamp(o.overflow || 0);
    const cmOut = (c) => (dim > 0 ? E.mix(c, BC.dim, dim * 0.7) : c);
    const th = rx * 0.028, irx = rx - th, iry = ry * (irx / rx);
    const yo = ry * 0.5 * dv(o.innerDepth, 1);
    const W = (px, py) => [px * irx, py * iry + yo * (1 - px * px - py * py)];
    const fc = W(0, 0);
    ctx.save();
    // ---- reflection (mirror about y = depth) ----
    if (o.reflection) {
      const sc = scaleOf(ctx), rs = Math.min(0.8, 0.42 * sc + 0.06);
      const x0 = -rx * 1.15, y0 = depth, bw = rx * 2.3, bh = depth + ry * 1.2;
      const cw = Math.max(8, Math.ceil(bw * rs)), chh = Math.max(8, Math.ceil(bh * rs));
      if (!reflBuf || reflBuf.w < cw + 4 || reflBuf.h < chh + 4) { reflBuf = E.canvas(Math.max(cw + 4, reflBuf ? reflBuf.w : 0), Math.max(chh + 4, reflBuf ? reflBuf.h : 0)); reflBuf2 = E.canvas(reflBuf.w, reflBuf.h); }
      const l = reflBuf.x;
      l.setTransform(1, 0, 0, 1, 0, 0); l.globalAlpha = 1; l.globalCompositeOperation = 'source-over'; l.filter = 'none'; l.clearRect(0, 0, cw + 2, chh + 2);
      l.setTransform(rs, 0, 0, rs, -x0 * rs, -y0 * rs);
      l.save(); l.translate(0, 2 * depth); l.scale(1, -1);
      l.fillStyle = '#B8ACA0'; l.beginPath(); l.ellipse(0, 0, rx, ry, 0, 0, TAU); l.fill();
      bowlExterior(l, G, o, cmOut, t);
      if (ov > 0) bowlStreams(l, G, ov, t);
      l.restore();
      l.globalCompositeOperation = 'destination-in';
      l.fillStyle = E.lin(l, 0, depth, 0, 2 * depth + ry, [[0, '#000', 1], [0.55, '#000', 0.45], [1, '#000', 0]]);
      l.fillRect(x0, y0, bw, bh);
      const l2 = reflBuf2.x; l2.setTransform(1, 0, 0, 1, 0, 0); l2.globalCompositeOperation = 'copy'; l2.filter = `blur(${Math.max(0.8, 3 * sc * rs * 0.8).toFixed(2)}px)`;
      l2.drawImage(reflBuf.c, 0, 0); l2.filter = 'none'; l2.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.globalAlpha *= 0.35;
      ctx.drawImage(reflBuf2.c, 0, 0, cw, chh, x0, y0, cw / rs, chh / rs);
      ctx.restore();
    }
    // ---- contact shadow ----
    if (o.shadow !== false) {
      ctx.fillStyle = E.rad(ctx, 0, depth, 0, G.fR2 * 1.5, [[0, '#0A0610', 0.55], [0.6, '#0A0610', 0.22], [1, '#0A0610', 0]]);
      ctx.save(); ctx.translate(0, depth); ctx.scale(1, Math.max(0.12, s * 0.9)); ctx.translate(0, -depth);
      ctx.beginPath(); ctx.arc(0, depth, G.fR2 * 1.5, 0, TAU); ctx.fill(); ctx.restore();
    }
    // ---- exterior ----
    bowlExterior(ctx, G, o, cmOut, t);
    // ---- interior ----
    const inner = new Path2D(); inner.ellipse(0, 0, irx, iry, 0, 0, TAU);
    ctx.save(); ctx.clip(inner);
    ctx.fillStyle = E.rad(ctx, fc[0], fc[1], 0, rx * 1.02, [[0, '#FFFFFF'], [0.5, '#F5EFE5'], [0.85, '#E4DACB'], [1, '#CFC3B3']]);
    ctx.fillRect(-rx, -ry, rx * 2, ry * 2 + yo);
    const lw = rx * 0.0095, unf = widen;
    const hasR = o.litRadius !== undefined && o.litRadius !== null;
    const rhoL = hasR ? Math.max(0, o.litRadius) / irx : 2;
    if (lit < 1 || hasR) bowlInnerPattern(ctx, W, (c) => E.mix(c, BC.dim, 0.8), unf, lw);
    if (lit > 0 && rhoL > 0.002) {
      ctx.save();
      if (hasR && rhoL < 1.2) {
        const rp = []; for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; rp.push(W(rhoL * Math.cos(a), rhoL * Math.sin(a))); }
        ctx.beginPath(); polyPath(ctx, rp, true); ctx.clip();
      }
      ctx.globalAlpha *= lit;
      bowlInnerPattern(ctx, W, dim > 0 ? (c) => E.mix(c, BC.dim, dim * 0.82) : (c) => c, unf, lw);
      ctx.restore();
      if (hasR && rhoL < 1.2) {
        const rp = []; for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; rp.push(W(rhoL * Math.cos(a), rhoL * Math.sin(a))); }
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); polyPath(ctx, rp, true);
        ctx.strokeStyle = E.rgba('#FFB547', 0.16 * lit); ctx.lineWidth = rx * 0.07; ctx.stroke();
        ctx.strokeStyle = E.rgba('#FFE7A0', 0.35 * lit); ctx.lineWidth = rx * 0.012; ctx.stroke(); ctx.restore();
      }
      if (honey > 0 || hasR) S.light(ctx, fc[0], fc[1], Math.min(rx * 1.1, (hasR ? o.litRadius : rx) * 1.25 + honey), '#FFB547', 0.22 * lit);
    }
    // inner rim shadow (crescent on the far wall) + floor shade
    ctx.fillStyle = 'rgba(58,40,84,0.22)';
    ctx.beginPath(); ctx.ellipse(0, 0, irx, iry, 0, 0, TAU); ctx.ellipse(-irx * 0.08, iry * 0.34, irx * 0.97, iry * 0.98, 0, 0, TAU); ctx.fill('evenodd');
    // glaze gloss window on the back-left inner wall
    const gw = W(-0.5, -0.6);
    ctx.save(); ctx.translate(gw[0], gw[1]); ctx.rotate(-0.42);
    ctx.fillStyle = E.rad(ctx, 0, 0, 0, rx * 0.2, [[0, '#FFFFFF', 0.7], [0.5, '#FFFFFF', 0.25], [1, '#FFFFFF', 0]]);
    ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.2, Math.max(2, iry * 0.16), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(-rx * 0.03, 0, rx * 0.07, Math.max(1, iry * 0.035), 0, 0, TAU); ctx.fill();
    ctx.restore();
    // honey pool
    if (honey > 0) {
      const hry = Math.max(1, honey * s * 1.05);
      S.light(ctx, fc[0], fc[1], honey * 2.8, '#FFB547', 0.45);
      ctx.fillStyle = E.rad(ctx, fc[0] - honey * 0.2, fc[1] - hry * 0.3, 0, honey * 1.15, [[0, '#FFF3C4'], [0.45, '#FFD27A'], [0.85, '#FFB547'], [1, '#E08A1E']]);
      ctx.beginPath(); ctx.ellipse(fc[0], fc[1], honey, hry, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,244,210,0.8)'; ctx.lineWidth = Math.max(1, honey * 0.05);
      ctx.beginPath(); ctx.ellipse(fc[0], fc[1] - hry * 0.06, honey * 0.93, hry * 0.86, 0, PI * 1.08, PI * 1.92); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(fc[0] - honey * 0.38, fc[1] - hry * 0.38, honey * 0.16, hry * 0.17, 0, 0, TAU); ctx.fill();
    }
    // overflow: brimming honey-light surface
    if (ov > 0) {
      const a = clamp(ov * 2.5), sy = iry * 0.1;
      ctx.globalAlpha *= a;
      ctx.fillStyle = E.rad(ctx, -irx * 0.15, sy - iry * 0.2, 0, irx * 1.1, [[0, '#FFFBEA'], [0.35, '#FFE7A0'], [0.75, '#FFC15E'], [1, '#F5A23A']]);
      ctx.beginPath(); ctx.ellipse(0, sy, irx * 0.985, iry * 0.93, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { const ph = mod(t * 0.35 + k / 3, 1); ctx.strokeStyle = E.rgba('#FFFFFF', 0.3 * (1 - ph)); ctx.lineWidth = rx * 0.01; ctx.beginPath(); ctx.ellipse(0, sy, irx * 0.9 * ph + 2, iry * 0.85 * ph + 1, 0, 0, TAU); ctx.stroke(); }
      S.light(ctx, 0, sy, rx * 1.1, '#FFE7A0', 0.4);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    // ---- rim lip ----
    ctx.lineWidth = th * 1.15;
    ctx.strokeStyle = E.lin(ctx, -rx, 0, rx, 0, [[0, '#D9CFC0'], [0.4, '#FFFFFF'], [0.75, '#FFFDF8'], [1, '#E8DECF']]);
    ctx.beginPath(); ctx.ellipse(0, 0, rx - th * 0.5, Math.max(1, ry - th * 0.5 * s), 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(110,90,96,0.35)'; ctx.lineWidth = Math.max(0.6, th * 0.15);
    ctx.beginPath(); ctx.ellipse(0, 0, irx, iry, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = E.rgba(hx(cmOut(BC.cobalt)), 0.85); ctx.lineWidth = Math.max(0.8, th * 0.28);
    ctx.beginPath(); ctx.ellipse(0, 0, rx - th * 0.1, Math.max(1, ry - th * 0.1 * s), 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = th * 0.42; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, 0, rx - th * 0.5, Math.max(1, ry - th * 0.5 * s), 0, PI * 1.18, PI * 1.36); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, rx - th * 0.5, Math.max(1, ry - th * 0.5 * s), 0, PI * 0.12, PI * 0.3); ctx.stroke();
    // widen: light sweep along the rim
    if (widen > 0 && widen < 1) {
      const a0 = PI * 0.95 + widen * PI * 1.1, k = Math.sin(PI * widen);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = E.rgba('#FFE7B8', 0.4 * k); ctx.lineWidth = th * 1.8;
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, a0 - 0.35, a0 + 0.35); ctx.stroke();
      ctx.strokeStyle = E.rgba('#FFFFFF', 0.9 * k); ctx.lineWidth = th * 0.8;
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, a0 - 0.18, a0 + 0.18); ctx.stroke();
      ctx.restore();
    }
    if (ov > 0) {
      bowlStreams(ctx, G, ov, t);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const pr = rx * (0.6 + 0.7 * ov);
      ctx.fillStyle = E.rad(ctx, 0, depth, 0, pr, [[0, '#FFE7A0', 0.55 * ov], [0.5, '#FFB547', 0.2 * ov], [1, '#FFB547', 0]]);
      ctx.translate(0, depth); ctx.scale(1, Math.max(0.15, s)); ctx.beginPath(); ctx.arc(0, 0, pr, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    return { rx, ry, depth, s, floor: fc, footR: G.fR2, innerRx: irx, innerRy: iry };
  };

  A.bowlSilhouette = (o = {}) => {
    const { rx, ry, depth } = bowlParams(o), G = bowlGeom(rx, ry, depth), s = G.s;
    const lowAt = (x) => { // max(body envelope, foot)
      let best = -1e9;
      for (let j = 0; j <= 36; j++) { const v = j / 36, r = G.R(v); if (r < Math.abs(x)) break; const y = G.Y(v) + s * Math.sqrt(r * r - x * x); if (y > best) best = y; }
      if (Math.abs(x) <= G.fR2) best = Math.max(best, G.yFB + s * Math.sqrt(G.fR2 * G.fR2 - x * x));
      return best < -1e8 ? 0 : best;
    };
    const pts = [];
    for (let i = 0; i <= 24; i++) { const a = PI * 1.5 + (i / 24) * PI * 0.5; pts.push([rx * Math.cos(a), ry * Math.sin(a)]); }
    const xs = []; for (let i = 0; i <= 40; i++) xs.push(rx * Math.cos((i / 40) * (PI / 2)));
    for (const x of xs) if (x > G.fR2) pts.push([x, lowAt(x)]);
    pts.push([G.fR2, G.yFB + 0.0], [G.fR2, depth]);
    for (let i = xs.length - 1; i >= 0; i--) { const x = xs[i]; if (x > G.fR2) pts.push([x, 2 * depth - lowAt(x)]); }
    for (let i = 0; i <= 48; i++) { const a = (i / 48) * PI; pts.push([rx * Math.cos(a), 2 * depth + ry * Math.sin(a)]); }
    for (const x of xs) if (x > G.fR2) pts.push([-x, 2 * depth - lowAt(x)]);
    pts.push([-G.fR2, depth]);
    for (let i = xs.length - 1; i >= 0; i--) { const x = xs[i]; if (x > G.fR2) pts.push([-x, lowAt(x)]); }
    for (let i = 0; i <= 24; i++) { const a = PI + (i / 24) * PI * 0.5; pts.push([rx * Math.cos(a), ry * Math.sin(a)]); }
    return A.resample(pts, 128);
  };

  /* =====================================================================================
   * HOURGLASS
   * ===================================================================================== */
  function hgGeom(o) {
    const h = dv(o.h, 640), w = dv(o.w, h * 0.7), neck = dv(o.neck, w * 0.06);
    const capH = h * 0.05, s = dv(o.view, 0.2), capR = w * 0.5 * 1.08;
    const H2 = h / 2 - capH, nr = neck / 2, Wr = w / 2;
    const X = (y) => { const u = clamp(1 - Math.abs(y) / H2); const g = Math.pow(Math.max(0, 1 - Math.pow(u, 2.3)), 0.62); const sh = 0.84 + 0.16 * sm(u / 0.17); return nr + (Wr - nr) * g * sh; };
    return { h, w, neck, capH, s, capR, H2, nr, Wr, X };
  }
  function hgGlassPts(G, n = 40) {
    const R = [];
    for (let i = 0; i <= n; i++) { const y = -G.H2 * Math.pow(1 - i / n, 1.6); R.push([G.X(y), y]); }
    for (let i = n - 1; i >= 0; i--) { const y = G.H2 * Math.pow(1 - i / n, 1.6); R.push([G.X(y), y]); }
    const L = R.map((p) => [-p[0], p[1]]).reverse();
    return R.concat(L);
  }
  function woodSide(ctx, x0, x1) { return E.lin(ctx, x0, 0, x1, 0, [[0, '#3E2414'], [0.24, '#A87448'], [0.4, '#C48C58'], [0.62, '#7A4E2E'], [1, '#2E1A0E']]); }
  function hgCap(ctx, G, yA) {
    const { capR, capH, s } = G, ry = capR * s;
    const side = new Path2D();
    side.moveTo(-capR, yA); side.lineTo(-capR, yA + capH); side.ellipse(0, yA + capH, capR, ry, 0, PI, 0, true); side.lineTo(capR, yA); side.closePath();
    ctx.fillStyle = woodSide(ctx, -capR, capR); ctx.fill(side);
    ctx.strokeStyle = BRASS(ctx, -capR, capR); ctx.lineWidth = capH * 0.18;
    ctx.beginPath(); ctx.ellipse(0, yA + capH * 0.55, capR, ry, 0, 0, PI); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,10,4,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, yA + capH, capR, ry, 0, 0, PI); ctx.stroke();
    ctx.fillStyle = E.rad(ctx, -capR * 0.3, yA - ry * 0.4, 0, capR * 1.2, [[0, '#C79060'], [0.6, '#94603A'], [1, '#6A4026']]);
    ctx.beginPath(); ctx.ellipse(0, yA, capR, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(60,30,14,0.45)'; ctx.lineWidth = 1.2;
    for (const k of [0.78, 0.55]) { ctx.beginPath(); ctx.ellipse(0, yA, capR * k, ry * k, 0, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = BRASS(ctx, -capR, capR); ctx.lineWidth = Math.max(1.5, capH * 0.14);
    ctx.beginPath(); ctx.ellipse(0, yA, capR * 0.985, ry * 0.985, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,200,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, yA, capR * 0.97, ry * 0.95, 0, PI * 1.05, PI * 1.6); ctx.stroke();
  }
  function hgPost(ctx, G, x, dy) {
    const pr = G.w * 0.024, y0 = -G.H2 + dy, y1 = G.H2 + dy;
    const beads = [-G.H2 * 0.62, -G.H2 * 0.08, G.H2 * 0.08, G.H2 * 0.62].map((b) => b + dy);
    const prof = (y) => { let r = pr; for (const b of beads) r += pr * 0.75 * Math.exp(-Math.pow((y - b) / (pr * 1.3), 2)); r += pr * 0.6 * (Math.exp(-Math.pow((y - y0) / (pr * 1.6), 2)) + Math.exp(-Math.pow((y - y1) / (pr * 1.6), 2))); return r; };
    const pts = [], n = 60;
    for (let i = 0; i <= n; i++) { const y = lerp(y0, y1, i / n); pts.push([x + prof(y), y]); }
    for (let i = n; i >= 0; i--) { const y = lerp(y0, y1, i / n); pts.push([x - prof(y), y]); }
    ctx.fillStyle = woodSide(ctx, x - pr * 1.8, x + pr * 1.8);
    ctx.beginPath(); polyPath(ctx, pts, true); ctx.fill();
    ctx.fillStyle = BRASS(ctx, x - pr * 1.8, x + pr * 1.8);
    for (const b of [beads[1], beads[2]]) { ctx.beginPath(); ctx.ellipse(x, (b + (b < dy ? -pr * 0.2 : pr * 0.2)), prof(b) * 1.02, pr * 0.32, 0, 0, TAU); ctx.fill(); }
  }
  A.hourglass = (ctx, o = {}) => {
    const G = hgGeom(o), t = o.t || 0, ga = clamp(dv(o.glassAlpha, 1));
    const sT = clamp(dv(o.sandTop, 0.6)), sB = clamp(dv(o.sandBottom, 0.3)), flow = Math.max(0, dv(o.flow, sT > 0 ? 0.8 : 0));
    const { h, capH, capR, s, H2, X } = G;
    const glass = new Path2D(); crPath(glass, hgGlassPts(G), true);
    ctx.save();
    hgCap(ctx, G, H2);
    ctx.save(); ctx.globalAlpha *= 0.5; hgPost(ctx, G, 0, -capR * 0.9 * s * 0.5); ctx.restore();
    ctx.fillStyle = E.rgba('#9FD8EA', 0.08 * ga); ctx.fill(glass);
    ctx.save(); ctx.clip(glass);
    const sandG = (x0, x1) => E.lin(ctx, x0, 0, x1, 0, [[0, '#FFDF8E'], [0.47, '#F5C25E'], [0.53, '#DDA042'], [1, '#A86E28']]);
    let yPk = H2 - 2;
    if (sB > 0.004) {
      const yBot = H2 + 2, baseH = sB * H2 * 0.4, coneH = sB * H2 * 0.36 + 3;
      const yB = H2 - baseH, xr = X(yB); yPk = yB - coneH;
      const pts = [];
      for (let i = 0; i <= 10; i++) { const y = lerp(yBot, yB, i / 10); pts.push([-X(y) - 2, y]); }
      for (let i = 0; i <= 24; i++) { const u = i / 24, x = lerp(-xr - 2, xr + 2, u), q = Math.abs(u * 2 - 1); pts.push([x, yB - coneH * Math.pow(1 - q, 1.35) + coneH * 0.04 * Math.sin(u * PI)]); }
      for (let i = 0; i <= 10; i++) { const y = lerp(yB, yBot, i / 10); pts.push([X(y) + 2, y]); }
      ctx.fillStyle = sandG(-xr, xr); ctx.beginPath(); polyPath(ctx, pts, true); ctx.fill();
      ctx.fillStyle = 'rgba(120,70,20,0.18)'; ctx.fillRect(-G.Wr, yB, G.Wr * 2, H2);
      ctx.strokeStyle = 'rgba(255,240,190,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-xr * 0.7, yB - coneH * 0.25); ctx.lineTo(0, yPk + 1); ctx.stroke();
    }
    if (sT > 0.004) {
      const yL = lerp(-G.nr * 2, -H2 + capH * 0.3, Math.pow(sT, 0.72));
      const pts = []; const n = 22;
      for (let i = 0; i <= n; i++) { const y = lerp(yL, 2, i / n); pts.push([X(y) + 1, y]); }
      for (let i = n; i >= 0; i--) { const y = lerp(yL, 2, i / n); pts.push([-X(y) - 1, y]); }
      ctx.fillStyle = sandG(-X(yL), X(yL)); ctx.beginPath(); polyPath(ctx, pts, true); ctx.fill();
      const xr = X(yL), er = Math.max(1, xr * s);
      ctx.fillStyle = E.lin(ctx, -xr, 0, xr, 0, [[0, '#FFEDB0'], [0.5, '#F9D683'], [1, '#E2AE55']]);
      ctx.beginPath(); ctx.ellipse(0, yL, xr, er, 0, 0, TAU); ctx.fill();
      if (flow > 0.01) {
        const dr = xr * clamp(0.18 + 0.25 * flow, 0, 0.6);
        ctx.fillStyle = E.rad(ctx, 0, yL + er * 0.1, 0, dr, [[0, '#B07A34', 0.75], [0.55, '#D9A250', 0.4], [1, '#E9BC6C', 0]]);
        ctx.beginPath(); ctx.ellipse(0, yL + er * 0.1, dr, er * 0.7, 0, 0, TAU); ctx.fill();
      }
    }
    if (flow > 0.01 && sT > 0.002) A.sand(ctx, t, { x: 0, y: -G.nr, len: yPk + G.nr, flow, w: Math.max(1.2, G.w * 0.004), speed: h * 0.9 });
    ctx.restore();
    // glass front
    ctx.fillStyle = E.rgba('#CFF3FF', 0.16 * ga); ctx.fill(glass);
    ctx.save(); ctx.clip(glass);
    ctx.lineWidth = G.w * 0.12; ctx.strokeStyle = E.rgba('#E6FBFF', 0.16 * ga); ctx.stroke(glass);
    ctx.lineWidth = G.w * 0.035; ctx.strokeStyle = E.rgba('#FFFFFF', 0.22 * ga); ctx.stroke(glass);
    for (const sg of [-1, 1]) {
      const st = [], st2 = [];
      for (let i = 0; i <= 14; i++) { const u = lerp(0.1, 0.78, i / 14), y = sg * H2 * (1 - u); st.push([-X(y) * 0.66, y]); st2.push([-X(y) * 0.5, y]); }
      for (let i = 14; i >= 0; i--) { const u = lerp(0.1, 0.78, i / 14), y = sg * H2 * (1 - u); st.push([-X(y) * 0.52, y]); st2.push([-X(y) * 0.46, y]); }
      ctx.fillStyle = E.lin(ctx, 0, sg * H2 * 0.9, 0, sg * H2 * 0.2, [[0, '#FFFFFF', 0.55 * ga], [1, '#FFFFFF', 0.05 * ga]]);
      ctx.beginPath(); crPath(ctx, st, true); ctx.fill();
      ctx.fillStyle = E.rgba('#FFFFFF', 0.3 * ga); ctx.beginPath(); crPath(ctx, st2, true); ctx.fill();
      const hy = sg * H2 * 0.72; ctx.fillStyle = E.rgba('#FFFFFF', 0.8 * ga);
      ctx.beginPath(); ctx.ellipse(X(hy) * 0.55, hy, G.w * 0.012, G.w * 0.03, 0.2, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = E.lin(ctx, G.Wr * 0.3, 0, G.Wr, 0, [[0, '#7FE0D2', 0], [1, '#7FE0D2', 0.7 * ga]]); ctx.lineWidth = G.w * 0.025; ctx.stroke(glass);
    ctx.restore();
    ctx.strokeStyle = E.rgba('#EFFDFF', 0.6 * ga); ctx.lineWidth = Math.max(1.2, G.w * 0.004); ctx.stroke(glass);
    const fx = capR * 0.9 * 0.866, fdy = capR * 0.9 * s * 0.5;
    hgPost(ctx, G, -fx, fdy); hgPost(ctx, G, fx, fdy);
    hgCap(ctx, G, -h / 2);
    ctx.restore();
    return G;
  };
  A.hourglassSilhouette = (o = {}) => {
    const G = hgGeom(o), { capR, capH, s, h } = G, ry = capR * s, pts = [];
    for (let i = 0; i <= 16; i++) { const a = PI * 1.5 + (i / 16) * PI * 0.5; pts.push([capR * Math.cos(a), -h / 2 + ry * Math.sin(a)]); }
    pts.push([capR, -h / 2 + capH]);
    const gp = hgGlassPts(G, 30), half = gp.length / 2;
    for (let i = 0; i < half; i++) pts.push(gp[i]);
    pts.push([capR, h / 2 - capH]);
    for (let i = 0; i <= 32; i++) { const a = (i / 32) * PI; pts.push([capR * Math.cos(a), h / 2 + ry * Math.sin(a)]); }
    pts.push([-capR, h / 2 - capH]);
    for (let i = half; i < gp.length; i++) pts.push(gp[i]);
    pts.push([-capR, -h / 2 + capH]);
    for (let i = 0; i <= 16; i++) { const a = PI + (i / 16) * PI * 0.5; pts.push([capR * Math.cos(a), -h / 2 + ry * Math.sin(a)]); }
    return A.resample(pts, 128);
  };

  /* =====================================================================================
   * KANDIL (oil lamp)
   * ===================================================================================== */
  function flamePath(ctx, w, h, tip) {
    ctx.beginPath();
    ctx.moveTo(tip, -h);
    ctx.bezierCurveTo(tip * 0.4 + w * 0.3, -h * 0.55, w * 1.08, -w * 1.7, w, -w);
    ctx.arc(0, -w, w, 0, PI, false);
    ctx.bezierCurveTo(-w * 1.08, -w * 1.7, tip * 0.4 - w * 0.3, -h * 0.55, tip, -h);
    ctx.closePath();
  }
  A.kandil = (ctx, o = {}) => {
    const size = dv(o.size, 200), u = size / 200, t = o.t || 0;
    const lit = clamp(dv(o.lit, 1)), oil = clamp(dv(o.oil, 0.6));
    const ember = o.ember === true ? 1 : clamp(o.ember || 0);
    const fs = clamp(dv(o.flame, 1), 0, 2) * lit * (1 - ember);
    const fy0 = -170 * u;
    const fh = 66 * u * fs * (1 + 0.07 * E.noise(t * 9, 3) + 0.05 * E.noise(t * 23, 5));
    const fw = 13 * u * Math.sqrt(Math.max(0, fs)) * (1 + 0.05 * E.noise(t * 7, 8));
    const tip = fh * (0.16 * E.noise(t * 2.3, 11) + 0.07 * E.noise(t * 6.1, 12));
    const glowA = lit * (1 - ember) * clamp(fs, 0, 1.4);
    ctx.save();
    if (o.light !== false && glowA > 0.01) S.light(ctx, 0, fy0 - fh * 0.4, dv(o.lightR, size * 1.9) * (0.9 + 0.1 * fs), '#FFB34D', 0.35 * glowA * (0.92 + 0.08 * E.noise(t * 11, 4)));
    if (ember > 0.01) S.light(ctx, 0, fy0, 60 * u, '#FF7A3D', 0.55 * ember);
    // foot
    ctx.fillStyle = 'rgba(10,6,14,0.35)'; ctx.beginPath(); ctx.ellipse(0, 2 * u, 46 * u, 9 * u, 0, 0, TAU); ctx.fill();
    const foot = new Path2D();
    foot.moveTo(-36 * u, 0); foot.bezierCurveTo(-34 * u, -8 * u, -12 * u, -14 * u, -10 * u, -30 * u); foot.lineTo(-13 * u, -38 * u); foot.bezierCurveTo(-16 * u, -44 * u, -22 * u, -46 * u, -26 * u, -52 * u);
    foot.lineTo(26 * u, -52 * u); foot.bezierCurveTo(22 * u, -46 * u, 16 * u, -44 * u, 13 * u, -38 * u); foot.lineTo(10 * u, -30 * u); foot.bezierCurveTo(12 * u, -14 * u, 34 * u, -8 * u, 36 * u, 0);
    foot.ellipse(0, 0, 36 * u, 8 * u, 0, 0, PI, false); foot.closePath();
    ctx.fillStyle = BRASS(ctx, -36 * u, 36 * u); ctx.fill(foot);
    ctx.fillStyle = BRASS(ctx, -14 * u, 14 * u); ctx.beginPath(); ctx.ellipse(0, -34 * u, 14 * u, 4 * u, 0, 0, TAU); ctx.fill();
    // reservoir (glass bulb)
    const cy = -98 * u, brx = 62 * u, bry = 48 * u;
    const bulb = new Path2D();
    bulb.moveTo(-25 * u, -151 * u); bulb.bezierCurveTo(-25 * u, -144 * u, -36 * u, -143 * u, -46 * u, -136 * u);
    bulb.bezierCurveTo(-64 * u, -124 * u, -66 * u, -100 * u, -62 * u, -88 * u); bulb.bezierCurveTo(-56 * u, -62 * u, -30 * u, -50 * u, 0, -50 * u);
    bulb.bezierCurveTo(30 * u, -50 * u, 56 * u, -62 * u, 62 * u, -88 * u); bulb.bezierCurveTo(66 * u, -100 * u, 64 * u, -124 * u, 46 * u, -136 * u);
    bulb.bezierCurveTo(36 * u, -143 * u, 25 * u, -144 * u, 25 * u, -151 * u); bulb.closePath();
    ctx.fillStyle = E.rgba('#3A2A30', 0.25); ctx.fill(bulb);
    ctx.save(); ctx.clip(bulb);
    const oy = lerp(cy + bry * 0.92, cy - bry * 0.82, oil);
    if (oil > 0.01) {
      ctx.fillStyle = E.lin(ctx, 0, oy, 0, cy + bry, [[0, '#F2B450', 0.8], [1, '#A85A14', 0.85]]); ctx.fillRect(-brx, oy, brx * 2, bry * 2.2);
      const sw = brx * Math.sqrt(Math.max(0, 1 - Math.pow((oy - cy) / bry, 2)));
      ctx.fillStyle = E.rgba('#FFD27A', 0.85); ctx.beginPath(); ctx.ellipse(0, oy, Math.max(1, sw), Math.max(1, sw * 0.2), 0, 0, TAU); ctx.fill();
      if (glowA > 0.01) { ctx.globalCompositeOperation = 'lighter'; S.light(ctx, 0, oy + bry * 0.25, brx * 1.1, '#FFB34D', 0.4 * glowA); ctx.globalCompositeOperation = 'source-over'; }
    }
    ctx.lineWidth = brx * 0.22; ctx.strokeStyle = E.rgba('#FFF2DC', 0.14); ctx.stroke(bulb);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(-brx * 0.52, cy - bry * 0.18, brx * 0.09, bry * 0.5, 0.35, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(-brx * 0.3, cy - bry * 0.62, brx * 0.08, bry * 0.08, 0, 0, TAU); ctx.fill();
    if (glowA > 0.01) { ctx.fillStyle = E.rgba('#FFC870', 0.35 * glowA); ctx.beginPath(); ctx.ellipse(brx * 0.42, cy - bry * 0.45, brx * 0.12, bry * 0.07, -0.5, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,245,225,0.55)'; ctx.lineWidth = 1.3 * u; ctx.stroke(bulb);
    // brass straps (meridians + equator) and medallions
    ctx.lineCap = 'round';
    ctx.strokeStyle = BRASS(ctx, -brx, brx); ctx.lineWidth = 3.2 * u;
    ctx.beginPath(); ctx.ellipse(0, cy, brx * 0.995, bry * 0.22, 0, 0, PI); ctx.stroke();
    for (const k of [-0.62, 0, 0.62]) { ctx.beginPath(); ctx.ellipse(0, cy, Math.max(0.5, Math.abs(k) * brx), bry * 0.99, 0, k < 0 ? PI * 0.5 : k > 0 ? -PI * 0.5 : -PI * 0.5, k < 0 ? PI * 1.5 : PI * 0.5, k < 0); ctx.stroke(); }
    for (const k of [-0.62, 0, 0.62]) { ctx.fillStyle = BRASS(ctx, k * brx - 7 * u, k * brx + 7 * u); ctx.beginPath(); ctx.arc(k * brx * 1.0, cy + bry * 0.21 * Math.sqrt(1 - k * k), 6 * u, 0, TAU); ctx.fill(); }
    // collar + wick holder
    const col = new Path2D(); col.moveTo(-32 * u, -150 * u); col.lineTo(-32 * u, -158 * u); col.ellipse(0, -158 * u, 32 * u, 7 * u, 0, PI, 0, true); col.lineTo(32 * u, -150 * u); col.ellipse(0, -150 * u, 32 * u, 7 * u, 0, 0, PI, false); col.closePath();
    ctx.fillStyle = BRASS(ctx, -32 * u, 32 * u); ctx.fill(col);
    ctx.fillStyle = glowA > 0.01 ? E.mix('#C99A4A', '#FFE3A1', 0.6 * glowA) : '#B88A3C';
    ctx.beginPath(); ctx.ellipse(0, -158 * u, 32 * u, 7 * u, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5A3A14'; ctx.beginPath(); ctx.ellipse(0, -158 * u, 20 * u, 4 * u, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = BRASS(ctx, -8 * u, 8 * u); ctx.beginPath(); ctx.moveTo(-8 * u, -158 * u); ctx.lineTo(-4 * u, -168 * u); ctx.lineTo(4 * u, -168 * u); ctx.lineTo(8 * u, -158 * u); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2A1A10'; ctx.lineWidth = 2.2 * u; ctx.beginPath(); ctx.moveTo(0, -167 * u); ctx.lineTo(tip * 0.05, fy0 - 3 * u); ctx.stroke();
    // flame
    if (fs > 0.02) {
      ctx.save(); ctx.translate(0, fy0 + 2 * u);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = E.rad(ctx, 0, -fh * 0.4, 0, fh * 1.5, [[0, '#FFB34D', 0.55 * glowA], [0.4, '#FF8A2A', 0.18 * glowA], [1, '#FF8A2A', 0]]);
      ctx.beginPath(); ctx.arc(0, -fh * 0.4, fh * 1.5, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      flamePath(ctx, fw, fh, tip); ctx.fillStyle = E.lin(ctx, 0, -fh, 0, 0, [[0, '#FF8A2A', 0.9], [0.45, '#FFB34D', 0.95], [1, '#FFD27A', 1]]); ctx.fill();
      flamePath(ctx, fw * 0.72, fh * 0.76, tip * 0.75); ctx.fillStyle = E.lin(ctx, 0, -fh * 0.76, 0, 0, [[0, '#FFC46A'], [1, '#FFE6A0']]); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = E.rgba('#5E9BFF', 0.45); ctx.beginPath(); ctx.ellipse(0, -fw * 0.55, fw * 0.62, fw * 0.5, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      flamePath(ctx, fw * 0.46, fh * 0.5, tip * 0.5); ctx.fillStyle = E.lin(ctx, 0, -fh * 0.5, 0, 0, [[0, '#FFF4C2'], [1, '#FFFFFF']]); ctx.fill();
      ctx.restore();
    }
    if (ember > 0.01) {
      const pu = 0.8 + 0.2 * E.noise(t * 3, 7), er = 6 * u;
      ctx.save(); ctx.globalAlpha *= ember;
      ctx.fillStyle = E.rad(ctx, 0, fy0, 0, er * 1.4, [[0, '#FFF0C0'], [0.35, '#FFB060'], [0.7, '#FF7A3D'], [1, '#B0301A']]);
      ctx.beginPath(); ctx.arc(0, fy0, er * (0.9 + 0.1 * pu), 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; S.light(ctx, 0, fy0, er * 6, '#FF7A3D', 0.5 * pu);
      ctx.restore();
      A.wisps(ctx, t, { x: 0, y: fy0 - er, n: 3, seed: 77, col: '#9C8CA8', rise: 26 * u, life: 2.6, spread: 3 * u, w: 2.2 * u, curl: 6 * u, op: 'source-over', alpha: 0.22 * ember });
    }
    ctx.restore();
    return { fx: tip * 0.3, fy: fy0 - fh * 0.42, fh };
  };

  /* =====================================================================================
   * BELL JAR
   * ===================================================================================== */
  A.bellJar = (ctx, o = {}) => {
    const w = dv(o.w, 200), h = dv(o.h, 300), t = o.t || 0, s = dv(o.view, 0.16), rw = w / 2;
    const bh = h * 0.075, knobR = w * 0.07, yb = -bh, yTop = -h + knobR * 2.1, rTop = rw * 0.92;
    const tint = o.tint || '#BFE8FF';
    const dome = new Path2D();
    dome.moveTo(-rw, yb); dome.lineTo(-rw * 0.985, yTop + rTop);
    dome.bezierCurveTo(-rw * 0.98, yTop + rTop * 0.22, -rw * 0.56, yTop, 0, yTop);
    dome.bezierCurveTo(rw * 0.56, yTop, rw * 0.98, yTop + rTop * 0.22, rw * 0.985, yTop + rTop);
    dome.lineTo(rw, yb); dome.ellipse(0, yb, rw, rw * s, 0, 0, PI, false); dome.closePath();
    ctx.save();
    // brass base: two tiers
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
    // back of glass
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, yb, rw * 0.99, rw * s * 0.99, 0, PI, TAU); ctx.stroke();
    ctx.fillStyle = E.rgba(tint, 0.06); ctx.fill(dome);
    if (o.content) { ctx.save(); if (o.clip !== false) ctx.clip(dome); ctx.translate(0, yb); o.content(ctx); ctx.restore(); }
    // glass front
    ctx.fillStyle = E.rgba(tint, 0.12); ctx.fill(dome);
    ctx.save(); ctx.clip(dome);
    ctx.lineWidth = w * 0.16; ctx.strokeStyle = E.rgba('#E2F6FF', 0.16); ctx.stroke(dome);
    ctx.lineWidth = w * 0.04; ctx.strokeStyle = E.rgba('#FFFFFF', 0.2); ctx.stroke(dome);
    const st = new Path2D();
    st.moveTo(-rw * 0.74, yb - bh * 0.6); st.lineTo(-rw * 0.74, yTop + rTop * 0.95); st.bezierCurveTo(-rw * 0.72, yTop + rTop * 0.42, -rw * 0.5, yTop + rTop * 0.18, -rw * 0.22, yTop + rTop * 0.12);
    st.lineTo(-rw * 0.2, yTop + rTop * 0.2); st.bezierCurveTo(-rw * 0.45, yTop + rTop * 0.28, -rw * 0.6, yTop + rTop * 0.5, -rw * 0.6, yTop + rTop * 0.98); st.lineTo(-rw * 0.6, yb - bh * 0.6); st.closePath();
    ctx.fillStyle = E.lin(ctx, 0, yTop, 0, yb, [[0, '#FFFFFF', 0.6], [0.5, '#FFFFFF', 0.32], [1, '#FFFFFF', 0.06]]); ctx.fill(st);
    ctx.fillStyle = E.lin(ctx, 0, yTop, 0, yb, [[0, '#FFFFFF', 0.35], [1, '#FFFFFF', 0]]); ctx.fillRect(-rw * 0.52, yTop + rTop * 0.45, rw * 0.05, (yb - yTop) * 0.7);
    ctx.fillStyle = E.lin(ctx, 0, yTop, 0, yb, [[0, '#FFFFFF', 0.25], [1, '#FFFFFF', 0.02]]); ctx.fillRect(rw * 0.58, yTop + rTop * 0.6, rw * 0.1, (yb - yTop) * 0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(-rw * 0.38, yTop + rTop * 0.2, rw * 0.06, rw * 0.025, -0.5, 0, TAU); ctx.fill();
    if (o.spec !== undefined && o.spec > 0 && o.spec < 1) {
      const x = lerp(-rw * 1.8, rw * 1.8, o.spec), bw = rw * 0.42;
      ctx.save(); ctx.transform(1, 0, -0.32, 1, 0, 0);
      ctx.fillStyle = E.lin(ctx, x - bw, 0, x + bw, 0, [[0, '#FFFFFF', 0], [0.45, '#FFFFFF', 0.5], [0.55, '#FFFFFF', 0.62], [1, '#FFFFFF', 0]]);
      ctx.fillRect(x - bw + (yTop + yb) * 0.16, yTop - 10, bw * 2 - (yTop + yb) * 0.0, yb - yTop + 20);
      ctx.restore();
    }
    ctx.strokeStyle = E.lin(ctx, rw * 0.3, 0, rw, 0, [[0, '#FFE3A3', 0], [1, '#FFE3A3', 0.55]]); ctx.lineWidth = w * 0.03; ctx.stroke(dome);
    ctx.restore();
    ctx.strokeStyle = 'rgba(240,252,255,0.6)'; ctx.lineWidth = Math.max(1, w * 0.007); ctx.stroke(dome);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(1.2, w * 0.012); ctx.beginPath(); ctx.ellipse(0, yb, rw, rw * s, 0, PI * 0.1, PI * 0.9); ctx.stroke();
    // knob
    ctx.fillStyle = E.rgba(tint, 0.25); ctx.fillRect(-knobR * 0.35, yTop - knobR * 0.6, knobR * 0.7, knobR * 0.7);
    ctx.fillStyle = E.rad(ctx, -knobR * 0.35, yTop - knobR * 1.35, 0, knobR * 1.2, [[0, '#FFFFFF', 0.9], [0.35, tint, 0.45], [1, '#7FB8D8', 0.35]]);
    ctx.beginPath(); ctx.arc(0, yTop - knobR * 1.05, knobR, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    // tag on string
    if (o.tag !== false) {
      const ax = rw * 0.08, ay = yTop - knobR * 0.35;
      const px = rw * 0.74, py = yTop + rTop * 0.3;
      const ang = 0.12 + dv(o.swing, 0.07) * Math.sin(t * 1.9 + 0.7) + 0.02 * Math.sin(t * 4.3);
      const L = h * 0.17, ex = px + Math.sin(ang) * L, ey = py + Math.cos(ang) * L;
      ctx.strokeStyle = '#E9DCC0'; ctx.lineWidth = Math.max(0.8, w * 0.006); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.bezierCurveTo(rw * 0.35, yTop - knobR * 0.1, rw * 0.62, yTop + rTop * 0.08, px, py);
      ctx.quadraticCurveTo(lerp(px, ex, 0.5) + Math.sin(ang) * 2, lerp(py, ey, 0.5), ex, ey); ctx.stroke();
      const tw = w * 0.17, tH = w * 0.25;
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(-ang * 1.25 + 0.05 * Math.sin(t * 2.6));
      const tag = new Path2D(); tag.moveTo(-tw * 0.22, 0); tag.lineTo(tw * 0.22, 0); tag.lineTo(tw / 2, tH * 0.2); tag.lineTo(tw / 2, tH); tag.lineTo(-tw / 2, tH); tag.lineTo(-tw / 2, tH * 0.2); tag.closePath();
      ctx.save(); ctx.translate(tw * 0.08, tH * 0.06); ctx.fillStyle = 'rgba(10,5,20,0.25)'; ctx.fill(tag); ctx.restore();
      ctx.fillStyle = E.lin(ctx, -tw / 2, 0, tw / 2, tH, [[0, '#FBF1DA'], [0.6, '#EFDDB6'], [1, '#D8C092']]); ctx.fill(tag);
      ctx.strokeStyle = 'rgba(140,100,50,0.5)'; ctx.lineWidth = Math.max(0.6, w * 0.004); ctx.stroke(tag);
      ctx.strokeStyle = 'rgba(180,140,80,0.35)'; ctx.beginPath(); ctx.rect(-tw * 0.36, tH * 0.32, tw * 0.72, tH * 0.58); ctx.stroke();
      ctx.fillStyle = BRASS(ctx, -tw * 0.1, tw * 0.1); ctx.beginPath(); ctx.arc(0, tH * 0.12, tw * 0.085, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5A4030'; ctx.beginPath(); ctx.arc(0, tH * 0.12, tw * 0.04, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  /* =====================================================================================
   * GIRIH GEOMETRY (Hankin polygons-in-contact on the 4.8.8 tiling)
   * ===================================================================================== */
  const geoCache = new Map();
  function polyStar(cx, cy, n, ap, a0, th, out) {
    const half = PI / n, tn = Math.tan(half);
    const sl = (ap * tn) / (Math.cos(th) + Math.sin(th) * tn);
    const px = ap - sl * Math.sin(th), py = sl * Math.cos(th);
    const poly = [];
    for (let k = 0; k < n; k++) {
      const a = a0 + k * 2 * half, ca = Math.cos(a), sa = Math.sin(a);
      poly.push([cx + ap * ca, cy + ap * sa], [cx + px * ca - py * sa, cy + px * sa + py * ca]);
    }
    out.push(poly);
  }
  // returns {oct:[poly], sq:[poly], segs:Float32Array (x1,y1,x2,y2,d1,d2)} around (0,0) inside box/radius
  function girihGeo(cell, angDeg, hw, hh, radial) {
    const key = `${cell}|${angDeg}|${Math.round(hw)}|${Math.round(hh)}|${radial ? 1 : 0}`;
    let g = geoCache.get(key);
    if (g) return g;
    const th = (angDeg * PI) / 180, c = cell, oct = [], sq = [];
    const nx = Math.ceil(hw / c) + 1, ny = Math.ceil(hh / c) + 1, R = Math.hypot(hw, hh);
    const inside = (x, y) => (radial ? Math.hypot(x, y) <= hw + c : Math.abs(x) <= hw + c && Math.abs(y) <= hh + c);
    for (let i = -nx; i <= nx; i++) for (let j = -ny; j <= ny; j++) {
      if (inside(i * c, j * c)) polyStar(i * c, j * c, 8, c / 2, 0, th, oct);
      const gx = (i + 0.5) * c, gy = (j + 0.5) * c;
      if (inside(gx, gy)) polyStar(gx, gy, 4, c * (0.5 - 0.5 / Math.SQRT2) * Math.SQRT2, PI / 4, th, sq);
    }
    const segs = [];
    for (const P of oct.concat(sq)) for (let k = 0; k < P.length; k++) {
      const a = P[k], b = P[(k + 1) % P.length];
      segs.push(a[0], a[1], b[0], b[1], Math.hypot(a[0], a[1]), Math.hypot(b[0], b[1]));
    }
    g = { oct, sq, segs: new Float32Array(segs), R };
    geoCache.set(key, g);
    return g;
  }
  function addSegs(p, g, front) {
    const s = g.segs;
    for (let i = 0; i < s.length; i += 6) {
      const d1 = s[i + 4], d2 = s[i + 5];
      if (front === undefined || (d1 <= front && d2 <= front)) { p.moveTo(s[i], s[i + 1]); p.lineTo(s[i + 2], s[i + 3]); continue; }
      const dn = Math.min(d1, d2), df = Math.max(d1, d2);
      if (front <= dn) continue;
      const u = (front - dn) / Math.max(1e-6, df - dn);
      const [ax, ay, bx, by] = d1 <= d2 ? [s[i], s[i + 1], s[i + 2], s[i + 3]] : [s[i + 2], s[i + 3], s[i], s[i + 1]];
      p.moveTo(ax, ay); p.lineTo(ax + (bx - ax) * u, ay + (by - ay) * u);
    }
  }
  const IRI = ['#6FF0FF', '#B48CFF', '#FF7AD9', '#FFE66D'];
  const GOLDC = ['#B8862E', '#F2D58E', '#C8922A', '#FFE7A0'];
  function cyc(pal, x) { const n = pal.length, f = mod(x, 1) * n, i = Math.floor(f); return E.mix(pal[i % n], pal[(i + 1) % n], f - i); }
  function radialStyle(ctx, r, pal, phase, cycles, a, fade = true) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    const N = 16;
    for (let k = 0; k <= N; k++) {
      const p = k / N, al = a * (fade ? 1 - sm((p - 0.72) / 0.28) : 1);
      const c = E.rgb(hx(cyc(pal, p * cycles + phase)));
      g.addColorStop(p, `rgba(${c[0]},${c[1]},${c[2]},${al})`);
    }
    return g;
  }

  // periodic tile (period = cell) holding relief + under + line + highlight, as a luminance image
  function girihTile(cell, ang, lw, relief, iri, col, sc) {
    const px = Math.max(24, Math.min(1024, Math.round(cell * sc)));
    const key = `gtile|${cell}|${ang}|${lw}|${relief.toFixed(2)}|${px}|${iri ? 1 : 0}|${col || ''}`;
    return S.sprite(key, px, px, (x) => {
      const k = px / cell; x.scale(k, k);
      const g = girihGeo(cell, ang, cell * 1.6, cell * 1.6, false);
      const path = new Path2D(); for (const P of g.oct) polyPath(path, P, true); for (const P of g.sq) polyPath(path, P, true);
      x.lineCap = 'round'; x.lineJoin = 'round';
      if (relief > 0) {
        const N = 7;
        for (let q = N; q >= 1; q--) {
          x.save(); x.translate(q * lw * 0.32 * relief, q * lw * 0.48 * relief);
          x.strokeStyle = q === N ? 'rgba(4,6,14,0.5)' : E.mix(iri ? '#3A3F78' : '#6A4612', iri ? '#20244A' : '#3A2408', q / N);
          x.lineWidth = lw * (q === N ? 1.5 : 1.15); x.stroke(path); x.restore();
        }
      }
      x.strokeStyle = 'rgba(10,8,20,0.5)'; x.lineWidth = lw * 2.1; x.stroke(path);
      x.strokeStyle = iri ? '#E6E6EE' : col || '#E8C06A'; x.lineWidth = lw; x.stroke(path);
      x.strokeStyle = 'rgba(255,255,250,0.8)'; x.lineWidth = Math.max(0.5, lw * 0.32); x.stroke(path);
    });
  }
  A.girih = (ctx, o = {}) => {
    const cx = o.cx || 0, cy = o.cy || 0, r = dv(o.r, 500), cell = dv(o.cell, 120), lw = dv(o.lineW, 3);
    const draw = clamp(dv(o.draw, 1)), relief = clamp(o.relief || 0), alpha = dv(o.alpha, 1);
    const g = girihGeo(cell, dv(o.angle, 67.5), r, r, true);
    if (draw <= 0) return;
    const front = draw >= 1 ? r * 1.01 : draw * r * 1.05;
    const iri = typeof o.hue === 'number';
    const pal = iri ? IRI : o.col ? [shadeH(o.col, -0.28), o.col, shadeH(o.col, -0.12), shadeH(o.col, 0.3)] : GOLDC, phase = iri ? o.hue : (o.t || 0) * 0.03;
    const m = ctx.getTransform();
    ctx.save(); ctx.translate(cx, cy); if (o.rot) ctx.rotate(o.rot);
    ctx.globalAlpha *= alpha;
    const fade = (p) => 1 - sm((p - 0.72) / 0.28);
    // tile fills
    if ((o.fill || o.fill2) && draw > 0) { // tiles grouped in radial bands, alpha fades at the rim
      ctx.save();
      const NB = 8;
      for (const [polys, colF] of [[g.oct, o.fill], [g.sq, o.fill2]]) {
        if (!colF) continue;
        ctx.fillStyle = colF;
        for (let bI = 0; bI < NB; bI++) {
          const lo = (bI / NB) * r * 1.05, hi = ((bI + 1) / NB) * r * 1.05;
          if (lo > front) break;
          ctx.beginPath(); let any = false;
          for (const P of polys) { const qx = (P[0][0] + P[8 % P.length][0]) / 2, qy = (P[0][1] + P[8 % P.length][1]) / 2, d = Math.hypot(qx, qy); if (d >= lo && d < hi && d <= front) { polyPath(ctx, P, true); any = true; } }
          if (!any) continue;
          ctx.globalAlpha = alpha * fade((lo + hi) / 2 / r); ctx.fill();
        }
      }
      ctx.restore();
    }
    if (draw >= 1 && !o.vector) { // fast path: periodic tile sprite → pattern, tinted in a layer
      const sc = scaleOf(ctx), tile = girihTile(cell, dv(o.angle, 67.5), lw, relief, iri, o.col, sc), k = tile.width / cell;
      const rot = o.rot || 0;
      const fillField = (l, scl) => {
        l.setTransform(m.a * scl, m.b * scl, m.c * scl, m.d * scl, m.e * scl, m.f * scl); l.translate(cx, cy); if (rot) l.rotate(rot);
        const pat = l.createPattern(tile, 'repeat'); pat.setTransform(new DOMMatrix([1 / k, 0, 0, 1 / k, 0, 0]));
        l.fillStyle = pat; l.beginPath(); l.arc(0, 0, r * 1.02, 0, TAU); l.fill();
      };
      const tint = (l) => {
        l.globalCompositeOperation = 'source-atop'; l.globalAlpha = iri ? 0.78 : 0.55;
        l.fillStyle = radialStyle(l, r, pal, phase, iri ? 1.3 : 3, 1, false); l.fillRect(-r * 1.05, -r * 1.05, r * 2.1, r * 2.1);
        if (o.sweep !== undefined && o.sweep > 0 && o.sweep < 1) {
          const sr = o.sweep * r, bw = r * 0.12, gg = l.createRadialGradient(0, 0, Math.max(0, sr - bw), 0, 0, sr + bw * 0.4);
          gg.addColorStop(0, 'rgba(255,230,109,0)'); gg.addColorStop(0.75, 'rgba(255,250,220,1)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
          l.globalAlpha = 0.9; l.fillStyle = gg; l.fillRect(-r * 1.05, -r * 1.05, r * 2.1, r * 2.1);
        }
        l.globalAlpha = 1; l.globalCompositeOperation = 'destination-in';
        l.fillStyle = E.rad(l, 0, 0, r * 0.72, r, [[0, '#000', 1], [1, '#000', 0]]); l.fillRect(-r * 1.05, -r * 1.05, r * 2.1, r * 2.1);
      };
      if (o.glow > 0) E.layer(ctx, (l) => { fillField(l, 0.5); tint(l); }, { lo: true, blur: Math.max(6, lw * 4 * sc), alpha: o.glow * alpha, op: 'lighter' });
      E.layer(ctx, (l) => { fillField(l, 1); tint(l); }, { alpha: ctx.globalAlpha });
      ctx.restore();
      return;
    }
    const path = new Path2D(); addSegs(path, g, draw >= 1 ? undefined : front);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (relief > 0) { // stacked copies → continuous extruded wall, darker toward the back
      const N = 4, side = iri ? ['#2A4A8A', '#4A2F7A', '#6A2A62', '#6A5A2A'] : ['#5A3A10', '#7A5418', '#6A4612', '#8A6420'];
      for (let k = N; k >= 1; k--) {
        ctx.save(); ctx.translate(k * lw * 0.56 * relief, k * lw * 0.84 * relief);
        ctx.strokeStyle = radialStyle(ctx, r, k === N ? ['#05070F'] : side, phase, 1.3, k === N ? 0.45 : 0.9);
        ctx.lineWidth = lw * (k === N ? 1.5 : 1.15); ctx.stroke(path); ctx.restore();
      }
    }
    ctx.strokeStyle = radialStyle(ctx, r, iri ? ['#0A1A30', '#1A0A30', '#2A0A28', '#2A200A'] : ['#3A2208'], phase, 1, 0.5);
    ctx.lineWidth = lw * 2.1; ctx.stroke(path);
    ctx.strokeStyle = radialStyle(ctx, r, pal, phase, iri ? 1.3 : 3, 1); ctx.lineWidth = lw; ctx.stroke(path);
    ctx.strokeStyle = radialStyle(ctx, r, iri ? ['#FFFFFF', '#E8F8FF', '#FFE8FA', '#FFFBE0'] : ['#FFF8E0'], phase, 1.3, 0.7); ctx.lineWidth = Math.max(0.5, lw * 0.32); ctx.stroke(path);
    if (o.sweep !== undefined && o.sweep > 0 && o.sweep < 1) {
      const sr = o.sweep * r, bw = r * 0.12;
      const gg = ctx.createRadialGradient(0, 0, Math.max(0, sr - bw), 0, 0, sr + bw * 0.4);
      gg.addColorStop(0, 'rgba(255,230,109,0)'); gg.addColorStop(0.75, 'rgba(255,246,200,0.95)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = gg; ctx.lineWidth = lw * 1.6; ctx.stroke(path); ctx.restore();
    }
    if (o.glow > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = radialStyle(ctx, r, pal, phase, 1.3, 0.12 * o.glow); ctx.lineWidth = lw * 5; ctx.stroke(path); ctx.restore(); }
    if (draw < 1 && draw > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = E.rgba(iri ? '#E8FDFF' : '#FFE7A0', 0.5 * (1 - draw)); ctx.lineWidth = lw * 1.4;
      ctx.beginPath(); ctx.arc(0, 0, front, 0, TAU); ctx.globalAlpha *= 0.25; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  };

  A.lattice = (ctx, o = {}) => {
    const w = dv(o.w, 400), h = dv(o.h, 400), cell = dv(o.cell, 80), lw = dv(o.lineW, cell * 0.12);
    const x0 = dv(o.x, -w / 2), y0 = dv(o.y, -h / 2), lum = clamp(o.luminous || 0), alpha = dv(o.alpha, 1);
    const cx = x0 + w / 2, cy = y0 + h / 2;
    const g = girihGeo(cell, dv(o.angle, 67.5), w / 2, h / 2, false);
    const col = hx(o.stroke || mixH('#6E4A32', '#FFF6E0', lum));
    ctx.save(); ctx.globalAlpha *= alpha;
    if (o.clip !== false) { ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip(); }
    ctx.translate(cx, cy);
    const path = new Path2D(); for (const P of g.oct) polyPath(path, P, true); for (const P of g.sq) polyPath(path, P, true);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (lum < 1) {
      ctx.save(); ctx.translate(lw * 0.35, lw * 0.45); ctx.strokeStyle = E.rgba('#140A06', 0.55 * (1 - lum)); ctx.lineWidth = lw * 1.05; ctx.stroke(path); ctx.restore();
    }
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(path);
    ctx.save(); ctx.translate(-lw * 0.16, -lw * 0.2); ctx.strokeStyle = E.rgba(shadeH(col, 0.28), 0.55); ctx.lineWidth = lw * 0.3; ctx.stroke(path); ctx.restore();
    ctx.save(); ctx.translate(lw * 0.18, lw * 0.2); ctx.strokeStyle = E.rgba('#1A0E08', 0.35 * (1 - lum)); ctx.lineWidth = lw * 0.18; ctx.stroke(path); ctx.restore();
    if (lum > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = E.rgba('#FFE7B0', 0.18 * lum); ctx.lineWidth = lw * 2.6; ctx.stroke(path);
      ctx.strokeStyle = E.rgba('#FFFFFF', 0.85 * lum); ctx.lineWidth = lw * 0.34; ctx.stroke(path);
    }
    ctx.restore();
  };

  /* ───────────────────────── STAR8 ───────────────────────── */
  function partialClosed(p, pts, frac) {
    if (frac <= 0) return;
    const ring = pts.concat([pts[0]]), cum = cumLen(ring), L = cum[cum.length - 1];
    const seg = frac >= 1 ? ring : subPoly(ring, cum, 0, L * frac);
    polyPath(p, seg, false);
  }
  A.star8 = (ctx, o = {}) => {
    const r = dv(o.r, 40), open = clamp(o.open || 0), draw = clamp(dv(o.draw, 1)), lw = dv(o.lineW, Math.max(1.5, r * 0.035));
    const col = o.col || '#D8B26E', glow = o.glow || 0, base = o.rot || 0, alpha = dv(o.alpha, 1);
    if (draw <= 0) return;
    const ea = E.ease.inOutCubic(open), rA = base + ea * (PI / 8), rB = base - ea * (PI / 8);
    const sq = (R, rot) => { const p = []; for (let i = 0; i < 4; i++) { const a = rot - PI / 2 + (i / 4) * TAU; p.push([Math.cos(a) * R, Math.sin(a) * R]); } return p; };
    const dSq = clamp(draw / 0.65), dExt = clamp((draw - 0.55) / 0.45);
    const edges = (p, P, k) => { // each edge grows from its midpoint toward both vertices
      if (k <= 0) return;
      for (let i = 0; i < 4; i++) {
        const a = P[i], b = P[(i + 1) % 4], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        p.moveTo(mx + (a[0] - mx) * k, my + (a[1] - my) * k); p.lineTo(mx + (b[0] - mx) * k, my + (b[1] - my) * k);
      }
    };
    const extLen = r * dv(o.ext, 0.45) * (0.4 + 0.6 * sm(open)) * dExt;
    const exts = (p) => {
      for (const rot of [rA, rA + PI / 4]) {
        const P = sq(r, rot);
        for (let i = 0; i < 4; i++) {
          const a = P[i], b = P[(i + 1) % 4], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
          p.moveTo(b[0], b[1]); p.lineTo(b[0] + ux * extLen, b[1] + uy * extLen);
          p.moveTo(a[0], a[1]); p.lineTo(a[0] - ux * extLen, a[1] - uy * extLen);
        }
      }
    };
    const ri = r * 0.6 * (0.6 + 0.4 * sm(open)), dIn = open > 0.02 ? dSq * sm(open * 1.4) : 0;
    const build = (p) => {
      edges(p, sq(r, rA), dSq); edges(p, sq(r, rA + PI / 4), dSq);
      if (dIn > 0) { edges(p, sq(ri, rB), dIn); edges(p, sq(ri, rB + PI / 4), dIn); }
    };
    const hasExt = o.girih !== false && extLen > 0.5;
    ctx.save(); ctx.globalAlpha *= alpha;
    if (o.fill) {
      ctx.globalAlpha *= sm(draw * 1.5);
      ctx.fillStyle = o.fill; ctx.beginPath(); polyPath(ctx, sq(r, rA), true); polyPath(ctx, sq(r, rA + PI / 4), true); ctx.fill('nonzero');
      ctx.globalAlpha /= Math.max(1e-3, sm(draw * 1.5));
    }
    if (glow > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); build(ctx); if (hasExt) exts(ctx);
      const gc = E.mix(col, '#FFE7B0', 0.4);
      for (const [wd, al] of [[lw * 9 + r * 0.05, 0.05], [lw * 5, 0.09], [lw * 2.6, 0.16]]) { ctx.strokeStyle = gc; ctx.globalAlpha = al * glow * alpha; ctx.lineWidth = wd; ctx.stroke(); }
      ctx.restore();
    }
    if (hasExt) {
      ctx.beginPath(); exts(ctx);
      ctx.save(); ctx.globalAlpha *= 0.85; metalStroke(ctx, lw * 0.7, metalGrad(ctx, o.col, -r * 1.4, -r * 1.4, r * 1.4, r * 1.4), { dark: '#3A2408' }); ctx.restore();
      if (dExt > 0.9) {
        ctx.fillStyle = goldGrad(ctx, -r, -r, r, r); ctx.globalAlpha *= (dExt - 0.9) * 10;
        for (const rot of [rA, rA + PI / 4]) { const P = sq(r, rot); for (let i = 0; i < 4; i++) { const a = P[i], b = P[(i + 1) % 4], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); for (const [q, sg] of [[b, 1], [a, -1]]) { ctx.beginPath(); ctx.arc(q[0] + sg * dx / L * extLen, q[1] + sg * dy / L * extLen, lw * 0.9, 0, TAU); ctx.fill(); } } }
        ctx.globalAlpha /= Math.max(1e-3, (dExt - 0.9) * 10);
      }
    }
    ctx.beginPath(); build(ctx);
    metalStroke(ctx, lw, metalGrad(ctx, o.col, -r, -r, r, r), { dark: '#3A2408' });
    if (open > 0.05) {
      ctx.globalAlpha *= sm(open * 1.3) * dSq;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.36, 0, TAU); metalStroke(ctx, lw * 0.7, metalGrad(ctx, o.col, -r, -r, r, r), { under: false });
      ctx.globalAlpha /= Math.max(1e-3, sm(open * 1.3) * dSq);
    }
    ctx.fillStyle = goldGrad(ctx, -r * 0.1, -r * 0.1, r * 0.1, r * 0.1); ctx.globalAlpha *= sm(draw * 2);
    ctx.beginPath(); ctx.arc(0, 0, Math.max(lw * 0.9, r * 0.07), 0, TAU); ctx.fill();
    ctx.restore();
  };

  /* ───────────────────────── ROSETTE FLOWER ───────────────────────── */
  A.rosetteFlower = (ctx, o = {}) => {
    const r = dv(o.r, 300), fill = clamp(dv(o.fill, 1)), t = o.t || 0, alpha = dv(o.alpha, 1);
    const col = o.col || '#FFD27A', core = o.core || '#FFFDF5';
    if (fill <= 0) return;
    const st = (i) => E.ease.outCubic(clamp((fill - i * 0.16) / 0.36));
    const lw = Math.max(1, r * 0.008), spin = t * 0.05;
    ctx.save(); ctx.globalAlpha *= alpha;
    if (o.lighter) ctx.globalCompositeOperation = 'lighter';
    const gl = st(0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = E.rad(ctx, 0, 0, 0, r * 1.5, [[0, '#FFFFFF', 0.55 * gl], [0.35, col, 0.28 * gl], [1, col, 0]]); ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
    if (o.rays !== false && st(4) > 0) {
      const k = st(4);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + spin * 0.6 + PI / 16, L = r * (i % 2 ? 1.25 : 1.5) * (0.7 + 0.3 * k) * (0.92 + 0.08 * Math.sin(t * 1.3 + i)), wA = i % 2 ? 0.035 : 0.05;
        ctx.fillStyle = E.rad(ctx, 0, 0, r * 0.5, L, [[0, '#FFF6E0', 0.5 * k], [1, '#FFD27A', 0]]);
        ctx.beginPath(); ctx.moveTo(Math.cos(a - wA) * r * 0.5, Math.sin(a - wA) * r * 0.5); ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L); ctx.lineTo(Math.cos(a + wA) * r * 0.5, Math.sin(a + wA) * r * 0.5); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
    const gold = goldGrad(ctx, -r, -r, r, r);
    // outer ring: 16 contiguous ogee scallops (rose window)
    const k3 = st(3);
    if (k3 > 0) {
      ctx.save(); ctx.rotate(spin * 0.3); const sc3 = 0.8 + 0.2 * E.ease.outBack(k3); ctx.scale(sc3, sc3); ctx.globalAlpha *= k3;
      const r0 = r * 0.6;
      for (const pass of [0, 1]) {
        ctx.beginPath();
        for (let i = pass; i < 16; i += 2) {
          const a = (i / 16) * TAU, hw = PI / 16, r1 = r * (i % 2 ? 0.92 : 1.0);
          const P = (rr, aa) => [Math.cos(a + aa) * rr, Math.sin(a + aa) * rr];
          const p0 = P(r0, -hw), c1 = P(r0 + (r1 - r0) * 0.78, -hw * 1.06), c2 = P(r1 * 0.96, -hw * 0.42), tip = P(r1, 0), d2 = P(r1 * 0.96, hw * 0.42), d1 = P(r0 + (r1 - r0) * 0.78, hw * 1.06), q0 = P(r0, hw);
          ctx.moveTo(p0[0], p0[1]); ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], tip[0], tip[1]); ctx.bezierCurveTo(d2[0], d2[1], d1[0], d1[1], q0[0], q0[1]); ctx.closePath();
        }
        ctx.fillStyle = E.rad(ctx, 0, 0, r0, r, pass ? [[0, '#FFF3D0'], [1, '#EDB95A']] : [[0, core], [0.55, '#FFF0C8'], [1, col]]); ctx.fill();
        metalStroke(ctx, lw * 1.1, gold, { dark: '#7A5418', alpha: 0.85 });
      }
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU, hw = (PI / 16) * 0.55, r1 = r * (i % 2 ? 0.8 : 0.87), P = (rr, aa) => [Math.cos(a + aa) * rr, Math.sin(a + aa) * rr];
        const p0 = P(r0 * 1.05, -hw), c = P(r1 * 0.93, -hw * 0.55), tip = P(r1, 0), d = P(r1 * 0.93, hw * 0.55), q0 = P(r0 * 1.05, hw);
        ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(c[0], c[1], tip[0], tip[1]); ctx.quadraticCurveTo(d[0], d[1], q0[0], q0[1]);
      }
      ctx.strokeStyle = E.rgba('#C8922A', 0.55); ctx.lineWidth = lw * 0.8; ctx.stroke();
      ctx.fillStyle = E.rgba('#FFF6E0', 0.95);
      for (let i = 0; i < 32; i++) { const a = (i / 32) * TAU + PI / 32; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.07, Math.sin(a) * r * 1.07, lw * 1.5, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // middle: gold band + 8 small and 8 large almond petals
    const k2 = st(2);
    if (k2 > 0) {
      ctx.save(); ctx.rotate(-spin * 0.2); ctx.globalAlpha *= k2; const sc2 = 0.8 + 0.2 * E.ease.outBack(k2); ctx.scale(sc2, sc2);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, TAU); ctx.arc(0, 0, r * 0.55, 0, TAU, true); ctx.fillStyle = gold; ctx.fill();
      ctx.fillStyle = E.rgba('#FFF8E6', 0.95);
      for (let i = 0; i < 32; i++) { const a = (i / 32) * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.575, Math.sin(a) * r * 0.575, lw * 1.1, 0, TAU); ctx.fill(); }
      const almond = (a, r0, r1, wd, fillS) => {
        ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(r0, 0);
        ctx.bezierCurveTo(lerp(r0, r1, 0.3), -wd * 1.3, lerp(r0, r1, 0.8), -wd * 0.5, r1, 0);
        ctx.bezierCurveTo(lerp(r0, r1, 0.8), wd * 0.5, lerp(r0, r1, 0.3), wd * 1.3, r0, 0); ctx.closePath();
        ctx.fillStyle = fillS; ctx.fill(); metalStroke(ctx, lw, gold, { dark: '#7A5418', alpha: 0.85 });
        ctx.beginPath(); ctx.moveTo(lerp(r0, r1, 0.15), 0); ctx.lineTo(lerp(r0, r1, 0.8), 0); ctx.strokeStyle = E.rgba('#D9A548', 0.6); ctx.lineWidth = lw * 0.7; ctx.stroke();
        ctx.restore();
      };
      const fS = E.rad(ctx, 0, 0, r * 0.2, r * 0.55, [[0, '#FFFDF5'], [1, '#FFDF9A']]);
      for (let i = 0; i < 8; i++) almond((i / 8) * TAU + PI / 8, r * 0.25, r * 0.47, r * 0.06, fS);
      for (let i = 0; i < 8; i++) almond((i / 8) * TAU, r * 0.19, r * 0.545, r * 0.095, fS);
      ctx.restore();
    }
    // central star
    const k1 = st(1);
    if (k1 > 0) {
      ctx.save(); ctx.rotate(spin * 0.4); ctx.globalAlpha *= k1; ctx.scale(0.6 + 0.4 * E.ease.outBack(k1), 0.6 + 0.4 * E.ease.outBack(k1));
      const sp = S.starPath(r * 0.24, 8, 0.765, PI / 8);
      ctx.fillStyle = E.rad(ctx, 0, 0, 0, r * 0.3, [[0, '#FFFFFF'], [0.6, core], [1, '#FFE7A0']]); ctx.fill(sp);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = E.rgba('#7A5418', 0.5); ctx.lineWidth = lw * 2.6; ctx.stroke(sp); ctx.strokeStyle = gold; ctx.lineWidth = lw * 1.4; ctx.stroke(sp); ctx.restore();
      ctx.restore();
    }
    const k0 = st(0);
    ctx.fillStyle = E.rad(ctx, 0, 0, 0, r * 0.1, [[0, '#FFFFFF', k0], [1, core, 0.6 * k0]]); ctx.beginPath(); ctx.arc(0, 0, r * 0.08 * (0.5 + 0.5 * k0), 0, TAU); ctx.fill();
    ctx.restore();
  };

  /* =====================================================================================
   * ARCH GATE
   * ===================================================================================== */
  function archSide(hw, ys, apexY, sgn, n = 22) {
    const archH = ys - apexY, P0 = [sgn * hw, ys], P1 = [sgn * hw, ys - archH * 0.56], P2 = [sgn * hw * 0.42, apexY + archH * 0.16], P3 = [0, apexY], out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, a = (1 - u) ** 3, b = 3 * u * (1 - u) ** 2, c = 3 * u * u * (1 - u), d = u ** 3;
      out.push([a * P0[0] + b * P1[0] + c * P2[0] + d * P3[0], a * P0[1] + b * P1[1] + c * P2[1] + d * P3[1]]);
    }
    return out;
  }
  function archOutline(hw, ys, apexY, yb) {
    const L = archSide(hw, ys, apexY, -1), R = archSide(hw, ys, apexY, 1).reverse();
    return [[-hw, yb]].concat(L, R.slice(1), [[hw, yb]]);
  }
  A.archGate = (ctx, o = {}) => {
    const w = dv(o.w, 600), h = dv(o.h, 900), lum = clamp(o.luminous || 0), t = o.t || 0;
    const ft = w * 0.075, hw = w / 2 - ft * 1.35, apexY = -h + ft * 1.6, archH = hw * 1.28, ys = apexY + archH;
    const wood = mixH('#6E4A32', '#FFF6E0', lum), woodL = mixH('#8E6444', '#FFFFFF', lum), woodD = mixH('#3A2416', '#FFE7B0', lum), trim = mixH('#C99A4A', '#FFF6E0', lum);
    const openPts = archOutline(hw, ys, apexY, 0), opening = new Path2D(); polyPath(opening, openPts, true);
    ctx.save();
    // opening backdrop / luminous fill
    if (o.back) { ctx.fillStyle = o.back; ctx.fill(opening); }
    if (lum > 0) {
      ctx.save(); ctx.clip(opening);
      ctx.fillStyle = E.lin(ctx, 0, apexY, 0, 0, [[0, '#FFFFFF', 0.9 * lum], [0.6, '#FFF6E0', 0.45 * lum], [1, '#FFF6E0', 0.15 * lum]]); ctx.fillRect(-hw, apexY, hw * 2, -apexY);
      ctx.restore();
    }
    // lattice + muqarnas inside opening
    const yL = ys + hw * 0.08;
    ctx.save(); ctx.clip(opening);
    if (o.lattice !== false) A.lattice(ctx, { x: -hw, y: o.muqarnas === false ? apexY : yL, w: hw * 2, h: o.muqarnas === false ? -apexY : -yL, cell: dv(o.cell, w * 0.16), lineW: dv(o.cell, w * 0.16) * 0.11, luminous: lum });
    if (o.muqarnas !== false) {
      const rows = 4, rh = (yL - apexY) / rows;
      for (let rI = rows - 1; rI >= 0; rI--) {
        const y1 = apexY + (rI + 1) * rh, y0 = apexY + rI * rh * 0.92;
        const n = 2 + rI * 2, cw = (hw * 2) / n, off = (rI % 2) * cw * 0.5;
        for (let k = -1; k <= n; k++) {
          const xa = -hw + k * cw + off - cw * 0.25, xb = xa + cw, xm = (xa + xb) / 2;
          const nichePts = [[xa, y1], [xa, lerp(y0, y1, 0.55)], [xa + cw * 0.08, lerp(y0, y1, 0.25)], [xm, y0], [xb - cw * 0.08, lerp(y0, y1, 0.25)], [xb, lerp(y0, y1, 0.55)], [xb, y1]];
          ctx.beginPath(); polyPath(ctx, nichePts, true);
          ctx.fillStyle = E.lin(ctx, 0, y0, 0, y1, [[0, mixH(woodD, '#000000', 0.25 * (1 - lum))], [0.7, wood], [1, woodL]]); ctx.fill();
          ctx.strokeStyle = E.rgba(trim, 0.75); ctx.lineWidth = Math.max(1, w * 0.004); ctx.stroke();
          ctx.fillStyle = E.rgba('#FFFFFF', 0.12 + 0.3 * lum); ctx.fillRect(xa + cw * 0.12, y1 - rh * 0.18, cw * 0.76, rh * 0.08);
        }
      }
      ctx.fillStyle = trim; ctx.fillRect(-hw, yL - ft * 0.12, hw * 2, ft * 0.22);
    }
    ctx.restore();
    // frame (pishtaq) with evenodd hole
    const frame = new Path2D(); frame.rect(-w / 2, -h, w, h); polyPath(frame, openPts, true);
    ctx.fillStyle = E.lin(ctx, -w / 2, -h, w / 2, 0, [[0, woodL], [0.5, wood], [1, woodD]]); ctx.fill(frame, 'evenodd');
    ctx.save(); ctx.clip(frame, 'evenodd');
    ctx.fillStyle = E.rgba('#1A0E08', 0.22 * (1 - lum)); ctx.fillRect(w * 0.08, -h, w, h);
    ctx.strokeStyle = trim; ctx.lineWidth = Math.max(1.2, w * 0.005); ctx.strokeRect(-w / 2 + ft * 0.3, -h + ft * 0.3, w - ft * 0.6, h - ft * 0.3);
    for (const sgn of [-1, 1]) {
      const sx = sgn * (hw + (w / 2 - hw) * 0.18 + hw * 0.32), sy = -h + ft * 1.25 + hw * 0.32;
      ctx.save(); ctx.translate(sgn * w * 0.335, sy);
      ctx.fillStyle = woodD; ctx.beginPath(); ctx.arc(0, 0, ft * 1.05, 0, TAU); ctx.fill();
      ctx.fillStyle = trim; ctx.fill(S.starPath(ft * 0.95, 8, 0.6, PI / 8));
      ctx.fillStyle = wood; ctx.beginPath(); ctx.arc(0, 0, ft * 0.32, 0, TAU); ctx.fill();
      ctx.restore(); void sx;
    }
    ctx.restore();
    // archivolt (ablaq voussoirs)
    const off = ft * 0.32, vo = archOutline(hw + off, ys, apexY - off, 0);
    const arcPts = vo.slice(1, vo.length - 1);
    const cum = cumLen(arcPts), L = cum[cum.length - 1], nV = 17;
    ctx.lineCap = 'butt';
    for (let i = 0; i < nV; i++) {
      const seg = subPoly(arcPts, cum, (L * i) / nV, (L * (i + 1)) / nV - L * 0.004);
      ctx.beginPath(); polyPath(ctx, seg, false);
      ctx.strokeStyle = i % 2 ? E.mix('#E9DCC4', '#FFFFFF', lum) : E.mix('#A8323E', '#FFE7B0', lum); ctx.lineWidth = ft * 0.62; ctx.stroke();
    }
    ctx.beginPath(); polyPath(ctx, archOutline(hw + off * 2.1, ys, apexY - off * 2.1, 0).slice(1, -1), false); ctx.strokeStyle = trim; ctx.lineWidth = Math.max(1.5, ft * 0.12); ctx.stroke();
    ctx.beginPath(); polyPath(ctx, openPts.slice(1, -1), false); ctx.strokeStyle = trim; ctx.lineWidth = Math.max(1.5, ft * 0.14); ctx.stroke();
    // colonnettes
    for (const sgn of [-1, 1]) {
      const x = sgn * (hw + ft * 0.16), cwid = ft * 0.36;
      ctx.fillStyle = E.lin(ctx, x - cwid / 2, 0, x + cwid / 2, 0, [[0, E.mix('#8A6428', '#FFF6E0', lum)], [0.35, E.mix('#F2D58E', '#FFFFFF', lum)], [1, E.mix('#6A4818', '#FFE7B0', lum)]]);
      ctx.fillRect(x - cwid / 2, ys, cwid, -ys);
      ctx.fillStyle = trim; ctx.fillRect(x - cwid * 0.85, ys - ft * 0.3, cwid * 1.7, ft * 0.36); ctx.fillRect(x - cwid * 0.8, -ft * 0.3, cwid * 1.6, ft * 0.3);
    }
    // cresting
    const nc = Math.max(5, Math.round(w / (ft * 1.25))), cwd = w / nc;
    ctx.fillStyle = trim;
    for (let i = 0; i < nc; i++) {
      const x = -w / 2 + cwd * (i + 0.5), ch = ft * 0.75;
      ctx.beginPath(); ctx.moveTo(x - cwd * 0.36, -h); ctx.bezierCurveTo(x - cwd * 0.38, -h - ch * 0.6, x - cwd * 0.08, -h - ch * 0.7, x, -h - ch); ctx.bezierCurveTo(x + cwd * 0.08, -h - ch * 0.7, x + cwd * 0.38, -h - ch * 0.6, x + cwd * 0.36, -h); ctx.closePath(); ctx.fill();
    }
    if (lum > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
      ctx.beginPath(); polyPath(ctx, openPts.slice(1, -1), false); ctx.rect(-w / 2, -h, w, h);
      for (const [wd, al] of [[ft * 2.2, 0.06], [ft * 1.1, 0.1], [ft * 0.45, 0.16]]) { ctx.strokeStyle = E.rgba('#FFF6E0', al * lum); ctx.lineWidth = wd; ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
    void t;
  };

  /* =====================================================================================
   * FILAMENT
   * ===================================================================================== */
  function sparkBurst(ctx, x, y, age, o = {}) {
    const n = dv(o.n, 16), seed = dv(o.seed, 1), sp = dv(o.speed, 380), life = dv(o.life, 0.7), g = dv(o.gravity, 520), col = o.col || '#FFE3A3', sz = dv(o.size, 2.2);
    if (age < 0 || age > life * 1.05) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    if (age < 0.18) S.light(ctx, x, y, sz * 18, col, 0.7 * (1 - age / 0.18));
    for (let i = 0; i < n; i++) {
      const li = life * (0.55 + 0.45 * E.hash(i, seed + 3));
      if (age > li) continue;
      const a = o.dir === undefined ? E.hash(i, seed) * TAU : o.dir + (E.hash(i, seed) - 0.5) * dv(o.spread, 1.6);
      const v = sp * (0.35 + 0.65 * E.hash(i, seed + 1)), drag = 3.2;
      const pos = (tt) => { const d = (v * (1 - Math.exp(-drag * tt))) / drag; return [x + Math.cos(a) * d, y + Math.sin(a) * d + 0.5 * g * tt * tt]; };
      const p = pos(age), q = pos(Math.max(0, age - 0.04)), k = 1 - age / li;
      ctx.strokeStyle = E.rgba(col, k); ctx.lineWidth = sz * (0.4 + k);
      ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0] + 0.01, p[1]); ctx.stroke();
      ctx.fillStyle = E.rgba('#FFFFFF', k * 0.9); ctx.beginPath(); ctx.arc(p[0], p[1], sz * 0.55 * k + 0.3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  A.sparks = (ctx, t, o = {}) => sparkBurst(ctx, o.x || 0, o.y || 0, t - dv(o.t0, 0), o);

  A.filament = (ctx, pts, o = {}) => {
    if (!pts || pts.length < 2) return;
    const t = o.t || 0, w = dv(o.w, 2), halo = dv(o.halo, 8), col = o.col || '#FFE3A3', flow = dv(o.flow, 60);
    const draw = clamp(dv(o.draw, 1)), snap = clamp(o.snap || 0), alpha = dv(o.alpha, 1);
    if (draw <= 0 || alpha <= 0) return;
    const pl = sampleCurve(pts, dv(o.res, 64)), cum = cumLen(pl), L = cum[cum.length - 1];
    let parts = [];
    let bp = null;
    if (snap > 0) {
      const bu = dv(o.breakAt, 0.5), k = E.ease.outCubic(clamp(snap * 1.3)), wob = Math.exp(-snap * 4.5) * Math.sin(snap * 30);
      const a = subPoly(pl, cum, 0, L * bu * (1 - k * 0.92)), b = subPoly(pl, cum, L * (bu + (1 - bu) * k * 0.92), L);
      bp = subPoly(pl, cum, 0, L * bu).pop();
      const bend = (seg, fromEnd) => {
        const n = seg.length; if (n < 2) return seg;
        return seg.map((p, i) => {
          const u = fromEnd ? 1 - i / (n - 1) : i / (n - 1), j = Math.min(n - 1, i + 1), q = seg[j === i ? i - 1 : j];
          let tx = q[0] - p[0], ty = q[1] - p[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
          const d = 22 * wob * u * u * (1 - snap * 0.6); return [p[0] - ty * d, p[1] + tx * d];
        });
      };
      parts = [bend(a, false), bend(b, true)];
      alpha && null;
    } else parts = [subPoly(pl, cum, 0, L * draw)];
    const fadeA = alpha * (snap > 0 ? 1 - sm((snap - 0.55) / 0.45) : 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const seg of parts) {
      if (seg.length < 2) continue;
      const p = new Path2D(); polyPath(p, seg, false);
      ctx.strokeStyle = E.rgba(col, 0.06 * fadeA); ctx.lineWidth = halo * 2.4; ctx.stroke(p);
      ctx.strokeStyle = E.rgba(col, 0.13 * fadeA); ctx.lineWidth = halo; ctx.stroke(p);
      ctx.strokeStyle = E.rgba(col, 0.45 * fadeA); ctx.lineWidth = w * 2.4; ctx.stroke(p);
      ctx.strokeStyle = E.mix(col, '#FFFFFF', 0.65, fadeA); ctx.lineWidth = w; ctx.stroke(p);
      if (flow) {
        ctx.setLineDash([Math.max(3, w * 2.5), Math.max(14, w * 11)]); ctx.lineDashOffset = -t * flow;
        ctx.strokeStyle = E.rgba('#FFFFFF', 0.7 * fadeA); ctx.lineWidth = w * 1.5; ctx.stroke(p); ctx.setLineDash([]);
      }
    }
    if (snap <= 0 && draw < 1 && o.head !== false) {
      const hd = parts[0][parts[0].length - 1];
      S.light(ctx, hd[0], hd[1], halo * 3, col, 0.8 * fadeA);
      ctx.fillStyle = E.rgba('#FFFFFF', fadeA); ctx.beginPath(); ctx.arc(hd[0], hd[1], w * 1.3, 0, TAU); ctx.fill();
    }
    ctx.restore();
    if (bp && snap > 0) sparkBurst(ctx, bp[0], bp[1], snap * 0.9, { n: 14, seed: dv(o.seed, 9), col, speed: 300, life: 0.8, size: Math.max(1.4, w) });
  };

  /* =====================================================================================
   * PARTICLES
   * ===================================================================================== */
  const petalShape = new Map();
  function petalP(size) { const k = Math.round(size * 2) / 2; let p = petalShape.get(k); if (!p) { p = S.petalPath(k, k * 0.62, 0.3, 0.14); petalShape.set(k, p); } return p; }
  A.petals = (ctx, t, o = {}) => {
    const n = dv(o.n, 24), seed = dv(o.seed, 5), size = dv(o.size, 22), alpha = dv(o.alpha, 1), light = !!o.light;
    const cols = Array.isArray(o.col) ? o.col : [o.col || (light ? '#FFE7B0' : '#FF6F91')];
    const wind = o.wind || [40, 70];
    ctx.save();
    if (light) ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const ph = E.hash(i, seed + 4) * TAU, fr = 1.1 + 1.6 * E.hash(i, seed + 5), sz = size * (0.7 + 0.5 * E.hash(i, seed + 7));
      const sway = Math.sin(t * fr * 0.7 + ph) * sz * 1.2;
      let x, y, a = 1;
      if (o.t0 !== undefined) {
        const age = t - o.t0 - E.hash(i, seed + 9) * dv(o.stagger, 0.25);
        const life = dv(o.life, 3) * (0.7 + 0.3 * E.hash(i, seed + 8));
        if (age < 0 || age > life) continue;
        const org = o.origin || { x: 0, y: 0 };
        const ang = o.dir === undefined ? E.hash(i, seed) * TAU : o.dir + (E.hash(i, seed) - 0.5) * dv(o.spread, 1.2);
        const v0 = dv(o.speed, 260) * (0.35 + 0.65 * E.hash(i, seed + 1)), drag = 1.6, d = (v0 * (1 - Math.exp(-drag * age))) / drag;
        x = org.x + (org.w ? (E.hash(i, seed + 20) - 0.5) * org.w : 0) + Math.cos(ang) * d + wind[0] * age * 0.5 + sway * sm(age);
        y = org.y + (org.h ? (E.hash(i, seed + 21) - 0.5) * org.h : 0) + Math.sin(ang) * d + wind[1] * age * 0.5 + 0.5 * dv(o.gravity, 40) * age * age;
        a = sm(age / 0.15) * (1 - sm((age / life - 0.65) / 0.35));
      } else if (o.along) {
        const P = dv(o.life, 4) * (0.75 + 0.5 * E.hash(i, seed + 8)), uu = mod(t / P + E.hash(i, seed), 1), q = o.along(uu, i);
        x = q[0] + sway * 0.6; y = q[1] + Math.cos(t * fr * 0.6 + ph) * sz * 0.5; a = Math.sin(PI * uu) ** 0.6;
      } else {
        const ar = o.area || { x: 0, y: 0, w: E.W, h: E.H }, sp = 0.6 + 0.8 * E.hash(i, seed + 1), pad = sz * 3;
        x = ar.x - pad + mod(E.hash(i, seed + 2) * ar.w + wind[0] * sp * t + sway, ar.w + pad * 2);
        y = ar.y - pad + mod(E.hash(i, seed + 3) * (ar.h + pad * 2) + wind[1] * sp * t, ar.h + pad * 2);
      }
      if (a <= 0.01) continue;
      const rot = ph + Math.sin(t * fr + ph) * 0.9 + t * (E.hash(i, seed + 6) - 0.5) * 1.6;
      const flip = Math.cos(t * fr * 1.3 + ph);
      const c = cols[Math.floor(E.hash(i, seed + 11) * cols.length) % cols.length];
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, 0.22 + 0.78 * Math.abs(flip)); ctx.translate(0, -sz * 0.5);
      ctx.globalAlpha = alpha * a;
      const p = petalP(sz);
      if (light) {
        ctx.fillStyle = E.rad(ctx, 0, sz * 0.5, 0, sz * 0.9, [[0, '#FFFFFF', 0.95], [0.5, c, 0.6], [1, c, 0]]); ctx.fill(p);
      } else {
        const back = flip < 0;
        ctx.fillStyle = E.lin(ctx, 0, 0, 0, sz, [[0, shadeH(c, back ? -0.35 : -0.18)], [0.55, back ? shadeH(c, -0.12) : c], [1, shadeH(c, back ? 0.05 : 0.28)]]);
        ctx.fill(p);
        ctx.fillStyle = E.rgba('#FFFFFF', back ? 0.05 : 0.16); ctx.beginPath(); ctx.ellipse(-sz * 0.12, sz * 0.62, sz * 0.12, sz * 0.26, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  };

  A.lightRain = (ctx, t, o = {}) => {
    const n = dv(o.n, 300), seed = dv(o.seed, 11), ar = o.area || { x: 0, y: 0, w: E.W, h: E.H };
    const dens = clamp(dv(o.density, 1)), slant = dv(o.slant, (6 * PI) / 180), sp = dv(o.speed, 380);
    const col = o.col || '#FFFFFF', halo = o.halo || '#FFE7A8', alpha = dv(o.alpha, 0.8), bs = dv(o.bandSlow, true);
    const L0 = o.len ? o.len[0] : 18, L1 = o.len ? o.len[1] : 40, sx = Math.sin(slant), cyv = Math.cos(slant), ts = Math.tan(slant);
    const b0 = clamp(1229 - ar.y, 0, ar.h), b1 = clamp(1574 - ar.y, 0, ar.h), B = bs ? b1 - b0 : 0, kS = 2.2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const hc = E.rgb(halo), cc = E.rgb(col);
    for (let i = 0; i < n; i++) {
      if (E.hash(i, seed + 7) > dens) continue;
      const len = lerp(L0, L1, E.hash(i, seed + 1)), v = sp * (0.75 + 0.5 * E.hash(i, seed + 2));
      const span = ar.h + len * 2 + B * (kS - 1);
      let yv = mod(E.hash(i, seed + 3) * span + t * v, span) - len, y = yv, inBand = false, ll = len;
      if (B > 0) {
        if (yv > b0 && yv <= b0 + B * kS) { y = b0 + (yv - b0) / kS; inBand = true; ll = len / kS * 1.2; }
        else if (yv > b0 + B * kS) y = yv - B * (kS - 1);
      }
      y += ar.y;
      const x = ar.x + mod(E.hash(i, seed + 4) * ar.w + (y - ar.y) * ts, ar.w);
      let a = alpha * (0.45 + 0.55 * E.hash(i, seed + 5));
      if (inBand) { if (E.hash(i, seed + 9) > 0.2) continue; a *= 0.55; }
      const tx = x - sx * ll, ty = y - cyv * ll;
      const g = ctx.createLinearGradient(x, y, tx, ty);
      g.addColorStop(0, `rgba(${hc[0]},${hc[1]},${hc[2]},${a * 0.3})`); g.addColorStop(1, `rgba(${hc[0]},${hc[1]},${hc[2]},0)`);
      ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
      const g2 = ctx.createLinearGradient(x, y, tx, ty);
      g2.addColorStop(0, `rgba(${cc[0]},${cc[1]},${cc[2]},${a})`); g2.addColorStop(1, `rgba(${cc[0]},${cc[1]},${cc[2]},0)`);
      ctx.strokeStyle = g2; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
  };

  A.sand = (ctx, t, o = {}) => {
    const x = o.x || 0, y = o.y || 0, len = Math.max(0, dv(o.len, 200)), flow = dv(o.flow, 1), seed = dv(o.seed, 21), col = o.col || '#FFE29A', w = dv(o.w, 1.6), speed = dv(o.speed, 420);
    if (flow <= 0.01 || len < 2) return;
    const fa = Math.min(1, flow);
    ctx.save();
    ctx.strokeStyle = E.lin(ctx, x, y, x, y + len, [[0, col, 0.95 * fa], [1, '#F2C46B', 0.7 * fa]]);
    ctx.lineWidth = w * Math.pow(flow, 0.6); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
    const n = Math.round(10 + 26 * Math.min(flow, 2));
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const yy = mod(E.hash(i, seed) * len + t * speed * (0.85 + 0.3 * E.hash(i, seed + 1)), len), sp = (yy / len) * w * 2.2 * (E.hash(i, seed + 2) - 0.5) * 2;
      ctx.globalAlpha = 0.9 * fa; ctx.beginPath(); ctx.arc(x + sp, y + yy, w * (0.45 + 0.4 * E.hash(i, seed + 3)), 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 6; i++) {
      const ph = mod(t * 2.2 + E.hash(i, seed + 5), 1), a = (E.hash(i, seed + 6) - 0.5) * 2.4, d = ph * w * 9;
      ctx.globalAlpha = 0.7 * fa * (1 - ph); ctx.beginPath(); ctx.arc(x + Math.sin(a) * d, y + len - Math.cos(a) * d * 0.6 + ph * ph * w * 4, w * 0.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  A.wisps = (ctx, t, o = {}) => {
    const x0 = o.x || 0, y0 = o.y || 0, n = dv(o.n, 6), seed = dv(o.seed, 31), col = o.col || '#FFE3A3', rise = dv(o.rise, 80), life = dv(o.life, 2.4);
    const spread = dv(o.spread, 24), wd = dv(o.w, 5), alpha = dv(o.alpha, 0.6), curlA = dv(o.curl, 18);
    ctx.save(); ctx.globalCompositeOperation = o.op || 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const age = o.t0 !== undefined ? t - o.t0 - E.hash(i, seed) * dv(o.stagger, 0.3) : mod(t + E.hash(i, seed) * life, life);
      if (age <= 0 || age > life) continue;
      const ox = (E.hash(i, seed + 1) - 0.5) * spread * 2, ph = E.hash(i, seed + 2) * TAU, fq = 1.3 + E.hash(i, seed + 3) * 1.5, curl = curlA * (0.5 + E.hash(i, seed + 4));
      const P = (tau) => [x0 + ox + Math.sin(tau * fq + ph) * curl * Math.min(1, tau * 1.2) + E.noise(tau * 0.8 + i * 3.1, seed) * curl * 0.7 + (o.drift || 0) * tau, y0 - rise * tau * (1 + 0.2 * E.hash(i, seed + 5))];
      const tail = Math.min(age, 0.9), k = age / life, a = alpha * Math.pow(1 - k, 1.2) * sm(age * 5);
      const pts = []; for (let j = 0; j <= 14; j++) pts.push(P(age - tail + (tail * j) / 14));
      const p = new Path2D(); crPath(p, pts, false);
      ctx.strokeStyle = E.rgba(col, a * 0.22); ctx.lineWidth = wd * (1.6 + k * 2); ctx.stroke(p);
      ctx.strokeStyle = E.rgba(col, a * 0.6); ctx.lineWidth = wd * (0.45 + k * 0.4); ctx.stroke(p);
    }
    ctx.restore();
  };

  A.glints = (ctx, t, o = {}) => {
    const pts = o.pts || [], seed = dv(o.seed, 41), r = dv(o.r, 12), col = o.col || '#FFF6E0', per = dv(o.period, 1.8), duty = dv(o.duty, 0.3), alpha = dv(o.alpha, 1);
    for (let i = 0; i < pts.length; i++) {
      const P = per * (0.7 + 0.6 * E.hash(i, seed)), ph = mod(t / P + E.hash(i, seed + 1), 1);
      if (ph > duty) continue;
      const k = Math.sin((PI * ph) / duty);
      S.sparkle(ctx, pts[i][0], pts[i][1], r * (0.6 + 0.5 * E.hash(i, seed + 2)) * k, alpha * k, col, (E.hash(i, seed + 3) - 0.5) * 0.4);
    }
  };

  /* =====================================================================================
   * SECCADE (prayer rug)
   * ===================================================================================== */
  const SECC = [
    { field: '#A8323E', deep: '#6E1A26', light: '#C9505A', border: '#2A3A6A' },
    { field: '#2F7D5B', deep: '#174A35', light: '#4A9C77', border: '#6E1A26' },
    { field: '#2E5FA3', deep: '#183869', light: '#4C7EC4', border: '#8A2430' },
  ];
  function seccSprite(pal, w, h) {
    const k = 3, fr = h * 0.045;
    return S.sprite(`secc_${pal}_${w}_${h}`, w * k, (h + fr * 2) * k, (x) => {
      x.scale(k, k); x.translate(0, fr);
      const P = SECC[pal], gold = '#E6B85C';
      x.strokeStyle = '#EFE3C8'; x.lineWidth = 0.6; x.lineCap = 'round';
      for (let i = 0; i <= 26; i++) { const xx = 2 + ((w - 4) * i) / 26, wg = (E.hash(i, pal + 3) - 0.5) * 1.6; x.beginPath(); x.moveTo(xx, 0.5); x.lineTo(xx + wg, -fr * (0.75 + 0.25 * E.hash(i, 9))); x.moveTo(xx, h - 0.5); x.lineTo(xx - wg, h + fr * (0.75 + 0.25 * E.hash(i, 10))); x.stroke(); }
      x.fillStyle = P.border; x.fillRect(0, 0, w, h);
      const bw = w * 0.12;
      x.fillStyle = gold; x.fillRect(bw * 0.18, bw * 0.18, w - bw * 0.36, h - bw * 0.36);
      x.fillStyle = P.border; x.fillRect(bw * 0.26, bw * 0.26, w - bw * 0.52, h - bw * 0.52);
      x.fillStyle = gold;
      const nd = Math.round((h - bw * 2) / (bw * 0.9));
      for (let i = 0; i < nd; i++) { const yy = bw + (i + 0.5) * ((h - bw * 2) / nd); for (const xx of [bw * 0.55, w - bw * 0.55]) { x.beginPath(); x.moveTo(xx, yy - bw * 0.26); x.lineTo(xx + bw * 0.2, yy); x.lineTo(xx, yy + bw * 0.26); x.lineTo(xx - bw * 0.2, yy); x.closePath(); x.fill(); } }
      const nh = Math.round((w - bw * 2) / (bw * 0.9));
      for (let i = 0; i < nh; i++) { const xx = bw + (i + 0.5) * ((w - bw * 2) / nh); for (const yy of [bw * 0.55, h - bw * 0.55]) { x.beginPath(); x.moveTo(xx - bw * 0.26, yy); x.lineTo(xx, yy - bw * 0.2); x.lineTo(xx + bw * 0.26, yy); x.lineTo(xx, yy + bw * 0.2); x.closePath(); x.fill(); } }
      const fx = bw, fy = bw, fw = w - bw * 2, fh = h - bw * 2;
      x.fillStyle = gold; x.fillRect(fx - 1, fy - 1, fw + 2, fh + 2);
      const fg = x.createLinearGradient(0, fy, 0, fy + fh); fg.addColorStop(0, P.deep); fg.addColorStop(0.5, P.field); fg.addColorStop(1, P.deep);
      x.fillStyle = fg; x.fillRect(fx, fy, fw, fh);
      // mihrab niche
      const m = fw * 0.1, ax = fx + m, aw = fw - m * 2, apex = fy + fh * 0.07, spring = fy + fh * 0.36, bot = fy + fh * 0.93;
      const niche = new Path2D(); niche.moveTo(ax, bot); niche.lineTo(ax, spring);
      niche.bezierCurveTo(ax, spring - (spring - apex) * 0.55, ax + aw * 0.3, apex + (spring - apex) * 0.15, ax + aw / 2, apex);
      niche.bezierCurveTo(ax + aw * 0.7, apex + (spring - apex) * 0.15, ax + aw, spring - (spring - apex) * 0.55, ax + aw, spring);
      niche.lineTo(ax + aw, bot); niche.closePath();
      x.fillStyle = P.light; x.fill(niche);
      const ng = x.createLinearGradient(0, apex, 0, bot); ng.addColorStop(0, 'rgba(255,255,255,0.12)'); ng.addColorStop(1, 'rgba(0,0,0,0.1)');
      x.fillStyle = ng; x.fill(niche);
      x.strokeStyle = gold; x.lineWidth = 1.3; x.stroke(niche);
      x.lineWidth = 0.6; x.save(); x.translate(ax + aw / 2, (apex + spring) / 2 + 2); x.scale(0.86, 0.9); x.translate(-(ax + aw / 2), -((apex + spring) / 2 + 2)); x.stroke(niche); x.restore();
      x.fillStyle = gold;
      for (const sgn of [-1, 1]) { x.save(); x.translate(fx + fw / 2 + sgn * fw * 0.36, fy + fh * 0.075); x.fill(S.starPath(fw * 0.06, 8, 0.55, 0)); x.restore(); }
      // hanging lamp motif in mihrab
      const lx = ax + aw / 2, ly = spring + fh * 0.02;
      x.strokeStyle = gold; x.lineWidth = 0.7; x.beginPath(); x.moveTo(lx, apex + 4); x.lineTo(lx, ly - fw * 0.04); x.stroke();
      x.beginPath(); x.moveTo(lx - fw * 0.09, ly); x.quadraticCurveTo(lx, ly + fw * 0.2, lx + fw * 0.09, ly); x.lineTo(lx + fw * 0.05, ly - fw * 0.05); x.lineTo(lx - fw * 0.05, ly - fw * 0.05); x.closePath(); x.fill();
      x.save(); x.translate(lx, fy + fh * 0.66); x.strokeStyle = gold; x.lineWidth = 0.9; x.stroke(S.starPath(fw * 0.16, 8, 0.72, PI / 8)); x.fill(S.starPath(fw * 0.07, 8, 0.6, 0)); x.restore();
      x.fillStyle = gold; for (let i = -1; i <= 1; i++) { x.save(); x.translate(lx + i * fw * 0.18, fy + fh * 0.86); x.rotate(PI / 4); x.fillRect(-1.6, -1.6, 3.2, 3.2); x.restore(); }
      // weave texture
      x.globalAlpha = 0.07; x.strokeStyle = '#000';
      for (let i = 0; i < w; i += 1.6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
      x.globalAlpha = 0.05; x.strokeStyle = '#fff';
      for (let j = 0; j < h; j += 2.2) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); }
      x.globalAlpha = 1;
      const sh = x.createLinearGradient(0, 0, w, 0); sh.addColorStop(0, 'rgba(255,255,255,0.1)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.14)');
      x.fillStyle = sh; x.fillRect(0, 0, w, h);
    });
  }
  A.seccade = (ctx, o = {}) => {
    const w = dv(o.w, 120), h = dv(o.h, 220), pal = Math.abs(o.palette | 0) % 3, un = clamp(dv(o.unroll, 1)), persp = clamp(dv(o.persp, 0.5));
    const spr = seccSprite(pal, w, h), k = spr.width / w, fr = h * 0.045, P = SECC[pal];
    const Hs = h * (1 - 0.45 * persp);
    const wAt = (v) => w * lerp(1 - 0.3 * persp, 1, v / h), yAt = (v) => -Hs / 2 + (v / h) * Hs, frS = fr * (1 - 0.45 * persp);
    const vR = un * h;
    ctx.save();
    if (vR > 0.5) {
      ctx.fillStyle = 'rgba(10,6,16,0.28)';
      ctx.beginPath(); ctx.moveTo(-wAt(0) / 2 - 3, yAt(0) + 2); ctx.lineTo(wAt(0) / 2 + 5, yAt(0) + 2); ctx.lineTo(wAt(vR) / 2 + 6, yAt(vR) + 5); ctx.lineTo(-wAt(vR) / 2 - 2, yAt(vR) + 5); ctx.closePath(); ctx.fill();
      ctx.drawImage(spr, 0, 0, w * k, fr * k, -wAt(0) / 2, yAt(0) - frS, wAt(0), frS);
      const N = 26;
      for (let i = 0; i < N; i++) {
        const v0 = (i / N) * h; if (v0 >= vR) break;
        const v1 = Math.min(((i + 1) / N) * h, vR), ww = wAt((v0 + v1) / 2), y0 = yAt(v0), y1 = yAt(v1);
        ctx.drawImage(spr, 0, (fr + v0) * k, w * k, Math.max(1, (v1 - v0) * k), -ww / 2, y0, ww, y1 - y0 + 0.6);
      }
      if (un >= 0.999) ctx.drawImage(spr, 0, (fr + h) * k, w * k, fr * k, -wAt(h) / 2, yAt(h), wAt(h), frS);
    }
    if (un < 0.999) {
      const rr = h * (0.07 * Math.sqrt(1 - un) + 0.014), ryy = rr * (1 - 0.35 * persp), yc = yAt(vR) - ryy * 0.6, ww = wAt(vR) + 2;
      ctx.fillStyle = 'rgba(10,6,16,0.3)'; ctx.beginPath(); ctx.ellipse(0, yc + ryy * 0.9, ww * 0.52, ryy * 0.5, 0, 0, TAU); ctx.fill();
      const body = new Path2D(); body.roundRect(-ww / 2, yc - ryy, ww, ryy * 2, ryy);
      ctx.fillStyle = E.lin(ctx, 0, yc - ryy, 0, yc + ryy, [[0, shadeH(P.field, 0.22)], [0.35, P.field], [0.8, P.deep], [1, shadeH(P.deep, -0.3)]]); ctx.fill(body);
      ctx.save(); ctx.clip(body); ctx.strokeStyle = 'rgba(230,184,92,0.75)'; ctx.lineWidth = Math.max(0.8, ryy * 0.18);
      ctx.beginPath(); ctx.moveTo(-ww / 2 + ww * 0.12, yc - ryy); ctx.lineTo(-ww / 2 + ww * 0.12, yc + ryy); ctx.moveTo(ww / 2 - ww * 0.12, yc - ryy); ctx.lineTo(ww / 2 - ww * 0.12, yc + ryy); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-ww / 2, yc - ryy * 0.75, ww, ryy * 0.28);
      ctx.restore();
      for (const sgn of [-1, 1]) {
        ctx.fillStyle = P.border; ctx.beginPath(); ctx.ellipse(sgn * ww / 2, yc, ryy * 0.42, ryy, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = E.rgba('#E6B85C', 0.8); ctx.lineWidth = Math.max(0.5, ryy * 0.1);
        for (let q = 1; q <= 3; q++) { ctx.beginPath(); ctx.ellipse(sgn * ww / 2, yc, ryy * 0.42 * (q / 3.4), ryy * (q / 3.4), 0, 0, TAU); ctx.stroke(); }
      }
    }
    ctx.restore();
  };

  /* =====================================================================================
   * MOSQUE SILHOUETTE (abstract Masjid an-Nabawi)
   * ===================================================================================== */
  function crescentPath(p, x, y, R) {
    p.moveTo(x + R * 0.748, y - R * 0.664);
    p.arc(x, y, R, -0.726, PI + 0.726, false);
    p.arc(x, y - R * 0.38, R * 0.8, PI + 0.363, -0.363, true);
    p.closePath();
  }
  A.mosque = (ctx, o = {}) => {
    const w = dv(o.w, 700), u = w / 700, col = o.col || '#2A2140', domeC = o.dome || '#3E8E5E', rim = clamp(dv(o.rim, 1)), sun = o.sun === -1 ? -1 : 1, lights = clamp(o.lights || 0);
    const warm = o.rimCol || '#FFC98F', t = o.t || 0;
    ctx.save();
    const sil = new Path2D();
    const bw = 600 * u, bh = 46 * u;
    sil.rect(-bw / 2, -bh, bw, bh);
    for (let x = -bw / 2 + 4 * u; x < bw / 2 - 4 * u; x += 11 * u) sil.rect(x, -bh - 5 * u, 6 * u, 5.5 * u);
    sil.rect(-150 * u, -bh - 12 * u, 300 * u, 12 * u);
    for (let j = 0; j < 12; j++) { const x = -bw / 2 + 34 * u + j * 48 * u; if (Math.abs(x - 70 * u) < 50 * u) continue; sil.moveTo(x - 13 * u, -bh); sil.ellipse(x, -bh - 1, 13 * u, 11 * u, 0, PI, 0, false); sil.closePath(); }
    const mins = [[-262, 255], [-150, 290], [180, 290], [272, 255]];
    const minPath = (mx, H) => {
      const p = new Path2D(), x = mx * u, Hh = H * u;
      p.rect(x - 9 * u, -Hh * 0.3, 18 * u, Hh * 0.3);
      p.moveTo(x - 6.5 * u, -Hh * 0.3); p.lineTo(x - 5.5 * u, -Hh * 0.8); p.lineTo(x + 5.5 * u, -Hh * 0.8); p.lineTo(x + 6.5 * u, -Hh * 0.3); p.closePath();
      for (const f of [0.48, 0.68]) { p.rect(x - 10 * u, -Hh * f - 4 * u, 20 * u, 4 * u); p.moveTo(x - 10 * u, -Hh * f); p.lineTo(x - 5.5 * u, -Hh * f + 7 * u); p.lineTo(x + 5.5 * u, -Hh * f + 7 * u); p.lineTo(x + 10 * u, -Hh * f); p.closePath(); }
      p.rect(x - 4.5 * u, -Hh * 0.88, 9 * u, Hh * 0.08 + 1);
      p.rect(x - 7.5 * u, -Hh * 0.885, 15 * u, 3 * u);
      p.moveTo(x - 5.5 * u, -Hh * 0.88); p.quadraticCurveTo(x - 4.5 * u, -Hh * 0.93, x, -Hh * 0.975); p.quadraticCurveTo(x + 4.5 * u, -Hh * 0.93, x + 5.5 * u, -Hh * 0.88); p.closePath();
      p.rect(x - 0.8 * u, -Hh * 0.995, 1.6 * u, Hh * 0.025);
      crescentPath(p, x, -Hh - 3 * u, 4.2 * u);
      return p;
    };
    ctx.fillStyle = col; ctx.fill(sil);
    for (const [mx, H] of mins) ctx.fill(minPath(mx, H));
    // arcade windows
    const na = 22;
    for (let i = 0; i < na; i++) {
      const x = -bw / 2 + (i + 0.5) * (bw / na), aw = (bw / na) * 0.55, top = -bh * 0.72, bot = -bh * 0.12;
      ctx.beginPath(); ctx.moveTo(x - aw / 2, bot); ctx.lineTo(x - aw / 2, top + aw * 0.4); ctx.quadraticCurveTo(x - aw / 2, top, x, top - aw * 0.25); ctx.quadraticCurveTo(x + aw / 2, top, x + aw / 2, top + aw * 0.4); ctx.lineTo(x + aw / 2, bot); ctx.closePath();
      ctx.fillStyle = lights > 0 ? E.mix(shadeH(col, 0.08), '#FFD98A', lights * (0.55 + 0.25 * E.hash(i, 3))) : E.shade(col, 0.07); ctx.fill();
    }
    // green dome on drum
    const dx = 70 * u, base = -bh - 12 * u;
    ctx.fillStyle = col; ctx.fillRect(dx - 30 * u, base - 16 * u, 60 * u, 17 * u);
    const dome = new Path2D(); const dr = 28 * u, dh = 46 * u, db = base - 16 * u;
    dome.moveTo(dx - dr, db); dome.bezierCurveTo(dx - dr * 1.05, db - dh * 0.62, dx - dr * 0.45, db - dh * 0.98, dx, db - dh); dome.bezierCurveTo(dx + dr * 0.45, db - dh * 0.98, dx + dr * 1.05, db - dh * 0.62, dx + dr, db); dome.closePath();
    ctx.fillStyle = E.lin(ctx, dx - dr * sun, 0, dx + dr * sun, 0, [[0, shadeH(domeC, -0.35)], [0.6, domeC], [1, shadeH(domeC, 0.25)]]); ctx.fill(dome);
    ctx.save(); ctx.clip(dome);
    ctx.strokeStyle = 'rgba(10,40,25,0.35)'; ctx.lineWidth = 1 * u;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(dx + i * dr * 0.3, db); ctx.quadraticCurveTo(dx + i * dr * 0.22, db - dh * 0.75, dx, db - dh); ctx.stroke(); }
    if (rim > 0) { ctx.strokeStyle = E.rgba('#8FE3A8', 0.9 * rim); ctx.lineWidth = 3.2 * u; ctx.beginPath(); ctx.moveTo(dx + sun * dr * 0.98, db); ctx.bezierCurveTo(dx + sun * dr * 1.03, db - dh * 0.62, dx + sun * dr * 0.45, db - dh * 0.98, dx, db - dh); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = E.mix(col, domeC, 0.3); ctx.fillRect(dx - dr, db - 2.5 * u, dr * 2, 3 * u);
    ctx.fillStyle = col; ctx.fillRect(dx - 0.9 * u, db - dh - 12 * u, 1.8 * u, 12 * u); ctx.beginPath(); ctx.arc(dx, db - dh - 6 * u, 2.4 * u, 0, TAU); ctx.fill();
    const cp = new Path2D(); crescentPath(cp, dx, db - dh - 15 * u, 4 * u); ctx.fill(cp);
    if (rim > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = E.rgba(warm, 0.35 * rim); ctx.lineWidth = 1.4 * u;
      for (const [mx, H] of mins) { const x = mx * u + sun * 6 * u, Hh = H * u; ctx.beginPath(); ctx.moveTo(x, -Hh * 0.3); ctx.lineTo(x - sun * 0.6 * u, -Hh * 0.8); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-bw / 2, -bh - 5 * u); ctx.lineTo(bw / 2, -bh - 5 * u); ctx.globalAlpha = 0.5; ctx.stroke();
      S.light(ctx, dx + sun * dr * 0.6, db - dh * 0.6, dr * 2.2, '#8FE3A8', 0.25 * rim * (0.9 + 0.1 * Math.sin(t)));
      ctx.restore();
    }
    ctx.restore();
  };

  /* =====================================================================================
   * HANGING LANTERN (pierced brass)
   * ===================================================================================== */
  A.hangingLantern = (ctx, o = {}) => {
    const size = dv(o.size, 120), u = size / 120, t = o.t || 0, lit = clamp(dv(o.lit, 1));
    const chain = dv(o.chain, size * 0.6), sw = (dv(o.swing, 3) * PI) / 180, ang = sw * Math.sin(t * TAU * dv(o.hz, 0.6) + (o.phase || 0));
    const top = chain, bodyT = top + 16 * u, bodyH = 84 * u, bodyB = bodyT + bodyH, cyB = bodyT + bodyH * 0.5;
    const hwF = (q) => 6 * u + 34 * u * Math.pow(Math.sin(PI * Math.pow(clamp(q), 0.85)), 0.85);
    const cxw = -Math.sin(ang) * cyB, cyw = Math.cos(ang) * cyB;
    ctx.save();
    if (lit > 0.01) {
      S.light(ctx, cxw, cyw, size * 1.5, '#FFAE42', 0.38 * lit * (0.94 + 0.06 * E.noise(t * 9, 2)));
      if (o.dots !== false) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const R0 = dv(o.dotR, size * 3.4);
        for (let q = 0; q < 4; q++) {
          const nn = 12 + q * 5, rr = R0 * (0.36 + q * 0.21);
          for (let j = 0; j < nn; j++) {
            const a = (j / nn) * TAU + q * 0.37 + ang * (2.5 + q), x = cxw + Math.cos(a) * rr * (1 - 0.06 * q), y = cyw + Math.sin(a) * rr * 0.82;
            const dr = (2.2 + q * 1.6) * u * (j % 3 === 0 ? 1.4 : 1);
            ctx.fillStyle = E.rad(ctx, x, y, 0, dr * 2, [[0, '#FFE3A3', 0.42 * lit * (1 - q * 0.18)], [0.5, '#FFAE42', 0.2 * lit], [1, '#FFAE42', 0]]);
            ctx.beginPath(); ctx.arc(x, y, dr * 2, 0, TAU); ctx.fill();
          }
        }
        ctx.restore();
      }
    }
    ctx.rotate(ang);
    ctx.strokeStyle = '#6A4818'; ctx.lineWidth = 2.2 * u;
    for (let y = 0; y < top; y += 9 * u) { ctx.beginPath(); ctx.ellipse(0, y + 4.5 * u, ((y / (9 * u)) % 2 ? 1.2 : 2.8) * u, 4.5 * u, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = BRASS(ctx, -22 * u, 22 * u);
    ctx.beginPath(); ctx.moveTo(-4 * u, top); ctx.quadraticCurveTo(-20 * u, top + 6 * u, -22 * u, bodyT); ctx.lineTo(22 * u, bodyT); ctx.quadraticCurveTo(20 * u, top + 6 * u, 4 * u, top); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, top, 4.5 * u, 0, TAU); ctx.fill();
    const body = []; const nB = 26;
    for (let i = 0; i <= nB; i++) { const q = i / nB; body.push([hwF(q), bodyT + q * bodyH]); }
    for (let i = nB; i >= 0; i--) { const q = i / nB; body.push([-hwF(q), bodyT + q * bodyH]); }
    const bp = new Path2D(); crPath(bp, body, true);
    ctx.fillStyle = E.lin(ctx, -40 * u, 0, 40 * u, 0, [[0, '#3A2408'], [0.25, '#C99A4A'], [0.38, '#F2D58E'], [0.6, '#A87A34'], [1, '#2E1C08']]); ctx.fill(bp);
    ctx.save(); ctx.clip(bp);
    if (lit > 0.01) { ctx.globalCompositeOperation = 'lighter'; S.light(ctx, 0, cyB, 46 * u, '#FFAE42', 0.25 * lit); ctx.globalCompositeOperation = 'source-over'; }
    for (let r = 0; r < 6; r++) {
      const q = 0.14 + r * 0.145, yy = bodyT + q * bodyH, hw = hwF(q), nn = 7;
      for (let j = 0; j < nn; j++) {
        const phi = ((j + (r % 2) * 0.5) / nn - 0.5) * PI * 0.92, cs = Math.cos(phi); if (cs < 0.15) continue;
        const x = hw * Math.sin(phi), hr = 3.3 * u * cs, vr = (r % 2 ? 4.4 : 3.2) * u;
        ctx.beginPath();
        if (r % 2) { ctx.moveTo(x, yy - vr); ctx.quadraticCurveTo(x + hr, yy, x, yy + vr * 0.7); ctx.quadraticCurveTo(x - hr, yy, x, yy - vr); }
        else ctx.ellipse(x, yy, hr, vr * 0.8, 0, 0, TAU);
        ctx.fillStyle = lit > 0.01 ? E.mix('#24160C', '#FFF2C8', lit * (0.65 + 0.35 * cs)) : '#24160C'; ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = BRASS(ctx, -40 * u, 40 * u); ctx.lineWidth = 2.6 * u;
    for (const q of [0.06, 0.94]) { const yy = bodyT + q * bodyH, hw = hwF(q); ctx.beginPath(); ctx.ellipse(0, yy, hw, hw * 0.16, 0, 0, PI); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,248,220,0.4)'; ctx.beginPath(); ctx.ellipse(-hwF(0.4) * 0.5, cyB - bodyH * 0.12, 3 * u, bodyH * 0.28, 0.08, 0, TAU); ctx.fill();
    ctx.fillStyle = BRASS(ctx, -10 * u, 10 * u);
    ctx.beginPath(); ctx.moveTo(-8 * u, bodyB - 1); ctx.quadraticCurveTo(-3 * u, bodyB + 12 * u, 0, bodyB + 22 * u); ctx.quadraticCurveTo(3 * u, bodyB + 12 * u, 8 * u, bodyB - 1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, bodyB + 23 * u, 3.4 * u, 0, TAU); ctx.fill();
    if (lit > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      for (let r = 0; r < 6; r++) { const q = 0.14 + r * 0.145, yy = bodyT + q * bodyH; S.light(ctx, 0, yy, hwF(q) * 0.9, '#FFAE42', 0.12 * lit); }
    }
    ctx.restore();
    return { x: cxw, y: cyw };
  };

  /* =====================================================================================
   * DEBUG SHOWCASE SCENES (never in the film)
   * ===================================================================================== */
  function bg(ctx, a, b, c) { ctx.fillStyle = E.lin(ctx, 0, 0, 0, E.H, [[0, a], [0.55, b], [1, c]]); ctx.fillRect(0, 0, E.W, E.H); }
  const miniRose = (c) => { c.save(); c.translate(0, -60); S.flower(c, { type: 'tulip', r: 34, col: '#FF6F91', col2: '#C2185B', open: 0.6 }); c.restore(); c.strokeStyle = '#2F7D5B'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, 0); c.stroke(); };
  E.scene({
    id: 'X_objects', t0: 9200, t1: 9206,
    post: { bloom: 0.3, vignette: 0.15, grain: 0.03 },
    draw(ctx, t) {
      const pg = clamp(Math.floor(t - 9200), 0, 5), lt = t - 9200 - pg;
      if (pg === 0) {
        bg(ctx, '#3B3557', '#3A4560', '#2B4A55');
        E.at(ctx, 300, 300, 0.62, 0, (c) => A.iznikBowl(c, { t, honey: 46, litRadius: 150 + lt * 120, reflection: true }));
        E.at(ctx, 790, 300, 0.5, 0, (c) => A.iznikBowl(c, { t, overflow: 0.6 + lt * 0.4 }));
        E.at(ctx, 190, 950, 0.62, 0, (c) => A.hourglass(c, { t, sandTop: 0.55, sandBottom: 0.4, flow: 1 }));
        E.at(ctx, 470, 1060, 0.9, 0, (c) => A.kandil(c, { t, lit: 1, oil: 0.55 }));
        E.at(ctx, 650, 1060, 0.9, 0, (c) => A.kandil(c, { t, ember: true, oil: 0.08 }));
        E.at(ctx, 880, 1080, 0.85, 0, (c) => A.bellJar(c, { t, spec: lt, content: miniRose }));
        E.at(ctx, 200, 1840, 0.42, 0, (c) => A.archGate(c, { t, w: 600, h: 900 }));
        E.at(ctx, 520, 1840, 0.42, 0, (c) => A.archGate(c, { t, w: 600, h: 900, luminous: 1, back: '#3A2A50' }));
        E.at(ctx, 860, 1180, 1, 0, (c) => A.hangingLantern(c, { t, size: 100, lit: 1 }));
        E.at(ctx, 820, 1560, 1, 0, (c) => A.star8(c, { r: 90, open: lt, draw: 1, glow: 0.6 }));
        E.at(ctx, 820, 1800, 1, 0, (c) => A.rosetteFlower(c, { r: 90, fill: 1, t }));
      } else if (pg === 1) {
        bg(ctx, '#2A1633', '#4A2346', '#1C1024');
        ctx.fillStyle = '#1C1024'; ctx.fillRect(0, 700, E.W, 1220);
        E.at(ctx, 540, 380, 0.9, 0, (c) => A.iznikBowl(c, { t, honey: 40, litRadius: 30 + lt * 260, reflection: true }));
        E.at(ctx, 280, 1050, 0.62, 0, (c) => A.iznikBowl(c, { t, dim: 1, lit: 0, widen: lt }));
        E.at(ctx, 800, 1050, 0.62, 0, (c) => A.iznikBowl(c, { t, ry: 220, lit: 1 }));
        E.at(ctx, 540, 1500, 0.7, 0, (c) => A.iznikBowl(c, { t, overflow: lt, reflection: true }));
        ctx.strokeStyle = '#6FF0FF'; ctx.lineWidth = 2;
        E.at(ctx, 120, 1300, 0.28, 0, (c) => { A.strokeShape(c, A.bowlSilhouette({}), false); });
        E.at(ctx, 120, 1300 + 0.28 * 220, 0.28, 0, (c) => { c.strokeStyle = '#FFD27A'; A.strokeShape(c, A.hourglassSilhouette({ h: 660, w: 660 }), false); });
        E.at(ctx, 960, 1300, 0.28, 0, (c) => { const a = A.bowlSilhouette({}).map((p) => [p[0], p[1] - 220]), b = A.hourglassSilhouette({ h: 660, w: 660 }); c.fillStyle = 'rgba(207,243,255,0.5)'; A.fillShape(c, A.lerpShape(a, b, A.morphEase(lt)), false); });
      } else if (pg === 2) {
        bg(ctx, '#0E2433', '#17485A', '#2D6E74');
        E.at(ctx, 300, 760, 1, 0, (c) => A.hourglass(c, { t, h: 640, sandTop: 1 - lt * 0.8, sandBottom: 0.1 + lt * 0.7, flow: 1 + lt }));
        E.at(ctx, 780, 760, 0.9, 0, (c) => A.hourglass(c, { t, h: 640, w: 660, sandTop: 0, sandBottom: 0.9, flow: 0, glassAlpha: 1 }));
        E.at(ctx, 300, 1700, 1.4, 0, (c) => A.kandil(c, { t, lit: E.ease.outBack(clamp(lt * 2)), oil: 1 - lt * 0.7 }));
        E.at(ctx, 780, 1700, 1.4, 0, (c) => A.kandil(c, { t, lit: 1, ember: lt, oil: 0.1 }));
      } else if (pg === 3) {
        bg(ctx, '#241634', '#4A2A45', '#6E3B3B');
        E.at(ctx, 270, 720, 1.25, 0, (c) => A.bellJar(c, { t, spec: lt, content: miniRose }));
        E.at(ctx, 800, 720, 1.25, 0, (c) => A.bellJar(c, { t, w: 180, h: 340, tag: true }));
        E.at(ctx, 300, 160, 1.3, 0, (c) => A.hangingLantern(c, { t, size: 110, lit: lt }));
        E.at(ctx, 780, 160, 1.3, 0, (c) => A.hangingLantern(c, { t: t + 0.4, size: 110, lit: 1 }));
        E.at(ctx, 300, 1880, 0.55, 0, (c) => A.archGate(c, { t, w: 700, h: 1000, back: '#1C0F1E' }));
        E.at(ctx, 790, 1880, 0.55, 0, (c) => A.archGate(c, { t, w: 700, h: 1000, luminous: lt, back: '#1C0F1E' }));
      } else if (pg === 4) {
        bg(ctx, '#2A2148', '#E58A78', '#FFE7B5');
        ctx.fillStyle = '#EADBC0'; ctx.fillRect(0, 1100, E.W, 820);
        for (let i = 0; i < 5; i++) E.at(ctx, 140 + i * 200, 1350, 1.2, 0, (c) => A.seccade(c, { palette: i % 3, unroll: clamp(lt * 1.4 - i * 0.1), persp: 0.55 }));
        E.at(ctx, 540, 1750, 1.6, 0, (c) => A.seccade(c, { palette: 2, unroll: 1, persp: 0.3 }));
        E.at(ctx, 540, 1040, 1.45, 0, (c) => A.mosque(c, { t, w: 700, rim: 1, lights: 0.4 }));
        E.at(ctx, 540, 560, 0.9, 0, (c) => A.mosque(c, { t, w: 700, rim: 0.3 }));
      } else {
        bg(ctx, '#0B1A2A', '#10364A', '#0F4F5C');
        E.at(ctx, 270, 300, 1, 0, (c) => A.star8(c, { r: 150, open: 0, draw: lt, girih: true, glow: 0.5 }));
        E.at(ctx, 800, 300, 1, 0, (c) => A.star8(c, { r: 150, open: lt, draw: 1, girih: true, glow: 0.5, lineW: 4 }));
        E.at(ctx, 540, 860, 1, 0, (c) => A.girih(c, { r: 380, cell: 110, relief: 1, hue: t * 0.3, lineW: 4, draw: 0.3 + lt * 0.7, sweep: lt }));
        A.filament(ctx, [[60, 1260], [300, 1180], [560, 1320], [800, 1200], [1020, 1280]], { t, draw: lt, w: 2.5, halo: 10 });
        A.filament(ctx, [[60, 1420], [300, 1360], [560, 1450], [800, 1380], [1020, 1440]], { t, snap: lt, w: 2.2, halo: 9, col: '#FFC7D6' });
        A.petals(ctx, t, { n: 18, seed: 3, area: { x: 0, y: 1500, w: 540, h: 400 }, col: ['#FF6F91', '#FF9DB5', '#E8456F'], size: 24 });
        A.petals(ctx, t, { n: 24, seed: 4, t0: 9205, origin: { x: 800, y: 1700 }, light: true, speed: 360, size: 20 });
        A.lightRain(ctx, t, { n: 120, area: { x: 540, y: 1480, w: 540, h: 440 }, bandSlow: false });
        A.wisps(ctx, t, { x: 270, y: 1880, n: 8, spread: 40 });
        A.sparks(ctx, t, { x: 800, y: 1600, t0: 9205.1, n: 20 });
        A.glints(ctx, t, { pts: [[120, 1560], [200, 1640], [420, 1600], [480, 1720], [330, 1800]], period: 0.8, duty: 0.5, r: 16 });
        A.sand(ctx, t, { x: 980, y: 1500, len: 380, flow: 1.4 });
      }
    },
  });
  E.scene({
    id: 'X_geo', t0: 9300, t1: 9303,
    post: { bloom: 0.45, vignette: 0.2, grain: 0.03 },
    draw(ctx, t) {
      const pg = clamp(Math.floor(t - 9300), 0, 2), lt = t - 9300 - pg;
      if (pg === 0) {
        bg(ctx, '#0B1A2A', '#10364A', '#0F4F5C');
        A.girih(ctx, { cx: 540, cy: 860, r: 1150, cell: 150, relief: 1, hue: t * 0.25, lineW: 4.5, sweep: lt, rot: t * 0.02 });
        E.at(ctx, 540, 860, 1, 0, (c) => A.rosetteFlower(c, { r: 230, fill: 1, t, lighter: false }));
      } else if (pg === 1) {
        bg(ctx, '#F7EEDC', '#F1E4CB', '#EBD9BB');
        A.girih(ctx, { cx: 540, cy: 860, r: 900, cell: 130, lineW: 3.2, col: '#B8862E', draw: 0.2 + lt * 0.8, fill: 'rgba(216,178,110,0.3)', fill2: 'rgba(168,50,62,0.16)' });
        E.at(ctx, 540, 860, 1, 0, (c) => A.star8(c, { r: 260, open: 1, lineW: 5, col: '#C8922A' }));
      } else {
        bg(ctx, '#2E7F62', '#BDEBD8', '#FFFDF7');
        E.at(ctx, 540, 700, 1, 0, (c) => A.rosetteFlower(c, { r: 380, fill: lt, t }));
        E.at(ctx, 270, 1500, 1, 0, (c) => A.rosetteFlower(c, { r: 160, fill: 0.5, t }));
        E.at(ctx, 810, 1500, 1, 0, (c) => A.rosetteFlower(c, { r: 160, fill: 1, t, lighter: true }));
      }
    },
  });
})();
