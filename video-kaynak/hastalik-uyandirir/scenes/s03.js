// S03 — "mütemadiyen gelenlerin gitmesi" (7.10–9.90 sn)
// Dünya misafirhanesi: kubbeli, iki kapılı taş bir kervansaray. Soldan hiç durmayan bir yolcu akışı gelir (aynı sade adam:
// farklı boy ve yaşlarda; bohçalı, heybeli, asalı, bastonlu), sol kapıdan girer, sağ kapıdan biraz yaşlanmış olarak çıkıp
// sağdan kadrajı terk eder. Uzak tepelerde minik yolcular ufuktan gelir, ufka gider. "mütemadiyen" (7.52) ile akış ve
// zaman hızlanır: güneş gökte yay çizer, bulutlar koşar, gölgeler döner. Kamera ağır ağır sağa kayar.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const Wk = require('./_s02_walk');
const X = require('./_s02_props');
const Sz = require('./_s02_seasons');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, seg, deg } = C;

const T0 = 7.1, T1 = 9.9;
const GROUND = 1222;                 // yakın yolcuların ayak çizgisi
const FAC = { x0: 200, x1: 900, top: 905, base: 1206 };
const DOORS = [{ c: 378, w: 120, top: 956 }, { c: 722, w: 120, top: 956 }];
const BX0 = -60, BX1 = 1160;
const LIGHT = -2.3;

// ---------- zaman: hızlanan akış ----------
// yolcu hızı (px/sn) ve güneş ilerlemesi aynı biçimde "mütemadiyen"de hızlanır
const ACC = (t) => Wk.sm((t - 7.38) / 0.5);
const _tab = (() => {
  const dt = 1 / 600, n = Math.ceil((10.6 - 6.6) / dt);
  const D = new Float64Array(n + 1), S = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const t = 6.6 + i * dt, a = ACC(t);
    D[i + 1] = D[i] + lerp(150, 232, a) * dt;
    S[i + 1] = S[i] + lerp(0.12, 0.42, a) * dt;
  }
  return { dt, n, D, S };
})();
function tabAt(arr, t) { const u = clamp((t - 6.6) / _tab.dt, 0, _tab.n - 1e-9), i = Math.floor(u), k = u - i; return arr[i] + (arr[i + 1] - arr[i]) * k; }
const distAt = (t) => tabAt(_tab.D, t);                    // yolcuların ortak yol ilerlemesi (px)
const sunP = (t) => clamp((tabAt(_tab.S, t) - tabAt(_tab.S, T0)) / (tabAt(_tab.S, T1 + 0.3) - tabAt(_tab.S, T0)) * 1.0 + 0.0, -0.05, 1.05);

// ---------- yolcular ----------
// Sonsuz dizi: i. yolcunun yol üzerindeki gerilik payı s_i (birikimli aralık). x_i(t) = X_START + D(t) - s_i
const X_START = 980;
const TRAV = (() => {
  const r = rng(3031), out = [];
  // görünen pencere için elle seçilmiş çeşitlilik (sağdan çıkanlarda bastonlu yaşlılar, soldan girenlerde gençler)
  const plan = [['none', 0.2], ['sack', 0.3], ['staff', 0.0], ['sack', 0.3], ['none', 0.5], ['bundle', 0.2], ['sack', 0.55], ['staff', 0.1],
    ['staff', 0.0], ['sack', 0.15], ['bundle', 0.0], ['none', 0.1], ['staff', 0.2], ['sack', 0.0], ['bundle', 0.3]];
  let s = 0;
  for (let i = 0; i < 160; i++) {
    const h = r.range(184, 208);
    const pl = plan[i];
    const ageIn = pl ? pl[1] : r.pick([0, 0, 0.1, 0.2, 0.3, 0.45, 0.6]);
    const ageOut = Math.min(1, ageIn + 0.35 + r.range(0, 0.12));
    const kind = pl ? pl[0] : r.pick(['sack', 'sack', 'bundle', 'staff', 'none', 'none', 'bundle', 'sack']);
    out.push({ i, s, h, ageIn, ageOut, kind, seed: r.int(1, 1e6), S: r.range(0.31, 0.35) });
    s += r.range(134, 180);
  }
  return out;
})();
// bir yolcunun t anındaki kök x'i
const travX = (q, t) => 1460 - distAt(T0) + distAt(t) - q.s;

