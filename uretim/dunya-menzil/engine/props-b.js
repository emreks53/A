/* =========================================================================================================
   props-b.js — shared OBJECTS & SYMBOLS for "Dünya Menzil" (watercolour engine)               → E.props.*
   =========================================================================================================
   Preview sheets: scenes/_props_b.js   (DM_HASH=solo=_props_b node tools/render.cjs stills --times 0.5,2,4 …)

   CONVENTIONS (all props)
   • Every prop draws into L = {paint, ink, light} (docs/ENGINE.md) under the CURRENT transform of the layers,
     so E.camera / E.translate / E.scale / E.rotate apply. Every layer state a prop touches is restored.
   • Pure functions of their arguments: deterministic (seeded hashes, no Math.random, no state between calls).
     Geometry is cached internally (bounded memo, keyed by size/seed); output never depends on call order.
   • Sizes are caller px. (x, y) = the ANCHOR stated per prop. Light comes from the upper left (like the man).
   • Opaque props occlude: they erase ink + light drawn earlier under their silhouette (mirror, hourglass caps,
     posts & collars, page, reed pen, book, lantern, pedestal, thorn vines, heart base). Draw back-to-front.
   • Common opts: t (seconds; any value; drives idle motion/shimmer), alpha (0..1, multiplies the layers'
     current globalAlpha), night (0..1 cool moonlit palette, where listed), seed (integer variation).
     Out-of-range/NaN numbers are clamped; zero/negative sizes draw nothing; unknown opts are ignored.
   • Level of detail: fine ornament is dropped automatically when the prop is small ON SCREEN (camera-aware).
   • Cost: canvas blur filters (ctx.filter) cost ~20–50 ms EACH in the headless renderer, so soft edges are made
     with gradients / stacked strokes wherever possible (a handful of blurs remain: page drop shadow, ribbon halo,
     nakış glow, frame glow — one each). Scratch-canvas props (stone/stoneOver/statue, heart reflection,
     mirror reflectAlpha) are the expensive ones; measure whole frames, not JS time (GPU work is deferred).
   • Gold: tezhip gold is semi-opaque so it stays warm on silver/blue grounds; glows go to L.light (screen).
     Note: a screen glow cannot brighten white paper — on light grounds props also paint a soft colour aura.

   ---------------------------------------------------------------------------------------------------------
   1  mirror(L, x, y, h, opts)            tall full-length (endam) standing mirror, gilded Ottoman arch frame
        (x, y) = base centre on the ground (bottom of the feet); h = total height (feet → finial tip).
        Footprint ≈ 0.45·h wide (frame 0.39·h). Glass ≈ 0.30·h × 0.69·h (see mirrorGlass).
        opts: t=0 · shine 0..1 (a gleam sweeps across the glass as shine goes 0→1; 0 and 1 show none)
              night 0..1 · arch 'pointed'|'round' ('pointed') · glassTint ('#C9D2DE') · alpha 1
              sheen 1 (strength of the static diagonal glass streaks; lower it so a reflected face stays clear)
              shadow true (contact shadow) · glints 1 (gilded sparkles on L.light)
              reflect(L, rect): called with ALL THREE layers clipped to the glass and the CALLER's transform;
                rect = {x, y, w, h, cx, springY, apexY} = glass bounding box in caller coords (y+h = glass
                bottom). Draw the reflection there (e.g. E.man.draw with facing flipped, feet at rect.y+rect.h).
                Afterwards the prop glazes it with cool silver, softens its pencil, and lays the sheen over it.
              reflectAlpha 0..1 (1): cross-fades the reflection against the empty glass (use this to make the
                reflection fade away: E.man's own alpha cannot fade paint, see the engine notes)
      mirrorGlass(x, y, h, opts?) → {x, y, w, h, cx, springY, apexY}   glass rect for planning (same args)
      mirrorGlassPath(x, y, h, opts?) → Path2D                          exact glass outline (caller coords)

   2  hourglass(L, x, y, h, opts)         turned-wood hourglass, two glass bulbs, three posts, running sand
        (x, y) = base centre (bottom of the lower cap); h = total height; caps ≈ 0.53·h wide.
        opts: t · sand 0..1 (fraction still in the TOP bulb, 0.6) · flow 0..1 (falling stream visibility, 1;
              only while 0 < sand < 1) · speed ≥ 0 (stream speed/thickness, 1) · night 0..1
              glow 0..1 (faint warm "life" glow) · sandColor · alpha · shadow true

   3  page(L, x, y, w, h, opts)           sheet of fine paper with a tezhip (gold illumination) border
        (x, y) = centre; w × h = sheet size. Soft drop shadow drawn below/right.
        opts: rot (rad, 0) · t · border 0..1 (border draws in from the top centre both ways, 1)
              lines 0..1 (faint ruled lines + margin, 0) · curl 0..1 (bottom-right corner lifts and folds)
              lift 0..1 (page rises off the ground: shadow grows & softens, page scales up to +6%)
              content(L, rect): called with the layers in the PAGE-LOCAL frame (origin = page centre,
                rotated by rot) and clipped inside the inner border; rect = {x, y, w, h, inner} is the
                text/illustration area in that frame. · color (paper '#FCF7EA') · gold · glow 0..1 · seed
              alpha · shadow true

   4  reedPen(L, x, y, len, opts)         kamış kalem: cut reed with slit nib, nodes, wet ink
        (x, y) = nib tip; len = total length (diameter ≈ 0.06·len).
        opts: angle (rad, direction tip → back end; -0.95 = back end up-right) · ink 0..1 (wet ink on nib)
              glow 0..1 (golden life-light along the pen + tip sparkle) · t · night · alpha

   5  inkWrite(L, pts, p, opts) → head [x, y] | null     calligraphic broad-nib ink line revealed to p
        pts = [[x,y],…] one stroke, or [[[x,y],…], …] several strokes (pen lifts) revealed in order.
        p 0..1 = fraction of the total length. Returns the current pen-head point (to place reedPen).
        opts: color ('#2C2838' ink) · width (max nib width px, 6) · nib (rad, nib edge angle, 0.85: thick
              strokes across it, hairlines along it) · seed · alpha 0.92 · layer 'paint'|'ink' ('paint')
              mode 'glaze'|'over' · bead true (wet bead at the head while writing) · glow 0..1
      scriptLine(x0, y0, x1, opts?) → strokes   abstract flowing handwriting (no letterforms, no dots)
        along baseline y0 from x0 to x1 (x0 > x1 writes right-to-left); opts: size (≈ letter height px, 24),
        seed. Feed the result to inkWrite. Cached; stays within [x1, x0] (± ≈0.15·size).

   6  book(L, x, y, w, h, opts)           the BOOK OF DEEDS: Ottoman leather binding (şemse, köşebent, gold
                                          tooling) opening in 2.5-D; written pages, page turn, glow
        (x, y) = centre of the CLOSED book footprint; w × h = cover size. The page-block edge adds ≈0.075·h
        below. While opening the spine slides to x, so the open spread (2w wide) is centred on x.
        opts: open 0..1 (cover rotates around the spine) · pages 0..1 (written lines appear on the first
              spread: the cover-side page with the headpiece, then the facing page)
              flip ≥ 0 (leaves turned, needs open > 0.5: 0→1 turns one leaf from the facing page over to the
              cover side and leaves a fresh spread open; 2.5 = two turned, the third half-way; the leaf shows
              the written page it carries away, and its back is the new spread's first page)
              pages2 0..1 (writing on the newest spread, ceil(flip); spreads in between are fully written)
              glow 0..1
              cover ('#8E4A50' deep rose-umber leather) · rtl true (Ottoman: spine on the right, opens to
              the right, writing right-to-left) · t · seed · night · alpha · shadow true

   7  heartLight(L, x, y, r, opts)        the man's LOVE: soft luminous rose heart (watercolour + inner light)
        (x, y) = centre; r = half-width (height ≈ 1.9·r; glow reaches ≈ 3·r).
        opts: t (gentle heartbeat + breathing) · glow 0..1 (0.8) · color (E.P.rose) · pulse (amount, 1)
              dark 0..1 (sick dark crimson, glow dims and turns cold) · thorns 0..1 (dark vines grow
              around it, see thorns; seed) · reflection bool (wavering water reflection: lighter, rippled,
              fading downward; flip:true mirrors it upside down; drawn in screen-aligned slices, so it follows
              camera pan/zoom but not camera rotation) · opaque true (paper base so it glows on any ground;
              reflection is always transparent) · rot · alpha (thorns follow alpha and rot)

   8  nakis(L, x, y, r, opts)             gold tezhip ornament blooming from a centre: rumi scroll lyres,
                                          palmettes, tulips, hatayi blossoms, 8-fold star rosette, star-and-
                                          cross lattice, lobed border with radiating tığ hairlines
        (x, y) = centre; r = outer radius (hairline tips).
        opts: reveal 0..1 (grows outward: centre star, scrolls unfurl, flowers, lattice, border) · t (shimmer
              travels along the lines) · color (gold base '#D6A64C') · glow 0..1 (0.6) · clip Path2D (caller
              coords, e.g. a globe) · seed · rot · lattice 0..1 (strength of the star lattice, 1)
              mode 'over' (default: semi-opaque warm gold on any ground) | 'glaze' (transparent, paper only)
              night (lines drawn opaque for dark grounds) · alpha

   9  ribbon(L, pts, opts)                flowing watercolour FEELING STREAM along a centreline
        pts = [[x,y],…] (≥2; e.g. from ribbonPath). Wider in the middle, twists (front/back faces), watery
        halo, lighter core, streaks flowing along it; overlapping ribbons layer as transparent glazes.
        opts: p 0..1 (revealed from the start, 1) · width (max px, 40) · color (E.P.rose) · t (streaks flow,
              twists roll) · twist (half-twists along the length, 1.4) · roll (twist roll speed, 0.7)
              glow 0..1 · seed · alpha
      ribbonPath(x0, y0, x1, y1, opts?) → pts   pleasing curved centreline from (x0,y0) to (x1,y1)
        opts: seed · curl 0..1.5 (< 0.35: S-waves only; ≥ 0.35 adds one smooth loop growing with curl)
              amp (wave amplitude as a fraction of the length, 0.18) · n (points, 90)

   10 lantern(L, x, y, s, opts)           hanging Ottoman lantern (onion dome, pierced holes, arched panes)
        (x, y) = hanging point (top of the chain); s = lantern body height (ring → drop tip); the chain
        (opts.chain px, default 0.5·s) hangs above the body; width ≈ 0.44·s. Sways around (x, y).
        opts: t (sway) · lit 0..1 (warm light, glowing panes, halo) · color (glass, '#D9914E') · sway (1)
              chain · night · seed (sway phase) · alpha

   11 thorns(L, cx, cy, r, opts)          dark thorny vines growing around a circle (weaving ±25 % in/out)
        (cx, cy) = circle centre; r = circle radius.
        opts: p 0..1 (growth) · seed · color ('#3A2430') · t (slow writhing) · n (vines, 3) · width (1)
              tight 0..1 (squeeze inward) · rot · alpha

   12 stone(L, path, opts)                granite texture (stone base, mottling, graphite speckle, cracks)
                                          inside a Path2D (caller coords)
        opts: p 0..1 (amount) · seed · bounds {x,y,w,h} (caller coords — recommended: anchors the texture,
              limits the work, enables cracks and grow) · grow 0..1 (creeping front from the bottom of
              bounds) · cover 0..1 (opaque stone base, 0.82) · color · night · cracks (count, false/0=none)
              scale (texture scale, 1) · shade 0..1 (volume from the silhouette: shadow side lower right,
              lit edge upper left; 0.5)
      stoneOver(L, drawMask, opts)       same, but the mask is whatever drawMask(M) paints into M.paint
        (M = scratch {paint, ink, light} with the caller's transform). Same opts as stone.
      statue(L, manOpts, opts)           draws the man (E.man.draw(L, manOpts)) and turns him to stone:
        opts p 0..1 · grow 0..1 (petrifies from the feet up) · seed · cracks · cover · color · night
        · shade (1: carved volume).
      stoneSpeckle(L, x, y, w, h, opts)  speckle + cracks on L.ink ONLY, inside rect ∩ opts.clip (Path2D);
        opts: p · seed · clip · cracks · washes (also granite glaze on L.paint) · scale
      STATUE RECIPE (s18): E.man.shadow(…); E.props.pedestal(L, x, yTop, w, h); then
        E.props.statue(L, {x, y: yTop, h, view, pose, …}, {p: 1, grow: E.ep(lt, a, b)}).
        (Alternative without masks: E.man.draw(L, {…, tint: '#9a958f', tintAmt}) and stoneSpeckle with a
        clip path of your own.) The man's pencil outline is kept, so he reads as a carved figure.

   13 pedestal(L, x, y, w, h, opts)       stone monument plinth (cap, cyma, die with recessed panel, base)
        (x, y) = TOP centre (where the figure stands: pass the same y to E.man.draw); w = cap width;
        h = height down to the ground (ground at y + h). Cast shadow to the right.
        opts: seed · color ('#D2CBC0') · night · panel true · ornament false (rosette in the panel)
              cracks (3) · texture 0..1 (1) · shadow true · alpha

   14 calligraphyFrame(L, x, y, w, h, opts)   delicate gold tezhip frame / rules for presenting Arabic text
        (x, y) = centre; w × h = outer size (crest palmettes extend ≈ 0.09·min(w, 2.2·h) above/below).
        opts: reveal 0..1 (rules draw from the top centre outward, ornaments bloom as reached)
              style 'cartouche' (double frame, corner rosettes, side medallions, crests) | 'rules' (two
              horizontal rule groups at y ± h/2 with medallions and rumi tips) · night 0..1 (≥ 0.5:
              luminous opaque gold for dark grounds) · color · glow 0..1 · t (shimmer) · rot · alpha
        The frame draws no text — draw the verse inside it (overlay or ink layer).
   ========================================================================================================= */
