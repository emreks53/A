// acting.js — the man's ACTING in act 2 (12.20–23.80) and the places of his right palm for the coin.
//
// Three layers, assembled into one pose per frame (all pure functions of absolute time):
//   * arms + stance: W.man.track over full poses (overlap rule: upper arm, forearm + 2 f, hand + 2 f); the one
//     swing 22.20–22.57 is quicker than that rule and has its own plain track; while the hour rests on his
//     palm (15.07–15.77) the arm is solved live so that the palm really gives under its weight
//   * head: its own track — small moves that lead the eye to where the next thing happens
//   * small reactions (shoulders give on the catch)
//
// Frames in comments are film frames (30 fps); storyboard times are in util.js (TL).

export function makeActing(E, W, U) {
  const M = W.man, P = M.POSES, L = W.layout, fps = L.fps, e = E.ease;
  const { TL: T, ft, on, nf, kf } = U;
  const C = L.coin;
  const k = (frame, v, ease) => ({ t: frame / fps, v, ease });
  const DEG = Math.PI / 180;

  // ------------------------------------------------------------------ poses
  const COIN_OUT = 18;                                   // px: how far the shown coin sits from the palm centre, toward the finger tips
  // hand axis on screen for his right arm in back view: (sin a, cos a) for a hand angle a (90 = outward, > 90 = upward)
  const palmFor = (coin, deg) => { const d = [Math.sin(deg * DEG), Math.cos(deg * DEG)]; return [coin[0] - COIN_OUT * d[0], coin[1] - COIN_OUT * d[1]]; };
  const RECV_AT = C.right_palm_receive;                  // (720, 830)
  const recvOpts = { hand: 'cupped', handAngle: 94 };
  const RECV = M.reach(P.back_neutral, 'R', RECV_AT, recvOpts);
  const ANTIC = M.mix(P.back_neutral, RECV, -0.05);      // a breath of counter-move before the forearm rises
  const SIDE = P.back_coin_held_at_side, SIDE_T = P.back_turned_right;
  const SHOWN = M.reach(P.back_coin_shown, 'R', palmFor(C.shown_open_hand, 112), { hand: 'open', handAngle: 112, flip: -1, elbow: -10 });
  const WIND = M.reach(P.back_wind_up, 'R', palmFor(C.wind_up, 84), { hand: 'open', handAngle: 84, flip: -1, elbow: -13 });
  const REL = M.reach(P.back_release, 'R', palmFor(C.release, 110), { hand: 'open', handAngle: 110, flip: -1 });
  const FOLLOW = P.back_follow_through, FINAL = P.back_final_stand;
  // the left arm answers the swing a little (counter-swing), so the cast goes through the whole figure
  const armL = (pose, da) => ({ ...pose, armL: { ...pose.armL, a: pose.armL.a + da } });

  // ------------------------------------------------------------------ arms + stance
  const main = M.track([
    k(366, P.back_neutral), k(438, P.back_neutral),
    k(441, ANTIC, e.sine.inOut),                                         // 14.60 a small give …
    k(448, RECV, e.back.out),                                            // 14.67 → palm up at chest height (720, 830), settled 15.07
    k(473, RECV), k(477, SIDE, e.cubic.inOut),                           // 15.77–16.03 closes over the coin, draws it in to his side
    k(482, SIDE), k(492, SIDE_T, e.sine.inOut),                          // 16.07–16.40 turns toward the right column
    k(660, SIDE_T), k(661, SHOWN),                                       // 22.00–22.17 the hand opens where it is
  ], { overlap: 2 });
  const cast = M.track([
    k(666, SHOWN), k(669, armL(WIND, -2.5), e.sine.inOut),               // 22.20–22.30 dips back to (655, 900), body dips 4 px
    k(673, armL(REL, 3.5), e.quad.in),                                   // 22.43 RELEASE at (720, 820) with the half-step
    k(677, armL(FOLLOW, 2), e.cubic.out),                                // 22.57 follows through, hand open, to (755, 800)
    k(689, armL(FOLLOW, 1)), k(702, FINAL, e.sine.inOut),                // 22.97–23.40 the arm sinks slowly; the hand-off pose
  ]);
  const SWING = 666 / fps - 1e-6;

  // ------------------------------------------------------------------ head: {pitch, tilt, turn}
  const hv = (pitch, tilt, turn) => ({ pitch, tilt, turn, x: 0, y: 0 });
  const io = e.sine.inOut;
  const head = E.track([
    k(366, hv(0, 0, 0)), k(369, hv(0, 0, 0)),
    k(375, hv(-5, 0, 0), io),                                            // 12.30–12.50 looks up at the dial
    k(419, hv(-5, 0, 0)), k(426, hv(-4, 2, 0.28), io),                   // 13.97 a glance to the hour that has come out of the ring
    k(434, hv(-4, 2, 0.28)), k(460, hv(3, 4, 0.6), io),                  // … and follows it down into his palm
    k(461, hv(3, 4, 0.6)), k(463, hv(5.5, 4, 0.6), e.quad.out), k(469, hv(3, 4, 0.6), io),   // the catch: a small nod
    k(473, hv(3, 4, 0.6)), k(481, hv(1.5, 2, 0.5), io),                  // draws it in
    k(482, hv(1.5, 2, 0.5)), k(492, hv(0, 0, 1), io),                    // 16.07–16.40 turns his head to screen-right
    k(513, hv(0, 0, 1)), k(524, hv(-4, 0, 1), io),                       // 17.10–17.47 lifts it to the light
    k(534, hv(-4, 0, 1)), k(549, hv(-1, 0.5, 1), io),                    // 17.80–18.30 follows the light-beads down to the plateau
    k(614, hv(-1, 0.5, 1)), k(627, hv(-3.6, 0, 1), io),                  // 20.47–20.90 lifts a little toward the mescid
    k(644, hv(-3.6, 0, 1)), k(658, hv(1.2, 0.5, 1), io),                 // 21.47–21.93 down with the unrolling rug
    k(666, hv(1.2, 0.5, 1)), k(669, hv(2.6, -1, 1), io),                 // the swing: dips with the wind-up …
    k(673, hv(0.2, 1, 1), e.quad.in), k(678, hv(-1.2, 1.5, 1), e.cubic.out),   // … and goes with the cast
    k(690, hv(-1.2, 1.5, 1)), k(702, hv(0, 0, 1), io),                   // stays turned toward the mosque
  ]);

  // ------------------------------------------------------------------ the pose
  const LAND = L.fr(T.gold.land);                                        // 461
  /** palm give under the hour (px), by frames since it lands */
  const dip = (n) => kf(n, [[0, 0], [1, 6.5], [2, 9], [3, 7.6], [5, 3], [7, 0], [9, -1.2], [12, 0]]);
  function pose(t) {
    let p = t < SWING ? main(t) : cast(t);
    const f = t * fps;
    if (f >= 452 - 1e-6 && f <= 473 + 1e-6) {
      // the hour on his palm: solve the arm on the giving palm (15.37: 9 px down, recovered by 15.60)
      const n = f - LAND;
      p = M.reach(p, 'R', [RECV_AT[0], RECV_AT[1] + (n > 0 ? dip(n) : 0)], { ...recvOpts, handAngle: recvOpts.handAngle + (n > 0 ? kf(n, [[0, 0], [2, 2.5], [6, 0]]) : 0) });
      if (n > 0) p = { ...p, shy: kf(n, [[0, 0], [2, 1.8], [8, 0]]) };
    }
    return { ...p, head: head(t) };
  }

  // ------------------------------------------------------------------ where the coin is while he has it
  /** his right palm centre (world px) and the screen direction of the hand's long axis */
  function palm(t, p = pose(t)) {
    const h = M.hand('R', p);
    return { x: h.palm[0], y: h.palm[1], rot: h.rot, shape: h.shape };
  }
  const REST_UP = C.right_palm_receive[1] - C.rest_on_palm[1];           // 46: the coin stands on the palm
  /**
   * Coin centre while it is in his hand (15.37–22.43): {x, y, open} — on the palm, then drawn in to his side
   * (in the half-closed mitten), then shown in the open hand (toward the finger tips).
   */
  function held(t) {
    const p = pose(t), h = palm(t, p), f = t * fps;
    if (f < 473) return { x: h.x, y: h.y - REST_UP, open: false };
    if (f < 660 - 1e-6) { const u = e.cubic.inOut(E.clamp((f - 473) / 8)); return { x: h.x, y: h.y - REST_UP * (1 - u), open: false }; }
    const u = e.sine.inOut(E.clamp((f - 660) / 5));
    return { x: h.x + Math.cos(h.rot) * COIN_OUT * u, y: h.y + Math.sin(h.rot) * COIN_OUT * u, open: h.shape === 'open' };
  }
  return { pose, palm, held, RECV, frames: { LAND } };
}
