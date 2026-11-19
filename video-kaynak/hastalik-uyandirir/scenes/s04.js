// S04 — "ve gençlerin ihtiyarlaşması" (9.90–12.50 sn; s03'ten çözülme 9.65'te başlar, s05'e boya geçişi 12.2–12.8)
// Yandan yakın plan: adam yerinde yürür (dünya kayar, ayak izleri yere sabit: kayma yok). "gençlerin" (10.36): genç, dik,
// dinç adımlar; bahar yaprakları rüzgârla savrulur. "ihtiyarlaşması" (11.00–11.86): saç-sakal ağarır (age 0→1), sırtı
// kamburlaşır, adımları kısalır ve yavaşlar, ~11.45'te eline baston gelir ve yere basar. Arkada mevsimler, yürüdüğü yönden
// gelen yırtık kenarlı boya cepheleriyle döner: bahar → yaz (10.44) → güz (10.98, yapraklar uçuşur) → kış (11.50, kar).
// Katmanlar paralaksla kayar: gök 0, dağlar 0.08, tepeler 0.3, büyük ağaçlar 0.62, yol 1, ön otlar 1.35.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const Wk = require('./_s02_walk');
const S = require('./_s02_seasons');
const X = require('./_s02_props');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, seg, deg } = C;

const HM = 900, FOOT_Y = 1396, MAN_SX = 420;
const LIGHT = -2.3;

