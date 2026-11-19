// scenes/mountain.js — "İşte bu sırra binaen ehl-i velayet … hizmet ve meşakkat ve musibet ve külfeti hoş görüyorlar,
// nazlanmıyorlar, şekva etmiyorlar. Elhamdülillâhi alâ külli hâl diyorlar."   Global time range t ∈ [41.8, 54.9].
// Night → the everlasting kandil lights up → dusk mountain path, saints' lamps up the switchbacks → one continuous
// uphill walk where the four hardships accumulate (ibrik pour, steep rocks, storm, bundle) → serenity (flowers,
// sigh & grumble dissolve) → summit at dawn, du'â → bloom to cream.
import {
  W, H, TAU, clamp, lerp, invlerp, smooth, E, seg, env, rng, noise1, noise2, fbm1, rgb, css, mix, P,
  ellipsePts, crPts, toPath, rough, roughen, transformPts, fillG, dabs, brushDab, strokeG, sprite, glow, track, bandSky,
} from '../core.js';
import { drawMan, ik2, L as BL, LEG } from '../rig.js';

// ============================================================================ constants & timing
const NIGHT = '#161D2E', CREAM = '#F4EBD8';
const S = 360;                       // man body height in world px
const T_IN = 42.3, T_OUT0 = 54.2, T_OUT1 = 54.6;
const TW0 = 44.22;                   // first step
const TSTOP = 50.95;                 // walking ends (summit), during "etmiyorlar"
// walking speed (world px / s): slow pour at the sapling, steady climb, a beat slower under the load
const VK = [[TW0, 0], [44.72, 115, E.inOutSine], [44.92, 85], [45.08, 50], [45.5, 50], [45.85, 150], [47.2, 150], [47.55, 125],
  [47.95, 125], [48.35, 150], [50.45, 150], [TSTOP, 0, E.inOutSine]];
const sstep = (a, b, x) => smooth(invlerp(a, b, x));

// ============================================================================ ground profile (world: x right, y down; feet at (0,0) at start)
const GXMIN = -1100, GXMAX = 1800;
let GYT = null;          // ground y table, 1px
function slopeAt(x) {
  let s = 0.02 + 0.08 * sstep(-60, 160, x) + 0.56 * sstep(200, 310, x) - 0.66 * sstep(690, 800, x) - 0.75 * sstep(1240, 1350, x);
  const rock = sstep(250, 320, x) * (1 - sstep(620, 700, x));
  s += rock * 0.16 * noise1(x / 30, 77);
  return s;
}
function buildGround() {
  const n = GXMAX - GXMIN + 1; GYT = new Float64Array(n);
  let i0 = -GXMIN; GYT[i0] = 0;
  for (let i = i0 + 1; i < n; i++) GYT[i] = GYT[i - 1] - slopeAt(GXMIN + i - 0.5);
  for (let i = i0 - 1; i >= 0; i--) GYT[i] = GYT[i + 1] + slopeAt(GXMIN + i + 0.5);
}
function ground(x) {
  const f = clamp(x, GXMIN, GXMAX - 1) - GXMIN; const i = Math.floor(f);
  return lerp(GYT[i], GYT[Math.min(i + 1, GYT.length - 1)], f - i);
}
const groundSmooth = (x) => (ground(x - 50) + ground(x) * 2 + ground(x + 50)) / 4;

// ============================================================================ walk tables (time → distance → gait phase)
const DT0 = 44.0, DTS = 1 / 600; let DTAB = null, D_END = 0;
function buildD() {
  const n = Math.ceil((52.6 - DT0) / DTS) + 2; DTAB = new Float64Array(n); let d = 0;
  for (let i = 0; i < n; i++) { DTAB[i] = d; d += track(VK, DT0 + (i + 0.5) * DTS) * DTS; }
  D_END = DTAB[n - 1];
}
function dAt(t) {
  const f = (t - DT0) / DTS; if (f <= 0) return 0; const i = Math.min(DTAB.length - 2, Math.floor(f));
  return lerp(DTAB[i], DTAB[i + 1], Math.min(1, f - i));
}
function tAtD(d) { // inverse of dAt on the walking interval
  let lo = 0, hi = DTAB.length - 1;
  if (d <= 0) return TW0; if (d >= D_END) return TSTOP;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (DTAB[m] < d) lo = m; else hi = m; }
  const u = (d - DTAB[lo]) / Math.max(1e-9, DTAB[hi] - DTAB[lo]); return DT0 + (lo + u) * DTS;
}
const PHI0 = -0.38; let PHT = null; const PH_N = 1600;
function strideBase(d) {
  // step length grows with walking speed (no lunges when slow), shorter on the steep rocks and under the load
  const X = (t) => dAt(t);
  const v = track(VK, tAtD(d));
  let s = 0.2 + 0.105 * clamp(v / 150);
  s -= 0.035 * sstep(200, 310, d + 0.2 * S) * (1 - sstep(690, 800, d));   // steep & rocky
  s -= 0.015 * sstep(X(47.3), X(47.7), d);        // the load
  s += 0.012 * sstep(X(48.0), X(48.6), d);        // serene
  return s * S;
}
function buildPhi() {
  // integrate 1/(2 stride), then correct the last stretch so the walk ends in double support (both feet planted)
  const inc = new Float64Array(PH_N + 1);
  for (let i = 0; i < PH_N; i++) inc[i] = 1 / (2 * strideBase(i + 0.5));
  let tot = 0, totR = 0; const dc = D_END - 320;
  for (let i = 0; i < Math.floor(D_END); i++) { const r = smooth(invlerp(dc, dc + 120, i)); tot += inc[i]; totR += inc[i] * r; }
  tot += inc[Math.floor(D_END)] * (D_END - Math.floor(D_END)); totR += inc[Math.floor(D_END)] * (D_END - Math.floor(D_END));
  const raw = PHI0 + tot;
  const target = Math.round((raw - 0.06) / 0.5) * 0.5 + 0.06;     // p ≡ 0.06 (mod .5): one foot just planted, other late stance
  const kk = (target - raw) / totR;
  PHT = new Float64Array(PH_N + 1); let ph = PHI0;
  for (let i = 0; i <= PH_N; i++) { PHT[i] = ph; const r = smooth(invlerp(dc, dc + 120, i)); ph += inc[Math.min(i, PH_N)] * (1 + kk * r); }
}
const STRIDE0 = 0.2; // step length (S) at standstill = strideBase(0)
const phiAt = (d) => { if (d <= 0) return PHI0 + d / (2 * STRIDE0 * S); const f = Math.min(d, PH_N - 1), i = Math.floor(f); return lerp(PHT[i], PHT[i + 1], f - i); };
function dAtPhi(ph) {
  if (ph <= PHI0) return (ph - PHI0) * 2 * STRIDE0 * S;
  let lo = 0, hi = PH_N; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (PHT[m] < ph) lo = m; else hi = m; }
  return lo + (ph - PHT[lo]) / Math.max(1e-9, PHT[hi] - PHT[lo]);
}
const strideAt = (d) => strideBase(clamp(d, 0, PH_N));
// standing foot spots (rel. to start hip x = 0) = where the gait would have planted them at PHI0, so the first steps
// start from a natural staggered stance (no over-stretched rear leg)
const STAND_N = ((-1 - PHI0) * 2 + 0.62) * STRIDE0 * S, STAND_F = ((-0.5 - PHI0) * 2 + 0.62) * STRIDE0 * S;
function plantX(k, off) {
  const ph = k - off;
  if (ph < PHI0 - 1e-6) return off === 0 ? STAND_N : STAND_F;
  const dh = dAtPhi(ph); return dh + 0.62 * strideAt(dh);
}
/** foot target for foot (off 0 = near, 0.5 = far) at hip distance d */
function footAt(d, off, liftAmt = 0.045) {
  const psi = phiAt(d) + off, k = Math.floor(psi), p = psi - k, st = 0.62;
  let x, lift = 0, ft;
  if (p < st) { x = plantX(k, off); const u = p / st; ft = u > 0.72 ? ((u - 0.72) / 0.28) * 0.42 : (u < 0.08 ? -(1 - u / 0.08) * 0.16 : 0); }
  else { const u = (p - st) / (1 - st); const e = u * u * (3 - 2 * u); x = lerp(plantX(k, off), plantX(k + 1, off), e); lift = Math.sin(Math.PI * u) * liftAmt * S; ft = lerp(0.42, -0.12, u); }
  const sl = Math.atan(slopeAt(x));
  return { x, y: ground(x) - lift, ft: ft - sl * (p < st ? 1 : 0.6), p, k, planted: p < st };
}

// ============================================================================ rig helpers (mirror of rig.js math so props can be drawn behind the man)
function fk(pose, size = S, f = 1) {
  const [hx, hy] = pose.hip; const th = pose.torso ?? 0;
  const up = [Math.sin(th), -Math.cos(th)], fw = [Math.cos(th), Math.sin(th)];
  const T2B = (p) => [fw[0] * p[0] + up[0] * p[1], fw[1] * p[0] + up[1] * p[1]];
  const breath = 1 + (pose.breath ?? 0) * 0.012;
  const W2 = (p) => [hx + p[0] * size * f, hy + p[1] * size];
  const shN = T2B([-0.004, (BL.torso - BL.shoulderDrop) * breath]);
  const shF = T2B([-0.016, (BL.torso - BL.shoulderDrop) * breath + 0.004]);
  const neckBase = T2B([0.004, BL.torso * breath]);
  const na = th + (pose.neck ?? 0), ha = na + (pose.head ?? 0);
  const neckTop = [neckBase[0] + Math.sin(na) * BL.neck, neckBase[1] - Math.cos(na) * BL.neck];
  const headC = [neckTop[0] + 0.006 * Math.cos(ha) + 0.065 * Math.sin(ha), neckTop[1] + 0.006 * Math.sin(ha) - 0.065 * Math.cos(ha)];
  const arm = (a, sh) => {
    let a1, a2;
    if (a.ik) { const tgt = [(a.ik[0] - hx) / (size * f), (a.ik[1] - hy) / size]; [a1, a2] = ik2(sh, tgt, BL.upper, BL.fore, a.bend ?? 1); }
    else { a1 = th + a.sh; a2 = a1 + a.el; }
    const el = [sh[0] + Math.sin(a1) * BL.upper, sh[1] + Math.cos(a1) * BL.upper];
    const wr = [el[0] + Math.sin(a2) * BL.fore, el[1] + Math.cos(a2) * BL.fore];
    const a3 = a2 + (a.wr ?? 0);
    const hand = [wr[0] + Math.sin(a3) * BL.hand * 0.6, wr[1] + Math.cos(a3) * BL.hand * 0.6];
    return { el: W2(el), wr: W2(wr), hand: W2(hand), sh: W2(sh), a1, a2, a3 };
  };
  return {
    shoulderN: W2(shN), shoulderF: W2(shF), head: W2(headC), neckTop: W2(neckTop), T2B, W2, th, hip: pose.hip, torso: th,
    armN: pose.armN ? arm(pose.armN, shN) : null, armF: pose.armF ? arm(pose.armF, shF) : null,
  };
}
/** world-space shoulder positions for a hip/torso/breath (before arms are known) */
function shoulders(hip, th, breath = 0) {
  return fk({ hip, torso: th, breath, armN: null, armF: null });
}
/** arm spec that puts the wrist at world target and the hand at absolute angle a3 */
function armTo(sh, target, a3, hand, size = S) {
  // sh: world shoulder. compute a2 via ik2 in body units relative to shoulder (only the forearm angle matters for wr)
  const tgt = [(target[0] - sh[0]) / size, (target[1] - sh[1]) / size];
  const [, a2] = ik2([0, 0], tgt, BL.upper, BL.fore, 1);
  return { ik: target, wr: a3 - a2, hand };
}
/** wrist world position for an angle-spec arm */
function wristOf(sh, th, spec, size = S) {
  const a1 = th + spec.sh, a2 = a1 + spec.el;
  return { wr: [sh[0] + (Math.sin(a1) * BL.upper + Math.sin(a2) * BL.fore) * size, sh[1] + (Math.cos(a1) * BL.upper + Math.cos(a2) * BL.fore) * size], a3: a2 + (spec.wr ?? 0) };
}

// ============================================================================ colours
const C = {
  // dusk
  sky: ['#1A2040', '#20274B', '#2A3058', '#3A3D6C', '#544F82', '#76659A', '#9C7A9E', '#C08E97', '#D6A291'],
  far: '#6C6592', farLight: '#827AA4', farShade: '#5D5784',
  mas: '#47467A', masLight: '#5A588C', masShade: '#393865', trail: '#857AA2',
  hill: '#34365F', hillLight: '#3E406C', hillShade: '#2C2D52',
  face: '#2B2A47', faceL: '#33314F', faceD: '#24233D', path: '#5D5272', pathL: '#74688A', pathD: '#4A4160',
  rock: '#4C4767', rockL: '#655D82', rockD: '#36324F', grass: '#2F3B4B', grassL: '#3D4B5A',
  // storm
  storm: '#3B4255', stormD: '#2D3343', stormL: '#4C546A', stormLL: '#5D667C', rain: '#A3B5C8',
  // dawn
  dsky: ['#8E86AE', '#BF9EAA', '#D8AFA3', '#E8C3A0', '#F0D3AA', '#F3DCB4', '#F2D8B0'],
  dfar: '#8B83AE', dfarLight: '#E2BE98', dfarShade: '#756E9A', dsea: ['#EEDFCB', '#E1CFC6', '#D6C1C2', '#CBB3BF'],
  dhill: '#8F7EA2', dhillD: '#776891', dhillL: '#C9A2A0',
  dface: '#7A5A6E', dfaceL: '#8E6B79', dfaceD: '#5F4660', dpath: '#C99A72', dpathL: '#DDB283', dpathD: '#A47C66',
  drock: '#957586', drockL: '#D9AE80', drockD: '#6C556D',
  // lamp & props
  brass: '#C8923A', brassD: '#93652A', brassL: '#E9C26C', brassH: '#F8E4AA',
  copper: '#B06844', copperD: '#834A31', copperL: '#D8936D', copperH: '#EDBA93',
  cloth: '#A35A47', clothD: '#7B4135', clothL: '#C47A5D', clothPat: '#E9D6B4', strap: '#5E4434',
  flameO: '#E9A03A', flameM: '#F4C463', flameI: '#FCEFC4',
  water: '#A8CBDA', waterL: '#E3F1F4',
  petal: '#F6EEDC', petalPink: '#F1CFC9', petalShade: '#DCCFC0', fcenter: '#D9A441', stem: '#4E7A52', leaf: '#5C8D58',
};

// ============================================================================ geometry helpers
const sil = (pts, closeY, x0, x1) => [...pts, [x1, closeY], [x0, closeY]];
function ridge(ctrl, seed, amp = 10, per = 10, freq = 0.012) {
  const c = crPts(ctrl, false, per);
  return c.map(([x, y], i) => [x, y + fbm1(x * freq, seed, 3) * amp + noise1(x * 0.07, seed + 3) * amp * 0.25]);
}
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return Math.abs(a / 2); }
function bbox(p) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; }
/** paint a mountain/hill mass: base fill, lit & shaded facets below each peak, near-colour dabs */
function paintMass(g, top, closeY, col, o = {}) {
  const x0 = top[0][0], x1 = top[top.length - 1][0];
  const poly = sil(top, closeY, x0, x1);
  const path = rough(poly, { amp: o.amp ?? 2, seed: o.seed ?? 3, step: 6 });
  fillG(g, path, col.base, { tex: 0.5, dir: o.dir ?? 0, scale: 0.6 });
  g.save(); g.clip(path);
  // facets: from each peak, a lit face to the left and a shade face to the right
  for (const pk of o.peaks || []) {
    const [px, py] = pk.p, h = pk.h ?? 400, wl = pk.wl ?? 260, wr = pk.wr ?? 260;
    const lit = [[px, py - 4], [px - wl * 0.35, py + h * 0.35], [px - wl, py + h], [px - wl * 0.2, py + h * 1.1], [px + 6, py + h * 0.5]];
    fillG(g, rough(lit, { amp: 3, seed: (o.seed ?? 3) + px }), col.light, { tex: 0.45, dir: 1.0, scale: 0.55, alpha: pk.la ?? 0.9 });
    const sh = [[px + 2, py], [px + wr * 0.25, py + h * 0.4], [px + wr, py + h], [px + wr * 0.35, py + h * 1.05], [px + 10, py + h * 0.55]];
    fillG(g, rough(sh, { amp: 3, seed: (o.seed ?? 3) + px + 9 }), col.shade, { tex: 0.45, dir: -1.0, scale: 0.55, alpha: pk.sa ?? 0.85 });
  }
  g.restore();
  const bb = bbox(poly);
  const n = o.n ?? Math.round(polyArea(poly) / 1400);
  dabs(g, path, { colors: col.dabs, n, len: o.len ?? [26, 80], wid: o.wid ?? [5, 11], dir: o.dabDir ?? 0, dirJit: 0.1, seed: (o.seed ?? 3) + 50, bbox: bb, alpha: o.dabAlpha ?? 0.85 });
  return path;
}

// ============================================================================ sprites
// reference camera for the dusk background layers (the establishing shot)
const CAM_E = { x: 309, y: -324, z: 0.68, rot: 0 };
let CAM_S = null; // summit camera (computed in init)
const SKY_OX = -170, SKY_OY = -260, SKY_W = 1420, SKY_H = 2440;

/** flat sky bands + horizontal dabs; much quieter dabs inside `calm` (sprite y range); band boundaries interlock with
 * thin long dabs of intermediate colours */
