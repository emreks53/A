/* s02 · 2.55–5.85 (+0.8 bleed tail) · "Her birimizin hayatı, bir endam âyinesidir."
   ARRIVAL. s01's zoom carries us into the han gate. This shot paints the same gate (portal, iwan with its
   muqarnas hood and lantern, inner door) exactly where s01's zoomed gate is on screen, and the courtyard is seen
   through the door. We then fly THROUGH the gate: a dolly model (camera distance s; the gate at depth 1, the
   courtyard a little behind it, the skyline far away) gives true parallax — the portal and the lantern sweep
   past, the courtyard grows gently and settles. "Her birimizin": other travellers cross at the back while our
   man walks in and stops before a tall endam mirror (same proportions and staging as the night echo in s16).
   "hayatı" 3.48: his reflection blooms in, the glass lights up from within (his life: a road winding to a
   little home, swirling colour, rising motes), warm light spills onto the floor and catches his front.
   "endam" 4.38: the camera eases back and tilts so the whole mirror and the whole man read head to toe above the
   subtitle band; a band of light runs down the reflection; "âyinesidir" 4.76: the gleam sweeps the glass. */
(function () {
  const E = window.E;
  const PR = E.props;
  const P = E.P;

  // cubic Hermite through keys [t, value, slope]
  const herm = (t, K) => {
    if (t <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) {
      if (t <= K[i][0]) {
        const [t0, v0, d0] = K[i - 1], [t1, v1, d1] = K[i];
        const h = t1 - t0, s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
        return (2 * s3 - 3 * s2 + 1) * v0 + (s3 - 2 * s2 + s) * h * d0 + (-2 * s3 + 3 * s2) * v1 + (s3 - s2) * h * d1;
      }
    }
    const k = K[K.length - 1];
    return k[1] + k[2] * (t - k[0]);
  };
  const T = (i, shot) => E.T(i) - shot.start;
  const polyPath = (pts, close = true) => {
    const p = new Path2D();
    pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
    if (close) p.closePath();
    return p;
  };

  // ================================================================ world layout (designed for the hold framing)
  const FLOOR = 1100;              // the man and the mirror stand here
  const BACK = 850;                // base of the back arcade
  const VP = [565, 690];           // vanishing point (eye level)
  const MX = 650, MH = 810;        // the endam mirror (as in s16: mirror 1.5 × the man, 325 px apart)
  const MAN_H = 540, MAN_STOP = 325, CYCLE = 1.05;
  const GR = PR.mirrorGlass(MX, FLOOR, MH);
  const REF_H = GR.h * 0.8, REF_FEET = GR.y + GR.h * 0.975, REF_X = GR.cx + GR.w * 0.02;

  // ================================================================ the arrival: a dolly through the gate
  // s01's camera (kept in sync with scenes/s01.js) gives the on-screen size of the han gate during the zoom.
  const S01K = [[0, 0, 0], [1.3, 0.12, 0.16], [2.5, 1.0, 0.8], [3.3, 1.35, 0.1]];
  const z01 = (t) => Math.exp(herm(t, S01K) * Math.log(2.75));
  const Z0 = z01(2.55);
  const U0 = 3.7 * Z0;                                  // px per han unit (bigWorld r = 370) at lt = 0
  const ZT = 0.75;                                      // zoom transition (data/plan.js)
  const sAz = (lt) => 1 + 2.4 * E.ease.inOutCubic(E.clamp(lt / ZT));     // engine/main.js zoom of s01
  const sBz = (lt) => 0.55 + 0.45 * E.ease.outCubic(E.clamp(lt / ZT));   // ... and of this shot
  // camera distance s: the gate's inner door at depth 1, the mirror plane at DM, a layer at DM + d.
  // Courtyard (mirror plane) on-screen scale = C0 · e^λ with λ = ln(DM / (DM − s)).
  const DM = 1.107, C0 = 0.13, ZH = 1.07;
  const lamA = (lt) => { const md = sAz(lt) * z01(2.55 + lt) / Z0; return Math.log(DM / (DM - (1 - 1 / md))); };
  const LB = 0.45;                                      // until here the painted gate follows s01's gate exactly
  const LAM_HOLD = Math.log(ZH / C0);
  const LK = [[LB, lamA(LB), (lamA(LB + 0.004) - lamA(LB - 0.004)) / 0.008], [1.62, Math.log(1.25 / C0), 0],
    [2.42, LAM_HOLD, 0], [4.2, LAM_HOLD + 0.05, 0.012]];
  const lam = (lt) => (lt <= LB ? lamA(lt) : herm(lt, LK));
  const SH = DM * (1 - Math.exp(-LAM_HOLD));            // camera distance at the hold (every layer at zoom ZH)
  const QL = [545, 840], QH = [565, 955];               // world point under the screen anchor (540, 1010)

  function view(lt) {
    const l = lam(lt), s = DM * (1 - Math.exp(-l));
    const k = E.ep(lt, 1.56, 2.45, 'inOutSine');
    const dx = 8 * E.ep(lt, 2.6, 4.1, 'inOutSine');
    const Q = [E.lerp(QL[0], QH[0], k) + dx + 3 * E.drift(lt, 3), E.lerp(QL[1], QH[1], k) + 2 * E.drift(lt, 7)];
    return { l, s, sB: sBz(lt), Q };
  }
  /** zoom of a layer at depth DM + d (d > 0 farther than the mirror) */
  const zoomAt = (v, d) => (ZH * (DM + d - SH)) / Math.max(0.02, DM + d - v.s);
  /** put all three layers into the frame of a layer at depth DM + d (screen anchor (540, 1010)) */
  function layer(L, v, d) {
    const z = zoomAt(v, d) / v.sB;
    const tx = 540 - v.Q[0] * z, ty = 1010 - v.Q[1] * z;
    E.each(L, (c) => c.setTransform(z, 0, 0, z, tx, ty));
    return z;
  }
  const DEPTH = { cloud: 1.5, skyline: 0.6, arcade: 0.06, crowd: 0.05, floor: 0, near: -0.012 };

  // ================================================================ the man's walk (integrated, no foot sliding)
  const V0 = E.man.walkSpeed(MAN_H, CYCLE);
  const W0 = 0.45, W1 = 1.05;
  function walkRaw(lt) {
    let x = 0, ph = 0.15;
    const dt = 1 / 240, n = Math.max(0, Math.round(lt / dt));
    for (let i = 0; i < n; i++) {
      const tau = (i + 0.5) * dt;
      const k = 1 - E.smooth(E.seg(tau, W0, W1));
      const cad = 0.55 + 0.45 * k;
      x += V0 * k * cad * dt;
      ph += (cad / CYCLE) * dt;
    }
    return { x, ph, k: 1 - E.smooth(E.seg(lt, W0, W1)) };
  }
  const TOTAL = walkRaw(1.6).x;
  function manState(lt, shot) {
    const w = walkRaw(Math.min(lt, 1.6));
    const x = MAN_STOP - TOTAL + w.x;
    const st = E.smooth(E.seg(lt, 0.72, 1.15));
    let pose = E.man.lerp(E.man.pose.walk(w.ph % 1, w.k), E.man.pose.stand(), st);
    // wonder at the glowing glass, then standing tall for "endam"
    const look = E.ep(lt, T(7, shot) - 0.05, T(7, shot) + 0.6) * (1 - E.ep(lt, T(9, shot) - 0.2, T(9, shot) + 0.5));
    pose = E.man.lerp(pose, E.man.pose.lookUp(0.16), look * 0.8);
    pose.lean = (pose.lean || 0) + 0.006 * Math.sin(lt * 1.9) * st;
    return { x, pose };
  }

  // ================================================================ architecture helpers
  /** pointed (Ottoman) arch outline: opening half-width hw, springline y = spring, bottom yb */
  function archPts(cx, hw, spring, yb, k = 0.35, n = 14) {
    const d = k * hw, R = hw + d;
    const thA = Math.acos(d / R);
    const pts = [[cx - hw, yb], [cx - hw, spring]];
    for (let i = 1; i <= n; i++) { const a = Math.PI - thA * (i / n); pts.push([cx + d + Math.cos(a) * R, spring - Math.sin(a) * R]); }
    for (let i = 1; i <= n; i++) { const a = thA - thA * (i / n); pts.push([cx - d + Math.cos(a) * R, spring - Math.sin(a) * R]); }
    pts.push([cx + hw, yb]);
    return pts;
  }
  /** the han's arch construction (props-a archPts): springline ys, half-width hw, rise, bottom yb */
  function archH(cx, ys, hw, rise, yb, n = 10) {
    const Rr = (hw * hw + rise * rise) / (2 * hw);
    const cxl = cx - hw + Rr;
    const aEnd = Math.atan2(-rise, cx - cxl) + E.TAU;
    const left = [];
    for (let i = 0; i <= n; i++) { const a = Math.PI + (aEnd - Math.PI) * (i / n); left.push([cxl + Rr * Math.cos(a), ys + Rr * Math.sin(a)]); }
    const pts = [[cx - hw, yb]].concat(left);
    for (let i = n - 1; i >= 0; i--) pts.push([2 * cx - left[i][0], left[i][1]]);
    pts.push([cx + hw, yb]);
    return pts;
  }
  const inPoly = (pts, x, y) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };

  const ARCH_X = [-450, -230, -10, 210, 430, 650, 870, 1090, 1310, 1530];
  const AR = { hw: 80, spring: 575, bottom: BACK };

  // ================================================================ sky (static: painted once into an offscreen canvas)
  let SKY = null;
  function sky(L) {
    if (!SKY) {
      const cv = document.createElement('canvas');
      cv.width = E.W; cv.height = E.H;
      const p = cv.getContext('2d');
      p.fillStyle = '#ffffff';
      p.fillRect(0, 0, E.W, E.H);
      E.skyWash(p, E.shade(E.mix(P.cerulean, P.ultramarine, 0.25), 0.34), E.shade(P.ochre, 0.62), { mid: E.shade(P.skyWash, 0.55), seed: 21, mottle: 0.15 });
      E.bloom(p, 140, 140, 300, E.shade(P.gamboge, 0.35), { seed: 4, alpha: 0.3, soft: 80, irr: 0.3 });
      E.bloom(p, 900, 120, 240, E.shade(P.ultramarine, 0.35), { seed: 5, alpha: 0.18, soft: 24, irr: 0.35 });
      E.bloom(p, 420, 300, 200, E.shade(P.cerulean, 0.25), { seed: 6, alpha: 0.14, soft: 22, irr: 0.35 });
      E.bloom(p, 700, 520, 260, E.shade(P.cerulean, 0.3), { seed: 7, alpha: 0.12, soft: 26, irr: 0.35 });
      SKY = cv;
    }
    E.each(L, (c) => c.setTransform(1, 0, 0, 1, 0, 0));
    L.paint.drawImage(SKY, 0, 0);
  }

  function skyline(L, lt) {
    // the han's great ribbed dome and a corner tower rising above the courtyard wall (as in s01)
    const p = L.paint;
    const dx = 250, dy = 352;
    const drum = E.wobblyShape([[dx - 118, dy + 10], [dx - 112, dy - 52], [dx + 112, dy - 52], [dx + 118, dy + 10]], { seed: 3, amp: 1.5 });
    E.wash(p, drum, '#E9DCC4', { mode: 'over' });
    E.wash(p, drum, E.shade(P.sienna, 0.55), { alpha: 0.35, grad: { from: [dx - 118, 0], to: [dx + 118, 0], c2: E.shade(P.umber, 0.25) } });
    for (let i = -3; i <= 3; i++) {
      const wx = dx + i * 30;
      E.wash(p, polyPath(archPts(wx, 8, dy - 30, dy - 4, 0.3, 5)), E.shade(P.umber, 0.1), { alpha: 0.5 });
    }
    const domePts = [];
    for (let i = 0; i <= 40; i++) {
      const a = Math.PI + Math.PI * (i / 40);
      const r = 108, k = 1 + 0.12 * Math.pow(Math.max(0, -Math.sin(a)), 6);
      domePts.push([dx + Math.cos(a) * r, dy - 52 + Math.sin(a) * r * 1.02 * k]);
    }
    const dome = E.smoothPath(domePts, true);
    E.wash(p, dome, '#4E9C93', { mode: 'over' });
    E.wash(p, dome, '#3A7E78', { alpha: 0.4, grad: { from: [dx - 110, 0], to: [dx + 110, 0], c2: '#24585A' } });
    E.lift(p, E.blob(dx - 46, dy - 112, 20, { seed: 7, rx: 16, ry: 40, rot: 0.25, irr: 0.15 }), 0.6, 4);
    E.lift(p, E.blob(dx - 20, dy - 140, 10, { seed: 8, rx: 8, ry: 16, rot: 0.2, irr: 0.15 }), 0.45, 2);
    for (let i = -3; i <= 3; i++) {
      const f = i / 4;
      const pts = [];
      for (let j = 0; j <= 14; j++) { const v = j / 14; const ang = v * Math.PI / 2; pts.push([dx + f * 108 * Math.cos(ang), dy - 52 - 112 * Math.sin(ang)]); }
      E.pencil(L.ink, pts, { w: 1.2, a: 0.28, double: false });
      E.wash(p, polyPath([...pts.map((q) => [q[0] - 2.5, q[1]]), ...pts.slice().reverse().map((q) => [q[0] + 2.5, q[1]])]), '#1F4E4C', { alpha: 0.25 });
    }
    E.pencil(L.ink, dome, { w: 1.4, a: 0.35 });
    E.pencil(L.ink, [[dx, dy - 166], [dx, dy - 200]], { w: 2.4, a: 0.6, double: false });
    E.wash(p, E.blob(dx, dy - 176, 6, { seed: 2, irr: 0.05 }), P.gold, { mode: 'over' });
    const cr = new Path2D();
    cr.arc(dx, dy - 212, 11, 0, E.TAU);
    const cr2 = new Path2D();
    cr2.arc(dx + 5, dy - 215, 9, 0, E.TAU);
    p.save(); p.clip(cr); E.wash(p, cr, P.gold, { mode: 'over' }); E.lift(p, cr2, 1); p.restore();
    // right corner tower (blue dome), partly out of frame, with a fluttering flag
    const tx = 1040;
    const tw = E.wobblyShape([[tx - 62, 400], [tx - 60, 250], [tx + 60, 250], [tx + 62, 400]], { seed: 9, amp: 1.5 });
    E.wash(p, tw, '#ECE1CC', { mode: 'over' });
    E.wash(p, tw, E.shade(P.umber, 0.4), { alpha: 0.3, grad: { from: [tx - 60, 0], to: [tx + 60, 0], c2: E.shade(P.umber, 0.1) } });
    const td = E.smoothPath([[tx - 70, 252], [tx - 64, 205], [tx - 30, 172], [tx, 160], [tx + 30, 172], [tx + 64, 205], [tx + 70, 252]], true);
    E.wash(p, td, '#4D63A0', { mode: 'over' });
    E.wash(p, td, '#2F4170', { alpha: 0.45, grad: { from: [tx - 70, 0], to: [tx + 70, 0], c2: '#22305A' } });
    E.lift(p, E.blob(tx - 30, 200, 9, { seed: 4, rx: 7, ry: 18, rot: 0.4 }), 0.5, 2);
    E.pencil(L.ink, td, { w: 1.3, a: 0.32 });
    E.pencil(L.ink, tw, { w: 1.2, a: 0.25 });
    const fx = tx, fy = 160;
    E.pencil(L.ink, [[fx, fy], [fx, fy - 70]], { w: 2, a: 0.55, double: false });
    const fl = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8; fl.push([fx + u * 62, fy - 68 + Math.sin(lt * 6 - u * 4) * 5 * u]); }
    for (let i = 8; i >= 0; i--) { const u = i / 8; fl.push([fx + u * 56, fy - 46 + Math.sin(lt * 6 - u * 4) * 5 * u - u * 8]); }
    E.wash(p, E.smoothPath(fl, true), '#C9474A', { mode: 'over' });
  }

  function arcade(L, lt) {
    const p = L.paint, ink = L.ink;
    const top = 382, cor = 404, X0 = -620, X1 = 1720;
    const wall = E.wobblyShape([[X0, top], [X1, top], [X1, BACK + 70], [X0, BACK + 70]], { seed: 11, amp: 1.2 });
    E.wash(p, wall, '#F0E6D3', { mode: 'over' });
    E.wash(p, wall, E.shade(P.sienna, 0.62), { alpha: 0.35, grad: { from: [0, top], to: [1080, BACK], c2: E.shade(P.umber, 0.55) } });
    E.wash(p, E.wobblyShape([[X0, cor + 18], [X1, cor + 18], [X1, cor + 54], [X0, cor + 40]], { seed: 12, amp: 3 }), E.shade(P.lavender, 0.35), { alpha: 0.4, soft: 6 });
    // merlons
    for (let x = X0 + 20; x < X1; x += 56) {
      const m = E.rrect(x, top - 30, 36, 34, 10);
      E.wash(p, m, '#EEE3CE', { mode: 'over' });
      E.wash(p, m, E.shade(P.umber, 0.45), { alpha: 0.25, grad: { from: [x, 0], to: [x + 36, 0], c2: E.shade(P.umber, 0.2) } });
      E.pencil(ink, m, { w: 1, a: 0.2, double: false });
    }
    // cornice band with tezhip dots
    const band = E.wobblyShape([[X0, top], [X1, top], [X1, cor + 16], [X0, cor + 16]], { seed: 13, amp: 0.8 });
    E.wash(p, band, E.shade(P.ochre, 0.25), { alpha: 0.7 });
    E.pencil(ink, [[X0 + 20, top + 2], [X1 - 20, top + 2]], { w: 1.1, a: 0.3, double: false });
    E.pencil(ink, [[X0 + 20, cor + 16], [X1 - 20, cor + 16]], { w: 1.1, a: 0.3, double: false });
    const dotsA = new Path2D(), dotsB = new Path2D();
    for (let x = X0 + 30, i = 0; x < X1 - 20; x += 26, i++) {
      (i % 2 ? dotsA : dotsB).addPath(E.blob(x, top + 12.5, 3.6, { seed: 7 + (i % 5), irr: 0.1, n: 10 }));
    }
    E.wash(p, dotsA, '#B3473F', { alpha: 0.7 });
    E.wash(p, dotsB, '#2F6E6A', { alpha: 0.7 });
    // arches (ablaq voussoirs, deep warm openings, a glimpse of the gallery behind)
    for (const [i, ax] of ARCH_X.entries()) {
      const outer = archPts(ax, AR.hw + 18, AR.spring, BACK, 0.35);
      const inner = archPts(ax, AR.hw, AR.spring, BACK, 0.35);
      const op = polyPath(inner);
      E.wash(p, polyPath(outer), '#EFE2CB', { mode: 'over' });
      const n = 11;
      for (let k = 0; k < n; k += 2) {
        const a0 = 2 + Math.floor((k / n) * (outer.length - 4)), a1 = 2 + Math.floor(((k + 1) / n) * (outer.length - 4));
        const sg = [];
        for (let j = a0; j <= a1; j++) sg.push(outer[j]);
        for (let j = a1; j >= a0; j--) sg.push(inner[Math.min(inner.length - 1, j)]);
        E.wash(p, polyPath(sg), P.terracotta, { alpha: 0.42 });
      }
      E.wash(p, op, '#FFFFFF', { mode: 'over' });
      E.wash(p, op, E.mix(P.umber, P.lavender, 0.45), { alpha: 0.78, grad: { from: [0, AR.spring - 110], to: [0, BACK], c2: E.shade(E.mix(P.sienna, P.lavender, 0.3), 0.25) } });
      E.wash(p, E.wobblyShape([[ax - AR.hw, BACK - 70], [ax + AR.hw, BACK - 52], [ax + AR.hw, BACK], [ax - AR.hw, BACK]], { seed: 30 + i, amp: 3 }), E.shade(P.ochre, 0.4), { alpha: 0.5 });
      E.wash(p, polyPath(archPts(ax + 10, AR.hw * 0.55, AR.spring + 70, BACK - 40, 0.35, 8)), E.shade(P.umber, 0.0), { alpha: 0.25 });
      E.pencil(ink, polyPath(outer, false), { w: 1.3, a: 0.3, seed: i });
      E.pencil(ink, polyPath(inner, false), { w: 1.1, a: 0.25, seed: i + 9 });
      E.wash(p, E.wobblyShape([[ax + AR.hw + 18, AR.spring - 20], [ax + AR.hw + 36, AR.spring], [ax + AR.hw + 36, BACK], [ax + AR.hw + 18, BACK]], { seed: 40 + i, amp: 1 }), E.shade(P.lavender, 0.3), { alpha: 0.3 });
    }
    E.wash(p, E.wobblyShape([[X0, BACK - 10], [X1, BACK - 10], [X1, BACK + 8], [X0, BACK + 8]], { seed: 15, amp: 1 }), E.shade(P.umber, 0.35), { alpha: 0.35 });
    E.wash(p, E.wobblyShape([[X0, BACK + 8], [X1, BACK + 8], [X1, BACK + 70], [X0, BACK + 70]], { seed: 16, amp: 1 }), E.shade(P.umber, 0.5), { alpha: 0.3 });
    E.pencil(ink, [[X0 + 20, BACK + 6], [X1 - 20, BACK + 6]], { w: 1.2, a: 0.3, double: false });
  }

  function floor(L) {
    const p = L.paint, ink = L.ink;
    const fl = polyPath([[-700, BACK + 4], [1800, BACK + 4], [1800, 2700], [-700, 2700]]);
    E.wash(p, fl, '#F4EBD9', { mode: 'over' });
    E.wash(p, fl, E.shade(P.ochre, 0.5), { alpha: 0.5, grad: { from: [0, BACK], to: [0, 1500], c2: E.shade(P.sienna, 0.52) } });
    // the sunlit middle of the courtyard (paper), the near floor sinking into a soft cool shade (calm, no edges
    // under the subtitles)
    E.lift(p, E.blob(470, 985, 200, { seed: 5, rx: 700, ry: 115, rot: -0.04, irr: 0.25 }), 0.42, 36);
    // a few paving slabs of slightly different stone (perspective quads, very low contrast)
    const slab = (i, j) => {
      const yA = VP[1] + (BACK + 6 - VP[1]) / (1 - j * 0.088), yB = VP[1] + (BACK + 6 - VP[1]) / (1 - (j + 1) * 0.088);
      const xAt = (xb, y) => VP[0] + (xb - VP[0]) * ((y - VP[1]) / (2000 - VP[1]));
      const x0 = VP[0] + i * 150, x1 = x0 + 150;
      return polyPath([[xAt(x0, yA), yA], [xAt(x1, yA), yA], [xAt(x1, yB), yB], [xAt(x0, yB), yB]]);
    };
    for (const [i, j, c, a] of [[-3, 1, P.sienna, 0.1], [1, 1, P.rose, 0.07], [-1, 2, P.ochre, 0.1], [2, 3, P.sienna, 0.08], [-4, 3, P.lavender, 0.08], [0, 4, P.ochre, 0.07], [3, 5, P.rose, 0.06], [-2, 5, P.sienna, 0.06]]) {
      E.wash(p, slab(i, j), E.shade(c, 0.45), { alpha: a });
    }
    // the near floor lies in the cool shade of the gate behind us: a smooth gradient through the subtitle band,
    // its soft wavy edge only below it
    p.save();
    p.globalCompositeOperation = 'multiply';
    const sg = p.createLinearGradient(0, 1130, 0, 1720);
    sg.addColorStop(0, E.rgba(E.shade(P.lavender, 0.55), 0));
    sg.addColorStop(0.55, E.rgba(E.shade(P.lavender, 0.45), 0.6));
    sg.addColorStop(1, E.rgba(E.shade(E.mix(P.lavender, P.ultramarine, 0.3), 0.32), 0.85));
    p.fillStyle = sg;
    p.fill(polyPath([[-700, 1130], [1800, 1130], [1800, 2700], [-700, 2700]]));
    p.restore();
    // (a hard drying edge; no soft: blur, which Chromium clips on shapes this wide)
    E.wash(p, E.wobblyShape([[-260, 1540], [1360, 1508], [1360, 2160], [-260, 2160]], { seed: 6, amp: 12, freq: 0.006, step: 40 }),
      E.shade(E.mix(P.lavender, P.ultramarine, 0.35), 0.4), { alpha: 0.26 });
    E.bloom(p, 900, 1650, 330, E.shade(P.rose, 0.5), { seed: 9, alpha: 0.13, soft: 60 });
    E.bloom(p, 150, 1580, 300, E.shade(P.ultramarine, 0.5), { seed: 10, alpha: 0.12, soft: 60 });
    E.bloom(p, 560, 1900, 380, E.shade(P.gamboge, 0.5), { seed: 11, alpha: 0.1, soft: 70 });
    E.bloom(p, 470, 1180, 260, E.shade(P.gamboge, 0.55), { seed: 14, alpha: 0.12, soft: 50 });
    // paving: lines to the vanishing point, courses widening towards us (faint, fading downward)
    for (let i = -11; i <= 11; i++) {
      const xb = VP[0] + i * 150;
      const x0 = VP[0] + (xb - VP[0]) * ((BACK + 6 - VP[1]) / (2000 - VP[1]));
      E.pencil(ink, [[x0, BACK + 6], [xb, 2000]], { w: 1, a: 0.09, double: false, seed: i + 20 });
    }
    for (let k = 1; k <= 9; k++) {
      const y = VP[1] + (BACK + 6 - VP[1]) / (1 - k * 0.088);
      if (y > 1900) break;
      E.pencil(ink, [[-600, y], [1700, y + (k % 2 ? 2 : -2)]], { w: 1, a: 0.11 * (y < 1200 ? 1 : 0.5), double: false, seed: k });
    }
  }

  function pot(L, x, y, w, h, seed) {
    const p = L.paint;
    const pp = E.wobblyShape([[x - w / 2, y - h], [x + w / 2, y - h], [x + w * 0.36, y], [x - w * 0.36, y]], { seed, amp: 1.2 });
    E.wash(p, E.blob(x + w * 0.3, y + 2, w * 0.6, { rx: w * 0.75, ry: 11, seed, irr: 0.05 }), '#8F8C9C', { alpha: 0.3, soft: 6 });
    E.wash(p, pp, '#D58B66', { mode: 'over' });
    E.wash(p, pp, P.terracotta, { alpha: 0.6, grad: { from: [x - w / 2, 0], to: [x + w / 2, 0], c2: E.shade(P.terracotta, -0.4) } });
    const rim = E.rrect(x - w * 0.56, y - h - 14, w * 1.12, 18, 6);
    E.wash(p, rim, '#DE9A74', { mode: 'over' });
    E.wash(p, rim, E.shade(P.terracotta, -0.2), { alpha: 0.4, grad: { from: [x - w / 2, 0], to: [x + w / 2, 0], c2: E.shade(P.terracotta, -0.5) } });
    E.pencil(L.ink, pp, { w: 1.2, a: 0.3 });
    E.pencil(L.ink, rim, { w: 1.1, a: 0.3, double: false });
  }

  // ================================================================ the han gate we fly through (s01's design)
  // Han units (bigWorld R = 100), y relative to the façade foot; the gate centre (−8.2) sits on the zoom point.
  const GATE_D = 0.03;                     // the portal face stands this much nearer than the inner door
  const HC = { stone: '#F2E4C8', stoneW: '#ECD9B6', stoneD: '#B49A80', dome: '#78B5B0', domeD: '#3F8087' };
  const G = (() => {
    const g = {};
    g.door = archH(0, -10.4, 4.8, 7.0, 1.7, 18);
    g.doorFrame = polyPath(archH(0, -10.4, 5.7, 8.0, 1.7, 12));
    g.arch = polyPath(archH(0, -17.5, 8.0, 13.2, 1.6, 14));
    g.rim = polyPath(archH(0, -17.5, 9.2, 14.6, 1.6, 14));
    g.portal = polyPath([[-15, -38.5], [15, -38.5], [15, 2.2], [-15, 2.2]]);
    g.cornice = polyPath([[-16.2, -38.9], [16.2, -38.9], [16.2, -37.1], [-16.2, -37.1]]);
    g.corniceSh = polyPath([[-15, -37.1], [15, -37.1], [15, -36.2], [-15, -36.2]]);
    g.frame = polyPath([[-12.2, -35.4], [12.2, -35.4], [12.2, 1.6], [-12.2, 1.6]]);
    g.wings = polyPath([[-400, -22], [-14, -22], [-14, 2.6], [-400, 2.6]]);
    g.wings.addPath(polyPath([[14, -22], [400, -22], [400, 2.6], [14, 2.6]]));
    g.wingCornice = polyPath([[-400, -22.3], [400, -22.3], [400, -20.7], [-400, -20.7]]);
    g.drum = polyPath([[-11.2, -38], [11.2, -38], [11.2, -42.4], [-11.2, -42.4]]);
    const dome = (cx, y0, rw, rh) => {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const a = Math.PI + Math.PI * (i / 24), sn = -Math.sin(a);
        pts.push([cx + Math.cos(a) * rw * (1 - 0.06 * Math.pow(sn, 10)), y0 - sn * rh * (1 + 0.1 * Math.pow(sn, 14))]);
      }
      return polyPath(pts.concat([[cx + rw, y0 + 0.6], [cx - rw, y0 + 0.6]]));
    };
    g.domeC = dome(0, -42.2, 11.6, 13.4);
    g.domeW = [dome(-26.5, -22.4, 6.6, 8.2), dome(26.5, -22.4, 6.6, 8.2)];
    const dots = new Path2D();
    for (let i = 0; i < 9; i++) { const x = -11.4 + (i / 8) * 22.8; dots.moveTo(x + 0.42, -34.5); dots.arc(x, -34.5, 0.42, 0, E.TAU); }
    for (let i = 0; i < 12; i++) {
      const y = -32.7 + (i / 11) * (32.7 - 1.2);
      for (const x of [-11.4, 11.4]) { dots.moveTo(x + 0.38, y); dots.arc(x, y, 0.38, 0, E.TAU); }
    }
    g.dots = dots;
    const mq = new Path2D(), mqF = new Path2D();
    for (let row = 0; row < 3; row++) {
      const y = -(25.2 + row * 1.7), nn = Math.round(6 - row * 1.5), w = 2.25;
      for (let i = 0; i < nn; i++) {
        const x = (i - (nn - 1) / 2) * w;
        mq.moveTo(x - w / 2, y); mq.lineTo(x - w / 2, y - 0.5);
        mq.quadraticCurveTo(x - w / 2, y - 1.6, x, y - 1.75);
        mq.quadraticCurveTo(x + w / 2, y - 1.6, x + w / 2, y - 0.5);
        mq.lineTo(x + w / 2, y);
        mqF.addPath(polyPath([[x - w / 2 + 0.25, y], [x - w / 2 + 0.25, y - 0.5], [x, y - 1.45], [x + w / 2 - 0.25, y - 0.5], [x + w / 2 - 0.25, y]]));
      }
    }
    g.muq = mq; g.muqF = mqF;
    g.jamb = polyPath([[2.6, -29.6], [8, -17.5], [8, 1.6], [3.4, 1.6]]);
    g.ground = polyPath([[-400, 1.4], [400, 1.4], [400, 400], [-400, 400]]);
    g.forecourt = polyPath([[-4.6, 1.2], [4.6, 1.2], [9.5, 6.5], [-9.5, 6.5]]);
    g.road = polyPath([[-3.4, 1.4], [3.4, 1.4], [9, 40], [-9, 40]]);
    return g;
  })();

  /** px per han unit (in this shot's canvas) of a gate plane at depth dep (1 = inner door) */
  const gateK = (v, dep) => (dep - v.s > 1e-4 ? (U0 * dep) / (dep - v.s) / v.sB : Infinity);

  function gate(L, v, lt) {
    // the portal face sits on the door plane while s01's gate is still cross-fading (no double image), then
    // steps forward to its own depth so it sweeps past faster than the inner door (parallax)
    const kd = gateK(v, 1), kp = gateK(v, 1 - GATE_D * E.ep(lt, 0.42, 0.78, 'inOutSine'));
    if (!isFinite(kd)) return;
    const toB = (k) => ([x, y]) => [540 + x * k, 1010 + (y + 8.2) * k];
    const door = G.door.map(toB(kd));
    if ([[-4, -4], [E.W + 4, -4], [-4, E.H + 4], [E.W + 4, E.H + 4]].every(([x, y]) => inPoly(door, x, y))) return;
    const out = new Path2D();
    out.rect(-300, -300, E.W + 600, E.H + 600);
    out.addPath(polyPath(door));
    const p = L.paint, ink = L.ink;
    E.save(L);
    E.each(L, (c) => { c.setTransform(1, 0, 0, 1, 0, 0); c.clip(out, 'evenodd'); });
    for (const c of [ink, L.light]) { c.save(); c.globalCompositeOperation = 'destination-out'; c.fillRect(-10, -10, E.W + 20, E.H + 20); c.restore(); }
    const set = (k) => E.each(L, (c) => c.setTransform(k, 0, 0, k, 540, 1010 + 8.2 * k));
    const pen = (path, k, a = 0.3, w = 1.3) => E.pencil(ink, path, { w: w / k, a, double: false });
    // ---------------- portal plane
    if (isFinite(kp)) {
      set(kp);
      // the green hill and the road climbing to the gate, a warm pool of gate light on the forecourt
      E.wash(p, G.ground, '#C3D88F', { mode: 'over' });
      E.wash(p, G.ground, '#ffffff', { grad: { from: [0, 1.4], to: [0, 26], stops: [[0, E.rgba('#9CBF72', 0.15)], [1, E.rgba('#6E9F5D', 0.55)]] } });
      E.bloom(p, -14, 9, 6, '#7FA463', { seed: 31, alpha: 0.3, soft: 1.6, irr: 0.3 });
      E.bloom(p, 15, 12, 7, '#8DB06C', { seed: 32, alpha: 0.28, soft: 1.8, irr: 0.3 });
      E.wash(p, G.road, '#F1E3C2', { mode: 'over' });
      E.wash(p, G.road, '#BCA077', { alpha: 0.3, grad: { from: [0, 1.4], to: [0, 30], c2: '#E3CFA4' } });
      E.wash(p, E.blob(0, 3.6, 7, { rx: 9, ry: 3.2, seed: 33, irr: 0.15 }), '#F6C35E', { alpha: 0.32, soft: 1.6 });
      for (const [bx, br] of [[-19.5, 2.4], [-27, 2.2], [10.5, 1.9], [20.5, 2.3], [30, 2.4]]) {
        const b = E.blob(bx, 2.6 - br * 0.55, br, { seed: Math.round(bx * 10) + 400, irr: 0.18, rx: br * 1.25, ry: br, n: 14 });
        E.wash(p, b, '#6E9F5D', { mode: 'over' });
        E.wash(p, E.blob(bx + br * 0.35, 2.6 - br * 0.3, br * 0.8, { seed: Math.round(bx * 10) + 401, irr: 0.2, n: 12 }), '#3E6A4C', { alpha: 0.4 });
        pen(b, kp, 0.2, 1);
      }
      // central dome over the portal, the side domes over the wings
      E.wash(p, G.domeC, HC.dome, { mode: 'over' });
      E.wash(p, G.domeC, HC.domeD, { alpha: 0.5, grad: { from: [-11.6, 0], to: [11.6, 0], c2: '#2E6468' } });
      E.lift(p, polyPath([[-4.6, -43], [-5.6, -48.5], [-3.2, -54], [-2.5, -48.5], [-2.9, -43]]), 0.45);
      E.wash(p, G.drum, HC.stoneW, { mode: 'over' });
      E.wash(p, G.drum, HC.stoneD, { alpha: 0.35, grad: { from: [-11.2, 0], to: [11.2, 0], c2: E.shade(HC.stoneD, -0.2) } });
      for (const d of G.domeW) {
        E.wash(p, d, HC.dome, { mode: 'over' });
        E.wash(p, d, HC.domeD, { alpha: 0.42 });
      }
      // wings, portal, cornices
      E.wash(p, G.wings, HC.stone, { mode: 'over' });
      E.wash(p, G.wings, '#A99AB5', { alpha: 0.4, grad: { from: [0, -10], to: [0, 2.6], c2: '#A99AB5' } });
      E.wash(p, G.wingCornice, HC.stoneW, { mode: 'over' });
      E.wash(p, G.portal, HC.stoneW, { mode: 'over' });
      E.wash(p, G.portal, '#A99AB5', { alpha: 0.36, grad: { from: [0, -14], to: [0, 2.2], c2: '#A99AB5' } });
      E.wash(p, G.cornice, HC.stoneW, { mode: 'over' });
      E.wash(p, G.corniceSh, HC.stoneD, { alpha: 0.45 });
      E.wash(p, G.frame, '#EDD3A8', { mode: 'over' });
      E.wash(p, G.dots, '#B5774C', { alpha: 0.8 });
      for (const x of [-8.7, 8.7]) {
        const c1 = new Path2D(); c1.arc(x, -30.4, 1.45, 0, E.TAU);
        const c2 = new Path2D(); c2.arc(x, -30.4, 0.55, 0, E.TAU);
        E.wash(p, c1, '#5E8FA0', { mode: 'over', alpha: 0.9 });
        E.wash(p, c2, P.gold, { mode: 'over' });
      }
      // the iwan: rim, warm lit niche (soffit) with the muqarnas hood
      E.wash(p, G.rim, '#E3C79A', { mode: 'over' });
      // soffit: warm stone lit by the courtyard light through the door, deepening into shade away from it
      E.wash(p, G.arch, '#DDBB88', { mode: 'over' });
      E.wash(p, G.arch, '#ffffff', { grad: { from: [0, -8], r0: 4.5, r: 24, stops: [[0, E.rgba('#9A7052', 0)], [0.3, E.rgba('#9A7052', 0.22)], [1, E.rgba('#5E4034', 0.72)]] } });
      E.wash(p, G.arch, '#ffffff', { grad: { from: [0, -30.7], to: [0, -15], stops: [[0, E.rgba('#4E3A31', 0.32)], [1, E.rgba('#4E3A31', 0)]] } });
      E.wash(p, G.arch, '#ffffff', { grad: { from: [1.5, 0], to: [8, 0], stops: [[0, E.rgba('#5A4038', 0)], [1, E.rgba('#5A4038', 0.3)]] } });
      E.bloom(p, -5, -19, 4.2, '#B9805A', { seed: 34, alpha: 0.18, soft: 1.3, irr: 0.35 });
      E.bloom(p, 4.6, -4, 3.6, '#C08A86', { seed: 35, alpha: 0.14, soft: 1.2, irr: 0.35 });
      E.bloom(p, -6, -3, 2.6, '#E8C27A', { seed: 36, alpha: 0.22, soft: 1, irr: 0.35 });
      // masonry courses of the iwan, faint pencil
      ink.save();
      ink.clip(G.arch);
      const crs = new Path2D();
      for (let i = 0; i < 13; i++) {
        const y = -29 + i * 2.35;
        crs.moveTo(-9, y); crs.lineTo(9, y);
        for (let j = 0; j < 7; j++) { const x = -8.4 + j * 2.8 + (i % 2) * 1.4; crs.moveTo(x, y); crs.lineTo(x, y + 2.35); }
      }
      E.pencil(ink, crs, { w: 0.9 / kp, a: 0.12, double: false });
      ink.restore();
      E.wash(p, G.muqF, E.mix('#CDB08E', '#F3D9A4', 0.6), { mode: 'over' });
      E.wash(p, G.muqF, '#5E4638', { alpha: 0.18 });
      pen(G.portal, kp, 0.32); pen(G.frame, kp, 0.24); pen(G.rim, kp, 0.26); pen(G.arch, kp, 0.34);
      pen(G.domeC, kp, 0.32); pen(G.wings, kp, 0.28); pen(G.muq, kp, 0.22, 0.9);
      // the gate lantern swinging overhead as we pass under it
      PR.lantern(L, 0, -29.4, 3.3, { t: lt + 2.55, lit: 1, chain: 4.4, seed: 11 });
    }
    // ---------------- iwan floor between the portal and the inner door (two depths)
    E.each(L, (c) => c.setTransform(1, 0, 0, 1, 0, 0));
    if (isFinite(kp)) {
      const a = toB(kp), b = toB(kd);
      const fq = polyPath([a([-8, 1.6]), a([8, 1.6]), b([5.7, 1.7]), b([-5.7, 1.7])]);
      const y0 = a([0, 1.6])[1], y1 = b([0, 1.7])[1];
      E.wash(p, fq, '#EBD6AE', { mode: 'over' });
      if (y0 - y1 > 2) {
        E.wash(p, fq, '#ffffff', { grad: { from: [0, y1], to: [0, y0], stops: [[0, E.rgba('#F3D59A', 0.25)], [1, E.rgba('#8A6A55', 0.45)]] } });
        for (let i = 1; i < 6; i++) {
          const u = Math.pow(i / 6, 1.6), yy = E.lerp(y1, y0, u);
          E.pencil(ink, [[-200, yy], [E.W + 200, yy]], { w: 1, a: 0.1, double: false });
        }
      }
    }
    // ---------------- inner door plane: the lit door frame
    set(kd);
    E.wash(p, G.doorFrame, E.mix('#C6A47E', '#F0CB86', 0.6), { mode: 'over' });
    pen(G.doorFrame, kd, 0.3);
    pen(polyPath(G.door), kd, 0.36);
    // warm light round the opening, fading as we pass through
    const ga = 1 - E.ep(lt, 0.4, 1.0);
    if (ga > 0) E.glow(L.light, 0, -8.2, 15, '#FFE0A0', 0.42 * ga);
    E.restore(L);
  }

  // ================================================================ his life, seen inside the glass
  function lifeInGlass(L, r, lt, k) {
    if (k <= 0.01) return;
    const p = L.paint, ink = L.ink;
    const q = r.w / 330;                              // detail unit (designed for a 330 px wide glass)
    const cx = r.cx, chest = REF_FEET - REF_H * 0.62;
    E.save(L);
    E.alpha(L, k);
    // the glass lights up from within: a luminous warm ground
    E.wash(p, E.rrect(r.x - 10, r.y - 10, r.w + 20, r.h + 20, 0), '#FFF8EA', { mode: 'over' });
    const hz = r.y + r.h * 0.6;
    E.wash(p, E.rrect(r.x - 10, r.y - 10, r.w + 20, hz - r.y + 30, 0), '#ffffff', {
      grad: { r: r.h * 0.62, from: [cx, chest - 40 * q], stops: [[0, E.rgba('#FFF2D2', 1)], [0.45, E.rgba('#F6D7A8', 1)], [1, E.rgba('#E3B7B6', 1)]] }, alpha: 0.85 });
    // distant hills, a meadow, and the road of his life winding up to a little home
    E.wash(p, E.smoothPath([[r.x - 20, hz + 6], [r.x + r.w * 0.22, hz - 22 * q], [r.x + r.w * 0.55, hz - 6 * q], [r.x + r.w * 0.85, hz - 26 * q], [r.x + r.w + 20, hz - 16 * q], [r.x + r.w + 20, hz + 60], [r.x - 20, hz + 60]], true),
      E.shade(P.lavender, 0.45), { alpha: 0.5 });
    const meadow = E.smoothPath([[r.x - 20, hz + 14 * q], [r.x + r.w * 0.35, hz + 2 * q], [r.x + r.w * 0.75, hz + 12 * q], [r.x + r.w + 20, hz + 4 * q], [r.x + r.w + 20, r.y + r.h + 20], [r.x - 20, r.y + r.h + 20]], true);
    E.wash(p, meadow, E.shade(P.sap, 0.35), { alpha: 0.75 });
    E.wash(p, meadow, E.shade(P.leaf, 0.2), { alpha: 0.35, grad: { from: [0, hz], to: [0, r.y + r.h], c2: E.shade(P.leaf, -0.1) } });
    // (it starts at his feet and keeps to his side, so his legs read clearly against the meadow)
    const roadC = [[cx - 20 * q, r.y + r.h + 10], [cx + 40 * q, REF_FEET - 30 * q], [cx + 100 * q, REF_FEET - 120 * q], [cx + 78 * q, hz + 60 * q], [cx + 96 * q, hz + 22 * q], [cx + 92 * q, hz + 8 * q]];
    const rw = (i) => (34 * Math.pow(1 - i / (roadC.length - 1), 1.3) + 2) * q;
    const sideA = roadC.map((c, i) => [c[0] - rw(i), c[1]]), sideB = roadC.map((c, i) => [c[0] + rw(i), c[1]]).reverse();
    const road = E.smoothPath([...sideA, ...sideB], true, 0.45);
    E.wash(p, road, '#F7EBD3', { mode: 'over' });
    E.wash(p, road, E.shade(P.ochre, 0.45), { alpha: 0.45 });
    E.pencil(ink, E.smoothPath(sideA, false), { w: 1, a: 0.3, double: false });
    E.pencil(ink, E.smoothPath(sideB.slice().reverse(), false), { w: 1, a: 0.3, double: false });
    const hx = cx + 92 * q, hy = hz + 8 * q, hs = q;
    const wall = polyPath([[hx - 18 * hs, hy], [hx - 18 * hs, hy - 18 * hs], [hx + 18 * hs, hy - 18 * hs], [hx + 18 * hs, hy]]);
    E.wash(p, wall, '#F6EEDF', { mode: 'over' });
    E.wash(p, polyPath([[hx - 23 * hs, hy - 16 * hs], [hx, hy - 34 * hs], [hx + 23 * hs, hy - 16 * hs]]), '#B9654F', { mode: 'over' });
    E.wash(p, E.rrect(hx - 5 * hs, hy - 11 * hs, 8 * hs, 11 * hs, 1.5), '#E9A84E', { mode: 'over' });
    E.pencil(ink, wall, { w: 1, a: 0.35, double: false });
    E.pencil(ink, [[hx - 48 * hs, hy], [hx - 48 * hs, hy - 16 * hs]], { w: 2, a: 0.5, double: false });
    E.wash(p, E.blob(hx - 48 * hs, hy - 30 * hs, 17 * hs, { seed: 3, irr: 0.15 }), P.leaf, { mode: 'over' });
    E.wash(p, E.blob(hx - 44 * hs, hy - 26 * hs, 12 * hs, { seed: 4, irr: 0.2 }), P.viridian, { alpha: 0.4 });
    for (const [bx, by, ph] of [[hx - 10 * hs, hy - 70 * hs, 0], [hx + 16 * hs, hy - 84 * hs, 0.4]]) {
      const f = Math.sin((lt * 3 + ph) * E.TAU) * 3 * hs;
      E.pencil(ink, [[bx - 7 * hs, by - f], [bx, by + 2 * hs], [bx + 7 * hs, by - f]], { w: 1.3, a: 0.45, double: false });
    }
    // a soft paper-white halo behind his head and shoulders (he stands in light); the legs stay against the
    // meadow so the figure reads whole, head to toe
    E.wash(p, E.blob(cx - 2 * q, REF_FEET - REF_H * 0.74, REF_H * 0.2, { rx: REF_H * 0.21, ry: REF_H * 0.3, seed: 12, irr: 0.08 }), '#FFFCF2', { mode: 'over', alpha: 0.7, soft: 24 * q });
    E.wash(p, E.blob(cx + 4 * q, REF_FEET - 4 * q, REF_H * 0.12, { rx: REF_H * 0.16, ry: REF_H * 0.03, seed: 13, irr: 0.1 }), '#5E6E4E', { alpha: 0.35, soft: 4 * q });
    // swirling watercolour of memories, orbiting him slowly
    const cols = [P.rose, P.gamboge, P.cerulean, P.blush, P.ochre, P.sap];
    for (let i = 0; i < 6; i++) {
      const a = lt * 0.62 + i * (E.TAU / 6);
      const rad = r.w * (0.36 + 0.05 * Math.sin(lt * 0.8 + i));
      const bx = cx + Math.cos(a) * rad, by = chest - 30 * q + Math.sin(a) * rad * 1.35;
      E.bloom(p, bx, by, (34 + 8 * Math.sin(i * 2.1 + lt)) * q, E.shade(cols[i], 0.05), { seed: 50 + i, alpha: 0.4, soft: 12 * q, irr: 0.35 });
    }
    E.restore(L);
  }

  /** soft cast shadow of a silhouette given as points (light from the upper left: shadows fall front-right) */
  function castShadow(L, pts, a) {
    const sh = pts.map(([x, y]) => [x + (FLOOR - y) * 0.24, FLOOR - (FLOOR - y) * 0.15]);
    E.wash(L.paint, polyPath(sh), E.shade(P.lavender, 0.05), { alpha: a, soft: 8 });
  }

  /** While the zoom transition still shows this canvas shrunken (scale sB about (540, 1010)), the screen
      outside it is bare paper. Fade the canvas edges into paper over a width proportional to that margin, pure
      white at the very edge, so no hard frame line shows; it shrinks to nothing as sB reaches 1. */
  function paperEdge(L, sB) {
    const m = 1 - sB;
    if (m < 0.0004) return;
    const band = (d) => Math.min(150, (5 * m * d) / sB);
    const bt = band(1010), bb = band(910), bs = band(540);
    for (const c of [L.paint, L.ink, L.light]) {
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = c === L.paint ? 'source-over' : 'destination-out';
      const fill = (x0, y0, x1, y1, rx, ry, rw, rh) => {
        const g = c.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.fillRect(rx, ry, rw, rh);
      };
      if (bt > 0.5) fill(0, 0, 0, bt, 0, 0, E.W, bt);
      if (bb > 0.5) fill(0, E.H, 0, E.H - bb, 0, E.H - bb, E.W, bb);
      if (bs > 0.5) { fill(0, 0, bs, 0, 0, 0, bs, E.H); fill(E.W, 0, E.W - bs, 0, E.W - bs, 0, bs, E.H); }
      c.restore();
    }
  }

  E.scene('s02', {
    wc: [1, 1, 3, 0.42],
    draw(L, lt, t, shot) {
      const v = view(lt);
      const tH = T(7, shot), tEn = T(9, shot), tAy = T(10, shot);
      const life = E.ep(lt, tH - 0.15, tH + 0.6, 'inOutSine');
      const flash = Math.exp(-Math.pow((lt - tH - 0.3) / 0.28, 2));   // the moment the reflection blooms

      // ---------------------------------------------------------------- far: sky, clouds, dome, tower
      sky(L);
      layer(L, v, DEPTH.cloud);
      PR.cloud(L, 150 + lt * 7, 190, 300, { seed: 21, t: lt, alpha: 0.9 });
      PR.cloud(L, 770 + lt * 5, 140, 230, { seed: 24, t: lt, alpha: 0.85 });
      PR.cloud(L, -260 + lt * 6, 330, 260, { seed: 26, t: lt, alpha: 0.8 });
      layer(L, v, DEPTH.skyline);
      skyline(L, lt);

      // ---------------------------------------------------------------- back arcade + lanterns
      layer(L, v, DEPTH.arcade);
      arcade(L, lt);
      for (const [lx, sd] of [[-230, 3], [-10, 7], [210, 2], [870, 5], [1310, 9]]) PR.lantern(L, lx, AR.spring - 112, 96, { t: lt, lit: 1, seed: sd, chain: 40 });

      // ---------------------------------------------------------------- floor; travellers crossing at the back
      layer(L, v, DEPTH.floor);
      floor(L);
      layer(L, v, DEPTH.crowd);
      const hB = 250, vB = E.man.walkSpeed(hB, 0.95);
      const x1 = 470 - vB * lt;
      if (x1 > -700) {
        E.man.shadow(L, x1, BACK + 40, hB, 0.25);
        E.man.draw(L, { x: x1, y: BACK + 40, h: hB, view: 'side', facing: -1, pose: E.man.pose.walk((lt / 0.95 + 0.3) % 1), tint: '#B0694F', tintAmt: 0.4, desat: 0.3 });
      }
      const x2 = 690 + vB * lt;
      if (x2 < 1800) {
        E.man.shadow(L, x2, BACK + 26, hB * 0.92, 0.22);
        E.man.draw(L, { x: x2, y: BACK + 26, h: hB * 0.92, view: 'side', facing: 1, pose: E.man.pose.walk((lt / 0.95 + 0.7) % 1), tint: '#5E7F56', tintAmt: 0.4, desat: 0.3 });
      }

      // ---------------------------------------------------------------- the mirror plane: shadows, plants, mirror, man
      layer(L, v, DEPTH.floor);
      const man = manState(lt, shot);
      castShadow(L, archPts(MX, 155, FLOOR - 530, FLOOR, 0.35, 10), 0.3);
      castShadow(L, [[man.x - 20, FLOOR], [man.x - 22, FLOOR - 310], [man.x - 13, FLOOR - 490], [man.x + 8, FLOOR - 540], [man.x + 20, FLOOR - 490], [man.x + 24, FLOOR - 310], [man.x + 22, FLOOR]], 0.3);
      for (let i = 0; i < 4; i++) PR.flower(L, 905 + (i - 1.5) * 24, 1060 - (i % 2) * 6, 112 + (i % 3) * 13, { kind: 'tulip', t: lt + i, seed: i + 2, color: i % 2 ? '#D9534F' : '#E8A33D' });
      pot(L, 905, 1112, 104, 60, 8);

      // warm light spilling from the glass onto the floor
      if (life > 0) E.wash(L.paint, E.blob(MX - 60, FLOOR + 26, 110, { rx: 300, ry: 46, seed: 4, irr: 0.15 }), E.shade(P.gamboge, 0.25), { alpha: 0.5 * life, soft: 22 });

      const ra = E.ep(lt, tH - 0.15, tH + 0.35);
      PR.mirror(L, MX, FLOOR, MH, {
        t: lt, glassTint: E.mix('#C9D2DE', '#F1E3C8', life),
        shine: E.ep(lt, tAy - 0.1, tAy + 0.8, 'linear'),
        reflectAlpha: ra,
        reflect: ra > 0 ? (L2, r) => {
          lifeInGlass(L2, r, lt, life);
          E.man.draw(L2, { x: REF_X, y: REF_FEET, h: REF_H, view: 'side', facing: -1, pose: man.pose, tint: '#C99A62', tintAmt: 0.1 * life });
        } : undefined,
      });
      // luminous glass: warm light over the reflection, a soft aura round him, motes rising
      if (life > 0) {
        const gp = PR.mirrorGlassPath(MX, FLOOR, MH);
        const chest = REF_FEET - REF_H * 0.6;
        L.light.save();
        L.light.clip(gp);
        E.glow(L.light, GR.cx, chest - 110, GR.h * 0.55 * (1 + 0.03 * Math.sin(lt * 2.2)), '#FFD9A0', (0.12 + 0.34 * flash) * life);
        E.motes(L.light, { x: GR.x, y: GR.y, w: GR.w, h: GR.h, n: 14, t: lt, seed: 7, size: 2.3, a: 0.75 * life, rise: 34 });
        L.light.restore();
        E.glow(L.light, MX, GR.y + GR.h * 0.5, GR.h * 0.85, '#FFE6B8', (0.12 + 0.22 * flash) * life);
      }
      E.man.shadow(L, man.x, FLOOR, MAN_H);
      E.man.draw(L, { x: man.x, y: FLOOR, h: MAN_H, view: 'side', facing: 1, pose: man.pose });
      // the glow of the glass catches his front
      if (life > 0) E.glow(L.light, man.x + 44, FLOOR - MAN_H * 0.62, MAN_H * 0.42, '#FFD8A0', (0.16 + 0.12 * flash) * life);

      // "endam": a soft band of light runs down the reflection from head to toe
      const sc = E.seg(lt, tEn - 0.05, tEn + 0.75);
      if (sc > 0 && sc < 1) {
        const gp = PR.mirrorGlassPath(MX, FLOOR, MH);
        const y0 = REF_FEET - REF_H * 1.06, y1 = REF_FEET + 10;
        const yy = E.lerp(y0, y1, E.ease.inOutSine(sc));
        const env = Math.sin(Math.PI * sc);
        L.light.save();
        L.light.clip(gp);
        const g = L.light.createLinearGradient(0, yy - 50, 0, yy + 50);
        g.addColorStop(0, 'rgba(255,240,205,0)');
        g.addColorStop(0.5, E.rgba('#FFF2D4', 0.55 * env));
        g.addColorStop(1, 'rgba(255,240,205,0)');
        L.light.globalCompositeOperation = 'lighter';
        L.light.fillStyle = g;
        L.light.fillRect(GR.x - 10, yy - 50, GR.w + 20, 100);
        L.light.restore();
      }

      // the nearest pot (left), a touch nearer than the man
      layer(L, v, DEPTH.near);
      PR.tree(L, 140, 1030, 440, { kind: 'cypress', t: lt, seed: 3, shadow: 0 });
      pot(L, 140, 1112, 116, 88, 4);

      // ---------------------------------------------------------------- the gate we fly through (until it has passed)
      gate(L, v, lt);

      // dust motes in the sunlight, and a paper edge while the canvas is still shrunken by the zoom transition
      E.each(L, (c) => c.setTransform(1, 0, 0, 1, 0, 0));
      E.motes(L.light, { x: 0, y: 200, w: 1080, h: 1000, n: 22, t: lt, seed: 12, size: 2.2, a: 0.3 * E.ep(lt, 0.5, 1.1), rise: 12 });
      paperEdge(L, v.sB);
    },

    sfx() {
      return [
        { t: E.T(7) - 0.12, type: 'swell', gain: 0.3, dur: 1.4 },
        { t: E.T(7) + 0.12, type: 'sparkle', gain: 0.18, dur: 0.9 },
        { t: E.T(10) - 0.02, type: 'chime', gain: 0.24, pitch: 1.5 },
      ];
    },
  });
})();
