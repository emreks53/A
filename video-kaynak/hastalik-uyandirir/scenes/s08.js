// S08 — "belki zîhayatların sultanı hükmünde iken," (24.30–27.30)
// Gün batımının altın ışığında bir kaya tepesi; adam tepede ayakta, güneşe dönük. Aşağıda s06'daki canlılar
// (aynı çizimler) kayanın çevresine toplanmış. 24.98 "zîhayatların": canlılar sırayla başlarını kaldırıp ona bakar.
// 25.72 "sultanı": yukarıdan altın bir taç (R.crown) ağır ağır iner, başına oturur, parlar.
// 26.14–26.86 "hükmünde iken": hafif kamera itmesi, tacın parıltısı; adamın duruşu dikleşir (asil, kibirsiz).
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const L = require('./_s05_lib');
const K = require('./_s06_creatures');
const { seg, E, lerp, clamp, rgba, mix, shade, TAU, rng } = C;
const d = C.deg;

const HORIZ = 1060;
const G8 = 1226;
const MAN = { x: 520, y: 1080, h: 700 };
const SUN = { x: 866, y: 1000, R: 100 };
const LA = -0.32;           // ışık sağdan (batan güneş), hafif yukarıdan
const SS = 1.25;
const CROWN_T = 25.5, CROWN_LAND = 26.12;
const DY = 0;

