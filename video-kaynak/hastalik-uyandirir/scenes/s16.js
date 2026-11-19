// S16 — "Eğer hastalık olmazsa sıhhat ve âfiyet gaflet verir, dünyayı hoş gösterir, âhireti unutturur." (62.50–71.50)
// Güneşli bir ağaçlı patika; tek, sürekli sahne: kamera sağa yürüyen adamla birlikte kayar (paralaks katmanlar, ayak izi
// tabanlı yürüyüş: ayak kaymaz). 63.06 dinç, kollarını sallayarak yürür. 65.02 "sıhhat ve âfiyet": taze yeşil-altın sağlık
// parıltısı. 66.30 "gaflet": parıltı pembe-lila bir sise dönüşüp başına sarılır, göz kapakları düşer, dalgın gülümser.
// 67.58 "dünyayı hoş gösterir": dünya aşırı süslenir (ağaçlardan sarkan parlak toplar, POP eden çiçekler, parıltı);
// adam büyülenmiş, yukarı bakar. 69.70 "âhireti unutturur": arkada uzak tepede ebedî bahçe kapısı hafifçe ışır; başından
// geriye akan sis oraya ulaşır, sis kapının üstüne çöker; adam ona sırtı dönük yürümeye devam eder.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const Wk = require('./_s16_walk');
const L = require('./_s16_lib');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, seg, deg } = C;
const { W, H } = C;

const T = { eger: 63.06, sih: 65.02, gaf: 66.30, dun: 67.58, ahi: 69.70, unu: 70.36 };
const MAN = { h: 600, gy: 1215, S: 0.34, T0: 61.9 };
const LIGHT = -2.3;
const TA = 61.9, TB = 71.7; // çizilebilir aralık (geçişler dahil)
const sm = L.sm;

// ---------- adam: faz, konum ----------
function uOf(t) { return (t - MAN.T0) - 0.22 * L.rampInt(t, 65.85, 66.95); }
function manX(t) { return 2 * MAN.S * uOf(t) * MAN.h; }

// ---------- kamera ----------
function camOf(t) {
  t = clamp(t, TA, TB);
  // 65–69: adama yumuşak itme (parıltı ve sis telefonda okunsun), sonra kapıyı göstermek için geri çekilme
  const push = E.inOutSine(seg(t, 64.85, 66.6));
  const back = E.inOutSine(seg(t, 68.55, 69.5));
  const pull = E.inOutSine(seg(t, 69.2, 70.8));
  const pk = push * (1 - back);
  const z = 1 + 0.16 * pk - 0.06 * pull;
  const SX = 430 + 160 * pull;
  const [bx, by] = R.breathe(t, 3, 16);
  const x = manX(t) - (SX - W / 2) / z + bx;
  const y = 960 - 30 * pk - 26 * pull + by;
  return { x, y, z };
}

// katmanların gerekli genişliği (kamera yolundan)
function layerBounds(f, y0, y1) {
  let x0 = Infinity, x1 = -Infinity;
  for (let t = TA; t <= TB + 1e-6; t += 0.05) {
    const c = camOf(t);
    const a = L.fromScreen(c, f, 0, 0), b = L.fromScreen(c, f, W, H);
    x0 = Math.min(x0, a[0]); x1 = Math.max(x1, b[0]);
  }
  x0 = Math.floor(x0 - 60); x1 = Math.ceil(x1 + 60);
  return { x0, x1, w: x1 - x0, y0, y1, h: y1 - y0 };
}

