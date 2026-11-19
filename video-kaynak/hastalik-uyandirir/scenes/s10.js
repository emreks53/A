// S10 — "hayvana nisbeten en edna bir derecede" (32.00–35.50)
// Büyük pirinç terazi. 32.38 "hayvana nisbeten": sol kefede güneşli çimende keyifle otlayan koyun (kelebekler),
// sağ kefede başının üstünde küçük yağmur bulutuyla endişeli adam. 34.18 "en edna": terazi adamın kefesi AŞAĞI
// inecek biçimde ağır ağır yatar; koyun güneşte yukarıda kalır. 34.54–35.2 "bir derecede": sallanıp oturur.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const L = require('./_s05_lib');
const { seg, E, lerp, clamp, rgba, mix, shade, TAU, rng } = C;
const d = C.deg;

const PIV = { x: 540, y: 400 };
// uzun zincir + geniş kefe: zincir üçgeni adamın başını kesmesin
const BEAM = 300, CHAIN = 480, PAN_W = 280;
const SS = 1.25, LA = -2.3;
const GROUND = 1150;
const BR = { base: '#D69E38', dark: '#8A5A1E', light: '#F2C665', deep: '#6B4416', hi: '#F7D37E' };
const SUN = { x: 172, y: 168, R: 86 };

// kaygı taşları: yağmur bulutundan adamın kefesine düşen koyu taşlar (bırakılış, iniş zamanları)
const STONES = [
  { rel: 33.83, dx: -98, r: 34, seed: 1 },
  { rel: 33.92, dx: 88, r: 29, seed: 2 },
  { rel: 34.0, dx: -50, r: 24, seed: 3 },
];
const FALL = 0.27;
const STONE_LAND = STONES.map((st) => st.rel + FALL);
// ---------- terazi kolu açısı (+ saat yönü: sağ/adam tarafı aşağı) ----------
function beamAng(t) {
  // 34.1'e kadar kol dengede (ağırlık = değer okuması olmasın); yalnız çok hafif bir nefes salınımı
  let b = 0.006 * Math.sin(t * 2.1) * (1 - E.smooth(seg(t, 33.9, 34.1)));
  // "edna": kederden taşlar adamın kefesine düşer → kefe ağır ağır aşağı iner (34.12–34.62);
  // "bir derecede" (34.54–35.2) sallanıp oturur
  const dn = E.inOutCubic(seg(t, 34.12, 34.62));
  const wob = t > 34.6 ? Math.exp(-3.0 * (t - 34.6)) * Math.sin(TAU * 1.2 * (t - 34.6)) : 0;
  b += 0.34 * dn + 0.06 * wob;
  // her taş inişinde küçük bir sarsıntı
  for (const tl of STONE_LAND) b += 0.012 * Math.exp(-14 * Math.max(0, t - tl)) * (t > tl ? Math.sin(TAU * 3 * (t - tl)) : 0);
  return b;
}
// kefe salınımı: kol ucunun ivmesiyle sürülen sönümlü sarkaç (bir kez tablo)
const T0 = 31.6, T1 = 36.0, DT = 1 / 240;
let SWING = null;
function buildSwing() {
  const n = Math.ceil((T1 - T0) / DT) + 2;
  SWING = [new Float64Array(n), new Float64Array(n)];
  const G = 14000, k = Math.pow(TAU * 0.9, 2), c = 2 * 0.4 * Math.sqrt(k);
  const endX = (t, sg) => PIV.x + sg * BEAM * Math.cos(beamAng(t));
  const endY = (t, sg) => PIV.y + sg * BEAM * Math.sin(beamAng(t));
  for (let side = 0; side < 2; side++) {
    const sg = side ? 1 : -1; let psi = 0, v = 0;
    for (let i = 0; i < n; i++) {
      const t = T0 + i * DT, h = 0.004;
      const ax = (endX(t + h, sg) - 2 * endX(t, sg) + endX(t - h, sg)) / (h * h);
      const ay = (endY(t + h, sg) - 2 * endY(t, sg) + endY(t - h, sg)) / (h * h);
      const target = Math.atan2(ax, G - ay);
      const acc = -k * (psi - target) - c * v;
      v += acc * DT; psi += v * DT; SWING[side][i] = psi;
    }
  }
}
function swing(side, t) { const a = SWING[side]; const f = clamp((t - T0) / DT, 0, a.length - 1.001), i = Math.floor(f); return a[i] + (a[i + 1] - a[i]) * (f - i); }
function hook(side, t) { const b = beamAng(t), sg = side ? 1 : -1; return [PIV.x + sg * (BEAM - 6) * Math.cos(b), PIV.y + sg * (BEAM - 6) * Math.sin(b) + 14]; }

