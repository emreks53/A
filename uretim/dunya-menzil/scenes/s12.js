/* s12 · 53.60–58.45 · "ona karşı şedit hırs ve talep ve muhabbet gibi hissiyatımızı"
   Closer on the gardener (side view, foreground), his nursery and the open gate behind him (softened by
   distance). "ona karşı": he faces his little world, a heart-light kindles in his chest. "şedit": it pulses hard.
   Three vigorous watercolour streams burst from it toward the nursery, one per feeling, each with a pencil label:
   "hırs" 55.09 vermilion · "talep" 55.91 amber · "muhabbet" 56.53 rose. "hissiyatımızı" 57.21: the three braid
   into one strong current arching over the nursery, hovering, the man's hands raised as if to direct it. */
(function () {
  const E = window.E;
  const P = E.P;
  const PR = E.props;

  // ==== WORLD BEGIN (identical in s11 / s12 / s13 — edit in s11 and sync) ====
  const HZ = 790;
  const GATE = { x: 640, y: 880, w: 240 };
  GATE.h = GATE.w * 1.75;
  GATE.light = [GATE.x, GATE.y - 56.75 * GATE.w / 100];     // radiant horizon point inside the arch
  const persp = (y) => (y - HZ) / (1180 - HZ);
  const aisleX = (y) => 640 + (604 - 640) * (y - GATE.y) / (1200 - GATE.y);
  const YB = 996, YF = 1200;                                 // nursery back / front edge
  const ROWS = [1030, 1096, 1166];
  const OFFS = [118, 258];
  const PLANTS = [];
  ROWS.forEach((ry, ri) => {
    const s = persp(ry);
    [-1, 1].forEach((sd) => OFFS.forEach((o, k) => {
      const jitter = ((ri * 7 + k * 3 + (sd > 0 ? 5 : 0)) % 5 - 2) * 4 * s;
      PLANTS.push({ x: aisleX(ry) + sd * o * s + jitter, y: ry, s, ri, sd, k, seed: 3 + ri * 4 + k * 2 + (sd > 0 ? 1 : 0) });
    }));
  });
  const GLOBE = { x: 532, y: 1058, r: 140 };
  const FOOT = { x: GLOBE.x, y: GLOBE.y + GLOBE.r * 0.93 };
  const MAN = { x: 250, y: 1212, h: 404 };

  const cam = (L, C, d) => E.camera(L, { x: 540 + (C.x - 540) * d, y: 960 + (C.y - 960) * d, zoom: 1 + (C.z - 1) * d });
  const poly = (pts) => {
    const p = new Path2D();
    pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
    p.closePath();
    return p;
  };
  const eraseInk = (L, path) => { L.ink.save(); L.ink.globalCompositeOperation = 'destination-out'; L.ink.fill(path); L.ink.restore(); };
  /** perspective block of tilled soil (sd −1 left / +1 right of the aisle) */
  const blockPts = (sd, yb = YB, yf = YF) => {
    const a = (y) => 46 * persp(y), o = (y) => 318 * persp(y);
    return [[aisleX(yb) + sd * a(yb), yb], [aisleX(yb) + sd * o(yb), yb], [aisleX(yf) + sd * o(yf), yf], [aisleX(yf) + sd * a(yf), yf]];
  };

  function sky(L) {
    const c = L.paint;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, 1100);
    g.addColorStop(0, E.shade(P.cerulean, 0.36));
    g.addColorStop(0.45, E.shade(P.skyWash, 0.55));
    g.addColorStop(0.78, E.shade(P.gamboge, 0.72));
    g.addColorStop(1, E.shade(P.ochre, 0.62));
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = g;
    c.fillRect(0, 0, E.W, E.H);
    c.restore();
    E.bloom(L.paint, 170, 260, 260, E.shade(P.cerulean, 0.25), { seed: 5, alpha: 0.22, soft: 60 });
    E.bloom(L.paint, 900, 120, 220, E.shade(P.ultramarine, 0.45), { seed: 8, alpha: 0.16, soft: 70 });
    E.bloom(L.paint, 760, 640, 260, E.shade(P.gamboge, 0.4), { seed: 11, alpha: 0.16, soft: 80 });
  }

  function birds(L, gt) {
    const lt = gt - 47.65;
    for (let i = 0; i < 3; i++) {
      const bx = 150 + i * 64 + lt * (24 + i * 5), by = 400 + i * 24 + Math.sin(lt * 1.3 + i) * 6;
      const f = Math.sin(lt * 7 + i * 2.1) * 6;
      E.pencil(L.ink, [[bx - 11, by - 3 - f * 0.4], [bx - 4, by - 1 + f * 0.2], [bx, by + 1], [bx + 4, by - 1 + f * 0.2], [bx + 11, by - 3 - f * 0.4]], { w: 1.6, a: 0.42, double: false });
    }
  }

  /** the knoll the gate stands on (hides the distant tree line behind its base); fades softly into the meadow */
  function knoll(L) {
    const pts = [[40, 916], [220, 884], [420, 868], [560, 864], [660, 864], [760, 870], [880, 890], [1020, 926], [1020, 1060], [40, 1060]];
    const p = E.smoothPath(pts, true, 0.45);
    const fade = { from: [0, 870], to: [0, 1060], stops: [[0, E.rgba('#B6D58A', 1)], [0.55, E.rgba('#B0D282', 1)], [1, E.rgba('#A6CC78', 0)]] };
    E.wash(L.paint, p, '#B6D58A', { mode: 'over', grad: fade });
    L.ink.save(); L.ink.globalCompositeOperation = 'destination-out'; L.ink.globalAlpha = 0.9; L.ink.fill(p); L.ink.restore();
    L.paint.save();
    L.paint.clip(p);
    E.wash(L.paint, E.rrect(60, 860, 980, 80, 0), '#ffffff', { mode: 'over', alpha: 0.55, grad: { from: [0, 868], to: [0, 935], stops: [[0, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']] } });
    L.paint.restore();
    E.pencil(L.ink, pts.slice(1, 8), { w: 1.1, a: 0.13, double: false });
  }

  /** the reveal of the nursery: an irregular wet wash spreading from the globe's foot */
  const revealClip = (reveal) => {
    const R = 40 + 600 * E.ease.outCubic(reveal);
    return E.blob(FOOT.x, FOOT.y, R, { rx: R * 1.25, ry: R * 0.56, seed: 4, irr: 0.12 });
  };

  /** footpath: from the gate threshold down the knoll, through the aisle, fading out into the meadow */
  function footpath(L, reveal) {
    if (reveal <= 0) return;
    const ys = [884, 940, YB, 1100, YF, 1300, 1420, 1560];
    const half = (y) => 15 + (y - 884) * 0.105 + Math.max(0, y - YF) * 0.04;
    const cx = (y) => (y <= YF ? aisleX(y) : aisleX(YF) - (y - YF) * 0.12 - Math.pow(Math.max(0, y - YF) / 360, 2) * 26);
    const left = ys.map((y) => [cx(y) - half(y), y]), right = ys.map((y) => [cx(y) + half(y), y]).reverse();
    const p = E.wobblyShape(left.concat(right), { seed: 9, amp: 2.5, step: 30 });
    E.save(L);
    if (reveal < 1) { const c = revealClip(reveal); L.paint.clip(c); L.ink.clip(c); }
    E.wash(L.paint, p, '#E6D6AC', { mode: 'over', grad: { from: [0, 880], to: [0, 1560], stops: [[0, E.rgba('#EADDB8', 1)], [0.5, E.rgba('#E3D2A6', 1)], [0.64, E.rgba('#DCCB9C', 0.5)], [0.78, E.rgba('#D6C597', 0)], [1, E.rgba('#D6C597', 0)]] } });
    E.wash(L.paint, p, '#B0915E', { alpha: 0.5, grad: { from: [0, 880], to: [0, 1560], stops: [[0, 'rgba(255,255,255,0)'], [0.45, E.rgba('#A8895A', 0.4)], [0.62, E.rgba('#A8895A', 0.2)], [0.78, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']] } });
    E.dryBrush(L.paint, ys.slice(2, 5).map((y) => [cx(y) - half(y) * 0.45, y]), '#B49466', { width: 7, seed: 71, alpha: 0.22, bristles: 4 });
    E.dryBrush(L.paint, ys.slice(2, 5).map((y) => [cx(y) + half(y) * 0.4, y]), '#B49466', { width: 6, seed: 72, alpha: 0.2, bristles: 4 });
    eraseInk(L, p);
    E.pencil(L.ink, left.slice(0, 5), { w: 1, a: 0.14, double: false });
    E.pencil(L.ink, right.slice(-5), { w: 1, a: 0.14, double: false });
    E.restore(L);
  }

  function gate(L, gt, haze, appear, open, accent) {
    const { x, y, w, h } = GATE;
    if (haze > 0) {
      // golden haze from which the gate emerges, staying as a halo
      const hz = haze * (1 - 0.45 * appear);
      E.lift(L.paint, E.blob(x, y - h * 0.5, 200, { rx: 210, ry: 280, seed: 23, irr: 0.18 }), 0.8 * hz, 50);
      E.wash(L.paint, E.blob(x, y - h * 0.5, 240, { rx: 260, ry: 300, seed: 21, irr: 0.18 }), E.shade(P.gamboge, 0.3), { alpha: 0.3 * haze, soft: 80 });
      E.glow(L.light, x, y - h * 0.45, 380, '#FFE2A0', 0.26 * haze + 0.12 * open + 0.1 * accent);
    }
    if (appear <= 0) return;
    E.save(L);
    const sc = 0.97 + 0.03 * E.ease.outCubic(appear);
    E.translate(L, x, y); E.scale(L, sc); E.translate(L, -x, -y);
    PR.archGate(L, x, y, w, h, { open, glow: Math.min(1, open * (0.88 + 0.12 * Math.sin(gt * 1.7)) + accent * 0.3), t: gt, alpha: appear });
    E.restore(L);
    if (open > 0.05) E.rays(L.light, GATE.light[0], GATE.light[1], { n: 9, len: 560, spread: 2.5, angle: Math.PI / 2, width: 0.05, color: '#FFE9B8', a: 0.1 * open + 0.06 * accent, seed: 13, t: gt });
  }

  function mound(L, x, y, s, a) {
    if (a <= 0) return;
    const w = 26 * s, hh = 7 * s;
    const p = E.smoothPath([[x - w, y + 2 * s], [x - w * 0.6, y - hh * 0.6], [x, y - hh], [x + w * 0.6, y - hh * 0.55], [x + w, y + 2 * s], [x, y + 4 * s]], true);
    E.wash(L.paint, p, '#B48A63', { mode: 'over', alpha: a });
    E.wash(L.paint, p, '#6E4E3A', { alpha: 0.35 * a, grad: { from: [x - w, y - hh], to: [x + w, y + 2 * s], stops: [[0, 'rgba(255,255,255,0)'], [1, E.rgba('#6E4E3A', 0.6)]] } });
    eraseInk(L, p);
    if (s > 0.5) E.pencil(L.ink, [[x - w, y + 1.5 * s], [x - w * 0.55, y - hh * 0.6], [x, y - hh], [x + w * 0.55, y - hh * 0.55], [x + w, y + 1.5 * s]], { w: 1.1, a: 0.28 * a, double: false });
  }

  function soil(L, reveal) {
    if (reveal <= 0) return;
    const clip = revealClip(reveal);
    E.save(L);
    L.paint.clip(clip); L.ink.clip(clip);
    for (const sd of [-1, 1]) {
      const pts = blockPts(sd);
      const path = E.wobblyShape(pts, { seed: 30 + sd, amp: 3.5, step: 26 });
      E.wash(L.paint, path, '#D7BB93', { mode: 'over', soft: 2 });
      const cxm = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4;
      E.bloom(L.paint, cxm - sd * 40, 1060, 110, '#B8916B', { seed: 40 + sd, alpha: 0.35, soft: 26 });
      E.bloom(L.paint, cxm + sd * 70, 1150, 120, '#A57E5C', { seed: 44 + sd, alpha: 0.3, soft: 30 });
      E.bloom(L.paint, cxm + sd * 20, 1010, 80, '#E6D2AE', { seed: 47 + sd, alpha: 0.5, soft: 20 });
      E.wash(L.paint, path, '#8A6446', { alpha: 0.45, grad: { from: [0, YB], to: [0, YF], stops: [[0, 'rgba(255,255,255,0)'], [1, E.rgba('#8A6446', 0.45)]] } });
      ROWS.forEach((ry, ri) => {
        const s = persp(ry);
        const x0 = aisleX(ry) + sd * 54 * s, x1 = aisleX(ry) + sd * 310 * s;
        E.wash(L.paint, poly([[x0, ry - 2 * s], [x1, ry - 2 * s], [x1, ry + 9 * s], [x0, ry + 9 * s]]), '#8E6A4C', { alpha: 0.32, soft: 3 * s });
        E.lift(L.paint, poly([[x0, ry + 10 * s], [x1, ry + 10 * s], [x1, ry + 14 * s], [x0, ry + 14 * s]]), 0.35, 2);
        E.dryBrush(L.paint, [[x0, ry + 4 * s], [(x0 + x1) / 2, ry + 5 * s], [x1, ry + 4 * s]], '#6E5040', { width: 7 * s, seed: 50 + ri * 3 + sd, alpha: 0.35, bristles: 4 });
        E.pencil(L.ink, [[x0, ry + 9 * s], [x1, ry + 9 * s]], { w: 1, a: 0.14, double: false });
      });
      E.splatter(L.paint, cxm, 1110, 120, '#7A5A44', { seed: 60 + sd, n: 12, size: 2.6, alpha: 0.45 });
      E.pencil(L.ink, path, { w: 1.1, a: 0.24 });
    }
    E.restore(L);
  }

  /** part: 'side' (outer edges: draw before the plants), 'front' (draw after them), or both */
  function fence(L, reveal, part) {
    if (reveal <= 0) return;
    const doSide = part !== 'front', doFront = part !== 'side';
    const yf = YF + 6;
    for (const sd of [-1, 1]) {
      const pts = blockPts(sd, YB - 4, yf);
      const line = doSide && doFront ? [pts[1], pts[2], pts[3]] : doSide ? [pts[1], pts[2]] : [pts[2], pts[3]];
      const posts = [];
      if (doSide) for (let i = 0; i < 3; i++) posts.push([E.lerp(pts[1][0], pts[2][0], i / 3), E.lerp(pts[1][1], pts[2][1], i / 3)]);
      if (doFront) for (let i = 0; i <= 4; i++) posts.push([E.lerp(pts[2][0], pts[3][0], i / 4), yf]);
      const vis = posts.map(([x, y]) => {
        const d = Math.hypot((x - FOOT.x) / 1.25, (y - FOOT.y) / 0.55);
        return E.ease.outBackSoft(E.clamp((reveal * 680 - d) / 150));
      });
      const rv = E.clamp(reveal * 1.8 - 0.8);
      if (rv > 0) {
        for (const k of [0.42, 0.8]) {
          const top = line.map(([x, y]) => [x, y - 42 * persp(y) * k]);
          const thick = (y) => 4.2 * persp(y);
          const band = poly(top.concat(top.slice().reverse().map(([x, y]) => [x, y + thick(y)])));
          E.wash(L.paint, band, '#B48C62', { mode: 'over', alpha: rv });
          E.wash(L.paint, poly(top.map(([x, y]) => [x, y + thick(y) * 0.5]).concat(top.slice().reverse().map(([x, y]) => [x, y + thick(y)]))), '#6E5040', { alpha: 0.4 * rv });
          eraseInk(L, band);
          E.pencil(L.ink, top, { w: 1, a: 0.26 * rv, double: false });
        }
      }
      posts.forEach(([x, y], i) => {
        const k = vis[i];
        if (k <= 0.01) return;
        const s = persp(y);
        const hh = 50 * s * k, ww = 4.4 * s;
        const p = E.smoothPath([[x - ww, y + 2], [x - ww, y - hh + ww], [x, y - hh], [x + ww, y - hh + ww], [x + ww, y + 2]], true, 0.2);
        E.wash(L.paint, p, '#C9A274', { mode: 'over' });
        E.wash(L.paint, E.rrect(x + ww * 0.1, y - hh + ww, ww * 0.9, hh - ww + 2, 1), '#6E5040', { alpha: 0.5 });
        eraseInk(L, p);
        E.pencil(L.ink, p, { w: 1, a: 0.3, double: false });
      });
    }
  }

  function plants(L, gt, reveal) {
    for (const pl of PLANTS) {
      const d = Math.hypot((pl.x - FOOT.x) / 1.25, (pl.y - FOOT.y) / 0.55);
      const k = E.clamp((reveal * 680 - d) / 170);
      if (k <= 0) continue;
      const pop = E.ease.outBackSoft(k);
      const s = pl.s;
      mound(L, pl.x, pl.y, s, E.clamp(k * 2));
      PR.sapling(L, pl.x, pl.y - 3 * s, 122 * s * pop, { t: gt + pl.seed, growth: 0.35 + 0.65 * k, seed: pl.seed, stake: true, soil: false });
    }
  }

  /** near foreground: deeper meadow, grass blades and wildflowers at the bottom corners (gives depth, echoes the
      flower band of the style reference). Coordinates = screen px at the reference wide framing (x 560, y 950,
      z 1.245). Callers place it with fgCam (parallax 1.15) or their own transform. Stays below y ≈ 1600. */
  const FG = [
    [40, 1900, 290, 'daisy', 2], [138, 1940, 230, 'tulip', 3, '#D7685B'], [236, 1930, 250, 'daisy', 5],
    [-14, 1960, 210, 'wild', 4], [330, 1970, 170, 'daisy', 9], [96, 1990, 160, 'wild', 10],
    [790, 1960, 190, 'daisy', 6], [884, 1930, 260, 'tulip', 7, '#DE8C7C'], [990, 1900, 290, 'daisy', 8],
  ];
  const BLADES = (() => {
    const r = E.rng(93), out = [];
    for (let i = 0; i < 30; i++) {
      const left = i < 17;
      const x = left ? -20 + r() * 380 : 740 + r() * 360;
      const edge = left ? Math.max(0, 1 - x / 380) : Math.max(0, (x - 740) / 360);
      out.push({ x, y: 1960 + r() * 30, h: 70 + r() * 120 * (0.5 + edge), bend: (r() - 0.5) * 0.9 + (left ? -0.15 : 0.15), w: 7 + r() * 6, c: r() < 0.5 ? '#6F9C55' : '#4F7E46', ph: r() * 6 });
    }
    return out;
  })();
  function fgCam(L, C) {
    cam(L, C, 1.15);
    const z = 1 + 0.245 * 1.15, cx = 540 + 20 * 1.15, cy = 960 - 10 * 1.15;
    E.translate(L, cx - 540 / z, cy - 960 / z);
    E.scale(L, 1 / z);
  }
  function foreground(L, gt) {
    for (const [cx, w, seed] of [[110, 430, 81], [980, 400, 82]]) {
      E.wash(L.paint, E.blob(cx, 2010, w, { rx: w, ry: 300, seed, irr: 0.14 }), '#86AE5E', { alpha: 0.5, soft: 34 });
      E.wash(L.paint, E.blob(cx + (cx < 540 ? -40 : 40), 2050, w * 0.75, { rx: w * 0.75, ry: 230, seed: seed + 3, irr: 0.2 }), '#4D7A45', { alpha: 0.32, soft: 26 });
    }
    for (const b of BLADES) {
      const sw = b.bend + 0.06 * Math.sin(gt * 1.3 + b.ph);
      const tip = [b.x + Math.sin(sw) * b.h, b.y - Math.cos(sw) * b.h];
      const mid = [b.x + Math.sin(sw * 0.45) * b.h * 0.55, b.y - b.h * 0.55];
      const p = new Path2D();
      p.moveTo(b.x - b.w / 2, b.y);
      p.quadraticCurveTo(mid[0] - b.w * 0.35, mid[1], tip[0], tip[1]);
      p.quadraticCurveTo(mid[0] + b.w * 0.35, mid[1], b.x + b.w / 2, b.y);
      p.closePath();
      E.wash(L.paint, p, b.c, { alpha: 0.78 });
    }
    for (const f of FG) PR.flower(L, f[0], f[1], f[2], { kind: f[3], seed: f[4], t: gt + f[4] * 1.7, color: f[5] });
  }

  // ==== WORLD END ====

  const COL = ['#D8462F', '#DE9F2E', '#C65E7C'];          // hırs · talep · muhabbet
  const NAMES = ['hırs', 'talep', 'muhabbet'];

  /** resample a polyline to n points evenly spaced by arc length */
  function resample(pts, n) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tot = cum[cum.length - 1] || 1;
    const out = [];
    let j = 0;
    for (let k = 0; k < n; k++) {
      const s = (tot * k) / (n - 1);
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const f = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
      out.push([E.lerp(pts[j][0], pts[j + 1][0], f), E.lerp(pts[j][1], pts[j + 1][1], f)]);
    }
    return out;
  }
  const normalAt = (pts, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  const bez = (p0, p1, p2, p3, u) => {
    const v = 1 - u;
    return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
  };
  /** a cubic curve with one smooth, slightly egg-shaped loop tangent to it at u0 (radius R, side ±1) —
      the gesture of a ribbon thrown through the air */
  function loopCurve(p0, p1, p2, p3, u0, R, side) {
    const out = [];
    const n1 = 60;
    for (let i = 0; i <= n1; i++) out.push(bez(p0, p1, p2, p3, (u0 * i) / n1));
    const a = bez(p0, p1, p2, p3, u0), b = bez(p0, p1, p2, p3, u0 + 0.002);
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const sx = -ty * side, sy = tx * side;
    for (let i = 1; i < 48; i++) {
      const f = (i / 48) * E.TAU;
      const rr = R * (1 + 0.16 * Math.sin(f - 0.7));
      out.push([a[0] + (Math.sin(f) * tx + (1 - Math.cos(f)) * sx) * rr, a[1] + (Math.sin(f) * ty + (1 - Math.cos(f)) * sy) * rr]);
    }
    for (let i = 1; i <= n1; i++) out.push(bez(p0, p1, p2, p3, u0 + ((1 - u0) * i) / n1));
    return out;
  }

  const N = 160;
  // each feeling's own gesture from the heart O (screen space): hırs lunges low over the saplings and hooks down
  // (grasping); talep spirals up high (wanting more); muhabbet throws one wide, embracing loop through the middle
  const OWN = (O) => [
    resample(loopCurve(O, [430, 790], [640, 770], [868, 930], 0.6, 74, 1), N),
    resample(loopCurve(O, [400, 640], [470, 330], [790, 210], 0.5, 80, -1), N),
    resample(loopCurve(O, [420, 660], [640, 560], [900, 590], 0.62, 96, -1), N),
  ];
  const LABEL = [[884, 1012, -0.05], [846, 150, 0.04], [846, 676, -0.03]];

  // the braid: three strands twining around one arching spine (forward from the heart, high over the nursery)
  function braid(O, lt, i) {
    const tip = [878 + 10 * Math.sin(lt * 1.3), 676 + 14 * Math.sin(lt * 1.7 + 1)];
    const s0 = O, s1 = [O[0] + 250, O[1] - 190], s2 = [tip[0] - 70, 150], s3 = tip;
    const pts = [];
    for (let k = 0; k < N; k++) pts.push(bez(s0, s1, s2, s3, k / (N - 1)));
    const sp = resample(pts, N);
    return sp.map((q, k) => {
      const u = k / (N - 1);
      const [nx, ny] = normalAt(sp, k);
      const A = 20 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.12)), 0.6) * Math.min(1, u * 5);
      const w = A * Math.sin(u * 7 * Math.PI - lt * 4.4 + (i * E.TAU) / 3);
      return [q[0] + nx * w, q[1] + ny * w];
    });
  }

  E.scene('s12', {
    draw(L, lt, t, shot) {
      const T = (i) => E.T(i) - shot.start;
      const tOna = T(101) - 0.1;        // "ona karşı" 53.85
      const tSedit = T(103) - 0.08;     // "şedit" 54.65
      const tB = [T(104) - 0.12, T(106) - 0.12, T(108) - 0.12];   // hırs 55.09 · talep 55.91 · muhabbet 56.53
      const tBraid = T(110) - 0.1;      // "hissiyatımızı" 57.21

      // ---------------- background: the nursery seen from close beside the man; the garden's light behind it
      const C = { x: 636 + lt * 4, y: 1004 - lt * 2, z: 1.5 + lt * 0.012 };
      sky(L);
      cam(L, C, 0.3);
      const ct = t - 47.65;
      PR.cloud(L, 230 + ct * 6, 250, 300, { seed: 3, t });
      PR.cloud(L, 980 + ct * 4, 330, 200, { seed: 7, t });
      cam(L, C, 0.6);
      birds(L, t);
      cam(L, C, 0.88);
      PR.ground(L, HZ + 32, { palette: 'garden', seed: 3, t, trees: 0.32, flowers: 0.8, x0: -300, x1: 1380 });
      cam(L, C, 1);
      knoll(L);
      gate(L, t, 1, 1, 1, 0);
      E.save(L);
      { const cl = new Path2D(); cl.rect(-600, 0, 2400, 1208); L.paint.clip(cl); L.ink.clip(cl); }
      footpath(L, 1);
      E.restore(L);
      soil(L, 1);
      fence(L, 1, 'side');
      plants(L, t, 1);
      fence(L, 1, 'front');
      // depth: the distance dissolves into warm light (strong at the top, little over the near nursery)
      E.resetCamera(L);
      const veil = E.rrect(0, 0, E.W, E.H, 0);
      E.wash(L.paint, veil, '#ffffff', { mode: 'over', grad: { from: [0, 0], to: [0, 1500], stops: [[0, 'rgba(255,253,246,0.44)'], [0.42, 'rgba(255,250,236,0.52)'], [0.62, 'rgba(255,250,240,0.16)'], [1, 'rgba(255,255,255,0.06)']] } });
      E.wash(L.paint, E.blob(560, 560, 420, { rx: 560, ry: 420, seed: 3, irr: 0.2 }), E.shade(P.gamboge, 0.45), { alpha: 0.26, soft: 120 });
      E.glow(L.light, 600, 600, 640, '#FFE6B0', 0.2);
      L.ink.save(); L.ink.globalCompositeOperation = 'destination-out'; L.ink.globalAlpha = 0.45; L.ink.fillRect(0, 0, E.W, E.H); L.ink.restore();
      // the background's light stays soft so it never washes out the feelings that cross in front of it
      L.light.save(); L.light.globalCompositeOperation = 'destination-out'; L.light.globalAlpha = 0.45; L.light.fillRect(0, 0, E.W, E.H); L.light.restore();

      // ---------------- the man (foreground, screen space)
      const MX = 188 - lt * 5, MY = 1490, MH = 990;
      const gaze = { lean: -0.03, head: -0.3, nS: 0.08, nE: 0.16, fS: -0.03, fE: 0.18, nH: 0.04, nK: 0.04, fH: -0.04, fK: 0.04 };
      const calm = { lean: 0.04, head: 0.2, nS: 0.08, nE: 0.14, fS: -0.04, fE: 0.16, nH: 0.04, nK: 0.04, fH: -0.04, fK: 0.04 };
      const surge = { lean: -0.06, head: -0.04, nS: -0.26, nE: 0.3, fS: -0.36, fE: 0.36, nH: 0.05, nK: 0.05, fH: -0.06, fK: 0.06 };
      // directing: the near hand held open beneath the current, the other relaxed forward
      const direct = { lean: 0.03, head: -0.14, nS: 0.78, nE: 0.95, nW: -0.45, fS: 0.12, fE: 0.3, nH: 0.06, nK: 0.05, fH: -0.07, fK: 0.07 };
      let pose = E.man.lerp(gaze, calm, E.ep(lt, tOna - 0.05, tOna + 0.65, 'inOutCubic'));   // from the gate down to the nursery
      pose = E.man.lerp(pose, surge, E.ep(lt, tB[0] - 0.15, tB[0] + 0.35, 'outCubic'));
      pose = E.man.lerp(pose, direct, E.ep(lt, tBraid - 0.05, tBraid + 0.75, 'inOutCubic'));
      // a small recoil at each burst
      let kick = 0;
      for (const tb of tB) kick += Math.exp(-Math.pow((lt - tb - 0.12) / 0.12, 2));
      pose.lean -= 0.035 * kick;
      pose.head += 0.01 * Math.sin(lt * 1.5);
      E.man.shadow(L, MX + 14, MY, MH);
      E.man.draw(L, { x: MX, y: MY, h: MH, view: 'side', facing: 1, pose });

      // heart-light at his chest
      const O = [MX + MH * 0.05 - kick * 6, MY - MH * 0.705];
      const kindle = E.ep(lt, tOna, tOna + 0.6, 'inOutSine');
      const sedit = Math.exp(-Math.pow((lt - tSedit - 0.15) / 0.18, 2));
      const hr = 32 * (0.6 + 0.4 * kindle) * (1 + 0.25 * sedit + 0.12 * kick);
      if (kindle > 0) {
        E.glow(L.light, O[0], O[1], 120 + 80 * sedit, '#FFC9B0', 0.35 * kindle + 0.4 * sedit);
        PR.heartLight(L, O[0], O[1], hr, { t, glow: 0.6 + 0.4 * sedit, alpha: kindle, pulse: 1.4 });
      }
      if (sedit > 0.02) {
        // "şedit": two hard pulse rings
        L.light.save(); L.light.globalCompositeOperation = 'lighter';
        for (const d of [0, 0.14]) {
          const u = E.seg(lt, tSedit + d, tSedit + d + 0.55);
          if (u <= 0 || u >= 1) continue;
          L.light.strokeStyle = E.rgba('#FFD2BC', 0.5 * (1 - u));
          L.light.lineWidth = 9 * (1 - u) + 2;
          L.light.beginPath(); L.light.arc(O[0], O[1], 34 + 190 * E.ease.outCubic(u), 0, E.TAU); L.light.stroke();
        }
        L.light.restore();
      }

      // ---------------- the three feelings
      const own = OWN(O);
      const m = E.ep(lt, tBraid, tBraid + 0.9, 'inOutCubic');
      const labelsA = 1 - E.ep(lt, tBraid, tBraid + 0.45);
      for (let i = 0; i < 3; i++) {
        const p = E.ep(lt, tB[i], tB[i] + 0.6, 'outCubic');
        if (p <= 0) continue;
        // living undulation (vigorous right after the burst, calmer later): a wave travelling out along the stream
        const vig = 1 + 1.2 * Math.exp(-(lt - tB[i]) * 1.8);
        const ownLive = own[i].map((q, k) => {
          const u = k / (N - 1);
          const [nx, ny] = normalAt(own[i], k);
          const w = 9 * vig * Math.pow(Math.sin(Math.PI * u), 0.8) * Math.sin(u * 3.2 * Math.PI - lt * 3.4 + i * 2.1);
          return [q[0] + nx * w, q[1] + ny * w];
        });
        const pts = m > 0 ? (() => { const b = braid(O, lt, i); return ownLive.map((q, k) => [E.lerp(q[0], b[k][0], m), E.lerp(q[1], b[k][1], m)]); })() : ownLive;
        // p stays just below 1 so the stream ends in a brushy point, not a blunt cap
        PR.ribbon(L, pts, { p: Math.min(0.994, p), width: E.lerp(60, 44, m), color: COL[i], t: t * (1.2 + 0.5 * m), glow: 0.35 + 0.15 * m, twist: E.lerp(1.3, 0.8, m), seed: i + 2 });
        // "şedit": paint flung off the stream as it bursts (fades as the feelings unite)
        const spA = E.ep(lt, tB[i] + 0.15, tB[i] + 0.4) * (1 - E.ep(lt, tBraid, tBraid + 0.5));
        if (spA > 0) {
          const far = ownLive[Math.round((N - 1) * 0.9)];
          E.splatter(L.paint, far[0], far[1], 70, COL[i], { seed: 19 + i * 5, n: 9, size: 5, alpha: 0.55 * spA });
        }
        // burst light at the heart
        const flash = Math.exp(-Math.pow((lt - tB[i] - 0.05) / 0.14, 2));
        if (flash > 0.02) E.glow(L.light, O[0], O[1], 160, E.mix(COL[i], '#FFFFFF', 0.5), 0.65 * flash);
        // label beside the stream
        const lp = E.ep(lt, tB[i] + 0.32, tB[i] + 0.8, 'linear');
        if (lp > 0 && labelsA > 0) {
          const [lx, ly, rot] = LABEL[i];
          E.note(L.ink, NAMES[i], lx, ly, { size: 62, p: lp, alpha: 0.84 * labelsA, rot });
        }
      }
      if (m > 0) {
        // the united current glows and sheds a few sparks along its length
        const b = braid(O, lt, 0);
        const head = b[N - 1];
        E.glow(L.light, head[0], head[1], 130, '#FFD9B8', 0.4 * m);
        E.motes(L.light, { x: head[0] - 380, y: 140, w: 480, h: 560, n: 16, t: lt, seed: 41, size: 2.8, a: 0.6 * m, rise: 30, color: '#FFE6D0' });
      }

      // ---------------- near foreground (meadow flowers, the same as in the wide shots, closer)
      E.save(L);
      E.translate(L, -52 - lt * 7, 1930);
      E.scale(L, 1.1);
      E.translate(L, 0, -1900);
      foreground(L, t);
      E.restore(L);
    },
    sfx() {
      const T = (i) => E.T(i);
      return [
        { t: T(101) - 0.05, type: 'heart', gain: 0.32 },
        { t: T(103) - 0.05, type: 'heart', gain: 0.42 },
        { t: T(104) - 0.12, type: 'whoosh', gain: 0.38 },
        { t: T(106) - 0.12, type: 'whoosh', gain: 0.34, pitch: 1.12 },
        { t: T(108) - 0.12, type: 'whoosh', gain: 0.34, pitch: 0.92 },
        { t: T(110) - 0.05, type: 'swell', gain: 0.34, dur: 1.2 },
      ];
    },
  });
})();
