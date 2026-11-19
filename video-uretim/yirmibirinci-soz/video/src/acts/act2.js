// act2.js — ACT 2, "one hour, saved" (12.20–23.80). Owner: act-2 team. Replaces the world builder's stub.
//
// «Lâekall günün bir saatini, ihtiyat akçesi gibi hakiki istikbal için teşkil olunan bir sandukça-i uhreviye
//  olan bir mescide veya bir seccadeye at.»
//
// The module only wires the parts (src/acts/act2/*) into the world's layer slots; every part is a pure
// function of absolute time and bakes its sprites once (E.once keys 'act2/…').
//
//   slot    plane   what act 2 draws there
//   sky     1.0     dial.js    clock-hand, 24 hour-beads, the gold hour while it is in the ring
//   far     0.7     light.js   deepened sky round the true future, the far light (4 passes + swell), its specks
//   mid     1.0     ground.js  knoll, warm base mist, (after the buildings) grass fringe + door-light spill
//                   light.js   five light-beads
//                   build.js   chest -> mescid (minaret first: it rises from behind the plateau's edge)
//                   rug.js     rolled rug, the unrolling seccade, its glowing niche
//   hands   1.0     dial.js    the hour floating down / on his palm / in his half-closed hand / shown in his finger tips
//                              and swung: BEHIND his hand as long as he holds it (thumb and fingers in front of the rim)
//   front   1.0     dial.js    the coin in flight, sinking into the niche; the minting's glint
//                   rug.js     LINK 1: the niche's bloom
//   top     frame   light.js   the cream cover 23.40–23.80 (frame 714 = the bare primer plate, drawn by the scene)
//
// The man's acting: act2/acting.js. Event times: act2/util.js (TL). Notes: out/act2/NOTES.md.

import { makeUtil } from './act2/util.js';
import { makeActing } from './act2/acting.js';
import { makeDial } from './act2/dial.js';
import { makeLight } from './act2/light.js';
import { makeGround } from './act2/ground.js';
import { makeBuilding } from './act2/build.js';
import { makeRug } from './act2/rug.js';

export default {
  id: 'act2', from: 12.2, to: 23.8,

  async init(E, W) {
    const U = makeUtil(E, W);
    this.U = U;
    this.acting = makeActing(E, W, U);
    this.dial = makeDial(E, W, U, this.acting);
    this.light = makeLight(E, W, U);
    this.ground = makeGround(E, W, U);
    this.build = makeBuilding(E, W, U);
    this.rug = makeRug(E, W, U);
  },
  release(E) {
    this.U = this.acting = this.dial = this.light = this.ground = this.build = this.rug = null;
    E.forget('act2/');
  },

  pose(t) { return this.acting.pose(t); },

  slots: {
    sky(ctx, t) { this.dial.drawSky(ctx, t); },
    far(ctx, t) { this.light.drawFar(ctx, t); },
    mid(ctx, t) {
      this.ground.drawBack(ctx, t);
      this.light.drawBeads(ctx, t);
      this.build.drawMinaret(ctx, t);
      this.build.draw(ctx, t);
      this.ground.drawFront(ctx, t);
      this.rug.draw(ctx, t);
    },
    hands(ctx, t) { this.dial.drawHeld(ctx, t, 'hands'); },
    front(ctx, t) {
      this.dial.drawHeld(ctx, t, 'front');
      this.dial.drawGlint(ctx, t);
      this.rug.drawBloom(ctx, t);
    },
    top(ctx, t) { this.light.drawCover(ctx, t); },
  },
};