// yolcunun pozu: yaş (taraf), adım; dönen { pose, cane, stick... }
function travState(q, x, side) {
  const age = side === 'out' ? q.ageOut : q.ageIn;
  const cane = side === 'out' && age > 0.72;
  const S = q.S * (1 - 0.32 * age);
  const D = x / q.h;                         // kalça konumu (h birimi)
  const u = D / (2 * S) + (q.seed % 1000) / 1000;
  const D0 = D - 2 * S * u;
  const legs = Wk.steadyLegs(u, S, D0);
  let r = Wk.evalWalker({ D, legs, age, legOpts: { lift: 0.05 * (1 - 0.5 * age) } });
  let pose = r.pose, stick = null;
  const kind = cane ? 'cane' : q.kind;
  if (kind === 'bundle') {
    pose = Object.assign({}, pose, { armN: deg(28), elbowN: deg(118), handN: deg(20), grip: 0.8 });
  } else if (kind === 'staff' || kind === 'cane') {
    const isCane = kind === 'cane';
    const tip = Wk.stickTip(legs[1], isCane ? 0.2 : 0.24, 0.035);
    const hs = Wk.holdStick(pose, [tip[0] - D, tip[1]], isCane ? 0.47 : 0.6, 'N');
    pose = hs.pose; stick = { tip: hs.tip, grip: hs.grip, dir: hs.dir, len: isCane ? 0.52 : 0.98, cane: isCane };
  }
  return { pose, age, kind, stick };
}
// sırt yükleri ve değnekler (drawMan geri çağrıları, yerel koordinat; skel h ölçekli)
function gear(st, q) {
  const o = {};
  const ps = rng(q.seed);
  const sackCol = ps.pick(['#B5653A', '#8E5A9E', '#3F8FA8', '#C9973A']);
  if (st.kind === 'sack') {
    o.behind = (ctx, s, h) => {
      const sh = s.sh, hip = s.hip, td = s.td;
      const bx = lerp(sh[0], hip[0], 0.35) - 0.09 * h, by = lerp(sh[1], hip[1], 0.35);
      const pts = P.blobPts(bx, by, 0.075 * h, 0.12 * h, q.seed % 50, 0.12, 22);
      P.toneShape(ctx, pts, { base: sackCol, dark: C.coolShadow(sackCol, 0.22), light: C.warmLight(sackCol, 0.16), seed: q.seed % 97, rimW: 2, shadowW: 0.22, texture: 0.35, dabs: 2, highlights: 1 });
      ctx.strokeStyle = shade(sackCol, -0.25); ctx.lineWidth = 0.008 * h; ctx.beginPath(); ctx.moveTo(bx - 0.03 * h, by - 0.1 * h); ctx.lineTo(bx + 0.02 * h, by - 0.12 * h); ctx.stroke();
    };
    o.mid = (ctx, s, h) => {
      const a = [s.sh[0] - 0.02 * h, s.sh[1] - 0.005 * h], b = [s.hip[0] + 0.05 * h, s.hip[1] - 0.06 * h];
      ctx.strokeStyle = '#6B3E26'; ctx.lineWidth = 0.014 * h; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(lerp(a[0], b[0], 0.5) + 0.03 * h, lerp(a[1], b[1], 0.5), b[0], b[1]); ctx.stroke();
    };
  } else if (st.kind === 'bundle') {
    o.behind = (ctx, s, h) => {
      const w = s.armN.wrist, sh = s.sh;
      const dx = sh[0] - w[0], dy = sh[1] - w[1], d = Math.hypot(dx, dy) || 1;
      const end = [w[0] + dx / d * 0.3 * h, w[1] + dy / d * 0.3 * h];
      const pts = P.blobPts(end[0] - 0.01 * h, end[1] + 0.06 * h, 0.07 * h, 0.065 * h, q.seed % 60, 0.15, 22);
      P.toneShape(ctx, pts, { base: sackCol, dark: C.coolShadow(sackCol, 0.22), light: C.warmLight(sackCol, 0.16), seed: q.seed % 89, rimW: 2, shadowW: 0.22, texture: 0.35, dabs: 2, highlights: 1 });
      // düğüm
      P.toneShape(ctx, P.ellipsePts(end[0], end[1] + 0.005 * h, 0.022 * h, 0.018 * h, 12), { base: shade(sackCol, -0.1), rim: false, shadowW: 0.3, dabs: 0, texture: 0.2, highlights: 0 });
      // değnek (gövdenin arkasından omza yaslanır; yüzün önünden geçmesin)
      const tip = s.armN.tip;
      const hx = lerp(w[0], tip[0], 0.45), hy = lerp(w[1], tip[1], 0.45);
      const ex = sh[0] - hx, ey = sh[1] - hy, ed = Math.hypot(ex, ey) || 1;
      const a = [hx - ex / ed * 0.04 * h, hy - ey / ed * 0.04 * h], b = [hx + ex / ed * 0.36 * h, hy + ey / ed * 0.36 * h];
      M.partShade(ctx, M.capsule(a, b, 0.016 * h, 0.014 * h, 4), '#8A5532', '#4E2C18', '#B9804E', LIGHT, 0.4);
    };
    o._unused = (ctx, s, h) => {
      const w = s.armN.wrist, tip = s.armN.tip, sh = s.sh;
      const hx = lerp(w[0], tip[0], 0.45), hy = lerp(w[1], tip[1], 0.45);
      const dx = sh[0] - hx, dy = sh[1] - hy, d = Math.hypot(dx, dy) || 1;
      const a = [hx - dx / d * 0.04 * h, hy - dy / d * 0.04 * h], b = [hx + dx / d * 0.36 * h, hy + dy / d * 0.36 * h];
      const cap = M.capsule(a, b, 0.016 * h, 0.014 * h, 4);
      M.partShade(ctx, cap, '#8A5532', '#4E2C18', '#B9804E', LIGHT, 0.4);
    };
  } else if (st.stick) {
    const sk = st.stick;
    o.mid = (ctx, s, h) => {
      const tip = [sk.tip[0] * h, sk.tip[1] * h];
      const top = [tip[0] + sk.dir[0] * sk.len * h, tip[1] + sk.dir[1] * sk.len * h];
      const cap = M.capsule(tip, top, 0.013 * h, 0.017 * h, 4);
      M.partShade(ctx, cap, sk.cane ? '#7A4A2A' : '#9A6A3A', '#4E2C18', '#C08A50', LIGHT, 0.4);
      if (sk.cane) { // baston sapı
        const c = [top[0] + 0.03 * h, top[1]];
        ctx.strokeStyle = '#7A4A2A'; ctx.lineWidth = 0.016 * h; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(c[0], c[1], 0.03 * h, Math.PI, Math.PI * 1.95); ctx.stroke();
      }
    };
  }
  return o;
}
function drawTraveler(ctx, q, x, side, y = GROUND) {
  const st = travState(q, x, side);
  const g = gear(st, q);
  // gölge
  ctx.fillStyle = rgba('#3A2A4A', 0.18); ctx.beginPath(); ctx.ellipse(x + shadowDX * 0.15, y + 2, q.h * 0.14, 6, 0, 0, TAU); ctx.fill();
  M.drawMan(ctx, st.pose, Object.assign({ x: 0, y, h: q.h, age: st.age, light: LIGHT }, g, { x }));
}
let shadowDX = 0;