function paintSky(g, w, h, bands, { seed = 11, calm = null, dabN = 1500, len = [40, 130], wid = [7, 14], contrast = 0.05 } = {}) {
  const R = rng(seed);
  for (let i = 0; i < bands.length; i++) { const y0 = bands[i].y, y1 = i + 1 < bands.length ? bands[i + 1].y : h; g.fillStyle = css(bands[i].color); g.fillRect(0, y0, w, y1 - y0 + 1); }
  const inCalm = (y) => calm && y > calm[0] && y < calm[1];
  for (let i = 0; i < bands.length; i++) {
    const y0 = bands[i].y, y1 = i + 1 < bands.length ? bands[i + 1].y : h, c = bands[i].color;
    const n = Math.round(((y1 - y0) / h) * dabN);
    for (let k = 0; k < n; k++) {
      const x = R() * w, y = lerp(y0, y1, R()), q = inCalm(y);
      if (q && R() < 0.8) continue;
      brushDab(g, x, y, lerp(len[0], len[1], R()) * (q ? 1.6 : 1), lerp(wid[0], wid[1], R()), (R() - 0.5) * 0.04, mix(c, R() < 0.5 ? '#ffffff' : '#000000', R() * contrast * (q ? 0.12 : 1)), R);
    }
    if (i + 1 < bands.length) {
      const c2 = bands[i + 1].color, yb = bands[i + 1].y;
      for (let k = 0; k < w / 7; k++) {
        const x = R() * w, y = yb + (R() - 0.5) * 80; if (inCalm(y)) continue;
        const col = mix(y < yb ? c2 : c, y < yb ? c : c2, 0.25 + R() * 0.25);
        brushDab(g, x, y, lerp(80, 200, R()), lerp(6, 9, R()), (R() - 0.5) * 0.03, col, R);
      }
    }
  }
}
function skySprite(key, bands, ys, seed, calm) {
  return sprite(key, SKY_W, SKY_H, (g) => {
    paintSky(g, SKY_W, SKY_H, bands.map((c, i) => ({ y: i === 0 ? 0 : ys[i] - SKY_OY, color: c })), { seed, calm: calm ? [calm[0] - SKY_OY, calm[1] - SKY_OY] : null });
  });
}
function farSprite(key, dawn) {
  return sprite(key, 2300, 760, (g) => {
    g.translate(600, -820);
    const top = ridge([[-600, 1080], [-380, 960], [-180, 1010], [40, 925], [230, 990], [420, 940], [610, 1015], [820, 950], [1010, 1000], [1220, 930], [1450, 990], [1700, 960]], 21, 12, 12, 0.01);
    const col = dawn ? { base: C.dfar, light: C.dfarLight, shade: C.dfarShade, dabs: [mix(C.dfar, '#ffffff', 0.05), mix(C.dfar, '#000000', 0.04)] }
      : { base: C.far, light: C.farLight, shade: C.farShade, dabs: [mix(C.far, '#ffffff', 0.04), mix(C.far, '#000000', 0.04)] };
    paintMass(g, top, 1580, col, { seed: 31, peaks: dawn ? [] : [[40, 925], [420, 940], [820, 950], [1220, 930], [-380, 960]].map((p) => ({ p, h: 220, wl: 150, wr: 150, la: 0.55, sa: 0.45 })), n: 700, len: [24, 70] });
    if (dawn) { const rim = top.map(([x, y]) => [x, y + 3]); strokeG(g, rim, 4, mix(C.dfar, C.dfarLight, 0.55), { taper: false, alpha: 0.7, seed: 33, wobble: 0.3 }); }
  });
}
// switchback trail on the massif (reference screen coords)
const ZIG = [[470, 1110], [790, 1012], [600, 905], [810, 800], [660, 702], [790, 606], [722, 522], [764, 446]];
let ZIG_L = null;
function zigLen() { const L = [0]; for (let i = 1; i < ZIG.length; i++) L.push(L[i - 1] + Math.hypot(ZIG[i][0] - ZIG[i - 1][0], ZIG[i][1] - ZIG[i - 1][1])); return L; }
function zigAt(u) {
  const L = ZIG_L; u = clamp(u, 0, L[L.length - 1] - 0.01);
  let i = 1; while (L[i] < u) i++;
  const a = ZIG[i - 1], b = ZIG[i], k = (u - L[i - 1]) / (L[i] - L[i - 1]);
  return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), seg: i - 1, a, b };
}
// asymmetric massif: long left shoulder, main peak with a notch, a col and a secondary peak to the right
const MAS_TOP = [[-560, 1190], [-380, 1130], [-200, 1060], [-40, 990], [100, 925], [220, 880], [300, 858], [380, 832], [440, 790], [500, 728], [560, 660], [620, 590], [672, 528], [706, 488], [722, 474], [736, 478], [750, 452], [764, 428], [782, 440], [810, 470], [850, 520], [884, 560], [912, 586], [940, 596], [966, 578], [992, 556], [1012, 560], [1040, 600], [1078, 660], [1120, 725], [1180, 800], [1260, 870], [1360, 930], [1500, 985], [1740, 1040]];
function massifSprite() {
  return sprite('mtn_massif', 2300, 1500, (g) => {
    g.translate(560, -300);
    const top = MAS_TOP.map(([x, y]) => [x, y + fbm1(x * 0.02, 41, 3) * 7 + noise1(x * 0.09, 44) * 2.5]);
    const poly = sil(top, 1800, -560, 1740);
    const path = rough(poly, { amp: 2, seed: 43, step: 6 });
    fillG(g, path, C.mas, { tex: 0.35, dir: 0, scale: 0.6 });
    g.save(); g.clip(path);
    const face = (pts, col, a, dir, sd) => fillG(g, rough(pts, { amp: 3, seed: sd, step: 6 }), col, { tex: 0.3, dir, scale: 0.6, alpha: a });
    // three facet tones: west faces in the last warm light, east faces in shadow, a mid tone on the shoulder
    face([[764, 420], [736, 470], [700, 492], [620, 588], [540, 690], [450, 780], [380, 832], [300, 862], [250, 940], [330, 1010], [430, 930], [520, 820], [600, 700], [668, 600], [730, 500]], C.masLight, 0.9, 0.4, 1);
    face([[300, 862], [220, 882], [100, 928], [-40, 995], [-120, 1100], [60, 1130], [200, 1040], [280, 960]], mix(C.mas, C.masLight, 0.5), 0.85, 0.2, 5);
    face([[772, 430], [850, 520], [912, 588], [930, 700], [890, 880], [840, 1080], [806, 990], [792, 850], [802, 700], [786, 560]], C.masShade, 0.92, -0.4, 2);
    face([[1010, 552], [994, 556], [962, 598], [990, 640], [1012, 600]], C.masLight, 0.7, 0.4, 3);
    face([[1016, 558], [1078, 658], [1180, 798], [1262, 868], [1170, 910], [1080, 800], [1034, 660]], C.masShade, 0.88, -0.4, 4);
    // a few gullies (broken, varied) instead of uniform striation
    const R = rng(44);
    for (let i = 0; i < 9; i++) {
      const x = 470 + R() * 480, y = 560 + R() * 460, len = 40 + R() * 90, dx = (x < 790 ? -1 : 1) * (0.3 + R() * 0.3);
      strokeG(g, crPts([[x, y], [x + dx * len * 0.5, y + len * 0.45], [x + dx * len, y + len]], false, 6), 2.5 + R() * 2.5, x < 790 ? mix(C.mas, C.masLight, 0.35) : mix(C.masShade, '#000000', 0.06), { alpha: 0.6, seed: i });
    }
    dabs(g, path, { colors: [mix(C.mas, '#ffffff', 0.03), mix(C.mas, '#000000', 0.04), mix(C.mas, C.masLight, 0.4)], n: 900, len: [30, 90], wid: [4, 9], dir: 0, dirJit: 0.06, seed: 93, bbox: [-560, 400, 1740, 1800], alpha: 0.55 });
    // switchback trail: rounded corners, broken in places
    const raw = resampleOpen(ZIG, 8); const tr = raw.map((p, i) => { let x = 0, y = 0, n = 0; for (let k = -3; k <= 3; k++) { const q = raw[clamp(i + k, 0, raw.length - 1)]; x += q[0]; y += q[1]; n++; } return [x / n, y / n]; });
    let run = [];
    const flush = () => { if (run.length > 3) { strokeG(g, run, 4, mix(C.trail, C.mas, 0.6), { taper: false, wobble: 0.2, alpha: 0.6, seed: run.length }); strokeG(g, run, 1.8, mix(C.trail, C.mas, 0.2), { taper: false, wobble: 0.25, alpha: 0.7, seed: run.length + 1 }); } run = []; };
    tr.forEach((p, i) => { if (noise1(i * 0.35, 9) < -0.45) flush(); else run.push(p); });
    flush();
    g.restore();
  });
}
function resampleOpen(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let j = 0; j < n; j++) out.push([lerp(a[0], b[0], j / n), lerp(a[1], b[1], j / n)]); }
  out.push(pts[pts.length - 1]); return out;
}
function hillSprite() {
  return sprite('mtn_hill', 2500, 1100, (g) => {
    g.translate(620, -880);
    const top = ridge([[-620, 1050], [-380, 990], [-150, 1040], [80, 1000], [300, 1060], [520, 1110], [760, 1080], [980, 1130], [1250, 1100], [1550, 1150], [1880, 1120]], 51, 10, 12, 0.012);
    paintMass(g, top, 1980, { base: C.hill, light: C.hillLight, shade: C.hillShade, dabs: [mix(C.hill, '#ffffff', 0.04), mix(C.hill, '#000000', 0.05)] },
      { seed: 53, peaks: [], n: 800 });
  });
}

// ---- world ground (k = 1)
const GX0 = -1000, GY0 = -950, GW = 2700, GH = 2250, GS = 1.2;
const DGX0 = 420, DGY0 = -950, DGW = 1280, DGH = 1500;
let GROUND_PATH = null; // world Path2D of the solid ground
function groundPoly() {
  const pts = [];
  for (let x = GX0; x <= GX0 + GW + 20; x += 6) pts.push([x, ground(x)]);
  pts.push([GX0 + GW + 20, GY0 + GH + 50], [GX0, GY0 + GH + 50]);
  return pts;
}
let ROCKS = null;
function makeRocks() {
  const R = rng(91); const rocks = [];
  // rocks along the back edge of the steep path (protrude above the ridge line) and a few embedded in the face
  for (let x = 250; x < 1300; x += 26 + R() * 40) {
    const steep = sstep(215, 310, x) * (1 - sstep(700, 790, x));
    if (x > SLAB.x0 - 90 && x < SLAB.x1 + 40) continue;
    if (x > SAPLING_X - 40 && x < SAPLING_X + 25) continue;
    if (R() > 0.2 + steep * 0.8) continue;
    const r = (12 + R() * 22) * (0.6 + steep * 0.8);
    rocks.push({ x, y: ground(x) + r * 0.3, r, h: r * (0.7 + R() * 0.5), seed: Math.floor(R() * 1000), back: true });
  }
  for (let i = 0; i < 14; i++) {
    const x = -600 + R() * 2100; const dy = 40 + R() * 140; const r = 10 + R() * 16;
    rocks.push({ x, y: ground(x) + dy, r, h: r * (0.6 + R() * 0.4), seed: Math.floor(R() * 1000), back: false });
  }
  ROCKS = rocks;
}
function rockShape(rk) {
  const { x, y, r, h, seed } = rk; const R = rng(seed);
  const pts = []; const n = 7;
  for (let i = 0; i <= n; i++) { const a = Math.PI + (i / n) * Math.PI; const rr = r * (0.85 + R() * 0.3); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * h * (0.85 + R() * 0.25)]); }
  pts.push([x + r * 0.95, y + h * 0.2], [x - r * 0.95, y + h * 0.2]);
  return pts;
}
function paintRock(g, rk, col, light = 1) {
  const pts = rockShape(rk); const path = rough(pts, { amp: 1.4, seed: rk.seed, step: 4 });
  fillG(g, path, col.base, { tex: 0.45, dir: 0.5, scale: 0.4 });
  g.save(); g.clip(path);
  const { x, y, r, h } = rk;
  fillG(g, rough([[x - r * 1.1, y - h * 1.2], [x + r * 0.1, y - h * 1.2], [x - r * 0.15, y - h * 0.5], [x - r * 0.55, y - h * 0.05], [x - r * 1.1, y]], { amp: 1.5, seed: rk.seed + 1 }), col.light, { tex: 0.4, dir: 1.1, scale: 0.4, alpha: 0.85 * light });
  fillG(g, rough([[x + r * 0.3, y - h * 0.65], [x + r * 1.2, y - h * 0.4], [x + r * 1.2, y + h * 0.3], [x + r * 0.05, y + h * 0.3]], { amp: 1.5, seed: rk.seed + 2 }), col.dark, { tex: 0.4, dir: -0.8, scale: 0.4, alpha: 0.8 });
  g.restore();
}
/** summit crest outline (world) */
function slabPts() {
  const b = SLAB; const pts = [[b.x0 - 8, ground(b.x0 - 8) + 6], [b.x0 + 0.045 * S, b.g0 - 0.12 * S], [b.x0 + 0.005 * S, b.g0 - 0.25 * S], [b.x0 + 0.05 * S, b.g0 - 0.39 * S], [b.x0 + 0.045 * S, b.topPts[0][1] + 0.014 * S]];
  for (const q of b.topPts) pts.push(q);
  for (let x = b.x1; x >= b.x0 - 8; x -= 12) pts.push([x, ground(x) + 16]);
  return pts;
}
function paintSlab(g, col, dawn) {
  // same mass colour as the mountain face so it reads as the summit itself; rock planes only near the top and front
  const b = SLAB, bp = slabPts(), pth = rough(bp, { amp: 1.4, seed: 81, step: 4 });
  const T = b.topPts, x0 = b.x0, rk = col.rock;
  fillG(g, pth, col.face, { tex: 0.4, dir: -0.06, scale: 0.6 });
  g.save(); g.clip(pth);
  // the right flank in shade, the top plane catching the light, the front step face, a lower ledge, cracks
  fillG(g, rough([[T[2][0], T[2][1] + 0.06 * S], [T[3][0], T[3][1] + 0.03 * S], [T[4][0], T[4][1] + 0.02 * S], [T[5][0], T[5][1] + 0.02 * S], [T[6][0] + 20, T[6][1] + 30], [T[6][0] + 20, b.g0 + 0.5 * S], [x0 + 0.3 * S, b.g0 + 0.5 * S], [x0 + 0.34 * S, b.g0 - 0.16 * S]], { amp: 2.5, seed: 83 }), col.faceD, { tex: 0.35, dir: -0.5, scale: 0.5, alpha: 0.75 });
  fillG(g, rough([[x0 - 10, T[0][1] - 20], [T[3][0], T[3][1] - 24], [T[4][0], T[4][1] - 8], [T[4][0] - 0.06 * S, T[4][1] + 0.035 * S], [T[2][0], T[2][1] + 0.05 * S], [T[1][0], T[1][1] + 0.05 * S], [x0 + 0.05 * S, T[0][1] + 0.045 * S], [x0 - 10, T[0][1] + 0.045 * S]], { amp: 2, seed: 82 }), rk.light, { tex: 0.4, dir: 0.1, scale: 0.4, alpha: dawn ? 0.9 : 0.7 });
  fillG(g, rough([[x0 - 12, T[0][1] + 0.045 * S], [x0 + 0.16 * S, T[0][1] + 0.06 * S], [x0 + 0.13 * S, b.g0 - 0.22 * S], [x0 + 0.2 * S, b.g0 - 0.2 * S], [x0 + 0.16 * S, b.g0 + 10], [x0 - 12, b.g0 + 10]], { amp: 2, seed: 86 }), dawn ? mix(rk.base, rk.light, 0.35) : rk.base, { tex: 0.4, dir: 1.3, scale: 0.4, alpha: 0.92 });
  fillG(g, rough([[x0 - 12, b.g0 - 0.2 * S], [x0 + 0.2 * S, b.g0 - 0.2 * S], [x0 + 0.24 * S, b.g0 - 0.17 * S], [x0 - 12, b.g0 - 0.17 * S]], { amp: 1.5, seed: 88 }), dawn ? mix(rk.light, rk.base, 0.4) : mix(rk.base, rk.light, 0.5), { tex: 0.3, alpha: 0.85 });
  strokeG(g, crPts([[x0 + 0.09 * S, T[0][1] + 0.07 * S], [x0 + 0.11 * S, b.g0 - 0.3 * S], [x0 + 0.08 * S, b.g0 - 0.21 * S]], false, 5), 2.6, rk.dark, { alpha: 0.55, seed: 85 });
  strokeG(g, crPts([[x0 + 0.5 * S, T[2][1] + 0.08 * S], [x0 + 0.62 * S, T[3][1] + 0.2 * S]], false, 5), 2.2, col.faceD, { alpha: 0.5, seed: 87 });
  dabs(g, pth, { colors: [mix(col.face, '#ffffff', 0.03), mix(col.face, '#000000', 0.04)], n: 60, len: [20, 50], wid: [4, 7], dir: -0.05, seed: 84, bbox: bbox(bp), alpha: 0.6 });
  g.restore();
  // two smaller rocks leaning on its front foot
  paintRock(g, { x: x0 - 0.03 * S, y: b.g0 + 2, r: 0.075 * S, h: 0.085 * S, seed: 801 }, rk, dawn ? 1.0 : 0.8);
  paintRock(g, { x: x0 + 0.08 * S, y: b.g0 + 6, r: 0.055 * S, h: 0.055 * S, seed: 802 }, rk, dawn ? 1.0 : 0.8);
}
function paintGround(g, dawn) {
  const col = dawn ? { face: C.dface, faceL: C.dfaceL, faceD: C.dfaceD, path: C.dpath, pathL: mix(C.dpathL, C.dpath, 0.5), pathD: C.dpathD, rock: { base: C.drock, light: mix(C.drockL, C.drock, 0.5), dark: C.drockD } }
    : { face: C.face, faceL: C.faceL, faceD: C.faceD, path: C.path, pathL: C.pathL, pathD: C.pathD, rock: { base: C.rock, light: C.rockL, dark: C.rockD } };
  const poly = groundPoly(); const XR = GX0 + GW + 20;
  const path = rough(poly, { amp: 1.6, seed: 61, step: 5 });
  fillG(g, path, col.face, { tex: 0.4, dir: -0.06, scale: 0.6 });
  g.save(); g.clip(path);
  // three broad flat tonal strata parallel to the ridge
  const R = rng(62);
  for (let k = 0; k < 3; k++) {
    const off = 90 + k * 260 + R() * 50, th = 70 + R() * 70;
    const a = [], b = [];
    for (let x = GX0; x <= XR; x += 24) { a.push([x, ground(x) * 0.7 + off + noise1(x * 0.006, k) * 22]); b.push([x, ground(x) * 0.7 + off + th + noise1(x * 0.007, k + 9) * 22]); }
    fillG(g, rough(a.concat(b.reverse()), { amp: 3, seed: 70 + k }), k % 2 ? col.faceL : col.faceD, { tex: 0.3, dir: -0.05, scale: 0.55, alpha: 0.45 });
  }
  const bb = [GX0, GY0, XR, GY0 + GH];
  dabs(g, path, { colors: [mix(col.face, '#ffffff', 0.03), mix(col.face, '#000000', 0.035), mix(col.face, col.faceL, 0.35), mix(col.face, col.faceD, 0.35)], n: 1500, len: [50, 140], wid: [6, 12], dir: -0.04, dirJit: 0.08, seed: 63, bbox: bb, alpha: 0.6 });
  for (const rk of ROCKS) if (!rk.back) paintRock(g, rk, { base: mix(col.face, col.rock.base, 0.35), light: mix(col.face, col.rock.light, 0.3), dark: mix(col.face, col.faceD, 0.7) }, 0.6);
  // path surface band (top of the ridge)
  const top = [], bot = [];
  for (let x = GX0; x <= XR; x += 6) { top.push([x, ground(x) - 1]); bot.push([x, ground(x) + 15 + noise1(x * 0.05, 3) * 4]); }
  const band = rough(top.concat(bot.reverse()), { amp: 1.5, seed: 64, step: 5 });
  fillG(g, band, col.path, { tex: 0.5, dir: -0.15, scale: 0.4 });
  dabs(g, band, { colors: [col.pathL, col.pathD, mix(col.path, '#ffffff', 0.04)], n: 600, len: [10, 26], wid: [3, 5], dir: -0.15, dirJit: 0.2, seed: 65, bbox: bb, alpha: 0.8 });
  g.restore();
  // lit rim of the path: thin and broken
  let run = []; const runs = [];
  top.filter((_, i) => i % 3 === 0).forEach((q, i) => { if (noise1(i * 0.4, 66) < -0.35) { if (run.length > 2) runs.push(run); run = []; } else run.push(q); });
  if (run.length > 2) runs.push(run);
  for (const r of runs) strokeG(g, resampleOpen(r, 12), dawn ? 2.2 : 2.6, col.pathL, { taper: false, alpha: dawn ? 0.6 : 0.6, seed: 66 + r.length });
  // grass tufts at the gentle foot of the path
  const Rg = rng(67);
  for (let x = -900; x < 230; x += 10 + Rg() * 22) {
    if (Math.abs(x - SAPLING_X) < 20) continue;
    const y = ground(x) + 2; const n = 3 + Math.floor(Rg() * 3);
    for (let j = 0; j < n; j++) { const a = -Math.PI / 2 + (Rg() - 0.5) * 0.9, l = 10 + Rg() * 16; strokeG(g, [[x + j * 3, y], [x + j * 3 + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5], [x + j * 3 + Math.cos(a) * l, y + Math.sin(a) * l]], 3, dawn ? '#7E8A6A' : (Rg() < 0.5 ? C.grass : C.grassL), { seed: Math.floor(Rg() * 99) }); }
  }
  for (const rk of ROCKS) if (rk.back) paintRock(g, rk, col.rock, dawn ? 0.9 : 0.8);
  paintSlab(g, col, dawn);
}
function groundSprite() {
  return sprite('mtn_ground', GW * GS, GH * GS, (g) => { g.scale(GS, GS); g.translate(-GX0, -GY0); paintGround(g, false); });
}
function groundDawnSprite() {
  return sprite('mtn_ground_dawn', DGW * GS, DGH * GS, (g) => { g.scale(GS, GS); g.translate(-DGX0, -DGY0); paintGround(g, true); });
}

