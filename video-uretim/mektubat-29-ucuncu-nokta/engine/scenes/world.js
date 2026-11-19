// world.js — shots A–G (0 … 35.6 s): Dünya · Berzah · Âhiret on one vertical axis.
// v2: cuts/dissolves instead of whip pans, match-zooms through the fruit, the hypothetical (ghost) self does the unwise act.
import { W, H, P, css, mix, lerp, clamp, invlerp, smooth, E, env, rng, noise1, fbm1, TAU, fillG, rough, ellipsePts, rectPts, crPts, bezPts, roughen, toPath, brushDab, strokeG, sprite, ringHalo, applyCam, camAt } from '../core.js';
import { drawMan, STAND, walkPose, mixPose, LEG, resolveArms } from '../rig.js';
import { on } from '../timing.js';
import * as WE from './world_env.js';

// ------------------------------------------------------------------ layout (world px)
const SIZE = 470;
const MAN_X = 600;                 // shot A (watering)
const KNEEL_X = 640;               // shot C (planting) … until 17 s
const MAN_X2 = 500;                // shots D–G (the given fruit)
const SAP = [872, 22];
const SEED = [752, 14];
const CAN_REST = [975, -84];
const SUN = [250, -1085];
const MOUND = [600, -3060];
const TREE = [600, -3066];
const CANOPY = [600, -3420];
const FLOOD = '#F2D79A';

const T = {
  bu: on('bu'), hikmet: on('darülhikmettir'), hizmet: on('darülhizmettir'), ucret: on('darülücret'), mukafat: on('mükafat'), degil: on('değil'),
  buradaki1: on('buradaki'), amal1: on('amal'), berzah1: on('berzahta'), ahiret1: on('ahirettedir'),
  buradaki2: on('buradaki', 2), amal2: on('amal', 2), berzah2: on('berzahta', 2), ahiret2: on('ahirette'), meyve: on('meyve'), verir: on('verir'),
  madem: on('madem'), amali: on('amali'), neticeleri: on('neticeleri'), dunyada: on('dünyada'), istememek: on('istememek'), gerektir: on('gerektir'),
  verilse: on('verilse'), memnunane: on('memnunane'), degil2: on('değil', 2), mahzunane: on('mahzunane'),
  kopardikca: on('kopardıkça'), sirriyla: on('sırrıyla'),
  baki: on('baki'), ameli: on('ameli'), bu2: on('bu', 2), fani: on('fani'), surette: on('surette'), yemek: on('yemek'), kari: on('karı'), degildir: on('değildir'),
};

// ------------------------------------------------------------------ the man
const hipY = () => -(LEG * 0.975) * SIZE;
const legsAt = (x) => ({ legN: { ik: [x + 24, 0], ft: 0 }, legF: { ik: [x - 20, 0], ft: 0 } });
const POSE = {
  holdCan: { ...STAND, armN: { sh: 0.38, el: 0.55, wr: -0.35, hand: 'grip' } },
  pour: { ...STAND, torso: 0.07, neck: 0.2, head: 0.08, armN: { sh: 0.95, el: 0.2, wr: -0.45, hand: 'grip' } },
  tend: { ...STAND, neck: 0.18, head: 0.06, armN: { sh: 0.32, el: 0.6, wr: -0.35, hand: 'grip' } },
  kneelHigh: { torso: 0.45, neck: 0.2, head: 0.1, armN: { sh: 0.55, el: 0.6, wr: -0.2, hand: 'grip' }, armF: { sh: 0.1, el: 1.2, wr: 0.2, hand: 'relaxed' }, legN: { ik: [KNEEL_X + 40, 0], ft: 0 }, legF: { ik: [KNEEL_X - 150, 0], ft: 1.25 } },
  kneel: { torso: 0.86, neck: 0.1, head: 0.08, armN: { ik: [SEED[0] - 2, SEED[1] - 16], bend: 1, hand: 'grip' }, armF: { sh: 0.1, el: 1.2, wr: 0.2, hand: 'relaxed' }, legN: { ik: [KNEEL_X + 40, 0], ft: 0 }, legF: { ik: [KNEEL_X - 150, 0], ft: 1.25 } },
  pat: { torso: 0.86, neck: 0.1, head: 0.08, armN: { ik: [SEED[0] - 4, SEED[1] - 30], bend: 1, hand: 'open' }, armF: { sh: 0.1, el: 1.2, wr: 0.2, hand: 'relaxed' }, legN: { ik: [KNEEL_X + 40, 0], ft: 0 }, legF: { ik: [KNEEL_X - 150, 0], ft: 1.25 } },
  stand: { ...STAND },
  lookUp: { ...STAND, neck: -0.32, head: -0.12 },
  lookFruit: { ...STAND, neck: -0.05, head: -0.04 },
  declinePalm: { ...STAND, neck: 0.05, head: 0.02, armN: { sh: 1.15, el: 0.45, wr: -1.35, hand: 'open' } },
  handChest: { ...STAND, neck: 0.36, head: 0.1, armN: { ik: [MAN_X2 + 40, 0], bend: 1, hand: 'open' } }, // ik set at runtime
  cupUp: { ...STAND, neck: -0.28, head: -0.12, armN: { sh: 0.62, el: 0.85, wr: -0.6, hand: 'cup' }, armF: { sh: 0.55, el: 0.92, wr: -0.6, hand: 'cup' } },
  cup: { ...STAND, neck: 0.1, head: 0.05, armN: { sh: 0.5, el: 1.0, wr: -0.65, hand: 'cup' }, armF: { sh: 0.44, el: 1.06, wr: -0.65, hand: 'cup' } },
  sad: { ...STAND, torso: 0.1, neck: 0.62, head: 0.2, armN: { sh: 0.18, el: 1.55, wr: -0.75, hand: 'cup' }, armF: { sh: 0.12, el: 1.62, wr: -0.75, hand: 'cup' } },
  keep: { ...STAND, torso: 0.04, neck: 0.2, head: 0.06, armN: { sh: 0.3, el: 1.45, wr: -0.75, hand: 'cup' }, armF: { sh: 0.24, el: 1.52, wr: -0.75, hand: 'cup' } },
  joy: { ...STAND, torso: -0.06, neck: -0.25, head: -0.1, armN: { sh: 2.7, el: 0.28, wr: 0.2, hand: 'open' }, armF: { sh: 2.45, el: 0.35, wr: 0.2, hand: 'open' } },
};
POSE.handChest.armN = { ik: [MAN_X2 + 0.08 * SIZE, hipY() - 0.14 * SIZE], bend: -1, hand: 'open' };
const RA = (p, hip) => resolveArms({ ...p, hip }, SIZE);
function keyed(keys, t, hip) {
  const get = (k) => RA(POSE[k[1]] || k[1], hip);
  if (t <= keys[0][0]) return get(keys[0]);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) return mixPose(get(a), get(b), (b[2] || E.inOutCubic)(invlerp(a[0], b[0], t)));
  }
  return get(keys[keys.length - 1]);
}
const KEYS_A = [[3.27, 'holdCan'], [3.52, 'pour', E.inOutQuad], [4.1, 'pour'], [4.45, 'tend'], [9, 'tend']];
const KEYS_D = [
  [17.0, 'stand'], [T.dunyada - 0.1, 'stand'], [T.dunyada + 0.35, 'lookFruit'], [T.istememek - 0.05, 'lookFruit'], [T.istememek + 0.35, 'declinePalm', E.outCubic],
  [T.gerektir - 0.05, 'declinePalm'], [T.gerektir + 0.5, 'handChest', E.inOutCubic], [T.verilse - 0.1, 'handChest'], [T.verilse + 0.4, 'cupUp', E.inOutCubic],
  [T.memnunane - 0.1, 'cup', E.inOutSine], [T.mahzunane - 0.05, 'cup'], [T.mahzunane + 0.75, 'sad', E.inOutSine], [31.4, 'sad'], [32.2, 'keep', E.inOutSine],
];
function manState(t) {
  const walkA = 1.75, walkB = 2.95, settle = 0.32, stride = 0.34;
  const startX = MAN_X - 2.06 * 2 * stride * SIZE;
  if (t < walkB + settle) {
    const d = (MAN_X - startX) * E.outSine(invlerp(walkA, walkB, t));
    const wp = walkPose(d, { size: SIZE, x0: startX, ground: () => 0, stride, lean: 0.05, armN: { sh: 0.38, el: 0.55, wr: -0.35, hand: 'grip' } });
    if (t <= walkB) return { pose: wp, can: 1, x: MAN_X };
    const k = E.inOutSine(invlerp(walkB, walkB + settle, t));
    const st = { ...POSE.holdCan, ...legsAt(MAN_X), hip: [MAN_X, hipY()] };
    const p = mixPose(wp, st, k);
    p.legN = { ik: [lerp(wp.legN.ik[0], MAN_X + 24, k), 0], ft: 0 };
    p.legF = { ik: [lerp(wp.legF.ik[0], MAN_X - 20, k), -Math.sin(Math.PI * k) * 22], ft: lerp(wp.legF.ft, 0, k) };
    return { pose: p, can: 1, x: MAN_X };
  }
  if (t < 10.6) return { pose: { ...keyed(KEYS_A, t, [MAN_X, hipY()]), ...legsAt(MAN_X), hip: [MAN_X, hipY()] }, can: t < 9 ? 1 : 0, x: MAN_X };
  const standHip = [KNEEL_X, hipY()], kneelHip = [KNEEL_X, -0.255 * SIZE];
  if (t < 12.85) {
    const st = RA({ ...POSE.stand, ...legsAt(KNEEL_X) }, standHip);
    const kh = RA(POSE.kneelHigh, kneelHip), kn = RA(POSE.kneel, kneelHip), pt = RA(POSE.pat, kneelHip);
    let p;
    if (t < 10.95) p = mixPose(st, kh, E.inOutCubic(invlerp(10.35, 10.95, t)));
    else if (t < 11.3) p = mixPose(kh, kn, E.inOutCubic(invlerp(10.95, 11.3, t)));
    else if (t < 11.62) p = kn;
    else if (t < 11.95) p = mixPose(kn, pt, Math.sin(Math.PI * invlerp(11.62, 11.95, t)));
    else if (t < 12.15) p = kn;
    else p = mixPose(kn, st, E.inOutCubic(invlerp(12.15, 12.85, t)));
    return { pose: p, can: 0, seedInHand: t < 11.32, x: KNEEL_X };
  }
  if (t < 17.0) { const look = E.inOutSine(invlerp(12.9, 13.6, t)); return { pose: { ...mixPose(POSE.stand, POSE.lookUp, look), ...legsAt(KNEEL_X), hip: standHip, breath: Math.sin(t * 1.6) }, can: 0, x: KNEEL_X }; }
  const p = keyed(KEYS_D, t, [MAN_X2, hipY()]);
  const sag = 7 * smooth(invlerp(T.mahzunane, T.mahzunane + 0.8, t)) * (1 - smooth(invlerp(31.6, 32.2, t)));
  return { pose: { ...p, ...legsAt(MAN_X2), hip: [MAN_X2, hipY() + sag], breath: Math.sin(t * 1.6) * 0.5 + 0.5 }, can: 0, x: MAN_X2 };
}
const NULLCTX = new OffscreenCanvas(4, 4).getContext('2d');
const jointsAt = (t) => drawMan(NULLCTX, manState(t).pose, { size: SIZE });
const fruitIn = (j) => [(j.handN[0] + j.handF[0]) / 2 + 6, (j.handN[1] + j.handF[1]) / 2 - 22];

