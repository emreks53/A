// s19, s20, s25, s26 ortak yardımcıları: aynı oda (scenes/_room.js, değiştirmeden), yatakta yatan/doğrulan/oturan
// aynı adam (yorgan bacaklarda), yumuşak mood geçişi (duvar/zemin/gök çapraz geçişli), pencere önü (saksı, taş, fidan),
// güneş, ışık hüzmesi ve sahnelerin efektleri (gaflet sisi, cam kırılması, ışıyan kontur, köz, ses halkaları,
// şikâyet bulutu, ağır taş).
'use strict';
const { createCanvas, Path2D } = require('@napi-rs/canvas');
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const Room = require('./_room');
const { ROOM } = Room;
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, seg } = C;
const d = C.deg;

const H = 760;                                   // adamın boyu (s01 ile aynı)
const LIE_HIP = [640, ROOM.mattressY - 52];      // s01'deki yatış
const SIT_HIP = [404, ROOM.mattressY - 50];      // oturuş: sırtı başucundaki kabarık yastığa dayalı
const WORLD_LIGHT = -2.4;                        // dünyada ışık sol üstten

// ---------------------------------------------------------------- oda
// Oda _room.js'deki fonksiyonlar ve aynı tohumlarla kurulur; hareketsiz katman (duvar, zemin, pencere çerçevesi,
// saat gövdesi, lamba masası, yatak, kabarık yastık) mood basamağı başına bir kez 2x çözünürlükte önbelleğe çizilir
// (kamera 1.4–2.7x yaklaştığı için keskin kalsın). Kareye yalnız canlı parçalar çizilir: pencere içi (gök, yıldız,
// ay, güneş), kayıtlar ve pervaz, saat ibreleri ve sarkaç, kandil alevi ve ışığı. İki mood basamağı çapraz geçer.
const RC = { x0: 30, y0: 140, w: 1050, h: 1640, ss: 2 };
function lampOf(mood) { return clamp((0.95 - mood) / 0.9); }
// pencere göğü: gece _room ile aynı; şafakta lacivertten mor-pembeye, sonra şeftaliye (çamurlaşmadan)
function nightSky(k) {
  const { w, h } = ROOM.win, mood = k / 10;
  const night = ['#0E1240', '#1B2370', '#2A3C96'], mid = ['#4E3F94', '#B0679E', '#F08E7E'], dawn = ['#F2A27A', '#F7C68E', '#FBE3B0'];
  const cols = mood <= 0.5 ? night.map((c, i) => mix(c, mid[i], mood / 0.5)) : mid.map((c, i) => mix(c, dawn[i], (mood - 0.5) / 0.5));
  return R.skyCanvas((k === 0 ? 'roomnight' : 's19sky') + k, w, h, cols, { seed: 44, wMin: 14, wMax: 26, lMin: 50, lMax: 140 });
}
// iki önbellek basamağı arasında yumuşak geçiş
function xfade(ctx, mood, fn) {
  const m = clamp(mood) * 10, k0 = Math.min(9, Math.floor(m)), k1 = k0 + 1, f = m - k0;
  if (f >= 0.996) { fn(k1, 1); return; }
  fn(k0, 1);
  if (f > 0.004) fn(k1, f);
}
function archPts() {
  const { x, y, w, h } = ROOM.win;
  return P.smoothPts([[x, y + h], [x, y + h * 0.3], [x + w * 0.15, y + h * 0.08], [x + w * 0.5, y], [x + w * 0.85, y + h * 0.08], [x + w, y + h * 0.3], [x + w, y + h]], false, 8).concat([[x + w, y + h]]);
}
const ARCH = archPts();
// _room.drawClock'un hareketsiz kısmı (gövde, kadran, çentikler) — aynı tohumlar
function clockStatic(ctx, mood) {
  const { x, y } = ROOM.clock;
  P.toneShape(ctx, P.roundRectPts(x - 70, y - 90, 140, 330, 26), { base: mix('#6A3E2E', '#A06A44', mood), dark: '#3A1E18', light: '#A86A44', seed: 51, shadowW: 0.14, dabs: 5 });
  P.toneShape(ctx, P.ellipsePts(x, y - 10, 58, 58, 36), { base: '#F4ECD8', dark: '#C8BCA8', light: '#FFFFF4', seed: 52, rim: false, shadowW: 0.1, dabs: 2 });
  ctx.strokeStyle = '#3A2A2A'; ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 46, y - 10 + Math.sin(a) * 46); ctx.lineTo(x + Math.cos(a) * 52, y - 10 + Math.sin(a) * 52); ctx.stroke(); }
}
// _room.drawClock'un hareketli kısmı (ibreler, sarkaç)
function clockLive(ctx, t, speed) {
  const { x, y } = ROOM.clock;
  ctx.strokeStyle = '#3A2A2A'; ctx.lineCap = 'round';
  const sec = Math.floor(t * 2 * speed) / 2;
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + Math.cos(-1.9) * 30, y - 10 + Math.sin(-1.9) * 30); ctx.stroke();
  ctx.lineWidth = 4; const am = -Math.PI / 2 + sec * 0.4; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + Math.cos(am) * 44, y - 10 + Math.sin(am) * 44); ctx.stroke();
  const sw = Math.sin(t * Math.PI * 2 * speed) * 0.32;
  const px = x + Math.sin(sw) * 120, py = y + 70 + Math.cos(sw) * 120;
  ctx.strokeStyle = '#C9A040'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + 70); ctx.lineTo(px, py); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(x - 60, y + 60, 120, 172); ctx.clip();
  P.toneShape(ctx, P.ellipsePts(px, py, 22, 22, 20), { base: '#E2B23E', dark: '#9A6A16', light: '#FFE08A', rim: false, seed: 53, dabs: 1 });
  ctx.restore();
}
// _room.drawLampTable'ın hareketli kısmı (kandil ışığı ve alevi)
function lampLive(ctx, t, lit) {
  if (lit <= 0.003) return;
  const { x, y } = ROOM.lamp;
  const fl = lit * (0.88 + 0.12 * Math.sin(t * 17) * Math.sin(t * 6.1 + 1));
  P.glow(ctx, x, y - 70, 520, '#FF9F45', 0.42 * fl); P.glow(ctx, x, y - 70, 140, '#FFE2A0', 0.6 * fl);
  const fx = x + 58, fy = y - 50, fh = 46 * (0.9 + 0.1 * Math.sin(t * 23));
  const flame = P.smoothPts([[fx, fy - fh], [fx + 12, fy - fh * 0.4], [fx + 8, fy], [fx - 8, fy], [fx - 12, fy - fh * 0.4]], true, 6);
  ctx.fillStyle = rgba('#FFB547', fl); ctx.fill(P.pathOf(flame));
  ctx.fillStyle = rgba('#FFF4C8', fl); ctx.fill(P.pathOf(flame.map(([a, b]) => [fx + (a - fx) * 0.5, fy + (b - fy) * 0.6])));
}
function roomStatic(k, pillow) {
  return R.cached(`s19room${k}${pillow ? 'p' : ''}`, RC.w * RC.ss, RC.h * RC.ss, (x) => {
    const mood = k / 10;
    x.scale(RC.ss, RC.ss); x.translate(-RC.x0, -RC.y0);
    // duvar (_room.wallCanvas ile aynı darbeler, keskin)
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, C.W, 1500);
    const night = ['#1E2160', '#262B78', '#2E3A8A', '#3A3F86'], dawn = ['#6A4E9A', '#9C6FA8', '#D79A9A', '#F2C49A'];
    P.bandFill(x, null, { x0: 0, y0: 0, x1: C.W, y1: 1500, w: C.W, h: 1500 }, night.map((c, i) => mix(c, dawn[i], mood)), { seed: 31, axis: Math.PI / 2, angle: Math.PI / 2 + 0.03, wMin: 22, wMax: 42, lMin: 90, lMax: 260, mixJitter: 0.1 });
    const lamp = lampOf(mood);
    if (lamp > 0) P.glow(x, ROOM.lamp.x + 40, ROOM.lamp.y - 120, 760, '#FF8A3D', 0.28 * lamp, 'screen');
    // zemin (_room ile aynı)
    x.save(); x.translate(0, ROOM.floorY - 10);
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, C.W, 520);
    const cols = ['#4A2C4E', '#5A3550', '#6B3E4A'].map((c, i) => mix(c, ['#8A5A4A', '#A8704E', '#C08A5A'][i], mood));
    P.bandFill(x, null, { x0: 0, y0: 0, x1: C.W, y1: 520, w: C.W, h: 520 }, cols, { seed: 32, wMin: 18, wMax: 30, lMin: 120, lMax: 340 });
    x.strokeStyle = rgba('#2A1630', 0.45); x.lineWidth = 3;
    for (let i = 0; i < 6; i++) { const yy = 30 + i * 85 + i * i * 4; x.beginPath(); x.moveTo(0, yy); x.lineTo(C.W, yy + 6); x.stroke(); }
    x.restore();
    Room.drawWindow(x, 0, mood);            // çerçeve (iç kısım karede yeniden çizilir)
    clockStatic(x, mood);
    const { x: wx, y: wy, w: ww, h: wh } = ROOM.win;
    if (mood < 0.8) {
      x.save(); x.globalCompositeOperation = 'screen'; x.fillStyle = rgba('#7C8CE0', 0.16 * (1 - mood) * clamp((0.8 - mood) * 4));
      x.beginPath(); x.moveTo(wx, wy + wh); x.lineTo(wx + ww, wy + wh); x.lineTo(wx + ww - 120, ROOM.floorY + 300); x.lineTo(wx - 300, ROOM.floorY + 300); x.closePath(); x.fill(); x.restore();
    }
    Room.drawLampTable(x, 0, 0, mood);      // ışıksız masa + kandil kabı
    Room.drawBedBack(x, mood);
    if (pillow) proppedPillow(x, mood);
  });
}

