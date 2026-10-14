// s06 (29.75–33.30) "Hem Hazret-i Ali gibi cesarette benzersiz bir zat bile,"
// Golden hour on a rocky plain below an Uhud-like ridge. Hero shot: the Zülfikar (split-tip sword) planted in the sand,
// rim-lit by the low sun from behind-right, wind-blown sand + a thin dust "cape" streaming off its base; slow low orbit.
// Beats: "Hazret-i" → "Hz. Ali (r.a.)" + "Zülfikar" callout · "cesarette" → gust + "cesarette" · "benzersiz" → glint on the
// guard + "BENZERSİZ" · "bir zat bile" → light dims, a dust wall rises on the horizon (lead-in to the s07 battle storm).
import * as THREE from 'three';
import * as C from '../engine/lib/extra_C.js';

let R = {};
export default {
  post: {
    exposure: 1.0,
    bloom: { enabled: true, strength: 0.45, radius: 0.5, threshold: 0.82 },
    grade: { contrast: 1.1, saturation: 1.14, warmth: 0.03, lift: [0.01, 0.008, 0.025], gain: [1.03, 1.0, 0.97] },
    vignette: 0.45, grain: 0.03, aberration: 0.0012,
    dof: { enabled: true, focus: 4.5, range: 3.4, amount: 0.5 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, FX, renderer } = ctx;
    R = {};
    const el = 10 * Math.PI / 180, az = 0.62;
    const sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    R.sunDir = sunDir;
    scene.fog = new THREE.FogExp2('#d9a27c', 0.0022); R.fogA = new THREE.Color('#d9a27c'); R.fogB = new THREE.Color('#a8684a');
    const { sky, env } = C.gradSkyAndEnv(renderer, {
      stops: [[-14, '#3e2a20'], [-2, '#6a4430'], [0, '#f4bb88'], [3, '#eda684'], [7, '#cf8f88'], [13, '#957fa2'], [24, '#61709f'], [45, '#3c5689']],
      sunDir: sunDir.toArray(), sunColor: '#fff1d0', sunSize: .9, sunI: 6, glow: .9, glowColor: '#ffb066', haze: .75, clouds: .35, cloudColor: '#ffcf9e', cloudShade: '#a27c8c', darkColor: '#5a3426',
    });
    scene.add(sky); R.sky = sky; scene.environment = env; scene.environmentIntensity = .6;

    const sun = ENV.sunLight({ color: '#ffc480', intensity: 4.4, pos: sunDir.clone().multiplyScalar(40).toArray(), target: [0, .3, 0], size: 4.5, mapSize: 2048, bias: -.0002, normalBias: .015, radius: 2.5 });
    scene.add(sun, sun.target); R.sun = sun;
    const hemi = new THREE.HemisphereLight('#9fb4dc', '#b07a50', .55); scene.add(hemi);
    const bounce = new THREE.DirectionalLight('#ffbf8e', .5); bounce.position.set(-1, .8, 4); scene.add(bounce); R.bounce = bounce;

    // ground
    const sandMat = M.MAT.sand({ a: '#e2a46a', b: '#b8784a', repeat: [400 / 2.4, 400 / 2.4] }); sandMat.normalScale.set(.6, .6);
    const ground = M.dunes({ size: 400, seg: 240, height: 2.6, seed: 7, flatCenter: 45, flatAt: [0, 0], material: sandMat });
    scene.add(ground); R.ground = ground; const gh = (x, z) => ground.userData.heightAt(x, z);

    // the Zülfikar, planted (only the very points in the sand so the split tip stays visible)
    const sword = C.zulfikar({ hwF: .041, hwG: .033, hiltScale: 1.28, steelRough: .22, bend: .03 }); sword.scale.setScalar(1.12); sword.position.set(0, -.05, 0); sword.rotation.set(-.07, -.19, .025);
    scene.add(sword); sword.updateMatrixWorld(true); R.sword = sword;
    const heap = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.MAT.sand({ a: '#dca064', b: '#b57646', repeat: [2, 1] }));
    heap.scale.set(.2, .032, .14); heap.position.set(.005, -.004, 0); heap.receiveShadow = true; scene.add(heap);

    // rocks: small hero cluster (kept low, never behind the blade) + scatter + pebbles
    const rr = U.rng(61); const items = [
      { x: -.6, z: .1, s: [.2, .15, .17], ry: .4, variant: 0 }, { x: .55, z: -.55, s: [.24, .17, .2], ry: 1.2, variant: 1 }, { x: -1.6, z: -1.2, s: [.42, .3, .38], ry: 2, variant: 2 },
      { x: 2.6, z: -2.5, s: [.75, .5, .65], ry: .3, variant: 0 }, { x: 5.2, z: -7, s: [1.4, .9, 1.2], ry: 1, variant: 1 }, { x: -5.4, z: -8, s: [1.7, 1.0, 1.4], ry: 2.5, variant: 2 },
      { x: .32, z: .5, s: [.08, .06, .07], ry: 0, variant: 1 }, { x: -.22, z: .38, s: [.05, .04, .05], ry: 1, variant: 2 },
    ];
    for (let i = 0; i < 190; i++) { const a = rr() * 6.28, d = .35 + Math.pow(rr(), .8) * 14; const x = Math.cos(a) * d, z = Math.sin(a) * d - 2; if (z > 1.2 && Math.abs(x) < 2.4) continue; if (Math.abs(x) < .9 && z < -.5 && z > -9) continue; const s = .02 + Math.pow(rr(), 3) * .2 * (1 + d * .05); items.push({ x, z, s: [s, s * (.5 + rr() * .4), s * (.7 + rr() * .5)], ry: rr() * 6, variant: i % 3 }); }
    for (let i = 0; i < 26; i++) { const x = (rr() < .5 ? -1 : 1) * (6 + rr() * 60), z = -12 - rr() * 70; const s = .6 + rr() * 2.2; items.push({ x, z, s: [s, s * .6, s * .9], ry: rr() * 6, variant: i % 3 }); }
    items.forEach(it => { it.y = gh(it.x, it.z) + (Array.isArray(it.s) ? it.s[1] : it.s) * .12; });
    scene.add(C.scatterRocks(items, { seed: 9, detail: 3, palette: ['#8f5a3a', '#6a3f2a', '#a96f48'] }));
    // distant red-sandstone buttes (same family as the sheltering rock of s08) + Uhud-like ridge
    const b1 = C.butte({ hx: 9, hy: 7, hz: 14, round: 1.5, seed: 21, detail: 24, bury: 2, ledge: .2, noiseAmp: .3 }); b1.position.set(-70, gh(-70, -150) - .5, -150); b1.rotation.y = .5; scene.add(b1);
    const b2 = C.butte({ hx: 7, hy: 5, hz: 10, round: 1.2, seed: 33, detail: 22, bury: 1.5, ledge: .2, noiseAmp: .3 }); b2.position.set(80, gh(80, -190) - .5, -190); b2.rotation.y = -.3; scene.add(b2);
    const rg = C.ridge({ width: 1100, depth: 260, height: 78, seed: 5, color: '#94503a', top: '#ad6a4c' }); rg.position.set(-60, -2, -480); rg.rotation.y = .04; scene.add(rg);

    // wind-blown sand: low streaks (looping), a thin dust "cape" streaming off the sword base, distant back-lit wisps
    const sr = U.rng(8); const sand = [];
    for (let i = 0; i < 240; i++) {
      const sp = 4.5 + sr() * 4, life = 14 / sp; const z = -7 + sr() * 7.6; const y = .01 + Math.pow(sr(), 2.6) * .35;
      sand.push({ p: [-7 + sr(), y, z], v: [sp, (sr() - .3) * .2, (sr() - .5) * .35], t0: -sr() * life, life, w: .006 + sr() * .006, len: .12 + sr() * .3, color: sr() < .5 ? '#f6d2a2' : '#e9b886', a: .1 + sr() * .14, loop: 1 });
    }
    R.sand = C.streaks(sand, { fadeIn: .1, fadeOut: .8 }); scene.add(R.sand);
    const fog = { color: '#d9a27c', density: .0022 };
    R.cape = C.dustField({ count: 26, center: [2.4, .3, -.05], box: [5, .34, .55], size: [.25, .8], wind: [2.6, .12, 0], swirl: .06, shade: '#c48d62', lit: '#ffd9a4', sunDir: sunDir.toArray(), opacity: .26, nearFade: 1, scatter: 1.4, seed: 4, yMin: 0 });
    R.wisps = C.dustField({ count: 22, center: [0, 1.4, -16], box: [46, 2.4, 16], size: [3, 7], wind: [2.6, .05, 0], shade: '#b88660', lit: '#ffd09a', sunDir: sunDir.toArray(), opacity: .07, nearFade: 5, scatter: 1.4, seed: 5, fog, yMin: 0 });
    R.sheets = C.dustField({ count: 18, center: [0, .35, -3.5], box: [18, .5, 8], size: [.8, 1.8], wind: [3.6, 0, 0], shade: '#c48a5a', lit: '#ffd6a0', sunDir: sunDir.toArray(), opacity: .09, nearFade: 2.5, scatter: 1.2, seed: 6, fog, yMin: 0 });
    R.wall = C.dustField({ count: 26, center: [-60, 30, -300], box: [640, 24, 60], size: [110, 170], wind: [6, 0, 0], shade: '#5e3628', lit: '#a8694a', sunDir: sunDir.toArray(), opacity: 0, nearFade: 1, scatter: .6, seed: 7 });
    scene.add(R.cape, R.wisps, R.sheets, R.wall);
    // reflections: capture the real surroundings from the sword's position (sword hidden)
    sky.userData.uniforms.sunI.value = 1.6; scene.environment = C.envFromScene(renderer, scene, [0, .55, 0], [sword, R.cape, R.wisps, R.sheets, R.wall, R.sand]); sky.userData.uniforms.sunI.value = 6; R.gh = gh;
    // specular glint of the sun on the right quillon ball (short, on "benzersiz")
    R.glint = C.starGlint({ size: .16 }); R.glint.position.copy(sword.userData.ballR).add(new THREE.Vector3(.004, .006, .01)); sword.add(R.glint);

    camera.fov = 33; camera.near = .05; camera.far = 1500; camera.updateProjectionMatrix();
    R.look = new THREE.Vector3();
  },
  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    // --- camera: slow low orbit + gentle push-in (never stops) ---
    const p = U.prog(t, -0.5, 4.05, 'inOutSine');
    const th = U.lerp(.26, -.34, p), rad = U.lerp(4.85, 4.3, p), h = U.lerp(.42, .3, p);
    const sh = U.shake(t, .006, .5, 3);
    const cx = Math.sin(th) * rad + sh.x, cz = Math.cos(th) * rad;
    camera.position.set(cx, R.gh(cx, cz) + h + sh.y, cz);
    R.look.set(0, U.lerp(.585, .6, p), 0); camera.lookAt(R.look); camera.updateMatrixWorld(true);
    post.dof.focus = camera.position.distanceTo(R.look);

    const tAli = ctx.wordTime('hazret'), tCes = ctx.wordTime('cesarette'), tBen = ctx.wordTime('benzersiz'), tZat = ctx.wordTime('bir');
    // --- wind gusts ---
    const gust = .6 + .4 * U.smoothstep(tCes - .2, tCes + .5, t) + .3 * U.smoothstep(tZat - .3, tZat + .6, t);
    R.sand.userData.uniforms.master.value = gust; R.sheets.userData.uniforms.master.value = gust; R.cape.userData.uniforms.master.value = .7 + .5 * (gust - .6);
    // --- glint ---
    const g = Math.exp(-Math.pow((t - (tBen + .1)) / .2, 2));
    R.glint.material.opacity = .9 * g; R.glint.scale.setScalar(.05 + .17 * g); R.glint.material.rotation = t * .8;
    // --- storm approaching at the end ---
    const st = U.smoothstep(tZat - .7, ctx.dur + .5, t);
    R.wall.userData.uniforms.opacity.value = .85 * st; R.wall.userData.uniforms.boxCenter.value.set(-60, 22 + st * 20, -300 + st * 60);
    R.sun.intensity = 4.4 * (1 - .4 * st); R.bounce.intensity = .5 * (1 - .4 * st);
    R.sky.userData.uniforms.dark.value = .35 * st; R.sky.userData.uniforms.glow.value = .9 - .3 * st;
    ctx.scene.fog.density = .0022 + .003 * st; ctx.scene.fog.color.copy(R.fogA).lerp(R.fogB, st);
    post.exposure = 1.0 - .07 * st; post.grade.warmth = .03 + .04 * st;

    // --- typography (soft top scrim keeps the light sky from eating the letters) ---
    const X = ui.ctx; const sc = U.smoothstep(tAli - .3, tAli + .3, t); if (sc > 0) { const gr = X.createLinearGradient(0, 120, 0, 760); gr.addColorStop(0, `rgba(36,18,40,${.34 * sc})`); gr.addColorStop(1, 'rgba(36,18,40,0)'); X.save(); X.fillStyle = gr; X.fillRect(0, 0, 1080, 760); X.restore(); }
    ui.text('Hz. Ali (r.a.)', { t, t0: tAli - .05, x: 540, y: 300, size: 82, weight: 900, family: 'Playfair Display', color: '#fff3dc', anim: 'rise', dur: .5, letterSpacing: 1, shadowColor: 'rgba(40,20,30,.6)' });
    ui.underline({ t, t0: tAli + .25, x: 540, y: 354, w: 240, color: 'rgba(255,214,140,.9)', width: 4, dur: .5 });
    ui.text('cesarette', { t, t0: tCes - .03, x: 540, y: 425, size: 58, weight: 800, color: '#fff4dc', anim: 'rise', shadowColor: 'rgba(40,20,30,.6)' });
    ui.text('BENZERSİZ', { t, t0: tBen - .03, x: 540, y: 515, size: 118, weight: 900, color: '#ffd27a', anim: 'pop', letterSpacing: 5, shadowColor: 'rgba(40,20,30,.65)' });
    const gp = ui.project(R.sword.userData.ballR.clone().applyMatrix4(R.sword.matrixWorld));
    ui.callout('Zülfikar', { t, t0: tAli + .35, anchor: [gp[0], gp[1]], to: [846, 830], size: 36, weight: 800 });
  },
};
