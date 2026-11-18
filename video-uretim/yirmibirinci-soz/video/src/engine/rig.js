// rig.js — cut-out puppet rig: rigid stencil parts in a joint hierarchy, drawn in their own z-order.
//
//   makeRig({parts})        -> { draw(ctx, x, y, pose, opts), joint(id, pose, opts), point(id, [x, y], pose, opts),
//                                reach(pose, upper, lower, target, opts), bounds(pose), bake(pose, opts),
//                                mask(opts), order, parts }
//   mixPose(a, b, u, opts)  blend two poses
//   poseTrack(keys, opts)   keyframed poses -> pose(t) (mixed forms, missing parts, per-part time offsets)
//   lagPose(poseFn, t, offsets)   overlap / follow-through: each part reads the pose a little later
//   ik2(root, target, l1, l2, bend, soft) -> [a1, a2]   two-bone IK angles
//
// A part: { sprite (Painted, anchored AT ITS JOINT), parent (id | null), at: [x, y] (joint position in
// the parent's local coordinates; for the root: offset from the rig origin), z (draw order, higher =
// in front; independent of the hierarchy), rest (rad, angle at pose 0), tip: [x, y] (optional end
// point in the part's own coordinates: hand, foot — used by reach()), edge (optional, see below),
// sprites: { name: Painted, … } (optional variants: open hand / fist, head turned … picked by the pose) }.
// A PROP part has `node` instead of `sprite`: anything with draw(ctx, x, y, opts) (a Painted, a group,
// another rig …) riding on its parent: { node, parent: 'foreR', at: [70, 0], z: 6.5 }.
// A pose: { partId: angle (rad, added to rest) | {rot, x, y, scale, sx, sy, z, sprite, hide} } — missing
// parts stay at rest. `scale` is uniform and inherited by the children; `sx` / `sy` stretch THIS part
// only, along / across its bone (foreshortening, squash and stretch): its children are not deformed,
// but their joints follow the stretched bone (the hand stays on the end of a forearm drawn at sx 0.7).
// `z` overrides the part's draw order for this pose (an arm passing behind the torso), `sprite` picks a
// variant from the part's `sprites`, `hide: true` skips the part (a prop not yet held).

import { clamp, lerp, ease as easing } from './ease.js';
import { scratch, bakeSprite } from './stencil.js';
import { blit } from './surface.js';
import { scatterDabs, Painted } from './sponge.js';
import { seedOf } from './rng.js';

const TAU = Math.PI * 2;
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const invert = (m) => {
  const det = m[0] * m[3] - m[1] * m[2];
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
};
const poseOf = (pose, id) => {
  const v = pose ? pose[id] : undefined;
  if (v === undefined || v === null) return { rot: 0, x: 0, y: 0, scale: 1, sx: 1, sy: 1 };
  if (typeof v === 'number') return { rot: v, x: 0, y: 0, scale: 1, sx: 1, sy: 1 };
  return { rot: v.rot ?? 0, x: v.x ?? 0, y: v.y ?? 0, scale: v.scale ?? 1, sx: v.sx ?? 1, sy: v.sy ?? 1, z: v.z, sprite: v.sprite, hide: v.hide };
};
const NUMS = ['rot', 'x', 'y', 'scale', 'sx', 'sy'], DISCRETE = ['z', 'sprite', 'hide'];
const REST = { rot: 0, x: 0, y: 0, scale: 1, sx: 1, sy: 1 };
/** The angle equivalent to `a` (mod 2 PI) that lies nearest to `near`. */
export const nearestAngle = (a, near = 0) => a - Math.round((a - near) / TAU) * TAU;