// ---------- önbellekli katmanlar ----------
const SKY_Y = -170, SKY_H = 1380;   // gök katmanı: kameranın en üstünden uzak tepelerin altına kadar
function skyCv() {
  const w = C.W + 100, h = SKY_H;
  return L.hcache('s10sky', w, h, SS, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, w, h);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: w, y1: h, w, h }, ['#1F4FB0', '#2A6CC8', '#2E8FD2', '#4FBCD4', '#A6DDE6', '#E6F2DC'], { seed: 171, wMin: 22, wMax: 42, lMin: 90, lMax: 280, stops: [0, 0.18, 0.4, 0.62, 0.84, 1] });
    // bulutlar (tuval y = dünya y - SKY_Y)
    L.cloud2(x, 900, 150 - SKY_Y, 105, 5, { lightAng: -2.3 });
    L.cloud2(x, 470, 62 - SKY_Y, 70, 9, { lightAng: -2.3 });
    L.cloud2(x, 1110, 380 - SKY_Y, 62, 12, { lightAng: -2.3 });
  });
}
function groundCv() {
  const w = C.W + 100, y0 = 960, h = C.H + 60 - y0;
  return L.hcache('s10ground', w, h, SS, (x) => {
    x.translate(0, -y0);
    const ft = []; for (let i = 0; i <= 60; i++) { const u = i / 60; ft.push([u * w, 1062 - 30 * Math.sin(u * 4.4 + 0.8) - 14 * Math.sin(u * 11 + 1)]); }
    P.toneShape(x, ft.concat([[w, 1260], [0, 1260]]), { base: '#6FB2A0', dark: '#4E9488', light: '#94CDB4', seed: 172, shadowW: 0.02, lightW: 0.01, dabs: 12, rimW: 5 });
    const gt = []; for (let i = 0; i <= 60; i++) { const u = i / 60, X = u * w; const dd = (X - (C.W / 2 + 50)) / 600; gt.push([X, GROUND - 40 + 70 * dd * dd + 6 * Math.sin(u * 7)]); }
    const g = gt.concat([[w, C.H + 60], [0, C.H + 60]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 7; x.setLineDash([120, 60, 40, 90]); x.translate(0, -3); x.stroke(P.pathOf(gt, false)); x.restore();
    x.save(); x.clip(P.pathOf(g)); x.fillStyle = '#4DA552'; x.fillRect(0, 1000, w, 1000); x.restore();
    P.bandFill(x, P.pathOf(g), { x0: 0, y0: GROUND - 60, x1: w, y1: C.H + 60, w, h: C.H + 120 - GROUND }, ['#9AD25A', '#5DB352', '#3E9B4F', '#33904A', '#2A8246'], { seed: 173, wMin: 18, wMax: 34, lMin: 80, lMax: 240, stops: [0, 0.1, 0.3, 0.6, 1] });
    const r = rng(174);
    for (let i = 0; i < 16; i++) { const k = r.int(2, 56), p0 = gt[k], p1 = gt[k + 2]; P.stroke(x, p0[0], p0[1] + 10, p1[0], p1[1] + 10, r.range(8, 13), '#B4E06A', r.int(1, 1e9), { detail: 0.5 }); }
    for (let i = 0; i < 10; i++) { const gx = r.range(20, w - 20); R.grass(x, gx, r.range(GROUND + 40, GROUND + 160), r.range(24, 36), r.int(1, 999), { c1: '#2F8A45', c2: '#7CC04B' }); }
  });
}
// gövde: taban + sütun + kadran yayı (sabit)
function standCv() {
  const w = 420, h = GROUND + 40 - (PIV.y - 170), ox = PIV.x - 210, oy = PIV.y - 170;
  return L.hcache('s10stand', w, h, SS, (x) => {
    x.translate(-ox, -oy);
    const cx = PIV.x;
    // kadran yayı (göstergenin arkasında)
    const arc = []; for (let k = 0; k <= 24; k++) { const a = -Math.PI / 2 - 0.62 + 1.24 * k / 24; arc.push([cx + Math.cos(a) * 128, PIV.y + Math.sin(a) * 128]); }
    P.curveStroke(x, arc, 12, BR.base, 175, { bristles: 2 });
    for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 - 0.56 + 1.12 * k / 8; const r0 = k === 4 ? 104 : 112; x.strokeStyle = k === 4 ? '#FFF2C0' : BR.deep; x.lineWidth = k === 4 ? 5 : 3; x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, PIV.y + Math.sin(a) * r0); x.lineTo(cx + Math.cos(a) * 122, PIV.y + Math.sin(a) * 122); x.stroke(); }
    // gölge
    x.fillStyle = rgba('#1F4A3A', 0.35); x.beginPath(); x.ellipse(cx + 20, GROUND + 6, 210, 22, 0, 0, TAU); x.fill();
    // taban (basamaklı ahşap + pirinç kuşak)
    P.toneShape(x, P.roundRectPts(cx - 170, GROUND - 46, 340, 56, 12), { base: '#7A4A2E', dark: '#3E2318', light: '#A86A40', seed: 176, shadowW: 0.25, lightW: 0.12, dabs: 5, highlights: 1, dabW: 9 });
    P.toneShape(x, P.roundRectPts(cx - 120, GROUND - 84, 240, 44, 10), { base: '#8A5532', dark: '#4E2C18', light: '#B9804E', seed: 177, shadowW: 0.25, lightW: 0.12, dabs: 4, highlights: 1, dabW: 8 });
    P.toneShape(x, P.roundRectPts(cx - 126, GROUND - 52, 252, 9, 4), { base: BR.base, dark: BR.dark, light: BR.light, seed: 178, rim: false, shadowW: 0.4, dabs: 1 });
    // sütun (yukarı incelen) + halkalar
    const col = [[cx - 26, GROUND - 82], [cx - 15, PIV.y + 40], [cx + 15, PIV.y + 40], [cx + 26, GROUND - 82]];
    P.toneShape(x, col, { base: BR.base, dark: BR.dark, light: BR.light, hi: '#E9B85A', seed: 179, shadowW: 0.3, lightW: 0.14, dabs: 6, highlights: 1, dabW: 8, strokeAng: Math.PI / 2, texAng: Math.PI / 2 });
    for (const [yy, ww] of [[GROUND - 96, 34], [PIV.y + 360, 24], [PIV.y + 170, 21], [PIV.y + 52, 21]]) P.toneShape(x, P.roundRectPts(cx - ww, yy - 9, ww * 2, 18, 8), { base: '#E8B44A', dark: BR.dark, light: BR.light, seed: 180 + yy, rim: false, shadowW: 0.4, lightW: 0.2, dabs: 1 });
    // üst taç (pivot yuvası)
    P.toneShape(x, P.smoothPts([[cx - 30, PIV.y + 44], [cx - 34, PIV.y + 14], [cx - 18, PIV.y - 6], [cx + 18, PIV.y - 6], [cx + 34, PIV.y + 14], [cx + 30, PIV.y + 44]], true, 5), { base: BR.base, dark: BR.dark, light: BR.light, seed: 185, shadowW: 0.25, dabs: 3 });
  });
}
function beamCv() {
  const w = 2 * BEAM + 60, h = 70;
  return L.hcache('s10beam', w, h, SS, (x) => {
    x.translate(w / 2, h / 2);
    const top = [], bot = [];
    for (let k = 0; k <= 30; k++) { const u = k / 30 * 2 - 1, X = u * BEAM; const arch = (1 - u * u) * 10; const th = lerp(13, 8, Math.abs(u)); top.push([X, -arch - th]); bot.push([X, -arch + th]); }
    const pts = top.concat(bot.reverse());
    P.toneShape(x, pts, { base: BR.base, dark: BR.dark, light: BR.light, hi: BR.hi, seed: 186, shadowW: 0.3, lightW: 0.18, dabs: 6, highlights: 2, dabW: 9, strokeAng: 0, coreScale: 0.95 });
    for (const sg of [-1, 1]) {
      // uç topuz + kanca halkası
      P.toneShape(x, P.ellipsePts(sg * BEAM, -1, 15, 15, 20), { base: '#E8B44A', dark: BR.dark, light: BR.light, seed: 187, rim: false, shadowW: 0.3, lightW: 0.2, dabs: 1 });
      x.strokeStyle = BR.deep; x.lineWidth = 4; x.beginPath(); x.arc(sg * (BEAM - 6), 16, 7, 0, TAU); x.stroke();
    }
    // süs: ince çizgi
    x.strokeStyle = rgba('#FFF0B8', 0.7); x.lineWidth = 2;
    x.beginPath(); for (let k = 0; k <= 30; k++) { const u = k / 30 * 2 - 1, X = u * (BEAM - 30); const yy = -(1 - u * u) * 10 - 5; if (k) x.lineTo(X, yy); else x.moveTo(X, yy); } x.stroke();
  });
}
function needleCv() {
  return L.hcache('s10needle', 40, 150, SS, (x) => {
    x.translate(20, 140);
    P.toneShape(x, [[-6, 0], [-2.5, -118], [0, -128], [2.5, -118], [6, 0]], { base: '#C8401E', dark: '#7A2014', light: '#F07A4A', seed: 188, rim: false, shadowW: 0.3, dabs: 1 });
  });
}
function capCv() {
  return L.hcache('s10cap', 70, 70, SS, (x) => {
    P.toneShape(x, P.ellipsePts(35, 35, 26, 26, 28), { base: '#E8B44A', dark: BR.dark, light: BR.light, seed: 189, shadowW: 0.25, lightW: 0.18, dabs: 2, rimW: 3 });
    P.toneShape(x, P.ellipsePts(35, 35, 10, 10, 18), { base: BR.deep, dark: '#3A2410', light: BR.dark, seed: 190, rim: false, shadowW: 0.3, dabs: 0 });
  });
}
function panCv(side) {
  const w = PAN_W + 40, h = 80;
  return L.hcache('s10pan' + side, w, h, SS, (x) => {
    x.translate(w / 2, 20);
    const dish = P.smoothPts([[-PAN_W / 2, 0], [-PAN_W / 2 + 10, 22], [-PAN_W * 0.3, 40], [PAN_W * 0.3, 40], [PAN_W / 2 - 10, 22], [PAN_W / 2, 0]], true, 6);
    // düz ton katları; vurgular çanağın kavsini izleyen uzun, düşük kontrastlı yaylar (harf gibi okunan kısa çizgiler yok)
    P.toneShape(x, dish, { base: BR.base, dark: BR.dark, light: BR.light, hi: BR.hi, seed: 191 + side * 17, shadowW: 0.22, lightW: 0.16, dabs: 0, highlights: 0, strokeAng: 0 });
    x.save(); x.clip(P.pathOf(dish));
    const r = rng(195 + side * 23);
    for (let i = 0; i < 3; i++) {
      const v = 0.3 + i * 0.22 + r.range(-0.05, 0.05), u0 = r.range(-0.42, -0.1), u1 = u0 + r.range(0.35, 0.6);
      const arc = []; for (let k = 0; k <= 10; k++) { const u = lerp(u0, u1, k / 10); arc.push([u * PAN_W * (1 - v * 0.35), v * 40 - (1 - 4 * u * u) * 4]); }
      x.save(); x.globalAlpha = 0.28 + 0.1 * (i === 0);
      P.curveStroke(x, arc, (q) => (i === 0 ? 5 : 4) * Math.sin(Math.PI * q), i === 0 ? BR.hi : BR.light, 300 + side * 9 + i, { bristles: 1, detail: 0.3 });
      x.restore();
    }
    x.restore();
    P.toneShape(x, P.roundRectPts(-PAN_W / 2 - 8, -6, PAN_W + 16, 14, 7), { base: '#E8B44A', dark: BR.dark, light: BR.light, seed: 192 + side * 5, rim: false, shadowW: 0.4, lightW: 0.25, dabs: 0, highlights: 0 });
    x.save(); x.globalAlpha = 0.45; x.strokeStyle = BR.hi; x.lineWidth = 2.2; x.lineCap = 'round';
    x.beginPath(); x.moveTo(-PAN_W / 2 + 14 + side * 30, -3); x.lineTo(PAN_W * (0.05 + side * 0.08), -3); x.stroke(); x.restore();
    P.toneShape(x, P.roundRectPts(-30, 38, 60, 10, 5), { base: BR.dark, dark: BR.deep, light: BR.base, seed: 193, rim: false, shadowW: 0.4, dabs: 0 });
  });
}
function turfCv() {
  const w = 220, h = 70;
  return L.hcache('s10turf', w, h, SS, (x) => {
    x.translate(w / 2, h - 10);
    const pts = P.smoothPts([[-100, 0], [-92, -18], [-50, -30], [10, -32], [70, -26], [98, -14], [102, 0]], true, 6);
    P.toneShape(x, pts, { base: '#5DB352', dark: '#2F8A45', light: '#B4E06A', seed: 194, shadowW: 0.25, lightW: 0.18, dabs: 6, strokeAng: 0 });
    R.grass(x, -70, -10, 24, 3, { c1: '#2F8A45', c2: '#9AD25A' }); R.grass(x, 72, -8, 22, 4, { c1: '#2F8A45', c2: '#9AD25A' }); R.grass(x, 0, -22, 18, 5, { c1: '#3E9B4F', c2: '#B4E06A' });
    R.flower(x, -40, -28, 9, 21, { color: '#FFFFFF', dark: '#B8A9DA', inner: '#F6C83B' });
    R.flower(x, 52, -24, 8, 22, { color: '#FFD34E', dark: '#D9952A', inner: '#E8682E' });
  });
}

