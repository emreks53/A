// s09 yardımcıları: düşünce bulutları (geçmiş: sepya ziyafet + bahar bahçesi; gelecek: fırtına, şimşek, dalgalar),
// tozlaşarak ufalanma (parça parça dağılma), düşünce noktacıkları.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const L = require('./_s05_lib');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, seg } = C;

const VW = 340, VH = 236;           // iç resim boyu (bulut yerel px, ölçek 1)
const SSV = 2.2;                    // iç resim önbellek çözünürlüğü

// bulut biçimi: elips çevresine dizilmiş kabarcıklar (yerel, merkez 0,0)
function puffList(seed, rx = 178, ry = 124, k = 1, n = 12) {
  const r = rng(seed), list = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r.range(-0.08, 0.08);
    const rr = r.range(52, 70) * k;
    list.push([Math.cos(a) * rx * k, Math.sin(a) * ry * k, rr]);
  }
  return list;
}
function circlesToPolys(list, cx, cy, s, shrink = 0) {
  const out = list.map(([x, y, rr]) => P.ellipsePts(cx + x * s, cy + y * s, Math.max(2, (rr - shrink) * s), Math.max(2, (rr - shrink) * s * 0.96), 22));
  out.push(P.ellipsePts(cx, cy, (178 - shrink * 0.6) * s, (124 - shrink * 0.6) * s, 40));
  return out;
}

