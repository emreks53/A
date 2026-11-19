// S25 — "Ondan şekva değil belki bu cihette ona teşekkür etmek," (105.60–110.50)
// Oda, şafak (mood 0.5→0.8: oda ısınır, pencerede şafak). Adam yatakta doğrulmuş oturuyor.
// 106.16 "Ondan": başının üstünde karmakarışık, koyu, çizgili bir şikâyet bulutu karalanarak oluşur, adam kaşlarını
// çatar. 106.52 "şekva" – 107.22 "değil": bulut ısınıp altına döner ve ışık zerrelerine ayrılarak dağılır.
// 107.74 "belki bu cihette": pencereden şafak ışığı yatağa düşer, adam ışığa döner. 109.0 "ona teşekkür etmek":
// elini kalbine koyar, gözleri kapalı sakin bir gülümseme; pervazdaki saksıda çiçekler sırayla açar.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const B = require('./_s19_bed');
const { seg, E, lerp, clamp, rgba, mix, TAU, rng } = C;
const d = C.deg;

const T_ONDAN = 106.16, T_SEKVA = 106.52, T_DEGIL = 106.98, T_BELKI = 107.74, T_ONA = 109.0;
const REST = Object.assign({}, B.SIT);

function manState(t) {
  let q = Object.assign({ up: 1 }, REST);
  q.head = d(6); q.eye = 0.9; q.brow = 0.2; q.mouth = -0.05;
  // "Ondan": huysuzlanır
  const sour = E.smooth(seg(t, T_ONDAN - 0.05, T_ONDAN + 0.3)) * (1 - E.smooth(seg(t, T_DEGIL - 0.05, T_DEGIL + 0.4)));
  q.brow = lerp(q.brow, 0.95, sour); q.mouth = lerp(q.mouth, -0.5, sour); q.head += d(7) * sour; q.eye = lerp(q.eye, 0.72, sour); q.torso += d(3) * sour;
  // "değil": yatışır, hafif gülümser
  const calm = E.smooth(seg(t, T_DEGIL, T_DEGIL + 0.45));
  q.brow = lerp(q.brow, 0.05, calm); q.mouth = lerp(q.mouth, 0.18, calm);
  // "belki bu cihette": ışığa (pencereye) döner
  const look = E.inOutCubic(seg(t, T_BELKI - 0.1, T_BELKI + 0.5)) * (1 - E.inOutCubic(seg(t, T_ONA - 0.1, T_ONA + 0.4)));
  q.head -= d(14) * look; q.neck -= d(4) * look; q.eye = lerp(q.eye, 1, look);
  // "ona teşekkür": eli kalbine, gözler kapalı, gülümseme
  const h = E.inOutCubic(seg(t, T_ONA - 0.12, T_ONA + 0.42));
  if (h > 0) q = B.mixPose(q, Object.assign({}, B.HEART, { up: 1, head: d(5), eye: q.eye, brow: q.brow, mouth: q.mouth, neck: q.neck }), h);
  const shut = E.smooth(seg(t, T_ONA + 0.12, T_ONA + 0.4));
  q.eye = lerp(q.eye, 0, shut); q.mouth = lerp(q.mouth, 0.55, shut); q.brow = lerp(q.brow, -0.05, shut);
  q.up = 1;
  const br = Math.sin(t * 2.2);
  q.torso += d(0.7) * br; q.head -= d(0.4) * br;
  return q;
}

