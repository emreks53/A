// S14 — "burada ticaret ile ebedî daimî bir hayatın saadetine çalışmak için gelmiştir." (51.70–58.50)
// Dağ eteğinde, yol kenarında bir çarşı tezgâhı. "burada ticaret ile" (52.08): adam avucundaki ışık küresinden
// sikkeleri terazinin kefesine verir; sikkeler parlayıp öbür kefede ışıktan bir fidana dönüşür; fidan omzundaki heybeye uçar.
// "ebedî" (53.82, sonsuz): kamera yukarı eğilip geri çekilir: sonsuza kıvrılan yolun ucunda, yüksek dağın tepesinde
// ışıyan ebedî bahçe kapısı. "hayatın saadetine" (55.16–55.72): bahçe daha da parlar, çiçekler açar, güvercinler döner.
// "çalışmak için gelmiştir" (56.34–57.60): adam yol boyunca ışık fidanları diker, her fidandan bahçeye doğru ışık akar.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const L = require('./_s13_lib');
const Wd = require('./_s13_world');
const { seg, E, lerp, clamp, rgba, mix, shade, TAU, rng } = C;
const d = C.deg;
const { GATE, STALL } = Wd;

// ---------------- kamera ----------------
const T_TILT0 = 52.75, T_TILT1 = 54.5;
const CAM_STALL = { zoom: 1.5, cx: 606, cy: 2240 }, CAM_WIDE = { zoom: 1.0, cx: 540, cy: 962 }, CAM_WORK = { zoom: 1.7, cx: 400, cy: 902 };
function cam(t) {
  // eğilme: önce zoom korunarak yukarı kayar (tezgâh kadrajdan hızla çıkar), geri çekilme sonra gelir
  const x1 = seg(t, T_TILT0, T_TILT1), k1 = E.inOutSine(x1), kz = E.inOutSine(seg(x1, 0.3, 1));
  const k2 = E.inOutSine(seg(t, 54.95, 56.35));
  const drift = seg(t, 51.6, T_TILT0) * 0.04;
  let zoom = lerp(CAM_STALL.zoom + drift, CAM_WIDE.zoom, kz);
  let cx = lerp(CAM_STALL.cx, CAM_WIDE.cx, k1), cy = lerp(CAM_STALL.cy - drift * 300, CAM_WIDE.cy, k1);
  zoom = lerp(zoom, CAM_WORK.zoom, k2) + 0.04 * seg(t, 56.35, 58.9);
  // adamı izler; kapı (x≈566) hep kadrajda kalır
  cx = lerp(cx, CAM_WORK.cx, k2) + 300 * E.inOutSine(seg(t, 56.55, 58.9)) * k2;
  cy = lerp(cy, CAM_WORK.cy, k2);
  // yarı-yol: zoom 1'in altına inmesin (kenar payı 60 px)
  return { zoom: Math.max(1.012, zoom), cx, cy };
}

// ---------------- bulutlar ----------------
function cloudSprite(key, s, seed) {
  return R.cached('s14:cloud' + key, s * 2.4, s * 1.3, (x) => R.cloud(x, s * 1.2, s * 0.85, s, seed, { lightAng: -2.0 }));
}