// ---------- uzak tepeler (f=0.14) ve kapı tepesi ----------
const FF = 0.14, FM = 0.4;
let GATE = null; // { lx, ly } uzak katman koordinatı
function gateSpot() {
  if (GATE) return GATE;
  // 69.95'te kapı ekranın sol üçte birinde, adamın arkasında
  const c = camOf(69.95);
  const [lx] = L.fromScreen(c, FF, 205, 0);
  GATE = { lx, ly: 0 };
  GATE.ly = farTop(lx) + 4;
  return GATE;
}
function farTop(lx) {
  const g = GATE ? GATE.lx : 0;
  const base = 936 - 16 * Math.sin(lx * 0.0062 + 0.8) - 10 * Math.sin(lx * 0.017 + 2.1);
  const bump = GATE ? 128 * Math.exp(-Math.pow(Math.abs(lx - g) / 250, 2.2)) : 0;
  return base - bump;
}
function farLayer() {
  gateSpot();
  const B = layerBounds(FF, 640, 1200);
  return { B, cv: R.cached('s16:far', B.w, B.h, (x) => {
    const r = rng(1601);
    const top = []; for (let i = 0; i <= 200; i++) { const lx = B.x0 + B.w * i / 200; top.push([lx - B.x0, farTop(lx) - B.y0]); }
    const poly = top.concat([[B.w, B.h], [0, B.h]]);
    x.save(); x.strokeStyle = rgba(P.UNDERPAINT, 0.45); x.lineWidth = 4; x.setLineDash([80, 150, 30, 200]); x.translate(1.5, -1.5); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(P.pathOf(poly)); x.fillStyle = '#8CC9C8'; x.fillRect(0, 0, B.w, B.h); x.restore();
    P.bandFill(x, poly, { x0: 0, y0: 0, x1: B.w, y1: B.h, w: B.w, h: B.h }, ['#CDEBE0', '#9BD2CA', '#7BB9BE', '#6AA6B6'], { seed: 1602, wMin: 14, wMax: 26, lMin: 60, lMax: 200, stops: [0, 0.2, 0.55, 1], angle: 0.02 });
    // kapı tepesinin sol yamacında ışık, sağında soğuk gölge
    const g = GATE.lx - B.x0;
    for (let i = 0; i < 26; i++) {
      const u = r.range(-1, 1), px = g + u * 200, py = farTop(px + B.x0) - B.y0 + r.range(10, 60);
      P.stroke(x, px - 30, py, px + 30, py + r.range(-4, 4), r.range(8, 14), u < 0 ? '#DDF1E4' : '#76A9BC', r.int(1, 1e9), { detail: 0.4 });
    }
    for (let i = 0; i < 26; i++) {
      const k = r.int(2, 194), p0 = top[k], p1 = top[k + r.int(2, 5)];
      P.stroke(x, p0[0], p0[1] + r.range(8, 16), p1[0], p1[1] + r.range(8, 16), r.range(7, 12), rgba('#D9F0E2', r.range(0.35, 0.7)), r.int(1, 1e9), { detail: 0.4 });
    }
  }) };
}
// ---------- orta tepeler (f=0.4) ----------
function midTop(lx) { return 1002 - 22 * Math.max(0, Math.sin(lx * 0.0042 - 0.3)) ** 1.5 - 9 * Math.sin(lx * 0.019 + 2.1); }
function midLayer() {
  const B = layerBounds(FM, 900, 1250);
  return { B, cv: R.cached('s16:mid', B.w, B.h, (x) => {
    const r = rng(1611);
    const top = []; for (let i = 0; i <= 240; i++) { const lx = B.x0 + B.w * i / 240; top.push([lx - B.x0, midTop(lx) - B.y0]); }
    const poly = top.concat([[B.w, B.h], [0, B.h]]);
    x.save(); x.strokeStyle = rgba(P.UNDERPAINT, 0.6); x.lineWidth = 4; x.setLineDash([70, 140, 30, 220, 50, 160]); x.translate(1.5, -1.5); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(P.pathOf(poly)); x.fillStyle = '#58B07E'; x.fillRect(0, 0, B.w, B.h); x.restore();
    P.bandFill(x, poly, { x0: 0, y0: 0, x1: B.w, y1: B.h, w: B.w, h: B.h }, ['#A3D978', '#6FC07C', '#3E9A6E', '#2F8A6A'], { seed: 1612, wMin: 14, wMax: 24, lMin: 60, lMax: 180, stops: [0, 0.15, 0.45, 1], angle: 0.02 });
    for (let i = 0; i < 40; i++) {
      const k = r.int(1, 234), p0 = top[k], p1 = top[k + r.int(2, 5)];
      P.stroke(x, p0[0], p0[1] + r.range(7, 14), p1[0], p1[1] + r.range(7, 14), r.range(6, 11), rgba('#B9E486', r.range(0.4, 0.8)), r.int(1, 1e9), { detail: 0.4 });
    }
    // sırtta minik serviler, yuvarlak ağaçlar, evler
    let lx = B.x0 + 30;
    while (lx < B.x1) {
      const kind = r.pick(['c', 'c', 't', 't', 'h', 'g']);
      const gy = midTop(lx) - B.y0 + 6, gx = lx - B.x0;
      if (kind === 'c') R.cypress(x, gx, gy, r.range(46, 70), r.int(1, 99), { base: '#2C7A55', dark: '#185440', light: '#5CA867' });
      else if (kind === 't') {
        const s = r.range(22, 30);
        x.fillStyle = '#6B4A2E'; x.fillRect(gx - 2.5, gy - s * 0.5, 5, s * 0.5 + 2);
        const list = [P.blobPts(gx, gy - s * 1.15, s * 0.8, s * 0.66, r.int(1, 99), 0.12, 20), P.blobPts(gx - s * 0.45, gy - s * 0.8, s * 0.5, s * 0.42, r.int(1, 99), 0.12, 16), P.blobPts(gx + s * 0.48, gy - s * 0.82, s * 0.5, s * 0.42, r.int(1, 99), 0.12, 16)];
        P.toneUnion(x, list, { base: '#4AA059', dark: '#26704A', light: '#9ED46A', seed: r.int(1, 99), rimW: 2.5, dabs: 3, highlights: 2, texture: 0.3 });
      } else if (kind === 'h') {
        const s = r.range(22, 28);
        P.toneShape(x, P.rectPts(gx - s * 0.5, gy - s * 0.62, s, s * 0.62), { base: '#F6EBDD', dark: '#B9AEC9', light: '#FFFFFF', seed: r.int(1, 99), rim: false, shadowW: 0.28, dabs: 0, texture: 0.25, highlights: 0 });
        P.toneShape(x, [[gx - s * 0.62, gy - s * 0.6], [gx, gy - s * 1.05], [gx + s * 0.62, gy - s * 0.6]], { base: '#D9583B', dark: '#8E2E3A', light: '#F2875A', seed: r.int(1, 99), rim: false, shadowW: 0.3, dabs: 0, texture: 0.25, highlights: 0 });
        x.fillStyle = '#4A3A6A'; x.fillRect(gx - s * 0.1, gy - s * 0.32, s * 0.2, s * 0.32);
      }
      lx += r.range(40, 120);
    }
  }) };
}
// ---------- gök (f=0.03) ----------
const FS = 0.03;
function skyLayer() {
  const B = layerBounds(FS, -260, 1140);
  return { B, cv: R.cached('s16:sky', B.w, B.h, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, B.w, B.h);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: B.w, y1: B.h, w: B.w, h: B.h },
      ['#1C4FB0', '#2662C4', '#2E86CE', '#46ADD6', '#8FD3E4', '#CDEDEA', '#FBEFCF'],
      { seed: 1621, stops: [0, 0.18, 0.36, 0.54, 0.72, 0.86, 1], wMin: 22, wMax: 42, lMin: 90, lMax: 280, mixJitter: 0.06 });
  }) };
}
// ---------- zemin: patika + çayır (f=1) ----------
const PATH_TOP = (wx) => 1138 + 5 * Math.sin(wx * 0.013) + 3 * Math.sin(wx * 0.041 + 1);
const PATH_BOT = (wx) => 1290 + 6 * Math.sin(wx * 0.011 + 2) + 3 * Math.sin(wx * 0.037);
function groundLayer() {
  const B = layerBounds(1, 1100, 2040);
  return { B, cv: R.cached('s16:ground', B.w, B.h, (x) => {
    const r = rng(1631);
    const N = Math.ceil(B.w / 12);
    const topL = [], botL = [];
    for (let i = 0; i <= N; i++) { const wx = B.x0 + B.w * i / N; topL.push([wx - B.x0, PATH_TOP(wx) - B.y0]); botL.push([wx - B.x0, PATH_BOT(wx) - B.y0]); }
    // uzak kenar çimen şeridi (ağaç diplerini örter)
    const fr = topL.map(([a, b]) => [a, b - 22 - 6 * Math.sin(a * 0.05)]);
    const frPoly = fr.concat(topL.slice().reverse().map(([a, b]) => [a, b + 4]));
    x.fillStyle = '#5DB257'; x.fill(P.pathOf(frPoly));
    P.bandFill(x, frPoly, { x0: 0, y0: 0, x1: B.w, y1: 70, w: B.w, h: 70 }, ['#9ED64A', '#5DB257', '#3E9A55'], { seed: 1632, wMin: 8, wMax: 14, lMin: 30, lMax: 90 });
    for (let i = 0; i < B.w / 7; i++) {
      const k = r.int(0, N - 1), px = fr[k][0] + r.range(-6, 6), py = fr[k][1] + r.range(2, 18), hh = r.range(10, 24), a = r.range(-0.4, 0.4);
      P.stroke(x, px, py + 6, px + Math.sin(a) * hh, py - hh, r.range(3, 5), r.pick(['#9ED64A', '#C2E453', '#6DBA4C', '#3E9A55']), r.int(1, 1e9), { detail: 0, taper1: 0.3 });
    }
    // patika
    const pathPoly = topL.concat(botL.slice().reverse());
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 5; x.setLineDash([140, 60, 50, 120]); x.stroke(P.pathOf(botL, false)); x.restore();
    x.fillStyle = '#F2D08A'; x.fill(P.pathOf(pathPoly));
    P.bandFill(x, pathPoly, { x0: 0, y0: 30, x1: B.w, y1: 200, w: B.w, h: 170 }, ['#FBEBC2', '#F6DC9C', '#EFC67E', '#DDA864'], { seed: 1633, wMin: 12, wMax: 22, lMin: 60, lMax: 220, stops: [0, 0.3, 0.65, 1], angle: 0.01 });
    // çakıllar ve tekerlek izi darbeleri
    x.save(); x.clip(P.pathOf(pathPoly));
    for (let i = 0; i < B.w / 9; i++) {
      const wx = r.range(0, B.w), yy = lerp(PATH_TOP(wx + B.x0), PATH_BOT(wx + B.x0), r.range(0.1, 0.95)) - B.y0;
      if (r.chance(0.5)) { const s = r.range(2.5, 6); x.fillStyle = rgba(r.pick(['#C98E58', '#FFF4DA', '#B98A6A', '#E9B97A']), 0.9); x.beginPath(); x.ellipse(wx, yy, s * 1.4, s, 0, 0, TAU); x.fill(); }
      else P.stroke(x, wx, yy, wx + r.range(30, 90), yy + r.range(-2, 2), r.range(4, 8), rgba(r.pick(['#E1AE6C', '#FFF2CF']), 0.7), r.int(1, 1e9), { detail: 0.3 });
    }
    x.restore();
    // çayır
    const mPoly = botL.concat([[B.w, B.h], [0, B.h]]);
    x.fillStyle = '#5DB257'; x.fill(P.pathOf(mPoly));
    P.bandFill(x, mPoly, { x0: 0, y0: 180, x1: B.w, y1: B.h, w: B.w, h: B.h - 180 }, ['#B4E058', '#86CC50', '#5DB257', '#45A253', '#34914E', '#2A7D48'], { seed: 1634, wMin: 18, wMax: 34, lMin: 80, lMax: 260, stops: [0, 0.07, 0.25, 0.48, 0.72, 1], angle: 0.015 });
    // yakın kenar çimeni (patikanın önünde)
    for (let i = 0; i < B.w / 5; i++) {
      const k = r.int(0, N - 1), px = botL[k][0] + r.range(-6, 6), py = botL[k][1] + r.range(-2, 14), hh = r.range(12, 30), a = r.range(-0.45, 0.45);
      P.stroke(x, px, py + 8, px + Math.sin(a) * hh, py - hh * 0.8, r.range(3.5, 6), r.pick(['#9ED64A', '#C2E453', '#6DBA4C', '#4E9E4C']), r.int(1, 1e9), { detail: 0, taper1: 0.3 });
    }
    // çayırda seyrek beyaz-sarı benekler: yalnız patika dibinde ve alt kenarda (anlam bandı sakin kalsın)
    for (let i = 0; i < B.w / 6; i++) {
      const wx = r.range(0, B.w);
      const band = r.chance(0.45) ? r.range(1305, 1345) : r.range(1600, 1980);
      const s = r.range(2.5, 5.5) * (band > 1600 ? 1.4 : 1);
      x.fillStyle = rgba(r.pick(['#FFF6E2', '#FFF6E2', '#F7D54A', '#F59AC0', '#FFFFFF']), 0.9);
      x.beginPath(); x.ellipse(wx, band - B.y0, s * 1.3, s, 0, 0, TAU); x.fill();
    }
  }) };
}
// ---------- yol ağaçları (f=1) ----------
const TREE_T = [59.6, 61.35, 63.05, 64.45, 67.7, 72.1]; // gövdenin adamın arkasından geçtiği anlar
let TREES = null;
function trees() {
  if (TREES) return TREES;
  const variants = [
    { s: 280, seed: 31, trunkH: 770, leaf: '#3E9B4F', leafDark: '#17573A', leafLight: '#9ED64A' },
    { s: 262, seed: 37, trunkH: 800, leaf: '#46A24E', leafDark: '#1E5E3C', leafLight: '#B0DE52' },
    { s: 296, seed: 43, trunkH: 750, leaf: '#379350', leafDark: '#145238', leafLight: '#8FD04C' },
  ];
  TREES = TREE_T.map((tc, i) => {
    const v = variants[i % 3];
    const spr = L.alleyTree('s16v' + (i % 3), v.s, v);
    const X = manX(tc) + 10;
    return { X, spr, flip: i % 2 ? -1 : 1, i };
  });
  // süsler
  for (const tr of TREES) {
    const r = rng(1700 + tr.i);
    const sx0 = L.toScreen(camOf(T.dun), 1, tr.X, 0)[0];
    tr.baubles = tr.spr.attach.map(([ax, ay, k], j) => ({
      ax: ax * tr.flip, ay, len: lerp(40, 250, k), ci: (tr.i * 2 + j * 3) % 5, rad: r.range(26, 42),
      ph: r.range(0, TAU), fr: r.range(0.45, 0.7),
      tPop: T.dun - 0.08 + 0.00055 * Math.abs(sx0 + ax * tr.flip - 430) + r.range(0, 0.12),
    }));
  }
  return TREES;
}
// ---------- POP eden çiçekler (f=1) ----------
let FLW = null;
function flowers() {
  if (FLW) return FLW;
  const r = rng(1801);
  const c0 = camOf(T.dun), c1 = camOf(TB);
  const xa = L.fromScreen(c0, 1, -80, 0)[0], xb = L.fromScreen(c1, 1, W + 80, 0)[0];
  FLW = [];
  const add = (wx, wy, s, row) => {
    const sx0 = L.toScreen(c0, 1, wx, wy)[0];
    FLW.push({ wx, wy, s, ci: r.int(0, 4), seed: r.int(1, 40), row, tPop: T.dun - 0.05 + 0.0007 * Math.abs(sx0 - 430) + r.range(0, 0.1), tilt: r.range(-0.12, 0.12) });
  };
  for (let wx = xa; wx < xb; wx += r.range(60, 110)) add(wx, PATH_TOP(wx) - 6, 26, 0);
  for (let wx = xa; wx < xb; wx += r.range(80, 140)) add(wx, PATH_BOT(wx) + 12, 38, 1);
  for (let wx = xa; wx < xb; wx += r.range(110, 190)) add(wx, r.range(1650, 1720), 56, 2);
  FLW.sort((a, b) => a.wy - b.wy);
  return FLW;
}

