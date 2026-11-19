// rig.js — a simple, detail-less but correctly proportioned man (profile, facing +x), painted in gouache.
// Body space: units of body height (1 = crown to sole), x forward, y DOWN, origin at hip centre.
import { P, mix, css, fillG, roughen, toPath, lerp, clamp, noise1, TAU, rgb } from './core.js';

export const L = {
  thigh: 0.245, shin: 0.245, ankle: 0.036, torso: 0.29, shoulderDrop: 0.03, neck: 0.04,
  upper: 0.172, fore: 0.148, hand: 0.082,
};
export const LEG = L.thigh + L.shin + L.ankle; // hip height when straight

const COL = {
  skin: P.skin, skinShade: P.skinShade, hair: P.hair,
  shirt: P.shirt, shirtShade: P.shirtShade, vest: P.vest, vestShade: P.vestShade,
  trousers: P.trousers, trousersShade: P.trousersShade, shoe: P.shoe,
};

// ---------------------------------------------------------------- helpers
const dn = (a) => [Math.sin(a), Math.cos(a)]; // limb direction, angle from straight-down, + = forward
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
function capsulePts(a, b, wa, wb, n = 10) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const pts = [];
  // side 1 a→b
  pts.push([a[0] + nx * wa, a[1] + ny * wa]); pts.push([b[0] + nx * wb, b[1] + ny * wb]);
  // cap at b
  for (let i = 1; i < n; i++) { const t = (i / n) * Math.PI; const c = Math.cos(t), s = Math.sin(t); pts.push([b[0] + (nx * c + ux * s) * wb, b[1] + (ny * c + uy * s) * wb]); }
  pts.push([b[0] - nx * wb, b[1] - ny * wb]); pts.push([a[0] - nx * wa, a[1] - ny * wa]);
  for (let i = 1; i < n; i++) { const t = (i / n) * Math.PI; const c = Math.cos(t), s = Math.sin(t); pts.push([a[0] + (-nx * c - ux * s) * wa, a[1] + (-ny * c - uy * s) * wa]); }
  return pts;
}
export function mixPose(a, b, t) {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, t);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => mixPose(v, b[i], t));
  if (a && b && typeof a === 'object') { const o = { ...a }; for (const k of Object.keys(b)) o[k] = k in a ? mixPose(a[k], b[k], t) : b[k]; return o; }
  return t < 0.5 ? a : b;
}
/** two-bone IK in body space. returns [absAngle1, absAngle2] (angles from straight-down, + forward). bend: +1 joint bends forward (elbow), -1 backward (knee) */
export function ik2(root, target, l1, l2, bend = 1) {
  let dx = target[0] - root[0], dy = target[1] - root[1];
  let d = Math.hypot(dx, dy); const maxd = (l1 + l2) * 0.9995; if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
  d = Math.max(d, Math.abs(l1 - l2) + 1e-4);
  const base = Math.atan2(dx, dy); // angle from down, + forward
  const c1 = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const a1 = base - bend * Math.acos(c1); // bend=+1: joint behind the line (elbow), -1: joint ahead (knee)
  const j = add(root, dn(a1), l1);
  const a2 = Math.atan2(target[0] - j[0], target[1] - j[1]);
  return [a1, a2];
}

const wrapPi = (a) => { while (a > Math.PI) a -= TAU; while (a <= -Math.PI) a += TAU; return a; };
/** convert IK arms ({ik:[x,y] world}) to joint angles for this pose (needs pose.hip), so poses can be blended smoothly */
export function resolveArms(pose, size, facing = 1) {
  if (!pose.hip) return pose;
  const out = { ...pose };
  const th = pose.torso ?? 0; const up = [Math.sin(th), -Math.cos(th)], fw = [Math.cos(th), Math.sin(th)];
  const T2B = (p) => [fw[0] * p[0] + up[0] * p[1], fw[1] * p[0] + up[1] * p[1]];
  const breath = 1 + (pose.breath ?? 0) * 0.012;
  const shN = T2B([-0.004, (L.torso - L.shoulderDrop) * breath]), shF = T2B([-0.016, (L.torso - L.shoulderDrop) * breath + 0.004]);
  const [hx, hy] = pose.hip;
  for (const [k, sh] of [['armN', shN], ['armF', shF]]) {
    const a = pose[k]; if (!a || !a.ik) continue;
    const tgt = [(a.ik[0] - hx) / (size * facing), (a.ik[1] - hy) / size];
    const [a1, a2] = ik2(sh, tgt, L.upper, L.fore, a.bend ?? 1);
    out[k] = { sh: wrapPi(a1 - th), el: wrapPi(a2 - a1), wr: a.wr ?? 0, hand: a.hand, palm: a.palm };
  }
  return out;
}

