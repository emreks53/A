// main.js — THE FILM. One scene renders everything (see src/shared/INTERFACES.md):
//
//   0.00–23.80  the shared world (src/shared/world.js) with the acts' slots (src/acts/act1.js, act2.js),
//               then the wall-grain finish; the engine adds the four glosses on top
//   23.80–29.60 the end card (src/acts/endcard.js) paints the whole frame itself
//
// Time is absolute video time everywhere. Preview a part with
//   node tools/render.mjs video --scene main --from 0 --to 12.2 --scale 0.5 --workers 2 --out out/<team>/x.mp4

import { makeWorld } from '../shared/world.js';
import { acts, endcard, actAt } from '../acts/index.js';

const LEAD = 0.6;     // s: an act is baked this long before its first frame
const KEEP = 1.0;     // s: … and released once t is further than this from its range
const EPS = 1e-6;

// THE LAST HOLD (lead, after the film review): the film's final picture — the hour placed in the niche, the
// three links answering, his arm at rest — had no time to rest before the cream cover. Act 2 now runs 0.5 s
// longer: its cover starts at 23.90 instead of 23.40 (src/acts/act2/util.js TL.cover) and act 2 ends at 24.30,
// while the living tableau simply goes on. The end card keeps its OWN unchanged clock (23.80–29.60): the
// scene shows it CARD_SHIFT seconds later. The film is 30.10 s long.
const FPS = 30;
export const CARD_SHIFT = Math.round((acts[acts.length - 1].to - endcard.from) * FPS) / FPS;   // 0.5 s (15 frames)
// (kept for tools that import them; the time stretch that was tried first is switched off)
export const HOLD = { a: 22.97, b: 23.40, add: 0 };
export function filmTime(T) { return T; }

// THE CAMERA'S SHUTTER (lead, after the second film review): the five fast camera glides travel up to 57 px per
// frame over a texture of very high micro-contrast; drawn without any shutter they strobe. While the camera is
// fast, the frame is the average of several sub-samples in which ONLY THE CAMERA is displaced inside a
// 180-degree shutter (world.js: W.camShift) — world states, poses, stepped events and every slot stay at the
// frame's own time, and the glosses / wall grain are added after the average. A slow camera (pushes, drift,
// holds) gives one sample: those frames are untouched.
const SHUTTER = 0.4;        // fraction of the frame interval the shutter is open (144 degrees: a restrained blur)
const BLUR_STEP = 2.0;      // one sub-sample per this many frame px of camera travel during the exposure
const BLUR_MIN_PX = 3.0;    // below this travel: no blur at all
const BLUR_MAX = 16;

/** Sub-samples needed at time t: the largest travel of four frame corners' world points during the exposure. */
function shutterSamples(W, t) {
  if (!('camShift' in W)) return 1;
  const h = (SHUTTER / FPS) / 2, pts = [[150, 300], [930, 300], [150, 1100], [930, 1100]];
  let d = 0;
  for (const [x, y] of pts) {
    W.camShift = -h; const a = W.toScreen(x, y, t);
    W.camShift = +h; const b = W.toScreen(x, y, t);
    d = Math.max(d, Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  W.camShift = 0;
  return d < BLUR_MIN_PX ? 1 : Math.min(BLUR_MAX, Math.max(2, Math.ceil(d / BLUR_STEP)));
}

export default {
  id: 'main',
  duration: endcard.to + CARD_SHIFT,
  finish: false,       // the scene applies E.finish itself (the end card does its own)
  glosses: true,       // replaced in init by the storyboard's custom list (sahipsin ends 8.35)

  async init(E) {
    const W = await E.once('world', () => makeWorld(E));
    this.W = W;
    this.glosses = W.layout.glossList;
    this.endAt = W.layout.ft(endcard.from + CARD_SHIFT);
    this.parts = [...acts, endcard].map((mod) => ({ mod, ready: false, slots: {} }));
    globalThis.__world = W;                              // handy in the console and for test harnesses
    await this.prepare(0, E);
  },

  /** Bake the part(s) that time t needs, release the ones that are far away. Awaited before every frame. */
  async prepare(T, E) {
    const W = this.W;
    for (const p of this.parts) {
      const { mod } = p, t = mod === endcard ? T - CARD_SHIFT : T;     // the end card runs on its own clock
      const need = t >= mod.from - LEAD - EPS && t < mod.to - EPS;
      const far = t < mod.from - KEEP || t > mod.to + KEEP;
      if (need && !p.ready) {
        await mod.init?.(E, W);
        // slots bound once: (ctx, t) => act.slots.name(ctx, t, W), with `this` = the act module
        p.slots = Object.fromEntries(Object.entries(mod.slots ?? {})
          .filter(([, fn]) => typeof fn === 'function')
          .map(([name, fn]) => [name, (ctx, time) => fn.call(mod, ctx, time, W)]));
        p.ready = true;
      } else if (far && p.ready) {
        mod.release?.(E);
        p.ready = false;
        p.slots = {};
      }
    }
  },

  draw(ctx, T, E) {
    const W = this.W, t = T;
    if (t >= this.endAt - EPS) {
      endcard.draw(ctx, Math.round((t - CARD_SHIFT) * FPS * 1e6) / (FPS * 1e6), E, W);
      return;
    }
    const mod = actAt(t), part = this.parts.find((p) => p.mod === mod);
    if (!part.ready) throw new Error(`main: ${mod.id} is not baked at t=${t} (await prepare(t) first)`);
    const pose = mod.pose ? mod.pose(t, W) : null, n = shutterSamples(W, t);
    if (n <= 1) {
      W.draw(ctx, t, { pose, slots: part.slots });
    } else {
      const acc = E.scratch(1080, 1920, 'main:shutter');      // frame-sized, drawn 1:1
      for (let k = 0; k < n; k++) {
        W.camShift = ((k + 0.5) / n - 0.5) * (SHUTTER / FPS);
        acc.ctx.save();
        W.draw(acc.ctx, t, { pose, slots: part.slots });
        acc.ctx.restore();
        ctx.save();
        ctx.globalAlpha = 1 / (k + 1);                                      // running average
        E.blit(ctx, acc, 0, 0);
        ctx.restore();
      }
      W.camShift = 0;
    }
    E.finish(ctx);
  },
};
