// stencil.js — razor-sharp stencil-cut objects with sponge-speckled interiors.
//
//   shape.*            small Path2D builders that also know their bounds (and outline points)
//   bakeStencil(spec)  -> Painted sprite: sponge layers cut by the stencil, with optional inner edge
//                         prints (lavender blush just inside the edge), slit lines (dome ribs),
//                         ornament prints, under-bleed specks and dab-by-dab reveal. Texture is baked
//                         into the sprite, so it moves rigidly with the object and never swims.
//   stencilText(...)   stencil lettering, measured automatically (whole word or per letter)
//   drawStencil(...)   live variant for shapes that change every frame (clip + anchored texture)
//   bakeSprite(...)    cache any drawing as a Painted (mask-reveal capable)
//   group(...)         draw several Painted parts with staggered reveal windows

import { Painted, scatterDabs, makePoreTile, rankDabs, evenRanksByArea } from './sponge.js';
import { surface, blit, env } from './surface.js';
import { clamp, lerp, TAU } from './ease.js';
import { makeRng, seedOf } from './rng.js';
import { curve } from './motion.js';

// ------------------------------------------------------------------ shapes

const boundsOf = (pts) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
};
/** {path, bounds, pts}: pts = closed outline as a polyline (used by morph / dashes / dots). */
const mk = (path, x0, y0, x1, y1, pts = null) => ({ path, bounds: [x0, y0, x1, y1], pts });
const polyPath = (pts) => {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
};
const bez = (p0, p1, p2, p3, n, out) => {
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
};

/** Points of a closed Catmull-Rom spline through pts (k samples per span). */
function splinePts(pts, tension = 0.5, k = 10) {
  const n = pts.length, c = tension / 3, out = [];
  const at = (i) => pts[(i + n) % n];
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    if (!i) out.push([p1[0], p1[1]]);
    bez(p1, [p1[0] + (p2[0] - p0[0]) * c, p1[1] + (p2[1] - p0[1]) * c], [p2[0] - (p3[0] - p1[0]) * c, p2[1] - (p3[1] - p1[1]) * c], p2, k, out);
  }
  out.pop();
  return out;
}