// ------------------------------------------------------------------ camera (cuts are step keys; dissolves handled in draw)
let CAM = null;
const STEP = (u) => (u > 0 ? 1 : 0);
const CUTS = [[10.6, 0.22], [18.05, 0.22]];
function buildCam() {
  const fc = (F, z) => ({ x: F[0] - (560 - 540) / z, y: F[1] - (860 - 960) / z, z });
  const FE = fruitIn(jointsAt(24.3)), FG = fruitIn(jointsAt(31.9));
  CAM = [
    { t: 0.0, x: 650, y: -262, z: 0.95 },
    { t: 1.6, x: 650, y: -242, z: 1.0, ease: E.inOutSine },
    { t: 3.2, x: 720, y: -190, z: 1.22, ease: E.inOutCubic },
    { t: 4.6, x: 720, y: -196, z: 1.22, ease: E.inOutSine },
    { t: 6.3, x: 660, y: -226, z: 1.05, ease: E.inOutSine },
    { t: 7.4, x: 620, y: -712, z: 1.0, ease: E.inCubic },
    { t: 8.9, x: 580, y: -2654, z: 1.0, ease: E.linear },
    { t: 10.25, x: 560, y: -3240, z: 1.04, ease: E.outCubic },
    { t: 10.6, x: 560, y: -3246, z: 1.045, ease: E.inOutSine },
    { t: 10.6001, x: 700, y: -150, z: 1.4, ease: STEP },
    { t: 11.75, x: 706, y: -156, z: 1.43, ease: E.inOutSine },
    { t: 12.95, x: 560, y: -1062, z: 0.32, ease: E.inOutCubic },
    { t: 16.05, x: 566, y: -1086, z: 0.33, ease: E.inOutSine },
    { t: 17.2, x: 590, y: -3480, z: 1.25, ease: E.inOutQuart },
    { t: 18.05, x: 590, y: -3486, z: 1.31, ease: E.inOutSine },
    { t: 18.0501, x: 615, y: -196, z: 1.2, ease: STEP },
    { t: 20.3, x: 615, y: -188, z: 1.25, ease: E.inOutSine },
    { t: 23.9, x: 612, y: -178, z: 1.34, ease: E.inOutSine },
    { t: 24.75, ...fc(FE, 6.0), ease: E.inOutCubic },
    { t: 31.62, ...fc(FG, 6.0), ease: STEP },
    { t: 32.5, x: 430, y: -200, z: 1.42, ease: E.inOutCubic },
    { t: 34.4, x: 430, y: -204, z: 1.47, ease: E.inOutSine },
  ];
}
const camWorld = (t) => camAt(CAM, t);

// ------------------------------------------------------------------ stem
const STEM_CTRL = [[SEED[0], SEED[1]], [800, -170], [792, -520], [788, -900], [712, -1320], [760, -1720], [690, -2120], [736, -2500], [640, -2820], [TREE[0], TREE[1] + 40]];
let STEM_PTS = null, STEM_LEN = null;
function stemInit() {
  STEM_PTS = crPts(STEM_CTRL, false, 24);
  STEM_LEN = [0]; for (let i = 1; i < STEM_PTS.length; i++) STEM_LEN.push(STEM_LEN[i - 1] + Math.hypot(STEM_PTS[i][0] - STEM_PTS[i - 1][0], STEM_PTS[i][1] - STEM_PTS[i - 1][1]));
}
const stemGrowth = (t) => E.inOutSine(invlerp(T.berzah2 + 0.02, 12.85, t));
function stemPoint(g) {
  const L = STEM_LEN[STEM_LEN.length - 1] * clamp(g);
  let i = 1; while (i < STEM_LEN.length - 1 && STEM_LEN[i] < L) i++;
  const u = (L - STEM_LEN[i - 1]) / (STEM_LEN[i] - STEM_LEN[i - 1] || 1);
  return [lerp(STEM_PTS[i - 1][0], STEM_PTS[i][0], u), lerp(STEM_PTS[i - 1][1], STEM_PTS[i][1], u)];
}
function drawStem(ctx, t) {
  const g = stemGrowth(t); if (g <= 0) return;
  const total = STEM_LEN[STEM_LEN.length - 1] * g;
  const pts = []; for (let i = 0; i < STEM_PTS.length && STEM_LEN[i] <= total; i++) pts.push(STEM_PTS[i]);
  pts.push(stemPoint(g)); if (pts.length < 2) return;
  const wn = (u) => 1 + 0.12 * noise1(u * 40, 7);
  strokeG(ctx, pts, (u) => lerp(18, 9, u) * wn(u) * (u > 0.97 ? (1 - u) / 0.03 * 0.6 + 0.4 : 1), '#3F7344', { tex: 0.4, seed: 5, taper: false });
  strokeG(ctx, pts.map(([x, y]) => [x - 4, y]), (u) => lerp(6, 3, u), '#2F5A3B', { tex: 0.3, seed: 8, taper: false });
  strokeG(ctx, pts.map(([x, y]) => [x + 3, y]), (u) => lerp(7, 3, u), '#8CC071', { tex: 0.3, seed: 6, taper: false });
  // nodes
  for (let k = 1; k < 26; k++) { const gk = k / 26; if (gk > g - 0.005) break; const p = stemPoint(gk); fillG(ctx, rough(ellipsePts(p[0], p[1], 10, 6, 12), { amp: 0.6, seed: 900 + k }), '#4E8A4F', { tex: 0.3 }); }
  // leaves + a few tendrils
  const R = rng(44);
  for (let k = 1; k < 34; k++) {
    const gk = k / 34; if (gk > g - 0.01) break;
    const age = clamp((g - gk) * 12);
    const p = stemPoint(gk), q = stemPoint(gk + 0.004);
    const side = k % 2 ? 1 : -1;
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]) + side * (1.05 + R() * 0.3);
    const L = (34 + R() * 16) * E.outBackSoft(age), Wd = L * 0.45;
    const pp = [[0, 0], [L * 0.35, -Wd * 0.5], [L * 0.8, -Wd * 0.3], [L, 0], [L * 0.8, Wd * 0.3], [L * 0.35, Wd * 0.5]].map(([x, y]) => [p[0] + x * Math.cos(a) - y * Math.sin(a), p[1] + x * Math.sin(a) + y * Math.cos(a)]);
    fillG(ctx, rough(crPts(pp, true, 4), { amp: 0.8, seed: 70 + k }), k % 3 ? '#5E9A55' : '#86BC6B', { tex: 0.4, dir: a, scale: 0.3 });
    if (k % 7 === 3 && age > 0.5) { const curl = []; for (let i = 0; i <= 16; i++) { const u = i / 16; const ang = a + side * u * 4.2; const rr = 28 * (1 - u * 0.7); curl.push([p[0] + Math.cos(a) * 20 + Math.cos(ang) * rr * u, p[1] + Math.sin(a) * 20 + Math.sin(ang) * rr * u]); } strokeG(ctx, curl, 3, '#5E9A55', { tex: 0, taper: true }); }
  }
  // berzah buds ("berzahta meyve verir")
  [0.47, 0.53, 0.6, 0.66, 0.72, 0.78].forEach((gb, i) => {
    if (g < gb + 0.02) return;
    const age = clamp((g - gb - 0.02) * 9);
    const p = stemPoint(gb); const side = i % 2 ? 1 : -1;
    const tip = [p[0] + side * 52, p[1] - 20];
    strokeG(ctx, [p, [p[0] + side * 24, p[1] - 4], tip], 6, '#4E8A4F', { tex: 0.3, taper: false });
    const r = 22 * E.outBack(age, 1.6);
    ringHalo(ctx, tip[0], tip[1], r * 2.3, ['#E9C9D6', '#F6E2E4'], { seed: 90 + i, amp: 1, spread: 1.25, alpha: 0.7 * age });
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + i; fillG(ctx, rough(ellipsePts(tip[0] + Math.cos(a) * r * 0.55, tip[1] + Math.sin(a) * r * 0.55, r * 0.55, r * 0.38, 12, a), { amp: 0.5, seed: 95 + k + i * 7 }), '#FBEFF0', { tex: 0.25, dir: a }); }
    fillG(ctx, rough(ellipsePts(tip[0], tip[1], r * 0.32, r * 0.32, 10), { amp: 0.4, seed: 99 + i }), '#F0B54A', { tex: 0.2 });
  });
}