// o: { mood, lamp (alev), clockSpeed, sun (0..1 doğuş), pillow, beforeSill(ctx) }
function drawRoom(ctx, t, o = {}) {
  const mood = clamp(o.mood ?? 0), lamp = o.lamp ?? lampOf(mood);
  const ga = ctx.globalAlpha;
  xfade(ctx, mood, (k, a) => { ctx.globalAlpha = ga * a; ctx.drawImage(roomStatic(k, !!o.pillow), RC.x0, RC.y0, RC.w, RC.h); });
  ctx.globalAlpha = ga;
  const { x, y, w, h } = ROOM.win;
  ctx.save(); ctx.clip(P.pathOf(ARCH));
  xfade(ctx, mood, (k, a) => { ctx.globalAlpha = ga * a; ctx.drawImage(nightSky(k), x, y); });
  ctx.globalAlpha = ga;
  ctx.translate(x, y);
  if (mood < 0.95) { ctx.globalAlpha = ga * (1 - mood) * (1 - mood * 0.3); R.stars(ctx, w, h, 36, 9, t); ctx.globalAlpha = ga * clamp(1 - mood * 2.2); if (ctx.globalAlpha > 0.01) R.moon(ctx, w * 0.68, h * 0.28, 46, { crescent: true, sky: mix('#1B2370', '#F7C68E', mood) }); ctx.globalAlpha = ga; }
  ctx.translate(-x, -y);
  // şafak: güneşin doğacağı yerde sıcak aydınlık
  const dg = clamp((mood - 0.3) / 0.6);
  if (dg > 0) { P.glow(ctx, SUN_X, y + h - 40, 520, '#FFB070', 0.5 * dg, 'screen'); P.glow(ctx, SUN_X, y + h - 50, 240, '#FFE2B0', 0.4 * dg, 'screen'); }
  if ((o.sun ?? 0) > 0) drawSun(ctx, t, o.sun);
  xfade(ctx, mood, (k, a) => { ctx.globalAlpha = ga * a; ctx.drawImage(hillsCanvas(k), x, y + h - HILLS_H); });
  ctx.globalAlpha = ga;
  ctx.restore();
  // kayıtlar ve pervaz (_room ile aynı)
  ctx.strokeStyle = mix('#3A2230', '#7A5040', mood); ctx.lineWidth = 12; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(x + w / 2, y + 8); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + h * 0.55); ctx.lineTo(x + w, y + h * 0.55); ctx.stroke();
  if (o.beforeSill) o.beforeSill(ctx);
  P.toneShape(ctx, P.rectPts(x - 36, y + h - 6, w + 72, 34), { base: mix('#6B4446', '#B07A58', mood), dark: '#2E1B2A', light: '#A06A5A', seed: 42, shadowW: 0.3, dabs: 3, rim: false });
  clockLive(ctx, t, o.clockSpeed ?? 1);
  lampLive(ctx, t, lamp);
}

