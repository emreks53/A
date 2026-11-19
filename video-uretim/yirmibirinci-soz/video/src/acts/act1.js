// act1.js — ACT 1 "the three days", 0.00–12.20 (owner: act-1 team).
//
// Everything the storyboard gives to act 1 that the shared world does not paint:
//   the man's acting (act1/acting.js) · the «Ey nefis!» call-ring · the veil cloud over today's sun ·
//   yesterday's sun on his palm, slipping, setting; its halo and afterglow · the 27 course dots ·
//   the ghost title-deed with its seal, crumbling into specks · the bloom of light on the rise answering «bil».
// The painted things are baked in act1/props.js. Every frame is a pure function of absolute time t.
//
// Slots (see src/shared/WORLD.md):
//   back   course dots (behind today's sun and its halo)
//   ground the bloom of warm light on the lit rise at «bil» (on the mound; behind its rosettes, the flowers, the man, the hedge)
//   sky    yesterday's halo + sun, afterglow (all behind the far ridge and the man), then the veil cloud
//   hands  call-ring, the dabs gathered under his hand, the deed (in front of his body, behind his arms)
//   front  the deed's crumble specks; the dabs of light round the six flowers at «bil»
//
// Stepped events sit on the storyboard's frames (table S below, in storyboard seconds; L.ft snaps them to
// the 30 fps grid); travel is smooth and eased. Shared states are never drawn here (W.state knows them).

import { makeActing } from './act1/acting.js';
import { makeProps } from './act1/props.js';

// storyboard times of the act-1 events (seconds as written in storyboard.json)
const S = {
  // (the veil cloud comes with the world's second coat: W.state(t).coat2, see slots.sky)
  ring: [0.43, 0.50, 0.57, 0.63], ringR: [276, 200, 131, 69], gather: 0.67, absorb: [0.70, 0.77, 0.83, 0.90],
  sun: [2.43, 2.50, 2.57], halo: 2.63, lift: 3.23, slip: 3.30, clear: 3.73,
  dotsA: [3.30, 3.37, 3.43, 3.50, 3.57],                                   // k = 9..0, two per step
  afterglow: [4.10, 4.17, 4.23], afterBreak: [4.30, 4.37, 4.43], afterEnd: 4.90,   // the last speck is gone BY 4.90
  dotsB: [4.33, 4.40, 4.47, 4.53, 4.60, 4.67, 4.73, 4.80],                 // k = 10..26, two per step, three on the last
  deed: [5.67, 5.77, 5.87, 6.00], tremble: 6.30, crumble: [6.37, 6.43, 6.50],
  veilOut: [8.77, 8.90, 9.03, 9.17],
  dotsOut: [10.73, 10.80, 10.87, 10.93, 11.00, 11.07, 11.13, 11.20],       // both legs from the feet upward
  // «bil»: the bloom swells from where he stands outward (inner + middle · + outer · peak), fades (2/3 · 1/3) and is gone: frames 346 … 356
  bloom: [11.53, 11.60, 11.67, 11.73, 11.80, 11.87],
  // dots that the YARIN framing would cut at the left frame edge leave / return while the frame is travelling
  edgeOut: 4.73, edgeIn: 8.27,
};
const TAU = Math.PI * 2;
// call-ring, per step (r 276 / 200 / 131): dab scale, the dabs that are printed, dabs moved along the ring (deg).
// Dab i sits at 11.25 + 22.5 i degrees: 0 = screen-right, 2 = lower right, 3 / 4 = below him (his legs), 5 = lower
// left, 7 / 8 = screen-left, 11 / 12 = above his head. The call thins out as it closes in: 16 dabs, then 12 (none
// below him on his legs and none close above his head - never a halo), then only three to a side (unevenly - no
// garland round his torso, nothing beside his head), and the last step is not a ring any more but ONE cluster
// where his hand is about to land (RING_CLUSTER, px round his palm on the chest).
const RING_SCALE = [1, 0.94, 0.84];
const RING_KEEP = [null, [0, 1, 2, 5, 6, 7, 8, 9, 10, 13, 14, 15], [0, 1, 15, 7, 8, 9]];
const RING_SHIFT = [{ 3: -5.5, 4: 5.5 }, { 2: -5.5, 5: 5.5 }, { 1: 3, 15: 4, 9: -6, 7: 2 }];
const RING_OFF = { 2: 19, 9: -16, 13: 15 };                    // three dabs sit clearly off the circle (px, outward +)
const RING_CLUSTER = [[1, 0, 0.98], [-25, 9, 0.74], [23, -12, 0.8], [8, 24, 0.66], [-11, -24, 0.7]];   // dx, dy, scale
// The SHEET of the deed floats 28 px to the right of and 9 px above its storyboard place (the palm under it stays
// where it is): clear sky between the sheet and his head, its lower-left corner off his shoulder line.
const DEED_SHIFT = [28, -9];
const DOT_ROW_STEP = [0, 0, 1, 1, 2, 2, 3, 4, 5, 6];           // dab-out step of the course rows m = 0..9 (m = height above the feet)
const VEIL_LEFT = [8, 6, 5, 2], VEIL_RIGHT = [8, 6, 4, 3];   // stages (of 8) of the veil halves after each dab-out step

