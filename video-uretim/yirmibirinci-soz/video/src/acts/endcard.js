// endcard.js — END CARD, 23.80–29.60 on its own clock (the film shows it 0.5 s later: CARD_SHIFT in main.js):
// a photograph of a quiet reading place — the sea-blue Qur'an on its stand at the window, four volumes of the
// Risale-i Nur, one open — develops out of the film's cream primer plate while the source of the quote appears as
// four lines on the dark desk:  Risale-i Nur / Sözler / Yirmi Birinci Söz / 291. Sayfa
// The plate is the client's photograph (endcard/comp/bake_ai.py, meta.json -> kind 'photo'); the first card, the
// Blender room (endcard/comp/bake.py), still works as the fallback: the module follows meta.json -> kind.
//
// Frame 714 (t = 23.80) is EXACTLY the film's last painted frame: the bare primer plate
// (W.wall + E.finish). Everything after it is a pure function of absolute t (see TIMELINE):
//   endcard/comp.js   the photographic comp in float (light states, push-in, vignette, dissolve, grain = dither)
//   endcard/type.js   the lockup (EB Garamond; the film's gloss style)
// Data: /home/user/work/endcard/comp/ (re-bake with ONE command: python3 /home/user/work/endcard/comp/bake_ai.py)
// Notes for the sound team and the lead: /home/user/work/video/out/endcard/NOTES.md

import { loadPlates, makeComp } from './endcard/comp.js';
import { bakeLockup, drawLockup, lockupSettled } from './endcard/type.js';

const FPS = 30;
const fr = (n) => n / FPS;

/** Every time of the end card (seconds; elements start ON a frame). The sound team's table in NOTES.md is this. */
export const TIMELINE = {
  start: fr(714),                    // 23.800  the primer plate, exactly as the 2D film leaves it
  dissolve: [fr(714), fr(741)],      // 23.800 → 24.700  primer → photograph (base light): the room comes up as light
  quran: [fr(735), fr(765)],         // 24.500 → 25.500  the warm light on the Qur'an eases on
  on: {                              // first visible frame of each element (56 % → 86 % → 98 % → 100 %)
    eyebrow: fr(759),                // 25.300  Risale-i Nur
    rule: fr(762),                   // 25.400  the rule draws from its centre (0.5 s)
    hero: fr(773),                   // 25.767  Sözler
    sub: fr(787),                    // 26.233  Yirmi Birinci Söz
    folio: fr(800),                  // 26.667  291. Sayfa
  },
  accent: [fr(773), fr(800)],        // 25.767 → 26.667  the accent on the Sözler volume eases on
  push: [fr(714), fr(888)],          // 23.800 → 29.600  one slow push that arrives on the LAST frame: never at rest
  end: fr(888),                      // 29.600
};
const PUSH_TRAVEL = 0.0313;          // total: scale 1.0000 → 1.0313 (the travel of the first version)
const PIVOT = [540, 1200];           // the pivot of the film's last push (frame px, on the vertical centre line)
const LOCKUP = 'G';
// The dissolve (comp.js, `o.dis`): the exposure comes down from DIS.ev to DIS.evMin stops over the first DIS.evEnd
// of the window (dark wood first, then the shadows on the wall, the books last), the hand-over to the true
// photograph (wall falloff, the last of the books, the white Qur'an) runs from DIS.mix[0] to DIS.mix[1].
const DIS = { ev: 4.6, evMin: 0.6, evEnd: 1.0, evPow: 1.3, on: 0.52, mix: [0.26, 1.0], sat: 0.65 };   // on / mix overlap (lead): the two stages no longer butt at u = 0.4 (a velocity kink on the dark wood)
// The dissolve of the PHOTOGRAPH (meta.json -> kind 'photo', baked by endcard/comp/bake_ai.py): the dark, warm
// picture develops out of the cream plate as a generalised mean with exponent q (comp.js); s = smoothstep(u)^gamma
// puts the frame mean's 10 / 50 / 90 % at 24.00 / 24.26 / 24.51 — the times of the first card, so the sound fits.
const DIS_PHOTO = { q: 0.3, gamma: 1.22 };

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const span = (t, [a, b]) => clamp((t - a) / (b - a));
// A time that is a frame time up to float noise (the renderer's `from + i / fps`, the scene's `T - HOLD.add`) is
// put exactly on the frame: the card is then a pure function of the FRAME NUMBER, bit for bit, whatever clock
// offset the scene applies. Any other time (a still at 24.01) is used as given.
const onFrame = (t) => { const f = Math.round(t * FPS); return Math.abs(t * FPS - f) < 1e-4 ? f / FPS : t; };
const smoother = (u) => u * u * u * (u * (u * 6 - 15) + 10);
const sineIO = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u);

/**
 * Camera scale at t: a quadratic ease-out over the whole card — 1.08 %/s at 23.80, decelerating evenly and
 * arriving (velocity 0) on the last frame, so the photograph is never frozen: 0.33 %/s are left at 27.80,
 * 0.19 %/s one second before the end.
 */
export function pushScale(t) {
  const u = span(t, TIMELINE.push);
  return 1 + PUSH_TRAVEL * (1 - (1 - u) * (1 - u));
}
const smooth = (u) => u * u * (3 - 2 * u);

/** All animated numbers of the card at time t (pure). kind = meta.json -> kind ('photo' or the Blender card). */
export function stateAt(t, kind) {
  t = onFrame(t);
  const te = t + 1e-7;               // frame times are n / 30: keep the frame on its side of a key
  const u = span(te, TIMELINE.dissolve);
  return {
    w: u < 1e-5 ? 0 : smoother(u),   // exactly 0 on frame 714: that frame is the film's primer plate, untouched
    dis: kind === 'photo' ? { q: DIS_PHOTO.q, s: Math.pow(smooth(u), DIS_PHOTO.gamma) } : {   // the dissolve's own numbers (used while w < 1)
      g: Math.pow(2, DIS.evMin + (DIS.ev - DIS.evMin) * Math.pow(1 - clamp(u / DIS.evEnd), DIS.evPow)),
      m: smooth(span(u, DIS.mix)),
      c: smooth(clamp(u / DIS.on)),
      sat: DIS.sat,
    },
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
  const kind = P.meta.kind || 'card';
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
    const te = onFrame(t) + 1e-7;
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
    const st = stateAt(t, kind);
    const out = comp.compose({
      scale: st.scale, pivX: PIVOT[0], pivY: PIVOT[1], q: st.q, a: st.a, w: st.w, dis: st.dis,
      primer: st.w < 1 ? primer() : null, text: textLayer(t), frame: st.frame,
    });
    ctx.putImageData(out, 0, 0);
    return st;
  }

  return { paint, lock, comp, plates: P, block, cw, ch, kind, primer: null };
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
    const card = this.card, st = stateAt(t, card.kind);
    if (st.w < 1 && (st.w <= 0 || !card.primer)) {
      // the film's last painted frame: the bare primer plate (frame 714 is exactly this, nothing else)
      E.blit(ctx, W.wall, 0, 0);
      E.finish(ctx);
      if (st.w <= 0) return;
      // the plate is static (W.wall x the engine's finishing layer): it is read back ONCE per card, whichever
      // frame of the dissolve is drawn first (a readback on every frame makes Chromium warn in the console)
      card.primer = ctx.getImageData(0, 0, card.cw, card.ch).data;
    }
    card.paint(ctx, t, () => card.primer);
  },
};