// kabarcık birleşiminin tek parça dış çizgisi (merkezden yıldız biçimli): ışın başına en uzak kesişim
function starOutline(list, cx, cy, s, shrink = 0, n = 160) {
  const out = [];
  const erx = (178 - shrink * 0.6), ery = (124 - shrink * 0.6);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, dx = Math.cos(a), dy = Math.sin(a);
    let best = 1 / Math.sqrt((dx * dx) / (erx * erx) + (dy * dy) / (ery * ery));
    for (const [px, py, rr0] of list) {
      const rr = rr0 - shrink; if (rr <= 0) continue;
      const b = px * dx + py * dy, c = px * px + py * py - rr * rr, disc = b * b - c;
      if (disc < 0) continue;
      const tf = b + Math.sqrt(disc);
      if (tf > best) best = tf;
    }
    out.push([cx + dx * best * s, cy + dy * best * s]);
  }
  return out;
}
// ---------- geçmiş: sepya ziyafet + bahar bahçesi ----------
// Büyük, sade, tek bakışta okunan öğeler: çiçekli ağaç, bakır sini üstünde nar, üzüm, ince belli çay bardağı, demlik.
function pastCv() {
  return L.hcache('s09past2', VW, VH, SSV, (x) => {
    x.fillStyle = '#E9C996'; x.fillRect(0, 0, VW, VH);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: VW, y1: VH, w: VW, h: VH }, ['#F8EBCB', '#F2DCB0', '#E9C793'], { seed: 91, wMin: 9, wMax: 16, lMin: 30, lMax: 90, stops: [0, 0.5, 1] });
    // güneş
    P.glow(x, 282, 50, 100, '#FFF6D8', 0.65);
    x.fillStyle = '#FFF4D6'; x.beginPath(); x.arc(282, 48, 22, 0, TAU); x.fill();
    // uzak tepe
    const hill = []; for (let i = 0; i <= 20; i++) { const u = i / 20; hill.push([u * VW, 146 - Math.sin(u * 3.2 + 0.4) * 14]); }
    P.toneShape(x, hill.concat([[VW, VH], [0, VH]]), { base: '#C9BA80', dark: '#A49464', light: '#DDD09A', seed: 92, rim: false, shadowW: 0.04, lightW: 0.02, dabs: 8, texture: 0.3 });
    // çimen
    P.toneShape(x, [[0, 186], [VW, 182], [VW, VH], [0, VH]], { base: '#AFA96C', dark: '#8A8552', light: '#C9C489', seed: 96, rim: false, shadowW: 0.05, dabs: 10, texture: 0.3 });
    const r = rng(94);
    // çiçekli ağaç (bahar): büyük taç
    P.toneShape(x, P.smoothPts([[50, 200], [55, 150], [46, 112], [62, 108], [70, 150], [74, 200]], true, 4), { base: '#8A6A4A', dark: '#5A4030', light: '#B08A60', seed: 93, rim: false, dabs: 2, texture: 0.3 });
    x.strokeStyle = '#7A5A3E'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(60, 128); x.quadraticCurveTo(80, 104, 96, 92); x.stroke();
    const cr = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; cr.push(P.ellipsePts(62 + Math.cos(a) * 42, 80 + Math.sin(a) * 30, r.range(26, 32), r.range(23, 28), 20)); }
    cr.push(P.ellipsePts(62, 80, 48, 36, 24));
    L.toneUnion2(x, cr, { base: '#F0BCB2', dark: '#CC9096', light: '#FCE3DA', seed: 95, shadowW: 0.14, lightW: 0.06, dabs: 7, highlights: 5, texture: 0.3, rimW: 2 });
    for (let i = 0; i < 30; i++) { const bx = 62 + r.range(-58, 58), by = 80 + r.range(-40, 36); x.fillStyle = r.chance(0.6) ? '#FFF6EE' : '#E8949A'; x.beginPath(); x.arc(bx, by, r.range(2.2, 4), 0, TAU); x.fill(); }
    // düşen çiçek yaprakları
    for (let i = 0; i < 6; i++) { x.fillStyle = '#F6CFC8'; x.beginPath(); x.ellipse(100 + i * 16 + r.range(-6, 6), 128 + r.range(-10, 40), 3.2, 2, r.range(0, 3), 0, TAU); x.fill(); }
    for (let i = 0; i < 8; i++) R.flower(x, r.range(10, 330), r.range(204, 228), r.range(5, 7), r.int(1, 99), { color: r.chance(0.5) ? '#FFF7E8' : '#F6D27A', dark: '#C9B08A', inner: '#E8A050' });
    // alçak sofra + bakır sini
    const tx = 222, ty = 176;
    for (const lx of [-70, 66]) P.toneShape(x, [[tx + lx, ty + 6], [tx + lx + 2, ty + 32], [tx + lx + 8, ty + 32], [tx + lx + 6, ty + 6]], { base: '#7A5034', dark: '#4E3020', light: '#9A6A44', seed: 97, rim: false, dabs: 1, texture: 0.2 });
    P.toneShape(x, P.ellipsePts(tx, ty + 4, 104, 16, 40), { base: '#B8743E', dark: '#7E4A26', light: '#E3A266', seed: 98, shadowW: 0.25, lightW: 0.12, dabs: 4, texture: 0.25, rimW: 2 });
    P.toneShape(x, P.ellipsePts(tx, ty, 96, 13, 40), { base: '#D99A55', dark: '#A8683A', light: '#F2C27E', seed: 99, rim: false, shadowW: 0.2, lightW: 0.15, dabs: 3, texture: 0.25 });
    x.strokeStyle = rgba('#FFE2A8', 0.7); x.lineWidth = 1.4; x.beginPath(); x.ellipse(tx, ty, 80, 9, 0, Math.PI * 1.05, Math.PI * 1.75); x.stroke();
    // nar (büyük, tepesinde taç)
    const nx = 160, ny = 158;
    L.blob(x, P.ellipsePts(nx, ny, 21, 20, 22), '#C24A3A', { dark: '#8A2A2E', light: '#E8806A', la: -2.3, size: 28, rim: true, rimW: 1.6 });
    x.fillStyle = '#8A2A2E'; x.beginPath(); x.moveTo(nx - 5, ny - 18); x.lineTo(nx - 3, ny - 25); x.lineTo(nx, ny - 20); x.lineTo(nx + 3, ny - 25); x.lineTo(nx + 5, ny - 18); x.closePath(); x.fill();
    x.fillStyle = rgba('#FFE0C8', 0.75); x.beginPath(); x.ellipse(nx - 8, ny - 7, 4, 2.5, -0.6, 0, TAU); x.fill();
    // üzüm salkımı
    const gp = [[190, 160], [200, 160], [210, 160], [195, 152], [205, 152], [215, 153], [200, 144], [210, 145], [205, 137], [186, 152]];
    for (const [gx, gy] of gp) L.blob(x, P.ellipsePts(gx, gy, 6.4, 6.2, 14), '#8E6290', { dark: '#5E3A66', light: '#B88AB4', la: -2.3, size: 8 });
    x.strokeStyle = '#6A5A2A'; x.lineWidth = 2; x.beginPath(); x.moveTo(205, 132); x.quadraticCurveTo(210, 124, 218, 124); x.stroke();
    L.quickLeaf(x, 214, 128, 14, -0.5, { base: '#8A9A4A', dark: '#5E6A30', light: '#B8C46A' });
    // ince belli çay bardağı + tabak
    const gx = 246, gy = ty - 6;
    x.fillStyle = '#EADCC0'; x.beginPath(); x.ellipse(gx, gy, 16, 4.5, 0, 0, TAU); x.fill();
    const glass = P.smoothPts([[gx - 9, gy - 1], [gx - 6, gy - 11], [gx - 10, gy - 24], [gx - 9, gy - 33], [gx + 9, gy - 33], [gx + 10, gy - 24], [gx + 6, gy - 11], [gx + 9, gy - 1]], true, 4);
    x.fillStyle = '#B5562E'; x.fill(P.pathOf(glass));
    x.fillStyle = rgba('#7A2E16', 0.5); x.fillRect(gx + 2, gy - 28, 5, 22);
    x.fillStyle = rgba('#FFF2DA', 0.6); x.fillRect(gx - 6, gy - 29, 2.6, 18);
    x.strokeStyle = rgba('#FFF6EA', 0.85); x.lineWidth = 1.4; x.stroke(P.pathOf(glass));
    // buhar
    x.strokeStyle = rgba('#FFFFFF', 0.55); x.lineWidth = 2; x.lineCap = 'round';
    for (const ox of [-3, 4]) { x.beginPath(); x.moveTo(gx + ox, gy - 38); x.bezierCurveTo(gx + ox - 6, gy - 46, gx + ox + 6, gy - 52, gx + ox, gy - 60); x.stroke(); }
    // demlik
    const px = 290, py = ty - 6;
    L.blob(x, P.smoothPts([[px - 16, py], [px - 19, py - 17], [px - 10, py - 29], [px + 10, py - 29], [px + 19, py - 17], [px + 16, py]], true, 4), '#C8884A', { dark: '#8A5A2E', light: '#F0B87A', la: -2.3, size: 22, rim: true, rimW: 1.4 });
    x.strokeStyle = '#A06A3A'; x.lineWidth = 3.5; x.beginPath(); x.moveTo(px - 16, py - 13); x.quadraticCurveTo(px - 30, py - 18, px - 32, py - 28); x.stroke();
    x.strokeStyle = '#8A5A2E'; x.lineWidth = 3; x.beginPath(); x.arc(px + 18, py - 15, 7, -1.3, 1.3); x.stroke();
    x.fillStyle = '#E0A060'; x.beginPath(); x.arc(px, py - 32, 4, 0, TAU); x.fill();
    // sepya birlik: sıcak tek ton + kenar kararması
    x.save(); x.globalCompositeOperation = 'color'; x.fillStyle = rgba('#C49A62', 0.38); x.fillRect(0, 0, VW, VH); x.restore();
    const g = x.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VW * 0.62);
    g.addColorStop(0, 'rgba(120,80,40,0)'); g.addColorStop(1, 'rgba(120,80,40,0.32)'); x.fillStyle = g; x.fillRect(0, 0, VW, VH);
  });
}
// ufalanma: resim, soldan sağa ilerleyen tırtıklı bir sınırda kum ve fırça lekeleri hâlinde sola savrulur;
// geride soluk bir sepya hayalet kalır (geçmişin izi). crumble: başlangıçtan beri geçen süre (sn)
const CR_DUR = 0.8;
const edgeU = (v, k) => k * 1.3 - 0.2 + (C.noise1(v * 3.1, 7) - 0.5) * 0.3 + (C.noise1(v * 9.7, 3) - 0.5) * 0.08;
let PCOL = null;
function pastColor(u, v) {
  if (!PCOL) { const cv = pastCv(); PCOL = { w: cv.width, h: cv.height, d: cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data }; }
  const X = Math.min(PCOL.w - 1, Math.max(0, Math.round(u * PCOL.w))), Y = Math.min(PCOL.h - 1, Math.max(0, Math.round(v * PCOL.h)));
  const k = (Y * PCOL.w + X) * 4; return [PCOL.d[k], PCOL.d[k + 1], PCOL.d[k + 2]];
}
const GRAINS = (() => {
  const r = rng(123), out = [];
  for (let i = 0; i < 180; i++) {
    const u = r.next(), v = r.next();
    // kopma anı: sınır bu noktadan geçtiğinde
    const kDet = (u + 0.2 - (C.noise1(v * 3.1, 7) - 0.5) * 0.3 - (C.noise1(v * 9.7, 3) - 0.5) * 0.08) / 1.3;
    out.push({ u, v, tDet: kDet * CR_DUR, vx: -r.range(70, 190), vy: -r.range(-25, 55), spin: r.range(-4, 4), a0: r.range(-0.4, 0.4), len: r.range(11, 21), w: r.range(6, 11), dab: r.chance(0.55), seed: r.int(1, 1e9) });
  }
  return out;
})();
function drawPastContent(x, cx, cy, s, crumble, alpha = 1) {
  const cv = pastCv();
  const W = VW * s, H = VH * s, x0 = cx - W / 2, y0 = cy - H / 2;
  if (crumble <= 0) { x.save(); x.globalAlpha *= alpha; x.drawImage(cv, x0, y0, W, H); x.restore(); return; }
  const k = crumble / CR_DUR;
  x.save(); x.globalAlpha *= alpha;
  // soluk sepya hayalet (kalıcı)
  x.save(); x.globalAlpha *= 0.34 * clamp(crumble / 0.5); x.drawImage(cv, x0, y0, W, H); x.restore();
  // henüz savrulmamış kısım: tırtıklı sınırın sağı
  if (k < 1.25) {
    const reg = [];
    for (let i = 0; i <= 24; i++) { const v = i / 24; reg.push([x0 + clamp(edgeU(v, k), -0.05, 1.05) * W, y0 + v * H]); }
    reg.push([x0 + W + 4, y0 + H + 4], [x0 + W + 4, y0 - 4]);
    x.save(); x.clip(P.pathOf(reg)); x.drawImage(cv, x0, y0, W, H); x.restore();
  }
  // kopan kum taneleri ve fırça lekeleri: resmin kendi renginde, sola savrulur ve solar
  for (const g of GRAINS) {
    const u = crumble - g.tDet;
    if (u <= 0 || u > 1.0) continue;
    const c = pastColor(g.u, g.v), col = C.rgb2hex([c[0], c[1], c[2]]);
    const px = x0 + g.u * W + (g.vx * u - 40 * u * u) * s, py = y0 + g.v * H + (g.vy * u + 26 * u * u) * s;
    const a = (1 - u) * (1 - u) * 0.95;
    x.save(); x.globalAlpha *= a;
    if (g.dab) {
      const ang = g.a0 + g.spin * u, L2 = g.len * s * (1 - 0.4 * u), ca = Math.cos(ang), sa = Math.sin(ang);
      P.stroke(x, px - ca * L2 / 2, py - sa * L2 / 2, px + ca * L2 / 2, py + sa * L2 / 2, g.w * s * (1 - 0.3 * u), col, g.seed, { detail: 0, taper1: 0.5 });
    } else {
      x.fillStyle = col; x.beginPath(); x.arc(px, py, (1.6 + g.w * 0.25) * s, 0, TAU); x.fill();
    }
    x.restore();
  }
  x.restore();
}
// toz zerreleri (ufalanırken buluttan sola süzülür)
function dust(x, cx, cy, s, crumble, seed = 5) {
  if (crumble <= 0 || crumble > 2.2) return;
  const r = rng(seed);
  for (let i = 0; i < 46; i++) {
    const t0 = r.range(0, 0.9), u = crumble - t0;
    const ox = r.range(-170, 120), oy = r.range(-100, 100), vx = -r.range(60, 180), vy = -r.range(-20, 50), sz = r.range(1.6, 4.2);
    if (u <= 0 || u > 1.3) continue;
    const a = Math.sin((u / 1.3) * Math.PI) * 0.8;
    x.fillStyle = rgba(r.chance(0.5) ? '#E8C590' : '#CDB08A', a);
    x.beginPath(); x.arc(cx + (ox + vx * u) * s, cy + (oy + vy * u - 20 * u * u) * s, sz * s, 0, TAU); x.fill();
  }
}