// ---------------------------------------------------------------- default pose
export const STAND = {
  torso: 0.02, neck: 0.04, head: 0.0, breath: 0,
  armN: { sh: -0.06, el: 0.16, wr: 0.05, hand: 'relaxed' },
  armF: { sh: 0.05, el: 0.2, wr: 0.05, hand: 'relaxed' },
  legN: { th: 0.04, kn: 0.04, ft: 0 },
  legF: { th: -0.05, kn: 0.03, ft: 0 },
};

// ---------------------------------------------------------------- hands (hand-local: origin wrist, +x along hand, +y = palm side/forward-normal)
function handPts(kind) {
  const h = L.hand;
  if (kind === 'grip') return [[-0.004, -0.018], [0.03, -0.022], [0.052, -0.012], [0.056, 0.006], [0.046, 0.02], [0.02, 0.024], [0.0, 0.02], [-0.006, 0.0]];
  if (kind === 'open') return [[-0.004, -0.017], [0.035, -0.019], [0.07, -0.014], [h, -0.006], [h + 0.002, 0.004], [0.07, 0.011], [0.04, 0.014], [0.03, 0.028], [0.016, 0.03], [0.008, 0.02], [-0.004, 0.017]];
  if (kind === 'cup') return [[-0.004, -0.017], [0.035, -0.02], [0.062, -0.012], [0.074, 0.004], [0.066, 0.016], [0.045, 0.018], [0.03, 0.03], [0.014, 0.03], [0.004, 0.02], [-0.004, 0.016]];
  // relaxed mitten
  return [[-0.004, -0.017], [0.035, -0.019], [0.064, -0.013], [0.077, -0.002], [0.074, 0.01], [0.055, 0.016], [0.034, 0.018], [0.024, 0.027], [0.012, 0.027], [0.004, 0.018], [-0.004, 0.016]];
}

// ---------------------------------------------------------------- head profile (head-local: origin at top of neck, x forward, y DOWN)
const HEAD = [[-0.028, 0.004], [-0.05, -0.04], [-0.048, -0.085], [-0.03, -0.112], [0.0, -0.126], [0.03, -0.119], [0.048, -0.098], [0.056, -0.075], [0.057, -0.064], [0.07, -0.046], [0.059, -0.038], [0.06, -0.028], [0.057, -0.018], [0.055, -0.006], [0.046, 0.006], [0.028, 0.01], [0.018, 0.012]];
const HAIR = [[0.047, -0.098], [0.036, -0.117], [0.006, -0.131], [-0.03, -0.12], [-0.053, -0.087], [-0.055, -0.045], [-0.042, -0.026], [-0.026, -0.04], [-0.012, -0.062], [0.004, -0.08], [0.028, -0.093]];
const BEARD = [[-0.004, -0.058], [0.008, -0.042], [0.026, -0.03], [0.044, -0.03], [0.058, -0.036], [0.063, -0.028], [0.061, -0.013], [0.057, -0.001], [0.048, 0.009], [0.031, 0.014], [0.012, 0.006], [-0.006, -0.02], [-0.01, -0.045]];
const EAR = (() => { const o = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; o.push([-0.012 + Math.cos(a) * 0.009, -0.06 + Math.sin(a) * 0.015]); } return o; })();

