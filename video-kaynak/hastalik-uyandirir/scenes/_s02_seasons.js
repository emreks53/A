// s04 mevsim katmanları: aynı biçimler dört mevsim renginde (0 bahar, 1 yaz, 2 güz, 3 kış) önbelleğe boyanır;
// mevsim değişimi, sağdan sola ilerleyen yırtık kenarlı bir boya cephesiyle (yürünen yönden gelen yeni mevsim) olur.
// Katmanlar paralaksla kayar (dünya x, katman çarpanı f). Parçacıklar (bahar yaprakları, güz yaprakları, kar) analitik.
'use strict';
const { Path2D } = require('@napi-rs/canvas');
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, noise1, noise2 } = C;

const W = C.W, H = C.H;

// ---------- paletler ----------
const SKY = [
  { c: ['#3A80CF', '#58A4DE', '#86CBE8', '#BFE6EC', '#F4EFD4'], s: [0, 0.24, 0.5, 0.76, 1] },
  { c: ['#1A4BAE', '#2560C2', '#2D84CD', '#44ABD6', '#A2DAE6'], s: [0, 0.2, 0.44, 0.7, 1] },
  { c: ['#4A4392', '#8460A6', '#CF7E8C', '#F0A566', '#F9D190'], s: [0, 0.24, 0.5, 0.76, 1] },
  { c: ['#5B6BAC', '#7F8EC4', '#A6B1D8', '#CBD3EA', '#EAEDF5'], s: [0, 0.24, 0.5, 0.76, 1] },
];
const FARC = [
  { b: '#7F90D2', l: '#B9C6EE', d: '#5961A8', low: '#86BE88', lowL: '#B6DE98', snow: 0.5 },
  { b: '#5876C0', l: '#94B4E6', d: '#3B529E', low: '#5BA67A', lowL: '#8ECB86', snow: 0.0 },
  { b: '#8C6AAC', l: '#C99CC2', d: '#614A8A', low: '#C4945A', lowL: '#E6BC72', snow: 0.15 },
  { b: '#AFB8DC', l: '#EEF1FA', d: '#7C84BA', low: '#D6DCEE', lowL: '#F6F8FC', snow: 1.0 },
];
const MIDC = [
  { back: ['#92CC6C', '#C6E68C', '#5CA86C'], front: ['#6CB955', '#A8D96C', '#3D9157'] },
  { back: ['#5BAC58', '#9AD14C', '#388852'], front: ['#45A04D', '#86C84A', '#2B7845'] },
  { back: ['#D7A74C', '#F1CD74', '#A2723A'], front: ['#C98B3A', '#E8B05A', '#8C5A32'] },
  { back: ['#E3E8F5', '#FFFFFF', '#AAB3D8'], front: ['#D9E0F1', '#FAFBFF', '#9FA8D0'] },
];
// ağaç taçları: [taban, ışık, gölge, dab renkleri]
const CANOPY = [
  { b: '#EE96BE', l: '#FFD3E4', d: '#B95C9A', dabs: ['#FFFFFF', '#FFE2EC', '#E9679A', '#C94C88', '#F8B8D2', '#9CCF5E'] },
  { b: '#3E9B4F', l: '#9ED64A', d: '#17573A', dabs: ['#9ED64A', '#C9E86A', '#2E8A45', '#17573A', '#5DB04E'] },
  { b: '#E5822E', l: '#F8C450', d: '#A4402A', dabs: ['#F8C450', '#F2A33A', '#D2452E', '#B8362A', '#F6D86A'] },
  null,
];
const GROUND = [
  { g: ['#A2D84C', '#7CC350', '#4CA650'], meadow: ['#B4DE5A', '#86C850', '#58AE52'] },
  { g: ['#7CC04E', '#5AAC4E', '#3A964D'], meadow: ['#8CC850', '#62B04E', '#3F9A4E'] },
  { g: ['#E0B65A', '#C89846', '#9A6C3A'], meadow: ['#E8C266', '#D2A24E', '#A8783E'] },
  { g: ['#FBFCFF', '#E3E8F4', '#B6BEDF'], meadow: ['#F7F9FE', '#DDE3F2', '#AEB7DA'] },
];
const PATHC = [
  ['#F3D69C', '#E3B979', '#C9965E'],
  ['#F2D292', '#E1B272', '#C48E58'],
  ['#E9C48E', '#D4A06A', '#AE7850'],
  ['#F6F8FC', '#DFE4F1', '#B7BFDD'],
];

// ---------- mevsim cephesi (yeni mevsimin göründüğü bölge, ekran uzayı) ----------
// Ekranı örten ~950 yatay düz fırça darbesi; her darbe kendi eşiğinde sağ ucundan sola doğru "boyanarak" uzar.
// Eşik sağdan sola artar (+gürültü): yeni mevsim, yürünen yönden darbe darbe boyanarak gelir.
let _dabs = null;
function dabs() {
  if (_dabs) return _dabs;
  const r = rng(4242), out = [];
  for (let y = -40, row = 0; y < H + 70; y += 31, row++) {
    for (let x = -70 + (row % 2) * 40 + r.range(0, 30); x < W + 140; x += 84) {
      const L = r.range(115, 195), w = r.range(52, 80), a = r.range(-0.16, 0.16);
      const xc = x + r.range(-22, 22), yc = y + r.range(-9, 9);
      const pts = P.brushPts(0, 0, -L, 0, w, r.int(1, 1e9), { taper1: r.range(0.55, 0.95), wob: 0.09 });
      const th = clamp(0.7 * (1 - xc / W) + 0.08 * (yc / H) + 0.22 * r.next());
      out.push({ xr: xc + L / 2, yc, ca: Math.cos(a), sa: Math.sin(a), pts, th, h: r.next() });
    }
  }
  _dabs = out; return out;
}
function frontPath(p, seed = 1, dir = 1) {
  const path = new Path2D();
  if (p <= 0) return path;
  if (p >= 1) { path.rect(-50, -50, W + 100, H + 100); return path; }
  const D = dabs(), sh = (seed * 0.6180339) % 1;
  if (dir < 0) { // aynalı: soldan sağa ilerler
    const m = new Path2D();
    const tmp = frontPath(p, seed, 1);
    m.addPath(tmp, { a: -1, b: 0, c: 0, d: 1, e: W, f: 0 });
    return m;
  }
  for (const d of D) {
    const th = clamp(d.th + 0.1 * (((d.h + sh) % 1) - 0.5));
    const k = clamp((p - th * 0.74) / 0.26);
    if (k <= 0) continue;
    const g = E.outCubic(k);
    const q = d.pts;
    path.moveTo(d.xr + q[0][0] * g * d.ca - q[0][1] * d.sa, d.yc + q[0][0] * g * d.sa + q[0][1] * d.ca);
    for (let i = 1; i < q.length; i++) path.lineTo(d.xr + q[i][0] * g * d.ca - q[i][1] * d.sa, d.yc + q[i][0] * g * d.sa + q[i][1] * d.ca);
    path.closePath();
  }
  return path;
}
// geçerli dönüşümden bağımsız olarak ekran uzayında kırp
function clipScreen(ctx, path) {
  const m = ctx.getTransform();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clip(path);
  ctx.setTransform(m);
}

