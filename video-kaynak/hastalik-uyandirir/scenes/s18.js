// S18 — "sermaye-i ömrünü bâd-i heva boş yere sarf ettiriyor." (74.80–79.70)
// Ortada büyük kum saati (R.hourglass, s15'teki ile aynı) bir çayır tümseğinde. 75.28 "sermaye-i ömrünü": kum saati
// parlar, altın kum akar. 76.86 "bâd-i heva": üst haznenin camında bir çatlak açılır; soldan esen rüzgâr altın kumu
// çatlaktan dışarı savurur; kum taneleri ve altın sikkeler sağa doğru uçuşup parıltıya dönüşerek kaybolur. 77.74–79.04
// "boş yere sarf ettiriyor": kum seviyesi hızla düşer. Aşağıda küçük adam bir kelebeğin peşinde koşar, farkında değil.
// İki anlam üst üste çıkar (75.28, 76.86): alt bant (y 1290–1560) sakin çayır.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const Wk = require('./_s16_walk');
const L = require('./_s16_lib');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, seg, deg } = C;
const { W, H } = C;

const HG = { x: 540, y: 1052, s: 860 };      // kum saati tabanı ve boyu
const T = { serm: 75.28, omr: 76.02, bad: 76.86, bos: 77.74, sarf: 78.28 };
const TCRACK = 76.84;
const sm = L.sm;
const LIGHT = -2.3;

// ---------- kum saati geometrisi (props.js ile aynı) ----------
const Hh = HG.s, Wd = HG.s * 0.62;
function upperBulb() {
  const sgn = 1;
  return P.smoothPts([[0, -Hh * 0.5], [Wd * 0.36 * 0.35, -Hh * 0.5 - sgn * Hh * 0.08], [Wd * 0.42, -Hh * 0.5 - sgn * Hh * 0.3], [Wd * 0.38, -Hh * 0.5 - sgn * Hh * 0.42], [-Wd * 0.38, -Hh * 0.5 - sgn * Hh * 0.42], [-Wd * 0.42, -Hh * 0.5 - sgn * Hh * 0.3], [-Wd * 0.36 * 0.35, -Hh * 0.5 - sgn * Hh * 0.08]], true, 8);
}
// sağ duvarda verilen yükseklikteki nokta (yerel)
function wallAt(yy) {
  const ub = upperBulb();
  let best = null;
  for (let i = 0; i < ub.length; i++) {
    const a = ub[i], b = ub[(i + 1) % ub.length];
    if (a[0] <= 0 && b[0] <= 0) continue;
    if ((a[1] - yy) * (b[1] - yy) <= 0 && a[1] !== b[1]) { const k = (yy - a[1]) / (b[1] - a[1]); const x = lerp(a[0], b[0], k); if (!best || x > best[0]) best = [x, yy]; }
  }
  return best;
}
const CRACK_L = wallAt(-Hh * 0.64);                 // yerel
const CRACK = [HG.x + CRACK_L[0], HG.y + CRACK_L[1]]; // dünya
// kum oranı: çatlağın seviyesi (üst kum yüzeyi çatlağa inince sızıntı durur)
const TOP_AT_CRACK = (0.64 - 0.56) / 0.32;
function topOf(t) {
  return 0.76 - 0.014 * (t - 74.5) - 0.6 * E.inOutSine(seg(t, 76.95, 79.25));
}
function botOf(t) { return 0.24 + 0.014 * (t - 74.5) + 0.07 * E.inOutSine(seg(t, 76.95, 79.25)); }
function leakOf(t) {
  const on = sm((t - 76.88) / 0.12);
  const off = 1 - sm((TOP_AT_CRACK + 0.06 - topOf(t)) / 0.08);
  return on * clamp(off);
}

// ---------- kamera ----------
function camOf(t) {
  const push = E.inOutSine(seg(t, 74.6, 76.8));
  const back = E.inOutSine(seg(t, 77.05, 78.6));
  const z = 1 + 0.06 * push * (1 - back);
  const [bx, by] = R.breathe(t, 3, 18);
  let sx = 0, sy = 0;
  const sh = seg(t, TCRACK, TCRACK + 0.35);
  if (sh > 0 && sh < 1) { const a = (1 - sh) * 7; sx = Math.sin(t * 90) * a; sy = Math.cos(t * 77) * a * 0.6; }
  return { x: W / 2 + 10 * push * (1 - back) + bx + sx, y: 960 + 22 * push * (1 - back) + by + sy, z };
}

