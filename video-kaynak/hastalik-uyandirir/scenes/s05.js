// S05 — "ve mütemadiyen zeval ve firakta yuvarlanması şahittir." (12.50–17.30)
// Çark-ı felek: tepede boyalı ahşap bir dönme dolap; kollarında asılı saksılar. Yukarı çıkan çiçek açar,
// aşağı inen solar (13.72 "zeval"), tepedeki salıncakta iki kuş ayrı yönlere uçar (14.22 "firakta"),
// çark hızlanır, yapraklar savrulur (14.62 "yuvarlanması"), kamera geri çekilir; çark batan güneşin
// önünde siluetleşir (15.62 "şahittir").
'use strict';
const { createCanvas } = require('@napi-rs/canvas');
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const L = require('./_s05_lib');
const { seg, E, lerp, clamp, rgba, mix, shade, TAU, rng } = C;

const WC = { x: 540, y: 655 };            // çark merkezi (dünya) — en alttaki saksı ayakların üstünde kalsın
const RIM = 282, RIM_W = 30;               // jant orta yarıçapı ve kalınlığı
const PIN = RIM + RIM_W / 2 + 3;           // sepet pimi yarıçapı
const N = 8, BIRD_CAR = 3;
const SS = 1.4;                            // önbellek süper örnekleme (kamera 1.34'e kadar yaklaşır)
const LA = -2.3;
const GND = 1135;                          // ayakların bastığı tepe yüksekliği
const M = 40;                              // arka plan kenar payı

const frac = (x) => x - Math.floor(x);

// ---------- dönüş tablosu (deterministik, bir kez) ----------
function omegaFn(t) {
  let w = 0.04;
  w += (0.36 - 0.04) * E.inOutSine(seg(t, 12.84, 13.5));   // "mütemadiyen": dönmeye başlar
  w += (1.6 - 0.36) * E.inOutSine(seg(t, 14.5, 15.15));    // "yuvarlanması": hızlanır
  w += (0.9 - 1.6) * E.inOutSine(seg(t, 15.75, 16.7));     // geri çekilirken ağır ağır
  return w;
}
const T0 = 11.8, T1 = 18.2, DT = 1 / 240;
let TAB = null;
function sample(arr, t) {
  const f = clamp((t - T0) / DT, 0, arr.length - 1.001), i = Math.floor(f), k = f - i;
  return arr[i] + (arr[i + 1] - arr[i]) * k;
}
function phi0(c) { return TAB.phiB + (c - BIRD_CAR) / N; }
function buildTables() {
  const n = Math.ceil((T1 - T0) / DT) + 2;
  const rot = new Float64Array(n), om = new Float64Array(n);
  let a = 0;
  for (let i = 0; i < n; i++) { const t = T0 + i * DT; om[i] = omegaFn(t); rot[i] = a; a += omegaFn(t + DT / 2) * DT; }
  TAB = { rot, om, sw: [] };
  // kuş sepeti 14.22'de tepeyi biraz geçmiş olsun
  TAB.phiB = 0.505 - (sample(rot, 14.22) - sample(rot, 12.2)) / TAU;
  // sepet salınımı: hızlanma ve merkezkaç etkisiyle sönümlü sarkaç
  const G = 3600, k = Math.pow(TAU * 1.05, 2), cdamp = 2 * 0.2 * Math.sqrt(k);
  for (let c = 0; c < N; c++) {
    const arr = new Float64Array(n); let psi = 0, v = 0;
    for (let i = 0; i < n; i++) {
      const t = T0 + i * DT;
      const th = Math.PI / 2 + phi0(c) * TAU + rot[i] - sample(rot, 12.2);
      const w = om[i], al = (omegaFn(t + 0.004) - omegaFn(t - 0.004)) / 0.008;
      const ax = -PIN * al * Math.sin(th) - PIN * w * w * Math.cos(th);
      const ay = PIN * al * Math.cos(th) - PIN * w * w * Math.sin(th);
      const target = Math.atan2(ax, G - ay);
      if (i === 0) psi = target;
      const acc = -k * (psi - target) - cdamp * v;
      v += acc * DT; psi += v * DT; arr[i] = psi;
    }
    TAB.sw.push(arr);
  }
  buildParticles();
}
const rotAt = (t) => sample(TAB.rot, t) - sample(TAB.rot, 12.2);
const omAt = (t) => sample(TAB.om, t);
function theta(c, t) { return Math.PI / 2 + phi0(c) * TAU + rotAt(t); }
function pinPos(c, t) { const th = theta(c, t); return [WC.x + Math.cos(th) * PIN, WC.y + Math.sin(th) * PIN]; }
function swingAt(c, t) { return sample(TAB.sw[c], t) + Math.sin(t * 1.7 + c * 1.3) * 0.022; }

// ---------- çiçek yaşam döngüsü (çarktaki konuma bağlı) ----------
const ZEV = (t) => E.smooth(seg(t, 13.64, 13.94));  // "zeval" dalgası: inen çiçekler 13.72'de birden solar
function life(c, t) {
  const ph = frac((theta(c, t) - Math.PI / 2) / TAU);   // 0 dipte, 0.25 solda (çıkış), 0.5 tepede, 0.75 sağda (iniş)
  const zk = ZEV(t);
  const open = E.smooth(seg(ph, 0.03, 0.33));
  const wilt = E.smooth(seg(ph, 0.53, 0.76)) * zk;
  const fade = E.smooth(seg(ph, 0.8, 0.93)) * zk;
  const grow = ph < 0.5 ? E.outBack(seg(ph, 0.0, 0.1), 1.4) : 1 - E.smooth(seg(ph, 0.95, 1.0)) * zk;
  return { ph, open, wilt, fade, grow };
}
const FLOW = [
  { color: '#FBF6FF', dark: '#B8A9DA', inner: '#F07BB2' },
  { color: '#F7A3C2', dark: '#C0628E', inner: '#B83A6E' },
  { color: '#FFD34E', dark: '#D9952A', inner: '#E8682E' },
  null,
  { color: '#CDB9F5', dark: '#8C7FC0', inner: '#5B3E9E' },
  { color: '#FF9466', dark: '#C8542F', inner: '#8A2E2A' },
  { color: '#FBF6FF', dark: '#B8A9DA', inner: '#E8B23A' },
  { color: '#F7A3C2', dark: '#C0628E', inner: '#F6C83B' },
];
const POTS = ['#C8642F', '#2FA3B5', '#2E5FC0', '#D99A3A', '#C8642F', '#2FA3B5', '#C8642F', '#2E5FC0'];
const GREEN = { base: '#3E9B4F', dark: '#1F6B45', light: '#9ED64A' };
const BROWN = { base: '#A8763A', dark: '#6B4424', light: '#D9A55A' };
const mixCol = (a, b, k) => ({ base: mix(a.base, b.base, k), dark: mix(a.dark, b.dark, k), light: mix(a.light, b.light, k) });

