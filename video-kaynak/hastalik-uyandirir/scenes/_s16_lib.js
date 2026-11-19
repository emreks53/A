// s16–s18 ortak yardımcılar: önbellekli sprite, paralaks kamera, gaflet sisi (pembe-lila puf ve peçe),
// parıltı (glitter), süs topu, çiçek ve yol ağacı sprite'ları, düşünce balonu, yumuşak "puf" sönmesi.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, seg } = C;
const { W, H } = C;

// ---------- sprite ----------
const _spr = new Map();
function sprite(key, w, h, ax, ay, fn) {
  if (_spr.has(key)) return _spr.get(key);
  const cv = R.cached('s16spr:' + key, w, h, (x) => fn(x));
  const s = { cv, w, h, ax, ay, key };
  _spr.set(key, s);
  return s;
}
function put(ctx, s, x, y, sc = 1, rot = 0, alpha = 1, sx = 1) {
  if (sc <= 0.001 || alpha <= 0.002) return;
  ctx.save();
  ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(sc * sx, sc);
  if (alpha < 1) ctx.globalAlpha *= alpha;
  ctx.drawImage(s.cv, -s.ax, -s.ay);
  ctx.restore();
}

// ---------- paralaks kamera ----------
// cam = { x, y, z }: f=1 katmanında ekran ortasına düşen dünya noktası ve yakınlık. f<1 uzak katmanlar daha az kayar/yakınlaşır.
function zf(cam, f) { return 1 + (cam.z - 1) * (0.35 + 0.65 * f); }
function fy(f) { return f >= 1 ? f : 0.3 + 0.7 * f; }
function view(ctx, cam, f = 1) {
  const z = zf(cam, f);
  ctx.translate(W / 2, H / 2); ctx.scale(z, z);
  ctx.translate(-(f * (cam.x - W / 2) + W / 2), -(fy(f) * (cam.y - H / 2) + H / 2));
}
function toScreen(cam, f, lx, ly) {
  const z = zf(cam, f);
  return [W / 2 + z * (lx - (f * (cam.x - W / 2) + W / 2)), H / 2 + z * (ly - (fy(f) * (cam.y - H / 2) + H / 2))];
}
function fromScreen(cam, f, sx, sy) {
  const z = zf(cam, f);
  return [(sx - W / 2) / z + f * (cam.x - W / 2) + W / 2, (sy - H / 2) / z + fy(f) * (cam.y - H / 2) + H / 2];
}
// yumuşak rampa integrali: ∫ sm((τ-a)/(b-a)) dτ  (kadans değişince faz için)
function rampInt(t, a, b) {
  if (t <= a) return 0;
  const d = b - a;
  if (t >= b) return d * 0.5 + (t - b);
  const x = (t - a) / d;
  return d * (x * x * x - x * x * x * x / 2);
}
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

