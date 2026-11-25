/* The man: a simple, featureless but correctly proportioned adult male (≈7.5 heads), knee-length coat,
   trousers, shoes, short hair. Side (profile), front and back views, posable, with a walk cycle.
   Drawn opaque on the paint layer with a soft watercolour shadow glaze, plus a clean pencil silhouette.

   Usage: E.man.draw(L, { x, y, h, facing, view, pose, alpha, tint, tintAmt, desat, outline })
     x,y   ground point between the feet (y = ground line)
     h     total height in px
     facing 1 = right, -1 = left (side view)
     view  'side' | 'front' | 'back'
     pose  object from E.man.pose.*  (side poses for side view, front poses for front/back)
   Angles (side): radians, 0 = limb hanging straight down, positive = swung forward (toward facing).
   Elbow (+) bends the forearm forward/up; knee (+) bends the shin backward.
     lean (torso, + forward), head (+ chin down), nS/fS shoulder, nE/fE elbow, nW/fW wrist, nH/fH hip,
     nK/fK knee, nF/fF foot (+ toe up), hipDrop, coatSwing, float (no grounding).
   Angles (front/back): lS/rS shoulder abduction (+ outward/up), lE/rE elbow (+ forearm inward/up),
     lFs/rFs (lFsU/rFsU) fore-/upper-arm foreshortening, lH/rH leg abduction, lK/rK knee, tilt, headTilt,
     lFront/rFront (forearm crosses in front of the body; in back view such an arm is hidden behind it).

   Anatomy guards: every pose is passed through soft joint limits (identity inside the normal range, smooth
   saturation outside), so no elbow/knee can bend backwards and no joint can reach an impossible angle.
   Every body part is one clean silhouette (union of convex pieces, wound the same way), so no inner seams;
   the coat skirt is the convex hull of the waist and the thighs, so the hem can never tear or self-intersect.
   A figure drawn with alpha < 1 is rendered as one group (offscreen) so overlapping parts never show through
   each other. Skeleton geometry and grounding are unchanged (scenes replicate them for IK / contact points). */