// sepetin yerel → dünya
function carXf(c, t) { const p = pinPos(c, t), s = swingAt(c, t); const cs = Math.cos(s), sn = Math.sin(s); return { p, s, f: (u, v) => [p[0] + u * cs - v * sn, p[1] + u * sn + v * cs] }; }
// bitki geometrisi (yerel)
function plantGeo(st) {
  const g = clamp(st.grow, 0, 1.2);
  const droop = st.wilt;
  const base = [0, 106];
  const head = [lerp(0, 42, droop) * g, 106 - (80 - 54 * droop) * g];   // solunca baş saksı ağzına doğru sarkar
  const mid = [lerp(0, 24, droop) * g, 106 - 56 * g];
  return { base, mid, head, g };
}

// ---------- parçacıklar: dökülen yapraklar (taç), savrulan yapraklar, kuş tüyü ----------
const TAKE = 14.2;
let PETALS = [], LEAVES = [];
function buildParticles() {
  PETALS = []; LEAVES = [];
  for (let c = 0; c < N; c++) {
    if (c === BIRD_CAR) continue;
    let prevF = 0, prevW = 0;
    for (let t = 12.2; t < T1 - 0.1; t += 1 / 120) {
      const st = life(c, t);
      if (prevW < 0.55 && st.wilt >= 0.55) { for (let k = 0; k < 3; k++) PETALS.push({ c, t0: t + k * 0.11, seed: c * 31 + k + 50 }); }
      if (prevF < 0.15 && st.fade >= 0.15) { for (let k = 0; k < 7; k++) PETALS.push({ c, t0: t + k * 0.06, seed: c * 31 + k }); }
      prevF = st.fade; prevW = st.wilt;
    }
  }
  // "zeval" (13.72): inen yarıdaki her çiçekten bir taç yaprağı patlaması
  const rb = rng(717);
  for (let c = 0; c < N; c++) {
    if (c === BIRD_CAR) continue;
    const ph = life(c, 13.72).ph;
    if (ph < 0.5 || ph > 0.97) continue;
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k / 6 - 0.5) * 2.6 + rb.range(-0.2, 0.2), v = rb.range(150, 260); PETALS.push({ c, t0: 13.72 + k * 0.012, seed: 600 + c * 13 + k, burst: true, bvx: Math.cos(a) * v + 30, bvy: Math.sin(a) * v }); }
  }
  const r = rng(77);
  for (let i = 0; i < 26; i++) {
    let c = r.int(0, N - 1); if (c === BIRD_CAR) c = (c + 1) % N;
    LEAVES.push({ c, t0: 14.58 + i * 0.045 + r.range(0, 0.08), vx: r.range(140, 340), vy: r.range(-260, -60), spin: r.range(-7, 7), a0: r.range(0, TAU), len: r.range(28, 40), side: r.sign(), seed: 900 + i, autumn: r.chance(0.35) });
  }
}