// ------------------------------------------------------------------ fruit
/** golden-orange fruit; sphere shading (crescent terminator), optional bites (clipped to the body), dull → fâni */
function drawFruit(ctx, x, y, r, { glow: gl = 1, dull = 0, bites = 0, seed = 0, t = 0, ring = 0, leaf = true, alpha = 1, halo = true, haloA = 0.45, haloR = 1.7 } = {}) {
  if (r <= 0.5 || alpha <= 0) return;
  ctx.save(); if (alpha < 1) ctx.globalAlpha *= alpha;
  if (halo && ring > 0.01) ringHalo(ctx, x, y, r * 2.15 * 1.18, ['#F4D592', '#F9E6B8'], { seed: 410, amp: 1.5, spread: 1.0, alpha: 0.35 * ring });
  if (halo && gl > 0.01) ringHalo(ctx, x, y, r * haloR, ['#F7C66B', '#F9E2AE'], { seed: 300 + seed, amp: 1.0, spread: 1.45, alpha: haloA * Math.min(gl, 1.2) * (0.85 + 0.15 * Math.sin(t * 3 + seed)) });
  const bodyPts = roughen(ellipsePts(x, y, r, r * 0.96, 30), { amp: 0.9 * Math.min(1, r / 30), seed: 310 + seed, step: 3 });
  const body = toPath(bodyPts);
  ctx.save();
  if (bites > 0) {
    const clip = new Path2D(); clip.rect(x - r * 3, y - r * 3, r * 6, r * 6);
    BITES(x, y, r).slice(0, bites).forEach(([bx, by, br], k) => toPath(roughen(ellipsePts(bx, by, br, br, 18), { amp: 0.6, seed: 900 + k }), true, clip));
    ctx.clip(clip, 'evenodd');
  }
  const d = dull * 0.8;
  const base = mix(mix('#EE8E3C', '#F2B048', 0.35), '#B98C64', d), shadeC = mix('#C2592A', '#7E5E46', d), lightC = mix('#FBD889', '#D9BE96', d), rim = mix('#F0A050', '#B08A6A', d);
  fillG(ctx, body, css(shadeC), { tex: 0.3, dir: 0.5, scale: 0.25 });
  ctx.save(); ctx.clip(body);
  fillG(ctx, rough(ellipsePts(x + r * 0.12, y - r * 0.12, r * 0.92, r * 0.9, 28), { amp: 0.7, seed: 320 + seed }), css(base), { tex: 0.35, dir: 0.5, scale: 0.25 });
  strokeG(ctx, ellipsePts(x, y, r * 0.93, r * 0.9, 40).slice(14, 27), Math.max(1.5, r * 0.07), css(rim), { tex: 0, taper: true, alpha: 0.8 });
  fillG(ctx, rough(ellipsePts(x + r * 0.36, y - r * 0.38, r * 0.24, r * 0.18, 16, -0.6), { amp: 0.4, seed: 330 + seed }), css(lightC), { tex: 0.2, dir: -0.6, scale: 0.2 });
  if (bites > 0) BITES(x, y, r).slice(0, bites).forEach(([bx, by, br], k) => fillG(ctx, rough(ellipsePts(bx, by, br + r * 0.14, br + r * 0.14, 18), { amp: 0.5, seed: 950 + k }), '#F4E3BE', { tex: 0.2 }));
  ctx.restore();
  ctx.restore();
  // dimple + stalk + leaf
  fillG(ctx, rough(ellipsePts(x + r * 0.04, y - r * 0.86, r * 0.16, r * 0.07, 12), { amp: 0.3, seed: 335 + seed }), css(shadeC), { tex: 0, alpha: 0.8 });
  if (leaf) {
    strokeG(ctx, [[x + r * 0.04, y - r * 0.86], [x + r * 0.1, y - r * 1.25]], r * 0.13, '#5C4334', { tex: 0, taper: false });
    const a = -0.6; const L = r * 0.95, Wd = r * 0.42;
    const pp = [[0, 0], [L * 0.35, -Wd * 0.5], [L * 0.8, -Wd * 0.3], [L, 0], [L * 0.8, Wd * 0.3], [L * 0.35, Wd * 0.5]].map(([px, py]) => [x + r * 0.08 + px * Math.cos(a) - py * Math.sin(a), y - r * 1.2 + px * Math.sin(a) + py * Math.cos(a)]);
    fillG(ctx, rough(crPts(pp, true, 4), { amp: 0.5, seed: 340 + seed }), css(mix('#5E9A55', '#8A8F80', d)), { tex: 0.3, dir: a, scale: 0.2 });
  }
  ctx.restore();
  if (ring > 0.01) eternityRing(ctx, x, y, r * 2.15, ring, t);
}
const BITES = (x, y, r) => [[x + r * 0.95, y - r * 0.2, r * 0.5], [x + r * 0.62, y + r * 0.62, r * 0.46], [x - r * 0.1, y + r * 0.95, r * 0.46]];
function eternityRing(ctx, x, y, R0, k, t) {
  const rot = t * 0.35, n = 30;
  ctx.save();
  const arc = []; const sweep = clamp(k);
  for (let i = 0; i <= 160 * sweep; i++) { const a = -Math.PI / 2 + (i / 160) * TAU; arc.push([x + Math.cos(a) * R0, y + Math.sin(a) * R0]); }
  if (arc.length > 2) { strokeG(ctx, arc, Math.max(4, R0 * 0.04), '#D9A441', { tex: 0, taper: false }); strokeG(ctx, arc.map(([px, py]) => [x + (px - x) * 0.94, y + (py - y) * 0.94]), Math.max(1.5, R0 * 0.012), '#FBE7A6', { tex: 0, taper: false }); }
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU; if ((((a + Math.PI / 2) % TAU) + TAU) % TAU > sweep * TAU) continue;
    const big = i % 3 === 0; const rr = R0 * (big ? 0.03 : 0.018) + (big ? 3 : 2);
    fillG(ctx, rough(ellipsePts(x + Math.cos(a) * R0 * 1.09, y + Math.sin(a) * R0 * 1.09, rr, rr, 10), { amp: 0.4, seed: 400 + i }), big ? '#E0A63A' : '#F0CF7E', { tex: 0 });
  }
  for (let m = 0; m < 3; m++) { const a = -rot * 1.6 + m * TAU / 3; mote(ctx, x + Math.cos(a) * R0 * 1.22, y + Math.sin(a) * R0 * 1.22, Math.max(3, R0 * 0.02), k, t, 420 + m); }
  ctx.restore();
}

// ------------------------------------------------------------------ the tree of the hereafter
const FRUITS = [[418, -3352], [520, -3540], [690, -3560], [760, -3380], [600, -3300], [470, -3470], [650, -3440], [790, -3505], [540, -3640], [700, -3655], [405, -3505], [585, -3480]];
const treeGrowth = (t) => E.outBack(invlerp(12.82, 13.32, t), 1.2);
const fruitPop = (i, t) => { const t0 = T.meyve - 0.08 + i * 0.07; return clamp(E.outBack(invlerp(t0, t0 + 0.32, t), 2.0), 0, 1.2); };
const BLOBS = [[-210, -40, 120], [-90, -170, 150], [80, -190, 150], [200, -60, 130], [0, -60, 180], [-160, 70, 100], [150, 80, 105], [20, 90, 120]];
function drawTree(ctx, t) {
  const g = treeGrowth(t);
  if (g <= 0.001) return;
  const sw = Math.sin(t * 0.8) * 4, sway = (k) => Math.sin(t * 0.9 + k) * 3;
  ctx.save();
  ctx.translate(TREE[0], TREE[1]); ctx.scale(Math.max(0.001, g), Math.max(0.001, g)); ctx.translate(-TREE[0], -TREE[1]);
  // trunk with root flare and limbs
  const trunk = crPts([[TREE[0] - 4, TREE[1]], [TREE[0] + 8, TREE[1] - 120], [TREE[0] - 6, TREE[1] - 230], [CANOPY[0] + sw * 0.3, CANOPY[1] + 40]], false, 8);
  strokeG(ctx, trunk, (u) => lerp(58, 26, u) + (u < 0.08 ? (0.08 - u) * 300 : 0), '#7A5B45', { tex: 0.45, dir: Math.PI / 2, taper: false });
  strokeG(ctx, trunk.map(([x, y]) => [x - 14, y]), (u) => lerp(16, 6, u), '#5C4334', { tex: 0.3, taper: false });
  strokeG(ctx, trunk.map(([x, y]) => [x + 12, y]), (u) => lerp(9, 3, u), '#9C7A60', { tex: 0.3, taper: false, alpha: 0.8 });
  [[[TREE[0] - 2, TREE[1] - 200], [520, -3300], [430, -3380]], [[TREE[0], TREE[1] - 230], [700, -3330], [770, -3400]]].forEach((b, i) => strokeG(ctx, crPts(b, false, 8), (u) => lerp(20, 8, u), '#7A5B45', { tex: 0.35, seed: 20 + i, taper: false }));
  // canopy: dark union, mid union (up-right), light only on the upper-right masses
  const union = (dx0, dy0, kr, ky, seed) => { const p = new Path2D(); BLOBS.forEach(([dx, dy, r], i) => toPath(roughen(ellipsePts(CANOPY[0] + dx + dx0 + sway(i), CANOPY[1] + dy + dy0, r * kr, r * kr * ky, 40), { amp: 2.4, seed: seed + i }), true, p)); return p; };
  fillG(ctx, union(0, 0, 1, 0.86, 200), '#2F6A45', { tex: 0.5, dir: -0.7, scale: 0.45 });
  fillG(ctx, union(16, -20, 0.84, 0.8, 220), '#4C8A4F', { tex: 0.5, dir: -0.7, scale: 0.45 });
  const lp = new Path2D(); [[80, -190, 150], [200, -60, 130], [-90, -170, 150]].forEach(([dx, dy, r], i) => toPath(roughen(ellipsePts(CANOPY[0] + dx + 40 + sway(i), CANOPY[1] + dy - 44, r * 0.5, r * 0.38, 28), { amp: 1.8, seed: 240 + i }), true, lp));
  fillG(ctx, lp, '#8DBE6E', { tex: 0.45, dir: -0.7, scale: 0.4 });
  const RL = rng(270);
  BLOBS.forEach(([dx, dy, r], bi) => {
    for (let k = 0; k < 7; k++) {
      const a = RL() * TAU; const lx = CANOPY[0] + dx + sway(bi) + Math.cos(a) * r * 0.95, ly = CANOPY[1] + dy + Math.sin(a) * r * 0.82;
      const L = 34 + RL() * 20, la = a + (RL() - 0.5) * 0.8, Wd = L * 0.45;
      const pp = [[0, 0], [L * 0.35, -Wd * 0.5], [L * 0.8, -Wd * 0.3], [L, 0], [L * 0.8, Wd * 0.3], [L * 0.35, Wd * 0.5]].map(([px, py]) => [lx + px * Math.cos(la) - py * Math.sin(la), ly + px * Math.sin(la) + py * Math.cos(la)]);
      fillG(ctx, rough(crPts(pp, true, 3), { amp: 0.6, seed: 280 + bi * 9 + k }), RL() < 0.5 ? '#2F6A45' : '#4C8A4F', { tex: 0.35, dir: la, scale: 0.3 });
    }
  });
  const RD = rng(260);
  for (let k = 0; k < 10; k++) { const a = -1.2 + RD() * 1.4, rr = 120 + RD() * 140; fillG(ctx, rough(ellipsePts(CANOPY[0] + Math.cos(a) * rr + 30, CANOPY[1] + Math.sin(a) * rr * 0.8 - 30, 12 + RD() * 8, 10 + RD() * 6, 12), { amp: 0.6, seed: 262 + k }), '#C5DC93', { tex: 0.2, alpha: 0.9 }); }
  ctx.restore();
  FRUITS.forEach(([x, y], i) => {
    const s = fruitPop(i, t); if (s <= 0.01) return;
    drawFruit(ctx, TREE[0] + (x - TREE[0]) * g + sway(i) * 0.6, TREE[1] + (y - TREE[1]) * g, 26 * s, { glow: 0.5, seed: i, t });
  });
}

