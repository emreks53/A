// S17 — "Kabri ve ölümü hatırına getirmek istemiyor," (71.50–74.80)
// Alacakaranlık yolu (s16'dan kesmeyle: aynı adam, aynı ölçek, sağa yürür; kamera onunla kayar). 72.14 "Kabri ve ölümü":
// yol kenarında servilerin arasında sakin bir mezarlık (alçak taş duvar, sade mezar taşları) sağdan gelir; adam fark eder,
// bakar. 72.92 "hatırına getirmek istemiyor": başını öne eğip gözlerini kapar, elini yüzüne siper eder, adımlarını
// hızlandırır; başının üstünde mezar taşlı bir düşünce balonu belirir (73.08); adam onu eliyle iter (73.7), balon "puf"
// diye söner (74.0). Saygılı, sakin; korkutucu hiçbir şey yok.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const Wk = require('./_s16_walk');
const L = require('./_s16_lib');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, seg, deg } = C;
const { W, H } = C;

const MAN = { h: 600, gy: 1215, S: 0.34, T0: 71.3 };
const LIGHT = -2.75;               // alçak, soldan gün batımı ışığı
const TA = 71.3, TB = 75.2;
const sm = L.sm;
const FS = 0.03, FF = 0.12, FM = 0.32, FC = 0.55, FG = 1.3;

function uOf(t) { return 0.86 * (t - MAN.T0) + 0.52 * L.rampInt(t, 72.86, 73.36); }
function manX(t) { return 2 * MAN.S * uOf(t) * MAN.h; }
function camOf(t) {
  t = clamp(t, TA, TB);
  const push = E.inOutSine(seg(t, 72.75, 73.7)) * (1 - 0.6 * E.inOutSine(seg(t, 74.2, 75.1)));
  const z = 1 + 0.05 * push;
  const SX = lerp(560, 420, E.inOutSine(seg(t, 71.5, 72.5)));
  const [bx, by] = R.breathe(t, 3, 17);
  return { x: manX(t) - (SX - W / 2) / z + bx, y: 960 - 70 * push + by, z };
}
function layerBounds(f, y0, y1) {
  let x0 = Infinity, x1 = -Infinity;
  for (let t = TA; t <= TB + 1e-6; t += 0.05) { const c = camOf(t); x0 = Math.min(x0, L.fromScreen(c, f, 0, 0)[0]); x1 = Math.max(x1, L.fromScreen(c, f, W, H)[0]); }
  return { x0: Math.floor(x0 - 60), x1: Math.ceil(x1 + 60), w: Math.ceil(x1 - x0 + 120), y0, y1, h: y1 - y0 };
}