// ---------- önbellekli katmanlar ----------
function skyCv() {
  const w = C.W + 200, h = HORIZ + 100;
  return L.hcache('s08sky', w, h, SS, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, w, h);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: w, y1: h, w, h }, ['#2A2266', '#4A2C82', '#86388A', '#C84E7C', '#EE7E52', '#FFB04C', '#FFDC8A'], { seed: 181, wMin: 22, wMax: 42, lMin: 90, lMax: 290, stops: [0, 0.16, 0.33, 0.5, 0.67, 0.84, 1] });
    // uzun ince gün batımı bulutları (altları sıcak ışıklı)
    const r = rng(182);
    for (let i = 0; i < 7; i++) {
      const y = r.range(380, 900), x0 = r.range(-60, w - 200), len = r.range(220, 460), th = r.range(16, 26);
      const warm = (y - 380) / 520;
      P.stroke(x, x0, y, x0 + len, y + r.range(-4, 4), th, mix('#7A3E86', '#C85A78', warm), r.int(1, 1e9), { detail: 0.6, taper1: 0.5, taper0: 0.8 });
      P.stroke(x, x0 + 20, y + th * 0.45, x0 + len * 0.9, y + th * 0.45 + r.range(-2, 2), th * 0.45, mix('#F07A5A', '#FFC060', warm), r.int(1, 1e9), { detail: 0.4, taper1: 0.4 });
    }
    R.stars(x, w, 300, 14, 183, 0, { maxY: 1 });
    // güneş (ufukta; tepelerin arkasında kalacak)
    const sx = SUN.x + 100, sy = SUN.y + 50;
    P.glow(x, sx, sy, SUN.R * 4.5, '#FF9A4A', 0.45);
    P.glow(x, sx, sy, SUN.R * 2.2, '#FFD27A', 0.5);
    R.sun(x, sx, sy, SUN.R, 0, { glow: '#FFC870', ring: '#FFB43A', disk: '#FFE6A8', seed: 184 });
  });
}
function groundCv() {
  const w = C.W + 200, y0 = HORIZ - 120, h = C.H + 140 - y0;
  return L.hcache('s08ground', w, h, SS, (x) => {
    x.translate(0, -y0);
    // uzak tepeler (mor siluet, güneş tarafında sıcak kenar)
    const far = []; for (let i = 0; i <= 60; i++) { const u = i / 60; far.push([u * w, HORIZ - 40 - 30 * Math.sin(u * 4.6 + 1.2) - 12 * Math.sin(u * 12 + 0.5)]); }
    P.toneShape(x, far.concat([[w, HORIZ + 60], [0, HORIZ + 60]]), { base: '#6A3E7E', dark: '#53306A', light: '#E07A6A', lightAng: -0.3, seed: 185, shadowW: 0.02, lightW: 0.006, dabs: 12, rimW: 4 });
    const r0 = rng(186);
    for (let i = 0; i < 6; i++) { const cx = r0.range(20, w - 20), k = Math.round(cx / w * 60); R.cypress(x, cx, far[k][1] + 16, r0.range(60, 100), r0.int(1, 99), { base: '#4A2E62', dark: '#3A2452', light: '#8A4A6A', lightAng: -0.3 }); }
    const mid = []; for (let i = 0; i <= 60; i++) { const u = i / 60; mid.push([u * w, HORIZ + 10 - 12 * Math.sin(u * 3.1 + 0.4)]); }
    P.toneShape(x, mid.concat([[w, HORIZ + 80], [0, HORIZ + 80]]), { base: '#8E4A6E', dark: '#74405E', light: '#F08A62', lightAng: -0.3, seed: 187, shadowW: 0.02, lightW: 0.008, dabs: 10, rimW: 4 });
    // altın çayır: ufukta parlak, öne doğru koyulaşan erik-kahve (anlam bandı sakin)
    const gt = []; for (let i = 0; i <= 60; i++) { const u = i / 60; gt.push([u * w, HORIZ + 44 + 6 * Math.sin(u * 5 + 1.3)]); }
    const g = gt.concat([[w, C.H + 140], [0, C.H + 140]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 6; x.setLineDash([110, 60, 40, 90]); x.stroke(P.pathOf(gt, false)); x.restore();
    x.save(); x.clip(P.pathOf(g)); x.fillStyle = '#B8743E'; x.fillRect(0, HORIZ, w, 1100); x.restore();
    P.bandFill(x, P.pathOf(g), { x0: 0, y0: HORIZ + 30, x1: w, y1: C.H + 140, w, h: C.H + 110 - HORIZ }, ['#F2B45A', '#D8924A', '#A86A44', '#7A4C48', '#5A3A48', '#46304A'], { seed: 188, wMin: 16, wMax: 32, lMin: 80, lMax: 260, stops: [0, 0.1, 0.25, 0.45, 0.7, 1] });
    const r = rng(189);
    for (let i = 0; i < 14; i++) { const k = r.int(2, 56), p0 = gt[k], p1 = gt[k + 2]; P.stroke(x, p0[0], p0[1] + 9, p1[0], p1[1] + 9, r.range(7, 12), '#FFD27A', r.int(1, 1e9), { detail: 0.5 }); }
    for (let i = 0; i < 18; i++) { const gx = r.range(20, w - 20); R.grass(x, gx, r.range(HORIZ + 70, 1170), r.range(18, 30), r.int(1, 999), { c1: '#8A5A3A', c2: '#E8B45A' }); }
    for (let i = 0; i < 9; i++) { const gx = r.range(20, w - 20); R.grass(x, gx, r.range(1600, 1780), r.range(28, 44), r.int(1, 999), { c1: '#3A2840', c2: '#6A4A50' }); }
  });
}
// kaya tepesi: üst üste binmiş yuvarlak kaya blokları (sağı güneşle aydınlık, solu mor gölgede)
const TOPY = 806;
// köşeli kaya: düzensiz çokgen (az köşe, düz kenarlar)
function crag(cx, cy, rx, ry, seed, n = 9, flatTop = false) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r.range(-0.18, 0.18);
    let k = r.range(0.84, 1.08);
    let y = cy + Math.sin(a) * ry * k;
    if (flatTop && Math.sin(a) < -0.55) y = cy - ry * 0.9 + r.range(-3, 3);
    out.push([cx + Math.cos(a) * rx * k, y]);
  }
  return out;
}
function boulders() {
  return [
    crag(548, 1192, 236, 48, 31, 12),
    crag(372, 1198, 88, 46, 32, 9, true),
    crag(702, 1188, 98, 54, 33, 9, true),
    crag(522, 1142, 132, 62, 34, 10),
    [[440, 1114], [452, 1092], [480, 1080], [522, 1076], [566, 1080], [598, 1096], [606, 1122], [586, 1152], [458, 1152]],
  ];
}
function rockCv() {
  const ox = 230, oy = 1030, w = 640, h = 240;
  return L.hcache('s08rock', w, h, SS, (x) => {
    x.translate(-ox, -oy);
    // zemine düşen uzun gölge (sola, güneşin tersine)
    x.fillStyle = rgba('#2A1838', 0.38); x.beginPath(); x.ellipse(470, 1238, 320, 18, 0, 0, TAU); x.fill();
    const B = boulders();
    // her blok ayrı tonlanır (arkadan öne): kontur yerine ton ve astar ayırır
    const order = [0, 3, 1, 2, 4];
    const cols = [['#A8665E', '#5A3868', '#F2A070'], ['#B87460', '#5E3A6A', '#FFB874'], ['#B06A5C', '#583668', '#FFAE70'], ['#9E6060', '#54346A', '#EE9A6C'], ['#C27E62', '#64406C', '#FFC07A']];
    const r = rng(191);
    for (const i of order) {
      const [b, dk, lt] = cols[i];
      P.toneShape(x, B[i], { base: b, dark: dk, light: lt, hi: '#FFD49A', lightAng: LA, seed: 190 + i, shadowW: 0.26, lightW: 0.12, coreScale: 0.88, dabs: 10, highlights: 4, strokeAng: -0.5, rimW: 5 });
      // yüzey düzlemi: sağ üst köşeden geçen düz bir ışık kenarı
      { const bb0 = P.bbox(B[i]); x.save(); x.clip(P.pathOf(B[i])); x.fillStyle = rgba(lt, 0.55); x.beginPath(); x.moveTo(bb0.cx + bb0.w * 0.1, bb0.y0 - 5); x.lineTo(bb0.x1 + 5, bb0.y0 - 5); x.lineTo(bb0.x1 + 5, bb0.cy + bb0.h * 0.15); x.lineTo(bb0.cx + bb0.w * 0.28, bb0.y0 + bb0.h * 0.32); x.closePath(); x.fill(); x.restore(); }
      const bb = P.bbox(B[i]);
      // güneş tarafında sıcak kenar ışığı (biçimi izleyen kısa yaylar)
      const rim = []; for (let k = 0; k <= 8; k++) { const a = lerp(-1.25, 0.15, k / 8); rim.push([bb.cx + Math.cos(a) * bb.w * 0.47, bb.cy + Math.sin(a) * bb.h * 0.46]); }
      x.save(); x.clip(P.pathOf(B[i])); P.curveStroke(x, rim, Math.max(6, bb.h * 0.08), rgba('#FFD08A', 0.8), 300 + i, { taper: true, bristles: 1, detail: 0.3 }); x.restore();
      // birkaç çatlak
      for (let k = 0; k < 2; k++) { const sx = bb.cx + r.range(-0.3, 0.2) * bb.w, sy = bb.cy + r.range(-0.1, 0.25) * bb.h; const ln = []; for (let q = 0; q <= 4; q++) ln.push([sx + q * r.range(-5, 8), sy + q * r.range(5, 10)]); x.save(); x.clip(P.pathOf(B[i])); P.curveStroke(x, ln, (q) => 3.5 * (1 - q * 0.7), rgba('#3E2448', 0.5), r.int(1, 999), { bristles: 0, detail: 0 }); x.restore(); }
    }
    // ot öbekleri ve küçük çiçekler (kaya diplerinde ve tepede)
    for (const [gx, gy, sz] of [[470, 1082, 18], [586, 1084, 16], [338, 1160, 18], [728, 1142, 18], [292, 1234, 24], [792, 1238, 24], [440, 1240, 20], [640, 1242, 22]]) R.grass(x, gx, gy, sz, r.int(1, 999), { c1: '#7A6A3A', c2: '#E0C060', n: 5 });
  });
}

