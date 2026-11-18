// Diagnostic sheet (not part of the film): every sponge stamp, layered textures, and one sample of
// each stencil feature. Handy when tuning the look or checking an API:
//   node tools/render.mjs still --scene swatch --t 0.6 --out out/swatch.png
// t animates the reveal progress of the samples in the bottom row (0..1 s).

export default {
  id: 'swatch',
  duration: 1,
  finish: false,

  init(E) {
    const { PAL } = E;
    const s = E.surface(E.W, E.H);
    const { ctx } = s;
    ctx.fillStyle = PAL.primer;
    ctx.fillRect(0, 0, E.W, E.H);

    // 1. the stamp set (4 columns: one row per kind — dense, mid, airy, speck)
    const n = E.stampCount(), cols = 8, cell = E.W / cols;
    const colors = [PAL.cobalt, PAL.deepGreen, PAL.lavender, PAL.brick];
    E.paintDabs(s, Array.from({ length: n }, (_, i) => ({
      x: (i % cols + 0.5) * cell, y: (Math.floor(i / cols) + 0.5) * cell, size: cell * 0.98,
      rot: 0, flip: false, squash: 1, stamp: i, color: colors[Math.floor(i / 4) % 4], alpha: 1,
    })));

    // 2. layered textures as scenes use them: sky-like, lit foliage, ivory stone
    const y0 = Math.ceil(n / cols) * cell + 20, h = 560, w = (E.W - 80) / 3;
    [
      E.makeSpongeTexture({ w, h, seed: 3, layers: [
        { color: PAL.lightBlue, coverage: 0.9, size: 150, patch: { scale: 300, amount: 0.25 } },
        { color: PAL.cobalt, coverage: 0.7, size: 120, patch: { scale: 260, amount: 0.55 } },
        { color: PAL.lavender, coverage: 0.3, size: 100, patch: { scale: 200, amount: 0.7 } },
      ] }),
      E.makeSpongeTexture({ w, h, seed: 4, base: PAL.darkGreen, layers: [
        { color: PAL.deepGreen, coverage: 0.8, size: 90 },
        { color: PAL.midGreen, coverage: 0.55, size: 80, shadeFn: (x, y) => E.clamp(1.2 - y / h) },
        { color: PAL.yellowGreen, coverage: 0.5, size: 70, shadeFn: (x, y) => E.clamp(0.9 - (y / h) * 1.4) },
      ] }),
      E.makeSpongeTexture({ w, h, seed: 5, base: PAL.ivory, layers: [
        { color: PAL.white, coverage: 0.5, size: 100 },
        { color: PAL.mauve, coverage: 0.3, size: 70, opacity: [0.5, 0.9], patch: { scale: 160, amount: 0.6 } },
      ] }),
    ].forEach((t, i) => t.draw(ctx, 20 + i * (w + 20), y0));
    this.sheet = s;
    this.y1 = y0 + h + 40;

    // 3. stencil features (revealed with t)
    this.letters = E.stencilText('BUGÜN', {
      font: '700 "Encode Sans"', size: 150, seed: 8, base: PAL.brick,
      layers: [{ color: PAL.ochre, coverage: 0.45, size: 60 }, { color: PAL.maroon, coverage: 0.25, size: 50, stamps: 'soft' }],
      reveal: { order: 'sweep', angle: 0 },
    });
    this.ring = E.bakeStencil({
      shape: E.shape.dashes(E.shape.ellipse(0, 0, 96), { dash: 34, gap: 20, width: 14 }), seed: 9, base: PAL.gold, anchor: [0, 0],
      layers: [{ color: '#F7CE62', coverage: 0.5, size: 50 }], bleed: false,
    });
    this.tile = E.bakeStencil({
      shape: E.shape.roundRect(-110, -110, 220, 220, 36), seed: 10, base: PAL.lightBlue,
      layers: [{ color: PAL.cobalt, coverage: 0.5, size: 80 }, { color: PAL.white, coverage: 0.2, size: 60, stamps: 'soft' }],
      edge: { color: PAL.maroon, width: 7, opacity: 0.55, dir: null },
    });
    this.cloth = E.makeSpongeTexture({ w: 460, h: 260, seed: 11, base: PAL.brick, layers: [
      { color: PAL.maroon, coverage: 0.4, size: 70 }, { color: PAL.peach, coverage: 0.3, size: 60, stamps: 'soft' },
    ] });
    this.composite = E.bakeSprite({
      bounds: [-120, -120, 120, 120], seed: 12,
      draw: (c) => { this.tile.draw(c, 0, 0, { scale: 0.6, rot: 0.3 }); this.ring.draw(c, 0, 0); },
    });

    // 4. puppet rig (IK reach, world-space edge), rays, morphing live stencil
    //    limbs carry real sponge texture along their length and stay calm inside the joint circles
    const limb = (len, r0, r1, col) => E.bakeStencil({ shape: E.shape.capsule(len, r0, r1), anchor: [0, 0], base: col, layers: E.limbLayers(col, 2 * r0, { len, r0, r1, rich: 1 }), bleed: false, seed: len });
    const torso = E.bakeStencil({ shape: E.shape.roundRect(-52, -150, 104, 170, 38), anchor: [0, 0], base: PAL.brick, layers: E.limbLayers(PAL.brick, 104, { rich: 1, joints: [[36, -122, 20]] }), bleed: false });
    this.rig = E.makeRig({ parts: {
      torso: { sprite: torso, parent: null, at: [0, 0], z: 0 },
      upper: { sprite: limb(84, 20, 17, PAL.brick), parent: 'torso', at: [36, -122], z: 2, rest: Math.PI / 2, edge: { color: '#5A2A22', width: 4, opacity: 0.5 } },
      fore: { sprite: limb(78, 16, 13, PAL.skin), parent: 'upper', at: [84, 0], z: 3, tip: [78, 0], edge: { color: '#8A5A40', width: 3, opacity: 0.45 } },
    } });
    this.rays = E.makeRays({ count: 9, inner: 36, length: 150, width: [12, 44], spread: Math.PI, seed: 3 });
    this.gold = E.makeSpongeTexture({ w: 240, h: 240, seed: 15, base: PAL.gold, layers: [{ color: '#F7CE62', coverage: 0.5, size: 60 }, { color: PAL.ochre, coverage: 0.3, size: 50, stamps: 'open' }] });
    this.shapeA = E.shape.ellipse(120, 120, 96);
    this.shapeB = E.shape.flower(120, 120, 112, 5, { notch: 0.5 });
    this.coin = E.bakeStencil({ shape: E.shape.ellipse(0, 0, 15), base: PAL.gold, layers: [{ color: '#F7CE62', coverage: 0.5, size: 18 }], bleed: false, anchor: [0, 0] });

    // 5. dial from shape.ring + shape.sector (timed group dab-in), per-letter lettering, glow on a dark ground
    const wedge = E.bakeStencil({ shape: E.shape.sector(0, 0, 0, 52, -Math.PI / 2, -Math.PI / 2 + Math.PI / 6), base: PAL.gold, layers: [{ color: '#F7CE62', coverage: 0.5, size: 30 }], anchor: [0, 0], bleed: false, reveal: { steps: 3 } });
    const rim = E.bakeStencil({ shape: E.shape.ring(0, 0, 58, 70), base: PAL.maroon, layers: [{ color: PAL.brick, coverage: 0.5, size: 44 }], anchor: [0, 0], reveal: { steps: 5 } });
    const ticks = E.bakeStencil({ shape: E.shape.dots(E.shape.ellipse(0, 0, 45), { r: 3.2, gap: 23.5 }), base: PAL.brown, anchor: [0, 0], bleed: false, reveal: { steps: 3 } });
    this.dial = E.group([{ node: rim, from: 0 }, { node: ticks, from: 0.3 }, { node: wedge, from: 0.5 }]);
    this.word = E.stencilText('YARIN', { font: '700 "Encode Sans"', size: 84, perLetter: true, seed: 4, base: PAL.cobalt, layers: [{ color: PAL.lavender, coverage: 0.4, size: 44 }], reveal: { steps: 5, order: 'sweep', angle: -Math.PI / 2 } });
    this.night = E.makeSpongeTexture({ w: 280, h: 150, seed: 21, base: '#27325A', layers: [{ color: '#33427A', coverage: 0.5, size: 90 }, { color: '#1C2444', coverage: 0.3, size: 70, stamps: 'open' }] });
    this.glow = E.makeGlow({ r: 66, color: '#F8DC78', seed: 6 });
    this.core = E.makeGlow({ r: 28, color: '#FFF3C2', seed: 7 });
  },

  draw(ctx, t, E) {
    E.blit(ctx, this.sheet);
    const p = E.clamp(t), y = this.y1;
    this.letters.draw(ctx, 40, y + 170, { p });
    this.ring.draw(ctx, 700, y + 110, { p });
    this.tile.draw(ctx, 940, y + 110, { p });
    // live stencil: the cut-out grows with t while the print underneath stays put
    ctx.save();
    ctx.translate(40, y + 250);
    E.drawStencil(ctx, E.shape.roundRect(0, 0, 40 + 420 * p, 260, 24).path, this.cloth, {
      edge: { color: E.PAL.maroon, width: 5, opacity: 0.5 },
    });
    ctx.restore();
    this.composite.draw(ctx, 700, y + 380, { p });
    this.ring.draw(ctx, 940, y + 380, { rot: t * 2, scale: 0.8 });
    // rig reaching for a coin that moves on an arc; rays; morph
    const y2 = y + 560;
    const target = E.arc([190, y2 + 170], [330, y2 + 60], 70).at(p);
    const pose = this.rig.reach({}, 'upper', 'fore', target, { x: 110, y: y2 + 250, bend: -1 });
    this.rig.draw(ctx, 110, y2 + 250, pose);
    this.coin.draw(ctx, target[0], target[1]);
    this.rays.draw(ctx, 560, y2 + 230, { p: 0.3 + 0.7 * p });
    ctx.save();
    ctx.translate(790, y2 + 20);
    E.drawStencil(ctx, E.shape.morph(this.shapeA, this.shapeB, p, { mode: 'radial' }), this.gold, { edge: { color: E.PAL.maroon, width: 6, opacity: 0.5 } });
    ctx.restore();
    // dial (timed group), per-letter word (timed), glow + core on a night ground (screen)
    const y3 = y2 + 388;
    this.dial.draw(ctx, 130, y3, { t: t * this.dial.duration, t0: 0 });
    this.word.draw(ctx, 300, y3 + 30, { t: t * this.word.duration(), t0: 0 });
    this.night.draw(ctx, 760, y3 - 75);
    this.glow.draw(ctx, 900, y3, { blend: 'screen', p });
    this.core.draw(ctx, 900, y3, { blend: 'screen', p });
  },
};