// ---------- katmanlar ----------
function skyLayer() {
  const B = layerBounds(FS, -200, 1150);
  return { B, cv: R.cached('s17:sky', B.w, B.h, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, B.w, B.h);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: B.w, y1: B.h, w: B.w, h: B.h },
      ['#232566', '#33307A', '#4E3A8C', '#7A4A96', '#B25E92', '#E07E86', '#F4A272', '#F9C47E'],
      { seed: 1721, stops: [0, 0.14, 0.3, 0.46, 0.62, 0.76, 0.88, 1], wMin: 22, wMax: 42, lMin: 90, lMax: 280, mixJitter: 0.05 });
    // birkaç ilk yıldız
    const r = rng(1722);
    for (let i = 0; i < 26; i++) { const sx = r.range(0, B.w), sy = r.range(0, B.h * 0.3), s = r.range(1.5, 3.4); x.fillStyle = rgba('#FFF2DA', r.range(0.5, 0.9)); x.beginPath(); x.arc(sx, sy, s, 0, TAU); x.fill(); }
  }) };
}
function hillLayer(key, f, y0, y1, topFn, cols, seed, o = {}) {
  const B = layerBounds(f, y0, y1);
  return { B, cv: R.cached('s17:' + key, B.w, B.h, (x) => {
    const r = rng(seed);
    const top = []; for (let i = 0; i <= 200; i++) { const lx = B.x0 + B.w * i / 200; top.push([lx - B.x0, topFn(lx) - B.y0]); }
    const poly = top.concat([[B.w, B.h], [0, B.h]]);
    x.save(); x.strokeStyle = rgba(P.UNDERPAINT, o.rim ?? 0.5); x.lineWidth = 4; x.setLineDash([80, 150, 30, 200]); x.translate(1.5, -1.5); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(P.pathOf(poly)); x.fillStyle = cols[1]; x.fillRect(0, 0, B.w, B.h); x.restore();
    P.bandFill(x, poly, { x0: 0, y0: 0, x1: B.w, y1: B.h, w: B.w, h: B.h }, cols, { seed: seed + 1, wMin: 14, wMax: 26, lMin: 60, lMax: 200, stops: o.stops, angle: 0.02 });
    // gün batımına bakan sırtlarda sıcak ışık
    for (let i = 0; i < (o.nLit ?? 30); i++) {
      const k = r.int(2, 194), p0 = top[k], p1 = top[k + r.int(2, 4)];
      P.stroke(x, p0[0], p0[1] + r.range(6, 12), p1[0], p1[1] + r.range(6, 12), r.range(6, 10), rgba(o.lit || '#F2A07A', r.range(0.4, 0.8)), r.int(1, 1e9), { detail: 0.4 });
    }
    if (o.details) o.details(x, B, r);
  }) };
}
const farTop = (lx) => 960 - 30 * Math.max(0, Math.sin(lx * 0.0036 + 0.6)) ** 1.4 - 12 * Math.sin(lx * 0.013 + 1.1);
const midTop = (lx) => 1040 - 26 * Math.max(0, Math.sin(lx * 0.005 - 0.4)) ** 1.5 - 8 * Math.sin(lx * 0.021 + 2.1);
function farLayer() { return hillLayer('far', FF, 780, 1200, farTop, ['#8A6AA8', '#6E5A9C', '#5A4C8E'], 1731, { stops: [0, 0.3, 1], lit: '#F6B08A' }); }
function midLayer() {
  return hillLayer('mid', FM, 940, 1260, midTop, ['#5E5A92', '#4A4880', '#3A3A6E'], 1741, {
    stops: [0, 0.3, 1], lit: '#E89A86', nLit: 40,
    details: (x, B, r) => {
      let lx = B.x0 + 40;
      while (lx < B.x1) {
        const gx = lx - B.x0, gy = midTop(lx) - B.y0 + 6;
        if (r.chance(0.6)) R.cypress(x, gx, gy, r.range(50, 80), r.int(1, 99), { base: '#33406A', dark: '#22284E', light: '#7A6A9A', lightAng: LIGHT });
        else { const s = r.range(24, 32); x.fillStyle = '#3A3050'; x.fillRect(gx - 2.5, gy - s * 0.5, 5, s * 0.5 + 2); P.toneUnion(x, [P.blobPts(gx, gy - s * 1.1, s * 0.8, s * 0.64, r.int(1, 99), 0.12, 20), P.blobPts(gx - s * 0.45, gy - s * 0.8, s * 0.5, s * 0.42, r.int(1, 99), 0.12, 16), P.blobPts(gx + s * 0.48, gy - s * 0.82, s * 0.5, s * 0.42, r.int(1, 99), 0.12, 16)], { base: '#3E4E72', dark: '#272E52', light: '#8A7AA0', seed: r.int(1, 99), rimW: 2.5, dabs: 3, highlights: 2, texture: 0.3, lightAng: LIGHT }); }
        lx += r.range(60, 150);
      }
    },
  });
}
// ---------- mezarlık (f=0.55): alçak duvar, taşlar, serviler ----------
let CEM = null;
function cemetery() {
  if (CEM) return CEM;
  // 72.14'te mezarlık merkezi ekranın sağında (x≈800)
  const c = camOf(72.14);
  const cx = L.fromScreen(c, FC, 870, 0)[0];
  const w = 1000, h = 760, ax = w / 2, ay = h - 10; // çapa: duvar dibinin ortası (y=1128)
  const spr = L.sprite('s17cem', w, h, ax, ay, (x) => {
    const r = rng(1751);
    // arka serviler
    const cyp = [[-360, 470, 3], [-150, 560, 5], [120, 500, 7], [330, 590, 9], [430, 420, 11]];
    for (const [dx, hh, sd] of cyp) R.cypress(x, ax + dx, ay - 46, hh, 1750 + sd, { base: '#24524E', dark: '#132E36', light: '#7C8A62', lightAng: LIGHT, wr: 0.19 });
    // zemin tümseği (duvarın ardında)
    const mound = P.smoothPts([[ax - 470, ay - 30], [ax - 300, ay - 70], [ax, ay - 84], [ax + 300, ay - 72], [ax + 470, ay - 34], [ax + 480, ay], [ax - 480, ay]], true, 6);
    P.toneShape(x, mound, { base: '#3E6A5A', dark: '#284A48', light: '#8A8A62', lightAng: LIGHT, seed: 1752, shadowW: 0.1, lightW: 0.06, dabs: 10, strokeAng: 0.02, texAng: 0 });
    // mezar taşları
    const stones = [[-330, 110, 0.0], [-190, 136, 0.04], [-40, 122, -0.03], [110, 146, 0.02], [250, 118, -0.05], [370, 100, 0.03]];
    for (const [dx, s, rot] of stones) {
      x.save(); x.translate(ax + dx, ay - 52); x.rotate(rot);
      R.tombstone(x, 0, 0, s, { base: '#D9CCD4', dark: '#7A6A96', seed: 1760 + dx, rim: true });
      x.restore();
      // dipte küçük çiçekler / ot
      for (let i = 0; i < 4; i++) { const fx = ax + dx + r.range(-s * 0.3, s * 0.3), fy = ay - 50 + r.range(-2, 4); P.stroke(x, fx, fy, fx + r.range(-6, 6), fy - r.range(10, 22), r.range(3, 5), r.pick(['#4E7A5A', '#6A8A5A', '#3A5E4E']), r.int(1, 1e9), { detail: 0, taper1: 0.3 }); }
      if (r.chance(0.7)) { const fx = ax + dx + r.range(-s * 0.25, s * 0.25); x.fillStyle = r.pick(['#F2C6D6', '#F6E2B0', '#E6D6F2']); x.beginPath(); x.arc(fx, ay - 62, 4.5, 0, TAU); x.fill(); }
    }
    // alçak taş duvar
    const wallTop = ay - 58;
    P.toneShape(x, P.roundRectPts(ax - 490, wallTop, 980, 62, 10), { base: '#B4A2B6', dark: '#6E5E8A', light: '#F2C0A2', lightAng: LIGHT, seed: 1771, shadowW: 0.22, lightW: 0.12, dabs: 12, strokeAng: 0 });
    // taş derzleri
    x.strokeStyle = rgba('#5A4A72', 0.55); x.lineWidth = 2.2;
    for (let i = 0; i < 26; i++) { const sx = ax - 470 + i * 37 + r.range(-6, 6); x.beginPath(); x.moveTo(sx, wallTop + (i % 2 ? 6 : 30)); x.lineTo(sx + r.range(-3, 3), wallTop + (i % 2 ? 30 : 56)); x.stroke(); }
    x.beginPath(); x.moveTo(ax - 486, wallTop + 30); x.lineTo(ax + 486, wallTop + 31); x.stroke();
    // duvar başı (kapak taşları)
    P.toneShape(x, P.roundRectPts(ax - 498, wallTop - 10, 996, 16, 6), { base: '#CDB8C4', dark: '#7A6A96', light: '#FFD2B0', lightAng: LIGHT, seed: 1772, rim: false, shadowW: 0.3, dabs: 6 });
  });
  CEM = { spr, lx: cx, ly: 1128 };
  return CEM;
}
// ---------- yol + çayır (f=1) ----------
const PATH_TOP = (wx) => 1138 + 5 * Math.sin(wx * 0.013) + 3 * Math.sin(wx * 0.041 + 1);
const PATH_BOT = (wx) => 1290 + 6 * Math.sin(wx * 0.011 + 2) + 3 * Math.sin(wx * 0.037);
function groundLayer() {
  const B = layerBounds(1, 1100, 2040);
  return { B, cv: R.cached('s17:ground', B.w, B.h, (x) => {
    const r = rng(1781);
    const N = Math.ceil(B.w / 12), topL = [], botL = [];
    for (let i = 0; i <= N; i++) { const wx = B.x0 + B.w * i / N; topL.push([wx - B.x0, PATH_TOP(wx) - B.y0]); botL.push([wx - B.x0, PATH_BOT(wx) - B.y0]); }
    const fr = topL.map(([a, b]) => [a, b - 20 - 6 * Math.sin(a * 0.05)]);
    const frPoly = fr.concat(topL.slice().reverse().map(([a, b]) => [a, b + 4]));
    x.fillStyle = '#3E6A5A'; x.fill(P.pathOf(frPoly));
    for (let i = 0; i < B.w / 7; i++) {
      const k = r.int(0, N - 1), px = fr[k][0] + r.range(-6, 6), py = fr[k][1] + r.range(2, 18), hh = r.range(10, 22), a = r.range(-0.4, 0.4);
      P.stroke(x, px, py + 6, px + Math.sin(a) * hh, py - hh, r.range(3, 5), r.pick(['#5E8A62', '#7E9A66', '#3E6A5A', '#2E5250']), r.int(1, 1e9), { detail: 0, taper1: 0.3 });
    }
    const pathPoly = topL.concat(botL.slice().reverse());
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 5; x.setLineDash([140, 60, 50, 120]); x.stroke(P.pathOf(botL, false)); x.restore();
    x.fillStyle = '#C8968A'; x.fill(P.pathOf(pathPoly));
    P.bandFill(x, pathPoly, { x0: 0, y0: 30, x1: B.w, y1: 200, w: B.w, h: 170 }, ['#F0BC98', '#D9A08E', '#B98488', '#9A7084'], { seed: 1782, wMin: 12, wMax: 22, lMin: 60, lMax: 220, stops: [0, 0.3, 0.65, 1], angle: 0.01 });
    x.save(); x.clip(P.pathOf(pathPoly));
    for (let i = 0; i < B.w / 10; i++) {
      const wx = r.range(0, B.w), yy = lerp(PATH_TOP(wx + B.x0), PATH_BOT(wx + B.x0), r.range(0.1, 0.95)) - B.y0;
      if (r.chance(0.5)) { const s = r.range(2.5, 6); x.fillStyle = rgba(r.pick(['#8A6478', '#FFD9BE', '#7A5A72', '#E6A890']), 0.85); x.beginPath(); x.ellipse(wx, yy, s * 1.4, s, 0, 0, TAU); x.fill(); }
      else P.stroke(x, wx, yy, wx + r.range(30, 90), yy + r.range(-2, 2), r.range(4, 8), rgba(r.pick(['#A87A84', '#FFD0B0']), 0.6), r.int(1, 1e9), { detail: 0.3 });
    }
    x.restore();
    const mPoly = botL.concat([[B.w, B.h], [0, B.h]]);
    x.fillStyle = '#2E5A56'; x.fill(P.pathOf(mPoly));
    P.bandFill(x, mPoly, { x0: 0, y0: 180, x1: B.w, y1: B.h, w: B.w, h: B.h - 180 }, ['#6A8A66', '#4A7462', '#38605A', '#2C4E52', '#24404A', '#1E3444'], { seed: 1783, wMin: 18, wMax: 34, lMin: 80, lMax: 260, stops: [0, 0.07, 0.25, 0.48, 0.72, 1], angle: 0.015 });
    for (let i = 0; i < B.w / 5; i++) {
      const k = r.int(0, N - 1), px = botL[k][0] + r.range(-6, 6), py = botL[k][1] + r.range(-2, 14), hh = r.range(12, 28), a = r.range(-0.45, 0.45);
      P.stroke(x, px, py + 8, px + Math.sin(a) * hh, py - hh * 0.8, r.range(3.5, 6), r.pick(['#7E9A66', '#5E8A62', '#4A7462', '#38605A']), r.int(1, 1e9), { detail: 0, taper1: 0.3 });
    }
  }) };
}
let FGC = null;
function fgClumps() {
  if (FGC) return FGC;
  const B = layerBounds(FG, 0, 0), r = rng(1791);
  FGC = [];
  for (let x = B.x0; x < B.x1; x += r.range(300, 560)) FGC.push({ x, y: 1990 + r.range(-20, 30), s: r.range(300, 380), v: r.int(0, 1), flip: r.sign() });
  return FGC;
}
function sunSpr() { return L.sprite('s17sun2', 760, 760, 380, 380, (x) => L.cleanSun(x, 380, 380, 120, { seed: 6, ring: '#F7A24A', disk: '#FFE2A8', diskDark: '#F6C88A', glow: '#FFB070' })); }