// ---------------------------------------------------------------- torso (torso-local: origin hip, x forward, y UP)
const SHIRT = [[-0.058, -0.078], [-0.062, 0.0], [-0.066, 0.08], [-0.058, 0.16], [-0.062, 0.228], [-0.05, 0.272], [-0.024, 0.295], [0.026, 0.292], [0.056, 0.262], [0.07, 0.205], [0.064, 0.135], [0.067, 0.06], [0.07, 0.0], [0.073, -0.072], [0.035, -0.084], [-0.015, -0.084]];
const VEST = [[-0.06, -0.012], [-0.063, 0.0], [-0.067, 0.08], [-0.059, 0.16], [-0.063, 0.228], [-0.051, 0.273], [-0.024, 0.296], [0.004, 0.292], [0.06, 0.172], [0.071, 0.12], [0.066, 0.055], [0.068, -0.012]];
const VEST_SHADE = [[-0.06, -0.012], [-0.063, 0.0], [-0.067, 0.08], [-0.059, 0.16], [-0.063, 0.228], [-0.051, 0.273], [-0.03, 0.29], [-0.036, 0.23], [-0.04, 0.12], [-0.038, 0.02], [-0.034, -0.012]];
const COLLAR = [[-0.022, 0.285], [0.03, 0.283], [0.034, 0.3], [-0.018, 0.305]];

/**
 * Draw the man. pose: STAND-like object + {hip:[x,y] world px}. o: {size (px height), facing (+1 right / -1 left), alpha, ghost, light (-1..1), col overrides, seed}
 * returns joints in world px.
 */
