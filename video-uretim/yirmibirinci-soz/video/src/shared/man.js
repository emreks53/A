// man.js — THE MAN: one stencil puppet, two skins (front / back), sponge-printed.  Owner: man builder.
// Interface and conventions: see MAN.md (same folder) and INTERFACES.md.
//
//   const man = await makeMan(E);
//   man.draw(ctx, t, { pose, warm = 0, p = 1, hands = null });      // world px, camera already applied
//
// Everything is authored in FIGURE units (= world px, origin at the feet, y up negative) and baked at
// BAKE x that size, so the cut stays razor-sharp at the largest zoom of the film (1.5) and with --ss 2.

const BAKE = 2;                      // sprites are baked at 2x world size and drawn at 1/2
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ geometry (figure units)
export const G = {
  x: 540, feetY: 1200, height: 540,
  hipY: -282, hipX: 23, footX: 35, legLen: 262,          // rigid legs: hip joint -> ankle
  shoulder: [54, -427], shoulderR: 17,                   // shoulder joint (right / screen-right one), cap radius
  L1: 108, L2: 92,                                       // upper arm, forearm (joint to joint)
  R: [17, 14, 11],                                       // arm radii: shoulder, elbow, wrist
  headPivot: [0, -470],                                  // base of the skull; head top = -540, chin = -466
  neckBase: -452, chest: [0, -395], hem: -273,
  stepShoe: 22, stepHips: 10,
};

const HANDS = {
  // outline in the hand frame: X along the hand from the wrist (0,0), +Y = thumb side
  // (hanging arm: +Y points to the body; arm pointing outward: +Y points down). palm = palm centre.
  rest: {
    // relaxed, hanging: the thumb lies along the palm as a gentle bulge on the body side
    palm: [22, 0],
    pts: [[-7, -8.5], [4, -9.6], [16, -10.6], [28, -10.8], [38, -9.6], [45, -6.4], [49, -1.2], [48.6, 4.4], [45, 8.4], [39.4, 10.6], [33.6, 11.6],
      [30, 13.8], [25, 15.5], [18, 15.7], [11, 13.7], [4, 10.6], [-7, 8.5]],
  },
  open: {
    palm: [24, 0],
    pts: [[-7, -9], [4, -11.6], [16, -14.2], [30, -15], [42, -13.6], [49.6, -8.4], [52.5, -0.5], [50.4, 7.4], [44, 12.6], [35.5, 14.4],
      [29.2, 13.6], [30.6, 17.6], [33.6, 22.6], [34.4, 27.4], [31, 30.8], [25.4, 30.2], [19.6, 25.6], [13.6, 19.6], [7.6, 14.4], [1, 11.2], [-7, 9]],
  },
  cupped: {
    // seen from the side, palm up: a thick heel, the thumb standing near the wrist, finger tips curling up at the far end
    palm: [31, -2],
    pts: [[-7, 9], [6, 12.5], [20, 14.6], [34, 13.6], [45, 9.2], [53, 1.6], [57.6, -7.6], [58.2, -15.4], [54.6, -19.6], [49.8, -17.2], [46.6, -10.2],
      [41, -4.8], [33.5, -2.2], [26.4, -2.4], [23.6, -6.4], [22.6, -13.2], [19, -18.6], [13.6, -19], [10, -14.6], [8, -10.2], [2, -9], [-7, -9]],
  },
  closed: {
    palm: [18, 0],
    pts: [[-7, -9], [2, -12.6], [11, -16], [22, -17.2], [31, -15.2], [36.6, -9.2], [38.2, 0], [36.6, 8.6], [31.6, 13.6],
      [27, 15], [26.2, 19], [22, 22.8], [15, 22.6], [8.4, 18], [3, 12.4], [-7, 9]],
  },
};
export const HAND_SHAPES = Object.keys(HANDS);

// ------------------------------------------------------------------ small maths
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, u) => a + (b - a) * u;
const dirOf = (deg) => [Math.sin(deg * DEG), Math.cos(deg * DEG)];        // 0 = down, 90 = outward, 180 = up
const angOf = (x, y) => Math.atan2(x, y) / DEG;
const wrap180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

const ARM0 = { a: 0, fa: 1, b: 0, fb: 1, w: 0, hand: 'rest', flip: 1, pin: 0 };
const HEAD0 = { pitch: 0, tilt: 0, turn: 0, x: 0, y: 0 };
const POSE0 = { view: 1, root: { x: 0, y: 0 }, step: 0, lean: 0, sh: 0, shy: 0, head: HEAD0, armL: ARM0, armR: ARM0 };

/** Fill in every field of a (possibly partial) pose. */
export function fullPose(p = {}) {
  return {
    view: p.view ?? POSE0.view,
    root: { x: p.root?.x ?? 0, y: p.root?.y ?? 0 },
    step: p.step ?? 0, lean: p.lean ?? 0, sh: p.sh ?? 0, shy: p.shy ?? 0,
    head: { ...HEAD0, ...(p.head || {}) },
    armL: { ...ARM0, ...(p.armL || {}) },
    armR: { ...ARM0, ...(p.armR || {}) },
  };
}
const mixArm = (a, b, u) => ({
  a: lerp(a.a, b.a, u), fa: clamp(lerp(a.fa, b.fa, u), 0.4, 1.03), b: lerp(a.b, b.b, u), fb: clamp(lerp(a.fb, b.fb, u), 0.4, 1.03),
  w: lerp(a.w, b.w, u), pin: clamp(lerp(a.pin, b.pin, u)),
  hand: u >= 0.5 ? b.hand : a.hand, flip: u >= 0.5 ? b.flip : a.flip,
});
/** Blend two poses. Angles / offsets lerp (u may overshoot); hand shape and flip switch at u >= 0.5. */
export function mixPose(A, B, u) {
  const a = fullPose(A), b = fullPose(B);
  if (u === 0) return a;
  if (u === 1) return b;
  const L = (k) => lerp(a[k], b[k], u);
  return {
    view: clamp(L('view')),
    root: { x: lerp(a.root.x, b.root.x, u), y: lerp(a.root.y, b.root.y, u) },
    step: clamp(L('step'), -0.1, 1.1), lean: L('lean'), sh: L('sh'), shy: L('shy'),
    head: {
      pitch: lerp(a.head.pitch, b.head.pitch, u), tilt: lerp(a.head.tilt, b.head.tilt, u), turn: clamp(lerp(a.head.turn, b.head.turn, u), -1.1, 1.1),
      x: lerp(a.head.x, b.head.x, u), y: lerp(a.head.y, b.head.y, u),
    },
    armL: mixArm(a.armL, b.armL, u), armR: mixArm(a.armR, b.armR, u),
  };
}