// ---------------- terazi ----------------
const PIV = [STALL.scaleX, STALL.top - 154], ARM = 122, HANG = 116;
// kefe olayları: (zaman, açı değişimi) — + sol kefe aşağı
const TIP = [[52.57, 0.15], [52.66, -0.15]];
function beamAngle(t) {
  let a = 0;
  for (const [t0, da] of TIP) if (t > t0) a += da * C.spring(t, t0, 2.2, 4.2);
  return a + Math.sin(t * 1.7) * 0.006;
}
function panPos(t, side) { // side -1 sol, +1 sağ
  const a = beamAngle(t);
  const ex = PIV[0] + side * ARM * Math.cos(a), ey = PIV[1] - side * ARM * Math.sin(a);
  return { ex, ey, x: ex, y: ey + HANG };
}
function drawScale(ctx, t) {
  const brass = '#C98B2E', brassD = '#7A4E17', brassL = '#F2C66A';
  // ayak ve sütun
  P.toneShape(ctx, P.roundRectPts(PIV[0] - 46, STALL.top - 16, 92, 18, 6), { base: brass, dark: brassD, light: brassL, seed: 1451, shadowW: 0.3, dabs: 1, rimW: 2 });
  P.toneShape(ctx, P.roundRectPts(PIV[0] - 7, PIV[1], 14, STALL.top - PIV[1] - 10, 5), { base: brass, dark: brassD, light: brassL, seed: 1452, shadowW: 0.4, dabs: 1, rim: false, strokeAng: Math.PI / 2 });
  // kefeler + zincirler
  for (const side of [-1, 1]) {
    const p = panPos(t, side);
    ctx.strokeStyle = rgba(brassD, 0.9); ctx.lineWidth = 2.2;
    for (const off of [-46, 0, 46]) { ctx.beginPath(); ctx.moveTo(p.ex, p.ey + 4); ctx.lineTo(p.x + off, p.y - 4); ctx.stroke(); }
    const bowl = P.smoothPts([[p.x - 54, p.y - 6], [p.x + 54, p.y - 6], [p.x + 40, p.y + 12], [p.x, p.y + 20], [p.x - 40, p.y + 12]], true, 6);
    P.toneShape(ctx, bowl, { base: brass, dark: brassD, light: brassL, seed: 1453 + side, shadowW: 0.3, lightW: 0.18, dabs: 2, rimW: 2, strokeAng: 0 });
    ctx.fillStyle = rgba(brassL, 0.8); ctx.fillRect(p.x - 50, p.y - 8, 100, 3);
  }
  // kol (beam)
  const a = beamAngle(t), c = Math.cos(a), s = Math.sin(a);
  const beam = [[-ARM - 8, -5], [ARM + 8, -5], [ARM + 8, 5], [-ARM - 8, 5]].map(([u, v]) => [PIV[0] + u * c + v * s, PIV[1] - u * s + v * c]);
  P.toneShape(ctx, beam, { base: brass, dark: brassD, light: brassL, seed: 1455, shadowW: 0.35, dabs: 1, rimW: 2, strokeAng: -a });
  P.toneShape(ctx, P.ellipsePts(PIV[0], PIV[1], 13, 13, 16), { base: brassL, dark: brass, light: '#FFF0B8', seed: 1456, rim: false, shadowW: 0.3, dabs: 0 });
  // tepe süsü (sütunun ucunda küçük pirinç topuz)
  P.toneShape(ctx, P.smoothPts([[PIV[0], PIV[1] - 40], [PIV[0] + 9, PIV[1] - 22], [PIV[0] + 6, PIV[1] - 12], [PIV[0] - 6, PIV[1] - 12], [PIV[0] - 9, PIV[1] - 22]], true, 5), { base: brass, dark: brassD, light: brassL, seed: 1457, rim: false, shadowW: 0.3, dabs: 0 });
}

// ---------------- tezgâhtaki mallar: ışık fidanı sandığı ----------------
function crate(ctx, t) {
  const x0 = 856, x1 = 932, y1 = STALL.top + 2, y0 = y1 - 50;
  for (const [i, sx] of [[0, 876], [1, 908]]) L.sapling(ctx, sx, y0 + 8, 60 + (i % 2) * 10, 1, t, 1460 + i, { glow: 0.8, leaves: 4 });
  P.toneShape(ctx, P.rectPts(x0, y0, x1 - x0, y1 - y0), { base: '#A8703F', dark: '#5A3424', light: '#D4A06A', seed: 1459, shadowW: 0.25, dabs: 2, rimW: 3, strokeAng: 0 });
  ctx.strokeStyle = rgba('#5A3424', 0.6); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 4, y0 + 27); ctx.lineTo(x1 - 4, y0 + 27); ctx.stroke();
}

// ---------------- adam (tezgâhta) ----------------
const SM = { x: 374, y: STALL.ground, h: 520 };
const ORB_R = 56;
// Takas koreografisi (yakın el, yerel h=1 hedefleri): [t, bilekX, bilekY, elAçısı(derece), kavrama]
// küreye uzanıp sikke alır → sol kefeye bırakır → avucunu açar, fidan avucuna uçar → fidanı sırttaki heybeye koyar → el iner
const HAND = [[51.0, 0.18, -0.64, 100, 0.25], [52.04, 0.18, -0.64, 100, 0.25], [52.2, 0.195, -0.71, 125, 0.65], [52.4, 0.3, -0.6, 150, 0.65],
  [52.47, 0.3, -0.6, 150, 0.1], [52.72, 0.27, -0.64, 96, 0.2], [53.02, 0.27, -0.64, 96, 0.4], [53.3, -0.06, -0.52, 20, 0.6], [53.38, -0.06, -0.52, 20, 0.2],
  [53.7, 0.02, -0.46, 6, 0.1], [60, 0.02, -0.46, 6, 0.1]];
