// Math + timing helpers. Everything is a pure function of its arguments (deterministic).

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => (b === a ? 0 : (x - a) / (b - a));
/** Map x from [a,b] to [c,d], clamped, optionally eased. */
export const remap = (x, a, b, c, d, ease) => {
  const u = clamp(invLerp(a, b, x));
  return c + (d - c) * (ease ? ease(u) : u);
};
export const smoothstep = (a, b, x) => {
  const t = clamp(invLerp(a, b, x));
  return t * t * (3 - 2 * t);
};
export const smootherstep = (a, b, x) => {
  const t = clamp(invLerp(a, b, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

const pw = (n) => ({
  in: (t) => Math.pow(t, n),
  out: (t) => 1 - Math.pow(1 - t, n),
  inOut: (t) => (t < 0.5 ? Math.pow(2 * t, n) / 2 : 1 - Math.pow(2 - 2 * t, n) / 2),
});
const c1 = 1.70158, c2 = c1 * 1.525, c3 = c1 + 1, c4 = TAU / 3, c5 = TAU / 4.5;

/** Easing set: ease.cubic.out(t) etc. All map [0,1] -> [0,1] (back/elastic overshoot). */
export const ease = {
  linear: (t) => t,
  quad: pw(2), cubic: pw(3), quart: pw(4), quint: pw(5),
  sine: {
    in: (t) => 1 - Math.cos((t * Math.PI) / 2),
    out: (t) => Math.sin((t * Math.PI) / 2),
    inOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  },
  expo: {
    in: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    out: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOut: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  },
  back: {
    in: (t) => c3 * t * t * t - c1 * t * t,
    out: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
    inOut: (t) => (t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2),
  },
  elastic: {
    in: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4)),
    out: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1),
    inOut: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1),
  },
};

/** Value going a -> b while t goes t0 -> t1 (clamped outside), with easing fn. */
export function tween(t, t0, t1, a = 0, b = 1, fn = ease.cubic.inOut) {
  if (t <= t0) return a;
  if (t >= t1) return b;
  return a + (b - a) * fn((t - t0) / (t1 - t0));
}

/**
 * Analytic spring response 0 -> 1 for elapsed time t >= 0 (returns 0 for t < 0).
 * damping = 1: critically damped (no overshoot). damping < 1: overshoots and settles.
 * freq is the natural frequency in Hz (higher = snappier).
 */
export function spring(t, { freq = 3, damping = 1 } = {}) {
  if (t <= 0) return 0;
  const w = TAU * freq;
  if (damping >= 1) return 1 - (1 + w * t) * Math.exp(-w * t);
  const wd = w * Math.sqrt(1 - damping * damping);
  return 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
}

/** Spring from a to b starting at time t0. */
export const springTo = (t, t0, a, b, opts) => a + (b - a) * spring(t - t0, opts);

/** Hold time on a coarser grid: stepped(t, 12) animates "on twos" at 24 → use 15 / 10 for 30 fps twos / threes. */
export const stepped = (t, fps = 15) => Math.floor(t * fps + 1e-6) / fps;

/** Quantise a 0..1 progress into n discrete steps (for dab-in reveals). */
export const quantize = (p, n) => Math.round(clamp(p) * n) / n;