// ---------- gaflet sisi ----------
const FOG = { base: '#F3BFDB', dark: '#B9A0DC', light: '#FFE4F1', rim: '#E07AAE' };
// yumuşak sis pufu sprite'ı (s: yarıçap ölçüsü)
function puff(key, s, seed, o = {}) {
  const w = s * 3.0, h = s * 2.2;
  return sprite('puff:' + key, w, h, w / 2, h * 0.6, (x) => {
    const r = rng(seed), list = [];
    const n = o.n ?? 5;
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      const rr = s * (0.42 + 0.3 * Math.cos(u * 1.3)) * r.range(0.85, 1.12);
      list.push(P.blobPts(w / 2 + u * s * 0.85, h * 0.6 - rr * 0.45 + Math.abs(u) * s * 0.14, rr, rr * 0.86, seed * 7 + i, 0.1, 30));
    }
    list.push(P.roundRectPts(w / 2 - s * 1.12, h * 0.6 - s * 0.26, s * 2.24, s * 0.46, s * 0.22));
    P.toneUnion(x, list, { base: o.base || FOG.base, dark: o.dark || FOG.dark, light: o.light || FOG.light, rimColor: o.rim || FOG.rim, seed, lightAng: o.la ?? -2.0, shadowW: 0.16, lightW: 0.06, strokeAng: 0, texture: 0.35, dabs: Math.round(s / 9), highlights: Math.round(s / 18) + 2, rimW: Math.max(2, s * 0.03) });
    // kıvrımı izleyen açık yay darbeleri
    for (let i = 0; i < 3; i++) {
      const cx = w / 2 + r.range(-0.6, 0.6) * s, cy = h * 0.6 - s * 0.1;
      const arc = []; for (let k = 0; k <= 8; k++) { const a = Math.PI * (0.18 + 0.64 * k / 8); arc.push([cx + Math.cos(a) * s * 0.3, cy - Math.sin(a) * s * 0.2 - s * 0.1]); }
      P.curveStroke(x, arc, s * 0.06, rgba('#FFFFFF', 0.7), r.int(1, 1e9), { taper: true, bristles: 2 });
    }
  });
}
// başı saran gaflet pusu: yarı saydam, sürüklenen pembe-lila tüller. Her geçiş (arka/ön) önce ayrı bir tuvale tam
// örtücülükle boyanır, sonra tek parça olarak kısmi saydamlıkla basılır (üst üste binen darbelerde dikiş olmaz;
// saç ve yüz arkadan görünür). part: 'back' (adamdan önce) | 'front' (adamdan sonra). (hx,hy) baş merkezi,
// r ≈ baş yüksekliği, a görünürlük 0..1. Bağlam başın açısına döndürülmüş olabilir.
const VW = 760, VH = 560, VCX = 430, VCY = 270;
let _vcv = null;
function veilCanvas(i) {
  if (!_vcv) { const { createCanvas } = require('@napi-rs/canvas'); _vcv = [createCanvas(VW, VH), createCanvas(VW, VH)]; }
  return _vcv[i];
}
const VEIL_COLS = ['#EE9CCB', '#C8A0EC', '#F6B8DA', '#DE8FCF', '#B9A4F0'];
function wisp(x, pts, wMax, col, seed, a = 1) {
  if (pts.length < 2) return;
  x.globalAlpha = a;
  P.curveStroke(x, pts, (u) => wMax * Math.pow(Math.sin(Math.PI * clamp(u)), 0.75) + 0.6, col, seed, { bristles: 3 });
}
function veil(ctx, hx, hy, r, t, a, part, seed = 3, o = {}) {
  if (a <= 0.01) return;
  const dir = o.dir ?? 1;
  const grow = E.outCubic(clamp(a * 1.15));
  const back = part === 'back';
  const cv = veilCanvas(back ? 0 : 1), x = cv.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.clearRect(0, 0, VW, VH);
  x.translate(VCX, VCY); x.scale(dir, 1);
  const rr = rng(seed);
  // 1) başın çevresinde sürüklenen yaylar (yüz hizasında; tepede halka YOK). sin(θ)>0 → önde
  for (let i = 0; i < 5; i++) {
    const rx = r * rr.range(0.85, 1.3), ry = r * rr.range(0.28, 0.46), tilt = rr.range(-0.38, 0.05);
    const oy = r * rr.range(-0.22, 0.24), sp = rr.range(0.35, 0.7) * (i % 2 ? 1 : -1), ph = rr.range(0, TAU);
    const span = rr.range(1.1, 1.8) * grow, wd = r * rr.range(0.16, 0.26), col = VEIL_COLS[i % 5];
    const a0 = ph + t * sp;
    const seg2 = [];
    const flush = () => { if (seg2.length > 1) wisp(x, seg2.slice(), wd, col, seed * 13 + i * 7 + (back ? 0 : 3)); seg2.length = 0; };
    for (let k = 0; k <= 20; k++) {
      const th = a0 + span * (k / 20);
      const front = Math.sin(th) > 0;
      const ex = Math.cos(th) * rx, ey = Math.sin(th) * ry + Math.sin(t * 1.7 + k * 0.4 + i) * r * 0.03;
      const pt = [ex * Math.cos(tilt) - ey * Math.sin(tilt), oy + ex * Math.sin(tilt) + ey * Math.cos(tilt)];
      if (front !== back) seg2.push(pt); else flush();
    }
    flush();
  }
  if (back) {
    // 2) geriye akan, dalgalanan kuyruklar
    for (let i = 0; i < 4; i++) {
      const y0 = r * (-0.42 + i * 0.22), len = r * (1.8 + 0.35 * i + 0.25 * Math.sin(t * 0.9 + i)) * grow;
      const line = [];
      for (let k = 0; k <= 16; k++) { const u = k / 16; line.push([-r * 0.25 - u * len, y0 + Math.sin(u * 4.4 - t * 2.6 + i * 1.9) * r * 0.14 * u - u * r * (0.12 + 0.05 * i)]); }
      wisp(x, line, r * (0.26 - 0.03 * i), VEIL_COLS[(i + 2) % 5], seed + 40 + i);
    }
    // 3) kopup geriye süzülen küçük pus parçaları
    for (let i = 0; i < 6; i++) {
      const k = (t * 0.45 + i / 6) % 1;
      const px = -r * (0.3 + k * 2.4), py = r * (-0.5 + (i % 3) * 0.25) - k * r * 0.5 + Math.sin(k * 6 + i) * r * 0.08;
      const s0 = r * (0.1 + 0.16 * k);
      x.globalAlpha = Math.sin(Math.PI * k) * 0.9;
      x.fillStyle = VEIL_COLS[i % 5];
      x.fill(P.pathOf(P.blobPts(px, py, s0 * 1.4, s0, seed + 60 + i, 0.25, 16)));
    }
    x.globalAlpha = 1;
  } else {
    // 4) gözlerin önünden geçen tül (yarı saydam basılır: göz kapakları görünür)
    const lines = [[-0.1, 0.26, 0], [-0.3, 0.16, 1]];
    lines.forEach(([yc, wd, j]) => {
      const pts = [];
      for (let k = 0; k <= 18; k++) {
        const u = k / 18;
        pts.push([r * lerp(-0.75, 1.0, u), r * (yc + Math.sin(u * 3.0 + t * (1.6 + j * 0.5) + j) * 0.06 + Math.sin(t * 0.8 + j * 2) * 0.04) - Math.sin(Math.PI * u) * r * 0.05]);
      }
      wisp(x, pts.slice(0, 2 + Math.round(16 * grow)), r * wd, j ? '#F7C0DE' : '#EC9ACA', seed + 80 + j);
    });
    // 5) yumuşak pus: başın çevresinde belli belirsiz pembe bulanıklık
    x.globalAlpha = 1;
    const g = x.createRadialGradient(r * 0.1, -r * 0.1, r * 0.1, r * 0.1, -r * 0.05, r * 1.25);
    g.addColorStop(0, rgba('#F4B4DA', 0.6 * grow)); g.addColorStop(0.6, rgba('#DDB2EE', 0.34 * grow)); g.addColorStop(1, rgba('#E9C2F0', 0));
    x.fillStyle = g; x.fillRect(-r * 1.4, -r * 1.4, r * 2.8, r * 2.8);
  }
  ctx.save();
  ctx.globalAlpha *= (back ? 0.88 : 0.64) * clamp(a * 1.4);
  ctx.drawImage(cv, hx - VCX, hy - VCY);
  ctx.restore();
}

