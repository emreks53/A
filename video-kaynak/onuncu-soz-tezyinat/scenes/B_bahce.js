/* =============================================================================
 * B_bahce · 2.30–6.70 · "şu dünyadaki tezyinat, yalnız telezzüz veya tenezzüh için değil."
 * =============================================================================
 * PLAN (world = the A.garden 'B' plate coordinates; rest camera maps world = screen)
 *  Layers (depth p, E.parallax-style):  L0 sky gradient (screen) · sun+glow+rays p.04 · clouds p.08 ·
 *    hills p.15/.25/.45/.70 (cypress, round trees, tiny blossom dots that pop in the wave) ·
 *    L3 meadow/path/grass/flowers p1 (split at the rose base y=1150: back | HERO ROSE | front) ·
 *    hoopoe branch p1.15 (enters from the left, hoopoe at ≈(250,700)) · L5 blurred foreground stems p1.9.
 *  Camera = optical zoom (zo about a screen point) ∘ parallax dolly {x,y,z}; handheld drift always on.
 *  2.30  zo 2.2 on the sun (= A's page glow at screen centre), cream glow #FFF6E6 condenses into the sun.
 *  2.44  BLOOM WAVE: soft light ring leaves the sun; hill blossoms, then ~260 flowers pop by distance
 *        (delay = d/1400·0.9 s) with pollen puffs.  2.68 hero rose blooms.  2.80 hoopoe crest fans.
 *        Pull-back 2.30→3.60 (outQuint), meadow/fg zoom faster than the sky (parallax), fg stems slide in.
 *  3.62  "yalnız": rack focus (everything but the rose → 6 px), push-in z 1→1.25 on the rose.
 *  4.00  "telezzüz": bee lands (dip-and-bounce), golden sweetness pulse, 3 fragrance ribbons.
 *  4.64  "tenezzüh": lateral stroll dolly x +320 (fg passes fast), 3 butterflies lead the way.
 *  5.58  "değil": time-scale → 0.1 (butterflies, pollen, sway hang), one white ripple from the rose,
 *        −10 % saturation.  5.95 time resumes.
 *  5.95–6.70  swing back + push to the rose (z 2.6, rose at screen (540,820), R 260); sun sinks behind
 *        the far hills (y 520→930) and the plate lerps to C's dusk palette; DOF closes on the rose.
 *  Gloss band (1229–1574): meadow (mid/dark green) + feathered scrim (≤0.22) while E.glossActive.
 *  window.BCW exports the world so C_gul_firak draws the identical frame in the 6.40–6.70 overlap.
 * ========================================================================== */