(function () {
  const E = window.E;
  const PR = (E.props = E.props || {});
  const PI = Math.PI, TAU = Math.PI * 2;
  /** NaN-safe clamp (NaN → a) */
  const clamp = (x, a = 0, b = 1) => (x > a ? (x < b ? x : b) : a);
  const lerp = E.lerp;
  const fin = (v, d = 0) => (Number.isFinite(v) ? v : d);
  /** usable size (positive, finite, sane) / finite coordinates */
  const okS = (v) => v > 0 && v < 1e6;
  const okP = (...a) => a.every(Number.isFinite);
  /** rounded rect that never throws (negative sizes/radii are clamped) */
  const rrect = (x, y, w, h, r) => { w = Math.max(0.1, fin(w, 0.1)); h = Math.max(0.1, fin(h, 0.1)); return E.rrect(fin(x), fin(y), w, h, Math.max(0, Math.min(fin(r), w / 2, h / 2))); };

  // =====================================================================================================
  // internal helpers
  // =====================================================================================================

  /** bounded memo cache for pure geometry (Path2D etc.). Output never depends on call order. */
  const CACHE = new Map();
  function memo(key, build) {
    let v = CACHE.get(key);
    if (v !== undefined) return v;
    v = build();
    CACHE.set(key, v);
    if (CACHE.size > 600) CACHE.delete(CACHE.keys().next().value);
    return v;
  }
  const q = (v, step = 1) => Math.round(v / step) * step;

  /** screen px per local unit of a context's current transform */
  function scaleOf(ctx) {
    const m = ctx.getTransform();
    return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1e-6;
  }

  /** reusable scratch canvases (cleared on every use; no state survives between calls) */
  const SCR = {};
  function scratch(name, w, h, clr = null) {
    let sc = SCR[name];
    if (!sc) { const c = document.createElement('canvas'); c.width = 4; c.height = 4; sc = SCR[name] = { c, ctx: c.getContext('2d') }; }
    w = Math.max(4, Math.ceil(w)); h = Math.max(4, Math.ceil(h));
    if (sc.c.width < w || sc.c.height < h) { sc.c.width = Math.max(sc.c.width, w); sc.c.height = Math.max(sc.c.height, h); }
    const x = sc.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
    if (clr) x.clearRect(clr[0] - 2, clr[1] - 2, clr[2] + 4, clr[3] + 4);
    else x.clearRect(0, 0, w + 2, h + 2);
    return sc;
  }

  const MODES = { glaze: 'multiply', over: 'source-over', light: 'lighter', screen: 'screen', out: 'destination-out', atop: 'source-atop' };

  /** painter bound to the three layers; k = screen px per local unit (for blur/pencil widths) */
  function painter(L, k) {
    const D = {
      L, k,
      px: (n) => n / k,
      /** fill a path. style: colour string or CanvasGradient. o: {mode, alpha, soft (local units)} */
      fill(ctx, path, style, o = {}) {
        ctx.save();
        ctx.globalCompositeOperation = MODES[o.mode || 'glaze'];
        ctx.globalAlpha *= o.alpha ?? 1;
        if (o.soft) ctx.filter = `blur(${Math.max(0.3, o.soft * k).toFixed(2)}px)`;
        ctx.fillStyle = style;
        ctx.fill(path, o.rule || 'nonzero');
        ctx.restore();
      },
      /** stroke a path on any layer. w in local units */
      stroke(ctx, path, style, w, o = {}) {
        ctx.save();
        ctx.globalCompositeOperation = MODES[o.mode || 'glaze'];
        ctx.globalAlpha *= o.alpha ?? 1;
        ctx.strokeStyle = style;
        ctx.lineWidth = w;
        ctx.lineCap = o.cap || 'round';
        ctx.lineJoin = 'round';
        if (o.dash) { ctx.setLineDash(o.dash); ctx.lineDashOffset = o.offset || 0; }
        if (o.soft) ctx.filter = `blur(${Math.max(0.3, o.soft * k).toFixed(2)}px)`;
        ctx.stroke(path);
        ctx.restore();
      },
      /** watercolour glaze (multiply) */
      glaze(path, col, alpha = 1, soft = 0) { D.fill(L.paint, path, col, { alpha, soft }); },
      /** opaque paint */
      over(path, col, alpha = 1, soft = 0) { D.fill(L.paint, path, col, { mode: 'over', alpha, soft }); },
      /** bare paper back (highlight) */
      lift(path, alpha = 1, soft = 0) { D.fill(L.paint, path, '#ffffff', { mode: 'over', alpha, soft }); },
      /** pencil contour on the ink layer (wpx = screen px) */
      pencil(path, a = 0.4, wpx = 1.3, o = {}) {
        if (a <= 0) return;
        E.pencil(L.ink, path, { w: wpx / k, a: a, double: o.double ?? true, seed: o.seed || 11, jitter: (o.jitter ?? 1.1) / k, color: o.color || E.P.ink });
      },
      /** erase ink + light under an opaque silhouette (occlusion of things drawn earlier) */
      occlude(path) {
        for (const c of [L.ink, L.light]) {
          c.save();
          c.globalCompositeOperation = 'destination-out';
          c.fillStyle = '#000';
          c.fill(path);
          c.restore();
        }
      },
      glow(x, y, r, col, a = 1) { if (a > 0.001 && r > 0) E.glow(L.light, x, y, r, col, a); },
      /** soft elliptical wash WITHOUT a blur filter (radial gradient: solid core → transparent rim).
          Canvas blur filters cost ~20–50 ms each in the headless renderer, gradients are nearly free. */
      ell(ctx, cx, cy, rx, ry, col, alpha = 1, o = {}) {
        if (!(rx > 0 && ry > 0) || !(alpha > 0)) return;
        ctx.save();
        ctx.globalCompositeOperation = MODES[o.mode || 'glaze'];
        ctx.globalAlpha *= Math.min(1, alpha);
        ctx.translate(cx, cy);
        if (o.rot) ctx.rotate(o.rot);
        ctx.scale(rx, ry);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1), c0 = clamp(o.core ?? 0.35, 0, 0.95), st = (f) => c0 + (1 - c0) * f;
        g.addColorStop(0, E.rgba(col, 1)); g.addColorStop(c0, E.rgba(col, 1)); g.addColorStop(st(0.25), E.rgba(col, 0.8));
        g.addColorStop(st(0.5), E.rgba(col, 0.45)); g.addColorStop(st(0.75), E.rgba(col, 0.15)); g.addColorStop(1, E.rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
        ctx.restore();
      },
      /** wet-in-wet bloom without blur: irregular blob filled with a radial gradient (soft inside, ragged rim) */
      bloomG(cx, cy, r, col, alpha, seed, mode = 'glaze') {
        D.fill(L.paint, E.blob(cx, cy, r, { seed, irr: 0.4 }), D.rad(L.paint, cx, cy, 0, r * 1.15, [[0, col, 1], [0.55, col, 0.7], [1, col, 0]]), { mode, alpha });
      },
      lin(ctx, x0, y0, x1, y1, stops) {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        for (const s of stops) g.addColorStop(clamp(s[0]), s[2] === undefined ? s[1] : E.rgba(s[1], s[2]));
        return g;
      },
      rad(ctx, x, y, r0, r1, stops) {
        const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(r0 + 0.01, r1));
        for (const s of stops) g.addColorStop(clamp(s[0]), s[2] === undefined ? s[1] : E.rgba(s[1], s[2]));
        return g;
      },
    };
    return D;
  }

  /** begin a prop: save all layers, translate, scale, multiply alpha. Returns painter. */
  function begin(L, x, y, s, alpha = 1, rot = 0) {
    E.save(L);
    E.translate(L, x, y);
    if (rot) E.rotate(L, rot);
    if (s !== 1) E.scale(L, s);
    if (alpha < 1) E.each(L, (c) => { c.globalAlpha *= clamp(alpha); });
    return painter(L, scaleOf(L.paint));
  }
  const end = (L) => E.restore(L);

  const path = (pts, closed = true, tension = 0.5) => E.smoothPath(pts, closed, tension);
  const poly = (pts, closed = true) => {
    const p = new Path2D();
    pts.forEach((v, i) => (i ? p.lineTo(v[0], v[1]) : p.moveTo(v[0], v[1])));
    if (closed) p.closePath();
    return p;
  };
  const ellipse = (cx, cy, rx, ry, rot = 0) => {
    const p = new Path2D();
    p.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
    return p;
  };
  const circle = (cx, cy, r) => ellipse(cx, cy, r, r);
  const mirrorX = (pts) => pts.map((v) => [-v[0], v[1]]);
  /** symmetric closed shape from the left half (bottom → top), mirrored to the right */
  const symPath = (half, tension = 0.5) => path(half.concat(mirrorX(half).reverse()), true, tension);

  /** polyline length & cumulative lengths */
  function measure(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return cum;
  }
  /** resample a smooth catmull-rom curve through pts into ~n points evenly spaced by arc length */
  function resample(pts, step) {
    if (pts.length < 2) return pts.slice();
    // dense catmull sampling
    const dense = [];
    const n = pts.length;
    const get = (i) => pts[Math.max(0, Math.min(n - 1, i))];
    for (let i = 0; i < n - 1; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const seg = Math.min(4000, Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / Math.max(0.5, step * 0.5))));
      for (let j = 0; j < seg; j++) {
        const t = j / seg, t2 = t * t, t3 = t2 * t;
        dense.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    dense.push(pts[n - 1].slice());
    const cum = measure(dense);
    const total = cum[cum.length - 1];
    const m = Math.min(20000, Math.max(2, Math.ceil(total / Math.max(0.5, step)) + 1)); // bounded work for absurd input
    const out = [];
    let j = 0;
    for (let i = 0; i < m; i++) {
      const d = (total * i) / (m - 1);
      while (j < cum.length - 2 && cum[j + 1] < d) j++;
      const f = (d - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
      out.push([lerp(dense[j][0], dense[j + 1][0], f), lerp(dense[j][1], dense[j + 1][1], f)]);
    }
    return out;
  }
  /** resample a polyline (straight segments, corners kept) evenly by arc length */
  function resampleLin(pts, step) {
    const cum = measure(pts), total = cum[cum.length - 1];
    const m = Math.min(20000, Math.max(2, Math.ceil(total / Math.max(0.5, step)) + 1));
    const out = [];
    let j = 0;
    for (let i = 0; i < m; i++) {
      const d = (total * i) / (m - 1);
      while (j < cum.length - 2 && cum[j + 1] < d) j++;
      const f = (d - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
      out.push([lerp(pts[j][0], pts[j + 1][0], f), lerp(pts[j][1], pts[j + 1][1], f)]);
    }
    return out;
  }
  /** tangent & normal at index i of a polyline */
  function frameAt(pts, i) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    return [tx, ty, -ty, tx];
  }

  /** 1-D Catmull-Rom interpolation through [u, v] control points (u ascending) */
  function curve1(ctrl) {
    return (u) => {
      const n = ctrl.length;
      if (u <= ctrl[0][0]) return ctrl[0][1];
      if (u >= ctrl[n - 1][0]) return ctrl[n - 1][1];
      let i = 0;
      while (i < n - 2 && ctrl[i + 1][0] < u) i++;
      const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n - 1, i + 2)];
      const t = (u - p1[0]) / (p2[0] - p1[0]);
      const m1 = ((p2[1] - p0[1]) / Math.max(1e-6, p2[0] - p0[0])) * (p2[0] - p1[0]);
      const m2 = ((p3[1] - p1[1]) / Math.max(1e-6, p3[0] - p1[0])) * (p2[0] - p1[0]);
      const t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
    };
  }

  /** moonlit night version of a colour (n 0..1) */
  const NIGHT = '#43507A';
  const nt = (c, n) => (n > 0 ? E.mix(E.desat(c, 0.3 * n), NIGHT, 0.4 * n) : c);

  /** a deterministic twinkle 0..1 */
  const twinkle = (t, seed) => Math.pow(0.5 + 0.5 * Math.sin(t * (1.7 + E.hash(seed, 3, 7) * 1.6) + seed * 2.3), 3);

  // ---------- ornament toolkit (tezhip vocabulary) ----------
  /** Euler-spiral (clothoid) points: start (x,y), heading h0 (rad, canvas coords), length, curvature k0 + k1*s */
  function clothoid(x, y, h0, len, k0, k1, n = 40) {
    const pts = [[x, y]];
    let hd = h0;
    const ds = len / n;
    for (let i = 1; i <= n; i++) {
      const s = (i - 0.5) * ds;
      hd = h0 + k0 * s + 0.5 * k1 * s * s;
      x += Math.cos(hd) * ds;
      y += Math.sin(hd) * ds;
      pts.push([x, y]);
    }
    return pts;
  }
  /** spiral with curvature k0 + k1·(s/len)^pw : straight-ish first, curling into a volute at the end */
  function volute(x, y, h0, len, k0, k1, pw = 3, n = 60) {
    const pts = [[x, y]];
    const ds = len / n;
    for (let i = 1; i <= n; i++) {
      const s = (i - 0.5) * ds;
      const hd = h0 + k0 * s + (k1 * len / (pw + 1)) * Math.pow(s / len, pw + 1);
      x += Math.cos(hd) * ds;
      y += Math.sin(hd) * ds;
      pts.push([x, y]);
    }
    return pts;
  }
  /** closed tapered-stroke outline around a centre polyline; wf(u) = half width at u∈[0,1] */
  function taper(pts, wf) {
    const l = [], r = [];
    const cum = measure(pts), tot = cum[cum.length - 1] || 1;
    for (let i = 0; i < pts.length; i++) {
      const [, , nx, ny] = frameAt(pts, i);
      const w = Math.max(0, wf(cum[i] / tot));
      l.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
      r.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    return path(l.concat(r.reverse()), true, 0.5);
  }
  /** transform a Path2D: translate (x,y), rotate a (rad), scale s (sy) */
  function place(p, x, y, a = 0, s = 1, sy = s) {
    const out = new Path2D();
    out.addPath(p, new DOMMatrix().translate(x, y).rotate((a * 180) / PI).scale(s, sy));
    return out;
  }
  const join = (list) => { const out = new Path2D(); for (const p of list) if (p) out.addPath(p); return out; };
  /** rumi leaf (split-tip, bird-wing like), base at origin pointing +x, length 1. side ±1 curls the tip */
  const RUMI = memo('rumi', () => {
    const half = [[0, 0], [0.18, -0.2], [0.45, -0.3], [0.72, -0.26], [0.92, -0.1], [1.0, 0.06], [0.86, 0.02], [0.78, 0.1],
      [0.66, 0.06], [0.5, 0.1], [0.3, 0.1], [0.12, 0.06]];
    return path(half, true, 0.5);
  });
  /** lens / vesica shape (cartouche bead), centred, length 1, width wr */
  const lens = (wr = 0.32) => path([[-0.5, 0], [-0.25, -wr * 0.45], [0, -wr * 0.5], [0.25, -wr * 0.45], [0.5, 0], [0.25, wr * 0.45], [0, wr * 0.5], [-0.25, wr * 0.45]], true, 0.5);
  /** palmette / hatayi fan flower, base at origin, pointing up (-y), height 1 */
  const PALMETTE = memo('palmette', () => {
    const half = [[0, 0.02], [-0.16, -0.02], [-0.34, -0.1], [-0.42, -0.2], [-0.34, -0.26], [-0.5, -0.36], [-0.52, -0.48], [-0.38, -0.47],
      [-0.42, -0.64], [-0.34, -0.74], [-0.24, -0.66], [-0.2, -0.84], [-0.1, -0.9], [-0.06, -0.8], [0, -1]];
    const outline = half.concat(mirrorX(half).reverse().slice(1, -1));
    const inner = [[0, -0.14], [-0.085, -0.3], [-0.07, -0.5], [0, -0.66], [0.07, -0.5], [0.085, -0.3]];
    const calyx = [[-0.3, -0.02], [-0.2, -0.13], [-0.1, -0.08], [0, -0.14], [0.1, -0.08], [0.2, -0.13], [0.3, -0.02], [0, 0.05]];
    const veins = new Path2D();
    for (const [vx, vy] of [[-0.44, -0.42], [-0.36, -0.64], [-0.2, -0.8], [0.2, -0.8], [0.36, -0.64], [0.44, -0.42]]) { veins.moveTo(vx * 0.18, -0.18 + vy * 0.1); veins.quadraticCurveTo(vx * 0.55, -0.2 + vy * 0.6, vx * 0.82, vy * 0.92); }
    return { outline: path(outline, true, 0.3), inner: path(inner, true, 0.5), calyx: path(calyx, true, 0.4), veins };
  });
  /** tulip, base at origin pointing up, height 1 */
  const TULIP = memo('tulip', () => ({
    outline: path([[0, 0], [-0.16, -0.08], [-0.3, -0.3], [-0.32, -0.62], [-0.22, -0.92], [-0.12, -0.7], [0, -1], [0.12, -0.7], [0.22, -0.92],
      [0.32, -0.62], [0.3, -0.3], [0.16, -0.08]], true, 0.45),
    inner: path([[0, -0.16], [-0.1, -0.4], [0, -0.78], [0.1, -0.4]], true, 0.5),
  }));
  /** n-fold rosette (petals around a centre), radius 1 */
  const rosette = (nP = 8, inner = 0.35) => memo('ros' + nP + ':' + inner, () => {
    const pts = [];
    for (let i = 0; i < nP * 8; i++) {
      const a = (i / (nP * 8)) * TAU - PI / 2;
      const f = Math.abs(Math.cos((a + PI / 2) * nP / 2));
      pts.push([Math.cos(a) * (inner + (1 - inner) * Math.pow(f, 0.6)), Math.sin(a) * (inner + (1 - inner) * Math.pow(f, 0.6))]);
    }
    return path(pts, true, 0.5);
  });
  /** eight-pointed star {8/2} (two overlapping squares), radius 1 */
  const STAR8 = memo('star8', () => {
    const p = new Path2D();
    const r1 = 1, ri = Math.cos(PI / 4) / Math.cos(PI / 8); // inner vertex radius (two squares)
    const pts = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU - PI / 2; const r = i % 2 ? ri : r1; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    pts.forEach((v, i) => (i ? p.lineTo(v[0], v[1]) : p.moveTo(v[0], v[1])));
    p.closePath();
    return p;
  });

  // shared gold pigments (gilded wood / tezhip)
  const GOLD = { pale: '#F5E4AE', light: '#EBCB7C', mid: '#D6A64C', deep: '#AE7A30', dark: '#7A5230', line: '#8A5A2B' };

  // =====================================================================================================
  // 1. MIRROR
  // =====================================================================================================
  const MR = { A: 196, F: 48, frameBot: -100, glassBot: -154, apexOuter: -892 }; // canonical units: h = 1000

  /** pointed (e>0) / round (e=0) arch points from left springing (-hw, ys) over apex to (hw, ys) */
  function archPts(hw, e, ys, n = 24) {
    const R = hw + e, pa = Math.acos(clamp(-e / R, -1, 1));
    const left = [], right = [];
    for (let i = 0; i <= n; i++) {
      const f = PI + (pa - PI) * (i / n);
      left.push([e + R * Math.cos(f), ys - R * Math.sin(f)]);
    }
    for (let i = n; i >= 0; i--) {
      const f = PI + (pa - PI) * (i / n);
      right.push([-(e + R * Math.cos(f)), ys - R * Math.sin(f)]);
    }
    right.shift();
    return left.concat(right);
  }

  function mirrorGeom(kind) {
    return memo('mirror:' + kind, () => {
      const { A, F, frameBot, glassBot, apexOuter } = MR;
      const a = A - F;
      const e = kind === 'round' ? 0 : a * 0.8;
      const ys = apexOuter + Math.sqrt((A + e) * (A + e) - e * e);
      const glassApex = ys - Math.sqrt((a + e) * (a + e) - e * e);
      // ring at half-width hw (concentric arches), sides down to yb
      const ring = (hw, yb) => [[-hw, yb]].concat(archPts(hw, e, ys, 36), [[hw, yb]]);
      const glassPts = ring(a, glassBot);
      const g = { a, e, ys, glassApex };
      g.outer = poly(ring(A, frameBot));
      g.glass = poly(glassPts);
      g.glassPts = glassPts;
      g.ring = join([g.outer, g.glass]);
      g.ringAt = (hw, yb, closed = true) => poly(ring(hw, yb), closed);
      g.beadOut = g.ringAt(A - 13, frameBot - 13);
      g.hiOut = poly(ring(A - 5, frameBot - 1), false);
      g.fillet = g.ringAt(a + 9, glassBot + 9);
      g.bevel = join([g.ringAt(a + 9, glassBot + 9), g.glass]);
      // ornament chain on the band (closed loop around the glass)
      const loop = resampleLin(ring(A - 26, glassBot + 27).concat([[-(A - 26), glassBot + 27]]), 2);
      const cum = measure(loop), tot = cum[cum.length - 1];
      const step = 36, nB = Math.max(8, Math.round(tot / step));
      const beads = [], dots = [];
      const at = (d) => {
        let i = 0;
        while (i < cum.length - 2 && cum[i + 1] < d) i++;
        const f = (d - cum[i]) / Math.max(1e-6, cum[i + 1] - cum[i]);
        const p0 = loop[i], p1 = loop[i + 1];
        return [lerp(p0[0], p1[0], f), lerp(p0[1], p1[1], f), Math.atan2(p1[1] - p0[1], p1[0] - p0[0])];
      };
      const LENS = lens(0.4);
      for (let j = 0; j < nB; j++) {
        const [bx, by, ang] = at(((j + 0.5) / nB) * tot);
        beads.push(place(LENS, bx, by, ang, 24));
        const [dx, dy] = at((j / nB) * tot);
        dots.push(circle(dx, dy, 2.6));
      }
      g.beads = join(beads);
      g.beadDots = join(dots);
      // crest: slender finial (collar, ball, tulip bud) on the apex + small impost blocks at the springing
      const Y = apexOuter;
      g.crest = [
        path([[-30, Y + 14], [-22, Y + 2], [0, Y - 6], [22, Y + 2], [30, Y + 14], [0, Y + 22]], true, 0.5),
        circle(0, Y - 20, 15),
        rrect(-6, Y - 40, 12, 10, 3),
        path([[0, Y - 36], [-12, Y - 42], [-17, Y - 58], [-14, Y - 76], [-7, Y - 92], [0, Y - 108], [7, Y - 92], [14, Y - 76], [17, Y - 58], [12, Y - 42]], true, 0.5),
      ];
      g.crestIn = path([[0, Y - 44], [-7, Y - 56], [-5, Y - 74], [0, Y - 88], [5, Y - 74], [7, Y - 56]], true, 0.5);
      g.crestLines = [];
      g.imposts = [rrect(-A - 9, ys - 14, 30, 22, 4), rrect(A - 21, ys - 14, 30, 22, 4)];
      // plinth + feet
      const fb = frameBot;
      g.plTop = rrect(-208, fb - 3, 416, 17, 7);
      g.plBody = rrect(-214, fb + 13, 428, 42, 5);
      g.plBot = rrect(-222, fb + 53, 444, 15, 7);
      g.plPanel = rrect(-150, fb + 22, 300, 24, 12);
      g.plRos = place(rosette(8, 0.4), 0, fb + 34, 0, 9);
      const foot = (cx, sx) => path([[cx - sx * 44, -33], [cx - sx * 50, -20], [cx - sx * 44, -6], [cx - sx * 26, 0], [cx + sx * 20, 0],
        [cx + sx * 34, -8], [cx + sx * 30, -20], [cx + sx * 16, -24], [cx + sx * 20, -33]], true, 0.5);
      g.feet = [foot(-162, 1), foot(162, -1)];
      g.base = [g.plTop, g.plBody, g.plBot];
      g.sil = [g.outer, ...g.crest, ...g.imposts, ...g.base, ...g.feet];
      // static diagonal sheen strokes inside the glass (left as bare paper)
      const ang = -1.0;
      const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
      const cx0 = 0, cy0 = (glassBot + glassApex) / 2;
      const band2 = (off, w, l0, l1, seed) => {
        const c = [cx0 + nx * off, cy0 + ny * off];
        const pts = [
          [c[0] + dx * l0 - nx * w / 2, c[1] + dy * l0 - ny * w / 2], [c[0] + dx * l1 - nx * w * 0.35, c[1] + dy * l1 - ny * w * 0.35],
          [c[0] + dx * l1 + nx * w * 0.35, c[1] + dy * l1 + ny * w * 0.35], [c[0] + dx * l0 + nx * w / 2, c[1] + dy * l0 + ny * w / 2],
        ];
        return E.wobblyShape(pts, { seed, amp: 2, freq: 0.03, step: 10 });
      };
      g.sheen = [band2(-112, 44, -700, 700, 3), band2(-62, 12, -700, 700, 5), band2(92, 30, -700, 700, 7), band2(124, 8, -700, 700, 9)];
      g.sheenDir = [dx, dy, nx, ny, cx0, cy0];
      g.glassRect = { x: -a, y: glassApex, w: 2 * a, h: glassBot - glassApex };
      return g;
    });
  }

  /** glass rectangle (bounding box of the glass) of a mirror drawn at (x, y) with height h */
  PR.mirrorGlass = (x, y, h, opts = {}) => {
    const g = mirrorGeom(opts.arch === 'round' ? 'round' : 'pointed');
    const s = h / 1000, r = g.glassRect;
    return { x: x + r.x * s, y: y + r.y * s, w: r.w * s, h: r.h * s, cx: x, springY: y + g.ys * s, apexY: y + g.glassApex * s };
  };
  /** Path2D of the glass outline in caller coordinates */
  PR.mirrorGlassPath = (x, y, h, opts = {}) => {
    const g = mirrorGeom(opts.arch === 'round' ? 'round' : 'pointed');
    return place(g.glass, x, y, 0, h / 1000);
  };

  PR.mirror = (L, x, y, h, o = {}) => {
    if (!okS(h) || !okP(x, y)) return;
    const t = o.t || 0, n = clamp(o.night || 0), shine = o.shine ?? 0;
    const kind = o.arch === 'round' ? 'round' : 'pointed';
    const g = mirrorGeom(kind);
    const outerM = L.paint.getTransform();
    const D = begin(L, x, y, h / 1000, o.alpha ?? 1);
    const P = L.paint;
    const detail = 1000 * D.k; // on-screen height in px
    const C = {
      pale: nt(GOLD.pale, n * 0.7), light: nt(GOLD.light, n * 0.85), mid: nt(GOLD.mid, n * 0.85), deep: nt(GOLD.deep, n * 0.8), dark: nt(GOLD.dark, n * 0.7),
      gTop: E.mix('#E3E7EC', '#7D8FB6', n), gMid: E.mix('#C3CCD7', '#56668F', n), gBot: E.mix('#A4AFC0', '#323E61', n),
      tint: o.glassTint || E.mix('#C9D2DE', '#6F82AE', n),
    };
    const A = MR.A;

    // contact shadow
    if (o.shadow !== false) D.ell(L.paint, 0, 4, 290, 34, n ? '#4E5677' : '#8F8C9C', 0.42, { core: 0.45 });
    for (const p of g.sil) D.occlude(p);

    // ---------------- glass ----------------
    const gr = g.glassRect;
    D.over(g.glass, D.lin(P, 0, gr.y, 0, gr.y + gr.h, [[0, C.gTop], [0.5, C.gMid], [1, C.gBot]]));
    const hasRef = typeof o.reflect === 'function';
    if (hasRef) {
      // reflectAlpha < 1 cross-fades the reflection against the empty glass (works whatever blend modes the
      // reflection uses — E.alpha/E.man alpha cannot fade paint, see the engine notes): snapshot, draw, lerp back
      const ra = clamp(fin(o.reflectAlpha, 1));
      let box = null, bk = null;
      if (ra < 1) {
        const Mg = P.getTransform(), r0 = g.glassRect;
        const cs = [[r0.x, r0.y], [r0.x + r0.w, r0.y], [r0.x, r0.y + r0.h], [r0.x + r0.w, r0.y + r0.h]].map(([u, v]) => [Mg.a * u + Mg.c * v + Mg.e, Mg.b * u + Mg.d * v + Mg.f]);
        const bx0 = Math.max(0, Math.floor(Math.min(...cs.map((c) => c[0])) - 2)), bx1 = Math.min(E.W, Math.ceil(Math.max(...cs.map((c) => c[0])) + 2));
        const by0 = Math.max(0, Math.floor(Math.min(...cs.map((c) => c[1])) - 2)), by1 = Math.min(E.H, Math.ceil(Math.max(...cs.map((c) => c[1])) + 2));
        if (bx1 > bx0 && by1 > by0) {
          box = [bx0, by0, bx1 - bx0, by1 - by0];
          bk = scratch('mrBk', E.W, E.H, box);
          bk.ctx.drawImage(P.canvas, box[0], box[1], box[2], box[3], box[0], box[1], box[2], box[3]);
        }
      }
      if (ra > 0) {
        E.save(L);
        E.each(L, (c) => c.clip(g.glass));
        E.each(L, (c) => c.setTransform(outerM));
        o.reflect(L, PR.mirrorGlass(x, y, h, o));
        E.restore(L);
        if (box) {
          for (const c of [P, L.ink, L.light]) {
            c.save();
            c.clip(g.glass);
            c.setTransform(1, 0, 0, 1, 0, 0);
            c.globalAlpha = 1 - ra;
            c.globalCompositeOperation = 'destination-out';
            c.fillRect(box[0], box[1], box[2], box[3]);
            if (c === P) { c.globalCompositeOperation = 'lighter'; c.drawImage(bk.c, box[0], box[1], box[2], box[3], box[0], box[1], box[2], box[3]); }
            c.restore();
          }
        }
      }
      // the reflection lies behind glass: unify it with a cool silver glaze, and soften its pencil and light
      // (only the reflection can be there: the glass area was occluded before)
      D.glaze(g.glass, D.lin(P, 0, gr.y, 0, gr.y + gr.h, [[0, C.tint, 0.3], [1, C.tint, 0.5]]));
      D.fill(L.ink, g.glass, '#000', { mode: 'out', alpha: 0.4 });
      D.fill(L.light, g.glass, '#000', { mode: 'out', alpha: 0.25 });
    }
    E.save(L);
    E.each(L, (c) => c.clip(g.glass));
    // painterly variation inside the glass (wet-in-wet)
    D.ell(P, -50, gr.y + gr.h * 0.28, 150, 135, n ? '#56679A' : '#BAC6D9', 0.42, { core: 0.2 });
    D.ell(P, 70, gr.y + gr.h * 0.8, 170, 150, n ? '#46507A' : '#ABA5C2', 0.34, { core: 0.2 });
    // frame shadow falling on the glass (stacked strokes instead of a blur)
    for (const [sw, sa] of [[40, 0.1], [26, 0.12], [14, 0.14]]) D.stroke(P, g.glass, n ? '#27304F' : '#7D8797', sw, { alpha: sa });
    // diagonal sheen strokes left as bare paper
    const sheenA = (hasRef ? 0.5 : 0.8) * (n ? 0.62 : 1) * (o.sheen ?? 1);
    // bare-paper strokes: crisp (found) edges, the paper showing more strongly towards the upper left (lost)
    const shG = D.lin(P, -A, gr.y, A, gr.y + gr.h, [[0, '#FFFFFF', 1], [0.55, '#FFFFFF', 0.75], [1, '#FFFFFF', 0.45]]);
    g.sheen.forEach((p, i) => D.fill(P, p, shG, { mode: 'over', alpha: sheenA * (i % 2 ? 0.8 : 1) }));
    if (n > 0) g.sheen.forEach((p, i) => D.fill(L.light, p, '#A9C0F0', { mode: 'light', alpha: 0.13 * n * (i % 2 ? 0.7 : 1) }));
    // sweeping gleam (shine 0 → 1)
    if (shine > 0 && shine < 1) {
      const [dx, dy, nx, ny, cx0, cy0] = g.sheenDir;
      const sh = E.ease.inOutSine(clamp(shine));
      const off = lerp(-330, 330, sh), env = Math.pow(Math.sin(PI * clamp(shine)), 0.7);
      const c = [cx0 + nx * off, cy0 + ny * off];
      const band = (w) => poly([[c[0] - dx * 700 - nx * w, c[1] - dy * 700 - ny * w], [c[0] + dx * 700 - nx * w, c[1] + dy * 700 - ny * w],
        [c[0] + dx * 700 + nx * w, c[1] + dy * 700 + ny * w], [c[0] - dx * 700 + nx * w, c[1] - dy * 700 + ny * w]]);
      // soft-edged bands via gradients across the band (no blur filters)
      const across = (ctx, w, col) => D.lin(ctx, c[0] - nx * w, c[1] - ny * w, c[0] + nx * w, c[1] + ny * w, [[0, col, 0], [0.3, col, 0.6], [0.5, col, 1], [0.7, col, 0.6], [1, col, 0]]);
      D.fill(P, band(44), across(P, 44, '#FFFFFF'), { mode: 'over', alpha: 0.85 * env });
      D.lift(band(8), 0.92 * env);
      D.fill(L.light, band(80), across(L.light, 80, n ? '#BCD0FF' : '#FFF3D6'), { mode: 'light', alpha: 0.42 * env });
      D.fill(L.light, band(16), across(L.light, 16, '#FFFFFF'), { mode: 'light', alpha: 0.5 * env });
    }
    E.restore(L);

    // ---------------- frame ----------------
    const EO = { rule: 'evenodd' };
    // gilded wood: pale base, warm mid glaze (lit upper-left edges stay pale), deep glaze on the shadow side
    const gl = D.lin(P, -A, -560, A, -440, [[0, C.light, 0.35], [0.22, C.light, 0.85], [0.6, C.mid, 0.6], [1, C.deep, 0.75]]);
    const sh = D.lin(P, -A, 0, A, 0, [[0, C.deep, 0], [0.58, C.deep, 0], [0.82, C.deep, 0.3], [1, C.dark, 0.45]]);
    const gild = (p, rule) => {
      D.fill(P, p, C.pale, { mode: 'over', rule });
      D.fill(P, p, gl, { rule });
      D.fill(P, p, sh, { rule });
    };
    // feet + base (behind the frame)
    for (const p of g.feet) { gild(p); D.glaze(p, C.deep, 0.55); }
    gild(g.plBot); D.glaze(g.plBot, C.mid, 0.45);
    gild(g.plBody); D.glaze(g.plBody, C.mid, 0.3);
    gild(g.plTop);
    D.glaze(g.plPanel, C.deep, 0.42);
    D.stroke(P, g.plPanel, C.dark, 2, { alpha: 0.55 });
    D.glaze(g.plRos, C.dark, 0.5);
    D.stroke(P, poly([[-200, MR.frameBot + 16], [200, MR.frameBot + 16]], false), C.dark, 2.4, { alpha: 0.35 });
    D.stroke(P, poly([[-204, MR.frameBot + 55], [204, MR.frameBot + 55]], false), C.dark, 2.4, { alpha: 0.35 });
    // the frame ring
    gild(g.ring, 'evenodd');
    P.save();
    P.clip(g.ring, 'evenodd');
    D.stroke(P, g.outer, C.mid, 28, { alpha: 0.4 });     // rounded outer moulding: inner half in shade
    D.stroke(P, g.outer, C.deep, 7, { alpha: 0.35 });
    D.glaze(g.bevel, C.deep, 0.6);                        // recessed bevel at the glass
    D.stroke(P, g.glass, C.dark, 7, { alpha: 0.7 });
    P.restore();
    D.stroke(P, g.beadOut, C.dark, 2.4, { alpha: 0.6 });
    D.stroke(P, g.fillet, C.dark, 2.2, { alpha: 0.55 });
    P.save();
    P.beginPath(); P.rect(-A - 20, -1100, A - 10, 1200); P.clip();
    D.stroke(P, g.hiOut, '#ffffff', 4, { mode: 'over', alpha: 0.7 });
    P.restore();
    // tezhip bead chain on the band
    if (detail > 200) {
      D.glaze(g.beads, C.mid, 0.6);
      if (detail > 380) {
        D.stroke(P, g.beads, C.dark, 1.9, { alpha: 0.7 });
        D.fill(P, g.beadDots, C.dark, { alpha: 0.65 });
      } else D.fill(P, g.beads, C.deep, { alpha: 0.5 });
    }
    // imposts + finial (in front of the frame)
    for (const p of g.imposts) { gild(p); D.stroke(P, p, C.dark, 1.8, { alpha: 0.45 }); }
    for (const p of g.crest) gild(p);
    D.glaze(g.crestIn, C.deep, 0.5);
    D.stroke(P, g.crestIn, C.dark, 2.2, { alpha: 0.6 });
    if (detail > 300) for (const l of g.crestLines) D.stroke(P, l, C.dark, 1.8, { alpha: 0.5 });
    // pencil contours
    const pa = 0.36;
    D.pencil(g.outer, pa, 1.3, { seed: 3 });
    D.pencil(g.glass, 0.3, 1.1, { double: false });
    for (const p of g.crest) D.pencil(p, pa * 0.9, 1.15, { seed: 4 });
    for (const p of g.imposts) D.pencil(p, pa * 0.8, 1.1, { double: false });
    for (const p of g.base) D.pencil(p, pa, 1.15, { seed: 5 });
    for (const p of g.feet) D.pencil(p, pa, 1.15, { seed: 6 });
    // gilded glints (light layer), gently twinkling
    const gc = n ? '#C9D8FF' : '#FFE7A8';
    const glints = [[0, MR.apexOuter - 100], [-150, g.ys - 120], [-A + 6, -460], [-60, MR.frameBot + 34], [-110, MR.apexOuter + 110]];
    glints.forEach(([gx, gy], i) => D.glow(gx, gy, 24, gc, (0.2 + 0.32 * twinkle(t, i + 1)) * (o.glints ?? 1)));
    end(L);
  };

  // =====================================================================================================
  // 2. HOURGLASS
  // =====================================================================================================
  const HG = { cap: 88, neckY: -500, bulbL: 392, postX: 214 };
  const hgR = curve1([[0, 10], [0.05, 17], [0.16, 60], [0.32, 126], [0.5, 158], [0.68, 157], [0.84, 137], [0.95, 112], [1, 103]]);

  function hourglassGeom() {
    return memo('hourglass', () => {
      const { neckY, bulbL, postX } = HG;
      const N = 48;
      const yTop = (u) => neckY - u * bulbL, yBot = (u) => neckY + u * bulbL;
      // volume table (∝ ∫ r² du)
      const VT = [0];
      const M = 200;
      for (let i = 1; i <= M; i++) { const u = (i - 0.5) / M, r = hgR(u); VT.push(VT[i - 1] + (r * r) / M); }
      const right = [], left = [];
      for (let i = N; i >= 0; i--) right.push([hgR(i / N), yTop(i / N)]);
      for (let i = 1; i <= N; i++) right.push([hgR(i / N), yBot(i / N)]);
      for (let i = right.length - 1; i >= 0; i--) left.push([-right[i][0], right[i][1]]);
      const g = { VT, M, yTop, yBot };
      g.glass = path(right.concat(left), true, 0.5);
      g.glassR = right;
      // highlights: crescent strips on the left of each bulb, small one on the right
      const strip = (yf, u0, u1, xf, wmax) => {
        const a = [], b = [];
        for (let i = 0; i <= 20; i++) {
          const u = lerp(u0, u1, i / 20), w = wmax * Math.sin(PI * (i / 20));
          const r = hgR(u);
          a.push([xf * r - w * 0.5, yf(u)]);
          b.push([xf * r + w * 0.5, yf(u)]);
        }
        return path(a.concat(b.reverse()), true, 0.5);
      };
      g.hl = [strip(yTop, 0.3, 0.88, -0.66, 20), strip(yBot, 0.3, 0.88, -0.66, 20)];
      g.hl2 = [strip(yTop, 0.48, 0.72, 0.72, 7), strip(yBot, 0.48, 0.72, 0.72, 7)];
      g.hl3 = [strip(yTop, 0.12, 0.3, -0.5, 6), strip(yBot, 0.12, 0.3, -0.5, 6)];
      // collars where the glass meets the caps
      g.collars = [rrect(-114, -1000 + HG.cap - 2, 228, 18, 6), rrect(-114, -HG.cap - 16, 228, 18, 6)];
      // caps (bottom cap built at y∈[-88,0]; top cap mirrored about y=-500)
      const capParts = (flip) => {
        const f = (pts) => pts.map(([x, y]) => [x, flip ? -1000 - y : y]);
        const rr = (x, y0, w, y1, r) => { const ya = Math.min(f([[0, y0]])[0][1], f([[0, y1]])[0][1]); return rrect(x, ya, w, Math.abs(y1 - y0), r); };
        return {
          foot: rr(-264, 0, 528, -20, 9),
          body: rr(-256, -19, 512, -63, 20),
          ring: rr(-236, -62, 472, -88, 9),
          groove: poly(f([[-250, -41], [250, -41]]), false),
        };
      };
      g.caps = [capParts(false), capParts(true)];
      // turned posts
      const prof = (v) => {
        const w = Math.min(v, 1 - v);
        const bump = (c, s) => Math.exp(-Math.pow((w - c) / s, 2));
        return 11 + 9 * (w < 0.035 ? 1 : 0) * 0 + 12 * bump(0.0, 0.03) + 9 * bump(0.06, 0.012) + 8 * bump(0.24, 0.07) + 8 * bump(0.5, 0.018);
      };
      const post = (cx, scale = 1) => {
        const a = [], b = [];
        const y0 = -HG.cap, y1 = -1000 + HG.cap;
        for (let i = 0; i <= 90; i++) {
          const v = i / 90, y = lerp(y0, y1, v), r = prof(v) * scale;
          a.push([cx - r, y]);
          b.push([cx + r, y]);
        }
        return poly(a.concat(b.reverse()));
      };
      g.posts = [post(-postX), post(postX)];
      g.backPost = post(0, 0.7);
      g.postLines = [];
      for (const cx of [-postX, postX]) {
        const pl = new Path2D();
        for (const v of [0.06, 0.24, 0.5, 0.76, 0.94]) {
          const y = lerp(-HG.cap, -1000 + HG.cap, v), r = prof(v);
          pl.moveTo(cx - r * 0.9, y); pl.lineTo(cx + r * 0.9, y);
        }
        g.postLines.push(pl);
      }
      // sand grain speckle (static), clipped to sand at draw time
      const r = E.rng(77);
      const sp = new Path2D();
      for (let i = 0; i < 520; i++) {
        const x = (r() - 0.5) * 330, y = neckY + (r() - 0.5) * 2 * bulbL, s = 0.8 + r() * 1.4;
        sp.moveTo(x + s, y); sp.arc(x, y, s, 0, TAU);
      }
      g.speck = sp;
      return g;
    });
  }
  /** u (0 = neck .. 1 = end) where the cumulative bulb volume reaches v (fraction of a full bulb) */
  function hgLevel(g, v) {
    const tot = g.VT[g.M], target = clamp(v) * tot;
    let i = 0;
    while (i < g.M && g.VT[i + 1] < target) i++;
    const f = (target - g.VT[i]) / Math.max(1e-9, g.VT[i + 1] - g.VT[i]);
    return clamp((i + f) / g.M);
  }

  PR.hourglass = (L, x, y, h, o = {}) => {
    if (!okS(h) || !okP(x, y)) return;
    const t = o.t || 0, n = clamp(o.night || 0), glow = clamp(o.glow || 0);
    const sand = clamp(o.sand ?? 0.6), flow = clamp(o.flow ?? 1), speed = Math.max(0, o.speed ?? 1);
    const g = hourglassGeom();
    const D = begin(L, x, y, h / 1000, o.alpha ?? 1);
    const P = L.paint;
    const detail = 1000 * D.k;
    const W = {
      light: nt('#D6A66E', n), mid: nt('#A87148', n), dark: nt('#6E4630', n),
      sand: nt(o.sandColor || '#DDB46A', n * 0.8), sandD: nt('#B98738', n * 0.8),
      glass: n ? '#5F6F98' : '#B8C7D6', brass: nt(GOLD.mid, n),
    };
    // contact shadow
    if (o.shadow !== false) D.ell(L.paint, 0, 4, 310, 30, n ? '#5D6587' : '#8F8C9C', 0.4, { core: 0.45 });
    // back post seen through the glass: a faint, refracted ghost (it must never read as a sand stream)
    D.glaze(g.backPost, D.lin(P, 0, -1000 + HG.cap, 0, -HG.cap, [[0, W.glass, 0.5], [0.16, W.glass, 0.12], [0.3, W.glass, 0.0],
      [0.45, W.glass, 0.1], [0.5, W.glass, 0.4], [0.55, W.glass, 0.1], [0.7, W.glass, 0.0], [0.84, W.glass, 0.12], [1, W.glass, 0.5]]));
    D.glaze(g.backPost, E.mix(W.mid, W.glass, 0.5), 0.12);
    // glass body: very light cool glaze, transparent
    D.glaze(g.glass, D.lin(P, -160, 0, 160, 0, [[0, W.glass, 0.12], [0.5, W.glass, 0.05], [1, W.glass, 0.28]]));
    // ----- sand -----
    const Vs = 0.5; // total sand = half a bulb
    const flowing = flow > 0.001 && sand > 0.002 && sand < 0.999;
    E.save(L);
    P.save();
    P.clip(g.glass);
    let peakY = HG.neckY + HG.bulbL - 4;
    if (sand > 0.002) {
      const us = hgLevel(g, sand * Vs), ys = g.yTop(us), rs = hgR(us);
      const dip = flowing ? Math.min(rs * 0.42, 70 * (0.35 + 0.65 * flow)) * clamp(us * 6) : 0;
      // polygon: neck-left → up the left wall → surface → down the right wall → neck
      const left = [];
      for (let i = 0; i <= 16; i++) { const u = (us * i) / 16; left.push([-hgR(u) - 2, g.yTop(u)]); }
      const surf = [];
      for (let i = 0; i <= 24; i++) { const xf = -1 + (2 * i) / 24; surf.push([xf * (rs + 2), ys + dip * Math.pow(Math.max(0, 1 - xf * xf), 1.6)]); }
      const rightW = [];
      for (let i = 16; i >= 0; i--) { const u = (us * i) / 16; rightW.push([hgR(u) + 2, g.yTop(u)]); }
      const top = poly(left.concat(surf, rightW, [[0, HG.neckY + 8]]));
      D.over(top, W.sand);
      D.fill(P, top, D.lin(P, -rs, 0, rs, 0, [[0, W.sandD, 0], [0.55, W.sandD, 0.1], [1, W.sandD, 0.55]]));
      P.save(); P.clip(top); D.fill(P, g.speck, W.sandD, { alpha: 0.5 }); P.restore();
      // lit sand surface
      D.stroke(P, path(surf, false), E.shade(W.sand, 0.45), 5, { mode: 'over', alpha: 0.8 });
    }
    if (sand < 0.998) {
      const ub = hgLevel(g, 1 - (1 - sand) * Vs * 0.86), yb = g.yBot(ub), rb = hgR(ub);
      const mound = Math.min(rb * 0.55, 30 + 160 * (1 - sand) * 0.6, yb - HG.neckY - 20);
      const left = [], surf = [], rightW = [];
      for (let i = 16; i >= 0; i--) { const u = ub + ((1 - ub) * i) / 16; left.push([-hgR(u) - 2, g.yBot(u) + 4]); }
      for (let i = 0; i <= 24; i++) {
        const xf = -1 + (2 * i) / 24;
        surf.push([xf * (rb + 2), yb - mound * Math.pow(Math.max(0, 1 - Math.abs(xf)), 1.35) * (0.82 + 0.18 * (1 - xf * xf))]);
      }
      for (let i = 0; i <= 16; i++) { const u = ub + ((1 - ub) * i) / 16; rightW.push([hgR(u) + 2, g.yBot(u) + 4]); }
      const bot = poly(left.concat(surf, rightW));
      peakY = yb - mound;
      D.over(bot, W.sand);
      D.fill(P, bot, D.lin(P, -rb, 0, rb, 0, [[0, W.sandD, 0], [0.5, W.sandD, 0.12], [1, W.sandD, 0.6]]));
      P.save(); P.clip(bot); D.fill(P, g.speck, W.sandD, { alpha: 0.5 }); P.restore();
      D.stroke(P, path(surf.slice(4, 21), false), E.shade(W.sand, 0.45), 4, { mode: 'over', alpha: 0.7 });
    }
    // falling stream
    if (flowing) {
      const y0 = HG.neckY - 6, y1 = peakY + 2;
      const sw = Math.max(1.3 / D.k, (2.4 + 1.6 * Math.min(2, speed))) * (0.4 + 0.6 * flow);
      const st = poly([[0, y0], [0, y1]], false);
      D.stroke(P, st, W.sand, sw, { mode: 'over', alpha: flow });
      D.stroke(P, st, W.sandD, sw * 0.7, { alpha: 0.45 * flow });
      D.stroke(P, st, E.shade(W.sand, 0.6), sw * 0.6, { mode: 'over', alpha: 0.7 * flow, dash: [4, 11, 2, 17], offset: -t * 520 * Math.max(0.2, speed) });
      // grains bouncing at the pile top
      const rr = E.rng(31);
      for (let i = 0; i < 7; i++) {
        const ph = (t * (1.6 + rr()) * Math.max(0.3, speed) + rr()) % 1;
        const dx = (rr() - 0.5) * 60 * ph, dy = -Math.sin(PI * ph) * 16;
        D.fill(P, circle(dx, y1 + dy, 1.8), W.sandD, { alpha: flow * (1 - ph) });
      }
    }
    P.restore();
    E.restore(L);
    // ----- glass shading + highlights (glass is in front of the sand) -----
    P.save();
    P.clip(g.glass);
    D.stroke(P, g.glass, n ? '#3F4A70' : '#8E9AAB', 18, { alpha: 0.16 });
    D.stroke(P, g.glass, n ? '#3F4A70' : '#8E9AAB', 9, { alpha: 0.18 });
    P.restore();
    const hlA = n ? 0.6 : 0.88;
    g.hl.forEach((p) => D.lift(p, hlA));
    g.hl2.forEach((p) => D.lift(p, hlA * 0.7));
    g.hl3.forEach((p) => D.lift(p, hlA * 0.6));
    D.pencil(g.glass, 0.34, 1.2, { seed: 8 });
    // collars (brass)
    for (const c of g.collars) {
      D.occlude(c);
      D.over(c, E.shade(W.brass, 0.25));
      D.fill(P, c, D.lin(P, -114, 0, 114, 0, [[0, W.brass, 0.1], [0.6, W.brass, 0.45], [1, GOLD.deep, 0.7]]));
      D.pencil(c, 0.3, 1.0, { double: false });
    }
    // ----- posts -----
    const woodGrad = (x0, x1) => D.lin(P, x0, 0, x1, 0, [[0, W.dark, 0.0], [0.35, W.dark, 0.05], [0.7, W.dark, 0.45], [1, W.dark, 0.7]]);
    g.posts.forEach((p, i) => {
      const cx = i ? HG.postX : -HG.postX;
      D.occlude(p);
      D.over(p, W.light);
      D.fill(P, p, woodGrad(cx - 26, cx + 26));
      if (detail > 260) D.stroke(P, g.postLines[i], W.dark, 2.4, { alpha: 0.6 });
      D.stroke(P, poly([[cx - 6, -HG.cap - 30], [cx - 6, -1000 + HG.cap + 30]], false), '#ffffff', 3, { mode: 'over', alpha: 0.35 });
      D.pencil(p, 0.34, 1.1, { seed: 9 + i });
    });
    // ----- caps -----
    g.caps.forEach((c, i) => {
      for (const p of [c.foot, c.body, c.ring]) { D.occlude(p); D.over(p, W.light); }
      const cg = woodGrad(-266, 266);
      for (const p of [c.foot, c.body, c.ring]) D.fill(P, p, cg);
      D.glaze(c.foot, W.mid, 0.55);
      D.glaze(c.ring, W.mid, 0.3);
      // band shading: lower half of the body is in shadow (top cap: its underside)
      const yb = i ? -1000 + 41 : -41;
      D.fill(P, c.body, D.lin(P, 0, yb - 22, 0, yb + 22, i ? [[0, W.dark, 0.4], [0.5, W.dark, 0.0], [1, W.dark, 0.0]] : [[0, W.dark, 0], [0.5, W.dark, 0], [1, W.dark, 0.4]]));
      if (detail > 260) D.stroke(P, c.groove, W.dark, 2.6, { alpha: 0.55 });
      D.stroke(P, poly([[-240, i ? -1000 + 30 : -30], [-120, i ? -1000 + 28 : -28]], false), '#ffffff', 4, { mode: 'over', alpha: 0.5 });
      for (const p of [c.foot, c.body, c.ring]) D.pencil(p, 0.32, 1.1, { seed: 12 + i });
    });
    // ----- light -----
    if (glow > 0) {
      D.glow(0, HG.neckY, 420, n ? '#FFD49A' : '#FFDDA6', 0.32 * glow);
      D.glow(0, HG.neckY + 120, 180, '#FFE2B0', 0.25 * glow);
      if (flowing) D.stroke(L.light, poly([[0, HG.neckY], [0, peakY]], false), '#FFE9C0', 5, { mode: 'light', alpha: 0.3 * glow * flow });
    }
    end(L);
  };

  // =====================================================================================================
  // 3. PAGE (fine paper with tezhip border)
  // =====================================================================================================
  function pageGeom(w, h, seed) {
    // geometry is built from the quantised size it is cached under, so the result never depends on call order
    w = Math.max(0.5, q(w, 0.5)); h = Math.max(0.5, q(h, 0.5));
    return memo(`page:${w}:${h}:${seed}`, () => {
      const m = Math.min(w, h);
      const g = { w, h, m };
      g.sheet = E.wobblyShape([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], { seed, amp: m * 0.0025, freq: 0.02, step: Math.max(6, m * 0.02) });
      const i0 = m * 0.055, i1 = m * 0.075, i2 = m * 0.125, i3 = m * 0.142;
      const rectLoop = (ins) => {
        const x0 = -w / 2 + ins, y0 = -h / 2 + ins, x1 = w / 2 - ins, y1 = h / 2 - ins;
        // start at top centre, clockwise
        return [[0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0], [0, y0]];
      };
      g.ins = { i0, i1, i2, i3 };
      g.loops = [rectLoop(i0), rectLoop(i1), rectLoop(i2), rectLoop(i3)].map((pts) => ({ pts, path: poly(pts, false), len: measure(pts).pop() }));
      g.bandRect = [-w / 2 + i1, -h / 2 + i1, w - 2 * i1, h - 2 * i1, w - 2 * i2, h - 2 * i2];
      const band = new Path2D();
      band.rect(-w / 2 + i1, -h / 2 + i1, w - 2 * i1, h - 2 * i1);
      band.rect(-w / 2 + i2, -h / 2 + i2, w - 2 * i2, h - 2 * i2);
      g.band = band;
      // motifs along the band centre: alternating lens buds and dots, rosettes at the corners
      const mid = (i1 + i2) / 2, bw = i2 - i1;
      const loop = resampleLin(rectLoop(mid), 1.5), cum = measure(loop), tot = cum[cum.length - 1];
      const nM = Math.max(8, Math.round(tot / (bw * 1.6)));
      g.motifs = [];
      const LENS = lens(0.42);
      for (let j = 0; j < nM; j++) {
        const d = ((j + 0.5) / nM) * tot;
        let i = 0;
        while (i < cum.length - 2 && cum[i + 1] < d) i++;
        const p0 = loop[i], p1 = loop[i + 1];
        const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
        const cx = lerp(p0[0], p1[0], 0.5), cy = lerp(p0[1], p1[1], 0.5);
        const kind = j % 2;
        const ix0 = w / 2 - mid, iy0 = h / 2 - mid;
        if (Math.min(Math.hypot(Math.abs(cx) - ix0, Math.abs(cy) - iy0)) < bw * 1.25) continue;
        if (Math.abs(cx) < bw * 1.2 && Math.abs(Math.abs(cy) - iy0) < bw) continue; // centre medallions
        g.motifs.push({ u: d / tot, p: kind ? circle(cx, cy, bw * 0.09) : place(LENS, cx, cy, ang, bw * 0.95), dot: !!kind });
      }
      const ix = w / 2 - mid, iy = h / 2 - mid;
      g.corners = [[ix, -iy, 0.125 + (ix / tot) * 0], [ix, iy], [-ix, iy], [-ix, -iy]].map(([cx, cy], k) => ({
        p: place(rosette(8, 0.42), cx, cy, 0, bw * 0.62), c: circle(cx, cy, bw * 0.16), cx, cy,
        u: [(w / 2 - mid) / tot, (w / 2 - mid + 2 * iy) / tot, (w / 2 - mid + 2 * iy + 2 * ix) / tot, (w / 2 - mid + 4 * iy + 2 * ix) / tot][k],
      }));
      // top + bottom centre medallions (small lobed ovals)
      g.meds = [[0, -h / 2 + mid], [0, h / 2 - mid]].map(([cx, cy]) => place(rosette(12, 0.75), cx, cy, 0, bw * 0.95, bw * 0.62));
      // text area
      const ta = m * 0.2;
      g.text = { x: -w / 2 + ta, y: -h / 2 + ta, w: w - 2 * ta, h: h - 2 * ta };
      g.inner = rrect(-w / 2 + i3 + 2, -h / 2 + i3 + 2, w - 2 * i3 - 4, h - 2 * i3 - 4, 2);
      return g;
    });
  }

  PR.page = (L, x, y, w, h, o = {}) => {
    if (!okS(w) || !okS(h) || !okP(x, y) || Math.min(w, h) * scaleOf(L.paint) < 0.5) return;
    const t = o.t || 0, border = clamp(o.border ?? 1), lines = clamp(o.lines ?? 0), curl = clamp(o.curl || 0), lift = clamp(o.lift || 0);
    const rot = o.rot || 0, seed = o.seed || 1;
    const g = pageGeom(w, h, seed);
    const m = g.m;
    const paperC = o.color || '#FCF7EA';
    const gold = o.gold || GOLD.mid;
    // ---- soft drop shadow (grows and blurs as the page lifts) ----
    if (o.shadow !== false) {
      const Ds = begin(L, x + m * (0.018 + 0.09 * lift), y + m * (0.026 + 0.14 * lift), 1 + 0.03 * lift, (o.alpha ?? 1) * (1 - 0.35 * lift), rot);
      Ds.glaze(rrect(-w / 2, -h / 2, w, h, m * 0.01), '#8A8698', 0.42, m * (0.012 + 0.05 * lift));
      end(L);
    }
    const D = begin(L, x, y, 1 + 0.06 * E.ease.outQuad(lift), o.alpha ?? 1, rot);
    const P = L.paint;
    const detail = m * D.k;
    // ---- curl geometry: fold the bottom-right corner over a 45° line ----
    const c = curl * 0.34 * m;
    let sheet = g.sheet, flap = null, flapShadow = null;
    if (c > 0.5) {
      const X = w / 2, Yb = h / 2;
      const cut = new Path2D();
      cut.moveTo(-w, -h); cut.lineTo(w, -h); cut.lineTo(w, Yb - c - w * 2); cut.lineTo(X + 2, Yb - c);
      cut.quadraticCurveTo(X - c * 0.45, Yb - c * 0.45, X - c, Yb + 2); cut.lineTo(X - c - w * 2, h); cut.lineTo(-w, h); cut.closePath();
      E.save(L);
      E.each(L, (cx) => cx.clip(cut));
      sheet = { clipped: true };
      flap = path([[X - c, Yb], [X - c * 0.92, Yb - c * 0.6], [X - c * 1.02, Yb - c * 1.02], [X - c * 0.6, Yb - c * 0.92], [X, Yb - c], [X - c * 0.45, Yb - c * 0.45]], true, 0.35);
      flapShadow = path([[X - c * 1.0, Yb], [X - c * 1.18, Yb - c * 1.18], [X, Yb - c]], true, 0.4);
    }
    const sheetPath = g.sheet;
    D.occlude(sheetPath);
    D.over(sheetPath, paperC);
    // very light warm variation (fine handmade paper)
    D.glaze(sheetPath, D.lin(P, -w / 2, -h / 2, w / 2, h / 2, [[0, '#FFFFFF', 0], [0.6, '#EFE3C8', 0.25], [1, '#E3D3B1', 0.45]]));
    P.save(); P.clip(sheetPath);
    D.ell(P, -w * 0.18, -h * 0.12, m * 0.36, m * 0.32, '#F1E6CC', 0.35, { core: 0.25 });
    D.ell(P, w * 0.25, h * 0.3, m * 0.3, m * 0.27, '#EADCC0', 0.3, { core: 0.25 });
    P.restore();
    // ---- content (clipped to the text/illustration area) ----
    if (typeof o.content === 'function') {
      E.save(L);
      E.each(L, (cx) => cx.clip(g.inner));
      o.content(L, { x: g.text.x, y: g.text.y, w: g.text.w, h: g.text.h, inner: g.inner });
      E.restore(L);
    }
    // ---- faint ruled lines ----
    if (lines > 0) {
      const tx = g.text;
      const sp = Math.max(m * 0.055, 8);
      const nL = Math.floor(tx.h / sp) + 1;
      for (let i = 0; i < nL; i++) {
        const pi = clamp(lines * (nL + 3) - i * 0.85 - 0) / 1;
        const a = clamp(lines * nL * 1.2 - i);
        if (a <= 0) continue;
        const yy = tx.y + i * sp;
        D.stroke(L.ink, poly([[tx.x, yy], [tx.x + tx.w * clamp(pi), yy]], false), '#8C7D74', Math.max(0.6, 1.0 / D.k), { mode: 'over', alpha: 0.22 * a });
      }
      // margin rule
      const ma = clamp(lines * 2);
      D.stroke(L.ink, poly([[tx.x + tx.w, tx.y - sp * 0.4], [tx.x + tx.w, tx.y - sp * 0.4 + (tx.h + sp * 0.8) * ma]], false), '#B07A6A', Math.max(0.7, 1.2 / D.k), { mode: 'over', alpha: 0.28 });
    }
    // ---- tezhip border ----
    if (border > 0) {
      const be = E.ease.inOutSine(border);
      const lw = (px) => Math.max(px / D.k, m * 0.0016);
      // band wash fades in behind the drawn rules
      D.fill(P, g.band, E.mix(GOLD.light, paperC, 0.3), { alpha: 0.6 * clamp(be * 1.6 - 0.3), rule: 'evenodd' });
      // rules draw from the top centre both ways (two half loops)
      g.loops.forEach((lp, i) => {
        const wv = [m * 0.006, m * 0.0045, m * 0.0045, m * 0.0025][i];
        const col = i === 3 ? GOLD.dark : gold;
        for (const sx of [1, -1]) {
          P.save();
          P.scale(sx, 1);
          D.stroke(P, lp.path, col, Math.max(lw(1.1), wv), { alpha: 0.9, dash: [lp.len * 0.5 * clamp(be * 1.08 - i * 0.02), lp.len * 2] });
          P.restore();
        }
      });
      if (detail > 160) {
        // motifs pop in as the rules pass them (u measured clockwise from top centre; mirrored halves)
        const reach = be * 0.5 * 1.04;
        for (const mo of g.motifs) {
          const ud = Math.min(mo.u, 1 - mo.u);
          const a = clamp((reach - ud) * 14);
          if (a <= 0) continue;
          if (mo.dot) D.fill(P, mo.p, GOLD.dark, { alpha: 0.7 * a });
          else { D.fill(P, mo.p, gold, { alpha: 0.75 * a }); if (detail > 380) D.stroke(P, mo.p, GOLD.dark, lw(0.8), { alpha: 0.6 * a }); }
        }
        for (const co of g.corners) {
          const ud = Math.min(co.u, 1 - co.u);
          const a = clamp((reach - ud) * 10);
          if (a <= 0) continue;
          D.fill(P, co.p, GOLD.light, { mode: 'over', alpha: a });
          D.fill(P, co.p, gold, { alpha: 0.55 * a });
          D.stroke(P, co.p, GOLD.dark, lw(0.9), { alpha: 0.7 * a });
          D.fill(P, co.c, GOLD.dark, { alpha: 0.6 * a });
        }
        g.meds.forEach((md, i) => {
          const a = i === 0 ? clamp(be * 6) : clamp((reach - 0.5 + 0.02) * 14);
          if (a <= 0) return;
          D.fill(P, md, GOLD.light, { mode: 'over', alpha: a });
          D.fill(P, md, gold, { alpha: 0.5 * a });
          D.stroke(P, md, GOLD.dark, lw(0.9), { alpha: 0.7 * a });
        });
      }
      // a soft gold glint travelling along the border while it draws
      if (be > 0.02 && be < 0.98) {
        const lp = g.loops[1], dd = lp.len * 0.5 * be;
        const pts = resampleLin(lp.pts, lp.len / 200);
        const idx = Math.min(pts.length - 1, Math.round((dd / lp.len) * (pts.length - 1)));
        for (const sx of [1, -1]) D.glow(sx * pts[idx][0], pts[idx][1], m * 0.05, '#FFE2A0', 0.5);
      }
      if (o.glow) D.fill(L.light, g.band, '#FFE2A0', { mode: 'light', alpha: 0.18 * o.glow * be, soft: m * 0.01, rule: 'evenodd' });
    }
    // ---- pencil edge ----
    D.pencil(sheetPath, 0.22, 1.0, { double: false });
    if (sheet && sheet.clipped) {
      E.restore(L);
      // flap (back of the paper), its shadow on the page
      D.glaze(flapShadow, '#8A8698', 0.3, m * 0.012);
      D.occlude(flap);
      D.over(flap, E.shade(paperC, -0.04));
      D.glaze(flap, D.lin(P, w / 2 - c, h / 2, w / 2 - c * 0.5, h / 2 - c * 0.5, [[0, '#D9CDB4', 0.7], [1, '#FFFFFF', 0]]));
      D.pencil(flap, 0.26, 1.0, { double: false });
    }
    end(L);
  };

  // =====================================================================================================
  // 4. REED PEN (kamış kalem)
  // =====================================================================================================
  function penGeom() {
    return memo('reedpen', () => {
      const g = {};
      const r = 30;
      // body: slight taper towards the back, two nodes
      const top = [], bot = [];
      for (let i = 0; i <= 40; i++) {
        const xx = lerp(176, 1000, i / 40);
        const bulge = 2.2 * (Math.exp(-Math.pow((xx - 470) / 12, 2)) + Math.exp(-Math.pow((xx - 790) / 12, 2)));
        const rr = r - (xx - 176) * 0.003 + bulge;
        top.push([xx, -rr]);
        bot.push([xx, rr]);
      }
      g.body = path(top.concat([[1003, -r * 0.6], [1004, 0], [1003, r * 0.6]], bot.slice().reverse()), true, 0.4);
      // nib: scooped cut on the upper side ending in a flat slanted tip
      g.nib = path([[180, -r], [140, -r + 2], [96, -r * 0.62], [52, -r * 0.3], [18, -9], [2, -5], [0, 3], [6, 10], [40, 16], [100, 24], [150, r * 0.98], [182, r]], true, 0.45);
      g.cut = path([[176, -r + 1], [132, -r * 0.7], [84, -r * 0.42], [40, -r * 0.18], [12, -5], [26, -1], [70, -6], [120, -12], [160, -18], [176, -20]], true, 0.5);
      g.hollow = path([[176, -24], [150, -21], [128, -16], [150, -12], [176, -11]], true, 0.5);
      g.slit = poly([[2, -0.5], [58, -4]], false);
      g.nodes = [poly([[470, -r - 1], [470, r + 1]], false), poly([[790, -r - 1], [790, r + 1]], false)];
      g.fibres = [path([[200, -8], [460, -9]], false), path([[480, 6], [780, 7]], false), path([[230, 15], [440, 16]], false), path([[800, -10], [990, -10]], false), path([[810, 12], [980, 13]], false)];
      g.end = ellipse(1000, 0, 5, r * 0.9);
      g.sil = [g.body, g.nib];
      g.hl = path([[196, -17], [460, -18], [480, -18], [780, -17], [800, -17], [985, -15]], false);
      g.ink = (k) => path([[0, 3], [2, -5], [18, -9], [52 * k, -r * 0.3 * Math.min(1, k * 1.2)], [56 * k, 4], [40 * k, 16 * Math.min(1, k * 1.3)], [6, 10]], true, 0.5);
      return g;
    });
  }

  PR.reedPen = (L, x, y, len, o = {}) => {
    if (!okS(len) || !okP(x, y)) return;
    const t = o.t || 0, glow = clamp(o.glow || 0), ink = clamp(o.ink || 0), n = clamp(o.night || 0);
    const ang = o.angle ?? -0.95;
    const g = penGeom();
    const D = begin(L, x, y, len / 1000, o.alpha ?? 1, ang);
    const P = L.paint;
    const C = { light: nt('#E2BE82', n), mid: nt('#C1904E', n), dark: nt('#7E5530', n), cut: nt('#F3E4C2', n) };
    // the pen is a cylinder: light along the upper edge in pen space. Keep the lit side towards screen-up.
    const up = Math.cos(ang) >= 0 ? -1 : 1; // pen-space y sign that points to screen-up
    if (up > 0) E.scale(L, 1, -1);
    for (const p of g.sil) D.occlude(p);
    if (glow > 0) {
      // a soft light along the pen from stacked strokes (no blur filter)
      const ln = poly([[0, 0], [1000, 0]], false);
      for (const [sw, sa, sc] of [[130, 0.05, '#FFD98C'], [96, 0.06, '#FFD98C'], [66, 0.07, '#FFE2A6'], [40, 0.09, '#FFEFC8'], [20, 0.12, '#FFEFC8']]) D.stroke(L.light, ln, sc, sw, { mode: 'light', alpha: sa * glow });
    }
    for (const p of g.sil) D.over(p, C.light);
    const cyl = D.lin(P, 0, -32, 0, 32, [[0, C.mid, 0.05], [0.35, C.mid, 0.25], [0.7, C.mid, 0.65], [1, C.dark, 0.8]]);
    for (const p of g.sil) D.fill(P, p, cyl);
    D.glaze(g.body, D.lin(P, 180, 0, 1000, 0, [[0, C.mid, 0.0], [1, C.mid, 0.25]]));
    // cut surface of the nib (pale) + hollow
    D.over(g.cut, C.cut);
    D.glaze(g.cut, D.lin(P, 0, 0, 176, 0, [[0, C.mid, 0.05], [1, C.mid, 0.35]]));
    D.glaze(g.hollow, C.dark, 0.7);
    // nodes, fibres, slit
    for (const nd of g.nodes) { D.stroke(P, nd, C.dark, 3.4, { alpha: 0.7 }); D.stroke(P, nd, C.dark, 12, { alpha: 0.18 }); }
    if (D.k * 1000 > 260) for (const f of g.fibres) D.stroke(P, f, C.dark, 1.6, { alpha: 0.35 });
    D.stroke(P, g.hl, '#ffffff', 5, { mode: 'over', alpha: 0.6 });
    D.glaze(g.end, C.dark, 0.6);
    // wet ink on the nib
    if (ink > 0) {
      const ip = g.ink(0.4 + ink * 1.2);
      D.fill(P, ip, '#2B2638', { alpha: 0.85 * Math.min(1, ink * 1.5) });
      D.lift(ellipse(22, -1, 6, 2.2, -0.15), 0.8 * ink);
    }
    D.stroke(P, g.slit, '#3A2A22', 1.8, { alpha: 0.8 });
    for (const p of g.sil) D.pencil(p, 0.38, 1.2, { seed: 21 });
    D.pencil(g.cut, 0.25, 1.0, { double: false });
    if (glow > 0) {
      const tw = 0.75 + 0.25 * Math.sin(t * 5.1);
      D.glow(2, 0, 70, '#FFF2CF', 0.65 * glow * tw);
      D.glow(2, 0, 22, '#FFFFFF', 0.8 * glow * tw);
      const sp = 60 * glow * tw;
      D.stroke(L.light, poly([[2 - sp, 0], [2 + sp, 0]], false), '#FFF6DE', 2.2, { mode: 'light', alpha: 0.8 * glow });
      D.stroke(L.light, poly([[2, -sp * 0.7], [2, sp * 0.7]], false), '#FFF6DE', 2.2, { mode: 'light', alpha: 0.8 * glow });
    }
    end(L);
  };

  // =====================================================================================================
  // 5. INK WRITE (calligraphic broad-nib line) + pseudo-script generator
  // =====================================================================================================
  /** draw one stroke polygon of a broad nib along evenly spaced pts, up to arc length `upto` */
  function nibStroke(D, ctx, pts, cum, upto, o) {
    const W = o.width, nib = o.nib, nv = [Math.cos(nib), Math.sin(nib)];
    const l = [], r = [];
    const tot = cum[cum.length - 1];
    let last = 0;
    for (let i = 0; i < pts.length; i++) {
      if (cum[i] > upto) break;
      last = i;
      const [tx, ty] = frameAt(pts, i);
      const th = Math.atan2(ty, tx);
      const s = Math.abs(Math.sin(th - nib));
      const ent = clamp(cum[i] / (W * 1.2)), ex = clamp((tot - cum[i]) / (W * 1.4));
      const pr = (0.55 + 0.45 * Math.sqrt(ent)) * (0.45 + 0.55 * Math.sqrt(ex)) * (0.92 + 0.08 * E.noise1(cum[i] * 0.05, o.seed));
      const half = (W * (0.14 + 0.86 * s) * pr) / 2, hair = W * 0.06;
      const nx = -ty, ny = tx;
      l.push([pts[i][0] + nv[0] * half + nx * hair, pts[i][1] + nv[1] * half + ny * hair]);
      r.push([pts[i][0] - nv[0] * half - nx * hair, pts[i][1] - nv[1] * half - ny * hair]);
    }
    if (l.length < 2) return null;
    const shape = poly(l.concat(r.reverse()));
    D.fill(ctx, shape, o.color, { mode: o.mode, alpha: o.alpha });
    return pts[last];
  }

  PR.inkWrite = (L, pts, p = 1, o = {}) => {
    if (!pts || !pts.length || !(p > 0) || !pts[0]) return;
    const strokes = (Array.isArray(pts[0][0]) ? pts : [pts]).map((st) => (st || []).filter((q2) => q2 && Number.isFinite(q2[0]) && Number.isFinite(q2[1])));
    const D = painter(L, scaleOf(L.paint));
    const opts = {
      width: clamp(fin(o.width, 6) || 6, 0.1, 1000), nib: fin(o.nib ?? 0.85, 0.85), seed: o.seed || 1, color: o.color || '#2C2838',
      alpha: clamp(fin(o.alpha ?? 0.92, 0.92)), mode: o.mode === 'over' ? 'over' : 'glaze',
    };
    const ctx = o.layer === 'ink' ? L.ink : L.paint;
    const step = Math.max(0.6, opts.width * 0.35);
    const rs = strokes.filter((s) => s && s.length).map((s) => {
      if (s.length === 1) return { pts: [s[0], [s[0][0] + 0.01, s[0][1]]], cum: [0, 0.01] };
      const r = resample(s, step);
      return { pts: r, cum: measure(r) };
    });
    const total = rs.reduce((a, s) => a + s.cum[s.cum.length - 1] + opts.width * 0.8, 0);
    let budget = clamp(p) * total;
    let head = null;
    for (const s of rs) {
      if (budget <= 0) break;
      const len = s.cum[s.cum.length - 1];
      const h = nibStroke(D, ctx, s.pts, s.cum, budget, opts);
      if (h) head = h;
      budget -= len + opts.width * 0.8;
    }
    // wet bead at the writing head
    if (head && p < 1 && o.bead !== false) {
      D.fill(ctx, circle(head[0], head[1], opts.width * 0.42), opts.color, { mode: opts.mode, alpha: opts.alpha });
    }
    const ig = clamp(o.glow || 0);
    if (ig > 0) D.stroke(L.light, join(rs.map((s) => poly(s.pts, false))), '#FFE2A8', opts.width * 2.5, { mode: 'light', alpha: 0.15 * ig * opts.alpha, soft: opts.width });
    return head;
  };

  /**
   * Abstract flowing handwriting: reads as lines of writing but contains NO letterforms (no alif-like tall strokes,
   * no dots, no Arabic letter shapes) — meaningless "letters" that look like a sacred word must never appear.
   * Returns an array of strokes (each an array of [x,y]) from x0 to x1 along baseline y0 (x0 > x1 writes right-to-left).
   */
  PR.scriptLine = (x0, y0, x1, o = {}) => {
    const size = q(Math.max(1, fin(o.size, 24)), 0.25), seed = o.seed || 1;
    x0 = q(fin(x0), 0.5); y0 = q(fin(y0), 0.5); x1 = q(fin(x1), 0.5);
    return memo(`script2:${x0}:${y0}:${x1}:${size}:${seed}`, () => {
      const r = E.rng(seed * 7919 + 13);
      const dir = Math.sign(x1 - x0) || -1, len = Math.abs(x1 - x0);
      const out = [];
      // low, rounded cursive waves only (all within ±0.3 of the x-height)
      const LET = {
        flat: [[0, 0], [0.42, 0.02]],
        wave: [[0, 0], [0.15, -0.2], [0.3, -0.05], [0.45, 0]],
        loop: [[0, 0], [0.1, -0.24], [0.24, -0.28], [0.27, -0.08], [0.14, 0.01], [0.36, 0]],
        hump: [[0, 0], [0.12, -0.17], [0.3, -0.19], [0.42, 0]],
      };
      const END = [
        [[0, 0], [0.25, 0.05], [0.5, 0.02], [0.68, -0.1]],
        [[0, 0], [0.2, -0.06], [0.42, -0.04], [0.55, 0.02]],
      ];
      let pos = r() * size * 0.3;
      while (pos < len - size * 1.3) {
        const ww = Math.min(len - pos - size * 0.95, size * (1.4 + r() * 2.8));
        const pts = [];
        let u = 0;
        const add = (shape) => {
          const w = shape[shape.length - 1][0];
          for (let k = pts.length ? 1 : 0; k < shape.length; k++) pts.push([x0 + dir * (pos + (u + shape[k][0]) * size), y0 + shape[k][1] * size]);
          u += w;
        };
        while ((u + 0.45) * size < ww) {
          const z = r();
          add(z < 0.34 ? LET.wave : z < 0.52 ? LET.flat : z < 0.74 ? LET.loop : LET.hump);
        }
        add(END[Math.floor(r() * END.length)]);
        out.push(pts);
        pos += u * size + size * (0.4 + r() * 0.35);
      }
      return out;
    });
  };

  // =====================================================================================================
  // 6. BOOK OF DEEDS
  // =====================================================================================================
  /** lobed oval (şemse-like) outline, radius 1, n lobes */
  const lobed = (nL, depth = 0.06) => memo(`lobed:${nL}:${depth}`, () => {
    const pts = [];
    for (let i = 0; i < nL * 10; i++) {
      const a = (i / (nL * 10)) * TAU;
      const k = 1 - depth + depth * Math.abs(Math.cos((a * nL) / 2));
      pts.push([Math.cos(a) * k, Math.sin(a) * k]);
    }
    return path(pts, true, 0.5);
  });

  function bookCover(D, L, w, h, col, litX, t, n) {
    const P = L.paint;
    const gC = { light: nt(GOLD.light, n), mid: nt(GOLD.mid, n), dark: nt(GOLD.dark, n) };
    const board = rrect(0, -h / 2, w, h, w * 0.025);
    D.occlude(board);
    D.over(board, col);
    D.glaze(board, D.lin(P, litX, -h / 2, w - litX, h / 2, [[0, E.shade(col, 0.25), 0], [0.5, E.shade(col, -0.3), 0.2], [1, E.shade(col, -0.5), 0.55]]));
    P.save(); P.clip(board);
    D.bloomG(w * 0.35, -h * 0.15, w * 0.3, E.shade(col, -0.3), 0.25, 3);
    D.ell(P, litX ? w * 0.72 : w * 0.28, -h * 0.28, w * 0.22, h * 0.12, E.shade(col, 0.22), 0.25, { mode: 'over', core: 0.2 });
    P.restore();
    // spine strip
    D.glaze(rrect(0, -h / 2, w * 0.055, h, w * 0.02), E.shade(col, -0.35), 0.5);
    D.stroke(P, poly([[w * 0.055, -h / 2 + 2], [w * 0.055, h / 2 - 2]], false), E.shade(col, -0.5), Math.max(1, w * 0.004), { alpha: 0.6 });
    const detail = w * D.k;
    // gold tooling: double border, şemse with pendants, corner pieces
    const lw = Math.max(1.2 / D.k, w * 0.007);
    const goldStroke = (p, wv, a = 1) => { D.stroke(P, p, gC.light, wv, { mode: 'over', alpha: a }); D.stroke(P, p, gC.mid, wv * 0.6, { alpha: 0.5 * a }); };
    goldStroke(rrect(w * 0.1, -h / 2 + w * 0.06, w * 0.84, h - w * 0.12, w * 0.01), lw);
    if (detail > 140) goldStroke(rrect(w * 0.125, -h / 2 + w * 0.085, w * 0.79, h - w * 0.17, w * 0.008), lw * 0.5);
    const cx = w * 0.525;
    const sem = place(lobed(16, 0.08), cx, 0, 0, w * 0.2, h * 0.17);
    const semIn = place(lobed(12, 0.1), cx, 0, 0, w * 0.13, h * 0.11);
    const pend = [-1, 1].map((sy) => place(lobed(8, 0.12), cx, sy * h * 0.235, 0, w * 0.05, h * 0.04));
    const stems = [-1, 1].map((sy) => poly([[cx, sy * h * 0.165], [cx, sy * h * 0.2]], false));
    for (const st of stems) goldStroke(st, lw * 1.2);
    for (const p of [sem, ...pend]) { D.over(p, gC.light); D.glaze(p, gC.mid, 0.55); D.stroke(P, p, gC.dark, lw * 0.5, { alpha: 0.7 }); }
    D.over(semIn, E.shade(col, -0.25));
    if (detail > 160) {
      D.stroke(P, semIn, gC.dark, lw * 0.4, { alpha: 0.5 });
      const ros = place(rosette(8, 0.4), cx, 0, 0, w * 0.06);
      D.over(ros, gC.light); D.glaze(ros, gC.mid, 0.5); D.stroke(P, ros, gC.dark, lw * 0.35, { alpha: 0.6 });
      // corner pieces (köşebent): quarter lobed discs in the corners of the inner border
      const x0 = w * 0.125, x1 = w * 0.915, y0 = -h / 2 + w * 0.085, y1 = h / 2 - w * 0.085;
      [[x0, y0, 0], [x1, y0, PI / 2], [x1, y1, PI], [x0, y1, -PI / 2]].forEach(([qx, qy, a]) => {
        const qp = new Path2D();
        const R = w * 0.13;
        qp.moveTo(qx, qy);
        for (let i = 0; i <= 24; i++) {
          const f = a + (i / 24) * (PI / 2);
          const k = 1 - 0.1 + 0.1 * Math.abs(Math.cos(((i / 24) * PI * 3)));
          qp.lineTo(qx + Math.cos(f) * R * k, qy + Math.sin(f) * R * k);
        }
        qp.closePath();
        D.over(qp, gC.light); D.glaze(qp, gC.mid, 0.55); D.stroke(P, qp, gC.dark, lw * 0.45, { alpha: 0.6 });
      });
    }
    D.pencil(board, 0.4, 1.2, { seed: 31 });
    // gold glints
    [[cx, -h * 0.17], [cx - w * 0.2, 0], [w * 0.13, -h / 2 + w * 0.09]].forEach(([gx, gy], i) => D.glow(gx, gy, w * 0.05, n ? '#C9D8FF' : '#FFE6A6', 0.25 + 0.35 * twinkle(t, i + 7)));
  }

  /** outline of a book page (panel space: gutter at X=gut, page towards +X), slight bow at top and bottom */
  function bookPagePath(w, h, mb, gut) {
    const x0 = gut, x1 = w - mb, y0 = -h / 2 + mb, y1 = h / 2 - mb;
    const bow = h * 0.008;
    const pg = new Path2D();
    pg.moveTo(x0, y0 + bow * 0.8);
    pg.quadraticCurveTo(lerp(x0, x1, 0.5), y0 - bow * 1.2, x1, y0);
    pg.lineTo(x1, y1);
    pg.quadraticCurveTo(lerp(x0, x1, 0.5), y1 + bow * 1.2, x0, y1 - bow * 0.8);
    pg.closePath();
    return pg;
  }

  /** page surface (panel space: gutter at X=0, page towards +X), returns the page path.
      o.rtl: wanted ON-SCREEN writing direction; the script is generated so that it reads correctly whatever
      mirroring the current transform carries (rtl mirror, cover panel seen from inside, turning leaf). */
  function bookPage(D, L, w, h, o) {
    const P = L.paint;
    const { mb, gut, seed, lines, first, n } = o;
    const Mt = P.getTransform();
    const mirrored = Mt.a * Mt.d - Mt.b * Mt.c < 0;
    const x0 = gut, x1 = w - mb, y0 = -h / 2 + mb, y1 = h / 2 - mb;
    const pg = bookPagePath(w, h, mb, gut);
    D.over(pg, nt('#FBF5E6', n * 0.6));
    // gutter shade + soft curvature
    D.glaze(pg, D.lin(P, x0, 0, x1, 0, [[0, '#B9A58A', 0.65], [0.08, '#D8C8AC', 0.35], [0.3, '#F0E6D2', 0.08], [0.85, '#FFFFFF', 0], [1, '#E2D4BA', 0.35]]));
    if (n) D.glaze(pg, NIGHT, 0.35 * n);
    // gold rules around the text block (cetvel)
    const tx = { x: x0 + (x1 - x0) * 0.14, y: y0 + h * 0.1, w: (x1 - x0) * 0.74, h: (y1 - y0) - h * 0.17 };
    const lw = Math.max(0.8 / D.k, w * 0.004);
    D.stroke(P, rrect(tx.x - w * 0.025, tx.y - w * 0.03, tx.w + w * 0.05, tx.h + w * 0.05, 1), GOLD.mid, lw * 1.4, { alpha: 0.85 });
    D.stroke(P, rrect(tx.x - w * 0.035, tx.y - w * 0.04, tx.w + w * 0.07, tx.h + w * 0.07, 1), GOLD.dark, lw * 0.6, { alpha: 0.5 });
    let ty0 = tx.y;
    if (first) {
      // illuminated headpiece (serlevha)
      const hh = tx.h * 0.15;
      const head = rrect(tx.x, tx.y, tx.w, hh, 2);
      D.over(head, GOLD.light, 0.9);
      D.glaze(head, GOLD.mid, 0.4);
      // pointed-arch crest with a palmette, rising from the headpiece (kept inside the top margin)
      const cw = Math.min(tx.w * 0.2, ((tx.y - y0) * 0.8) / 1.48), cxm = tx.x + tx.w / 2;
      const crest = poly([[cxm - cw, tx.y + 1]].concat(archPts(cw, cw * 0.6, tx.y + 1, 14).map(([ax2, ay2]) => [cxm + ax2, ay2]), [[cxm + cw, tx.y + 1]]));
      D.over(crest, GOLD.light, 0.9); D.glaze(crest, GOLD.mid, 0.45);
      D.stroke(P, head, GOLD.dark, lw * 0.7, { alpha: 0.7 }); D.stroke(P, crest, GOLD.dark, lw * 0.7, { alpha: 0.7 });
      const pal = place(PALMETTE.outline, cxm, tx.y - 1, 0, cw * 0.95);
      D.over(pal, '#2F4F7A', 0.85); D.stroke(P, pal, GOLD.dark, lw * 0.5, { alpha: 0.6 });
      // lapis cartouche with a few gold dots (no legible text)
      const cart = place(lobed(14, 0.1), cxm, tx.y + hh / 2, 0, tx.w * 0.3, hh * 0.32);
      D.over(cart, '#2F4F7A', 0.9);
      D.stroke(P, cart, GOLD.dark, lw * 0.6, { alpha: 0.7 });
      if (w * D.k > 160) {
        const dots = new Path2D();
        for (let i = -3; i <= 3; i++) { const dx2 = cxm + i * tx.w * 0.07, dy2 = tx.y + hh / 2 + (i % 2 ? -1 : 1) * hh * 0.06; dots.moveTo(dx2 + hh * 0.05, dy2); dots.arc(dx2, dy2, hh * 0.05, 0, TAU); }
        D.fill(P, dots, GOLD.light, { mode: 'over', alpha: 0.9 });
      }
      for (const sx2 of [-1, 1]) {
        const ro = place(rosette(8, 0.45), cxm + sx2 * tx.w * 0.4, tx.y + hh / 2, 0, hh * 0.28);
        D.over(ro, '#B4423A', 0.8); D.stroke(P, ro, GOLD.dark, lw * 0.5, { alpha: 0.6 });
      }
      ty0 = tx.y + hh * 1.35;
    }
    // written lines
    if (lines > 0 && w * D.k > 70) {
      const nL = first ? 8 : 10;
      const sp = (tx.y + tx.h - ty0) / nL;
      const sz = Math.max(sp * 0.42, 1);
      for (let i = 0; i < nL; i++) {
        const lp = clamp(lines * nL - i);
        if (lp <= 0) break;
        const yy = ty0 + sp * (i + 0.72);
        // local x0 > x1 writes right-to-left in local space; a mirrored transform flips that on screen
        const fromRight = (o.rtl !== false) !== mirrored;
        const st = fromRight ? PR.scriptLine(tx.x + tx.w, yy, tx.x, { size: sz, seed: seed * 31 + i })
          : PR.scriptLine(tx.x, yy, tx.x + tx.w, { size: sz, seed: seed * 31 + i });
        PR.inkWrite(L, st, lp, { width: sz * 0.28, color: nt('#2E2A3C', n * 0.5), seed: i + seed, bead: lp < 1 });
      }
    }
    D.pencil(pg, 0.18, 0.9, { double: false });
    return pg;
  }

  PR.book = (L, x, y, w, h, o = {}) => {
    if (!okS(w) || !okS(h) || !okP(x, y) || Math.min(w, h) * scaleOf(L.paint) < 0.5) return;
    const t = o.t || 0, glow = clamp(o.glow || 0), lines = clamp(o.pages ?? 0), pages2 = clamp(o.pages2 ?? 0), n = clamp(o.night || 0);
    const flip = clamp(fin(o.flip, 0), 0, 1000);
    const oe = E.ease.inOutCubic(clamp(o.open ?? 0));
    const rtl = o.rtl !== false;
    const col = nt(o.cover || '#8E4A50', n * 0.8);
    const th = h * 0.075;
    const mb = w * 0.03, gut = w * 0.012;
    const D = begin(L, x, y, 1, o.alpha ?? 1);
    if (rtl) E.scale(L, -1, 1);
    const P = L.paint;
    const sx = lerp(-w / 2, 0, oe); // spine x (local, before mirroring)
    const litX = rtl ? w : 0;
    const seed = o.seed || 1;
    const edge = (x0, x1, yTop, thick) => {
      // front edge of a block: board edge + page edges
      const band = rrect(Math.min(x0, x1), yTop, Math.abs(x1 - x0), thick, Math.min(4, thick * 0.3));
      D.occlude(band);
      D.over(band, '#EFE5CF');
      D.glaze(band, D.lin(P, 0, yTop, 0, yTop + thick, [[0, '#FFFFFF', 0], [1, '#BFAE90', 0.6]]));
      if (thick * D.k > 6) {
        const pl = new Path2D();
        for (let i = 1; i < 6; i++) { const yy = yTop + (thick * i) / 6.5; pl.moveTo(Math.min(x0, x1) + 3, yy); pl.lineTo(Math.max(x0, x1) - 3, yy); }
        D.stroke(P, pl, '#A8977C', Math.max(0.6 / D.k, 0.8), { alpha: 0.5 });
      }
      const bb = rrect(Math.min(x0, x1) - 2, yTop + thick - Math.max(2, h * 0.012), Math.abs(x1 - x0) + 4, Math.max(3, h * 0.016), 3);
      D.over(bb, E.shade(col, -0.25));
      D.pencil(band, 0.3, 1.0, { double: false });
    };
    // ground shadow
    if (o.shadow !== false) D.ell(P, 0, h * 0.5 + th, w * (0.68 + 0.6 * oe), h * 0.075, '#8E8A9C', 0.4, { core: 0.45 });
    // glow behind (light layer) when open, plus a warm aura painted on the paper
    if (glow > 0 && oe > 0.05) {
      D.ell(P, sx, -h * 0.05, w * 1.4, h * 0.85, '#F3D9A0', 0.3 * glow * oe, { core: 0.3 });
      D.glow(sx, -h * 0.05, w * 1.3, n ? '#FFD9A0' : '#FFE3AE', 0.45 * glow * oe);
      E.rays(L.light, sx, -h * 0.05, { n: 9, len: h * 1.4, spread: 1.4, angle: -PI / 2, width: 0.05, color: '#FFF0C8', a: 0.18 * glow * oe, t, seed: 3 });
    }
    // ---- spreads & leaf turning ----
    // flip = number of leaves turned (2.5 = two turned, the third half-way). Spread k = what lies open after k
    // turns. Spread 0 is written by `pages` (illuminated headpiece), the newest spread ceil(flip) by `pages2`,
    // spreads in between are fully written. Per spread the page nearer the reading start (the cover side) is
    // written first, then the facing page.
    const turned = Math.floor(flip), ff = flip - turned; // completed turns, current turn progress
    const newest = Math.ceil(flip - 1e-9);
    const W = (k) => (k === 0 ? lines : k === newest ? pages2 : 1);
    const pageOf = (k, coverSide) => ({ mb, gut, n, rtl, first: k === 0 && coverSide, seed: seed + 1 + k * 7 + (coverSide ? 3 : 0), lines: clamp(W(k) * 2 - (coverSide ? 0 : 1)) });
    const turning = ff > 0 && oe > 0.5;
    // ---- right block (stays): back board, page block, page ----
    const rb = rrect(sx, -h / 2, w, h, w * 0.025);
    D.occlude(rb);
    D.over(rb, E.shade(col, -0.15));
    edge(sx + 2, sx + w - mb * 0.5, h / 2 - mb * 0.6, th * (1 - 0.45 * oe));
    if (oe > 0.01) {
      E.save(L);
      E.translate(L, sx, 0);
      // under a turning leaf the next spread's page is already there
      bookPage(D, L, w, h, pageOf(turning ? turned + 1 : turned, false));
      if (turning) {
        // the lifting leaf casts a soft shadow on the page beneath, near the gutter
        const ph0 = PI * E.ease.inOutSine(ff), cf0 = Math.cos(ph0);
        if (cf0 > 0) D.glaze(rrect(gut, -h / 2 + mb, (w - mb) * cf0 + w * 0.14 * Math.sin(ph0), h - 2 * mb, 2), '#7E7488', 0.3 * Math.sin(ph0), w * 0.05);
      }
      E.restore(L);
    }
    // ---- rotating front cover (+ half the pages when seen from inside) ----
    const theta = PI * oe;
    const ca = Math.cos(theta), sa = Math.sin(theta);
    const panel = (draw) => {
      E.save(L);
      E.each(L, (c) => c.transform(ca, -0.08 * sa, 0, 1 + 0.04 * sa, sx, 0));
      draw();
      E.restore(L);
    };
    if (Math.abs(ca) < 0.08) {
      // cover nearly edge-on: show the board's thickness
      const bt = Math.max(w * 0.022, w * Math.abs(ca));
      const strip = poly([[sx, -h / 2], [sx + Math.sign(ca || 1) * bt, -h / 2 - 0.08 * sa * bt], [sx + Math.sign(ca || 1) * bt, h / 2 - 0.08 * sa * bt], [sx, h / 2]]);
      D.occlude(strip); D.over(strip, E.shade(col, -0.2)); D.pencil(strip, 0.3, 1, { double: false });
    } else if (ca > 0) {
      panel(() => bookCover(D, L, w, h, col, litX, t, n));
    } else {
      // left block lying open: edge band + board + page
      if (oe > 0.5) edge(sx - 2, sx - w + mb * 0.5, h / 2 - mb * 0.6, th * 0.45 * clamp((oe - 0.5) * 2));
      panel(() => {
        const lb = rrect(0, -h / 2, w, h, w * 0.025);
        D.occlude(lb);
        D.over(lb, E.shade(col, -0.1));
        // the cover-side page of the current spread (the turning leaf lands on it and covers it)
        bookPage(D, L, w, h, pageOf(turned, true));
      });
    }
    // ---- a leaf turning from the facing page over to the cover side: front = the page it carries away,
    //      back = the next spread's cover-side page (so the result is continuous at both ends) ----
    if (turning) {
      const ph = PI * E.ease.inOutSine(ff), cf = Math.cos(ph), sf = Math.sin(ph);
      E.save(L);
      E.each(L, (c) => c.transform(cf, -0.12 * sf, 0, 1 + 0.06 * sf, sx, -h * 0.02 * sf));
      const pw = w - mb;
      if (Math.abs(cf) > 0.02) {
        const pg = bookPagePath(w, h, mb, gut);
        D.occlude(pg);
        bookPage(D, L, w, h, cf > 0 ? pageOf(turned, false) : pageOf(turned + 1, true));
        // shading: the leaf darkens as it stands up, lighter towards its free edge
        D.glaze(pg, D.lin(P, gut, 0, pw, 0, [[0, '#8C7E78', 0.42 * sf], [0.6, '#B9AC9C', 0.2 * sf], [1, '#FFFFFF', 0]]));
      } else {
        const strip = poly([[gut, -h / 2 + mb], [gut + w * 0.012, -h / 2 + mb], [gut + w * 0.012, h / 2 - mb], [gut, h / 2 - mb]]);
        D.over(strip, '#E9DFC9');
      }
      E.restore(L);
    }
    // ---- light ----
    if (glow > 0 && oe > 0.3) {
      E.motes(L.light, { x: sx - w * 0.8, y: -h * 1.1, w: w * 1.6, h: h * 1.2, n: 18, t, seed: 5 + seed, color: '#FFE9B8', size: Math.max(1.5, w * 0.008), a: 0.7 * glow * oe, rise: h * 0.12 });
      D.fill(L.light, rrect(sx - w + mb, -h / 2 + mb, 2 * w - 2 * mb, h - 2 * mb, 4), '#FFE6B4', { mode: 'light', alpha: 0.12 * glow * oe, soft: w * 0.04 });
    }
    end(L);
  };

  // =====================================================================================================
  // 7. HEART-LIGHT
  // =====================================================================================================
  const bez = (p0, p1, p2, p3, n = 12, skipFirst = false) => {
    const out = [];
    for (let i = skipFirst ? 1 : 0; i <= n; i++) {
      const t = i / n, a = (1 - t) * (1 - t) * (1 - t), b = 3 * (1 - t) * (1 - t) * t, c = 3 * (1 - t) * t * t, d = t * t * t;
      out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
    }
    return out;
  };
  /** elegant heart outline points, half-width 100, centred (cusp at top) */
  const HEART = memo('heart', () => {
    const right = [
      ...bez([0, -50], [14, -88], [62, -104], [90, -74], 14),
      ...bez([90, -74], [114, -48], [100, -6], [70, 30], 14, true),
      ...bez([70, 30], [46, 58], [16, 80], [3, 92], 12, true),
    ];
    right.push([0, 95]);
    const left = right.slice(0, -1).reverse().map(([x, y]) => [-x, y]);
    const pts = right.concat(left.slice(0, -1));
    return { pts, path: path(pts, true, 0.5) };
  });

  const HEARTW = memo('heartW', () => {
    const P0 = HEART.pts;
    const sh = (sx, dx, dy, seed, amp) => E.wobblyShape(P0.map(([x, y]) => [x * sx + dx, y * sx + dy]), { seed, amp, freq: 0.045, step: 7 });
    return {
      wash: sh(1.0, 0, 0, 3, 1.4),
      // shadow side: everything to the lower right of a gently curved diagonal (light from the upper left)
      shadow: E.wobblyShape([[150, -150], [96, -84], [52, -28], [14, 12], [-36, 44], [-96, 76], [-170, 104], [-170, 220], [220, 220], [220, -150]], { seed: 5, amp: 4, freq: 0.03, step: 10 }),
      hi: E.wobblyShape([[-74, -50], [-70, -66], [-58, -78], [-40, -82], [-30, -76], [-44, -70], [-58, -58], [-66, -46]], { seed: 9, amp: 1.6, freq: 0.08, step: 5 }),
      hi2: E.blob(-40, -44, 30, { seed: 6, irr: 0.25, rx: 34, ry: 22, rot: -0.6 }),
      core: E.blob(-6, -12, 46, { seed: 13, irr: 0.28 }),
    };
  });

  function heartBody(D, L, o) {
    const P = L.paint;
    const { col, dark, glowA, opaque, light } = o;
    const hp = HEART.path, W = HEARTW;
    const blush = E.mix(E.mix(col, '#F2B6B6', 0.55), '#7A2F40', dark);
    const rose = E.mix(E.mix(col, '#D07C8C', 0.2), '#5A1F30', dark);
    const deep = E.mix(E.shade(col, -0.35), '#3E1726', dark);
    const lift = (1 - 0.8 * dark) * (o.refl ? 0.7 : 1);
    // watercolour aura: a soft wash of warm colour around the light (a glow painted on paper)
    if (glowA > 0 && !o.refl) {
      D.ell(P, 0, -4, 205, 195, E.mix('#F2B9B3', '#6E6A98', dark), 0.3 * glowA, { core: 0.3 });
      D.ell(P, 0, -4, 140, 134, E.mix('#F6C8B6', '#6E6A98', dark), 0.2 * glowA, { core: 0.35 });
    }
    if (opaque) D.lift(hp, 1);
    // light-layer halo (warm rose; dim and cold when dark)
    const gc = E.mix('#FFB0A8', '#6E6AA0', dark), gi = E.mix('#FFE7CF', '#8C86BC', dark);
    if (glowA > 0) {
      D.glow(0, -6, 300, gc, 0.55 * glowA * (1 - 0.6 * dark));
      D.glow(0, -10, 150, gi, 0.4 * glowA * (1 - 0.7 * dark));
    }
    // light first: one clean blush wash with a slightly irregular hard edge
    D.glaze(W.wash, blush, 0.72 * light);
    P.save();
    P.clip(hp);
    // the heart is lit FROM WITHIN: pigment thin at the core, deepening towards the edge
    D.glaze(hp, D.rad(P, -8, -14, 10, 120, [[0, rose, 0], [0.4, rose, 0.1], [0.75, rose, 0.36], [1, rose, 0.6]]), light);
    // a quiet shadow side (second glaze with a soft drying edge) — volume without a hard bevel
    D.fill(P, W.shadow, rose, { alpha: (0.2 + 0.4 * dark) * light });
    // pigment pooled along the edge of the wash (darker rim, strongest on the shadow side)
    const ea = (0.22 + 0.25 * dark) * light;
    D.stroke(P, hp, deep, 16, { alpha: ea * 0.45 });
    D.stroke(P, hp, deep, 7, { alpha: ea * 0.55 });
    P.save();
    P.clip(W.shadow);
    D.stroke(P, hp, deep, 10, { alpha: ea * 0.6 });
    P.restore();
    // wet-in-wet blooms
    D.bloomG(30, 40, 28, deep, 0.24 * light, 4);
    D.bloomG(-52, 12, 24, rose, 0.18 * light, 14);
    if (dark > 0) {
      D.bloomG(-30, 10, 50, '#3B2A44', 0.55 * dark, 8);
      D.bloomG(40, -40, 38, '#2E2440', 0.5 * dark, 9);
      D.glaze(hp, '#4A2A3E', 0.35 * dark);
    }
    // warm inner light: paper lifted at the core, a gamboge-peach glow glazed into it, a small bare-paper accent
    D.ell(P, -6, -12, 66, 62, '#FFFFFF', 0.62 * lift, { mode: 'over', core: 0.15 });
    D.ell(P, -6, -12, 62, 58, E.mix('#F6D49A', '#B28A9A', dark), 0.32 * (1 - dark) * light, { core: 0.2 });
    D.ell(P, -8, -14, 28, 26, '#FFFFFF', 0.45 * lift, { mode: 'over', core: 0.2 });
    D.ell(P, -40, -46, 34, 22, '#FFFFFF', 0.32 * lift, { mode: 'over', rot: -0.6, core: 0.3 });
    D.lift(W.hi, 0.4 * lift);
    P.restore();
    // inner light (screen) makes the core glow
    if (glowA > 0) {
      D.glow(-8, -14, 118, E.mix('#FFEBD0', '#8D88B8', dark), 0.55 * glowA * (1 - 0.7 * dark));
      D.glow(-8, -14, 46, E.mix('#FFF6E4', '#8D88B8', dark), 0.3 * glowA * (1 - 0.8 * dark));
    }
    return hp;
  }

  PR.heartLight = (L, x, y, r, o = {}) => {
    if (!okS(r) || !okP(x, y)) return;
    const t = o.t || 0, glow = clamp(o.glow ?? 0.8), dark = clamp(o.dark || 0), thorns = clamp(o.thorns || 0);
    const col = o.color || E.P.rose;
    const ph = (t * 0.8) % 1;
    const beat = 0.65 * Math.exp(-Math.pow((ph - 0.12) / 0.06, 2)) + 0.45 * Math.exp(-Math.pow((ph - 0.32) / 0.07, 2));
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.9);
    const sc = (r / 100) * (1 + (o.pulse ?? 1) * (0.028 * beat + 0.012 * breathe) * (1 - 0.6 * dark));
    const glowA = glow * (0.85 + 0.15 * beat);
    if (o.reflection) {
      // wavering reflection on water: painted once into scratch layers, then laid down in rippling slices
      const M = L.paint.getTransform();
      const k = scaleOf(L.paint) * sc;
      const sxS = M.a * x + M.c * y + M.e, syS = M.b * x + M.d * y + M.f;
      const half = Math.ceil(310 * k) + 4, size = half * 2;
      if (size < 6 || size > 40000) return;
      // scratch resolution is capped (very large reflections are painted at reduced resolution and scaled up)
      const f = Math.min(1, 2400 / size), ss = Math.ceil(size * f);
      const sp = scratch('hrP', ss, ss), sl = scratch('hrL', ss, ss), si = scratch('hrI', 8, 8);
      sp.ctx.fillStyle = '#ffffff';
      sp.ctx.fillRect(0, 0, ss, ss);
      const T = { paint: sp.ctx, ink: si.ctx, light: sl.ctx };
      for (const c of [sp.ctx, sl.ctx]) c.setTransform(k * f, 0, 0, (o.flip ? -k : k) * f, half * f, half * f);
      heartBody(painter(T, k * f), T, { col, dark, glowA: glowA * 0.8, opaque: false, light: 0.85, refl: true });
      const x0 = Math.round(sxS - half), y0 = Math.round(syS - half);
      const al = clamp(o.alpha ?? 1) * 0.8;
      // paint: only the heart's own rows/columns are sliced (3 px rows, rippled); the soft light layer goes in
      // coarse unrippled rows — the work stays proportional to the heart, not to its glow
      const cx0 = Math.max(0, Math.floor(half - 140 * k)), cw = Math.min(size - cx0, Math.ceil(280 * k));
      const ry0 = Math.max(0, Math.floor(half - 125 * k)), ry1 = Math.min(size, Math.ceil(half + 125 * k));
      for (const [ctx, src, mode, bh, a0, a1, xa, xw, ripple] of [[L.paint, sp.c, 'multiply', 3, ry0, ry1, cx0, cw, true], [L.light, sl.c, 'lighter', 12, 0, size, 0, size, false]]) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = mode;
        ctx.globalAlpha *= al;
        const ga = ctx.globalAlpha;
        for (let yy = a0; yy < a1; yy += bh) {
          const hgt = Math.min(bh, a1 - yy);
          const ry = (yy - half) / k;
          ctx.globalAlpha = ga * clamp(1.15 - 0.55 * (ry + 100) / 200, 0.3, 1);
          const dx = ripple ? (Math.sin(ry * 0.075 + t * 2.6) * 8 + Math.sin(ry * 0.021 - t * 1.4) * 4.5) * k * (0.6 + 0.4 * Math.abs(ry) / 100) : 0;
          ctx.drawImage(src, xa * f, yy * f, xw * f, hgt * f, x0 + xa + dx, y0 + yy, xw, hgt);
        }
        ctx.restore();
      }
      // a few ripple lines left as bare paper
      const D0 = begin(L, x, y, sc, (o.alpha ?? 1) * 0.8, 0);
      const rr = E.rng(17);
      for (let i = 0; i < 11; i++) {
        // short broken ripple glints (bare paper) with a darker water line under each, drifting sideways
        const yy = -80 + 175 * (i / 10) + (rr() - 0.5) * 10, ww = 12 + 30 * rr();
        const xx = (rr() - 0.5) * 170 + Math.sin(t * 0.7 + i * 1.9) * 12;
        const a = 0.45 * (1 - 0.5 * i / 10);
        D0.lift(ellipse(xx, yy, ww, 1.3), a);
        D0.glaze(ellipse(xx + ww * 0.3, yy + 4, ww * 0.9, 1.5), '#5E7FA6', 0.2);
      }
      end(L);
      return;
    }
    const D = begin(L, x, y, sc, o.alpha ?? 1, o.rot || 0);
    // occlude what was drawn behind first, so the heart's own halo and inner light stay intact
    if (o.opaque !== false) D.occlude(HEART.path);
    const hp = heartBody(D, L, { col, dark, glowA, opaque: o.opaque !== false, light: 1, t, refl: false });
    D.pencil(hp, 0.26 * (1 - 0.3 * dark) + 0.12 * dark, 1.1, { seed: 5 });
    if (glow > 0.4 && dark < 0.5) E.motes(L.light, { x: -150, y: -170, w: 300, h: 300, n: 8, t, seed: 4, color: '#FFE4DA', size: 2.2 / D.k * 1.5, a: (glow - 0.4) * (1 - dark * 2), rise: 30 });
    end(L);
    if (thorns > 0) PR.thorns(L, x, y, r * 1.12, { p: thorns, t, seed: o.seed || 3, alpha: o.alpha ?? 1, rot: o.rot || 0 });
  };

  // =====================================================================================================
  // 11. THORNS (dark thorny vines growing around a circle)
  // =====================================================================================================
  function thornGeom(seed, nV) {
    return memo(`thorns:${seed}:${nV}`, () => {
      const R = E.rng(seed * 97 + 5);
      const vines = [];
      for (let k = 0; k < nV; k++) {
        const dir = k % 2 ? -1 : 1;
        const a0 = PI / 2 + (k - (nV - 1) / 2) * 0.55 + (R() - 0.5) * 0.3;
        const sweep = PI * (1.15 + R() * 0.55);
        const ph = R() * TAU, fr = 1.2 + R() * 0.7;
        const thorns = [], leaves = [];
        const N = 90;
        const pts = [];
        for (let i = 0; i <= N; i++) {
          const u = i / N, th = a0 + dir * sweep * u;
          const rho = 100 * (0.98 + 0.25 * Math.sin(u * sweep * fr + ph) * (0.35 + 0.65 * u));
          pts.push([Math.cos(th) * rho, Math.sin(th) * rho, u]);
        }
        // curl the tip inward
        const last = pts[pts.length - 1], prev = pts[pts.length - 2];
        const tip = volute(last[0], last[1], Math.atan2(last[1] - prev[1], last[0] - prev[0]), 34, 0, -dir * 0.35, 2, 10);
        for (let i = 1; i < tip.length; i++) pts.push([tip[i][0], tip[i][1], 1]);
        const cum = measure(pts);
        const tot = cum[cum.length - 1];
        for (let d = 10 + R() * 6; d < tot - 4; d += 11 + R() * 7) {
          let i = 0;
          while (i < cum.length - 2 && cum[i + 1] < d) i++;
          thorns.push({ i, u: d / tot, side: R() < 0.5 ? 1 : -1, len: 8 + R() * 8, hook: 0.3 + R() * 0.5 });
        }
        for (let d = 30 + R() * 20; d < tot - 10; d += 40 + R() * 30) {
          let i = 0;
          while (i < cum.length - 2 && cum[i + 1] < d) i++;
          leaves.push({ i, u: d / tot, side: R() < 0.5 ? 1 : -1, len: 12 + R() * 8 });
        }
        vines.push({ pts, cum, tot, thorns, leaves, ph, fr, a0, dir, sweep, start: k * 0.1 });
      }
      return vines;
    });
  }

  PR.thorns = (L, cx, cy, r, o = {}) => {
    const p = clamp(o.p ?? 1);
    if (!okS(r) || !okP(cx, cy) || p <= 0) return;
    const t = o.t || 0, seed = o.seed || 3, nV = Math.round(clamp(fin(o.n, 3), 1, 12)), tight = clamp(o.tight || 0);
    const col = o.color || '#3A2430';
    const vines = thornGeom(seed, nV);
    const D = begin(L, cx, cy, r / 100, o.alpha ?? 1, o.rot || 0);
    const P = L.paint;
    const C = { dark: col, mid: E.mix(col, '#7A4A58', 0.45), back: E.mix(col, '#8E7E8E', 0.32) };
    const wid = clamp(fin(o.width ?? 1, 1), 0.05, 6) * 6.4;
    const draw = (front) => {
      for (const v of vines) {
        const vp = clamp((p - v.start) / (1 - v.start));
        if (vp <= 0) continue;
        const upto = vp * v.tot;
        // writhe gently with t and tighten
        const sq = 1 - 0.12 * tight;
        const pts = [];
        for (let i = 0; i < v.pts.length && v.cum[i] <= upto; i++) {
          const [px, py, u] = v.pts[i];
          const wob = 1 + 0.025 * Math.sin(t * 1.3 + u * 9 + v.ph) * u;
          pts.push([px * sq * wob, py * sq * wob]);
        }
        if (pts.length < 2) continue;
        // split into front (inside radius ~100) / back runs
        const isFront = (q) => Math.hypot(q[0], q[1]) < 101 * sq;
        let run = [pts[0]];
        const runs = [];
        for (let i = 1; i < pts.length; i++) {
          if (isFront(pts[i]) !== isFront(pts[i - 1])) { run.push(pts[i]); runs.push({ pts: run, front: isFront(pts[i - 1]), i0: i - run.length + 1 }); run = [pts[i]]; }
          else run.push(pts[i]);
        }
        runs.push({ pts: run, front: isFront(run[run.length - 1]), i0: pts.length - run.length });
        const n = pts.length;
        for (const rn of runs) {
          if (rn.front !== front || rn.pts.length < 2) continue;
          const shape = taper(rn.pts, (uu) => {
            const gi = (rn.i0 + uu * (rn.pts.length - 1)) / Math.max(1, n - 1);
            const gu = (gi * upto) / v.tot;
            return wid * (1 - 0.72 * gu) * (0.5 + 0.5 * clamp((n - 1 - (rn.i0 + uu * (rn.pts.length - 1))) / 6));
          });
          D.occlude(shape);
          D.over(shape, front ? C.dark : C.back, front ? 1 : 0.9);
          if (front) D.stroke(P, path(rn.pts, false), C.mid, wid * 0.3, { alpha: 0.6 });
          D.pencil(shape, front ? 0.35 : 0.2, 1.0, { double: false });
        }
        // thorns and leaves along the grown part
        const tp = new Path2D(), lp = new Path2D(), tpB = new Path2D();
        for (const th of v.thorns) {
          if (th.i >= n - 1) continue;
          const grow = clamp((n - 1 - th.i) / 5);
          const q = pts[th.i];
          if (isFront(q) !== front) continue;
          const [tx, ty, nx, ny] = frameAt(pts, th.i);
          const gu = th.u;
          const base = wid * (1 - 0.72 * gu) * 0.9, L1 = th.len * grow * (1 - 0.4 * gu);
          const tip = [q[0] + (nx * th.side + tx * th.hook) * L1, q[1] + (ny * th.side + ty * th.hook) * L1];
          const tri = [[q[0] - tx * base * 0.9, q[1] - ty * base * 0.9], tip, [q[0] + tx * base * 0.9, q[1] + ty * base * 0.9]];
          (front ? tp : tpB).addPath(poly(tri));
        }
        for (const lf of v.leaves) {
          if (lf.i >= n - 2 || !front) continue;
          const grow = clamp((n - 2 - lf.i) / 8);
          const q = pts[lf.i];
          if (!isFront(q)) continue;
          const [tx, ty, nx, ny] = frameAt(pts, lf.i);
          const L1 = lf.len * grow, ax = nx * lf.side * 0.8 + tx * 0.6, ay = ny * lf.side * 0.8 + ty * 0.6;
          const tip = [q[0] + ax * L1, q[1] + ay * L1], mid = [q[0] + ax * L1 * 0.5, q[1] + ay * L1 * 0.5];
          lp.addPath(path([q, [mid[0] - ay * L1 * 0.22, mid[1] + ax * L1 * 0.22], tip, [mid[0] + ay * L1 * 0.22, mid[1] - ax * L1 * 0.22]], true, 0.5));
        }
        D.occlude(front ? tp : tpB);
        D.fill(P, front ? tp : tpB, front ? C.dark : C.back, { mode: 'over', alpha: front ? 1 : 0.9 });
        if (front) { D.occlude(lp); D.fill(P, lp, E.mix(C.dark, '#2F3A2E', 0.4), { mode: 'over' }); D.pencil(lp, 0.25, 0.9, { double: false }); }
      }
    };
    draw(false);
    draw(true);
    end(L);
  };

  // =====================================================================================================
  // 8. NAKIŞ (gold tezhip arabesque + eight-fold star lattice blooming from a centre)
  // =====================================================================================================
  function nakisGeom(seed) {
    return memo('nakis:' + seed, () => {
      const R = E.rng(seed * 131 + 7);
      const els = [];
      // e: {path|stem, len (dash reveal; 0 = fade), d0, d1, fill: 'light'|'mid'|'dark'|'wash'|null, stroke, w, lod (min detail px), lattice}
      const add = (e) => { els.push(Object.assign({ w: 2, len: 0, fill: null, stroke: true, lod: 0 }, e)); };
      // centre rosette
      add({ path: place(STAR8, 0, 0, PI / 8, 120), len: 16 * 120 * 0.42, d0: 0, d1: 0.09, w: 2.6, fill: 'light' });
      add({ path: place(rosette(8, 0.4), 0, 0, 0, 66), len: 430, d0: 0.02, d1: 0.08, fill: 'mid', lod: 140 });
      add({ path: circle(0, 0, 15), d0: 0.03, d1: 0.06, fill: 'dark', stroke: false });
      // double ring with dots
      add({ path: circle(0, 0, 168), len: TAU * 168, d0: 0.07, d1: 0.15, w: 2.2 });
      add({ path: circle(0, 0, 186), len: TAU * 186, d0: 0.08, d1: 0.16, w: 1.4, lod: 200 });
      for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; add({ path: circle(Math.cos(a) * 177, Math.sin(a) * 177, 3.6), d0: 0.12 + (i % 6) * 0.004, d1: 0.16, fill: 'dark', stroke: false, lod: 260 }); }
      // eight-fold star-and-cross lattice (very fine, fades in radially, behind the arabesque)
      const sp = 250;
      for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
        const cx = i * sp, cy = j * sp, d = Math.hypot(cx, cy);
        if (d < 230 || d > 860) continue;
        const dd = d / 1000;
        add({ path: place(STAR8, cx, cy, 0, sp / 2), d0: dd * 0.8, d1: dd * 0.8 + 0.16, w: 1.1, lattice: true, fill: (i + j) % 2 ? null : 'wash', lod: 150 });
        add({ path: place(STAR8, cx, cy, PI / 8, sp * 0.15), d0: dd * 0.8 + 0.05, d1: dd * 0.8 + 0.18, w: 1, lattice: true, lod: 330 });
      }
      // arabesque: four rumi lyres (pairs of scrolls curling back toward their axis) around palmettes
      for (let k = 0; k < 4; k++) {
        const ax = (k * PI) / 2;
        for (const side of [-1, 1]) {
          const a = ax + side * 0.2;
          const sx = Math.cos(a) * 194, sy = Math.sin(a) * 194;
          const L1 = 610 + R() * 16;
          const pts = volute(sx, sy, ax + side * 0.62, L1, -side * 0.0011, -side * 0.052, 3, 80);
          const cum = measure(pts), tot = cum[cum.length - 1];
          const st = { pts, cum, tot };
          add({ stem: st, d0: 0.15, d1: 0.7, fill: 'light', w: 1.6 });
          // rumi leaves on the outer side, alternating small inner ones
          [[0.16, 1, 96], [0.3, -1, 60], [0.44, 1, 84], [0.58, -1, 52], [0.7, 1, 64]].forEach(([uu, o2, lenL], li) => {
            const idx = Math.round(uu * (pts.length - 1));
            const [tx, ty] = frameAt(pts, idx);
            const sL = side * o2;
            const ang = Math.atan2(ty, tx) + sL * 0.85;
            const leaf = place(RUMI, pts[idx][0], pts[idx][1], ang, lenL, sL * lenL);
            const dl = 0.15 + 0.55 * uu;
            add({ path: leaf, len: lenL * 2.5, d0: dl, d1: dl + 0.09, fill: 'light', w: 1.5, lod: li % 2 ? 300 : 160 });
          });
          const e = pts[pts.length - 1];
          add({ path: circle(e[0], e[1], 10), d0: 0.68, d1: 0.73, fill: 'mid', w: 1.4 });
        }
        // palmette inside the lyre, tulip at the lyre's root
        const c1 = [Math.cos(ax) * 360, Math.sin(ax) * 360];
        add({ path: place(PALMETTE.outline, c1[0], c1[1], ax + PI / 2, 190), len: 820, d0: 0.34, d1: 0.5, fill: 'light', w: 1.8 });
        add({ path: place(PALMETTE.veins, c1[0], c1[1], ax + PI / 2, 190), len: 400, d0: 0.44, d1: 0.56, w: 1.1, lod: 200 });
        add({ path: place(PALMETTE.inner, c1[0], c1[1], ax + PI / 2, 190), len: 300, d0: 0.42, d1: 0.54, fill: 'mid', w: 1.3, lod: 160 });
        add({ path: place(PALMETTE.calyx, c1[0], c1[1], ax + PI / 2, 190), len: 260, d0: 0.36, d1: 0.46, fill: 'light', w: 1.3, lod: 200 });
        add({ path: place(TULIP.outline, Math.cos(ax) * 214, Math.sin(ax) * 214, ax + PI / 2, 92), len: 300, d0: 0.16, d1: 0.26, fill: 'light', w: 1.5, lod: 160 });
        // diagonals: hatayi blossom and an outer tulip with two small leaves
        const dg = ax + PI / 4;
        const bl = [Math.cos(dg) * 430, Math.sin(dg) * 430];
        add({ path: place(rosette(6, 0.42), bl[0], bl[1], dg, 58), len: 360, d0: 0.4, d1: 0.5, fill: 'light', w: 1.6 });
        add({ path: place(rosette(6, 0.5), bl[0], bl[1], dg + PI / 6, 26), d0: 0.45, d1: 0.52, fill: 'mid', stroke: false, lod: 180 });
        const tu = [Math.cos(dg) * 700, Math.sin(dg) * 700];
        add({ path: place(TULIP.outline, tu[0], tu[1], dg + PI / 2, 150), len: 460, d0: 0.62, d1: 0.76, fill: 'light', w: 1.8 });
        add({ path: place(TULIP.inner, tu[0], tu[1], dg + PI / 2, 150), len: 250, d0: 0.68, d1: 0.78, fill: 'mid', w: 1.3, lod: 200 });
        const stem = poly([[Math.cos(dg) * 490, Math.sin(dg) * 490], [Math.cos(dg) * 700, Math.sin(dg) * 700]], false);
        add({ path: stem, len: 210, d0: 0.5, d1: 0.62, w: 1.8 });
        for (const sL of [-1, 1]) {
          const lp = [Math.cos(dg) * 600, Math.sin(dg) * 600];
          add({ path: place(RUMI, lp[0], lp[1], dg + sL * 0.9, 70, sL * 70), len: 175, d0: 0.56, d1: 0.66, fill: 'light', w: 1.4, lod: 240 });
        }
      }
      // medallion border: lobed ring, fine circle, radiating tığ hairlines
      add({ path: place(lobed(32, 0.05), 0, 0, 0, 880), len: TAU * 880, d0: 0.78, d1: 0.93, w: 2.2 });
      add({ path: circle(0, 0, 910), len: TAU * 910, d0: 0.82, d1: 0.95, w: 1.2, lod: 200 });
      for (let i = 0; i < 96; i++) {
        const a = (i / 96) * TAU, r1 = i % 2 ? 965 : 995;
        add({ path: poly([[Math.cos(a) * 920, Math.sin(a) * 920], [Math.cos(a) * r1, Math.sin(a) * r1]], false), len: r1 - 920, d0: 0.9 + (i % 8) * 0.004, d1: 0.98, w: 1, lod: 220 });
      }
      for (const e of els) e.full = e.stem ? taper(e.stem.pts, (u) => 8 * (1 - u) + 2.4) : e.path;
      // joined batches per LOD tier for the fully revealed state
      const tiers = [0, 140, 150, 160, 180, 200, 220, 240, 260, 300, 330];
      const batches = {};
      for (const tr of tiers) {
        const b = { s3: new Path2D(), s2: new Path2D(), s1: new Path2D(), lat: new Path2D(), light: new Path2D(), mid: new Path2D(), dark: new Path2D(), wash: new Path2D(), glow: new Path2D() };
        for (const e of els) {
          if (e.lod > tr) continue;
          if (e.stroke) (e.lattice ? b.lat : e.w >= 2.1 ? b.s3 : e.w >= 1.5 ? b.s2 : b.s1).addPath(e.full);
          if (e.fill) b[e.fill].addPath(e.full);
          if (e.stroke && !e.lattice) b.glow.addPath(e.full);
        }
        batches[tr] = b;
      }
      return { els, tiers, batches };
    });
  }

  PR.nakis = (L, x, y, r, o = {}) => {
    const rv = clamp(o.reveal ?? 1);
    if (!okS(r) || !okP(x, y) || rv <= 0) return;
    const t = o.t || 0, glow = clamp(o.glow ?? 0.6), seed = o.seed || 1;
    const g = nakisGeom(seed);
    if (o.clip) { E.save(L); E.each(L, (c) => c.clip(o.clip)); }
    const D = begin(L, x, y, r / 1000, o.alpha ?? 1, o.rot || 0);
    const P = L.paint;
    const base = o.color || GOLD.mid;
    const C = { line: E.mix(base, '#7A5224', 0.55), light: E.mix(base, '#F7E0A0', o.mode === 'glaze' ? 0.5 : 0.32), mid: base, dark: E.shade(base, -0.45), wash: E.mix(base, '#FFFFFF', 0.6) };
    const det = D.k * 1000; // on-screen radius in px
    const lw = (w) => Math.max(w * 0.6 / D.k, w * 1.15);
    const lattA = o.lattice ?? 1;
    // fills: semi-opaque gold so it stays warm on any ground (glaze would turn olive over blue/silver)
    const fmode = o.mode === 'glaze' ? 'glaze' : 'over';
    const mode = o.mode === 'glaze' ? 'glaze' : o.night ? 'over' : 'glaze';
    // the star lattice is a whisper behind the arabesque: warm gold hairlines (a brown glaze would go grey on silver)
    const latMode = fmode === 'over' ? 'over' : 'glaze', latCol = fmode === 'over' ? E.mix(base, '#6A4A26', 0.35) : C.line;
    const fillA = fmode === 'over' ? { light: 0.72, mid: 0.7, dark: 0.75, wash: 0.16 } : { light: 0.62, mid: 0.6, dark: 0.75, wash: 0.2 };
    let tier = 0;
    for (const tr of g.tiers) if (tr <= det) tier = tr;
    if (rv >= 0.999) {
      const b = g.batches[tier];
      for (const k of ['wash', 'light', 'mid', 'dark']) D.fill(P, b[k], C[k], { mode: fmode, alpha: fillA[k] * (k === 'wash' ? lattA : 1) });
      D.stroke(P, b.lat, latCol, lw(1.05), { mode: latMode, alpha: 0.4 * lattA });
      D.stroke(P, b.s1, C.line, lw(1.1), { mode, alpha: 0.8 });
      D.stroke(P, b.s2, C.line, lw(1.6), { mode, alpha: 0.85 });
      D.stroke(P, b.s3, C.line, lw(2.3), { mode, alpha: 0.9 });
    } else {
      for (const e of g.els) {
        if (e.lod > det) continue;
        const pr = clamp((rv - e.d0) / Math.max(0.01, e.d1 - e.d0));
        if (pr <= 0) continue;
        let p = e.full;
        if (e.stem && pr < 1) {
          const st = e.stem, upto = pr * st.tot, pts = [];
          for (let i = 0; i < st.pts.length && st.cum[i] <= upto; i++) pts.push(st.pts[i]);
          if (pts.length < 2) continue;
          const nn = pts.length;
          p = taper(pts, (u) => (8 * (1 - u * pr) + 2.4) * Math.min(1, (1 - u) * nn / 3 + 0.25));
        }
        const fade = e.len || e.stem ? 1 : E.ease.inOutSine(pr);
        if (e.fill) D.fill(P, p, C[e.fill], { mode: fmode, alpha: fillA[e.fill] * (e.lattice ? lattA : 1) * (e.stem ? 1 : E.ease.inQuad(pr)) * fade });
        if (e.stroke) {
          const w = e.lattice ? 1.05 : e.w >= 2.1 ? 2.3 : e.w >= 1.5 ? 1.6 : 1.1;
          D.stroke(P, p, e.lattice ? latCol : C.line, lw(w), { mode: e.lattice ? latMode : mode, alpha: (e.lattice ? 0.4 * lattA : 0.85) * fade, dash: e.len && pr < 1 ? [e.len * pr, e.len * 2] : null });
        }
      }
    }
    // light: soft gold glow along the lines + a shimmer travelling along them
    if (glow > 0 && det > 60) {
      const ga = glow * Math.min(1, rv * 1.4);
      L.light.save();
      if (rv < 1) { L.light.beginPath(); L.light.arc(0, 0, Math.max(1, rv * 1080), 0, TAU); L.light.clip(); }
      const gp = g.batches[tier].glow;
      D.stroke(L.light, gp, '#FFD48A', lw(10), { mode: 'light', alpha: 0.5 * ga, soft: 10 });
      D.stroke(L.light, gp, '#FFE9B8', lw(3), { mode: 'light', alpha: 0.3 * ga });
      D.stroke(L.light, gp, '#FFF6DC', lw(3.4), { mode: 'light', alpha: 0.75 * ga, dash: [90, 640], offset: -t * 300 });
      D.glow(0, 0, 600, '#FFDFA0', 0.35 * ga);
      L.light.restore();
    }
    end(L);
    if (o.clip) E.restore(L);
  };

  // =====================================================================================================
  // 9. RIBBON (feeling stream) + ribbonPath
  // =====================================================================================================
  PR.ribbonPath = (x0, y0, x1, y1, o = {}) => {
    const seed = o.seed || 1, curl = clamp(o.curl ?? 0.4, 0, 1.5), n = Math.round(clamp(fin(o.n, 90), 8, 2000)), amp = clamp(fin(o.amp ?? 0.18, 0.18), 0, 1);
    const r = E.rng(seed * 53 + 1);
    x0 = fin(x0); y0 = fin(y0); x1 = fin(x1, x0 + 1); y1 = fin(y1, y0);
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const ampC = amp * (1 + 0.8 * Math.min(curl, 0.35));
    const a1 = (r() < 0.5 ? -1 : 1) * ampC * (0.7 + 0.6 * r()), a2 = (r() - 0.5) * ampC * 0.9, ph2 = r() * TAU;
    const u0 = 0.42 + r() * 0.16, ls = r() < 0.5 ? -1 : 1;
    const B = (u) => {
      const env = Math.sin(PI * u);
      const off = len * (a1 * env + a2 * Math.sin(2 * PI * u + ph2) * env);
      return [x0 + ux * u * len + nx * off, y0 + uy * u * len + ny * off];
    };
    const pts = [];
    const nl = Math.round(n * u0);
    for (let i = 0; i <= nl; i++) pts.push(B((u0 * i) / nl));
    // a smooth loop tangent to the path at u0 (curl ≥ 0.12), slightly egg-shaped like a real gesture
    if (curl >= 0.35) {
      const p0 = B(u0), p1 = B(u0 + 0.002);
      let tx = p1[0] - p0[0], ty = p1[1] - p0[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      const sx = -ty * ls, sy = tx * ls;
      const R = len * (0.035 + 0.06 * Math.min(1.5, curl));
      const nn = Math.max(16, Math.round(n * 0.5));
      for (let i = 1; i < nn; i++) {
        const f = (i / nn) * TAU;
        const rr = R * (1 + 0.18 * Math.sin(f - 0.6));
        // circle starting at p0 heading along t, centred on the s side
        pts.push([p0[0] + (Math.sin(f) * tx + (1 - Math.cos(f)) * sx) * rr, p0[1] + (Math.sin(f) * ty + (1 - Math.cos(f)) * sy) * rr]);
      }
    }
    const nr = n - nl;
    for (let i = 1; i <= nr; i++) pts.push(B(u0 + ((1 - u0) * i) / nr));
    return pts;
  };

  PR.ribbon = (L, pts, o = {}) => {
    const p = clamp(o.p ?? 1);
    if (!pts || pts.length < 2 || p <= 0) return;
    const W = clamp(fin(o.width, 40) || 40, 0.5, 2000), col = o.color || E.P.rose, t = fin(o.t), twist = clamp(fin(o.twist ?? 1.4, 1.4), -50, 50), glow = clamp(o.glow || 0), seed = o.seed || 1;
    const A = clamp(fin(o.alpha ?? 1, 1));
    pts = pts.filter((q2) => q2 && Number.isFinite(q2[0]) && Number.isFinite(q2[1]));
    if (pts.length < 2 || !(W > 0)) return;
    const D = painter(L, scaleOf(L.paint));
    const P = L.paint;
    const c = resample(pts, Math.max(1.5, W * 0.1));
    if (c.length < 2) return;
    const cum = measure(c), tot = cum[cum.length - 1];
    if (!(tot >= 1)) return;
    const upto = p * tot;
    const ph = seed * 1.7 + t * (o.roll ?? 0.7);
    const Lf = [], Rt = [], C = [], side = [], half = [];
    for (let i = 0; i < c.length && cum[i] <= upto + 1e-6; i++) {
      const u = cum[i] / tot;
      const prof = 0.42 + 0.58 * Math.pow(Math.sin(PI * clamp(u)), 0.5);
      // head: a growing stream tapers to a full, brushy point; the finished end is rounded (not a leaf tip)
      const hd0 = clamp((upto - cum[i]) / (W * (p < 1 ? 0.9 : 0.3)));
      const head = p < 1 ? Math.pow(hd0, 0.45) : Math.sqrt(Math.max(0, 1 - (1 - hd0) * (1 - hd0)));
      const tail = Math.sqrt(clamp(cum[i] / (W * 0.9)));
      const tw = Math.cos(twist * TAU * u + ph);
      const wv = (W / 2) * prof * (0.42 + 0.58 * Math.pow(Math.abs(tw), 0.7)) * Math.max(head, 0.04) * (0.3 + 0.7 * tail);
      const [, , nx, ny] = frameAt(c, i);
      Lf.push([c[i][0] + nx * wv, c[i][1] + ny * wv]);
      Rt.push([c[i][0] - nx * wv, c[i][1] - ny * wv]);
      C.push(c[i]); side.push(tw >= 0 ? 1 : -1); half.push([nx * wv, ny * wv]);
    }
    const n = C.length;
    if (n < 2) return;
    const band = (i0, i1, f0, f1) => {
      const a = [], b = [];
      for (let i = i0; i <= i1; i++) { a.push([C[i][0] + half[i][0] * f0, C[i][1] + half[i][1] * f0]); b.push([C[i][0] + half[i][0] * f1, C[i][1] + half[i][1] * f1]); }
      return poly(a.concat(b.reverse()));
    };
    // runs of constant face (front/back) between twists
    const runs = [];
    let s0 = 0;
    for (let i = 1; i < n; i++) if (side[i] !== side[i - 1] || i === n - 1) { runs.push([s0, i, side[i - 1]]); s0 = i; }
    if (!runs.length) runs.push([0, n - 1, side[0]]);
    const back = E.shade(col, -0.32), dark = E.shade(col, -0.5);
    // 1) watery halo (whole ribbon, wide and soft)
    D.fill(P, band(0, n - 1, 1.35, -1.35), col, { alpha: 0.16 * A, soft: W * 0.18 });
    if (glow > 0) {
      D.stroke(L.light, poly(C, false), E.mix(col, '#FFFFFF', 0.5), W * 0.9, { mode: 'light', alpha: 0.28 * glow * A, soft: W * 0.3 });
    }
    // 2) body glazes per face, 3) shadow-edge glaze, 4) lighter core
    for (const [i0, i1, sd] of runs) {
      if (i1 <= i0) continue;
      const body = band(i0, i1, 1, -1);
      D.fill(P, body, sd > 0 ? col : back, { alpha: (sd > 0 ? 0.62 : 0.72) * A });
      D.fill(P, band(i0, i1, -0.15, -1), sd > 0 ? col : dark, { alpha: 0.32 * A });
      if (sd > 0) D.fill(P, band(i0, i1, 0.62, 0.18), '#FFFFFF', { mode: 'over', alpha: 0.4 * A });
      D.pencil(poly(Lf.slice(i0, i1 + 1), false), 0.16 * A, 1.0, { double: false });
    }
    // 5) streaks flowing along the ribbon
    const sp = W * 3;
    [[-0.55, 0.32], [0.1, 0.22], [0.5, 0.28]].forEach(([f, a], k) => {
      const line = C.map((q, i) => [q[0] + half[i][0] * f, q[1] + half[i][1] * f]);
      D.stroke(P, poly(line, false), dark, Math.max(0.8 / D.k, W * 0.035), { alpha: a * A, dash: [sp * (0.5 + 0.2 * k), sp * (0.35 + 0.15 * k)], offset: -t * W * 2.6 - k * W });
    });
    if (glow > 0) {
      D.stroke(L.light, poly(C, false), '#FFF6EA', Math.max(1, W * 0.12), { mode: 'light', alpha: 0.4 * glow * A, dash: [W * 1.4, W * 2.2], offset: -t * W * 2.6 });
      const hd = C[n - 1];
      if (p < 1) D.glow(hd[0], hd[1], W * 1.2, E.mix(col, '#FFFFFF', 0.6), 0.5 * glow * A);
    }
  };

  // =====================================================================================================
  // 10. LANTERN (hanging Ottoman lantern)
  // =====================================================================================================
  function lanternGeom() {
    return memo('lantern', () => {
      const g = {};
      g.dome = symPath([[-200, 234], [-210, 212], [-198, 178], [-160, 136], [-104, 102], [-50, 78], [-20, 62], [0, 48]], 0.45);
      g.domeRibs = [path([[-96, 228], [-100, 170], [-60, 108], [-14, 66]], false), path([[96, 228], [100, 170], [60, 108], [14, 66]], false), poly([[0, 228], [0, 58]], false)];
      g.knob = ellipse(0, 42, 13, 12);
      g.ring = circle(0, 16, 13);
      g.rimTop = rrect(-222, 228, 444, 28, 8);
      g.body = symPath([[-196, 598], [-210, 520], [-214, 400], [-210, 300], [-200, 256]]);
      const win = (x0, x1, y0, y1) => {
        const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2, sp = y0 + hw * 1.25;
        return path([[x0, y1], [x0, sp], [x0 + hw * 0.18, sp - hw * 0.62], [cx - hw * 0.4, y0 + hw * 0.22], [cx, y0], [cx + hw * 0.4, y0 + hw * 0.22], [x1 - hw * 0.18, sp - hw * 0.62], [x1, sp], [x1, y1]], true, 0.35);
      };
      g.wins = [win(-54, 54, 292, 568), win(-182, -104, 304, 560), win(104, 182, 304, 560)];
      g.posts = [poly([[-80, 262], [-80, 594]], false), poly([[80, 262], [80, 594]], false), poly([[-196, 268], [-200, 590]], false), poly([[196, 268], [200, 590]], false)];
      g.rimBot = rrect(-208, 594, 416, 26, 8);
      g.bottom = symPath([[-12, 832], [-30, 792], [-80, 742], [-150, 682], [-196, 622]]);
      g.beads = [circle(0, 848, 16), circle(0, 884, 11)];
      g.drop = path([[0, 894], [-13, 920], [-12, 954], [0, 1000], [12, 954], [13, 920]], true, 0.5);
      g.holes = [];
      for (let i = 0; i < 9; i++) { const a = -0.9 + (i / 8) * 1.8; g.holes.push([Math.sin(a) * 150, 200 - Math.cos(a) * 26]); }
      g.holes.push([0, 130], [-56, 138], [56, 138], [-28, 100], [28, 100]);
      g.sil = [g.dome, g.knob, g.rimTop, g.body, g.rimBot, g.bottom, ...g.beads, g.drop];
      g.bodyBot = [g.bottom, ...g.beads, g.drop];
      return g;
    });
  }

  PR.lantern = (L, x, y, s, o = {}) => {
    if (!okS(s) || !okP(x, y)) return;
    const t = o.t || 0, lit = clamp(o.lit ?? 1), n = clamp(o.night || 0), seed = o.seed || 1;
    const glass = o.color || '#D9914E';
    const chain = (o.chain ?? s * 0.5) / (s / 1000);
    const sway = (o.sway ?? 1) * (0.045 * Math.sin(t * 1.25 + seed * 1.7) + 0.015 * Math.sin(t * 2.3 + seed * 3.1));
    const g = lanternGeom();
    const D = begin(L, x, y, s / 1000, o.alpha ?? 1, sway);
    const P = L.paint;
    const M = { light: nt(GOLD.light, n * 0.7), mid: nt(GOLD.mid, n * 0.7), deep: nt(GOLD.deep, n * 0.7), dark: nt('#5E4128', n * 0.6) };
    // chain
    const chainP = poly([[0, 0], [0, chain]], false);
    D.stroke(P, chainP, M.dark, 4, { mode: 'over' });
    if (chain * D.k > 30) D.stroke(P, chainP, M.mid, 9, { alpha: 0.6, dash: [10, 8] });
    E.translate(L, 0, chain);
    // halo (light) first so the body occludes its centre
    if (lit > 0) {
      const fl = 0.92 + 0.08 * Math.sin(t * 7.3 + seed) * Math.sin(t * 3.1);
      D.glow(0, 430, 1150, '#FFD38A', 0.42 * lit * fl);
      D.glow(0, 430, 520, '#FFE6B8', 0.4 * lit * fl);
      D.ell(P, 0, 430, 640, 640, '#F4D49A', 0.22 * lit, { core: 0.25 });
    }
    for (const p of g.sil) D.occlude(p);
    // metal (brass) parts
    const brass = (p) => {
      D.over(p, M.light);
      D.fill(P, p, D.lin(P, -220, 0, 220, 0, [[0, M.mid, 0.15], [0.35, M.mid, 0.45], [0.75, M.deep, 0.6], [1, M.dark, 0.75]]));
    };
    brass(g.dome); brass(g.knob); brass(g.rimTop); brass(g.rimBot);
    for (const p of g.bodyBot) brass(p);
    D.stroke(P, g.ring, M.dark, 5, { mode: 'over' });
    if (D.k * 1000 > 160) for (const r of g.domeRibs) D.stroke(P, r, M.dark, 2.6, { alpha: 0.5 });
    // body: dark brass with glowing windows
    D.over(g.body, M.deep);
    D.fill(P, g.body, D.lin(P, -214, 0, 214, 0, [[0, M.mid, 0.1], [0.5, M.dark, 0.2], [1, M.dark, 0.6]]));
    const winCol = E.mix(nt(glass, n * 0.5), '#FFF4D0', 0.7 * lit);
    g.wins.forEach((w, i) => {
      D.over(w, winCol);
      D.fill(P, w, D.rad(P, i === 0 ? 0 : i === 1 ? -143 : 143, 470, 10, 200, [[0, glass, 0.05 + 0.15 * (1 - lit)], [1, E.shade(glass, -0.3), 0.6 - 0.3 * lit]]));
      if (i > 0) D.glaze(w, M.dark, 0.25); // side panes are turned away
      if (lit > 0) D.fill(L.light, w, '#FFE2A6', { mode: 'light', alpha: (i ? 0.45 : 0.75) * lit });
      if (lit < 0.6) D.lift(path([[i === 0 ? -34 : i === 1 ? -170 : 116, 520], [i === 0 ? -26 : i === 1 ? -164 : 122, 360], [i === 0 ? -16 : i === 1 ? -158 : 128, 360], [i === 0 ? -24 : i === 1 ? -164 : 122, 520]], true, 0.4), 0.45 * (1 - lit));
    });
    for (const p of g.posts) D.stroke(P, p, M.dark, 5, { alpha: 0.85 });
    // pierced holes in the dome
    const hp = new Path2D();
    for (const [hx, hy] of g.holes) { hp.moveTo(hx + 6, hy); hp.arc(hx, hy, 6, 0, TAU); }
    D.fill(P, hp, lit > 0.2 ? '#FFF0C8' : M.dark, { mode: 'over' });
    if (lit > 0) D.fill(L.light, hp, '#FFE9B0', { mode: 'light', alpha: 0.9 * lit, soft: 3 });
    // highlights + pencil
    D.stroke(P, path([[-180, 200], [-150, 150], [-90, 110], [-40, 82]], false), '#ffffff', 5, { mode: 'over', alpha: 0.5 });
    for (const p of g.sil) D.pencil(p, 0.34, 1.1, { seed: 41, double: false });
    // window light spill (inner glow) + a little warm light under the lantern
    if (lit > 0) {
      D.glow(0, 440, 160, '#FFF4DC', 0.55 * lit);
      D.glow(0, 900, 220, '#FFD99A', 0.18 * lit);
    }
    end(L);
  };

  // =====================================================================================================
  // 12. STONE (granite texture, speckle, cracks) — stone / stoneSpeckle / stoneOver / statue
  // =====================================================================================================
  const STONE = { base: '#BDB6AC', warm: '#B2A79B', cool: '#9EA2A8', fleck: '#6F6862', ink: '#34322F' };
  function stoneTiles(seed) {
    return memo('stoneTiles:' + seed, () => {
      const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
      const r = E.rng(seed * 17 + 3);
      // paint tile (multiply; white = no change): soft granite mottling + flecks
      const pt = mk(384, 384), pc = pt.getContext('2d');
      pc.fillStyle = '#ffffff'; pc.fillRect(0, 0, 384, 384);
      const wrap = (fn) => { for (const ox of [-384, 0, 384]) for (const oy of [-384, 0, 384]) fn(ox, oy); };
      for (let i = 0; i < 26; i++) {
        const x = r() * 384, y = r() * 384, rr = 30 + r() * 80, c = r() < 0.5 ? STONE.warm : STONE.cool, a = 0.18 + r() * 0.25;
        wrap((ox, oy) => {
          const g = pc.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rr);
          g.addColorStop(0, E.rgba(c, a)); g.addColorStop(1, E.rgba(c, 0));
          pc.fillStyle = g; pc.fillRect(x + ox - rr, y + oy - rr, rr * 2, rr * 2);
        });
      }
      for (let i = 0; i < 520; i++) {
        const x = r() * 384, y = r() * 384, rr = 0.5 + Math.pow(r(), 2) * 1.4, a = 0.12 + r() * 0.28;
        pc.fillStyle = E.rgba(r() < 0.7 ? STONE.fleck : '#8A8F96', a);
        wrap((ox, oy) => { pc.beginPath(); pc.arc(x + ox, y + oy, rr, 0, TAU); pc.fill(); });
      }
      // ink tile: graphite speckle (transparent background)
      const it = mk(256, 256), ic = it.getContext('2d');
      for (let i = 0; i < 900; i++) {
        const x = r() * 256, y = r() * 256, rr = 0.3 + Math.pow(r(), 4) * 1.15, a = 0.1 + r() * 0.38;
        ic.fillStyle = E.rgba(STONE.ink, a);
        for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { ic.beginPath(); ic.arc(x + ox, y + oy, rr, 0, TAU); ic.fill(); }
      }
      return { paint: pt, ink: it };
    });
  }
  /** branching crack polylines inside a rect (caller coords) */
  function cracks(x, y, w, h, seed, count) {
    x = q(x); y = q(y); w = q(w); h = q(h); count = Math.max(0, Math.min(40, Math.round(count)));
    return memo(`cracks:${x}:${y}:${w}:${h}:${seed}:${count}`, () => {
      const r = E.rng(seed * 29 + 11);
      const out = [];
      const sz = Math.min(w, h);
      const grow = (px, py, ang, len, depth) => {
        const pts = [[px, py]];
        const steps = 6 + Math.floor(r() * 6);
        for (let i = 0; i < steps; i++) {
          ang += (r() - 0.5) * 0.9;
          px += Math.cos(ang) * len / steps; py += Math.sin(ang) * len / steps;
          pts.push([px, py]);
          if (depth < 1 && r() < 0.12) grow(px, py, ang + (r() < 0.5 ? 0.7 : -0.7), len * 0.4, depth + 1);
        }
        out.push(pts);
      };
      for (let i = 0; i < count; i++) grow(x + r() * w, y + r() * h, r() * TAU, sz * (0.18 + r() * 0.25), 0);
      return out;
    });
  }
  function patternOn(ctx, canvas, ax, ay, scale = 1) {
    const pat = ctx.createPattern(canvas, 'repeat');
    if (pat && pat.setTransform) pat.setTransform(new DOMMatrix().translate(ax, ay).scale(scale));
    return pat;
  }

  /** speckle + cracks on L.ink only, inside rect ∩ opts.clip (Path2D, caller coords) */
  PR.stoneSpeckle = (L, x, y, w, h, o = {}) => {
    const p = clamp(o.p ?? 1);
    if (p <= 0 || !okS(w) || !okS(h) || !okP(x, y)) return;
    const seed = o.seed || 1, tiles = stoneTiles(seed);
    const D = painter(L, scaleOf(L.ink));
    const ink = L.ink;
    ink.save();
    if (o.clip) ink.clip(o.clip);
    ink.beginPath(); ink.rect(x, y, w, h); ink.clip();
    ink.globalAlpha *= p * 0.9;
    ink.fillStyle = patternOn(ink, tiles.ink, x, y, o.scale || 1);
    ink.fillRect(x, y, w, h);
    ink.restore();
    if (o.cracks !== false && o.cracks !== 0) {
      ink.save();
      if (o.clip) ink.clip(o.clip);
      const cr = cracks(x, y, w, h, seed, fin(o.cracks, 4));
      for (const c of cr) D.stroke(ink, path(c, false, 0.3), STONE.ink, Math.max(0.9, 1.3 / D.k), { mode: 'over', alpha: 0.55 * p });
      ink.restore();
    }
    if (o.washes) {
      L.paint.save();
      if (o.clip) L.paint.clip(o.clip);
      L.paint.globalCompositeOperation = 'multiply';
      L.paint.globalAlpha *= p;
      L.paint.fillStyle = patternOn(L.paint, tiles.paint, x, y, o.scale || 1);
      L.paint.fillRect(x, y, w, h);
      L.paint.restore();
    }
  };

  /**
   * Turn whatever `drawMask(M)` draws into stone: M = {paint, ink, light} scratch layers with the caller's transform;
   * everything painted into M.paint becomes the stone mask. opts: p, seed, cover, grow, bounds{x,y,w,h}, cracks, scale.
   */
  PR.stoneOver = (L, drawMask, o = {}) => {
    const p = clamp(o.p ?? 1);
    if (p <= 0 || typeof drawMask !== 'function') return;
    const seed = o.seed || 1, tiles = stoneTiles(seed), grow = clamp(o.grow ?? 1);
    const Mx = L.paint.getTransform();
    let bx = 0, by = 0, bw = E.W, bh = E.H;
    const B = o.bounds && okP(o.bounds.x, o.bounds.y) && okS(o.bounds.w) && okS(o.bounds.h) ? o.bounds : null;
    if (B) {
      const cs = [[B.x, B.y], [B.x + B.w, B.y], [B.x, B.y + B.h], [B.x + B.w, B.y + B.h]].map(([u, v]) => [Mx.a * u + Mx.c * v + Mx.e, Mx.b * u + Mx.d * v + Mx.f]);
      const x0 = Math.max(0, Math.floor(Math.min(...cs.map((c) => c[0])) - 4)), x1 = Math.min(E.W, Math.ceil(Math.max(...cs.map((c) => c[0])) + 4));
      const y0 = Math.max(0, Math.floor(Math.min(...cs.map((c) => c[1])) - 4)), y1 = Math.min(E.H, Math.ceil(Math.max(...cs.map((c) => c[1])) + 4));
      bx = x0; by = y0; bw = x1 - x0; bh = y1 - y0;
      if (bw <= 0 || bh <= 0) return;
    }
    const box = [bx, by, bw, bh];
    const mk = scratch('stMask', E.W, E.H, box), dm = scratch('stDummy', 8, 8);
    dm.ctx.save(); dm.ctx.beginPath(); dm.ctx.rect(0, 0, 0.001, 0.001); dm.ctx.clip();
    const ML = { paint: mk.ctx, ink: dm.ctx, light: dm.ctx };
    mk.ctx.setTransform(Mx); dm.ctx.setTransform(Mx);
    mk.ctx.save();
    mk.ctx.beginPath(); mk.ctx.rect(bx, by, bw, bh); mk.ctx.clip();
    mk.ctx.setTransform(Mx);
    drawMask(ML);
    mk.ctx.restore();
    dm.ctx.restore();
    mk.ctx.setTransform(1, 0, 0, 1, 0, 0);
    // creeping front (from the bottom of bounds upward)
    const front = (ctx) => {
      if (grow >= 1 || !B) return;
      const yF = B.y + B.h * (1 - grow), soft = B.h * 0.06;
      ctx.save();
      ctx.setTransform(Mx);
      ctx.globalCompositeOperation = 'destination-in';
      const g = ctx.createLinearGradient(0, yF - soft, 0, yF + soft);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = g;
      ctx.fillRect(B.x - B.w, B.y - B.h, B.w * 3, B.h * 3);
      ctx.restore();
    };
    const tex = scratch('stTex', E.W, E.H, box);
    const tc = tex.ctx;
    // paint: stone base (covers the colours) + granite mottling
    tc.save();
    tc.beginPath(); tc.rect(bx, by, bw, bh); tc.clip();
    tc.globalAlpha = clamp(o.cover ?? 0.82);
    tc.fillStyle = nt(o.color || STONE.base, clamp(o.night || 0));
    tc.fillRect(bx, by, bw, bh);
    tc.globalAlpha = 1;
    tc.globalCompositeOperation = 'multiply';
    tc.setTransform(Mx);
    const ax = B ? B.x : 0, ay = B ? B.y : 0;
    tc.fillStyle = patternOn(tc, tiles.paint, ax, ay, o.scale || 1);
    tc.fillRect(ax - 4000, ay - 4000, 8000, 8000);
    tc.restore();
    // volume from the silhouette: shadow side (lower right) glazed darker, lit edge (upper left) paler
    const shade = clamp(fin(o.shade, 0.5));
    if (shade > 0) {
      const d = Math.max(2, Math.min(bw, bh) * 0.035);
      const nn = clamp(o.night || 0);
      const red = Math.max(1, Math.min(4, d / 2.5)); // reduction factor
      const sw2 = Math.max(1, Math.ceil(bw / red)), sh2 = Math.max(1, Math.ceil(bh / red));
      const sh = scratch('stShade', sw2 + 2, sh2 + 2), sc2 = sh.ctx;
      const edgeOf = (sx2, sy2, col2) => {
        sc2.globalCompositeOperation = 'source-over';
        sc2.clearRect(0, 0, sw2 + 2, sh2 + 2);
        sc2.drawImage(mk.c, bx, by, bw, bh, 0, 0, sw2, sh2);
        sc2.globalCompositeOperation = 'destination-out';
        sc2.drawImage(mk.c, bx, by, bw, bh, sx2 / red, sy2 / red, sw2, sh2);
        sc2.globalCompositeOperation = 'source-in';
        sc2.fillStyle = col2;
        sc2.fillRect(0, 0, sw2, sh2);
        sc2.globalCompositeOperation = 'source-over';
      };
      // edges are computed at reduced resolution and scaled back up: the bilinear upscale is the soft blur
      // (a canvas blur filter over the whole box costs tens of ms in software rendering)
      const up = (alpha, mode) => { tc.save(); tc.globalCompositeOperation = mode; tc.globalAlpha = alpha; tc.imageSmoothingEnabled = true; tc.imageSmoothingQuality = 'high'; tc.drawImage(sh.c, 0, 0, sw2, sh2, bx, by, bw, bh); tc.restore(); };
      edgeOf(-d, -d * 0.35, nt('#5E5A62', nn));
      up(0.6 * shade, 'multiply');
      edgeOf(d * 0.6, d * 0.25, nt('#F4F0E8', nn * 0.6));
      up(0.4 * shade, 'source-over');
    }
    tc.globalCompositeOperation = 'destination-in';
    tc.drawImage(mk.c, bx, by, bw, bh, bx, by, bw, bh);
    tc.globalCompositeOperation = 'source-over';
    front(tc);
    const P = L.paint;
    P.save(); P.setTransform(1, 0, 0, 1, 0, 0);
    P.globalAlpha *= p;
    P.drawImage(tex.c, bx, by, bw, bh, bx, by, bw, bh);
    P.restore();
    // ink: graphite speckle + cracks
    const tex2 = scratch('stTex2', E.W, E.H, box);
    const t2 = tex2.ctx;
    t2.save();
    t2.beginPath(); t2.rect(bx, by, bw, bh); t2.clip();
    t2.setTransform(Mx);
    t2.fillStyle = patternOn(t2, tiles.ink, ax, ay, o.scale || 1);
    if (B) t2.fillRect(B.x, B.y, B.w, B.h); else { t2.setTransform(1, 0, 0, 1, 0, 0); t2.fillRect(0, 0, E.W, E.H); t2.setTransform(Mx); }
    if (B && o.cracks !== false && o.cracks !== 0) {
      const k = scaleOf(t2);
      for (const c of cracks(B.x, B.y, B.w, B.h, seed, fin(o.cracks, 5))) {
        t2.strokeStyle = E.rgba(STONE.ink, 0.6); t2.lineWidth = 1.3 / k; t2.lineJoin = 'round';
        t2.stroke(path(c, false, 0.3));
      }
    }
    t2.restore();
    t2.globalCompositeOperation = 'destination-in';
    t2.drawImage(mk.c, bx, by, bw, bh, bx, by, bw, bh);
    t2.globalCompositeOperation = 'source-over';
    front(t2);
    const I = L.ink;
    I.save(); I.setTransform(1, 0, 0, 1, 0, 0);
    I.globalAlpha *= p * 0.85;
    I.drawImage(tex2.c, bx, by, bw, bh, bx, by, bw, bh);
    I.restore();
  };

  /** stone texture inside a Path2D (caller coords) */
  PR.stone = (L, pth, o = {}) => {
    if (!pth) return;
    PR.stoneOver(L, (M) => { M.paint.fillStyle = '#000'; M.paint.fill(pth); }, o);
  };

  /** the man as a stone statue: draws E.man with manOpts, then turns him to stone (p 0..1, grow 0..1 from the feet up) */
  PR.statue = (L, man, o = {}) => {
    if (!man || !(man.h === undefined || okS(man.h)) || !okP(man.x, man.y)) return;
    const p = clamp(o.p ?? 1);
    const h = man.h || 600;
    E.man.draw(L, Object.assign({}, man, { desat: Math.max(man.desat || 0, 0.5 * p * clamp(o.grow ?? 1)) }));
    if (p <= 0) return;
    PR.stoneOver(L, (M) => E.man.draw(M, Object.assign({}, man, { outline: false })), {
      p, seed: o.seed || 2, grow: o.grow, cracks: o.cracks ?? 4, cover: o.cover ?? 0.85, color: o.color, night: o.night, shade: o.shade ?? 1,
      bounds: { x: man.x - h * 0.5, y: man.y - h * 1.06, w: h, h: h * 1.1 },
    });
  };

  // =====================================================================================================
  // 13. PEDESTAL (stone monument plinth)
  // =====================================================================================================
  PR.pedestal = (L, x, y, w, h, o = {}) => {
    if (!okS(w) || !okS(h) || !okP(x, y)) return;
    const n = clamp(o.night || 0), seed = o.seed || 4;
    const base = nt(o.color || '#D2CBC0', n);
    const D = begin(L, x, y, 1, o.alpha ?? 1);
    const P = L.paint;
    const dk = nt('#6F6A66', n), mid = nt('#A59D93', n);
    const parts = {
      top: rrect(-w / 2, -h * 0.025, w, h * 0.05, Math.min(w, h) * 0.01),
      cap: rrect(-w / 2, h * 0.02, w, h * 0.075, 2),
      cyma: path([[-w * 0.47, h * 0.093], [w * 0.47, h * 0.093], [w * 0.43, h * 0.12], [w * 0.41, h * 0.14], [-w * 0.41, h * 0.14], [-w * 0.43, h * 0.12]], true, 0.3),
      die: poly([[-w * 0.4, h * 0.135], [w * 0.4, h * 0.135], [w * 0.4, h * 0.8], [-w * 0.4, h * 0.8]]),
      torus: rrect(-w * 0.45, h * 0.795, w * 0.9, h * 0.06, h * 0.03),
      plinth: rrect(-w * 0.49, h * 0.85, w * 0.98, h * 0.15, 3),
    };
    const order = ['plinth', 'torus', 'die', 'cyma', 'cap', 'top'];
    if (o.shadow !== false) D.ell(P, w * 0.12, h, w * 0.8, h * 0.07, n ? '#2F3654' : '#8F8C9C', 0.42, { core: 0.5 });
    for (const k of order) D.occlude(parts[k]);
    const side = D.lin(P, -w / 2, 0, w / 2, 0, [[0, mid, 0.0], [0.45, mid, 0.12], [0.75, mid, 0.4], [1, dk, 0.55]]);
    for (const k of order) {
      const p = parts[k];
      D.over(p, k === 'top' ? E.shade(base, 0.45) : base);
      D.fill(P, p, side);
    }
    // shadow under the cap and under the cyma, bottom of the plinth
    D.fill(P, parts.die, D.lin(P, 0, h * 0.135, 0, h * 0.25, [[0, dk, 0.5], [1, dk, 0]]));
    D.fill(P, parts.cap, D.lin(P, 0, h * 0.02, 0, h * 0.095, [[0, dk, 0], [1, dk, 0.35]]));
    D.fill(P, parts.plinth, D.lin(P, 0, h * 0.85, 0, h, [[0, dk, 0.4], [0.3, dk, 0.05], [1, dk, 0.2]]));
    D.fill(P, parts.torus, D.lin(P, 0, h * 0.795, 0, h * 0.855, [[0, '#FFFFFF', 0], [0.4, '#FFFFFF', 0], [1, dk, 0.45]]));
    // recessed panel
    if (o.panel !== false) {
      const px0 = -w * 0.31, px1 = w * 0.31, py0 = h * 0.21, py1 = h * 0.73;
      const panel = poly([[px0, py0], [px1, py0], [px1, py1], [px0, py1]]);
      D.glaze(panel, mid, 0.25);
      const bv = Math.min(w, h) * 0.025;
      D.glaze(poly([[px0, py0], [px1, py0], [px1 - bv, py0 + bv], [px0 + bv, py0 + bv], [px0 + bv, py1 - bv], [px0, py1]]), dk, 0.45);
      D.lift(poly([[px1, py0], [px1, py1], [px0, py1], [px0 + bv, py1 - bv], [px1 - bv, py1 - bv], [px1 - bv, py0 + bv]]), 0.5);
      if (o.ornament) {
        const ro = place(rosette(8, 0.42), 0, (py0 + py1) / 2, 0, Math.min(px1 - px0, py1 - py0) * 0.22);
        D.glaze(ro, mid, 0.5); D.stroke(P, ro, dk, Math.max(1, w * 0.004), { alpha: 0.6 });
      }
      D.pencil(panel, 0.28, 1.0, { double: false });
    }
    // lit top edge
    D.stroke(P, poly([[-w / 2 + 4, h * 0.02], [w * 0.2, h * 0.02]], false), '#FFFFFF', Math.max(1.5, h * 0.006), { mode: 'over', alpha: 0.6 });
    // granite + speckle + a few cracks
    const sil = join(order.map((k) => parts[k]));
    PR.stoneSpeckle(L, -w / 2, -h * 0.03, w, h * 1.03, { clip: sil, seed, p: 0.8 * (o.texture ?? 1), cracks: o.cracks ?? 3, washes: true });
    for (const k of order) D.pencil(parts[k], 0.34, 1.15, { seed: 51, double: k === 'die' });
    end(L);
  };

  // =====================================================================================================
  // 14. CALLIGRAPHY FRAME (gold tezhip frame / rules for Arabic text)
  // =====================================================================================================
  PR.calligraphyFrame = (L, x, y, w, h, o = {}) => {
    const rv = clamp(o.reveal ?? 1);
    if (!okS(w) || !okS(h) || !okP(x, y) || rv <= 0) return;
    const t = o.t || 0, n = clamp(o.night || 0), glow = clamp(o.glow ?? (n ? 0.8 : 0.3));
    const style = o.style || 'cartouche';
    const base = o.color || (n ? '#E8C677' : GOLD.mid);
    const D = begin(L, x, y, 1, o.alpha ?? 1, o.rot || 0);
    const P = L.paint;
    const m = Math.min(w, h * 2.2);
    const night = n > 0.5;
    const lw = (f) => Math.max((night ? 1.6 : 0.9) / D.k, m * f); // hairlines thinner than ~1.6 px go grey on dark
    const mode = night ? 'over' : 'glaze';
    const C = { line: night ? E.mix(base, '#FFF0C0', 0.25) : E.mix(base, '#7A5224', 0.45), fill: night ? base : E.mix(base, '#F7E0A0', 0.45), dark: night ? E.shade(base, -0.25) : GOLD.dark };
    const ease = E.ease.inOutSine(rv);
    // glow is gathered into two paths and blurred ONCE at the end (one blur filter per rule/ornament was costly)
    const gStrokes = new Path2D(), gFills = new Path2D();
    let gW = 0;
    const strokeRev = (pts, wv, a = 0.92, prog = ease) => {
      const pth = poly(pts, false), len = measure(pts).pop();
      for (const sx of [1, -1]) {
        P.save(); P.scale(sx, 1);
        D.stroke(P, pth, C.line, wv, { mode, alpha: a, dash: prog < 1 ? [len * prog, len * 2] : null });
        P.restore();
        if (glow > 0) gStrokes.addPath(pth, new DOMMatrix().scale(sx, 1));
      }
      gW = Math.max(gW, wv);
    };
    const orn = (p, a) => {
      if (a <= 0) return;
      D.fill(P, p, C.fill, { mode: night ? 'over' : 'glaze', alpha: (night ? 0.95 : 0.7) * a });
      D.stroke(P, p, C.dark, lw(0.0018), { mode, alpha: 0.75 * a });
      if (glow > 0 && a > 0.5) gFills.addPath(p);
    };
    const hw = w / 2, hh = h / 2;
    if (style === 'rules') {
      // two horizontal rule groups (above / below) with a small medallion at the centre of each
      for (const sy of [-1, 1]) {
        const yy = sy * hh;
        strokeRev([[0, yy], [hw * 0.92, yy]], lw(0.006));
        strokeRev([[0, yy + sy * m * 0.018], [hw * 0.86, yy + sy * m * 0.018]], lw(0.0025), 0.8);
        const tipA = clamp((ease - 0.85) * 7);
        for (const sx of [-1, 1]) orn(place(RUMI, sx * hw * 0.92, yy, sx > 0 ? 0 : PI, m * 0.07, sy * m * 0.07 * (sx > 0 ? 1 : -1)), tipA);
        orn(place(lobed(12, 0.12), 0, yy + sy * m * 0.009, 0, m * 0.055, m * 0.032), clamp(ease * 5));
        orn(place(PALMETTE.outline, 0, yy - sy * m * 0.02, sy < 0 ? 0 : PI, m * 0.06), clamp(ease * 4 - 0.2));
      }
    } else {
      // cartouche: double frame with lobed ends, corner hatayi, crest palmettes top & bottom
      const ins = m * 0.035;
      const outer = [[0, -hh], [hw - m * 0.05, -hh], [hw, -hh + m * 0.05], [hw, hh - m * 0.05], [hw - m * 0.05, hh], [0, hh]];
      const inner = [[0, -hh + ins], [hw - ins - m * 0.03, -hh + ins], [hw - ins, -hh + ins + m * 0.03], [hw - ins, hh - ins - m * 0.03], [hw - ins - m * 0.03, hh - ins], [0, hh - ins]];
      // soft gold band between the rules
      const bandA = clamp(ease * 1.6 - 0.4);
      if (bandA > 0) {
        const band = new Path2D();
        band.addPath(poly(outer.concat(mirrorX(outer).reverse())));
        band.addPath(poly(inner.concat(mirrorX(inner).reverse())));
        if (night) {
          // gilded band: real gold coverage (a thin gold film over indigo turns olive-grey), lit by the light layer
          D.fill(P, band, E.mix(base, '#5E4320', 0.5), { mode: 'over', alpha: 0.85 * bandA, rule: 'evenodd' });
          D.fill(P, band, D.lin(P, 0, -hh, 0, hh, [[0, '#FFF0C0', 0.25], [0.5, '#FFF0C0', 0], [1, '#5A4020', 0.25]]), { mode: 'over', alpha: bandA, rule: 'evenodd' });
          D.fill(L.light, band, '#FFD98E', { mode: 'light', alpha: 0.07 * glow * bandA, rule: 'evenodd' });
        } else D.fill(P, band, C.fill, { alpha: 0.3 * bandA, rule: 'evenodd' });
      }
      strokeRev(outer, lw(0.005));
      strokeRev(inner, lw(0.0028), 0.85);
      if (m * D.k > 260) {
        const mid = [[0, -hh + ins / 2], [hw - ins / 2 - m * 0.04, -hh + ins / 2], [hw - ins / 2, -hh + ins / 2 + m * 0.04], [hw - ins / 2, hh - ins / 2 - m * 0.04], [hw - ins / 2 - m * 0.04, hh - ins / 2], [0, hh - ins / 2]];
        const pts = resampleLin(mid, m * 0.03), dots = new Path2D();
        pts.forEach((q2, i) => { if (i % 2 || i / pts.length > ease) return; for (const sx of [1, -1]) { dots.moveTo(sx * q2[0] + m * 0.004, q2[1]); dots.arc(sx * q2[0], q2[1], m * 0.004, 0, TAU); } });
        D.fill(P, dots, night ? E.shade(base, -0.45) : C.line, { mode, alpha: 0.7 });
      }
      // corner motifs appear when the rules reach them
      const reach = ease;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const a = clamp((reach - (sy < 0 ? 0.25 : 0.7)) * 6);
        orn(place(rosette(8, 0.4), sx * (hw - ins * 0.5), sy * (hh - ins * 0.5), 0, m * 0.026), a);
      }
      // side medallions
      for (const sx of [-1, 1]) orn(place(lobed(10, 0.14), sx * (hw - ins * 0.5), 0, 0, m * 0.022, m * 0.04), clamp((reach - 0.5) * 6));
      // crest palmettes (tepelik) above and below the centre
      orn(place(PALMETTE.outline, 0, -hh - m * 0.004, 0, m * 0.085), clamp(ease * 4));
      orn(place(PALMETTE.inner, 0, -hh - m * 0.004, 0, m * 0.085), clamp(ease * 4 - 0.3));
      orn(place(PALMETTE.outline, 0, hh + m * 0.004, PI, m * 0.07), clamp((reach - 0.85) * 7));
      // fine tığ hairlines above the top crest
      if (m * D.k > 300) {
        const ta = clamp((ease - 0.3) * 3);
        for (let i = -6; i <= 6; i++) {
          const a = -PI / 2 + i * 0.13, r0 = m * 0.1, r1 = m * (i % 2 ? 0.125 : 0.14);
          const ray = poly([[Math.cos(a) * r0, -hh - m * 0.02 + Math.sin(a) * r0 * 0.6], [Math.cos(a) * r1, -hh - m * 0.02 + Math.sin(a) * r1 * 0.6]], false);
          // at night hairlines live on the light layer (thin pale paint would be darkened by the edge pass)
          if (night) D.stroke(L.light, ray, '#FFE3A0', lw(0.0012), { mode: 'light', alpha: 0.55 * ta });
          else D.stroke(P, ray, C.line, lw(0.0012), { mode, alpha: 0.6 * ta });
        }
      }
    }
    // the gathered glow, revealed with the rules (they draw from the top centre / the centres outward)
    if (glow > 0 && gW > 0) {
      const Lt = L.light;
      Lt.save();
      if (rv < 1) {
        const cl = new Path2D(), rr = ease * (style === 'rules' ? hw * 1.08 : hw + h * 1.2);
        cl.arc(0, -hh, Math.max(0.01, rr), 0, TAU);
        if (style === 'rules') { cl.moveTo(rr, hh); cl.arc(0, hh, Math.max(0.01, rr), 0, TAU); }
        Lt.clip(cl);
      }
      D.stroke(Lt, gStrokes, '#FFDFA0', gW * 3, { mode: 'light', alpha: 0.25 * glow, soft: gW * 2 });
      D.fill(Lt, gFills, '#FFE3A8', { mode: 'light', alpha: 0.3 * glow, soft: m * 0.008 });
      Lt.restore();
    }
    // shimmer travelling along the frame
    if (glow > 0 && rv >= 1) {
      const sh = (t * 0.25) % 1;
      D.glow(lerp(-hw, hw, sh), -hh, m * 0.05, '#FFF0C8', 0.6 * glow * Math.sin(PI * sh));
      D.glow(lerp(hw, -hw, sh), hh, m * 0.05, '#FFF0C8', 0.6 * glow * Math.sin(PI * sh));
    }
    end(L);
  };
})();