function handKey(t) {
  let i = 0; while (i < HAND.length - 2 && t > HAND[i + 1][0]) i++;
  const A = HAND[i], B = HAND[i + 1], k = E.inOutSine(seg(t, A[0], B[0]));
  return [lerp(A[1], B[1], k), lerp(A[2], B[2], k), d(lerp(A[3], B[3], k)), lerp(A[4], B[4], k)];
}
function stallPose(t) {
  const br = Math.sin(t * 2.3);
  let p = M.pose({ torso: d(2) + d(0.6) * br, py: 0.001 * br, neck: d(6), head: d(12), armF: d(-3), elbowF: d(10), handF: d(4), eye: 0.95, brow: 0.6, mouth: 0.12 });
  const [hx, hy, ha, gr] = handKey(t);
  p = L.reach(p, [hx, hy], 'N', 1, ha);
  p.grip = gr;
  // bakış eli izler: kefe → fidan → heybe (omzunun üstünden); "burada"da ve sonda küçük baş selamı
  const lookPan = E.inOutSine(seg(t, 52.2, 52.42)) * (1 - E.inOutSine(seg(t, 52.95, 53.15)));
  const back = E.inOutSine(seg(t, 53.08, 53.28)) * (1 - E.inOutSine(seg(t, 53.36, 53.55)));
  const nod = Math.sin(Math.PI * seg(t, 52.0, 52.3)) + Math.sin(Math.PI * seg(t, 53.42, 53.78));
  p.head += d(6) * lookPan - d(10) * back + d(7) * nod; p.neck += d(3) * lookPan;
  p.torso -= d(2) * back;
  const smile = E.inOutSine(seg(t, 52.62, 52.95));
  p.mouth = 0.12 + 0.28 * smile;
  if (t > 53.92 && t < 54.0) p.eye = 0.1;
  return p;
}
function handTip(p) { const s = M.skeleton(p, SM.h); return M.toWorld(s.armN.tip, SM, s, p); }
// küre: avucun üstünde kendiliğinden süzülür (el serbest kalır)
function orbAt(t) { return { x: SM.x + 0.255 * SM.h, y: SM.y - 0.885 * SM.h + Math.sin(t * 2.1) * 4 }; }

// heybe: sırtta, kalçada; fidanlar ağzından çıkar. n = içindeki fidan sayısı (kesirli = biri yeni giriyor)
function bagCallbacks(h, n, t, seedBase) {
  const bag = (s) => { const c = [lerp(s.sh[0], s.hip[0], 0.62) - 0.092 * h, lerp(s.sh[1], s.hip[1], 0.62) + 0.01 * h]; return c; };
  return {
    behind: (ctx, s) => {
      const c = bag(s);
      // fidanlar (heybenin arkasından yukarı)
      for (let i = 0; i < Math.ceil(n - 1e-6); i++) {
        const g = clamp(n - i);
        L.sapling(ctx, c[0] - 0.02 * h + i * 0.032 * h, c[1] - 0.05 * h, 0.13 * h, E.outBack(g, 1.6), t, seedBase + i, { glow: 0.7, leaves: 3, lean: -0.15 + i * 0.12 });
      }
      const bw = 0.11 * h, bh = 0.125 * h;
      const pts = P.smoothPts([[c[0] - bw * 0.5, c[1] - bh * 0.42], [c[0] + bw * 0.42, c[1] - bh * 0.46], [c[0] + bw * 0.52, c[1] + bh * 0.2], [c[0] + bw * 0.36, c[1] + bh * 0.5], [c[0] - bw * 0.38, c[1] + bh * 0.5], [c[0] - bw * 0.56, c[1] + bh * 0.18]], true, 6);
      P.toneShape(ctx, pts, { base: '#3F6FA8', dark: '#28427A', light: '#6E9ED0', seed: 1470, rimW: Math.max(1.5, h * 0.004), shadowW: 0.2, texture: 0.35, dabs: 2, highlights: 1 });
      // kapak ve kilim şeridi
      const flap = [[c[0] - bw * 0.52, c[1] - bh * 0.44], [c[0] + bw * 0.44, c[1] - bh * 0.48], [c[0] + bw * 0.4, c[1] - bh * 0.02], [c[0] - bw * 0.48, c[1] + bh * 0.02]];
      P.toneShape(ctx, flap, { base: '#B8342E', dark: '#7A1E2A', light: '#D85A44', seed: 1471, rim: false, shadowW: 0.2, texture: 0.3, dabs: 0, highlights: 0 });
      ctx.strokeStyle = rgba('#F2D08A', 0.9); ctx.lineWidth = Math.max(1, h * 0.006);
      ctx.beginPath(); ctx.moveTo(c[0] - bw * 0.46, c[1] - bh * 0.12); ctx.lineTo(c[0] + bw * 0.4, c[1] - bh * 0.15); ctx.stroke();
    },
    mid: (ctx, s) => {
      const c = bag(s), a = [s.sh[0] + 0.012 * h, s.sh[1] - 0.012 * h], b = [c[0] + 0.03 * h, c[1] - 0.06 * h];
      ctx.strokeStyle = '#6B3E26'; ctx.lineWidth = Math.max(1.5, 0.012 * h); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(lerp(a[0], b[0], 0.5) + 0.05 * h, lerp(a[1], b[1], 0.5) + 0.02 * h, b[0], b[1]); ctx.stroke();
    },
  };
}
function bagWorld(p, o) { const s = M.skeleton(p, o.h); const c = [lerp(s.sh[0], s.hip[0], 0.62) - 0.092 * o.h, lerp(s.sh[1], s.hip[1], 0.62) - 0.04 * o.h]; return M.toWorld(c, o, s, p); }

