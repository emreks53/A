// S02 — "İnsan bu dünyaya keyif sürmek ve lezzet almak için gelmediğine," (2.60–7.10 sn; boya geçişiyle 2.25'ten çizilir)
// Geceden sonra güneşli, kavisli küçük bir dünya. Adam soldan dünyanın kavisi üzerinden yürüyerek gelir ve tepede durur
// ("İnsan" 2.94); "bu dünyaya" (3.46) kamera geri çekilir: kavisli ufuk, ağaçlar. "keyif sürmek" (3.96): hamak, minder,
// ince belli çay bardağı POP. "lezzet almak" (5.10): bakır sinide nar, üzüm, incir, baklava-lokum parıltıyla. "gelmediğine"
// (6.06): hepsi köpük gibi yukarı süzülür, kum ve parıltıya dönüşüp rüzgârla dağılır; adam sakin, başını kaldırıp seyreder.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const Wk = require('./_s02_walk');
const X = require('./_s02_props');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, seg, deg } = C;

// ---------- dünya geometrisi ----------
const APEX = 1250, RD = 1300, DC = [540, APEX + RD];
const surf = (x) => DC[1] - Math.sqrt(RD * RD - (x - DC[0]) ** 2);
const onArc = (s, lift = 0) => { const a = s / RD; return [DC[0] + Math.sin(a) * (RD + lift), DC[1] - Math.cos(a) * (RD + lift), a]; };
const arcOfX = (x) => RD * Math.asin(clamp((x - DC[0]) / RD, -1, 1));
const FAR = { c: [540, 1188 + 2600], r: 2600 };
const MID = { c: [540, 1222 + 2100], r: 2100 };
const BX0 = -420, BX1 = 1500; // önbellek katmanlarının dünya x aralığı
const LIGHT = -2.3;

