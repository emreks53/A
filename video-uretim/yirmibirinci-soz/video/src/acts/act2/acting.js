// acting.js — the man's ACTING in act 2 (12.20–24.30) and where the coin sits in his hand.
//
// One pose per frame, a pure function of absolute time, assembled from:
//   * the ARMS. Their big moves are authored as CHANNELS of absolute angles (upper arm, forearm, hand, the two
//     foreshortenings), each a monotone cubic through frame keys, so that a move has weight: the upper arm leads, the
//     forearm follows, the hand drags and arrives last, nothing snaps —
//       14.57–15.23  the right forearm RAISES to receive the hour (give, rise with a dragging hand, 5° overshoot, settle)
//       22.00–22.50  THE DUA (client round: «seccadeye at» is figurative — he gives the hour in PRAYER, nothing is
//                    thrown): BOTH forearms rise before him and the hands open, palms up — elbows near the body, the
//                    two open hands a little outside the shoulders at chest-to-shoulder height, the gold hour standing
//                    on his open right palm. Held, alive, to the cover: he prays where he stands (no step, no sinking arm)
//     while the hour rests on his palm (15.23–15.77) the arm is solved live on the giving palm, and
//       15.77–16.07  the hand closes over the coin and draws it in: the WRIST runs a short arc (cubic in-out, 3 % settle)
//   * the shoulders under the raise (a small give, a small lift, settled) — their own channel
//   * the head: its own track — small moves that lead the eye to where the next thing happens; in the dua it is bowed
//
// The coin is HELD, never stuck on: while he has it (15.37–22.87) it lies behind his hand, placed from the wrist
// (`held`): standing on the cupped palm — sunk into the closing hand — in the half-closed mitten (the mitten in front
// of its lower-left third) — and, in the dua, standing in the open palm again (thumb and finger tips in front of its
// lower rim). From 22.57 it lifts off the palm and is given (give.js dabs it out into light).
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
  const SIDE = P.back_coin_held_at_side, SIDE_T = P.back_turned_right;
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

  // ------------------------------------------------------------------ 22.00–22.50 THE DUA (frames 660–677), held to the cover
  // Seen from behind: the upper arms stay where they hang (elbows near the body, drawn a little shorter: the elbows go
  // forward), the forearms rise steeply before him and the two open hands stand a little outside the shoulders, palms
  // up (hand shape `dua`, man.js). Not a shrug (the hands are HIGH, the forearms steep, the shoulders down) and not a
  // surrender (the palms are bowls turned to the sky, below the head; the head is bowed).
  //   RIGHT arm (the coin hand; it starts half closed at his side, forearm pointing down-out 55°):
  //     660–662.5  a small give: the wrist sinks 3 px, the shoulders 1 px
  //     662.5–670  the forearm rises 55° → 155° (≤ 17° a frame) and lengthens as it comes up before him; the hand opens
  //                in two swaps hidden in the move (half closed → cupped 664 → open 667) and turns palm-up LAST
  //     671.5      3.5° past its place, settled 675
  //   LEFT arm (from hanging; it has the longer way and arrives a frame after the right — symmetric but alive):
  //     660–662.5  give (the forearm swings back 5°)
  //     662.5–672  it comes forward and up: on the flat wall that is a forearm that SHORTENS as it swings through the
  //                horizontal (0.42 of its length at 665.5–668) and lengthens again upward, so the wrist climbs close
  //                to the body instead of flapping out like a wing; the hand turns palm-up EARLY (58° at 667) so that it
  //                is lifted like the right one; rest → cupped 665 → open 667.5
  //     672        3.5° past its place, settled 675.5–676.5
  //   the HOLD (677 → cover): a moving hold. While the hour is given the palm is still; as the light leaves it, both
  //   hands LIFT a little after it (the forearms 3°, a touch longer; the palms tilt 3° more to the sky: about 6 px, the
  //   right from 679, the left two frames behind) and stay — the gesture of offering completes; then they ease a
  //   degree to the cover. The shoulders breathe (man.js), and from 22.87 the hands breathe with them (the right palm
  //   is pinned only while the coin stands on it).
  const DUA = P.back_dua, DR = absOf(DUA.armR), DL = absOf(DUA.armL);     // man.js: right U 12 / F 150 / H 114 (palm (674, 785), the coin's
                                                                          // centre (670, 749)); left U 13 / F 147 / H 111, a little lower and more open
  const dua = {
    R: {
      U: chan([[660, S.U], [663, S.U - 0.6], [668, DR.U + 2.2], [672, DR.U - 0.3], [675, DR.U]]),
      fa: chan([[660, S.fa], [670, DR.fa]]),
      F: chan([[660, S.F], [662.5, S.F - 3], [664.5, 70], [667, 109], [669.5, 143], [671.5, DR.F + 3.5], [675, DR.F], [679, DR.F], [690, DR.F + 3], [700, DR.F + 3], [717, DR.F + 1.8]]),
      fb: chan([[660, S.fb], [664.5, 0.47], [670.5, DR.fb], [679, DR.fb], [691, DR.fb + 0.04], [717, DR.fb + 0.04]]),
      H: chan([[660, S.H], [663, S.H - 5], [666, 96], [669.5, 107], [672.5, DR.H + 2.5], [676, DR.H], [680, DR.H], [692, DR.H + 3], [701, DR.H + 3], [717, DR.H + 1.5]]),
      pin: chan([[686, 1], [700, 0]]),
    },
    L: {
      U: chan([[660, R0.U], [662.5, R0.U - 1], [667.5, DL.U + 3], [672, DL.U - 0.4], [675.5, DL.U]]),
      fa: chan([[660, R0.fa], [670.5, DL.fa]]),
      F: chan([[660, R0.F], [662.5, R0.F - 5], [664.5, 14], [666, 50], [667.5, 96], [669.5, 133], [672, DL.F + 3.5], [675.5, DL.F], [681, DL.F], [692, DL.F + 3], [701, DL.F + 3], [717, DL.F + 1.8]]),
      fb: chan([[660, R0.fb], [663.5, 0.62], [665.5, 0.42], [668, 0.42], [672, DL.fb], [681, DL.fb], [693, DL.fb + 0.04], [717, DL.fb + 0.04]]),
      H: chan([[660, R0.H], [663, R0.H - 8], [665.5, 22], [667, 58], [668.5, 84], [670.5, 101], [673, DL.H + 3], [676.5, DL.H], [682, DL.H], [694, DL.H + 3], [702, DL.H + 3], [717, DL.H + 1.5]]),
    },
    shy: chan([[660, 0], [662.5, 1.3], [668.5, -0.8], [673, 0.35], [677, 0]]),
    sh: chan([[661, SIDE_T.sh], [673, DUA.sh]]),
  };
  const handR = (f) => (f < 664 ? ['hold', -1] : f < 667 ? ['cupped', 1] : ['dua', 1]);
  const handL = (f) => (f < 665 ? ['rest', 1] : f < 667.5 ? ['cupped', 1] : ['dua', 1]);
  const duaPose = (f) => {
    const r = dua.R, l = dua.L, hr = handR(f), hl = handL(f);
    return {
      ...SIDE_T, sh: dua.sh(f), shy: dua.shy(f),
      armR: armOf(r.U(f), r.fa(f), r.F(f), r.fb(f), r.H(f), hr[0], hr[1], r.pin(f)),
      armL: armOf(l.U(f), l.fa(f), l.F(f), l.fb(f), l.H(f), hl[0], hl[1], 0),
    };
  };
  const F_DUA = 660, F_GIVE = L.fr(T.coin.give[0]), F_GONE = L.fr(T.coin.give[T.coin.give.length - 1]);   // 660, 677, 686

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
    k(663, hv(1.2, 0.5, 1)), k(676, hv(12, 1.5, 1), io),                  // the dua: he bows his head (it arrives after the hands)
    k(681, hv(12, 1.5, 1)), k(693, hv(10, 1.2, 1), io),                  // … follows the rising light a breath's width
    k(698, hv(10, 1.2, 1)), k(711, hv(13, 1.5, 1), io),                 // … and bows a little deeper when the far light has answered
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
    if (f < F_DUA) return side(f / fps);
    return duaPose(f);
  }
  function pose(t) {
    return { ...body(t * fps), head: head(t) };
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
  const gripU = { close: chan([[473, 0], [476.5, 0.46], [480.5, 1]]), open: chan([[661.5, 0], [665, 0.5], [669, 1]]) };
  // in the DUA the small coin (r 33) stands in the open palm: its centre 36 px above the palm point (the thumb's bump and
  // the finger tips in front of its lower rim), leaning 30 % with the tilted hand. The palm point is taken from the
  // wrist with the open hand's own numbers, so nothing jumps when the hand shapes swap.
  const PALM_D = [31, -2], UP_D = 36;
  const onDuaPalm = (h) => {
    const c = Math.cos(h.rot), s = Math.sin(h.rot), tilt = 0.3 * h.rot;                      // rot < 0: the hand points up-outward
    return [h.wrist[0] + PALM_D[0] * c - PALM_D[1] * s + UP_D * Math.sin(tilt), h.wrist[1] + PALM_D[0] * s + PALM_D[1] * c - UP_D * Math.cos(tilt)];
  };
  // given (22.57 → 22.87): it lifts 7 px off the palm while give.js dabs it out
  const lift = (f) => 7 * e.sine.inOut(clamp((f - F_GIVE) / (F_GONE - F_GIVE + 1)));
  /**
   * Coin centre while it is in his hand (15.37–22.87): {x, y, k} — k = the coin's size (see coinK). Drawn BEHIND the
   * hand (slot `hands`): thumb and fingers always lie in front of its rim.
   */
  function held(t) {
    const f = t * fps, h = M.hand('R', pose(t)), kk = coinK(f);
    const fist = [lerp(FIST_2[0], FIST_1[0], (kk - K2) / (1 - K2)), lerp(FIST_2[1], FIST_1[1], (kk - K2) / (1 - K2))];
    const c = Math.cos(h.rot), s = Math.sin(h.rot);
    const inFrame = (g) => [h.wrist[0] + g[0] * c - g[1] * s, h.wrist[1] + g[0] * s + g[1] * c];
    if (f < 473) { const q = inFrame(ON_PALM); return { x: q[0], y: q[1], k: kk }; }
    if (f < F_DUA) { const u = gripU.close(f), q = inFrame([lerp(ON_PALM[0], fist[0], u), lerp(ON_PALM[1], fist[1], u)]); return { x: q[0], y: q[1], k: kk }; }
    const u = gripU.open(f), a = inFrame(fist), b = onDuaPalm(h);
    return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u) - (f > F_GIVE ? lift(f) : 0), k: kk };
  }
  return { pose, palm, held, coinK, K2, RECV, frames: { LAND, DUA: F_DUA, GIVE: F_GIVE, GONE: F_GONE } };
}