// ---------- uzak yolcular (tepe yollarında, minik) ----------
const FARPATH = [
  { a: [-140, 1048], b: [212, 1150], h: 50, dir: 1 },   // soldan ufuktan iner, binanın arkasına girer
  { a: [888, 1150], b: [1290, 1030], h: 50, dir: 1 },   // binanın arkasından çıkar, sağ ufka tırmanır
];
function drawFarTravelers(ctx, t, which) {
  const F = FARPATH[which];
  const L = Math.hypot(F.b[0] - F.a[0], F.b[1] - F.a[1]);
  const beta = Math.atan2(F.b[1] - F.a[1], F.b[0] - F.a[0]);
  const cb = Math.cos(beta), sb = Math.sin(beta);
  const warp = (x, y, fa) => [x * cb - y * sb, x * sb + y * cb, fa + beta];
  const d = distAt(t) * 0.42 + which * 37;
  const gap = 82;
  for (let k = Math.floor((d - L) / gap) - 1; k <= Math.floor(d / gap) + 1; k++) {
    const s = d - k * gap;
    if (s < 0 || s > L) continue;
    const r = rng(9000 + k * 7 + which * 1000);
    const age = which ? r.pick([0.4, 0.6, 0.8, 1]) : r.pick([0, 0.1, 0.2, 0.3]);
    const h = F.h * r.range(0.92, 1.08) * lerp(0.85, 1.12, which ? 1 - s / L : s / L);
    const D = s / h, S = 0.3 * (1 - 0.3 * age), u = D / (2 * S) + r.next(), D0 = D - 2 * S * u;
    const res = Wk.evalWalker({ D, legs: Wk.steadyLegs(u, S, D0), age, warp, legOpts: { lift: 0.045 } });
    const px = F.a[0] + cb * s, py = F.a[1] + sb * s;
    const fade = Math.min(1, s / 60, (L - s) / 60);
    M.drawMan(ctx, res.pose, { x: px, y: py, h, age, light: LIGHT, alpha: fade, rim: false });
  }
}

// ---------- önbellekli katmanlar ----------
function skyCanvas(key, cols, stops) {
  return R.cached('s03:sky' + key, BX1 - BX0, 1200, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, BX1 - BX0, 1200);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: BX1 - BX0, y1: 1200, w: BX1 - BX0, h: 1200 }, cols, { seed: 307, stops, wMin: 22, wMax: 40, lMin: 90, lMax: 270, mixJitter: 0.06 });
  });
}
const SKY_DAWN = () => skyCanvas('dawn', ['#3B3F9A', '#6B5DB0', '#B07AB8', '#F09AA0', '#FCC79A', '#FFE6B8'], [0, 0.2, 0.42, 0.62, 0.82, 1]);
const SKY_DAY = () => skyCanvas('day', ['#1C4FB0', '#2662C4', '#2E86CE', '#46ADD6', '#9ED8E6', '#E8F4E8'], [0, 0.18, 0.38, 0.58, 0.8, 1]);
const SKY_DUSK = () => skyCanvas('dusk', ['#2A2F7A', '#5B4A9A', '#C0679A', '#F08A62', '#FDB25A', '#FFE08A'], [0, 0.2, 0.42, 0.62, 0.82, 1]);

function hillsCanvas() {
  return R.cached('s03:hills', BX1 - BX0, 520, (x) => {
    const oy = 900, W = BX1 - BX0, r = rng(311);
    const layer = (fn, cols, seed) => {
      const top = []; for (let i = 0; i <= 100; i++) { const wx = BX0 + W * i / 100; top.push([wx - BX0, fn(wx) - oy]); }
      const poly = top.concat([[W, 520], [0, 520]]);
      x.save(); x.clip(P.pathOf(poly)); x.fillStyle = cols[0]; x.fillRect(0, 0, W, 520); x.restore();
      P.bandFill(x, poly, { x0: 0, y0: 0, x1: W, y1: 520, w: W, h: 520 }, [cols[1], cols[0], cols[2]], { seed, wMin: 14, wMax: 26, lMin: 60, lMax: 200, stops: [0, 0.2, 1], angle: 0.02 });
      for (let i = 0; i < 30; i++) { const k = r.int(1, 97), p0 = top[k], p1 = top[k + 2]; P.stroke(x, p0[0], p0[1] + 5, p1[0], p1[1] + 5, r.range(5, 9), shade(cols[1], 0.05), r.int(1, 1e9), { detail: 0.4 }); }
      return top;
    };
    layer((wx) => 1015 - 55 * Math.max(0, Math.sin(wx * 0.004 + 0.6)) ** 2 - 18 * Math.sin(wx * 0.011 + 1.3), ['#8E9FD0', '#B7C3E6', '#6F7DB8'], 312);
    // yakın tepeler: sol iniş ve sağ çıkış yolları için yamaç
    const nearFn = (wx) => wx < 212 ? lerp(1040, 1150, clamp((wx + 140) / 352)) + 10 * Math.sin(wx * 0.02) : wx > 888 ? lerp(1150, 1025, clamp((wx - 888) / 402)) + 10 * Math.sin(wx * 0.02) : 1150;
    layer(nearFn, ['#5FA86E', '#9FD27A', '#3D8A62'], 313);
    // yollar (açık toprak şerit)
    for (const F of FARPATH) {
      const line = []; for (let i = 0; i <= 20; i++) { const u = i / 20; line.push([lerp(F.a[0], F.b[0], u) - BX0, lerp(F.a[1], F.b[1], u) - oy + 4]); }
      P.curveStroke(x, line, 9, '#E9C88A', 314, { bristles: 2 });
    }
    // serviler
    for (const [wx, hh] of [[-90, 120], [10, 150], [92, 112], [150, 170], [950, 165], [1010, 120], [1090, 150], [1180, 130], [1260, 110]]) {
      const gy = nearFn(wx) - oy + 6;
      R.cypress(x, wx - BX0, gy, hh, Math.round(wx + 500), { base: '#2C7A55', dark: '#185440', light: '#5CA867' });
    }
  });
}
function groundCanvas() {
  return R.cached('s03:ground', BX1 - BX0, 150, (x) => {
    const oy = 1140, W = BX1 - BX0, r = rng(321);
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, W, 150);
    // çimen (sakin, yatay)
    P.bandFill(x, null, { x0: 0, y0: 0, x1: W, y1: 150, w: W, h: 150 }, ['#7DC04E', '#5DAE50', '#3E9A4F'], { seed: 322, wMin: 18, wMax: 30, lMin: 90, lMax: 300 });
    // yol
    const ry0 = 1196 - oy, ry1 = 1262 - oy;
    const road = [[0, ry0], [W, ry0], [W, ry1], [0, ry1]];
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 5; x.setLineDash([90, 60, 30, 120]); x.beginPath(); x.moveTo(0, ry1 + 2); x.lineTo(W, ry1 + 2); x.stroke(); x.restore();
    P.bandFill(x, road, { x0: 0, y0: ry0 - 10, x1: W, y1: ry1 + 10, w: W, h: ry1 - ry0 + 20 }, ['#F2D49A', '#E3B979', '#C9965E'], { seed: 323, wMin: 12, wMax: 20, lMin: 60, lMax: 200 });
    for (let i = 0; i < 60; i++) { const px = r.range(0, W), py = r.range(ry0 + 8, ry1 - 4); x.fillStyle = rgba(r.chance(0.5) ? '#B5885A' : '#FFF0C8', 0.7); x.beginPath(); x.ellipse(px, py, r.range(2, 5), r.range(1.5, 3), 0, 0, TAU); x.fill(); }
  });
}

