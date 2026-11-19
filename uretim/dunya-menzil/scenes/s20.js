/* s20 · 90.55–94.10 · "O muhabbet onun için hadsiz bela ve azaptır."
   Bleeds in from s19's closed dark water (surface at screen y ≈ 900; the same night sky, far world and stars).
   "O muhabbet" 90.97–91.6: a dim crimson glow under the water — his heart-light rises out of it, dripping, but it is
     darkened: a sick dark crimson with a cold, dim glow (its wavering dark reflection below).
   "onun için" 91.79–92.3: it hangs there, beating weakly.
   "hadsiz" 92.43: dark washes start to swirl round it and spread past the frame without end (a turning spiral reads
     as an endless outward flow); thorny vines climb out of the dark water and wind round the heart.
   "bela" 92.93 / "azaptır" 93.39: thunderous dark blooms burst (one swallows the far world) and cracks of cold light
     split the night; the vines cinch, the heart is at its darkest. Holds, still turning, into the photoreal ending
     (fade 94.1–95.1). */
(function () {
  const E = window.E;
  const PR = E.props;
  const T0 = 90.55;
  const lw = (i) => E.T(i) - T0;
  const TS = 3.95 + 4.15; // seconds of s18 + s19 before this shot (the night sky runs on continuously)

  // ---- local soft-wash helpers (workaround): E.softFill keeps the scaled camera transform while drawing its
  //      far-off shape, and in the accelerated slot canvases Chrome scales the shadow offset with it, so soft
  //      washes land OFF·(zoom−1) px away under a zoomed camera. Here the path is moved to device space and
  //      drawn with an identity transform (as props-a's shadowDraw does), which is exact at any zoom.
  const SOFF = 24000;
  function softFillD(ctx, path, color, blur) {
    const m = ctx.getTransform();
    const sc = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
    const p2 = new Path2D();
    p2.addPath(path, new DOMMatrix([m.a, m.b, m.c, m.d, m.e - SOFF, m.f]));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(0.5, blur * sc * 2);
    ctx.shadowOffsetX = SOFF;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = color;
    ctx.fill(p2);
    ctx.restore();
  }
  function wash(ctx, path, color, o = {}) {
    if (!o.soft || o.grad) { E.wash(ctx, path, color, o); return; }
    ctx.save();
    ctx.globalCompositeOperation = o.mode === 'over' ? 'source-over' : 'multiply';
    ctx.globalAlpha *= o.alpha ?? 1;
    softFillD(ctx, path, o.light ? E.shade(color, o.light) : color, o.soft);
    ctx.restore();
  }
  function lift(ctx, path, alpha = 1, soft = 0) {
    if (!soft) { E.lift(ctx, path, alpha); return; }
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha *= alpha;
    softFillD(ctx, path, '#ffffff', soft);
    ctx.restore();
  }
  function bloom(ctx, cx, cy, r, color, { seed = 3, alpha = 0.6, soft = 10, irr = 0.25 } = {}) {
    wash(ctx, E.blob(cx, cy, r, { seed, irr }), color, { alpha, soft });
  }

  const SURF = 900;           // water surface (world = screen at the start, = s19's last frame)
  const HX = 540, HY = 640;   // where the heart hangs
  const HR = 138;             // heart half-width
  const COLD = '#AFC8FF';

  const K = {
    glow0: 0.1,
    rise0: lw(168) - 0.12, rise1: lw(169) + 0.8,           // O muhabbet: rises out of the water
    dark0: lw(169) - 0.1, dark1: lw(169) + 0.9,             // turns sick dark crimson
    vort0: lw(172) - 0.15, vort1: lw(172) + 0.95,           // hadsiz: the endless spiral
    thorn0: lw(172) - 0.05, thorn1: lw(172) + 0.75,         // hadsiz: thorny vines climb out of the water
    bela: lw(173) - 0.04, azap: lw(175) - 0.04,             // bela, azaptır: blooms + cracks
  };

  // ---------------------------------------------------------------- the night sky (continues s19's exactly)
  function drawSky(L, T, sc, o) {
    E.camera(L, sc);
    const pnt = L.paint;
    const bx = 742, by = 300 + E.drift(T, 2, 0.3) * 3, br = 140;
    PR.bigWorld(L, bx, by, br, { t: T + 8, decor: 1, gateGlow: 0.8 * o.gate, rotSpeed: 0.025, rot: 0.08, aura: 0.9 * o.aura, alpha: o.world });
    const m = pnt.getTransform();
    const sx = m.a * bx + m.c * by + m.e, sy = m.b * bx + m.d * by + m.f, R = br * Math.hypot(m.a, m.b);
    pnt.save();
    pnt.setTransform(1, 0, 0, 1, 0, 0);
    pnt.globalCompositeOperation = 'multiply';
    const gr = pnt.createRadialGradient(sx, sy - R * 0.2, 0, sx, sy - R * 0.2, R * 6);
    gr.addColorStop(0, '#C2CAE6'); gr.addColorStop(1.05 / 6, '#B4BEDF'); gr.addColorStop(1.5 / 6, '#8692C2');
    gr.addColorStop(2.4 / 6, '#525F94'); gr.addColorStop(1, '#2C3866');
    pnt.fillStyle = gr; pnt.fillRect(0, 0, E.W, E.H);
    const gt = pnt.createLinearGradient(0, 0, 0, 240);
    gt.addColorStop(0, '#6070A0'); gt.addColorStop(1, '#FFFFFF');
    pnt.fillStyle = gt; pnt.fillRect(0, 0, E.W, 240);
    pnt.restore();
    bloom(pnt, 120, 260, 240, '#2A3460', { seed: 3, alpha: 0.35, soft: 60 });
    bloom(pnt, 90, 900, 300, '#3E3A66', { seed: 7, alpha: 0.25, soft: 70, irr: 0.3 });
    bloom(pnt, 980, 820, 240, '#2A3460', { seed: 4, alpha: 0.3, soft: 60 });
    lift(pnt, E.blob(540, 1040, 420, { seed: 5, irr: 0.3, rx: 700, ry: 150 }), 0.12, 70);
    E.glow(L.light, sx - R * 0.55, sy - R * 0.55, R * 0.9, '#C9D6FF', 0.12 * o.world);
    const r = E.rng(1818);
    for (let i = 0; i < 56; i++) {
      const x = r() * 1080, y = r() * 980, s = 0.9 + r() * 1.9, ph = r() * 10, sp = 1.5 + r() * 2;
      if (Math.hypot(x - bx, y - by) < br * 1.7) continue;
      const tw = 0.55 + 0.45 * Math.sin(T * sp + ph);
      lift(pnt, E.blob(x, y, s, { seed: i, irr: 0.1, n: 10 }), 0.62 * o.stars);
      if (s > 2.0) E.glow(L.light, x, y, s * 5, '#DCE5FF', 0.3 * tw * o.stars);
    }
    PR.cloud(L, 140 + T * 8, 760, 260, { tone: 'night', seed: 9, t: T, alpha: 0.35 * o.cloud });
    return { sx, sy, R };
  }

  // ---------------------------------------------------------------- helpers
  function ring(ctx, x, y, rx, ry, color, width, alpha, mode = 'source-over') {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, E.TAU);
    ctx.stroke();
    ctx.restore();
  }
  function surfY(x, lt) {
    const em = E.ep(lt, K.rise0 + 0.1, K.rise0 + 0.35) * Math.exp(-Math.max(0, lt - K.rise0 - 0.35) * 1.8);
    const d = Math.abs(x - HX);
    const wake = em * 10 * Math.cos(d * 0.03 - lt * 7) * Math.exp(-d / 260);
    return SURF + 1.6 * Math.sin(x * 0.012 - lt * 2.0) + 0.8 * Math.sin(x * 0.031 + lt * 2.7 + 1.3) + wake;
  }
  function waterPath(lt) {
    const p = new Path2D();
    for (let x = -300, i = 0; x <= 1380; x += 12, i++) {
      const y = surfY(x, lt);
      if (i) p.lineTo(x, y); else p.moveTo(x, y);
    }
    p.lineTo(1380, 2900); p.lineTo(-300, 2900); p.closePath();
    return p;
  }
  /** the heart outline (same curve as the heart-light prop), half-width r, centred */
  const HB = (() => {
    const bez = (p0, p1, p2, p3, n) => {
      const o = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3;
        o.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
      }
      return o;
    };
    const right = [...bez([0, -50], [14, -88], [62, -104], [90, -74], 14), ...bez([90, -74], [114, -48], [100, -6], [70, 30], 14).slice(1), ...bez([70, 30], [46, 58], [16, 80], [3, 92], 12).slice(1), [0, 95]];
    const left = right.slice(0, -1).reverse().map(([x, y]) => [-x, y]);
    return right.concat(left.slice(0, -1));
  })();
  function heartPath(x, y, r, rot = 0) {
    const k = r / 100, c = Math.cos(rot), s = Math.sin(rot);
    return E.smoothPath(HB.map(([px, py]) => [x + (px * c - py * s) * k, y + (px * s + py * c) * k]), true);
  }

  /** deterministic jagged crack (with a couple of branches) from a to b (geometry depends on the seed only) */
  const crackCache = {};
  function crack(seed, a, b) {
    if (crackCache[seed]) return crackCache[seed];
    const r = E.rng(seed);
    const main = [a, b];
    for (let it = 0; it < 6; it++) {
      const out = [];
      for (let i = 0; i < main.length - 1; i++) {
        const p = main[i], q = main[i + 1];
        const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
        const nx = -(q[1] - p[1]) / (len || 1), ny = (q[0] - p[0]) / (len || 1);
        const o = (r() - 0.5) * len * 0.42;
        out.push(p, [(p[0] + q[0]) / 2 + nx * o, (p[1] + q[1]) / 2 + ny * o]);
      }
      out.push(main[main.length - 1]);
      main.splice(0, main.length, ...out);
    }
    const branches = [];
    for (let k = 0; k < 3; k++) {
      const i0 = Math.floor(main.length * (0.25 + 0.5 * r()));
      const p = main[i0], q = main[Math.min(main.length - 1, i0 + 4)];
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0]) + (r() < 0.5 ? -1 : 1) * (0.5 + 0.5 * r());
      const Ln = 90 + r() * 150;
      const br = [p];
      let x = p[0], y = p[1];
      for (let j = 1; j <= 7; j++) {
        x += Math.cos(ang + (r() - 0.5) * 0.9) * (Ln / 7);
        y += Math.sin(ang + (r() - 0.5) * 0.9) * (Ln / 7);
        br.push([x, y]);
      }
      branches.push({ i0, pts: br });
    }
    return (crackCache[seed] = { main, branches });
  }
  function polyPath(pts, upto) {
    const p = new Path2D();
    const n = Math.max(2, Math.floor(pts.length * upto));
    for (let i = 0; i < Math.min(n, pts.length); i++) (i ? p.lineTo(pts[i][0], pts[i][1]) : p.moveTo(pts[i][0], pts[i][1]));
    return p;
  }
  /** a crack of cold light: flashes (light layer), leaves a scratched pale line in the dark wash */
  function drawCrack(L, lt, t0, seed, a, b) {
    const u = lt - t0;
    if (u < 0) return 0;
    const C = crack(seed, a, b);
    const grow = E.clamp(u / 0.09);
    const flash = Math.min(1, u / 0.035) * (0.25 + 0.75 * Math.exp(-u * 6)) * (1 + 0.6 * Math.exp(-Math.pow((u - 0.16) / 0.035, 2)));
    const fade = 0.3 + 0.7 * Math.exp(-Math.max(0, u - 0.2) * 2.4);
    const mp = polyPath(C.main, grow);
    const bps = C.branches.filter((br) => br.i0 / C.main.length < grow).map((br) => polyPath(br.pts, E.clamp((grow * C.main.length - br.i0) / 6)));
    const P = L.paint;
    P.save();
    P.globalCompositeOperation = 'source-over';
    P.lineCap = 'round'; P.lineJoin = 'round';
    P.strokeStyle = '#DCE6FA';
    P.globalAlpha *= 0.55 * fade;
    P.lineWidth = 2.2; P.stroke(mp);
    P.lineWidth = 1.2; for (const bp of bps) P.stroke(bp);
    P.restore();
    E.pencil(L.ink, mp, { w: 1.2, a: 0.25 * fade, double: false });
    const G = L.light;
    G.save();
    G.globalCompositeOperation = 'lighter';
    G.lineCap = 'round'; G.lineJoin = 'round';
    for (const [w, a, col] of [[56, 0.05, COLD], [26, 0.11, COLD], [9, 0.28, '#C8DAFF'], [2.4, 0.85, '#F4F8FF']]) {
      G.strokeStyle = E.rgba(col, Math.min(1, a * (flash + 0.1 * fade)));
      G.lineWidth = w; G.stroke(mp);
      G.lineWidth = w * 0.55; for (const bp of bps) G.stroke(bp);
    }
    G.restore();
    return flash;
  }

  /** the endless vortex: spiral arms of wet dark wash turning round the heart and spreading outward (a rotating
      log spiral reads as an endless outward flow). Each arm: a soft wide wash (lost edges) + a narrower core with
      a found edge + a dry-brush streak; pale cold streaks of the night show between the arms. */
  const VB = 0.28, VR0 = 110, VSQ = 0.9;
  const vRot = (lt, rev) => -lt * 0.75 - Math.pow(rev, 0.6) * 1.4;
  function drawVortex(L, lt, rev, cx, cy) {
    if (rev <= 0) return;
    const pnt = L.paint;
    const ARMS = [
      { col: '#16172C', a: 0.72, d: 0.0, w: 1.25, seed: 1 },
      { col: '#3A1530', a: 0.66, d: E.TAU / 3, w: 1.05, seed: 2 },
      { col: '#1B1E3C', a: 0.7, d: (2 * E.TAU) / 3, w: 1.15, seed: 3 },
    ];
    const rot = vRot(lt, rev);
    const thMax = 0.5 + rev * 11.5;
    const spiral = (th, d, f = 1) => {
      const r = VR0 * Math.exp(VB * th) * f;
      return [cx + Math.cos(th + rot + d) * r, cy + Math.sin(th + rot + d) * r * VSQ];
    };
    const ga = E.clamp(rev * 2.2);
    for (const arm of ARMS) {
      const band = (wk, f0) => {
        const inner = [], outer = [];
        const n = 90;
        for (let i = 0; i <= n; i++) {
          const th = (i / n) * thMax;
          const tip = E.clamp((thMax - th) / 2.6), base = E.clamp(th / 1.5);
          const wv = arm.w * wk * (0.1 + 0.9 * tip) * base * (1 + 0.18 * E.noise1(th * 1.3 + arm.seed * 7, arm.seed));
          inner.push(spiral(th, arm.d + (1 - wk) * 0.5 * arm.w * (0.1 + 0.9 * tip) * base, f0));
          outer.push(spiral(th, arm.d + (1 - wk) * 0.5 * arm.w * (0.1 + 0.9 * tip) * base + wv, f0 * 1.02));
        }
        return { path: E.smoothPath(inner.concat(outer.reverse()), true), inner };
      };
      const wide = band(1, 1), core = band(0.55, 1);
      wash(pnt, wide.path, arm.col, { mode: 'over', alpha: arm.a * 0.62 * ga, soft: 26 });
      wash(pnt, core.path, arm.col, { mode: 'over', alpha: arm.a * 0.55 * ga });
      E.pencil(L.ink, core.inner.filter((_, i) => i % 3 === 0), { w: 1.2, a: 0.14 * ga, double: false });
    }
    // pale cold streaks between the arms (the night showing through, dragged into the spin): broken dry brush
    for (let k = 0; k < 4; k++) {
      const d = k * (E.TAU / 4) + 0.9;
      const th0 = 1.1 + (k % 2) * 0.7, th1 = Math.min(thMax - 0.5, th0 + 3.0 + (k % 2) * 1.2);
      if (th1 <= th0 + 0.3) continue;
      const pts = [];
      for (let th = th0; th <= th1; th += 0.08) pts.push(spiral(th, d, 1.0));
      pnt.save();
      pnt.globalCompositeOperation = 'source-over';
      pnt.globalAlpha *= 0.1 * E.clamp(rev * 2.5 - 0.3);
      pnt.strokeStyle = '#A8B4E4';
      pnt.lineCap = 'round';
      pnt.setLineDash([140 + k * 30, 70 + k * 20]);
      pnt.lineDashOffset = k * 90;
      pnt.lineWidth = 6 + (k % 2) * 4;
      pnt.stroke(E.smoothPath(pts));
      pnt.restore();
    }
    // dark dry-brush streaks dragged round by the vortex (texture of the wet sweep)
    const r = E.rng(2020);
    for (let k = 0; k < 9; k++) {
      const th0 = r() * E.TAU, rr = 200 + r() * 600, span = 0.8 + r() * 0.8;
      const pts = [];
      for (let j = 0; j <= 14; j++) {
        const th = th0 + rot * 1.1 + (j / 14) * span;
        const rad = rr * (1 + 0.22 * j / 14);
        pts.push([cx + Math.cos(th) * rad, cy + Math.sin(th) * rad * VSQ]);
      }
      E.dryBrush(pnt, pts, k % 2 ? '#2C1A2C' : '#1A1C38', { width: 18 + r() * 18, seed: 40 + k, alpha: 0.42 * E.clamp(rev * 2 - 0.3), bristles: 8 });
    }
  }

  /** a thunderous dark bloom: an ink cloud bursting in the wet night wash (dragged round by the vortex) */
  function inkBurst(L, lt, t0, ang, dist, R, col, seed, cx, cy, rev) {
    const u = lt - t0;
    if (u <= 0) return;
    const g = E.ease.outExpo(E.clamp(u / 0.8));
    const a = ang + vRot(lt, rev) * 0.35;
    const x = cx + Math.cos(a) * dist, y = cy + Math.sin(a) * dist * VSQ;
    const pnt = L.paint;
    const rr = R * (0.25 + 0.75 * g);
    wash(pnt, E.blob(x, y, rr * 1.25, { seed: seed + 1, irr: 0.35, n: 40 }), col, { alpha: 0.45, soft: 16 });
    wash(pnt, E.blob(x, y, rr * 1.04, { seed, irr: 0.32, n: 48 }), '#4A2038', { mode: 'over', alpha: 0.4, soft: 6 });
    wash(pnt, E.blob(x, y, rr, { seed, irr: 0.32, n: 48 }), col, { mode: 'over', alpha: 0.8 });
    wash(pnt, E.blob(x + rr * 0.1, y + rr * 0.08, rr * 0.55, { seed: seed + 2, irr: 0.3 }), '#100E1A', { alpha: 0.45, soft: 8 });
    const pu = Math.exp(-u * 5);
    if (pu > 0.05) wash(pnt, E.blob(x, y, rr * 0.8, { seed: seed + 3, irr: 0.3 }), '#0E0C18', { alpha: 0.35 * pu, soft: 10 });
  }

  // ---------------------------------------------------------------- thorny vines climbing out of the water
  //  Five bare, thorny vines rise from the dark water below the heart and wind round it (behind it where z < 0,
  //  in front where z > 0); they grow in turn from "hadsiz" and cinch at "azaptır" (crossing over the heart).
  const VINES = [
    { ph: 0, tilt: -0.42, th0: Math.PI / 2 + 0.25, dir: 1, turns: 1.05, w: 10, seed: 1, d: 0.0, stem: true },
    { ph: E.TAU / 3, tilt: 0.46, th0: Math.PI / 2 - 0.25, dir: -1, turns: 1.0, w: 9, seed: 2, d: 0.1, stem: true },
    { ph: (2 * E.TAU) / 3, tilt: 0.08, th0: Math.PI / 2, dir: 1, turns: 1.3, w: 8, seed: 3, d: 0.2, stem: true },
    { ph: 0, tilt: -0.75, th0: 3.6, dir: -1, turns: 0.85, w: 7, seed: 4, d: 0.34, stem: false },
  ];
  /** a vine: (stem) an S-curve climbing out of the water to the heart, then a tilted wrap round the heart that
      drifts upward as it winds (front half crosses over the heart, back half passes behind it) */
  function vinePts(v, hx, hy, tight, lt) {
    const pts = [], z = [];
    const rxW = HR * 1.2 * (1 - 0.2 * tight), ryW = HR * 0.36 * (1 - 0.15 * tight);
    const ct = Math.cos(v.tilt), st = Math.sin(v.tilt);
    const wrapAt = (u) => {
      const th = v.th0 + v.dir * u * v.turns * E.TAU;
      const sway = 1 + 0.06 * Math.sin(u * 7 + v.seed + lt * 0.9);
      const ex = rxW * Math.cos(th) * sway, ey = ryW * Math.sin(th);
      const cy = hy + 10 + HR * E.lerp(0.42, -0.42, u);
      return { p: [hx + ex * ct - ey * st, cy + ex * st + ey * ct], z: Math.sin(th) };
    };
    const nW = 90;
    if (v.stem) {
      // three strands braided into one thorny stalk rooted in the dark water, opening under the heart's tip
      const topY = hy + HR * 1.12 + 26, nB = 34;
      const axis = (t) => hx - 8 + 16 * Math.sin(t * 2.6 + 0.4 + lt * 0.5);
      for (let i = 0; i < nB; i++) {
        const t = i / nB, a = t * E.TAU * 1.7 + v.ph;
        const rB = 12 * (1 - 0.35 * t);
        pts.push([axis(t) + rB * Math.cos(a), E.lerp(SURF + 30, topY, t)]);
        z.push(Math.sin(a) > 0 ? -0.5 : -1.5); // strands cross each other (all behind the heart)
      }
      const B0 = pts[pts.length - 1], A = wrapAt(0).p, A2 = wrapAt(0.02).p;
      const tx = A2[0] - A[0], ty = A2[1] - A[1], tl = Math.hypot(tx, ty) || 1;
      const P1 = [B0[0], B0[1] - 34], P2 = [A[0] - (tx / tl) * 46, A[1] - (ty / tl) * 46];
      for (let i = 1; i < 16; i++) {
        const t = i / 16, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3;
        pts.push([a * B0[0] + b * P1[0] + c * P2[0] + d * A[0], a * B0[1] + b * P1[1] + c * P2[1] + d * A[1]]);
        z.push(-1);
      }
    }
    for (let i = 0; i <= nW; i++) { const W = wrapAt(i / nW); pts.push(W.p); z.push(W.z); }
    return { pts, z };
  }
  const layerOf = (zz) => (zz > 0 ? 2 : zz < -1 ? 0 : 1); // 0: back strand of the braid, 1: behind the heart, 2: in front
  function drawVine(L, v, V, p, layer, a) {
    const front = layer === 2;
    const { pts, z } = V;
    const n = pts.length - 1, last = Math.min(n, Math.floor(p * n));
    if (last < 2 || a <= 0.01) return;
    const P = L.paint;
    const col = '#24121C', rim = '#9AA6D6';
    P.save();
    P.globalAlpha *= a;
    let i = 0;
    while (i < last) {
      if (layerOf(z[i]) !== layer) { i++; continue; }
      let j = i;
      while (j + 1 <= last && layerOf(z[j + 1]) === layer) j++;
      const i0 = Math.max(0, i - 1), i1 = Math.min(last, j + 1);
      const A = [], B = [], rimL = [];
      for (let k = i0; k <= i1; k++) {
        const q = pts[Math.min(n, k + 1)], o = pts[Math.max(0, k - 1)];
        let nx = -(q[1] - o[1]), ny = q[0] - o[0];
        const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        const s = k / n, tipK = E.clamp((last - k) / 14);
        const w = v.w * (1.15 - 0.75 * s) * (0.25 + 0.75 * tipK) * 0.5;
        A.push([pts[k][0] + nx * w, pts[k][1] + ny * w]); B.push([pts[k][0] - nx * w, pts[k][1] - ny * w]);
        rimL.push([pts[k][0] + nx * w * 0.6, pts[k][1] + ny * w * 0.6]);
      }
      const path = new Path2D();
      A.concat(B.reverse()).forEach((q, m) => (m ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1])));
      path.closePath();
      P.globalCompositeOperation = 'source-over';
      P.fillStyle = front ? col : E.shade(col, -0.2);
      P.fill(path);
      for (const c of [L.ink, L.light]) { c.save(); c.globalCompositeOperation = 'destination-out'; c.fill(path); c.restore(); }
      if (front) { P.strokeStyle = E.rgba(rim, 0.26); P.lineWidth = 1.4; P.stroke(E.smoothPath(rimL)); }
      E.pencil(L.ink, A, { w: 1.1, a: 0.22 * a, double: false });
      i = j + 1;
    }
    // thorns: short hooked triangles alternating sides, pointing along the growth
    P.globalCompositeOperation = 'source-over';
    P.fillStyle = col;
    const r = E.rng(300 + v.seed);
    for (let k = 6; k < last - 3; k += 7) {
      if (layerOf(z[k]) !== layer) { r(); continue; }
      const q = pts[k + 1], o = pts[k - 1];
      const tx = q[0] - o[0], ty = q[1] - o[1], l = Math.hypot(tx, ty) || 1;
      const ux = tx / l, uy = ty / l, side = (k / 7) % 2 < 1 ? 1 : -1;
      const s = k / n, len = (7 + r() * 6) * (1.1 - 0.5 * s) * E.clamp((last - k) / 10);
      const w = v.w * (1.15 - 0.75 * s) * 0.5;
      const bx = pts[k][0] - uy * side * w * 0.8, by = pts[k][1] + ux * side * w * 0.8;
      const th = new Path2D();
      th.moveTo(bx - ux * 4, by - uy * 4);
      th.lineTo(bx + ux * 4, by + uy * 4);
      th.lineTo(bx - uy * side * len + ux * len * 0.55, by + ux * side * len + uy * len * 0.55);
      th.closePath();
      P.fill(th);
    }
    P.restore();
  }

  // ---------------------------------------------------------------- draw
  function draw(L, lt) {
    const T = lt + TS;
    const rise = E.ep(lt, K.rise0, K.rise1, 'outCubic');
    const dark = E.ep(lt, K.dark0, K.dark1, 'inOutSine');
    const rev = E.ep(lt, K.vort0, K.vort1, 'inOutSine');
    const tight = E.ep(lt, K.azap - 0.1, K.azap + 0.6, 'inOutCubic');
    // thunder shake (small, decaying)
    const shk = (t0) => { const u = lt - t0; return u > 0 ? Math.exp(-u * 7) * Math.sin(u * 55) : 0; };
    const sh = 5 * shk(K.bela) + 6 * shk(K.azap);
    // camera: from s19's framing, a slow push toward the heart (the night closes round it)
    const push = E.ep(lt, K.rise0, 3.9, 'inOutSine');
    const zoom = 1 + 0.12 * push;
    const camY = 960 - 150 * push;
    const cam = { x: 540 + sh + 4 * E.drift(lt, 5, 0.4), y: camY + sh * 0.6 + 4 * E.drift(lt, 9, 0.35), zoom };
    const sc = { x: 540, y: 988.16 + (camY - 960) * 0.22, zoom: 1.044 + (zoom - 1) * 0.22 };
    const pnt = L.paint;

    // ---- night sky (= s19's last frame); the far world is swallowed by a dark bloom at "bela" ----
    const sky = drawSky(L, T, sc, { gate: 1 - rev, aura: 1 - 0.6 * rev, world: 1 - 0.8 * E.ep(lt, K.bela, K.azap + 0.4), stars: 1 - 0.75 * rev, cloud: 1 - 0.5 * rev });

    E.camera(L, cam);
    // ---- thunderous dark blooms (behind the heart; the first one over the far world) ----
    const wx = cam.x + (sky.sx - 540) / cam.zoom, wy = cam.y + (sky.sy - 960) / cam.zoom;
    const bang = Math.atan2((wy - HY - 20) / VSQ, wx - HX), bdist = Math.hypot(wx - HX, (wy - HY - 20) / VSQ);
    for (const [t0, ang, dist, R, col, seed] of [[K.bela, bang - vRot(K.bela + 0.3, 1) * 0.35, bdist, 300, '#151424', 5], [K.bela + 0.1, 2.6, 640, 330, '#22101E', 8], [K.azap, -2.3, 640, 360, '#131528', 11], [K.azap + 0.09, 0.5, 660, 340, '#1F0F1C', 14], [K.azap + 0.2, 1.75, 600, 300, '#171222', 17]]) {
      inkBurst(L, lt, t0, ang, dist, R, col, seed, HX, HY + 20, rev);
    }

    // ---- the endless spiral of dark washes ----
    drawVortex(L, lt, rev, HX, HY + 20);
    // the eye of the spiral: a cold pale haze round the heart, so it stays the light centre of the picture
    const hz = E.ep(lt, K.rise0 + 0.3, K.vort0 + 0.4);
    if (hz > 0) {
      lift(pnt, E.blob(HX, HY + 10, 210, { seed: 21, irr: 0.18, rx: 230, ry: 215 }), 0.16 * hz + 0.1 * rev, 60);
      E.glow(L.light, HX, HY, 340, '#7C7AB8', 0.16 * hz * (1 - 0.4 * tight));
    }

    // ---- the dark water ----
    const hy = E.lerp(SURF + 180, HY, rise) + 6 * Math.sin(lt * 1.6) * rise;
    const wp = waterPath(lt);
    for (const c of [L.ink, L.light]) { c.save(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 0.5; c.fill(wp); c.restore(); }
    wash(pnt, wp, '#2B2C4C', { grad: { from: [0, SURF - 20], to: [0, SURF + 900], stops: [[0, '#7380AE'], [0.05, '#4A5280'], [0.3, '#383D64'], [1, '#2A2A44']] }, alpha: 0.92 - 0.1 * rev });
    wash(pnt, wp, '#4A2E44', { alpha: 0.22, grad: { from: [0, SURF + 100], to: [0, SURF + 800], c2: '#22182A' } });
    pnt.save();
    pnt.globalCompositeOperation = 'source-over';
    const dv = pnt.createLinearGradient(0, SURF, 0, SURF + 520);
    dv.addColorStop(0, 'rgba(36,38,66,0.18)'); dv.addColorStop(0.35, 'rgba(36,38,66,0.5)'); dv.addColorStop(1, 'rgba(36,38,66,0.8)');
    pnt.fillStyle = dv; pnt.fill(wp);
    pnt.restore();
    pnt.save(); pnt.clip(wp);
    bloom(pnt, 860, SURF + 380, 320, '#1C1830', { seed: 41, alpha: 0.32, soft: 60 });
    bloom(pnt, 160, SURF + 560, 300, '#2E2038', { seed: 42, alpha: 0.26, soft: 60 });
    lift(pnt, E.blob(540, SURF + 40, 300, { rx: 700, ry: 50, seed: 3, irr: 0.2 }), 0.1, 30);
    // the heart under the water before it rises: a dim crimson glow welling up
    const under = E.ep(lt, K.glow0, K.rise0 + 0.2) * (1 - E.ep(lt, K.rise0 + 0.25, K.rise0 + 0.6));
    if (under > 0) {
      wash(pnt, E.blob(HX, SURF + 170, 90, { rx: 120, ry: 90, seed: 6, irr: 0.2 }), '#8A3A54', { mode: 'over', alpha: 0.42 * under, soft: 44 });
      E.glow(L.light, HX, SURF + 160, 230, '#B04E6A', 0.3 * under);
    }
    // the far world mirrored in the water (= s19's), fading as the bloom swallows it
    const rx = wx;
    const wA = 1 - 0.8 * E.ep(lt, K.bela, K.azap + 0.4);
    wash(pnt, E.blob(rx, SURF + 60, 50, { seed: 61, irr: 0.3, rx: 58, ry: 90 }), '#8FA39A', { mode: 'over', alpha: 0.16 * wA, soft: 30 });
    const rr = E.rng(61);
    for (let i = 0; i < 6; i++) {
      const yy = 9 + i * 15 + i * i * 3.2, ww = (70 - i * 10) * (0.6 + 0.4 * rr());
      const xx = rx + Math.sin(T * 1.3 + i * 2.3) * (5 + i * 2) + (rr() - 0.5) * 30;
      lift(pnt, E.blob(xx, surfY(xx, lt) + yy, ww, { rx: ww, ry: 2.6 + i * 0.2, seed: i + 2, irr: 0.45, n: 18 }), 0.3 * (1 - i / 7) * wA, 2.5);
    }
    // the heart's reflection: broken, wavering strokes of dark crimson (the heart upside down, rippled)
    if (rise > 0.3) {
      const ra = E.ep(rise, 0.3, 0.75);
      const top = 2 * SURF - (hy + HR * 0.95), k = HR / 100;
      const rq = E.rng(77);
      for (let i = 0; i < 13; i++) {
        const yy = top + i * 15 * k * 1.1 + (rq() - 0.5) * 6;
        const hyLocal = 95 - (i * 15 * 1.1); // heart-local y of the mirrored row (from the tip upward)
        let hwid = 0;
        for (const [px, py] of HB) if (Math.abs(py - hyLocal) < 9 && px > hwid) hwid = px;
        if (hwid <= 0) continue;
        const ww = hwid * k * (0.8 + 0.35 * E.noise1(i * 1.7 + T * 1.5, 7));
        const xx = HX + Math.sin(T * 2.4 + i * 1.1) * (6 + i * 1.6) + (rq() - 0.5) * 16;
        const gap = rq() < 0.45 ? ww * (0.15 + 0.25 * rq()) : 0; // some strokes break in two
        const aa = 0.42 * ra * (1 - i / 16) * (0.65 + 0.35 * rq());
        const th = 3.5 + rq() * 3;
        if (gap > 0) {
          const off = (rq() - 0.5) * ww * 0.6;
          wash(pnt, E.blob(xx - (ww + gap) / 2 + off, yy, (ww - gap) / 2, { rx: (ww - gap) / 2 + ww * 0.25, ry: th, seed: 30 + i, irr: 0.3, n: 16 }), '#5A2440', { mode: 'over', alpha: aa });
          wash(pnt, E.blob(xx + (ww + gap) / 2 + off, yy + 2, (ww - gap) / 2, { rx: (ww - gap) / 2 + ww * 0.15, ry: th * 0.9, seed: 50 + i, irr: 0.3, n: 16 }), '#5A2440', { mode: 'over', alpha: aa * 0.85 });
        } else {
          wash(pnt, E.blob(xx, yy, ww, { rx: ww, ry: th, seed: 30 + i, irr: 0.3, n: 18 }), '#5A2440', { mode: 'over', alpha: aa });
        }
      }
      E.glow(L.light, HX, 2 * SURF - hy, HR * 1.6, '#6E5A90', 0.1 * ra);
    }
    pnt.restore();
    const topL = [];
    for (let x = -160; x <= 1240; x += 18) topL.push([x, surfY(x, lt) + 3]);
    pnt.save(); pnt.globalCompositeOperation = 'source-over'; pnt.globalAlpha *= 0.28; pnt.strokeStyle = '#B5BEDA'; pnt.lineWidth = 3; pnt.stroke(E.smoothPath(topL)); pnt.restore();
    const topI = [];
    for (let x = -160; x <= 1240; x += 24) topI.push([x, surfY(x, lt)]);
    E.pencil(L.ink, topI, { w: 1.5, a: 0.3, seed: 6 });

    // emergence: rings spreading from where it breaks the surface, drops falling from it
    for (const [t0, s] of [[K.rise0 + 0.2, 1], [K.rise0 + 0.5, 0.8], [K.rise0 + 0.85, 0.6]]) {
      const u = (lt - t0) / 1.8;
      if (u <= 0 || u >= 1) continue;
      const rr2 = 60 + u * 520 * s;
      ring(pnt, HX, SURF + 5, rr2, rr2 * 0.1, '#B5BEDA', 2.6 * (1 - u) + 0.6, (1 - u) * 0.6);
    }
    const dr = E.rng(207);
    for (let i = 0; i < 12; i++) {
      const t0 = K.rise0 + 0.35 + dr() * 0.9, x0 = HX + (dr() - 0.5) * HR * 1.1, sz = 2.5 + dr() * 3.5, yo = 0.7 + 0.5 * dr();
      const tau = lt - t0;
      if (tau <= 0) continue;
      const hyAt = E.lerp(SURF + 180, HY, E.ease.outCubic(E.seg(t0, K.rise0, K.rise1)));
      const y0 = hyAt + HR * yo, y = y0 + 0.5 * 1900 * tau * tau;
      const sy = surfY(x0, lt);
      if (y > sy) {
        const v = tau - Math.sqrt(2 * Math.max(0, sy - y0) / 1900);
        if (v > 0 && v < 0.5) ring(pnt, x0, SURF + 3, 6 + v * 50, 2 + v * 6, '#B5BEDA', 1.4, (1 - v / 0.5) * 0.5);
        continue;
      }
      wash(pnt, E.blob(x0, y, sz, { rx: sz * 0.8, ry: sz * 1.3, seed: i, n: 10 }), '#5A2A3C', { mode: 'over' });
    }

    // ---- cracks of cold light (bela, azaptır) ----
    const f1 = drawCrack(L, lt, K.bela, 3, [1000, 0], [HX + 140, HY - 170]);
    const f2 = drawCrack(L, lt, K.azap, 7, [0, 520], [HX - 160, HY + 10]);
    const f3 = drawCrack(L, lt, K.azap + 0.18, 12, [760, 0], [HX + 40, HY - 210]);
    const fl = Math.max(f1, f2 * 1.1, f3 * 0.7);
    if (fl > 0.02) {
      L.light.save(); L.light.setTransform(1, 0, 0, 1, 0, 0); L.light.globalCompositeOperation = 'lighter';
      L.light.fillStyle = E.rgba('#8FA8E0', 0.12 * fl); L.light.fillRect(0, 0, E.W, E.H); L.light.restore();
    }

    // ---- the heart: risen, darkened, caught in the thorny vines ----
    if (lt > K.rise0 + 0.1) {
      const tp = E.ep(lt, K.thorn0, K.thorn1, 'linear');
      const vines = tp > 0 ? VINES.map((v) => ({ v, p: E.ease.outCubic(E.clamp((tp - v.d) / (1 - v.d))), V: vinePts(v, HX, hy, tight, lt) })).filter((o) => o.p > 0) : [];
      const clip = new Path2D(); clip.rect(-600, -600, 2280, surfY(HX, lt) + 600 + 2);
      E.save(L);
      E.each(L, (c) => c.clip(clip));
      for (const o of vines) drawVine(L, o.v, o.V, o.p, 0, 1);
      for (const o of vines) drawVine(L, o.v, o.V, o.p, 1, 1);
      const rot = 0.03 * Math.sin(lt * 1.1);
      const r = HR * (1 - 0.04 * tight);
      PR.heartLight(L, HX, hy, r, { t: lt + T0, color: '#8A3048', dark: 0.82 + 0.18 * dark, glow: 0.42 - 0.18 * dark - 0.1 * tight, pulse: 1.3 - 0.6 * tight, rot });
      // sick crimson glaze (deeper than the prop's own dark) + a cold wet rim catching the night light
      const hp = heartPath(HX, hy, r * 0.985, rot);
      wash(pnt, hp, '#6A2440', { alpha: 0.22 + 0.3 * dark + 0.12 * tight });
      pnt.save(); pnt.clip(hp);
      bloom(pnt, HX + r * 0.35, hy + r * 0.3, r * 0.6, '#2A1426', { seed: 7, alpha: 0.35 * dark + 0.2 * tight, soft: 18 });
      pnt.restore();
      pnt.save(); pnt.clip(hp);
      pnt.globalCompositeOperation = 'source-over';
      pnt.strokeStyle = E.rgba('#C9D4F4', 0.22 + 0.3 * fl);
      pnt.lineWidth = 5;
      pnt.translate(-3, -3);
      pnt.stroke(heartPath(HX, hy, r * 0.985, rot));
      pnt.restore();
      for (const o of vines) drawVine(L, o.v, o.V, o.p, 2, 1);
      E.restore(L);
      E.glow(L.light, HX - r * 0.35, hy - r * 0.45, r * 0.5, '#C9D6FF', 0.08 + 0.25 * fl);
    }
    // vignette: the night presses in
    const vg = 0.28 + 0.3 * rev;
    pnt.save();
    pnt.setTransform(1, 0, 0, 1, 0, 0);
    const g = pnt.createRadialGradient(540, 700, 260, 540, 860, 1250);
    g.addColorStop(0, 'rgba(30,36,66,0)');
    g.addColorStop(1, `rgba(22,24,44,${vg})`);
    pnt.globalCompositeOperation = 'multiply';
    pnt.fillStyle = g;
    pnt.fillRect(0, 0, E.W, E.H);
    pnt.restore();
  }

  E.scene('s20', {
    draw,
    wc: [1.05, 1.1, 3, 0.6],
    sfx() {
      // heartbeats synced to the heart prop's own beat (phase (t·0.8) mod 1 = 0.12)
      const beats = [];
      for (let n = 72; n < 76; n++) { const tb = (n + 0.12) / 0.8; if (tb > T0 + K.rise0 + 0.4 && tb < 94.2) beats.push({ t: tb, type: 'heart', gain: 0.32 }); }
      return [
        { t: T0 + K.rise0 + 0.15, type: 'water', gain: 0.3 },
        ...beats,
        { t: T0 + K.vort0, type: 'drone', gain: 0.3, dur: 3.6 },
        { t: T0 + K.thorn0 + 0.1, type: 'thorn', gain: 0.32 },
        { t: T0 + K.bela, type: 'rumble', gain: 0.5, dur: 1.6 },
        { t: T0 + K.azap, type: 'rumble', gain: 0.45, dur: 1.8 },
      ];
    },
  });
})();
