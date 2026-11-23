// acting.js — the man's ACTING in act 2 (12.20–24.30) and where the coin sits in his hand.
//
// One pose per frame, a pure function of absolute time, assembled from:
//   * the ARMS. Their big moves are authored as CHANNELS of absolute angles (upper arm, forearm, hand, the two
//     foreshortenings), each a monotone cubic through frame keys, so that a move has weight: the upper arm leads, the
//     forearm follows, the hand drags and arrives last, nothing snaps —
//       14.57–15.23  the right forearm RAISES to receive the hour (give, rise with a dragging hand, 5° overshoot, settle)
//       22.00–22.53  THE DUA (client round: «seccadeye at» is figurative — he gives the hour in PRAYER, nothing is
//                    thrown): BOTH forearms come up before him and the hands open — the COMPACT dua (pose rework: the
//                    first version read as a shrug): elbows by the ribs, the forearms short and steep, the two cupped
//                    hands close beside the chest, below the shoulder line, the gold hour standing in his right hand.
//                    Held, alive, to the cover: he prays where he stands (no step, no sinking arm)
//     while the hour rests on his palm (15.23–15.77) the arm is solved live on the giving palm, and
//       15.77–16.07  the hand closes over the coin and draws it in: the WRIST runs a short arc (cubic in-out, 3 % settle)
//   * the shoulders under the raise (a small give, a small lift, settled) — their own channel
//   * the head: its own track — small moves that lead the eye to where the next thing happens; in the dua it is bowed 13–14°
//
// The coin is HELD, never stuck on: while he has it (15.37–22.87) it lies behind his hand, placed from the wrist
// (`held`): standing on the cupped palm — sunk into the closing hand — in the half-closed mitten (the mitten in front
// of its lower-left third) — and, in the dua, standing in the cupped hand again (thumb and finger tips in front of its
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

  // ------------------------------------------------------------------ 22.00–22.53 THE DUA (frames 660–676), held to the cover
  // POSE REWORK (lead's review: with the forearms splayed 30° and the flat hands 140 px out at shoulder height the first
  // dua read as a SHRUG). Now it is the COMPACT dua, as a praying man is seen from behind: the elbows stay by the ribs,
  // the forearms point FORWARD (away from us: drawn short, 0.42–0.52 of their length, and steep), and the two CUPPED
  // hands (`pray`, man.js) stand close beside the chest — palm centres about 100 px either side of his middle and 40 px
  // BELOW the shoulder line, fingers up, the bowls open toward his bowed face. The shoulders stay down (they end 0.8 px
  // lower than they were), the head is bowed 13–14°. Nothing goes out sideways.
  //   CARRY (675 → 22.87, the hour stands in his right hand): palms at (643, 820) / (437, 822), hands at 135° / 142°
  //   HOLD  (from 23.30, the film's last held picture = POSES.back_pray): palms at (640, 814) / (437, 816), 147° / 149°
  //   RIGHT arm (the coin hand; it starts half closed at his side, the forearm pointing down-out 55°, the elbow drawn back):
  //     660–662.5  a small give: the forearm swings back 3°, the shoulders sink 1.2 px
  //     662.5–670  the forearm comes FORWARD and up: on the flat wall that is a forearm that stays short (0.36 of its
  //                length while it swings through the horizontal), so the wrist climbs straight up beside the body
  //                (884 → 838, never more than 6 px further out than where it started) while the elbow comes back under
  //                the shoulder; the hand opens in one swap hidden in the move (half closed → cupped, 665.5), turns up LAST
  //     671.5      4° past its place, settled 675
  //   LEFT arm (from hanging; the longer way — it arrives a frame after the right: symmetric but alive):
  //     660–662.5  give (the forearm swings back 5°)
  //     662.5–672.5 the forearm comes forward and up. It is authored by the WRIST: straight up along his side (x 471 →
  //                445 → 447), eased in and out — so on the flat wall the forearm shortens to 0.16 as it passes the
  //                horizontal (it points straight away from us there) and the hand never sticks out like a wing; the
  //                hand is seen end-on while it comes forward: rest → the small closed shape (666–669) → cupped
  //                (670, when it is above the elbow and already points up-outward)
  //     673        1 px past its place, settled 675.5–676.5
  //   the HOLD (677 → cover): a moving hold. While the hour is given the right palm is still (pinned); as the light
  //   leaves it both hands rise 6 px and TILT toward his face (the right 135° → 147° over 684–699, the left 142° → 149°
  //   two frames behind) — the gesture of asking completes — and stay; from 22.87 the hands breathe with his shoulders.
  const PRAY = P.back_pray, HR = absOf(PRAY.armR), HL = absOf(PRAY.armL);
  const CR = { U: HR.U, fa: 1, F: 156.2, fb: 0.48, H: 135 }, CL_U = HL.U, CL_H = 142;
  const WL0 = M.point('wristL', SIDE_T), WLH = M.point('wristL', PRAY), WLC = [WLH[0] + 2.5, WLH[1] + 4.9];   // left wrist: hanging (462.9, 952.6), hold (444.9, 836.9), carry (447.4, 841.8)
  const dua = {
    R: {
      U: chan([[660, S.U], [663, S.U - 0.6], [668, CR.U + 2], [672, CR.U - 0.3], [675, CR.U]]),
      fa: chan([[660, S.fa], [670, CR.fa]]),
      F: chan([[660, S.F], [662.5, S.F - 3], [664.5, 72], [666.5, 106], [669, 144], [671.5, CR.F + 4], [675, CR.F], [682, CR.F], [697, HR.F], [717, HR.F]]),
      fb: chan([[660, S.fb], [664.5, 0.37], [667, 0.36], [670.5, CR.fb], [682, CR.fb], [697, HR.fb], [717, HR.fb]]),
      H: chan([[660, S.H], [663, S.H - 4], [666, 109], [669.5, 124], [672.5, CR.H + 3], [676, CR.H], [684, CR.H], [699, HR.H], [717, HR.H - 1]]),
      pin: chan([[686, 1], [700, 0]]),
    },
    // the LEFT arm is authored by its WRIST (world px): it rises straight up along his side, eased in and out (peak 16.5 px
    // a frame at 667), passes the elbow 15 px outside it and ends 1 px past its place; the forearm's angle and its
    // foreshortening follow from the path (leftArm below)
    L: {
      U: chan([[660, R0.U], [662.5, R0.U - 1], [667.5, CL_U + 1], [672, CL_U - 0.4], [675.5, CL_U]]),
      wx: chan([[660, WL0[0]], [662.5, WL0[0] + 8], [664, WL0[0] + 3], [665, 459], [666, 452.5], [667, 448], [668, 446], [669, 445.2], [670, 445.6], [671, 446.6], [672.5, WLC[0] + 0.8], [675.5, WLC[0]],
        [684, WLC[0]], [699, WLH[0]], [717, WLH[0]]]),
      wy: chan([[660, WL0[1]], [662.5, WL0[1] + 0.6], [664, 946], [665, 935.5], [666, 921.6], [667, 906], [668, 889.5], [669, 873.6], [670, 859.8], [671, 849.3], [672, WLC[1] + 0.6], [673, WLC[1] - 0.8], [675.5, WLC[1]],
        [684, WLC[1]], [699, WLH[1]], [717, WLH[1]]]),
      H: chan([[660, R0.H], [663, R0.H - 6], [665, 6], [666, 24], [667, 52], [668, 84], [669, 112], [670, 128], [671, 138], [672.5, CL_H + 3], [676.5, CL_H], [686, CL_H], [701, HL.H], [717, HL.H - 1]]),
    },
    shy: chan([[660, 0], [662.5, 1.2], [668.5, 0.2], [673, 1], [678, 0.8]]),
    sh: chan([[661, SIDE_T.sh], [673, PRAY.sh]]),
  };
  const handR = (f) => (f < 665.5 ? ['hold', -1] : ['pray', 1]);
  const handL = (f) => (f < 665.5 ? ['rest', 1] : f < 669.5 ? ['closed', 1] : ['pray', 1]);
  const leftArm = (f, sh, shy) => {
    const U_ = dua.L.U(f), hl = handL(f);
    const el = M.point('elbowL', { ...SIDE_T, sh, shy, armL: { a: U_, fa: 1, b: 0, fb: 1, w: 0, hand: 'rest', flip: 1, pin: 0 } });
    const dx = el[0] - dua.L.wx(f), dy = dua.L.wy(f) - el[1];                 // the arm's side frame: x = outward (screen-left)
    return armOf(U_, 1, Math.atan2(dx, dy) / DEG, Math.hypot(dx, dy) / M.G.L2, dua.L.H(f), hl[0], hl[1], 0);
  };
  const duaPose = (f) => {
    const r = dua.R, hr = handR(f), sh = dua.sh(f), shy = dua.shy(f);
    return {
      ...SIDE_T, sh, shy,
      armR: armOf(r.U(f), r.fa(f), r.F(f), r.fb(f), r.H(f), hr[0], hr[1], r.pin(f)),
      armL: leftArm(f, sh, shy),
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
    k(663, hv(1.2, 0.5, 1)), k(676, hv(13, 1.5, 1), io),                  // the dua: he bows his head (it arrives after the hands)
    k(681, hv(13, 1.5, 1)), k(693, hv(11.5, 1.2, 1), io),                // … follows the rising light a breath's width
    k(698, hv(11.5, 1.2, 1)), k(711, hv(14, 1.5, 1), io),               // … and bows a little deeper when the far light has answered
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
  // in the DUA the small coin (r 33) stands in the cupped right hand: its centre 33 px above the palm point, leaning 18 %
  // with the tilted hand — at the carry that is 5 px toward his chest and 33 px up: centre (638, 788), the finger block
  // in front of its lower-right rim, the thumb's lobe in front of its lower-left rim, his sleeve just in front of the
  // milled edge at its left (it is held close, BEFORE him). The palm point is taken from the wrist with the cupped
  // hand's own numbers, so nothing jumps when the hand shapes swap.
  const PALM_D = [22, -4], UP_D = 33;
  const onDuaPalm = (h) => {
    const c = Math.cos(h.rot), s = Math.sin(h.rot), tilt = 0.18 * h.rot;                     // rot < 0: the hand points up-outward
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
