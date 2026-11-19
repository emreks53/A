// build.js — the little chest (sandukça) on the knoll and the small mescid it grows into (act 2, mid slot).
//
//   18.27 / 18.40 / 18.53  chest body in three passes (wood, straps + plank slits, lights + gold plates + lock plate)
//   18.83                  the barrel lid is printed on top, drops 14 px, settles 18.97 — a finger ajar (dark seam)
//   19.50 / 19.57          the seam lights from inside (+ a few gold spill dabs over the lid's lower edge)
//   19.87–19.97            anticipation: the chest squashes 6 %
//   19.97–20.27  MOVE 1    the lid rises and rounds into the lead-blue dome on a low drum (mask tween + cross-dab)
//   20.00–20.27  MOVE 2    the body widens 230 -> 280 and cross-dabs wood -> ivory stone; windows arrive with the
//                          same passes; the lock plate opens into the glowing doorway
//   20.13–20.33  MOVE 3    the pencil minaret rises at the left as one sprite
//   20.33 / 20.37          gold crescents pop on (dome, then minaret)
//   21.27 / 23.00          the doorway brightens one step (door-light spill / link 2)
//
// One pointed arch everywhere: lock plate -> doorway (and the rug's niche, the far light).
// Everything is cut live (E.drawStencil) out of textures that are pinned in world space, so nothing is ever
// stretched: shapes change, prints stay.

