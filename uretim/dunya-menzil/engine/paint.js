/* Watercolour-friendly drawing helpers (Canvas 2D).
   Layers per shot (all 1080x1920):
     L.paint – pigment. Starts WHITE (= bare paper). Everything painted here is turned into watercolour by
               the WebGL post pass (wobble, edge darkening, granulation, mottling, paper).
               Use E.wash(...) with mode 'glaze' (multiply: transparent layering like real watercolour) or
               'over' (normal: for objects that must hide what is behind them).
     L.ink   – pencil / ink lines on transparent. Multiplied on top after the watercolour pass and broken up by
               the paper grain (graphite catches the paper tooth).
     L.light – glows / light on transparent. Screen-blended last (magical light, rays, sparkles).
   All shape jitter is seeded and static: no "boiling" between frames. */
(function () {
  const E = window.E;

  // ---------- paths ----------
  const catmull = (pts, closed, tension = 0.5) => {
    const p = new Path2D();
    const n = pts.length;
    if (n < 2) return p;
    const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    p.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const t = tension / 3 * 2;
      p.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) * t / 2, p1[1] + (p2[1] - p0[1]) * t / 2,
        p2[0] - (p3[0] - p1[0]) * t / 2, p2[1] - (p3[1] - p1[1]) * t / 2,
        p2[0], p2[1]);
    }
    if (closed) p.closePath();
    return p;
  };
  E.catmull = catmull;

  /** smooth path through points (array of [x,y]) */
  E.smoothPath = (pts, closed = false, tension = 0.5) => catmull(pts, closed, tension);

  /** subdivide a polyline/polygon so it has segments of at most `step` px */
  E.subdivide = (pts, step = 12, closed = true) => {
    const out = [];
    const n = pts.length;
    const lim = closed ? n : n - 1;
    for (let i = 0; i < lim; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const k = Math.max(1, Math.ceil(d / step));
      for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * (j / k), a[1] + (b[1] - a[1]) * (j / k)]);
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  };

  /** perturb points along their normal with smooth seeded noise (hand-painted edge) */
  E.wobblePts = (pts, { seed = 1, amp = 3, freq = 0.02, closed = true } = {}) => {
    const n = pts.length;
    let acc = 0;
    return pts.map((p, i) => {
      const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1;
      nx /= l; ny /= l;
      if (i > 0) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const o = E.fbm1(acc * freq, seed, 3) * amp;
      if (!closed && (i === 0 || i === n - 1)) return p;
      return [p[0] + nx * o, p[1] + ny * o];
    });
  };

  /** hand-painted closed shape from polygon points */
  E.wobblyShape = (pts, opts = {}) => {
    const sub = E.subdivide(pts, opts.step || 14, true);
    return catmull(E.wobblePts(sub, { closed: true, ...opts }), true);
  };

  /** irregular round blob */
  E.blob = (cx, cy, r, { seed = 1, irr = 0.12, n = 48, rx = null, ry = null, rot = 0 } = {}) => {
    const pts = [];
    const ax = rx || r, ay = ry || r;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * E.TAU;
      const k = 1 + irr * (E.fbm1(i / n * 6, seed, 3) + 0.35 * E.noise1(i * 1.7, seed + 9));
      const x = Math.cos(a) * ax * k, y = Math.sin(a) * ay * k;
      pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    return catmull(pts, true);
  };

  /** ellipse points (for building shapes) */
  E.ellipsePts = (cx, cy, rx, ry, n = 64, a0 = 0, a1 = E.TAU) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * (i / (n - (a1 - a0 >= E.TAU - 1e-6 ? 0 : 1)));
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return pts;
  };

  /** rounded rectangle path */
  E.rrect = (x, y, w, h, r) => {
    const p = new Path2D();
    r = Math.min(r, w / 2, h / 2);
    p.moveTo(x + r, y);
    p.arcTo(x + w, y, x + w, y + h, r);
    p.arcTo(x + w, y + h, x, y + h, r);
    p.arcTo(x, y + h, x, y, r);
    p.arcTo(x, y, x + w, y, r);
    p.closePath();
    return p;
  };

  // ---------- painting ----------
  /**
   * Fill a path as a watercolour wash.
   * opts: mode 'glaze' (multiply, default) | 'over'; alpha; grad: {from:[x,y], to:[x,y], c2, r?} linear (or radial if r)
   *       light: 0..1 lighten the colour (thin wash); soft: px of edge softness (wet-in-wet, uses blur filter)
   */
  E.wash = (ctx, path, color, opts = {}) => {
    const { mode = 'glaze', alpha = 1, grad = null, soft = 0, light = 0 } = opts;
    ctx.save();
    ctx.globalCompositeOperation = mode === 'over' ? 'source-over' : 'multiply';
    ctx.globalAlpha = alpha;
    const col = light ? E.shade(color, light) : color;
    if (grad) {
      let g;
      if (grad.r) g = ctx.createRadialGradient(grad.from[0], grad.from[1], grad.r0 || 0, grad.from[0], grad.from[1], grad.r);
      else g = ctx.createLinearGradient(grad.from[0], grad.from[1], grad.to[0], grad.to[1]);
      if (grad.stops) grad.stops.forEach(([o, c]) => g.addColorStop(o, c));
      else { g.addColorStop(0, col); g.addColorStop(1, grad.c2); }
      ctx.fillStyle = g;
    } else ctx.fillStyle = col;
    if (soft) ctx.filter = `blur(${soft}px)`;
    ctx.fill(path);
    ctx.restore();
  };

  /** opaque white-out (bare paper) inside a path — for highlights left unpainted */
  E.lift = (ctx, path, alpha = 1, soft = 0) => {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    if (soft) ctx.filter = `blur(${soft}px)`;
    ctx.fillStyle = '#ffffff';
    ctx.fill(path);
    ctx.restore();
  };

  /** wet-in-wet bloom: soft irregular patch of pigment */
  E.bloom = (ctx, cx, cy, r, color, { seed = 3, alpha = 0.6, soft = 10, irr = 0.25 } = {}) => {
    E.wash(ctx, E.blob(cx, cy, r, { seed, irr }), color, { alpha, soft });
  };

  /** dry-brush stroke along a polyline (broken, textured) */
  E.dryBrush = (ctx, pts, color, { width = 18, seed = 5, alpha = 0.8, bristles = 7 } = {}) => {
    const r = E.rng(seed);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    for (let b = 0; b < bristles; b++) {
      const off = (b / (bristles - 1) - 0.5) * width;
      ctx.globalAlpha = alpha * (0.35 + 0.65 * r());
      ctx.lineWidth = width / bristles * (0.8 + r() * 0.9);
      ctx.beginPath();
      let drawing = false;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
        let nx = -(q[1] - o[1]), ny = q[0] - o[0];
        const l = Math.hypot(nx, ny) || 1;
        nx /= l; ny /= l;
        const gap = E.noise1(i * 0.6 + b * 13.1, seed) > 0.55;
        const x = p[0] + nx * off, y = p[1] + ny * off;
        if (gap) { drawing = false; continue; }
        if (!drawing) { ctx.moveTo(x, y); drawing = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  /** paint splatter droplets */
  E.splatter = (ctx, cx, cy, spread, color, { seed = 7, n = 14, size = 5, alpha = 0.7 } = {}) => {
    const r = E.rng(seed);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const a = r() * E.TAU, d = Math.pow(r(), 0.7) * spread;
      ctx.globalAlpha = alpha * (0.4 + 0.6 * r());
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, size * (0.3 + r()), 0, E.TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  // ---------- pencil / ink ----------
  /**
   * Pencil line (ink layer). path: Path2D or array of points. Draws a slightly doubled, sketchy line.
   * opts: w (width), a (alpha), color, double (bool), dash
   */
  E.pencil = (ctx, path, opts = {}) => {
    const { w = 1.6, a = 0.55, color = E.P.ink, double = true, seed = 11, jitter = 1.2 } = opts;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    const draw = (dx, dy, alpha, width) => {
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.save();
      ctx.translate(dx, dy);
      if (path instanceof Path2D) ctx.stroke(path);
      else { ctx.stroke(catmull(path, false)); }
      ctx.restore();
    };
    draw(0, 0, a, w);
    if (double) {
      const r = E.rng(seed);
      draw((r() - 0.5) * jitter * 2, (r() - 0.5) * jitter * 2, a * 0.45, w * 0.7);
    }
    ctx.restore();
  };

  /** handwritten pencil note with write-on reveal (p: 0..1). Caveat font. */
  E.note = (ctx, text, x, y, { size = 44, p = 1, color = E.P.ink, alpha = 0.8, align = 'center', rot = 0, font = 'Caveat' } = {}) => {
    if (p <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.font = `600 ${size}px "${font}"`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width;
    const x0 = align === 'center' ? -w / 2 : align === 'right' ? -w : 0;
    ctx.beginPath();
    ctx.rect(x0 - 10, -size, (w + 20) * E.ease.outQuad(p), size * 2);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };

  /** hand-drawn arrow (ink layer) from a to b with optional curvature, reveal p */
  E.arrow = (ctx, a, b, { bend = 0.2, p = 1, w = 2.2, color = E.P.ink, alpha = 0.7, head = 16 } = {}) => {
    if (p <= 0) return;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const nx = -(b[1] - a[1]) * bend, ny = (b[0] - a[0]) * bend;
    const c = [mx + nx, my + ny];
    const pts = [];
    const N = 30;
    for (let i = 0; i <= N * p; i++) {
      const t = i / N;
      pts.push([(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]);
    }
    if (pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.stroke();
    if (p >= 0.98) {
      const e = pts[pts.length - 1], d = pts[pts.length - 3];
      const ang = Math.atan2(e[1] - d[1], e[0] - d[0]);
      ctx.beginPath();
      ctx.moveTo(e[0] - Math.cos(ang - 0.45) * head, e[1] - Math.sin(ang - 0.45) * head);
      ctx.lineTo(e[0], e[1]);
      ctx.lineTo(e[0] - Math.cos(ang + 0.42) * head, e[1] - Math.sin(ang + 0.42) * head);
      ctx.stroke();
    }
    ctx.restore();
  };

  // ---------- light ----------
  /** soft radial glow on the light layer (screen-blended at the end) */
  E.glow = (ctx, x, y, r, color, a = 1) => {
    if (a <= 0 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, E.rgba(color, a));
    g.addColorStop(0.35, E.rgba(color, a * 0.45));
    g.addColorStop(1, E.rgba(color, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  };

  /** fan of soft light rays from (x,y) downward (or any angle) */
  E.rays = (ctx, x, y, { n = 9, len = 1400, spread = 0.9, angle = Math.PI / 2, width = 0.06, color = '#FFF1C9', a = 0.35, seed = 4, t = 0 } = {}) => {
    const r = E.rng(seed);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const ang = angle + (i / (n - 1) - 0.5) * spread + E.noise1(t * 0.3 + i, seed) * 0.03;
      const wv = width * (0.5 + r());
      const aa = a * (0.4 + 0.6 * r()) * (0.75 + 0.25 * E.noise1(t * 0.8 + i * 3.1, seed + 2));
      const g = ctx.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      g.addColorStop(0, E.rgba(color, aa));
      g.addColorStop(1, E.rgba(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang - wv) * len, y + Math.sin(ang - wv) * len);
      ctx.lineTo(x + Math.cos(ang + wv) * len, y + Math.sin(ang + wv) * len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  /** floating sparkles / motes (deterministic in t) */
  E.motes = (ctx, { x = 0, y = 0, w = E.W, h = E.H, n = 40, t = 0, seed = 21, color = '#FFF4D6', size = 3, a = 0.8, rise = 30 } = {}) => {
    const r = E.rng(seed);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const px = x + r() * w, py0 = y + r() * h, ph = r() * 10, sp = 0.5 + r();
      const py = y + ((py0 - y - t * rise * sp) % h + h) % h;
      const tw = 0.5 + 0.5 * Math.sin(t * 2.3 * sp + ph);
      const s = size * (0.5 + r());
      const g = ctx.createRadialGradient(px, py, 0, px, py, s * 3);
      g.addColorStop(0, E.rgba(color, a * tw));
      g.addColorStop(1, E.rgba(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(px - s * 3, py - s * 3, s * 6, s * 6);
    }
    ctx.restore();
  };

  // ---------- camera ----------
  /** apply a 2D camera to all three layers: centre (cx,cy) of the world placed at screen centre, zoom, rotation */
  E.camera = (L, { x = E.W / 2, y = E.H / 2, zoom = 1, rot = 0 } = {}) => {
    for (const k of ['paint', 'ink', 'light']) {
      const c = L[k];
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.translate(E.W / 2, E.H / 2);
      c.rotate(rot);
      c.scale(zoom, zoom);
      c.translate(-x, -y);
    }
  };
  E.resetCamera = (L) => { for (const k of ['paint', 'ink', 'light']) L[k].setTransform(1, 0, 0, 1, 0, 0); };
  /** run fn with the same save/restore on all layers */
  E.each = (L, fn) => { for (const k of ['paint', 'ink', 'light']) fn(L[k], k); };
  E.save = (L) => E.each(L, (c) => c.save());
  E.restore = (L) => E.each(L, (c) => c.restore());
  E.translate = (L, x, y) => E.each(L, (c) => c.translate(x, y));
  E.scale = (L, s, s2 = s) => E.each(L, (c) => c.scale(s, s2));
  E.rotate = (L, a) => E.each(L, (c) => c.rotate(a));
  E.alpha = (L, a) => E.each(L, (c) => (c.globalAlpha = a));

  // ---------- backgrounds ----------
  /** soft graded sky / background wash covering the whole frame (screen space) */
  E.skyWash = (ctx, top, bottom, { mid = null, alpha = 1, seed = 2, mottle = 0.25 } = {}) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, E.H);
    g.addColorStop(0, top);
    if (mid) g.addColorStop(0.55, mid);
    g.addColorStop(1, bottom);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, E.W, E.H);
    // a few large soft blooms so the wash is not mechanically even
    if (mottle > 0) {
      const r = E.rng(seed);
      for (let i = 0; i < 6; i++) {
        const x = r() * E.W, y = r() * E.H, rr = 250 + r() * 380;
        const c = r() > 0.5 ? top : bottom;
        const gg = ctx.createRadialGradient(x, y, 0, x, y, rr);
        gg.addColorStop(0, E.rgba(c, mottle * alpha));
        gg.addColorStop(1, E.rgba(c, 0));
        ctx.fillStyle = gg;
        ctx.globalAlpha = 1;
        ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
    }
    ctx.restore();
  };
})();
