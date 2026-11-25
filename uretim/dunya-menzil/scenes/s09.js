/* s09 · 36.70–44.65 · "Ona ait muhabbetimiz, o hususi dünyamız âyine olduğu ve temsil ettiği güzel
   nukuş-u esma-i İlahiyeye döner;"

   Opens on s08's final framing, matched exactly (same man, pose, heart, world position/size/state, same meadow
   shapes, trees and clouds), so the incoming bleed only washes the hourglass away and turns the light to evening.
     37.07 Ona            the heart-light cradled in his palm brightens and beats; he lifts his gaze to his world
     37.61 muhabbetimiz   he raises it up and out toward the world and lets it go; it floats in an arc to the world
                          and settles at its upper left; a ring of warmth spreads over the glass where the love lands
     38.73 o hususi dünyamız   the camera pushes in to the world (he leaves frame); dusk deepens into blue hour
     39.87 âyine          a silver mirror sweeps over the faded world: a convex mirror reflecting the twilight
     40.91 temsil ettiği güzel nukuş   the mirror pales like a sketchbook page and, one after another, the fine works
                          of art in creation appear in it as delicate naturalist watercolour studies, freely arranged:
                          a rose opening petal by petal (40.9), a leaf whose veins emerge (41.3), a jay's barred
                          feather (41.7), a swallowtail butterfly (42.2), a cut pomegranate with its ordered seeds
                          (42.35, done by 42.95). During "esma-i İlahiyeye" (43.0–43.97) NOTHING new appears and
                          nothing brightens — no glow, no ornament, no light from above; the finished page holds.
     44.03 döner          the heart-light leaves the globe (the warmth it gave the world fades) and goes to the works
                          themselves: it settles by the rose and the butterfly (the butterfly stirs its wings).
                          s10 match-cuts on that trio (E.natArt.s09cut() gives their screen placement).
   The studies (E.natArt) are defined in the first block of this file and shared with s10.
*/
/* ---------------------------------------------------------------------------------------------------------------
   NATURALIST STUDIES (E.natArt) — delicate watercolour studies of the fine works of art in creation, as on the pages
   of a naturalist's sketchbook: a rose opening petal by petal, a leaf with its veins, a swallowtail butterfly, a
   jay's barred feather, a cut pomegranate with its ordered seeds. Shared by s09 (they appear in the mirror-world)
   and s10 (the living rose, butterflies). Pure functions of their arguments, drawn under the current transform.
     roseHead(L, x, y, s, {open, p, rot, seed, alpha})      s = head radius when open; (x, y) = centre of the bloom
     roseStudy(L, x, y, s, {open, p, rot, t, alpha})        head + stem + two compound leaves (stem goes down-left)
     leafStudy(L, x, y, s, {p, rot, t, alpha})              s = length; (x, y) = centre; points along +x
     butterfly(L, x, y, s, {p, rot, flap, t, alpha})        s = wingspan; head toward −y (before rot)
     feather(L, x, y, s, {p, rot, t, alpha})                s = length; (x, y) = centre; quill → tip along +x
     pomegranate(L, x, y, s, {p, rot, t, alpha})            s = fruit radius; cut face toward the viewer
     bird(L, x, y, s, {rot, flap, fly, facing, alpha})      small songbird (s = body length), perched or flying
   p 0..1 = reveal (pencil underdrawing → washes → details), so a study can be "painted" in.
   --------------------------------------------------------------------------------------------------------------- */