// ---------- katmanlar ----------
function bgLayer() {
  return R.cached('s18:bg', W + 240, H + 260, (x) => {
    const w = W + 240, h = H + 260, ox = 120, oy = 130;
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, w, h);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: w, y1: oy + 1080, w, h: oy + 1080 }, ['#4E4498', '#7A54A2', '#B46A9E', '#E78E86', '#F6B47E', '#FAD596'],
      { seed: 1801, stops: [0, 0.2, 0.42, 0.62, 0.82, 1], wMin: 22, wMax: 42, lMin: 90, lMax: 280, mixJitter: 0.05 });
    const r = rng(1802);
    for (let i = 0; i < 20; i++) { const sx = r.range(0, w), sy = r.range(0, 360), s = r.range(1.5, 3.2); x.fillStyle = rgba('#FFF2DA', r.range(0.4, 0.85)); x.beginPath(); x.arc(sx, sy, s, 0, TAU); x.fill(); }
    // uzak tepeler
    const top = (u) => oy + 995 - 26 * Math.max(0, Math.sin(u * 0.005 + 0.4)) ** 1.4 - 12 * Math.sin(u * 0.017 + 1.3);
    const tl = []; for (let i = 0; i <= 120; i++) { const u = w * i / 120; tl.push([u, top(u)]); }
    const poly = tl.concat([[w, h], [0, h]]);
    x.save(); x.strokeStyle = rgba(P.UNDERPAINT, 0.5); x.lineWidth = 4; x.setLineDash([80, 150, 30, 200]); x.stroke(P.pathOf(tl, false)); x.restore();
    x.fillStyle = '#9A7AA6'; x.fill(P.pathOf(poly));
    P.bandFill(x, poly, { x0: 0, y0: oy + 980, x1: w, y1: oy + 1140, w, h: 160 }, ['#C49AB0', '#9A7AA6', '#7E6A9E'], { seed: 1803, wMin: 12, wMax: 22, lMin: 60, lMax: 180 });
    for (let i = 0; i < 16; i++) { const u = r.range(0, w); R.cypress(x, u, top(u) + 6, r.range(30, 52), r.int(1, 99), { base: '#6A5A8E', dark: '#4A3E72', light: '#B48AA6' }); }
    // çayır
    const mt = (u) => oy + 1040 + 8 * Math.sin(u * 0.008 + 1);
    const ml = []; for (let i = 0; i <= 120; i++) { const u = w * i / 120; ml.push([u, mt(u)]); }
    const mp = ml.concat([[w, h], [0, h]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 5; x.setLineDash([140, 60, 50, 120]); x.stroke(P.pathOf(ml, false)); x.restore();
    x.fillStyle = '#7AA85E'; x.fill(P.pathOf(mp));
    P.bandFill(x, mp, { x0: 0, y0: oy + 1060, x1: w, y1: h, w, h: h - oy - 1060 }, ['#D2C866', '#A8BE5E', '#7AA85E', '#5E965A', '#4A8254', '#3A6E50'], { seed: 1804, wMin: 18, wMax: 34, lMin: 80, lMax: 260, stops: [0, 0.08, 0.25, 0.48, 0.72, 1], angle: 0.015 });
    // koşu yolu (ince açık patika)
    const pt = (u) => oy + 1250 + 4 * Math.sin(u * 0.01), pb = (u) => oy + 1306 + 4 * Math.sin(u * 0.012 + 2);
    const ptl = [], pbl = []; for (let i = 0; i <= 120; i++) { const u = w * i / 120; ptl.push([u, pt(u)]); pbl.push([u, pb(u)]); }
    const pp = ptl.concat(pbl.reverse());
    x.fillStyle = '#E8C88A'; x.fill(P.pathOf(pp));
    P.bandFill(x, pp, { x0: 0, y0: oy + 1225, x1: w, y1: oy + 1305, w, h: 80 }, ['#F7E2B0', '#EBC98E', '#D8AE78'], { seed: 1805, wMin: 8, wMax: 14, lMin: 40, lMax: 140 });
    for (let i = 0; i < 260; i++) {
      const u = r.range(0, w), yy = r.chance(0.5) ? r.range(oy + 1080, oy + 1225) : r.range(oy + 1300, oy + 1320);
      P.stroke(x, u, yy + 6, u + r.range(-5, 5), yy - r.range(8, 18), r.range(3, 5), r.pick(['#C2D86A', '#9EC860', '#6DA858']), r.int(1, 1e9), { detail: 0, taper1: 0.3 });
    }
    for (let i = 0; i < 180; i++) {
      const u = r.range(0, w), yy = r.chance(0.6) ? r.range(oy + 1090, oy + 1220) : r.range(oy + 1640, h);
      x.fillStyle = rgba(r.pick(['#FFF6E2', '#F7D54A', '#F59AC0', '#FFFFFF']), 0.85); x.beginPath(); x.ellipse(u, yy, r.range(3, 6), r.range(2.2, 4.2), 0, 0, TAU); x.fill();
    }
  });
}
function moundSpr() {
  return L.sprite('s18mound', 1000, 220, 500, 150, (x) => {
    const pts = P.smoothPts([[60, 160], [200, 110], [380, 86], [620, 86], [800, 110], [940, 160], [940, 190], [60, 190]], true, 6);
    P.toneShape(x, pts, { base: '#86B45E', dark: '#4E8A56', light: '#D2E07A', seed: 1806, shadowW: 0.16, lightW: 0.1, dabs: 14, strokeAng: 0.02, texAng: 0 });
    const r = rng(1807);
    for (let i = 0; i < 70; i++) { const u = r.range(120, 880), yy = 104 + Math.abs(u - 500) * 0.12 + r.range(0, 60); P.stroke(x, u, yy + 6, u + r.range(-5, 5), yy - r.range(8, 20), r.range(3, 5), r.pick(['#C2E06A', '#9ED060', '#6DB058']), r.int(1, 1e9), { detail: 0, taper1: 0.3 }); }
  });
}
function coinSpr() { return L.sprite('s18coin', 100, 100, 50, 50, (x) => R.coin(x, 50, 50, 40, { seed: 3 })); }

