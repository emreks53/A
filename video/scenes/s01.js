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
    dof: { enabled: false, focus: 30, range: 60, amount: 0 },
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
    dunes.receiveShadow = false; /* ray shadows land on the opaque-centred sand patch / rug */ scene.add(dunes); R.dunes = dunes; const hAt = dunes.userData.heightAt; R.hAt = hAt;

    // ---- lights: cool sky fill, faint warm dawn-sky light on east slopes, the dawn ray (spot), two lamp practicals ----
    const hemi = new THREE.HemisphereLight('#7088d8', '#463a3c', 2.0); scene.add(hemi); R.hemi = hemi; R.hemiSky = hemi.color.clone(); R.hemiGnd = hemi.groundColor.clone(); R.hemiSkyP = new THREE.Color('#9c86b4'); R.hemiGndP = new THREE.Color('#6a4430');
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
    const heroLampXZ = [[-.44, -.66, 2.2], [.42, -.78, -2.6], [-.62, -1.05, 1.4], [-.95, -.5, .4], [.7, .02, 2.9], [-.55, .66, -.6], [.78, .5, 2.2], [-1.0, .34, 0], [1.05, -.42, 3.0], [-.86, -.94, 1.1]];
    R.heroLamps = [];
    heroLampXZ.forEach(([x, z, rot], i) => { const l = X.heroLamp({ scale: 1.15, seed: i + 3 }); l.position.set(x, hAt(x, z) - y0 + .001, z); l.rotation.y = rot; hero.add(l); R.heroLamps.push(l); });
    { const hp = X.lampField(heroLampXZ.map(([x, z], i) => ({ x, y: .003, z, rot: 0, s: .55, on: -5, seed: i })), { fog: 0 }); hp.userData.bodies.visible = false; hp.userData.flames.visible = false; hero.add(hp); R.heroPools = hp; }
    const pl = (x, y, z, inten, dist) => { const l = new THREE.PointLight('#ff9a48', inten, dist, 2); l.position.set(x, y, z); hero.add(l); l.userData.base = inten; return l; };
    R.rimLamp = pl(-.3, .32, -.85, .16, 2.4); R.fillLamp = pl(-.42, .42, .52, .1, 2.2); // fill = glow of the lamps on the shadow (left) side, reaching the leaf beside the book

    // dawn ray: spot from the sun direction, raking across the cover from the right
    const spot = new THREE.SpotLight('#ffdcae', 0, 0, .0165, 1, 0); spot.position.copy(R.book).add(L.clone().multiplyScalar(16)); spot.target.position.copy(R.book).add(new THREE.Vector3(-.05, -.1, 0));
    spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.camera.near = 12; spot.shadow.camera.far = 20; spot.shadow.bias = -.00015; spot.shadow.normalBias = .004; spot.shadow.radius = 2;
    scene.add(spot, spot.target); R.spot = spot;
    const shaft = ctx.FX.lightShaft({ from: spot.position.toArray(), to: R.book.clone().add(L.clone().multiplyScalar(-1.2)).toArray(), r0: .3, r1: .3, color: '#ffcf8a', opacity: 0 }); scene.add(shaft); R.shaft = shaft;
    const motes = X.rayMotes({ count: 650, center: [0, .65, 0], box: [2.2, 1.3, 2.2], size: .0065, base: .04 }); hero.add(motes); R.motes = motes;
    const dust = X.rayMotes({ count: 700, center: [0, 0, 0], box: [1.1, .9, 1.1], size: .0034, base: .006, seed: 91 }); dust.position.copy(R.book).sub(hero.position); hero.add(dust); R.dust = dust;
    dust.material.uniforms.rayO.value.copy(R.book); dust.material.uniforms.rayD.value.copy(L); dust.material.uniforms.rayR.value = .3;
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
    // ignition: 12% scattered early sparks, the rest a wave from the centre outward whose lit count grows ~ x^1.8;
    // it starts just after "Allah" and completes as "bine" ends, so the tally reads "≈ 1.000" on "bine yakın"
    const order = items.map((it, i) => i).sort((a, b) => items[a].rr - items[b].rr); const T0 = ctx.wordTime('allah') + .12, T1 = ctx.wordTime('yakın');
    order.forEach((idx, rank) => { const it = items[idx]; const f = rank / (order.length - 1); it.on = T0 + (T1 - T0) * Math.pow(f, 1 / 1.8) + (rnd() - .5) * .08; const q = rnd(); if (q < .035) it.on = -1 - rnd(); else if (q < .14) it.on = T0 + rnd() * (T1 - T0) * .8; });
    const field = X.lampField(items, { fog: .0062 }); scene.add(field); R.field = field;
    R.onTimes = items.map(it => it.on).sort((a, b) => a - b); R.nHero = heroLampXZ.length;

    { const dbg = (new URLSearchParams(location.search).get('s01dbg') || '').split(','); R.dbg = dbg; // profiling switches (no effect in production)
      if (dbg.includes('nopts')) R.field.userData.flames.visible = false; if (dbg.includes('nopools')) R.field.userData.pools.visible = false; if (dbg.includes('nobodies')) R.field.userData.bodies.visible = false;
      if (dbg.includes('nomotes')) R.motes.visible = false; if (dbg.includes('noshadow')) R.spot.castShadow = false; if (dbg.includes('nolamps')) { R.rimLamp.visible = R.fillLamp.visible = false; }
      if (dbg.includes('simplemat')) scene.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.isMeshPhysicalMaterial) { m.sheen = 0; m.clearcoat = 0; } });
      if (dbg.includes('nodunes')) R.dunes.visible = false; if (dbg.includes('expose')) window.__s01 = R; }
    camera.near = .03; camera.far = 700; camera.fov = 38; camera.updateProjectionMatrix();
    // ---- camera path: polar spiral around the book, monotone splines over a path parameter tau (keys ~ seconds of the first draft; the clock is mapped to tau by the re-timing below).
    //      After the wide shot az / el only increase and D / fov only shrink, so the landing never reverses direction. ----
    R.cAz = X.mono([[0, -46], [3.7, -38], [4.7, -10], [5.62, 9], [8.0, 15]]);
    R.cLD = X.mono([[0, Math.log(46)], [3.7, Math.log(39)], [4.7, Math.log(9)], [5.62, Math.log(2.15)], [8.0, Math.log(1.98)]]);
    R.cEl = X.mono([[0, 10], [3.7, 10.8], [4.7, 25], [5.62, 30.5], [8.0, 32]]);
    R.cW = X.mono([[0, 0], [3.7, .02], [4.7, .55], [5.62, 1], [8.0, 1]]);
    R.cFov = X.mono([[0, 38], [3.7, 37.5], [4.7, 31], [5.62, 21.5], [8.0, 20]]);
    { // Gaussian-smooth each monotone spline in tau (sigma .2): mono() is only C1, and its curvature jump at the knots (slow wide drift ->
      // dive at 3.7, landing at 5.62) shows up as a speed kink once the path is re-timed. Convolution keeps every channel monotone.
      const h = .002, T0 = -2.5, NT = Math.round(13 / h), sig = .2, rr = Math.ceil(3 * sig / h), wk = []; let ws = 0;
      for (let j = -rr; j <= rr; j++) { const w = Math.exp(-.5 * (j * h / sig) ** 2); wk.push(w); ws += w; }
      const sm = f => { const raw = new Float64Array(NT + 1), out = new Float64Array(NT + 1); for (let k = 0; k <= NT; k++) raw[k] = f(T0 + k * h);
        for (let k = 0; k <= NT; k++) { let a = 0; for (let j = -rr; j <= rr; j++) a += wk[j + rr] * raw[Math.min(NT, Math.max(0, k + j))]; out[k] = a / ws; }
        return tau => { const f2 = THREE.MathUtils.clamp((tau - T0) / h, 0, NT - 1e-6), k = Math.floor(f2), u = f2 - k; return out[k] + (out[k + 1] - out[k]) * u; }; };
      R.cAz = sm(R.cAz); R.cLD = sm(R.cLD); R.cEl = sm(R.cEl); R.cFov = sm(R.cFov); R.smooth = sm; } // cW: smoothed after the framing guard below
    R.aimY = .027; // aim a touch above the cover: keeps the rahle crest clear of the title rule in the product shot
    const B = R.book, Zm = new THREE.Vector3(0, 0, -1);
    R.camPos = (tau, sh) => { // camera position on the spiral (+ optional shake), with soft terrain clearance
      const az = R.cAz(tau) * D2R, D = Math.exp(R.cLD(tau)), el = R.cEl(tau) * D2R;
      const cam = new THREE.Vector3(B.x + D * Math.cos(el) * Math.sin(az), B.y + D * Math.sin(el), B.z + D * Math.cos(el) * Math.cos(az)); if (sh) cam.add(sh);
      const m = R.hAt(cam.x, cam.z) + Math.min(1.4, .22 + .03 * D), d = cam.y - m, k = .6; cam.y = m + (d > k ? d : k * Math.exp((d - k) / k)); return cam; };
    R.camDir = (cam, tau, wO) => { // look direction: from the far lamp field / horizon (wide) to the book (product shot); wO overrides the aim weight
      const w = THREE.MathUtils.clamp(wO ?? R.cW(tau), 0, 1); const hor = new THREE.Vector3(B.x - cam.x, 0, B.z - cam.z).normalize();
      const far = new THREE.Vector3(B.x, 0, B.z).addScaledVector(hor, 40); far.y = 1.5; const near = B.clone().add(new THREE.Vector3(0, R.aimY, 0));
      const qF = new THREE.Quaternion().setFromUnitVectors(Zm, far.sub(cam).normalize()), qN = new THREE.Quaternion().setFromUnitVectors(Zm, near.sub(cam).normalize());
      return new THREE.Vector3(0, 0, -1).applyQuaternion(qF.slerp(qN, w)); };
    { // framing guard: with the aim still on the far field mid-dive, the set sank to the bottom of the frame and the Mushaf rose back
      // up through the caption band (y 1380-1600, ~4-5.2 s). Raise the aim weight just enough that the Mushaf's lowest box corner stays
      // above y 1350 (bisection per path sample), then smooth: the hero now grows in the lower-middle of the frame and rises to the centre.
      const inv = mus.matrixWorld.clone().invert(), lb = new THREE.Box3(), c8 = [], v = new THREE.Vector3(), pc = new THREE.PerspectiveCamera(38, 1080 / 1920, .03, 700);
      mus.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); lb.union(o.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld))); } });
      for (let i = 0; i < 8; i++) c8.push(new THREE.Vector3(i & 1 ? lb.max.x : lb.min.x, i & 2 ? lb.max.y : lb.min.y, i & 4 ? lb.max.z : lb.min.z).applyMatrix4(mus.matrixWorld));
      const lowY = (cam, tau, w) => { pc.position.copy(cam); pc.lookAt(cam.clone().add(R.camDir(cam, tau, w))); pc.fov = R.cFov(tau); pc.updateProjectionMatrix(); pc.updateMatrixWorld();
        let y = -1e9; for (const c of c8) y = Math.max(y, (.5 - .5 * v.copy(c).project(pc).y) * 1920); return y; };
      const cW0 = R.cW, g0 = -2.5, gh = .02, wq = [];
      for (let tau = g0; tau <= 10.5 + 1e-9; tau += gh) { const cam = R.camPos(tau); let lo = THREE.MathUtils.clamp(cW0(tau), 0, 1), hi = 1;
        if (lowY(cam, tau, lo) > 1350) { for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (lowY(cam, tau, m) > 1350) lo = m; else hi = m; } lo = hi; }
        wq.push(lo); }
      R.cW = R.smooth(tau => { const f = THREE.MathUtils.clamp((tau - g0) / gh, 0, wq.length - 1.000001), k = Math.floor(f); return Math.max(cW0(tau), wq[k] + (wq[k + 1] - wq[k]) * (f - k)); }); }
    // ---- re-time the path by its ON-SCREEN motion: optical flow of a fixed grid of view rays at three depths (0.6x, 1x, 2.5x the
    //      book distance) between neighbouring path samples = how fast the whole picture moves (approach, orbit, aim, zoom).
    //      The path is then driven by one smooth speed profile in that unit (wide drift -> eased dive -> soft landing -> slow push),
    //      so perceived speed is smooth everywhere: no launch at a spline knot, no slam-stop on landing, no change of direction.
    //      (A second, content-based measure -- 90th percentile flow of the lamp flames + hero set -- only sizes the motion blur.) ----
    { hero.updateMatrixWorld(true);
      const pc = new THREE.PerspectiveCamera(38, 1080 / 1920, .03, 700); const pts = [];
      items.forEach((it, i) => { if (i % 5 === 0) pts.push(new THREE.Vector3(it.x, it.y + .06, it.z)); });
      for (const l of R.heroLamps) { const p = new THREE.Vector3(); l.userData.flame.getWorldPosition(p); pts.push(p); }
      { const r = U.rng(7); for (let i = 0; i < 160; i++) pts.push(B.clone().add(new THREE.Vector3((r() - .5) * .9, (r() - .5) * .8, (r() - .5) * .9))); } // the set + motes around the book
      const rays = []; for (let iy = 0; iy < 9; iy++) for (let ix = 0; ix < 5; ix++) rays.push([-.9 + 1.8 * ix / 4, -.9 + 1.8 * iy / 8]);
      const n = pts.length, TA = -1, TB = 9, NS = 2500, dT = (TB - TA) / NS; const px = new Float32Array(n), py = new Float32Array(n), pv = new Uint8Array(n);
      const dens = new Float32Array(NS + 1), hi = new Float32Array(NS + 1); const v = new THREE.Vector3(), dd = [], ds = []; const nF = pts.length - 160; let prevW = null, prevT = 0, prevA = 0, prevDist = 1;
      for (let k = 0; k <= NS; k++) { const tau = TA + k * dT; const cam = R.camPos(tau); pc.position.copy(cam); pc.lookAt(cam.clone().add(R.camDir(cam, tau))); pc.fov = R.cFov(tau); pc.updateProjectionMatrix(); pc.updateMatrixWorld();
        if (k > 0) { let sd = 0, c = 0; // rays of the previous pose, re-projected with this pose
          for (const f of [.6, 1, 2.5]) for (const [x, y] of rays) { v.set(x * prevT * pc.aspect, y * prevT, -1).multiplyScalar(f * prevDist).applyMatrix4(prevW).applyMatrix4(pc.matrixWorldInverse);
            if (v.z < -.01) { v.applyMatrix4(pc.projectionMatrix); sd += Math.hypot((v.x - x) * 540, (v.y - y) * 960); c++; } }
          dens[k] = c ? sd / c : dens[k - 1]; }
        prevW = pc.matrixWorld.clone(); prevT = Math.tan(pc.fov * D2R / 2); prevDist = cam.distanceTo(B);
        dd.length = 0; ds.length = 0;
        for (let i = 0; i < n; i++) { v.copy(pts[i]).applyMatrix4(pc.matrixWorldInverse); const front = v.z < -.05; v.applyMatrix4(pc.projectionMatrix);
          const vis = front && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 ? 1 : 0; if (k > 0 && vis && pv[i]) (i < nF ? dd : ds).push(Math.hypot((v.x - px[i]) * 540, (v.y - py[i]) * 960));
          px[i] = v.x; py[i] = v.y; pv[i] = vis; }
        if (k > 0) { const q9 = a => a.length ? a.sort((x, y) => x - y)[Math.floor(a.length * .9)] : 0; hi[k] = Math.max(q9(dd), q9(ds)); } } // flames | set + motes
      dens[0] = dens[1]; hi[0] = hi[1];
      const box = (a, r) => a.map((_, k) => { let s = 0, c = 0; for (let j = Math.max(0, k - r); j <= Math.min(NS, k + r); j++) { s += a[j]; c++; } return s / c; });
      const de = box(Array.from(dens), 6).map(x => Math.max(x, 1e-4)), hv = box(Array.from(hi), 12);
      const Mc = new Float64Array(NS + 1); for (let k = 1; k <= NS; k++) Mc[k] = Mc[k - 1] + .5 * (de[k] + de[k - 1]);
      const Mof = tau => { const f = THREE.MathUtils.clamp((tau - TA) / dT, 0, NS - 1e-6), k = Math.floor(f), u = f - k; return Mc[k] + (Mc[k + 1] - Mc[k]) * u; };
      const tauOf = m => { let lo = 0, hi2 = NS; if (m <= Mc[0]) return TA; if (m >= Mc[NS]) return TB; while (hi2 - lo > 1) { const md = (lo + hi2) >> 1; if (Mc[md] <= m) lo = md; else hi2 = md; } return TA + (lo + (m - Mc[lo]) / Math.max(Mc[lo + 1] - Mc[lo], 1e-9)) * dT; };
      const at = (a, tau) => { const f = THREE.MathUtils.clamp((tau - TA) / dT, 0, NS - 1e-6), k = Math.floor(f), u = f - k; return a[k] + (a[k + 1] - a[k]) * u; };
      // speed profile (px of mean screen motion per second): r0 = original wide-shot drift, r1 = final product push-in
      //  dive bump: symmetric 140 x^3 (1-x)^3 over [ta, tb], keyed on the narration: slow onset as the tally completes on "yakın" (~3.3 s),
      //  accelerating through "mu'cize vermiş", peak in the breath after "vermiş" (~4.6), decelerating onto the Mushaf on "en büyük ve
      //  parlağını" and settled into the slow push just before "Kur'an" (tb)
      const ta = ctx.wordTime('yakın') - .6, tb = ctx.wordTime("kur'an") - .06, T = tb - ta, m0 = Mof(-.5), mE = Mof(8.0);
      const r0 = (Mof(3.3) - m0) / 3.8, r1 = (mE - Mof(5.62)) / 2.38;
      const A = (mE - m0) - (r0 * (ta + .5) + r0 * T + (r1 - r0) * T / 2 + r1 * (8 - tb));
      R.mAt = t => { if (t <= ta) return m0 + r0 * (t + .5); if (t >= tb) return mE + r1 * (t - 8); const x = (t - ta) / T, x4 = x * x * x * x;
        return m0 + r0 * (t + .5) + (r1 - r0) * T * x4 * (x * x - 3 * x + 2.5) + A * x4 * (35 - 84 * x + 70 * x * x - 20 * x * x * x); };
      R.vAt = t => { const x = THREE.MathUtils.clamp((t - ta) / T, 0, 1); return r0 + (r1 - r0) * x * x * x * (x * (x * 6 - 15) + 10) + A / T * 140 * Math.pow(x * (1 - x), 3); };
      R.tauAt = t => tauOf(R.mAt(t));
      R.flamePx = (t, tau) => at(hv, tau) * R.vAt(t) / at(de, tau) / 30; // 90th-percentile flame motion in px per frame
      R.camInfo = { r0, r1, A, m0, mE }; }
  },
  update(t, ctx) {
    const { ui, U, post, camera, renderer } = ctx;
    // ---- camera (re-timed path, see setup) ----
    const tau = R.tauAt(t), D = Math.exp(R.cLD(tau)), B = R.book;
    const cam = R.camPos(tau, U.shake(t, .03 * Math.min(1, D / 6) + .0025, .35, 7));
    camera.position.copy(cam); camera.lookAt(cam.clone().add(R.camDir(cam, tau))); camera.fov = R.cFov(tau); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    // hero-lamp flame cores fade within ~110 px of the frame edge: screen-space bloom / DOF drop an off-screen core in one frame (edge pop);
    // their large glow sprites are real geometry and keep sliding out smoothly
    { const v = new THREE.Vector3(); for (const l of R.heroLamps) { const fl = l.userData.flame; fl.getWorldPosition(v); v.project(camera);
      const e = v.z < 1 ? Math.min((1 - Math.abs(v.x)) * 540, (1 - Math.abs(v.y)) * 960) : -1; fl.material.uniforms.intensity.value = 4 * U.smoothstep(0, 110, e); } }
    // pixel metrics for sprites / stars
    const rh = renderer.getDrawingBufferSize(new THREE.Vector2()).y; const fpx = rh / (2 * Math.tan(camera.fov * D2R / 2));
    R.patch.visible = D < 7; R.dust.visible = D < 8; // fine grain only matters near the hero (avoids far z-fighting)
    const FU = R.field.userData.U; FU.uTime.value = t; FU.uFpx.value = fpx; FU.uVh.value = rh; FU.uMinPx.value = 2.2 * rh / 1920; FU.uCocMax.value = 120 * rh / 1920;
    R.sky.userData.uniforms.starPx.value = 1.6 * (camera.fov * D2R) / rh;
    R.motes.material.uniforms.fpx.value = fpx;

    // ---- the dawn ray: from "en büyük ve parlağını" the first ray finds the Mushaf ----
    const tB = ctx.wordTime('parlağını'), tK = ctx.wordTime("kur'an"), tBu = ctx.wordTime('büyük');
    const g = U.prog(t, tBu - .2, tK + .25, 'inOutSine'), sw = U.prog(t, tB - .45, tK + .45, 'inOutSine');
    R.spot.intensity = 23 * g; R.shaft.userData.uniforms.opacity.value = .1 * g * (1 - .75 * U.smoothstep(Math.log(6.1), Math.log(2.35), Math.log(D))); // the shaft volume thins as the camera closes in
    R.spot.target.position.copy(R.book).add(R.leafUp.clone().multiplyScalar(.03 + .2 * (1 - sw))); R.spot.target.updateMatrixWorld();
    const mu = R.motes.material.uniforms; mu.rayAmt.value = g; mu.base.value = .05 + .04 * g;
    const du = R.dust.material.uniforms; du.rayAmt.value = g * 1.3; du.fpx.value = fpx;
    R.spot.updateMatrixWorld(); du.rayO.value.copy(R.spot.target.position); du.rayD.value.copy(R.spot.position).sub(R.spot.target.position).normalize();
    R.sky.userData.uniforms.sunUp.value = .4 * g; R.sky.userData.uniforms.gain.value = .85; R.sky.userData.uniforms.glow.value = 1 + .25 * U.smoothstep(0, ctx.dur, t);
    ctx.scene.environmentIntensity = .3 + .12 * g;
    const prod = U.smoothstep(Math.log(10.5), Math.log(2.13), Math.log(D)); // 0 wide .. 1 product shot (follows the approach, not the clock)
    for (const m of R.envMats) m.envMapIntensity = .5 + .2 * prod + .25 * g;
    // product-shot fill: the shadow side sees the dawn sky (mauve near sunrise) and the lamp-lit sand / rug around the stand, not a pure navy zenith
    R.hemi.intensity = 2.0 - 1.3 * prod; R.hemi.color.copy(R.hemiSky).lerp(R.hemiSkyP, prod); R.hemi.groundColor.copy(R.hemiGnd).lerp(R.hemiGndP, prod); R.dawnSkyL.intensity = .55 * (1 - prod);
    // perf: lights / passes only while they contribute (switching visibility recompiles once; output identical)
    R.spot.visible = t > tBu - .65; R.dawnSkyL.visible = prod < .995; post.dof.enabled = D < 16; // spot: before g > 0; DOF: before prod > 0 (D < 10.5)
    // lamp practicals flicker
    for (const l of [R.rimLamp, R.fillLamp]) l.intensity = l.userData.base * (l === R.fillLamp ? 1 + 10 * prod : 1) * (1 + .07 * Math.sin(t * 13.1 + l.position.x * 9) + .05 * Math.sin(t * 7.7 + l.position.z * 5));
    post.exposure = 1.18 + .04 * g - .1 * prod;
    post.grade.warmth = .0 + .05 * prod; post.grade.saturation = 1.06 + .02 * prod;
    // DOF: deep in the wide shot, shallow product focus on the cover
    const focus = camera.position.distanceTo(B); post.dof.focus = focus; FU.uFocus.value = focus; FU.uAperture.value = .05 * prod; post.dof.range = THREE.MathUtils.lerp(8, 1.1, prod); post.dof.amount = prod;

    // motion blur only where the glide is fast enough to strobe: sub-frame count from the on-screen speed of the fastest flames
    // (90th percentile, from the path metric) so neighbouring sub-frames stay <= ~3.5 px apart -> continuous streaks, no ladders / doubled dots
    const pxF = R.flamePx(t, tau), mbN = THREE.MathUtils.clamp(Math.ceil(pxF * .5 / 3.5), 1, 12); post.motionBlur = { samples: R.dbg.includes('nomb') ? 1 : mbN, shutter: .5 };
    if (R.dbg.includes('bigray')) { mu.rayR.value = 10; mu.base.value = 1; }
    if (R.dbg.includes('nospot')) { R.spot.intensity = 0; R.shaft.visible = false; } if (R.dbg.includes('noglow')) R.heroLamps.forEach(l => { l.userData.glow.visible = false; });
    if (R.dbg.includes('nodof')) post.dof.enabled = false; if (R.dbg.includes('nobloom')) post.bloom.enabled = false;
    // ---- typography ----
    const tBin = ctx.wordTime('bine'), tMu = ctx.wordTime("mu'cize");
    let lit = 0; { let lo = 0, hi = R.onTimes.length; while (lo < hi) { const m = (lo + hi) >> 1; if (R.onTimes[m] < t - .05) lo = m + 1; else hi = m; } lit = lo + R.nHero; }
    // counter + MU'CİZE leave on "ve" so "en büyüğü ve en parlağı" can land on the spoken "en büyük"
    const tEn = ctx.wordTime('en'), hide = tEn - .06;
    { // counter: the number grows to the right from a fixed '≈' (centred for the final "≈ 1.000"), no sideways jumps on ticks
      const e = ui.env(t, tBin - .2, hide, .45, 'pop'); if (e.o > .001) { const X2 = ui.ctx; X2.save(); X2.font = ui.font(150, 900, 'Nunito'); if ('letterSpacing' in X2) X2.letterSpacing = '0px';
        X2.textAlign = 'left'; X2.textBaseline = 'middle'; const w0 = X2.measureText('≈ 1.000').width; X2.globalAlpha = e.o; X2.translate(540, 400); X2.scale(e.s, e.s);
        X2.shadowColor = 'rgba(10,8,30,.7)'; X2.shadowBlur = 26; X2.shadowOffsetY = 4; X2.fillStyle = '#ffd27a'; X2.fillText('≈ ' + lit.toLocaleString('tr-TR'), -w0 / 2, 0); X2.restore(); } }
    ui.text("MU'CİZE", { t, t0: tMu - .05, t1: hide, x: 540, y: 520, size: 56, weight: 900, color: '#fff4dc', letterSpacing: 12, anim: 'rise', shadowBlur: 20, shadowColor: 'rgba(10,8,30,.75)' });
    ui.text('en büyüğü ve en parlağı', { t, t0: tEn - .04, t1: 99, x: 540, y: 292, size: 54, weight: 800, color: '#fff4dc', anim: 'rise', shadowBlur: 22, shadowColor: 'rgba(30,12,4,.75)' });
    ui.text("KUR'ÂN-I KERÎM", { t, t0: tK - .05, t1: 99, x: 540, y: 388, size: 96, weight: 900, color: '#ffd27a', anim: 'pop', letterSpacing: 4, shadowBlur: 28, shadowColor: 'rgba(40,14,0,.7)' });
    // thin gold rule with a central lozenge under the title
    { const p = U.prog(t, tK + .15, tK + .75, 'outCubic'); if (p > 0) { const X2 = ui.ctx; X2.save(); X2.globalAlpha = p; X2.strokeStyle = '#ffd27a'; X2.fillStyle = '#ffd27a'; X2.lineWidth = 3; X2.shadowColor = 'rgba(40,14,0,.6)'; X2.shadowBlur = 10;
      const wv = 250 * p; X2.beginPath(); X2.moveTo(540 - 26 - wv, 458); X2.lineTo(540 - 26, 458); X2.moveTo(540 + 26, 458); X2.lineTo(540 + 26 + wv, 458); X2.stroke();
      X2.translate(540, 458); X2.rotate(Math.PI / 4); X2.fillRect(-8 * p, -8 * p, 16 * p, 16 * p); X2.restore(); } }
  },
};