// ---------- adam: yürüyüş + duruş ----------
const MAN = { h: 480, S: 0.29, cad: 1.12, sRest: arcOfX(320), kf: 3, delta: 0.05, tStop: 3.86 };
MAN.D0 = MAN.sRest / MAN.h - 2 * MAN.S * (MAN.kf + 0.8) - MAN.delta / 2;
MAN.ua = MAN.kf + 0.5;
MAN.ub = MAN.ua + 0.6 + MAN.delta / (2 * MAN.S);
const MAN_ROT = 0.0; // dünya kavisine göre gövde dönüşü oranı (0 = dik)
function manState(t) {
  const { S, kf, D0, ua, ub, delta } = MAN;
  const u = ub - MAN.cad * Math.max(0, MAN.tStop - t);
  let D;
  if (u <= ua) D = D0 + 2 * S * u;
  else { const v = u - ua; D = D0 + 2 * S * ua + 2 * S * v * (1 - v / (2 * (ub - ua))); }
  const fpFinalF = D0 + 2 * S * (kf + 0.8), fpFinalN = fpFinalF + delta;
  // yakın bacak
  const kN = Math.floor(u); let lN = u - kN, nA, nB;
  if (kN < kf) { nA = D0 + 2 * S * (kN + 0.3); nB = nA + 2 * S; }
  else if (kN === kf) { nA = D0 + 2 * S * (kf + 0.3); nB = fpFinalN; }
  else { nA = fpFinalN; nB = fpFinalN; lN = Math.min(lN, 0.3); }
  // uzak bacak
  const uF = u + 0.5, kF = Math.floor(uF); let lF = uF - kF, fA, fB;
  if (kF <= kf) { fA = D0 + 2 * S * (kF - 0.2); fB = fA + 2 * S; }
  else { fA = fpFinalF; fB = fpFinalF; lF = Math.min(lF, 0.33); }
  const stopK = Wk.sm((u - ua) / (ub - ua));
  const settle = E.inOutSine(seg(t, MAN.tStop - 0.05, MAN.tStop + 0.5));
  const Rh = RD / MAN.h;
  // kökteki teğet çerçeveden gövde çerçevesine: zemin β kadar eğik (gövde dik durur), üstelik kavisli
  const phi = D * MAN.h / RD, beta = phi * (1 - MAN_ROT), cb = Math.cos(beta), sb = Math.sin(beta);
  const warp = (x, y, fa) => {
    const th = x / Rh;
    const tx = Math.sin(th) * (Rh - y), ty = Rh * (1 - Math.cos(th)) + y * Math.cos(th);
    return [tx * cb - ty * sb, tx * sb + ty * cb, fa + th + beta];
  };
  const r = Wk.evalWalker({
    D, legs: [{ loc: lN, fpA: nA, fpB: nB }, { loc: lF, fpA: fA, fpB: fB }],
    age: 0, armAmp: deg(21) * (1 - stopK), lean: deg(1.5) * (1 - settle) - deg(2) * settle - Math.min(0, beta) * 0.35 * (1 - settle), warp,
    legOpts: { lift: 0.05 },
    ext: lerp(0.988, 0.996, settle),
  });
  return { p: r.pose, s: D * MAN.h };
}
// duruştaki ifade ve bakış
function expression(p, t) {
  const look = E.inOutSine(seg(t, 3.95, 4.35)) * (1 - E.inOutSine(seg(t, 5.0, 5.3)));      // sağa, hamağa bakar
  const down = E.inOutSine(seg(t, 5.0, 5.35)) * (1 - E.inOutSine(seg(t, 5.92, 6.25)));     // tepsiye bakar
  const up = E.inOutSine(seg(t, 5.95, 6.5));                                                // yukarı bakar
  const smile = 0.35 * E.inOutSine(seg(t, 4.0, 4.4)) * (1 - E.inOutSine(seg(t, 6.0, 6.5)));
  const o = Object.assign({}, p);
  const idle = E.inOutSine(seg(t, MAN.tStop, MAN.tStop + 0.6));
  const br = Math.sin((t - MAN.tStop) * 2.3) * idle;
  o.torso = p.torso + deg(0.7) * br; o.armN = p.armN + deg(1.2) * br; o.armF = p.armF + deg(1.0) * br; o.neck = p.neck - deg(0.6) * br;
  o.head = p.head + deg(4) * look + deg(9) * down - deg(20) * up;
  o.neck = o.neck + deg(3) * down - deg(7) * up;
  o.mouth = smile;
  o.eye = (t > 4.62 && t < 4.72) || (t > 6.9 && t < 6.98) ? 0.1 : 1; // göz kırpma
  // "gelmediğine": yakın el hafifçe açılır (bırakış)
  const lift = E.inOutSine(seg(t, 6.0, 6.45)) * (1 - E.inOutSine(seg(t, 6.75, 7.2)));
  o.armN = o.armN + deg(14) * lift; o.elbowN = p.elbowN + deg(26) * lift; o.handN = p.handN - deg(12) * lift;
  return o;
}

