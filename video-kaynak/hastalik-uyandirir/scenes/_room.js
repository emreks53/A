// Ortak gece odası: hasta yatağı, pencere (ay ve yıldızlar), duvar saati, yan masada kandil.
// s01, s19, s20, s25, s26 bu odayı kullanır. Dünya koordinatı 1080x1920 (kamera sahnede uygulanır).
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E } = C;

const ROOM = {
  floorY: 1460, mattressY: 1268, bedX0: 190, bedX1: 1010,
  win: { x: 590, y: 300, w: 380, h: 560 },
  clock: { x: 250, y: 600 },
  lamp: { x: 104, y: 1250 },
};

// mood: 0 = gece (lacivert), 1 = şafak/aydınlık (sıcak) — sonraki sahnelerde odayı aydınlatmak için
function wallCanvas(mood) {
  const key = 'roomwall' + Math.round(mood * 10);
  return R.cached(key, C.W, 1500, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, C.W, 1500);
    const night = ['#1E2160', '#262B78', '#2E3A8A', '#3A3F86'];
    const dawn = ['#6A4E9A', '#9C6FA8', '#D79A9A', '#F2C49A'];
    const cols = night.map((c, i) => mix(c, dawn[i], mood));
    P.bandFill(x, null, { x0: 0, y0: 0, x1: C.W, y1: 1500, w: C.W, h: 1500 }, cols, { seed: 31, axis: Math.PI / 2, angle: Math.PI / 2 + 0.03, wMin: 22, wMax: 42, lMin: 90, lMax: 260, mixJitter: 0.1 });
  });
}
function floorCanvas(mood) {
  const key = 'roomfloor' + Math.round(mood * 10);
  return R.cached(key, C.W, 520, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, C.W, 520);
    const cols = ['#4A2C4E', '#5A3550', '#6B3E4A'].map((c, i) => mix(c, ['#8A5A4A', '#A8704E', '#C08A5A'][i], mood));
    P.bandFill(x, null, { x0: 0, y0: 0, x1: C.W, y1: 520, w: C.W, h: 520 }, cols, { seed: 32, wMin: 18, wMax: 30, lMin: 120, lMax: 340 });
    // tahta derzleri
    x.strokeStyle = rgba('#2A1630', 0.45); x.lineWidth = 3;
    for (let i = 0; i < 6; i++) { const y = 30 + i * 85 + i * i * 4; x.beginPath(); x.moveTo(0, y); x.lineTo(C.W, y + 6); x.stroke(); }
  });
}

function drawWindow(ctx, t, mood = 0) {
  const { x, y, w, h } = ROOM.win;
  const arch = P.smoothPts([[x, y + h], [x, y + h * 0.3], [x + w * 0.15, y + h * 0.08], [x + w * 0.5, y], [x + w * 0.85, y + h * 0.08], [x + w, y + h * 0.3], [x + w, y + h]], false, 8).concat([[x + w, y + h]]);
  // pencere çerçevesi (ahşap) — biraz büyütülmüş kemer
  const frame = arch.map(([px, py]) => [x + w / 2 + (px - x - w / 2) * 1.09, y + h / 2 + (py - y - h / 2) * 1.06]);
  P.toneShape(ctx, frame, { base: mix('#5B3A3E', '#9A6A50', mood), dark: '#2E1B2A', light: mix('#8A5A50', '#D8A070', mood), seed: 41, shadowW: 0.05, lightW: 0.03, dabs: 6, rim: true });
  // gece göğü
  ctx.save(); ctx.clip(P.pathOf(arch));
  const sky = R.skyCanvas('roomnight' + Math.round(mood * 10), w, h, ['#0E1240', '#1B2370', '#2A3C96'].map((c, i) => mix(c, ['#F2A27A', '#F7C68E', '#FBE3B0'][i], mood)), { seed: 44, wMin: 14, wMax: 26, lMin: 50, lMax: 140 });
  ctx.drawImage(sky, x, y);
  ctx.restore();
  ctx.save(); ctx.clip(P.pathOf(arch));
  ctx.translate(x, y);
  if (mood < 0.95) { ctx.globalAlpha = 1 - mood; R.stars(ctx, w, h, 36, 9, t); R.moon(ctx, w * 0.68, h * 0.28, 46, { crescent: true, sky: '#1B2370' }); ctx.globalAlpha = 1; }
  ctx.restore();
  // pencere kayıtları
  ctx.strokeStyle = mix('#3A2230', '#7A5040', mood); ctx.lineWidth = 12; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(x + w / 2, y + 8); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + h * 0.55); ctx.lineTo(x + w, y + h * 0.55); ctx.stroke();
  // pervaz
  P.toneShape(ctx, P.rectPts(x - 36, y + h - 6, w + 72, 34), { base: mix('#6B4446', '#B07A58', mood), dark: '#2E1B2A', light: '#A06A5A', seed: 42, shadowW: 0.3, dabs: 3, rim: false });
}

