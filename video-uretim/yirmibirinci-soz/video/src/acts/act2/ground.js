// ground.js — the knoll of the right column (act 2, mid slot, plane 1.0) and what lies on it:
//
//   16.63 / 16.73   the knoll cross-dabs in from the ground up (with the world's mist leaving and the deep sky,
//                   light.js, arriving) — plateau y 770, its face sloping toward us, base in warm mist
//   17.07           with the far light's brightest pass the plateau's rim and the face catch its light
//   21.27           the doorway's light spills down the knoll's face (one soft warm patch, sill -> y 860)
//
// The knoll is lighter and bluer than the hedge and printed with finer dabs (aerial perspective). A fringe of
// the same foliage is drawn AFTER the buildings so that chest, mescid and minaret sit in the grass.

export function makeGround(E, W, U) {
  const L = W.layout, P = L.pal, { clamp, lerp, smoothstep: ss } = E;
  const { TL: T, ft, on, field } = U;
  const K = L.knoll;
  const once = (k, f) => E.once('act2/ground/' + k, f);
  const FLOOR = W.lightFloor ?? 1203;                    // nothing lighter than hedge_mid below this row

  // ------------------------------------------------------------------ geometry
  const PLAT = K.plateau_y;                              // 770
  const X1 = (W.boxes?.visible1?.[2] ?? 1366) + 10;
  const top = (x) => PLAT + 3 * Math.sin(x / 61 + 0.7) + 2 * Math.sin(x / 23);
  // left flank x = flank(y): a rounded shoulder (so that the minaret, x 850–894, has ground under it) that
  // comes down through the storyboard's flank points (815, 900), (770, 1040), (745, 1200)
  const FL = [[748, 884], [760, 858], [772, 845], [800, 833], [900, 815], [1040, 770], [1200, 745], [1290, 734]];
  const flank = (y) => {
    if (y <= FL[0][0]) return FL[0][1] + (FL[0][0] - y) * 3;
    for (let i = 1; i < FL.length; i++) {
      if (y <= FL[i][0]) { const a = FL[i - 1], b = FL[i], u = (y - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], u * u * (3 - 2 * u)); }
    }
    return FL[FL.length - 1][1];
  };
  const inX = (x, y) => x - flank(y) - 5 * Math.sin(y / 37 + 1);
  const inY = (x, y) => y - top(x);
  const depth = (x, y) => clamp(Math.min((inX(x, y) + 10) / 44, (inY(x, y) + 10) / 40));
  const BOX = [700, PLAT - 46, X1, L.lipY + 36];
  const lightOK = (size) => (x, y) => (y + size * 0.7 <= FLOOR ? 1 : 0);
  /** 1 = the plateau's rim and the upper right of the face (what the far light reaches) */
  const lit = (x, y) => clamp(1.05 - inY(x, y) / 170 + (x - 1040) / 900);

  const kc = P('knoll');                                 // ['#3E8A5C', '#5FA36A', '#A9D38A']
  const A = once('all', () => {
    const a = {};
    const base = [
      { color: kc[0], coverage: 0.985, size: 40, even: true, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(60, 34, Math.min(inX(x, y), inY(x, y))) },
      { color: kc[0], coverage: 0.985, size: 92, tint: 0.03, pores: 0.3, maskFn: (x, y) => ss(26, 52, Math.min(inX(x, y), inY(x, y))) },
    ];
    const coat = [
      // the shadow side: the left flank and the foot
      { color: '#2F7350', coverage: 0.5, size: 56, stamps: 'open', pores: 0.4, maskFn: (x, y) => Math.max(ss(150, 30, inX(x, y)), ss(250, 420, inY(x, y)) * 0.8), patch: { scale: 170, amount: 0.36 } },
      { color: '#27644A', coverage: 0.26, size: 40, stamps: 'open', maskFn: (x, y) => ss(110, 20, inX(x, y)), patch: { scale: 130, amount: 0.5 } },
      // the face: mid green, gathered in clumps, lighter toward the rim and the right
      { color: '#4C9763', coverage: 0.6, size: 50, stamps: 'body', pores: 0.4, maskFn: (x, y) => 0.4 + 0.6 * lit(x, y), patch: { scale: 160, amount: 0.32, sharp: 0.3 } },
      { color: kc[1], coverage: 0.56, size: 40, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.3, 0.8, lit(x, y)) * lightOK(40)(x, y), patch: { scale: 140, amount: 0.36, sharp: 0.3, seed: 31 } },
      { color: '#7FB97C', coverage: 0.34, size: 28, stamps: 'open', maskFn: (x, y) => ss(0.55, 0.95, lit(x, y)) * lightOK(28)(x, y), patch: { scale: 140, amount: 0.5, sharp: 0.3, seed: 31 } },
      { color: '#2B6B4C', coverage: 0.14, size: 30, stamps: 'soft', patch: { scale: 110, amount: 0.6 } },
      { color: P('primer'), coverage: 0.06, size: 24, stamps: 'soft', maskFn: (x, y) => ss(90, 10, inY(x, y)), patch: { scale: 110, amount: 0.6 } },
    ];
    const f = field({ box: BOX, depth, seed: 2201, edge: 0.45, layers: [...base, ...coat], k: 1.25,
      reveal: { steps: 2, order: 'sweep', angle: -Math.PI / 2, jitter: 0.2, dab: 150 } });
    // opaque inside (the engine does the same for stencils with a base): the base colour is laid under the dabs
    {
      const c = f.painted.final.ctx;
      c.save();
      c.translate(-BOX[0], -BOX[1]);
      c.globalCompositeOperation = 'destination-over';
      c.fillStyle = kc[0];
      c.beginPath();
      c.moveTo(BOX[2] + 2, BOX[3] + 2);
      c.lineTo(BOX[2] + 2, top(BOX[2]) + 16);
      for (let x = BOX[2]; x >= flank(PLAT + 20) + 22; x -= 6) c.lineTo(x, top(x) + 16);
      for (let y = PLAT + 20; y <= BOX[3] + 2; y += 6) c.lineTo(flank(y) + 20, y);
      c.closePath();
      c.fill();
      c.restore();
    }
    a.knoll = f;

    // the rim and the face in the far light (17.07): yellow-green lights in clumps, warm specks on the rim
    a.lit = field({ box: BOX, depth, seed: 2202, edge: 0.45, k: 1.25, reveal: { steps: 1 }, layers: [
      { color: '#93C77F', coverage: 0.4, size: 40, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.5, 0.95, lit(x, y)) * ss(8, 30, inX(x, y)), patch: { scale: 130, amount: 0.34, sharp: 0.3, seed: 31 } },
      { color: kc[2], coverage: 0.46, size: 30, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.72, 1.0, lit(x, y)) * ss(8, 30, inX(x, y)), patch: { scale: 120, amount: 0.3, sharp: 0.3, seed: 31 } },
      { color: '#D9E6A0', coverage: 0.3, size: 18, stamps: 'open', maskFn: (x, y) => ss(40, 6, inY(x, y)) * ss(20, 60, inX(x, y)), patch: { scale: 90, amount: 0.4 } },
      { color: '#F7D9A0', coverage: 0.1, size: 16, stamps: 'soft', maskFn: (x, y) => ss(30, 4, inY(x, y)) * ss(20, 60, inX(x, y)) },
    ] });

    // the fringe that is drawn after the buildings: tufts along the plateau's front edge
    const FB = [K.plateau_x[0] - 70, PLAT - 26, X1, PLAT + 44];
    const fd = (x, y) => clamp(Math.min((y - top(x) + 4 + 5 * Math.sin(x / 13)) / 18, (PLAT + 40 - y) / 26, (inX(x, y) - 4) / 30));
    a.fringe = field({ box: FB, depth: fd, seed: 2203, edge: 0.6, k: 1.25, reveal: { steps: 1 }, layers: [
      { color: kc[0], coverage: 0.9, size: 26, pores: 0.3, tint: 0.03 },
      { color: '#4C9763', coverage: 0.6, size: 22, stamps: 'body', pores: 0.3, patch: { scale: 80, amount: 0.3 } },
      { color: kc[1], coverage: 0.5, size: 18, stamps: 'body', patch: { scale: 70, amount: 0.36 } },
      { color: '#93C77F', coverage: 0.3, size: 13, stamps: 'open', maskFn: (x, y) => ss(PLAT + 14, PLAT - 2, y), patch: { scale: 60, amount: 0.4 } },
      { color: '#2B6B4C', coverage: 0.2, size: 16, stamps: 'open', maskFn: (x, y) => ss(PLAT + 4, PLAT + 26, y) },
    ] });

    // warm mist along the foot of the knoll (y 1125–1212; never below the light floor)
    const MB = K.base_mist;
    const mTop = (x) => MB.y0 + 16 + 12 * Math.sin(x / 83 + 2) + 6 * Math.sin(x / 31);
    const mBox = [MB.x0 - 30, MB.y0 - 30, Math.min(MB.x1, X1), FLOOR];
    const md = (x, y) => clamp(Math.min((y - mTop(x)) / 44, (x - MB.x0 + 10) / 110));
    a.mist = field({ box: mBox, depth: md, seed: 2204, edge: 0.7, reveal: { steps: 1 }, layers: [
      { color: P('warm_mist', 1), coverage: 0.7, size: 76, opacity: [0.7, 0.95], pores: 0.3, maskFn: lightOK(76), patch: { scale: 170, amount: 0.24 } },
      { color: '#F6D9B0', coverage: 0.3, size: 56, stamps: 'open', opacity: [0.6, 0.9], maskFn: lightOK(56), patch: { scale: 140, amount: 0.5 } },
      { color: P('warm_mist', 0), coverage: 0.6, size: 56, stamps: 'body', opacity: [0.8, 1], pores: 0.3, maskFn: (x, y) => ss(-10, 40, y - mTop(x)) * lightOK(56)(x, y), patch: { scale: 150, amount: 0.34 } },
      { color: '#FFFFFF', coverage: 0.14, size: 36, stamps: 'speck', tints: 1, opacity: [0.7, 1], maskFn: lightOK(36) },
    ] });

    // the doorway's light on the grass (21.27)
    const D = L.mosque.door, dcx = (D.x0 + D.x1) / 2, y0 = PLAT - 4, y1 = 866;
    const sBox = [dcx - 110, y0 - 12, dcx + 110, y1 + 30];
    const sd = (x, y) => { const v = clamp((y - y0) / (y1 - y0)); return clamp(Math.min((lerp(34, 78, v) - Math.abs(x - dcx)) / 30, (y - y0 + 8) / 14, (y1 + 14 - y) / 40)); };
    a.spill = field({ box: sBox, depth: sd, seed: 2205, edge: 0.7, reveal: { steps: 1 }, layers: [
      { color: '#CFE08C', coverage: 0.5, size: 34, stamps: 'body', pores: 0.3, patch: { scale: 70, amount: 0.3 } },
      { color: P('warm_mist', 1), coverage: 0.5, size: 26, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(y1, y0 + 20, y) * ss(64, 20, Math.abs(x - dcx)), patch: { scale: 60, amount: 0.3 } },
      { color: P('door_glow'), coverage: 0.3, size: 18, stamps: 'open', maskFn: (x, y) => ss(y0 + 50, y0, y) },
      { color: P('seam_light'), coverage: 0.3, size: 16, stamps: 'body', maskFn: (x, y) => ss(y0 + 34, y0, y) * ss(30, 8, Math.abs(x - dcx)) },
    ] });
    return a;
  });

  // ------------------------------------------------------------------ draw
  const knollP = (t) => L.count(t, T.turn.slice(0, 2)) / 2;
  /** behind the buildings */
  function drawBack(ctx, t) {
    const p = knollP(t);
    if (p <= 0) return;
    A.knoll.draw(ctx, { p });
    if (on(t, T.light[3])) A.lit.draw(ctx);
    if (p >= 0.5) A.mist.draw(ctx);
  }
  /** in front of the buildings: the grass their bases stand in, then the door's light */
  function drawFront(ctx, t) {
    if (knollP(t) < 1) return;
    A.fringe.draw(ctx);
    if (on(t, T.rug.spill)) A.spill.draw(ctx);
  }
  return { drawBack, drawFront, top, flank, sprites: A, box: BOX };
}