/**
 * Build a rig.
 *   rig.draw(ctx, x, y, pose, { p = 1, alpha = 1, scale = 1, rot = 0, flip = false, only })
 *       draws every part by z while each follows its parent chain; (x, y) = rig origin; rot turns
 *       the whole figure about the origin; flip mirrors it; only = [ids] draws a subset.
 *       NOTE flip mirrors the baked light too (upper-right light becomes upper-left): fine for a
 *       short turn; for a figure that faces left for long, bake a second sprite set with mirrored
 *       shapes and the normal light, and use that instead of flip.
 *   rig.joint(id, pose, {x, y, scale, rot, flip})        -> [wx, wy, angle] of the part's joint
 *   rig.point(id, [lx, ly], pose, {x, y, scale, rot, flip}) -> [wx, wy] of a point given in the part's own
 *       coordinates (attach a coin to the hand: rig.point('forearmR', rig.parts.forearmR.tip, pose, o))
 *   rig.reach(pose, upperId, lowerId, [tx, ty], {bend = 1, near = pose, soft = 0.08, x, y, scale, rot, flip})
 *       -> new pose in which the lower part's `tip` lands on the target (two-bone IK; bend = ±1 picks
 *       the elbow side). The two returned angles are UNWRAPPED to the turn nearest to the same parts in
 *       `near` (default: the pose passed in), so they never jump by 2 PI between frames. soft: within
 *       the last `soft` part of the arm's length the reach is compressed asymptotically, so the
 *       elbow eases straight instead of snapping (the tip then stops up to ~3 % of the arm length
 *       short of a target at full stretch; soft: 0 = exact everywhere). Unreachable targets are
 *       approached as far as the limb goes.
 *       ANIMATING A REACH: blend the TARGET point (E.track / E.mix / an E.arc) and call reach on every
 *       frame; never blend two reach results (two IK solutions are not neighbours in angle space).
 * Part option `edge: {color, width = 4, opacity = 0.4, dir = [-0.7, 0.7]}` prints a soft shadow band
 * just inside the part's edge on the side `dir` given in WORLD space (it stays lower-left however
 * the limb turns) — the S-050 way to separate a limb from a same-coloured torso behind it. While the
 * figure is dabbed in (p < 1) the band is printed through the same stage as the part.
 */
