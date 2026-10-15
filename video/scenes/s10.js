// s10 (44.60–49.25) "o deniz gibi Ahlak-ı Âliyenin iki damlası ve iki misalidir."
// Same continuous world as s09 (global time): the two drops reach the golden-hour sea, hit it in slow motion
// (crater, crown, Worthington jet, droplets, ripple rings); the camera then pulls back and up, swinging toward the low sun,
// revealing the endless sea to the horizon. Title "AHLÂK-I ÂLİYE" over the sky; the tiny ripple spot is marked "1"/"2":
// "iki damla · iki misal".
import * as THREE from 'three';
import { buildDropWorld, DW, badgeD, dashedRing, rippleFront } from '../engine/lib/extra_D.js';

let W = null;

export default {
  post: {
    exposure: 1.0, toneMapping: 'aces',
    bloom: { enabled: true, strength: .45, radius: .55, threshold: .95 },
    grade: { contrast: 1.07, saturation: 1.1, warmth: .03, lift: [.02, .015, .03], gain: [1.02, 1.0, .97] },
    vignette: .5, grain: .03, aberration: .0012,
    dof: { enabled: true, focus: 1, range: .3, amount: 1 },
  },
  async setup(ctx) { W = await buildDropWorld(ctx); },
  update(t, ctx) {
    const { ui, U } = ctx; const T = ctx.start + t;
    W.update(T, ctx);
    const tDen = ctx.wordTime('deniz'), tAh = ctx.wordTime('ahlak'), tIki = ctx.wordTime('iki', 1), tDam = ctx.wordTime('damlas'), tIki3 = ctx.wordTime('iki', 2), tMis = ctx.wordTime('misal');
    // soft warm-dark scrim behind the title once the sky behind it turns bright (keeps the cream title legible)
    { const X = ui.ctx; const a = .34 * U.smoothstep(45.9, 47.4, T) * ui.env(t, tAh - .04, Infinity, .45, 'fade').o;
      if (a > .002) { X.save(); const g = X.createLinearGradient(0, 150, 0, 520); g.addColorStop(0, 'rgba(46,18,30,0)'); g.addColorStop(.42, `rgba(46,18,30,${a})`); g.addColorStop(.62, `rgba(46,18,30,${a})`); g.addColorStop(1, 'rgba(46,18,30,0)'); X.fillStyle = g; X.fillRect(0, 150, 1080, 370); X.restore(); } }
    ui.text('o deniz gibi', { t, t0: tDen - .04, x: 540, y: 270, size: 52, weight: 800, color: '#fff1d6', anim: 'rise' });
    ui.text('AHLÂK-I ÂLİYE', { t, t0: tAh - .04, x: 540, y: 392, size: 104, weight: 900, color: '#fff3dc', letterSpacing: 3, anim: 'pop', shadowBlur: 30, shadowColor: 'rgba(50,16,28,.85)', stroke: 'rgba(110,44,36,.55)', strokeW: 10 });
    // the two drops' ripple spot, marked in the vast sea
    const c = new THREE.Vector3((DW.P[0][0] + DW.P[1][0]) / 2, 0, (DW.P[0][1] + DW.P[1][1]) / 2);
    const [sx, sy] = ui.project(c);
    const age = T - DW.Ti[0];
    dashedRing(ui, t, tIki - .1, c, Math.max(.25, rippleFront(age) * 1.05), { w: 4 });
    const X = ui.ctx; const lp = U.ease.outCubic(U.clamp((t - tIki) / .35));
    if (lp > 0) {
      const ends = [[sx - 150, sy - 120], [sx + 150, sy - 120]];
      X.save(); X.globalAlpha = Math.min(1, lp * 1.5); X.strokeStyle = 'rgba(255,241,214,.9)'; X.lineWidth = 4; X.lineCap = 'round'; X.shadowColor = 'rgba(0,0,0,.4)'; X.shadowBlur = 8;
      ends.forEach(([ex, ey]) => { X.beginPath(); X.moveTo(sx, sy); X.lineTo(sx + (ex - sx) * lp, sy + (ey - sy) * lp); X.stroke(); });
      X.fillStyle = '#ffcf6b'; X.beginPath(); X.arc(sx, sy, 8 * U.ease.outBack(U.clamp((t - tIki) / .3)), 0, Math.PI * 2); X.fill(); X.restore();
      ends.forEach(([ex, ey], i) => badgeD(ui, t, tIki + .18 + i * .12, ex, ey, String(i + 1), { r: 36 }));
    }
    // "iki damla · iki misal" assembled on the words (pill under the ripple marker)
    X.save(); X.font = '800 50px "Nunito"'; const w1 = X.measureText('iki damla').width, w2 = X.measureText('\u00a0· iki misal').width; X.restore();
    const x0 = 540 - (w1 + w2) / 2, cy = 1282;
    const pe = ui.env(t, tDam - .08, Infinity, .4, 'fade'); const pw = U.lerp(w1, w1 + w2, U.ease.outCubic(U.clamp((t - tMis + .06) / .35)));
    if (pe.o > .001) { X.save(); X.globalAlpha = pe.o * .62; X.fillStyle = '#1a1424'; ui.rrect(x0 - 30, cy - 40, pw + 60, 80, 40); X.fill(); X.restore(); }
    ui.text('iki damla', { t, t0: tDam - .04, x: x0, y: cy, size: 50, weight: 800, color: '#fff1d6', align: 'left', anim: 'rise' });
    ui.text('\u00a0· iki misal', { t, t0: tMis - .06, x: x0 + w1, y: cy, size: 50, weight: 800, color: '#ffd27a', align: 'left', anim: 'wipe', dur: .4 });
    ctx.post.exposure = U.lerp(1.0, .9, U.smoothstep(46.2, 48.2, T));
    // match s09's look at the cut, then settle into the wide-shot values
    { const m = U.smoothstep(45.2, 46.4, T); ctx.post.bloom.threshold = U.lerp(.85, .95, m); ctx.post.bloom.strength = U.lerp(.42, .45, m); ctx.post.vignette = U.lerp(.55, .5, m); }
  },
};