// ---------- gök ----------
const SKY_H = 1240;
function skyCanvas(i) {
  return R.cached('s04:sky' + i, W + 80, SKY_H, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, W + 80, SKY_H);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: W + 80, y1: SKY_H, w: W + 80, h: SKY_H }, SKY[i].c, { seed: 404, stops: SKY[i].s, wMin: 22, wMax: 42, lMin: 90, lMax: 280, mixJitter: 0.06 });
  });
}

// ---------- uzak dağlar (f=0.08) ----------
const FAR = { x0: -80, w: 1420, y0: 760, h: 520 };
function farTop(wx) {
  return 1010 - 150 * Math.pow(Math.max(0, Math.sin(wx * 0.0062 + 0.9)), 1.6) - 70 * Math.pow(Math.max(0, Math.sin(wx * 0.0131 + 2.2)), 2) - 22 * Math.sin(wx * 0.031 + 0.4);
}
function farCanvas(i) {
  const c = FARC[i];
  return R.cached('s04:far' + i, FAR.w, FAR.h, (x) => {
    const r = rng(411);
    const top = []; for (let k = 0; k <= 140; k++) { const wx = FAR.x0 + FAR.w * k / 140; top.push([wx - FAR.x0, farTop(wx) - FAR.y0]); }
    const poly = top.concat([[FAR.w, FAR.h], [0, FAR.h]]);
    x.save(); x.strokeStyle = rgba(P.UNDERPAINT, 0.7); x.lineWidth = 4; x.setLineDash([90, 120, 40, 160]); x.translate(1.5, -1.5); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(P.pathOf(poly)); x.fillStyle = c.b; x.fillRect(0, 0, FAR.w, FAR.h); x.restore();
    // ışık sol yamaçlarda, gölge sağda: yamaç eğimine göre darbe rengi
    P.fillStrokes(x, poly, { x0: 0, y0: 0, x1: FAR.w, y1: FAR.h, w: FAR.w, h: FAR.h }, {
      seed: 412, angle: 0.03, wMin: 12, wMax: 22, lMin: 50, lMax: 150,
      colorFn: (px, py, rr) => {
        const wx = px + FAR.x0, sl = farTop(wx + 6) - farTop(wx - 6); // + : sağa iniş (ışıklı taraf solda yükselen)
        const depth = (py + FAR.y0 - farTop(wx)) / 260;
        let col = sl > 1.5 ? c.d : sl < -1.5 ? c.l : c.b;
        if (rr.chance(0.3)) col = c.b;
        if (depth > 0.55) col = mix(col, rr.chance(0.5) ? c.low : c.lowL, clamp((depth - 0.55) * 2.2));
        return shade(col, rr.range(-0.025, 0.025));
      },
    });
    // kar başlıkları: kar çizgisinin (tırtıklı) üstünde kalan zirveler beyaz; sağa bakan yamaçlarda leylak gölge
    if (c.snow > 0) {
      const snowY = (wx) => 1010 - 168 + 88 * c.snow + 14 * Math.sin(wx * 0.09) + 8 * Math.sin(wx * 0.23 + 1) + 5 * Math.sin(wx * 0.61);
      let run = null;
      const flush = () => {
        if (run && run.length > 2) {
          const poly = run.map((q) => [q[0] - FAR.x0, q[1] - FAR.y0]).concat(run.slice().reverse().map((q) => [q[0] - FAR.x0, q[2] - FAR.y0]));
          x.fillStyle = '#FAFBFF'; x.fill(P.pathOf(poly));
          x.save(); x.clip(P.pathOf(poly));
          for (let k = 0; k < run.length - 1; k += 2) {
            const [wx, ty, by] = run[k], sl = farTop(wx + 6) - farTop(wx - 6);
            if (sl > 0.8) P.stroke(x, wx - FAR.x0, ty - FAR.y0, wx - FAR.x0 + 4, by - FAR.y0 + 4, 9, '#C8CEEA', r.int(1, 1e9), { detail: 0.3, taper1: 0.5 });
            else if (r.chance(0.3)) P.stroke(x, wx - FAR.x0 - 6, ty - FAR.y0 + 6, wx - FAR.x0 + 10, ty - FAR.y0 + 8, 6, '#FFFFFF', r.int(1, 1e9), { detail: 0 });
          }
          x.restore();
        }
        run = null;
      };
      for (let wx = FAR.x0; wx <= FAR.x0 + FAR.w; wx += 3) {
        const ty = farTop(wx), sy = snowY(wx);
        if (ty < sy - 2) { (run = run || []).push([wx, ty, sy]); } else flush();
      }
      flush();
    }
  });
}