export function makeRig({ parts }) {
  const ids = Object.keys(parts);
  for (const id of ids) {
    const pr = parts[id].parent;
    if (pr != null && !parts[pr]) throw new Error(`rig part "${id}": unknown parent "${pr}"`);
  }
  const index = new Map(ids.map((id, i) => [id, i]));
  const sortBy = (zOf) => ids.map((id) => [id, zOf(id)]).sort((a, b) => a[1] - b[1] || index.get(a[0]) - index.get(b[0])).map((e) => e[0]);
  const order = sortBy((id) => parts[id].z ?? 0);
  const rootM = ({ x = 0, y = 0, scale = 1, rot = 0, flip = false } = {}) => {
    const c = Math.cos(rot) * scale, s = Math.sin(rot) * scale, f = flip ? -1 : 1;
    return [c * f, s * f, -s, c, x, y];
  };
  // the joint of a part sits at `at` in its parent's coordinates, carried along by the parent's own
  // stretch (sx, sy); the part's FRAME (what its children hang on) has rotation + uniform scale only
  const local = (id, pose) => {
    const pt = parts[id], q = poseOf(pose, id), a = (pt.rest ?? 0) + q.rot;
    const c = Math.cos(a) * q.scale, s = Math.sin(a) * q.scale;
    const pq = pt.parent != null ? poseOf(pose, pt.parent) : REST;
    return [c, s, -s, c, (pt.at?.[0] ?? 0) * pq.sx + q.x, (pt.at?.[1] ?? 0) * pq.sy + q.y];
  };
  const world = (id, pose, base, memo) => {
    if (memo.has(id)) return memo.get(id);
    const pr = parts[id].parent;
    const m = mul(pr != null ? world(pr, pose, base, memo) : base, local(id, pose));
    memo.set(id, m);
    return m;
  };
  /** frame matrix x the part's own stretch: where its sprite (and points given in its coordinates) land */
  const drawM = (id, pose, base, memo) => {
    const m = world(id, pose, base, memo), q = poseOf(pose, id);
    return q.sx === 1 && q.sy === 1 ? m : [m[0] * q.sx, m[1] * q.sx, m[2] * q.sy, m[3] * q.sy, m[4], m[5]];
  };
  const rig = {
    parts, order,
    draw(ctx, x = 0, y = 0, pose = {}, { p = 1, alpha = 1, scale = 1, rot = 0, flip = false, only = null, through = null } = {}) {
      if (through && p < 1) {
        // ONE reveal mask over the composed figure (rig coordinates: it travels with the figure)
        const stage = through.at(p);
        if (!stage) return;
        if (stage !== through.final) {
          // (one scratch per mask size: a scratch only grows, and a canvas drawn well below 1:1 is
          // resampled through mip levels of the WHOLE canvas — a shared, larger one would leak in)
          const s = scratch(through.w, through.h, `rigthrough:${through.w}x${through.h}`), c = s.ctx;
          c.save();
          rig.draw(c, through.ax, through.ay, pose, { only });
          c.restore();
          c.setTransform(s.res, 0, 0, s.res, 0, 0);
          c.globalAlpha = 1;
          c.globalCompositeOperation = 'destination-in';
          c.drawImage(stage.canvas, 0, 0, stage.w, stage.h);
          c.globalCompositeOperation = 'source-over';
          const b = rootM({ x, y, scale, rot, flip }), cw = Math.ceil(through.w * s.res), ch = Math.ceil(through.h * s.res);
          const prev = ctx.globalAlpha;
          ctx.save();
          ctx.transform(b[0], b[1], b[2], b[3], b[4], b[5]);
          ctx.globalAlpha = prev * alpha;
          ctx.drawImage(s.canvas, 0, 0, cw, ch, -through.ax, -through.ay, cw / s.res, ch / s.res);
          ctx.restore();
          return;
        }
        p = 1;
      }
      const base = rootM({ x, y, scale, rot, flip }), memo = new Map();
      // per-pose z overrides re-sort the draw order (only when a pose asks for it)
      let ord = order;
      if (pose) for (const id of ids) if (pose[id] && typeof pose[id] === 'object' && pose[id].z !== undefined) { ord = sortBy((k) => poseOf(pose, k).z ?? parts[k].z ?? 0); break; }
      for (const id of ord) {
        if (only && !only.includes(id)) continue;
        const pt = parts[id], q = poseOf(pose, id);
        if (q.hide) continue;
        const sp = (q.sprite !== undefined && pt.sprites ? pt.sprites[q.sprite] : null) ?? pt.sprite ?? null;
        if (!sp && !pt.node) continue;
        const m = drawM(id, pose, base, memo);
        ctx.save();
        ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
        if (!sp) { pt.node.draw(ctx, 0, 0, { p, alpha }); ctx.restore(); continue; }
        sp.draw(ctx, 0, 0, { p, alpha });
        const stage = pt.edge && p > 0 ? sp.at(p) : null;
        if (stage) {
          // shadow band on the world-space side `dir`: silhouette minus the silhouette shifted away;
          // during a dab-in it is cut by the part's current reveal stage, so it arrives with the paint
          const { color, width = 4, opacity = 0.4, dir = [-0.7, 0.7] } = pt.edge;
          const k = Math.hypot(m[0], m[1]) || 1, k2 = Math.hypot(m[2], m[3]) || 1;
          const lx = (dir[0] * m[0] + dir[1] * m[1]) / (k * k), ly = (dir[0] * m[2] + dir[1] * m[3]) / (k2 * k2);
          const s = scratch(sp.w, sp.h, `rig:${sp.w}x${sp.h}`), c = s.ctx;
          blit(c, sp.final);
          c.globalCompositeOperation = 'source-in';
          c.fillStyle = color;
          c.fillRect(0, 0, sp.w, sp.h);
          c.globalCompositeOperation = 'destination-out';
          blit(c, sp.final, -lx * width, -ly * width);
          if (stage !== sp.final) {
            c.globalCompositeOperation = 'destination-in';
            blit(c, stage);
          }
          c.globalCompositeOperation = 'source-over';
          const prev = ctx.globalAlpha;
          ctx.globalAlpha = prev * opacity * alpha;
          const cw = Math.ceil(sp.w * s.res), ch = Math.ceil(sp.h * s.res);
          ctx.drawImage(s.canvas, 0, 0, cw, ch, -sp.ax, -sp.ay, cw / s.res, ch / s.res);
          ctx.globalAlpha = prev;
        }
        ctx.restore();
      }
    },
    joint(id, pose = {}, o = {}) {
      const m = world(id, pose, rootM(o), new Map());
      return [m[4], m[5], Math.atan2(m[1], m[0])];
    },
    point(id, pt = [0, 0], pose = {}, o = {}) {
      return apply(drawM(id, pose, rootM(o), new Map()), pt[0], pt[1]);
    },
    reach(pose, upperId, lowerId, target, { bend = 1, near = pose, soft = 0.08, ...o } = {}) {
      const up = parts[upperId], lo = parts[lowerId];
      if (lo.parent !== upperId) throw new Error(`rig.reach: "${lowerId}" must be a child of "${upperId}"`);
      const tip = lo.tip ?? [Math.hypot(...(lo.at ?? [0, 0])), 0];
      const base = rootM(o), memo = new Map();
      const pm = up.parent != null ? world(up.parent, pose, base, memo) : base;
      const q = poseOf(pose, upperId);
      const pq = up.parent != null ? poseOf(pose, up.parent) : REST;
      const frame = mul(pm, [1, 0, 0, 1, (up.at?.[0] ?? 0) * pq.sx + q.x, (up.at?.[1] ?? 0) * pq.sy + q.y]); // joint frame, unrotated
      const [tx, ty] = apply(invert(frame), target[0], target[1]);
      // bone vectors as posed: the elbow follows the upper part's stretch, the tip the lower part's
      const ql = poseOf(pose, lowerId);
      const e = [lo.at[0] * q.sx * q.scale, lo.at[1] * q.sy * q.scale], h = [tip[0] * ql.sx * q.scale * ql.scale, tip[1] * ql.sy * q.scale * ql.scale];
      const l1 = Math.hypot(e[0], e[1]), l2 = Math.hypot(h[0], h[1]);
      const off1 = Math.atan2(e[1], e[0]), off2 = Math.atan2(h[1], h[0]);
      // (bend is meant in the figure's own frame: a flipped figure mirrors its elbows too)
      const [a1, a2] = ik2([0, 0], [tx, ty], l1, l2, bend, soft);
      const tidy = (v) => { for (const k of ['z', 'sprite', 'hide']) if (v[k] === undefined) delete v[k]; return v; };
      return {
        ...pose,
        [upperId]: tidy({ ...q, rot: nearestAngle(a1 - off1 - (up.rest ?? 0), poseOf(near, upperId).rot) }),
        [lowerId]: tidy({ ...ql, rot: nearestAngle(a2 + off1 - off2 - (lo.rest ?? 0), poseOf(near, lowerId).rot) }),
      };
    },
    /** [x0, y0, x1, y1] of the whole figure in a pose, in rig coordinates (origin = rig origin). */
    bounds(pose = {}, { pad = 4 } = {}) {
      const base = rootM(), memo = new Map();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const id of ids) {
        const pt = parts[id], q = poseOf(pose, id);
        if (q.hide) continue;
        const sp = (q.sprite !== undefined && pt.sprites ? pt.sprites[q.sprite] : null) ?? pt.sprite ?? pt.node ?? null;
        if (!sp || sp.w === undefined) continue;
        const m = drawM(id, pose, base, memo), ax = sp.ax ?? 0, ay = sp.ay ?? 0;
        for (const [cx, cy] of [[-ax, -ay], [sp.w - ax, -ay], [-ax, sp.h - ay], [sp.w - ax, sp.h - ay]]) {
          const [wx, wy] = apply(m, cx, cy);
          x0 = Math.min(x0, wx); y0 = Math.min(y0, wy); x1 = Math.max(x1, wx); y1 = Math.max(y1, wy);
        }
      }
      return x1 < x0 ? [0, 0, 1, 1] : [Math.floor(x0 - pad), Math.floor(y0 - pad), Math.ceil(x1 + pad), Math.ceil(y1 + pad)];
    },
    /**
     * The whole figure in one pose as ONE sprite (anchor = rig origin): its dab-in / dab-out then runs
     * through one mask over the composed figure — no per-limb speckle, no lower part showing through
     * the holes of an upper one. opts: reveal {steps, order, from, angle, dab…}, steps, seed, pad,
     * density (2 = baked at twice the device resolution: stays sharp under a 2x camera zoom).
     * Draw it while the figure holds still (the dab-in), then switch to rig.draw for the acting.
     */
    bake(pose = {}, { reveal = {}, steps = reveal.steps ?? 6, seed = 1, pad = 4, density = 1, bounds = null } = {}) {
      return bakeSprite({
        bounds: bounds ?? rig.bounds(pose, { pad }), anchor: [0, 0], seed, steps, reveal, density,
        dabSize: reveal.dab ?? null, draw: (c) => rig.draw(c, 0, 0, pose),
      });
    },
    /**
     * An ordered mask of sponge prints in rig coordinates, for rig.draw(ctx, x, y, pose, {through: mask, p}):
     * a whole-figure reveal that works while the figure MOVES (the mask rides on the rig origin and
     * follows x, y, rot, scale, flip). bounds: [x0, y0, x1, y1] that covers every pose of the reveal
     * (default: rig.bounds(pose) grown by 30 px); steps, dab (print size), order / from / angle / jitter, seed.
     * While p < 1 the figure is composed in a scratch surface at the render scale (not at a part's
     * bake density) — fine for the few frames of a stepped dab-in.
     */
    mask({ pose = {}, bounds = null, steps = 6, dab = null, seed = 1, ...order } = {}) {
      const [x0, y0, x1, y1] = bounds ?? rig.bounds(pose, { pad: 30 });
      const w = x1 - x0, h = y1 - y0;
      const rv = { order: 'sweep', angle: -Math.PI / 2, jitter: 0.25, ...order, layerMix: 0, even: 'area' };
      if (rv.from) rv.from = [rv.from[0] - x0, rv.from[1] - y0];
      const dabs = scatterDabs([{ color: '#FFFFFF', coverage: 0.993, size: dab ?? clamp(Math.min(w, h) * 0.45, 40, 160), stamps: 'body', tints: 1, pores: 0 }],
        { w, h, seed: seedOf('rigmask', seed), reveal: rv });
      const post = (s) => {            // translucent prints -> near-opaque mask
        const c = s.ctx;
        c.save();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'source-over';
        c.drawImage(s.canvas, 0, 0);
        c.drawImage(s.canvas, 0, 0);
        c.restore();
      };
      return new Painted({ w, h, ax: -x0, ay: -y0, dabs, steps, post, mode: 'build', seed });
    },
  };
  return rig;
}