// ------------------------------------------------------------------ props
function drawWateringCan(ctx, x, y, ang, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  fillG(ctx, rough(crPts([[-20, 18], [62, 18], [66, 84], [-24, 84]], true, 5), { amp: 0.8, seed: 501 }), '#4F7F8E', { tex: 0.4, dir: Math.PI / 2, scale: 0.3 });
  fillG(ctx, rough([[-22, 50], [-24, 84], [64, 84], [63, 64]], { amp: 0.7, seed: 502 }), '#3C6575', { tex: 0.3, scale: 0.3, alpha: 0.85 });
  strokeG(ctx, [[60, 70], [92, 40], [118, 12]], 9, '#4F7F8E', { tex: 0.3, taper: false });
  fillG(ctx, rough(ellipsePts(121, 9, 9, 6, 12, -0.8), { amp: 0.4, seed: 503 }), '#3C6575', { tex: 0 });
  const arcP = []; for (let i = 0; i <= 14; i++) { const a = Math.PI + (i / 14) * Math.PI; arcP.push([20 + Math.cos(a) * 36, 18 + Math.sin(a) * 30]); }
  strokeG(ctx, arcP, 7, '#3C6575', { tex: 0.2, taper: false });
  fillG(ctx, rough(rectPts(-22, 14, 88, 8), { amp: 0.5, seed: 504 }), '#6E9AA6', { tex: 0.2 });
  ctx.restore();
  const c = Math.cos(ang) * s, sn = Math.sin(ang) * s;
  return [x + 121 * c - 9 * sn, y + 121 * sn + 9 * c];
}
function drawWater(ctx, from, to, k, t) {
  if (k <= 0) return;
  const R = rng(510);
  for (let i = 0; i < 34; i++) {
    const u = ((t * 2.4 + i / 34) % 1); const sp = (R() - 0.5) * 18 * u;
    const px = lerp(from[0], to[0], u) + sp, py = lerp(from[1], to[1], u) - Math.sin(u * Math.PI) * 26;
    strokeG(ctx, [[px, py - 12], [px + 2, py + 12]], 8, '#7FAFC9', { tex: 0, taper: true, alpha: 0.9 * k });
    strokeG(ctx, [[px, py - 10], [px + 2, py + 10]], 5, i % 3 ? '#C4DDEC' : '#EEF6F9', { tex: 0, taper: true, alpha: 0.95 * k });
  }
  for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.15 + 0.7 * R()); const u = (t * 3 + R()) % 1; fillG(ctx, rough(ellipsePts(to[0] + Math.cos(a) * u * 34, to[1] + 24 + Math.sin(a) * u * 24, 3.5, 3.5, 8), { amp: 0.3, seed: 515 + i }), '#CFE3EE', { tex: 0, alpha: k * (1 - u) }); }
}
function coinPouch(ctx) {
  const bag = crPts([[-34, 40], [-42, 4], [-22, -22], [22, -22], [42, 4], [34, 40]], true, 6);
  fillG(ctx, rough(bag, { amp: 1, seed: 530 }), '#B48555', { tex: 0.45, dir: Math.PI / 2, scale: 0.25 });
  fillG(ctx, rough(crPts([[-34, 40], [-42, 4], [-30, -10], [-14, 40]], true, 4), { amp: 0.8, seed: 531 }), '#8E6640', { tex: 0.3, alpha: 0.8 });
  fillG(ctx, rough(crPts([[-16, -22], [-24, -38], [0, -32], [24, -38], [16, -22]], true, 4), { amp: 0.8, seed: 532 }), '#C89863', { tex: 0.3 });
  strokeG(ctx, [[-22, -22], [22, -22]], 5, '#6E4E33', { tex: 0, taper: false });
  [[12, 28], [24, 34], [-4, 34]].forEach(([cx, cy], i) => { fillG(ctx, rough(ellipsePts(cx + 20, cy, 12, 12, 16), { amp: 0.5, seed: 535 + i }), '#E2B246', { tex: 0.2 }); fillG(ctx, rough(ellipsePts(cx + 22, cy - 2, 6, 6, 12), { amp: 0.4, seed: 538 + i }), '#F3D27C', { tex: 0 }); });
}
function giftBox(ctx) {
  fillG(ctx, rough(rectPts(-36, -18, 72, 58), { amp: 1, seed: 540 }), '#C9604E', { tex: 0.35, dir: Math.PI / 2, scale: 0.25 });
  fillG(ctx, rough(rectPts(-36, 10, 72, 30), { amp: 0.8, seed: 541 }), '#A94C3D', { tex: 0.3, alpha: 0.7 });
  fillG(ctx, rough(rectPts(-41, -30, 82, 16), { amp: 0.8, seed: 542 }), '#D8705C', { tex: 0.3 });
  fillG(ctx, rough(rectPts(-7, -30, 14, 70), { amp: 0.6, seed: 543 }), '#E2B246', { tex: 0.3, dir: Math.PI / 2 });
  fillG(ctx, rough(crPts([[0, -30], [-26, -48], [-30, -36], [-6, -30]], true, 4), { amp: 0.6, seed: 544 }), '#E2B246', { tex: 0.2 });
  fillG(ctx, rough(crPts([[0, -30], [26, -48], [30, -36], [6, -30]], true, 4), { amp: 0.6, seed: 545 }), '#C99A35', { tex: 0.2 });
}
function mote(ctx, x, y, r, a = 1, t = 0, seed = 0) {
  if (a <= 0.01) return;
  const tw = 0.85 + 0.15 * Math.sin(t * 5 + seed);
  ringHalo(ctx, x, y, r * 3.2 * tw, ['#F3D58C', '#F8E6B6'], { seed: 560 + seed, amp: 0.6, spread: 1.3, alpha: 0.45 * a });
  fillG(ctx, rough(ellipsePts(x, y, r, r, 12), { amp: 0.4, seed: 570 + seed }), '#FBEAB8', { tex: 0, alpha: a });
}

// ------------------------------------------------------------------ ghost (the hypothetical self): rendered opaque offscreen, then shown translucent and warm
let GHOST = null;
function drawGhost(ctx, pose, alpha, extra) {
  if (alpha <= 0.01) return null;
  if (!GHOST) GHOST = new OffscreenCanvas(W, H);
  const g = GHOST.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  g.setTransform(ctx.getTransform());
  const j = drawMan(g, pose, { size: SIZE, facing: pose.facing || 1, seed: 11 });
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.55; g.fillStyle = '#FFF1D2'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha * 0.62; ctx.drawImage(GHOST, 0, 0); ctx.restore();
  return j;
}

// ------------------------------------------------------------------ the balance scale ("kâr-ı akıl değildir")
const SC = { cx: 540, cy: 520, L: 330, chain: 300, pan: 125 };
const scaleTilt = (t) => -0.3 * E.outBack(invlerp(T.degildir - 0.22, T.degildir + 0.5, t), 1.5) - 0.05 * E.inOutSine(invlerp(T.kari, T.kari + 0.5, t));
function scaleFruitPos(t) { const tl = scaleTilt(t); return [SC.cx - Math.cos(tl) * SC.L, SC.cy - Math.sin(tl) * SC.L + SC.chain - 76]; }
function drawScale(ctx, t, k) {
  const tilt = scaleTilt(t); const { cx, cy, L, chain, pan } = SC;
  ctx.save(); ctx.globalAlpha *= k;
  const bg = new Path2D(); bg.rect(0, 0, W, H);
  fillG(ctx, bg, '#EADBBE', { tex: 0.35, kind: 'dabs', scale: 0.9 });
  const [fx, fy] = scaleFruitPos(t);
  ringHalo(ctx, fx, fy, 300, ['#EED6A8', '#F2DFB8', '#F7EBD0'], { seed: 700, amp: 2.4, spread: 1.0, alpha: 0.95 });
  fillG(ctx, rough(ellipsePts(cx, cy + 690, 250, 26, 40), { amp: 1.5, seed: 699 }), '#D2BC96', { tex: 0.3 });
  fillG(ctx, rough(crPts([[cx - 190, cy + 690], [cx - 140, cy + 628], [cx + 140, cy + 628], [cx + 190, cy + 690]], true, 4), { amp: 1.2, seed: 701 }), '#A8742A', { tex: 0.4, scale: 0.4 });
  fillG(ctx, rough(crPts([[cx - 190, cy + 690], [cx - 170, cy + 668], [cx + 170, cy + 668], [cx + 190, cy + 690]], true, 4), { amp: 1, seed: 7012 }), '#8A5A1E', { tex: 0.3, scale: 0.4 });
  fillG(ctx, rough(crPts([[cx - 150, cy + 640], [cx - 120, cy + 628], [cx + 120, cy + 628], [cx + 150, cy + 640]], true, 4), { amp: 0.8, seed: 7011 }), '#D9A441', { tex: 0.3, scale: 0.4 });
  fillG(ctx, rough(rectPts(cx - 20, cy - 70, 40, 700), { amp: 1, seed: 702 }), '#C38F3A', { tex: 0.45, dir: Math.PI / 2, scale: 0.4 });
  fillG(ctx, rough(rectPts(cx - 20, cy - 70, 15, 700), { amp: 0.8, seed: 703 }), '#8A5A1E', { tex: 0.35, dir: Math.PI / 2, scale: 0.4, alpha: 0.85 });
  fillG(ctx, rough(rectPts(cx + 8, cy - 70, 6, 700), { amp: 0.5, seed: 7031 }), '#E2B55A', { tex: 0.2, alpha: 0.8 });
  const dome = []; for (let i = 0; i <= 16; i++) { const a = Math.PI + (i / 16) * Math.PI; dome.push([cx + Math.cos(a) * 40, cy - 72 + Math.sin(a) * 40]); }
  fillG(ctx, rough(dome, { amp: 0.8, seed: 704 }), '#D9A441', { tex: 0.35 });
  fillG(ctx, rough(dome.map(([x, y]) => [Math.min(x, cx - 6), y]), { amp: 0.6, seed: 7041 }), '#A8742A', { tex: 0.3, alpha: 0.8 });
  fillG(ctx, rough(ellipsePts(cx, cy - 122, 11, 11, 12), { amp: 0.5, seed: 705 }), '#E9C46F', { tex: 0.2 });
  const bx = Math.cos(tilt) * L, by = Math.sin(tilt) * L;
  strokeG(ctx, [[cx - bx, cy - by], [cx + bx, cy + by]], 22, '#C38F3A', { tex: 0.35, taper: false });
  strokeG(ctx, [[cx - bx, cy - by + 7], [cx + bx, cy + by + 7]], 7, '#8A5A1E', { tex: 0.2, taper: false });
  strokeG(ctx, [[cx - bx, cy - by - 6], [cx + bx, cy + by - 6]], 5, '#E2B55A', { tex: 0.2, taper: false });
  fillG(ctx, rough(ellipsePts(cx, cy, 20, 20, 16), { amp: 0.6, seed: 7042 }), '#D9A441', { tex: 0.2 });
  [[cx - bx, cy - by], [cx + bx, cy + by]].forEach(([ex, ey], i) => {
    const py = ey + chain;
    strokeG(ctx, [[ex, ey], [ex - pan * 0.78, py]], 3.5, '#8A5A1E', { tex: 0, taper: false });
    strokeG(ctx, [[ex, ey], [ex + pan * 0.78, py]], 3.5, '#8A5A1E', { tex: 0, taper: false });
    fillG(ctx, rough(ellipsePts(ex, ey, 14, 14, 12), { amp: 0.4, seed: 706 + i }), '#D9A441', { tex: 0 });
    fillG(ctx, rough(crPts([[ex - pan, py], [ex - pan * 0.6, py + 56], [ex + pan * 0.6, py + 56], [ex + pan, py]], true, 6), { amp: 1, seed: 708 + i }), '#C38F3A', { tex: 0.4, scale: 0.35 });
    fillG(ctx, rough(crPts([[ex - pan * 0.9, py + 10], [ex - pan * 0.55, py + 50], [ex - pan * 0.1, py + 54], [ex - pan * 0.5, py + 14]], true, 4), { amp: 0.6, seed: 7081 + i }), '#8A5A1E', { tex: 0.3, alpha: 0.6 });
    fillG(ctx, rough(rectPts(ex - pan - 4, py - 7, pan * 2 + 8, 14, 7), { amp: 0.8, seed: 710 + i }), '#E2B55A', { tex: 0.3 });
    if (i === 0) drawFruit(ctx, ex, py - 76, 70, { glow: 1, seed: 3, t, ring: 0.9 });
    else {
      const R = rng(720);
      for (let d = 0; d < 46; d++) { const dx = (R() - 0.5) * 120, dy = -R() * 40 * (1 - Math.abs(dx) / 64); fillG(ctx, rough(ellipsePts(ex + dx, py - 12 + dy, 7 + R() * 5, 5 + R() * 4, 8), { amp: 0.4, seed: 730 + d }), R() < 0.5 ? '#7E776F' : '#9A938C', { tex: 0 }); }
    }
  });
  ctx.restore();
}

