// Act registry of the film (owner: world builder). One line per part; src/scenes/main.js does the
// rest (lazy init / release, slots, the hand-over to the end card).
//
// An act module (see src/shared/INTERFACES.md and src/shared/WORLD.md):
//   { id, from, to, async init(E, W), release(E), pose(t, W), slots: { back, sky, far, mid, hands, front, top } }
// The end card:
//   { id, from, to, async init(E, W), release(E), draw(ctx, t, E, W) }   — paints the whole frame itself

import act1 from './act1.js';
import act2 from './act2.js';
import endcard from './endcard.js';

/** The painted acts, in time order. Their ranges must tile [0, endcard.from) without gaps. */
export const acts = [act1, act2];
export { endcard };

/** The act that owns absolute time t (frame-safe: 12.20 belongs to act 2). */
export function actAt(t) {
  for (let i = acts.length - 1; i >= 0; i--) if (t >= acts[i].from - 1e-6) return acts[i];
  return acts[0];
}