// pencerenin alt camlarında uzak tepeler (ufuk) — gece lacivert, şafakta mor-gül
const HILLS_H = 150;
function hillsCanvas(k) {
  const { w } = ROOM.win, mood = k / 10;
  return R.cached('s19hills' + k, w, HILLS_H, (x) => {
    const layer = (pts, base, dark, light, seed) => P.toneShape(x, pts, { base, dark, light, seed, shadowW: 0.04, lightW: 0.03, dabs: 6, strokeAng: 0.05, rimW: 3, lightAng: -1.2 });
    const far = []; for (let i = 0; i <= 40; i++) { const u = i / 40; far.push([u * w, 62 - 26 * Math.sin(u * 5.2 + 0.6) - 12 * Math.sin(u * 11 + 2)]); }
    layer(far.concat([[w, HILLS_H], [0, HILLS_H]]), mix('#1E2462', '#B07AA8', mood), mix('#161A4A', '#8A5E98', mood), mix('#2A3274', '#E0A8B8', mood), 451);
    const near = []; for (let i = 0; i <= 40; i++) { const u = i / 40; near.push([u * w, 104 - 20 * Math.sin(u * 3.6 + 2.2) - 8 * Math.sin(u * 9 + 1)]); }
    layer(near.concat([[w, HILLS_H], [0, HILLS_H]]), mix('#151844', '#7E5A8E', mood), mix('#0E1036', '#5E4278', mood), mix('#20245A', '#B08AA8', mood), 452);
  });
}
// pencerede doğan güneş (tepelerin arkasından; pencere kırpması içinde çağrılır). k: 0 ufkun altında → 1 yükselmiş
const SUN_X = 716;
function drawSun(ctx, t, k) {
  const { x, y, w, h } = ROOM.win;
  const sx = SUN_X, sy = lerp(y + h + 30, y + h * 0.62, E.outSine(clamp(k))), R0 = 92;
  const a = clamp(k * 2);
  P.glow(ctx, sx, sy, 640, '#FFB45A', 0.6 * a, 'screen');
  // ışınlar
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 14; i++) {
    const an = (i / 14) * TAU + t * 0.06, wd = 0.07 + 0.03 * Math.sin(i * 2.3), len = 420;
    ctx.fillStyle = rgba('#FFE6B0', 0.16 * a);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(an - wd) * len, sy + Math.sin(an - wd) * len); ctx.lineTo(sx + Math.cos(an + wd) * len, sy + Math.sin(an + wd) * len); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // yumuşak kenarlı büyük disk
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R0 * 1.25);
  g.addColorStop(0, rgba('#FFF8DC', a)); g.addColorStop(0.55, rgba('#FFE08A', a)); g.addColorStop(0.8, rgba('#FFC060', 0.85 * a)); g.addColorStop(1, rgba('#FFB050', 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, R0 * 1.25, 0, TAU); ctx.fill();
  const r = rng(7);
  ctx.save(); ctx.globalAlpha *= a;
  for (let i = 0; i < 6; i++) {
    const an = r.range(0, TAU), rr = R0 * r.range(0.25, 0.65);
    const arc = []; for (let j = 0; j <= 6; j++) { const aa = an + j * 0.16; arc.push([sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr]); }
    P.curveStroke(ctx, arc, 6, '#FFF6D8', 70 + i, { taper: true, bristles: 1 });
  }
  ctx.restore();
}