export function drawMan(ctx, pose, o = {}) {
  const size = o.size ?? 600, f = o.facing ?? 1, seed = o.seed ?? 7;
  const C = { ...COL, ...(o.col || {}) };
  const [hx, hy] = pose.hip;
  const W2 = (p) => [hx + p[0] * size * f, hy + p[1] * size]; // body → world
  const th = pose.torso ?? 0;
  const up = [Math.sin(th), -Math.cos(th)], fw = [Math.cos(th), Math.sin(th)];
  const T2B = (p) => [fw[0] * p[0] + up[0] * p[1], fw[1] * p[0] + up[1] * p[1]]; // torso-local (x fwd, y up) → body
  const breath = 1 + (pose.breath ?? 0) * 0.012;

  const hipN = [0.006, 0.004], hipF = [-0.012, -0.002];
  const shoulderN = T2B([-0.004, (L.torso - L.shoulderDrop) * breath]);
  const shoulderF = T2B([-0.016, (L.torso - L.shoulderDrop) * breath + 0.004]);
  const neckBase = T2B([0.004, L.torso * breath]);
  const na = th + (pose.neck ?? 0);
  const neckTop = add(neckBase, [Math.sin(na), -Math.cos(na)], L.neck);
  const ha = na + (pose.head ?? 0);

  // limb solver
  const arm = (a, sh) => {
    let a1, a2;
    if (a.ik) { const tgt = [(a.ik[0] - hx) / (size * f), (a.ik[1] - hy) / size]; [a1, a2] = ik2(sh, tgt, L.upper, L.fore, a.bend ?? 1); }
    else { a1 = th + a.sh; a2 = a1 + a.el; }
    const el = add(sh, dn(a1), L.upper), wr = add(el, dn(a2), L.fore);
    const a3 = a2 + (a.wr ?? 0);
    return { sh, el, wr, a1, a2, a3 };
  };
  const leg = (g, hip) => {
    let a1, a2;
    if (g.ik) { const tgt = [(g.ik[0] - hx) / (size * f), (g.ik[1] - hy) / size - L.ankle]; [a1, a2] = ik2(hip, tgt, L.thigh, L.shin, -1); }
    else { a1 = g.th; a2 = g.th - g.kn; }
    const kn = add(hip, dn(a1), L.thigh), an = add(kn, dn(a2), L.shin);
    return { hip, kn, an, a1, a2, ft: g.ft ?? 0 };
  };
  const aN = arm(pose.armN, shoulderN), aF = arm(pose.armF, shoulderF);
  const gN = leg(pose.legN, hipN), gF = leg(pose.legF, hipF);

  const ghost = o.ghost ? 1 : 0;
  const alpha = o.alpha ?? 1;
  ctx.save();
  if (ghost) { ctx.globalAlpha *= 0.42 * alpha; } else if (alpha < 1) ctx.globalAlpha *= alpha;
  const S = size;
  const rp = (pts, sd, amp = 0.9) => toPath(roughen(pts.map(W2), { amp: amp * (S / 600), freq: 0.04, fine: 0.25, seed: seed + sd, step: 4 }));
  const tex = ghost ? 0.15 : 0.5;
  const far = (c) => css(mix(c, '#1d2430', 0.28));
  const fillP = (path, color, dir, k = tex) => fillG(ctx, path, color, { tex: k, dir: dir * f, scale: 0.28 * (S / 600), tx: seed * 37, ty: seed * 11 });

  // ---------- trousers + shoes
  const drawLeg = (g, isFar, sd) => {
    const cT = isFar ? far(C.trousers) : C.trousers;
    const p = new Path2D();
    p.addPath(rp(capsulePts(g.hip, g.kn, 0.04, 0.032), sd));
    p.addPath(rp(capsulePts(g.kn, g.an, 0.032, 0.026), sd + 1));
    fillP(p, cT, g.a1 + Math.PI / 2);
    // shoe (ankle origin, foot-local x fwd, y down) rotated by ft
    const fa = g.ft;
    const shoe = [[-0.03, -0.012], [0.0, -0.022], [0.04, -0.01], [0.085, 0.004], [0.104, 0.016], [0.106, 0.03], [0.09, L.ankle + 0.002], [-0.03, L.ankle + 0.002], [-0.038, 0.02]];
    const cs = Math.cos(fa), sn = Math.sin(fa);
    const sp = shoe.map(([x, y]) => add(g.an, [x * cs - y * sn, x * sn + y * cs]));
    fillP(rp(sp, sd + 2, 0.6), isFar ? far(C.shoe) : C.shoe, fa, tex * 0.6);
  };
  // ---------- arm (sleeve + hand)
  const drawArm = (a, armPose, isFar, sd) => {
    const cS = isFar ? far(C.shirt) : C.shirt;
    const p = new Path2D();
    p.addPath(rp(capsulePts(a.sh, a.el, 0.036, 0.03), sd));
    p.addPath(rp(capsulePts(a.el, a.wr, 0.03, 0.023), sd + 1));
    fillP(p, cS, a.a1 + Math.PI / 2);
    // underside shade on near sleeve
    if (false) {
      const n1 = [Math.cos(a.a1), -Math.sin(a.a1)];
      const sh = rp([add(a.sh, n1, -0.03), add(a.el, n1, -0.026), add(a.el, n1, -0.012), add(a.sh, n1, -0.012)].map((q) => q), sd + 5, 0.5);
      fillG(ctx, sh, css(C.shirtShade), { tex: 0.3, alpha: 0.7 });
    }
    // hand
    const hp = handPts(armPose.hand || 'relaxed');
    const ang = a.a3; // along the hand: dn(ang) direction
    const ux = Math.sin(ang), uy = Math.cos(ang); // hand forward axis (body space)
    const side = armPose.palm ?? 1; // flips which side the thumb is on
    const nx = -uy * side * -1, ny = ux * side * -1; // normal (forward side)
    const pts = hp.map(([x, y]) => [a.wr[0] + ux * x + nx * y, a.wr[1] + uy * x + ny * y]);
    fillP(rp(pts, sd + 3, 0.5), isFar ? far(C.skin) : C.skin, ang, tex * 0.5);
    return { wrist: a.wr, hand: add(a.wr, [ux, uy], L.hand * 0.6), ang };
  };

  // draw order: far arm, far leg, near leg, torso, neck, head, near arm
  const handF = drawArm(aF, pose.armF, true, 10);
  drawLeg(gF, true, 20);
  drawLeg(gN, false, 30);
  // torso
  const tp = (pts, sd, amp) => rp(pts.map(([x, y]) => T2B([x, y * (y > 0.1 ? breath : 1)])), sd, amp);
  fillP(tp(SHIRT, 40), C.shirt, th + Math.PI / 2);
  fillP(tp(VEST, 41), C.vest, th + Math.PI / 2);
  if (!ghost) fillG(ctx, tp(VEST_SHADE, 42, 0.6), css(C.vestShade), { tex: 0.35, alpha: 0.85, dir: (th + Math.PI / 2) * f, scale: 0.3 });
  fillP(tp(COLLAR, 43, 0.4), C.shirt, 0, tex * 0.5);
  // neck
  fillP(rp(capsulePts(neckBase, neckTop, 0.022, 0.02), 44), C.skin, na);
  // head
  const ca = Math.cos(ha), sa = Math.sin(ha);
  const H2 = (pts) => pts.map(([x, y]) => add(neckTop, [x * ca - y * sa, x * sa + y * ca]));
  fillP(rp(H2(HEAD), 50, 0.6), C.skin, ha, tex * 0.6);
  if (!ghost) fillG(ctx, rp(H2(EAR), 51, 0.3), css(C.skinShade), { tex: 0.2, alpha: 0.9 });
  fillP(rp(H2(BEARD), 52, 0.5), C.hair, ha + 1.2, tex * 0.7);
  fillP(rp(H2(HAIR), 53, 0.6), C.hair, ha + 0.3, tex * 0.7);
  const handN = drawArm(aN, pose.armN, false, 60);
  ctx.restore();

  const Wd = W2;
  return {
    hip: Wd([0, 0]), neck: Wd(neckTop), head: Wd(add(neckTop, [0.6 * sa * 0 + 0.0, -0.065])), headTop: Wd(add(neckTop, [0.0, -0.126])),
    shoulderN: Wd(shoulderN), shoulderF: Wd(shoulderF), chest: Wd(T2B([0.07, 0.2])), back: Wd(T2B([-0.07, 0.2])),
    elbowN: Wd(aN.el), wristN: Wd(handN.wrist), handN: Wd(handN.hand), handAngN: handN.ang,
    elbowF: Wd(aF.el), wristF: Wd(handF.wrist), handF: Wd(handF.hand), handAngF: handF.ang,
    footN: Wd(add(gN.an, [0.04, L.ankle])), footF: Wd(add(gF.an, [0.04, L.ankle])),
    torso: th, size, facing: f,
  };
}

