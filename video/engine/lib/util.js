// Shared math / animation helpers. Everything here is deterministic (no Math.random).
import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
export const remap = (x, a, b, c, d) => lerp(c, d, invLerp(a, b, x));
export const smoothstep = (a, b, x) => { const t = invLerp(a, b, x); return t * t * (3 - 2 * t); };
export const smootherstep = (a, b, x) => { const t = invLerp(a, b, x); return t * t * t * (t * (t * 6 - 15) + 10); };

// Easing functions: all map [0,1] -> [0,1] (some overshoot).
export const ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: t => t * t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: t => Math.sin(t * Math.PI / 2),
  inExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: t => (t === 0 ? 0 : t === 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  inOutBack: (t, s = 1.70158 * 1.525) => (t < .5 ? (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2 : (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2),
  outElastic: t => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI) / 3) + 1),
  outBounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; },
};

// Progress of t through [t0,t1] with easing (clamped). e can be a name or function.
export function prog(t, t0, t1, e = 'inOutCubic') {
  const f = typeof e === 'function' ? e : ease[e];
  return f(clamp((t - t0) / (t1 - t0)));
}

// Keyframes: kf(t, [[t0, v0], [t1, v1], ...], easing) for numbers, arrays or THREE.Vector3/Color.
// Easing applies to each segment. Holds the first/last value outside the range.
export function kf(t, keys, e = 'inOutCubic') {
  if (t <= keys[0][0]) return clone(keys[0][1]);
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, va] = keys[i], [tb, vb] = keys[i + 1];
    if (t <= tb) {
      const segEase = keys[i][2] || e;
      const p = prog(t, ta, tb, segEase);
      return mix(va, vb, p);
    }
  }
  return clone(keys[keys.length - 1][1]);
}
function clone(v) { return (v && v.clone) ? v.clone() : Array.isArray(v) ? v.slice() : v; }
export function mix(a, b, p) {
  if (typeof a === 'number') return a + (b - a) * p;
  if (Array.isArray(a)) return a.map((x, i) => x + (b[i] - x) * p);
  if (a.isVector3) return a.clone().lerp(b, p);
  if (a.isVector2) return a.clone().lerp(b, p);
  if (a.isColor) return a.clone().lerp(b, p);
  throw new Error('mix: unsupported');
}

// Seeded RNG (mulberry32). r() -> [0,1). Helpers: r.range(a,b), r.int(a,b), r.pick(arr), r.gauss()
export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  const r = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (a, b) => a + (b - a) * r();
  r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.gauss = () => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return r;
}

// Smooth deterministic noise (value-noise based) for organic wobble: noise1(x, seed) in [-1,1]
export function noise1(x, seed = 0) {
  const h = n => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return (lerp(h(i), h(i + 1), u)) * 2 - 1;
}
// Fractal noise 1D
export function fbm1(x, seed = 0, oct = 3) { let a = 0, amp = .5, f = 1; for (let i = 0; i < oct; i++) { a += amp * noise1(x * f, seed + i * 17); amp *= .5; f *= 2; } return a; }

// Hand-held / floating camera shake: returns small offsets vector
export function shake(t, amp = 0.02, freq = 0.6, seed = 3) {
  return new THREE.Vector3(fbm1(t * freq, seed) * amp, fbm1(t * freq, seed + 5) * amp, fbm1(t * freq, seed + 9) * amp * .5);
}

// Camera rig: path of positions + targets (CatmullRom), driven by eased progress.
// rig = cameraRig(camera, {pos:[[x,y,z],...], look:[[x,y,z],...], t0, t1, ease, fov:[[t,fov],...]})
export function cameraRig(camera, o) {
  const pc = new THREE.CatmullRomCurve3(o.pos.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  const lc = new THREE.CatmullRomCurve3((o.look || o.pos.map(() => [0, 0, 0])).map(p => new THREE.Vector3(...p)), false, 'centripetal');
  return {
    pos: pc, look: lc,
    update(t, extra = {}) {
      const p = prog(t, o.t0, o.t1, o.ease || 'inOutSine');
      // o.arc: arc-length parametrisation (constant speed along unequal segments; avoids speed kinks at knots)
      const P = o.arc ? pc.getPointAt(p) : pc.getPoint(p), L = o.arc ? lc.getPointAt(p) : lc.getPoint(p);
      if (o.shake) P.add(shake(t, o.shake.amp ?? .02, o.shake.freq ?? .5, 7));
      camera.position.copy(P); camera.lookAt(L);
      if (o.roll) camera.rotateZ(typeof o.roll === 'function' ? o.roll(t) : o.roll);
      if (o.fov) { camera.fov = kf(t, o.fov); camera.updateProjectionMatrix(); }
      return p;
    },
  };
}

export const deg = d => d * Math.PI / 180;
export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const col = c => new THREE.Color(c);