// ---------- düşünce balonu (içinde servi ve mezar taşı) ----------
function balloon() {
  return L.balloonSprite('s17', 118, 1795, (x, cx, cy, s) => {
    // alacakaranlık iç resim
    x.fillStyle = '#C8A6C6'; x.fillRect(cx - s, cy - s, s * 2, s * 2);
    P.bandFill(x, null, { x0: cx - s, y0: cy - s, x1: cx + s, y1: cy + s, w: s * 2, h: s * 2 }, ['#8E78B8', '#C690B0', '#F2B48E'], { seed: 1796, wMin: 10, wMax: 18, lMin: 30, lMax: 90 });
    const gy = cy + s * 0.36;
    x.fillStyle = '#4E6E5E'; x.fill(P.pathOf(P.smoothPts([[cx - s, gy + 4], [cx - s * 0.5, gy - s * 0.06], [cx + s * 0.4, gy - s * 0.04], [cx + s, gy + 6], [cx + s, cy + s], [cx - s, cy + s]], true, 5)));
    R.cypress(x, cx - s * 0.36, gy + 2, s * 0.86, 1797, { base: '#24524E', dark: '#132E36', light: '#7C8A62', lightAng: LIGHT, wr: 0.2 });
    R.tombstone(x, cx + s * 0.14, gy + 4, s * 0.62, { base: '#E2D8DE', dark: '#7A6A96', seed: 1798 });
    R.tombstone(x, cx + s * 0.5, gy + 6, s * 0.42, { base: '#D6CAD2', dark: '#7A6A96', seed: 1799 });
  }, { base: '#EFE8F6', dark: '#A89CCB', light: '#FFFFFF', la: LIGHT, inner: '#2A2050' });
}
function dots(ctx, hx, hy, bx, by, k) {
  for (let i = 0; i < 3; i++) {
    const a = clamp(k * 3 - i);
    if (a <= 0) continue;
    const u = 0.22 + i * 0.22;
    const px = lerp(hx, bx, u), py = lerp(hy, by, u) - Math.sin(u * Math.PI) * 18;
    const rr = (7 + i * 5) * E.outBack(a, 2);
    P.toneShape(ctx, P.ellipsePts(px, py, rr, rr * 0.92, 18), { base: '#EFE8F6', dark: '#A89CCB', light: '#FFFFFF', lightAng: LIGHT, rim: true, rimW: 2, shadowW: 0.3, lightW: 0.15, texture: 0, dabs: 0, highlights: 0, seed: 1800 + i });
  }
}

