// s08 (35.60–42.00) "Resulullah ﷺ'ın arkasına sığındıklarını defalarca ifade etmiş."
// Metaphor (no figures): the battle storm and its arrows slam into a huge, unshakable layered red-sandstone massif. Arrows hit
// the warmly side-lit windward face — sparks, rock chips, dust bursts — snap and fall into a pile at its foot; the rock does
// not move. On "arkasına" the camera whips around its end into the lee: calm, golden back-light, dust settling, and there the
// Zülfikar stands safe in its shelter. Quote card (Lora) on "sığındıklarını"; on "defalarca" a tally ticks each time another
// volley sails harmlessly high over the shelter.
import * as THREE from 'three';
import * as C from '../engine/lib/extra_C.js';

let R = {};
globalThis.__dbg08 = 1;
const STORM = { contrast: 1.12, saturation: 1.06, warmth: 0.06, lift: [0.025, 0.01, 0.012], gain: [1.06, 0.93, 0.83] };
const CALM = { contrast: 1.08, saturation: 1.02, warmth: 0.04, lift: [0.02, 0.016, 0.026], gain: [1.06, 1.03, 0.9] };
export default {
  post: {
    exposure: 1.0,
    bloom: { enabled: true, strength: 0.55, radius: 0.55, threshold: 0.78 },
    grade: { ...STORM },
    vignette: 0.55, grain: 0.04, aberration: 0.0018,
    dof: { enabled: true, focus: 14, range: 14, amount: 0.3 },
    motionBlur: { samples: 3, shutter: 0.5 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, FX, renderer } = ctx;
    R = {};
    // low golden sun from the far side of the storm's flank: rakes the windward (-X) face, lights the lee sand, back-lights the lee view
    const sunDir = new THREE.Vector3(-.42, .3, .86).normalize(); R.sunDir = sunDir;
    scene.fog = new THREE.FogExp2('#8a4426', .016); R.fogStorm = new THREE.Color('#8a4426'); R.fogCalm = new THREE.Color('#e0a878');
    const fogO = { color: '#8a4426', density: .016 };
    const { sky, env } = C.gradSkyAndEnv(renderer, {
      stops: [[-12, '#3a2016'], [0, '#f0a872'], [4, '#e09066'], [12, '#b07068'], [26, '#6e5a7c'], [55, '#3e4670']],
      sunDir: sunDir.toArray(), sunColor: '#fff0cc', sunSize: 1.3, sunI: 5, glow: 1.1, glowColor: '#ffb066', haze: .7, clouds: .35, cloudColor: '#ffcc98', cloudShade: '#8a5a5a',
      storm: .8, stormDir: [.75, 0, .2], stormColor: '#5a2416',
    });
    scene.add(sky); R.sky = sky; scene.environment = env; scene.environmentIntensity = .5;
    const sun = ENV.sunLight({ color: '#ffc488', intensity: 3.6, pos: sunDir.clone().multiplyScalar(60).toArray(), target: [2, 2, 0], size: 18, mapSize: 2048, bias: -.0003, normalBias: .03, radius: 3 });
    scene.add(sun, sun.target); R.sun = sun; R.sunA = new THREE.Color('#ffbb7a'); R.sunB = new THREE.Color('#ffd9a8');
    R.hemi = new THREE.HemisphereLight('#c88a6a', '#5a3020', .6); scene.add(R.hemi); R.hemiA = new THREE.Color('#c88a6a'); R.hemiB = new THREE.Color('#e6b494');
    R.flash = new THREE.PointLight('#ffb468', 0, 5, 2); scene.add(R.flash);
    R.bounce = new THREE.DirectionalLight('#ffb27a', 0); R.bounce.position.set(1, .35, .25); scene.add(R.bounce);   // sunlit sand bouncing warm light onto the shaded lee wall

    // ground + far ridges on two horizons
    const sandMat = M.MAT.sand({ a: '#dca674', b: '#b07a4c', repeat: [300 / 2.4, 300 / 2.4] }); sandMat.normalScale.set(.6, .6);
    const ground = M.dunes({ size: 300, seg: 220, height: 2.0, seed: 23, flatCenter: 46, flatAt: [0, 0], material: sandMat });
    scene.add(ground); const gh = (x, z) => ground.userData.heightAt(x, z); R.gh = gh;
    const rgA = C.ridge({ width: 1000, depth: 240, height: 70, seed: 5, color: '#8e4c36', top: '#a4624a' }); rgA.position.set(430, -3, 0); rgA.rotation.y = -Math.PI / 2; scene.add(rgA);
    const rgB = C.ridge({ width: 1000, depth: 240, height: 55, seed: 9, color: '#9a5a40', top: '#b4745a' }); rgB.position.set(-60, -3, 460); rgB.rotation.y = Math.PI; scene.add(rgB);

    // THE ROCK: wide layered red-sandstone massif, long axis along Z; the storm comes from -X
    const rock = C.sandstoneMassif({ a: 7, c: 10, n: 4, layers: 11, height: 8.6, bury: .6, seed: 11, fissures: 16, bevelT: .03, bevelS: .028, steps: 6, lip: 0, rough: .11, thinBeds: true, softK: 1.8 });
    scene.add(rock); rock.updateMatrixWorld(true); R.rock = rock; const H = rock.userData.height; const R0 = rock.userData.R0;
    const SW = [9.45, 4.4]; R.swPos = new THREE.Vector3(SW[0], gh(...SW), SW[1]);
    const CAM_LEE = new THREE.Vector3(14.95, 1.1, 2.1);
    // fallen blocks + boulders + scree at its foot (clear of the sword, the lee camera and the camera's arc), far scatter
    const rr = U.rng(31); const items = [];
    const clear = (x, z) => Math.hypot(x - SW[0], z - SW[1]) < 1.7 || (x > 9 && x < 17 && z > -9 && z < 3.6) || (z < -11 && x > -12 && x < 12) || (x < -12 && z < -8);
    for (let i = 0; i < 26; i++) { const t = rr() * Math.PI * 2, d = R0(t) + .3 + Math.pow(rr(), 1.5) * 2.8; const x = Math.cos(t) * d, z = Math.sin(t) * d; if (clear(x, z)) continue; const s = .4 + Math.pow(rr(), 1.6) * 1.1; items.push({ x, z, s: [s * (1 + rr() * .4), s * .7, s], ry: rr() * 6, rz: (rr() - .5) * .3, variant: i % 2 }); }
    for (let i = 0; i < 360; i++) { const t = rr() * Math.PI * 2, d = R0(t) + .1 + Math.pow(rr(), 2) * 4; const x = Math.cos(t) * d, z = Math.sin(t) * d; if (clear(x, z)) continue; const s = .035 + Math.pow(rr(), 2.5) * .15; items.push({ x, z, s: [s, s * .6, s * .8], ry: rr() * 6, variant: i % 3 }); }
    for (let i = 0; i < 220; i++) { const a = rr() * 6.28, d = 13 + Math.pow(rr(), .8) * 32; const x = Math.cos(a) * d * .85, z = Math.sin(a) * d; if (clear(x, z)) continue; const s = .03 + Math.pow(rr(), 3) * .3; items.push({ x, z, s: [s, s * .6, s * .8], ry: rr() * 6, variant: i % 3 }); }
    items.forEach(it => { it.y = gh(it.x, it.z) + it.s[1] * .05; });
    const bm = C.sandstoneMaterial({ nScale: .8 }); bm.color.set('#e2c4b0');
    scene.add(C.scatterRocks(items, { seed: 17, detail: 3, palette: ['#9a5a3c', '#7a4430', '#b06c48'], big: .3, material: C.sandstoneMaterial({ nScale: .7 }), boulderMat: bm, boulderOpts: [{ n: 3.5, planes: 16, jitter: .45, off: [-.22, 0], k: .03, a: 1.1, b: .75, c: 1, grain: .16 }, { n: 4.5, planes: 12, jitter: .3, off: [-.15, 0], k: .025, a: 1.25, b: .6, c: 1, grain: .16 }] }));

    // the Zülfikar, safe in the lee (same model as s06), flat turned a little off the lee camera
    const camDir = new THREE.Vector3(CAM_LEE.x - SW[0], 0, CAM_LEE.z - SW[1]).normalize(); const ry = Math.atan2(camDir.x, camDir.z) - .38;
    const sword = C.zulfikar2({ hiltScale: 1.12, steelRough: .3, envI: 1.25, goldEnvI: 1.8, goldEnv: env, dirSpec: .55, steelColor: '#e6e9ec' }); sword.scale.setScalar(1.12);
    sword.position.set(SW[0], gh(...SW) - .035, SW[1]); sword.rotation.set(0, ry, .028); scene.add(sword); sword.updateMatrixWorld(true); R.sword = sword;

    // --- arrows vs rock ---
    const tRes = ctx.wordTime('resulullah'), tAl = ctx.wordTime('aleyhis'), tArk = ctx.wordTime('arkasına'), tSig = ctx.wordTime('sığındık'), tDef = ctx.wordTime('defalarca');
    Object.assign(R, { tRes, tAl, tArk, tSig, tDef });
    const ray = new THREE.Raycaster(); const arrows = [], sparks = [], pf = [], chips = [];
    const ar = U.rng(13); R.hits = [];
    const hit = (t, y, z, pitch, az, sparkN = 14, big = false) => {
      const vL = C.landingVel(Math.PI / 2 + az, pitch, 42); const d = vL.clone().normalize();
      ray.set(new THREE.Vector3(-4, y, z).addScaledVector(d, -60), d); const I = ray.intersectObject(rock, true)[0]; if (!I) return null;
      const n = I.face.normal.clone().transformDirection(I.object.matrixWorld);
      arrows.push({ L: I.point.clone(), vL, tL: t, flight: 2.2, mode: 'break', normal: n, ground: gh });
      if (t > -1.2 && sparkN > 0) {
        const refl = d.clone().reflect(n).multiplyScalar(.7).add(n.clone().multiplyScalar(.5)).add(new THREE.Vector3(0, .35, 0)).normalize();
        C.sparkBurst(sparks, { p: I.point.toArray(), dir: refl.toArray(), t0: t, n: sparkN, speed: big ? [4, 12] : [3, 8], spread: .65, life: [.2, big ? .85 : .55], w: big ? .026 : .018, seed: 100 + arrows.length, color: '#ffd28a', i: big ? 5 : 3.5 });
        pf.push({ p: I.point.clone().addScaledVector(n, .2).toArray(), t0: t, life: big ? 1.6 : 1.1, s0: .2, s1: big ? 2.2 : 1.0, v: [n.x * 1.2, .7, n.z * 1.2], a: big ? .5 : .32, color: '#e0a87c' });
        const nc = big ? 9 : 3; const cr = U.rng(500 + arrows.length);
        for (let k = 0; k < nc; k++) { const v = refl.clone().multiplyScalar(2 + cr() * (big ? 5 : 3)).add(new THREE.Vector3((cr() - .5) * 2, cr() * 2, (cr() - .5) * 2)); chips.push({ p: I.point.clone().addScaledVector(n, .05).toArray(), v: v.toArray(), t0: t, s: (big ? .05 : .03) + cr() * (big ? .07 : .035), spin: [cr() - .5, cr() - .5, cr() - .5], w: 10 + cr() * 20 }); }
        R.hits.push({ t, p: I.point.clone().addScaledVector(n, .6), big });
      }
      return I;
    };
    // arrows that fell short and stuck in the sand of the windward approach (scale + battle context in the foreground)
    for (let i = 0; i < 70; i++) { const x = -26 + ar() * 17, z = -16 + ar() * 22; if (Math.hypot(x + 23, z + 15.5) < 2.2 || Math.hypot(x + 16.5, z + 14.2) < 2) continue; arrows.push({ L: new THREE.Vector3(x, gh(x, z), z), vL: C.landingVel(Math.PI / 2 + (ar() - .5) * .5, .5 + ar() * .5, 40), tL: -5 - ar(), flight: 2.4, mode: 'stick', embed: .1 + ar() * .14, ground: gh }); }
    // the pile: arrows that already broke on the rock before we arrive
    for (let i = 0; i < 60; i++) hit(-6 + ar() * 5.2, .5 + ar() * 5, -8 + ar() * 16, .1 + ar() * .25, (ar() - .5) * .5, 0);
    // a steady hail on the face, a heavy strike on "Resulullah", a dense burst on "aleyhissalatü"
    for (let i = 0; i < 40; i++) { const t = -.5 + ar() * 3.2; hit(t, .8 + ar() * 6, -7 + ar() * 13, .1 + ar() * .25, (ar() - .5) * .5, 14); }
    [[tRes + .02, 3.4, -1.0], [tRes + .3, 2.0, 1.8], [tRes + .62, 4.6, -3.2]].forEach(([t, y, z]) => hit(t, y, z, .18, .05, 30, true));
    for (let k = 0; k < 11; k++) hit(tAl - .05 + k * .05 + ar() * .03, 1.0 + ar() * 5, -5 + ar() * 9, .12 + ar() * .2, (ar() - .5) * .4, 20, k < 4);
    // "defalarca": every further strike on the far side shakes a little sand loose — it trickles down the calm lee face behind
    // the sword (the rock itself never moves); the tally ticks with each one
    R.rimT = []; const grains = [];
    for (let k = 0; k < 5; k++) { const tk = tDef + .05 + k * .24; R.rimT.push(tk);
      const zz = [5.6, 3.1, 6.6, 2.2, 4.4][k], yy = [3.9, 4.4, 3.4, 4.1, 3.6][k];
      ray.set(new THREE.Vector3(16, yy, zz), new THREE.Vector3(-1, 0, 0)); const I = ray.intersectObject(rock, true)[0]; if (!I) continue;
      const p = I.point.clone().add(new THREE.Vector3(.06, 0, 0)); const gr = U.rng(700 + k);
      for (let j = 0; j < 46; j++) grains.push({ p: [p.x + gr() * .05, p.y - gr() * .06, p.z + (gr() - .5) * .35], v: [.25 + gr() * .55, -gr() * .4, (gr() - .5) * .2], t0: tk + .04 + gr() * .3, life: .75 + gr() * .3, w: .006 + gr() * .006, len: -1, color: gr() < .5 ? '#f2c08a' : '#d89a68', a: .75, drag: .4 });
      pf.push({ p: p.toArray(), t0: tk + .02, life: 1.3, s0: .15, s1: .8, v: [.5, -.25, 0], a: .32, color: '#e8b488' });
      pf.push({ p: [p.x + .5, gh(p.x + .5, p.z) + .15, p.z], t0: tk + .75, life: 1.2, s0: .15, s1: .7, v: [.4, .15, 0], a: .25, color: '#e0aa80' }); }
    // plus a thinner stream over the top through the storm part
    for (let i = 0; i < 46; i++) { const t = -.4 + ar() * 7.2; const x = 40 + ar() * 25, z = -10 + ar() * 22; arrows.push({ L: new THREE.Vector3(x, gh(x, z), z), vL: C.landingVel(Math.PI / 2 + (ar() - .5) * .3, .3 + ar() * .15, 46), tL: t + 1.1, flight: 2.6, mode: 'pass', ground: gh }); }
    R.volley = C.arrowVolley(arrows, { seed: 21, arrow: { thick: 1.5, fletch: '#8a7058', fletch2: '#3e2c20' } }); scene.add(R.volley.group);
    R.trails = C.streaks(R.volley.trails({ w: .05, len: 2.4, color: '#ffe8d0', a: .4 }).filter(it => it.t0 > -3), { fadeIn: .02, fadeOut: .97, fog: fogO }); scene.add(R.trails);
    R.sparks = C.streaks(sparks, { gravity: [0, -9.8, 0], shutter: .035, additive: true, cool: '#a02a08', fadeIn: .01, fadeOut: .55 }); scene.add(R.sparks);
    R.grains = C.streaks(grains, { gravity: [0, -9.8, 0], shutter: .03, fadeIn: .05, fadeOut: .8 }); scene.add(R.grains);
    R.chips = C.debris(chips, { ground: gh, palette: ['#c47a4e', '#a85c3a', '#dba274'], seed: 9 }); scene.add(R.chips.mesh);
    // dust surge slamming into the face on "aleyhissalatü" and boiling up over the top
    for (let i = 0; i < 34; i++) { const z = -8 + ar() * 16, y = .6 + ar() * 6; const t = tAl - .3 + ar() * .7; pf.push({ p: [-7.6 - ar() * 3, y, z], t0: t, life: 1.6 + ar() * .8, s0: 1.6, s1: 5 + ar() * 3, v: [.4, 3.2 + ar() * 2, (ar() - .5) * 1.5], a: .45, color: '#e2a878' }); }
    R.puffs = C.puffs(pf, { sunDir: sunDir.toArray(), litMul: 1.25, shadeMul: .72 }); scene.add(R.puffs);

    // storm dust: streams in from -X, lifted over the rock; ground sheets + sand on the windward side; a high dust river over the lee
    R.storm = C.dustField({ count: 100, center: [-14, 3.6, 0], box: [60, 7.5, 40], size: [3, 8], wind: [8, 0, 0], swirl: .5, shade: '#6a2c18', lit: '#f6a060', sunDir: sunDir.toArray(), opacity: .3, nearFade: 4, scatter: 1.4, seed: 4, fog: fogO, yMin: 0, flow: [-7, H, 10, 1] });
    R.sheets = C.dustField({ count: 44, center: [-19, .6, 0], box: [26, .9, 40], size: [1.2, 3], wind: [9, 0, 0], swirl: .2, shade: '#7a3a20', lit: '#ee9050', sunDir: sunDir.toArray(), opacity: .22, nearFade: 3, scatter: 1.4, seed: 5, fog: fogO, yMin: 0 });
    R.highStream = C.dustField({ count: 40, center: [16, 10.5, 24], box: [70, 5, 18], size: [5, 11], wind: [10, 0, 0], swirl: .5, shade: '#9a5a3a', lit: '#ffc890', sunDir: sunDir.toArray(), opacity: .2, nearFade: 6, scatter: 1.6, seed: 6, yMin: 0 });
    scene.add(R.storm, R.sheets, R.highStream);
    R.drift = C.sandDrift({ center: [-16, 0, 0], size: [26, 44], layers: [[.01, 1, 1], [.04, .7, 1.2], [.11, .35, 1.4]], wind: [1, .03], speed: 8, opacity: .5, density: .5, lit: '#f6aa6a', shade: '#7a3a1e', sunDir: sunDir.toArray(), scatter: 1.2, nearFade: 3, farFade: 30, fog: fogO }); scene.add(R.drift);
    // the lee: calm golden motes in the sun + a soft settling haze
    R.motes = FX.particles({ count: 260, center: [11.2, 1.4, 4.0], box: [7, 2.8, 8], size: 1.7, color: '#ffe6bc', opacity: .7, drift: [.025, -.035, 0], swirl: .04, twinkle: .35, seed: 9 }); scene.add(R.motes);
    R.shafts = []; [[7.9, .1, 6.2, .5, 1.6, .16], [8.4, .1, 2.6, .45, 1.4, .14], [8.1, .2, -.6, .4, 1.2, .12], [11.4, .1, 6.9, .45, 1.3, .08]].forEach(([x, y, z, r0, r1, op]) => {
      const to = new THREE.Vector3(x, y, z), from = to.clone().addScaledVector(sunDir, 16); const sh = FX.lightShaft({ from: from.toArray(), to: to.toArray(), r0, r1, color: '#ffcf8e', opacity: op }); sh.userData.op = op; scene.add(sh); R.shafts.push(sh); });
    R.haze = C.dustField({ count: 16, center: [11, .9, 10], box: [16, 1.4, 14], size: [2.5, 5], wind: [.15, .02, 0], swirl: .2, shade: '#c88a5e', lit: '#ffe0b0', sunDir: sunDir.toArray(), opacity: .12, nearFade: 3, scatter: 2, seed: 8, yMin: 0 }); scene.add(R.haze);

    // reflections for the steel from its real surroundings (sword hidden) + the sunlit sand behind the camera as a reflector card
    const nrm = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry)); const rf = nrm.clone().multiplyScalar(2 * nrm.dot(camDir)).sub(camDir).normalize();
    const card = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.6), new THREE.MeshBasicMaterial({ color: '#ffd0a0', fog: false, side: THREE.DoubleSide }));
    card.position.set(SW[0] + rf.x * 5.5, 1.0, SW[1] + rf.z * 5.5); card.lookAt(SW[0], .7, SW[1]); scene.add(card);
    sky.userData.uniforms.sunI.value = 1.4; const fd0 = scene.fog.density; scene.fog.density = .005; scene.fog.color.copy(R.fogCalm);
    scene.environment = C.envFromScene(renderer, scene, [SW[0], .8, SW[1]], [sword, R.storm, R.sheets, R.highStream, R.drift, R.motes, R.haze, R.puffs, R.sparks, R.trails, R.volley.group, R.chips.mesh, R.grains, ...R.shafts]); sword.userData.steel.envMap = scene.environment; sword.userData.steel.needsUpdate = true;
    scene.fog.density = fd0; scene.fog.color.copy(R.fogStorm); sky.userData.uniforms.sunI.value = 5; scene.remove(card);

    { const rc = new THREE.Raycaster(R.swPos.clone().add(new THREE.Vector3(0, .8, 0)), sunDir.clone()); const hits = rc.intersectObjects(scene.children, true).filter(h => h.object.castShadow && h.object !== sword && !sword.children.includes(h.object)); console.warn('DBG8 sword shadow test:', hits.length ? hits[0].object.type + ' d=' + hits[0].distance.toFixed(2) : 'LIT'); }
    camera.fov = 36; camera.near = .05; camera.far = 1500; camera.updateProjectionMatrix();
    // windward (low, -Z flank, face raked by the sun) -> push -> whip around the -Z end ("arkasına") -> settle in the lee looking up-sun
    R.cam = C.camPath([
      [-0.5, [-30, 1.5, -19], [-6, 4.4, -1]],
      [1.0, [-23, 1.7, -15.5], [-7, 3.9, -.6]],
      [1.95, [-16.5, 2.1, -14.2], [-6.6, 3.3, -2.6]],
      [2.6, [-6, 3.2, -23], [3, 3.4, -8]],
      [3.25, [9, 2.3, -11.5], [10.6, 1.4, 3]],
      [4.15, [14.95, 1.7, 2.1], [9.55, .72, 4.62]],
      [6.9, [14.6, 1.6, 2.5], [9.55, .72, 4.62]],
    ]);
    R.P = new THREE.Vector3(); R.L = new THREE.Vector3();
  },
  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    R.volley.update(t); R.chips.update(t);
    const calm = U.smoothstep(2.75, 3.75, t);
    // motion blur only while arrows strike and the camera whips; the calm lee renders single-sample
    post.motionBlur = { samples: t < 3.7 ? 3 : 1, shutter: .5 };
    // camera
    R.cam.at(t, R.P, R.L);
    const sh = U.shake(t, U.lerp(.035, .006, calm), U.lerp(1.2, .45, calm), 5);
    // jolts on the big impacts (the camera flinches; the rock never moves)
    let jolt = 0; for (const h of R.hits) { if (h.big && t > h.t) jolt += Math.exp(-(t - h.t) * 9) * Math.sin((t - h.t) * 50) * (1 - calm); }
    camera.position.copy(R.P).add(sh); camera.position.y = Math.max(camera.position.y, R.gh(camera.position.x, camera.position.z) + .5) + jolt * .04;
    camera.fov = U.lerp(36, 33.5, calm); camera.updateProjectionMatrix(); camera.lookAt(R.L); camera.rotateZ(U.lerp(-.03, .008, calm) + sh.x * .3); camera.updateMatrixWorld(true);
    // spark flash light follows the latest impact
    let fi = 0, fp = null; for (const h of R.hits) { const a = t - h.t; if (a >= 0 && a < .3) { const v = Math.exp(-a * 12) * (h.big ? 2.4 : 1.1); if (v > fi) { fi = v; fp = h.p; } } }
    if (fp) R.flash.position.copy(fp); R.flash.intensity = 2.2 * fi * (1 - calm);
    // grade / atmosphere: storm side -> calm, sunlit lee
    for (const k of ['contrast', 'saturation', 'warmth']) post.grade[k] = U.lerp(STORM[k], CALM[k], calm);
    post.grade.lift = STORM.lift.map((v, i) => U.lerp(v, CALM.lift[i], calm)); post.grade.gain = STORM.gain.map((v, i) => U.lerp(v, CALM.gain[i], calm));
    ctx.scene.fog.density = U.lerp(.016, .0075, calm); ctx.scene.fog.color.copy(R.fogStorm).lerp(R.fogCalm, calm);
    R.hemi.color.copy(R.hemiA).lerp(R.hemiB, calm); R.hemi.intensity = U.lerp(.6, .55, calm); R.sun.intensity = U.lerp(3.4, 4.2, calm); R.sun.color.copy(R.sunA).lerp(R.sunB, calm);
    R.sky.userData.uniforms.dark.value = .4 * (1 - calm); R.bounce.intensity = 1.1 * calm; R.sky.userData.uniforms.storm.value = U.lerp(.8, .25, calm);
    post.vignette = U.lerp(.55, .42, calm); post.exposure = 1 + .15 * calm;
    const fd = camera.position.distanceTo(calm > .5 ? R.swPos.clone().setY(R.swPos.y + .62) : R.L);
    post.dof.focus = fd; post.dof.range = U.lerp(14, 7, calm); post.dof.amount = U.lerp(.25, .34, calm);
    R.motes.material.uniforms.master.value = U.smoothstep(2.9, 3.8, t); R.shafts.forEach((sh, i) => { sh.userData.uniforms.opacity.value = sh.userData.op * calm * (.85 + .15 * Math.sin(t * .9 + i * 1.7)); }); R.haze.userData.uniforms.master.value = calm;
    R.drift.userData.uniforms.master.value = 1 - calm; R.sheets.userData.uniforms.master.value = 1 - calm * .8;

    if (globalThis.__dbg08 && t > 4) { const P = v => ui.project(v).map(q => q.toFixed(0)).join(','); const sp = R.swPos; console.warn('DBG8', t.toFixed(2), 'swTop', P(sp.clone().add(new THREE.Vector3(0, 1.25, 0))), 'swBase', P(sp), 'rockEnd', P(new THREE.Vector3(2, 7, 10)), 'rockEdge', P(new THREE.Vector3(6.5, 8, 5)), 'sun', P(camera.position.clone().addScaledVector(R.sunDir, 100))); }
    // --- typography ---
    const X = ui.ctx; const sc = U.smoothstep(R.tSig - .4, R.tSig + .2, t); if (sc > 0) { const gr = X.createLinearGradient(0, 160, 0, 900); gr.addColorStop(0, `rgba(24,10,10,${.4 * sc})`); gr.addColorStop(1, 'rgba(24,10,10,0)'); X.save(); X.fillStyle = gr; X.fillRect(0, 0, 1080, 900); X.restore(); }
    ui.quote('Savaş kızıştığında biz\nResûlullah\'a (a.s.m.) sığınırdık.', 'Hz. Ali (r.a.)', { t, t0: R.tSig - .02, x: 540, y: 440, w: 880, size: 50, typeDur: 1.35 });
    // "defalarca": pill + tally marks that tick as each volley passes overhead
    const e = ui.env(t, R.tDef - .05, Infinity, .4, 'pop');
    if (e.o > 0.01) {
      X.save(); X.globalAlpha = e.o; X.translate(300, 690); X.scale(e.s, e.s);
      X.font = '800 44px "Nunito"'; X.textAlign = 'left'; X.textBaseline = 'middle';
      const tw = X.measureText('defalarca').width, n = R.rimT.length, gap = 22, tallyW = n * gap; const W = tw + 34 + tallyW + 60, Hh = 76;
      X.fillStyle = 'rgba(20,12,16,.68)'; X.shadowColor = 'rgba(0,0,0,.35)'; X.shadowBlur = 20; ui.rrect(-W / 2, -Hh / 2, W, Hh, Hh / 2); X.fill(); X.shadowColor = 'transparent';
      X.fillStyle = '#fff4dc'; X.fillText('defalarca', -W / 2 + 30, 2);
      R.rimT.forEach((rt, k) => {
        const a = U.clamp((t - rt) / .15); if (a <= 0) return; const x = -W / 2 + 30 + tw + 30 + k * gap; const pulse = Math.exp(-Math.max(0, t - rt) * 6);
        X.strokeStyle = '#ffd27a'; X.lineWidth = 6; X.lineCap = 'round'; X.beginPath(); X.moveTo(x, 18 - 36 * a); X.lineTo(x, 18); X.stroke();
        if (pulse > .02) { X.globalAlpha = e.o * pulse; X.lineWidth = 3; X.beginPath(); X.arc(x, 0, 14 + 30 * (1 - pulse), 0, Math.PI * 2); X.stroke(); X.globalAlpha = e.o; }
      });
      X.restore();
    }
  },
};