// ---------- önbellekli katmanlar ----------
function skyLayer() {
  return R.cached('s02:sky', BX1 - BX0, 1500, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, BX1 - BX0, 1500);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: BX1 - BX0, y1: 1500, w: BX1 - BX0, h: 1500 },
      ['#1C4FB0', '#2662C4', '#2E86CE', '#46ADD6', '#8FD3E4', '#CDEDEA', '#FBEFCF'],
      { seed: 207, stops: [0, 0.16, 0.34, 0.52, 0.7, 0.84, 1], wMin: 22, wMax: 42, lMin: 90, lMax: 280, mixJitter: 0.06 });
  });
}
function arcLayer(key, A, top, colors, o) {
  // A: {c, r} yay; top: üst kenar tümsek fonksiyonu; colors: [taban, ışık, gölge]
  return R.cached(key, BX1 - BX0, 700, (x) => {
    const oy = o.oy; // tuvalin dünya y başlangıcı
    const r = rng(o.seed);
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const wx = BX0 + (BX1 - BX0) * i / 120;
      const ay = A.c[1] - Math.sqrt(A.r * A.r - (wx - A.c[0]) ** 2);
      pts.push([wx - BX0, ay - oy - top(wx)]);
    }
    const poly = pts.concat([[BX1 - BX0, 700], [0, 700]]);
    if (o.rim) { x.save(); x.strokeStyle = rgba(P.UNDERPAINT, o.rim); x.lineWidth = 4; x.setLineDash([70, 140, 30, 220, 50, 160]); x.translate(1.5, -1.5); x.stroke(P.pathOf(pts, false)); x.restore(); }
    x.save(); x.clip(P.pathOf(poly)); x.fillStyle = colors[0]; x.fillRect(0, 0, BX1 - BX0, 700); x.restore();
    P.bandFill(x, poly, { x0: 0, y0: 0, x1: BX1 - BX0, y1: 700, w: BX1 - BX0, h: 700 }, [colors[1], colors[0], colors[2]], { seed: o.seed + 1, wMin: 14, wMax: 26, lMin: 60, lMax: 200, stops: [0, 0.18, 1], angle: 0.02 });
    // sırtta ışık darbeleri
    for (let i = 0; i < 40; i++) {
      const k = r.int(1, 117), p0 = pts[k], p1 = pts[k + 2];
      P.stroke(x, p0[0], p0[1] + 6, p1[0], p1[1] + 6, r.range(6, 11), shade(colors[1], 0.06), r.int(1, 1e9), { detail: 0.4 });
    }
    if (o.details) o.details(x, oy);
  });
}
function farHills() {
  return arcLayer('s02:far', FAR, (wx) => 26 * Math.max(0, Math.sin(wx * 0.006 + 1.2)) ** 2 + 12 * Math.sin(wx * 0.017 + 0.4) + 10, ['#8CCFC4', '#C6EADB', '#6FAFB6'], { oy: 1000, seed: 221, rim: 0 });
}
function midHills() {
  return arcLayer('s02:mid', MID, (wx) => 30 * Math.max(0, Math.sin(wx * 0.0045 - 0.3)) ** 1.5 + 9 * Math.sin(wx * 0.02 + 2.1) + 6, ['#58B07E', '#A3D978', '#2F8A6A'], {
    oy: 1060, seed: 231, rim: 0.55,
    details: (x, oy) => {
      // uzak sırtta minik serviler, yuvarlak ağaçlar ve evler (yaya dik, dünya kavisini vurgular)
      const r = rng(233);
      const items = [[-300, 'c'], [-240, 'h'], [-190, 't'], [-120, 'c'], [-70, 'h'], [0, 't'], [60, 'c'], [150, 'h'], [195, 'h'], [240, 'c'], [700, 'c'], [760, 'h'], [820, 't'], [880, 'c'], [930, 'h'], [1000, 't'], [1060, 'c'], [1130, 'h'], [1190, 't'], [1260, 'c'], [1330, 'h'], [1400, 'c']];
      for (const [wx, kind] of items) {
        const ang = Math.asin((wx - MID.c[0]) / MID.r);
        const top = 30 * Math.max(0, Math.sin(wx * 0.0045 - 0.3)) ** 1.5 + 9 * Math.sin(wx * 0.02 + 2.1) + 6;
        const gy = MID.c[1] - Math.sqrt(MID.r * MID.r - (wx - MID.c[0]) ** 2) - top - oy + 8;
        const gx = wx - BX0;
        x.save(); x.translate(gx, gy); x.rotate(ang);
        if (kind === 'c') R.cypress(x, 0, 2, r.range(38, 56), r.int(1, 99), { base: '#2C7A55', dark: '#185440', light: '#5CA867' });
        else if (kind === 't') { const list = [P.blobPts(0, -26, 20, 17, r.int(1, 99), 0.12, 20), P.blobPts(-10, -18, 13, 11, r.int(1, 99), 0.12, 16), P.blobPts(11, -19, 13, 11, r.int(1, 99), 0.12, 16)]; x.fillStyle = '#6B4A2E'; x.fillRect(-2, -10, 4, 12); P.toneUnion(x, list, { base: '#4AA059', dark: '#26704A', light: '#9ED46A', seed: r.int(1, 99), rimW: 2.5, dabs: 3, highlights: 2, texture: 0.3 }); }
        else X.tinyHouse(x, 0, 2, r.range(20, 26), 0, r.int(1, 99));
        x.restore();
      }
    },
  });
}
function domeLayer() {
  return R.cached('s02:dome', BX1 - BX0, 900, (x) => {
    const oy = APEX - 70, r = rng(241);
    const cx = DC[0] - BX0, cy = DC[1] - oy;
    const circ = P.ellipsePts(cx, cy, RD, RD, 360);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 7; x.setLineDash([160, 50, 70, 110, 40, 80]); x.translate(2, -2.5); x.stroke(P.pathOf(circ)); x.restore();
    x.save(); x.clip(P.pathOf(circ));
    x.fillStyle = '#4FA852'; x.fillRect(0, 0, BX1 - BX0, 900);
    // eş merkezli halkalar boyunca kıvrık darbeler (dünyanın kavisini izler)
    const bands = [[0, '#C2E453', '#9CD24C'], [26, '#A7DA4C', '#82C64A'], [110, '#7DC44C', '#62B24E'], [260, '#5AAE4F', '#46A050'], [460, '#3E9A4F', '#2F8A4B'], [680, '#2E8248', '#256F45']];
    for (let d = 0; d < 860; d += 17) {
      const rr = RD - d - 6;
      const span = Math.min(1.2, Math.acos(clamp((cy - 900 - 60) / rr, -1, 1)) + 0.1);
      let a = -span - r.range(0, 0.05);
      while (a < span) {
        const len = r.range(60, 190), da = len / rr;
        const a0 = a, a1 = a + da;
        const p0 = [cx + Math.sin(a0) * rr, cy - Math.cos(a0) * rr], p1 = [cx + Math.sin(a1) * rr, cy - Math.cos(a1) * rr];
        const mx = (p0[0] + p1[0]) / 2 + BX0;
        if (p1[1] > -40 || p0[1] > -40) {
          const dj = d + r.range(-22, 22);
          let bi = 0; while (bi < bands.length - 1 && dj > bands[bi + 1][0]) bi++;
          const side = clamp((mx - 300) / 900, -0.3, 1); // sol aydınlık, sağ gölgeli
          let col = mix(bands[bi][1], bands[bi][2], clamp(0.25 + side * 0.75));
          if (side > 0.55) col = mix(col, '#2F6E7A', (side - 0.55) * 0.5);
          col = shade(col, r.range(-0.03, 0.03), r.range(-0.03, 0.03));
          P.stroke(x, p0[0], p0[1], p1[0], p1[1], r.range(19, 32), col, r.int(1, 1e9), { detail: 0.9, dry: r.chance(0.08) });
        }
        a += da * r.range(0.72, 0.95);
      }
    }
    // yüzeyde çiçek benekleri (aydınlık tarafta yoğun)
    for (let i = 0; i < 260; i++) {
      const a = r.range(-0.75, 0.75), d = 40 + Math.pow(r.next(), 1.4) * 640;
      const px = cx + Math.sin(a) * (RD - d), py = cy - Math.cos(a) * (RD - d);
      if (py > 900 || py < 0) continue;
      const col = r.pick(['#FFF6E2', '#FFF6E2', '#F7D54A', '#F59AC0', '#FFFFFF', '#E86A8E']);
      const s = r.range(3, 7) * (1 - d / 1100);
      x.fillStyle = rgba(col, 0.92); x.beginPath(); x.ellipse(px, py, s * 1.3, s, a, 0, TAU); x.fill();
    }
    // yüzey kenarında ışık şeridi
    for (let i = 0; i < 70; i++) {
      const a = r.range(-0.9, 0.9), len = r.range(40, 120) / RD;
      const lit = a < 0.25;
      const rr = RD - r.range(6, 16);
      P.stroke(x, cx + Math.sin(a) * rr, cy - Math.cos(a) * rr, cx + Math.sin(a + len) * rr, cy - Math.cos(a + len) * rr, r.range(7, 12), lit ? '#DDF07A' : '#A8D85A', r.int(1, 1e9), { detail: 0.4 });
    }
    // yüzeyde dışa doğru çimen darbeleri
    for (let i = 0; i < 520; i++) {
      const a = r.range(-0.95, 0.95), rr = RD - r.range(-2, 10), hh = r.range(8, 20);
      const px = cx + Math.sin(a) * rr, py = cy - Math.cos(a) * rr;
      const ang = a + r.range(-0.35, 0.35);
      P.stroke(x, px, py, px + Math.sin(ang) * hh, py - Math.cos(ang) * hh, r.range(3, 5.5), r.pick(['#9ED64A', '#C2E453', '#6DBA4C', '#4E9E4C']), r.int(1, 1e9), { detail: 0, taper1: 0.3 });
    }
    // sağ alt: soğuk gölge (alacakaranlık değil, gövde gölgesi)
    x.globalCompositeOperation = 'multiply';
    const g = x.createRadialGradient(cx - RD * 0.35, cy - RD * 0.9, RD * 0.3, cx, cy - RD * 0.5, RD * 1.05);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(120,130,190,1)');
    x.fillStyle = g; x.fillRect(0, 0, BX1 - BX0, 900);
    x.restore();
  });
}
function sunSprite() { return X.sprite('s02:sun', 640, 640, 320, 320, (x) => R.sun(x, 320, 320, 88, 0, { seed: 4 })); }
function cloudSprite(k, s, seed) { return X.sprite('s02:cloud' + k, s * 2.6, s * 1.5, s * 1.3, s * 0.95, (x) => R.cloud(x, s * 1.3, s * 0.95, s, seed, { lightAng: -2.0 })); }