export default {
  id: 'act1', from: 0, to: 12.2,

  async init(E, W) {
    const L = W.layout, ft = L.ft;
    this.E = E;
    this.props = makeProps(E, W);
    this.acting = makeActing(E, W);
    const T = this.T = {};
    for (const [k, v] of Object.entries(S)) T[k] = Array.isArray(v) && k !== 'ringR' ? v.map(ft) : typeof v === 'number' ? ft(v) : v;
    const rng = E.makeRng('act1/layout');

    // ---- yesterday's sun: its path is the sun-arc itself (extended below the foot), by arc length
    const Y = L.yesterday, x0 = Y.rest_centre[0], xGone = Y.gone_at[0], N = 1600;
    const xs = new Float64Array(N + 1), ss = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) {
      xs[i] = x0 + ((xGone - x0) * i) / N;
      ss[i] = i ? ss[i - 1] + Math.hypot(xs[i] - xs[i - 1], L.arc.y(xs[i]) - L.arc.y(xs[i - 1])) : 0;
    }
    const sAtX = (x) => { const u = ((x - x0) / (xGone - x0)) * N, i = Math.min(N - 1, Math.max(0, Math.floor(u))); return ss[i] + (ss[i + 1] - ss[i]) * (u - i); };
    const sClear = sAtX(Y.clear_of_hand_at[0]), sGone = ss[N];
    const v0 = (2 * sClear) / (T.clear - T.slip), v1 = 4 * L.fps;            // px/s: quad ease-in ends at v0; it sinks on to 4 px per frame
    const tDec = (2 * (sGone - sClear)) / (v0 + v1);
    this.sunPath = {
      sClear, sGone, tRest: T.clear + tDec,
      /** arc length travelled at t */
      s(t) {
        if (t <= T.slip) return 0;
        if (t <= T.clear) { const u = (t - T.slip) / (T.clear - T.slip); return sClear * u * u; }
        const tau = Math.min(t - T.clear, tDec);
        return sClear + v0 * tau - ((v0 - v1) * tau * tau) / (2 * tDec);
      },
      /** centre on the arc after s px */
      at(s) {
        let lo = 0, hi = N;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ss[m] <= s) lo = m; else hi = m; }
        const u = ss[hi] > ss[lo] ? (s - ss[lo]) / (ss[hi] - ss[lo]) : 0, x = xs[lo] + (xs[hi] - xs[lo]) * Math.min(1, Math.max(0, u));
        return [x, L.arc.y(x)];
      },
    };
    // the afterglow blooms where the disc meets the ridge in the DUN framing
    {
      const cam = L.framing('DUN_DRIFT');
      let best = [150, 1100];
      for (let s = sClear; s < sGone; s += 2) {
        const [x, y] = this.sunPath.at(s), [sx, sy] = L.toScreen(cam, x, y, 1);
        const [rx] = L.toWorld(cam, sx, 0, L.ridge.parallax);
        if (sy >= L.toScreen(cam, rx, L.crest(rx), L.ridge.parallax)[1]) { best = [x, y]; break; }
      }
      // (28 px to the right of the course: no course dot sits in the middle of its pale core like a pupil)
      this.afterAt = [best[0] + 28, best[1] - 16];
    }

    // ---- course dots: when each prints and when it leaves
    // k = 13..17 are never drawn: 14-16 lie inside today's disc, and 13 / 17 sit tangent to its rim (5 px off) —
    // hidden behind the veil cloud until 8.77, they would stand at the unveiled disc like two ears. The course
    // passes BEHIND today's sun: its last visible dots (k = 12, 18) keep a dot's spacing from the rim.
    const dots = L.arc.dots, n = dots.length;                                // 27, k = 0 at the left foot
    const behindToday = (x, y) => Math.hypot(x - L.sun.x, y - L.sun.y) < L.sun.r + 2 * L.arc.dotR + 8;
    // No stencil shape is cut by a frame edge on a hold: in YARIN (4.97-8.07) the left frame edge runs through the
    // course (k = 9 would stand half cut for three seconds, k = 8 would peek in with the drift). Those dots dab
    // out while the frame is still gliding there (4.73, one of the print steps) and are printed again as it
    // glides back (8.27) - both times at the very edge of a travelling frame, where nobody is looking.
    const atLeftEdge = (x, y) => ['YARIN', 'YARIN_DRIFT'].some((name) => {
      const cam = L.framing(name), reach = L.arc.dotR * cam.zoom + 8;
      const [sx] = L.toScreen(cam, x, y, 1);
      return sx > -reach && sx < reach;
    });
    this.dots = dots.map(([x, y], k) => {
      const on = k <= 9 ? T.dotsA[Math.floor((9 - k) / 2)] : T.dotsB[Math.min(T.dotsB.length - 1, Math.floor((k - 10) / 2))];
      // both legs leave from the feet upward at the same HEIGHT: position k on the left = position 30 - k on the right
      // ONE gesture, 10.73 -> 11.20: the rows (a row = one height) leave two per step for three steps, then one per
      // step, so that the last pair goes at 11.13 right under the halo of today's sun and the course is gone at 11.20
      const m = k <= 15 ? k : 30 - k;
      const off = T.dotsOut[DOT_ROW_STEP[Math.min(m, DOT_ROW_STEP.length - 1)]];
      // its tone is that of the third of the sky it crosses (dusk left of x 385, pre-dawn mist right of x 740)
      const zone = x < 385 ? 'dusk' : x > 740 ? 'mist' : 'day';
      // the light is on the upper right of every dot: only a small turn, never a random one
      return { x, y, k, on, off, zone, v: k % 5, rot: rng.sym(0.22), toSun: Math.hypot(x - L.sun.x, y - L.sun.y), hidden: behindToday(x, y), edge: atLeftEdge(x, y) };
    }).filter((d) => !d.hidden);
    this.nDots = n;

    // ---- call-ring: 16 dabs of light, hand-printed: three print shapes, sizes +-25 %, each a little off its place
    // on the circle and three of them clearly so (RING_OFF). The ring is a ring of light ROUND him, never a mark ON
    // him before it arrives: on its way in, a dab that would be printed on his face, his hanging hand, his hips or
    // his legs is moved along the ring to the nearest free place (RING_SHIFT, degrees) or is not printed
    // (RING_KEEP). Angles: 0 = screen-right, 90 = down.
    this.ring = Array.from({ length: 16 }, (_, i) => ({
      i, deg: (360 * (i + 0.5)) / 16, da: rng.sym(0.075), dr: (RING_OFF[i] ?? 0) + rng.sym(7), rot: rng.next() * TAU,
      sprite: this.props.callDabs[(i * 5 + (i >> 2)) % this.props.callDabs.length], sc: 1 + rng.sym(0.25),
    }));
    // the last step: five of them as one cluster on his chest, where the palm lands
    this.cluster = RING_CLUSTER.map(([dx, dy, sc], i) => ({ dx, dy, sc, rot: rng.next() * TAU, sprite: this.props.callDabs[(i * 2) % this.props.callDabs.length] }));
    this.gathered = Array.from({ length: 7 }, (_, i) => ({
      a: (TAU * i) / 7 + 0.4 + rng.sym(0.12), r: 25 + rng.sym(4), rot: rng.next() * TAU,
      sprite: this.props.callDabs[(i * 2 + 1) % this.props.callDabs.length], late: i % 2,
    }));

    // ---- the afterglow's specks: 14 sponge prints that leave the glow with its three dab-out steps (the rim
    // first, the core last - as its mask goes), drift up and a little aside, slow down, shrink and thin out print
    // by print; the last one is gone by 4.90. Fixed per speck: start (px from the glow's centre), start time, life,
    // travel, turn. Only the upper half of the glow sends them (its lower half is behind the ridge).
    {
      const r2 = E.makeRng('act1/afterglow');
      this.afterSpecks = Array.from({ length: 14 }, (_, i) => {
        const wave = i % 3, a = -Math.PI * (0.08 + 0.84 * ((i * 0.618 + 0.11) % 1)), rr = [0.84, 0.56, 0.26][wave] + r2.sym(0.1);
        return {
          x: Math.cos(a) * rr * 146, y: Math.sin(a) * rr * 112 - 4, t0: T.afterBreak[wave], life: [0.43, 0.46, 0.44][wave] + r2.sym(0.03),
          dx: r2.range(-34, 58) + Math.cos(a) * 30, rise: r2.range(165, 265), rot: r2.next() * TAU, spin: r2.sym(1.4), sc: r2.range(0.8, 1.2),
          sprite: this.props.afterglow.specks[i % this.props.afterglow.specks.length],
        };
      });
    }
  },

  release(E) {
    this.props = this.acting = this.dots = this.ring = this.cluster = this.gathered = this.afterSpecks = this.sunPath = null;
    E.forget('act1/');
  },

  pose(t) { return this.acting.pose(t); },

  /** yesterday's sun at t: null before its first pass, else { x, y, rot, stage 1..3, s } */
  sunAt(t, W) {
    const E = this.E, T = this.T, L = W.layout, stage = L.count(t, S.sun);
    if (!stage || t > this.sunPath.tRest + 1) return null;
    const s = this.sunPath.s(t), [x, y] = this.sunPath.at(s);
    // 3.23–3.30 it lifts 7 px (anticipation); the lift is spent in the first frames of the slip
    const lift = t < T.slip ? 7 * E.tween(t, T.lift, T.slip, 0, 1, E.ease.sine.inOut) : 7 * (1 - E.tween(t, T.slip, T.slip + 4 / 30, 0, 1, E.ease.sine.inOut));
    return { x, y: y - lift, rot: -0.55 * (s / L.yesterday.r), stage, s };
  },

  /** «bil»: which parts of the bloom are on at t, each with its draw options -> [[part 0..2, { p, scale } | undefined], …] */
  bloomAt(t, L) {
    const n = L.count(t, S.bloom);                      // 1 … 5 on frames 346 / 348 / 350 / 352 / 354
    const o = n === 3 ? { scale: 1.05 } : n === 4 ? { p: 2 / 3 } : n === 5 ? { p: 1 / 3 } : undefined;
    return (n === 1 ? [0, 1] : [0, 1, 2]).map((i) => [i, o]);
  },

  slots: {
    // ------------------------------------------------------------ behind today's sun: yesterday's glow, then the course dots
    back(ctx, t, W) {
      const T = this.T, L = W.layout, PR = this.props, e = 1e-6;

      // yesterday's halo and the afterglow lie UNDER the course dots (a halo print over a dot ate half of it);
      // the disc itself is drawn after the dots (slots.sky), so that they come out from behind it as it leaves
      const sun = this.sunAt(t, W);
      if (sun) {
        const haloOut = L.count(t, S.afterBreak);
        if (t >= T.halo - e && haloOut < 3) PR.sun.halo.draw(ctx, sun.x, sun.y, { scale: L.motion.haloBreath(t), p: 1 - haloOut / 3 });
      }
      if (t >= T.afterglow[0] - e && t < T.afterBreak[2] + 2 / 30 - e) {
        const [ax, ay] = this.afterAt, out = L.count(t, S.afterBreak);
        const p = out ? 1 - out / 3 : L.count(t, S.afterglow) / 3;
        if (p > 0) PR.afterglow.glow.draw(ctx, ax, ay, { p });
      }

      // A dot that the rim of yesterday's disc runs through is not drawn (a half dot standing out of the disc read as
      // a stalk on an orange): ahead of the sun it goes a frame before the disc covers it, behind the sun it is there,
      // whole, as soon as the disc has cleared it.
      const DOTS = PR.dots, rimLo = L.yesterday.r - DOTS.r - 2, rimHi = L.yesterday.r + DOTS.r + 3;
      // The tone of each third: the dusk passes (4.13 / 4.27) and the mist land on the dots as on the sky behind them.
      const st = W.state(t);
      const tones = { day: DOTS.day, dusk: st.dusk.dusk2 ? DOTS.dusk2 : st.dusk.dusk1 ? DOTS.dusk1 : DOTS.day, mist: st.mist.build ? DOTS.mist : DOTS.day };
      // Today's blaze outshines the course next to it: a dot that a halo pass (r 190 / 250 / 300) lands on goes with
      // that pass - no half-covered dot is left standing in the halo, and the dab-out of the course (10.73-11.20) ends,
      // seen, at the rim of the light.
      const outshone = st.sun.haloR ? st.sun.haloR + DOTS.r + 4 : 0;
      for (const d of this.dots) {
        if (t < d.on - e || t >= d.off + 2 / 30 - e) continue;
        if (d.toSun < outshone) continue;
        if (sun && t < this.sunPath.tRest + 0.1) { const q = Math.hypot(d.x - sun.x, d.y - sun.y); if (q > rimLo && q < rimHi) continue; }
        const sprite = tones[d.zone][d.v];
        if (d.edge && t >= T.edgeOut - e && t < T.edgeIn - e) {
          if (t < T.edgeOut + 2 / 30 - e) sprite.draw(ctx, d.x, d.y, { p: 0.5, rot: d.rot });   // half out for one step, then gone
          continue;
        }
        if (d.edge && t >= T.edgeIn - e && t < T.edgeIn + 1 / 30 - e) { sprite.draw(ctx, d.x, d.y, { rot: d.rot, scale: 1.2 }); continue; }   // printed again
        if (t >= d.off - e) { sprite.draw(ctx, d.x, d.y, { p: 0.5, rot: d.rot }); continue; }   // half dabbed out for one step, then gone
        const first = t < d.on + 1 / 30 - e;                                                      // the press: one frame a little larger
        sprite.draw(ctx, d.x, d.y, first ? { rot: d.rot, scale: 1.2 } : { rot: d.rot });
      }
    },

    // ------------------------------------------------------------ on the rise: its light answers «bil» once
    ground(ctx, t, W) {
      const T = this.T, L = W.layout, B = this.props.bloom, e = 1e-6;
      if (t < T.bloom[0] - e || t >= T.bloom[5] - e) return;
      // ONE swell, on twos, with his nod (11.53: the head goes down, the light comes up): the light round the four
      // flowers next to him and along the crown between them (frame 346), then the outer pair with it - the whole rise
      // from shoulder to shoulder (348) -, then all of it pressed 5 % larger (350: the peak); it dabs out in two steps
      // (352: 2/3, 354: 1/3) while he straightens and is gone on frame 356 (11.87). The world bobs the flowers from the
      // inside outward on the same frames (W.state(t).flowers[i].bob).
      const [ax, ay] = B.at;
      for (const [i, o] of this.bloomAt(t, L)) B.ground[i].draw(ctx, ax, ay, o);
    },

    // ------------------------------------------------------------ sky stage
    sky(ctx, t, W) {
      const E = this.E, T = this.T, L = W.layout, PR = this.props, e = 1e-6;

      // yesterday's sun (behind the ridge, the man's hand and the hedge; its halo is in slots.back)
      const sun = this.sunAt(t, W);
      if (sun) PR.sun.stages[sun.stage - 1].draw(ctx, sun.x, sun.y, sun.rot ? { rot: sun.rot } : undefined);
      // the afterglow BREAKS (4.30 / 4.37 / 4.43): each of its dab-out steps sends sponge prints of its own light up
      // into the dusk; they drift (fast at first, then slowing), shrink and thin out in three stages; gone by 4.90
      if (t >= T.afterBreak[0] - e && t < T.afterEnd - e) {
        const [ax, ay] = this.afterAt;
        for (const q of this.afterSpecks) {
          const u = (t - q.t0) / q.life;
          if (u < -e || u >= 1) continue;
          const v = E.ease.cubic.out(Math.max(0, u)) * 0.72 + 0.28 * Math.max(0, u);        // drifts on to the end, never stalls
          const stage = u < 0.42 ? 3 : u < 0.74 ? 2 : 1;
          q.sprite.draw(ctx, ax + q.x + q.dx * v, ay + q.y - q.rise * v, { p: stage / 3, rot: q.rot + q.spin * u, scale: q.sc * (1 - 0.42 * Math.max(0, u)) });
        }
      }

      // the veil cloud over (540, 335): one stepped pass WITH THE WORLD'S SECOND COAT (W.state(t).coat2 - the opening
      // passes are the world's: wherever its timeline puts that coat, the cloud is part of it); parts and dabs out
      // 8.77 / 8.90 / 9.03 / 9.17
      if (W.state(t).coat2) {
        const out = L.count(t, S.veilOut);
        if (out < S.veilOut.length) {
          const V = L.veil, PV = PR.veil;
          const open = E.tween(t, T.veilOut[0], T.veilOut[3], 0, 1, E.ease.cubic.inOut);
          const cx = V.centre[0] + 3 * Math.sin((TAU * t) / 11.3 + 0.6), cy = V.centre[1] + 1.5 * Math.sin((TAU * t) / 7.7 + 2);
          const dx = 35 * open;
          // eighths of each half that are still on after 0..3 steps: the halves do not leave alike (no mirror image)
          PV.L.draw(ctx, cx - dx, cy, { p: VEIL_LEFT[out] / 8 });
          PV.R.draw(ctx, cx + dx, cy, { p: VEIL_RIGHT[out] / 8 });
          if (!out) {
            // rim glimmer: each set shows 1, 2, 3, 2 thirds of its prints, a stage every 10 frames, the two out of step
            PV.glimmer.forEach((g, i) => {
              const k = Math.floor(t * 3 + i * 1.5 + 1e-6) % 4;
              g.draw(ctx, cx, cy, { p: [1, 2, 3, 2][k] / 3 });
            });
          }
        }
      }
    },

    // ------------------------------------------------------------ between his body and his arms
    hands(ctx, t, W) {
      const T = this.T, L = W.layout, PR = this.props, e = 1e-6;

      // «Ey nefis!»: the ring of dabs closes in on him (r 276 / 200 / 131), thinning out; its last dabs are ONE cluster
      // on his chest (0.63) that his hand lands on (0.67); gathered under the hand, absorbed by 0.90
      if (t >= T.ring[0] - e && t < T.absorb[3] - e) {
        const [cx, cy] = L.man.chest;
        const step = L.count(t, S.ring) - 1;
        if (step < 3) {
          const R = S.ringR[step], sc = RING_SCALE[step], keep = RING_KEEP[step], shift = RING_SHIFT[step];
          for (const d of this.ring) {
            if (keep && !keep.includes(d.i)) continue;
            const a = ((d.deg + (shift[d.i] ?? 0)) * Math.PI) / 180 + d.da, r = R + d.dr * sc;
            d.sprite.draw(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, { rot: d.rot, scale: sc * d.sc });
          }
        } else if (t < T.gather - e) {
          const [px, py] = this.acting.points.chest;
          for (const d of this.cluster) d.sprite.draw(ctx, px + d.dx, py + d.dy, { rot: d.rot, scale: d.sc });
        } else {
          const [px, py] = this.acting.palm('R', t);
          const n = L.count(t, S.absorb);                                                // 0 at 0.67 … 4 at 0.90
          for (const d of this.gathered) {
            const stage = Math.max(0, n - d.late), p = 1 - stage / 3;
            if (p <= 0) continue;
            const r = d.r * (1 - 0.14 * n);
            d.sprite.draw(ctx, px + Math.cos(d.a) * r, py + Math.sin(d.a) * r, { rot: d.rot, scale: 0.7, p });
          }
        }
      }

      // the deed: three passes and the seal above his open palm; trembles; crumbles in three steps
      if (t >= T.deed[0] - e && t < T.crumble[2] - e) {
        const D = PR.deed, [px, py] = this.acting.palm('R', t);
        const off = [L.deed.centre[0] - L.deed.right_palm[0] + DEED_SHIFT[0], L.deed.centre[1] - L.deed.right_palm[1] + DEED_SHIFT[1]];
        const n = L.count(t, S.deed), tau = t - T.deed[0];
        const trem = t >= T.tremble - e && t < T.crumble[0] - e ? (Math.round((t - T.tremble) * 30) % 2 ? -2 : 2) : 0;
        ctx.save();
        ctx.translate(px + off[0] + trem, py + off[1] + 2.5 * Math.sin((TAU * tau) / 2.3));
        ctx.rotate(-0.07 + 0.012 * Math.sin((TAU * tau) / 3.1 + 1));
        const out = L.count(t, S.crumble);
        if (out) D.whole.draw(ctx, 0, 0, { p: 1 - out / 3 });
        else {
          // the seal is stamped on in one press: a 2-frame squash
          const k = Math.round((t - T.deed[3]) * 30);
          D.drawParts(ctx, n, n >= 4 && k < 2 ? { scale: k === 0 ? 1.26 : 0.93 } : null);
        }
        ctx.restore();
      }
    },

    // ------------------------------------------------------------ in front of everything painted
    front(ctx, t, W) {
      const T = this.T, L = W.layout, PR = this.props;
      // «bil»: the dabs of light round the flowers, in step with the bloom on the rise (slots.ground)
      if (t >= T.bloom[0] - 1e-6 && t < T.bloom[5] - 1e-6) {
        const B = PR.bloom;
        for (const [i, o] of this.bloomAt(t, L)) B.front[i].draw(ctx, B.at[0], B.at[1], o);
      }
      // the deed's specks drift toward the dashed ring and are gone by 6.90
      if (t >= T.crumble[0] - 1e-6 && t < T.crumble[0] + 0.6) {
        const [px, py] = L.deed.right_palm;
        ctx.save();
        ctx.translate(px + L.deed.centre[0] - L.deed.right_palm[0] + DEED_SHIFT[0], py + L.deed.centre[1] - L.deed.right_palm[1] + DEED_SHIFT[1]);
        ctx.rotate(-0.07);
        PR.deed.burst.draw(ctx, 0, 0, t - T.crumble[0]);
        ctx.restore();
      }
    },
  },
};