/** Cumulative arc lengths of a polyline (closed adds the closing segment). */
function arcLengths(pts, closed) {
  const L = [0];
  const n = pts.length;
  for (let i = 1; i < (closed ? n + 1 : n); i++) {
    const a = pts[i - 1], b = pts[i % n];
    L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return L;
}
/** Point + tangent at arc length s on a polyline. */
function atLength(pts, L, s, closed) {
  const n = pts.length, total = L[L.length - 1];
  if (closed) s = ((s % total) + total) % total; else s = clamp(s, 0, total);
  let lo = 0, hi = L.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (L[m] <= s) lo = m; else hi = m;
  }
  const a = pts[lo % n], b = pts[(lo + 1) % n], seg = L[lo + 1] - L[lo] || 1, u = (s - L[lo]) / seg;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, (b[0] - a[0]) / seg, (b[1] - a[1]) / seg];
}
/** n points evenly spaced by arc length along a closed outline. */
function resample(pts, n) {
  const L = arcLengths(pts, true), total = L[L.length - 1];
  return Array.from({ length: n }, (_, i) => atLength(pts, L, (i / n) * total, true).slice(0, 2));
}
const outlineOf = (s) => {
  const pts = Array.isArray(s) ? s : s.pts ?? s.contours?.[0];
  if (!pts) throw new Error('shape has no outline points (a custom path cannot be used here: build it from shape.* or use bakeStencil({outline}))');
  return pts;
};
/** Every closed outline of a shape: [pts, …] (one for simple shapes; ring = 2; union = its members'). */
const contoursOf = (s) => {
  const c = s.contours ?? (s.pts ? [s.pts] : null);
  if (!c || !c.length) throw new Error('shape has no outline points (a custom path cannot be used here: build it from shape.* or use bakeStencil({outline}))');
  return c;
};
const signedArea = (P) => P.reduce((sum, q, i) => sum + q[0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * q[1], 0) / 2;
const morphCache = new WeakMap();

const centroidOf = (P) => P.reduce((c, q) => [c[0] + q[0] / P.length, c[1] + q[1] / P.length], [0, 0]);
const dotCache = new WeakMap();
/**
 * Stand-in for contour i of shape `has` on the side (`lacks`) that has no such contour: a tiny circle
 * placed like that contour relative to the first one (so a hole closes where it sits), same winding.
 */
function dotFor(has, i, lacks) {
  let m = dotCache.get(has);
  if (!m) dotCache.set(has, (m = new Map()));
  let byI = m.get(lacks);
  if (!byI) m.set(lacks, (byI = new Map()));
  if (!byI.has(i)) {
    const H = contoursOf(has), L = contoursOf(lacks);
    const c0 = centroidOf(H[0]), ci = centroidOf(H[i]), l0 = centroidOf(L[0]);
    const cx = l0[0] + ci[0] - c0[0], cy = l0[1] + ci[1] - c0[1], dir = Math.sign(signedArea(H[i])) || 1;
    byI.set(i, Array.from({ length: 24 }, (_, k) => [cx + Math.cos((dir * k / 24) * TAU) * 0.02, cy + Math.sin((dir * k / 24) * TAU) * 0.02]));
  }
  return byI.get(i);
}
/** In-between of two closed outlines (point lists); pairs are cached. See shape.morph for the modes. */
function morphOutline(PA, PB, t, n, mode, align) {
  const key = `${mode}|${n}|${align === null ? '' : typeof align === 'number' ? align : 'i' + align.index}`;
  let m = morphCache.get(PA);
  if (!m) morphCache.set(PA, (m = new Map()));
  let byB = m.get(PB);
  if (!byB) m.set(PB, (byB = new Map()));
  let pair = byB.get(key);
  const cen = centroidOf;
  if (!pair) {
    if (mode === 'radial') {
      // radius of the outline along n rays from the centroid (farthest crossing)
      const polar = (P) => {
        const c = cen(resample(P, 240));
        const rad = new Float64Array(n);
        for (let i = 0; i < n; i++) {
          const an = (i / n) * TAU - Math.PI / 2, dx = Math.cos(an), dy = Math.sin(an);
          let best = 0;
          for (let k = 0; k < P.length; k++) {
            const p0 = P[k], p1 = P[(k + 1) % P.length];
            const ex = p1[0] - p0[0], ey = p1[1] - p0[1], den = dx * ey - dy * ex;
            if (Math.abs(den) < 1e-9) continue;
            const tt = ((p0[0] - c[0]) * ey - (p0[1] - c[1]) * ex) / den, v = ((p0[0] - c[0]) * dy - (p0[1] - c[1]) * dx) / den;
            if (tt > best && v >= -1e-9 && v <= 1 + 1e-9) best = tt;
          }
          rad[i] = best;
        }
        return { c, rad };
      };
      pair = { A: polar(PA), B: polar(PB) };
    } else {
      const A0 = resample(PA, n);
      let B = resample(PB, n);
      if (Math.sign(signedArea(A0)) !== Math.sign(signedArea(B))) B.reverse();
      const ca = cen(A0), cb = cen(B);
      let A = A0, best = 0;
      if (typeof align === 'number') {
        // start both outlines at their point in direction `align` from the centroid
        const startAt = (P, c) => {
          let bi = 0, bd = Infinity;
          P.forEach((q, i) => {
            let d = Math.atan2(q[1] - c[1], q[0] - c[0]) - align;
            d = Math.abs(d - Math.round(d / TAU) * TAU);
            if (d < bd) { bd = d; bi = i; }
          });
          return P.map((_, i) => P[(i + bi) % n]);
        };
        A = startAt(A0, ca);
        B = startAt(B, cb);
      } else if (align && Number.isFinite(align.index)) best = ((Math.round(align.index) % n) + n) % n;
      else {
        let bestD = Infinity;
        for (let sft = 0; sft < n; sft++) {
          let d = 0;
          for (let i = 0; i < n; i += 2) {
            const q = B[(i + sft) % n];
            d += (A[i][0] - ca[0] - q[0] + cb[0]) ** 2 + (A[i][1] - ca[1] - q[1] + cb[1]) ** 2;
          }
          if (d < bestD) { bestD = d; best = sft; }
        }
      }
      if (best) B = B.map((_, i) => B[(i + best) % n]);
      pair = { A, B };
    }
    byB.set(key, pair);
  }
  if (mode === 'radial') {
    const cx = lerp(pair.A.c[0], pair.B.c[0], t), cy = lerp(pair.A.c[1], pair.B.c[1], t);
    return Array.from({ length: n }, (_, i) => {
      const an = (i / n) * TAU - Math.PI / 2, r = lerp(pair.A.rad[i], pair.B.rad[i], t);
      return [cx + Math.cos(an) * r, cy + Math.sin(an) * r];
    });
  }
  return pair.A.map((q, i) => [lerp(q[0], pair.B[i][0], t), lerp(q[1], pair.B[i][1], t)]);
}

export const shape = {
  rect(x, y, w, h) {
    const p = new Path2D();
    p.rect(x, y, w, h);
    return mk(p, x, y, x + w, y + h, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  },
  roundRect(x, y, w, h, r) {
    const p = new Path2D();
    p.roundRect(x, y, w, h, r);
    const rr = Math.min(r, w / 2, h / 2), pts = [];
    for (const [cx, cy, a0] of [[x + w - rr, y + rr, -Math.PI / 2], [x + w - rr, y + h - rr, 0], [x + rr, y + h - rr, Math.PI / 2], [x + rr, y + rr, Math.PI]]) {
      for (let i = 0; i <= 6; i++) pts.push([cx + Math.cos(a0 + (i / 6) * Math.PI / 2) * rr, cy + Math.sin(a0 + (i / 6) * Math.PI / 2) * rr]);
    }
    return mk(p, x, y, x + w, y + h, pts);
  },
  ellipse(cx, cy, rx, ry = rx, rot = 0) {
    const p = new Path2D();
    p.ellipse(cx, cy, rx, ry, rot, 0, TAU);
    const m = Math.max(rx, ry), c = Math.cos(rot), s = Math.sin(rot);
    const pts = Array.from({ length: 56 }, (_, i) => {
      const a = (i / 56) * TAU - Math.PI / 2, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      return [cx + ex * c - ey * s, cy + ex * s + ey * c];
    });
    return rot ? mk(p, cx - m, cy - m, cx + m, cy + m, pts) : mk(p, cx - rx, cy - ry, cx + rx, cy + ry, pts);
  },
  polygon(pts) {
    return mk(polyPath(pts), ...boundsOf(pts), pts.map(([x, y]) => [x, y]));
  },
  /** Smooth closed blob through points. */
  smooth(pts, tension = 0.5) {
    const out = splinePts(pts, tension);
    const [x0, y0, x1, y1] = boundsOf(out);
    return mk(polyPath(out), x0 - 1, y0 - 1, x1 + 1, y1 + 1, out);
  },
  /** Window / door: flat bottom centred on (cx, bottomY), arched top; point 0 = round, 1 = pointed. */
  arch(cx, bottomY, w, h, point = 0.35) {
    const p = new Path2D();
    const r = w / 2, sy = bottomY - h + r * (1 + point * 0.7);
    const A = [cx - r, sy], B = [cx, bottomY - h], C = [cx + r, sy];
    const c1 = [cx - r, sy - r * (0.55 + point * 0.2)], c2 = [cx - r * (0.5 - point * 0.25), bottomY - h + r * 0.12 * (1 - point)];
    const c3 = [cx + r * (0.5 - point * 0.25), bottomY - h + r * 0.12 * (1 - point)], c4 = [cx + r, sy - r * (0.55 + point * 0.2)];
    p.moveTo(cx - r, bottomY);
    p.lineTo(A[0], A[1]);
    p.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], B[0], B[1]);
    p.bezierCurveTo(c3[0], c3[1], c4[0], c4[1], C[0], C[1]);
    p.lineTo(cx + r, bottomY);
    p.closePath();
    const pts = [[cx - r, bottomY], A];
    bez(A, c1, c2, B, 10, pts);
    bez(B, c3, c4, C, 10, pts);
    pts.push([cx + r, bottomY]);
    return mk(p, cx - r, bottomY - h, cx + r, bottomY, pts);
  },
  /**
   * n-petal flower silhouette (one merged outline). notch 0..1 = how deep petals are separated,
   * wobble = organic irregularity of the outline, petalJitter = petal-to-petal length variation.
   */
  flower(cx, cy, r, petals = 5, { notch = 0.42, rot = -Math.PI / 2, wobble = 0, petalJitter = 0, seed = 1 } = {}) {
    const rng = makeRng(seedOf('petals', seed));
    const len = Array.from({ length: petals }, () => 1 - petalJitter * 2 * rng.next());
    const wid = Array.from({ length: petals }, () => 0.62 + rng.sym(petalJitter * 1.6));
    const ph = rng.next() * TAU;
    const steps = petals * 28, pts = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * TAU;
      const k0 = Math.round((a / TAU) * petals) % petals;
      const lobe = Math.pow(Math.abs(Math.cos((a * petals) / 2)), wid[k0]);
      const k = (1 - notch + notch * lobe) * lerp(1, len[k0], lobe) + wobble * (Math.sin(a * 3 + seed) * 0.34 + Math.sin(a * 7 + ph) * 0.16);
      pts.push([cx + Math.cos(a + rot) * r * k, cy + Math.sin(a + rot) * r * k]);
    }
    return mk(polyPath(pts), cx - r * 1.08, cy - r * 1.08, cx + r * 1.08, cy + r * 1.08, pts);
  },
  /** Leaf from base (0,0) to tip (len,0), max half-width wid/2, bend curves the midrib (px). */
  leaf(len, wid, bend = 0) {
    const h = wid / 2;
    const P = [[0, 0], [len * 0.22, -h * 1.25 + bend], [len * 0.7, -h * 1.05 + bend], [len, bend * 0.4], [len * 0.68, h * 1.0 + bend], [len * 0.26, h * 1.2 + bend]];
    const pts = [[0, 0]];
    bez(P[0], P[1], P[2], P[3], 14, pts);
    bez(P[3], P[4], P[5], P[0], 14, pts);
    pts.pop();
    const b = Math.abs(bend);
    return mk(polyPath(pts), 0, -h - b, len, h + b, pts);
  },
  /**
   * Pointed, slightly bulbous dome: base centred on (cx, baseY), width w, height h.
   * The result also carries .profile = [[halfWidth, heightAboveBase], ...] (base -> apex) for ribs.
   */
  dome(cx, baseY, w, h, n = 40) {
    const r = w / 2, P = [[r, 0], [r * 1.1, h * 0.52], [r * 0.56, h * 0.9], [0, h]];
    const profile = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      profile.push([0, 1].map((a) => b[0] * P[0][a] + b[1] * P[1][a] + b[2] * P[2][a] + b[3] * P[3][a]));
    }
    const s = shape.polygon([
      ...profile.map(([hw, hh]) => [cx + hw, baseY - hh]),
      ...profile.slice(0, -1).reverse().map(([hw, hh]) => [cx - hw, baseY - hh]),
    ]);
    s.profile = profile;
    return s;
  },
  /** Thick smooth curve through pts as a filled outline; width may taper: [w0, w1]. */
  ribbon(pts, width) {
    const [w0, w1] = Array.isArray(width) ? width : [width, width];
    const fine = [];
    const n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      for (let s = 0; s < 8; s++) {
        const t = s / 8, t2 = t * t, t3 = t2 * t;
        fine.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    fine.push(pts[n - 1]);
    const L = [], Rr = [];
    fine.forEach(([x, y], i) => {
      const a = fine[Math.max(0, i - 1)], b = fine[Math.min(fine.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const hw = (w0 + (w1 - w0) * (i / (fine.length - 1))) / 2;
      L.push([x - (dy / len) * hw, y + (dx / len) * hw]);
      Rr.push([x + (dy / len) * hw, y - (dx / len) * hw]);
    });
    return shape.polygon([...L, ...Rr.reverse()]);
  },
  /**
   * Tapered limb with round ends: joint circles of radius r0 at (0,0) and r1 at (len,0), joined by
   * their outer tangents. Anchor it at [0,0] (the proximal joint) and rotate the sprite there.
   */
  capsule(len, r0, r1 = r0) {
    const b = Math.asin(clamp((r0 - r1) / Math.max(len, 1e-6), -1, 1)); // tangent tilt
    const pts = [];
    const N = 14;
    for (let i = 0; i <= N; i++) { // distal cap, top tangent point -> bottom tangent point
      const a = -Math.PI / 2 + b + (i / N) * (Math.PI - 2 * b);
      pts.push([len + Math.cos(a) * r1, Math.sin(a) * r1]);
    }
    for (let i = 0; i <= N; i++) { // proximal cap
      const a = Math.PI / 2 - b + (i / N) * (Math.PI + 2 * b);
      pts.push([Math.cos(a) * r0, Math.sin(a) * r0]);
    }
    return mk(polyPath(pts), -r0, -Math.max(r0, r1), len + r1, Math.max(r0, r1), pts);
  },
  /**
   * Pie wedge / ring segment about (cx, cy): from radius r0 (0 = a wedge with its tip in the centre)
   * to r1, from angle a0 to a1 (rad, clockwise on screen, 0 = +x, -PI/2 = up; a1 > a0). Has outline
   * points, so it can morph, take dashes and be placed. One hour of a 12-hour dial:
   * shape.sector(0, 0, 0, 200, -Math.PI / 2, -Math.PI / 2 + Math.PI / 6).
   */
  sector(cx, cy, r0, r1, a0, a1) {
    const span = a1 - a0, n = Math.max(2, Math.ceil(Math.abs(span) / 0.09));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (span * i) / n;
      pts.push([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]);
    }
    if (r0 > 0) {
      for (let i = n; i >= 0; i--) {
        const a = a0 + (span * i) / n;
        pts.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]);
      }
    } else pts.push([cx, cy]);
    return mk(polyPath(pts), ...boundsOf(pts), pts);
  },
  /**
   * Full ring (annulus) between radii r0 < r1: coin rims, dial rims, halos. The hole is part of the
   * path (opposite winding), so it works with the default fill rule. `pts` = the OUTER outline,
   * `contours` = [outer, hole]: a morph keeps the hole (ring -> disc: it closes), dashes / dots run
   * around both (pass { pts: ring.pts } for the outer one only). Any other hole in a stencil:
   * shape.union(outer, inner) with bakeStencil({ fillRule: 'evenodd' }).
   */
  ring(cx, cy, r0, r1) {
    const p = new Path2D();
    p.arc(cx, cy, r1, 0, TAU, false);
    p.closePath();
    p.moveTo(cx + r0, cy);
    p.arc(cx, cy, r0, 0, TAU, true);
    p.closePath();
    const circle = (r, dir) => Array.from({ length: 64 }, (_, i) => [cx + Math.cos(dir * (i / 64) * TAU - Math.PI / 2) * r, cy + Math.sin(dir * (i / 64) * TAU - Math.PI / 2) * r]);
    const pts = circle(r1, 1);
    const out = mk(p, cx - r1, cy - r1, cx + r1, cy + r1, pts);
    out.contours = [pts, circle(r0, -1)];      // outer + the hole (opposite winding): morph / dashes / dots use both
    return out;
  },
  /**
   * Merge shapes into one path (non-zero union when filled). The result has no single outline
   * (`pts` is null) but carries `contours` = the outlines of its members, so dashes / dots / morph
   * work on composite silhouettes: they treat every member's outline (where members OVERLAP, the
   * arcs inside the union are followed too — for the true silhouette line of an overlapping union
   * use bakeStencil({ shape, outline: { width, dash, gap, side: 'outside' } })).
   */
  union(...shapes) {
    const p = new Path2D();
    let b = [Infinity, Infinity, -Infinity, -Infinity];
    const contours = [];
    let all = true;
    for (const s of shapes) {
      p.addPath(s.path);
      b = [Math.min(b[0], s.bounds[0]), Math.min(b[1], s.bounds[1]), Math.max(b[2], s.bounds[2]), Math.max(b[3], s.bounds[3])];
      const c = s.contours ?? (s.pts ? [s.pts] : null);
      if (c) contours.push(...c); else all = false;
    }
    const out = mk(p, ...b);
    if (all && contours.length) out.contours = contours;
    return out;
  },
  /** Copy of a shape moved / rotated / scaled: rotate about origin, then scale, then translate. */
  place(s, { x = 0, y = 0, rot = 0, scale = 1, sx = 1, sy = 1 } = {}) {
    const m = new DOMMatrix().translateSelf(x, y).rotateSelf((rot * 180) / Math.PI).scaleSelf(scale * sx, scale * sy);
    const p = new Path2D();
    p.addPath(s.path, m);
    const tp = ([px, py]) => [m.a * px + m.c * py + m.e, m.b * px + m.d * py + m.f];
    const [x0, y0, x1, y1] = s.bounds;
    const cs = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(tp);
    const out = mk(p, ...boundsOf(cs), s.pts ? s.pts.map(tp) : null);
    if (s.contours) out.contours = s.contours.map((c) => c.map(tp));
    return out;
  },
  /**
   * In-between of two outlines: u = 0 -> a, u = 1 -> b. Use the result with drawStencil (live cut).
   *   mode 'vertex' (default)  both outlines are resampled to n points by arc length, b is rotated to
   *        the best-matching start point, and matching points move on straight lines. Exact at both
   *        ends; for DISSIMILAR shapes the in-betweens are lumpy — keep such morphs to <= 8 frames, or
   *        morph between shapes with the same number of lobes / corners.
   *   mode 'radial'  both outlines are read as radius-by-angle about their centroids and the RADIUS
   *        is blended (the centroid travels too): smooth, symmetric in-betweens for blob-like shapes
   *        (discs, flowers, rounded tiles, drops) at any speed. Needs shapes that are star-shaped
   *        about their centroid; sharp corners are rounded by one sample (n = 96: about 1 px).
   *   align  overrides the automatic start-point match of 'vertex': a number = angle (rad) — both
   *        outlines start at their point in that direction from the centroid; {index: k} = rotate b
   *        by k samples.
   * Shapes with several outlines (shape.ring, shape.union of shapes with points) are morphed contour
   * by contour, in order; a contour that only one side has (the hole of a ring morphing to a disc, an
   * extra member) closes to / opens from a point. Pairs are cached, so calling it every frame is cheap.
   */
  morph(a, b, u, { n = 96, mode = 'vertex', ease = null, align = null } = {}) {
    if (ease === 'radial') mode = 'radial';
    const CA = contoursOf(a), CB = contoursOf(b), t = clamp(u);
    const count = Math.max(CA.length, CB.length);
    const outs = [];
    for (let i = 0; i < count; i++) {
      // a contour that exists on one side only (a hole, an extra member) grows from / closes to a point
      const A = CA[i] ?? dotFor(b, i, a), B = CB[i] ?? dotFor(a, i, b);
      let pts = morphOutline(A, B, t, n, mode, align);
      // holes keep the opposite winding of the first contour (non-zero fill then keeps them open)
      const src = CB[i] ? CB : CA;
      const hole = i > 0 && Math.sign(signedArea(src[i])) !== Math.sign(signedArea(src[0]));
      if (i > 0 && (Math.sign(signedArea(pts)) !== Math.sign(signedArea(outs[0]))) !== hole) pts = pts.slice().reverse();
      outs.push(pts);
    }
    const path = new Path2D();
    for (const pts of outs) {
      pts.forEach(([x, y], k) => (k ? path.lineTo(x, y) : path.moveTo(x, y)));
      path.closePath();
    }
    const out = mk(path, ...boundsOf(outs.flat()), outs[0]);
    if (outs.length > 1) out.contours = outs;
    return out;
  },
  /**
   * Dashed line as ONE fillable shape (bounds automatic): along an open polyline `pts`, or around
   * the outline of a shape (every contour of a ring / union; { pts: shape.pts } = the first only). opts: dash, gap, width, cap 'round' | 'butt', phase (px shift along the
   * line: animate it for marching dashes), from / to (0..1 part of the length: draw-on).
   */
  dashes(ptsOrShape, { dash = 30, gap = 18, width = 8, cap = 'round', phase = 0, from = 0, to = 1 } = {}) {
    const closed = !Array.isArray(ptsOrShape), hw = width / 2;
    const lines = closed ? contoursOf(ptsOrShape) : [ptsOrShape];
    const path = new Path2D();
    for (const pts of lines) {
      const L = arcLengths(pts, closed), total = L[L.length - 1];
      const s0 = total * from, s1 = total * to;
      // around a closed outline the period is adjusted so a whole number of dashes fits
      const fit = closed ? total / Math.max(1, Math.round(total / (dash + gap))) / (dash + gap) : 1;
      const period = (dash + gap) * fit, dl = dash * fit;
      const ph = ((phase % period) + period) % period;
      for (let start = ph - period; start < s1; start += period) {
        const a = Math.max(start, s0), b = Math.min(start + dl, s1);
        if (b - a < (cap === 'round' ? Math.max(0.5, width * 0.5) : 0.5)) continue; // no stubs at a cut end
        const n = Math.max(1, Math.ceil((b - a) / 5));
        const left = [], right = [];
        let first = null, last = null;
        for (let i = 0; i <= n; i++) {
          const q = atLength(pts, L, a + ((b - a) * i) / n, closed);
          left.push([q[0] - q[3] * hw, q[1] + q[2] * hw]);
          right.push([q[0] + q[3] * hw, q[1] - q[2] * hw]);
          if (!i) first = q;
          last = q;
        }
        const out = [...right];
        if (cap === 'round') {
          const a1 = Math.atan2(last[3], last[2]);
          for (let i = 1; i < 8; i++) out.push([last[0] + Math.cos(a1 - Math.PI / 2 + (i / 8) * Math.PI) * hw, last[1] + Math.sin(a1 - Math.PI / 2 + (i / 8) * Math.PI) * hw]);
        }
        out.push(...left.reverse());
        if (cap === 'round') {
          const a0 = Math.atan2(first[3], first[2]);
          for (let i = 1; i < 8; i++) out.push([first[0] + Math.cos(a0 + Math.PI / 2 + (i / 8) * Math.PI) * hw, first[1] + Math.sin(a0 + Math.PI / 2 + (i / 8) * Math.PI) * hw]);
        }
        out.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
        path.closePath();
      }
    }
    const [x0, y0, x1, y1] = boundsOf(lines.flat());
    return mk(path, x0 - hw - 1, y0 - hw - 1, x1 + hw + 1, y1 + hw + 1);
  },
  /**
   * Dotted line as one fillable shape: dots of radius r every `gap` px (centre to centre) along an
   * open polyline or around a shape's outline(s). phase / from / to as in dashes.
   */
  dots(ptsOrShape, { r = 5, gap = 22, phase = 0, from = 0, to = 1 } = {}) {
    const closed = !Array.isArray(ptsOrShape);
    const lines = closed ? contoursOf(ptsOrShape) : [ptsOrShape];
    const path = new Path2D();
    for (const pts of lines) {
      const L = arcLengths(pts, closed), total = L[L.length - 1];
      const step = closed ? total / Math.max(1, Math.round(total / gap)) : gap;
      const off = ((phase % step) + step) % step;
      const s0 = total * from, s1 = total * to - (closed && to >= 1 ? step * 0.5 : -1e-6);
      for (let d = off; d <= s1; d += step) {
        if (d < s0) continue;
        const q = atLength(pts, L, d, closed);
        path.moveTo(q[0] + r, q[1]);
        path.arc(q[0], q[1], r, 0, TAU);
      }
    }
    const [x0, y0, x1, y1] = boundsOf(lines.flat());
    return mk(path, x0 - r - 1, y0 - r - 1, x1 + r + 1, y1 + r + 1);
  },
};

