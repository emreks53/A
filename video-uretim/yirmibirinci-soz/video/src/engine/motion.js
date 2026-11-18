// motion.js — timing and path helpers (all pure functions of their arguments).
//
//   curve(pts)            smooth path through points, arc-length parameterised: at(u), angle(u), length
//   arc(p0, p1, height)   ballistic throw arc (u = time fraction): at(u), angle(u), length
//   track(keys)           keyframed numbers / arrays / objects -> value(t)   (puppet poses: rig.js poseTrack)
//   dabP(t, t0, opts)     reveal progress that lands exactly one stage every N frames
//   beat(t0, every)       t0 snapped down to the shot's beat grid

import { clamp, lerp, ease as easing } from './ease.js';
import { env } from './surface.js';

function polyTable(P) {
  const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  return L;
}
function polyAt(P, L, s) {
  const total = L[L.length - 1];
  s = clamp(s, 0, total);
  let lo = 0, hi = L.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (L[m] <= s) lo = m; else hi = m;
  }
  const a = P[lo], b = P[Math.min(lo + 1, P.length - 1)], seg = (L[lo + 1] ?? L[lo]) - L[lo] || 1, u = (s - L[lo]) / seg;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
}

/**
 * Smooth curve through pts (Catmull-Rom), parameterised by arc length: u = 0..1 moves at constant
 * speed. Returns { at(u) -> [x, y], angle(u) -> rad (direction of travel), length (px),
 * pts (fine polyline: feed it to shape.dashes / shape.dots / shape.ribbon) }.
 * closed: true joins the end to the start (u wraps around).
 */
export function curve(pts, { closed = false, tension = 0.5 } = {}) {
  const n = pts.length, k = tension * 2, fine = [];
  const P = (i) => (closed ? pts[((i % n) + n) % n] : pts[clamp(i, 0, n - 1)]);
  const spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const steps = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 6));
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const h1 = 2 * t3 - 3 * t2 + 1, h2 = t3 - 2 * t2 + t, h3 = -2 * t3 + 3 * t2, h4 = t3 - t2;
      fine.push([0, 1].map((a) => h1 * p1[a] + h2 * (k * (p2[a] - p0[a])) / 2 + h3 * p2[a] + h4 * (k * (p3[a] - p1[a])) / 2));
    }
  }
  fine.push(closed ? fine[0].slice() : pts[n - 1].slice());
  const L = polyTable(fine), length = L[L.length - 1];
  const wrap = (u) => (closed ? ((u % 1) + 1) % 1 : clamp(u));
  const at = (u) => polyAt(fine, L, wrap(u) * length);
  return {
    length, closed, pts: closed ? fine.slice(0, -1) : fine,
    at,
    angle(u) {
      const e = Math.min(0.01, 2 / Math.max(length, 1)), w = wrap(u);
      const a = closed ? at(w - e) : at(Math.max(0, w - e)), b = closed ? at(w + e) : at(Math.min(1, w + e));
      return Math.atan2(b[1] - a[1], b[0] - a[0]);
    },
  };
}

/**
 * Throw arc from p0 to p1 whose apex rises `height` px above the straight line (negative = dips).
 * u is the TIME fraction of a ballistic flight (even horizontal speed, gravity-like vertical), so
 * drive it linearly or with a light ease: at(u) -> [x, y], angle(u), length, pts.
 */
export function arc(p0, p1, height = 200) {
  const c = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - 2 * height];
  const at = (u) => {
    const t = clamp(u), v = 1 - t;
    return [v * v * p0[0] + 2 * v * t * c[0] + t * t * p1[0], v * v * p0[1] + 2 * v * t * c[1] + t * t * p1[1]];
  };
  const pts = Array.from({ length: 49 }, (_, i) => at(i / 48));
  const L = polyTable(pts);
  return {
    length: L[L.length - 1], closed: false, pts, at,
    angle(u) {
      const t = clamp(u), v = 1 - t;
      return Math.atan2(2 * v * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1]), 2 * v * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]));
    },
  };
}