// ---------- çatlak ----------
const CRACK_LINES = (() => {
  const r = rng(1811), out = [];
  const base = Math.atan2(0, -1); // içe doğru (sola)
  for (let i = 0; i < 6; i++) {
    const a0 = base + r.range(-1.2, 1.2), pts = [[0, 0]];
    let a = a0, x = 0, y = 0;
    const n = r.int(3, 5), len = r.range(28, 70);
    for (let k = 0; k < n; k++) { a += r.range(-0.6, 0.6); x += Math.cos(a) * len / n; y += Math.sin(a) * len / n; pts.push([x, y]); }
    out.push({ pts, d: r.range(0, 0.6) });
  }
  return out;
})();
function drawCrack(ctx, k) {
  if (k <= 0) return;
  const [cx, cy] = CRACK;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const c of CRACK_LINES) {
    const kk = clamp((k - c.d * 0.5) / 0.5);
    if (kk <= 0) continue;
    const n = c.pts.length - 1, m = kk * n;
    const path = [[cx, cy]];
    for (let i = 1; i <= Math.ceil(m); i++) { const a = c.pts[i - 1], b = c.pts[i], f = Math.min(1, m - (i - 1)); path.push([cx + lerp(a[0], b[0], f), cy + lerp(a[1], b[1], f)]); }
    ctx.strokeStyle = rgba('#3A2A4A', 0.55); ctx.lineWidth = 4.5; ctx.beginPath(); path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.2; ctx.beginPath(); path.forEach(([x, y], i) => (i ? ctx.lineTo(x - 1, y - 1) : ctx.moveTo(x - 1, y - 1))); ctx.stroke();
  }
  // delik
  const hk = clamp((k - 0.3) / 0.7);
  if (hk > 0) {
    const hole = P.blobPts(cx - 3, cy, 9 * hk, 13 * hk, 1812, 0.3, 14);
    ctx.fillStyle = rgba('#2A1E3A', 0.7); ctx.fill(P.pathOf(hole));
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.stroke(P.pathOf(hole));
  }
  ctx.restore();
}

