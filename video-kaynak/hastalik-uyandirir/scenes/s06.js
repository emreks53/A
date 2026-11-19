// S06 — "Hem insan, zîhayatın en mükemmeli en yükseği" (17.30–22.10)
// Alacakaranlıkta, kobalt-turkuaz gök altında bir çayır sahnesi.
// 17.78 "Hem": kamera gökten çayıra eğilir. 18.06 "insan": ortada adam belirir (pop).
// 18.76 "zîhayatın": canlılar dıştan içe, sağlı sollu sırayla POP eder (uğur böceği, kelebek, arı, balık, kuş, tavşan,
// ceylan, koyun) — hepsi adama dönük, kendi çimen öbeğinde. 19.50 "en mükemmeli": yukarıdan yumuşak altın bir sahne
// ışığı hüzmesi adamın üstüne düşer (hale değil), adam başını ışığa kaldırır, canlılar ona bakar.
// 20.88 "en yükseği": yerden basamak basamak toprak-çimen sekiler yükselir, canlıları taşır; adamın sütunu en yükseğe
// çıkar (basamaklı piramit). Kamera yukarı eğilir.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const L = require('./_s05_lib');
const K = require('./_s06_creatures');
const { seg, E, lerp, clamp, rgba, mix, shade, TAU, rng } = C;
const d = C.deg;

const G = 1250;            // canlıların durduğu yer çizgisi (dünya)
const HORIZ = 1050;
const MANX = 540, MANH = 400;
const D = 136;             // basamak yüksekliği
const TIER_HW = [0, 336, 244, 152, 60];
const CSC = 0.9;          // canlı ölçeği
const LA = -2.3;
const SS = 1.25;
// içten dışa açılır: kamera adamın yakın planından geri çekilirken canlılar sırayla belirir
const SLOTS = [
  { kind: 'gazelle', x: 432, tier: 3, dir: 1, pop: 18.68 },
  { kind: 'sheep', x: 650, tier: 3, dir: -1, pop: 18.77 },
  { kind: 'bird', x: 342, tier: 2, dir: 1, pop: 18.87 },
  { kind: 'rabbit', x: 738, tier: 2, dir: -1, pop: 18.96 },
  { kind: 'bee', x: 250, tier: 1, dir: 1, pop: 19.05 },
  { kind: 'fish', x: 830, tier: 1, dir: -1, pop: 19.13 },
  { kind: 'ladybug', x: 172, tier: 0, dir: 1, pop: 19.22 },
  { kind: 'butterfly', x: 908, tier: 0, dir: -1, pop: 19.3 },
];
const BEAM_T = 19.42;
// adamın sütunu önce ve en hızlı kalkar (21.08'den itibaren hep en yüksek nokta), sonra içten dışa basamaklar
const RISE = [null, [21.04, 0.58], [20.98, 0.64], [20.92, 0.7], [20.84, 0.78]];

