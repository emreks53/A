/* s10 · 44.65–47.65 (+1.0 s tail under the bleed into s11) · "ondan, cilve-i esmaya intikal eder."

   From the single work of art the love passes on — horizontally, at eye level — to the same beauty appearing
   everywhere in living creation. No light from above, no sky symbolism, no rays, no ascent: the beauty is shown as
   life and colour.
     44.65 (cut)          match cut on s09's last frame: the rose, the butterfly and the heart-light at exactly the
                          same place and size on screen — but the rose is now a living rose on a wild rose bush. Around
                          it the world is still an unpainted pencil sketch on pale paper.
     44.99 ondan          the heart lifts off from the rose and glides to the right at eye level; the camera widens on
                          a spring meadow by a stream; the butterfly flutters off with it
     45.51 cilve-i esmaya wherever the heart-light passes, colour flows out into the sketch like wet pigment: the far
                          blossom tree, the flowers on the banks open, butterflies rise from them, the stream shimmers
     46.45 intikal eder   it reaches the great blossom tree: blossoms colour, two songbirds fly up; the colour spreads
                          to the whole meadow, the hills and the sky (life and beauty everywhere)
     47.65 → 48.65        held, alive, while s11's morning garden bleeds in from (540, 300): same horizon (y 790),
                          same morning sky and clouds; the rose bush stands where the gardener will stand.
   Uses the shared naturalist studies E.natArt (defined in s09.js): the rose, the swallowtail, the songbird.
*/
(function () {
  const E = window.E;
  const P = E.P;
  const PI = Math.PI, TAU = PI * 2;
  const PR = () => E.props;
  const A = () => E.natArt;
  const lerp = E.lerp, clamp = E.clamp, ep = E.ep, seg = E.seg;

  // ---------------------------------------------------------------- world (zoom 1 = the final wide framing)
  const HZ = 790;                                   // horizon (as s11)
  const ROSE = { x: 232, y: 812, r: 34 };           // the rose of the match cut (bloom radius in world px)
  const STREAM = [[664, 793], [656, 806], [640, 830], [612, 862], [540, 906], [306, 972], [-90, 1040]];
  const TREE = { x: 884, y: 1036, h: 540 };         // the great blossom tree (right)
  const FAR_TREE = { x: 404, y: 880, h: 200 };      // a small round tree on the far bank
  const FLOWERS = [
    { k: 'tulip', x: 452, y: 1046, s: 124, c: '#D2553F', seed: 3 },
    { k: 'tulip', x: 500, y: 1064, s: 104, c: '#E3843C', seed: 4 },
    { k: 'daisy', x: 552, y: 1080, s: 88, seed: 5 },
    { k: 'wild', x: 600, y: 1058, s: 76, seed: 6 },
    { k: 'tulip', x: 760, y: 1006, s: 96, c: '#C8405A', seed: 7 },
    { k: 'daisy', x: 706, y: 990, s: 74, seed: 8 },
    { k: 'wild', x: 520, y: 902, s: 54, seed: 9 },
    { k: 'daisy', x: 566, y: 894, s: 50, seed: 10 },
    { k: 'tulip', x: 760, y: 880, s: 58, c: '#D2553F', seed: 11 },
    { k: 'carnation', x: 652, y: 1116, s: 100, seed: 12 },
    { k: 'tulip', x: 822, y: 1124, s: 126, c: '#DA6A3E', seed: 13 },
    { k: 'daisy', x: 384, y: 1126, s: 96, seed: 14 },
    { k: 'wild', x: 712, y: 1150, s: 80, seed: 15 },
    { k: 'daisy', x: 905, y: 1100, s: 84, seed: 16 },
    // foreground, low in the corners (decorative, like s11's)
    { k: 'tulip', x: 70, y: 1905, s: 230, c: '#D9603F', seed: 21 },
    { k: 'daisy', x: 168, y: 1880, s: 170, seed: 22 },
    { k: 'daisy', x: 300, y: 1930, s: 130, seed: 23 },
    { k: 'tulip', x: 915, y: 1910, s: 215, c: '#E07A45', seed: 24 },
    { k: 'daisy', x: 1010, y: 1880, s: 165, seed: 25 },
  ];
  const BIRDS = [{ x: 724, y: 640, s: 50, f: 1, dx: -1 }, { x: 812, y: 566, s: 46, f: -1, dx: 1 }];
  const FLIES = [                                   // butterflies resting on flowers (index into FLOWERS)
    { fl: 0, c: 0, s: 50, seed: 1 }, { fl: 9, c: 0, s: 46, seed: 2 }, { fl: 4, c: 0, s: 40, seed: 3 },
  ];

  // ---------------------------------------------------------------- timing
  function times(shot) {
    const w = (i) => E.T(i) - shot.start;
    const T = { on: w(82), ci: w(83), es: w(85), in: w(86), ed: w(87) };
    T.zoom0 = 0.12; T.zoom1 = T.in + 0.55;       // the camera widens
    T.go0 = T.on - 0.04; T.go1 = T.in + 0.55;   // the heart's journey
    T.all0 = T.in - 0.15; T.all1 = T.ed + 0.75; // colour reaches the whole meadow
    return T;
  }

  // ---------------------------------------------------------------- the cut (from s09)
  let CUT = null;
  function cut() {
    if (CUT) return CUT;
    const c = E.natArt && E.natArt.s09cut ? E.natArt.s09cut() : null;
    CUT = c || {
      rose: { x: 466, y: 561, s: 114, rot: 0.1 }, fly: { x: 702, y: 466, s: 196, rot: -0.25, flap: 0.9 },
      heart: { x: 540, y: 349, r: 44, rot: 0, clock: 0 },
    };
    return CUT;
  }
  const Z0 = () => cut().rose.s / ROSE.r;

  // ---------------------------------------------------------------- camera (screen = (world − c) · z + centre)
  function camAt(lt, T) {
    const C = cut();
    const k = ep(lt, T.zoom0, T.zoom1, 'inOutCubic');
    const z = Math.exp(lerp(Math.log(Z0()), 0, k)) * (1 + 0.018 * ep(lt, T.zoom1 - 0.3, 4.2, 'inOutSine'));
    // the rose glides from its cut position to its place in the wide shot
    const rs = [lerp(C.rose.x, ROSE.x, k), lerp(C.rose.y, ROSE.y, k)];
    const x = ROSE.x - (rs[0] - 540) / z + 2.5 * Math.sin(lt * 0.4) * k;
    const y = ROSE.y - (rs[1] - 960) / z + 2 * Math.sin(lt * 0.33 + 1) * k;
    return { x, y, zoom: z, k };
  }
  const camD = (c, d) => ({ x: lerp(540, c.x, d), y: lerp(960, c.y, d), zoom: Math.pow(c.zoom, d) });
  /** screen → world for this camera (parallax depth 1) */
  const toWorld = (c, sx, sy) => [c.x + (sx - 540) / c.zoom, c.y + (sy - 960) / c.zoom];

  // ---------------------------------------------------------------- the heart's journey (world coordinates)
  function pathPts() {
    const c0 = camAt(0, times(E.SHOTS.find((s) => s.id === 's10')));
    const H0 = toWorld(c0, cut().heart.x, cut().heart.y);
    return [H0, [H0[0] + 60, H0[1] - 26], [392, 726], [480, 732], [560, 718], [600, 708]];
  }
  let PATH = null;
  function path() {
    if (PATH) return PATH;
    const wp = pathPts();
    const pts = [];
    const cat = (p0, p1, p2, p3, u) => {
      const u2 = u * u, u3 = u2 * u;
      return [0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3));
    };
    for (let i = 0; i < wp.length - 1; i++) {
      const p0 = wp[Math.max(0, i - 1)], p1 = wp[i], p2 = wp[i + 1], p3 = wp[Math.min(wp.length - 1, i + 2)];
      for (let j = 0; j < 12; j++) pts.push(cat(p0, p1, p2, p3, j / 12));
    }
    pts.push(wp[wp.length - 1]);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    PATH = { pts, cum, tot: cum[cum.length - 1] };
    return PATH;
  }
  function along(sLen) {
    const { pts, cum } = path();
    if (sLen <= 0) return pts[0];
    for (let i = 1; i < pts.length; i++) if (cum[i] >= sLen) {
      const f = (sLen - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
    }
    return pts[pts.length - 1];
  }
  const goU = (lt, T) => E.ease.inOutSine(seg(lt, T.go0, T.go1));
  function heartAt(lt, T) {
    const u = goU(lt, T);
    const q = along(u * path().tot);
    // a soft lift as it leaves the rose; a gentle float on the way and at rest
    const lift = 10 * Math.sin(PI * seg(lt, T.go0 - 0.1, T.go0 + 0.4));
    const bob = (3 + 3 * u) * Math.sin(lt * 2.1);
    return { pos: [q[0] + 2 * Math.sin(lt * 1.3), q[1] - lift + bob], rot: 0.12 * Math.sin(PI * seg(lt, T.go0, T.go0 + 0.8)) - 0.06 * Math.sin(PI * seg(lt, T.go1 - 0.6, T.go1)) + 0.04 * Math.sin(lt * 1.2) };
  }

  // ---------------------------------------------------------------- colour reaching the world
  const GROW = 430;                                   // px / s: how fast the colour flows out
  const SAMPLES = 34;
  const LAG = 0.2;                                    // the colour blooms just behind the heart, never around it
  const capAt = (lt, T) => 330 + 1500 * ep(lt, T.all0, T.all1, 'inOutSine');
  /** discs (world) that are coloured at lt: the rose and the butterfly from the start, then the heart's wake */
  function wake(lt, T) {
    const out = [];
    const cap = capAt(lt, T);
    out.push({ x: ROSE.x, y: ROSE.y - 4, r: Math.min(cap, GROW * Math.max(0, lt - T.go0 - 0.1)), seed: 1 });
    for (let i = 0; i < SAMPLES; i++) {
      const tau = T.go0 + 0.25 + (i / (SAMPLES - 1)) * (T.go1 - T.go0 - 0.25);
      if (tau + LAG > lt) break;
      const q = heartAt(tau, T).pos;
      out.push({ x: q[0], y: q[1], r: Math.min(cap, GROW * (lt - tau - LAG)), seed: 10 + i });
    }
    return out;
  }
  /** earliest lt at which (x, y) is coloured (same model as wake(), analytic) */
  function reachT(x, y, T) {
    const capInv = (d) => {
      if (d <= 330) return 0;
      const v = clamp((d - 330) / 1500);
      return T.all0 + (Math.acos(1 - 2 * v) / PI) * (T.all1 - T.all0);
    };
    let best = 99;
    const d0 = Math.hypot(x - ROSE.x, y - ROSE.y + 4);
    best = Math.min(best, Math.max(T.go0 + 0.1 + d0 / GROW, capInv(d0)));
    for (let i = 0; i < SAMPLES; i++) {
      const tau = T.go0 + 0.25 + (i / (SAMPLES - 1)) * (T.go1 - T.go0 - 0.25);
      const q = heartAt(tau, T).pos;
      const d = Math.hypot(x - q[0], y - q[1]);
      best = Math.min(best, Math.max(tau + LAG + d / GROW, capInv(d)));
    }
    return best;
  }
  let REACH = null;
  function reach(T) {
    if (REACH) return REACH;
    REACH = {
      flowers: FLOWERS.map((f) => reachT(f.x, f.y - f.s * 0.7, T)),
      birds: BIRDS.map((b) => reachT(b.x, b.y, T)),
      tree: reachT(TREE.x - 60, TREE.y - TREE.h * 0.62, T),
      far: reachT(FAR_TREE.x, FAR_TREE.y - FAR_TREE.h * 0.6, T),
    };
    return REACH;
  }

  /** the unpainted world: desaturate and pale everything the colour has not reached yet (mask in a 1/4 scratch) */
  let SCR = null;
  const Q = 4;
  function unpainted(L, lt, T, cam) {
    if (!SCR) { SCR = document.createElement('canvas'); SCR.width = Math.ceil(E.W / Q); SCR.height = Math.ceil(E.H / Q); }
    const c = SCR.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.fillStyle = '#D8D8D8';                          // the paper tone the unpainted sketch is lifted to
    c.fillRect(0, 0, SCR.width, SCR.height);
    c.setTransform(1 / Q, 0, 0, 1 / Q, 0, 0);
    c.translate(540, 960); c.scale(cam.zoom, cam.zoom); c.translate(-cam.x, -cam.y);
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = '#000';
    let any = false;
    for (const d of wake(lt, T)) {
      if (d.r < 2) continue;
      any = true;
      c.fill(E.blob(d.x, d.y, d.r, { seed: d.seed, irr: 0.16, n: 40 }));
    }
    if (any && capAt(lt, T) > 1820) return;           // all coloured
    for (const [op, a] of [['saturation', 1], ['screen', 0.93]]) {
      const p = L.paint;
      p.save();
      p.setTransform(1, 0, 0, 1, 0, 0);
      p.globalCompositeOperation = op;
      p.globalAlpha = a;
      p.imageSmoothingEnabled = true;
      p.imageSmoothingQuality = 'medium';
      p.drawImage(SCR, 0, 0, E.W, E.H);
      p.restore();
    }
  }

  // ---------------------------------------------------------------- painting
  function sky(L, lt) {
    const c = L.paint;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, 1100);
    g.addColorStop(0, E.shade(P.cerulean, 0.36));
    g.addColorStop(0.45, E.shade(P.skyWash, 0.55));
    g.addColorStop(0.78, E.shade(P.gamboge, 0.72));
    g.addColorStop(1, E.shade(P.ochre, 0.62));
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = g;
    c.fillRect(0, 0, E.W, E.H);
    c.restore();
  }
  function skyBlooms(L, lt) {
    E.bloom(L.paint, 170, 260, 260, E.shade(P.cerulean, 0.25), { seed: 5, alpha: 0.22, soft: 60 });
    E.bloom(L.paint, 900, 120, 220, E.shade(P.ultramarine, 0.45), { seed: 8, alpha: 0.16, soft: 70 });
    E.bloom(L.paint, 760, 640, 260, E.shade(P.gamboge, 0.4), { seed: 11, alpha: 0.16, soft: 80 });
    PR().cloud(L, 214 + lt * 6, 250, 300, { seed: 3, t: lt + 44 });
    PR().cloud(L, 968 + lt * 4, 330, 200, { seed: 7, t: lt + 44 });
  }

  /** the stream: a ribbon widening toward us, sky reflected, shaded near bank, glints */
  let STR = null;
  function streamGeom() {
    if (STR) return STR;
    const c = [];
    for (let i = 0; i < STREAM.length - 1; i++) {
      const p0 = STREAM[Math.max(0, i - 1)], p1 = STREAM[i], p2 = STREAM[i + 1], p3 = STREAM[Math.min(STREAM.length - 1, i + 2)];
      for (let j = 0; j < 10; j++) {
        const u = j / 10, u2 = u * u, u3 = u2 * u;
        c.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3)));
      }
    }
    c.push(STREAM[STREAM.length - 1]);
    const n = c.length;
    const far = [], near = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      if (ny < 0) { nx = -nx; ny = -ny; }             // normal pointing toward the viewer (down)
      // width by perspective (distance below the horizon), tapering to a fine point where it meets the far hills
      const w = Math.max(0.8, 0.6 * (c[i][1] - (HZ + 2))) * (0.25 + 0.75 * E.smooth(clamp(u / 0.08)));
      // seen from eye level the water is flattened: offsets mostly vertical
      far.push([c[i][0] - nx * w * 0.5, c[i][1] - ny * w * 0.42]);
      near.push([c[i][0] + nx * w * 0.5, c[i][1] + ny * w * 0.42]);
    }
    STR = { c, far, near, path: E.smoothPath(far.concat(near.slice().reverse()), true, 0.4) };
    return STR;
  }
  function stream(L, lt) {
    const S = streamGeom();
    const p = L.paint;
    E.wash(p, S.path, '#FFFFFF', { mode: 'over', alpha: 0.9 });
    L.ink.save(); L.ink.globalCompositeOperation = 'destination-out'; L.ink.fill(S.path); L.ink.restore();
    E.wash(p, S.path, '#A9C6E2', { alpha: 0.85, grad: { from: [0, 790], to: [0, 1080], stops: [[0, '#E8EEF2'], [0.35, '#BFD3E6'], [1, '#93B4D6']] } });
    // the near bank's shadow on the water, a lighter sky band in the middle
    p.save();
    p.clip(S.path);
    E.wash(p, E.smoothPath(S.near.concat(S.c.slice().reverse()), true, 0.4), '#6F8FB6', { alpha: 0.28 });
    for (let i = 0; i < 9; i++) {
      const k = 8 + i * 6, q = S.c[Math.min(S.c.length - 1, k)];
      const w = 8 + i * 9, sh = Math.sin(lt * 1.6 + i * 1.7) * 6;
      const lp = new Path2D();
      lp.moveTo(q[0] - w + sh, q[1] + 1); lp.lineTo(q[0] + w * 0.6 + sh, q[1] + 1);
      p.save(); p.globalCompositeOperation = 'source-over'; p.globalAlpha *= 0.55; p.strokeStyle = '#FFFFFF'; p.lineWidth = 1.6 + i * 0.25; p.lineCap = 'round'; p.stroke(lp); p.restore();
    }
    p.restore();
    // banks: soft green-brown edges
    E.pencil(L.ink, S.far, { w: 1.1, a: 0.22, seed: 61 });
    E.pencil(L.ink, S.near, { w: 1.2, a: 0.26, seed: 62 });
    E.dryBrush(p, S.near.filter((_, i) => i % 2 === 0), '#6F8A4E', { width: 7, seed: 63, alpha: 0.4, bristles: 4 });
  }
  /** reed tufts on the banks */
  function reeds(L, lt, x, y, s, seed) {
    const r = E.rng(seed);
    const c = L.paint;
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const h = s * (0.6 + 0.5 * r()), a = (r() - 0.5) * 0.5 + 0.05 * Math.sin(lt * 1.4 + i);
      const bx = x + (r() - 0.5) * s * 0.4;
      c.strokeStyle = E.mix('#6E8C4C', '#9AB06A', r());
      c.globalAlpha = 0.8;
      c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(bx, y); c.quadraticCurveTo(bx + Math.sin(a) * h * 0.4, y - h * 0.6, bx + Math.sin(a) * h, y - h); c.stroke();
    }
    c.restore();
  }

  /** the wild rose bush (left foreground): a dense dome of serrated leaflets; the match-cut rose crowns it */
  const BUSH = (() => {
    const r = E.rng(907);
    const cx = 214, top = 856, base = 1126, hw = 172;
    const leaves = [];
    for (let i = 0; i < 150; i++) {
      const v = Math.pow(r(), 0.75);                                   // 0 top … 1 base
      const y = top + v * (base - top - 18);
      const halfw = hw * Math.sin((Math.min(1, (v + 0.1) / 0.72) * PI) / 2) * (v > 0.82 ? 1 - (v - 0.82) * 1.1 : 1);
      const x = cx + (r() * 2 - 1) * halfw;
      const a = Math.atan2(y - 1010, x - cx) + (r() - 0.5) * 1.3;
      const edge = Math.min(1, Math.abs(x - cx) / Math.max(1, halfw));
      const tone = clamp(0.25 + 0.45 * v + 0.2 * (x - cx) / hw - 0.25 * edge * (1 - v) + 0.25 * (r() - 0.5));
      leaves.push({ x, y, s: 22 + 14 * r(), rot: a, tone, seed: i });
    }
    leaves.sort((p, q) => q.tone - p.tone);                           // shadowed (inner) leaves first, lit ones on top
    const mass = E.blob(cx, 1008, 140, { rx: 170, ry: 132, seed: 32, irr: 0.14 });
    return {
      cx, leaves, mass,
      roses: [
        { x: 140, y: 896, r: 24, open: 0.85, seed: 2, rot: -0.25 }, { x: 296, y: 918, r: 23, open: 0.95, seed: 3, rot: 0.3 },
        { x: 92, y: 990, r: 19, open: 0.6, seed: 4, rot: -0.4 }, { x: 274, y: 856, r: 12, open: 0.05, seed: 5, rot: 0.35 },
        { x: 182, y: 850, r: 11, open: 0.12, seed: 6, rot: -0.3 }, { x: 326, y: 1010, r: 18, open: 0.7, seed: 7, rot: 0.45 },
        { x: 196, y: 960, r: 20, open: 0.9, seed: 8, rot: 0.1 },
      ],
    };
  })();
  function leaflet(L, x, y, s, rot, tone, t, seed) {
    E.save(L);
    E.translate(L, x, y); E.rotate(L, rot + 0.05 * Math.sin(t * 1.2 + seed)); E.scale(L, s);
    const pts = [];
    const n = 36;
    for (let i = 0; i <= n; i++) { const u = i / n; const w = 0.3 * 2.6 * Math.pow(u, 0.6) * Math.pow(1 - u, 1.05) + (u > 0.08 && u < 0.95 ? 0.025 * Math.pow((u * 9) % 1, 1.6) : 0); pts.push([u, -w]); }
    for (let i = n - 1; i > 0; i--) { const u = i / n; const w = 0.3 * 2.6 * Math.pow(u, 0.6) * Math.pow(1 - u, 1.05); pts.push([u, w]); }
    const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath();
    E.wash(L.paint, p, E.mix('#8DB063', '#3F6A40', tone), { mode: 'over', alpha: 0.95 });
    E.wash(L.paint, p, '#2F5A3A', { alpha: 0.2 * tone });
    L.ink.save(); L.ink.globalCompositeOperation = 'destination-out'; L.ink.fill(p); L.ink.restore();
    const m = new Path2D(); m.moveTo(0.05, 0); m.lineTo(0.9, 0);
    L.paint.save(); L.paint.globalAlpha *= 0.35 * (1 - 0.5 * tone); L.paint.strokeStyle = '#EEF4DE'; L.paint.lineWidth = 0.022; L.paint.stroke(m); L.paint.restore();
    if (seed % 4 === 0) E.pencil(L.ink, p, { w: 0.8 / s, a: 0.2, seed, jitter: 0.6 / s });
    E.restore(L);
  }
  function bush(L, lt) {
    E.wash(L.paint, E.blob(BUSH.cx, 1126, 150, { rx: 168, ry: 16, seed: 31, irr: 0.08 }), '#5F7448', { alpha: 0.32, soft: 10 });
    // canes at the foot, the dark inner mass
    for (const dx of [-14, -4, 8, 18]) {
      const p = E.smoothPath([[BUSH.cx + dx * 0.5, 1128], [BUSH.cx + dx, 1090], [BUSH.cx + dx * 2.2, 1050]], false);
      L.paint.save(); L.paint.globalCompositeOperation = 'multiply'; L.paint.strokeStyle = '#5E6A3E'; L.paint.lineWidth = 3; L.paint.lineCap = 'round'; L.paint.stroke(p); L.paint.restore();
    }
    E.wash(L.paint, BUSH.mass, '#4C7746', { mode: 'over', alpha: 0.95 });
    E.wash(L.paint, BUSH.mass, '#2E5034', { alpha: 0.35, grad: { from: [0, 880], to: [0, 1130], stops: [[0, 'rgba(46,80,52,0)'], [1, 'rgba(46,80,52,1)']] } });
    L.ink.save(); L.ink.globalCompositeOperation = 'destination-out'; L.ink.fill(BUSH.mass); L.ink.restore();
    for (const lf of BUSH.leaves) leaflet(L, lf.x, lf.y, lf.s, lf.rot, lf.tone, lt, lf.seed);
    for (const r of BUSH.roses) A().roseHead(L, r.x, r.y, r.r, { open: r.open, seed: r.seed, rot: r.rot });
  }

  /** butterfly flight: fluttering loops around an anchor, wings beating */
  function flyPose(lt, i, ax, ay, k, rad = 26) {
    const ph = i * 1.9;
    const x = ax + rad * Math.sin(lt * 1.7 + ph) * k + rad * 0.4 * Math.sin(lt * 3.1 + ph) * k;
    const y = ay - rad * 0.8 * k - rad * 0.6 * Math.sin(lt * 2.3 + ph * 1.3) * k;
    const vx = Math.cos(lt * 1.7 + ph);
    return { x, y, flap: lerp(0.35 + 0.25 * Math.sin(lt * 1.4 + ph), 0.2 + 0.8 * Math.abs(Math.cos(lt * 15 + ph)), k), rot: lerp(0.3, 0.35 * vx, k) };
  }

  // ---------------------------------------------------------------- the shot
  E.scene('s10', {
    draw(L, lt, t, shot) {
      const T = times(shot);
      const cam = camAt(lt, T);
      const R = reach(T);
      const life = (rt, d = 0.7) => ep(lt, rt, rt + d, 'outCubic');
      const C = cut();

      // ---- far: sky, clouds (slight parallax)
      sky(L, lt);
      E.camera(L, camD(cam, 0.6));
      skyBlooms(L, lt);
      // ---- land
      E.camera(L, camD(cam, 0.95));
      PR().ground(L, HZ, { palette: 'garden', t: lt + 40, seed: 7, flowers: 0.55, trees: 0.65, x0: -300, x1: 1400, bottom: 2300 });
      E.camera(L, cam);
      PR().tree(L, 1000, 842, 210, { kind: 'cypress', t: lt, seed: 6, shadow: 0.4 });
      PR().tree(L, 70, 852, 150, { kind: 'round', t: lt, seed: 8, shadow: 0.4 });
      PR().tree(L, FAR_TREE.x, FAR_TREE.y, FAR_TREE.h, { kind: 'round', t: lt, seed: 9, shadow: 0.5, color: '#7FA45E' });
      stream(L, lt);
      reeds(L, lt, 578, 918, 34, 3); reeds(L, lt, 352, 992, 40, 4); reeds(L, lt, 668, 840, 22, 5);
      // flowers on the banks: buds until the colour reaches them, then they open
      FLOWERS.forEach((f, i) => {
        const k = life(R.flowers[i], 0.8);
        PR().flower(L, f.x, f.y, f.s * (0.92 + 0.08 * k), { kind: f.k, t: lt + i, color: f.c, bloom: lerp(0.28, 1, k), seed: f.seed });
      });
      // the great blossom tree; petals drift once it comes to life
      PR().tree(L, TREE.x, TREE.y, TREE.h, { kind: 'blossom', t: lt, seed: 4, shadow: 0.6 });
      // songbirds perched in it
      BIRDS.forEach((b, i) => {
        const k = ep(lt, R.birds[i] + 0.08, R.birds[i] + 1.5, 'inOutSine');
        if (k <= 0) { A().bird(L, b.x, b.y, b.s, { facing: b.f }); return; }
        const fx = b.x + b.dx * 260 * k + 30 * Math.sin(k * 3), fy = b.y - 330 * k - 60 * Math.sin(k * PI);
        A().bird(L, fx, fy, b.s * (1 - 0.15 * k), { facing: b.dx, fly: Math.min(1, k * 6), flap: lt * 21 + i, rot: -0.25 * b.dx * Math.min(1, k * 4) });
      });
      // the rose bush in the foreground (the match-cut rose crowns it)
      bush(L, lt);
      // butterflies resting on the flowers rise when the colour reaches them
      FLIES.forEach((b, i) => {
        const f = FLOWERS[b.fl];
        const k = ep(lt, R.flowers[b.fl] + 0.2, R.flowers[b.fl] + 0.9, 'inOutSine');
        const q = flyPose(lt, i, f.x, f.y - f.s * 0.92, k, 34);
        A().butterfly(L, q.x, q.y, b.s, { flap: q.flap, rot: q.rot, t: lt });
      });

      // ---- the unpainted world: everything the colour has not yet reached is a pale pencil sketch
      unpainted(L, lt, T, cam);
      // the rose of the match cut: already seen in full colour (the colour flows out from it)
      A().roseStudy(L, ROSE.x, ROSE.y, ROSE.r, { p: 1, open: 1, rot: C.rose.rot, t: lt });

      // ---- the s09 butterfly: rests by the rose, then flutters off with the heart and away over the meadow
      {
        const c0 = camAt(0, T);
        const w0 = toWorld(c0, C.fly.x, C.fly.y);
        const k = ep(lt, T.go0 + 0.08, T.go0 + 0.7, 'inOutSine');
        const H = heartAt(lt, T).pos;
        const tx = lerp(w0[0], H[0] + 30 + 40 * Math.sin(lt * 1.1), ep(lt, T.go0 + 0.1, T.go1, 'inOutSine'));
        const ty = lerp(w0[1], H[1] - 46 + 18 * Math.sin(lt * 1.9), ep(lt, T.go0 + 0.1, T.go1, 'inOutSine'));
        const flap = lerp(C.fly.flap, 0.2 + 0.8 * Math.abs(Math.cos(lt * 15)), k);
        const s = C.fly.s / Z0() * lerp(1, 0.82, k);
        A().butterfly(L, tx + 8 * Math.sin(lt * 3.3) * k, ty + 6 * Math.sin(lt * 4.1) * k, s, { flap, rot: lerp(C.fly.rot, 0.25 * Math.sin(lt * 1.7), k), t: lt });
      }
      // drifting blossom petals from the great tree once it has come to life
      {
        const k = life(R.tree, 1.0);
        if (k > 0) {
          const r = E.rng(55);
          for (let i = 0; i < 14; i++) {
            const t0 = r() * 2, x0 = TREE.x - 160 + r() * 300, y0 = TREE.y - TREE.h * (0.55 + 0.3 * r());
            const u = ((lt - R.tree + t0) % 2.4) / 2.4;
            const x = x0 - 70 * u + 14 * Math.sin(lt * 2 + i), y = y0 + 220 * u;
            const a = k * Math.sin(PI * u) * 0.85;
            E.wash(L.paint, E.blob(x, y, 4.5, { seed: i, irr: 0.3, rx: 5, ry: 3, rot: lt * 2 + i }), '#F2BFC8', { mode: 'over', alpha: a });
          }
        }
      }

      // ---- the heart-light (screen size stays readable while the camera widens)
      const H = heartAt(lt, T);
      const rS = lerp(C.heart.r, 34, ep(lt, T.zoom0, T.zoom1, 'inOutSine'));
      const r = rS / cam.zoom;
      // its soft wake (paint, not light): a faint rose tint along the path just travelled
      {
        const pts = [];
        for (let i = 0; i <= 16; i++) pts.push(heartAt(Math.max(T.go0, lt - 0.42 * (1 - i / 16)), T).pos);
        if (Math.hypot(pts[16][0] - pts[0][0], pts[16][1] - pts[0][1]) > 3) {
          for (let i = 0; i < 16; i++) { const f = (i + 1) / 16; E.glow(L.light, pts[i][0], pts[i][1], r * (0.4 + 0.8 * f), '#FFD9C9', 0.32 * f * f); }
        }
      }
      E.glow(L.light, H.pos[0], H.pos[1], r * 4.2, '#FFC6BE', 0.32);
      PR().heartLight(L, H.pos[0], H.pos[1], r, { t: C.heart.clock + lt, glow: 0.92, rot: H.rot });
    },

    sfx(shot) {
      const T = times(shot), g = (x) => x + shot.start;
      return [
        { t: g(T.on - 0.08), type: 'swell', gain: 0.16, dur: 1.2 },
        { t: g(T.ci - 0.05), type: 'grow', gain: 0.14, dur: 2.2 },
        { t: g(T.in + 0.1), type: 'chime', gain: 0.1, pitch: 1.4 },
        { t: g(T.ed + 0.2), type: 'bloom', gain: 0.12 },
      ];
    },
  });
})();