// ---------- önbellekli katmanlar ----------
const SKY_DAY = ['#1C46A6', '#2A63C2', '#2E86CE', '#45B3CF', '#9FD7E2', '#F3E3B8'];
const SKY_DUSK = ['#2B1F63', '#4E2F86', '#9C4A94', '#E0607A', '#F58F55', '#FFC968'];
function skyCv(dusk) {
  const w = C.W + 2 * M, h = 1160 + M;
  return L.hcache('s05sky' + (dusk ? 'D' : 'N'), w, h, SS, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, w, h);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: w, y1: h, w, h }, dusk ? SKY_DUSK : SKY_DAY, { seed: 51, wMin: 22, wMax: 44, lMin: 90, lMax: 280, stops: [0, 0.2, 0.42, 0.62, 0.8, 1], mixJitter: 0.06 });
  });
}
function farHillPts(w) {
  const pts = [];
  for (let i = 0; i <= 80; i++) { const u = i / 80, x = u * w; pts.push([x, 1012 + M - 40 * Math.sin(u * 5.2 + 0.6) - 22 * Math.sin(u * 11.3 + 2) - 30 * Math.exp(-Math.pow((u - 0.18) / 0.12, 2)) - 0]); }
  return pts;
}
// yakın tepenin üst çizgisi (dünya x → y): çarkın ayakları düz bir sırtta durur, yanlara doğru iner
function hillTopY(X) {
  const dx = Math.abs(X - C.W / 2), sl = Math.max(0, (dx - 235) / 520);
  return GND + 3 + 230 * sl * sl + (C.noise1(X / 240, 64) - 0.5) * 7 * Math.min(1, dx / 260);
}
function hillsCv(dusk) {
  // uzak tepeler + yakın tepe, gündüz boyanır; akşam sürümü aynı darbelerin koyu tonlanmışı (aynı biçim, ışık değişimi)
  const w = C.W + 2 * M, y0 = 900, h = C.H + M - y0;
  return L.hcache('s05hills' + (dusk ? 'D' : 'N'), w, h, SS, (x) => {
    x.translate(0, -y0);
    // uzak tepe
    const top = farHillPts(w);
    const far = top.concat([[w, 1400], [0, 1400]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 6; x.setLineDash([90, 50, 30, 70]); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(P.pathOf(far)); x.fillStyle = '#4E9AA8'; x.fillRect(0, 900, w, 600); x.restore();
    P.bandFill(x, P.pathOf(far), { x0: 0, y0: 940, x1: w, y1: 1400, w, h: 460 }, ['#7CC0C4', '#4F9EA8', '#3D8696'], { seed: 61, wMin: 14, wMax: 26, lMin: 60, lMax: 200 });
    // uzak ağaç lekeleri (servi ve yuvarlak)
    const r = rng(62);
    for (let i = 0; i < 9; i++) {
      const tx = r.range(20, w - 20); if (Math.abs(tx - (C.W / 2 + M)) < 260) continue;
      const k = Math.min(80, Math.max(0, Math.round((tx / w) * 80)));
      const ty = top[k][1] + 14;
      if (r.chance(0.5)) R.cypress(x, tx, ty, r.range(70, 110), r.int(1, 99), { base: '#2F7A6A', dark: '#1D5450', light: '#5FA88A' });
      else R.roundTree(x, tx, ty, r.range(34, 46), r.int(1, 99), { base: '#3E8F6A', dark: '#245E50', light: '#7CC08A', trunk: '#5A4A50' });
    }
    // akşam: uzak tepe + ağaçlar (şimdiye dek boyanan her şey) mor-pembe tonlanır; yakın tepe sonra boyanır
    if (dusk) {
      x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = rgba('#53306E', 0.78); x.fillRect(0, 900, w, 1100); x.restore();
      x.save(); x.globalCompositeOperation = 'source-atop'; x.strokeStyle = rgba('#FFB070', 0.5); x.lineWidth = 3; x.setLineDash([90, 40, 50, 70]); x.stroke(P.pathOf(top, false)); x.restore();
    }
    // yakın tepe (çarkın durduğu)
    const nt = [];
    for (let i = 0; i <= 80; i++) { const u = i / 80, X = u * w; nt.push([X, hillTopY(X - M)]); }
    const near = nt.concat([[w, C.H + M + 10], [0, C.H + M + 10]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 7; x.setLineDash([120, 60, 40, 90]); x.translate(0, -3); x.stroke(P.pathOf(nt, false)); x.restore();
    // gündüz: yeşil; akşam: aynı darbeler alacakaranlık moru (karanlık bir kütle değil, boyalı bir yamaç)
    const NC = dusk ? { fill: '#4A3A70', band: ['#9A6A94', '#74548C', '#56437A', '#423668', '#332C58'], ridge: '#C08AA0', g1: '#2E2650', g2: '#5E4880' }
      : { fill: '#3E9B4F', band: ['#8CCB4C', '#56AD50', '#3E9B4F', '#33904A', '#2A8246'], ridge: '#A8DA5E', g1: '#2F8A45', g2: '#7CC04B' };
    x.save(); x.clip(P.pathOf(near)); x.fillStyle = NC.fill; x.fillRect(0, 1000, w, 1000); x.restore();
    P.bandFill(x, P.pathOf(near), { x0: 0, y0: 1100, x1: w, y1: C.H + M, w, h: C.H + M - 1100 }, NC.band, { seed: 65, wMin: 18, wMax: 34, lMin: 80, lMax: 240, stops: [0, 0.1, 0.3, 0.6, 1] });
    for (let i = 0; i < 22; i++) { const k = r.int(2, 76), p0 = nt[k], p1 = nt[k + 2]; P.stroke(x, p0[0], p0[1] + 10, p1[0], p1[1] + 10, r.range(8, 14), NC.ridge, r.int(1, 1e9), { detail: 0.5 }); }
    // tepe ayağında birkaç ot öbeği (anlam bandının üstünde, sakin)
    for (let i = 0; i < 10; i++) { const gx = r.range(30, w - 30), k = Math.round(gx / w * 80), gy = nt[k][1] + r.range(48, 95), gs = r.range(26, 40), gseed = r.int(1, 999); if (Math.abs(gx - (C.W / 2 + M)) > 270) R.grass(x, gx, gy, gs, gseed, { c1: NC.g1, c2: NC.g2 }); }
    if (dusk) {
      // yakın tepe sırtına sıcak kenar ışığı (güneş tepenin ardında)
      x.save(); x.strokeStyle = rgba('#FFA868', 0.7); x.lineWidth = 5; x.setLineDash([140, 50, 60, 80]); x.stroke(P.pathOf(nt, false)); x.restore();
      x.save(); x.clip(P.pathOf(near)); x.globalCompositeOperation = 'source-atop';
      const gg = x.createLinearGradient(0, GND, 0, GND + 260); gg.addColorStop(0, rgba('#F59A6A', 0.28)); gg.addColorStop(1, rgba('#F59A6A', 0));
      x.fillStyle = gg; x.fillRect(0, GND - 40, w, 320); x.restore();
    }
  });
}
// çark ayakları (arkada)
const STAND_H = GND - WC.y + 90;
function standCv() {
  const w = 620, h = STAND_H;
  return L.hcache('s05stand', w, h, SS, (x) => {
    x.translate(w / 2, 40); // (0,0) = göbek
    const legs = [[-212, GND - WC.y], [212, GND - WC.y]];
    for (const [fx, fy] of legs) {
      const pts = [[-12, -6], [12, -6], [fx + Math.sign(fx) * 4 + 18, fy], [fx + Math.sign(fx) * 4 - 18, fy]];
      P.toneShape(x, pts, { base: '#7A4A2E', dark: '#3E2318', light: '#A86A40', seed: fx > 0 ? 11 : 12, shadowW: 0.06, lightW: 0.04, strokeAng: Math.atan2(fy, fx), texAng: Math.atan2(fy, fx), dabs: 8 });
      // taş taban
      P.toneShape(x, P.roundRectPts(fx - 34, fy - 18, 68, 30, 10), { base: '#B9B0C8', dark: '#7A7092', light: '#E6E0EE', seed: 13, shadowW: 0.3, dabs: 2 });
    }
    // çapraz kuşak
    const yb = 300;
    const xb = 212 * yb / (GND - WC.y);
    P.toneShape(x, [[-xb - 4, yb - 9], [xb + 4, yb - 9], [xb + 2, yb + 9], [-xb - 2, yb + 9]], { base: '#6E4128', dark: '#3E2318', light: '#9A6038', seed: 14, shadowW: 0.3, dabs: 5 });
  });
}
function rimCv() {
  const S = 2 * (PIN + 40);
  return L.hcache('s05rim', S, S, SS, (x) => {
    const c = S / 2, r0 = RIM - RIM_W / 2, r1 = RIM + RIM_W / 2;
    // astar kenarı
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 6; x.setLineDash([140, 60, 50, 110, 30, 80]); x.beginPath(); x.arc(c + 2, c + 2, r1 + 1, 0, TAU); x.stroke(); x.restore();
    const ring = L.ringPath(c, c, r0, r1);
    L.shadePath(x, ring, '#B9472F', '#6A2235', '#EC8656', LA, 9, 4);
    // biçimi izleyen darbeler
    const r = rng(71);
    x.save(); x.clip(ring);
    for (let i = 0; i < 70; i++) {
      const a = r.range(0, TAU), da = r.range(0.12, 0.34), rr = r.range(r0 + 3, r1 - 3);
      const arc = []; for (let k = 0; k <= 8; k++) { const aa = a + da * k / 8; arc.push([c + Math.cos(aa) * rr, c + Math.sin(aa) * rr]); }
      const lit = Math.cos(a + da / 2 - LA);
      const col = lit > 0.35 ? (r.chance(0.6) ? '#E0764A' : '#C9583A') : lit < -0.35 ? (r.chance(0.6) ? '#7E2A3A' : '#9A3A34') : (r.chance(0.5) ? '#B9472F' : '#A63E30');
      P.curveStroke(x, arc, r.range(5, 10), col, r.int(1, 1e9), { taper: true, bristles: 2 });
    }
    P.texture(x, { x0: c - r1, y0: c - r1, x1: c + r1, y1: c + r1, w: 2 * r1, h: 2 * r1, cx: c, cy: c }, 0.3, 0.5, 0.6);
    x.restore();
    // altın ince süs çizgisi
    x.strokeStyle = rgba('#F2C66A', 0.85); x.lineWidth = 2.5; x.setLineDash([60, 14]);
    x.beginPath(); x.arc(c, c, RIM, 0, TAU); x.stroke(); x.setLineDash([]);
  });
}
function innerRingCv() {
  const S = 2 * 180;
  return L.hcache('s05inner', S, S, SS, (x) => {
    const c = S / 2;
    const ring = L.ringPath(c, c, 146, 158);
    L.shadePath(x, ring, '#C98A4A', '#7A4A2E', '#EDB46E', LA, 4, 2);
    x.save(); x.clip(ring); P.texture(x, { x0: 0, y0: 0, x1: S, y1: S, w: S, h: S, cx: c, cy: c }, 0.2, 0.45, 0.5); x.restore();
  });
}
function hubCv() {
  const S = 140;
  return L.hcache('s05hub', S, S, SS, (x) => {
    const c = S / 2;
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 4; x.setLineDash([40, 20, 30, 25]); x.beginPath(); x.arc(c + 1.5, c + 1.5, 55, 0, TAU); x.stroke(); x.restore();
    P.toneShape(x, P.ellipsePts(c, c, 54, 54, 36), { base: '#C98B2E', dark: '#7A4E17', light: '#F2C66A', rim: false, seed: 21, shadowW: 0.16, lightW: 0.1, dabs: 5 });
    P.toneShape(x, P.ellipsePts(c, c, 30, 30, 28), { base: '#8A5532', dark: '#4E2C18', light: '#B9804E', rim: false, seed: 22, shadowW: 0.25, dabs: 2 });
    P.toneShape(x, P.ellipsePts(c, c, 14, 14, 20), { base: '#E8B23A', dark: '#B77F1E', light: '#FFE08A', rim: false, seed: 23, shadowW: 0.3, dabs: 1 });
  });
}
// sepet: kemerli sap + saksı (yerel: pim 0,0)
function carCv(c) {
  const w = 130, h = 180, ox = 65, oy = 12;
  return L.hcache('s05car' + c, w, h, SS, (x) => {
    x.translate(ox, oy);
    if (c === BIRD_CAR) {
      // kuş salıncağı: iki ip + dal
      x.strokeStyle = '#6B4A3A'; x.lineWidth = 2.2;
      x.beginPath(); x.moveTo(-2, 2); x.lineTo(-56, 78); x.moveTo(2, 2); x.lineTo(56, 78); x.stroke();
      const twig = []; for (let k = 0; k <= 10; k++) { const u = k / 10; twig.push([lerp(-64, 64, u), 80 - Math.sin(u * Math.PI) * 4 + (u - 0.5) * 3]); }
      P.curveStroke(x, twig, (u) => 8 - u * 2.5, '#7A4A2E', 31, { bristles: 3 });
      for (const [lx, ly, a, s] of [[-62, 80, 2.5, 19], [-54, 78, 3.6, 15], [60, 78, 0.5, 19], [54, 80, -0.6, 15]]) L.quickLeaf(x, lx, ly, s, a, GREEN);
      return;
    }
    // kemer sap (pirinç)
    const arch = []; for (let k = 0; k <= 16; k++) { const a = Math.PI * (k / 16); arch.push([-Math.cos(a) * 44, 108 - Math.sin(a) * 100]); }
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 2.5; x.setLineDash([30, 40]); x.translate(1.5, 1.5); x.stroke(P.pathOf(arch, false)); x.restore();
    P.curveStroke(x, arch, 6, '#B98A3A', 40 + c, { bristles: 2 });
    x.strokeStyle = rgba('#FFE7A0', 0.7); x.lineWidth = 1.6; x.beginPath(); for (let k = 2; k <= 8; k++) { const q = arch[k]; if (k === 2) x.moveTo(q[0] - 1.5, q[1] - 1); else x.lineTo(q[0] - 1.5, q[1] - 1); } x.stroke();
    // halka
    x.strokeStyle = '#7A4E17'; x.lineWidth = 3.5; x.beginPath(); x.arc(0, 4, 6, 0, TAU); x.stroke();
    // saksı
    const pc = POTS[c];
    const body = P.smoothPts([[-34, 112], [34, 112], [27, 160], [18, 166], [-18, 166], [-27, 160]], true, 4);
    P.toneShape(x, body, { base: pc, dark: C.coolShadow(pc, 0.22), light: C.warmLight(pc, 0.16), seed: 50 + c, shadowW: 0.16, lightW: 0.12, dabs: 4, strokeAng: Math.PI / 2, texAng: Math.PI / 2 });
    P.toneShape(x, P.roundRectPts(-40, 102, 80, 15, 5), { base: shade(pc, 0.05), dark: C.coolShadow(pc, 0.25), light: C.warmLight(pc, 0.2), seed: 60 + c, shadowW: 0.3, dabs: 2, rim: false });
    // saksı süsü: sırlı saksılarda beyaz dalga, toprakta koyu bant
    if (pc === '#2FA3B5' || pc === '#2E5FC0') { x.strokeStyle = rgba('#FBF2DC', 0.85); x.lineWidth = 3; x.beginPath(); for (let k = 0; k <= 12; k++) { const u = k / 12; const X = lerp(-28, 28, u), Y = 136 + Math.sin(u * TAU * 2) * 4; if (k) x.lineTo(X, Y); else x.moveTo(X, Y); } x.stroke(); }
    else { x.fillStyle = rgba('#7E3426', 0.45); x.fillRect(-30, 130, 60, 5); }
    // toprak
    x.fillStyle = '#4A2C24'; x.beginPath(); x.ellipse(0, 104, 34, 4, 0, 0, TAU); x.fill();
  });
}

// ---------- çizim parçaları ----------
function drawSpokes(ctx, rot) {
  const lx = Math.cos(LA), ly = Math.sin(LA);
  const all = [];
  for (let i = 0; i < N; i++) {
    const a = rot + Math.PI / 2 + (i / N) * TAU;
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const r0 = 40, r1 = RIM - RIM_W / 2 + 6, w0 = 10, w1 = 6.5;
    const q = [[WC.x + ux * r0 + nx * w0, WC.y + uy * r0 + ny * w0], [WC.x + ux * r1 + nx * w1, WC.y + uy * r1 + ny * w1], [WC.x + ux * r1 - nx * w1, WC.y + uy * r1 - ny * w1], [WC.x + ux * r0 - nx * w0, WC.y + uy * r0 - ny * w0]];
    all.push(q);
    ctx.fillStyle = '#C98A4A'; ctx.fill(P.pathOf(q));
    const lit = nx * lx + ny * ly; // +n tarafı ışığa bakıyor mu
    const sgn = lit > 0 ? -1 : 1;  // gölge tarafı
    const sh = [[q[0][0], q[0][1]], [q[1][0], q[1][1]]];
    const shadowQ = sgn > 0 ? [q[0], q[1], [WC.x + ux * r1 + nx * w1 * 0.1, WC.y + uy * r1 + ny * w1 * 0.1], [WC.x + ux * r0 + nx * w0 * 0.1, WC.y + uy * r0 + ny * w0 * 0.1]]
      : [[WC.x + ux * r0 - nx * w0 * 0.1, WC.y + uy * r0 - ny * w0 * 0.1], [WC.x + ux * r1 - nx * w1 * 0.1, WC.y + uy * r1 - ny * w1 * 0.1], q[2], q[3]];
    ctx.fillStyle = mix('#7A4A2E', '#C98A4A', clamp(1 - Math.abs(lit) * 1.4, 0, 0.6)); ctx.fill(P.pathOf(shadowQ));
    const s2 = -sgn;
    ctx.strokeStyle = rgba('#F2C27E', 0.65 * Math.abs(lit) + 0.15); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(WC.x + ux * (r0 + 6) + nx * w0 * 0.7 * s2, WC.y + uy * (r0 + 6) + ny * w0 * 0.7 * s2); ctx.lineTo(WC.x + ux * (r1 - 6) + nx * w1 * 0.7 * s2, WC.y + uy * (r1 - 6) + ny * w1 * 0.7 * s2); ctx.stroke();
    void sh;
  }
  const path = L.unionPath(all);
  ctx.save(); ctx.clip(path); P.texture(ctx, { x0: WC.x - RIM, y0: WC.y - RIM, x1: WC.x + RIM, y1: WC.y + RIM, w: 2 * RIM, h: 2 * RIM, cx: WC.x, cy: WC.y }, rot + 0.4, 0.45, 0.5); ctx.restore();
}
function drawBolts(ctx, rot) {
  for (let i = 0; i < N * 2; i++) {
    const a = rot + Math.PI / 2 + (i / (N * 2)) * TAU;
    const big = i % 2 === 0;
    const rr = big ? RIM : RIM;
    const x = WC.x + Math.cos(a) * rr, y = WC.y + Math.sin(a) * rr;
    if (big) {
      ctx.fillStyle = '#7A4E17'; ctx.beginPath(); ctx.arc(x + 1.2, y + 1.6, 7.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#E8B23A'; ctx.beginPath(); ctx.arc(x, y, 6.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FFE7A0'; ctx.beginPath(); ctx.arc(x - 2, y - 2, 2.4, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = rgba('#FBEFD2', 0.85); ctx.beginPath(); ctx.ellipse(x, y, 4.5, 3, a, 0, TAU); ctx.fill();
    }
  }
  // göbek cıvataları
  for (let i = 0; i < 6; i++) {
    const a = rot + (i / 6) * TAU, x = WC.x + Math.cos(a) * 42, y = WC.y + Math.sin(a) * 42;
    ctx.fillStyle = '#7A4E17'; ctx.beginPath(); ctx.arc(x + 1, y + 1, 4.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFE08A'; ctx.beginPath(); ctx.arc(x, y, 3.4, 0, TAU); ctx.fill();
  }
}
function drawPlant(ctx, c, t, st, X) {
  // X: yerel → dünya
  const fl = FLOW[c];
  const pg = plantGeo(st);
  if (pg.g <= 0.01) return;
  const leafCol = mixCol(GREEN, BROWN, st.wilt * 0.85);
  const stemCol = mix('#3E8A45', '#8A6A3A', st.wilt * 0.8);
  const line = [];
  for (let k = 0; k <= 8; k++) {
    const u = k / 8;
    const x = lerp(lerp(pg.base[0], pg.mid[0], u), lerp(pg.mid[0], pg.head[0], u), u), y = lerp(lerp(pg.base[1], pg.mid[1], u), lerp(pg.mid[1], pg.head[1], u), u);
    line.push(X(x, y));
  }
  P.curveStroke(ctx, line, (u) => 5.8 - u * 2.2, stemCol, 300 + c, { bristles: 1, detail: 0.5 });
  // yapraklar (soldukça sarkar)
  const sw = Math.sin(t * 2.3 + c) * 0.06;
  for (const [u, sd, len] of [[0.35, -1, 29], [0.58, 1, 25]]) {
    const q = line[Math.round(u * 8)];
    const ang = -Math.PI / 2 + sd * lerp(1.0, 2.0, st.wilt) + sw + swingAt(c, t);
    L.quickLeaf(ctx, q[0], q[1], len * Math.min(1, pg.g), ang, leafCol);
  }
  // çiçek / tomurcuk
  const hp = line[8];
  // dipte: taç yaprakları dökülür, kurumuş baş büzülür (saydam hayalet yerine)
  const a = 1 - E.smooth(seg(st.fade, 0.55, 1));
  if (a <= 0.01) return;
  const sc = Math.min(1, pg.g) * (1 - 0.5 * st.fade);
  ctx.save(); ctx.globalAlpha *= a;
  const budK = 1 - E.smooth(seg(st.open, 0.12, 0.42));
  if (budK > 0.01) {
    // tomurcuk: yeşil çanak + renkli uç
    const bs = 17 * sc;
    const bud = P.smoothPts([[0, 2], [bs * 0.55, -bs * 0.4], [bs * 0.2, -bs * 1.1], [0, -bs * 1.35], [-bs * 0.2, -bs * 1.1], [-bs * 0.55, -bs * 0.4]], true, 4).map(([u, v]) => { const s = swingAt(c, t); return [hp[0] + u * Math.cos(s) - v * Math.sin(s), hp[1] + u * Math.sin(s) + v * Math.cos(s)]; });
    ctx.save(); ctx.globalAlpha *= budK;
    L.blob(ctx, bud, fl.color === '#FBF6FF' ? '#F6C1D3' : fl.color, { dark: fl.dark, la: LA, size: bs * 0.8 });
    const cal = P.smoothPts([[0, 2], [bs * 0.6, -bs * 0.35], [bs * 0.25, -bs * 0.55], [0, -bs * 0.3], [-bs * 0.25, -bs * 0.55], [-bs * 0.6, -bs * 0.35]], true, 4).map(([u, v]) => [hp[0] + u, hp[1] + v]);
    L.blob(ctx, cal, '#3E9B4F', { dark: '#1F6B45', light: '#8CCB4C', la: LA, size: bs * 0.5 });
    ctx.restore();
  }
  const op = st.open;
  if (op > 0.12) {
    R.flower(ctx, hp[0], hp[1], 32 * sc, 40 + c * 7, { open: op, wilt: st.wilt, color: mix(fl.color, '#A87448', st.wilt * 0.5), dark: mix(fl.dark, '#6E4A2E', st.wilt * 0.5), inner: mix(fl.inner, '#5A3A22', st.wilt * 0.6), tilt: swingAt(c, t) + st.wilt * 1.1 });
  }
  ctx.restore();
}
function drawCar(ctx, c, t) {
  const xf = carXf(c, t);
  const cv = carCv(c);
  // kuşlar gidince boş salıncak usulca kaybolur (hızlı dönüşte yana kalkık bir ok gibi durmasın)
  const ga = c === BIRD_CAR ? 1 - E.smooth(seg(t, TAKE + 0.35, TAKE + 0.75)) : 1;
  if (ga <= 0.01) return xf;
  ctx.save(); ctx.globalAlpha *= ga; ctx.translate(xf.p[0], xf.p[1]); ctx.rotate(xf.s);
  ctx.drawImage(cv, -65, -12, 130, 180);
  ctx.restore();
  if (c !== BIRD_CAR) drawPlant(ctx, c, t, life(c, t), xf.f);
  return xf;
}

// ---------- kuşlar ----------
function birds(ctx, t) {
  const xf = carXf(BIRD_CAR, Math.min(t, TAKE));
  const s = 80;
  for (const [k, col, dir0] of [[0, L.BIRD_A, 1], [1, L.BIRD_B, -1]]) {
    const perch = xf.f(k === 0 ? -40 : 40, 80 - 24);
    if (t < TAKE) {
      const cr = E.smooth(seg(t, TAKE - 0.22, TAKE - 0.02));
      const nuzzle = Math.sin(t * 3.1 + k * 2) * 0.03;
      const blink = (t > 12.95 && t < 13.05 && k === 0) || (t > 13.4 && t < 13.48 && k === 1) ? 1 : 0;
      L.bird(ctx, perch[0], perch[1] + cr * 3, s, { col, dir: dir0, rot: xf.s + dir0 * (0.06 + nuzzle) * (1 - cr), crouch: cr, seed: 70 + k, blink, headDy: Math.sin(t * 4 + k) * 0.01 });
    } else {
      const u = t - TAKE;
      const sx = -1; // kalkış karesinde döner (kanat açılışıyla birlikte tek karede)
      const away = -dir0; // birbirinden uzağa
      const p0 = perch;
      // iki kuş zıt yönlere: önce hızlı bir sıçrayışla yükselir, sonra gökte yana süzülerek uzaklaşır
      const q = [p0[0] + away * (170 * u + 250 * u * u) * (k === 0 ? 1 : 0.94), p0[1] - 150 * (1 - Math.exp(-u * 4.2)) + 55 * u * u + (k === 0 ? 0 : 12 * u)];
      const bob = Math.sin(u * TAU * 6.5) * 4;
      if (u < 1.7) L.bird(ctx, q[0], q[1] + bob, s * (1 + u * 0.12), { col, dir: dir0, sx, flap: u * TAU * 6.5 + Math.PI * 0.5, rot: away * -0.32 * (1 - E.smooth(seg(u, 0.05, 0.7))) + 0.04 * away, seed: 70 + k });
    }
  }
  // tüy: kalkışta dökülen tek tüy, salınarak iner
  if (t > TAKE + 0.05 && t < TAKE + 2.6) {
    const u = t - TAKE - 0.05;
    const p0 = xf.f(0, 66);
    const x = p0[0] + Math.sin(u * 3.2) * 26 + u * 22, y = p0[1] + u * 95;
    const a = 0.9 * (1 - E.smooth(seg(u, 1.8, 2.5)));
    const ang = Math.sin(u * 3.2 + 1) * 0.6 + 0.4;
    ctx.save(); ctx.globalAlpha *= a;
    const pts = P.smoothPts([[0, 0], [5, -9], [3, -19], [0, -23], [-3, -19], [-5, -9]], true, 4).map(([u2, v2]) => [x + u2 * Math.cos(ang) - v2 * Math.sin(ang), y + u2 * Math.sin(ang) + v2 * Math.cos(ang)]);
    ctx.fillStyle = '#F7A2B6'; ctx.fill(P.pathOf(pts));
    ctx.strokeStyle = '#B9406A'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sin(ang) * -20, y + Math.cos(ang) * -20); ctx.stroke();
    ctx.restore();
  }
}

// ---------- parçacık çizimi ----------
function drawPetals(ctx, t) {
  for (const p of PETALS) {
    const u = t - p.t0;
    if (u < 0 || u > 2.4) continue;
    const st = life(p.c, p.t0), xf = carXf(p.c, p.t0);
    const pg = plantGeo(st);
    const line8 = xf.f(pg.head[0], pg.head[1]);
    const r = rng(p.seed);
    const vx = r.range(20, 90), wob = r.range(10, 22), fr = r.range(3, 5.5);
    let x = line8[0] + vx * u + 70 * u * u + Math.sin(u * fr + p.seed) * wob, y = line8[1] + 20 * u + 120 * u * u;
    if (p.burst) { const dmp = (1 - Math.exp(-2.6 * u)) / 2.6; x = line8[0] + p.bvx * dmp + 40 * u * u + Math.sin(u * fr + p.seed) * wob * 0.6; y = line8[1] + p.bvy * dmp + 150 * u * u; }
    // yere (tepe çimine) değince solar: anlam bandına düşmesin
    const a = (1 - E.smooth(seg(u, 1.7, 2.4))) * (1 - E.smooth(seg(y, GND - 30, GND + 15)));
    if (a <= 0.01) continue;
    const ang = u * r.range(-4, 4) + r.range(0, TAU);
    const fl = FLOW[p.c];
    const col = mix(fl.color, '#C9A27A', p.burst ? 0.18 : 0.45);
    const L2 = r.range(17, 23) * (p.burst ? 1.15 : 1), W2 = L2 * 0.5;
    // yuvarlak uçlu taç yaprağı; dönerken yassılır (çırpınma)
    const fy = 0.35 + 0.65 * Math.abs(Math.cos(u * fr + p.seed));
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const pts = P.smoothPts([[0, 0], [L2 * 0.35, -W2 * 0.55], [L2 * 0.82, -W2 * 0.42], [L2, 0], [L2 * 0.82, W2 * 0.42], [L2 * 0.35, W2 * 0.55]], true, 4)
      .map(([px, py]) => { const X = px - L2 / 2, Y = py * fy; return [x + X * ca - Y * sa, y + X * sa + Y * ca]; });
    ctx.save(); ctx.globalAlpha *= a;
    L.blob(ctx, pts, col, { dark: mix(fl.dark, '#8A6A4A', 0.4), light: shade(col, 0.08), la: LA, size: W2 * 0.9, ks: 0.4, kl: 0.15 });
    ctx.restore();
  }
}
function drawLeaves(ctx, t) {
  for (const lf of LEAVES) {
    const u = t - lf.t0;
    if (u < 0 || u > 2.6) continue;
    const xf = carXf(lf.c, lf.t0);
    const st = life(lf.c, lf.t0);
    const pg = plantGeo(st);
    const s0 = xf.f(lerp(pg.base[0], pg.head[0], 0.45), lerp(pg.base[1], pg.head[1], 0.45));
    const th = theta(lf.c, lf.t0), w = omAt(lf.t0);
    const tvx = -Math.sin(th) * PIN * w * 0.7, tvy = Math.cos(th) * PIN * w * 0.7;
    const x = s0[0] + (lf.vx + tvx) * u + 110 * u * u, y = s0[1] + (lf.vy + tvy) * u + 90 * u * u + Math.sin(u * 4 + lf.seed) * 14;
    const a = (1 - E.smooth(seg(u, 2.0, 2.6))) * (1 - E.smooth(seg(y, GND - 20, GND + 20)));
    if (a <= 0.01) continue;
    const col = lf.autumn ? { base: '#E39A3A', dark: '#A8542A', light: '#F6C65A' } : mixCol(GREEN, BROWN, st.wilt * 0.8);
    ctx.save(); ctx.globalAlpha *= a;
    L.quickLeaf(ctx, x, y, lf.len * (0.85 + 0.15 * Math.abs(Math.cos(u * 5 + lf.seed))), lf.a0 + lf.spin * u, col);
    ctx.restore();
  }
}
// hız çizgileri (hızlı dönüşte, sepetlerin arkasında yay darbeler)
function speedLines(ctx, t, rot) {
  const w = omAt(t);
  const a = clamp((w - 0.7) / 0.8) * (1 - E.smooth(seg(t, 15.9, 16.4)));
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha *= a * 0.48;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < 2; j++) {
      const a1 = rot + Math.PI / 2 + (i / N) * TAU - 0.06 - j * 0.05, len = (0.18 + 0.22 * clamp((w - 0.7) / 0.8)) * (1 - j * 0.3);
      const rr = RIM + 34 + j * 20;
      const arc = []; for (let k = 0; k <= 10; k++) { const aa = a1 - len * k / 10; arc.push([WC.x + Math.cos(aa) * rr, WC.y + Math.sin(aa) * rr]); }
      P.curveStroke(ctx, arc, (u) => (9 - j * 3) * (1 - u * 0.9), '#FFF6E2', 800 + i * 3 + j, { bristles: 2, detail: 0.4 });
    }
  }
  ctx.restore();
}

function drawWheel(ctx, t) {
  const rot = rotAt(t);
  const st = standCv(); ctx.drawImage(st, WC.x - 310, WC.y - 40, 620, STAND_H);
  speedLines(ctx, t, rot);
  const inner = innerRingCv(); ctx.drawImage(inner, WC.x - 180, WC.y - 180, 360, 360);
  drawSpokes(ctx, rot);
  const S = 2 * (PIN + 40); ctx.drawImage(rimCv(), WC.x - S / 2, WC.y - S / 2, S, S);
  ctx.drawImage(hubCv(), WC.x - 70, WC.y - 70, 140, 140);
  drawBolts(ctx, rot);
  for (let c = 0; c < N; c++) drawCar(ctx, c, t);
  birds(ctx, t);
  drawPetals(ctx, t);
  drawLeaves(ctx, t);
}

// ön plan: köşelerde rüzgârda eğilen uzun otlar ve kır çiçekleri (yakın planda derinlik; geri çekilirken aşağı kayar)
const FG = (() => {
  const r = rng(808), blades = [], flowers = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 26; i++) {
      const bx = (side < 0 ? 70 : 1010) + r.range(-150, 150) * (0.4 + 0.6 * r.next());
      if (Math.abs(bx - 540) < 300) continue;
      blades.push({ bx, hh: r.range(150, 330), lean: side * r.range(0.02, 0.22), w: r.range(10, 17), col: r.pick(['#1E5E3E', '#226F42', '#2F8A45', '#2A7A44']), ph: r.range(0, TAU), seed: r.int(1, 1e9) });
    }
    for (let i = 0; i < 3; i++) flowers.push({ bx: (side < 0 ? 95 : 985) + (i - 1) * 70 * (0.7 + r.next() * 0.5), hh: r.range(230, 330), s: r.range(30, 40), ph: r.range(0, TAU), kind: r.int(0, 2), seed: r.int(1, 999), side });
  }
  return { blades, flowers };
})();
const FG_FLOW = [{ color: '#E6E0F0', dark: '#9A90BE', inner: '#C9952E' }, { color: '#C8504A', dark: '#8A2E3A', inner: '#2A1A2A' }, { color: '#DCD2EA', dark: '#8C82B4', inner: '#B98A3A' }];
function foreground(ctx, t, pull) {
  const off = E.inCubic(pull) * 560;
  if (off > 540) return;
  const dk = E.inOutSine(seg(t, 14.9, 16.4)) * 0.88;
  const SIL = '#2A2046';
  const wind = 0.06 + 0.2 * E.inOutSine(seg(t, 14.55, 15.1)) - 0.08 * E.smooth(seg(t, 15.8, 16.6));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const by = 1960 + off;
  for (const b of FG.blades) {
    const lean = b.lean + wind * (1 + 0.35 * Math.sin(t * 2.4 + b.ph));
    const line = []; for (let k = 0; k <= 8; k++) { const u = k / 8; line.push([b.bx + Math.sin(lean) * b.hh * u * u, by - b.hh * u * Math.cos(lean * 0.5)]); }
    P.curveStroke(ctx, line, (u) => b.w * (1 - u * 0.88), mix(b.col, SIL, dk), b.seed, { bristles: 2, detail: 0.5 });
  }
  for (const f of FG.flowers) {
    const lean = f.side * 0.06 + wind * (1 + 0.3 * Math.sin(t * 2.1 + f.ph));
    const line = []; for (let k = 0; k <= 8; k++) { const u = k / 8; line.push([f.bx + Math.sin(lean) * f.hh * u * u, by - f.hh * u]); }
    P.curveStroke(ctx, line, (u) => 6 - u * 2.5, mix('#2A7040', SIL, dk), f.seed, { bristles: 1, detail: 0.4 });
    const hp = line[8], fc = FG_FLOW[f.kind];
    R.flower(ctx, hp[0], hp[1], f.s, f.seed, { open: 1, color: mix(fc.color, '#4A3A66', dk), dark: mix(fc.dark, SIL, dk), inner: mix(fc.inner, SIL, dk), tilt: lean * 1.5 });
  }
  ctx.restore();
}
// gün batımı ışık hüzmeleri (çarkın parmaklıkları arasından süzülen)
function rays(ctx, sn, k) {
  if (k <= 0.01) return;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(sn.x, sn.y, sn.R * 0.8, sn.x, sn.y, 1300);
  g.addColorStop(0, rgba('#FFC890', 0.11 * k)); g.addColorStop(0.5, rgba('#FFC890', 0.05 * k)); g.addColorStop(1, rgba('#FFC890', 0));
  for (let i = 0; i < 11; i++) {
    const a = -Math.PI / 2 + (i - 5) * 0.27, wdt = 0.035 + (i % 3) * 0.012;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(sn.x, sn.y);
    ctx.lineTo(sn.x + Math.cos(a - wdt) * 1500, sn.y + Math.sin(a - wdt) * 1500); ctx.lineTo(sn.x + Math.cos(a + wdt) * 1500, sn.y + Math.sin(a + wdt) * 1500);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// alçak güneş çarkın ardında: ayakların uzun gölgeleri izleyiciye doğru yelpaze gibi açılır
function longShadows(ctx, k) {
  const V = [540, 1000];
  ctx.save();
  const g = ctx.createLinearGradient(0, GND, 0, GND + 760);
  g.addColorStop(0, rgba('#1E1636', 0.36 * k)); g.addColorStop(0.55, rgba('#1E1636', 0.16 * k)); g.addColorStop(1, rgba('#1E1636', 0));
  ctx.fillStyle = g;
  for (const sg of [-1, 1]) {
    const fx = WC.x + sg * 216, fy = GND + 4;
    const pts = [];
    for (const [ox, far] of [[-15, 0], [15, 0], [15, 1], [-15, 1]]) {
      const bx = fx + ox, dx = bx - V[0], dy = fy - V[1];
      const tt = far ? (GND + 820 - V[1]) / dy : 1;
      pts.push([V[0] + dx * tt + (far ? ox * 5 : 0), V[1] + dy * tt]);
    }
    ctx.fill(P.pathOf(pts));
  }
  ctx.restore();
}

let LAYER = null;
function sunAt(t) {
  const k = E.inOutSine(seg(t, 12.0, 16.9));
  const p0 = [255, 335], pc = [300, 800], p1 = [540, 880];
  return { x: lerp(lerp(p0[0], pc[0], k), lerp(pc[0], p1[0], k), k), y: lerp(lerp(p0[1], pc[1], k), lerp(pc[1], p1[1], k), k), R: lerp(100, 225, E.inQuad(k)), k };
}

module.exports = {
  init() { buildTables(); },
  draw(ctx, t) {
    if (!TAB) buildTables();
    // kamera: yakın plandan (çark kadrajı doldurur) 15.55'te geri çekilme
    const pull = E.inOutCubic(seg(t, 15.55, 16.8));
    const z0 = lerp(1.34, 1.28, E.inOutSine(seg(t, 12.2, 15.55)));
    const zoom = lerp(z0, 1.08, pull) - 0.014 * E.smooth(seg(t, 16.8, 17.8));
    const [bx, by] = R.breathe(t, 3, 55);
    const cy0 = 700 + (960 - 624) / z0;
    R.camera(ctx, { zoom, cx: lerp(540 + 10 * Math.sin(t * 0.4), 540, pull) + bx, cy: lerp(cy0, 1000, pull) + by });
    // gök: gündüz → gün batımı (aynı darbeler, renk değişir)
    const dk = E.inOutSine(seg(t, 14.9, 16.4));
    ctx.drawImage(skyCv(false), -M, -M, C.W + 2 * M, 1160 + M);
    if (dk > 0.003) { ctx.save(); ctx.globalAlpha = dk; ctx.drawImage(skyCv(true), -M, -M, C.W + 2 * M, 1160 + M); ctx.restore(); }
    // güneş: sol üstten çarkın arkasına, ufka doğru iner
    const sn = sunAt(t);
    L.sun2(ctx, sn.x, sn.y, sn.R, t, { glow: mix('#FFE9A0', '#FFB067', dk), ring: mix('#F6D23A', '#F7843A', dk), disk: mix('#FFF3C4', '#FFD08A', dk), seed: 4 });
    if (dk > 0.01) P.glow(ctx, sn.x, sn.y, sn.R * 4.2, '#FF9A5A', 0.35 * dk);
    // tepeler
    const hy0 = 900;
    ctx.drawImage(hillsCv(false), -M, hy0, C.W + 2 * M, C.H + M - hy0);
    if (dk > 0.003) { ctx.save(); ctx.globalAlpha = dk; ctx.drawImage(hillsCv(true), -M, hy0, C.W + 2 * M, C.H + M - hy0); ctx.restore(); }
    // çark (gün batımında siluet)
    const sil = E.smooth(seg(t, 15.65, 16.5)) * 0.9;
    if (sil > 0.01) {
      longShadows(ctx, sil);
      // ışık hüzmeleri ve güneş parlaması çarkın ARDINDA (siluet saydam görünmesin)
      P.glow(ctx, sn.x, sn.y, sn.R * 2.2, '#FFB070', 0.22 * sil);
      rays(ctx, sn, sil);
    }
    if (sil <= 0.001) {
      drawWheel(ctx, t);
    } else {
      if (!LAYER) LAYER = createCanvas(C.W, C.H);
      const lx = LAYER.getContext('2d');
      lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.globalAlpha = 1; lx.clearRect(0, 0, C.W, C.H);
      lx.setTransform(ctx.getTransform());
      drawWheel(lx, t);
      lx.setTransform(1, 0, 0, 1, 0, 0);
      lx.globalCompositeOperation = 'source-atop'; lx.fillStyle = rgba('#24183A', sil); lx.fillRect(0, 0, C.W, C.H);
      lx.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(LAYER, 0, 0); ctx.restore();
    }
    foreground(ctx, t, pull);
  },
  sfx: [
    { t: 12.88, type: 'rumble', gain: 0.22 },
    { t: 13.72, type: 'rustle', gain: 0.28 },
    { t: 14.2, type: 'birds', gain: 0.32 },
    { t: 14.6, type: 'wind', gain: 0.35 },
    { t: 15.6, type: 'swell', gain: 0.28 },
  ],
};