// ---------- ön plan öbekleri (f=1.3) ----------
const FG = 1.3;
let FGC = null;
function fgClumps() {
  if (FGC) return FGC;
  const B = layerBounds(FG, 0, 0), r = rng(1711);
  FGC = [];
  for (let x = B.x0; x < B.x1; x += r.range(260, 520)) FGC.push({ x, y: 1990 + r.range(-20, 30), s: r.range(300, 380), v: r.int(0, 2), flip: r.sign() });
  return FGC;
}
// ---------- gök nesneleri ----------
function sunSpr() { return L.sprite('s16sun2', 600, 600, 300, 300, (x) => L.cleanSun(x, 300, 300, 82, { seed: 4 })); }
function cloudSpr(k, s, seed) { return L.sprite('s16cl' + k, s * 2.6, s * 1.5, s * 1.3, s * 0.95, (x) => R.cloud(x, s * 1.3, s * 0.95, s, seed, { lightAng: -2.0 })); }

// ---------- adam pozu ----------
function manPose(t) {
  const u = uOf(t), S = MAN.S;
  const D = 2 * S * u;
  const legs = Wk.steadyLegs(u, S, 0);
  const dreamy = sm((t - 66.0) / 0.9);
  const lookUp = sm((t - 67.45) / 0.55) * (1 - sm((t - 69.3) / 0.8));
  const res = Wk.evalWalker({
    D, legs, age: 0,
    armAmp: deg(27) - deg(13) * dreamy,
    lean: deg(3) * (1 - dreamy) - deg(3) * dreamy,
    legOpts: { lift: 0.06 - 0.012 * dreamy },
  });
  const p = res.pose;
  const health = sm((t - 64.85) / 0.4) * (1 - dreamy);
  p.head = p.head - deg(3) - deg(3) * health - deg(5) * dreamy - deg(13) * lookUp;
  p.neck = p.neck - deg(2) * dreamy - deg(6) * lookUp;
  p.mouth = 0.22 + 0.25 * health + 0.4 * dreamy + 0.15 * lookUp;
  p.eye = lerp(1, 0.4, sm((t - 66.3) / 0.45)) + 0.14 * lookUp;
  p.brow = 0.15 * dreamy;
  // dalgınken eller gevşek
  p.elbowN += deg(4) * dreamy; p.elbowF += deg(4) * dreamy;
  return { p, x: D * MAN.h, y: MAN.gy };
}

