// S21 — "Lâyemut değilsin, başıboş değilsin, bir vazifen var." (85.70–90.50)
// İç dünya: durgun suya yansıyan yıldızlı gece (uzay değil). Adam suyun üstünde ayakta; ayaklarından halkalar yayılır
// (s20'deki ses dalgalarının devamı). 86.10 "Lâyemut değilsin": yanında dev kum saati, üst hazne boşalmış, son taneler
// tek tek düşer. 87.80 "başıboş değilsin": kum altın zerrelere dönüşüp bir pusulanın halkasını örer; ibre çılgınca döner,
// sonra yukarıdaki parlak yıldıza kilitlenir. 89.26 "bir vazifen var": yıldızdan inen kıvılcım adamın ellerinde yanan bir
// fenere dönüşür; ışık etrafı aydınlatır, suyun üstünde ileriye uzanan basamak taşları tek tek parlar.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const L = require('./_s21_lib');
const { seg, E, lerp, clamp, rgba, mix, TAU, rng } = C;
const d = C.deg;

const HY = 1000;                                  // ufuk (gök ile su)
const MAN = { x: 330, y: 1172, h: 540 };
const HG = { x: 752, y: 1136, s: 640 };          // kum saati
const CP = { x: 648, y: 690, R: 232 };           // pusula
const STAR = { x: 660, y: 212 };
const LAN_S = 84;                                 // fener ölçeği
const BG = { x0: -140, y0: -170, x1: 1220, y1: 2080 };

// ---------- zaman çizelgesi ----------
const T = {
  hgPop: 85.8, lastGrain: 87.06, dis0: 87.34, cpPop: 87.68, spin0: 87.78, lock: 88.6,
  cpOut: 88.86, spark0: 88.9, lan: 89.24, var: 89.92,
};
const GRAINS = [85.9, 86.0, 86.1, 86.21, 86.33, 86.46, 86.6, 86.76, 86.92, 87.06];
const FALL = 0.17;