// ---- storm strata (screen space): opaque horizontal banks, three flat tones each (dark ragged underside, mid body,
// lighter lobed top edge), long horizontal dabs. Sprite origin = (SB_X0, top).
const SB_X0 = -420, SB_W = 1920;
const BANKS = {
  A: { h: 360, seed: 211, lobes: [150, 420], lobeH: [24, 110], under: 0.34, col: ['#5B6681', '#4B5470', '#727E97'], y: 40 },
  B: { h: 400, seed: 212, lobes: [170, 460], lobeH: [30, 130], under: 0.38, col: ['#464E64', '#363D50', '#5E687F'], y: 250 },
  C: { h: 360, seed: 213, lobes: [140, 380], lobeH: [26, 100], under: 0.42, col: ['#3A4154', '#2A2F3D', '#4E566B'], y: 520 },
};
function bankShape(bk) {
  const R = rng(bk.seed); const top = [], bot = [];
  let x = 0;
  while (x < SB_W) { const w = lerp(bk.lobes[0], bk.lobes[1], R() * R()), hh = lerp(bk.lobeH[0], bk.lobeH[1], R()) * (0.6 + 0.4 * w / bk.lobes[1]); const base = 100 + R() * 70; const sk = (R() - 0.5) * 0.5; for (let i = 0; i <= 10; i++) { const u = i / 10, uu = clamp(u + sk * Math.sin(Math.PI * u)); top.push([x + u * w, base - Math.pow(Math.sin(Math.PI * uu), 0.8) * hh]); } x += w * (0.7 + R() * 0.2); }
  for (let xx = SB_W; xx >= 0; xx -= 14) { const tat = Math.max(0, noise1(xx * 0.011, bk.seed + 4)) * 60; bot.push([xx, bk.h - 40 + noise1(xx * 0.02, bk.seed + 2) * 18 + tat]); }
  const underTop = []; for (let xx = 0; xx <= SB_W; xx += 14) underTop.push([xx, bk.h * (1 - bk.under) + noise1(xx * 0.013, bk.seed + 7) * 26]);
  return { top, bot, underTop };
}
function paintBank(g, bk, col) {
  const sh = bankShape(bk);
  const outline = rough(sh.top.concat(sh.bot), { amp: 3, seed: bk.seed, step: 7 });
  fillG(g, outline, col[0], { tex: 0.4, dir: 0, scale: 0.7 });
  g.save(); g.clip(outline);
  // dark ragged underside
  fillG(g, rough(sh.underTop.concat([[SB_W + 40, bk.h + 80], [-40, bk.h + 80]]), { amp: 4, seed: bk.seed + 1, step: 8 }), col[1], { tex: 0.4, dir: 0, scale: 0.7 });
  // lighter lobed top edge: the outline shifted down, subtracted from itself → a band along the top
  const lit = new Path2D(); lit.addPath(rough(sh.top.concat([[SB_W, 400], [0, 400]]), { amp: 2.5, seed: bk.seed + 2, step: 7 }));
  g.save(); const cut = new Path2D(); cut.rect(-50, -50, SB_W + 100, bk.h + 200); cut.addPath(rough(sh.top.map(([x, y]) => [x + 14, y + 16 + 14 * Math.max(0, noise1(x * 0.012, bk.seed))]).concat([[SB_W + 50, bk.h + 200], [-50, bk.h + 200]]), { amp: 3, seed: bk.seed + 3, step: 7 })); g.clip(cut, 'evenodd');
  fillG(g, lit, col[2], { tex: 0.35, dir: 0, scale: 0.6 });
  g.restore();
  const bb = [0, 0, SB_W, bk.h + 60];
  dabs(g, outline, { colors: [mix(col[0], '#ffffff', 0.04), mix(col[0], '#000000', 0.05), mix(col[0], col[2], 0.4), mix(col[0], col[1], 0.45)], n: Math.round(SB_W * bk.h / 1500), len: [60, 180], wid: [6, 12], dir: 0, dirJit: 0.03, seed: bk.seed + 5, bbox: bb, alpha: 0.6 });
  g.restore();
}
const bankSprite = (key, lit = false) => { const bk = BANKS[key]; return sprite('mtn_bank_' + key + (lit ? '_lit' : ''), SB_W, bk.h + 80, (g) => paintBank(g, bk, lit ? ['#8E92B6', '#6E7398', '#B6B6D2'] : bk.col)); };
/** draw a bank split at screen x `sx` (ragged edge); halves pushed apart by `px` and lifted by `py` */
function drawBank(ctx, key, dx, dy, alpha, split, px, py, lit = 0) {
  if (alpha <= 0.003) return;
  const bk = BANKS[key], sp = bankSprite(key), x = SB_X0 + dx, y = bk.y + dy;
  const blitIt = (ox, oy) => { ctx.globalAlpha = alpha; ctx.drawImage(sp, x + ox, y + oy); if (lit > 0.01) { ctx.globalAlpha = alpha * Math.min(1, lit * 1.25); ctx.drawImage(bankSprite(key, true), x + ox, y + oy); } ctx.globalAlpha = 1; };
  if (px <= 0.5) { blitIt(0, 0); return; }
  for (const side of [-1, 1]) {
    ctx.save();
    const edge = []; for (let yy = y - 80; yy <= y + bk.h + 160; yy += 24) edge.push([split + side * 0 + noise1(yy * 0.02, bk.seed + (side > 0 ? 1 : 0)) * 46 + side * px * 0, yy]);
    const cl = side < 0 ? edge.concat([[-3000, y + bk.h + 160], [-3000, y - 80]]) : edge.concat([[4000, y + bk.h + 160], [4000, y - 80]]);
    ctx.translate(side * px, -py * (side < 0 ? 1 : 0.85));
    ctx.clip(toPath(cl));
    blitIt(0, 0);
    ctx.restore();
  }
}
// ---- rain: pre-rendered tiles of short tapered gouache strokes, slanted by the wind from the right
const RAIN_DIR = [-Math.sin(0.3), Math.cos(0.3)];
const RAIN_L = [
  { key: 'mtn_rain0', T: 540, n: 70, len: [16, 30], wid: [2.0, 3.0], col: '#93A7BE', v: 950, k: 0.35, al: 0.55 },
  { key: 'mtn_rain1', T: 540, n: 26, len: [26, 42], wid: [3.0, 4.2], col: '#A6B9CE', v: 1450, k: 0.7, al: 0.6 },
  { key: 'mtn_rain2', T: 720, n: 9, len: [38, 54], wid: [4.6, 6.0], col: '#BCCCDC', v: 2100, k: 1.0, al: 0.55 },
];
function rainSprite(L) {
  return sprite(L.key, L.T, L.T, (g) => {
    const R = rng(L.key.length * 31 + L.n);
    for (let i = 0; i < L.n; i++) {
      const x = R() * L.T, y = R() * L.T, len = lerp(L.len[0], L.len[1], R()), wd = lerp(L.wid[0], L.wid[1], R()), sd = Math.floor(R() * 999);
      for (const ox of [-L.T, 0, L.T]) for (const oy of [-L.T, 0, L.T]) {
        const x0 = x + ox, y0 = y + oy; if (x0 < -80 || x0 > L.T + 80 || y0 < -80 || y0 > L.T + 80) continue;
        strokeG(g, [[x0, y0], [x0 + RAIN_DIR[0] * len * 0.5, y0 + RAIN_DIR[1] * len * 0.5], [x0 + RAIN_DIR[0] * len, y0 + RAIN_DIR[1] * len]], (u) => wd * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 1.15))), L.col, { taper: false, tex: 0.5, seed: sd, wobble: 0.15 });
      }
    }
  });
}
/** small puffy dawn cloud (flat bottom), reference-style */
function dawnCloud(key, w, h, seed) {
  return sprite(key, w + 60, h + 60, (g) => {
    g.translate(30, 30); const R = rng(seed);
    const lumps = []; const n = 4 + Math.floor(R() * 2);
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; const r = h * (0.38 + 0.5 * Math.sin(Math.PI * u) * (0.7 + R() * 0.4)); lumps.push([w * (0.1 + 0.8 * u) + (R() - 0.5) * 20, h - r * 0.75, r]); }
    const U = new Path2D(); lumps.forEach(([x, y, r], i) => U.addPath(rough(ellipsePts(x, y, r * 1.1, r * 0.9, 40), { amp: 2, seed: seed + i })));
    const base = rough([[w * 0.02, h * 0.8], [w * 0.98, h * 0.8], [w, h], [0, h]], { amp: 2, seed: seed + 50 }); U.addPath(base);
    g.save(); const clipBottom = new Path2D(); clipBottom.rect(-30, -30, w + 60, h + 4); g.clip(clipBottom);
    fillG(g, U, '#C9AFC0', { tex: 0.4, dir: 0, scale: 0.5 });
    g.save(); g.clip(U);
    lumps.forEach(([x, y, r], i) => fillG(g, rough(ellipsePts(x - r * 0.1, y - r * 0.18, r * 0.95, r * 0.75, 40), { amp: 2, seed: seed + i + 20 }), '#F3E2D2', { tex: 0.4, dir: 0, scale: 0.4 }));
    fillG(g, rough([[-10, h * 0.82], [w * 0.55, h * 0.84], [w * 0.4, h + 10], [-10, h + 10]], { amp: 2, seed: seed + 60 }), '#F2C98E', { tex: 0.3, alpha: 0.8 });
    g.restore(); g.restore();
  });
}
// ============================================================================ props
// ---- the brass kandil: same object as in the previous shot (scenes/lamps.js art, ported; spout mirrored to the right)
const KAND = {
  body: [[-62, -62], [-50, -80], [-20, -90], [20, -90], [52, -82], [74, -66], [78, -50], [64, -36], [36, -28], [0, -25], [-34, -28], [-58, -40]],
  spout: [[-48, -86], [-80, -93], [-108, -99], [-128, -105], [-137, -104], [-140, -98], [-134, -93], [-110, -86], [-84, -75], [-62, -58], [-46, -60]],
  lid: [[-28, -88], [-25, -100], [-13, -110], [0, -113], [13, -110], [25, -100], [28, -88], [0, -85]],
  foot: [[-36, 0], [-31, -7], [-15, -12], [-11, -25], [11, -25], [15, -12], [31, -7], [36, 0]],
  hOut: [[70, -75], [96, -94], [120, -97], [136, -82], [133, -60], [113, -46], [86, -40], [70, -46]],
  hIn: [[81, -66], [100, -81], [116, -83], [124, -70], [118, -58], [102, -52], [85, -53]],
};
const KB = { base: '#C99A3E', shade: '#93652A', deep: '#6B4721', light: '#E8C276', hi: '#FAE7B4', band: '#7A5321', dot: '#F3D58E' };
const KSPR = { x0: -150, y0: -152, w: 300, h: 160, s: 1.6 };
const KAND_K = 0.25;                         // world px per kandil art unit (lamp ≈ 69 px long, S = 360)
const K_NOZ = [-138, -101], K_CEN = [-2, -72];
function kandilShapes() {
  const cr = (pts) => crPts(pts, true, 8);
  const rp = (pts, seed, amp = 0.9) => rough(cr(pts), { amp, seed, step: 3, freq: 0.06 });
  const handle = new Path2D(); handle.addPath(rp(KAND.hOut, 11)); handle.addPath(rp(KAND.hIn.slice().reverse(), 12));
  return { handle, foot: rp(KAND.foot, 13), body: rp(KAND.body, 14), spout: rp(KAND.spout, 15), lid: rp(KAND.lid, 16),
    collar: rough(ellipsePts(0, -25, 17, 4.5, 20), { amp: 0.5, seed: 17 }), finStem: rough([[-4, -124], [4, -124], [5, -111], [-5, -111]], { amp: 0.4, seed: 18 }),
    ball: rough(ellipsePts(0, -129, 7.5, 7, 18), { amp: 0.4, seed: 19 }), tip: rough(cr([[0, -147], [3, -138], [0, -134], [-3, -138]]), { amp: 0.3, seed: 20 }),
    noz: rough(ellipsePts(-138, -99, 4.5, 6.5, 14, 0.5), { amp: 0.4, seed: 21 }) };
}
function paintKandil(g) {
  const K = kandilShapes();
  const F = (p, c, o = {}) => fillG(g, p, c, { tex: 0.45, scale: 0.3, ...o });
  const clipFill = (clipP, fn) => { g.save(); g.clip(clipP); fn(); g.restore(); };
  F(K.handle, KB.base, { dir: 0.8 });
  clipFill(K.handle, () => { F(rough(ellipsePts(118, -48, 34, 18, 30, -0.3), { amp: 1, seed: 30 }), KB.shade); F(rough(ellipsePts(140, -60, 10, 30, 20), { amp: 1, seed: 31 }), KB.deep); F(rough(ellipsePts(100, -96, 22, 5, 20, 0.2), { amp: 0.6, seed: 32 }), KB.light); });
  F(K.foot, KB.shade, { dir: 0 });
  clipFill(K.foot, () => { F(rough(ellipsePts(-12, -10, 16, 4, 16), { amp: 0.6, seed: 33 }), KB.light); F(rough(ellipsePts(26, -2, 18, 6, 16), { amp: 0.6, seed: 34 }), KB.deep); });
  F(rough([[-36, -2], [36, -2], [35, 1], [-35, 1]], { amp: 0.4, seed: 35 }), KB.deep, { tex: 0.2 });
  F(K.collar, KB.base, { tex: 0.3 });
  F(K.body, KB.shade, { dir: 0.15 });
  clipFill(K.body, () => {
    F(rough(crPts([[-66, -64], [-52, -86], [-18, -94], [24, -93], [54, -84], [70, -70], [66, -54], [40, -44], [0, -40], [-40, -44]], true, 8), { amp: 1.2, seed: 36 }), KB.base, { dir: 0.1 });
    F(rough(crPts([[-60, -70], [-44, -84], [-14, -91], [14, -90], [8, -82], [-20, -78], [-46, -70]], true, 8), { amp: 1, seed: 37 }), KB.light, { dir: 0.1 });
    F(rough(crPts([[30, -30], [58, -40], [80, -54], [84, -30], [40, -20]], true, 8), { amp: 1, seed: 38 }), KB.deep, { dir: 0.1 });
    const band = []; for (let k = 0; k <= 24; k++) { const th = (k / 24) * Math.PI; band.push([8 + Math.cos(th) * 74, -62 + Math.sin(th) * 9]); }
    const band2 = []; for (let k = 24; k >= 0; k--) { const th = (k / 24) * Math.PI; band2.push([8 + Math.cos(th) * 74, -53 + Math.sin(th) * 9.5]); }
    F(rough(band.concat(band2), { amp: 0.5, seed: 39, step: 3 }), KB.band, { tex: 0.25 });
    const dp = new Path2D(); for (let k = 1; k < 20; k++) { const th = (k / 20) * Math.PI; dp.addPath(rough(ellipsePts(8 + Math.cos(th) * 74, -57.5 + Math.sin(th) * 9.3, 1.9, 1.9, 8), { amp: 0.25, seed: 60 + k, step: 1.5 })); }
    F(dp, KB.dot, { tex: 0.1 });
    const ep = new Path2D(); for (let k = 0; k < 5; k++) { const cx = -36 + k * 20; ep.addPath(rough(crPts([[cx - 7, -70], [cx, -78], [cx + 7, -70], [cx, -73]], true, 6), { amp: 0.3, seed: 80 + k, step: 1.5 })); }
    F(ep, KB.band, { tex: 0.1, alpha: 0.55 });
    F(rough(ellipsePts(-32, -82, 9, 3.2, 14, -0.15), { amp: 0.4, seed: 40 }), KB.hi, { tex: 0.15 });
  });
  F(K.spout, KB.base, { dir: -0.2 });
  clipFill(K.spout, () => {
    F(rough(crPts([[-48, -88], [-80, -95], [-110, -101], [-132, -108], [-128, -99], [-104, -94], [-76, -88], [-50, -82]], true, 6), { amp: 0.6, seed: 41 }), KB.light, { dir: -0.2 });
    F(rough(crPts([[-136, -92], [-112, -84], [-86, -72], [-62, -55], [-60, -66], [-90, -80], [-118, -90]], true, 6), { amp: 0.6, seed: 42 }), KB.shade, { dir: -0.2 });
    F(rough([[-64, -92], [-58, -91], [-56, -60], [-62, -60]], { amp: 0.4, seed: 43 }), KB.band, { tex: 0.2 });
  });
  F(K.noz, KB.deep, { tex: 0.2 });
  F(K.lid, KB.base, { dir: 0 });
  clipFill(K.lid, () => { F(rough(ellipsePts(16, -96, 14, 14, 18), { amp: 0.6, seed: 44 }), KB.shade); F(rough(ellipsePts(-10, -104, 9, 4, 14, -0.4), { amp: 0.5, seed: 45 }), KB.light); });
  F(rough([[-30, -91], [30, -91], [29, -86], [-29, -86]], { amp: 0.5, seed: 46 }), KB.band, { tex: 0.2 });
  const dp2 = new Path2D(); for (let k = 0; k < 9; k++) dp2.addPath(rough(ellipsePts(-24 + k * 6, -88.5, 1.4, 1.4, 8), { amp: 0.2, seed: 90 + k, step: 1 }));
  F(dp2, KB.dot, { tex: 0.1 });
  F(K.finStem, KB.shade, { tex: 0.2 });
  F(K.ball, KB.base, { tex: 0.25 });
  clipFill(K.ball, () => { F(rough(ellipsePts(4, -126, 6, 6, 12), { amp: 0.3, seed: 47 }), KB.shade); F(rough(ellipsePts(-2.5, -131.5, 2.6, 2, 10), { amp: 0.2, seed: 48 }), KB.hi, { tex: 0 }); });
  F(K.tip, KB.light, { tex: 0.2 });
}
function paintKandilSil(g, col) { const K = kandilShapes(); g.fillStyle = col; for (const p of [K.handle, K.foot, K.body, K.spout, K.lid, K.finStem, K.ball, K.tip, K.collar]) g.fill(p); }
const kandilSprite = () => sprite('mtn_kandil', KSPR.w * KSPR.s, KSPR.h * KSPR.s, (g) => { g.scale(KSPR.s, KSPR.s); g.translate(-KSPR.x0, -KSPR.y0); paintKandil(g); });
const kandilSil = () => sprite('mtn_kandil_sil', KSPR.w, KSPR.h, (g) => { g.translate(-KSPR.x0, -KSPR.y0); paintKandilSil(g, '#262B4A'); });
/** draw the kandil with its foot centre at (x,y); ang = small tilt; shade = night tint amount; sc = extra scale */
function drawLamp(g, x, y, ang, shade = 0, sc = 1, alpha = 1) {
  if (alpha <= 0.002) return;
  g.save(); g.globalAlpha *= alpha; g.translate(x, y); if (ang) g.rotate(ang); g.scale(-KAND_K * sc, KAND_K * sc);
  g.drawImage(kandilSprite(), KSPR.x0, KSPR.y0, KSPR.w, KSPR.h);
  if (shade > 0.01) { g.globalAlpha *= shade; g.drawImage(kandilSil(), KSPR.x0, KSPR.y0, KSPR.w, KSPR.h); }
  g.restore();
}
/** flame base (nozzle tip) for a lamp whose foot centre is at (x,y) */
function flameTip(x, y, ang, sc = 1) { const lx = -K_NOZ[0] * KAND_K * sc, ly = K_NOZ[1] * KAND_K * sc - 1; const c = Math.cos(ang), s = Math.sin(ang); return [x + lx * c - ly * s, y + lx * s + ly * c]; }
function lampCentre(x, y, sc = 1) { return [x - K_CEN[0] * KAND_K * sc, y + K_CEN[1] * KAND_K * sc]; }
function flamePathL(x, y, h, w, lean) {
  const pts = []; const n = 18;
  for (let i = 0; i <= n; i++) { const u = i / n; const bulge = Math.sin(Math.PI * Math.pow(u, 0.62)) * (1 - u * 0.15); pts.push([x + w * 0.5 * bulge + lean * u * u, y - h * u]); }
  for (let i = n - 1; i >= 1; i--) { const u = i / n; const bulge = Math.sin(Math.PI * Math.pow(u, 0.62)) * (1 - u * 0.15); pts.push([x - w * 0.5 * bulge + lean * u * u, y - h * u]); }
  return toPath(pts);
}
/** teardrop flame with inner core (as in the lamps shot); lean in px at the tip (wind), sc = size factor */
function drawFlame(g, fx, fy, sc, t, seed = 1, wind = 0) {
  if (sc <= 0.01) return;
  const fl = 1 + 0.06 * noise1(t * 7.3, seed) + 0.03 * noise1(t * 17, seed + 4);
  const h = 0.088 * S * sc * fl * (1 + 0.12 * Math.abs(wind)), w = 0.038 * S * Math.min(1, 0.4 + sc * 0.6) * (1 - 0.15 * Math.abs(wind));
  const lean = h * (0.07 * noise1(t * 3.1, seed + 9) + wind);
  fillG(g, flamePathL(fx, fy + 2, h, w, lean), '#EC9D3A', { tex: 0.25, dir: -Math.PI / 2, scale: 0.25, tx: fx, ty: fy });
  fillG(g, flamePathL(fx, fy + 1, h * 0.74, w * 0.68, lean * 0.8), '#F7CB66', { tex: 0.2, dir: -Math.PI / 2, scale: 0.25, tx: fx, ty: fy });
  fillG(g, flamePathL(fx, fy - 0.5, h * 0.42, w * 0.38, lean * 0.5), '#FCF2D6', { tex: 0.1, dir: -Math.PI / 2, scale: 0.25, tx: fx, ty: fy });
  fillG(g, toPath(ellipsePts(fx, fy + 1.5, w * 0.2, w * 0.13, 10)), '#7C7FB0', { tex: 0, alpha: 0.7 });
}
// ---- the eternity ring (echo of the previous shot) around the kandil on "bu sırra"
function ringPoly(cx, cy, R, seed, amp, N = 120, a0 = 0, a1 = TAU) {
  const pts = [];
  for (let i = 0; i <= N; i++) { const a = a0 + ((a1 - a0) * i) / N, ca = Math.cos(a), sa = Math.sin(a); pts.push([cx + ca * (R + amp * noise2(ca * 2.2 + 10, sa * 2.2 + 10, seed)), cy + sa * (R + amp * noise2(ca * 2.2 + 10, sa * 2.2 + 10, seed))]); }
  return pts;
}
function bandPath(cx, cy, r0, r1, a0, a1, seed, amp = 0.6, N = 160) { return toPath(ringPoly(cx, cy, r1, seed, amp, N, a0, a1).concat(ringPoly(cx, cy, r0, seed + 1, amp, N, a0, a1).reverse())); }
function drawEternity(g, t, c, R, a) {
  const p = seg(t, 42.62, 43.3, E.inOutCubic);
  if (p <= 0 || a <= 0.01) return;
  g.save(); g.globalAlpha *= a;
  const a0 = -Math.PI / 2, spin = 0.16 * (t - 42.6), lw = R / 60;
  fillG(g, bandPath(c[0], c[1], R - lw, R + lw, a0, a0 + TAU * p, 501, 0.3 * lw, 180), '#EDCB7E', { tex: 0.25, tx: c[0], ty: c[1] });
  fillG(g, bandPath(c[0], c[1], R - 6.5 * lw, R - 5.8 * lw, a0, a0 - TAU * p, 503, 0.25 * lw, 160), '#D7AE5E', { tex: 0.2, alpha: 0.8, tx: c[0], ty: c[1] });
  const dp = new Path2D(), n = 60;
  for (let i = 0; i < n; i++) { const an = a0 + (i / n) * TAU; const rv = clamp((p * TAU - (i / n) * TAU) / 0.5); if (rv <= 0) continue; const aa = an + spin, rr = 1.4 * lw * E.outBackSoft(rv); toPath(ellipsePts(c[0] + Math.cos(aa) * (R + 6 * lw), c[1] + Math.sin(aa) * (R + 6 * lw), rr, rr, 8), true, dp); }
  fillG(g, dp, '#EDCB7E', { tex: 0.15 });
  g.restore();
}
/** painted concentric light rings (flat, rough edges), each with own alpha */
function lightRings(g, x, y, r, rings, seed = 5, amp = 2, comp = null) {
  if (comp) { g.save(); g.globalCompositeOperation = comp; }
  for (let i = 0; i < rings.length; i++) {
    const [k, col, a] = rings[i]; if (a <= 0.002) continue;
    const rr = r * k;
    fillG(g, rough(ellipsePts(x, y, rr, rr, Math.max(30, Math.round(rr * 0.35))), { amp: amp * (0.6 + rr / 300), freq: 0.05, seed: seed + i * 7, step: 6 }), col, { tex: 0.25, dir: 0, scale: 0.5, alpha: a });
  }
  if (comp) g.restore();
}
/** Ottoman ibrik (ewer). origin = base centre. returns spout tip offset (S units, local) */
const IBRIK_GRIP = [-0.072, -0.118];
const IBRIK_SPOUT = [0.118, -0.152];
function drawIbrik(g, gx, gy, tilt, sc = 1, alpha = 1, reveal = 1) {
  if (alpha <= 0.002) return;
  g.save(); g.globalAlpha *= alpha;
  g.translate(gx, gy); g.rotate(tilt); g.scale(sc, sc); g.translate(-IBRIK_GRIP[0] * S, -IBRIK_GRIP[1] * S);
  if (reveal < 1) { // paint-in: a rough wipe from the bottom up
    const cl = new Path2D(); const yTop = lerp(0.02, -0.23, reveal) * S;
    cl.addPath(rough([[-0.2 * S, 0.05 * S], [0.2 * S, 0.05 * S], [0.2 * S, yTop + 6], [0, yTop - 4], [-0.2 * S, yTop + 8]], { amp: 3, seed: 3 }));
    g.clip(cl);
  }
  const s = S; const P2 = (pts) => pts.map(([a, b]) => [a * s, b * s]);
  const rp = (pts, seed, amp = 0.6) => rough(P2(pts), { amp, seed, step: 3 });
  // handle
  strokeG(g, P2(crPts([[-0.02, -0.132], [-0.06, -0.128], [-0.078, -0.105], [-0.07, -0.07], [-0.046, -0.045]], false, 6)), 0.012 * s, C.copperD, { taper: false, seed: 3 });
  // spout
  const sp = crPts([[0.03, -0.05], [0.07, -0.065], [0.09, -0.1], [0.104, -0.138], [IBRIK_SPOUT[0], IBRIK_SPOUT[1]]], false, 6);
  strokeG(g, P2(sp), (u) => lerp(0.02, 0.008, u) * s, C.copper, { taper: false, seed: 4 });
  // body
  const body = crPts([[0, 0.002], [0.034, 0.0], [0.05, -0.03], [0.05, -0.06], [0.034, -0.09], [0.017, -0.115], [0.016, -0.142], [0.025, -0.152], [-0.025, -0.152], [-0.016, -0.142], [-0.017, -0.115], [-0.034, -0.09], [-0.05, -0.06], [-0.05, -0.03], [-0.034, 0.0]], true, 5);
  fillG(g, rp(body, 7), C.copper, { tex: 0.4, dir: Math.PI / 2, scale: 0.25 });
  fillG(g, rp(crPts([[0.012, -0.004], [0.036, -0.012], [0.048, -0.04], [0.044, -0.07], [0.028, -0.095], [0.03, -0.06], [0.026, -0.03]], true, 5), 9, 0.4), C.copperD, { tex: 0.3, alpha: 0.9 });
  fillG(g, rp(crPts([[-0.03, -0.075], [-0.038, -0.05], [-0.03, -0.022], [-0.022, -0.045]], true, 5), 11, 0.3), C.copperL, { tex: 0.3, alpha: 0.95 });
  // lid + finial
  fillG(g, rp(crPts([[-0.024, -0.152], [-0.016, -0.168], [0.0, -0.174], [0.016, -0.168], [0.024, -0.152]], false, 5).concat([[0.024, -0.152]]), 13, 0.4), C.copperL, { tex: 0.3 });
  fillG(g, rough(ellipsePts(0, -0.183 * s, 0.0065 * s, 0.0075 * s, 14), { amp: 0.3, seed: 15 }), C.brassL, { tex: 0.2 });
  // foot ring
  fillG(g, rp([[-0.03, 0.0], [0.03, 0.0], [0.026, 0.01], [-0.026, 0.01]], 16, 0.3), C.copperD, { tex: 0.2 });
  g.restore();
}
function ibrikPoint(gx, gy, tilt, local, sc = 1) {
  const lx = (local[0] - IBRIK_GRIP[0]) * S * sc, ly = (local[1] - IBRIK_GRIP[1]) * S * sc; const c = Math.cos(tilt), s = Math.sin(tilt);
  return [gx + lx * c - ly * s, gy + lx * s + ly * c];
}
/** tied cloth bundle (bohça): soft squarish sack, folds radiating from the top knot, two tied corner ears, woven border.
 * origin = centre. local x fwd, y down. sag = extra squash when resting on the ground */
