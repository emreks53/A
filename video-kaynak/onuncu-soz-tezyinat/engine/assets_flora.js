/* =============================================================================
 * engine/assets_flora.js — FLORA & FAUNA asset library (namespace window.A)
 * =============================================================================
 * CONVENTIONS (read this, it is the whole contract)
 *  • Every draw call is A.name(ctx, opts) and draws centred at the CURRENT local origin.
 *    Position / scale / rotate with E.at(ctx, x, y, scale, rot, () => A.name(ctx, {...})).
 *    All sizes are local px (before the ctx transform). LOD + sprite resolution adapt automatically
 *    to the on-screen size (taken from the ctx transform), so zooming a camera stays crisp.
 *  • "Up" is −y. Angles are radians, positive = clockwise on screen.
 *  • t = seconds (any clock, e.g. video t). It only drives idle secondary motion (breathing, sway,
 *    flutter, twinkle, sheen). Everything is deterministic (no Math.random): same opts → same pixels.
 *  • Nothing here touches globalAlpha/compositing of the caller permanently (save/restore inside).
 *    Set ctx.globalAlpha before calling to fade an asset.
 *  • `light` = screen-space angle pointing FROM the object TO the key light (default −2.25 = upper-left).
 *
 * ─── HERO ROSE ──────────────────────────────────────────────────────────────
 *  A.heroRose(ctx, {
 *     R: 120,            radius (≈ half the width of the open head) in px. Gorgeous at 260–420.
 *     bloom: 1,          0 = closed bud (teardrop wrapped by sepals) … 1 = fully open (inner rings open later).
 *     wilt: 0,           0..1: colour → #6B3F4A, petals droop & tips curl in, head nods forward, shrivel.
 *     detach: 0,         0..1 progress of the OUTER ring flying off (staggered free-body paths with flutter,
 *                        flipping petals show their back). Or a function (i, ring) → 0..1 per petal.
 *     detachDir: −2.45,  mean wind direction (rad, screen). Default up-left (storyboard C).
 *     detachDist: 6,     travel distance in R units (enough to leave the frame from R=260).
 *     detachRings: 1,    how many outer rings can detach (1 or 2).
 *     heroIndex: 2,      outer-ring petal that does NOT fly away but hovers at (+0.62R, +0.36R) and bobs
 *                        (storyboard C "one hero petal stays"). −1 = none.
 *     variant: 'normal' | 'gem' | 'paradise' | 'mini' | 'outline',
 *        gem      = ruby facets (3 triangles per petal, #FF3D6E/#D41E52/#FF8AA8) + twinkling specular stars
 *        paradise = 8 rings, luminous pastel, inner 'lighter' glow #FFF0F4, gold edge #FFD27A, halo
 *        mini     = cheap 3-ring LOD for R ≤ 40 (bell jar, hourglass)
 *        outline  = thin luminous contour only (hidden lines removed) — the "original" ghost
 *     t: 0,              idle: breathing 1±0.012 (3.2 s) + outer petal flutter + gem twinkle.
 *     light: −2.25,      key-light angle (see conventions).
 *     tilt: 0.8,         camera elevation over the flower (rad). 0.4 = side view, 1.3 = top-down.
 *     rot: 0,            in-plane rotation of the head (use the stem tip angle).
 *     sepals: true,      green sepals + hip.
 *     col / lw / glow:   outline variant only: stroke colour (#FFF6E0), line width in SCREEN px (2), glow 0..1 (1).
 *     seed: 0            petal arrangement seed.
 *  })
 *  Origin = receptacle (where the stem attaches); the visible head centre sits ≈ (0, −0.12R) when open.
 *  A.heroRoseSilhouette(R, bloom=1, {variant, tilt}) → Array(128) of [x,y] in the same local coords,
 *     index 0 = top-most point, clockwise on screen. Cached. Use for morphs / match cuts.
 *  A.heroPetal(ctx, {R, t, wilt, flip: 1 (−1 = back side), rot, variant}) → one loose outer petal
 *     (same size as the rose's outer petals) centred on its centroid.
 *  A.petalSilhouette(R) → 128 [x,y] of that petal (top-first, clockwise).   A.teardropSilhouette(r) → 128 pts
 *     of a point-up teardrop (r = round-part radius, total height ≈ 2.6r, centred on the round part).
 *  A.stem(ctx, {len: 420, bend: 0 (total curvature, + = leans right), t, sway: 1, wilt: 0 (adds 40° droop
 *     + olive colour), droopDir: 1, leaves: 2, thorns: 5, width, phase}) → {x, y, angle}
 *     Draws FROM the origin (ground/base) UPWARD. Returns the tip; place the rose with
 *     E.at(ctx, tip.x, tip.y, 1, tip.angle, () => A.heroRose(ctx, {...})).  A.stemTip(opts) = same, no drawing.
 *
 * ─── FLOWER SET (Ottoman garden) ───────────────────────────────────────────
 *  A.flowerSet(ctx, {type: 'tulip'|'carnation'|'lily'|'lavender'|'daisy'|'hyacinth', size: 40 (head size px),
 *     pop: 1 (0..1 progress: scale 0→1.12→1 from the base, petals unfurl ±25°, stem grows),
 *     sway: 1 (amplitude multiplier), t, phase, stem: auto (stem length px; 0 = head only, head base at origin),
 *     leaves: true, palette: 'B' | 'J' (+10 % warm) | {a,b,c,hi,...}, rot: 0 (extra lean, e.g. bow to sun)})
 *     Origin = stem base on the ground (or the head base if stem:0). Height ≈ stem + 1.2·size.
 *  A.flowerSprite(type, size, variant='open'|'bud'|'head', palette='B') → {c, ax, ay, w, h}
 *     cached pre-drawn sprite; (ax, ay) = anchor (stem base, or head base for 'head') in sprite px.
 *  A.drawFlower(ctx, type, x, y, size, {pop: 1, rot: 0, alpha: 1, palette: 'B', head: false})
 *     cheap sprite path for 150–200 flowers/frame: pop = scale curve + bud→open crossfade, rot = sway
 *     about the base. ≈ 0.03 ms each.
 *
 * ─── FAUNA & OBJECTS ───────────────────────────────────────────────────────
 *  A.butterfly(ctx, {size: 60 (one wing length px; span ≈ 2·size), t, pattern: 'swallowtail'|'sapphire'|
 *     'monarch'|'pearl', flap: auto (number 0..1 = wing openness, 1 flat open), hz: 4.5 (flaps/s when auto),
 *     phase, gem: false (crystal facets + sparkles), rot, sheen: 1})  Top view, head up. Wing art is sprite-cached.
 *  A.hoopoe(ctx, {size: 80 (body ≈ 2.3·size long, 1.5·size tall), t, fan: 0..1 (crest folded→erect fan),
 *     pose: 'perch'|'bow'|'look'|'peck' or number 0..1 (bow amount), flip: false (true = faces left),
 *     branch: false (draw a short branch under the feet)})  Origin = feet on the perch, faces right.
 *  A.pomegranate(ctx, {r: 60, cut: false (open half with glossy seed cells), gem: false (faceted ruby), t, rot})
 *     Origin = fruit centre; crown extends to ≈ −1.25r.
 *  A.peacockFeather(ctx, {len: 300, t, sheen: 1, sway: 1})  Origin = quill base; feather points up (−y).
 *  A.snowflake(ctx, {r: 60, melt: 0..1 (arms retract, thicken, morph into a #8FDCFF droplet), t, rot})
 *  A.nautilus(ctx, {r: 60, t})   cut shell with chambers (#F2D6C2/#C98A6A), centred on the spiral bbox.
 *  A.bee(ctx, {size: 40 (body length), t, hover: true})   side view facing right, buzzing wings.
 *  A.grapes(ctx, {size: 100 (cluster height), gold: false, t})   origin = cluster centre, stem at top.
 *  A.cherries(ctx, {size: 80, t})   pair on joined stems + leaf; origin = centre.
 *
 * ─── GARDEN RIG ────────────────────────────────────────────────────────────
 *  A.garden(ctx, t, {palette: 'B'|'J'|'mini', scale: 1 (mini default 0.18), cx: 540, cy: 960 (where the
 *     plate centre lands), cam: {x, y, zoom} (plate coords, parallax per layer like E.parallax),
 *     wave: Infinity (seconds since the bloom wave started; flowers pop by distance from the sun),
 *     flowers: 180 (mini 70), span: [-120, 1200] (x range populated with flowers; widen for dollies),
 *     sunX, sunY (override; B→C sunset y 520→980), dusk: 0..1 (lerp toward C's dusk palette),
 *     bow: 0..1 (J gratitude: flowers lean toward the sun) or fn(x,y)→0..1, rose: (mini: true) draws the
 *     B hero rose on its stem at (540,820) R100, roseBloom: 1, fg: true (blurred foreground leaves, not mini),
 *     blur: 1 (depth-of-field multiplier for the foreground layer)})
 *     Draws the full 1080×1920 plate (sky, sun + glow + rays, clouds, 4 hill strata with haze & crest light,
 *     cypress/round trees, meadow + grass, winding path, flowers, foreground leaves) mapped to
 *     [cx−540·scale, cx+540·scale]×[cy−960·scale, cy+960·scale]. Returns {horizon, sun:{x,y,r}, rose:{x,y,R}}
 *     in plate coords.  It paints the whole rect: clip first when using it inside a jar.
 *
 * Debug showcases (never in the film): E.scene 'X_flora' (t0 9000) and 'X_flora_garden' (t0 9100).
 * ========================================================================== */