// ------------------------------------------------------------------ kinematics (pure maths, FIGURE units)
// Arm angles are "side-local": 0 = straight down, +90 = horizontally OUTWARD (away from the body on
// that arm's screen side), 180 = up, negative = across the body. b is the forearm's angle relative
// to the upper arm, w the hand's relative to the forearm. fa / fb (<= 1) foreshorten a segment: the
// 2.5-D way to say "this part points toward / away from the viewer" (the stencil is re-cut, never squashed).

/** Screen side of the man's own arm: back view L = screen-left (-1), R = screen-right (+1); front view mirrored. */
const sideOf = (which, view) => ((which === 'L') === (view >= 0.5) ? -1 : 1);

/** Head pitch (deg, + = bowed) -> what the flat puppet shows, per skin. */
function headPitch(pitch, back) {
  if (back) {
    // from behind: a bow lifts the nape hairline (longer neck) and drops the crown; a lift sinks the head onto the collar
    const dTop = pitch >= 0 ? 0.30 * pitch : -0.2 * pitch;
    const dBot = pitch >= 0 ? -0.45 * pitch : -0.6 * pitch;
    const sy = clamp(1 + (dBot - dTop) / 71.5, 0.9, 1.08);
    return { sy, ty: dTop + 70 * (sy - 1), face: 0, hair: 1, dTop };
  }
  // from the front: the face slides down under a hair cap that shows more crown; the chin covers more neck
  const head = 0.25 * pitch;
  return { sy: 1, ty: head, face: 0.8 * pitch, hair: clamp(1 + 0.016 * pitch, 0.91, 1.1), dTop: head };
}

/** All joint positions of a FULL pose in figure units (feet of the default stance at 0,0). breath = -1..1. */
function skeleton(P, view = P.view, breath = 0) {
  const back = view >= 0.5;
  const up = 3 * breath;
  const hip = [P.root.x, G.hipY + P.root.y];
  const cs = Math.cos(P.lean * DEG), sn = Math.sin(P.lean * DEG);
  const ub = (x, y) => [hip[0] + x * cs - (y - G.hipY) * sn, hip[1] + x * sn + (y - G.hipY) * cs];
  const out = { back, hip, up, lean: P.lean * DEG, ub };
  // legs: feet stay planted (root.x moves the hips only), root.y sinks the whole figure
  out.legs = [-1, 1].map((s) => {
    const h = [hip[0] + s * G.hipX, hip[1]];
    const foot = [s * G.footX + (s > 0 ? G.stepShoe * P.step : 0), P.root.y];
    const rot = Math.atan2(foot[0] - h[0], (foot[1] - 20) - h[1]);       // 0 = straight down, + = toward screen-right
    return { s, hip: h, foot, rot };
  });
  for (const which of ['L', 'R']) {
    const s = sideOf(which, view), arm = P['arm' + which];
    const J = ub(s * G.shoulder[0] + P.sh, G.shoulder[1] + P.shy - up);
    const d1 = dirOf(arm.a), d2 = dirOf(arm.a + arm.b), h = arm.a + arm.b + arm.w, dh = dirOf(h);
    const E = [J[0] + s * G.L1 * arm.fa * d1[0], J[1] + G.L1 * arm.fa * d1[1]];
    const W = [E[0] + s * G.L2 * arm.fb * d2[0], E[1] + G.L2 * arm.fb * d2[1]];
    const hp = HANDS[arm.hand].palm, px = hp[0], py = hp[1] * arm.flip;
    const palm = [W[0] + s * (px * dh[0] - py * dh[1]), W[1] + px * dh[1] + py * dh[0]];
    out['arm' + which] = { s, J, E, W, palm, a: arm.a, ab: arm.a + arm.b, h, arm };
  }
  const hp = headPitch(P.head.pitch, back);
  // the shoulder shift `sh` shears the torso (hem stays, shoulder line moves): the neck follows it, the head a little
  out.head = { pivot: ub(P.head.x + 0.4 * P.sh, G.headPivot[1] + P.head.y + 0.5 * P.shy - up), tilt: (P.head.tilt) * DEG + out.lean, turn: P.head.turn, ...hp };
  out.neck = ub(0.35 * P.head.x + 1.1 * P.sh, G.neckBase + 0.7 * P.shy - up);
  out.neckRot = out.lean - 0.02 * P.sh;
  out.shear = P.sh / (G.shoulder[1] - G.hipY);
  out.chest = ub(0.75 * P.sh, G.chest[1] - up);
  return out;
}

/**
 * Solve one arm so that the PALM CENTRE lands on a point given in side-local coordinates relative
 * to the shoulder joint (x outward, y down). Returns the arm fields {a, fa, b, fb, w}.
 */
function solveArm(T, { hand, flip, handAngle = null, wrist = 0, elbow = null, fa0 = 1, bend = null }) {
  const { L1, L2 } = G, hp = HANDS[hand].palm, px = hp[0], py = hp[1] * flip;
  let a = 0, b = 0, fa = 1, fb = 1, w = wrist;
  const two = (W) => {
    const d = Math.hypot(W[0], W[1]), phi = angOf(W[0], W[1]);
    const forced = (a0, f0) => {
      // 2.5-D: the elbow hangs where it naturally would; the forearm takes the rest (foreshortened)
      let aa = a0, ff = f0;
      const fore = (x, f) => { const e = dirOf(x); return [W[0] - L1 * f * e[0], W[1] - L1 * f * e[1]]; };
      let v = fore(aa, ff);
      if (Math.hypot(v[0], v[1]) > L2) {                     // too far: swing the upper arm toward the target
        let lo = 0, hi = 1;
        for (let i = 0; i < 40; i++) {
          const m = (lo + hi) / 2, x = a0 + wrap180(phi - a0) * m, vv = fore(x, ff);
          if (Math.hypot(vv[0], vv[1]) > L2) lo = m; else hi = m;
        }
        aa = a0 + wrap180(phi - a0) * hi;
        v = fore(aa, ff);
      } else if (Math.hypot(v[0], v[1]) < 0.42 * L2) {       // too near: shorten the upper arm as well
        let lo = 0.45, hi = ff;
        for (let i = 0; i < 40; i++) {
          const m = (lo + hi) / 2, vv = fore(aa, m);
          if (Math.hypot(vv[0], vv[1]) < 0.42 * L2) hi = m; else lo = m;
        }
        ff = lo;
        v = fore(aa, ff);
      }
      return { a: aa, fa: ff, b: wrap180(angOf(v[0], v[1]) - aa), fb: clamp(Math.hypot(v[0], v[1]) / L2, 0.4, 1) };
    };
    if (elbow !== null) return forced(elbow, fa0);
    if (d >= L1 + L2 - 0.01) return { a: phi, fa: 1, b: 0, fb: 1 };
    if (d <= Math.abs(L1 - L2) + 0.5) return forced(2, fa0);
    const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)) / DEG;
    const c1 = phi + A, c2 = phi - A;
    let aa = Math.cos(c1 * DEG) >= Math.cos(c2 * DEG) ? c1 : c2;         // default: the lower elbow
    if (bend === 'out') aa = c1; else if (bend === 'in') aa = c2;
    aa = wrap180(aa);
    if (bend === null && (aa < -16 || aa > 150)) return forced(2, fa0);  // elbow would cross the body: hang it instead
    const e = dirOf(aa), v = [W[0] - L1 * e[0], W[1] - L1 * e[1]];
    return { a: aa, fa: 1, b: wrap180(angOf(v[0], v[1]) - aa), fb: 1 };
  };
  for (let i = 0; i < (handAngle === null ? 8 : 1); i++) {
    const h = handAngle === null ? a + b + w : handAngle, dh = dirOf(h);
    const W = [T[0] - (px * dh[0] - py * dh[1]), T[1] - (px * dh[1] + py * dh[0])];
    ({ a, fa, b, fb } = two(W));
    if (handAngle !== null) w = wrap180(handAngle - a - b);
  }
  return { a, fa, b, fb, w };
}