function drawBundle(g, x, y, ang, sc, sag = 0) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(sc * (1 + sag * 0.12), sc * (1 - sag * 0.1));
  const s = S; const P2 = (pts) => pts.map(([a, b]) => [a * s, b * s]);
  const knot = [-0.004, -0.088];
  const body = crPts([[-0.108, -0.056], [-0.06, -0.074], [-0.01, -0.084], [0.05, -0.078], [0.104, -0.06], [0.118, -0.01], [0.114, 0.056], [0.086, 0.086], [0.0, 0.094], [-0.084, 0.09], [-0.114, 0.058], [-0.12, 0.0]], true, 5);
  const bp = rough(P2(body), { amp: 1, seed: 31, step: 3 });
  fillG(g, bp, C.cloth, { tex: 0.5, dir: 0.2, scale: 0.3 });
  g.save(); g.clip(bp);
  // shade: lower back half; light: upper front facet
  fillG(g, rough(P2(crPts([[0.02, -0.03], [0.11, -0.02], [0.11, 0.1], [-0.11, 0.1], [-0.1, 0.055], [-0.02, 0.05]], true, 5)), { amp: 1, seed: 32 }), C.clothD, { tex: 0.4, alpha: 0.92 });
  fillG(g, rough(P2(crPts([[-0.09, -0.045], [-0.05, -0.072], [-0.012, -0.078], [-0.03, -0.035], [-0.075, -0.0]], true, 5)), { amp: 1, seed: 33 }), C.clothL, { tex: 0.4, alpha: 0.9 });
  // folds radiating from the knot
  [[-0.085, 0.02], [-0.045, 0.07], [0.015, 0.075], [0.07, 0.05], [0.095, -0.0]].forEach(([ex, ey], i) => {
    const mid = [lerp(knot[0], ex, 0.5) + (i - 2) * 0.006, lerp(knot[1], ey, 0.5)];
    strokeG(g, P2(crPts([knot, mid, [ex, ey]], false, 6)), 0.006 * s, i % 2 ? C.clothD : mix(C.clothD, C.cloth, 0.4), { alpha: 0.75, seed: 70 + i });
  });
  // woven border near the hem: two thin lines + dots
  const hem = (o) => crPts([[-0.11, 0.045 + o], [-0.06, 0.066 + o], [0.0, 0.07 + o], [0.06, 0.064 + o], [0.11, 0.042 + o]], false, 6);
  strokeG(g, P2(hem(0)), 0.006 * s, C.clothPat, { taper: false, alpha: 0.85, seed: 81 });
  strokeG(g, P2(hem(0.022)), 0.005 * s, C.clothPat, { taper: false, alpha: 0.75, seed: 82 });
  const hp = hem(0.011); const dp = new Path2D();
  for (let i = 2; i < hp.length - 2; i += 3) toPath(ellipsePts(hp[i][0] * s, hp[i][1] * s, 0.004 * s, 0.004 * s, 8), true, dp);
  fillG(g, dp, C.clothPat, { tex: 0.1, alpha: 0.9 });
  g.restore();
  // tied ears (two corners knotted on top) + knot
  fillG(g, rough(P2(crPts([[-0.02, -0.084], [-0.066, -0.132], [-0.078, -0.118], [-0.05, -0.09]], true, 5)), { amp: 0.6, seed: 35 }), C.clothL, { tex: 0.4, dir: -0.8 });
  fillG(g, rough(P2(crPts([[0.006, -0.086], [0.05, -0.138], [0.068, -0.126], [0.03, -0.084]], true, 5)), { amp: 0.6, seed: 36 }), C.cloth, { tex: 0.4, dir: 0.8 });
  fillG(g, rough(ellipsePts(knot[0] * s, knot[1] * s, 0.021 * s, 0.015 * s, 16), { amp: 0.5, seed: 37 }), C.clothD, { tex: 0.3 });
  fillG(g, rough(ellipsePts((knot[0] - 0.005) * s, (knot[1] - 0.004) * s, 0.008 * s, 0.005 * s, 10), { amp: 0.3, seed: 38 }), C.clothL, { tex: 0.2 });
  g.restore();
}
/** dry sapling (~0.4 S): drooping brown leaves; perks up with a bounce when the water reaches it, greens after he has passed */
function drawSapling(g, x, y, t) {
  const s = S;
  const perk = seg(t, 45.18, 45.7, E.outBackSoft), green = seg(t, 45.75, 46.5, E.inOutSine), buds = seg(t, 46.0, 46.6, E.outBackSoft);
  const droop = 1 - 0.75 * perk;
  const trunkTop = [x + 6 - 2 * perk, y - (0.36 + 0.04 * perk) * s];
  const trunk = crPts([[x, y], [x + 3, y - 0.1 * s], [x - 2, y - 0.2 * s], [x + 2 + 2 * droop, y - 0.29 * s], trunkTop], false, 5);
  strokeG(g, trunk, (u) => lerp(9, 3, u), '#7B5D4B', { taper: false, seed: 2 });
  const leafCol = mix('#8E6B4C', C.leaf, green), leafD = mix('#6E5240', C.leafDark ?? '#2C5E3B', green);
  const br = [[0.16, -1, 0.11], [0.22, 1, 0.12], [0.28, -1, 0.1], [0.33, 1, 0.08]];
  br.forEach(([hh, side, len], i) => {
    const bx = lerp(x, trunkTop[0], hh / 0.38), by = y - hh * s;
    const up = lerp(-0.1, 0.55, perk) * (1 - 0.15 * i);           // branch angle: drooping → lifted
    const a = side > 0 ? -up : Math.PI + up;
    const ex = bx + Math.cos(a) * len * s, ey = by + Math.sin(a) * len * s + droop * 0.03 * s;
    strokeG(g, [[bx, by], [lerp(bx, ex, 0.5), lerp(by, ey, 0.5) - 0.01 * s * perk], [ex, ey]], (u) => lerp(3.4, 1.4, u), '#6B5143', { taper: false, seed: 5 + i });
    // leaves hanging from the branch tip (droop) / lifted (perk)
    for (let k = 0; k < 2; k++) {
      const la = lerp(Math.PI / 2 + side * 0.35, -Math.PI / 2 + side * 0.9, perk) + k * 0.5 * side;
      const lx = ex + Math.cos(la) * 0.03 * s * 0.6, ly = ey + Math.sin(la) * 0.03 * s * 0.6;
      fillG(g, rough(ellipsePts(lx, ly, 0.026 * s, 0.01 * s, 12, la), { amp: 0.4, seed: 40 + i * 3 + k }), k ? leafD : leafCol, { tex: 0.3, dir: la });
    }
    if (buds > 0.01) fillG(g, rough(ellipsePts(lerp(bx, ex, 0.55), lerp(by, ey, 0.55) - 5, 4.5 * buds, 3 * buds, 10, a), { amp: 0.3, seed: 60 + i }), C.leaf, { tex: 0.2 });
  });
  const tl = 0.6 * green + 0.4 * perk;
  fillG(g, rough(ellipsePts(trunkTop[0] + 4, trunkTop[1] - 3, 0.024 * s * (0.7 + 0.3 * tl), 0.011 * s, 12, -0.9 + perk * 0.4), { amp: 0.4, seed: 51 }), leafCol, { tex: 0.3 });
}
// ============================================================================ the man: pose for every t
let LAMP_STAND = null; // lamp base point when standing
function lampHoldWrist(sh, t) {
  // wrist in front of the chest, forearm forward; tiny steadying sway
  return [sh[0] + 0.158 * S + 0.004 * S * noise1(t * 0.9, 3), sh[1] + 0.128 * S + 0.003 * S * noise1(t * 1.1, 5)];
}
const LAMP_ON_HAND = [0.0, -0.013]; // lamp base relative to the hand point (S units)

// summit choreography (video s)
const T_BEND = [51.0, 51.62];        // one hip-hinge bend: lamp (near hand) then ibrik (far hand) onto the slab
const T_LAMP_DOWN = 51.3, T_IBRIK_DOWN = 51.4;
const T_STRAP = [51.43, 51.55], T_LOWER = [51.55, 51.84]; // far hand takes the strap, lowers the bundle behind him
const T_DUA = [51.86, 52.46];        // hands rise into du'a (elbow-angle interpolation), then hold
const RELAX_N = { sh: -0.04, el: 0.2, wr: 0.06 }, RELAX_F = { sh: 0.04, el: 0.22, wr: 0.06 };
const DUA_N = { sh: 0.22, el: 2.0, wr: 0.0 }, DUA_F = { sh: 0.5, el: 1.85, wr: 0.3 };
const mixSpec = (a, b, u) => ({ sh: lerp(a.sh, b.sh, u), el: lerp(a.el, b.el, u), wr: lerp(a.wr ?? 0, b.wr ?? 0, u) });
/** angles {sh,el} (sh rel. torso) that put the wrist at a world target (elbow behind) */
function specTo(sh, th, target, a3, size = S) {
  const tgt = [(target[0] - sh[0]) / size, (target[1] - sh[1]) / size];
  const [a1, a2] = ik2([0, 0], tgt, BL.upper, BL.fore, 1);
  return { sh: a1 - th, el: a2 - a1, wr: a3 - a2 };
}
function slopeSm(x) { return (slopeAt(x - 40) + slopeAt(x) + slopeAt(x + 40)) / 3; }
function pourEnv(t) { return env(t, 44.95, 45.62, 0.2, 0.18, E.inOutSine); }
function leanAt(t, d) {
  // lean follows the real slope under him (ramps when the ground actually rises), plus the load, minus serenity
  const sl = clamp(slopeSm(d + 0.12 * S) / 0.6);
  const load = seg(t, 47.36, 47.8, E.inOutSine), hos = seg(t, 47.95, 48.6, E.inOutSine);
  return 0.055 + 0.25 * sl * seg(t, TW0, TW0 + 0.6) + load * 0.1 - hos * 0.09 + 0.12 * pourEnv(t);
}
function manState(t) {
  const st = { t };
  const look = env(t, 43.82, 44.75, 0.45, 0.45); // looks up at the saints' lights
  const hos = seg(t, 47.95, 48.6, E.inOutSine);
  let pose, hipS;
  const Rm = 0.975 * (BL.thigh + BL.shin) * S;
  const reachClamp = (hy, hx, feet) => { for (const ft of feet) { const dx = ft.x - hx, ay = ft.y - BL.ankle * S; const need = ay - Math.sqrt(Math.max(0, Rm * Rm - dx * dx)); if (need > hy) hy = need; } return hy; };
  // ---------------------------------------------------------------- legs & hip
  if (t < TSTOP) {
    const d = Math.max(0, dAt(t));
    const fN = footAt(d, 0), fF = footAt(d, 0.5);
    const ph = phiAt(d);
    const wk = seg(t, TW0, TW0 + 0.5, E.inOutSine); // standing → walking blend for hip height
    const bob = Math.cos(ph * 2 * TAU) * 0.009 * S * wk;
    const gyAvg = (ground(d - 0.15 * S) + ground(d + 0.15 * S)) / 2;
    let hy = gyAvg - lerp(0.515, 0.955 * LEG, wk) * S + bob + 0.02 * S * env(t, 47.36, 48.1, 0.1, 0.5, E.outSine);
    hy = reachClamp(hy, d, [fN, fF]);
    const lean = leanAt(t, d);
    const neck = lerp(-lean * 0.55 + 0.03, -lean * 0.95 + 0.02, hos) - look * 0.32;
    pose = { hip: [d, hy], torso: lean + 0.012 * Math.cos(ph * 2 * TAU) * wk, neck, head: -look * 0.1 - hos * 0.05, breath: 0.5 + 0.5 * Math.sin(t * TAU / 3.4),
      legN: { ik: [fN.x, fN.y], ft: fN.ft }, legF: { ik: [fF.x, fF.y], ft: fF.ft } };
    st.ph = ph; st.walk = wk; st.d = d;
    hipS = [d, gyAvg - 0.5 * S];
  } else {
    // summit: closing step, one bend to set lamp & ibrik on the slab, bundle lowered by the strap, du'a
    const { rearIsN, front, rear, rearEnd, hipEnd } = SUMMIT;
    const c = seg(t, TSTOP, TSTOP + 0.36, E.inOutSine);
    const rx = lerp(rear.x, rearEnd, c);
    const rlift = Math.sin(Math.PI * c) * 0.035 * S;
    const rearT = { x: rx, y: ground(rx) - rlift, ft: lerp(rear.ft, -Math.atan(slopeAt(rx)), c) };
    const frontT = { x: front.x, y: ground(front.x), ft: lerp(front.ft, -Math.atan(slopeAt(front.x)), c) };
    const hipX = lerp(D_END, hipEnd, c);
    const bend = env(t, T_BEND[0], T_BEND[1], 0.3, 0.26, E.inOutSine);
    const gy = (ground(hipX - 0.1 * S) + ground(hipX + 0.1 * S)) / 2;
    let hy = gy - lerp(0.955 * LEG, 0.522, c) * S + bend * 0.022 * S;
    hy = reachClamp(hy, hipX, [rearT, frontT]);
    const dua = seg(t, T_DUA[0], T_DUA[1], E.inOutCubic);
    const dip = env(t, T_STRAP[0], T_LOWER[1], 0.12, 0.2, E.inOutSine); // near shoulder dips as the strap comes off
    const lean = lerp(0.055, 0.0, seg(t, TSTOP, T_BEND[0])) + bend * 0.48 - dip * 0.05;
    pose = { hip: [hipX, hy], torso: lean, neck: -lean * 0.3 + bend * 0.14 - dua * 0.1, head: -dua * 0.12, breath: 0.5 + 0.5 * Math.sin(t * TAU / 3.6),
      legN: rearIsN ? { ik: [rearT.x, rearT.y], ft: rearT.ft } : { ik: [frontT.x, frontT.y], ft: frontT.ft },
      legF: rearIsN ? { ik: [frontT.x, frontT.y], ft: frontT.ft } : { ik: [rearT.x, rearT.y], ft: rearT.ft } };
    st.bend = bend; st.dua = dua; st.ph = phiAt(D_END); st.walk = 1 - c; st.d = D_END;
    hipS = [hipX, gy - 0.5 * S];
  }
  if (t <= TW0) {
    // standing at the foot of the path (feet planted, breathing)
    pose.legN = { ik: [STAND_N, ground(STAND_N)], ft: 0 }; pose.legF = { ik: [STAND_F, ground(STAND_F)], ft: 0 };
    pose.hip = [0, ground(0) - 0.515 * S + 0.003 * S * Math.sin(t * TAU / 3.4)];
    pose.torso = 0.02;
  }
  st.hipS = hipS;
  // ---------------------------------------------------------------- arms
  const sh = shoulders(pose.hip, pose.torso, pose.breath);
  const th = pose.torso;
  const ph = st.ph ?? 0, wk = st.walk ?? 0;
  const cphi = Math.cos(ph * TAU);
  // near arm: the lamp on the palm → set on the slab → relaxed → du'a
  st.lampPlaced = t >= T_LAMP_DOWN;
  let armN;
  if (t < T_BEND[0]) {
    armN = armTo(sh.shoulderN, lampHoldWrist(sh.shoulderN, t), Math.PI / 2, 'cup');
  } else if (t < T_BEND[1]) {
    const hold = lampHoldWrist(sh.shoulderN, t);
    const target = [SLAB.lampX - LAMP_ON_HAND[0] * S - BL.hand * 0.6 * S * Math.sin(Math.PI / 2), SLAB.lampY - LAMP_ON_HAND[1] * S];
    const relax = wristOf(sh.shoulderN, th, RELAX_N);
    let w;
    if (t < T_LAMP_DOWN) { const u = seg(t, T_BEND[0], T_LAMP_DOWN, E.inOutSine); w = [lerp(hold[0], target[0], u), lerp(hold[1], target[1], u)]; armN = armTo(sh.shoulderN, w, Math.PI / 2, 'cup'); }
    else { const u = seg(t, T_LAMP_DOWN + 0.04, T_BEND[1], E.inOutSine); w = [lerp(target[0], relax.wr[0], u), lerp(target[1], relax.wr[1], u) - Math.sin(Math.PI * u) * 0.015 * S]; armN = armTo(sh.shoulderN, w, lerp(Math.PI / 2, relax.a3, u), u > 0.3 ? 'relaxed' : 'cup'); }
  } else {
    armN = { ...mixSpec(RELAX_N, DUA_N, st.dua ?? 0), hand: (st.dua ?? 0) > 0.25 ? 'open' : 'relaxed' };
  }
  // far arm: swing → ibrik forward → pour low → carry → slab → strap → lower bundle → du'a
  const swingAmt = lerp(0.3, 0.14, seg(t, 44.5, 44.85));
  const swing = { sh: (0.08 + cphi * swingAmt) * wk + 0.03 * (1 - wk), el: 0.2 + Math.max(0, cphi) * 0.2 * wk, wr: 0.06 };
  const swingW = wristOf(sh.shoulderF, th, swing);
  let wrF = swingW.wr, a3F = swingW.a3, handF = t > 44.62 ? 'grip' : 'relaxed';
  const hold = env(t, 44.5, 46.0, 0.35, 0.34, E.inOutCubic);
  if (hold > 0) {
    const pour = pourEnv(t);
    const tgt = [st.hipS[0] + lerp(0.2, 0.21, pour) * S, pose.hip[1] + lerp(-0.05, -0.02, pour) * S];
    wrF = [lerp(wrF[0], tgt[0], hold), lerp(wrF[1], tgt[1], hold)];
    a3F = lerp(a3F, 1.25, hold);
  }
  let armF = null;
  st.strap = 0; st.lowerU = 0;
  if (t >= T_BEND[0] && t < T_DUA[0]) {
    const iT = [SLAB.ibrikX + IBRIK_GRIP[0] * S - Math.sin(1.25) * BL.hand * 0.6 * S, SLAB.ibrikY + IBRIK_GRIP[1] * S - Math.cos(1.25) * BL.hand * 0.6 * S];
    if (t < T_IBRIK_DOWN) { const u = seg(t, T_BEND[0] + 0.05, T_IBRIK_DOWN, E.inOutSine); wrF = [lerp(wrF[0], iT[0], u), lerp(wrF[1], iT[1], u)]; a3F = lerp(a3F, 1.25, u); }
    else {
      const strapP = [sh.shoulderN[0] + 0.035 * S, sh.shoulderN[1] + 0.085 * S];
      const lowP = [pose.hip[0] - 0.13 * S, pose.hip[1] + 0.02 * S];
      if (t < T_STRAP[1]) { const u = seg(t, T_IBRIK_DOWN + 0.03, T_STRAP[1], E.inOutSine); wrF = [lerp(iT[0], strapP[0], u), lerp(iT[1], strapP[1], u)]; a3F = lerp(1.25, 2.6, u); handF = u > 0.5 ? 'grip' : 'relaxed'; st.strap = u; }
      else { const u = seg(t, T_LOWER[0], T_LOWER[1], E.inOutSine); wrF = [lerp(strapP[0], lowP[0], u), lerp(strapP[1], lowP[1], u) - Math.sin(Math.PI * u) * 0.03 * S]; a3F = lerp(2.6, 0.1, u); handF = 'grip'; st.strap = 1; st.lowerU = u; }
    }
  }
  if (t >= T_DUA[0]) {
    // from the hand's position after lowering the bundle (behind the hip) into du'a, by joint angles
    const lowP = [pose.hip[0] - 0.13 * S, pose.hip[1] + 0.02 * S];
    const from = specTo(sh.shoulderF, th, lowP, 0.1);
    const u = st.dua ?? 0;
    armF = { ...mixSpec(from, DUA_F, u), hand: u > 0.3 ? 'open' : 'relaxed' };
  } else armF = armTo(sh.shoulderF, wrF, a3F, handF);
  pose.armN = armN; pose.armF = armF;
  st.pose = pose; st.fk = fk(pose);
  return st;
}

