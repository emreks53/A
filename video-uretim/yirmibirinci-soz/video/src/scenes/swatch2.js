// Diagnostic sheet 2 (not part of the film): the round-3 additions, one sample each.
//   node tools/render.mjs still --scene swatch2 --t 0.6 --ss 2 --out out/swatch2.png
// t = 0..1 drives reveals / morphs; the page also carries a DARK-ink gloss over a calm sky band.
//   row 1  lettering: dashed outline (stroke), a word on a path, per-letter dab-in on a path
//   row 2  outline of a union (true silhouette), ring -> disc morph (the hole closes), live stencil
//          with details + bleed, marching-dash outline of a union
//   row 3  parallel beams (split: each ray shimmers on its own), a split fan, a continuous stream
//   row 4  rig: along-bone stretch (sx), whole-figure reveal (rig.bake and {through: mask}), density 2
//   band   makeSky({calm}) behind a dark-ink gloss      last row: flowers and leaves at 1 : 1

const GLOSS = { text: 'gelecek', t: 0, end: 9, ink: 'dark' };

export default {
  id: 'swatch2',
  duration: 2,
  glosses: [GLOSS],

  init(E) {
    const { PAL } = E;
    const paint = (base, light) => ({ base, layers: [{ color: light, coverage: 0.45, size: 60, pores: 0.3 }, { color: PAL.primer, coverage: 0.06, size: 30, stamps: 'soft' }] });
    // --- row 1: lettering
    this.outlineWord = E.stencilText('YARIN', { size: 130, seed: 3, ...paint('#3F6FB0', PAL.lavender), stroke: { width: 7, dash: 16, gap: 11 }, bleed: false, reveal: { steps: 6, order: 'sweep', angle: 0 } });
    this.arcPath = E.curve([[0, 0], [150, -70], [300, 0]]);
    this.arcWord = E.stencilText('BUGÜN', { size: 92, seed: 4, ...paint(PAL.brick, PAL.ochre), path: this.arcPath, align: 'center' });
    this.arcLetters = E.stencilText('DÜN', { size: 92, seed: 5, ...paint('#6A4B7A', PAL.pink), path: [[0, 0], [110, 40], [220, 0]], align: 'center', perLetter: true, reveal: { steps: 5, order: 'sweep', angle: -Math.PI / 2 } });
    // --- row 2: outlines, contours, live stencil extras
    const house = E.shape.union(E.shape.rect(-70, -40, 140, 110), E.shape.polygon([[-90, -36], [0, -110], [90, -36]]), E.shape.ellipse(74, 40, 46));
    this.house = house;
    this.houseLine = E.bakeStencil({ shape: house, outline: { width: 7, dash: 18, gap: 12, side: 'outside' }, anchor: [0, 0], ...paint(PAL.maroon, PAL.brick), bleed: false });
    this.ring = E.shape.ring(0, 0, 46, 84);
    this.disc = E.shape.ellipse(0, 0, 84);
    this.gold = E.makeSpongeTexture({ w: 260, h: 260, seed: 15, base: PAL.gold, layers: [{ color: '#F7CE62', coverage: 0.5, size: 60 }, { color: PAL.ochre, coverage: 0.3, size: 50, stamps: 'open' }] });
    this.stone = E.makeSpongeTexture({ w: 260, h: 260, seed: 16, base: '#EFE7D8', layers: [{ color: '#DFCEBF', coverage: 0.5, size: 60, stamps: 'open' }, { color: '#FAF5EA', coverage: 0.4, size: 70 }] });
    this.green = E.makeSpongeTexture({ w: 300, h: 260, seed: 17, base: PAL.deepGreen, layers: [{ color: PAL.midGreen, coverage: 0.5, size: 60 }] });
    // --- row 3: light and streams
    this.beams = E.makeRays({ count: 4, parallel: true, gap: 62, angle: 0.95, inner: 0, length: 300, width: [30, 44], split: true, seed: 2 });
    this.fan = E.makeRays({ count: 7, spread: Math.PI * 0.9, inner: 30, length: 190, width: [12, 46], split: true, seed: 3 });
    this.streamPath = E.curve([[0, 0], [90, 90], [200, 40], [300, 150]]);
    this.stream = E.makeStream({ path: this.streamPath, rate: 22, life: 1.4, spread: 9, size: [9, 17] });
    // --- row 4: rig
    const limb = (len, r0, r1, col, density = 1) => E.bakeStencil({ shape: E.shape.capsule(len, r0, r1), anchor: [0, 0], base: col, layers: E.limbLayers(col, 2 * r0, { len, r0, r1, rich: 1 }), bleed: false, seed: len, density });
    const torso = (density = 1) => E.bakeStencil({ shape: E.shape.roundRect(-46, -140, 92, 160, 34), anchor: [0, 0], base: PAL.brick, layers: E.limbLayers(PAL.brick, 92, { rich: 1, joints: [[32, -114, 18]] }), bleed: false, density });
    const head = (density = 1) => E.bakeStencil({ shape: E.shape.ellipse(0, -26, 24, 28), anchor: [0, 0], base: PAL.skin, layers: E.limbLayers(PAL.skin, 48), bleed: false, density });
    const rigOf = (d) => E.makeRig({ parts: {
      torso: { sprite: torso(d), parent: null, at: [0, 0], z: 0 },
      head: { sprite: head(d), parent: 'torso', at: [0, -140], z: 1 },
      upper: { sprite: limb(76, 18, 15, PAL.brick, d), parent: 'torso', at: [32, -114], z: 2, rest: Math.PI / 2 },
      fore: { sprite: limb(70, 14, 12, PAL.skin, d), parent: 'upper', at: [76, 0], z: 3, tip: [70, 0] },
    } });
    this.rig = rigOf(1);
    this.rig2 = rigOf(2);
    this.poses = E.poseTrack([
      { t: 0, v: { upper: 0.2, fore: 0.3 } },
      { t: 0.5, v: { upper: -1.5, fore: { rot: -0.6, sx: 0.72 }, head: 0.12 } },      // foreshortened forearm
      { t: 1, v: { upper: -0.7, fore: -1.1, head: -0.08 } },
    ], { offsets: { fore: 2 / 30, head: 3 / 30 } });
    this.rigPose = { upper: -0.9, fore: -0.9, head: 0.06 };
    this.figure = this.rig.bake(this.rigPose, { reveal: { steps: 6, order: 'sweep', angle: -Math.PI / 2, jitter: 0.2 }, seed: 3 });
    this.rigMask = this.rig.mask({ pose: this.rigPose, steps: 6, seed: 4 });
    // --- sky band behind the dark gloss + flora samples
    this.sky = E.makeSky({ w: 1080, h: 470, seed: 8, mood: 0.6, zenith: [0, 330], calm: { y0: 130, y1: 320 } });
    this.flowers = [88, 60, 40, 30].map((r, i) => E.makeFlower({ r, seed: 51 + i }));
    this.leaves = [0, 1, 2, 3, 4].map((i) => E.makeLeaf({ len: 76 + i * 16, wid: 34 + i * 7, bend: (i % 2 ? 1 : -1) * 5, seed: 70 + i, sliver: true }));
    this.meadow = E.makeFoliage({ w: 1080, h: 300, seed: 9, fade: 30, top: () => 20 });
  },

  draw(ctx, t, E) {
    const p = E.clamp(t), u = E.ease.cubic.inOut(E.clamp(t));
    // row 1
    this.outlineWord.draw(ctx, 40, 190, { p: E.dabP(t, 0, { steps: 6 }) });
    this.arcWord.draw(ctx, 440, 230);
    this.arcLetters.draw(ctx, 810, 170, { t, t0: 0 });
    // row 2
    this.houseLine.draw(ctx, 150, 450);
    ctx.save(); ctx.translate(410, 440);
    E.drawStencil(ctx, E.shape.morph(this.ring, this.disc, u), this.gold, { x: -130, y: -130, edge: { color: E.PAL.maroon, width: 5, opacity: 0.5 } });
    ctx.restore();
    ctx.save(); ctx.translate(560, 320);
    E.drawStencil(ctx, E.shape.roundRect(20, 20, 150 + 60 * u, 220, 26), this.stone, {
      details: [{ print: 'print', draw: (c) => { c.fillStyle = '#A9604C'; for (let i = 0; i < 4; i++) c.fillRect(34, 50 + i * 26, 120 + 60 * u, 10); } },
        (c) => { c.fillStyle = E.PAL.maroon; c.fill(E.shape.arch(100, 226, 44, 66).path); }],
      bleed: { color: E.PAL.mauve }, edge: { color: E.PAL.mauve, width: 5, opacity: 0.5 },
    });
    ctx.restore();
    ctx.save(); ctx.translate(930, 450);
    E.drawStencil(ctx, this.house, this.green, { x: -150, y: -130, outline: { width: 7, dash: 18, gap: 12, side: 'outside', phase: t * 60 } });
    ctx.restore();
    // row 3
    this.beams.draw(ctx, 110, 620, { t: t * 4, p: 1 });
    this.fan.draw(ctx, 560, 830, { t: t * 4, angle: 0 });
    ctx.save(); ctx.translate(730, 640);
    this.stream.draw(ctx, t * 1.6, { start: 0.2 });
    ctx.restore();
    // row 4: live rig with lag + stretch | rig.bake dab-in | through-mask dab-in while moving | density 1 vs 2 at 2x
    this.rig.draw(ctx, 110, 1140, this.poses(p));
    this.figure.draw(ctx, 330, 1140, { p: E.dabP(t, 0, { steps: this.figure.steps, every: 3 }) });
    this.rig.draw(ctx, 530 + 30 * u, 1140, this.rigPose, { through: this.rigMask, p: E.dabP(t, 0, { steps: 6, every: 3 }), rot: 0.1 * u });
    ctx.save(); ctx.beginPath(); ctx.rect(690, 880, 190, 270); ctx.clip();
    this.rig.draw(ctx, 760, 1330, this.rigPose, { scale: 2 });
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(885, 880, 190, 270); ctx.clip();
    this.rig2.draw(ctx, 955, 1330, this.rigPose, { scale: 2 });
    ctx.restore();
    // sky band (the gloss sits on its calm rows) and flora
    this.sky.draw(ctx, 0, 1180);
    this.meadow.draw(ctx, 0, 1650);
    let x = 120;
    this.flowers.forEach((f, i) => { f.draw(ctx, x, 1800 - i * 8); x += f.w * 0.55 + 60; });
    this.leaves.forEach((l, i) => l.draw(ctx, 560 + i * 104, 1830, { rot: -1.9 + i * 0.32 }));
  },
};