// ---------- arka plan ----------
function bgCache() {
  const w = BG.x1 - BG.x0, h = BG.y1 - BG.y0;
  return L.hcache('s21bg', BG.x0, BG.y0, w, h, 1.15, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(BG.x0, BG.y0, w, h);
    const sky = { x0: BG.x0, y0: BG.y0, x1: BG.x1, y1: HY + 6, w, h: HY + 6 - BG.y0 };
    x.save(); x.beginPath(); x.rect(sky.x0, sky.y0, sky.w, sky.h); x.clip();
    const sg = x.createLinearGradient(0, BG.y0, 0, HY); sg.addColorStop(0, '#0C0E30'); sg.addColorStop(0.6, '#1E2A6A'); sg.addColorStop(1, '#4A55A0');
    x.fillStyle = sg; x.fillRect(sky.x0, sky.y0, sky.w, sky.h);
    P.bandFill(x, null, sky, ['#0A0C2A', '#10153F', '#18205A', '#223070', '#2F4088', '#46559E', '#6A6FB6'],
      { seed: 2131, stops: [0, 0.2, 0.38, 0.56, 0.72, 0.87, 1], wMin: 22, wMax: 40, lMin: 100, lMax: 300, mixJitter: 0.05 });
    // ufka yakın ince bulut şeritleri
    const r = rng(2132);
    for (let i = 0; i < 14; i++) {
      const yy = r.range(640, HY - 30), x0 = r.range(BG.x0, BG.x1), len = r.range(160, 420);
      P.stroke(x, x0, yy, x0 + len, yy + r.range(-4, 4), r.range(10, 18), rgba(r.chance(0.5) ? '#7C80C4' : '#5A64AC', r.range(0.35, 0.6)), r.int(1, 1e9), { detail: 0.5, taper1: 0.5 });
    }
    x.restore();
    // su
    const wat = { x0: BG.x0, y0: HY, x1: BG.x1, y1: BG.y1, w, h: BG.y1 - HY };
    x.save(); x.beginPath(); x.rect(wat.x0, wat.y0, wat.w, wat.h); x.clip();
    const wg = x.createLinearGradient(0, HY, 0, BG.y1); wg.addColorStop(0, '#5A62AA'); wg.addColorStop(0.2, '#28367A'); wg.addColorStop(0.55, '#151B4C'); wg.addColorStop(1, '#0B0E2E');
    x.fillStyle = wg; x.fillRect(wat.x0, wat.y0, wat.w, wat.h);
    P.bandFill(x, null, wat, ['#7274BA', '#4C589F', '#2E3C82', '#1D2762', '#131948', '#0B0E2E'],
      { seed: 2133, stops: [0, 0.07, 0.18, 0.36, 0.62, 1], wMin: 10, wMax: 22, lMin: 140, lMax: 420, mixJitter: 0.04 });
    // suda ince parıltı çizgileri
    for (let i = 0; i < 60; i++) {
      const yy = HY + Math.pow(r.next(), 1.7) * 820, x0 = r.range(BG.x0, BG.x1), len = r.range(60, 260) * (0.4 + (yy - HY) / 900);
      P.stroke(x, x0, yy, x0 + len, yy + r.range(-1, 1), r.range(2, 5) * (0.5 + (yy - HY) / 700), rgba(r.chance(0.6) ? '#9EA4E0' : '#0E1238', r.range(0.25, 0.5)), r.int(1, 1e9), { detail: 0, taper1: 0.4 });
    }
    x.restore();
    // uzak alçak adalar ve suya yansımaları
    const isle = (xa, xb, hh, seed) => {
      const top = []; const n = 30;
      for (let i = 0; i <= n; i++) { const u = i / n; top.push([lerp(xa, xb, u), HY - hh * Math.pow(Math.sin(Math.PI * u), 0.7) * (0.8 + 0.2 * Math.sin(u * 11 + seed))]); }
      const pts = top.concat([[xb, HY + 1], [xa, HY + 1]]);
      P.toneShape(x, pts, { base: '#1A1F52', dark: '#12163E', light: '#2C3478', seed, shadowW: 0.04, lightW: 0.03, dabs: 6, rimW: 2.5, texture: 0.3 });
      const ref = top.map(([a, b]) => [a, 2 * HY - b]).concat([[xb, HY - 1], [xa, HY - 1]]);
      x.save(); x.globalAlpha = 0.45; P.flat(x, ref, '#151A48'); x.restore();
    };
    isle(-140, 330, 38, 2141); isle(250, 420, 16, 2142); isle(820, 1220, 26, 2143);
    // ufuk ışığı
    for (let i = 0; i < 16; i++) {
      const x0 = BG.x0 + i * 95 + r.range(-30, 30);
      P.stroke(x, x0, HY + r.range(-1, 2), x0 + r.range(80, 160), HY + r.range(-1, 2), r.range(2.5, 4.5), rgba('#B6B4EC', r.range(0.45, 0.8)), r.int(1, 1e9), { detail: 0, taper1: 0.4 });
    }
  });
}
// dalgacık örtüsü (yansımaların üstüne)
function rippleCache() {
  return L.hcache('s21rip', BG.x0, HY, BG.x1 - BG.x0 + 200, BG.y1 - HY, 1, (x) => {
    const r = rng(2151);
    for (let i = 0; i < 420; i++) {
      const dy = Math.pow(r.next(), 1.25) * (BG.y1 - HY), yy = HY + dy;
      const len = r.range(30, 140) * (0.3 + dy / 600), w = r.range(1.5, 4) * (0.5 + dy / 500);
      const xx = r.range(BG.x0, BG.x1 + 200);
      const col = r.chance(0.5) ? rgba('#A8AEEA', r.range(0.12, 0.3)) : rgba('#0A0D2C', r.range(0.25, 0.45));
      P.stroke(x, xx, yy, xx + len, yy + r.range(-0.6, 0.6), w, col, r.int(1, 1e9), { detail: 0, taper1: 0.5 });
    }
  });
}
const STARS = L.starList(2161, 170, { x0: BG.x0, y0: BG.y0, x1: BG.x1, y1: HY - 24 }, { bias: 1.35, bigP: 0.07 });