// ---------- zincir ----------
function chain(ctx, a, b, seed) {
  const L2 = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(L2 / 13);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u);
    ctx.strokeStyle = i % 2 ? BR.dark : '#C8902E'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.ellipse(x, y, i % 2 ? 7.5 : 7.5, i % 2 ? 2.2 : 4.2, ang, 0, TAU); ctx.stroke();
  }
}

// ---------- kefe içerikleri ----------
// omuzları düşük, kolları sarkık, başı önde: yağmur altında kederli adam
const MAN_POSE = M.pose({ torso: d(8), spine: 0.3, neck: d(10), head: d(12), armN: d(5), elbowN: d(14), handN: d(6), armF: d(-3), elbowF: d(12), handF: d(6), thighN: d(2), kneeN: d(3), thighF: d(-3), kneeF: d(4), brow: 1, mouth: -0.5, eye: 0.8, grip: 0.25 });
function sheepSide(ctx, t, base) {
  const k = C.pop(t, 32.28, 0.5, 1.8);
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(base[0], base[1]); ctx.scale(k, k); ctx.translate(-base[0], -base[1]);
  ctx.drawImage(turfCv(), base[0] - 128, base[1] - 70, 256, 81);
  // otlama: çoğunlukla baş aşağı, 33.2'de başını kaldırıp çiğner
  const up = C.win(t, 33.1, 33.75, 0.2, 0.25) + 0.85 * C.win(t, 34.75, 35.8, 0.25, 0.3);
  const graze = lerp(0.95, 0.35, up) + Math.sin(t * 1.9) * 0.04;
  L.sheep(ctx, base[0] - 6, base[1] - 26, 214, { dir: 1, graze, chew: t * 10, seed: 3, bob: Math.sin(t * 10) * up });
  ctx.restore();
}
function manSide(ctx, t, base, tilt) {
  const k = C.pop(t, 32.68, 0.5, 1.8);
  if (k <= 0.001) return;
  const p = Object.assign({}, MAN_POSE);
  // inerken başını kaldırıp yukarıda kalan koyuna bakar; sonra omuzları daha da düşer
  const look = E.smooth(seg(t, 34.3, 34.85)) * (1 - 0.35 * E.smooth(seg(t, 35.15, 35.7)));
  const br = Math.sin(t * 2.4);
  p.head = lerp(d(12), d(-20), look); p.neck = lerp(d(10), d(2), look);
  p.torso = lerp(d(8), d(5), look) + d(0.6) * br; p.py = 0.002 * br;
  p.eye = lerp(0.8, 1, look); p.mouth = lerp(-0.5, -0.75, look);
  // yağmurda üşüyen kollar: çok hafif, yavaş salınım (kaynamayan)
  p.armN += d(1.0) * Math.sin(t * 3.1); p.armF += d(0.8) * Math.sin(t * 3.1 + 1);
  M.drawMan(ctx, p, { x: base[0] + 14, y: base[1] - 4, h: 330 * k, dir: -1, light: LA });
}
function rainCloud(ctx, t, base) {
  const k0 = C.pop(t, 32.92, 0.45, 1.8);
  if (k0 <= 0.001) return;
  // "en edna": bulut ağırlaşır (büyür, koyulaşır), yağmur sıklaşır
  const hv = E.smooth(seg(t, 34.2, 34.8));
  const k = k0 * (1 + 0.14 * hv);
  const cx = base[0] - 2 + Math.sin(t * 1.4) * 4, cy = base[1] - 392;
  L.rain(ctx, cx - 50, cx + 50, cy + 12, base[1] - 30, t, Math.round(20 + 10 * hv), 251, { speed: 650 + 150 * hv, len: 26, ang: 0.08, color: '#C8DCF4', alpha: 0.85 * clamp(k0), w: 1.3 });
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
  L.cloud2(ctx, cx, cy, 60, 31, { base: mix('#9A9AB8', '#76769A', hv), dark: mix('#5E5C82', '#46446A', hv), light: mix('#C8C8DE', '#A8A8C4', hv), lightAng: -2.3, curl: '#D8D8EA', curlA: 0.6 * (1 - 0.4 * hv) });
  ctx.restore();
}
// koyu, ağır kaygı taşları: bulutun altından düşer, kefeye oturur (kefe çerçevesinde çizilir)
function worryStones(ctx, t, pc) {
  for (const st of STONES) {
    const u = t - st.rel;
    if (u < 0) continue;
    const y0 = pc[1] - 380, y1 = pc[1] - st.r * 0.62 + 4;
    const k = Math.min(1, u / FALL);
    let y = lerp(y0, y1, k * k);
    // inişte küçük sekme
    const ub = u - FALL;
    if (ub > 0) y = y1 - Math.abs(Math.sin(ub * 14)) * 9 * Math.exp(-ub * 9);
    const x = pc[0] + st.dx;
    const a = C.pop(t, st.rel, 0.14, 1.4);
    const pts = P.blobPts(x, y, st.r * 1.15 * a, st.r * 0.82 * a, st.seed * 7, 0.18, 26);
    L.blob(ctx, pts, '#4A4366', { dark: '#262238', light: '#7A7298', la: LA, size: st.r * 1.3, ks: 0.32, kl: 0.14, rim: true, rimW: 2.2, tex: 0.35 });
    // iniş tozu
    if (ub > 0 && ub < 0.35) {
      ctx.save(); ctx.globalAlpha *= 0.7 * (1 - ub / 0.35);
      for (const sg of [-1, 1]) P.stroke(ctx, x + sg * st.r * 0.9, y1 + st.r * 0.5, x + sg * (st.r * 0.9 + 26 * (0.4 + ub * 2)), y1 + st.r * 0.5 - 8, 5, '#D9D2E6', 700 + st.seed * 3 + (sg > 0), { detail: 0, taper1: 0.2 });
      ctx.restore();
    }
  }
}
function butterflies(ctx, t, base) {
  const k = clamp((t - 32.45) / 0.3);
  if (k <= 0) return;
  const bs = [[0, 1.0, '#F59A2E', '#FFD45A'], [2.3, 1.25, '#5FA8E8', '#CFEAFF']];
  for (const [ph, sp, c1, c2] of bs) {
    const x = base[0] + Math.cos(t * 1.5 * sp + ph) * 135 + Math.sin(t * 3.1 + ph) * 18;
    const y = base[1] - 200 + Math.sin(t * 2.2 * sp + ph) * 50;
    const sc = k * 33;
    L.butterfly(ctx, x, y, sc, t * 16 + ph, { c1, c2, rot: Math.sin(t * 2 + ph) * 0.3 });
  }
}

