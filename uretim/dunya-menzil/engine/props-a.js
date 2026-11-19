/* =====================================================================================================================
   props-a.js — shared WORLD & NATURE props for Dünya Menzil (watercolour).  Registered on E.props (never overwritten
   by props-b). Read-only for scene authors: if something is missing, ask for it rather than copying code.

   CONVENTIONS (all props)
   - Every drawing prop has the form  E.props.name(L, x, y, size, opts)  with L = {paint, ink, light} (the scene's
     layers). It is a PURE function of its arguments: no state, no Math.random; the same call always paints the same
     pixels whatever was drawn before, at any t (negative and huge t are fine), any size, called any number of times.
   - Coordinates are in the CURRENT transform of the layers, so props follow E.camera / E.translate / E.scale.
     Sizes are in those same units. Line weights, blur radii and level of detail adapt to the on-screen size.
   - All opts are optional; numbers are clamped; invalid values (NaN, strings, null, objects) fall back to defaults.
     Unit-range opts ("0..1") are clamped to [0, 1]. *color opts accept '#rgb' / '#rrggbb' only (anything else = default).
   - opts.alpha (0..1, default 1) fades the whole prop. It is multiplied by L.paint.globalAlpha, so a scene's
     E.alpha(L, a) is honoured too (exactly once, also for the props a prop draws inside itself).
   - Layer state is restored even if a callback you pass (pond's reflect) throws.
   - Paint: transparent 'glaze' (multiply) washes for colour/volume, opaque 'over' only for solid silhouettes; under
     every opaque silhouette the ink + light layers are erased (occlusion), so draw back-to-front as usual.
     Pencil contours go to L.ink, glows to L.light. Layer state (transform, alpha, composite) is always restored.
   - Light comes from the upper-left (as in E.man). Colours are from the E.P family; *color opts take '#rrggbb'.
   - Cost (headless Chromium, per call, measured): bigWorld r=400 ≈ 65 ms (r=120 ≈ 17 ms), personalWorld r=300 ≈ 35 ms,
     archGate w=500 ≈ 30 ms, ground ≈ 40 ms, pond ≈ 25 ms, tree h=500 ≈ 20–26 ms, cloud ≈ 15 ms (night ≈ 30 ms), wheat/flower/sapling
     ≈ 8–10 ms, dropBloom r=250 ≈ 65 ms (r=900 ≈ 140 ms). Static geometry is cached by seed/kind; the cache never
     changes the result.

   ---------------------------------------------------------------------------------------------------------------
   1. bigWorld(L, x, y, r, opts)                                     THE WORLD — the decorated stopover (süslü menzil)
      (x, y) = CENTRE of the globe, r = globe radius. A round garden-globe floating on paper, seen slightly from above:
      meadows, patchwork fields, groves, cypresses, a winding river with lakes, little houses; on the TOP a caravanserai
      (han) with a pointed portal (taç kapı), domes, towers, striped awnings, flags and lantern strings. A road climbs the
      front-left face INTO the gate, re-emerges right of the han and runs down and round the back (a loop).
      Extent: globe ±r; the han rises to ≈ y − 1.56·r (crescent finial), flags to ≈ y − 1.4·r; soft aura to 1.5·r.
      opts:
        t          seconds (default 0): flags flutter, lanterns twinkle/sway, travellers walk, rotation if rotSpeed.
        rot        surface rotation offset, radians (default 0). The han stays on top; the surface turns under it.
                   At rot ≈ 0 the road enters the gate from the front; keep |rot| ≲ 0.6 if the road must read.
                   The back hemisphere is painted too, so any rotation looks complete.
        rotSpeed   radians / second added to rot × t (default 0; 0.03–0.08 = a gentle turn).
        decor      0..1 (default 1): decorations pop in with staggered soft springs as decor goes 0 → 1
                   (flags, awnings, lantern strings, lanterns lighting up, flower beds). Animate it over ~0.5–1 s.
        gateGlow   0..1 (default 0): warm light in the han gate (+ spill on the forecourt, glow on L.light).
        travellers 0..1 (default 0): visibility of tiny walking travellers (and camels) on the road. One walks into the
                   gate while another leaves on the far side around t ≈ 1.5–2.5 s. walk: speed multiplier (default 1).
        simple     true = reduced detail (background / small use); auto when r < 150 on screen unless simple:false.
        aura       0..1 (default 1): soft paper-white + warm halo around the globe (light layer glow too).
        shadow     0..1 (default 0): soft contact shadow on an imagined ground ≈ 1.3·r below the centre.
        alpha      0..1.
   bigWorldGate(x, y, r) -> [gx, gy]
      Screen point of the centre of the han's gate opening for a world drawn at (x, y, r): ≈ (x, y − 1.01·r).
      E.g. to put the gate at (540, 1010) with r = 400: draw the world at (540, 1010 + 1.01·400).

   2. personalWorld(L, x, y, r, opts)                                THE PERSONAL WORLD — a glass / soap-bubble globe
      (x, y) = CENTRE of the bubble, r = bubble radius. Translucent sphere (rim, iridescence, highlight window, faint
      reflection, pencil contour) with a tiny landscape inside. The sky inside is transparent (the background shows
      through, softened); the ground is opaque. Warm glow / halo reach ≈ 1.5·r.
      opts:
        t          seconds (default 0).
        kind       'home' (default, canonical for our man: house with door + chimney, one round tree, fenced garden plot,
                   path, grass) | 'sea' | 'city' | 'field' | 'orchard' (other people's worlds).
        glow       0..1 (default 0): inner warm glow, lit windows, halo around the bubble.
        life       0..1 (default 0): tiny inner motion — chimney smoke, birds, waves, boat bobbing, sway, a falling fruit.
        dissolve   0..1 (default 0): colours run downward as drips and wash out to bare paper (top first), leaves/petals
                   detach and drift down; at 1 only a faint ghost + faint glass remain.
        flicker    0..1 (default 0): unstable — the outline breaks and re-forms, jitter, transparency flutter (driven by t).
        mirror     0..1 (default 0): a silvery mirror sheen sweeps over the landscape from the upper-left (1 = full
                   mirror with diagonal gleams; the landscape stays faintly visible).
        doorOpen   0..1 (default 0): the house door swings open with warm light spilling onto the path ('home' only).
        night      0..1 (default 0): moonlit night inside (for the night shots): indigo sky with a crescent moon and
                   twinkling stars, moonlit landscape; lit windows (glow / doorOpen) stay warm.
        seed       integer ≥ 1 (default 1 = canonical design): small variations (tree, cloud, flowers, windows).
        alpha      0..1.
   personalWorldDoor(x, y, r) -> [dx, dy]
      Centre of the 'home' house doorway for a world drawn at (x, y, r): (x − 0.2·r, y + 0.026·r). (Ignores flicker jitter.)

   3. tree(L, x, y, h, opts)
      (x, y) = FOOT of the trunk (ground point), h = full height at growth 1 (crown width ≈ 0.7·h; cypress ≈ 0.25·h).
      opts: kind 'round' (default) | 'cypress' (servi) | 'fruit' | 'blossom';  t (sway);  sway (amplitude multiplier,
            default 1);  seed (default 1);  color (foliage, default per kind);  fruit 0..1 (ripeness/visibility; default 1
            for 'fruit', fruits only exist on 'fruit');  fruitColor (default pomegranate red '#D1453F');  growth 0..1
            (default 1: sapling → trunk extends, branches unfold, crown lobes bloom in);  leafFall 0..1 (autumn colour;
            clump by clump the crown breaks into single leaves that fall, the crown stays opaque and the branches show
            through the gaps, bare branches at 1; for 'blossom' pink petals fall);  shadow 0..1 (contact shadow, default
            1);  night 0..1 (default 0: moonlit palette for the night shots);  alpha.
   treeFruits(x, y, h, opts) -> [{x, y, r, ripe}]
      Screen positions/radii of the fruits of a 'fruit' tree drawn with the same arguments (incl. t, growth, sway,
      fruit, leafFall) — to lift fruits off as lights (s13). [] for other kinds. ripe 0..1 (0 = not visible).

   4. sapling(L, x, y, h, opts)
      (x, y) = SOIL point (top of the little mound), h = plant height at growth 1 (mound width ≈ 0.48·h).
      opts: t (sway);  growth 0..1 (default 1: 0 = seed sprout, 0.25 = cotyledons, 1 = three leaf pairs + bud);  seed;
            stake (bool, default false: a support stick with a tie — nursery look);  soil (bool, default true);  alpha.

   5. wheat(L, x, y, h, opts)
      (x, y) = BASE of the clump (ground point), h = stalk height. Clump width ≈ 0.065·h × count.
      opts: t (sway);  growth 0..1 (default 1: stalks rise green, ears fill from the bottom, ripen to gold);  count 1..14
            (default 5);  seed;  glow 0..1 (golden luminous ears: warm halo + L.light glow);  night 0..1;  alpha.

   6. flower(L, x, y, s, opts)
      (x, y) = FOOT of the stem, s = flower height (stem + blossom). With opts.stem === false: only the blossom, CENTRED at
      (x, y), blossom size ≈ 0.8·s.
      opts: kind 'tulip' (lale, default) | 'rose' | 'daisy' | 'carnation' (karanfil) | 'wild';  t (sway);  color (petals;
            default per kind);  bloom 0..1 (default 1: closed bud → open);  seed;  stem (bool, default true);  alpha.

   7. cloud(L, x, y, w, opts)
      (x, y) = middle of the cloud's flat UNDERSIDE, w = width. The cloud rises ≈ 0.45·w above y and ≈ 0.13·w below.
      Bare paper (lifted, so it works over any sky wash) with mostly lost wet edges and a few found edges on the cumulus
      head; a lavender-grey underside that fades softly at the bottom, with a hard drying edge inside.
      opts: seed (default 1);  t (slow morph);  tone 'day' (default) | 'dusk' (gold top, rose underside) | 'night'
            (moonlit body a little lighter than the night sky, dark underside, silver on the top edges only);  alpha.

   8. ground(L, y, opts)
      Full-width layered landscape from y (top of the farthest hills, ±~35 px) down to the bottom of the frame: pale far
      hills with a row of distant trees and cypresses, drifting mist, middle and near meadows with sunlit crests, a
      foreground band, sparse grass tufts and flower dots. Calm, low contrast (fine behind the subtitle band).
      Works in the current transform; spans x0..x1 (default −80 .. E.W + 80) and y .. bottom (default E.H + 120).
      opts: palette 'spring' (default) | 'garden' (lusher, more flowers) | 'dusk' | 'night';  seed;  t (grass sway, mist
            drift);  flowers 0..1 (density; default by palette);  trees 0..1 (distant trees, default 0.6);  x0, x1, bottom;
            alpha.

   9. archGate(L, x, y, w, h, opts)
      (x, y) = BASE CENTRE (threshold on the ground), w = width of the stone frame, h = height to the cornice (default
      1.75·w; aspect clamped 0.8..4). Palmette cresting rises ≈ 0.07·w above, the steps reach ±0.68·w.
      A tall pointed Ottoman arch in pale stone: tezhip band, spandrel rosettes, keystone medallion, muqarnas frieze,
      columns, wooden double doors. Behind them a luminous paradise garden seen in depth: golden sky, radiant light at a
      low horizon (no source shown), far hills and tree lines, a stream of light winding toward us, cypresses at middle
      distance, great trees framing the vista from the sides, flowers, rising motes.
      opts: open 0..1 (default 0: the doors swing away and reveal the garden);  glow 0..1 (default = open: light pouring
            out, spill on the ground, L.light glow + rays);  t (water shimmer, motes);  alpha.

   10. pond(L, x, y, w, h, opts)
      (x, y) = CENTRE of the water ellipse, w × h its size (default h = 0.28·w). Still water (far side reflects the sky,
      near side darker), glints, a grassy bank with a soft outer edge, stones, tufts and reeds with bulrush heads.
      opts: t;  tone 'day' (default) | 'gold' | 'night';  ripple 0..1 (thin broken rings spreading from rippleX/rippleY,
            default the centre; same coordinates as x, y);  bank 0..1 (default 1; also fades the reeds);  alpha;
            reflect(L): callback, called with all three layers clipped to the water and mirrored vertically about the
            water line y = lineY (default y). Draw the reflected things with their NORMAL scene coordinates (e.g. the
            same call you used above the water). The water then veils it (reflectVeil 0..1, default 0.3) and fades its
            ink/light. The callback's layers carry the pond's alpha (props honour it); E.wash/E.pencil ignore inherited
            globalAlpha, so fade those with the veil.

   11. dropBloom(L, x, y, r, opts)
      (x, y) = LANDING point (centre of the bloom), r = final bloom radius. p 0..0.3: a drop falls from fall px above
      (constant on-screen drop size); 0.3: impact with a small splash crown; 0.3..1: it blooms into a wet watercolour
      blossom (cauliflower edge, drying rim, soft dark core, backruns, granulation, satellite drops).
      opts: p 0..1 (default 1);  color (default E.P.nightIndigo);  seed;  fall (px, default min(2.6·r, 900));
            dropSize (px, default 9);  alpha. Large r (full-frame transitions) is supported.
   ===================================================================================================================== */