// ---------- savrulan kum ve sikkeler ----------
// her parçacık: doğum anı, hız, rüzgâr ivmesi, kaldırma, salınım
const GR = (() => {
  const r = rng(1821), out = [];
  const rate = 110, t0 = 76.9, t1 = 79.4;
  const n = Math.round((t1 - t0) * rate);
  for (let i = 0; i < n; i++) out.push({ tb: t0 + i / rate + r.range(0, 0.008), vx: r.range(300, 520), ax: r.range(260, 480), vy: r.range(-170, 60), ay: r.range(-150, 60), wob: r.range(8, 30), ph: r.range(0, TAU), sz: r.range(4, 10), life: r.range(1.1, 1.7), col: r.pick(['#E8B23A', '#FFE08A', '#F2C04A', '#C98E2A', '#FFF2B0']) });
  return out;
})();
const CN = (() => {
  const r = rng(1831), out = [];
  for (let tb = 76.96; tb < 78.95; tb += r.range(0.09, 0.15)) out.push({ tb, vx: r.range(250, 380), ax: r.range(180, 320), vy: r.range(-240, -50), ay: r.range(-60, 120), wob: r.range(12, 30), ph: r.range(0, TAU), rad: r.range(22, 38), spin: r.range(5, 9) * r.sign(), life: r.range(1.2, 1.7), rot: r.range(-0.4, 0.4) });
  return out;
})();
function partPos(p, a) {
  return [CRACK[0] + 6 + p.vx * a + 0.5 * p.ax * a * a, CRACK[1] + p.vy * a + 0.5 * p.ay * a * a + Math.sin(a * 3.2 + p.ph) * p.wob * Math.min(1, a * 2)];
}
function drawGrains(ctx, t) {
  const lk = leakOf;
  ctx.save();
  for (const p of GR) {
    const a = t - p.tb;
    if (a <= 0 || a > p.life) continue;
    if (lk(p.tb) < 0.05) continue;
    const [x, y] = partPos(p, a);
    const fade = 1 - sm((a - p.life * 0.7) / (p.life * 0.3));
    const al = fade * Math.min(1, a * 8) * lk(p.tb);
    if (al <= 0.01) continue;
    const vx = p.vx + p.ax * a, vy = p.vy + p.ay * a, sp = Math.hypot(vx, vy);
    const len = p.sz * (1 + sp / 220);
    ctx.globalAlpha = al;
    ctx.strokeStyle = p.col; ctx.lineWidth = p.sz; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - vx / sp * len, y - vy / sp * len); ctx.lineTo(x, y); ctx.stroke();
    if (fade < 0.6 && ((p.ph * 10) | 0) % 4 === 0) L.star4(ctx, x, y, p.sz * 2.4 * Math.sin(Math.PI * fade / 0.6), al, '#FFF6D6');
  }
  ctx.restore();
}
function drawCoins(ctx, t) {
  for (const p of CN) {
    const a = t - p.tb;
    if (a <= 0 || a > p.life + 0.4) continue;
    if (leakOf(p.tb) < 0.2) continue;
    const [x, y] = partPos(p, Math.min(a, p.life));
    if (a < p.life) {
      const grow = E.outBack(clamp(a / 0.25), 1.6);
      const shrink = 1 - sm((a - p.life * 0.75) / (p.life * 0.25));
      const sq = Math.cos(a * p.spin + p.ph);
      L.put(ctx, coinSpr(), x, y, (p.rad / 40) * grow * (0.3 + 0.7 * shrink), p.rot + a * 0.4, Math.min(1, shrink * 1.4), Math.max(0.1, Math.abs(sq)));
      if (Math.abs(sq) > 0.93 && shrink > 0.5) L.star4(ctx, x - p.rad * 0.3, y - p.rad * 0.3, p.rad * 0.7, (Math.abs(sq) - 0.93) * 14, '#FFFFFF');
    } else {
      // parıltıya dönüşüp kaybolur
      const k = (a - p.life) / 0.4;
      for (let i = 0; i < 4; i++) { const an = i * 1.57 + p.ph, d = p.rad * (0.4 + k * 1.4); L.star4(ctx, x + Math.cos(an) * d, y + Math.sin(an) * d, p.rad * 0.55 * (1 - k), 1 - k, i % 2 ? '#FFE08A' : '#FFF6D6'); }
    }
    ctx.globalAlpha = 1;
  }
}
// çatlaktan fışkıran kum şeridi
function drawJet(ctx, t) {
  const lk = leakOf(t);
  if (lk <= 0.01) return;
  const [cx, cy] = CRACK;
  const line = [];
  const Lj = 250 * lk;
  for (let k = 0; k <= 14; k++) { const u = k / 14; line.push([cx + 2 + u * Lj, cy + 26 * u * u - 30 * u * (1 - u) + Math.sin(u * 6 - t * 14) * 6 * u]); }
  ctx.save(); ctx.globalAlpha = 0.97;
  P.curveStroke(ctx, line, (u) => (26 * Math.pow(1 - u, 0.8) + 4) * lk, '#E8B23A', 1841, { bristles: 3 });
  P.curveStroke(ctx, line.map(([x, y]) => [x, y + 5]), (u) => (9 * (1 - u)) * lk + 0.5, '#B77F1E', 1843, { bristles: 1, detail: 0 });
  P.curveStroke(ctx, line.map(([x, y]) => [x, y - 5]), (u) => 7 * (1 - u) * lk + 0.5, '#FFE9A0', 1842, { bristles: 1, detail: 0 });
  // altın toz bulutçukları
  for (let i = 0; i < 6; i++) {
    const k = ((t * 1.6 + i / 6) % 1), x = cx + 40 + k * 300, y = cy - 10 + Math.sin(i * 2.1 + t * 2) * 30 - k * 40;
    P.glow(ctx, x, y, 30 + k * 60, '#FFE08A', 0.4 * lk * Math.sin(Math.PI * k), 'source-over');
  }
  ctx.restore();
}
// rüzgâr çizgileri (soldan sağa)
function drawWind(ctx, t) {
  const wa = sm((t - 76.6) / 0.4) * (1 - sm((t - 79.3) / 0.4));
  if (wa <= 0.01) return;
  const r = rng(1851);
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const y0 = r.range(300, 1000), sp = r.range(800, 1150), ph = r.range(0, 1);
    const k = ((t - 76.6) * sp / 1600 + ph) % 1;
    const x0 = -320 + k * 1750;
    const line = []; for (let j = 0; j <= 14; j++) { const u = j / 14; line.push([x0 + u * 300, y0 + Math.sin(u * 5 + i + t * 3) * 12 - u * 8]); }
    ctx.globalAlpha = wa * 0.7 * Math.sin(Math.PI * k);
    P.curveStroke(ctx, line, (u) => 8 * Math.sin(Math.PI * u) + 0.5, '#FFF8EC', 1852 + i, { bristles: 1, detail: 0.5 });
  }
  ctx.restore();
}

