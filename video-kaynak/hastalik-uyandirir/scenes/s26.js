// S26 — "eğer fazla ağır gelse sabır istemek gerektir." (110.50–114.70)
// Oda, şafak (mood 0.8→1). s25'in son pozundan (el kalpte) devam eder. 110.92 "eğer fazla": gözlerini açar, eli
// kucağına iner; başının üstünde koyu, ağır bir taş belirir. 111.66 "ağır gelse": taş omuzlarına çöker, adam yükün
// altında eğilir, oda kararır. 112.62 "sabır istemek": ellerini avuçları yukarı duaya kaldırır; taş ışık çatlaklarıyla
// yarılıp ışık zerrelerine dönüşerek çözülür; pervazdaki çatlak taştan bir fidan filizlenip sabırla büyür; pencerede
// güneş doğar. 113.88 sonrası dingin, aydınlık son kare (motor 114.2'den sonra kaynak kartına çözer).
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const B = require('./_s19_bed');
const { seg, E, lerp, clamp, rgba, mix, TAU, rng } = C;
const d = C.deg;

const T_EGER = 110.92, T_AGIR = 111.66, T_SABIR = 112.62, T_ISTE = 112.98, T_GEREK = 113.42;
const T_LAND = 111.68;

function manState(t) {
  // s25'in sonu: el kalpte, gözler kapalı, gülümseme
  let q = Object.assign({}, B.HEART, { up: 1, head: d(5), neck: d(6), eye: 0, mouth: 0.55, brow: -0.05 });
  // "eğer fazla": gözler açılır, el iner
  const down = E.inOutCubic(seg(t, T_EGER, T_EGER + 0.48));
  if (down > 0) q = B.mixPose(q, Object.assign({}, B.SIT, { up: 1, head: d(6), eye: 0.9, mouth: 0, brow: 0.35 }), down);
  // "ağır gelse": yükün altında çöker (inişte kısa bir sarsılma)
  const pre = 0.35 * E.inOutSine(seg(t, T_LAND - 0.22, T_LAND));
  const bow = lerp(pre, 1, E.outBack(seg(t, T_LAND - 0.01, T_LAND + 0.4), 1.3));
  if (bow > 0) q = B.mixPose(q, Object.assign({}, B.BOWED, { up: 1 }), clamp(bow, 0, 1.15));
  // "sabır istemek": dua
  const dua = E.inOutCubic(seg(t, T_SABIR - 0.1, T_SABIR + 0.45));
  if (dua > 0) q = B.mixPose(q, Object.assign({}, B.DUA, { up: 1, eye: 0, mouth: 0.2, brow: 0.1 }), dua);
  const serene = E.smooth(seg(t, T_GEREK, T_GEREK + 0.8));
  q.mouth = lerp(q.mouth, 0.42, serene); q.brow = lerp(q.brow, -0.05, serene);
  q.up = 1;
  const br = Math.sin(t * 2.2);
  q.torso += d(0.7) * br; q.head -= d(0.4) * br;
  return q;
}

