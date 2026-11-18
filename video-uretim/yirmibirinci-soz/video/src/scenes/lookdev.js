// Look-dev: the reference world re-staged for 9:16, exercising every engine feature.
//   0.0–1.5  everything is dabbed in (sky build-up, sun, clouds, mosque stencils, foliage; flowers pop)
//   1.5–6.0  slow push-in with parallax, drifting clouds, breathing halo, swaying plants, specks
//   3.0–4.4  sample gloss over the calm foliage field kept free for it (world y 1312–1504)
//   4.6–5.4  one cloud is dabbed out print by print and breaks into drifting specks
//
// Layout rules shown here (carry them into real scenes):
//   * the building SITS: a warm ground strip lies under its base and the canopy overlaps the base by
//     >= 24 px at every x for the whole camera move (never a strip of sky under a stencil building);
//   * the gloss band is solid, calm deep green with dark sponge texture: the canopy is solid above it
//     (fade 60 px), `calm` keeps every light / warm / primer dab out, no sprig, flower or junction
//     sits in it, and the drifting specks fade inside it while the gloss is up (`exclude`);
//   * one cadence: every reveal of the opening is `on twos` on one beat grid ({every: 2, grid: true});
//   * hero flowers are grouped 3 + 2 + 1 at staggered heights and sizes (1 : 0.6 : 0.35), one pair
//     overlaps, each hero has stencil leaves tucked under it; their centres stay above y = 1651 and
//     left of x = 950; around them a layered thicket of stencil leaves in loose clumps (never an
//     evenly spaced or mirrored row: sprigs of 3 / 5 / 2 leaves, plants 2 + 1 + 1);
//   * blue sky (never a cloud) sits behind the ivory minaret; dark leaves sit on lighter fields.

const CLOUD_OUT = { t0: 4.6, order: { order: 'sweep', angle: 0, jitter: 0.3 } };
const BAND = [1312, 1504];   // world rows that can lie behind the gloss during the camera move
const GLOSS = { text: 'âhirete ait sandıkçık', t: 3.0, end: 4.4 };
// ONE cadence per shot: every reveal of the opening lands its stages on the same even frames
const TWOS = { every: 2, grid: true };