// ---------- sağlık parıltısı ----------
// gövdeyi saran taze yeşil-altın ışık: boyalı halo katmanları (düz ton), genişleyen halka, yükselen yaprakçıklar.
// "gaflet"e doğru pembe-lilaya döner ve başa doğru toplanıp sise dönüşür.
function aura(ctx, t, sk, mx, my, pass) {
  const aOn = sm((t - 64.86) / 0.32);
  const toPink = sm((t - 65.95) / 0.6);
  const aOff = 1 - sm((t - 66.3) / 0.6);
  const a = aOn * aOff;
  if (a <= 0.005) return;
  const torso = [mx + (sk.hip[0] + sk.sh[0]) / 2 + 6, my + (sk.hip[1] + sk.sh[1]) / 2 - 10];
  const head = [mx + sk.headC[0], my + sk.headC[1]];
  const cx = lerp(torso[0], head[0], toPink), cy = lerp(torso[1], head[1], toPink);
  const pulse = 1 + 0.035 * Math.sin((t - 64.9) * TAU * 1.1);
  const rx = lerp(185, 120, toPink) * pulse, ry = lerp(370, 130, toPink) * pulse;
  if (pass === 'back') {
    const c1 = mix('#E4FA8C', '#F8C3DE', toPink), c2 = mix('#C4EE6A', '#E9AEE0', toPink), c3 = mix('#FFF4B8', '#FFE2F0', toPink);
    P.glow(ctx, cx, cy, ry * 1.25, c1, 0.55 * a);
    // düz ton halo katmanları (darbe kenarlı)
    const grow = E.outBack(aOn, 1.4);
    const layers = [[1.0, c2, 0.32], [0.78, c1, 0.4], [0.55, c3, 0.45]];
    layers.forEach(([k, col, al], li) => {
      const pts = P.blobPts(cx, cy, rx * k * grow, ry * k * grow, 1660 + li, 0.06, 48);
      ctx.save(); ctx.globalAlpha = al * a; ctx.fillStyle = col; ctx.fill(P.pathOf(pts));
      ctx.globalAlpha = al * a * 0.9;
      // kenarı izleyen kısa darbeler
      const rr = rng(1662 + li);
      for (let i = 0; i < 14; i++) {
        const th = rr.range(0, TAU), q = [cx + Math.cos(th) * rx * k * grow, cy + Math.sin(th) * ry * k * grow];
        const tg = th + Math.PI / 2, len = rr.range(30, 60);
        P.stroke(ctx, q[0] - Math.cos(tg) * len / 2, q[1] - Math.sin(tg) * len * 0.5 * (ry / rx) * 0.3, q[0] + Math.cos(tg) * len / 2, q[1] + Math.sin(tg) * len * 0.5 * (ry / rx) * 0.3, rr.range(8, 14), col, rr.int(1, 1e9), { detail: 0.4 });
      }
      ctx.restore();
    });
    // genişleyen halka (65.02)
    const k = seg(t, 64.92, 65.9);
    if (k > 0 && k < 1) {
      const e = E.outCubic(k), al = (1 - k) * 0.9;
      ctx.save(); ctx.globalAlpha = al;
      for (let i = 0; i < 7; i++) {
        const a0 = i / 7 * TAU + 0.3, arc = [];
        for (let j = 0; j <= 10; j++) { const th = a0 + (j / 10) * 0.75; arc.push([torso[0] + Math.cos(th) * lerp(190, 330, e), torso[1] + Math.sin(th) * lerp(380, 560, e)]); }
        P.curveStroke(ctx, arc, 18 * (1 - k * 0.6), i % 2 ? '#EFFFA8' : '#FFEFA8', 1650 + i, { taper: true, bristles: 2 });
      }
      ctx.restore();
    }
  } else {
    // yükselen yeşil-altın yaprakçıklar ve parıltılar
    const r = rng(1661);
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const ph = r.range(0, 1), sp = r.range(0.55, 0.9), ox = r.range(-1, 1) * 170, oy = r.range(-0.8, 0.95) * 330;
      const k = (t * sp + ph) % 1;
      const al = a * Math.sin(Math.PI * k) * (1 - toPink * 0.8);
      if (al <= 0.01) continue;
      const px = torso[0] + ox + Math.sin(k * 5 + i) * 12, py = torso[1] + oy - k * 140;
      if (i % 3 === 0) L.star4(ctx, px, py, r.range(10, 18) * (0.6 + 0.4 * Math.sin(Math.PI * k)), al, '#FFFBE0');
      else {
        ctx.globalAlpha = al;
        const ang = -1.2 + Math.sin(k * 6 + i) * 0.6, len = r.range(18, 28);
        P.stroke(ctx, px, py, px + Math.cos(ang) * len, py + Math.sin(ang) * len, len * 0.5, i % 2 ? '#9EE85A' : '#D4F870', 1670 + i, { detail: 0.3, taper0: 0.3, taper1: 0.3 });
      }
    }
    ctx.restore();
  }
}