// takas olayları
const COIN_T = { take: 52.18, drop: 52.45, land: 52.57, vanish: 52.62 };
const SAP1 = { sprout: 52.62, fly0: 52.8, fly1: 53.02, bag0: 53.28, bag1: 53.4 };
function arc(a, b, k, hgt) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - Math.sin(Math.PI * k) * hgt]; }

function drawStallScene(ctx, t, vBot) {
  drawScale(ctx, t);
  crate(ctx, t);
  stallActors(ctx, t);
}
function stallActors(ctx, t) {
  const p = stallPose(t);
  const ob = orbAt(t), tip = handTip(p);
  const nBag = seg(t, SAP1.bag0, SAP1.bag1);
  const cb = bagCallbacks(SM.h, nBag, t, 1480);
  const items = L.orbitItems(ob.x, ob.y, t, ORBIT, { rx: ORB_R * 1.75, ry: ORB_R * 0.42, tilt: -0.2, speed: 1.0, coinR: ORB_R * 0.2 });
  L.drawOrbitItems(ctx, items, t, 'back', { coinR: ORB_R * 0.2 });
  M.drawMan(ctx, p, Object.assign({ x: SM.x, y: SM.y, h: SM.h, light: -2.3 }, cb));
  L.drawOrb(ctx, ob.x, ob.y, ORB_R, t, { glow: 0.85, rays: 0.8, rayAlpha: 0.5 });
  L.drawOrbitItems(ctx, items, t, 'front', { coinR: ORB_R * 0.2, shadowOn: [ob.x, ob.y, ORB_R * 0.98] });
  // sikkeler: avuçta → kefeye düşer → parlayıp kaybolur
  const pan = panPos(t, -1);
  if (t > COIN_T.take && t < COIN_T.vanish + 0.18) {
    const vanish = seg(t, COIN_T.vanish, COIN_T.vanish + 0.16);
    for (let i = 0; i < 2; i++) {
      const target = [pan.x - 10 + i * 18, pan.y - 10 - i * 4];
      let pos;
      if (t < COIN_T.drop) pos = [tip[0] - 4 + i * 8, tip[1] - 6 - i * 3];
      else {
        const k = seg(t, COIN_T.drop + i * 0.03, COIN_T.land + i * 0.03), from = [tip[0] + i * 8, tip[1]];
        pos = [lerp(from[0], target[0], k), lerp(from[1], target[1], k * k)];
      }
      const born = seg(t, COIN_T.take, COIN_T.take + 0.08);
      ctx.save(); ctx.globalAlpha = (1 - vanish) * born;
      R.coin(ctx, pos[0], pos[1], 12, { squash: t < COIN_T.drop ? 0.4 : Math.cos(t * 16 + i), seed: 1490 + i });
      ctx.restore();
      if (vanish > 0) { P.glow(ctx, pos[0], pos[1], 50, '#FFF0B0', 0.8 * Math.sin(Math.PI * vanish)); R.sparkle(ctx, pos[0], pos[1] - 6, 22 * Math.sin(Math.PI * vanish), 1, '#FFFBEA'); }
    }
    if (t > COIN_T.take && t < COIN_T.take + 0.2) R.sparkle(ctx, tip[0] + 6, tip[1] - 14, 16 * Math.sin(Math.PI * seg(t, COIN_T.take, COIN_T.take + 0.2)), 1, '#FFFBEA');
  }
  // fidan: sağ kefede doğar → avuca uçar → elde heybeye taşınır
  const S = SAP1, g = seg(t, S.sprout, S.sprout + 0.28);
  if (g > 0 && t < S.bag1) {
    const rp = panPos(t, 1);
    let pos, sz;
    if (t < S.fly0) { pos = [rp.x, rp.y - 6]; sz = 66; }
    else if (t < S.fly1) { const f = E.inOutSine(seg(t, S.fly0, S.fly1)); pos = arc([rp.x, rp.y - 6], [tip[0], tip[1] - 2], f, 120); sz = lerp(66, 54, f); }
    else { pos = [tip[0], tip[1] - 2]; sz = lerp(54, 40, seg(t, S.bag0, S.bag1)); }
    L.sapling(ctx, pos[0], pos[1], sz, E.outBack(g, 1.8), t, 1480, { glow: 1, leaves: 4 });
    if (g < 1) { P.glow(ctx, rp.x, rp.y - 20, 110, '#FFF4C8', 0.7 * (1 - g)); R.sparkles(ctx, rp.x, rp.y - 30, 40, 5, t, 1495, { rise: 20 }); }
  }
}
const ORBIT = L.makeOrbit(7, 1465, 1);