(function () {
  const E = window.E;

  const C = {
    coat: E.P.coat, coatShadow: E.P.coatShadow, trousers: E.P.trousers, shoes: E.P.shoes,
    skin: E.P.skin, skinShadow: E.P.skinShadow, hair: E.P.hair, collar: '#E9E2D2',
  };

  // proportions (fractions of total height)
  const R = {
    hipY: 0.515, torso: 0.300, neck: 0.035, headH: 0.128, headW: 0.098,
    upper: 0.180, fore: 0.150, hand: 0.072,
    thigh: 0.240, shin: 0.235, ankle: 0.040, foot: 0.128, heel: 0.03,
    shoulderW: 0.255, hipW: 0.15,
    coatHem: 0.405,
  };

  // ---------- small geometry helpers ----------
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const dirOf = (a) => [Math.sin(a), Math.cos(a)]; // angle from straight down, + toward +x
  const add = (p, d, l) => [p[0] + d[0] * l, p[1] + d[1] * l];
  const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  const mixP = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  // ---------- polygons (every piece is wound clockwise on screen, so a Path2D of pieces fills as their union) ----
  const area2 = (pts) => { let s = 0; for (let i = 0, n = pts.length; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; } return s; };
  const cw = (pts) => (area2(pts) < 0 ? pts.slice().reverse() : pts);

  /** tapered capsule around segment a-b (radius r0 at a, r1 at b) as a clockwise polygon */
  function capsulePts(a, b, r0, r1, n = 12) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    const out = [];
    if (L < 1e-6 || L <= Math.abs(r0 - r1) + 1e-6) {
      const r = Math.max(r0, r1), c = r0 >= r1 ? a : b;
      for (let i = 0; i < 2 * n; i++) { const t = (i / (2 * n)) * TAU; out.push([c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r]); }
      return out;
    }
    const th = Math.atan2(dy, dx), ph = Math.asin(clamp((r0 - r1) / L, -1, 1));
    const a1 = th + PI / 2 + ph, a2 = th + 1.5 * PI - ph;
    for (let i = 0; i <= n; i++) { const t = a1 + ((a2 - a1) * i) / n; out.push([a[0] + Math.cos(t) * r0, a[1] + Math.sin(t) * r0]); }
    const b1 = th - PI / 2 - ph, b2 = th + PI / 2 + ph;
    for (let i = 0; i <= n; i++) { const t = b1 + ((b2 - b1) * i) / n; out.push([b[0] + Math.cos(t) * r1, b[1] + Math.sin(t) * r1]); }
    return out;
  }
  /** quad from a to b with half widths w0 / w1 (straight ends) */
  function quadPts(a, b, w0, w1) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    return cw([[a[0] + nx * w0, a[1] + ny * w0], [b[0] + nx * w1, b[1] + ny * w1], [b[0] - nx * w1, b[1] - ny * w1], [a[0] - nx * w0, a[1] - ny * w0]]);
  }
  function hull(points) {
    const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    lo.pop(); up.pop();
    return cw(lo.concat(up));
  }
  /** convex hull with filleted corners (each corner replaced by an arc of radius ≤ r tangent to both edges, so the
      outline never grows past the hull). A point entering the hull at a straight edge adds a zero-angle fillet:
      the outline changes continuously (no pops). */
  function roundHull(points, r, step = 0.2) {
    const H = hull(points), n = H.length;
    if (n < 3) return H;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = H[(i - 1 + n) % n], b = H[i], c = H[(i + 1) % n];
      const la = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1e-9, lc = Math.hypot(c[0] - b[0], c[1] - b[1]) || 1e-9;
      const u1 = [(a[0] - b[0]) / la, (a[1] - b[1]) / la], u2 = [(c[0] - b[0]) / lc, (c[1] - b[1]) / lc];
      const phi = Math.acos(clamp(u1[0] * u2[0] + u1[1] * u2[1], -1, 1));
      const tanH = Math.tan(phi / 2);
      if (tanH > 50 || phi < 1e-3) { out.push(b); continue; }
      let t = r / tanH;
      t = Math.min(t, 0.45 * la, 0.45 * lc);
      const rr = t * tanH;
      const p1 = add(b, u1, t), p2 = add(b, u2, t);
      const bis = [u1[0] + u2[0], u1[1] + u2[1]], bl = Math.hypot(bis[0], bis[1]) || 1;
      const cc = add(b, [bis[0] / bl, bis[1] / bl], rr / Math.sin(phi / 2));
      let a0 = Math.atan2(p1[1] - cc[1], p1[0] - cc[0]), a1 = Math.atan2(p2[1] - cc[1], p2[0] - cc[0]);
      while (a1 < a0) a1 += TAU;
      if (a1 - a0 > PI) a1 -= TAU;
      const k = Math.max(1, Math.ceil(Math.abs(a1 - a0) / step));
      for (let j = 0; j <= k; j++) { const tt = a0 + ((a1 - a0) * j) / k; out.push([cc[0] + Math.cos(tt) * rr, cc[1] + Math.sin(tt) * rr]); }
    }
    return cw(out);
  }
  /** corner cutting (keeps a convex polygon convex: no loops, no self-intersection) */
  function chaikin(pts, it = 2) {
    let p = pts;
    for (let k = 0; k < it; k++) {
      const q = [];
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      p = q;
    }
    return p;
  }
  function polyPath(polys, path = new Path2D()) {
    for (const pts of polys) {
      if (!pts || pts.length < 3) continue;
      path.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
      path.closePath();
    }
    return path;
  }
  const smoothCW = (pts, tension = 0.5) => E.smoothPath(cw(pts), true, tension);

  // ---------- joint limits ----------
  /** identity inside [lo+m, hi-m]; beyond, it eases smoothly into the hard limit (C1, monotonic) */
  function lim(x, lo, hi, m) {
    const a = lo + m, b = hi - m;
    if (x > b) return b + m * Math.tanh((x - b) / m);
    if (x < a) return a - m * Math.tanh((a - x) / m);
    return x;
  }
  const SIDE_DEF = { lean: 0, head: 0, nS: 0.05, nE: 0.15, fS: -0.05, fE: 0.15, nW: 0, fW: 0, nH: 0.02, nK: 0.04, fH: -0.02, fK: 0.04, nF: 0, fF: 0, hipDrop: 0, coatSwing: 0, hipX: 0 };
  const SIDE_LIM = {
    lean: [-0.9, 2.4, 0.2], head: [-0.85, 0.85, 0.15],
    nS: [-1.15, 3.3, 0.25], fS: [-1.15, 3.3, 0.25], nE: [-0.1, 2.75, 0.16], fE: [-0.1, 2.75, 0.16],
    nW: [-1.1, 1.1, 0.2], fW: [-1.1, 1.1, 0.2], nH: [-0.85, 2.5, 0.2], fH: [-0.85, 2.5, 0.2],
    nK: [-0.06, 2.75, 0.12], fK: [-0.06, 2.75, 0.12], nF: [-1.75, 1.0, 0.2], fF: [-1.75, 1.0, 0.2],
    hipDrop: [-0.35, 0.35, 0.05], coatSwing: [-0.03, 0.03, 0.01],
  };
  const FRONT_DEF = { tilt: 0, headTilt: 0, lS: 0.1, rS: 0.1, lE: 0.05, rE: 0.05, lH: 0.04, rH: 0.04, lK: 0, rK: 0, hipDrop: 0, lFs: 1, rFs: 1, lFsU: 1, rFsU: 1 };
  const FRONT_LIM = {
    tilt: [-0.45, 0.45, 0.1], headTilt: [-0.55, 0.55, 0.12], lS: [-0.35, 3.05, 0.2], rS: [-0.35, 3.05, 0.2],
    lE: [-0.5, 2.65, 0.2], rE: [-0.5, 2.65, 0.2], lH: [-0.2, 0.7, 0.1], rH: [-0.2, 0.7, 0.1], lK: [-0.05, 1.3, 0.1], rK: [-0.05, 1.3, 0.1],
    hipDrop: [-0.35, 0.35, 0.05], lFs: [0.4, 1.05, 0.08], rFs: [0.4, 1.05, 0.08], lFsU: [0.5, 1.05, 0.08], rFsU: [0.5, 1.05, 0.08],
  };
  function sanitize(P, DEF, LIM) {
    const o = Object.assign({}, P);
    for (const k in DEF) {
      let v = P[k];
      if (typeof v !== 'number' || !Number.isFinite(v)) v = DEF[k];
      o[k] = LIM[k] ? lim(v, LIM[k][0], LIM[k][1], LIM[k][2]) : v;
    }
    return o;
  }

  // ---------- painting ----------
  // shading: glaze a darker tone over the side away from the light (screen light from upper-left)
  function shadeGlaze(ctx, path, color, cx, cy, ext, facing, amt = 0.5, lx = 0.62, ly = 0.78) {
    const dx = lx * facing, dy = ly;
    ctx.save();
    ctx.clip(path);
    const g = ctx.createLinearGradient(cx - dx * ext, cy - dy * ext, cx + dx * ext, cy + dy * ext);
    g.addColorStop(0, E.rgba(color, 0));
    g.addColorStop(0.5, E.rgba(color, 0));
    g.addColorStop(0.62, E.rgba(color, amt * 0.75));
    g.addColorStop(1, E.rgba(color, amt));
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = g;
    ctx.fillRect(cx - ext * 1.5, cy - ext * 1.5, ext * 3, ext * 3);
    ctx.restore();
  }

  function tintCol(c, o) {
    let col = c;
    if (o.desat) col = E.desat(col, o.desat);
    if (o.tintAmt) col = E.mix(col, o.tint || '#8E8A86', o.tintAmt);
    return col;
  }

  /** part renderer: paint (opaque) + glaze + ink silhouette with occlusion.
      seam: optional { inside: Path2D, cut: Path2D } — ink inside (inside ∩ cut) is erased after stroking
      (hides the round root of a limb where it sits inside the coat) */
  function part(L, path, color, o, bbox, shadowAmt = 0.45, seam = null) {
    const p = L.paint, ink = L.ink;
    const col = tintCol(color, o);
    p.save();
    p.globalCompositeOperation = 'source-over';
    p.fillStyle = col;
    p.fill(path);
    p.restore();
    if (bbox && shadowAmt > 0) shadeGlaze(p, path, E.shade(col, -0.55), bbox[0], bbox[1], bbox[2], o.facingScreen, shadowAmt);
    if (o.outline !== false) {
      const stroke = (clips) => {
        ink.save();
        for (const [cp, rule] of clips) ink.clip(cp, rule);
        ink.strokeStyle = E.P.ink;
        ink.lineJoin = 'round';
        ink.lineCap = 'round';
        ink.globalAlpha *= 0.42 * (o.outlineAlpha ?? 1);
        ink.lineWidth = Math.max(1.6, o.h * 0.0042) * 2;
        ink.stroke(path);
        ink.restore();
      };
      if (!seam) stroke([]);
      else {
        // the stroke everywhere except inside (cut ∩ inside): outside the cut, and inside the cut only off the coat
        const notCut = new Path2D(); notCut.rect(-1e6, -1e6, 2e6, 2e6); notCut.addPath(seam.cut);
        const notIn = new Path2D(); notIn.rect(-1e6, -1e6, 2e6, 2e6); notIn.addPath(seam.inside);
        stroke([[notCut, 'evenodd']]);
        stroke([[seam.cut, 'nonzero'], [notIn, 'evenodd']]);
      }
    }
    ink.save(); ink.globalCompositeOperation = 'destination-out'; ink.fillStyle = '#000'; ink.fill(path); ink.restore();
    // light layer occlusion
    L.light.save(); L.light.globalCompositeOperation = 'destination-out'; L.light.fill(path); L.light.restore();
  }

  // ---------- hands ----------
  // mitten outline in the hand frame: u along the hand from the wrist, v across (+ = thumb side); units of h.
  // Broad (dorsal/palmar) view of a relaxed hand: back of the hand, knuckles, slightly flexed fingers.
  const MITT = [
    [0.000, -0.0158], [0.016, -0.0190], [0.034, -0.0208], [0.052, -0.0204], [0.068, -0.0180], [0.080, -0.0138],
    [0.0885, -0.0080], [0.0925, -0.0015], [0.0915, 0.0050], [0.0860, 0.0100], [0.0760, 0.0132], [0.0620, 0.0146],
    [0.0440, 0.0158], [0.0240, 0.0166], [0.0080, 0.0164], [0.000, 0.0158],
  ];
  /** hand pieces at wrist wr pointing along angle ang (dirOf convention). side: ±1 = which perpendicular the
      thumb is on ((cos a, −sin a)·side). o: wv (width scale; 1 broad, ~0.72 edge-on), thumb 0..1 (visibility),
      spread 0..1 (thumb along the fingers → abducted), len (length scale) */
  function handPieces(wr, ang, side, h, o = {}) {
    const wv = o.wv ?? 1, len = o.len ?? 1, th = clamp(o.thumb ?? 1, 0, 1), sp = clamp(o.spread ?? 0, 0, 1);
    const d = dirOf(ang), t = [Math.cos(ang) * side, -Math.sin(ang) * side];
    const P = (u, v) => [wr[0] + (d[0] * u * len + t[0] * v * wv) * h, wr[1] + (d[1] * u * len + t[1] * v * wv) * h];
    const pieces = [cw(MITT.map(([u, v]) => P(u, v)))];
    if (th > 0.04) {
      const b = P(0.017, 0.0095 - 0.008 * (1 - th));
      const tip0 = P(lerp(0.057, 0.043, sp), lerp(0.0205, 0.036, sp));
      const tip = mixP(b, tip0, th);
      const s = 0.55 + 0.45 * th;
      pieces.push(capsulePts(b, tip, 0.0102 * h * s, 0.0071 * h * s, 8));
    }
    return { pieces, centre: P(0.042, 0.002) };
  }

  // ---------- SIDE VIEW ----------
  function sideSkeleton(h, P) {
    const hip = [P.hipX * h || 0, -(R.hipY * h) + (P.hipDrop || 0) * h];
    const torsoDir = dirOf(Math.PI - (P.lean || 0)); // upward, leaning forward with + lean
    const neckBase = add(hip, torsoDir, R.torso * h);
    const shoulder = add(neckBase, rot([-0.012 * h, 0.03 * h], P.lean || 0), 1);
    const headDir = dirOf(Math.PI - (P.lean || 0) - (P.head || 0));
    const headC = add(add(neckBase, headDir, R.neck * h + R.headH * h * 0.5), rot([0.012 * h, 0], (P.lean || 0) + (P.head || 0)), 1);
    const limb = (root, a1, bend, l1, l2, sign) => {
      const j = add(root, dirOf(a1), l1);
      const a2 = a1 + sign * bend;
      const e = add(j, dirOf(a2), l2);
      return { j, e, a1, a2 };
    };
    const arm = (s, e) => limb(shoulder, s, e, R.upper * h, R.fore * h, +1);
    const leg = (hp, k) => limb(hip, hp, k, R.thigh * h, R.shin * h, -1);
    return {
      hip, neckBase, shoulder, headC,
      nArm: arm(P.nS ?? 0.05, P.nE ?? 0.15), fArm: arm(P.fS ?? -0.05, P.fE ?? 0.15),
      nLeg: leg(P.nH ?? 0.02, P.nK ?? 0.04), fLeg: leg(P.fH ?? -0.02, P.fK ?? 0.04),
    };
  }

  /** shoe outline (local frame: ankle at origin, sole along +x; ang rotates the shoe, + toe up).
      The sole is flat from the heel corner (−heel, 0.035h) to the ball of the foot, matching the grounding. */
  function footPath(h, ankle, ang) {
    const L = R.foot * h, hb = R.heel * h;
    const pts = [
      [-hb * 0.78, -0.03 * h], [-hb * 0.98, -0.012 * h], [-hb * 1.0, 0.012 * h], [-hb * 0.93, 0.03 * h], [-hb * 0.55, 0.035 * h],
      [L * 0.2, 0.035 * h], [L * 0.55, 0.035 * h], [L * 0.83, 0.0338 * h], [L * 0.96, 0.028 * h], [L * 1.0, 0.017 * h],
      [L * 0.965, 0.0065 * h], [L * 0.84, -0.0025 * h], [L * 0.62, -0.0115 * h], [L * 0.36, -0.0245 * h], [L * 0.13, -0.034 * h], [-hb * 0.2, -0.036 * h],
    ].map((p) => { const q = rot(p, -ang); return [ankle[0] + q[0], ankle[1] + q[1]]; });
    return smoothCW(pts, 0.42);
  }

  function drawSide(L, h, P, o) {
    const S = sideSkeleton(h, P);
    const darker = (c) => E.shade(c, -0.28);

    // ground the figure: lowest foot point sits on y=0 (formula replicated by scenes: keep)
    const footY = (leg, fa) => {
      const ankle = leg.e;
      const q1 = rot([R.foot * h, 0.035 * h], -fa), q2 = rot([-R.heel * h, 0.035 * h], -fa);
      return Math.max(ankle[1] + q1[1], ankle[1] + q2[1]);
    };
    const wTh0 = 0.048 * h, wTh1 = 0.035 * h;
    const nFA = P.nF ?? 0, fFA = P.fF ?? 0;
    const low = Math.max(footY(S.nLeg, nFA), footY(S.fLeg, fFA), S.nLeg.j[1] + wTh1, S.fLeg.j[1] + wTh1, S.hip[1] + 0.05 * h);
    const dy = P.float ? 0 : -low;
    E.save(L);
    E.translate(L, 0, dy);

    const lean = P.lean || 0;
    const T = (x, y) => { const q = rot([x * h, -y * h], lean); return [S.hip[0] + q[0], S.hip[1] + q[1]]; };

    // upper torso (shoulders to just below the hip), in the torso frame
    const torsoUp = smoothCW([
      T(-0.048, 0.296), T(-0.062, 0.25), T(-0.058, 0.17), T(-0.05, 0.1), T(-0.058, 0.02), T(-0.061, -0.03),
      T(0.054, -0.03), T(0.054, 0.02), T(0.058, 0.12), T(0.07, 0.2), T(0.06, 0.265), T(0.03, 0.302), T(-0.02, 0.31),
    ], 0.5);

    // ---- arms
    const drawArm = (arm, near, seamInside) => {
      const sh = S.shoulder, el = arm.j, wr = arm.e;
      const fd = dirOf(arm.a2);
      const sleeve = polyPath([
        capsulePts(sh, el, 0.031 * h, 0.0255 * h),
        capsulePts(el, add(wr, fd, -0.004 * h), 0.0246 * h, 0.0205 * h),
      ]);
      const col = near ? C.coat : darker(C.coat);
      const cx = (sh[0] + wr[0]) / 2, cy = (sh[1] + wr[1]) / 2;
      let seam = null;
      if (seamInside) { const cut = new Path2D(); cut.arc(sh[0], sh[1], 0.05 * h, 0, TAU); seam = { inside: seamInside, cut }; }
      part(L, sleeve, col, o, [cx, cy, h * 0.18], 0.4, seam);
      // hand: broad view, thumb on the front (toward the face of the forearm)
      const ha = arm.a2 + (near ? P.nW || 0 : P.fW || 0);
      const hp = handPieces(add(wr, fd, -0.002 * h), ha, 1, h, { wv: 1, thumb: 1, spread: 0.08 });
      part(L, polyPath(hp.pieces), near ? C.skin : darker(C.skin), o, [hp.centre[0], hp.centre[1], 0.05 * h], 0.35);
      // cuff (straight-ended band over the wrist)
      const cuff = polyPath([chaikin(quadPts(add(wr, fd, -0.017 * h), add(wr, fd, 0.003 * h), 0.0222 * h, 0.0222 * h), 1)]);
      part(L, cuff, near ? E.shade(C.coat, -0.2) : darker(E.shade(C.coat, -0.2)), o, null, 0);
    };

    // ---- legs (shoe first, the trouser hem falls over it)
    const drawLeg = (leg, fa, near) => {
      const shoe = footPath(h, leg.e, fa);
      part(L, shoe, near ? C.shoes : darker(C.shoes), o, [leg.e[0] + 0.04 * h, leg.e[1], h * 0.08], 0.3);
      const sd = dirOf(leg.a2);
      const hemTop = add(leg.e, sd, -0.016 * h), hemBot = add(leg.e, sd, 0.006 * h);
      const trousers = polyPath([
        capsulePts(S.hip, leg.j, wTh0, 0.0362 * h),
        capsulePts(leg.j, hemTop, 0.0345 * h, 0.0272 * h),
        quadPts(hemTop, hemBot, 0.0272 * h, 0.0282 * h),
      ]);
      const col = near ? C.trousers : darker(C.trousers);
      part(L, trousers, col, o, [(S.hip[0] + leg.e[0]) / 2, (S.hip[1] + leg.e[1]) / 2, h * 0.26], 0.38);
    };

    drawArm(S.fArm, false, null);
    drawLeg(S.fLeg, fFA, false);
    drawLeg(S.nLeg, nFA, true);

    // ---- coat: upper torso ∪ skirt. The skirt is the convex hull of the waist, a hanging hem and the top of
    // each thigh, so it follows the legs (walk, kneel, sit) and can never tear or self-intersect.
    const lh = lean * 0.55; // the skirt hangs partly with gravity
    const Th = (x, y) => { const q = rot([x * h, -y * h], lh); return [S.hip[0] + q[0], S.hip[1] + q[1]]; };
    const swing = P.coatSwing || 0;
    const hemY = -(R.hipY - R.coatHem);
    const skirtPts = [T(-0.058, 0.02), T(0.054, 0.02), T(-0.061, -0.03), T(0.054, -0.03),
      Th(-0.066 - swing, hemY), Th(-0.03 - swing * 0.8, hemY - 0.004), Th(0.02 - swing * 0.6, hemY - 0.003), Th(0.052 - swing * 0.5, hemY + 0.004)];
    let frontHem = Th(0.052 - swing * 0.5, hemY + 0.004);
    const fwd = rot([1, 0], lean);
    for (const leg of [S.nLeg, S.fLeg]) {
      const a = leg.a1, d = dirOf(a), n = [Math.cos(a), -Math.sin(a)];
      const Lc = 0.112 * h, r = 0.05 * h;
      const pf = add(add(S.hip, d, Lc), n, r), pb = add(add(S.hip, d, Lc), n, -r);
      skirtPts.push(pf, pb, add(add(S.hip, d, 0.06 * h), n, 0.056 * h), add(add(S.hip, d, 0.06 * h), n, -0.056 * h));
      if ((pf[0] - S.hip[0]) * fwd[0] + (pf[1] - S.hip[1]) * fwd[1] > (frontHem[0] - S.hip[0]) * fwd[0] + (frontHem[1] - S.hip[1]) * fwd[1]) frontHem = pf;
    }
    const skirt = roundHull(skirtPts, 0.016 * h);
    const coat = new Path2D();
    coat.addPath(torsoUp);
    polyPath([skirt], coat);
    part(L, coat, C.coat, o, [T(0, 0.12)[0], T(0, 0.12)[1], h * 0.22], 0.42);
    // collar hint + front opening + belt (pencil)
    if (o.outline !== false) {
      const fh = mixP(frontHem, S.hip, 0.07);
      const op = [T(0.045, 0.27), T(0.05, 0.16), T(0.052, 0.03), mixP(T(0.052, 0.03), fh, 0.55), fh];
      E.pencil(L.ink, op, { w: Math.max(1.2, h * 0.0028), a: 0.3, double: false });
      const belt = [T(-0.052, 0.03), T(0.052, 0.035)];
      E.pencil(L.ink, belt, { w: Math.max(1.0, h * 0.0024), a: 0.18, double: false });
    }

    // ---- neck
    const nb = S.neckBase, hb = add(S.headC, dirOf(Math.PI - lean - (P.head || 0)), -R.headH * h * 0.35);
    const neck = polyPath([capsulePts(add(nb, [0, 1], 0.012 * h), hb, 0.0235 * h, 0.0205 * h)]);
    part(L, neck, C.skin, o, [nb[0], nb[1], 0.04 * h], 0.4);
    // collar band
    const collar = polyPath([capsulePts(T(-0.037, 0.295), T(0.03, 0.303), 0.0125 * h, 0.0125 * h)]);
    part(L, collar, E.shade(C.coat, -0.15), o, null, 0);

    // ---- head
    const ha = lean + (P.head || 0);
    const hc = S.headC;
    const H2 = (x, y) => { const q = rot([x * h, y * h], ha); return [hc[0] + q[0], hc[1] + q[1]]; };
    const head = smoothCW([
      H2(-0.047, -0.01), H2(-0.044, -0.042), H2(-0.025, -0.062), H2(0.005, -0.066), H2(0.033, -0.056),
      H2(0.047, -0.03), H2(0.049, -0.006), H2(0.056, 0.004), H2(0.05, 0.012), H2(0.047, 0.026), H2(0.043, 0.044),
      H2(0.032, 0.058), H2(0.012, 0.064), H2(-0.012, 0.052), H2(-0.03, 0.035), H2(-0.044, 0.02),
    ], 0.5);
    part(L, head, C.skin, o, [hc[0], hc[1], 0.07 * h], 0.38);
    // ear
    const ec = H2(-0.006, 0.006);
    const ear = E.blob(ec[0], ec[1], 0.012 * h, { rx: 0.0105 * h, ry: 0.016 * h, irr: 0.02, rot: ha, seed: 3 });
    part(L, ear, E.shade(C.skin, -0.12), { ...o, outlineAlpha: 0.55 }, null, 0);
    // hair cap (top + back), short
    const hair = smoothCW([
      H2(-0.05, 0.012), H2(-0.051, -0.03), H2(-0.034, -0.062), H2(-0.004, -0.073), H2(0.028, -0.066),
      H2(0.046, -0.044), H2(0.044, -0.032), H2(0.022, -0.042), H2(0.0, -0.036), H2(-0.012, -0.02),
      H2(-0.016, 0.0), H2(-0.024, 0.018), H2(-0.04, 0.03),
    ], 0.5);
    part(L, hair, C.hair, o, [hc[0], hc[1], 0.07 * h], 0.3);

    // ---- near arm (over everything); its round shoulder root inside the coat leaves no ink seam
    drawArm(S.nArm, true, torsoUp);
    E.restore(L);
    return S;
  }

  // ---------- FRONT / BACK VIEW ----------
  function drawFront(L, h, P, o, back) {
    const lean = P.tilt || 0;
    const hipY = -R.hipY * h + (P.hipDrop || 0) * h;
    const T = (x, y) => { const q = rot([x * h, -y * h], lean); return [q[0], hipY + q[1]]; };
    const sh = R.shoulderW / 2;
    const lSh = T(-sh + 0.034, 0.268), rSh = T(sh - 0.034, 0.268);
    const lHip = T(-0.048, 0.0), rHip = T(0.048, 0.0);

    // legs (abduction angle: + = outward), knee bend shortens visually (foreshortening)
    const leg = (hp, side, ab, kb) => {
      const a = side * ab;
      const thighL = R.thigh * h * (1 - 0.25 * Math.abs(kb));
      const j = add(hp, dirOf(a), thighL);
      const a2 = a - side * kb * 0.2;
      const e = add(j, dirOf(a2), R.shin * h);
      return { j, e, a, a2 };
    };
    const ll = leg(lHip, -1, P.lH ?? 0.04, P.lK ?? 0), rl = leg(rHip, 1, P.rH ?? 0.04, P.rK ?? 0);
    const low = Math.max(ll.e[1], rl.e[1]) + R.ankle * h;
    const dy = P.float ? 0 : -low;
    E.save(L);
    E.translate(L, 0, dy);

    // arms: shoulder angle (abduction + outward), elbow (+ bends forearm inward/up), fs foreshortening of forearm
    const arm = (s, side, ab, el, fsU, fsF) => {
      const a1 = side * ab;
      const j = add(s, dirOf(a1), R.upper * h * (fsU ?? 1));
      const a2 = a1 - side * el;
      const e = add(j, dirOf(a2), R.fore * h * (fsF ?? 1));
      return { j, e, a1, a2, ab, el, side };
    };
    const la = arm(lSh, -1, P.lS ?? 0.1, P.lE ?? 0.05, P.lFsU, P.lFs), ra = arm(rSh, 1, P.rS ?? 0.1, P.rE ?? 0.05, P.rFsU, P.rFs);

    const drawLeg = (lg, side) => {
      // shoe (toe box toward the viewer, slightly turned out); sole 0.04h below the ankle (= the ground line)
      const cx = lg.e[0] + side * 0.006 * h, ay = lg.e[1];
      const sp = [[-0.019, -0.006], [0.019, -0.006], [0.027, 0.012], [0.0305, 0.027], [0.028, 0.0365], [0.018, 0.04], [-0.018, 0.04], [-0.028, 0.0365], [-0.0305, 0.027], [-0.027, 0.012]]
        .map(([x, y]) => [cx + x * h, ay + y * h]);
      part(L, smoothCW(sp, 0.45), C.shoes, o, [cx, ay + 0.02 * h, 0.04 * h], 0.3);
      const sd = dirOf(lg.a2);
      const hemTop = add(lg.e, sd, -0.014 * h), hemBot = add(lg.e, sd, 0.008 * h);
      const path = polyPath([
        capsulePts(side < 0 ? lHip : rHip, lg.j, 0.043 * h, 0.034 * h),
        capsulePts(lg.j, hemTop, 0.033 * h, 0.0265 * h),
        quadPts(hemTop, hemBot, 0.0265 * h, 0.0275 * h),
      ]);
      part(L, path, C.trousers, o, [lg.j[0], lg.j[1], h * 0.25], 0.32);
    };

    const drawArm = (a, s, behind) => {
      const fd = dirOf(a.a2);
      // the sleeve head sits a touch below the joint so the shoulder line rounds into the arm (no pad)
      const sleeve = polyPath([
        capsulePts(add(s, dirOf(a.a1), 0.01 * h), a.j, 0.0295 * h, 0.0252 * h),
        capsulePts(a.j, add(a.e, fd, -0.004 * h), 0.0245 * h, 0.0195 * h),
      ]);
      part(L, sleeve, behind ? E.shade(C.coat, -0.22) : C.coat, o, [a.j[0], a.j[1], h * 0.2], 0.36);
      // hand: hanging → seen edge-on, thumb toward the body; arms opened → palm to the viewer, thumb out/up;
      // forearm across the body → back of the hand, thumb up. Blended continuously (no pops).
      const kOpen = sstep(0.3, 0.75, a.ab), kCross = sstep(0.9, 1.6, a.el);
      const tm = back ? [0, 0] : [-a.side, 0], tl = [a.side * 0.89, -0.45], tu = [0, -1];
      const w0 = (1 - kOpen) * (1 - kCross), w1 = kOpen * (1 - kCross), w2 = kCross;
      const tv = [tm[0] * w0 + tl[0] * w1 + tu[0] * w2, tm[1] * w0 + tl[1] * w1 + tu[1] * w2];
      const ang = a.a2 + (a.side < 0 ? P.lW || 0 : P.rW || 0);
      const perp = [Math.cos(ang), -Math.sin(ang)];
      const dot = tv[0] * perp[0] + tv[1] * perp[1];
      const hp = handPieces(add(a.e, fd, -0.002 * h), ang, dot >= 0 ? 1 : -1, h, {
        wv: lerp(0.74, 1.0, Math.max(kOpen, kCross)), thumb: sstep(0.12, 0.5, Math.abs(dot)), spread: 0.15 + 0.5 * w1, len: 0.97,
      });
      part(L, polyPath(hp.pieces), back ? E.shade(C.skin, -0.06) : C.skin, o, [hp.centre[0], hp.centre[1], 0.045 * h], 0.3);
      const cuff = polyPath([chaikin(quadPts(add(a.e, fd, -0.016 * h), add(a.e, fd, 0.003 * h), 0.021 * h, 0.021 * h), 1)]);
      part(L, cuff, behind ? E.shade(C.coat, -0.35) : E.shade(C.coat, -0.2), o, null, 0);
    };

    drawLeg(ll, -1); drawLeg(rl, 1);
    // back view: an arm whose forearm crosses in front of the body is hidden behind it
    if (back && P.lFront) drawArm(la, lSh, true);
    if (back && P.rFront) drawArm(ra, rSh, true);

    // coat body: torso (the shoulders are formed by the sleeve heads) ∪ skirt (hull over the hips and thighs)
    const hemY = -(R.hipY - R.coatHem);
    const torso = smoothCW([
      T(-0.024, 0.312), T(-0.06, 0.304), T(-0.085, 0.292), T(-0.098, 0.272), T(-0.1, 0.24), T(-0.093, 0.19), T(-0.083, 0.12), T(-0.08, 0.05), T(-0.082, -0.01),
      T(0.082, -0.01), T(0.08, 0.05), T(0.083, 0.12), T(0.093, 0.19), T(0.1, 0.24), T(0.098, 0.272), T(0.085, 0.292), T(0.06, 0.304), T(0.024, 0.312),
    ], 0.45);
    const sk = [T(-0.08, 0.05), T(0.08, 0.05), T(-0.082, -0.01), T(0.082, -0.01), T(-0.088, -0.03), T(0.088, -0.03), T(-0.096, hemY), T(0.096, hemY), T(-0.05, hemY - 0.005), T(0.05, hemY - 0.005), T(0, hemY - 0.006)];
    for (const [lg, hp, side] of [[ll, lHip, -1], [rl, rHip, 1]]) {
      const d = dirOf(lg.a), n = [Math.cos(lg.a), -Math.sin(lg.a)];
      const c = add(hp, d, 0.115 * h);
      sk.push(add(c, n, 0.047 * h), add(c, n, -0.047 * h), add(add(hp, d, 0.05 * h), n, side * 0.05 * h));
    }
    const body = new Path2D();
    body.addPath(torso);
    polyPath([roundHull(sk, 0.016 * h)], body);
    part(L, body, C.coat, o, [T(0, 0.12)[0], T(0, 0.12)[1], h * 0.22], 0.3);
    if (o.outline !== false) {
      if (!back) {
        E.pencil(L.ink, [T(-0.026, 0.305), T(0.0, 0.235), T(0.026, 0.305)], { w: Math.max(1.1, h * 0.0026), a: 0.32, double: false });
        E.pencil(L.ink, [T(0.0, 0.235), T(0.004, 0.1), T(0.006, hemY + 0.01)], { w: Math.max(1.0, h * 0.0024), a: 0.24, double: false });
      } else {
        E.pencil(L.ink, [T(0.0, 0.29), T(0.0, 0.1), T(0.0, hemY + 0.06)], { w: Math.max(1.0, h * 0.0024), a: 0.16, double: false });
      }
    }
    // neck + head
    const nb = T(0, 0.3);
    const hc = T(0, 0.3 + R.neck + R.headH * 0.5);
    const ht = lean + (P.headTilt || 0);
    const neck = polyPath([capsulePts(nb, add(hc, [0, 1], 0.03 * h), 0.0235 * h, 0.0205 * h)]);
    part(L, neck, C.skin, o, [nb[0], nb[1], 0.04 * h], 0.35);
    if (!back) {
      // shirt collar V
      const v = smoothCW([T(-0.026, 0.305), T(0.0, 0.272), T(0.026, 0.305), T(0.0, 0.312)], 0.3);
      part(L, v, C.collar, { ...o, outlineAlpha: 0.5 }, null, 0);
    }
    const Hh = (x, y) => { const q = rot([x * h, y * h], ht); return [hc[0] + q[0], hc[1] + q[1]]; };
    // ears
    for (const s of [-1, 1]) {
      const ec = Hh(s * 0.05, 0.004);
      part(L, E.blob(ec[0], ec[1], 0.011 * h, { rx: 0.009 * h, ry: 0.015 * h, irr: 0.02, rot: ht, seed: 12 + s }), E.shade(C.skin, -0.1), { ...o, outlineAlpha: 0.55 }, null, 0);
    }
    const head = smoothCW([
      Hh(0, -0.066), Hh(0.036, -0.058), Hh(0.05, -0.03), Hh(0.05, 0.005), Hh(0.044, 0.034), Hh(0.03, 0.054), Hh(0, 0.064),
      Hh(-0.03, 0.054), Hh(-0.044, 0.034), Hh(-0.05, 0.005), Hh(-0.05, -0.03), Hh(-0.036, -0.058),
    ], 0.5);
    part(L, head, back ? C.hair : C.skin, o, [hc[0], hc[1], 0.07 * h], back ? 0.25 : 0.32);
    if (!back) {
      const hair = smoothCW([
        Hh(-0.052, -0.004), Hh(-0.053, -0.035), Hh(-0.038, -0.064), Hh(0, -0.075), Hh(0.038, -0.064), Hh(0.053, -0.035),
        Hh(0.052, -0.004), Hh(0.046, -0.022), Hh(0.03, -0.038), Hh(0.0, -0.042), Hh(-0.03, -0.038), Hh(-0.046, -0.022),
      ], 0.5);
      part(L, hair, C.hair, o, [hc[0], hc[1], 0.07 * h], 0.25);
    } else {
      // nape: a little skin at the bottom of the back of the head
      const nape = smoothCW([Hh(-0.03, 0.04), Hh(0.03, 0.04), Hh(0.024, 0.06), Hh(0, 0.066), Hh(-0.024, 0.06)], 0.5);
      part(L, nape, E.shade(C.skin, -0.05), { ...o, outline: false }, null, 0);
    }
    // arms in front of the body (all of them in front view; the hanging ones in back view)
    if (!(back && P.lFront)) drawArm(la, lSh, false);
    if (!(back && P.rFront)) drawArm(ra, rSh, false);
    E.restore(L);
    return { hc, nb, la, ra, ll, rl, lSh, rSh, dy };
  }

  // ---------- walk cycle (planted feet) ----------
  // Each foot: heel strike → foot flat → heel off → toe off (stance, 58% of the cycle, the contact point fixed on
  // the ground), then a swing along a smooth arc. Hip height = the highest the stance leg(s) allow (slight
  // inverted-pendulum bob); knees and hips by two-bone IK. Stride per cycle = walkSpeed(h, cycle)·cycle·amp, so
  // x = x0 + walkSpeed(h, cycle)·t with walk((t / cycle) % 1) has no foot sliding.
  const STRIDE = 4 * Math.sin(0.40) * (R.thigh + R.shin) * 0.92; // per cycle, in h
  const WK = { st: 0.58, flat: 0.12, heelOff: 0.3, faS: 0.24, faO: -0.52, mid: 0.27, x0: -0.05 };
  const HEEL = [-R.heel, 0.035], TOE = [R.foot, 0.035], LEGL = R.thigh + R.shin;
  /** ankle (x rel. hip, y rel. ground, y down) + foot angle of a planted foot at stance progress u */
  function stanceFoot(u, s) {
    const amp = s / STRIDE;
    const xh = WK.x0 + s * WK.mid - s * u; // heel contact (flat-foot position), relative to the hip
    let fa;
    if (u < WK.flat) fa = WK.faS * amp * (1 - sstep(0, WK.flat, u));
    else if (u < WK.heelOff) fa = 0;
    else fa = WK.faO * amp * sstep(WK.heelOff, WK.st, u);
    let a;
    if (fa >= 0) { const q = rot(HEEL, -fa); a = [xh - q[0], -q[1]]; } else { const q = rot(TOE, -fa); a = [xh + R.heel + R.foot - q[0], -q[1]]; }
    return { a, fa };
  }
  function footState(u, s) {
    if (u <= WK.st) return { ...stanceFoot(u, s), stance: true, u };
    const amp = s / STRIDE;
    const w = (u - WK.st) / (1 - WK.st);
    const A = stanceFoot(WK.st, s), B = stanceFoot(0, s);
    // x: Hermite with the planted velocity at both ends (the foot leaves and lands without a jerk)
    const m0 = -0.5 * s * (1 - WK.st), m1 = -0.25 * s * (1 - WK.st);
    const w2 = w * w, w3 = w2 * w;
    const x = (2 * w3 - 3 * w2 + 1) * A.a[0] + (w3 - 2 * w2 + w) * m0 + (-2 * w3 + 3 * w2) * B.a[0] + (w3 - w2) * m1;
    // height: lifted most early in the swing (knee flexion), then reaching forward to the heel strike
    const lift = amp * (0.046 * Math.pow(Math.sin(PI * Math.pow(w, 0.8)), 1.3));
    const y = lerp(A.a[1], B.a[1], E.smooth(w)) - lift;
    const fa = lerp(A.fa, B.fa, sstep(0.12, 0.95, w));
    return { a: [x, y], fa, stance: false, u };
  }
  function ik2(dx, dy) {
    // hip at origin, ankle at (dx, dy) (y down). Returns {H, K}: thigh angle from straight down (+ forward), knee bend (+ back)
    const t = R.thigh, s = R.shin;
    let D = Math.hypot(dx, dy);
    D = clamp(D, Math.abs(t - s) + 1e-4, (t + s) * 0.99995);
    const phi = Math.atan2(dx, dy);
    const al = Math.acos(clamp((t * t + D * D - s * s) / (2 * t * D), -1, 1));
    const kn = Math.acos(clamp((t * t + s * s - D * D) / (2 * t * s), -1, 1));
    return { H: phi + al, K: PI - kn };
  }
  const smin = (a, b, k) => { const hh = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1); return lerp(b, a, hh) - k * hh * (1 - hh); };
  function walkPose(phase, amp = 1) {
    amp = clamp(Number.isFinite(amp) ? amp : 1, 0, 1.4);
    phase = ((Number.isFinite(phase) ? phase : 0) % 1 + 1) % 1;
    const s = STRIDE * amp;
    const nU = (phase - 0.25 + 1) % 1, fU = (phase - 0.75 + 1) % 1;
    const nFt = footState(nU, s), fFt = footState(fU, s);
    // hip height above the ground
    const reach = (ft, e) => { const L2 = LEGL * e; return -ft.a[1] + Math.sqrt(Math.max(0, L2 * L2 - ft.a[0] * ft.a[0])); };
    const ext = (u) => 0.9995 - 0.014 * amp * Math.pow(Math.sin(PI * clamp(u / 0.32, 0, 1)), 2);
    let Y = Math.min(reach(nFt, 0.9995), reach(fFt, 0.9995));
    for (const ft of [nFt, fFt]) if (ft.stance) Y = smin(Y, reach(ft, ext(ft.u)), 0.006);
    const nI = ik2(nFt.a[0], Y + nFt.a[1]), fI = ik2(fFt.a[0], Y + fFt.a[1]);
    const sn = Math.sin(phase * TAU);
    return {
      lean: 0.045 * amp, head: -0.03, hipDrop: 0,
      nS: -0.32 * sn * amp + 0.04, nE: 0.22 + 0.12 * Math.max(0, -sn) * amp, fS: 0.32 * sn * amp - 0.02, fE: 0.22 + 0.12 * Math.max(0, sn) * amp,
      nH: nI.H, nK: Math.max(0, nI.K), fH: fI.H, fK: Math.max(0, fI.K), nF: nFt.fa, fF: fFt.fa, coatSwing: 0.006 * sn * amp,
    };
  }

  // ---------- poses ----------
  const pose = {
    // side view
    stand: () => ({ lean: 0.0, head: 0.0, nS: 0.06, nE: 0.12, fS: -0.04, fE: 0.14, nH: 0.03, nK: 0.03, fH: -0.03, fK: 0.03, nF: 0, fF: 0 }),
    walk: walkPose,
    reach: (k = 1) => ({ lean: 0.05 * k, head: 0.05 * k, nS: 0.06 + 1.25 * k, nE: 0.12 - 0.05 * k, fS: -0.04 + 0.95 * k, fE: 0.14 + 0.05 * k, nH: 0.08 * k, nK: 0.03, fH: -0.1 * k, fK: 0.06, nF: 0, fF: 0 }),
    hold: (k = 1) => ({ lean: -0.02 * k, head: 0.12 * k, nS: 0.06 + 0.55 * k, nE: 0.12 + 1.15 * k, fS: -0.04 + 0.5 * k, fE: 0.14 + 1.1 * k, nH: 0.03, nK: 0.03, fH: -0.03, fK: 0.03 }),
    embrace: (k = 1) => ({ lean: 0.08 * k, head: 0.18 * k, nS: 0.06 + 0.95 * k, nE: 0.12 + 1.3 * k, fS: -0.04 + 0.85 * k, fE: 0.14 + 1.35 * k, nH: 0.03, nK: 0.05 * k, fH: -0.05, fK: 0.08 * k }),
    lookUp: (k = 1) => ({ lean: -0.05 * k, head: -0.42 * k, nS: 0.06, nE: 0.12, fS: -0.04, fE: 0.14, nH: 0.03, nK: 0.03, fH: -0.03, fK: 0.03 }),
    handOnHeart: (k = 1) => ({ lean: 0.03 * k, head: 0.18 * k, nS: 0.06 + 0.25 * k, nE: 0.12 + 1.75 * k, nW: 0.4 * k, fS: -0.04, fE: 0.14, nH: 0.03, nK: 0.03, fH: -0.03, fK: 0.03 }),
    // one knee down: near thigh forward, far knee on the ground, far toes tucked under (shin rising to the ankle)
    kneel: (k = 1) => ({ lean: 0.06 * k, head: 0.15 * k, nS: 0.25 * k, nE: 0.6 * k, fS: -0.04 - 0.1 * k, fE: 0.14 + 0.75 * k, nH: 0.03 + 1.52 * k, nK: 0.03 + 1.52 * k, fH: -0.03 - 0.03 * k, fK: 0.03 + 1.91 * k, nF: 0, fF: -1.3 * k }),
    clutch: (k = 1) => ({ lean: 0.22 * k, head: 0.28 * k, nS: 0.06 + 0.9 * k, nE: 0.12 + 1.7 * k, fS: -0.04 + 0.8 * k, fE: 0.14 + 1.75 * k, nH: 0.1 * k, nK: 0.2 * k, fH: -0.12 * k, fK: 0.12 * k }),
    proud: (k = 1) => ({ lean: -0.07 * k, head: -0.18 * k, nS: -0.12 * k, nE: 0.25 * k, fS: -0.2 * k, fE: 0.3 * k, nH: 0.05, nK: 0.02, fH: -0.06, fK: 0.02 }),
    // front / back view
    fStand: () => ({ tilt: 0, lS: 0.06, lE: 0.04, rS: 0.06, rE: 0.04, lH: 0.035, rH: 0.035, lK: 0, rK: 0 }),
    fOpen: (k = 1) => ({ tilt: 0, lS: 0.08 + 0.55 * k, lE: -0.25 * k, rS: 0.08 + 0.55 * k, rE: -0.25 * k, lH: 0.05, rH: 0.05 }),
    fHeart: (k = 1) => ({ tilt: 0, headTilt: 0.06 * k, lS: 0.06, lE: 0.04, rS: 0.06 + 0.1 * k, rE: 0.04 + 2.41 * k, rFs: 1 - 0.38 * k, rFsU: 1 - 0.2 * k, lH: 0.035, rH: 0.035, rFront: k > 0.3 }),
    fHold: (k = 1) => ({ tilt: 0, lS: 0.06 + 0.04 * k, lE: 0.04 + 1.2 * k, lFs: 1 - 0.4 * k, rS: 0.06 + 0.04 * k, rE: 0.04 + 1.2 * k, rFs: 1 - 0.4 * k, lH: 0.035, rH: 0.035, lFront: k > 0.3, rFront: k > 0.3 }),
    fRaise: (k = 1) => ({ tilt: 0, lS: 0.08 + 2.2 * k, lE: 0.25 * k, rS: 0.08 + 2.2 * k, rE: 0.25 * k, lH: 0.05, rH: 0.05 }),
    fHug: (k = 1) => ({ tilt: 0, headTilt: 0.05 * k, lS: 0.06 + 0.3 * k, lE: 0.04 + 1.9 * k, lFs: 1 - 0.2 * k, rS: 0.06 + 0.3 * k, rE: 0.04 + 1.9 * k, rFs: 1 - 0.2 * k, lH: 0.04, rH: 0.04, lFront: k > 0.3, rFront: k > 0.3 }),
  };

  // a key missing from one pose blends from/to the value the rig would use for it (e.g. forearm
  // foreshortening lFs/rFs = 1, not 0: a 0 there collapsed the forearm at the start of a blend)
  const LERP_DEF = { lFs: 1, rFs: 1, lFsU: 1, rFsU: 1 };
  const lerpPose = (a, b, t) => {
    const out = {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const va = a[k] ?? LERP_DEF[k] ?? 0, vb = b[k] ?? LERP_DEF[k] ?? 0;
      out[k] = typeof va === 'number' && typeof vb === 'number' ? va + (vb - va) * t : (t < 0.5 ? va : vb);
    }
    return out;
  };

  /** approximate ground speed (px/s) for a walk cycle of duration `cycle` s at height h (no foot sliding) */
  const walkSpeed = (h, cycle = 1.1) => (2 * 2 * Math.sin(0.40) * (R.thigh + R.shin) * h * 0.92) / cycle;

  // ---------- group rendering (alpha < 1): draw opaque offscreen, composite once ----------
  const OFF = new Map();
  function offLayers(w, hh) {
    const key = w + 'x' + hh;
    if (!OFF.has(key)) {
      const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = hh; return c.getContext('2d'); };
      OFF.set(key, { paint: mk(), ink: mk(), light: mk() });
    }
    return OFF.get(key);
  }
  function drawGroup(L, o, a, render) {
    const W = L.paint.canvas.width, Hc = L.paint.canvas.height;
    const M = offLayers(W, Hc);
    // device-space bounds of the figure (generous)
    const m = L.paint.getTransform();
    const h = o.h, cs = [[-0.75, -1.25], [0.75, -1.25], [-0.75, 0.25], [0.75, 0.25]].map(([u, v]) => {
      let px = o.x + u * h, py = o.y + v * h;
      return [m.a * px + m.c * py + m.e, m.b * px + m.d * py + m.f];
    });
    const x0 = Math.max(0, Math.floor(Math.min(...cs.map((c) => c[0])))), x1 = Math.min(W, Math.ceil(Math.max(...cs.map((c) => c[0]))));
    const y0 = Math.max(0, Math.floor(Math.min(...cs.map((c) => c[1])))), y1 = Math.min(Hc, Math.ceil(Math.max(...cs.map((c) => c[1]))));
    if (x1 <= x0 || y1 <= y0) return null;
    for (const k of ['paint', 'ink', 'light']) {
      const c = M[k];
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.clearRect(x0, y0, x1 - x0, y1 - y0);
      const t = L[k].getTransform();
      c.setTransform(t);
    }
    const res = render(M);
    const bw = x1 - x0, bh = y1 - y0;
    const blit = (dst, src, op, al) => {
      dst.save();
      dst.setTransform(1, 0, 0, 1, 0, 0);
      dst.globalCompositeOperation = op;
      dst.globalAlpha = al;
      dst.drawImage(src.canvas, x0, y0, bw, bh, x0, y0, bw, bh);
      dst.restore();
    };
    blit(L.paint, M.paint, 'source-over', a);
    blit(L.ink, M.paint, 'destination-out', a);   // occlusion of background pencil under the figure
    blit(L.ink, M.ink, 'source-over', a);
    blit(L.light, M.paint, 'destination-out', a);
    return res;
  }

  function draw(L, opts) {
    const o = { h: 600, facing: 1, view: 'side', alpha: 1, ...opts };
    if (!Number.isFinite(o.h) || o.h <= 0 || !Number.isFinite(o.x) || !Number.isFinite(o.y)) return null;
    o.facingScreen = o.facing;
    const side = o.view === 'side';
    const raw = o.pose || (side ? pose.stand() : pose.fStand());
    const P = side ? sanitize(raw, SIDE_DEF, SIDE_LIM) : sanitize(raw, FRONT_DEF, FRONT_LIM);
    const render = (LL) => {
      E.save(LL);
      E.translate(LL, o.x, o.y);
      if (o.rot) E.rotate(LL, o.rot);
      if (side && o.facing < 0) E.scale(LL, -1, 1);
      let res;
      if (side) { o.facingScreen = 1; res = drawSide(LL, o.h, P, o); }
      else res = drawFront(LL, o.h, P, o, o.view === 'back');
      E.restore(LL);
      return res;
    };
    const a = (o.alpha ?? 1) * L.paint.globalAlpha;
    if (a <= 0.002) return null;
    if (a < 0.995 && L.paint.canvas && typeof document !== 'undefined') return drawGroup(L, o, a, render);
    return render(L);
  }

  /** soft contact shadow under the figure (paint layer, glaze) */
  function shadow(L, x, y, h, a = 0.35, w = 1) {
    E.wash(L.paint, E.blob(x, y, h * 0.12 * w, { rx: h * 0.13 * w, ry: h * 0.018, irr: 0.05, seed: 2 }), '#8F8C9C', { alpha: a, soft: h * 0.012 });
  }

  /** the pose actually drawn (after the anatomical joint limits) — for checks */
  const limited = (p, view = 'side') => (view === 'side' ? sanitize(p || pose.stand(), SIDE_DEF, SIDE_LIM) : sanitize(p || pose.fStand(), FRONT_DEF, FRONT_LIM));

  E.man = { draw, pose, lerp: lerpPose, walkSpeed, shadow, limited, colors: C, R };
})();
