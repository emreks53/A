// act1.js — ACT 1 "the three days", 0.00–12.20 (owner: act-1 team).
//
// Everything the storyboard gives to act 1 that the shared world does not paint:
//   the man's acting (act1/acting.js) · the «Ey nefis!» call-ring · the veil cloud over today's sun ·
//   yesterday's sun on his palm, slipping, setting; its halo and afterglow · the 27 course dots ·
//   the ghost title-deed with its seal, crumbling into specks.
// The painted things are baked in act1/props.js. Every frame is a pure function of absolute time t.
//
// Slots (see src/shared/WORLD.md):
//   back   course dots (behind today's sun and its halo)
//   sky    yesterday's halo + sun, afterglow (all behind the far ridge and the man), then the veil cloud
//   hands  call-ring, the dabs gathered under his hand, the deed (in front of his body, behind his arms)
//   front  the deed's crumble specks
//
// Stepped events sit on the storyboard's frames (table S below, in storyboard seconds; L.ft snaps them to
// the 30 fps grid); travel is smooth and eased. Shared states are never drawn here (W.state knows them).

import { makeActing } from './act1/acting.js';
import { makeProps } from './act1/props.js';

// storyboard times of the act-1 events (seconds as written in storyboard.json)
const S = {
  veilIn: 0.07,
  ring: [0.43, 0.50, 0.57, 0.63], ringR: [276, 200, 131, 69], gather: 0.67, absorb: [0.70, 0.77, 0.83, 0.90],
  sun: [2.43, 2.50, 2.57], halo: 2.63, lift: 3.23, slip: 3.30, clear: 3.73,
  dotsA: [3.30, 3.37, 3.43, 3.50, 3.57],                                   // k = 9..0, two per step
  afterglow: [4.10, 4.17, 4.23], afterBreak: [4.30, 4.37, 4.43],
  dotsB: [4.33, 4.40, 4.47, 4.53, 4.60, 4.67, 4.73, 4.80],                 // k = 10..26, two per step, three on the last
  deed: [5.67, 5.77, 5.87, 6.00], tremble: 6.30, crumble: [6.37, 6.43, 6.50],
  veilOut: [8.77, 8.90, 9.03, 9.17],
  dotsOut: [10.73, 10.80, 10.87, 10.93, 11.00, 11.07, 11.13, 11.20],       // both legs from the feet upward
};
const TAU = Math.PI * 2;

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
      this.afterAt = [best[0] + 6, best[1] - 14];
    }

    // ---- course dots: when each prints and when it leaves
    const dots = L.arc.dots, n = dots.length;                                // 27, k = 0 at the left foot
    this.dots = dots.map(([x, y], k) => {
      const on = k <= 9 ? T.dotsA[Math.floor((9 - k) / 2)] : T.dotsB[Math.min(T.dotsB.length - 1, Math.floor((k - 10) / 2))];
      // both legs leave from the feet upward at the same HEIGHT: position k on the left = position 30 - k on the right
      const m = k <= 15 ? k : 30 - k;
      const off = T.dotsOut[Math.min(T.dotsOut.length - 1, Math.floor(m / 2))];
      return { x, y, k, on, off, sprite: this.props.dots[k % this.props.dots.length], rot: rng.next() * TAU };
    });
    this.nDots = n;

    // ---- call-ring: 16 dabs, four radii; a fixed small irregularity per dab (hand-printed)
    this.ring = Array.from({ length: 16 }, (_, i) => ({
      a: (TAU * (i + 0.5)) / 16 + rng.sym(0.035), dr: rng.sym(7), rot: rng.next() * TAU,
      sprite: this.props.callDabs[i % this.props.callDabs.length], sc: 1 + rng.sym(0.08),
    }));
    this.gathered = Array.from({ length: 7 }, (_, i) => ({
      a: (TAU * i) / 7 + 0.4 + rng.sym(0.12), r: 25 + rng.sym(4), rot: rng.next() * TAU,
      sprite: this.props.callDabs[(i * 2 + 1) % this.props.callDabs.length], late: i % 2,
    }));
  },

  release(E) {
    this.props = this.acting = this.dots = this.ring = this.gathered = this.sunPath = null;
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

  slots: {
    // ------------------------------------------------------------ behind today's sun: the course dots
    back(ctx, t, W) {
      const e = 1e-6;
      for (const d of this.dots) {
        if (t < d.on - e || t >= d.off + 2 / 30 - e) continue;
        if (t >= d.off - e) { d.sprite.draw(ctx, d.x, d.y, { p: 0.5, rot: d.rot }); continue; }   // half dabbed out for one step, then gone
        const first = t < d.on + 1 / 30 - e;                                                      // the press: one frame a little larger
        d.sprite.draw(ctx, d.x, d.y, first ? { rot: d.rot, scale: 1.2 } : { rot: d.rot });
      }
    },

    // ------------------------------------------------------------ sky stage
    sky(ctx, t, W) {
      const E = this.E, T = this.T, L = W.layout, PR = this.props, e = 1e-6;

      // yesterday's sun, its halo and the afterglow (all behind the ridge, the man's hand and the hedge)
      const sun = this.sunAt(t, W);
      if (sun) {
        const haloOut = L.count(t, S.afterBreak);
        if (t >= T.halo - e && haloOut < 3) {
          PR.sun.halo.draw(ctx, sun.x, sun.y, { scale: L.motion.haloBreath(t), p: 1 - haloOut / 3 });
        }
        PR.sun.stages[sun.stage - 1].draw(ctx, sun.x, sun.y, sun.rot ? { rot: sun.rot } : undefined);
      }
      if (t >= T.afterglow[0] - e && t < T.afterBreak[0] + 1.2) {
        const [ax, ay] = this.afterAt, out = L.count(t, S.afterBreak);
        const p = out ? 1 - out / 3 : L.count(t, S.afterglow) / 3;
        if (p > 0) PR.afterglow.glow.draw(ctx, ax, ay, { p });
        if (out) PR.afterglow.burst.draw(ctx, ax, ay, t - T.afterBreak[0]);
      }

      // the veil cloud over (540, 335): one stepped pass at 0.07; parts and dabs out 8.77 / 8.90 / 9.03 / 9.17
      if (t >= T.veilIn - e) {
        const out = L.count(t, S.veilOut), p = 1 - out / S.veilOut.length;
        if (p > 0) {
          const V = L.veil, PV = PR.veil;
          const open = E.tween(t, T.veilOut[0], T.veilOut[3], 0, 1, E.ease.cubic.inOut);
          const cx = V.centre[0] + 3 * Math.sin((TAU * t) / 11.3 + 0.6), cy = V.centre[1] + 1.5 * Math.sin((TAU * t) / 7.7 + 2);
          const dx = 35 * open;
          PV.L.draw(ctx, cx - dx, cy, { p });
          PV.R.draw(ctx, cx + dx, cy, { p });
          PV.rimL.draw(ctx, cx - dx, cy, { p });
          PV.rimR.draw(ctx, cx + dx, cy, { p });
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

      // «Ey nefis!»: the ring of 16 dabs closes in on his chest in three steps, gathers under his hand, is absorbed
      if (t >= T.ring[0] - e && t < T.absorb[3] - e) {
        const [cx, cy] = L.man.chest;
        const step = L.count(t, S.ring) - 1;
        if (t < T.gather - e) {
          const ringAt = (k, p) => {
            const R = S.ringR[k], sc = [1, 0.95, 0.86, 0.74][k];
            for (const d of this.ring) {
              const a = d.a + 0.13 * k, r = R + d.dr * sc, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
              // the ring passes BEHIND his head: no dab is printed on his face
              if (((x - 540) / 52) ** 2 + ((y - 697) / 58) ** 2 < 1) continue;
              d.sprite.draw(ctx, x, y, { rot: d.rot, scale: sc * d.sc, p });
            }
          };
          ringAt(step, 1);
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
        const off = [L.deed.centre[0] - L.deed.right_palm[0], L.deed.centre[1] - L.deed.right_palm[1]];
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
      // the deed's specks drift toward the dashed ring and are gone by 6.90
      if (t >= T.crumble[0] - 1e-6 && t < T.crumble[0] + 0.6) {
        const [px, py] = L.deed.right_palm;
        ctx.save();
        ctx.translate(px + L.deed.centre[0] - L.deed.right_palm[0], py + L.deed.centre[1] - L.deed.right_palm[1]);
        ctx.rotate(-0.07);
        PR.deed.burst.draw(ctx, 0, 0, t - T.crumble[0]);
        ctx.restore();
      }
    },
  },
};