// ---------------------------------------------------------------- walk cycle (IK, feet planted on a ground function)
/**
 * walkPose(d, o): d = distance travelled by the hip (px, along x). o: {size, x0, ground(x)->y, stride (body units), lift, armSwing, lean, load}
 * Returns a pose with hip and IK targets for the feet.
 */
export function walkPose(d, o = {}) {
  const size = o.size ?? 600, f = o.facing ?? 1;
  const stride = (o.stride ?? 0.36) * size; // one step length (px)
  const ground = o.ground || (() => 0);
  const hx = (o.x0 ?? 0) + d * f;
  const cyc = d / (2 * stride);
  const footFor = (off) => {
    const p = ((cyc + off) % 1 + 1) % 1;
    const k = Math.floor(cyc + off);
    // stance [0,0.62): foot fixed at plant position; swing: arc to next
    const st = 0.62;
    const plantX = (kk) => (o.x0 ?? 0) + f * ((kk - off) * 2 * stride + stride * 0.62 + (o.footAhead ?? 0) * size);
    let x, lift = 0, ft = 0;
    if (p < st) { x = plantX(k); const u = p / st; ft = u > 0.7 ? -((u - 0.7) / 0.3) * 0.5 * f * 0 + 0 : 0; ft = u > 0.72 ? ((u - 0.72) / 0.28) * 0.45 : (u < 0.08 ? -(1 - u / 0.08) * 0.18 : 0); }
    else { const u = (p - st) / (1 - st); const e = u * u * (3 - 2 * u); x = lerp(plantX(k), plantX(k + 1), e); lift = Math.sin(Math.PI * u) * (o.lift ?? 0.045) * size; ft = lerp(0.45, -0.15, u); }
    const y = ground(x) - lift;
    return { x, y, ft: ft * 1, p };
  };
  const fN = footFor(0), fF = footFor(0.5);
  const bob = Math.cos(cyc * 2 * TAU) * 0.009 * size;
  const gy = Math.min(ground(hx - 0.1 * size * f), ground(hx + 0.1 * size * f), ground(hx));
  const hy = gy - (LEG * 0.955) * size + bob + (o.crouch ?? 0) * size;
  const swing = (o.armSwing ?? 0.32);
  const s = Math.sin(cyc * TAU);
  const lean = o.lean ?? 0.06;
  return {
    hip: [hx, hy], torso: lean + 0.015 * Math.cos(cyc * 2 * TAU), neck: o.neck ?? 0.02, head: o.head ?? 0.0, breath: 0,
    armN: o.armN || { sh: -s * swing, el: 0.22 + Math.max(0, -s) * 0.25, wr: 0.08, hand: 'relaxed' },
    armF: o.armF || { sh: s * swing, el: 0.22 + Math.max(0, s) * 0.25, wr: 0.08, hand: 'relaxed' },
    legN: { ik: [fN.x, fN.y], ft: fN.ft },
    legF: { ik: [fF.x, fF.y], ft: fF.ft },
  };
}