// ---------- parıltı ----------
function star4(ctx, x, y, s, a, col) {
  if (a <= 0 || s <= 0.3) return;
  ctx.globalAlpha = a; ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.12, x + s, y); ctx.quadraticCurveTo(x + s * 0.12, y + s * 0.12, x, y + s);
  ctx.quadraticCurveTo(x - s * 0.12, y + s * 0.12, x - s, y); ctx.quadraticCurveTo(x - s * 0.12, y - s * 0.12, x, y - s);
  ctx.fill();
}
// ekran alanında yavaşça süzülen, yanıp sönen parıltılar
function glitter(ctx, t, a, seed, box, n, o = {}) {
  if (a <= 0.01) return;
  const r = rng(seed);
  const cols = o.cols || ['#FFF6D6', '#FFE08A', '#FFD1EA', '#FFFFFF', '#C9F2FF'];
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x0 = r.range(box[0], box[2]), y0 = r.range(box[1], box[3]);
    const sp = r.range(0.7, 1.6), ph = r.range(0, 1), s0 = r.range(5, 15) * (o.scale ?? 1);
    const fall = r.range(10, 40) * (o.fall ?? 1), drift = r.range(-12, 12);
    const col = r.pick(cols);
    const k = (t * sp + ph) % 1;
    const tw = Math.pow(Math.sin(Math.PI * k), 2);
    const cyc = Math.floor(t * sp + ph);
    const jx = (C.hash2(i, cyc, seed) - 0.5) * 60, jy = (C.hash2(i, cyc, seed + 3) - 0.5) * 60;
    const x = x0 + jx + drift * k, y = y0 + jy + fall * k;
    if (o.skip && o.skip(x, y)) continue;
    star4(ctx, x, y, s0 * (0.4 + 0.6 * tw), a * tw, col);
    if (tw > 0.75 && s0 > 9) { ctx.globalAlpha = a * (tw - 0.75) * 2; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x, y, s0 * 0.18, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

// ---------- süs topu ----------
const BAUBLE_COLS = [
  ['#E8B23A', '#B0701A', '#FFE59A'],   // altın
  ['#E2408E', '#8E1E62', '#FF9CCB'],   // mor-pembe
  ['#2FB6C6', '#17608E', '#9CF0F2'],   // turkuaz
  ['#D8343A', '#7E1530', '#FF9A8A'],   // yakut
  ['#8C5AD8', '#47288E', '#CDB0FF'],   // mor
];
function bauble(ci, r = 40) {
  const c = BAUBLE_COLS[ci % BAUBLE_COLS.length];
  const w = r * 2.6, h = r * 3.0;
  return sprite('bauble' + ci + '_' + r, w, h, w / 2, r * 0.42, (x) => {
    const cx = w / 2, cy = r * 0.42 + r * 0.28 + r;
    // kapak
    P.toneShape(x, P.roundRectPts(cx - r * 0.24, r * 0.42, r * 0.48, r * 0.36, r * 0.08), { base: '#E2B048', dark: '#8A5A1A', light: '#FFE6A0', rim: false, shadowW: 0.3, lightW: 0.2, texture: 0.2, dabs: 0, highlights: 0, seed: 3 });
    x.strokeStyle = '#B07A2A'; x.lineWidth = r * 0.07; x.beginPath(); x.arc(cx, r * 0.36, r * 0.12, Math.PI * 0.9, Math.PI * 2.1); x.stroke();
    // küre
    P.toneShape(x, P.ellipsePts(cx, cy, r, r, 40), { base: c[0], dark: c[1], light: c[2], rimW: Math.max(2, r * 0.05), shadowW: 0.24, lightW: 0.18, coreScale: 0.86, texture: 0.25, dabs: 4, highlights: 2, seed: 11 + ci });
    // ince bant
    x.save(); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.clip();
    x.strokeStyle = rgba(shade(c[2], 0.1), 0.75); x.lineWidth = r * 0.09;
    x.beginPath(); x.ellipse(cx, cy + r * 0.05, r * 1.02, r * 0.3, 0, 0, Math.PI); x.stroke();
    x.restore();
    // parlama
    P.stroke(x, cx - r * 0.55, cy - r * 0.2, cx - r * 0.25, cy - r * 0.58, r * 0.22, 'rgba(255,255,255,0.92)', 7 + ci, { detail: 0, taper1: 0.5 });
    x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.arc(cx - r * 0.12, cy - r * 0.62, r * 0.08, 0, TAU); x.fill();
  });
}

// ---------- çiçek sprite'ı (parlak, doygun) ----------
const FLOWER_COLS = [
  { color: '#FF5FA8', dark: '#B0287A', inner: '#FFE36A', petals: 6 },
  { color: '#FFD23A', dark: '#D08A1E', inner: '#F06A2E', petals: 8 },
  { color: '#FF7A4A', dark: '#B0362A', inner: '#FFE08A', petals: 5 },
  { color: '#C77BFF', dark: '#6E3AB8', inner: '#FFE36A', petals: 7 },
  { color: '#FBF6FF', dark: '#B8A9DA', inner: '#F07BB2', petals: 7 },
];
function flowerSpr(ci, s = 40, seed = 1) {
  const fc = FLOWER_COLS[ci % FLOWER_COLS.length];
  const w = s * 3, h = s * 3.4;
  return sprite('flw' + ci + '_' + s + '_' + seed, w, h, w / 2, h - 4, (x) => {
    const r = rng(seed), bx = w / 2, by = h - 4;
    const top = [bx + r.range(-s * 0.15, s * 0.15), by - s * 1.9];
    P.curveStroke(x, [[bx, by], [lerp(bx, top[0], 0.5) + s * 0.08, by - s * 1.0], top], s * 0.09, '#2E7A3E', seed * 3 + 1, { bristles: 1 });
    R.leaf(x, bx + s * 0.02, by - s * 0.55, s * 0.62, -0.55, seed + 2, { base: '#3E9B4F', dark: '#1F6B3A', light: '#9ED64A' });
    R.leaf(x, bx - s * 0.02, by - s * 0.9, s * 0.55, -2.55, seed + 3, { base: '#3E9B4F', dark: '#1F6B3A', light: '#9ED64A' });
    R.flower(x, top[0], top[1], s * 0.72, seed + 5, { petals: fc.petals, color: fc.color, dark: fc.dark, inner: fc.inner, tilt: r.range(-0.2, 0.2) });
  });
}

// ---------- yol ağacı (kalın gövde, çatallanan dallar, geniş taç) ----------
// çapa: gövde tabanı. attach: taç altında süs asma noktaları (sprite koordinatına göre, çapadan)
function alleyTree(key, s, o = {}) {
  const w = s * 2.6, th = o.trunkH ?? s * 2.4, h = th + s * 1.25, ax = w / 2, ay = h - 4;
  const fork = ay - th, cy = fork - s * 0.42;
  const spr = sprite('tree:' + key, w, h, ax, ay, (x) => {
    const r = rng(o.seed ?? 3), bx = ax, by = ay;
    const tw = s * 0.11;
    const trunkC = o.trunk || '#7A4A2E';
    // çatal dallar (gövdenin arkasında başlar)
    const br = (x0, y0, x1, y1, ww, bend) => P.curveStroke(x, [[x0, y0], [lerp(x0, x1, 0.45) + bend, lerp(y0, y1, 0.55)], [x1, y1]], (u) => ww * (1 - u * 0.6), shade(trunkC, -0.04), r.int(1, 1e9), { bristles: 3 });
    br(bx - tw * 0.2, fork + tw, bx - s * 0.62, cy + s * 0.05, tw * 1.05, -s * 0.05);
    br(bx + tw * 0.2, fork + tw, bx + s * 0.58, cy + s * 0.02, tw * 0.95, s * 0.06);
    br(bx, fork + tw * 0.5, bx + s * 0.08, cy - s * 0.25, tw * 0.8, s * 0.04);
    const trunk = P.smoothPts([[bx - tw * 1.35, by], [bx - tw * 0.95, by - th * 0.3], [bx - tw * 0.72, by - th * 0.8], [bx - tw * 0.9, fork], [bx - tw * 0.2, fork - tw * 0.6], [bx + tw * 0.9, fork], [bx + tw * 0.78, by - th * 0.75], [bx + tw * 1.0, by - th * 0.28], [bx + tw * 1.5, by]], true, 6);
    P.toneShape(x, trunk, { base: trunkC, dark: '#46261A', light: '#A8703F', seed: (o.seed ?? 3) + 1, shadowW: 0.34, lightW: 0.14, texture: 0.55, strokeAng: Math.PI / 2, texAng: Math.PI / 2, dabs: 10, rimW: 4 });
    // kabuk darbeleri
    for (let i = 0; i < 14; i++) {
      const yy = by - r.range(0.05, 0.95) * th, xx = bx + r.range(-0.6, 0.6) * tw;
      P.stroke(x, xx, yy, xx + r.range(-2, 2), yy - r.range(20, 50), r.range(3, 6), r.chance(0.5) ? '#5A3220' : '#A8703F', r.int(1, 1e9), { detail: 0, taper1: 0.4 });
    }
    // taç
    const list = [];
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + r.range(-0.2, 0.2), rr = s * r.range(0.3, 0.4);
      list.push(P.blobPts(bx + Math.cos(a) * s * 0.7, cy + Math.sin(a) * s * 0.36, rr, rr * 0.86, (o.seed ?? 3) * 10 + i, 0.14, 28));
    }
    list.push(P.blobPts(bx, cy - s * 0.05, s * 0.72, s * 0.5, (o.seed ?? 3) + 77, 0.1, 30));
    P.toneUnion(x, list, { base: o.leaf || '#3E9B4F', dark: o.leafDark || '#17573A', light: o.leafLight || '#9ED64A', seed: o.seed ?? 3, shadowW: 0.17, lightW: 0.07, strokeAng: -0.5, dabs: Math.round(s / 5), rimW: 5 });
    for (let i = 0; i < Math.round(s / 3.2); i++) {
      const a = r.range(0, TAU), d = r.range(0.2, 0.92);
      const px = bx + Math.cos(a) * s * 0.98 * d, py = cy + Math.sin(a) * s * 0.58 * d;
      const lit = Math.cos(a - (-2.3)) > 0.1;
      const col = lit ? (r.chance(0.5) ? (o.leafLight || '#9ED64A') : '#C9E86A') : (r.chance(0.5) ? (o.leafDark || '#17573A') : '#256B3E');
      const ang = a + Math.PI / 2 + r.range(-0.4, 0.4), len = s * r.range(0.07, 0.15);
      P.stroke(x, px - Math.cos(ang) * len / 2, py - Math.sin(ang) * len / 2, px + Math.cos(ang) * len / 2, py + Math.sin(ang) * len / 2, s * r.range(0.035, 0.06), col, r.int(1, 1e9), { detail: 0.5, taper1: 0.5 });
    }
  });
  // süs asma noktaları: taç alt kenarı (çapaya göre)
  const r = rng((o.seed ?? 3) + 500);
  spr.attach = [];
  const na = o.nAttach ?? 8;
  for (let i = 0; i < na; i++) {
    const u = (i + 0.5) / na * 2 - 1;
    const px = ax + u * s * 1.05 + r.range(-14, 14);
    const py = cy + s * 0.5 * Math.sqrt(Math.max(0, 1 - u * u * 0.85)) + s * 0.1 + r.range(-12, 6);
    spr.attach.push([px - ax, py - ay, r.next()]);
  }
  return spr;
}
// ---------- ön plan öbeği (çimen + birkaç papatya) ----------
function clumpSpr(key, s, seed, o = {}) {
  const w = s * 1.4, h = s * 1.15;
  return sprite('clump:' + key, w, h, w / 2, h - 4, (x) => {
    const r = rng(seed), bx = w / 2, by = h - 4;
    for (let i = 0; i < 30; i++) {
      const x0 = bx + r.range(-s * 0.55, s * 0.55), hh = s * r.range(0.25, 0.7), lean = r.range(-0.5, 0.5);
      const line = []; for (let k = 0; k <= 6; k++) { const u = k / 6; line.push([x0 + Math.sin(lean) * hh * u * u, by - hh * u]); }
      P.curveStroke(x, line, (u) => s * 0.04 * (1 - u * 0.85), r.pick(o.greens || ['#2F8A45', '#3E9B4F', '#6DBA4C', '#1F6B45']), r.int(1, 1e9), { bristles: 1 });
    }
    const heads = [];
    for (let i = 0; i < (o.n ?? 4); i++) {
      const x0 = bx + r.range(-s * 0.36, s * 0.36), hh = s * r.range(0.55, 0.95), lean = r.range(-0.25, 0.25);
      const line = []; for (let k = 0; k <= 8; k++) { const u = k / 8; line.push([x0 + Math.sin(lean) * hh * u * u * 0.8, by - hh * u]); }
      P.curveStroke(x, line, s * 0.02, '#2E7A3E', r.int(1, 1e9), { bristles: 1 });
      heads.push([line[8][0], line[8][1]]);
    }
    heads.sort((a, b) => a[1] - b[1]);
    for (const [hx, hy] of heads) R.flower(x, hx, hy, s * 0.1, r.int(1, 99), { tilt: r.range(-0.3, 0.3), color: o.petal, dark: o.petalDark });
  });
}

// ---------- düşünce balonu ----------
// puf daireleri (yerel, merkez 0,0, r≈1 ölçek)
function balloonCircles(seed, n = 11) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + r.range(-0.1, 0.1); out.push([Math.cos(a) * 0.86, Math.sin(a) * 0.62, r.range(0.3, 0.4)]); }
  return out;
}
function balloonSprite(key, s, seed, content, o = {}) {
  const w = s * 2.9, h = s * 2.3, cx = w / 2, cy = h / 2;
  return sprite('balloon:' + key, w, h, cx, cy, (x) => {
    const circ = balloonCircles(seed);
    const list = circ.map(([u, v, rr]) => P.ellipsePts(cx + u * s, cy + v * s, rr * s, rr * s * 0.95, 26));
    list.push(P.ellipsePts(cx, cy, s * 0.95, s * 0.7, 40));
    P.toneUnion(x, list, { base: o.base || '#F3EEF8', dark: o.dark || '#B6AED6', light: o.light || '#FFFFFF', seed, lightAng: o.la ?? -2.0, shadowW: 0.1, lightW: 0.04, dabs: 12, highlights: 6, texture: 0.35, size: s * 2, rimW: Math.max(2, s * 0.035) });
    // iç pencere
    const win = P.ellipsePts(cx, cy + s * 0.02, s * 0.78, s * 0.56, 48);
    x.save(); x.clip(P.pathOf(win));
    content(x, cx, cy + s * 0.02, s);
    // pencere derinliği
    const ring = P.pathOf(win.map(([a, b]) => [a + s * 0.03, b + s * 0.04])); ring.rect(0, 0, w, h);
    x.fillStyle = rgba(o.inner || '#3A2E5A', 0.25); x.fill(ring, 'evenodd');
    x.restore();
    x.strokeStyle = rgba('#FFFFFF', 0.6); x.lineWidth = Math.max(1.5, s * 0.015); x.stroke(P.pathOf(win));
  });
}
// "puf": ortadan dışa açılıp incelerek sönen bulut pufları + parıltı tozu. k 0..1
function poof(ctx, x, y, s, k, seed = 1, o = {}) {
  if (k <= 0 || k >= 1) return;
  const r = rng(seed);
  const po = { base: o.base || '#EFE8F6', dark: o.dark || '#A89CCB', light: o.light || '#FFFFFF', rim: o.rim || '#E2582E', la: o.la };
  ctx.save();
  // merkez puf: hızla şişip söner
  const ck = E.outCubic(clamp(k * 1.6));
  put(ctx, puff('poofC' + (o.key || ''), 80, seed, po), x, y + s * 0.12, (s / 80) * lerp(0.7, 1.25, ck), 0, (1 - E.inQuad(clamp(k * 1.5))) * 0.95);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r.range(-0.3, 0.3), d = s * (0.3 + E.outCubic(k) * r.range(0.65, 1.0));
    const sc = (s / 80) * r.range(0.32, 0.45) * (1 - 0.55 * k);
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.75 - k * s * 0.25;
    put(ctx, puff('poof' + (i % 3) + (o.key || ''), 80, seed + 1 + (i % 3), po), px, py, sc, r.range(-0.3, 0.3), (1 - E.inQuad(k)) * 0.95, i % 2 ? -1 : 1);
  }
  for (let i = 0; i < 12; i++) {
    const a = r.range(0, TAU), d = s * (0.4 + E.outCubic(k) * r.range(0.6, 1.5));
    star4(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, s * r.range(0.04, 0.08) * Math.sin(Math.PI * k), 0.9, '#FFFFFF');
  }
  ctx.restore();
}