// ---------- uzak sis (kapının üstüne çöken) ----------
// [dx, dy, ölçek, gecikme]; sağdan (adamın tarafından) yuvarlanıp kapıyı örter
const FOGP = [[600, -30, 170, 0], [430, 45, 160, 1], [800, 15, 150, 2], [270, -60, 150, 3], [110, 30, 175, 4], [-90, -50, 155, 5], [-290, 35, 165, 6], [-470, -15, 145, 7], [15, -135, 150, 8], [-160, 90, 175, 9], [160, -170, 130, 10]];
function drawGateAndFog(ctx, t, cam) {
  const G = gateSpot();
  const gA = sm((t - 69.5) / 0.5);
  const fogK = seg(t, 70.2, 71.35);
  if (gA <= 0.003) return;
  ctx.save(); L.view(ctx, cam, FF);
  const cover = sm((fogK - 0.25) / 0.6);
  const glow = gA * (1 - 0.9 * cover) * (0.88 + 0.12 * Math.sin(t * 3.1));
  ctx.save(); ctx.globalAlpha = gA * (1 - 0.7 * cover);
  // sıcak ışık halesi ve hüzmeler (açık gökte de okunsun: üstüne-boyama, ekran değil)
  const GS = 176, gcx = G.lx, gcy = G.ly - GS * 0.55;
  P.glow(ctx, gcx, gcy, GS * 2.3, '#FFC870', 0.5 * glow, 'source-over');
  P.glow(ctx, gcx, gcy, GS * 1.0, '#FFF0C8', 0.55 * glow, 'source-over');
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.2 + Math.sin(t * 0.7 + i) * 0.03, w = 0.035 + 0.015 * (i % 2), len = GS * (2.6 + 0.5 * (i % 3));
    ctx.fillStyle = rgba(i % 2 ? '#FFE6A8' : '#FFD486', 0.22 * glow);
    ctx.beginPath(); ctx.moveTo(gcx, gcy); ctx.lineTo(gcx + Math.cos(a - w) * len, gcy + Math.sin(a - w) * len); ctx.lineTo(gcx + Math.cos(a + w) * len, gcy + Math.sin(a + w) * len); ctx.closePath(); ctx.fill();
  }
  R.gardenGate(ctx, G.lx, G.ly, GS, glow, t, { stone: '#F7EEDC' });
  ctx.restore();
  if (glow > 0.01) R.sparkles(ctx, G.lx, G.ly - GS * 0.7, GS * 0.9, 9, t * 0.8, 1690, { alpha: glow, scale: 1.0, rise: 20 });
  // sis: yatay pus şeritleri + yuvarlanan puflar
  if (fogK > 0) {
    const band = sm(fogK / 0.7);
    ctx.save();
    const rr = rng(1693);
    for (let i = 0; i < 10; i++) {
      const y = G.ly - 250 + i * 34 + rr.range(-8, 8), x0 = G.lx + 900 - band * rr.range(1200, 1600), len = rr.range(600, 1000);
      ctx.globalAlpha = 0.5 * band * rr.range(0.6, 1);
      P.stroke(ctx, x0, y, x0 + len, y + rr.range(-6, 6), rr.range(26, 44), rr.pick(['#F6CFE2', '#E6C6EE', '#FBE0EC']), 1694 + i, { detail: 0.6, taper0: 0.4, taper1: 0.5 });
    }
    ctx.restore();
    for (const [dx, dy, s, k] of FOGP) {
      const kk = sm((fogK - k * 0.04) / 0.55);
      if (kk <= 0) continue;
      const px = G.lx + dx + (1 - kk) * 420 + Math.sin(t * 0.7 + k) * 5;
      const py = G.ly - 80 + dy * 0.8 + (1 - kk) * 16;
      L.put(ctx, L.puff('far' + (k % 4), 100, 1691 + (k % 4)), px, py, (s / 100) * lerp(0.45, 1.0, E.outBack(kk, 1.3)), 0, Math.min(1, kk * 2.5), k % 2 ? -1 : 1);
    }
  }
  ctx.restore();
}
// başından kapıya doğru akan sis şeritleri (ekran uzayı)
function drawStream(ctx, t, cam, headS) {
  const G = gateSpot();
  const gs = L.toScreen(cam, FF, G.lx, G.ly - 100);
  for (let i = 0; i < 7; i++) {
    const t0 = 69.9 + i * 0.12, k = seg(t, t0, t0 + 0.95);
    if (k <= 0 || k >= 1) continue;
    const e = E.inOutSine(k);
    const c1 = [lerp(headS[0], gs[0], 0.45), Math.min(headS[1], gs[1]) - 170 - i * 8];
    const x = (1 - e) * (1 - e) * headS[0] + 2 * (1 - e) * e * c1[0] + e * e * gs[0];
    const y = (1 - e) * (1 - e) * headS[1] + 2 * (1 - e) * e * c1[1] + e * e * gs[1];
    const al = Math.min(1, k * 5) * (1 - sm((k - 0.75) / 0.25)) * 0.85;
    L.put(ctx, L.puff('str' + (i % 3), 60, 1695 + (i % 3)), x, y, lerp(0.4, 0.9, e), Math.sin(t * 2 + i) * 0.1, al, i % 2 ? -1 : 1);
  }
}

