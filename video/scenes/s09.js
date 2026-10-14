// s09 (42.00–44.60) "Bu iki damla gibi olan iki örnek"
// Macro, slow motion: two clear water drops fall over a golden-hour sea (defocused: dark-warm water with golden bokeh).
// Each drop refracts a tiny image: drop 1 = the entrusted chest ("emanet"), drop 2 = the Zülfikar resting against the
// sheltering rock ("sığınak"). Camera tracks the fall. Continuous world with s10 (same scene graph at global time).
import * as THREE from 'three';
import { buildDropWorld, DW, badgeD } from '../engine/lib/extra_D.js';

let W = null;

const badge = badgeD;

export default {
  post: {
    exposure: 1.0, toneMapping: 'aces',
    bloom: { enabled: true, strength: .55, radius: .6, threshold: .82 },
    grade: { contrast: 1.07, saturation: 1.1, warmth: .03, lift: [.012, .008, .02], gain: [1.02, 1.0, .97] },
    vignette: .55, grain: .03, aberration: .0012,
    dof: { enabled: true, focus: 1, range: .3, amount: 1 },
  },
  async setup(ctx) { W = await buildDropWorld(ctx); },
  update(t, ctx) {
    const { ui, U } = ctx; const T = ctx.start + t;
    W.update(T, ctx);
    const tIki = ctx.wordTime('iki'), tDam = ctx.wordTime('damla'), tGibi = ctx.wordTime('gibi'), tOlan = ctx.wordTime('olan'), tIki2 = ctx.wordTime('iki', 1), tOrn = ctx.wordTime('örnek');
    // badges + names track the drops
    const sp = W.drops.map(d => ui.project(d.position));
    const rpx = W.drops.map((d, i) => { const e = d.position.clone().add(new THREE.Vector3(0, DW.R, 0)); return Math.abs(ui.project(e)[1] - sp[i][1]); });
    const names = ['emanet', 'sığınak'];
    W.drops.forEach((d, i) => {
      if (!d.visible) return; const [x, y] = sp[i]; const r = rpx[i];
      badge(ui, t, tIki + i * .14, x + (i ? 1 : -1) * r * .72, y - r * .78, String(i + 1), { r: 34, t1: ctx.dur + .35 });
      ui.pill(names[i], { t, t0: (i ? tOlan : tGibi) - .05, t1: ctx.dur + .3, x, y: Math.min(y + r + 60, 1300), size: 46, weight: 800, bg: 'rgba(255,236,214,.14)', color: '#fff1d6', anim: 'pop', dur: .4 });
    });
    ui.text('iki damla gibi', { t, t0: tDam - .04, x: 540, y: 270, size: 52, weight: 800, color: '#fff1d6', anim: 'rise' });
    ui.text('İKİ ÖRNEK', { t, t0: tIki2 - .03, x: 540, y: 400, size: 104, weight: 900, color: '#ffcf6b', letterSpacing: 6, anim: 'pop' });
    ui.underline({ t, t0: tOrn, x: 540, y: 470, w: 380, color: 'rgba(255,207,107,.85)', width: 7 });
  },
};