// ---------------- adam (yolda, uzak plan): yürür ve fidan diker ----------------
const WM = { y: 1340, h: 345, S: 0.32 };
const D0 = 0.731;
// faz: [t0, t1, u0, u1, kolaylık]
const SEGS = [[54.75, 56.12, -1.62, 0.08, 'io'], [56.12, 56.75, 0.08, 0.08, 'hold'], [56.75, 57.3, 0.08, 1.08, 'io'], [57.3, 57.86, 1.08, 1.08, 'hold'], [57.86, 59.3, 1.08, 3.0, 'in']];
// dikiş: heybeden fidanı alır (t0), çömelip toprağa bastırır (rel, "çalışmak" 56.34), fidan kök salar ve ışık akar (pop), doğrulur (t1)
const PLANTS = [{ t0: 56.12, rel: 56.36, pop: 56.38, t1: 56.75 }, { t0: 57.3, rel: 57.52, pop: 57.54, t1: 57.86 }];
function phaseU(t) {
  if (t <= SEGS[0][0]) return SEGS[0][2];
  for (const [a, b, u0, u1, k] of SEGS) {
    if (t > b) continue;
    const x = (t - a) / (b - a);
    const e = k === 'io' ? E.inOutSine(x) : k === 'in' ? (x < 0.35 ? (x * x) / (2 * 0.35) / (1 - 0.35 / 2) : (x - 0.35 / 2) / (1 - 0.35 / 2)) : 0;
    return lerp(u0, u1, e);
  }
  return SEGS[SEGS.length - 1][3];
}
function bendK(t) { let b = 0; for (const pl of PLANTS) b = Math.max(b, E.inOutSine(seg(t, pl.t0 - 0.02, pl.rel - 0.02)) * (1 - E.inOutSine(seg(t, pl.t1 - 0.24, pl.t1 + 0.02)))); return b; }
function walkerState(t) {
  const u = phaseU(t);
  const D = D0 + 2 * WM.S * u;
  const legs = L.steadyLegs(u, WM.S, D0);
  const b = bendK(t);
  const moving = SEGS.some(([a, bb, u0, u1]) => t > a && t < bb && u1 !== u0) ? 1 : 0;
  const r = L.evalWalker({ D, legs, lean: d(4) * moving, legOpts: { lift: 0.05 }, hipDrop: 0.22 * b, armAmp: d(22) * (1 - b) });
  let p = r.pose;
  if (b > 0) {
    p = Object.assign({}, p, { torso: lerp(p.torso, d(66), b), neck: lerp(p.neck, d(4), b), head: lerp(p.head, d(16), b), armF: lerp(p.armF, d(24), b), elbowF: lerp(p.elbowF, d(30), b) });
    p = L.reach(p, [0.4, -0.075], 'N', b, d(176));
    p.grip = 0.55 * b;
  }
  // bahçeye bakış (yürürken başını kaldırır)
  const up = E.inOutSine(seg(t, 55.3, 55.8)) * (1 - E.inOutSine(seg(t, 56.1, 56.35)));
  p.head -= d(16) * up; p.neck -= d(6) * up;
  return { p, x: D * WM.h, b };
}
function tipAt(t) { const st = walkerState(t), s0 = M.skeleton(st.p, WM.h); return M.toWorld(s0.armN.tip, { x: st.x, y: WM.y, h: WM.h }, s0, st.p); }
const PLANT_XY = PLANTS.map((pl) => [tipAt(pl.rel)[0], WM.y + 0.04 * WM.h]);
function plantPos(i) { return PLANT_XY[i]; }
const PLANT_U = [0, 1].map((i) => { const pp = plantPos(i); return Wd.roadParamNear(pp[0], pp[1] - 0.07 * WM.h, 0.55, 0.75); });

