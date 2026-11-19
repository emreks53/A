// S23 — "kabre gideceğini bil, öyle hazırlan." (93.80–97.60)
// Alacakaranlıkta kıvrılan bir yol; sonunda servilerle çevrili sakin bir mezarlık. 94.18 "kabre gideceğini bil": adam yolun
// başında durur, mezarlığa sakin ve kabullenmiş bakar (95.10 "bil": ağır bir baş onayı); fener elinde, yol çantası
// önünde yerde. 95.86 "öyle hazırlan": eğilip çantayı alır, omzuna vurur, s21'deki yanan feneri kaldırır ve yola kararlı
// adımlarla girer; mezarlığın ötesinde şafak aydınlığı belirir (umut). Yürüyüş ayak izi tabanlı (ayak kaymaz).
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const L = require('./_s21_lib');
const Wk = require('./_s21_walk');
const { seg, E, lerp, clamp, rgba, mix, TAU, rng, shade } = C;
const d = C.deg;

const MAN = { x0: 318, y: 1250, h: 520 };
const S = 0.27, CAD = 1.06;                       // adım (boy oranı), saniyede döngü
const OFF_N = 0.09, OFF_F = 0.59, ACC = 0.5;      // bacak fazları, hızlanma süresi (döngü)
const T = { look: 94.18, nod: 95.1, bend0: 95.5, grab: 95.8, rise1: 96.02, sw0: 96.02, sw1: 96.26, lan0: 96.1, lan1: 96.44, walk: 96.38 };
const BAG = { x: 432, s: 84 };
const LAN_S = 74;
const X0 = -120, X1 = 1320, HZ = 975;
const GATE = { x: 700, y: 932 };

// ---------- yol (dünya) ----------
const PATH_CTRL = [[-80, 1312, 380], [150, 1266, 310], [430, 1254, 250], [700, 1240, 205], [835, 1196, 150], [770, 1122, 112], [612, 1078, 88], [566, 1032, 70], [622, 990, 54], [690, 952, 42], [GATE.x, GATE.y + 4, 36]];
function pathPoly() {
  const pts = P.smoothPts(PATH_CTRL.map(([x, y]) => [x, y]), false, 10);
  const ws = P.smoothPts(PATH_CTRL.map(([, , w], i) => [i, w]), false, 10).map((q) => q[1]);
  const Lft = [], Rgt = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    // perspektif: uzakta yol yataya yakın görünür, kenarlar düşey sıkışır
    const w = ws[i] / 2, sq = 0.32 + 0.68 * clamp((pts[i][1] - HZ) / 320);
    Lft.push([pts[i][0] - dy * w, pts[i][1] + dx * w * sq]); Rgt.push([pts[i][0] + dy * w, pts[i][1] - dx * w * sq]);
  }
  return { center: pts, poly: Lft.concat(Rgt.reverse()) };
}

// ---------- önbellekli katmanlar ----------
function skyCv(kind) {
  const y0 = -140, y1 = HZ + 30;
  const cols = kind === 'dawn'
    ? ['#262A6A', '#3E3F88', '#6A5CA0', '#B07EAE', '#EBA6A0', '#FFC98E', '#FFE6B0']
    : ['#1A1C50', '#2A2D6E', '#423F86', '#665496', '#8E6A9E', '#B9849E', '#D9A2A4'];
  const stops = [0, 0.22, 0.42, 0.6, 0.76, 0.89, 1];
  return L.hcache('s23sky' + kind, X0, y0, X1 - X0, y1 - y0, 1.1, (x) => {
    const g = x.createLinearGradient(0, y0, 0, y1); cols.forEach((c, i) => g.addColorStop(stops[i], c));
    x.fillStyle = g; x.fillRect(X0, y0, X1 - X0, y1 - y0);
    P.bandFill(x, null, { x0: X0, y0, x1: X1, y1, w: X1 - X0, h: y1 - y0 }, cols, { seed: kind === 'dawn' ? 2301 : 2302, stops, wMin: 22, wMax: 40, lMin: 100, lMax: 300, mixJitter: 0.05 });
    const r = rng(2303);
    for (let i = 0; i < 12; i++) {
      const cy = r.range(260, 860), cx = r.range(X0, X1), len = r.range(200, 460), w = r.range(12, 22);
      const k = clamp((cy - 260) / 600);
      const base = kind === 'dawn' ? mix('#8C6AA8', '#F7B496', k) : mix('#3A3A7C', '#9A7098', k);
      P.stroke(x, cx, cy, cx + len, cy + r.range(-5, 5), w, base, r.int(1, 1e9), { detail: 0.6, taper1: 0.55 });
      if (kind === 'dawn' && k > 0.4) P.stroke(x, cx + len * 0.1, cy + w * 0.35, cx + len * 0.8, cy + w * 0.35, w * 0.35, '#FFDDA6', r.int(1, 1e9), { detail: 0.3, taper1: 0.5 });
    }
  });
}
const STARS = L.starList(2311, 60, { x0: X0, y0: -140, x1: X1, y1: 420 }, { bias: 1.5, bigP: 0.06 });