module.exports = {
  init() { buildSwing(); },
  draw(ctx, t) {
    if (!SWING) buildSwing();
    const b = beamAng(t);
    const tiltK = E.smooth(seg(t, 34.15, 34.8));
    // kamera: yavaş itme; eğilişte hafifçe adam tarafına
    const z = lerp(1.12, 1.16, E.inOutSine(seg(t, 31.9, 35.7)));
    const [bx, by] = R.breathe(t, 2.5, 107);
    R.camera(ctx, { zoom: z, cx: 540 + 8 * tiltK + bx, cy: lerp(762, 778, tiltK) + by });
    ctx.drawImage(skyCv(), -50, SKY_Y, C.W + 100, SKY_H);
    // güneş + koyuna düşen ışık hüzmeleri
    L.sun2(ctx, SUN.x, SUN.y, SUN.R, t, { seed: 4 });
    const hL = hook(0, t), hR = hook(1, t);
    const panL = [hL[0], hL[1] + CHAIN], panR = [hR[0], hR[1] + CHAIN];
    const rayK = clamp((t - 32.3) / 0.4) * (0.75 + 0.25 * tiltK);
    if (rayK > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 4; i++) {
        const w0 = 14 + i * 9, tx = panL[0] - 80 + i * 55, ty = panL[1] - 30;
        const a = 0.09 * rayK * (0.8 + 0.2 * Math.sin(t * 2 + i));
        ctx.fillStyle = rgba('#FFF2B0', a);
        ctx.beginPath(); ctx.moveTo(SUN.x - w0 * 0.3, SUN.y); ctx.lineTo(SUN.x + w0 * 0.3, SUN.y); ctx.lineTo(tx + w0 * 2.6, ty); ctx.lineTo(tx - w0 * 2.6, ty); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    const g0 = 960; ctx.drawImage(groundCv(), -50, g0, C.W + 100, C.H + 60 - g0);
    ctx.drawImage(standCv(), PIV.x - 210, PIV.y - 170, 420, GROUND + 40 - (PIV.y - 170));
    // gösterge iğnesi (kolla birlikte döner)
    ctx.save(); ctx.translate(PIV.x, PIV.y); ctx.rotate(b); ctx.drawImage(needleCv(), -20, -140, 40, 150); ctx.restore();
    // kefeler: zincir + çanak + içerik (kendi salınımıyla)
    for (const side of [0, 1]) {
      const hk = side ? hR : hL, ps = swing(side, t);
      ctx.save(); ctx.translate(hk[0], hk[1]); ctx.rotate(ps); ctx.translate(-hk[0], -hk[1]);
      const pc = [hk[0], hk[1] + CHAIN];
      chain(ctx, hk, [pc[0] - PAN_W / 2 + 6, pc[1] - 2], side * 7 + 1);
      chain(ctx, hk, [pc[0] + PAN_W / 2 - 6, pc[1] - 2], side * 7 + 2);
      if (side === 0) { sheepSide(ctx, t, [pc[0], pc[1] + 2]); }
      else { manSide(ctx, t, [pc[0] + 6, pc[1] + 4], tiltK); worryStones(ctx, t, pc); }
      ctx.drawImage(panCv(side), pc[0] - (PAN_W + 40) / 2, pc[1] - 20, PAN_W + 40, 80);
      ctx.restore();
    }
    // hız çizgileri: "en edna"da kefeler hızla yer değiştirirken hareketin arkasında kısa darbeler
    // (yalnız adamın kefesi: aşağı iniş vurgusu; çizgiler kolun çizdiği yayı izler)
    {
      const vy = (hook(1, t + 0.02)[1] - hook(1, t - 0.02)[1]) / 0.04;
      const a = clamp((vy - 140) / 240) * C.win(t, 34.12, 34.75, 0.04, 0.2);
      if (a > 0.01) {
        const ps = swing(1, t);
        ctx.save(); ctx.globalAlpha *= a * 0.85;
        ctx.translate(hR[0], hR[1]); ctx.rotate(ps); ctx.translate(-hR[0], -hR[1]);
        for (const [ox, k, dy] of [[-PAN_W / 2 - 18, 0, 0], [PAN_W / 2 + 18, 1, 14], [-PAN_W / 2 + 8, 2, -40]]) {
          const tr = [];
          for (let j = 0; j <= 8; j++) { const tb = t - (j / 8) * 0.13; const hb = hook(1, tb); tr.push([hb[0] + ox - (hR[0] - hook(1, t)[0]), hb[1] + CHAIN - 30 + dy - (vy * 0.02)]); }
          P.curveStroke(ctx, tr, (u) => (k === 2 ? 7 : 10) * (1 - u * 0.85), '#FFF6E2', 610 + k, { bristles: 2, detail: 0.4 });
        }
        ctx.restore();
      }
    }
    // kol (zincirlerin önünde) + pivot kapağı
    ctx.save(); ctx.translate(PIV.x, PIV.y); ctx.rotate(b); ctx.drawImage(beamCv(), -(2 * BEAM + 60) / 2, -35, 2 * BEAM + 60, 70); ctx.restore();
    ctx.drawImage(capCv(), PIV.x - 35, PIV.y - 35, 70, 70);
    // kefe önü: yağmur bulutu ve kelebekler kefe salınımını izler
    { const ps = swing(1, t); ctx.save(); ctx.translate(hR[0], hR[1]); ctx.rotate(ps); ctx.translate(-hR[0], -hR[1]); rainCloud(ctx, t, [hR[0], hR[1] + CHAIN]); ctx.restore(); }
    { const ps = swing(0, t); ctx.save(); ctx.translate(hL[0], hL[1]); ctx.rotate(ps); ctx.translate(-hL[0], -hL[1]); butterflies(ctx, t, [hL[0], hL[1] + CHAIN]); ctx.restore(); }
    // "en edna": adamın kefesi soğuk gölgeye iner, koyun sıcak ışıkta kalır
    if (tiltK > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      const g = ctx.createRadialGradient(panR[0], panR[1] - 120, 60, panR[0], panR[1] - 120, 520);
      g.addColorStop(0, rgba('#6A72AC', 0.55 * tiltK)); g.addColorStop(0.6, rgba('#6A72AC', 0.25 * tiltK)); g.addColorStop(1, rgba('#6A72AC', 0));
      ctx.fillStyle = g; ctx.fillRect(-60, -60, C.W + 120, C.H + 120); ctx.restore();
      P.glow(ctx, panL[0], panL[1] - 100, 300, '#FFE7A0', 0.3 * tiltK);
    }
  },
  sfx: [
    { t: 32.28, type: 'pop', gain: 0.25 },
    { t: 32.68, type: 'pop', gain: 0.22 },
    { t: 32.92, type: 'water', gain: 0.14 },
    { t: 34.1, type: 'thud', gain: 0.3 },
    { t: 34.19, type: 'thud', gain: 0.22 },
    { t: 34.7, type: 'tick', gain: 0.14 },
  ],
};