// ---------------- ışık akışı: fidandan bahçeye ----------------
const FLOW_V = 0.3; // yol parametresi / sn
function streamFront(i, t) { const pl = PLANTS[i]; return PLANT_U[i] + Math.max(0, t - pl.pop - 0.1) * FLOW_V; }
function arrival(i) { return PLANTS[i].pop + 0.1 + (1 - PLANT_U[i]) / FLOW_V; }
function drawStream(ctx, i, t) {
  const pl = PLANTS[i]; if (t < pl.pop + 0.1) return;
  const u0 = PLANT_U[i], uf = Math.min(1, streamFront(i, t));
  // yol üstünde ışıyan iz
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    const n = Math.max(2, Math.round((uf - u0) * 400));
    for (let k = 0; k <= n; k++) { const q = Wd.roadAt(lerp(u0, uf, k / n)); if (k === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); }
    ctx.strokeStyle = pass === 0 ? rgba('#FFC861', 0.4) : rgba('#FFF4C8', 0.7);
    ctx.lineWidth = pass === 0 ? 18 : 5; ctx.stroke();
  }
  ctx.restore();
  // akan parçacıklar
  const span = 1 - u0, N = 40, du = span / N, run = (t - pl.pop - 0.1) * FLOW_V;
  const rr = rng(1570 + i);
  for (let j = 0; j < N; j++) {
    const jit = rr.range(-0.4, 0.4) * du, szk = rr.range(0.5, 1.25), off = rr.range(-0.28, 0.28), sp = rr.range(0.9, 1.15);
    const along = run * sp - j * du + jit;
    if (along < 0) continue;
    const u = u0 + (along % span);
    if (u > uf + 1e-6) continue;
    const q = Wd.roadAt(u), sz = Math.max(1.4, q.w * 0.07 * szk);
    const px = q.x - q.ty * off * q.w, py = q.y + q.tx * off * q.w;
    P.glow(ctx, px, py, sz * 5, '#FFE7A0', 0.5);
    ctx.fillStyle = rgba('#FFFBEA', 0.95); ctx.beginPath(); ctx.ellipse(px, py, sz * 1.5, sz, Math.atan2(q.ty, q.tx), 0, TAU); ctx.fill();
  }
  // ön uç: parlak baş
  if (uf < 1) { const q = Wd.roadAt(uf), sz = Math.max(2.5, q.w * 0.14); P.glow(ctx, q.x, q.y, sz * 7, '#FFF0B8', 0.8); R.sparkle(ctx, q.x, q.y, sz * 3, 1, '#FFFBEA'); }
}