const isNum = (v) => typeof v === 'number';
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// A value is a tree of numbers (interpolated), arrays / objects (walked) and DISCRETE leaves — strings,
// booleans, null, undefined (a sprite name, hide: true …) — which are never blended: they HOLD and
// switch on arrival at the next key.
function mixValue(a, b, u) {
  if (isNum(a) && isNum(b)) return lerp(a, b, u);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => mixValue(v, b[i] ?? v, u));
  if (isObj(a) && isObj(b)) {
    const out = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      out[k] = k in a && k in b ? mixValue(a[k], b[k], u) : (k in a ? a[k] : b[k]);
    }
    return out;
  }
  return u < 1 ? a : b;
}
function hermite(p0, p1, m0, m1, u) {
  if (isNum(p0) && isNum(p1)) {
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * (m0 || 0) + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * (m1 || 0);
  }
  if (Array.isArray(p0) && Array.isArray(p1)) return p0.map((v, i) => hermite(v, p1[i], m0?.[i], m1?.[i], u));
  if (isObj(p0) && isObj(p1)) {
    const out = {};
    for (const k of Object.keys(p0)) out[k] = k in p1 ? hermite(p0[k], p1[k], m0?.[k], m1?.[k], u) : p0[k];
    return out;
  }
  return u < 1 ? p0 : p1;                       // discrete leaf: hold, switch on arrival
}
const slopeOf = (a, b, c, dt) => {
  if (isNum(b)) return isNum(a) && isNum(c) ? (c - a) / dt : 0;
  if (Array.isArray(b)) return b.map((_, i) => slopeOf(a?.[i], b[i], c?.[i], dt));
  if (isObj(b)) {
    const out = {};
    for (const k of Object.keys(b)) out[k] = slopeOf(a?.[k] ?? b[k], b[k], c?.[k] ?? b[k], dt);
    return out;
  }
  return 0;                                     // discrete leaf: no slope
};
const scaleOf = (m, s) => (isNum(m) ? m * s : Array.isArray(m) ? m.map((v) => scaleOf(v, s)) : isObj(m) ? Object.fromEntries(Object.entries(m).map(([k, v]) => [k, scaleOf(v, s)])) : 0);
const zeroOf = (v) => scaleOf(v, 0);
const kindOf = (v) => (isNum(v) ? 'number' : Array.isArray(v) ? 'array' : isObj(v) ? 'object' : 'discrete');
/** Throws when two key values do not have the same form (see track). */
function sameForm(a, b, path, ta, tb) {
  const ka = kindOf(a), kb = kindOf(b);
  const fail = (why) => { throw new Error(`track: the keys at t=${ta} and t=${tb} have different forms at "${path}" (${why}) — every key must have the same shape; for puppet poses use E.poseTrack`); };
  if (ka !== kb) fail(`${ka} vs ${kb}`);
  if (ka === 'array') {
    if (a.length !== b.length) fail(`array of ${a.length} vs ${b.length}`);
    a.forEach((v, i) => sameForm(v, b[i], `${path}[${i}]`, ta, tb));
  } else if (ka === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a) || !(k in b)) fail(`"${k}" is missing in one of them`);
      sameForm(a[k], b[k], `${path}.${k}`, ta, tb);
    }
  }
}

/**
 * Keyframed value: track([{t, v, ease}], {mode}) -> (t) => value. v may be a number, an array or an
 * object tree of numbers; ALL KEYS MUST HAVE THE SAME FORM (checked here: a mismatch throws instead
 * of popping silently). Leaves that are not numbers (strings, booleans) are discrete: they hold and
 * switch on arrival at the next key, in every mode. For puppet poses — where a part may be a number
 * in one key and {rot, sprite} in the next, or missing — use E.poseTrack.
 *   mode 'ease'   (default) each segment eases from key to key with the ARRIVING key's `ease`
 *                 (default cubic.inOut): a move that settles on every key
 *   mode 'spline' one continuous C1 glide through all keys (no stops; eases out of the first and
 *                 into the last key)
 *   mode 'hold'   steps: the value of the last key reached
 * Before the first / after the last key the value is held.
 */
export function track(keys, { mode = 'ease' } = {}) {
  const K = [...keys].sort((a, b) => a.t - b.t);
  if (!K.length) throw new Error('track: no keys');
  for (let i = 1; i < K.length; i++) sameForm(K[i - 1].v, K[i].v, 'v', K[i - 1].t, K[i].t);
  const slope = (i) => (i <= 0 || i >= K.length - 1 ? zeroOf(K[i].v) : slopeOf(K[i - 1].v, K[i].v, K[i + 1].v, K[i + 1].t - K[i - 1].t));
  return (t) => {
    if (t <= K[0].t) return K[0].v;
    const last = K[K.length - 1];
    if (t >= last.t) return last.v;
    let i = 0;
    while (t > K[i + 1].t) i++;
    const a = K[i], b = K[i + 1], dt = b.t - a.t, u = (t - a.t) / dt;
    if (mode === 'hold') return t >= b.t - 1e-9 ? b.v : a.v;
    if (mode === 'spline') return hermite(a.v, b.v, scaleOf(slope(i), dt), scaleOf(slope(i + 1), dt), u);
    return mixValue(a.v, b.v, (b.ease ?? easing.cubic.inOut)(u));
  };
}

/** Blend two values of the same form (numbers, arrays, objects of numbers): u = 0 -> a, 1 -> b. */
export const mix = mixValue;

/**
 * The beat grid of stepped animation: `t0` moved DOWN to the nearest multiple of `every` frames
 * (never later, so a beat that leads its word still leads). Start every dab-in of a shot on the same
 * grid — then all of them land their stages on the same frames and the shot really reads "on twos"
 * (reveals that start on odd and even frames interleave into near-continuous change).
 */
export const beat = (t0, every = 2, fps = env.FPS) => (Math.floor((t0 * fps) / every + 1e-6) * every) / fps;

/**
 * Dab-in progress with an even hand-made cadence: exactly one reveal stage lands every `every`
 * frames, the first one ON t0. Use the sprite's own `steps` (painted.steps) so each stage is hit:
 *   sprite.draw(ctx, x, y, { p: E.dabP(t, 1.0, { steps: sprite.steps }) })      // dab in from t = 1.0
 *   sprite.draw(ctx, x, y, { p: 1 - E.dabP(t, 4.6, { steps: sprite.steps }) })  // dab out from t = 4.6
 * Duration = steps * every / fps (6 stages on twos = 0.4 s).
 * grid: true snaps t0 down to the shot's beat grid (multiples of `every` frames, see E.beat): use ONE
 * `every` per shot and `grid: true` on all its reveals, and their stages land on the same frames.
 */
export function dabP(t, t0 = 0, { steps = 6, every = 2, fps = env.FPS, grid = false } = {}) {
  const start = grid ? beat(t0, every, fps) : t0;
  return clamp(Math.floor(((t - start) * fps) / every + 1 + 1e-6) / steps);
}
