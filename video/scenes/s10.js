// s10 (44.60–49.25) "o deniz gibi Ahlak-ı Âliyenin iki damlası ve iki misalidir."
// Same continuous world as s09 (global time): the two drops reach the golden-hour sea, hit it in slow motion
// (crater, crown, Worthington jet, droplets, ripple rings); the camera then pulls back and up, swinging toward the low sun,
// revealing the endless sea to the horizon. Title "AHLÂK-I ÂLİYE" over the sky; the tiny ripple spot is marked "1"/"2":
// "iki damla · iki misal".
import * as THREE from 'three';
import { buildDropWorld, DW, badgeD, dashedRing, rippleFront } from '../engine/lib/extra_D.js';

let W = null;

// Splash refinements layered on top of the shared drop world (extra_D.js is shared with s09/s11, so it stays
// untouched): re-evaluates the crown / jet-tip / bead transforms after W.update(). Identical to the shared
// version for a < .2 s (everything s09 can show); afterwards
//  - the crown collapse is slightly slowed (smooth time warp) and the crown SINKS below the water surface while
//    its sheet fades (riding beads shrink with it) instead of flattening into a one-frame sawtooth ring that then
//    vanishes;
//  - the jet-tip droplet pinches off continuously: the ballistic phase starts exactly at the attached tip
//    position with the jet's velocity (+ a gently ramped separation impulse), and grows smoothly.
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
// Per-crown copy of the shared crown material with an extra alpha factor (same uniform objects, same shader code
// apart from `a * uFadeD`; with uFadeD = 1 the output is bit-identical). Created once, deterministically.
function crownFadeMats() {
  W.splash.forEach(s => {
    const m0 = s.crown.material; if (m0.userData.fadeD) return;
    const fs = m0.fragmentShader.replace('gl_FragColor = vec4(add / a, a);', 'gl_FragColor = vec4(add / a, a * uFadeD);');
    if (fs === m0.fragmentShader) return; // shader layout changed: keep the original material
    const m = new THREE.ShaderMaterial({ uniforms: { ...m0.uniforms, uFadeD: { value: 1 } }, vertexShader: m0.vertexShader, fragmentShader: 'uniform float uFadeD;\n' + fs,
      defines: { ...m0.defines }, transparent: m0.transparent, depthWrite: m0.depthWrite, side: m0.side });
    m.userData.fadeD = true; s.crown.material = m;
  });
}
function splashFix(T, U) {
  const ss = U.smoothstep; crownFadeMats();
  const warp = a => { const a0 = .2, a1 = .42, L = a1 - a0; let R = 0; if (a > a1) R = L / 2 + (a - a1); else if (a > a0) { const x = (a - a0) / L; R = L * (x * x * x - x * x * x * x / 2); } return a - .3 * R; };
  const crownAt = a => {
    const ae = warp(a), ca = U.clamp(ae / .48); const ch = Math.sin(Math.PI * Math.pow(ca, .7)) * .034;
    const late = ca > .5; const chE = late ? Math.max(ch, .006) : ch; const dy = -.015 * ss(.30, .50, ae);
    const fade = 1 - ss(.36, .44, ae); // the sinking crown sheet thins out instead of leaving finger-tip shards
    return { ch, chE, dy, fade, cr: .034 + .034 * U.ease.outCubic(ca), vis: late ? 1.62 * chE + dy > 0 && fade > .004 : ch > .002, late };
  };
  W.splash.forEach((s, i) => {
    const a = T - DW.Ti[i]; if (!(a > 0 && a < 2)) return;
    const c0 = crownAt(a); s.crown.visible = c0.vis;
    s.crown.scale.set(c0.cr, Math.max(c0.chE, .001), c0.cr); s.crown.position.y = c0.dy;
    if (s.crown.material.uniforms.uFadeD) s.crown.material.uniforms.uFadeD.value = c0.fade;
    // jet-tip droplet
    const ja = U.clamp((a - .26) / .9); const jh = Math.sin(Math.PI * ja) * .17;
    const pa = a - .6;
    if (pa > 0) {
      const ja0 = (.6 - .26) / .9, h0 = .17 * Math.sin(Math.PI * ja0) * .97, v0 = .17 * Math.PI / .9 * Math.cos(Math.PI * ja0) * .97;
      const x = U.clamp(pa / .12), ext = .05 * (pa < .12 ? .12 * (x * x * x - x * x * x * x / 2) : pa - .06);
      const y = h0 + v0 * pa + ext - .8 * pa * pa; const sc = U.lerp(.008, .0095, ss(0, .15, pa));
      s.tip.visible = y > -sc; s.tip.position.set(0, y, 0); s.tip.scale.setScalar(sc);
    } else { s.tip.visible = ja > .05; s.tip.position.set(0, jh * .97, 0); s.tip.scale.setScalar(.008 * ss(.05, .3, ja)); }
    // finger-tip beads (riding beads sink with the crown)
    s.parts.forEach((p, k) => {
      let sc = p.sz * ss(.03, .15, a);
      if (p.stay || a < p.td) {
        const c = c0;
        if (!c.late) { if (c.ch < .003) sc = 0; _v.set(Math.cos(p.an) * 1.2 * c.cr, 1.62 * c.ch + sc * .5, Math.sin(p.an) * 1.2 * c.cr); sc *= ss(.002, .012, c.ch); }
        else { _v.set(Math.cos(p.an) * 1.2 * c.cr, 1.62 * c.chE + sc * .5 + c.dy, Math.sin(p.an) * 1.2 * c.cr); sc *= ss(.002, .012, c.ch) * ss(0, .7, c.fade); if (_v.y < -sc) sc = 0; }
      } else { const c = crownAt(p.td); const t = a - p.td; const rr = 1.2 * c.cr + p.vo * t; const y = 1.62 * c.ch + c.dy + p.sz * .5 + p.vu * t - .9 * t * t; if (y < -.004) sc = 0; _v.set(Math.cos(p.an) * rr, y, Math.sin(p.an) * rr); }
      _s.setScalar(Math.max(sc, 1e-5)); if (sc === 0) _v.set(0, -1, 0); _m4.compose(_v, _q.identity(), _s); s.fly.setMatrixAt(k, _m4);
    });
    s.fly.instanceMatrix.needsUpdate = true;
  });
}

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
    W.update(T, ctx); splashFix(T, U);
    const tDen = ctx.wordTime('deniz'), tAh = ctx.wordTime('ahlak'), tIki = ctx.wordTime('iki', 1), tDam = ctx.wordTime('damlas'), tIki3 = ctx.wordTime('iki', 2), tMis = ctx.wordTime('misal');
    // soft warm-dark scrim behind the title once the sky behind it turns bright (keeps the cream title legible)
    { const X = ui.ctx; const a = .34 * U.smoothstep(45.9, 47.4, T) * ui.env(t, tAh - .04, Infinity, .45, 'fade').o;
      if (a > .002) { X.save(); const g = X.createLinearGradient(0, 150, 0, 520); g.addColorStop(0, 'rgba(46,18,30,0)'); g.addColorStop(.42, `rgba(46,18,30,${a})`); g.addColorStop(.62, `rgba(46,18,30,${a})`); g.addColorStop(1, 'rgba(46,18,30,0)'); X.fillStyle = g; X.fillRect(0, 150, 1080, 370); X.restore(); } }
    ui.text('o deniz gibi', { t, t0: tDen - .04, x: 540, y: 270, size: 52, weight: 800, color: '#fff1d6', anim: 'rise' });
    // title pop: soften the outBack overshoot (C1 soft-knee) so the 104 px title stays inside x 80..1000 at its peak
    { const sp = ui.env(t, tAh - .04, Infinity, .45, 'pop').s, xo = sp - 1, c = .45, w = .04;
      const g = xo <= 0 ? xo : xo <= 2 * w ? xo - (1 - c) * xo * xo / (4 * w) : c * xo + (1 - c) * w; const k = sp > 1 ? (1 + g) / sp : 1;
      const X = ui.ctx; if (k !== 1) { X.save(); X.translate(540, 392); X.scale(k, k); X.translate(-540, -392); }
      ui.text('AHLÂK-I ÂLİYE', { t, t0: tAh - .04, x: 540, y: 392, size: 104, weight: 900, color: '#fff3dc', letterSpacing: 3, anim: 'pop', shadowBlur: 30, shadowColor: 'rgba(50,16,28,.85)', stroke: 'rgba(110,44,36,.55)', strokeW: 10 });
      if (k !== 1) X.restore(); }
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
