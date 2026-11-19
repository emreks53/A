/* s13 · 58.45–63.75 · "onun neticesi ve semeresi ve sümbülü olan uhrevî fevaidine çevirsek"
   Wide again (cut): the braided current from the man's heart turns and pours down into the nursery's aisle; the
   water of light runs along the furrows to every root. "neticesi": the saplings grow into young trees. "semeresi":
   pomegranates and apples ripen, glowing. "sümbülü": golden wheat springs up between the trees. "uhrevî
   fevaidine": fruits and grain lift off as small lights and float through the arch into the garden beyond.
   "çevirsek": the current itself flows on along the path, through the gate, into the garden. The camera pushes
   gently toward the gate (s14 bleeds in from 540,1100). */
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

  const COL = ['#D8462F', '#DE9F2E', '#C65E7C'];
  const FRUIT = ['#D1453F', '#E58A3A'];             // pomegranate (left block) · apple (right block)
  const TREE_H = 168;                               // × persp: young trees (crown ≈ 0.7·h; the aisle stays open)
  const LAND = [aisleX(1122), 1122];                // where the current pours into the aisle

  const bez = (p0, p1, p2, p3, u) => {
    const v = 1 - u;
    return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
  };
  const normalAt = (pts, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
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

  // per-plant timing: water reaches the plant, then it grows
  const plantT0 = (pl) => 0.42 + Math.abs(pl.y - LAND[1]) * 0.0016 + pl.k * 0.16 + (pl.sd > 0 ? 0.04 : 0);
  const plantK = (pl, lt) => E.ep(lt, plantT0(pl), plantT0(pl) + 1.05, 'outCubic');
  const treeH = (pl, lt) => TREE_H * pl.s * (0.8 + 0.2 * E.ease.outBackSoft(plantK(pl, lt)));
  const plantOpts = (pl, lt, gt, fruitV) => ({ kind: 'fruit', seed: pl.seed, t: gt + pl.seed, growth: E.lerp(0.3, 1, plantK(pl, lt)), fruit: fruitV, fruitColor: FRUIT[pl.sd < 0 ? 0 : 1] });
  // fruits ripen at "semeresi", are harvested as lights at "uhrevî fevaidine"
  const ripenV = (pl, lt, tR) => E.ep(lt, tR + pl.k * 0.08 + pl.ri * 0.06, tR + 0.75 + pl.k * 0.08 + pl.ri * 0.06, 'inOutSine');
  // all fruits are fully ripe for v ≥ 0.7; fruit j vanishes (ripeness 0.5) at v ≈ tau·0.6 + 0.2 ∈ [0.2, 0.5]
  const harvestV = (lt, tH) => (lt < tH - 0.15 ? 1 - 0.4 * E.ep(lt, tH - 0.35, tH - 0.15, 'inOutSine') : 0.6 - 0.58 * E.seg(lt, tH - 0.15, tH + 0.85));

  // wheat clumps between the trees
  const WHEAT = [];
  ROWS.forEach((ry, ri) => {
    const s = persp(ry);
    [-1, 1].forEach((sd) => {
      [(OFFS[0] + OFFS[1]) / 2, OFFS[1] + 46, OFFS[0] - 52].forEach((o, k) => {
        WHEAT.push({ x: aisleX(ry) + sd * o * s, y: ry + 10 * s, s, ri, sd, k, seed: 20 + ri * 6 + k * 2 + (sd > 0 ? 1 : 0) });
      });
    });
  });

  function water(L, lt, gt, tPour) {
    // luminous irrigation running along the aisle and the furrows
    const lc = L.light;
    for (const ry of ROWS) {
      const s = persp(ry);
      const tRow = tPour + 0.08 + Math.abs(ry - LAND[1]) * 0.0016;
      for (const sd of [-1, 1]) {
        const k = E.ep(lt, tRow, tRow + 0.7, 'outCubic');
        if (k <= 0) continue;
        const x0 = aisleX(ry) + sd * 9 * s, x1 = aisleX(ry) + sd * (52 + (310 - 52) * k) * s;
        const y = ry + 6 * s, hh = 4.2 * s;
        const band = E.smoothPath([[x0, y - hh], [x1, y - hh * 0.6], [x1 + sd * 3, y], [x1, y + hh * 0.6], [x0, y + hh]], true, 0.3);
        E.wash(L.paint, band, '#F3C2A2', { mode: 'over', alpha: 0.85 });
        E.wash(L.paint, band, '#D98A7A', { alpha: 0.35 });
        L.ink.save(); L.ink.globalCompositeOperation = 'destination-out'; L.ink.fill(band); L.ink.restore();
        lc.save(); lc.globalCompositeOperation = 'lighter'; lc.fillStyle = E.rgba('#FFD9B8', 0.22); lc.fill(band); lc.restore();
        // glints flowing outward
        for (let g = 0; g < 4; g++) {
          const u = ((gt * 0.5 + g / 4 + (sd > 0 ? 0.13 : 0)) % 1) * k;
          E.glow(lc, aisleX(ry) + sd * (52 + 258 * u) * s, y, 9 * s + 4, '#FFF3E0', 0.45 * k);
        }
      }
    }
    // the aisle channel (from the landing point back and forth)
    const ka = E.ep(lt, tPour, tPour + 0.5, 'outCubic');
    if (ka > 0) {
      const yb = E.lerp(LAND[1], ROWS[0] - 6, ka), yf = E.lerp(LAND[1], ROWS[2] + 22, ka);
      const ys = [];
      for (let i = 0; i <= 8; i++) ys.push(E.lerp(yb, yf, i / 8));
      const half = (y) => 7 * persp(y);
      const ch = E.smoothPath(ys.map((y) => [aisleX(y) - half(y), y]).concat(ys.slice().reverse().map((y) => [aisleX(y) + half(y), y])), true, 0.3);
      E.wash(L.paint, ch, '#F3C2A2', { mode: 'over', alpha: 0.9 });
      E.wash(L.paint, ch, '#D98A7A', { alpha: 0.3 });
      L.ink.save(); L.ink.globalCompositeOperation = 'destination-out'; L.ink.fill(ch); L.ink.restore();
      lc.save(); lc.globalCompositeOperation = 'lighter'; lc.fillStyle = E.rgba('#FFD9B8', 0.28); lc.fill(ch); lc.restore();
    }
  }

  function growPlant(L, pl, lt, gt, tR, hv) {
    const s = pl.s;
    const k = plantK(pl, lt);
    mound(L, pl.x, pl.y, s, 1);
    const sapA = 1 - E.smooth(E.seg(k, 0.02, 0.2));
    if (sapA > 0.01) PR.sapling(L, pl.x, pl.y - 3 * s, 122 * s * (1 + 0.15 * E.seg(k, 0, 0.2)), { t: gt + pl.seed, growth: 1, seed: pl.seed, stake: true, soil: false, alpha: sapA });
    if (k > 0) {
      const o = plantOpts(pl, lt, gt, ripenV(pl, lt, tR) * hv);
      o.alpha = E.smooth(E.seg(k, 0, 0.16));
      PR.tree(L, pl.x, pl.y - 2 * s, treeH(pl, lt), o);
      // a little burst of life as the crown unfolds
      const t0 = plantT0(pl), sp = Math.sin(Math.PI * E.seg(lt, t0 + 0.15, t0 + 0.75));
      if (sp > 0.01) {
        const h = treeH(pl, lt), cy = pl.y - h * 0.62;
        E.glow(L.light, pl.x, cy, h * 0.55, '#F4FFD8', 0.35 * sp);
        E.motes(L.light, { x: pl.x - h * 0.4, y: cy - h * 0.35, w: h * 0.8, h: h * 0.6, n: 6, t: lt, seed: 300 + pl.seed, size: 2.6, a: 0.9 * sp, rise: 40, color: '#FFFBE6' });
      }
    }
  }

  function wheatClump(L, w, lt, gt, tW, glowK) {
    const t0 = tW + w.k * 0.09 + w.ri * 0.05 + (w.sd > 0 ? 0.04 : 0);
    const g = E.ep(lt, t0, t0 + 0.7, 'outCubic');
    if (g <= 0) return;
    PR.wheat(L, w.x, w.y, 118 * w.s, { t: gt + w.seed, growth: g, count: 4 + (w.k === 0 ? 2 : 0), seed: w.seed, glow: glowK * g });
  }

  /** trees and wheat back to front (wheat of a back row must not paint over the crowns in front of it) */
  function orchard(L, lt, gt, tR, tW, tH) {
    const hv = harvestV(lt, tH);
    const items = PLANTS.map((pl) => ({ y: pl.y, pl })).concat(WHEAT.map((w) => ({ y: w.y, w })));
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.pl) growPlant(L, it.pl, lt, gt, tR, hv);
      else wheatClump(L, it.w, lt, gt, tW, 0.7);
    }
  }

  /** the lights of the harvest: from each fruit / wheat clump up and into the garden's light */
  function lights(L, lt, gt, tR, tH, gateK) {
    const G = GATE.light;
    const lc = L.light;
    let arrived = 0;
    const samples = 10;
    const fly = (S, t0, dur, col, seed, r0) => {
      const u0 = (lt - t0) / dur;
      if (u0 <= 0) return;
      if (u0 >= 1) { arrived++; return; }
      const rr = E.rng(seed);
      const end = [G[0] + (rr() - 0.5) * 44 * gateK, G[1] + (rr() - 0.45) * 70 * gateK];
      const c = [S[0] + (end[0] - S[0]) * (0.25 + rr() * 0.3), Math.min(S[1], end[1]) - 120 - rr() * 160];
      const at = (u) => { const e = E.ease.inOutSine(E.clamp(u)); const v = 1 - e; return [v * v * S[0] + 2 * v * e * c[0] + e * e * end[0], v * v * S[1] + 2 * v * e * c[1] + e * e * end[1]]; };
      const fade = 1 - E.smooth(E.seg(u0, 0.72, 1));
      const pop = E.ease.outBackSoft(E.clamp(u0 * 6));
      const r = r0 * (1 - 0.45 * E.clamp(u0)) * pop;
      // trail: a fading comet tail of light
      const trail = [];
      for (let k = 0; k <= 6; k++) trail.push(at(u0 - k * 0.016));
      lc.save();
      lc.globalCompositeOperation = 'lighter';
      lc.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        lc.strokeStyle = E.rgba(E.mix(col, '#FFD9A0', 0.45), 0.42 * fade * (1 - k / 6));
        lc.lineWidth = r * (1.7 - k * 0.22);
        lc.beginPath(); lc.moveTo(trail[k][0], trail[k][1]); lc.lineTo(trail[k + 1][0], trail[k + 1][1]); lc.stroke();
      }
      lc.restore();
      const q = trail[0];
      E.wash(L.paint, E.blob(q[0], q[1], r, { seed, irr: 0.05, n: 16 }), E.mix(col, '#F6D58E', 0.3), { mode: 'over', alpha: 0.95 * fade });
      E.lift(L.paint, E.blob(q[0] - r * 0.3, q[1] - r * 0.3, r * 0.38, { seed: seed + 1, irr: 0.05, n: 12 }), 0.8 * fade);
      E.glow(lc, q[0], q[1], r * 3.4, E.mix(col, '#FFE7B8', 0.55), 0.55 * fade);
    };
    // fruit lights: each spawns when its fruit is harvested (ripeness crossing 0.5 on the way down)
    for (const pl of PLANTS) {
      if (plantK(pl, lt) < 0.95 && lt < tH) continue;
      const o = plantOpts(pl, lt, gt, 1);
      const full = PR.treeFruits(pl.x, pl.y - 2 * pl.s, treeH(pl, lt), o);
      const prev = new Array(full.length).fill(1);
      const spawn = new Array(full.length).fill(null);
      for (let i = 1; i <= samples; i++) {
        const ts = tH - 0.15 + (1.0 * i) / samples;
        const fs = PR.treeFruits(pl.x, pl.y - 2 * pl.s, treeH(pl, lt), { ...o, fruit: harvestV(ts, tH) });
        fs.forEach((f, j) => {
          if (spawn[j] === null && f.ripe < 0.5) spawn[j] = ts - (1.0 / samples) * (0.5 - f.ripe) / Math.max(0.05, prev[j] - f.ripe);
          prev[j] = f.ripe;
        });
      }
      full.forEach((f, j) => {
        if (j % 3 !== 0) return; // a third of the fruits send a light (keeps the sky readable)
        const t0 = spawn[j] === null ? tH + 0.75 : spawn[j];
        fly([f.x, f.y], t0, 1.25 + (j % 4) * 0.1, FRUIT[pl.sd < 0 ? 0 : 1], pl.seed * 97 + j, 7 * pl.s + 2.5);
      });
    }
    // grain lights
    WHEAT.forEach((w, i) => {
      const t0 = tH + 0.15 + (i % 6) * 0.11;
      if (i % 2 === 0) fly([w.x, w.y - 112 * w.s], t0, 1.35, '#F2C14E', 500 + i, 6 * w.s + 2);
    });
    return arrived;
  }

  E.scene('s13', {
    draw(L, lt, t, shot) {
      const T = (i) => E.T(i) - shot.start;
      const tPour = T(112) - 0.1;          // "neticesi" 58.97: the current lands
      const tR = T(114) - 0.1;             // "semeresi" 60.07: fruits ripen
      const tW = T(116) - 0.12;            // "sümbülü" 60.97: wheat
      const tH = T(118) - 0.1;             // "uhrevî" 61.81: harvest lights
      const tC = T(120) - 0.12;            // "çevirsek" 62.81: the current turns into the garden
      const end = shot.dur + shot.tail;

      // wide (the same framing s11 ended on), a breath of drift, then a gentle push toward the gate
      const C = {
        x: E.tween(lt, [[0, 560], [tC - 0.4, 566, 'inOutSine'], [end, 596, 'inOutCubic']]),
        y: E.tween(lt, [[0, 950], [tC - 0.4, 946, 'inOutSine'], [end, 912, 'inOutCubic']]),
        z: E.tween(lt, [[0, 1.255], [tC - 0.4, 1.285, 'inOutSine'], [end, 1.43, 'inOutCubic']]),
      };
      const turn = E.ep(lt, tC - 0.1, tC + 0.75, 'inOutCubic');       // the current turns from the roots to the gate
      const gateBoost = E.ep(lt, tH + 0.9, tC + 0.9, 'inOutSine');

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
      gate(L, t, 1, 1, 1, 0.6 * gateBoost + 0.4 * turn);
      footpath(L, 1);
      soil(L, 1);
      water(L, lt, t, tPour);
      fence(L, 1, 'side');
      orchard(L, lt, t, tR, tW, tH);
      fence(L, 1, 'front');

      // the gardener: hand still raised from s12 → guides the current down to the roots → watches the lights go
      const direct = { lean: 0.03, head: -0.14, nS: 0.78, nE: 0.95, nW: -0.45, fS: 0.12, fE: 0.3, nH: 0.06, nK: 0.05, fH: -0.07, fK: 0.07 };
      const guide = { lean: 0.07, head: 0.22, nS: 0.72, nE: 0.3, nW: -0.25, fS: 0.3, fE: 0.5, nH: 0.06, nK: 0.05, fH: -0.07, fK: 0.07 };
      const watch = { lean: -0.03, head: -0.32, nS: 0.28, nE: 0.5, fS: 0.04, fE: 0.3, nH: 0.04, nK: 0.04, fH: -0.04, fK: 0.04 };
      const offer = { lean: 0.0, head: -0.3, nS: 1.05, nE: 0.55, nW: -0.4, fS: 0.1, fE: 0.32, nH: 0.04, nK: 0.04, fH: -0.04, fK: 0.04 };
      let pose = E.man.lerp(direct, guide, E.ep(lt, tPour - 0.35, tPour + 0.3, 'inOutCubic'));
      pose = E.man.lerp(pose, watch, E.ep(lt, tH - 0.25, tH + 0.55, 'inOutCubic'));
      pose = E.man.lerp(pose, offer, E.ep(lt, tC - 0.15, tC + 0.6, 'inOutCubic'));
      pose.head += 0.01 * Math.sin(lt * 1.5);
      E.man.shadow(L, MAN.x + 8, MAN.y, MAN.h);
      E.man.draw(L, { x: MAN.x, y: MAN.y, h: MAN.h, view: 'side', facing: 1, pose });

      // the braided current: from the heart, arching forward; it turns down into the aisle ("neticesi"), and at
      // "çevirsek" lifts out of the roots and pours on, over the orchard, through the arch into the garden
      const O = [MAN.x + MAN.h * 0.05, MAN.y - MAN.h * 0.705];
      const q = E.ep(lt, -0.05, tPour + 0.05, 'inOutCubic');
      const hover = [636 + 6 * Math.sin(lt * 1.3), 846 + 10 * Math.sin(lt * 1.7 + 1)];
      const into = [GATE.x + 2, GATE.y - 92];
      let tip = [E.lerp(hover[0], LAND[0], q), E.lerp(hover[1], LAND[1], q)];
      tip = [E.lerp(tip[0], into[0], turn), E.lerp(tip[1], into[1], turn) - 60 * Math.sin(Math.PI * turn)];
      const s1 = [O[0] + 210, O[1] - 250 - 40 * turn];
      const s2 = [tip[0] - 70 + 30 * q - 10 * turn, E.lerp(E.lerp(560, 760, q), 590, turn)];
      const N = 120;
      const spine = resample(Array.from({ length: 60 }, (_, k) => bez(O, s1, s2, tip, k / 59)), N);
      PR.heartLight(L, O[0], O[1], 15, { t, glow: 0.9 });
      E.glow(L.light, O[0], O[1], 90, '#FFC9B0', 0.45);
      for (let i = 0; i < 3; i++) {
        const pts = spine.map((p, k) => {
          const u = k / (N - 1);
          const [nx, ny] = normalAt(spine, k);
          const A = 12 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.1)), 0.6) * Math.min(1, u * 5);
          const w = A * Math.sin(u * 6 * Math.PI - lt * 4.6 + (i * E.TAU) / 3);
          return [p[0] + nx * w, p[1] + ny * w];
        });
        PR.ribbon(L, pts, { p: 0.994, width: 30, color: COL[i], t: t * 1.6, glow: 0.6 + 0.3 * turn, twist: 0.7, seed: i + 2 });
      }
      // splash where it lands in the aisle
      const land = E.ep(lt, tPour - 0.1, tPour + 0.6);
      if (land > 0 && land < 1) {
        const rr = 20 + 90 * E.ease.outCubic(land);
        L.light.save(); L.light.globalCompositeOperation = 'lighter';
        L.light.strokeStyle = E.rgba('#FFE6D0', 0.6 * (1 - land));
        L.light.lineWidth = 5; L.light.beginPath(); L.light.ellipse(LAND[0], LAND[1], rr, rr * 0.3, 0, 0, E.TAU); L.light.stroke(); L.light.restore();
        E.glow(L.light, LAND[0], LAND[1], 120, '#FFE6D0', 0.6 * (1 - land));
      }
      if (q > 0.9) E.glow(L.light, LAND[0], LAND[1], 70, '#FFDCC4', 0.45 * (1 - turn));
      // the garden answers as the current pours in: a bloom of light in the arch, rays
      const arrive = E.ep(lt, tC + 0.45, tC + 1.1, 'outCubic');
      if (turn > 0.5) E.glow(L.light, into[0], into[1], 110, '#FFE8CC', 0.5 * E.seg(turn, 0.5, 1));
      if (arrive > 0) {
        E.glow(L.light, GATE.light[0], GATE.light[1], 280, '#FFE6B4', 0.5 * arrive);
        E.rays(L.light, GATE.light[0], GATE.light[1], { n: 11, len: 720, spread: E.TAU * 0.9, angle: -Math.PI / 2, width: 0.035, color: '#FFE9B8', a: 0.13 * arrive, seed: 31, t: lt });
      }

      // the harvest of lights
      lights(L, lt, t, tR, tH, 1);

      fgCam(L, C);
      foreground(L, t);

      E.resetCamera(L);
      // the garden's light floods the scene as the current flows in: the morning turns to the golden hour of s14
      const gold = E.ep(lt, tC - 0.3, end, 'inOutSine');
      if (gold > 0) {
        // (a warm glaze over a blue sky only greys it, as on paper: the light is partly repainted, then glazed)
        const full = E.rrect(0, 0, E.W, E.H, 0);
        E.wash(L.paint, full, '#F6D8B0', { mode: 'over', alpha: 0.3 * gold, grad: { from: [0, 0], to: [0, E.H], stops: [[0, E.rgba('#F0C2B4', 1)], [0.45, E.rgba('#F8DDB0', 0.75)], [1, E.rgba('#EFC896', 0.6)]] } });
        E.wash(L.paint, full, '#F2C48A', { alpha: 0.5 * gold, grad: { from: [0, 0], to: [0, E.H], stops: [[0, E.rgba('#E2A0A0', 1)], [0.42, E.rgba('#F0C080', 0.85)], [1, E.rgba('#E2A26E', 1)]] } });
        E.glow(L.light, 540 + (GATE.light[0] - C.x) * C.z, 960 + (GATE.light[1] - C.y) * C.z, 950, '#FFE2A8', 0.3 * gold);
      }
      E.motes(L.light, { x: 0, y: 200, w: 1080, h: 1000, n: 22, t: lt + 9, seed: 77, size: 2.6, a: 0.45 + 0.3 * gold, rise: 18, color: '#FFF1CF' });
    },
    sfx() {
      const T = (i) => E.T(i);
      return [
        { t: T(112) - 0.1, type: 'water', gain: 0.32 },
        { t: T(112) - 0.02, type: 'grow', gain: 0.34, dur: 1.3 },
        { t: T(114) - 0.05, type: 'chime', gain: 0.22, pitch: 1.5 },
        { t: T(116) - 0.1, type: 'sparkle', gain: 0.2 },
        { t: T(118) - 0.1, type: 'swell', gain: 0.3, dur: 1.6 },
        { t: T(120) - 0.12, type: 'whoosh', gain: 0.22, pitch: 0.85 },
        { t: T(120) + 0.4, type: 'chime', gain: 0.26, pitch: 1.0 },
      ];
    },
  });
})();