// ---------- orta tepeler + küçük ağaçlar (f=0.3) ----------
const MID = { x0: -100, w: 1900, y0: 960, h: 360 };
const midBack = (wx) => 1120 - 46 * Math.pow(Math.max(0, Math.sin(wx * 0.0047 + 0.3)), 1.4) - 16 * Math.sin(wx * 0.017 + 1.1);
const midFront = (wx) => 1196 - 34 * Math.pow(Math.max(0, Math.sin(wx * 0.0058 + 2.4)), 1.5) - 10 * Math.sin(wx * 0.023 + 0.2);
function smallTree(x, px, py, s, i, seed) {
  const r = rng(seed);
  // gövde ve dallar (kışın görünür)
  const trunk = '#6B4430';
  P.curveStroke(x, [[px, py], [px + r.range(-2, 2), py - s * 0.45], [px + r.range(-3, 3), py - s * 0.8]], (u) => s * 0.09 * (1 - u * 0.55), trunk, seed + 1, { bristles: 1 });
  const br = [];
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.5 + r.range(-0.15, 0.15), y0 = py - s * r.range(0.45, 0.75), L = s * r.range(0.32, 0.5);
    br.push([[px, y0], [px + Math.cos(a) * L * 0.55, y0 + Math.sin(a) * L * 0.55], [px + Math.cos(a) * L, y0 + Math.sin(a) * L]]);
  }
  if (i === 3) {
    for (const b of br) P.curveStroke(x, b, (u) => s * 0.04 * (1 - u * 0.7), trunk, seed + 7, { bristles: 0, detail: 0 });
    for (const b of br) { const q = b[2]; x.fillStyle = '#FFFFFF'; x.beginPath(); x.ellipse(q[0], q[1] - 1, s * 0.05, s * 0.025, 0, 0, TAU); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.ellipse(px, py - s * 0.8, s * 0.05, s * 0.02, 0, 0, TAU); x.fill();
    return;
  }
  const c = CANOPY[i];
  const cy = py - s * 0.95, list = [];
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + r.range(-0.3, 0.3); const rr = s * r.range(0.24, 0.32); list.push(P.blobPts(px + Math.cos(a) * s * 0.26, cy + Math.sin(a) * s * 0.2, rr, rr * 0.86, seed + k, 0.14, 20)); }
  list.push(P.blobPts(px, cy - s * 0.04, s * 0.36, s * 0.3, seed + 9, 0.1, 22));
  let b = c.b, l = c.l, d = c.d;
  if (i === 0 && r.chance(0.3)) { b = '#9FD460'; l = '#D2EE8A'; d = '#5CA650'; }
  if (i === 2) { const pick = r.int(0, 2); if (pick === 1) { b = '#D4482E'; l = '#F07A4A'; d = '#8E2A2A'; } else if (pick === 2) { b = '#EFB43A'; l = '#FBDB72'; d = '#B7782A'; } }
  P.toneUnion(x, list, { base: b, dark: d, light: l, seed, rimW: 2.5, dabs: 4, highlights: 3, texture: 0.35, shadowW: 0.16, lightW: 0.07 });
  if (i === 0) for (let k = 0; k < 10; k++) { x.fillStyle = r.pick(['#FFFFFF', '#FFE2EC', '#F48CB4']); x.beginPath(); x.arc(px + r.range(-s * 0.45, s * 0.45), cy + r.range(-s * 0.32, s * 0.3), r.range(2, 3.6), 0, TAU); x.fill(); }
}
function cypress(x, px, py, hh, i, seed) {
  R.cypress(x, px, py, hh, seed, { base: '#2A7552', dark: '#164A38', light: '#58A466' });
  if (i === 3) { // karlı uçlar
    const r = rng(seed + 3);
    for (let k = 0; k < 6; k++) { const yy = py - hh * r.range(0.25, 0.92), half = hh * 0.08 * Math.sin(Math.PI * clamp((py - yy) / hh + 0.05)); x.fillStyle = r.chance(0.5) ? '#FFFFFF' : '#E8ECF8'; x.beginPath(); x.ellipse(px + r.range(-half, half), yy, hh * 0.04, hh * 0.015, r.range(-0.3, 0.3), 0, TAU); x.fill(); }
    x.fillStyle = '#FFFFFF'; x.beginPath(); x.ellipse(px, py - hh * 0.97, hh * 0.035, hh * 0.02, 0, 0, TAU); x.fill();
  }
}
function midCanvas(i) {
  const c = MIDC[i];
  return R.cached('s04:mid' + i, MID.w, MID.h, (x) => {
    x.translate(-MID.x0, -MID.y0);
    const r = rng(421);
    const layer = (fn, cols, seed, trees) => {
      const top = []; for (let k = 0; k <= 160; k++) { const wx = MID.x0 + MID.w * k / 160; top.push([wx, fn(wx)]); }
      const poly = top.concat([[MID.x0 + MID.w, MID.y0 + MID.h], [MID.x0, MID.y0 + MID.h]]);
      x.save(); x.strokeStyle = rgba(P.UNDERPAINT, 0.75); x.lineWidth = 4; x.setLineDash([70, 110, 30, 160]); x.translate(1.5, -1.5); x.stroke(P.pathOf(top, false)); x.restore();
      x.save(); x.clip(P.pathOf(poly)); x.fillStyle = cols[0]; x.fillRect(MID.x0, MID.y0, MID.w, MID.h); x.restore();
      P.bandFill(x, poly, { x0: MID.x0, y0: MID.y0, x1: MID.x0 + MID.w, y1: MID.y0 + MID.h, w: MID.w, h: MID.h }, [cols[1], cols[0], cols[2]], { seed, wMin: 13, wMax: 24, lMin: 60, lMax: 190, stops: [0, 0.22, 1], angle: 0.02 });
      const rr = rng(seed + 5);
      for (let k = 0; k < 46; k++) { const j = rr.int(1, 157), p0 = top[j], p1 = top[j + 2]; P.stroke(x, p0[0], p0[1] + 6, p1[0], p1[1] + 6, rr.range(6, 10), shade(cols[1], 0.04), rr.int(1, 1e9), { detail: 0.4 }); }
      // tarla şeritleri (yaz/güz: hafif ekin çizgileri)
      if (i === 1 || i === 2) for (let k = 0; k < 14; k++) { const wx = MID.x0 + rr.range(0, MID.w), yy = fn(wx) + rr.range(16, 60); P.stroke(x, wx, yy, wx + rr.range(80, 200), yy + rr.range(-4, 4), rr.range(5, 8), shade(cols[0], i === 2 ? 0.08 : -0.06), rr.int(1, 1e9), { detail: 0.3 }); }
      for (const [wx, kind, s] of trees) {
        const gy = fn(wx) + 4;
        if (kind === 'c') cypress(x, wx, gy + 2, s, i, Math.round(wx * 3 + seed));
        else if (kind === 'h') house(x, wx, gy + 2, s, i, Math.round(wx + seed));
        else smallTree(x, wx, gy + 2, s, i, Math.round(wx * 7 + seed));
      }
    };
    const backTrees = [], frontTrees = [];
    for (let wx = MID.x0 + 30; wx < MID.x0 + MID.w; wx += r.range(70, 150)) backTrees.push([wx, r.pick(['t', 't', 'c', 'h', 't']), r.range(34, 48)]);
    for (let wx = MID.x0 + 60; wx < MID.x0 + MID.w; wx += r.range(150, 260)) frontTrees.push([wx, r.pick(['t', 't', 'c', 't']), r.range(56, 74)]);
    layer(midBack, c.back, 422, backTrees.map(([a, k, s]) => [a, k === 'c' ? 'c' : k, k === 'c' ? s * 1.8 : k === 'h' ? s * 0.62 : s]));
    layer(midFront, c.front, 423, frontTrees.map(([a, k, s]) => [a, k, k === 'c' ? s * 2.0 : s]));
  });
}
function house(x, px, py, s, i, seed) {
  const r = rng(seed);
  P.toneShape(x, P.rectPts(px - s * 0.5, py - s * 0.62, s, s * 0.62), { base: '#F6EBDD', dark: '#B9AEC9', light: '#FFFFFF', seed, rim: false, shadowW: 0.28, dabs: 0, texture: 0.25, highlights: 0 });
  const roof = i === 3 ? ['#F4F6FC', '#B4BCDC', '#FFFFFF'] : ['#D9583B', '#8E2E3A', '#F2875A'];
  P.toneShape(x, [[px - s * 0.64, py - s * 0.58], [px, py - s * 1.05], [px + s * 0.64, py - s * 0.58]], { base: roof[0], dark: roof[1], light: roof[2], seed: seed + 1, rim: false, shadowW: 0.3, dabs: 0, texture: 0.25, highlights: 0 });
  x.fillStyle = '#4A3A6A'; x.fillRect(px - s * 0.12, py - s * 0.34, s * 0.22, s * 0.34);
  if (r.chance(0.6)) { x.fillStyle = i === 3 ? '#FFD27A' : '#7A6A9A'; x.fillRect(px + s * 0.2, py - s * 0.48, s * 0.16, s * 0.14); }
}