// ------------------------------------------------------------------ close-up in the garden of the hereafter (shots F–G)
const CU = { stalk: [590, 640], fruit: [560, 860], r: 150 };
function drawLeafBig(ctx, x, y, L, a, seed, c1 = '#4C8A4F', c2 = '#2F6A45', c3 = '#8DBE6E') {
  const Wd = L * 0.42;
  const tr = (pts) => pts.map(([px, py]) => [x + px * Math.cos(a) - py * Math.sin(a), y + px * Math.sin(a) + py * Math.cos(a)]);
  fillG(ctx, rough(crPts(tr([[0, 0], [L * 0.3, -Wd * 0.5], [L * 0.75, -Wd * 0.34], [L, 0], [L * 0.75, Wd * 0.34], [L * 0.3, Wd * 0.5]]), true, 5), { amp: 1, seed }), c1, { tex: 0.45, dir: a, scale: 0.35 });
  fillG(ctx, rough(crPts(tr([[0, 0], [L * 0.3, Wd * 0.5], [L * 0.75, Wd * 0.34], [L, 0], [L * 0.6, Wd * 0.05], [L * 0.2, Wd * 0.04]]), true, 5), { amp: 0.8, seed: seed + 1 }), c2, { tex: 0.4, dir: a, scale: 0.35 });
  fillG(ctx, rough(crPts(tr([[L * 0.25, -Wd * 0.12], [L * 0.45, -Wd * 0.32], [L * 0.72, -Wd * 0.22], [L * 0.6, -Wd * 0.08]]), true, 4), { amp: 0.6, seed: seed + 2 }), c3, { tex: 0.35, dir: a, scale: 0.3, alpha: 0.85 });
  strokeG(ctx, tr([[2, 0], [L * 0.92, 0]]), 3, '#2A5A3A', { tex: 0, taper: true });
}
function cuBackground() {
  return sprite('cu_bg2', W, H, (g) => {
    [['#F7E6C2', 0], ['#F4DCAE', 420], ['#F1D29E', 900], ['#EDC795', 1400]].forEach(([c, y], i, A) => { const p = new Path2D(); p.rect(0, y, W, (A[i + 1] ? A[i + 1][1] : H) - y + 2); fillG(g, p, c, { tex: 0.3, kind: 'dabs', scale: 0.9 }); });
    ringHalo(g, 600, 820, 520, ['#F3DBA8', '#F7E6BF', '#FAF0D8'], { seed: 1700, amp: 3, spread: 1.0 });
    // opaque, simplified leaf masses far behind (two tones, unions)
    const R = rng(1701);
    const masses = [[-40, 260, 230], [80, 520, 180], [-60, 1180, 260], [60, 1560, 220], [1100, 980, 250], [1080, 1420, 230], [980, 1800, 260], [-20, 1880, 220]];
    const u1 = new Path2D(), u2 = new Path2D();
    masses.forEach(([x, y, r], i) => { toPath(roughen(ellipsePts(x, y, r, r * 0.86, 40), { amp: 3, seed: 1710 + i }), true, u1); toPath(roughen(ellipsePts(x + r * 0.2, y - r * 0.2, r * 0.7, r * 0.6, 34), { amp: 2.5, seed: 1720 + i }), true, u2); });
    fillG(g, u1, '#B5C188', { tex: 0.4, dir: -0.6, scale: 0.6 });
    fillG(g, u2, '#C9D29A', { tex: 0.4, dir: -0.6, scale: 0.6 });
    [[150, 640, 34], [960, 1240, 40], [120, 1460, 30]].forEach(([x, y, r], i) => { fillG(g, rough(ellipsePts(x, y, r, r, 20), { amp: 1.2, seed: 1730 + i }), '#E9B77E', { tex: 0.2 }); fillG(g, rough(ellipsePts(x + r * 0.2, y - r * 0.2, r * 0.6, r * 0.55, 16), { amp: 1, seed: 1733 + i }), '#F1C995', { tex: 0.2 }); });
  });
}
function cuBranch(ctx, t, layer) {
  const sw = Math.sin(t * 0.9) * 6;
  const br = crPts([[1240, 120], [1010, 300], [800, 470], [CU.stalk[0] + sw * 0.3, CU.stalk[1]]], false, 14);
  if (layer === 'back') {
    [[[700, 600], 250, 2.35], [[640, 690], 230, 1.75], [[760, 640], 240, 0.55], [[520, 640], 210, -2.7]].forEach(([[x, y], L, a], i) => drawLeafBig(ctx, x + sw * 0.4, y, L, a + Math.sin(t * 1.0 + i) * 0.03, 1820 + i * 5, '#3F7A45', '#285A36', '#6FA65A'));
    strokeG(ctx, br, (u) => lerp(70, 24, u), '#7A5B45', { tex: 0.45, taper: false, seed: 1750 });
    strokeG(ctx, br.map(([x, y]) => [x + 5, y + 14]), (u) => lerp(24, 8, u), '#5C4334', { tex: 0.3, taper: false, seed: 1751 });
    strokeG(ctx, br.map(([x, y]) => [x - 3, y - 16]), (u) => lerp(14, 4, u), '#A3836A', { tex: 0.3, taper: false, seed: 1752, alpha: 0.8 });
    [[0.1, 260, -2.4], [0.18, 280, 0.65], [0.3, 250, -2.05], [0.42, 270, 0.95], [0.55, 240, -1.8], [0.66, 230, 1.25]].forEach(([u, L, a], i) => { const [x, y] = br[Math.floor(u * (br.length - 1))]; drawLeafBig(ctx, x, y, L, a + Math.sin(t * 1.1 + i) * 0.04, 1760 + i * 5); });
  } else {
    [[[CU.stalk[0] + 6, CU.stalk[1] + 10], 200, 0.35], [[CU.stalk[0] - 4, CU.stalk[1] + 6], 190, 2.75]].forEach(([[x, y], L, a], i) => drawLeafBig(ctx, x + sw * 0.3, y, L, a + Math.sin(t * 1.2 + i) * 0.04, 1850 + i * 5));
  }
  return [CU.stalk[0] + sw * 0.3, CU.stalk[1]];
}
// hand: palm (behind the fruit) and fingers + thumb (in front)
function cuHand(ctx, t, c0, c1, part) {
  const u = invlerp(c0, c1, t); if (u <= 0 || u >= 1) return null;
  const reach = E.inOutCubic(invlerp(0, 0.45, u)), pull = E.inOutCubic(invlerp(0.56, 1, u));
  const ang = -0.82, ca = Math.cos(ang), sa = Math.sin(ang), HS = 1.6;
  const tgt = [CU.fruit[0] - 132 * HS * ca - 30, CU.fruit[1] - 132 * HS * sa + 80];
  const wx = lerp(-360, tgt[0], reach) - pull * 760, wy = lerp(2000, tgt[1], reach) + pull * 700;
  const closed = E.inOutSine(clamp((u - 0.4) * 6));
  const T2 = (pts) => pts.map(([x0, y0]) => { const x = x0 * HS, y = y0 * HS; return [wx + x * ca - y * sa, wy + x * sa + y * ca]; });
  const at = T2([[150, -4]])[0];
  if (part === 'probe') return { holding: u > 0.5, at };
  if (part === 'back') {
    fillG(ctx, rough(T2([[-520, -64], [-10, -58], [12, -50], [14, 50], [-10, 58], [-520, 64]]), { amp: 1.2, seed: 1790 }), P.shirt, { tex: 0.45, dir: ang, scale: 0.45 });
    fillG(ctx, rough(T2([[-520, 22], [-10, 24], [12, 50], [-10, 58], [-520, 64]]), { amp: 1, seed: 1791 }), P.shirtShade, { tex: 0.35, dir: ang, scale: 0.45, alpha: 0.85 });
    fillG(ctx, rough(T2([[-30, -60], [12, -52], [14, 52], [-30, 60]]), { amp: 0.8, seed: 1792 }), '#E6DBC4', { tex: 0.3, dir: ang + Math.PI / 2 });
    // palm & back of the hand
    fillG(ctx, rough(crPts(T2([[0, -40], [50, -46], [100, -44], [118, -20], [116, 24], [96, 40], [50, 44], [0, 40]]), true, 5), { amp: 1, seed: 1793 }), P.skin, { tex: 0.4, dir: ang, scale: 0.35 });
    fillG(ctx, rough(crPts(T2([[10, 18], [60, 30], [100, 34], [112, 22], [70, 40], [10, 40]]), true, 4), { amp: 0.6, seed: 1794 }), P.skinShade, { tex: 0.3, alpha: 0.7 });
    return { holding: u > 0.5, at };
  }
  // open fingers (approach) — fade out as the hand closes
  const openA = 1 - clamp((closed - 0.25) / 0.5);
  if (openA > 0.01) {
    ctx.save(); ctx.globalAlpha *= openA;
    for (let f = 0; f < 4; f++) {
      const off = -32 + f * 17, L1 = 70 - Math.abs(f - 1.2) * 8;
      const pts = [[108, off], [108 + L1 * 0.55, off - 2], [108 + L1, off - 4]];
      strokeG(ctx, T2(pts), 22 * HS * 0.62, f % 2 ? P.skin : '#D6A07A', { tex: 0.3, taper: false, seed: 1795 + f });
      const tip = T2([pts[2]])[0]; fillG(ctx, rough(ellipsePts(tip[0], tip[1], 7 * HS, 7 * HS, 12), { amp: 0.4, seed: 1799 + f }), f % 2 ? P.skin : '#D6A07A', { tex: 0 });
    }
    ctx.restore();
  }
  // closed: four fingers wrapped around the lower-left of the fruit as one opaque band with finger grooves
  const fistA = clamp((closed - 0.25) / 0.5);
  if (fistA > 0.01) {
    const c = at, r = CU.r;
    const a0 = 1.95, a1 = 3.55; // canvas angles (down = +pi/2): lower-left arc
    const band = [];
    for (let i = 0; i <= 24; i++) { const a = lerp(a0, a1, i / 24); band.push([c[0] + Math.cos(a) * r * 1.06, c[1] + Math.sin(a) * r * 1.06]); }
    for (let i = 24; i >= 0; i--) { const a = lerp(a0, a1, i / 24); const k = 0.62 + 0.05 * Math.sin(i * 0.9); band.push([c[0] + Math.cos(a) * r * k, c[1] + Math.sin(a) * r * k]); }
    ctx.save(); ctx.globalAlpha *= fistA;
    fillG(ctx, rough(band, { amp: 1, seed: 1810 }), P.skin, { tex: 0.35, dir: 2.7, scale: 0.35 });
    // knuckle shade along the outer rim and three finger grooves
    const rim = []; for (let i = 0; i <= 20; i++) { const a = lerp(a0, a1, i / 20); rim.push([c[0] + Math.cos(a) * r * 1.0, c[1] + Math.sin(a) * r * 1.0]); }
    strokeG(ctx, rim, 12, P.skinShade, { tex: 0.2, taper: true, alpha: 0.7 });
    for (let g = 1; g <= 3; g++) { const a = lerp(a0, a1, g / 4); strokeG(ctx, [[c[0] + Math.cos(a) * r * 1.04, c[1] + Math.sin(a) * r * 1.04], [c[0] + Math.cos(a) * r * 0.7, c[1] + Math.sin(a) * r * 0.7]], 4, '#A9724F', { tex: 0, taper: true, alpha: 0.8 }); }
    // fingertips peeking on the fruit face
    for (let g = 0; g < 4; g++) { const a = lerp(a0, a1, (g + 0.5) / 4); fillG(ctx, rough(ellipsePts(c[0] + Math.cos(a) * r * 0.64, c[1] + Math.sin(a) * r * 0.64, 15, 12, 12, a), { amp: 0.5, seed: 1820 + g }), g % 2 ? P.skin : '#D6A07A', { tex: 0.2 }); }
    ctx.restore();
  }
  // thumb (from the base of the palm, wrapping the near side)
  const th = [[40, 38], [86 + closed * 12, 66 - closed * 4], [122 + closed * 20, 66 - closed * 34]];
  strokeG(ctx, T2(th), 26 * HS * 0.62, '#C68D66', { tex: 0.3, taper: false, seed: 1800 });
  const ttip = T2([th[2]])[0]; fillG(ctx, rough(ellipsePts(ttip[0], ttip[1], 8 * HS, 8 * HS, 12), { amp: 0.4, seed: 1801 }), '#C68D66', { tex: 0 });
  return { holding: u > 0.5, at };
}
const CYCLES = [[T.kopardikca - 0.1, T.kopardikca + 0.7], [27.94, 28.64]];
function drawCloseup(ctx, t, zExtra = 1) {
  ctx.drawImage(cuBackground(), 0, 0);
  const z = (lerp(1.0, 1.08, E.inOutSine(invlerp(24.9, 31.4, t))) + 0.05 * E.inOutCubic(invlerp(T.baki - 0.1, T.baki + 1.4, t))) * zExtra;
  ctx.save(); ctx.translate(CU.fruit[0], CU.fruit[1]); ctx.scale(z, z); ctx.translate(-CU.fruit[0], -CU.fruit[1]);
  {
    const ringK0 = E.inOutCubic(invlerp(T.baki - 0.05, T.baki + 1.0, t));
    if (ringK0 > 0.01) ringHalo(ctx, CU.fruit[0], CU.fruit[1], CU.r * 2.15 * 1.18, ['#F4D592', '#F9E6B8'], { seed: 410, amp: 1.5, spread: 1.0, alpha: 0.35 * ringK0 });
    ringHalo(ctx, CU.fruit[0], CU.fruit[1], CU.r * 1.7, ['#F7C66B', '#F9E2AE'], { seed: 300, amp: 1.0, spread: 1.45, alpha: 0.42 * (0.85 + 0.15 * Math.sin(t * 3)) });
  }
  const stalk = cuBranch(ctx, t, 'back');
  let s = 1;
  CYCLES.forEach(([c0, c1]) => { if (invlerp(c0, c1, t) > 0.5 && t < c1 + 0.5) s = Math.min(s, E.outBack(invlerp(c1 - 0.1, c1 + 0.45, t), 1.7)); });
  const [fx, fy] = CU.fruit;
  CYCLES.forEach(([c0, c1]) => cuHand(ctx, t, c0, c1, 'back'));
  if (s > 0.02) {
    strokeG(ctx, [stalk, [lerp(stalk[0], fx, 0.6) + 6, lerp(stalk[1], fy - CU.r * s, 0.6)], [fx + 6, fy - CU.r * s * 0.9]], 14 * Math.max(0.4, s), '#5C4334', { tex: 0, taper: false });
    const ringK = E.inOutCubic(invlerp(T.baki - 0.05, T.baki + 1.0, t));
    drawFruit(ctx, fx, fy, CU.r * s, { glow: 1 + 0.3 * env(t, T.ameli, T.ameli + 1.2, 0.3, 0.6), seed: 0, t, ring: ringK, leaf: false, halo: false });
  }
  cuBranch(ctx, t, 'front');
  CYCLES.forEach(([c0, c1], ci) => { const u = invlerp(c1 + 0.05, c1 + 0.7, t); if (u > 0 && u < 1) for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU + 0.4 + ci; mote(ctx, fx + Math.cos(a) * (CU.r * 1.05 + u * 120), fy + Math.sin(a) * (CU.r * 1.05 + u * 120), 9 * (1 - u), 1 - u, t, 60 + i); } });
  CYCLES.forEach(([c0, c1], ci) => {
    const h = cuHand(ctx, t, c0, c1, 'probe'); if (!h) return;
    if (h.holding) drawFruit(ctx, h.at[0], h.at[1], CU.r * 0.98, { glow: 0.45, seed: 50 + ci, t, leaf: false, halo: false });
    cuHand(ctx, t, c0, c1, 'front');
  });
  ctx.restore();
}

