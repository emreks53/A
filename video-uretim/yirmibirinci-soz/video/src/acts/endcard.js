// endcard.js — END CARD, 23.80–29.60: the film's cream primer wall turns out to be the wall of a room;
// a photograph of the Qur'an above the Risale-i Nur Külliyatı fades up out of it while the source of
// the quote appears as four lines on the dark walnut:  Risale-i Nur / Sözler / Yirmi Birinci Söz / 291. Sayfa
//
// Frame 714 (t = 23.80) is EXACTLY the film's last painted frame: the bare primer plate
// (W.wall + E.finish). Everything after it is a pure function of absolute t (see TIMELINE):
//   endcard/comp.js   the photographic comp in float (light states, push-in, vignette, dissolve, grain = dither)
//   endcard/type.js   the lockup (EB Garamond; the film's gloss style)
// Data: /home/user/work/endcard/comp/ (re-bake with ONE command: python3 /home/user/work/endcard/comp/bake.py)
// Notes for the sound team and the lead: /home/user/work/video/out/endcard/NOTES.md

import { loadPlates, makeComp } from './endcard/comp.js';
import { bakeLockup, drawLockup, lockupSettled } from './endcard/type.js';

const FPS = 30;
const fr = (n) => n / FPS;

/** Every time of the end card (seconds; elements start ON a frame). The sound team's table in NOTES.md is this. */
export const TIMELINE = {
  start: fr(714),                    // 23.800  the primer plate, exactly as the 2D film leaves it
  dissolve: [fr(714), fr(741)],      // 23.800 → 24.700  primer → photograph (base light), smootherstep
  quran: [fr(735), fr(765)],         // 24.500 → 25.500  the warm light on the Qur'an eases on
  on: {                              // first visible frame of each element (56 % → 86 % → 98 % → 100 %)
    eyebrow: fr(759),                // 25.300  Risale-i Nur
    rule: fr(762),                   // 25.400  the hairline draws from its centre (0.5 s)
    hero: fr(773),                   // 25.767  Sözler
    sub: fr(787),                    // 26.233  Yirmi Birinci Söz
    folio: fr(800),                  // 26.667  291. Sayfa
  },
  accent: [fr(773), fr(800)],        // 25.767 → 26.667  the accent on the Sözler volume eases on
  push: [fr(714), fr(825)],          // 23.800 → 27.500  one slow push, 1.69 %/s at the start, at rest at the end
  end: fr(888),                      // 29.600
};
const PUSH_RATE = 0.0169;            // per second at 23.80 — the rate of the film's last push
const PIVOT = [540, 1200];           // … and its pivot (frame px, on the vertical centre line)
const LOCKUP = 'D';

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const span = (t, [a, b]) => clamp((t - a) / (b - a));
const smoother = (u) => u * u * u * (u * (u * 6 - 15) + 10);
const sineIO = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u);

/** Camera scale at t: velocity = PUSH_RATE * (1 + cos(pi u)) / 2 — constant at first, zero (and flat) at the end. */
export function pushScale(t) {
  const [a, b] = TIMELINE.push, u = span(t, [a, b]);
  return 1 + PUSH_RATE * (b - a) * (u / 2 + Math.sin(Math.PI * u) / (2 * Math.PI));
}

/** All animated numbers of the card at time t (pure). */
export function stateAt(t) {
  const te = t + 1e-7;               // frame times are n / 30: keep the frame on its side of a key
  const u = span(te, TIMELINE.dissolve);
  return {
    w: u < 1e-5 ? 0 : smoother(u),   // exactly 0 on frame 714: that frame is the film's primer plate, untouched
    q: sineIO(span(te, TIMELINE.quran)),
    a: sineIO(span(te, TIMELINE.accent)),
    scale: pushScale(te),
    frame: Math.round(t * FPS),
  };
}

/**
 * The card as an object: `await makeCard(E, { variant })`, then `card.paint(ctx, t, primerFn)`.
 * (endcard.draw uses it; look-dev probes use it directly with other lockup variants.)
 */
export async function makeCard(E, opts = {}) {
  const res = E.res;
  const cw = Math.round(E.W * res), ch = Math.round(E.H * res);
  const P = await loadPlates(res);
  const comp = makeComp(P, cw, ch, res);
  const block = P.meta.positions_1080x1920.suggested_text_block;
  const lock = bakeLockup(E, block, opts.variant ?? LOCKUP, opts);
  // the text layer: its own canvas over the lockup (+ halo room), read back as RGBA every frame
  const m = 70;
  const tx = Math.max(0, Math.floor((lock.ink[0] - m) * res)), ty = Math.max(0, Math.floor((lock.ink[1] - m) * res));
  const tw = Math.min(cw, Math.ceil((lock.ink[2] + m) * res)) - tx, th = Math.min(ch, Math.ceil((lock.ink[3] + m) * res)) - ty;
  const tcan = new OffscreenCanvas(tw, th), tctx = tcan.getContext('2d', { willReadFrequently: true });
  let settled = null;                // the finished text layer (identical on every frame of the hold)

  function textLayer(t) {
    if (opts.noText) return null;                        // look-dev / contrast measurement only
    const te = t + 1e-7;
    if (te < Math.min(TIMELINE.on.eyebrow, TIMELINE.on.rule) - 1 / FPS) return null;
    const done = lockupSettled(te, TIMELINE.on, FPS);
    if (done && settled) return settled;
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.clearRect(0, 0, tw, th);
    tctx.setTransform(res, 0, 0, res, -tx, -ty);
    if (!drawLockup(tctx, lock, te, TIMELINE.on, FPS)) return null;
    const layer = { data: tctx.getImageData(0, 0, tw, th).data, x: tx, y: ty, w: tw, h: th };
    if (done) settled = layer;
    return layer;
  }

  /** Paint frame t on ctx (the frame canvas). primer() must return the RGBA bytes of the primer plate. */
  function paint(ctx, t, primer) {
    const st = stateAt(t);
    const out = comp.compose({
      scale: st.scale, pivX: PIVOT[0], pivY: PIVOT[1], q: st.q, a: st.a, w: st.w,
      primer: st.w < 1 ? primer() : null, text: textLayer(t), frame: st.frame,
    });
    ctx.putImageData(out, 0, 0);
    return st;
  }

  return { paint, lock, comp, plates: P, block, cw, ch };
}

export default {
  id: 'endcard', from: TIMELINE.start, to: TIMELINE.end,

  async init(E, W) {
    this.card = await E.once('endcard/card', () => makeCard(E));
  },

  release(E) {
    this.card = null;
    E.forget?.('endcard/');
  },

  draw(ctx, t, E, W) {
    const st = stateAt(t);
    if (st.w < 1) {
      // the film's last painted frame: the bare primer plate (frame 714 is exactly this, nothing else)
      E.blit(ctx, W.wall, 0, 0);
      E.finish(ctx);
      if (st.w <= 0) return;
    }
    const card = this.card;
    card.paint(ctx, t, () => ctx.getImageData(0, 0, card.cw, card.ch).data);
  },
};