// ============================================================================ camera
let CAM_CLOSE = null;
const Z_CLOSE = 3.7;
function followCam(t, sx, sy, z, rot = 0) {
  const hx = t < TSTOP ? Math.max(0, dAt(t)) : lerp(D_END, SUMMIT.hipEnd, seg(t, TSTOP, TSTOP + 0.36, E.inOutSine));
  const hy = groundSmooth(hx) - 0.5 * S;
  return { x: hx + (W / 2 - sx) / z, y: hy + (H / 2 - sy) / z, z, rot };
}
let SUMMIT = null, SLAB = null;
// follow-cam tracks: screen position of the hip (sx, sy), zoom, dutch tilt
const CAM_SX = [[44.55, 430], [45.3, 405], [45.8, 400], [46.5, 345], [47.6, 380], [50.4, 405], [51.25, 520]];
const CAM_SY = [[44.55, 1030], [45.3, 1000], [45.8, 1000], [46.5, 1050], [47.6, 965], [50.4, 955], [51.25, 975]];
const CAM_Z = [[44.55, 0.95], [45.3, 1.16], [45.8, 1.16], [46.5, 1.0], [47.6, 1.1], [48.9, 1.15], [49.5, 1.22], [50.4, 1.24], [51.25, 1.3], [54.6, 1.37, E.inOutSine]];
const CAM_ROT = [[45.8, 0], [46.5, -0.075], [47.6, -0.05], [50.2, -0.03], [51.2, 0]];
function camAt(t) {
  const L = CAM_CLOSE; // the lamp flame: anchored on screen while the camera pulls back
  if (t < 42.7) { const z = Z_CLOSE - 0.08 * seg(t, 42.3, 42.7, E.linear); return { x: L.x, y: L.y, z, rot: 0 }; }
  if (t < 44.3) {
    const u = seg(t, 42.7, 44.3, E.inOutCubic);
    const z = Math.exp(lerp(Math.log(Z_CLOSE - 0.08), Math.log(CAM_E.z), u));
    const sE = [W / 2 + CAM_E.z * (L.x - CAM_E.x), H / 2 + CAM_E.z * (L.y - CAM_E.y)];
    const s = [lerp(W / 2, sE[0], u), lerp(H / 2, sE[1], u)];
    return { x: L.x - (s[0] - W / 2) / z, y: L.y - (s[1] - H / 2) / z, z, rot: 0 };
  }
  const drift = { x: CAM_E.x + 22 * seg(t, 44.3, 45.2, E.linear), y: CAM_E.y - 8 * seg(t, 44.3, 45.2, E.linear), z: CAM_E.z * (1 + 0.02 * seg(t, 44.3, 44.8, E.inOutSine)), rot: 0 };
  if (t < 44.55) return drift;
  const sx = track(CAM_SX, t), sy = track(CAM_SY, t), z = track(CAM_Z, t), rot = track(CAM_ROT, t);
  let fc = followCam(t, sx, sy, z, rot);
  if (t > 51.25) fc = { ...fc, y: fc.y - 16 * seg(t, 51.25, 54.6, E.inOutSine) / fc.z };
  if (t < 45.4) { const w = seg(t, 44.55, 45.4, E.inOutCubic); return { x: lerp(drift.x, fc.x, w), y: lerp(drift.y, fc.y, w), z: Math.exp(lerp(Math.log(drift.z), Math.log(fc.z), w)), rot: fc.rot * w }; }
  return fc;
}
function setCam(ctx, cam) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(W / 2, H / 2); if (cam.rot) ctx.rotate(cam.rot); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y); }
function setLayer(ctx, cam, ref, k) {
  const zs = Math.pow(cam.z / ref.z, k);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(W / 2, H / 2); if (cam.rot) ctx.rotate(cam.rot);
  ctx.translate(-(cam.x - ref.x) * k * cam.z, -(cam.y - ref.y) * k * cam.z); ctx.scale(zs, zs); ctx.translate(-W / 2, -H / 2);
}
const toScreen = (cam, p) => { const dx = (p[0] - cam.x) * cam.z, dy = (p[1] - cam.y) * cam.z; const c = Math.cos(cam.rot || 0), s = Math.sin(cam.rot || 0); return [W / 2 + dx * c - dy * s, H / 2 + dx * s + dy * c]; };

// ============================================================================ init
let FOOTSTEPS = [];
let READY = false;
export async function init() {
  if (READY) return;
  buildGround(); buildD(); buildPhi(); ZIG_L = zigLen();
  // final summit geometry
  {
    const fN0 = footAt(D_END, 0), fF0 = footAt(D_END, 0.5);
    const rearIsN = fN0.p > 0.3; const front = rearIsN ? fF0 : fN0, rear = rearIsN ? fN0 : fF0;
    const rearEnd = front.x + 0.06 * S * (rearIsN ? 1 : -1);
    const hipEnd = (front.x + rearEnd) / 2 - 0.01 * S;
    SUMMIT = { rearIsN, front, rear, rearEnd, hipEnd };
  }
  {
    // the summit crest: he stops on a shoulder just below it; an angular rock step rises in front of him (hip height,
    // where the lamp and the ibrik are set down), its top runs on and falls away as the mountain's own right flank
    const h = SUMMIT.hipEnd, g0 = ground(h), x0 = h + 0.15 * S, x1 = x0 + 1.5 * S;
    const topPts = [[x0 + 0.07 * S, g0 - 0.45 * S], [x0 + 0.2 * S, g0 - 0.475 * S], [x0 + 0.4 * S, g0 - 0.5 * S], [x0 + 0.58 * S, g0 - 0.45 * S], [x0 + 0.86 * S, g0 - 0.31 * S], [x0 + 1.17 * S, ground(x0 + 1.17 * S) - 0.12 * S], [x1, ground(x1) - 0.005 * S]];
    const topAt = (x) => { for (let i = 0; i < topPts.length - 1; i++) { const p = topPts[i], q = topPts[i + 1]; if (x <= q[0]) return lerp(p[1], q[1], invlerp(p[0], q[0], x)); } return topPts[topPts.length - 1][1]; };
    SLAB = { x0, x1, g0, topPts, topAt };
    SLAB.lampX = x0 + 0.115 * S; SLAB.lampY = topAt(SLAB.lampX) + 1;
    SLAB.ibrikX = x0 + 0.33 * S; SLAB.ibrikY = topAt(SLAB.ibrikX) + 1;
    SLAB.bundleX = h - 0.24 * S;
  }
  SAPLING_X = Math.round(dAt(45.3) + 0.5 * S);
  makeRocks();
  // lamp in the standing pose → close-up camera
  const st = manState(43.0);
  const hand = st.fk.armN.hand;
  LAMP_STAND = [hand[0] + LAMP_ON_HAND[0] * S, hand[1] + LAMP_ON_HAND[1] * S];
  const ftp = flameTip(LAMP_STAND[0], LAMP_STAND[1], 0);
  CAM_CLOSE = { x: lerp(LAMP_STAND[0], ftp[0], 0.45), y: lerp(LAMP_STAND[1], ftp[1], 0.4), z: Z_CLOSE };
  // footsteps (for the flowers): heel-strike events of both feet from "hoş" (47.95) to the summit
  FOOTSTEPS = [];
  for (const off of [0, 0.5]) for (let k = -1; k < 80; k++) {
    const phStrike = k - off; // phase at heel strike (start of stance)
    if (phStrike < PHI0) continue;
    const dl = dAtPhi(phStrike); if (dl > D_END + 1) break;
    const tl = tAtD(dl);
    const x = plantX(k, off);
    if (tl >= 47.93) FOOTSTEPS.push({ x, t: tl, off, k });
  }
  FOOTSTEPS.sort((a, b) => a.t - b.t);
  if (FOOTSTEPS.length) FOOTSTEPS[0].t = Math.max(FOOTSTEPS[0].t, 47.95);
  // sprites
  skySprite('mtn_sky_dusk', C.sky, [0, 230, 390, 520, 620, 700, 770, 830, 890], 101);
  skySprite('mtn_sky_dawn', C.dsky, [0, 205, 765, 830, 890, 950, 1010], 102, [215, 755]);
  farSprite('mtn_far', false); farSprite('mtn_far_dawn', true); massifSprite(); hillSprite();
  groundSprite(); groundDawnSprite();
  for (const k of ['A', 'B', 'C']) bankSprite(k);
  bankSprite('A', true); bankSprite('B', true);
  for (const L of RAIN_L) rainSprite(L);
  kandilSprite(); kandilSil();
  dawnCloud('mtn_dc1', 300, 90, 601); dawnCloud('mtn_dc2', 380, 110, 602); dawnCloud('mtn_dc3', 260, 56, 603); dawnCloud('mtn_dc4', 220, 50, 604);
  seaSprite(); dawnHillsSprite();
  buildClips();
  // "hoş görüyorlar": an opening burst of flowers around his feet and the nearest rocks
  { const d0 = dAt(47.95); BURST = [[-0.12, 0, 1.15], [0.24, 0.05, 1.05], [-0.3, 0.1, 1.0], [0.4, 0.15, 1.2], [-0.48, 0.2, 0.9], [0.56, 0.25, 1.0], [-0.66, 0.3, 0.85]].map(([o, dt, sz], i) => ({ x: d0 + o * S, t: 47.95 + dt, sz, seed: 1300 + i * 17, pink: i % 3 === 1 })); }
  CAM_S = { ...followCam(52.2, 520, 975, 1.3, 0), rot: 0 };
  for (const fs of FOOTSTEPS) [[0.9, 0], [1.1, 1], [0.8, 2]].forEach(([sz, j]) => flowerSprite(700 + fs.k * 7 + (fs.off ? 3 : 0) + j * 101, (fs.k + j + (fs.off ? 1 : 0)) % 3 === 1, sz));
  for (const b of BURST) flowerSprite(b.seed, b.pink, b.sz);
  READY = true;
  // pre-warm: draw a few representative frames once so first-use costs never land in a timed frame
  const scratch = new OffscreenCanvas(W, H), sg = scratch.getContext('2d');
  for (const tw of [42.5, 43.5, 45.3, 46.95, 48.5, 50.3, 51.3, 52.6, 54.3]) draw(sg, tw);
}
const st_lift = 0.62;

// ---- dawn vista sprites (summit-camera screen space)
function seaSprite() {
  return sprite('mtn_sea', 1700, 820, (g) => {
    g.translate(310, -880);
    const R = rng(401);
    const bands = [[900, C.dsea[0]], [950, C.dsea[1]], [1010, C.dsea[2]], [1080, C.dsea[3]]];
    for (const [y, c] of bands) {
      const top = []; for (let x = -320; x <= 1400; x += 24) top.push([x, y + Math.sin(x * 0.011 + y) * 9 + noise1(x * 0.02, y) * 10]);
      const p = rough(sil(top, 1720, -320, 1400), { amp: 3, seed: y });
      fillG(g, p, c, { tex: 0.35, dir: 0, scale: 0.6 });
      dabs(g, p, { colors: [mix(c, '#ffffff', 0.05), mix(c, '#000000', 0.025)], n: 200, len: [40, 120], wid: [6, 12], dir: 0, seed: y + 3, bbox: [-320, y - 20, 1400, 1720], alpha: 0.7 });
    }
  });
}
const DH = {};
const ridgeY = (pts, x) => { for (let i = 0; i < pts.length - 1; i++) if (x <= pts[i + 1][0]) return lerp(pts[i][1], pts[i + 1][1], invlerp(pts[i][0], pts[i + 1][0], x)); return pts[pts.length - 1][1]; };
function dawnHillsSprite() {
  return sprite('mtn_dhills', 1800, 1200, (g) => {
    g.translate(360, -900);
    const rimMass = (top, closeY, base, light, seed, n) => {
      const path = paintMass(g, top, closeY, { base, light, shade: base, dabs: [mix(base, '#ffffff', 0.05), mix(base, '#000000', 0.04)] }, { seed, peaks: [], n });
      // the low sun (left) lights the left-facing slopes: a thin broken warm rim along the ridge
      const rim = []; for (let i = 1; i < top.length; i++) if (top[i][1] < top[i - 1][1] + 0.5) rim.push([top[i][0], top[i][1] + 2.5]); else if (rim.length) { if (rim.length > 3) strokeG(g, rim.slice(), 3.5, light, { taper: true, alpha: 0.8, seed: seed + rim.length }); rim.length = 0; }
      if (rim.length > 3) strokeG(g, rim, 3.5, light, { taper: true, alpha: 0.8, seed: seed + 1 });
      return path;
    };
    // mid-value hill rising behind the man's hands (keeps the cream sleeves and palms readable)
    DH.M = ridge([[280, 1150], [420, 960], [550, 868], [680, 830], [800, 838], [910, 890], [1010, 980], [1110, 1100]], 505, 5, 10, 0.02);
    DH.L = ridge([[-360, 1010], [-150, 960], [60, 1040], [260, 1120], [420, 1220]], 501, 8, 10, 0.02);
    DH.R = ridge([[700, 1150], [880, 1060], [1060, 1010], [1250, 1060], [1440, 1020]], 503, 8, 10, 0.02);
    rimMass(DH.M, 2100, '#9A84A8', '#D9B3A6', 506, 220);
    rimMass(DH.L, 2100, C.dhill, C.dhillL, 502, 260);
    rimMass(DH.R, 2100, C.dhillD, mix(C.dhillD, C.dhillL, 0.6), 504, 260);
  });
}

// ============================================================================ drawing helpers per frame
function blit(ctx, key, ox, oy, alpha = 1) {
  const sp = sprite(key, 1, 1, () => {}); if (alpha <= 0.002) return;
  ctx.globalAlpha = alpha; ctx.drawImage(sp, ox, oy); ctx.globalAlpha = 1;
}
const STARS = (() => { const R = rng(77); const a = []; for (let i = 0; i < 22; i++) a.push([R() * 1080, 40 + Math.pow(R(), 1.3) * 640, 1.4 + R() * 2.4, R()]); return a; })();
function drawStars(ctx, t, a) {
  if (a <= 0.01) return;
  for (const [x, y, r, ph] of STARS) {
    const tw = 0.65 + 0.35 * Math.sin(t * (1.3 + ph * 2) + ph * 20);
    ctx.globalAlpha = a * tw;
    fillG(ctx, rough(ellipsePts(x, y, r, r, 10), { amp: 0.3, seed: Math.floor(ph * 999) }), '#EFE5CC', { tex: 0 });
    if (r > 3.2) { strokeG(ctx, [[x - r * 3, y], [x, y], [x + r * 3, y]], 1.2, '#EFE5CC', { tex: 0, alpha: 0.6 }); strokeG(ctx, [[x, y - r * 3], [x, y], [x, y + r * 3]], 1.2, '#EFE5CC', { tex: 0, alpha: 0.6 }); }
  }
  ctx.globalAlpha = 1;
}
/** tint body colours for the ambient light */
const MAN_BASE = { skin: P.skin, skinShade: P.skinShade, hair: P.hair, shirt: P.shirt, shirtShade: P.shirtShade, vest: P.vest, vestShade: P.vestShade, trousers: P.trousers, trousersShade: P.trousersShade, shoe: P.shoe };
function manColors(tc, ta, warm = 0) {
  const o = {};
  for (const k in MAN_BASE) { let c = mix(MAN_BASE[k], tc, ta); if (warm > 0) c = mix(c, '#F2B66E', warm); o[k] = c; }
  return o;
}
const RIM_COL = (() => { const o = {}; for (const k in MAN_BASE) o[k] = '#F6D39A'; return o; })();
const stormAmt = (t) => seg(t, 46.2, 47.1, E.inOutSine) * (1 - seg(t, 50.7, 51.8, E.inOutSine));
const dawnAmt = (t) => seg(t, 50.85, 52.1, E.inOutSine);
function ambient(t) {
  // [tint colour, amount, warm]
  const storm = stormAmt(t), dawn = dawnAmt(t);
  const tc = mix(mix('#3B3F6E', '#343B4E', storm), '#E9B98A', dawn);
  const ta = lerp(lerp(0.26, 0.34, storm), 0.07, dawn);
  return [tc, ta, dawn * 0.05];
}
/** amber light rings: opaque flat tints of the local background toward the flame colour (reference-sun style) */
function lampRings(ctx, x, y, r, bg, a, seed = 11, warmK = 0) {
  const fl = mix('#F4C463', '#FFD9A0', warmK);
  lightRings(ctx, x, y, r, [[1, mix(mix(bg, '#7A4A2A', 0.25), fl, 0.26), 0.7 * a], [0.7, mix(bg, fl, 0.46), 0.85 * a], [0.45, mix(bg, fl, 0.74), 0.95 * a]], seed, 1.6);
}