// sabah ışık hüzmesi: pencereden yatağa düşen sıcak ışık. k: 0..1
function dawnBeam(ctx, t, k, o = {}) {
  if (k <= 0.001) return;
  const { x, y, w, h } = ROOM.win;
  const spread = E.outCubic(clamp(k));
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const g = ctx.createLinearGradient(x + w * 0.6, y + h * 0.6, 380, ROOM.mattressY + 40);
  g.addColorStop(0, rgba('#FFD9A0', 0.42 * k)); g.addColorStop(0.55, rgba('#FFC27A', 0.26 * k)); g.addColorStop(1, rgba('#FFB070', 0.0));
  ctx.fillStyle = g;
  // hüzme: pencerenin iki bölmesinden yatağa doğru iki şerit
  for (const [u0, u1] of [[0.04, 0.47], [0.53, 0.96]]) {
    const ax = x + w * u0, bx = x + w * u1, top = y + h * 0.62;
    const dx = lerp(40, -330, spread), dy = lerp(60, ROOM.mattressY - top + 30, spread);
    ctx.beginPath(); ctx.moveTo(ax, top); ctx.lineTo(bx, top); ctx.lineTo(bx + dx + 40, top + dy); ctx.lineTo(ax + dx - 60, top + dy); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // hüzmede süzülen toz zerreleri
  const r = rng(o.seed ?? 401);
  for (let i = 0; i < 26; i++) {
    const u = r.next(), v = r.next(), sp = r.range(0.04, 0.1);
    const ph = (v + t * sp) % 1;
    const px = lerp(x + w * 0.2, 420, u) + Math.sin(t * 0.7 + i) * 12 + ph * 30, py = lerp(y + h * 0.7, ROOM.mattressY - 40, u) - ph * 60;
    const a = k * Math.sin(ph * Math.PI) * 0.8;
    ctx.fillStyle = rgba('#FFF1C8', a); ctx.beginPath(); ctx.arc(px, py, r.range(1.5, 3.4), 0, TAU); ctx.fill();
  }
}


// ---------------------------------------------------------------- pencere önü: saksı + çiçekler, taş + fidan
const SILL_Y = ROOM.win.y + ROOM.win.h - 6;      // pervazın üst yüzü
const POT = { x: 624, y: SILL_Y + 2 };
const ROCK = { x: 716, y: SILL_Y + 3, s: 0.78 };
// bloom: [0..1] her çiçek için açılma; sway: salınım genliği
function flowerPot(ctx, t, o = {}) {
  const mood = o.mood ?? 0.6, { x, y } = POT;
  const bloom = o.bloom || [0, 0, 0];
  const sw = (i) => Math.sin(t * 1.3 + i * 1.7) * 0.025 + Math.sin(t * 0.7 + i) * 0.015;
  // saplar ve yapraklar (saksının arkasından çıkar)
  const stems = [[-22, -128, -0.18], [4, -168, 0.02], [26, -116, 0.22]];
  const tops = [];
  stems.forEach(([dx, hh, lean], i) => {
    const a = lean + sw(i);
    const line = []; for (let k = 0; k <= 8; k++) { const u = k / 8; line.push([x + dx * 0.5 + Math.sin(a) * -hh * u + dx * 0.5 * u, y - 52 + hh * u * (1 - 0.05 * u)]); }
    P.curveStroke(ctx, line, (u) => 6.5 * (1 - u * 0.45), mix('#3E8A45', '#4E9A4C', mood), 611 + i, { bristles: 2 });
    tops.push(line[8]);
    const lp = line[4];
    R.leaf(ctx, lp[0], lp[1], 34, (i - 1) * 0.6 + (i === 1 ? -2.4 : i === 0 ? -2.7 : -0.5) + sw(i) * 2, 621 + i, { base: '#3E9B4F', dark: '#1E5E3A', light: '#9ED64A', lightAng: -2.3 });
  });
  // saksı (pişmiş toprak)
  const pot = P.smoothPts([[x - 36, y - 62], [x + 36, y - 62], [x + 28, y - 4], [x + 22, y], [x - 22, y], [x - 28, y - 4]], true, 4);
  P.toneShape(ctx, pot, { base: '#C8643A', dark: '#7E3426', light: '#EE9A62', seed: 631, shadowW: 0.22, lightW: 0.12, dabs: 4, strokeAng: Math.PI / 2, rimW: 3 });
  P.toneShape(ctx, P.roundRectPts(x - 41, y - 72, 82, 18, 5), { base: '#D2703F', dark: '#86392A', light: '#F4A56A', seed: 632, shadowW: 0.3, lightW: 0.16, dabs: 2, rim: false });
  ctx.fillStyle = '#4A2A22'; ctx.beginPath(); ctx.ellipse(x, y - 70, 34, 4, 0, 0, TAU); ctx.fill();
  // tomurcuk → çiçek
  const cols = [['#FBF6FF', '#F07BB2'], ['#F7B3CF', '#E0457E'], ['#FFF4DF', '#F0A030']];
  tops.forEach(([fx, fy], i) => {
    const b = bloom[i] ?? 0;
    if (b < 0.98) {
      const bud = P.smoothPts([[fx, fy - 16], [fx + 8, fy - 6], [fx + 6, fy + 4], [fx - 6, fy + 4], [fx - 8, fy - 6]], true, 5);
      ctx.save(); ctx.globalAlpha *= clamp(1 - b * 1.4);
      P.toneShape(ctx, bud, { base: mix('#5AA04A', cols[i][1], 0.35), dark: '#2E6A3A', light: '#9ED64A', seed: 641 + i, rim: false, shadowW: 0.3, dabs: 1, texture: 0.3 });
      ctx.restore();
    }
    if (b > 0.02) {
      if (b > 0.3) P.glow(ctx, fx, fy - 6, 70 * b, '#FFE6C0', 0.25 * clamp((b - 0.3) * 2));
      R.flower(ctx, fx, fy - 6, 32 * Math.min(1.15, b), 651 + i, { open: Math.min(1, b), color: cols[i][0], inner: cols[i][1], dark: mix(cols[i][0], '#8A7AC0', 0.4), petals: 7, tilt: (i - 1) * 0.3 });
    }
  });
}
// taş: crack 0..1 (çatlak açılır, içinden ışık), glow 0..1
function rockShape() {
  const { x, y } = ROCK;
  return P.smoothPts([[x - 58, y], [x - 62, y - 30], [x - 40, y - 62], [x - 2, y - 74], [x + 40, y - 64], [x + 62, y - 34], [x + 60, y]], true, 7);
}
// pop: 0..1 belirme ölçeği (taban ortasından)
function rock(ctx, t, o = {}) {
  const pop = o.pop ?? 1;
  if (pop <= 0.01) return;
  ctx.save(); ctx.translate(ROCK.x, ROCK.y); ctx.scale(ROCK.s * pop, ROCK.s * pop); ctx.translate(-ROCK.x, -ROCK.y);
  rockBody(ctx, t, o);
  ctx.restore();
}
function rockBody(ctx, t, o) {
  const { x, y } = ROCK, cr = clamp(o.crack ?? 0), mood = o.mood ?? 0.6;
  const pts = rockShape();
  P.toneShape(ctx, pts, { base: mix('#8E86A8', '#A898B0', mood), dark: '#4E4670', light: mix('#C8C0DA', '#F2D8C8', mood), seed: 661, shadowW: 0.18, lightW: 0.1, dabs: 7, strokeAng: 0.3, rimW: 3.5 });
  // yosun lekesi
  P.stroke(ctx, x - 40, y - 46, x - 14, y - 52, 8, '#7A9A6A', 662, { detail: 0.4 });
  if (cr > 0) {
    // zikzak çatlak: tepeden aşağı açılır
    const crack = [[x - 4, y - 73], [x + 6, y - 56], [x - 6, y - 40], [x + 5, y - 24], [x - 3, y - 8]];
    const n = crack.length - 1, upto = cr * n;
    const line = [crack[0]];
    for (let i = 0; i < n && i < upto; i++) { const k = Math.min(1, upto - i); const a = crack[i], b = crack[i + 1]; line.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]); }
    const open = clamp(o.open ?? cr);
    if ((o.glow ?? 0) > 0) P.glow(ctx, x, y - 40, 120, '#FFD27A', 0.5 * o.glow);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = '#2A2040'; ctx.lineWidth = 4 + open * 6; ctx.beginPath(); line.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke();
    if ((o.glow ?? 0) > 0) { ctx.strokeStyle = rgba('#FFE3A0', clamp(o.glow)); ctx.lineWidth = 1.5 + open * 3; ctx.stroke(); }
    ctx.restore();
  }
}
// fidan: g 0..1 büyüme
function sapling(ctx, t, g, o = {}) {
  if (g <= 0.001) return;
  const { x, y } = ROCK;
  const base = [x, y - 70 * ROCK.s];
  const hh = 225 * E.outSine(clamp(g));
  const sway = Math.sin(t * 1.1) * 0.03 * clamp(g * 2);
  const line = [];
  for (let k = 0; k <= 10; k++) { const u = k / 10; line.push([base[0] + Math.sin(u * 2.4) * 10 * clamp(g * 1.5) + Math.sin(sway) * hh * u * u, base[1] - hh * u]); }
  P.curveStroke(ctx, line, (u) => (4 + 7 * clamp(g)) * (1 - u * 0.6), '#5E8A3A', 671, { bristles: 2 });
  // yaprak çiftleri: sırayla açılır
  const pairs = [[0.32, 0.18], [0.55, 0.36], [0.75, 0.55], [0.9, 0.72]];
  pairs.forEach(([u, gk], i) => {
    const k = E.outBack(clamp((g - gk) / 0.22), 1.6);
    if (k <= 0) return;
    const pt = line[Math.round(u * 10)];
    const len = (42 - i * 4) * k;
    R.leaf(ctx, pt[0], pt[1], len, -0.5 - sway * 2, 681 + i * 2, { base: '#4FAE4E', dark: '#1F6A3A', light: '#B6E05A', lightAng: -2.3 });
    R.leaf(ctx, pt[0], pt[1], len * 0.92, Math.PI + 0.5 - sway * 2, 682 + i * 2, { base: '#46A04A', dark: '#1F6A3A', light: '#A6D852', lightAng: -2.3 });
  });
  // tepe tomurcuğu
  const tip = line[10];
  const kb = clamp((g - 0.2) / 0.3);
  if (kb > 0) R.leaf(ctx, tip[0], tip[1] + 2, 28 * kb, -Math.PI / 2 + sway * 3, 691, { base: '#8ED050', dark: '#3E8A3A', light: '#D6F07A' });
  return tip;
}