// ---------------- bahçe: kapı, çiçekler, güvercinler ----------------
const BLOOMS = (() => { const r = rng(1520), out = []; for (let i = 0; i < 18; i++) out.push({ x: GATE.x + r.range(-170, 170), y: GATE.y - r.range(20, 110), t0: 55.2 + r.range(0, 0.55), c: r.pick(['#FFFFFF', '#FBD3E4', '#FFE9A8', '#F6A9C8']), s: r.range(4, 7) }); return out; })();
const DOVES = (() => { const r = rng(1530), out = []; for (let i = 0; i < 5; i++) out.push({ ph: r.range(0, TAU), rx: r.range(160, 260), ry: r.range(40, 70), cy: GATE.y - r.range(110, 210), sp: r.range(0.7, 1.0) * r.sign(), fl: r.range(9, 12), s: r.range(15, 19), t0: 55.12 + i * 0.07 }); return out; })();
function dove(ctx, x, y, s, flap, dir) {
  // sade beyaz güvercin silueti: geniş açılan kanatlar (M biçimi) + gövde + kuyruk; çırpışta kanat ucu iner-kalkar
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const w = Math.sin(flap), tipY = -s * 1.15 * w, midY = -s * 0.35 * w;
  ctx.fillStyle = '#C9C2E2';
  ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.05); ctx.quadraticCurveTo(-s * 0.7, midY - s * 0.25, -s * 1.5, tipY * 0.9 - s * 0.05); ctx.quadraticCurveTo(-s * 0.7, midY + s * 0.25, s * 0.15, s * 0.12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.05); ctx.quadraticCurveTo(s * 0.5, midY - s * 0.3, s * 1.3, tipY - s * 0.1); ctx.quadraticCurveTo(s * 0.55, midY + s * 0.28, s * 0.2, s * 0.14); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, s * 0.05, s * 0.75, s * 0.24, -0.08, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.72, -s * 0.06, s * 0.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * 0.6, s * 0.05); ctx.lineTo(-s * 1.05, -s * 0.08); ctx.lineTo(-s * 1.0, s * 0.24); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#E8B04A'; ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 0.1); ctx.lineTo(s * 1.08, -s * 0.03); ctx.lineTo(s * 0.9, s * 0.0); ctx.fill();
  ctx.restore();
}
function gateGlow(t) {
  let g = 0.72 + 0.55 * E.inOutSine(seg(t, 55.12, 55.85)) + 0.04 * Math.sin(t * 2.2);
  for (let i = 0; i < PLANTS.length; i++) { const ta = arrival(i); if (t > ta) g += 0.45 * Math.exp(-(t - ta) * 2.5); }
  return g;
}
function drawGarden(ctx, t) {
  const g = gateGlow(t);
  P.glow(ctx, GATE.x, GATE.y - 80, 520, '#FFE3A0', 0.3 * g);
  R.gardenGate(ctx, GATE.x, GATE.y, GATE.s, Math.min(1.4, g), t);
  // çiçeklenme
  for (const b of BLOOMS) {
    const k = C.pop(t, b.t0, 0.4, 2.2); if (k <= 0) continue;
    ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(b.x, b.y, b.s * k, 0, TAU); ctx.fill();
    if (t - b.t0 < 0.5) R.sparkle(ctx, b.x, b.y, b.s * 2.4 * Math.sin(Math.PI * clamp((t - b.t0) / 0.5)), 0.9, '#FFFBEA');
  }
  R.sparkles(ctx, GATE.x, GATE.y - 90, 170, 10, t, 1540, { rise: 30, alpha: clamp(g - 0.6) });
  // güvercinler
  for (const q of DOVES) {
    const a = C.E.outCubic(seg(t, q.t0, q.t0 + 0.9));
    if (a <= 0) continue;
    const ang = q.ph + t * q.sp;
    const x = GATE.x + Math.cos(ang) * q.rx, y = q.cy + Math.sin(ang) * q.ry - (1 - a) * 60;
    const dir = (q.sp > 0 ? -Math.sin(ang) : Math.sin(ang)) > 0 ? 1 : -1;
    ctx.save(); ctx.globalAlpha = a; dove(ctx, x, y, q.s, t * q.fl + q.ph, dir); ctx.restore();
  }
}