// ---- tiny saints on the massif trail (layer space)
const SAINTS = [ // seg: trail segment, f: start fraction along it
  { seg: 0, f: 0.45, v: 7, s: 58, ap: 43.88 }, { seg: 1, f: 0.3, v: 6, s: 52, ap: 44.02 }, { seg: 2, f: 0.35, v: 6, s: 47, ap: 44.16 },
  { seg: 3, f: 0.3, v: 5, s: 43, ap: 44.3 }, { seg: 4, f: 0.25, v: 4, s: 39, ap: 44.44 }, { seg: 5, f: 0.2, v: 3, s: 35, ap: 44.58 },
];
function tinyWalker(x0, y0, dirx, diry, d, size, f) {
  const slope = diry / Math.abs(dirx);
  const gfn = (x) => y0 + (x - x0) * slope * f;
  const stride = 0.3 * size, cyc = d / (2 * stride);
  const footF = (off) => {
    const psi = cyc + off, k = Math.floor(psi), p = psi - k;
    const pl = (kk) => x0 + f * ((kk - off) * 2 * stride + 0.62 * stride);
    let x, lift = 0;
    if (p < 0.62) x = pl(k); else { const u = (p - 0.62) / 0.38; x = lerp(pl(k), pl(k + 1), u * u * (3 - 2 * u)); lift = Math.sin(Math.PI * u) * 0.05 * size; }
    return [x, gfn(x) - lift];
  };
  const hx = x0 + d * f; const fN = footF(0), fFf = footF(0.5);
  let hy = gfn(hx) - 0.49 * size + Math.cos(cyc * 2 * TAU) * 0.008 * size;
  const Rm = 0.97 * 0.49 * size;
  for (const ft of [fN, fFf]) { const dx = ft[0] - hx, ay = ft[1] - BL.ankle * size; const need = ay - Math.sqrt(Math.max(0, Rm * Rm - dx * dx)); if (need > hy) hy = need; }
  const th = 0.12 + Math.abs(slope) * 0.25;
  const sh = [hx + (Math.sin(th) * 0.26) * size * f, hy - Math.cos(th) * 0.26 * size];
  const lampW = [sh[0] + 0.16 * size * f, sh[1] + 0.12 * size];
  const pose = { hip: [hx, hy], torso: th, neck: -0.05, head: 0, legN: { ik: fN, ft: 0 }, legF: { ik: fFf, ft: 0 },
    armN: { ik: lampW, hand: 'cup' }, armF: { sh: 0.05 + Math.cos(cyc * TAU) * 0.25, el: 0.25, wr: 0.05 } };
  return { pose, lamp: [lampW[0] + 0.05 * size * f, lampW[1] - 0.03 * size] };
}
function saintState(i, t) {
  const s = SAINTS[i];
  const L0 = ZIG_L[s.seg], L1 = ZIG_L[s.seg + 1];
  const u = Math.min(L1 - 4, L0 + (L1 - L0) * s.f + s.v * (t - 43.9));
  const z = zigAt(u); const dx = z.b[0] - z.a[0], dy = z.b[1] - z.a[1]; const f = dx >= 0 ? 1 : -1;
  const segLen = Math.hypot(dx, dy), along = u - ZIG_L[z.seg];
  return { ...tinyWalker(z.a[0], z.a[1], dx / segLen, dy / segLen, along * Math.abs(dx) / segLen, s.s, f), f };
}
function drawSaints(ctx, t, a) {
  for (let i = 0; i < SAINTS.length; i++) {
    const s = SAINTS[i]; const ap = seg(t, s.ap, s.ap + 0.4, E.outBackSoft); const fa = seg(t, s.ap + 0.12, s.ap + 0.55);
    if (ap <= 0.001 || a <= 0.01) continue;
    const tw = saintState(i, t), lamp = tw.lamp;
    lampRings(ctx, lamp[0], lamp[1] - 2, (5 + s.s * 0.34) * ap, C.mas, a, 40 + i);
    if (fa > 0.01) { ctx.save(); ctx.globalAlpha *= fa * a; drawMan(ctx, tw.pose, { size: s.s, facing: tw.f, col: SAINT_COL, seed: 11 }); ctx.restore(); }
    fillG(ctx, rough(ellipsePts(lamp[0], lamp[1] - 2.5, 2.4 * ap, 3.6 * ap, 10), { amp: 0.3, seed: i }), C.flameI, { tex: 0, alpha: a });
  }
}
/** during the storm mist: three of the saints' lamps still glimmer up the ridge */
function drawSaintGlimmers(ctx, t, a) {
  if (a <= 0.01) return;
  for (const i of [3, 4, 5]) {
    const tw = saintState(i, t), lamp = tw.lamp, fl = 0.75 + 0.25 * noise1(t * 3 + i * 7, 31 + i);
    lampRings(ctx, lamp[0], lamp[1] - 2, 4 + SAINTS[i].s * 0.22, mix(C.storm, C.stormD, 0.45), a * fl, 60 + i);
    fillG(ctx, rough(ellipsePts(lamp[0], lamp[1] - 2.5, 2.4, 3.6, 10), { amp: 0.3, seed: i }), C.flameI, { tex: 0, alpha: a * fl });
  }
}
let SAINT_COL = null;
// ---- summit: a few saints on the neighbouring dawn ridges, also in du'a (summit-camera screen space, hills layer)
const SUMMIT_SAINTS = [{ x: 96, r: 'L', s: 70, t0: 52.35 }, { x: 890, r: 'R', s: 80, t0: 52.55 }, { x: 1000, r: 'R', s: 66, t0: 52.75 }];
function duaPose(x, y, size, t, ph) {
  const br = 0.5 + 0.5 * Math.sin(t * TAU / 3.6 + ph);
  return { hip: [x, y - 0.522 * size], torso: 0.0, neck: -0.1, head: -0.12, breath: br,
    legN: { ik: [x + 0.03 * size, y], ft: 0 }, legF: { ik: [x - 0.025 * size, y], ft: 0 },
    armN: { ...DUA_N, hand: 'open' }, armF: { ...DUA_F, hand: 'open' } };
}
function drawSummitSaints(ctx, t) {
  for (let i = 0; i < SUMMIT_SAINTS.length; i++) {
    const q0 = SUMMIT_SAINTS[i]; const a = seg(t, q0.t0, q0.t0 + 0.6, E.inOutSine); if (a <= 0.01) continue;
    const q = { ...q0, y: ridgeY(DH[q0.r], q0.x) + 4 };
    ctx.save(); ctx.globalAlpha *= a;
    const lx = q.x + 0.34 * q.s, ly = q.y + 1;
    lampRings(ctx, ...flameTip(lx, ly, 0, q.s / S), q.s * 0.3, '#A58FAE', 0.8, 90 + i);
    fillG(ctx, rough(ellipsePts(q.x + 0.02 * q.s, q.y + 2, 0.2 * q.s, 0.03 * q.s, 14), { amp: 0.5, seed: 95 + i }), '#7C6A8C', { tex: 0, alpha: 0.5 });
    drawMan(ctx, duaPose(q.x, q.y, q.s, t, i * 1.7), { size: q.s, facing: 1, col: SUMMIT_SAINT_COL, seed: 13 + i });
    drawLamp(ctx, lx, ly, 0, 0.25, q.s / S);
    const ft = flameTip(lx, ly, 0, q.s / S); drawFlame(ctx, ft[0], ft[1], q.s / S * 1.3, t, 5 + i);
    ctx.restore();
  }
}
let SUMMIT_SAINT_COL = null;

// ---- flowers in the footsteps
function drawFlower(ctx, x, y, p, seed, pink, size = 1) {
  if (p <= 0.001) return;
  const R = rng(seed); const s = S * size;
  const stemH = (0.06 + R() * 0.035) * s * clamp(p * 1.6);
  const lean = (R() - 0.5) * 0.5;
  const top = [x + Math.sin(lean) * stemH, y - Math.cos(lean) * stemH];
  strokeG(ctx, [[x, y], [lerp(x, top[0], 0.5) + 2, lerp(y, top[1], 0.5)], top], 3.2 * size, C.stem, { taper: false, seed });
  const lp = clamp(p * 2 - 0.3);
  if (lp > 0) { fillG(ctx, rough(ellipsePts(x + 8 * lp * size, y - stemH * 0.35, 10 * lp * size, 4 * lp * size, 12, -0.5), { amp: 0.4, seed: seed + 3 }), C.leaf, { tex: 0.3 }); fillG(ctx, rough(ellipsePts(x - 7 * lp * size, y - stemH * 0.2, 8 * lp * size, 3.4 * lp * size, 12, 0.5), { amp: 0.4, seed: seed + 4 }), mix(C.leaf, C.stem, 0.5), { tex: 0.3 }); }
  const bp = E.outBackSoft(clamp((p - 0.35) / 0.65));
  if (bp <= 0.001) return;
  const pr = (0.033 + R() * 0.01) * s * bp; const rot = R() * TAU;
  // tiny light pop as it opens
  const q = clamp((p - 0.4) / 0.5);
  if (q > 0 && q < 1) strokeG(ctx, ellipsePts(top[0], top[1], pr * (1.3 + 1.4 * q), pr * (1.3 + 1.4 * q), 24).concat([[top[0] + pr * (1.3 + 1.4 * q), top[1]]]), 2.4, '#FFF1C8', { taper: false, tex: 0, alpha: 0.55 * (1 - q) });
  const pc = pink ? C.petalPink : C.petal;
  for (let i = 0; i < 5; i++) {
    const a = rot + (i / 5) * TAU; const cx = top[0] + Math.cos(a) * pr * 0.62, cy = top[1] + Math.sin(a) * pr * 0.62;
    fillG(ctx, rough(ellipsePts(cx, cy, pr * 0.62, pr * 0.44, 14, a), { amp: 0.4, seed: seed + i }), i % 2 ? pc : mix(pc, C.petalShade, 0.25), { tex: 0.35, dir: a, scale: 0.2 });
  }
  fillG(ctx, rough(ellipsePts(top[0], top[1], pr * 0.3, pr * 0.3, 10), { amp: 0.3, seed: seed + 9 }), C.fcenter, { tex: 0.2 });
}
let BURST = [];
const FL_PAD = 0.12 * S;
/** a fully bloomed flower as a cached sprite (world px at 1:1, 2x resolution); origin at its foot */
function flowerSprite(seed, pink, size) {
  const key = 'mtn_fl_' + seed + '_' + (pink ? 1 : 0) + '_' + size.toFixed(2);
  const w = FL_PAD * 2 * size + 20, h = (0.2 * S) * size + 20;
  return sprite(key, w * 2, h * 2, (g) => { g.scale(2, 2); drawFlower(g, w / 2, h - 10, 1, seed, pink, size); });
}
function flowerAt(ctx, x, y, p, seed, pink, size) {
  if (p >= 1) { const sp = flowerSprite(seed, pink, size), w = sp.width / 2, h = sp.height / 2; ctx.drawImage(sp, x - w / 2, y - h + 10, w, h); }
  else drawFlower(ctx, x, y, p, seed, pink, size);
}
function drawFlowers(ctx, t, cam) {
  const vis = (x) => { const sx = (x - cam.x) * cam.z + W / 2; return sx > -60 && sx < W + 60; };
  for (const fs of FOOTSTEPS) {
    if (t < fs.t || !vis(fs.x)) continue;
    const offs = [[-13, 0.9, 0], [3, 1.1, 0.06], [17, 0.8, 0.12]];
    offs.forEach(([dx, sz, dl], j) => { const p = clamp((t - fs.t - dl) / 0.45); const x = fs.x + dx; flowerAt(ctx, x, ground(x) + 1, p, 700 + fs.k * 7 + (fs.off ? 3 : 0) + j * 101, (fs.k + j + (fs.off ? 1 : 0)) % 3 === 1, sz); });
  }
  for (const b of BURST) { if (t < b.t || !vis(b.x)) continue; flowerAt(ctx, b.x, ground(b.x) + 1, clamp((t - b.t) / 0.32), b.seed, b.pink, b.sz); }
}

// ---- sigh cloud (nazlanmıyorlar) and grumble (şekva etmiyorlar): they gather from the storm beside him, never from his mouth
function scribblePts(cx, cy, rx, ry, seed, loops = 1.25) {
  const pts = []; const n = 90;
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = u * TAU * loops + seed;
    const bump = 1 + 0.22 * Math.abs(Math.sin(a * 2.5)) + 0.08 * noise1(u * 9, seed);
    const shrink = 1 - 0.28 * u;
    pts.push([cx + Math.cos(a) * rx * bump * shrink, cy + Math.sin(a) * ry * bump * shrink]);
  }
  return pts;
}
function motes(ctx, t, t0, pts, n, seed, rise = 80) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const p = pts[Math.floor(R() * pts.length)]; const lt = clamp((t - t0 - R() * 0.2) / 0.8);
    const dx = (R() - 0.5) * 50, dy = 30 + R() * rise, r0 = 3.4 + R() * 3.6;
    if (lt <= 0 || lt >= 1) continue;
    const x = p[0] + dx * lt, y = p[1] - dy * E.outCubic(lt), r = r0 * (1 - lt * 0.5), al = Math.sin(Math.PI * Math.min(1, lt * 1.4));
    fillG(ctx, rough(ellipsePts(x, y, r * 2.3, r * 2.3, 12), { amp: 0.3, seed: i }), C.flameM, { tex: 0, alpha: 0.28 * al });
    fillG(ctx, rough(ellipsePts(x, y, r, r, 10), { amp: 0.3, seed: i + 50 }), C.flameI, { tex: 0, alpha: al });
  }
}
function drawSigh(ctx, t, head) {
  // a grey sigh-cloud tries to form behind his head out of the rain wisps… stalls at ~60 % and turns into light
  const t0 = 49.12; if (t < t0 || t > 50.4) return;
  const c = [head[0] - 0.3 * S, head[1] - 0.13 * S];
  const gather = seg(t, t0 - 0.06, t0 + 0.32, E.outCubic), form = seg(t, t0 + 0.06, t0 + 0.42, E.outCubic), diss = seg(t, 49.62, 50.0, E.inOutSine);
  const k = 0.6 + 0.4 * form;                                     // never grows past ~60 % of a full cloud
  const wob = 1 + 0.05 * Math.sin(t * 13) * (1 - diss);
  const rx = 0.17 * S * k * wob, ry = 0.1 * S * k / wob;
  // wisps drifting in from the storm (upper left)
  for (let i = 0; i < 5; i++) {
    const a = -2.2 + i * 0.35, d = (0.42 - 0.32 * gather) * S, al = (1 - form * 0.7) * gather * (1 - diss);
    if (al <= 0.02) continue;
    const p0 = [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d * 0.7];
    strokeG(ctx, [p0, [lerp(p0[0], c[0], 0.3) + 6, lerp(p0[1], c[1], 0.3) - 4], [lerp(p0[0], c[0], 0.6), lerp(p0[1], c[1], 0.6)]], 7, '#A7ABBC', { alpha: 0.9 * al, seed: 30 + i });
  }
  const pts = scribblePts(c[0], c[1], rx, ry, 3.1, 1.7);
  const n = Math.max(2, Math.floor(pts.length * 0.6 * form));
  const kA = form * (1 - diss);
  if (kA > 0.01) {
    const body = new Path2D();
    [[-0.55, 0.15, 0.5], [-0.15, -0.2, 0.62], [0.35, -0.05, 0.55], [0.1, 0.3, 0.5], [-0.35, 0.35, 0.4]].forEach(([u, v, r], i) => body.addPath(rough(ellipsePts(c[0] + u * rx, c[1] + v * ry, r * rx * 0.9, r * ry * 1.1, 24), { amp: 1.2, seed: 80 + i })));
    fillG(ctx, body, '#8A8C9E', { tex: 0.35, alpha: 0.75 * kA });
    strokeG(ctx, pts.slice(0, n), 7, '#B0B1C0', { alpha: 0.95 * kA, taper: false, wobble: 0.25, seed: 5 });
  }
  if (diss > 0) motes(ctx, t, 49.62, pts, 26, 91);
}
function drawGrumble(ctx, t, head) {
  // a dark jagged grumble gathers out of the storm darkness ahead of him… and the gust takes it apart
  const t0 = 50.13; if (t < t0 || t > 51.3) return;
  const app = seg(t, t0, t0 + 0.38, E.outCubic), blow = seg(t, 50.6, 51.1, E.inCubic);
  const cx0 = head[0] + 0.34 * S, cy0 = head[1] - 0.24 * S;
  const tremble = (1 - blow) * 0.06 * Math.sin(t * 50) * app;
  const R0 = 0.165 * S;
  const n = 11; const R = rng(17);
  const rad = []; for (let i = 0; i < n * 2; i++) rad.push(i % 2 ? 0.58 + R() * 0.12 : 1 + R() * 0.22);
  for (let k = 0; k < n; k++) {
    const sr = rng(100 + k); const vx = -(0.6 + sr() * 0.9) * S, vy = -(0.05 + sr() * 0.4) * S, vr = (sr() - 0.5) * 3.5;
    const inA = ((k + 0.5) / n) * TAU; const gatherOff = (1 - app) * 0.35 * S;
    const ox = vx * blow * (1 + k * 0.05) + Math.cos(inA) * gatherOff, oy = vy * blow + Math.sin(inA) * gatherOff, a = (1 - blow) * app;
    if (a <= 0.01) continue;
    const pts = [[0, 0]];
    for (let j = 0; j <= 2; j++) { const idx = (k * 2 + j) % (n * 2); const ang = (idx / (n * 2)) * TAU; pts.push([Math.cos(ang) * R0 * rad[idx] * 1.3, Math.sin(ang) * R0 * rad[idx]]); }
    const rot = tremble + vr * blow;
    const P2 = pts.map(([x, y]) => [cx0 + ox + x * Math.cos(rot) - y * Math.sin(rot), cy0 + oy + x * Math.sin(rot) + y * Math.cos(rot)]);
    fillG(ctx, rough(P2, { amp: 0.8, seed: k, step: 3 }), '#AEB3C2', { tex: 0.3, alpha: a });
  }
  if (blow < 0.6) {
    const a = app * app * (1 - blow / 0.6);
    const pts = []; for (let i = 0; i <= 56; i++) { const u = i / 56; pts.push([cx0 - blow * 0.4 * S + Math.sin(u * 27) * R0 * 0.62 + (u - 0.5) * R0 * 0.7, cy0 - blow * 0.15 * S + Math.cos(u * 37) * R0 * 0.42]); }
    strokeG(ctx, pts, 4.5, '#E6E9F0', { alpha: a, taper: false, wobble: 0.3, seed: 9 });
  }
}
function drawGust(ctx, t, head) {
  const g = seg(t, 50.5, 51.15, E.linear); if (g <= 0 || g >= 1) return;
  for (let i = 0; i < 3; i++) {
    const u = clamp(g * 1.3 - i * 0.12); if (u <= 0 || u >= 1) continue;
    const x0 = head[0] + (1.0 - u * 1.9) * S, y0 = head[1] - (0.2 + i * 0.07) * S;
    const pts = []; for (let j = 0; j <= 12; j++) { const v = j / 12; pts.push([x0 + v * 0.45 * S, y0 + Math.sin(v * 5 + i) * 6 - v * 10]); }
    strokeG(ctx, pts, 3.5, '#C9D2DE', { alpha: 0.5 * Math.sin(Math.PI * u), seed: 20 + i });
  }
}
// ---- light & shadow on the ground
function contactShadow(ctx, x, y, rx, ry, a, col, seed = 1) { if (a <= 0.01) return; fillG(ctx, rough(ellipsePts(x, y, rx, ry, 18), { amp: 0.8, seed }), col, { tex: 0.15, alpha: a }); }
let SKY_CLIP = null, GROUND_CLIP = null;
function buildClips() {
  // ground outline including the summit outcrop (world): the region the lamp rings may NOT cover
  const pts = [];
  for (let x = GX0; x <= GX0 + GW + 20; x += 6) { let y = ground(x); if (x >= SLAB.x0 - 4 && x <= SLAB.x1) y = Math.min(y, x < SLAB.x0 + 4 ? SLAB.topPts[0][1] + 6 : SLAB.topAt(x)); pts.push([x, y]); }
  pts.push([GX0 + GW + 20, GY0 + GH + 50], [GX0, GY0 + GH + 50]);
  GROUND_CLIP = toPath(pts);
  SKY_CLIP = new Path2D(); SKY_CLIP.rect(GX0 - 4000, GY0 - 4000, GW + 8000, GH + 8000); SKY_CLIP.addPath(GROUND_CLIP);
}