// ---------- büyük ağaç (yakın, f=0.62): aynı gövde/dal, mevsime göre taç ----------
// sprite koordinatı: taban ortası çapa. Dönen sprite {cv,w,h,ax,ay}
const _treeSpr = new Map();
function bigTree(i, kind) {
  const key = 'bt' + kind + '_' + i;
  if (_treeSpr.has(key)) return _treeSpr.get(key);
  const Hh = kind === 1 ? 900 : 980, Ww = 760;
  const ax = Ww / 2, ay = Hh - 10;
  const cv = R.cached('s04:' + key, Ww, Hh, (x) => {
    const r = rng(431 + kind * 17);
    const bx = ax, by = ay;
    const trunkC = '#7A4A2E', trunkD = '#46261A', trunkL = '#A8703F';
    const th = Hh * 0.42, tw = 30;
    // dal iskeleti (özyinelemeli)
    const segs = [];
    const grow = (x0, y0, a, L, w, depth) => {
      const bend = r.range(-0.25, 0.25);
      const mid = [x0 + Math.cos(a + bend * 0.5) * L * 0.5, y0 + Math.sin(a + bend * 0.5) * L * 0.5];
      const end = [x0 + Math.cos(a + bend) * L, y0 + Math.sin(a + bend) * L];
      segs.push({ pts: [[x0, y0], mid, end], w, depth });
      if (depth >= 3) return;
      const n = depth === 0 ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const spread = depth === 0 ? (k - (n - 1) / 2) * 0.62 : (k === 0 ? -0.42 : 0.42);
        grow(end[0], end[1], a + bend + spread + r.range(-0.12, 0.12), L * r.range(0.62, 0.78), w * 0.62, depth + 1);
      }
    };
    const topY = by - th;
    grow(bx, topY + 8, -Math.PI / 2 - 0.62, 150, tw * 0.75, 1);
    grow(bx, topY + 4, -Math.PI / 2 + 0.05, 175, tw * 0.8, 1);
    grow(bx, topY + 12, -Math.PI / 2 + 0.66, 150, tw * 0.72, 1);
    grow(bx - 4, topY + 70, -Math.PI / 2 - 1.15, 105, tw * 0.5, 2);
    grow(bx + 4, topY + 60, -Math.PI / 2 + 1.12, 105, tw * 0.5, 2);
    const drawBranches = () => {
      for (const sg of segs) P.curveStroke(x, sg.pts, (u) => sg.w * (1 - u * 0.45), sg.depth > 2 ? '#6A402A' : trunkC, r.int(1, 1e9), { bristles: sg.w > 8 ? 2 : 0, detail: sg.w > 6 ? 1 : 0 });
    };
    // gövde
    const trunk = P.smoothPts([[bx - tw * 1.35, by], [bx - tw * 0.9, by - th * 0.4], [bx - tw * 0.62, by - th * 0.86], [bx - tw * 0.5, by - th - 10], [bx + tw * 0.5, by - th - 10], [bx + tw * 0.66, by - th * 0.8], [bx + tw * 0.95, by - th * 0.35], [bx + tw * 1.45, by]], true, 6);
    drawBranches();
    P.toneShape(x, trunk, { base: trunkC, dark: trunkD, light: trunkL, seed: 433 + kind, shadowW: 0.32, lightW: 0.18, texture: 0.5, strokeAng: Math.PI / 2, texAng: Math.PI / 2, dabs: 5, rimW: 4 });
    // kabuk çizgileri
    for (let k = 0; k < 6; k++) { const yy = by - r.range(20, th - 10), xx = bx + r.range(-tw * 0.5, tw * 0.5); P.stroke(x, xx, yy, xx + r.range(-2, 2), yy - r.range(30, 70), r.range(3, 5), r.chance(0.5) ? trunkD : trunkL, r.int(1, 1e9), { detail: 0, taper1: 0.4 }); }
    const c = CANOPY[i];
    const ccx = bx, ccy = topY - 190, crx = 300, cry = 230;
    if (c) {
      const list = [];
      const n = 9;
      for (let k = 0; k < n; k++) { const a = (k / n) * TAU + r.range(-0.2, 0.2); const rr = r.range(105, 140); list.push(P.blobPts(ccx + Math.cos(a) * crx * 0.62, ccy + Math.sin(a) * cry * 0.6, rr, rr * 0.88, kind * 50 + k, 0.14, 28)); }
      list.push(P.blobPts(ccx, ccy - 10, crx * 0.66, cry * 0.66, kind * 50 + 30, 0.1, 30));
      P.toneUnion(x, list, { base: c.b, dark: c.d, light: c.l, seed: 434 + kind, shadowW: 0.15, lightW: 0.07, strokeAng: -0.5, dabs: 26, rimW: 5 });
      // biçimi izleyen yaprak/çiçek darbeleri
      const nd = i === 0 ? 210 : 150;
      for (let k = 0; k < nd; k++) {
        const a = r.range(0, TAU), d = Math.sqrt(r.next()) * 0.95;
        const px = ccx + Math.cos(a) * crx * 0.95 * d, py = ccy + Math.sin(a) * cry * 0.95 * d;
        const lit = Math.cos(a - (-2.3)) * d > 0.05;
        const pal = c.dabs;
        let col = lit ? pal[r.int(0, 1)] : pal[r.int(2, 3)];
        if (r.chance(0.2)) col = pal[r.int(0, pal.length - 1)];
        if (i === 0) { // çiçek: yuvarlak beş benekli kümeler
          const s = r.range(6, 11);
          x.fillStyle = col; for (let q = 0; q < 5; q++) { const qa = q / 5 * TAU + a; x.beginPath(); x.arc(px + Math.cos(qa) * s * 0.55, py + Math.sin(qa) * s * 0.55, s * 0.5, 0, TAU); x.fill(); }
          x.fillStyle = r.chance(0.5) ? '#E9679A' : '#F6C83B'; x.beginPath(); x.arc(px, py, s * 0.22, 0, TAU); x.fill();
        } else {
          const ang = a + Math.PI / 2 + r.range(-0.5, 0.5), len = r.range(18, 34);
          P.stroke(x, px - Math.cos(ang) * len / 2, py - Math.sin(ang) * len / 2, px + Math.cos(ang) * len / 2, py + Math.sin(ang) * len / 2, r.range(9, 15), col, r.int(1, 1e9), { detail: 0.5, taper1: 0.5 });
        }
      }
      // taçtan görünen birkaç dal ucu
      for (const sg of segs.filter((s) => s.depth === 3).slice(0, 4)) { const e = sg.pts[2]; if (r.chance(0.5)) P.curveStroke(x, [sg.pts[1], [lerp(sg.pts[1][0], e[0], 0.6), lerp(sg.pts[1][1], e[1], 0.6)]], 5, '#5E3A26', r.int(1, 1e9), { bristles: 0, detail: 0 }); }
    } else {
      // kış: dalların üstünde kar
      for (const sg of segs) {
        const [a, m, e] = sg.pts;
        const line = [a, m, e].map(([px, py]) => [px, py - sg.w * 0.42]);
        if (Math.abs(e[1] - a[1]) > Math.abs(e[0] - a[0]) * 1.8 && sg.depth < 2) continue;
        P.curveStroke(x, line, (u) => sg.w * 0.42 * Math.sin(Math.PI * clamp(u * 0.9 + 0.08)), '#FFFFFF', r.int(1, 1e9), { bristles: 1, detail: 0.4 });
      }
      // dal uçlarında ince sürgünler
      for (const sg of segs.filter((s) => s.depth === 3)) {
        const e = sg.pts[2];
        for (let q = 0; q < 2; q++) { const a = Math.atan2(e[1] - sg.pts[1][1], e[0] - sg.pts[1][0]) + r.range(-0.6, 0.6), L = r.range(26, 46); P.curveStroke(x, [e, [e[0] + Math.cos(a) * L * 0.5, e[1] + Math.sin(a) * L * 0.5], [e[0] + Math.cos(a) * L, e[1] + Math.sin(a) * L]], (u) => 4 * (1 - u * 0.7), '#5E3A26', r.int(1, 1e9), { bristles: 0, detail: 0 }); }
      }
    }
  });
  const spr = { cv, w: Ww, h: Hh, ax, ay };
  _treeSpr.set(key, spr);
  return spr;
}

