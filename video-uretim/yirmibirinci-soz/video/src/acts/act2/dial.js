// dial.js — the day counted out as 24 hours, and the ONE hour that becomes a coin (act 2).
//
//   12.47           a slim maroon clock-hand is printed on today's sun, pointing to five o'clock — and waits
//   12.87–13.40     it sweeps one full turn; behind its tip 24 white hour-beads are laid on the cobalt ring
//                   (8 steps on twos, 3 beads per step)
//   13.80 / 13.87   the bead under the hand is over-dabbed deep gold, swells; 13.90 it dips 6 px inward
//   13.97           it POPS out of the ring (40 px along the hand); 14.00 two little clock-hands are printed on it
//   14.23–15.37     it hovers, then floats down a gentle S-curve to his palm
//   15.37           it lands and is MINTED: a beaded rim with a milled edge is stamped round it (r 30 -> 44 -> 42)
//   15.40–15.53     a matte glint: five white-gold dabs, stepped on and off
//   … 22.00         held; shown in the open hand (22.00–22.17), the long hand ticks one notch (22.17)
//   22.43–22.87     the cast: a low arc, face to us the whole way; 22.87–22.97 it sinks into the niche's glow
//   16.83 / 16.90   hand and beads take the world's recede: an over-dab through the sponge (pores keep the original)
//
// The hour is ONE object from the ring to the niche: the same gold face with the same two hands.

