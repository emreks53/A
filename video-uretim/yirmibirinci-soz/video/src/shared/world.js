// world.js — the SHARED WORLD of the film: every asset the storyboard marks "both (shared: build once)",
// the camera of the whole film, and the layer stack with the slots the acts draw into.
//
//   const W = await makeWorld(E)
//   W.layout  W.man  W.wall  W.cam(t)  W.toScreen(x, y, t, parallax)  W.withPlane(ctx, t, parallax, fn)
//   W.state(t)                         every shared state as numbers (ring strength, sun state, mound lit …)
//   W.draw(ctx, t, { pose, slots })    the whole shared picture for absolute time t, slots called in place
//                                      (slots: back*, sky, far, mid, hands, front, top — * = optional extension)
//
// Everything is a pure function of ABSOLUTE video time. All numbers come from layout.js (storyboard.json);
// the state timeline is storyboard §5 "State timeline of every shared asset, 0–24 s" (layout.T).
// Read WORLD.md for the act-facing description.

import { loadLayout } from './layout.js';
import { makeMan } from './man.js';

export async function makeWorld(E) {
  const L = await loadLayout(E);
  const man = await makeMan(E);                         // src/shared/man.js (MAN.md)
  const { T, W: FW, H: FH } = L;
  const P = L.pal;
  const { clamp, lerp, smoothstep: ss, tone } = E;
  const once = (key, make) => E.once('world/' + key, make);

  // The camera goes in to 1.5x on the subject plane (CLOSE). The big soft ground masses are baked
  // at this oversampling so their sponge grain stays crisp there (same painting, more pixels).
  const HI = 1.5;

  const planeOf = (prefix) => {
    const l = L.layout.layers_back_to_front.find((e) => e.layer.startsWith(prefix));
    if (!l) throw new Error(`world: storyboard layer "${prefix}…" not found`);
    return l.parallax;
  };
  const PLANE = {
    sky: planeOf('sky dabs'), cloud: L.cloud.parallax, far: planeOf('true-future surround'),
    ridge: L.ridge.parallax, mist: L.mist.parallax, specks: L.motion.specks.parallax,
  };

  // ------------------------------------------------------------------ camera
  let camT = NaN, camV = null;
  const cam = (t) => {
    if (t !== camT) { camT = t; camV = L.cam(t); }
    return camV;
  };
  const toScreen = (x, y, t, parallax = 1) => E.worldToFrame(cam(t), parallax, x, y);
  const withPlane = (ctx, t, parallax, fn) => E.withCamera(ctx, cam(t), parallax, fn);

  // ------------------------------------------------------------------ helpers
  /**
   * Soft sponge region given in LAYER coordinates: box [x0, y0, x1, y1], depth(x, y) -> 0..1 inside
   * the shape, layers with maskFn / shadeFn in the same coordinates. k > 1 bakes it oversampled.
   * -> { painted, box, draw(ctx, opts) }   (draws at its own place: call inside the plane transform)
   */
  function field({ box, depth, layers, seed, edge = 0.5, reveal = {}, k = 1 }) {
    const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0;
    const spec = {
      w, h, seed, edgeSoftness: edge, anchor: [0, 0], reveal,
      shapeFn: (x, y) => depth(x + x0, y + y0),
      layers: layers.map((l) => ({
        ...l,
        maskFn: l.maskFn ? (x, y) => l.maskFn(x + x0, y + y0) : undefined,
        shadeFn: l.shadeFn ? (x, y) => l.shadeFn(x + x0, y + y0) : undefined,
      })),
    };
    let painted;
    if (k > 1) {
      const c = E.clusterDabs(spec);
      const s = E.surface(c.w, c.h, E.res * k);
      E.paintLayered(s, c.dabs, c.dabs.meta);
      painted = E.Painted.fromSurface(s, { ax: 0, ay: 0, w: c.w, h: c.h, seed, steps: reveal.steps ?? 4, reveal });
    } else painted = E.makeCluster(spec);
    return { painted, box, draw: (ctx, o) => painted.draw(ctx, x0, y0, o) };
  }
  /**
   * Make a ground mass opaque: its base colour is laid flat UNDER the dabs from the row topFn(x)
   * down (the engine does the same for stencils with a base). The edge of the flat lies where the
   * dabs are already dense, so only the sponge fringe above it stays open.
   */
  function backfill(f, color, topFn) {
    const [x0, y0, x1, y1] = f.box, c = f.painted.final.ctx;
    c.save();
    c.translate(-x0, -y0);
    c.globalCompositeOperation = 'destination-over';
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x0 - 2, y1 + 2);
    for (let x = x0 - 2; x <= x1 + 2; x += 4) c.lineTo(x, topFn(x));
    c.lineTo(x1 + 2, y1 + 2);
    c.closePath();
    c.fill();
    c.restore();
    return f;
  }
  /** Lowest LAYER y of a plane that can ever be seen above the solid part of the far ridge. */
  const ridgeCover = (par) => {
    let y = -Infinity;
    for (const c of L.camKeys) {
      for (let sx = 0; sx <= FW; sx += 54) {
        const [rx] = L.toWorld(c, sx, 0, PLANE.ridge);
        const [, sy] = L.toScreen(c, rx, L.crest(rx) + 44, PLANE.ridge);
        y = Math.max(y, L.toWorld(c, sx, sy, par)[1]);
      }
    }
    return Math.ceil(y + 36);
  };
  const R1 = L.visibleRect(1, 26);                       // everything of the subject plane that can be on screen
  const groundY = Math.min(ridgeCover(1), L.lipY + 40);   // plane-1 things behind ridge + hedge may stop here

  // ------------------------------------------------------------------ wall + sky
  const wall = once('wall', () => E.makeWall({ w: FW, h: FH, seed: 291 }));

  const rSky = L.visibleRect(PLANE.sky, 26);
  const skyBox = [rSky[0], rSky[1], rSky[2], ridgeCover(PLANE.sky)];
  // The sky is COMPOSED, not scattered: an own layered bake over the engine's sponge prints (the recipe
  // of E.makeSky — airy light-blue ground, discrete cobalt prints with powdery rims, lavender, real gaps
  // of bare primer bordered by light blue — driven by the maps below instead of noise alone). The maps are
  // written in SKY-LAYER px (parallax 0.15: at HOME = frame px; no framing moves the layer by more than
  // 40 px or scales it by more than 6 %), so what is where is decided here and does not hang on single dabs:
  //   * cobalt in a few MASSES of prints of three sizes, densest at the zenith, with calm passages between;
  //   * a calm light-blue field wherever his head, the deed and the coin palm come to lie (all framings);
  //   * bare primer only where it helps — low at both flanks (the light near the horizon) and two small
  //     openings beside the apex; never near a frame corner, his head or the coin, and not in the two
  //     bands that flank act 2's far light (its deepened surround must not be perforated with cream).
  const skyMap = (() => {
    const wob = (x, y, seed, sc) => (E.fbm2(x / sc, y / sc, seed, 3) - 0.5) * 2;
    /** soft irregular union of ellipses [cx, cy, rx, ry, weight] -> 0..1 */
    const blobs = (list, seed, amt = 0.3, sc = 150) => (x, y) => {
      const n = wob(x, y, seed, sc) * amt;
      let m = 0;
      for (const [cx, cy, rx, ry, w = 1] of list) {
        const v = w * ss(1.06, 0.6, Math.hypot((x - cx) / rx, (y - cy) / ry) + n);
        if (v > m) m = v;
      }
      return m;
    };
    /** 0 inside any disc [x, y, r], 1 well outside */
    const clearOf = (list) => (x, y) => {
      let m = 1;
      for (const [cx, cy, r] of list) m = Math.min(m, ss(r * 0.72, r * 1.08, Math.hypot(x - cx, y - cy)));
      return m;
    };
    // where his head lies on the sky layer in CLOSE / HOME, YARIN / ACT2, DUN, MEDIUM; the deed; the coin palm (MEDIUM)
    const quietDiscs = [[540, 678, 170], [322, 668, 170], [672, 720, 165], [455, 824, 165], [474, 655, 130], [673, 945, 155]];
    const noHalo = clearOf(quietDiscs);
    // the calm light-blue passage behind him (cobalt thins out to a few stray prints)
    const calm = blobs([[500, 742, 350, 250], [600, 1010, 260, 150]], 71, 0.22, 190);
    // cobalt: big masses at the zenith, smaller groups trailing down both sides, a few low strays
    const mass = blobs([
      [105, 135, 230, 185], [470, 95, 190, 120, 0.7], [690, 250, 150, 120, 0.6], [965, 215, 200, 215],
      [300, 420, 150, 88, 0.75], [800, 470, 150, 90, 0.8],
      [62, 560, 120, 140, 0.8], [1028, 620, 120, 150, 0.8],
      [245, 965, 85, 62, 0.62], [872, 1012, 96, 60, 0.62], [1065, 930, 70, 90, 0.5],
    ], 72, 0.36, 140);
    // bare primer: deliberate islands …
    const islands = blobs([
      [172, 862, 74, 50], [108, 792, 44, 34, 0.9], [232, 800, 30, 24, 0.8],          // low left: one island with two satellites
      [902, 748, 70, 48], [968, 690, 40, 30, 0.9], [842, 800, 30, 22, 0.8],          // low right
      [232, 262, 52, 38, 0.9], [846, 214, 54, 40, 0.9],                              // two small openings beside the apex
    ], 73, 0.34, 80);
    // … and zones where the ground is printed thinner, so the wall breathes through in patches
    const thinZone = blobs([[130, 800, 200, 300, 1], [890, 800, 150, 260, 1], [150, 470, 130, 110, 0.6], [900, 500, 110, 100, 0.6]], 74, 0.25, 170);
    const thinPatch = E.patchFn({ scale: 150, amount: 0.66, sharp: 0.55, seed: 7411 });
    const edgeBands = (x) => ss(1000, 1040, x) + ss(650, 610, x) * ss(470, 505, x);          // act 2's surround bands
    const corners = (x, y) => ss(250, 150, y) * (ss(250, 170, x) + ss(850, 930, x));
    const gapOK = (x, y) => noHalo(x, y) * (1 - clamp(edgeBands(x))) * (1 - clamp(corners(x, y))) * (1 - calm(x, y));
    const gap = (x, y) => Math.max(islands(x, y), 0.8 * thinZone(x, y) * thinPatch(x, y)) * gapOK(x, y);
    const near = (r) => (x, y) => Math.max(gap(x, y), gap(x - r, y), gap(x + r, y), gap(x, y - r), gap(x, y + r));
    const g1 = near(28), g2 = near(68);
    const cobalt = (x, y) => clamp(Math.max(mass(x, y), 0.07)) * (1 - 0.9 * calm(x, y)) * (1 - g2(x, y));
    // the rim of a gap: where the smaller, powdery prints of the ground tones break its outline
    const gapRim = (x, y) => ss(0.04, 0.4, g1(x, y)) * (1 - 0.75 * ss(0.55, 0.95, gap(x, y)));
    return { mass, calm, gap, gapRim, thin: thinZone, open1: (x, y) => 1 - g1(x, y), open2: (x, y) => 1 - g2(x, y), cobalt, zenith: (y) => ss(620, 180, y), low: (y) => ss(640, 1040, y) };
  })();
  const sky = once('sky', () => {
    const [bx, by] = skyBox, M = skyMap;
    const at = (fn) => (x, y) => fn(x + bx, y + by);
    const cob = at(M.cobalt), open1 = at(M.open1), open2 = at(M.open2);
    const core = (x, y) => { const m = M.mass(x + bx, y + by); return cob(x, y) * ss(0.45, 0.9, m); };          // big prints: the heart of a mass
    const rimOf = (x, y) => { const m = M.mass(x + bx, y + by); return cob(x, y) * (1 - 0.55 * ss(0.5, 1, m)); };  // small prints: fringes, strays
    const A = { scale: 380, amount: 0.34, sharp: 0.3, seed: 1405 };          // one patch map: the prints of all sizes gather in the same groups
    const lblue = P('sky_light_blue'), cobaltC = P('sky_cobalt'), rim = '#6CA6D4';
    const print = (size, cov, maskFn, amount) => [
      { color: rim, coverage: cov * 0.62, size: size * 1.12, sizeJitter: 0.18, tint: 0.035, stamps: 'open', even: true, pores: 0.15, poreScale: 0.6, maskFn: (x, y) => 0.45 * maskFn(x, y), patch: { ...A, amount: amount + 0.06 } },
      { color: cobaltC, coverage: cov, size, sizeJitter: 0.22, tint: 0.045, stamps: 'body', even: true, pores: size > 80 ? 0.34 : 0.15, poreScale: 0.7, maskFn: (x, y) => 0.95 * maskFn(x, y), patch: { ...A, amount } },
    ];
    return E.makeSpongeTexture({
      w: skyBox[2] - bx, h: skyBox[3] - by, seed: 14,
      layers: [
        // the ground: light blue, a paler tone toward the horizon, a deeper one up in the zenith
        { color: lblue, coverage: 0.95, size: 150, tint: 0.03, pores: 0.15, poreScale: 0.6, maskFn: open1 },
        { color: '#97CEE4', coverage: 0.46, size: 124, tint: 0.025, stamps: 'open', pores: 0.15, poreScale: 0.6, maskFn: open1, patch: { scale: 250, amount: 0.5, seed: 1409 } },
        { color: '#A6D6E8', coverage: 0.4, size: 132, tint: 0.02, stamps: 'open', pores: 0.15, poreScale: 0.6, maskFn: (x, y) => M.low(y + by) * open1(x, y), patch: { scale: 280, amount: 0.46, seed: 1410 } },
        { color: '#72B4D6', coverage: 0.44, size: 136, tint: 0.03, stamps: 'body', pores: 0.15, poreScale: 0.6, maskFn: (x, y) => M.zenith(y + by) * (0.35 + 0.65 * M.mass(x + bx, y + by)) * open1(x, y), patch: { scale: 300, amount: 0.44, seed: 1411 } },
        // the outline of every gap is broken by small prints and a powdery stipple of the ground tones
        { color: '#97CEE4', coverage: 0.5, size: 58, stamps: 'open', pores: 0.3, maskFn: at(M.gapRim) },
        { color: lblue, coverage: 0.36, size: 44, stamps: 'soft', maskFn: at(M.gapRim) },
        { color: '#A6D6E8', coverage: 0.12, size: 70, stamps: 'speck', maskFn: (x, y) => ss(0.3, 0.9, M.gap(x + bx, y + by)) },
        // cobalt: a powdery spray of the rim tone, then the discrete prints in three sizes, then their own stipple
        { color: rim, coverage: 0.17, size: 110, stamps: 'speck', maskFn: cob, patch: A },
        ...print(150, 0.5, core, 0.3),
        ...print(102, 0.56, cob, 0.36),
        ...print(62, 0.34, rimOf, 0.44),
        { color: cobaltC, coverage: 0.12, size: 100, stamps: 'speck', maskFn: cob, patch: { ...A, amount: 0.4 } },
        // lavender: a few powdery dabs inside the masses
        { color: P('sky_lavender'), coverage: 0.23, size: 112, stamps: 'airy', pores: 0, maskFn: (x, y) => (0.12 + 0.88 * M.mass(x + bx, y + by)) * (0.3 + 0.7 * M.zenith(y + by)) * (1 - M.calm(x + bx, y + by)) * open2(x, y), patch: { scale: 300, amount: 0.78, sharp: 0.5, seed: 1412 } },
        { color: P('sky_lavender'), coverage: 0.08, size: 100, stamps: 'speck', maskFn: (x, y) => (0.12 + 0.88 * M.mass(x + bx, y + by)) * (0.3 + 0.7 * M.zenith(y + by)) * (1 - M.calm(x + bx, y + by)) * open2(x, y), patch: { scale: 300, amount: 0.7, sharp: 0.4, seed: 1412 } },
        // a few small flecks of primer on the light blue (never in the calm passage)
        { color: P('primer'), coverage: 0.07, size: 66, stamps: 'soft', tint: 0.01, pores: 0, maskFn: (x, y) => (1 - 0.85 * M.calm(x + bx, y + by)) * (0.2 + 0.8 * M.thin(x + bx, y + by)), patch: { scale: 230, amount: 0.7, sharp: 0.4, seed: 1413 } },
      ],
    });
  });

  // Cloud c1 (storyboard: 250 x 80, centre (30 + 3 t, 10) on plane 0.3) is baked but NOT SHOWN. Its track keeps
  // it in the extreme top-left corner on purpose (anywhere else it would sit on the dial in ACT2), and so
  // in every framing only a fragment of it is in the frame, cut by the corner: it read as a hole in the
  // sky (review, 19.20), never as a cloud. No other track on that plane works for all framings (checked
  // against every frame of the camera path: fully visible at HOME means cut by the corner in YARIN, or on
  // top of the dial's beads at the end of the push). Set SHOW_CLOUD_C1 to bring it back as the storyboard has it.
  const SHOW_CLOUD_C1 = false;
  const cloud = once('cloud', () => E.makeCloud({ w: L.cloud.w, h: L.cloud.h, seed: 6 }));

  // ------------------------------------------------------------------ zone tints (plane 1.0)
  const Z = L.zones;
  // dusk: left third, soft toward the centre and toward the day sky above
  const duskEdge = (y) => Z.dusk.soft_edge_to_x - 22 + 24 * Math.sin(y / 170 + 0.6) + 10 * Math.sin(y / 61);
  const duskTop = (x) => Z.dusk.world_y[0] - 30 + 34 * Math.sin(x / 150 + 1.1) + 12 * Math.sin(x / 47);
  const duskDepth = (x, y) => clamp(Math.min((duskEdge(y) + 22 - x) / 120, (y - duskTop(x)) / 170));
  const duskBox = [R1[0] - 14, Z.dusk.world_y[0] - 90, Z.dusk.soft_edge_to_x + 40, groundY];
  const lowDepth = (top) => (x, y) => clamp(Math.min((duskEdge(y) + 10 - x) / 130, (y - top - 40 * Math.sin(x / 120 + 2)) / 190));
  const dusk = once('dusk', () => ({
    // 1.27 — a first faint peach glow, low
    sunset0: field({ box: duskBox, depth: lowDepth(830), seed: 301, edge: 0.6, layers: [
      { color: P('yesterday_light'), coverage: 0.5, size: 130, stamps: 'open', patch: { scale: 240, amount: 0.4 } },
      { color: '#F7DDB5', coverage: 0.34, size: 96, stamps: 'soft' },
      { color: P('flower_pink'), coverage: 0.14, size: 90, stamps: 'soft', patch: { scale: 200, amount: 0.6 } },
    ] }),
    // 2.63 — sunset: deep orange at the ridge, peach above, pink highest
    sunset1: field({ box: duskBox, depth: lowDepth(430), seed: 302, edge: 0.55, layers: [
      { color: P('flower_pink'), coverage: 0.66, size: 136, stamps: 'any', pores: 0.3, maskFn: (x, y) => ss(1000, 700, y), patch: { scale: 280, amount: 0.3 } },
      { color: P('yesterday_light'), coverage: 0.8, size: 128, stamps: 'any', pores: 0.3, maskFn: (x, y) => ss(560, 800, y), patch: { scale: 270, amount: 0.24 } },
      { color: '#F6B96A', coverage: 0.6, size: 110, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(780, 960, y), patch: { scale: 230, amount: 0.34 } },
      { color: P('yesterday_mid'), coverage: 0.66, size: 100, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(900, 1060, y), patch: { scale: 210, amount: 0.34 } },
      { color: '#E8843A', coverage: 0.6, size: 84, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(1010, 1120, y), patch: { scale: 180, amount: 0.38 } },
      { color: '#FBE3B8', coverage: 0.22, size: 64, stamps: 'soft', maskFn: (x, y) => ss(620, 900, y) },
    ] }),
    // 4.13 — dusk pass 1: lavender
    dusk1: field({ box: duskBox, depth: duskDepth, seed: 303, edge: 0.55, layers: [
      { color: P('dusk', 0), coverage: 0.78, size: 146, tint: 0.04, pores: 0.3, patch: { scale: 300, amount: 0.22, sharp: 0.4 } },
      { color: P('cloud_under_dab'), coverage: 0.3, size: 110, stamps: 'open', patch: { scale: 240, amount: 0.55 } },
    ] }),
    // 4.27 — dusk pass 2: violet-blue with cobalt (thinner toward the ridge: a rest of rose stays there)
    dusk2: field({ box: duskBox, depth: duskDepth, seed: 304, edge: 0.6, layers: [
      { color: P('dusk', 1), coverage: 0.66, size: 132, tint: 0.05, pores: 0.3, maskFn: (x, y) => lerp(1, 0.3, ss(880, 1110, y)), patch: { scale: 280, amount: 0.34, sharp: 0.35 } },
      { color: P('dusk', 2), coverage: 0.42, size: 104, sizeJitter: 0.18, stamps: 'dense', even: true, pores: 0.3, maskFn: (x, y) => ss(980, 620, y), patch: { scale: 360, amount: 0.42, sharp: 0.3 } },
      { color: P('primer'), coverage: 0.1, size: 80, stamps: 'soft', patch: { scale: 220, amount: 0.6 } },
    ] }),
    // 10.73 / 10.87 — the side recedes: duskier
    recede: [
      field({ box: duskBox, depth: duskDepth, seed: 305, edge: 0.6, layers: [
        { color: '#6F69AE', coverage: 0.42, size: 126, stamps: 'open', patch: { scale: 260, amount: 0.4 } },
      ] }),
      field({ box: duskBox, depth: duskDepth, seed: 306, edge: 0.6, layers: [
        { color: '#615C9F', coverage: 0.34, size: 112, stamps: 'open', patch: { scale: 240, amount: 0.45 } },
        { color: P('hour_annulus', 1), coverage: 0.16, size: 96, stamps: 'body', maskFn: (x, y) => ss(900, 560, y), patch: { scale: 300, amount: 0.6 } },
      ] }),
    ],
  }));

  // pre-dawn: right third, pale lavender / white / pink
  const dawnEdge = (y) => Z.predawn.soft_edge_from_x + 22 * Math.sin(y / 150 + 2.2) + 9 * Math.sin(y / 53);
  const dawnTop = (x) => Z.predawn.world_y[0] - 40 + 36 * Math.sin(x / 160 + 0.3) + 12 * Math.sin(x / 51);
  const dawnDepth = (x, y) => clamp(Math.min((x - dawnEdge(y)) / 130, (y - dawnTop(x)) / 180));
  const dawnBox = [Z.predawn.soft_edge_from_x - 50, Z.predawn.world_y[0] - 110, R1[2] + 14, groundY];
  const washLayers = {
    a: [
      { color: P('predawn', 0), coverage: 0.74, size: 150, tint: 0.03, pores: 0.3, patch: { scale: 300, amount: 0.24, sharp: 0.4 } },
      { color: P('mist', 1), coverage: 0.3, size: 116, stamps: 'open', patch: { scale: 260, amount: 0.55 } },
    ],
    b: [
      { color: P('predawn', 1), coverage: 0.5, size: 128, stamps: 'open', maskFn: (x, y) => ss(640, 900, y), patch: { scale: 250, amount: 0.38 } },
      { color: P('mist', 2), coverage: 0.42, size: 112, stamps: 'open', patch: { scale: 230, amount: 0.5 } },
      { color: P('primer'), coverage: 0.08, size: 80, stamps: 'soft' },
    ],
    r1: [{ color: P('mist', 0), coverage: 0.4, size: 124, stamps: 'open', patch: { scale: 250, amount: 0.42 } }],
    r2: [{ color: P('mist', 2), coverage: 0.3, size: 104, stamps: 'soft', patch: { scale: 220, amount: 0.45 } }],
  };
  const wash = once('wash', () => {
    const mk = (layers, seed) => field({ box: dawnBox, depth: dawnDepth, seed, edge: 0.6, layers });
    const o = { build: [mk(washLayers.a, 311), mk(washLayers.b, 312)], recede: [mk(washLayers.r1, 313), mk(washLayers.r2, 314)] };
    // the state that cross-dabs out 16.63–16.83, as one print leaving from the ground up
    o.final = E.bakeSprite({
      bounds: dawnBox, anchor: [dawnBox[0], dawnBox[1]], seed: 315, steps: T.mist.out.length, dabSize: 150,
      reveal: { order: 'sweep', angle: Math.PI / 2, jitter: 0.22 },
      draw: (c) => { for (const f of [...o.build, ...o.recede]) f.draw(c); },
    });
    return o;
  });

  // ------------------------------------------------------------------ mist bank (parallax 0.7)
  const MB = L.mist.box;
  const rMist = L.visibleRect(PLANE.mist, 26);
  const mistBox = [MB.x0 - 30, MB.y0 - 40, Math.min(MB.x1, rMist[2] + 60), MB.y1 + 10];
  const mistTop = (x) => lerp(MB.y0 + 258, MB.y0 + 22, ss(MB.x0 + 236, MB.x0 + 440, x)) + 12 * Math.sin(x / 88 + 1) + 6 * Math.sin(x / 35);
  const mistDepth = (rise = 0, soft = 110) => (x, y) => clamp(Math.min((y - mistTop(x) + rise) / soft, (x - MB.x0 + 10) / 120));
  const MIST_REF = T.mist.thicken[1];                    // the bank sits on its storyboard bbox while the ring is veiled
  const mistDx = (t) => L.motion.mistSpeed * (t - MIST_REF);
  const mist = once('mist', () => {
    const mk = (depth, layers, seed, edge = 0.6) => field({ box: mistBox, depth, seed, edge, layers });
    const bump = (x) => ss(MB.x0 - 30, MB.x0 + 70, x) * ss(MB.x0 + 400, MB.x0 + 290, x);   // over the ring (it sits at layer x 850–925)
    const over = (k) => (x, y) => {
      const top = mistTop(x) - (34 + 30 * k) * bump(x);
      return clamp(Math.min((y - top) / 60, (top + 170 - y) / 90)) * bump(x);
    };
    const o = {
      build: [
        // 4.50 — the body: lavender under-dab, pale body
        mk(mistDepth(-30, 110), [
          { color: P('mist', 1), coverage: 0.9, size: 120, tint: 0.03, opacity: [0.8, 1], pores: 0.3 },
          { color: '#BDB4DC', coverage: 0.3, size: 90, stamps: 'open', opacity: [0.5, 0.8], patch: { scale: 200, amount: 0.5 } },
          { color: P('mist', 0), coverage: 0.6, size: 104, stamps: 'body', tint: 0.02, opacity: [0.8, 1], pores: 0.4, patch: { scale: 230, amount: 0.32 } },
        ], 321),
        // 4.67 — the white puffs on top
        mk((x, y) => { const d = mistDepth(0, 90)(x, y); return d * ss(170, 60, y - mistTop(x)); }, [
          { color: P('mist', 0), coverage: 0.6, size: 96, stamps: 'open', opacity: [0.7, 0.95] },
          { color: P('mist', 2), coverage: 0.66, size: 84, stamps: 'body', tint: 0.012, opacity: [0.85, 1], pores: 0.3, patch: { scale: 190, amount: 0.34 } },
          { color: '#FFFFFF', coverage: 0.3, size: 50, stamps: 'speck', tints: 1, opacity: [0.7, 1] },
        ], 322, 0.7),
      ],
      // 7.00 / 7.07 / 7.17 — it thickens over the ring (about 60 px higher)
      thick: [0, 1, 2].map((k) => mk(over(k), [
        { color: P('mist', 1), coverage: 0.3, size: 96, stamps: 'soft', opacity: [0.5, 0.8] },
        { color: P('mist', k === 1 ? 0 : 2), coverage: 0.6, size: 98, stamps: 'open', opacity: [0.7, 0.95], pores: 0.3 },
        { color: '#FFFFFF', coverage: 0.2, size: 54, stamps: 'speck', tints: 1, opacity: [0.7, 1] },
      ], 323 + k, 0.7)),
      // 10.73 / 10.87 — mistier
      recede: [0, 1].map((k) => mk(mistDepth(10 + 14 * k, 100), [
        { color: P('mist', k ? 2 : 0), coverage: 0.36, size: 110 - 14 * k, stamps: 'open', opacity: [0.6, 0.9], patch: { scale: 220, amount: 0.45 } },
      ], 327 + k, 0.7)),
    };
    // the thinned state (16.47) as one print that cross-dabs out from the ground up 16.63 / 16.73 / 16.83
    o.final = E.bakeSprite({
      bounds: mistBox, anchor: [mistBox[0], mistBox[1]], seed: 329, steps: T.mist.out.length, dabSize: 130,
      reveal: { order: 'sweep', angle: Math.PI / 2, jitter: 0.22 },
      draw: (c) => { for (const f of [...o.build, o.thick[0], ...o.recede]) f.draw(c); },
    });
    return o;
  });

  // ------------------------------------------------------------------ far ridge (parallax 0.5)
  const rRidge = L.visibleRect(PLANE.ridge, 26);
  const ridgeBox = [rRidge[0] - 10, L.ridge.crestY - 70, rRidge[2] + 10, L.ridge.bottom];
  const under = (x, y) => y - L.crest(x);                 // px below the crest line
  // Two ranges of hills in three tone passes (light from the upper right): the far range keeps the crest
  // of the storyboard — pale lavender, ivory where its slopes face the light —, a nearer, deeper
  // lavender range rises in front of it (its own soft crest 30–60 px lower), and their feet sink into a
  // cooler shade. The top edge is a sponge fringe of uneven height: it never ends LOWER than before
  // (13 px above the crest line; solid from crest + 20 down, exactly as before — yesterday's sun sets
  // behind it), but lifts by up to 12 px where the prints gather.
  const lift = (x) => 12 * ss(0.5, 0.74, E.fbm2(x / 150, 3.7, 3311, 3));
  const slope = (x) => (18 / 310) * Math.cos(x / 310 + 1.2) + (8 / 97) * Math.cos(x / 97);    // d crest / dx: > 0 = falling to the right = facing the light
  const facing = (x) => ss(-0.05, 0.07, slope(x));
  const crest2 = (x) => L.crest(x) + 46 + 13 * Math.sin(x / 168 + 0.4) + 6 * Math.sin(x / 59 + 1.3);
  const under2 = (x, y) => y - crest2(x);
  const facing2 = (x) => ss(-0.06, 0.08, (13 / 168) * Math.cos(x / 168 + 0.4) + (6 / 59) * Math.cos(x / 59 + 1.3) + slope(x));
  const ridge = once('ridge', () => backfill(field({
    box: ridgeBox, seed: 331, edge: 0.5,
    depth: (x, y) => clamp((under(x, y) + 13 + lift(x)) / 52),
    layers: [
      // far range: the coat (fine prints at the edge, big ones below)
      { color: P('ridge_lavender'), coverage: 0.985, size: 54, even: true, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(70, 40, under(x, y)) },
      { color: P('ridge_lavender'), coverage: 0.985, size: 120, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(34, 60, under(x, y)) },
      // … its shade (slopes turned away from the light) and its lights (ivory along the crest, strongest on the lit slopes)
      { color: '#A69CCE', coverage: 0.62, size: 66, stamps: 'body', pores: 0.5, maskFn: (x, y) => ss(4, 30, under(x, y)) * lerp(1, 0.25, facing(x)), patch: { scale: 200, amount: 0.34 } },
      { color: '#CDC3DF', coverage: 0.56, size: 56, stamps: 'body', pores: 0.5, maskFn: (x, y) => ss(64, 30, under2(x, y) + 46) * lerp(0.4, 1, facing(x)), patch: { scale: 180, amount: 0.4 } },
      { color: P('ridge_ivory'), coverage: 0.78, size: 44, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(40, 4, under(x, y)) * lerp(0.3, 1, facing(x)), patch: { scale: 150, amount: 0.34, sharp: 0.3 } },
      { color: '#F3ECE2', coverage: 0.44, size: 28, stamps: 'open', maskFn: (x, y) => ss(22, -4, under(x, y)) * lerp(0.25, 1, facing(x)), patch: { scale: 150, amount: 0.46, sharp: 0.3 } },
      { color: '#E9C9D2', coverage: 0.16, size: 34, stamps: 'soft', maskFn: (x, y) => ss(44, 8, under(x, y)), patch: { scale: 170, amount: 0.6 } },
      // nearer range: a deeper lavender coat with a stippled crest of its own …
      { color: '#A398CC', coverage: 0.94, size: 62, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(-12, 12, under2(x, y)) },
      { color: '#A398CC', coverage: 0.4, size: 40, stamps: 'soft', maskFn: (x, y) => ss(-26, -8, under2(x, y)) * ss(8, -6, under2(x, y)) },
      // … its lights on the slopes that face the sun, its shade in the folds and toward the hedge
      { color: '#B9B0D6', coverage: 0.6, size: 52, stamps: 'body', pores: 0.5, maskFn: (x, y) => ss(-8, 6, under2(x, y)) * ss(70, 20, under2(x, y)) * lerp(0.2, 1, facing2(x)), patch: { scale: 170, amount: 0.36 } },
      { color: '#D8CCDD', coverage: 0.4, size: 30, stamps: 'open', maskFn: (x, y) => ss(-10, 2, under2(x, y)) * ss(30, 6, under2(x, y)) * lerp(0.1, 1, facing2(x)), patch: { scale: 150, amount: 0.46, sharp: 0.3 } },
      { color: '#8C83BE', coverage: 0.56, size: 70, stamps: 'body', pores: 0.5, maskFn: (x, y) => ss(10, 70, under2(x, y)) * lerp(1, 0.45, facing2(x)), patch: { scale: 220, amount: 0.36 } },
      { color: '#7C76B4', coverage: 0.3, size: 56, stamps: 'open', maskFn: (x, y) => ss(50, 150, under2(x, y)), patch: { scale: 200, amount: 0.52 } },
      { color: '#9FB4D8', coverage: 0.14, size: 60, stamps: 'soft', maskFn: (x, y) => ss(20, 120, under2(x, y)), patch: { scale: 240, amount: 0.6 } },
      // the wall breathes through, mostly along the far crest
      { color: P('primer'), coverage: 0.1, size: 40, stamps: 'soft', maskFn: (x, y) => ss(90, 20, under(x, y)), patch: { scale: 160, amount: 0.6 } },
    ],
  }), P('ridge_lavender'), (x) => L.crest(x) + 20));

  // ------------------------------------------------------------------ mound (plane 1.0)
  const M = L.mound;
  const moundBox = [M.x0 - 50, M.topY - 40, M.x1 + 50, L.lipY + 44];
  const mUnder = (x, y) => y - M.top(clamp(x, M.x0 - 40, M.x1 + 40));
  const moundDepth = (x, y) => clamp((mUnder(x, y) + 10) / 46);
  const upRight = (x, y) => clamp(0.5 + (x - 540) / 620 - (mUnder(x, y) - 30) / 150);       // 1 = top edge, right side
  const mound = once('mound', () => {
    // Frame 0 shows the BASE coat alone, so it is a painting already: the deep-green coat, its shade
    // (dark prints low and left), a second green on the side of the light, a first touch of the mid green
    // on the crown, the wall breathing through the top fringe. The second coat (0.07) adds the lights.
    const base = [
      { color: P('mound', 0), coverage: 0.985, size: 44, even: true, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(58, 36, mUnder(x, y)) },
      { color: P('mound', 0), coverage: 0.985, size: 96, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(30, 52, mUnder(x, y)) },
      { color: P('hedge_dark'), coverage: 0.5, size: 62, stamps: 'open', pores: 0.3, maskFn: (x, y) => 1 - 0.75 * upRight(x, y), patch: { scale: 150, amount: 0.42 } },
      { color: '#3A8248', coverage: 0.66, size: 58, stamps: 'body', pores: 0.4, maskFn: (x, y) => 0.3 + 0.7 * upRight(x, y), patch: { scale: 150, amount: 0.32, sharp: 0.35 } },
      { color: P('mound', 1), coverage: 0.42, size: 40, stamps: 'open', pores: 0.3, maskFn: (x, y) => ss(0.4, 0.82, upRight(x, y)), patch: { scale: 120, amount: 0.42, sharp: 0.35 } },
      { color: P('primer'), coverage: 0.1, size: 24, stamps: 'soft', maskFn: (x, y) => ss(40, 2, mUnder(x, y)), patch: { scale: 110, amount: 0.5 } },
    ];
    const coat2 = [
      { color: P('hedge_dark'), coverage: 0.3, size: 54, stamps: 'open', patch: { scale: 150, amount: 0.54 } },
      { color: P('mound', 1), coverage: 0.7, size: 56, stamps: 'body', pores: 0.3, maskFn: (x, y) => 0.4 + 0.6 * upRight(x, y), patch: { scale: 150, amount: 0.32, sharp: 0.35 } },
      { color: '#63A94B', coverage: 0.5, size: 40, stamps: 'open', maskFn: (x, y) => ss(0.35, 0.8, upRight(x, y)), patch: { scale: 130, amount: 0.45, sharp: 0.35 } },
      { color: '#7DB854', coverage: 0.2, size: 26, stamps: 'soft', maskFn: (x, y) => ss(0.55, 0.9, upRight(x, y)), patch: { scale: 130, amount: 0.52, sharp: 0.35 } },
      { color: P('hedge_dark'), coverage: 0.16, size: 34, stamps: 'soft', patch: { scale: 120, amount: 0.6 } },
      { color: P('primer'), coverage: 0.07, size: 28, stamps: 'soft', maskFn: (x, y) => ss(70, 10, mUnder(x, y)), patch: { scale: 120, amount: 0.6 } },
    ];
    // LIT (10.07): yellow-green light in chunky clumps, strongest on the crown and the upper right; the pale
    // yellow only as small touches inside the clumps (large pale prints read as holes in the foliage)
    const litX = (x) => ss(M.lit.x[0] - 20, M.lit.x[0] + 60, x) * ss(M.lit.x[1] + 20, M.lit.x[1] - 60, x);
    const litY = (y) => ss(M.lit.y[1], M.lit.y[1] - 26, y);
    const crown = (x, y) => ss(62, 14, mUnder(x, y));
    const CL = { scale: 105, amount: 0.34, sharp: 0.4, seed: 3431 };     // one patch map: the lights gather in the same clumps
    const lit = [
      { color: '#8CC152', coverage: 0.45, size: 46, stamps: 'body', pores: 0.4, maskFn: (x, y) => litX(x) * litY(y), patch: { scale: 130, amount: 0.34 } },
      { color: P('mound_lit', 0), coverage: 0.45, size: 44, stamps: 'body', pores: 0.3, maskFn: (x, y) => litX(x) * litY(y) * ss(0.05, 0.6, upRight(x, y)), patch: { scale: 120, amount: 0.24, sharp: 0.3 } },
      { color: P('mound_lit', 0), coverage: 0.45, size: 34, stamps: 'body', pores: 0.3, maskFn: (x, y) => litX(x) * crown(x, y), patch: CL },
      { color: '#CFE583', coverage: 0.36, size: 22, stamps: 'open', maskFn: (x, y) => litX(x) * crown(x, y) * (0.5 + 0.5 * upRight(x, y)), patch: { ...CL, amount: 0.5 } },
      { color: P('mound_lit', 1), coverage: 0.2, size: 15, stamps: 'soft', maskFn: (x, y) => litX(x) * ss(44, 4, mUnder(x, y)) * (0.4 + 0.6 * upRight(x, y)), patch: { ...CL, amount: 0.62 } },
    ];
    const mk = (layers, seed) => backfill(field({ box: moundBox, depth: moundDepth, seed, edge: 0.5, layers, k: HI }), P('mound', 0), (x) => M.top(clamp(x, M.x0 - 40, M.x1 + 40)) + 16);
    return {
      base: mk(base, 341),
      full: mk([...base, ...coat2], 341),               // same seed: the base coat stays where it was
      lit: field({ box: moundBox, depth: moundDepth, seed: 343, edge: 0.5, layers: lit, k: HI }),
    };
  });

  // ------------------------------------------------------------------ hedge (plane 1.0, in FRONT of the man)
  const CW = L.gloss.calmWorld;
  const hedgeBox = [R1[0] - 12, L.lipY - 46, R1[2] + 12, R1[3] + 8];
  // IN FRONT OF HIS FEET (x 478–626: shoes at rest 488–592, the half-step puts the right one at 582–614)
  // the lip is a low fringe of GRASS: small prints instead of the big ones of the lip elsewhere, so that its
  // height is under control. Its tufts begin between y 1188 and 1195 (uneven, never a ruled line), the
  // prints are dense 4 px lower, and the hedge is SOLID from y 1197.5 down at the latest (elsewhere: from
  // 9 px below the lip line). His soles (y 1203.6; 1207.6 in the dip of the turn) and the lower 6–12 px of
  // both shoes are behind it for every root of the film — a few px of the toe caps / heels stay in
  // sight above the grass —, and the fringe runs unbroken across his feet: nothing is cut out round the legs.
  const FEET = [L.man.shoe_x[0] - 27, L.man.shoe_x[1] + 51];          // 478 … 626
  const FEET_TOP = L.man.foot_y - 10, FEET_SOLID = L.man.foot_y - 2.5;
  const tuft = (x) => ss(FEET[0] - 34, FEET[0] + 2, x) * ss(FEET[1] + 34, FEET[1] - 2, x);
  const lipF = (x) => lerp(L.lip(x), L.man.foot_y + 0.5, tuft(x));     // the hedge's own top line
  const grassTop = (x) => FEET_TOP + 4.5 - 6.5 * ss(0.46, 0.7, E.fbm2(x / 13, 3.1, 4411, 2));    // tufts of uneven height: 1188 … 1194.5
  const solidTop = (x) => lerp(lipF(x) + 9, Math.min(FEET_SOLID, grassTop(x) + 4.5), tuft(x));   // opaque from here down
  const below = (x, y) => y - lipF(x);                   // px below the lip line
  const grass = (x, y) => tuft(x) * ss(FEET_SOLID + 28, FEET_SOLID + 20, y);
  const noBig = (x, y) => 1 - tuft(x) * ss(L.man.foot_y + 16, L.man.foot_y + 8, y);   // no big print centred on his shoes
  const CALM0 = CW.y0 - 4, CALM1 = CW.y1 + 46;           // rows that must stay calm and dark (gloss field + margin)
  // The calm field starts at SCREEN row calmScreen.y0 in every gloss window: the highest WORLD row
  // that can lie on it (YARIN, zoom 1.15) is the floor for everything lighter than hedge_mid.
  let LIGHT_FLOOR = CALM0;
  for (const w of L.gloss.windows) {
    for (let f = L.fr(w.t0); f <= L.fr(w.t1); f++) LIGHT_FLOOR = Math.min(LIGHT_FLOOR, L.toWorld(L.cam(f / L.fps), 0, L.gloss.calmScreen.y0)[1]);
  }
  LIGHT_FLOOR = Math.floor(LIGHT_FLOOR - 1);
  const lightOK = (size) => (x, y) => (y + size * 0.7 <= LIGHT_FLOOR ? 1 : 0);   // a print of this size ends above the floor
  const deco = (y) => ss(CALM1, CALM1 + 70, y);          // the strip under the Shorts caption: decoration allowed
  const hedgeBottom = R1[3];
  // DEPTH of the hedge, inside the tones the gloss field allows (everything below hedge_mid):
  //   * a slow value fall-off: 0 under the lip … 1 at the lower edge, earlier toward the far left and right
  //     (the lighter greens thin out, the dark prints and the blue-green accents gather);
  //   * under the gloss field a NEARER ROW of foliage with a crest of its own (decoration strip only);
  //   * in front of that row the foreground thicket: big dark leaf stencils rising from the lower edge.
  const flank = (x) => ss(0.56, 1, Math.abs(x - 665) / 700);
  const sink = (x, y) => clamp(ss(50, 610, below(x, y)) + 0.35 * flank(x) * ss(180, 560, below(x, y)));
  const nearTop = (x) => CALM1 + 40 + 15 * Math.sin(x / 97 + 0.7) + 8 * Math.sin(x / 37 + 2.1);
  const nearCrest = (lo, hi) => (x, y) => { const d = y - nearTop(x); return ss(-12, 2, d) * ss(hi, lo, d); };
  const hedge = once('hedge', () => {
    const top = (x, y) => ss(104, 56, below(x, y)), deep = (x, y) => ss(40, 92, below(x, y));
    // the lip may be light only ABOVE the calm field: dab centres stay on / above the lip line
    const lipBand = (lo, hi, size) => (x, y) => ss(lo - 6, lo, below(x, y)) * ss(hi + 6, hi, below(x, y)) * (size ? lightOK(size)(x, y) : 1);
    const CLUMP = { scale: 250, amount: 0.44, sharp: 0.45, seed: 3511 };  // foliage clumps: lighter prints inside, shadow pockets between
    const CREST = { scale: 150, amount: 0.36, sharp: 0.4, seed: 3513 };
    const LIPM = { scale: 96, amount: 0.42, sharp: 0.45, seed: 79 };      // the lip's mid green: runs of tufts with real gaps
    // … and no ruled stripe: the band is 4 px deep in places and 22 px in others (slow, irregular)
    const lipDeep = (x) => lerp(-2, 20, ss(0.36, 0.66, E.fbm2(x / 105, 5.1, 4423, 2)));
    const lipRun = (x, y) => { const b = below(x, y); return ss(-18, -12, b) * ss(lipDeep(x) + 8, lipDeep(x), b); };
    // BASE coat (frames 0–1 show it alone — it is a painting already): the dark coat; the deep green as a
    // POROUS print in two sizes, thinning out toward the lower edge (the value fall-off); a second green in
    // clumps with a few lights inside and shadow pockets between; the crest of the nearer row; the lip
    // printed in mid green with a first few lights, the wall breathing through it
    const base = [
      { color: P('hedge_dark'), coverage: 0.99, size: 42, even: true, tint: 0.025, pores: 0, maskFn: (x, y) => top(x, y) * noBig(x, y) },
      { color: P('hedge_dark'), coverage: 0.99, size: 124, even: true, tint: 0.02, pores: 0, maskFn: deep },
      { color: P('hedge_dark'), coverage: 0.99, size: 17, even: true, tint: 0.025, pores: 0, maskFn: grass },
      { color: P('hedge_deep'), coverage: 0.78, size: 40, stamps: 'body', tint: 0.03, pores: 0.6, maskFn: (x, y) => top(x, y) * noBig(x, y), patch: { scale: 170, amount: 0.28 } },
      { color: P('hedge_deep'), coverage: 0.8, size: 15, stamps: 'body', tint: 0.03, pores: 0.4, maskFn: grass },
      { color: P('hedge_deep'), coverage: 0.86, size: 96, stamps: 'body', tint: 0.035, pores: 0.7, maskFn: (x, y) => deep(x, y) * lerp(1, 0.3, sink(x, y)), patch: { scale: 300, amount: 0.26, sharp: 0.35 } },
      { color: '#2F7A4C', coverage: 0.72, size: 64, stamps: 'body', tint: 0.03, pores: 0.6, maskFn: (x, y) => ss(-2, 22, below(x, y)) * lerp(1, 0.1, sink(x, y)) * noBig(x, y), patch: CLUMP },
      { color: '#37845A', coverage: 0.36, size: 38, stamps: 'open', tint: 0.02, maskFn: (x, y) => ss(-2, 18, below(x, y)) * (1 - ss(0, 0.6, sink(x, y))) * noBig(x, y), patch: { ...CLUMP, amount: 0.6 } },
      { color: '#438F4A', coverage: 0.3, size: 28, stamps: 'open', tint: 0.02, maskFn: (x, y) => ss(4, 18, below(x, y)) * ss(128, 48, below(x, y)) * noBig(x, y), patch: { ...CLUMP, amount: 0.64 } },
      { color: '#226043', coverage: 0.6, size: 88, stamps: 'body', tint: 0.03, pores: 0.7, maskFn: (x, y) => ss(20, 70, below(x, y)) * lerp(0.5, 1, sink(x, y)), patch: { ...CLUMP, invert: true, amount: 0.3 } },
      { color: '#18492F', coverage: 0.3, size: 54, stamps: 'open', tint: 0.03, maskFn: (x, y) => ss(24, 80, below(x, y)) * lerp(0.3, 1, sink(x, y)), patch: { ...CLUMP, invert: true, amount: 0.44 } },
      { color: '#2F7A4C', coverage: 0.7, size: 48, stamps: 'body', tint: 0.03, pores: 0.5, maskFn: nearCrest(26, 80), patch: CREST },
      { color: '#3A8550', coverage: 0.4, size: 30, stamps: 'open', tint: 0.02, maskFn: nearCrest(12, 40), patch: { ...CREST, amount: 0.5 } },
      // the lip, from the first coat on: a third green under the line, the mid green in long runs of
      // small prints (never a row of single blobs), a first few lights
      { color: '#37845A', coverage: 0.78, size: 30, stamps: 'body', tint: 0.03, pores: 0.5, maskFn: (x, y) => ss(-10, 0, below(x, y)) * ss(40, 14, below(x, y)) * noBig(x, y), patch: { scale: 150, amount: 0.3, seed: 81 } },
      { color: '#37845A', coverage: 0.86, size: 14, stamps: 'body', tint: 0.03, pores: 0.3, maskFn: grass, patch: { scale: 60, amount: 0.2, seed: 81 } },
      { color: tone(P('hedge_mid'), -0.1), coverage: 0.8, size: 24, stamps: 'body', tint: 0.03, pores: 0.4, maskFn: (x, y) => lipRun(x, y) * noBig(x, y), patch: LIPM },
      { color: tone(P('hedge_mid'), -0.06), coverage: 0.8, size: 13, stamps: 'body', tint: 0.03, pores: 0.3, maskFn: (x, y) => grass(x, y) * ss(FEET_SOLID + 14, FEET_SOLID + 4, y), patch: { ...LIPM, scale: 50, amount: 0.26 } },
      { color: P('hedge_mid'), coverage: 0.5, size: 18, stamps: 'open', tint: 0.03, maskFn: lipBand(-13, 2, 18), patch: { ...LIPM, amount: 0.54 } },
      { color: P('hedge_mid'), coverage: 0.5, size: 11, stamps: 'body', tint: 0.03, pores: 0, maskFn: (x, y) => grass(x, y) * lightOK(11)(x, y), patch: { ...LIPM, scale: 50, amount: 0.44 } },
      { color: '#7FB54E', coverage: 0.26, size: 14, stamps: 'open', maskFn: lipBand(-14, -3, 14), patch: { ...LIPM, amount: 0.6 } },
      { color: P('primer'), coverage: 0.09, size: 18, stamps: 'soft', maskFn: lipBand(-14, -3, 18), patch: { scale: 120, amount: 0.5 } },
    ];
    const LIT = { scale: 190, amount: 0.5, sharp: 0.35, seed: 77 };     // one patch map: lights gather in the same places
    const TINY = { scale: 96, amount: 0.4, sharp: 0.4, seed: 78 };      // … and the tiny lights of the lip in clumps of their own
    const near = (x, y) => ss(18, 44, below(x, y)), nearer = (x, y) => ss(6, 26, below(x, y));
    const coat2 = [
      { color: '#256648', coverage: 0.5, size: 62, stamps: 'open', tint: 0.03, pores: 0.5, maskFn: (x, y) => near(x, y) * lerp(1, 0.4, sink(x, y)), patch: { scale: 210, amount: 0.42 } },
      { color: '#18492F', coverage: 0.26, size: 56, stamps: 'open', tint: 0.03, maskFn: (x, y) => near(x, y) * lerp(0.6, 1, sink(x, y)), patch: { ...CLUMP, invert: true, amount: 0.46 } },
      { color: '#2F7A4C', coverage: 0.42, size: 44, stamps: 'body', tint: 0.03, pores: 0.5, maskFn: (x, y) => nearer(x, y) * lerp(1, 0.15, sink(x, y)), patch: LIT },
      { color: '#37845A', coverage: 0.26, size: 30, stamps: 'open', tint: 0.02, maskFn: (x, y) => nearer(x, y) * (1 - ss(0, 0.7, sink(x, y))), patch: { ...LIT, amount: 0.62 } },
      { color: '#143F2A', coverage: 0.2, size: 36, stamps: 'soft', maskFn: (x, y) => nearer(x, y) * lerp(0.5, 1, sink(x, y)), patch: { scale: 160, amount: 0.6 } },
      // very dark blue-green accents: a few groups of lacy prints, more of them low and toward the flanks
      { color: '#103D38', coverage: 0.34, size: 78, stamps: 'open', tint: 0.02, maskFn: (x, y) => ss(70, 150, below(x, y)) * lerp(0.12, 1, sink(x, y)), patch: { ...CLUMP, invert: true, amount: 0.2, scale: 300, seed: 3512 } },
      { color: '#103D38', coverage: 0.13, size: 40, stamps: 'soft', maskFn: (x, y) => ss(50, 130, below(x, y)) * lerp(0.12, 1, sink(x, y)), patch: { ...CLUMP, invert: true, amount: 0.26, scale: 300, seed: 3512 } },
      // the lip: mid green, then small lights of several tones in clumps, a little warmth — all above the calm field
      { color: P('hedge_mid'), coverage: 0.7, size: 30, stamps: 'body', tint: 0.03, pores: 0.4, maskFn: (x, y) => lipBand(-13, 4, 0)(x, y) * ss(LIGHT_FLOOR + 4, LIGHT_FLOOR - 12, y + 14) * noBig(x, y), patch: { scale: 130, amount: 0.24, sharp: 0.3 } },
      { color: '#7FB54E', coverage: 0.5, size: 22, stamps: 'body', pores: 0.3, maskFn: (x, y) => lipBand(-14, 1, 22)(x, y) * noBig(x, y), patch: { scale: 120, amount: 0.34, sharp: 0.3 } },
      { color: P('hedge_mid'), coverage: 0.6, size: 13, stamps: 'body', tint: 0.03, pores: 0.3, maskFn: (x, y) => grass(x, y) * lightOK(13)(x, y), patch: { scale: 46, amount: 0.4, seed: 82 } },
      { color: P('hedge_lip_light'), coverage: 0.56, size: 16, stamps: 'body', pores: 0.3, maskFn: lipBand(-15, -1, 16), patch: TINY },
      { color: '#B9D96E', coverage: 0.4, size: 11, stamps: 'open', maskFn: lipBand(-16, -2, 11), patch: { ...TINY, amount: 0.5 } },
      { color: '#DDEB9C', coverage: 0.2, size: 8, stamps: 'soft', maskFn: lipBand(-17, -4, 8), patch: { ...TINY, amount: 0.6 } },
      { colors: ['#C9785A', P('tomorrow_dashes'), '#E3C65A'], coverage: 0.13, size: 13, stamps: 'soft', maskFn: lipBand(-13, -1, 13), patch: { scale: 110, amount: 0.6 } },
      { color: P('primer'), coverage: 0.06, size: 14, stamps: 'soft', maskFn: lipBand(-15, -3, 14) },
      // the nearer row and the ground of the thicket (decoration strip only, never lighter than hedge_mid)
      { color: '#2F7A4C', coverage: 0.66, size: 54, stamps: 'body', tint: 0.03, pores: 0.5, maskFn: (x, y) => deco(y), patch: { scale: 220, amount: 0.3, seed: 3514 } },
      { color: '#3A8550', coverage: 0.42, size: 34, stamps: 'open', tint: 0.02, maskFn: (x, y) => deco(y), patch: { ...LIT, amount: 0.5 } },
      { color: '#143F2A', coverage: 0.8, size: 72, stamps: 'body', tint: 0.02, pores: 0.5, maskFn: (x, y) => ss(hedgeBottom - 120, hedgeBottom - 36, y) },
      { color: '#438F4A', coverage: 0.22, size: 20, stamps: 'open', maskFn: nearCrest(8, 26), patch: { ...CREST, amount: 0.6 } },
    ];
    const depth = (x, y) => lerp(clamp((below(x, y) + 13) / 44), clamp((y - grassTop(x)) / 13), tuft(x));
    const spec = (layers) => backfill(field({ box: hedgeBox, depth, seed: 351, edge: 0.34, layers, k: HI }), P('hedge_dark'), solidTop);
    const baseCoat = spec(base);
    const full = spec([...base, ...coat2]);

    // Leaf stencils, printed into the finished coat: a stencil-sharp cut filled with a BROKEN sponge print
    // (the ground shows through its pores), no light edge.
    //   * in the gloss field (and everywhere above the caption strip) tone on tone — one small tone step
    //     from the ground —, small under the lip and growing toward the viewer;
    //   * below it the FOREGROUND: clumps of large, dark leaves that rise from the lower edge and the
    //     corners, each on darker prints, a few of them blue-green.
    const TS = 360;
    const print = (c1, c2, seed, cov = 0.88, pores = 0.55) => E.makeSpongeTexture({ w: TS, h: TS, seed, layers: [
      { color: c1, coverage: cov, size: 44, stamps: 'body', tint: 0.02, pores },
      { color: c2, coverage: 0.4, size: 28, stamps: 'open', tint: 0.02 },
    ] });
    const calmTex = [print(tone(P('hedge_deep'), 0.04), '#2F7A4C', 361), print(tone(P('hedge_dark'), -0.04), '#18492F', 362), print('#286C47', tone('#286C47', 0.05), 363)];
    const darkTex = [print('#143F2A', '#1B5236', 365, 0.92, 0.6), print('#0F3A33', '#17483C', 366, 0.92, 0.6), print('#18492F', '#216040', 367, 0.92, 0.6), print('#123C2C', '#1A5034', 368, 0.92, 0.6)];
    // The FOREGROUND thicket belongs to the first coat (frame 0 is a full landscape); the tone-on-tone leaves
    // arrive with the second coat. Both coats get the identical thicket: one seeded stream, the first
    // part of it consumed without printing for the base coat.
    const printLeaves = (coat, calmToo) => {
    const rng = E.makeRng('world/hedge-leaves');
    let dry = !calmToo;
    const sctx = coat.painted.final.ctx;
    sctx.save();
    sctx.translate(-hedgeBox[0], -hedgeBox[1]);
    sctx.globalCompositeOperation = 'source-atop';      // leaves print on the hedge only (never above its lip)
    const leafAt = (x, y, len, wid, rot, set, bend = rng.sym(len * 0.03)) => {
      const shp = E.shape.place(E.shape.leaf(len, wid, bend), { x, y, rot });
      const [bx0, by0, bx1, by1] = shp.bounds;
      if (bx1 - bx0 > TS || by1 - by0 > TS) return;
      const tx = Math.floor(bx0 - rng.next() * (TS - (bx1 - bx0))), ty = Math.floor(by0 - rng.next() * (TS - (by1 - by0)));
      const tex = rng.pick(set);
      if (!dry) E.drawStencil(sctx, shp, tex, { x: tx, y: ty });
    };
    const sprig = (x, y, n, len, lean, set) => {
      for (let k = 0; k < n; k++) {
        const fan = n > 1 ? k / (n - 1) - 0.5 : 0;
        const l = len * rng.range(0.8, 1.12);
        leafAt(x + fan * l * 0.36 + rng.sym(5), y + Math.abs(fan) * l * 0.3 + rng.sym(5), l, l * rng.range(0.4, 0.5), -Math.PI / 2 + lean + fan * 1.9 + rng.sym(0.16), set);
      }
    };
    // tone on tone: loose, staggered groups — 3 + 2 + 1, never a row — that grow from 40 px under the lip to 100 px low down
    for (let y = L.lipY + 64; y < hedgeBottom + 60;) {
      const d = clamp((y - L.lipY - 64) / 520), size = lerp(38, 92, d);
      let x = hedgeBox[0] + rng.range(0, 160);
      while (x < hedgeBox[2] + 60) {
        const n = rng.pick([3, 2, 3, 1, 4]);
        sprig(x + rng.sym(20), y + rng.sym(size * 0.55), n, size * rng.range(0.85, 1.2), rng.sym(0.6), calmTex);
        x += size * rng.range(2.2, 4.6);
      }
      y += size * rng.range(1.25, 1.6);
    }
    // the foreground thicket: big dark leaves under the gloss field only (rows below CALM1)
    dry = false;
    const FG0 = CALM1 + 26;
    const clump = (x, y, n, len, lean, spread) => {
      for (let k = 0; k < n; k++) {
        const fan = n > 1 ? k / (n - 1) - 0.5 : 0;
        const l = len * rng.range(0.78, 1.1), rot = -Math.PI / 2 + lean + fan * spread + rng.sym(0.12);
        // a leaf may not reach up into the gloss field
        const reach = Math.max(0.2, -Math.sin(rot)) * l;
        const l2 = y - reach < FG0 ? Math.max(0, (y - FG0) / Math.max(0.2, -Math.sin(rot))) : l;
        if (l2 < 60) continue;
        leafAt(x + fan * l * 0.3 + rng.sym(8), y + Math.abs(fan) * l * 0.24 + rng.sym(8), l2, l2 * rng.range(0.36, 0.46), rot, darkTex, rng.sym(l2 * 0.06));
      }
    };
    // along the lower edge, in a rhythm that is not a row: tall groups where the lower corners of the wide
    // framings lie (HOME: x 0 and 1080, ACT2: x 250 and 1330), low ones under the middle of each.
    // Behind: flat dark prints (the leaves in the shade). In front: real stencil leaves — the leaves of the
    // rosettes, three to five times as large, with a powdery mid green on one half and no light edge.
    const rise = (x) => Math.max(ss(250, 0, Math.abs(x - 20)), 0.6 * ss(150, 0, Math.abs(x - 330)), 0.85 * ss(190, 0, Math.abs(x - 1085)), ss(230, 0, Math.abs(x - 1335)));
    const fronts = [];
    for (let x = hedgeBox[0] + 20; x < hedgeBox[2]; x += rng.range(74, 132)) {
      const r = rise(x), tall = lerp(130, 290, r) * rng.range(0.85, 1.1);
      const baseY = hedgeBottom - 16 - 40 * r * rng.next();
      const lean = (x < 665 ? 1 : -1) * lerp(0.05, 0.4, r) + rng.sym(0.22);
      clump(x, baseY, rng.int(3, 5), tall, lean, rng.range(1.5, 2.1));
      if (rng.chance(0.4 + 0.5 * r)) clump(x + rng.sym(60), baseY - rng.range(30, 90), rng.int(2, 3), tall * 0.6, rng.sym(0.7), 1.4);
      if (r > 0.25 || rng.chance(0.6)) fronts.push([x + rng.range(24, 60), baseY + 20, lerp(120, 250, r) * rng.range(0.9, 1.1), -lean * 0.5 + rng.sym(0.3)]);
    }
    fronts.forEach(([x, y, len, lean], i) => {
      const n = len > 170 ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const fan = k / (n - 1) - 0.5, rot = -Math.PI / 2 + lean + fan * rng.range(1.0, 1.5) + rng.sym(0.1), up = Math.max(0.3, -Math.sin(rot));
        let l = len * (k === 1 ? 1 : rng.range(0.66, 0.86));
        if (y - up * l < FG0) l = (y - FG0) / up;
        if (l < 70) continue;
        E.makeLeaf({ len: l, wid: l * rng.range(0.36, 0.44), bend: rng.sym(l * 0.06), seed: 3600 + i * 7 + k, sliver: false, light: '#3A8550' })
          .draw(sctx, x + fan * l * 0.24, y + Math.abs(fan) * l * 0.16, { rot });
      }
    });
    sctx.restore();
    };
    printLeaves(full, true);
    printLeaves(baseCoat, false);
    return { base: baseCoat, full };
  });

  // ------------------------------------------------------------------ rosettes, buds, flowers (plane 1.0)
  // The leaf rosettes are printed on the mound in two layers. A leaf that would cross the strip his legs and
  // shoes can stand in (rest, turn, half-step) lies BEHIND him — whole, never trimmed to his outline —;
  // all the others, the buds and the flowers lie in front of the hedge lip as before.
  const LEGS = [L.man.shoe_x[0] - 23, L.man.shoe_x[1] + 45];          // 482 … 620
  const FLOOR = Math.min(CW.y0 - 8, LIGHT_FLOOR);        // no rosette leaf below this row (gloss field in YARIN)
  const flora = once('flora', () => {
    const rng = E.makeRng('world/flora');
    const front = [], back = [];                         // leaves of all rosettes, drawn back to front
    const rosette = (cx, cy, reach, n, seed) => {
      for (let k = 0; k < n; k++) {
        // a fan over the upper half and the sides; nothing points down into the gloss field
        const a = lerp(-Math.PI * 1.13, Math.PI * 0.13, (k + 0.5 + rng.sym(0.22)) / n);
        let len = reach * rng.range(0.9, 1.08);
        const dx = Math.cos(a), dy = Math.sin(a);
        if (dy > 0) len = Math.min(len, (FLOOR - 4 - cy) / dy);
        if (len < 22) continue;
        const wid = len * rng.range(0.4, 0.48), tipX = cx + dx * len;
        const behind = Math.max(cx, tipX) + wid * 0.5 > LEGS[0] && Math.min(cx, tipX) - wid * 0.5 < LEGS[1];
        (behind ? back : front).push({ x: cx + dx * 4, y: cy + dy * 4, rot: a, z: cy + dy * len * 0.5, leaf: E.makeLeaf({ len, wid, bend: rng.sym(len * 0.07), seed: seed * 31 + k, sliver: dy < -0.55 && k % 3 !== 1 }) });
      }
    };
    L.flowers.forEach((f, i) => rosette(f.x, f.y, f.r + 14, 7, 400 + i));
    const e1 = L.buds[0];
    rosette(e1.x, L.lipY - 4, 34, 4, 420);
    const stem = E.bakeStencil({
      shape: E.shape.ribbon([[e1.x, L.lipY], [e1.x + 2, (L.lipY + e1.y) / 2], [e1.x, e1.y + 12]], [6, 4]), base: '#2A6A43', seed: 421, bleed: false,
      anchor: [0, 0], pad: 3, layers: [{ color: '#17492E', coverage: 0.4, size: 18, stamps: 'open' }, { color: '#3C8442', coverage: 0.36, size: 14, stamps: 'open' }],
    });
    const bounds = [e1.x - 60, M.topY - 30, M.x1 + 40, FLOOR + 2];
    const sprite = (list, seed, extra) => E.bakeSprite({
      bounds, anchor: [0, 0], seed,
      draw: (c) => {
        for (const l of [...list].sort((p, q) => p.z - q.z)) l.leaf.draw(c, l.x, l.y, { rot: l.rot });
        if (extra) extra(c);
      },
    });
    const bud = (seed) => E.makeBud({ r: 12, seed });
    return {
      rosettes: sprite(front, 422, (c) => stem.draw(c, 0, 0)),
      rosettesBack: sprite(back, 423),
      leaves: { front: front.length, back: back.length },
      e1: { x: e1.x, y: e1.y + 14, bud: bud(430) },
      flowers: L.flowers.map((f, k) => ({ ...f, bud: bud(431 + k), flower: E.makeFlower({ r: f.r, seed: 440 + k }) }))
        .sort((a, b) => a.y - b.y),                      // nearer ones in front
    };
  });

  // ------------------------------------------------------------------ today's sun (plane 1.0)
  const S = L.sun;
  const sun = once('sun', () => {
    const lit = E.sphereLight(0, 0, S.r, S.r);
    const hot = (x, y) => ss(S.r * 0.66, S.r * 0.16, Math.hypot(x - S.r * 0.22, y + S.r * 0.24));
    const calmLayers = [
      { color: '#E9A53A', coverage: 0.5, size: S.r * 0.8, maskFn: (x, y) => ss(0.6, 0.3, lit(x, y)) },
      { color: '#F3C356', coverage: 0.66, size: S.r * 0.72, maskFn: (x, y) => ss(0.5, 0.8, lit(x, y)) },
      { color: P('today_pale'), coverage: 0.5, size: S.r * 0.42, stamps: 'open', maskFn: hot },
      { color: P('primer'), coverage: 0.12, size: S.r * 0.3, stamps: 'soft' },
    ];
    const blazeLayers = [
      { color: '#E8941C', coverage: 0.62, size: S.r * 0.82, maskFn: (x, y) => ss(0.62, 0.3, lit(x, y)) },
      { color: '#F6BE36', coverage: 0.78, size: S.r * 0.74, maskFn: (x, y) => ss(0.46, 0.76, lit(x, y)) },
      { color: P('today_light'), coverage: 0.92, size: S.r * 0.52, maskFn: hot },
      { color: P('today_pale'), coverage: 0.8, size: S.r * 0.36, stamps: 'open', maskFn: (x, y) => hot(x, y) ** 2 },
    ];
    // RECEDED (16.83 / 16.93): the same disc painted once more in paler golds — the same light from the
    // upper right, one value step nearer to the sky —, not a veil of specks over the blazing one
    const farLayers = [
      { color: '#EDB95A', coverage: 0.6, size: S.r * 0.82, pores: 0.3, maskFn: (x, y) => ss(0.62, 0.3, lit(x, y)) },
      { color: '#F6D98E', coverage: 0.8, size: S.r * 0.74, pores: 0.3, maskFn: (x, y) => ss(0.44, 0.74, lit(x, y)) },
      { color: '#FAE8B4', coverage: 0.88, size: S.r * 0.5, pores: 0.3, maskFn: hot },
      { color: '#FCF2D6', coverage: 0.6, size: S.r * 0.34, stamps: 'open', maskFn: (x, y) => hot(x, y) ** 2 },
    ];
    const disc = (base, layers, seed = 501) => E.bakeStencil({
      shape: E.shape.ellipse(0, 0, S.r), base, seed, anchor: [0, 0], layers, bleed: { color: base, amount: 0.8 }, reveal: { steps: 4 },
    });
    const HR = S.halo.blaze_passes;                      // [190, 250, 300]
    const glow = (r, band, layers, seed, reveal = {}, edge = 0.5) => E.makeCluster({
      points: [{ x: 0, y: 0, r }], seed, edgeSoftness: edge, anchor: [0, 0],
      layers: layers.map((l) => ({ band, ...l })), reveal: { steps: 2, mode: 'mask', order: 'radial', from: [0, 0], dab: 90, ...reveal },
    });
    const f = (r) => 1 - r / HR[0];                      // cluster depth at radius r of the pass-1 disc
    const yellow = (cov) => [
      { color: P('halo', 0), coverage: cov, size: 62, stamps: 'open', pores: 0.3 },
      { color: P('today_pale'), coverage: cov * 0.5, size: 44, stamps: 'soft' },
    ];
    const A = S.annulus, aMid = (A.r_in + A.r_out) / 2, aHalf = (A.r_out - A.r_in) / 2;
    const aBox = [S.x - A.r_out - 40, S.y - A.r_out - 40, S.x + A.r_out + 40, S.y + A.r_out + 40];
    const rad = (x, y) => Math.hypot(x - S.x, y - S.y);
    const ringDepth = (x, y) => clamp(1 - Math.abs(rad(x, y) - aMid) / aHalf);
    const o = {
      calm: disc('#EFB449', calmLayers),
      blaze: disc(P('today_disc'), blazeLayers),
      far: E.bakeStencil({
        shape: E.shape.ellipse(0, 0, S.r), base: '#F2C873', seed: 502, anchor: [0, 0], layers: farLayers,
        bleed: { color: '#F6E3A6', amount: 0.8 }, reveal: { steps: T.sun.recede.length, order: 'random', dab: 64 },
      }),
      // its halo: one calm ring of pale yellow that thins out softly toward r 150 (it breathes like the blaze halo)
      haloFar: E.makeCluster({
        points: [{ x: 0, y: 0, r: S.halo.receded + 12 }], seed: 519, edgeSoftness: 0.2, anchor: [0, 0],
        layers: [
          { color: '#F5E2A0', coverage: 0.9, size: 52, stamps: 'body', pores: 0.3 },
          { color: '#FAEFC8', coverage: 0.4, size: 36, stamps: 'soft', patch: { scale: 90, amount: 0.4 } },
          { color: '#F5E2A0', coverage: 0.14, size: 64, stamps: 'speck', grow: 1.05 },
        ],
        reveal: { steps: T.sun.recede.length, mode: 'mask', order: 'random', dab: 70 },
      }),
      // halo pass 1 (yellow) in three rings, so that it can draw in: r < 150, 150–170, 170–190
      core: glow(HR[0], [f(S.halo.receded), 1], yellow(0.82), 511, {}, 0.07),
      mid: glow(HR[0], [f(S.halo.under_hours_ring), f(S.halo.receded) + 0.06], yellow(0.8), 512, {}, 0.06),
      rim: glow(HR[0], [0, f(S.halo.under_hours_ring) + 0.05], yellow(0.72), 513, {}, 0.06),
      // pass 2: peach to r 250
      peach: glow(HR[1], [0, 1 - (S.r + 30) / HR[1]], [
        { color: P('halo', 1), coverage: 0.78, size: 92, stamps: 'any', pores: 0.3, patch: { scale: 220, amount: 0.24 } },
        { color: '#F2B585', coverage: 0.3, size: 66, stamps: 'open', patch: { scale: 160, amount: 0.5 } },
        { color: P('halo', 0), coverage: 0.3, size: 66, stamps: 'soft' },
      ], 514, {}, 0.3),
      // pass 3: white-cream specks to r 300 …
      white: glow(HR[2], [0, 1 - (S.r + 40) / HR[2]], [
        { color: P('halo', 2), coverage: 0.4, size: 46, stamps: 'open', patch: { scale: 150, amount: 0.36 } },
        { color: '#FFFFFF', coverage: 0.3, size: 30, stamps: 'speck', tints: 1 },
        { color: P('today_pale'), coverage: 0.22, size: 52, stamps: 'soft' },
      ], 515, {}, 0.3),
      // … with a warm pass in the sky round the apex
      warm: glow(HR[2] + 150, [0, 0.62], [
        { color: '#F7DDB5', coverage: 0.3, size: 130, stamps: 'open', patch: { scale: 260, amount: 0.45 } },
        { color: P('today_pale'), coverage: 0.2, size: 100, stamps: 'soft', patch: { scale: 220, amount: 0.5 } },
      ], 516, { steps: 1 }, 0.5),
      // the cobalt ring the hour-beads are painted on (r 150–270), dabbed in with the settle
      annulus: field({ box: aBox, depth: ringDepth, seed: 517, edge: 0.42, reveal: { steps: T.sun.settle.length, mode: 'mask', order: 'random', dab: 110 }, layers: [
        { color: P('hour_annulus', 0), coverage: 0.95, size: 74, tint: 0.04, pores: 0.3 },
        { color: P('hour_annulus', 1), coverage: 0.55, size: 62, stamps: 'body', tint: 0.04, pores: 0.3, patch: { scale: 170, amount: 0.4 } },
        { color: P('sky_lavender'), coverage: 0.12, size: 56, stamps: 'open', patch: { scale: 150, amount: 0.6 } },
      ] }),
      // the receded ring: its outer rim is taken back into the sky with light-blue prints (two steps), so
      // the cobalt ends softly inside r 250; the band the hour-beads sit on (r 188–232) keeps its full dark
      rimFar: field({ box: aBox, seed: 518, edge: 0.5, reveal: { steps: T.sun.recede.length, order: 'random', layerMix: 0 },
        depth: (x, y) => { const r = rad(x, y); return clamp(Math.min((r - (A.r_out - 34)) / 22, (A.r_out + 34 - r) / 30)); },
        layers: [
          { color: P('sky_light_blue'), coverage: 0.74, size: 58, stamps: 'open', tint: 0.03, pores: 0.3 },
          { color: '#97CEE4', coverage: 0.3, size: 44, stamps: 'soft' },
        ] }),
    };
    o.receded = [o.far, o.far];                          // (older names, kept for inspection scripts)
    o.veil = [o.rimFar, o.rimFar];
    return o;
  });

  // light column: sparse warm dabs from the sun down to the rise
  const column = once('column', () => {
    const y0 = S.y + S.r + 6, y1 = L.lipY + 20;
    const hw = (y) => lerp(112, 142, clamp((y - y0) / (L.lipY - y0)));
    const box = [S.x - 190, y0 - 40, S.x + 190, y1];
    const f = field({
      box, seed: 521, edge: 0.6, reveal: { steps: T.column.on.length, order: 'sweep', angle: Math.PI / 2, jitter: 0.12, layerMix: 0 },
      depth: (x, y) => clamp(Math.min((hw(y) - Math.abs(x - S.x)) / 80, (y - y0 + 30) / 90)),
      layers: [
        { color: P('halo', 0), coverage: 0.44, size: 66, stamps: 'open', patch: { scale: 170, amount: 0.3 } },
        { color: P('halo', 1), coverage: 0.3, size: 58, stamps: 'open', patch: { scale: 160, amount: 0.42 } },
        { color: P('today_pale'), coverage: 0.3, size: 38, stamps: 'soft' },
      ],
    });
    f.out = f.painted.masked({ order: 'random', steps: T.sun.settle.length, dab: 70 });
    return f;
  });

  // ------------------------------------------------------------------ tomorrow's dashed ring (plane 1.0)
  const RG = L.ring;
  const ring = once('ring', () => {
    const period = (2 * Math.PI * RG.r) / RG.dashes, dash = period * 0.54;
    const painted = E.bakeStencil({
      shape: E.shape.dashes(E.shape.ellipse(0, 0, RG.r), { dash, gap: period - dash, width: RG.stroke }),
      base: '#BE7F31', anchor: [0, 0], seed: 531, bleed: false,
      layers: [
        { color: P('tomorrow_dashes'), coverage: 0.55, size: 28, stamps: 'body' },
        { color: '#A1641F', coverage: 0.26, size: 20, stamps: 'soft' },
        { color: P('primer'), coverage: 0.08, size: 14, stamps: 'soft' },
      ],
    });
    const out = painted.masked({ order: 'random', steps: T.ring.crumble.length, dab: 44 });
    const tOut = L.ft(T.ring.crumble[0]), dur = L.ft(T.ring.crumble[T.ring.crumble.length - 1]) - tOut;
    const life = (L.ft(T.ring.specksGone) - tOut - dur) * 0.98;
    const burst = E.makeBurst(painted, { seed: 532, count: 18, duration: dur, order: { order: 'random' }, wind: [10, 150], spread: 10, life: [life * 0.7, life], size: [6, 11] });
    // draw-on wedge: clockwise from 12 o'clock, ending in the middle of the gap after dash n
    const gapHalf = ((period - dash - RG.stroke) / 2 + RG.stroke / 2) / RG.r;
    const wedge = (ctx, n) => {
      ctx.beginPath();
      ctx.moveTo(RG.x, RG.y);
      ctx.arc(RG.x, RG.y, RG.r + 30, -Math.PI / 2 - gapHalf, -Math.PI / 2 - gapHalf + (n * period) / RG.r);
      ctx.closePath();
      ctx.clip();
    };
    return { painted, out, burst, wedge, tOut };
  });

  // ------------------------------------------------------------------ ambient specks (parallax 1.2)
  const specks = once('specks', () => {
    const m = L.motion.specks, rng = E.makeRng('world/ambient');
    const r = L.visibleRect(PLANE.specks, 40);
    const bx = r[0], by = -60, bw = r[2] - r[0], bh = L.toWorld('HOME', 0, m.fadeY[1], PLANE.specks)[1] + 220 - by;
    const cols = [P('flower_white'), P('today_pale'), P('flower_pink'), P('flower_white'), P('today_light')];
    const stamps = E.stampsOf('dense');
    const u0 = rng.next(), v0 = rng.next();
    const ps = Array.from({ length: m.count }, (_, i) => {
      const a = -0.62 + rng.sym(0.42), v = rng.range(9, 19);
      return {
        // start points from a low-discrepancy sequence: the dozen specks never clump and never line up
        x: ((u0 + (i + 1) * 0.7548776662) % 1) * bw, y: ((v0 + (i + 1) * 0.5698402910) % 1) * bh,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: rng.range(m.size[0] + 1.5, m.size[1]) * 1.9,
        img: E.stampCanvas(stamps[i % stamps.length], cols[i % cols.length], 72), rot: rng.next() * 6.283, spin: rng.sym(0.5),
        ph: rng.next() * 100, tw: rng.range(2.6, 5),
      };
    });
    return {
      /** layer positions [x, y] of all specks at t (tests) */
      at: (t) => ps.map((p) => [bx + (((p.x + p.vx * t) % bw) + bw) % bw, by + (((p.y + p.vy * t) % bh) + bh) % bh]),
      draw(ctx, t, c) {
        const start = E.tween(t, L.ft(T.specks.from), L.ft(T.specks.from) + 0.4, 0, 1, E.ease.sine.inOut);
        if (start <= 0) return;
        const z = Math.exp(Math.log(c.zoom) * PLANE.specks);
        // Keep-clear zone round his head: a pale fleck on the plain face reads as a blemish (and the storyboard
        // lets nothing glow on him after the call) — a speck fades out as it drifts toward the head and comes
        // back on the other side. One zone for both skins and every head pose (head 64 x 72 world px).
        const [hx, hy] = E.worldToFrame(c, 1, L.man.x, L.man.head_top_y + L.man.head.h / 2);
        for (const p of ps) {
          const x = (((p.x + p.vx * t) % bw) + bw) % bw, y = (((p.y + p.vy * t) % bh) + bh) % bh;
          const edge = ss(0, 70, Math.min(x, bw - x, y, bh - y));
          const lx = bx + x + Math.sin(t * 0.7 + p.ph) * 12, ly = by + y + Math.sin(t * 0.53 + p.ph * 1.7) * 12;
          const [sx, sy] = E.worldToFrame(c, PLANE.specks, lx, ly);
          const clear = ss(50 * c.zoom, 82 * c.zoom, Math.hypot(sx - hx, sy - hy));
          const a = m.alpha * start * edge * clear * (1 - ss(m.fadeY[0], m.fadeY[1], sy)) * (1 - 0.3 * (0.5 + 0.5 * Math.sin((t / p.tw) * 6.283 + p.ph)));
          if (a <= 0.01 || sx < -20 || sx > FW + 20 || sy < -20) continue;
          const s = p.size * z, r2 = p.rot + p.spin * t, co = Math.cos(r2) * (s / 72), si = Math.sin(r2) * (s / 72);
          ctx.save();
          ctx.transform(co, si, -si, co, sx, sy);
          ctx.globalAlpha *= a;
          ctx.drawImage(p.img, -36, -36);
          ctx.restore();
        }
      },
    };
  });

  // ------------------------------------------------------------------ state timeline (storyboard §5)
  function state(t) {
    const on = (e) => L.on(t, e), cnt = (list) => L.count(t, list);
    const settle = cnt(T.sun.settle), sunRecede = cnt(T.sun.recede), halo = cnt(T.sun.halo);
    const mistOut = cnt(T.mist.out), thinned = on(T.mist.thin);
    let dashes = 0;
    for (let i = 0, n = cnt(T.ring.on); i < n; i++) dashes += T.ring.counts[i];
    let strength = 1;
    for (const [te, v] of T.ring.veil) if (on(te)) strength = v;
    if (on(T.ring.reink[0])) strength = T.ring.reink[1];
    const crumble = cnt(T.ring.crumble), nCr = T.ring.crumble.length;
    const NS = T.sun.settle.length;
    const HP = S.halo.blaze_passes;
    const haloR = !halo ? 0 : sunRecede ? S.halo.receded : settle >= 3 ? S.halo.under_hours_ring
      : halo >= 3 && settle <= 1 ? HP[2] : halo >= 2 && settle <= 2 ? HP[1] : HP[0];
    return {
      t,
      coat2: on(T.coat2),
      man: { p: cnt(T.man.passes) / T.man.passes.length, warm: on(T.man.warm) ? 1 : 0 },
      specks: on(T.specks.from),
      cloud: { visible: SHOW_CLOUD_C1 && on(T.coat2), x: L.motion.cloudX(t), y: L.cloud.layer_centre_at_t0[1] },
      dusk: { sunset0: on(T.dusk.sunset0), sunset1: on(T.dusk.sunset1), dusk1: on(T.dusk.dusk1), dusk2: on(T.dusk.dusk2), recede: cnt(T.dusk.recede) },
      mist: {
        build: cnt(T.mist.build), thick: thinned ? Math.min(1, cnt(T.mist.thicken)) : cnt(T.mist.thicken), recede: cnt(T.mist.recede),
        thinned, out: mistOut, p: 1 - mistOut / T.mist.out.length, dx: mistDx(t),
      },
      ring: { dashes, strength: crumble >= nCr ? 0 : dashes ? strength : 0, crumble, p: 1 - crumble / nCr, visible: dashes > 0 && crumble < nCr },
      sun: {
        visible: on(T.sun.disc), bare: on(T.sun.bare), blaze: halo > 0, halo, settle, recede: sunRecede,
        haloR,                                           // outer radius of the halo right now (0 = none)
        white: halo >= 3 ? (settle === 0 ? 1 : settle === 1 ? 0.5 : 0) : 0,
        warmSky: halo >= 3 && settle === 0,
        peach: halo >= 2 ? (settle <= 1 ? 1 : settle === 2 ? 0.5 : 0) : 0,
        rim: halo >= 1 && settle < 3, mid: halo >= 1 && sunRecede < 1, core: halo >= 1,
        annulus: settle / NS,                            // 0..1 dab-in of the cobalt ring
        breath: L.motion.haloBreath(t),
      },
      column: { on: cnt(T.column.on) / T.column.on.length, p: settle ? 1 - settle / NS : cnt(T.column.on) / T.column.on.length, leaving: settle > 0 },
      mound: { lit: on(T.mound.lit) },
      flowers: L.flowers.map((f) => ({ id: f.id, open: on(f.opens), tau: t - L.ft(f.opens) })),
    };
  }

  // ------------------------------------------------------------------ draw
  const POP = { freq: 3.6, damping: 0.56 };              // 12 % overshoot, settled in ~8 frames

  function draw(ctx, t, { pose = null, slots = {} } = {}) {
    const c = cam(t), st = state(t);
    const plane = (par, fn) => E.withCamera(ctx, c, par, fn);
    const slot = (name) => { if (slots[name]) { ctx.save(); slots[name](ctx, t); ctx.restore(); } };

    // 1. wall primer (0) and sky dabs (0.15)
    E.blit(ctx, wall, 0, 0);
    plane(PLANE.sky, () => sky.draw(ctx, skyBox[0], skyBox[1]));

    // 2. zone tints (1.0)
    plane(1, () => {
      const d = st.dusk;
      if (d.sunset0) dusk.sunset0.draw(ctx);
      if (d.sunset1) dusk.sunset1.draw(ctx);
      if (d.dusk1) dusk.dusk1.draw(ctx);
      if (d.dusk2) dusk.dusk2.draw(ctx);
      for (let i = 0; i < d.recede; i++) dusk.recede[i].draw(ctx);
      const m = st.mist;
      if (m.out > 0) { if (m.p > 0) wash.final.draw(ctx, dawnBox[0], dawnBox[1], { p: m.p }); }
      else {
        for (let i = 0; i < m.build; i++) wash.build[i].draw(ctx);
        for (let i = 0; i < m.recede; i++) wash.recede[i].draw(ctx);
      }
    });

    // 3. small cloud (0.3)
    if (st.cloud.visible) plane(PLANE.cloud, () => cloud.draw(ctx, st.cloud.x, st.cloud.y));

    // 4. the sky stage on the subject plane: today's sun, the acts' sky things, tomorrow's ring, light column
    plane(1, () => {
      slot('back');
      const s = st.sun;
      if (s.visible) {
        const b = { scale: s.breath };
        if (s.warmSky) sun.warm.draw(ctx, S.x, S.y, b);
        if (s.annulus > 0) sun.annulus.draw(ctx, { p: s.annulus });
        if (s.white > 0) sun.white.draw(ctx, S.x, S.y, { ...b, p: s.white });
        if (s.peach > 0) sun.peach.draw(ctx, S.x, S.y, { ...b, p: s.peach });
        if (s.rim) sun.rim.draw(ctx, S.x, S.y, b);
        if (s.mid) sun.mid.draw(ctx, S.x, S.y, b);
        const NR = T.sun.recede.length, far = s.recede / NR;         // 0, 1/2, 1: the paler variant is dabbed over in two steps
        if (far > 0) sun.rimFar.draw(ctx, { p: far });
        if (s.core && far < 1) sun.core.draw(ctx, S.x, S.y, b);
        if (far > 0) sun.haloFar.draw(ctx, S.x, S.y, { ...b, p: far });
        if (far < 1) (s.blaze ? sun.blaze : sun.calm).draw(ctx, S.x, S.y);
        if (far > 0) sun.far.draw(ctx, S.x, S.y, { p: far });
      }
      slot('sky');
      const r = st.ring;
      if (r.visible) {
        ctx.save();
        ctx.globalAlpha *= r.strength;
        if (r.dashes < RG.dashes) ring.wedge(ctx, r.dashes);
        (r.crumble ? ring.out : ring.painted).draw(ctx, RG.x, RG.y, { p: r.p });
        ctx.restore();
      }
      if (t >= ring.tOut && t < L.ft(T.ring.specksGone) + 0.2) ring.burst.draw(ctx, RG.x, RG.y, t - ring.tOut, { alpha: T.ring.reink[1] });
      const col = st.column;
      if (col.p > 0) (col.leaving ? column.out : column.painted).draw(ctx, column.box[0], column.box[1], { p: col.p });
    });

    // 5. far plane (0.7): act 2's deepened sky and far light; then the far ridge (0.5); then the mist (0.7)
    if (slots.far) plane(PLANE.far, () => slot('far'));
    plane(PLANE.ridge, () => ridge.draw(ctx));
    {
      const m = st.mist;
      if (m.build > 0 && m.p > 0) {
        plane(PLANE.mist, () => {
          ctx.translate(m.dx, 0);
          if (m.out > 0) mist.final.draw(ctx, mistBox[0], mistBox[1], { p: m.p });
          else {
            for (let i = 0; i < m.build; i++) mist.build[i].draw(ctx);
            for (let i = 0; i < m.thick; i++) mist.thick[i].draw(ctx);
            for (let i = 0; i < m.recede; i++) mist.recede[i].draw(ctx);
          }
        });
      }
    }

    // 6. subject plane: act things on the ground, the rise, the man, the hedge with its flowers
    plane(1, () => {
      slot('mid');
      (st.coat2 ? mound.full : mound.base).draw(ctx);
      if (st.mound.lit) mound.lit.draw(ctx);
      if (st.coat2) flora.rosettesBack.draw(ctx, 0, 0);             // the leaves that pass behind his legs

      if (st.man.p > 0) {
        const p = pose ?? (t < L.ft(T.man.turn[0]) ? man.POSES.front_neutral_bowed : man.POSES.back_neutral);
        ctx.save();
        man.draw(ctx, t, { pose: p, warm: st.man.warm, p: st.man.p, hands: slots.hands ? (cx) => { const k = cx ?? ctx; k.save(); slots.hands(k, t); k.restore(); } : null });
        ctx.restore();
      }

      (st.coat2 ? hedge.full : hedge.base).draw(ctx);
      if (st.coat2) {
        flora.rosettes.draw(ctx, 0, 0);
        flora.e1.bud.draw(ctx, flora.e1.x, flora.e1.y);
        for (const f of flora.flowers) {
          const fs = st.flowers[f.i - 1];
          const sc = fs.open ? E.spring(fs.tau + 1 / L.fps, POP) : 0;      // the opening frame already shows it
          if (sc < 0.72) f.bud.draw(ctx, f.x, f.y + 14, sc > 0 ? { scale: 1 - sc * 0.6 } : undefined);
          if (sc > 0) {
            const sw = L.motion.flowerSway(f.i, t);
            f.flower.draw(ctx, f.x + sw.dx, f.y, { scale: sc, rot: sw.rot + E.popTwist(fs.tau, Math.PI / 2) });
          }
        }
      }
      slot('front');
    });

    // 7. ambient specks (1.2, sky stage only), then the acts' screen-space layer
    specks.draw(ctx, t, c);
    slot('top');
  }

  return {
    layout: L, man, wall, cam, toScreen, withPlane, state, draw,
    planes: PLANE,
    /** world y: while a gloss is up nothing lighter than hedge_mid may reach below this row (YARIN sets it) */
    lightFloor: LIGHT_FLOOR,
    /** layer boxes of the baked shared layers (for edge checks and for acts that want to line up) */
    boxes: { sky: skyBox, dusk: duskBox, predawn: dawnBox, mist: mistBox, ridge: ridgeBox, mound: moundBox, hedge: hedgeBox, visible1: R1 },
    /** the baked shared sprites (read-only: for inspection and tests) */
    sprites: { sky, cloud, dusk, wash, mist, ridge, mound, hedge, flora, sun, column, ring, specks },
  };
}