// ---------- yaşlanma, adım ve tempo ----------
const ageAt = (t) => E.inOutSine(seg(t, 10.98, 11.86));
const strideAt = (t) => lerp(0.335, 0.19, ageAt(t));      // adım uzunluğu (boy oranı, ayak başına)
const cadAt = (t) => lerp(1.0, 0.68, ageAt(t));            // döngü/sn (iki adım)
// tablo: faz u(t) ve kalça D(t) (boy birimi). D, u'nun sabit bir fonksiyonu → ayak izleri (orta basmadaki kalça) dünyada sabit.
const TA = 9.2, TB = 13.4, DT = 1 / 600;
const TAB = (() => {
  const n = Math.ceil((TB - TA) / DT);
  const U = new Float64Array(n + 1), D = new Float64Array(n + 1);
  U[0] = 2.18; D[0] = 0;
  for (let i = 0; i < n; i++) {
    const t = TA + (i + 0.5) * DT, c = cadAt(t);
    U[i + 1] = U[i] + c * DT;
    D[i + 1] = D[i] + 2 * strideAt(t) * c * DT;
  }
  return { n, U, D };
})();
function atT(arr, t) { const x = clamp((t - TA) / DT, 0, TAB.n - 1e-9), i = Math.floor(x), k = x - i; return arr[i] + (arr[i + 1] - arr[i]) * k; }
const uAt = (t) => atT(TAB.U, t), DAt = (t) => atT(TAB.D, t);
function DofU(u) {
  const U = TAB.U, D = TAB.D, n = TAB.n;
  if (u <= U[0]) return D[0] + (u - U[0]) * (D[1] - D[0]) / (U[1] - U[0]);
  if (u >= U[n]) return D[n] + (u - U[n]) * (D[n] - D[n - 1]) / (U[n] - U[n - 1]);
  let lo = 0, hi = n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (U[m] <= u) lo = m; else hi = m; }
  return D[lo] + (D[hi] - D[lo]) * (u - U[lo]) / (U[hi] - U[lo]);
}
const Xm = (t) => DAt(t) * HM;
function tOfU(u) {
  const U = TAB.U; let lo = 0, hi = TAB.n;
  if (u <= U[0]) return TA; if (u >= U[hi]) return TB;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (U[m] <= u) lo = m; else hi = m; }
  return TA + (lo + (u - U[lo]) / (U[hi] - U[lo])) * DT;
}
// karda ayak izleri: kıştan sonra basılan her adımın izi yerde kalır (dünyaya sabit)
function drawPrints(ctx, t) {
  const u = uAt(t), k0 = Math.floor(uAt(11.5)) - 1;
  for (let k = k0; k <= Math.floor(u) + 1; k++) {
    for (const [uk, fp, dy] of [[k, DofU(k + 0.3), 5], [k - 0.5, DofU(k - 0.2), -5]]) {
      if (uk > u) continue;
      const tl = tOfU(uk);
      if (tl < 11.4) continue;
      const x = MAN_SX + fp * HM + 0.045 * HM, y = FOOT_Y + dy, a = clamp((t - tl) / 0.12);
      ctx.fillStyle = rgba('#97A0CC', 0.5 * a); ctx.beginPath(); ctx.ellipse(x, y, 0.062 * HM, 8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba('#FFFFFF', 0.7 * a); ctx.beginPath(); ctx.ellipse(x + 4, y + 6, 0.06 * HM, 3, 0, 0, Math.PI); ctx.fill();
    }
  }
}   // adamın dünya ilerlemesi (px)
function legsAt(t) {
  const u = uAt(t);
  const kN = Math.floor(u), lN = u - kN;
  const uF = u + 0.5, kF = Math.floor(uF), lF = uF - kF;
  return {
    u, D: DAt(t),
    legs: [{ loc: lN, fpA: DofU(kN + 0.3), fpB: DofU(kN + 1.3) }, { loc: lF, fpA: DofU(kF - 0.2), fpB: DofU(kF + 0.8) }],
  };
}
// baston: uzak bacağın bir basma başlangıcına denk gelecek biçimde uzar (ucu tam o anda yere değer)
const CANE = (() => {
  let tl = 11.42;
  for (let t = 11.38; t < 11.9; t += 0.002) { const a = uAt(t) + 0.5, b = uAt(t + 0.002) + 0.5; if (Math.floor(b) > Math.floor(a)) { tl = t + 0.002; break; } }
  return { land: tl, t0: tl - 0.3, arm0: tl - 0.42, arm1: tl - 0.12 };
})();

function manState(t) {
  const a = ageAt(t);
  const { D, legs } = legsAt(t);
  const lo = { lift: lerp(0.05, 0.028, a), heelStrike: deg(lerp(12, 4, a)), toeOff: deg(lerp(32, 13, a)), heelRiseStart: lerp(0.6, 0.7, a) };
  const r = Wk.evalWalker({ D, legs, age: a, legOpts: lo, armAmp: deg(lerp(26, 8, a)), lean: deg(lerp(2, 6, a)), ext: lerp(0.99, 0.958, a) });
  let p = r.pose, stick = null;
  const armK = E.inOutSine(seg(t, CANE.arm0, CANE.arm1));
  if (armK > 0) {
    const tip = Wk.stickTip(legs[1], 0.2, 0.032);
    const hs = Wk.holdStick(p, [tip[0] - D, tip[1]], 0.43, 'N', armK);
    p = hs.pose;
    stick = { tip: hs.tip, grip: hs.grip, dir: hs.dir, k: (t - CANE.t0) / (CANE.land - CANE.t0) };
  }
  // yaşlıda serbest (uzak) kol hafifçe geride sarkar
  p.armF -= deg(9) * a; p.elbowF += deg(8) * a;
  // ifade: genç gülümser, başı dik; yaşlı sakin, gözleri biraz kısık
  p.mouth = lerp(0.32, 0.04, a);
  p.brow = lerp(-0.12, 0.22, a);
  const blink = (t > 10.66 && t < 10.73) || (t > 12.18 && t < 12.27);
  p.eye = blink ? 0.08 : lerp(1, 0.8, a);
  p.head = p.head - deg(3) * (1 - a);
  return { p, D, legs, a, stick };
}

// ---------- mevsimler ----------
const TR = [{ a: 10.4, b: 10.8, seed: 3 }, { a: 10.95, b: 11.38, seed: 7 }, { a: 11.47, b: 11.9, seed: 11 }];
function seasonAt(t) {
  for (let k = 0; k < TR.length; k++) {
    if (t < TR[k].a) return { s: k, n: k, p: 0 };
    if (t < TR[k].b) return { s: k, n: k + 1, p: (t - TR[k].a) / (TR[k].b - TR[k].a), seed: TR[k].seed };
  }
  return { s: 3, n: 3, p: 0 };
}
// sürekli mevsim değeri (0..3): güneş, ışık tonu gibi yumuşak geçen şeyler için
function seasonF(t) { let f = 0; for (const tr of TR) f += E.inOutSine(seg(t, tr.a, tr.b)); return f; }

// büyük ağaçlar: 10.36'da (gençlerin) çiçekli ağaç adamın sağ arkasında
const TREES = (() => {
  const f = 0.62, xa = 640 + f * Xm(10.36);
  return [-1, 0, 1, 2].map((k) => ({ wx: xa + k * 830, kind: (k + 4) % 2 }));
})();

// ---------- çizim yardımcıları ----------
function layer(ctx, f, xm, fn) { ctx.save(); ctx.translate(-f * xm, 0); fn(); ctx.restore(); }
function seasonal(ctx, st, front, fn) {
  fn(st.s);
  if (st.p > 0) { ctx.save(); S.clipScreen(ctx, front); fn(st.n); ctx.restore(); }
}
let _tmp = null;
function tmpCanvas() { if (!_tmp) _tmp = require('@napi-rs/canvas').createCanvas(C.W, C.H); return _tmp; }
function cloudSprite(k, s, seed) { return X.sprite('s04:cloud' + k, s * 2.6, s * 1.5, s * 1.3, s * 0.95, (x) => R.cloud(x, s * 1.3, s * 0.95, s, seed, { lightAng: -2.0 })); }

function drawCane(ctx, st, h) {
  const sk = st.stick;
  if (!sk || sk.k <= 0) return;
  const tip = [sk.tip[0] * h, sk.tip[1] * h], g = [sk.grip[0] * h, sk.grip[1] * h];
  const top = [g[0] + sk.dir[0] * 0.035 * h, g[1] + sk.dir[1] * 0.035 * h];
  const k = E.outCubic(clamp(sk.k));
  const end = [lerp(top[0], tip[0], k), Math.min(0, lerp(top[1], tip[1], k))];
  const cap = M.capsule(end, top, 0.014 * h, 0.017 * h, 4);
  M.partShade(ctx, cap, '#7A4A2A', '#4E2C18', '#B07A48', LIGHT, 0.4);
  // sap (öne kıvrık)
  const ang = Math.atan2(sk.dir[1], sk.dir[0]);
  const c = [top[0] + Math.cos(ang + Math.PI / 2) * -0.028 * h, top[1] + Math.sin(ang + Math.PI / 2) * -0.028 * h];
  ctx.strokeStyle = '#6E4226'; ctx.lineWidth = 0.017 * h; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(c[0], c[1], 0.028 * h, ang + Math.PI * 0.5 + Math.PI, ang + Math.PI * 0.5 + Math.PI * 1.9); ctx.stroke();
  ctx.strokeStyle = rgba('#C08A56', 0.8); ctx.lineWidth = 0.005 * h;
  ctx.beginPath(); ctx.arc(c[0], c[1], 0.031 * h, ang + Math.PI * 1.6, ang + Math.PI * 2.1); ctx.stroke();
  // belirme parıltısı (uç yere değerken)
  if (sk.k < 1.45 && sk.k > 0.8) {
    const q = (sk.k - 0.8) / 0.65;
    for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.7; R.sparkle(ctx, end[0] + Math.cos(a) * 0.05 * h * (0.6 + q), end[1] - 0.01 * h + Math.sin(a) * 0.04 * h * (0.6 + q), 0.016 * h * Math.sin(Math.PI * q), Math.sin(Math.PI * q), '#FFF6D6'); }
  }
}