// ---------- güneş: R.sun düzeni (ışıma + kıvrık halka darbeleri), ama diskte kısa düz vurgu darbeleri YOK
// (parlak diskte harfe benzeyen işaretler oluşmasın): yalnız diski izleyen iki uzun yay + yumuşak ışık.
function cleanSun(ctx, x, y, Rr, o = {}) {
  P.glow(ctx, x, y, Rr * 3.2, o.glow || '#FFE9A0', 0.35);
  const r = rng(o.seed ?? 4);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + r.range(-0.05, 0.05);
    const a2 = a + r.range(0.25, 0.42);
    const arc = []; for (let k = 0; k <= 6; k++) { const aa = lerp(a, a2, k / 6); arc.push([x + Math.cos(aa) * Rr * 1.04, y + Math.sin(aa) * Rr * 1.04]); }
    P.curveStroke(ctx, arc, Rr * 0.2, r.chance(0.5) ? (o.ring || '#F6D23A') : shade(o.ring || '#F6D23A', 0.06), r.int(1, 1e9), { taper: true, bristles: 3 });
  }
  const disk = o.disk || '#FFF3C4';
  P.toneShape(ctx, P.ellipsePts(x, y, Rr * 0.9, Rr * 0.9, 48), { base: disk, dark: o.diskDark || shade(disk, -0.06, 0.05), light: shade(disk, 0.05), rim: false, shadowW: 0.08, lightW: 0.05, texture: 0.25, dabs: 0, highlights: 0, seed: 3 });
  const g = ctx.createRadialGradient(x - Rr * 0.3, y - Rr * 0.3, 0, x - Rr * 0.3, y - Rr * 0.3, Rr * 0.7);
  g.addColorStop(0, 'rgba(255,255,248,0.55)'); g.addColorStop(1, 'rgba(255,255,248,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, Rr * 0.9, 0, TAU); ctx.fill();
  for (const [rad, a0, span, w] of [[0.7, Math.PI * 0.95, 1.25, 0.075], [0.52, Math.PI * 1.05, 0.8, 0.05]]) {
    const arc = []; for (let k = 0; k <= 12; k++) { const aa = a0 + span * (k / 12); arc.push([x + Math.cos(aa) * Rr * rad, y + Math.sin(aa) * Rr * rad]); }
    P.curveStroke(ctx, arc, Rr * w, 'rgba(255,253,242,0.85)', 9 + Math.round(rad * 10), { taper: true, bristles: 0, detail: 0 });
  }
}