function drawClock(ctx, t, speed = 1, mood = 0) {
  const { x, y } = ROOM.clock;
  // sarkaç kutusu
  const body = P.roundRectPts(x - 70, y - 90, 140, 330, 26);
  P.toneShape(ctx, body, { base: mix('#6A3E2E', '#A06A44', mood), dark: '#3A1E18', light: '#A86A44', seed: 51, shadowW: 0.14, dabs: 5 });
  // kadran
  P.toneShape(ctx, P.ellipsePts(x, y - 10, 58, 58, 36), { base: '#F4ECD8', dark: '#C8BCA8', light: '#FFFFF4', seed: 52, rim: false, shadowW: 0.1, dabs: 2 });
  ctx.strokeStyle = '#3A2A2A'; ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 46, y - 10 + Math.sin(a) * 46); ctx.lineTo(x + Math.cos(a) * 52, y - 10 + Math.sin(a) * 52); ctx.stroke(); }
  const sec = Math.floor(t * 2 * speed) / 2; // tik tak
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + Math.cos(-1.9) * 30, y - 10 + Math.sin(-1.9) * 30); ctx.stroke();
  ctx.lineWidth = 4; const am = -Math.PI / 2 + sec * 0.4; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + Math.cos(am) * 44, y - 10 + Math.sin(am) * 44); ctx.stroke();
  // sarkaç
  const sw = Math.sin(t * Math.PI * 2 * speed) * 0.32;
  const px = x + Math.sin(sw) * 120, py = y + 70 + Math.cos(sw) * 120;
  ctx.strokeStyle = '#C9A040'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + 70); ctx.lineTo(px, py); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(x - 60, y + 60, 120, 172); ctx.clip();
  P.toneShape(ctx, P.ellipsePts(px, py, 22, 22, 20), { base: '#E2B23E', dark: '#9A6A16', light: '#FFE08A', rim: false, seed: 53, dabs: 1 });
  ctx.restore();
}

function drawLampTable(ctx, t, lit = 1, mood = 0) {
  const { x, y } = ROOM.lamp;
  const top = P.rectPts(x - 96, y - 10, 192, 26);
  const legs = [P.rectPts(x - 82, y + 10, 18, ROOM.floorY - y - 10), P.rectPts(x + 64, y + 10, 18, ROOM.floorY - y - 10)];
  for (const l of legs) P.toneShape(ctx, l, { base: mix('#5A3324', '#8A5A3A', mood), dark: '#2E1810', light: '#8A5A3A', seed: 61, shadowW: 0.3, dabs: 2, rim: false });
  P.toneShape(ctx, P.rectPts(x - 84, y + 60, 166, 120), { base: mix('#6A3E2E', '#9A6A44', mood), dark: '#3A1E18', light: '#9A6A44', seed: 62, shadowW: 0.2, dabs: 3 });
  P.toneShape(ctx, top, { base: mix('#7A4A32', '#B07A50', mood), dark: '#3A1E18', light: '#B07A50', seed: 63, shadowW: 0.25, dabs: 3 });
  // kandil (yağ lambası)
  const fl = lit * (0.88 + 0.12 * Math.sin(t * 17) * Math.sin(t * 6.1 + 1));
  if (lit > 0) { P.glow(ctx, x, y - 70, 520, '#FF9F45', 0.42 * fl); P.glow(ctx, x, y - 70, 140, '#FFE2A0', 0.6 * fl); }
  const bowl = P.smoothPts([[x - 54, y - 26], [x - 40, y - 52], [x + 30, y - 56], [x + 66, y - 40], [x + 44, y - 12], [x - 30, y - 10]], true, 6);
  P.toneShape(ctx, bowl, { base: '#C98B2E', dark: '#7A4E17', light: '#F2C66A', seed: 64, shadowW: 0.25, dabs: 2, rim: false });
  if (lit > 0) {
    const fx = x + 58, fy = y - 50, fh = 46 * (0.9 + 0.1 * Math.sin(t * 23));
    const flame = P.smoothPts([[fx, fy - fh], [fx + 12, fy - fh * 0.4], [fx + 8, fy], [fx - 8, fy], [fx - 12, fy - fh * 0.4]], true, 6);
    ctx.fillStyle = rgba('#FFB547', fl); ctx.fill(P.pathOf(flame));
    ctx.fillStyle = rgba('#FFF4C8', fl); ctx.fill(P.pathOf(flame.map(([a, b]) => [fx + (a - fx) * 0.5, fy + (b - fy) * 0.6])));
  }
}

