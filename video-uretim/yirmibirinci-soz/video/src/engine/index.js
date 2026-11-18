// Engine namespace assembly. Scenes receive this object as `E` (see ENGINE.md for the reference).
import * as rng from './rng.js';
import * as easing from './ease.js';
import * as surf from './surface.js';
import * as sponge from './sponge.js';
import * as stencil from './stencil.js';
import * as backdrop from './backdrop.js';
import * as camera from './camera.js';
import * as gloss from './gloss.js';
import * as fx from './fx.js';
import * as assets from './assets.js';
import * as motion from './motion.js';
import * as rig from './rig.js';

export async function createEngine({ res = 1 } = {}) {
  surf.env.res = res;
  sponge.initSponge(50);
  const timing = await gloss.loadTiming();
  const memo = new Map();
  const E = {
    W: surf.env.W, H: surf.env.H, FPS: surf.env.FPS, res, timing,
    ...rng, ...easing, ...surf, ...sponge, ...stencil, ...backdrop, ...camera, ...gloss, ...fx, ...assets, ...motion, ...rig,
    /** Global finishing pass (wall grain); main.js applies it after scene.draw. */
    finish: fx.makeFinish(),
    /** Bake-once cache shared by all scenes: E.once('sky/main', () => E.makeSky({...})). */
    once(key, make) {
      if (!memo.has(key)) memo.set(key, make());
      return memo.get(key);
    },
    /** Drop entries of the E.once cache (all, or those whose key starts with prefix). */
    forget(prefix = '') {
      for (const k of [...memo.keys()]) if (k.startsWith(prefix)) memo.delete(k);
    },
    /**
     * Sequence sub-scenes on one timeline with bounded memory (see ENGINE.md "Sequencing"):
     *   makeSequence([{ scene, from, to }, …], { lead = 0.5, keep = 1 })
     *     -> { duration, async init(E), async prepare(t), draw(ctx, t, E), active(t) }
     * A part is baked (scene.init) when t comes within `lead` seconds of its window and released
     * (scene.release?.(E), then its references are yours to drop) once it lies more than `keep`
     * parts behind. draw calls each active part with LOCAL time t - from; parts may overlap
     * (cross-dabs) and are drawn in list order. The renderer awaits prepare(t) before every frame.
     */
    makeSequence(parts, { lead = 0.5, keep = 1 } = {}) {
      const st = parts.map(() => ({ ready: false }));
      // the part that ends last is inclusive at its end, so t == duration still draws the last frame
      const end = Math.max(...parts.map((p) => p.to));
      const live = (p, t) => t >= p.from && (t < p.to || (p.to === end && t <= p.to + 1e-9));
      const need = (t) => parts.map((p, i) => (t >= p.from - lead && t < p.to + 1e-9 ? i : -1)).filter((i) => i >= 0);
      const seq = {
        parts,
        duration: end,
        active: (t) => parts.filter((p) => live(p, t)),
        async init() { await seq.prepare(0); },
        async prepare(t) {
          const want = need(t);
          for (const i of want) {
            if (!st[i].ready) {
              await parts[i].scene.init(E);
              st[i].ready = true;
            }
          }
          const lo = Math.min(...want, parts.length), hi = Math.max(...want, -1);
          parts.forEach((p, i) => {
            if (st[i].ready && (i < lo - keep || i > hi + keep)) {
              p.scene.release?.(E);
              st[i].ready = false;
            }
          });
        },
        draw(ctx, t) {
          parts.forEach((p, i) => {
            if (!live(p, t)) return;
            if (!st[i].ready) throw new Error(`sequence part ${i} is not baked at t=${t} (await prepare(t) first)`);
            ctx.save();
            p.scene.draw(ctx, t - p.from, E, t);
            ctx.restore();
          });
        },
      };
      return seq;
    },
  };
  return E;
}
