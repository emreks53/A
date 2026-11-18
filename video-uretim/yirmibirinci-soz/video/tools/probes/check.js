// Engine self-check probe (run through tools/check.mjs at several render scales).
// Returns { hashes: {name: dab-list hash}, counts, fills, unit: [failed assertions] }.
export default async function (E, ctx, { scale }) {
  const hash = (dabs) => {
    let h = 2166136261 >>> 0;
    const add = (n) => { h ^= n & 0xffff; h = Math.imul(h, 16777619) >>> 0; h ^= (n >>> 16) & 0xffff; h = Math.imul(h, 16777619) >>> 0; };
    for (const d of dabs) {
      add(Math.round(d.x * 64)); add(Math.round(d.y * 64)); add(Math.round(d.size * 64)); add(Math.round(d.rot * 4096));
      add(d.stamp); add(d.li ?? 0); add(Math.round((d.rank ?? 0) * 1e6)); add(parseInt(d.color.slice(1), 16)); add(d.flip ? 1 : 0);
    }
    return `${dabs.length}:${h.toString(16)}`;
  };
  const hashes = {};
  // 1. raw scatter: random + even layers, every stamp family, patch + mask
  hashes.scatter = hash(E.scatterDabs([
    { color: '#80BED6', coverage: 0.93, size: 150 },
    { color: '#4E94CE', coverage: 0.5, size: 108, even: true, stamps: 'body', patch: { scale: 300, amount: 0.4 } },
    { color: '#A498D2', coverage: 0.3, size: 44, stamps: 'open', maskFn: (x, y) => x / 900 },
    { color: '#EFE4CF', coverage: 0.1, size: 24, stamps: 'speck' },
    { color: '#2C7048', coverage: 0.95, size: 300, stamps: 'dense' },
    { color: '#96C654', coverage: 0.6, size: 18, stamps: 'soft' },
    { color: '#F0A82E', coverage: 0.7, size: 72, stamps: 'airy', even: true },
  ], { w: 900, h: 700, seed: 5, reveal: { order: 'sweep', even: 'area' } }));
  // 2. the builders scenes use
  const sky = E.makeSky({ w: 900, h: 900, seed: 21, sun: { x: 640, y: 300, r: 240 }, horizon: 800, calm: { y0: 500, y1: 620 }, clouds: [{ x: 300, y: 300, w: 230, h: 74, seed: 7 }] });
  hashes.sky = hash(sky.paint.dabs);
  hashes.foliage = hash(E.makeFoliage({ w: 800, h: 500, seed: 3, calm: { y0: 200, y1: 300 } }).mass.dabs);
  const mosque = E.makeMosque({ scale: 0.6, seed: 1 });
  for (const [k, part] of Object.entries(mosque.parts)) hashes['mosque.' + k] = hash(part.dabs);
  hashes.flower = hash(E.makeFlower({ r: 60, seed: 3 }).dabs);
  hashes.leaf = hash(E.makeLeaf({ len: 110, seed: 4 }).dabs);
  hashes.cloud = hash(E.makeCloud({ w: 300, h: 100, seed: 2 }).dabs);
  hashes.glow = hash(E.makeGlow({ r: 160 }).dabs);
  hashes.sun = hash(E.makeSun({ r: 60 }).disc.dabs);
  hashes.text = hash(E.stencilText('BUGÜN', { size: 120, base: '#B4553A', layers: [{ color: '#C98A3C', coverage: 0.45, size: 60 }] }).dabs);
  // (mask-reveal print lists depend on the baked pixels at their borders: reported, not asserted)
  const info = { maskPrints: mosque.parts.dome._maskDabs().length, maskStages: mosque.parts.dome._maskN.join(',') };

  // 3. the frozen fill table against the tiles of this run
  const ft = E.stampFillTable();
  let maxErr = 0;
  ft.frozen.forEach((row, lv) => row.forEach((v, i) => { maxErr = Math.max(maxErr, Math.abs(v - ft.measured[lv][i])); }));
  const fills = { q: ft.q, maxErr, measured: ft.measured };

  // 4. unit checks (scale independent; run once)
  const unit = [];
  const ok = (cond, msg) => { if (!cond) unit.push(msg); };
  const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
  const throws = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };
  if (scale <= 1) {
    // generic track
    const tr = E.track([{ t: 0, v: { a: 0, s: 'open' } }, { t: 1, v: { a: 2, s: 'fist' } }, { t: 2, v: { a: 0, s: 'open' } }], { mode: 'spline' });
    ok(tr(0.5).s === 'open' && tr(1).s === 'fist' && tr(1.5).s === 'fist', 'track spline: discrete leaf must hold and switch on arrival');
    ok(tr(0.5).a > 0.5 && tr(0.5).a < 1.6, 'track spline: number leaf interpolates');
    ok(/different forms/.test(throws(() => E.track([{ t: 0, v: { fore: 0.2 } }, { t: 1, v: { fore: { rot: 1 } } }])) ?? ''), 'track: mixed forms must throw');
    ok(/missing/.test(throws(() => E.track([{ t: 0, v: { a: 1 } }, { t: 1, v: { a: 1, b: 2 } }])) ?? ''), 'track: missing key must throw');
    const hold = E.track([{ t: 0, v: 1 }, { t: 1, v: 5 }], { mode: 'hold' });
    ok(hold(0.99) === 1 && hold(1) === 5, 'track hold: switches ON the key');
    // poseTrack
    const pt = E.poseTrack([{ t: 0, v: { fore: 0.2 } }, { t: 1, v: { fore: { rot: 1, sprite: 'fist' }, head: 0.4 } }], { mode: 'ease' });
    const h = pt(0.5);
    ok(near(h.fore.rot, 0.6) && h.fore.sprite === undefined, 'poseTrack: number -> {rot} interpolates, sprite not before arrival');
    ok(near(h.head, 0.2), 'poseTrack: a part missing in a key counts as rest');
    ok(pt(1).fore.sprite === 'fist' && near(pt(1).fore.rot, 1), 'poseTrack: discrete value on arrival');
    ok(pt(0.99).fore.rot > 0.99 && pt(0.99).fore.rot < 1, 'poseTrack: no pop before the key');
    const sp = E.poseTrack([{ t: 0, v: { a: 0, b: { rot: 0, hide: true } } }, { t: 1, v: { a: 1, b: { rot: 1, hide: false } } }, { t: 2, v: { a: 0, b: 0 } }], { mode: 'spline' });
    ok(Number.isFinite(sp(0.5).a) && sp(0.5).b.hide === true && sp(1.2).b.hide === false, 'poseTrack spline: runs with discrete values');
    const lagged = E.poseTrack([{ t: 0, v: { a: 0, b: 0 } }, { t: 1, v: { a: 1, b: 1 } }], { offsets: { b: 0.1 } });
    ok(lagged(0.5).b < lagged(0.5).a, 'poseTrack offsets: the part lags');
    const lp = E.lagPose((t) => ({ a: t, b: t }), 1, { b: 0.2 });
    ok(near(lp.a, 1) && near(lp.b, 0.8), 'lagPose: per-part delay');
    // beat grid
    ok(near(E.beat(0.45), 0.4) && near(E.beat(0.5, 3), 0.5) && near(E.beat(0.95), 28 / 30), 'beat: snaps down to the grid');
    ok(E.dabP(13 / 30, 0.45, { steps: 6, grid: true }) === 1 / 6 && E.dabP(11 / 30, 0.45, { steps: 6, grid: true }) === 0, 'dabP grid: first stage on the beat');
    // rig: stretch carries the child joint, IK still lands
    const cap = (len, col) => E.bakeStencil({ shape: E.shape.capsule(len, 12, 10), anchor: [0, 0], base: col, layers: [], bleed: false });
    const rig = E.makeRig({ parts: {
      up: { sprite: cap(80, '#B4553A'), parent: null, at: [0, 0], z: 0 },
      lo: { sprite: cap(70, '#E0A47C'), parent: 'up', at: [80, 0], z: 1, tip: [70, 0] },
    } });
    const j = rig.joint('lo', { up: { rot: 0, sx: 0.5 } });
    ok(near(j[0], 40, 1e-6), 'rig sx: the child joint follows the stretched bone');
    const tip = rig.point('lo', [70, 0], { up: { sx: 0.5 }, lo: { sx: 0.5 } });
    ok(near(tip[0], 75, 1e-6), 'rig sx: a point of a stretched part');
    const reached = rig.reach({ up: { sx: 0.8 }, lo: { sx: 0.9 } }, 'up', 'lo', [60, 50], { soft: 0 });
    const got = rig.point('lo', [70, 0], reached);
    ok(Math.hypot(got[0] - 60, got[1] - 50) < 0.01, 'rig reach: exact with stretched bones');
    const b = rig.bounds({ up: 0.3 });
    ok(b[2] - b[0] > 100 && b[3] - b[1] > 30, 'rig.bounds');
    const baked = rig.bake({ up: 0.3 }, { density: 2, reveal: { order: 'sweep', angle: -Math.PI / 2 } });
    ok(baked.res === E.res * 2 && baked.at(0.5) && baked.inkBounds.w > 100, 'rig.bake: one sprite, density 2');
    const mask = rig.mask({ pose: { up: 0.3 }, steps: 5 });
    rig.draw(ctx, 300, 300, { up: 0.3 }, { through: mask, p: 0.4 });
    rig.draw(ctx, 300, 300, { up: 0.3 }, { through: mask, p: 1 });
    // shapes with several contours
    const ring = E.shape.ring(0, 0, 40, 60), disc = E.shape.ellipse(0, 0, 60);
    ok(E.shape.morph(ring, disc, 0.5).contours?.length === 2, 'morph ring -> disc keeps the hole while it closes');
    const uni = E.shape.union(E.shape.rect(0, 0, 50, 50), E.shape.ellipse(120, 25, 25));
    ok(uni.contours?.length === 2 && !throws(() => E.shape.dashes(uni, {})) && !throws(() => E.shape.dots(uni, {})) && !throws(() => E.shape.morph(uni, disc, 0.3)), 'union: dashes / dots / morph work');
    ok(/outline points/.test(throws(() => E.shape.dashes({ path: new Path2D(), bounds: [0, 0, 1, 1] })) ?? ''), 'custom path: clear error');
    ok(!throws(() => E.bakeStencil({ shape: uni, outline: { width: 6, dash: 14, gap: 10, side: 'outside' }, base: '#4A2328', anchor: [0, 0] })), 'bakeStencil outline');
    // lettering
    ok(/not available/.test(throws(() => E.stencilText('X', { font: '700 "No Such Font"' })) ?? ''), 'stencilText: unknown family throws');
    ok(/no loaded/.test(throws(() => E.stencilText('X', { font: '800 "EB Garamond"' })) ?? ''), 'stencilText: missing weight throws');
    const outl = E.stencilText('YARIN', { size: 120, base: '#4A2328', stroke: { width: 6, dash: 14, gap: 10 } });
    const arc = E.stencilText('BUGÜN', { size: 90, base: '#B4553A', path: E.curve([[0, 0], [150, -60], [300, 0]]), align: 'center' });
    const arcL = E.stencilText('DÜN', { size: 90, base: '#B4553A', path: [[0, 0], [150, -60], [300, 0]], perLetter: true });
    ok(outl.w > 300 && arc.w > 200 && arcL.letters.length === 3, 'stencilText: stroke / path / perLetter on a path');
    // fx
    const rays = E.makeRays({ count: 4, parallel: true, gap: 60, angle: 0.9, length: 260, split: true });
    ok(rays.rays.length === 4, 'makeRays parallel + split');
    rays.draw(ctx, 100, 100, { t: 1.3 });
    const stream = E.makeStream({ path: [[0, 0], [200, 100], [400, 0]], rate: 20, life: 1 });
    stream.draw(ctx, 0.37, { start: 0, stop: 5 });
    ok(stream.count === 20, 'makeStream');
    const specks = E.makeSpecks({ seed: 2, count: 10 });
    specks.draw(ctx, 1, { exclude: [100, 100, 400, 300], excludeAlpha: 1 });
    // live stencil extras
    const tex = E.makeSpongeTexture({ w: 200, h: 200, seed: 1, base: '#2C7048', layers: [{ color: '#96C654', coverage: 0.4, size: 60 }] });
    E.drawStencil(ctx, E.shape.ellipse(100, 100, 80), tex, { details: { print: 'print', draw: (c) => { c.fillStyle = '#4A2328'; c.fillRect(60, 80, 80, 20); } }, bleed: { color: '#2C7048' } });
    E.drawStencil(ctx, uni, tex, { outline: { width: 5, dash: 12, gap: 8, phase: 4 } });
    // density: same picture, twice the pixels
    const d1 = E.bakeStencil({ shape: disc, base: '#2C7048', anchor: [0, 0], layers: [{ color: '#96C654', coverage: 0.5, size: 40 }] });
    const d2 = E.bakeStencil({ shape: disc, base: '#2C7048', anchor: [0, 0], layers: [{ color: '#96C654', coverage: 0.5, size: 40 }], density: 2 });
    ok(d2.res === d1.res * 2 && d2.w === d1.w && hash(d1.dabs) === hash(d2.dabs), 'density 2: same dabs, same logical size');
  }
  return { hashes, info, fills, unit };
}