// yatak + yastık (adam ayrıca çizilir), sonra yorgan
function drawBedBack(ctx, mood = 0) {
  const { bedX0: x0, bedX1: x1, mattressY: my, floorY } = ROOM;
  // başlık
  const head = P.roundRectPts(x0 - 20, my - 300, 44, floorY - my + 300, 18);
  P.toneShape(ctx, head, { base: mix('#6A3A2C', '#9A6040', mood), dark: '#34180F', light: '#A0603E', seed: 71, shadowW: 0.3, dabs: 4, strokeAng: Math.PI / 2 });
  // ayak ucu
  const foot = P.roundRectPts(x1 - 26, my - 120, 40, floorY - my + 120, 16);
  P.toneShape(ctx, foot, { base: mix('#6A3A2C', '#9A6040', mood), dark: '#34180F', light: '#A0603E', seed: 72, shadowW: 0.3, dabs: 3, strokeAng: Math.PI / 2 });
  // karyola yanı
  P.toneShape(ctx, P.rectPts(x0, my + 40, x1 - x0, 70), { base: mix('#5A3024', '#8A5638', mood), dark: '#2E140C', light: '#8A5638', seed: 73, shadowW: 0.3, dabs: 6 });
  // şilte
  P.toneShape(ctx, P.roundRectPts(x0 + 10, my - 6, x1 - x0 - 30, 56, 20), { base: mix('#E8E0F0', '#FFF2E2', mood), dark: '#A69FCB', light: '#FFFFFF', seed: 74, shadowW: 0.3, dabs: 6, rim: false });
  // yastık
  const pil = P.smoothPts([[x0 + 30, my - 6], [x0 + 26, my - 70], [x0 + 90, my - 98], [x0 + 200, my - 92], [x0 + 236, my - 40], [x0 + 210, my - 4]], true, 6);
  P.toneShape(ctx, pil, { base: mix('#F2EEF8', '#FFF6EA', mood), dark: '#A9A3CC', light: '#FFFFFF', seed: 75, shadowW: 0.2, lightW: 0.08, dabs: 4 });
}