// ---------------------------------------------------------------- ağır taş
// köşeli kaya (yerel: taban y≈0 sırta oturur), ışık sol üstten: sıcak açık üst yüz, gri-mor gövde, koyu sağ yüz
const ST_OUT = [[-118, 10], [-128, -30], [-102, -88], [-40, -128], [30, -132], [94, -104], [124, -50], [116, 10]];
const ST_FACETS = [
  { pts: [[-102, -88], [-40, -128], [30, -132], [94, -104], [40, -80], [-32, -78]], col: ['#8E82A2', '#D8B8A4'] },
  { pts: [[-118, 10], [-128, -30], [-102, -88], [-32, -78], [-52, 10]], col: ['#6A6088', '#9A86A0'] },
  { pts: [[-32, -78], [40, -80], [32, 10], [-52, 10]], col: ['#575078', '#7E6E90'] },
  { pts: [[94, -104], [124, -50], [116, 10], [32, 10], [40, -80]], col: ['#3C3658', '#5A4C6E'] },
];
const SCR = [[[-6, -130], [8, -96], [-12, -64], [6, -30], [-8, 6]], [[8, -96], [44, -84], [70, -106]], [[-12, -64], [-52, -54], [-84, -70]], [[6, -30], [46, -22], [70, -36], [104, -26]], [[-8, 6], [-56, -6], [-96, 2]]];
function backContact(info) {
  const s = info.sh, hp = info.hip;
  const td = [s[0] - hp[0], s[1] - hp[1]], L = Math.hypot(...td), u = [td[0] / L, td[1] / L], nf = [-u[1], u[0]];
  const ub = [hp[0] + td[0] * 0.82 - nf[0] * 0.066 * B.H, hp[1] + td[1] * 0.82 - nf[1] * 0.066 * B.H];
  const st = [s[0] + u[0] * 0.02 * B.H - nf[0] * 0.01 * B.H, s[1] + u[1] * 0.02 * B.H - nf[1] * 0.01 * B.H];
  const slope = clamp(Math.atan2(st[1] - ub[1], st[0] - ub[0]), -0.5, 0.05);
  return { x: lerp(ub[0], st[0], 0.5), y: lerp(ub[1], st[1], 0.5), rot: slope };
}
function stoneState(t, info) {
  const appear = C.pop(t, T_EGER + 0.2, 0.5, 1.6);
  const drop = E.inQuad(seg(t, T_LAND - 0.14, T_LAND));
  const c = backContact(info);
  const hover = 230 + Math.sin(t * 2.4) * 6;
  const lift = E.inOutCubic(seg(t, T_SABIR - 0.08, T_SABIR + 0.42));
  const x = c.x + 70 * (1 - drop) - 40 * lift, y = c.y + 12 - hover * (1 - drop) - 150 * lift;
  const imp = t > T_LAND ? Math.exp(-(t - T_LAND) * 8) * Math.cos((t - T_LAND) * 26) : 0;
  return { appear, x, y, rot: lerp(-0.12 + Math.sin(t * 1.7) * 0.04, c.rot, drop) * (1 - lift) + 0.1 * lift, sx: 1 + 0.12 * imp, sy: 1 - 0.18 * imp, landed: t >= T_LAND && lift < 0.05, lift };
}
function stone(ctx, t, st, mood) {
  const crack = seg(t, T_SABIR + 0.06, T_SABIR + 0.3);
  const melt = E.inOutSine(seg(t, T_SABIR + 0.3, T_SABIR + 0.8));
  if (st.appear <= 0.01 || melt >= 0.999) return;
  ctx.save();
  ctx.translate(st.x, st.y); ctx.rotate(st.rot);
  const k = st.appear * (1 + 0.12 * melt);
  ctx.scale(st.sx * k, st.sy * k);
  ctx.globalAlpha *= 1 - melt;
  if (!st.landed && st.lift < 0.05) P.glow(ctx, 0, 60, 150, '#2A1E44', 0.22, 'multiply');
  const g = melt * 0.85;
  P.toneShape(ctx, ST_OUT, { base: mix('#5E5680', '#E8B860', g), dark: mix('#2E2A48', '#C88A3A', g), light: mix('#8A80A8', '#FFE6A0', g), seed: 2601, lightAng: -2.3, shadowW: 0.08, lightW: 0.04, dabs: 4, rimW: 4, coreScale: 0.95 });
  for (let i = 0; i < ST_FACETS.length; i++) {
    const f = ST_FACETS[i];
    P.flat(ctx, f.pts, mix(mix(f.col[0], f.col[1], i === 0 ? clamp(mood - 0.5) : 0.2), '#FFD98A', g), { texture: 0.4, texAng: 0.3 + i * 0.4 });
  }
  // yüz kenarları ve birkaç darbe
  ctx.strokeStyle = rgba('#2A2440', 0.35 * (1 - g)); ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  for (const f of ST_FACETS) ctx.stroke(P.pathOf(f.pts));
  P.stroke(ctx, -80, -70, -40, -96, 12, rgba('#B8A6B8', 0.6), 2602, { detail: 0.4 });
  P.stroke(ctx, 50, -40, 96, -54, 11, rgba('#2C2846', 0.6), 2603, { detail: 0.4 });
  // ışık çatlakları
  if (crack > 0) {
    ctx.save(); ctx.clip(P.pathOf(ST_OUT));
    P.glow(ctx, 0, -50, 140, '#FFD27A', 0.6 * crack, 'screen');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [w, col] of [[9, rgba('#FFB84A', 0.8 * crack)], [3.5, rgba('#FFF6D0', crack)]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
      SCR.forEach((l, i) => { const f = clamp(crack * 1.6 - i * 0.15); if (f <= 0) return; ctx.moveTo(l[0][0], l[0][1]); for (let kk = 1; kk < l.length; kk++) { const q = clamp(f * (l.length - 1) - (kk - 1)); if (q <= 0) break; ctx.lineTo(lerp(l[kk - 1][0], l[kk][0], q), lerp(l[kk - 1][1], l[kk][1], q)); } });
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}
// gömlekte temas gölgesi (adam çizildikten sonra)
function contactShadow(ctx, st) {
  if (!st.landed && st.lift >= 0.05) return;
  const a = st.landed ? 1 : 0;
  if (a <= 0) return;
  ctx.save(); ctx.translate(st.x, st.y + 4); ctx.rotate(st.rot); ctx.scale(1, 0.22);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 110);
  g.addColorStop(0, 'rgba(58,40,90,0.55)'); g.addColorStop(0.6, 'rgba(58,40,90,0.3)'); g.addColorStop(1, 'rgba(58,40,90,0)');
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(-120, -120, 240, 240);
  ctx.restore();
}
// iniş tozu
function dust(ctx, t, st) {
  const a = t - T_LAND; if (a < 0 || a > 0.7) return;
  // ağırlık çizgileri
  const k = 1 - E.smooth(seg(t, T_LAND + 0.15, T_LAND + 0.6));
  ctx.save(); ctx.globalAlpha *= k;
  for (const sg of [-1]) for (let i = 0; i < 3; i++) {
    const x0 = st.x + sg * (146 + i * 10), y0 = st.y - 70 + i * 30;
    P.stroke(ctx, x0, y0, x0 + sg * 8, y0 + 30, 7, '#FFF0D8', 2620 + i + (sg > 0 ? 5 : 0), { detail: 0, taper1: 0.4 });
  }
  ctx.restore();
}
// taştan doğan ışık zerreleri (yukarı, göğe doğru)
function lightMotes(ctx, t, st) {
  const a0 = t - (T_SABIR + 0.28);
  if (a0 < 0) return;
  if (a0 < 0.9) P.glow(ctx, st.x, st.y - 10, 300, '#FFE2A0', 0.6 * Math.sin(Math.PI * clamp(a0 / 0.9)), 'screen');
  const r = rng(2630);
  for (let i = 0; i < 44; i++) {
    const ox = r.range(-120, 120), oy = r.range(-100, 36), delay = r.range(0, 0.45), life = r.range(1.4, 2.6);
    const vx = ox * r.range(0.4, 1.0) + r.range(-20, 40), vy = -r.range(90, 230);
    const a = a0 - delay; if (a < 0 || a > life) continue;
    const px = st.x + ox + vx * a + Math.sin(t * 1.6 + i) * 10, py = st.y + oy + vy * a * (1 - 0.2 * a);
    const al = Math.sin(Math.PI * clamp(a / life)) * (0.75 + 0.25 * Math.sin(t * 6 + i));
    if (i % 3 === 0) R.sparkle(ctx, px, py, r.range(9, 16), al, '#FFF6DA');
    else { const rr = r.range(2.6, 5.5); P.glow(ctx, px, py, rr * 4, '#FFD98A', 0.5 * al, 'screen'); ctx.fillStyle = rgba(r.chance(0.5) ? '#FFE3A0' : '#FFF6DC', al); ctx.beginPath(); ctx.arc(px, py, rr, 0, TAU); ctx.fill(); }
  }
}

// güneşten odaya sıcak ışınlar
function sunRays(ctx, t, k) {
  if (k <= 0.02) return;
  const { x, y, w, h } = B.ROOM.win;
  const sx = B.SUN_X, sy = lerp(y + h + 30, y + h * 0.62, E.outSine(clamp(k)));
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const r = rng(2640);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 0.62 + i * 0.07 + Math.sin(t * 0.25 + i) * 0.015 + r.range(-0.02, 0.02), len = r.range(900, 1300), wd = r.range(0.012, 0.03);
    ctx.fillStyle = rgba('#FFD9A0', 0.11 * k);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - wd) * len, sy + Math.sin(a - wd) * len); ctx.lineTo(sx + Math.cos(a + wd) * len, sy + Math.sin(a + wd) * len); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