// ---------- kum saati: engine/props.js hourglass'ın birebir kopyası; tek fark alt kum oranı ayrı verilebilir (o.bot) ----------
// (s18'de kum çatlaktan dışarı savrulunca alt hazne o kadar dolmamalı)
function hourglass2(ctx, x, y, s, top = 0.6, t = 0, o = {}) {
  const r = rng(o.seed ?? 3);
  const H = s, Wd = s * 0.62;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
  if (o.glow) P.glow(ctx, 0, -H * 0.5, H * 0.9, '#FFD27A', 0.35 * o.glow);
  // cam
  const bulb = (sgn) => P.smoothPts([[0, -H * 0.5], [Wd * 0.36 * 0.35, -H * 0.5 - sgn * H * 0.08], [Wd * 0.42, -H * 0.5 - sgn * H * 0.3], [Wd * 0.38, -H * 0.5 - sgn * H * 0.42], [-Wd * 0.38, -H * 0.5 - sgn * H * 0.42], [-Wd * 0.42, -H * 0.5 - sgn * H * 0.3], [-Wd * 0.36 * 0.35, -H * 0.5 - sgn * H * 0.08]], true, 8);
  const up = bulb(1), dn = bulb(-1);
  for (const g of [up, dn]) { ctx.fillStyle = rgba('#D8F0F6', 0.22); ctx.fill(P.pathOf(g)); }
  // kum
  const sand = o.sand || '#E8B23A', sandD = '#B77F1E', sandL = '#FFE08A';
  const neck = -H * 0.5;
  ctx.save(); ctx.clip(P.pathOf(up));
  const topLevel = neck - H * 0.06 - top * H * 0.32;
  if (top > 0.01) {
    const surf = []; for (let k = 0; k <= 10; k++) { const u = k / 10 * 2 - 1; surf.push([u * Wd * 0.5, topLevel + Math.abs(u) * -H * 0.03 + H * 0.02 * (1 - Math.abs(u))]); }
    const pts = surf.concat([[Wd * 0.5, neck + 4], [-Wd * 0.5, neck + 4]]);
    P.toneShape(ctx, pts, { base: sand, dark: sandD, light: sandL, rim: false, shadowW: 0.2, texture: 0.35, dabs: 3, seed: 2 });
  }
  ctx.restore();
  ctx.save(); ctx.clip(P.pathOf(dn));
  const bot = o.bot ?? (1 - top), base = -H * 0.08;
  if (bot > 0.01) {
    const peak = base - bot * H * 0.36;
    const pts = [[-Wd * 0.5, base + 4], [-Wd * 0.5, base - bot * H * 0.12], [0, peak], [Wd * 0.5, base - bot * H * 0.12], [Wd * 0.5, base + 4]];
    P.toneShape(ctx, P.smoothPts(pts, true, 6), { base: sand, dark: sandD, light: sandL, rim: false, shadowW: 0.22, texture: 0.35, dabs: 3, seed: 5 });
  }
  ctx.restore();
  // akan kum
  const flow = o.flow ?? (top > 0.01 ? 1 : 0);
  if (flow > 0) {
    ctx.strokeStyle = rgba(sand, flow); ctx.lineWidth = Math.max(1.5, s * 0.012);
    ctx.beginPath(); ctx.moveTo(0, neck - 2); ctx.lineTo(0, base - (bot) * H * 0.36 + 2); ctx.stroke();
    for (let i = 0; i < 6; i++) { const yy = lerp(neck, base - bot * H * 0.3, ((t * 2.2 + i / 6) % 1)); ctx.fillStyle = rgba(sandL, 0.9 * flow); ctx.fillRect(-1.5, yy, 3, 3); }
  }
  // cam parlaması
  for (const [g, sg] of [[up, 1], [dn, -1]]) {
    ctx.save(); ctx.clip(P.pathOf(g));
    P.stroke(ctx, -Wd * 0.26, -H * 0.5 - sg * H * 0.36, -Wd * 0.3, -H * 0.5 - sg * H * 0.12, s * 0.035, 'rgba(255,255,255,0.75)', 3, { detail: 0 });
    ctx.restore();
    ctx.strokeStyle = rgba('#FFFFFF', 0.55); ctx.lineWidth = Math.max(1.2, s * 0.008); ctx.stroke(P.pathOf(g));
  }
  // ahşap çerçeve
  const wood = o.wood || '#8A5532';
  const plate = (yy) => P.toneShape(ctx, P.roundRectPts(-Wd * 0.58, yy - H * 0.045, Wd * 1.16, H * 0.09, H * 0.02), { base: wood, dark: '#4E2C18', light: '#B9804E', seed: 6, shadowW: 0.25, texture: 0.5, dabs: 3, rim: o.rim });
  plate(-H * 0.96); plate(-H * 0.04);
  for (const sx of [-1, 1]) {
    const post = P.roundRectPts(sx * Wd * 0.5 - H * 0.022, -H * 0.94, H * 0.044, H * 0.88, H * 0.02);
    P.toneShape(ctx, post, { base: wood, dark: '#4E2C18', light: '#B9804E', seed: 7 + sx, shadowW: 0.35, texture: 0.4, dabs: 2, rim: false, strokeAng: Math.PI / 2 });
  }
  ctx.restore();
}


module.exports = { sprite, put, view, toScreen, fromScreen, zf, rampInt, sm, FOG, puff, veil, star4, glitter, bauble, BAUBLE_COLS, flowerSpr, FLOWER_COLS, alleyTree, clumpSpr, balloonCircles, balloonSprite, poof, hourglass2, cleanSun };