// Yatan adam. o: { headTurn, kneeUp 0..1, armToHead 0..1, eye, brow, mouth, age, blanketColor, mood, t }
function drawPatient(ctx, o = {}) {
  const h = 760;
  const hipX = 640, hipY = ROOM.mattressY - 52;
  const ku = clamp(o.kneeUp ?? 0), ah = clamp(o.armToHead ?? 0);
  const p = M.pose({
    rot: -Math.PI / 2 + (o.roll ?? 0),
    torso: 0, neck: deg(-4), head: (o.headTurn ?? 0) + deg(2),
    thighN: lerp(deg(2), deg(28), ku), kneeN: lerp(deg(2), deg(56), ku),
    thighF: deg(0), kneeF: deg(2),
    armN: deg(10), elbowN: deg(8), handN: deg(6),
    armF: deg(4), elbowF: deg(6), armFollow: 1,
    eye: o.eye ?? 1, brow: o.brow ?? 0, mouth: o.mouth ?? 0, footN: deg(-80), footF: deg(-80),
  });
  const mo = { x: hipX, y: hipY + 0.5 * h, h, light: -0.9, age: o.age ?? 0 };
  M.drawMan(ctx, p, Object.assign({}, mo, { parts: ['armF', 'legF', 'legN', 'torso', 'armN', 'head'] }));
  // yorgan: göğüsten ayağa, diz kalkınca kabarır
  const s = M.skeleton(p, h);
  const W_ = (pt) => M.toWorld(pt, mo, s, p);
  const sh = W_(s.sh), hip = W_(s.hip), knee = W_(s.legN.knee), ank = W_(s.legN.ankle);
  const my = ROOM.mattressY;
  const topY = (yy) => Math.min(yy, my - 30);
  const ctrl = [
    [sh[0] + 34, my + 40], [sh[0] + 26, topY(sh[1] - 40)], [lerp(sh[0], hip[0], 0.5), topY(hip[1] - 66)], [hip[0] + 10, topY(hip[1] - 70)],
    [knee[0], topY(knee[1] - 40)], [lerp(knee[0], ank[0], 0.55), topY(Math.max(knee[1], ank[1]) - 36 - ku * 20)], [ank[0] + 30, topY(ank[1] - 46)],
    [ROOM.bedX1 - 10, my - 40], [ROOM.bedX1 + 4, my + 30], [ROOM.bedX1 - 6, my + 118], [lerp(sh[0], ROOM.bedX1, 0.5), my + 128], [sh[0] + 80, my + 116],
  ];
  const bl = P.smoothPts(ctrl, true, 8);
  const bc = o.blanketColor || '#A8455E';
  P.toneShape(ctx, bl, { base: bc, dark: mix(bc, '#2A1A55', 0.5), light: mix(bc, '#FFB27A', 0.4), seed: 81, lightAng: -1.0, shadowW: 0.05, lightW: 0.025, coreScale: 0.98, strokeAng: 0.08, dabs: 18, rim: true, rimW: 4 });
  // yorgan deseni: ince açık şerit
  ctx.save(); ctx.clip(P.pathOf(bl));
  // kenar şeridi ve kıvrım gölgeleri
  ctx.strokeStyle = rgba('#F4D7A8', 0.6); ctx.lineWidth = 8;
  for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(sh[0] + 92 + i * 22, my - 220); ctx.lineTo(sh[0] + 96 + i * 22, my + 220); ctx.stroke(); }
  const rr = C.rng(83);
  for (let i = 0; i < 5; i++) {
    const fx = lerp(hip[0] - 40, ROOM.bedX1 - 60, i / 4) + rr.range(-20, 20);
    P.stroke(ctx, fx, my + 150, fx + rr.range(-30, 30), my + rr.range(-40, 10), rr.range(8, 14), rgba(mix(bc, '#2A1A55', 0.55), 0.55), rr.int(1, 1e9), { detail: 0, taper1: 0.3 });
  }
  ctx.restore();
  // yorganın kenarını kavrayan el (huzursuzluk)
  if (ah > 0.01) {
    const ex = sh[0] + lerp(150, 70, ah), ey = topY(sh[1] - 40) + 6;
    const wr = [ex + 36, ey + 22], tip = [ex - 2, ey - 4 + 30 * (1 - ah)];
    const hp = M.handPts(wr, tip, h, 0.75 * ah, true);
    ctx.save(); ctx.globalAlpha = clamp(ah * 3);
    M.partShade(ctx, hp, M.LOOK.skin, M.LOOK.skinDark, M.LOOK.skinLight, -1.0, 0.25);
    ctx.restore();
  }
  return { s, p, mo, head: W_(s.headC) };
}
function deg(d) { return (d * Math.PI) / 180; }

function drawRoom(ctx, t, o = {}) {
  const mood = o.mood ?? 0;
  ctx.drawImage(wallCanvas(mood), 0, 0);
  // kandil ışığı duvarda
  if ((o.lamp ?? 1) > 0) P.glow(ctx, ROOM.lamp.x + 40, ROOM.lamp.y - 120, 760, '#FF8A3D', 0.28 * (o.lamp ?? 1), 'screen');
  ctx.drawImage(floorCanvas(mood), 0, ROOM.floorY - 10);
  drawWindow(ctx, t, mood);
  drawClock(ctx, t, o.clockSpeed ?? 1, mood);
  // ay ışığı lekesi
  if (mood < 0.8) {
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rgba('#7C8CE0', 0.16 * (1 - mood));
    ctx.beginPath(); ctx.moveTo(ROOM.win.x, ROOM.win.y + ROOM.win.h); ctx.lineTo(ROOM.win.x + ROOM.win.w, ROOM.win.y + ROOM.win.h); ctx.lineTo(ROOM.win.x + ROOM.win.w - 120, ROOM.floorY + 300); ctx.lineTo(ROOM.win.x - 300, ROOM.floorY + 300); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  drawLampTable(ctx, t, o.lamp ?? 1, mood);
  drawBedBack(ctx, mood);
}

module.exports = { ROOM, drawRoom, drawBedBack, drawPatient, drawClock, drawWindow, drawLampTable, wallCanvas };