// ---------- küçük adam ve kelebek ----------
const MAN = { h: 190, gy: 1280, S: 0.42, cad: 1.06, x0: 60, T0: 74.4 };
function manX(t) { return MAN.x0 + 2 * MAN.S * MAN.cad * (t - MAN.T0) * MAN.h; }
function manState(t) {
  const u = MAN.cad * (t - MAN.T0), S = MAN.S, D = MAN.x0 / MAN.h + 2 * S * u;
  const legs = Wk.steadyLegs(u, S, MAN.x0 / MAN.h);
  const res = Wk.evalWalker({ D, legs, age: 0, armAmp: deg(38), lean: deg(15), legOpts: { lift: 0.12, st: 0.42, heelRise: 1.25 } });
  let p = res.pose;
  p.elbowN = deg(62) + Math.max(0, p.armN) * 0.6; p.elbowF = deg(62) + Math.max(0, p.armF) * 0.6;
  p.head -= deg(16); p.neck -= deg(6);
  p.mouth = 0.55; p.eye = 1; p.brow = -0.1;
  // kelebeğe uzanma (yakın kol)
  const reachK = 0.75 * Math.pow(Math.max(0, Math.sin((t - 74.4) * 1.9)), 2);
  if (reachK > 0.01) {
    const sk = M.skeleton(p, 1), sh = sk.armN.shoulder;
    p = Wk.reach(p, [sh[0] + 0.27, sh[1] - 0.17], 'N', reachK, deg(130));
  }
  return { p, x: D * MAN.h, y: MAN.gy };
}
function butterflyPos(t, mx) {
  return [mx + 95 + 26 * Math.sin(t * 2.3) + 10 * Math.sin(t * 5.1), MAN.gy - MAN.h * 1.08 + 26 * Math.sin(t * 3.4 + 1) - 12 * Math.abs(Math.sin(t * 7))];
}
function butterfly(ctx, x, y, s, phase) {
  const f = Math.abs(Math.cos(phase)) * 0.85 + 0.15;
  const c1 = '#F59A2E', c2 = '#FFD45A', tip = '#3A2350';
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(phase * 0.3) * 0.2);
  for (const sg of [-1, 1]) {
    const up = P.smoothPts([[0, -0.05], [sg * 0.35 * f, -0.55], [sg * 0.85 * f, -0.62], [sg * 0.92 * f, -0.2], [sg * 0.4 * f, 0.02]], true, 5).map(([a, b]) => [a * s, b * s]);
    const lo = P.smoothPts([[0, 0.02], [sg * 0.55 * f, 0.08], [sg * 0.62 * f, 0.45], [sg * 0.25 * f, 0.5]], true, 5).map(([a, b]) => [a * s, b * s]);
    ctx.fillStyle = shade(c1, -0.06); ctx.fill(P.pathOf(lo));
    ctx.fillStyle = c1; ctx.fill(P.pathOf(up));
    ctx.save(); ctx.clip(P.pathOf(up));
    ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(sg * 0.42 * f * s, -0.28 * s, 0.2 * f * s + 0.5, 0.17 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = tip; ctx.beginPath(); ctx.ellipse(sg * 0.9 * f * s, -0.62 * s, 0.25 * f * s + 0.5, 0.22 * s, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = tip; ctx.lineWidth = Math.max(1.5, s * 0.1); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -0.25 * s); ctx.lineTo(0, 0.42 * s); ctx.stroke();
  ctx.restore();
}

module.exports = {
  _dbg: { CRACK, topOf, leakOf, TOP_AT_CRACK },
  init() { bgLayer(); moundSpr(); coinSpr(); },
  draw(ctx, t) {
    const tc = clamp(t, 74.4, 79.9);
    const cam = camOf(tc);
    ctx.save(); L.view(ctx, cam, 1);
    ctx.drawImage(bgLayer(), -120, -130);
    // kum saati
    L.put(ctx, moundSpr(), HG.x, HG.y + 20);
    ctx.fillStyle = rgba('#2E4A3A', 0.25); ctx.beginPath(); ctx.ellipse(HG.x + 30, HG.y + 4, 380, 26, 0, 0, TAU); ctx.fill();
    const glow = sm((tc - 75.12) / 0.4) * (0.85 + 0.15 * Math.sin(tc * 4)) * (1 - 0.4 * sm((tc - 77.3) / 1.0));
    if (glow > 0) { P.glow(ctx, HG.x, HG.y - Hh * 0.55, Hh * 1.0, '#FFD27A', 0.55 * glow); P.glow(ctx, HG.x, HG.y - Hh * 0.7, Hh * 0.4, '#FFF0C0', 0.4 * glow); }
    const top = topOf(tc);
    L.hourglass2(ctx, HG.x, HG.y, Hh, top, tc, { glow: 0, seed: 3, bot: botOf(tc) });
    if (glow > 0.01) R.sparkles(ctx, HG.x, HG.y - Hh * 0.62, Hh * 0.42, 12, tc * 0.9, 1861, { alpha: glow, scale: 1.4, rise: 30 });
    drawCrack(ctx, seg(tc, TCRACK, TCRACK + 0.32));
    drawJet(ctx, tc);
    drawCoins(ctx, tc);
    drawGrains(ctx, tc);
    // küçük adam
    const ms = manState(tc);
    ctx.fillStyle = rgba('#3A4A2A', 0.25); ctx.beginPath(); ctx.ellipse(ms.x + 4, ms.y + 2, MAN.h * 0.16, 5, 0, 0, TAU); ctx.fill();
    M.drawMan(ctx, ms.p, { x: ms.x, y: ms.y, h: MAN.h, light: LIGHT });
    const [bx, by] = butterflyPos(tc, ms.x);
    butterfly(ctx, bx, by, 23, tc * 24);
    // alt kenarda çerçeveleyen çimen-çiçek öbekleri (hafif paralaks)
    ctx.restore();
    ctx.save(); L.view(ctx, cam, 1.25);
    for (const [x, y, sz, v, fl] of [[40, 1995, 360, 0, 1], [330, 2030, 300, 1, -1], [760, 2010, 320, 2, 1], [1060, 1990, 370, 0, -1]]) L.put(ctx, L.clumpSpr('s18fg' + v, sz, 1870 + v, { greens: ['#3A6E50', '#4A8254', '#5E965A', '#2E5E46'] }), x, y, 1, Math.sin(tc * 1.5 + x) * 0.025 + 0.04 * sm((tc - 76.8) / 0.5), 1, fl);
    ctx.restore();
    drawWind(ctx, tc);
  },
  sfx: [
    { t: 75.25, type: 'chime', gain: 0.26 },
    { t: 75.4, type: 'sand', gain: 0.2 },
    { t: 76.84, type: 'crack', gain: 0.35 },
    { t: 76.95, type: 'wind', gain: 0.3 },
    { t: 77.3, type: 'coin', gain: 0.22 },
    { t: 78.0, type: 'sand', gain: 0.25 },
  ],
};