window.A = window.A || {};
(function () {
  'use strict';
  const A = window.A;
  const TAU = Math.PI * 2, PI = Math.PI;
  const clamp = E.clamp, lerp = E.lerp, sm = E.smooth;
  const H = (i, s) => E.hash(i, s);

  /* ---------------- colour helpers (arrays, fast) ---------------- */
  const C = (c) => (typeof c === 'string' ? E.rgb(c) : c);
  const mx = (a, b, t) => { a = C(a); b = C(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
  const css = (c, a = 1) => { c = C(c); return a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, a).toFixed(3)})`; };
  const lt = (c, k) => mx(c, [255, 255, 255], k), dk = (c, k) => mx(c, [0, 0, 0], k);
  const addStops = (g, stops) => { for (const s of stops) g.addColorStop(clamp(s[0]), css(s[1], s[2] === undefined ? 1 : s[2])); return g; };
  const LG = (ctx, x0, y0, x1, y1, stops) => { if (Math.abs(x1 - x0) + Math.abs(y1 - y0) < 1e-4) y1 = y0 + 1e-3; return addStops(ctx.createLinearGradient(x0, y0, x1, y1), stops); };
  const RG = (ctx, x, y, r0, r1, stops, x1, y1) => addStops(ctx.createRadialGradient(x, y, Math.max(0, r0), x1 === undefined ? x : x1, y1 === undefined ? y : y1, Math.max(1e-3, r1)), stops);
  const ramp = (stops, x) => {
    if (x <= stops[0][0]) return C(stops[0][1]);
    for (let i = 1; i < stops.length; i++) if (x <= stops[i][0]) { const a = stops[i - 1], b = stops[i]; return mx(a[1], b[1], (x - a[0]) / (b[0] - a[0])); }
    return C(stops[stops.length - 1][1]);
  };
  const devScale = (ctx) => { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; };
  const BUCKETS = [16, 24, 32, 48, 64, 96, 128, 160, 192, 256, 320, 384, 512, 640, 768, 1024];
  const bucket = (px) => { for (const v of BUCKETS) if (px <= v) return v; return 1024; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const bz = (p0, p1, p2, p3, t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };

  /** closed smooth path through flat [x0,y0,x1,y1,...] (quadratic midpoints) */
  function smoothClosed(pts) {
    const n = pts.length / 2, p = new Path2D();
    p.moveTo((pts[0] + pts[2]) / 2, (pts[1] + pts[3]) / 2);
    for (let i = 1; i <= n; i++) { const j = (i % n) * 2, k = ((i + 1) % n) * 2; p.quadraticCurveTo(pts[j], pts[j + 1], (pts[j] + pts[k]) / 2, (pts[j + 1] + pts[k + 1]) / 2); }
    p.closePath(); return p;
  }
  /** crescent fill: region of `path` NOT covered by `path` shifted by (dx,dy) → rim light / two-tone shadow */
  function crescent(ctx, path, dx, dy, col, a) {
    if (a <= 0.003) return;
    ctx.save(); ctx.clip(path);
    const p = new Path2D(); p.rect(-1e4, -1e4, 2e4, 2e4); p.addPath(path, new DOMMatrix().translate(dx, dy));
    ctx.fillStyle = css(col, a); ctx.fill(p, 'evenodd'); ctx.restore();
  }
  /** resample a closed [x,y] polygon to n points by arc length, start top-most, clockwise on screen */
  function resampleClosed(P, n = 128) {
    let area = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; area += a[0] * b[1] - b[0] * a[1]; }
    if (area < 0) P = P.slice().reverse();
    const L = [0]; for (let i = 1; i <= P.length; i++) { const a = P[i - 1], b = P[i % P.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const tot = L[L.length - 1], out = []; let j = 0;
    for (let k = 0; k < n * 4; k++) { const d = (k / (n * 4)) * tot; while (L[j + 1] < d) j++; const a = P[j], b = P[(j + 1) % P.length], f = (d - L[j]) / Math.max(1e-9, L[j + 1] - L[j]); out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); }
    // densely sampled → find top-most, then take every 4th from there
    let top = 0; for (let i = 1; i < out.length; i++) if (out[i][1] < out[top][1]) top = i;
    const res = []; for (let k = 0; k < n; k++) res.push(out[(top + k * 4) % out.length]);
    return res;
  }

  /* =====================================================================
   * HERO ROSE — 3D petal model (each petal a curved, cupped, wrapped surface)
   * ===================================================================== */
  const ROSE_PAL = {
    normal: { inner: ['#5E0832', '#C2185B', '#FF4F7B', '#FF8FA8'], outer: ['#7E0C40', '#D02560', '#FF5F88', '#FFA2B7'], rim: '#FFD1DC', shadow: '#4E0A44', edge: '#FF9DB6', core: '#2E0418', vein: '#FFC2D0' },
    paradise: { inner: ['#B82E5C', '#F5577F', '#FF8FAA', '#FFE0E8'], outer: ['#C93E6A', '#FF6F91', '#FFA3B8', '#FFEAF0'], rim: '#FFE3A6', shadow: '#A94471', edge: '#FFF0F4', core: '#9E2F5A', vein: '#FFF0F4' },
    sepal: { inner: ['#0F3B2A', '#1F6B4E', '#3FA36B', '#7CCB8A'], outer: ['#123F2D', '#25744F', '#46A86C', '#8AD496'], rim: '#C8F5C8', shadow: '#0B2E2A', edge: '#9FE0A8', core: '#06201A', vein: '#9FE0A8' },
  };
  const WILT_PAL = ['#2E1820', '#5A3440', '#6B3F4A', '#8C6066'];
  const EMERALD_RAMP = [[-1, '#02261A'], [-0.3, '#0B6E4A'], [0.1, '#17A673'], [0.5, '#2EE6A6'], [0.8, '#9AF7D6'], [1, '#E6FFF6']];
  const GEM_RAMP = [[-1, '#3A0214'], [-0.35, '#8E0E36'], [0.05, '#D41E52'], [0.45, '#FF3D6E'], [0.75, '#FF8AA8'], [1, '#FFE2EA']];

  // ring tables, sampled at q = 0 (outer) .25 .5 .75 1 (inner); interpolated for any ring count
  const RT = {
    oL: [0.8, 0.74, 0.62, 0.52, 0.38], oW: [0.52, 0.48, 0.45, 0.44, 0.4], oPhi: [1.0, 0.75, 0.46, 0.26, 0.35], oKap: [0.5, 0.28, 0.03, -0.32, -1.0],
    oLip: [0.42, 0.34, 0.24, 0.12, 0], oCup: [0.13, 0.26, 0.36, 0.4, 0.34], oWrap: [0.16, 0.36, 0.66, 0.95, 1], oRB: [0.13, 0.11, 0.09, 0.09, 0.075],
    cL: [0.8, 0.75, 0.68, 0.6, 0.5], cPhi: [0.5, 0.38, 0.28, 0.2, 0.25], cKap: [-0.85, -0.7, -0.6, -0.55, -0.8], cRB: [0.11, 0.095, 0.08, 0.07, 0.06],
  };
  const rt = (a, q) => { const f = clamp(q) * 4, i = Math.min(3, Math.floor(f)); return lerp(a[i], a[i + 1], f - i); };
  function roseRing(q, b, w) {
    return {
      L: lerp(rt(RT.cL, q), rt(RT.oL, q), b) * (1 - 0.1 * w),
      W: rt(RT.oW, q) * lerp(0.92, 1, b) * (1 - 0.14 * w),
      phi: lerp(rt(RT.cPhi, q), rt(RT.oPhi, q), b) + w * lerp(0.6, 0.15, q),
      kap: lerp(rt(RT.cKap, q), rt(RT.oKap, q), b) - w * 1.15,
      wrap: lerp(0.92, rt(RT.oWrap, q), b),
      rB: lerp(rt(RT.cRB, q), rt(RT.oRB, q), b),
      zB: lerp(0.0, 0.05, q),
      cup: lerp(0.38, rt(RT.oCup, q), b),
      lip: rt(RT.oLip, q) * b * (1 - w * 0.6),
      ruffle: 0.022 + w * 0.07,
      notch: 0.12,
    };
  }
  function petalPt(P, u, vs, G) {
    const phi = P.phi + P.kap * u, sp0 = Math.sin(P.phi), cp0 = Math.cos(P.phi);
    let rho, z;
    if (Math.abs(P.kap) < 1e-3) { rho = P.rB + P.L * u * sp0; z = P.zB + P.L * u * cp0; }
    else { rho = P.rB + (P.L * (cp0 - Math.cos(phi))) / P.kap; z = P.zB + (P.L * (Math.sin(phi) - sp0)) / P.kap; }
    const lat = vs * P.W;
    let dth = (P.wrap * lat) / Math.max(Math.abs(rho), 0.07);
    if (dth > 2.6) dth = 2.6; else if (dth < -2.6) dth = -2.6;
    const th = P.th + dth, ct = Math.cos(th), st = Math.sin(th), tf = (1 - P.wrap) * lat;
    let X = rho * ct - tf * P.st0, Y = rho * st + tf * P.ct0, Z = z;
    const cp = Math.cos(phi), sp = Math.sin(phi), lk = u > 0.5 ? (u - 0.5) * 2 : 0;
    const curl = (P.cup * vs * vs - P.lip * lk * lk * Math.pow(Math.abs(vs), 2.2)) * P.W;
    X -= ct * cp * curl; Y -= st * cp * curl; Z += sp * curl;
    return [X * G.R, -(Y * G.se + Z * G.ce) * G.R, X, Y, Z];
  }
  function petalOutline(P, G, n1, n2) {
    const c = P.pointed ? 0.32 : 0.58, side = [];
    for (let i = 0; i <= n1; i++) { const x = i / n1; side.push(x * c, (P.pointed ? 0.22 : 0.16) + (P.pointed ? 0.78 : 0.84) * Math.sin((x * PI) / 2)); }
    for (let i = 1; i <= n2; i++) {
      if (P.pointed) side.push(c + (1 - c) * (i / n2), Math.pow(1 - i / n2, 1.3));
      else { const a = ((i / n2) * PI) / 2; side.push(c + (1 - c) * Math.sin(a), Math.cos(a)); }
    }
    const m = side.length / 2, pts = [], rf = P.ruffle, sd = P.seed;
    const add = (u, w, sg) => {
      let uu = u, ww = w * (1 + rf * Math.sin(u * 13 + sd + sg * 1.7));
      if (!P.pointed && u > c) { uu -= P.notch * (1 - c) * Math.exp(-(w * w) / 0.06); uu += rf * 0.6 * Math.sin(w * 9 + sd * 3 + sg); }
      const q = petalPt(P, uu, sg * ww, G); pts.push(q[0], q[1]);
    };
    for (let j = 0; j < m; j++) add(side[2 * j], side[2 * j + 1], -1);
    for (let j = m - 2; j >= 0; j--) add(side[2 * j], side[2 * j + 1], 1);
    return pts;
  }
  const nIn = (th, phi) => [-Math.cos(th) * Math.cos(phi), -Math.sin(th) * Math.cos(phi), Math.sin(phi)];
  function makePetal(P, G, lod) {
    const n1 = lod >= 2 ? 8 : lod === 1 ? 6 : 4, n2 = lod >= 2 ? 7 : lod === 1 ? 5 : 3;
    const pts = petalOutline(P, G, n1, n2);
    const B = petalPt(P, 0.02, 0, G), T = petalPt(P, 0.96, 0, G), M = petalPt(P, 0.5, 0, G);
    const Lm = petalPt(P, 0.55, -0.85, G), Rm = petalPt(P, 0.55, 0.85, G);
    const phiM = P.phi + P.kap * 0.5, rhoM = Math.max(Math.hypot(M[2], M[3]), 0.07);
    const dS = clamp((P.wrap * 0.8 * P.W) / rhoM, -2.4, 2.4) + 0.35 * P.cup;
    const nC = nIn(P.th, phiM), face = dot(nC, G.V) >= 0 ? 1 : -1;
    const lam = (n) => face * dot(n, G.L);
    const pt = {
      P, pts, path: smoothClosed(pts), B, T, M, Lm, Rm, face,
      lam: lam(nC), lamL: lam(nIn(P.th - dS, phiM)), lamR: lam(nIn(P.th + dS, phiM)), lamT: lam(nIn(P.th, P.phi + P.kap * 0.92)),
      depth: M[4] * G.se - M[3] * G.ce, q: P.q, sepal: P.sepal, k: P.k, i: P.i, tau: 0,
    };
    if (lod >= 2 && !P.sepal && G.veins) {
      pt.veins = [];
      for (const v of [-0.55, -0.22, 0.12, 0.45]) { const a = []; for (let j = 0; j <= 5; j++) { const u = 0.08 + j * 0.15, q = petalPt(P, u, v * (0.5 + u * 0.6), G); a.push(q[0], q[1]); } pt.veins.push(a); }
    }
    if (G.gem) { pt.g = [petalPt(P, 0, 0, G), petalPt(P, 0.6, -1, G), petalPt(P, 0.62, 0, G), petalPt(P, 0.6, 1, G), petalPt(P, 1, 0, G)]; }
    return pt;
  }
  function lightVec(G, a) {
    const sx = Math.cos(a), up = -Math.sin(a);
    return norm([sx, up * G.se + 0.55 * -G.ce, up * G.ce + 0.55 * G.se]);
  }
  function roseGeom(o, lod) {
    const R = o.R || 120, bloom = clamp(o.bloom === undefined ? 1 : o.bloom), w = clamp(o.wilt || 0), t = o.t || 0;
    const variant = o.variant || 'normal', seed = o.seed || 0;
    const rings = o.rings || (variant === 'paradise' ? [5, 5, 6, 6, 7, 7, 6, 4] : variant === 'mini' || variant === 'gem' ? [5, 5, 4] : [5, 5, 6, 6, 4]);
    const eps = (o.tilt === undefined ? 0.8 : o.tilt) + w * 0.4;
    const G = { R, se: Math.sin(eps), ce: Math.cos(eps), gem: variant === 'gem', veins: variant === 'normal' || variant === 'paradise' };
    G.V = [0, -G.ce, G.se]; G.L = lightVec(G, o.light === undefined ? -2.25 : o.light);
    const petals = [], nR = rings.length;
    if (o.sepals !== false && variant !== 'outline') {
      for (let i = 0; i < 5; i++) {
        const th = (i / 5) * TAU + 0.3 + seed;
        const P = { th, st0: Math.sin(th), ct0: Math.cos(th), L: lerp(0.56, 0.42, bloom), W: 0.12, phi: lerp(0.42, 2.05, sm(bloom * 1.3)) + w * 0.3 + 0.03 * Math.sin(t * 1.3 + i), kap: lerp(-0.25, 0.45, bloom), wrap: lerp(0.85, 0.35, bloom), rB: lerp(0.1, 0.12, bloom), zB: -0.05, cup: 0.2, lip: 0, ruffle: 0.02, notch: 0, pointed: true, sepal: true, q: -0.3, k: -1, i, seed: i * 2.1 + seed };
        petals.push(makePetal(P, G, lod));
      }
    }
    for (let k = 0; k < nR; k++) {
      const q = nR > 1 ? k / (nR - 1) : 0, n = rings[k];
      const bk = sm((bloom - q * 0.3) / (1 - q * 0.3));
      for (let i = 0; i < n; i++) {
        const P = roseRing(q, bk, w);
        if (G.gem) { P.wrap *= 0.55; P.cup *= 0.4; P.lip = 0; P.ruffle = 0; P.notch = 0; P.phi *= 0.82; P.kap *= 0.4; }
        P.th = ((i + 0.5 * ((k + 1) % 2)) / n) * TAU + k * 0.37 + seed + (H(i + k * 13, 5) - 0.5) * 0.18 - PI / 2;
        P.st0 = Math.sin(P.th); P.ct0 = Math.cos(P.th);
        P.phi += 0.022 * Math.sin(t * 1.7 + i * 1.3 + k * 0.7) * (1 - q) * (0.4 + bk);
        P.L *= 1 + (H(i + k * 7, 9) - 0.5) * 0.08;
        if (k === nR - 1) { P.rB += i * 0.012; P.zB += i * 0.012; }
        P.q = q; P.k = k; P.i = i; P.seed = i * 1.7 + k * 3.1 + seed;
        petals.push(makePetal(P, G, lod));
      }
    }
    // spiral centre height (top of the innermost ring)
    const inner = roseRing(1, sm((bloom - 0.3) / 0.7), w);
    G.zTop = inner.zB + inner.L * Math.cos(inner.phi + inner.kap * 0.5) * 0.92;
    G.bloomIn = sm((bloom - 0.3) / 0.7);
    // detach
    const det = o.detach || 0, dR = o.detachRings || 1;
    if (det) {
      for (const p of petals) {
        if (p.sepal || p.k >= dR) continue;
        let tau;
        if (typeof det === 'function') tau = clamp(det(p.i, p.k));
        else { const order = H(p.i * 3 + p.k * 17, seed + 41) * 0.45 + p.k * 0.25; tau = clamp((det - order * 0.6) / 0.62); }
        p.tau = tau;
      }
    }
    G.nR = nR; G.petals = petals.sort((a, b) => a.depth - b.depth);
    return G;
  }

  function petalRamp(pt, pal, w, face) {
    const base = face > 0 ? pal.inner : pal.outer, f = 0.5 + 0.5 * pt.lam, out = [];
    for (let j = 0; j < 4; j++) {
      let c = C(base[j]);
      if (!pt.sepal) { const occ = face > 0 ? pt.q : pt.q * 0.4; if (j === 0) c = dk(c, 0.15 + occ * 0.45); if (j === 1) c = dk(c, occ * 0.25); if (j === 2) c = dk(c, occ * 0.08); }
      if (w > 0) c = mx(c, pt.sepal ? mx(WILT_PAL[j], '#4A5A2A', 0.6) : WILT_PAL[j], clamp(w * (0.72 + 0.38 * (j / 3))));
      c = f < 0.55 ? mx(c, pal.shadow, (0.55 - f) * 1.1) : lt(c, (f - 0.55) * 0.3);
      out.push(c);
    }
    return out;
  }
  function drawRosePetal(ctx, pt, pal, G, o, face) {
    const R = G.R, path = pt.path, B = pt.B, T = pt.T, w = o.wilt || 0;
    const r = petalRamp(pt, pal, w, face);
    if (o.hi && !pt.sepal) { ctx.shadowColor = css(pal.core, 0.42); ctx.shadowBlur = R * 0.05 * o.ds; ctx.shadowOffsetY = R * 0.014 * o.ds; }
    ctx.fillStyle = LG(ctx, B[0], B[1], T[0], T[1], [[0, r[0]], [0.3, r[1]], [0.74, r[2]], [1, r[3]]]);
    ctx.fill(path);
    if (o.hi && !pt.sepal) { ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
    if (o.lod === 0 && !o.paradise) return;
    ctx.save(); ctx.clip(path);
    // two-tone: hard-ish split along the spine toward the darker side
    const dl = pt.lamL - pt.lamR, a = clamp(Math.abs(dl) * 0.5 + 0.06, 0.06, 0.34);
    const [p0, p1] = dl < 0 ? [pt.Lm, pt.Rm] : [pt.Rm, pt.Lm];
    ctx.fillStyle = LG(ctx, p0[0], p0[1], p1[0], p1[1], [[0, pal.shadow, a], [0.44, pal.shadow, a * 0.85], [0.56, pal.shadow, 0], [1, pal.shadow, 0]]);
    ctx.fill(path);
    if (pt.veins) {
      ctx.strokeStyle = css(pal.vein, 0.13 + 0.06 * face); ctx.lineWidth = Math.max(0.6 / o.ds, R * 0.0045); ctx.lineCap = 'round';
      ctx.beginPath(); for (const v of pt.veins) { ctx.moveTo(v[0], v[1]); for (let j = 2; j < v.length; j += 2) ctx.lineTo(v[j], v[j + 1]); } ctx.stroke();
    }
    // rim light toward the tip + translucent edge glow
    const rimA = (0.22 + 0.6 * clamp(pt.lamT + 0.35)) * (1 - w * 0.6);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = LG(ctx, B[0], B[1], T[0], T[1], [[0, pal.rim, 0], [0.2, pal.rim, rimA * 0.35], [0.6, pal.rim, rimA * 0.6], [0.88, pal.rim, rimA], [1, pal.rim, rimA]]);
    ctx.lineWidth = Math.max(1.4 / o.ds, R * 0.026); ctx.stroke(path);
    if (o.lod >= 1 && !o.paradise) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = LG(ctx, B[0], B[1], T[0], T[1], [[0, pal.edge, 0], [0.6, pal.edge, 0], [1, pal.edge, 0.1 * (1 - w)]]);
      ctx.lineWidth = R * 0.08; ctx.stroke(path);
    }
    ctx.restore();
    if (o.paradise && !pt.sepal) {
      ctx.lineJoin = 'round'; ctx.strokeStyle = css('#FFD27A', 0.85); ctx.lineWidth = Math.max(1 / o.ds, R * 0.006); ctx.stroke(path);
    }
  }
  function drawGemPetal(ctx, pt, G, o) {
    const g = pt.g, R = G.R, t = o.t || 0;
    const rampG = pt.sepal ? EMERALD_RAMP : GEM_RAMP;
    const F = [[g[0], g[1], g[2]], [g[0], g[2], g[3]], [g[1], g[4], g[3]]];
    ctx.lineJoin = 'round';
    let best = -9, bv = null;
    for (let f = 0; f < 3; f++) {
      const [a, b, c] = F[f];
      let n = norm(cross([b[2] - a[2], b[3] - a[3], b[4] - a[4]], [c[2] - a[2], c[3] - a[3], c[4] - a[4]]));
      if (dot(n, G.V) < 0) n = [-n[0], -n[1], -n[2]];
      const lam = clamp(dot(n, G.L) * 1.35 - 0.62 + [-0.32, 0.02, 0.42][f] + (H(pt.i * 3 + f + pt.k * 11, 77) - 0.5) * 0.5 - pt.q * 0.25, -1, 1);
      const col = ramp(rampG, lam);
      const p = new Path2D(); p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1]); p.lineTo(c[0], c[1]); p.closePath();
      ctx.fillStyle = LG(ctx, a[0], a[1], (b[0] + c[0]) / 2, (b[1] + c[1]) / 2, [[0, dk(col, 0.25)], [1, lt(col, 0.12)]]);
      ctx.fill(p);
      ctx.strokeStyle = css(lt(col, 0.5), 0.5); ctx.lineWidth = Math.max(0.7 / o.ds, R * 0.0045); ctx.stroke(p);
      if (lam > best) { best = lam; bv = f === 2 ? b : f === 0 ? b : c; }
    }
    if (bv && o.lod >= 1 && !pt.sepal) {
      const tw = Math.pow(E.osc(t, 1.3 + H(pt.i + pt.k * 5, 3) * 1.4, H(pt.i, pt.k + 9)), 5);
      if (tw > 0.05) S.sparkle(ctx, bv[0], bv[1], R * (0.025 + 0.06 * tw), tw, '#FFF2F6', t * 0.4 + pt.i);
    }
  }
  let olBuf = null, olHalf = null;
  function roseOutline(ctx, G, o) {
    const R = G.R, ds = devScale(ctx), half = R * 1.45, px = Math.ceil(2 * half * ds);
    if (!olBuf || olBuf.w < px) olBuf = E.canvas(Math.max(px, olBuf ? olBuf.w : 0), Math.max(px, olBuf ? olBuf.w : 0));
    const b = olBuf.x;
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, px + 2, px + 2);
    b.setTransform(ds, 0, 0, ds, half * ds, half * ds);
    b.lineJoin = 'round'; b.strokeStyle = o.col || '#FFF6E0'; b.lineWidth = (o.lw || 2) / ds;
    for (const pt of G.petals) {
      if (pt.sepal) continue;
      b.globalCompositeOperation = 'destination-out'; b.fill(pt.path);
      b.globalCompositeOperation = 'source-over'; b.stroke(pt.path);
    }
    const gl = o.glow === undefined ? 1 : o.glow;
    ctx.save();
    if (gl > 0) {
      const hp = Math.ceil(px / 2);
      if (!olHalf || olHalf.w < hp) olHalf = E.canvas(hp, hp);
      olHalf.x.setTransform(1, 0, 0, 1, 0, 0); olHalf.x.clearRect(0, 0, olHalf.w, olHalf.h); olHalf.x.filter = `blur(${(1.2 + R * ds * 0.006).toFixed(1)}px)`;
      olHalf.x.drawImage(olBuf.c, 0, 0, px, px, 0, 0, hp, hp); olHalf.x.filter = 'none';
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.9 * gl;
      ctx.drawImage(olHalf.c, 0, 0, hp, hp, -half, -half, 2 * half, 2 * half);
      ctx.filter = 'none'; ctx.globalAlpha /= 0.9 * gl; ctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(olBuf.c, 0, 0, px, px, -half, -half, 2 * half, 2 * half);
    ctx.restore();
  }
  function detachXform(ctx, pt, o, R, t) {
    const tau = pt.tau, M = pt.M, seed = o.seed || 0;
    const hero = pt.k === 0 && pt.i === (o.heroIndex === undefined ? 2 : o.heroIndex);
    const h = (j) => H(pt.i * 7 + pt.k * 31 + j, seed + 31);
    let dx, dy, rot, flip;
    if (hero) {
      const e = E.ease.inOutCubic(tau), tx = 0.62 * R - M[0], ty = 0.36 * R - M[1];
      dx = tx * e + Math.sin(t * 1.7) * 0.025 * R * tau; dy = ty * e - Math.sin(tau * PI) * 0.35 * R + Math.sin(t * 1.3 + 1) * 0.035 * R * tau;
      rot = tau * 0.9 + Math.sin(t * 1.9) * 0.12 * tau; flip = Math.cos(tau * TAU);
    } else {
      const dir = (o.detachDir === undefined ? -2.45 : o.detachDir) + (h(1) - 0.5) * 0.75;
      const dist = (o.detachDist || 6) * (0.75 + 0.5 * h(2)) * R, e = Math.pow(tau, 1.45);
      dx = Math.cos(dir) * dist * e + Math.sin(tau * PI * (1.5 + h(3) * 2) + h(4) * 6) * 0.35 * R * tau;
      dy = Math.sin(dir) * dist * e + Math.sin(tau * PI) * 0.4 * R * (1 - tau);
      rot = (h(5) - 0.5) * 6.4 * tau + 0.4 * Math.sin(tau * 7 + h(1) * 5) * tau;
      flip = Math.cos(tau * PI * (2 + h(2) * 3));
    }
    ctx.translate(M[0] + dx, M[1] + dy); ctx.rotate(rot); ctx.scale(Math.abs(flip) < 0.12 ? 0.12 * Math.sign(flip || 1) : flip, 1); ctx.translate(-M[0], -M[1]);
    return flip;
  }

  function roseSpiral(ctx, G, R, pal, variant, o, ds) {
    const bi = G.bloomIn, cy = -G.zTop * G.ce * R, rs = R * 0.2 * bi * (1 - 0.3 * (o.wilt || 0)), ky = G.se * 0.85 + 0.15, sd = (o.seed || 0) + 0.6;
    if (rs < 0.5) return;
    const w = o.wilt || 0, base = mx(pal.inner[1], WILT_PAL[1], w), hi = mx(pal.inner[3], WILT_PAL[3], w);
    ctx.save(); ctx.lineJoin = 'round';
    ctx.fillStyle = RG(ctx, 0, cy, 0, rs * 1.25, [[0, pal.core, 0.85 * bi], [1, pal.core, 0]]); ctx.beginPath(); ctx.ellipse(0, cy, rs * 1.25, rs * 1.25 * ky, 0, 0, TAU); ctx.fill();
    for (let j = 0; j < 4; j++) {
      const ro = rs * (1 - j * 0.21), ri = ro * 0.5, s0 = sd + j * 2.2, s1 = s0 + 4.0, n = 18, pts = [];
      for (let i = 0; i <= n; i++) { const a = s0 + ((s1 - s0) * i) / n; pts.push(Math.cos(a) * ro, cy + Math.sin(a) * ro * ky - (1 - j * 0.25) * rs * 0.08); }
      for (let i = n; i >= 0; i--) { const f = i / n, a = s0 + (s1 - s0) * f, r = ro - (ro - ri) * Math.sin(PI * f); pts.push(Math.cos(a) * r, cy + Math.sin(a) * r * ky - (1 - j * 0.25) * rs * 0.08 + rs * 0.05); }
      const path = smoothClosed(pts), am = s0 + (s1 - s0) * 0.5;
      ctx.fillStyle = LG(ctx, Math.cos(am) * ri, cy + Math.sin(am) * ri * ky, Math.cos(am) * ro, cy + Math.sin(am) * ro * ky, [[0, dk(base, 0.45)], [0.6, base], [1, lt(hi, 0.1)]]);
      ctx.shadowColor = css(pal.core, 0.5); ctx.shadowBlur = Math.max(0, rs * 0.12 * ds); ctx.fill(path); ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0;
      ctx.strokeStyle = css(variant === 'paradise' ? '#FFD27A' : pal.rim, 0.55 * bi); ctx.lineWidth = Math.max(0.7 / ds, R * 0.007); ctx.stroke(path);
    }
    ctx.restore();
  }
  A.heroRose = (ctx, o = {}) => {
    const R = o.R || 120, t = o.t || 0, variant = o.variant || 'normal';
    const ds = devScale(ctx), px = R * ds;
    const lod = variant === 'mini' || px < 34 ? 0 : px < 90 ? 1 : 2;
    const G = roseGeom(o, lod);
    const pal = variant === 'paradise' ? ROSE_PAL.paradise : ROSE_PAL.normal;
    const dopt = { t, wilt: o.wilt || 0, ds, lod, hi: lod >= 2 && variant !== 'paradise', paradise: variant === 'paradise' };
    ctx.save();
    if (o.rot) ctx.rotate(o.rot);
    const br = 1 + 0.012 * Math.sin((TAU * t) / 3.2);
    ctx.scale(br, br);
    if (variant === 'outline') { roseOutline(ctx, G, o); ctx.restore(); return; }
    if (variant === 'paradise') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = RG(ctx, 0, -0.15 * R, 0, R * 1.8, [[0, '#FFF0F4', 0.3], [0.35, '#FFD27A', 0.14], [1, '#FFD27A', 0]]);
      ctx.beginPath(); ctx.arc(0, -0.15 * R, R * 1.8, 0, TAU); ctx.fill(); ctx.restore();
    }
    // hip (receptacle)
    if (o.sepals !== false) {
      const ob = sm(clamp(o.bloom === undefined ? 1 : o.bloom) * 1.4);
      ctx.fillStyle = RG(ctx, -0.03 * R, 0.0, 0, 0.12 * R, [[0, mx('#4FA36B', pal.core, ob)], [0.7, mx('#2A7A50', pal.core, ob)], [1, mx('#174F3A', pal.core, ob)]]);
      ctx.beginPath(); ctx.ellipse(0, 0.03 * R - ob * 0.08 * R, (0.085 + ob * 0.12) * R, (0.07 + ob * 0.08) * R, 0, 0, TAU); ctx.fill();
    }
    let coreDone = false, spiralDone = variant === 'gem' || G.bloomIn <= 0.05; const detached = [];
    const depthTop = G.zTop * G.se, bl = clamp(o.bloom === undefined ? 1 : o.bloom);
    for (const pt of G.petals) {
      if (pt.tau > 0) { detached.push(pt); continue; }
      if (pt.k === G.nR - 1 && variant !== 'gem' && G.bloomIn > 0.4) continue;
      if (!coreDone && pt.q >= 0.45) {
        coreDone = true;
        const k = G.se * 0.9 + 0.2, cyc = (-G.zTop * G.ce * R * 0.55) / k;
        ctx.save(); ctx.scale(1, k);
        ctx.fillStyle = RG(ctx, 0, cyc, 0, R * 0.5, [[0, pal.core, (variant === 'paradise' ? 0.25 : 0.8) * sm(bl * 1.5)], [1, pal.core, 0]]);
        ctx.beginPath(); ctx.arc(0, cyc, R * 0.5, 0, TAU); ctx.fill(); ctx.restore();
      }
      if (!spiralDone && pt.q >= 0.7 && pt.depth > depthTop * 0.85) { spiralDone = true; roseSpiral(ctx, G, R, pal, variant, o, ds); }
      if (variant === 'gem') drawGemPetal(ctx, pt, G, dopt);
      else drawRosePetal(ctx, pt, pt.sepal ? ROSE_PAL.sepal : pal, G, dopt, pt.face);
    }
    if (!spiralDone) roseSpiral(ctx, G, R, pal, variant, o, ds);
    if (variant === 'gem') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = RG(ctx, 0, -0.2 * R, 0, R * 0.7, [[0, '#FF6F91', 0.35], [1, '#FF3D6E', 0]]); ctx.fillRect(-R, -R, 2 * R, 2 * R); ctx.restore();
    }
    if (variant === 'paradise') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = RG(ctx, 0, -G.zTop * G.ce * R * 0.7, 0, R * 0.5, [[0, '#FFF0F4', 0.45], [0.5, '#FFE3A6', 0.12], [1, '#FFE3A6', 0]]); ctx.fillRect(-R, -R * 1.3, 2 * R, 2 * R); ctx.restore();
    }
    // detached petals (in front, free bodies)
    for (const pt of detached) {
      ctx.save();
      const flip = detachXform(ctx, pt, o, R, t);
      if (variant === 'gem') drawGemPetal(ctx, pt, G, dopt);
      else drawRosePetal(ctx, pt, pal, G, Object.assign({}, dopt, { hi: false }), flip >= 0 ? pt.face : -pt.face);
      ctx.restore();
    }
    ctx.restore();
  };

  A._roseGeom = roseGeom; // debug hook (internal)
  const silCache = new Map();
  A.heroRoseSilhouette = (R, bloom = 1, o = {}) => {
    const key = `${R}|${bloom.toFixed(3)}|${o.variant || 'normal'}|${o.tilt || ''}`;
    if (silCache.has(key)) return silCache.get(key);
    const G = roseGeom({ R, bloom, t: 0, variant: o.variant === 'gem' ? 'gem' : o.variant === 'paradise' ? 'paradise' : 'normal', tilt: o.tilt }, 2);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const all = [];
    for (const p of G.petals) { const a = p.pts; for (let i = 0; i < a.length; i += 2) { x0 = Math.min(x0, a[i]); x1 = Math.max(x1, a[i]); y0 = Math.min(y0, a[i + 1]); y1 = Math.max(y1, a[i + 1]); } all.push(a); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, NB = 360, bins = new Float64Array(NB).fill(-1);
    for (const a of all) {
      const n = a.length / 2;
      for (let i = 0; i < n; i++) {
        const ax = a[i * 2], ay = a[i * 2 + 1], bx = a[((i + 1) % n) * 2], by = a[((i + 1) % n) * 2 + 1];
        const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (R * 0.01)));
        for (let s = 0; s < steps; s++) { const x = ax + ((bx - ax) * s) / steps - cx, y = ay + ((by - ay) * s) / steps - cy; const b = Math.floor(((Math.atan2(y, x) + PI) / TAU) * NB) % NB, d = Math.hypot(x, y); if (d > bins[b]) bins[b] = d; }
      }
    }
    for (let i = 0; i < NB; i++) if (bins[i] < 0) { let j = 1; while (bins[(i + j) % NB] < 0 && j < NB) j++; bins[i] = bins[(i + j) % NB]; }
    const P = [];
    for (let i = 0; i < NB; i++) { const d = (bins[(i + NB - 1) % NB] + 2 * bins[i] + bins[(i + 1) % NB]) / 4, a = ((i + 0.5) / NB) * TAU - PI; P.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]); }
    const res = resampleClosed(P, 128);
    if (silCache.size > 80) silCache.clear();
    silCache.set(key, res); return res;
  };

  function heroPetalGeom(R, wilt) {
    const G = { R, se: Math.sin(1.0), ce: Math.cos(1.0), veins: true };
    G.V = [0, -G.ce, G.se]; G.L = lightVec(G, -2.25);
    const P = roseRing(0, 1, wilt || 0); P.th = -PI / 2; P.st0 = -1; P.ct0 = 0; P.q = 0; P.k = 0; P.i = 0; P.seed = 1.3; P.lip = 0.3;
    const pt = makePetal(P, G, 2);
    let mxs = 0, mys = 0; const n = pt.pts.length / 2; for (let i = 0; i < n; i++) { mxs += pt.pts[i * 2]; mys += pt.pts[i * 2 + 1]; }
    pt.cx = mxs / n; pt.cy = mys / n; return { G, pt };
  }
  A.heroPetal = (ctx, o = {}) => {
    const R = o.R || 120, { G, pt } = heroPetalGeom(R, o.wilt), ds = devScale(ctx), flip = o.flip === undefined ? 1 : o.flip;
    ctx.save(); if (o.rot) ctx.rotate(o.rot); ctx.scale(Math.abs(flip) < 0.1 ? 0.1 * Math.sign(flip || 1) : flip, 1); ctx.translate(-pt.cx, -pt.cy);
    drawRosePetal(ctx, pt, o.variant === 'paradise' ? ROSE_PAL.paradise : ROSE_PAL.normal, G, { t: o.t || 0, wilt: o.wilt || 0, ds, lod: R * ds > 40 ? 2 : 1, hi: false }, flip >= 0 ? 1 : -1);
    ctx.restore();
  };
  A.petalSilhouette = (R) => { const { pt } = heroPetalGeom(R, 0), P = []; for (let i = 0; i < pt.pts.length; i += 2) P.push([pt.pts[i] - pt.cx, pt.pts[i + 1] - pt.cy]); return resampleClosed(P, 128); };
  A.teardropSilhouette = (r) => {
    const P = [];
    for (let i = 0; i < 256; i++) { const a = (i / 256) * TAU, s = Math.sin(a / 2); const x = r * Math.sin(a) * (0.55 + 0.45 * s) * 1.0, y = -r * 1.6 * Math.cos(a) * (Math.cos(a) > 0 ? 1 : 0.62) ; P.push([x * (1 + 0.0 * s), y]); }
    return resampleClosed(P, 128);
  };

  /** simple leaf pointing up (−y), base at origin (replacement for S.leaf with correct colours) */
  function leafShape(ctx, len, wid, col, ds = 1) {
    const p = S.petalPath(-len, wid, 0.75);
    ctx.fillStyle = LG(ctx, -wid, 0, wid, -len * 0.3, [[0, lt(col, 0.2)], [0.5, col], [1, dk(col, 0.3)]]); ctx.fill(p);
    ctx.save(); ctx.clip(p); ctx.fillStyle = css(dk(col, 0.5), 0.25); ctx.fillRect(0, -len * 1.1, wid * 1.3, len * 1.2); ctx.restore();
    ctx.strokeStyle = css(lt(col, 0.45), 0.55); ctx.lineWidth = Math.max(0.6 / ds, wid * 0.07); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -len * 0.06); ctx.quadraticCurveTo(wid * 0.05, -len * 0.5, 0, -len * 0.9); ctx.stroke();
  }
  /* ---------------- stem with compound leaves and thorns ---------------- */
  function stemCurve(o) {
    const len = o.len || 420, t = o.t || 0, w = clamp(o.wilt || 0), ph = o.phase || 0;
    const sw = (o.sway === undefined ? 1 : o.sway) * (0.03 * Math.sin(1.3 * t + ph) + 0.012 * Math.sin(2.7 * t + 1.3 + ph));
    const bend = (o.bend || 0) + w * 0.7 * (o.droopDir || 1) + sw;
    const N = 30, pts = [[0, 0, 0]]; let x = 0, y = 0, a = 0;
    for (let i = 1; i <= N; i++) { const s = i / N; a = bend * Math.pow(s, 1.7) * 1.4 / (1 + 0.4 * s); x += (Math.sin(a) * len) / N; y -= (Math.cos(a) * len) / N; pts.push([x, y, a]); }
    return { pts, tip: { x, y, angle: a }, len };
  }
  A.stemTip = (o = {}) => stemCurve(o).tip;
  const stemAt = (pts, s) => { const f = s * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), k = f - i, a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; };
  function leafletPath(len, wid, teeth) {
    const p = new Path2D(), n = teeth * 2, L = [], Rr = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, w = Math.pow(Math.sin(PI * Math.pow(u, 0.85)), 0.85) * wid, tooth = u > 0.12 && u < 0.94 ? (i % 2 ? 0.1 : -0.04) * wid : 0;
      L.push([-(w + tooth), -u * len]); Rr.push([w + tooth, -u * len]);
    }
    p.moveTo(0, 0); for (const q of L) p.lineTo(q[0], q[1]); for (let i = Rr.length - 1; i >= 0; i--) p.lineTo(Rr[i][0], Rr[i][1]); p.closePath();
    return p;
  }
  function drawLeaflet(ctx, len, wid, col, wilt, ds) {
    const p = leafletPath(len, wid, 7);
    const c0 = mx(col, '#7A6A3A', wilt * 0.6);
    ctx.fillStyle = LG(ctx, -wid, 0, wid, -len * 0.4, [[0, lt(c0, 0.2)], [0.5, c0], [1, dk(c0, 0.3)]]); ctx.fill(p);
    ctx.save(); ctx.clip(p); ctx.fillStyle = css(dk(c0, 0.5), 0.26); ctx.fillRect(0, -len * 1.1, wid * 1.5, len * 1.2); ctx.restore();
    ctx.strokeStyle = css(lt(c0, 0.45), 0.6); ctx.lineWidth = Math.max(0.7 / ds, wid * 0.08); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -len * 0.05); ctx.quadraticCurveTo(wid * 0.06, -len * 0.5, 0, -len * 0.9);
    for (let j = 1; j <= 3; j++) { const y = -len * (0.18 + j * 0.18); ctx.moveTo(0, y); ctx.lineTo(-wid * 0.55, y - len * 0.1); ctx.moveTo(0, y); ctx.lineTo(wid * 0.55, y - len * 0.1); }
    ctx.globalAlpha *= 0.7; ctx.stroke(); ctx.globalAlpha /= 0.7;
  }
  A.stem = (ctx, o = {}) => {
    const sc = stemCurve(o), pts = sc.pts, len = sc.len, t = o.t || 0, w = clamp(o.wilt || 0), ds = devScale(ctx);
    const wid = o.width || len * 0.022 + 3;
    const cL = mx('#62B871', '#8A8A48', w * 0.6), cM = mx('#3A9157', '#6B6A3A', w * 0.6), cD = mx('#1C5A3C', '#3E3A22', w * 0.6);
    // thorns (behind edge)
    const nTh = o.thorns === undefined ? 5 : o.thorns;
    for (let j = 0; j < nTh; j++) {
      const s = 0.1 + (j / Math.max(1, nTh)) * 0.78 + H(j, 51) * 0.06, side = j % 2 ? 1 : -1, p = stemAt(pts, s), a = p[2];
      const wv = wid * (1 - 0.35 * s) * 0.5, nx = Math.cos(a) * side, ny = Math.sin(a) * side, tx = Math.sin(a), ty = -Math.cos(a), L = wid * 1.05;
      const bx = p[0] + nx * wv * 0.8, by = p[1] + ny * wv * 0.8;
      ctx.fillStyle = LG(ctx, bx, by, bx + nx * L, by + ny * L, [[0, cM], [0.6, '#7A4A3A'], [1, '#C98A6A']]);
      ctx.beginPath(); ctx.moveTo(bx + tx * L * 0.55, by + ty * L * 0.55); ctx.quadraticCurveTo(bx + nx * L * 0.5, by + ny * L * 0.5, bx + nx * L - tx * L * 0.45, by + ny * L - ty * L * 0.45);
      ctx.quadraticCurveTo(bx + nx * L * 0.25 - tx * L * 0.1, by + ny * L * 0.25 - ty * L * 0.1, bx - tx * L * 0.35, by - ty * L * 0.35); ctx.closePath(); ctx.fill();
    }
    // stem body
    const Lp = [], Rp = [];
    for (let i = 0; i < pts.length; i++) { const s = i / (pts.length - 1), [x, y, a] = pts[i], ww = (wid * (1 - 0.38 * s)) / 2; Lp.push([x - Math.cos(a) * ww, y - Math.sin(a) * ww]); Rp.push([x + Math.cos(a) * ww, y + Math.sin(a) * ww]); }
    const body = new Path2D(); body.moveTo(Lp[0][0], Lp[0][1]); for (const q of Lp) body.lineTo(q[0], q[1]); for (let i = Rp.length - 1; i >= 0; i--) body.lineTo(Rp[i][0], Rp[i][1]); body.closePath();
    const m = pts[Math.floor(pts.length / 2)], ma = m[2];
    ctx.fillStyle = LG(ctx, m[0] - Math.cos(ma) * wid * 0.5, m[1] - Math.sin(ma) * wid * 0.5, m[0] + Math.cos(ma) * wid * 0.5, m[1] + Math.sin(ma) * wid * 0.5, [[0, cL], [0.35, cM], [1, cD]]);
    ctx.fill(body);
    ctx.strokeStyle = css(lt(cL, 0.35), 0.55); ctx.lineWidth = Math.max(0.8 / ds, wid * 0.16); ctx.lineCap = 'round';
    ctx.beginPath(); for (let i = 2; i < pts.length - 1; i++) { const [x, y, a] = pts[i], ww = (wid * (1 - 0.38 * (i / pts.length))) * 0.28; i === 2 ? ctx.moveTo(x - Math.cos(a) * ww, y - Math.sin(a) * ww) : ctx.lineTo(x - Math.cos(a) * ww, y - Math.sin(a) * ww); } ctx.stroke();
    // compound leaves
    const nL = o.leaves === undefined ? 2 : o.leaves;
    for (let j = 0; j < nL; j++) {
      const s = 0.34 + j * 0.24 + H(j, 61) * 0.05, side = j % 2 ? 1 : -1, p = stemAt(pts, s);
      const fl = 0.07 * Math.sin(t * 2.1 + j * 2) + 0.04 * Math.sin(t * 3.7 + j) + w * 0.5 * side;
      const ang = p[2] + side * (0.95 + fl) , pl = len * 0.13, lw = len * 0.04, ll = len * 0.11;
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang);
      ctx.strokeStyle = css(cM); ctx.lineWidth = Math.max(1 / ds, wid * 0.32); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(side * pl * 0.1, -pl * 0.5, 0, -pl); ctx.stroke();
      for (const [f, a2, sz] of [[0.55, -0.85, 0.8], [0.55, 0.85, 0.8], [1, 0, 1]]) {
        ctx.save(); ctx.translate(0, -pl * f); ctx.rotate(a2 + fl * 0.6); drawLeaflet(ctx, ll * sz, lw * sz, j ? '#3FA36B' : '#379A62', w, ds); ctx.restore();
      }
      ctx.restore();
    }
    return sc.tip;
  };

  /* =====================================================================
   * FLOWER SET
   * ===================================================================== */
  const FPAL = {
    tulip: { a: '#FF8A4A', b: '#E03C31', c: '#9A1E1C', hi: '#FFD08A', leaf: '#3FA36B' },
    carnation: { a: '#FF8576', b: '#D9473A', c: '#86201E', hi: '#FFD3C8', leaf: '#4E9E7A' },
    lily: { a: '#FFFFFF', b: '#FFF4F0', c: '#E2C3CB', hi: '#FFFFFF', throat: '#D3E8A0', anther: '#E8963A', leaf: '#3FA36B' },
    lavender: { a: '#CDBBFF', b: '#A88BFF', c: '#5E46B8', hi: '#EEE8FF', leaf: '#7FAE8E' },
    daisy: { a: '#FFFFFF', b: '#F3F3FA', c: '#BFC5E0', hi: '#FFFFFF', center: '#FFD36E', centerDk: '#D98A22', leaf: '#3FA36B' },
    hyacinth: { a: '#B9ADFF', b: '#8E7CFF', c: '#4E3CAE', hi: '#E3DDFF', leaf: '#3FA36B' },
  };
  const palCache = new Map();
  function fpal(type, pal) {
    if (pal && typeof pal === 'object') return Object.assign({}, FPAL[type], pal);
    const key = type + '|' + (pal || 'B');
    if (palCache.has(key)) return palCache.get(key);
    let p = FPAL[type];
    if (pal === 'J' || pal === 'warm') { p = {}; for (const k in FPAL[type]) p[k] = mx(FPAL[type][k], '#FF9A50', 0.1); }
    palCache.set(key, p); return p;
  }
  const popScale = (p) => (p <= 0 ? 0 : p < 0.55 ? 1.12 * E.ease.outCubic(p / 0.55) : 1.12 - 0.12 * E.ease.inOutSine(clamp((p - 0.55) / 0.45)));
  const unfurl = (p) => sm((p - 0.12) / 0.78);

  function almond(len, wid, flare) {
    const p = new Path2D(), tx = flare * wid;
    p.moveTo(0, 0); p.bezierCurveTo(wid * 1.25, -len * 0.12, wid * 1.12, -len * 0.62, tx, -len);
    p.bezierCurveTo(-wid * 0.55 + tx * 0.6, -len * 0.7, -wid * 1.25, -len * 0.18, 0, 0); p.closePath(); return p;
  }
  function headTulip(ctx, s, u, P, ds) {
    const h = s * 1.15;
    const petal = (ang, len, wid, dark, flare, front) => {
      ctx.save(); ctx.rotate(ang);
      const path = almond(len, wid, flare);
      const c2 = dk(P.c, dark), c1 = dk(P.b, dark), c0 = dk(P.a, dark * 0.7);
      ctx.fillStyle = LG(ctx, 0, 0, 0, -len, [[0, c2], [0.3, c1], [0.82, c0], [1, lt(P.hi, -dark)]]); ctx.fill(path);
      ctx.save(); ctx.clip(path);
      ctx.fillStyle = css(P.c, 0.28); ctx.fillRect(wid * 0.05, -len * 1.1, wid * 1.5, len * 1.2);
      ctx.strokeStyle = css(P.hi, front ? 0.55 : 0.3); ctx.lineWidth = Math.max(1 / ds, wid * 0.14); ctx.translate(-wid * 0.06, 0); ctx.stroke(path);
      if (front) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = css(P.hi, 0.22); ctx.beginPath(); ctx.ellipse(-wid * 0.28, -len * 0.5, wid * 0.13, len * 0.32, 0.08, 0, TAU); ctx.fill(); }
      ctx.restore(); ctx.restore();
    };
    const o = 0.12 + 0.32 * u;
    petal(-o * 0.55, h * 0.93, s * 0.25, 0.2, -0.25 * u, false); petal(o * 0.55, h * 0.93, s * 0.25, 0.2, 0.25 * u, false);
    petal(-o, h, s * 0.29, 0.06, -0.5 * u, false); petal(o, h, s * 0.29, 0.06, 0.5 * u, false);
    petal(0, h * 1.03, s * 0.31 * (0.86 + 0.14 * u), 0, 0.06, true);
    ctx.fillStyle = css(dk(P.leaf, 0.2)); ctx.beginPath(); ctx.ellipse(0, -s * 0.02, s * 0.11, s * 0.06, 0, 0, TAU); ctx.fill();
  }
  function headCarnation(ctx, s, u, P, ds) {
    const cal = new Path2D(); cal.moveTo(-s * 0.08, 0); cal.lineTo(-s * 0.13, -s * 0.38);
    for (let i = 0; i <= 4; i++) { const x = -s * 0.13 + (i / 4) * s * 0.26; cal.lineTo(x, -s * (i % 2 ? 0.42 : 0.49)); }
    cal.lineTo(s * 0.13, -s * 0.38); cal.lineTo(s * 0.08, 0); cal.closePath();
    const O = -s * 0.42;
    for (let j = 0; j < 3; j++) {
      const spread = lerp(0.3, 1.25 - j * 0.32, u), r = s * (0.66 - j * 0.12) * lerp(0.55, 1, u), teeth = 15 - j * 3;
      const p = new Path2D(); p.moveTo(0, O);
      for (let k = 0; k <= teeth * 2; k++) { const a = -spread + (k / (teeth * 2)) * spread * 2, rr = r * (k % 2 ? 0.88 : 1) * (1 + 0.05 * Math.sin(a * 6 + j * 2)); p.lineTo(Math.sin(a) * rr, O - Math.cos(a) * rr * 0.92); }
      p.closePath();
      const dkf = (2 - j) * 0.1;
      ctx.save(); ctx.translate(0, s * 0.03); ctx.fillStyle = css(P.c, 0.35); ctx.fill(p); ctx.restore();
      ctx.fillStyle = RG(ctx, 0, O, 0, r, [[0, dk(P.c, dkf)], [0.5, dk(P.b, dkf)], [0.92, dk(P.a, dkf * 0.5)], [1, P.hi]]); ctx.fill(p);
      ctx.save(); ctx.clip(p); ctx.fillStyle = css(P.c, 0.22); ctx.fillRect(0, O - r * 1.2, r * 1.3, r * 1.4); ctx.restore();
      ctx.strokeStyle = css(P.hi, 0.5); ctx.lineWidth = Math.max(0.7 / ds, s * 0.012); ctx.lineJoin = 'round'; ctx.stroke(p);
    }
    ctx.fillStyle = LG(ctx, -s * 0.13, 0, s * 0.13, 0, [[0, lt(P.leaf, 0.25)], [0.45, P.leaf], [1, dk(P.leaf, 0.35)]]); ctx.fill(cal);
  }
  function headLily(ctx, s, u, P, ds) {
    const tep = (ang, len, wid, shade, curl) => {
      ctx.save(); ctx.rotate(ang);
      const tx = curl * len * 0.22 * u, p = new Path2D();
      p.moveTo(0, 0); p.bezierCurveTo(wid * 0.8, -len * 0.25, wid * 1.15, -len * 0.7, tx + wid * 0.1, -len);
      p.bezierCurveTo(-wid * 0.5 + tx * 0.5, -len * 0.75, -wid * 0.8, -len * 0.3, 0, 0); p.closePath();
      ctx.fillStyle = LG(ctx, 0, 0, 0, -len, [[0, P.throat], [0.32, dk(P.b, shade)], [1, dk(P.a, shade * 0.6)]]); ctx.fill(p);
      ctx.save(); ctx.clip(p); ctx.fillStyle = css(P.c, 0.35 + shade); ctx.fillRect(wid * 0.08, -len * 1.1, wid * 1.6, len * 1.2);
      ctx.strokeStyle = css('#F2B8C6', 0.5); ctx.lineWidth = Math.max(0.6 / ds, wid * 0.06); ctx.beginPath(); ctx.moveTo(0, -len * 0.08); ctx.quadraticCurveTo(wid * 0.1, -len * 0.5, tx * 0.8, -len * 0.92); ctx.stroke();
      ctx.restore(); ctx.restore();
    };
    const k = 0.3 + 0.7 * u;
    tep(-0.42 * k, s * 1.0, s * 0.2, 0.1, -1); tep(0.42 * k, s * 1.0, s * 0.2, 0.1, 1); tep(0, s * 1.02, s * 0.2, 0.12, 0.2);
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = (i / 4 - 0.5) * 0.7 * k, L = s * (0.86 + 0.06 * Math.sin(i * 2)), x = Math.sin(a) * L, y = -Math.cos(a) * L;
      ctx.strokeStyle = css('#E8F0C8', 0.9); ctx.lineWidth = Math.max(0.6 / ds, s * 0.016); ctx.beginPath(); ctx.moveTo(0, -s * 0.12); ctx.quadraticCurveTo(x * 0.4, y * 0.6, x, y); ctx.stroke();
      ctx.fillStyle = css(P.anther); ctx.beginPath(); ctx.ellipse(x, y, s * 0.05, s * 0.022, a + 1.2, 0, TAU); ctx.fill();
    }
    tep(-0.85 * k, s * 0.98, s * 0.21, 0, -1); tep(0.85 * k, s * 0.98, s * 0.21, 0, 1); tep(0.08, s * 0.72, s * 0.23, -0.02, 0.4);
  }
  function headLavender(ctx, s, u, P, ds) {
    ctx.strokeStyle = css(dk(P.leaf, 0.15)); ctx.lineWidth = Math.max(0.8 / ds, s * 0.03); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 1.02); ctx.stroke();
    const N = 10;
    for (let j = 0; j < N; j++) {
      const f = j / (N - 1), y = -s * (0.32 + f * 0.72), rw = s * 0.11 * (1 - f * 0.55), gs = clamp((u * 1.4 - f * 0.5) / 0.9);
      if (gs <= 0) continue;
      for (const [x, sh, z] of [[-1, 0.25, 0], [1, 0.25, 0], [0, 0, 1]]) {
        const cx = x * rw * 0.7, cy = y + (z ? s * 0.02 : 0), rx = s * 0.075 * (1 - f * 0.4) * gs, ry = s * 0.055 * (1 - f * 0.3) * gs;
        ctx.fillStyle = RG(ctx, cx - rx * 0.3, cy - ry * 0.4, 0, rx * 1.3, [[0, lt(P.a, 0.2 - sh)], [0.6, dk(P.b, sh)], [1, dk(P.c, sh * 0.5)]]);
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, x * 0.5, 0, TAU); ctx.fill();
      }
    }
  }
  function headDaisy(ctx, s, u, P, ds) {
    const n = 16, R = s * 0.62 * lerp(0.35, 1, u), ty = lerp(0.25, 0.5, u), cy = -s * 0.1, list = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + 0.1; list.push([a, Math.sin(a)]); }
    list.sort((p, q) => p[1] - q[1]);
    const pw = s * 0.085;
    for (const [a] of list) {
      const ex = Math.cos(a) * R, ey = Math.sin(a) * R * ty, len = Math.hypot(ex, ey), ang = Math.atan2(ey, ex);
      ctx.save(); ctx.translate(0, cy); ctx.rotate(ang);
      const back = Math.sin(a) < 0, sh = back ? 0.06 : 0;
      ctx.fillStyle = LG(ctx, 0, 0, len, 0, [[0, dk(P.c, sh)], [0.35, dk(P.b, sh)], [1, dk(P.a, sh)]]);
      ctx.beginPath(); ctx.moveTo(0, -pw * 0.3); ctx.quadraticCurveTo(len * 0.55, -pw * 1.15, len, -pw * 0.25); ctx.lineTo(len * 0.96, 0); ctx.lineTo(len, pw * 0.25); ctx.quadraticCurveTo(len * 0.55, pw * 1.15, 0, pw * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = css(P.c, 0.3); ctx.beginPath(); ctx.moveTo(len * 0.1, 0); ctx.quadraticCurveTo(len * 0.55, pw * 0.9, len * 0.97, pw * 0.2); ctx.lineTo(len * 0.97, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    const cr = s * 0.17, cry = cr * lerp(0.75, 0.62, u);
    ctx.fillStyle = css(P.centerDk, 0.5); ctx.beginPath(); ctx.ellipse(0, cy + cry * 0.35, cr * 1.02, cry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = RG(ctx, -cr * 0.3, cy - cry * 0.5, 0, cr * 1.2, [[0, '#FFF2B0'], [0.45, P.center], [1, P.centerDk]]);
    ctx.beginPath(); ctx.ellipse(0, cy, cr, cry, 0, 0, TAU); ctx.fill();
    if (s * ds > 20) { ctx.fillStyle = css(P.centerDk, 0.55); for (let i = 0; i < 26; i++) { const a = i * 2.39996, rr = Math.sqrt(i / 26) * cr * 0.85; ctx.beginPath(); ctx.arc(Math.cos(a) * rr, cy + Math.sin(a) * rr * (cry / cr), s * 0.012, 0, TAU); ctx.fill(); } }
  }
  function headHyacinth(ctx, s, u, P, ds) {
    const N = 24, list = [];
    for (let j = 0; j < N; j++) { const f = j / (N - 1), th = j * 2.39996, rad = s * (0.24 - f * 0.11); list.push({ x: Math.cos(th) * rad, y: -s * (0.3 + f * 0.78), z: Math.sin(th), f }); }
    list.sort((a, b) => a.z - b.z);
    ctx.strokeStyle = css(P.leaf); ctx.lineWidth = Math.max(1 / ds, s * 0.05); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 1.05); ctx.stroke();
    for (const q of list) {
      const gs = clamp((u * 1.35 - q.f * 0.45) / 0.9); if (gs <= 0) continue;
      const r = s * 0.1 * (1 - q.f * 0.3) * gs, sh = (1 - q.z) * 0.16, col = dk(P.b, sh);
      const st = new Path2D();
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU + q.z, rr = k % 2 ? r * 0.55 : r; k ? st.lineTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr * 0.85) : st.moveTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr * 0.85); }
      st.closePath();
      ctx.fillStyle = RG(ctx, q.x - r * 0.3, q.y - r * 0.3, 0, r * 1.2, [[0, lt(P.a, 0.25 - sh)], [0.6, col], [1, dk(P.c, sh)]]); ctx.fill(st);
      ctx.fillStyle = css(P.c, 0.7); ctx.beginPath(); ctx.arc(q.x, q.y, r * 0.2, 0, TAU); ctx.fill();
    }
  }
  const HEADS = { tulip: headTulip, carnation: headCarnation, lily: headLily, lavender: headLavender, daisy: headDaisy, hyacinth: headHyacinth };
  const STEMK = { tulip: 1.55, carnation: 1.6, lily: 1.5, lavender: 1.0, daisy: 1.7, hyacinth: 0.85 };
  function flowerLeaves(ctx, type, s, stemLen, P, u, t, ph, ds) {
    const leaf = (x, y, ang, len, wid) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      const p = S.petalPath(-len, wid, 0.8);
      ctx.fillStyle = LG(ctx, -wid, 0, wid, 0, [[0, lt(P.leaf, 0.18)], [0.5, P.leaf], [1, dk(P.leaf, 0.32)]]); ctx.fill(p);
      ctx.save(); ctx.clip(p); ctx.fillStyle = css(dk(P.leaf, 0.5), 0.22); ctx.fillRect(0, -len * 1.1, wid * 1.2, len * 1.2); ctx.restore();
      ctx.restore();
    };
    const g = lerp(0.4, 1, u), sw = 0.05 * Math.sin(t * 1.6 + ph);
    if (type === 'tulip' || type === 'hyacinth') { leaf(0, 0, -0.42 + sw, stemLen * 0.75 * g, s * 0.14); leaf(0, 0, 0.36 + sw, stemLen * 0.62 * g, s * 0.13); if (type === 'hyacinth') leaf(0, 0, -0.05 + sw, stemLen * 0.9 * g, s * 0.1); }
    else if (type === 'lavender') { for (const a of [-0.5, -0.2, 0.25, 0.55]) leaf(0, 0, a + sw, stemLen * 0.45 * g, s * 0.04); }
    else if (type === 'daisy') { leaf(0, 0, -0.9 + sw, s * 0.55 * g, s * 0.13); leaf(0, 0, 0.85 + sw, s * 0.5 * g, s * 0.12); }
    else if (type === 'carnation') { for (const [f, a] of [[0.35, -0.9], [0.35, 0.9], [0.62, -0.75], [0.62, 0.75]]) leaf(0, -stemLen * f, a + sw, s * 0.45 * g, s * 0.045); }
    else if (type === 'lily') { for (const [f, a] of [[0.2, -0.75], [0.32, 0.7], [0.46, -0.65], [0.6, 0.62]]) leaf(0, -stemLen * f, a + sw, s * 0.42 * g, s * 0.07); }
  }
  A.flowerSet = (ctx, o = {}) => {
    const type = HEADS[o.type] ? o.type : 'tulip', s = o.size || 40, t = o.t || 0, ph = o.phase || 0, ds = devScale(ctx);
    const pop = o.pop === undefined ? 1 : clamp(o.pop), sc = popScale(pop), u = unfurl(pop), P = fpal(type, o.palette);
    if (sc <= 0.001) return;
    const stemLen = (o.stem === undefined ? s * STEMK[type] : o.stem) * lerp(0.45, 1, sm(pop * 1.6));
    const sway = (o.sway === undefined ? 1 : o.sway) * (0.055 * Math.sin(1.3 * t + ph) + 0.022 * Math.sin(2.9 * t + ph * 1.7));
    const ang = sway + (o.rot || 0);
    ctx.save(); ctx.scale(sc, sc);
    if (stemLen > 0) {
      if (o.leaves !== false) flowerLeaves(ctx, type, s, stemLen, P, u, t, ph, ds);
      const tx = Math.sin(ang) * stemLen, ty = -Math.cos(ang) * stemLen;
      ctx.strokeStyle = LG(ctx, -s * 0.04, 0, s * 0.04, 0, [[0, lt(P.leaf, 0.2)], [1, dk(P.leaf, 0.3)]]);
      ctx.lineWidth = Math.max(1 / ds, s * (type === 'lavender' ? 0.035 : 0.065)); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(tx * 0.15, ty * 0.55, tx, ty); ctx.stroke();
      ctx.translate(tx, ty); ctx.rotate(ang * 1.25);
    } else ctx.rotate(ang);
    HEADS[type](ctx, s, u, P, ds);
    ctx.restore();
  };
  A.flowerSprite = (type, size, variant = 'open', palette = 'B') => {
    const sz = Math.max(4, Math.round(size)), key = `fl|${type}|${sz}|${variant}|${typeof palette === 'string' ? palette : JSON.stringify(palette)}`;
    const head = variant === 'head', stemK = head ? 0 : STEMK[type] || 1.5;
    const w = Math.ceil(sz * 2.3) + 6, h = Math.ceil(sz * (stemK + 1.45)) + 6, ax = w / 2, ay = head ? Math.ceil(sz * 1.3) + 3 : h - 3;
    const c = S.sprite(key, w, h, (x) => { x.translate(ax, ay); A.flowerSet(x, { type, size: sz, pop: variant === 'bud' ? 0.33 : 1, sway: 0, stem: head ? 0 : undefined, palette }); });
    return { c, ax, ay, w, h, size: sz };
  };
  A.drawFlower = (ctx, type, x, y, size, o = {}) => {
    const pop = o.pop === undefined ? 1 : clamp(o.pop);
    const sc = popScale(pop); if (sc <= 0.001) return;
    const ds = devScale(ctx), b = bucket(size * ds * 1.1), variant = o.head ? 'head' : 'open';
    const spr = A.flowerSprite(type, b, variant, o.palette || 'B'), k = (size / b) * sc;
    const u = unfurl(pop), a0 = (o.alpha === undefined ? 1 : o.alpha);
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(k, k);
    if (u < 1 && !o.head) { const bs = A.flowerSprite(type, b, 'bud', o.palette || 'B'); ctx.globalAlpha *= a0 * (1 - u); ctx.drawImage(bs.c, -bs.ax, -bs.ay); ctx.globalAlpha /= Math.max(1e-3, 1 - u); ctx.globalAlpha *= u; }
    else ctx.globalAlpha *= a0;
    ctx.drawImage(spr.c, -spr.ax, -spr.ay);
    ctx.restore();
  };

  /* =====================================================================
   * BUTTERFLY
   * ===================================================================== */
  const BFP = {};
  function bfPaths(pat) {
    if (BFP[pat]) return BFP[pat];
    const fw = new Path2D();
    fw.moveTo(0.03, -0.08); fw.bezierCurveTo(0.2, -0.5, 0.6, -0.88, 0.98, -0.86);
    fw.bezierCurveTo(1.07, -0.66, 0.99, -0.36, 0.8, -0.1); fw.bezierCurveTo(0.58, 0.0, 0.26, 0.04, 0.03, 0.02); fw.closePath();
    const hw = new Path2D(); hw.moveTo(0.03, 0.0); hw.bezierCurveTo(0.34, -0.12, 0.76, -0.08, 0.8, 0.2);
    if (pat === 'swallowtail') {
      hw.bezierCurveTo(0.84, 0.42, 0.66, 0.6, 0.47, 0.64); hw.bezierCurveTo(0.45, 0.78, 0.43, 0.94, 0.37, 1.03);
      hw.bezierCurveTo(0.3, 0.97, 0.31, 0.78, 0.3, 0.63); hw.bezierCurveTo(0.2, 0.53, 0.08, 0.3, 0.03, 0.06);
    } else { hw.bezierCurveTo(0.86, 0.46, 0.6, 0.72, 0.36, 0.7); hw.bezierCurveTo(0.18, 0.64, 0.06, 0.32, 0.03, 0.06); }
    hw.closePath();
    const fm = [[0.98, -0.86], [1.07, -0.66], [0.99, -0.36], [0.8, -0.1]], le = [[0.03, -0.08], [0.2, -0.5], [0.6, -0.88], [0.98, -0.86]];
    const hm = pat === 'swallowtail' ? [[0.8, 0.2], [0.84, 0.42], [0.66, 0.6], [0.47, 0.64]] : [[0.8, 0.2], [0.86, 0.46], [0.6, 0.72], [0.36, 0.7]];
    return (BFP[pat] = { fw, hw, fm, le, hm });
  }
  const BF_STYLE = {
    swallowtail: { base: ['#E8B84A', '#FFD36E', '#FFE698'], dark: '#1E1A1A', vein: 0.014, border: 0.24, spot: '#FFE08A', sheen: '#FFFFFF', sheenA: 0.22, body: '#2A2420' },
    sapphire: { base: ['#1F3FB8', '#4C8DFF', '#4FD6E8'], dark: '#0E1847', vein: 0.008, border: 0.3, spot: '#E8F4FF', sheen: '#9FFBFF', sheenA: 0.55, body: '#1A1F3A' },
    monarch: { base: ['#C9561C', '#F08A24', '#F9AE48'], dark: '#1E1614', vein: 0.03, border: 0.22, spot: '#FFF6EA', sheen: '#FFE2B0', sheenA: 0.2, body: '#1E1614' },
    pearl: { base: ['#E9E4FA', '#FBF8FF', '#FFFFFF'], dark: '#B7B0D6', vein: 0.007, border: 0.07, spot: '#E8C56A', sheen: '#FFD9F4', sheenA: 0.5, body: '#8C86A8' },
  };
  function wingArt(x, wing, pat, gem) {
    const P = bfPaths(pat), st = BF_STYLE[pat], path = P[wing], fore = wing === 'fw';
    x.save(); x.clip(path);
    x.fillStyle = RG(x, 0.04, 0, 0, 1.05, [[0, dk(st.base[0], 0.35)], [0.2, st.base[0]], [0.55, st.base[1]], [1, st.base[2]]]); x.fillRect(-0.2, -1.1, 1.5, 2.3);
    if (pat === 'pearl') {
      for (const [cx, cy, r, c] of [[0.5, -0.45, 0.35, '#FFD9F0'], [0.75, -0.7, 0.25, '#D9F0FF'], [0.45, 0.3, 0.3, '#DDFBEA'], [0.3, -0.15, 0.2, '#FFF1D6']]) { x.fillStyle = RG(x, cx, cy, 0, r, [[0, c, 0.85], [1, c, 0]]); x.fillRect(-0.2, -1.1, 1.5, 2.3); }
    }
    if (pat === 'swallowtail' && fore) {
      x.fillStyle = st.dark;
      for (const [f, l] of [[0.18, 0.34], [0.36, 0.42], [0.52, 0.3], [0.66, 0.38], [0.8, 0.22]]) { const a = bz(...P.le, f - 0.05), b = bz(...P.le, f + 0.04); x.beginPath(); x.moveTo(a[0], a[1] - 0.05); x.lineTo(b[0], b[1] - 0.05); x.lineTo(b[0] + 0.1 * l, b[1] + l); x.lineTo(a[0] + 0.06 * l, a[1] + l * 0.95); x.closePath(); x.fill(); }
    }
    if (pat === 'monarch' && fore) { x.fillStyle = st.dark; x.beginPath(); x.moveTo(0.6, -0.9); x.quadraticCurveTo(0.75, -0.55, 1.1, -0.45); x.lineTo(1.2, -1); x.closePath(); x.fill(); }
    // veins
    const margin = fore ? P.fm : P.hm, nv = fore ? 7 : 6;
    x.strokeStyle = css(st.dark, pat === 'sapphire' ? 0.45 : pat === 'pearl' ? 0.6 : 0.95); x.lineWidth = st.vein; x.lineCap = 'round';
    x.beginPath();
    for (let i = 0; i < nv; i++) { const m = bz(...margin, i / (nv - 1)), b0 = fore ? [0.06, -0.04] : [0.05, 0.02]; x.moveTo(b0[0], b0[1]); x.quadraticCurveTo((b0[0] + m[0]) / 2 + 0.05, (b0[1] + m[1]) / 2 + (fore ? 0.06 : -0.05), m[0], m[1]); }
    if (fore) { const a = bz(...P.le, 0.2); x.moveTo(a[0], a[1]); x.quadraticCurveTo(0.5, -0.45, 0.8, -0.1); }
    x.stroke();
    // marginal border band
    x.strokeStyle = css(st.dark, pat === 'pearl' ? 0.55 : 1); x.lineWidth = st.border; x.lineJoin = 'round'; x.stroke(path);
    if (pat === 'sapphire') { x.strokeStyle = css(st.dark, 0.45); x.lineWidth = st.border * 1.9; x.stroke(path); }
    // spots in the band
    const ns = fore ? 7 : 6;
    for (let i = 0; i < ns; i++) {
      const tt = (i + 0.5) / ns, m = bz(...margin, tt), bx = fore ? 0.06 : 0.05, by = fore ? -0.04 : 0.02, d = Math.hypot(m[0] - bx, m[1] - by), inset = pat === 'pearl' ? 0.08 : st.border * 0.32;
      const px = m[0] - ((m[0] - bx) / d) * inset, py = m[1] - ((m[1] - by) / d) * inset, r = pat === 'monarch' ? 0.022 : pat === 'pearl' ? 0.018 : 0.03;
      x.fillStyle = css(st.spot, pat === 'sapphire' ? 0.8 : 1);
      x.beginPath(); x.ellipse(px, py, r * (pat === 'swallowtail' ? 1.6 : 1), r, Math.atan2(m[1] - by, m[0] - bx) + PI / 2, 0, TAU); x.fill();
      if (pat === 'monarch') { x.beginPath(); x.arc(px - ((m[0] - bx) / d) * 0.045, py - ((m[1] - by) / d) * 0.045, 0.016, 0, TAU); x.fill(); }
    }
    if (pat === 'sapphire' && fore) { x.fillStyle = css(st.spot, 0.9); for (const [cx, cy, r] of [[0.82, -0.66, 0.03], [0.7, -0.72, 0.022], [0.9, -0.5, 0.02]]) { x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); } }
    if (pat === 'swallowtail' && !fore) {
      for (let i = 0; i < 5; i++) { const m = bz(...P.hm, 0.12 + i * 0.17); x.fillStyle = css('#4C8DFF', 0.95); x.beginPath(); x.ellipse(m[0] - 0.09, m[1] - 0.06, 0.04, 0.022, 0.6, 0, TAU); x.fill(); }
      x.fillStyle = '#E8563A'; x.beginPath(); x.arc(0.32, 0.56, 0.055, 0, TAU); x.fill(); x.fillStyle = st.dark; x.beginPath(); x.arc(0.33, 0.57, 0.024, 0, TAU); x.fill();
    }
    if (gem) {
      for (let gy = 0; gy < 10; gy++) for (let gx = 0; gx < 6; gx++) {
        const j = (a, b) => [(gx + a) * 0.2 - 0.05 + (H(gx + a + (gy + b) * 17, 3) - 0.5) * 0.09, (gy + b) * 0.21 - 1.0 + (H(gx + a + (gy + b) * 17, 4) - 0.5) * 0.09];
        const p00 = j(0, 0), p10 = j(1, 0), p01 = j(0, 1), p11 = j(1, 1);
        for (const [a, b, c, k] of [[p00, p10, p11, 0], [p00, p11, p01, 1]]) {
          const v = H(gx * 7 + gy * 31 + k, 8);
          x.fillStyle = v > 0.5 ? css('#FFFFFF', (v - 0.5) * 0.55) : css('#000020', (0.5 - v) * 0.5);
          x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.lineTo(c[0], c[1]); x.closePath(); x.fill();
          x.strokeStyle = css('#FFFFFF', 0.28); x.lineWidth = 0.006; x.stroke();
        }
      }
    }
    x.restore();
    x.strokeStyle = css(dk(st.dark, 0.3), 0.7); x.lineWidth = 0.012; x.stroke(path);
  }
  function wingSprite(pat, gem, ps, wing) {
    return S.sprite(`bf|${pat}|${gem ? 1 : 0}|${ps}|${wing}`, ps * 1.25, ps * 2.15, (x) => { x.setTransform(ps, 0, 0, ps, ps * 0.08, ps * 1.02); wingArt(x, wing, pat, gem); });
  }
  A.butterfly = (ctx, o = {}) => {
    const s = o.size || 60, t = o.t || 0, pat = BF_STYLE[o.pattern] ? o.pattern : 'swallowtail', gem = !!o.gem, st = BF_STYLE[pat];
    const hz = o.hz || 4.5, ph = o.phase || 0, P = bfPaths(pat);
    const fa = (tt) => 0.08 + 0.92 * Math.abs(Math.cos(tt * hz * PI + ph));
    const f = typeof o.flap === 'number' ? clamp(o.flap) : fa(t), fh = typeof o.flap === 'number' ? f : fa(t - 0.035);
    const ds = devScale(ctx), ps = bucket(s * ds * 1.05), sheen = o.sheen === undefined ? 1 : o.sheen;
    ctx.save(); if (o.rot) ctx.rotate(o.rot);
    ctx.translate(0, Math.sin(t * hz * TAU + ph) * s * 0.025);
    for (const side of [-1, 1]) {
      for (const [wing, ff] of [['hw', fh], ['fw', f]]) {
        const spr = wingSprite(pat, gem, ps, wing), path = P[wing];
        ctx.save(); ctx.scale(side * (0.1 + 0.9 * ff) * s, s);
        ctx.drawImage(spr, -0.08, -1.02, 1.25, 2.15);
        ctx.save(); ctx.clip(path);
        const off = Math.sin(t * 1.1 + side * 0.7 + ph) * 0.45 + (1 - ff) * 0.9 - 0.3;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = LG(ctx, off - 0.6, -0.9, off + 0.6, 0.9, [[0, st.sheen, 0], [0.42, st.sheen, 0], [0.5, st.sheen, st.sheenA * sheen], [0.6, st.sheen, 0], [1, st.sheen, 0]]);
        ctx.fillRect(-0.2, -1.1, 1.5, 2.3);
        if (ff < 0.7) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = css(dk(st.base[0], 0.6), (0.7 - ff) * 0.45); ctx.fillRect(-0.2, -1.1, 1.5, 2.3); }
        ctx.restore(); ctx.restore();
      }
    }
    if (gem) for (let i = 0; i < 5; i++) { const tw = Math.pow(E.osc(t, 1.1 + H(i, 2), H(i, 3)), 6), side = i % 2 ? 1 : -1, wx = (0.25 + H(i, 4) * 0.6) * (0.1 + 0.9 * f) * side * s, wy = (H(i, 5) * 1.2 - 0.8) * s; S.sparkle(ctx, wx, wy, s * (0.06 + 0.08 * tw), tw, '#FFFFFF', t); }
    // body
    const bc = st.body;
    ctx.fillStyle = LG(ctx, -s * 0.06, 0, s * 0.06, 0, [[0, lt(bc, 0.35)], [0.5, bc], [1, dk(bc, 0.4)]]);
    ctx.beginPath(); ctx.ellipse(0, s * 0.3, s * 0.045, s * 0.28, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = css(lt(bc, 0.3), 0.5); ctx.lineWidth = s * 0.008; ctx.beginPath(); for (let i = 1; i < 6; i++) { const y = s * (0.08 + i * 0.075); ctx.moveTo(-s * 0.04, y); ctx.quadraticCurveTo(0, y + s * 0.015, s * 0.04, y); } ctx.stroke();
    ctx.fillStyle = RG(ctx, -s * 0.02, -s * 0.06, 0, s * 0.11, [[0, lt(bc, 0.4)], [1, bc]]); ctx.beginPath(); ctx.ellipse(0, -s * 0.02, s * 0.07, s * 0.13, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = bc; ctx.beginPath(); ctx.arc(0, -s * 0.17, s * 0.05, 0, TAU); ctx.fill();
    ctx.strokeStyle = css(bc); ctx.lineWidth = Math.max(0.6 / ds, s * 0.014); ctx.lineCap = 'round';
    const aw = Math.sin(t * 2.3 + ph) * 0.04;
    ctx.beginPath(); ctx.moveTo(-s * 0.02, -s * 0.2); ctx.quadraticCurveTo(-s * 0.08, -s * 0.45, -s * (0.22 + aw), -s * 0.62); ctx.moveTo(s * 0.02, -s * 0.2); ctx.quadraticCurveTo(s * 0.08, -s * 0.45, s * (0.22 - aw), -s * 0.62); ctx.stroke();
    ctx.fillStyle = bc; ctx.beginPath(); ctx.arc(-s * (0.22 + aw), -s * 0.62, s * 0.022, 0, TAU); ctx.arc(s * (0.22 - aw), -s * 0.62, s * 0.022, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /* =====================================================================
   * HOOPOE (hüdhüd) — side view, faces right, origin = feet on perch
   * ===================================================================== */
  const HP = {};
  function hoopoePaths() {
    if (HP.body) return HP;
    const b = new Path2D();
    b.moveTo(0.3, -1.0); b.bezierCurveTo(0.5, -0.92, 0.52, -0.6, 0.32, -0.42); b.bezierCurveTo(0.14, -0.27, -0.25, -0.29, -0.5, -0.45);
    b.bezierCurveTo(-0.64, -0.52, -0.6, -0.67, -0.45, -0.75); b.bezierCurveTo(-0.2, -0.93, 0.1, -1.06, 0.3, -1.0); b.closePath(); HP.body = b;
    const w = new Path2D(); w.moveTo(0.24, -0.9); w.bezierCurveTo(0.02, -1.0, -0.45, -0.84, -0.82, -0.47); w.bezierCurveTo(-0.52, -0.4, -0.06, -0.48, 0.24, -0.9); w.closePath(); HP.wing = w;
    const tl = new Path2D(); tl.moveTo(-0.4, -0.64); tl.lineTo(-1.12, -0.33); tl.quadraticCurveTo(-1.22, -0.22, -1.13, -0.13); tl.lineTo(-0.42, -0.45); tl.closePath(); HP.tail = tl;
    const hd = new Path2D(); hd.arc(0.36, -1.1, 0.2, 0, TAU); HP.head = hd;
    const bl = new Path2D(); bl.moveTo(0.5, -1.16); bl.quadraticCurveTo(0.86, -1.13, 1.14, -0.95); bl.quadraticCurveTo(0.86, -1.04, 0.5, -1.04); bl.closePath(); HP.bill = bl;
    return HP;
  }
  A.hoopoe = (ctx, o = {}) => {
    const s = o.size || 80, t = o.t || 0, fan = clamp(o.fan || 0), P = hoopoePaths(), ds = devScale(ctx);
    let bow = typeof o.pose === 'number' ? o.pose : o.pose === 'bow' ? 1 : 0;
    const look = o.pose === 'look' ? 1 : 0, peck = o.pose === 'peck' ? 1 : 0;
    const body = '#E8A15C', bodyL = '#F6C994', bodyD = '#B86F38', blk = '#1E1A1A', wht = '#F6F0E6';
    ctx.save(); ctx.scale(o.flip ? -s : s, s);
    if (o.branch) {
      ctx.fillStyle = LG(ctx, 0, -0.04, 0, 0.12, [[0, '#8A6244'], [0.5, '#6B4A32'], [1, '#3E2A1C']]);
      ctx.beginPath(); ctx.moveTo(-1.45, 0.02); ctx.quadraticCurveTo(-0.2, -0.04, 1.1, 0.0); ctx.lineTo(1.1, 0.08); ctx.quadraticCurveTo(-0.2, 0.06, -1.45, 0.12); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.translate(0.85, 0.02); ctx.rotate(-0.5 + 0.05 * Math.sin(t * 1.4)); leafShape(ctx, 0.3, 0.09, '#3FA36B', ds * s); ctx.restore();
      ctx.save(); ctx.translate(-1.1, 0.06); ctx.rotate(2.6 + 0.05 * Math.sin(t * 1.2 + 1)); leafShape(ctx, 0.26, 0.08, '#2F8A6E', ds * s); ctx.restore();
    }
    // legs
    ctx.strokeStyle = '#5A4A48'; ctx.lineWidth = 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-0.02, -0.34); ctx.lineTo(-0.05, 0); ctx.moveTo(0.1, -0.35); ctx.lineTo(0.12, 0);
    ctx.moveTo(-0.13, 0.01); ctx.lineTo(0.04, 0.01); ctx.moveTo(0.02, 0.01); ctx.lineTo(0.22, 0.01); ctx.stroke();
    const br = 1 + 0.015 * Math.sin((TAU * t) / 3.2);
    ctx.save();
    ctx.translate(0.05, -0.3); ctx.rotate(bow * 0.32 - look * 0.05); ctx.scale(br, br); ctx.translate(-0.05, 0.3);
    // tail
    ctx.save(); ctx.translate(-0.42, -0.55); ctx.rotate(0.05 * Math.sin(t * 1.7) - bow * 0.15); ctx.translate(0.42, 0.55);
    ctx.fillStyle = LG(ctx, -0.4, -0.5, -1.15, -0.2, [[0, '#2A2420'], [1, blk]]); ctx.fill(P.tail);
    ctx.save(); ctx.clip(P.tail); ctx.strokeStyle = wht; ctx.lineWidth = 0.075; ctx.beginPath(); ctx.moveTo(-0.72, -0.62); ctx.lineTo(-0.86, -0.1); ctx.stroke(); ctx.restore();
    ctx.restore();
    // body with rim light + two-tone
    ctx.fillStyle = '#FFE2B8'; ctx.fill(P.body);
    ctx.save(); ctx.clip(P.body); ctx.translate(0.025, 0.035);
    ctx.fillStyle = LG(ctx, 0, -1.0, 0.05, -0.3, [[0, bodyD], [0.35, body], [1, bodyL]]); ctx.fill(P.body); ctx.restore();
    crescent(ctx, P.body, -0.06, -0.09, '#8A4A2A', 0.3);
    // wing
    ctx.save(); ctx.translate(0.0, 0.0);
    ctx.fillStyle = 'rgba(60,30,20,0.35)'; ctx.save(); ctx.translate(0.02, 0.035); ctx.fill(P.wing); ctx.restore();
    ctx.fillStyle = LG(ctx, 0.24, -0.9, -0.8, -0.47, [[0, '#4A3426'], [0.25, blk], [1, blk]]); ctx.fill(P.wing);
    ctx.save(); ctx.clip(P.wing); ctx.strokeStyle = wht; ctx.lineWidth = 0.042;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const f = 0.26 + i * 0.12, cx = lerp(0.24, -0.82, f), cy = lerp(-0.9, -0.47, f); ctx.moveTo(cx - 0.1, cy - 0.24); ctx.lineTo(cx + 0.12, cy + 0.28); } ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,240,220,0.35)'; ctx.lineWidth = 0.012; ctx.stroke(P.wing);
    ctx.restore();
    // head group
    const hr = 0.06 * E.noise(t * 0.8, 5) + bow * 0.35 + peck * (0.55 + 0.25 * Math.max(0, Math.sin(t * 5))) - look * 0.25;
    ctx.save(); ctx.translate(0.24, -0.92); ctx.rotate(hr); ctx.translate(-0.24, 0.92);
    // crest (behind head)
    for (let i = 5; i >= 0; i--) {
      const f = i / 5, rx = lerp(0.5, 0.2, f), ry = -1.24 - Math.sin(f * PI) * 0.06 + f * 0.02;
      const folded = -PI + 0.18 + f * 0.12 - (1 - f) * 0.1, fanned = lerp(-0.42, -2.75, f);
      const a = lerp(folded, fanned, E.ease.outBack(fan)) + 0.04 * Math.sin(t * 3 + i) * (0.4 + fan), L = lerp(0.42, 0.5, Math.sin(f * PI)) * lerp(0.92, 1, fan), wv = 0.075;
      ctx.save(); ctx.translate(rx, ry); ctx.rotate(a);
      const fp = new Path2D(); fp.moveTo(0, -wv * 0.25); fp.bezierCurveTo(L * 0.35, -wv * 0.95, L * 0.8, -wv * 0.75, L, 0); fp.bezierCurveTo(L * 0.8, wv * 0.75, L * 0.35, wv * 0.95, 0, wv * 0.25); fp.closePath();
      ctx.fillStyle = LG(ctx, 0, 0, L, 0, [[0, bodyD], [0.3, body], [0.6, '#F2B676'], [0.64, wht], [0.75, wht], [0.79, blk], [1, blk]]); ctx.fill(fp);
      ctx.restore();
    }
    ctx.fillStyle = '#FFE2B8'; ctx.fill(P.head);
    ctx.save(); ctx.clip(P.head); ctx.translate(0.018, 0.025); ctx.fillStyle = RG(ctx, 0.3, -1.18, 0.02, 0.26, [[0, '#F7C38A'], [1, '#D98A4E']]); ctx.fill(P.head); ctx.restore();
    ctx.fillStyle = LG(ctx, 0.5, -1.1, 1.14, -0.95, [[0, '#6B5A50'], [0.3, '#2B2522'], [1, '#1A1614']]); ctx.fill(P.bill);
    ctx.fillStyle = '#1A1414'; ctx.beginPath(); ctx.arc(0.43, -1.13, 0.032, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(0.42, -1.14, 0.011, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.restore();
  };

  /* =====================================================================
   * POMEGRANATE
   * ===================================================================== */
  function pomBody(r) { const p = new Path2D(); for (let i = 0; i <= 72; i++) { const a = (i / 72) * TAU, rr = r * (1 + 0.025 * Math.cos(6 * a + 0.4)) * (a > PI * 1.25 && a < PI * 1.75 ? 1 - 0.05 * Math.sin((a - PI * 1.25) * 2 * PI) : 1); const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.97; i ? p.lineTo(x, y) : p.moveTo(x, y); } p.closePath(); return p; }
  function pomCrown(ctx, r, cy, gem, ds) {
    const nb = 6, cw = r * 0.2;
    ctx.fillStyle = gem ? '#C8922A' : '#A8233A'; ctx.beginPath(); ctx.moveTo(-cw, cy + r * 0.12); ctx.lineTo(-cw * 0.9, cy - r * 0.08); ctx.lineTo(cw * 0.9, cy - r * 0.08); ctx.lineTo(cw, cy + r * 0.12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = gem ? '#5A3A10' : '#4A0A18'; ctx.beginPath(); ctx.ellipse(0, cy - r * 0.08, cw * 0.9, cw * 0.32, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < nb; i++) {
      const f = i / (nb - 1) - 0.5, back = i % 2 === 1, a = f * 1.5, len = r * (back ? 0.26 : 0.3);
      ctx.save(); ctx.translate(f * cw * 1.6, cy - r * 0.06); ctx.rotate(a);
      const p = new Path2D(); p.moveTo(-r * 0.06, 0); p.lineTo(0, -len); p.lineTo(r * 0.06, 0); p.closePath();
      ctx.fillStyle = gem ? LG(ctx, 0, 0, 0, -len, [[0, '#B8862E'], [1, '#FFE3A1']]) : LG(ctx, 0, 0, 0, -len, [[0, back ? '#7A1428' : '#B8283E'], [1, back ? '#C9505E' : '#FF8A95']]);
      ctx.fill(p); ctx.restore();
    }
  }
  function pomCutArt(x, r) {
    const body = pomBody(r);
    x.fillStyle = RG(x, -0.3 * r, 0.1 * r, 0.1 * r, r * 1.2, [[0, '#E8384F'], [0.7, '#A81A35'], [1, '#6E0E22']]); x.fill(body);
    crescent(x, body, -0.06 * r, -0.08 * r, '#4A0812', 0.35);
    pomCrown(x, r, -0.9 * r, false, 1);
    const fc = new Path2D(); fc.ellipse(0, -0.06 * r, 0.93 * r, 0.7 * r, 0, 0, TAU);
    x.fillStyle = '#C92A43'; x.fill(fc);
    const pith = new Path2D(); pith.ellipse(0, -0.05 * r, 0.85 * r, 0.63 * r, 0, 0, TAU);
    x.fillStyle = RG(x, -0.2 * r, -0.25 * r, 0, r, [[0, '#FFF3E2'], [0.7, '#F6DCC0'], [1, '#E8B998']]); x.fill(pith);
    x.save(); x.clip(pith);
    const walls = []; for (let i = 0; i < 6; i++) walls.push((i / 6) * TAU + 0.3 + (H(i, 3) - 0.5) * 0.4);
    const ar = r * 0.072, list = [];
    for (let gy = -10; gy <= 10; gy++) for (let gx = -12; gx <= 12; gx++) {
      const px = (gx + (gy % 2 ? 0.5 : 0)) * ar * 1.72 + (H(gx * 31 + gy, 5) - 0.5) * ar * 0.4, py = gy * ar * 1.5 * 0.74 - 0.05 * r + (H(gx * 31 + gy, 6) - 0.5) * ar * 0.3;
      const ex = px / (0.78 * r), ey = (py + 0.05 * r) / (0.57 * r); if (ex * ex + ey * ey > 1) continue;
      if (Math.hypot(px, (py + 0.05 * r) / 0.74) < r * 0.12) continue;
      const ang = Math.atan2((py + 0.05 * r) / 0.74, px); let near = false; for (const w of walls) { let d = Math.abs(((ang - w + PI * 3) % TAU) - PI); if (d * Math.hypot(px, py / 0.74) < ar * 0.95) near = true; }
      if (!near) list.push([px, py]);
    }
    x.strokeStyle = css('#FFF7EC', 0.9); x.lineWidth = r * 0.03; x.lineCap = 'round';
    x.beginPath(); for (const w of walls) { x.moveTo(Math.cos(w) * r * 0.1, -0.05 * r + Math.sin(w) * r * 0.08); x.quadraticCurveTo(Math.cos(w + 0.2) * r * 0.5, -0.05 * r + Math.sin(w + 0.2) * r * 0.38, Math.cos(w) * r * 0.9, -0.05 * r + Math.sin(w) * r * 0.66); } x.stroke();
    for (const [px, py] of list) {
      const rr = ar * (0.86 + H(px * 13 + py, 2) * 0.2);
      x.fillStyle = css('#8E0F2E', 0.5); x.beginPath(); x.ellipse(px + rr * 0.12, py + rr * 0.15, rr, rr * 0.9, 0, 0, TAU); x.fill();
      x.fillStyle = RG(x, px - rr * 0.35, py - rr * 0.35, 0, rr * 1.15, [[0, '#FFB3C0'], [0.35, '#FF5A78'], [1, '#B8183E']]);
      x.beginPath(); x.ellipse(px, py, rr, rr * 0.9, (H(px, 4) - 0.5) * 0.8, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.ellipse(px - rr * 0.35, py - rr * 0.38, rr * 0.22, rr * 0.13, -0.6, 0, TAU); x.fill();
    }
    x.restore();
    x.strokeStyle = css('#FF8A95', 0.6); x.lineWidth = r * 0.02; x.stroke(fc);
  }
  A.pomegranate = (ctx, o = {}) => {
    const r = o.r || 60, t = o.t || 0, ds = devScale(ctx);
    ctx.save(); if (o.rot) ctx.rotate(o.rot);
    if (o.cut) {
      const b = bucket(r * ds), spr = S.sprite('pomcut|' + b, b * 2.3, b * 2.6, (x) => { x.translate(b * 1.15, b * 1.4); pomCutArt(x, b); });
      const k = r / b; ctx.drawImage(spr, -1.15 * r, -1.4 * r, spr.width * k, spr.height * k);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) { const tw = Math.pow(E.osc(t, 1.4 + H(i, 7), H(i, 8)), 6); S.sparkle(ctx, (H(i, 9) - 0.5) * 1.2 * r, (H(i, 10) - 0.55) * 0.8 * r, r * 0.07 * (0.4 + tw), tw, '#FFFFFF', t); }
      ctx.restore(); ctx.restore(); return;
    }
    const body = pomBody(r);
    if (o.gem) {
      const N = 10, rings = [0.34, 0.7, 1.0];
      const pts = rings.map((k, j) => { const a = []; for (let i = 0; i < N; i++) { const an = (i / N) * TAU + (j % 2 ? PI / N : 0); a.push([Math.cos(an) * r * k - j * 0, Math.sin(an) * r * k * 0.97]); } return a; });
      const Lv = norm([-0.6, -0.7, 0.5]);
      const facet = (a, b, c, nz) => { const cx = (a[0] + b[0] + c[0]) / 3 / r, cy = (a[1] + b[1] + c[1]) / 3 / r; const n = norm([cx, cy, nz]); const lam = clamp(dot(n, Lv) * 1.3 + (H(Math.round(cx * 97 + cy * 31), 5) - 0.5) * 0.4, -1, 1); const col = ramp(GEM_RAMP, lam); ctx.fillStyle = css(col); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = css(lt(col, 0.5), 0.6); ctx.lineWidth = Math.max(0.7 / ds, r * 0.01); ctx.stroke(); return lam; };
      for (let i = 0; i < N; i++) { const j = (i + 1) % N; facet(pts[2][i], pts[2][j], pts[1][i], 0.35); facet(pts[2][j], pts[1][j], pts[1][i], 0.45); facet(pts[1][i], pts[1][j], pts[0][i], 0.8); facet(pts[1][j], pts[0][j], pts[0][i], 0.8); }
      ctx.beginPath(); pts[0].forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = RG(ctx, -0.1 * r, -0.12 * r, 0, r * 0.4, [[0, '#FFC2D2'], [1, '#FF3D6E']]); ctx.fill();
      pomCrown(ctx, r, -0.92 * r, true, ds);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = RG(ctx, 0, 0, 0, r * 1.5, [[0, '#FF3D6E', 0.28], [1, '#FF3D6E', 0]]); ctx.fillRect(-1.5 * r, -1.5 * r, 3 * r, 3 * r); ctx.restore();
      for (let i = 0; i < 4; i++) { const tw = Math.pow(E.osc(t, 1.2 + H(i, 11), H(i, 12)), 5), p = pts[1 + (i % 2)][(i * 3) % N]; S.sparkle(ctx, p[0], p[1], r * (0.08 + 0.1 * tw), 0.3 + 0.7 * tw, '#FFF2F6', t * 0.5); }
      ctx.restore(); return;
    }
    ctx.fillStyle = '#FFB0B8'; ctx.fill(body);
    ctx.save(); ctx.clip(body); ctx.translate(0.035 * r, 0.04 * r);
    ctx.fillStyle = RG(ctx, -0.38 * r, -0.4 * r, 0.05 * r, r * 1.35, [[0, '#FF8088'], [0.3, '#E8384F'], [0.75, '#B01D3A'], [1, '#7A1028']]); ctx.fill(body); ctx.restore();
    crescent(ctx, body, -0.16 * r, -0.2 * r, '#5A0818', 0.3);
    ctx.save(); ctx.clip(body);
    ctx.fillStyle = css('#FF9AA5', 0.22); for (let i = 0; i < 26; i++) { const a = H(i, 21) * TAU, d = Math.sqrt(H(i, 22)) * r * 0.85; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.012, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = css('#8E1530', 0.18); ctx.lineWidth = r * 0.02; ctx.beginPath(); for (const a of [-0.55, 0, 0.55]) { ctx.moveTo(Math.sin(a) * r * 0.25, -r * 0.85); ctx.quadraticCurveTo(Math.sin(a) * r * 0.95, 0, Math.sin(a) * r * 0.3, r * 0.92); } ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-0.4 * r, -0.42 * r, 0.17 * r, 0.09 * r, -0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-0.2 * r, -0.58 * r, 0.035 * r, 0, TAU); ctx.fill();
    pomCrown(ctx, r, -0.9 * r, false, ds);
    ctx.restore();
  };

  /* =====================================================================
   * PEACOCK FEATHER
   * ===================================================================== */
  A.peacockFeather = (ctx, o = {}) => {
    const L = o.len || 300, t = o.t || 0, sheen = o.sheen === undefined ? 1 : o.sheen, ds = devScale(ctx);
    const sw = (o.sway === undefined ? 1 : o.sway) * (0.05 * Math.sin(t * 1.1) + 0.02 * Math.sin(t * 2.3 + 1));
    const ax = (s) => [L * (0.05 * Math.sin(s * 2.4) + sw * s * s), -L * s];
    const tan = (s) => { const a = ax(s - 0.01), b = ax(s + 0.01); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
    const lw = Math.max(0.6 / ds, L * 0.0042);
    ctx.save(); ctx.lineCap = 'round';
    // loose lower barbs (herl): sparse, long, curling strands
    const strands = (n, s0, s1, lenF, cols, alpha, wmul) => {
      for (let c = 0; c < cols.length; c++) {
        ctx.strokeStyle = css(cols[c], alpha); ctx.lineWidth = lw * wmul; ctx.beginPath();
        for (let i = c; i < n; i += cols.length) {
          const f = i / (n - 1), s = s0 + f * (s1 - s0), p = ax(s), a = tan(s), bl = L * lenF(f) * (0.85 + 0.3 * H(i, 3));
          for (const side of [-1, 1]) {
            const da = a + side * (PI / 2 - 0.62) , wob = Math.sin(t * 1.7 + i * 0.7 + side) * 0.06;
            const ex = p[0] + Math.cos(da - side * (0.35 + wob)) * bl, ey = p[1] + Math.sin(da - side * (0.35 + wob)) * bl;
            ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(p[0] + Math.cos(da) * bl * 0.55, p[1] + Math.sin(da) * bl * 0.55, ex, ey);
          }
        }
        ctx.stroke();
      }
    };
    strands(34, 0.1, 0.62, (f) => 0.1 + 0.13 * Math.sin(f * PI * 0.85), ['#6E8C3A', '#A89A3E', '#4E8A50'], 0.62, 1);
    // vane around the eye: teardrop of dense barbs
    const ec = ax(0.82), ea = tan(0.82) + PI / 2;
    ctx.save(); ctx.translate(ec[0], ec[1]); ctx.rotate(ea);
    const vr = L * 0.165, vt = L * 0.2, vb = L * 0.27;
    const vane = new Path2D(); vane.moveTo(0, vb); vane.bezierCurveTo(vr * 0.7, vb * 0.55, vr * 1.12, vt * 0.1, vr * 0.95, -vt * 0.45); vane.bezierCurveTo(vr * 0.75, -vt * 1.05, -vr * 0.75, -vt * 1.05, -vr * 0.95, -vt * 0.45); vane.bezierCurveTo(-vr * 1.12, vt * 0.1, -vr * 0.7, vb * 0.55, 0, vb); vane.closePath();
    ctx.fillStyle = RG(ctx, 0, 0, 0, vt * 1.2, [[0, '#1F6E58'], [0.45, '#2E8B57'], [0.75, '#6FA83E'], [1, '#B8A040']]); ctx.fill(vane);
    ctx.save(); ctx.clip(vane);
    ctx.strokeStyle = css('#D9C25A', 0.35); ctx.lineWidth = lw * 0.6; ctx.beginPath();
    for (let i = 0; i < 90; i++) { const a = (i / 90) * TAU; ctx.moveTo(Math.cos(a) * vr * 0.3, Math.sin(a) * vt * 0.3); ctx.lineTo(Math.cos(a) * vr * 1.3, Math.sin(a) * vb * 1.1); } ctx.stroke();
    ctx.restore();
    // feathery fringe beyond the vane edge
    ctx.strokeStyle = css('#A8A040', 0.5); ctx.lineWidth = lw * 0.7; ctx.beginPath();
    for (let i = 0; i < 70; i++) { const a = -PI + (i / 69) * TAU, ca = Math.cos(a), sa = Math.sin(a), rx = vr * 0.98, ry = sa < 0 ? vt * 0.98 : vb * 0.6; const x0 = ca * rx * 0.85, y0 = sa * ry * 0.85, fl = L * (0.025 + 0.02 * H(i, 9)) + Math.sin(t * 2 + i) * L * 0.003; ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + ca * fl * 0.6, y0 + sa * fl * 0.6 - fl * 0.2, x0 + ca * fl, y0 + sa * fl + fl * 0.15); } ctx.stroke();
    const sh = Math.sin(t * 0.9) * 0.5 + 0.5;
    const rings = [[0.118, 0.13, mx('#C99A3A', '#FFCF5A', sh), 0.0], [0.092, 0.1, mx('#2EE6A6', '#3AD8C8', sh), 0.006], [0.068, 0.074, mx('#4C8DFF', '#5A70FF', sh), 0.012], [0.042, 0.044, '#2E1A6B', 0.018]];
    for (const [rx, ry, c, oy] of rings) {
      ctx.fillStyle = RG(ctx, -rx * L * 0.3, oy * L - ry * L * 0.3, 0, rx * L * 1.15, [[0, lt(c, 0.28)], [0.65, c], [1, dk(c, 0.3)]]);
      ctx.beginPath(); ctx.ellipse(0, oy * L, rx * L, ry * L, 0, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = css('#150A35'); ctx.beginPath(); ctx.ellipse(0, L * 0.022, L * 0.026, L * 0.028, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-L * 0.02, -L * 0.035, L * 0.018, L * 0.01, -0.5, 0, TAU); ctx.fill();
    if (sheen > 0) {
      ctx.save(); ctx.clip(vane); ctx.globalCompositeOperation = 'screen'; const off = Math.sin(t * 0.8) * vr * 0.8;
      ctx.fillStyle = LG(ctx, off - vr, -vt, off + vr, vt, [[0, '#FFFFFF', 0], [0.42, '#B8FFF0', 0], [0.52, '#E8FFFF', 0.4 * sheen], [0.62, '#B8FFF0', 0], [1, '#FFFFFF', 0]]);
      ctx.fillRect(-vr * 1.5, -vt * 1.5, vr * 3, vt * 3); ctx.restore();
    }
    ctx.restore();
    // rachis
    ctx.strokeStyle = LG(ctx, 0, 0, 0, -L, [[0, '#F2E6C8'], [0.5, '#D9C79A'], [1, '#8A7A4A']]); ctx.lineWidth = Math.max(0.8 / ds, L * 0.011);
    ctx.beginPath(); for (let i = 0; i <= 24; i++) { const p = ax((i / 24) * 0.78); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke();
    ctx.restore();
  };

  /* =====================================================================
   * SNOWFLAKE
   * ===================================================================== */
  A.snowflake = (ctx, o = {}) => {
    const r = o.r || 60, t = o.t || 0, melt = clamp(o.melt || 0), ds = devScale(ctx);
    const k2 = 1 - sm(melt / 0.4), k1 = 1 - sm((melt - 0.12) / 0.45), k0 = 1 - 0.95 * sm((melt - 0.28) / 0.62);
    ctx.save(); ctx.rotate((o.rot || 0) + t * 0.08);
    const arm = new Path2D(), arm2 = new Path2D();
    const L = r * k0;
    if (L > 0.5) {
      arm.moveTo(0, 0); arm.lineTo(L, 0);
      for (const [f, l] of [[0.32, 0.42], [0.55, 0.34], [0.76, 0.22]]) {
        const bl = r * l * k1, x0 = r * f * k0; if (x0 > L || bl < 0.3) continue;
        for (const sd of [-1, 1]) {
          const ex = x0 + Math.cos(PI / 3) * bl, ey = sd * Math.sin(PI / 3) * bl;
          arm.moveTo(x0, 0); arm.lineTo(ex, ey);
          const sl = bl * 0.45 * k2; if (sl > 0.3) { const mx0 = x0 + (ex - x0) * 0.5, my0 = ey * 0.5; arm2.moveTo(mx0, my0); arm2.lineTo(mx0 + sl, my0); arm2.moveTo(mx0, my0); arm2.lineTo(mx0 + Math.cos(sd * 2 * PI / 3) * sl * 0.8, my0 + Math.sin(sd * 2 * PI / 3) * sl * 0.8); }
        }
      }
      const tl = r * 0.12 * k2; if (tl > 0.3) { arm2.moveTo(L * 0.9, 0); arm2.lineTo(L * 0.9 + tl * 0.5, -tl); arm2.moveTo(L * 0.9, 0); arm2.lineTo(L * 0.9 + tl * 0.5, tl); }
    }
    const lw = r * (0.055 + melt * 0.1), aF = 1 - sm((melt - 0.55) / 0.4);
    const drawAll = (w, col, a) => {
      ctx.strokeStyle = css(col, a * aF); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate((i / 6) * TAU); ctx.lineWidth = w; ctx.stroke(arm); ctx.lineWidth = w * 0.7; ctx.stroke(arm2); ctx.restore(); }
    };
    if (aF > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawAll(lw * 3.2, '#7FC8FF', 0.16); drawAll(lw * 1.8, '#BFE6FF', 0.25); ctx.restore();
      drawAll(lw, '#E8F6FF', 1);
      ctx.fillStyle = css('#F6FBFF', aF); ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + PI / 6, rr = r * 0.16 * (1 + melt * 0.5); i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
      ctx.strokeStyle = css('#9FD8FF', 0.7 * aF); ctx.lineWidth = Math.max(0.6 / ds, r * 0.012); ctx.stroke();
      if (melt < 0.3) for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU, tw = Math.pow(E.osc(t, 1.7 + H(i, 3), H(i, 4)), 8); S.sparkle(ctx, Math.cos(a) * L, Math.sin(a) * L, r * 0.1 * tw, tw * (1 - melt * 3), '#FFFFFF', 0); }
    }
    const dm = sm((melt - 0.35) / 0.55);
    if (dm > 0.01) {
      ctx.rotate(-((o.rot || 0) + t * 0.08));
      const dr = r * lerp(0.16, 0.34, dm);
      ctx.save(); ctx.globalAlpha *= dm;
      const dp = new Path2D(); dp.moveTo(0, -dr * 1.55); dp.bezierCurveTo(dr * 0.35, -dr * 1.0, dr * 1.0, -dr * 0.45, dr, 0.05 * dr); dp.arc(0, 0.05 * dr, dr, 0, PI); dp.bezierCurveTo(-dr, -dr * 0.45, -dr * 0.35, -dr * 1.0, 0, -dr * 1.55); dp.closePath();
      ctx.fillStyle = RG(ctx, -dr * 0.3, -dr * 0.2, 0, dr * 1.3, [[0, '#E8F8FF'], [0.45, '#8FDCFF'], [1, '#3E8FD0']]); ctx.fill(dp);
      ctx.strokeStyle = css('#E8F8FF', 0.6); ctx.lineWidth = Math.max(0.6 / ds, dr * 0.05); ctx.stroke(dp);
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(-dr * 0.38, -dr * 0.15, dr * 0.16, dr * 0.28, 0.3, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = RG(ctx, 0, 0, 0, dr * 2, [[0, '#8FDCFF', 0.3], [1, '#8FDCFF', 0]]); ctx.fillRect(-dr * 2, -dr * 2, dr * 4, dr * 4);
      ctx.restore();
    }
    ctx.restore();
  };

  /* =====================================================================
   * NAUTILUS (cut shell)
   * ===================================================================== */
  function nautilusArt(x, r) {
    const b = Math.log(3.0) / TAU, th1 = 0.55, rho = (th) => r * Math.exp(b * (th - th1));
    const P = (th) => [Math.cos(th) * rho(th), Math.sin(th) * rho(th)];
    // centre the bbox: shift so the shell's bbox centre is at the origin
    x.save(); x.translate(-0.1 * r, -0.1 * r);
    const outline = new Path2D(); for (let i = 0; i <= 120; i++) { const th = th1 - TAU + (i / 120) * TAU, p = P(th); i ? outline.lineTo(p[0], p[1]) : outline.moveTo(p[0], p[1]); } outline.closePath();
    x.fillStyle = '#F7E6D4'; x.fill(outline);
    x.save(); x.clip(outline);
    const sept = []; for (let k = 0; ; k++) { const th = th1 - 1.75 - k * 0.6; if (rho(th) < r * 0.012) break; sept.push(th); }
    const chamber = (ta, tb, idx) => {
      const p = new Path2D(), n = 10;
      for (let i = 0; i <= n; i++) { const q = P(ta + ((tb - ta) * i) / n); i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]); }
      const ob = P(tb), ib = P(tb - TAU), mb = [(ob[0] + ib[0]) / 2, (ob[1] + ib[1]) / 2], cb = 0.28;
      p.quadraticCurveTo(mb[0] * Math.cos(-cb) - mb[1] * Math.sin(-cb), mb[0] * Math.sin(-cb) + mb[1] * Math.cos(-cb), ib[0], ib[1]);
      for (let i = n; i >= 0; i--) { const q = P(ta - TAU + ((tb - ta) * i) / n); p.lineTo(q[0], q[1]); }
      const oa = P(ta), ia = P(ta - TAU), ma = [(oa[0] + ia[0]) / 2, (oa[1] + ia[1]) / 2];
      p.quadraticCurveTo(ma[0] * Math.cos(-cb) - ma[1] * Math.sin(-cb), ma[0] * Math.sin(-cb) + ma[1] * Math.cos(-cb), oa[0], oa[1]);
      p.closePath();
      const tm = (ta + tb) / 2, c = P(tm), ci = P(tm - TAU), cx = (c[0] * 0.6 + ci[0] * 0.4), cy = (c[1] * 0.6 + ci[1] * 0.4), cr = Math.hypot(c[0] - ci[0], c[1] - ci[1]) * 0.9 + 1;
      const tint = idx % 2 ? '#F2D6C2' : '#F6DDCB';
      x.fillStyle = RG(x, cx, cy, 0, cr, [[0, lt(tint, 0.35)], [0.6, tint], [1, '#C98A6A']]); x.fill(p);
      x.strokeStyle = css('#FFF6EC', 0.9); x.lineWidth = Math.max(0.8, cr * 0.07); x.stroke(p);
    };
    // body chamber (dark, open)
    { const p = new Path2D(), ta = sept[0], tb = th1; for (let i = 0; i <= 20; i++) { const q = P(ta + ((tb - ta) * i) / 20); i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]); } for (let i = 20; i >= 0; i--) { const q = P(ta - TAU + ((tb - ta) * i) / 20); p.lineTo(q[0], q[1]); } p.closePath(); const c = P((ta + tb) / 2); x.fillStyle = RG(x, c[0] * 0.9, c[1] * 0.9, 0, r * 0.95, [[0, '#F4DCCB'], [0.45, '#D9A88C'], [0.85, '#9A6450'], [1, '#6A3E32']]); x.fill(p); x.save(); x.clip(p); crescent(x, p, r * 0.05, r * 0.06, '#5A3428', 0.35); x.restore(); }
    for (let k = 0; k < sept.length - 1; k++) chamber(sept[k + 1], sept[k], k);
    x.restore();
    // outer wall with stripes
    x.save(); x.clip(outline);
    x.strokeStyle = '#F2D6C2'; x.lineWidth = r * 0.07; x.stroke(outline);
    x.strokeStyle = css('#B5633A', 0.85); x.lineCap = 'round'; x.lineWidth = r * 0.03;
    x.beginPath(); for (let i = 0; i < 9; i++) { const th = th1 - 0.3 - i * 0.55, p = P(th), d = rho(th); x.moveTo(p[0], p[1]); x.lineTo(p[0] - Math.cos(th + 0.5) * d * 0.09, p[1] - Math.sin(th + 0.5) * d * 0.09); } x.stroke();
    x.restore();
    x.strokeStyle = css('#C98A6A', 0.9); x.lineWidth = r * 0.014; x.stroke(outline);
    x.globalCompositeOperation = 'screen'; x.fillStyle = LG(x, -r, -r, r, r, [[0, '#FFD9F0', 0.0], [0.4, '#D9F0FF', 0.25], [0.6, '#FFF1D6', 0.25], [1, '#FFD9F0', 0]]); x.fill(outline);
    x.restore();
  }
  A.nautilus = (ctx, o = {}) => {
    const r = o.r || 60, ds = devScale(ctx), b = bucket(r * ds);
    const spr = S.sprite('naut|' + b, b * 2.4, b * 2.4, (x) => { x.translate(b * 1.2, b * 1.2); nautilusArt(x, b); });
    const k = r / b; ctx.save(); if (o.rot) ctx.rotate(o.rot); ctx.drawImage(spr, -1.2 * r, -1.2 * r, spr.width * k, spr.height * k); ctx.restore();
  };

  /* =====================================================================
   * BEE
   * ===================================================================== */
  A.bee = (ctx, o = {}) => {
    const s = o.size || 40, t = o.t || 0, ds = devScale(ctx);
    ctx.save(); if (o.rot) ctx.rotate(o.rot); if (o.flip) ctx.scale(-1, 1);
    if (o.hover !== false) ctx.translate(0, Math.sin(t * TAU * 0.8) * s * 0.05);
    ctx.scale(s, s);
    const wing = (a, al) => { ctx.save(); ctx.translate(0.06, -0.16); ctx.rotate(a); ctx.fillStyle = css('#EAF6FF', 0.42 * al); ctx.strokeStyle = css('#FFFFFF', 0.75 * al); ctx.lineWidth = 0.012; ctx.beginPath(); ctx.ellipse(-0.24, 0, 0.26, 0.1, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); };
    const wa = Math.sin(t * TAU * 9) * 0.25;
    wing(-2.2 + wa - 0.35, 0.6); wing(-2.2 + wa + 0.35, 0.6);
    ctx.strokeStyle = '#2A1E1A'; ctx.lineWidth = 0.03; ctx.lineCap = 'round';
    ctx.beginPath(); for (const x of [-0.02, 0.08, 0.17]) { ctx.moveTo(x, 0.1); ctx.quadraticCurveTo(x - 0.03, 0.2, x - 0.07, 0.26); } ctx.stroke();
    const ab = new Path2D(); ab.ellipse(-0.2, 0.04, 0.3, 0.21, 0.22, 0, TAU);
    ctx.fillStyle = RG(ctx, -0.28, -0.08, 0.02, 0.38, [[0, '#FFE27A'], [0.6, '#FFC93C'], [1, '#C98A1E']]); ctx.fill(ab);
    ctx.save(); ctx.clip(ab); ctx.strokeStyle = '#2A1E1A'; ctx.lineWidth = 0.075;
    ctx.beginPath(); for (const x of [-0.1, -0.27, -0.43]) { ctx.moveTo(x + 0.06, -0.25); ctx.quadraticCurveTo(x - 0.04, 0.05, x + 0.04, 0.35); } ctx.stroke(); ctx.restore();
    crescent(ctx, ab, -0.04, -0.06, '#3A2010', 0.3);
    ctx.fillStyle = '#2A1E1A'; ctx.beginPath(); ctx.moveTo(-0.49, 0.1); ctx.lineTo(-0.6, 0.14); ctx.lineTo(-0.48, 0.16); ctx.fill();
    const th = new Path2D(); th.arc(0.12, -0.04, 0.16, 0, TAU);
    ctx.fillStyle = RG(ctx, 0.08, -0.1, 0.01, 0.2, [[0, '#E8B04A'], [0.7, '#9A6A24'], [1, '#5A3A14']]); ctx.fill(th);
    ctx.fillStyle = '#2A1E1A'; ctx.beginPath(); ctx.arc(0.32, 0.0, 0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4A3A3A'; ctx.beginPath(); ctx.ellipse(0.35, -0.02, 0.045, 0.065, 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(0.36, -0.05, 0.016, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2A1E1A'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(0.36, -0.08); ctx.lineTo(0.42, -0.2); ctx.lineTo(0.52, -0.24); ctx.moveTo(0.33, -0.09); ctx.lineTo(0.36, -0.22); ctx.lineTo(0.46, -0.28); ctx.stroke();
    wing(-2.0 - wa - 0.3, 0.75); wing(-2.0 - wa + 0.3, 0.75);
    ctx.restore();
  };

  /* =====================================================================
   * GRAPES & CHERRIES (sprite-cached)
   * ===================================================================== */
  function berry(x, cx, cy, r, gold) {
    const c = gold ? [[0, '#FFF6D0'], [0.35, '#FFD27A'], [0.8, '#C8922A'], [1, '#8A5A1A']] : [[0, '#C79BDB'], [0.35, '#8A4FA8'], [0.8, '#4E2268'], [1, '#2E1240']];
    x.fillStyle = RG(x, cx - r * 0.35, cy - r * 0.35, 0, r * 1.25, c); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
    x.strokeStyle = gold ? 'rgba(255,240,190,0.5)' : 'rgba(200,170,230,0.35)'; x.lineWidth = r * 0.1; x.beginPath(); x.arc(cx, cy, r * 0.92, 0.2, 1.6); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.75)'; x.beginPath(); x.ellipse(cx - r * 0.38, cy - r * 0.4, r * 0.2, r * 0.12, -0.7, 0, TAU); x.fill();
  }
  function grapesArt(x, s, gold) {
    const rb = s * 0.1;
    x.fillStyle = '#3FA36B'; x.save(); x.translate(-s * 0.12, -s * 0.42); x.rotate(-0.9); leafShape(x, s * 0.42, s * 0.16, '#3FA36B'); x.restore();
    x.strokeStyle = '#5A3A22'; x.lineWidth = s * 0.03; x.lineCap = 'round'; x.beginPath(); x.moveTo(s * 0.06, -s * 0.62); x.quadraticCurveTo(0, -s * 0.5, -s * 0.01, -s * 0.36); x.stroke();
    x.strokeStyle = '#6FAE5A'; x.lineWidth = s * 0.01; x.beginPath(); for (let a = 0; a < 9; a += 0.25) { const rr = s * 0.08 * (1 - a / 10); const px = s * 0.16 + Math.cos(a) * rr, py = -s * 0.56 + Math.sin(a) * rr; a ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
    const rows = [4, 5, 5, 4, 4, 3, 2, 1], list = [];
    rows.forEach((n, j) => { for (let i = 0; i < n; i++) list.push([(i - (n - 1) / 2) * rb * 1.62 + (H(i + j * 9, 2) - 0.5) * rb * 0.3 + Math.sin(j * 0.9) * rb * 0.25, -s * 0.3 + j * rb * 1.45 + (H(i + j * 9, 3) - 0.5) * rb * 0.3, rb * (0.9 + H(i + j * 9, 4) * 0.2), j]); });
    for (const b of list) { x.fillStyle = 'rgba(30,10,40,0.35)'; x.beginPath(); x.arc(b[0] + rb * 0.1, b[1] + rb * 0.12, b[2], 0, TAU); x.fill(); }
    for (const b of list) berry(x, b[0], b[1], b[2], gold);
  }
  A.grapes = (ctx, o = {}) => {
    const s = o.size || 100, ds = devScale(ctx), b = bucket(s * ds), gold = !!o.gold, t = o.t || 0;
    const spr = S.sprite('grapes|' + b + '|' + gold, b * 1.1, b * 1.4, (x) => { x.translate(b * 0.55, b * 0.72); grapesArt(x, b, gold); });
    const k = s / b;
    if (gold) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = RG(ctx, 0, 0, 0, s * 0.8, [[0, '#FFD27A', 0.35], [1, '#FFD27A', 0]]); ctx.fillRect(-s, -s, 2 * s, 2 * s); ctx.restore(); }
    ctx.drawImage(spr, -0.55 * s, -0.72 * s, spr.width * k, spr.height * k);
    if (gold) for (let i = 0; i < 4; i++) { const tw = Math.pow(E.osc(t, 1.3 + H(i, 5), H(i, 6)), 6); S.sparkle(ctx, (H(i, 7) - 0.5) * s * 0.6, (H(i, 8) - 0.4) * s * 0.7, s * 0.06 * (0.4 + tw), tw, '#FFF6D8', t); }
  };
  function cherriesArt(x, s) {
    x.save(); x.translate(s * 0.02, -s * 0.48); x.rotate(0.9); leafShape(x, s * 0.4, s * 0.14, '#3FA36B'); x.restore();
    x.strokeStyle = '#5A7A2A'; x.lineWidth = s * 0.025; x.lineCap = 'round';
    x.beginPath(); x.moveTo(0, -s * 0.48); x.quadraticCurveTo(-s * 0.18, -s * 0.2, -s * 0.2, s * 0.1); x.moveTo(0, -s * 0.48); x.quadraticCurveTo(s * 0.12, -s * 0.15, s * 0.19, s * 0.16); x.stroke();
    for (const [cx, cy] of [[-s * 0.21, s * 0.27], [s * 0.2, s * 0.33]]) {
      const r = s * 0.19, p = new Path2D(); p.moveTo(cx, cy - r * 0.72); p.bezierCurveTo(cx + r * 0.7, cy - r * 1.15, cx + r * 1.12, cy - r * 0.2, cx + r * 0.8, cy + r * 0.55); p.bezierCurveTo(cx + r * 0.45, cy + r * 1.1, cx - r * 0.45, cy + r * 1.1, cx - r * 0.8, cy + r * 0.55); p.bezierCurveTo(cx - r * 1.12, cy - r * 0.2, cx - r * 0.7, cy - r * 1.15, cx, cy - r * 0.72); p.closePath();
      x.fillStyle = RG(x, cx - r * 0.35, cy - r * 0.35, 0, r * 1.3, [[0, '#FF7A88'], [0.35, '#D7263D'], [0.85, '#8E0F24'], [1, '#5A0614']]); x.fill(p);
      crescent(x, p, -r * 0.1, -r * 0.14, '#3A0410', 0.3);
      x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.ellipse(cx - r * 0.4, cy - r * 0.25, r * 0.13, r * 0.24, 0.4, 0, TAU); x.fill();
    }
  }
  A.cherries = (ctx, o = {}) => {
    const s = o.size || 80, ds = devScale(ctx), b = bucket(s * ds);
    const spr = S.sprite('cherries|' + b, b * 1.0, b * 1.2, (x) => { x.translate(b * 0.5, b * 0.62); cherriesArt(x, b); });
    const k = s / b; ctx.drawImage(spr, -0.5 * s, -0.62 * s, spr.width * k, spr.height * k);
  };

  /* =====================================================================
   * GARDEN RIG
   * ===================================================================== */
  const GPAL = {
    B: {
      sky: [[0, '#FFF3DE'], [864, '#FFD6B8'], [1344, '#F7AE94']], horizon: 1000, sun: [760, 520, 140], sunCol: '#FFF8E8', glow: '#FFD9A0',
      hills: ['#A9DCBD', '#86CBA4', '#5DB58A', '#3A957A'], haze: [0.42, 0.22, 0.06, 0], meadow: ['#3A9A73', '#2F8A6E', '#1F6A58', '#164C42'],
      grassL: '#63C08E', grassD: '#1E6652', fg: '#15524A', path: '#F3D9B1', pathEdge: '#E2BE8E', cloud: '#FFFFFF', cloudSh: '#FFE2D0', rim: '#FFF4D8', tree: '#2F8A6E', treeL: '#6FC596', cyp: '#1F6A58',
    },
    J: {
      sky: [[0, '#2A2148'], [330, '#6B3F72'], [650, '#E58A78'], [880, '#FFC98F'], [1010, '#FFE7B5']], horizon: 1020, sun: [540, 1000, 150], sunCol: '#FFF4D6', glow: '#FFD98A',
      hills: ['#C98A82', '#8A7A76', '#3F7F6E', '#2C5E58'], haze: [0.5, 0.4, 0.14, 0], meadow: ['#35705F', '#2C5E58', '#1F4A47', '#163838'],
      grassL: '#5E9A78', grassD: '#1A403E', fg: '#122C2E', path: '#F2CFA0', pathEdge: '#D2A070', cloud: '#FFC9A8', cloudSh: '#C9708A', rim: '#FFD9A0', tree: '#2C5E58', treeL: '#E0A070', cyp: '#1C4440',
    },
    DUSK: {
      sky: [[0, '#F59E7A'], [864, '#C9708A'], [1344, '#5A3D6E']], horizon: 1000, sun: [760, 520, 140], sunCol: '#FFE2B8', glow: '#FFB37A',
      hills: ['#B07A90', '#8A6688', '#5E4A78', '#4B3A66'], haze: [0.5, 0.32, 0.12, 0], meadow: ['#4B3A66', '#3E3158', '#2A1E2E', '#1E1626'],
      grassL: '#6A5A8A', grassD: '#231A30', fg: '#1A1428', path: '#C9A0A0', pathEdge: '#A07A88', cloud: '#FFC0A0', cloudSh: '#B86A86', rim: '#FFB37A', tree: '#3E3158', treeL: '#9A6A88', cyp: '#2A2240',
    },
  };
  function lerpPal(a, b, k) {
    if (k <= 0) return a; const o = {};
    for (const key in a) {
      const va = a[key], vb = b[key];
      if (typeof va === 'string' || (Array.isArray(va) && typeof va[0] === 'number' && va.length === 3 && key !== 'sun' && key !== 'haze')) o[key] = mx(va, vb, k);
      else if (key === 'sky') o[key] = va.map((s, i) => [lerp(s[0], vb[i][0], k), mx(s[1], vb[i][1], k)]);
      else if (key === 'hills' || key === 'meadow') o[key] = va.map((c, i) => mx(c, vb[i], k));
      else o[key] = va;
    }
    return o;
  }
  const hillY = (x, base, amp, f, sd) => base - amp * (0.6 * Math.sin(x * f + sd) + 0.3 * Math.sin(x * f * 2.3 + sd * 1.7) + 0.12 * Math.sin(x * f * 5.1 + sd * 3.1));
  function skyAt(pal, y) { const st = pal.sky; return ramp(st, y); }
  function puffCloud(ctx, w, pal, seed) {
    const h = w * 0.3, p = new Path2D(), n = 4 + Math.floor(H(1, seed) * 2);
    for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, r = h * (0.55 + 0.45 * Math.sin(f * PI)) * (0.8 + 0.35 * H(i, seed)); p.moveTo(-w / 2 + f * w + r, 0); p.arc(-w / 2 + f * w, -r * 0.55, r, 0, TAU); }
    ctx.save(); ctx.beginPath(); ctx.rect(-w, -h * 3, w * 2, h * 3); ctx.clip();
    ctx.fillStyle = LG(ctx, 0, -h * 1.4, 0, 0, [[0, lt(pal.cloud, 0.3)], [0.6, pal.cloud], [1, pal.cloudSh]]); ctx.fill(p);
    ctx.restore();
  }
  function cypress(ctx, x, y, h, w, col, colL, sunRight) {
    const p = new Path2D(); p.moveTo(x, y); p.bezierCurveTo(x - w * 0.62, y - h * 0.22, x - w * 0.5, y - h * 0.72, x, y - h); p.bezierCurveTo(x + w * 0.5, y - h * 0.72, x + w * 0.62, y - h * 0.22, x, y); p.closePath();
    ctx.fillStyle = css(col); ctx.fill(p);
    ctx.save(); ctx.clip(p); ctx.fillStyle = css(colL, 0.45); ctx.fillRect(sunRight ? x : x - w, y - h, w, h); ctx.restore();
  }
  function roundTree(ctx, x, y, r, col, colL, sunRight) {
    ctx.strokeStyle = css(dk(col, 0.45)); ctx.lineWidth = r * 0.16; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r * 1.2); ctx.stroke();
    const p = new Path2D(); p.arc(x, y - r * 1.55, r, 0, TAU);
    ctx.fillStyle = css(col); ctx.fill(p);
    crescent(ctx, p, (sunRight ? -1 : 1) * r * 0.3, r * 0.22, colL, 0.5);
  }
  A.garden = (ctx, t, o = {}) => {
    const mini = o.palette === 'mini';
    let pal = GPAL[o.palette === 'J' ? 'J' : 'B'];
    if (o.dusk) pal = lerpPal(pal, GPAL.DUSK, clamp(o.dusk));
    const scale = o.scale === undefined ? (mini ? 0.18 : 1) : o.scale, cx = o.cx === undefined ? E.CX : o.cx, cy = o.cy === undefined ? E.CY : o.cy;
    const cam = o.cam || null, hz = pal.horizon, ds = devScale(ctx) * scale;
    const sunX = o.sunX === undefined ? pal.sun[0] : o.sunX, sunY = o.sunY === undefined ? pal.sun[1] : o.sunY, sunR = pal.sun[2];
    const sunRight = sunX > 540;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-540, -960);
    const lay = (p, fn) => {
      if (!cam) { fn(); return; }
      ctx.save(); const z = 1 + ((cam.zoom || 1) - 1) * p, x = 540 + ((cam.x === undefined ? 540 : cam.x) - 540) * p, y = 960 + ((cam.y === undefined ? 960 : cam.y) - 960) * p;
      ctx.translate(540, 960); ctx.scale(z, z); ctx.translate(-x, -y); fn(); ctx.restore();
    };
    const X0 = -900, X1 = 1980;
    // sky
    ctx.fillStyle = LG(ctx, 0, 0, 0, 1920, pal.sky.map((s) => [s[0] / 1920, s[1]])); ctx.fillRect(-2000, -2000, 5080, 5920);
    lay(0.04, () => {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = RG(ctx, sunX, sunY, 0, 820, [[0, pal.glow, 0.6], [0.22, pal.glow, 0.22], [1, pal.glow, 0]]); ctx.fillRect(sunX - 900, sunY - 900, 1800, 1800); ctx.restore();
      if (!mini) S.rays(ctx, sunX, sunY, { n: 9, len: 1300, angle: PI / 2 + (sunX - 540) * -0.0008, spread: 2.4, col: pal.glow, alpha: 0.035, t, width: 0.03 });
      ctx.fillStyle = RG(ctx, sunX, sunY, sunR * 0.85, sunR * 1.6, [[0, pal.sunCol, 0.5], [1, pal.sunCol, 0]]); ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 1.6, 0, TAU); ctx.fill();
      ctx.fillStyle = RG(ctx, sunX - sunR * 0.3, sunY - sunR * 0.3, 0, sunR, [[0, '#FFFFFF'], [0.7, pal.sunCol], [1, mx(pal.sunCol, pal.glow, 0.5)]]); ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, TAU); ctx.fill();
    });
    // clouds
    lay(0.08, () => {
      const nc = mini ? 3 : 5;
      for (let i = 0; i < nc; i++) {
        const w = 220 + H(i, 41) * 260, y = 240 + H(i, 42) * 480, x = ((H(i, 43) * 1600 + t * (6 + H(i, 44) * 8)) % 1900) - 400;
        ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= 0.6 + 0.3 * H(i, 45); puffCloud(ctx, w, pal, i + 3); ctx.restore();
      }
    });
    // hill strata
    const strata = [[hz - 175, 62, 0.0036, 1.3, 0.15], [hz - 110, 52, 0.0052, 4.1, 0.25], [hz - 45, 48, 0.0046, 2.2, 0.45], [hz + 22, 30, 0.0064, 5.7, 0.7]];
    strata.forEach(([base, amp, f, sd, p], li) => lay(p, () => {
      const col = mx(pal.hills[li], skyAt(pal, base), pal.haze[li]);
      const hp = new Path2D(); hp.moveTo(X0, 2100); for (let x = X0; x <= X1; x += 30) hp.lineTo(x, hillY(x, base, amp, f, sd)); hp.lineTo(X1, 2100); hp.closePath();
      ctx.fillStyle = LG(ctx, 0, base - amp, 0, base + 420, [[0, lt(col, 0.1)], [0.3, col], [1, dk(col, 0.18)]]); ctx.fill(hp);
      // crest light (sun side)
      ctx.save(); ctx.clip(hp); ctx.strokeStyle = css(pal.rim, 0.35 - li * 0.05); ctx.lineWidth = 5 - li; ctx.beginPath();
      for (let x = X0; x <= X1; x += 30) { const y = hillY(x, base, amp, f, sd) + 2; x === X0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      if (li === 1) { for (let i = 0; i < 14; i++) { const x = X0 + 100 + H(i, 61) * (X1 - X0 - 200), y = hillY(x, base, amp, f, sd) + 6; cypress(ctx, x, y, 34 + H(i, 62) * 20, 10, mx(col, pal.cyp, 0.35), lt(col, 0.2), sunRight); } }
      if (li === 2 && !mini) {
        for (let i = 0; i < 16; i++) { const x = X0 + 60 + H(i, 71) * (X1 - X0 - 120), y = hillY(x, base, amp, f, sd) + 8 + H(i, 74) * 14; if (H(i, 72) < 0.55) cypress(ctx, x, y, 70 + H(i, 73) * 50, 20, pal.cyp, pal.treeL, sunRight); else roundTree(ctx, x, y, 16 + H(i, 73) * 10, pal.tree, pal.treeL, sunRight); }
      }
      // haze band at the foot of the layer
      if (li < 3) { ctx.fillStyle = LG(ctx, 0, base + 10, 0, base + 120, [[0, skyAt(pal, hz), 0], [1, skyAt(pal, hz), 0.18 + 0.08 * (2 - li)]]); ctx.fillRect(X0, base + 10, X1 - X0, 110); }
    }));
    // meadow, path, grass, flowers
    const info = { horizon: hz, sun: { x: sunX, y: sunY, r: sunR }, rose: { x: 540, y: 820, R: 100 } };
    lay(1, () => {
      const top = hz + 30;
      const mp = new Path2D(); mp.moveTo(X0, 2100); for (let x = X0; x <= X1; x += 40) mp.lineTo(x, top + 14 * Math.sin(x * 0.004 + 1) + 8 * Math.sin(x * 0.011)); mp.lineTo(X1, 2100); mp.closePath();
      ctx.fillStyle = LG(ctx, 0, top, 0, 1920, [[0, pal.meadow[0]], [0.12, pal.meadow[1]], [0.55, pal.meadow[2]], [1, pal.meadow[3]]]); ctx.fill(mp);
      // sun warmth on the meadow
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = RG(ctx, sunX, top, 0, 700, [[0, pal.glow, 0.7], [1, pal.glow, 0]]); ctx.fillRect(sunX - 700, top - 50, 1400, 800); ctx.restore();
      // path
      const cp = [[560, hz + 34, 4], [630, hz + 75, 22], [480, hz + 170, 56], [640, hz + 330, 116], [430, hz + 570, 210], [560, 1990, 420]];
      const sp = [];
      for (let i = 0; i < cp.length - 1; i++) {
        const p0 = cp[Math.max(0, i - 1)], p1 = cp[i], p2 = cp[i + 1], p3 = cp[Math.min(cp.length - 1, i + 2)];
        for (let k = 0; k < 12; k++) { const u = k / 12, u2 = u * u, u3 = u2 * u; const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3); sp.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])]); }
      }
      sp.push(cp[cp.length - 1]);
      const pl = [], pr = [];
      for (let i = 0; i < sp.length; i++) { const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = sp[i][2] / 2; pl.push([sp[i][0] + nx * w, sp[i][1] + ny * w]); pr.push([sp[i][0] - nx * w, sp[i][1] - ny * w]); }
      const pp = new Path2D(); pp.moveTo(pl[0][0], pl[0][1]); for (const q of pl) pp.lineTo(q[0], q[1]); for (let i = pr.length - 1; i >= 0; i--) pp.lineTo(pr[i][0], pr[i][1]); pp.closePath();
      ctx.fillStyle = LG(ctx, 0, hz, 0, 1920, [[0, lt(pal.path, 0.15)], [0.22, pal.path], [0.55, mx(pal.path, pal.meadow[2], 0.3)], [1, mx(pal.path, pal.meadow[3], 0.62)]]); ctx.fill(pp);
      ctx.save(); ctx.clip(pp);
      ctx.strokeStyle = css(pal.pathEdge); ctx.lineJoin = 'round';
      for (const [side, a] of [[pl, 0.9], [pr, 0.45]]) { ctx.lineWidth = 14; ctx.globalAlpha = a; ctx.beginPath(); side.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.fillStyle = css(pal.pathEdge, 0.55);
      for (let i = 0; i < (mini ? 10 : 34); i++) { const k = Math.floor(H(i, 81) * (sp.length - 2)) + 1, q = sp[k], off = (H(i, 82) - 0.5) * q[2] * 0.8, sz = 1 + q[2] * 0.025; ctx.beginPath(); ctx.ellipse(q[0] + off, q[1], sz * 1.6, sz * 0.8, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
      const pathX = (y) => { for (let i = 1; i < sp.length; i++) if (sp[i][1] >= y) { const a = sp[i - 1], b = sp[i], f = (y - a[1]) / Math.max(1e-6, b[1] - a[1]); return [a[0] + (b[0] - a[0]) * f, a[2] + (b[2] - a[2]) * f]; } return [560, 600]; };
      // grass
      const ng = mini ? 120 : 520, bands = [[], [], []];
      for (let i = 0; i < ng; i++) {
        const v = H(i, 91), y = top + 10 + Math.pow(v, 0.8) * (1920 - top), d = (y - top) / (1920 - top), x = X0 + H(i, 92) * (X1 - X0);
        const [px, pw] = pathX(y); if (Math.abs(x - px) < pw * 0.42) continue;
        bands[d < 0.25 ? 0 : d < 0.6 ? 1 : 2].push([x, y, d, i]);
      }
      bands.forEach((b, bi) => {
        for (const [col, al] of [[pal.grassD, 0.55], [pal.grassL, 0.45]]) {
          ctx.strokeStyle = css(col, al); ctx.lineWidth = [1.6, 2.6, 4.2][bi]; ctx.lineCap = 'round'; ctx.beginPath();
          for (const [x, y, d, i] of b) { if ((i % 2 === 0) !== (col === pal.grassD)) continue; const h = 8 + d * 46, lean = Math.sin(t * 1.3 + x * 0.01) * h * 0.18 + (H(i, 93) - 0.5) * h * 0.5; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h); }
          ctx.stroke();
        }
      });
      // rose (mini/jar) behind front flowers
      const drawRose = o.rose === undefined ? mini : o.rose;
      // flowers
      const nf = o.flowers === undefined ? (mini ? 70 : 180) : o.flowers, span = o.span || [-120, 1200];
      const wave = o.wave === undefined ? Infinity : o.wave, TYPES = ['tulip', 'daisy', 'lavender', 'tulip', 'carnation', 'daisy', 'hyacinth', 'lily', 'tulip', 'daisy'];
      const fl = [];
      for (let i = 0; i < nf; i++) {
        const v = H(i, 101), y = top + 18 + Math.pow(v, 1.35) * (1540 - top), d = (y - top) / (1540 - top);
        let x = span[0] + H(i, 102) * (span[1] - span[0]);
        const [px, pw] = pathX(y); if (Math.abs(x - px) < pw * 0.62 + 10) x = px + Math.sign(x - px || 1) * (pw * 0.62 + 10 + H(i, 103) * 60);
        fl.push([x, y, d, i]);
      }
      fl.sort((a, b) => a[1] - b[1]);
      let roseDrawn = false;
      for (const [x, y, d, i] of fl) {
        if (drawRose && !roseDrawn && y > 1150) { roseDrawn = true; gardenRose(ctx, t, o); }
        const delay = (Math.hypot(x - sunX, y - sunY) / 1400) * 0.9, pop = clamp((wave - delay) / 0.5);
        if (pop <= 0) continue;
        const size = lerp(9, 52, d) * (0.85 + 0.3 * H(i, 104)), type = TYPES[Math.floor(H(i, 105) * TYPES.length)];
        let bw = typeof o.bow === 'function' ? o.bow(x, y) : o.bow || 0;
        const rot = 0.05 * Math.sin(1.3 * t + x * 0.01) + bw * 0.21 * Math.sign(sunX - x);
        A.drawFlower(ctx, type, x, y, size, { pop, rot, palette: o.palette === 'J' ? 'J' : 'B' });
      }
      if (drawRose && !roseDrawn) gardenRose(ctx, t, o);
    });
    // foreground leaves (blurred L5) — pre-blurred half-res sprite, drawn with parallax 1.9 + gentle sway
    if (!mini && o.fg !== false) {
      const bl = Math.round(6 * (o.blur === undefined ? 1 : o.blur)), fgc = css(pal.fg);
      const spr = S.sprite(`gfg|${fgc}|${bl}`, 860, 420, (x) => {
        const tmp = E.canvas(860, 420), l = tmp.x;
        l.setTransform(0.5, 0, 0, 0.5, 150, -650);
        const leaves = [[-40, 1960, -0.55, 520, 120], [120, 1990, -0.25, 420, 100], [260, 2010, 0.1, 300, 80], [1120, 1960, 0.6, 540, 125], [960, 2000, 0.3, 400, 100], [820, 2020, -0.05, 280, 78], [560, 2060, 0.02, 220, 70]];
        leaves.forEach(([lx, ly, a2, len, w]) => {
          l.save(); l.translate(lx, ly); l.rotate(a2);
          const pth = S.petalPath(-len, w, 0.7);
          l.fillStyle = LG(l, -w, 0, w, 0, [[0, lt(pal.fg, 0.12)], [0.5, pal.fg], [1, dk(pal.fg, 0.35)]]); l.fill(pth);
          l.strokeStyle = css(lt(pal.fg, 0.25), 0.6); l.lineWidth = 5; l.beginPath(); l.moveTo(0, 0); l.quadraticCurveTo(w * 0.05, -len * 0.5, 0, -len * 0.92); l.stroke();
          l.restore();
        });
        x.filter = `blur(${(bl / 2).toFixed(1)}px)`; x.drawImage(tmp.c, 0, 0); x.filter = 'none';
      });
      lay(1.9, () => { ctx.drawImage(spr, -300 + Math.sin(t * 0.9) * 6, 1300 + Math.sin(t * 1.1 + 1) * 4, 1720, 840); });
    }
    ctx.restore();
    return info;
  };
  function gardenRose(ctx, t, o) {
    ctx.save(); ctx.translate(540, 1150);
    const tip = A.stem(ctx, { len: 330, t, leaves: 2, thorns: 4, width: 9 });
    E.at(ctx, tip.x, tip.y, 1, tip.angle, () => A.heroRose(ctx, { R: 100, bloom: o.roseBloom === undefined ? 1 : o.roseBloom, t }));
    ctx.restore();
  }

  /* =====================================================================
   * DEBUG SHOWCASES (never in the film)
   * ===================================================================== */
  E.scene({
    id: 'X_flora', t0: 9000, t1: 9010, post: { bloom: 0.22, vignette: 0.12, grain: 0.02 },
    draw(ctx, T) {
      const t = T - 9000;
      ctx.fillStyle = LG(ctx, 0, 0, 0, E.H, [[0, '#5B6A80'], [0.5, '#46546A'], [1, '#2E3A4E']]); ctx.fillRect(0, 0, E.W, E.H);
      S.light(ctx, 320, 330, 520, '#FFD9C0', 0.18, 'screen');
      E.at(ctx, 300, 360, 1, 0, () => A.heroRose(ctx, { R: 200, bloom: 1, t }));
      E.at(ctx, 680, 250, 1, 0, () => A.heroRose(ctx, { R: 85, bloom: 0, t }));
      E.at(ctx, 680, 470, 1, 0, () => A.heroRose(ctx, { R: 85, bloom: 0.5, t }));
      E.at(ctx, 945, 250, 1, 0, () => A.heroRose(ctx, { R: 80, bloom: 1, t, variant: 'outline' }));
      E.at(ctx, 900, 470, 1, 0, () => {
        const sil = A.heroRoseSilhouette(70, 1);
        A.heroRose(ctx, { R: 70, bloom: 1, t: 0 });
        ctx.strokeStyle = 'rgba(160,255,240,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); sil.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = '#FFD27A'; ctx.beginPath(); ctx.arc(sil[0][0], sil[0][1], 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#6FF0FF'; ctx.beginPath(); ctx.arc(sil[10][0], sil[10][1], 3, 0, TAU); ctx.fill();
      });
      E.at(ctx, 1010, 560, 1, 0, () => A.heroRose(ctx, { R: 30, bloom: 1, t, variant: 'mini' }));
      // row 2
      E.at(ctx, 400, 1010, 1, 0, () => { const tip = A.stem(ctx, { len: 230, t, wilt: 0.8, width: 7 }); E.at(ctx, tip.x, tip.y, 1, tip.angle, () => A.heroRose(ctx, { R: 85, bloom: 1, wilt: 0.8, t })); });
      E.at(ctx, 170, 800, 1, 0, () => A.heroRose(ctx, { R: 95, bloom: 1, t, detach: 0.3 + 0.1 * t, detachDist: 3 }));
      E.at(ctx, 680, 790, 1, 0, () => A.heroRose(ctx, { R: 100, bloom: 1, t, variant: 'gem' }));
      E.at(ctx, 945, 790, 1, 0, () => A.heroRose(ctx, { R: 90, bloom: 1, t, variant: 'paradise' }));
      // flowers
      ['tulip', 'carnation', 'lily', 'lavender', 'daisy', 'hyacinth'].forEach((ty, i) => {
        E.at(ctx, 90 + i * 180, 1265, 1, 0, () => A.flowerSet(ctx, { type: ty, size: 56, t, phase: i }));
        A.drawFlower(ctx, ty, 40 + i * 180, 1290, 22, { pop: 0.25 + 0.15 * i });
      });
      ['swallowtail', 'sapphire', 'monarch', 'pearl'].forEach((p, i) => E.at(ctx, 110 + i * 215, 1410, 1, 0, () => A.butterfly(ctx, { size: 62, t, pattern: p, phase: i * 0.7 })));
      E.at(ctx, 975, 1410, 1, 0, () => A.butterfly(ctx, { size: 58, t, pattern: 'sapphire', gem: true, flap: 0.9 }));
      E.at(ctx, 150, 1860, 1, 0, () => A.hoopoe(ctx, { size: 95, t, fan: E.osc(t, 4), branch: true }));
      E.at(ctx, 360, 1620, 1, 0, () => A.pomegranate(ctx, { r: 52, t }));
      E.at(ctx, 360, 1810, 1, 0, () => A.pomegranate(ctx, { r: 58, cut: true, t }));
      E.at(ctx, 500, 1630, 1, 0, () => A.pomegranate(ctx, { r: 46, gem: true, t }));
      E.at(ctx, 490, 1800, 1, 0, () => A.cherries(ctx, { size: 90 }));
      E.at(ctx, 595, 1905, 1, 0.12, () => A.peacockFeather(ctx, { len: 330, t }));
      E.at(ctx, 720, 1600, 1, 0, () => A.snowflake(ctx, { r: 56, t }));
      E.at(ctx, 720, 1790, 1, 0, () => A.snowflake(ctx, { r: 56, t, melt: 0.55 }));
      E.at(ctx, 850, 1620, 1, 0, () => A.nautilus(ctx, { r: 62 }));
      E.at(ctx, 850, 1800, 1, 0, () => A.bee(ctx, { size: 64, t }));
      E.at(ctx, 985, 1625, 1, 0, () => A.grapes(ctx, { size: 130 }));
      E.at(ctx, 985, 1820, 1, 0, () => A.grapes(ctx, { size: 120, gold: true, t }));
    },
  });
  E.scene({
    id: 'X_flora_garden', t0: 9100, t1: 9110, post: { bloom: 0.35, vignette: 0.28, grain: 0.04 },
    draw(ctx, T) {
      const t = T - 9100;
      if (t < 3.33) A.garden(ctx, T, { palette: 'B', wave: 0.6 + t * 0.9 });
      else if (t < 6.66) A.garden(ctx, T, { palette: 'J', bow: E.osc(t, 3) });
      else {
        ctx.fillStyle = LG(ctx, 0, 0, 0, E.H, [[0, '#2A2040'], [1, '#141024']]); ctx.fillRect(0, 0, E.W, E.H);
        for (const [x, y, sc, w, h] of [[300, 520, 0.18, 200, 340], [640, 1180, 0.42, 470, 800]]) {
          ctx.save(); const p = new Path2D(); p.roundRect(x - w / 2, y - h / 2, w, h, [w / 2, w / 2, 12, 12]); ctx.clip(p);
          A.garden(ctx, T, { palette: 'mini', scale: sc, cx: x, cy: y, wave: (t - 6.66) * 1.2 });
          ctx.restore(); ctx.strokeStyle = 'rgba(200,235,255,0.6)'; ctx.lineWidth = 3; ctx.stroke(p);
        }
      }
    },
  });
})();