/**
 * Two-bone IK. root, target: [x, y]; l1, l2: bone lengths; bend = +1 / -1 picks the side the middle
 * joint bends to. Returns [a1, a2]: a1 = direction of the first bone (rad, same space as the
 * points), a2 = turn of the second bone RELATIVE to the first. Out-of-reach targets are clamped.
 * soft (0..0.5, default 0): soft IK — beyond (1 - soft) of the full length the distance is compressed
 * asymptotically toward full stretch, so the middle joint straightens smoothly instead of snapping.
 */
export function ik2(root, target, l1, l2, bend = 1, soft = 0) {
  const dx = target[0] - root[0], dy = target[1] - root[1];
  const L = l1 + l2;
  let d = Math.hypot(dx, dy);
  if (soft > 0) {
    const da = L * (1 - soft);
    if (d > da) d = da + (L - da) * (1 - Math.exp(-(d - da) / (L - da)));
  }
  d = clamp(d, Math.abs(l1 - l2) + 1e-4, L - 1e-4);
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const cosB = clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1);
  const s = bend >= 0 ? 1 : -1;
  return [Math.atan2(dy, dx) - s * Math.acos(cosA), s * (Math.PI - Math.acos(cosB))];
}

/**
 * Blend two poses (u = 0 -> a, 1 -> b); parts missing in one pose count as rest. Discrete pose
 * values (z, sprite, hide) switch at u >= 0.5. opts.shortest: true turns every joint the short way
 * round (angle differences are wrapped to ±PI) — use it when either pose came out of IK or atan2;
 * the default (false) blends the raw numbers, so a deliberate full turn (rot: 2 PI) stays a turn.
 */