// ---------- sahne nesneleri ----------
const TREES = [{ x: 770, s: 236, seed: 11 }, { x: 1045, s: 216, seed: 17 }];
function treeInfo(i) {
  const T = TREES[i], s = arcOfX(T.x), [bx, by, a] = onArc(s, -6), lean = a * 0.4;
  const spr = X.tallTree('s02t' + i, T.s, { seed: T.seed, fruit: i === 0 ? '#F2A33A' : null });
  const att = [spr.attach[0] - spr.ax, spr.attach[1] - spr.ay];
  const c = Math.cos(lean), sn = Math.sin(lean);
  return { spr, bx, by, lean, attach: [bx + att[0] * c - att[1] * sn, by + att[0] * sn + att[1] * c] };
}
// nesneler: göründüğü an, yüzen kalkış anı, sprite, dünya konumu
function objects() {
  if (objects._c) return objects._c;
  const tA = treeInfo(0), tB = treeInfo(1);
  const A = tA.attach, B = tB.attach;
  const ham = X.hammock('s02', B[0] - A[0], B[1] - A[1], { sag: 104 });
  const list = [];
  const ground = (x, lift = 0) => { const [gx, gy, a] = onArc(arcOfX(x), lift); return { x: gx, y: gy, rot: a * 0.9 }; };
  // tFly: kalkış; tx,ty: açık gökteki varış (görsel merkez; ağaç tacının dışında, adamın baktığı yer)
  list.push({ id: 'hammock', spr: ham, x: A[0], y: A[1], rot: 0, tPop: 3.86, tFly: 6.1, popDur: 0.55, bub: false, shadow: 0, tx: 640, ty: 420 });
  const cu = ground(735, -3); list.push({ id: 'cushion', spr: X.cushion('s02', 190), x: cu.x, y: cu.y + 46, rot: cu.rot, tPop: 4.06, tFly: 6.04, bub: false, shadow: 70, tx: 470, ty: 540 });
  const te = ground(858, -3); list.push({ id: 'tea', spr: X.teaGlass('s02', 96), x: te.x, y: te.y + 74, rot: te.rot, tPop: 4.27, tFly: 5.99, bub: true, shadow: 30, tx: 760, ty: 560 });
  const tr = ground(548, -3); list.push({ id: 'tray', spr: X.tray('s02', 280), x: tr.x, y: tr.y + 8, rot: tr.rot * 0.5, tPop: 4.98, tFly: 6.07, bub: false, shadow: 110, tx: 540, ty: 690 });
  const topY = tr.y - 280 * 0.36 * 0.66 + 2; // sini yüzeyi
  list.push({ id: 'pom', spr: X.pomegranate('s02', 30), x: tr.x - 86, y: topY + 2, rot: 0, tPop: 5.1, tFly: 5.96, bub: true, shadow: 0, tx: 420, ty: 575 });
  list.push({ id: 'grapes', spr: X.grapes('s02', 10), x: tr.x + 14, y: topY + 1, rot: 0, tPop: 5.24, tFly: 6.0, bub: true, shadow: 0, tx: 520, ty: 640 });
  list.push({ id: 'figs', spr: X.figs('s02', 20), x: tr.x + 96, y: topY + 3, rot: 0, tPop: 5.38, tFly: 6.03, bub: true, shadow: 0, tx: 610, ty: 610 });
  list.push({ id: 'sweets', spr: X.sweets('s02', 24), x: tr.x - 10, y: topY + 16, rot: 0, tPop: 5.52, tFly: 5.93, bub: true, shadow: 0, tx: 450, ty: 640 });
  list.forEach((o, i) => { o.seed = 300 + i * 17; o.dis = X.dissolver(o.spr, o.seed % 97 + 1); });
  objects._c = { list, tA, tB };
  return objects._c;
}
// yüzme dönüşümü: t anında (dx, dy, rot, sc). Nesne, köpük gibi kalkıp yay çizerek açık gökteki hedefine süzülür.
const TRV = 0.5;
function flyXf(o, t) {
  const k = t - o.tFly;
  if (k <= 0) return { dx: 0, dy: 0, rot: 0, sc: 1 };
  const cx0 = o.x + o.spr.w / 2 - o.spr.ax, cy0 = o.y + o.spr.h / 2 - o.spr.ay;
  const u = clamp(k / TRV), after = Math.max(0, k - TRV);
  const ey = E.outSine(u), ex = u * u * (3 - 2 * u) * u;     // önce yükselir, sonra yana süzülür
  const bx = o.tx - cx0, by = o.ty - cy0, L = Math.hypot(bx, by) || 1;
  const arc = Math.sin(Math.PI * u) * 46;                    // yolun dışa doğru hafif kavisi
  const sway = Math.sin(k * 4.2 + o.seed) * 7 * Math.min(1, k * 3);
  return {
    dx: bx * ex + (by / L) * arc + sway + after * 30, dy: by * ey - (bx / L) * arc * 0.4 - after * 70,
    rot: Math.sin(k * 3.1 + o.seed * 0.7) * 0.1 * Math.min(1, k * 2), sc: 1 - 0.1 * Math.min(1, k * 1.6),
  };
}
const DIS0 = 0.4, DISD = 0.42; // kalkıştan sonra dağılmanın başlaması ve süresi