// ------------------------------------------------------------------ shapes (figure units, each around its own anchor)
const mirrorPts = (half) => [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y])];   // half: centre top -> centre bottom

// the shoulder line (slope 0.42) is tangent to the arm's joint cap (r 17 round G.shoulder) at x = 60.6; beyond that the torso stays inside the cap
const TORSO_SIDE = [[22, -458.8], [31, -455], [40, -451.2], [50, -447], [57, -444.1], [60.6, -442.3], [63.6, -438.4], [65.4, -431], [64.8, -423],
  [62.6, -413.5], [59.4, -403.5], [57, -392], [54.8, -372], [52, -350], [49.8, -332], [48.6, -317], [48.6, -303], [49.6, -291], [50.2, -283],
  [49, -277.4], [44.6, -274.4], [34, -273.6], [17, -273.2], [0, -273]];
const NECKLINE = {
  front: [[0, -449.6], [6.5, -451], [12, -455], [15.4, -460.6]],
  back: [[0, -459.6], [8, -459.9], [15.4, -460.8]],
};
const FACE = [[0, -68.4], [11, -67], [20.5, -61.5], [26.6, -52.5], [29.6, -42], [30, -32], [28.8, -22], [26, -13], [21.5, -5.5], [15, 0.4], [7.5, 3.5], [0, 4.2]];
const HAIR_OUT = [[0, -70], [12, -68.6], [22, -62.6], [28.4, -53.4], [31.4, -42.5], [31.8, -34]];
const HAIR_BACK = [...HAIR_OUT, [30.8, -24], [28, -14.5], [23.4, -7.2], [17, -2.2], [9, 0.8], [0, 1.6]];
const HAIRLINE = [[31.4, -31.6], [28, -31.8], [26.8, -38.6], [24.4, -44.8], [19, -49.4], [10.4, -52], [0, -52.8]];   // sideburn tip -> centre

function legOutline(s) {
  const c = (y) => 12 * s * (y / G.legLen);
  const yb = G.legLen + 3;                                  // cuff line (the shoe is 20 px high)
  const R = [[0, 25], [40, 24.4], [95, 22], [145, 19], [208, 15.8], [yb, 13.4]];
  const r = (y) => { for (let i = 1; i < R.length; i++) if (y <= R[i][0]) return lerp(R[i - 1][1], R[i][1], (y - R[i - 1][0]) / (R[i][0] - R[i - 1][0])); return 13.4; };
  const pts = [];
  for (let i = 0; i <= 16; i++) { const a = Math.PI + (i / 16) * Math.PI; pts.push([Math.cos(a) * 25, Math.sin(a) * 25]); }   // round top (under the hem)
  for (let y = 10; y <= yb - 8; y += 16.5) pts.push([c(y) + r(y), y]);
  pts.push([c(yb - 2) + r(yb - 2), yb - 2], [c(yb) + r(yb) - 1.2, yb + 0.6], [c(yb) - r(yb) + 1.2, yb + 0.6], [c(yb - 2) - r(yb - 2), yb - 2]);
  for (let y = 10 + 16.5 * Math.floor((yb - 18) / 16.5); y >= 10; y -= 16.5) pts.push([c(y) - r(y), y]);
  return { pts, c, r };
}