module.exports = {
  _dbg: { camOf, manX, uOf, gateSpot, trees },
  init() { skyLayer(); farLayer(); midLayer(); groundLayer(); trees(); flowers(); fgClumps(); sunSpr(); for (let i = 0; i < 5; i++) L.bauble(i, 40); },
  draw(ctx, t) {
    const tc = clamp(t, TA, TB);
    const cam = camOf(tc);
    // gök
    const sky = skyLayer();
    ctx.save(); L.view(ctx, cam, FS);
    ctx.drawImage(sky.cv, sky.B.x0, sky.B.y0);
    L.put(ctx, sunSpr(), 200, 300, 1, tc * 0.04);
    for (const [k, s, seed, x0, y0, v] of [['a', 120, 3, 760, 470, 8], ['b', 80, 8, 350, 620, 5], ['c', 64, 12, 1000, 700, 10], ['d', 96, 21, 1450, 520, 6]]) L.put(ctx, cloudSpr(k, s, seed), x0 + v * (tc - 62) + FS * 0 , y0);
    ctx.restore();
    // kuşlar (ekran)
    ctx.save(); ctx.strokeStyle = '#2A3A6A'; ctx.lineCap = 'round'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const bx = 1150 - (tc - 62.0) * (55 + i * 7) - i * 52, by = 560 + Math.sin(i * 2.1) * 30 + Math.sin(tc * 2 + i) * 4;
      if (bx < -40) continue;
      const fl = Math.sin(tc * 10 + i * 1.7) * 6, s = 11 - i;
      ctx.beginPath(); ctx.moveTo(bx - s, by - fl * 0.6); ctx.quadraticCurveTo(bx - s * 0.4, by - 4, bx, by); ctx.quadraticCurveTo(bx + s * 0.4, by - 4, bx + s, by - fl * 0.6); ctx.stroke();
    }
    ctx.restore();
    // uzak tepeler + kapı + sis
    const far = farLayer();
    ctx.save(); L.view(ctx, cam, FF); ctx.drawImage(far.cv, far.B.x0, far.B.y0); ctx.restore();
    drawGateAndFog(ctx, tc, cam);
    const mid = midLayer();
    ctx.save(); L.view(ctx, cam, FM); ctx.drawImage(mid.cv, mid.B.x0, mid.B.y0); ctx.restore();

    // ---- dünya (f=1) ----
    ctx.save(); L.view(ctx, cam, 1);
    const vx0 = L.fromScreen(cam, 1, 0, 0)[0], vx1 = L.fromScreen(cam, 1, W, 0)[0];
    const TR = trees();
    for (const tr of TR) {
      if (tr.X < vx0 - 400 || tr.X > vx1 + 400) continue;
      const sway = Math.sin(tc * 0.9 + tr.i) * 0.004;
      L.put(ctx, tr.spr, tr.X, 1134, 1, sway, 1, tr.flip);
    }
    const g = groundLayer();
    ctx.drawImage(g.cv, g.B.x0, g.B.y0);
    // ağaçlardan sarkan süsler
    for (const tr of TR) {
      if (tr.X < vx0 - 400 || tr.X > vx1 + 400) continue;
      for (const b of tr.baubles) {
        if (tc < b.tPop) continue;
        const pk = C.pop(tc, b.tPop, 0.5, 2.4);
        const ax = tr.X + b.ax, ay = 1134 + b.ay;
        const jig = 0.35 * Math.exp(-4 * (tc - b.tPop)) * Math.sin((tc - b.tPop) * 9);
        const ang = 0.09 * Math.sin(tc * TAU * b.fr * 0.5 + b.ph) + jig;
        const len = b.len * Math.min(1, pk * 1.1);
        const ex = ax + Math.sin(ang) * len, ey = ay + Math.cos(ang) * len;
        ctx.strokeStyle = rgba('#F6E6B8', 0.9); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
        L.put(ctx, L.bauble(b.ci, 40), ex, ey, (b.rad / 40) * pk, -ang);
        const tw = Math.pow(Math.max(0, Math.sin(tc * 2.3 + b.ph * 3)), 12);
        if (tw > 0.02) L.star4(ctx, ex - b.rad * 0.35, ey + b.rad * 0.55, b.rad * 0.7 * tw, tw, '#FFFFFF');
        ctx.globalAlpha = 1;
      }
    }
    // patikada adamın gölgesi + POP eden çiçekler (arka sıra)
    const ms = manPose(tc);
    const FL = flowers();
    const drawFlowers = (row) => {
      for (const f of FL) {
        if (f.row !== row || tc < f.tPop || f.wx < vx0 - 100 || f.wx > vx1 + 100) continue;
        const pk = C.pop(tc, f.tPop, 0.5, 2.3);
        L.put(ctx, L.flowerSpr(f.ci, 40, f.seed), f.wx, f.wy, (f.s / 40) * pk, f.tilt + Math.sin(tc * 1.8 + f.wx) * 0.04);
        const k = seg(tc, f.tPop, f.tPop + 0.6);
        if (k > 0 && k < 1) for (let i = 0; i < 4; i++) { const a = i * 1.57 + f.seed, d = f.s * (1.2 + k * 1.2); L.star4(ctx, f.wx + Math.cos(a) * d, f.wy - f.s * 1.9 + Math.sin(a) * d, f.s * 0.35 * Math.sin(Math.PI * k), Math.sin(Math.PI * k), '#FFF6D6'); }
        ctx.globalAlpha = 1;
      }
    };
    drawFlowers(0);
    ctx.fillStyle = rgba('#7A5A3A', 0.22); ctx.beginPath(); ctx.ellipse(ms.x + 8, ms.y + 4, MAN.h * 0.15, 11, 0, 0, TAU); ctx.fill();
    // adam + parıltı + peçe
    const sk = M.skeleton(ms.p, MAN.h);
    aura(ctx, tc, sk, ms.x, ms.y, 'back');
    const hx = ms.x + sk.headC[0], hy = ms.y + sk.headC[1];
    const vA = sm((tc - 66.12) / 0.7);
    const hrot = sk.ha * 0.9;
    const veilAt = (part) => { ctx.save(); ctx.translate(hx, hy); ctx.rotate(hrot); L.veil(ctx, 0, 0, 80, tc, vA, part, 1641); ctx.restore(); };
    veilAt('back');
    M.drawMan(ctx, ms.p, { x: ms.x, y: ms.y, h: MAN.h, light: LIGHT });
    veilAt('front');
    if (vA > 0) P.glow(ctx, hx, hy - 10, 170, '#F7C2E0', 0.22 * vA);
    aura(ctx, tc, sk, ms.x, ms.y, 'front');
    drawFlowers(1);
    drawFlowers(2);
    ctx.restore();
    // ön plan öbekleri (f=1.3)
    ctx.save(); L.view(ctx, cam, FG);
    const fx0 = L.fromScreen(cam, FG, -200, 0)[0], fx1 = L.fromScreen(cam, FG, W + 200, 0)[0];
    for (const c of fgClumps()) {
      if (c.x < fx0 || c.x > fx1) continue;
      L.put(ctx, L.clumpSpr('s16fg' + c.v, c.s, 1720 + c.v), c.x, c.y, 1, Math.sin(tc * 1.6 + c.x) * 0.025, 1, c.flip);
    }
    ctx.restore();

    // başından kapıya akan sis
    const headS = L.toScreen(cam, 1, hx - 30, hy - 10);
    drawStream(ctx, tc, cam, headS);

    // "dünyayı hoş gösterir": aşırı tatlı ışık + parıltı
    const sw = sm((tc - 67.5) / 0.6) * (1 - 0.35 * sm((tc - 70.3) / 0.9));
    if (sw > 0.003) {
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.55 * sw;
      const gr = ctx.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#FFD3EC'); gr.addColorStop(0.5, '#FFE7A6'); gr.addColorStop(1, '#FFC9E4');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore();
      L.glitter(ctx, tc, sw, 1681, [0, 40, W, 1260], 80, { scale: 1.6 });
      L.glitter(ctx, tc, sw * 0.85, 1682, [0, 1590, W, 1780], 18, { scale: 1.3 });
      // güneşten süzülen tatlı ışık hüzmeleri
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 6; i++) {
        const a = 0.35 + i * 0.14 + Math.sin(tc * 0.5 + i) * 0.02;
        ctx.fillStyle = rgba(i % 2 ? '#FFE6F2' : '#FFF2C4', 0.1 * sw);
        ctx.beginPath(); ctx.moveTo(200, 300); ctx.lineTo(200 + Math.cos(a - 0.035) * 2400, 300 + Math.sin(a - 0.035) * 2400); ctx.lineTo(200 + Math.cos(a + 0.035) * 2400, 300 + Math.sin(a + 0.035) * 2400); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  },
  sfx: [
    { t: 62.9, type: 'birds', gain: 0.2 },
    { t: 63.1, type: 'step', gain: 0.18 },
    { t: 64.95, type: 'chime', gain: 0.3 },
    { t: 66.25, type: 'swell', gain: 0.22 },
    { t: 67.55, type: 'sparkle', gain: 0.32 },
    { t: 67.75, type: 'pop', gain: 0.22 },
    { t: 69.65, type: 'bell', gain: 0.18 },
    { t: 70.3, type: 'wind', gain: 0.22 },
  ],
};