// ------------------------------------------------------------------ big foreground blossoms
function drawFlowerBig(ctx, x, y, s, seed, t) {
  const R = rng(seed); const sw = Math.sin(t * 1.2 + seed) * 5 * s;
  const top = [x + sw, y - 150 * s];
  strokeG(ctx, [[x, y + 40 * s], [x + sw * 0.4, y - 60 * s], top], 7 * s, '#3E6A3A', { tex: 0.3, taper: false });
  [[-1, 0.35], [1, 0.55], [-1, 0.75]].forEach(([side, u], i) => drawLeafBig(ctx, lerp(x, top[0], u), lerp(y + 40 * s, top[1], u), 70 * s, side > 0 ? -0.5 : -2.6, seed + 10 + i * 4, '#3F7A45', '#285A36', '#6FA65A'));
  const pr = 26 * s;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU + R();
    fillG(ctx, rough(ellipsePts(top[0] + Math.cos(a) * pr * 0.75, top[1] + Math.sin(a) * pr * 0.75, pr * 0.78, pr * 0.62, 18, a), { amp: 0.8, seed: seed + 30 + k }), '#FAF5EA', { tex: 0.35, dir: a, scale: 0.3 });
    fillG(ctx, rough(ellipsePts(top[0] + Math.cos(a) * pr * 0.55 - 3, top[1] + Math.sin(a) * pr * 0.55 + 4, pr * 0.4, pr * 0.28, 12, a), { amp: 0.5, seed: seed + 40 + k }), '#D9D2DE', { tex: 0.25, dir: a, alpha: 0.75 });
  }
  fillG(ctx, rough(ellipsePts(top[0], top[1], pr * 0.32, pr * 0.32, 14), { amp: 0.5, seed: seed + 50 }), '#E2A43A', { tex: 0.25 });
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; fillG(ctx, rough(ellipsePts(top[0] + Math.cos(a) * pr * 0.5, top[1] + Math.sin(a) * pr * 0.5, 2.2 * s, 2.2 * s, 6), { amp: 0.2, seed: seed + 60 + k }), '#C8574F', { tex: 0 }); }
}
function drawBudVine(ctx, x, y, s, seed, t) {
  const sw = Math.sin(t * 1.1 + seed) * 6 * s;
  const pts = crPts([[x, y + 40 * s], [x + 8 * s, y - 120 * s], [x - 6 * s + sw * 0.5, y - 240 * s], [x + sw, y - 330 * s]], false, 8);
  strokeG(ctx, pts, 5 * s, '#3E6A3A', { tex: 0.2, taper: false });
  [0.3, 0.5, 0.7, 0.88].forEach((u, i) => { const p = pts[Math.floor(u * (pts.length - 1))]; drawLeafBig(ctx, p[0], p[1], 46 * s, i % 2 ? -0.4 : -2.7, seed + i * 3, '#3F7A45', '#285A36', '#6FA65A'); if (i % 2) fillG(ctx, rough(ellipsePts(p[0] + (i % 2 ? 18 : -18) * s, p[1] - 10 * s, 7 * s, 10 * s, 12), { amp: 0.4, seed: seed + 20 + i }), '#E7A9B0', { tex: 0.2 }); });
}