module.exports = {
  _walker: walkerState, _WM: WM,
  draw(ctx, t, lt) {
    const c = cam(t);
    const [bx, by] = R.breathe(t, 3, 14);
    R.camera(ctx, { zoom: c.zoom, cx: c.cx + bx, cy: c.cy + by });
    ctx.drawImage(Wd.worldCanvas(), -Wd.OX, -Wd.OY);
    // bulutlar
    ctx.drawImage(cloudSprite('a', 150, 1501), 60 + t * 7 - 400, 170);
    ctx.drawImage(cloudSprite('b', 110, 1502), 700 + t * 5 - 280, 330);
    ctx.drawImage(cloudSprite('c', 80, 1503), 300 + t * 6 - 330, 420);
    // bahçe ve kapı (yalnız görünürken)
    const vTop = c.cy - 960 / c.zoom, vBot = c.cy + 960 / c.zoom;
    if (vTop < 900) drawGarden(ctx, t);
    // ışık akışları
    for (let i = 0; i < PLANTS.length; i++) drawStream(ctx, i, t);
    // yoldaki adam ve diktiği fidanlar
    if (vTop < 1500 && t > 54.6) {
      for (let i = 0; i < PLANTS.length; i++) {
        const pl = PLANTS[i], g = seg(t, pl.rel, pl.pop + 0.45);
        // elde taşınan fidan: heybeden çıkar, toprağa bastırılır
        if (t > pl.t0 + 0.04 && t < pl.rel) {
          const tp = tipAt(t), pp = plantPos(i), k = E.inOutSine(seg(t, pl.rel - 0.08, pl.rel));
          L.sapling(ctx, lerp(tp[0], pp[0], k), lerp(tp[1] + 4, pp[1], k), 0.24 * WM.h, E.outBack(seg(t, pl.t0 + 0.04, pl.t0 + 0.2), 1.6), t, 1550 + i, { glow: 0.9, leaves: 4 });
        }
        if (g <= 0) continue;
        const pp = plantPos(i);
        L.sapling(ctx, pp[0], pp[1], lerp(0.24, 0.32, E.outBack(g, 1.6)) * WM.h, 1, t, 1550 + i, { glow: 1, leaves: 4 });
        if (g < 1) {
          P.glow(ctx, pp[0], pp[1] - 20, 110, '#FFF4C8', 0.9 * (1 - g));
          ctx.save(); ctx.strokeStyle = rgba(L.GOLD_L, 0.85 * (1 - g)); ctx.lineWidth = 6 * (1 - g) + 1.5;
          ctx.beginPath(); ctx.ellipse(pp[0], pp[1], 20 + 90 * E.outCubic(g), 6 + 26 * E.outCubic(g), 0, 0, TAU); ctx.stroke(); ctx.restore();
          R.sparkles(ctx, pp[0], pp[1] - 40, 40, 5, t * 1.4, 1556 + i, { rise: 30, scale: 0.8 });
        }
      }
      const st = walkerState(t);
      const nLeft = 2 - seg(t, PLANTS[0].t0, PLANTS[0].t0 + 0.06) - seg(t, PLANTS[1].t0, PLANTS[1].t0 + 0.06);
      const o = Object.assign({ x: st.x, y: WM.y, h: WM.h, light: -2.3 }, bagCallbacks(WM.h, nLeft, t, 1560));
      ctx.save(); ctx.fillStyle = rgba('#5A4A3A', 0.25); ctx.beginPath(); ctx.ellipse(st.x + 0.03 * WM.h, WM.y + 3, 0.18 * WM.h, 0.026 * WM.h, 0, 0, TAU); ctx.fill(); ctx.restore();
      M.drawMan(ctx, st.p, o);
      // dikerken avuçtaki ışık
      if (st.b > 0.5) { const s = M.skeleton(st.p, WM.h), tip = M.toWorld(s.armN.tip, o, s, st.p); P.glow(ctx, tip[0], tip[1], 30, '#FFF0B0', 0.7 * (st.b - 0.5) * 2); }
    }
    // tezgâh sahnesi (görünürken)
    if (vBot > 1980) drawStallScene(ctx, t, vBot);
  },
  sfx: [
    { t: 52.42, type: 'coin', gain: 0.3 }, { t: 52.74, type: 'coin', gain: 0.28 },
    { t: 52.97, type: 'sparkle', gain: 0.3 },
    { t: 53.7, type: 'whoosh', gain: 0.22 },
    { t: 55.16, type: 'chime', gain: 0.3 }, { t: 55.3, type: 'birds', gain: 0.22 },
    { t: 56.4, type: 'rustle', gain: 0.22 }, { t: 56.5, type: 'sparkle', gain: 0.22 },
    { t: 57.36, type: 'sparkle', gain: 0.2 },
  ],
};