// ---------------------------------------------------------------- pozlar
// Yatan (s01 drawPatient ile aynı) — yalnız üst gövde/kol/baş parametreleri; bacak ve dönüş bedMan'de
const LIE = { torso: 0, neck: d(-4), head: d(2), armN: d(10), elbowN: d(8), handN: d(6), armF: d(4), elbowF: d(6), handF: d(5), armFollow: 1, eye: 1, brow: 0, mouth: 0, grip: 0 };
// oturan, eller kucakta (yorganın üstünde)
const SIT = { torso: d(-7), neck: d(6), head: d(4), armN: d(14), elbowN: d(64), handN: d(16), armF: d(10), elbowF: d(70), handF: d(18), armFollow: 0.3, eye: 1, brow: 0, mouth: 0, grip: 0.15 };
// s19: yataktan hızla doğrulmuş (gövde dikeyden ~29° geride), yakın el kalçanın gerisinde döşeğe dayalı
const SITUP = { up: 0.68, torso: 0, neck: d(8), head: d(6), armN: d(-30), elbowN: d(10), handN: d(-86), armF: d(-24), elbowF: d(12), handF: d(-80), armFollow: 0, eye: 1, brow: 0.55, mouth: -0.12, grip: 0 };
// eli kalbinde
const HEART = Object.assign({}, SIT, { torso: d(-3), armN: d(-13), elbowN: d(147), handN: d(-112), grip: 0.0 });
// dua: iki el göğüs hizasında, avuçlar yukarı
const DUA = Object.assign({}, SIT, { torso: d(-3), neck: d(2), head: d(-10), armN: d(6), elbowN: d(150), handN: d(-34), armF: d(16), elbowF: d(148), handF: d(-44), grip: 0.05 });
// taşın altında eğilmiş
const BOWED = Object.assign({}, SIT, { torso: d(25), spine: 0.55, neck: d(16), head: d(16), armN: d(6), elbowN: d(58), handN: d(14), armF: d(4), elbowF: d(62), handF: d(16), brow: 0.9, mouth: -0.35, eye: 0.7 });
function mixPose(a, b, k) {
  const o = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) o[key] = lerp(a[key] ?? 0, b[key] ?? 0, k);
  return o;
}