// ---------- adam ----------
const OVERLOOK = M.pose({ torso: d(4), neck: d(5), head: d(11), armN: d(3), elbowN: d(12), handN: d(6), armF: d(-5), elbowF: d(10), eye: 0.95, mouth: 0.12, brow: -0.1 });
const NOTICE = M.pose({ torso: d(2.5), neck: d(4), head: d(4), armN: d(4), elbowN: d(14), handN: d(6), armF: d(-6), elbowF: d(12), eye: 1, mouth: 0.18, brow: -0.15 });
const NOBLE = M.pose({ torso: d(-2), neck: d(2), head: d(-3), armN: d(2), elbowN: d(10), handN: d(4), armF: d(-4), elbowF: d(8), eye: 0.95, mouth: 0.22, brow: -0.2 });
function poseAt(t) {
  let p = M.lerpPose(OVERLOOK, NOTICE, E.inOutCubic(seg(t, 25.0, 25.6)));
  p = M.lerpPose(p, NOBLE, E.inOutCubic(seg(t, 26.1, 26.75)));
  // taç oturunca hafif çökme ve toparlanma
  const land = Math.exp(-Math.max(0, t - CROWN_LAND) * 6) * Math.sin(Math.max(0, t - CROWN_LAND) * 18) * (t > CROWN_LAND ? 1 : 0);
  p.head += d(2.2) * land;
  const br = Math.sin(t * 2.1);
  p.torso += d(0.5) * br; p.py += 0.0015 * br;
  return p;
}
function crownSeat(p) {
  const s = M.skeleton(p, MAN.h), U = M.L.head * MAN.h;
  const c = Math.cos(s.ha), sn = Math.sin(s.ha);
  const u = -0.05, v = -0.4;
  return { x: MAN.x + s.headC[0] + (u * c - v * sn) * U, y: MAN.y + s.headC[1] + (u * sn + v * c) * U, rot: s.ha, U };
}