// ------------------------------------------------------------------ main
export async function init() { stemInit(); buildCam(); }

export function draw(ctx, t) {
  // close-up window with match-zoom dissolves through the fruit
  const cuIn = smooth(invlerp(24.5, 24.75, t)), cuOut = smooth(invlerp(31.62, 31.87, t));
  const cuK = t < 28 ? cuIn : 1 - cuOut;
  const scaleK = smooth(invlerp(34.3, 34.55, t));
  if (cuK < 1 && scaleK < 1) {
    drawWorldWithCuts(ctx, t);
  }
  if (cuK > 0) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = cuK;
    const zx = t < 28 ? lerp(0.82, 1, E.outCubic(invlerp(24.5, 24.85, t))) : lerp(1, 0.86, E.inCubic(invlerp(31.62, 31.9, t)));
    drawCloseup(ctx, t, zx);
    ctx.restore();
  }
  if (scaleK > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const zk = E.inOutCubic(invlerp(35.15, 35.6, t));
    ctx.save(); ctx.globalAlpha = 1;
    if (scaleK < 1) { ctx.globalAlpha = scaleK; }
    if (zk > 0) { const [fxp, fyp] = scaleFruitPos(t); const sc = 1 + zk * 3; ctx.translate(fxp + (540 - fxp) * zk, fyp + (900 - fyp) * zk); ctx.scale(sc, sc); ctx.translate(-fxp, -fyp); }
    drawScale(ctx, t, 1);
    ctx.restore();
    const fl = smooth(invlerp(35.3, 35.58, t));
    if (fl > 0) { ctx.save(); ctx.globalAlpha = fl; const r = new Path2D(); r.rect(0, 0, W, H); fillG(ctx, r, FLOOD, { tex: 0.25, kind: 'dabs' }); ctx.restore(); }
  }
}
let CUTBUF = null;
function drawWorldWithCuts(ctx, t) {
  drawWorld(ctx, t, camWorld(t));
  for (const [tc, d] of CUTS) {
    if (t >= tc && t < tc + d) {
      if (!CUTBUF) CUTBUF = new OffscreenCanvas(W, H);
      const g = CUTBUF.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
      drawWorld(g, t, camWorld(tc - 0.0002));
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - smooth((t - tc) / d); ctx.drawImage(CUTBUF, 0, 0); ctx.restore();
    }
  }
}