// ---------- önbellekli katmanlar ----------
function skyCv() {
  const w = C.W + 160, h = HORIZ + 80;
  return L.hcache('s06sky', w, h, SS, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, w, h);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: w, y1: h, w, h }, ['#131A58', '#1C2C82', '#2848A0', '#3264AE', '#5688B8', '#94B6C4', '#EACFA0'], { seed: 61, wMin: 22, wMax: 42, lMin: 90, lMax: 280, stops: [0, 0.18, 0.36, 0.55, 0.74, 0.9, 1] });
    R.stars(x, w, 640, 34, 63, 0, { maxY: 0.85 });
    L.cloud2(x, 930, 520, 56, 7, { base: '#B8B0D8', dark: '#64629E', light: '#F2D4C6', lightAng: -2.6, curl: '#F4DED4', curlA: 0.5 });
    // ay (sol üstte, solgun)
    P.glow(x, 320, 260, 150, '#CFE0FF', 0.3);
    P.toneShape(x, P.ellipsePts(320, 260, 36, 36, 36), { base: '#F3EED8', dark: '#C9C2B0', light: '#FFFFF4', rim: false, lightAng: -0.6, shadowW: 0.1, lightW: 0.04, texture: 0.35, seed: 64 });
  });
}
function groundCv() {
  const w = C.W + 160, y0 = HORIZ - 110, h = C.H + 120 - y0;
  return L.hcache('s06ground', w, h, SS, (x) => {
    x.translate(0, -y0);
    // uzak tepeler (iki kat) + servi siluetleri
    const far = []; for (let i = 0; i <= 60; i++) { const u = i / 60; far.push([u * w, HORIZ - 52 - 34 * Math.sin(u * 5.2 + 0.6) - 14 * Math.sin(u * 13 + 2)]); }
    P.toneShape(x, far.concat([[w, HORIZ + 40], [0, HORIZ + 40]]), { base: '#4A5A9E', dark: '#3A4886', light: '#6474B4', seed: 65, shadowW: 0.02, lightW: 0.01, dabs: 12, rimW: 4 });
    const r0 = rng(66);
    for (let i = 0; i < 7; i++) { const cx = r0.range(30, w - 30), k = Math.round(cx / w * 60); R.cypress(x, cx, far[k][1] + 18, r0.range(70, 110), r0.int(1, 99), { base: '#334A7E', dark: '#25366A', light: '#4A62A0' }); }
    const mid = []; for (let i = 0; i <= 60; i++) { const u = i / 60; mid.push([u * w, HORIZ - 14 * Math.sin(u * 3.4 + 2.2) - 8 * Math.sin(u * 9 + 1)]); }
    P.toneShape(x, mid.concat([[w, HORIZ + 60], [0, HORIZ + 60]]), { base: '#3E7A86', dark: '#2E6474', light: '#5A96A0', seed: 67, shadowW: 0.02, lightW: 0.01, dabs: 12, rimW: 4 });
    // çayır
    const gt = []; for (let i = 0; i <= 60; i++) { const u = i / 60; gt.push([u * w, HORIZ + 30 + 5 * Math.sin(u * 5 + 0.3)]); }
    const g = gt.concat([[w, C.H + 120], [0, C.H + 120]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 6; x.setLineDash([110, 60, 40, 90]); x.stroke(P.pathOf(gt, false)); x.restore();
    x.save(); x.clip(P.pathOf(g)); x.fillStyle = '#3F8466'; x.fillRect(0, HORIZ, w, 1000); x.restore();
    P.bandFill(x, P.pathOf(g), { x0: 0, y0: HORIZ + 20, x1: w, y1: C.H + 120, w, h: C.H + 100 - HORIZ }, ['#6FAE84', '#4E9672', '#3B7C64', '#2E6658', '#26554E'], { seed: 68, wMin: 16, wMax: 32, lMin: 80, lMax: 260, stops: [0, 0.12, 0.3, 0.6, 1] });
    const r = rng(69);
    for (let i = 0; i < 14; i++) { const k = r.int(2, 56), p0 = gt[k], p1 = gt[k + 2]; P.stroke(x, p0[0], p0[1] + 9, p1[0], p1[1] + 9, r.range(7, 12), '#8EC48A', r.int(1, 1e9), { detail: 0.5 }); }
    for (let i = 0; i < 16; i++) { const gx = r.range(20, w - 20); R.grass(x, gx, r.range(HORIZ + 60, 1240), r.range(18, 30), r.int(1, 999), { c1: '#2E6658', c2: '#6FAE84' }); }
    for (let i = 0; i < 10; i++) { const gx = r.range(20, w - 20); R.grass(x, gx, r.range(1330, 1800), r.range(26, 40), r.int(1, 999), { c1: '#26554E', c2: '#4E9672' }); }
  });
}
// toprak-çimen seki (k. basamak): yuvarlak omuzlu toprak ön yüz + dalgalı çimen başlığı; yerin altına uzanır (kırpılır)
function tierCv(k) {
  const hw = TIER_HW[k], w = hw * 2 + 30, h = k * D + 100;
  return L.hcache('s06tier' + k, w, h, SS, (x) => {
    x.translate(w / 2, 16);
    const r = rng(70 + k);
    const face = P.roundRectPts(-hw, 4, hw * 2, h + 30, 22);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 5; x.setLineDash([70, 40, 25, 60]); x.translate(1.5, 0); x.stroke(P.pathOf(face)); x.restore();
    x.save(); x.clip(P.pathOf(face)); x.fillStyle = '#A9604A'; x.fillRect(-hw, 0, hw * 2, h);
    // renk mutlak yüksekliğe bağlı: bütün sekilerin ön yüzü tek bir duvar gibi kesintisiz görünür
    const FACE = ['#DA8C50', '#C2724C', '#A45E50', '#864C5A', '#6A4062', '#5A3862'];
    P.bandFill(x, P.pathOf(face), { x0: -hw, y0: 4, x1: hw, y1: k * D + 40, w: hw * 2, h: k * D + 36 }, FACE.slice(4 - k), { seed: 71, wMin: 12, wMax: 22, lMin: 40, lMax: 140, mixJitter: 0.08 });
    // katman çizgileri (hafif dalgalı)
    for (let i = 1; i < k * 2; i++) { const yy = i * D / 2 + r.range(-8, 8); const ln = []; for (let q = 0; q <= 10; q++) ln.push([-hw + q * hw / 5, yy + Math.sin(q * 0.9 + i) * 3]); P.curveStroke(x, ln, 3, rgba('#5A3048', 0.35), r.int(1, 999), { bristles: 0, detail: 0 }); }
    // taşlar ve kökler
    for (let i = 0; i < Math.round(hw / 34); i++) { const sx = r.range(-hw + 16, hw - 16), sy = r.range(48, k * D - 6); P.toneShape(x, P.blobPts(sx, sy, r.range(7, 13), r.range(5, 8), r.int(1, 99), 0.2, 16), { base: r.chance(0.5) ? '#E2B898' : '#B4A2C8', dark: '#6E5480', light: '#FFE6CC', rim: false, shadowW: 0.32, dabs: 0, highlights: 1, texture: 0.2, seed: r.int(1, 999) }); }
    for (let i = 0; i < Math.round(hw / 60); i++) { const sx = r.range(-hw + 24, hw - 24); const ln = []; const L0 = r.range(30, 60); for (let q = 0; q <= 6; q++) ln.push([sx + Math.sin(q * 1.2 + i) * 6, 26 + q * L0 / 6]); P.curveStroke(x, ln, (q) => 4.5 * (1 - q * 0.75), rgba('#4E2C3A', 0.65), r.int(1, 999), { bristles: 0, detail: 0 }); }
    // gölge (sağ) ve ışık (sol) kenarları — darbeyle
    for (let yy = 30; yy < D - 10; yy += 34) { P.stroke(x, hw - 6, yy, hw - 5, yy + 36, 9, rgba('#3B2A6A', 0.4), r.int(1, 1e9), { detail: 0.3 }); P.stroke(x, -hw + 4, yy + 8, -hw + 5, yy + 40, 7, rgba('#FFD2A0', 0.3), r.int(1, 1e9), { detail: 0.3 }); }
    // bir alttaki sekinin çimen başlığının gölgesi (çıkıntı altında koyu şerit)
    x.fillStyle = rgba('#3B2A5A', 0.3); x.fillRect(-hw, 24, hw * 2, 12);
    P.texture(x, { x0: -hw, y0: 0, x1: hw, y1: h, w: hw * 2, h, cx: 0, cy: h / 2 }, 0, 0.42, 0.6);
    x.restore();
    // çimen başlığı: üstü hafif kubbeli, altı dalgalı (sarkan çimen)
    const top = [], bot = [];
    const n = Math.max(6, Math.round(hw / 22));
    for (let i = 0; i <= n; i++) { const u = i / n, X = -hw - 8 + u * (hw * 2 + 16); top.push([X, (u < 0.08 || u > 0.92) ? 10 : -2 - Math.sin(u * Math.PI) * 3]); }
    for (let i = 0; i <= n * 2; i++) { const u = 1 - i / (n * 2), X = -hw - 6 + u * (hw * 2 + 12); bot.push([X, 22 + (i % 2 ? r.range(8, 16) : r.range(0, 4))]); }
    const cap = P.smoothPts(top.concat(bot), true, 3);
    P.toneShape(x, cap, { base: '#4FA36A', dark: '#2A6A52', light: '#9AD06A', seed: 72 + k, shadowW: 0.32, lightW: 0.22, dabs: Math.round(hw / 24), strokeAng: 0, rimW: 3 });
    for (let i = 0; i < Math.round(hw / 18); i++) { const gx = r.range(-hw - 2, hw + 2), ln = []; const len = r.range(8, 18); for (let q = 0; q <= 4; q++) ln.push([gx + q * r.range(-1, 1), 24 + q * len / 4]); P.curveStroke(x, ln, (q) => 4.5 * (1 - q * 0.8), r.chance(0.5) ? '#3E8A5E' : '#6AB46A', r.int(1, 999), { bristles: 0, detail: 0 }); }
    for (let i = 0; i < Math.round(hw / 46); i++) R.grass(x, r.range(-hw + 10, hw - 10), 4, r.range(14, 22), r.int(1, 999), { c1: '#2E7A52', c2: '#8CC85A', n: 4 });
    for (let i = 0; i < Math.round(hw / 70); i++) R.flower(x, r.range(-hw + 12, hw - 12), r.range(2, 10), r.range(5, 7), r.int(1, 999), { color: r.chance(0.5) ? '#FFFFFF' : '#FFD34E', dark: '#B8A9DA', inner: '#F6C83B' });
  });
}

// ön plan çimenleri (ekran uzayında; uçları y≥1680)
function fgCv() {
  return L.hcache('s06fg', C.W + 80, 420, 1, (x) => {
    const r = rng(95);
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1;
      const gx = side < 0 ? r.range(-20, 330) : r.range(790, C.W + 100);
      R.grass(x, gx, r.range(330, 420), r.range(120, 230), r.int(1, 999), { c1: r.chance(0.5) ? '#173C3A' : '#1E4A44', c2: '#2C5E52', n: 6, wind: side * 0.15 });
    }
    for (let i = 0; i < 5; i++) { const gx = i % 2 ? r.range(840, 1060) : r.range(30, 260); R.flower(x, gx, r.range(200, 300), r.range(14, 20), r.int(1, 999), { color: '#D8D2EE', dark: '#7C74A8', inner: '#E8B23A' }); }
  });
}

// ---------- zaman eğrileri ----------
function riseK(k, t) {
  if (!k) return 0;
  const [t0, dur] = RISE[k];
  const u = seg(t, t0, t0 + dur);
  return u <= 0 ? 0 : E.outBack(u, 1.25);
}
function tierTop(k, t) { return G - k * D * riseK(k, t); }

// ---------- adam ----------
const STANDP = M.pose({ torso: d(3), neck: d(4), head: d(7), armN: d(3), elbowN: d(12), handN: d(6), armF: d(-5), elbowF: d(10), eye: 1, mouth: 0.05 });
const LITP = M.pose({ torso: d(-1), neck: d(2), head: d(-9), armN: d(10), elbowN: d(22), handN: d(-8), armF: d(-12), elbowF: d(20), handF: d(-6), eye: 1, mouth: 0.3, brow: -0.1 });
const BALP = M.pose({ torso: d(2), neck: d(3), head: d(-2), armN: d(9), elbowN: d(22), handN: d(-4), armF: d(-10), elbowF: d(18), handF: d(-4), kneeN: d(6), thighN: d(3), kneeF: d(7), thighF: d(-1), eye: 1, mouth: 0.2 });
// ışık altında yavaşça açılan sakin avuçlar (19.9–20.8 ikincil hareket)
const OPENP = M.pose({ torso: d(-1.5), neck: d(2), head: d(-11), armN: d(15), elbowN: d(38), handN: d(-24), armF: d(-14), elbowF: d(30), handF: d(-18), eye: 1, mouth: 0.35, brow: -0.15 });
const TOPP = M.pose({ torso: d(-1.5), neck: d(2), head: d(-5), armN: d(6), elbowN: d(16), handN: d(4), armF: d(-7), elbowF: d(14), eye: 1, mouth: 0.25 });
function manPose(t) {
  let p = M.lerpPose(STANDP, LITP, E.inOutCubic(seg(t, 19.42, 19.95)));
  const op = E.inOutSine(seg(t, 19.9, 20.75));
  if (op > 0) p = M.lerpPose(p, OPENP, op);
  const bal = E.inOutSine(seg(t, 20.8, 21.15)) * (1 - E.inOutSine(seg(t, 21.5, 21.95)));
  if (bal > 0) p = M.lerpPose(p, BALP, bal);
  const top = E.inOutSine(seg(t, 21.55, 22.0));
  if (top > 0) p = M.lerpPose(p, TOPP, top);
  const brth = Math.sin(t * 2.3);
  p.torso += d(0.6) * brth; p.py += 0.002 * brth;
  // yükselişin başında dizlerde hafif çökme (yük binişi), durunca toparlanma
  const sq = Math.sin(Math.PI * seg(t, 20.84, 21.18)) * 0.6 - Math.sin(Math.PI * seg(t, 21.55, 21.8)) * 0.25;
  p.kneeN += d(10) * sq; p.thighN += d(5) * sq; p.kneeF += d(10) * sq; p.thighF += d(5) * sq; p.py -= 0.012 * sq;
  return p;
}

// ---------- altın sahne ışığı ----------
function beamK(t) {
  const u = seg(t, BEAM_T, BEAM_T + 0.32);
  if (u <= 0) return 0;
  return clamp(E.outCubic(u) * (1 + 0.18 * Math.sin(Math.PI * u)) + 0.03 * Math.sin(t * 3.1) * u, 0, 1.15);
}
function drawBeam(ctx, t, k, footY, part) {
  if (k <= 0) return;
  const top = footY - 1500, x0 = MANX - 6;
  if (part === 'back') {
    // önce soğuk gökten maviyi al (sıcak çarpma), sonra altın ışıkla aç: hüzme altın görünsün
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 4; i++) {
      const s = 0.6 + i * 0.14, wt = 38 * s, wb = 165 * s;
      ctx.fillStyle = rgba('#FFBE6A', 0.25 * clamp(k));
      ctx.beginPath(); ctx.moveTo(x0 - wt, top); ctx.lineTo(x0 + wt, top); ctx.lineTo(x0 + wb, footY + 10); ctx.lineTo(x0 - wb, footY + 10); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  if (part === 'back') {
    // yumuşak kenarlı koni: üst üste binen saydam yamuklar
    for (let i = 0; i < 7; i++) {
      const s = 0.5 + i * 0.11, a = 0.07 * k;
      const wt = 38 * s, wb = 165 * s;
      ctx.fillStyle = rgba(i < 3 ? '#FFDC90' : '#FFB850', a);
      ctx.beginPath(); ctx.moveTo(x0 - wt, top); ctx.lineTo(x0 + wt, top); ctx.lineTo(x0 + wb, footY + 10); ctx.lineTo(x0 - wb, footY + 10); ctx.closePath(); ctx.fill();
    }
    // içte ince ışık şeritleri (yavaş kayar)
    for (let i = 0; i < 5; i++) {
      const u = ((i * 0.23 + t * 0.05) % 1) * 2 - 1;
      const wt = 7, wb = 22, xt = x0 + u * 28, xb = x0 + u * 120;
      ctx.fillStyle = rgba('#FFF0C0', 0.07 * k * (0.6 + 0.4 * Math.sin(t * 1.7 + i * 2)));
      ctx.beginPath(); ctx.moveTo(xt - wt, top); ctx.lineTo(xt + wt, top); ctx.lineTo(xb + wb, footY); ctx.lineTo(xb - wb, footY); ctx.closePath(); ctx.fill();
    }
    // yerdeki ışık havuzu (sütunun üstüne çıkınca daralır)
    const pr = lerp(150, 70, clamp(riseK(4, t)));
    const pk = k * (1 - E.smooth(seg(t, 20.76, 20.9)) + E.smooth(seg(t, 21.62, 21.9)));
    ctx.fillStyle = rgba('#FFD88A', 0.34 * pk);
    ctx.beginPath(); ctx.ellipse(x0, footY + 3, pr, pr * 0.15, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba('#FFF2C8', 0.34 * pk);
    ctx.beginPath(); ctx.ellipse(x0, footY + 3, pr * 0.58, pr * 0.08, 0, 0, TAU); ctx.fill();
  } else {
    // önde: adamın üstüne sıcak ışık + süzülen toz zerreleri
    P.glow(ctx, x0, footY - MANH * 0.55, MANH * 0.8, '#FFC870', 0.24 * k);
    const r = rng(81);
    for (let i = 0; i < 22; i++) {
      const ph = r.next(), sp = r.range(0.05, 0.12), xx = r.range(-1, 1);
      const v = (ph + t * sp) % 1;
      const yy = lerp(footY - 900, footY - 20, v);
      const half = lerp(50, 180, (yy - (footY - 900)) / 900);
      const px = x0 + xx * half + Math.sin(t * 0.9 + i) * 10;
      const a = k * Math.sin(v * Math.PI) * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7));
      ctx.fillStyle = rgba('#FFF0C0', 0.75 * a); ctx.beginPath(); ctx.arc(px, yy, r.range(1.5, 3.2), 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

// ---------- ateş böcekleri ----------
function fireflies(ctx, t, a) {
  const r = rng(91);
  for (let i = 0; i < 12; i++) {
    const bx = r.range(40, 1040), by = r.range(700, 1180), sp = r.range(0.25, 0.5), ph = r.range(0, TAU);
    const x = bx + Math.sin(t * sp + ph) * 40, y = by + Math.sin(t * sp * 1.3 + ph * 2) * 26;
    const fl = (0.5 + 0.5 * Math.sin(t * r.range(2, 4) + ph)) * a;
    if (fl < 0.05) continue;
    P.glow(ctx, x, y, 16, '#FFE27A', 0.5 * fl);
    ctx.fillStyle = rgba('#FFF6C8', 0.9 * fl); ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
  }
}

// pop anında küçük toz halkası ve parıltı
function popBurst(ctx, x, y, t, t0, w) {
  const u = seg(t, t0, t0 + 0.55);
  if (u <= 0 || u >= 1) return;
  const a = 1 - u;
  ctx.save();
  ctx.strokeStyle = rgba('#FFF2D0', 0.55 * a); ctx.lineWidth = 3 * a + 1;
  ctx.beginPath(); ctx.ellipse(x, y - 4, w * (0.45 + 0.5 * E.outCubic(u)), w * 0.1 * (0.6 + 0.6 * u), 0, 0, TAU); ctx.stroke();
  ctx.restore();
  const r = rng(Math.round(x));
  for (let i = 0; i < 5; i++) {
    const ang = -Math.PI / 2 + r.range(-1.2, 1.2), dist = w * (0.3 + 0.7 * E.outCubic(u)) * r.range(0.6, 1);
    R.sparkle(ctx, x + Math.cos(ang) * dist, y - w * 0.4 + Math.sin(ang) * dist * 0.8, r.range(5, 9) * a, a, '#FFF3C8');
  }
}

module.exports = {
  draw(ctx, t) {
    // kamera: gökten çayıra eğiliş (Hem) → canlılar belirirken geri çekilme → "en yükseği"nde yukarı eğiliş
    const down = E.inOutSine(seg(t, 16.9, 18.3));
    const back = E.inOutSine(seg(t, 18.5, 19.42));
    const up = E.inOutSine(seg(t, 20.86, 21.98));
    const hold = E.inOutSine(seg(t, 19.4, 20.86));
    const zoom = lerp(lerp(1.4, 1.6, down), 1.3, back) + 0.035 * hold - 0.015 * up;
    const cy = lerp(lerp(760, 1104, down), 1039, back) - 12 * hold * (1 - up) - 244 * up;
    const [bx, by] = R.breathe(t, 3, 61);
    ctx.save();
    R.camera(ctx, { zoom, cx: 540 + bx, cy: cy + by });
    ctx.drawImage(skyCv(), -80, -80, C.W + 160, HORIZ + 80);
    const gy0 = HORIZ - 110; ctx.drawImage(groundCv(), -80, gy0, C.W + 160, C.H + 120 - gy0);
    const bk = beamK(t);
    // sekiler (yerden yükselir: zemin çizgisinin altı kırpılır)
    const anyRise = t > Math.min(RISE[1][0], RISE[2][0], RISE[3][0], RISE[4][0]);
    if (anyRise) {
      ctx.save(); ctx.beginPath(); ctx.rect(-100, -400, C.W + 200, G + 400 + 3); ctx.clip();
      for (let k = 1; k <= 4; k++) {
        const top = tierTop(k, t); if (top > G - 2) continue;
        const cv = tierCv(k), hw = TIER_HW[k];
        ctx.drawImage(cv, MANX - (hw * 2 + 30) / 2, top - 16, hw * 2 + 30, k * D + 100);
      }
      ctx.restore();
      // tabanda koyu temas çizgisi + kalkan toprak
      for (let k = 1; k <= 4; k++) {
        const rk = riseK(k, t); if (rk <= 0) continue;
        const hw = TIER_HW[k], u = seg(t, RISE[k][0], RISE[k][0] + 0.9);
        if (u < 1) {
          const r = rng(100 + k);
          for (let i = 0; i < 9; i++) {
            const sx = MANX + (r.chance(0.5) ? -1 : 1) * (hw + r.range(-6, 18)), life = r.range(0.4, 1);
            const v = u / life; if (v >= 1) continue;
            const yy = G - 8 - Math.sin(v * Math.PI) * r.range(16, 42), xx = sx + (sx > MANX ? 1 : -1) * v * r.range(8, 30);
            ctx.fillStyle = rgba(r.chance(0.5) ? '#6A4250' : '#9E6250', 1 - v); ctx.beginPath(); ctx.arc(xx, yy, r.range(2.5, 5), 0, TAU); ctx.fill();
          }
          // düşen toprak kırıntıları (basamak kenarından)
          for (let i = 0; i < 6; i++) {
            const sx = MANX + (i % 2 ? -1 : 1) * (hw - r.range(4, 20)), t0 = RISE[k][0] + r.range(0.05, 0.4);
            const v = seg(t, t0, t0 + 0.5); if (v <= 0 || v >= 1) continue;
            const yy = tierTop(k, t0) + 20 + v * v * 160;
            ctx.fillStyle = rgba('#7E4A44', 1 - v * 0.6); ctx.beginPath(); ctx.arc(sx, Math.min(yy, G - 3), r.range(2, 4), 0, TAU); ctx.fill();
          }
        }
        ctx.fillStyle = rgba('#1E1A40', 0.35 * clamp(rk * 3)); ctx.fillRect(MANX - hw - 4, G - 2, hw * 2 + 8, 6);
      }
    }
    // ışık konisi (arka)
    const mTop = tierTop(4, t);
    drawBeam(ctx, t, bk, mTop, 'back');
    // canlılar: başlangıçta merkeze, ışık yanınca adama (yukarı) bakarlar
    for (let i = 0; i < SLOTS.length; i++) {
      const s = SLOTS[i];
      const k = C.pop(t, s.pop, 0.42, 2.0);
      if (k <= 0.001) continue;
      const y = tierTop(s.tier, t);
      // yükselişte kısa sarsıntı (sekiye binme), sonra oturma
      let bounce = 0;
      if (s.tier) { const [t0, dur] = RISE[s.tier]; bounce = Math.sin(Math.PI * seg(t, t0 + dur * 0.55, t0 + dur + 0.15)) * 0.06; }
      // ışık düşünce sırayla adama dönüp bakarlar; arada küçük baş hareketleri (ikincil hareket)
      const look = 0.55 * E.inOutSine(seg(t, 19.62 + i * 0.09, 20.1 + i * 0.09)) + 0.25 * E.inOutSine(seg(t, 21.2 + i * 0.03, 21.7 + i * 0.03))
        + 0.12 * Math.sin(t * 2.3 + i * 1.7) * C.win(t, 19.9, 20.85, 0.3, 0.2);
      const fly = s.kind === 'butterfly' ? 0.35 * E.inOutSine(seg(t, 20.8, 21.3)) : 0;
      const orbit = s.kind === 'bee' ? C.win(t, 19.7, 20.85, 0.35, 0.3) : 0;
      K.drawBeing(ctx, s.kind, s.x, y, { t, dir: s.dir, look: clamp(look), pop: k * (1 - bounce), scale: CSC, la: LA, pal: 'dusk', fly, orbit });
      popBurst(ctx, s.x, y, t, s.pop, K.BEINGS[s.kind].tw * CSC);
    }
    // adam
    const mk = C.pop(t, 17.98, 0.48, 1.7);
    if (mk > 0.001) {
      const p = manPose(t);
      const la = lerp(LA, -Math.PI / 2 - 0.3, E.smooth(seg(t, BEAM_T, BEAM_T + 0.4)));
      ctx.save(); ctx.translate(MANX, mTop); ctx.scale(mk, mk); ctx.translate(-MANX, -mTop);
      ctx.fillStyle = rgba('#1E1A40', 0.28); ctx.beginPath(); ctx.ellipse(MANX + 6, mTop + 2, 42, 7, 0, 0, TAU); ctx.fill();
      M.drawMan(ctx, p, { x: MANX, y: mTop, h: MANH, dir: 1, light: la });
      ctx.restore();
      popBurst(ctx, MANX, mTop, t, 17.98, 120);
    }
    drawBeam(ctx, t, bk, mTop, 'front');
    fireflies(ctx, t, 1 - 0.5 * clamp(bk));
    // ışık yanınca çevre hafifçe kararır (sahne ışığı etkisi)
    if (bk > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      const gx = MANX, gyy = mTop - MANH * 0.5;
      const g = ctx.createRadialGradient(gx, gyy, 180, gx, gyy, 900);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, mix('#FFFFFF', '#8A86C0', 0.42 * clamp(bk)));
      ctx.fillStyle = g; ctx.fillRect(-200, -600, C.W + 400, C.H + 1200); ctx.restore();
    }
    ctx.restore();
    // ön plan: koyu çimen öbekleri (paralaksla kayar; anlam bandının altında kalır)
    const fdy = (1039 - cy) * 1.8;
    if (fdy < 420) { ctx.save(); ctx.translate(0, fdy); ctx.drawImage(fgCv(), -40, 1560, C.W + 80, 420); ctx.restore(); }
  },
  sfx: [
    { t: 17.98, type: 'pop', gain: 0.22 },
    { t: 18.68, type: 'sparkle', gain: 0.3 },
    { t: 19.38, type: 'swell', gain: 0.3 },
    { t: 19.48, type: 'chime', gain: 0.28 },
    { t: 20.8, type: 'rumble', gain: 0.32 },
  ],
};