// ---------- canlılar ----------
const BE = [
  { kind: 'gazelle', x: 150, y: G8 + 4, dir: 1, sc: 1.45 },
  { kind: 'ladybug', x: 280, y: G8 + 10, dir: 1, sc: 1.6 },
  { kind: 'bird', x: 368, y: 1160, dir: 1, sc: 1.4, tuft: false },
  { kind: 'fish', x: 706, y: 1141, dir: -1, sc: 1.25, tuft: false },
  { kind: 'rabbit', x: 826, y: G8 + 6, dir: -1, sc: 1.4 },
  { kind: 'sheep', x: 966, y: G8 + 8, dir: -1, sc: 1.32 },
];
const LOOK_ORDER = ['gazelle', 'ladybug', 'bird', 'bee', 'fish', 'rabbit', 'sheep', 'butterfly'];
function lookAt(kind, t) { const i = LOOK_ORDER.indexOf(kind); return E.inOutSine(seg(t, 24.96 + i * 0.08, 25.36 + i * 0.08)); }

module.exports = {
  draw(ctx, t) {
    // kamera: yavaş kayma; "hükmünde"de adama doğru hafif itme
    const push = E.inOutSine(seg(t, 26.0, 27.4));
    const zoom = lerp(1.02, 1.0, E.inOutSine(seg(t, 24.0, 26.0))) + 0.06 * push;
    const cy = lerp(lerp(952, 942, E.inOutSine(seg(t, 24.0, 26.0))), 910, push);
    const cx = lerp(542, 530, push);
    const [bx, by] = R.breathe(t, 2.5, 181);
    R.camera(ctx, { zoom, cx: cx + bx, cy: cy + by });
    ctx.translate(0, DY);   // bütün dünya biraz yukarıda: canlılar anlam bandının üstünde kalsın
    ctx.drawImage(skyCv(), -100, -100, C.W + 200, HORIZ + 100);
    // uzakta uçan kuş sürüsü
    const r = rng(195);
    for (let i = 0; i < 7; i++) {
      const fx = lerp(-40, 1120, ((t - 24.0) * 0.06 + r.range(0, 0.12))) + i * 16, fy = 250 + r.range(-30, 30) + Math.sin(t * 0.8 + i) * 4;
      const fl = Math.sin(t * 9 + i * 1.7) * 5;
      ctx.strokeStyle = rgba('#3A2050', 0.7); ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(fx - 9, fy - fl * 0.6); ctx.quadraticCurveTo(fx - 4, fy - 3, fx, fy); ctx.quadraticCurveTo(fx + 4, fy - 3, fx + 9, fy - fl * 0.6); ctx.stroke();
    }
    const gy0 = HORIZ - 120; ctx.drawImage(groundCv(), -100, gy0, C.W + 200, C.H + 140 - gy0);
    ctx.drawImage(rockCv(), 230, 1030, 640, 240);
    // canlılar (yerdekiler + kaya sekilerindekiler)
    for (const b of BE) {
      K.drawBeing(ctx, b.kind, b.x, b.y, { t, dir: b.dir, look: lookAt(b.kind, t), scale: b.sc, la: LA, pal: 'sunset', tuft: b.tuft !== false });
    }
    // arı (solda süzülür) ve kelebek (adamın çevresinde uçuşur)
    const lb = lookAt('bee', t);
    K.bee(ctx, 220 + Math.sin(t * 0.9) * 16, 880 - lb * 50, 86, { dir: 1, t, look: lb, la: LA, phase: 2 });
    const lf = lookAt('butterfly', t);
    const fx = lerp(800 + Math.sin(t * 1.3) * 40, 730 + Math.sin(t * 1.6) * 26, lf), fy = lerp(960 + Math.sin(t * 2.1) * 30, 760 + Math.sin(t * 2.4) * 18, lf);
    K.butterfly(ctx, fx, fy, 44, { t, fly: 1, phase: 1.3, rot: Math.sin(t * 2) * 0.25 });
    // adam
    const p = poseAt(t);
    ctx.fillStyle = rgba('#2A1838', 0.35); ctx.beginPath(); ctx.ellipse(MAN.x - 36, MAN.y + 3, 88, 10, 0, 0, TAU); ctx.fill();
    M.drawMan(ctx, p, { x: MAN.x, y: MAN.y, h: MAN.h, dir: 1, light: LA });
    // taç: yukarıdan iner, başa oturur, parlar
    const seat = crownSeat(p);
    const cs = seat.U * 1.08;
    const dk = seg(t, CROWN_T, CROWN_LAND);
    if (dk > 0) {
      const fall = 1 - Math.pow(1 - dk, 2.2);
      const settle = t > CROWN_LAND ? Math.exp(-(t - CROWN_LAND) * 7) * Math.sin((t - CROWN_LAND) * 22) : 0;
      const yy = lerp(seat.y - 600, seat.y, fall) - settle * 5;
      const sway = (1 - fall) * Math.sin(t * 5) * 0.22;
      const shine = E.smooth(seg(t, CROWN_LAND - 0.1, CROWN_LAND + 0.4));
      // inerken: arkasında yumuşak altın iz
      if (fall < 1) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rgba('#FFD98A', 0.18 * (1 - fall)); ctx.beginPath(); ctx.moveTo(seat.x - cs * 0.4, yy - cs * 0.3); ctx.lineTo(seat.x + cs * 0.4, yy - cs * 0.3); ctx.lineTo(seat.x + cs * 0.15, yy - 260); ctx.lineTo(seat.x - cs * 0.15, yy - 260); ctx.closePath(); ctx.fill(); ctx.restore(); }
      R.crown(ctx, seat.x, yy, cs, { rot: seat.rot * fall + sway, glow: 0.4 + 0.8 * shine + 0.15 * Math.sin(t * 4) * shine });
      // oturma anı: parıltı patlaması + sürekli küçük parıltılar
      const burst = seg(t, CROWN_LAND - 0.02, CROWN_LAND + 0.6);
      if (burst > 0 && burst < 1) {
        const rr = rng(197);
        for (let i = 0; i < 8; i++) { const a = rr.range(-Math.PI, 0.4) + (i % 2) * Math.PI * 0.9, dd = cs * rr.range(0.5, 1.6) * (0.4 + 0.9 * E.outCubic(burst)); const fade = Math.sin(Math.PI * clamp(burst * rr.range(1, 1.6))); R.sparkle(ctx, seat.x + Math.cos(a) * dd, yy - cs * 0.3 + Math.sin(a) * dd * 0.8, rr.range(10, 18) * fade, fade, '#FFF2C0'); }
      }
      if (shine > 0) R.sparkles(ctx, seat.x, yy - cs * 0.35, cs * 0.9, 6, t, 198, { rise: 18, alpha: shine, color: '#FFF4C8', scale: 1.0 });
    }
    // gün batımı renk düzeni: hafif sıcak çarpma + güneş tarafında parlama
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgba('#FFD9B8', 0.55); ctx.fillRect(-200, -200, C.W + 400, C.H + 400); ctx.restore();
    P.glow(ctx, SUN.x, SUN.y, 700, '#FF9A50', 0.22);
  },
  sfx: [
    { t: 24.4, type: 'birds', gain: 0.14 },
    { t: 24.98, type: 'rustle', gain: 0.18 },
    { t: 25.62, type: 'whoosh', gain: 0.22 },
    { t: 26.12, type: 'chime', gain: 0.3 },
    { t: 26.16, type: 'sparkle', gain: 0.26 },
  ],
};
