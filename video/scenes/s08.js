// s08 (35.60–42.00) "Resulullah ﷺ'ın arkasına sığındıklarını defalarca ifade etmiş."
// Metaphor (no figures): the battle storm and its arrows slam into a huge, unshakable red-sandstone rock. Arrows hit the
// warm-lit windward face, spark, snap and fall into a growing pile at its foot; the rock does not move. The camera swings
// around its end ("arkasına") into the lee: calm, sunlit, dust settling, and there the Zülfikar stands safe in its shelter.
// Quote card (Lora) on "sığındıklarını"; on "defalarca" a tally mark pulses in sync with sparks flying over the rim.
import * as THREE from 'three';
import * as C from '../engine/lib/extra_C.js';

let R = {};
const STORM = { contrast: 1.14, saturation: 1.08, warmth: 0.06, lift: [0.025, 0.008, 0.012], gain: [1.06, 0.93, 0.83] };
const CALM = { contrast: 1.08, saturation: 1.12, warmth: 0.035, lift: [0.012, 0.008, 0.02], gain: [1.03, 1.0, 0.96] };
export default {
  post: {
    exposure: 1.0,
    bloom: { enabled: true, strength: 0.6, radius: 0.55, threshold: 0.75 },
    grade: { ...STORM },
    vignette: 0.55, grain: 0.04, aberration: 0.0022,
    dof: { enabled: true, focus: 14, range: 14, amount: 0.3 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, FX, renderer } = ctx;
    R = {};
    const sunDir = new THREE.Vector3(.12, .8, .62).normalize(); R.sunDir = sunDir;
    scene.fog = new THREE.FogExp2('#8a4224', .02); R.fogStorm = new THREE.Color('#8a4224'); R.fogCalm = new THREE.Color('#c08058');
    const fogO = { color: '#8a4224', density: .02 };
    const { sky, env } = C.gradSkyAndEnv(renderer, {
      stops: [[-12, '#3a2016'], [0, '#e8a070'], [5, '#d68862'], [14, '#a26a6e'], [28, '#6a5a7e'], [55, '#3e4670']],
      sunDir: sunDir.toArray(), sunColor: '#fff0cc', sunSize: 1.2, sunI: 5, glow: 1, glowColor: '#ffb066', haze: .6, clouds: .35, cloudColor: '#ffcc98', cloudShade: '#8a5a5a',
      storm: .85, stormDir: [-1, 0, -.15], stormColor: '#5a2416',
    });
    scene.add(sky); R.sky = sky; scene.environment = env; scene.environmentIntensity = .5;
    const sun = ENV.sunLight({ color: '#ffc488', intensity: 3.4, pos: sunDir.clone().multiplyScalar(45).toArray(), target: [0, 1.5, 1], size: 13, mapSize: 2048, bias: -.0003, normalBias: .03, radius: 3 });
    scene.add(sun, sun.target); R.sun = sun;
    scene.add(new THREE.HemisphereLight('#d29068', '#5a3020', .55));
    R.flash = new THREE.PointLight('#ffb468', 0, 3, 2); scene.add(R.flash);

    // ground
    const sandMat = M.MAT.sand({ a: '#d29262', b: '#a2683e', repeat: [300 / 2.4, 300 / 2.4] }); sandMat.normalScale.set(.6, .6);
    const ground = M.dunes({ size: 300, seg: 220, height: 2.0, seed: 23, flatCenter: 32, flatAt: [0, 0], material: sandMat });
    scene.add(ground); const gh = (x, z) => ground.userData.heightAt(x, z); R.gh = gh;
    const rg = C.ridge({ width: 1000, depth: 240, height: 80, seed: 5, color: '#8e4c36', top: '#a4624a' }); rg.position.set(-380, -3, 40); rg.rotation.y = Math.PI / 2 + .1; scene.add(rg);

    // THE ROCK: wide red-sandstone butte, long axis along Z, storm comes from -X
    const rock = C.tor({ a: 3.9, b: 3.1, c: 5.6, n: 2.5, cell: 1.8, seed: 4, detail: 84, bury: .9 });
    scene.add(rock); rock.updateMatrixWorld(true); R.rock = rock; const H = rock.userData.height;
    // boulders at its foot + scatter
    const rr = U.rng(31); const items = [];
    [[-4.6, -3.2, .7], [-4.9, 2.0, .5], [-3.6, 6.0, .9], [4.0, -4.6, .8], [4.4, -1.4, .45], [2.6, 6.6, .6], [-2.2, 6.9, .5], [6.6, 5.4, .3], [4.6, 1.0, .28]].forEach(([x, z, s], i) => items.push({ x, z, s: [s, s * .62, s * .85], ry: i * 1.3, variant: i % 3 }));
    for (let i = 0; i < 220; i++) { const a = rr() * 6.28, d = 6.5 + Math.pow(rr(), .8) * 30; const x = Math.cos(a) * d * .8, z = Math.sin(a) * d; if (Math.hypot(x - 5.7, z - 2.6) < 1.4 || Math.hypot(x - 8.5, z - 6) < 2.5) continue; const s = .03 + Math.pow(rr(), 3) * .3; items.push({ x, z, s: [s, s * .6, s * .8], ry: rr() * 6, variant: i % 3 }); }
    items.forEach(it => { it.y = gh(it.x, it.z) + it.s[1] * .15; });
    scene.add(C.scatterRocks(items, { seed: 17, detail: 3, palette: ['#8f5a3a', '#6a3f2a', '#a96f48'] }));

    // the Zülfikar, safe in the lee (same model as s06)
    const SW = [5.7, 2.6]; R.swPos = new THREE.Vector3(SW[0], gh(...SW), SW[1]);
    const sword = C.zulfikar({ hwF: .041, hwG: .033, hiltScale: 1.28, steelRough: .22, bend: .03 }); sword.scale.setScalar(1.12);
    sword.position.set(SW[0], gh(...SW) - .05, SW[1]); sword.rotation.set(-.05, .76, .03); scene.add(sword); sword.updateMatrixWorld(true); R.sword = sword;
    const heap = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.MAT.sand({ a: '#d6985e', b: '#ad6e42', repeat: [2, 1] }));
    heap.scale.set(.2, .03, .14); heap.position.copy(R.swPos).add(new THREE.Vector3(0, -.004, 0)); heap.rotation.y = .76; heap.receiveShadow = true; scene.add(heap);

    // --- arrows vs rock ---
    const tRes = ctx.wordTime('resulullah'), tAl = ctx.wordTime('aleyhis'), tArk = ctx.wordTime('arkasına'), tSig = ctx.wordTime('sığındık'), tDef = ctx.wordTime('defalarca');
    Object.assign(R, { tRes, tAl, tArk, tSig, tDef });
    const ray = new THREE.Raycaster(); const arrows = [], sparks = [], pf = [];
    const ar = U.rng(13); R.hits = [];
    const hit = (t, y, z, pitch, az, sparkN = 14, big = false) => {
      const vL = C.landingVel(Math.PI / 2 + az, pitch, 40); const d = vL.clone().normalize();
      ray.set(new THREE.Vector3(-4, y, z).addScaledVector(d, -40), d); const I = ray.intersectObject(rock, false)[0]; if (!I) return null;
      const n = I.face.normal.clone().transformDirection(rock.matrixWorld);
      arrows.push({ L: I.point.clone(), vL, tL: t, flight: 2.2, mode: 'break', normal: n, ground: gh });
      if (t > -1.2) {
        const refl = d.clone().reflect(n).multiplyScalar(.7).add(n.clone().multiplyScalar(.5)).add(new THREE.Vector3(0, .35, 0)).normalize();
        C.sparkBurst(sparks, { p: I.point.toArray(), dir: refl.toArray(), t0: t, n: sparkN, speed: big ? [3, 9] : [2.5, 7], spread: .6, life: [.18, big ? .75 : .5], w: .012, seed: 100 + arrows.length, color: '#ffd28a', i: 3 });
        pf.push({ p: I.point.clone().addScaledVector(n, .15).toArray(), t0: t, life: 1.2, s0: .15, s1: big ? 1.6 : .9, v: [n.x * .8, .6, n.z * .8], a: .5, color: '#d8a07a' });
        R.hits.push({ t, p: I.point.clone().addScaledVector(n, .4), big });
      }
      return I;
    };
    // the pile: arrows that already broke on the rock before we arrive
    for (let i = 0; i < 46; i++) hit(-6 + ar() * 5.2, .5 + ar() * 3.6, -5.2 + ar() * 10.4, .1 + ar() * .25, (ar() - .5) * .5, 0);
    // visible impacts on the windward face (denser burst on "aleyhissalatü")
    for (let i = 0; i < 34; i++) { const t = -.5 + ar() * 3.3; hit(t, .7 + ar() * 3.4, -5 + ar() * 10.5, .1 + ar() * .25, (ar() - .5) * .5, 12); }
    [[tRes + .02, 2.6, .4], [tRes + .3, 1.6, 2.6]].forEach(([t, y, z]) => hit(t, y, z, .18, .05, 22, true));
    for (let k = 0; k < 9; k++) hit(tAl - .05 + k * .045 + ar() * .03, 1.0 + ar() * 3, -3 + ar() * 7, .12 + ar() * .2, (ar() - .5) * .4, 16, k < 3);
    // impacts high on the rim later (sparks fly over the top -> seen from the lee), pulsing on "defalarca"
    R.rimT = [];
    for (let k = 0; k < 5; k++) { const t = tDef + .05 + k * .24; const zz = 1.2 + (k % 2 ? 1.1 : -0.6) + k * .35; const I = hit(t, H - .55 + (k % 2) * .15, zz, .05, .02, 0); if (I) { R.rimT.push(t); C.sparkBurst(sparks, { p: I.point.toArray(), dir: [.55, 1, .05], t0: t, n: 26, speed: [4, 9], spread: .45, life: [.45, .9], w: .014, seed: 300 + k, color: '#ffd896', i: 3.4 }); } }
    // a few more distant impacts while in the lee (keeps the storm audible/visible over the rim)
    for (let k = 0; k < 10; k++) hit(3 + ar() * 3.6, 2 + ar() * 2.4, -4 + ar() * 9, .12 + ar() * .2, (ar() - .5) * .4, 10);
    // arrows that clear the top and fly on, high over the lee (never landing near the sword)
    for (let i = 0; i < 40; i++) { const t = -.4 + ar() * 7.4; const x = 40 + ar() * 25, z = -8 + ar() * 18; arrows.push({ L: new THREE.Vector3(x, gh(x, z), z), vL: C.landingVel(Math.PI / 2 + (ar() - .5) * .3, .32 + ar() * .15, 44), tL: t + 1.1, flight: 2.6, mode: 'pass', ground: gh }); }
    R.volley = C.arrowVolley(arrows, { seed: 21, arrow: { thick: 1.6 } }); scene.add(R.volley.group);
    R.trails = C.streaks(R.volley.trails({ w: .06, len: 2.4, color: '#ffe8d0', a: .5 }).filter(it => it.t0 > -3), { fadeIn: .02, fadeOut: .97, fog: fogO }); scene.add(R.trails);
    R.sparks = C.streaks(sparks, { gravity: [0, -9.8, 0], shutter: .03, additive: true, cool: '#a02a08', fadeIn: .01, fadeOut: .55 }); scene.add(R.sparks);
    // dust surge slamming into the face on "aleyhissalatü" and boiling up over the top
    for (let i = 0; i < 26; i++) { const z = -6 + ar() * 12, y = .6 + ar() * 3.8; const t = tAl - .25 + ar() * .6; pf.push({ p: [-4.6 - ar() * 1.5, y, z], t0: t, life: 1.6 + ar() * .8, s0: 1.2, s1: 3.6 + ar() * 2, v: [.4, 2.6 + ar() * 1.6, (ar() - .5) * 1.5], a: .42, color: '#b8704a' }); }
    R.puffs = C.puffs(pf, { sunDir: sunDir.toArray(), litMul: 1.4, shadeMul: .75 }); scene.add(R.puffs);

    // storm dust: streams in from -X, lifted over the rock, passes high over the lee; fast sand streaks on the windward side only
    R.storm = C.dustField({ count: 80, center: [-8, 2.6, -3], box: [64, 5.2, 26], size: [2.5, 7], wind: [8, 0, 0], swirl: .5, shade: '#5e2616', lit: '#e88a4c', sunDir: sunDir.toArray(), opacity: .24, nearFade: 3.5, scatter: 1.4, seed: 4, fog: fogO, yMin: 0, flow: [-3.6, H, 5.0, 1] });
    R.sheets = C.dustField({ count: 40, center: [-14, .55, 0], box: [22, .8, 30], size: [1, 2.6], wind: [9, 0, 0], swirl: .2, shade: '#7a3a20', lit: '#e8884a', sunDir: sunDir.toArray(), opacity: .2, nearFade: 2.5, scatter: 1.4, seed: 5, fog: fogO, yMin: 0 });
    scene.add(R.storm, R.sheets);
    const sr = U.rng(8); const sand = [];
    for (let i = 0; i < 240; i++) { const sp = 8 + sr() * 5, life = 18 / sp; const z = -9 + sr() * 18; sand.push({ p: [-23 + sr() * 2, .02 + Math.pow(sr(), 2.2) * .8, z], v: [sp, (sr() - .4) * .3, (sr() - .5) * .4], t0: -sr() * life, life, w: .009 + sr() * .008, len: .3 + sr() * .5, color: '#eca06a', a: .2 + sr() * .2, loop: 1 }); }
    R.sand = C.streaks(sand, { fadeIn: .08, fadeOut: .85, fog: fogO }); scene.add(R.sand);
    // the lee: calm golden motes settling in the sunlight
    R.motes = FX.particles({ count: 140, center: [6.4, 1.3, 3.4], box: [5, 2.6, 5], size: 1.6, color: '#ffe6bc', opacity: .45, drift: [.03, -.04, 0], swirl: .04, twinkle: .3, seed: 9 }); scene.add(R.motes);

    // reflections for the steel from its real surroundings (sword hidden)
    sky.userData.uniforms.sunI.value = 1.6;
    scene.environment = C.envFromScene(renderer, scene, [SW[0], .9, SW[1]], [sword, R.storm, R.sheets, R.sand, R.motes, R.puffs, R.sparks, R.trails]);
    sky.userData.uniforms.sunI.value = 5;

    camera.fov = 38; camera.near = .05; camera.far = 1500; camera.updateProjectionMatrix();
    R.cam = C.camPath([
      [-0.5, [-16.5, 1.7, 8.0], [0, 2.6, 0]],
      [1.4, [-14.2, 2.0, 10.4], [0, 2.5, 1.0]],
      [2.45, [-8.4, 2.7, 13.6], [.6, 2.3, 2.0]],
      [3.0, [0.2, 3.0, 15.2], [3.2, 1.9, 3.2]],
      [3.6, [8.6, 1.35, 9.6], [5.2, 1.55, 2.6]],
      [5.0, [9.2, .78, 6.7], [5.4, 1.6, 2.4]],
      [6.9, [9.0, .62, 6.0], [5.4, 1.66, 2.4]],
    ]);
    R.P = new THREE.Vector3(); R.L = new THREE.Vector3();
  },
  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    R.volley.update(t);
    // camera
    R.cam.at(t, R.P, R.L);
    const calm = U.smoothstep(2.5, 3.6, t);
    const sh = U.shake(t, U.lerp(.03, .006, calm), U.lerp(1.2, .5, calm), 5);
    // jolts on the big impacts (the camera flinches; the rock never moves)
    let jolt = 0; for (const h of R.hits) { if (h.big && t > h.t) jolt += Math.exp(-(t - h.t) * 9) * Math.sin((t - h.t) * 50) * (1 - calm); }
    camera.position.copy(R.P).add(sh); camera.position.y = Math.max(camera.position.y, R.gh(camera.position.x, camera.position.z) + .45) + jolt * .03;
    camera.lookAt(R.L); camera.rotateZ(U.lerp(-.035, .01, calm) + sh.x * .3); camera.updateMatrixWorld(true);
    // spark flash light follows the latest impact in view
    let fi = 0, fp = null; for (const h of R.hits) { const a = t - h.t; if (a >= 0 && a < .3) { const v = Math.exp(-a * 14) * (h.big ? 1.6 : .8); if (v > fi) { fi = v; fp = h.p; } } }
    if (fp) R.flash.position.copy(fp); R.flash.intensity = 1.2 * fi * (1 - calm * .7);
    // grade / atmosphere: storm side -> calm, sunlit lee
    for (const k of ['contrast', 'saturation', 'warmth']) post.grade[k] = U.lerp(STORM[k], CALM[k], calm);
    post.grade.lift = STORM.lift.map((v, i) => U.lerp(v, CALM.lift[i], calm)); post.grade.gain = STORM.gain.map((v, i) => U.lerp(v, CALM.gain[i], calm));
    ctx.scene.fog.density = U.lerp(.02, .009, calm); ctx.scene.fog.color.copy(R.fogStorm).lerp(R.fogCalm, calm);
    post.vignette = U.lerp(.55, .45, calm);
    const fd = camera.position.distanceTo(calm > .5 ? R.swPos.clone().setY(R.swPos.y + .6) : R.L);
    post.dof.focus = fd; post.dof.range = U.lerp(14, 3.2, calm); post.dof.amount = U.lerp(.25, .5, calm);
    R.motes.material.uniforms.master.value = calm;

    // --- typography ---
    const X = ui.ctx; const sc = U.smoothstep(R.tSig - .4, R.tSig + .2, t); if (sc > 0) { const gr = X.createLinearGradient(0, 160, 0, 900); gr.addColorStop(0, `rgba(24,10,10,${.42 * sc})`); gr.addColorStop(1, 'rgba(24,10,10,0)'); X.save(); X.fillStyle = gr; X.fillRect(0, 0, 1080, 900); X.restore(); }
    ui.quote('Savaş kızıştığında biz Resûlullah\'a (a.s.m.) sığınırdık.', 'Hz. Ali (r.a.)', { t, t0: R.tSig - .02, x: 540, y: 470, w: 900, size: 50, typeDur: 1.35 });
    // "defalarca": pill + tally marks that pulse with each spark burst over the rim
    const e = ui.env(t, R.tDef - .05, Infinity, .4, 'pop');
    if (e.o > 0.01) {
      X.save(); X.globalAlpha = e.o; X.translate(540, 745); X.scale(e.s, e.s);
      X.font = '800 44px "Nunito"'; X.textAlign = 'left'; X.textBaseline = 'middle';
      const tw = X.measureText('defalarca').width, n = R.rimT.length, gap = 22, tallyW = n * gap; const W = tw + 34 + tallyW + 60, Hh = 76;
      X.fillStyle = 'rgba(20,12,16,.66)'; X.shadowColor = 'rgba(0,0,0,.35)'; X.shadowBlur = 20; ui.rrect(-W / 2, -Hh / 2, W, Hh, Hh / 2); X.fill(); X.shadowColor = 'transparent';
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
