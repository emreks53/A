// acting.js — the man's ACTING in act 2 (12.20–23.80) and where the coin sits in his hand.
//
// One pose per frame, a pure function of absolute time, assembled from:
//   * the RIGHT ARM. Its three big moves are authored as CHANNELS of absolute angles (upper arm, forearm, hand, the two
//     foreshortenings), each a monotone cubic through frame keys, so that a move has weight: the upper arm leads, the
//     forearm follows, the hand drags and arrives last, nothing snaps —
//       14.57–15.23  the forearm RAISE to receive the hour (give, rise with a dragging hand, 5° overshoot, settle)
//       22.00–23.23  the hand opens — one underhand swing from the shoulder — release — the GIVING LINE (one clean line
//                    from shoulder to finger tips, palm down-forward) — and the arm sinks, at rest from 23.23
//     while the hour rests on his palm (15.23–15.77) the arm is solved live on the giving palm, and
//       15.77–16.07  the hand closes over the coin and draws it in: the WRIST runs a short arc (cubic in-out, 3 % settle)
//   * the body under the swing (dip, half-step, hips, shoulders) — its own channels: the weight follows the hand and
//     arrives after it (hips 22.60, head 22.70)
//   * the head: its own track — small moves that lead the eye to where the next thing happens
//
// The coin is HELD, never stuck on: while he has it (15.37–22.43) it lies behind his hand, placed in the hand's own
// frame from the wrist (`held`): standing on the cupped palm — sunk into the closing hand — in the half-closed mitten
// (the mitten in front of its lower-left third) — and, shown, beyond the open finger tips with the thumb on its rim.
//
// Frames in comments are film frames (30 fps); storyboard times are in util.js (TL).

