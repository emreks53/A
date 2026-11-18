// camera.js — 2D camera with per-layer parallax.
//
// A camera is a plain object {x, y, zoom, rot}: the world point (x, y) sits at the frame centre.
// The "home" camera {x: W/2, y: H/2, zoom: 1, rot: 0} maps world coordinates 1:1 to the frame, so
// lay scenes out in frame coordinates and move the camera around that.
//
// Parallax factor f per layer: 1 = subject plane (moves fully with the camera), 0 = infinitely far
// (ignores camera translation and zoom), > 1 = foreground (moves more). At the home camera every
// layer is drawn exactly where its coordinates say, whatever its factor.

import { env } from './surface.js';
import { clamp, lerp, TAU, ease as easing } from './ease.js';
import { hash2 } from './rng.js';

export const homeCamera = () => ({ x: env.W / 2, y: env.H / 2, zoom: 1, rot: 0 });

/** ctx.save() + camera transform for a layer with parallax factor f. Pair with ctx.restore(). */
export function applyCamera(ctx, cam, f = 1) {
  const cx = env.W / 2, cy = env.H / 2;
  const z = Math.exp(Math.log(cam.zoom) * f);
  ctx.save();
  ctx.translate(cx, cy);
  if (cam.rot) ctx.rotate(-cam.rot * Math.min(f, 1));
  ctx.scale(z, z);
  ctx.translate(-(cx + (cam.x - cx) * f), -(cy + (cam.y - cy) * f));
}

/** Convenience: run fn() inside the camera transform of a layer. */
export function withCamera(ctx, cam, f, fn) {
  applyCamera(ctx, cam, f);
  fn();
  ctx.restore();
}

/** Where a world point of a layer with parallax f lands on the frame (ignores rot). */
export function worldToFrame(cam, f, x, y) {
  const cx = env.W / 2, cy = env.H / 2;
  const z = Math.exp(Math.log(cam.zoom) * f);
  return [cx + (x - (cx + (cam.x - cx) * f)) * z, cy + (y - (cy + (cam.y - cy) * f)) * z];
}

/**
 * Keyframed camera path -> function (t) => camera.
 * keys: [{t, x, y, zoom, rot, ease}], sorted by t; missing fields inherit from the previous key
 * (first key from the home camera).
 *   mode 'ease'   (default) each segment eases from key to key with the arriving key's `ease`
 *                 (default cubic.inOut) — a move that settles on every key.
 *   mode 'spline' one continuous C1 glide through all keys (Catmull-Rom in time), no stops.
 * Zoom is interpolated geometrically, so pushes feel even.
 */
export function cameraPath(keys, { mode = 'ease' } = {}) {
  const K = [];
  let prev = homeCamera();
  for (const k of keys) {
    prev = { x: k.x ?? prev.x, y: k.y ?? prev.y, zoom: k.zoom ?? prev.zoom, rot: k.rot ?? prev.rot };
    K.push({ t: k.t, ease: k.ease ?? easing.cubic.inOut, x: prev.x, y: prev.y, lz: Math.log(prev.zoom), rot: prev.rot });
  }
  const F = ['x', 'y', 'lz', 'rot'];
  const out = (v) => ({ x: v.x, y: v.y, zoom: Math.exp(v.lz), rot: v.rot });
  const slope = (i, f) => {
    if (i <= 0 || i >= K.length - 1) return 0; // ease out of the first key and into the last
    return (K[i + 1][f] - K[i - 1][f]) / (K[i + 1].t - K[i - 1].t);
  };
  return (t) => {
    if (t <= K[0].t) return out(K[0]);
    const last = K[K.length - 1];
    if (t >= last.t) return out(last);
    let i = 0;
    while (t > K[i + 1].t) i++;
    const a = K[i], b = K[i + 1], dt = b.t - a.t, u = (t - a.t) / dt;
    const v = {};
    if (mode === 'spline') {
      const u2 = u * u, u3 = u2 * u;
      for (const f of F) {
        v[f] = (2 * u3 - 3 * u2 + 1) * a[f] + (u3 - 2 * u2 + u) * dt * slope(i, f)
          + (-2 * u3 + 3 * u2) * b[f] + (u3 - u2) * dt * slope(i + 1, f);
      }
    } else {
      const e = b.ease(u);
      for (const f of F) v[f] = lerp(a[f], b[f], e);
    }
    return out(v);
  };
}

/**
 * Slow organic drift to add on top of a camera (hand-held-on-a-tripod life), continuous in t.
 * Built from incommensurate sines, so the float never stalls; the zoom part only ever pushes IN
 * (>= 1.002 x the camera's zoom), which keeps every layer on the magnifying side of 1:1.
 * Returns a NEW camera. amp in px, period in s, zoom = depth of the breathing (0.004 = 0.4 %).
 */
export function driftCamera(cam, t, { seed = 1, amp = 8, period = 6, zoom = 0.004, rot = 0 } = {}) {
  const w = TAU / period, ph = (k) => hash2(seed, k, 77) * TAU;
  const wave = (k, f) => 0.58 * Math.sin(w * f * t + ph(k)) + 0.3 * Math.sin(w * f * 1.618 * t + ph(k + 1)) + 0.12 * Math.sin(w * f * 2.71 * t + ph(k + 2));
  return {
    x: cam.x + wave(0, 1) * amp,
    y: cam.y + wave(3, 0.83) * amp * 0.7,
    zoom: cam.zoom * (1.002 + zoom * (0.5 + 0.5 * wave(6, 0.6))),
    rot: cam.rot + wave(9, 0.7) * rot,
  };
}

/** Blend two cameras (u = 0 -> a, 1 -> b). */
export const mixCamera = (a, b, u) => ({
  x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u),
  zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), clamp(u))), rot: lerp(a.rot, b.rot, u),
});