function hillTop(x) { return 965 - 85 * Math.exp(-Math.pow((x - 720) / 330, 2)) + (C.noise1(x / 70, 5) - 0.5) * 8; }
function farCv() {
  const y0 = 560, y1 = 1080;
  return L.hcache('s23far', X0, y0, X1 - X0, y1 - y0, 1.15, (x) => {
    // uzak tepeler
    const hl = (base, amp, fr, ph, cols, seed) => {
      const top = []; for (let i = 0; i <= 90; i++) { const wx = X0 + (X1 - X0) * i / 90; top.push([wx, base - amp * (0.5 + 0.5 * Math.sin(wx * fr + ph)) - (C.noise1(wx / 50, seed) - 0.5) * 12]); }
      const poly = top.concat([[X1, y1], [X0, y1]]);
      x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 3.5; x.setLineDash([60, 120, 30, 160]); x.stroke(P.pathOf(top, false)); x.restore();
      x.save(); x.clip(P.pathOf(poly)); x.fillStyle = cols[1]; x.fillRect(X0, y0, X1 - X0, y1 - y0); x.restore();
      P.bandFill(x, P.pathOf(poly), { x0: X0, y0, x1: X1, y1, w: X1 - X0, h: y1 - y0 }, cols, { seed, stops: [0, 0.3, 1], wMin: 14, wMax: 26, lMin: 60, lMax: 200 });
    };
    hl(HZ - 4, 34, 0.007, 1.3, ['#8A76A8', '#76679C', '#685C92'], 2321);
    hl(HZ + 10, 26, 0.011, 0.2, ['#6A6098', '#5C548C', '#504A82'], 2322);
    // mezarlık tepesi
    const top = []; for (let i = 0; i <= 90; i++) { const wx = X0 + (X1 - X0) * i / 90; top.push([wx, hillTop(wx)]); }
    const poly = top.concat([[X1, y1], [X0, y1]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 4; x.setLineDash([80, 100, 40, 140]); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(P.pathOf(poly)); x.fillStyle = '#46527A'; x.fillRect(X0, y0, X1 - X0, y1 - y0); x.restore();
    P.bandFill(x, P.pathOf(poly), { x0: X0, y0: 860, x1: X1, y1, w: X1 - X0, h: y1 - 860 }, ['#5E6890', '#4C5880', '#424E76'], { seed: 2323, stops: [0, 0.3, 1], wMin: 12, wMax: 22, lMin: 50, lMax: 160 });
    const r = rng(2324);
    // serviler (arkadakiler), mezar taşları, alçak duvar, öndeki serviler
    const cyp = (cx, h, seed) => R.cypress(x, cx, hillTop(cx) + 6, h, seed, { base: '#24524E', dark: '#132E36', light: '#7C8A62', lightAng: -0.95, wr: 0.19 }); // s17 ile aynı renkler
    cyp(505, 210, 2331); cyp(588, 275, 2332); cyp(862, 290, 2333); cyp(948, 236, 2334); cyp(1030, 196, 2335);
    const tomb = (tx, dy, s, seed) => R.tombstone(x, tx, hillTop(tx) + dy, s, { base: '#D9CCD4', dark: '#7A6A96', seed });
    tomb(626, 6, 50, 2341); tomb(676, 2, 44, 2342); tomb(748, 1, 46, 2343); tomb(800, 4, 42, 2344);
    tomb(598, 32, 58, 2345); tomb(786, 30, 56, 2347);
    cyp(455, 180, 2336); cyp(1092, 172, 2337);
  });
}
function groundCv() {
  const y0 = 940, y1 = 2080;
  return L.hcache('s23ground', X0, y0, X1 - X0, y1 - y0, 1.12, (x) => {
    // çayır (mezarlık tepesinin önünde başlar)
    const top = []; for (let i = 0; i <= 90; i++) { const wx = X0 + (X1 - X0) * i / 90; top.push([wx, Math.max(hillTop(wx) + 52, 1000) + (C.noise1(wx / 60, 9) - 0.5) * 10]); }
    const poly = top.concat([[X1, y1], [X0, y1]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 4; x.setLineDash([90, 70, 40, 120]); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(P.pathOf(poly)); x.fillStyle = '#34505C'; x.fillRect(X0, y0, X1 - X0, y1 - y0); x.restore();
    P.bandFill(x, P.pathOf(poly), { x0: X0, y0: 990, x1: X1, y1, w: X1 - X0, h: y1 - 990 }, ['#56688A', '#46607A', '#3A5868', '#2E4A5A', '#243C4E', '#1E3244'], { seed: 2361, stops: [0, 0.08, 0.2, 0.42, 0.7, 1], wMin: 16, wMax: 30, lMin: 70, lMax: 240 });
    // yol
    const pp = pathPoly();
    const ppath = P.pathOf(pp.poly);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 4; x.setLineDash([50, 40, 20, 70]); x.stroke(ppath); x.restore();
    x.save(); x.clip(ppath); x.fillStyle = '#9A86A0'; x.fillRect(X0, 900, X1 - X0, 600); x.restore();
    P.bandFill(x, ppath, { x0: X0, y0: 920, x1: X1, y1: 1400, w: X1 - X0, h: 480 }, ['#B6A2B2', '#A8929F', '#9C8494', '#8E7688'], { seed: 2362, stops: [0, 0.2, 0.55, 1], wMin: 10, wMax: 20, lMin: 40, lMax: 140, angle: 0.02 });
    // yolda tekerlek/ayak izi çizgileri ve çakıl
    const r = rng(2363);
    for (let i = 0; i < 90; i++) {
      const k = r.int(2, pp.center.length - 3), c = pp.center[k], q = pp.center[k + 1];
      const wN = PATH_CTRL[Math.min(PATH_CTRL.length - 1, Math.floor(k / 10))][2] * 0.35;
      const off = r.range(-1, 1) * wN * (0.32 + 0.68 * clamp((c[1] - HZ) / 320));
      const len = r.range(10, 34) * (0.3 + clamp((c[1] - HZ) / 300));
      const ang = Math.atan2(q[1] - c[1], q[0] - c[0]);
      P.stroke(x, c[0], c[1] + off, c[0] + Math.cos(ang) * len, c[1] + off + Math.sin(ang) * len, r.range(2, 5) * (0.3 + clamp((c[1] - HZ) / 300)), rgba(r.chance(0.5) ? '#D2C0C8' : '#6E5C74', 0.6), r.int(1, 1e9), { detail: 0, taper1: 0.5 });
    }
    // yol kenarında otlar, çiçekler, taşlar
    for (let i = 0; i < 70; i++) {
      const k = r.int(0, pp.center.length - 1), c = pp.center[k];
      const persp = 0.25 + 0.75 * clamp((c[1] - HZ) / 330);
      const side = r.sign(), wN = PATH_CTRL[Math.min(PATH_CTRL.length - 1, Math.floor(k / 10))][2] * 0.5;
      const gx = c[0] + side * r.range(0.4, 0.75) * wN * 0.25, gy = c[1] + side * wN * persp * r.range(0.85, 1.15) * 0.35 + 6;
      R.grass(x, gx + side * wN * 0.5 * (1 - persp) * 0, gy, 34 * persp, r.int(1, 999), { c1: '#2E4A5A', c2: '#6A8C86', n: 5 });
    }
    for (let i = 0; i < 40; i++) { const gx = r.range(X0, X1), gy = r.range(1040, 1900); const persp = 0.3 + 0.7 * clamp((gy - HZ) / 400); R.grass(x, gx, gy, 40 * persp, r.int(1, 999), { c1: '#24404E', c2: '#5A7C7A' }); }
    for (let i = 0; i < 22; i++) { const gx = r.range(X0, X1), gy = r.range(1060, 1800); if (P.inPoly(gx, gy, pp.poly)) continue; const persp = 0.3 + 0.7 * clamp((gy - HZ) / 400); R.flower(x, gx, gy, 12 * persp, r.int(1, 99), { color: r.pick(['#D8CFF0', '#C9B6E8', '#F2E8F6']), dark: '#7E72AA', inner: '#C87AB0' }); }
    for (const [sx, sy, sw] of [[180, 1380, 64], [940, 1300, 52], [1110, 1520, 80], [60, 1690, 90]]) {
      const pts = P.smoothPts([[sx - sw * 0.5, sy + 6], [sx - sw * 0.42, sy - sw * 0.3], [sx - sw * 0.05, sy - sw * 0.46], [sx + sw * 0.35, sy - sw * 0.36], [sx + sw * 0.5, sy - sw * 0.05], [sx + sw * 0.5, sy + 6]], true, 6);
      P.toneShape(x, pts, { base: '#6A6E92', dark: '#3E4268', light: '#9A98BA', lightAng: -1.0, seed: sx + 2370, shadowW: 0.22, lightW: 0.12, dabs: 4 });
    }
  });
}

// ---------- yürüyüş ----------
function Dv(v) { return v <= 0 ? 0 : v < ACC ? S * v * v / ACC : S * ACC + 2 * S * (v - ACC); }
const vAt = (t) => Math.max(0, (t - T.walk) * CAD);
function legState(v, off, standFp, first) {
  const c = v + off, n = Math.floor(c), l = c - n;
  const fp = (k) => (k <= 0 ? standFp : Dv(k - off) + 0.6 * S);
  const o = { loc: l, fpA: fp(n), fpB: fp(n + 1) };
  if (first && n === 0) o.opts = { heelRise: 0 };
  return o;
}
const rootX = (t) => MAN.x0 + Dv(vAt(t)) * MAN.h;

// ---------- çanta / el yolları ----------
// Fener baştan sona YAKIN elde (uyluğun hemen önünde, siluetin dışında asılı). Yol çantası önünde yerde; UZAK eliyle
// eğilip askısından tutar, göğüs önüne kaldırır, askıyı omzuna geçirir: çanta sırtında kalçasının arkasına iner, askı
// göğsünden çaprazlama geçer. Sonra yakın eliyle feneri öne kaldırıp yürür.
const BAG_H = BAG.s * 0.8;           // çapadan (halkalar) zemine
const LOOP = 0.52;                   // askı kemerinin halkalardan yüksekliği (çanta boyu oranı)
const handleTop = () => [BAG.x, MAN.y - BAG_H - BAG.s * LOOP * 0.75];
function shoulderW(pm) { return L.W_(pm, pm.s.armN.shoulder); }
const CHEST = [0.2, -0.62];

function manPose(t) {
  const v = vAt(t), D = Dv(v);
  const bend = E.inOutSine(seg(t, T.bend0, T.grab)) * (1 - E.inOutSine(seg(t, T.grab + 0.03, T.rise1)));
  const walkK = E.inOutSine(seg(t, T.walk - 0.1, T.walk + 0.6));
  const r = Wk.evalWalker({
    D, legs: [legState(v, OFF_N, 0.05, false), legState(v, OFF_F, -0.05, true)],
    age: 0, armAmp: d(16) * walkK, lean: d(50) * bend - d(1) * walkK, ext: lerp(0.992, 0.82, bend), legOpts: { lift: 0.05 },
  });
  let p = r.pose;
  const walkArmF = p.armF, walkElbowF = p.elbowF;
  // baş: mezarlığa bakış, "bil" onayı, eğilirken çantaya
  const nod = Math.sin(Math.PI * seg(t, T.nod - 0.05, T.nod + 0.6));
  p.neck = d(2) + d(6) * nod + d(6) * bend;
  p.head = d(-7) + d(10) * nod + d(12) * bend - d(2) * walkK;
  p.eye = (t > 94.6 && t < 94.67) ? 0.1 : lerp(0.82, 1, walkK);
  p.brow = -0.05; p.mouth = 0.1 + 0.06 * walkK;
  const br = Math.sin(t * 2.1) * (1 - walkK);
  p.torso += d(0.8) * br;
  // yakın kol: fener (uyluğun önünde; eğilirken geriye çekilir; sonra öne kaldırılır)
  const lk = E.inOutCubic(seg(t, T.lan0, T.lan1));
  const bendIn = E.inOutSine(seg(t, T.bend0, T.grab)), sideK = E.inOutSine(seg(t, T.grab, T.rise1));
  const armN0 = lerp(d(21) - d(82) * bendIn, d(0), sideK), elbN0 = lerp(d(24) - d(16) * bendIn, d(10), sideK);
  p.armN = lerp(armN0, d(62), lk) + d(1.2) * br; p.elbowN = lerp(elbN0, d(36), lk); p.handN = lerp(d(-12), d(-30), lk);
  p.grip = 0.8;
  // uzak kol: çanta
  p.armF = d(-3) + d(1) * br; p.elbowF = d(9); p.handF = d(6);
  const toL = (w) => [(w[0] - rootX(t)) / MAN.h, (w[1] - MAN.y) / MAN.h];
  const s0 = M.skeleton(p, 1);
  if (t > T.bend0 && t < T.sw0) {
    const kr = E.inOutSine(seg(t, T.bend0 + 0.03, T.grab));
    const ht = toL(handleTop());
    const tgt = [ht[0] - 0.005, ht[1] - M.L.hand * 0.55];
    const up = E.inOutSine(seg(t, T.grab + 0.03, T.rise1));
    const w = [lerp(tgt[0], CHEST[0], up), lerp(tgt[1], CHEST[1], up)];
    p = Wk.reach(p, w, 'F', kr, lerp(d(-4), d(20), up));
  } else if (t >= T.sw0) {
    // askıyı omza geçir: el göğüsten omuz üstüne kalkar, bırakır, kol yürüyüşe katılır
    const k = E.inOutSine(seg(t, T.sw0, T.sw1));
    const a = CHEST, b = [s0.armF.shoulder[0] + 0.06, s0.armF.shoulder[1] - 0.1], c = [s0.armF.shoulder[0] + 0.04, s0.armF.shoulder[1] - 0.02];
    const u = 1 - k;
    const w = [u * u * a[0] + 2 * u * k * b[0] + k * k * c[0], u * u * a[1] + 2 * u * k * b[1] + k * k * c[1]];
    const rel = E.inOutSine(seg(t, T.sw1 - 0.02, T.sw1 + 0.3));
    const q = Wk.reach(p, w, 'F', 1, lerp(d(20), d(170), k));
    p.armF = lerp(q.armF, walkArmF * walkK + d(-3) * (1 - walkK), rel); p.elbowF = lerp(q.elbowF, walkElbowF * walkK + d(9) * (1 - walkK), rel); p.handF = lerp(q.handF, d(6), rel);
  }
  return p;
}

// çantanın çapa konumu (halkaların ortası) ve dönüşü (dünya) — hep gövdenin arkasında (uzak taraf)
function bagState(t, pm) {
  const ground = { x: BAG.x, y: MAN.y - BAG_H, rot: 0, mode: 'ground' };
  if (t < T.grab) return ground;
  const g = L.gripPoint(pm, 'F', 0.5);
  const hand = { x: g[0], y: g[1] + BAG.s * LOOP * 0.75 + 3, rot: 0 };
  if (t < T.sw0) {
    const k = E.smooth(seg(t, T.grab, T.grab + 0.08));
    return { x: lerp(ground.x, hand.x, k), y: lerp(ground.y, hand.y, k), rot: 0.07 * Math.sin((t - T.grab) * 11) * k, mode: 'hand' };
  }
  const hip = L.W_(pm, pm.s.hip), h = MAN.h;
  const backBag = { x: hip[0] - 0.1 * h, y: hip[1] - 0.03 * h };
  const a = bagAt(T.sw0 - 0.001);
  const k = E.inOutSine(seg(t, T.sw0, T.sw1));
  const settle = t > T.sw1 ? Math.exp(-(t - T.sw1) * 5) * Math.sin((t - T.sw1) * 15) : 0;
  const walkSw = 0.05 * Math.sin(TAU * CAD * 2 * (t - T.walk) - 1.2) * seg(t, T.walk, T.walk + 0.5);
  return { x: lerp(a.x, backBag.x, k) - 8 * settle, y: lerp(a.y, backBag.y, k) - Math.sin(k * Math.PI) * 0.08 * h, rot: -0.3 * Math.sin(k * Math.PI) + 0.12 * settle + walkSw + 0.08 * k, mode: 'slung', k };
}
let _bagSw = null;
function bagAt(t) {
  if (_bagSw) return _bagSw;
  const p = manPose(t);
  const o = { x: rootX(t), y: MAN.y, h: MAN.h };
  const pm = { s: M.skeleton(p, MAN.h), p, o };
  const g = L.gripPoint(pm, 'F', 0.5);
  _bagSw = { x: g[0], y: g[1] + BAG.s * LOOP * 0.75 + 3 };
  return _bagSw;
}
function bagRing(bs, side = -1) { const c = Math.cos(bs.rot), s = Math.sin(bs.rot), lx = side * BAG.s * 0.42, ly = -BAG.s * 0.02; return [bs.x + lx * c - ly * s, bs.y + lx * s + ly * c]; }
// askı (arka kısım): yerde/eldeyken halkalar arası kemer; omuzdayken sağ halkadan sırt üstünden omza
function drawStrapBack(ctx, bs, handF, shTop) {
  const L0 = bagRing(bs, -1), R0 = bagRing(bs, 1), w = BAG.s * 0.065;
  if (bs.mode !== 'slung' || bs.k < 1) {
    const c = Math.cos(bs.rot), s = Math.sin(bs.rot), up = -BAG.s * LOOP;
    const top = bs.mode === 'ground' ? [bs.x - s * up, bs.y + c * up] : [handF[0], handF[1] + 2];
    ctx.save(); if (bs.mode === 'slung') ctx.globalAlpha *= 1 - bs.k;
    L.strap(ctx, [L0, [lerp(L0[0], top[0], 0.55) - 4, lerp(L0[1], top[1], 0.75)], top, [lerp(R0[0], top[0], 0.55) + 4, lerp(R0[1], top[1], 0.75)], R0], w);
    ctx.restore();
  }
  if (bs.mode === 'slung') {
    ctx.save(); ctx.globalAlpha *= bs.k;
    L.strap(ctx, [R0, [lerp(R0[0], shTop[0], 0.5) - 10, lerp(R0[1], shTop[1], 0.5)], shTop], w);
    ctx.restore();
  }
}
// askı (ön kısım): omuzdan göğüs üstünden çaprazlama öndeki kalçaya
function drawStrapFront(ctx, bs, shTop, frontHip) {
  if (bs.mode !== 'slung') return;
  ctx.save(); ctx.globalAlpha *= E.smooth(clamp(bs.k * 1.3));
  L.strap(ctx, [shTop, [lerp(shTop[0], frontHip[0], 0.45) + 14, lerp(shTop[1], frontHip[1], 0.45)], frontHip], BAG.s * 0.065);
  ctx.restore();
}
function drawBag(ctx, bs) { L.putSprite(ctx, L.bagSprite(BAG.s), bs.x, bs.y, 1, bs.rot); }

function lanternPhi(t) {
  let ph = 0.04 * Math.sin(t * 2.0);
  if (t > T.lan0) ph += -0.3 * Math.exp(-(t - T.lan0 - 0.25) * 3) * Math.sin(TAU * 1.3 * Math.max(0, t - T.lan0 - 0.05)) * (t > T.lan0 + 0.05 ? 1 : 0);
  if (t > T.walk) ph += 0.07 * Math.sin(TAU * CAD * 2 * (t - T.walk) - 0.6) * seg(t, T.walk, T.walk + 0.5);
  return ph;
}

module.exports = {
  init() { skyCv('dusk'); skyCv('dawn'); farCv(); groundCv(); bagAt(T.sw0 - 0.001); },
  draw(ctx, t) {
    const mx = rootX(t);
    // ---- kamera: yavaş itme, sonra yürüyeni izleme ----
    const k1 = E.inOutSine(seg(t, 93.5, 96.2)), k2 = E.inOutSine(seg(t, 96.15, 98.2));
    const zoom = lerp(1.0, 1.06, k1) + 0.05 * k2;
    const cx = lerp(lerp(522, 548, k1), Math.min(mx + 150, 760), k2 * 0.85), cy = lerp(lerp(1000, 985, k1), 960, k2);
    const [bx, by] = R.breathe(t, 3, 23);
    R.camera(ctx, { zoom, cx: cx + bx, cy: cy + by });

    // ---- gök: alacakaranlık, mezarlığın ötesinde şafak belirir ----
    const DW = E.inOutSine(seg(t, 95.8, 97.5));
    L.putCache(ctx, skyCv('dusk'));
    if (DW > 0.002) {
      // şafak gökyüzü önce ufuktan (mezarlığın ardından) açılır: radyal maskeli katman
      const lay = L.renderLayer(ctx, 's23dawn', { x0: X0, y0: -160, x1: X1, y1: HZ + 30 }, (x) => {
        L.putCache(x, skyCv('dawn'));
        x.globalCompositeOperation = 'destination-in';
        const R0 = 200 + 1500 * DW;
        const g = x.createRadialGradient(GATE.x, HZ + 40, 30, GATE.x, HZ + 40, R0);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, `rgba(0,0,0,${Math.min(1, 0.4 + DW)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.fillRect(X0, -200, X1 - X0, HZ + 260);
      });
      L.blitLayer(ctx, lay, Math.min(1, DW * 1.5));
    }
    L.drawStars(ctx, STARS, t, 0.85 * (1 - DW));
    // şafak ışığı (mezarlık ardında)
    if (DW > 0.002) {
      P.glow(ctx, GATE.x + 10, HZ - 30, 260 + 700 * DW, '#FFC98A', 0.55 * DW);
      P.glow(ctx, GATE.x + 10, HZ - 20, 160 + 240 * DW, '#FFF0C8', 0.6 * DW);
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.24 + Math.sin(t * 0.3 + i) * 0.02, w = 0.04, Lr = 1100;
        const rg = ctx.createRadialGradient(GATE.x, HZ, 40, GATE.x, HZ, Lr);
        rg.addColorStop(0, rgba('#FFE6B8', 0.14 * DW)); rg.addColorStop(1, rgba('#FFE6B8', 0));
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.moveTo(GATE.x, HZ); ctx.lineTo(GATE.x + Math.cos(a - w) * Lr, HZ + Math.sin(a - w) * Lr); ctx.lineTo(GATE.x + Math.cos(a + w) * Lr, HZ + Math.sin(a + w) * Lr); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    L.putCache(ctx, farCv());
    L.putCache(ctx, groundCv());
    // yola düşen şafak ışığı
    if (DW > 0.002) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = rgba('#FFB070', 0.35 * DW); ctx.fillRect(X0, 560, X1 - X0, 1500); ctx.restore(); }

    // ---- adam, çanta, fener ----
    const p = manPose(t);
    const mo = { x: mx, y: MAN.y, h: MAN.h, light: lerp(-2.0, -0.7, DW), rimAlpha: 0.7 };
    const pm = L.prepMan(ctx, p, mo, { x0: mx - 0.6 * MAN.h, y0: MAN.y - 1.15 * MAN.h, x1: mx + 0.75 * MAN.h, y1: MAN.y + 16 }, { slot: 's23man', tint: { c: '#1A1C50', a: 0.24 - 0.08 * DW, c2: '#FFA050', a2: 0.06 + 0.06 * DW } });
    const bs = bagState(t, pm);
    const gN = L.gripPoint(pm, 'N', 0.55), phi = lanternPhi(t);
    const core = L.lanternCore(gN, LAN_S, phi);
    const lk = E.inOutCubic(seg(t, T.lan0, T.lan1));
    const fl = 0.92 + 0.08 * Math.sin(t * 11) * Math.sin(t * 6.3);
    // temas gölgeleri: her ayağın altında (kalçayla kaymaz), yere yakınlığa göre
    const sk = pm.s;
    for (const G of [sk.legF, sk.legN]) {
      const an = L.W_(pm, G.ankle), up = MAN.y - an[1] - 18;
      const a = 0.34 * clamp(1 - up / 40);
      if (a > 0.01) { ctx.fillStyle = rgba('#141E30', a); ctx.beginPath(); ctx.ellipse(an[0] + 0.04 * MAN.h, MAN.y + 4, 0.08 * MAN.h, 0.014 * MAN.h, 0, 0, TAU); ctx.fill(); }
    }
    if (bs.mode === 'ground') { ctx.fillStyle = rgba('#141E30', 0.3); ctx.beginPath(); ctx.ellipse(BAG.x + 4, MAN.y + 3, BAG.s * 0.55, BAG.s * 0.07, 0, 0, TAU); ctx.fill(); }
    // fenerin ışığı: gövdenin ARKASINA (yer ve çevre aydınlanır; pantolon parlamaz)
    P.glow(ctx, core[0], MAN.y, 240, '#FFA448', 0.3 * fl);
    P.glow(ctx, core[0], core[1], 360, '#FFA448', 0.26 * fl);
    const sh = shoulderW(pm), shTop = [sh[0] - 0.012 * MAN.h, sh[1] - 0.03 * MAN.h];
    const hipW = L.W_(pm, sk.hip), frontHip = [hipW[0] + 0.06 * MAN.h, hipW[1] + 0.02 * MAN.h];
    const handF = L.gripPoint(pm, 'F', 0.45);
    // arka: askı + çanta (uzak taraf)
    drawStrapBack(ctx, bs, handF, shTop);
    drawBag(ctx, bs);
    L.blitMan(ctx, pm, (c) => {
      drawStrapFront(c, bs, shTop, frontHip);
      L.lanternHang(c, gN, LAN_S, phi, 1, t, { noGlow: true });
    });
    // önde yalnız küçük, fenere yakın ışıma (kaldırınca biraz büyür; kol ve el ısınır)
    P.glow(ctx, core[0], core[1], 70 + 110 * lk, '#FFC070', (0.3 + 0.12 * lk) * fl);
    P.glow(ctx, core[0], core[1], 30, '#FFF0C0', 0.5 * fl);
  },
  sfx: [
    { t: 93.95, type: 'wind', gain: 0.18 },
    { t: 95.62, type: 'rustle', gain: 0.26 },
    { t: 96.05, type: 'whoosh', gain: 0.18 },
    { t: 96.3, type: 'flame', gain: 0.18 },
    { t: 96.4, type: 'step', gain: 0.2 },
    { t: 96.9, type: 'swell', gain: 0.24 },
  ],
};
