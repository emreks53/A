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

export default {
  id: 'main',
  duration: 29.6,
  finish: false,       // the scene applies E.finish itself (the end card does its own)
  glosses: true,       // replaced in init by the storyboard's custom list (sahipsin ends 8.35)

  async init(E) {
    const W = await E.once('world', () => makeWorld(E));
    this.W = W;
    this.glosses = W.layout.glossList;
    this.endAt = W.layout.ft(endcard.from);
    this.parts = [...acts, endcard].map((mod) => ({ mod, ready: false, slots: {} }));
    globalThis.__world = W;                              // handy in the console and for test harnesses
    await this.prepare(0, E);
  },

  /** Bake the part(s) that time t needs, release the ones that are far away. Awaited before every frame. */
  async prepare(t, E) {
    const W = this.W;
    for (const p of this.parts) {
      const { mod } = p;
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

  draw(ctx, t, E) {
    const W = this.W;
    if (t >= this.endAt - EPS) {
      endcard.draw(ctx, t, E, W);
      return;
    }
    const mod = actAt(t), part = this.parts.find((p) => p.mod === mod);
    if (!part.ready) throw new Error(`main: ${mod.id} is not baked at t=${t} (await prepare(t) first)`);
    W.draw(ctx, t, { pose: mod.pose ? mod.pose(t, W) : null, slots: part.slots });
    E.finish(ctx);
  },
};
