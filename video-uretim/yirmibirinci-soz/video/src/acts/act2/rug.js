// rug.js — the prayer rug (seccade) on the knoll's face, in miniature-painting view (act 2, mid / front slots).
//
//   21.33 / 21.40   the ROLLED rug is printed just below the plateau's edge, in the door's spilled light
//   21.43–21.93     it unrolls down the slope toward us, quart ease-out (fast first, long settle): the top
//                   border, the top fringe and the whole pointed mihrab niche are out by 21.67
//   21.73 / 21.80   the niche begins to GLOW with the light of the seam and the doorway (two steps)
//   21.90–21.97     the roll is spent; the bottom fringe flicks out and settles
//   22.90–23.10     LINK 1 (front slot): the niche's own light swells once to fill the niche (+10 px), back in two steps
//
// The rug is one baked print; the unrolling is a moving cut (nothing is stretched). The roll is a live cut of
// a pinned texture that only gets thinner.

export function makeRug(E, W, U) {
  const L = W.layout, P = L.pal, { shape, clamp, lerp, smoothstep: ss } = E;
  const { TL: T, ft, on, nf, prog, kf } = U;
  const R = L.rug, N = R.niche;
  const once = (k, f) => E.once('act2/rug/' + k, f);

  // ------------------------------------------------------------------ geometry (world px)
  // The rug LIES on the slope (review, L2): it tapers 15 % toward the far end, its far border and far fringe are
  // thinner / shorter than the near ones, and it casts a soft shadow dab on the grass along its near and right
  // edge. Place, length and the niche's centre are the storyboard's; the niche itself is smaller (110 x 150).
  const cx = N.centre[0];                                                   // 1040
  const Y0 = R.top_edge.y, Y1 = R.bottom_edge.y, LEN = Y1 - Y0;             // 812, 1085, 273
  const hw1 = (R.bottom_edge.x1 - R.bottom_edge.x0) / 2, hw0 = Math.round(hw1 * 0.85);                 // 118 near, 100 far
  const hwAt = (y) => lerp(hw0, hw1, (y - Y0) / LEN);
  const FR = R.fringe, FR0 = 12, FR1 = FR + 3;                              // tassels: 12 px far, 21 px near
  const BT = 9, BB = 15, bsAt = (y) => lerp(9, 14, (y - Y0) / LEN);         // border: far 9, near 15, sides 9 -> 14 (the madder field is half of the rug)
  /** the rug's outline, or the trapezoid `k` border-widths inside it (1 = the field) */
  const trap = (k = 0, d = 0) => {
    const ya = Y0 + BT * k + d, yb = Y1 - BB * k - d;
    return shape.polygon([[cx - hwAt(ya) + bsAt(ya) * k + d, ya], [cx + hwAt(ya) - bsAt(ya) * k - d, ya], [cx + hwAt(yb) - bsAt(yb) * k - d, yb], [cx - hwAt(yb) + bsAt(yb) * k + d, yb]]);
  };
  const NW = 110, NH = 150, NA = N.centre[1] - NH / 2, NB = N.centre[1] + NH / 2;                       // niche: apex 875, base 1025
  const nicheArch = (grow = 0) => shape.arch(cx, NB + grow, NW + 2 * grow, NH + 2 * grow, 0.86);
  const NSPRING = NA + NW / 2 * (1 + 0.86 * 0.7) - 22;                       // the spandrels end a little above the arch's spring line (~941)
  const BOX = [cx - hw1 - 30, Y0 - FR0 - 8, cx + hw1 + 34, Y1 + FR1 + 22];
  const ROLL_H = R.roll.h;                                                  // 46

  const A = once('all', () => {
    const a = {};
    // --- border: ivory with a brick zigzag (larger toward us) and a thin gold line
    const zig = (c) => {
      c.strokeStyle = P('brick_detail'); c.lineJoin = 'miter';
      const run = (x0, y0, x1, y1, n, amp, lw) => { c.lineWidth = lw; c.beginPath(); for (let i = 0; i <= n; i++) { const u = i / n, s = i % 2 ? amp : -amp, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny); const px = lerp(x0, x1, u) + (nx / l) * s, py = lerp(y0, y1, u) + (ny / l) * s; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); };
      const ya = Y0 + BT / 2 + 0.5, yb = Y1 - BB / 2 - 0.5, ma = bsAt(ya) / 2 + 0.5, mb = bsAt(yb) / 2 + 0.5;
      run(cx - hwAt(ya) + ma + 7, ya, cx + hwAt(ya) - ma - 7, ya, 24, 1.9, 2.2);
      run(cx - hwAt(yb) + mb + 8, yb, cx + hwAt(yb) - mb - 8, yb, 22, 3.4, 3.1);
      run(cx - hwAt(ya) + ma, ya + 7, cx - hwAt(yb) + mb, yb - 8, 28, 2.5, 2.6);
      run(cx + hwAt(ya) - ma, ya + 7, cx + hwAt(yb) - mb, yb - 8, 28, 2.5, 2.6);
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
    // --- field: MADDER RED, the rug's dominant colour, with pink and deep sponge dabs (lighter toward the door's light)
    const fieldLit = (x, y) => clamp(0.5 + (x - cx) / 320 - (y - (Y0 + Y1) / 2) / 420);
    const goldLine = trap(1, 3);
    const fld = E.bakeStencil({
      shape: trap(1), base: P('rug_field'), anchor: [0, 0], seed: 2402, bleed: false,
      layers: [
        { color: '#8A2F25', coverage: 0.42, size: 44, stamps: 'open', pores: 0.3, maskFn: (x, y) => 1 - 0.6 * fieldLit(x, y), patch: { scale: 100, amount: 0.4 } },
        { color: P('rug_field_dabs', 0), coverage: 0.52, size: 40, stamps: 'body', pores: 0.3, maskFn: (x, y) => 0.4 + 0.6 * fieldLit(x, y), patch: { scale: 90, amount: 0.34 } },
        { color: P('rug_field_dabs', 1), coverage: 0.34, size: 24, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.3, 0.75, fieldLit(x, y)), patch: { scale: 70, amount: 0.42 } },
        { color: '#E5A698', coverage: 0.16, size: 15, stamps: 'open', maskFn: (x, y) => ss(0.45, 0.85, fieldLit(x, y)), patch: { scale: 60, amount: 0.5 } },
        { color: P('primer'), coverage: 0.035, size: 12, stamps: 'soft', opacity: 0.6 },
      ],
      details: { print: 'print', draw: (c) => { c.strokeStyle = P('rug_gold_line'); c.lineWidth = 2.6; c.stroke(goldLine.path); } },
    });
    // small ivory lozenges in the red field: a row above the niche, one below it, a column at either side
    const loz = [];
    const lozenge = (x, y, r) => shape.polygon([[x, y - r * 1.3], [x + r, y], [x, y + r * 1.3], [x - r, y]]);
    for (const sd of [-1, 1]) for (const [y, r] of [[886, 4.2], [950, 5], [1014, 5.8]]) loz.push(lozenge(cx + sd * (hwAt(y) - bsAt(y) - 22), y, r));
    for (const dx of [-46, 0, 46]) loz.push(lozenge(cx + dx, NB + 21, dx ? 4.8 : 6));
    for (const dx of [-34, 34]) loz.push(lozenge(cx + dx, NA - 19, 3.8));
    const lozenges = E.bakeStencil({ shape: shape.union(...loz), base: '#F1E3CC', anchor: [0, 0], seed: 2403, bleed: false,
      layers: [{ color: P('rug_gold_line'), coverage: 0.3, size: 10, stamps: 'open' }] });
    // --- the mihrab: a pointed niche of ivory-peach with gold dabs (apex toward the door); green ONLY in the two
    //     small spandrels above its shoulders; a thin gold line frames the panel
    const PX = 7, PY0 = NA - 8, panelW = NW + 2 * PX;
    const spandrel = E.bakeStencil({
      shape: shape.rect(cx - panelW / 2, PY0, panelW, NSPRING - PY0), base: P('rug_spandrel_green'), anchor: [0, 0], seed: 2404, bleed: false,
      layers: [
        { color: '#1F5C3A', coverage: 0.4, size: 26, stamps: 'open', patch: { scale: 50, amount: 0.4 } },
        { color: '#3F8A54', coverage: 0.4, size: 18, stamps: 'body', pores: 0.3, maskFn: (x) => ss(cx - 20, cx + 60, x), patch: { scale: 40, amount: 0.4 } },
        { color: P('flower_pink'), coverage: 0.06, size: 8, stamps: 'dense', even: true },
      ],
    });
    const frame = E.bakeStencil({ shape: shape.rect(cx - panelW / 2, PY0, panelW, NB + 7 - PY0), anchor: [0, 0], seed: 2416, bleed: false, base: P('rug_gold_line'),
      outline: { width: 2.4, side: 'inside' }, layers: [{ color: '#E0A850', coverage: 0.4, size: 12, stamps: 'body' }] });
    const nicheS = nicheArch(0);
    const NICHE = '#EDD5B0';                                                // ivory-peach, L* 87: the far light's core stays the frame's only white
    const niche = E.bakeStencil({
      shape: nicheS, base: NICHE, anchor: [0, 0], seed: 2405, bleed: false,
      layers: [
        { color: '#F3E2C6', coverage: 0.4, size: 36, tint: 0.015, pores: 0.3, maskFn: (x, y) => ss(NB, NA + 30, y), patch: { scale: 70, amount: 0.36 } },
        { color: '#E3BC8A', coverage: 0.46, size: 28, stamps: 'open', pores: 0.3, maskFn: (x, y) => ss(NA + 60, NB, y) * 0.8 + ss(cx, cx - 50, x) * 0.4, patch: { scale: 60, amount: 0.46 } },
        { color: '#D9A24A', coverage: 0.2, size: 15, stamps: 'body', patch: { scale: 44, amount: 0.52 } },                 // gold dabs
        { color: '#EBC060', coverage: 0.12, size: 11, stamps: 'open', patch: { scale: 44, amount: 0.5, seed: 3 } },
      ],
      edge: [{ color: P('rug_gold_line'), width: 3, opacity: 0.85, dir: null }, { color: '#C9A27A', width: 7, opacity: 0.4 }],
    });
    // --- fringes: ivory tassels at both short ends (short at the far end, long toward us)
    const tassels = (y, dir, seed, flen, step, wd) => {
      const rng = E.makeRng(seed), parts = [], hw = hwAt(y) - 3;
      for (let x = -hw; x <= hw + 0.1; x += step) {
        const lean = rng.sym(1.6) + (x / hw) * 1.8, len = flen * rng.range(0.82, 1.06);
        parts.push(shape.ribbon([[cx + x, y - dir * 2], [cx + x + lean * 0.4, y + dir * len * 0.5], [cx + x + lean, y + dir * len]], [wd, wd * 0.6]));
      }
      return E.bakeStencil({ shape: shape.union(...parts), base: '#F3EADB', anchor: [0, 0], seed, bleed: false,
        layers: [{ color: '#D8C8B4', coverage: 0.36, size: 12, stamps: 'open' }, { color: '#FFFDF6', coverage: 0.3, size: 10, stamps: 'body' }] });
    };
    a.fringeTop = tassels(Y0, -1, 2406, FR0, 7.6, 3);
    a.fringeBot = tassels(Y1, 1, 2407, FR1, 9.2, 4);
    // the whole rug (without the near fringe, which flicks out by itself)
    a.rug = E.bakeSprite({ bounds: BOX, anchor: [0, 0], seed: 2408, draw: (c) => {
      a.fringeTop.draw(c, 0, 0); border.draw(c, 0, 0); fld.draw(c, 0, 0); lozenges.draw(c, 0, 0); frame.draw(c, 0, 0); spandrel.draw(c, 0, 0); niche.draw(c, 0, 0);
    } });
    // the shadow it casts on the grass: a soft dark dab along its right side and under its near edge (the light
    // comes from the door, above left) — this is what makes it LIE on the slope
    a.shadow = E.makeCluster({
      w: BOX[2] - BOX[0], h: BOX[3] - BOX[1], seed: 2409, anchor: [-BOX[0], -BOX[1]], edgeSoftness: 0.8,
      shapeFn: (x, y) => {
        const wx = x + BOX[0], wy = y + BOX[1], r = cx + hwAt(wy), l = cx - hwAt(wy);
        const side = Math.min((wx - (r - 14)) / 10, (r + 17 - wx) / 9, (wy - Y0 - 6) / 40, (Y1 + FR1 + 8 - wy) / 14);
        const foot = Math.min((wy - (Y1 - 6)) / 8, (Y1 + FR1 + 12 - wy) / 9, (wx - l - 6) / 26, (r + 15 - wx) / 10);
        return clamp(Math.max(side, foot));
      },
      layers: [{ color: '#225A48', coverage: 0.74, size: 26, stamps: 'body', pores: 0.3 }, { color: '#1B4B40', coverage: 0.4, size: 18, stamps: 'open' }, { color: '#33607A', coverage: 0.1, size: 14, stamps: 'soft' }],
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

    // --- the niche's glow (two steps): white-gold only in the niche's inner two-thirds — a soft cluster, no cut
    //     edge; round it the ivory-peach niche with its gold dabs stays (a niche glowing edge to edge read as a doorway)
    const GR = [cx - NW / 2, NA, cx + NW / 2, NB], GC = N.centre[1] + 10;
    const gr = (x, y) => Math.hypot((x - cx) / 40, (y - GC) / 57);
    a.glow = E.bakeStencil({ shape: shape.rect(GR[0], GR[1], GR[2] - GR[0], GR[3] - GR[1]), anchor: [0, 0], pad: 0, seed: 2413, bleed: false,
      reveal: { steps: 2, mode: 'mask', order: 'radial', from: [cx, GC], dab: 50, jitter: 0.1 },
      layers: [
        { color: '#F2C656', coverage: 0.62, size: 26, stamps: 'body', pores: 0.4, maskFn: (x, y) => ss(1.16, 0.96, gr(x, y)) },
        { color: P('door_glow'), coverage: 0.88, size: 26, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(1.0, 0.84, gr(x, y)) },
        { color: '#FBE7A0', coverage: 0.93, size: 24, stamps: 'body', pores: 0.2, maskFn: (x, y) => ss(0.8, 0.62, gr(x, y)) },
        { color: P('niche_glow'), coverage: 0.92, size: 22, stamps: 'body', pores: 0.2, maskFn: (x, y) => ss(0.56, 0.38, gr(x, y)) },
      ] });
    a.GR = GR;
    a.core = E.makeGlow({ rx: 20, ry: 34, color: P('niche_glow'), core: '#FFF4D2', density: 0.9, falloff: 0.55, seed: 2414 });   // warm white-gold, a clear step under the far light's white
    // --- LINK 1: the niche's own light swells ONCE to fill the whole niche and a hand's breadth round it, and goes
    //     back in two steps. It is cut to the niche + 10 px (it never reaches the border or the fringe); its rim is
    //     loose gold dabs, so the cut is not seen.
    const BG = 10, BR = [cx - NW / 2 - BG - 4, NA - BG - 4, cx + NW / 2 + BG + 4, NB + BG + 4];
    const br = (x, y) => Math.hypot((x - cx) / (NW / 2 + BG), (y - (N.centre[1] + 8)) / (NH / 2 + BG));
    a.bloomTex = E.bakeStencil({ shape: shape.rect(BR[0], BR[1], BR[2] - BR[0], BR[3] - BR[1]), anchor: [0, 0], pad: 0, seed: 2415, bleed: false,
      reveal: { steps: 3, mode: 'mask', order: 'radial', from: [cx, N.centre[1] + 8], dab: 54, jitter: 0.1 },
      layers: [
        { color: P('door_glow'), coverage: 0.74, size: 30, stamps: 'body', pores: 0.4 },
        { color: '#FBE7A6', coverage: 0.9, size: 34, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(1.0, 0.8, br(x, y)) },
        { color: P('niche_glow'), coverage: 0.95, size: 32, stamps: 'body', pores: 0.2, maskFn: (x, y) => ss(0.82, 0.62, br(x, y)) },
        { color: '#FFF4D2', coverage: 0.9, size: 28, stamps: 'body', pores: 0.2, maskFn: (x, y) => ss(0.56, 0.36, br(x, y)) },
      ] });
    a.BR = BR; a.bloomArch = nicheArch(BG);
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
      ctx.rect(BOX[0] - 40, BOX[1] - 4, BOX[2] - BOX[0] + 80, yc - BOX[1] + 4 + (flick >= 2 ? 60 : 0));
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
      const arch = nicheArch(-3);
      ctx.save();
      ctx.clip(arch.path);
      A.glow.draw(ctx, 0, 0, { p: gp });
      if (gp >= 1) A.core.draw(ctx, cx, N.centre[1] + 12, { scale: 1 + 0.05 * Math.sin((t - ft(T.rug.glow[1])) * 2.1) });
      ctx.restore();
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

  /** LINK 1 (front slot): the bloom lands 22.90, is whole on the next frame, and dabs out in two steps (gone 6.5 frames on) */
  function drawBloom(ctx, t) {
    const n = nf(t, T.links.bloom);
    if (n < -1e-6 || n >= 6.5 - 1e-6) return;
    const p = n < 1 - 1e-6 ? 2 / 3 : n < 3.5 - 1e-6 ? 1 : n < 5 - 1e-6 ? 2 / 3 : 1 / 3;
    E.drawStencil(ctx, A.bloomArch, A.bloomTex, { x: A.BR[0], y: A.BR[1], p });
  }

  return { draw, drawBloom, lenAt, glowP, nicheArch, sprites: A, box: BOX };
}