// ============================================================================ main draw
export const PROF = { on: false, t: {}, skip: {} };
const pmark = (k) => { if (!PROF.on) return; const n = performance.now(); PROF.t[k] = (PROF.t[k] || 0) + n - (PROF._l || n); PROF._l = n; };
const T_DROP = 47.27;
export function draw(ctx, t) {
  if (PROF.on) PROF._l = performance.now();
  if (!READY) { ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, W, H); return; }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (t <= T_IN) { ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, W, H); ctx.restore(); return; }
  if (t >= T_OUT1) { ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H); ctx.restore(); return; }
  const cam = camAt(t);
  const st = manState(t);
  const [tc, ta, warm] = ambient(t);
  const storm = stormAmt(t), dawn = dawnAmt(t);
  const mist = 0.7 * seg(t, 47.6, 48.7) * (1 - seg(t, 50.5, 51.5));
  const part = seg(t, 50.6, 51.9, E.inOutSine);
  const dawnBg = seg(t, 50.75, 51.6, E.inOutSine);
  const hos = seg(t, 47.95, 48.6, E.inOutSine);
  const lit = seg(t, 42.38, 42.6, E.outCubic);
  const flash = lightningF(t);
  SAINT_COL = manColors('#7E76A6', 0.5, 0.06);
  SUMMIT_SAINT_COL = manColors('#B7A0BC', 0.42, 0.05);

  // -------------------------------------------------------------- background (sky & distant layers)
  ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, W, H);
  // combined storm darkening + mist (drawn below as one flat fill); when it hides the dusk sky almost entirely the
  // sky sprite is replaced by its mean colour (identical at ≤ 15 % visibility, much cheaper)
  const fillA1 = storm * 0.8 * (1 - part), fillA2 = PROF.skip.mist ? 0 : mist, fillA = 1 - (1 - fillA1) * (1 - fillA2);
  if (dawnBg < 0.999 && !PROF.skip.bgdusk) {
    setLayer(ctx, cam, CAM_E, 0.03);
    if (fillA > 0.85) { ctx.fillStyle = '#2F3562'; ctx.fillRect(SKY_OX, SKY_OY, SKY_W, SKY_H); } else blit(ctx, 'mtn_sky_dusk', SKY_OX, SKY_OY);
    if (storm < 0.99) drawStars(ctx, t, (1 - storm) * seg(t, 42.9, 43.6));
    setLayer(ctx, cam, CAM_E, 0.1); blit(ctx, 'mtn_far', -600, 860);
    setLayer(ctx, cam, CAM_E, 0.25); blit(ctx, 'mtn_massif', -560, 300);
    drawSaints(ctx, t, 1 - storm);
    setLayer(ctx, cam, CAM_E, 0.5); blit(ctx, 'mtn_hill', -620, 880);
  }
  if (dawnBg > 0.001) { ctx.save(); ctx.globalAlpha = 1; drawDawnSky(ctx, t, cam, dawnBg); ctx.restore(); }
  pmark('bg');
  {
    // storm darkening of the distant world + the storm mist, merged into one flat fill
    const a1 = fillA1, a2 = fillA2, A = fillA;
    if (A > 0.001) {
      const c1 = rgb(C.stormD), c2 = mix(C.storm, C.stormD, 0.45);
      const col = [0, 1, 2].map((i) => (c1[i] * a1 * (1 - a2) + c2[i] * a2) / A);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = A; ctx.fillStyle = css(col); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
  }
  if (t > 47.5 && t < 51.0) { setLayer(ctx, cam, CAM_E, 0.25); drawSaintGlimmers(ctx, t, (mist / 0.7) * 0.85 * (1 - seg(t, 50.4, 50.9))); }
  if (t > 46.25 && t < 52.0 && !PROF.skip.clouds) drawStormBack(ctx, t, cam, storm, part, flash);
  pmark('storm');

  // -------------------------------------------------------------- world ground
  setCam(ctx, cam);
  if (dawn < 0.999 && !PROF.skip.ground) { ctx.save(); ctx.scale(1 / GS, 1 / GS); ctx.drawImage(sprite('mtn_ground', 1, 1, () => {}), GX0 * GS, GY0 * GS); ctx.restore(); }
  if (dawn > 0.001) { ctx.save(); ctx.globalAlpha = dawn; ctx.scale(1 / GS, 1 / GS); ctx.drawImage(sprite('mtn_ground_dawn', 1, 1, () => {}), DGX0 * GS, DGY0 * GS); ctx.restore(); }
  if (storm > 0.001 && !PROF.skip.tint) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = storm * 0.5; ctx.fillStyle = '#8D97AE'; ctx.fillRect(0, 0, W, H); ctx.restore();
    setCam(ctx, cam);
  }
  pmark('ground');
  // lamp position
  const hand = st.fk.armN.hand;
  let lampBase = [hand[0] + LAMP_ON_HAND[0] * S, hand[1] + LAMP_ON_HAND[1] * S];
  let lampAng = 0.02 * noise1(t * 1.3, 8) * (1 - seg(t, T_BEND[0], T_LAMP_DOWN));
  if (t > T_LAMP_DOWN - 0.08) { const w = smooth(invlerp(T_LAMP_DOWN - 0.08, T_LAMP_DOWN, t)); lampBase = [lerp(lampBase[0], SLAB.lampX, w), lerp(lampBase[1], SLAB.lampY, w)]; }
  if (st.lampPlaced) { lampBase = [SLAB.lampX, SLAB.lampY]; lampAng = 0; }
  const ft = flameTip(lampBase[0], lampBase[1], lampAng);
  const haloBg = mix(mix('#45457A', '#3A4054', storm), '#C9A7A8', dawn);
  const haloR = (0.25 + 0.05 * hos) * S * lerp(0.35, 1, seg(t, 42.4, 43.0, E.outCubic));
  const hA = lit * (1 - 0.9 * dawn);
  // ground light pool under the lamp (two stepped soft-light shapes on the ground only)
  if (hA > 0.01) {
    ctx.save(); ctx.clip(GROUND_CLIP);
    const gx = ft[0] - 0.02 * S, gy = ground(gx), ga = -Math.atan(slopeAt(gx));
    ctx.globalCompositeOperation = 'screen';
    fillG(ctx, rough(ellipsePts(gx, gy + 4, 0.3 * S, 0.035 * S, 30, ga), { amp: 2, seed: 701 }), '#3E2B1C', { tex: 0, alpha: 0.5 * hA });
    fillG(ctx, rough(ellipsePts(gx, gy + 3, 0.15 * S, 0.02 * S, 24, ga), { amp: 1.5, seed: 702 }), '#5A3E22', { tex: 0, alpha: 0.5 * hA });
    ctx.restore();
  }
  drawSapling(ctx, SAPLING_X, ground(SAPLING_X) + 2, t);
  // the lamp's light: flat amber rings in the air behind him, never over the ground or the rocks
  const ringA = hA * seg(t, 43.15, 43.8);
  if (ringA > 0.01) { ctx.save(); ctx.clip(SKY_CLIP, 'evenodd'); lampRings(ctx, ft[0], ft[1] - 0.025 * S, haloR, haloBg, ringA, 11, hos); ctx.restore(); }
  pmark('halo');
  // contact shadows
  const shCol = mix(mix('#1C1B33', '#232836', storm), '#6A5070', dawn);
  const r0 = fk(st.pose);
  for (const leg of [st.pose.legN, st.pose.legF]) { const fx = leg.ik[0] + 0.03 * S, gy = ground(fx); const lift = gy - leg.ik[1]; contactShadow(ctx, fx, gy + 2, 0.065 * S, 0.012 * S, 0.42 * (1 - clamp(lift / (0.04 * S))), shCol, 3); }
  if (dawn > 0.01 && t > TSTOP) {
    // long flat shadow toward the right (low sun on the left)
    const fx = SUMMIT.hipEnd, gy = ground(fx);
    fillG(ctx, rough([[fx - 0.05 * S, gy + 1], [fx + 0.16 * S, gy - 1], [SLAB.x0 - 2, gy - 0.005 * S], [SLAB.x0 - 2, gy + 0.018 * S], [fx - 0.05 * S, gy + 0.02 * S]], { amp: 1, seed: 711 }), shCol, { tex: 0.15, alpha: 0.32 * dawn });
  }
  if (!PROF.skip.flowers) drawFlowers(ctx, t, cam);
  // bundle resting on the ground (after being lowered)
  const bundleBehind = t >= T_LOWER[1];
  if (bundleBehind) drawBundleState(ctx, t, st, r0, tc, ta, dawn);
  // ibrik (behind the man): in the far hand, then on the outcrop
  const ibA = seg(t, 44.55, 44.75);
  const handF = st.fk.armF.hand;
  if (ibA > 0) {
    const pour = env(t, 44.95, 45.62, 0.2, 0.18, E.inOutSine);
    let ibTilt = pour * 1.05 + 0.04 * Math.sin((st.ph ?? 0) * TAU) * (st.walk ?? 0) * (1 - pour);
    let ibGrip = handF;
    const ibB = [SLAB.ibrikX + IBRIK_GRIP[0] * S, SLAB.ibrikY + IBRIK_GRIP[1] * S];
    if (t >= T_BEND[0]) { ibTilt = lerp(ibTilt, 0, seg(t, T_BEND[0], T_IBRIK_DOWN - 0.1)); const w = smooth(invlerp(T_IBRIK_DOWN - 0.08, T_IBRIK_DOWN, t)); ibGrip = [lerp(handF[0], ibB[0], w), lerp(handF[1], ibB[1], w)]; }
    if (t >= T_IBRIK_DOWN) { ibGrip = ibB; ibTilt = 0; contactShadow(ctx, SLAB.ibrikX, SLAB.ibrikY + 1, 0.045 * S, 0.008 * S, 0.35, shCol, 5); }
    drawIbrikTinted(ctx, ibGrip, ibTilt, 1, seg(t, 44.55, 44.9), tc, ta);
    if (pour > 0.2 && t < 45.75) drawWater(ctx, t, ibGrip, ibTilt);
  }
  pmark('props');
  // -------------------------------------------------------------- the man: rim (dawn), body, lamp-lit passes
  const mc = manColors(tc, ta, warm + 0.06 * lit * (1 - dawn) + 0.03 * hos);
  const rimA = dawn * seg(t, 51.0, 51.8);
  if (rimA > 0.01) { ctx.save(); ctx.globalAlpha *= rimA * 0.75; ctx.translate(-3.5 / cam.z, -1 / cam.z); drawMan(ctx, st.pose, { size: S, facing: 1, col: RIM_COL, seed: 7 }); ctx.restore(); }
  const r = drawMan(ctx, st.pose, { size: S, facing: 1, col: mc, seed: 7 });
  const litMan = lit * (1 - dawn * 0.9);
  if (litMan > 0.02 && !PROF.skip.litman) {
    // the lamp lights him: two stepped warm pools on his figure (clip-redraw)
    for (const [rr, wk, tk] of [[0.36, 0.13 + 0.05 * hos, 0.7], [0.21, 0.28 + 0.08 * hos, 0.45]]) {
      ctx.save(); ctx.clip(rough(ellipsePts(ft[0] - 0.02 * S, ft[1], rr * S, rr * S * 1.1, 40), { amp: 2, seed: 720 + rr * 100 }));
      ctx.globalAlpha *= litMan; drawMan(ctx, st.pose, { size: S, facing: 1, col: manColors(tc, ta * tk, wk), seed: 7 }); ctx.restore();
    }
  }
  pmark('man');
  if (!bundleBehind) drawBundleState(ctx, t, st, r, tc, ta, dawn);
  // the kandil: lamp body opaque, on top
  if (st.lampPlaced) contactShadow(ctx, lampBase[0] + 1, lampBase[1] + 1, 0.04 * S, 0.008 * S, 0.4, shCol, 6);
  const nightShade = (1 - lit) * 0.9;
  if (t < 44.15) drawReveal(ctx, t, cam, lerp2(ft, lampCentre(lampBase[0], lampBase[1]), 0.6));
  drawLamp(ctx, lampBase[0], lampBase[1], lampAng, ta * 0.55 * (1 - dawn) + nightShade, 1, smooth(invlerp(42.33, 42.5, t)));
  const wind = -storm * (0.2 + 0.16 * noise1(t * 1.9, 5)) * (1 - seg(t, 50.7, 51.2));
  const gutter = 1 - 0.38 * flash;
  if (lit > 0.001) drawFlame(ctx, ft[0], ft[1], E.outBackSoft(lit) * gutter, t, 1, wind);
  glow(ctx, ft[0], ft[1], 0.2 * S, mix(C.flameO, '#FFD9A0', hos), 0.22 * hA);
  if (t < 43.9) drawEternity(ctx, t, lampCentre(lampBase[0], lampBase[1]), 46, 1 - seg(t, 43.2, 43.75));
  // sigh, grumble, gust
  drawSigh(ctx, t, r.head);
  drawGrumble(ctx, t, r.head);
  drawGust(ctx, t, r.head);
  pmark('lamp+fx');
  // -------------------------------------------------------------- rain (front)
  const rainA = storm * (1 - seg(t, 50.7, 51.08));
  if (rainA > 0.04 && !PROF.skip.rain) drawRain(ctx, t, cam, rainA, toScreen(cam, r.chest));
  if (rainA > 0.01 && !PROF.skip.splash) drawSplashes(ctx, t, st, rainA);
  // -------------------------------------------------------------- dawn light in front
  if (t > 50.9 && t < 52.0) drawShaft(ctx, t, cam);
  if (dawn > 0.001) drawDawnFront(ctx, t, dawn);
  if (t > 53.6) drawOutro(ctx, t);
  pmark('rain+dawn+out');
  ctx.restore();
}
let SAPLING_X = 220;
const lerp2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

function drawIbrikTinted(ctx, grip, tilt, alpha, reveal, tc, ta) {
  const save = { copper: C.copper, copperD: C.copperD, copperL: C.copperL, brassL: C.brassL };
  C.copper = css(mix(save.copper, tc, ta * 0.8)); C.copperD = css(mix(save.copperD, tc, ta * 0.8)); C.copperL = css(mix(save.copperL, tc, ta * 0.6)); C.brassL = css(mix(save.brassL, tc, ta * 0.6));
  drawIbrik(ctx, grip[0], grip[1], tilt, 1, alpha, reveal);
  Object.assign(C, save);
}
function drawWater(ctx, t, grip, tilt) {
  // a true parabola from the spout tip: exits along the spout, falls onto the base of the sapling
  const sp = ibrikPoint(grip[0], grip[1], tilt, IBRIK_SPOUT);
  const ang0 = clamp(Math.atan2(-0.014, 0.014) + tilt, -0.8, 1.1);
  const tgt = [SAPLING_X - 14, ground(SAPLING_X - 14)];
  const head = seg(t, 45.05, 45.2, E.outQuad), tail = seg(t, 45.45, 45.62, E.inQuad);
  if (head <= tail) return;
  const dx = Math.max(6, tgt[0] - sp[0]); const k1 = Math.tan(ang0) * dx; const k2 = Math.max(0, (tgt[1] - sp[1]) - k1);
  const P = (u) => [sp[0] + dx * u, sp[1] + k1 * u + k2 * u * u];
  const pts = []; const N = 18;
  for (let i = 0; i <= N; i++) pts.push(P(lerp(tail, head, i / N)));
  strokeG(ctx, pts, (u) => lerp(4.4, 2.2, u), C.water, { taper: false, alpha: 0.62, seed: 3, wobble: 0.2 });
  strokeG(ctx, pts.slice(0, Math.max(2, Math.floor(pts.length * 0.7))), 1.3, C.waterL, { taper: false, alpha: 0.7, seed: 4 });
  // detached drops at the leading end (while falling) and trailing drops (as it stops)
  for (let i = 0; i < 4; i++) {
    const uh = head < 1 ? Math.min(1, head + 0.05 + i * 0.05) : (tail > 0 ? Math.max(0, tail - 0.04 - i * 0.05) : -1);
    if (uh < 0 || uh > 1 || (head >= 1 && tail <= 0)) continue;
    const q = P(uh); fillG(ctx, rough(ellipsePts(q[0], q[1], 1.9, 2.4, 8), { amp: 0.2, seed: 40 + i }), C.water, { tex: 0, alpha: 0.65 });
  }
  if (head > 0.97) {
    const R = rng(5);
    for (let i = 0; i < 2; i++) { const ph = ((t - 45.2) * 5 + i * 0.5) % 1; const rr = 4 + 14 * ph; strokeG(ctx, ellipsePts(tgt[0], tgt[1] - 1, rr, rr * 0.28, 20).concat([[tgt[0] + rr, tgt[1] - 1]]), 1.6, C.waterL, { taper: false, tex: 0, alpha: 0.6 * (1 - ph) * (1 - tail) }); }
    for (let i = 0; i < 4; i++) { const ph = ((t * 3 + i * 0.27) % 1); fillG(ctx, rough(ellipsePts(tgt[0] + (R() - 0.5) * 26 * ph, tgt[1] - 9 * Math.sin(Math.PI * ph), 1.8, 1.8, 8), { amp: 0.2, seed: i }), C.waterL, { tex: 0, alpha: 0.75 * (1 - tail) }); }
  }
  const wet = seg(t, 45.2, 45.6);
  if (wet > 0) fillG(ctx, rough(ellipsePts(tgt[0] + 4, tgt[1] + 5, 20 * wet, 4.5 * wet, 16), { amp: 1, seed: 8 }), '#2A2438', { tex: 0.3, alpha: 0.55 });
}
function drawBundleState(ctx, t, st, r, tc, ta, dawn) {
  if (t < T_DROP - 0.3) return;
  const fadeIn = seg(t, T_DROP - 0.3, T_DROP - 0.2, E.linear);
  ctx.save(); ctx.globalAlpha *= fadeIn;
  drawBundleStateInner(ctx, t, st, r, tc, ta, dawn);
  ctx.restore();
}
function drawBundleStateInner(ctx, t, st, r, tc, ta, dawn) {
  const th = r.torso;
  const T2W = (x, y) => [r.hip[0] + (Math.cos(th) * x + Math.sin(th) * y) * S, r.hip[1] + (Math.sin(th) * x - Math.cos(th) * y) * S];
  // lands on his back with weight: drops in from above (opaque), squashes, settles
  const drop = 1 - E.inQuad(seg(t, T_DROP - 0.3, T_DROP + 0.05, E.linear));
  const settle = t > T_DROP + 0.05 ? Math.exp(-(t - T_DROP - 0.05) * 8) * Math.sin((t - T_DROP - 0.05) * 26) * 0.07 : 0;
  let pos = T2W(-0.14, 0.175 + drop * 1.3), ang = th + 0.08 + 0.035 * Math.sin((st.ph ?? 0) * TAU) * (st.walk ?? 0) + settle, sag = Math.max(0, settle * 4);
  const restC = [SLAB.bundleX, ground(SLAB.bundleX) - 0.082 * S];
  const lowU = t >= T_LOWER[1] ? 1 : (st.lowerU ?? 0);
  let strapFrom = null;
  if (lowU > 0) {
    const u = lowU, v = 1 - u, P1 = [pos[0] - 0.1 * S, lerp(pos[1], restC[1], 0.4)];
    pos = [v * v * pos[0] + 2 * v * u * P1[0] + u * u * restC[0], v * v * pos[1] + 2 * v * u * P1[1] + u * u * restC[1]];
    const ts = t - T_LOWER[1];
    ang = lerp(ang, -0.06, u) + (ts > 0 ? Math.exp(-ts * 9) * Math.sin(ts * 28) * 0.03 : 0);
    sag = ts > 0 ? 0.5 + 0.5 * Math.exp(-ts * 6) * Math.cos(ts * 24) : u * 0.3;
    if (t < T_LOWER[1] + 0.05) strapFrom = st.fk.armF.hand;
  }
  const save = { cloth: C.cloth, clothD: C.clothD, clothL: C.clothL, clothPat: C.clothPat };
  const tk = ta * 0.9;
  C.cloth = css(mix(save.cloth, tc, tk)); C.clothD = css(mix(save.clothD, tc, tk)); C.clothL = css(mix(save.clothL, tc, tk)); C.clothPat = css(mix(save.clothPat, tc, tk));
  const strapCol = css(mix('#6E3A2E', tc, tk));
  if (lowU >= 1) {
    // resting: contact shadow, loose strap on the ground, rim from the low sun
    contactShadow(ctx, restC[0] + 3, ground(restC[0]) + 2, 0.12 * S, 0.016 * S, 0.4, mix(mix('#1C1B33', '#232836', 0), '#6A5070', dawn), 9);
    const gx0 = restC[0] + 0.02 * S, gy = ground(gx0);
    strokeG(ctx, crPts([[restC[0], restC[1] - 0.085 * S], [gx0 + 0.07 * S, gy - 0.02 * S], [gx0 + 0.16 * S, gy - 2]], false, 6), 0.02 * S, strapCol, { taper: false, seed: 4 });
    if (dawn > 0.01) { ctx.save(); ctx.globalAlpha *= dawn * 0.9; C.cloth = '#F2C48C'; C.clothD = '#F2C48C'; C.clothL = '#F6D29E'; C.clothPat = '#F6D29E'; drawBundle(ctx, pos[0] - 4, pos[1] - 1, ang, 1, sag); ctx.restore(); C.cloth = css(mix(save.cloth, tc, tk)); C.clothD = css(mix(save.clothD, tc, tk)); C.clothL = css(mix(save.clothL, tc, tk)); C.clothPat = css(mix(save.clothPat, tc, tk)); }
  }
  // strap over the near shoulder and across the chest (over the vest, under the near arm)
  if (lowU <= 0 && t > T_DROP + 0.03) {
    ctx.save();
    const clip = new Path2D(); clip.rect(-1e5, -1e5, 2e5, 2e5);
    const capsule = (a, b, w) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w, ny = dx / l * w; const p = new Path2D(); p.moveTo(a[0] + nx, a[1] + ny); p.lineTo(b[0] + nx, b[1] + ny); p.arc(b[0], b[1], w, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, true); p.lineTo(a[0] - nx, a[1] - ny); p.arc(a[0], a[1], w, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI, true); p.closePath(); return p; };
    clip.addPath(capsule(r.shoulderN, r.elbowN, 0.04 * S)); clip.addPath(capsule(r.elbowN, r.wristN, 0.034 * S));
    ctx.clip(clip, 'evenodd');
    const a = T2W(-0.1, 0.27 + drop * 0.1), b = T2W(-0.01, 0.31), c = T2W(0.055, 0.22), d = T2W(0.068, 0.1);
    strokeG(ctx, crPts([a, b, c, d], false, 6), 0.026 * S, strapCol, { taper: false, seed: 4 });
    strokeG(ctx, crPts([a, b, c, d], false, 6), 0.007 * S, css(mix(C.clothPat, tc, 0.2)), { taper: false, alpha: 0.6, seed: 5 });
    ctx.restore();
  } else if (strapFrom) {
    const knot = [pos[0], pos[1] - 0.09 * S];
    strokeG(ctx, crPts([strapFrom, [lerp(strapFrom[0], knot[0], 0.5) - 0.02 * S, lerp(strapFrom[1], knot[1], 0.5) + 0.02 * S], knot], false, 6), 0.02 * S, strapCol, { taper: false, seed: 4 });
  }
  drawBundle(ctx, pos[0], pos[1], ang, 1, sag);
  Object.assign(C, save);
}