export function makeActing(E, W, U) {
  const M = W.man, P = M.POSES, L = W.layout, fps = L.fps, e = E.ease;
  const { TL: T, kf } = U;
  const C = L.coin, lerp = E.lerp, clamp = E.clamp;
  const k = (frame, v, ease) => ({ t: frame / fps, v, ease });
  const io = e.sine.inOut;

  /**
   * A channel: monotone cubic (Fritsch–Carlson) through [frame, value] keys — smooth, never overshooting a key, flat
   * where a key repeats or the direction turns, at rest on its first and last key.
   */
  const chan = (keys) => {
    const n = keys.length, x = keys.map((q) => q[0]), y = keys.map((q) => q[1]);
    const d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) continue;
      const h0 = x[i] - x[i - 1], h1 = x[i + 1] - x[i], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
    return (f) => {
      if (f <= x[0]) return y[0];
      if (f >= x[n - 1]) return y[n - 1];
      let i = 0;
      while (f > x[i + 1]) i++;
      const h = x[i + 1] - x[i], u = (f - x[i]) / h, u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * y[i] + (u3 - 2 * u2 + u) * h * m[i] + (3 * u2 - 2 * u3) * y[i + 1] + (u3 - u2) * h * m[i + 1];
    };
  };
  // an arm by ABSOLUTE angles (deg in the arm's side frame: 0 = down, 90 = outward): upper arm U, forearm F, hand H
  const absOf = (arm) => ({ U: arm.a, fa: arm.fa, F: arm.a + arm.b, fb: arm.fb, H: arm.a + arm.b + arm.w });
  const armOf = (U_, fa, F, fb, H, hand, flip, pin) => ({ a: U_, fa, b: F - U_, fb, w: H - F, hand, flip, pin });

  // ------------------------------------------------------------------ poses
  const RECV_AT = C.right_palm_receive;                  // (720, 830)
  const recvOpts = { hand: 'cupped', handAngle: 94 };
  const RECV = M.reach(P.back_neutral, 'R', RECV_AT, recvOpts);
  const SIDE = P.back_coin_held_at_side, SIDE_T = P.back_turned_right, FINAL = P.back_final_stand;
  const R0 = absOf(M.REST_ARM), R1 = absOf(RECV.armR), S = absOf(SIDE_T.armR);
  // 16.07–22.00: held at his side; 16.07–16.40 he turns toward the right column (upper arm, forearm + 2 f, hand + 2 f)
  const side = M.track([k(482, SIDE), k(492, SIDE_T, io), k(660, SIDE_T)], { overlap: 2 });

  // ------------------------------------------------------------------ 14.57–15.23 the RAISE (frames 437–457)
  // a small give (the elbow drifts in, the forearm swings back 6°, the shoulders sink 1 px), then the forearm rises:
  // slow off the mark, fastest half-way (20° per frame), into a 5° overshoot at 15.12, settled 15.23 — the upper arm
  // swings out 6° with it and comes back, the hand drags behind the forearm and turns palm-up last
  const raise = {
    U: chan([[437, R0.U], [440, R0.U - 1], [447, R0.U + 6], [452, R0.U + 2.5], [457, R1.U]]),
    F: chan([[437, R0.F], [440.5, R0.F - 6], [443, R0.F + 0.5], [446, 30], [449, 85], [451.5, R1.F - 3], [453.5, R1.F + 5], [457, R1.F]]),
    H: chan([[437, R0.H], [441, R0.H - 8], [446, 12], [449, 50], [452, 88], [454.5, R1.H + 4], [457, R1.H]]),
    fb: chan([[437, R0.fb], [451, R1.fb], [457, R1.fb]]),
    shy: chan([[437, 0], [440.5, 1.2], [447, -0.6], [453, 0.5], [457, 0]]),
    pin: chan([[450, 0], [457, 1]]),
  };
  const raisePose = (f) => ({
    ...P.back_neutral, shy: raise.shy(f),
    armR: armOf(raise.U(f), 1, raise.F(f), raise.fb(f), raise.H(f), f < 450.5 ? 'rest' : 'cupped', 1, raise.pin(f)),
  });

  // ------------------------------------------------------------------ 15.77–16.07 the CLOSE (frames 473–482)
  // the wrist runs a short arc from under the coin to his side (first down, then in), cubic in-out over 473–480 with a
  // 3 % overshoot that settles by 482; the cupped fingers rise in front of the sinking coin (474 / 475 / 476), then the
  // half-closed mitten is there (477) — while the hand is at its fastest, three frames before the arm stops
  const WR0 = M.point('wristR', RECV), WR1 = M.point('wristR', SIDE), WRC = [WR0[0] - 4, WR1[1] - 8];
  const closeS = chan([[473, 0], [476.6, 0.5], [480, 1.03], [482, 1]]);
  const closeH = chan([[473, 94], [476, 106]]);
  // palm centre in the hand's own frame (px along the hand, px across it), read off a solved pose
  const inHand = (pose, pt) => {
    const h = M.hand('R', pose), dx = pt[0] - h.wrist[0], dy = pt[1] - h.wrist[1], c = Math.cos(h.rot), s = Math.sin(h.rot);
    return [dx * c + dy * s, -dx * s + dy * c];
  };
  const PALM_CUP = inHand(RECV, M.point('palmR', RECV)), PALM_HOLD = inHand(SIDE, M.point('palmR', SIDE));
  const DEG = Math.PI / 180;
  const closePose = (f) => {
    const s = closeS(f), v = 1 - s, held = f >= 476.5;
    const wr = [v * v * WR0[0] + 2 * v * s * WRC[0] + s * s * WR1[0], v * v * WR0[1] + 2 * v * s * WRC[1] + s * s * WR1[1]];
    const H = held ? 100 : closeH(f), pc = held ? PALM_HOLD : PALM_CUP;
    const ax = [Math.sin(H * DEG), Math.cos(H * DEG)];                    // the hand's long axis on screen (his right arm, back view)
    const palm = [wr[0] + pc[0] * ax[0] - pc[1] * ax[1], wr[1] + pc[0] * ax[1] + pc[1] * ax[0]];
    return M.reach(P.back_neutral, 'R', palm, { hand: held ? 'hold' : 'cupped', flip: held ? -1 : 1, handAngle: H, elbow: R0.U, fa: lerp(1, absOf(SIDE.armR).fa, clamp(s)) });
  };

  // ------------------------------------------------------------------ 22.00–23.23 show, swing, release, the giving line, the sink
  //   660–665  the hand opens where it is and holds the coin out in its finger tips
  //   666–669  dips back (the upper arm turns forward again at 668: it leads the forearm, whose deepest point is 669 = 22.30)
  //   669–673  ONE underhand swing from the shoulder: upper arm 10 → 40° (≤ 12° a frame), forearm 18 → 60° (≤ 19° a frame),
  //            fastest ON the release frame; RELEASE at 673 = 22.43, then the forearm swings on to 78° and settles back
  //   673–680  it follows the coin and settles into the GIVING LINE: upper arm 60°, forearm 71°, hand 75° — one line from
  //            shoulder to finger tips, pointing at the rug; the hand turns palm down-forward, fingers together (676).
  //            Both segments stay foreshortened (0.57 / 0.55): the finger tips keep sky between them and the knoll
  //   680–684  held (a moving hold while the coin travels)
  //   684–697  he lets go: the WRIST drops first as the coin arrives (684–688: the hand hangs from the still-raised arm),
  //            then the arm sinks — upper arm (at rest 695.5), forearm (696.5), hand (697): AT REST from frame 697 = 23.23,
  //            the frame of the last link. Under the lead's hold stretch (22.97–23.40 runs slower) the sinking is slow and
  //            leaves the tableau a quarter of a second of complete rest before the cover
  const cast = {
    U: chan([[660, S.U], [666, S.U], [668, 9], [670, 13.5], [671, 19], [672, 28], [673, 40], [675.5, 53], [679.5, 60], [684, 59.5], [688, 55.5], [690, 48], [692, 36.5], [695.5, R0.U]]),
    fa: chan([[660, S.fa], [668, 0.86], [673, 0.56], [676, 0.57], [687, 0.57], [691, 0.66], [695.5, 1]]),
    F: chan([[660, S.F], [665, S.F + 2], [666, S.F + 2], [669, 18], [670, 21], [671, 28], [672, 41], [673, 60], [675.5, 78], [681, 71], [685, 70], [689, 59], [690.5, 51], [692.5, 37.5], [696.5, R0.F]]),
    fb: chan([[660, S.fb], [665, S.fb + 0.02], [669, 0.44], [673, 0.46], [676, 0.52], [681, 0.55], [688, 0.55], [692, 0.68], [696.5, R0.fb]]),
    H: chan([[660, S.H], [665, S.H + 4], [666, S.H + 4], [669, 86], [673, 100], [675, 100], [681, 75], [684, 73], [688, 32], [693, 14], [697, R0.H]]),
    pin: chan([[673, 1], [678, 0]]),
    // the body: dips with the wind-up, half-step forward with the swing; hips and shoulders arrive AFTER the hand
    rootX: chan([[669, 0], [673, 5.5], [678, FINAL.root.x]]),
    rootY: chan([[666, 0], [669, 4], [673, 0.6], [675.5, 0]]),
    step: chan([[669, 0], [674.5, 1]]),
    lean: chan([[666, 0], [669, -0.8], [675, 0.5], [681, 0]]),
    sh: chan([[666, SIDE_T.sh], [669, SIDE_T.sh - 1], [675, 1.4], [678, 1], [686, 1], [696, FINAL.sh]]),
    headX: chan([[673, 0], [677.5, 1.6], [682, 0]]),
    armL: chan([[666, 0], [669, -2.5], [673, 3.5], [677, 2], [687, 1], [696, 0]]),     // the left arm answers the swing a little
  };
  const castPose = (f) => {
    const hand = f < 662.5 ? 'hold' : f < 675.5 ? 'open' : f < 691.5 ? 'flat' : 'rest';
    return {
      ...SIDE_T,
      root: { x: cast.rootX(f), y: cast.rootY(f) }, step: cast.step(f), lean: cast.lean(f), sh: cast.sh(f),
      armL: { ...SIDE_T.armL, a: SIDE_T.armL.a + cast.armL(f) },
      armR: armOf(cast.U(f), cast.fa(f), cast.F(f), cast.fb(f), cast.H(f), hand, hand === 'rest' ? 1 : -1, cast.pin(f)),
    };
  };

  // ------------------------------------------------------------------ head: {pitch, tilt, turn}
  const hv = (pitch, tilt, turn) => ({ pitch, tilt, turn, x: 0, y: 0 });
  const head = E.track([
    k(366, hv(0, 0, 0)), k(369, hv(0, 0, 0)),
    k(375, hv(-5, 0, 0), io),                                            // 12.30–12.50 looks up at the dial
    k(419, hv(-5, 0, 0)), k(426, hv(-4, 2, 0.28), io),                   // 13.97 a glance to the hour that has come out of the ring
    k(434, hv(-4, 2, 0.28)), k(460, hv(3, 4, 0.6), io),                  // … and follows it down into his palm
    k(461, hv(3, 4, 0.6)), k(463, hv(5.5, 4, 0.6), e.quad.out), k(469, hv(3, 4, 0.6), io),   // the catch: a small nod
    k(473, hv(3, 4, 0.6)), k(482, hv(1.5, 2, 0.5), io),                  // draws it in
    k(483, hv(1.5, 2, 0.5)), k(492, hv(0, 0, 1), io),                    // 16.07–16.40 turns his head to screen-right
    k(513, hv(0, 0, 1)), k(524, hv(-4, 0, 1), io),                       // 17.10–17.47 lifts it to the light
    k(534, hv(-4, 0, 1)), k(549, hv(-1, 0.5, 1), io),                    // 17.80–18.30 follows the light-beads down to the plateau
    k(614, hv(-1, 0.5, 1)), k(627, hv(-3.6, 0, 1), io),                  // 20.47–20.90 lifts a little toward the mescid
    k(644, hv(-3.6, 0, 1)), k(658, hv(1.2, 0.5, 1), io),                 // 21.47–21.93 down with the unrolling rug
    k(666, hv(1.2, 0.5, 1)), k(669, hv(2.6, -1, 1), io),                 // the swing: dips with the wind-up …
    k(679, hv(-1.2, 1.5, 1), io),                                        // … and goes with the cast, arriving after the hand
    k(686, hv(-1.2, 1.5, 1)), k(696, hv(0, 0, 1), io),                   // stays turned toward the mosque
  ]);

  // ------------------------------------------------------------------ the pose
  const LAND = L.fr(T.gold.land);                                        // 461
  /** palm give under the hour (px), by frames since it lands */
  const dip = (n) => kf(n, [[0, 0], [1, 6.5], [2, 9], [3, 7.6], [5, 3], [7, 0], [9, -1.2], [12, 0]]);
  function body(f) {
    if (f < 437) return P.back_neutral;
    if (f < 457 - 1e-6) return raisePose(f);
    if (f <= 473 + 1e-6) {
      // the hour on his palm: solve the arm on the giving palm (15.37: 9 px down, recovered by 15.60)
      const n = f - LAND;
      const p = M.reach(RECV, 'R', [RECV_AT[0], RECV_AT[1] + (n > 0 ? dip(n) : 0)], { ...recvOpts, handAngle: recvOpts.handAngle + (n > 0 ? kf(n, [[0, 0], [2, 2.5], [6, 0]]) : 0) });
      return n > 0 ? { ...p, shy: kf(n, [[0, 0], [2, 1.8], [8, 0]]) } : p;
    }
    if (f < 482) return closePose(f);
    if (f < 660) return side(f / fps);
    if (f < 697) return castPose(f);
    return FINAL;
  }
  function pose(t) {
    const f = t * fps, p = body(f), h = head(t);
    return { ...p, head: f >= 673 && f < 682 ? { ...h, x: cast.headX(f) } : h };
  }

  // ------------------------------------------------------------------ where the coin is while he has it
  /** his right palm centre (world px) and the screen direction of the hand's long axis */
  function palm(t, p = pose(t)) {
    const h = M.hand('R', p);
    return { x: h.palm[0], y: h.palm[1], rot: h.rot, shape: h.shape };
  }
  // The coin's size in the world: 1 (r 42: the minting close-up, 105 px across on screen) → K2 (r 33: 66–70 px across
  // in the wide ACT2 framing, smaller than his head), eased with the camera's own move 16.03–16.63 so that the change
  // is never seen (on screen it only ever shrinks with the pull-back)
  const K2 = 0.78;
  const coinK = (f) => 1 - (1 - K2) * e.cubic.inOut(clamp((f - 481) / 18));
  // grips, in the hand's frame from the WRIST: [px along the hand, px across it (− = the side that is up when he holds
  // his hand out to the right)]
  const ON_PALM = inHand(RECV, C.rest_on_palm);                          // standing on the cupped palm (720, 784)
  const FIST_1 = [46, -21], FIST_2 = [40, -24];                          // in the half-closed mitten: coin r 42 / r 33
  const TIPS = [65, -14];                                                // shown: beyond the open finger tips, the thumb on its rim
  const gripU = { close: chan([[473, 0], [476.5, 0.46], [480.5, 1]]), show: chan([[660, 0], [665, 1]]) };
  /**
   * Coin centre while it is in his hand (15.37–22.43): {x, y, k} — k = the coin's size (see coinK). Drawn BEHIND the
   * hand (slot `hands`): thumb and fingers always lie in front of its rim.
   */
  function held(t) {
    const f = t * fps, h = M.hand('R', pose(t)), kk = coinK(f);
    const fist = [lerp(FIST_2[0], FIST_1[0], (kk - K2) / (1 - K2)), lerp(FIST_2[1], FIST_1[1], (kk - K2) / (1 - K2))];
    let g;
    if (f < 473) g = ON_PALM;
    else if (f < 660) { const u = gripU.close(f); g = [lerp(ON_PALM[0], fist[0], u), lerp(ON_PALM[1], fist[1], u)]; }
    else { const u = gripU.show(f); g = [lerp(fist[0], TIPS[0], u), lerp(fist[1], TIPS[1], u)]; }
    const c = Math.cos(h.rot), s = Math.sin(h.rot);
    return { x: h.wrist[0] + g[0] * c - g[1] * s, y: h.wrist[1] + g[0] * s + g[1] * c, k: kk };
  }
  return { pose, palm, held, coinK, K2, RECV, frames: { LAND } };
}