function drawWorld(ctx, t, cam) {
  applyCam(ctx, cam);
  const hw = W / 2 / cam.z, hh = H / 2 / cam.z;
  const x0 = cam.x - hw - 20, x1 = cam.x + hw + 20, y0 = cam.y - hh - 20, y1 = cam.y + hh + 20;
  WE.drawSky(ctx, x0, x1, y0, y1);
  if (y0 < -2600) { WE.drawAhiretBackdrop(ctx, x0, x1, t); WE.drawCloudBank(ctx, x0, x1, MOUND[1] + 20, t); }
  if (y0 < -1500 && y1 > -2900) WE.drawBerzah(ctx, x0, x1, t, cam.y);
  if (y1 > -1500) {
    ringHalo(ctx, SUN[0], SUN[1], 150, ['#6E9DB4', '#9CC0C6', '#E6DCB4', '#F4E6B4'], { spread: 1.15, seed: 4 });
    const cd = t * 6;
    WE.drawCloud(ctx, 700 + cd, -940, 360, 110, 11); WE.drawCloud(ctx, 1020 + cd * 0.7, -620, 280, 90, 12); WE.drawCloud(ctx, 110 + cd * 0.5, -520, 210, 66, 13);
    if (cam.z < 0.8) { WE.drawCloud(ctx, -560 + cd, -1260, 460, 130, 14); WE.drawCloud(ctx, 1640 + cd, -980, 330, 100, 15); WE.drawCloud(ctx, -260 + cd, -760, 260, 80, 16); WE.drawCloud(ctx, 1900 + cd, -560, 420, 120, 17); }
    WE.drawHills(ctx, x0, x1, cam.y, t);
    WE.drawGround(ctx, x0, x1);
  }
  if (t > T.hikmet - 0.1 && t < T.hizmet + 1.0) drawHikmetDiagram(ctx, t);
  drawStem(ctx, t);
  if (y0 < -2600) { WE.drawGardenMound(ctx, MOUND[0], MOUND[1], 400, t, 1); drawTree(ctx, t); WE.drawMoundFrontClouds(ctx, MOUND[0], MOUND[1], 400, t); }
  if (y1 > -1500) {
    WE.drawSapling(ctx, SAP[0], SAP[1], E.outBackSoft(invlerp(T.hikmet + 0.35, T.hikmet + 1.1, t)) * 0.6 + E.outBackSoft(invlerp(3.5, 4.3, t)) * 0.4, t);
    drawSaplingSparkles(ctx, t);
    if (t > 9) drawWateringCan(ctx, CAN_REST[0], CAN_REST[1], 0, 0.95);
    if (t > 11.28 && t < 12.4) mote(ctx, SEED[0], SEED[1] - 4, 9, env(t, 11.28, 12.4, 0.12, 0.3), t, 1);
    if (t > 11.8 && t < 12.2) { const u = invlerp(11.8, 12.2, t); for (let i = 0; i < 5; i++) { const a = -Math.PI * (0.2 + 0.15 * i); fillG(ctx, rough(ellipsePts(SEED[0] + Math.cos(a) * u * 30, SEED[1] - 6 + Math.sin(a) * u * 22, 3, 3, 8), { amp: 0.2, seed: 1900 + i }), '#6B4E3A', { tex: 0, alpha: 1 - u }); } }
    drawManAndProps(ctx, t);
    WE.drawGrassTufts(ctx, x0, x1, t, 34, 30, 40, 1);
    const R = rng(77);
    for (let i = 0; i < 10; i++) { const fx = lerp(x0 + 30, x1 - 30, R()); if (fx > 430 && fx < 1000) continue; WE.drawFlowerSmall(ctx, fx, 60 + R() * 70, 1.1, R() < 0.6 ? '#FBF3E4' : '#F2C7C0', '#E8B33E', 780 + i, t); }
    const R2 = rng(91);
    for (let i = 0; i < 10; i++) {
      const fx = -160 + i * 150 + R2() * 70, fy = 520 + (R2() - 0.5) * 220, sc = 0.8 + R2() * 1.0;
      if (i % 4 === 1) drawBudVine(ctx, fx, fy + 40, 1.2 + R2() * 0.4, 1950 + i, t); else drawFlowerBig(ctx, fx, fy, sc, 1800 + i * 13, t);
    }
  }
  drawRisingRewards(ctx, t, cam);
  drawHoverAndFall(ctx, t);
  const sadK = smooth(invlerp(T.mahzunane, T.mahzunane + 0.9, t)) * (1 - smooth(invlerp(23.9, 24.5, t)));
  if (sadK > 0) {
    const m = ctx.getTransform();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.28 * sadK; ctx.fillStyle = '#8FA3C4'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.setTransform(m);
    const F = fruitIn(jointsAt(t)); drawFruit(ctx, F[0], F[1], 25, { glow: 0.8, seed: 21, t, haloA: 0.22, haloR: 1.45 });
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawHikmetDiagram(ctx, t) {
  const k = env(t, T.hikmet - 0.05, T.hizmet + 0.95, 0.45, 0.5);
  if (k <= 0) return;
  const plant = [SAP[0], SAP[1] - 170], cloud = [1020 + t * 6 * 0.7, -600], soil = [SAP[0] + 40, SAP[1] + 4];
  const path = (a, b, c) => bezPts([[a, [lerp(a[0], b[0], 0.3) + c[0], lerp(a[1], b[1], 0.3) + c[1]], [lerp(a[0], b[0], 0.7) + c[0], lerp(a[1], b[1], 0.7) + c[1]], b]], 60);
  const dots = (pts, prog, seed) => {
    const n = Math.floor(pts.length * prog);
    for (let i = 0; i < n; i += 4) { const p = pts[i]; fillG(ctx, rough(ellipsePts(p[0], p[1], 6.5, 6.5, 10), { amp: 0.4, seed: seed + i }), '#C99A35', { tex: 0, alpha: k }); fillG(ctx, rough(ellipsePts(p[0] - 1, p[1] - 1, 4.5, 4.5, 10), { amp: 0.3, seed: seed + i + 1 }), '#F7D57A', { tex: 0, alpha: k }); }
    if (prog >= 1) { const u = ((t - T.hikmet) * 0.9) % 1; const p = pts[Math.floor(u * (pts.length - 1))]; mote(ctx, p[0], p[1], 9, k, t, seed); }
  };
  const p1 = E.inOutCubic(invlerp(T.hikmet, T.hikmet + 0.7, t)), p2 = E.inOutCubic(invlerp(T.hikmet + 0.3, T.hikmet + 1.0, t));
  dots(path(SUN, plant, [60, -40]), p1, 1);
  dots(path(cloud, soil, [60, 20]), p2, 2);
  const rk = env(t, T.hikmet + 0.2, T.hizmet + 0.4, 0.3, 0.4);
  if (rk > 0) { const R = rng(600); for (let i = 0; i < 22; i++) { const u = (t * 1.6 + R()) % 1; const x = cloud[0] - 110 + R() * 200, y = cloud[1] + 20 + u * 300; strokeG(ctx, [[x, y], [x - 4, y + 22]], 5, '#DDEAF2', { tex: 0, alpha: rk * (1 - u) }); } }
  mote(ctx, SUN[0], SUN[1], 12, k * p1, t, 3);
  // the sapling answers each arrival
  const glowK = env(t, T.hikmet + 0.7, T.hikmet + 1.6, 0.15, 0.5);
  if (glowK > 0) ringHalo(ctx, plant[0], plant[1] + 60, 90, ['#F7E3A0', '#FBF0CC'], { seed: 610, amp: 1, alpha: 0.45 * glowK });
}
// sparkles left by the water on the sapling: they become the rising deeds
const SPARKS = (() => { const R = rng(850); return Array.from({ length: 12 }, (_, i) => ({ x: SAP[0] - 46 + R() * 92, y: -40 - R() * 170, d: R() * 0.5, ph: R() * TAU, scr: 520 + R() * 640, mx: 440 + R() * 320, settle: [MOUND[0] - 230 + R() * 460, MOUND[1] - 20 - R() * 40], ds: R() * 0.2, berzah: i % 4 === 1 })); })();
function drawSaplingSparkles(ctx, t) {
  if (t < 3.4 || t > T.amal1 + 0.3) return;
  SPARKS.forEach((s, i) => { const a = smooth(invlerp(3.4 + s.d * 0.8, 3.7 + s.d * 0.8, t)) * (1 - smooth(invlerp(T.amal1 - 0.2, T.amal1 + 0.2, t))); mote(ctx, s.x, s.y, 5, a * (0.75 + 0.25 * Math.sin(t * 4 + s.ph)), t, 700 + i); });
}
function drawRisingRewards(ctx, t, cam) {
  if (t < T.ucret - 0.05 || t > 10.35) return;
  const pop = (t0) => E.outBackSoft(invlerp(t0, t0 + 0.4, t));
  const pk = pop(T.ucret), gk = pop(T.mukafat);
  const rise = E.inOutCubic(invlerp(T.degil - 0.1, T.degil + 1.0, t));
  const dip = Math.sin(Math.PI * clamp(invlerp(T.degil - 0.15, T.degil + 0.1, t))) * 10;
  const settle = E.inOutCubic(invlerp(9.5, 10.2, t)), fade = 1 - smooth(invlerp(9.95, 10.3, t));
  const pos = (hx, hy, scr, i) => {
    let x = hx, y = hy + dip + Math.sin(t * 2 + i) * 5;
    if (rise > 0) { const yScreen = cam.y + (scr - H / 2) / cam.z; y = lerp(y, Math.min(y, yScreen), rise); }
    return [lerp(x, MOUND[0] + (i ? 80 : -80), settle), lerp(y, MOUND[1] - 50, settle)];
  };
  const P1 = pos(SAP[0] - 20, -400, 720, 0), P2 = pos(SAP[0] + 100, -470, 660, 1);
  ctx.save(); ctx.globalAlpha *= fade;
  [[P1, pk, coinPouch], [P2, gk, giftBox]].forEach(([[x, y], k, fn], i) => {
    if (k <= 0.01) return;
    ctx.save(); ctx.globalAlpha *= clamp(k * 1.6); ctx.translate(x, y); ctx.scale(k * 1.1, k * 1.1); fn(ctx); ctx.restore();
    const u = invlerp(i ? T.mukafat : T.ucret, (i ? T.mukafat : T.ucret) + 0.5, t); if (u > 0 && u < 1) for (let m = 0; m < 6; m++) { const a = (m / 6) * TAU; mote(ctx, x + Math.cos(a) * (40 + u * 40), y + Math.sin(a) * (40 + u * 40), 4 * (1 - u), 1 - u, t, 980 + m); }
  });
  ctx.restore();
  // the deeds: sparkles on the sapling rise with the camera; some stay in the barzakh as stars, the rest settle in the garden
  const mk = smooth(invlerp(T.amal1 - 0.3, T.amal1 + 0.2, t)) * fade;
  if (mk <= 0) return;
  SPARKS.forEach((s, i) => {
    const u = E.inOutSine(invlerp(T.amal1 - 0.3 + s.d, T.amal1 + 0.9 + s.d, t));
    let x = lerp(s.x, s.mx, u) + Math.sin(t * 1.3 + s.ph) * 16, y = lerp(s.y, cam.y + (s.scr - H / 2) / cam.z, u);
    if (s.berzah && t > T.berzah1) { const b = E.inOutSine(invlerp(T.berzah1, T.berzah1 + 0.6, t)); y = lerp(y, -2200 - i * 40, b); }
    const st = E.inOutCubic(invlerp(9.45 + s.ds, 10.15, t));
    if (!s.berzah) { x = lerp(x, s.settle[0], st); y = lerp(y, s.settle[1], st); }
    mote(ctx, x, y, 6 + (i % 3) * 1.5, mk, t, i);
  });
}
function drawHoverAndFall(ctx, t) {
  // "dünyada … istememek": a fruit comes within reach; declined, it rises again. "verilse de": it is given anyway.
  const HOV = [MAN_X2 + 255, hipY() - 0.37 * SIZE];
  if (t > T.dunyada - 0.2 && t < T.verilse) {
    const dn = E.outCubic(invlerp(T.dunyada - 0.2, T.dunyada + 0.4, t)), up = E.inOutCubic(invlerp(T.gerektir - 0.15, T.gerektir + 0.7, t));
    const y = lerp(HOV[1] - 700, HOV[1], dn) - up * 900 + Math.sin(t * 2.2) * 6;
    drawFruit(ctx, HOV[0], y, 25, { glow: 1, seed: 21, t });
  }
  const u = invlerp(T.verilse - 0.05, T.verilse + 0.65, t);
  if (u > 0 && u < 1) {
    const F = fruitIn(jointsAt(T.verilse + 0.65)), e = E.inOutSine(u);
    const x = lerp(F[0] + 30, F[0], e), y = lerp(F[1] - 800, F[1], e);
    for (let i = 1; i < 6; i++) { const uu = Math.max(0, e - i * 0.05); mote(ctx, lerp(F[0] + 30, F[0], uu), lerp(F[1] - 800, F[1], uu) - 10, 5 - i * 0.6, 0.5 * (1 - i / 6), t, 40 + i); }
    drawFruit(ctx, x, y, 25, { glow: 1, seed: 21, t });
  }
}

function drawManAndProps(ctx, t) {
  const st = manState(t);
  const j = drawMan(ctx, st.pose, { size: SIZE });
  if (st.can) {
    const ang = -0.05 + 0.58 * E.inOutQuad(invlerp(3.3, 3.56, t)) - 0.58 * E.inOutQuad(invlerp(4.1, 4.4, t));
    const tip = drawWateringCan(ctx, j.wristN[0] + 4, j.wristN[1] - 2, ang, 0.95);
    drawWater(ctx, tip, [SAP[0] - 22, SAP[1] - 26], env(t, 3.48, 4.16, 0.08, 0.15), t);
  }
  if (st.seedInHand) mote(ctx, j.handN[0], j.handN[1], 8, smooth(invlerp(10.75, 10.95, t)), t, 2);
  // ghost of joy ("memnunane … değil")
  const gk = env(t, T.memnunane - 0.05, T.degil2 + 0.25, 0.25, 0.3);
  if (gk > 0) {
    const jump = Math.max(0, Math.sin(invlerp(T.memnunane, T.memnunane + 0.5, t) * Math.PI)) * 60 + Math.max(0, Math.sin(invlerp(T.memnunane + 0.5, T.memnunane + 0.85, t) * Math.PI)) * 26;
    drawGhost(ctx, { ...POSE.joy, ...legsAt(MAN_X2 - 230), hip: [MAN_X2 - 230, hipY() - jump] }, gk);
  }
  // the given fruit in his hands (until the close-up and again after it)
  if (t > T.verilse + 0.62 && !(t > T.mahzunane && t < 24.5) && !(t > 24.75 && t < 31.62)) {
    const F = fruitIn(j);
    drawFruit(ctx, F[0], F[1], 25, { glow: 0.85, seed: 21, t, haloA: 0.22, haloR: 1.45 });
  }
  // the hypothetical self eats its fruit here ("fâni bir surette yemek") — and it crumbles to dust
  const ek = env(t, 32.25, 34.42, 0.35, 0.18);
  if (ek > 0) {
    const gx = MAN_X2 - 255;
    const mouth = [gx + 0.112 * SIZE, hipY() - 0.345 * SIZE];
    const lift = E.inOutCubic(invlerp(33.18, 33.42, t)) * (1 - E.inOutCubic(invlerp(33.95, 34.15, t)));
    const cupT = [gx + 0.17 * SIZE, hipY() - 0.21 * SIZE];
    const tg = [lerp(cupT[0], mouth[0], lift), lerp(cupT[1], mouth[1], lift)];
    const pose = { ...STAND, neck: lerp(0.15, -0.05, lift), head: 0.0, armN: { ik: [tg[0] - 6, tg[1] + 26], bend: 1, hand: 'cup' }, armF: { ik: [tg[0] + 6, tg[1] + 30], bend: 1, hand: 'cup' }, ...legsAt(gx), hip: [gx, hipY()] };
    drawGhost(ctx, pose, ek);
    const dull = smooth(invlerp(T.fani, T.fani + 0.6, t));
    const bites = t > 33.45 ? (t > 33.85 ? 2 : 1) : 0;
    const shrink = 1 - E.inCubic(invlerp(34.0, 34.3, t));
    const fx = tg[0], fy = tg[1];
    drawFruit(ctx, fx, fy, 25 * shrink, { glow: 0.7 * (1 - dull), dull, bites, seed: 22, t, leaf: bites === 0, alpha: 0.92 });
    [33.45, 33.85].forEach((tb, b) => { const u = invlerp(tb, tb + 0.5, t); if (u > 0 && u < 1) { const R = rng(800 + b); for (let i = 0; i < 6; i++) { const a = -0.4 + R() * 1.4; fillG(ctx, rough(ellipsePts(fx + 18 + Math.cos(a) * u * 40, fy - 6 + Math.sin(a) * u * 30 + u * u * 50, 3, 3, 8), { amp: 0.3, seed: 810 + i }), '#E9A456', { tex: 0, alpha: 1 - u }); } } });
    const cu = invlerp(34.02, 34.45, t);
    if (cu > 0) { const R = rng(820); for (let i = 0; i < 34; i++) { const dx = (R() - 0.5) * 48, vy = 80 + R() * 220; fillG(ctx, rough(ellipsePts(fx + dx + (R() - 0.5) * 20 * cu, fy + vy * cu * cu + 10, 2.8, 2.8, 6), { amp: 0.2, seed: 830 + i }), R() < 0.5 ? '#8A837C' : '#ABA39A', { tex: 0, alpha: 1 - cu * 0.7 }); } }
  }
}