export default {
  id: 'lookdev',
  duration: 6,
  glosses: [GLOSS],

  init(E) {
    const rng = E.makeRng('lookdev');
    const { PAL } = E;
    this.sky = E.makeSky({
      w: 1300, h: 2180, seed: 21, sun: { x: 910, y: 430, r: 330 }, horizon: 1400,   // mood / zenith: the airy defaults
      clouds: [{ x: 1030, y: 1060, w: 230, h: 74, seed: 7 }],        // far, static, part of the sky
      // blue (never an island of primer, never a sun dab) behind the ivory minaret, the gold finial and
      // the two drifting white clouds; sky coordinates = world + (110, 130): the sky is drawn at (-110, -130)
      solid: [[333, 520, 118], [333, 690, 118], [333, 860, 118], [333, 1030, 118], [333, 1200, 118], [684, 655, 120],
        [575, 500, 140], [1000, 850, 165]],
    });
    this.sun = E.makeSun({ r: 84, seed: 2 });
    this.clouds = [
      { x: 450, y: 372, v: 7, par: 0.4, c: E.makeCloud({ w: 400, h: 130, seed: 1 }) },          // clear of the gold finial
      { x: 880, y: 720, v: 5, par: 0.45, c: E.makeCloud({ w: 330, h: 112, seed: 2, reveal: CLOUD_OUT.order }) },
      { x: 420, y: 150, v: 9, par: 0.35, c: E.makeCloud({ w: 300, h: 96, seed: 3 }) },
      { x: 30, y: 900, v: 3, par: 0.5, c: E.makeCloud({ w: 240, h: 84, seed: 4 }) },
    ];
    this.burst = E.makeBurst(this.clouds[1].c, {
      seed: 5, count: 170, duration: 0.7, order: CLOUD_OUT.order, wind: [78, -34], spread: 40, size: [5, 12],
    });
    this.mosque = E.makeMosque({ scale: 1.36, seed: 1 });
    this.mosqueAt = [566, 1280];
    // the ground the building stands on: a soft ochre / peach strip right under the base
    this.ground = E.makeCluster({
      w: 1500, h: 120, seed: 31, edgeSoftness: 0.6, anchor: [0, 0],
      shapeFn: (x, y) => E.clamp(1 - Math.abs(y - 56 - 7 * Math.sin(x / 130)) / 50),
      layers: [
        { colors: ['#C98A3C', '#D39A52'], coverage: 0.9, size: 70, pores: 0.3 },
        { color: PAL.peach, coverage: 0.5, size: 58, stamps: 'open', pores: 0.3, patch: { scale: 150, amount: 0.5 } },
        { color: '#C9785A', coverage: 0.16, size: 46, stamps: 'open', patch: { scale: 130, amount: 0.6 } },
        { color: PAL.primer, coverage: 0.1, size: 44, stamps: 'soft' },
      ],
      reveal: { steps: 4, order: 'sweep', angle: 0 },
    });

    // flowers: two small ones at the canopy line (sky behind them), then 3 + 2 + 1 in the lower third
    // at staggered heights; `under` = stencil leaves tucked beneath a hero flower [angle, length]
    const F = (x, y, r, seed, par, under = []) => ({
      x, y, r, par, f: E.makeFlower({ r, seed }), t0: 1.02 + rng.next() * 0.38, ph: rng.next() * 9, fr: rng.range(2.7, 3.3),
      under: under.map(([a, len], i) => ({
        leaf: E.makeLeaf({ len, wid: len * 0.46, bend: (i % 2 ? 1 : -1) * 4, seed: seed * 7 + i, sliver: true }),
        a, dx: Math.cos(a) * r * 0.5, dy: Math.sin(a) * r * 0.5,
      })),
    });
    this.flowers = [
      F(104, 1256, 28, 21, 1), F(1002, 1262, 26, 22, 1),
      F(148, 1548, 31, 27, 1), F(364, 1557, 52, 23, 1.04), F(250, 1614, 88, 31, 1.08, [[2.5, 118], [0.5, 104]]),
      F(858, 1556, 46, 24, 1.04), F(742, 1604, 78, 33, 1.08, [[0.25, 106], [2.75, 96]]),
      F(520, 1630, 40, 28, 1.04, [[-0.45, 66]]),
    ];

    this.fol = { x: -120, y: 1075 };
    this.foliage = E.makeFoliage({
      w: 1320, h: 870, seed: 3, fade: 60,
      top: (x) => 160 + 11 * Math.sin(x / 190 + 1.3) + 7 * Math.sin(x / 71 + 4),      // canopy line: world y 1217–1253
      calm: { y0: BAND[0] - this.fol.y, y1: BAND[1] - this.fol.y, amount: 1 },
      // no cream primer gaps where the white flowers sit (they would read as more blossoms)
      avoid: this.flowers.filter((f) => f.y > 1500).map((f) => [f.x - this.fol.x, f.y - this.fol.y, f.r * 1.2 + 50]),
    });
    const canopy = (x) => this.fol.y + this.foliage.topAt(x - this.fol.x);

    // stencil leaves. (a) three loose sprigs of DIFFERENT size on the canopy line, unevenly spaced;
    // (b) a few leaves that dip from the canopy toward the gloss band (they stop above y = 1300);
    // (c) a layered thicket on the yellow-green fields below the band: clumps fanning from a shared
    //     base, overlapping one another and the hero flowers. Dark leaves always on lighter fields.
    const leafKinds = Array.from({ length: 7 }, (_, i) => E.makeLeaf({ len: 64 + i * 6, wid: 29 + i * 2.6, bend: (i % 2 ? 1 : -1) * 4, seed: 40 + i }));
    const bigLeaves = Array.from({ length: 6 }, (_, i) => E.makeLeaf({ len: 88 + i * 11, wid: 40 + i * 4.6, bend: (i % 2 ? -1 : 1) * 5, seed: 60 + i, sliver: true }));
    this.leaves = [];
    [[90, 34, 3], [410, 46, 5], [760, 40, 2]].forEach(([sx, dy, n], si) => {
      const sy = canopy(sx) + dy, lean = rng.sym(0.25);
      for (let k = 0; k < n; k++) {
        const fan = n > 1 ? (k / (n - 1) - 0.5) : 0;
        this.leaves.push({
          x: sx + fan * 34 + rng.sym(8), y: sy + Math.abs(fan) * 14 + rng.sym(5), leaf: rng.pick(leafKinds),
          rot: -Math.PI / 2 + lean + fan * 1.9 + rng.sym(0.14), t0: 0.95 + si * 0.035 + k * 0.03, ph: rng.next() * 9, f: rng.range(2.7, 3.3),
        });
      }
    });
    [[212, 0.62], [566, 0.95], [636, 0.45], [868, 0.7], [982, 0.5]].forEach(([dx, down], i) => {
      const leaf = leafKinds[(i * 3) % 4], len = 64 + ((i * 3) % 4) * 6;
      const rot = Math.PI / 2 + (i % 2 ? 1 : -1) * (0.5 + 0.3 * down) + rng.sym(0.1);        // hanging, splayed left / right
      const y = Math.min(canopy(dx) + 20 + 26 * down, 1296 - Math.max(0, Math.sin(rot)) * len);  // the tip stays above 1296
      this.leaves.push({ x: dx, y, leaf, rot, t0: 1.0 + i * 0.03, ph: rng.next() * 9, f: rng.range(2.7, 3.3) });
    });
    this.leaves.sort((a, b) => a.y - b.y);
    // the thicket: [base x, base y, parallax, [[angle, kind index], …]] — and under every clump a soft
    // field of yellow-green dabs, so the dark leaves read ("a dark stencil sits on a lighter field")
    this.thicket = [];
    this.fields = [];
    const lightField = (seed, rx, ry) => E.makeCluster({
      points: [{ x: 0, y: 0, rx, ry, r: Math.max(rx, ry) }], seed, edgeSoftness: 0.8, anchor: [0, 0],
      layers: [
        { color: '#7FA653', coverage: 0.66, size: 84, pores: 0.3 },
        { color: '#A2C162', coverage: 0.4, size: 62, stamps: 'open', pores: 0.3, patch: { scale: 120, amount: 0.5 } },
        { color: '#7FA653', coverage: 0.1, size: 80, stamps: 'speck' },
      ],
      reveal: { steps: 4, order: 'sweep', angle: -Math.PI / 2 },
    });
    [
      [84, 1676, 1.06, [[-2.55, 2], [-1.6, 4], [-0.6, 1]]],
      [338, 1680, 1.06, [[-2.9, 1], [-2.1, 3], [-1.25, 5], [-0.35, 2]]],
      [468, 1584, 1.03, [[-2.25, 0], [-0.85, 1]]],
      [560, 1742, 1.07, [[-2.65, 3], [-1.5, 5], [-0.4, 2]]],
      [660, 1690, 1.06, [[-2.05, 2], [-0.2, 4]]],
      [868, 1676, 1.06, [[-2.75, 3], [-1.9, 5], [-1.0, 2], [-0.15, 0]]],
      [972, 1566, 1.03, [[-2.35, 1], [-1.3, 0]]],
      [210, 1790, 1.08, [[-2.7, 4], [-0.45, 2], [0.35, 0]]],
    ].forEach(([bx, by, par, fan], ci) => {
      this.fields.push({ x: bx, y: by - 62, c: lightField(70 + ci, 120 + fan.length * 16, 84) });
      fan.forEach(([a, k], j) => {
        this.thicket.push({
          x: bx + rng.sym(10), y: by + rng.sym(8), par, leaf: bigLeaves[k], rot: a + rng.sym(0.2),
          t0: 0.98 + ci * 0.03 + j * 0.025, ph: rng.next() * 9, f: rng.range(2.7, 3.3),
        });
      });
    });

    // tall plants behind the mass, each crowned by a flower or a bud — 2 + 1 + 1, uneven heights and gaps
    const bud = [E.makeBud({ r: 15, seed: 1 }), E.makeBud({ r: 12, seed: 2 })];
    const small = [E.makeFlower({ r: 34, seed: 11 }), E.makeFlower({ r: 30, seed: 12 })];
    this.plants = [
      { x: 112, y: 1310, plant: E.makePlant({ height: 432, seed: 1, lean: 0.06, leaves: 7 }), head: bud[0], t0: 0.8 },
      { x: 296, y: 1320, plant: E.makePlant({ height: 250, seed: 3, lean: 0.1, leaves: 4, leafLen: 70 }), head: small[0], t0: 0.933 },
      { x: 700, y: 1326, plant: E.makePlant({ height: 196, seed: 4, lean: -0.12, leaves: 3, leafLen: 62 }), head: small[1], t0: 1.0 },
      { x: 906, y: 1304, plant: E.makePlant({ height: 366, seed: 2, lean: -0.05, leaves: 6 }), head: bud[1], t0: 0.867 },
    ];

    this.specks = E.makeSpecks({
      seed: 9, count: 30, colors: [PAL.white, PAL.sunYellow, PAL.pink, PAL.primer, '#FFFFFF'],
      size: [5, 12], speed: [10, 24], angle: -0.45, spread: 0.6, wobble: 14,
    });
    this.cam = E.cameraPath([
      { t: 0 }, { t: 1.3 },
      { t: 6, x: 548, y: 968, zoom: 1.06, ease: E.ease.sine.inOut },
    ]);
  },

  draw(ctx, t, E) {
    const cam = E.driftCamera(this.cam(t), t, { seed: 4, amp: 4, period: 5 });
    const { dabP } = E;                                   // dab-ins advance one stage "on twos"

    E.withCamera(ctx, cam, 0.2, () => {
      this.sky.draw(ctx, -110, -130, { p: dabP(t, 0, { steps: this.sky.paint.steps, ...TWOS }) });
    });
    E.withCamera(ctx, cam, 0.25, () => {
      this.sun.draw(ctx, 800, 300, {
        t, p: dabP(t, 0.3, { steps: 4, ...TWOS }), haloP: dabP(t, 0.4, { steps: 5, ...TWOS }),
        pop: 0.86 + 0.14 * E.spring(t - 0.3, { freq: 2.2, damping: 0.6 }),
      });
    });
    this.clouds.forEach((c, i) => E.withCamera(ctx, cam, c.par, () => {
      const x = c.x + c.v * t;
      if (i === 1 && t >= CLOUD_OUT.t0 - 1e-6) {
        // dab-out: the finished cloud leaves print by print (mask reveal), specks peel off
        c.c.draw(ctx, x, c.y, { p: 1 - dabP(t, CLOUD_OUT.t0, { steps: c.c.steps, every: 3 }) });
        this.burst.draw(ctx, x, c.y, t - CLOUD_OUT.t0);
      } else c.c.draw(ctx, x, c.y, { p: dabP(t, 0.45 + i * 0.12, { steps: c.c.steps, ...TWOS }) });
    }));
    E.withCamera(ctx, cam, 0.85, () => {
      this.ground.draw(ctx, -210, this.mosqueAt[1] - 50, { p: dabP(t, 0.4, { steps: this.ground.steps, ...TWOS }) });
      this.mosque.draw(ctx, this.mosqueAt[0], this.mosqueAt[1], { t, t0: E.beat(0.45) });
    });
    E.withCamera(ctx, cam, 1, () => {
      for (const p of this.plants) {
        p.plant.draw(ctx, p.x, p.y, { t, p: dabP(t, p.t0, { steps: 7, ...TWOS }), head: p.head, headScale: E.popScale(t - p.t0 - 0.42) });
      }
      this.foliage.draw(ctx, this.fol.x, this.fol.y, { p: dabP(t, 0.5, { steps: 7, ...TWOS }) });
      for (const f of this.fields) f.c.draw(ctx, f.x, f.y, { p: dabP(t, 0.8, { steps: f.c.steps, ...TWOS }) });
      for (const l of this.leaves) {
        const s = E.popScale(t - l.t0, { freq: l.f });
        if (s > 0) l.leaf.draw(ctx, l.x, l.y, { rot: l.rot + 0.035 * Math.sin(t * 1.3 + l.ph), scale: s });
      }
    });
    for (const l of this.thicket) {
      const s = E.popScale(t - l.t0, { freq: l.f });
      if (s > 0) E.withCamera(ctx, cam, l.par, () => l.leaf.draw(ctx, l.x, l.y, { rot: l.rot + 0.03 * Math.sin(t * 1.15 + l.ph), scale: s }));
    }
    for (const f of this.flowers) {
      const tau = t - f.t0, s = E.popScale(tau, { freq: f.fr });
      if (s <= 0) continue;
      E.withCamera(ctx, cam, f.par, () => {
        const x = f.x + 3 * Math.sin(t * 0.9 + f.ph);
        for (const u of f.under) {
          const ls = E.popScale(tau + 0.06, { freq: f.fr });
          u.leaf.draw(ctx, x + u.dx * ls, f.y + u.dy * ls, { rot: u.a + 0.03 * Math.sin(t * 1.2 + f.ph + u.a), scale: ls });
        }
        f.f.draw(ctx, x, f.y, { rot: 0.06 * Math.sin(t * 1.1 + f.ph) + E.popTwist(tau), scale: s });
      });
    }
    // drifting specks keep clear of the words while the gloss is up (frame coordinates)
    E.withCamera(ctx, cam, 1.2, () => this.specks.draw(ctx, t, {
      alpha: E.tween(t, 1.2, 2.2) * 0.9, exclude: [120, 1300, 840, 230], excludeAlpha: E.glossAlpha(t, GLOSS),
    }));
  },
};