// ------------------------------------------------------------------ the man
export async function makeMan(E, opts = {}) {
  const { shape: SH, tone } = E;
  const K = BAKE;
  const COL = [
    { top: '#B4553A', trousers: '#4A342A', shoes: '#2E1F1B', skin: '#E0A47C', hair: '#3B2620', band: '#8E3F2A' },
    { top: '#CF6E48', trousers: '#63473A', shoes: '#3B2923', skin: '#E9B088', hair: '#47302A', band: '#A04C30' },
  ];
  const place = (s) => SH.place(s, { scale: K });
  const scaleLayer = (l) => ({
    ...l, size: (l.size ?? 30) * K,
    maskFn: l.maskFn ? (x, y) => l.maskFn(x / K, y / K) : undefined,
    patch: l.patch ? { ...l.patch, scale: l.patch.scale * K } : undefined,
  });
  /** Bake one stencil part (shape in figure units around its anchor at 0,0). */
  const bake = (shape, { base = null, layers = [], edge = null, seed = 1 }) => E.bakeStencil({
    shape: place(shape), anchor: [0, 0], base, seed, bleed: false, pad: 4,
    layers: layers.map(scaleLayer),
    edge: edge ? [edge].flat().map((e) => ({ ...e, width: (e.width ?? 5) * K })) : null,
    reveal: { steps: 3 },
  });

  /**
   * The paint of one part. stage 1 = dark base coat, 2 = + mid tone, 3 = + lit / shade dabs.
   * Every part of a garment uses the SAME fine dab size for its base coats, so two parts that overlap
   * at a joint are statistically the same print (no seam); the big tonal patches (lit, shade) keep
   * clear of the joints.
   */
  const paint = (col, stage, { lit = null, shade = null, warm = 0, dab = 13, big = 28, deep = 0.15, pores = 0.42, cov = 0.92, litAmt = 0.15 } = {}) => {
    const base = tone(col, -deep);
    if (stage <= 1) return { base: tone(col, -deep - 0.16), layers: [{ color: tone(col, -deep - 0.24), coverage: 0.4, size: dab * 1.3, stamps: 'open', pores: 0, opacity: [0.5, 0.8], tint: 0.015 }] };
    const layers = [
      { color: col, coverage: cov, size: dab * 1.5, stamps: 'body', tint: 0.02, pores, opacity: [0.9, 1], even: true },
      { color: tone(col, 0.07), coverage: 0.3, size: dab, stamps: 'open', pores: 0, opacity: [0.45, 0.75], tint: 0.015 },
    ];
    if (stage >= 3) {
      if (shade) layers.push({ color: tone(col, -0.13), coverage: 0.7, size: big, stamps: 'open', pores: 0.3, opacity: [0.7, 0.95], tint: 0.02, maskFn: shade });
      if (lit) layers.push({ color: tone(col, litAmt), coverage: 0.74, size: big * 0.8, stamps: 'open', pores: 0.3, opacity: [0.75, 1], tint: 0.02, maskFn: lit });
      if (lit && warm) layers.push({ color: tone(col, 0.3), coverage: 0.45, size: big * 0.55, stamps: 'soft', opacity: [0.7, 1], tint: 0.02, maskFn: (x, y) => lit(x, y) ** 2 });
    }
    return { base, layers };
  };
  const edges = (col, stage, { sw = 4.5, lw = 3.5, so = 0.5, lo = 0.42 } = {}) => (stage < 3 ? null : [
    { color: tone(col, -0.3), width: sw, opacity: so, dir: [-0.7, 0.7], tile: 'fine' },
    { color: tone(col, 0.24), width: lw, opacity: lo, dir: [0.7, -0.7], tile: 'fine' },
  ]);
  /** A porous one-colour print of a whole part: the stock for the world-space edge bands of arms and hands. */
  const print = (shape, color, seed) => E.bakeStencil({
    shape: place(shape), anchor: [0, 0], seed, bleed: false, pad: 4, reveal: { steps: 3 },
    layers: [{ color, coverage: 0.93, size: 16 * K, stamps: 'body', pores: 0.45, tint: 0.02, even: true }].map((l) => l),
  });

  const sm = E.smoothstep;
  /** -1 (lower left) .. +1 (upper right) across an ellipse: the light of the whole film comes from the upper right. */
  // (a low-frequency wobble keeps the tone boundaries irregular, like dabbed patches, never a ruled line)
  const dirLight = (cx, cy, rx, ry, { wob = 0.34, scale = 26, seed = 5 } = {}) => (x, y) =>
    ((x - cx) / rx) * 0.68 - ((y - cy) / ry) * 0.73 + wob * (2 * E.fbm2(x / scale + 31.7, y / scale + 11.3, seed, 2) - 1);
  const jointFree = (x, y) => Math.min(sm(26, 40, Math.hypot(x - G.shoulder[0], y - G.shoulder[1])), sm(26, 40, Math.hypot(x + G.shoulder[0], y - G.shoulder[1])));

  // ---- part builders: (warm, stage) -> Painted, cached under E.once('man/…')
  const once = (key, fn) => E.once('man/' + key, fn);
  const PART = {
    torso(view, w, st) {
      const C = COL[w];
      const pts = mirrorPts([...NECKLINE[view], ...TORSO_SIDE]).map(([x, y]) => [x, y - G.hipY]);
      const L = dirLight(0, -362 - G.hipY, 60, 95);
      const lit = (x, y) => sm(0.22, 0.5, L(x, y)) * jointFree(x, y + G.hipY);
      const shade = (x, y) => sm(-0.22, -0.52, L(x, y)) * jointFree(x, y + G.hipY);
      return bake(SH.smooth(pts, 0.5), { ...paint(C.top, st, { lit, shade, warm: w, big: 34 }), edge: edges(C.top, st), seed: 11 });
    },
    pelvis(view, w, st) {
      const C = COL[w];
      return bake(SH.smooth([[-42, -22], [42, -22], [44.6, -4], [42, 11], [29, 21], [0, 23], [-29, 21], [-42, 11], [-44.6, -4]], 0.5),
        { ...paint(C.trousers, st, { deep: 0.24 }), seed: 12 });
    },
    leg(s, w, st) {
      const C = COL[w], o = legOutline(s);
      const side = (x, y) => (x - o.c(y)) / o.r(Math.max(0, y));
      const lit = (x, y) => sm(0.1, 0.5, side(x, y)) * sm(30, 60, y);
      const shade = (x, y) => sm(-0.15, -0.55, side(x, y)) * sm(30, 60, y);
      return bake(SH.polygon(o.pts), { ...paint(C.trousers, st, { lit, shade, warm: w, big: 20, deep: 0.24 }), edge: edges(C.trousers, st, { lo: 0.36 }), seed: 13 + (s > 0 ? 1 : 0) });
    },
    shoe(key, w, st) {
      const C = COL[w], [view, sgn] = key.split(':'), s = +sgn, k = view === 'back' ? 0.9 : 1;
      const pts = [[-13.5, 3.5], [-14.6, -7], [-12, -15.6], [-6, -20.6], [5, -21], [12, -17], [16, -8.6], [17, 3.5]].map(([x, y]) => [s * x * k, y]);
      const lit = (x, y) => sm(-4, 6, x) * sm(-6, -14, y);
      return bake(SH.smooth(s > 0 ? pts : pts.reverse(), 0.5), { ...paint(C.shoes, st, { lit, big: 12, deep: 0.25 }), edge: edges(C.shoes, st, { sw: 3, lw: 2.5, lo: 0.3 }), seed: 16 });
    },
    neck(view, w, st) {
      const C = COL[w];
      const col = tone(C.skin, -0.1);                                   // in the head's shadow: the chin reads against it
      const lit = (x, y) => sm(2, 9, x) * sm(-14, -4, y);
      return bake(SH.smooth([[-15.5, -34], [0, -36], [15.5, -34], [15.5, -20], [15.6, -8], [17.5, 0], [22, 7], [22, 13], [0, 14], [-22, 13], [-22, 7], [-17.5, 0], [-15.6, -8], [-15.5, -20]], 0.5), { ...paint(col, st, { lit, dab: 11, big: 14, deep: 0.16, pores: 0.2, cov: 0.96 }), seed: 17 });
    },
    face(view, w, st) {                                                 // front skin: featureless face patch + ears
      const C = COL[w];
      const L = dirLight(0, -30, 30, 36, { wob: 0.2 });
      const lit = (x, y) => sm(0.15, 0.5, L(x, y)) * sm(34, 28, Math.abs(x));
      const head = SH.smooth(mirrorPts(FACE), 0.5);
      const ears = [-1, 1].map((s) => SH.ellipse(s * 30.4, -31, 4.6, 8.6, s * 0.12));
      return bake(SH.union(head, ...ears), { ...paint(C.skin, st, { lit, warm: w, dab: 11, big: 22, deep: 0.17, pores: 0.12, cov: 0.975, litAmt: 0.1 }), edge: edges(C.skin, st, { sw: 3.5, lw: 3, so: 0.42, lo: 0.4 }), seed: 18 });
    },
    hairFront(view, w, st) {
      const C = COL[w];
      const right = [...HAIR_OUT, ...HAIRLINE];
      const pts = [...right, ...right.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
      const L = dirLight(0, -52, 32, 18);
      const lit = (x, y) => sm(0.25, 0.6, L(x, y));
      return bake(SH.smooth(pts, 0.5), { ...paint(C.hair, st, { lit, warm: w, dab: 11, big: 16, deep: 0.22 }), edge: edges(C.hair, st, { sw: 3, lw: 3, so: 0.45, lo: 0.36 }), seed: 19 });
    },
    hairBack(view, w, st) {
      const C = COL[w];
      const L = dirLight(0, -34, 32, 36);
      const lit = (x, y) => sm(0.22, 0.55, L(x, y));
      const shade = (x, y) => sm(-0.25, -0.6, L(x, y));
      return bake(SH.smooth(mirrorPts(HAIR_BACK), 0.5), { ...paint(C.hair, st, { lit, shade, warm: w, dab: 11, big: 20, deep: 0.22 }), edge: edges(C.hair, st, { sw: 3.5, lw: 3, so: 0.45, lo: 0.36 }), seed: 20 });
    },
    ear(view, w, st) {
      const C = COL[w];
      return bake(SH.ellipse(0, 0, 4.6, 8.6), { ...paint(tone(C.skin, -0.04), st, { dab: 9, deep: 0.17, pores: 0.2, cov: 0.96 }), seed: 21 });
    },
    cheek(view, w, st) {                                                // back skin: what a head turn uncovers
      const C = COL[w];
      return bake(SH.ellipse(0, -21, 24, 20), { ...paint(C.skin, st, { dab: 11, deep: 0.17, pores: 0.2, cov: 0.96 }), edge: edges(C.skin, st, { sw: 3, lw: 2.5, so: 0.4, lo: 0.3 }), seed: 22 });
    },
    upper(view, w, st) { return bake(SH.capsule(G.L1, G.R[0], G.R[1]), { ...paint(COL[w].top, st), seed: 23 }); },
    fore(view, w, st) { return bake(SH.capsule(G.L2, G.R[1], G.R[2]), { ...paint(COL[w].top, st), seed: 24 }); },
    hand(shape, w, st) { return bake(SH.smooth(HANDS[shape].pts, 0.5), { ...paint(COL[w].skin, st, { dab: 10, deep: 0.17, pores: 0.2, cov: 0.96 }), seed: 25 + HAND_SHAPES.indexOf(shape) }); },
  };
  const part = (name, key, w, st) => once(`${name}/${key}/${w}/${st}`, () => PART[name](key, w, st));
  const bandPrint = (name, key, w, kind) => once(`band/${name}/${key}/${w}/${kind}`, () => {
    const C = COL[w];
    const shape = name === 'upper' ? SH.capsule(G.L1, G.R[0], G.R[1]) : name === 'fore' ? SH.capsule(G.L2, G.R[1], G.R[2]) : SH.smooth(HANDS[key].pts, 0.5);
    const col = name === 'hand' ? (kind === 'sh' ? tone(C.skin, -0.3) : tone(C.skin, 0.2)) : (kind === 'sh' ? tone(C.band, -0.1) : tone(C.top, w ? 0.3 : 0.22));
    return print(shape, col, 40 + (kind === 'sh' ? 0 : 1));
  });

  // ------------------------------------------------------------------ drawing (ctx units = FIGURE units)
  const put = (c, sp, x, y, rot = 0, sx = 1, sy = 1) => {
    c.save();
    c.translate(x, y);
    if (rot) c.rotate(rot);
    c.scale(sx / K, sy / K);
    sp.draw(c, 0, 0);
    c.restore();
  };
  const SEG = { upper: [G.L1, G.R[0], G.R[1]], fore: [G.L2, G.R[1], G.R[2]] };
  /** The parts of one arm: which = 'limb' (upper arm + forearm) | 'hand'; kind = null (paint) | 'sh' | 'li' (band stock). */
  const armParts = (c, A, w, st, kind, which) => {
    const { s, J, arm } = A;
    const seg = (name, f) => {
      const sp = kind ? bandPrint(name, '-', w, kind) : part(name, '-', w, Math.min(st, 2));
      c.save();
      c.scale(1 / K, 1 / K);
      if (f < 0.995) c.clip(SH.capsule(SEG[name][0] * f * K, SEG[name][1] * K, SEG[name][2] * K).path);   // foreshortened: re-cut, never squashed
      sp.draw(c, 0, 0);
      c.restore();
    };
    c.save();
    c.translate(J[0], J[1]);
    c.scale(s, 1);
    c.rotate(Math.PI / 2 - arm.a * DEG);
    if (which === 'limb') seg('upper', arm.fa);
    c.translate(G.L1 * arm.fa, 0);
    c.rotate(-arm.b * DEG);
    if (which === 'limb') seg('fore', arm.fb);
    else {
      c.translate(G.L2 * arm.fb, 0);
      c.rotate(-arm.w * DEG);
      c.scale(1 / K, arm.flip / K);
      (kind ? bandPrint('hand', arm.hand, w, kind) : part('hand', arm.hand, w, Math.min(st, 2))).draw(c, 0, 0);
    }
    c.restore();
  };
  /**
   * One arm group with its light: the parts are composed in a scratch surface, then a speckled shade
   * band is printed just inside the LOWER-LEFT edge of their union and a light band inside the
   * UPPER-RIGHT edge — in world space, so the light stays put while the arm turns, and on the union,
   * so the elbow never shows a seam. Near the shoulder both bands fade: the cap melts into the torso.
   */
  const BAND = { sh: [6, 0.8], li: [3.6, 0.5] };
  const banded = (c, A, w, st, which) => {
    const dh = dirOf(A.h);
    const pts = which === 'limb' ? [A.J, A.E, A.W] : [A.W, [A.W[0] + A.s * 40 * dh[0], A.W[1] + 40 * dh[1]]];
    const m = which === 'limb' ? 24 : 42;
    const ox = Math.floor((Math.min(...pts.map((q) => q[0])) - m) * K), oy = Math.floor((Math.min(...pts.map((q) => q[1])) - m) * K);
    const bw = Math.ceil((Math.max(...pts.map((q) => q[0])) + m) * K) - ox, bh = Math.ceil((Math.max(...pts.map((q) => q[1])) + m) * K) - oy;
    // The scratch surfaces have ONE fixed size per group (hand / limb), whatever the pose. An engine scratch
    // only ever grows, so a size that followed the pose would depend on the frames drawn before — and the
    // browser resamples a canvas through mip levels of the WHOLE canvas once the camera shows it below
    // ~0.7x of its bake (the figure is baked at 2x): the same frame came out differently depending on the
    // render order (integration fix). The limb box holds (L1 + L2) * 1.03 + 2 * 24 px, the hand box 40 + 2 * 42.
    const fix = Math.max(which === 'limb' ? 264 * K : 128 * K, bw, bh);
    const layer = (slot, kind) => {
      const S = E.scratch(fix, fix, slot + (which === 'limb' ? '' : 'h')), sc = S.ctx;
      sc.save();
      sc.translate(-ox, -oy);
      sc.scale(K, K);
      armParts(sc, A, w, st, kind, which);
      sc.restore();
      return S;
    };
    const U = layer('man:u', null);
    const cw = Math.ceil(bw * U.res), ch = Math.ceil(bh * U.res);
    const show = (S, alpha) => {
      const prev = c.globalAlpha;
      c.globalAlpha = prev * alpha;
      c.drawImage(S.canvas, 0, 0, cw, ch, ox / K, oy / K, cw / U.res / K, ch / U.res / K);
      c.globalAlpha = prev;
    };
    show(U, 1);
    if (st < 3) return;
    for (const kind of ['sh', 'li']) {
      const S = layer('man:' + kind, kind), sc = S.ctx, [wd, al] = BAND[kind], sgn = kind === 'sh' ? 1 : -1;
      sc.globalCompositeOperation = 'destination-out';
      sc.drawImage(U.canvas, 0, 0, cw, ch, sgn * 0.7 * wd * K, -sgn * 0.7 * wd * K, cw / U.res, ch / U.res);
      if (which === 'limb') {
        const gx = A.J[0] * K - ox, gy = A.J[1] * K - oy;
        const g = sc.createRadialGradient(gx, gy, 20 * K, gx, gy, 50 * K);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        sc.fillStyle = g;
        sc.fillRect(gx - 50 * K, gy - 50 * K, 100 * K, 100 * K);
      }
      sc.globalCompositeOperation = 'source-over';
      show(S, al * (kind === 'li' && w ? 1.25 : 1));
    }
  };

  const restLeg = (s) => Math.atan2(12 * s, G.legLen);
  /** The whole figure in one skin. c: a context in figure units (default feet at 0,0). mid(): called before the arms. */
  const drawFigure = (c, P, view, w, st, breath, mid) => {
    const skin = view >= 0.5 ? 'back' : 'front', back = skin === 'back';
    let sk = skeleton(P, view, breath);
    if (breath && (P.armL.pin > 0.001 || P.armR.pin > 0.001)) {
      // hands that hold something stay where the pose put them while the shoulders breathe
      const sk0 = skeleton(P, view, 0), Q = { ...P };
      for (const which of ['L', 'R']) {
        const arm = P['arm' + which], A0 = sk0['arm' + which], A = sk['arm' + which];
        if (arm.pin <= 0.001) continue;
        const sol = solveArm([(A0.palm[0] - A.J[0]) * A.s, A0.palm[1] - A.J[1]], { hand: arm.hand, flip: arm.flip, handAngle: A0.h, elbow: arm.a, fa0: arm.fa });
        Q['arm' + which] = mixArm(arm, { ...arm, ...sol }, arm.pin);
      }
      sk = skeleton(Q, view, breath);
    }
    for (const L of sk.legs) put(c, part('shoe', `${skin}:${L.s}`, w, st), L.foot[0], L.foot[1]);
    for (const L of sk.legs) put(c, part('leg', L.s, w, st), L.hip[0], L.hip[1], -(L.rot - restLeg(L.s)));
    put(c, part('pelvis', '-', w, st), sk.hip[0], sk.hip[1]);
    const H = sk.head;
    put(c, part('neck', '-', w, st), sk.neck[0], sk.neck[1], sk.neckRot + 0.3 * (H.tilt - sk.lean));
    c.save();
    c.translate(sk.hip[0], sk.hip[1] - 1.9 * breath);
    c.rotate(sk.lean);
    c.transform(1, 0, sk.shear, 1, 0, 0);                              // shoulder shift: x += sh at the shoulder joints, 0 at the hips
    c.scale(1 / K, (1 + 0.006 * breath - P.shy / 150) / K);
    part('torso', skin, w, st).draw(c, 0, 0);
    c.restore();
    c.save();
    c.translate(H.pivot[0] + 2 * H.turn, H.pivot[1] + H.ty);
    c.rotate(H.tilt);
    if (back) {
      const tau = H.turn;
      c.scale(1, H.sy);
      put(c, part('cheek', '-', w, st), 10 * tau, 0);
      for (const s of [-1, 1]) put(c, part('ear', '-', w, st), s * 30.4 - 4 * tau - (s * tau < 0 ? s * 8 * Math.abs(tau) : 0), -31, s * 0.12);
      put(c, part('hairBack', '-', w, st), -4 * tau, 0);
    } else {
      put(c, part('face', '-', w, st), 0, H.face);
      c.translate(0, -70);
      c.scale(1, H.hair);
      put(c, part('hairFront', '-', w, st), 0, 70);
    }
    c.restore();
    if (mid) mid();
    for (const which of back ? ['L', 'R'] : ['R', 'L']) {                 // screen-left arm first
      const A = sk['arm' + which];
      banded(c, A, w, st, 'hand');
      banded(c, A, w, st, 'limb');
    }
  };

  // the cross-dab turn: one ordered set of sponge prints; the back skin shows through the prints that
  // have landed, the front skin through the rest
  const TURN = { w: 400, h: 610, x: 200, y: 580 };
  const turnMask = (k) => once(`turnmask/${k}`, () => {
    const s = E.surface(TURN.w * K, TURN.h * K);
    const dabs = once('turndabs', () => E.scatterDabs([{ color: '#FFFFFF', coverage: 0.992, size: 46 * K, stamps: 'body', tints: 1, pores: 0 }],
      { w: TURN.w * K, h: TURN.h * K, seed: 4711, reveal: { order: 'random', layerMix: 0 } }));
    const tmp = E.surface(TURN.w * K, TURN.h * K);
    E.paintDabs(tmp, dabs, 0, Math.round(dabs.length * [0.095, 0.25][k - 1]));   // prints overlap ~5 deep: these fractions cover about 37 % / 70 % of the area
    for (let i = 0; i < 3; i++) E.blit(s.ctx, tmp);
    tmp.canvas.width = tmp.canvas.height = 1;
    return s;
  });
  const viewStage = (v) => (v < 0.1 ? 0 : v < 0.5 ? 1 : v < 0.9 ? 2 : 3);

  const man = { G, HAND_SHAPES, BAKE: K };
  man.mix = mixPose;
  man.pose = fullPose;
  /**
   * draw(ctx, t, { pose, warm = 0, p = 1, hands = null })   — world px, camera already applied.
   * extras for review scenes: x, y (root, default 540 / 1200), scale, breath (-1..1, default from t).
   */
  man.draw = (ctx, t, { pose = null, warm = 0, p = 1, hands = null, x = G.x, y = G.feetY, scale = 1, breath = null } = {}) => {
    const st = p >= 1 ? 3 : Math.round(clamp(p) * 3);
    if (st <= 0) { if (hands) hands(ctx); return; }
    const P = fullPose(pose ?? man.POSES.back_neutral);
    const w = warm >= 0.5 ? 1 : 0;
    const br = breath ?? Math.sin((2 * Math.PI * t) / 3.4);
    const k = viewStage(P.view);
    const mid = hands ? () => { ctx.save(); ctx.scale(1 / scale, 1 / scale); ctx.translate(-x, -y); hands(ctx); ctx.restore(); } : null;
    ctx.save();
    ctx.translate(x, y);
    if (scale !== 1) ctx.scale(scale, scale);
    if (k === 0 || k === 3) drawFigure(ctx, P, k === 3 ? 1 : 0, w, st, br, mid);
    else {
      const v = P.view, sx = 1 - 0.4 * Math.sin(Math.PI * v), dip = 4 * Math.sin(Math.PI * v);
      const layer = (view, slot, op) => {
        const S = E.scratch(TURN.w * K, TURN.h * K, slot), sc = S.ctx;
        sc.save();
        sc.scale(K, K);
        sc.translate(TURN.x, TURN.y);
        drawFigure(sc, P, view, w, st, br, null);
        sc.restore();
        sc.globalCompositeOperation = op;
        E.blit(sc, turnMask(k));
        sc.globalCompositeOperation = 'source-over';
        return S;
      };
      ctx.translate(P.root.x, dip);
      ctx.scale(sx, 1);
      ctx.translate(-P.root.x, 0);
      for (const S of [layer(0, 'man:tf', 'destination-out'), layer(1, 'man:tb', 'destination-in')]) {
        const cw = Math.ceil(TURN.w * K * S.res), ch = Math.ceil(TURN.h * K * S.res);
        ctx.drawImage(S.canvas, 0, 0, cw, ch, -TURN.x, -TURN.y, cw / S.res / K, ch / S.res / K);
      }
      if (mid) mid();
    }
    ctx.restore();
  };

  /** The stepped view value of the turn: 0 before t0, 1 from t0 + 4 frames (cross-dab steps land on t0 and t0 + 2 frames). */
  man.turn = (t, t0 = 44 / 30, fps = 30) => clamp((Math.floor((t - t0) * fps + 1e-6) + 1) / 5);

  man.reach = (pose, which, target, o = {}) => {
    const P = fullPose(pose), view = o.view ?? P.view;
    const A = skeleton(P, view, 0)['arm' + which], arm = P['arm' + which];
    const hand = o.hand ?? arm.hand, flip = o.flip ?? arm.flip;
    const T = [(target[0] - (o.x ?? G.x) - A.J[0]) * A.s, target[1] - (o.y ?? G.feetY) - A.J[1]];
    const sol = solveArm(T, { hand, flip, handAngle: o.handAngle ?? null, wrist: o.wrist ?? 0, elbow: o.elbow ?? null, fa0: o.fa ?? 1, bend: o.bend ?? null });
    return { ...P, ['arm' + which]: { ...sol, hand, flip, pin: o.pin ?? 1 } };
  };

  man.point = (name, pose, o = {}) => {
    const P = fullPose(pose), sk = skeleton(P, o.view ?? P.view, o.breath ?? 0);
    const X = o.x ?? G.x, Y = o.y ?? G.feetY;
    const m = /^(palm|wrist|elbow|shoulder)([LR])$/.exec(name);
    let q;
    if (m) q = sk['arm' + m[2]][{ palm: 'palm', wrist: 'W', elbow: 'E', shoulder: 'J' }[m[1]]];
    else if (name === 'chest') q = sk.chest;
    else if (name === 'neck') q = [sk.neck[0], sk.neck[1] - 10];
    else if (name === 'headTop') q = [sk.head.pivot[0], sk.head.pivot[1] - 70 + sk.head.dTop];
    else if (name === 'head') q = [sk.head.pivot[0], sk.head.pivot[1] - 33];
    else if (name === 'hip') q = sk.hip;
    else if (name === 'footL' || name === 'footR') q = sk.legs[(name === 'footL') === sk.back ? 0 : 1].foot;
    else throw new Error(`man.point: unknown point "${name}"`);
    return [X + q[0], Y + q[1]];
  };
  /** Where a held thing goes: wrist, palm, the hand's direction (canvas rad) and mirror signs, in world px. */
  man.hand = (which, pose, o = {}) => {
    const P = fullPose(pose), A = skeleton(P, o.view ?? P.view, o.breath ?? 0)['arm' + which];
    const X = o.x ?? G.x, Y = o.y ?? G.feetY, d = dirOf(A.h);
    return { wrist: [X + A.W[0], Y + A.W[1]], palm: [X + A.palm[0], Y + A.palm[1]], rot: Math.atan2(d[1], A.s * d[0]), side: A.s, flip: A.arm.flip, shape: A.arm.hand };
  };

  /** Review helper: one hand alone (with its light bands). angle = side-local deg (0 down, 90 outward), side = +1 / -1. */
  man.drawHand = (ctx, shape, x, y, { angle = 90, flip = 1, side = 1, warm = 0, scale = 1, p = 1 } = {}) => {
    const st = p >= 1 ? 3 : Math.round(clamp(p) * 3);
    if (st <= 0) return;
    const A = { s: side, J: [0, 0], E: [0, 0], W: [0, 0], h: angle, arm: { a: angle, fa: 0, b: 0, fb: 0, w: 0, hand: shape, flip } };
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    banded(ctx, A, warm >= 0.5 ? 1 : 0, st, 'hand');
    ctx.restore();
  };

  man.track = (keys, { overlap = 0, fps = 30 } = {}) => {
    const KS = [...keys].sort((a, b) => a.t - b.t).map((k) => ({ t: k.t, v: fullPose(k.v), ease: k.ease ?? E.ease.cubic.inOut }));
    const at = (t) => {
      if (t <= KS[0].t) return KS[0].v;
      const last = KS[KS.length - 1];
      if (t >= last.t) return last.v;
      let i = 0;
      while (t > KS[i + 1].t) i++;
      const a = KS[i], b = KS[i + 1];
      return mixPose(a.v, b.v, b.ease((t - a.t) / (b.t - a.t)));
    };
    if (!overlap) return at;
    return (t) => {
      const p0 = at(t), p1 = at(t - overlap / fps), p2 = at(t - (2 * overlap) / fps);
      const arm = (k) => ({ ...p0[k], b: p1[k].b, fb: p1[k].fb, w: p2[k].w, hand: p2[k].hand, flip: p2[k].flip });
      return { ...p0, armL: arm('armL'), armR: arm('armR') };
    };
  };

  // ------------------------------------------------------------------ the named poses (storyboard §6)
  const REST = { ...solveArm([18, 220], { hand: 'rest', flip: 1, bend: 'out' }), hand: 'rest', flip: 1, pin: 0 };
  const P0 = (o = {}) => fullPose({ view: 1, armL: REST, armR: REST, ...o });
  const head = (o) => ({ ...HEAD0, ...o });
  const back = P0();
  const front = P0({ view: 0 });
  const POSES = {};
  POSES.front_neutral_bowed = P0({ view: 0, head: head({ pitch: 6 }) });
  POSES.front_neutral = front;
  // his right hand (screen-left arm in front view) flat on the chest, fingers toward his left shoulder
  POSES.front_hand_on_chest = man.reach(front, 'R', [544, 806], { hand: 'open', handAngle: -124, flip: 1 });
  POSES.turn_front_to_back = P0({ view: 0.5 });
  POSES.back_neutral = back;
  POSES.back_left_arm_out_palm_up = man.reach(back, 'L', [270, 772], { hand: 'cupped', handAngle: 95 });
  POSES.back_left_reach_after = man.reach(back, 'L', [270, 800], { hand: 'open', handAngle: 62, flip: 1 });
  POSES.back_left_hand_closed = man.reach(back, 'L', [273, 803], { hand: 'closed', handAngle: 66, flip: 1 });
  POSES.back_head_turned_right = P0({ head: head({ turn: 1 }) });
  POSES.back_right_palm_up = man.reach(P0({ head: head({ turn: 0.85, tilt: 5, pitch: 4 }) }), 'R', [688, 818], { hand: 'cupped', handAngle: 95 });
  POSES.back_look_at_empty_palm = man.reach(P0({ head: head({ turn: 0.95, tilt: 8, pitch: 8 }) }), 'R', [688, 818], { hand: 'cupped', handAngle: 104 });
  POSES.back_right_reach = man.reach(P0({ sh: 4, head: head({ turn: 1, tilt: 3 }) }), 'R', [784, 896], { hand: 'open', flip: -1, wrist: 0 });
  POSES.back_right_recoil = man.reach(P0({ sh: 3, head: head({ turn: 1, tilt: 3 }) }), 'R', [776, 890], { hand: 'open', flip: -1, wrist: -6 });
  POSES.back_right_hand_closed = man.reach(P0({ sh: 2, head: head({ turn: 1, tilt: 2 }) }), 'R', [776, 891], { hand: 'closed', flip: -1, wrist: -8 });
  POSES.back_head_up_small = P0({ head: head({ pitch: -5 }) });
  POSES.back_head_bowed_to_ground = P0({ head: head({ pitch: 8 }) });
  POSES.back_nod = P0({ head: head({ pitch: 3 }), shy: 1.5 });
  POSES.back_right_palm_receive = man.reach(P0({ head: head({ turn: 0.6, tilt: 4, pitch: 3 }) }), 'R', [720, 830], { hand: 'cupped', handAngle: 94 });
  POSES.back_coin_held_at_side = man.reach(back, 'R', [660, 880], { hand: 'cupped', handAngle: 106, elbow: -10 });
  POSES.back_turned_right = man.reach(P0({ sh: -4, head: head({ turn: 1 }) }), 'R', [660, 880], { hand: 'cupped', handAngle: 106, elbow: -10 });
  POSES.back_coin_shown = man.reach(P0({ sh: -4, head: head({ turn: 1 }) }), 'R', [668, 872], { hand: 'open', handAngle: 112, flip: -1, elbow: -10 });
  POSES.back_wind_up = man.reach(P0({ sh: -4, lean: -1, root: { x: 0, y: 4 }, head: head({ turn: 1 }) }), 'R', [655, 900], { hand: 'open', handAngle: 84, flip: -1, elbow: -13 });
  POSES.back_release = man.reach(P0({ sh: 2, lean: 0.6, step: 1, root: { x: G.stepHips, y: 0 }, head: head({ turn: 1 }) }), 'R', [720, 820], { hand: 'open', handAngle: 110, flip: -1 });
  POSES.back_follow_through = man.reach(P0({ sh: 3, step: 1, root: { x: G.stepHips, y: 0 }, head: head({ turn: 1 }) }), 'R', [755, 800], { hand: 'open', handAngle: 102, flip: -1 });
  POSES.back_final_stand = P0({ sh: -4, step: 1, root: { x: G.stepHips, y: 0 }, head: head({ turn: 1 }) });
  man.POSES = POSES;
  man.REST_ARM = REST;

  // ------------------------------------------------------------------ bake what the film needs
  /** Bake one sprite set ahead of time: skin 'front' | 'back', warm 0 | 1, stage 1..3 (missing sets are baked on first use). */
  man.prepare = (skin, w = 0, st = 3) => {
    for (const s of [-1, 1]) { part('shoe', `${skin}:${s}`, w, st); part('leg', s, w, st); }
    for (const n of ['pelvis', 'neck']) part(n, '-', w, st);
    part('torso', skin, w, st);
    for (const n of skin === 'back' ? ['cheek', 'ear', 'hairBack'] : ['face', 'hairFront']) part(n, '-', w, st);
    for (const n of ['upper', 'fore']) {
      part(n, '-', w, Math.min(st, 2));
      if (st >= 3) for (const k of ['sh', 'li']) bandPrint(n, '-', w, k);
    }
    for (const h of HAND_SHAPES) {
      part('hand', h, w, Math.min(st, 2));
      if (st >= 3) for (const k of ['sh', 'li']) bandPrint('hand', h, w, k);
    }
  };
  if (opts.prepare !== false) {
    for (const st of [1, 2, 3]) man.prepare('front', 0, st);
    man.prepare('back', 0, 3);
    man.prepare('back', 1, 3);
  }
  return man;
}
