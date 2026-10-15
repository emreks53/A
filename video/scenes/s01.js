// s01 (0.00–7.50) "Allah, Efendimiz ﷺ'a bine yakın mu'cize vermiş ve en büyük ve parlağını Kur'an kılmıştır."
// Blue-hour desert: ~1000 clay oil lamps ignite in a wave around a single warm point (live tally "≈ 1.000" + "MU'CİZE").
// On "en büyük ve parlağını" the camera spirals down onto that point: a gold-tooled Ottoman Mushaf resting on a carved
// walnut rahle, caught by the first raking ray of dawn — a slow product-shot push-in with lamp bokeh and drifting dust.
import * as THREE from 'three';
import * as X from '../engine/lib/extra_S01.js';

let R = {};
const D2R = Math.PI / 180;
export default {
  post: {
    exposure: 1.12, toneMapping: 'aces',
    bloom: { enabled: true, strength: 0.5, radius: 0.55, threshold: 0.78 },
    grade: { contrast: 1.05, saturation: 1.06, warmth: 0.0, lift: [0.012, 0.014, 0.03], gain: [1.0, 1.0, 1.0] },
    vignette: 0.36, grain: 0.028, aberration: 0.0008,
    dof: { enabled: true, focus: 30, range: 60, amount: 0.3 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, renderer } = ctx;
    R = {};
    // ---- sun / dawn geometry: low in the east (az 85deg), to the right of the final product camera ----
    const sunAz = 85 * D2R, sunEl = 11 * D2R;
    const L = new THREE.Vector3(Math.sin(sunAz) * Math.cos(sunEl), Math.sin(sunEl), Math.cos(sunAz) * Math.cos(sunEl));
    const skySun = new THREE.Vector3(Math.sin(sunAz), -.03, Math.cos(sunAz)).normalize();
    R.L = L;
    scene.fog = new THREE.FogExp2('#3d4572', 0.0052);
    const sky = X.dawnSky({ sunDir: skySun.toArray(), ground: '#20263f' }); scene.add(sky); R.sky = sky;
    const env = X.dawnEnv(renderer, { sunDir: skySun.toArray() }); scene.environment = env; scene.environmentIntensity = .3; R.env = env;

    // ---- dunes (flattened around the hero spot) ----
    const dunes = X.desertDunes({ size: 400, seg: 300, height: 11, near: .3, r0: 40, r1: 130, swell: 2.4, seed: 12, a: '#c4a07c', b: '#977054' });
    dunes.material.envMapIntensity = .35;
    scene.add(dunes); R.dunes = dunes; const hAt = dunes.userData.heightAt; R.hAt = hAt;

    // ---- lights: cool sky fill, faint warm dawn-sky light on east slopes, the dawn ray (spot), two lamp practicals ----
    const hemi = new THREE.HemisphereLight('#7088d8', '#463a3c', 2.0); scene.add(hemi); R.hemi = hemi;
    const dawnSkyL = new THREE.DirectionalLight('#ffb08a', .55); dawnSkyL.position.copy(skySun.clone().setY(.12).normalize().multiplyScalar(50)); scene.add(dawnSkyL, dawnSkyL.target); R.dawnSkyL = dawnSkyL;

    // ---- hero: rug + rahle + Mushaf ----
    const y0 = hAt(0, 0); const hero = new THREE.Group(); hero.position.set(0, y0, 0); scene.add(hero); R.hero = hero;
    const patch = X.sandPatch({ r: 2.8 }); patch.position.y = .0028; hero.add(patch); R.patch = patch;
    const rug = X.anatolianRug({ w: .74, l: 1.1 }); rug.position.y = .001; rug.rotation.y = .03; hero.add(rug);
    const rahle = X.ottomanRahle({ L: .64, W: .3, T: .017, angle: 55 * D2R, Yc: .255 }); rahle.position.y = rug.userData.topY; hero.add(rahle); R.rahle = rahle;
    const mus = X.eliteMushaf({ w: .19, h: .27, d: .056 });
    const ud = rahle.userData; mus.position.set(0, ud.hingeY + .0085 + .27 / 2, ud.T / 2 + .056 / 2 + .0004); ud.back.add(mus); R.mushaf = mus;
    hero.updateMatrixWorld(true);
    R.book = new THREE.Vector3(); mus.getWorldPosition(R.book);
    R.bookN = new THREE.Vector3(0, 0, 1).applyQuaternion(mus.getWorldQuaternion(new THREE.Quaternion()));
    R.leafUp = new THREE.Vector3(0, 1, 0).applyQuaternion(mus.getWorldQuaternion(new THREE.Quaternion()));
    R.envMats = []; mus.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) { m.envMap = env; R.envMats.push(m); } });
    rahle.traverse(o => { if (o.isMesh) { o.material.envMap = env; } }); R.envMats.push(ud.material);

    // hero lamps on the sand around the rug (real flames); two of them carry the practical lights
    const heroLampXZ = [[-.44, -.66, 2.2], [.42, -.78, -2.6], [-.06, -1.02, 1.4], [-.68, -.08, .4], [.7, .02, 2.9], [-.55, .66, -.6], [.78, .5, 2.2], [-1.0, .34, 0], [1.05, -.42, 3.0], [-.86, -.94, 1.1]];
    R.heroLamps = [];
    heroLampXZ.forEach(([x, z, rot], i) => { const l = X.heroLamp({ scale: 1.15, seed: i + 3 }); l.position.set(x, hAt(x, z) - y0 + .001, z); l.rotation.y = rot; hero.add(l); R.heroLamps.push(l); });
    { const hp = X.lampField(heroLampXZ.map(([x, z], i) => ({ x, y: .003, z, rot: 0, s: .55, on: -5, seed: i })), { fog: 0 }); hp.userData.bodies.visible = false; hp.userData.flames.visible = false; hero.add(hp); R.heroPools = hp; }
    const pl = (x, y, z, inten, dist) => { const l = new THREE.PointLight('#ff9a48', inten, dist, 2); l.position.set(x, y, z); hero.add(l); l.userData.base = inten; return l; };
    R.rimLamp = pl(-.38, .2, -.7, .32, 2.2); R.fillLamp = pl(-.55, .16, .62, .16, 2.2);

    // dawn ray: spot from the sun direction, raking across the cover from the right
    const spot = new THREE.SpotLight('#ffd29a', 0, 0, .0165, 1, 0); spot.position.copy(R.book).add(L.clone().multiplyScalar(16)); spot.target.position.copy(R.book).add(new THREE.Vector3(-.05, -.1, 0));
    spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.camera.near = 12; spot.shadow.camera.far = 20; spot.shadow.bias = -.00015; spot.shadow.normalBias = .004; spot.shadow.radius = 2;
    scene.add(spot, spot.target); R.spot = spot;
    const shaft = ctx.FX.lightShaft({ from: spot.position.toArray(), to: R.book.clone().add(L.clone().multiplyScalar(-1.2)).toArray(), r0: .3, r1: .3, color: '#ffcf8a', opacity: 0 }); scene.add(shaft); R.shaft = shaft;
    const motes = X.rayMotes({ count: 650, center: [0, .65, 0], box: [2.2, 1.3, 2.2], size: .0065, base: .04 }); hero.add(motes); R.motes = motes;
    motes.material.uniforms.rayO.value.copy(R.book); motes.material.uniforms.rayD.value.copy(L); motes.material.uniforms.rayR.value = .55; // beam test in world space

    // ---- the lamp field: jittered rings around the hero, terrain-following, ~1000 lamps incl. the hero lamps ----
    const rnd = U.rng(42); const items = []; let r = 1.7; const target = 1000 - heroLampXZ.length;
    const ringRs = []; while (r < 118) { ringRs.push(r); r += .55 + r * .1; }
    // spacing chosen so the total lands at exactly `target` (trim from the outermost ring)
    let sp = .5; const countFor = s => ringRs.reduce((a, rr) => a + Math.max(8, Math.round(2 * Math.PI * rr / (s + rr * .085))), 0);
    while (countFor(sp) > target) sp += .01;
    for (const rr of ringRs) { const n = Math.max(8, Math.round(2 * Math.PI * rr / (sp + rr * .085))); const off = rnd() * 6.283;
      for (let k = 0; k < n; k++) { const a = off + (k + (rnd() - .5) * .5) / n * 6.283, rj = rr + (rnd() - .5) * (sp + rr * .085) * .5; const x = Math.cos(a) * rj, z = Math.sin(a) * rj;
        const e = .25; const nx = hAt(x - e, z) - hAt(x + e, z), nz = hAt(x, z - e) - hAt(x, z + e); items.push({ x, y: hAt(x, z), z, nx, ny: 2 * e, nz, rot: rnd() * 6.283, s: 1.35 + rnd() * .3, seed: rnd() * 10, rr: rj }); } }
    while (items.length < target) { const a = rnd() * 6.283, rr = 60 + rnd() * 50; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; items.push({ x, y: hAt(x, z), z, nx: 0, ny: 1, nz: 0, rot: rnd() * 6.283, s: 1.4, seed: rnd() * 10, rr }); }
    items.length = target;
    // ignition: 12% scattered early sparks, the rest a wave from the centre outward whose lit count grows ~ x^1.8
    const order = items.map((it, i) => i).sort((a, b) => items[a].rr - items[b].rr); const T0 = .3, T1 = 3.3;
    order.forEach((idx, rank) => { const it = items[idx]; const f = rank / (order.length - 1); it.on = T0 + (T1 - T0) * Math.pow(f, 1 / 1.8) + (rnd() - .5) * .08; const q = rnd(); if (q < .035) it.on = -1 - rnd(); else if (q < .14) it.on = .3 + rnd() * 2.4; });
    const field = X.lampField(items, { fog: .0062 }); scene.add(field); R.field = field;
    R.onTimes = items.map(it => it.on).sort((a, b) => a - b); R.nHero = heroLampXZ.length;

    { const dbg = (new URLSearchParams(location.search).get('s01dbg') || '').split(','); R.dbg = dbg; // profiling switches (no effect in production)
      if (dbg.includes('nopts')) R.field.userData.flames.visible = false; if (dbg.includes('nopools')) R.field.userData.pools.visible = false; if (dbg.includes('nobodies')) R.field.userData.bodies.visible = false;
      if (dbg.includes('nomotes')) R.motes.visible = false; if (dbg.includes('noshadow')) R.spot.castShadow = false; if (dbg.includes('nolamps')) { R.rimLamp.visible = R.fillLamp.visible = false; }
      if (dbg.includes('simplemat')) scene.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.isMeshPhysicalMaterial) { m.sheen = 0; m.clearcoat = 0; } });
      if (dbg.includes('nodunes')) R.dunes.visible = false; }
    camera.near = .03; camera.far = 700; camera.fov = 38; camera.updateProjectionMatrix();
    // ---- camera: polar spiral around the book, monotone splines in time (C1, no overshoot) ----
    R.cAz = X.mono([[0, -46], [3.7, -38], [4.7, -10], [5.62, 22], [8.0, 13]]);
    R.cLD = X.mono([[0, Math.log(46)], [3.7, Math.log(39)], [4.7, Math.log(9)], [5.62, Math.log(2.15)], [8.0, Math.log(1.85)]]);
    R.cEl = X.mono([[0, 10], [3.7, 10.8], [4.7, 25], [5.62, 33], [8.0, 31.5]]);
    R.cW = X.mono([[0, 0], [3.7, .02], [4.7, .55], [5.62, 1], [8.0, 1]]);
    R.cFov = X.mono([[0, 38], [3.7, 37.5], [4.7, 31], [5.62, 21.5], [8.0, 20]]);
  },
  update(t, ctx) {
    const { ui, U, post, camera, renderer } = ctx;
    // ---- camera ----
    const az = R.cAz(t) * D2R, D = Math.exp(R.cLD(t)), el = R.cEl(t) * D2R, w = THREE.MathUtils.clamp(R.cW(t), 0, 1);
    const B = R.book; const cam = new THREE.Vector3(B.x + D * Math.cos(el) * Math.sin(az), B.y + D * Math.sin(el), B.z + D * Math.cos(el) * Math.cos(az));
    const sh = U.shake(t, .03 * Math.min(1, D / 6) + .0025, .35, 7); cam.add(sh);
    { const m = R.hAt(cam.x, cam.z) + Math.min(1.4, .22 + .03 * D), d = cam.y - m, k = .6; cam.y = m + (d > k ? d : k * Math.exp((d - k) / k)); } // soft terrain clearance
    camera.position.copy(cam);
    const hor = new THREE.Vector3(B.x - cam.x, 0, B.z - cam.z).normalize();
    const far = new THREE.Vector3(B.x, 0, B.z).addScaledVector(hor, 40); far.y = 1.5;
    const near = B.clone().add(new THREE.Vector3(0, .012, 0));
    const dF = far.sub(cam).normalize(), dN = near.sub(cam).normalize(); const qF = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dF), qN = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dN);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(qF.slerp(qN, w)); camera.lookAt(cam.clone().add(dir)); camera.fov = R.cFov(t); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    // pixel metrics for sprites / stars
    const rh = renderer.getDrawingBufferSize(new THREE.Vector2()).y; const fpx = rh / (2 * Math.tan(camera.fov * D2R / 2));
    R.patch.visible = D < 7; // fine grain only matters near the hero (avoids far z-fighting)
    const FU = R.field.userData.U; FU.uTime.value = t; FU.uFpx.value = fpx; FU.uMinPx.value = 2.2 * rh / 1920; FU.uCocMax.value = 120 * rh / 1920;
    R.sky.userData.uniforms.starPx.value = 1.6 * (camera.fov * D2R) / rh;
    R.motes.material.uniforms.fpx.value = fpx;

    // ---- the dawn ray: from "en büyük ve parlağını" the first ray finds the Mushaf ----
    const tB = ctx.wordTime('parlağını'), tK = ctx.wordTime("kur'an"), tBu = ctx.wordTime('büyük');
    const g = U.prog(t, tBu - .2, tK + .25, 'inOutSine'), sw = U.prog(t, tB - .45, tK + .45, 'inOutSine');
    R.spot.intensity = 26 * g; R.shaft.userData.uniforms.opacity.value = .1 * g * (1 - .75 * U.smoothstep(4.8, 5.8, t));
    R.spot.target.position.copy(R.book).add(R.leafUp.clone().multiplyScalar(.03 + .2 * (1 - sw))); R.spot.target.updateMatrixWorld();
    const mu = R.motes.material.uniforms; mu.rayAmt.value = g; mu.base.value = .05 + .04 * g;
    R.sky.userData.uniforms.sunUp.value = .4 * g; R.sky.userData.uniforms.gain.value = .85; R.sky.userData.uniforms.glow.value = 1 + .25 * U.smoothstep(0, 7.5, t);
    ctx.scene.environmentIntensity = .3 + .12 * g;
    const prod = U.smoothstep(4.6, 5.8, t); // 0 wide .. 1 product shot
    for (const m of R.envMats) m.envMapIntensity = .5 + .2 * prod + .25 * g;
    R.hemi.intensity = 2.0 - 1.6 * prod; R.dawnSkyL.intensity = .55 - .35 * prod;
    // lamp practicals flicker
    for (const l of [R.rimLamp, R.fillLamp]) l.intensity = l.userData.base * (1 + .07 * Math.sin(t * 13.1 + l.position.x * 9) + .05 * Math.sin(t * 7.7 + l.position.z * 5));
    post.exposure = 1.18 + .04 * g - .1 * prod;
    post.grade.warmth = .0 + .05 * prod; post.grade.saturation = 1.06 + .02 * prod;
    // DOF: deep in the wide shot, shallow product focus on the cover
    const focus = camera.position.distanceTo(B); post.dof.focus = focus; FU.uFocus.value = focus; FU.uAperture.value = .05 * prod; post.dof.range = THREE.MathUtils.lerp(80, 1.1, prod); post.dof.amount = THREE.MathUtils.lerp(.25, 1, prod);

    // motion blur only where the spiral glide is fast enough to strobe (point lights sweeping ~90 px/frame at 4.6 s)
    const mbN = (t > 4.35 && t < 5.2) ? 6 : (t > 4.15 && t < 5.5) ? 4 : (t > 4.0 && t < 5.7) ? 2 : 1; post.motionBlur = { samples: R.dbg.includes('nomb') ? 1 : mbN, shutter: .5 };
    if (R.dbg.includes('nospot')) { R.spot.intensity = 0; R.shaft.visible = false; } if (R.dbg.includes('noglow')) R.heroLamps.forEach(l => { l.userData.glow.visible = false; });
    if (R.dbg.includes('nodof')) post.dof.enabled = false; if (R.dbg.includes('nobloom')) post.bloom.enabled = false;
    // ---- typography ----
    const tBin = ctx.wordTime('bine'), tMu = ctx.wordTime("mu'cize");
    let lit = 0; { let lo = 0, hi = R.onTimes.length; while (lo < hi) { const m = (lo + hi) >> 1; if (R.onTimes[m] < t - .05) lo = m + 1; else hi = m; } lit = lo + R.nHero; }
    const hide = tB - .25;
    ui.text('≈ ' + lit.toLocaleString('tr-TR'), { t, t0: tBin - .2, t1: hide, x: 540, y: 400, size: 150, weight: 900, color: '#ffd27a', anim: 'pop', shadowBlur: 26, shadowColor: 'rgba(10,8,30,.7)' });
    ui.text("MU'CİZE", { t, t0: tMu - .05, t1: hide, x: 540, y: 520, size: 56, weight: 900, color: '#fff4dc', letterSpacing: 12, anim: 'rise', shadowBlur: 20, shadowColor: 'rgba(10,8,30,.75)' });
    ui.text('en büyüğü ve en parlağı', { t, t0: tB + .02, t1: 99, x: 540, y: 292, size: 54, weight: 800, color: '#fff4dc', anim: 'rise', shadowBlur: 22, shadowColor: 'rgba(30,12,4,.75)' });
    ui.text("KUR'ÂN-I KERÎM", { t, t0: tK - .05, t1: 99, x: 540, y: 388, size: 96, weight: 900, color: '#ffd27a', anim: 'pop', letterSpacing: 4, shadowBlur: 28, shadowColor: 'rgba(40,14,0,.7)' });
    // thin gold rule with a central lozenge under the title
    { const p = U.prog(t, tK + .15, tK + .75, 'outCubic'); if (p > 0) { const X2 = ui.ctx; X2.save(); X2.globalAlpha = p; X2.strokeStyle = '#ffd27a'; X2.fillStyle = '#ffd27a'; X2.lineWidth = 3; X2.shadowColor = 'rgba(40,14,0,.6)'; X2.shadowBlur = 10;
      const wv = 250 * p; X2.beginPath(); X2.moveTo(540 - 26 - wv, 458); X2.lineTo(540 - 26, 458); X2.moveTo(540 + 26, 458); X2.lineTo(540 + 26 + wv, 458); X2.stroke();
      X2.translate(540, 458); X2.rotate(Math.PI / 4); X2.fillRect(-8 * p, -8 * p, 16 * p, 16 * p); X2.restore(); } }
  },
};