(function () {
  'use strict';
  const E = window.E;
  const PR = (E.props = E.props || {});
  const P = E.P;

  // =====================================================================================================
  //  small math / colour helpers
  // =====================================================================================================
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const sstep = (a, b, t) => { const x = seg(t, a, b); return x * x * (3 - 2 * x); };
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const outBack = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : E.ease.outBack(x));
  const outCubic = (x) => 1 - Math.pow(1 - clamp(x), 3);
  /** springy pop 0 -> 1 (soft overshoot) while v runs through [a, a + d] */
  const pop = (v, a, d = 0.22) => outBack(seg(v, a, a + d));
  const mixc = (a, b, t) => E.mix(a, b, clamp(t));
  const shade = E.shade;
  const rgba = E.rgba;
  const noise1 = E.noise1;
  const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const kindOf = (k, list, d) => (list.indexOf(k) >= 0 ? k : d);
  /** colour opts: '#rgb' / '#rrggbb' strings only; anything else (numbers, names, objects) falls back to d */
  const HEXC = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
  const colorOf = (v, d) => (typeof v === 'string' && HEXC.test(v.trim()) ? v.trim() : d);
  /** periodic fbm around a circle (angle a): closed outlines without a seam at angle 0 */
  const fbmC = (a, seed, f = 0.95, oct = 3) => {
    let v = 0, amp = 0.5, fr = f;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let o = 0; o < oct; o++) { v += amp * E.noise2(ca * fr + 13.7 * o, sa * fr - 5.3 * o, seed + o * 31); fr *= 2; amp *= 0.5; }
    return v;
  };
  /** moonlit night version of a pigment (n 0..1): desaturated, pulled toward night indigo (never black) */
  const nightC = (c, n) => (n > 0 ? E.mix(E.desat(c, 0.3 * n), '#2E3B68', clamp(0.52 * n)) : c);

  // =====================================================================================================
  //  geometry cache (pure: a key always maps to the same geometry, so call order never matters)
  // =====================================================================================================
  const CACHE = new Map();
  function memo(key, fn) {
    let v = CACHE.get(key);
    if (v === undefined) {
      v = fn();
      if (CACHE.size > 6000) CACHE.clear();
      CACHE.set(key, v);
    }
    return v;
  }
  /** tiny LRU for per-parameter geometry that changes when animated (e.g. a rotating globe surface) */
  function lru(size) {
    const m = new Map();
    return (key, fn) => {
      let v = m.get(key);
      if (v !== undefined) { m.delete(key); m.set(key, v); return v; }
      v = fn();
      m.set(key, v);
      if (m.size > size) m.delete(m.keys().next().value);
      return v;
    };
  }
  const q = (x, k = 100) => Math.round(x * k);

  // =====================================================================================================
  //  drawing kit. Every prop works in its own local units (e.g. "radius = 100"); K.s = device px per unit
  //  (taken from the paint transform, so it includes any scene camera), K.px = units per device px.
  //  All alpha is multiplied by K.a (= opts.alpha × the layer's inherited globalAlpha).
  // =====================================================================================================
  function devScale(ctx) { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; }
  function kit(L, alpha) {
    const s = devScale(L.paint);
    return { L, p: L.paint, k: L.ink, l: L.light, a: clamp(num(alpha, 1)) * clamp(num(L.paint.globalAlpha, 1)), s, px: 1 / s };
  }
  /** begin a prop: save all layers, translate to (x,y), scale local units → px. Returns the kit. */
  function begin(L, x, y, scale, alpha, rot) {
    E.save(L);
    E.translate(L, x, y);
    if (rot) E.rotate(L, rot);
    if (scale !== 1) E.scale(L, scale);
    const K = kit(L, alpha);
    // K.a now carries the inherited alpha: reset it so nested props (and engine helpers) do not apply it twice
    L.paint.globalAlpha = 1; L.ink.globalAlpha = 1; L.light.globalAlpha = 1;
    return K;
  }
  const end = (K) => E.restore(K.L);
  /** run a prop body between begin() and end(); end() always runs, so layer state never leaks (even if a
      user callback such as pond's reflect throws) */
  function drawProp(L, x, y, scale, alpha, body) {
    const K = begin(L, x, y, scale, alpha);
    try { if (K.a > 0.003) body(K); } finally { end(K); }
  }

  // Soft (wet) edges. ctx.filter = 'blur()' costs a full-canvas pass (~30 ms per call in Chromium's software
  // canvas, whatever the shape size), so soft edges use a blurred shadow instead: the shape is drawn far off-canvas
  // and only its shadow (offset back into place) lands on the layer. Cost is proportional to the shape's bounds.
  const SHOFF = 30000;
  function shadowDraw(c, path, color, blurPx, rule, strokeW) {
    const m = c.getTransform();
    const p2 = new Path2D();
    p2.addPath(path, new DOMMatrix([m.a, m.b, m.c, m.d, m.e - SHOFF, m.f]));
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.shadowColor = color;
    c.shadowBlur = blurPx * 2;
    c.shadowOffsetX = SHOFF;
    c.shadowOffsetY = 0;
    if (strokeW) {
      c.strokeStyle = '#000';
      c.lineWidth = strokeW * Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
      c.stroke(p2);
    } else {
      c.fillStyle = '#000';
      c.fill(p2, rule || 'nonzero');
    }
  }
  function fillP(K, path, style, a, o) {
    const al = clamp(a * K.a);
    if (al <= 0.003 || !path) return;
    const c = K.p;
    c.save();
    c.globalCompositeOperation = o && o.over ? 'source-over' : 'multiply';
    c.globalAlpha = al;
    const b = o && o.soft ? Math.min(32, o.soft * K.s) : 0;
    if (b > 0.35 && typeof style === 'string') {
      // a shadow under a non-source-over composite allocates a full-canvas layer unless clipped: clip to the bounds
      const bb = path._bb || K.box;
      if (bb && !(o && o.over)) {
        const r2 = devBox(c.getTransform(), bb, b * 3 + 2, c.canvas.width, c.canvas.height);
        if (!r2) { c.restore(); return; }
        const m = c.getTransform();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.beginPath(); c.rect(r2[0], r2[1], r2[2], r2[3]); c.clip();
        c.setTransform(m);
      }
      shadowDraw(c, path, style, b, o.rule);
    }
    else { c.fillStyle = style; c.fill(path, (o && o.rule) || 'nonzero'); }
    c.restore();
  }
  /** transparent multiply glaze */
  const glaze = (K, path, style, a = 1, soft = 0) => fillP(K, path, style, a, soft ? { soft } : null);
  /** opaque wash (hides what is behind) */
  const over = (K, path, style, a = 1, soft = 0) => fillP(K, path, style, a, { over: true, soft });
  /** give paper back (white) */
  const lift = (K, path, a = 1, soft = 0) => fillP(K, path, '#ffffff', a, { over: true, soft });
  /** erase ink + light under an opaque silhouette (occlusion of what was drawn before) */
  function occlude(K, path, a = 1, layers = 3) {
    const al = clamp(a * K.a);
    if (al <= 0.003) return;
    const ls = layers === 3 ? [K.k, K.l] : layers === 1 ? [K.k] : [K.l];
    for (const c of ls) {
      c.save();
      c.globalCompositeOperation = 'destination-out';
      c.globalAlpha = al;
      c.fillStyle = '#000';
      c.fill(path);
      c.restore();
    }
  }
  /** pencil line on the ink layer; w in DEVICE px (constant thickness at any scale) */
  function pen(K, path, w, a, o) {
    const al = clamp(a * K.a);
    if (al <= 0.003 || !path) return;
    const c = K.k;
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = (o && o.color) || P.ink;
    c.lineWidth = w * K.px;
    c.globalAlpha = al;
    if (o && o.dash) c.setLineDash(o.dash.map((d) => d * K.px));
    const pth = path instanceof Path2D ? path : E.smoothPath(path, !!(o && o.closed));
    c.stroke(pth);
    if (!o || o.double !== false) {
      const j = K.px * 0.9;
      c.translate(j * 0.8, -j * 0.55);
      c.globalAlpha = al * 0.38;
      c.lineWidth = w * 0.7 * K.px;
      c.stroke(pth);
    }
    c.restore();
  }
  /** soft additive glow on the light layer (local units) */
  function glow(K, x, y, r, color, a) {
    const al = clamp(a * K.a);
    if (al <= 0.003 || !(r > 0)) return;
    const c = K.l;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 1;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, al));
    g.addColorStop(0.32, rgba(color, al * 0.45));
    g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g;
    c.fillRect(x - r, y - r, 2 * r, 2 * r);
    c.restore();
  }
  /** stroke on the paint layer (coloured line, multiply or over) */
  function strokeP(K, path, color, w, a, o) {
    const al = clamp(a * K.a);
    if (al <= 0.003 || !path) return;
    const c = K.p;
    c.save();
    c.globalCompositeOperation = o && o.over ? 'source-over' : 'multiply';
    c.globalAlpha = al;
    c.strokeStyle = color;
    c.lineWidth = w;
    c.lineCap = (o && o.cap) || 'round';
    c.lineJoin = 'round';
    const pth = path instanceof Path2D ? path : E.smoothPath(path, false);
    const b = o && o.soft ? Math.min(40, o.soft * K.s) : 0;
    if (b > 0.35 && typeof color === 'string') shadowDraw(c, pth, color, b, null, w);
    else c.stroke(pth);
    c.restore();
  }
  const LG = (c, x0, y0, x1, y1, stops) => {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    for (const s of stops) g.addColorStop(clamp(s[0]), s[1]);
    return g;
  };
  const RG = (c, x, y, r0, r1, stops, fx, fy) => {
    const g = c.createRadialGradient(fx == null ? x : fx, fy == null ? y : fy, r0, x, y, Math.max(r1, r0 + 0.01));
    for (const s of stops) g.addColorStop(clamp(s[0]), s[1]);
    return g;
  };
  /** run fn with the paint (and optionally ink/light) layer clipped to path */
  function clipped(K, path, fn, all) {
    const ls = all ? [K.p, K.k, K.l] : [K.p];
    for (const c of ls) { c.save(); c.clip(path); }
    fn();
    for (const c of ls) c.restore();
  }
  /** glaze the crescent of `path` not covered by its copy shifted by (dx,dy) (and scaled sc about cx,cy):
      classic watercolour form shadow with a hard drying edge. box = [x, y, w, h] bounds of the shape. */
  function crescent(K, path, box, dx, dy, color, a, soft = 0, sc = 1, cx = 0, cy = 0) {
    const m = new DOMMatrix().translate(cx + dx, cy + dy).scale(sc).translate(-cx, -cy);
    const hole = new Path2D();
    const pad = Math.max(box[2], box[3]) * 0.5 + Math.abs(dx) + Math.abs(dy);
    hole.rect(box[0] - pad, box[1] - pad, box[2] + 2 * pad, box[3] + 2 * pad);
    hole.addPath(path, m);
    hole._bb = [box[0] - 2, box[1] - 2, box[2] + 4, box[3] + 4];
    K.p.save();
    K.p.clip(path);
    fillP(K, hole, color, a, { rule: 'evenodd', soft });
    K.p.restore();
  }
  /** shared scratch canvas (cleared on every use, so results never depend on call order) */
  let SCR = null;
  function scratchFor(c) {
    const w = Math.max(E.W, c.canvas.width), h = Math.max(E.H, c.canvas.height);
    if (!SCR || SCR.width < w || SCR.height < h) {
      SCR = document.createElement('canvas');
      SCR.width = w; SCR.height = h;
      SCR.cx = SCR.getContext('2d');
    }
    return SCR;
  }
  /** device-space bounding box of a local box under transform m (padded, clamped) */
  function devBox(m, box, pad, W, H) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [px, py] of [[box[0], box[1]], [box[0] + box[2], box[1]], [box[0], box[1] + box[3]], [box[0] + box[2], box[1] + box[3]]]) {
      const X = m.a * px + m.c * py + m.e, Y = m.b * px + m.d * py + m.f;
      x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
    }
    x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad));
    x1 = Math.min(W, Math.ceil(x1 + pad)); y1 = Math.min(H, Math.ceil(y1 + pad));
    return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null;
  }
  /** glaze (or over) `style` on (path minus cut). Works for unions of overlapping sub-paths, where an even-odd
      cut would cancel in the overlaps. box = local bounds of path. */
  function glazeMinus(K, path, cut, box, style, a, soft = 0, over2 = false) {
    const al = clamp(a * K.a);
    if (al <= 0.003) return;
    const c = K.p, S = scratchFor(c), x = S.cx;
    const m = c.getTransform();
    const blur = soft ? Math.min(42, soft * K.s) : 0;
    const bb = devBox(m, box, blur * 2 + 2, c.canvas.width, c.canvas.height);
    if (!bb) return;
    x.save();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(bb[0], bb[1], bb[2], bb[3]);
    x.beginPath(); x.rect(bb[0], bb[1], bb[2], bb[3]); x.clip();
    x.setTransform(m);
    x.globalCompositeOperation = 'source-over';
    const soft2 = blur > 0.35 && typeof style === 'string';
    x.save();
    if (soft2) shadowDraw(x, path, style, blur); else { x.fillStyle = style; x.fill(path); }
    x.restore();
    x.globalCompositeOperation = 'destination-out';
    x.save();
    if (blur > 0.35) shadowDraw(x, cut, '#000', blur); else { x.fillStyle = '#000'; x.fill(cut); }
    x.restore();
    x.restore();
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = over2 ? 'source-over' : 'multiply';
    c.globalAlpha = al;
    c.drawImage(S, bb[0], bb[1], bb[2], bb[3], bb[0], bb[1], bb[2], bb[3]);
    c.restore();
  }
  /** crescent() for shapes made of several overlapping sub-paths (tree crowns, cloud silhouettes) */
  function crescentU(K, path, box, dx, dy, color, a, soft = 0, over2 = false) {
    const cut = new Path2D();
    cut.addPath(path, new DOMMatrix().translate(dx, dy));
    K.p.save();
    K.p.clip(path);
    glazeMinus(K, path, cut, box, color, a, soft, over2);
    K.p.restore();
  }
  /** paths built here carry their local bounds (path._bb = [x, y, w, h]) so soft glazes can clip tightly */
  const withBB = (p, b) => { p._bb = b; return p; };
  function ptsBB(pts, pad = 0) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q2 of pts) { if (q2[0] < x0) x0 = q2[0]; if (q2[0] > x1) x1 = q2[0]; if (q2[1] < y0) y0 = q2[1]; if (q2[1] > y1) y1 = q2[1]; }
    const px = (x1 - x0) * pad + 0.5, py = (y1 - y0) * pad + 0.5;
    return [x0 - px, y0 - py, x1 - x0 + 2 * px, y1 - y0 + 2 * py];
  }
  const unionBB = (a, b) => (!a ? b : !b ? a : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0] + a[2], b[0] + b[2]) - Math.min(a[0], b[0]), Math.max(a[1] + a[3], b[1] + b[3]) - Math.min(a[1], b[1])]);
  /** a Path2D grouping several paths (keeps the union of their bounds) */
  function group(paths) {
    const g = new Path2D();
    let bb = null, ok = true;
    for (const q2 of paths) { if (!q2) continue; g.addPath(q2); if (q2._bb) bb = unionBB(bb, q2._bb); else ok = false; }
    if (ok && bb) g._bb = bb;
    return g;
  }
  const poly = (pts, closed = true) => {
    const p = new Path2D();
    pts.forEach((q2, i) => (i ? p.lineTo(q2[0], q2[1]) : p.moveTo(q2[0], q2[1])));
    if (closed) p.closePath();
    return withBB(p, ptsBB(pts));
  };
  const circle = (x, y, r) => { const p = new Path2D(); const rr = Math.max(0.001, r); p.arc(x, y, rr, 0, TAU); return withBB(p, [x - rr, y - rr, 2 * rr, 2 * rr]); };
  const ellipse = (x, y, rx, ry, rot = 0) => {
    const p = new Path2D(); const a = Math.max(0.001, rx), b = Math.max(0.001, ry);
    p.ellipse(x, y, a, b, rot, 0, TAU);
    const m = rot ? Math.max(a, b) : 0;
    return withBB(p, rot ? [x - m, y - m, 2 * m, 2 * m] : [x - a, y - b, 2 * a, 2 * b]);
  };
  const smooth = (pts, closed = true) => withBB(E.smoothPath(pts, closed), ptsBB(pts, 0.12));
  /** irregular round blob with bounds (like E.blob, but the noise is periodic around the outline, so there is no
      notch at 3 o'clock where E.blob's noise wraps) */
  function blobP(cx, cy, r, o = {}) {
    const irr = o.irr == null ? 0.12 : o.irr, n = o.n || 48, seed = o.seed == null ? 1 : o.seed;
    const ax = o.rx || r, ay = o.ry || r, rot = o.rot || 0;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const k = 1 + irr * (fbmC(a, seed, 0.95) * 1.15 + 0.3 * fbmC(a, seed + 9, 2.6, 2));
      const x = Math.cos(a) * ax * k, y = Math.sin(a) * ay * k;
      pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    const R = Math.max(ax, ay) * (1 + 1.5 * irr);
    return withBB(E.smoothPath(pts, true), [cx - R, cy - R, 2 * R, 2 * R]);
  }
  /** seeded irregular blob points (periodic noise) */
  function blobPts(cx, cy, rx, ry, seed, irr = 0.15, n = 36, rot = 0) {
    const pts = [];
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const k = 1 + irr * (fbmC(a, seed, 0.8) * 1.1 + 0.25 * fbmC(a, seed + 7, 2.8, 2));
      const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
      pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    return pts;
  }
  /** pointed (two-centred) arch outline: from bottom-left, up, over the apex, down to bottom-right */
  function archPts(cx, ys, hw, rise, yb, n = 10) {
    const Rr = (hw * hw + rise * rise) / (2 * hw);
    const cxl = cx - hw + Rr;
    const aEnd = Math.atan2(-rise, cx - cxl) + TAU;
    const left = [];
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (aEnd - Math.PI) * (i / n);
      left.push([cxl + Rr * Math.cos(a), ys + Rr * Math.sin(a)]);
    }
    const pts = [[cx - hw, yb]].concat(left);
    for (let i = n - 1; i >= 0; i--) pts.push([2 * cx - left[i][0], left[i][1]]);
    pts.push([cx + hw, yb]);
    return pts;
  }
  /** line width scale for a prop of on-screen size `sizePx` (lines thicken gently with size) */
  const lineK = (sizePx) => clamp(Math.pow(Math.max(1, sizePx) / 320, 0.33), 0.55, 1.6);

  // =====================================================================================================
  //  SPHERE PROJECTION (big world). Globe frame: X right, Y north, Z toward the viewer at lon 0.
  //  The globe is seen from slightly above (TILT), so the han at the north pole sits ON the top.
  // =====================================================================================================
  const TILT = 0.3, cT = Math.cos(TILT), sT = Math.sin(TILT);
  const LDIR = norm3([-0.55, 0.62, 0.58]);
  /** screen point (unit disc, y down) at rot = 0 → unit vector on the globe */
  function fromScreen(sx, sy) {
    let X = sx, Yv = -sy;
    const l = Math.hypot(X, Yv);
    if (l > 0.999) { X *= 0.999 / l; Yv *= 0.999 / l; }
    const Zv = Math.sqrt(Math.max(0, 1 - X * X - Yv * Yv));
    return norm3([X, Yv * cT + Zv * sT, -Yv * sT + Zv * cT]);
  }
  const fromLL = (lat, lon) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
  const toLL = (v) => [Math.asin(clamp(v[1], -1, 1)), Math.atan2(v[0], v[2])];
  function toView(v, cr, sr) {
    const x = v[0] * cr + v[2] * sr, z = -v[0] * sr + v[2] * cr, y = v[1];
    return [x, y * cT - z * sT, y * sT + z * cT];
  }
  /** project unit vectors to the R=100 disc; hidden points are pushed onto the limb. Returns null if none visible */
  function projPts(vs, cr, sr, R = 100) {
    const out = new Array(vs.length);
    let vis = false;
    for (let i = 0; i < vs.length; i++) {
      const w = toView(vs[i], cr, sr);
      let x = w[0], y = w[1];
      if (w[2] < 0) { const l = Math.hypot(x, y) || 1; x /= l; y /= l; } else vis = true;
      out[i] = [x * R, -y * R];
    }
    return vis ? out : null;
  }
  /** densify a screen-space polyline/polygon, then lift it onto the globe */
  function scrToSph(pts, closed = true, step = 0.025) {
    const d = E.subdivide(pts, step, closed);
    return d.map((p) => fromScreen(p[0], p[1]));
  }
  /** points around a centre on the sphere (lat/lon radians), radii in radians of arc */
  function llBlob(c, rx, ry, seed, irr = 0.18, n = 32, rot = 0) {
    const up = [0, 1, 0];
    let e1 = cross3(up, c);
    if (Math.hypot(e1[0], e1[1], e1[2]) < 1e-6) e1 = [1, 0, 0];
    e1 = norm3(e1);
    const e2 = cross3(c, e1);
    return blobPts(0, 0, rx, ry, seed, irr, n, rot).map((p) => norm3([c[0] + e1[0] * p[0] + e2[0] * p[1], c[1] + e1[1] * p[0] + e2[1] * p[1], c[2] + e1[2] * p[0] + e2[2] * p[1]]));
  }
  /** ribbon (left/right boundary unit vectors) along a centreline of unit vectors */
  function ribbon(cl, w) {
    const L2 = [], R2 = [];
    for (let i = 0; i < cl.length; i++) {
      const a = cl[Math.max(0, i - 1)], b = cl[Math.min(cl.length - 1, i + 1)];
      const t = norm3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
      const s = norm3(cross3(t, cl[i]));
      const v = cl[i];
      L2.push(norm3([v[0] + s[0] * w / 2, v[1] + s[1] * w / 2, v[2] + s[2] * w / 2]));
      R2.push(norm3([v[0] - s[0] * w / 2, v[1] - s[1] * w / 2, v[2] - s[2] * w / 2]));
    }
    return { L: L2, R: R2 };
  }
  /** slerp-ish densify of a polyline of unit vectors (max step in radians) */
  function densify3(vs, step = 0.04, closed = false) {
    const out = [];
    const n = vs.length, lim = closed ? n : n - 1;
    for (let i = 0; i < lim; i++) {
      const a = vs[i], b = vs[(i + 1) % n];
      const ang = Math.acos(clamp(dot3(a, b), -1, 1));
      const k = Math.max(1, Math.ceil(ang / step));
      for (let j = 0; j < k; j++) {
        const t = j / k;
        out.push(norm3([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]));
      }
    }
    if (!closed) out.push(vs[n - 1]);
    return out;
  }
  /** smooth a polyline of unit vectors (catmull in 3D then normalise) */
  function smooth3(vs, sub = 4) {
    const out = [];
    const n = vs.length;
    const g = (i) => vs[Math.max(0, Math.min(n - 1, i))];
    for (let i = 0; i < n - 1; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      for (let j = 0; j < sub; j++) {
        const t = j / sub, t2 = t * t, t3 = t2 * t;
        const f = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        out.push(norm3([f(0), f(1), f(2)]));
      }
    }
    out.push(vs[n - 1]);
    return out;
  }
  const arcLen = (vs) => { const c = [0]; for (let i = 1; i < vs.length; i++) c.push(c[i - 1] + Math.acos(clamp(dot3(vs[i - 1], vs[i]), -1, 1))); return c; };
  function alongPath(vs, cum, s) {
    const total = cum[cum.length - 1];
    s = ((s % total) + total) % total;
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const t = (s - cum[lo]) / Math.max(1e-9, cum[hi] - cum[lo]);
    const a = vs[lo], b = vs[hi];
    return { v: norm3([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]), i: lo };
  }

  /** resample a polyline of unit vectors at (about) uniform arc length, keeping both end points */
  function resample3(vs, step) {
    const cum = arcLen(vs), tot = cum[cum.length - 1];
    const k = Math.max(1, Math.round(tot / step));
    const out = [];
    for (let i = 0; i <= k; i++) out.push(i === k ? vs[vs.length - 1] : alongPath(vs, cum, (tot * i) / k).v);
    return out;
  }
  /** relax (smooth) the points that are not fixed: removes the kinks that screen-designed curves get near the limb
      and at their joins with the back hemisphere, without moving the front design */
  function relax3(vs, fixed, iters, closed) {
    let a = vs;
    const n = a.length;
    for (let it = 0; it < iters; it++) {
      const b = a.slice();
      for (let i = 0; i < n; i++) {
        if (fixed[i] || (!closed && (i === 0 || i === n - 1))) continue;
        const p = a[(i - 1 + n) % n], q = a[(i + 1) % n], c = a[i];
        b[i] = norm3([p[0] + 2 * c[0] + q[0], p[1] + 2 * c[1] + q[1], p[2] + 2 * c[2] + q[2]]);
      }
      a = b;
    }
    return a;
  }
  /** true where a unit vector lies well inside the front disc at rot = 0 (the part designed on screen) */
  const frontFixed = (v, lim = 0.84) => { const w = toView(v, 1, 0); return w[2] > 0 && Math.hypot(w[0], w[1]) < lim; };

  // =====================================================================================================
  //  1. BIG WORLD
  // =====================================================================================================
  const BWC = {
    baseL: '#D7E3A4', baseM: '#ABC97F', baseD: '#8DB06C',
    meadow: '#EEE5A6', deep: '#86AE6A',
    tree: ['#79A862', '#6A9C5A', '#88B166', '#5F9356'],
    gold: '#E6C06C', goldD: '#C99A45', rose: '#E4BDC7', green: '#C2D98A', soil: '#D3AE86',
    river: '#92BEDC', roadC: '#EFDFBA', roadE: '#BCA077',
    wall: '#F5EEE0', roof: '#C8735A',
    stone: '#F2E4C8', stoneD: '#B49A80', stoneW: '#ECD9B6', inner: '#6B4E42',
    dome: '#78B5B0', domeD: '#3F8087', lead: '#97A3BF', leadD: '#56628A',
    shadow: '#8E92C0', shadowD: '#6E70A4',
    lantern: ['#F2B54A', '#E37F52', '#DA5F70', '#F2B54A'],
    flag: ['#C9455A', '#E8B84A', '#4E9C9A', '#C9455A'],
    awning: ['#C9455A', '#5C7CB7', '#E3A93E', '#4E9C9A'],
    coat: ['#3F5A86', '#B8664C', '#6E8F4E', '#9C5470', '#C49A48', '#5A6E8C', '#7A5A44'],
  };
  /** catmull-rom sample of a 2D polyline (smooth curve through the points) */
  function catmullPts(pts, closed = false, sub = 6) {
    const n = pts.length, out = [];
    const g = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    const lim = closed ? n : n - 1;
    for (let i = 0; i < lim; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      for (let j = 0; j < sub; j++) {
        const t = j / sub, t2 = t * t, t3 = t2 * t;
        const f = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }

  /** the static model of the world surface (unit vectors), built once */
  function bwModel() {
    return memo('bw:model', () => {
      const M = { patches: [], fields: [], rivers: [], lakes: [], objects: [], flowers: [] };
      const sb = (cx, cy, rx, ry, seed, irr = 0.2, rot = 0) => scrToSph(blobPts(cx, cy, rx, ry, seed, irr, 40, rot));
      const curve = (pts) => scrToSph(catmullPts(pts, false, 8), false, 0.018);
      // ---------- broad colour patches (front, designed in screen space at rot = 0)
      M.patches.push({ v: sb(-0.36, -0.36, 0.5, 0.38, 3, 0.22, -0.5), col: BWC.meadow, a: 0.5 });
      M.patches.push({ v: sb(-0.55, 0.52, 0.46, 0.3, 5, 0.25, 0.3), col: BWC.deep, a: 0.32 });
      M.patches.push({ v: sb(0.62, 0.18, 0.36, 0.42, 7, 0.22, 0.2), col: '#A9C77A', a: 0.45 });
      M.patches.push({ v: sb(0.1, 0.74, 0.5, 0.22, 9, 0.25, -0.1), col: BWC.deep, a: 0.28 });
      M.patches.push({ v: sb(0.3, -0.62, 0.32, 0.16, 11, 0.25, 0.3), col: BWC.meadow, a: 0.4 });
      M.patches.push({ v: sb(-0.15, 0.1, 0.3, 0.2, 12, 0.3, 0.6), col: BWC.meadow, a: 0.35 });
      // ---------- fields (patchwork with rows)
      const field = (pts, col, rowCol, ang, gap, a = 1) => {
        const w = E.wobblePts(E.subdivide(pts, 0.03, true), { seed: Math.round(pts[0][0] * 100) + 3, amp: 0.006, freq: 9 });
        const v = w.map((p) => fromScreen(p[0], p[1]));
        const rows = [];
        const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        for (let k = -9; k <= 9; k++) {
          const ox = cx - sa * k * gap, oy = cy + ca * k * gap;
          rows.push(scrToSph([[ox - ca * 0.35, oy - sa * 0.35], [ox + ca * 0.35, oy + sa * 0.35]], false, 0.03));
        }
        M.fields.push({ v, col, rowCol, rows, a });
      };
      field([[0.06, -0.24], [0.4, -0.3], [0.47, -0.02], [0.12, 0.05]], BWC.gold, BWC.goldD, -0.15, 0.03);
      field([[-0.27, -0.56], [0.0, -0.62], [0.07, -0.42], [-0.19, -0.35]], BWC.green, '#86AB62', 0.3, 0.028);
      field([[0.5, -0.47], [0.68, -0.52], [0.76, -0.33], [0.55, -0.27]], BWC.rose, '#BE8598', 1.1, 0.026);
      field([[0.0, 0.14], [0.3, 0.09], [0.36, 0.31], [0.06, 0.36]], '#DADB93', '#AEB266', 0.05, 0.03);
      field([[-0.62, -0.02], [-0.42, -0.13], [-0.34, 0.06], [-0.55, 0.16]], BWC.soil, '#AB8560', 0.6, 0.026);
      field([[0.6, 0.05], [0.82, -0.02], [0.86, 0.2], [0.64, 0.26]], BWC.gold, BWC.goldD, 0.4, 0.03);
      // ---------- river (centreline designed on screen) + lakes
      const riv1 = curve([[-0.995, 0.3], [-0.78, 0.37], [-0.55, 0.29], [-0.3, 0.38], [-0.06, 0.5], [0.2, 0.47], [0.44, 0.56], [0.57, 0.6]]);
      const riv2 = curve([[0.61, 0.63], [0.74, 0.71], [0.88, 0.62], [0.995, 0.5]]);
      M.lakes.push({ v: sb(0.6, 0.62, 0.11, 0.07, 13, 0.15, 0.2) });
      const bl = fromLL(-0.32, Math.PI);
      M.lakes.push({ v: llBlob(bl, 0.2, 0.12, 15, 0.18, 36, 0.3) });
      const rA = toLL(riv2[riv2.length - 1]), rB = toLL(riv1[0]);
      const backA = [], backB = [];
      for (let i = 1; i <= 8; i++) { const u = i / 8; backA.push(fromLL(lerp(rA[0], -0.3, u) + 0.06 * Math.sin(u * 7), lerp(rA[1], Math.PI - 0.12, u))); }
      for (let i = 0; i < 8; i++) { const u = i / 8; backB.push(fromLL(lerp(-0.3, rB[0], u) + 0.07 * Math.sin(u * 6 + 1), lerp(-Math.PI + 0.12, rB[1], u))); }
      // joins are smoothed through a point a little inside the front curves, so the river has no kink at the limb
      const sA = smooth3(backB.concat([riv1[0], riv1[Math.min(6, riv1.length - 1)]]), 3);
      M.rivers.push(densify3(sA.slice(0, sA.length - 3), 0.03).concat(riv1.slice(1)));
      const n2 = riv2.length;
      const sB = smooth3([riv2[Math.max(0, n2 - 7)], riv2[n2 - 1]].concat(backA), 3);
      M.rivers.push(riv2.concat(densify3(sB.slice(3), 0.03).slice(1)));
      M.rivers = M.rivers.map((cl0) => {
        const r0 = resample3(cl0, 0.02);
        const cl = relax3(r0, r0.map((v) => frontFixed(v)), 60, false);
        return { cl, rb: ribbon(cl, 0.048), hl: ribbon(cl, 0.011) };
      });
      // ---------- the road: one loop. Enters the han gate from the front-left, leaves to the right, runs round the back
      const yb = HAN_YB / 100;
      const vin = curve([[-0.999, 0.12], [-0.86, 0.04], [-0.69, 0.11], [-0.5, 0.06], [-0.37, -0.1], [-0.41, -0.31], [-0.29, -0.5], [-0.13, -0.62], [-0.04, -0.75], [-0.005, -0.86], [0, yb + 0.012]]);
      const vout = curve([[0.21, yb + 0.03], [0.33, -0.86], [0.43, -0.78], [0.5, -0.66], [0.53, -0.5], [0.63, -0.37], [0.78, -0.3], [0.91, -0.21], [0.999, -0.11]]);
      const a1 = toLL(vout[vout.length - 1]), a0 = toLL(vin[0]);
      const back = [];
      for (let i = 1; i < 14; i++) {
        const u = i / 14;
        back.push(fromLL(lerp(a1[0], a0[0], u) + 0.16 * Math.sin(u * Math.PI) + 0.05 * Math.sin(u * 11), lerp(a1[1], a0[1] + TAU, u)));
      }
      const no = vout.length;
      const sR = smooth3([vout[Math.max(0, no - 7)], vout[no - 1]].concat(back, [vin[0], vin[Math.min(6, vin.length - 1)]]), 3);
      // resample each part uniformly (the gate and exit points stay exact), then relax the limb / back parts
      const rIn = resample3(vin, 0.016), rOut = resample3(vout, 0.016);
      const rConn = densify3([vin[vin.length - 1], vout[0]], 0.016).slice(1);
      const backPart = resample3([vout[vout.length - 1]].concat(sR.slice(3, sR.length - 3), [vin[0]]), 0.016).slice(1, -1);
      const loop0 = rIn.concat(rConn, rOut.slice(1), backPart);
      const gateIdx = rIn.length - 1, exitIdx = rIn.length + rConn.length - 1;
      const gv = vin[vin.length - 1], cg = Math.cos(0.32);
      const loop = relax3(loop0, loop0.map((v) => frontFixed(v, 0.86) || dot3(v, gv) > cg), 70, true);
      M.road = { cl: loop, cum: arcLen(loop), rb: ribbon(loop, 0.034) };
      M.road.gateS = M.road.cum[gateIdx];
      M.road.exitS = M.road.cum[exitIdx];
      // ---------- objects (front)
      const O = (type, sx, sy, o) => M.objects.push({ type, v: fromScreen(sx, sy), ...o });
      let ti = 0;
      const tree = (sx, sy, h, rc, seed, two = false) => O('tree', sx, sy, { h, rc, col: BWC.tree[ti++ % 4], seed, two });
      // upper-left grove
      tree(-0.62, -0.44, 4.5, 5.2, 1, true); tree(-0.71, -0.33, 4, 4.6, 2); tree(-0.55, -0.31, 3.6, 4.2, 3, true);
      tree(-0.79, -0.5, 4.4, 5.0, 4); tree(-0.66, -0.56, 4.2, 4.6, 5); tree(-0.86, -0.38, 4.6, 5.0, 6, true);
      tree(-0.9, -0.22, 4.2, 4.6, 7);
      // right limb trees
      tree(0.86, -0.42, 4.6, 5.0, 8, true); tree(0.93, -0.31, 4.2, 4.5, 9); tree(0.8, -0.12, 3.6, 4.0, 10);
      tree(0.73, -0.6, 4.2, 4.6, 11, true); tree(0.95, -0.08, 4.0, 4.4, 12);
      // along the road and the fields
      tree(-0.26, -0.12, 3.2, 3.6, 13); tree(-0.2, -0.24, 3.0, 3.3, 14, true); tree(0.22, -0.4, 3.0, 3.4, 15);
      tree(0.45, -0.17, 3.0, 3.3, 16); tree(-0.08, 0.06, 3.0, 3.3, 17, true);
      // lower groves (by the river)
      [[-0.42, 0.6], [-0.33, 0.66], [-0.5, 0.68], [-0.38, 0.75], [-0.25, 0.72], [0.18, 0.74], [0.27, 0.78], [0.1, 0.8], [0.78, 0.36], [0.7, 0.42], [0.84, 0.44], [-0.75, 0.55], [-0.82, 0.45]]
        .forEach((p, i) => tree(p[0], p[1], 2.4, 3.6 + (i % 3) * 0.5, 30 + i, i % 3 === 0));
      // cypresses (servi) flanking the han and on the hills
      const cyp = (sx, sy, h, seed) => O('cypress', sx, sy, { h, w: h * 0.25, seed });
      cyp(-0.5, -0.84, 15, 1); cyp(-0.6, -0.76, 12, 2); cyp(0.52, -0.83, 14.5, 3); cyp(0.62, -0.74, 11.5, 4);
      cyp(-0.44, -0.08, 9, 5); cyp(0.34, -0.66, 9, 6); cyp(0.68, 0.08, 9, 7);
      // houses
      const house = (sx, sy, s, roof, seed) => O('house', sx, sy, { s, roof, seed });
      house(-0.47, -0.14, 6.6, BWC.roof, 1); house(0.38, -0.56, 6, '#B9654F', 2); house(0.71, -0.2, 5.8, BWC.roof, 3);
      house(-0.16, 0.3, 5.8, '#B9654F', 4); house(0.32, 0.08, 5.4, BWC.roof, 5); house(-0.66, 0.22, 5.4, BWC.roof, 6);
      // flower clusters (pop in with decor)
      const fl = (sx, sy, rr, n, seed, tau) => M.flowers.push({ v: fromScreen(sx, sy), rr, n, seed, tau });
      fl(-0.12, -0.72, 0.055, 11, 1, 0.05); fl(0.13, -0.73, 0.055, 11, 2, 0.12); fl(-0.36, -0.55, 0.06, 12, 3, 0.2); fl(0.62, -0.42, 0.06, 11, 4, 0.28);
      fl(0.02, -0.1, 0.07, 13, 5, 0.33); fl(-0.6, 0.06, 0.06, 10, 6, 0.4); fl(0.5, 0.3, 0.06, 10, 7, 0.46); fl(-0.1, 0.42, 0.055, 9, 8, 0.52);
      fl(0.3, -0.28, 0.05, 9, 9, 0.58); fl(-0.3, 0.12, 0.05, 9, 10, 0.64); fl(0.86, -0.02, 0.045, 8, 11, 0.7); fl(-0.78, -0.12, 0.045, 8, 12, 0.74);
      // ---------- back hemisphere (procedural, for rotation)
      const r = E.rng(4242);
      for (let i = 0; i < 9; i++) {
        const c = fromLL(lerp(-0.7, 0.9, r()), Math.PI + lerp(-1.3, 1.3, r()));
        const cols = [BWC.gold, BWC.green, BWC.rose, '#DADB93', BWC.soil, BWC.meadow];
        // a patchwork field: a slightly irregular quad in the tangent plane, with rows
        let e1 = norm3(cross3([0, 1, 0], c));
        const e2 = cross3(c, e1);
        const hw = 0.1 + r() * 0.1, hh = 0.07 + r() * 0.07, ang = r() * 3;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const toS = ([u, v]) => { const x = u * ca - v * sa, y = u * sa + v * ca; return norm3([c[0] + e1[0] * x + e2[0] * y, c[1] + e1[1] * x + e2[1] * y, c[2] + e1[2] * x + e2[2] * y]); };
        const corners = [[-hw, -hh], [hw * (0.9 + r() * 0.2), -hh * (0.9 + r() * 0.2)], [hw, hh], [-hw * (0.9 + r() * 0.2), hh]];
        const v = E.subdivide(corners, 0.02, true).map(toS);
        const rows = [];
        for (let k = -6; k <= 6; k++) rows.push(E.subdivide([[-hw * 1.4, (k / 6) * hh], [hw * 1.4, (k / 6) * hh]], 0.03, false).map(toS));
        const col = cols[i % cols.length];
        M.fields.push({ v, col, rowCol: shade(col, -0.35), rows, a: 1 });
      }
      for (let i = 0; i < 6; i++) M.patches.push({ v: llBlob(fromLL(lerp(-0.8, 0.9, r()), Math.PI + lerp(-1.4, 1.4, r())), 0.3 + r() * 0.2, 0.2 + r() * 0.15, 80 + i, 0.22, 32, r() * 3), col: i % 2 ? BWC.deep : BWC.meadow, a: 0.25 });
      for (let g = 0; g < 6; g++) {
        const lat = lerp(-0.05, 1.05, r()), lon = Math.PI + lerp(-1.35, 1.35, r());
        const n = 3 + Math.floor(r() * 4);
        for (let k = 0; k < n; k++) M.objects.push({ type: 'tree', v: fromLL(lat + (r() - 0.5) * 0.18, lon + (r() - 0.5) * 0.26), h: 3.5 + r() * 1.2, rc: 3.8 + r() * 1.4, col: BWC.tree[k % 4], seed: 100 + g * 10 + k, two: r() > 0.6 });
      }
      for (let k = 0; k < 6; k++) M.objects.push({ type: 'cypress', v: fromLL(lerp(0, 1.0, r()), Math.PI + lerp(-1.4, 1.4, r())), h: 9 + r() * 5, w: 2.6, seed: 20 + k });
      for (let k = 0; k < 4; k++) M.objects.push({ type: 'house', v: fromLL(lerp(0.0, 0.9, r()), Math.PI + lerp(-1.3, 1.3, r())), s: 5.4 + r(), roof: k % 2 ? BWC.roof : '#B9654F', seed: 10 + k });
      for (let k = 0; k < 8; k++) M.flowers.push({ v: fromLL(lerp(-0.4, 0.9, r()), Math.PI + lerp(-1.4, 1.4, r())), rr: 0.055, n: 9, seed: 40 + k, tau: r() * 0.7 });
      // travellers: loop positions (radians along the road) at t = 0; spaced so that around t ≈ 1.5–2.5 s one walks
      // into the gate while another leaves on the far side
      const g0 = M.road.gateS, x0 = M.road.exitS;
      M.trav = [
        { s: g0 - 0.16, col: 0, kind: 'man' }, { s: g0 - 0.3, col: 1, kind: 'man', pack: 1 }, { s: g0 - 0.4, col: 4, kind: 'camel' },
        { s: g0 - 0.78, col: 2, kind: 'man' }, { s: g0 - 1.25, col: 3, kind: 'man', pack: 1 }, { s: g0 - 1.62, col: 5, kind: 'man' },
        { s: x0 - 0.12, col: 6, kind: 'man', pack: 1 }, { s: x0 + 0.22, col: 2, kind: 'man' }, { s: x0 + 0.3, col: 0, kind: 'camel' },
        { s: x0 + 0.75, col: 4, kind: 'man' }, { s: x0 + 1.02, col: 1, kind: 'man', pack: 1 },
      ];
      return M;
    });
  }

  /** façade ground line of the han (unit: R = 100); x in [-50, 50] */
  const HAN_D = 6;
  const hanGy = (x) => -(Math.sqrt(Math.max(0, 1e4 - x * x - HAN_D * HAN_D)) * cT - HAN_D * sT) + 0.8;
  const HAN_YB = hanGy(0);
  const HAN_GATE = [0, HAN_YB - 8.2];

  function hanGeom() {
    return memo('bw:han', () => {
      const G = {};
      const H = (v) => HAN_YB - v;
      const body = (x0, x1, top, sink = 2.4) => {
        const pts = [[x0, top], [x1, top]];
        for (let i = 0; i <= 10; i++) { const x = x1 + (x0 - x1) * (i / 10); pts.push([x, hanGy(x) + sink]); }
        return pts;
      };
      G.H = H;
      G.wingL = poly(body(-38.5, -14, H(22)));
      G.wingR = poly(body(14, 38.5, H(22)));
      G.portal = poly(body(-15, 15, H(38.5), 2.0));
      G.portalSide = poly([[15, H(38.5)], [17.4, H(37.4)], [17.4, hanGy(17.4) + 1.8], [15, hanGy(15) + 2.0]]);
      G.portalShadow = poly([[17.4, H(37.4)], [22.5, H(34.8)], [22.5, hanGy(22.5) + 2.4], [17.4, hanGy(17.4) + 2.4]]);
      G.cornice = poly([[-39.6, H(22.3)], [39.6, H(22.3)], [39.6, H(20.7)], [-39.6, H(20.7)]]);
      G.corniceSh = poly([[-38.5, H(20.7)], [38.5, H(20.7)], [38.5, H(19.7)], [-38.5, H(19.7)]]);
      G.portalCornice = poly([[-16.2, H(38.9)], [16.2, H(38.9)], [16.2, H(37.1)], [-16.2, H(37.1)]]);
      G.portalCorniceSh = poly([[-15, H(37.1)], [15, H(37.1)], [15, H(36.2)], [-15, H(36.2)]]);
      // cresting on the portal: small stepped merlons
      const cr = new Path2D();
      for (let i = 0; i < 9; i++) {
        const x = -14 + i * 3.5;
        cr.addPath(poly([[x - 1, H(38.9)], [x - 1, H(39.9)], [x - 0.45, H(40.6)], [x + 0.45, H(40.6)], [x + 1, H(39.9)], [x + 1, H(38.9)]]));
      }
      G.crest = cr;
      G.frame = poly([[-12.2, H(35.4)], [12.2, H(35.4)], [12.2, hanGy(12.2) + 1.6], [-12.2, hanGy(-12.2) + 1.6]]);
      G.archPts = archPts(0, H(17.5), 8.0, 13.2, hanGy(0) + 1.6, 12);
      G.arch = poly(G.archPts);
      G.archRim = poly(archPts(0, H(17.5), 9.2, 14.6, hanGy(0) + 1.6, 12));
      G.doorPts = archPts(0, H(10.4), 4.8, 7.0, hanGy(0) + 1.7, 10);
      G.door = poly(G.doorPts);
      G.doorFrame = poly(archPts(0, H(10.4), 5.7, 8.0, hanGy(0) + 1.7, 10));
      // muqarnas: rows of small niches filling the arch hood
      const mq = new Path2D(), mqF = new Path2D();
      for (let row = 0; row < 3; row++) {
        const y = H(25.2 + row * 1.7), n = 6 - row * 1.5, w = 2.25;
        const nn = Math.round(n);
        for (let i = 0; i < nn; i++) {
          const x = (i - (nn - 1) / 2) * w;
          mq.moveTo(x - w / 2, y);
          mq.lineTo(x - w / 2, y - 0.5);
          mq.quadraticCurveTo(x - w / 2, y - 1.6, x, y - 1.75);
          mq.quadraticCurveTo(x + w / 2, y - 1.6, x + w / 2, y - 0.5);
          mq.lineTo(x + w / 2, y);
          mqF.addPath(poly([[x - w / 2 + 0.25, y], [x - w / 2 + 0.25, y - 0.5], [x, y - 1.45], [x + w / 2 - 0.25, y - 0.5], [x + w / 2 - 0.25, y]]));
        }
      }
      G.muq = mq; G.muqF = mqF;
      // towers
      G.tower = (cx) => poly([[cx - 5.2, H(27)], [cx + 5.2, H(27)], [cx + 5.2, hanGy(cx + 5.2) + 2.4], [cx - 5.2, hanGy(cx - 5.2) + 2.4]]);
      G.towerCap = (cx) => {
        const y0 = H(27.6), pts = [];
        for (let i = 0; i <= 18; i++) { const a = Math.PI + Math.PI * (i / 18); const sn = Math.sin(a); pts.push([cx + Math.cos(a) * 6, y0 + sn * 6.4 * (1 + 0.18 * Math.pow(-sn, 6))]); }
        pts.push([cx + 6, y0 + 0.4], [cx - 6, y0 + 0.4]);
        return poly(pts);
      };
      G.towerRing = (cx) => poly([[cx - 6.4, H(26.4)], [cx + 6.4, H(26.4)], [cx + 6.4, H(28)], [cx - 6.4, H(28)]]);
      // domes
      const domePath = (cx, y0, rw, rh) => {
        const pts = [];
        for (let i = 0; i <= 24; i++) {
          const u = i / 24, a = Math.PI + Math.PI * u;
          const sn = -Math.sin(a);
          // slightly ogee (pointed) Ottoman profile
          pts.push([cx + Math.cos(a) * rw * (1 - 0.06 * Math.pow(sn, 10)), y0 - sn * rh * (1 + 0.1 * Math.pow(sn, 14))]);
        }
        return poly(pts.concat([[cx + rw, y0 + 0.6], [cx - rw, y0 + 0.6]]));
      };
      G.domeC = domePath(0, H(42.2), 11.6, 13.4);
      G.drumC = poly([[-11.2, H(38)], [11.2, H(38)], [11.2, H(42.4)], [-11.2, H(42.4)]]);
      G.domeW = (cx) => domePath(cx, H(22.4), 6.6, 8.2);
      G.winX = [-31.5, -21.5, 21.5, 31.5];
      G.win = G.winX.map((x) => poly(archPts(x, H(9.6), 2.0, 3.0, H(3.8), 6)));
      G.winF = G.winX.map((x) => poly(archPts(x, H(9.6), 2.7, 3.7, H(3.3), 6)));
      // grass fringe at the foot of the façade (with gaps for the forecourt and the exit road)
      const fr = new Path2D();
      const segs = [[-45, -7.5], [7.5, 18.5], [26.5, 45]];
      const rr = E.rng(77);
      for (const [x0, x1] of segs) {
        const top = [], bot = [];
        const n = Math.max(4, Math.round((x1 - x0) / 1.3));
        for (let i = 0; i <= n; i++) {
          const x = lerp(x0, x1, i / n);
          const edge = Math.min(sstep(x0, x0 + 3, x), 1 - sstep(x1 - 3, x1, x));
          top.push([x, hanGy(x) + 2.6 - edge * (1.0 + rr() * 1.3)]);
          bot.push([x, hanGy(x) + 4.6]);
        }
        fr.addPath(smooth(top.concat(bot.reverse()), true));
      }
      G.fringe = fr;
      G.bushes = [[-35.5, 2.6], [-27, 2.2], [-19.5, 2.4], [30, 2.4], [36.5, 2.8], [10.5, 1.9]];
      return G;
    });
  }

  // ---------- small billboard objects on the globe ----------
  const shTint = (col, lam, k = 1) => mixc(col, '#4F5C80', clamp((0.58 - lam) * 0.75, 0, 0.42) * k);
  function contactShadow(K, x, y, rx, ry, ang, a) {
    glaze(K, ellipse(x, y, rx, ry, ang), '#56705C', a, Math.max(0.4, ry * 0.5));
  }
  function bwTree(K, ob, B, up, ang, lam, lk) {
    const h = ob.h, rc = ob.rc;
    const cx = B[0] + up[0] * h, cy = B[1] + up[1] * h;
    const col = shTint(ob.col, lam);
    contactShadow(K, B[0] + rc * 0.45, B[1] + rc * 0.2, rc * 1.05, rc * 0.42, ang, 0.32);
    if (Math.hypot(up[0], up[1]) * h > 0.7) strokeP(K, [[B[0], B[1]], [cx, cy]], shTint('#76563F', lam), 1.15, 1, { over: true });
    const c = blobP(cx, cy, rc, { seed: ob.seed, irr: 0.15, n: 18 });
    const box = [cx - rc * 1.2, cy - rc * 1.2, rc * 2.4, rc * 2.4];
    over(K, c, col, 1);
    occlude(K, c, 1);
    crescent(K, c, box, -rc * 0.4, -rc * 0.44, shade(col, -0.42), 0.6);
    if (ob.two) {
      const c2 = blobP(cx + rc * 0.62, cy + rc * 0.3, rc * 0.62, { seed: ob.seed + 5, irr: 0.12, n: 14 });
      over(K, c2, mixc(col, '#3C6650', 0.12), 1);
      occlude(K, c2, 1);
      crescent(K, c2, box, -rc * 0.3, -rc * 0.32, shade(col, -0.45), 0.55);
    }
    over(K, blobP(cx - rc * 0.34, cy - rc * 0.4, rc * 0.3, { rx: rc * 0.36, ry: rc * 0.24, rot: -0.6, seed: ob.seed + 9, irr: 0.3, n: 12 }), shade(col, 0.3), 0.55);
    if (lk > 0.6) pen(K, c, 0.85 * lk, 0.2, { double: false });
  }
  function bwCypress(K, ob, B, ang, f, lam, lk) {
    const h = ob.h * f, w = ob.w;
    const col = shTint('#4C8A5E', lam);
    K.p.save(); K.k.save(); K.l.save();
    for (const c of [K.p, K.k, K.l]) { c.translate(B[0], B[1]); c.rotate(ang); }
    contactShadow(K, w * 0.8, 0.3, w * 1.1, w * 0.32, 0, 0.3);
    strokeP(K, [[0, 0.4], [0, -h * 0.1]], '#76563F', w * 0.18, 1, { over: true });
    const pts = [[0, -h * 0.05], [-w * 0.44, -h * 0.14], [-w * 0.52, -h * 0.4], [-w * 0.36, -h * 0.72], [0, -h], [w * 0.36, -h * 0.72], [w * 0.52, -h * 0.4], [w * 0.44, -h * 0.14]];
    const path = smooth(pts, true);
    over(K, path, col, 1);
    occlude(K, path, 1);
    glaze(K, smooth([[w * 0.02, -h * 0.06], [w * 0.08, -h * 0.4], [0, -h * 0.97], [w * 0.38, -h * 0.7], [w * 0.52, -h * 0.38], [w * 0.42, -h * 0.13]], true), shade(col, -0.45), 0.65);
    over(K, smooth([[-w * 0.3, -h * 0.22], [-w * 0.36, -h * 0.5], [-w * 0.16, -h * 0.8], [-w * 0.1, -h * 0.45]], true), shade(col, 0.3), 0.6);
    if (lk > 0.6) pen(K, path, 0.85 * lk, 0.2, { double: false });
    K.p.restore(); K.k.restore(); K.l.restore();
  }
  function bwHouse(K, ob, B, ang, f, lam, lk) {
    const s = ob.s;
    K.p.save(); K.k.save(); K.l.save();
    for (const c of [K.p, K.k, K.l]) { c.translate(B[0], B[1]); c.rotate(ang); c.scale(1, f); }
    const w = s, hh = s * 0.6, rf = s * 0.48;
    contactShadow(K, w * 0.45, 0.4, w * 0.95, s * 0.2, 0, 0.32);
    const wall = poly([[-w / 2, 0.5], [-w / 2, -hh], [w / 2, -hh], [w / 2, 0.5]]);
    const side = poly([[w / 2, 0.5], [w / 2, -hh], [w * 0.84, -hh - s * 0.06], [w * 0.84, 0.2]]);
    const roof = poly([[-w / 2 - s * 0.08, -hh + 0.25], [0, -hh - rf], [w / 2 + s * 0.08, -hh + 0.25]]);
    const roofS = poly([[0, -hh - rf], [w * 0.36, -hh - rf - s * 0.06], [w * 0.92, -hh - s * 0.03], [w / 2 + s * 0.08, -hh + 0.25]]);
    const all = new Path2D(); all.addPath(wall); all.addPath(side); all.addPath(roof); all.addPath(roofS);
    occlude(K, all, 1);
    over(K, wall, shTint(BWC.wall, lam), 1);
    over(K, side, shTint('#D8C8B4', lam, 1.3), 1);
    over(K, roofS, shade(shTint(ob.roof, lam), -0.3), 1);
    over(K, roof, shTint(ob.roof, lam), 1);
    glaze(K, poly([[-w / 2, -hh + 0.25], [w / 2, -hh + 0.25], [w / 2, -hh + s * 0.12], [-w / 2, -hh + s * 0.12]]), '#9C8F9F', 0.5);
    over(K, poly([[-s * 0.1, 0.5], [-s * 0.1, -hh * 0.56], [s * 0.1, -hh * 0.56], [s * 0.1, 0.5]]), '#7A5440', 1);
    over(K, poly([[w * 0.2, -hh * 0.64], [w * 0.36, -hh * 0.64], [w * 0.36, -hh * 0.36], [w * 0.2, -hh * 0.36]]), '#6F7590', 1);
    if (lk > 0.6) { pen(K, wall, 0.75 * lk, 0.24, { double: false }); pen(K, roof, 0.75 * lk, 0.24, { double: false }); }
    K.p.restore(); K.k.restore(); K.l.restore();
  }
  function bwFlowers(K, fl, B, n3, sc, lam) {
    const rr = fl.rr * 100;
    const r = E.rng(fl.seed * 13 + 1);
    const cols = ['#D9566A', '#FBF6EC', '#E8B84A', '#C9455A', '#B98AC8', '#FBF6EC', '#E77F8E'];
    const sx = Math.max(0.35, Math.sqrt(1 - n3[0] * n3[0])), sy = Math.max(0.35, Math.sqrt(1 - n3[1] * n3[1])) * 0.8;
    // leafy bed under the flowers
    glaze(K, blobP(B[0], B[1], rr, { seed: fl.seed, irr: 0.3, rx: rr * 1.1 * sx, ry: rr * 0.9 * sy, n: 16 }), '#6E9A5A', 0.35 * clamp(sc), 0.6);
    for (let i = 0; i < fl.n; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * rr;
      const x = B[0] + Math.cos(a) * d * sx, y = B[1] + Math.sin(a) * d * sy;
      const s = (0.5 + r() * 0.4) * sc;
      const col = cols[Math.floor(r() * cols.length)];
      if (s <= 0.02) continue;
      over(K, circle(x, y, s), shTint(col, lam, 0.8), 1);
      if (s > 0.55) over(K, circle(x, y, s * 0.32), col === '#E8B84A' ? '#C77B3A' : '#E8B84A', 1);
    }
  }
  function bwTraveller(K, B, ang, h, facing, phase, col, kind, pack, lk) {
    K.p.save(); K.k.save(); K.l.save();
    for (const c of [K.p, K.k, K.l]) { c.translate(B[0], B[1]); c.rotate(ang); c.scale(facing, 1); }
    contactShadow(K, 0, 0.1, h * (kind === 'camel' ? 0.75 : 0.32), h * 0.08, 0, 0.35);
    if (kind === 'camel') {
      // dromedary in profile, facing +x: deep body with one tall hump, long neck curving forward and up, small head,
      // long knobbly legs (far pair darker), tail, a striped saddle blanket draped over the hump
      const s = h * 1.05;
      const ph = phase * TAU;
      const leg = (lx, o, far) => {
        const sw = Math.sin(ph + o) * s * 0.1, lift2 = Math.max(0, Math.sin(ph + o + 1.2)) * s * 0.035;
        const knee = [lx * s + sw * 0.45, -0.29 * s - lift2];
        return { far, pts: [[lx * s, -0.6 * s], knee, [lx * s + sw, -lift2 * 0.6]] };
      };
      const legs = [leg(-0.3, Math.PI, true), leg(0.24, 0, true), leg(-0.22, 0, false), leg(0.32, Math.PI, false)];
      for (const lg of legs.filter((l) => l.far)) strokeP(K, lg.pts, '#9C7448', s * 0.06, 1, { over: true });
      const body = smooth([
        [-0.46 * s, -0.66 * s], [-0.41 * s, -0.77 * s], [-0.28 * s, -0.85 * s], [-0.16 * s, -1.03 * s], [-0.03 * s, -1.06 * s],
        [0.1 * s, -0.95 * s], [0.2 * s, -0.83 * s], [0.31 * s, -0.79 * s], [0.42 * s, -0.75 * s], [0.52 * s, -0.83 * s],
        [0.58 * s, -0.98 * s], [0.62 * s, -1.08 * s], [0.7 * s, -1.11 * s], [0.8 * s, -1.06 * s], [0.84 * s, -1.0 * s],
        [0.77 * s, -0.97 * s], [0.68 * s, -0.98 * s], [0.62 * s, -0.88 * s], [0.55 * s, -0.71 * s], [0.43 * s, -0.6 * s],
        [0.27 * s, -0.54 * s], [0.0, -0.52 * s], [-0.3 * s, -0.54 * s], [-0.43 * s, -0.58 * s],
      ], true);
      over(K, body, '#D3A468', 1);
      occlude(K, body, 1);
      // belly / underside shadow and a lighter back (light from the upper-left)
      K.p.save(); K.p.clip(body);
      glaze(K, smooth([[-0.5 * s, -0.66 * s], [0.0, -0.64 * s], [0.45 * s, -0.66 * s], [0.5 * s, -0.5 * s], [-0.5 * s, -0.5 * s]], true), '#9B7044', 0.55);
      lift(K, smooth([[-0.3 * s, -0.84 * s], [-0.16 * s, -1.0 * s], [-0.05 * s, -1.02 * s], [-0.12 * s, -0.9 * s]], true), 0.35);
      K.p.restore();
      // saddle blanket over the hump (stripes), leaving the hump's crown visible
      const bl2 = smooth([[-0.3 * s, -0.83 * s], [-0.18 * s, -0.96 * s], [-0.02 * s, -0.98 * s], [0.13 * s, -0.86 * s], [0.16 * s, -0.66 * s], [-0.31 * s, -0.66 * s]], true);
      const c0 = BWC.awning[col % 4];
      over(K, bl2, c0, 1);
      K.p.save(); K.p.clip(bl2);
      strokeP(K, [[-0.4 * s, -0.71 * s], [0.25 * s, -0.71 * s]], '#F3E3C0', s * 0.035, 1, { over: true });
      glaze(K, smooth([[-0.05 * s, -0.98 * s], [0.2 * s, -0.86 * s], [0.2 * s, -0.6 * s], [-0.02 * s, -0.6 * s]], true), shade(c0, -0.4), 0.4);
      K.p.restore();
      for (const lg of legs.filter((l) => !l.far)) strokeP(K, lg.pts, '#C1915A', s * 0.065, 1, { over: true });
      strokeP(K, [[-0.45 * s, -0.68 * s], [-0.52 * s, -0.56 * s], [-0.5 * s, -0.46 * s]], '#9C7448', s * 0.03, 1, { over: true });
      over(K, circle(0.66 * s, -1.11 * s, 0.025 * s), '#9C7448', 1);
      if (lk > 0.5) pen(K, body, 0.65 * lk, 0.24, { double: false });
    } else {
      const sw = Math.sin(phase * TAU);
      const legs = new Path2D();
      legs.moveTo(0, -0.42 * h); legs.lineTo(sw * 0.15 * h, 0);
      legs.moveTo(0, -0.42 * h); legs.lineTo(-sw * 0.15 * h, 0);
      strokeP(K, legs, '#5A4636', h * 0.085, 1, { over: true });
      const coat = smooth([[-0.1 * h, -0.8 * h], [0.1 * h, -0.8 * h], [0.15 * h, -0.36 * h], [-0.15 * h, -0.36 * h]], true);
      const c0 = BWC.coat[col % BWC.coat.length];
      over(K, coat, c0, 1);
      occlude(K, coat, 1);
      glaze(K, poly([[0.02 * h, -0.8 * h], [0.1 * h, -0.8 * h], [0.15 * h, -0.36 * h], [0.04 * h, -0.36 * h]]), shade(c0, -0.4), 0.5);
      over(K, circle(0.01 * h, -0.9 * h, 0.095 * h), P.skin, 1);
      over(K, circle(-0.005 * h, -0.93 * h, 0.085 * h), P.hair, 0.9);
      if (pack) over(K, E.rrect(-0.25 * h, -0.78 * h, 0.14 * h, 0.25 * h, 0.04 * h), '#B38A5A', 1);
      else strokeP(K, [[0.17 * h, -0.74 * h], [0.23 * h, 0.0]], '#7A5A44', h * 0.04, 1, { over: true });
    }
    K.p.restore(); K.k.restore(); K.l.restore();
  }

  /** world-surface paths for a given rotation (cached per rotation) */
  const bwSurfCache = lru(6);
  function bwSurface(M, rot, simple) {
    return bwSurfCache(q(rot, 1e4) + ':' + (simple ? 1 : 0), () => {
      const cr = Math.cos(rot), sr = Math.sin(rot);
      const S = { patches: [], fields: [], rivers: [], rivHL: [], lakes: [], road: [] };
      for (const f of M.patches) { const p = projPts(f.v, cr, sr); if (p) S.patches.push({ path: smooth(p), f }); }
      for (const f of M.fields) {
        const p = projPts(f.v, cr, sr);
        if (!p) continue;
        const rows = new Path2D();
        if (!simple) for (const rw of f.rows) { const rp = projPts(rw, cr, sr); if (rp) rows.addPath(smooth(rp, false)); }
        S.fields.push({ path: poly(p), rows, f });
      }
      const runs = (vs) => {
        const vis = vs.map((v) => toView(v, cr, sr)[2] > -0.04);
        const out = [];
        let i = 0;
        while (i < vs.length) {
          if (!vis[i]) { i++; continue; }
          let j = i;
          while (j + 1 < vs.length && vis[j + 1]) j++;
          out.push([Math.max(0, i - 1), Math.min(vs.length - 1, j + 1)]);
          i = j + 1;
        }
        return out;
      };
      const ribbonPaths = (rb, cl) => {
        const res = [];
        for (const [i0, i1] of runs(cl)) {
          if (i1 - i0 < 1) continue;
          const l = projPts(rb.L.slice(i0, i1 + 1), cr, sr), rr = projPts(rb.R.slice(i0, i1 + 1), cr, sr);
          if (!l || !rr) continue;
          res.push(smooth(l.concat(rr.reverse()), true));
        }
        return res;
      };
      for (const rv of M.rivers) { S.rivers.push(...ribbonPaths(rv.rb, rv.cl)); S.rivHL.push(...ribbonPaths(rv.hl, rv.cl)); }
      for (const lk of M.lakes) { const p = projPts(lk.v, cr, sr); if (p) S.lakes.push(smooth(p)); }
      S.road = ribbonPaths(M.road.rb, M.road.cl);
      return S;
    });
  }

  function drawLantern(K, x, y, k, col, t, i, lit, lk) {
    const w = 1.45 * k, h = 2.1 * k;
    const body = smooth([[x, y - h], [x + w * 0.8, y - h * 0.62], [x + w, y], [x + w * 0.7, y + h * 0.6], [x, y + h * 0.8], [x - w * 0.7, y + h * 0.6], [x - w, y], [x - w * 0.8, y - h * 0.62]], true);
    const tw = 0.82 + 0.18 * noise1(t * 2.6 + i * 7.3, 5);
    if (lit > 0) glaze(K, circle(x, y, 4.6 * k), RG(K.p, x, y, 0, 4.6 * k, [[0, rgba('#F7C76A', 0.5 * lit)], [1, rgba('#F7C76A', 0)]]), 1);
    over(K, body, mixc(col, '#FFE7A0', lit * 0.5 * tw), 1);
    occlude(K, body, 1, 1);
    glaze(K, smooth([[x + w * 0.1, y - h * 0.9], [x + w, y], [x + w * 0.1, y + h * 0.75]], true), shade(col, -0.4), 0.45);
    over(K, poly([[x - w * 0.45, y - h - 0.3 * k], [x + w * 0.45, y - h - 0.3 * k], [x + w * 0.3, y - h + 0.15 * k], [x - w * 0.3, y - h + 0.15 * k]]), '#6E5240', 1);
    over(K, circle(x, y + h * 0.95, 0.3 * k), '#6E5240', 1);
    if (lk > 0.6) pen(K, body, 0.55 * lk, 0.2, { double: false });
    if (lit > 0) { glow(K, x, y, 7.5 * k, '#FFC860', 0.5 * lit * tw); glow(K, x, y, 2.3 * k, '#FFF4D0', 0.75 * lit * tw); }
  }

  function drawHan(K, o) {
    const G = hanGeom();
    const H = G.H;
    const { decor, gateGlow, t, simple, lk } = o;
    const C = BWC;
    const pw = 1.0 * lk;
    // paint an opaque part, hide whatever ink/light lies under it, then give it its own pencil contour
    const part = (path, fill, penA = 0.32) => { over(K, path, fill, 1); occlude(K, path, 1); if (penA > 0) pen(K, path, pw, penA); };
    const gg = clamp(gateGlow);
    // ---- domes (behind)
    const shadeDome = (path, box, cx, rib) => {
      glaze(K, path, LG(K.p, box[0], 0, box[0] + box[2], 0, [[0, 'rgba(255,255,255,0)'], [0.5, rgba(C.domeD, 0.12)], [1, rgba(C.domeD, 0.55)]]), 1);
      crescent(K, path, box, -box[2] * 0.28, -box[3] * 0.2, C.domeD, 0.45);
      if (rib && !simple) {
        const ribs = new Path2D();
        for (const u of [-0.66, -0.33, 0, 0.33, 0.66]) { ribs.moveTo(cx + u * box[2] * 0.48, box[1] + box[3]); ribs.quadraticCurveTo(cx + u * box[2] * 0.42, box[1] + box[3] * 0.35, cx + u * box[2] * 0.06, box[1] + box[3] * 0.04); }
        strokeP(K, ribs, C.domeD, 0.32, 0.32);
      }
      // bare-paper highlight streak following the curvature
      const hx = cx - box[2] * 0.22, hy = box[1] + box[3];
      lift(K, smooth([[hx - box[2] * 0.06, hy - 0.4], [hx - box[2] * 0.1, hy - box[3] * 0.45], [hx + box[2] * 0.02, hy - box[3] * 0.82], [hx + box[2] * 0.04, hy - box[3] * 0.45], [hx + box[2] * 0.03, hy - 0.4]], true), 0.5);
    };
    part(G.domeC, C.dome);
    shadeDome(G.domeC, [-11.6, H(57.1), 23.2, 14.9], 0, true);
    pen(K, G.domeC, pw, 0.32);
    part(G.drumC, C.stoneW);
    glaze(K, G.drumC, LG(K.p, -11.2, 0, 11.2, 0, [[0, 'rgba(255,255,255,0)'], [0.6, rgba(C.stoneD, 0.15)], [1, rgba(C.stoneD, 0.6)]]), 1);
    if (!simple) for (let i = -3; i <= 3; i++) over(K, poly(archPts(i * 3, H(40.4), 0.7, 1.1, H(38.7), 4)), '#7C6458', 0.75);
    // alem (finial) with crescent
    over(K, circle(0, H(57.9), 0.95), P.gold, 1);
    strokeP(K, [[0, H(57)], [0, H(60.3)]], P.gold, 0.45, 1, { over: true });
    const cres = new Path2D(); cres.arc(0, H(61.4), 1.25, 0.15 * Math.PI, 1.85 * Math.PI, false); cres.arc(0.62, H(61.4), 1.0, 1.72 * Math.PI, 0.28 * Math.PI, true); cres.closePath();
    over(K, cres, P.gold, 1);
    for (const cx of [-26.5, 26.5]) {
      const d = G.domeW(cx);
      part(d, C.dome, 0);
      shadeDome(d, [cx - 6.6, H(31.6), 13.2, 9.2], cx, false);
      pen(K, d, pw, 0.3);
      over(K, circle(cx, H(32.2), 0.6), P.gold, 1);
    }
    // ---- wings
    for (const [w, x0, x1] of [[G.wingL, -38.5, -14], [G.wingR, 14, 38.5]]) {
      part(w, C.stone, 0);
      glaze(K, w, LG(K.p, 0, H(22), 0, HAN_YB + 3, [[0, 'rgba(255,255,255,0)'], [0.55, 'rgba(255,255,255,0)'], [1, rgba('#A99AB5', 0.42)]]), 1);
      glaze(K, w, LG(K.p, x0, 0, x1, 0, [[0, 'rgba(255,255,255,0)'], [1, rgba(C.stoneD, 0.14)]]), 1);
      pen(K, w, pw, 0.3);
    }
    glaze(K, G.portalShadow, C.stoneD, 0.42);
    part(G.cornice, C.stoneW, 0.26);
    glaze(K, G.corniceSh, C.stoneD, 0.45);
    // windows (dark, or warmly lit)
    for (let i = 0; i < G.win.length; i++) {
      const lit = clamp(gg * 0.5 + decor * 0.3);
      over(K, G.winF[i], C.stoneW, 1);
      over(K, G.win[i], mixc('#5E4A47', '#F2BE62', lit), 1);
      if (lit > 0) glaze(K, G.win[i], LG(K.p, 0, H(12.6), 0, H(3.8), [[0, rgba('#9A6A3A', 0.0)], [1, rgba('#9A6A3A', 0.35)]]), 1);
      pen(K, G.winF[i], pw * 0.7, 0.22, { double: false });
    }
    // ---- towers (in front of the wing ends)
    for (const cx of [-39.5, 39.5]) {
      const tw = G.tower(cx);
      part(tw, C.stone, 0);
      glaze(K, tw, LG(K.p, cx - 5.2, 0, cx + 5.2, 0, [[0, rgba(C.stoneD, 0.06)], [0.32, 'rgba(255,255,255,0)'], [0.6, rgba(C.stoneD, 0.24)], [1, rgba(C.stoneD, 0.62)]]), 1);
      glaze(K, tw, LG(K.p, 0, H(27), 0, HAN_YB + 6, [[0, 'rgba(255,255,255,0)'], [0.6, 'rgba(255,255,255,0)'], [1, rgba('#A99AB5', 0.35)]]), 1);
      pen(K, tw, pw, 0.3);
      over(K, poly(archPts(cx, H(16.5), 0.9, 1.5, H(11.8), 4)), C.inner, 0.85);
      const ring = G.towerRing(cx);
      part(ring, C.stoneW, 0.25);
      glaze(K, ring, C.stoneD, 0.3);
      const cap = G.towerCap(cx);
      part(cap, C.lead, 0);
      crescent(K, cap, [cx - 6, H(35.4), 12, 8], -3.4, -1.8, C.leadD, 0.5);
      lift(K, smooth([[cx - 3.6, H(28.2)], [cx - 4.2, H(31)], [cx - 2.4, H(33.6)], [cx - 2.2, H(30.6)], [cx - 2.6, H(28.2)]], true), 0.45);
      pen(K, cap, pw, 0.3);
      over(K, circle(cx, H(34.9), 0.55), P.gold, 1);
    }
    // ---- portal (taç kapı)
    part(G.portalSide, mixc(C.stoneW, C.stoneD, 0.5), 0.28);
    part(G.portal, C.stoneW, 0);
    glaze(K, G.portal, LG(K.p, 0, H(38), 0, HAN_YB + 3, [[0, 'rgba(255,255,255,0)'], [0.6, 'rgba(255,255,255,0)'], [1, rgba('#A99AB5', 0.36)]]), 1);
    pen(K, G.portal, pw, 0.32);
    part(G.crest, C.stoneW, 0.22);
    part(G.portalCornice, C.stoneW, 0.25);
    glaze(K, G.portalCorniceSh, C.stoneD, 0.45);
    over(K, G.frame, '#EDD3A8', 1);
    pen(K, G.frame, pw * 0.8, 0.24, { double: false });
    if (!simple) {
      // tezhip band: little rosettes / dots in the frame border
      const band = new Path2D();
      for (let i = 0; i < 9; i++) { const x = -11.4 + (i / 8) * 22.8; band.moveTo(x + 0.42, H(34.5)); band.arc(x, H(34.5), 0.42, 0, TAU); }
      for (let i = 0; i < 12; i++) {
        const y = H(32.7) + (i / 11) * (HAN_YB - H(32.7) - 1.2);
        for (const x of [-11.4, 11.4]) { band.moveTo(x + 0.38, y); band.arc(x, y, 0.38, 0, TAU); }
      }
      over(K, band, '#B5774C', 0.8);
      // spandrel rosettes
      for (const x of [-8.7, 8.7]) {
        over(K, circle(x, H(30.4), 1.45), '#5E8FA0', 0.9);
        over(K, circle(x, H(30.4), 0.55), P.gold, 1);
      }
    }
    // the iwan: a deep pointed niche with a muqarnas hood
    part(G.archRim, '#E3C79A', 0.26);
    over(K, G.arch, mixc('#9C7C68', '#D9A866', gg * 0.55), 1);
    glaze(K, G.arch, LG(K.p, 0, H(30.7), 0, HAN_YB, [[0, rgba('#4E3A31', 0.5)], [0.45, rgba('#4E3A31', 0.22)], [1, rgba('#4E3A31', 0.08)]]), 1 - gg * 0.45);
    glaze(K, poly([[2.6, H(29.6)], [8, H(17.5)], [8, HAN_YB + 1.6], [3.4, HAN_YB + 1.6]]), '#5A4038', 0.28);
    if (!simple) {
      over(K, G.muqF, mixc('#CDB08E', '#F3D9A4', gg * 0.6), 1);
      glaze(K, G.muqF, LG(K.p, 0, H(30), 0, H(24), [[0, rgba('#5E4638', 0.0)], [1, rgba('#5E4638', 0.3)]]), 1);
      pen(K, G.muq, pw * 0.55, 0.22, { double: false });
    }
    pen(K, G.arch, pw, 0.34);
    // gate opening
    over(K, G.doorFrame, mixc('#C6A47E', '#F0CB86', gg * 0.6), 1);
    over(K, G.door, mixc(C.inner, '#FFE7AC', gg), 1);
    if (gg > 0.01) {
      glaze(K, G.door, RG(K.p, 0, HAN_YB - 3, 0, 9, [[0, 'rgba(255,255,255,0)'], [1, rgba('#E39A3E', 0.6)]]), gg);
      lift(K, poly(archPts(0, H(8.8), 2.6, 4.0, hanGy(0) + 1.7, 6)), 0.75 * gg, 0.9);
    }
    glaze(K, G.door, LG(K.p, 0, H(17.4), 0, HAN_YB, [[0, rgba('#3D2E2A', 0.55)], [1, rgba('#3D2E2A', 0.12)]]), 1 - gg);
    pen(K, G.door, pw, 0.36);
    // ---- grass fringe + bushes anchoring the façade to the globe
    over(K, G.fringe, '#BFD48C', 1);
    occlude(K, G.fringe, 1);
    glaze(K, G.fringe, LG(K.p, 0, HAN_YB - 1, 0, HAN_YB + 6, [[0, 'rgba(255,255,255,0)'], [1, rgba('#7FA463', 0.28)]]), 1);
    for (const [bx, br] of G.bushes) {
      const by = hanGy(bx) + 2.4;
      const b = blobP(bx, by - br * 0.55, br, { seed: Math.round(bx * 10), irr: 0.18, rx: br * 1.25, ry: br, n: 14 });
      part(b, '#6E9F5D', 0);
      crescent(K, b, [bx - br * 1.4, by - br * 1.8, br * 2.8, br * 2.6], -br * 0.45, -br * 0.4, '#3E6A4C', 0.5);
      if (!simple) pen(K, b, pw * 0.7, 0.2, { double: false });
    }
    // ---- decor: awnings (over the windows)
    if (decor > 0) {
      G.winX.forEach((x, i) => {
        const k = pop(decor, 0.08 + i * 0.09, 0.24);
        if (k <= 0.001) return;
        const col = C.awning[i % 4];
        const top = H(14.4), drop = 3.6 * k;
        const pts = [[x - 4.3, top], [x + 4.3, top]];
        const n = 4;
        for (let j = 0; j <= n * 6; j++) {
          const u = j / (n * 6), xx = x + 5.0 - u * 10.0;
          pts.push([xx, top + drop + Math.abs(Math.sin(u * n * Math.PI)) * 1.1 * k]);
        }
        const aw = poly(pts);
        glaze(K, poly([[x - 4.4, top + drop], [x + 4.4, top + drop], [x + 4.4, top + drop + 2.4], [x - 4.4, top + drop + 2.4]]), '#8F84A0', 0.32 * k, 0.6);
        part(aw, '#FBF4E6', 0);
        K.p.save(); K.p.clip(aw);
        const st = new Path2D();
        for (let j = 0; j < 8; j += 2) { const x0 = x - 5.0 + j * 1.25; st.moveTo(x0, top - 1); st.lineTo(x0 + 1.25, top - 1); st.lineTo(x0 + 1.25 + 0.35, top + 7); st.lineTo(x0 + 0.35, top + 7); st.closePath(); }
        over(K, st, col, 1);
        glaze(K, poly([[x - 6, top + drop - 0.3], [x + 6, top + drop - 0.3], [x + 6, top + 8], [x - 6, top + 8]]), shade(col, -0.4), 0.35);
        K.p.restore();
        pen(K, aw, pw * 0.7, 0.24, { double: false });
      });
    }
    // ---- flags (towers + wing domes), fluttering in a breeze from the left
    const flags = [[-39.5, H(35.4), H(46), 0], [39.5, H(35.4), H(46), 3], [-26.5, H(32.2), H(40), 1], [26.5, H(32.2), H(40), 2]];
    flags.forEach(([fx, y0, y1, ci], i) => {
      const k = pop(decor, 0.04 + [0, 0.07, 0.16, 0.23][i], 0.24);
      if (k <= 0.001 || (simple && i > 1)) return;
      const ytop = lerp(y0, y1, k);
      strokeP(K, [[fx, y0], [fx, ytop]], '#6E5240', 0.45, 1, { over: true });
      pen(K, [[fx, y0], [fx, ytop]], 0.8 * lk, 0.3, { double: false });
      const Lf = (i < 2 ? 8.5 : 6.5) * k, hf = (i < 2 ? 4.0 : 3.2) * k;
      const top = [], bot = [];
      const N = 8;
      for (let j = 0; j <= N; j++) {
        const u = j / N;
        const wv = Math.sin(t * 5.2 - u * 4.2 + i * 1.7) * 0.9 * u + Math.sin(t * 8.3 - u * 7 + i) * 0.3 * u;
        const tw = hf * (1 - u * 0.55);
        top.push([fx + u * Lf, ytop + wv + u * 0.8]);
        bot.push([fx + u * Lf, ytop + tw + wv + u * 0.8]);
      }
      const notch = [fx + Lf * 0.8, (top[N][1] + bot[N][1]) / 2];
      const fp = smooth(top.concat([notch], bot.slice().reverse()), true);
      const col = C.flag[ci];
      over(K, fp, col, 1);
      occlude(K, fp, 1, 1);
      const lower = top.map((p2, j) => [p2[0], p2[1] + hf * (1 - (j / N) * 0.55) * 0.55]);
      glaze(K, smooth(lower.concat([notch], bot.slice().reverse()), true), shade(col, -0.45), 0.4);
      pen(K, fp, pw * 0.7, 0.24, { double: false });
    });
    // ---- lantern strings (catenaries) + the gate lantern
    if (decor > 0) {
      [[[-15.5, H(36.8)], [-39.5, H(28.6)], 0], [[15.5, H(36.8)], [39.5, H(28.6)], 1]].forEach(([A, B, si]) => {
        const kS = pop(decor, 0.18 + si * 0.08, 0.2);
        if (kS <= 0.001) return;
        const sag = 4.2;
        const cpt = (u) => [lerp(A[0], B[0], u), lerp(A[1], B[1], u) + sag * 4 * u * (1 - u)];
        const line = [];
        for (let j = 0; j <= 14; j++) line.push(cpt((j / 14) * clamp(kS * 1.2)));
        pen(K, line, 0.6 * lk, 0.35, { double: false });
        const nL = simple ? 2 : 4;
        for (let j = 0; j < nL; j++) {
          const u = (j + 0.5) / nL;
          const k = pop(decor, 0.3 + si * 0.1 + j * 0.07, 0.22);
          if (k <= 0.001) continue;
          const p0 = cpt(u);
          const sway = Math.sin(t * 2.1 + j * 1.3 + si) * 0.25;
          drawLantern(K, p0[0] + sway, p0[1] + 2.2, k, C.lantern[(j + si) % 4], t, j + si * 5, seg(decor, 0.4 + j * 0.07, 0.6 + j * 0.07), lk);
          pen(K, [[p0[0], p0[1]], [p0[0] + sway, p0[1] + 0.2]], 0.5 * lk, 0.3, { double: false });
        }
      });
      const kg = pop(decor, 0.3, 0.25);
      if (kg > 0.001) {
        const sw = Math.sin(t * 1.7) * 0.15;
        pen(K, [[0, H(29.4)], [sw, H(24.8)]], 0.5 * lk, 0.4, { double: false });
        drawLantern(K, sw, H(23.4), kg * 1.2, '#F2B54A', t, 11, clamp(seg(decor, 0.4, 0.62) + gg), lk);
      }
    }
    // ---- light from the gate
    if (gg > 0.01) {
      glow(K, 0, HAN_YB - 5, 28, '#FFD27A', 0.5 * gg);
      glow(K, 0, HAN_YB - 6, 9, '#FFF0C8', 0.7 * gg);
    }
  }

  /**
   * E.props.bigWorld(L, x, y, r, opts) — see header.
   */
  PR.bigWorld = function bigWorld(L, x, y, r, opts) {
    r = num(r, 300);
    if (!(r > 0.5)) return;
    const o = opts || {};
    const t = num(o.t, 0);
    const decor = clamp(num(o.decor, 1));
    const gateGlow = clamp(num(o.gateGlow, 0));
    const travellers = clamp(num(o.travellers, 0));
    const rot = num(o.rot, 0) + num(o.rotSpeed, 0) * t;
    const aura = clamp(num(o.aura, 1));
    const shadowA = clamp(num(o.shadow, 0));
    drawProp(L, num(x, 0), num(y, 0), r / 100, num(o.alpha, 1), (K) => {
    const rpx = 100 * K.s;
    const simple = o.simple === true || (o.simple !== false && rpx < 150);
    const lk = lineK(rpx * 1.2);
    const M = bwModel();
    const S = bwSurface(M, rot, simple);
    const disc = circle(0, 0, 100);
    const cr = Math.cos(rot), sr = Math.sin(rot);
    // ---------- aura (soft light around the globe), optional ground shadow
    if (aura > 0) {
      fillP(K, circle(0, 0, 150), RG(K.p, 0, 0, 96, 150, [[0, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]), aura, { over: true });
      glaze(K, circle(0, 0, 150), RG(K.p, -10, -12, 92, 150, [[0, rgba('#F2D9A2', 0.3)], [0.45, rgba('#F2D9A2', 0.1)], [1, rgba('#F2D9A2', 0)]]), aura);
      glow(K, -10, -10, 190, '#FFE9BF', 0.2 * aura);
    }
    if (shadowA > 0) glaze(K, ellipse(4, 132, 70, 9), RG(K.p, 4, 132, 0, 70, [[0, rgba('#8F8CA8', 0.6)], [1, rgba('#8F8CA8', 0)]]), shadowA, 3);
    // ---------- objects on the globe: place + sort. Those just behind the limb are drawn before the disc (so
    // only their tops peek over the horizon as the globe turns); the rest after the surface.
    const items = [];
    const place = (v) => {
      const n = toView(v, cr, sr);
      if (n[2] < -0.4) return null;
      const B = [n[0] * 100, -n[1] * 100];
      const w = Math.sqrt(Math.max(0, 1 - n[2] * n[2]));
      const radial = Math.atan2(n[0], n[1]);
      const ang = clamp(radial, -1.75, 1.75) * sstep(0.68, 1.02, w); // icons stand upright on the face, lean out only near the limb
      return { n, B, w, ang, lam: dot3(norm3([n[0], n[1], Math.max(0, n[2])]), LDIR) };
    };
    for (const ob of M.objects) {
      if (simple && ob.type === 'house' && ob.seed % 2) continue;
      if (simple && ob.type === 'tree' && ob.seed % 3 === 0) continue;
      const pl = place(ob.v);
      if (pl) items.push({ ob, pl });
    }
    for (const fl of M.flowers) {
      const k = pop(decor, fl.tau, 0.22);
      if (k <= 0.001) continue;
      const pl = place(fl.v);
      if (pl && pl.n[2] > 0) items.push({ ob: { type: 'flowers', fl, k }, pl });
    }
    if (travellers > 0.001 && !simple) {
      const sp = 0.075 * num(o.walk, 1);
      const tot = M.road.cum[M.road.cum.length - 1];
      M.trav.forEach((tv, i) => {
        const sPos = tv.s + t * sp;
        const sm = ((sPos % tot) + tot) % tot;
        if (sm > M.road.gateS - 0.002 && sm < M.road.exitS + 0.004) return; // inside the han
        const a0 = alongPath(M.road.cl, M.road.cum, sPos), a1 = alongPath(M.road.cl, M.road.cum, sPos + 0.01);
        const pl = place(a0.v);
        if (!pl) return;
        const n1 = toView(a1.v, cr, sr);
        const facing = n1[0] * 100 - pl.B[0] >= 0 ? 1 : -1;
        items.push({ ob: { type: 'trav', tv, facing, phase: sPos * 36 }, pl });
      });
    }
    items.sort((a, b) => a.pl.n[2] - b.pl.n[2]);
    const lkO = simple ? 0 : lk * 0.9;
    const drawItem = ({ ob, pl }) => {
      const f = 0.45 + 0.55 * pl.w;
      if (ob.type === 'tree') bwTree(K, ob, pl.B, [pl.n[0], -pl.n[1]], pl.ang, pl.lam, lkO);
      else if (ob.type === 'cypress') bwCypress(K, ob, pl.B, pl.ang, f, pl.lam, lkO);
      else if (ob.type === 'house') bwHouse(K, ob, pl.B, pl.ang, f, pl.lam, lkO);
      else if (ob.type === 'flowers') bwFlowers(K, ob.fl, pl.B, pl.n, ob.k, pl.lam);
      else if (ob.type === 'trav') {
        const sub = { ...K, a: K.a * travellers };
        bwTraveller(sub, pl.B, pl.ang, 5.2, ob.facing, ob.phase, ob.tv.col, ob.tv.kind, ob.tv.pack, lkO);
      }
    };
    for (const it of items) if (it.pl.n[2] < 0 && it.ob.type !== 'flowers') drawItem(it);
    // ---------- sphere base
    occlude(K, disc, 1);
    over(K, disc, LG(K.p, -60, -70, 60, 80, [[0, BWC.baseL], [0.55, BWC.baseM], [1, BWC.baseD]]), 1);
    // ---------- surface (clipped to the disc)
    K.p.save();
    K.p.clip(disc);
    for (const it of S.patches) glaze(K, it.path, it.f.col, it.f.a, simple ? 0 : 1.6);
    for (const it of S.fields) {
      over(K, it.path, it.f.col, 0.9);
      glaze(K, it.path, LG(K.p, -70, -70, 70, 70, [[0, 'rgba(255,255,255,0)'], [1, rgba(it.f.rowCol, 0.25)]]), 1);
      if (!simple && it.f.rows.length) {
        K.p.save(); K.p.clip(it.path);
        strokeP(K, it.rows, it.f.rowCol, 0.5, 0.5);
        K.p.restore();
      }
    }
    // lakes + river
    const water = (pth) => { over(K, pth, BWC.river, 1); glaze(K, pth, LG(K.p, 0, -100, 0, 100, [[0, 'rgba(255,255,255,0)'], [1, rgba('#4F7FAE', 0.38)]]), 1); };
    S.rivers.forEach(water);
    if (!simple) S.rivHL.forEach((hp) => lift(K, hp, 0.5));
    S.lakes.forEach(water);
    // road
    for (const rp of S.road) over(K, rp, BWC.roadC, 1);
    for (const rp of S.road) glaze(K, rp, LG(K.p, -80, -80, 80, 80, [[0, 'rgba(255,255,255,0)'], [1, rgba(BWC.roadE, 0.35)]]), 1);
    if (!simple) for (const rp of S.road) strokeP(K, rp, BWC.roadE, 0.32, 0.4);
    // forecourt in front of the gate
    const fc = ellipse(0, HAN_YB + 2.6, 11, 3.0);
    over(K, fc, '#EBDDC2', 1);
    glaze(K, fc, LG(K.p, 0, HAN_YB, 0, HAN_YB + 6, [[0, rgba('#A3906F', 0.0)], [1, rgba('#A3906F', 0.35)]]), 1);
    if (gateGlow > 0) glaze(K, smooth([[-4.6, HAN_YB + 1.2], [4.6, HAN_YB + 1.2], [9.5, HAN_YB + 6.5], [-9.5, HAN_YB + 6.5]], true), '#F6C35E', 0.45 * gateGlow, 1.6);
    // ---------- sphere shading: soft volume, one hard-edged shadow glaze, a core shadow that stops short of the rim
    glaze(K, disc, RG(K.p, -36, -42, 10, 150, [[0, 'rgba(255,255,255,0)'], [0.45, 'rgba(255,255,255,0)'], [0.8, rgba(BWC.shadow, 0.26)], [1, rgba(BWC.shadow, 0.4)]]), 1);
    const sh1 = blobP(0, 0, 100, { seed: 21, irr: 0.02, n: 40 });
    crescent(K, sh1, [-100, -100, 200, 200], -30, -36, BWC.shadow, 0.34, 0, 1.08);
    K.p.save();
    K.p.clip(circle(5, 6, 92));
    crescent(K, sh1, [-100, -100, 200, 200], -14, -17, BWC.shadowD, 0.2, 2.5, 1.02);
    K.p.restore();
    // bare-paper bloom on the sunny side
    lift(K, blobP(-40, -46, 26, { seed: 31, irr: 0.25, rx: 30, ry: 22, rot: -0.7 }), 0.3, 9);
    lift(K, blobP(-48, -52, 9, { seed: 33, irr: 0.3, rx: 10, ry: 6, rot: -0.7 }), 0.38, 2.5);
    K.p.restore();
    // ---------- front objects
    for (const it of items) if (it.pl.n[2] >= 0) drawItem(it);
    // ---------- pencil contour of the globe (broken, sketchy) + faint equator construction line
    const arcs = [[-2.75, -0.15], [0.05, 1.5], [1.65, 3.45]];
    for (const [a0, a1] of arcs) {
      const pts = [];
      for (let i = 0; i <= 28; i++) { const a = lerp(a0, a1, i / 28); const rr = 100.3 + 0.6 * noise1(a * 3, 4); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      pen(K, pts, 1.1 * lk, 0.3);
    }
    if (!simple) {
      const eq = [];
      for (let i = 0; i <= 40; i++) { const a = -1.45 + 2.9 * (i / 40); eq.push([Math.sin(a) * 99.5, Math.cos(a) * 99.5 * sT]); }
      pen(K, eq, 0.8 * lk, 0.07, { double: false });
    }
    // ---------- the han on top
    drawHan(K, { decor, gateGlow, t, simple, lk });
    glow(K, -46, -52, 60, '#FFF3D6', 0.12);
    });
  };

  /** screen position of the han gate (centre of the gate opening) for a world drawn at (x, y, r) */
  PR.bigWorldGate = function bigWorldGate(x, y, r) {
    const s = num(r, 300) / 100;
    return [num(x, 0) + HAN_GATE[0] * s, num(y, 0) + HAN_GATE[1] * s];
  };
  // =====================================================================================================
  //  shared plant helpers
  // =====================================================================================================
  /** tapered ribbon polygon along a smooth curve through pts, width w0 → w1 */
  function taper(pts, w0, w1, sub = 6) {
    const c = pts.length > 2 ? catmullPts(pts, false, sub) : E.subdivide(pts, Math.max(0.5, Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) / 6), false);
    const n = c.length;
    const L2 = [], R2 = [];
    for (let i = 0; i < n; i++) {
      const a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1;
      nx /= l; ny /= l;
      const w = lerp(w0, w1, i / (n - 1)) / 2;
      L2.push([c[i][0] + nx * w, c[i][1] + ny * w]);
      R2.push([c[i][0] - nx * w, c[i][1] - ny * w]);
    }
    return smooth(L2.concat(R2.reverse()), true);
  }
  /** point + tangent along a quadratic bezier */
  const qbez = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
  /** almond leaf path: base at (0,0), pointing along -y, length l, width w (local frame) */
  function leafPts(l, w, curl = 0) {
    return [[0, 0], [w * 0.5, -l * 0.25], [w * 0.42 + curl * l * 0.1, -l * 0.62], [curl * l * 0.2, -l], [-w * 0.38 + curl * l * 0.1, -l * 0.6], [-w * 0.5, -l * 0.22]];
  }
  function xf(pts, x, y, ang, s = 1, sy = s) {
    const c = Math.cos(ang), si = Math.sin(ang);
    return pts.map((p) => [x + (p[0] * s) * c - (p[1] * sy) * si, y + (p[0] * s) * si + (p[1] * sy) * c]);
  }
  /** shear all three layers (x += k·(-y)): gentle sway about the current origin */
  function shearL(K, k) { for (const c of [K.p, K.k, K.l]) c.transform(1, 0, -k, 1, 0, 0); }
  function withAll(K, fn) { K.p.save(); K.k.save(); K.l.save(); try { fn(); } finally { K.p.restore(); K.k.restore(); K.l.restore(); } }
  function moveAll(K, x, y, ang = 0, s = 1) { for (const c of [K.p, K.k, K.l]) { c.translate(x, y); if (ang) c.rotate(ang); if (s !== 1) c.scale(s, s); } }

  // =====================================================================================================
  //  3. TREE
  // =====================================================================================================
  const TREE_COL = { round: '#7DAE60', cypress: '#4F8B5C', fruit: '#74A85B', blossom: '#EFC3CB' };
  function treeModel(kind, seed) {
    return memo('tree:' + kind + ':' + seed, () => {
      const r = E.rng(seed * 7919 + kind.length * 131 + 3);
      const M = { kind, lobes: [], branches: [], fruits: [], dabs: [], leaves: [] };
      if (kind === 'cypress') {
        const lean = (r() - 0.5) * 3;
        M.trunk = taper([[0, 1.5], [lean * 0.2, -4], [lean * 0.3, -9]], 4.2, 2.8);
        const N = 72;
        const width = (u) => 12.5 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.9) * (1 - 0.15 * u) * (1 + 0.06 * noise1(u * 9, seed + 2));
        // feathered edge: foliage tufts whose tips point up and out (slow rise, quick return = a sawtooth)
        const tuft = (u, side) => {
          const f = u * 10 + side * 0.41 + 0.4 * noise1(u * 17, seed + 5 + side);
          const fr = f - Math.floor(f);
          const amp = 0.45 + 1.1 * (0.5 + 0.5 * noise1(Math.floor(f) * 1.7 + side * 9, seed + 9));
          return Math.pow(Math.sin(fr * Math.PI * 0.5), 2.2) * (1 - sstep(0.88, 1, fr)) * amp * sstep(0.02, 0.12, u) * (1 - sstep(0.9, 0.99, u));
        };
        const yb = -5, yt = -100;
        const left = [], right = [];
        for (let i = 0; i <= N; i++) {
          const u = i / N, w = width(u);
          left.push([lean * u - w - tuft(u, 0) * (0.2 + 0.085 * w), lerp(yb, yt, u)]);
          right.push([lean * u + w + tuft(u, 1) * (0.2 + 0.085 * w), lerp(yb, yt, u)]);
        }
        right.reverse();
        M.body = left.concat(right);
        M.bodyR = right;
        // vertical tufts (foliage clumps) for texture
        for (let i = 0; i < 9; i++) {
          const u = 0.12 + (i / 9) * 0.78;
          const side = i % 2 ? 1 : -1;
          M.lobes.push({ x: lean * u + side * (2 + r() * 4), y: lerp(yb, yt, u), rx: 5 + r() * 2.5, ry: 10 + r() * 5, side, tau: 0.25 + u * 0.55 });
        }
        M.yb = yb; M.yt = yt; M.lean = lean;
        return M;
      }
      const fruit = kind === 'fruit', bl = kind === 'blossom';
      const cy = fruit ? -62 : bl ? -64 : -66;
      const R = fruit ? 33 : bl ? 32 : 30;
      const cx = (r() - 0.5) * 4;
      M.crown = [cx, cy, R];
      const T = [[0, -0.05, 0.7], [-0.6, 0.18, 0.54], [0.6, 0.15, 0.56], [-0.3, -0.6, 0.5], [0.33, -0.56, 0.52], [0.02, 0.4, 0.46], [-0.78, -0.22, 0.4], [0.78, -0.26, 0.42], [-0.05, -0.92, 0.36]];
      T.forEach((tp, i) => {
        M.lobes.push({ x: cx + tp[0] * R + (r() - 0.5) * 5, y: cy + tp[1] * R + (r() - 0.5) * 4, r: tp[2] * R * (0.9 + r() * 0.2), seed: seed * 10 + i, tau: 0.26 + (i / T.length) * 0.46 + r() * 0.04, tauF: r() * 0.5 });
      });
      const top = [cx * 0.6 + (r() - 0.5) * 3, cy + R * 0.42];
      M.trunk = taper([[0, 1.5], [1.5 + (r() - 0.5) * 3, -18], [top[0], top[1]]], 8.5, 4.6);
      M.trunkTop = top;
      // branches from the trunk top toward the main lobes (seen when the crown thins)
      const br = [[1, 0.78], [2, 0.8], [3, 0.72], [4, 0.74], [6, 0.82], [7, 0.82], [8, 0.7]];
      for (const [li, f] of br) {
        const lb = M.lobes[li];
        const end = [lerp(top[0], lb.x, f), lerp(top[1], lb.y, f)];
        const mid = [lerp(top[0], end[0], 0.45) + (end[0] - top[0]) * 0.1, lerp(top[1], end[1], 0.6) + 4];
        M.branches.push({ pts: [[top[0], top[1] + 3], mid, end], w0: 3.6, w1: 1.0, li });
        // twig
        const tw = [end[0] + (end[0] - top[0]) * 0.25 + (r() - 0.5) * 6, end[1] - 6 - r() * 6];
        M.branches.push({ pts: [mid, [lerp(mid[0], tw[0], 0.5), lerp(mid[1], tw[1], 0.5) - 2], tw], w0: 1.6, w1: 0.5, li });
      }
      // fruits sit on the lower / outer parts of the lobes
      const nF = fruit ? 13 : 0;
      for (let i = 0; i < nF; i++) {
        const lb = M.lobes[i % 8];
        const a = lerp(0.1, 0.9, r()) * Math.PI + (r() < 0.3 ? Math.PI : 0) * 0.6;
        const d = lb.r * (0.45 + r() * 0.42);
        M.fruits.push({ x: lb.x + Math.cos(a) * d, y: lb.y + Math.sin(a) * d * 0.9, r: 3.1 + r() * 0.9, tau: r() * 0.5, ph: r() * TAU });
      }
      for (let i = 0; i < 22; i++) {
        const lb = M.lobes[Math.floor(r() * M.lobes.length)];
        const lt = i % 3 === 0;
        const a = lt ? lerp(3.6, 5.0, r()) : lerp(-0.4, 2.0, r());
        const d = lt ? 0.5 + r() * 0.3 : 0.62 + r() * 0.25;
        M.dabs.push({ x: lb.x + Math.cos(a) * lb.r * d, y: lb.y + Math.sin(a) * lb.r * d, r: 2.2 + r() * 2.2, a: a + Math.PI / 2 + (r() - 0.5) * 0.6, li: M.lobes.indexOf(lb), lt });
      }
      for (let i = 0; i < 14; i++) M.leaves.push({ x: cx + (r() - 0.5) * R * 1.6, y: cy + (r() - 0.3) * R * 1.1, ph: r(), sp: 0.16 + r() * 0.12, dr: (r() - 0.5) * 30, rot: r() * TAU, tau: r() });
      return M;
    });
  }
  function treeSway(t, seed, amp) { return amp * (0.022 * Math.sin(t * 1.05 + seed * 1.7) + 0.01 * Math.sin(t * 2.35 + seed * 0.7)); }
  function treeGrowth(g) { return { s: lerp(0.16, 1, outCubic(seg(g, 0.05, 0.8))), sap: 1 - sstep(0.16, 0.3, g) }; }

  function drawCypress(K, M, col0, g, lf, t, lk, n = 0) {
    const gs = treeGrowth(g);
    const col = nightC(col0, n);
    withAll(K, () => {
      if (gs.s !== 1) moveAll(K, 0, 0, 0, gs.s);
      over(K, M.trunk, nightC('#7A5A44', n), 1);
      occlude(K, M.trunk, 1);
      const body = smooth(M.body, true);
      const fall = 1 - lf * 0.85;
      // base + lit side
      over(K, body, mixc(shade(col, 0.18), nightC('#C9A35A', n), lf * 0.6), fall);
      occlude(K, body, fall);
      K.p.save(); K.p.clip(body);
      // shadow side: right half with a hard wobbly terminator
      const term = [];
      for (let i = 0; i <= 14; i++) { const u = i / 14; term.push([M.lean * u + 1.5 + 2.2 * noise1(u * 7, 3), lerp(M.yb + 4, M.yt - 4, u)]); }
      glaze(K, smooth(term.concat([[40, M.yt - 4], [40, M.yb + 6]]), true), mixc(col, '#B98A45', lf * 0.6), 0.85 * fall);
      glaze(K, smooth(term.map((p) => [p[0] + 5.5, p[1]]).concat([[40, M.yt - 4], [40, M.yb + 6]]), true), shade(col, -0.45), 0.55 * fall);
      // foliage tufts
      for (const lb of M.lobes) {
        const k = pop(g, lb.tau * 0.6, 0.3);
        if (k <= 0) continue;
        const b = blobP(lb.x, lb.y, lb.rx, { rx: lb.rx * k, ry: lb.ry * k, seed: Math.round(lb.y), irr: 0.18, n: 14 });
        if (lb.side > 0) glaze(K, b, shade(col, -0.3), 0.22 * fall, 0.8);
        else over(K, blobP(lb.x - lb.rx * 0.2, lb.y - lb.ry * 0.2, lb.rx * 0.5, { rx: lb.rx * 0.45 * k, ry: lb.ry * 0.55 * k, seed: Math.round(lb.y) + 3, irr: 0.25, n: 10 }), shade(col, 0.32), 0.35 * fall);
      }
      // feathery foliage marks pointing up and out: dark on the shadow side, light on the lit side
      if (lk > 0 || K.s > 0.6) {
        const dk = new Path2D(), lt = new Path2D();
        for (let k = 0; k < 26; k++) {
          const u = 0.08 + (k / 26) * 0.84, y = lerp(M.yb, M.yt, u), w = 12.5 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.9) * (1 - 0.15 * u);
          const sd = k % 2 ? 1 : -1, jx = noise1(k * 1.9, 7) * w * 0.18;
          const x = M.lean * u + sd * w * (0.42 + 0.12 * noise1(k * 2.7, 8)) + jx;
          (sd > 0 ? dk : lt).addPath(smooth(xf(leafPts(6 + w * 0.3, 2.6 + w * 0.12, sd * 0.1), x, y + 3, sd * 0.55), true));
        }
        glaze(K, dk, shade(col, -0.42), 0.4 * fall);
        over(K, lt, shade(col, 0.34), 0.3 * fall);
      }
      lift(K, smooth([[-6, -20], [-8.5, -45], [-6, -72], [-3.5, -50], [-3.5, -26]], true), 0.22 * fall * (1 - 0.6 * n), 1.2);
      K.p.restore();
      if (lk > 0) pen(K, body, 1.0 * lk, 0.3 * fall);
    });
  }

  function drawRoundTree(K, M, kind, col, o, lk) {
    const { g, lf, t, fruit, fruitColor } = o;
    const n = o.n || 0;
    const N = (c) => nightC(c, n);
    const gs = treeGrowth(g);
    const bl = kind === 'blossom';
    const autumn = bl ? 0 : sstep(0.0, 0.55, lf);
    const c0 = mixc(col, '#D6A24C', autumn * 0.75);
    const light = N(bl ? '#FBE9EC' : mixc(shade(c0, 0.24), '#EAE39E', 0.18));
    const mid = N(c0);
    const deep = N(bl ? '#C27A8E' : shade(mixc(c0, '#2F5E52', 0.25), -0.45));
    withAll(K, () => {
      if (gs.s !== 1) moveAll(K, 0, 0, 0, gs.s);
      const unfold = sstep(0.12, 0.6, g);
      // trunk + branches (the branches show wherever the crown is thin or has fallen)
      const wood = new Path2D();
      wood.addPath(M.trunk);
      for (const b of M.branches) {
        const tp = M.trunkTop;
        const pts = b.pts.map((p) => [lerp(tp[0], p[0], unfold), lerp(tp[1] + (p[1] - tp[1]) * 0.25, p[1], unfold)]);
        wood.addPath(taper(pts, b.w0, b.w1, 4));
      }
      over(K, wood, N('#7E5D45'), 1);
      occlude(K, wood, 1);
      glaze(K, wood, LG(K.p, -6, 0, 8, 0, [[0, 'rgba(255,255,255,0)'], [0.55, 'rgba(255,255,255,0)'], [1, rgba('#3E2E2A', 0.55)]]), 1);
      if (lk > 0) pen(K, M.trunk, 1.0 * lk, 0.3);
      // crown lobes: pop in with growth; with leafFall every lobe shrinks away at its own moment (the crown stays
      // opaque — no translucent ghost — and the branches appear between the remaining clumps)
      const lobes = [], full = [];
      M.lobes.forEach((lb, i) => {
        const k = pop(g, lb.tau, 0.26);
        if (k <= 0.01) return;
        const jx = Math.sin(t * 1.6 + i * 1.9) * 0.6, jy = Math.cos(t * 1.3 + i) * 0.35;
        const f0 = 0.05 + lb.tauF * 0.8, kf = 1 - sstep(f0, f0 + 0.22, lf);
        full.push({ ...lb, x: lb.x + jx, y: lb.y + jy, rr: lb.r * k, f0 });
        if (k * kf <= 0.05) return;
        // a falling clump goes ragged as it thins (it never shrinks into a smooth ball)
        lobes.push({ ...lb, x: lb.x + jx, y: lb.y + jy, rr: lb.r * k * lerp(0.55, 1, kf), path: blobP(lb.x + jx, lb.y + jy, lb.r * k * lerp(0.55, 1, kf), { seed: lb.seed + (kf < 1 ? 3 : 0), irr: (bl ? 0.16 : 0.1) + 0.3 * (1 - kf), n: kf < 1 ? 30 : 22 }) });
      });
      if (full.length && lf > 0.02) {
        // the crown breaks up into single leaves (petals) around each shrinking clump before they fall
        const r = E.rng(M.lobes[0].seed * 3 + 1);
        const lv = new Path2D(), lvD = new Path2D();
        for (let i = 0; i < 170; i++) {
          const lb = full[i % full.length];
          const a = r() * TAU, d = Math.sqrt(r()) * lb.rr * 1.04;
          const th = lb.f0 + 0.14 + r() * 0.5, rot = r() * TAU, sw = r();
          if (lf < lb.f0 - 0.03 || lf > th) continue;
          const lx = lb.x + Math.cos(a) * d, ly = lb.y + Math.sin(a) * d;
          (sw > 0.45 ? lv : lvD).addPath(bl ? ellipse(lx, ly, 1.9, 1.3, rot) : smooth(xf(leafPts(5.4, 3.2, 0.2), lx, ly, rot), true));
        }
        const sp = sstep(0.02, 0.2, lf);
        over(K, lv, light, sp);
        over(K, lvD, bl ? N('#EBA9B9') : mid, sp);
      }
      if (lobes.length) {
        const crown = new Path2D();
        lobes.forEach((lb) => crown.addPath(lb.path));
        over(K, crown, light, 1);
        occlude(K, crown, 1);
        const [ccx, ccy, R] = M.crown;
        const box = [ccx - R * 1.6, ccy - R * 1.6, R * 3.2, R * 3.2];
        // value structure: light top-left, one lobed mid-tone terminator (the crown's own silhouette shifted toward
        // the light), dark pockets under the lower clumps, a deep underside
        crescentU(K, crown, box, -R * 0.3, -R * 0.36, mid, bl ? 0.6 : 0.9);
        for (const lb of lobes) {
          if (lb.y < ccy - R * 0.25) continue;
          crescent(K, lb.path, box, -lb.rr * 0.18, -lb.rr * 0.34, deep, bl ? 0.14 : 0.24, 1.4);
        }
        crescentU(K, crown, box, -R * 0.06, -R * 0.3, deep, bl ? 0.3 : 0.5, 0.9);
        // leaf dabs: dark accents under the clumps, paper accents on their lit side
        const dabs = new Path2D(), lights = new Path2D();
        for (const d of M.dabs) {
          const lb = lobes.find((x2) => x2.seed === M.lobes[d.li].seed);
          if (!lb) continue;
          const k = lb.rr / lb.r;
          const dk = d.lt ? 0.55 : 1;
          (d.lt ? lights : dabs).addPath(blobP(lb.x + (d.x - M.lobes[d.li].x) * k, lb.y + (d.y - M.lobes[d.li].y) * k, d.r * k * dk, { seed: Math.round(d.a * 100), irr: 0.3, rx: d.r * 1.3 * k * dk, ry: d.r * 0.8 * k * dk, rot: d.a, n: 10 }));
        }
        K.p.save(); K.p.clip(crown);
        glaze(K, dabs, bl ? N('#D88E9F') : deep, bl ? 0.33 : 0.24);
        lift(K, lights, (bl ? 0.5 : 0.28) * (1 - 0.6 * n));
        K.p.restore();
        if (bl) {
          // blossom clusters: white + rose flecks
          const r = E.rng(77);
          const fl = new Path2D(), fr = new Path2D();
          for (let i = 0; i < 46; i++) {
            const lb = lobes[Math.floor(r() * lobes.length)];
            const a = r() * TAU, d = Math.sqrt(r()) * lb.rr * 0.8;
            const fx = lb.x + Math.cos(a) * d, fy = lb.y + Math.sin(a) * d;
            const s2 = 0.7 + r() * 0.9;
            const litSide = fx - ccx + fy - ccy < R * 0.2;
            if (i % 4 === 0) fr.addPath(circle(fx, fy, s2 * 0.8));
            else if (litSide) for (let j = 0; j < 3; j++) fl.addPath(circle(fx + Math.cos(j * 2.1 + i) * s2, fy + Math.sin(j * 2.1 + i) * s2, s2 * 0.85));
          }
          over(K, fl, N('#FFFDFB'), 0.85);
          over(K, fr, N('#D9667C'), 0.7);
        }
        // fruits (they go with the leaves)
        const fruitK = fruit * (1 - sstep(0.25, 0.7, lf));
        if (fruitK > 0.001 && M.fruits.length) {
          for (const f of M.fruits) {
            const k = sstep(f.tau * 0.6, f.tau * 0.6 + 0.4, fruitK);
            if (k <= 0.01) continue;
            const rr = f.r * lerp(0.45, 1, k);
            const fy = f.y + Math.sin(t * 1.6 + f.ph) * 0.4;
            const fcol = N(mixc('#A9C46A', fruitColor, sstep(0.25, 0.9, k)));
            const fp = circle(f.x, fy, rr);
            over(K, fp, fcol, 1);
            occlude(K, fp, 1);
            crescent(K, fp, [f.x - rr, fy - rr, rr * 2, rr * 2], -rr * 0.4, -rr * 0.45, shade(fcol, -0.45), 0.6);
            lift(K, circle(f.x - rr * 0.35, fy - rr * 0.38, rr * 0.28), 0.75);
            over(K, poly([[f.x - rr * 0.32, fy - rr * 0.85], [f.x, fy - rr * 1.25], [f.x + rr * 0.32, fy - rr * 0.85]]), shade(fcol, -0.35), 1);
            if (lk > 0.6) pen(K, fp, 0.7 * lk, 0.22, { double: false });
            if (k > 0.75) glow(K, f.x, fy, rr * 3.2, '#FFD9A0', 0.28 * sstep(0.75, 1, k));
          }
        }
        // pencil: contour of every lobe, then erase what falls inside the crown (lost & found outline)
        if (lk > 0) {
          lobes.forEach((lb) => pen(K, lb.path, 1.0 * lk, 0.3, { double: false }));
          for (const lb of lobes) {
            const m = new DOMMatrix().translate(lb.x, lb.y).scale(0.95).translate(-lb.x, -lb.y);
            const inner = new Path2D(); inner.addPath(lb.path, m);
            occlude({ ...K, a: 1 }, inner, 1, 1);
          }
        }
      }
    });
  }

  function drawFallingLeaves(K, M, col, lf, t, g, sc, petals = false, n = 0) {
    if (lf <= 0.01) return;
    const act = sstep(0.0, 0.12, lf) * (1 - 0.6 * sstep(0.85, 1, lf));
    const cnt = Math.round(M.leaves.length * clamp(lf * 1.6));
    const cc = nightC(petals ? '#F2C4CF' : mixc(col, '#D6A24C', 0.6), n), cc2 = petals ? nightC('#FFF3F5', n) : shade(cc, -0.2);
    for (let i = 0; i < cnt; i++) {
      const lv = M.leaves[i];
      const u = (((t * lv.sp + lv.ph) % 1) + 1) % 1;
      const x = (lv.x + Math.sin(u * 7 + i) * 6 + lv.dr * u) * sc;
      const y = lerp(lv.y * sc, -1.5, u);
      const a = act * (1 - sstep(0.85, 1, u));
      if (a <= 0.01) continue;
      const rot = lv.rot + t * 2.2 + i;
      const p = petals ? ellipse(x, y, 2.2, 1.4, rot) : smooth(xf(leafPts(5.5, 3.2, 0.2), x, y, rot), true);
      over(K, p, i % 3 ? cc : cc2, a);
    }
    // a few fallen leaves (petals) on the ground
    const r = E.rng(9);
    const ng = Math.round(10 * lf);
    for (let i = 0; i < ng; i++) {
      const x = (r() - 0.5) * 50 * sc, y = -0.5 - r() * 2;
      over(K, ellipse(x, y, 2.6 * sc, 1.0 * sc, (r() - 0.5) * 0.6), petals ? mixc(cc, cc2, r()) : nightC(mixc(cc, '#B97F3E', r()), n), 0.85);
    }
  }

  /**
   * E.props.tree(L, x, y, h, opts) — watercolour tree. (x, y) = foot of the trunk (ground point), h = full height.
   */
  PR.tree = function tree(L, x, y, h, opts) {
    h = num(h, 300);
    if (!(h > 0.5)) return;
    const o = opts || {};
    const kind = kindOf(o.kind, ['round', 'cypress', 'fruit', 'blossom'], 'round');
    const seed = Math.round(num(o.seed, 1));
    const t = num(o.t, 0);
    const g = clamp(num(o.growth, 1));
    const lf = clamp(num(o.leafFall, 0));
    const col = colorOf(o.color, TREE_COL[kind]);
    const fruit = clamp(num(o.fruit, kind === 'fruit' ? 1 : 0));
    const fruitColor = colorOf(o.fruitColor, '#D1453F');
    const night = clamp(num(o.night, 0));
    drawProp(L, num(x, 0), num(y, 0), h / 100, num(o.alpha, 1), (K) => {
    const hpx = 100 * K.s;
    const lk = hpx < 60 ? 0 : lineK(hpx * 0.9);
    const M = treeModel(kind === 'fruit' ? 'fruit' : kind, seed);
    const gs = treeGrowth(g);
    // contact shadow
    const shA = clamp(num(o.shadow, 1));
    if (shA > 0) {
      const w = (kind === 'cypress' ? 12 : 26) * gs.s;
      const sc = nightC('#6C7B5E', night);
      glaze(K, ellipse(w * 0.25, 0.6, w, w * 0.16), RG(K.p, w * 0.25, 0.6, 0, w, [[0, rgba(sc, 0.5)], [1, rgba(sc, 0)]]), shA);
    }
    withAll(K, () => {
      shearL(K, treeSway(t, seed, num(o.sway, 1)) * (kind === 'cypress' ? 1.2 : 1));
      if (gs.sap > 0.001) drawSapling(K, Math.min(1, g / 0.3), t, seed, lk, gs.sap, 0.42, false);
      if (gs.sap < 0.999) {
        const sub = { ...K, a: K.a * (1 - gs.sap) };
        if (kind === 'cypress') drawCypress(sub, M, col, g, lf, t, lk, night);
        else drawRoundTree(sub, M, kind, col, { g, lf, t, fruit, fruitColor, n: night }, lk);
        if (kind !== 'cypress') drawFallingLeaves(sub, M, col, lf, t, g, gs.s, kind === 'blossom', night);
      }
    });
    });
  };

  /** screen positions of the fruits of a tree drawn with the same arguments: [{x, y, r, ripe}] */
  PR.treeFruits = function treeFruits(x, y, h, opts) {
    const o = opts || {};
    const kind = kindOf(o.kind, ['round', 'cypress', 'fruit', 'blossom'], 'round');
    if (kind !== 'fruit') return [];
    const seed = Math.round(num(o.seed, 1)), t = num(o.t, 0), s = num(h, 300) / 100;
    const M = treeModel('fruit', seed);
    const gs = treeGrowth(clamp(num(o.growth, 1)));
    const k = treeSway(t, seed, num(o.sway, 1));
    const fruit = clamp(num(o.fruit, 1)) * (1 - sstep(0.25, 0.7, clamp(num(o.leafFall, 0))));
    return M.fruits.map((f) => {
      const fx = f.x * gs.s, fy = (f.y + Math.sin(t * 1.6 + f.ph) * 0.4) * gs.s;
      const ripe = sstep(f.tau * 0.6, f.tau * 0.6 + 0.4, fruit);
      return { x: num(x, 0) + (fx - k * fy) * s, y: num(y, 0) + fy * s, r: f.r * lerp(0.45, 1, ripe) * gs.s * s, ripe };
    });
  };

  // =====================================================================================================
  //  4. SAPLING
  // =====================================================================================================
  /** draws a sapling in the current local frame (soil point at 0,0; full height 100 units × sc) */
  function drawSapling(K, g, t, seed, lk, alpha = 1, sc = 1, soil = true) {
    const a = alpha;
    if (a <= 0.003) return;
    const r = E.rng(seed * 31 + 7);
    const sway = Math.sin(t * 1.3 + seed) * 2.2 * sc;
    if (soil) {
      const mound = smooth([[-24 * sc, 1.5], [-15 * sc, -3.5 * sc], [0, -5.5 * sc], [15 * sc, -3.6 * sc], [24 * sc, 1.5], [0, 3.2 * sc]], true);
      over(K, mound, '#B98F69', a);
      occlude(K, mound, a);
      glaze(K, mound, LG(K.p, -20 * sc, -5 * sc, 18 * sc, 3 * sc, [[0, 'rgba(255,255,255,0)'], [1, rgba('#6E4E3A', 0.55)]]), a);
      const peb = new Path2D();
      for (let i = 0; i < 4; i++) peb.addPath(ellipse((r() - 0.5) * 34 * sc, -r() * 2.5 * sc, (1 + r()) * sc, (0.7 + r() * 0.5) * sc));
      over(K, peb, '#9A8070', a * 0.8);
      if (lk > 0) pen(K, [[-24 * sc, 1.2], [-14 * sc, -3.4 * sc], [0, -5.3 * sc], [14 * sc, -3.5 * sc], [24 * sc, 1.2]], 0.9 * lk, 0.25 * a, { double: false });
    }
    const gh = lerp(0.06, 1, outCubic(seg(g, 0, 0.85)));
    const top = [sway * gh + 2 * sc, -100 * sc * gh];
    const mid = [1.5 * sc + sway * 0.35, -55 * sc * gh];
    const stem = taper([[0, -3 * sc], mid, top], 3.4 * sc * lerp(0.6, 1, g), 1.2 * sc, 6);
    over(K, stem, '#7E9150', a);
    occlude(K, stem, a);
    glaze(K, stem, LG(K.p, -2 * sc, 0, 2 * sc, 0, [[0, 'rgba(255,255,255,0)'], [1, rgba('#3F5236', 0.5)]]), a);
    // leaf pairs along the stem: cotyledons first, then true leaves, each unfolding with growth
    const pairs = [[0.38, 0.0, 24, 10, 0.98], [0.62, 0.3, 27, 11, 1.1], [0.84, 0.55, 22, 9, 0.85]];
    const leaves = new Path2D(), lmid = new Path2D(), veins = new Path2D();
    const addLeaf = (p, ang, l, w, k) => {
      const pts = xf(leafPts(l * k, w * k, 0.15), p[0], p[1], ang);
      const lp = smooth(pts, true);
      leaves.addPath(lp);
      const half = xf([[0, 0], [w * k * 0.48, -l * k * 0.25], [w * k * 0.4, -l * k * 0.62], [0, -l * k]], p[0], p[1], ang);
      lmid.addPath(smooth(half, true));
      veins.addPath(smooth(xf([[0, 0], [0.2, -l * k * 0.5], [0, -l * k * 0.92]], p[0], p[1], ang), false));
    };
    pairs.forEach(([u, g0, l, w, sp], i) => {
      const k = pop(g, g0, 0.32) * sc;
      if (k <= 0.01) return;
      const p = qbez([0, -3 * sc], mid, top, u);
      const open = lerp(0.25, sp, sstep(g0, g0 + 0.35, g));
      const flut = Math.sin(t * 2.1 + i * 1.7 + seed) * 0.05;
      const lw = i === 0 && g < 0.45 ? w * 1.3 : w;
      addLeaf(p, -open + flut + (i % 2 ? 0.08 : -0.06), l, lw, k);
      addLeaf(p, open + flut, l * 0.95, lw, k);
    });
    // terminal bud
    const kb = sstep(0.05, 0.3, g);
    if (kb > 0) addLeaf(top, Math.sin(t * 1.7) * 0.06, 12 * sc * kb, 5.5 * sc * kb, 1);
    over(K, leaves, '#9DC069', a);
    occlude(K, leaves, a);
    glaze(K, lmid, '#6E9A4E', 0.75 * a);
    strokeP(K, veins, '#5E8443', 0.6 * sc, 0.5 * a);
    if (lk > 0) pen(K, leaves, 0.9 * lk, 0.28 * a, { double: false });
  }

  /**
   * E.props.sapling(L, x, y, h, opts) — a young plant in a little soil mound. (x, y) = soil point, h = height at growth 1.
   */
  PR.sapling = function sapling(L, x, y, h, opts) {
    h = num(h, 120);
    if (!(h > 0.5)) return;
    const o = opts || {};
    drawProp(L, num(x, 0), num(y, 0), h / 100, num(o.alpha, 1), (K) => {
    {
      const hpx = 100 * K.s;
      const lk = hpx < 40 ? 0 : lineK(hpx * 1.4);
      if (o.stake) {
        const st = poly([[7, 2], [9.5, 2], [9, -82], [7.4, -82]]);
        over(K, st, '#C9A77A', 1); occlude(K, st, 1);
        glaze(K, poly([[8.4, 2], [9.5, 2], [9, -82], [8.3, -82]]), '#8C6A48', 0.6);
        if (lk > 0) pen(K, st, 0.8 * lk, 0.25, { double: false });
      }
      drawSapling(K, clamp(num(o.growth, 1)), num(o.t, 0), Math.round(num(o.seed, 1)), lk, 1, 1, o.soil !== false);
      if (o.stake && lk > 0) pen(K, [[5.5, -50], [8.2, -52], [10.5, -49]], 1.0 * lk, 0.4, { double: false });
    }
    });
  };

  // =====================================================================================================
  //  5. WHEAT
  // =====================================================================================================
  PR.wheat = function wheat(L, x, y, h, opts) {
    h = num(h, 200);
    if (!(h > 0.5)) return;
    const o = opts || {};
    const n = Math.max(1, Math.min(14, Math.round(num(o.count, 5))));
    const seed = Math.round(num(o.seed, 1));
    const t = num(o.t, 0);
    const g = clamp(num(o.growth, 1));
    const gl = clamp(num(o.glow, 0));
    const nt = clamp(num(o.night, 0));
    drawProp(L, num(x, 0), num(y, 0), h / 100, num(o.alpha, 1), (K) => {
    const hpx = 100 * K.s;
    const lk = hpx < 50 ? 0 : lineK(hpx * 0.9);
    const r = E.rng(seed * 977 + n);
    const ripe = sstep(0.55, 1, g);
    const stalkCol = nightC(mixc('#8FAE5C', '#C7A04F', ripe), nt);
    const earCol = nightC(mixc('#A9C66C', mixc('#E3B957', '#F2CF6E', gl * 0.6), ripe), nt * (1 - gl * 0.7));
    const earD = nightC(mixc('#6F9147', '#B4843A', ripe), nt);
    const stalks = [];
    for (let i = 0; i < n; i++) {
      const bx = (i - (n - 1) / 2) * 6.5 + (r() - 0.5) * 4;
      const H = 100 * (0.84 + r() * 0.16) * lerp(0.08, 1, outCubic(seg(g, 0, 0.7)));
      const lean = (r() - 0.5) * 0.28 + bx * 0.006;
      const ph = r() * TAU;
      stalks.push({ bx, H, lean, ph, lf: r() > 0.4, side: r() > 0.5 ? 1 : -1, nk: 6 + Math.floor(r() * 3), tauE: 0.42 + r() * 0.12 });
    }
    stalks.sort((a, b) => a.H - b.H);
    for (const s of stalks) {
      const sw = Math.sin(t * 1.25 + s.ph) * 0.05 + Math.sin(t * 2.7 + s.ph * 2) * 0.015;
      const ang = s.lean + sw;
      const top = [s.bx + Math.sin(ang) * s.H, -Math.cos(ang) * s.H];
      const ctrl = [s.bx + Math.sin(ang * 0.4) * s.H * 0.55, -s.H * 0.55];
      // leaf blade
      if (s.lf && g > 0.05) {
        const p0 = qbez([s.bx, 0], ctrl, top, 0.22);
        const bl = taper([p0, [p0[0] + s.side * 9, p0[1] - 14], [p0[0] + s.side * 17 + sw * 30, p0[1] - 12]], 3.2, 0.3, 5);
        over(K, bl, nightC(mixc('#93B562', '#C2A85A', ripe * 0.8), nt), 1);
        occlude(K, bl, 1);
        glaze(K, bl, earD, 0.25);
      }
      const stalkPts = [];
      for (let j = 0; j <= 10; j++) stalkPts.push(qbez([s.bx, 0], ctrl, top, (j / 10) * 0.97));
      const stalk = taper(stalkPts, 1.9, 1.0, 2);
      over(K, stalk, stalkCol, 1);
      occlude(K, stalk, 1);
      if (lk > 0) pen(K, stalkPts, 0.6 * lk, 0.18, { double: false });
      // ear (başak): alternating kernels along the last 28 % of the stalk
      const ke = sstep(s.tauE, s.tauE + 0.3, g);
      if (ke <= 0.01) continue;
      const kern = new Path2D(), kernD = new Path2D(), awns = new Path2D();
      const e0 = qbez([s.bx, 0], ctrl, top, 0.72);
      const dx = top[0] - e0[0], dy = top[1] - e0[1];
      const el = Math.hypot(dx, dy) || 1;
      const ux = dx / el, uy = dy / el;
      const nx = -uy, ny = ux;
      const nk = s.nk;
      for (let j = 0; j < nk; j++) {
        const u = (j + 0.5) / nk;
        const kk = sstep(u * 0.6, u * 0.6 + 0.4, ke);
        if (kk <= 0.01) continue;
        for (const sd of [-1, 1]) {
          const off = (j % 2 ? 0.5 : 0) / nk;
          const cx = e0[0] + dx * (u + off * sd * 0.5), cy = e0[1] + dy * (u + off * sd * 0.5);
          const kx = cx + nx * sd * 1.9, ky = cy + ny * sd * 1.9;
          const kang = Math.atan2(uy, ux) + sd * 0.42 + Math.PI / 2;
          const rx = 1.9 * kk * (1 - u * 0.25), ry = 3.5 * kk * (1 - u * 0.2);
          const kp = ellipse(kx, ky, rx, ry, kang);
          kern.addPath(kp);
          kernD.addPath(ellipse(kx + nx * sd * 0.5, ky + ny * sd * 0.5, rx * 0.6, ry * 0.9, kang));
          // awn
          const ax = kx + (ux * Math.cos(sd * 0.32) - uy * Math.sin(sd * 0.32)) * 13 * kk;
          const ay = ky + (uy * Math.cos(sd * 0.32) + ux * Math.sin(sd * 0.32)) * 13 * kk;
          awns.moveTo(kx + ux * ry * 0.8, ky + uy * ry * 0.8);
          awns.lineTo(ax, ay);
        }
      }
      const tip = [top[0] + ux * 3.5 * ke, top[1] + uy * 3.5 * ke];
      kern.addPath(ellipse(tip[0], tip[1], 1.5 * ke, 3.0 * ke, Math.atan2(uy, ux) + Math.PI / 2));
      awns.moveTo(tip[0], tip[1]); awns.lineTo(tip[0] + ux * 14 * ke, tip[1] + uy * 14 * ke);
      if (gl > 0.01 && ripe > 0.3) {
        const mx = (e0[0] + top[0]) / 2, my = (e0[1] + top[1]) / 2;
        glaze(K, ellipse(mx, my, 8, 16, Math.atan2(uy, ux) + Math.PI / 2), RG(K.p, mx, my, 0, 16, [[0, rgba('#F6CE6A', 0.45 * gl)], [1, rgba('#F6CE6A', 0)]]), 1);
        glow(K, mx, my, 22, '#FFD27A', 0.42 * gl * ripe);
      }
      strokeP(K, awns, nightC(mixc('#A8B870', '#C99B48', ripe), nt), 0.45, 0.85);
      over(K, kern, earCol, 1);
      occlude(K, kern, 1);
      glaze(K, kernD, earD, 0.45);
      if (lk > 0) { pen(K, kern, 0.55 * lk, 0.2, { double: false }); pen(K, awns, 0.45 * lk, 0.14, { double: false }); }
    }
    });
  };

  // =====================================================================================================
  //  6. FLOWER
  // =====================================================================================================
  const FLOWER_COL = { tulip: '#C8424E', rose: '#D66C7D', daisy: '#FFFFFF', carnation: '#D2556A', wild: '#8F86C8' };
  function petal(pts, x, y, ang, s, sy) { return smooth(xf(pts, x, y, ang, s, sy), true); }
  function drawFlowerHead(K, kind, col, b, t, seed, lk) {
    // local frame: head base (receptacle) at (0,0), head grows toward -y; size ~ 34 units
    const dark = shade(col, -0.45), lite = shade(col, 0.4);
    const pw = 0.9 * lk;
    if (kind === 'tulip') {
      const open = sstep(0, 1, b);
      const H = 30, W = lerp(7, 11, open);
      const back = petal([[0, 0], [W * 0.9, -H * 0.35], [W * 0.75, -H * 0.8], [0, -H * 1.02], [-W * 0.75, -H * 0.8], [-W * 0.9, -H * 0.35]], 0, 0, 0, 1, 1);
      over(K, back, mixc(col, dark, 0.25), 1); occlude(K, back, 1);
      if (lk > 0) pen(K, back, pw, 0.28, { double: false });
      for (const sd of [-1, 1]) {
        const ang = sd * lerp(0.08, 0.42, open);
        const flare = lerp(0, 0.5, open) * sd;
        const pts = [[0, 0], [sd * W * 0.95, -H * 0.32], [sd * W * 0.95 + flare * 6, -H * 0.72], [sd * (W * 0.55 + flare * 16), -H * 1.08], [sd * W * 0.05, -H * 0.62], [-sd * W * 0.3, -H * 0.25]];
        const pp = petal(pts, 0, 0, ang * 0.5, 1, 1);
        over(K, pp, col, 1); occlude(K, pp, 1);
        K.p.save(); K.p.clip(pp);
        glaze(K, ellipse(0, 2, W * 1.6, H * 0.5), dark, 0.45, 2);
        lift(K, petal([[sd * W * 0.55, -H * 0.3], [sd * W * 0.75, -H * 0.62], [sd * W * 0.5, -H * 0.8], [sd * W * 0.4, -H * 0.5]], 0, 0, ang * 0.5, 1, 1), 0.35, 0.8);
        K.p.restore();
        if (lk > 0) pen(K, pp, pw, 0.3, { double: false });
      }
      // centre petal (front)
      const cp = petal([[0, 0], [W * 0.62, -H * 0.4], [W * 0.38, -H * 0.85], [0, -H * 1.0], [-W * 0.38, -H * 0.85], [-W * 0.62, -H * 0.4]], 0, 1, 0, lerp(0.8, 0.7, open), 1);
      over(K, cp, mixc(col, lite, 0.15), 1); occlude(K, cp, 1);
      glaze(K, cp, LG(K.p, 0, 0, 0, -H, [[0, rgba(dark, 0.55)], [0.6, rgba(dark, 0)], [1, rgba(dark, 0)]]), 1);
      if (lk > 0) pen(K, cp, pw, 0.3, { double: false });
    } else if (kind === 'rose') {
      // three-quarter view: back petals peeking over a cupped bowl, a dark opening with a tight inner spiral, and
      // two wide front petals wrapping the cup whose rolled-back lips catch the light (bare paper)
      const ob = sstep(0.12, 0.62, b);
      const R = 14.5 * lerp(0.6, 1, sstep(0.1, 1, b));
      const cy = -13;
      if (ob > 0.01) {
        const spread = lerp(0.55, 1, ob);
        // back petals
        for (const [a, k] of [[-1.05, 0.92], [1.0, 0.9], [-0.35, 1], [0.4, 0.97]]) {
          const px = Math.sin(a * spread) * R * 0.78, py = cy - R * 0.28 - Math.cos(a * spread) * R * 0.36 * k;
          const bp = blobP(px, py, R * 0.5 * k, { rx: R * 0.52 * k, ry: R * 0.42 * k, rot: a * 0.6, seed: seed * 7 + Math.round(a * 10), irr: 0.12, n: 18 });
          over(K, bp, mixc(col, dark, 0.28), ob); occlude(K, bp, ob);
          K.p.save(); K.p.clip(bp);
          glaze(K, ellipse(px, py + R * 0.3, R * 0.55, R * 0.3), dark, 0.35 * ob, 1);
          lift(K, ellipse(px - R * 0.08, py - R * 0.3 * k, R * 0.3, R * 0.07, a * 0.6), 0.4 * ob, 0.35);
          K.p.restore();
          if (lk > 0) pen(K, bp, pw * 0.8, 0.26 * ob, { double: false });
        }
        // the cup and its opening
        const cup = smooth([[-R * 0.86, cy - R * 0.22], [-R * 0.78, cy + R * 0.3], [-R * 0.4, cy + R * 0.72], [0, cy + R * 0.82], [R * 0.4, cy + R * 0.72], [R * 0.78, cy + R * 0.3], [R * 0.86, cy - R * 0.22], [0, cy - R * 0.06]], true);
        over(K, cup, col, ob); occlude(K, cup, ob);
        const opening = ellipse(0, cy - R * 0.24, R * 0.8, R * 0.3);
        over(K, opening, mixc(col, dark, 0.5), ob);
        // inner spiral: nested petal edges, lighter rims, darkest at the heart
        over(K, ellipse(R * 0.02, cy - R * 0.27, R * 0.56, R * 0.2), mixc(col, lite, 0.1), ob);
        over(K, ellipse(R * 0.06, cy - R * 0.3, R * 0.34, R * 0.12), mixc(col, dark, 0.35), ob);
        const sp = new Path2D();
        sp.ellipse(R * 0.04, cy - R * 0.29, R * 0.46, R * 0.16, 0, 3.4, 6.6);
        sp.moveTo(R * 0.3, cy - R * 0.3); sp.ellipse(R * 0.07, cy - R * 0.31, R * 0.22, R * 0.08, 0, 0.2, 3.6);
        strokeP(K, sp, dark, 0.7, 0.7 * ob);
        if (lk > 0) pen(K, sp, pw * 0.7, 0.32 * ob, { double: false });
        // front petals wrapping the cup
        const fpL = smooth([[0, cy + R * 0.86], [-R * 0.66, cy + R * 0.52], [-R * 0.98, cy - R * 0.02], [-R * 0.86, cy - R * 0.3 - ob * R * 0.06], [-R * 0.42, cy - R * 0.04], [R * 0.16, cy + R * 0.14]], true);
        const fpR = smooth([[R * 0.04, cy + R * 0.88], [R * 0.7, cy + R * 0.48], [R * 1.0, cy - R * 0.04], [R * 0.84, cy - R * 0.28 - ob * R * 0.05], [R * 0.3, cy + R * 0.02], [-R * 0.2, cy + R * 0.26]], true);
        for (const [fp, lipX, sd] of [[fpL, -R * 0.62, -1], [fpR, R * 0.58, 1]]) {
          over(K, fp, sd < 0 ? mixc(col, lite, 0.12) : col, ob); occlude(K, fp, ob);
          K.p.save(); K.p.clip(fp);
          glaze(K, fp, LG(K.p, 0, cy - R * 0.2, 0, cy + R * 0.9, [[0, rgba(dark, 0)], [1, rgba(dark, 0.5)]]), ob);
          if (sd > 0) glaze(K, fp, LG(K.p, 0, 0, R, 0, [[0, rgba(dark, 0)], [1, rgba(dark, 0.3)]]), ob);
          // rolled-back lip: a thin lifted band along the top edge
          lift(K, smooth([[lipX - sd * R * 0.36, cy - R * 0.03], [lipX + sd * R * 0.12, cy - R * 0.26], [lipX + sd * R * 0.3, cy - R * 0.16], [lipX - sd * R * 0.2, cy + R * 0.04]], true), 0.55 * ob, 0.3);
          K.p.restore();
          if (lk > 0) pen(K, fp, pw * 0.85, 0.3 * ob, { double: false });
        }
      }
      const bb = 1 - ob;
      if (bb > 0.01) {
        const bud = smooth([[0, 1], [-5.5, -3], [-6.2, -10], [-3, -17], [0, -20.5], [3, -17], [6.2, -10], [5.5, -3]], true);
        over(K, bud, col, bb); occlude(K, bud, bb);
        glaze(K, smooth([[0, 1], [1.5, -8], [0, -20], [4, -16], [6.2, -10], [5.5, -3]], true), dark, 0.45 * bb);
        const wrap = smooth([[-5.8, -6], [-1, -10], [5.6, -6], [4.4, -1.5], [0, 0.8], [-4.4, -1.5]], true);
        over(K, wrap, mixc(col, lite, 0.15), bb);
        if (lk > 0) { pen(K, bud, pw * 0.8, 0.28 * bb, { double: false }); pen(K, wrap, pw * 0.7, 0.24 * bb, { double: false }); }
      }
    } else if (kind === 'carnation') {
      const open = sstep(0, 1, b);
      const H = lerp(10, 20, open), W = lerp(5, 17, open);
      const layers = [[1.0, mixc(col, dark, 0.3)], [0.82, col], [0.62, mixc(col, lite, 0.18)]];
      layers.forEach(([k, c], li) => {
        const pts = [[-W * 0.3 * k, -2], [W * 0.3 * k, -2]];
        const teeth = 9;
        for (let j = 0; j <= teeth * 2; j++) {
          const u = j / (teeth * 2);
          const a = lerp(0.18, -0.18, u) * Math.PI * 1.1 + Math.PI * 0;
          const rr = (j % 2 ? 0.86 : 1) * H * k * (1 + 0.06 * noise1(j * 1.3 + li * 7, seed));
          const ax = Math.sin(lerp(1, -1, u) * lerp(0.4, 1.15, open)) * W / H;
          pts.push([ax * rr * 1.0, -Math.cos(lerp(1, -1, u) * lerp(0.4, 1.15, open)) * rr - 2 + li * 1.5]);
        }
        const pp = poly(pts);
        over(K, pp, c, 1); occlude(K, pp, 1);
        if (lk > 0) pen(K, pp, pw * 0.8, 0.24, { double: false });
      });
      const cal = smooth([[-3.2, 1], [-3.6, -4], [-2.6, -7], [2.6, -7], [3.6, -4], [3.2, 1], [0, 3]], true);
      over(K, cal, '#7F9E57', 1); occlude(K, cal, 1);
      glaze(K, poly([[0.6, 2], [3.4, 1], [3.6, -4], [2.6, -7], [0.8, -7]]), '#4F6E3E', 0.5);
      if (lk > 0) pen(K, cal, pw * 0.8, 0.26, { double: false });
    } else {
      // face-on flowers: daisy (white rays, gold disc), wild (5 round petals)
      const daisy = kind === 'daisy';
      const open = sstep(0, 1, b);
      const n = daisy ? 14 : 5;
      const PL = (daisy ? 15 : 10) * lerp(0.35, 1, open), PW = daisy ? 4.2 : 9;
      const cy = -12;
      const tilt = 0.82;
      const rot0 = seed * 0.7;
      const back = new Path2D(), front = new Path2D(), shadeP = new Path2D();
      for (let i = 0; i < n; i++) {
        const a = rot0 + (i / n) * TAU;
        const lift2 = lerp(0.6, 0, open);
        const ex = Math.cos(a), ey = Math.sin(a) * tilt;
        const tipx = ex * PL, tipy = cy + ey * PL - lift2 * PL * 0.6;
        const nx = -Math.sin(a) * PW * 0.5, ny = Math.cos(a) * tilt * PW * 0.5;
        const pts = daisy
          ? [[ex * 2, cy + ey * 2], [ex * PL * 0.5 + nx, cy + ey * PL * 0.5 + ny - lift2 * PL * 0.3], [tipx, tipy], [ex * PL * 0.5 - nx, cy + ey * PL * 0.5 - ny - lift2 * PL * 0.3]]
          : [[ex * 1.5, cy + ey * 1.5], [ex * PL * 0.55 + nx * 1.1, cy + ey * PL * 0.55 + ny * 1.1], [tipx + nx * 0.5, tipy + ny * 0.5], [tipx - nx * 0.5, tipy - ny * 0.5], [ex * PL * 0.55 - nx * 1.1, cy + ey * PL * 0.55 - ny * 1.1]];
        const pp = smooth(pts, true);
        (Math.sin(a) < 0 ? back : front).addPath(pp);
        if (Math.sin(a) > 0.2) shadeP.addPath(pp);
      }
      const pc = daisy ? '#FFFFFF' : col;
      over(K, back, daisy ? '#EEE9F2' : mixc(pc, dark, 0.2), 1); occlude(K, back, 1);
      over(K, front, pc, 1); occlude(K, front, 1);
      glaze(K, shadeP, daisy ? '#A9A3C8' : dark, daisy ? 0.32 : 0.35);
      if (lk > 0) { pen(K, back, pw * 0.8, 0.24, { double: false }); pen(K, front, pw * 0.8, 0.28, { double: false }); }
      const dr = daisy ? 4.6 : 2.6;
      const disc = ellipse(0, cy, dr * lerp(0.7, 1, open), dr * tilt * lerp(0.7, 1, open));
      over(K, disc, daisy ? '#E7B23E' : '#EBC24E', 1); occlude(K, disc, 1);
      crescent(K, disc, [-dr, cy - dr, dr * 2, dr * 2], -dr * 0.35, -dr * 0.4, '#B9752E', 0.6);
      if (lk > 0) pen(K, disc, pw * 0.7, 0.3, { double: false });
    }
  }
  /**
   * E.props.flower(L, x, y, s, opts) — (x, y) = foot of the stem, s = flower height (stem + head).
   * opts.stem === false: only the blossom, centred at (x, y), s = blossom size.
   */
  PR.flower = function flower(L, x, y, s, opts) {
    s = num(s, 80);
    if (!(s > 0.5)) return;
    const o = opts || {};
    const kind = kindOf(o.kind, ['tulip', 'rose', 'daisy', 'carnation', 'wild'], 'tulip');
    const col = colorOf(o.color, FLOWER_COL[kind]);
    const b = clamp(num(o.bloom, 1));
    const t = num(o.t, 0);
    const seed = Math.round(num(o.seed, 1));
    const stem = o.stem !== false;
    drawProp(L, num(x, 0), num(y, 0), s / 100, num(o.alpha, 1), (K) => {
    const lk = 100 * K.s < 45 ? 0 : lineK(100 * K.s * 1.3);
    const r = E.rng(seed * 53 + kind.length);
    const sw = Math.sin(t * 1.4 + seed * 1.3) * 0.06 + Math.sin(t * 2.9 + seed) * 0.02;
    withAll(K, () => {
      if (!stem) {
        // blossom only, centred
        moveAll(K, 0, kind === 'daisy' || kind === 'wild' ? 0 : 0, 0, 2.6);
        for (const c of [K.p, K.k, K.l]) c.translate(0, kind === 'daisy' || kind === 'wild' ? 12 : 16);
        drawFlowerHead(K, kind, col, b, t, seed, lk);
        return;
      }
      const headH = kind === 'daisy' || kind === 'wild' ? 0 : 0;
      const top = [Math.sin(sw) * 64 + (r() - 0.5) * 8, -68 - headH];
      const ctrl = [top[0] * 0.25 + (r() - 0.5) * 6, -36];
      // leaves
      const leafCol = '#7FA35A';
      const lv = new Path2D(), lvD = new Path2D();
      const nl = kind === 'wild' ? 1 : 2;
      for (let i = 0; i < nl; i++) {
        const u = 0.12 + i * 0.2;
        const p = qbez([0, 0], ctrl, top, u);
        const sd = i % 2 ? 1 : -1;
        const tulipLeaf = kind === 'tulip';
        const L2 = tulipLeaf ? 46 : 26, W2 = tulipLeaf ? 9 : 8;
        const ang = sd * (tulipLeaf ? 0.32 : 0.75) + sw * 0.5;
        lv.addPath(smooth(xf(leafPts(L2, W2, sd * 0.25), p[0], p[1], ang), true));
        lvD.addPath(smooth(xf([[0, 0], [W2 * 0.5, -L2 * 0.25], [W2 * 0.42, -L2 * 0.62], [sd * L2 * 0.05, -L2]], p[0], p[1], ang), true));
      }
      over(K, lv, leafCol, 1); occlude(K, lv, 1);
      glaze(K, lvD, '#4E7440', 0.45);
      if (lk > 0) pen(K, lv, 0.8 * lk, 0.22, { double: false });
      const stemP = [];
      for (let j = 0; j <= 8; j++) stemP.push(qbez([0, 0], ctrl, top, j / 8));
      const st = taper(stemP, 3.0, 2.0, 2);
      over(K, st, '#6F9450', 1); occlude(K, st, 1);
      if (lk > 0) pen(K, stemP, 0.7 * lk, 0.2, { double: false });
      // head
      const dir = Math.atan2(top[0] - ctrl[0], -(top[1] - ctrl[1]));
      for (const c of [K.p, K.k, K.l]) { c.translate(top[0], top[1]); c.rotate(dir * 0.6); }
      if (kind === 'daisy' || kind === 'wild') for (const c of [K.p, K.k, K.l]) c.translate(0, 8);
      // calyx / sepals
      if (kind === 'tulip' || kind === 'rose') {
        const sep = new Path2D();
        sep.addPath(smooth(xf(leafPts(8, 4), 0, 1, -0.9), true));
        sep.addPath(smooth(xf(leafPts(8, 4), 0, 1, 0.9), true));
        over(K, sep, '#7F9E57', 1);
      }
      drawFlowerHead(K, kind, col, b, t, seed, lk);
    });
    });
  };

  // =====================================================================================================
  //  7. CLOUD
  // =====================================================================================================
  function cloudModel(seed) {
    return memo('cloud:' + seed, () => {
      const r = E.rng(seed * 4513 + 1);
      const lobes = [];
      const n = 6 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const x = lerp(-31, 31, u) + (r() - 0.5) * 5;
        const rr = (12 + 14 * Math.sin(Math.PI * lerp(0.12, 0.88, u))) * (0.82 + r() * 0.3);
        lobes.push({ x, y: 10 - rr * (0.62 + r() * 0.25), r: rr, ph: r() * TAU, sp: 0.2 + r() * 0.25 });
      }
      // a second row of smaller lobes on top for a cumulus head
      for (let i = 0; i < 3; i++) {
        const x = lerp(-13, 13, i / 2) + (r() - 0.5) * 6;
        const rr = 11 + r() * 7;
        lobes.push({ x, y: -14 - rr * 0.6 - r() * 4, r: rr, ph: r() * TAU, sp: 0.2 + r() * 0.2 });
      }
      return { lobes, seed };
    });
  }
  const CLOUD_TONE = {
    day: { top: 0.96, warm: '#F3E2BE', warmA: 0.16, under: '#A9A4C6', underA: 0.62, mid: '#C9C4DA' },
    dusk: { top: 0.93, warm: '#F2C891', warmA: 0.55, under: '#BE8CA4', underA: 0.66, mid: '#E6AE93' },
    night: { top: 0, warm: '#7884AE', warmA: 0.34, under: '#262E4C', underA: 0.5, mid: '#4B5680', rim: 0.62 },
  };
  /**
   * E.props.cloud(L, x, y, w, opts) — soft watercolour cumulus. (x, y) = centre of the cloud's base line, w = width.
   * Painted like the reference: bare paper with mostly lost (wet) edges, a few found edges on the cumulus head, a
   * lavender-grey underside with a partly hard drying edge. Night: moonlit body a little lighter than the sky, silver
   * rim on the top edges only.
   */
  PR.cloud = function cloud(L, x, y, w, opts) {
    w = num(w, 300);
    if (!(w > 0.5)) return;
    const o = opts || {};
    const toneName = kindOf(o.tone, ['day', 'dusk', 'night'], 'day');
    const tone = CLOUD_TONE[toneName];
    const t = num(o.t, 0);
    const seed = Math.round(num(o.seed, 1));
    drawProp(L, num(x, 0), num(y, 0), w / 100, num(o.alpha, 1), (K) => {
      const M = cloudModel(seed);
      const lob = M.lobes.map((lb, i) => ({ ...lb, x: lb.x + Math.sin(t * lb.sp * 0.5 + lb.ph) * 1.2, r: lb.r * (1 + 0.045 * Math.sin(t * lb.sp + lb.ph)), i }));
      const lobeP = (lb, k = 1, irr = 0.08) => blobP(lb.x, lb.y, lb.r * k, { seed: seed * 10 + lb.i, irr, n: 22 });
      const base = (k = 1) => blobP(0, 7, 36 * k, { rx: 36 * k, ry: 6.5 * k, seed: seed + 3, irr: 0.07, n: 28 });
      const sil = new Path2D(), silS = new Path2D(), heads = new Path2D();
      lob.forEach((lb) => { sil.addPath(lobeP(lb)); silS.addPath(lobeP(lb, 0.95)); if (lb.y + lb.r * 0.25 < -8) heads.addPath(lobeP(lb, 0.97, 0.1)); });
      sil.addPath(base()); silS.addPath(base(0.95));
      const bb = [-62, -62, 124, 86];
      sil._bb = bb; silS._bb = bb; heads._bb = bb;
      if (toneName !== 'night') {
        // paper: a wide wet halo (lost edges), the body, and crisp found edges only on the cumulus head
        lift(K, sil, tone.top * 0.55, 4.5);
        lift(K, silS, tone.top * 0.95, 1.8);
        lift(K, heads, tone.top, 0.35);
      } else {
        lift(K, sil, 0.17, 5);
        glaze(K, silS, tone.warm, tone.warmA, 2.4);
      }
      occlude(K, sil, 0.6);
      K.p.save(); K.p.clip(sil);
      glaze(K, sil, LG(K.p, 0, -48, 0, 12, [[0, rgba(tone.warm, tone.warmA)], [0.6, rgba(tone.warm, tone.warmA * 0.3)], [1, rgba(tone.warm, 0)]]), toneName === 'night' ? 0.5 : 1);
      K.p.restore();
      // underside: the lower halves of the lobes as one wet wash, soft at the bottom (it fades into the halo, no
      // outline), then a crisper glaze inside the body whose top edge follows the lobes (hard drying edge)
      const und = new Path2D(), sh = new Path2D();
      for (const lb of lob) {
        if (lb.y > -16) und.addPath(blobP(lb.x + lb.r * 0.06, lb.y + lb.r * 0.5, lb.r * 0.62, { rx: lb.r * 0.86, ry: lb.r * 0.46, seed: seed + 40 + lb.i, irr: 0.16, n: 16 }));
        if (lb.y > -14) sh.addPath(blobP(lb.x + lb.r * 0.12, lb.y + lb.r * 0.66, lb.r * 0.6, { rx: lb.r * 0.8, ry: lb.r * 0.4, seed: seed + 60 + lb.i, irr: 0.18, n: 16 }));
      }
      und.addPath(base(0.92)); sh.addPath(blobP(2, 8, 30, { rx: 33, ry: 4.6, seed: seed + 51, irr: 0.15, n: 20 }));
      und._bb = bb; sh._bb = bb;
      glaze(K, und, tone.under, tone.underA * 0.62, 2.2);
      K.p.save(); K.p.clip(silS);
      glaze(K, sh, tone.under, tone.underA * 0.4, 0.6);
      // inner blooms + soft modelling between the lobes (wet-in-wet)
      glaze(K, blobP(-10, -2, 18, { rx: 24, ry: 9, seed: seed + 7, irr: 0.3 }), tone.mid, 0.3, 4);
      glaze(K, blobP(20, -8, 12, { rx: 16, ry: 8, seed: seed + 9, irr: 0.3 }), tone.mid, 0.22, 3.5);
      for (const lb of lob) {
        if (lb.y > -4) continue;
        glaze(K, blobP(lb.x + lb.r * 0.25, lb.y + lb.r * 0.62, lb.r * 0.55, { rx: lb.r * 0.75, ry: lb.r * 0.32, seed: seed + lb.i, irr: 0.3, n: 14 }), tone.mid, 0.2, 2.6);
      }
      K.p.restore();
      if (tone.rim) {
        // moonlit silver on the top edges only (the silhouette minus itself shifted down): a soft glow-edge all
        // along the top and a crisp sliver on the head
        crescentU(K, sil, bb, 0.4, 2.2, '#DDE5F4', tone.rim * 0.5, 1.3, true);
        crescentU(K, heads, bb, 0.3, 1.4, '#EEF2FA', tone.rim * 0.55, 0.3, true);
        glow(K, -6, -20, 58, '#C9D4F0', 0.1);
      }
    });
  };

  // =====================================================================================================
  //  2. PERSONAL WORLD (glass / soap-bubble globe with a tiny landscape inside). Local units: radius 100.
  // =====================================================================================================
  // internal references (a scene reassigning E.props.* cannot change these worlds)
  const TREE = PR.tree, CLOUD = PR.cloud, WHEAT = PR.wheat;
  const PW_KINDS = ['home', 'sea', 'city', 'field', 'orchard'];
  const PW_DOOR = [-20, 2.6];
  const pwGy = (x) => 9 + 0.0021 * x * x + 2.6 * Math.sin(x * 0.045 + 0.4);
  const pwNight = nightC;

  function pwHillPath(gy, x0 = -110, x1 = 110, bottom = 112) {
    const top = [];
    for (let i = 0; i <= 44; i++) { const x = lerp(x0, x1, i / 44); top.push([x, gy(x)]); }
    return smooth(top.concat([[x1, bottom], [x0, bottom]]), true);
  }
  function pwSky(K, top, horizon, a = 1, o = null, moon = true) {
    glaze(K, circle(0, 0, 101), LG(K.p, 0, -100, 0, 20, [[0, rgba(top, 0.55)], [1, rgba(horizon, 0.45)]]), a);
    const n = o ? o.n : 0;
    if (n > 0.02) {
      // night: a deeper sky wash, a crescent moon (bare paper) and a few twinkling stars, upper-right (away from the
      // glass highlight window)
      glaze(K, circle(0, 0, 101), LG(K.p, 0, -100, 0, 10, [[0, rgba('#1E2A55', 0.55 * n)], [1, rgba('#3C4A7E', 0.2 * n)]]), 1);
      const r = E.rng(o.seed * 19 + 5);
      const st = new Path2D();
      for (let i = 0; i < 16; i++) {
        const x = -70 + r() * 150, y = -88 + r() * 62, tw = 0.55 + 0.45 * Math.sin(o.t * (1.3 + r() * 2) + i * 2.3);
        if (x < -20 && y < -40 || x * x + y * y > 8600) continue;
        const sz = (0.55 + r() * 0.7) * (0.75 + 0.25 * tw);
        st.addPath(circle(x, y, sz));
        if (i % 4 === 0) glow(K, x, y, 5, '#DDE6FF', 0.35 * n * tw);
      }
      lift(K, st, 0.8 * n);
      if (moon) {
        const m = new Path2D(); m.arc(50, -50, 8, 0, TAU); m.arc(53.6, -52.4, 6.8, 0, TAU);
        m._bb = [40, -60, 20, 20];
        fillP(K, m, '#FFFFFF', 0.92 * n, { over: true, rule: 'evenodd' });
        glow(K, 48, -48, 26, '#DCE4FF', 0.32 * n);
      }
    }
  }
  function pwBirds(K, t, life, n, y0, seed) {
    if (life <= 0.01) return;
    const p = new Path2D();
    for (let i = 0; i < n; i++) {
      const sp = 7 + i * 1.5;
      const x = -80 + ((((t * sp + i * 47 + seed * 13) % 170) + 170) % 170);
      const y = y0 + i * 7 + 4 * Math.sin(t * 0.8 + i * 2);
      const fl = 2.6 * Math.sin(t * 9 + i * 1.3);
      const s = 3.4 - i * 0.5;
      p.moveTo(x - s, y - fl * 0.6);
      p.quadraticCurveTo(x - s * 0.4, y - 1.2 - fl * 0.3, x, y);
      p.quadraticCurveTo(x + s * 0.4, y - 1.2 - fl * 0.3, x + s, y - fl * 0.6);
    }
    strokeP(K, p, '#4A4A5E', 0.9, 0.8 * life);
  }
  function pwSmoke(K, x, y, t, life, n = 4) {
    if (life <= 0.01) return;
    for (let i = 0; i < n; i++) {
      const u = (((t * 0.26 + i / n) % 1) + 1) % 1;
      const px = x + u * 12 + Math.sin(u * 5 + i) * 2.5, py = y - u * 34;
      const rr = 2 + u * 6.5;
      const a = life * (1 - u) * Math.min(1, u * 6) * 0.55;
      glaze(K, blobP(px, py, rr, { seed: i + 3, irr: 0.25, n: 12 }), '#B7B2C6', a, 1.2);
    }
  }
  /** drips: pigment running down from a list of edges [{x0, x1, y, col, n}] */
  function pwDrips(K, list, d, t, seed) {
    if (d <= 0.01) return;
    const r = E.rng(seed * 101 + 5);
    for (const e of list) {
      for (let i = 0; i < e.n; i++) {
        const x = lerp(e.x0, e.x1, r());
        const th = r() * 0.45;
        const k = sstep(th, th + 0.5, d);
        if (k <= 0.01) { r(); r(); continue; }
        const len = (12 + r() * 30) * k * (e.len || 1);
        const wob = (r() - 0.5) * 4;
        const w = (e.w || 2.6) * (0.8 + r() * 0.7);
        const pts = [[x, e.y - 3], [x + wob * 0.3, e.y + len * 0.5], [x + wob, e.y + len]];
        const dp = taper(pts, w * 1.5, w * 0.55, 4);
        const a = 0.36 * (1 - 0.8 * sstep(0.5, 1, d));
        glaze(K, dp, e.col, a, 0.35);
        glaze(K, circle(x + wob, e.y + len, w * 0.6), e.col, a * 1.15, 0.3);
      }
    }
  }

  // ---------- the canonical "home" world ----------
  function pwHome(K, o) {
    const { t, life, door, lit, n, lk, seed, d } = o;
    const N = (c) => pwNight(c, n);
    pwSky(K, N('#BFD6EA'), N('#FBEFD6'), 1, o, true);
    if (n < 0.5) CLOUD(K.L, 50 + Math.sin(t * 0.1) * 3 * life, -66, 30, { seed: 3 + seed, t: t * (0.4 + life), alpha: K.a * (1 - n) * 0.9 });
    // far hills (depth)
    glaze(K, pwHillPath((x) => -2 + 0.004 * (x + 40) * (x + 40) + 3 * Math.sin(x * 0.06), -110, 110, 60), N('#A9C7B8'), 0.7);
    glaze(K, pwHillPath((x) => 3 + 0.003 * (x - 55) * (x - 55), -110, 110, 60), N('#BCCFA8'), 0.6);
    // main hill
    const hill = pwHillPath(pwGy);
    over(K, hill, LG(K.p, 0, 6, 0, 104, [[0, N('#BFD786')], [0.32, N('#9EC26C')], [0.72, N('#79A35A')], [1, N('#7A6E50')]]), 1);
    occlude(K, hill, 1);
    lift(K, smooth([[-100, pwGy(-100) + 1], [-50, pwGy(-50) + 0.6], [0, pwGy(0) + 0.6], [60, pwGy(60) + 0.8], [100, pwGy(100) + 1], [100, pwGy(100) + 5], [0, pwGy(0) + 4], [-100, pwGy(-100) + 5]], true), 0.22, 1.2);
    if (lk > 0) pen(K, Array.from({ length: 23 }, (_, i) => { const x = -105 + i * 10; return [x, pwGy(x)]; }), 0.9 * lk, 0.22);
    // path from the door
    const pth = smooth([[-23.4, 9.2], [-25, 30], [-20, 62], [-19, 104], [9, 104], [-2, 62], [-12, 30], [-16.6, 9.2]], true);
    over(K, pth, N('#ECDDBB'), 1);
    glaze(K, pth, LG(K.p, 0, 9, 0, 100, [[0, rgba('#B49B76', 0.15)], [1, rgba('#B49B76', 0.4)]]), 1);
    // garden plot (left-front) with rows of sprouts and a flower border, a little fence behind
    const plotP = poly([[-73, 25], [-41, 21], [-35, 41], [-69, 47]]);
    over(K, plotP, N('#B48E66'), 1);
    glaze(K, plotP, LG(K.p, -70, 22, -38, 44, [[0, 'rgba(255,255,255,0)'], [1, rgba('#6E4E3A', 0.45)]]), 1);
    const rows = new Path2D(), sprouts = new Path2D();
    for (let rw = 0; rw < 3; rw++) {
      const u = (rw + 0.7) / 3.4;
      const a = [lerp(-73, -69, u), lerp(25, 47, u)], b = [lerp(-41, -35, u), lerp(21, 41, u)];
      rows.moveTo(a[0], a[1] + 1.2); rows.lineTo(b[0], b[1] + 1.2);
      for (let j = 0; j < 7; j++) {
        const v = (j + 0.5) / 7, px = lerp(a[0], b[0], v), py = lerp(a[1], b[1], v);
        const sw = Math.sin(t * 2 * (0.3 + life) + j + rw) * 0.15;
        sprouts.addPath(smooth(xf(leafPts(3.6, 2.2), px, py, -0.6 + sw), true));
        sprouts.addPath(smooth(xf(leafPts(3.6, 2.2), px, py, 0.6 + sw), true));
      }
    }
    strokeP(K, rows, N('#7A5A44'), 0.8, 0.5);
    over(K, sprouts, N('#86B45E'), 1);
    const fl = new Path2D(), fl2 = new Path2D();
    for (let j = 0; j < 8; j++) { const v = (j + 0.5) / 8; const px = lerp(-69, -35, v), py = lerp(47, 41, v) + 1.5; (j % 2 ? fl : fl2).addPath(circle(px, py, 1.7)); }
    over(K, fl, N('#D9566A'), 1); over(K, fl2, N('#F0C24F'), 1);
    if (lk > 0) pen(K, plotP, 0.8 * lk, 0.22, { double: false });
    // fence
    const posts = new Path2D();
    for (let j = 0; j < 7; j++) { const v = j / 6; const px = lerp(-74, -40, v), py = lerp(25, 20.5, v); posts.addPath(poly([[px - 0.7, py], [px - 0.7, py - 6], [px, py - 7], [px + 0.7, py - 6], [px + 0.7, py]])); }
    over(K, posts, N('#F4EDE0'), 1);
    if (lk > 0) { pen(K, posts, 0.7 * lk, 0.3, { double: false }); pen(K, [[-75, 21.5], [-39, 17]], 0.7 * lk, 0.35, { double: false }); pen(K, [[-75, 18.6], [-39, 14.2]], 0.7 * lk, 0.3, { double: false }); }
    // the tree (canonical: one round tree on the right)
    TREE(K.L, 40, pwGy(40) + 1.5, 60, { kind: 'round', seed: 4 + (seed - 1), t, sway: 0.35 + life * 0.9, alpha: K.a, shadow: 0.9, night: n });
    // house
    o.lights = new Path2D();
    pwHouse(K, { door, lit, n, lk, t, life, lights: o.lights });
    // grass tufts + meadow flowers
    const r = E.rng(seed * 17 + 3);
    const tufts = new Path2D(), dots = new Path2D(), dots2 = new Path2D();
    for (let i = 0; i < 16; i++) {
      const x = -95 + r() * 190, y = pwGy(x) + 6 + r() * 60;
      if (x > -76 && x < -32 && y > 18 && y < 50) continue;
      if (x > -28 && x < 10 && y > 8) continue;
      const s = 2.2 + r() * 1.6, lean = (r() - 0.5) * 0.6 + Math.sin(t * 1.4 * (0.3 + life) + x * 0.1) * 0.25 * life;
      for (let b = -2; b <= 2; b++) {
        const bh = s * (1.9 - Math.abs(b) * 0.38) * (0.85 + 0.3 * r()), bx = b * s * 0.32 + lean * bh;
        tufts.moveTo(x + b * s * 0.12, y); tufts.quadraticCurveTo(x + b * s * 0.22 + lean * bh * 0.3, y - bh * 0.55, x + bx, y - bh);
      }
      if (i % 2) (i % 4 === 1 ? dots : dots2).addPath(circle(x + 3, y - 1, 1.3));
    }
    strokeP(K, tufts, N('#5E8A48'), 0.6, 0.6);
    over(K, dots, N('#F7F1E6'), 1); over(K, dots2, N('#D9566A'), 1);
    pwBirds(K, t, life * (1 - n), 2, -62, seed);
    pwSmoke(K, -4.5, -36, t, life);
    // pigment that runs when the world dissolves
    o.drips = [
      { x0: -36, x1: -4, y: 9.5, col: '#B9A58C', n: 5 }, { x0: -33, x1: -6, y: -11, col: '#C8664E', n: 4 },
      { x0: 20, x1: 60, y: -20, col: '#6E9A50', n: 6, w: 3 }, { x0: -100, x1: 100, y: 16, col: '#8DB466', n: 7 },
      { x0: -72, x1: -36, y: 44, col: '#8C6A4A', n: 4 },
    ];
    o.parts = { x: 40, y: -30, col: '#7DAE60', petal: '#D9566A', px: -52, py: 40 };
  }
  function pwHouse(K, o) {
    const { door, lit, n, lk } = o;
    const N = (c) => pwNight(c, n);
    const wall = poly([[-34, 9.5], [-34, -10], [-20, -25.5], [-6, -10], [-6, 9.5]]);
    const side = poly([[-6, 9.5], [-6, -10], [2.5, -13.2], [2.5, 6.8]]);
    const roofS = poly([[-21, -27.3], [-12.2, -30.6], [4.3, -12.6], [-4.6, -9.2]]);
    const gable = new Path2D();
    gable.addPath(taper([[-36.2, -8.6], [-20.4, -26.8]], 3.1, 3.1, 2));
    gable.addPath(taper([[-20.4, -26.8], [-4.6, -8.6]], 3.1, 3.1, 2));
    const chim = poly([[-8.6, -21], [-8.6, -33], [-3.8, -33.8], [-3.8, -23.2]]);
    const all = new Path2D(); [wall, side, roofS, gable, chim].forEach((p2) => all.addPath(p2));
    // contact shadow
    glaze(K, ellipse(-12, 10.5, 28, 3.4), RG(K.p, -12, 10.5, 0, 28, [[0, rgba('#55704C', 0.5)], [1, rgba('#55704C', 0)]]), 1);
    occlude(K, all, 1);
    over(K, side, N('#D7C3AC'), 1);
    glaze(K, side, LG(K.p, -6, 0, 2.5, 0, [[0, rgba('#7A6E8C', 0.35)], [1, rgba('#7A6E8C', 0.55)]]), 1);
    over(K, wall, N('#F7EFE0'), 1);
    glaze(K, wall, LG(K.p, -34, -20, -6, 9, [[0, 'rgba(255,255,255,0)'], [1, rgba('#B9A48C', 0.3)]]), 1);
    glaze(K, poly([[-34, -10], [-20, -25.5], [-6, -10], [-6, -7.5], [-20, -22.6], [-34, -7.5]]), '#A8968A', 0.4);
    over(K, chim, N('#C9B6A2'), 1);
    glaze(K, poly([[-6, -22.4], [-3.8, -23.2], [-3.8, -33.8], [-6, -33.4]]), '#7A6A7C', 0.45);
    over(K, poly([[-9.2, -33], [-3.3, -34], [-3.3, -35.6], [-9.2, -34.6]]), N('#9E8E80'), 1);
    over(K, roofS, N('#C8664E'), 1);
    glaze(K, roofS, LG(K.p, -12, -30, 0, -10, [[0, 'rgba(255,255,255,0)'], [1, rgba('#6E3A3A', 0.45)]]), 1);
    const tiles = new Path2D();
    for (let i = 1; i < 5; i++) { const u = i / 5; tiles.moveTo(lerp(-21, -4.6, u), lerp(-27.3, -9.2, u)); tiles.lineTo(lerp(-12.2, 4.3, u), lerp(-30.6, -12.6, u)); }
    strokeP(K, tiles, '#8E4A3C', 0.45, 0.45);
    over(K, gable, N('#B85A44'), 1);
    // windows
    for (const wx of [-29.5, -10.5]) {
      const fr = poly([[wx - 3.3, -6], [wx + 3.3, -6], [wx + 3.3, 1.2], [wx - 3.3, 1.2]]);
      const gl = poly([[wx - 2.4, -5.1], [wx + 2.4, -5.1], [wx + 2.4, 0.3], [wx - 2.4, 0.3]]);
      over(K, fr, N('#E9DCC6'), 1);
      over(K, gl, lit > 0 ? mixc(N('#6E7894'), '#F6C35E', lit) : N('#6E7894'), 1);
      if (lit > 0) { glow(K, wx, -2.4, 9 * (1 + 0.6 * n), '#FFCB6A', 0.45 * lit * (1 + 0.8 * n)); if (o.lights) o.lights.addPath(gl); }
      if (lk > 0) { pen(K, fr, 0.7 * lk, 0.3, { double: false }); pen(K, [[wx, -5.1], [wx, 0.3]], 0.6 * lk, 0.3, { double: false }); pen(K, [[wx - 2.4, -2.4], [wx + 2.4, -2.4]], 0.6 * lk, 0.3, { double: false }); }
    }
    // the door (opens inward, warm light)
    const dpts = [[-23.8, 9.5], [-23.8, -0.6]];
    for (let i = 0; i <= 8; i++) { const a = Math.PI + Math.PI * (i / 8); dpts.push([-20 + Math.cos(a) * 3.8, -0.6 + Math.sin(a) * 3.8]); }
    dpts.push([-16.2, 9.5]);
    const dp = poly(dpts);
    const frameP = [[-25, 9.5], [-25, -0.6]];
    for (let i = 0; i <= 8; i++) { const a = Math.PI + Math.PI * (i / 8); frameP.push([-20 + Math.cos(a) * 5, -0.6 + Math.sin(a) * 5]); }
    frameP.push([-15, 9.5]);
    over(K, poly(frameP), N('#E2CFB2'), 1);
    if (door > 0.001) {
      over(K, dp, LG(K.p, 0, -4.5, 0, 9.5, [[0, '#FFF3CF'], [1, '#F4B455']]), 1);
      if (o.lights) o.lights.addPath(dp);
      // leaf hinged at the left jamb, swinging inward (foreshortened)
      const wv = 7.6 * (1 - 0.86 * sstep(0, 1, door));
      const leaf = poly([[-23.8, 9.5], [-23.8, -0.6], [-23.8 + wv, -0.6 - 0.9 * door], [-23.8 + wv, 9.5 + 0.6 * door]]);
      over(K, leaf, N('#8A5C3E'), 1);
      glaze(K, leaf, '#4E3328', 0.35 * door);
      // spill of warm light on the path
      glaze(K, smooth([[-23.4, 9.8], [-16.6, 9.8], [-8, 32], [-30, 32]], true), '#F6C35E', 0.5 * door, 2.2);
      lift(K, smooth([[-22, 10], [-18, 10], [-14, 22], [-25, 22]], true), 0.3 * door, 2);
      glow(K, -20, 3, 16, '#FFD27A', 0.6 * door);
      glow(K, -20, 14, 22, '#FFC860', 0.3 * door);
    } else {
      over(K, dp, N('#9A6A48'), 1);
      glaze(K, poly([[-20, 9.5], [-20, -4.4], [-16.2, -0.6], [-16.2, 9.5]]), '#5E3E30', 0.35);
      over(K, circle(-17.6, 3, 0.55), P.gold, 1);
    }
    if (lk > 0) {
      pen(K, wall, 0.9 * lk, 0.36); pen(K, side, 0.9 * lk, 0.3); pen(K, roofS, 0.9 * lk, 0.32); pen(K, chim, 0.8 * lk, 0.3, { double: false });
      pen(K, dp, 0.8 * lk, 0.36, { double: false });
    }
  }

  // ---------- alternative worlds for other people ----------
  function pwSea(K, o) {
    const { t, life, n, lk, seed } = o;
    const N = (c) => pwNight(c, n);
    pwSky(K, N('#A9CBE6'), N('#F6EAD6'), 1, o, false);
    // sun low over the sea
    const sun = circle(36, -16, 10);
    over(K, sun, N('#F8DFA0'), 0.95);
    glow(K, 36, -16, 34, '#FFE7B0', 0.4 * (1 - n));
    const hz = 4;
    const sea = poly([[-110, hz], [110, hz], [110, 112], [-110, 112]]);
    over(K, sea, LG(K.p, 0, hz, 0, 60, [[0, N('#8DBBD9')], [0.5, N('#6C9EC6')], [1, N('#5D8EBB')]]), 1);
    occlude(K, sea, 1);
    lift(K, poly([[-110, hz], [110, hz], [110, hz + 1.6], [-110, hz + 1.6]]), 0.35, 0.6);
    // sun glitter path
    const gl = new Path2D();
    for (let i = 0; i < 9; i++) { const y = hz + 3 + i * 3.4, w = 3 + i * 1.3; const ph = Math.sin(t * (1 + life * 2) + i * 1.7) * 2; gl.addPath(ellipse(36 + ph, y, w, 0.6 + i * 0.07)); }
    lift(K, gl, 0.7);
    glow(K, 36, hz + 14, 26, '#FFF0C8', 0.25 * (1 - n));
    // waves: little lifted arcs drifting
    const wv = new Path2D();
    const r = E.rng(seed * 7 + 2);
    for (let i = 0; i < 22; i++) {
      const y = hz + 4 + Math.pow(r(), 1.4) * 40;
      const s = 2 + (y - hz) * 0.12;
      const x = -100 + ((r() * 200 + t * (2 + life * 6) * (0.5 + (y - hz) / 40)) % 200);
      wv.moveTo(x - s, y); wv.quadraticCurveTo(x, y - s * 0.55, x + s, y);
    }
    strokeP(K, wv, '#FFFFFF', 0.9, 0.85, { over: true });
    // beach in front
    const shore = (x) => 40 + 7 * Math.sin(x * 0.028 + 0.6) + 0.0016 * x * x;
    const beach = pwHillPath(shore);
    over(K, beach, LG(K.p, 0, 34, 0, 100, [[0, N('#EEDCB0')], [1, N('#D9BF8A')]]), 1);
    occlude(K, beach, 1);
    const foamY = (x) => shore(x) - 1 + Math.sin(x * 0.12 + t * (1 + life * 2)) * 0.9;
    const foam = smooth(Array.from({ length: 23 }, (_, i) => { const x = -110 + i * 10; return [x, foamY(x)]; }).concat(Array.from({ length: 23 }, (_, i) => { const x = 110 - i * 10; return [x, foamY(x) + 2.2]; })), true);
    glaze(K, foam, '#B9A07A', 0.35);
    lift(K, foam, 0.75, 0.4);
    // rocks
    for (const [rx, ry, rs] of [[-62, shore(-62) + 6, 8], [-50, shore(-50) + 10, 5]]) {
      const rk = blobP(rx, ry - rs * 0.4, rs, { rx: rs * 1.3, ry: rs * 0.8, seed: Math.round(rx), irr: 0.2 });
      over(K, rk, N('#9C93A8'), 1);
      crescent(K, rk, [rx - rs * 1.5, ry - rs * 1.5, rs * 3, rs * 2.2], -rs * 0.4, -rs * 0.3, '#5E5872', 0.5);
      if (lk > 0) pen(K, rk, 0.8 * lk, 0.3, { double: false });
    }
    // sailboat, bobbing
    const by = hz + 14 + Math.sin(t * 1.8) * 0.8 * (0.3 + life), bx = -26 + Math.sin(t * 0.3) * 3 * life;
    const ba = Math.sin(t * 1.6) * 0.05 * (0.3 + life);
    withAll(K, () => {
      moveAll(K, bx, by, ba);
      const hull = smooth([[-11, -1], [11, -1], [8, 3.6], [-8, 3.6]], true);
      over(K, hull, N('#B4644E'), 1);
      glaze(K, poly([[-9, 1.5], [9.5, 1.5], [8, 3.6], [-8, 3.6]]), '#5E3A34', 0.4);
      strokeP(K, [[0, -1], [0, -26]], N('#6E5240'), 0.9, 1, { over: true });
      const sail = poly([[0.8, -25], [0.8, -2.5], [12, -2.5]]);
      over(K, sail, N('#FBF7EE'), 1);
      glaze(K, poly([[0.8, -25], [0.8, -2.5], [5, -2.5]]), '#A9A3C4', 0.35);
      const jib = poly([[-0.8, -22], [-0.8, -2.5], [-8.5, -2.5]]);
      over(K, jib, N('#F3EDE2'), 1);
      over(K, poly([[0, -26], [5, -24.6], [0, -23.2]]), N('#C9455A'), 1);
      if (lk > 0) { pen(K, hull, 0.8 * lk, 0.32, { double: false }); pen(K, sail, 0.8 * lk, 0.3, { double: false }); pen(K, jib, 0.8 * lk, 0.3, { double: false }); }
    });
    pwBirds(K, t, Math.max(life, 0.3) * (1 - n), 3, -58, seed);
    o.drips = [{ x0: -100, x1: 100, y: hz + 2, col: '#6C9EC6', n: 12 }, { x0: -100, x1: 100, y: 42, col: '#D9BF8A', n: 8 }, { x0: -36, x1: -16, y: by + 3, col: '#B4644E', n: 3 }];
    o.parts = { x: -26, y: -10, col: '#F3EDE2', petal: '#8DBBD9', px: 0, py: 20 };
  }
  function pwCity(K, o) {
    const { t, life, n, lk, seed, lit } = o;
    const N = (c) => pwNight(c, n);
    pwSky(K, N('#C9D2E8'), N('#F8E6CF'), 1, o, true);
    const gy = (x) => 22 + 0.0016 * x * x;
    const r = E.rng(seed * 41 + 9);
    // far skyline (soft)
    const far = new Path2D();
    for (let i = 0; i < 9; i++) { const x = -90 + i * 22 + r() * 6, w = 14 + r() * 8, h = 18 + r() * 18; far.addPath(poly([[x, 24], [x, 24 - h], [x + w, 24 - h], [x + w, 24]])); }
    glaze(K, far, N('#B8B9CF'), 0.55, 0.6);
    const hill = pwHillPath(gy);
    // minaret + dome (left)
    const domeP = smooth([[-58, 6], [-57, -2], [-52, -9], [-45, -11.5], [-38, -9], [-33, -2], [-32, 6]], true);
    const domeBase = poly([[-60, 22], [-60, 6], [-30, 6], [-30, 22]]);
    const min = poly([[-71, 22], [-71, -30], [-67, -30], [-67, 22]]);
    const minB = poly([[-72.2, -18], [-65.8, -18], [-65.8, -20], [-72.2, -20]]);
    const minC = poly([[-71.4, -30], [-69, -44], [-66.6, -30]]);
    const all = new Path2D(); [domeP, domeBase, min, minC].forEach((p2) => all.addPath(p2));
    occlude(K, all, 1);
    over(K, min, N('#F1E6D2'), 1); glaze(K, poly([[-69, 22], [-69, -30], [-67, -30], [-67, 22]]), '#9C8F9F', 0.45);
    over(K, minB, N('#E2D4BC'), 1); over(K, minC, N('#8E9CB8'), 1);
    over(K, domeBase, N('#F3E8D6'), 1);
    over(K, domeP, N('#78B5B0'), 1);
    crescent(K, domeP, [-58, -12, 26, 18], -6, -3, '#3F8087', 0.45);
    lift(K, ellipse(-50, -4, 1.6, 4, 0.4), 0.5);
    if (lk > 0) { pen(K, min, 0.8 * lk, 0.3, { double: false }); pen(K, domeP, 0.8 * lk, 0.3, { double: false }); pen(K, domeBase, 0.8 * lk, 0.3, { double: false }); }
    // houses
    const cols = ['#F3E6D0', '#EBC9B8', '#F1DCA8', '#DDE3E6', '#F6EEE0', '#E8CFC0'];
    const houses = [[-28, 12, 26], [-14, 13, 34], [1, 12, 22], [14, 14, 40], [30, 12, 28], [44, 13, 20], [57, 12, 30]];
    houses.forEach(([x, w, h], i) => {
      const base = gy(x + w / 2) + 2;
      const top = base - h * (0.85 + 0.15 * r());
      const body = poly([[x, base], [x, top], [x + w, top], [x + w, base]]);
      const roof = i % 3 === 1 ? poly([[x - 1, top + 0.5], [x + w / 2, top - w * 0.42], [x + w + 1, top + 0.5]]) : poly([[x - 0.8, top + 0.6], [x - 0.8, top - 2], [x + w + 0.8, top - 2], [x + w + 0.8, top + 0.6]]);
      const both = new Path2D(); both.addPath(body); both.addPath(roof);
      occlude(K, both, 1);
      over(K, body, N(cols[(i + seed) % cols.length]), 1);
      glaze(K, poly([[x + w * 0.62, base], [x + w * 0.62, top], [x + w, top], [x + w, base]]), '#9C8FA8', 0.32);
      over(K, roof, N(i % 3 === 1 ? '#C8664E' : '#B9A08A'), 1);
      const wins = new Path2D(), lw = new Path2D();
      for (let yy = top + 4; yy < base - 5; yy += 7) for (let xx = x + 2.5; xx < x + w - 3; xx += 5) {
        const on = lit > 0 && noise1(xx * 0.7 + yy * 1.3 + Math.floor(t * (0.5 + life)) * 0.37, seed) > 0.05;
        (on ? lw : wins).addPath(poly([[xx, yy], [xx + 2.4, yy], [xx + 2.4, yy + 3.2], [xx, yy + 3.2]]));
      }
      over(K, wins, N('#6E7894'), 1);
      over(K, lw, '#F6C35E', 1);
      if (lit > 0) { o.lights = o.lights || new Path2D(); o.lights.addPath(lw); }
      if (lit > 0) glow(K, x + w / 2, (top + base) / 2, w, '#FFCB6A', 0.18 * lit);
      if (lk > 0) pen(K, body, 0.8 * lk, 0.28, { double: false });
    });
    over(K, hill, LG(K.p, 0, 20, 0, 104, [[0, N('#B9C98A')], [0.5, N('#93B068')], [1, N('#76704F')]]), 1);
    occlude(K, hill, 1);
    // cypresses
    for (const cx of [-80, 72]) TREE(K.L, cx, gy(cx) + 2, 34, { kind: 'cypress', seed: 2 + cx, t, sway: 0.4 + life, alpha: K.a, shadow: 0.6, night: n });
    pwBirds(K, t, Math.max(life, 0.2) * (1 - n), 2, -54, seed);
    pwSmoke(K, 22, gy(22) - 46, t, life * 0.8, 3);
    o.drips = [{ x0: -60, x1: 70, y: 18, col: '#C9B8A0', n: 12 }, { x0: -58, x1: -32, y: 6, col: '#78B5B0', n: 4 }, { x0: -100, x1: 100, y: 26, col: '#93B068', n: 10 }];
    o.parts = { x: 10, y: -10, col: '#F1DCA8', petal: '#C8664E', px: -40, py: 10 };
  }
  function pwField(K, o) {
    const { t, life, n, lk, seed } = o;
    const N = (c) => pwNight(c, n);
    pwSky(K, N('#C6DCEC'), N('#FAEBCB'), 1, o, false);
    over(K, circle(-40, -40, 9), N('#F8DFA0'), 0.9);
    glow(K, -40, -40, 30, '#FFE7B0', 0.35 * (1 - n));
    glaze(K, pwHillPath((x) => 2 + 0.003 * (x - 30) * (x - 30)), N('#B9CBA4'), 0.65);
    const gy = (x) => 12 + 0.0018 * x * x + 3 * Math.sin(x * 0.04 + 2);
    const hill = pwHillPath(gy);
    over(K, hill, LG(K.p, 0, 10, 0, 104, [[0, N('#EED48A')], [0.4, N('#E2B964')], [1, N('#B58A4A')]]), 1);
    occlude(K, hill, 1);
    // furrows converging toward the horizon
    const rows = new Path2D();
    for (let i = -7; i <= 7; i++) { rows.moveTo(i * 4, gy(i * 4) + 1); rows.quadraticCurveTo(i * 9, 50, i * 20, 112); }
    strokeP(K, rows, N('#C29646'), 0.7, 0.5);
    lift(K, smooth([[-100, gy(-100) + 1], [0, gy(0) + 0.5], [100, gy(100) + 1], [100, gy(100) + 5], [0, gy(0) + 4], [-100, gy(-100) + 5]], true), 0.3, 1.2);
    // haystack
    const hs = smooth([[-52, gy(-52) + 3], [-51, gy(-52) - 6], [-45, gy(-52) - 12], [-39, gy(-52) - 6], [-38, gy(-52) + 3]], true);
    over(K, hs, N('#D9AE5B'), 1); occlude(K, hs, 1);
    crescent(K, hs, [-52, gy(-52) - 13, 15, 17], -4, -2, '#9A6E36', 0.45);
    if (lk > 0) pen(K, hs, 0.8 * lk, 0.3, { double: false });
    TREE(K.L, 48, gy(48) + 1.5, 46, { kind: 'round', seed: 6 + seed, t, sway: 0.35 + life, alpha: K.a, shadow: 0.8, night: n });
    // foreground wheat
    for (let i = 0; i < 5; i++) WHEAT(K.L, -60 + i * 30 + (i % 2) * 6, 74 + (i % 2) * 8, 26, { t: t * (0.4 + life), count: 4, seed: seed + i, alpha: K.a, night: n });
    // poppies
    const pp = new Path2D();
    const r = E.rng(seed + 11);
    for (let i = 0; i < 10; i++) { const x = -80 + r() * 160; pp.addPath(circle(x, gy(x) + 16 + r() * 40, 1.4)); }
    over(K, pp, N('#C9455A'), 1);
    pwBirds(K, t, Math.max(life, 0.3) * (1 - n), 3, -60, seed);
    o.drips = [{ x0: -100, x1: 100, y: 16, col: '#D9AE5B', n: 14, w: 2.6 }, { x0: 30, x1: 66, y: -10, col: '#6E9A50', n: 4 }];
    o.parts = { x: 48, y: -14, col: '#D9AE5B', petal: '#C9455A', px: 0, py: 40 };
  }
  function pwOrchard(K, o) {
    const { t, life, n, lk, seed } = o;
    const N = (c) => pwNight(c, n);
    pwSky(K, N('#BCD8E6'), N('#F4F0D8'), 1, o, true);
    glaze(K, pwHillPath((x) => 0 + 0.003 * (x + 30) * (x + 30)), N('#A9C7B0'), 0.6);
    const gy = (x) => 10 + 0.0022 * x * x;
    const hill = pwHillPath(gy);
    over(K, hill, LG(K.p, 0, 8, 0, 104, [[0, N('#BCD685')], [0.4, N('#98BF68')], [1, N('#6E8E50')]]), 1);
    occlude(K, hill, 1);
    if (lk > 0) pen(K, Array.from({ length: 23 }, (_, i) => { const x = -105 + i * 10; return [x, gy(x)]; }), 0.8 * lk, 0.2);
    const sw = 0.35 + life;
    TREE(K.L, -42, gy(-42) + 4, 40, { kind: 'fruit', seed: 3 + seed, t, sway: sw, alpha: K.a, shadow: 0.8, night: n });
    TREE(K.L, 40, gy(40) + 3, 44, { kind: 'fruit', seed: 5 + seed, t: t + 1, sway: sw, alpha: K.a, shadow: 0.8, fruitColor: '#E0663E', night: n });
    TREE(K.L, -2, 52, 62, { kind: 'fruit', seed: 1 + seed, t: t + 2, sway: sw, alpha: K.a, shadow: 0.9, night: n });
    // a fruit that drops now and then
    if (life > 0.01) {
      const u = (((t * 0.22) % 1) + 1) % 1;
      const fy = lerp(14, 54, Math.min(1, u * u * 4));
      over(K, circle(16, fy, 2.4), N('#D1453F'), life * (1 - sstep(0.85, 1, u)));
    }
    const fallen = new Path2D();
    for (const [fx, fy] of [[-30, 58], [22, 60], [10, 64]]) fallen.addPath(circle(fx, fy, 2.2));
    over(K, fallen, N('#C9453F'), 1);
    pwBirds(K, t, life * (1 - n), 2, -64, seed);
    o.drips = [{ x0: -100, x1: 100, y: 14, col: '#98BF68', n: 12 }, { x0: -20, x1: 20, y: 30, col: '#6E9A50', n: 5, w: 3 }];
    o.parts = { x: -2, y: 18, col: '#74A85B', petal: '#D1453F', px: -2, py: 18 };
  }

  /** soap-bubble glass: rim, iridescence, highlight window, faint reflection */
  function pwGlass(K, o) {
    const { rimA, f, t, n, lk, mir } = o;
    const disc = circle(0, 0, 100);
    K.p.save(); K.p.clip(disc);
    glaze(K, disc, RG(K.p, 0, 0, 0, 100, [[0, 'rgba(255,255,255,0)'], [0.84, rgba('#9AA6C8', 0)], [0.955, rgba('#8E9AC0', 0.17)], [1, rgba('#6E7A9C', 0.42)]]), rimA);
    // thin soap-film colours along the rim
    const irid = [[-2.25, '#EDA9C2'], [-0.55, '#A6D3E8'], [0.95, '#F3D48A'], [2.45, '#B5A6E0'], [1.75, '#A9DCC8']];
    for (const [a, c] of irid) glaze(K, ellipse(Math.cos(a) * 91, Math.sin(a) * 91, 30, 7, a + Math.PI / 2), c, 0.4 * rimA * (1 - n * 0.5), 3.5);
    // faint reflection: a soft curved band (window/horizon seen in the glass)
    const band = new Path2D(); band.ellipse(0, 6, 86, 68, 0, Math.PI * 1.12, Math.PI * 1.88); band.ellipse(0, 10, 80, 60, 0, Math.PI * 1.88, Math.PI * 1.12, true); band.closePath();
    lift(K, band, 0.16 * rimA, 1.4);
    K.p.restore();
    // highlight window (upper-left) and a small secondary glint (lower-right): bare paper
    const win = [];
    for (let i = 0; i <= 10; i++) { const a = lerp(3.62, 4.5, i / 10); win.push([Math.cos(a) * 88, Math.sin(a) * 88]); }
    for (let i = 10; i >= 0; i--) { const a = lerp(3.7, 4.42, i / 10); win.push([Math.cos(a) * 73, Math.sin(a) * 73]); }
    const wp = smooth(win, true);
    lift(K, wp, 0.82 * rimA, 0.7);
    lift(K, ellipse(-28, -58, 4.5, 3, -0.6), 0.75 * rimA, 0.5);
    const g2 = [];
    for (let i = 0; i <= 8; i++) { const a = lerp(0.25, 0.95, i / 8); g2.push([Math.cos(a) * 91, Math.sin(a) * 91]); }
    for (let i = 8; i >= 0; i--) { const a = lerp(0.32, 0.88, i / 8); g2.push([Math.cos(a) * 86, Math.sin(a) * 86]); }
    lift(K, smooth(g2, true), 0.45 * rimA, 0.6);
    glow(K, -50, -58, 30, '#FFFFFF', 0.25 * rimA * (1 - mir * 0.3));
    // pencil outline: unbroken when calm; breaks and re-forms when flickering
    const segs = 14;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * TAU + 0.15, a1 = ((i + 1) / segs) * TAU + 0.15;
      if (f > 0 && noise1(t * 3.1 + i * 1.73, 9) < -1 + 1.25 * f) continue;
      const pts = [];
      for (let j = 0; j <= 6; j++) {
        const a = lerp(a0, a1 - (f > 0 ? 0.06 * f : 0), j / 6);
        const rr = 100.4 + 0.5 * noise1(a * 4, 2) + f * 2.4 * noise1(t * 7 + i * 3.3, 4);
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      pen(K, pts, 1.1 * lk, 0.36 * rimA);
    }
    if (lk > 0) {
      const inner = [];
      for (let j = 0; j <= 12; j++) { const a = lerp(0.1, 1.5, j / 12); inner.push([Math.cos(a) * 95.5, Math.sin(a) * 95.5]); }
      pen(K, inner, 0.8 * lk, 0.12 * rimA, { double: false });
    }
  }

  /**
   * E.props.personalWorld(L, x, y, r, opts) — see header.
   */
  PR.personalWorld = function personalWorld(L, x, y, r, opts) {
    r = num(r, 200);
    if (!(r > 0.5)) return;
    const o = opts || {};
    const kind = kindOf(o.kind, PW_KINDS, 'home');
    const t = num(o.t, 0);
    const glowA = clamp(num(o.glow, 0));
    const life = clamp(num(o.life, 0));
    const d = clamp(num(o.dissolve, 0));
    const f = clamp(num(o.flicker, 0));
    const mir = clamp(num(o.mirror, 0));
    const door = clamp(num(o.doorOpen, 0));
    const night = clamp(num(o.night, 0));
    const seed = Math.max(1, Math.round(num(o.seed, 1)));
    // flicker: jitter, wobble, transparency flutter
    const jx = f * 2.2 * noise1(t * 9.3, 11), jy = f * 2.2 * noise1(t * 8.7 + 40, 12);
    const flutter = 1 - f * 0.45 * (0.5 + 0.5 * noise1(t * 7.3, 13));
    const wob = 1 + f * 0.012 * Math.sin(t * 11.7);
    drawProp(L, num(x, 0) + jx * r / 100, num(y, 0) + jy * r / 100, (r / 100) * wob, num(o.alpha, 1) * flutter, (K) => {
    const rpx = 100 * K.s;
    const lk = rpx < 45 ? 0 : lineK(rpx * 1.1);
    const disc = circle(0, 0, 100);
    const ghost = 1 - 0.86 * sstep(0.05, 1, d);
    // ---- warm glow around the bubble (paint halo + light)
    if (glowA > 0) {
      // halo: a ring OUTSIDE the glass only (a radial gradient with r0 > 0 would also tint the whole interior)
      const ring = new Path2D(); ring.addPath(circle(0, 0, 150)); ring.addPath(circle(0, 0, 99)); ring._bb = [-150, -150, 300, 300];
      fillP(K, ring, RG(K.p, 0, 0, 99, 150, [[0, rgba('#F6D58E', 0.42 * glowA)], [1, rgba('#F6D58E', 0)]]), 1, { rule: 'evenodd' });
      glow(K, 0, 0, 170, '#FFD98A', 0.35 * glowA);
    }
    // ---- the glass softens what lies behind it
    occlude(K, disc, 0.35 * ghost);
    lift(K, disc, (0.16 + 0.3 * (1 - night)) * ghost);
    // ---- interior (clipped to the sphere on all layers)
    for (const c of [K.p, K.k, K.l]) { c.save(); c.clip(disc); }
    const KI = { ...K, a: K.a * ghost };
    const io = { t, life, door, lit: clamp(glowA * 0.9 + door * 0.35), n: night, lk: lk * (1 - d * 0.6), seed, d };
    withAll(K, () => {
      if (d > 0) for (const c of [K.p, K.k, K.l]) c.translate(0, d * 6);
      const fn = { home: pwHome, sea: pwSea, city: pwCity, field: pwField, orchard: pwOrchard }[kind];
      fn(KI, io);
    });
    // colours run down and wash out to bare paper (top first)
    if (d > 0.001) {
      pwDrips(K, io.drips || [], d, t, seed);
      fillP(K, disc, LG(K.p, 0, -100, 0, 100, [[0, 'rgba(255,255,255,0.75)'], [0.6, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0.1)']]), sstep(0.25, 1, d) * 0.9, { over: true });
      // leaves / petals detaching and drifting down
      const pr = E.rng(seed * 3 + 77);
      const pc = io.parts || { x: 0, y: 0, col: '#7DAE60', petal: '#D9566A', px: 0, py: 0 };
      for (let i = 0; i < 16; i++) {
        const th = pr() * 0.6;
        const k = sstep(th, th + 0.4, d);
        const ox = (i % 2 ? pc.x : pc.px) + (pr() - 0.5) * 30, oy = (i % 2 ? pc.y : pc.py) + (pr() - 0.5) * 20;
        const dx = (pr() - 0.3) * 40, dy = 30 + pr() * 60;
        if (k <= 0.01 || k >= 0.99) continue;
        const px = ox + dx * k + Math.sin(t * 2 + i) * 4 * k, py = oy + dy * k;
        const lp = smooth(xf(leafPts(5, 3, 0.2), px, py, t * 1.5 + i * 2), true);
        over(K, lp, i % 2 ? pc.col : pc.petal, 0.85 * (1 - k));
      }
    }
    // night: cool moonlit glaze over the interior; lit windows (and an open door) keep their warm light
    if (night > 0) {
      glaze(K, disc, LG(K.p, 0, -100, 0, 100, [[0, rgba('#4E62A0', 0.22 * night)], [1, rgba('#2C3866', 0.36 * night)]]), 1);
      if (io.lights && io.lit > 0.01) withAll(K, () => {
        if (d > 0) for (const c of [K.p, K.k, K.l]) c.translate(0, d * 6);
        over({ ...K, a: K.a * ghost }, io.lights, '#F8CC6C', clamp(io.lit + door) * night * 0.95);
      });
    }
    // inner warm glow
    if (glowA > 0) {
      lift(K, ellipse(-14, -4, 60, 46), 0.42 * glowA * (1 - 0.8 * night), 16);
      glaze(K, disc, RG(K.p, -12, 6, 0, 78, [[0, rgba('#FBE3A6', 0.2 * glowA)], [0.6, rgba('#F6D08A', 0.08 * glowA)], [1, rgba('#F2C070', 0)]]), 1);
      glow(K, -10, 0, 90, '#FFE2A0', 0.3 * glowA);
    }
    // mirror: a silvery sheen sweeps over the landscape from the upper-left
    if (mir > 0.001) {
      const pos = lerp(-150, 150, E.ease.inOutSine(mir));
      const front = [];
      for (let i = 0; i <= 12; i++) { const u = lerp(-150, 150, i / 12); front.push([u + 3 * noise1(i * 0.8 + t * 0.4, 21), 0]); }
      const ca = Math.SQRT1_2;
      const toXY = ([u, v]) => [(pos + v) * ca - u * ca, (pos + v) * ca + u * ca];
      const reg = smooth(front.map(([u]) => toXY([u, 3 * noise1(u * 0.05 + t * 0.3, 22)])).concat([toXY([150, -400]), toXY([-150, -400])]), true);
      fillP(K, reg, LG(K.p, -70, -70, 70, 70, [[0, '#F8FAFC'], [0.45, '#DCE2EB'], [0.8, '#B6C0D1'], [1, '#9AA6BC']]), 0.8, { over: true, soft: 3 });
      K.p.save(); K.p.clip(reg);
      // a cool reflected band (dark surroundings seen in the mirror) and crisp diagonal gleams
      const D2 = (v, u) => [(v + u) * ca, (v - u) * ca];
      const band = (v, w) => poly([D2(v, -160), D2(v, 160), D2(v + w, 160), D2(v + w, -160)]);
      glaze(K, band(18, 46), '#8592B0', 0.22, 2.5);
      const dr = Math.sin(t * 0.25) * 5;
      lift(K, band(-52 + dr, 18), 0.78, 0.35);
      lift(K, band(-26 + dr, 5), 0.62, 0.3);
      lift(K, band(46 + dr, 8), 0.4, 0.4);
      glaze(K, disc, RG(K.p, 40, 40, 10, 110, [[0, 'rgba(255,255,255,0)'], [1, rgba('#6E7A96', 0.28)]]), 1);
      K.p.restore();
      if (mir < 1) {
        const fr = smooth(front.map(([u]) => toXY([u, 0])), false);
        strokeP(K, fr, '#FFFFFF', 4, 0.6 * (1 - mir), { over: true, soft: 1.5 });
      }
      glow(K, -30, -30, 70, '#F4F8FF', 0.25 * mir);
    }
    for (const c of [K.p, K.k, K.l]) c.restore();
    // ---- glass
    pwGlass(K, { rimA: 1 - 0.55 * d, f, t, n: night, lk: Math.max(lk, 0.5), mir });
    });
  };
  /** position of the 'home' world's house door (centre of the doorway) for a world drawn at (x, y, r) */
  PR.personalWorldDoor = function personalWorldDoor(x, y, r) {
    const s = num(r, 200) / 100;
    return [num(x, 0) + PW_DOOR[0] * s, num(y, 0) + PW_DOOR[1] * s];
  };

  // =====================================================================================================
  //  8. GROUND — full-width layered landscape band from y to the bottom of the frame
  // =====================================================================================================
  const GROUND_PAL = {
    spring: { far: '#CADDD0', far2: '#B9D2B2', mid: '#B9D38C', near: '#97BF69', fore: '#7AA758', dark: '#557F45', crest: 0.4, mist: 0.34, tree: '#8DB27A', flowers: ['#FBF3E2', '#EDBF55', '#DD6A7A'] },
    garden: { far: '#C4DACB', far2: '#B0CDA8', mid: '#AED07E', near: '#8BB862', fore: '#6E9F51', dark: '#4A7A40', crest: 0.38, mist: 0.3, tree: '#7EA96A', flowers: ['#FBF3E2', '#DD6A7A', '#EDBF55', '#B98AC8', '#C9455A'] },
    dusk: { far: '#D5B6BE', far2: '#C6A9AA', mid: '#C4AE78', near: '#A19A5D', fore: '#80824E', dark: '#5C5E3E', crest: 0.32, mist: 0.3, tree: '#A9AA80', treeD: '#7A6E86', flowers: ['#F4D8B0', '#DB8E6E'] },
    night: { far: '#5C6990', far2: '#506083', mid: '#455A72', near: '#3B4F61', fore: '#314452', dark: '#25333E', crest: 0.16, mist: 0.16, tree: '#43596C', flowers: ['#B9C3DE'] },
  };
  PR.ground = function ground(L, y, opts) {
    const o = opts || {};
    const palName = kindOf(o.palette, ['spring', 'garden', 'dusk', 'night'], 'spring');
    const pal = GROUND_PAL[palName];
    const seed = Math.round(num(o.seed, 1));
    const t = num(o.t, 0);
    const x0 = num(o.x0, -80), x1 = num(o.x1, E.W + 80);
    const y0 = num(y, 1200);
    const bottom = Math.max(y0 + 50, num(o.bottom, E.H + 120));
    drawProp(L, 0, 0, 1, num(o.alpha, 1), (K) => {
    const W = x1 - x0;
    const flowersD = clamp(num(o.flowers, palName === 'garden' ? 1 : palName === 'spring' ? 0.55 : 0.2));
    const trees = clamp(num(o.trees, 0.6));
    const depth = bottom - y0;
    const sc = clamp(depth / 700, 0.4, 1.6);
    const band = (yy, amp, freq, sd, col, crest) => {
      const pts = [];
      const n = Math.max(8, Math.round(W / 36));
      for (let i = 0; i <= n; i++) {
        const x = x0 + (W * i) / n;
        pts.push([x, yy + amp * (E.fbm1(x * freq + sd * 7.1, seed + sd, 3) * 1.4) + amp * 0.35 * Math.sin(x * freq * 2.3 + sd)]);
      }
      const path = smooth(pts.concat([[x1 + 40, bottom], [x0 - 40, bottom]]), true);
      over(K, path, col, 1);
      occlude(K, path, 1);
      if (crest > 0) {
        // sunlit crest: paper glows back along the top of the hill, fading downward
        const strip = smooth(pts.map(([x, yv]) => [x, yv + 1]).concat(pts.slice().reverse().map(([x, yv]) => [x, yv + 26 * sc])), true);
        K.p.save(); K.p.clip(path);
        fillP(K, strip, LG(K.p, 0, yy - amp, 0, yy + amp + 26 * sc, [[0, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]), crest, { over: true, soft: 3 });
        K.p.restore();
      }
      return { path, pts };
    };
    // far hills (pale, atmospheric)
    band(y0 - 6 * sc, 34 * sc, 0.0036, 1, pal.far, pal.crest * 0.6);
    const f2 = band(y0 + depth * 0.07, 30 * sc, 0.0048, 2, pal.far2, pal.crest * 0.7);
    // faint pencil along that ridge (drawn before the trees, which erase it where they stand)
    pen(K, f2.pts, 1.1, 0.1);
    // distant trees on that ridge: copses of soft round crowns sitting ON the ridge (they overlap it from below, so
    // they never float) and slender cypress spires
    if (trees > 0) {
      const r = E.rng(seed * 61 + 5);
      const tr = new Path2D(), trD = new Path2D();
      const ridgeY = (x) => {
        const u = clamp((x - x0) / W) * (f2.pts.length - 1), j = Math.floor(u), f = u - j;
        const a = f2.pts[Math.min(j, f2.pts.length - 1)], b = f2.pts[Math.min(j + 1, f2.pts.length - 1)];
        return lerp(a[1], b[1], f);
      };
      const n = Math.round((W / 95) * trees);
      for (let i = 0; i < n; i++) {
        const x = x0 + r() * W;
        if (r() < 0.4) {
          // a pair or trio of cypresses
          const k = 1 + Math.floor(r() * 3);
          for (let m = 0; m < k; m++) {
            const xx = x + (m - (k - 1) / 2) * 9 * sc + (r() - 0.5) * 4 * sc;
            const yy = ridgeY(xx) + 6 * sc, hh = (24 + r() * 20) * sc;
            tr.addPath(smooth([[xx - hh * 0.11, yy], [xx - hh * 0.14, yy - hh * 0.42], [xx - hh * 0.04, yy - hh * 0.86], [xx, yy - hh], [xx + hh * 0.05, yy - hh * 0.86], [xx + hh * 0.14, yy - hh * 0.42], [xx + hh * 0.11, yy]], true));
            trD.addPath(smooth([[xx + hh * 0.01, yy], [xx + hh * 0.03, yy - hh * 0.5], [xx + hh * 0.02, yy - hh * 0.9], [xx + hh * 0.13, yy - hh * 0.42], [xx + hh * 0.11, yy]], true));
          }
        } else {
          // a copse: 2-4 overlapping, slightly flattened crowns of different sizes
          const k = 2 + Math.floor(r() * 3);
          let xx = x;
          for (let m = 0; m < k; m++) {
            const rr = (7 + r() * 8) * sc * (m === 1 ? 1.25 : 1);
            const yy = ridgeY(xx) + 4 * sc;
            tr.addPath(blobP(xx, yy - rr * 0.72, rr, { rx: rr * 1.1, ry: rr * 0.9, seed: i * 7 + m + seed, irr: 0.2, n: 18 }));
            trD.addPath(blobP(xx + rr * 0.35, yy - rr * 0.42, rr * 0.62, { rx: rr * 0.75, ry: rr * 0.5, seed: i * 7 + m + seed + 50, irr: 0.2, n: 12 }));
            xx += rr * (1.1 + r() * 0.5);
          }
        }
      }
      glaze(K, tr, pal.tree, 0.7, 0.9);
      glaze(K, trD, pal.treeD || pal.dark, 0.13, 1.1);
      occlude(K, tr, 0.85, 1);
    }
    // mist (drifts slowly)
    const md = Math.sin(t * 0.07 + seed) * 40;
    lift(K, blobP(E.W * 0.3 + md, y0 + depth * 0.13, 300, { rx: 520, ry: 22 * sc, seed: seed + 4, irr: 0.3 }), pal.mist, 9);
    // middle meadow
    const mid = band(y0 + depth * 0.17, 48 * sc, 0.0024, 3, pal.mid, pal.crest);
    glaze(K, mid.path, LG(K.p, 0, y0 + depth * 0.16, 0, y0 + depth * 0.45, [[0, 'rgba(255,255,255,0)'], [1, rgba(pal.dark, 0.22)]]), 1);
    lift(K, blobP(E.W * 0.62 - md * 0.5, y0 + depth * 0.25, 260, { rx: 460, ry: 18 * sc, seed: seed + 6, irr: 0.3 }), pal.mist * 0.6, 8);
    // near meadow
    const near = band(y0 + depth * 0.35, 44 * sc, 0.0019, 4, pal.near, pal.crest * 0.8);
    glaze(K, near.path, LG(K.p, 0, y0 + depth * 0.33, 0, bottom, [[0, 'rgba(255,255,255,0)'], [1, rgba(pal.dark, 0.4)]]), 1);
    const r2 = E.rng(seed * 13 + 1);
    for (let i = 0; i < 5; i++) glaze(K, blobP(x0 + r2() * W, y0 + depth * (0.4 + r2() * 0.5), 120, { rx: 160 + r2() * 120, ry: (30 + r2() * 26) * sc, seed: seed + 20 + i, irr: 0.3 }), r2() > 0.5 ? pal.dark : pal.mid, 0.14, 12);
    // foreground band
    const fore = band(y0 + depth * 0.66, 30 * sc, 0.0022, 5, pal.fore, pal.crest * 0.5);
    glaze(K, fore.path, LG(K.p, 0, y0 + depth * 0.64, 0, bottom, [[0, 'rgba(255,255,255,0)'], [1, rgba(pal.dark, 0.5)]]), 1);
    // grass tufts swaying (sparse, calm)
    const gs = new Path2D();
    const r3 = E.rng(seed * 7 + 3);
    const ng = Math.round(W / 40);
    for (let i = 0; i < ng; i++) {
      const x = x0 + r3() * W, v = r3(), yy = y0 + depth * (0.36 + v * 0.6);
      const hh = (5 + 13 * v) * sc;
      const sw = Math.sin(t * 1.2 + x * 0.02) * hh * 0.12;
      for (let j = -1; j <= 1; j++) { gs.moveTo(x + j * hh * 0.18, yy); gs.quadraticCurveTo(x + j * hh * 0.3 + sw * 0.5, yy - hh * 0.6, x + j * hh * 0.5 + sw, yy - hh * (1 - Math.abs(j) * 0.25)); }
    }
    strokeP(K, gs, pal.dark, 1.1, 0.32);
    // flowers dotted in the meadow (bigger nearer), small clusters
    if (flowersD > 0) {
      const r4 = E.rng(seed * 19 + 7);
      const nf = Math.round((W / 22) * flowersD);
      const byCol = pal.flowers.map(() => new Path2D());
      for (let i = 0; i < nf; i++) {
        const v = Math.pow(r4(), 0.8);
        const x = x0 + r4() * W, yy = y0 + depth * (0.36 + v * 0.62);
        const s = (1.3 + 3 * v) * sc * (palName === 'garden' ? 1.2 : 1);
        const ci = Math.floor(r4() * byCol.length);
        for (let j = 0; j < 3; j++) byCol[ci].addPath(circle(x + (r4() - 0.5) * 9 * s, yy + (r4() - 0.5) * 3 * s, s * (0.7 + r4() * 0.5)));
      }
      byCol.forEach((p2, i) => over(K, p2, pal.flowers[i], 0.85));
    }
    });
  };

  // =====================================================================================================
  //  9. ARCH GATE — tall pointed Ottoman arch in pale stone, opening onto a luminous garden
  // =====================================================================================================
  function gateGeom(asp) {
    return memo('gate:' + asp, () => {
      const H = 100 * asp;
      const G = { H };
      G.outer = poly([[-50, 0], [-50, -H + 6], [50, -H + 6], [50, 0]]);
      G.cornice = poly([[-53.5, -H + 7], [53.5, -H + 7], [53.5, -H + 1.5], [-53.5, -H + 1.5]]);
      // cresting: palmette merlons
      const cr = new Path2D();
      for (let i = 0; i < 11; i++) {
        const x = -47.5 + i * 9.5;
        cr.addPath(smooth([[x - 3.6, -H + 1.6], [x - 3.2, -H - 2.2], [x - 1.4, -H - 4.4], [x, -H - 6.6], [x + 1.4, -H - 4.4], [x + 3.2, -H - 2.2], [x + 3.6, -H + 1.6]], true));
      }
      G.crest = cr;
      G.side = poly([[50, 0], [50, -H + 6], [55, -H + 9], [55, -2]]);
      G.step = poly([[-58, 0], [62, 0], [62, -4.5], [-58, -4.5]]);
      G.step2 = poly([[-64, 3.5], [68, 3.5], [68, 0], [-64, 0]]);
      // tezhip band (inset frame)
      G.bandOuter = poly([[-44, -4.5], [-44, -H + 12], [44, -H + 12], [44, -4.5]]);
      G.bandInner = poly([[-39.5, -4.5], [-39.5, -H + 16.5], [39.5, -H + 16.5], [39.5, -4.5]]);
      const hw = 30, apex = -H + 24, rise = Math.min(H * 0.3, 42), ys = apex + rise;
      G.hw = hw; G.apex = apex; G.ys = ys;
      G.openPts = archPts(0, ys, hw, rise, -4.5, 16);
      G.open = poly(G.openPts);
      G.rimPts = archPts(0, ys, hw + 4.2, rise + 4.8, -4.5, 16);
      G.rim = poly(G.rimPts);
      G.reveal = poly(archPts(0, ys, hw - 3.2, rise - 3.6, -4.5, 16));
      // columns
      G.cols = [-1, 1].map((sd) => {
        const x = sd * (hw + 1.6);
        return {
          shaft: poly([[x - 1.9, -6.5], [x - 1.9, ys + 4], [x + 1.9, ys + 4], [x + 1.9, -6.5]]),
          cap: poly([[x - 3, ys + 4], [x - 3.4, ys + 0.5], [x + 3.4, ys + 0.5], [x + 3, ys + 4]]),
          base: poly([[x - 3.2, -4.5], [x - 3.2, -7], [x + 3.2, -7], [x + 3.2, -4.5]]),
        };
      });
      // spandrel rosettes + keystone medallion
      G.ros = [[-34, apex + 8], [34, apex + 8]];
      G.key = [0, apex - 6];
      // muqarnas frieze under the cornice
      const mq = new Path2D();
      for (let i = 0; i < 12; i++) {
        const x = -38.5 + i * 7;
        mq.moveTo(x - 3.5, -H + 16.5); mq.lineTo(x - 3.5, -H + 14.5); mq.quadraticCurveTo(x - 3.5, -H + 12.2, x, -H + 12.2); mq.quadraticCurveTo(x + 3.5, -H + 12.2, x + 3.5, -H + 14.5); mq.lineTo(x + 3.5, -H + 16.5);
      }
      G.muq = mq;
      return G;
    });
  }
  function gateGarden(K, G, open, glw, t, lk) {
    // a vast luminous garden seen through the arch, in depth: golden sky, radiant light at a low horizon (no source),
    // far blue hills and tree lines, a stream of light winding toward us, great soft trees FRAMING the vista at the
    // sides (their crowns overhang the top corners), cypresses at middle distance, flowers in the foreground
    const hw = G.hw, top = G.apex - 2, hz = lerp(G.ys, -4.5, 0.5);
    const gh = -4.5 - hz; // ground depth
    over(K, poly([[-hw - 2, -3], [-hw - 2, top], [hw + 2, top], [hw + 2, -3]]), LG(K.p, 0, top, 0, hz, [[0, '#EDCB8A'], [0.45, '#F8E3B4'], [0.85, '#FFF6E2'], [1, '#FFFDF7']]), 1);
    // radiant light at the horizon (bare paper + light layer)
    lift(K, blobP(0, hz - 4, 24, { rx: 30, ry: 16, seed: 3, irr: 0.2 }), 0.7, 7);
    // far hills, two veils
    glaze(K, smooth([[-hw - 4, hz + 1], [-hw * 0.55, hz - 6], [-hw * 0.1, hz - 3], [hw * 0.35, hz - 7], [hw + 4, hz - 2], [hw + 4, hz + 6], [-hw - 4, hz + 6]], true), '#C7C3D6', 0.45, 1.2);
    glaze(K, smooth([[-hw - 4, hz + 2], [-hw * 0.7, hz - 2.5], [-hw * 0.2, hz + 0.5], [hw * 0.5, hz - 3], [hw + 4, hz + 1], [hw + 4, hz + 8], [-hw - 4, hz + 8]], true), '#B9C9A8', 0.5, 0.9);
    // distant tree line on the horizon (tiny soft crowns and spires)
    const far = new Path2D();
    const rf = E.rng(17);
    for (let i = 0; i < 16; i++) {
      const fx = -hw + (i + rf() * 0.6) * (hw * 2 / 16), fy = hz + 1.5 + rf() * 1.5;
      if (Math.abs(fx) < hw * 0.18) continue; // keep the light open
      if (i % 3 === 0) far.addPath(smooth([[fx - 0.9, fy], [fx, fy - 6 - rf() * 3], [fx + 0.9, fy]], true));
      else far.addPath(blobP(fx, fy - 1.8, 2 + rf() * 1.2, { rx: 2.6, ry: 2, seed: 70 + i, irr: 0.2, n: 12 }));
    }
    glaze(K, far, '#9DB592', 0.55, 0.4);
    // meadow
    const meadow = poly([[-hw - 4, hz + 2.5], [hw + 4, hz + 2.5], [hw + 4, -3], [-hw - 4, -3]]);
    over(K, meadow, LG(K.p, 0, hz, 0, -3, [[0, '#E9EDC8'], [0.35, '#CFDDA0'], [1, '#9EC27A']]), 1);
    glaze(K, smooth([[-hw - 4, hz + gh * 0.45], [-hw * 0.3, hz + gh * 0.38], [hw * 0.4, hz + gh * 0.5], [hw + 4, hz + gh * 0.42], [hw + 4, -3], [-hw - 4, -3]], true), '#7FA463', 0.25, 1.5);
    // stream of light winding from the horizon toward us
    const sx = (u) => Math.sin(u * 3.4 + 0.5) * hw * 0.3 * u;
    const st = [];
    for (let i = 0; i <= 14; i++) { const u = i / 14; st.push([sx(u) - (0.6 + u * u * 10), lerp(hz + 2.6, -3, Math.pow(u, 1.25))]); }
    for (let i = 14; i >= 0; i--) { const u = i / 14; st.push([sx(u) + (0.6 + u * u * 10), lerp(hz + 2.6, -3, Math.pow(u, 1.25))]); }
    const sp = smooth(st, true);
    over(K, sp, LG(K.p, 0, hz, 0, -3, [[0, '#FFFFFF'], [0.6, '#E2F0F4'], [1, '#B9DAE8']]), 1);
    glaze(K, sp, LG(K.p, -hw, 0, hw, 0, [[0, rgba('#7FA9C4', 0.0)], [1, rgba('#7FA9C4', 0.3)]]), 1);
    const gl = new Path2D();
    for (let i = 0; i < 10; i++) { const u = ((i / 10 + t * 0.04) % 1); const yy = lerp(hz + 3, -4, Math.pow(u, 1.25)); gl.addPath(ellipse(sx(u) + Math.sin(t * 2 + i) * 1.5 * u, yy, 0.8 + u * u * 5, 0.25 + u * 0.5)); }
    lift(K, gl, 0.85);
    // cypresses at middle distance, flanking the stream
    for (const [cx, h, k] of [[-hw * 0.52, 24, 1], [-hw * 0.34, 16, 0.75], [hw * 0.46, 22, 1], [hw * 0.62, 15, 0.75]]) {
      const cy = hz + 6 - (1 - k) * 3;
      const c = smooth([[cx - h * 0.1, cy], [cx - h * 0.13, cy - h * 0.45], [cx - h * 0.04, cy - h * 0.86], [cx, cy - h], [cx + h * 0.05, cy - h * 0.86], [cx + h * 0.13, cy - h * 0.45], [cx + h * 0.1, cy]], true);
      over(K, c, mixc('#6E9C72', '#C9D6B4', 1 - k), 0.92, 0.2);
      glaze(K, smooth([[cx + h * 0.01, cy], [cx + h * 0.02, cy - h * 0.5], [cx, cy - h], [cx + h * 0.13, cy - h * 0.45], [cx + h * 0.1, cy]], true), '#4F7A5A', 0.38 * k);
    }
    // great soft trees framing the vista: trunks at the jambs, crowns overhanging the upper corners
    for (const sd of [-1, 1]) {
      const tx = sd * hw * 0.94, ty = -3, s = hw * 0.64;
      const cyc = hz - s * 2.15;
      strokeP(K, [[tx, ty], [tx - sd * 1.5, lerp(ty, cyc, 0.55)], [tx - sd * 3, cyc + s * 0.3]], '#8E785E', s * 0.12, 0.95, { over: true });
      const crown = new Path2D();
      crown.addPath(blobP(tx - sd * s * 0.1, cyc, s, { rx: s * 1.05, ry: s * 0.9, seed: 99 + sd, irr: 0.14 }));
      crown.addPath(blobP(tx - sd * s * 0.75, cyc + s * 0.28, s * 0.6, { seed: 7 + sd, irr: 0.16 }));
      crown.addPath(blobP(tx - sd * s * 0.3, cyc - s * 0.7, s * 0.62, { seed: 3 + sd, irr: 0.16 }));
      const c = sd < 0 ? '#86AE6A' : '#7EA866';
      over(K, crown, c, 0.96, s * 0.015);
      crescentU(K, crown, [tx - s * 2.2, cyc - s * 1.8, s * 4.4, s * 3.4], -s * 0.32, -s * 0.42, shade(c, -0.28), 0.5, s * 0.02);
      lift(K, blobP(tx - sd * s * 0.45, cyc - s * 0.5, s * 0.32, { seed: 5 + sd, irr: 0.3 }), 0.35, s * 0.12);
    }
    // flowers along the stream and in the foreground (bigger nearer)
    const r = E.rng(5);
    const fl = [new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < 46; i++) {
      const v = Math.pow(r(), 0.7), u = v;
      const yy = lerp(hz + 4, -4, Math.pow(u, 1.25));
      const side = r() < 0.5 ? -1 : 1;
      const x = sx(u) + side * (2 + u * u * 10 + r() * (4 + 14 * u));
      fl[i % 3].addPath(circle(x, yy, 0.3 + v * 0.85));
    }
    over(K, fl[0], '#FFFFFF', 0.9); over(K, fl[1], '#F2B6C2', 0.9); over(K, fl[2], '#F4D06A', 0.9);
    // light: the heart of the garden glows (no visible source), motes drift up
    glow(K, 0, hz - 3, 64, '#FFE7A8', 0.4 * glw + 0.15 * open);
    glow(K, 0, hz - 3, 18, '#FFF7E0', 0.5 * glw + 0.15 * open);
    E.motes(K.l, { x: -hw, y: top, w: hw * 2, h: -top, n: 14, t, seed: 31, size: 0.9, a: 0.7 * open * K.a, rise: 4, color: '#FFF1C9' });
    void lk;
  }
  PR.archGate = function archGate(L, x, y, w, h, opts) {
    w = num(w, 420);
    h = num(h, w * 1.75);
    if (!(w > 0.5) || !(h > 0.5)) return;
    const o = opts || {};
    const open = clamp(num(o.open, 0));
    const glw = clamp(num(o.glow, open));
    const t = num(o.t, 0);
    const asp = Math.round(clamp(h / w, 0.8, 4) * 100) / 100;
    drawProp(L, num(x, 0), num(y, 0), w / 100, num(o.alpha, 1), (K) => {
    const lk = lineK(100 * K.s * 1.5);
    const G = gateGeom(asp);
    const H = G.H;
    const stone = '#EEE6D8', stoneL = '#F6F1E8', stoneD = '#B3A694', orn = '#C4A46E';
    const part = (path, fill, a = 0.32) => { over(K, path, fill, 1); occlude(K, path, 1); if (a > 0) pen(K, path, 1.0 * lk, a); };
    // light spilling out on the ground in front
    if (glw > 0.01) {
      glaze(K, smooth([[-G.hw, 0], [G.hw, 0], [G.hw * 2.6, 26], [-G.hw * 2.6, 26]], true), '#F6CF78', 0.4 * glw, 3);
      glow(K, 0, 6, 90, '#FFD98A', 0.3 * glw);
    }
    // ---- architecture
    part(G.step2, '#DDD3C3', 0.24);
    part(G.side, mixc(stone, stoneD, 0.55), 0.26);
    part(G.outer, stone, 0);
    glaze(K, G.outer, LG(K.p, -50, 0, 50, 0, [[0, 'rgba(255,255,255,0)'], [0.6, 'rgba(255,255,255,0)'], [1, rgba(stoneD, 0.25)]]), 1);
    glaze(K, G.outer, LG(K.p, 0, -H, 0, 0, [[0, 'rgba(255,255,255,0)'], [0.7, 'rgba(255,255,255,0)'], [1, rgba('#A99AB5', 0.3)]]), 1);
    pen(K, G.outer, 1.1 * lk, 0.34);
    part(G.crest, stoneL, 0.24);
    glaze(K, G.crest, LG(K.p, 0, -H - 7, 0, -H + 2, [[0, 'rgba(255,255,255,0)'], [1, rgba(stoneD, 0.4)]]), 1);
    part(G.cornice, stoneL, 0.28);
    glaze(K, poly([[-50, -H + 7], [50, -H + 7], [50, -H + 9], [-50, -H + 9]]), stoneD, 0.45);
    // tezhip band: a frame of small rosettes and lozenges
    const bandP = new Path2D(); bandP.addPath(G.bandOuter); bandP.addPath(G.bandInner);
    fillP(K, bandP, '#F3E9D6', 1, { over: true, rule: 'evenodd' });
    pen(K, G.bandOuter, 0.9 * lk, 0.26, { double: false });
    pen(K, G.bandInner, 0.9 * lk, 0.26, { double: false });
    const motif = new Path2D(), motif2 = new Path2D();
    const addM = (mx, my, i) => {
      if (i % 2) motif.addPath(poly([[mx, my - 1.6], [mx + 1.2, my], [mx, my + 1.6], [mx - 1.2, my]]));
      else { motif2.addPath(circle(mx, my, 1.15)); }
    };
    let k = 0;
    for (let yy = -8; yy > -H + 14; yy -= 4.2) { addM(-41.75, yy, k); addM(41.75, yy, k++); }
    for (let xx = -37.5; xx <= 37.6; xx += 4.2) addM(xx, -H + 14.25, k++);
    over(K, motif, orn, 0.85);
    over(K, motif2, '#7FA9B0', 0.8);
    // muqarnas frieze
    strokeP(K, G.muq, stoneD, 0.5, 0.55);
    pen(K, G.muq, 0.7 * lk, 0.2, { double: false });
    // spandrels: rosettes
    for (const [rx, ry] of G.ros) {
      const ros = new Path2D();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ros.addPath(ellipse(rx + Math.cos(a) * 2.6, ry + Math.sin(a) * 2.6, 1.9, 1.1, a)); }
      over(K, ros, '#E2CFA6', 1);
      over(K, circle(rx, ry, 1.6), '#7FA9B0', 1);
      over(K, circle(rx, ry, 0.7), P.gold, 1);
      pen(K, ros, 0.7 * lk, 0.22, { double: false });
    }
    // arch rim (voussoirs) + keystone medallion
    part(G.rim, '#F2EBDF', 0.3);
    const vs = new Path2D();
    const rp = G.rimPts, op = G.openPts;
    for (let i = 2; i < op.length - 1; i += 2) { vs.moveTo(op[i][0], op[i][1]); vs.lineTo(rp[i][0], rp[i][1]); }
    pen(K, vs, 0.7 * lk, 0.2, { double: false });
    over(K, ellipse(G.key[0], G.key[1], 3.6, 4.6), '#E2CFA6', 1);
    over(K, ellipse(G.key[0], G.key[1], 1.8, 2.6), '#7FA9B0', 1);
    pen(K, ellipse(G.key[0], G.key[1], 3.6, 4.6), 0.7 * lk, 0.25, { double: false });
    // ---- the opening: garden beyond, then the doors
    K.p.save(); K.k.save(); K.l.save();
    for (const c of [K.p, K.k, K.l]) c.clip(G.open);
    occlude(K, G.open, 1);
    if (open > 0.001) gateGarden(K, G, open, glw, t, lk);
    else over(K, G.open, '#6E5A4E', 1);
    // inner reveal (thickness of the wall): lit left jamb, shaded right jamb
    const rev = new Path2D(); rev.addPath(G.open); rev.addPath(G.reveal);
    fillP(K, rev, LG(K.p, -G.hw, 0, G.hw, 0, [[0, '#F3ECE0'], [0.5, '#E2D6C4'], [1, '#B9AA96']]), 1, { over: true, rule: 'evenodd' });
    glaze(K, rev, LG(K.p, 0, G.apex, 0, -4, [[0, 'rgba(255,255,255,0)'], [1, rgba('#A99AB5', 0.3)]]), 1, 0);
    // doors: two leaves hinged at the jambs, swinging away from us
    const sw = sstep(0, 1, open);
    if (sw < 0.995) {
      const hw2 = G.hw - 3.2;
      for (const sd of [-1, 1]) {
        const wv = hw2 * (1 - 0.88 * sw);
        const inner = sd * hw2 - sd * wv;
        const squash = 1 - 0.1 * sw;
        const top = archPts(0, G.ys, hw2, G.apex - G.ys < 0 ? G.ys - G.apex - 3.6 : 1, -4.5, 16);
        // leaf outline: jamb edge follows the arch, inner edge is straight
        const half = sd < 0 ? top.slice(0, 18) : top.slice(17).reverse();
        const pts = half.map(([px, py]) => {
          const u = (sd * px) / hw2; // 1 at the jamb, 0 at the centre line
          const nx = sd * hw2 - (sd * hw2 - px) * (wv / hw2);
          return [nx, -4.5 + (py + 4.5) * lerp(squash, 1, clamp(u))];
        });
        pts.push([inner, -4.5]);
        const leaf = poly(pts);
        over(K, leaf, '#8A5C3E', 1);
        glaze(K, leaf, LG(K.p, sd * hw2, 0, inner, 0, [[0, rgba('#3E2A22', 0.15)], [1, rgba('#3E2A22', 0.15 + 0.4 * sw)]]), 1);
        // panels + studs
        K.p.save(); K.p.clip(leaf);
        const pn = new Path2D();
        const cx = (sd * hw2 + inner) / 2, pw2 = Math.abs(inner - sd * hw2) * 0.62;
        for (let i = 0; i < 4; i++) { const yy = -10 - i * ((-G.ys - 6) / 4); pn.addPath(poly([[cx - pw2 / 2, yy], [cx + pw2 / 2, yy], [cx + pw2 / 2, yy - (-G.ys - 6) / 4 + 3], [cx - pw2 / 2, yy - (-G.ys - 6) / 4 + 3]])); }
        strokeP(K, pn, '#C69A62', 0.9, 0.8);
        const studs = new Path2D();
        for (let i = 0; i < 9; i++) studs.addPath(circle(lerp(sd * hw2, inner, 0.15 + (i % 3) * 0.35), -8 - Math.floor(i / 3) * ((-G.ys) / 3), 0.6));
        over(K, studs, P.gold, 0.9);
        K.p.restore();
        pen(K, leaf, 0.9 * lk, 0.32, { double: false });
      }
      // a line of light between the leaves as they part
      if (sw > 0.01) glow(K, 0, G.ys * 0.6, 20, '#FFE7A8', 0.6 * sw * (1 - sw));
    }
    K.p.restore(); K.k.restore(); K.l.restore();
    pen(K, G.open, 1.1 * lk, 0.36);
    // columns
    for (const c of G.cols) { part(c.base, stoneL, 0.26); part(c.shaft, stoneL, 0.26); glaze(K, c.shaft, LG(K.p, -60, 0, 60, 0, [[0, 'rgba(255,255,255,0)'], [1, rgba(stoneD, 0.3)]]), 1); part(c.cap, '#E2CFA6', 0.26); }
    part(G.step, '#E7DECF', 0.28);
    glaze(K, poly([[-58, -1.5], [62, -1.5], [62, 0], [-58, 0]]), stoneD, 0.4);
    // ---- light pouring out
    if (glw > 0.01) {
      const ys = G.ys;
      E.rays(K.l, 0, -6, { n: 7, len: 70, spread: 2.0, angle: Math.PI / 2, width: 0.07, color: '#FFE9B8', a: 0.18 * glw * K.a, seed: 9, t });
      glow(K, 0, ys * 0.5, 80, '#FFE2A0', 0.3 * glw);
    }
    });
  };

  // =====================================================================================================
  //  10. POND — still water with soft reflections; opts.reflect(L) draws mirrored content
  // =====================================================================================================
  const POND_TONE = {
    day: { far: '#E2EFF5', near: '#A9CAE0', deep: '#7AA3C8', bank: '#9DB874', bankD: '#5E7A4C', edge: '#4F6E5A', glint: 0.85, reed: '#6E914E', head: '#8A6244' },
    gold: { far: '#FCEFCF', near: '#EDC79C', deep: '#C29A9C', bank: '#A3A066', bankD: '#6A6644', edge: '#6E5A4A', glint: 0.9, reed: '#8C8A52', head: '#8A5A3E' },
    night: { far: '#64729A', near: '#3D4C74', deep: '#2A3760', bank: '#3A4E5E', bankD: '#22303E', edge: '#1E2836', glint: 0.55, reed: '#30475A', head: '#2A3440' },
  };
  PR.pond = function pond(L, x, y, w, h, opts) {
    w = num(w, 600);
    h = num(h, w * 0.28);
    if (!(w > 0.5) || !(h > 0.5)) return;
    const o = opts || {};
    const tone = POND_TONE[kindOf(o.tone, ['gold', 'day', 'night'], 'day')];
    const t = num(o.t, 0);
    const rip = clamp(num(o.ripple, 0));
    const bank = clamp(num(o.bank, 1));
    const asp = h / w;
    const cx = num(x, 0), cy = num(y, 0);
    drawProp(L, cx, cy, w / 100, num(o.alpha, 1), (K) => {
    const rx = 50, ry = 50 * asp;
    const px1 = K.px; // local units per device px
    const water = blobP(0, 0, rx, { rx, ry, seed: 7, irr: 0.022, n: 56 });
    // bank: grassy, irregular, thin on the far side and fuller on the near side, wet dark edge at the water
    if (bank > 0) {
      // the bank loses its outer edge (wet into the surroundings) and is fuller on the near side
      const b0 = blobP(0, ry * 0.16, rx * 1.09, { rx: rx * 1.1, ry: ry * 1.3, seed: 19, irr: 0.09, n: 56 });
      over(K, b0, tone.bank, 0.55 * bank, 3);
      const b = blobP(0, ry * 0.12, rx * 1.05, { rx: rx * 1.06, ry: ry * 1.2, seed: 9, irr: 0.08, n: 56 });
      over(K, b, tone.bank, bank, 0.5);
      occlude(K, b, bank);
      glaze(K, b, LG(K.p, 0, -ry, 0, ry * 1.3, [[0, rgba(tone.bankD, 0.05)], [1, rgba(tone.bankD, 0.45)]]), bank);
      const wet = blobP(0, ry * 0.03, rx * 1.012, { rx: rx * 1.014, ry: ry * 1.05, seed: 7, irr: 0.024, n: 56 });
      glaze(K, wet, tone.edge, 0.3 * bank, 0.5);
      // a few stones on the near bank
      const st = new Path2D();
      const r0 = E.rng(21);
      for (let i = 0; i < 5; i++) { const a = lerp(0.35, 2.8, r0()); st.addPath(blobP(Math.cos(a) * rx * 1.02, Math.sin(a) * ry * 1.12, 1.6 + r0() * 1.6, { rx: 2 + r0() * 2, ry: 1.2 + r0(), seed: i, irr: 0.2, n: 10 })); }
      over(K, st, '#B9B0A8', bank);
      glaze(K, st, '#6E6878', 0.3 * bank);
    }
    occlude(K, water, 1);
    over(K, water, LG(K.p, 0, -ry, 0, ry, [[0, tone.far], [0.5, tone.near], [1, tone.deep]]), 1);
    glaze(K, blobP(-rx * 0.3, -ry * 0.25, rx * 0.4, { rx: rx * 0.5, ry: ry * 0.22, seed: 3, irr: 0.3 }), tone.near, 0.22, 3);
    // scene reflections (clipped to the water and mirrored about the water line)
    if (typeof o.reflect === 'function') {
      const lineY = num(o.lineY, cy);
      E.save(L);
      for (const c of [K.p, K.k, K.l]) { c.clip(water); c.scale(100 / w, 100 / w); c.translate(-cx, -cy); c.translate(0, 2 * lineY); c.scale(1, -1); c.globalAlpha = K.a; }
      try { o.reflect(L); } finally { E.restore(L); }
      // the water softens and tints what it reflects
      over(K, water, LG(K.p, 0, -ry, 0, ry, [[0, tone.far], [1, tone.near]]), clamp(num(o.reflectVeil, 0.3)));
      for (const c of [K.k, K.l]) { c.save(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 0.45 * K.a; c.fill(water); c.restore(); }
    }
    K.p.save(); K.p.clip(water);
    // horizontal glints (bare paper), shimmering slowly
    const gl = new Path2D();
    const r = E.rng(11);
    for (let i = 0; i < 9; i++) {
      const v = r();
      const yy = lerp(-ry * 0.8, ry * 0.8, v);
      const xx = (r() - 0.5) * rx * 1.5 * Math.sqrt(Math.max(0, 1 - Math.pow(yy / ry, 2))) + Math.sin(t * 0.5 + i) * 1.5;
      const len = (2.5 + r() * 7) * (0.6 + v * 0.7);
      const sh = 0.5 + 0.5 * Math.sin(t * 1.1 + i * 2.1);
      if (sh < 0.3) continue;
      gl.addPath(ellipse(xx, yy, len * sh, (1.2 + v * 1.6) * px1));
    }
    lift(K, gl, tone.glint);
    // near side darker (looking down into the water), far rim catches the sky
    glaze(K, water, RG(K.p, 0, -ry * 0.6, rx * 0.4, rx * 1.15, [[0, 'rgba(255,255,255,0)'], [1, rgba(tone.deep, 0.4)]]), 1);
    lift(K, blobP(0, -ry * 0.93, rx * 0.8, { rx: rx * 0.82, ry: Math.max(ry * 0.06, 2 * px1), seed: 13, irr: 0.2 }), 0.4, 0.8);
    // ripples: thin broken concentric ellipses spreading from (rippleX, rippleY)
    if (rip > 0.001) {
      const qx = (num(o.rippleX, cx) - cx) * (100 / w), qy = (num(o.rippleY, cy) - cy) * (100 / w);
      for (let i = 0; i < 4; i++) {
        const u = (((t * 0.3 + i / 4) % 1) + 1) % 1;
        const rr = 1.5 + u * rx * 0.85;
        const a = (1 - u) * (1 - u) * rip;
        if (a < 0.03) continue;
        const arc = new Path2D(), arc2 = new Path2D();
        const n = 5, gap = 0.22;
        for (let j = 0; j < n; j++) {
          const a0 = (j / n) * TAU + i * 0.9 + gap, a1 = ((j + 1) / n) * TAU + i * 0.9 - gap * (0.4 + 0.6 * u);
          arc.moveTo(qx + Math.cos(a0) * rr, qy + Math.sin(a0) * rr * asp);
          arc.ellipse(qx, qy, rr, rr * asp, 0, a0, a1);
          arc2.moveTo(qx + Math.cos(a0) * rr * 1.01, qy + 1.6 * px1 + Math.sin(a0) * rr * asp * 1.01);
          arc2.ellipse(qx, qy + 1.6 * px1, rr * 1.01, rr * asp * 1.01, 0, a0, a1);
        }
        strokeP(K, arc2, tone.deep, (1.2 + u) * px1, a * 0.45);
        strokeP(K, arc, '#FFFFFF', (1.4 + u * 1.2) * px1, a * 0.85, { over: true });
      }
      glow(K, qx, qy, 14, '#FFF3D6', 0.2 * rip);
    }
    K.p.restore();
    pen(K, water, 1.0 * lineK(100 * K.s), 0.2);
    // reeds and a few tufts on the bank (they stand in front of the water's edge and sway gently)
    if (bank > 0.01) {
      const rr = E.rng(31);
      const reeds = new Path2D(), heads = new Path2D(), tufts = new Path2D();
      const clump = (bx, by, n, hmax) => {
        for (let i = 0; i < n; i++) {
          const x0 = bx + (rr() - 0.5) * hmax * 0.5, h2 = hmax * (0.45 + rr() * 0.55);
          const lean = (rr() - 0.5) * 0.5 + Math.sin(t * 1.1 + i * 1.7 + bx) * 0.05;
          const tip = [x0 + Math.sin(lean) * h2, by - Math.cos(lean) * h2];
          reeds.addPath(taper([[x0, by], [x0 + Math.sin(lean) * h2 * 0.4, by - h2 * 0.5], tip], 0.9 + rr() * 0.5, 0.1, 4));
          if (rr() < 0.3) {
            const hy = by - Math.cos(lean) * h2 * 0.8, hx = x0 + Math.sin(lean) * h2 * 0.8;
            heads.addPath(ellipse(hx, hy, 0.8, 2.6, lean));
          }
        }
      };
      clump(-rx * 0.97, ry * 0.12, 9, 14 + ry * 0.12);
      clump(-rx * 0.86, ry * 0.5, 5, 10 + ry * 0.1);
      clump(rx * 0.95, -ry * 0.02, 8, 12 + ry * 0.12);
      for (let i = 0; i < 9; i++) {
        const a = lerp(0.45, 2.7, rr()), x0 = Math.cos(a) * rx * 1.04, y0 = Math.sin(a) * ry * 1.16 + 1, s2 = 1.6 + rr() * 1.6;
        for (let k = -2; k <= 2; k++) { tufts.moveTo(x0 + k * s2 * 0.15, y0); tufts.quadraticCurveTo(x0 + k * s2 * 0.3, y0 - s2, x0 + k * s2 * 0.55, y0 - s2 * (1.9 - Math.abs(k) * 0.35)); }
      }
      reeds._bb = [-rx * 1.3, -ry - 40, rx * 2.6, ry * 2 + 60];
      over(K, reeds, tone.reed, bank);
      occlude(K, reeds, bank, 1);
      glaze(K, reeds, shade(tone.reed, -0.35), 0.35 * bank);
      over(K, heads, tone.head, bank);
      strokeP(K, tufts, tone.bankD, 0.45, 0.45 * bank);
      if (lineK(100 * K.s) > 0.6) pen(K, reeds, 0.6, 0.18 * bank, { double: false });
    }
    });
  };

  // =====================================================================================================
  //  11. DROP BLOOM — a falling drop that lands and blooms into a wet watercolour blossom
  // =====================================================================================================
  PR.dropBloom = function dropBloom(L, x, y, r, opts) {
    r = num(r, 300);
    if (!(r > 0.5)) return;
    const o = opts || {};
    const p = clamp(num(o.p, 1));
    const col = colorOf(o.color, P.nightIndigo);
    const seed = Math.round(num(o.seed, 1));
    const fallPx = num(o.fall, Math.min(2.6 * r, 900));
    drawProp(L, num(x, 0), num(y, 0), r / 100, num(o.alpha, 1), (K) => {
    const pxu = K.px;
    const tFall = 0.3;
    const edgeCol = mixc(col, P.ultramarine, 0.42), coreCol = mixc(col, P.crimson, 0.12);
    // ---- the falling drop (constant on-screen size)
    if (p < tFall + 0.02) {
      const u = clamp(p / tFall);
      const dropR = num(o.dropSize, 9) * pxu;
      const yy = -fallPx * pxu * (1 - u * u);
      const st = 1 + u * 0.8;
      const dp = smooth([[0, yy - dropR * 2.4 * st], [dropR * 0.55, yy - dropR * 0.9], [dropR, yy + dropR * 0.1], [dropR * 0.7, yy + dropR * 0.8], [0, yy + dropR], [-dropR * 0.7, yy + dropR * 0.8], [-dropR, yy + dropR * 0.1], [-dropR * 0.55, yy - dropR * 0.9]], true);
      const a = sstep(0, 0.06, p) * (1 - sstep(tFall - 0.01, tFall + 0.02, p));
      over(K, dp, col, a);
      lift(K, ellipse(-dropR * 0.35, yy - dropR * 0.2, dropR * 0.22, dropR * 0.4, 0.3), 0.6 * a);
      glow(K, 0, yy, dropR * 4, '#C9D4F0', 0.15 * a);
    }
    // ---- impact + bloom
    const b = seg(p, tFall, 1);
    if (b > 0) {
      const g = outCubic(b);
      const R = 100 * lerp(0.05, 1, g);
      const dil = 1 - 0.3 * g;
      const wobble = (rr, sd, irr, n = 72) => {
        // cauliflower edge: two octaves of irregularity
        const pts = [];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          // periodic around the outline (no seam), two octaves of cauliflower irregularity
          const k = 1 + irr * (fbmC(a, sd, 0.95, 3) * 1.1 + 0.42 * fbmC(a, sd + 5, 3.4, 2) + 0.15 * fbmC(a, sd + 9, 9, 1));
          pts.push([Math.cos(a) * rr * k, Math.sin(a) * rr * k]);
        }
        return smooth(pts, true);
      };
      // water front running ahead of the pigment
      glaze(K, wobble(R * 1.1, seed + 1, 0.16), shade(edgeCol, 0.78), 0.45 * dil, 4);
      // feathered fingers: pigment creeping into the wet paper (soft, no hard strokes)
      const r2 = E.rng(seed * 17 + 3);
      const fing = new Path2D();
      for (let i = 0; i < 8; i++) {
        const a = r2() * TAU, l = R * (0.1 + r2() * 0.14) * sstep(0.08, 0.6, b);
        if (l < 0.3) continue;
        fing.addPath(blobP(Math.cos(a) * (R * 0.98 + l * 0.15), Math.sin(a) * (R * 0.98 + l * 0.15), l * 0.5, { rx: l * 0.55, ry: l * 0.32, rot: a, seed: seed + i, irr: 0.35, n: 14 }));
      }
      glaze(K, fing, shade(edgeCol, 0.5), 0.4 * dil, 3);
      // body: hard drying edge, lighter toward the rim
      const body = wobble(R, seed + 2, 0.27, 96);
      glaze(K, body, RG(K.p, 0, 0, R * 0.1, R, [[0, rgba(shade(coreCol, 0.15), 0.9)], [0.6, rgba(shade(col, 0.3), 0.75)], [1, rgba(shade(edgeCol, 0.42), 0.7)]]), dil, 0.35);
      // the drying rim (pigment pooled at the edge)
      const rim = new Path2D(); rim.addPath(body); rim.addPath(wobble(R * 0.93, seed + 4, 0.3, 96));
      fillP(K, rim, edgeCol, 0.13 * dil, { rule: 'evenodd', soft: 1.2 });
      // soft concentrated core where the drop landed
      glaze(K, wobble(R * 0.42, seed + 3, 0.3, 40), coreCol, 0.5 * dil, 7);
      // backruns: pale cauliflower blooms with darker fringes near the edge
      for (let i = 0; i < 4; i++) {
        const a = r2() * TAU, d = R * (0.48 + r2() * 0.3);
        const s = R * (0.12 + r2() * 0.08);
        const bp = blobP(Math.cos(a) * d, Math.sin(a) * d, s, { seed: seed + 30 + i, irr: 0.4, n: 22 });
        const k = sstep(0.35, 0.9, b);
        lift(K, bp, 0.24 * k, 1.0);
        const fr = new Path2D(); fr.addPath(blobP(Math.cos(a) * d, Math.sin(a) * d, s * 1.15, { seed: seed + 30 + i, irr: 0.4, n: 22 })); fr.addPath(bp);
        fillP(K, fr, edgeCol, 0.12 * k, { rule: 'evenodd', soft: 1.2 });
      }
      // granulation: fine pigment specks inside
      const gr = new Path2D();
      for (let i = 0; i < 40; i++) { const a = r2() * TAU, d = Math.sqrt(r2()) * R * 0.9; gr.addPath(circle(Math.cos(a) * d, Math.sin(a) * d, (0.8 + r2()) * pxu)); }
      glaze(K, gr, col, 0.16 * sstep(0.3, 1, b));
      // splash crown: droplets thrown out at impact (screen-sized)
      const sb = seg(p, tFall, tFall + 0.2);
      if (sb > 0 && sb < 1) {
        const sp = new Path2D();
        for (let i = 0; i < 10; i++) {
          const a = r2() * TAU, d = (12 + r2() * 30) * outCubic(sb) * pxu;
          sp.addPath(circle(Math.cos(a) * d, Math.sin(a) * d * 0.8, (1.4 + r2() * 2) * pxu * (1 - sb * 0.4)));
        }
        over(K, sp, col, 0.9 * (1 - sstep(0.6, 1, sb)));
      }
      // a few satellite drops that stay
      const sat = new Path2D();
      const r3 = E.rng(seed * 5 + 9);
      for (let i = 0; i < 5; i++) { const a = r3() * TAU, d = R * (1.18 + r3() * 0.3); sat.addPath(blobP(Math.cos(a) * d, Math.sin(a) * d, Math.max(R * (0.012 + r3() * 0.022), 1.5 * pxu), { seed: i, irr: 0.2, n: 10 })); }
      glaze(K, sat, col, 0.55 * sstep(0.05, 0.4, b), 0.2);
    }
    });
  };

})();
