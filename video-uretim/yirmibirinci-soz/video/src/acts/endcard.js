// endcard.js — STUB written by the world builder: 23.80–29.60 is the bare primer plate (W.wall +
// the wall-grain finish), exactly the plate the 2D film ends on at frame 714. The end-card comp
// team REPLACES this file (photoreal plate + source text fading up out of this plate).

export default {
  id: 'endcard', from: 23.8, to: 29.6, stub: true,
  async init(E, W) {},
  release(E) {},
  draw(ctx, t, E, W) {
    E.blit(ctx, W.wall, 0, 0);
    E.finish(ctx);
  },
};