// ---------- kervansaray ----------
function doorPts(d, dy0 = 0, grow = 0) {
  const x0 = d.c - d.w / 2 - grow, x1 = d.c + d.w / 2 + grow, top = d.top - grow, y1 = FAC.base + dy0;
  const sp = d.top + d.w * 0.55;
  return [[x0, y1], ...P.smoothPts([[x0, sp], [x0 + d.w * 0.12, sp - d.w * 0.32], [d.c, top], [x1 - d.w * 0.12, sp - d.w * 0.32], [x1, sp]], false, 6), [x1, y1]];
}
const HX = 120, HY = 700; // sprite kökü (dünya)
function hanSprite() {
  return X.sprite('s03:han', 900, 540, 0, 0, (x) => {
    x.translate(-HX, -HY);
    const r = rng(331);
    const stone = '#EDBB7C', stoneL = '#F9D69E', stoneD = '#BE8270';
    const tileT = '#2FA9B8', tileD = '#1C5E9A';
    const sOpt = (seed, extra = {}) => Object.assign({ base: stone, dark: stoneD, light: stoneL, seed, shadowW: 0.08, lightW: 0.05, coreScale: 0.97, dabs: 8, dabW: 7, highlights: 2, texture: 0.5, rimW: 4 }, extra);
    // kubbe ve kasnak (duvarın arkasında)
    const dc = [550, 896];
    P.toneShape(x, P.rectPts(462, 866, 176, 44), sOpt(332, { base: '#E2AE74', shadowW: 0.2, dabs: 3 }));
    for (let k = 0; k < 6; k++) { const wx = 478 + k * 29; x.fillStyle = '#4A2A40'; x.fillRect(wx, 878, 9, 20); }
    const R0 = 122;
    const dome = P.smoothPts([[dc[0] - R0, dc[1] - 30], [dc[0] - R0 * 0.94, dc[1] - 30 - R0 * 0.45], [dc[0] - R0 * 0.62, dc[1] - 30 - R0 * 0.86], [dc[0], dc[1] - 30 - R0 * 1.02], [dc[0] + R0 * 0.62, dc[1] - 30 - R0 * 0.86], [dc[0] + R0 * 0.94, dc[1] - 30 - R0 * 0.45], [dc[0] + R0, dc[1] - 30]], false, 8).concat([[dc[0] + R0, dc[1] - 26], [dc[0] - R0, dc[1] - 26]]);
    P.toneShape(x, dome, { base: '#5876C4', dark: '#363C8A', light: '#A2BCEC', seed: 333, shadowW: 0.2, lightW: 0.12, dabs: 7, dabW: 9, rimW: 5, strokeAng: -0.6 });
    x.save(); x.clip(P.pathOf(dome)); x.strokeStyle = rgba('#2E3576', 0.3); x.lineWidth = 3;
    for (let i = -4; i <= 4; i++) { x.beginPath(); x.moveTo(dc[0] + i * 28, dc[1] - 28); x.quadraticCurveTo(dc[0] + i * 21, dc[1] - 30 - R0 * 0.7, dc[0], dc[1] - 30 - R0 * 1.02); x.stroke(); }
    x.restore();
    const apex = dc[1] - 30 - R0 * 1.02;
    x.strokeStyle = '#C9902E'; x.lineWidth = 4; x.beginPath(); x.moveTo(dc[0], apex); x.lineTo(dc[0], apex - 26); x.stroke();
    P.toneShape(x, P.ellipsePts(dc[0], apex - 22, 8, 8, 14), { base: '#E8B23A', dark: '#B77F1E', light: '#FFE08A', rim: false, shadowW: 0.3, dabs: 0, texture: 0.2, highlights: 1, seed: 334 });
    // köşe kuleleri
    for (const tx of [FAC.x0, FAC.x1]) {
      const tw = 64, tt = 872;
      P.toneShape(x, P.rectPts(tx - tw / 2, tt, tw, FAC.base - tt), sOpt(335 + tx, { base: '#E6B072', shadowW: 0.26, lightW: 0.16, dabs: 4, strokeAng: Math.PI / 2, texAng: Math.PI / 2 }));
      for (let k = 0; k < 3; k++) P.toneShape(x, P.rectPts(tx - tw / 2 + 3 + k * 22, tt - 16, 14, 17), { base: '#E6B072', dark: stoneD, light: stoneL, rim: false, shadowW: 0.3, dabs: 0, highlights: 0, seed: 336 + k });
      x.fillStyle = '#4A2A3E'; x.fillRect(tx - 4, 935, 8, 30); x.fillRect(tx - 4, 1050, 8, 30);
    }
    // ana duvar
    const wall = P.rectPts(FAC.x0 + 30, FAC.top, FAC.x1 - FAC.x0 - 60, FAC.base - FAC.top);
    P.toneShape(x, wall, sOpt(337, { shadowW: 0.05, lightW: 0.035, coreScale: 0.985, dabs: 12, strokeAng: 0 }));
    x.save(); x.clip(P.pathOf(wall)); x.strokeStyle = rgba('#B47C6C', 0.38); x.lineWidth = 2.2;
    let row = 0;
    for (let y = FAC.top + 46; y < FAC.base; y += 34, row++) {
      x.beginPath(); x.moveTo(FAC.x0, y); x.lineTo(FAC.x1, y + r.range(-1, 1)); x.stroke();
      for (let bx = FAC.x0 + (row % 2) * 34; bx < FAC.x1; bx += 68 + r.range(-6, 6)) { x.beginPath(); x.moveTo(bx, y); x.lineTo(bx, y - 34); x.stroke(); }
    }
    x.restore();
    // çini friz ve mazgallar
    P.toneShape(x, P.rectPts(FAC.x0 + 30, FAC.top, FAC.x1 - FAC.x0 - 60, 24), { base: tileT, dark: tileD, light: '#7FD6DE', rim: false, seed: 338, shadowW: 0.3, dabs: 3, dabW: 6, texture: 0.35 });
    for (let bx = FAC.x0 + 44; bx < FAC.x1 - 40; bx += 26) { x.fillStyle = '#FBF2DA'; x.beginPath(); x.moveTo(bx, FAC.top + 12); x.lineTo(bx + 7, FAC.top + 5); x.lineTo(bx + 14, FAC.top + 12); x.lineTo(bx + 7, FAC.top + 19); x.closePath(); x.fill(); x.fillStyle = '#1C5E9A'; x.beginPath(); x.arc(bx + 7, FAC.top + 12, 2.2, 0, TAU); x.fill(); }
    for (let bx = FAC.x0 + 38; bx < FAC.x1 - 40; bx += 28) P.toneShape(x, P.rectPts(bx, FAC.top - 13, 15, 14), { base: stone, dark: stoneD, light: stoneL, rim: false, shadowW: 0.3, dabs: 0, highlights: 0, seed: 339 + bx });
    // ortada sivri kemerli pencereler
    for (const wx of [490, 550, 610]) {
      const wp = [[wx - 12, 1010], ...P.smoothPts([[wx - 12, 975], [wx, 956], [wx + 12, 975]], false, 4), [wx + 12, 1010]];
      P.toneShape(x, wp, { base: '#3E2440', dark: '#2A1830', light: '#5A3450', rim: false, shadowW: 0.2, dabs: 0, highlights: 0, seed: 340 });
      x.strokeStyle = rgba(tileT, 0.9); x.lineWidth = 3; x.stroke(P.pathOf(wp));
    }
    // taç kapılar (pishtak)
    for (const d of DOORS) {
      const pw = 178, ptop = 850;
      const pf = P.rectPts(d.c - pw / 2, ptop, pw, FAC.base - ptop);
      P.toneShape(x, pf, sOpt(341 + d.c, { base: '#F3CA8E', light: '#FFE6B8', dabs: 6, strokeAng: Math.PI / 2, texAng: Math.PI / 2, rimW: 5 }));
      for (let k = 0; k < 5; k++) P.toneShape(x, P.rectPts(d.c - pw / 2 + 8 + k * 35, ptop - 15, 18, 16), { base: '#F3CA8E', dark: stoneD, light: '#FFE6B8', rim: false, shadowW: 0.3, dabs: 0, highlights: 0, seed: 342 + k });
      // çini çerçeve (geometrik benek dizisi)
      x.save(); x.strokeStyle = tileT; x.lineWidth = 11; x.strokeRect(d.c - pw / 2 + 13, ptop + 13, pw - 26, FAC.base - ptop - 13);
      x.strokeStyle = '#FBF2DA'; x.lineWidth = 2.5; x.setLineDash([5, 9]); x.strokeRect(d.c - pw / 2 + 13, ptop + 13, pw - 26, FAC.base - ptop - 13); x.restore();
      // iki köşede küçük çini rozet
      for (const sx of [-1, 1]) { const cx2 = d.c + sx * 60, cy2 = ptop + 52; P.toneShape(x, P.ellipsePts(cx2, cy2, 13, 13, 16), { base: tileT, dark: tileD, light: '#8FE0E6', rim: false, shadowW: 0.25, dabs: 0, texture: 0.25, highlights: 1, seed: 345 }); x.fillStyle = '#FBF2DA'; x.beginPath(); x.arc(cx2, cy2, 4, 0, TAU); x.fill(); }
      // kemerli niş (iwan)
      const niche = doorPts(d, 0, 24);
      P.toneShape(x, niche, { base: '#D8936A', dark: '#9A5E62', light: '#F2B886', rim: false, seed: 343 + d.c, shadowW: 0.18, lightW: 0.05, dabs: 3, dabW: 6, strokeAng: Math.PI / 2 });
      x.save(); x.clip(P.pathOf(niche));
      for (let rw = 0; rw < 3; rw++) for (let k = -3; k <= 3; k++) {
        const cx2 = d.c + k * 21 + (rw % 2) * 10.5, cy2 = d.top - 12 + rw * 15;
        x.fillStyle = rw % 2 ? '#B87060' : '#F6C79A'; x.beginPath(); x.arc(cx2, cy2, 8.5, Math.PI, 0); x.fill();
      }
      x.restore();
    }
    // kapı boşluklarını kes
    // (not: napi-rs'de ötelenmiş dönüşümle destination-out etkisiz kaldı; birim dönüşümle kesiyoruz)
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; x.globalAlpha = 1;
    for (const d of DOORS) x.fill(P.pathOf(P.translatePts(doorPts(d, 9), -HX, -HY)));
    x.restore();
    for (const d of DOORS) { x.strokeStyle = rgba('#FBF2DA', 0.9); x.lineWidth = 4; x.stroke(P.pathOf(doorPts(d, 0, 3).slice(0, -1), false)); }
  });
}
function doorInterior(d) {
  return X.sprite('s03:door' + d.c, d.w + 20, FAC.base - d.top + 40, d.w / 2 + 10, 10, (x) => {
    x.translate(-(d.c - d.w / 2 - 10), -(d.top - 10));
    const pts = doorPts(d, 30, 4);
    x.save(); x.clip(P.pathOf(pts));
    x.fillStyle = '#2E1A34'; x.fillRect(d.c - 100, d.top - 20, 200, 400);
    // arkada aydınlık avlu kapısı
    P.glow(x, d.c, FAC.base - 60, 90, '#FFB060', 0.35);
    const back = [[d.c - 26, FAC.base - 4], ...P.smoothPts([[d.c - 26, FAC.base - 78], [d.c - 18, FAC.base - 98], [d.c, FAC.base - 112], [d.c + 18, FAC.base - 98], [d.c + 26, FAC.base - 78]], false, 5), [d.c + 26, FAC.base - 4]];
    P.toneShape(x, back, { base: '#E9A866', dark: '#B9705A', light: '#FFD69A', rim: false, shadowW: 0.2, lightW: 0.1, dabs: 1, texture: 0.3, seed: 350 });
    // zemin ışığı
    const g = x.createLinearGradient(0, FAC.base - 60, 0, FAC.base + 30);
    g.addColorStop(0, 'rgba(255,170,90,0)'); g.addColorStop(1, 'rgba(255,170,90,0.35)');
    x.fillStyle = g; x.fillRect(d.c - 100, FAC.base - 60, 200, 100);
    x.restore();
  });
}
// ---------- su (yansıma) ve ön kıyı ----------
const WY = 1268, WB = 1712;
function rippleCanvas() {
  return R.cached('s03:ripple', BX1 - BX0 + 200, WB - WY, (x) => {
    const r = rng(361), W = BX1 - BX0 + 200, Hh = WB - WY;
    for (let i = 0; i < 520; i++) {
      const y = Math.pow(r.next(), 0.8) * Hh, len = r.range(30, 150) * (0.5 + y / Hh), w = r.range(2, 5) * (0.6 + y / Hh * 0.8);
      const px = r.range(0, W);
      const col = r.chance(0.55) ? rgba('#E8F6FF', r.range(0.25, 0.55)) : rgba('#16335E', r.range(0.18, 0.35));
      P.stroke(x, px, y, px + len, y + r.range(-1, 1), w, col, r.int(1, 1e9), { detail: 0, taper1: 0.5 });
    }
  });
}
function bankCanvas() {
  return R.cached('s03:bank', BX1 - BX0, 300, (x) => {
    const oy = 1690, W = BX1 - BX0, r = rng(371);
    const top = []; for (let i = 0; i <= 60; i++) { const wx = W * i / 60; top.push([wx, 26 + 14 * Math.sin(i * 0.7) + 8 * Math.sin(i * 1.9)]); }
    const poly = top.concat([[W, 300], [0, 300]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 5; x.setLineDash([80, 50, 30, 90]); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(P.pathOf(poly)); x.fillStyle = '#3E8A4A'; x.fillRect(0, 0, W, 300); x.restore();
    P.bandFill(x, poly, { x0: 0, y0: 0, x1: W, y1: 300, w: W, h: 300 }, ['#6DB64E', '#3E9A4F', '#2A7444'], { seed: 372, wMin: 16, wMax: 28, lMin: 60, lMax: 200 });
    // sazlar ve çiçekler
    for (let i = 0; i < 70; i++) {
      const bx = r.range(0, W), hh = r.range(40, 110), lean = r.range(-0.25, 0.25), by = 40 + r.range(0, 30);
      const line = []; for (let k = 0; k <= 6; k++) { const u = k / 6; line.push([bx + Math.sin(lean) * hh * u * u, by - hh * u]); }
      P.curveStroke(x, line, (u) => 6 * (1 - u * 0.8), r.pick(['#2F7A45', '#4FA352', '#8CC84B']), r.int(1, 1e9), { bristles: 1 });
      if (r.chance(0.18)) { P.toneShape(x, P.ellipsePts(line[6][0], line[6][1] + 10, 5, 13, 12), { base: '#7A4A2E', dark: '#4A2A1C', light: '#A8703F', rim: false, shadowW: 0.3, dabs: 0, highlights: 0, texture: 0.2, seed: i }); }
    }
    for (let i = 0; i < 40; i++) R.flower(x, r.range(0, W), r.range(70, 200), r.range(9, 15), r.int(1, 99), { color: r.pick(['#FBF6FF', '#FFF0F5', '#FFE58A']) });
  });
}
// kapı içi + basamak bölgesi (içerideki yolcuların görüneceği kırpma)
function doorClip() {
  const p = new (require('@napi-rs/canvas').Path2D)();
  for (const d of DOORS) p.addPath(P.pathOf(doorPts(d, 26, 0)));
  return p;
}

// gök evreleri: şafak → gün ("mütemadiyen" ile, 7.55) → akşam ("gitmesi" ile, 9.0). Ana karede geçiş, güneşle birlikte
// soldan sağa ilerleyen boya darbeleri cephesiyle olur (yarı saydam karışımın griye çalan çamurunu önler); yansımada kısa karışım.
const SKYTR = [{ a: 7.48, b: 8.22, seed: 5 }, { a: 8.94, b: 9.66, seed: 9 }];
const SKIES = [SKY_DAWN, SKY_DAY, SKY_DUSK];
function skyState(t) {
  if (t < SKYTR[0].a) return [0, 0, 0];
  if (t < SKYTR[0].b) return [0, 1, (t - SKYTR[0].a) / (SKYTR[0].b - SKYTR[0].a), SKYTR[0].seed];
  if (t < SKYTR[1].a) return [1, 1, 0];
  if (t < SKYTR[1].b) return [1, 2, (t - SKYTR[1].a) / (SKYTR[1].b - SKYTR[1].a), SKYTR[1].seed];
  return [2, 2, 0];
}
// Işık cephesi maskesi (yarım çözünürlük, ekran uzayı): yeni gök, güneşten dışa doğru yayılan yumuşak bir ışık gibi gelir.
// Yumuşak radyal çekirdek + cephenin önünde yarı saydam yatay fırça darbeleri (gök bantları gibi) → sert kenar/dikiş yok.
const MR = 0.5;
let _mask = null, _skyB = null, _mdabs = null;
function maskDabs() {
  if (_mdabs) return _mdabs;
  const r = rng(3077), out = [];
  for (let y = -40; y < 1500; y += 26) for (let x = -120 + r.range(0, 60); x < C.W + 160; x += r.range(70, 120)) {
    const L = r.range(140, 260), w = r.range(30, 52);
    out.push({ x: x + r.range(-20, 20), y: y + r.range(-8, 8), path: P.pathOf(P.brushPts(-L / 2, 0, L / 2, r.range(-6, 6), w, r.int(1, 1e9), { taper0: r.range(0.5, 0.9), taper1: r.range(0.5, 0.9), wob: 0.1 })), n: r.next() });
  }
  _mdabs = out; return out;
}
function lightMask(p, sun) {
  const { createCanvas } = require('@napi-rs/canvas');
  if (!_mask) _mask = createCanvas(C.W * MR, C.H * MR);
  const m = _mask.getContext('2d');
  m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, C.W * MR, C.H * MR);
  const maxD = Math.max(...[[0, 0], [C.W, 0], [0, 1500], [C.W, 1500]].map(([x, y]) => Math.hypot(x - sun[0], y - sun[1])));
  const F = 520;                                         // cephe yumuşaklığı (px)
  const Rf = lerp(-F * 0.3, maxD + F * 1.2, E.inOutSine(p));
  // çekirdek: güneş çevresinde dolu, cephe boyunca yumuşak
  m.setTransform(MR, 0, 0, MR, 0, 0);
  if (Rf > 0) {
    const g = m.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], Rf);
    const k = clamp(1 - F / Rf);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(k, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = g; m.fillRect(-20, -20, C.W + 40, 1560);
  }
  // fırça darbeleri cephenin önünde (yarı saydam, kademeli)
  for (const d of maskDabs()) {
    const dd = Math.hypot(d.x - sun[0], (d.y - sun[1]) * 1.15);
    const a = clamp((Rf + F * 0.35 + (d.n - 0.5) * F * 0.7 - dd) / (F * 0.55));
    if (a <= 0.01) continue;
    m.globalAlpha = a > 0.97 ? 1 : a;
    m.setTransform(MR, 0, 0, MR, d.x * MR, d.y * MR);
    m.fillStyle = '#000'; m.fill(d.path);
  }
  m.globalAlpha = 1;
  return _mask;
}
// c: hedef bağlam; sun: güneşin ekran konumu (null = yansıma, kısa karışım)
function drawSky(c, t, sun) {
  const [s, n, p] = skyState(t);
  c.drawImage(SKIES[s](), BX0, -40);
  if (p <= 0) return;
  if (!sun) { c.save(); c.globalAlpha = E.inOutSine(p); c.drawImage(SKIES[n](), BX0, -40); c.restore(); return; }
  const { createCanvas } = require('@napi-rs/canvas');
  if (!_skyB) _skyB = createCanvas(C.W, C.H);
  const b = _skyB.getContext('2d');
  b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, C.W, C.H);
  b.setTransform(c.getTransform()); b.drawImage(SKIES[n](), BX0, -40);
  b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'destination-in'; b.drawImage(lightMask(p, sun), 0, 0, C.W, C.H);
  b.globalCompositeOperation = 'source-over';
  const mm = c.getTransform(); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(_skyB, 0, 0); c.restore(); c.setTransform(mm);
}
let _refl = null;
function drawReflection(ctx, t, vis, sp, sx, sy, wDawn, wDusk) {
  const { createCanvas } = require('@napi-rs/canvas');
  // (tam boy tuvalden drawImage her çağrıda bütün tuvali kopyalıyor: yansımayı yalnız su yüksekliğinde bir tuvale çiz)
  // yarım çözünürlük: su yansıması zaten yumuşak; hem hızlı hem doğal
  const HR = 0.5;
  if (!_refl) _refl = createCanvas(C.W * HR, 300);
  const rx = _refl.getContext('2d');
  const m = ctx.getTransform();
  const y0 = Math.max(0, m.f + m.d * WY), y1 = Math.min(C.H, m.f + m.d * WB, y0 + 600);
  rx.setTransform(1, 0, 0, 1, 0, 0); rx.clearRect(0, 0, C.W * HR, 300);
  rx.setTransform(m.a * HR, m.b * HR, m.c * HR, m.d * HR, m.e * HR, (m.f - y0) * HR);
  rx.translate(0, 2 * WY); rx.scale(1, -1);
  drawSky(rx, t, null);
  P.glow(rx, sx, sy, 160, '#FFF0C0', 0.6);
  rx.drawImage(hillsCanvas(), BX0, 900);
  rx.drawImage(groundCanvas(), BX0, 1140);
  for (const d of DOORS) X.put(rx, doorInterior(d), d.c, d.top - 10);
  X.put(rx, hanSprite(), HX, HY);
  for (const [q, x] of vis) if (x < DOORS[0].c || x >= DOORS[1].c) drawTraveler(rx, q, x, x < DOORS[0].c ? 'in' : 'out');
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  // taban su rengi
  ctx.fillStyle = mix(mix('#2C6E9E', '#4C4A9C', wDawn * 0.55), '#5A3F88', wDusk * 0.7); ctx.fillRect(0, y0, C.W, y1 - y0);
  const step = 5;
  for (let y = Math.floor(y0); y < y1; y += step) {
    const k = (y - y0) / (y1 - y0);
    const off = Math.sin(y * 0.09 + t * 2.4) * (2 + 6 * k) + Math.sin(y * 0.031 - t * 1.3) * 3 * k;
    ctx.globalAlpha = 0.62 - 0.22 * k;
    ctx.drawImage(_refl, 0, (y - y0) * HR, C.W * HR, step * HR, off, y, C.W, step);
  }
  ctx.globalAlpha = 1;
  // su tonu: derinleştikçe kobalt
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  const wc = (a, b, c) => { const w = Math.max(wDawn * 0.6, wDusk); const dc = wDusk > 0 ? b : c; return rgba(mix(a[0], dc[0], w), lerp(a[1], dc[1], w)); };
  g.addColorStop(0, wc(['#286EA0', 0.2], ['#B0607A', 0.1], ['#9A6AA8', 0.12])); g.addColorStop(0.45, wc(['#1E5496', 0.34], ['#6A4290', 0.26], ['#5A4A9A', 0.28])); g.addColorStop(1, wc(['#183878', 0.45], ['#3A2A70', 0.42], ['#38306E', 0.42]));
  ctx.fillStyle = g; ctx.fillRect(0, y0, C.W, y1 - y0);
  ctx.restore();
  // dalgacık darbeleri (dünya uzayında, ağır kayar)
  ctx.save(); ctx.beginPath(); ctx.rect(BX0, WY, BX1 - BX0, WB - WY); ctx.clip();
  ctx.drawImage(rippleCanvas(), BX0 - 100 + Math.sin(t * 0.7) * 30 - (t - 7) * 12, WY);
  // kıyı çizgisi: ıslak kum ve küçük taşlar
  ctx.fillStyle = rgba('#8A6A4A', 0.5); ctx.fillRect(BX0, WY - 1, BX1 - BX0, 5);
  ctx.restore();
}