export function mixPose(a = {}, b = {}, u = 0, { shortest = false } = {}) {
  const out = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const p = poseOf(a, id), q = poseOf(b, id);
    const simple = typeof (a[id] ?? 0) === 'number' && typeof (b[id] ?? 0) === 'number';
    const rot = lerp(p.rot, shortest ? nearestAngle(q.rot, p.rot) : q.rot, u);
    if (simple) { out[id] = rot; continue; }
    const d = u >= 0.5 ? q : p;
    out[id] = { rot, x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u), scale: lerp(p.scale, q.scale, u), sx: lerp(p.sx, q.sx, u), sy: lerp(p.sy, q.sy, u) };
    if (d.z !== undefined) out[id].z = d.z;
    if (d.sprite !== undefined) out[id].sprite = d.sprite;
    if (d.hide !== undefined) out[id].hide = d.hide;
  }
  return out;
}

/**
 * Keyframed poses: poseTrack([{t, v: pose, ease}], opts) -> (t) => pose. Unlike the generic E.track it
 * knows what a pose is: a part may be a plain angle in one key and {rot, x, sprite, …} in the next, or
 * be missing (= at rest) — everything is normalised first, so nothing pops.
 *   rot / x / y / scale / sx / sy   interpolate ('ease': each segment with the ARRIVING key's ease,
 *                                   default cubic.inOut; 'spline': one continuous Catmull-Rom glide)
 *   z / sprite / hide               discrete: they switch on ARRIVAL at the key that sets them
 *   shortest: true                  every joint turns the short way between keys (poses from IK / atan2)
 *   offsets: {partId: seconds}      overlap / follow-through: that part reads the track `seconds`
 *                                   later than the rest (forearm 2 frames after the upper arm, head 3)
 * Before the first / after the last key the pose is held. Blend the TARGET of an IK reach instead
 * of two reached poses; apply rig.reach to the pose this returns.
 */