// ---------- adam ----------
const pose = (o) => M.pose(o);
const IDLE = pose({ torso: d(2), neck: d(3), head: d(-2), armN: d(3), elbowN: d(10), handN: d(6), armF: d(-4), elbowF: d(9), eye: 1, brow: 0.1 });
const WATCH = pose(Object.assign({}, IDLE, { torso: d(5), neck: d(5), head: d(3), brow: 0.45, mouth: -0.1 }));
const SOBER = pose(Object.assign({}, WATCH, { head: d(10), neck: d(7), eye: 0.72, brow: 0.55, mouth: -0.25, armN: d(1), armF: d(-2) }));
const LOOKC = pose(Object.assign({}, IDLE, { torso: d(3), neck: d(2), head: d(-3), eye: 1, brow: 0.15, armN: d(6), elbowN: d(14) }));
const LOOKUP = pose(Object.assign({}, IDLE, { torso: d(-3), neck: d(-12), head: d(-30), eye: 1, brow: -0.25, mouth: 0.12, armN: d(7), elbowN: d(16), armF: d(-1) }));
const CATCH = pose({ torso: d(6), neck: d(6), head: d(18), armN: d(46), elbowN: d(60), handN: d(-12), armF: d(40), elbowF: d(64), handF: d(-12), grip: 0.2, eye: 0.9, brow: 0, mouth: 0.2 });
const HOLD = pose({ torso: d(3), neck: d(6), head: d(15), armN: d(30), elbowN: d(68), handN: d(-6), grip: 0.78, armF: d(4), elbowF: d(14), eye: 0.88, brow: -0.05, mouth: 0.32 });
const RESOLVE = pose({ torso: d(1), neck: d(2), head: d(-6), armN: d(42), elbowN: d(58), handN: d(-6), grip: 0.78, armF: d(-3), elbowF: d(12), eye: 1, mouth: 0.15, brow: -0.12 });

function poseAt(t) {
  let p = IDLE;
  const steps = [[86.0, 86.38, WATCH], [87.18, 87.5, SOBER], [87.7, 88.0, LOOKC], [88.58, 88.86, LOOKUP], [88.96, 89.2, CATCH], [89.22, 89.44, HOLD], [89.84, 90.16, RESOLVE]];
  for (const [a, b, q] of steps) { const k = E.inOutCubic(seg(t, a, b)); if (k > 0) p = M.lerpPose(p, q, k); }
  const o = Object.assign({}, p);
  const br = Math.sin(t * 2.3);
  o.torso += d(0.8) * br; o.neck -= d(0.5) * br; o.armN += d(1) * br; o.armF += d(0.8) * br;
  if ((t > 86.84 && t < 86.92) || (t > 89.62 && t < 89.69)) o.eye = 0.1;
  // kilit anında hafif irkilme
  const j = t > T.lock ? Math.exp(-(t - T.lock) * 8) : 0; o.torso -= d(2) * j;
  return o;
}
// kıvılcımın varacağı nokta (CATCH pozunda iki elin arası)
let _catchPt = null;
function catchPoint() {
  if (_catchPt) return _catchPt;
  const s = M.skeleton(CATCH, MAN.h);
  const a = s.armN, b = s.armF;
  const x = (a.tip[0] + b.tip[0]) / 2, y = (a.tip[1] + b.tip[1]) / 2 - 0.02 * MAN.h;
  _catchPt = [MAN.x + x, MAN.y + y];
  return _catchPt;
}

// ---------- pusula ibresi ----------
const TARGET = Math.atan2(STAR.x - CP.x, CP.y - STAR.y);
function needleAt(t) {
  const k = seg(t, T.spin0, T.lock);
  const spin = -(2.6 * TAU + 2.0) * (1 - E.outCubic(k));
  const wild = (0.55 * Math.sin(t * 29) * Math.sin(t * 7.7) + 0.3 * Math.sin(t * 53)) * (1 - E.inQuad(k)) * (t > T.spin0 ? 1 : 0);
  const after = t > T.lock ? 0.2 * Math.exp(-(t - T.lock) * 7) * Math.sin(TAU * 3.6 * (t - T.lock)) : 0;
  return TARGET + spin + wild + after;
}