// ------------------------------------------------------------------ pattern tiles (lazy, res 1)

const TILES = {
  pore: [7001, { coverage: 0.6, dab: 58, stamps: 'airy', boost: 2 }],      // lacy, speckled print
  fine: [7005, { coverage: 0.62, dab: 26, stamps: 'open', boost: 2 }],     // the same, finer (small parts)
  solidish: [7002, { coverage: 0.96, dab: 60, stamps: 'dense', boost: 4 }], // nearly solid, few gaps
  print: [7004, { coverage: 0.74, dab: 34, stamps: 'mid', boost: 2 }],     // broken ornament print
  slit: [7006, { coverage: 0.8, dab: 38, stamps: 'body' }],                // slit lines: skip two or three times along a rib
  speck: [7003, { coverage: 0.1, dab: 46, stamps: 'speck', boost: 2 }],    // sparse specks
  speck2: [7007, { coverage: 0.2, dab: 30, stamps: 'speck', boost: 2 }],   // denser fine specks
  mottle: [7008, { coverage: 0.5, dab: 44, stamps: 'open' }],              // tonal variation inside prints
  mottle2: [7009, { coverage: 0.45, dab: 52, stamps: 'open' }],
};
const tiles = {};
function tile(kind, color = null) {
  const key = kind + (color ?? '');
  if (!tiles[key]) {
    if (color) {
      const src = tile(kind), s = surface(src.w, src.h, 1);
      blit(s.ctx, src);
      s.ctx.globalCompositeOperation = 'source-in';
      s.ctx.fillStyle = color;
      s.ctx.fillRect(0, 0, s.w, s.h);
      tiles[key] = s;
    } else {
      if (!TILES[kind]) throw new Error(`unknown print tile "${kind}"`);
      tiles[key] = makePoreTile(256, TILES[kind][0], TILES[kind][1]);
    }
  }
  return tiles[key];
}
/** Fill the whole sprite with a tile pattern using composite op `op` (tile anchored to the sprite). */
function patternPass(ctx, kind, w, h, op, alpha = 1, color = null) {
  ctx.save();
  ctx.setTransform(ctx.getTransform().a, 0, 0, ctx.getTransform().d, 0, 0); // sprite space, keep res scale
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ctx.createPattern(tile(kind, color).canvas, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
const stencilThrough = (ctx, kind, w, h) => patternPass(ctx, kind, w, h, 'destination-in');
/** Tonal variation inside a flat print: lighter and darker sponge patches, a few bare specks. */
function mottlePrint(ctx, w, h, amount = 1) {
  patternPass(ctx, 'mottle', w, h, 'source-atop', 0.16 * amount, '#FFF6E6');
  patternPass(ctx, 'mottle2', w, h, 'source-atop', 0.2 * amount, '#2A1C1C');
}

// ------------------------------------------------------------------ bakeStencil

const DIRS8 = Array.from({ length: 8 }, (_, i) => [Math.cos((i * TAU) / 8), Math.sin((i * TAU) / 8)]);

/**
 * Bake a stencil-cut object into a sprite.
 * spec:
 *   shape        {path, bounds} in the object's local coordinates (see shape.*)   — or —
 *   mask, bounds mask(ctx) draws the stencil opening itself (white fill/stroke is preset): use it
 *                for anything a Path2D cannot say (lettering: prefer stencilText)
 *   layers       sponge layers (bottom first); maskFn / shadeFn receive LOCAL coordinates
 *   base         colour that makes the shape opaque (dabbed first, flat underneath at the end)
 *   anchor       [x, y] local point that .draw(ctx, x, y) puts on (x, y)   (default bounds centre)
 *   edge         {color, width = 5, opacity = 0.75, dir = [-0.7, 0.7] | null, speckle = true, tile = 'pore' | 'fine'}
 *                or an ARRAY of them: thin prints just INSIDE the stencil edge (shadow / blush);
 *                dir = side it sits on (null: all round)
 *   slits        {path, width = 3, color, opacity = 0.9} thin lines printed through stencil slits
 *                (stroked) or {shape, color, opacity} (filled, e.g. tapered ribbons); they come out
 *                uneven and broken like real slit prints
 *   details      (ctx) => void — flat prints inside the stencil (window openings: nearly solid), or
 *                {draw(ctx), print: 'solid' | 'print' | 'flat'} or an array of those;
 *                'print' = ornaments: a broken, stippled print with primer showing through
 *   bleed        false | {color, amount = 1} tiny specks that crept under the stencil edge (default: subtle)
 *   reveal       {steps = 6, mode, order, from, angle, dab, ...} — `from` is in local coordinates.
 *                mode defaults to 'mask' when there is a base (the finished print appears sponge
 *                print by sponge print), else 'build'
 *   outline      {width = 6, dash, gap, cap = 'round', join = 'round', phase = 0, side = 'center' | 'outside' | 'inside'}
 *                — the stencil opening is the LINE around the shape instead of its area (a not-yet-owned
 *                thing, a dashed frame). Works for every shape, also unions and custom paths; for a
 *                union whose members overlap use side: 'outside' (only the true silhouette line is cut)
 *   density      1 | 2 — bake at `density` x the device resolution (stamp tiles of that density, grain
 *                unchanged in logical px): a sprite that stays razor-sharp under a 2x camera zoom or
 *                when drawn at scale 2. Costs density² the memory; use it for the hero only
 *   seed, pad, fillRule
 */
export function bakeStencil({
  shape: shp = null, bounds = shp ? shp.bounds : null, mask: maskDraw = null, layers = [], base = null,
  anchor = null, seed = 1, pad = 6, fillRule = 'nonzero',
  edge = null, slits = null, details = null, bleed = {}, reveal = {}, outline = null, density = 1,
}) {
  const [x0, y0, x1, y1] = bounds;
  const grow = outline ? Math.ceil((outline.width ?? 6) * (outline.side === 'outside' ? 1 : 0.5)) + 1 : 0;
  const ox = Math.floor(x0) - pad - grow, oy = Math.floor(y0) - pad - grow;
  const w = Math.ceil(x1) + pad + grow - ox, h = Math.ceil(y1) + pad + grow - oy;
  const R = env.res * clamp(density, 0.5, 4);     // device px per logical px of this sprite
  const surf = (res = R) => surface(w, h, res);
  const toLocal = (fn) => (fn ? (x, y) => fn(x + ox, y + oy) : undefined);
  const firstSize = layers.length ? (layers[0].size ?? 90) : 90;
  const all = (base
    ? [{ color: base, coverage: 0.985, size: clamp(Math.min(w, h) * 0.5, 40, Math.max(firstSize * 1.4, 60)), stamps: 'dense', tint: 0.03, pores: 0, opacity: 1 }, ...layers]
    : layers).map((l) => ({ ...l, maskFn: toLocal(l.maskFn), shadeFn: toLocal(l.shadeFn) }));
  const rv = reveal.from ? { ...reveal, from: [reveal.from[0] - ox, reveal.from[1] - oy] } : reveal;

  // the stencil opening as an alpha mask
  const drawMask = (s) => {
    s.ctx.translate(-ox, -oy);
    s.ctx.fillStyle = s.ctx.strokeStyle = '#fff';
    if (maskDraw) maskDraw(s.ctx);
    else if (outline) strokeOutline(s.ctx, shp.path, outline, fillRule);
    else s.ctx.fill(shp.path, fillRule);
    s.ctx.setTransform(s.res, 0, 0, s.res, 0, 0);
    s.ctx.globalCompositeOperation = 'source-over';
    s.ctx.globalAlpha = 1;
    return s;
  };
  const mask = drawMask(surf());

  // drop dabs that cannot touch the opening (thin shapes would otherwise waste most of them);
  // tested on a scale-1 mask so the dab list is the same at every render scale (the pixel data
  // lives only inside this block, it is not kept with the sprite)
  const dabs = (() => {
    const test = mask.res === 1 ? mask : drawMask(surf(1));
    const cw = test.canvas.width, ch = test.canvas.height;
    const md = test.ctx.getImageData(0, 0, cw, ch).data;
    const open = (x, y) => {
      const px = Math.round(x), py = Math.round(y);
      return px >= 0 && py >= 0 && px < cw && py < ch && md[(py * cw + px) * 4 + 3] > 24;
    };
    const touches = (d) => {
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (open(d.x + i * d.size * 0.2, d.y + j * d.size * 0.2)) return true;
      return false;
    };
    const scattered = scatterDabs(all, { w, h, seed, reveal: rv });
    // rank only the dabs that touch the opening: every build stage then adds visible paint
    const kept = rankDabs(scattered.filter(touches));
    if (rv.even === 'area') evenRanksByArea(kept, w, h);
    kept.meta = scattered.meta;
    return kept;
  })();

  const tmp = surf();
  const wipe = (s) => {
    s.ctx.setTransform(s.res, 0, 0, s.res, 0, 0);
    s.ctx.globalCompositeOperation = 'source-over';
    s.ctx.globalAlpha = 1;
    s.ctx.clearRect(0, 0, w, h);
  };
  const tint = (s, color) => {
    s.ctx.globalCompositeOperation = 'source-in';
    s.ctx.fillStyle = color;
    s.ctx.fillRect(0, 0, w, h);
    s.ctx.globalCompositeOperation = 'source-over';
  };

  // prints that sit on top of the sponge texture, inside the stencil
  let atop = null;
  if (edge || slits || details) {
    atop = surf();
    const lay = (alpha) => {
      atop.ctx.globalAlpha = alpha;
      blit(atop.ctx, tmp);
      atop.ctx.globalAlpha = 1;
      wipe(tmp);
    };
    for (const det of details ? [details].flat() : []) {
      const d = typeof det === 'function' ? { draw: det } : det;
      const kind = d.print ?? 'solid';
      tmp.ctx.translate(-ox, -oy);
      d.draw(tmp.ctx);
      wipe0(tmp);
      if (kind === 'print') {
        stencilThrough(tmp.ctx, 'print', w, h);
        mottlePrint(tmp.ctx, w, h, 1);
        patternPass(tmp.ctx, 'speck2', w, h, 'destination-out', 0.9);
      } else if (kind === 'solid') {
        stencilThrough(tmp.ctx, 'solidish', w, h);
        mottlePrint(tmp.ctx, w, h, 0.4);
      }
      lay(d.opacity ?? 1);
    }
    for (const e of edge ? [edge].flat() : []) {
      const { color, width = 5, opacity = 0.75, dir = [-0.7, 0.7], speckle = true, tile: tk = 'pore' } = e;
      const c = tmp.ctx;
      blit(c, mask);
      tint(tmp, color);
      c.globalCompositeOperation = 'destination-out';
      if (dir) blit(c, mask, -dir[0] * width, -dir[1] * width);
      else {
        // all round: remove the eroded opening (= intersection of the mask shifted in 8 directions)
        const ero = surf();
        blit(ero.ctx, mask);
        ero.ctx.globalCompositeOperation = 'destination-in';
        for (const [dx, dy] of DIRS8) blit(ero.ctx, mask, dx * width, dy * width);
        blit(c, ero);
      }
      c.globalCompositeOperation = 'source-over';
      if (speckle) stencilThrough(c, tk, w, h);
      lay(opacity);
    }
    for (const sl of slits ? [slits].flat() : []) {
      const { path = null, shape: sshape = null, width = 3, color, opacity = 0.9 } = sl;
      const c = tmp.ctx;
      const stroke = (wd) => {
        c.translate(-ox, -oy);
        c.strokeStyle = c.fillStyle = color;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        if (sshape) {
          c.fill(sshape.path);
          if (wd > 0) { c.lineWidth = wd; c.stroke(sshape.path); }
        } else {
          c.lineWidth = wd;
          c.stroke(path);
        }
        wipe0(tmp);
      };
      // a thin continuous core that skips now and then …
      stroke(sshape ? 0 : width * 0.72);
      stencilThrough(c, 'slit', w, h);
      lay(opacity);
      // … swelling to a fatter line in patches (uneven pressure on the stencil)
      stroke(sshape ? width * 0.3 : width * 1.3);
      stencilThrough(c, 'pore', w, h);
      lay(opacity * 0.9);
    }
  }

  tmp.canvas.width = tmp.canvas.height = 1; // working surface no longer needed: give its memory back

  // specks of paint that crept under the stencil edge (just outside the cut) — very subtle
  let under = null;
  if (bleed) {
    under = surf();
    const c = under.ctx;
    for (const [dx, dy] of DIRS8) blit(c, mask, dx * 1.7, dy * 1.7);
    c.globalCompositeOperation = 'destination-out';
    blit(c, mask);
    tint(under, bleed.color ?? (layers.length ? (layers[0].color ?? layers[0].colors[0]) : base));
    stencilThrough(c, 'speck', w, h);
  }
  const underAlpha = bleed ? clamp(0.55 * (bleed.amount ?? 1)) : 0;

  const post = (s, final, p) => {
    const c = s.ctx;
    if (final && base) {
      c.globalCompositeOperation = 'destination-over';
      c.fillStyle = base;
      c.fillRect(0, 0, s.w, s.h);
    }
    c.globalCompositeOperation = 'destination-in';
    blit(c, mask);
    // in a build-up reveal the prints (ribs, windows, edge blush) arrive with the last third
    const a = final ? 1 : clamp((p - 0.55) / 0.3);
    if (atop && a > 0) {
      c.globalCompositeOperation = 'source-atop';
      c.globalAlpha = a;
      blit(c, atop);
      c.globalAlpha = 1;
    }
    if (under && final) {
      c.globalCompositeOperation = 'destination-over';
      c.globalAlpha = underAlpha;
      blit(c, under);
      c.globalAlpha = 1;
    }
    c.globalCompositeOperation = 'source-over';
  };
  const a = anchor ?? [(x0 + x1) / 2, (y0 + y1) / 2];
  return new Painted({
    w, h, ax: a[0] - ox, ay: a[1] - oy, dabs, steps: reveal.steps ?? 6, post,
    mode: reveal.mode ?? (base ? 'mask' : 'build'), reveal: rv, seed, maskDab: reveal.dab, origin: [-ox, -oy], res: R,
  });
}
/**
 * Stroke `path` as a stencil opening (white preset by the caller): the line around a shape.
 * side 'center' = astride the outline; 'outside' / 'inside' = only the half of a double-width line
 * that lies outside / inside the filled shape (the true silhouette line of an overlapping union).
 */
function strokeOutline(c, path, { width = 6, dash = 0, gap = dash, cap = 'round', join = 'round', phase = 0, side = 'center' } = {}, fillRule = 'nonzero') {
  c.save();
  c.lineWidth = side === 'center' ? width : width * 2;
  c.lineCap = dash ? cap : 'round';
  c.lineJoin = join;
  if (dash) { c.setLineDash([dash, gap + (cap === 'round' ? c.lineWidth : 0)]); c.lineDashOffset = -phase; }
  c.stroke(path);
  if (side !== 'center') {
    c.setLineDash([]);
    c.globalCompositeOperation = side === 'outside' ? 'destination-out' : 'destination-in';
    c.fill(path, fillRule);
  }
  c.restore();
}
/** Back to sprite space (keeps the pixels). */
function wipe0(s) {
  s.ctx.setTransform(s.res, 0, 0, s.res, 0, 0);
  s.ctx.globalCompositeOperation = 'source-over';
  s.ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ stencil lettering

const COUNTERS = new Set([...'ABDOPQRabdegopq04689@&ÖöĞğÂâÄäÅåÀàÁáÃãØøÒòÓóÔôÕõÐð']);

function fontString(font, size) {
  if (/\d(px|pt|em)\b/.test(font)) return font;
  const m = /^((?:(?:italic|oblique|normal|bold|\d{3})\s+)*)(.+)$/.exec(font.trim());
  return `${m[1]}${size}px ${m[2]}`;
}

const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif']);
/**
 * Throws unless the CSS font's first family is really there with a loaded face of that weight and
 * style — the canvas would otherwise fall back to a default face (or fake a bold / an italic) without
 * a word, and the lettering would silently be wrong.
 */
function assertFont(css) {
  if (typeof document === 'undefined' || !document.fonts) return;
  const m = /^(.*?)(\d+(?:\.\d+)?)px\s+(.+)$/.exec(css.trim());
  if (!m) throw new Error(`stencilText: cannot read the font "${css}" (use e.g. '700 "Encode Sans"')`);
  const unq = (f) => f.trim().replace(/^["']|["']$/g, '');
  const fam = unq(m[3].split(',')[0]);
  if (GENERIC_FAMILIES.has(fam.toLowerCase())) return;
  const pre = m[1].toLowerCase();
  const weight = +(/\b(\d{3})\b/.exec(pre)?.[1] ?? (/\bbold\b/.test(pre) ? 700 : 400));
  const style = /\b(italic|oblique)\b/.test(pre) ? 'italic' : 'normal';
  const faces = [...document.fonts].filter((f) => unq(f.family) === fam);
  const have = [...new Set([...document.fonts].map((f) => unq(f.family)))].join(', ');
  if (!faces.length) throw new Error(`stencilText: font family "${fam}" is not available (index.html provides: ${have})`);
  const fits = (f) => {
    const [lo, hi = lo] = String(f.weight).replace('normal', '400').replace('bold', '700').split(/\s+/).map(Number);
    return f.style === style && weight >= lo && weight <= hi;
  };
  if (!faces.some((f) => fits(f) && f.status === 'loaded')) {
    const list = [...new Set(faces.map((f) => `${f.weight}${f.style === 'normal' ? '' : ' ' + f.style}`))].join(', ');
    throw new Error(`stencilText: "${fam}" has no loaded ${weight}${style === 'normal' ? '' : ' ' + style} face (it has: ${list}) — the browser would fake it`);
  }
}

/**
 * Stencil lettering, measured for you (nothing is ever clipped).
 *   font      weight + family, e.g. '700 "Encode Sans"' (or a full CSS font with a px size). The face
 *             must exist (index.html @font-face) in that weight and style: an unknown font THROWS
 *             (strictFont: false lets the browser substitute, as CSS would)
 *   size      px; tracking = extra letter spacing in px; align 'left' | 'center' (ink-centred)
 *   bridges   true cuts the little stencil bridges through closed counters (O, A, B, 8 …)
 *   stroke    {width = 6, dash, gap = dash, cap = 'round', phase = 0} — the letters as OUTLINES instead
 *             of filled shapes (dash: a dashed outline: something announced, not yet owned)
 *   path      E.curve(...) / E.arc(...) / [[x, y], …] — the baseline follows the path: each letter sits
 *             on it by arc length, turned to the tangent (align 'center' centres the word on the path,
 *             'left' starts it `pathOffset` px from the path's start). The anchor is then the origin
 *             of the PATH's coordinates: draw the result at the same (x, y) you would draw the path at
 *   perLetter true -> { letters: [{painted, x, ch}], width, draw(ctx, x, y, {p, stagger = 0.6, alpha}) }
 *             (each glyph its own sprite, dabbed in one after another)
 *   base, layers, edge, bleed, reveal, seed, density   as in bakeStencil
 * Returns a Painted whose anchor is the baseline start (or the ink centre on the baseline for
 * align 'center'); .textWidth = advance, .ink = {left, right, ascent, descent} relative to the anchor.
 */
export function stencilText(text, {
  font = '700 "Encode Sans"', size = 150, tracking = 0, align = 'left', bridges = false, perLetter = false,
  base = null, layers = [], edge = null, bleed = {}, reveal = {}, seed = 1,
  stroke = null, path = null, pathOffset = 0, strictFont = true, density = 1,
} = {}) {
  const css = fontString(font, size);
  if (strictFont) assertFont(css);
  const px = +(/(\d+(?:\.\d+)?)px/.exec(css)?.[1] ?? size);
  const setType = (c) => {
    c.font = css;
    c.letterSpacing = `${tracking}px`;
    c.fontKerning = 'normal';
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
  };
  const probe = new OffscreenCanvas(8, 8).getContext('2d');
  setType(probe);
  const measure = (str) => {
    const m = probe.measureText(str);
    return { left: m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent, width: m.width };
  };
  const sw = stroke ? (stroke.width ?? 6) : 0, grow = sw / 2 + 2;
  // fill or (dashed) outline of a piece of text at (x, 0) in the current transform
  const ink = (c, str, x) => {
    if (!stroke) { c.fillText(str, x, 0); return; }
    c.lineWidth = sw;
    c.lineJoin = 'round';
    c.lineCap = stroke.cap ?? 'round';
    if (stroke.dash) {
      c.setLineDash([stroke.dash, (stroke.gap ?? stroke.dash) + (c.lineCap === 'round' ? sw : 0)]);
      c.lineDashOffset = -(stroke.phase ?? 0);
    }
    c.strokeText(str, x, 0);
    c.setLineDash([]);
  };
  const chars = [...text];
  const xs = chars.map((_, i) => (i ? measure(chars.slice(0, i).join('')).width : 0));
  const whole = measure(text);
  const shift = align === 'center' ? -(whole.right - whole.left) / 2 : 0;
  // placement of every character on a path: {x, y, rot} of its baseline start
  let place = null;
  if (path) {
    const cv = Array.isArray(path) ? curve(path) : path;
    const start = align === 'center' ? (cv.length - whole.width) / 2 : pathOffset;
    place = chars.map((ch, i) => {
      const adv = measure(ch).width, u = clamp((start + xs[i] + adv / 2) / cv.length);
      const [qx, qy] = cv.at(u), a = cv.angle(u);
      return { x: qx - Math.cos(a) * adv / 2, y: qy - Math.sin(a) * adv / 2, rot: a };
    });
  }
  const one = (str, x0, sd, rvl, at = null) => {
    const m = measure(str);
    const bar = px * 0.05;
    const cs = [...str];
    const cx = cs.map((_, i) => (i ? measure(cs.slice(0, i).join('')).width : 0));
    // on a path every character is drawn with its own transform (at = [placement of each character])
    let bounds = [x0 - m.left - grow, -m.ascent - grow, x0 + m.right + grow, m.descent + grow];
    if (at) {
      bounds = [Infinity, Infinity, -Infinity, -Infinity];
      cs.forEach((ch, i) => {
        const g = measure(ch), q = at[i], c = Math.cos(q.rot), sn = Math.sin(q.rot);
        for (const [lx, ly] of [[-g.left - grow, -g.ascent - grow], [g.right + grow, -g.ascent - grow], [-g.left - grow, g.descent + grow], [g.right + grow, g.descent + grow]]) {
          const wx = q.x + lx * c - ly * sn, wy = q.y + lx * sn + ly * c;
          bounds = [Math.min(bounds[0], wx), Math.min(bounds[1], wy), Math.max(bounds[2], wx), Math.max(bounds[3], wy)];
        }
      });
    }
    const p = bakeStencil({
      bounds, anchor: [0, 0], seed: sd, base, layers, edge, bleed, reveal: rvl, density,
      mask: (c) => {
        setType(c);
        if (at) {
          cs.forEach((ch, i) => {
            if (!ch.trim()) return;
            c.save();
            c.translate(at[i].x, at[i].y);
            c.rotate(at[i].rot);
            ink(c, ch, 0);
            c.restore();
          });
          return;
        }
        ink(c, str, x0);
        if (bridges && !stroke) {
          c.globalCompositeOperation = 'destination-out';
          cs.forEach((ch, i) => {
            if (!COUNTERS.has(ch)) return;
            const g = measure(ch);
            c.fillRect(x0 + cx[i] + (g.right - g.left) / 2 - bar / 2, -m.ascent - 4, bar, m.ascent + m.descent + 8);
          });
          c.globalCompositeOperation = 'source-over';
        }
      },
    });
    p.textWidth = m.width;
    p.ink = at ? { left: -bounds[0], right: bounds[2], ascent: -bounds[1], descent: bounds[3] }
      : { left: m.left - x0 + sw / 2, right: m.right + x0 + sw / 2, ascent: m.ascent + sw / 2, descent: m.descent + sw / 2 };
    return p;
  };
  if (!perLetter) return one(text, shift, seed, reveal, place);
  const letters = chars.map((ch, i) => (ch.trim() ? {
    ch, x: place ? 0 : xs[i] + shift, painted: one(ch, 0, seedOf('letter', i, seed), reveal, place ? [place[i]] : null),
  } : null)).filter(Boolean);
  const n = letters.length, letterSteps = letters[0]?.painted.steps ?? 6;
  const stepsFor = (stagger) => Math.round(letterSteps * (1 + stagger * (n - 1)));
  return {
    letters, width: whole.width, textWidth: whole.width,
    ink: { left: whole.left - shift, right: whole.right + shift, ascent: whole.ascent, descent: whole.descent },
    /** stages of one letter / of the whole word at the default stagger (use with E.dabP(t, t0, {steps})) */
    letterSteps, steps: stepsFor(0.6),
    /** seconds the timed dab-in takes: every letter lands one stage every `every` frames */
    duration: ({ every = 2, stagger = 0.6, fps = env.FPS } = {}) => ((Math.round(stagger * letterSteps * every) * (n - 1) + letterSteps * every) / fps),
    /**
     * draw(ctx, x, y, { t, t0, every = 2, stagger = 0.6 })  timed: letter i starts stagger x (one
     *   letter's duration) after letter i - 1 and lands one of ITS OWN stages every `every` frames;
     * draw(ctx, x, y, { p, stagger = 0.6 })                 by progress 0..1 of the whole word.
     */
    draw(ctx, x = 0, y = 0, { p = 1, t = null, t0 = 0, every = 2, stagger = 0.6, alpha = 1, fps = env.FPS } = {}) {
      const span = 1 / (1 + stagger * (n - 1));
      const lag = Math.round(stagger * letterSteps * every) / fps;   // whole frames between letters
      letters.forEach((l, i) => {
        let lp;
        if (t !== null) lp = clamp(Math.floor(((t - t0 - i * lag) * fps) / every + 1 + 1e-6) / letterSteps);
        else lp = p >= 1 ? 1 : clamp((p - i * stagger * span) / span);
        if (lp > 0) l.painted.draw(ctx, x + l.x, y, { p: lp, alpha });
      });
    },
  };
}

// ------------------------------------------------------------------ live + helpers

const pool = new Map();
/**
 * Engine-owned scratch surface of at least w x h logical px, cleared and reused between calls
 * (never allocate canvases in draw: ask for one of these). slot = any key; the engine itself uses
 * 'st0' 'st1' (drawStencil), 'rig' and 'frame' (drawThrough) — pick another name for your own.
 */
export function scratch(w, h, slot = 'user') {
  const cw = Math.ceil(w * env.res), ch = Math.ceil(h * env.res);
  let s = pool.get(slot);
  if (!s || s.canvas.width < cw || s.canvas.height < ch) {
    s = surface(Math.max(w, s ? s.w : 0), Math.max(h, s ? s.h : 0));
    pool.set(slot, s);
  }
  const c = s.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, cw + 1, ch + 1);
  c.setTransform(s.res, 0, 0, s.res, 0, 0);
  return s;
}

/**
 * Live stencil for shapes that change every frame (growing, morphing, unrolling…): clips to
 * `path` and draws `texture` (a Painted) with its origin pinned at object-space (x, y), so the
 * print stays put while the cut-out changes. Call inside the object's transform.
 * opts: { x, y, p, fillRule,
 *         edge:    {color, width = 4, opacity = 0.6, dir = [-0.7, 0.7] | null, speckle = true} — like a
 *                  baked edge: printed only on painted pixels, on the side `dir` (null = all round),
 *         slits:   {path, width, color, opacity},
 *         details: (ctx) => {} | {draw(ctx), print: 'solid' | 'print' | 'flat', opacity} | [ … ] — prints
 *                  inside the cut, as in bakeStencil (window openings, ornaments), in object space,
 *         bleed:   {color, amount = 1} — the subtle specks just outside the edge of a baked stencil,
 *         outline: {width, dash, gap, cap, phase, side} — the LINE around the shape instead of its area
 *                  (animate `phase` for marching dashes on any shape, also unions) }
 * The shape must lie inside the texture rectangle [x, y, x + texture.w, y + texture.h].
 */
export function drawStencil(ctx, path, texture, { x = 0, y = 0, p = 1, fillRule = 'nonzero', edge = null, slits = null, details = null, bleed = null, outline = null } = {}) {
  const stage = texture.at(p);
  if (!stage) return;
  if (path.path) path = path.path;
  if (!edge && !slits && !details && !bleed && !outline) {
    ctx.save();
    ctx.clip(path, fillRule);
    ctx.drawImage(stage.canvas, x, y, stage.w, stage.h);
    ctx.restore();
    return;
  }
  // texture + prints are composed in an engine scratch (object space), then drawn once
  const w = texture.w, h = texture.h;
  const s = scratch(w, h, 'st0'), c = s.ctx;
  c.save();
  c.translate(-x, -y);
  if (outline) {
    c.fillStyle = c.strokeStyle = '#fff';
    strokeOutline(c, path, outline, fillRule);
    c.globalCompositeOperation = 'source-in';
  } else c.clip(path, fillRule);
  c.drawImage(stage.canvas, x, y, stage.w, stage.h);
  c.restore();
  for (const det of details ? [details].flat() : []) {
    const d = typeof det === 'function' ? { draw: det } : det, kind = d.print ?? 'solid';
    const e = scratch(w, h, 'st1'), ec = e.ctx;
    ec.save();
    ec.translate(-x, -y);
    d.draw(ec);
    ec.restore();
    ec.setTransform(e.res, 0, 0, e.res, 0, 0);
    ec.globalAlpha = 1;
    ec.globalCompositeOperation = 'source-over';
    if (kind === 'print') {
      stencilThrough(ec, 'print', w, h);
      mottlePrint(ec, w, h, 1);
      patternPass(ec, 'speck2', w, h, 'destination-out', 0.9);
    } else if (kind === 'solid') {
      stencilThrough(ec, 'solidish', w, h);
      mottlePrint(ec, w, h, 0.4);
    }
    c.globalCompositeOperation = 'source-atop'; // only where paint already is
    c.globalAlpha = d.opacity ?? 1;
    blit(c, e);
    c.globalAlpha = 1;
  }
  if (edge) {
    const { color, width = 4, opacity = 0.6, dir = [-0.7, 0.7], speckle = true } = edge;
    const e = scratch(w, h, 'st1'), ec = e.ctx;
    ec.save();
    ec.translate(-x, -y);
    ec.fillStyle = color;
    if (dir) {
      // band on the side `dir`: the shape minus the shape shifted away from that side
      ec.fill(path, fillRule);
      ec.globalCompositeOperation = 'destination-out';
      ec.translate(-dir[0] * width, -dir[1] * width);
      ec.fill(path, fillRule);
    } else {
      ec.clip(path, fillRule);
      ec.strokeStyle = color;
      ec.lineWidth = width * 2;
      ec.stroke(path);
    }
    ec.restore();
    if (speckle) patternPass(ec, 'pore', w, h, 'destination-in');
    c.globalCompositeOperation = 'source-atop'; // only where paint already is
    c.globalAlpha = opacity;
    blit(c, e);
    c.globalAlpha = 1;
  }
  if (slits) {
    c.save();
    c.translate(-x, -y);
    c.globalCompositeOperation = 'source-atop';
    c.globalAlpha = slits.opacity ?? 0.9;
    c.strokeStyle = slits.color;
    c.lineWidth = slits.width ?? 3;
    c.lineCap = 'round';
    c.stroke(slits.path);
    c.restore();
  }
  if (bleed && !outline) {
    // specks of paint that crept under the stencil edge: a thin ring just outside the cut, broken
    // into sparse specks, laid UNDER the print
    const e = scratch(w, h, 'st1'), ec = e.ctx;
    ec.save();
    ec.translate(-x, -y);
    ec.fillStyle = ec.strokeStyle = bleed.color ?? '#888';
    ec.lineWidth = 3.4;
    ec.lineJoin = 'round';
    ec.stroke(path);
    ec.globalCompositeOperation = 'destination-out';
    ec.fill(path, fillRule);
    ec.restore();
    patternPass(ec, 'speck', w, h, 'destination-in');
    c.globalCompositeOperation = 'destination-over';
    c.globalAlpha = clamp(0.55 * (bleed.amount ?? 1));
    blit(c, e);
    c.globalAlpha = 1;
  }
  c.globalCompositeOperation = 'source-over';
  ctx.drawImage(s.canvas, 0, 0, Math.ceil(w * s.res), Math.ceil(h * s.res), x, y, Math.ceil(w * s.res) / s.res, Math.ceil(h * s.res) / s.res);
}

/**
 * Cache any drawing as a sprite: drawFn(ctx) draws in local coords inside bounds [x0,y0,x1,y1].
 * The result reveals through an ordered mask of sponge prints (good for composites).
 * density: 2 bakes at twice the device resolution (draw parts that were baked with density 2 into it).
 */
export function bakeSprite({ bounds, draw, anchor = null, seed = 1, steps = 6, dabSize = null, reveal = {}, density = 1 }) {
  const [x0, y0, x1, y1] = bounds;
  const s = surface(x1 - x0, y1 - y0, env.res * clamp(density, 0.5, 4));
  s.ctx.translate(-x0, -y0);
  draw(s.ctx);
  const a = anchor ?? [(x0 + x1) / 2, (y0 + y1) / 2];
  return Painted.fromSurface(s, { ax: a[0] - x0, ay: a[1] - y0, seed, steps, dabSize, reveal, origin: [-x0, -y0], w: x1 - x0, h: y1 - y0 });
}

/**
 * Group of parts drawn back-to-front at offsets, each with its own reveal window:
 *   group([{ node, x, y, from = 0, to = 1 }, ...])
 *   .draw(ctx, x, y, { p, alpha })          child p = clamp((p - from) / (to - from))
 *   .draw(ctx, x, y, { t, t0, every = 2 })  timed: child i starts at t0 + from_i x duration and lands
 *                                           one of its OWN stages every `every` frames
 *   .steps      stages until the whole group is complete (pass to E.dabP: {steps: g.steps})
 *   .duration   seconds of the timed dab-in on twos (= steps * 2 / fps)
 */
export function group(children) {
  const stepsOf = (ch) => ch.node.steps ?? 6;
  const steps = Math.ceil(Math.max(1, ...children.map((ch) => stepsOf(ch) / Math.max(0.05, 1 - (ch.from ?? 0)))));
  return {
    children, steps, duration: (steps * 2) / env.FPS,
    draw(ctx, x = 0, y = 0, o = {}) {
      const p = o.p ?? 1;
      for (const ch of children) {
        const from = ch.from ?? 0, to = ch.to ?? 1;
        let cp;
        if (o.t !== undefined && o.t !== null) {
          const every = o.every ?? 2, n = stepsOf(ch), delay = Math.round(from * steps) * every;   // frames
          cp = clamp(Math.floor(((o.t - (o.t0 ?? 0)) * env.FPS - delay) / every + 1 + 1e-6) / n);
        } else cp = p >= 1 ? 1 : clamp((p - from) / (to - from));
        if (cp > 0) ch.node.draw(ctx, x + (ch.x ?? 0), y + (ch.y ?? 0), { ...o, p: cp });
      }
    },
  };
}