export function poseTrack(keys, { mode = 'ease', shortest = false, offsets = null } = {}) {
  const K = [...keys].sort((a, b) => a.t - b.t);
  if (!K.length) throw new Error('poseTrack: no keys');
  const idsOf = new Set(K.flatMap((k) => Object.keys(k.v ?? {})));
  // per part: normalised values per key (rot unwrapped when `shortest`)
  const P = {};
  for (const id of idsOf) {
    const vals = K.map((k) => poseOf(k.v, id));
    if (shortest) for (let i = 1; i < vals.length; i++) vals[i] = { ...vals[i], rot: nearestAngle(vals[i].rot, vals[i - 1].rot) };
    const plain = K.every((k) => typeof (k.v?.[id] ?? 0) === 'number');
    P[id] = { vals, plain };
  }
  const partAt = (id, t) => {
    const { vals, plain } = P[id], n = K.length;
    let a, b, u = 0, i = 0;
    if (t <= K[0].t) { a = b = vals[0]; } else if (t >= K[n - 1].t) { a = b = vals[n - 1]; i = n - 1; u = 1; } else {
      while (t > K[i + 1].t) i++;
      a = vals[i]; b = vals[i + 1];
      u = (t - K[i].t) / (K[i + 1].t - K[i].t);
    }
    const out = {};
    for (const f of NUMS) {
      if (a === b) out[f] = a[f];
      else if (mode === 'spline') {
        const dt = K[i + 1].t - K[i].t;
        const m0 = i > 0 ? ((b[f] - vals[i - 1][f]) / (K[i + 1].t - K[i - 1].t)) * dt : 0;
        const m1 = i + 2 < n ? ((vals[i + 2][f] - a[f]) / (K[i + 2].t - K[i].t)) * dt : 0;
        const u2 = u * u, u3 = u2 * u;
        out[f] = (2 * u3 - 3 * u2 + 1) * a[f] + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * b[f] + (u3 - u2) * m1;
      } else out[f] = lerp(a[f], b[f], (K[i + 1].ease ?? easing.cubic.inOut)(u));
    }
    const d = a === b || u >= 1 - 1e-9 ? b : a;      // discrete values: on arrival
    if (plain) return out.rot;
    for (const f of DISCRETE) if (d[f] !== undefined) out[f] = d[f];
    return out;
  };
  return (t) => {
    const pose = {};
    for (const id of idsOf) pose[id] = partAt(id, t - (offsets?.[id] ?? 0));
    return pose;
  };
}

/**
 * Overlap / follow-through for any pose function: lagPose(poseFn, t, {foreR: 2 / 30, head: 3 / 30})
 * -> the pose at t, except that each listed part is read `seconds` later (it starts and settles
 * after the part that drives it). Offsets are whole frames in a stepped style (n / 30). Apply it
 * BEFORE rig.reach (never lag the two bones of an IK chain apart: lag the reach TARGET instead).
 */
export function lagPose(poseFn, t, offsets = {}) {
  const pose = { ...poseFn(t) };
  const cache = new Map();
  for (const [id, dt] of Object.entries(offsets)) {
    if (!dt) continue;
    if (!cache.has(dt)) cache.set(dt, poseFn(t - dt));
    const v = cache.get(dt)[id];
    if (v !== undefined) pose[id] = v; else delete pose[id];
  }
  return pose;
}