(function () {
  const E = window.E;
  const PI = Math.PI, TAU = PI * 2;
  const lerp = E.lerp, clamp = E.clamp, seg = E.seg;
  const ART = (E.natArt = E.natArt || {});
  const sst = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const polyP = (pts, closed = true) => {
    const p = new Path2D();
    for (let i = 0; i < pts.length; i++) (i ? p.lineTo(pts[i][0], pts[i][1]) : p.moveTo(pts[i][0], pts[i][1]));
    if (closed) p.closePath();
    return p;
  };
  const smoothP = (pts, closed = true, ten = 0.5) => E.smoothPath(pts, closed, ten);
  /** the first fraction f of a polyline (pencil draw-on) */
  const partPts = (pts, f) => {
    f = clamp(f);
    if (f >= 1) return pts;
    const n = (pts.length - 1) * f, i = Math.floor(n), fr = n - i;
    const out = pts.slice(0, i + 1);
    if (i + 1 < pts.length) out.push([lerp(pts[i][0], pts[i + 1][0], fr), lerp(pts[i][1], pts[i + 1][1], fr)]);
    return out;
  };
  /** local frame on all three layers; s = units → caller px */
  const inFrame = (L, x, y, s, rot, fn) => {
    E.save(L);
    E.translate(L, x, y);
    if (rot) E.rotate(L, rot);
    E.scale(L, s);
    try { fn(devS(L.paint)); } finally { E.restore(L); }
  };
  const devS = (c) => { const m = c.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; };
  /** pencil line in local units (w in screen px) */
  const pen = (L, S, path, a, w = 1, seed = 11) => {
    if (!(a > 0.004) || !path) return;
    if (Array.isArray(path)) { if (path.length < 2) return; path = smoothP(path, false); }
    E.pencil(L.ink, path, { a, w: w / S, seed, jitter: 0.9 / S });
  };
  /** glaze (multiply) with alpha */
  const glaze = (L, path, col, a, o = {}) => { if (a > 0.003) E.wash(L.paint, path, col, Object.assign({ alpha: a }, o)); };
  /** paper (opaque white) base — hides what is behind and erases ink/light there (occlusion) */
  const paperBase = (L, path, a) => {
    if (!(a > 0.003)) return;
    E.wash(L.paint, path, '#FFFFFF', { mode: 'over', alpha: a });
    for (const c of [L.ink, L.light]) { c.save(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = Math.min(1, a); c.fill(path); c.restore(); }
  };
  /** stroke on the paint layer (multiply) */
  const pstroke = (L, path, col, w, a, cap = 'round') => {
    if (!(a > 0.003)) return;
    const c = L.paint;
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha *= a;
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = cap; c.lineJoin = 'round';
    c.stroke(path);
    c.restore();
  };
  /** paper-white stroke (lifted highlight) */
  const lstroke = (L, path, w, a) => {
    if (!(a > 0.003)) return;
    const c = L.paint;
    c.save();
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha *= a;
    c.strokeStyle = '#FFFFFF'; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
    c.stroke(path);
    c.restore();
  };
  const clipDo = (L, path, fn) => { E.save(L); E.each(L, (c) => c.clip(path)); try { fn(); } finally { E.restore(L); } };
  const lineP = (a, b) => { const p = new Path2D(); p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1]); return p; };
  const ell = (x, y, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(x, y, Math.max(1e-4, rx), Math.max(1e-4, ry), rot, 0, TAU); return p; };
  const fadeA = (L, a, fn) => { if (a <= 0.003) return; E.save(L); E.alpha(L, a); try { fn(); } finally { E.restore(L); } };

  // ================================================================================================ leaves (generic)
  /** leaf outline from base (0,0) to tip (1,0): upper margin then lower margin. Ovate, acuminate; optional teeth. */
  function leafOutline({ W = 0.4, teeth = 0, tooth = 0.018, n = 48, bend = 0.03, base = 0.6, tipP = 1.05, skew = 0 } = {}) {
    const up = [], lo = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      let w = W * 2.6 * Math.pow(s, base) * Math.pow(1 - s, tipP);
      let tw = 0;
      if (teeth && s > 0.06 && s < 0.97) { const ph = (s * teeth) % 1; tw = tooth * Math.pow(ph, 1.6) * sst(s * 8) * (1 - 0.6 * s); }
      const yc = bend * Math.sin(PI * s);
      up.push([s, yc - (w + tw) * (1 - skew)]);
      lo.push([s, yc + (w + tw * 0.9) * (1 + skew)]);
    }
    return up.concat(lo.reverse().slice(1, -1));
  }
  const midY = (bend, s) => bend * Math.sin(PI * s);

  // ================================================================================================ the rose
  const GA = 2.39996323;
  const RN = 15;
  /** petals of a rose bloom in 3-D (cup on a cone), projected with elevation BETA, sorted back to front */
  function rosePetals(open, phi0) {
    const BETA = 0.62, cb = Math.cos(BETA), sb = Math.sin(BETA);
    const out = [];
    for (let k = 0; k < RN; k++) {
      const f = k / (RN - 1);
      const st = (1 - f) * 0.7;                                   // outer petals open first, one after another
      const o = sst(seg(open, st, st + 0.3));
      const phi = phi0 + k * GA;
      const jr = E.hash(k, 7, Math.round(phi0 * 100));
      const len = (0.32 + 0.7 * Math.pow(f, 0.8)) * (0.92 + 0.16 * jr);
      const hw = 1.28 - 0.48 * f;
      const r0 = 0.03 + 0.1 * f, z0 = -0.12 * f;
      const a0 = lerp(0.06 + 0.2 * f, 0.12 + 0.84 * Math.pow(f, 1.3), o);
      const refl = (0.05 + 0.42 * Math.pow(f, 1.5)) * o, curl = 1.5 * Math.pow(f, 1.2) * o, mid = 0.55 * Math.pow(f, 1.5) * o;
      const P = (u, v) => {
        const n = 7, du = u / n;
        let r = r0, z = z0;
        for (let i = 0; i < n; i++) {
          const s = (i + 0.5) * du;
          const a = a0 + refl * s * s + curl * v * v * s * s * s + mid * Math.exp(-v * v * 6) * s * s * s * s;
          r += len * Math.sin(a) * du; z += len * Math.cos(a) * du;
        }
        const W = Math.pow(Math.sin((PI / 2) * Math.min(1, u / 0.78)), 0.75);
        const ang = phi + v * hw * W;
        const X = r * Math.cos(ang), Y = r * Math.sin(ang);
        return [X, -z * cb + Y * sb, Y * cb + z * sb];
      };
      const pt0 = 0.07 * f * o;
      const ut = (v) => 1 + pt0 * Math.exp(-v * v * 9) - (0.1 + 0.04 * f * o) * v * v - 0.035 * (1 - f * o) * Math.exp(-(v / 0.18) * (v / 0.18));
      const pts = [];
      for (let i = 0; i <= 7; i++) pts.push(P((i / 7) * ut(-1), -1));
      for (let j = 1; j < 12; j++) { const v = -1 + (2 * j) / 12; pts.push(P(ut(v), v)); }
      for (let i = 7; i >= 0; i--) pts.push(P((i / 7) * ut(1), 1));
      const rim = pts.slice(7, 7 + 13);
      const am = a0 + refl * 0.36;
      const inner = -Math.cos(am) * Math.sin(phi) * cb + Math.sin(am) * sb > 0;
      const c = P(0.55, 0);
      const veins = f > 0.45 ? [-0.45, 0, 0.45].map((v) => [0.15, 0.35, 0.55, 0.75, 0.9].map((u) => P(u, v))) : null;
      out.push({ k, f, o, pts, rim, depth: c[2], inner, base: P(0.04, 0), tip: P(0.96, 0), phi, veins });
    }
    out.sort((a, b) => a.depth - b.depth);
    return out;
  }
  const ROSE_IN = ['#9E3A52', '#C46A7C', '#EDB8BB'];
  const ROSE_OUT = ['#A9475F', '#C87A88', '#E2A2AA'];
  /** the bloom (head radius 1 in local units when open) */
  ART.roseHead = (L, x, y, s, o = {}) => {
    const open = clamp(o.open ?? 1), p = clamp(o.p ?? 1), alpha = clamp(o.alpha ?? 1), seed = o.seed ?? 1;
    if (alpha <= 0.003 || p <= 0) return;
    inFrame(L, x, y, s, o.rot || 0, (S) => {
      const petals = rosePetals(open, 0.55 + seed * 1.3);
      const pa = sst(seg(p, 0, 0.45)) * alpha;        // pencil
      const wa = sst(seg(p, 0.2, 0.85)) * alpha;      // washes
      const rr = E.rng(seed * 17 + 3);
      // sepals peeking from under the bloom (more visible while it is a bud)
      const sep = 0.35 + 0.65 * (1 - open);
      for (let i = 0; i < 5; i++) {
        const a = 0.9 + i * 1.257 + seed;
        const dirx = Math.cos(a), diry = Math.sin(a) * 0.55 + 0.35;
        const bx = dirx * 0.12, by = 0.16;
        const tx = bx + dirx * 0.55 * sep, ty = by + diry * 0.5 * sep;
        const nx = -diry * 0.06, ny = dirx * 0.06;
        const pts = [[bx - nx, by - ny], [lerp(bx, tx, 0.5) - nx * 1.1, lerp(by, ty, 0.5) - ny * 1.1], [tx, ty], [lerp(bx, tx, 0.5) + nx * 0.8, lerp(by, ty, 0.5) + ny * 0.8], [bx + nx, by + ny]];
        const path = smoothP(pts, true, 0.4);
        glaze(L, path, '#7E9F5C', 0.8 * wa);
        glaze(L, path, '#5E7F4B', 0.3 * wa);
      }
      // the cup body under the petals (no holes between the heart and the front petals)
      {
        const cup = ell(0, 0.02, 0.1 + 0.36 * open, 0.07 + 0.2 * open);
        paperBase(L, cup, 0.92 * Math.max(wa, 0.15 * pa));   // paper follows the paint (no white blob under the pencil)
        const g = L.paint.createLinearGradient(0, -0.3, 0, 0.35);
        g.addColorStop(0, '#8E3048'); g.addColorStop(1, '#C27484');
        glaze(L, cup, g, 0.9 * wa);
      }
      for (const pt of petals) {
        const path = smoothP(pt.pts, true, 0.42);
        paperBase(L, path, 0.92 * Math.max(wa, 0.15 * pa));
        const C = pt.inner ? ROSE_IN : ROSE_OUT;
        const g = L.paint.createLinearGradient(pt.base[0], pt.base[1], pt.tip[0], pt.tip[1]);
        const deep = Math.pow(1 - pt.f, 1.4);
        g.addColorStop(0, E.mix(C[0], '#80283F', 0.5 * deep));
        g.addColorStop(0.5, E.mix(C[1], '#93344C', 0.55 * deep));
        g.addColorStop(1, E.mix(C[2], C[0], 0.7 * deep));
        glaze(L, path, g, wa * (0.86 + 0.1 * rr()));
        // a second glaze toward the base where the petal sits in the shadow of the ones in front
        if (pt.inner) {
          const g2 = L.paint.createLinearGradient(pt.base[0], pt.base[1], pt.tip[0], pt.tip[1]);
          g2.addColorStop(0, 'rgba(150,52,78,0.55)'); g2.addColorStop(0.45, 'rgba(150,52,78,0.12)'); g2.addColorStop(1, 'rgba(150,52,78,0)');
          glaze(L, path, g2, wa * 0.8);
        }
        // fine veins on the larger petals
        if (pt.veins) for (const v of pt.veins) pstroke(L, smoothP(v, false), '#8E3A52', 0.007, 0.1 * wa);
        // light catching the rim (bare paper)
        if (pt.f > 0.25) lstroke(L, smoothP(pt.rim, false, 0.4), 0.03 * (0.4 + 0.6 * pt.f), 0.4 * wa * (pt.inner ? 1 : 0.55));
        pen(L, S, smoothP(pt.rim, false, 0.4), (0.26 + 0.12 * pt.f) * pa, 0.9, 30 + pt.k);
        if (pt.f > 0.35) pen(L, S, smoothP(pt.pts.slice(0, 8), false), 0.13 * pa, 0.8, 50 + pt.k);
      }
      // the tight heart of the bloom: a soft deep shadow and a few curled petal edges
      const sw = wa * (0.6 + 0.4 * open);
      const cy0 = -0.36 * (1 - 0.25 * open);
      E.wash(L.paint, ell(0, cy0 + 0.02, 0.09, 0.05), '#7A2A40', { alpha: 0.45 * sw, soft: 0.03 });
      for (let i = 0; i < 3; i++) {
        const a0 = seed * 2 + i * 2.2, r = 0.035 + i * 0.03 * (0.6 + 0.4 * open);
        const pts = [];
        for (let j = 0; j <= 8; j++) { const a = a0 + j * 0.28; pts.push([Math.cos(a) * r, cy0 + Math.sin(a) * r * 0.55]); }
        pstroke(L, smoothP(pts, false), '#86304A', 0.012, 0.4 * sw);
      }
    });
  };

  /** rose study: stem curving down-left with two compound leaves, then the bloom (local units: bloom radius 1) */
  const ROSE_STEM = [[0.02, 0.22], [-0.04, 0.8], [-0.2, 1.45], [-0.42, 2.05], [-0.62, 2.5]];
  ART.roseStudy = (L, x, y, s, o = {}) => {
    const p = clamp(o.p ?? 1), alpha = clamp(o.alpha ?? 1), t = o.t || 0;
    if (alpha <= 0.003 || p <= 0) return;
    inFrame(L, x, y, s, o.rot || 0, (S) => {
      const pa = sst(seg(p, 0, 0.5)) * alpha, wa = sst(seg(p, 0.25, 0.9)) * alpha;
      // stem (tapered stroke) with two small thorns
      const st = partPts(ROSE_STEM, sst(seg(p, 0, 0.55)));
      const sp = smoothP(st, false);
      pstroke(L, sp, '#6E8E4E', 0.075, 0.85 * wa);
      pstroke(L, sp, '#4E6E3E', 0.03, 0.5 * wa);
      pen(L, S, sp, 0.3 * pa, 1, 71);
      [[0.62, 1], [0.35, -1]].forEach(([u, sd]) => {
        const q = ROSE_STEM[Math.round(u * 4)];
        const th = smoothP([[q[0] + 0.03 * sd, q[1] - 0.04], [q[0] + 0.1 * sd, q[1] - 0.1], [q[0] + 0.035 * sd, q[1] + 0.02]], true, 0.2);
        glaze(L, th, '#9A5A48', 0.7 * wa);
      });
      // compound leaves: three serrated leaflets on a rachis
      const LEAVES = [[0.44, 1, 0.55, 1.0], [0.72, -1, -0.15, 0.85]];
      LEAVES.forEach(([u, side, ang, sz], li) => {
        const lp = sst(seg(p, 0.15 + 0.15 * li, 0.75 + 0.1 * li));
        if (lp <= 0) return;
        const i0 = Math.floor(u * 4), fr = u * 4 - i0;
        const q = [lerp(ROSE_STEM[i0][0], ROSE_STEM[i0 + 1][0], fr), lerp(ROSE_STEM[i0][1], ROSE_STEM[i0 + 1][1], fr)];
        const a = side > 0 ? -0.35 + ang : PI + 0.35 + ang;
        const dir = [Math.cos(a), Math.sin(a)];
        const rach = [q, [q[0] + dir[0] * 0.55 * sz, q[1] + dir[1] * 0.55 * sz]];
        pstroke(L, lineP(rach[0], rach[1]), '#6E8E4E', 0.022, 0.8 * wa * lp);
        const leaflets = [[1.0, 0, 0.62], [0.55, 1, 0.5], [0.55, -1, 0.5]];
        leaflets.forEach(([d, sd2, ls], j) => {
          const bx = q[0] + dir[0] * 0.55 * sz * d, by = q[1] + dir[1] * 0.55 * sz * d;
          const la = a + sd2 * 0.95 + 0.06 * Math.sin(t * 1.1 + j + li);
          const L1 = ls * sz * sst(seg(lp, j * 0.15, 0.6 + j * 0.15));
          if (L1 <= 0.01) return;
          E.save(L);
          E.translate(L, bx, by); E.rotate(L, la); E.scale(L, L1);
          const out = leafOutline({ W: 0.3, teeth: 11, tooth: 0.035, n: 66, bend: 0.04 * sd2 });
          const path = polyP(out);
          paperBase(L, path, 0.85 * wa);
          glaze(L, path, '#8DAE62', 0.9 * wa);
          const half = polyP(out.slice(0, 67).concat([[1, midY(0.04 * sd2, 1)], [0, 0]]));
          glaze(L, half, '#5F8A4A', 0.42 * wa);
          const mid = []; for (let i = 0; i <= 10; i++) mid.push([i / 10 * 0.96, midY(0.04 * sd2, i / 10)]);
          lstroke(L, smoothP(mid, false), 0.03, 0.4 * wa);
          for (let i = 1; i <= 4; i++) {
            const s0 = i * 0.18;
            for (const sd3 of [-1, 1]) lstroke(L, lineP([s0, midY(0.04 * sd2, s0)], [s0 + 0.13, midY(0.04 * sd2, s0) + sd3 * 0.16]), 0.016, 0.3 * wa);
          }
          pen(L, S * L1, path, 0.3 * pa, 0.9, 80 + j + li * 3);
          E.restore(L);
        });
      });
      ART.roseHead(L, 0, 0, 1, { open: o.open ?? 1, p, seed: o.seed ?? 1, alpha });
    });
  };

  // ================================================================================================ leaf study
  const LEAF = (() => {
    const bend = 0.035;
    const out = leafOutline({ W: 0.36, teeth: 22, tooth: 0.016, n: 132, bend, base: 0.5, tipP: 1.12 });
    const mid = []; for (let i = 0; i <= 24; i++) mid.push([(i / 24) * 0.985, midY(bend, i / 24)]);
    const halfW = (s) => 0.36 * 2.6 * Math.pow(s, 0.5) * Math.pow(1 - s, 1.12);
    const veins = [];
    const r = E.rng(77);
    for (let i = 0; i < 9; i++) {
      for (const sd of [-1, 1]) {
        const s0 = 0.07 + i * 0.094 + (sd > 0 ? 0.03 : 0) + 0.01 * (r() - 0.5);
        if (s0 > 0.9) continue;
        const pts = [];
        const reach = 0.86 - 0.05 * (i / 9);
        for (let j = 0; j <= 8; j++) {
          const u = j / 8;
          const s = s0 + (0.13 + 0.05 * (1 - s0)) * Math.pow(u, 0.85);
          const w = halfW(Math.min(0.995, s)) * reach * Math.pow(u, 0.75);
          pts.push([s, midY(bend, s) + sd * w]);
        }
        const twigs = [];
        for (const tu of [0.45, 0.72]) {
          const k = Math.round(tu * 8), q = pts[k];
          twigs.push([q, [q[0] + 0.045, q[1] - sd * 0.035 * (r() > 0.5 ? 1 : -0.6)]]);
        }
        veins.push({ pts, s0, sd, twigs });
      }
    }
    return { out, mid, veins, bend };
  })();
  ART.leafStudy = (L, x, y, s, o = {}) => {
    const p = clamp(o.p ?? 1), alpha = clamp(o.alpha ?? 1);
    if (alpha <= 0.003 || p <= 0) return;
    inFrame(L, x, y, s, o.rot || 0, (S) => {
      E.translate(L, -0.5, 0);
      const pa = sst(seg(p, 0, 0.4)) * alpha, wa = sst(seg(p, 0.15, 0.7)) * alpha, va = seg(p, 0.42, 1);
      const path = polyP(LEAF.out);
      // the wash spreads from the base of the leaf like wet pigment
      const grow = sst(seg(p, 0.12, 0.72));
      if (wa > 0) {
        const gp = E.blob(0.02, 0, 0.05 + grow * 1.1, { seed: 5, irr: 0.18 });
        clipDo(L, gp, () => {
          paperBase(L, path, 0.85 * wa);
          glaze(L, path, '#AFC27A', 0.95 * wa);
          // fold: the far half in shadow
          const half = polyP(LEAF.out.slice(0, 133).concat([[1, 0], [0, 0]]));
          glaze(L, half, '#6F9A55', 0.5 * wa);
          // wet blooms: a warm ochre blush toward the tip, a cooler green toward the base
          E.bloom(L.paint, 0.74, 0.03, 0.13, '#D7B45E', { alpha: 0.35 * wa, soft: 0.04, seed: 9 });
          E.bloom(L.paint, 0.2, 0.06, 0.12, '#4F7F4A', { alpha: 0.22 * wa, soft: 0.04, seed: 4 });
          glaze(L, path, '#3E6B45', 0.12 * wa, { grad: { from: [0.0, 0], to: [1, 0], stops: [[0, 'rgba(62,107,69,1)'], [0.5, 'rgba(62,107,69,0.2)'], [1, 'rgba(62,107,69,0)']] } });
        });
      }
      // petiole
      const pet = smoothP([[0.005, 0], [-0.07, 0.01], [-0.15, 0.03]], false);
      pstroke(L, pet, '#6E8A4A', 0.018, 0.85 * wa);
      pen(L, S, pet, 0.32 * pa, 1, 3);
      // pencil outline draws on, both margins from the base
      const n2 = Math.floor(LEAF.out.length / 2);
      pen(L, S, polyP(partPts(LEAF.out.slice(0, n2 + 1), sst(seg(p, 0, 0.42))), false), 0.34 * pa, 0.95, 5);
      pen(L, S, polyP(partPts(LEAF.out.slice(n2).reverse(), sst(seg(p, 0.04, 0.46))), false), 0.3 * pa, 0.95, 6);
      // veins emerge from the base outward: lifted pale lines + fine pencil
      if (va > 0) {
        const mp = smoothP(partPts(LEAF.mid, sst(seg(va, 0, 0.45))), false);
        lstroke(L, mp, 0.012, 0.5 * wa);
        pen(L, S, mp, 0.3 * alpha, 0.85, 7);
        LEAF.veins.forEach((v, i) => {
          const k = sst(seg(va, 0.08 + v.s0 * 0.5, 0.45 + v.s0 * 0.55));
          if (k <= 0) return;
          const vp = smoothP(partPts(v.pts, k), false);
          lstroke(L, vp, 0.0058, 0.45 * wa);
          pen(L, S, vp, 0.22 * alpha, 0.7, 20 + i);
          if (k > 0.8) v.twigs.forEach((tw, j) => pen(L, S, tw, 0.13 * alpha * sst((k - 0.8) / 0.2), 0.6, 60 + i * 2 + j));
        });
      }
    });
  };

  // ================================================================================================ butterfly
  // right half (wingspan 1: x 0..0.5), head toward −y
  const BF = (() => {
    const fore = [[0.025, -0.05], [0.09, -0.16], [0.2, -0.27], [0.34, -0.345], [0.455, -0.37], [0.5, -0.335], [0.475, -0.24], [0.42, -0.135], [0.335, -0.035], [0.21, 0.015], [0.08, 0.02], [0.03, -0.005]];
    const hind = [[0.03, 0.0], [0.15, -0.005], [0.27, 0.03], [0.325, 0.085], [0.33, 0.14], [0.3, 0.2], [0.265, 0.25], [0.225, 0.295], [0.205, 0.37], [0.183, 0.45], [0.16, 0.455], [0.152, 0.37], [0.13, 0.31], [0.085, 0.255], [0.045, 0.17], [0.02, 0.07]];
    const foreP = smoothP(fore, true, 0.45), hindP = smoothP(hind, true, 0.45);
    // outer margins (for the dark bands and the lunules)
    const foreM = [[0.455, -0.37], [0.5, -0.335], [0.475, -0.24], [0.42, -0.135], [0.335, -0.035]];
    const hindM = [[0.27, 0.03], [0.325, 0.085], [0.33, 0.14], [0.3, 0.2], [0.265, 0.25], [0.225, 0.295]];
    const fVeins = [[0.48, -0.33], [0.47, -0.27], [0.44, -0.19], [0.39, -0.11], [0.32, -0.04], [0.2, 0.0], [0.38, -0.36], [0.3, -0.33]];
    const hVeins = [[0.3, 0.07], [0.325, 0.13], [0.3, 0.19], [0.255, 0.25], [0.21, 0.33], [0.17, 0.42], [0.11, 0.28]];
    return { foreP, hindP, foreM, hindM, fVeins, hVeins };
  })();
  ART.butterfly = (L, x, y, s, o = {}) => {
    const p = clamp(o.p ?? 1), alpha = clamp(o.alpha ?? 1), flap = clamp(o.flap ?? 1, 0.06, 1);
    if (alpha <= 0.003 || p <= 0) return;
    inFrame(L, x, y, s, o.rot || 0, (S) => {
      const pa = sst(seg(p, 0, 0.4)) * alpha, wa = sst(seg(p, 0.2, 0.7)) * alpha, da = sst(seg(p, 0.45, 1)) * alpha;
      const wingSide = (sd, fn) => { E.save(L); E.scale(L, sd * flap, 1); try { fn(); } finally { E.restore(L); } };
      const SX = S * flap;
      for (const sd of [-1, 1]) {
        wingSide(sd, () => {
          for (const [wp, M, veins, root, hindW] of [[BF.hindP, BF.hindM, BF.hVeins, [0.04, 0.03], true], [BF.foreP, BF.foreM, BF.fVeins, [0.05, -0.02], false]]) {
            paperBase(L, wp, 0.9 * Math.max(wa, pa * 0.15));
            glaze(L, wp, '#F2D97E', 0.92 * wa);
            glaze(L, wp, '#E9C25E', 0.35 * wa, { grad: { from: [0.05, 0], to: [0.45, 0], stops: [[0, 'rgba(233,194,94,0)'], [1, 'rgba(233,194,94,1)']] } });
            clipDo(L, wp, () => {
              // dark wing base by the body
              E.wash(L.paint, ell(root[0] - 0.02, root[1] + (hindW ? 0.06 : -0.04), 0.09, hindW ? 0.12 : 0.1, 0.3), '#3B3240', { alpha: 0.82 * da, soft: 0.012 });
              // dark marginal band with pale lunules
              const mp = smoothP(M, false);
              pstroke(L, mp, '#2F2A36', hindW ? 0.12 : 0.1, 0.88 * da);
              if (hindW) {
                // blue scales inside the band, an orange spot at the inner angle
                for (let i = 0; i < 5; i++) {
                  const q = M[Math.min(M.length - 1, i + 1)], c = [q[0] - 0.045, q[1] - 0.01 * i];
                  E.wash(L.paint, ell(c[0], c[1], 0.022, 0.012, 0.6), '#6F95C6', { mode: 'over', alpha: 0.75 * da });
                }
                E.wash(L.paint, ell(0.075, 0.25, 0.03, 0.026), '#2F2A36', { mode: 'over', alpha: 0.9 * da });
                E.wash(L.paint, ell(0.077, 0.247, 0.019, 0.016), '#D9603F', { mode: 'over', alpha: 0.9 * da });
              } else {
                // costal bars
                [[0.12, -0.195], [0.2, -0.26], [0.29, -0.315]].forEach(([bx, by], i) => {
                  const bp = smoothP([[bx - 0.02, by - 0.04], [bx + 0.025, by - 0.05], [bx + 0.03, by + 0.05 - i * 0.005], [bx - 0.01, by + 0.06]], true, 0.3);
                  glaze(L, bp, '#302A36', 0.85 * da);
                });
              }
              // lunules along the margin
              for (let i = 0; i < M.length - 1; i++) {
                const a = M[i], b = M[i + 1], c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
                const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1;
                const q = [c[0] - (nx / nl) * 0.022, c[1] - (ny / nl) * 0.022];
                E.wash(L.paint, ell(q[0], q[1], 0.018, 0.01, Math.atan2(b[1] - a[1], b[0] - a[0])), '#F4DE90', { mode: 'over', alpha: 0.85 * da });
              }
              // veins
              for (const v of veins) pstroke(L, lineP(root, v), '#3A3340', 0.008, 0.75 * da);
            });
            pen(L, SX, wp, 0.32 * pa, 0.9, hindW ? 91 : 92);
          }
        });
      }
      // body: abdomen, thorax, head, antennae
      const ba = Math.max(wa, pa * 0.3);
      E.wash(L.paint, ell(0, 0.12, 0.02, 0.12), '#3A3240', { mode: 'over', alpha: 0.95 * ba });
      E.wash(L.paint, ell(0, 0.12, 0.009, 0.1), '#E8CF7A', { alpha: 0.5 * ba });
      E.wash(L.paint, ell(0, -0.025, 0.028, 0.06), '#2F2A36', { mode: 'over', alpha: 0.95 * ba });
      E.wash(L.paint, ell(0, -0.1, 0.022, 0.02), '#2F2A36', { mode: 'over', alpha: 0.95 * ba });
      for (const sd of [-1, 1]) {
        const an = smoothP([[sd * 0.008, -0.115], [sd * 0.04, -0.2], [sd * 0.085, -0.29]], false);
        pstroke(L, an, '#2F2A36', 0.007, 0.9 * ba);
        E.wash(L.paint, ell(sd * 0.087, -0.295, 0.009, 0.014, sd * 0.5), '#2F2A36', { mode: 'over', alpha: 0.9 * ba });
      }
    });
  };

  // ================================================================================================ feather
  const FEA = (() => {
    const bendY = (s) => -0.045 * Math.sin(PI * s * 0.95);
    const prof = (s) => {
      if (s < 0.12) return 0;
      const q = (s - 0.12) / 0.88;
      return Math.pow(Math.sin((PI / 2) * Math.min(1, q / 0.2)), 0.8) * (q < 0.78 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((q - 0.78) / 0.22, 2))));
    };
    const BARB = 0.075;                                   // barbs sweep toward the tip by this much
    const wU = (s) => 0.05 * prof(s), wL = (s) => 0.118 * prof(s) * (1 - 0.12 * s);
    const N = 70;
    const rach = [], up = [], lo = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      rach.push([s, bendY(s)]);
    }
    const sweep = (s) => BARB * (1 - sst((s - 0.78) / 0.22));
    for (let i = 0; i <= N; i++) {
      const s = 0.12 + (0.88 * i) / N;
      const notch = (s0, d) => Math.exp(-Math.pow((s - s0) / 0.008, 2)) * d;
      up.push([s + sweep(s) * 0.5, bendY(s) - wU(s) * (1 - notch(0.66, 0.16))]);
      lo.push([s + sweep(s), bendY(s) + wL(s) * (1 - notch(0.52, 0.14) - notch(0.71, 0.12))]);
    }
    const outline = [[0.12, bendY(0.12)]].concat(up, lo.slice().reverse());
    return { bendY, wU, wL, BARB, sweep, rach, up, lo, outline };
  })();
  ART.feather = (L, x, y, s, o = {}) => {
    const p = clamp(o.p ?? 1), alpha = clamp(o.alpha ?? 1), t = o.t || 0;
    if (alpha <= 0.003 || p <= 0) return;
    inFrame(L, x, y, s, o.rot || 0, (S) => {
      E.translate(L, -0.5, 0.02);
      const pa = sst(seg(p, 0, 0.45)) * alpha, wa = sst(seg(p, 0.18, 0.72)) * alpha, da = sst(seg(p, 0.4, 1)) * alpha;
      const { bendY, wU, wL, BARB, sweep } = FEA;
      const vane = polyP(FEA.outline);
      // the paint runs out along the feather from the quill
      const reach = 0.1 + 1.0 * sst(seg(p, 0.15, 0.8));
      const rp = new Path2D(); rp.rect(-0.1, -0.5, reach + 0.1, 1);
      clipDo(L, rp, () => {
        paperBase(L, vane, 0.9 * wa);
        // grey-blue at the base deepening into bright cerulean toward the tip
        glaze(L, vane, '#9FB6D6', 0.85 * wa, { grad: { from: [0.12, 0], to: [1, 0], stops: [[0, '#C9D0DA'], [0.3, '#A9BEDB'], [0.6, '#7FA7D6'], [1, '#6E9BD3']] } });
        // black bars (sloped like the barbs), white between the last ones, dark tip
        clipDo(L, vane, () => {
          const bars = [0.38, 0.47, 0.555, 0.635, 0.71, 0.785, 0.855];
          bars.forEach((b, i) => {
            const w = 0.016 + 0.004 * (i % 2);
            const q = [[b - w, -0.3], [b + w, -0.3], [b + w + BARB * 2.4, 0.3], [b - w + BARB * 2.4, 0.3]];
            const k = sst(seg(da, i * 0.08, 0.35 + i * 0.08));
            glaze(L, polyP(q), '#273047', 0.88 * k);
          });
          // brighter ultramarine between the bars toward the tip
          glaze(L, vane, '#5C7CB7', 0.35 * da, { grad: { from: [0.4, 0], to: [1, 0], stops: [[0, 'rgba(92,124,183,0)'], [0.5, 'rgba(92,124,183,1)'], [1, 'rgba(92,124,183,0.6)']] } });
          // a soft darker tip
          glaze(L, vane, '#2B3348', 0.5 * da, { grad: { from: [0.86, 0], to: [1.02, 0], stops: [[0, 'rgba(43,51,72,0)'], [1, 'rgba(43,51,72,1)']] } });
          // barbs: fine lines from the shaft sweeping toward the tip
          const c = L.paint;
          c.save();
          c.globalCompositeOperation = 'multiply';
          c.globalAlpha *= 0.22 * da;
          c.strokeStyle = '#2B3348';
          c.lineWidth = 1.0 / S;
          c.beginPath();
          for (let i = 0; i < 90; i++) {
            const s0 = 0.13 + (0.86 * i) / 90;
            const y0 = bendY(s0);
            const b = sweep(s0);
            c.moveTo(s0, y0); c.quadraticCurveTo(s0 + b * 0.3, y0 - wU(s0) * 0.6, s0 + b * 0.5, y0 - wU(s0) - 0.01);
            c.moveTo(s0, y0); c.quadraticCurveTo(s0 + b * 0.45, y0 + wL(s0) * 0.6, s0 + b, y0 + wL(s0) + 0.01);
          }
          c.stroke();
          c.restore();
          // two splits in the vane (paper shows through)
          for (const [s0, side] of [[0.52, 1], [0.71, 1], [0.66, -1]]) {
            const y0 = bendY(s0);
            const w0 = side > 0 ? wL(s0) : wU(s0), b = side > 0 ? sweep(s0) : sweep(s0) * 0.5;
            lstroke(L, smoothP([[s0 + b * 0.35, y0 + side * w0 * 0.45], [s0 + b * 0.7, y0 + side * w0 * 0.75], [s0 + b + 0.004, y0 + side * (w0 + 0.01)]], false), 0.0045, 0.85 * da);
          }
        });
        // downy afterfeather at the base: fine soft wisps
        const r = E.rng(41);
        const c2 = L.paint;
        c2.save();
        c2.globalCompositeOperation = 'multiply';
        c2.globalAlpha *= 0.4 * wa;
        c2.strokeStyle = '#A3A9B6';
        c2.lineWidth = 1.1 / S;
        c2.lineCap = 'round';
        c2.beginPath();
        for (let i = 0; i < 34; i++) {
          const s0 = 0.1 + r() * 0.1, sd = r() > 0.35 ? 1 : -1;
          const y0 = bendY(s0), L1 = 0.035 + r() * 0.045;
          const sway = 0.006 * Math.sin(t * 1.3 + i);
          c2.moveTo(s0, y0);
          c2.quadraticCurveTo(s0 + L1 * 0.5, y0 + sd * L1 * 0.7 + sway, s0 + L1 * (0.8 + 0.3 * r()), y0 + sd * L1 * (0.55 + 0.4 * r()) + sway * 2);
        }
        c2.stroke();
        c2.restore();
      });
      // the shaft: pale quill with a darker edge
      const rp2 = smoothP(partPts(FEA.rach, sst(seg(p, 0, 0.5))), false);
      pstroke(L, rp2, '#B9AE98', 0.014, 0.75 * Math.max(pa, wa));
      lstroke(L, rp2, 0.005, 0.8 * wa);
      pen(L, S, rp2, 0.28 * pa, 0.9, 101);
      pen(L, S, polyP(partPts(FEA.up, sst(seg(p, 0.05, 0.5))), false), 0.24 * pa, 0.8, 102);
      pen(L, S, polyP(partPts(FEA.lo, sst(seg(p, 0.08, 0.55))), false), 0.24 * pa, 0.8, 103);
    });
  };

  // ================================================================================================ pomegranate
  const POM = (() => {
    const r = E.rng(311);
    // membranes on the cut face (curves, local units, face radius ≈ 0.86)
    const mem = [
      [[0.0, -0.78], [0.03, -0.45], [-0.02, -0.1], [0.02, 0.25], [0.0, 0.8]],
      [[0.02, -0.1], [-0.3, -0.25], [-0.62, -0.42]],
      [[0.0, -0.08], [0.32, -0.22], [0.64, -0.38]],
      [[0.02, 0.25], [-0.32, 0.38], [-0.66, 0.36]],
      [[0.02, 0.27], [0.34, 0.42], [0.66, 0.32]],
    ];
    const memPts = mem.map((m) => { const out = []; const sp = m; for (let i = 0; i < sp.length - 1; i++) for (let j = 0; j < 8; j++) { const u = j / 8; out.push([lerp(sp[i][0], sp[i + 1][0], u), lerp(sp[i][1], sp[i + 1][1], u)]); } out.push(sp[sp.length - 1]); return out; });
    const dMem = (x, y) => { let d = 9; for (const m of memPts) for (const q of m) d = Math.min(d, Math.hypot(x - q[0], y - q[1])); return d; };
    // arils: jittered hexagonal packing inside the face, away from the membranes and the rind
    const arils = [];
    const sp = 0.105;
    for (let row = -9; row <= 9; row++) {
      for (let col = -9; col <= 9; col++) {
        const x = col * sp + (row % 2 ? sp / 2 : 0) + (r() - 0.5) * 0.018, y = row * sp * 0.87 + (r() - 0.5) * 0.018;
        const e = Math.hypot(x / 0.8, y / 0.76);
        if (e > 0.94) continue;
        if (dMem(x, y) < 0.06) continue;
        arils.push({ x, y, a: Math.atan2(y, x) + (r() - 0.5) * 0.6, w: 0.047 + r() * 0.008, h: 0.058 + r() * 0.01, k: r(), order: Math.atan2(x, -y) });
      }
    }
    arils.sort((a, b) => a.order - b.order);
    return { mem, arils };
  })();
  ART.pomegranate = (L, x, y, s, o = {}) => {
    const p = clamp(o.p ?? 1), alpha = clamp(o.alpha ?? 1);
    if (alpha <= 0.003 || p <= 0) return;
    inFrame(L, x, y, s, o.rot || 0, (S) => {
      const pa = sst(seg(p, 0, 0.4)) * alpha, wa = sst(seg(p, 0.15, 0.6)) * alpha;
      // the rind seen beyond the cut (lower right), the cut face, the crown on top
      const back = E.blob(0.07, 0.06, 1.0, { seed: 12, irr: 0.04, rx: 1.0, ry: 0.96 });
      const face = E.blob(0, 0, 0.9, { seed: 13, irr: 0.035, rx: 0.9, ry: 0.86 });
      const crown = smoothP([[-0.15, -0.8], [-0.16, -0.95], [-0.24, -1.05], [-0.3, -1.08], [-0.2, -1.07], [-0.11, -1.01], [-0.08, -1.13], [-0.03, -1.03], [0.03, -1.04], [0.1, -1.14], [0.12, -1.0], [0.2, -1.03], [0.29, -1.0], [0.2, -0.95], [0.16, -0.8]], true, 0.45);
      paperBase(L, back, 0.9 * Math.max(wa, pa * 0.15));
      paperBase(L, crown, 0.9 * Math.max(wa, pa * 0.15));
      glaze(L, crown, '#C47A52', 0.9 * wa);
      glaze(L, crown, '#8E4A3E', 0.4 * wa, { grad: { from: [0, -0.8], to: [0, -1.2], stops: [[0, 'rgba(142,74,62,1)'], [1, 'rgba(142,74,62,0)']] } });
      glaze(L, back, '#C2464A', 0.9 * wa);
      glaze(L, back, '#D9A060', 0.45 * wa, { grad: { from: [-0.6, -0.7], r: 1.1, r0: 0.1, stops: [[0, 'rgba(217,160,96,1)'], [1, 'rgba(217,160,96,0)']] } });
      glaze(L, back, '#7E2A3A', 0.5 * wa, { grad: { from: [0.9, 0.8], r: 1.2, r0: 0.2, stops: [[0, 'rgba(126,42,58,1)'], [1, 'rgba(126,42,58,0)']] } });
      // highlight on the rind
      E.lift(L.paint, ell(0.78, 0.55, 0.08, 0.035, -0.8), 0.5 * wa, 0.02);
      pen(L, S, back, 0.3 * pa, 1, 121);
      pen(L, S, crown, 0.28 * pa, 0.9, 122);
      // cut face: creamy pith, a thin rind edge
      paperBase(L, face, 0.95 * Math.max(wa, pa * 0.15));
      glaze(L, face, '#F3E2C2', 0.9 * wa);
      glaze(L, face, '#E9C7A0', 0.5 * wa, { grad: { from: [0, 0], r: 0.95, r0: 0.6, stops: [[0, 'rgba(233,199,160,0)'], [1, 'rgba(233,199,160,1)']] } });
      pen(L, S, face, 0.26 * pa, 0.9, 123);
      // membranes (paler, pencilled)
      POM.mem.forEach((m, i) => {
        const mp = smoothP(partPts(m, sst(seg(p, 0.2 + i * 0.04, 0.5 + i * 0.04))), false);
        lstroke(L, mp, 0.02, 0.6 * wa);
        pen(L, S, mp, 0.16 * pa, 0.7, 130 + i);
      });
      // the seeds appear in order, chamber by chamber (clockwise from the crown)
      const sp = seg(p, 0.35, 0.95);
      const n = POM.arils.length;
      const c = L.paint;
      POM.arils.forEach((ar, i) => {
        const k = sst(seg(sp * 1.25 - (i / n) * 1.0, 0, 0.25));
        if (k <= 0) return;
        const sc = 0.6 + 0.4 * k;
        const path = ell(ar.x, ar.y, ar.w * sc, ar.h * sc, ar.a + PI / 2);
        c.save(); c.globalAlpha *= k * alpha;
        glaze(L, path, ar.k > 0.5 ? '#C23A4C' : '#B23246', 0.85);
        glaze(L, ell(ar.x + Math.cos(ar.a) * 0.012, ar.y + Math.sin(ar.a) * 0.012, ar.w * sc * 0.7, ar.h * sc * 0.6, ar.a + PI / 2), '#7E1E34', 0.45);
        c.restore();
        E.lift(L.paint, ell(ar.x - 0.012, ar.y - 0.016, ar.w * 0.28, ar.h * 0.22, -0.6), 0.75 * k * alpha);
      });
    });
  };

  // ================================================================================================ songbird
  /** a small songbird (robin-like) — body length 1 local unit, facing +x (facing:-1 flips). perched (fly 0) or flying */
  ART.bird = (L, x, y, s, o = {}) => {
    const alpha = clamp(o.alpha ?? 1), fly = clamp(o.fly ?? 0), flap = o.flap ?? 0, facing = o.facing === -1 ? -1 : 1;
    if (alpha <= 0.003) return;
    E.save(L);
    E.translate(L, x, y);
    if (o.rot) E.rotate(L, o.rot);
    E.scale(L, s * facing, s);
    const S = devS(L.paint);
    const a = alpha;
    // wing (far) when flying
    const wingUp = Math.sin(flap);
    const wing = (sd, al) => {
      const tipY = -0.75 * wingUp * fly - 0.05, tipX = -0.05 + 0.25 * (1 - Math.abs(wingUp)) * fly;
      const pts = [[0.12, -0.12], [lerp(-0.05, tipX + 0.15, fly), lerp(-0.16, tipY * 0.6, fly)], [lerp(-0.35, tipX - 0.15, fly), lerp(-0.08, tipY, fly)], [lerp(-0.3, -0.25, fly), lerp(0.0, tipY * 0.5 + 0.05, fly)], [-0.05, 0.02]];
      const wp = smoothP(pts, true, 0.4);
      paperBase(L, wp, 0.9 * al);
      glaze(L, wp, sd > 0 ? '#8A7660' : '#7A6550', 0.9 * al);
      glaze(L, wp, '#5A4636', 0.35 * al, { grad: { from: [0, 0], to: [tipX - 0.2, tipY], stops: [[0, 'rgba(90,70,54,0)'], [1, 'rgba(90,70,54,1)']] } });
      pen(L, S, wp, 0.28 * al, 0.8, 140 + sd);
    };
    if (fly > 0.01) wing(-1, a * fly);
    // tail
    const tail = smoothP([[-0.3, -0.02], [-0.62, 0.02 + 0.08 * (1 - fly)], [-0.6, 0.12 + 0.04 * (1 - fly)], [-0.28, 0.1]], true, 0.3);
    paperBase(L, tail, 0.9 * a);
    glaze(L, tail, '#6E5A48', 0.9 * a);
    // body + head
    const body = smoothP([[0.42, -0.18], [0.2, -0.28], [-0.1, -0.22], [-0.34, -0.02], [-0.25, 0.14], [0.05, 0.2], [0.32, 0.1], [0.44, -0.04]], true, 0.5);
    const head = ell(0.4, -0.2, 0.17, 0.15);
    paperBase(L, body, 0.95 * a); paperBase(L, head, 0.95 * a);
    glaze(L, body, '#9C8670', 0.9 * a);
    glaze(L, head, '#9C8670', 0.9 * a);
    // warm breast and face
    const breast = smoothP([[0.5, -0.16], [0.42, 0.0], [0.26, 0.12], [0.06, 0.16], [0.12, 0.02], [0.3, -0.12]], true, 0.5);
    glaze(L, breast, '#E0844E', 0.85 * a);
    glaze(L, E.blob(0.0, 0.12, 0.16, { seed: 3, irr: 0.1, ry: 0.07 }), '#F3E6D6', 0.5 * a, { mode: 'over' });
    // eye, beak
    E.wash(L.paint, ell(0.45, -0.24, 0.026, 0.026), '#2B2A33', { mode: 'over', alpha: 0.95 * a });
    E.lift(L.paint, ell(0.457, -0.248, 0.008, 0.008), 0.9 * a);
    const beak = polyP([[0.55, -0.22], [0.66, -0.19], [0.55, -0.16]]);
    glaze(L, beak, '#4A3A30', 0.95 * a);
    pen(L, S, body, 0.3 * a, 0.8, 150);
    pen(L, S, head, 0.26 * a, 0.8, 151);
    // near wing
    if (fly > 0.01) wing(1, a);
    else {
      const wp = smoothP([[0.22, -0.14], [-0.05, -0.17], [-0.36, -0.04], [-0.12, 0.06], [0.14, 0.02]], true, 0.4);
      glaze(L, wp, '#6E5A48', 0.8 * a);
      pen(L, S, wp, 0.24 * a, 0.7, 152);
      // legs
      pstroke(L, lineP([0.05, 0.18], [0.02, 0.36]), '#5A4636', 0.025, 0.9 * a);
      pstroke(L, lineP([0.15, 0.17], [0.16, 0.36]), '#5A4636', 0.025, 0.9 * a);
    }
    E.restore(L);
  };
})();
(function () {
  const E = window.E;
  const P = E.P;
  const PI = Math.PI, TAU = PI * 2;
  const PR = () => E.props;
  const lerp = E.lerp, clamp = E.clamp, ep = E.ep, seg = E.seg;

  // ---------------------------------------------------------------- continuity with s08
  // s08's final camera B8 maps s08's world onto this shot's world, which equals the screen at lt = 0.
  const SH = (id, d) => E.SHOTS.find((s) => s.id === id) || d;
  const S07 = SH('s07', { start: 24.7, dur: 6.85 });
  const S08 = SH('s08', { start: 31.55 });
  const B8 = { x: 470, y: 852, z: 1.09 };
  const m8 = (x, y) => [(x - B8.x) * B8.z + 540, (y - B8.y) * B8.z + 960];
  const MAN = (() => { const q = m8(216, 1170); return { x: q[0], y: q[1], h: 700 * B8.z }; })();
  const W0 = m8(690, 1170 - 390 - 195 + 14);      // world centre (on s08's hourglass cap)
  const WR = 195 * B8.z;                           // world radius
  const PIV = m8(690, 1170 - 390 + 6);             // s08's rocking pivot (top of the cap)
  const HCLK = S07.dur + (0.15 + 2.5 - (E.T(47) - S07.start + 0.05));   // s08's heart clock offset
  const LT7 = S07.dur;                                                   // s08's idle clock offset
  // s08's parallax layers at its final camera, expressed in this shot's world
  const GK8 = 1.0, SK8 = 0.15;
  const LAY = (k) => ({ x: 540 + (B8.x - 540) * k, y: 960 + (B8.y - 960) * k, z: 1 + (B8.z - 1) * k });
  const G8 = LAY(GK8), K8 = LAY(SK8);
  const HZ8 = 925;                                 // s08 ground top (in its ground space)

  // ---------------------------------------------------------------- layout / constants
  const ZC = 1.88;                                 // close-up zoom (world radius ≈ 400 px on screen)
  const GD = 0.7, SD = 0.18;                       // parallax depths: land, sky
  const HOVER_A = E.rad(-128), HOVER_D = 1.24;     // heart hover position (angle, distance in world radii)

  const mixc = (a, b, k) => E.mix(a, b, clamp(k));
  const bez3 = (p0, p1, p2, p3, u) => {
    const v = 1 - u;
    return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
      v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
  };
  /** soft wet bloom as a radial-gradient glaze (cheap) */
  const rbloom = (ctx, x, y, r, col, a, sy = 1) => {
    if (!(a > 0.002)) return;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.translate(x, y);
    ctx.scale(1, sy);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, E.rgba(col, a));
    g.addColorStop(0.55, E.rgba(col, a * 0.6));
    g.addColorStop(1, E.rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  };
  const circlePath = (x, y, r) => { const p = new Path2D(); p.arc(x, y, Math.max(0.1, r), 0, TAU); return p; };

  function times(shot) {
    const w = (i) => E.T(i) - shot.start;
    const T = { ona: w(64), muh: w(66), o: w(67), hus: w(68), ay: w(70), tem: w(73), ett: w(74), guz: w(75), nuk: w(76), esm: w(78), ila: w(80), don: w(81) };
    T.raise0 = T.muh - 0.12; T.raise1 = T.muh + 0.42;   // he lifts the heart up and out
    T.rel = T.muh + 0.33;                               // ...and lets it go
    T.arr = T.rel + 1.0;                                // it settles by the world
    T.low0 = T.muh + 0.72; T.low1 = T.muh + 1.5;        // his hand lowers, open
    T.push0 = T.o - 0.12; T.push1 = T.o + 1.5;          // push-in to the world
    return T;
  }

  // ---------------------------------------------------------------- s08 state (for a seamless bleed)
  function s08w() {
    const w = (i) => E.T(i) - S08.start;
    return { zail: w(59), fani: w(60), kar: w(61), his: w(62), bil: w(63) };
  }
  /** s08's camera at global time t, in this shot's world (settles to identity with a tiny breathing drift) */
  function cam08(t) {
    const W = s08w(), lt8 = t - S08.start;
    const g0 = W.kar + 0.4, g1 = W.bil + 2.2;
    const s = { x: 713, y: 913, z: 1.42 };
    const u = seg(lt8, g0, g1);
    const k = (1 - Math.pow(1 - u, 3)) * E.smooth(clamp(u / 0.24));
    const c = { x: lerp(s.x, B8.x, k) + 1.6 * E.drift(lt8 + 31, 3, 0.25), y: lerp(s.y, B8.y, k) + 1.3 * E.drift(lt8 + 31, 7, 0.22), z: lerp(s.z, B8.z, k) };
    return { x: (c.x - B8.x) * B8.z + 540, y: (c.y - B8.y) * B8.z + 960, z: c.z / B8.z };
  }
  /** s08's final pose (hand-on-heart easing into the cradle), with its idle sway */
  function pose08(t) {
    const W = s08w(), lt8 = t - S08.start, T7 = lt8 + LT7;
    const ho = E.man.pose.handOnHeart(1);
    const kO = ep(lt8, W.bil + 0.55, W.bil + 1.2, 'inOutSine');
    const nod = Math.sin(PI * seg(lt8, W.bil + 0.02, W.bil + 0.7));
    const pose = E.man.pose.stand();
    pose.lean += Math.sin(T7 * 2.0) * 0.01 + 0.03;
    pose.head = 0.06 + 0.03 * Math.sin(T7 * 0.9) + 0.06 + 0.14 * nod;
    pose.nS = lerp(0.0, ho.nS, kO); pose.nE = lerp(2.32, ho.nE, kO); pose.nW = lerp(0.86, ho.nW, kO);
    pose.head = lerp(pose.head, ho.head, kO);
    return { pose, kO };
  }
  /** s08's globe rocking on the cap (decays into the float here) */
  function th08(t) {
    const W = s08w(), lt8 = t - S08.start, tk = W.kar;
    const env = ep(lt8, tk - 0.1, tk + 0.15) * (0.22 + 0.78 * Math.exp(-1.2 * Math.max(0, lt8 - tk - 0.15)));
    return 0.085 * env * Math.sin(TAU * 1.45 * (lt8 - tk + 0.1));
  }

  // ---------------------------------------------------------------- the man's arm (same skeleton maths as E.man)
  const R = E.man.R;
  const rot2 = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  function groundDy(h, Pz) {
    const hip = [0, -R.hipY * h + (Pz.hipDrop || 0) * h];
    const leg = (H, K) => { const j = [hip[0] + Math.sin(H) * R.thigh * h, hip[1] + Math.cos(H) * R.thigh * h]; const a2 = H - K; return { j, e: [j[0] + Math.sin(a2) * R.shin * h, j[1] + Math.cos(a2) * R.shin * h] }; };
    const fy = (lg, fa) => { const q1 = rot2([R.foot * h, 0.035 * h], -fa), q2 = rot2([-R.heel * h, 0.035 * h], -fa); return Math.max(lg.e[1] + q1[1], lg.e[1] + q2[1]); };
    const n = leg(Pz.nH ?? 0.02, Pz.nK ?? 0.04), f = leg(Pz.fH ?? -0.02, Pz.fK ?? 0.04);
    return -Math.max(fy(n, Pz.nF ?? 0), fy(f, Pz.fF ?? 0), n.j[1] + 0.035 * h, f.j[1] + 0.035 * h);
  }
  /** palm centre of the near hand (world coords) */
  function palm(Pz) {
    const h = MAN.h, lean = Pz.lean || 0, hd = Pz.hipDrop || 0;
    const hip = [0, -R.hipY * h + hd * h];
    const nb = [hip[0] + Math.sin(lean) * R.torso * h, hip[1] - Math.cos(lean) * R.torso * h];
    const o = rot2([-0.012 * h, 0.03 * h], lean);
    const S = [nb[0] + o[0], nb[1] + o[1]];
    const el = [S[0] + Math.sin(Pz.nS) * R.upper * h, S[1] + Math.cos(Pz.nS) * R.upper * h];
    const a2 = Pz.nS + Pz.nE;
    const wr = [el[0] + Math.sin(a2) * R.fore * h, el[1] + Math.cos(a2) * R.fore * h];
    const ha = a2 + (Pz.nW || 0);
    const dy = groundDy(h, Pz);
    return [MAN.x + wr[0] + Math.sin(ha) * R.hand * h * 0.42, MAN.y + dy + wr[1] + Math.cos(ha) * R.hand * h * 0.42];
  }

  // the gesture: cradle (s08) → raised up and out toward the world, palm up → lowered, open
  const RAISE = { nS: 1.7, nE: 0.5, nW: -0.72, fS: 0.1, fE: 0.3 };
  const OPEN = { nS: 0.13, nE: 0.42, nW: -0.12, fS: -0.04, fE: 0.15 };
  function poseAt(lt, t, T) {
    const { pose } = pose08(t);
    const kR = ep(lt, T.raise0, T.raise1, 'inOutCubic');
    const kL = ep(lt, T.low0, T.low1, 'inOutSine');
    for (const f of ['nS', 'nE', 'nW', 'fS', 'fE']) {
      pose[f] = lerp(pose[f] ?? 0, RAISE[f], kR);
      pose[f] = lerp(pose[f], OPEN[f], kL);
    }
    pose.nE += 0.35 * Math.sin(PI * kL);          // the elbow folds softly as the arm comes down
    pose.nS += 0.14 * Math.sin(PI * seg(lt, T.rel - 0.12, T.low0 + 0.1)) * (1 - kL);   // follow-through as it lets go
    // a small lift of the whole body as he gives it, then settling
    pose.lean += 0.025 * kR * (1 - kL) - 0.01 * kL;
    // gaze: down at the heart in his palm → up to his world → following the heart → resting on the world
    pose.head = E.tween(lt, [[T.ona - 0.05, pose.head], [T.ona + 0.55, 0.05, 'inOutSine'], [T.muh + 0.25, 0.0, 'inOutSine'],
      [T.rel + 0.45, -0.24, 'inOutSine'], [T.arr + 0.1, -0.13, 'inOutSine']]) + 0.015 * Math.sin(lt * 0.9);
    return { pose, kR, kL };
  }
  /** where the heart sits in/on his hand */
  function handHeart(lt, t, T) {
    const { pose, kR } = poseAt(lt, t, T);
    const pc = palm(pose);
    const h = MAN.h;
    return [pc[0] + lerp(-0.012, 0.006, kR) * h, pc[1] + lerp(0.004, -0.036, kR) * h];
  }

  // ---------------------------------------------------------------- world, camera
  function worldC(lt) {
    const fl = ep(lt, 0.45, 2.2, 'inOutSine');            // freed from the hourglass, it begins to float
    return [W0[0] + fl * 3 * E.drift(lt, 3, 0.4),
      W0[1] - 14 * ep(lt, 0.6, 3.4, 'inOutSine') + fl * (7 * Math.sin(lt * 1.25) + 3 * E.drift(lt, 7, 0.5))];
  }
  function camAt(lt, t, T, shot) {
    const c8 = cam08(t);
    const p = ep(lt, T.push0, T.push1, 'inOutCubic');
    const zA = c8.z * (1 + 0.03 * ep(lt, 0.8, T.push0 + 0.3, 'inOutSine'));
    const zC = ZC * (1 + 0.06 * ep(lt, T.push1 - 0.3, shot.dur, 'inOutSine'));
    const z = Math.exp(lerp(Math.log(zA), Math.log(zC), p));
    const [wx, wy] = worldC(lt);
    const sA = [(wx - c8.x) * zA + 540, (wy - c8.y) * zA + 960];
    const sC = [540 + 6 * Math.sin(lt * 0.35), 668 + 5 * Math.sin(lt * 0.27 + 1)];
    const s = [lerp(sA[0], sC[0], p), lerp(sA[1], sC[1], E.ease.inOutSine(p))];
    return { x: wx - (s[0] - 540) / z, y: wy - (s[1] - 960) / z, z, rot: 0.006 * Math.sin(lt * 0.3) * p, p };
  }
  const camD = (c, d) => ({ x: lerp(540, c.x, d), y: lerp(960, c.y, d), zoom: Math.pow(c.z, d), rot: c.rot * d });
  /** enter s08's layer space (k = its parallax factor) inside the current camera */
  const into8 = (L, Lk) => { E.translate(L, 540, 960); E.scale(L, Lk.z); E.translate(L, -Lk.x, -Lk.y); };

  // ---------------------------------------------------------------- sky
  const SKY8 = [E.shade(P.cerulean, 0.42), E.shade(P.skyWash, 0.58), E.shade(P.gamboge, 0.62), E.shade(P.blush, 0.55), E.shade(P.terracotta, 0.62)];
  const SKY8Y = [-139.2, 280.8, 630.8, 980.8, 1260.8];
  const SKYTW = ['#5B6DA7', '#7D8DC1', '#B2B0D1', '#E4C6C0', '#EFCCB4'];
  function sky(L, k, lt, T7, cam, hy, push) {
    const c = L.paint;
    E.resetCamera(L);
    // graded wash (s08's golden-hour gradient deepening into blue hour; the warm band stays just above the hills)
    const twY = [-139.2, 300, hy - 430, hy - 150, hy + 30];
    const y0 = -140, y1 = 2000;
    const g = c.createLinearGradient(0, y0, 0, y1);
    for (let i = 0; i < 5; i++) g.addColorStop(clamp((lerp(SKY8Y[i], twY[i], k) - y0) / (y1 - y0)), mixc(SKY8[i], SKYTW[i], k));
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = g;
    c.fillRect(0, 0, E.W, E.H);
    c.restore();
    // sky layer (parallax), in s08's sky space
    E.camera(L, camD(cam, SD));
    into8(L, K8);
    // s08's golden blooms fade; blue-hour blooms gather (slowly breathing)
    const b8 = [[160, 260, 280, E.shade(P.cerulean, 0.35), 0.22], [930, 160, 230, E.shade(P.ultramarine, 0.55), 0.15], [700, 760, 320, E.shade(P.gamboge, 0.4), 0.28], [260, 880, 260, E.shade(P.rose, 0.66), 0.19]];
    b8.forEach(([x, y, r, col, a]) => rbloom(c, x, y, r * 1.15, col, a * (1 - k)));
    const bt = [[120, 160, 420, '#4F62A0', 0.34], [960, 300, 380, '#5D63A0', 0.3], [560, -60, 520, '#5068A8', 0.3],
      [880, 760, 300, '#9F92BE', 0.2], [180, 820, 280, '#A897BF', 0.18], [520, 980, 360, '#E9BFA6', 0.22]];
    bt.forEach(([x, y, r, col, a], i) => rbloom(c, x + 16 * E.drift(lt, 20 + i, 0.15), y + 10 * E.drift(lt, 40 + i, 0.15), r, col, a * k, 0.82));
    // a few hard drying edges of a real sky wash
    [[230, 170, 200, 51, 0.5], [820, 560, 160, 52, 0.4], [380, 700, 140, 53, 0.35]].forEach(([x, y, r, sd, a]) =>
      E.wash(c, E.blob(x, y, r, { seed: sd, irr: 0.32, ry: r * 0.6 }), '#56679F', { alpha: (0.03 + 0.07 * k) * a * 2 }));
    // s08's two clouds keep drifting; the left one dissolves into the twilight during the push
    const cdx = T7 * 5;
    PR().cloud(L, 870 + cdx, 330, 300, { seed: 5, t: T7, tone: 'dusk', alpha: 0.85 });
    const bA = 0.7 * (1 - ep(push, 0.12, 0.55, 'inOutSine'));
    if (bA > 0.01) PR().cloud(L, 110 + cdx * 0.7, 520, 210, { seed: 8, t: T7, tone: 'dusk', alpha: bA });
    // blue hour veils the clouds too
    E.resetCamera(L);
    if (k > 0) {
      c.save();
      c.globalCompositeOperation = 'multiply';
      const vg = c.createLinearGradient(0, 0, 0, hy);
      vg.addColorStop(0, E.rgba('#AEB2D6', 0.55 * k));
      vg.addColorStop(0.7, E.rgba('#C9C3DE', 0.32 * k));
      vg.addColorStop(1, E.rgba('#E6D2D2', 0.1 * k));
      c.fillStyle = vg;
      c.fillRect(0, 0, E.W, Math.max(0, hy + 40));
      c.restore();
    }
    // s08's warm light from the upper left fades with the day
    E.glow(L.light, 90, 140, 760, '#FFE2AE', 0.26 * (1 - k));
  }

  // ---------------------------------------------------------------- land (s08's meadow, cooling into blue hour)
  function land(L, k, T7, cam) {
    const p = L.paint;
    E.camera(L, camD(cam, GD));
    into8(L, G8);
    const HZ = HZ8;
    PR().ground(L, HZ, { palette: 'spring', t: T7, seed: 5, flowers: 0.4, trees: 0.55, x0: -700, x1: 1800, bottom: HZ + 1500 });
    // s08's golden-hour treatment (far hills lavender-rose, warm light on the meadow) — fades with the day
    p.save();
    p.globalCompositeOperation = 'color';
    const hg = p.createLinearGradient(0, HZ - 60, 0, HZ + 240);
    hg.addColorStop(0, 'rgba(200,160,190,0)');
    hg.addColorStop(0.17, 'rgba(196,158,192,0.72)');
    hg.addColorStop(0.36, 'rgba(186,160,196,0.42)');
    hg.addColorStop(0.62, 'rgba(186,160,196,0.12)');
    hg.addColorStop(1, 'rgba(186,160,196,0)');
    p.fillStyle = hg;
    p.fillRect(-800, HZ - 60, 2700, 300);
    p.restore();
    if (k < 1) {
      p.save();
      p.globalCompositeOperation = 'screen';
      p.globalAlpha *= 1 - k;
      const sg = p.createLinearGradient(0, HZ + 60, 0, HZ + 1000);
      sg.addColorStop(0, 'rgba(120,78,24,0)');
      sg.addColorStop(0.18, 'rgba(120,78,24,0.36)');
      sg.addColorStop(0.6, 'rgba(116,80,30,0.46)');
      sg.addColorStop(1, 'rgba(110,86,52,0.52)');
      p.fillStyle = sg;
      p.fillRect(-800, HZ + 60, 2700, 1900);
      p.restore();
      E.wash(p, E.rrect(-800, HZ - 70, 2700, 1900, 0), P.gamboge, { alpha: 0.16 * (1 - k) });
    }
    PR().tree(L, 112, 1078, 124, { kind: 'round', t: T7, seed: 3, color: '#93A96C', shadow: 0.5 });
    PR().tree(L, 1036, 1084, 158, { kind: 'cypress', t: T7, seed: 4, color: '#728F63', shadow: 0.5 });
    // blue hour: a lavender veil over the land, deepening toward the foreground (calm behind the subtitles)
    if (k > 0) {
      const r = E.rrect(-800, HZ - 70, 2700, 1900, 0);
      E.wash(p, r, '#8E90BE', { alpha: 0.5 * k, grad: { from: [0, HZ - 50], to: [0, HZ + 700], stops: [[0, 'rgba(142,144,190,0)'], [0.07, 'rgba(142,144,190,0.85)'], [0.45, 'rgba(150,146,192,1)'], [1, 'rgba(160,150,190,1)']] } });
      E.wash(p, r, '#56649C', { alpha: 0.42 * k, grad: { from: [0, HZ + 40], to: [0, HZ + 900], stops: [[0, 'rgba(86,100,156,0)'], [0.4, 'rgba(86,100,156,0.55)'], [1, 'rgba(70,84,140,1)']] } });
    }
  }

  // ---------------------------------------------------------------- the mirror
  /** the swept part of the globe (the prop's sheen front runs along the diagonal from the upper left) */
  function sweepClip(x, y, R, mir) {
    const pos = lerp(-150, 150, E.ease.inOutSine(clamp(mir))) * R / 100;
    const c = Math.SQRT1_2, big = 4 * R;
    const bx = x + pos * c, by = y + pos * c;
    const hp = new Path2D();
    hp.moveTo(bx + c * big, by - c * big);
    hp.lineTo(bx - c * big, by + c * big);
    hp.lineTo(bx - 2 * c * big, by);
    hp.lineTo(bx, by - 2 * c * big);
    hp.closePath();
    return { hp, bx, by };
  }
  /** the faded world becomes a convex MIRROR reflecting the blue hour: sky above, a warm horizon band, the dusk
      land below, a fresnel rim and paper highlights. Covers the landscape to a faint ghost. (Same as s10's.) */
  function mirrorBody(L, x, y, R, mir, ghost) {
    if (mir <= 0.001) return;
    const p = L.paint;
    const disc = circlePath(x, y, R * 0.99);
    const sw = mir < 0.999 ? sweepClip(x, y, R, mir) : null;
    // the landscape's pencil lines fade under the silver
    L.ink.save();
    L.ink.globalCompositeOperation = 'destination-out';
    L.ink.globalAlpha = 0.8 * (1 - ghost);
    L.ink.clip(circlePath(x, y, R * 0.93));
    if (sw) L.ink.clip(sw.hp);
    L.ink.fillRect(x - R, y - R, 2 * R, 2 * R);
    L.ink.restore();
    p.save();
    p.clip(disc);
    if (sw) p.clip(sw.hp);
    const a0 = p.globalAlpha;
    // silver veil
    const g1 = p.createLinearGradient(x - R * 0.7, y - R * 0.7, x + R * 0.7, y + R * 0.7);
    g1.addColorStop(0, '#F4F5F8'); g1.addColorStop(0.5, '#DCE0E9'); g1.addColorStop(1, '#BFC6D5');
    p.globalCompositeOperation = 'source-over';
    p.globalAlpha = a0 * (1 - ghost);
    p.fillStyle = g1;
    p.fill(disc);
    // reflected environment
    p.globalCompositeOperation = 'multiply';
    p.globalAlpha = a0;
    const hy = y + 0.2 * R, bow = 0.24 * R;
    // one continuous reflected environment: twilight sky above, a pale warm horizon, the dusk land below
    const ge = p.createLinearGradient(0, y - R, 0, y + R);
    ge.addColorStop(0, '#7085BC'); ge.addColorStop(0.34, '#A0ABD2'); ge.addColorStop(0.57, '#D9D0E0');
    ge.addColorStop(0.66, '#C8C1D7'); ge.addColorStop(0.82, '#959BBA'); ge.addColorStop(1, '#717BA1');
    p.globalAlpha = a0 * 0.6;
    p.fillStyle = ge;
    p.fill(disc);
    // the warm horizon reflected: a soft lens-shaped streak bowing with the sphere, thinning toward the rim
    {
      const top = [], bot = [];
      for (let i = 0; i <= 20; i++) {
        const u = -1.05 + 2.1 * i / 20, th = 0.032 * R * Math.max(0, 1 - (u * u) / 1.1);
        const yy = hy + bow * u * u;
        top.push([x + u * R, yy - th]); bot.push([x + u * R, yy + th * 0.8]);
      }
      const band = E.smoothPath(top.concat(bot.reverse()), true, 0.4);
      p.globalCompositeOperation = 'source-over';
      p.globalAlpha = a0 * 0.55;
      E.softFill(p, band, '#FBF2E8', 0.018 * R);
      p.globalCompositeOperation = 'multiply';
      p.globalAlpha = a0 * 0.28;
      E.softFill(p, band, '#EDC3A8', 0.03 * R);
    }
    // fresnel rim: the mirror darkens toward its edge
    const rg = p.createRadialGradient(x - 0.1 * R, y - 0.12 * R, R * 0.62, x, y, R);
    rg.addColorStop(0, 'rgba(84,96,140,0)');
    rg.addColorStop(1, 'rgba(84,96,140,0.5)');
    p.globalAlpha = a0;
    p.fillStyle = rg;
    p.fill(disc);
    // paper highlights: window, glint, two diagonal gleams, rim light
    p.globalCompositeOperation = 'source-over';
    p.save();
    p.translate(x - 0.44 * R, y - 0.5 * R);
    p.rotate(-0.66);
    p.scale(1, 0.4);
    const wg = p.createRadialGradient(0, 0, 0, 0, 0, 0.36 * R);
    wg.addColorStop(0, 'rgba(255,255,255,0.92)'); wg.addColorStop(0.62, 'rgba(255,255,255,0.75)'); wg.addColorStop(1, 'rgba(255,255,255,0)');
    p.fillStyle = wg;
    p.fillRect(-0.4 * R, -0.4 * R, 0.8 * R, 0.8 * R);
    p.restore();
    const c45 = Math.SQRT1_2;
    const gleam = (d, w, a) => {
      const q = new Path2D();
      const cx = x + d * c45 * R, cy = y + d * c45 * R;
      q.moveTo(cx + c45 * 1.2 * R - c45 * w, cy - c45 * 1.2 * R - c45 * w);
      q.lineTo(cx - c45 * 1.2 * R - c45 * w, cy + c45 * 1.2 * R - c45 * w);
      q.lineTo(cx - c45 * 1.2 * R + c45 * w, cy + c45 * 1.2 * R + c45 * w);
      q.lineTo(cx + c45 * 1.2 * R + c45 * w, cy - c45 * 1.2 * R + c45 * w);
      q.closePath();
      p.globalAlpha = a0 * a;
      p.fill(q);
    };
    p.fillStyle = '#FFFFFF';
    gleam(-0.6, 0.05 * R, 0.3);
    gleam(-0.46, 0.012 * R, 0.42);
    // a soft rim of reflected light on the lower right
    const rl = p.createRadialGradient(x - 0.25 * R, y - 0.25 * R, R * 1.05, x - 0.25 * R, y - 0.25 * R, R * 1.25);
    rl.addColorStop(0, 'rgba(255,255,255,0)'); rl.addColorStop(0.5, 'rgba(255,250,242,0.5)'); rl.addColorStop(1, 'rgba(255,255,255,0)');
    p.globalAlpha = a0 * 0.6;
    p.fillStyle = rl;
    p.fill(disc);
    p.restore();
    // the sheen's bright front while it sweeps
    if (sw) {
      const c = Math.SQRT1_2, s = (1 - mir) * 0.9 + 0.1;
      L.light.save();
      L.light.clip(disc);
      L.light.globalCompositeOperation = 'lighter';
      L.light.strokeStyle = E.rgba('#FFFFFF', 0.55 * s);
      L.light.lineWidth = 0.025 * R;
      L.light.beginPath();
      L.light.moveTo(sw.bx + c * 2 * R, sw.by - c * 2 * R); L.light.lineTo(sw.bx - c * 2 * R, sw.by + c * 2 * R);
      L.light.stroke();
      L.light.restore();
    }
  }


  // ---------------------------------------------------------------- the studies in the mirror
  // placement in mirror units (world centre = 0, world radius = 1); s = the study's own size unit (see E.natArt)
  const ST = {
    feather: { x: -0.52, y: 0.5, s: 0.75, rot: -2.15 },
    leaf: { x: 0.5, y: 0.13, s: 0.6, rot: 0.98 },
    pom: { x: 0.2, y: 0.57, s: 0.2, rot: 0.08 },
    rose: { x: -0.15, y: -0.3, s: 0.27, rot: 0.1 },
    fly: { x: 0.38, y: -0.47, s: 0.46, rot: -0.25 },
  };
  const SETTLE = [0.0, -0.74];                       // where the heart settles (by the rose and the butterfly)
  function studyTimes(T) {
    return {
      rose: [T.tem - 0.15, T.tem + 0.55], open: [T.tem + 0.05, T.nuk + 0.3],
      leaf: [T.ett - 0.1, T.ett + 0.85],
      feather: [T.ett + 0.38, T.ett + 1.12],
      fly: [T.guz - 0.1, T.guz + 0.55],
      // every study is complete before "esma-i İlahiyeye" (43.0): nothing new appears, nothing brightens while the
      // Divine Names are spoken — the finished page simply holds until "döner"
      pom: [T.nuk - 0.22, T.nuk + 0.4],
    };
  }
  function flyFlap(lt, T) {
    const beat = seg(lt, T.don + 0.35, T.don + 1.1);
    return 0.86 + 0.14 * Math.cos(lt * 2.3) - 0.62 * Math.pow(Math.sin(beat * PI * 2), 2);
  }
  function drawStudies(L, lt, T, wx, wy) {
    const A = E.natArt, Q = studyTimes(T);
    const at = (q) => [wx + q.x * WR, wy + q.y * WR];
    const sP = (r) => seg(lt, r[0], r[1]);
    let q = ST.feather, c = at(q);
    A.feather(L, c[0], c[1], q.s * WR, { p: sP(Q.feather), rot: q.rot, t: lt });
    q = ST.leaf; c = at(q);
    A.leafStudy(L, c[0], c[1], q.s * WR, { p: sP(Q.leaf), rot: q.rot, t: lt });
    q = ST.pom; c = at(q);
    A.pomegranate(L, c[0], c[1], q.s * WR, { p: sP(Q.pom), rot: q.rot });
    q = ST.rose; c = at(q);
    A.roseStudy(L, c[0], c[1], q.s * WR, { p: sP(Q.rose), open: ep(lt, Q.open[0], Q.open[1], 'inOutSine'), rot: q.rot, t: lt });
    q = ST.fly; c = at(q);
    A.butterfly(L, c[0], c[1], q.s * WR, { p: sP(Q.fly), rot: q.rot + 0.03 * Math.sin(lt * 0.8), flap: flyFlap(lt, T), t: lt });
  }

  // ---------------------------------------------------------------- heart path
  const hoverPos = (lt) => {
    const [wx, wy] = worldC(lt);
    const a = HOVER_A + 0.05 * Math.sin(lt * 0.9);
    const d = HOVER_D * WR + 6 * Math.sin(lt * 1.7);
    return [wx + Math.cos(a) * d, wy + Math.sin(a) * d];
  };
  const TURN = 0.74;                                   // duration of the turn to the works
  /** heart state at lt: position, size, rotation (world coordinates) */
  function heartAt(lt, t, shot, T) {
    const t0 = t - lt;
    let pos, r;
    const r0 = (0.038 - 0.01 * pose08(t).kO) * 700 * B8.z;   // s08's cradled size
    if (lt < T.rel) {
      pos = handHeart(lt, t, T);
      r = r0 + 3 * ep(lt, T.raise0, T.rel);
    } else {
      const u = seg(lt, T.rel, T.arr);
      const e = E.ease.inOutSine(u);
      const P0 = handHeart(T.rel, t0 + T.rel, T);
      const H = hoverPos(lt);
      pos = bez3(P0, [P0[0] + 10, P0[1] - 160], [H[0] - 130, H[1] - 45], H, e);
      pos[0] += 8 * Math.sin(u * PI) * Math.sin(lt * 3.1);
      r = lerp(r0 + 3, 34, E.ease.outCubic(u));
      if (u >= 1) { pos = [H[0] + 2 * Math.sin(lt * 2.1), H[1] + 3 * Math.sin(lt * 1.6)]; r = 34; }
    }
    // döner: it turns away from the globe and goes to the works (settles by the rose and the butterfly)
    const d0 = T.don - 0.15;
    let turn = 0;
    if (lt > d0) {
      const [wx, wy] = worldC(lt);
      const u = seg(lt, d0, d0 + TURN);
      turn = u;
      const e = E.ease.inOutSine(u);
      const H0 = hoverPos(lt);
      const P3 = [wx + SETTLE[0] * WR + 2 * Math.sin(lt * 1.9), wy + SETTLE[1] * WR + 2.5 * Math.sin(lt * 1.5)];
      pos = bez3(H0, [H0[0] + 20, H0[1] - 60], [P3[0] - 110, P3[1] - 55], P3, e);
      r = lerp(34, 22, E.ease.inOutSine(u));
    }
    const fu = seg(lt, T.rel, T.arr);
    const rotv = -0.2 * Math.sin(fu * PI) + 0.3 * Math.sin(turn * PI) + 0.04 * Math.sin(lt * 1.3);
    return { pos, r, rot: rotv };
  }

  /** soft glowing comet trail behind the heart: a fading string of light along its own recent path */
  function trail(L, lt, t, shot, T, from, span, { width = 10, col = '#FFD9C9', a = 0.6 } = {}) {
    const n = 14;
    const pts = [];
    for (let i = 0; i <= n; i++) { const tt = Math.max(from, lt - span * (1 - i / n)); pts.push(heartAt(tt, t - lt + tt, shot, T).pos); }
    if (Math.hypot(pts[n][0] - pts[0][0], pts[n][1] - pts[0][1]) < 4) return;
    for (let i = 0; i < n; i++) {
      const f = (i + 1) / n;
      E.glow(L.light, pts[i][0], pts[i][1], width * (1 + 2.2 * f), col, a * f * f * 0.55);
    }
  }

  /** a 4-point glint (light layer) */
  function glint(ctx, x, y, s, a, rotA = 0) {
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y);
    ctx.rotate(rotA);
    for (const [w, h] of [[s, s * 0.07], [s * 0.07, s], [s * 0.5, s * 0.045]]) {
      const m = Math.max(w, h);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, m);
      g.addColorStop(0, E.rgba('#FFFBEF', a));
      g.addColorStop(1, E.rgba('#FFE7B0', 0));
      ctx.save();
      ctx.scale(w / m, h / m);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, m, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    E.glow(ctx, x, y, s * 0.5, '#F4F8FF', a * 0.45);
  }

  /** the mirror pales like a sketchbook page so the studies read (the fresnel rim keeps it a mirror) */
  function pageVeil(L, x, y, R, k) {
    if (k <= 0.003) return;
    const p = L.paint;
    p.save();
    p.clip(circlePath(x, y, R * 0.99));
    p.globalCompositeOperation = 'source-over';
    const g = p.createRadialGradient(x - 0.08 * R, y - 0.1 * R, 0, x, y, R);
    g.addColorStop(0, `rgba(253,252,249,${0.66 * k})`);
    g.addColorStop(0.6, `rgba(250,250,248,${0.58 * k})`);
    g.addColorStop(0.86, `rgba(244,245,248,${0.3 * k})`);
    g.addColorStop(1, `rgba(236,238,244,${0.06 * k})`);
    p.fillStyle = g;
    p.fillRect(x - R, y - R, 2 * R, 2 * R);
    // a whisper of cool silver so it stays glass, not paper
    p.globalCompositeOperation = 'multiply';
    p.globalAlpha *= 0.5 * k;
    const g2 = p.createLinearGradient(x - R, y - R, x + R, y + R);
    g2.addColorStop(0, '#F3F4F8'); g2.addColorStop(1, '#DCE1EB');
    p.fillStyle = g2;
    p.fillRect(x - R, y - R, 2 * R, 2 * R);
    p.restore();
  }

  // ---------------------------------------------------------------- development sheet (DM_HASH=solo=s09&natsheet)
  const DEV = typeof location !== 'undefined' && /natsheet/.test(location.hash);
  function devSheet(L, lt) {
    const A = E.natArt, u = lt % 5;
    E.skyWash(L.paint, '#F3F1EA', '#EEEAE0', { mottle: 0.1 });
    const k = clamp(u / 3);
    A.roseStudy(L, 300, 420, 150, { p: clamp(u / 1.2), open: k, t: u });
    A.roseHead(L, 160, 860, 70, { open: 1 });
    A.roseHead(L, 330, 860, 70, { open: 0.5 });
    A.roseHead(L, 480, 860, 70, { open: 0 });
    A.leafStudy(L, 790, 380, 440, { p: clamp(u / 1.5), rot: 0.5 });
    A.butterfly(L, 790, 800, 420, { p: clamp(u / 1.2), flap: 0.86 + 0.14 * Math.cos(u * 2.3), rot: -0.2 });
    A.feather(L, 330, 1250, 620, { p: clamp(u / 1.5), rot: -0.5, t: u });
    A.pomegranate(L, 790, 1260, 180, { p: clamp(u / 1.8) });
    A.bird(L, 160, 1700, 110, {});
    A.bird(L, 420, 1700, 110, { fly: 1, flap: u * 9 });
    A.bird(L, 680, 1700, 110, { fly: 1, flap: u * 9 + 1.5 });
    A.butterfly(L, 900, 1680, 160, { flap: 0.25 + 0.75 * Math.abs(Math.cos(u * 9)), rot: 0.4 });
  }

  /** where the rose, the heart and the butterfly are on screen at the cut (for s10's match cut) */
  E.natArt.s09cut = () => {
    const shot = E.SHOTS.find((s) => s.id === 's09');
    const lt = shot.dur, t = shot.start + lt;
    const T = times(shot);
    const cam = camAt(lt, t, T, shot);
    const scr = (x, y) => {
      const dx = (x - cam.x) * cam.z, dy = (y - cam.y) * cam.z, c = Math.cos(cam.rot), s = Math.sin(cam.rot);
      return [540 + dx * c - dy * s, 960 + dx * s + dy * c];
    };
    const [wx, wy] = worldC(lt);
    const H = heartAt(lt, t, shot, T);
    const rp = scr(wx + ST.rose.x * WR, wy + ST.rose.y * WR), fp = scr(wx + ST.fly.x * WR, wy + ST.fly.y * WR);
    return {
      rose: { x: rp[0], y: rp[1], s: ST.rose.s * WR * cam.z, rot: ST.rose.rot + cam.rot },
      fly: { x: fp[0], y: fp[1], s: ST.fly.s * WR * cam.z, rot: ST.fly.rot + 0.03 * Math.sin(lt * 0.8) + cam.rot, flap: flyFlap(lt, T) },
      heart: { x: scr(H.pos[0], H.pos[1])[0], y: scr(H.pos[0], H.pos[1])[1], r: H.r * cam.z, rot: H.rot + cam.rot, clock: t - S08.start + HCLK },
    };
  };

  // ---------------------------------------------------------------- the shot
  E.scene('s09', {
    draw(L, lt, t, shot) {
      if (DEV) { devSheet(L, lt); return; }
      const T = times(shot);
      const T7 = (t - S08.start) + LT7;
      const cam = camAt(lt, t, T, shot);
      const dusk = ep(lt, T.o - 0.25, T.ay + 0.6, 'inOutSine');

      // horizon on screen (for the sky's warm band)
      const gc = camD(cam, GD);
      const hy = ((HZ8 - G8.y) * G8.z + 960 - gc.y) * gc.zoom + 960;

      // ---- sky + land
      sky(L, dusk, lt, T7, cam, hy, cam.p);
      land(L, dusk, T7, cam);
      // s08's cool veil over the background, thinning as blue hour takes over
      E.resetCamera(L);
      L.paint.save();
      L.paint.globalCompositeOperation = 'multiply';
      L.paint.fillStyle = E.rgba('#CEC8DA', 0.42 * (1 - 0.55 * dusk));
      L.paint.fillRect(0, 0, E.W, E.H);
      L.paint.restore();

      // ---- the man (subject plane)
      E.camera(L, camD(cam, 1));
      const ps = poseAt(lt, t, T);
      const manRight = (MAN.x + 0.36 * MAN.h - cam.x) * cam.z + 540;
      if (manRight > -20) {
        E.man.shadow(L, MAN.x + 14, MAN.y, MAN.h, 0.32 * (1 - 0.4 * dusk));
        E.man.draw(L, { x: MAN.x, y: MAN.y, h: MAN.h, view: 'side', facing: 1, pose: ps.pose });
      }

      // ---- the personal world
      const [wx, wy] = worldC(lt);
      const H = heartAt(lt, t, shot, T);
      const warm = ep(lt, T.arr - 0.15, T.arr + 0.8, 'inOutSine');
      const mir = ep(lt, T.ay - 0.12, T.ay + 0.9, 'inOutSine');
      const veil = ep(lt, T.tem - 0.4, T.tem + 0.75, 'inOutSine');
      const away = ep(lt, T.don - 0.15, T.don + 0.5, 'inOutSine');     // the love leaves the globe as such
      // soft shadow of the floating world on the meadow
      E.wash(L.paint, E.blob(wx + 26, MAN.y - 2, 110, { rx: 118, ry: 13, seed: 4, irr: 0.05 }), '#6F6A86', { alpha: 0.13 * (1 - dusk), soft: 14 });
      const th = th08(t) * (1 - ep(lt, 0.2, 1.1, 'inOutSine'));
      E.save(L);
      if (Math.abs(th) > 1e-5) { E.translate(L, PIV[0], PIV[1]); E.rotate(L, th); E.translate(L, -PIV[0], -PIV[1]); }
      const diss = 0.66 - 0.1 * warm;
      PR().personalWorld(L, wx, wy, WR, {
        t: T7, kind: 'home', life: 1 - 0.7 * diss, dissolve: diss,
        flicker: 0.38 * (1 - ep(lt, 0.45, 1.6, 'inOutSine')),
        glow: 0.07 + (0.45 * warm * (1 - 0.6 * mir) + 0.1 * mir) * (1 - 0.75 * away), mirror: mir,
      });
      E.restore(L);
      const disc = circlePath(wx, wy, WR * 0.985);
      mirrorBody(L, wx, wy, WR, mir, 0.3 - 0.18 * veil);
      pageVeil(L, wx, wy, WR, veil);

      // the touch: when the love reaches the world, a ring of warmth spreads over the glass from the contact point
      {
        const u = seg(lt, T.arr - 0.2, T.arr + 1.05);
        if (u > 0 && u < 1) {
          const dx = H.pos[0] - wx, dy = H.pos[1] - wy, dl = Math.hypot(dx, dy) || 1;
          const cx = wx + (dx / dl) * WR, cy = wy + (dy / dl) * WR;
          const Lc = L.light, Pc = L.paint;
          Lc.save(); Lc.clip(disc); Lc.globalCompositeOperation = 'lighter';
          Pc.save(); Pc.clip(disc); Pc.globalCompositeOperation = 'multiply';
          for (const [lag, wd] of [[0, 9], [0.18, 5]]) {
            const v = clamp((u - lag) / (1 - lag));
            if (v <= 0) continue;
            const rr = 8 + E.ease.outCubic(v) * WR * 1.5, k = Math.sin(v * PI) * (1 - 0.4 * lag);
            Lc.strokeStyle = E.rgba('#FFE0C8', 0.42 * k);
            Lc.lineWidth = wd;
            Lc.beginPath(); Lc.arc(cx, cy, rr, 0, TAU); Lc.stroke();
            Pc.strokeStyle = E.rgba('#E7A98F', 0.3 * k);
            Pc.lineWidth = wd * 1.4;
            Pc.beginPath(); Pc.arc(cx, cy, rr, 0, TAU); Pc.stroke();
          }
          Pc.restore(); Lc.restore();
        }
      }
      // the mirror catches the light: a sparkle where the sheen finishes
      {
        const g = ep(lt, T.ay + 0.45, T.ay + 0.75, 'outCubic') * (1 - ep(lt, T.ay + 0.8, T.ay + 1.5, 'inOutSine'));
        if (g > 0) glint(L.light, wx + WR * 0.42, wy + WR * 0.36, WR * 0.55, 0.85 * g, 0.3);
      }

      // the rose heart reflected in the convex mirror (compressed toward the rim), until it turns to the works
      if (mir > 0.02) {
        const ra = (1 - ep(lt, T.don - 0.15, T.don + 0.25)) * ep(lt, T.ay + 0.1, T.ay + 0.7) * (1 - veil);
        if (ra > 0.01) {
          const dx = H.pos[0] - wx, dy = H.pos[1] - wy, dl = Math.hypot(dx, dy) || 1;
          const rx = wx + (dx / dl) * WR * 0.6, ry = wy + (dy / dl) * WR * 0.6;
          const ang = Math.atan2(dy, dx);
          E.save(L);
          E.each(L, (c) => c.clip(disc));
          E.translate(L, rx, ry); E.rotate(L, ang); E.scale(L, 0.62, 1); E.rotate(L, -ang); E.translate(L, -rx, -ry);
          PR().heartLight(L, rx, ry, H.r * 0.42, { t: lt, glow: 0.55, rot: H.rot + PI * 0.04, opaque: false, alpha: 0.85 * ra });
          E.restore(L);
        }
      }

      // the works of art appear in the mirror, one after another
      if (lt > T.tem - 0.2) {
        E.save(L);
        E.each(L, (c) => c.clip(disc));
        drawStudies(L, lt, T, wx, wy);
        E.restore(L);
      }
      // glass over the studies: the window highlight and two faint diagonal gleams (keeps it a mirror)
      if (mir > 0.2) {
        E.save(L);
        E.each(L, (c) => c.clip(disc));
        const gl = new Path2D();
        gl.ellipse(wx - WR * 0.44, wy - WR * 0.5, WR * 0.36, WR * 0.11, -0.66, 0, TAU);
        E.lift(L.paint, gl, (0.3 - 0.12 * veil) * mir, 6);
        const c45 = Math.SQRT1_2, Lc = L.light;
        Lc.globalCompositeOperation = 'lighter';
        for (const [d, w, a] of [[-0.6, 0.05, 0.06], [-0.46, 0.012, 0.14]]) {
          const cx = wx + d * c45 * WR, cy = wy + d * c45 * WR;
          Lc.strokeStyle = E.rgba('#FFFFFF', a * veil);
          Lc.lineWidth = w * WR;
          Lc.beginPath(); Lc.moveTo(cx + c45 * 1.2 * WR, cy - c45 * 1.2 * WR); Lc.lineTo(cx - c45 * 1.2 * WR, cy + c45 * 1.2 * WR); Lc.stroke();
        }
        E.restore(L);
      }

      // ---- the heart-light
      const relA = lt > T.rel - 0.05;
      if (relA) trail(L, lt, t, shot, T, T.rel, 0.45, { width: 10, a: 0.5 });
      // "Ona": it brightens in his palm with one strong beat
      const ona = seg(lt, T.ona - 0.08, T.ona + 0.9);
      const flare = ona > 0 && ona < 1 ? Math.exp(-Math.pow((ona - 0.12) / 0.09, 2)) * 0.9 + Math.exp(-Math.pow((ona - 0.34) / 0.1, 2)) * 0.5 : 0;
      const bright = ep(lt, T.ona - 0.1, T.ona + 0.3, 'outSine');
      const glowA = clamp(0.87 + 0.13 * bright);
      E.glow(L.light, H.pos[0], H.pos[1], H.r * (4.2 + 1.5 * flare), '#FFC6BE', 0.26 + 0.18 * bright + 0.3 * flare);
      PR().heartLight(L, H.pos[0], H.pos[1], H.r * (1 + 0.07 * flare), { t: t - S08.start + HCLK, glow: glowA, rot: H.rot, pulse: 2 - ep(lt, T.rel, T.arr) });
      // when the love reaches the world it warms it (soft rose-gold halo on the near side); it fades as the love
      // turns from the world itself to the works it shows
      if (warm > 0) E.glow(L.light, wx - WR * 0.5, wy - WR * 0.55, WR * 1.1, '#FFD6B8', 0.18 * warm * (1 - 0.5 * mir) * (1 - away));
    },

    sfx(shot) {
      const T = times(shot), g = (x) => x + shot.start;
      return [
        { t: g(T.ona - 0.06), type: 'bloom', gain: 0.2 },
        { t: g(T.rel - 0.15), type: 'swell', gain: 0.24, dur: 1.4 },
        { t: g(T.arr - 0.06), type: 'bloom', gain: 0.2 },
        { t: g(T.ay - 0.08), type: 'sparkle', gain: 0.22 },
        { t: g(T.ay + 0.45), type: 'chime', gain: 0.14, pitch: 1.5 },
        { t: g(T.tem - 0.1), type: 'grow', gain: 0.14, dur: 1.95 },   // fades out before "esma"
        { t: g(T.tem), type: 'bloom', gain: 0.14 },
        { t: g(T.guz - 0.05), type: 'chime', gain: 0.1, pitch: 1.25 },
        { t: g(T.don + 0.01), type: 'swell', gain: 0.16, dur: 0.9 },   // after "İlahiyeye" has ended
        { t: g(T.don + 0.55), type: 'chime', gain: 0.1, pitch: 1.7 },
      ];
    },
  });
})();