// ---- storm
function lightningF(t) { const tl = 46.9; return t < tl ? 0 : (t < tl + 0.1 ? smooth((t - tl) / 0.1) : Math.exp(-(t - tl - 0.1) * 8)); }
function layerX(cam, k, sx) { const zs = Math.pow(cam.z / CAM_E.z, k); return W / 2 + (sx - W / 2 + (cam.x - CAM_E.x) * k * cam.z) / zs; }
function drawStormBack(ctx, t, cam, storm, part, flash) {
  ctx.save();
  setLayer(ctx, cam, CAM_E, 0.06);
  const dA = seg(t, 46.2, 47.0, E.inOutSine), dB = seg(t, 46.25, 47.05, E.inOutSine), dC = seg(t, 46.5, 47.6, E.inOutSine);
  const drift = (t - 46.3) * 14;
  const split = layerX(cam, 0.06, 505);
  const px = part * 640, py = part * 150;
  const fa = 1 - seg(t, 51.05, 51.75, E.inOutSine);
  // the gap opening above the summit glows with the dawn behind the banks
  if (part > 0.004) {
    const w0 = px * 0.95 + 12, ga = Math.min(1, part * 7) * fa;
    const yb = 640 + 160 * part;
    fillG(ctx, rough([[split - w0 * 0.7 - 20, -60], [split + w0 * 0.7 + 20, -60], [split + w0 + 50, yb - 40], [split + w0 * 0.4, yb + 30], [split - w0 * 0.5, yb + 20], [split - w0 - 50, yb - 50]], { amp: 8, seed: 351, step: 14 }), '#C99BA0', { tex: 0.3, alpha: 0.8 * ga });
    fillG(ctx, rough([[split - w0 * 0.35, -60], [split + w0 * 0.35, -60], [split + w0 * 0.55 + 10, yb - 90], [split - w0 * 0.55 - 10, yb - 100]], { amp: 6, seed: 352, step: 14 }), '#EDCBAA', { tex: 0.25, alpha: 0.75 * ga });
  }
  drawBank(ctx, 'A', -drift * 0.5, lerp(-420, 0, dA), dA * fa, split, px * 0.85, py * 1.2, flash * 0.5);
  drawBank(ctx, 'B', -drift * 0.8, lerp(-460, 0, dB), dB * fa, split, px, py, flash);
  drawLightning(ctx, t, cam, flash, BANKS.B.y + lerp(-460, 0, dB) + BANKS.B.h - 50);
  // rain curtains hanging under the banks
  const ca = 0.17 * storm * (1 - part) * dC;
  if (ca > 0.005) {
    setLayer(ctx, cam, CAM_E, 0.12);
    for (let i = 0; i < 4; i++) {
      const x = 120 + i * 270 + noise1(i * 3.1, 7) * 60 - (t - 46.3) * 22, y0 = 620 + i % 2 * 120, w = 150 + (i % 3) * 50, sl = RAIN_DIR[0] / RAIN_DIR[1] * 1500;
      fillG(ctx, rough([[x, y0], [x + w, y0 + 10], [x + w + sl, 2100], [x + sl, 2100]], { amp: 6, seed: 300 + i, step: 12 }), '#7D889E', { tex: 0.3, dir: 1.27, alpha: ca * (0.7 + 0.3 * (i % 2)) });
    }
    setLayer(ctx, cam, CAM_E, 0.06);
  }
  drawBank(ctx, 'C', -drift * 1.4, lerp(-380, 0, dC), dC * (1 - seg(t, 51.0, 51.65, E.inOutSine)), split, px * 1.25, py * 1.4, 0);
  ctx.restore();
}
function drawLightning(ctx, t, cam, f, y0 = 520) {
  // one soft pulse: the clouds light up from inside (lit bank variants, drawn by drawBank), a short soft bolt, a faint sky flash
  if (f < 0.04) return;
  ctx.save();
  const R = rng(9); const pts = [[840, y0 - 60]]; let x = 840, y = y0 - 60;
  for (let i = 0; i < 6; i++) { x += (R() - 0.6) * 44; y += 34 + R() * 20; pts.push([x, y]); }
  const sm = crPts(pts, false, 3);
  strokeG(ctx, sm, 22, '#8A86B4', { alpha: 0.45 * f, taper: true, seed: 2, wobble: 0.3 });
  strokeG(ctx, sm, 9, '#D6D2EE', { alpha: 0.55 * f, taper: true, seed: 3, wobble: 0.3 });
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.14 * f; ctx.fillStyle = '#8F8CB8'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
let RAIN_CV = null;
const RAIN_M = 48; // overscan (screen px) so the slight counter-rotation never shows an edge
function drawRain(ctx, t, cam, a, man) {
  // three parallax layers of gouache strokes rendered at half resolution into one scratch canvas; quieter around him
  // (two stepped rings, erased in the scratch) and in the subtitle band
  const RW = Math.ceil((W + 2 * RAIN_M) / 2), RH = Math.ceil((H + 2 * RAIN_M) / 2);
  if (!RAIN_CV) RAIN_CV = new OffscreenCanvas(RW, RH);
  const g = RAIN_CV.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, RW, RH);
  for (const L of RAIN_L) {
    const sp = rainSprite(L), T = L.T;
    const ox = (((RAIN_DIR[0] * L.v * t - cam.x * cam.z * L.k * 0.3) % T) + T) % T, oy = (((RAIN_DIR[1] * L.v * t - cam.y * cam.z * L.k * 0.3) % T) + T) % T;
    g.globalAlpha = L.al;
    for (let x = ox - T; x < W + 2 * RAIN_M; x += T) for (let y = oy - T; y < H + 2 * RAIN_M; y += T) g.drawImage(sp, x / 2, y / 2, T / 2, T / 2);
  }
  // quiet zones: erase 68 % (inner ring) / 40 % (outer ring) around him, 65 % in the subtitle band
  g.globalCompositeOperation = 'destination-out';
  const mx = (man[0] + RAIN_M) / 2, my = (man[1] + RAIN_M) / 2, rx = 0.33 * S * cam.z / 2, ry = 0.45 * S * cam.z / 2;
  g.globalAlpha = 0.4; g.fill(rough(ellipsePts(mx, my, rx * 1.45, ry * 1.35, 40), { amp: 2, seed: 2 }));
  g.globalAlpha = 0.47; g.fill(rough(ellipsePts(mx, my, rx, ry, 40), { amp: 2, seed: 1 }));
  g.globalAlpha = 0.65; g.fillRect(0, (1275 + RAIN_M) / 2, RW, 180 / 2);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (cam.rot) { ctx.translate(W / 2, H / 2); ctx.rotate(cam.rot * 0.5); ctx.translate(-W / 2, -H / 2); }
  ctx.globalAlpha = a; ctx.drawImage(RAIN_CV, -RAIN_M, -RAIN_M, RW * 2, RH * 2);
  ctx.restore();
}
function drawSplashes(ctx, t, st, a) {
  // tiny splash dabs popping on the path around his feet
  const d = st.d ?? 0;
  for (let i = 0; i < 9; i++) {
    const cyc = t * 2.6 + i * 0.37, k = Math.floor(cyc), ph = cyc - k;
    const x = d + (noise1(k * 1.7 + i * 13, 71) * 1.2) * S, y = ground(x) - 1;
    const r = 2 + 5 * ph;
    strokeG(ctx, ellipsePts(x, y, r, r * 0.35, 14).concat([[x + r, y]]), 1.4, '#B9C6D6', { taper: false, tex: 0, alpha: 0.5 * a * (1 - ph) });
  }
}
// ---- dawn
const SUN = [205, 842];
const BOX = [90, 250, 990, 720]; // calligraphy zone with its real glyph extent (kept calm 51.6–54.4)
function boxPaths() { const inB = new Path2D(); inB.rect(BOX[0], BOX[1], BOX[2] - BOX[0], BOX[3] - BOX[1]); const outB = new Path2D(); outB.rect(-50, -50, W + 100, H + 100); outB.addPath(inB); return { inB, outB }; }
function drawDawnSky(ctx, t, cam, a) {
  // vista layers are referenced to the summit camera
  const grow = seg(t, 53.7, 54.4, E.inOutSine);
  const sunUp = seg(t, 51.0, 52.6, E.outCubic);
  ctx.globalAlpha = a;
  setLayer(ctx, cam, CAM_S, 0.03); ctx.drawImage(sprite('mtn_sky_dawn', 1, 1, () => {}), SKY_OX, SKY_OY);
  setLayer(ctx, cam, CAM_S, 0.05);
  const sy = SUN[1] + (1 - sunUp) * 50;
  // rays: flat painted wedges; they break through strongly 51.0-51.6, then stay faint (soft, uniform) under the calligraphy
  const rayA = (0.17 * env(t, 51.0, 51.62, 0.28, 0.24, E.inOutSine) + 0.05 * seg(t, 51.3, 51.62) + 0.03 * grow) * a;
  if (rayA > 0.004) {
    const angs = [-1.15, -0.8, -0.5, -0.22, 0.05];
    angs.forEach((a0, i) => {
      const an = a0 + 0.012 * Math.sin(t * 0.7 + i), w = 0.04 + (i % 3) * 0.018, L = 2000;
      fillG(ctx, rough([[SUN[0], sy], [SUN[0] + Math.cos(an - w) * L, sy + Math.sin(an - w) * L], [SUN[0] + Math.cos(an + w) * L, sy + Math.sin(an + w) * L]], { amp: 3, seed: 300 + i }), '#FFF0CF', { tex: 0.2, alpha: rayA });
    });
  }
  ctx.globalAlpha = a;
  lightRings(ctx, SUN[0], sy, 215 * (1 + 0.18 * grow), [[1, '#E8BC9A', 0.28 * a], [0.72, '#F0CDA2', 0.5 * a], [0.5, '#F6DFB4', 0.85 * a], [0.33, '#FBEFD2', a]], 77, 2.2);
  ctx.globalAlpha = a;
  setLayer(ctx, cam, CAM_S, 0.08); ctx.drawImage(sprite('mtn_far_dawn', 1, 1, () => {}), -600 - 70, 820 - 30);
  setLayer(ctx, cam, CAM_S, 0.04);
  const dcA = seg(t, 51.3, 52.1) * a, dcX = (1 - E.outCubic(seg(t, 51.0, 52.2))) * 160, dr = (t - 51) * 5;
  blit(ctx, 'mtn_dc1', 20 - dcX + dr, 96, dcA); blit(ctx, 'mtn_dc2', 640 + dcX + dr * 0.7, 30, dcA);
  blit(ctx, 'mtn_dc3', 790 + dcX * 0.6 + dr * 1.2, 742, dcA * 0.9); blit(ctx, 'mtn_dc4', -70 - dcX * 0.6 + dr, 752, dcA * 0.9);
  ctx.globalAlpha = a;
  setLayer(ctx, cam, CAM_S, 0.12); ctx.save(); ctx.translate(-(t - 49) * 6, 0); ctx.drawImage(sprite('mtn_sea', 1, 1, () => {}), -310, 880); ctx.restore();
  setLayer(ctx, cam, CAM_S, 0.3); ctx.drawImage(sprite('mtn_dhills', 1, 1, () => {}), -360, 900);
  ctx.globalAlpha = 1;
  if (a > 0.99) drawSummitSaints(ctx, t);
}
function drawShaft(ctx, t, cam) {
  // the first golden shaft through the gap, onto him (flat painted wedge); fades early inside the calligraphy zone
  const a = env(t, 50.95, 51.95, 0.4, 0.45, E.inOutSine) * 0.26;
  if (a <= 0.005) return;
  const m = toScreen(cam, [lerp(D_END, SUMMIT.hipEnd, seg(t, TSTOP, TSTOP + 0.36)), ground(D_END) - 0.45 * S]);
  const gy = m[1] + 0.47 * S * cam.z; const p = [[m[0] - 40, -20], [m[0] + 90, -20], [m[0] + 200, gy - 6], [m[0] + 120, gy + 14], [m[0] - 90, gy + 16], [m[0] - 180, gy - 4]];
  const { inB, outB } = boxPaths();
  for (const [clipP, mode, k] of [[outB, 'evenodd', 1], [inB, 'nonzero', 1 - 0.75 * seg(t, 51.45, 51.65)]]) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clip(clipP, mode);
    fillG(ctx, rough(p, { amp: 4, seed: 333, step: 10 }), '#FBE2AE', { tex: 0.25, dir: 1.3, alpha: a * k });
    ctx.restore();
  }
}
/** region below (or above) a painted, slightly ragged horizon edge around y 748 */
let HZ = null;
function horizonClip(above) {
  if (!HZ) { const edge = []; for (let x = -60; x <= W + 60; x += 18) edge.push([x, 748 + noise1(x * 0.013, 808) * 7 + noise1(x * 0.06, 809) * 2.5]);
    HZ = { below: toPath(edge.concat([[W + 60, H + 60], [-60, H + 60]])), above: toPath(edge.concat([[W + 60, -60], [-60, -60]])) }; }
  return above ? HZ.above : HZ.below;
}
function drawDawnFront(ctx, t, dawn) {
  // warm light washing over the world from the low sun; the late growth stays below the calligraphy zone (y > 748,
  // the horizon band boundary, so no rectangle shows) until 54.25
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const grow = seg(t, 53.7, 54.25, E.inOutSine);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = dawn * 0.14; ctx.fillStyle = '#FFD9A0'; ctx.fillRect(0, 0, W, H);
  if (grow > 0) {
    // full strength below the horizon line y 748; above it (the calligraphy zone) it only ramps in with the outro
    const up = seg(t, 54.2, 54.45, E.inOutSine);
    for (const [y0, y1, k] of [[748, H + 50, 1], [-50, 748, up]]) {
      if (k <= 0.002) continue;
      ctx.save(); ctx.clip(horizonClip(y0 < 0));
      ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.2 * grow * k; ctx.fillStyle = '#FFD9A0'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = k;
      glow(ctx, SUN[0], SUN[1], 640 * (1 + grow * 0.5), '#F6D7A0', 0.22 * grow);
      ctx.restore();
    }
  }
  ctx.restore();
}
function drawReveal(ctx, t, cam, ft) {
  // the lamp's light opens the darkness in painted rings
  const s = toScreen(cam, ft);
  const R0 = track([[42.38, 0], [42.66, 170, E.outCubic], [43.0, 300], [43.45, 660, E.inOutSine], [43.85, 1300], [44.15, 2400, E.inCubic]], t);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const rings = [[1.0, 0.42], [1.32, 0.45], [1.75, 1]];
  for (let i = 0; i < rings.length; i++) {
    const [k, a] = rings[i]; const rr = Math.max(1, R0 * k);
    const p = new Path2D(); p.rect(-50, -50, W + 100, H + 100);
    p.addPath(rough(ellipsePts(s[0], s[1], rr, rr, Math.max(30, Math.round(rr * 0.25))), { amp: 3 + rr * 0.01, freq: 0.03, seed: 500 + i, step: 8 }));
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = NIGHT; ctx.fill(p, 'evenodd'); ctx.restore();
  }
  ctx.restore();
}
function drawOutro(ctx, t) {
  const u = seg(t, T_OUT0, T_OUT1, E.inOutSine);
  const pre = seg(t, 53.75, T_OUT0, E.inOutSine);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (pre > 0) {
    const up = seg(t, 54.2, 54.45, E.inOutSine);
    for (const [y0, y1, k] of [[748, H + 50, 1], [-50, 748, up]]) {
      if (k <= 0.002) continue;
      ctx.save(); ctx.clip(horizonClip(y0 < 0));
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.16 * pre * k; ctx.fillStyle = '#F6E2B8'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
  if (u > 0) {
    // light bloom from the dawn: cream rings swallow the frame
    const cx = SUN[0], cy = SUN[1];
    const R = lerp(150, 2600, u * u * u * u);
    for (const [k, a] of [[1.0, 0.35], [0.8, 0.5], [0.6, 0.8]]) {
      ctx.globalAlpha = a; ctx.fillStyle = CREAM; ctx.fill(rough(ellipsePts(cx, cy, R * k, R * k, 80), { amp: 4, seed: 900 + k * 10, step: 10 }));
    }
    ctx.globalAlpha = E.inQuad(u); ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
// debug access (tools only; no effect on output)
export const DBG = { poseVariants: [
  { N: { sh: 0.26, el: 2.05, wr: 0.28, hand: 'open' }, F: { sh: 0.55, el: 1.7, wr: 0.4, hand: 'open' } },
  { N: { sh: 0.26, el: 2.0, wr: -0.1, hand: 'open' }, F: { sh: 0.5, el: 1.8, wr: 0.35, hand: 'open' } },
  { N: { sh: 0.22, el: 2.0, wr: 0.0, hand: 'open' }, F: { sh: 0.5, el: 1.85, wr: 0.3, hand: 'open' } },
  { N: { sh: 0.3, el: 1.8, wr: 0.15, hand: 'open' }, F: { sh: 0.55, el: 1.75, wr: 0.45, hand: 'open' } },
  { N: { sh: 0.2, el: 2.15, wr: -0.15, hand: 'open' }, F: { sh: 0.48, el: 1.95, wr: 0.25, hand: 'open' } },
  { N: { sh: 0.26, el: 2.0, wr: -0.1, hand: 'cup' }, F: { sh: 0.5, el: 1.8, wr: 0.35, hand: 'open' } },
], dAt: (t) => dAt(t), ground: (x) => ground(x), slopeAt: (x) => slopeAt(x), get D_END() { return D_END; }, get SUMMIT() { return SUMMIT; }, get SLAB() { return SLAB; }, get SAPLING_X() { return SAPLING_X; }, camAt: (t) => camAt(t), strideAt: (d) => strideAt(d), manState: (t) => manState(t), toScreen: (t, p) => toScreen(camAt(t), p), fk: (t) => { const st = manState(t); return { pose: st.pose, r: fk(st.pose) }; } };
