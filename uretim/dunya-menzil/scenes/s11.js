/* s11 · 47.65–53.60 · "Hem o hususi dünyamız, âhiret ve cennetin muvakkat bir fidanlığı olduğunu derk edip"
   Morning garden. The man tends his personal world, resting on the meadow; at "dünyamız" the bubble opens into
   light and spreads out into a small fenced nursery (fidanlık) of staked saplings. At "âhiret" a tall arch gate
   emerges from a golden haze on the knoll beyond, at "cennetin" its doors open onto the luminous garden.
   "fidanlığı": pencil label "fidanlık"; "olduğunu": a dashed transplant arrow from the saplings into the gate.
   "derk edip": the gardener straightens and lifts his gaze to the gate, nods; a soft beam of light touches him.
   World layout (shared by s11 / s13 — keep in sync): horizon ≈ y 790, gate base (640, 880) w 240,
   nursery = two blocks either side of an aisle/footpath that leads to the gate. */
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

  function globe(L, lt, open, glowK) {
    const { x, y, r } = GLOBE;
    if (open < 1) {
      const bob = Math.sin(lt * 1.6) * 2.5 * (1 - open);
      E.wash(L.paint, E.blob(x, y + r * 0.98, r, { rx: r * 0.95, ry: r * 0.12, seed: 6, irr: 0.06 }), '#6E7E58', { alpha: 0.35 * (1 - open), soft: 14 });
      const sc = 1 + 0.16 * E.ease.outCubic(open);
      PR.personalWorld(L, x, y + bob - 26 * E.ease.inCubic(open), r * sc, { t: lt + 47, kind: 'home', glow: glowK * (1 - open * 0.5), life: 1, alpha: 1 - E.ease.inQuad(open) });
    }
    if (open > 0 && open < 1) {
      const ringR = r * (0.5 + 2.1 * E.ease.outCubic(open));
      const ra = Math.sin(Math.PI * Math.min(1, open * 1.15)) * 0.9;
      const ring = new Path2D();
      ring.ellipse(FOOT.x, FOOT.y, ringR * 1.3, ringR * 0.4, 0, 0, E.TAU);
      L.light.save();
      L.light.globalCompositeOperation = 'lighter';
      for (const [lw, a] of [[46, 0.12], [22, 0.2], [7, 0.32]]) {
        L.light.strokeStyle = E.rgba('#FFE7B0', a * ra);
        L.light.lineWidth = lw;
        L.light.stroke(ring);
      }
      L.light.restore();
      E.glow(L.light, x, y, r * 2.2, '#FFF1CC', 0.55 * ra);
      E.motes(L.light, { x: x - r * 1.6, y: y - r * 1.6, w: r * 3.2, h: r * 2.4, n: 26, t: lt, seed: 61, size: 3.2, a: 0.9 * ra, rise: 70, color: '#FFF4D6' });
    }
  }

  function dashedArrow(L, a, c, b, p, { w = 2.6, alpha = 0.62, head = 15 } = {}) {
    if (p <= 0) return;
    const pts = [];
    const N = 44;
    for (let i = 0; i <= N * p; i++) {
      const u = i / N;
      pts.push([(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]]);
    }
    if (pts.length < 2) return;
    const ink = L.ink;
    ink.save();
    ink.setLineDash([13, 10]);
    ink.lineCap = 'round';
    ink.strokeStyle = P.ink;
    ink.globalAlpha *= alpha;
    ink.lineWidth = w;
    ink.beginPath();
    pts.forEach((q, i) => (i ? ink.lineTo(q[0], q[1]) : ink.moveTo(q[0], q[1])));
    ink.stroke();
    ink.restore();
    if (p > 0.97 && pts.length > 4) {
      const e = pts[pts.length - 1], d = pts[pts.length - 4];
      const ang = Math.atan2(e[1] - d[1], e[0] - d[0]);
      E.pencil(ink, [[e[0] - Math.cos(ang - 0.45) * head, e[1] - Math.sin(ang - 0.45) * head], [e[0], e[1]], [e[0] - Math.cos(ang + 0.42) * head, e[1] - Math.sin(ang + 0.42) * head]], { w, a: alpha, double: false });
    }
  }

  // ------------------------------------------------------------------ the scene
  E.scene('s11', {
    draw(L, lt, t, shot) {
      const T = (i) => E.T(i) - shot.start;
      const tHus = T(90) - 0.1;               // "hususi" 48.37
      const tGlobe = T(91) - 0.05;            // "dünyamız" 48.87 → the bubble opens
      const tGate = T(92) - 0.12;             // "âhiret" 49.89
      const tOpen = T(94) - 0.1;              // "cennetin" 50.51
      const tLabel = T(97) - 0.1;             // "fidanlığı" 51.83
      const tArrow = T(98) + 0.05;            // "olduğunu" 52.37
      const tDerk = T(99) - 0.1;              // "derk" 52.79

      const glowK = 0.25 + 0.6 * E.ep(lt, tHus, tHus + 0.7, 'inOutSine');
      const open = E.ep(lt, tGlobe + 0.05, tGlobe + 0.95, 'inOutSine');
      const reveal = E.ep(lt, tGlobe + 0.2, tGlobe + 1.55, 'outCubic');
      const haze = E.ep(lt, tGate - 0.15, tGate + 0.4, 'outCubic');
      const appear = E.ep(lt, tGate + 0.05, tGate + 0.75, 'inOutSine');
      const gOpen = E.ep(lt, tOpen, tOpen + 1.0, 'inOutCubic');
      const look = E.ep(lt, tDerk - 0.05, tDerk + 0.45, 'inOutCubic');
      const nod = Math.sin(Math.PI * E.seg(lt, tDerk + 0.42, tDerk + 0.8));
      const accent = E.ep(lt, tDerk + 0.1, tDerk + 0.6, 'outCubic') * (1 - 0.4 * E.ep(lt, tDerk + 1.0, tDerk + 2.0));

      // camera: on the man and his world, then a pull-back that reveals the nursery and the gate; slow push after
      // (ends on the reference wide framing x 560 · y 950 · z 1.245 that s13 cuts back to; the whole nursery and its
      // fence stay inside the frame)
      const C = {
        x: E.tween(lt, [[0, 452], [tGlobe + 0.15, 466, 'inOutSine'], [tGlobe + 1.75, 552, 'inOutCubic'], [6.9, 560, 'inOutSine']]),
        y: E.tween(lt, [[0, 1040], [tGlobe + 0.15, 1030, 'inOutSine'], [tGlobe + 1.75, 958, 'inOutCubic'], [6.9, 950, 'inOutSine']]),
        z: E.tween(lt, [[0, 1.58], [tGlobe + 0.15, 1.54, 'inOutSine'], [tGlobe + 1.75, 1.205, 'inOutCubic'], [6.9, 1.255, 'inOutSine']]),
      };

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
      gate(L, t, haze, appear, gOpen, accent);
      footpath(L, reveal);
      soil(L, reveal);
      fence(L, reveal, 'side');
      plants(L, t, reveal);
      globe(L, lt, open, glowK);
      fence(L, reveal, 'front');

      // the gardener: tending (bent toward his world / the saplings) → straightens and looks up at the gate
      const tend = { lean: 0.15, head: 0.36, nS: 0.62 + 0.04 * Math.sin(lt * 1.3), nE: 0.32, nW: 0.2, fS: 0.18, fE: 0.42, nH: 0.06, nK: 0.1, fH: -0.07, fK: 0.06 };
      const gaze = { lean: -0.03, head: -0.36, nS: 0.08, nE: 0.16, fS: -0.03, fE: 0.18, nH: 0.04, nK: 0.04, fH: -0.04, fK: 0.04 };
      const pose = E.man.lerp(tend, gaze, look);
      pose.head += 0.13 * nod + 0.012 * Math.sin(lt * 1.4);
      pose.lean += 0.006 * Math.sin(lt * 1.1);
      E.man.shadow(L, MAN.x + 8, MAN.y, MAN.h);
      E.man.draw(L, { x: MAN.x, y: MAN.y, h: MAN.h, view: 'side', facing: 1, pose });
      if (accent > 0) {
        // a soft beam from the garden's light to the man, warmth on his face and chest
        const hx = MAN.x + 22, hy = MAN.y - MAN.h * 0.9;
        const [gx, gy] = GATE.light;
        const ang = Math.atan2(hy - gy, hx - gx), len = Math.hypot(hx - gx, hy - gy) * 1.08;
        const lc = L.light;
        lc.save();
        lc.globalCompositeOperation = 'lighter';
        const g = lc.createLinearGradient(gx, gy, gx + Math.cos(ang) * len, gy + Math.sin(ang) * len);
        g.addColorStop(0, E.rgba('#FFE9B8', 0.0));
        g.addColorStop(0.3, E.rgba('#FFE9B8', 0.09 * accent));
        g.addColorStop(1, E.rgba('#FFE9B8', 0.035 * accent));
        lc.fillStyle = g;
        for (const wdt of [0.035, 0.07, 0.11]) {      // stacked wedges = a soft-edged beam
          lc.beginPath();
          lc.moveTo(gx, gy);
          lc.lineTo(gx + Math.cos(ang - wdt) * len, gy + Math.sin(ang - wdt) * len);
          lc.lineTo(gx + Math.cos(ang + wdt) * len, gy + Math.sin(ang + wdt) * len);
          lc.closePath();
          lc.fill();
        }
        lc.restore();
        E.glow(L.light, hx + 8, hy, 160, '#FFE3A6', 0.8 * accent);
        E.wash(L.paint, E.blob(hx + 10, hy - 4, 70, { seed: 5, irr: 0.2 }), E.shade(P.gamboge, 0.35), { alpha: 0.35 * accent, soft: 30 });
        E.motes(L.light, { x: hx - 70, y: hy - 110, w: 160, h: 150, n: 8, t: lt, seed: 19, size: 3, a: 0.9 * accent, rise: 22, color: '#FFF1CC' });
        E.glow(L.light, hx, MAN.y - MAN.h * 0.62, 110, '#FFD9A0', 0.28 * accent);
      }

      // pencil annotations
      const lp = E.ep(lt, tLabel, tLabel + 0.55, 'linear');
      if (lp > 0) {
        E.note(L.ink, 'fidanlık', 420, 908, { size: 60, p: lp, alpha: 0.82, rot: -0.05 });
        E.arrow(L.ink, [452, 936], [474, 992], { bend: -0.35, p: E.ep(lt, tLabel + 0.35, tLabel + 0.7), w: 2.2, alpha: 0.6, head: 12 });
      }
      // "olduğunu": the saplings are for transplanting — a dashed arc from the nursery into the garden, and one little
      // sapling of light travels along it through the arch
      const A0 = [804, 948], AC = [930, 600], A1 = [652, 792];
      dashedArrow(L, A0, AC, A1, E.ep(lt, tArrow - 0.05, tArrow + 0.7, 'inOutSine'), { w: 3, alpha: 0.66 });
      const tv = E.seg(lt, tArrow + 0.1, tArrow + 1.05);
      if (tv > 0 && tv < 1) {
        const u = E.ease.inOutSine(tv), v = 1 - u;
        const q = [v * v * A0[0] + 2 * v * u * AC[0] + u * u * A1[0], v * v * A0[1] + 2 * v * u * AC[1] + u * u * A1[1]];
        const a = Math.sin(Math.PI * Math.min(1, tv * 1.25)) * (1 - E.smooth(E.seg(tv, 0.75, 1)));
        const sz = 46 * (1 - 0.35 * u);
        E.glow(L.light, q[0], q[1] - sz * 0.45, sz * 1.6, '#FFF0C8', 0.75 * a);
        PR.sapling(L, q[0], q[1], sz, { t: lt, growth: 1, seed: 7, soil: true, alpha: a });
      }

      fgCam(L, C);
      foreground(L, t);

      E.resetCamera(L);
      // the golden light of s10 lingers at the top and dissolves into the morning sky
      const dawn = 1 - E.ep(lt, 0.25, 1.75, 'inOutSine');
      if (dawn > 0) {
        E.lift(L.paint, E.blob(540, 170, 420, { rx: 760, ry: 430, seed: 31, irr: 0.18 }), 0.78 * dawn, 120);
        E.wash(L.paint, E.blob(540, 230, 520, { rx: 820, ry: 520, seed: 33, irr: 0.2 }), '#F4D49C', { alpha: 0.55 * dawn, soft: 150 });
        E.glow(L.light, 540, 260, 760, '#FFE6B8', 0.45 * dawn);
      }
      E.motes(L.light, { x: 0, y: 200, w: 1080, h: 1000, n: 22, t: lt + 3, seed: 77, size: 2.6, a: 0.45, rise: 18, color: '#FFF1CF' });
    },
    sfx() {
      const T = (i) => E.T(i);
      return [
        { t: T(91) - 0.02, type: 'bloom', gain: 0.4 },
        { t: T(91) + 0.25, type: 'grow', gain: 0.2, dur: 1.2 },
        { t: T(92) - 0.15, type: 'swell', gain: 0.32, dur: 1.2 },
        { t: T(94) - 0.05, type: 'chime', gain: 0.24, pitch: 1.25 },
        { t: T(97) - 0.1, type: 'pen', gain: 0.22, dur: 0.6 },
        { t: T(99), type: 'sparkle', gain: 0.16 },
      ];
    },
  });
})();
