// world.js (scene) — the bare shared WORLD, 0–24 s: no act slots, no glosses, neutral man.
// A regression view for the world builder and the integrator: it keeps showing exactly what
// src/shared/world.js paints, whatever the act modules do.
//   node tools/render.mjs sheet --scene world --from 0 --to 24 --step 0.5 --cols 12 --thumb 270 --out out/world/world_sheet.png

import { makeWorld } from '../shared/world.js';

export default {
  id: 'world',
  duration: 24,
  glosses: false,
  async init(E) {
    this.W = await E.once('world', () => makeWorld(E));
    globalThis.__world = this.W;
  },
  draw(ctx, t) {
    this.W.draw(ctx, t, {});     // default pose: front view until the turn, back view after it
  },
};
