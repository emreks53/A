/* The man: a simple, featureless but correctly proportioned adult male (≈7.5 heads), knee-length coat,
   trousers, shoes, short hair. Side (profile), front and back views, posable, with a walk cycle.
   Drawn opaque on the paint layer with a soft watercolour shadow glaze, plus a clean pencil silhouette.

   Usage: E.man.draw(L, { x, y, h, facing, view, pose, alpha, tint, tintAmt, outline })
     x,y   ground point between the feet (y = ground line)
     h     total height in px
     facing 1 = right, -1 = left (side view)
     view  'side' | 'front' | 'back'
     pose  object from E.man.pose.*  (side poses for side view, front poses for front/back)
   Angles (side): radians, 0 = limb hanging straight down, positive = swung forward (toward facing).
   Elbow (+) bends the forearm forward/up; knee (+) bends the shin backward. */
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
  const dirOf = (a) => [Math.sin(a), Math.cos(a)]; // angle from straight down, + toward +x
  const add = (p, d, l) => [p[0] + d[0] * l, p[1] + d[1] * l];
  const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];

  /** tapered capsule subpath around segment a-b with radii r0 (at a) and r1 (at b) */
  function capsule(path, a, b, r0, r1) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    if (L < 1e-3) { path.moveTo(a[0] + r0, a[1]); path.arc(a[0], a[1], Math.max(r0, r1), 0, E.TAU); return; }
    const th = Math.atan2(dy, dx);
    const ph = Math.asin(E.clamp((r0 - r1) / L, -1, 1));
    const a1 = th + Math.PI / 2 + ph, a2 = th - Math.PI / 2 - ph;
    path.moveTo(a[0] + Math.cos(a1) * r0, a[1] + Math.sin(a1) * r0);
    path.arc(a[0], a[1], r0, a1, a2 + E.TAU, false);
    path.lineTo(b[0] + Math.cos(a2) * r1, b[1] + Math.sin(a2) * r1);
    path.arc(b[0], b[1], r1, a2, a1, false);
    path.closePath();
  }

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

  // part renderer: paint (opaque) + glaze + ink silhouette with occlusion
  function part(L, path, color, o, bbox, shadowAmt = 0.45) {
    const p = L.paint, ink = L.ink;
    const col = tintCol(color, o);
    p.save();
    p.globalCompositeOperation = 'source-over';
    p.fillStyle = col;
    p.fill(path);
    p.restore();
    if (bbox && shadowAmt > 0) shadeGlaze(p, path, E.shade(col, -0.55), bbox[0], bbox[1], bbox[2], o.facingScreen, shadowAmt);
    if (o.outline !== false) {
      ink.save();
      ink.strokeStyle = E.P.ink;
      ink.lineJoin = 'round';
      ink.globalAlpha = 0.42 * (o.outlineAlpha ?? 1);
      ink.lineWidth = Math.max(1.6, o.h * 0.0042) * 2;
      ink.stroke(path);
      ink.globalAlpha = 1;
      ink.globalCompositeOperation = 'destination-out';
      ink.fillStyle = '#000';
      ink.fill(path);
      ink.restore();
    } else {
      ink.save(); ink.globalCompositeOperation = 'destination-out'; ink.fill(path); ink.restore();
    }
    // light layer occlusion
    L.light.save(); L.light.globalCompositeOperation = 'destination-out'; L.light.fill(path); L.light.restore();
  }

  // ---------- SIDE VIEW ----------
  function sideSkeleton(h, P) {
    const hip = [P.hipX * h || 0, -(R.hipY * h) + (P.hipDrop || 0) * h];
    const torsoDir = dirOf(Math.PI + (P.lean || 0)); // upward, leaning forward with + lean
    const neckBase = add(hip, torsoDir, R.torso * h);
    const shoulder = add(neckBase, rot([-0.012 * h, 0.03 * h], P.lean || 0), 1);
    const headDir = dirOf(Math.PI + (P.lean || 0) + (P.head || 0));
    const headC = add(add(neckBase, headDir, R.neck * h + R.headH * h * 0.5), rot([0.012 * h, 0], (P.lean || 0) + (P.head || 0)), 1);
    const limb = (root, a1, bend, l1, l2, sign) => {
      const j = add(root, dirOf(a1), l1);
      const a2 = a1 + sign * bend;
      const e = add(j, dirOf(a2), l2);
      return { j, e, a2 };
    };
    const arm = (s, e) => limb(shoulder, s, e, R.upper * h, R.fore * h, +1);
    const leg = (hp, k) => limb(hip, hp, k, R.thigh * h, R.shin * h, -1);
    return {
      hip, neckBase, shoulder, headC,
      nArm: arm(P.nS ?? 0.05, P.nE ?? 0.15), fArm: arm(P.fS ?? -0.05, P.fE ?? 0.15),
      nLeg: leg(P.nH ?? 0.02, P.nK ?? 0.04), fLeg: leg(P.fH ?? -0.02, P.fK ?? 0.04),
    };
  }

  function footPath(h, ankle, ang) {
    // shoe in local frame: ankle at origin; sole along +x (forward); ang rotates the shoe (+ toe up)
    const L = R.foot * h, H = 0.05 * h, hb = R.heel * h;
    const pts = [
      [-hb, -0.012 * h], [-hb * 0.9, 0.022 * h], [-hb * 0.2, 0.034 * h], [L * 0.5, 0.035 * h], [L * 0.86, 0.031 * h],
      [L, 0.018 * h], [L * 0.95, 0.0], [L * 0.62, -0.012 * h], [L * 0.3, -0.03 * h], [0.0, -H * 0.62], [-hb * 0.7, -H * 0.55],
    ].map((p) => { const q = rot(p, -ang); return [ankle[0] + q[0], ankle[1] + q[1]]; });
    return E.smoothPath(pts, true, 0.45);
  }

  function drawSide(L, h, P, o) {
    const S = sideSkeleton(h, P);
    const wTh0 = 0.048 * h, wTh1 = 0.035 * h, wSh1 = 0.027 * h;
    const wUa0 = 0.03 * h, wUa1 = 0.025 * h, wFa1 = 0.019 * h;
    const darker = (c) => E.shade(c, -0.28);

    // ground the figure: lowest foot point sits on y=0
    const footY = (leg, fa) => {
      const ankle = add(leg.e, [0, 1], 0);
      const q1 = rot([R.foot * h, 0.035 * h], -fa), q2 = rot([-R.heel * h, 0.035 * h], -fa);
      return Math.max(ankle[1] + q1[1], ankle[1] + q2[1]);
    };
    const nFA = P.nF ?? 0, fFA = P.fF ?? 0;
    const low = Math.max(footY(S.nLeg, nFA), footY(S.fLeg, fFA));
    const dy = P.float ? 0 : -low;
    E.save(L);
    E.translate(L, 0, dy);

    const drawArm = (arm, near) => {
      const path = new Path2D();
      capsule(path, S.shoulder, arm.j, wUa0, wUa1);
      capsule(path, arm.j, arm.e, wUa1 * 0.98, wFa1);
      const col = near ? C.coat : darker(C.coat);
      const cx = (S.shoulder[0] + arm.e[0]) / 2, cy = (S.shoulder[1] + arm.e[1]) / 2;
      part(L, path, col, o, [cx, cy, h * 0.18], 0.4);
      // hand
      const hd = dirOf(arm.a2 + (near ? P.nW || 0 : P.fW || 0));
      const hand = new Path2D();
      const hc = add(arm.e, hd, R.hand * h * 0.42);
      const hw = 0.021 * h, hl = R.hand * h * 0.55;
      const ang = Math.atan2(hd[1], hd[0]);
      const hp = [];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * E.TAU;
        const rr = 1 + (Math.cos(a) > 0 ? 0.08 : -0.06) * Math.abs(Math.cos(a));
        hp.push([Math.cos(a) * hl * rr, Math.sin(a) * hw * (1 - 0.18 * Math.cos(a))]);
      }
      const hpts = hp.map((q) => { const r2 = rot(q, ang); return [hc[0] + r2[0], hc[1] + r2[1]]; });
      hand.addPath(E.smoothPath(hpts, true, 0.5));
      part(L, hand, near ? C.skin : darker(C.skin), o, [hc[0], hc[1], hl], 0.35);
      // cuff
      const cuff = new Path2D();
      capsule(cuff, add(arm.e, dirOf(arm.a2), -0.012 * h), add(arm.e, dirOf(arm.a2), 0.004 * h), wFa1 * 1.08, wFa1 * 1.08);
      part(L, cuff, near ? E.shade(C.coat, -0.2) : darker(E.shade(C.coat, -0.2)), o, null, 0);
    };
    const drawLeg = (leg, fa, near) => {
      const path = new Path2D();
      capsule(path, S.hip, leg.j, wTh0, wTh1);
      capsule(path, leg.j, leg.e, wTh1 * 0.97, wSh1);
      const col = near ? C.trousers : darker(C.trousers);
      part(L, path, col, o, [(S.hip[0] + leg.e[0]) / 2, (S.hip[1] + leg.e[1]) / 2, h * 0.26], 0.38);
      const shoe = footPath(h, leg.e, fa);
      part(L, shoe, near ? C.shoes : darker(C.shoes), o, [leg.e[0] + 0.04 * h, leg.e[1], h * 0.08], 0.3);
    };

    drawArm(S.fArm, false);
    drawLeg(S.fLeg, fFA, false);
    drawLeg(S.nLeg, nFA, true);

    // torso + coat (profile). Build in torso frame then rotate by lean.
    const lean = P.lean || 0;
    const T = (x, y) => { const q = rot([x * h, -y * h], lean); return [S.hip[0] + q[0], S.hip[1] + q[1]]; };
    // hem: follows the legs (front edge by the most forward knee, back edge by the most backward knee)
    const kneesX = [S.nLeg.j[0], S.fLeg.j[0]].map((x) => (x - S.hip[0]) / h);
    const frontK = Math.max(...kneesX, 0.0), backK = Math.min(...kneesX, 0.0);
    const hemY = -(R.hipY - R.coatHem) + (P.hipDrop || 0);
    const swing = (P.coatSwing || 0);
    const torso = E.smoothPath([
      T(-0.048, 0.296), T(-0.062, 0.25), T(-0.058, 0.17), T(-0.05, 0.1), T(-0.058, 0.02),
      T(-0.063 + backK * 0.25 - swing, hemY * 0.55), T(-0.064 + backK * 0.45 - swing, hemY),
      T(0.05 + frontK * 0.45 - swing * 0.5, hemY + 0.004), T(0.05 + frontK * 0.25, hemY * 0.55),
      T(0.054, 0.02), T(0.058, 0.12), T(0.07, 0.2), T(0.06, 0.265), T(0.03, 0.302), T(-0.02, 0.31),
    ], true, 0.5);
    part(L, torso, C.coat, o, [T(0, 0.12)[0], T(0, 0.12)[1], h * 0.22], 0.42);
    // collar hint + front opening (pencil)
    if (o.outline !== false) {
      const op = [T(0.045, 0.27), T(0.05, 0.16), T(0.05 + frontK * 0.1, 0.02), T(0.05 + frontK * 0.42, hemY + 0.01)];
      E.pencil(L.ink, op, { w: Math.max(1.2, h * 0.0028), a: 0.3, double: false });
      const belt = [T(-0.052, 0.03), T(0.052, 0.035)];
      E.pencil(L.ink, belt, { w: Math.max(1.0, h * 0.0024), a: 0.18, double: false });
    }
    // neck
    const neck = new Path2D();
    const nb = S.neckBase, hb = add(S.headC, dirOf(Math.PI + lean + (P.head || 0)), -R.headH * h * 0.35);
    capsule(neck, add(nb, [0, 1], 0.01 * h), hb, 0.02 * h, 0.019 * h);
    part(L, neck, C.skin, o, [nb[0], nb[1], 0.04 * h], 0.4);
    // collar band
    const collar = new Path2D();
    capsule(collar, T(-0.035, 0.296), T(0.028, 0.304), 0.012 * h, 0.012 * h);
    part(L, collar, E.shade(C.coat, -0.15), o, null, 0);

    // head
    const ha = lean + (P.head || 0);
    const hc = S.headC;
    const H2 = (x, y) => { const q = rot([x * h, y * h], ha); return [hc[0] + q[0], hc[1] + q[1]]; };
    const headPts = [
      H2(-0.047, -0.01), H2(-0.044, -0.042), H2(-0.025, -0.062), H2(0.005, -0.066), H2(0.033, -0.056),
      H2(0.047, -0.03), H2(0.049, -0.006), H2(0.056, 0.004), H2(0.05, 0.012), H2(0.047, 0.026), H2(0.043, 0.044),
      H2(0.032, 0.058), H2(0.012, 0.064), H2(-0.012, 0.052), H2(-0.03, 0.035), H2(-0.044, 0.02),
    ];
    const head = E.smoothPath(headPts, true, 0.5);
    part(L, head, C.skin, o, [hc[0], hc[1], 0.07 * h], 0.38);
    // ear
    const ear = E.blob(H2(-0.006, 0.006)[0], H2(-0.006, 0.006)[1], 0.012 * h, { rx: 0.0105 * h, ry: 0.016 * h, irr: 0.02, rot: ha, seed: 3 });
    part(L, ear, E.shade(C.skin, -0.12), { ...o, outlineAlpha: 0.6 }, null, 0);
    // hair cap (top + back), short
    const hair = E.smoothPath([
      H2(-0.05, 0.012), H2(-0.051, -0.03), H2(-0.034, -0.062), H2(-0.004, -0.073), H2(0.028, -0.066),
      H2(0.046, -0.044), H2(0.044, -0.032), H2(0.022, -0.042), H2(0.0, -0.036), H2(-0.012, -0.02),
      H2(-0.016, 0.0), H2(-0.024, 0.018), H2(-0.04, 0.03),
    ], true, 0.5);
    part(L, hair, C.hair, o, [hc[0], hc[1], 0.07 * h], 0.3);

    drawArm(S.nArm, true);
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
    const darker = (c) => E.shade(c, -0.22);

    // legs (abduction angle: + = outward), knee bend shortens visually (foreshortening)
    const leg = (hp, side, ab, kb) => {
      const a = side * ab;
      const thighL = R.thigh * h * (1 - 0.25 * Math.abs(kb));
      const j = add(hp, dirOf(a), thighL);
      const e = add(j, dirOf(a - side * kb * 0.2), R.shin * h);
      return { j, e };
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
      return { j, e, a2 };
    };
    const la = arm(lSh, -1, P.lS ?? 0.1, P.lE ?? 0.05, P.lFsU, P.lFs), ra = arm(rSh, 1, P.rS ?? 0.1, P.rE ?? 0.05, P.rFsU, P.rFs);

    const drawLeg = (lg, side) => {
      const path = new Path2D();
      capsule(path, side < 0 ? lHip : rHip, lg.j, 0.045 * h, 0.034 * h);
      capsule(path, lg.j, lg.e, 0.033 * h, 0.026 * h);
      part(L, path, C.trousers, o, [lg.j[0], lg.j[1], h * 0.25], 0.32);
      const s = E.blob(lg.e[0] + side * 0.012 * h, lg.e[1] + 0.03 * h, 0.03 * h, { rx: 0.032 * h, ry: 0.024 * h, irr: 0.03, seed: 5 + side });
      part(L, s, C.shoes, o, [lg.e[0], lg.e[1] + 0.03 * h, 0.04 * h], 0.3);
    };
    const drawArm = (a, s, side, behind) => {
      const path = new Path2D();
      capsule(path, s, a.j, 0.027 * h, 0.023 * h);
      capsule(path, a.j, a.e, 0.022 * h, 0.018 * h);
      part(L, path, behind ? darker(C.coat) : C.coat, o, [a.j[0], a.j[1], h * 0.2], 0.36);
      const hd = dirOf(a.a2);
      const hc = add(a.e, hd, 0.026 * h);
      const hand = E.blob(hc[0], hc[1], 0.024 * h, { rx: 0.02 * h, ry: 0.032 * h, irr: 0.04, rot: Math.atan2(hd[1], hd[0]) - Math.PI / 2, seed: 9 + side });
      part(L, hand, back ? E.shade(C.skin, -0.06) : C.skin, o, [hc[0], hc[1], 0.035 * h], 0.3);
    };

    drawLeg(ll, -1); drawLeg(rl, 1);
    if (!P.lFront) drawArm(la, lSh, -1, false);
    if (!P.rFront) drawArm(ra, rSh, 1, false);
    // coat body (A-line)
    const hemY = -(R.hipY - R.coatHem);
    const flareL = Math.min(0, ll.j[0] / h + 0.06) * 0.3, flareR = Math.max(0, rl.j[0] / h - 0.06) * 0.3;
    const body = E.smoothPath([
      T(-0.024, 0.312), T(-sh + 0.045, 0.298), T(-sh + 0.012, 0.282), T(-sh + 0.004, 0.25), T(-sh + 0.016, 0.19), T(-0.068, 0.1), T(-0.07, 0.02),
      T(-0.076 + flareL, hemY * 0.5), T(-0.08 + flareL, hemY), T(0, hemY + 0.004), T(0.08 + flareR, hemY), T(0.076 + flareR, hemY * 0.5),
      T(0.07, 0.02), T(0.068, 0.1), T(sh - 0.016, 0.19), T(sh - 0.004, 0.25), T(sh - 0.012, 0.282), T(sh - 0.045, 0.298), T(0.024, 0.312),
    ], true, 0.45);
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
    const hc = T(0, 0.3 + R.neck + R.headH * 0.5 + (P.headUp || 0) * 0.0);
    const ht = lean + (P.headTilt || 0);
    const neck = new Path2D();
    capsule(neck, nb, add(hc, [0, 1], 0.03 * h), 0.022 * h, 0.02 * h);
    part(L, neck, C.skin, o, [nb[0], nb[1], 0.04 * h], 0.35);
    if (!back) {
      // shirt collar V
      const v = E.smoothPath([T(-0.026, 0.305), T(0.0, 0.272), T(0.026, 0.305), T(0.0, 0.312)], true, 0.3);
      part(L, v, C.collar, { ...o, outlineAlpha: 0.5 }, null, 0);
    }
    const Hh = (x, y) => { const q = rot([x * h, y * h], ht); return [hc[0] + q[0], hc[1] + q[1]]; };
    // ears
    for (const s of [-1, 1]) {
      const ec = Hh(s * 0.05, 0.004);
      part(L, E.blob(ec[0], ec[1], 0.011 * h, { rx: 0.009 * h, ry: 0.015 * h, irr: 0.02, rot: ht, seed: 12 + s }), E.shade(C.skin, -0.1), { ...o, outlineAlpha: 0.6 }, null, 0);
    }
    const head = E.smoothPath([
      Hh(0, -0.066), Hh(0.036, -0.058), Hh(0.05, -0.03), Hh(0.05, 0.005), Hh(0.044, 0.034), Hh(0.03, 0.054), Hh(0, 0.064),
      Hh(-0.03, 0.054), Hh(-0.044, 0.034), Hh(-0.05, 0.005), Hh(-0.05, -0.03), Hh(-0.036, -0.058),
    ], true, 0.5);
    part(L, head, back ? C.hair : C.skin, o, [hc[0], hc[1], 0.07 * h], back ? 0.25 : 0.32);
    if (!back) {
      const hair = E.smoothPath([
        Hh(-0.052, -0.004), Hh(-0.053, -0.035), Hh(-0.038, -0.064), Hh(0, -0.075), Hh(0.038, -0.064), Hh(0.053, -0.035),
        Hh(0.052, -0.004), Hh(0.046, -0.022), Hh(0.03, -0.038), Hh(0.0, -0.042), Hh(-0.03, -0.038), Hh(-0.046, -0.022),
      ], true, 0.5);
      part(L, hair, C.hair, o, [hc[0], hc[1], 0.07 * h], 0.25);
    } else {
      // nape: a little skin at the bottom of the back of the head
      const nape = E.smoothPath([Hh(-0.03, 0.04), Hh(0.03, 0.04), Hh(0.024, 0.06), Hh(0, 0.066), Hh(-0.024, 0.06)], true, 0.5);
      part(L, nape, E.shade(C.skin, -0.05), { ...o, outline: false }, null, 0);
    }
    if (P.lFront) drawArm(la, lSh, -1, false);
    if (P.rFront) drawArm(ra, rSh, 1, false);
    E.restore(L);
    return { hc, nb, la, ra, ll, rl, lSh, rSh, dy };
  }

  // ---------- poses ----------
  const pose = {
    // side view
    stand: () => ({ lean: 0.0, head: 0.0, nS: 0.06, nE: 0.12, fS: -0.04, fE: 0.14, nH: 0.03, nK: 0.03, fH: -0.03, fK: 0.03, nF: 0, fF: 0 }),
    walk: (phase, amp = 1) => {
      const th = phase * E.TAU;
      const s = Math.sin(th), c = Math.cos(th);
      const legA = 0.40 * amp;
      const nH = legA * s, fH = -legA * s;
      // knee bends during swing (leg moving forward: derivative of hip angle > 0)
      const kn = (x, v) => 0.08 + Math.max(0, v) * 0.62 * amp + Math.max(0, -x) * 0.12;
      const nK = kn(s, c), fK = kn(-s, -c);
      const nF = Math.max(0, s) * 0.12 - Math.max(0, -c) * 0.25 * Math.max(0, -s), fF = Math.max(0, -s) * 0.12 - Math.max(0, c) * 0.25 * Math.max(0, s);
      return {
        lean: 0.045 * amp, head: -0.03, hipDrop: -0.006 * Math.abs(c) * amp,
        nS: -0.32 * s * amp + 0.04, nE: 0.22 + 0.12 * Math.max(0, -s) * amp, fS: 0.32 * s * amp - 0.02, fE: 0.22 + 0.12 * Math.max(0, s) * amp,
        nH, nK, fH, fK, nF: nF * amp, fF: fF * amp, coatSwing: 0.006 * s * amp,
      };
    },
    reach: (k = 1) => ({ lean: 0.05 * k, head: 0.05 * k, nS: 0.06 + 1.25 * k, nE: 0.12 - 0.05 * k, fS: -0.04 + 0.95 * k, fE: 0.14 + 0.05 * k, nH: 0.08 * k, nK: 0.03, fH: -0.1 * k, fK: 0.06, nF: 0, fF: 0 }),
    hold: (k = 1) => ({ lean: -0.02 * k, head: 0.12 * k, nS: 0.06 + 0.55 * k, nE: 0.12 + 1.15 * k, fS: -0.04 + 0.5 * k, fE: 0.14 + 1.1 * k, nH: 0.03, nK: 0.03, fH: -0.03, fK: 0.03 }),
    embrace: (k = 1) => ({ lean: 0.08 * k, head: 0.18 * k, nS: 0.06 + 0.95 * k, nE: 0.12 + 1.3 * k, fS: -0.04 + 0.85 * k, fE: 0.14 + 1.35 * k, nH: 0.03, nK: 0.05 * k, fH: -0.05, fK: 0.08 * k }),
    lookUp: (k = 1) => ({ lean: -0.05 * k, head: -0.42 * k, nS: 0.06, nE: 0.12, fS: -0.04, fE: 0.14, nH: 0.03, nK: 0.03, fH: -0.03, fK: 0.03 }),
    handOnHeart: (k = 1) => ({ lean: 0.03 * k, head: 0.18 * k, nS: 0.06 + 0.25 * k, nE: 0.12 + 1.75 * k, nW: 0.4 * k, fS: -0.04, fE: 0.14, nH: 0.03, nK: 0.03, fH: -0.03, fK: 0.03 }),
    kneel: (k = 1) => ({ lean: 0.1 * k, head: 0.2 * k, hipDrop: 0.2 * k, nS: 0.2 * k, nE: 0.5 * k, fS: 0.1, fE: 0.3, nH: 1.3 * k, nK: 1.45 * k, fH: -0.1 * k, fK: 1.6 * k, nF: 0, fF: -0.9 * k }),
    clutch: (k = 1) => ({ lean: 0.22 * k, head: 0.28 * k, nS: 0.06 + 0.9 * k, nE: 0.12 + 1.7 * k, fS: -0.04 + 0.8 * k, fE: 0.14 + 1.75 * k, nH: 0.1 * k, nK: 0.2 * k, fH: -0.12 * k, fK: 0.12 * k }),
    proud: (k = 1) => ({ lean: -0.07 * k, head: -0.18 * k, nS: -0.12 * k, nE: 0.25 * k, fS: -0.2 * k, fE: 0.3 * k, nH: 0.05, nK: 0.02, fH: -0.06, fK: 0.02 }),
    // front / back view
    fStand: () => ({ tilt: 0, lS: 0.06, lE: 0.04, rS: 0.06, rE: 0.04, lH: 0.035, rH: 0.035, lK: 0, rK: 0 }),
    fOpen: (k = 1) => ({ tilt: 0, lS: 0.08 + 0.55 * k, lE: -0.25 * k, rS: 0.08 + 0.55 * k, rE: -0.25 * k, lH: 0.05, rH: 0.05 }),
    fHeart: (k = 1) => ({ tilt: 0, headTilt: 0.06 * k, lS: 0.06, lE: 0.04, rS: 0.06 - 0.02 * k, rE: 0.04 + 2.3 * k, rFs: 1 - 0.3 * k, lH: 0.035, rH: 0.035, rFront: k > 0.3 }),
    fHold: (k = 1) => ({ tilt: 0, lS: 0.06 + 0.04 * k, lE: 0.04 + 1.2 * k, lFs: 1 - 0.4 * k, rS: 0.06 + 0.04 * k, rE: 0.04 + 1.2 * k, rFs: 1 - 0.4 * k, lH: 0.035, rH: 0.035, lFront: k > 0.3, rFront: k > 0.3 }),
    fRaise: (k = 1) => ({ tilt: 0, lS: 0.08 + 2.2 * k, lE: 0.25 * k, rS: 0.08 + 2.2 * k, rE: 0.25 * k, lH: 0.05, rH: 0.05 }),
    fHug: (k = 1) => ({ tilt: 0, headTilt: 0.05 * k, lS: 0.06 + 0.3 * k, lE: 0.04 + 1.9 * k, lFs: 1 - 0.2 * k, rS: 0.06 + 0.3 * k, rE: 0.04 + 1.9 * k, rFs: 1 - 0.2 * k, lH: 0.04, rH: 0.04, lFront: k > 0.3, rFront: k > 0.3 }),
  };

  const lerpPose = (a, b, t) => {
    const out = {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const va = a[k] ?? 0, vb = b[k] ?? 0;
      out[k] = typeof va === 'number' && typeof vb === 'number' ? va + (vb - va) * t : (t < 0.5 ? va : vb);
    }
    return out;
  };

  /** approximate ground speed (px/s) for a walk cycle of duration `cycle` s at height h (no foot sliding) */
  const walkSpeed = (h, cycle = 1.1) => (2 * 2 * Math.sin(0.40) * (R.thigh + R.shin) * h * 0.92) / cycle;

  function draw(L, opts) {
    const o = { h: 600, facing: 1, view: 'side', alpha: 1, ...opts };
    o.facingScreen = o.facing;
    const P = o.pose || (o.view === 'side' ? pose.stand() : pose.fStand());
    E.save(L);
    E.translate(L, o.x, o.y);
    if (o.rot) E.rotate(L, o.rot);
    if (o.view === 'side' && o.facing < 0) E.scale(L, -1, 1);
    if (o.alpha < 1) E.alpha(L, o.alpha);
    let res;
    if (o.view === 'side') { o.facingScreen = 1; res = drawSide(L, o.h, P, o); }
    else res = drawFront(L, o.h, P, o, o.view === 'back');
    E.restore(L);
    return res;
  }

  /** soft contact shadow under the figure (paint layer, glaze) */
  function shadow(L, x, y, h, a = 0.35, w = 1) {
    E.wash(L.paint, E.blob(x, y, h * 0.12 * w, { rx: h * 0.13 * w, ry: h * 0.018, irr: 0.05, seed: 2 }), '#8F8C9C', { alpha: a, soft: h * 0.012 });
  }

  E.man = { draw, pose, lerp: lerpPose, walkSpeed, shadow, colors: C, R };
})();