(function () {
  'use strict';
  const TAU = Math.PI * 2, PI = Math.PI;
  const clamp = E.clamp, lerp = E.lerp, sm = E.smooth, H = E.hash;
  const C = (c) => (typeof c === 'string' ? E.rgb(c) : c);
  const mx = (a, b, t) => { a = C(a); b = C(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
  const css = (c, a = 1) => { c = C(c); return a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, a).toFixed(3)})`; };
  const lt = (c, k) => mx(c, [255, 255, 255], k), dk = (c, k) => mx(c, [0, 0, 0], k);
  const addStops = (g, st) => { for (const s of st) g.addColorStop(clamp(s[0]), css(s[1], s[2] === undefined ? 1 : s[2])); return g; };
  const LG = (ctx, x0, y0, x1, y1, st) => addStops(ctx.createLinearGradient(x0, y0, x1, Math.abs(x1 - x0) + Math.abs(y1 - y0) < 1e-3 ? y0 + 0.01 : y1), st);
  const RG = (ctx, x, y, r0, r1, st) => addStops(ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.01, r1)), st);
  const ramp = (st, x) => {
    if (x <= st[0][0]) return C(st[0][1]);
    for (let i = 1; i < st.length; i++) if (x <= st[i][0]) { const a = st[i - 1], b = st[i]; return mx(a[1], b[1], (x - a[0]) / (b[0] - a[0])); }
    return C(st[st.length - 1][1]);
  };

  /* ---------------- palettes (B = A.garden 'B', DUSK = C start, NIGHT = C 10.6) ---------------- */
  const PAL = {
    B: {
      sky: [[0, '#FFF3DE'], [864, '#FFD6B8'], [1344, '#F7AE94']], sunCol: '#FFF8E8', glow: '#FFD9A0',
      hills: ['#A9DCBD', '#86CBA4', '#5DB58A', '#3A957A'], haze: [0.3, 0.15, 0.04, 0], meadow: ['#3A9A73', '#2F8A6E', '#1F6A58', '#164C42'],
      grassL: '#63C08E', grassD: '#1E6652', fg: '#15524A', path: '#F3D9B1', pathEdge: '#E2BE8E', cloud: '#FFFFFF', cloudSh: '#FFE2D0', rim: '#FFF4D8', tree: '#2F8A6E', treeL: '#6FC596', cyp: '#1F6A58',
      tint: '#FFFFFF', branch: '#6B4A32', leaf: '#3FA36B',
    },
    DUSK: {
      sky: [[0, '#F59E7A'], [864, '#C9708A'], [1344, '#5A3D6E']], sunCol: '#FFE2B8', glow: '#FFB37A',
      hills: ['#B07A90', '#8A6688', '#5E4A78', '#4B3A66'], haze: [0.5, 0.32, 0.12, 0], meadow: ['#4B3A66', '#3E3158', '#2A1E2E', '#1E1626'],
      grassL: '#6A5A8A', grassD: '#231A30', fg: '#1A1428', path: '#B8909A', pathEdge: '#94708A', cloud: '#FFC0A0', cloudSh: '#B86A86', rim: '#FFB37A', tree: '#3E3158', treeL: '#9A6A88', cyp: '#2A2240',
      tint: '#9C7FA6', branch: '#3A2A30', leaf: '#3E4A58',
    },
    NIGHT: {
      sky: [[0, '#2B2A4F'], [864, '#3E3560'], [1344, '#1A1830']], sunCol: '#C9B0D0', glow: '#5A4A86',
      hills: ['#4A4472', '#3A3562', '#2A274C', '#211D3E'], haze: [0.45, 0.3, 0.12, 0], meadow: ['#262044', '#1F1A3A', '#16122C', '#100C20'],
      grassL: '#3A3866', grassD: '#100C20', fg: '#0C0918', path: '#4E4870', pathEdge: '#3E3860', cloud: '#5A5284', cloudSh: '#36305C', rim: '#8E9CD8', tree: '#1F1A3A', treeL: '#4A4878', cyp: '#16122C',
      tint: '#4E4C82', branch: '#1E1828', leaf: '#1E2A3A',
    },
  };
  function lerpPal(a, b, k) {
    if (k <= 0) return a; if (k >= 1) return b;
    const o = {};
    for (const key in a) {
      const va = a[key], vb = b[key];
      if (key === 'sky') o[key] = va.map((s, i) => [s[0], mx(s[1], vb[i][1], k)]);
      else if (key === 'hills' || key === 'meadow') o[key] = va.map((c, i) => mx(c, vb[i], k));
      else if (key === 'haze') o[key] = va.map((v, i) => lerp(v, vb[i], k));
      else o[key] = mx(va, vb, k);
    }
    return o;
  }
  const palAt = (dusk, night) => { let p = lerpPal(PAL.B, PAL.DUSK, clamp(dusk)); if (night > 0) p = lerpPal(p, PAL.NIGHT, clamp(night)); return p; };

  /* ---------------- camera ---------------- */
  // {x,y,z}: parallax dolly (E.parallax semantics) · {zo, ox, oy}: optical zoom about intermediate point (ox,oy) · rot · sx,sy screen drift
  function applyCam(ctx, c, p) {
    ctx.translate(540 + c.sx, 960 + c.sy);
    if (c.rot) ctx.rotate(c.rot);
    if (c.zo !== 1) ctx.scale(c.zo, c.zo);
    ctx.translate(-c.ox, -c.oy);
    const z = 1 + (c.z - 1) * p;
    ctx.translate(540, 960); ctx.scale(z, z); ctx.translate(-(540 + (c.x - 540) * p), -(960 + (c.y - 960) * p));
  }
  function toScreen(c, p, wx, wy) {
    const z = 1 + (c.z - 1) * p;
    const ix = 540 + (wx - (540 + (c.x - 540) * p)) * z, iy = 960 + (wy - (960 + (c.y - 960) * p)) * z;
    const ux = (ix - c.ox) * c.zo, uy = (iy - c.oy) * c.zo, cr = Math.cos(c.rot || 0), sr = Math.sin(c.rot || 0);
    return [540 + c.sx + ux * cr - uy * sr, 960 + c.sy + ux * sr + uy * cr];
  }
  const zoomAt = (c, p) => c.zo * (1 + (c.z - 1) * p);
  const drift = (t) => ({ sx: 3 * Math.sin(0.37 * t), sy: 2 * Math.sin(0.29 * t + 1), rot: 0.0026 * Math.sin(0.21 * t) });
  function lay(ctx, c, p, fn) { ctx.save(); applyCam(ctx, c, p); fn(); ctx.restore(); }

  /* ---------------- time warp ("değil" freeze) ---------------- */
  const FA = 5.52, FB = 5.67, FC = 5.95, FD = 6.10, FS = 0.1;
  function tw(t) {
    if (t < FA) return t;
    const Tb = FA + (FB - FA) * (1 + FS) / 2;
    if (t < FB) { const u = t - FA; return FA + u - (1 - FS) * u * u / (2 * (FB - FA)); }
    const Tc = Tb + FS * (FC - FB);
    if (t < FC) return Tb + FS * (t - FB);
    const Td = Tc + (FD - FC) * (1 + FS) / 2;
    if (t < FD) { const u = t - FC; return Tc + FS * u + (1 - FS) * u * u / (2 * (FD - FC)); }
    return Td + (t - FD);
  }

  /* ---------------- static world geometry ---------------- */
  const HZ = 1000, TOP = HZ + 30, X0 = -1300, X1 = 2400, ROSE_BASE = [540, 1150], ROSE_R = 100, SUN0 = [760, 520];
  const STRATA = [[HZ - 175, 62, 0.0036, 1.3, 0.15], [HZ - 110, 52, 0.0052, 4.1, 0.25], [HZ - 45, 48, 0.0046, 2.2, 0.45], [HZ + 22, 30, 0.0064, 5.7, 0.7]];
  const hillY = (x, base, amp, f, sd) => base - amp * (0.6 * Math.sin(x * f + sd) + 0.3 * Math.sin(x * f * 2.3 + sd * 1.7) + 0.12 * Math.sin(x * f * 5.1 + sd * 3.1));
  const STEMK = { tulip: 1.55, carnation: 1.6, lily: 1.5, lavender: 1.0, daisy: 1.7, hyacinth: 0.85 };
  const FTYPES = ['tulip', 'daisy', 'lavender', 'tulip', 'carnation', 'daisy', 'hyacinth', 'lily', 'tulip', 'carnation'];
  const BLOSSOM = ['#FF7A3D', '#FFFFFF', '#A88BFF', '#FF4F7B', '#FFD36E', '#FF8FA8', '#E03C31'];
  let G = null;
  function build() {
    if (G) return G;
    G = {};
    G.hills = STRATA.map(([base, amp, f, sd], li) => {
      const hp = new Path2D(); hp.moveTo(X0, 2300); for (let x = X0; x <= X1; x += 24) hp.lineTo(x, hillY(x, base, amp, f, sd)); hp.lineTo(X1, 2300); hp.closePath();
      const crest = new Path2D(); for (let x = X0; x <= X1; x += 24) { const y = hillY(x, base, amp, f, sd) + 2; x === X0 ? crest.moveTo(x, y) : crest.lineTo(x, y); }
      const trees = [];
      if (li === 1) for (let i = 0; i < 22; i++) { const x = X0 + 100 + H(i, 61) * (X1 - X0 - 200); trees.push(['c', x, hillY(x, base, amp, f, sd) + 6, 34 + H(i, 62) * 20, 10]); }
      if (li === 2) for (let i = 0; i < 26; i++) { const x = X0 + 60 + H(i, 71) * (X1 - X0 - 120), y = hillY(x, base, amp, f, sd) + 8 + H(i, 74) * 14; trees.push(H(i, 72) < 0.55 ? ['c', x, y, 70 + H(i, 73) * 50, 20] : ['r', x, y, 16 + H(i, 73) * 10]); }
      // tiny blossom dots on the hill face (pop in the bloom wave)
      const dots = [];
      if (li >= 1) {
        const n = [0, 90, 150, 190][li];
        for (let i = 0; i < n; i++) {
          const x = -500 + H(i, 300 + li) * 2100, y = hillY(x, base, amp, f, sd) + 6 + Math.pow(H(i, 310 + li), 1.6) * (li === 3 ? 60 : 55);
          dots.push([x, y, (li === 3 ? 5 : li === 2 ? 3.8 : 2.6) * (0.7 + 0.6 * H(i, 320 + li)), BLOSSOM[Math.floor(H(i, 330 + li) * BLOSSOM.length)]]);
        }
      }
      return { hp, crest, trees, dots, base, amp, f, sd };
    });
    // meadow
    const mp = new Path2D(); mp.moveTo(X0, 2300); for (let x = X0; x <= X1; x += 40) mp.lineTo(x, TOP + 14 * Math.sin(x * 0.004 + 1) + 8 * Math.sin(x * 0.011)); mp.lineTo(X1, 2300); mp.closePath();
    G.meadow = mp;
    // path (A.garden spline)
    const cp = [[560, HZ + 34, 4], [630, HZ + 75, 22], [480, HZ + 170, 56], [640, HZ + 330, 116], [430, HZ + 570, 210], [560, 1990, 420], [600, 2300, 560]];
    const sp = [];
    for (let i = 0; i < cp.length - 1; i++) {
      const p0 = cp[Math.max(0, i - 1)], p1 = cp[i], p2 = cp[i + 1], p3 = cp[Math.min(cp.length - 1, i + 2)];
      for (let k = 0; k < 12; k++) { const u = k / 12, u2 = u * u, u3 = u2 * u; const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3); sp.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])]); }
    }
    sp.push(cp[cp.length - 1]);
    const pl = [], pr = [];
    for (let i = 0; i < sp.length; i++) { const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = sp[i][2] / 2; pl.push([sp[i][0] + nx * w, sp[i][1] + ny * w]); pr.push([sp[i][0] - nx * w, sp[i][1] - ny * w]); }
    const pp = new Path2D(); pp.moveTo(pl[0][0], pl[0][1]); for (const q of pl) pp.lineTo(q[0], q[1]); for (let i = pr.length - 1; i >= 0; i--) pp.lineTo(pr[i][0], pr[i][1]); pp.closePath();
    const edgeL = new Path2D(), edgeR = new Path2D(); pl.forEach((q, i) => (i ? edgeL.lineTo(q[0], q[1]) : edgeL.moveTo(q[0], q[1]))); pr.forEach((q, i) => (i ? edgeR.lineTo(q[0], q[1]) : edgeR.moveTo(q[0], q[1])));
    const pebbles = []; for (let i = 0; i < 46; i++) { const k = Math.floor(H(i, 81) * (sp.length - 2)) + 1, q = sp[k], off = (H(i, 82) - 0.5) * q[2] * 0.8, sz = 1 + q[2] * 0.025; pebbles.push([q[0] + off, q[1], sz]); }
    G.path = { pp, edgeL, edgeR, pebbles };
    const pathX = (y) => { for (let i = 1; i < sp.length; i++) if (sp[i][1] >= y) { const a = sp[i - 1], b = sp[i], f = (y - a[1]) / Math.max(1e-6, b[1] - a[1]); return [a[0] + (b[0] - a[0]) * f, a[2] + (b[2] - a[2]) * f]; } return [560, 600]; };
    // grass blades
    const bands = [[], [], []];
    for (let i = 0; i < 900; i++) {
      const v = H(i, 91), y = TOP + 10 + Math.pow(v, 0.8) * (2050 - TOP), d = clamp((y - TOP) / (1920 - TOP)), x = -700 + H(i, 92) * 2600;
      const [px, pw] = pathX(y); if (Math.abs(x - px) < pw * 0.42) continue;
      bands[d < 0.25 ? 0 : d < 0.6 ? 1 : 2].push([x, y, d, i]);
    }
    G.grass = bands;
    // flowers (wider span for the stroll dolly)
    const fl = [];
    for (let i = 0; i < 300; i++) {
      const v = H(i, 101), y = TOP + 18 + Math.pow(v, 1.3) * (1640 - TOP), d = (y - TOP) / (1540 - TOP);
      let x = -520 + H(i, 102) * 2300;
      const [px, pw] = pathX(y); if (Math.abs(x - px) < pw * 0.62 + 10) x = px + Math.sign(x - px || 1) * (pw * 0.62 + 10 + H(i, 103) * 60);
      // keep a little clearing around the hero stem so the rose reads
      if (Math.abs(x - 540) < 40 && y < 1150 && y > 1060) x += (x < 540 ? -1 : 1) * 60;
      const size = lerp(9, 52, d) * (0.85 + 0.3 * H(i, 104)), type = FTYPES[Math.floor(H(i, 105) * FTYPES.length)];
      const delay = (Math.hypot(x - SUN0[0], y - SUN0[1]) / 1400) * 0.9;
      fl.push({ x, y, d, i, size, type, delay, puff: H(i, 106) < 0.4, hy: y - size * (STEMK[type] + 0.55) });
    }
    fl.sort((a, b) => a.y - b.y);
    G.flBack = fl.filter((f) => f.y < ROSE_BASE[1]); G.flFront = fl.filter((f) => f.y >= ROSE_BASE[1]);
    // clouds
    G.clouds = [0, 1, 2, 3, 4, 5].map((i) => ({ w: 220 + H(i, 41) * 260, y: 230 + H(i, 42) * 470, x0: H(i, 43) * 2200 - 700, v: 6 + H(i, 44) * 8, a: 0.6 + 0.3 * H(i, 45), seed: i + 3 }));
    return G;
  }

  /* ---------------- sprites (setup) ---------------- */
  const SPR = {};
  function fgSprite(key, w, h, blur, draw) {
    const k = 'bfg|' + key;
    return S.sprite(k, w, h, (x) => {
      const tmp = E.canvas(w, h); draw(tmp.x);
      tmp.x.setTransform(1, 0, 0, 1, 0, 0); tmp.x.globalCompositeOperation = 'source-atop'; tmp.x.fillStyle = 'rgba(12,40,38,0.46)'; tmp.x.fillRect(0, 0, w, h);
      x.filter = `blur(${blur}px)`; x.drawImage(tmp.c, 0, 0); x.filter = 'none';
    });
  }
  function leafPath(len, wid) { const p = new Path2D(); p.moveTo(0, 0); p.bezierCurveTo(wid, -len * 0.2, wid * 0.8, -len * 0.75, 0, -len); p.bezierCurveTo(-wid * 0.8, -len * 0.75, -wid, -len * 0.2, 0, 0); p.closePath(); return p; }
  function drawLeaf(x, len, wid, col, a = 1) {
    const p = leafPath(len, wid);
    x.fillStyle = LG(x, -wid, 0, wid, -len * 0.3, [[0, lt(col, 0.16), a], [0.5, col, a], [1, dk(col, 0.35), a]]); x.fill(p);
    x.save(); x.clip(p); x.fillStyle = css(dk(col, 0.5), 0.25 * a); x.fillRect(0, -len * 1.1, wid * 1.4, len * 1.2); x.restore();
    x.strokeStyle = css(lt(col, 0.3), 0.45 * a); x.lineWidth = Math.max(1.5, wid * 0.07); x.lineCap = 'round';
    x.beginPath(); x.moveTo(0, -len * 0.05); x.quadraticCurveTo(wid * 0.06, -len * 0.5, 0, -len * 0.9); x.stroke();
  }
  function makeSprites() {
    // foreground framing stems (L5): dark, blurred, a few with flower heads (drawn with the flower set)
    const fgc = '#15524A';
    SPR.fgL = fgSprite('L', 520, 1000, 7, (x) => {
      x.translate(0, 985);
      [[40, -0.38, 700, 7], [150, -0.12, 560, 6], [230, 0.1, 380, 5]].forEach(([bx, a, len, w], j) => {
        x.save(); x.translate(bx, 0); x.rotate(a);
        x.strokeStyle = css(lt(fgc, 0.1)); x.lineWidth = w * 2.2; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(30, -len * 0.5, 10, -len); x.stroke();
        x.save(); x.translate(10, -len); x.scale(2.4, 2.4); A.flowerSet(x, { type: ['tulip', 'carnation', 'tulip'][j], size: 48, stem: 0, sway: 0, leaves: false }); x.restore();
        x.restore();
      });
      [[-20, -0.6, 420, 110], [90, -0.25, 520, 120], [210, 0.35, 360, 95], [300, 0.7, 260, 80]].forEach(([bx, a, len, w]) => { x.save(); x.translate(bx, 30); x.rotate(a); drawLeaf(x, len, w, fgc); x.restore(); });
    });
    SPR.fgR = fgSprite('R', 520, 1000, 7, (x) => {
      x.translate(520, 985);
      [[-50, 0.32, 640, 7, 'carnation'], [-170, 0.08, 470, 6, 'tulip']].forEach(([bx, a, len, w, ty]) => {
        x.save(); x.translate(bx, 0); x.rotate(a);
        x.strokeStyle = css(lt(fgc, 0.1)); x.lineWidth = w * 2.2; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(-30, -len * 0.5, -10, -len); x.stroke();
        x.save(); x.translate(-10, -len); x.scale(2.3, 2.3); A.flowerSet(x, { type: ty, size: 48, stem: 0, sway: 0, leaves: false }); x.restore();
        x.restore();
      });
      [[20, 0.6, 440, 115], [-90, 0.25, 540, 125], [-210, -0.35, 360, 95], [-300, -0.7, 250, 80]].forEach(([bx, a, len, w]) => { x.save(); x.translate(bx, 30); x.rotate(a); drawLeaf(x, len, w, fgc); x.restore(); });
    });
    SPR.fgM = fgSprite('M', 700, 520, 8, (x) => {
      x.translate(350, 515);
      [[-240, -0.9, 300, 90], [-120, -0.4, 380, 100], [0, 0.05, 300, 85], [130, 0.45, 360, 95], [250, 0.95, 280, 85]].forEach(([bx, a, len, w]) => { x.save(); x.translate(bx, 0); x.rotate(a); drawLeaf(x, len, w, dk(fgc, 0.1)); x.restore(); });
    });
    // hoopoe branch (p 1.15), drawn sharp at 2x
    SPR.branch = S.sprite('b_branch', 1000, 520, (x) => {
      x.scale(2, 2); x.translate(60, 140);
      const br = '#6B4A32';
      const bp = new Path2D(); bp.moveTo(-80, 118); bp.bezierCurveTo(40, 92, 150, 78, 250, 70); bp.bezierCurveTo(300, 66, 345, 58, 380, 46); bp.lineTo(382, 52); bp.bezierCurveTo(345, 70, 300, 80, 250, 84); bp.bezierCurveTo(150, 92, 40, 112, -80, 142); bp.closePath();
      x.fillStyle = LG(x, 0, 60, 0, 140, [[0, '#9A7254'], [0.45, br], [1, '#3E2A1C']]); x.fill(bp);
      x.strokeStyle = 'rgba(255,230,190,0.35)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(-80, 120); x.bezierCurveTo(40, 94, 150, 80, 250, 72); x.stroke();
      // twig up
      x.strokeStyle = br; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(120, 92); x.quadraticCurveTo(150, 40, 200, 8); x.stroke();
      x.lineWidth = 3.5; x.beginPath(); x.moveTo(300, 66); x.quadraticCurveTo(330, 30, 322, -8); x.stroke();
      const lv = [[-40, 112, -2.3, 70, 22], [10, 104, 2.6, 64, 20], [70, 96, -2.0, 76, 22], [200, 8, -0.6, 56, 18], [190, 14, 0.5, 50, 16], [322, -8, -0.2, 52, 16], [380, 48, 1.1, 54, 17], [360, 56, 2.4, 48, 15], [150, 50, -1.2, 46, 15]];
      lv.forEach(([lx, ly, a, len, w], j) => { x.save(); x.translate(lx, ly); x.rotate(a); drawLeaf(x, len, w, j % 2 ? '#3FA36B' : '#2F8A6E'); x.restore(); });
      // pomegranate blossoms (small, warm red-orange)
      [[168, 26, 0.9], [330, 20, 0.8], [40, 100, 0.75]].forEach(([bx, by, s]) => {
        x.save(); x.translate(bx, by); x.scale(s, s);
        for (let i = 0; i < 6; i++) { x.save(); x.rotate((i / 6) * TAU); x.fillStyle = LG(x, 0, 0, 0, -16, [[0, '#C8322A'], [1, '#FF6A4A']]); x.beginPath(); x.ellipse(0, -9, 6, 10, 0, 0, TAU); x.fill(); x.restore(); }
        x.fillStyle = '#FFD36E'; x.beginPath(); x.arc(0, 0, 4, 0, TAU); x.fill(); x.restore();
      });
    });
    // pollen mote sprite
    SPR.mote = S.sprite('b_mote', 32, 32, (x) => { x.fillStyle = RG(x, 16, 16, 0, 16, [[0, '#FFFFFF', 1], [0.25, '#FFE9A0', 0.75], [1, '#FFE9A0', 0]]); x.fillRect(0, 0, 32, 32); });
  }

  /* ---------------- world drawing ---------------- */
  function puffCloud(ctx, w, P, seed) {
    const h = w * 0.3, p = new Path2D(), n = 4 + Math.floor(H(1, seed) * 2);
    for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, r = h * (0.55 + 0.45 * Math.sin(f * PI)) * (0.8 + 0.35 * H(i, seed)); p.moveTo(-w / 2 + f * w + r, 0); p.arc(-w / 2 + f * w, -r * 0.55, r, 0, TAU); }
    ctx.save(); ctx.beginPath(); ctx.rect(-w, -h * 3, w * 2, h * 3); ctx.clip();
    ctx.fillStyle = LG(ctx, 0, -h * 1.4, 0, 0, [[0, lt(P.cloud, 0.3)], [0.6, P.cloud], [1, P.cloudSh]]); ctx.fill(p);
    ctx.restore();
  }
  function cypress(ctx, x, y, h, w, col, colL, sunRight) {
    const p = new Path2D(); p.moveTo(x, y); p.bezierCurveTo(x - w * 0.62, y - h * 0.22, x - w * 0.5, y - h * 0.72, x, y - h); p.bezierCurveTo(x + w * 0.5, y - h * 0.72, x + w * 0.62, y - h * 0.22, x, y); p.closePath();
    ctx.fillStyle = css(col); ctx.fill(p);
    ctx.save(); ctx.clip(p); ctx.fillStyle = css(colL, 0.45); ctx.fillRect(sunRight ? x : x - w, y - h, w, h); ctx.restore();
  }
  function roundTree(ctx, x, y, r, col, colL, sunRight, bloom) {
    ctx.strokeStyle = css(dk(col, 0.45)); ctx.lineWidth = r * 0.16; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r * 1.2); ctx.stroke();
    const p = new Path2D(); p.arc(x, y - r * 1.55, r, 0, TAU);
    ctx.fillStyle = css(col); ctx.fill(p);
    ctx.save(); ctx.clip(p); ctx.fillStyle = css(colL, 0.5); ctx.beginPath(); ctx.arc(x + (sunRight ? 1 : -1) * r * 0.3, y - r * 1.55 - r * 0.22, r, 0, TAU); ctx.fill(); ctx.restore();
    if (bloom > 0) { ctx.fillStyle = css('#FFB3C8', 0.9 * bloom); for (let i = 0; i < 6; i++) { const a = H(i, x | 0) * TAU, d = r * 0.6 * H(i + 7, x | 0); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y - r * 1.55 + Math.sin(a) * d, r * 0.13 * bloom, 0, TAU); ctx.fill(); } }
  }

  /** sky, sun, rays, clouds, hills. o: {cam, P, t (idle), tc (cloud clock), sunX, sunY, wave, sunA} */
  function drawFar(ctx, o) {
    const g = build(), P = o.P, c = o.cam, sunX = o.sunX, sunY = o.sunY, sunR = 140, sunRight = sunX > 540;
    // sky (screen-space gradient, tiny parallax)
    ctx.fillStyle = LG(ctx, 0, 0, 0, 1920, P.sky.map((s) => [s[0] / 1920, s[1]])); ctx.fillRect(0, 0, 1080, 1920);
    if (o.stars > 0) drawStars(ctx, o.t, o.stars);
    lay(ctx, c, 0.04, () => {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = RG(ctx, sunX, sunY, 0, 900, [[0, P.glow, 0.62 * o.sunA], [0.2, P.glow, 0.24 * o.sunA], [1, P.glow, 0]]); ctx.fillRect(sunX - 1000, sunY - 1000, 2000, 2000); ctx.restore();
      S.rays(ctx, sunX, sunY, { n: 9, len: 1400, angle: PI / 2 + (sunX - 540) * -0.0008, spread: 2.4, col: P.glow, alpha: 0.04 * o.sunA, t: o.t, width: 0.03 });
      if (o.sunA > 0.01) {
        ctx.globalAlpha = Math.min(1, o.sunA * 1.2);
        ctx.fillStyle = RG(ctx, sunX, sunY, sunR * 0.85, sunR * 1.7, [[0, P.sunCol, 0.5], [1, P.sunCol, 0]]); ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 1.7, 0, TAU); ctx.fill();
        ctx.fillStyle = RG(ctx, sunX - sunR * 0.3, sunY - sunR * 0.3, 0, sunR, [[0, '#FFFFFF'], [0.7, P.sunCol], [1, mx(P.sunCol, P.glow, 0.5)]]); ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
    // bloom-wave light ring (soft) travelling from the sun
    if (o.wave > 0 && o.wave < 1.4) {
      const [wx, wy] = toScreen(c, 0.3, SUN0[0], SUN0[1]), rr = (o.wave / 0.9) * 1400 * zoomAt(c, 0.5), a = 0.32 * (1 - sm(o.wave / 1.3));
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = RG(ctx, wx, wy, Math.max(0, rr - 160), rr + 60, [[0, '#FFF6E0', 0], [0.7, '#FFF6E0', a], [1, '#FFF6E0', 0]]); ctx.fillRect(0, 0, 1080, 1920); ctx.restore();
      o.ringS = { wx, wy, rr, a };
    } else o.ringS = null;
    lay(ctx, c, 0.08, () => {
      for (const cl of g.clouds) { const x = ((cl.x0 + o.tc * cl.v) % 2600 + 2600) % 2600 - 800; ctx.save(); ctx.translate(x, cl.y); ctx.globalAlpha = cl.a * (o.cloudA === undefined ? 1 : o.cloudA); puffCloud(ctx, cl.w, P, cl.seed); ctx.restore(); }
    });
    if (o.birds > 0.01) lay(ctx, c, 0.12, () => {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = css(mx(ramp(P.sky, 400), '#4A3A44', 0.55), 0.8 * o.birds);
      for (let i = 0; i < 4; i++) {
        const x = 1180 - ((o.t * (22 + 6 * i) + i * 330) % 1700), y = 300 + 70 * i + 14 * Math.sin(o.t * 0.7 + i * 2), sz = 7 + 2 * (i % 2), fl = Math.sin(o.t * (7 + i) + i * 1.7);
        ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - sz, y - fl * sz * 0.5); ctx.quadraticCurveTo(x - sz * 0.45, y - sz * 0.25, x, y); ctx.quadraticCurveTo(x + sz * 0.45, y - sz * 0.25, x + sz, y - fl * sz * 0.5); ctx.stroke();
      }
      ctx.restore();
    });
    g.hills.forEach((hl, li) => lay(ctx, c, STRATA[li][4], () => {
      const base = hl.base, amp = hl.amp, col = mx(P.hills[li], ramp(P.sky, base), P.haze[li]);
      ctx.fillStyle = LG(ctx, 0, base - amp, 0, base + 420, [[0, lt(col, 0.1)], [0.3, col], [1, dk(col, 0.18)]]); ctx.fill(hl.hp);
      ctx.save(); ctx.clip(hl.hp); ctx.strokeStyle = css(P.rim, 0.38 - li * 0.05); ctx.lineWidth = 5 - li; ctx.stroke(hl.crest);
      // sun-side light wash on the hill face
      ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = RG(ctx, sunX, base, 0, 700, [[0, P.glow, 0.5 * o.sunA], [1, P.glow, 0]]); ctx.fillRect(sunX - 700, base - 200, 1400, 600);
      ctx.restore();
      for (const tr of hl.trees) {
        if (tr[0] === 'c') cypress(ctx, tr[1], tr[2], tr[3], tr[4], li === 1 ? mx(col, P.cyp, 0.35) : P.cyp, li === 1 ? lt(col, 0.2) : P.treeL, sunRight);
        else { const b = o.wave === undefined ? 1 : clamp((o.wave - (Math.hypot(tr[1] - SUN0[0], tr[2] - SUN0[1]) / 1400) * 0.9) / 0.4); roundTree(ctx, tr[1], tr[2], tr[3], P.tree, P.treeL, sunRight, b * (1 - (o.dusk || 0))); }
      }
      // blossom dots
      if (hl.dots.length && o.wave > 0) {
        const hz = mx(col, ramp(P.sky, base), 0.25);
        for (const [x, y, r, bc] of hl.dots) {
          const pop = clamp((o.wave - (Math.hypot(x - SUN0[0], y - SUN0[1]) / 1400) * 0.9) / 0.35); if (pop <= 0) continue;
          const s = pop < 0.6 ? 1.3 * E.ease.outCubic(pop / 0.6) : 1.3 - 0.3 * sm((pop - 0.6) / 0.4);
          ctx.fillStyle = css(mx(bc, hz, 0.12 + 0.1 * (3 - li) + 0.6 * (o.dusk || 0))); ctx.beginPath(); ctx.arc(x, y, r * s, 0, TAU); ctx.fill();
          if (li === 3 && (o.dusk || 0) < 0.5) { ctx.fillStyle = css('#FFFFFF', 0.5); ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * s * 0.35, 0, TAU); ctx.fill(); }
        }
      }
      if (li < 3) { const hzc = ramp(P.sky, HZ); ctx.fillStyle = LG(ctx, 0, base + 10, 0, base + 130, [[0, hzc, 0], [1, hzc, 0.18 + 0.08 * (2 - li)]]); ctx.fillRect(X0, base + 10, X1 - X0, 120); }
    }));
    if (o.ringS) {
      const { wx, wy, rr } = o.ringS, a = 1 - sm(o.wave / 1.25), yLand = toScreen(c, 0.15, 540, STRATA[0][0] - 30)[1];
      for (let i = 0; i < 64; i++) {
        const ang = PI * 0.15 + (i / 63) * PI * 1.25 + (H(i, 401) - 0.5) * 0.05, rj = rr - 40 + 80 * H(i, 402);
        const x = wx + Math.cos(ang) * rj, y = wy + Math.sin(ang) * rj;
        if (y < yLand || x < -20 || x > 1100 || y > 1960) continue;
        const tw2 = 0.5 + 0.5 * Math.sin(o.wave * 30 + i * 2.3);
        S.sparkle(ctx, x, y, (5 + 8 * H(i, 403)) * (0.6 + 0.4 * tw2), a * (0.55 + 0.45 * tw2), '#FFF4C8', H(i, 404));
      }
    }
  }
  let starPts = null;
  function drawStars(ctx, t, a) {
    if (!starPts) { starPts = []; for (let i = 0; i < 90; i++) starPts.push([H(i, 501) * 1080, Math.pow(H(i, 502), 1.4) * 820, 0.6 + H(i, 503) * 1.6, H(i, 504)]); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r, ph] of starPts) { const tw2 = 0.55 + 0.45 * Math.sin(t * (1.5 + ph * 2) + ph * 20); ctx.globalAlpha = a * tw2 * clamp(1 - y / 900); ctx.fillStyle = '#E8ECFF'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawFlowers(ctx, list, o) {
    const wave = o.wave, t = o.t, pal = 'B';
    for (const f of list) {
      const pop = wave === undefined ? 1 : clamp((wave - f.delay) / 0.5);
      if (pop <= 0) continue;
      const rot = 0.05 * Math.sin(1.3 * t + f.x * 0.01) + 0.02 * Math.sin(2.7 * t + f.i);
      A.drawFlower(ctx, f.type, f.x, f.y, f.size, { pop, rot, palette: pal });
    }
    // pollen puffs on popping heads
    if (wave !== undefined && wave > 0 && wave < 2.2) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const f of list) {
        if (!f.puff) continue; const age = wave - f.delay - 0.12; if (age < 0 || age > 0.8) continue;
        const k = age / 0.75, n = 6;
        for (let j = 0; j < n; j++) {
          const a = (j / n) * TAU + H(f.i, 7) * 6, d = f.size * (0.25 + 1.6 * E.ease.outCubic(k)) * (0.7 + 0.5 * H(j, f.i)), r = Math.max(1, f.size * 0.08 * (1 - k * 0.6));
          ctx.globalAlpha = 0.85 * (1 - k); ctx.drawImage(SPR.mote, f.x + Math.cos(a) * d - r * 2, f.hy + Math.sin(a) * d - d * 0.25 * k - r * 2, r * 4, r * 4);
        }
      }
      ctx.restore();
    }
  }
  /** meadow ground: fill, sun warmth, path, grass (part 'back' also draws back flowers) */
  function drawMeadow(ctx, o) {
    const g = build(), P = o.P, t = o.t;
    ctx.fillStyle = LG(ctx, 0, TOP, 0, 1920, [[0, P.meadow[0]], [0.12, P.meadow[1]], [0.55, P.meadow[2]], [1, P.meadow[3]]]); ctx.fill(g.meadow);
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = RG(ctx, o.sunX, TOP, 0, 760, [[0, P.glow, 0.75 * o.sunA], [1, P.glow, 0]]); ctx.fillRect(o.sunX - 760, TOP - 60, 1520, 900); ctx.restore();
    // path
    const pth = g.path, pd = o.pathDim || 0, PP = pd > 0 ? mx(P.path, P.meadow[1], pd) : P.path;
    ctx.fillStyle = LG(ctx, 0, HZ, 0, 1920, [[0, lt(PP, 0.15)], [0.13, PP], [0.24, mx(PP, P.meadow[1], 0.3)], [0.4, mx(PP, P.meadow[2], 0.58)], [0.65, mx(PP, P.meadow[2], 0.66)], [1, mx(PP, P.meadow[3], 0.8)]]); ctx.fill(pth.pp);
    ctx.save(); ctx.clip(pth.pp); ctx.strokeStyle = css(pd > 0 ? mx(P.pathEdge, P.meadow[1], pd) : P.pathEdge); ctx.lineJoin = 'round'; ctx.lineWidth = 14;
    ctx.globalAlpha = 0.9; ctx.stroke(pth.edgeL); ctx.globalAlpha = 0.45; ctx.stroke(pth.edgeR); ctx.globalAlpha = 1;
    ctx.fillStyle = css(P.pathEdge, 0.55); for (const [x, y, sz] of pth.pebbles) { ctx.beginPath(); ctx.ellipse(x, y, sz * 1.6, sz * 0.8, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    // grass
    g.grass.forEach((b, bi) => {
      for (const [col, al] of [[P.grassD, 0.55], [P.grassL, 0.45]]) {
        ctx.strokeStyle = css(col, al); ctx.lineWidth = [1.6, 2.6, 4.2][bi]; ctx.lineCap = 'round'; ctx.beginPath();
        for (const [x, y, d, i] of b) { if ((i % 2 === 0) !== (col === P.grassD)) continue; const h = 8 + d * 46, lean = Math.sin(t * 1.3 + x * 0.01) * h * 0.18 + (H(i, 93) - 0.5) * h * 0.5; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h); }
        ctx.stroke();
      }
    });
  }
  /** multiply dusk/night tint over the meadow region (screen-space) */
  function meadowTint(ctx, c, P, k) {
    if (k <= 0.01) return;
    const y0 = toScreen(c, 1, 540, TOP)[1];
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = clamp(k);
    ctx.fillStyle = LG(ctx, 0, y0 - 220 * zoomAt(c, 1), 0, y0 + 40, [[0, '#FFFFFF'], [1, P.tint]]); ctx.fillRect(-200, y0 - 230 * zoomAt(c, 1), 1480, 2400);
    ctx.restore();
  }
  function roseTip(t, o = {}) { return A.stemTip({ len: 330, t, wilt: o.wilt || 0, bend: o.bend || 0 }); }
  function drawRose(ctx, c, o) {
    lay(ctx, c, 1, () => {
      ctx.translate(ROSE_BASE[0], ROSE_BASE[1]);
      const sopt = { len: 330, t: o.t, leaves: 2, thorns: 4, width: 9, wilt: o.stemWilt === undefined ? o.wilt || 0 : o.stemWilt, bend: o.bend || 0 };
      const tip = A.stem(ctx, sopt);
      E.at(ctx, tip.x, tip.y, 1, tip.angle + (o.bow || 0), () => {
        A.heroRose(ctx, Object.assign({ R: ROSE_R, bloom: o.bloom === undefined ? 1 : o.bloom, t: o.t, wilt: o.wilt || 0 }, o.rose || {}));
        if (o.onHead) o.onHead(ctx, tip);
      });
    });
  }
  function drawFg(ctx, c, t, P, kDark) {
    lay(ctx, c, 1.9, () => {
      const sw = (ph) => Math.sin(t * 0.9 + ph) * 0.015;
      // [sprite, x, base y, phase, scale] — rest framing (corners, below the gloss band) + low clumps for the stroll
      const items = [[SPR.fgL, 140, 2290, 0, 1.15], [SPR.fgR, 950, 2300, 1, 1.1], [SPR.fgM, 560, 2070, 2, 1.0], [SPR.fgM, -160, 2060, 6, 1.0]];
      for (const [spr, x, y, ph, s] of items) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(sw(ph)); ctx.scale(s, s); ctx.drawImage(spr, -spr.width / 2, -spr.height); ctx.restore();
      }
    });
    // stroll clumps: screen-space L5 elements driven by the dolly (pass fast through the foot band, below the gloss band)
    const dx = (c.x - 540) * 2.8, dz = Math.max(0, zoomAt(c, 1) - 1.3) * 700;
    if (dx > 1) {
      for (const [bx, sc, spr, by] of [[1290, 0.92, SPR.fgM, 1965], [1660, 1.1, SPR.fgR, 2360], [2080, 0.95, SPR.fgM, 1975]]) {
        const x = bx - dx; if (x < -500 || x > 1600) continue;
        ctx.save(); ctx.translate(x, by + dz); ctx.rotate(Math.sin(t * 0.9 + bx) * 0.015); ctx.scale(sc, sc); ctx.drawImage(spr, -spr.width / 2, -spr.height); ctx.restore();
      }
    }
    void P; void kDark;
  }

  /* ---------------- B timeline ---------------- */
  const T0 = 2.30, TW = 2.44;
  function camB(t) {
    const d = drift(t);
    const c = { x: 540, y: 960, z: 1, zo: 1, ox: 540, oy: 960, rot: d.rot, sx: d.sx, sy: d.sy };
    // 1) optical pull-back from the sun (A's glow) + dolly parallax rush
    const k1 = E.p(t, T0, 3.7, 'outCubic');
    c.zo = lerp(2.2, 1, k1); c.z = lerp(1.38, 1, k1);
    c.ox = lerp(SUN0[0] + 6, 540, k1); c.oy = lerp(SUN0[1] + 20, 960, k1);
    // 2) push-in on the rose (rose ≈ screen (540,830))
    const k2 = E.p(t, 3.56, 4.5, 'inOutCubic'), k3 = E.p(t, 4.6, 5.42, 'inOutCubic');
    const z2 = lerp(1, 1.45, k2) * lerp(1, 0.86, k3); c.z *= z2; c.y = lerp(960, 820 + 120 / z2, k2);
    // 3) stroll dolly
    const k4 = E.p(t, 5.95, 6.70, 'inOutCubic');
    c.x += 330 * k3 * (1 - k4);
    c.y += 14 * Math.sin(E.p(t, 4.6, 5.42, 'linear') * PI * 2) * (1 - k4);
    // 4) swing back + push to the rose: rose (540,820) at R 260
    if (k4 > 0) { const zA = c.z, zB = 2.6; c.z = lerp(zA, zB, k4); c.y = lerp(c.y, 820 + 140 / zB, k4); }
    return c;
  }
  const sunYB = (t) => lerp(SUN0[1], 930, E.p(t, 5.95, 6.70, 'inOutSine'));
  const duskB = (t) => E.p(t, 6.0, 6.70, 'inOutSine');
  /** DOF blur (px) of back group / front group */
  function dofB(t) {
    const r = E.p(t, 3.56, 3.95, 'outCubic') * (1 - E.p(t, 4.55, 4.95, 'inOutSine'));
    const f = E.p(t, 5.95, 6.70, 'inOutSine');
    return { back: 6 * r + 3.5 * f, front: Math.max(2.2 * E.p(t, 2.5, 2.9), 6 * r + 9 * f), near: 5 * r + 6 * f };
  }

  /* bee path: lands on the rose at 4.00 and stays (C lifts it off at 8.28) */
  const BEE_SPOT = [26, -64]; // rose-local landing spot (head coordinates)
  function beeState(t, ttw) {
    const land = 4.0;
    if (t < 3.45) return null;
    if (t < land) {
      const u = E.p(t, 3.45, land, 'outCubic');
      return { fly: 1 - u * 0.2, off: [lerp(520, 0, u) + Math.sin(u * PI * 2) * 30 * (1 - u), lerp(-260, 0, u) - Math.sin(u * PI) * 70], flip: true, rot: -0.15 * (1 - u) };
    }
    const k = t - land, dip = 9 * Math.exp(-k * 6) * Math.sin(k * 16);
    return { fly: 0, off: [0, dip], flip: true, rot: 0.06 * Math.sin(ttw * 2) };
  }
  function drawBee(ctx, st, tip, ttw) {
    if (!st) return;
    E.at(ctx, BEE_SPOT[0] + st.off[0], BEE_SPOT[1] + st.off[1], 1, st.rot - (tip ? 0 : 0), () => A.bee(ctx, { size: 46, t: ttw, flip: st.flip, hover: st.fly > 0.3 }));
  }

  /* fragrance ribbons: tapered curling ribbons that rise and dissolve, from (x,y) screen */
  function ribbons(ctx, x, y, t, t0, s, alpha, seed = 3, life = 1.9) {
    if (alpha <= 0.01) return;
    ctx.save(); ctx.lineCap = 'round';
    for (let r = 0; r < 3; r++) {
      const age = t - t0 - r * 0.2; if (age <= 0 || age >= life) continue;
      const k = age / life, a = alpha * sm(age / 0.25) * (1 - sm((k - 0.5) / 0.5));
      if (a <= 0.01) continue;
      const ph = r * 2.1 + seed, dir = r - 1, uh = Math.min(1, k * 1.3), ut = Math.max(0, uh - 0.55), n = 24, pts = [];
      for (let j = 0; j <= n; j++) {
        const u = ut + ((uh - ut) * j) / n, rise = u * 470 * s, curl = (26 + 70 * u) * s;
        pts.push([x + dir * 80 * s * u + Math.sin(u * 6.5 + ph + age * 1.7) * curl, y - 10 * s - rise]);
      }
      for (let pass = 0; pass < 2; pass++) {
        for (let j = 1; j <= n; j++) {
          const w = 5.5 * s * Math.sin((j / n) * PI);
          ctx.strokeStyle = pass ? css('#FFF2F7', a * 0.9) : css('#FF9EC4', a * 0.3); ctx.lineWidth = Math.max(0.6, pass ? w : w * 2.8);
          ctx.beginPath(); ctx.moveTo(pts[j - 1][0], pts[j - 1][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  /* butterflies (world p≈1): wander + stroll lead */
  const BFL = [
    { pat: 'sapphire', base: [800, 880], ph: 0.3, size: 36, t0: 2.95 },
    { pat: 'monarch', base: [300, 980], ph: 1.7, size: 33, t0: 3.15 },
    { pat: 'swallowtail', base: [900, 1100], ph: 3.1, size: 38, t0: 3.35 },
  ];
  function bflyPos(b, i, t, ttw) {
    const app = E.p(t, b.t0, b.t0 + 0.9, 'outCubic');
    const lead = 320 * E.p(t, 4.55, 5.5, 'inOutSine') + 140 * E.p(ttw, 5.6, 6.0, 'linear') + 1000 * E.p(t, 5.95, 6.55, 'inQuad');
    const x = b.base[0] + E.noise(ttw * 0.55 + i * 7, 11) * 120 + lead * (1.05 + 0.12 * i) + (1 - app) * (i === 1 ? -500 : 520);
    const y = b.base[1] + E.noise(ttw * 0.7 + i * 3, 12) * 70 + Math.sin(ttw * 3.1 + b.ph) * 14 - (1 - app) * 180 - 60 * E.p(t, 4.6, 5.4) ;
    return [x, y];
  }

  function drawPollen(ctx, c, ttw, alpha, bandK) {
    // drifting motes at three depths
    for (const [p, n, seed, rr] of [[0.45, 26, 701, 2.2], [1, 30, 702, 3.2], [1.5, 14, 703, 5]]) {
      lay(ctx, c, p, () => {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < n; i++) {
          const x = -400 + ((H(i, seed) * 2000 + ttw * 14 * (0.5 + H(i, seed + 1)) + E.noise(ttw * 0.3 + i, seed) * 50) % 2000 + 2000) % 2000;
          const y = 300 + ((H(i, seed + 2) * 1500 - ttw * 18 * (0.4 + H(i, seed + 3)) + E.noise(ttw * 0.25 + i * 3, seed + 1) * 40) % 1500 + 1500) % 1500;
          const tw2 = 0.5 + 0.5 * Math.sin(ttw * (1.3 + H(i, seed + 4) * 2) + i);
          let a = alpha * (0.35 + 0.5 * tw2);
          const sy = toScreen(c, p, x, y)[1]; if (sy > 1229 && sy < 1574) a *= 1 - 0.7 * bandK;
          const r = rr * (0.6 + 0.6 * H(i, seed + 5)); ctx.globalAlpha = a; ctx.drawImage(SPR.mote, x - r * 2, y - r * 2, r * 4, r * 4);
        }
        ctx.restore();
      });
    }
  }

  /** golden sweetness pulse at the rose heart (screen x,y; s = screen scale of the rose, t0 = accent) */
  function sweetPulse(ctx, x, y, s, t, t0) {
    const age = t - t0; if (age < -0.05 || age > 1.6) return;
    const k = clamp(age / 1.2), glow = E.env(t, t0 - 0.05, t0 + 1.6, 0.18, 0.9) * lerp(0.6, 0.35, sm((age - 0.2) / 0.4));
    S.light(ctx, x, y, 120 * s, '#FFD98A', glow);
    S.light(ctx, x, y, 34 * s, '#FFF4D0', glow * 0.8);
    if (age > 0 && age < 1.2) {
      const r = (30 + 200 * E.ease.outCubic(k)) * s, a = 0.42 * (1 - k) * sm(age * 8);
      ctx.save(); ctx.strokeStyle = css('#FFD98A', a * 0.4); ctx.lineWidth = 10 * s; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = css('#FFF0C0', a); ctx.lineWidth = 2 * s; ctx.stroke(); ctx.restore();
      for (let i = 0; i < 7; i++) { const aa = (i / 7) * TAU + 0.4, d = r * (0.75 + 0.3 * H(i, 61)); S.sparkle(ctx, x + Math.cos(aa) * d, y + Math.sin(aa) * d * 0.8, (5 + 4 * H(i, 62)) * s, (1 - k) * 0.9, '#FFF4C8', aa); }
    }
  }
  function grade(ctx, col, a) {
    if (a <= 0.003) return;
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(0, 0, 1080, 1920); ctx.restore();
  }
  function bandScrim(ctx, k, dark = '#0A1E1C') {
    if (k <= 0.01) return;
    ctx.save(); ctx.translate(540, 1400); ctx.scale(1, 220 / 640);
    ctx.fillStyle = RG(ctx, 0, 0, 0, 640, [[0, dark, 0.22 * k], [0.55, dark, 0.16 * k], [1, dark, 0]]);
    ctx.fillRect(-700, -700, 1400, 1400); ctx.restore();
  }
  // gloss presence ramp (0..1, eased 0.25 s)
  function glossK(t) {
    if (!window.TIMING) return 0;
    let k = 0; for (const g of TIMING.glosses) k = Math.max(k, Math.min(E.p(t, g.in - 0.25, g.in, 'inOutSine'), 1 - E.p(t, g.out + 0.1, g.out + 0.4, 'inOutSine')));
    return k;
  }

  /** full world frame (shared with C). o: {cam, P, t(idle), tc, sunX, sunY, sunA, wave, dof:{back,front}, rose:{...}, bee, branch, fg, tint, onRose, afterBack, stars} */
  function drawWorld(ctx, o) {
    const c = o.cam;
    const back = (l) => { drawFar(l, o); lay(l, c, 1, () => { drawMeadow(l, o); drawFlowers(l, build().flBack, o); }); meadowTint(l, c, o.P, o.tint); if (o.afterBack) o.afterBack(l); };
    blurred(ctx, o.dof.back, back);
    if (o.onRose) o.onRose(ctx); else drawRose(ctx, c, o.roseOpt);
    const front = (l) => {
      lay(l, c, 1, () => drawFlowers(l, build().flFront, o));
      if (o.fg !== false) drawFg(l, c, o.t, o.P, o.tint);
      if (o.tint > 0.01) { l.save(); l.globalCompositeOperation = 'source-atop'; l.fillStyle = css(dk(o.P.tint, 0.45), clamp(0.62 * o.tint)); l.fillRect(0, 0, 1080, 1920); l.restore(); }
      if (o.bandDim > 0.01) { const bd = dk(o.P.meadow[2], 0.35), a = 0.32 * o.bandDim; l.save(); l.globalCompositeOperation = 'source-atop'; l.fillStyle = LG(l, 0, 1170, 0, 1640, [[0, bd, 0], [0.18, bd, a], [0.82, bd, a], [1, bd, 0]]); l.fillRect(0, 1170, 1080, 470); l.restore(); }
      if (o.afterFront) o.afterFront(l);
    };
    blurred(ctx, o.dof.front, front, o.tint > 0.01 || o.bandDim > 0.01);
    if (o.branch) blurred(ctx, o.dof.near || 0, (l) => { o.branch(l); if (o.tint > 0.01) { l.save(); l.globalCompositeOperation = 'source-atop'; l.fillStyle = css(dk(o.P.tint, 0.45), clamp(0.62 * o.tint)); l.fillRect(0, 0, 1080, 1920); l.restore(); } }, o.tint > 0.01);
  }
  function blurred(ctx, b, fn, force) {
    if (b < 0.4 && !force) { fn(ctx); return; }
    E.layer(ctx, fn, { blur: b < 0.4 ? 0 : b, lo: b >= 0.4 });
  }

  window.BCW = { PAL, palAt, applyCam, toScreen, zoomAt, drift, lay, tw, build, drawWorld, drawFar, drawMeadow, drawFlowers, meadowTint, drawRose, roseTip, drawBee, beeState, ribbons, bandScrim, glossK, makeSprites, SPR, ROSE_BASE, ROSE_R, SUN0, HZ, TOP, camB, sunYB, duskB, mx, css, lt, dk, LG, RG, BEE_SPOT };

  /** hoopoe branch (p 1.15) entering from the left; hoopoe at ≈(250,700) */
  function drawBranch(l, c, t, ttw) {
    const fade = 1 - E.p(t, 6.1, 6.6, 'inOutSine');
    if (fade <= 0.003) return;
    l.save(); l.globalAlpha *= fade;
    lay(l, c, 1.15, () => {
      const sw = Math.sin(ttw * 1.1) * 0.012;
      l.save(); l.translate(-80, 690); l.rotate(sw); l.translate(80, -690);
      l.drawImage(SPR.branch, -60, 690 - 140 - 118 + 20, 500, 260);
      // crest fans at 2.80 (outBack inside the asset), settles 3.10
      const fan = E.p(t, 2.78, 3.1, 'outCubic') * (1 - 0.35 * E.p(t, 3.6, 4.2)) + 0.25 * E.env(t, 4.0, 4.9, 0.2, 0.3);
      const pose = 0.12 * E.env(t, 3.05, 3.5, 0.15, 0.25);
      E.at(l, 252, 692, 1, 0, () => A.hoopoe(l, { size: 56, t: ttw, fan, pose: t > 3.9 && t < 4.6 ? 'look' : pose }));
      l.restore();
    });
    l.restore();
  }

  /* ---------------- the scene ---------------- */
  const postB = (t) => ({ bloom: lerp(0.75, 0.3, E.p(t, 2.3, 3.2)), vignette: lerp(0.2, 0.26, E.p(t, 5.95, 6.7)), grain: 0.045 });
  function frameB(ctx, t) {
      const c = camB(t), ttw = tw(t), dusk = duskB(t), P = palAt(dusk, 0), wave = t - TW, dof = dofB(t);
      const sunX = SUN0[0], sunY = sunYB(t);
      const bloom = E.p(t, 2.62, 3.15, 'outCubic');
      const bee = beeState(t, ttw);
      const roseOpt = {
        t: ttw, bloom, rose: {},
      };
      const tip = roseTip(ttw);
      const roseHead = (wx, wy) => { const ca = Math.cos(tip.angle), sa = Math.sin(tip.angle); return [ROSE_BASE[0] + tip.x + wx * ca - wy * sa, ROSE_BASE[1] + tip.y + wx * sa + wy * ca]; };
      drawWorld(ctx, {
        cam: c, P, t: ttw, tc: ttw, sunX, sunY, sunA: 1, wave, dof, tint: dusk * 0.85, dusk, bandDim: glossK(t), birds: E.p(t, 2.6, 3.0) * (1 - dusk),
        onRose: (ctx2) => {
          // warm halo behind the rose while it is "tasted"
          const pulse = E.env(t, 3.96, 6.0, 0.25, 1.2) * (0.5 - 0.2 * E.p(t, 4.25, 4.8));
          const [hx, hy] = toScreen(c, 1, ...roseHead(0, -0.2 * ROSE_R));
          if (pulse > 0.01) S.light(ctx2, hx, hy, 340 * zoomAt(c, 1), '#FFD98A', pulse);
          drawRose(ctx2, c, Object.assign(roseOpt, { onHead: (hctx) => drawBee(hctx, bee, tip, ttw) }));
          sweetPulse(ctx2, hx, hy, zoomAt(c, 1), t, 3.98);
          ribbons(ctx2, hx, hy - 20, ttw, 3.98, zoomAt(c, 1) * 0.8, 1 - E.p(t, 5.9, 6.5), 3, 1.6);
        },
        branch: (l) => drawBranch(l, c, t, ttw),
      });
      // butterflies (sharp, above front layer), hidden in the band when gloss active
      const gk = glossK(t);
      lay(ctx, c, 1.05, () => {
        BFL.forEach((b, i) => {
          if (t < b.t0) return;
          const [x, y] = bflyPos(b, i, t, ttw);
          const heading = Math.atan2(bflyPos(b, i, t + 0.05, tw(t + 0.05))[1] - y, bflyPos(b, i, t + 0.05, tw(t + 0.05))[0] - x);
          E.at(ctx, x, y, 1, Math.cos(heading) * 0.35, () => A.butterfly(ctx, { size: b.size, t: ttw, pattern: b.pat, phase: b.ph, hz: 4.2 }));
        });
      });
      drawPollen(ctx, c, ttw, 0.75, gk);
      // "değil": ripple from the rose + saturation dip
      const rp = (t - 5.56) / 1.25;
      if (rp > 0 && rp < 1) {
        const [hx, hy] = toScreen(c, 1, ...roseHead(0, -0.2 * ROSE_R)), r = 30 + E.ease.outCubic(rp) * 1500, a = 0.35 * (1 - rp) * sm(rp * 10);
        ctx.save(); ctx.strokeStyle = css('#FFFFFF', a * 0.35); ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = css('#FFFFFF', a); ctx.lineWidth = 2.2; ctx.stroke(); ctx.restore();
      }
      const sat = E.env(t, 5.52, 6.08, 0.15, 0.18);
      if (sat > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.12 * sat; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); }
      grade(ctx, '#FFB38A', 0.12);
      // emergence from A's page glow: cream glow condenses into the sun
      const ge = 1 - E.p(t, 2.30, 2.78, 'inOutSine');
      if (ge > 0.001) {
        const [sx, sy] = toScreen(c, 0.04, sunX, sunY), R = lerp(160, 2300, Math.pow(ge, 1.4)), F = 520 + 900 * ge;
        ctx.save(); ctx.fillStyle = RG(ctx, sx, sy, 0, R + F, [[0, '#FFFFFF', 1], [Math.min(0.5, R / (R + F) * 0.4), '#FFF6E6', 1], [R / (R + F), '#FFF6E6', Math.min(1, ge * 1.6)], [1, '#FFF6E6', 0]]);
        ctx.fillRect(0, 0, 1080, 1920); ctx.restore();
      }
      bandScrim(ctx, gk * (1 - 0.4 * dusk), ge > 0.05 ? E.mix('#0A1E1C', '#4A3020', ge) : '#0A1E1C');
  }
  Object.assign(window.BCW, { frameB, postB, glossK, drawPollen, dofB, drawBranch, grade, sweetPulse });
  E.scene({
    id: 'B_bahce', t0: 2.30, t1: 6.70,
    async setup() { build(); if (!SPR.mote) makeSprites(); },
    post: postB,
    draw(ctx, t) { frameB(ctx, t); },
  });
})();