function drawObject(ctx, o, t) {
  if (t < o.tPop) return;
  const pk = C.pop(t, o.tPop, o.popDur ?? 0.45, 2.2);
  const f = flyXf(o, t);
  const t0 = o.tFly + DIS0, p = clamp((t - t0) / DISD);
  const img = X.dissolvedImage(o.dis, p);
  // gölge
  if (o.shadow && p < 1) {
    const g = clamp(1 + f.dy / 160);
    if (g > 0) { ctx.save(); ctx.fillStyle = rgba('#24304F', 0.22 * g * Math.min(1, pk)); ctx.beginPath(); ctx.ellipse(o.x, o.y + 3, o.shadow * (0.6 + 0.4 * g) * Math.min(1, pk), 9 * g, o.rot, 0, TAU); ctx.fill(); ctx.restore(); }
  }
  if (img) {
    const sc = pk * f.sc, rot = o.rot + f.rot + (o.id === 'hammock' ? Math.sin(t * 1.9) * 0.012 * Math.min(1, pk) : 0);
    X.put(ctx, o.spr, o.x + f.dx, o.y + f.dy, sc, rot, 1, img);
  }
  // köpük
  if (o.bub) {
    const cxL = o.spr.w / 2 - o.spr.ax, cyL = o.spr.h / 2 - o.spr.ay;
    const rad = Math.max(o.spr.w, o.spr.h) * 0.5;
    const bx = o.x + f.dx + cxL * f.sc, by = o.y + f.dy + cyL * f.sc;
    const ba = C.pop(t, o.tFly - 0.1, 0.35, 2.4);
    if (t < t0) X.bubble(ctx, bx, by, rad * ba, Math.min(1, ba), t, o.seed);
    else X.bubblePop(ctx, bx, by, rad, (t - t0) / 0.28, o.seed);
  }
  // pop parıltısı
  const spk = seg(t, o.tPop, o.tPop + 0.7);
  if (spk > 0 && spk < 1) {
    const cxL = o.spr.w / 2 - o.spr.ax, cyL = o.spr.h / 2 - o.spr.ay;
    const rr = rng(o.seed + 5);
    for (let i = 0; i < 5; i++) {
      const a = rr.range(0, TAU), d = Math.max(o.spr.w, o.spr.h) * rr.range(0.35, 0.6) * (0.7 + 0.5 * spk);
      R.sparkle(ctx, o.x + cxL + Math.cos(a) * d, o.y + cyL + Math.sin(a) * d * 0.7, rr.range(9, 16) * Math.sin(Math.PI * spk), Math.sin(Math.PI * spk), '#FFF6D6');
    }
  }
}
function drawParticles(ctx, o, t) {
  const t0 = o.tFly + DIS0;
  if (t < t0) return;
  const xf = (sx, sy, tb) => { const f = flyXf(o, tb); const lx = (sx - o.spr.ax) * f.sc, ly = (sy - o.spr.ay) * f.sc; const c = Math.cos(o.rot + f.rot), s = Math.sin(o.rot + f.rot); return [o.x + f.dx + lx * c - ly * s, o.y + f.dy + lx * s + ly * c]; };
  X.dissolveParticles(ctx, o.dis, t, t0, t0 + DISD, xf, { wind: 0.75 });
}