// ---------- basamak taşları ----------
const STONES = [[486, 1196, 56], [618, 1160, 46], [722, 1131, 38], [804, 1107, 31], [866, 1088, 25], [915, 1072, 20], [955, 1059, 16], [988, 1048, 13], [1016, 1039, 10]];
function stone(ctx, x, y, rx, lit, seed) {
  const ry = rx * 0.32;
  ctx.fillStyle = rgba('#0A0D2A', 0.4); ctx.beginPath(); ctx.ellipse(x + rx * 0.08, y + ry * 0.8, rx * 1.1, ry * 0.8, 0, 0, TAU); ctx.fill();
  const side = P.blobPts(x, y + ry * 0.42, rx * 0.98, ry * 1.02, seed + 7, 0.1, 28);
  P.flat(ctx, side, mix('#23234A', '#5C4452', lit));
  const top = P.blobPts(x, y, rx, ry, seed, 0.14, 28);
  P.toneShape(ctx, top, { base: mix('#34365F', '#C4A288', lit), dark: mix('#24264C', '#7E5E62', lit), light: mix('#52568A', '#FFE2B4', lit), lightAng: lerp(-1.9, -2.8, lit), rim: lit > 0.3, rimW: 2, shadowW: 0.24, lightW: 0.2, dabs: 3, highlights: 1, texture: 0.4, seed });
}
// ---------- çizim ----------
function drawHourglassLayer(ctx, t) {
  const pop = C.pop(t, T.hgPop, 0.5, 1.6);
  const out = 1 - E.inOutSine(seg(t, T.dis0 + 0.06, T.dis0 + 0.3));
  if (pop <= 0.001 || out <= 0.001) return null;
  const sc = pop * lerp(0.94, 1, out);
  const drain = E.inQuad(seg(t, T.dis0, T.dis0 + 0.26));
  const prog = E.inOutSine(seg(t, 85.86, T.lastGrain));
  const top = 0.055 * (1 - prog);
  const grains = GRAINS.map((g, i) => ({ k: (t - g) / FALL, dx: ((i * 37) % 7 - 3) * 0.5, s: 1 }));
  const settle = t > T.lastGrain + FALL ? Math.exp(-(t - T.lastGrain - FALL) * 3) : 1;
  const glow = lerp(0.35, 1, settle) * (0.9 + 0.1 * Math.sin(t * 5));
  const lay = L.renderLayer(ctx, 'hg', { x0: HG.x - HG.s * 0.42, y0: HG.y - HG.s - 30, x1: HG.x + HG.s * 0.42, y1: HG.y + 12 }, (x) => {
    x.translate(HG.x, HG.y); x.scale(sc, sc); x.translate(-HG.x, -HG.y);
    L.hourglass(x, HG.x, HG.y, HG.s, top, t, { bot: (0.6 + 0.03 * prog) * (1 - drain), grains, glassA: 0.16, lightAng: -1.9 });
  }, { c: '#161C50', a: 0.3 });
  if (lay) { lay.glow = glow * sc; lay.alpha = out; }
  return lay;
}
// kum saatinin alt yığınındaki bir zerrenin dünya konumu (dağılma başlangıcı)
function pileStart(r) {
  const H = HG.s, Wd = H * 0.62;
  const peak = HG.y - H * 0.08 - 0.63 * H * 0.36, base = HG.y - H * 0.09;
  const v = r.next(), y = lerp(peak + 10, base, Math.sqrt(v));
  const half = Wd * 0.46 * clamp((y - peak) / (base - peak) * 1.3);
  return [HG.x + r.range(-half, half), y];
}
function drawSandSwirl(ctx, t) {
  const t0 = T.dis0;
  if (t < t0 || t > t0 + 0.8) return;
  const r = rng(2171);
  ctx.save();
  for (let i = 0; i < 110; i++) {
    const st = pileStart(r), th = (i / 110) * TAU + r.range(-0.05, 0.05), dl = r.range(0, 0.12), sz = r.range(3, 6.5);
    const k = seg(t, t0 + dl, t0 + dl + 0.34);
    if (k <= 0 || k >= 1) continue;
    const ek = E.inOutCubic(k), a = th + 1.5 * (1 - ek);
    const ex = CP.x + Math.sin(a) * CP.R * 0.95, ey = CP.y - Math.cos(a) * CP.R * 0.95;
    const x = lerp(st[0], ex, ek) + Math.sin(k * Math.PI) * 60 * Math.cos(th), y = lerp(st[1], ey, ek) - Math.sin(k * Math.PI) * 40;
    ctx.fillStyle = rgba(i % 3 ? '#FFD87A' : '#FFF2C4', 0.95 * Math.sin(Math.min(1, k * 1.2) * Math.PI * 0.5 + 0.2));
    ctx.beginPath(); ctx.arc(x, y, sz * (1 - 0.3 * ek), 0, TAU); ctx.fill();
    if (i % 4 === 0) { ctx.fillStyle = rgba('#FFE7A8', 0.35 * (1 - ek)); ctx.beginPath(); ctx.arc(x, y, sz * 2.6, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
  const g = win01(t, t0, t0 + 0.75);
  P.glow(ctx, lerp(HG.x, CP.x, 0.5), lerp(HG.y - 300, CP.y, 0.5), 380, '#FFC860', 0.25 * g);
}
function win01(t, a, b) { return Math.sin(Math.PI * seg(t, a, b)); }

function compassState(t) {
  const app = seg(t, T.cpPop - 0.06, T.cpPop + 0.08);
  const sc = (0.86 + 0.14 * C.pop(t, T.cpPop, 0.42, 1.8)) * lerp(1, 0.72, E.inCubic(seg(t, T.cpOut, T.cpOut + 0.26)));
  const a = app * (1 - E.inCubic(seg(t, T.cpOut, T.cpOut + 0.26)));
  const sp = seg(t, T.spin0, T.lock);
  const shake = (t > T.spin0 && t < T.lock + 0.2) ? (0.045 * Math.sin(t * 23) + 0.02 * Math.sin(t * 41)) * (1 - E.outCubic(seg(t, T.spin0, T.lock + 0.2))) : 0;
  const lift = -30 * E.inCubic(seg(t, T.cpOut, T.cpOut + 0.26));
  return { a, sc, rot: shake, y: CP.y + lift, sp };
}
function drawCompass(ctx, t, cs, reflect = false) {
  if (cs.a <= 0.003) return;
  const spr = L.compassSprite(CP.R);
  ctx.save();
  ctx.translate(CP.x, cs.y); ctx.rotate(cs.rot); ctx.scale(cs.sc, cs.sc);
  ctx.globalAlpha *= cs.a;
  ctx.drawImage(spr.cv, -spr.ax, -spr.ay, spr.w, spr.h);
  const th = needleAt(t) - cs.rot;
  if (!reflect) {
    const v = Math.abs(needleAt(t) - needleAt(t - 0.02)) / 0.02;
    if (v > 6) for (let i = 3; i >= 1; i--) L.compassNeedle(ctx, CP.R, needleAt(t - i * 0.011) - cs.rot, 0.22 / i);
  }
  L.compassNeedle(ctx, CP.R, th, 1);
  L.compassGlass(ctx, CP.R, 1);
  // kilit anında kadranda ışık halkası
  const fl = seg(t, T.lock - 0.02, T.lock + 0.45);
  if (fl > 0 && fl < 1) {
    ctx.strokeStyle = rgba('#FFF6D8', 0.7 * (1 - fl)); ctx.lineWidth = 10 * (1 - fl) + 2;
    ctx.beginPath(); ctx.arc(0, 0, CP.R * (0.84 + 0.5 * E.outCubic(fl)), 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

function lanternPhi(t) {
  let ph = 0.035 * Math.sin(t * 2.1);
  if (t > T.lan) ph += 0.28 * Math.exp(-(t - T.lan) * 3.2) * Math.sin(TAU * 1.5 * (t - T.lan) + 0.4);
  if (t > T.var - 0.05) ph -= 0.16 * Math.exp(-(t - T.var + 0.05) * 3) * Math.sin(TAU * 1.4 * (t - T.var + 0.05));
  return ph;
}

module.exports = {
  init() { bgCache(); rippleCache(); L.compassSprite(CP.R); catchPoint(); },
  draw(ctx, t) {
    // ---- kamera ----
    const k1 = E.inOutSine(seg(t, 85.4, 87.4)), k2 = E.inOutSine(seg(t, 87.45, 88.7)), k3 = E.inOutCubic(seg(t, 88.95, 90.1));
    let zoom = lerp(1.0, 1.05, k1), cx = lerp(540, 585, k1), cy = lerp(965, 935, k1);
    zoom = lerp(zoom, 1.035, k2); cx = lerp(cx, 595, k2); cy = lerp(cy, 880, k2);
    zoom = lerp(zoom, 1.16, k3); cx = lerp(cx, 478, k3); cy = lerp(cy, 925, k3);
    zoom += 0.012 * Math.max(0, t - 90.1);
    const [bx, by] = R.breathe(t, 3, 21);
    R.camera(ctx, { zoom, cx: cx + bx, cy: cy + by });

    // ---- gök ve su ----
    L.putCache(ctx, bgCache());
    const lit = E.outCubic(seg(t, T.lan, T.lan + 0.32));
    L.drawStars(ctx, STARS, t, 1);
    L.drawStars(ctx, STARS, t, 0.32, { reflect: HY, fadeBy: (s) => clamp(1 - (HY - s.y) / 900) });
    // parlak yıldız: baştan sönük, kilitte parlar
    const flare = Math.exp(-Math.max(0, t - T.lock) * 3.2) * (t > T.lock - 0.03 ? 1 : 0) * seg(t, T.lock - 0.03, T.lock + 0.05);
    const starA = 0.45 + 0.25 * seg(t, T.spin0, T.lock) + 0.3 * seg(t, T.lock - 0.05, T.lock + 0.1);
    const starS = 7 + 3 * Math.sin(t * 3) * 0.3 + 18 * flare + 4 * seg(t, T.lock, T.lock + 0.3);
    L.brightStar(ctx, STAR.x, STAR.y, starS, starA, 0.08 * Math.sin(t * 0.8));
    // yıldızın suya yansıması (ince ışık sütunu)
    {
      const ry = 2 * HY - STAR.y;
      ctx.save(); ctx.globalAlpha = 0.18 + 0.25 * flare;
      for (let i = 0; i < 9; i++) { const yy = HY + 40 + i * 26, w = 18 + i * 4; ctx.fillStyle = rgba('#DDE4FF', 0.5 * (1 - i / 9)); ctx.fillRect(STAR.x - w / 2 + Math.sin(t * 2 + i) * 4, yy, w, 3); }
      ctx.restore(); void ry;
    }
    L.motes(ctx, t, 34, { x0: -60, y0: 260, x1: 1140, y1: 1500 }, 2181, { alpha: 0.45, speed: 0.8 });

    // ---- s20'nin devamı: göğüsteki köz söner, ondan halkalar yayılır ----
    const ember = 1 - E.inOutSine(seg(t, 85.6, 86.3));
    let chestW = null;
    if (ember > 0.01) {
      const s0 = M.skeleton(IDLE, MAN.h);
      chestW = [MAN.x + s0.sh[0] + 0.035 * MAN.h, MAN.y + (s0.sh[1] + s0.hip[1]) * 0.5 - 0.06 * MAN.h];
      for (const [t0, sd] of [[85.25, 1], [85.5, 2], [85.75, 3]]) {
        const k = seg(t, t0, t0 + 1.1);
        if (k <= 0 || k >= 1) continue;
        ctx.save(); ctx.strokeStyle = rgba('#FFE6C0', 0.42 * (1 - k) * (1 - k)); ctx.lineWidth = 12 * (1 - k) + 2; ctx.lineCap = 'round';
        const a0 = sd * 2.1 + t * 0.4;
        ctx.beginPath(); ctx.arc(chestW[0], chestW[1], 40 + 320 * E.outCubic(k), a0, a0 + 4.4); ctx.stroke(); ctx.restore();
      }
    }
    // ---- halkalar (s20'deki ses dalgalarının devamı) ----
    for (const [t0, x, y, maxR, sd] of [[85.3, MAN.x, MAN.y, 360, 1], [85.62, MAN.x, MAN.y, 360, 2], [85.94, MAN.x, MAN.y, 360, 3], [T.hgPop + 0.05, HG.x, HG.y, 300, 4], [T.lastGrain + FALL, HG.x, HG.y, 220, 5], [T.lan, MAN.x + 60, MAN.y, 420, 6], [T.lan + 0.25, MAN.x + 60, MAN.y, 420, 7]]) {
      const k = seg(t, t0, t0 + 1.9);
      if (k <= 0 || k >= 1) continue;
      L.ripple(ctx, x, y + 2, 24 + maxR * E.outCubic(k), 0.55 * (1 - k), sd >= 6 ? '#FFD49A' : '#C9D2FF', 3.2 * (1 - k * 0.6), 2190 + sd);
    }

    // ---- katmanlar (yansıma için önce hazırlanır) ----
    const hgL = drawHourglassLayer(ctx, t);
    const cs = compassState(t);
    const cpL = cs.a > 0.003 ? L.renderLayer(ctx, 'cp', { x0: CP.x - CP.R - 60, y0: CP.y - CP.R - 90, x1: CP.x + CP.R + 60, y1: CP.y + CP.R + 40 }, (x) => drawCompass(x, t, cs, true)) : null;
    const p = poseAt(t);
    const la = lerp(-1.95, -0.3, lit);
    const mo = { x: MAN.x, y: MAN.y, h: MAN.h, light: la, rimAlpha: lerp(0.45, 0.7, lit) };
    const pm = L.prepMan(ctx, p, mo, { x0: MAN.x - 0.5 * MAN.h, y0: MAN.y - 1.1 * MAN.h, x1: MAN.x + 0.8 * MAN.h, y1: MAN.y + 14 }, { slot: 's21man', tint: { c: '#141A4C', a: lerp(0.46, 0.1, lit), c2: '#FF9A40', a2: 0.09 * lit } });

    // ---- yansımalar ----
    const gl = clamp(1 - seg(t, 85.9, 86.1) + seg(t, 88.5, 88.75)); // "ölümsüz" anlamı varken yansımalar daha sönük
    const refA = lerp(0.26, 0.4, gl);
    if (hgL) L.reflectLayer(ctx, hgL, HG.y, t, { alpha: refA * 0.9 * hgL.alpha, fade: 330, ph: 1, slot: 'hg' });
    if (cpL) L.reflectLayer(ctx, cpL, 1150, t, { alpha: refA * 0.55 * cs.a, fade: 300, ph: 2, slot: 'cp' });
    L.reflectLayer(ctx, pm.body, MAN.y, t, { alpha: refA + 0.08 * lit, fade: 330, slot: 'mb' });
    L.reflectLayer(ctx, pm.arm, MAN.y, t, { alpha: refA + 0.08 * lit, fade: 330, slot: 'ma' });
    // dalgacık örtüsü
    L.putCache(ctx, rippleCache(), -100 + Math.sin(t * 0.6) * 30 - (t - 85) * 10, 0);

    // ---- fener ışığı suyun üstünde ----
    const grip = L.gripPoint(pm, 'N', 0.5);
    const phi = lanternPhi(t);
    const core = L.lanternCore(grip, LAN_S, phi);
    if (lit > 0) {
      const pr = E.outCubic(seg(t, T.lan, T.lan + 0.9));
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.translate(core[0], MAN.y + 6); ctx.scale(1, 0.24);
      const R0 = 80 + 520 * pr;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R0);
      g.addColorStop(0, rgba('#FFB860', 0.55 * lit)); g.addColorStop(0.45, rgba('#FF9440', 0.22 * lit)); g.addColorStop(1, rgba('#FF8030', 0));
      ctx.fillStyle = g; ctx.fillRect(-R0, -R0, 2 * R0, 2 * R0);
      ctx.restore();
      // suya düşen sıcak ışık sütunu
      const rr = rng(2201);
      for (let i = 0; i < 16; i++) {
        const yy = MAN.y + 12 + i * 15 + i * i * 0.6, w = (20 + i * 5) * (0.7 + 0.3 * Math.sin(t * 3 + i * 1.7));
        const xx = core[0] + Math.sin(t * 2.2 + i * 0.9) * (3 + i * 0.8);
        P.stroke(ctx, xx - w / 2, yy, xx + w / 2, yy + rr.range(-1, 1), 4 - i * 0.12, rgba('#FFD08A', 0.6 * lit * (1 - i / 16)), rr.int(1, 1e9), { detail: 0, taper1: 0.4 });
      }
    }
    // ---- basamak taşları: ışık ulaştıkça tek tek ----
    STONES.forEach(([sx, sy, rx], i) => {
      const t0 = T.lan + 0.2 + i * 0.1;
      const pop = C.pop(t, t0, 0.42, 1.6);
      if (pop <= 0.001) return;
      const lt = E.outCubic(seg(t, t0, t0 + 0.35)) * (0.9 + 0.1 * Math.sin(t * 4 + i));
      ctx.save(); ctx.translate(sx, sy); ctx.scale(pop, pop); ctx.translate(-sx, -sy);
      stone(ctx, sx, sy, rx, lt * (1 - i * 0.05), 2300 + i);
      ctx.restore();
      const gk = seg(t, t0, t0 + 0.5);
      if (gk > 0 && gk < 1) { R.sparkle(ctx, sx - rx * 0.3, sy - rx * 0.32, rx * 0.5 * Math.sin(gk * Math.PI), Math.sin(gk * Math.PI)); }
      const rk = seg(t, t0, t0 + 1.2);
      if (rk > 0 && rk < 1) L.ripple(ctx, sx, sy + rx * 0.12, rx * (1.1 + 1.4 * E.outCubic(rk)), 0.45 * (1 - rk), '#FFD49A', 2, 2400 + i);
    });

    // ---- kum saati / dağılma / pusula ----
    if (hgL) {
      L.blitLayer(ctx, hgL, hgL.alpha);
      P.glow(ctx, HG.x, HG.y - HG.s * 0.5, HG.s * 0.85, '#FFD27A', 0.26 * hgL.glow * (1 - seg(t, T.dis0, T.dis0 + 0.3)));
      // son tane düştüğünde küçük kum serpintisi
      const pk = seg(t, T.lastGrain + FALL, T.lastGrain + FALL + 0.35);
      if (pk > 0 && pk < 1) {
        const peakY = HG.y - HG.s * 0.08 - 0.63 * HG.s * 0.36;
        for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.45; const rr2 = 26 * E.outCubic(pk); ctx.fillStyle = rgba('#FFE7A0', 1 - pk); ctx.beginPath(); ctx.arc(HG.x + Math.cos(a) * rr2, peakY + Math.sin(a) * rr2 * 0.6 + pk * pk * 18, 2.6, 0, TAU); ctx.fill(); }
      }
    }
    drawSandSwirl(ctx, t);
    if (cs.a > 0.003) {
      P.glow(ctx, CP.x, cs.y, CP.R * 1.7, '#FFD9A0', 0.16 * cs.a);
      drawCompass(ctx, t, cs);
    }
    // kilit: ibre ucundan yıldıza ışık çizgisi
    const beam = win01(t, T.lock - 0.04, T.lock + 0.5) * cs.a;
    if (beam > 0.01) {
      const tipY = cs.y - CP.R * 0.84 * 0.8 * cs.sc;
      const g = ctx.createLinearGradient(0, tipY, 0, STAR.y);
      g.addColorStop(0, rgba('#FFF2C8', 0.0)); g.addColorStop(0.3, rgba('#FFF2C8', 0.7 * beam)); g.addColorStop(1, rgba('#FFFFFF', 0.9 * beam));
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(CP.x + Math.sin(TARGET) * 0 - 3, tipY); ctx.lineTo(STAR.x - 1.5, STAR.y); ctx.lineTo(STAR.x + 1.5, STAR.y); ctx.lineTo(CP.x + 3, tipY); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // yıldızdan inen kıvılcım
    {
      const cp = catchPoint();
      const sp = (tt) => {
        const k = E.inOutSine(seg(tt, T.spark0, T.lan));
        const a = [STAR.x, STAR.y], b = [STAR.x + 210, (STAR.y + cp[1]) * 0.5 - 40], c = cp;
        const u = 1 - k;
        return [u * u * a[0] + 2 * u * k * b[0] + k * k * c[0], u * u * a[1] + 2 * u * k * b[1] + k * k * c[1]];
      };
      if (t > T.spark0 && t < T.lan + 0.05) {
        for (let i = 9; i >= 0; i--) {
          const tt = t - i * 0.018; if (tt < T.spark0) continue;
          const q = sp(tt);
          ctx.fillStyle = rgba(i ? '#FFE2A0' : '#FFFFFF', (1 - i / 10) * 0.9);
          ctx.beginPath(); ctx.arc(q[0], q[1], 7 * (1 - i / 11), 0, TAU); ctx.fill();
        }
        const q = sp(t);
        P.glow(ctx, q[0], q[1], 70, '#FFE0A0', 0.6);
        R.sparkle(ctx, q[0], q[1], 18 + 4 * Math.sin(t * 40), 0.95);
      }
    }

    // ---- adam + fener ----
    const lanPop = C.pop(t, T.lan - 0.02, 0.42, 2);
    L.blitMan(ctx, pm, (c) => {
      if (chestW) { P.glow(c, chestW[0], chestW[1], 70, '#FF8A40', 0.7 * ember); P.glow(c, chestW[0], chestW[1], 22, '#FFE6A0', 0.9 * ember); }
      if (lanPop <= 0.001) return;
      c.save(); c.translate(grip[0], grip[1]); c.scale(lanPop, lanPop); c.translate(-grip[0], -grip[1]);
      L.lanternHang(c, grip, LAN_S, phi, lit, t);
      c.restore();
    });
    if (lit > 0) {
      const fl = lit * (0.92 + 0.08 * Math.sin(t * 11) * Math.sin(t * 6.3));
      P.glow(ctx, core[0], core[1], 520 + 140 * E.outCubic(seg(t, T.lan, T.lan + 1)), '#FFA448', 0.3 * fl);
      P.glow(ctx, core[0], core[1], 110, '#FFF0C0', 0.45 * fl);
      // açılış parlaması
      const fk = seg(t, T.lan, T.lan + 0.36);
      if (fk < 1) {
        ctx.save(); ctx.strokeStyle = rgba('#FFE6B0', 0.6 * (1 - fk) * (1 - fk)); ctx.lineWidth = 14 * (1 - fk) + 1;
        ctx.beginPath(); ctx.arc(core[0], core[1], 24 + 150 * E.outCubic(fk), 0, TAU); ctx.stroke(); ctx.restore();
        R.sparkles(ctx, core[0], core[1], 90, 8, t * 1.4, 2501, { scale: 1.1, rise: 30 });
      }
    }
  },
  sfx: [
    { t: 85.85, type: 'water', gain: 0.2 },
    { t: 86.05, type: 'sand', gain: 0.22 },
    { t: 87.36, type: 'sparkle', gain: 0.24 },
    { t: 87.8, type: 'whoosh', gain: 0.22 },
    { t: 88.6, type: 'chime', gain: 0.3 },
    { t: 89.24, type: 'flame', gain: 0.3 },
  ],
};