// ---------- zemin (f=1): çayır şeridi, yol, ön çimenlik ----------
const GR = { x0: -120, w: 3300, y0: 1220, h: 700 };
const PATH_Y0 = 1338, PATH_Y1 = 1452;
const meadowTop = (wx) => 1248 + 6 * Math.sin(wx * 0.013 + 0.5) + 4 * Math.sin(wx * 0.041);
function groundCanvas(i) {
  const g = GROUND[i], pc = PATHC[i];
  return R.cached('s04:gr' + i, GR.w, GR.h, (x) => {
    x.translate(-GR.x0, -GR.y0);
    const r = rng(441);
    const box = { x0: GR.x0, y0: GR.y0, x1: GR.x0 + GR.w, y1: GR.y0 + GR.h, w: GR.w, h: GR.h };
    // çayır (yolun ardı)
    const top = []; for (let k = 0; k <= 200; k++) { const wx = GR.x0 + GR.w * k / 200; top.push([wx, meadowTop(wx)]); }
    const mpoly = top.concat([[GR.x0 + GR.w, PATH_Y0 + 10], [GR.x0, PATH_Y0 + 10]]);
    x.save(); x.strokeStyle = rgba(P.UNDERPAINT, 0.8); x.lineWidth = 5; x.setLineDash([80, 60, 30, 120]); x.translate(1, -2); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(P.pathOf(mpoly)); x.fillStyle = g.meadow[1]; x.fillRect(GR.x0, GR.y0, GR.w, GR.h); x.restore();
    P.bandFill(x, mpoly, { x0: GR.x0, y0: 1236, x1: GR.x0 + GR.w, y1: PATH_Y0 + 12, w: GR.w, h: PATH_Y0 - 1224 }, g.meadow, { seed: 442, wMin: 12, wMax: 20, lMin: 60, lMax: 180, stops: [0, 0.45, 1] });
    // ön çimenlik
    const vpoly = [[GR.x0, PATH_Y1 - 6], [GR.x0 + GR.w, PATH_Y1 - 6], [GR.x0 + GR.w, GR.y0 + GR.h], [GR.x0, GR.y0 + GR.h]];
    x.save(); x.clip(P.pathOf(vpoly)); x.fillStyle = g.g[1]; x.fillRect(GR.x0, PATH_Y1 - 10, GR.w, GR.h); x.restore();
    P.bandFill(x, vpoly, { x0: GR.x0, y0: PATH_Y1 - 6, x1: GR.x0 + GR.w, y1: GR.y0 + GR.h, w: GR.w, h: GR.y0 + GR.h - PATH_Y1 }, g.g, { seed: 443, wMin: 18, wMax: 34, lMin: 80, lMax: 260, stops: [0, 0.35, 1] });
    // yol
    const ptop = [], pbot = [];
    for (let k = 0; k <= 200; k++) { const wx = GR.x0 + GR.w * k / 200; ptop.push([wx, PATH_Y0 + 4 * Math.sin(wx * 0.021 + 1)]); pbot.push([wx, PATH_Y1 + 5 * Math.sin(wx * 0.017 + 2.2)]); }
    const ppoly = ptop.concat(pbot.slice().reverse());
    x.save(); x.strokeStyle = rgba(P.UNDERPAINT, 0.85); x.lineWidth = 5; x.setLineDash([110, 50, 40, 90]); x.stroke(P.pathOf(pbot, false)); x.restore();
    x.save(); x.clip(P.pathOf(ppoly)); x.fillStyle = pc[1]; x.fillRect(GR.x0, PATH_Y0 - 10, GR.w, PATH_Y1 - PATH_Y0 + 20); x.restore();
    P.bandFill(x, ppoly, { x0: GR.x0, y0: PATH_Y0 - 8, x1: GR.x0 + GR.w, y1: PATH_Y1 + 8, w: GR.w, h: PATH_Y1 - PATH_Y0 + 16 }, pc, { seed: 444, wMin: 11, wMax: 19, lMin: 70, lMax: 220, stops: [0, 0.5, 1] });
    // yol taşları / tekerlek izi
    for (let k = 0; k < 140; k++) { const px = GR.x0 + r.range(0, GR.w), py = r.range(PATH_Y0 + 10, PATH_Y1 - 8); x.fillStyle = rgba(r.chance(0.5) ? shade(pc[2], -0.08) : '#FFF6E0', i === 3 ? 0.5 : 0.7); x.beginPath(); x.ellipse(px, py, r.range(2, 5), r.range(1.4, 3), 0, 0, TAU); x.fill(); }
    if (i === 3) { // kar yolu: kenarlarda soğuk gölge, üst kenarda kar sırtı
      for (let wx = GR.x0; wx < GR.x0 + GR.w; wx += r.range(90, 180)) {
        const l = r.range(110, 220);
        P.stroke(x, wx, PATH_Y0 + 6 + 4 * Math.sin(wx * 0.021 + 1), wx + l, PATH_Y0 + 6 + 4 * Math.sin((wx + l) * 0.021 + 1), r.range(9, 14), rgba('#A3ACD6', 0.6), r.int(1, 1e9), { detail: 0.3 });
        P.stroke(x, wx + 30, PATH_Y1 - 6 + 5 * Math.sin(wx * 0.017 + 2.2), wx + 30 + l, PATH_Y1 - 6 + 5 * Math.sin((wx + l) * 0.017 + 2.2), r.range(7, 11), rgba('#B4BCE0', 0.55), r.int(1, 1e9), { detail: 0.3 });
      }
    }
    if (i === 3) for (const yy of [PATH_Y0 + 34, PATH_Y1 - 30]) { // karda iki iz
      for (let wx = GR.x0; wx < GR.x0 + GR.w; wx += r.range(120, 260)) P.stroke(x, wx, yy + r.range(-3, 3), wx + r.range(100, 240), yy + r.range(-3, 3), r.range(7, 11), rgba('#A8B0D4', 0.55), r.int(1, 1e9), { detail: 0.3 });
    }
    // yol kenarı: yolun alt kenarına sarkan çimen darbeleri
    const edgeCol = i === 3 ? ['#FFFFFF', '#E3E8F4'] : [g.g[0], g.g[1]];
    for (let k = 0; k < 360; k++) { const wx = GR.x0 + r.range(0, GR.w), yy = PATH_Y1 + 5 * Math.sin(wx * 0.017 + 2.2) + r.range(-6, 4); const hh = r.range(10, 24), a = -Math.PI / 2 + r.range(-0.5, 0.5); P.stroke(x, wx, yy + 6, wx + Math.cos(a) * hh, yy + 6 + Math.sin(a) * hh, r.range(3, 6), r.pick(edgeCol), r.int(1, 1e9), { detail: 0, taper1: 0.3 }); }
    for (let k = 0; k < 300; k++) { const wx = GR.x0 + r.range(0, GR.w), yy = PATH_Y0 + 4 * Math.sin(wx * 0.021 + 1) + r.range(-2, 6); const hh = r.range(8, 18), a = -Math.PI / 2 + r.range(-0.5, 0.5); P.stroke(x, wx, yy, wx + Math.cos(a) * hh, yy + Math.sin(a) * hh, r.range(3, 5), r.pick(i === 3 ? ['#FFFFFF', '#DDE3F2'] : g.meadow), r.int(1, 1e9), { detail: 0, taper1: 0.3 }); }
    // mevsim ayrıntıları
    const rr = rng(445);
    if (i === 0 || i === 1) {
      // çiçek benekleri (çayır ve ön çimenlik)
      for (let k = 0; k < 900; k++) {
        const wx = GR.x0 + rr.range(0, GR.w), front = rr.chance(0.7);
        const yy = front ? PATH_Y1 + 14 + Math.pow(rr.next(), 0.8) * (GR.y0 + GR.h - PATH_Y1 - 14) : rr.range(1258, PATH_Y0 - 4);
        const depth = clamp((yy - 1250) / 670);
        const pal = i === 0 ? ['#FFFFFF', '#FFFFFF', '#F7D54A', '#F59AC0', '#E86A8E', '#C9B8F0'] : ['#F7D54A', '#F7D54A', '#FFFFFF', '#F2A33A', '#E8503A'];
        const s = lerp(2.2, 7.5, depth) * rr.range(0.7, 1.2);
        x.fillStyle = rr.pick(pal); x.beginPath(); x.ellipse(wx, yy, s * 1.3, s, rr.range(-0.3, 0.3), 0, TAU); x.fill();
      }
      for (let k = 0; k < 46; k++) {
        const wx = GR.x0 + rr.range(0, GR.w), yy = rr.range(PATH_Y1 + 70, 1880), depth = clamp((yy - 1450) / 470);
        if (i === 0) R.flower(x, wx, yy, lerp(10, 20, depth), rr.int(1, 99), { color: rr.pick(['#FBF6FF', '#FFE4EE', '#FBF6FF']), inner: '#F07BB2' });
        else R.flower(x, wx, yy, lerp(9, 18, depth), rr.int(1, 99), { petals: 5, color: rr.pick(['#F7D54A', '#FBE27A']), dark: '#C99A2E', inner: '#E8A23A' });
      }
    } else if (i === 2) {
      // yere düşmüş yapraklar
      for (let k = 0; k < 700; k++) {
        const wx = GR.x0 + rr.range(0, GR.w), onPath = rr.chance(0.3);
        const yy = onPath ? rr.range(PATH_Y0 + 6, PATH_Y1 - 4) : rr.chance(0.25) ? rr.range(1256, PATH_Y0) : PATH_Y1 + 10 + Math.pow(rr.next(), 0.8) * 450;
        const depth = clamp((yy - 1250) / 670), s = lerp(4, 13, depth) * rr.range(0.7, 1.3);
        leafShape(x, wx, yy, s, rr.range(0, TAU), rr.pick(['#E5822E', '#D2452E', '#F2C043', '#B8562A', '#F2A33A']), 1);
      }
    } else if (i === 3) {
      // karın içinden çıkan kuru ot uçları ve mavi gölgeler
      for (let k = 0; k < 260; k++) {
        const wx = GR.x0 + rr.range(0, GR.w), yy = rr.chance(0.7) ? rr.range(PATH_Y1 + 30, 1880) : rr.range(1262, PATH_Y0 - 4), depth = clamp((yy - 1250) / 670);
        const hh = lerp(6, 26, depth) * rr.range(0.6, 1.2);
        for (let q = 0; q < 3; q++) { const a = -Math.PI / 2 + rr.range(-0.5, 0.5); P.stroke(x, wx + q * 3, yy, wx + q * 3 + Math.cos(a) * hh, yy + Math.sin(a) * hh, lerp(1.5, 3.5, depth), rr.pick(['#A08A5A', '#8A7A56', '#B9A06A']), rr.int(1, 1e9), { detail: 0, taper1: 0.3 }); }
      }
      for (let k = 0; k < 120; k++) { const wx = GR.x0 + rr.range(0, GR.w), yy = rr.range(PATH_Y1 + 20, 1900); P.stroke(x, wx, yy, wx + rr.range(60, 180), yy + rr.range(-3, 3), rr.range(6, 12), rgba('#AEB7DA', 0.45), rr.int(1, 1e9), { detail: 0.3 }); }
    }
  });
}
function leafShape(x, px, py, s, a, col, spin = 1) {
  const ca = Math.cos(a), sa = Math.sin(a), k = Math.max(0.15, Math.abs(spin));
  const pt = (u, v) => [px + ca * u * s - sa * v * s * 0.45 * k, py + sa * u * s + ca * v * s * 0.45 * k];
  const pts = [pt(-1, 0), pt(-0.4, -0.9), pt(0.4, -0.85), pt(1, 0), pt(0.4, 0.85), pt(-0.4, 0.9)];
  x.fillStyle = col; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
  for (let q = 1; q <= 6; q++) { const p0 = pts[q % 6], pm = pts[q - 1]; x.quadraticCurveTo(pm[0], pm[1], (pm[0] + p0[0]) / 2, (pm[1] + p0[1]) / 2); }
  x.closePath(); x.fill();
  // gölge yarısı
  x.fillStyle = rgba(shade(col, -0.18, 0.05), 0.7);
  const h0 = pt(-1, 0), h1 = pt(1, 0), b = pt(0, 0.85);
  x.beginPath(); x.moveTo(h0[0], h0[1]); x.quadraticCurveTo(b[0], b[1], h1[0], h1[1]); x.closePath(); x.fill();
  if (s > 6) { x.strokeStyle = rgba(shade(col, -0.25), 0.8); x.lineWidth = Math.max(1, s * 0.08); x.beginPath(); x.moveTo(h0[0], h0[1]); x.lineTo(h1[0], h1[1]); x.stroke(); }
}