module.exports = {
  _dbg: { TRAV, travX, DOORS },
  init() { SKY_DAWN(); SKY_DAY(); SKY_DUSK(); hillsCanvas(); groundCanvas(); hanSprite(); for (const d of DOORS) doorInterior(d); },
  draw(ctx, t) {
    const sp = sunP(t);
    // kamera: ağır sağa kayma + hafif yaklaşma
    const k = 0.35 * E.inOutSine(seg(t, T0 - 0.1, 8.7)) + 0.65 * E.inOutSine(seg(t, 8.45, T1 + 0.3));
    const [bx, by] = R.breathe(t, 2.5, 3);
    R.camera(ctx, { zoom: lerp(1.17, 1.21, k), cx: lerp(470, 640, k) + bx, cy: 1000 + by });
    // gök: şafak → gün → akşam
    const wDawn = 1 - E.smooth(seg(t, SKYTR[0].a, SKYTR[0].b)), wDusk = E.smooth(seg(t, SKYTR[1].a, SKYTR[1].b));
    // güneş yayı (gök geçişinin ışık cephesi güneşten yayılır)
    const th = lerp(Math.PI * 0.97, Math.PI * 0.08, clamp(sp / 0.84));
    const sx = 560 + Math.cos(th) * 560, sy = 1120 - Math.sin(th) * 700;
    const tm = ctx.getTransform();
    drawSky(ctx, t, [tm.a * sx + tm.c * sy + tm.e, tm.b * sx + tm.d * sy + tm.f]);
    const sunCol = mix('#FFE3B0', '#FFF6D8', Math.sin(th));
    R.sun(ctx, sx, sy, 70, t * 2, { glow: sunCol, disk: mix('#FFE0A8', '#FFF3C4', Math.sin(th)), ring: mix('#F6A23A', '#F6D23A', Math.sin(th)), seed: 4 });
    shadowDX = (552 - sx) * 0.35;
    // koşan bulutlar (zaman hızlandıkça hızlanır)
    const cl = [[150, 3, -80, 300, 1.0], [100, 8, 420, 520, 1.35], [80, 12, 780, 230, 0.9], [120, 21, -620, 620, 1.2], [70, 5, 1060, 640, 1.5]];
    for (const [s, seed, x0, y0, v] of cl) {
      const xx = ((x0 + tabAt(_tab.S, t) * 1500 * v + 400) % 2200) - 600;
      X.put(ctx, X.sprite('s03:cl' + seed, s * 2.6, s * 1.5, s * 1.3, s * 0.95, (x) => R.cloud(x, s * 1.3, s * 0.95, s, seed, { lightAng: -2.0 })), xx, y0);
    }
    // tepeler ve uzak yolcular
    ctx.drawImage(hillsCanvas(), BX0, 900);
    drawFarTravelers(ctx, t, 0); drawFarTravelers(ctx, t, 1);
    ctx.drawImage(groundCanvas(), BX0, 1140);
    // binanın yer gölgesi (güneşle döner)
    ctx.save(); ctx.fillStyle = rgba('#3A2A5A', 0.2);
    ctx.beginPath(); ctx.moveTo(FAC.x0 - 30, FAC.base); ctx.lineTo(FAC.x1 + 30, FAC.base); ctx.lineTo(FAC.x1 + 30 + shadowDX, FAC.base + 46); ctx.lineTo(FAC.x0 - 30 + shadowDX, FAC.base + 46); ctx.closePath(); ctx.fill(); ctx.restore();
    // kapı içleri ("gelenlerin" 8.30 sol kapı, "gitmesi" 8.94 sağ kapı ışıyarak vurgulanır)
    for (const d of DOORS) X.put(ctx, doorInterior(d), d.c, d.top - 10);
    const beat = [C.win(t, 8.22, 8.95, 0.12, 0.5), C.win(t, 8.86, 9.6, 0.12, 0.5)];
    ctx.save(); ctx.clip(doorClip());
    DOORS.forEach((d, i) => { if (beat[i] > 0) P.glow(ctx, d.c, FAC.base - 110, 150, '#FFB25A', 0.5 * beat[i]); });
    ctx.restore();
    // yolcular: içeride olanlar (kapı arasında) kapı boşluğuna kırpılır
    const vis = [];
    const D = distAt(t);
    for (const q of TRAV) { const x = travX(q, t); if (x > -160 && x < 1300) vis.push([q, x]); }
    ctx.save(); ctx.clip(doorClip());
    for (const [q, x] of vis) if (x >= DOORS[0].c && x < DOORS[1].c) drawTraveler(ctx, q, x, x < 550 ? 'in' : 'out');
    // kapı gölgesi: içeri girdikçe karanlığa
    for (const [d, sgn] of [[DOORS[0], 1], [DOORS[1], -1]]) {
      const x0 = d.c + sgn * 34, x1 = d.c + sgn * 80;
      const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(40,20,48,0)'); g.addColorStop(1, 'rgba(40,20,48,0.6)');
      ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1) - (sgn > 0 ? 0 : 60), d.top - 20, Math.abs(x1 - x0) + 60, FAC.base - d.top + 60);
    }
    ctx.restore();
    // fenerler
    // fenerler kemerin tepesinde (yolcuların başına değmez; katman sıçraması olmasın)
    DOORS.forEach((d, i) => {
      ctx.strokeStyle = '#4A2A3A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.c, d.top + 2); ctx.lineTo(d.c, d.top + 9); ctx.stroke();
      R.lantern(ctx, d.c, d.top + 46, 33, 1 + 0.35 * beat[i], t + d.c);
    });
    // bina
    X.put(ctx, hanSprite(), HX, HY);
    // ışık tonu: sabah pembe, akşam altın
    // dışarıdaki yolcular
    for (const [q, x] of vis) if (x < DOORS[0].c) drawTraveler(ctx, q, x, 'in');
    for (const [q, x] of vis) if (x >= DOORS[1].c) drawTraveler(ctx, q, x, 'out');
    // su: sahnenin ters yansıması, dalgacıklı şeritler hâlinde
    drawReflection(ctx, t, vis, sp, sx, sy, wDawn, wDusk);
    ctx.drawImage(bankCanvas(), BX0, 1690);
    // zaman tonu (bütün sahneye çok hafif)
    const tint = wDawn > 0 ? ['#FF8FA0', 0.1 * wDawn] : ['#FF9A3A', 0.12 * wDusk];
    if (tint[1] > 0.002) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = rgba(tint[0], tint[1] * 3); ctx.fillRect(BX0, -100, BX1 - BX0, 2200); ctx.restore(); }
  },
  sfx: [
    { t: 7.2, type: 'step', gain: 0.14 },
    { t: 7.48, type: 'whoosh', gain: 0.26 },
    { t: 7.6, type: 'wind', gain: 0.18 },
    { t: 8.28, type: 'bell', gain: 0.18 },
    { t: 8.92, type: 'whoosh', gain: 0.2 },
  ],
};