export function makeDial(E, W, U, acting) {
  const L = W.layout, P = L.pal, { shape, clamp, lerp, smoothstep: ss } = E;
  const { TL: T, ft, on, nf, kf, pop3 } = U;
  const H = L.hours, S = L.sun, C = L.coin, fps = L.fps;
  const once = (k, f) => E.once('act2/dial/' + k, f);
  const DEG = Math.PI / 180;

  // ------------------------------------------------------------------ geometry
  const [DX, DY] = H.centre;
  const beadAt = (k) => { const a = (150 + 15 * k) * DEG; return [DX + H.ring_r * Math.sin(a), DY - H.ring_r * Math.cos(a)]; };
  const HD = H.clock_hand, A0 = HD.start_angle_deg;                         // 150° clockwise from 12
  const OUT = [Math.sin(A0 * DEG), -Math.cos(A0 * DEG)];                    // the hand's direction at rest (to 5 o'clock)
  const CHOSEN = H.chosen_bead.centre, POPPED = H.chosen_bead.popped_to;    // (645, 522) -> (665, 557)
  const RB = H.bead_r, R30 = C.bead_r_when_it_leaves_the_ring, R42 = C.r;   // 22, 30, 42
  const HAND_LONG = 21.5, HAND_SHORT = 12.5;                                 // the coin's two clock-hands (hub to the centre of the tip's cap)

  const A = once('all', () => {
    const a = {};
    // --- the clock-hand (drawn pointing along +x, anchored at the hub): ONE PLAIN LANCET (review 2, N6) — a round hub
    //     disc (r 14) on the sun's centre, a blade that is widest (17 px) at one fifth of its length and tapers STRAIGHT
    //     to a point at the bead ring, and a short counter-tail (18 % of the length). No knobs, no leaf tip.
    const HL = HD.length;                                                   // 186
    const TAIL = 0.18 * HL;
    const hand = shape.union(                                               // (all members wind the same way: opposite windings cut a hole where they overlap)
      shape.polygon([[0, -7], [0.2 * HL, -8.6], [HL - 1, -0.7], [HL, 0], [HL - 1, 0.7], [0.2 * HL, 8.6], [0, 7]]),
      shape.polygon([[-TAIL, -3.7], [0, -6.4], [0, 6.4], [-TAIL, 3.7]]),
      shape.ellipse(-TAIL, 0, 3.7),
      shape.ellipse(0, 0, 14),
    );
    // Paint: two maroon tones dabbed over the base; its pores and flecks are a LIGHTER MAROON, small and dense (lead's
    // rule D2: never cream on a dark fill — cream flecks read as chipped paint).
    // The recede (16.83 / 16.90) is PAINT too (N7): a dusty, lighter mauve is dabbed over the hand through the sponge —
    // about half of it, then five sixths; the rest keeps the original dark maroon. The silhouette stays whole.
    const HBASE = P('clock_hand'), HDARK = '#33151A', HLIT = '#6B3A34', HPORE = '#7C4A4C';
    const OVER = ['#806069', '#9A7F88'], OVER_LIT = ['#977980', '#AE959B'];
    const mkHand = (n) => E.bakeStencil({
      shape: hand, base: HPORE, anchor: [0, 0], seed: 2501, bleed: false, density: 2,
      layers: [
        { color: HBASE, coverage: 0.99, size: 20, stamps: 'dense', pores: 0.5, poreScale: 0.5, tint: 0.02 },
        { color: HDARK, coverage: 0.4, size: 24, stamps: 'open', pores: 0.3, poreScale: 0.5, patch: { scale: 60, amount: 0.4 } },
        { color: HLIT, coverage: 0.5, size: 18, stamps: 'body', pores: 0.3, poreScale: 0.5, maskFn: (x, y) => ss(2, -4, y), patch: { scale: 50, amount: 0.3 } },
        ...(n ? [
          { color: OVER[n - 1], coverage: [0.52, 0.86][n - 1], size: 22, stamps: 'body', pores: 0.35, poreScale: 0.6, tint: 0.02 },
          { color: OVER_LIT[n - 1], coverage: [0.2, 0.36][n - 1], size: 16, stamps: 'open', maskFn: (x, y) => ss(3, -3, y), patch: { scale: 50, amount: 0.3 } },
        ] : []),
      ],
      reveal: { steps: 2, order: 'sweep', angle: 0, jitter: 0.5, dab: 60 },
    });
    a.hand = [0, 1, 2].map(mkHand);

    // --- hour-beads: white-ivory, lavender shadow inside the lower-left edge; 5 prints, 3 states. The recede (16.83 /
    //     16.90) is an OVER-DAB of sky paint through the sponge (review 2, N7): about two fifths, then seven tenths of
    //     each bead is printed over with a soft sky blue; the pores between the prints keep the bead's own ivory and its
    //     lavender shadow. Every bead takes the dabs differently (5 prints) — paint, not a veil
    const bl = E.sphereLight(0, 0, RB, RB);
    const mkBead = (seed, st) => E.bakeStencil({
      shape: shape.ellipse(0, 0, RB), base: P('hour_bead'), anchor: [0, 0], seed, density: 2,
      bleed: st ? false : { color: P('hour_bead_shadow'), amount: 0.5 },
      layers: [
        { color: '#DCD6EC', coverage: 0.7, size: 20, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.46, 0.3, bl(x, y)) },
        { color: '#FFFFFF', coverage: 0.6, size: 16, stamps: 'body', maskFn: (x, y) => ss(0.66, 0.84, bl(x, y)) },
        ...(st ? [
          { color: '#9DC2DD', coverage: [0.46, 0.8][st - 1], size: 12, stamps: 'body', pores: 0.5, poreScale: 0.5, tint: 0.03 },
          { color: '#86AFD3', coverage: [0.14, 0.3][st - 1], size: 11, stamps: 'open', maskFn: (x, y) => ss(0.56, 0.36, bl(x, y)) },
          { color: '#B5D2E6', coverage: [0.08, 0.16][st - 1], size: 10, stamps: 'soft', maskFn: (x, y) => ss(0.6, 0.8, bl(x, y)) },
        ] : [{ color: P('primer'), coverage: 0.05, size: 10, stamps: 'soft' }]),
      ],
      edge: { color: [P('hour_bead_shadow'), '#9F9CCB', '#98A0CC'][st], width: 4.6, opacity: [0.62, 0.54, 0.48][st] },
    });
    a.beads = [0, 1, 2].map((st) => [2511, 2512, 2513, 2514, 2515].map((s) => mkBead(s, st)));
    // --- the sun's disc under the hand: the world over-dabs it with its pale variant (16.83 / 16.90); here the same
    //     sponge leaves about a quarter of it in the ORIGINAL gold — deep-gold prints in the pale coat, clipped to the disc
    a.sunPores = E.bakeStencil({
      shape: shape.ellipse(0, 0, S.r - 2), anchor: [0, 0], seed: 2517, bleed: false,
      layers: [
        { color: '#EFB449', coverage: 0.27, size: 30, stamps: 'open', pores: 0.3, tint: 0.03, patch: { scale: 110, amount: 0.3 } },
        { color: P('today_disc'), coverage: 0.07, size: 22, stamps: 'open', patch: { scale: 110, amount: 0.42 } },
        { color: '#EFB449', coverage: 0.1, size: 20, stamps: 'soft', patch: { scale: 80, amount: 0.4, seed: 5 } },
      ],
      reveal: { steps: 1 },
    });
    // --- the ring they sit on, receded: a porous over-dab of a greyed sky blue on the cobalt band (r 160–250), in the
    //     world's two recede steps — the cobalt stays in its pores, so the ring is still a ring, one step nearer the sky
    const vr = (x, y) => Math.hypot(x - DX, y - DY);
    a.veil = U.field({
      box: [DX - 270, DY - 270, DX + 270, DY + 270], seed: 2516, edge: 0.5, reveal: { steps: 2, order: 'random', layerMix: 0 },
      depth: (x, y) => { const r = vr(x, y); return clamp(Math.min((r - 158) / 26, (252 - r) / 26)); },
      layers: [
        { color: '#6FA6CF', coverage: 0.66, size: 56, stamps: 'open', tint: 0.03, pores: 0.3 },
        { color: '#7DB4D6', coverage: 0.3, size: 42, stamps: 'soft', patch: { scale: 120, amount: 0.4 } },
      ],
    });

    // --- … and on its right side, toward the far light, its outer rim is taken back into the sky (N7): light-blue prints
    //     over r 240–284 within 70° of three o'clock, so that the cobalt ends at r 238 there (the beads end at 232) and
    //     40 px of plain sky lie between the ring and the deepened sky of the light
    a.rimSky = U.field({
      box: [DX + 60, DY - 280, DX + 300, DY + 280], seed: 2518, edge: 0.4, reveal: { steps: 2, order: 'random', layerMix: 0 },
      depth: (x, y) => { const r = vr(x, y), th = Math.atan2(y - DY, x - DX); return clamp(Math.min((r - 240) / 7, (284 - r) / 22)) * ss(1.25, 0.95, Math.abs(th)); },
      layers: [
        { color: P('sky_light_blue'), coverage: 0.97, size: 26, tint: 0.03, pores: 0.15 },
        { color: '#97CEE4', coverage: 0.3, size: 24, stamps: 'soft' },
        { color: '#74B5D0', coverage: 0.14, size: 22, stamps: 'open', patch: { scale: 90, amount: 0.4 } },
      ],
    });

    // --- the hour: gold face r 30 (matte, rimless), two maroon hands, and the rim that is stamped round it
    const gl = E.sphereLight(0, 0, R30, R30);
    a.face = E.bakeStencil({
      shape: shape.ellipse(0, 0, R30), base: P('hour_gold'), anchor: [0, 0], seed: 2520, density: 2, bleed: false,
      reveal: { steps: 2, mode: 'mask', order: 'random', dab: 34 },
      layers: [
        { color: '#C8811A', coverage: 0.56, size: 26, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.5, 0.32, gl(x, y)), patch: { scale: 40, amount: 0.3 } },
        { color: '#F4BC3A', coverage: 0.8, size: 24, pores: 0.3, maskFn: (x, y) => ss(0.56, 0.64, gl(x, y)) },
        { color: P('today_light'), coverage: 0.8, size: 18, stamps: 'body', pores: 0.3, maskFn: (x, y) => ss(0.76, 0.83, gl(x, y)) },
        { color: P('today_pale'), coverage: 0.6, size: 11, stamps: 'body', maskFn: (x, y) => ss(0.9, 0.95, gl(x, y)) },
      ],
      edge: [{ color: P('coin_rim'), width: 2.6, opacity: 0.8, dir: null }, { color: '#8A4E16', width: 4.4, opacity: 0.5 }],
    });
    // the emblem (review 2, N2): a clock face read at a glance — two THIN, clearly separate hands at a RIGHT ANGLE
    // (three o'clock: the long one up, tip at 0.77 of the face; the short one to the right, tip at 0.5) from a small
    // dark-maroon hub. No pin, no second colour. Their pores are a lighter maroon (D2).
    const mkHour = (len, r0, r1, seed) => E.bakeStencil({
      shape: shape.capsule(len, r0, r1), base: '#7C4A4C', anchor: [0, 0], seed, density: 2, bleed: false,
      layers: [
        { color: P('clock_hand'), coverage: 0.99, size: 18, stamps: 'dense', pores: 0.3, poreScale: 0.35, tint: 0.02 },
        { color: '#33151A', coverage: 0.3, size: 18, stamps: 'open', pores: 0.3, poreScale: 0.4 },
      ],
    });
    a.long = mkHour(HAND_LONG, 2.5, 1.7, 2521);
    a.short = mkHour(HAND_SHORT, 2.7, 2.1, 2522);
    a.hub = E.bakeStencil({ shape: shape.ellipse(0, 0, 4.7), base: '#3E1B20', anchor: [0, 0], seed: 2523, density: 2, bleed: false,
      layers: [{ color: P('clock_hand'), coverage: 0.6, size: 8, stamps: 'body', pores: 0 }] });
    // rim: dark-ochre band, a ring of small gold beads, a milled outer edge
    a.rim = E.bakeStencil({
      shape: shape.ellipse(0, 0, R42), base: '#C6923F', anchor: [0, 0], seed: 2524, density: 2, bleed: false,   // base (in the pores) = a lighter ochre of the rim's own hue (D2)
      layers: [
        { color: P('coin_rim'), coverage: 0.99, size: 20, stamps: 'dense', pores: 0.45, poreScale: 0.45, tint: 0.02 },
        { color: '#7C4614', coverage: 0.4, size: 22, stamps: 'open', pores: 0.3, poreScale: 0.45, maskFn: (x, y) => ss(4, -12, x - y) },
        { color: '#B8741E', coverage: 0.5, size: 18, stamps: 'body', pores: 0.3, poreScale: 0.45, maskFn: (x, y) => ss(-6, 14, x - y) },
      ],
      details: [
        { print: 'solid', draw: (c) => {                                    // the beaded ring
          const n = 26, r = (R30 + R42) / 2 - 1.2;
          for (let i = 0; i < n; i++) { const th = (i / n) * 6.2832; c.fillStyle = Math.cos(th + 0.8) > 0 ? '#F8D060' : '#E8A93A'; c.beginPath(); c.arc(Math.cos(th) * r, Math.sin(th) * r, 2.9, 0, 7); c.fill(); }
        } },
        { print: 'solid', draw: (c) => {                                    // the milled edge
          c.strokeStyle = '#E0A030'; c.lineWidth = 1.7; c.lineCap = 'butt';
          for (let i = 0; i < 52; i++) { const th = ((i + 0.5) / 52) * 6.2832; c.beginPath(); c.moveTo(Math.cos(th) * (R42 - 3.6), Math.sin(th) * (R42 - 3.6)); c.lineTo(Math.cos(th) * (R42 + 1), Math.sin(th) * (R42 + 1)); c.stroke(); }
        } },
      ],
      edge: { color: '#5E3410', width: 3.2, opacity: 0.6 },
    });
    // --- glint: five small white-gold dabs, each a crisp little print on a gold under-dab (a matte wall has no shine,
    //     and the mist behind is pale: the gold rim carries them)
    a.glint = [6.5, 8.5, 9.5, 8, 6].map((r, i) => {
      const under = E.makeGlow({ r: r + 3.4, color: '#E39B24', core: '#F0B030', density: 0.96, falloff: 0.3, seed: 2530 + i });
      const over = E.makeGlow({ r, color: '#FFF6D8', core: '#FFFFFF', density: 0.97, falloff: 0.3, seed: 2540 + i });
      return E.bakeSprite({ bounds: [-r - 9, -r - 9, r + 9, r + 9], anchor: [0, 0], seed: 2550 + i, density: 2, draw: (c) => { under.draw(c, 0, 0); over.draw(c, 0, 0); } });
    });
    return a;
  });

  // ------------------------------------------------------------------ the hand's angle (deg clockwise from 12)
  const SW0 = T.hand.sweep[0], SW1 = T.hand.sweep[1];
  const N_SWEEP = Math.round((ft(SW1) - ft(SW0)) * fps);                    // 16 frames
  function handAngle(t) {
    const n = nf(t, SW0);
    if (n <= 0) return A0;
    if (n >= N_SWEEP) return A0 + 360 + kf(n - N_SWEEP, [[0, 0], [1, 4], [2, 1.2], [3, 0]]);       // 4° overshoot, settled 13.50
    // 45° per two frames; eased only on its first and last two frames
    const turn = (m) => (m <= 2 ? kf(m, [[0, 0], [1, 14], [2, 45]]) : 22.5 * m);
    return A0 + (n <= N_SWEEP / 2 ? turn(n) : 360 - turn(N_SWEEP - n));
  }
  const recede = (t) => W.state(t).sun.recede;                              // 0 | 1 | 2 (16.83 / 16.93)

  // ------------------------------------------------------------------ the coin's picture
  const SHORT_A = 0;                                                        // the short hand points to three o'clock (+x)
  /**
   * o: {scale, k (the coin's size in the world, 1 … K2), rot, rim (null | scale of the stamped rim), sx, sy, tick (deg),
   * faceP, hands}. The two clock-hands keep their length with the coin but not their stroke: on the small coin of the
   * wide framing they are printed 1.3 x as broad (6 px at their root), so that the right angle still reads on a phone.
   */
  function drawCoin(ctx, x, y, o = {}) {
    const kk = o.k ?? 1, sc = (o.scale ?? 1) * kk;
    if (sc <= 0.01) return;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(sc * (o.sx ?? 1), sc * (o.sy ?? 1));
    if (o.rim) A.rim.draw(ctx, 0, 0, { scale: o.rim });
    A.face.draw(ctx, 0, 0, { p: o.faceP ?? 1 });
    if (o.hands !== false) {
      const broad = 1 + 0.3 * clamp((1 - kk) / (1 - acting.K2));
      for (const [spr, rot] of [[A.short, SHORT_A], [A.long, (-90 + (o.tick ?? 0)) * DEG]]) {
        ctx.save();
        ctx.rotate(rot);
        ctx.scale(1, broad);
        spr.draw(ctx, 0, 0);
        ctx.restore();
      }
      A.hub.draw(ctx, 0, 0, { scale: 1 + 0.5 * (broad - 1) });
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ the hour's journey
  const G = T.gold;
  const F_POP = L.fr(G.pop), F_SET = L.fr(G.settled), F_LAND = L.fr(G.land), F_REL = L.fr(T.coin.release), F_NICHE = L.fr(T.coin.niche);
  // float: hover, then a gentle S-curve to where the palm will be
  const landAt = (() => { const h = acting.held(ft(G.land)); return [h.x, h.y]; })();
  const floatPath = E.curve([POPPED, [656, 598], [670, 660], [705, 722], [landAt[0] + 1, landAt[1] - 26], landAt], { tension: 0.5 });
  const F_GO = F_SET + 7;                                                   // it begins to float down at 14.47
  const BIG = 34 / R30, F_BIG0 = 428, F_BIG1 = 455;                         // the hovering hour's size, and the camera's follow move
  // the cast: quadratic bezier, sine ease-out by arc length (storyboard's speed table: placed, not pitched)
  const FL = C.flight, relAt = (() => { const h = acting.held(ft(T.coin.release)); return [h.x, h.y]; })();   // from his finger tips
  const bez = (u) => { const v = 1 - u; return [v * v * relAt[0] + 2 * v * u * FL.bezier_control[0] + u * u * FL.target_niche_centre[0], v * v * relAt[1] + 2 * v * u * FL.bezier_control[1] + u * u * FL.target_niche_centre[1]]; };
  const LUT = (() => { const pts = Array.from({ length: 241 }, (_, i) => bez(i / 240)); const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, d, len: d[d.length - 1] }; })();
  const atArc = (s) => { const want = clamp(s) * LUT.len; let lo = 0, hi = LUT.d.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (LUT.d[m] <= want) lo = m; else hi = m; } const u = (want - LUT.d[lo]) / ((LUT.d[hi] - LUT.d[lo]) || 1); return [lerp(LUT.pts[lo][0], LUT.pts[hi][0], u), lerp(LUT.pts[lo][1], LUT.pts[hi][1], u)]; };
  const SPEEDS = [44, 44, 42, 40, 38, 35, 31, 27, 23, 18, 13, 8, 3];        // px per frame
  const DIST = SPEEDS.reduce((acc, v) => { acc.push(acc[acc.length - 1] + v); return acc; }, [0]);
  const flightKeys = DIST.map((d, i) => [i, d / DIST[DIST.length - 1]]);

  /**
   * Where and how the hour is at time t: null (not there) or
   * { slot: 'sky' | 'hands' | 'front', x, y, scale, rot, rim, sx, sy, tick, faceP, hands }.
   */
  function coinAt(t) {
    const f = t * fps;
    if (!on(t, G.dab[0])) return null;
    if (f < F_POP - 1e-6) {
      // in the ring: over-dabbed gold in two steps, swelling; at 13.90 it dips 6 px inward
      const n = nf(t, G.dab[0]);
      const sw = kf(n, [[0, 1], [1, 1.1], [2, 1.2], [3, 1.25], [4, 1.22]]);
      const dp = on(t, G.dip) ? -6 * kf(nf(t, G.dip), [[0, 0.7], [1, 1]]) : 0;
      return { slot: 'sky', x: CHOSEN[0] + OUT[0] * dp, y: CHOSEN[1] + OUT[1] * dp, scale: (RB / R30) * sw, faceP: E.dabP(t, ft(G.dab[0]), { steps: 2 }), hands: false };
    }
    if (f < F_SET - 1e-6) {
      // the pop: 40 px outward along the hand, r 22 -> 30, overshoot, settled 14.23
      const n = f - F_POP;
      const d = kf(n, [[0, 0.42], [1, 0.86], [2, 1.13], [3, 1.17], [4, 1.09], [5, 1.0], [6, 0.97], [7, 0.99], [8, 1]]);
      const s = kf(n, [[0, 0.95], [1, 1.2], [2, 1.33], [3, 1.3], [4, 1.2], [5, 1.14], [6, BIG]]);            // r 40 at its peak, r 34 settled
      return { slot: 'sky', x: lerp(CHOSEN[0], POPPED[0], d), y: lerp(CHOSEN[1], POPPED[1], d), scale: s, hands: on(t, G.hands) };
    }
    if (f < F_LAND - 1e-6) {
      // hover (a slow bob), then down the S-curve; it arrives with a little weight
      const n = f - F_SET;
      const bob = 2.6 * Math.sin((n / 9) * Math.PI) * ss(F_GO - F_SET + 6, 0, n);
      const u = E.ease.sine.in(clamp((f - F_GO) / (F_LAND - F_GO)));
      const [x, y] = floatPath.at(u);
      // r 34 while it hovers at HOME (on «saatini» it must read as an hour at once); it is r 30 again by the time the
      // camera has followed it down (14.27–15.17: the push-in more than makes up for it — on screen it only grows)
      const big = lerp(BIG, 1, E.ease.sine.inOut(clamp((f - F_BIG0) / (F_BIG1 - F_BIG0))));
      return { slot: 'hands', x, y: y - bob, scale: big, rot: 0.05 * Math.sin(n * 0.21) * (1 - u) };
    }
    if (f < F_REL - 1e-6) {
      // in his hand: minted on landing (the rim is stamped round it), then held, then shown in his finger tips —
      // always BEHIND the hand (slot `hands`): thumb and fingers lie in front of its rim, no layer ever flips
      const n = f - F_LAND, h = acting.held(t);
      const rim = kf(n, [[0, 44 / 42], [1, 1.03], [2, 1]]);
      const sy = kf(n, [[0, 0.94], [1, 0.975], [2, 1]]);
      return { slot: 'hands', x: h.x, y: h.y + (1 - sy) * R42, scale: 1, k: h.k, rim, sy, sx: 2 - sy, tick: on(t, T.coin.tick) ? 6 : 0 };
    }
    if (f < F_NICHE + 3 - 1e-6) {
      // the cast: face to us, a small in-plane roll out and back; then it sinks into the glow (3 frames). On the release
      // frame it is still between his fingers (behind them); one frame later it has cleared the hand
      const n = f - F_REL, s = kf(n, flightKeys);
      const [x, y] = atArc(s);
      const sink = f - F_NICHE;
      return { slot: n < 0.5 ? 'hands' : 'front', x, y, k: acting.K2, scale: sink > 0 ? kf(sink, [[0, 1], [1, 0.74], [2, 0.42], [3, 0]]) : 1, rim: 1, tick: 6, rot: 11 * DEG * Math.sin(Math.PI * clamp(n / 13)) };
    }
    return null;
  }

  // ------------------------------------------------------------------ sky slot: beads, hand, the hour while it is in the ring
  const BEAD0 = L.fr(T.beads.first);
  function drawSky(ctx, t) {
    if (!on(t, T.hand.print)) return;
    const st = recede(t), f = t * fps;
    if (st > 1) A.sunPores.draw(ctx, S.x, S.y);
    if (st > 0) { A.veil.draw(ctx, { p: st / 2 }); A.rimSky.draw(ctx, { p: st / 2 }); }
    // beads k = 1..24, three per step on twos, behind the hand's tip
    if (f >= BEAD0 - 1e-6) {
      const goldOn = on(t, G.dab[1]);
      for (let k = 1; k <= H.count; k++) {
        if (k === H.chosen_bead.k && goldOn) continue;                    // the chosen one has turned gold: it is the coin now
        const n = f - (BEAD0 + T.beads.every * (Math.ceil(k / T.beads.perStep) - 1));
        if (n < -1e-6) break;
        const [x, y] = beadAt(k);
        A.beads[st][(k * 3) % 5].draw(ctx, x, y, { scale: pop3(n) });
      }
    }
    const coin = coinAt(t);
    if (coin && coin.slot === 'sky') drawCoin(ctx, coin.x, coin.y, coin);
    // the clock-hand: printed 12.47 (complete one frame later), still, then one sweep
    const hp = clamp((nf(t, T.hand.print) + 1) / 2);
    A.hand[st].draw(ctx, DX, DY, { rot: (handAngle(t) - 90) * DEG, p: hp });
  }

  // ------------------------------------------------------------------ hands / front slots: the hour with him
  function drawHeld(ctx, t, slot) {
    const coin = coinAt(t);
    if (!coin || coin.slot !== slot) return;
    drawCoin(ctx, coin.x, coin.y, coin);
  }
  /**
   * The minting's glint (front slot): five dabs on an arc over the coin — the middle three at 15.40, all five a
   * little further out at 15.47, the outer pair fading at 15.53, gone 15.60. One small "ting", no gloss.
   */
  const GA = [-152, -118, -84, -50, -16], GR = [64, 72, 69, 74, 66];
  function drawGlint(ctx, t) {
    const k = L.count(t, T.glint);
    if (!k || on(t, T.glintOff)) return;
    const coin = coinAt(t);
    if (!coin) return;
    const show = k === 1 ? [1, 2, 3] : k === 2 ? [0, 1, 2, 3, 4] : [0, 2, 4];
    for (const i of show) {
      const born = i >= 1 && i <= 3 ? T.glint[0] : T.glint[1];
      const a = GA[i] * DEG, r = GR[i] + 7 * (k - 1);
      A.glint[i].draw(ctx, coin.x + Math.cos(a) * r, coin.y + Math.sin(a) * r, { scale: pop3(nf(t, born)) * (k === 3 ? 0.72 : 1), rot: i * 1.3 });
    }
  }

  return { drawSky, drawHeld, drawGlint, drawCoin, coinAt, handAngle, beadAt, sprites: A };
}