// ---------- ön plan (f=1.35): uzun otlar, çiçekler (alt kenarda) ----------
const FG = { x0: -200, w: 3900, y0: 1580, h: 340 };
function fgCanvas(i) {
  const g = GROUND[i];
  return R.cached('s04:fg' + i, FG.w, FG.h, (x) => {
    x.translate(-FG.x0, -FG.y0);
    const r = rng(451);
    for (let wx = FG.x0 + 40; wx < FG.x0 + FG.w - 40; wx += r.range(120, 260)) {
      const by = 1925 + r.range(-10, 20), s = r.range(150, 250);
      const n = r.int(9, 15);
      for (let k = 0; k < n; k++) {
        const bx = wx + r.range(-s * 0.4, s * 0.4), hh = s * r.range(0.45, 1.0), lean = r.range(-0.4, 0.4);
        const line = []; for (let q = 0; q <= 7; q++) { const u = q / 7; line.push([bx + Math.sin(lean) * hh * u * u, by - hh * u]); }
        const cols = i === 3 ? ['#9A8A62', '#B9A66E', '#7E7050'] : i === 2 ? ['#C9963E', '#A8702E', '#E2B65A'] : i === 1 ? ['#2F8A45', '#3E9B4F', '#6DBA4C'] : ['#4FA850', '#7CC350', '#A2D84C'];
        P.curveStroke(x, line, (u) => s * 0.05 * (1 - u * 0.85), r.pick(cols), r.int(1, 1e9), { bristles: 1 });
        if (i === 3 && r.chance(0.35)) { const q = line[r.int(3, 6)]; x.fillStyle = '#FFFFFF'; x.beginPath(); x.ellipse(q[0], q[1], s * 0.03, s * 0.016, lean, 0, TAU); x.fill(); }
      }
      if (i < 3 && r.chance(0.7)) {
        const fx = wx + r.range(-s * 0.2, s * 0.2), fy = by - s * r.range(0.6, 0.95);
        P.curveStroke(x, [[fx, by], [fx + 3, (fy + by) / 2], [fx, fy]], s * 0.022, i === 2 ? '#8E6A32' : '#2E7A3E', r.int(1, 1e9), { bristles: 1 });
        if (i === 0) R.flower(x, fx, fy, s * 0.12, r.int(1, 99), { color: r.pick(['#FBF6FF', '#FFE4EE']), tilt: r.range(-0.3, 0.3) });
        else if (i === 1) R.flower(x, fx, fy, s * 0.12, r.int(1, 99), { petals: 5, color: '#EE4A32', dark: '#A8203A', inner: '#7A1630', tilt: r.range(-0.3, 0.3) });
        else { x.fillStyle = '#7A4A2A'; x.beginPath(); x.ellipse(fx, fy, s * 0.04, s * 0.07, 0, 0, TAU); x.fill(); }
      }
      if (i === 3) { // kar öbeği
        P.toneShape(x, P.blobPts(wx, by - 10, s * 0.5, s * 0.16, Math.round(wx), 0.12, 24), { base: '#F8FAFF', dark: '#B8C0E0', light: '#FFFFFF', rim: false, seed: Math.round(wx) % 97, shadowW: 0.2, texture: 0.3, dabs: 3 });
      }
    }
  });
}

