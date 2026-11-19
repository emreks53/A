// acting.js — the man's ACTING for act 1 (0.00–12.20). Owner: act-1 team.
//
//   const acting = makeActing(E, W);   acting.pose(t) -> pose for W.man.draw   (pure function of absolute t)
//
// Four independent channels, each a W.man.track of full poses (so only man.mix ever blends):
//   head  — pitch / tilt / turn: it LEADS (the eye goes where his head goes)
//   body  — root, lean, shoulder shift / sink: weight
//   armR  — his own RIGHT arm (screen-left in the front view, screen-right in the back view): the call, the deed, the reach
//   armL  — his own LEFT arm (screen-left in the back view): yesterday's sun
// The arms overlap as the storyboard asks (upper arm on the key, forearm and hand later); the lag is a
// continuous function of time (frames), so quick moves (the recoil, the grasp) can run without it and
// nothing ever pops. Keys are written in FRAMES of the 30 fps film; storyboard times in the comments.
//
// Contact points (palm under yesterday's sun, palm under the deed, the hand that stops short of the
// ring) are solved by man.reach against the body values that hold at that moment, and the palms are
// pinned, so they do not breathe.

export function makeActing(E, W) {
  const M = W.man, P = M.POSES, L = W.layout, e = E.ease, FPS = L.fps;
  const REST = M.REST_ARM;
  /**
   * Arrival with overshoot and settle, soft at both ends (a limb never leaves or lands at full speed):
   * it travels to 1 + o in the first `tau` of the time, then settles back to 1. o 0.07 = the storyboard's 6–10 %.
   */
  const sm = (u) => u * u * (3 - 2 * u);
  const arrive = (o = 0.07, tau = 0.72) => (u) => (u < tau ? (1 + o) * sm(u / tau) : 1 + o * (1 - sm((u - tau) / (1 - tau))));
  const k = (f, v, ease) => ({ t: f / FPS, v, ease });

  // ---------------------------------------------------------------- body (weight) and head
  const B = (o = {}) => M.pose({ view: 1, armL: REST, armR: REST, ...o });
  const body = M.track([
    k(0, B()),
    // 0.67 the hand lands: the torso settles 2 % (0.70–0.90)
    k(20, B()), k(23, B({ shy: 3 }), e.cubic.out), k(28, B(), e.sine.inOut),
    // 1.30–1.47 his weight shifts toward the glow at screen-left; he turns with it and comes back to rest
    k(38, B()), k(44, B({ root: { x: -4, y: 0 }, lean: -0.8 }), e.sine.inOut),
    k(49, B({ root: { x: -4, y: 0 }, lean: -0.8 })), k(58, B({ sh: -3 }), e.sine.inOut),   // the shoulder line goes with the arm that sweeps out
    // 3.43–3.57 he reaches after the slipping sun (shoulders 2 px further, a hint of lean)
    k(102, B({ sh: -3 })), k(107, B({ sh: -5, lean: -0.9 }), e.cubic.out),
    k(118, B({ sh: -5, lean: -0.9 })), k(136, B(), e.sine.inOut),                        // the arm falls, he stands square again
    // 6.83–7.07 full stretch toward the ring: shoulders shift 4 px, no body lean
    k(204, B()), k(209, B({ sh: 4 }), e.cubic.out),
    k(212, B({ sh: 4 })), k(214, B({ sh: 3 }), e.cubic.out), k(216, B({ sh: 3 })), k(220, B({ sh: 2 }), e.sine.inOut),
    k(222, B({ sh: 2 })), k(238, B(), e.sine.inOut),
    // 10.70–11.00 he lowers his gaze to the ground he stands on: the shoulders ease down with the head
    k(321, B()), k(330, B({ shy: 2 }), e.sine.inOut),
    // 11.53 «bil» - the ONE hit of the line (last fix round: phone-size). The shoulders go with the nod: 5 px further
    // down in 4 frames (ease-out: most of it in the first two), held 2 frames, back up over 6 (a breath of overshoot);
    // level again on frame 358 (11.93)
    k(346, B({ shy: 2 })), k(350, B({ shy: 7 }), e.cubic.out), k(352, B({ shy: 7 })), k(358, B(), arrive(0.05, 0.8)),
  ]);

  const H = (pitch = 0, tilt = 0, turn = 0, x = 0, y = 0) => M.pose({ view: 1, armL: REST, armR: REST, head: { pitch, tilt, turn, x, y } });
  const head = M.track([
    k(0, H(6)),                                                                            // front view, head bowed
    // 0.43–0.63 the call reaches him: the head lifts 6 degrees (ease-out), a breath of overshoot, level
    k(13, H(6)), k(19, H(-1), e.cubic.out), k(24, H(0), e.sine.inOut),
    // 1.27 the first glow at the left: his head goes to it before his body does
    k(37, H(0)), k(42, H(0, -4, 0, -2), e.sine.inOut),
    k(44, H(0, -4, 0, -2)), k(49, H(0, -3, -0.7, -1), e.sine.inOut),                       // back view: looking toward the glow (screen-left)
    k(51, H(0, -3, -0.7, -1)), k(57, H(-1, -4, -1), e.sine.inOut),                         // 1.73 his look goes out with the arm
    // 2.43–2.57 the sun prints on his palm: he looks up at it
    k(71, H(-1, -4, -1)), k(77, H(-3, -6, -1), e.sine.inOut),
    // 3.30 it slips: the head follows it down (a look, not a bow)
    k(98, H(-3, -6, -1)), k(104, H(1, -7, -1, -1), e.cubic.out), k(118, H(3, -5, -1, -1), e.sine.out),
    // 4.50–4.90 he follows the course dots over to the right (a sliver of cheek shows)
    k(134, H(3, -5, -1, -1)), k(148, H(0, 0, 1), e.sine.inOut),
    // 5.37–5.63 the head tilts toward the palm that opens; the deed stands at head height
    k(160, H(0, 0, 1)), k(167, H(4, 5, 0.85), e.sine.inOut),
    k(170, H(4, 5, 0.85)), k(177, H(1, 3, 0.9), e.sine.inOut),
    // 6.37 it crumbles: a start (2 frames); 6.57–6.80 he looks down at the empty palm
    k(190, H(1, 3, 0.9)), k(193, H(-1, 2, 0.95), e.cubic.out),
    k(196, H(-1, 2, 0.95)), k(204, H(8, 8, 0.95), e.sine.inOut),
    // 6.83 the look goes to the ring before the hand does
    k(205, H(8, 8, 0.95)), k(209, H(0, 3, 1), e.cubic.out),
    k(212, H(0, 3, 1)), k(214, H(-1, 2, 1, -1.5), e.cubic.out),                            // 7.07 the recoil: the head pulls back a touch
    k(220, H(0, 2, 1)), k(224, H(0, 2, 1)),
    k(240, H(0, 0, 0), e.sine.inOut),                                                      // 7.40–7.97 the head returns level
    // 9.27–9.50 he lifts his head a little to today's sun (5 degrees) — arms stay down
    k(278, H(0, 0, 0)), k(285, H(-5), e.sine.inOut),
    // 10.70–11.00 he lowers his gaze to the lit ground he stands on (12 degrees, the head 3 px down with it: his hair
    // top comes down 9 px from where it was while he looked up at the sun)
    k(321, H(-5)), k(330, H(12, 0, 0, 0, 3), e.sine.inOut),
    // 11.53 «bil»: a firm NOD, phone-size (last fix round) - the bowed head tips clearly forward (22 degrees: the crown
    // drops, the hair mass is seen shorter, the head sinks 4 px more between the shoulders, which go down with it): the
    // hair top travels 15 px in 4 frames with ease-out (9 px on the first frame, lowest from frame 349 - the word starts
    // at 11.61), is held 2 frames, and comes up level over 6 frames (a breath of overshoot); level on frame 358 (11.93)
    k(346, H(12, 0, 0, 0, 3)), k(350, H(22, 0, 0, 0, 7), e.cubic.out), k(352, H(22, 0, 0, 0, 7)), k(358, H(0), arrive(0.05, 0.8)),
  ]);

  // ---------------------------------------------------------------- arms
  /** Pose with one arm solved so that its palm centre is on `target`, for the body values `o` of that moment. */
  const reach = (which, target, opts, o = {}) => M.reach(B(o), which, target, opts);
  const armOnly = (which, arm, o = {}) => B({ ...o, ['arm' + which]: arm });
  const swing = (da, db = 0) => ({ ...REST, a: REST.a + da, b: REST.b + db });

  /** One arm channel: keys of full poses + a continuous lag (frames) of forearm and hand behind the upper arm. */
  const channel = (which, keys, lagKeys) => {
    const at = M.track(keys);
    const lag = E.track(lagKeys.map(([f, a, b]) => ({ t: f / FPS, v: [a, b], ease: e.linear })));
    const key = 'arm' + which;
    return (t) => {
      const [l1, l2] = lag(t);
      const p0 = at(t)[key];
      const p1 = l1 > 1e-6 ? at(t - l1 / FPS)[key] : p0, p2 = l2 > 1e-6 ? at(t - l2 / FPS)[key] : p0;
      return { ...p0, b: p1.b, fb: p1.fb, w: p2.w, hand: p2.hand, flip: p2.flip };
    };
  };

  // his RIGHT arm
  const chest = P.front_hand_on_chest.armR;                                               // palm on (544, 806), front view
  const palmUp = reach('R', L.deed.right_palm, { hand: 'cupped', handAngle: 95 });        // (688, 818)
  const palmLook = reach('R', L.deed.right_palm, { hand: 'cupped', handAngle: 104 });     // fingers curl a little
  const palmBack = reach('R', [L.deed.right_palm[0] - 7, L.deed.right_palm[1] + 5], { hand: 'cupped', handAngle: 100 });   // drawn in before the stretch
  const stop = reach('R', [784, 896], { hand: 'open', flip: -1, wrist: 0 }, { sh: 4 });   // STOPS a clear 150 px short of the ring
  const recoil = reach('R', [776, 890], { hand: 'open', flip: -1, wrist: -6 }, { sh: 3 });
  const closedR = reach('R', [776, 891], { hand: 'closed', flip: -1, wrist: -8 }, { sh: 2 });
  const armR = channel('R', [
    k(0, B()),
    // 0.43–0.67 the hand goes to his chest in 7 frames and lands flat (slight overshoot)
    k(13, B()), k(20, armOnly('R', chest), arrive(0.03, 0.8)),
    // 1.30–1.47 it leaves the chest and falls back to his side
    k(35, armOnly('R', chest)), k(41, B(), e.sine.inOut),   // at rest before the turn begins on frame 43 (film review)
    // 5.37–5.63 the forearm rises, turning palm up: a 2-frame dip first, 7 % overshoot, settled 5.63
    k(157, B()), k(160, armOnly('R', swing(-3, -6)), e.sine.inOut), k(168, palmUp, arrive(0.06, 0.78)),
    // 6.57–6.80 the fingers curl over the empty palm
    k(197, palmUp), k(203, palmLook, e.sine.inOut),
    // 6.83–7.07 he stretches toward the ring (the elbow draws in first) and STOPS at (784, 896)
    k(205, palmBack, e.sine.inOut), k(209, stop, e.sine.inOut),
    k(212, stop), k(214, recoil, e.cubic.out),                                            // 7.07–7.13 recoils 10 px
    k(216, recoil), k(220, closedR, e.sine.inOut),                                        // 7.20–7.33 the hand closes on nothing
    k(222, closedR), k(235, B(), arrive(0.03, 0.8)),                                              // 7.40–7.97 the arm sinks to his side
  ], [
    [0, 0.5, 1], [60, 0.5, 1], [150, 1, 2],
    [175, 1, 2], [180, 0, 0],                                                           // (hold) the curl and the draw-back move as one
    [205, 0, 0], [209, 1.5, 3],                                                           // the stretch overlaps: upper arm, forearm, hand
    [212, 1.5, 3], [212.01, 0, 0], [222, 0, 0], [226, 2, 4],                                // the recoil and the grasp are one flinch; the sink overlaps again
  ]);

  // his LEFT arm
  const sunPalm = L.yesterday.left_palm;                                                  // (270, 772)
  const out = reach('L', sunPalm, { hand: 'cupped', handAngle: 95 }, { sh: -3 });
  // The course of the days runs right past this hand (dots k = 6 at (234, 815) and k = 7 at (255, 753)): the hand
  // that follows the sun down 25 px also draws 22 px in, so that its finger tips stay clear of the dot by a
  // dot's width (a dot half under the mitten read as a crumb in his fingers).
  const after = reach('L', [sunPalm[0] + 22, sunPalm[1] + 25], { hand: 'open', handAngle: 50, flip: 1 }, { sh: -5, lean: -0.9 });
  const closedL = reach('L', [sunPalm[0] + 25, sunPalm[1] + 28], { hand: 'closed', handAngle: 56, flip: 1 }, { sh: -5, lean: -0.9 });
  const armL = channel('L', [
    k(0, B()),
    // 1.73–2.03 the arm sweeps out, palm up and cupped: a 2-frame counter-swing, overshoot, settled 2.10
    k(49, B()), k(52, armOnly('L', swing(-5, 7)), e.sine.inOut), k(60, out, arrive(0.07, 0.74)),
    // 3.43–3.57 the hand follows the slipping sun down 28 px, opening after it, and stops
    k(103, out), k(108, after, arrive(0.1, 0.66)),
    // 3.83–4.03 it closes on nothing
    k(115, after), k(120, closedL, e.sine.inOut),
    // 4.10–4.57 the arm lowers with overlap and swings out once past the leg
    k(123, closedL), k(133, B(), arrive(0.03, 0.8)),
  ], [
    [0, 2, 4], [102, 2, 4], [103, 0.5, 1], [121, 0.5, 1], [125, 2, 4], [400, 2, 4],
  ]);

  // ---------------------------------------------------------------- the pose
  const turn = L.T.man.turn;                             // 1.47 / 1.53 / 1.60: the cross-dab on twos (man.js does the look)
  const tEnd = 358 / FPS;                                // from 11.93 he is exactly back_neutral: the hand-off pose (was 11.87; the nod's way up is 6 frames now)
  function pose(t) {
    if (t >= tEnd - 1e-9) return P.back_neutral;
    const step = L.count(t, turn);
    const view = step === 0 ? 0 : step < turn.length ? step / turn.length : 1;
    const b = body(t);
    return { ...b, view, head: head(t).head, armL: armL(t), armR: armR(t) };
  }

  return {
    pose,
    /** palm centre of 'L' | 'R' at t (world px, un-breathed: reach-solved palms are pinned) */
    palm: (which, t) => M.point('palm' + which, pose(t)),
    points: { chest: [544, 806], sunPalm, deedPalm: L.deed.right_palm, stop: [784, 896] },
  };
}