// ---------------------------------------------------------------- şikâyet bulutu
const CL = { x: 436, y: 742 };
const LOOPS = (() => {
  const r = rng(2501);
  return Array.from({ length: 9 }, (_, i) => ({
    cx: r.range(-84, 84), cy: r.range(-36, 30), rx: r.range(30, 66), ry: r.range(20, 40), a0: r.range(0, TAU), turns: r.range(1.3, 2.1),
    w: r.range(6, 10), col: ['#1E1830', '#2A2240', '#231C36', '#30264A'][i % 4], seed: 2510 + i, dir: i % 2 ? 1 : -1, t0: r.range(0, 0.22), ph: r.range(0, 10),
  }));
})();
const ZIGS = [[[-70, -6], [-52, -24], [-38, 4], [-20, -20]], [[24, 14], [40, -10], [56, 12], [74, -12]], [[-14, 30], [2, 12], [16, 34]]];
function complaint(ctx, t) {
  const born = C.pop(t, T_ONDAN - 0.04, 0.42, 1.8);
  if (born <= 0) return;
  // "şekva değil": bulut ısınıp altına döner, sonra ışık zerrelerine ayrılır
  const gold = E.smooth(seg(t, T_SEKVA + 0.08, T_DEGIL - 0.02));
  const fade = 1 - E.smooth(seg(t, T_DEGIL - 0.06, T_DEGIL + 0.26));
  if (fade <= 0.005) return;
  const agit = E.smooth(seg(t, T_ONDAN + 0.1, T_ONDAN + 0.3)) * (1 - gold);
  const jx = Math.sin(t * 43) * 3.5 * agit, jy = Math.cos(t * 37) * 2.5 * agit;
  const x = CL.x + jx, y = CL.y + jy - 14 * gold;
  // dönüşürken içten ışıma
  const lit = Math.sin(Math.PI * clamp((t - T_SEKVA) / (T_DEGIL + 0.2 - T_SEKVA)));
  if (lit > 0) P.glow(ctx, x, y + 10, 240, '#FFD98A', 0.6 * lit * fade, 'screen');
  ctx.save(); ctx.globalAlpha *= fade;
  ctx.translate(x, y); ctx.scale(born * (1 + 0.08 * gold), born * (1 + 0.08 * gold)); ctx.translate(-x, -y);
  // koyu bulut gövdesi
  const list = R.cloudPts(x, y + 22, 136, 2520);
  const two = (a, m, b) => (gold < 0.5 ? mix(a, m, gold * 2) : mix(m, b, gold * 2 - 1));
  P.toneUnion(ctx, list, { base: two('#7A7096', '#E2A8C6', '#FFD98A'), dark: two('#4E4670', '#B07AB0', '#F2A64A'), light: two('#9A90B6', '#FFD6E6', '#FFF2C4'), seed: 2521, lightAng: -2.2, shadowW: 0.16, lightW: 0.05, strokeAng: 0, texture: 0.4, dabs: 10, rimColor: mix('#E2582E', '#FFB04A', gold) });
  // karalama ilmekleri: sırayla çizilir
  for (const l of LOOPS) {
    const f = clamp((t - (T_ONDAN + l.t0)) / 0.32);
    if (f <= 0) continue;
    const n = Math.round(40 * l.turns * f) + 2, pts = [];
    for (let k = 0; k < n; k++) {
      const a = l.a0 + l.dir * (k / (40 * l.turns)) * l.turns * TAU;
      const rr = 1 + 0.22 * Math.sin(2.3 * a + l.ph) + 0.08 * Math.sin(t * 9 + l.ph + a) * agit;
      pts.push([x + l.cx + Math.cos(a) * l.rx * rr, y + l.cy + Math.sin(a) * l.ry * rr]);
    }
    P.curveStroke(ctx, pts, (u) => l.w * (0.6 + 0.4 * Math.sin(Math.PI * u)), mix(l.col, '#FFF2C4', clamp(gold * 1.6)), l.seed, { bristles: 1, detail: 0.5 });
  }
  // küçük zikzaklar (öfke)
  const zf = clamp((t - (T_ONDAN + 0.2)) / 0.2);
  if (zf > 0) {
    ctx.strokeStyle = mix('#241C3A', '#FFF2C8', clamp(gold * 1.6)); ctx.lineWidth = 6; ctx.lineJoin = 'miter'; ctx.lineCap = 'round';
    for (const z of ZIGS) { ctx.beginPath(); z.forEach(([a, b], i) => { const px = x + a * zf, py = y + b; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); }
  }
  ctx.restore();
}
// buluttan doğan ışık zerreleri
function motes(ctx, t) {
  const a0 = t - (T_DEGIL - 0.1);
  if (a0 < 0 || a0 > 2.4) return;
  const r = rng(2530);
  if (a0 < 0.8) P.glow(ctx, CL.x, CL.y, 300, '#FFE2A0', 0.65 * Math.sin(Math.PI * clamp(a0 / 0.8)), 'screen');
  for (let i = 0; i < 46; i++) {
    const ox = r.range(-150, 150), oy = r.range(-70, 70) * (1 - Math.abs(ox) / 260), delay = r.range(0, 0.35), vx = ox * r.range(0.3, 0.8) + r.range(-30, 30), vy = -r.range(40, 140), life = r.range(1.2, 2.0);
    const a = a0 - delay; if (a < 0 || a > life) continue;
    const px = CL.x + ox + vx * a + Math.sin(t * 2 + i) * 8, py = CL.y + oy + vy * a;
    const al = Math.sin(Math.PI * clamp(a / life)) * (0.75 + 0.25 * Math.sin(t * 7 + i));
    if (i % 3 === 0) R.sparkle(ctx, px, py, r.range(9, 16), al, '#FFF4D6');
    else { const rr = r.range(2.6, 5.5); P.glow(ctx, px, py, rr * 4, '#FFD98A', 0.5 * al, 'screen'); ctx.fillStyle = rgba(r.chance(0.5) ? '#FFE3A0' : '#FFF6DC', al); ctx.beginPath(); ctx.arc(px, py, rr, 0, TAU); ctx.fill(); }
  }
}

function bloomOf(t) {
  return [0, 1, 2].map((i) => E.outBack(clamp((t - (T_ONA + 0.05 + i * 0.24)) / 0.55), 1.4));
}

module.exports = {
  draw(ctx, t) {
    const mood = B.dawnMood(t);
    ctx.save();
    B.applyDawnCam(ctx, t);
    B.drawRoom(ctx, t, { mood, clockSpeed: 1, pillow: true });
    B.flowerPot(ctx, t, { mood, bloom: bloomOf(t) });
    const beam = E.inOutSine(seg(t, T_BELKI - 0.15, T_BELKI + 0.75));
    const q = manState(t);
    const info = B.probe(q);
    B.bedMan(ctx, q, { mood });
    B.dawnBeam(ctx, t, beam);
    // ışık yüzüne vurur
    if (beam > 0) P.glow(ctx, info.face[0] + 20, info.face[1], 170, '#FFD9A0', 0.3 * beam, 'screen');
    // teşekkür: kalpte sıcak ışık, çiçeklerde parıltı
    const th = E.smooth(seg(t, T_ONA + 0.25, T_ONA + 0.8));
    if (th > 0) {
      P.glow(ctx, info.chest[0] + 10, info.chest[1], 150, '#FFD27A', 0.32 * th * (0.85 + 0.15 * Math.sin(t * 3)), 'screen');
      R.sparkles(ctx, B.POT.x, B.POT.y - 190, 70, 6, t, 2540, { alpha: th, scale: 0.9, color: '#FFF4D6' });
    }
    complaint(ctx, t);
    motes(ctx, t);
    ctx.restore();
  },
  sfx: [
    { t: 106.14, type: 'rumble', gain: 0.22 },
    { t: 106.98, type: 'sparkle', gain: 0.3 },
    { t: 107.7, type: 'swell', gain: 0.22 },
    { t: 109.02, type: 'chime', gain: 0.26 },
    { t: 109.3, type: 'pop', gain: 0.16 },
  ],
};
