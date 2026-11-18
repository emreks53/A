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
  // The engine's own sky recipe (light-blue ground, discrete cobalt prints toward the zenith, lavender,
  // bold islands of bare primer); only its transparent paint is used: the wall underneath is W.wall.
  const SKY_SEED = 14;
  const sky = once('sky', () => E.makeSky({
    w: skyBox[2] - skyBox[0], h: skyBox[3] - skyBox[1], seed: SKY_SEED, sun: null, horizon: null, mood: 0.56,
    zenith: [330 - skyBox[1], 800 - skyBox[1]],            // cobalt densest at the top, calm light blue behind him
  }).paint);

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
  const ridge = once('ridge', () => backfill(field({
    box: ridgeBox, seed: 331, edge: 0.5,
    depth: (x, y) => clamp((under(x, y) + 13) / 52),
    layers: [
      { color: P('ridge_lavender'), coverage: 0.985, size: 54, even: true, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(70, 40, under(x, y)) },
      { color: P('ridge_lavender'), coverage: 0.985, size: 120, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(34, 60, under(x, y)) },
      { color: '#A79DCB', coverage: 0.6, size: 78, stamps: 'body', pores: 0.6, maskFn: (x, y) => ss(16, 90, under(x, y)) * lerp(1, 0.6, ss(300, 900, x)), patch: { scale: 230, amount: 0.34 } },
      { color: '#C9BEDC', coverage: 0.46, size: 58, stamps: 'body', pores: 0.5, patch: { scale: 190, amount: 0.44 } },
      { color: '#9A90C2', coverage: 0.2, size: 44, stamps: 'open', maskFn: (x, y) => ss(40, 130, under(x, y)), patch: { scale: 170, amount: 0.6 } },
      { color: P('ridge_ivory'), coverage: 0.72, size: 46, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(46, 6, under(x, y)), patch: { scale: 150, amount: 0.36, sharp: 0.3 } },
      { color: '#F3ECE2', coverage: 0.4, size: 30, stamps: 'open', maskFn: (x, y) => ss(24, 0, under(x, y)), patch: { scale: 150, amount: 0.5, sharp: 0.3 } },
      { color: P('primer'), coverage: 0.1, size: 44, stamps: 'soft', patch: { scale: 160, amount: 0.6 } },
    ],
  }), P('ridge_lavender'), (x) => L.crest(x) + 20));

  // ------------------------------------------------------------------ mound (plane 1.0)
  const M = L.mound;
  const moundBox = [M.x0 - 50, M.topY - 40, M.x1 + 50, L.lipY + 44];
  const mUnder = (x, y) => y - M.top(clamp(x, M.x0 - 40, M.x1 + 40));
  const moundDepth = (x, y) => clamp((mUnder(x, y) + 10) / 46);
  const upRight = (x, y) => clamp(0.5 + (x - 540) / 620 - (mUnder(x, y) - 30) / 150);       // 1 = top edge, right side
  const mound = once('mound', () => {
    const base = [
      { color: P('mound', 0), coverage: 0.985, size: 44, even: true, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(58, 36, mUnder(x, y)) },
      { color: P('mound', 0), coverage: 0.985, size: 96, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(30, 52, mUnder(x, y)) },
    ];
    const coat2 = [
      { color: P('hedge_dark'), coverage: 0.34, size: 60, stamps: 'open', patch: { scale: 150, amount: 0.5 } },
      { color: P('mound', 1), coverage: 0.74, size: 58, stamps: 'body', pores: 0.3, maskFn: (x, y) => 0.45 + 0.55 * upRight(x, y), patch: { scale: 150, amount: 0.3, sharp: 0.35 } },
      { color: '#63A94B', coverage: 0.5, size: 40, stamps: 'open', maskFn: (x, y) => ss(0.35, 0.8, upRight(x, y)), patch: { scale: 130, amount: 0.45, sharp: 0.35 } },
      { color: P('hedge_dark'), coverage: 0.16, size: 34, stamps: 'soft', patch: { scale: 120, amount: 0.6 } },
      { color: P('primer'), coverage: 0.08, size: 30, stamps: 'soft', maskFn: (x, y) => ss(70, 10, mUnder(x, y)), patch: { scale: 120, amount: 0.6 } },
    ];
    const litX = (x) => ss(M.lit.x[0] - 20, M.lit.x[0] + 60, x) * ss(M.lit.x[1] + 20, M.lit.x[1] - 60, x);
    const litY = (y) => ss(M.lit.y[1], M.lit.y[1] - 26, y);
    const lit = [
      { color: '#8CC152', coverage: 0.42, size: 46, stamps: 'body', pores: 0.4, maskFn: (x, y) => litX(x) * litY(y), patch: { scale: 130, amount: 0.34 } },
      { color: P('mound_lit', 0), coverage: 0.45, size: 44, stamps: 'body', pores: 0.3, maskFn: (x, y) => litX(x) * litY(y) * ss(0.05, 0.6, upRight(x, y)), patch: { scale: 120, amount: 0.24, sharp: 0.3 } },
      { color: P('mound_lit', 1), coverage: 0.4, size: 28, stamps: 'open', maskFn: (x, y) => litX(x) * ss(50, 4, mUnder(x, y)) * (0.45 + 0.55 * upRight(x, y)), patch: { scale: 100, amount: 0.34 } },
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
  const below = (x, y) => y - L.lip(x);                  // px below the lip line
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
  const hedge = once('hedge', () => {
    const top = (x, y) => ss(86, 58, below(x, y)), deep = (x, y) => ss(50, 76, below(x, y));
    const base = [
      { color: P('hedge_dark'), coverage: 0.99, size: 42, even: true, tint: 0.025, pores: 0, maskFn: top },
      { color: P('hedge_dark'), coverage: 0.99, size: 124, even: true, tint: 0.025, pores: 0, maskFn: deep },
      // the deep green is a POROUS print over the dark coat: the pores are what makes it sponge
      { color: P('hedge_deep'), coverage: 0.74, size: 40, stamps: 'body', tint: 0.03, pores: 0.6, maskFn: top, patch: { scale: 170, amount: 0.3 } },
      { color: P('hedge_deep'), coverage: 0.8, size: 96, stamps: 'body', tint: 0.035, pores: 0.7, maskFn: deep, patch: { scale: 300, amount: 0.26, sharp: 0.35 } },
    ];
    // the lip may be light only ABOVE the calm field: dab centres stay on / above the lip line
    const lipBand = (lo, hi, size) => (x, y) => ss(lo - 6, lo, below(x, y)) * ss(hi + 6, hi, below(x, y)) * (size ? lightOK(size)(x, y) : 1);
    const LIT = { scale: 190, amount: 0.5, sharp: 0.35, seed: 77 };     // one patch map: lights gather in the same places
    const near = (x, y) => ss(18, 44, below(x, y)), nearer = (x, y) => ss(6, 26, below(x, y));
    const coat2 = [
      { color: '#256648', coverage: 0.5, size: 62, stamps: 'open', tint: 0.03, pores: 0.5, maskFn: near, patch: { scale: 210, amount: 0.42 } },
      { color: '#18492F', coverage: 0.36, size: 56, stamps: 'open', tint: 0.03, maskFn: near, patch: { scale: 220, amount: 0.52, sharp: 0.4 } },
      { color: '#2F7A4C', coverage: 0.42, size: 44, stamps: 'body', tint: 0.03, pores: 0.5, maskFn: nearer, patch: LIT },
      { color: '#37845A', coverage: 0.24, size: 30, stamps: 'open', tint: 0.02, maskFn: nearer, patch: { ...LIT, amount: 0.62 } },
      { color: '#143F2A', coverage: 0.16, size: 36, stamps: 'soft', maskFn: nearer, patch: { scale: 160, amount: 0.6 } },
      // the lip: mid green, then yellow-green lights and a little warmth — all above the calm field
      { color: tone(P('hedge_mid'), -0.06), coverage: 0.86, size: 34, stamps: 'body', tint: 0.02, pores: 0.4, maskFn: lipBand(-12, 8, 0), patch: { scale: 140, amount: 0.2, sharp: 0.3 } },
      { color: P('hedge_mid'), coverage: 0.7, size: 30, stamps: 'body', tint: 0.03, pores: 0.4, maskFn: (x, y) => lipBand(-13, 4, 0)(x, y) * ss(LIGHT_FLOOR + 4, LIGHT_FLOOR - 12, y + 14), patch: { scale: 130, amount: 0.24, sharp: 0.3 } },
      { color: P('hedge_lip_light'), coverage: 0.7, size: 24, stamps: 'body', maskFn: lipBand(-14, 0, 24), patch: { scale: 130, amount: 0.3, sharp: 0.3 } },
      { color: '#C2DD7C', coverage: 0.3, size: 17, stamps: 'open', maskFn: lipBand(-14, -2, 17), patch: { scale: 130, amount: 0.5, sharp: 0.3 } },
      { colors: ['#C9785A', P('tomorrow_dashes')], coverage: 0.13, size: 20, stamps: 'soft', maskFn: lipBand(-12, 0, 20), patch: { scale: 120, amount: 0.6 } },
      { color: P('primer'), coverage: 0.07, size: 18, stamps: 'soft', maskFn: lipBand(-13, -2, 18) },
      // under the caption strip (decoration only, never lighter than hedge_mid)
      { color: '#438F4A', coverage: 0.26, size: 32, stamps: 'body', pores: 0.5, maskFn: (x, y) => deco(y), patch: { ...LIT, amount: 0.68 } },
    ];
    const depth = (x, y) => clamp((below(x, y) + 13) / 44);
    const spec = (layers) => backfill(field({ box: hedgeBox, depth, seed: 351, edge: 0.34, layers, k: HI }), P('hedge_dark'), (x) => L.lip(x) + 9);
    const baseCoat = spec(base);
    const full = spec([...base, ...coat2]);

    // Tone-on-tone leaf stencils, printed into the finished coat: a stencil-sharp cut filled with a
    // BROKEN sponge print (the ground shows through its pores), one small tone step from the ground,
    // no light edge. Larger and a little bolder below the gloss field.
    const rng = E.makeRng('world/hedge-leaves');
    const TS = 280;
    const print = (c1, c2, seed) => E.makeSpongeTexture({ w: TS, h: TS, seed, layers: [
      { color: c1, coverage: 0.82, size: 44, stamps: 'body', tint: 0.02, pores: 0.7 },
      { color: c2, coverage: 0.4, size: 28, stamps: 'open', tint: 0.02 },
    ] });
    const calmTex = [print(tone(P('hedge_deep'), 0.04), '#2F7A4C', 361), print(tone(P('hedge_dark'), -0.04), '#18492F', 362), print('#286C47', tone('#286C47', 0.05), 363)];
    const decoTex = [print('#2F7A4C', '#3B8A58', 364), print('#143F2A', '#1B5236', 365), ...calmTex];
    const sctx = full.painted.final.ctx;
    sctx.save();
    sctx.translate(-hedgeBox[0], -hedgeBox[1]);
    sctx.globalCompositeOperation = 'source-atop';      // leaves print on the hedge only (never above its lip)
    const sprig = (x, y, n, len, lean, set) => {
      for (let k = 0; k < n; k++) {
        const fan = n > 1 ? k / (n - 1) - 0.5 : 0;
        const l = len * rng.range(0.8, 1.12), wid = l * rng.range(0.4, 0.5);
        const shp = E.shape.place(E.shape.leaf(l, wid, rng.sym(l * 0.025)), {
          x: x + fan * l * 0.36 + rng.sym(5), y: y + Math.abs(fan) * l * 0.3 + rng.sym(5), rot: -Math.PI / 2 + lean + fan * 1.9 + rng.sym(0.16),
        });
        const [bx0, by0, bx1, by1] = shp.bounds;
        if (bx1 - bx0 > TS || by1 - by0 > TS) continue;
        const tx = Math.floor(bx0 - rng.next() * (TS - (bx1 - bx0))), ty = Math.floor(by0 - rng.next() * (TS - (by1 - by0)));
        E.drawStencil(sctx, shp, rng.pick(set), { x: tx, y: ty });
      }
    };
    // loose rows of sprigs through the field, bigger and bolder below it
    for (let y = CW.y0 + 74; y < hedgeBox[3] + 40; y += 100) {
      const low = y > CALM1 + 10, big = low ? 1.7 : 1;
      for (let x = hedgeBox[0] + rng.range(0, 150); x < hedgeBox[2] + 60; x += rng.range(140, 230) * big) {
        sprig(x, y + rng.sym(34), rng.int(3, 5), rng.range(52, 70) * big, rng.sym(0.5), low ? decoTex : calmTex);
      }
    }
    sctx.restore();
    return { base: baseCoat, full };
  });

  // ------------------------------------------------------------------ rosettes, buds, flowers (plane 1.0)
  const legs = [L.man.shoe_x[0] - 6, L.man.shoe_x[1] + 6];
  const FLOOR = Math.min(CW.y0 - 8, LIGHT_FLOOR);        // no rosette leaf below this row (gloss field in YARIN)
  const flora = once('flora', () => {
    const rng = E.makeRng('world/flora');
    const placed = [];                                   // leaves of all rosettes, drawn back to front
    const rosette = (cx, cy, reach, n, seed) => {
      for (let k = 0; k < n; k++) {
        // a fan over the upper half and the sides; nothing points down into the gloss field
        const a = lerp(-Math.PI * 1.13, Math.PI * 0.13, (k + 0.5 + rng.sym(0.22)) / n);
        let len = reach * rng.range(0.92, 1.12);
        const dx = Math.cos(a), dy = Math.sin(a);
        if (dy > 0) len = Math.min(len, (FLOOR - 4 - cy) / dy);
        // keep his legs clear
        const tipX = cx + dx * len;
        if (cx < legs[0] && tipX > legs[0]) len = (legs[0] - cx) / dx;
        if (cx > legs[1] && tipX < legs[1]) len = (legs[1] - cx) / dx;
        if (len < 22) continue;
        placed.push({ x: cx + dx * 4, y: cy + dy * 4, rot: a, z: cy + dy * len * 0.5, leaf: E.makeLeaf({ len, wid: len * rng.range(0.4, 0.48), bend: rng.sym(len * 0.07), seed: seed * 31 + k, sliver: dy < -0.55 && k % 3 !== 1 }) });
      }
    };
    L.flowers.forEach((f, i) => rosette(f.x, f.y, f.r + 15, 7, 400 + i));
    const e1 = L.buds[0];
    rosette(e1.x, L.lipY - 4, 34, 4, 420);
    placed.sort((a, b) => a.z - b.z);
    const stem = E.bakeStencil({
      shape: E.shape.ribbon([[e1.x, L.lipY], [e1.x + 2, (L.lipY + e1.y) / 2], [e1.x, e1.y + 12]], [6, 4]), base: '#2A6A43', seed: 421, bleed: false,
      anchor: [0, 0], pad: 3, layers: [{ color: '#17492E', coverage: 0.4, size: 18, stamps: 'open' }, { color: '#3C8442', coverage: 0.36, size: 14, stamps: 'open' }],
    });
    const rosettes = E.bakeSprite({
      bounds: [e1.x - 60, M.topY - 30, M.x1 + 40, FLOOR + 2], anchor: [0, 0], seed: 422,
      draw: (c) => {
        for (const l of placed) l.leaf.draw(c, l.x, l.y, { rot: l.rot });
        stem.draw(c, 0, 0);
      },
    });
    const bud = (seed) => E.makeBud({ r: 12, seed });
    return {
      rosettes,
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
    const veilLayer = (k) => ({ color: k ? '#D3E6EA' : '#F4E6BC', coverage: k ? 0.2 : 0.3, size: 38 - 6 * k, stamps: k ? 'speck' : 'soft', even: true, maskFn: (x, y) => ss(S.r * 1.02, S.r * 0.86, Math.hypot(x, y)) });
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
    return {
      calm: disc('#EFB449', calmLayers),
      blaze: disc(P('today_disc'), blazeLayers),
      receded: [1, 2].map((n) => disc(P('today_disc'), [...blazeLayers, ...Array.from({ length: n }, (_, k) => veilLayer(k))])),
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
      // the receded state: one pale sky-blue over-dab in two steps over halo and annulus
      veil: [0, 1].map((k) => field({ box: aBox, seed: 518 + k, edge: 0.4,
        depth: (x, y) => { const r = rad(x, y); return clamp(Math.min((r - S.r + 6) / 40, (A.r_out + 14 - r) / 60)); },
        layers: [{ color: k ? '#CFE6EC' : '#9FC8E0', coverage: k ? 0.14 : 0.26, size: 50 - 12 * k, stamps: k ? 'speck' : 'soft', even: true }] })),
    };
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
      cloud: { visible: on(T.coat2), x: L.motion.cloudX(t), y: L.cloud.layer_centre_at_t0[1] },
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
        if (s.core) sun.core.draw(ctx, S.x, S.y, b);
        (s.recede ? sun.receded[s.recede - 1] : s.blaze ? sun.blaze : sun.calm).draw(ctx, S.x, S.y);
        for (let i = 0; i < s.recede; i++) sun.veil[i].draw(ctx);
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