// ---------- adam ----------
const T = { kabr: 72.14, hatir: 72.92, getir: 73.32, iste: 73.80 };
function manState(t) {
  const u = uOf(t), S = MAN.S, D = 2 * S * u;
  const legs = Wk.steadyLegs(u, S, 0);
  const hurry = sm((t - 72.88) / 0.45);
  const res = Wk.evalWalker({ D, legs, age: 0, armAmp: deg(18) + deg(10) * hurry, lean: deg(2) + deg(8) * hurry, legOpts: { lift: 0.055 } });
  let p = res.pose;
  const notice = sm((t - 72.12) / 0.35) * (1 - sm((t - 72.86) / 0.18));
  const avert = sm((t - 72.9) / 0.25);
  const shield = sm((t - 72.95) / 0.3) * (1 - sm((t - 73.55) / 0.25));
  const push = sm((t - 73.56) / 0.24) * (1 - sm((t - 74.05) / 0.26));
  const relief = sm((t - 74.1) / 0.5);
  p.head += -deg(5) * notice + deg(17) * avert * (1 - 0.55 * push) * (1 - 0.5 * relief);
  p.neck += deg(5) * avert * (1 - 0.5 * relief);
  p.brow = 0.55 * notice + 0.85 * avert * (1 - 0.5 * relief);
  p.mouth = 0.08 - 0.25 * notice - 0.3 * avert * (1 - 0.4 * relief);
  p.eye = notice > 0.5 ? 1 : 1;
  const squeeze = avert * (1 - push) * (1 - relief);
  p.eye = lerp(1, 0.05, squeeze) * (1 - 0.0) + 0;
  if (push > 0.01) p.eye = Math.max(p.eye, 0.55 * push);
  // siper el: yüzün önünde, parmaklar yukarı
  const skel = M.skeleton(p, 1);
  if (shield > 0.001) {
    const hc = skel.headC;
    p = Wk.reach(p, [hc[0] + 0.1, hc[1] + 0.05], 'N', shield, deg(170));
    p.grip = 0.15;
  }
  // balonu itme: kol yukarı-ileri uzanır, avuç balona
  if (push > 0.001) {
    const shd = skel.armN.shoulder;
    p = Wk.reach(p, [shd[0] + 0.15, shd[1] - 0.275], 'N', push, deg(172));
    p.grip = 0.05;
  }
  return { p, x: D * MAN.h, y: MAN.gy, hurry, push, shield };
}
// balonun dünya konumu (başa bağlı)
function balloonPos(t, ms, sk) {
  const sh = [ms.x + sk.armN.shoulder[0], ms.y + sk.armN.shoulder[1]];
  const bob = Math.sin(t * 2.4) * 6;
  return [sh[0] + 168, sh[1] - 262 + bob];
}