function drawSky(ctx, i, t, sf) {
  ctx.drawImage(S.skyCanvas(i), -40, -30);
  // güneş: mevsimle alçalır ve solar (yumuşak)
  const sy = lerp(300, 236, clamp(sf)) + 150 * clamp(sf - 1) + 90 * clamp(sf - 2);
  const sx = 190 + 30 * clamp(sf - 1);
  const w = clamp(sf - 2);
  const disk = mix(mix('#FFF3C4', '#FFE2A8', clamp(sf - 1)), '#F6F4EE', w), ring = mix(mix('#F6D23A', '#F4A23A', clamp(sf - 1)), '#E6E2D6', w), glow = mix('#FFE9A0', '#E8ECFF', w);
  R.sun(ctx, sx, sy, 74, t * 0.6, { disk, ring, glow, seed: 4 });
  // bulutlar
  const cl = [['a', 120, 3, 760, 330, 34], ['b', 80, 8, 280, 600, 22], ['c', 96, 12, 1120, 520, 28]];
  for (const [key, s, seed, x0, y0, v] of cl) {
    const xx = ((x0 - v * (t - 9) - 0.03 * Xm(t)) % 1500 + 1500) % 1500 - 260;
    X.put(ctx, cloudSprite(key, s, seed), xx, y0);
  }
  // kışa doğru gök biraz örtülür
  const ov = clamp(sf - 2.2);
  if (ov > 0) { ctx.save(); ctx.globalAlpha = 0.18 * ov; ctx.fillStyle = '#C8CEE6'; ctx.fillRect(-60, -60, C.W + 120, 1300); ctx.restore(); }
}