// ---------- kamera ----------
function cam(t, manX) {
  const pb = E.inOutCubic(seg(t, 3.32, 4.2));
  const push = E.inOutSine(seg(t, 3.9, 5.4));
  const tilt = E.inOutSine(seg(t, 5.95, 7.1));
  // adam (dünya x≈320) duruşta ekranın x≈280–320'sinde kalır; nesneler sağda
  const zoom = lerp(1.45, 1.08, pb) + 0.08 * push - 0.06 * tilt;
  const follow = clamp(manX + 165, 100, 700);
  const cx = lerp(follow, 560, pb) - 24 * push - 14 * tilt;
  const cy = lerp(1000, 1040, pb) + 32 * push - 124 * tilt;
  const [bx, by] = R.breathe(t, 3, 2);
  return { zoom, cx: cx + bx, cy: cy + by };
}

module.exports = {
  _dbg: { manState, onArc, MAN },
  init() { skyLayer(); farHills(); midHills(); domeLayer(); sunSprite(); objects(); },
  draw(ctx, t) {
    const ms = manState(Math.min(t, 7.2));
    const [mx, my, ma] = onArc(ms.s);
    const k = cam(t, mx);
    R.camera(ctx, k);
    // gök
    ctx.drawImage(skyLayer(), BX0, -120);
    // güneş (yavaş döner) ve ışıma
    const sun = sunSprite();
    X.put(ctx, sun, 250, 400, 1, t * 0.05);
    // bulutlar (yavaş kayar)
    const cl = [['a', 150, 3, 815, 520, 9], ['b', 92, 8, 330, 735, 6], ['c', 70, 12, 1010, 300, 11], ['d', 60, 21, -120, 470, 7]];
    for (const [key, s, seed, x0, y0, v] of cl) X.put(ctx, cloudSprite(key, s, seed), x0 + v * (t - 2), y0);
    // kuşlar
    ctx.save(); ctx.strokeStyle = '#2A3A6A'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const bx = 1180 - (t - 2.2) * (70 + i * 6) - i * 46, by = 600 + Math.sin(i * 2.1) * 24 + Math.sin(t * 2 + i) * 4;
      const fl = Math.sin(t * 11 + i * 1.7) * 6, s = 11 - i * 0.8;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx - s, by - fl * 0.6); ctx.quadraticCurveTo(bx - s * 0.4, by - 4, bx, by); ctx.quadraticCurveTo(bx + s * 0.4, by - 4, bx + s, by - fl * 0.6); ctx.stroke();
    }
    ctx.restore();
    // uzak tepeler ve dünya
    ctx.drawImage(farHills(), BX0, 1000);
    ctx.drawImage(midHills(), BX0, 1060);
    ctx.drawImage(domeLayer(), BX0, APEX - 70);
    // ağaçlar
    const O = objects();
    for (const T of [O.tB, O.tA]) X.put(ctx, T.spr, T.bx, T.by, 1, T.lean + Math.sin(t * 1.3 + T.bx) * 0.004);
    // nesneler (arka: hamak, minder, çay; ön: tepsi ve meyveler)
    for (const o of O.list) drawObject(ctx, o, t);
    // çay buharı ve tepside lezzet parıltıları
    const tea = O.list.find((o) => o.id === 'tea'), trayO = O.list.find((o) => o.id === 'tray');
    const sa = C.win(t, 4.35, 6.05, 0.4, 0.15);
    if (sa > 0) {
      const ft = flyXf(tea, t), top = [tea.x + ft.dx, tea.y + ft.dy - 84 * 1.12];
      ctx.save(); ctx.globalAlpha = sa * 0.75;
      for (let i = 0; i < 3; i++) {
        const ph = ((t * 0.55 + i / 3) % 1), line = [];
        for (let j = 0; j <= 10; j++) { const u = j / 10; line.push([top[0] + (i - 1) * 9 + Math.sin(u * 5 + t * 3 + i * 2) * 9 * u, top[1] - 8 - u * 70 - ph * 30]); }
        ctx.globalAlpha = sa * 0.7 * Math.sin(Math.PI * ph);
        P.curveStroke(ctx, line, (u) => 6 * (1 - u * 0.6), '#FFFFFF', 290 + i, { bristles: 0, detail: 0 });
      }
      ctx.restore();
    }
    const ga = C.win(t, 5.15, 6.0, 0.25, 0.2);
    if (ga > 0) R.sparkles(ctx, trayO.x, trayO.y - 120, 120, 7, t * 1.3, 311, { alpha: ga, scale: 1.1, rise: 16 });
    // adam
    const wind = 0.12 + 0.2 * E.inOutSine(seg(t, 6.0, 6.8));
    const p = expression(ms.p, t);
    ctx.save(); ctx.translate(mx, my); ctx.rotate(ma);
    ctx.fillStyle = rgba('#24304F', 0.22); ctx.beginPath(); ctx.ellipse(0, 2, MAN.h * 0.13, 8, 0, 0, TAU); ctx.fill();
    ctx.rotate(-ma * (1 - MAN_ROT));
    M.drawMan(ctx, p, { x: 0, y: 0, h: MAN.h, light: LIGHT - ma * MAN_ROT });
    ctx.restore();
    // önde rüzgârda çimen öbekleri
    const tufts = [[-160, 26, 1], [-60, 30, 2], [60, 24, 3], [150, 34, 4], [255, 28, 5], [350, 30, 6], [470, 26, 7], [600, 32, 8], [690, 28, 9], [790, 30, 10], [905, 26, 11], [1040, 30, 12], [1130, 28, 13]];
    for (const [wx, s, sd] of tufts) {
      const [tx, ty, ta] = onArc(arcOfX(wx), -2);
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(ta);
      X.tuft(ctx, 0, 4, s, sd * 7, wind * (0.7 + 0.3 * Math.sin(t * 2.6 + sd)) + Math.sin(t * 3.1 + sd) * 0.05);
      ctx.restore();
    }
    // ön plan çiçek öbekleri (paralaks 1.22, rüzgârda salınır)
    for (const [key, wx, wy, sz, sd, pop] of [['L', 190, 1745, 360, 5, 0.3], ['R', 985, 1760, 320, 9, 0.5]]) {
      const f = 1.22, px = k.cx + (wx - k.cx) * f, py = k.cy + (wy - k.cy) * f;
      X.put(ctx, X.flowerClump('s02' + key, sz, { seed: sd, poppy: pop }), px, py, f, Math.sin(t * 1.7 + sd) * 0.03 + wind * 0.12);
    }
    // dağılan parçacıklar (en önde)
    for (const o of O.list) drawParticles(ctx, o, t);
    // rüzgâr çizgileri (sona doğru)
    const wa = C.win(t, 6.3, 7.3, 0.4, 0.4);
    if (wa > 0) {
      const rr = rng(260);
      for (let i = 0; i < 6; i++) {
        const y0 = rr.range(700, 1150), x0 = ((t - 6.3) * rr.range(380, 520) + rr.range(-200, 600)) % 1300 - 100;
        const line = []; for (let j = 0; j <= 10; j++) { const u = j / 10; line.push([x0 + u * 160, y0 + Math.sin(u * 5 + i + t * 2) * 8]); }
        ctx.save(); ctx.globalAlpha = wa * 0.55; P.curveStroke(ctx, line, 4, '#FFFFFF', 270 + i, { taper: true, bristles: 0, detail: 0 }); ctx.restore();
      }
    }
  },
  sfx: [
    { t: 2.95, type: 'birds', gain: 0.22 },
    { t: 3.9, type: 'pop', gain: 0.28 },
    { t: 4.28, type: 'pop', gain: 0.22 },
    { t: 5.1, type: 'sparkle', gain: 0.3 },
    { t: 6.0, type: 'bubble', gain: 0.3 },
    { t: 6.42, type: 'sand', gain: 0.32 },
    { t: 6.6, type: 'wind', gain: 0.22 },
  ],
};