// ---------- gelecek: fırtına (koyu gök + bulut önbellekli; dalga, yağmur, şimşek her kare) ----------
const SW = 360, SH = 250;
function stormCv() {
  return L.hcache('s09storm', SW, SH, SSV, (x) => {
    x.fillStyle = '#1E1B3E'; x.fillRect(0, 0, SW, SH);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: SW, y1: SH, w: SW, h: SH }, ['#1C1A3C', '#2A2A58', '#3A4070', '#2A4A62'], { seed: 101, wMin: 9, wMax: 16, lMin: 30, lMax: 100, stops: [0, 0.35, 0.6, 1] });
    const r = rng(102); const list = [];
    for (let i = 0; i < 7; i++) list.push(P.ellipsePts(20 + i * 52 + r.range(-10, 10), 40 + r.range(-12, 18), r.range(40, 58), r.range(30, 40), 20));
    L.toneUnion2(x, list, { base: '#4A4878', dark: '#2A2850', light: '#6E6CA0', seed: 103, shadowW: 0.08, lightW: 0.03, dabs: 10, highlights: 5, texture: 0.35, lightAng: -1.6, rim: false });
    // ufuk çizgisi: koyu deniz
    P.toneShape(x, [[0, 150], [SW, 146], [SW, SH], [0, SH]], { base: '#1F4A5E', dark: '#14304A', light: '#2E6A7A', seed: 104, rim: false, shadowW: 0.03, dabs: 8, texture: 0.3 });
  });
}
// kıvrılan dalga: sola (adama doğru) ilerler. x: tepe noktası, y: taban, H yükseklik, Wd genişlik
function waveGlyph(x, cx, by, H, Wd, body, back, foam, seed) {
  const pts = P.smoothPts([
    [cx + Wd * 0.62, by], [cx + Wd * 0.3, by - H * 0.35], [cx + Wd * 0.05, by - H * 0.85], [cx - Wd * 0.12, by - H],
    [cx - Wd * 0.3, by - H * 0.92], [cx - Wd * 0.4, by - H * 0.7], [cx - Wd * 0.33, by - H * 0.6], [cx - Wd * 0.26, by - H * 0.66],
    [cx - Wd * 0.2, by - H * 0.5], [cx - Wd * 0.28, by - H * 0.15], [cx - Wd * 0.4, by],
  ], true, 5);
  L.blob(x, pts, body, { dark: shade(body, -0.1), light: back, la: -0.6, size: H * 0.7, ks: 0.32, kl: 0.18 });
  // köpük: tepe ve dudak boyunca
  const crest = []; for (let k = 0; k <= 8; k++) { const u = k / 8; crest.push([cx + Wd * lerp(0.12, -0.36, u), by - H * (0.86 + 0.14 * Math.sin(u * Math.PI)) + (u > 0.75 ? H * (u - 0.75) * 1.0 : 0)]); }
  P.curveStroke(x, crest, (u) => H * 0.13 * (0.4 + 0.6 * Math.sin(u * Math.PI)), foam, seed, { bristles: 2, detail: 0.4 });
  for (let k = 0; k < 3; k++) { const fx = cx + Wd * (0.02 + k * 0.12), fy = by - H * (0.62 - k * 0.18); P.stroke(x, fx, fy, fx + Wd * 0.14, fy + H * 0.06, H * 0.06, rgba(foam, 0.6), seed + k + 1, { detail: 0, taper1: 0.3 }); }
}
function waveRow(x, by, H, Wd, gap, scroll, body, back, foam, seed) {
  const step = Wd + gap;
  const off = ((scroll % step) + step) % step;
  for (let cx = -Wd + (step - off); cx < SW + Wd; cx += step) waveGlyph(x, cx, by, H, Wd, body, back, foam, seed + Math.round((cx + off) / step));
  const base = []; for (let X = -20; X <= SW + 20; X += 10) base.push([X, by - 3 + Math.sin((X + scroll) * 0.06) * 3]);
  x.fillStyle = body; x.fill(P.pathOf(base.concat([[SW + 20, by + SH], [-20, by + SH]])));
}
function bolt(x, x0, y0, len, seed, w = 7) {
  const r = rng(seed), pts = [[x0, y0]];
  let X = x0, Y = y0;
  for (let i = 0; i < 5; i++) { X += r.range(-26, 26); Y += len / 5; pts.push([X, Y]); }
  const L1 = [], R1 = [];
  for (let i = 0; i < pts.length; i++) { const ww = w * (1 - i / pts.length * 0.7); L1.push([pts[i][0] - ww, pts[i][1]]); R1.push([pts[i][0] + ww * 0.6, pts[i][1] + ww * 0.3]); }
  const poly = L1.concat(R1.reverse());
  x.save(); x.strokeStyle = rgba('#FFE070', 0.55); x.lineWidth = 7; x.lineJoin = 'round'; x.stroke(P.pathOf(poly)); x.restore();
  x.fillStyle = '#FFFBE6'; x.fill(P.pathOf(poly));
  return pts;
}
function drawStormContent(x, cx, cy, s, t, st) {
  const x0 = cx - SW / 2 * s, y0 = cy - SH / 2 * s;
  x.drawImage(stormCv(), x0, y0, SW * s, SH * s);
  x.save(); x.translate(x0, y0); x.scale(s, s);
  // yağmur
  L.rain(x, -10, SW + 10, 50, SH, t, 34, 211, { speed: 520, len: 22, ang: -0.25, color: '#9FB4D8', alpha: 0.55 });
  // dalgalar: arkadan öne, sola (adama doğru) akar ve yaklaştıkça büyür
  const ap = st.approach;
  waveRow(x, 172, 20 + 8 * ap, 70, 30, t * 40, '#173E52', '#24586A', '#9DB8C6', 300);
  waveRow(x, 206, 34 + 16 * ap, 110, 40, t * 62 + 50, '#1B4C60', '#2C6A7C', '#CFE2EA', 320);
  waveRow(x, 252, 48 + 40 * ap, 160, 60, t * 90 + 20, '#1F5A6E', '#33808E', '#F2FAFB', 340);
  // şimşek
  if (st.flash > 0.02) {
    x.save(); x.globalAlpha = clamp(st.flash);
    P.glow(x, 230, 110, 120, '#E8ECFF', 0.7 * st.flash);
    bolt(x, 230, 50, 150, st.boltSeed, 9);
    x.restore();
    x.save(); x.globalCompositeOperation = 'screen'; x.fillStyle = rgba('#B8C8FF', 0.45 * st.flash); x.fillRect(0, 0, SW, SH); x.restore();
  }
  x.restore();
}