// ---------- parçacıklar (ekran uzayı) ----------
// bahar yaprakçıkları: rüzgârla sağdan sola, savrularak
function petals(ctx, t, a, o = {}) {
  if (a <= 0) return;
  const r = rng(o.seed ?? 461), n = o.n ?? 40;
  for (let i = 0; i < n; i++) {
    const front = r.chance(o.front ?? 0.3);
    const sp = r.range(160, 320) * (front ? 1.6 : 1), fall = r.range(40, 110), x0 = r.range(0, 1600), y0 = r.range(-200, 1700), ph = r.range(0, TAU), s = r.range(5, 9) * (front ? 1.8 : 1);
    if (!!o.onlyFront !== front) continue;
    const tt = t - 9.0;
    // görünürlük: her parçacığın kendi eşiği var; yarı saydam (grileşen) hayalet yerine tek tek küçülüp kaybolur
    const vis = clamp((a - r.range(0, 0.72)) / 0.28);
    if (vis <= 0) continue;
    const x = ((x0 - sp * tt) % 1700 + 1700) % 1700 - 300 + Math.sin(tt * 2.1 + ph) * 26;
    const y = ((y0 + fall * tt) % 2100 + 2100) % 2100 - 200 + Math.sin(tt * 1.7 + ph * 2) * 30;
    const spin = Math.sin(tt * r.range(3, 6) + ph);
    const col = r.pick(['#FFFFFF', '#FFE2EC', '#F7B6CF', '#F48CB4']);
    const sz = s * vis;
    ctx.save(); ctx.globalAlpha = front ? 0.97 : 0.92; ctx.translate(x, y); ctx.rotate(ph + tt * r.range(-2, 2));
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 0.6 * Math.max(0.2, Math.abs(spin)), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba('#E9679A', 0.6); ctx.beginPath(); ctx.ellipse(-sz * 0.5, 0, sz * 0.35, sz * 0.25 * Math.max(0.2, Math.abs(spin)), 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
// güz yaprakları: sağdan esen rüzgârla takla atarak sola
function leaves(ctx, t, a, o = {}) {
  if (a <= 0) return;
  const r = rng(o.seed ?? 471), n = o.n ?? 46;
  for (let i = 0; i < n; i++) {
    const front = r.chance(o.front ?? 0.3);
    const sp = r.range(260, 520) * (front ? 1.5 : 1), fall = r.range(60, 160), x0 = r.range(0, 1700), y0 = r.range(-100, 1650), ph = r.range(0, TAU), s = r.range(9, 15) * (front ? 1.9 : 1);
    if (!!o.onlyFront !== front) continue;
    const tt = t - 9.0;
    const vis = clamp((a - r.range(0, 0.72)) / 0.28);
    if (vis <= 0) continue;
    const x = ((x0 - sp * tt) % 1800 + 1800) % 1800 - 350 + Math.sin(tt * 2.6 + ph) * 34;
    const y = ((y0 + fall * tt) % 2100 + 2100) % 2100 - 150 + Math.sin(tt * 2.2 + ph * 2) * 46;
    const spin = Math.sin(tt * r.range(4, 8) + ph);
    const col = r.pick(['#E5822E', '#D2452E', '#F2C043', '#C9502A', '#F2A33A']);
    leafShape(ctx, x, y, s * vis, ph + tt * r.range(-4, 4), col, spin);
  }
}
// kar taneleri: yavaş düşer, rüzgârla sola kayar
function snow(ctx, t, a, o = {}) {
  if (a <= 0) return;
  const r = rng(o.seed ?? 481), n = o.n ?? 140;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const front = r.chance(o.front ?? 0.25);
    const sp = r.range(60, 140) * (front ? 1.7 : 1), fall = r.range(90, 170) * (front ? 1.6 : 1), x0 = r.range(0, 1400), y0 = r.range(0, 2100), ph = r.range(0, TAU), s = r.range(2.4, 5.6) * (front ? 1.6 : 1);
    if (!!o.onlyFront !== front) continue;
    const tt = t - 9.0;
    const vis = clamp((a - r.range(0, 0.72)) / 0.28);
    if (vis <= 0) continue;
    const x = ((x0 - sp * tt) % 1300 + 1300) % 1300 - 110 + Math.sin(tt * 1.6 + ph) * 18;
    const y = ((y0 + fall * tt) % 2100 + 2100) % 2100 - 90;
    const ss = s * vis;
    ctx.globalAlpha = front ? 0.97 : 0.93;
    ctx.fillStyle = '#C9D0EA'; ctx.beginPath(); ctx.arc(x + ss * 0.18, y + ss * 0.2, ss, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x, y, ss * 0.92, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

module.exports = {
  SKY, CANOPY, frontPath, clipScreen, skyCanvas, SKY_H, FAR, farCanvas, MID, midCanvas, bigTree, GR, groundCanvas, PATH_Y0, PATH_Y1,
  FG, fgCanvas, petals, leaves, snow, leafShape,
};