// up: 0 yatıyor .. 1 oturuyor (kalça yerinde döner; bacaklar hep yatay)
function fullPose(q) {
  const up = clamp(q.up ?? 0);
  const rot = -Math.PI / 2 * (1 - up);
  return M.pose(Object.assign({}, q, {
    rot,
    thighN: lerp(d(2), d(90), up) + (q.kneeUp ?? 0) * d(20), kneeN: d(2) + (q.kneeUp ?? 0) * d(40),
    thighF: lerp(d(0), d(88), up), kneeF: d(2),
    footN: lerp(d(-80), d(-180), up), footF: lerp(d(-80), d(-180), up),
  }));
}


// çizmeden iskelet noktaları (kamera hedefi, efekt konumları için)
function probe(q = {}, o = {}) {
  const up = clamp(q.up ?? 0);
  const hip = o.hip || (up > 0.5 ? SIT_HIP : LIE_HIP);
  const p = fullPose(q);
  const mo = { x: hip[0], y: hip[1] + 0.5 * H, h: H };
  const s = M.skeleton(p, H);
  const W_ = (pt) => M.toWorld(pt, mo, s, p);
  const hc = W_(s.headC), nt = W_(s.neckTop);
  const l = Math.hypot(hc[0] - nt[0], hc[1] - nt[1]) || 1;
  const hu = [(hc[0] - nt[0]) / l, (hc[1] - nt[1]) / l], hf = [-hu[1], hu[0]];
  const u = M.L.head * H;
  const at = (a, b) => [hc[0] + hf[0] * a * u + hu[0] * b * u, hc[1] + hf[1] * a * u + hu[1] * b * u];
  const sh = W_(s.sh), hp = W_(s.hip);
  const td = [sh[0] - hp[0], sh[1] - hp[1]], tl = Math.hypot(...td) || 1, nf = [-td[1] / tl, td[0] / tl];
  const chest = [lerp(hp[0], sh[0], 0.72) + nf[0] * 0.02 * H, lerp(hp[1], sh[1], 0.72) + nf[1] * 0.02 * H];
  return { head: hc, hu, hf, face: at(0.18, 0.02), forehead: at(0.22, 0.24), eye: at(0.27, 0.04), chest, sh, hip: hp, s, p, W: W_, wrist: W_(s.armN.wrist), wristF: W_(s.armF.wrist), tip: W_(s.armN.tip), tipF: W_(s.armF.tip) };
}

