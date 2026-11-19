/* s14 · 63.75–67.70 · "o vakit o mecazî aşk, hakiki aşka inkılab eder."
   A still pond in the garden at dusk-gold light.
   - mecazî aşk (64.55): in the water, only the wavering REFLECTION of the heart-light.
   - hakiki aşka (65.69): the reflection rises out of the water (above the surface it is solid, below it still
     wavers) and becomes a real, radiant heart-light; the water now carries its glitter path.
   - inkılab eder (66.51): a rose of light blooms around it and it ascends into the light from above, leaving
     ripples on the pond. Then the light fades down (s15 fades in to darkness). */
(function () {
  const E = window.E;
  const PR = E.props;

  // ---------------------------------------------------------------- layout (world coordinates)
  // a wide pond seen from a low angle: its far edge is an almost straight waterline (no "hump")
  const POND = { x: 540, y: 1250, w: 3000, h: 760 };
  const LINE_Y = 872;          // the waterline (sky / far bank reflect about it)
  const HX = 540;              // heart column
  const REF_Y = 1185;          // centre of the reflection heart in the water
  const R0 = 84;               // reflection heart half-width
  const CROSS = REF_Y - 1.04 * R0; // the surface the heart rises through (its top lobes touch it at the start)
  const HOVER = 625;           // where the real heart hovers
  const R1 = 116;              // real heart half-width
  /** far water edge at x (top of the pond ellipse) */
  const farEdge = (x) => POND.y - POND.h * 0.5 * Math.sqrt(Math.max(0, 1 - Math.pow((x - POND.x) / (POND.w * 0.5), 2)));

  // ---------------------------------------------------------------- timing (local seconds)
  let TM = null;
  function times(shot) {
    if (TM && TM.s === shot.start) return TM;
    const T = (i) => E.T(i) - shot.start;
    TM = { s: shot.start, vakit: T(122), mecazi: T(124), ask: T(125), hakiki: T(126), aska: T(127), inkilab: T(128), eder: T(129) };
    TM.reflIn = TM.mecazi - 0.14;
    TM.rise0 = TM.hakiki - 0.12;
    TM.surf1 = TM.rise0 + 0.44;          // it has surfaced (tip just out of the water): a breath of stillness
    TM.rise1 = TM.aska + 0.31;           // ...then it lifts and settles in the air
    TM.bloom0 = TM.inkilab - 0.1;
    TM.asc0 = TM.eder - 0.08;
    TM.asc1 = TM.asc0 + 0.8;
    TM.dim0 = TM.asc1 - 0.32;
    TM.dim1 = shot.dur + 0.3;
    return TM;
  }

  // ---------------------------------------------------------------- camera with parallax
  function camAt(lt, tm) {
    const zoom = E.tween(lt, [[0, 1.07], [tm.rise0, 1.045, 'inOutSine'], [tm.rise1 + 0.25, 1.0, 'inOutCubic'], [tm.dim1, 0.98, 'inOutSine']]);
    const cy = E.tween(lt, [[0, 1032], [tm.rise0, 1016, 'inOutSine'], [tm.rise1 + 0.25, 905, 'inOutCubic'], [tm.dim1, 862, 'inOutSine']]);
    return { x: 540 + E.drift(lt, 3, 0.3) * 5, y: cy + E.drift(lt, 7, 0.25) * 3, zoom };
  }
  function setCam(L, c, f) {
    E.camera(L, { x: 540 + (c.x - 540) * f, y: 960 + (c.y - 960) * f, zoom: 1 + (c.zoom - 1) * f });
  }

  // ---------------------------------------------------------------- heart state
  function heartAt(lt, tm) {
    const asc = E.ep(lt, tm.asc0, tm.asc1, 'inQuad');
    const bob = Math.sin((lt - tm.rise1) * 2.4) * 5 * E.seg(lt, tm.rise1 - 0.15, tm.rise1 + 0.35) * (1 - asc);
    const rS = 96; // size when it has just surfaced
    const r = E.tween(lt, [[tm.rise0, R0], [tm.surf1, rS, 'inOutSine'], [tm.rise1 + 0.1, R1, 'inOutCubic']]) * (1 - 0.45 * asc);
    // surfacing: slow and deliberate (it decelerates as it clears the water), then the lift into the air
    const hy0 = E.tween(lt, [[tm.rise0, REF_Y], [tm.surf1, CROSS - 0.95 * rS - 16, 'inOutSine'], [tm.rise1, HOVER, 'inOutCubic']]);
    const rise = E.clamp((REF_Y - hy0) / (REF_Y - HOVER));
    const hy = hy0 + bob - asc * 920;
    return {
      r, hy, rise, asc,
      refl: E.ep(lt, tm.reflIn, tm.reflIn + 0.6, 'outCubic'),
      pulse: Math.exp(-Math.pow((lt - tm.ask - 0.06) / 0.15, 2)),
      bright: E.ep(lt, tm.rise0 + 0.2, tm.aska + 0.2, 'inOutSine'),
      bloom: E.ep(lt, tm.bloom0, tm.bloom0 + 0.62, 'outCubic'),
      flash: Math.exp(-Math.pow((lt - tm.inkilab - 0.12) / 0.2, 2)),
      gone: E.ep(lt, tm.asc0 + 0.5, tm.asc1, 'inQuad'),
    };
  }

  /** soft round wet-in-wet patch without blur filters (radial gradient; cheap at any size) */
  function softSpot(ctx, x, y, rx, ry, color, a, mode = 'multiply') {
    if (a <= 0.003 || rx <= 1) return;
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, E.rgba(color, a));
    g.addColorStop(0.55, E.rgba(color, a * 0.6));
    g.addColorStop(1, E.rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
    ctx.restore();
  }

  // ---------------------------------------------------------------- painting helpers
  /** sky colours: late golden afternoon (k = 0, close to s13's daylight) deepening to rose-lavender dusk (k = 1) */
  function skyPal(k) {
    return {
      top: E.mix('#C8A9BC', '#9C84AD', k),
      rose: E.mix('#EDBFA2', '#DFA398', k),
      gold: E.mix('#F8DDA2', '#F3C98E', k),
      hor: E.mix('#FBEDC8', '#F7DFAE', k),
      cloud: E.mix('#C9A3AE', '#A589A8', k),
      under: E.mix('#B88E9E', '#8B6E93', k),
      rim: E.mix('#F8DCA6', '#F2C287', k),
    };
  }
  /** sky gradient stops: f = 0 at the top of the sky, 1 at the horizon */
  const skyStops = (S) => [[0, S.top], [0.42, S.rose], [0.8, S.gold], [1, S.hor]];

  function sky(L, k, S) {
    const p = L.paint;
    p.save();
    p.setTransform(1, 0, 0, 1, 0, 0);
    const y0 = -60 + k * 60;
    E.wash(p, E.rrect(-10, -10, 1100, 1940, 0), S.top, { grad: { from: [0, y0], to: [0, y0 + 960], stops: skyStops(S) } });
    // wet-in-wet variation in the sky (large, slow, lost edges)
    softSpot(p, 210, 170 + k * 40, 320, 260, E.mix('#B595B4', '#937BA8', k), 0.22);
    softSpot(p, 900, 430 + k * 40, 340, 280, '#EBA88E', 0.18);
    softSpot(p, 660, 60 + k * 40, 300, 220, E.mix('#A98DB2', '#8E77A6', k), 0.2);
    // the brightest light sits low behind the far bank: paper left almost bare
    softSpot(p, 560, 800 - k * 20, 520, 150, '#FFFFFF', 0.35 * (1 - 0.4 * k), 'source-over');
    p.restore();
  }

  /** a long dusk stratus band: soft lost-edged body, one hard drying edge on its scalloped underside,
      paper lifted along the top where the low sun catches it (gold rim) */
  function stratus(p, x, y, w, h, seed, a, S) {
    const r = E.rng(seed);
    for (let i = 0; i < 5; i++) {
      const px = x + (i - 2) * w * 0.3 + (r() - 0.5) * w * 0.12, py = y + (r() - 0.5) * h * 0.35;
      softSpot(p, px, py, w * (0.3 + 0.16 * r()), h * (0.85 + 0.45 * r()), S.cloud, 0.2 * a);
    }
    const pts = [], N = 30;
    for (let i = 0; i <= N; i++) {
      const u = i / N, env = Math.pow(Math.sin(Math.PI * u), 0.8);
      pts.push([x - w + 2 * w * u, y - h * (0.12 + 0.06 * E.noise1(u * 4, seed)) * env]);
    }
    for (let i = N; i >= 0; i--) {
      const u = i / N, env = Math.pow(Math.sin(Math.PI * u), 0.55);
      pts.push([x - w + 2 * w * u, y + h * (0.42 + 0.22 * E.fbm1(u * 6, seed + 3, 2)) * env]);
    }
    E.wash(p, E.smoothPath(pts, true, 0.5), S.under, { alpha: 0.15 * a });
    softSpot(p, x + w * 0.06, y - h * 0.3, w * 0.72, h * 0.34, '#FFFFFF', 0.5 * a, 'source-over');
    softSpot(p, x + w * 0.06, y - h * 0.3, w * 0.7, h * 0.3, S.rim, 0.55 * a);
  }
  /** the dusk clouds of the scene (also drawn mirrored in the water) */
  function clouds(p, lt, S, a = 1) {
    stratus(p, 250 + lt * 6, 300, 330, 54, 3, a, S);
    stratus(p, 850 + lt * 4, 190, 260, 44, 7, 0.9 * a, S);
    stratus(p, 940 + lt * 5, 520, 190, 34, 11, 0.8 * a, S);
    stratus(p, 120 + lt * 5, 590, 170, 28, 15, 0.7 * a, S);
  }

  /** a small distant bird (two flapping wing strokes) */
  function bird(L, x, y, sz, ph) {
    const f = Math.sin(ph * E.TAU);
    const p = new Path2D();
    p.moveTo(x - sz, y - sz * 0.35 * f - sz * 0.1);
    p.quadraticCurveTo(x - sz * 0.45, y - sz * 0.45 - sz * 0.3 * f, x, y);
    p.quadraticCurveTo(x + sz * 0.45, y - sz * 0.45 - sz * 0.3 * f, x + sz, y - sz * 0.35 * f - sz * 0.1);
    const c = L.paint;
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.strokeStyle = E.rgba('#5E4C62', 0.8);
    c.lineWidth = Math.max(1.6, sz * 0.16);
    c.lineCap = 'round';
    c.stroke(p);
    c.restore();
  }

  /** soft column of light from above (no source): bare paper lifted + warm glow + rays on the light layer */
  function lightFromAbove(L, a, lt, x, yBot) {
    if (a <= 0.003) return;
    const p = L.paint;
    p.save();
    p.setTransform(1, 0, 0, 1, 0, 0);
    p.translate(x, -120);
    p.scale(1, (yBot + 120) / 250);
    const g = p.createRadialGradient(0, 0, 0, 0, 0, 250);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    p.globalAlpha *= 0.75 * a;
    p.fillStyle = g;
    p.fillRect(-260, 0, 520, 260);
    p.restore();
    const l = L.light;
    l.save();
    l.setTransform(1, 0, 0, 1, 0, 0);
    E.rays(l, x, -140, { n: 9, len: yBot + 220, spread: 0.34, width: 0.03, color: '#FFE7B8', a: 0.3 * a, seed: 6, t: lt });
    E.glow(l, x, -40, 440, '#FFE9C2', 0.55 * a);
    l.restore();
  }

  /** a rose of light around (0,0): three rings of broad rounded petals opening one after another;
      p = opening 0..1; s = scale; spin = slow rotation */
  // outer ring warm gold, middle peach-rose, inner rose: pale (lit) at the centre, pigment pooled at the tips
  const ROSE = [
    { n: 10, d0: 30, len: 196, w: 112, col: '#F3C47C', rim: '#D58F52', off: 0, lag: 0, dir: 1 },
    { n: 8, d0: 24, len: 150, w: 100, col: '#F1A98E', rim: '#C86F66', off: 0.3, lag: 0.14, dir: -1 },
    { n: 6, d0: 18, len: 104, w: 80, col: '#EE98A6', rim: '#B45E78', off: 0.9, lag: 0.28, dir: 1 },
  ];
  function petalPath(R, i, pk, spin, s) {
    const ang = spin * R.dir + R.off + (i / R.n) * E.TAU - Math.PI / 2;
    const len = R.len * pk * s, d0 = R.d0 * s, w = R.w * s * (0.45 + 0.55 * pk);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const P2 = (u, v) => [ca * (d0 + u * len) - sa * v, sa * (d0 + u * len) + ca * v];
    // a rounded petal with a soft point (Ottoman rose / tulip petal), slightly asymmetric
    const pts = [P2(0, 0), P2(0.16, w * 0.34), P2(0.5, w * 0.5), P2(0.84, w * 0.36), P2(0.98, w * 0.1), P2(1.04, -w * 0.02), P2(0.94, -w * 0.16), P2(0.8, -w * 0.38), P2(0.48, -w * 0.48), P2(0.15, -w * 0.32)];
    return { path: E.smoothPath(pts, true, 0.5), len, d0 };
  }
  function roseOfLight(L, p, a, spin, s) {
    if (p <= 0.002 || a <= 0.003) return;
    const pa = L.paint, li = L.light, ink = L.ink;
    const rings = [];
    const all = new Path2D();
    for (const R of ROSE) {
      const q = E.clamp((p - R.lag) / (1 - R.lag));
      const pk = E.ease.outBackSoft(q);
      if (pk <= 0.001) continue;
      const ps = [];
      for (let i = 0; i < R.n; i++) { const pp = petalPath(R, i, pk, spin, s); ps.push(pp); all.addPath(pp.path); }
      rings.push({ R, ps, pk });
    }
    if (!rings.length) return;
    // the bloom is light: paper given back once under the whole flower (so overlapping petals can layer)
    E.lift(pa, all, 0.88 * a, 2.5 * s);
    for (const { R, ps } of rings) {
      for (const { path, len, d0 } of ps) {
        // translucent glaze: thin warm light at the base, pigment pooling toward the petal tip
        E.wash(pa, path, R.col, { alpha: 0.5 * a, grad: { from: [0, 0], r0: d0 * 0.5, r: d0 + len * 1.02, stops: [[0, E.rgba('#FCE9C6', 0.15)], [0.45, E.rgba(R.col, 0.4)], [0.85, E.rgba(R.col, 0.85)], [1, E.rgba(R.rim, 0.95)]] } });
        E.pencil(ink, path, { w: 1.0, a: 0.22 * a, color: R.rim, double: false });
      }
    }
    // light from within: a warm luminous core spreading through the petals
    li.save();
    li.globalCompositeOperation = 'lighter';
    li.globalAlpha *= a * 0.55;
    const big = rings[0].R.d0 * s + rings[0].R.len * s * rings[0].pk;
    const g = li.createRadialGradient(0, 0, 0, 0, 0, big);
    g.addColorStop(0, 'rgba(255,240,214,0.95)');
    g.addColorStop(0.45, 'rgba(255,216,170,0.45)');
    g.addColorStop(1, 'rgba(255,196,150,0)');
    li.fillStyle = g;
    li.fill(all);
    li.restore();
  }

  /** a soft ring of light expanding from (x, y) */
  function lightRing(ctx, x, y, r, w, a, col = '255,236,206') {
    if (a <= 0.005 || r <= 1) return;
    const g = ctx.createRadialGradient(x, y, Math.max(0, r - w), x, y, r + w);
    g.addColorStop(0, `rgba(${col},0)`);
    g.addColorStop(0.5, `rgba(${col},${a})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x - r - w, y - r - w, 2 * (r + w), 2 * (r + w));
    ctx.restore();
  }

  function waterPath() {
    const p = new Path2D();
    p.ellipse(POND.x, POND.y, POND.w * 0.492, POND.h * 0.488, 0, 0, E.TAU);
    return p;
  }

  /** expanding broken ripple rings on the water from (x, y) started at t0 */
  function rings(L, lt, t0, x, y, { n = 4, gap = 0.28, life = 1.6, maxR = 300, a = 1, seed = 1, r0 = 14 } = {}) {
    const pa = L.paint;
    for (let i = 0; i < n; i++) {
      const u = (lt - t0 - i * gap) / life;
      if (u <= 0 || u >= 1) continue;
      const rr = r0 + E.ease.outCubic(u) * maxR;
      const al = Math.pow(1 - u, 1.6) * a;
      const ry = rr * 0.34; // low viewing angle: flat ellipses
      const seg = new Path2D(), seg2 = new Path2D();
      const k = 6;
      for (let j = 0; j < k; j++) {
        const a0 = (j / k) * E.TAU + i * 0.7 + seed + 0.18, a1 = ((j + 1) / k) * E.TAU + i * 0.7 + seed - 0.18 - 0.2 * u;
        seg.moveTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * ry);
        seg.ellipse(x, y, rr, ry, 0, a0, a1);
        seg2.moveTo(x + Math.cos(a0) * rr, y + 2.5 + Math.sin(a0) * ry);
        seg2.ellipse(x, y + 2.5, rr, ry, 0, a0, a1);
      }
      pa.save();
      pa.lineCap = 'round';
      pa.globalCompositeOperation = 'multiply';
      pa.strokeStyle = E.rgba('#8E6E70', 0.45 * al);
      pa.lineWidth = 2.2;
      pa.stroke(seg2);
      pa.globalCompositeOperation = 'source-over';
      pa.strokeStyle = E.rgba('#FFFFFF', 0.85 * al);
      pa.lineWidth = 2.4 + 1.6 * u;
      pa.stroke(seg);
      pa.restore();
    }
  }

  /** glitter path: broken horizontal glints of bare paper on the water below a light at x */
  function glitter(L, a, lt, x, y0, y1, seed = 77) {
    if (a <= 0.01) return;
    const r = E.rng(seed);
    const pa = L.paint, li = L.light;
    for (let i = 0; i < 46; i++) {
      const v = r(), u = Math.pow(v, 0.8);
      const y = y0 + (y1 - y0) * u;
      const spread = 26 + 150 * u;
      const xx = x + (r() - 0.5) * 2 * spread * (0.4 + 0.6 * r());
      const len = (6 + 34 * u) * (0.5 + r());
      const tw = 0.5 + 0.5 * Math.sin(lt * (2.2 + r() * 2) + i * 1.7);
      const aa = a * E.clamp((tw - 0.2) / 0.8) * (1 - 0.45 * u);
      if (aa < 0.02) continue;
      const e = new Path2D();
      e.ellipse(xx + Math.sin(lt * 0.8 + i) * 4, y, len * (0.7 + 0.3 * tw), 1.4 + 2.2 * u, 0, 0, E.TAU);
      E.lift(pa, e, aa * 0.95, 0.8);
      li.save();
      li.globalCompositeOperation = 'lighter';
      li.globalAlpha *= aa * 0.5;
      li.fillStyle = '#FFE3BC';
      li.fill(e);
      li.restore();
    }
  }

  /** far-bank trees. refl = true: drawn inside the pond's mirrored reflect() pass, each mirrored about its OWN
      foot (not about LINE_Y), fully opaque (a translucent tree would show its trunk through the crown) */
  const TREES = [
    { x: 128, dy: 6, h: 450, o: { kind: 'cypress', seed: 2, color: '#526E58' }, dt: 0 },
    { x: 206, dy: 4, h: 360, o: { kind: 'cypress', seed: 3, color: '#5C785B' }, dt: 1 },
    { x: 918, dy: 5, h: 310, o: { kind: 'round', seed: 4, color: '#879659' }, dt: 0 },
  ];
  function trees(L, lt, refl = false) {
    for (const T of TREES) {
      const foot = farEdge(T.x) - T.dy;
      PR.tree(L, T.x, refl ? 2 * LINE_Y - foot : foot, T.h, { ...T.o, t: lt + T.dt, shadow: refl ? 0 : 1 });
    }
  }

  /** far bank lip along the waterline */
  let FB = null;
  function farBank(L) {
    if (!FB) {
      const top = [], bot = [];
      for (let x = -420; x <= 1500; x += 30) {
        top.push([x, farEdge(x) - 30 + E.fbm1(x * 0.01, 31, 3) * 9]);
        bot.push([x, farEdge(x) + 1.5]);
      }
      FB = {
        band: E.smoothPath(top.concat(bot.reverse()), true, 0.5),
        edge: E.smoothPath(bot.slice().reverse(), false, 0.5),
      };
    }
    E.wash(L.paint, FB.band, '#6F7448', { alpha: 0.32, grad: { from: [0, LINE_Y - 34], to: [0, LINE_Y], stops: [[0, 'rgba(111,116,72,0)'], [0.5, 'rgba(111,116,72,0.55)'], [1, 'rgba(84,90,58,1)']] } });
    E.pencil(L.paint, FB.edge, { w: 2.4, a: 0.22, color: '#4E4A3A', double: false });
  }

  const nearEdge = (x) => POND.y + POND.h * 0.488 * Math.sqrt(Math.max(0, 1 - Math.pow((x - POND.x) / (POND.w * 0.492), 2)));
  /** the near shore: a grassy band in front of the water (hides the pond's own near bank) */
  function shore(L, lt) {
    const pa = L.paint, ink = L.ink;
    const top = [];
    for (let x = -260; x <= 1340; x += 32) top.push([x, nearEdge(x) - 10 + E.fbm1(x * 0.012, 5, 3) * 9]);
    const path = E.smoothPath(top.concat([[1400, 2500], [-320, 2500]]), true, 0.5);
    E.wash(pa, path, '#7F8653', { mode: 'over', grad: { from: [0, 1540], to: [0, 1960], stops: [[0, '#8C8F58'], [0.35, '#737A4C'], [1, '#4F563C']] } });
    ink.save(); ink.globalCompositeOperation = 'destination-out'; ink.fill(path); ink.restore();
    L.light.save(); L.light.globalCompositeOperation = 'destination-out'; L.light.fill(path); L.light.restore();
    pa.save();
    pa.clip(path);
    // sunlit crest along the shoreline, then a second darker glaze lower down (lost & found edges)
    const crest = E.smoothPath(top.map(([x, y]) => [x, y - 2]).concat(top.slice().reverse().map(([x, y]) => [x, y + 34 + E.noise1(x * 0.02, 3) * 10])), true, 0.5);
    E.wash(pa, crest, '#E2C887', { alpha: 0.55, soft: 6 });
    const low = E.smoothPath(top.map(([x, y]) => [x, y + 90 + E.fbm1(x * 0.008, 9, 2) * 30]).concat([[1400, 2500], [-320, 2500]]), true, 0.5);
    E.wash(pa, low, '#59603F', { alpha: 0.35 });
    softSpot(pa, 300, 1760, 200, 150, '#8E7A4E', 0.28);
    softSpot(pa, 800, 1800, 220, 160, '#6E6A86', 0.22);
    // grass texture: a few soft darker patches and broken wisps (no straight strokes)
    const r = E.rng(41);
    for (let i = 0; i < 7; i++) {
      const y0 = 1690 + r() * 200, x0 = r() * 1080;
      E.wash(pa, E.blob(x0, y0, 120, { rx: 130 + r() * 90, ry: 16 + r() * 12, seed: 60 + i, irr: 0.35 }), '#4E5638', { alpha: 0.16 + r() * 0.1, soft: 8 });
    }
    pa.restore();
    // wet dark line where water meets the shore, and a light pencil contour (broken)
    E.pencil(pa, top, { w: 3, a: 0.25, color: '#4A4434', double: false });
    E.pencil(ink, top.filter((q, i) => i % 9 < 6), { w: 1.2, a: 0.25, double: false });
    // grass tufts along the crest
    const tufts = new Path2D();
    for (let i = 0; i < 26; i++) {
      const x0 = -40 + r() * 1160, y0 = nearEdge(x0) - 6 + r() * 30, s2 = 10 + r() * 16;
      const sway = Math.sin(lt * 1.3 + i) * 1.5;
      for (let k = -2; k <= 2; k++) { tufts.moveTo(x0 + k * s2 * 0.12, y0); tufts.quadraticCurveTo(x0 + k * s2 * 0.3 + sway * 0.5, y0 - s2 * 0.6, x0 + k * s2 * 0.5 + sway, y0 - s2 * (1.2 - Math.abs(k) * 0.18)); }
    }
    pa.save(); pa.strokeStyle = E.rgba('#4F5838', 0.75); pa.lineWidth = 2; pa.lineCap = 'round'; pa.stroke(tufts); pa.restore();
  }

  /** foreground reeds and grasses (dark, low contrast, swaying) */
  function reedClump(L, x, y, h, n, seed, lt, lean = 0) {
    const r = E.rng(seed);
    const pa = L.paint, ink = L.ink;
    const blades = new Path2D(), heads = new Path2D();
    for (let i = 0; i < n; i++) {
      const x0 = x + (r() - 0.5) * h * 0.35, hh = h * (0.45 + 0.55 * r());
      const ln = lean + (r() - 0.5) * 0.55 + Math.sin(lt * 1.2 + i * 1.3 + seed) * 0.035;
      const wd = 4 + r() * 5;
      const tip = [x0 + Math.sin(ln) * hh, y - Math.cos(ln) * hh];
      const mid = [x0 + Math.sin(ln) * hh * 0.45 + (r() - 0.5) * 8, y - Math.cos(ln) * hh * 0.5];
      blades.addPath(E.smoothPath([[x0 - wd, y + 4], [mid[0] - wd * 0.6, mid[1]], tip, [mid[0] + wd * 0.6, mid[1]], [x0 + wd, y + 4]], true, 0.4));
      if (r() < 0.32) {
        const hy = y - Math.cos(ln) * hh * 0.78, hx = x0 + Math.sin(ln) * hh * 0.78;
        const hp = new Path2D();
        hp.ellipse(hx, hy, 6, 22, ln, 0, E.TAU);
        heads.addPath(hp);
      }
    }
    E.wash(pa, blades, '#5D6540', { mode: 'over', alpha: 0.92 });
    E.wash(pa, blades, '#3F4632', { alpha: 0.35, grad: { from: [x, y - h], to: [x, y], c2: '#2E3326' } });
    E.wash(pa, heads, '#6E4A36', { mode: 'over' });
    E.pencil(ink, blades, { w: 1.1, a: 0.22, double: false });
    ink.save(); ink.globalCompositeOperation = 'destination-out'; ink.globalAlpha = 0.6; ink.fill(blades); ink.restore();
    L.light.save(); L.light.globalCompositeOperation = 'destination-out'; L.light.fill(blades); L.light.restore();
  }

  // ---------------------------------------------------------------- the scene
  E.scene('s14', {
    draw(L, lt, t, shot) {
      const tm = times(shot);
      const c = camAt(lt, tm);
      const H = heartAt(lt, tm);
      const k = E.seg(c.y, 1032, 862); // camera tilt progress (sky drifts with it)
      // the evening deepens through the shot: golden late afternoon -> rose-lavender dusk
      const dk = E.ep(lt, 0, tm.inkilab + 0.4, 'inOutSine');
      const S = skyPal(dk);

      // ---- sky (screen space)
      sky(L, k, S);
      // ---- dusk cloud bands (parallax 0.3)
      setCam(L, c, 0.3);
      clouds(L.paint, lt, S);
      // a few distant birds crossing the evening sky
      setCam(L, c, 0.45);
      [[930, 300, 15, 0.0], [985, 326, 12, 0.37], [1035, 292, 11, 0.71]].forEach(([x0, y0, sz, ph], i) =>
        bird(L, x0 - lt * 48 - i * 3, y0 + Math.sin(lt * 1.3 + i) * 5, sz, lt * (2.3 + i * 0.2) + ph));

      // ---- light from above (grows with the real heart, peaks as it ascends, then fades)
      const la = 0.22 * H.bright + 0.42 * H.bloom + 0.45 * H.gone - 1.1 * E.ep(lt, tm.asc1 - 0.02, tm.dim1 - 0.05, 'inOutSine');
      E.resetCamera(L);
      lightFromAbove(L, E.clamp(la), lt, 540, 1000);

      // ---- landscape (parallax 0.82)
      setCam(L, c, 0.82);
      PR.ground(L, 772, { palette: "dusk", t: lt, seed: 5, trees: 0.75, flowers: 0.35, x0: -300, x1: 1380, bottom: 1150 });

      // ---- the pond (parallax 1) with the reflections of the trees and the heart
      setCam(L, c, 1);
      const emerged = E.smooth(E.clamp((CROSS + 24 - (H.hy + 0.95 * H.r)) / 52));
      const mir = (y) => 2 * LINE_Y - y;
      PR.pond(L, POND.x, POND.y, POND.w, POND.h, {
        t: lt, tone: 'gold', ripple: 0, bank: 0,
        lineY: LINE_Y, reflectVeil: 0.22,
        reflect: (L2) => {
          const p2 = L2.paint;
          // the sky, mirrored: gold just under the waterline, rose and then lavender toward us (water is a
          // little darker than the sky it reflects)
          E.wash(p2, E.rrect(-400, LINE_Y - 1060, 1880, 1080, 0), S.top, { alpha: 0.82, grad: { from: [0, LINE_Y - 1000], to: [0, LINE_Y], stops: skyStops(S) } });
          // the dusk clouds, mirrored and stretched a little (soft, lavender)
          p2.save(); p2.translate(0, LINE_Y); p2.scale(1, 1.25); p2.translate(0, -LINE_Y);
          clouds(p2, lt, S, 0.9);
          p2.restore();
          // the far bank and the hills behind it, mirrored: a soft darker band right under the waterline
          E.wash(p2, E.rrect(-400, LINE_Y - 95, 1880, 100, 0), '#8E8A6E', { alpha: 0.55, grad: { from: [0, LINE_Y - 95], to: [0, LINE_Y], stops: [[0, 'rgba(160,146,170,0)'], [0.45, 'rgba(150,140,150,0.6)'], [1, 'rgba(110,118,80,0.9)']] } });
          trees(L2, lt, true);
          // the metaphorical heart: only a wavering reflection (and, while it rises, its submerged part)
          if (H.refl > 0 && emerged < 1) {
            E.save(L2);
            E.each(L2, (cx) => { cx.beginPath(); cx.rect(-3000, -6000, 9000, mir(CROSS) + 6000); cx.clip(); });
            const a = H.refl * (0.8 + 0.2 * H.pulse) * (1 - emerged);
            PR.heartLight(L2, HX, mir(H.hy), H.r, { reflection: true, t: lt, glow: 0.8 + 0.2 * H.pulse, alpha: a, color: '#E39AAA' });
            E.restore(L2);
          }
          // once real, the water reflects it properly (inverted, about the surface it left) while it is near
          const ra = emerged * (1 - E.ep(H.hy, CROSS - 60, CROSS - 380, 'linear'));
          if (ra > 0.01) PR.heartLight(L2, HX, mir(2 * CROSS - H.hy), H.r, { reflection: true, flip: true, t: lt, glow: 0.9, alpha: ra * 0.8, color: '#E39AAA' });
        },
      });

      // ---- on the water: glow of the reflection, glitter path of the real heart, ripples
      E.save(L);
      E.each(L, (cx) => cx.clip(waterPath()));
      E.wash(L.paint, waterPath(), '#A68DB0', { alpha: 0.4, grad: { from: [0, farEdge(540) + 40], to: [0, POND.y + POND.h * 0.5], stops: [[0, 'rgba(166,141,176,0)'], [0.45, 'rgba(166,141,176,0.35)'], [1, 'rgba(140,118,160,0.9)']] } });
      // the reflection is light, not pigment: a lifted luminous core and a rose glow on the water
      const reflGlow = H.refl * (1 - emerged) * (0.6 + 0.4 * H.pulse);
      if (reflGlow > 0) {
        const cyR = Math.max(H.hy, CROSS + H.r * 0.5);
        E.lift(L.paint, E.blob(HX, cyR - H.r * 0.1, H.r * 0.5, { rx: H.r * 0.62, ry: H.r * 0.5, seed: 4, irr: 0.15 }), 0.48 * reflGlow, H.r * 0.25);
        E.glow(L.light, HX, cyR - H.r * 0.1, H.r * (2.5 + 0.5 * H.pulse), '#FFB4C6', 0.62 * reflGlow);
      }
      const ra2 = emerged * (1 - E.ep(H.hy, CROSS - 60, CROSS - 380, 'linear'));
      if (ra2 > 0.01) {
        const yR = 2 * CROSS - H.hy;
        E.lift(L.paint, E.blob(HX, yR + H.r * 0.1, H.r * 0.5, { rx: H.r * 0.6, ry: H.r * 0.45, seed: 6, irr: 0.15 }), 0.35 * ra2, H.r * 0.25);
        E.glow(L.light, HX, yR, H.r * 2.2, '#FFC8B4', 0.35 * ra2);
      }
      glitter(L, H.refl * 0.35 * (1 - H.rise), lt, HX, REF_Y - 60, REF_Y + 110, 31);
      glitter(L, (0.35 + 0.65 * H.bright) * E.seg(H.rise, 0.35, 0.8) * (1 - E.ep(lt, tm.asc0 + 0.2, tm.asc1)), lt, HX, farEdge(HX) + 8, 1330, 77);
      if (H.bright > 0) E.glow(L.light, HX, farEdge(HX) + 120, 300, '#FFD7B4', 0.28 * H.bright * (1 - H.asc));
      rings(L, lt, tm.reflIn, HX, REF_Y - 8, { n: 2, gap: 0.55, life: 1.9, maxR: 220, a: 0.45, seed: 2, r0: 100 });
      rings(L, lt, tm.rise0 + 0.05, HX, CROSS + 8, { n: 4, gap: 0.26, life: 1.8, maxR: 420, a: 0.85, seed: 1 });
      rings(L, lt, tm.asc0 + 0.12, HX, CROSS + 8, { n: 3, gap: 0.34, life: 1.7, maxR: 460, a: 0.5, seed: 4 });
      E.restore(L);

      // ---- the far bank: a darker grassy lip with a wet edge at the waterline (lost toward the meadow)
      farBank(L);
      // ---- far-bank trees stand on the bank in front of the water's edge
      trees(L, lt);
      // dusk motes drifting low over the water
      E.motes(L.light, { x: 60, y: 880, w: 960, h: 360, n: 14, t: lt, seed: 23, color: '#FFE0A6', size: 2.4, a: 0.55 * (1 - E.ep(lt, tm.dim0, tm.dim1)), rise: 10 });

      // ---- the real heart: above the surface it is solid (rises out of the water)
      const solidA = E.ep(lt, tm.rise0, tm.rise0 + 0.06);
      if (solidA > 0 && H.gone < 1) {
        const ga = 1 - H.gone;
        E.save(L);
        // (only pigment and pencil are cut at the surface; its light may spill onto the water)
        if (emerged < 1) for (const cx of [L.paint, L.ink]) { cx.beginPath(); cx.rect(-3000, -6000, 9000, CROSS + 6000); cx.clip(); }
        E.translate(L, HX, H.hy);
        roseOfLight(L, H.bloom, ga * (1 - 0.6 * H.asc), lt * 0.18, H.r / R1);
        // a soft trail of light below it as it ascends
        if (H.asc > 0.01) {
          const len = 520 * Math.sqrt(H.asc);
          const tg = L.light.createLinearGradient(0, 0, 0, len);
          tg.addColorStop(0, E.rgba('#FFE6C4', 0.5 * ga));
          tg.addColorStop(1, E.rgba('#FFE6C4', 0));
          L.light.save();
          L.light.globalCompositeOperation = 'lighter';
          L.light.fillStyle = tg;
          L.light.beginPath();
          L.light.moveTo(-H.r * 0.55, 0); L.light.lineTo(H.r * 0.55, 0); L.light.lineTo(H.r * 0.12, len); L.light.lineTo(-H.r * 0.12, len);
          L.light.fill();
          L.light.restore();
        }
        E.translate(L, -HX, -H.hy);
        PR.heartLight(L, HX, H.hy, H.r, { t: lt, glow: E.clamp(0.72 + 0.28 * H.bright + 0.3 * H.flash), alpha: solidA * ga });
        E.restore(L);
        // where it breaks the surface: a bright ring of disturbed water
        const dyc = (CROSS - H.hy) / (1.02 * H.r);
        const ringA = E.clamp(1.2 - Math.abs(dyc)) * solidA * (1 - emerged);
        if (ringA > 0.01) {
          const rw = H.r * 1.02 * Math.sqrt(E.clamp(1 - dyc * dyc)) + 12;
          const ring = new Path2D();
          ring.ellipse(HX, CROSS + 3, rw, 11 + rw * 0.06, 0, 0, E.TAU);
          const inner = new Path2D();
          inner.ellipse(HX, CROSS + 3, rw * 0.82, 7 + rw * 0.04, 0, 0, E.TAU);
          E.lift(L.paint, ring, 0.75 * ringA, 3);
          E.wash(L.paint, inner, '#E7B9A0', { alpha: 0.35 * ringA, soft: 3 });
          E.glow(L.light, HX, CROSS, rw * 1.7, '#FFE9C8', 0.55 * ringA);
        }
      }
      // sparkles trailing the ascent
      if (H.asc > 0) E.motes(L.light, { x: HX - 170, y: H.hy - 40, w: 340, h: 640, n: 28, t: lt, seed: 9, color: '#FFE7C4', size: 3.2, a: 0.9 * E.seg(lt, tm.asc0, tm.asc0 + 0.3) * (1 - E.ep(lt, tm.asc1, tm.dim1)), rise: 140 });
      // a soft flash of light at the transformation
      if (H.flash > 0.01) E.glow(L.light, HX, H.hy, 560, '#FFF0D6', 0.5 * H.flash);
      const ru = E.seg(lt, tm.inkilab - 0.02, tm.inkilab + 0.75);
      if (ru > 0 && ru < 1) lightRing(L.light, HX, H.hy, 90 + E.ease.outCubic(ru) * 520, 36 + 40 * ru, 0.42 * Math.pow(1 - ru, 1.5));

      // ---- near shore (parallax 1) and foreground (parallax 1.2): reeds framing the lower corners
      setCam(L, c, 1);
      shore(L, lt);
      setCam(L, c, 1.2);
      reedClump(L, 40, 1720, 430, 13, 5, lt, 0.12);
      reedClump(L, 1060, 1700, 380, 11, 9, lt + 1.3, -0.15);
      PR.flower(L, 150, 1660, 190, { kind: 'wild', t: lt, seed: 3, color: '#C98A8A' });
      PR.flower(L, 975, 1640, 170, { kind: 'tulip', t: lt + 2, seed: 6, color: '#D4876E' });

      // ---- dusk deepens: the light fades down into s15's darkness
      E.resetCamera(L);
      const dim = E.ep(lt, tm.dim0, tm.dim1, 'inOutSine');
      if (dim > 0) {
        E.wash(L.paint, E.rrect(-10, -10, 1100, 1940, 0), '#56557F', { alpha: 0.62 * dim, grad: { from: [0, 0], to: [0, 1920], stops: [[0, '#56557F'], [0.55, '#64628C'], [1, '#46446C']] } });
        L.light.save();
        L.light.globalCompositeOperation = 'destination-out';
        L.light.fillStyle = E.rgba('#000000', 0.85 * dim);
        L.light.fillRect(0, 0, 1080, 1920);
        L.light.restore();
      }
    },
    sfx(shot) {
      const tm = times(shot);
      const g = (x) => shot.start + x;
      return [
        { t: g(tm.reflIn), type: 'bloom', gain: 0.3, pitch: 0.8 },
        { t: g(tm.ask - 0.04), type: 'heart', gain: 0.22 },
        { t: g(tm.rise0 + 0.03), type: 'water', gain: 0.3, pitch: 1.1 },
        { t: g(tm.rise0 + 0.12), type: 'swell', gain: 0.28, dur: 1.2 },
        { t: g(tm.inkilab - 0.04), type: 'chime', gain: 0.36, pitch: 1.0 },
        { t: g(tm.inkilab + 0.02), type: 'sparkle', gain: 0.22 },
        { t: g(tm.asc0 + 0.1), type: 'whoosh', gain: 0.18, pitch: 1.3 },
      ];
    },
  });
})();
