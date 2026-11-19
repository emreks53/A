// rug.js — the prayer rug (seccade) on the knoll's face, in miniature-painting view (act 2, mid / front slots).
//
//   21.33 / 21.40   the ROLLED rug is printed just below the plateau's edge, in the door's spilled light
//   21.43–21.93     it unrolls down the slope toward us, quart ease-out (fast first, long settle): the top
//                   border, the top fringe and the whole pointed mihrab niche are out by 21.67
//   21.73 / 21.80   the niche begins to GLOW with the light of the seam and the doorway (two steps)
//   21.90–21.97     the roll is spent; the bottom fringe flicks out and settles
//   22.90–23.07     LINK 1 (front slot): the niche's own light swells once — one soft bloom, no rings
//
// The rug is one baked print; the unrolling is a moving cut (nothing is stretched). The roll is a live cut of
// a pinned texture that only gets thinner.

export function makeRug(E, W, U) {
  const L = W.layout, P = L.pal, { shape, clamp, lerp, smoothstep: ss } = E;
  const { TL: T, ft, on, nf, prog, kf } = U;
  const R = L.rug, N = R.niche;
  const once = (k, f) => E.once('act2/rug/' + k, f);

  // ------------------------------------------------------------------ geometry (world px)
  const cx = N.centre[0];                                                   // 1040
  const Y0 = R.top_edge.y, Y1 = R.bottom_edge.y, LEN = Y1 - Y0;             // 812, 1085, 273
  const hw0 = (R.top_edge.x1 - R.top_edge.x0) / 2, hw1 = (R.bottom_edge.x1 - R.bottom_edge.x0) / 2;   // 108, 118
  const hwAt = (y) => lerp(hw0, hw1, (y - Y0) / LEN);
  const FR = R.fringe;                                                      // 18
  const trap = (inset, ya = Y0 + inset, yb = Y1 - inset) => shape.polygon([[cx - hwAt(ya) + inset, ya], [cx + hwAt(ya) - inset, ya], [cx + hwAt(yb) - inset, yb], [cx - hwAt(yb) + inset, yb]]);
  const BORDER = 15;
  const nicheArch = (grow = 0) => shape.arch(cx, N.base_y + grow, N.w + 2 * grow, N.h + 2 * grow, 0.86);
  const BOX = [cx - hw1 - 16, Y0 - FR - 6, cx + hw1 + 16, Y1 + FR + 8];
  const ROLL_H = R.roll.h;                                                  // 46

  const A = once('all', () => {
    const a = {};
    // --- border: ivory with a brick zigzag and a thin gold line
    const zig = (c) => {
      c.strokeStyle = P('brick_detail'); c.lineWidth = 3; c.lineJoin = 'miter';
      const run = (x0, y0, x1, y1, n) => { c.beginPath(); for (let i = 0; i <= n; i++) { const u = i / n, s = i % 2 ? 3.4 : -3.4, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny); const px = lerp(x0, x1, u) + (nx / l) * s, py = lerp(y0, y1, u) + (ny / l) * s; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); };
      const m = BORDER / 2 + 0.5;
      run(cx - hwAt(Y0 + m) + m + 8, Y0 + m, cx + hwAt(Y0 + m) - m - 8, Y0 + m, 20);
      run(cx - hwAt(Y1 - m) + m + 8, Y1 - m, cx + hwAt(Y1 - m) - m - 8, Y1 - m, 22);
      run(cx - hwAt(Y0 + m) + m, Y0 + m + 8, cx - hwAt(Y1 - m) + m, Y1 - m - 8, 26);
      run(cx + hwAt(Y0 + m) - m, Y0 + m + 8, cx + hwAt(Y1 - m) - m, Y1 - m - 8, 26);
    };
    const border = E.bakeStencil({
      shape: trap(0), base: P('rug_border'), anchor: [0, 0], seed: 2401, bleed: { color: '#C9B9A6', amount: 0.7 },
      layers: [
        { color: '#F6EFE2', coverage: 0.5, size: 40, tint: 0.015, pores: 0.3, patch: { scale: 80, amount: 0.4 } },
        { color: '#DCCFC0', coverage: 0.3, size: 30, stamps: 'open', tint: 0.02, patch: { scale: 80, amount: 0.5 } },
      ],
      details: { print: 'print', draw: zig },
      edge: { color: '#B9A2A4', width: 3, opacity: 0.5 },
    });
    // --- field: madder red, pink and deep sponge dabs
    const fieldLit = (x, y) => clamp(0.5 + (x - cx) / 300 - (y - (Y0 + Y1) / 2) / 500);
    const goldLine = trap(BORDER + 2.5);
    const fld = E.bakeStencil({
      shape: trap(BORDER), base: P('rug_field'), anchor: [0, 0], seed: 2402, bleed: false,
      layers: [
        { color: '#8A2F25', coverage: 0.4, size: 44, stamps: 'open', pores: 0.3, maskFn: (x, y) => 1 - 0.6 * fieldLit(x, y), patch: { scale: 100, amount: 0.4 } },
        { color: P('rug_field_dabs', 0), coverage: 0.5, size: 40, stamps: 'body', pores: 0.3, maskFn: (x, y) => 0.4 + 0.6 * fieldLit(x, y), patch: { scale: 90, amount: 0.36 } },
        { color: P('rug_field_dabs', 1), coverage: 0.2, size: 22, stamps: 'open', maskFn: (x, y) => ss(0.4, 0.8, fieldLit(x, y)), patch: { scale: 70, amount: 0.5 } },
        { color: P('primer'), coverage: 0.04, size: 16, stamps: 'soft' },
      ],
      details: { print: 'print', draw: (c) => { c.strokeStyle = P('rug_gold_line'); c.lineWidth = 2.6; c.stroke(goldLine.path); } },
    });
    // small ivory lozenges in the red field, left and right of the niche panel and below it
    const loz = [];
    const lozenge = (x, y, r) => shape.polygon([[x, y - r * 1.3], [x + r, y], [x, y + r * 1.3], [x - r, y]]);
    for (const s of [-1, 1]) for (const y of [880, 950, 1020]) loz.push(lozenge(cx + s * (hwAt(y) - BORDER - 13), y, 5));
    for (const dx of [-52, 0, 52]) loz.push(lozenge(cx + dx, N.base_y + 21, dx ? 4.4 : 5.4));
    const lozenges = E.bakeStencil({ shape: shape.union(...loz), base: '#F1E3CC', anchor: [0, 0], seed: 2403, bleed: false,
      layers: [{ color: P('rug_gold_line'), coverage: 0.3, size: 10, stamps: 'open' }] });
    // --- the mihrab panel: deep-green spandrels round an ivory-peach pointed niche (apex toward the door)
    const PX = 9, panel = shape.roundRect(cx - N.w / 2 - PX, N.apex_y - 9, N.w + 2 * PX, N.h + 18, 3);
    const spandrel = E.bakeStencil({
      shape: panel, base: P('rug_spandrel_green'), anchor: [0, 0], seed: 2404, bleed: false,
      layers: [
        { color: '#1F5C3A', coverage: 0.4, size: 34, stamps: 'open', patch: { scale: 70, amount: 0.4 } },
        { color: '#3F8A54', coverage: 0.4, size: 24, stamps: 'body', pores: 0.3, maskFn: (x) => ss(cx - 20, cx + 70, x), patch: { scale: 60, amount: 0.4 } },
        { color: P('flower_pink'), coverage: 0.07, size: 9, stamps: 'dense', even: true, maskFn: (x, y) => ss(N.apex_y + 70, N.apex_y + 30, y) },
      ],
      edge: { color: P('rug_gold_line'), width: 2.4, opacity: 0.8, dir: null },
    });
    const nicheS = nicheArch(0);
    const niche = E.bakeStencil({
      shape: nicheS, base: P('rug_niche'), anchor: [0, 0], seed: 2405, bleed: false,
      layers: [
        { color: '#FBEBD2', coverage: 0.5, size: 44, tint: 0.015, pores: 0.3, maskFn: (x, y) => ss(N.base_y, N.apex_y + 40, y), patch: { scale: 90, amount: 0.36 } },
        { color: '#EBC69C', coverage: 0.4, size: 34, stamps: 'open', pores: 0.3, maskFn: (x, y) => ss(N.apex_y + 90, N.base_y, y) * 0.8 + ss(cx, cx - 70, x) * 0.4, patch: { scale: 80, amount: 0.5 } },
        { color: P('primer'), coverage: 0.06, size: 18, stamps: 'soft' },
      ],
      edge: [{ color: P('rug_gold_line'), width: 3, opacity: 0.85, dir: null }, { color: '#C9A27A', width: 7, opacity: 0.4 }],
    });
    // --- fringes: ivory tassels at both ends
    const tassels = (y, dir, seed) => {
      const rng = E.makeRng(seed), parts = [], hw = hwAt(y) - 3;
      for (let x = -hw; x <= hw + 0.1; x += 8.6) {
        const lean = rng.sym(1.6) + (x / hw) * 1.8, len = FR * rng.range(0.82, 1.06);
        parts.push(shape.ribbon([[cx + x, y - dir * 2], [cx + x + lean * 0.4, y + dir * len * 0.5], [cx + x + lean, y + dir * len]], [3.6, 2.2]));
      }
      return E.bakeStencil({ shape: shape.union(...parts), base: '#F3EADB', anchor: [0, 0], seed, bleed: false,
        layers: [{ color: '#D8C8B4', coverage: 0.36, size: 12, stamps: 'open' }, { color: '#FFFDF6', coverage: 0.3, size: 10, stamps: 'body' }] });
    };
    a.fringeTop = tassels(Y0, -1, 2406);
    a.fringeBot = tassels(Y1, 1, 2407);
    // the whole rug (without the bottom fringe, which flicks out by itself)
    a.rug = E.bakeSprite({ bounds: BOX, anchor: [0, 0], seed: 2408, draw: (c) => {
      a.fringeTop.draw(c, 0, 0); border.draw(c, 0, 0); fld.draw(c, 0, 0); lozenges.draw(c, 0, 0); spandrel.draw(c, 0, 0); niche.draw(c, 0, 0);
    } });
    // a soft shadow dab along its left side and foot: it lies on the grass
    a.shadow = E.makeCluster({
      w: BOX[2] - BOX[0] + 60, h: BOX[3] - BOX[1] + 40, seed: 2409, anchor: [30 - BOX[0], -BOX[1]], edgeSoftness: 0.8,
      shapeFn: (x, y) => { const wx = x + BOX[0] - 30, wy = y + BOX[1]; const l = cx - hwAt(wy); return clamp(Math.max(Math.min((wx - (l - 20)) / 12, (l + 8 - wx) / 10, (wy - Y0 - 10) / 30, (Y1 + 16 - wy) / 20), Math.min((wy - (Y1 - 4)) / 8, (Y1 + 20 - wy) / 12, (wx - l + 12) / 20, (cx + hwAt(wy) - 30 - wx) / 60))); },
      layers: [{ color: '#27644A', coverage: 0.6, size: 26, stamps: 'body', pores: 0.3 }, { color: '#1F5540', coverage: 0.3, size: 18, stamps: 'open' }],
      reveal: { steps: 1 },
    });

    // --- the roll: madder red seen from above, darker underneath, an ivory spiral at its right end
    const RW = 2 * hw1 + 40, RT = [0, 0, RW, 64];                           // roll texture, local: centre line y = 32
    a.rollTex = E.bakeStencil({ shape: shape.rect(0, 0, RW, 64), base: '#9A382B', anchor: [0, 0], pad: 0, seed: 2410, bleed: false,
      reveal: { steps: 2, mode: 'mask', order: 'sweep', angle: 0, jitter: 0.3, dab: 60 },
      layers: [
        { color: '#7C2A22', coverage: 0.7, size: 30, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(34, 44, y) },
        { color: P('rug_field_dabs', 0), coverage: 0.7, size: 26, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(30, 20, y) * ss(4, 12, y) },
        { color: P('rug_field_dabs', 1), coverage: 0.4, size: 14, stamps: 'open', maskFn: (x, y) => ss(24, 18, y) * ss(10, 15, y) },
      ],
      details: { print: 'print', opacity: 0.8, draw: (c) => { c.fillStyle = P('rug_border'); for (const x of [16, RW - 34]) c.fillRect(x, 0, 9, 64); c.fillStyle = P('brick_detail'); for (const x of [19, RW - 31]) c.fillRect(x, 0, 3, 64); } },
    });
    a.spiral = E.bakeStencil({ shape: shape.rect(0, 0, 64, 64), base: P('rug_border'), anchor: [0, 0], pad: 0, seed: 2411, bleed: false,
      reveal: { steps: 2, mode: 'mask', order: 'random', dab: 40 },
      layers: [{ color: '#F6EFE2', coverage: 0.4, size: 20, stamps: 'body' }],
      details: { print: 'solid', draw: (c) => {
        c.strokeStyle = '#8A2F25'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath();
        for (let i = 0; i <= 80; i++) { const th = i * 0.21, r = 2 + i * 0.3; const x = 32 + Math.cos(th) * r * 0.62, y = 32 + Math.sin(th) * r; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
        c.stroke();
      } } });
    a.rollW = RW;
    a.rollShadow = E.makeCluster({ points: [{ x: 0, y: 0, r: hw1 + 6, rx: hw1 + 6, ry: 13 }], anchor: [0, 0], seed: 2412, edgeSoftness: 0.8, reveal: { steps: 1 },
      layers: [{ color: '#27644A', coverage: 0.66, size: 24, stamps: 'body', pores: 0.3 }, { color: '#1F5540', coverage: 0.3, size: 16, stamps: 'open' }] });

    // --- the niche's glow (two steps): the same white-gold as the seam and the doorway
    const GR = [cx - N.w / 2 - 14, N.apex_y - 14, cx + N.w / 2 + 14, N.base_y + 14];
    const gd = (x, y) => Math.hypot((x - cx) / 62, (y - (N.centre[1] + 12)) / 92);
    a.glowTex = E.bakeStencil({ shape: shape.rect(GR[0], GR[1], GR[2] - GR[0], GR[3] - GR[1]), base: P('niche_glow'), anchor: [0, 0], pad: 0, seed: 2413, bleed: false,
      reveal: { steps: 2, mode: 'mask', order: 'radial', from: [cx, N.centre[1] + 20], dab: 70 },
      layers: [
        { color: P('door_glow'), coverage: 0.5, size: 34, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.7, 1.05, gd(x, y)), patch: { scale: 60, amount: 0.3 } },
        { color: '#F2BE48', coverage: 0.2, size: 20, stamps: 'open', maskFn: (x, y) => ss(0.9, 1.2, gd(x, y)) },
        { color: '#FFFDF6', coverage: 0.9, size: 36, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.74, 0.5, gd(x, y)) },
      ] });
    a.GR = GR;
    a.core = E.makeGlow({ rx: 34, ry: 56, color: '#FFFDF6', core: '#FFFFFF', density: 0.88, falloff: 0.55, seed: 2414 });
    // --- LINK 1: one soft bloom of the niche's own light (dab-in and back)
    a.bloom = E.makeCluster({
      points: [{ x: 0, y: 0, r: 150, rx: 122, ry: 150 }], anchor: [0, 0], seed: 2415, edgeSoftness: 0.85,
      reveal: { steps: 2, mode: 'mask', order: 'radial', from: [0, 0], dab: 80 },
      layers: [
        { color: P('door_glow'), coverage: 0.5, size: 54, stamps: 'body', pores: 0.4 },
        { color: P('niche_glow'), coverage: 0.6, size: 46, stamps: 'body', pores: 0.3, band: [0.25, 1] },
        { color: '#FFFDF6', coverage: 0.8, size: 44, stamps: 'body', pores: 0.3, band: [0.5, 1] },
      ],
    });
    return a;
  });

  // ------------------------------------------------------------------ timing
  const un = T.rug.unroll;
  /** revealed length (px from the top edge): 273 * (1 - (1 - u)^4) over 21.43–21.93 */
  const lenAt = (t) => LEN * (1 - (1 - prog(t, un[0], un[1])) ** 4);
  const glowP = (t) => (on(t, T.rug.glow[0]) ? E.dabP(t, ft(T.rug.glow[0]), { steps: 2 }) : 0);

  // ------------------------------------------------------------------ draw (mid slot, world px)
  function draw(ctx, t) {
    if (!on(t, T.rug.roll[0])) return;
    const len = lenAt(t), u = len / LEN;
    const yc = Y0 + 1 + u * (Y1 - Y0 - 6);                                  // the roll's centre line
    const flick = nf(t, T.rug.flick[0]);                                    // frames since 21.90
    const rollP = E.dabP(t, ft(T.rug.roll[0]), { steps: 2 });
    let h = ROLL_H * Math.sqrt(1 - 0.93 * u);
    if (flick > 0) h *= clamp(1 - flick / 2);
    // the unrolled part
    if (len > 0.5) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(BOX[0] - 40, BOX[1] - 4, BOX[2] - BOX[0] + 80, yc - BOX[1] + 4 + (flick >= 2 ? 40 : 0));
      ctx.clip();
      A.shadow.draw(ctx, 0, 0);
      A.rug.draw(ctx, 0, 0);
      ctx.restore();
    }
    // the bottom fringe flicks out as the roll is spent
    if (flick > 0) {
      const s = kf(flick, [[0, 0], [1, 0.7], [2, 1.3], [3, 0.94], [4, 1]]);
      ctx.save();
      ctx.translate(0, Y1); ctx.scale(1, s); ctx.translate(0, -Y1);
      A.fringeBot.draw(ctx, 0, 0);
      ctx.restore();
    }
    // the niche's glow
    const gp = glowP(t);
    if (gp > 0) {
      const arch = nicheArch(-7);
      E.drawStencil(ctx, arch, A.glowTex, { x: A.GR[0], y: A.GR[1], p: gp });
      if (gp >= 1) {
        ctx.save();
        ctx.clip(arch.path);
        A.core.draw(ctx, cx, N.centre[1] + 14, { scale: 1 + 0.05 * Math.sin((t - ft(T.rug.glow[1])) * 2.1) });
        ctx.restore();
      }
    }
    // the roll
    if (h > 1.5) {
      const hw = hwAt(yc) + 6;
      A.rollShadow.draw(ctx, cx - 4, yc + h * 0.5 + 3, { sy: clamp(h / ROLL_H, 0.3, 1), p: rollP >= 1 ? 1 : 0 });
      const body = shape.roundRect(cx - hw, yc - h / 2, 2 * hw, h, h / 2);
      E.drawStencil(ctx, body, A.rollTex, { x: cx - A.rollW / 2, y: yc - 32, p: rollP, edge: { color: '#5C1E19', width: Math.min(6, h * 0.2), opacity: 0.6, dir: [0, 1] } });
      const er = h / 2 - 1;
      if (er > 3) E.drawStencil(ctx, shape.ellipse(cx + hw - er * 0.62 - 1, yc, er * 0.62, er), A.spiral, { x: cx + hw - er * 0.62 - 1 - 32, y: yc - 32, p: rollP });
    }
  }

  /** LINK 1 (front slot): the bloom 22.90 -> back by 23.07 */
  function drawBloom(ctx, t) {
    const n = nf(t, T.links.bloom);
    if (n < -1e-6 || n >= 5 - 1e-6) return;
    const p = n < 1 ? 0.5 : n < 3 ? 1 : 0.5;
    A.bloom.draw(ctx, cx, N.centre[1] + 6, { p, scale: 1 + 0.02 * n });
  }

  return { draw, drawBloom, lenAt, glowP, nicheArch, sprites: A, box: BOX };
}