// ---------- bulut çerçevesi ----------
// kind: 'past' | 'storm'. o: { scale, pop, crumble, t, storm{...}, heavy 0..1, dim }
function bubble(x, kind, cx, cy, o) {
  const s = o.scale ?? 1;
  if (s <= 0.01) return;
  const seed = kind === 'past' ? 401 : 402;
  const pl = puffList(seed);
  const outer = circlesToPolys(pl, cx, cy, s, 0);
  const heavy = o.heavy ?? 0;
  let base, dark, light;
  if (kind === 'past') {
    const dusty = clamp(o.dusty ?? 0);
    base = mix(mix('#F6E8CC', '#BFB2A2', dusty), '#7C7488', heavy * 0.6);
    dark = mix(mix('#CDB08A', '#8E8294', dusty), '#4E4862', heavy * 0.6);
    light = mix('#FFF8E8', '#D8CEC4', dusty);
  } else {
    base = mix('#3E3C62', '#2C2A4A', heavy); dark = mix('#201E3C', '#16142C', heavy); light = mix('#64628E', '#4A4870', heavy);
  }
  L.toneUnion2(x, outer, { base, dark, light, seed, lightAng: -1.9, shadowW: 0.1, lightW: 0.04, dabs: 14, highlights: 6, texture: 0.4, size: 360 * s, rimW: Math.max(2, 5 * s) });
  // iç pencere
  const innerOl = starOutline(pl, cx, cy, s, 18);
  const ip = P.pathOf(innerOl);
  x.save(); x.clip(ip);
  if (kind === 'past') {
    x.fillStyle = mix(mix('#EADBC2', '#B8AC9E', clamp(o.dusty ?? 0)), '#6E667E', heavy * 0.6); x.fill(ip);
    drawPastContent(x, cx, cy + 4 * s, s * 1.38, o.crumble ?? 0);
    dust(x, cx, cy, s, o.crumble ?? 0);
    if (heavy > 0) { x.fillStyle = rgba('#3A3450', heavy * 0.35); x.fill(ip); }
  } else {
    drawStormContent(x, cx, cy + 10 * s, s * 1.34, o.t, o.storm);
    if (heavy > 0) { x.fillStyle = rgba('#14122A', heavy * 0.25); x.fill(ip); }
  }
  // iç kenar gölgesi (pencere derinliği): pencerenin aşağı-sağa kaydırılmış kopyasının dışı
  const ring = P.pathOf(innerOl.map(([a, b]) => [a + 7 * s, b + 9 * s]));
  ring.rect(cx - 600 * s, cy - 600 * s, 1200 * s, 1200 * s);
  x.fillStyle = rgba(kind === 'past' ? '#7A5A3A' : '#0A0818', 0.3); x.fill(ring, 'evenodd');
  x.restore();
}
// düşünce noktacıkları: baştan buluta doğru büyüyen 3 kabarcık
function dots(x, hx, hy, bx, by, k, kind, s = 1) {
  const cols = kind === 'past' ? ['#F6E8CC', '#CDB08A'] : ['#57557F', '#2E2C52'];
  for (let i = 0; i < 3; i++) {
    const a = clamp(k * 3 - i);
    if (a <= 0) continue;
    const u = 0.2 + i * 0.22;
    const px = lerp(hx, bx, u), py = lerp(hy, by, u) - Math.sin(u * Math.PI) * 30;
    const rr = (8 + i * 6) * E.outBack(a, 2) * s;
    L.blob(x, P.ellipsePts(px, py, rr, rr * 0.92, 18), cols[0], { dark: cols[1], la: -1.9, size: rr * 1.6, ks: 0.3, rim: true, rimW: 2 });
  }
}

module.exports = { bubble, dots, puffList, VW, VH };