module.exports = {
  _dbg: { manState, legsAt, Xm, DofU, uAt, CANE, ageAt, HM, FOOT_Y, MAN_SX },
  init() {
    for (let i = 0; i < 4; i++) { S.skyCanvas(i); S.farCanvas(i); S.midCanvas(i); S.groundCanvas(i); S.fgCanvas(i); S.bigTree(i, 0); S.bigTree(i, 1); }
  },
  draw(ctx, t) {
    const xm = Xm(t);
    const st = seasonAt(t), sf = seasonF(t);
    const front = st.p > 0 ? S.frontPath(st.p, st.seed) : null;
    // kamera: göğüs hizası sabit kalacak biçimde yavaş itme
    const z = 1 + 0.03 * E.inOutSine(seg(t, 9.65, 10.6)) + 0.045 * E.inOutSine(seg(t, 10.95, 12.5));
    const qx = MAN_SX + 40, qy = 930;
    const [bx, by] = R.breathe(t, 2.5, 6);
    R.camera(ctx, { zoom: z, cx: qx - (qx - 540) / z + bx, cy: qy - (qy - 960) / z + by });

    // mevsime bağlı bütün dünya: önce eski mevsim tam, sonra yeni mevsim cephe içinde (saydam katmanlar da doğru örtülür)
    const world = (i) => {
      drawSky(ctx, i, t, sf);
      layer(ctx, 0.08, xm, () => ctx.drawImage(S.farCanvas(i), S.FAR.x0, S.FAR.y0));
      layer(ctx, 0.3, xm, () => ctx.drawImage(S.midCanvas(i), S.MID.x0, S.MID.y0));
      layer(ctx, 0.62, xm, () => {
        const sway = Math.sin(t * 1.4) * 0.006 * (i === 3 ? 0.4 : 1);
        for (const T of TREES) {
          const sx = T.wx - 0.62 * xm;
          if (sx < -420 || sx > C.W + 420) continue;
          X.put(ctx, S.bigTree(i, T.kind), T.wx, 1282, 1, sway);
        }
      });
      layer(ctx, 1, xm, () => { ctx.drawImage(S.groundCanvas(i), S.GR.x0, S.GR.y0); if (i === 3) drawPrints(ctx, t); });
    };
    seasonal(ctx, st, front, world);

    // arka parçacıklar (adamın arkasında)
    const m = ctx.getTransform();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const aPet = C.win(t, 9.3, 10.92, 0.2, 0.36), aLeaf = C.win(t, 11.0, 12.05, 0.25, 0.35), aSnow = E.smooth(seg(t, 11.5, 11.9));
    S.petals(ctx, t, aPet, { n: 34 });
    S.leaves(ctx, t, aLeaf, { n: 40 });
    S.snow(ctx, t, aSnow, { n: 150 });
    ctx.restore(); ctx.setTransform(m);

    // adam
    const ms = manState(t);
    const wx = MAN_SX + xm;
    layer(ctx, 1, xm, () => {
      ctx.fillStyle = rgba(st.n === 3 && st.p > 0.5 || st.s === 3 ? '#6A72A8' : '#3A2A4A', 0.22);
      ctx.beginPath(); ctx.ellipse(wx + 6, FOOT_Y + 4, HM * 0.15, 11, 0, 0, TAU); ctx.fill();
      M.drawMan(ctx, ms.p, { x: wx, y: FOOT_Y, h: HM, age: ms.a, light: LIGHT, mid: (c, s, h) => drawCane(c, ms, h) });
    });
    // kışın nefes buharı: her ~1.2 sn'de bir soluk; ağızdan öne doğru büyüyüp söner
    const aB = clamp((sf - 2.2) * 1.4);
    if (aB > 0) {
      const s = M.skeleton(ms.p, HM);
      const hc = [wx + s.headC[0] + 0.075 * HM, FOOT_Y + s.headC[1] + 0.04 * HM];
      layer(ctx, 1, xm, () => {
        for (let j = -1; j <= 0; j++) {
          const cyc = Math.floor(t / 1.2) + j, k = (t - cyc * 1.2) / 0.95;
          if (k < 0 || k > 1) continue;
          const a = Math.sin(Math.PI * Math.pow(k, 0.7)) * 0.62 * aB, px = hc[0] + 10 + k * 70, py = hc[1] - k * 26;
          ctx.fillStyle = rgba('#FFFFFF', a);
          ctx.beginPath(); ctx.ellipse(px, py, 8 + k * 26, 6 + k * 14, -0.2, 0, TAU); ctx.fill();
          ctx.fillStyle = rgba('#F4F6FF', a * 0.7);
          ctx.beginPath(); ctx.ellipse(px + 12 + k * 14, py - 6 - k * 6, 5 + k * 16, 4 + k * 10, -0.2, 0, TAU); ctx.fill();
        }
      });
    }
    // ön otlar (f=1.35)
    const fg = (c, i) => { c.save(); c.translate(-1.35 * xm, 0); c.drawImage(S.fgCanvas(i), S.FG.x0, S.FG.y0); c.restore(); };
    if (st.p > 0) {
      // eski ön otları geçici tuvale çiz, cephe bölgesini sil, bas; yeniyi cephe içinde çiz
      const T = tmpCanvas(), tx = T.getContext('2d');
      tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, C.W, C.H);
      tx.setTransform(ctx.getTransform()); fg(tx, st.s);
      tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'destination-out'; tx.fillStyle = '#000'; tx.fill(front); tx.globalCompositeOperation = 'source-over';
      const mm = ctx.getTransform(); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(T, 0, 0); ctx.restore(); ctx.setTransform(mm);
      ctx.save(); S.clipScreen(ctx, front); fg(ctx, st.n); ctx.restore();
    } else fg(ctx, st.s);
    // ön parçacıklar + "gençlerin" rüzgârı (bahar yaprakları önden savrulur)
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    S.petals(ctx, t, aPet, { n: 34, onlyFront: true });
    S.leaves(ctx, t, aLeaf, { n: 40, onlyFront: true });
    S.snow(ctx, t, aSnow, { n: 150, onlyFront: true });
    gust(ctx, t);
    ctx.restore(); ctx.setTransform(m);
  },
  sfx: [
    { t: 10.3, type: 'wind', gain: 0.2 },
    { t: 10.36, type: 'rustle', gain: 0.28 },
    { t: 11.0, type: 'whoosh', gain: 0.22 },
    { t: 11.1, type: 'rustle', gain: 0.24 },
    { t: CANE.land, type: 'step', gain: 0.22 },
    { t: 11.6, type: 'wind', gain: 0.2 },
  ],
};