// astar kenarı (parça parça çizerken drawMan bunu atlıyor) — yalnız üst gövde
function manRim(ctx, s, mo, p) {
  const h = mo.h, cap = M.capsule;
  const shN = [lerp(s.hip[0], s.sh[0], 0.8), lerp(s.hip[1], s.sh[1], 0.8)];
  const sil = [cap(s.hip, shN, 0.12 * h, 0.12 * h),
    cap(s.armN.shoulder, s.armN.elbow, 0.062 * h, 0.05 * h), cap(s.armN.elbow, s.armN.wrist, 0.05 * h, 0.042 * h),
    cap(s.armF.shoulder, s.armF.elbow, 0.062 * h, 0.05 * h), cap(s.armF.elbow, s.armF.wrist, 0.05 * h, 0.042 * h)];
  ctx.save(); ctx.translate(mo.x, mo.y);
  if (p.rot) { ctx.translate(s.hip[0], s.hip[1]); ctx.rotate(p.rot); ctx.translate(-s.hip[0], -s.hip[1]); }
  ctx.strokeStyle = P.UNDERPAINT; ctx.lineWidth = Math.max(1.4, h * 0.0052); ctx.lineJoin = 'round';
  ctx.setLineDash([h * 0.04, h * 0.15, h * 0.02, h * 0.2, h * 0.06, h * 0.12]);
  ctx.translate(h * 0.003, h * 0.002);
  for (const q of sil) ctx.stroke(P.pathOf(q));
  ctx.restore();
}

// yorgan çokgeni (dünya) — iskelete göre
function blanketPts(W_, s, up, cover) {
  const my = ROOM.mattressY;
  const hip = W_(s.hip), sh = W_(s.sh), knee = W_(s.legN.knee), ank = W_(s.legN.ankle);
  const L = Math.hypot(sh[0] - hip[0], sh[1] - hip[1]) || 1;
  const td = [(sh[0] - hip[0]) / L, (sh[1] - hip[1]) / L], nf = [-td[1], td[0]];
  const f = cover ?? lerp(0.86, 0.16, up);
  const A = [hip[0] + td[0] * L * f, hip[1] + td[1] * L * f];
  const bt = 0.07 * H;
  const Af = [A[0] + nf[0] * (bt + 8), A[1] + nf[1] * (bt + 8)];
  const Ab = [A[0] - nf[0] * (bt + 8), Math.min(A[1] - nf[1] * (bt + 8), my + 10)];
  const topY = (yy) => Math.min(yy, my - 30);
  const legTop = hip[1] - 0.06 * H;
  const ctrl = [
    [A[0] + lerp(34, -58, up), my + lerp(40, 112, up)],
    Ab, Af,
    [lerp(hip[0] + 10, hip[0] + 0.12 * H, up), topY(lerp(hip[1] - 70, legTop - 6, up))],
    [knee[0], topY(knee[1] - lerp(40, 50, up))],
    [lerp(knee[0], ank[0], 0.55), topY(Math.max(knee[1], ank[1]) - lerp(36, 44, up))],
    [ank[0] + lerp(30, 14, up), topY(ank[1] - lerp(46, 84, up))],
    [ank[0] + lerp(56, 62, up), topY(ank[1] - lerp(30, 52, up))],
    [ROOM.bedX1 - 10, my - 40], [ROOM.bedX1 + 4, my + 30], [ROOM.bedX1 - 6, my + 118],
    [lerp(A[0], ROOM.bedX1, 0.5), my + 128], [A[0] + lerp(80, -36, up), my + lerp(116, 124, up)],
  ];
  return { pts: P.smoothPts(ctrl, true, 8), A, Af, hip, sh, up };
}
function drawBlanket(ctx, bl, o = {}) {
  const my = ROOM.mattressY;
  const bc = o.blanketColor || '#A8455E';
  const mood = o.mood ?? 0;
  P.toneShape(ctx, bl.pts, { base: bc, dark: mix(bc, '#2A1A55', 0.5), light: mix(bc, '#FFB27A', 0.4 + 0.15 * mood), seed: 81, lightAng: -1.0, shadowW: 0.05, lightW: 0.025, coreScale: 0.98, strokeAng: 0.08, dabs: 18, rim: true, rimW: 4 });
  ctx.save(); ctx.clip(P.pathOf(bl.pts));
  ctx.strokeStyle = rgba('#F4D7A8', 0.6); ctx.lineWidth = 8;
  if ((o.stripes ?? ((bl.up ?? 0) < 0.5 ? 'chest' : 'foot')) === 'chest') {
    const sx = bl.Af[0] + 34;
    for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(sx + i * 22, my - 260); ctx.lineTo(sx + 4 + i * 22, my + 220); ctx.stroke(); }
  } else {
    // oturuşta: şerit ayak ucunda, yorganın kıvrımını izleyerek (ellerden ve anlam bandından uzak)
    const sx = ROOM.bedX1 - 128;
    for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(sx + i * 20 - 40, my - 140); ctx.quadraticCurveTo(sx + i * 20 + 6, my - 30, sx + i * 20 + 30, my + 220); ctx.stroke(); }
  }
  const rr = rng(83);
  for (let i = 0; i < 5; i++) {
    const fx = lerp(bl.hip[0] - 40, ROOM.bedX1 - 60, i / 4) + rr.range(-20, 20);
    P.stroke(ctx, fx, my + 150, fx + rr.range(-30, 30), my + rr.range(-40, 10), rr.range(8, 14), rgba(mix(bc, '#2A1A55', 0.55), 0.55), rr.int(1, 1e9), { detail: 0, taper1: 0.3 });
  }
  ctx.restore();
}