module.exports = {
  _dbg: { camOf, manX, cemetery },
  init() { skyLayer(); farLayer(); midLayer(); groundLayer(); cemetery(); fgClumps(); sunSpr(); balloon(); },
  draw(ctx, t) {
    const tc = clamp(t, TA, TB);
    const cam = camOf(tc);
    const sky = skyLayer();
    ctx.save(); L.view(ctx, cam, FS); ctx.drawImage(sky.cv, sky.B.x0, sky.B.y0);
    L.put(ctx, sunSpr(), 190, 905, 1, tc * 0.03);
    ctx.restore();
    // eve dönen kuşlar
    ctx.save(); ctx.strokeStyle = '#2A2450'; ctx.lineCap = 'round'; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const bx = 980 - (tc - 71.4) * (60 + i * 8) - i * 46, by = 380 + Math.sin(i * 2.3) * 34 + Math.sin(tc * 2 + i) * 4;
      const fl = Math.sin(tc * 9 + i * 1.7) * 6, s = 12 - i;
      ctx.beginPath(); ctx.moveTo(bx - s, by - fl * 0.6); ctx.quadraticCurveTo(bx - s * 0.4, by - 4, bx, by); ctx.quadraticCurveTo(bx + s * 0.4, by - 4, bx + s, by - fl * 0.6); ctx.stroke();
    }
    ctx.restore();
    for (const lay of [[farLayer(), FF], [midLayer(), FM]]) { ctx.save(); L.view(ctx, cam, lay[1]); ctx.drawImage(lay[0].cv, lay[0].B.x0, lay[0].B.y0); ctx.restore(); }
    // mezarlık
    const cem = cemetery();
    ctx.save(); L.view(ctx, cam, FC);
    L.put(ctx, cem.spr, cem.lx, cem.ly);
    // "Kabri ve ölümü": son gün ışığı taşların üstünde yumuşakça parlar
    const lit = sm((tc - 72.05) / 0.35) * (1 - sm((tc - 72.9) / 0.9));
    if (lit > 0.01) { P.glow(ctx, cem.lx - 60, cem.ly - 120, 520, '#FFC08A', 0.38 * lit); P.glow(ctx, cem.lx - 60, cem.ly - 110, 220, '#FFE2B8', 0.3 * lit); }
    ctx.restore();
    // dünya
    ctx.save(); L.view(ctx, cam, 1);
    const g = groundLayer(); ctx.drawImage(g.cv, g.B.x0, g.B.y0);
    const ms = manState(tc);
    const sk = M.skeleton(ms.p, MAN.h);
    ctx.fillStyle = rgba('#2A1E3A', 0.3); ctx.beginPath(); ctx.ellipse(ms.x + 20, ms.y + 4, MAN.h * 0.17, 11, 0, 0, TAU); ctx.fill();
    M.drawMan(ctx, ms.p, { x: ms.x, y: ms.y, h: MAN.h, light: LIGHT });
    // düşünce balonu
    const hx = ms.x + sk.headC[0], hy = ms.y + sk.headC[1];
    const bp = balloonPos(tc, ms, sk);
    const dk = seg(tc, 72.98, 73.2);
    const pk = C.pop(tc, 73.1, 0.5, 2.0);
    const pushK = E.inOutCubic(seg(tc, 73.8, 74.0));
    const popT = 74.0;
    // el balona değer (73.8) → balon ele doğru ezilir (el temasını korur) → 74.0'da patlar; puf ile balon 2-3 kare üst üste
    const bx = bp[0] + 12 * pushK, by = bp[1] - 8 * pushK;
    if (tc < popT + 0.07) {
      if (tc < popT) dots(ctx, hx + 50, hy - 60, bp[0] - 110, bp[1] + 80, dk * (1 - sm((tc - 73.55) / 0.2)));
      const burst = seg(tc, popT - 0.035, popT + 0.07);
      if (pk > 0 && burst < 1) {
        const wob = Math.sin(pushK * Math.PI * 2.5) * 0.03 * pushK;
        const sx = pk * (1 + 0.14 * pushK + wob + 0.12 * burst), sy = pk * (1 - 0.16 * pushK - wob + 0.1 * burst);
        ctx.save(); ctx.globalAlpha = 1 - E.inQuad(burst);
        ctx.translate(bx, by); ctx.rotate(0.06 * pushK); ctx.scale(sx, sy);
        ctx.drawImage(balloon().cv, -balloon().ax, -balloon().ay);
        ctx.restore();
      }
    }
    if (tc >= popT - 0.035) L.poof(ctx, bp[0] + 12, bp[1] - 8, 140, seg(tc, popT - 0.045, popT + 0.45), 1811, { la: LIGHT, key: 's17' });
    ctx.restore();
    // ön plan öbekleri
    ctx.save(); L.view(ctx, cam, FG);
    const fx0 = L.fromScreen(cam, FG, -200, 0)[0], fx1 = L.fromScreen(cam, FG, W + 200, 0)[0];
    for (const c of fgClumps()) { if (c.x < fx0 || c.x > fx1) continue; L.put(ctx, L.clumpSpr('s17fg' + c.v, c.s, 1792 + c.v, { greens: ['#24443E', '#2E524A', '#3A5E50', '#1C3638'], petal: '#E8D8EE', petalDark: '#8A7AAA' }), c.x, c.y, 1, Math.sin(tc * 1.4 + c.x) * 0.02, 1, c.flip); }
    ctx.restore();
    // alacakaranlık renk ayarı: alt taraf lavanta, soldan sıcak ışık
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    const gr = ctx.createLinearGradient(0, 500, 0, H);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.35, 'rgba(214,190,226,0.55)'); gr.addColorStop(1, 'rgba(170,150,200,0.7)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore();
    P.glow(ctx, 120, 900, 900, '#FF9A5A', 0.22);
  },
  sfx: [
    { t: 71.6, type: 'wind', gain: 0.15 },
    { t: 72.12, type: 'bell', gain: 0.16 },
    { t: 72.95, type: 'step', gain: 0.2 },
    { t: 73.1, type: 'bubble', gain: 0.25 },
    { t: 74.0, type: 'pop', gain: 0.3 },
  ],
};