// "gençlerin": sağdan bir avuç bahar yaprağı adamın önünden geçen bir rüzgârla savrulur
function gust(ctx, t) {
  const t0 = 10.1;
  if (t < t0 || t > 11.0) return;
  const r = rng(491), ga = 1 - E.smooth(seg(t, 10.7, 10.98));
  if (ga <= 0) return;
  ctx.save();
  for (let i = 0; i < 70; i++) {
    const d = r.range(0, 0.32), sp = r.range(950, 1500), y0 = r.range(330, 1330), ph = r.range(0, TAU);
    const s = r.range(8, 17) * clamp((ga - r.range(0, 0.72)) / 0.28);
    if (s <= 0.3) continue;
    const k = t - t0 - d;
    if (k < 0) continue;
    const x = C.W + 40 + r.range(0, 200) - sp * k;
    if (x < -60) continue;
    const y = y0 + Math.sin(k * 4 + ph) * 50 - 140 * k + 26 * Math.sin(x * 0.005 + ph);
    const spin = Math.sin(k * 8 + ph);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ph + k * 5);
    const sq = Math.max(0.2, Math.abs(spin));
    ctx.fillStyle = r.pick(['#FFFFFF', '#FFE2EC', '#F7B6CF', '#F48CB4', '#FFFFFF']);
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.62 * sq, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba('#D9578E', 0.55); ctx.beginPath(); ctx.ellipse(-s * 0.5, 0, s * 0.38, s * 0.26 * sq, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