// başucuna dayalı kabarık yastık (oturuşta sırt desteği)
function proppedPillow(ctx, mood = 0) {
  const x0 = ROOM.bedX0, my = ROOM.mattressY;
  const pts = P.smoothPts([[x0 + 26, my - 4], [x0 + 22, my - 130], [x0 + 38, my - 226], [x0 + 92, my - 246], [x0 + 142, my - 208], [x0 + 158, my - 110], [x0 + 168, my - 10]], true, 7);
  P.toneShape(ctx, pts, { base: mix('#A9A1D2', '#F6E8E2', mood), dark: mix('#655D9C', '#BC9EC2', mood), light: mix('#C8C0E8', '#FFFAF4', mood), seed: 76, shadowW: 0.2, lightW: 0.07, dabs: 6, strokeAng: Math.PI / 2 - 0.2, rimW: 3.5 });
}

// Yataktaki adam. q: poz parametreleri + up, hip, armOver (yakın kol yorganın üstünde), mood, blanketColor
// dönüş: { s, p, mo, W (yerel→dünya), head, chest, eye }
function bedMan(ctx, q = {}, o = {}) {
  const up = clamp(q.up ?? 0);
  const hip = o.hip || (up > 0.5 ? SIT_HIP : LIE_HIP);
  const p = fullPose(q);
  const mo = { x: hip[0], y: hip[1] + 0.5 * H, h: H, light: WORLD_LIGHT - p.rot, age: 0 };
  const s = M.skeleton(p, H);
  const W_ = (pt) => M.toWorld(pt, mo, s, p);
  if (o.behind) o.behind(ctx, s, W_);
  manRim(ctx, s, mo, p);
  const armOver = o.armOver ?? (up > 0.6);
  M.drawMan(ctx, p, Object.assign({}, mo, { parts: armOver ? ['armF', 'torso', 'head'] : ['armF', 'torso', 'armN', 'head'] }));
  if (o.mid) o.mid(ctx, s, W_);
  const bl = blanketPts(W_, s, up, o.cover);
  drawBlanket(ctx, bl, o);
  if (armOver) M.drawMan(ctx, p, Object.assign({}, mo, { parts: ['armN'] }));
  const hd = W_(s.headC);
  // göğüs (kalp) noktası: omuz-kalça arasında, ön yüze yakın
  const td = [(W_(s.sh)[0] - W_(s.hip)[0]), (W_(s.sh)[1] - W_(s.hip)[1])];
  const nf = [-td[1] / Math.hypot(...td), td[0] / Math.hypot(...td)];
  const ch = [lerp(W_(s.hip)[0], W_(s.sh)[0], 0.72) + nf[0] * 0.02 * H, lerp(W_(s.hip)[1], W_(s.sh)[1], 0.72) + nf[1] * 0.02 * H];
  return { s, p, mo, W: W_, head: hd, chest: ch, nf, blanket: bl };
}

// yorganın altındaki bacaklar dahil tüm gövdenin siluet maskesi için: adamı tam (bacaklarla) çiz
function manFull(ctx, q, o = {}) {
  const up = clamp(q.up ?? 0);
  const hip = o.hip || (up > 0.5 ? SIT_HIP : LIE_HIP);
  const p = fullPose(q);
  const mo = { x: hip[0], y: hip[1] + 0.5 * H, h: H, light: WORLD_LIGHT - p.rot, rim: false };
  M.drawMan(ctx, p, mo);
}


// ---------------------------------------------------------------- s25–s26 ortak: mood ve kamera (geçişte birebir aynı)
function dawnMood(t) {
  if (t < 110.5) return lerp(0.5, 0.8, E.inOutSine(seg(t, 105.4, 110.5)));
  return lerp(0.8, 1.0, E.inOutSine(seg(t, 110.5, 114.4)));
}
function dawnCam(t) {
  // s25: hafif itme; s26: taş inince küçük itme, "sabır"dan sonra pencereyi açan yavaş geri çekilme
  const a = E.inOutSine(seg(t, 105.1, 110.6));
  let zoom = lerp(1.68, 1.8, a), cx = lerp(520, 500, a), cy = lerp(968, 984, a);
  const st = E.inOutSine(seg(t, 111.5, 112.3)) * (1 - E.inOutSine(seg(t, 112.5, 113.2)));
  zoom += 0.02 * st; cy -= 14 * st;
  const back = E.inOutSine(seg(t, 112.55, 114.6));
  zoom = lerp(zoom, 1.36, back); cx = lerp(cx, 622, back); cy = lerp(cy, 918, back);
  const fin = E.inOutSine(seg(t, 114.3, 115.4));
  zoom -= 0.02 * fin; cy -= 6 * fin;
  return { zoom, cx, cy };
}
function applyDawnCam(ctx, t, shake = 0) {
  const c = dawnCam(t);
  const [bx, by] = R.breathe(t, 2.2, 25);
  R.camera(ctx, { zoom: c.zoom, cx: c.cx + bx + Math.sin(t * 67) * shake, cy: c.cy + by + Math.cos(t * 53) * shake });
}

module.exports = {
  lampOf, SITUP, H, LIE_HIP, SIT_HIP, ROOM, ARCH, LIE, SIT, HEART, DUA, BOWED, mixPose, fullPose,
  drawRoom, drawSun, dawnBeam, proppedPillow, bedMan, manFull, blanketPts, xfade,
  SILL_Y, POT, ROCK, SUN_X, flowerPot, rock, rockShape, sapling, probe, dawnMood, dawnCam, applyDawnCam,
};
