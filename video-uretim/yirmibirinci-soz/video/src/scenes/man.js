// Review scene for THE MAN (src/shared/man.js). Not part of the film; labels exist only here.
//   pages (one per second):  0-6  every POSE at world scale 1, labelled      7-11  front poses, turn frames and back
//   poses at zoom 1.5        12 warm 0 vs 1        13-14 the hand silhouettes at zoom 1.5       15 opening dab-in passes
//   16-22 single arm poses at zoom 1.5 (three with a test coin in the `hands` layer)
//   ACT (from t = 23): continuous acting test through all poses in storyboard order (overlap rule, overshoot)
//
//   node tools/render.mjs sheet --scene man --from 0.5 --to 13.5 --step 1 --cols 7 --out out/man/pages.png
//   node tools/render.mjs still --scene man --t 5.5 --out out/man/p5.png

import { makeMan } from '../shared/man.js';

const ACT0 = 23;

export default {
  id: 'man',
  duration: ACT0 + 26,
  glosses: false,

  async init(E) {
    this.sky = E.once('manreview/sky', () => E.makeSky({ w: 1300, h: 2180, seed: 21, horizon: 1500, mood: 0.4 }));
    this.hedge = E.once('manreview/hedge', () => E.makeFoliage({ w: 1500, h: 520, seed: 3 }));
    let top = 0;
    for (let x = 300; x <= 1200; x += 20) top += this.hedge.topAt(x) / 46;
    this.hedgeTop = top;
    this.coin = E.bakeStencil({ shape: E.shape.ellipse(0, 0, 42), base: '#E9A52B', anchor: [0, 0], seed: 3, bleed: false,
      layers: [{ color: '#F6CF62', coverage: 0.5, size: 40 }, { color: '#B9791F', coverage: 0.25, size: 30, stamps: 'open' }],
      edge: { color: '#8A5416', width: 6, opacity: 0.7, dir: null } });
    const man = this.man = await makeMan(E);
    const P = man.POSES;
    const names = Object.keys(P);

    // ---- pages
    const grid = (list) => ({ kind: 'grid', list });
    const zoom = (list, o = {}) => ({ kind: 'zoom', list, ...o });
    this.pages = [];
    for (let i = 0; i < names.length; i += 4) this.pages.push(grid(names.slice(i, i + 4).map((n) => ({ label: n, pose: P[n] }))));
    while (this.pages.length < 7) this.pages.push(grid([]));
    const turn = (v) => ({ ...P.front_neutral, view: v });
    this.pages.push(
      zoom([{ label: 'front_neutral_bowed', pose: P.front_neutral_bowed }, { label: 'front_hand_on_chest', pose: P.front_hand_on_chest }]),
      zoom([{ label: 'front head up', pose: P.front_neutral }, { label: 'turn v=0.2 / 0.4', pose: turn(0.3) }]),
      zoom([{ label: 'turn v=0.6 / 0.8', pose: turn(0.7) }, { label: 'back_neutral', pose: P.back_neutral }]),
      zoom([{ label: 'back_head_bowed 8', pose: P.back_head_bowed_to_ground }, { label: 'back_turned_right', pose: P.back_turned_right }]),
      zoom([{ label: 'back_head_up 5', pose: P.back_head_up_small }, { label: 'back_final_stand', pose: P.back_final_stand }]),
      zoom([{ label: 'warm 0', pose: P.back_neutral, warm: 0 }, { label: 'warm 1', pose: P.back_neutral, warm: 1 }]),
      { kind: 'hands', flip: 1 },
      { kind: 'hands', flip: -1 },
      { kind: 'passes' },
      // single poses at zoom 1.5: joints, hands and foreshortened arms at the largest scale of the film
      // (a test coin shows the `hands` layer: 'rest' = standing on the palm, 'palm' = in the half-closed hand, 'front' = drawn after him)
      ...[['back_left_arm_out_palm_up', 660], ['back_right_palm_up', 470], ['back_right_reach', 400], ['back_right_palm_receive', 470, 'rest'],
        ['back_coin_held_at_side', 480, 'palm'], ['back_coin_shown', 480, 'front'], ['back_follow_through', 440]]
        .map(([n, x, coin]) => zoom([{ label: n + (coin ? `  (coin: ${coin})` : ''), pose: P[n], x, lx: 540, coin }])),
    );

    // ---- the acting test: storyboard order, compressed holds; upper arm leads, forearm +2 f, hand +2 f
    const B = E.ease.back.out, S = E.ease.sine.inOut, C = E.ease.cubic.inOut, O = E.ease.cubic.out;
    const seq = [
      ['front_neutral_bowed', 0.0], ['front_neutral_bowed', 0.5],
      ['front_hand_on_chest', 0.8, B], ['front_hand_on_chest', 1.6],
      ['front_neutral', 2.0, C], ['front_neutral', 2.15],
      ['back_neutral', 2.15 + 5 / 30, (u) => u], ['back_neutral', 2.6],
      ['back_left_arm_out_palm_up', 3.0, B], ['back_left_arm_out_palm_up', 3.9],
      ['back_left_reach_after', 4.1, O], ['back_left_reach_after', 4.4],
      ['back_left_hand_closed', 4.6, C], ['back_left_hand_closed', 4.9],
      ['back_neutral', 5.4, S], ['back_neutral', 5.6],
      ['back_head_turned_right', 6.0, S], ['back_head_turned_right', 6.3],
      ['back_right_palm_up', 6.6, B], ['back_right_palm_up', 7.4],
      ['back_look_at_empty_palm', 7.65, S], ['back_look_at_empty_palm', 8.0],
      ['back_right_reach', 8.3, B], ['back_right_reach', 8.35],
      ['back_right_recoil', 8.42, O], ['back_right_recoil', 8.6],
      ['back_right_hand_closed', 8.75, C], ['back_right_hand_closed', 9.0],
      ['back_neutral', 9.6, S], ['back_neutral', 9.9],
      ['back_head_up_small', 10.15, S], ['back_head_up_small', 10.8],
      ['back_head_bowed_to_ground', 11.1, S], ['back_head_bowed_to_ground', 11.8],
      ['back_nod', 11.95, O], ['back_neutral', 12.2, S], ['back_neutral', 12.5],
      ['back_head_up_small', 12.7, S], ['back_head_up_small', 13.2],
      ['back_right_palm_receive', 13.6, B], ['back_right_palm_receive', 14.4],
      ['back_coin_held_at_side', 14.7, C], ['back_coin_held_at_side', 15.0],
      ['back_turned_right', 15.35, S], ['back_turned_right', 16.2],
      ['back_coin_shown', 16.4, B], ['back_coin_shown', 16.9],
      ['back_wind_up', 17.0, O], ['back_release', 17.15, C],
      ['back_follow_through', 17.3, O], ['back_follow_through', 17.9],
      ['back_final_stand', 18.4, S], ['back_final_stand', 26],
    ];
    this.act = man.track(seq.map(([n, t, ease]) => ({ t, v: P[n], ease })), { overlap: 2 });
    this.actNames = seq;
  },

  label(ctx, text, x, y, size = 24) {
    ctx.save();
    ctx.font = `600 ${size}px "Encode Sans"`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(40,28,24,0.92)';
    ctx.fillText(text, x, y);
    ctx.restore();
  },

  draw(ctx, t, E) {
    const man = this.man;
    this.sky.draw(ctx, -110, -130);
    const lip = (y) => this.hedge.draw(ctx, -200, y - this.hedgeTop - 6);
    if (t >= ACT0) {
      const tau = t - ACT0;
      let pose = this.act(tau);
      if (tau > 2.15 - 1e-6 && tau < 2.15 + 5 / 30) pose = { ...pose, view: man.turn(tau, 2.15 + 1 / 30) };
      const cam = { x: 600, y: 900, zoom: 1.5 - 0.3 * E.ease.cubic.inOut(E.clamp((tau - 2.4) / 0.8)), rot: 0 };
      E.withCamera(ctx, cam, 1, () => {
        man.draw(ctx, t, { pose, warm: tau > 11 ? 1 : 0 });
        lip(1200);
      });
      let name = this.actNames[0][0];
      for (const [n, tt] of this.actNames) if (tau >= tt) name = n;
      this.label(ctx, `ACT  ${tau.toFixed(2)} s   ${name}`, 540, 1840, 30);
      return;
    }
    const pg = this.pages[Math.min(this.pages.length - 1, Math.floor(t))];
    if (pg.kind === 'grid') {
      const at = (i) => [270 + (i % 2) * 540, 800 + Math.floor(i / 2) * 900];
      pg.list.forEach((it, i) => man.draw(ctx, t, { pose: it.pose, x: at(i)[0], y: at(i)[1], warm: it.warm ?? 0, breath: 0 }));
      for (const fy of [800, 1700]) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, fy - 60, 1080, 190);
        ctx.clip();
        lip(fy);
        ctx.restore();
      }
      pg.list.forEach((it, i) => this.label(ctx, it.label, at(i)[0], at(i)[1] + 96, 26));
    } else if (pg.kind === 'zoom') {
      const cam = { x: 540, y: 900, zoom: 1.5, rot: 0 };
      E.withCamera(ctx, cam, 1, () => {
        pg.list.forEach((it, i) => {
          const x = it.x ?? 360 + i * 360;
          const coin = (c) => { const [px, py] = man.point('palmR', it.pose, { x, y: 1200 }); this.coin.draw(c, px, py - (it.coin === 'rest' ? 46 : 0)); };
          man.draw(ctx, t, { pose: it.pose, x, y: 1200, warm: it.warm ?? 0, breath: 0, hands: it.coin && it.coin !== 'front' ? coin : null });
          if (it.coin === 'front') coin(ctx);
        });
        lip(1200);
      });
      pg.list.forEach((it, i) => this.label(ctx, it.label, it.lx ?? 270 + i * 540, 1560, 28));
    } else if (pg.kind === 'hands') {
      // the four silhouettes against sky: one row at 3x for inspection, then at zoom 1.5 pointing outward / down / up
      // (upper of each pair: screen-right arm, warm 0; lower: screen-left arm, warm 1)
      man.HAND_SHAPES.forEach((h, i) => {
        const x = 110 + i * 262;
        man.drawHand(ctx, h, x, 330, { angle: 95, flip: pg.flip, side: 1, scale: 3 });
        [95, 10, 160].forEach((ang, j) => {
          const y = 640 + j * 400;
          man.drawHand(ctx, h, x + 30, y, { angle: ang, flip: pg.flip, side: 1, scale: 1.5 });
          man.drawHand(ctx, h, x + 150, y + 170, { angle: ang, flip: pg.flip, side: -1, scale: 1.5, warm: 1 });
        });
        this.label(ctx, `${h}  flip ${pg.flip}`, 150 + i * 262, 140, 26);
      });
      this.label(ctx, 'top row 3x; below: zoom 1.5, pointing outward (95) / down (10) / up (160)', 540, 1840, 22);
    } else if (pg.kind === 'passes') {
      const cam = { x: 540, y: 900, zoom: 1.5, rot: 0 };
      E.withCamera(ctx, cam, 1, () => {
        [1 / 3, 2 / 3, 1].forEach((p, i) => man.draw(ctx, t, { pose: man.POSES.front_neutral_bowed, x: 300 + i * 240, y: 1200, p, breath: 0 }));
        lip(1200);
      });
      this.label(ctx, 'opening passes  p = 1/3, 2/3, 1', 540, 1560, 28);
    }
  },
};