export function makeBuilding(E, W, U) {
  const L = W.layout, P = L.pal, { shape, clamp, lerp, smoothstep: ss } = E;
  const { TL: T, ft, on, nf, prog, kf, pop3, overshoot, profilePts, crescentPts } = U;
  const C = L.chest, M = L.mosque;
  const cx = C.centre_x, by = C.base_y;
  const once = (k, f) => E.once('act2/build/' + k, f);

  // ------------------------------------------------------------------ geometry (world px)
  const B0 = C.body, B1 = M.body;                       // 925–1155 x 655–770  ->  900–1180 x 640–770
  const LID_BASE = B0.y0 - C.lid.seam_gap_px;           // 640: the lid's lower edge (15 px seam)
  const LID_H = LID_BASE - C.lid.top_y;                 // 70
  const D = M.dome, DR = M.drum;                        // dome 925–1155 x 452–596, drum 920–1160 x 596–640
  const DOME_H = D.y1 - D.y0, DOME_R = 113;             // E.shape.dome bulges ~1.5 % beyond its base radius
  const LID_P = [[119, 0], [119, 36], [90, LID_H], [0, LID_H]];
  const DOME_P = [[DOME_R, 0], [DOME_R * 1.1, DOME_H * 0.52], [DOME_R * 0.56, DOME_H * 0.9], [0, DOME_H]];
  /** the cap between lid (u = 0) and dome (u = 1); u may overshoot */
  const capPts = (u, baseY) => profilePts(cx, baseY, LID_P.map((p, i) => [lerp(p[0], DOME_P[i][0], u), lerp(p[1], DOME_P[i][1], u)]), 30);
  const DOOR = M.door, LOCK = C.lock_plate;
  const ARCH_POINT = 0.8;
  const PLATE_EDGE = { color: '#8A5216', width: 3, opacity: 0.75 };
  const archAt = (u, grow = 0) => shape.arch(cx, lerp(LOCK.centre[1] + LOCK.h / 2, DOOR.y1, u),
    lerp(LOCK.w, DOOR.x1 - DOOR.x0, u) + 2 * grow, lerp(LOCK.h, DOOR.y1 - DOOR.y0, u) + grow, ARCH_POINT);

  // texture rectangles [x0, y0, x1, y1]
  const R_WOOD = [890, 628, 1190, 776], R_LID = [900, 404, 1180, 662], R_DOME = [900, 424, 1180, 604];
  const R_STONE = [890, 586, 1190, 776], R_LIGHT = [912, 584, 1168, 664], R_DOOR = [994, 652, 1086, 776];
  const rectOf = (r) => shape.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
  const tex = (r, o) => E.bakeStencil({ shape: rectOf(r), anchor: [0, 0], pad: 0, bleed: false, ...o });
  const cutBy = (ctx, shp, t, r, o = {}) => E.drawStencil(ctx, shp, t, { x: r[0], y: r[1], ...o });

  // ------------------------------------------------------------------ paint
  const upRight = (x0, x1, y0, y1) => (x, y) => clamp(0.5 + (x - (x0 + x1) / 2) / (x1 - x0) - (y - (y0 + y1) / 2) / (y1 - y0) * 0.8);
  const woodLayers = (lit) => [
    { color: '#8E5A27', coverage: 0.56, size: 50, pores: 0.3, maskFn: (x, y) => lerp(1, 0.4, ss(0.3, 0.75, lit(x, y))), patch: { scale: 110, amount: 0.34 } },
    { color: P('chest_wood_dark'), coverage: 0.32, size: 36, stamps: 'open', maskFn: (x, y) => ss(0.62, 0.2, lit(x, y)), patch: { scale: 90, amount: 0.46 } },
    { color: '#B67E36', coverage: 0.42, size: 40, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.4, 0.8, lit(x, y)), patch: { scale: 100, amount: 0.4 } },
    { color: P('primer'), coverage: 0.05, size: 18, stamps: 'soft' },
  ];
  const lineP = (pts) => { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); return p; };
  const addLine = (path, pts) => { pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y))); };
  const gold = (o = {}) => ({
    base: '#E39B24', bleed: false,
    layers: [
      { color: '#C27F1A', coverage: 0.3, size: 22, stamps: 'open', patch: { scale: 50, amount: 0.5 } },
      { color: P('gold_fittings'), coverage: 0.6, size: 20, stamps: 'body', pores: 0.3 },
      { color: P('door_glow'), coverage: 0.42, size: 14, stamps: 'body', maskFn: o.lit ?? null, patch: { scale: 40, amount: 0.4 } },
    ],
    edge: { color: '#8A5216', width: o.edge ?? 2.4, opacity: 0.7 },
  });

  const A = once('all', () => {
    const a = {};
    const bodyLit = upRight(B0.x0, B0.x1, B0.y0, B0.y1);

    // --- wood of the body (wider than the chest: the widening body of MOVE 2 is cut from it)
    const planks = new Path2D();
    for (const [y, ph] of [[693, 0.4], [731, 2.1]]) addLine(planks, Array.from({ length: 13 }, (_, i) => [R_WOOD[0] + i * 25, y + 1.6 * Math.sin(i * 0.9 + ph)]));
    a.wood = tex(R_WOOD, { base: P('chest_wood'), seed: 2101, layers: woodLayers(bodyLit), slits: { path: planks, width: 2.2, color: '#47290F', opacity: 0.78 } });
    const body0 = shape.rect(B0.x0, B0.y0, B0.x1 - B0.x0, B0.y1 - B0.y0);
    const PAD = [B0.x0 - 6, B0.y0 - 6, B0.x1 + 6, B0.y1 + 6];
    // pass 1: the wood base
    a.body1 = E.bakeSprite({ bounds: PAD, anchor: [0, 0], seed: 2102, steps: 2, dabSize: 90, reveal: { order: 'sweep', angle: -Math.PI / 2, jitter: 0.3 }, draw: (c) => cutBy(c, body0, a.wood, R_WOOD, { bleed: { color: P('chest_wood_dark'), amount: 0.8 }, edge: { color: '#5A3618', width: 5, opacity: 0.55 } }) });
    // pass 2: dark straps with rivets
    const strap = (x, seed) => E.bakeStencil({
      shape: shape.rect(x - 10, B0.y0, 20, B0.y1 - B0.y0), base: P('chest_straps'), anchor: [0, 0], seed, bleed: false,
      layers: [{ color: '#33221B', coverage: 0.4, size: 22, stamps: 'open' }, { color: '#6A4B3A', coverage: 0.3, size: 16, stamps: 'body', maskFn: (px) => ss(x - 4, x + 8, px) }],
      details: { print: 'solid', draw: (c) => { c.fillStyle = '#E8B040'; for (const y of [B0.y0 + 13, B0.y1 - 13]) { c.beginPath(); c.arc(x, y, 3.6, 0, 7); c.fill(); } } },
    });
    const straps = [strap(cx - 68, 2103), strap(cx + 68, 2104)];
    a.body2 = E.bakeSprite({ bounds: PAD, anchor: [0, 0], seed: 2105, steps: 2, dabSize: 70, reveal: { order: 'sweep', angle: -Math.PI / 2, jitter: 0.3 }, draw: (c) => { for (const s of straps) s.draw(c, 0, 0); } });
    // pass 3: light dabs on the upper right, gold corner plates
    const lights = E.bakeStencil({
      shape: body0, anchor: [0, 0], seed: 2106, bleed: false,
      layers: [
        { color: P('chest_wood_light'), coverage: 0.6, size: 34, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.56, 0.86, bodyLit(x, y)), patch: { scale: 80, amount: 0.34, sharp: 0.3 } },
        { color: '#E2B56A', coverage: 0.3, size: 20, stamps: 'open', maskFn: (x, y) => ss(0.74, 0.95, bodyLit(x, y)), patch: { scale: 60, amount: 0.5 } },
      ],
    });
    const corner = (x, y, sx, sy, seed) => {
      const k = 30, pts = [[0, 0], [k, 0], [k, 7], [15, 10], [10, 15], [7, k], [0, k]].map(([px, py]) => [x + sx * px, y + sy * py]);
      return E.bakeStencil({ shape: shape.polygon(pts), anchor: [0, 0], seed, ...gold({ lit: (px, py) => ss(0.3, 0.7, bodyLit(px, py)) }),
        details: { print: 'solid', draw: (c) => { c.fillStyle = '#7A4614'; c.beginPath(); c.arc(x + sx * 8, y + sy * 8, 2.6, 0, 7); c.fill(); } } });
    };
    const corners = [corner(B0.x0, B0.y0, 1, 1, 2107), corner(B0.x1, B0.y0, -1, 1, 2108), corner(B0.x0, B0.y1, 1, -1, 2109), corner(B0.x1, B0.y1, -1, -1, 2110)];
    a.body3 = E.bakeSprite({ bounds: PAD, anchor: [0, 0], seed: 2111, steps: 2, dabSize: 70, reveal: { order: 'sweep', angle: -Math.PI / 2, jitter: 0.3 }, draw: (c) => { lights.draw(c, 0, 0); for (const k of corners) k.draw(c, 0, 0); } });
    // the finished body as a texture for the morph (wood rectangle + passes 2 and 3)
    a.bodyTex = E.bakeSprite({ bounds: R_WOOD, anchor: [R_WOOD[0], R_WOOD[1]], seed: 2112, draw: (c) => { a.wood.draw(c, 0, 0); a.body2.draw(c, 0, 0); a.body3.draw(c, 0, 0); } });

    // --- lock plate (48 x 64 pointed arch) with a keyhole
    a.plateTex = tex(R_DOOR, { ...gold({ lit: (x, y) => ss(cx - 14, cx + 12, x - (y - LOCK.centre[1]) * 0.4) }), edge: null, seed: 2113,
      details: { print: 'solid', draw: (c) => {
        c.fillStyle = P('chest_inside');
        const ky = LOCK.centre[1] - 4;
        c.beginPath(); c.arc(cx, ky, 5.2, 0, 7); c.fill();
        c.beginPath(); c.moveTo(cx - 2.6, ky + 2); c.lineTo(cx + 2.6, ky + 2); c.lineTo(cx + 4.6, ky + 17); c.lineTo(cx - 4.6, ky + 17); c.closePath(); c.fill();
      } } });
    a.plate = E.bakeSprite({ bounds: [cx - 30, LOCK.centre[1] - 38, cx + 30, LOCK.centre[1] + 38], anchor: [0, 0], seed: 2114, steps: 2, dabSize: 40,
      draw: (c) => cutBy(c, archAt(0), a.plateTex, R_DOOR, { edge: PLATE_EDGE }) });

    // --- the inside of the chest (dark) and its light
    a.dark = tex(R_LIGHT, { base: P('chest_inside'), seed: 2115, layers: [{ color: '#2A1915', coverage: 0.4, size: 30, stamps: 'open' }, { color: '#55382C', coverage: 0.2, size: 22, stamps: 'soft' }] });
    a.light = tex(R_LIGHT, { base: P('seam_light'), seed: 2116, reveal: { steps: 2, mode: 'mask', order: 'radial', from: [cx, 648], dab: 60 }, layers: [
      { color: '#FFFDF6', coverage: 0.6, size: 30, stamps: 'body', pores: 0.3, maskFn: (x) => ss(140, 30, Math.abs(x - cx)) },
      { color: P('seam_spill'), coverage: 0.5, size: 24, stamps: 'open', maskFn: (x) => ss(40, 120, Math.abs(x - cx)), patch: { scale: 50, amount: 0.3 } },
      { color: '#F0B840', coverage: 0.2, size: 16, stamps: 'soft', maskFn: (x) => ss(70, 118, Math.abs(x - cx)) },
    ] });
    // gold spill dabs over the lid's lower edge (second step of the seam light)
    a.spill = E.makeCluster({
      w: 250, h: 44, seed: 2117, anchor: [125, 30], edgeSoftness: 0.7,
      shapeFn: (x, y) => clamp(Math.min(1 - Math.abs(y - 30) / 20, 1.1 - Math.abs(x - 125) / 118)),
      layers: [
        { color: P('seam_spill'), coverage: 0.36, size: 22, stamps: 'body', pores: 0.3, patch: { scale: 46, amount: 0.45 } },
        { color: P('seam_light'), coverage: 0.3, size: 15, stamps: 'open', patch: { scale: 40, amount: 0.5 }, maskFn: (x, y) => ss(18, 34, y) },
        { color: '#FFFFFF', coverage: 0.07, size: 20, stamps: 'speck', tints: 1 },
      ],
      reveal: { steps: 1 },
    });

    // --- lid texture: wood, a darker rim, two gold bands, fanning slat slits (they echo the dome's ribs)
    const lidLit = upRight(B0.x0, B0.x1, C.lid.top_y - 30, LID_BASE);
    const slats = new Path2D();
    for (const k of [-3, -2, -1, 0, 1, 2, 3]) {
      if (Math.abs(k) === 2) continue;                                    // the gold bands sit there
      addLine(slats, Array.from({ length: 9 }, (_, i) => { const v = i / 8, y = lerp(LID_BASE - 14, R_LID[1], v); return [cx + k * 34 * (1 - 0.34 * v) + 1.2 * Math.sin(i * 1.3 + k), y]; }));
    }
    a.lid = tex(R_LID, { base: P('chest_wood'), seed: 2120, layers: woodLayers(lidLit),
      slits: { path: slats, width: 2, color: '#47290F', opacity: 0.74 },
      details: [
        { print: 'solid', draw: (c) => { c.fillStyle = '#6A4120'; c.fillRect(R_LID[0], LID_BASE - 13, R_LID[2] - R_LID[0], 13); } },
        { print: 'solid', draw: (c) => {
          c.fillStyle = P('gold_fittings');
          for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * 60, LID_BASE); c.lineTo(cx + s * 76, LID_BASE); c.lineTo(cx + s * 52, R_LID[1]); c.lineTo(cx + s * 38, R_LID[1]); c.closePath(); c.fill(); }
        } },
        { print: 'print', opacity: 0.8, draw: (c) => {
          c.fillStyle = P('door_glow');
          for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * 66 + 2, LID_BASE); c.lineTo(cx + s * 66 + 7, LID_BASE); c.lineTo(cx + s * 43 + 6, R_LID[1]); c.lineTo(cx + s * 43 + 1, R_LID[1]); c.closePath(); c.fill(); }
        } },
      ],
    });
    a.knob = E.bakeStencil({ shape: shape.union(shape.ellipse(0, 0, 10.5, 10), shape.ellipse(0, 9, 14, 4.5)), anchor: [0, 0], seed: 2121, ...gold({ lit: (x, y) => ss(-3, 4, x - y), edge: 2.6 }) });

    // --- dome texture (lead-blue; ribs through slits, laid out for the finished dome)
    const DL = E.sphereLight(cx + DOME_R * 0.1, D.y1 - DOME_H * 0.44, DOME_R * 1.06, DOME_H * 0.64);
    const lit = (p, q) => (x, y) => ss(p, q, DL(x, y));
    const prof = profilePts(0, 0, DOME_P, 30).slice(0, 31).map(([hw, y]) => [hw, -y]);       // [halfWidth, height]
    const ribRng = E.makeRng('act2/dome-ribs');
    const ribs = [];
    for (let k = -5; k <= 5; k++) {
      const u = Math.sin((k / 6) * (Math.PI / 2) * 0.93), ph = ribRng.next() * 6.283;
      const pts = prof.slice(0, -2).filter((_, i) => i % 3 === 0).map(([hw, hh], i, all) => {
        const v = i / (all.length - 1);
        return [cx + u * hw + Math.sin(v * Math.PI) * (1.1 * Math.sin(v * 4.2 + ph) + ribRng.sym(0.4)), D.y1 - hh - (i ? 0 : 2)];
      });
      const wide = 2.6 * (0.62 + 0.38 * Math.cos((k / 6) * (Math.PI / 2))) * ribRng.range(0.75, 1.3);
      ribs.push(shape.ribbon(pts, [wide * 1.1, wide * 0.25]));
    }
    const dm = P('dome');
    a.dome = tex(R_DOME, { base: dm[0], seed: 2130, reveal: { steps: 5, mode: 'mask', order: 'sweep', angle: -Math.PI / 2, jitter: 0.5, dab: 80 },
      layers: [
        { color: '#163B4C', coverage: 0.3, size: 50, pores: 0.3, patch: { scale: 100, amount: 0.5 } },
        { color: dm[1], coverage: 0.6, size: 48, pores: 0.3, maskFn: lit(0.3, 0.5), patch: { scale: 100, amount: 0.36 } },
        { color: '#3F8C9E', coverage: 0.9, size: 46, pores: 0.3, poreScale: 0.7, maskFn: lit(0.56, 0.62) },
        { color: dm[2], coverage: 0.9, size: 44, pores: 0.3, poreScale: 0.6, maskFn: lit(0.72, 0.775) },
        { color: dm[3], coverage: 0.8, size: 34, stamps: 'body', pores: 0.3, poreScale: 0.7, maskFn: lit(0.865, 0.91) },
        { color: '#3F8C9E', coverage: 0.14, size: 44, stamps: 'speck', maskFn: (x, y) => lit(0.46, 0.54)(x, y) * lit(0.64, 0.56)(x, y) },
        { color: dm[2], coverage: 0.14, size: 44, stamps: 'speck', maskFn: (x, y) => lit(0.62, 0.7)(x, y) * lit(0.8, 0.73)(x, y) },
        { color: P('primer'), coverage: 0.2, size: 22, stamps: 'soft', maskFn: lit(0.5, 0.24), patch: { scale: 60, amount: 0.66, sharp: 0.4 } },
      ],
      slits: { shape: shape.union(...ribs), width: 2.4, color: '#0E2C3A', opacity: 0.86 },
    });

    // --- stone texture: ivory walls, shadow side at the left, a row of mauve dabs under the cornice, two windows
    const wallLit = (x) => ss(B1.x0 + 30, B1.x1 - 60, x);
    a.stone = tex(R_STONE, { base: P('stone_ivory'), seed: 2140, reveal: { steps: 5, mode: 'mask', order: 'random', dab: 84 },
      layers: [
        { color: P('stone_light'), coverage: 0.56, size: 60, tint: 0.015, pores: 0.3, maskFn: (x) => 0.3 + 0.7 * wallLit(x), patch: { scale: 110, amount: 0.4 } },
        { color: '#DCCFC6', coverage: 0.56, size: 46, tint: 0.02, stamps: 'open', pores: 0.3, maskFn: (x) => lerp(1, 0.25, wallLit(x)), patch: { scale: 100, amount: 0.5, sharp: 0.4, seed: 5 } },
        { color: P('stone_shadow'), coverage: 0.4, size: 32, tint: 0.025, stamps: 'open', pores: 0.3, maskFn: (x) => lerp(1, 0.12, ss(B1.x0, B1.x0 + 130, x)), patch: { scale: 100, amount: 0.6, sharp: 0.4, seed: 5 } },
        { color: '#B8A09E', coverage: 0.7, size: 17, sizeJitter: 0.2, tint: 0.03, stamps: 'body', even: true, pores: 0.3, maskFn: (x, y) => ss(B1.y0 + 4, B1.y0 + 8, y) * ss(B1.y0 + 21, B1.y0 + 15, y), patch: { scale: 50, amount: 0.3, sharp: 0.5 } },
        { color: P('primer'), coverage: 0.1, size: 30, stamps: 'soft' },
      ],
      details: [
        { print: 'print', draw: (c) => { c.fillStyle = '#A9604C'; c.fillRect(R_STONE[0], B1.y0 - 3, R_STONE[2] - R_STONE[0], 5); c.fillRect(R_STONE[0], DR.y0 + 5, R_STONE[2] - R_STONE[0], 3.4); } },
        (c) => { c.fillStyle = P('window_maroon'); for (const w of M.windows) c.fill(shape.arch(w.centre_x, w.sill_y, w.w, w.h, ARCH_POINT).path); },
      ],
    });

    // --- the doorway: maroon frame and the light inside
    a.frame = tex(R_DOOR, { base: P('door_frame'), seed: 2150, reveal: { steps: 5, mode: 'mask', order: 'random', dab: 40 },
      layers: [{ color: '#33161B', coverage: 0.4, size: 24, stamps: 'open' }, { color: '#6B3A34', coverage: 0.26, size: 16, stamps: 'body', maskFn: (x) => ss(cx - 6, cx + 26, x) }] });
    const dR = (x, y) => Math.hypot((x - cx) / 23, (y - (DOOR.y1 - 42)) / 44);
    a.glow = tex(R_DOOR, { base: P('door_glow'), seed: 2151, reveal: { steps: 5, mode: 'mask', order: 'radial', from: [cx, DOOR.y1 - 40], dab: 40 },
      layers: [
        { color: '#F2BE48', coverage: 0.5, size: 24, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.8, 1.25, dR(x, y)), patch: { scale: 40, amount: 0.3 } },
        { color: '#E8A020', coverage: 0.22, size: 16, stamps: 'open', maskFn: (x, y) => ss(1.0, 1.4, dR(x, y)) },
        { color: P('door_core'), coverage: 0.86, size: 22, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.72, 0.5, dR(x, y)) },
      ] });
    // brighter states: 1 = from 21.27 (the light spills), 2 = from 23.00 (link 2)
    a.glow1 = tex(R_DOOR, { seed: 2152, layers: [
      { color: P('door_core'), coverage: 0.8, size: 24, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(1.1, 0.82, dR(x, y)) },
      { color: '#FFFDF6', coverage: 0.6, size: 18, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.6, 0.36, dR(x, y)) },
    ] });
    // (state 2 keeps a rim of gold inside the maroon frame: a door bleached to the wall's ivory stops reading as light)
    a.glow2 = tex(R_DOOR, { seed: 2153, layers: [
      { color: P('door_core'), coverage: 0.84, size: 20, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(1.16, 0.96, dR(x, y)) },
      { color: '#FFFDF6', coverage: 0.84, size: 18, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.82, 0.6, dR(x, y)) },
    ] });
    // a few warm dabs on the stone round the arch (state 2) — the doorway's own light, no rays
    a.doorHalo = E.makeCluster({
      w: 150, h: 150, seed: 2154, anchor: [75, 110], edgeSoftness: 0.8,
      shapeFn: (x, y) => { const d = Math.hypot((x - 75) / 62, (y - 86) / 76); return clamp(Math.min((d - 0.5) / 0.2, (1.06 - d) / 0.3)) * ss(134, 112, y); },
      layers: [
        { color: P('door_glow'), coverage: 0.5, size: 20, stamps: 'body', pores: 0.3, patch: { scale: 40, amount: 0.3 } },
        { color: P('door_core'), coverage: 0.24, size: 13, stamps: 'open' },
      ],
      reveal: { steps: 1 },
    });
    // the breathing core (drawn clipped to the door opening, scaled by a breath)
    a.core = E.makeGlow({ rx: 15, ry: 30, color: P('door_core'), core: '#FFFDF6', density: 0.86, falloff: 0.5, seed: 2155 });

    // --- minaret: ONE sprite (shaft, balcony on a corbel, lead-blue cone)
    const mn = M.minaret, mx = (mn.shaft_x[0] + mn.shaft_x[1]) / 2, balc = mn.balconies_y[0];
    const corbel = shape.polygon([[mn.x0 + 2, balc + 3], [mn.x1 - 2, balc + 3], [mn.shaft_x[1], balc + 20], [mn.shaft_x[0], balc + 20]]);
    const shaftShape = shape.union(
      shape.rect(mn.shaft_x[0], balc, mn.shaft_x[1] - mn.shaft_x[0], mn.base_y - balc + 2),
      shape.rect(mn.shaft_x[0] + 2, mn.cap_base_y - 2, mn.shaft_x[1] - mn.shaft_x[0] - 4, balc - mn.cap_base_y + 4),
      shape.rect(mn.x0, balc - 13, mn.x1 - mn.x0, 16), corbel,
      shape.rect(mn.shaft_x[0] - 1, mn.cap_base_y - 2, mn.shaft_x[1] - mn.shaft_x[0] + 2, 7),
    );
    const shaft = E.bakeStencil({
      shape: shaftShape, base: P('stone_ivory'), anchor: [0, 0], seed: 2160,
      layers: [
        { color: P('stone_light'), coverage: 0.56, size: 34, tint: 0.015, pores: 0.3, maskFn: (x) => ss(mx - 6, mx + 8, x) },
        { color: '#DCCFC6', coverage: 0.6, size: 28, tint: 0.02, stamps: 'open', pores: 0.3, maskFn: (x) => lerp(1, 0.25, ss(mx - 12, mx + 6, x)), patch: { scale: 60, amount: 0.46, seed: 6 } },
        { color: P('stone_shadow'), coverage: 0.42, size: 20, tint: 0.025, stamps: 'open', pores: 0.3, maskFn: (x) => lerp(1, 0.1, ss(mx - 14, mx - 1, x)), patch: { scale: 60, amount: 0.56, seed: 6 } },
        { color: P('primer'), coverage: 0.08, size: 22, stamps: 'soft' },
      ],
      details: [
        { print: 'print', draw: (c) => {
          c.fillStyle = '#A9604C';
          c.fill(corbel.path);
          for (let i = 0; i < 5; i++) c.fillRect(mn.x0 + 5 + i * 8.2, balc - 10, 3.2, 9);
          c.fillRect(mn.shaft_x[0] - 1, mn.cap_base_y - 1, mn.shaft_x[1] - mn.shaft_x[0] + 2, 4);
        } },
        (c) => { c.fillStyle = P('window_maroon'); c.fill(shape.arch(mx, balc - 34, 10, 26, ARCH_POINT).path); c.fill(shape.arch(mx, balc + 126, 11, 30, ARCH_POINT).path); },
      ],
      edge: { color: P('stone_edge'), width: 4, opacity: 0.5 },
      bleed: { color: '#B9A2A4', amount: 0.7 },
    });
    const capShp = shape.polygon([[mx - 17, mn.cap_base_y], [mx - 12.5, mn.cap_base_y - 20], [mx - 6.5, mn.cap_base_y - 44], [mx, mn.cap_tip_y], [mx + 6.5, mn.cap_base_y - 44], [mx + 12.5, mn.cap_base_y - 20], [mx + 17, mn.cap_base_y]]);
    const cap = E.bakeStencil({
      shape: capShp, base: dm[0], anchor: [0, 0], seed: 2161, bleed: { color: dm[1], amount: 0.7 },
      layers: [
        { color: dm[1], coverage: 0.7, size: 26, pores: 0.3, maskFn: (x) => ss(mx - 8, mx + 2, x) },
        { color: dm[2], coverage: 0.8, size: 20, pores: 0.3, maskFn: (x) => ss(mx + 1, mx + 7, x) },
        { color: dm[3], coverage: 0.5, size: 12, stamps: 'body', maskFn: (x, y) => ss(mx + 5, mx + 10, x) * ss(mn.cap_base_y - 40, mn.cap_base_y - 8, y) },
      ],
    });
    a.minaret = E.bakeSprite({ bounds: [mn.x0 - 8, mn.cap_tip_y - 8, mn.x1 + 8, mn.base_y + 6], anchor: [0, 0], seed: 2162, draw: (c) => { shaft.draw(c, 0, 0); cap.draw(c, 0, 0); } });
    a.minaretH = mn.base_y - mn.cap_tip_y;

    // --- gold finials (alem): they pop on at 20.33 / 20.37; a darker ochre edge holds them on the white core
    const finial = (S, seed, ball) => E.bakeStencil({
      shape: shape.union(
        ...(ball ? [shape.ellipse(0, -7 * S, 5.4 * S, 5.4 * S)] : []),
        shape.polygon([[-2.1 * S, 2 * S], [2.1 * S, 2 * S], [1.1 * S, -26 * S], [-1.1 * S, -26 * S]]),
        shape.ellipse(0, -17 * S, 3.7 * S, 3.7 * S), shape.polygon(crescentPts(0, -37 * S, 12.5 * S)),
      ),
      anchor: [0, 0], seed, pad: 4, ...gold({ lit: (x) => ss(-3 * S, 4 * S, x), edge: 2.2 }), base: '#DB9320',
    });
    a.finDome = finial(1.0, 2170, false);                             // stands on the knob (the chest's knob is its foot)
    a.finMin = finial(0.54, 2171, true);
    a.burstD = E.makeBurst(a.finDome, { seed: 2172, count: 9, duration: 0.1, wind: [6, -46], spread: 22, life: [0.3, 0.5], size: [5, 8] });
    a.burstM = E.makeBurst(a.finMin, { seed: 2173, count: 6, duration: 0.1, wind: [4, -40], spread: 16, life: [0.26, 0.42], size: [4, 7] });
    return a;
  });

  // ------------------------------------------------------------------ timing
  const m = T.morph;
  /** everything the morph needs at time t */
  function morphAt(t) {
    const e1 = overshoot(prog(t, m.m1[0], m.m1[1] + 0.07), 0.06, 0.74);        // lid -> dome (its settle runs 2 frames on)
    const e2 = overshoot(prog(t, m.m2[0], m.m2[1]), 0.03, 0.78);               // body widens
    const u3 = prog(t, m.m3[0], m.m3rest);                                      // minaret rises
    const cp = on(t, m.m2[0]) ? E.dabP(t, ft(m.m2[0]), { steps: 5 }) : 0;       // cross-dab on twos: 600 … 608
    return { e1, e2, u3, cp };
  }
  const doorLevel = (t) => (on(t, T.links.door) ? 2 : on(t, T.rug.spill) ? 1 : 0);

  // ------------------------------------------------------------------ draw (world px, mid slot)
  /** the minaret alone: it rises from behind the plateau's front edge, so the knoll's fringe is drawn after it */
  function drawMinaret(ctx, t) {
    if (!on(t, m.m3[0])) return;
    const { u3 } = morphAt(t), mn = M.minaret;
    const rise = overshoot(u3, 0.04, 0.8);
    ctx.save();
    ctx.beginPath();
    ctx.rect(mn.x0 - 12, mn.finial_top_y - 60, mn.x1 - mn.x0 + 24, mn.base_y + 3 - (mn.finial_top_y - 60));
    ctx.clip();
    const dy = (1 - rise) * (A.minaretH + 20);
    A.minaret.draw(ctx, 0, dy);
    const nfin = nf(t, m.fin2);
    if (nfin >= -1e-6) {
      const mx = (mn.shaft_x[0] + mn.shaft_x[1]) / 2;
      A.finMin.draw(ctx, mx, mn.cap_tip_y + 4 + dy, { scale: pop3(nfin) });
      A.burstM.draw(ctx, mx, mn.cap_tip_y + 4, t - ft(m.fin2));
    }
    ctx.restore();
  }

  function draw(ctx, t) {
    const c = T.chest;
    if (!on(t, c.body[0])) return;
    const morphing = on(t, m.m1[0]);
    // anticipation squash 19.87–19.97, released into the growth
    let sq = 0;
    if (on(t, m.squash) && !on(t, m.m2[1])) sq = 0.06 * (morphing ? 1 - E.ease.cubic.out(clamp(nf(t, m.m1[0]) / 3)) : E.ease.sine.inOut(prog(t, m.squash, m.m1[0])));
    ctx.save();
    if (sq > 0) { ctx.translate(cx, by); ctx.scale(1 + sq * 0.45, 1 - sq); ctx.translate(-cx, -by); }

    if (!morphing) {
      // ---- the chest
      const lidOn = on(t, c.lid);
      if (lidOn) cutBy(ctx, shape.rect(B0.x0 + 6, LID_BASE - 18, B0.x1 - B0.x0 - 12, 36), A.dark, R_LIGHT);
      const sp = E.dabP(t, ft(c.seam[0]), { steps: 2 });
      if (sp > 0) cutBy(ctx, shape.rect(B0.x0 + 6, LID_BASE - 2, B0.x1 - B0.x0 - 12, C.lid.seam_gap_px + 4), A.light, R_LIGHT, { p: sp });
      const p1 = E.dabP(t, ft(c.body[0]), { steps: 2 }), p2 = E.dabP(t, ft(c.body[1]), { steps: 2 }), p3 = E.dabP(t, ft(c.body[2]), { steps: 2 });
      A.body1.draw(ctx, 0, 0, { p: p1 });
      if (p2 > 0) A.body2.draw(ctx, 0, 0, { p: p2 });
      if (p3 > 0) { A.body3.draw(ctx, 0, 0, { p: p3 }); A.plate.draw(ctx, 0, 0, { p: p3 }); }
      if (lidOn) {
        const n = nf(t, c.lid);
        const dy = kf(n, [[0, -14], [1, -5], [2, 0]]), sy = kf(n, [[1, 1], [2, 0.955], [3, 0.985], [4, 1]]);
        ctx.save();
        ctx.translate(cx, LID_BASE + dy); ctx.scale(2 - sy, sy); ctx.translate(-cx, -LID_BASE);
        cutBy(ctx, shape.polygon(capPts(0, LID_BASE)), A.lid, R_LID, { bleed: { color: P('chest_wood_dark'), amount: 0.8 } });
        A.knob.draw(ctx, cx, C.knob_top_y + 10);
        ctx.restore();
        if (on(t, c.seam[1])) A.spill.draw(ctx, cx, LID_BASE + 2, { scale: 1 + 0.025 * Math.sin((t - ft(c.seam[1])) * 2.4) });
      }
      ctx.restore();
      return;
    }

    // ---- the growth into the mescid, and the mescid at rest (the same cuts with u = 1)
    const { e1, e2, cp } = morphAt(t);
    const baseY = lerp(LID_BASE, D.y1, e1), bodyTop = lerp(B0.y0, B1.y0, e2);
    const bx0 = lerp(B0.x0, B1.x0, e2), bx1 = lerp(B0.x1, B1.x1, e2);
    const bodyShape = shape.rect(bx0, bodyTop, bx1 - bx0, by - bodyTop);
    const drumShape = shape.rect(lerp(B0.x0 + 6, DR.x0, e2), baseY - 1, lerp(B0.x1 - B0.x0 - 12, DR.x1 - DR.x0, e2), bodyTop - baseY + 2);
    const stoneEdge = { color: P('stone_edge'), width: 6, opacity: 0.55 };
    // light inside, widening as the lid lifts, until the stone prints over it
    if (cp < 1) cutBy(ctx, drumShape, A.light, R_LIGHT);
    cutBy(ctx, drumShape, A.stone, R_STONE, { p: cp, edge: { ...stoneEdge, width: 4 } });
    if (cp < 1) cutBy(ctx, bodyShape, A.bodyTex, R_WOOD);
    cutBy(ctx, bodyShape, A.stone, R_STONE, { p: cp, edge: stoneEdge, bleed: cp >= 1 ? { color: '#B9A2A4', amount: 0.7 } : null });
    // lock plate -> doorway
    const frameS = archAt(e2, lerp(0, DOOR.frame_px, clamp(e2))), innerS = archAt(e2);
    // LINK 2: the doorway's own light on the stone round the arch — printed UNDER the maroon frame, which stays whole
    if (cp >= 1 && doorLevel(t) >= 2) A.doorHalo.draw(ctx, cx, DOOR.y1);
    cutBy(ctx, frameS, A.frame, R_DOOR, { p: cp });
    if (cp < 1) cutBy(ctx, innerS, A.plateTex, R_DOOR, { edge: PLATE_EDGE });
    cutBy(ctx, innerS, A.glow, R_DOOR, { p: cp });
    if (cp >= 1) {
      const lvl = doorLevel(t);
      if (lvl >= 1) cutBy(ctx, innerS, A.glow1, R_DOOR);
      if (lvl >= 2) cutBy(ctx, innerS, A.glow2, R_DOOR);
      ctx.save();
      ctx.clip(innerS.path);
      A.core.draw(ctx, cx, DOOR.y1 - 44, { scale: (1 + 0.1 * lvl) * (1 + 0.07 * Math.sin((t - ft(m.rest)) * 2.2)) });
      ctx.restore();
    }
    // lid -> dome
    const capS = shape.polygon(capPts(e1, baseY));
    if (cp < 1) cutBy(ctx, capS, A.lid, [R_LID[0], R_LID[1] + (baseY - LID_BASE)], cp > 0 ? {} : { bleed: { color: P('chest_wood_dark'), amount: 0.8 } });
    cutBy(ctx, capS, A.dome, R_DOME, { p: cp, bleed: cp >= 1 ? { color: P('dome', 1), amount: 0.8 } : null });
    // the knob rides the apex and becomes the foot of the finial
    const apex = baseY - lerp(LID_H, DOME_H, e1);
    const nfin = nf(t, m.fin1);
    if (nfin >= -1e-6) {
      A.finDome.draw(ctx, cx, apex - 13, { scale: pop3(nfin) });
      A.burstD.draw(ctx, cx, apex - 13, t - ft(m.fin1));
    }
    A.knob.draw(ctx, cx, apex - 4);
    ctx.restore();
  }

  return { draw, drawMinaret, morphAt, doorLevel, sprites: A };
}