module.exports = {
  draw(ctx, t) {
    const mood = B.dawnMood(t);
    const sunK = E.inOutSine(seg(t, T_SABIR - 0.1, 115.2));
    const shake = t > T_LAND ? 6 * Math.exp(-(t - T_LAND) * 8) : 0;
    ctx.save();
    B.applyDawnCam(ctx, t, shake);
    B.drawRoom(ctx, t, { mood, clockSpeed: 1, sun: sunK, pillow: true });
    B.flowerPot(ctx, t, { mood, bloom: [1, 1, 1] });
    // pervazdaki taş çatlar, fidan filizlenir
    const crack = E.outCubic(seg(t, T_ISTE - 0.04, T_ISTE + 0.22));
    const rockGlow = E.smooth(seg(t, T_ISTE - 0.04, T_ISTE + 0.15)) * (1 - 0.6 * E.smooth(seg(t, T_ISTE + 0.6, T_ISTE + 1.4)));
    const rpop = C.pop(t, T_SABIR, 0.45, 1.8);
    if (rpop > 0 && t < T_SABIR + 0.5) R.sparkles(ctx, B.ROCK.x, B.ROCK.y - 40, 50, 5, t, 2655, { alpha: 1 - seg(t, T_SABIR + 0.1, T_SABIR + 0.5), scale: 0.8 });
    B.rock(ctx, t, { mood, crack, glow: rockGlow, open: crack, pop: rpop });
    const g = 0.92 * E.inOutSine(seg(t, T_ISTE + 0.1, T_GEREK + 1.15)) + 0.08 * E.inOutSine(seg(t, T_GEREK + 0.9, 115.3));
    B.sapling(ctx, t, g);
    if (g > 0 && g < 0.6) R.sparkles(ctx, B.ROCK.x, B.ROCK.y - 60 - 140 * g, 40, 4, t, 2650, { alpha: clamp(g * 4) * (1 - g / 0.6), scale: 0.8 });
    sunRays(ctx, t, sunK);
    const q = manState(t);
    const info = B.probe(q);
    const st = stoneState(t, info);
    stone(ctx, t, st, mood);
    B.bedMan(ctx, q, { mood });
    contactShadow(ctx, st);
    B.dawnBeam(ctx, t, 1);
    dust(ctx, t, st);
    // yükün ağırlığı: oda kararır, dua ile aydınlanır
    const heavy = E.smooth(seg(t, T_LAND - 0.05, T_LAND + 0.3)) * (1 - E.smooth(seg(t, T_SABIR + 0.1, T_SABIR + 0.8)));
    if (heavy > 0.004) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgba('#5A4A7A', 0.34 * heavy); ctx.fillRect(-200, -200, C.W + 400, C.H + 400); ctx.restore(); }
    // dua: avuçlara ışık
    const palm = E.smooth(seg(t, T_SABIR + 0.3, T_SABIR + 0.9));
    if (palm > 0) {
      const hx = (info.tip[0] + info.tipF[0]) / 2, hy = (info.tip[1] + info.tipF[1]) / 2 - 10;
      P.glow(ctx, hx, hy, 130, '#FFE0A0', 0.42 * palm * (0.9 + 0.1 * Math.sin(t * 2.5)), 'screen');
      P.glow(ctx, info.face[0], info.face[1], 160, '#FFD9A0', 0.25 * palm, 'screen');
    }
    const th = 1 - E.smooth(seg(t, T_EGER, T_EGER + 0.4));
    if (th > 0) P.glow(ctx, info.chest[0] + 10, info.chest[1], 150, '#FFD27A', 0.32 * th * (0.85 + 0.15 * Math.sin(t * 3)), 'screen');
    lightMotes(ctx, t, st);
    // dingin son: süzülen ışık zerreleri
    const fin = E.smooth(seg(t, T_GEREK, T_GEREK + 1.0));
    if (fin > 0) R.sparkles(ctx, 600, 760, 300, 10, t * 0.5, 2660, { alpha: 0.7 * fin, scale: 0.8, rise: 40, color: '#FFF4D8' });
    ctx.restore();
  },
  sfx: [
    { t: 111.2, type: 'rumble', gain: 0.2 },
    { t: 111.68, type: 'thud', gain: 0.45 },
    { t: 112.66, type: 'crack', gain: 0.22 },
    { t: 112.9, type: 'sparkle', gain: 0.3 },
    { t: 113.05, type: 'swell', gain: 0.3 },
    { t: 113.9, type: 'birds', gain: 0.18 },
  ],
};
