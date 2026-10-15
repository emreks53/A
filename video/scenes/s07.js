// s07 (33.30–35.60) "savaşın şiddetli anlarında"
// Intense: the same rocky plain swallowed by a red battle dust-storm under the Uhud-like ridge. No people — only arrows
// raining in volleys (streaking, thudding into the sand with dust puffs), spears and round leather shields on the ground,
// sparks when iron meets iron/stone. Fast low hand-held dolly, roll, shake; darker red-orange grade.
// Beats: "savaşın" → first volley arrives + "savaşın" · "şiddetli" → an arrow slams into the iron boss of a shield right in
// front of camera (sparks, shield jolts, camera jolt, punch-in) + "ŞİDDETLİ" · "anlarında" → a dense second volley darkens the sky.
import * as THREE from 'three';
import * as C from '../engine/lib/extra_C.js';

let R = {};
export default {
  post: {
    exposure: 1.0,
    bloom: { enabled: true, strength: 0.75, radius: 0.55, threshold: 0.72 },
    grade: { contrast: 1.14, saturation: 1.08, warmth: 0.05, lift: [0.02, 0.006, 0.018], gain: [1.06, 0.94, 0.84] },
    vignette: 0.62, grain: 0.05, aberration: 0.003,
    dof: { enabled: true, focus: 5, range: 6, amount: 0.35 },
    motionBlur: { samples: 4, shutter: 0.5 },   // arrows + fast hand-held camera would strobe without it
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, renderer } = ctx;
    R = {};
    const sunDir = new THREE.Vector3(-.42, .1, -1).normalize(); R.sunDir = sunDir;
    scene.fog = new THREE.FogExp2('#7d3019', 0.021);
    const fogO = { color: '#7d3019', density: .021 };
    const { sky, env } = C.gradSkyAndEnv(renderer, {
      stops: [[-12, '#2a120c'], [0, '#b9481f'], [3, '#9a3a1c'], [9, '#6a2414'], [18, '#3e160d'], [40, '#1e0b07']],
      sunDir: sunDir.toArray(), sunColor: '#ffbf80', sunSize: 3.2, sunI: 2.2, glow: 1.4, glowColor: '#ff6a28', haze: .9, clouds: .5, cloudColor: '#c0502a', cloudShade: '#40160c',
      storm: .55, stormDir: [.35, 0, -1], stormColor: '#3e140a',
    });
    scene.add(sky); R.sky = sky; scene.environment = env; scene.environmentIntensity = .55;
    const sun = ENV.sunLight({ color: '#ff8a4c', intensity: 1.8, pos: sunDir.clone().multiplyScalar(40).toArray(), target: [0, 0, 2], size: 9, mapSize: 2048, bias: -.0003, normalBias: .02, radius: 3 });
    scene.add(sun, sun.target);
    scene.add(new THREE.HemisphereLight('#c8683e', '#4a2418', .95));
    const fill = new THREE.DirectionalLight('#ffa878', 1.4); fill.position.set(2.5, 2.2, 6); scene.add(fill);   // warm light scattered back by the dust
    const rim = new THREE.DirectionalLight('#ffb070', 1.4); rim.position.set(-3, 1.2, -6); scene.add(rim);   // sun through the dust: rims the shields, shafts, arrows
    R.flash = new THREE.PointLight('#ffb060', 0, 2.5, 2); scene.add(R.flash);

    // ground
    const sandMat = M.MAT.sand({ a: '#b86a42', b: '#7e4128', repeat: [300 / 2.2, 300 / 2.2] }); sandMat.normalScale.set(.7, .7);
    const ground = M.dunes({ size: 300, seg: 220, height: 1.8, seed: 19, flatCenter: 26, flatAt: [0, 0], material: sandMat });
    scene.add(ground); const gh = (x, z) => ground.userData.heightAt(x, z); R.gh = gh;
    // Uhud-like ridge silhouette through the dust (flat hazy silhouette, no fog)
    const rg = C.ridge({ width: 900, depth: 200, height: 85, seed: 5, color: '#5a2214', top: '#3e170e', basic: true, fog: false }); rg.position.set(-40, -4, -280); scene.add(rg);

    // rocks + pebbles
    const rr = U.rng(71); const items = [];
    for (let i = 0; i < 46; i++) { const x = (rr() - .5) * 26, z = 10 - rr() * 40; if (Math.abs(x - .3) < 1.3 && z > -3 && z < 10) continue; const s = .25 + Math.pow(rr(), 2) * 1.0; items.push({ x, z, s: [s, s * .6, s * .85], ry: rr() * 6, variant: i % 3 }); }
    for (let i = 0; i < 320; i++) { const x = (rr() - .5) * 22, z = 10 - rr() * 30; const s = .03 + Math.pow(rr(), 3) * .14; items.push({ x, z, s: [s, s * .6, s * .8], ry: rr() * 6, variant: i % 3 }); }
    items.push({ x: .75, z: -.62, s: [.42, .3, .36], ry: .3, variant: 1 }); // rock propping the hero shield
    items.forEach(it => { it.y = gh(it.x, it.z) + it.s[1] * .15; });
    R.rockItems = items;
    scene.add(C.scatterRocks(items, { seed: 17, detail: 3, palette: ['#6a3a26', '#4e2a1c', '#80482e'], bigTint: '#6e5446' }));

    // shields & spears
    const sh = (o, x, z, rx, ry, rz, dy = 0) => { const s = C.shield(o); s.position.set(x, gh(x, z) + dy, z); s.rotation.set(rx, ry, rz); scene.add(s); s.updateMatrixWorld(true); return s; };
    R.hero = sh({ a: '#a8683e', b: '#62321a', seed: 3 }, .62, -.3, 1.15, .05, -.06, .36); // propped on the rock, facing the camera
    R.heroRot = R.hero.rotation.clone();
    const sB = sh({ a: '#8a4e2c', b: '#4e2614', seed: 5 }, -1.55, 5.4, -.12, .4, .1, .02);
    sh({ seed: 7 }, 2.4, 3.6, .9, -.6, .25, .2);
    sh({ a: '#7a3e22', b: '#3e1c0c', seed: 9 }, -2.9, -1.8, -.2, 1.2, -.15, .02);
    sh({ seed: 11 }, 2.6, -5.5, 1.3, -.2, 0, .32);
    sh({ seed: 13 }, -4.2, -9, .1, 2, .2, .02);
    const sp = (x, z, rx, rz, ry = 0, len = 2.5, dy = -.35) => { const s = C.spear2({ length: len, seed: Math.abs(Math.round(x * 10)) + 1 }); s.position.set(x, gh(x, z) + dy, z); s.rotation.set(rx, ry, rz); scene.add(s); return s; };
    // foreground spear: right third, leaning away to the right, head rim-lit against the burning sky (never crosses the type)
    { const s = C.spear2({ length: 2.3, seed: 7 }); const dir = new THREE.Vector3(.5, .8, -.33).normalize(); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); s.rotateY(.6);
      s.position.set(-2.5, gh(-2.5, -2.7) - .25, -2.7); scene.add(s); R.fgSpear = s; }
    sp(-4.4, 2.2, -.2, -.42, 0); sp(-7.2, -9.5, .1, .3); sp(3.2, -8.5, -.25, -.2); sp(5.8, -12.5, .3, .5); sp(4.5, -2.5, .15, -.5);
    sp(.25, 5.3, Math.PI / 2 - .02, 0, 1.2, 2.4, .03); sp(-.9, -3.2, Math.PI / 2 - .03, 0, -.5, 2.4, .03);

    // --- arrows ---
    const ar = U.rng(5); const arrows = [];
    const tSav = ctx.wordTime('savaş'), tSid = ctx.wordTime('şiddetli'), tAn = ctx.wordTime('anların');
    R.tSav = tSav; R.tSid = tSid; R.tAn = tAn;
    const okSpot = (x, z) => !(Math.abs(x - .3) < .9 && z > -1.2 && z < 10.5) && !(Math.abs(x - .62) < .6 && Math.abs(z + .3) < .6);
    // already-stuck arrows from earlier volleys
    for (let i = 0; i < 80; i++) { const x = (ar() - .5) * 18, z = 9 - ar() * 26; if (!okSpot(x, z)) continue; const vL = C.landingVel(Math.PI - .2 + (ar() - .5) * .5, .45 + ar() * .5, 40); arrows.push({ L: new THREE.Vector3(x, gh(x, z), z), vL, tL: -5 - ar(), flight: 2.6, mode: 'stick', embed: .12 + ar() * .12, ground: gh }); }
    // arrows stuck in shield B
    sB.updateMatrixWorld(true); for (let k = 0; k < 3; k++) { const p = new THREE.Vector3(Math.cos(k * 2.1) * .17, .07, Math.sin(k * 2.1) * .17).applyMatrix4(sB.matrixWorld); arrows.push({ L: p, vL: C.landingVel(Math.PI - .3 + k * .2, .7, 40), tL: -6, flight: 2.6, mode: 'stick', embed: .06, ground: gh }); }
    const sparks = [], pf = [];
    // volleys fly over the camera from behind and rain down into the plain ahead (silhouetted against the glowing horizon)
    const camZ = t => t < tSid ? U.lerp(9.6, 4.9, (t + .5) / (tSid + .5)) : U.lerp(4.9, .4, (t - tSid) / (ctx.dur + .55 - tSid));
    // landing points sampled inside the (narrow, portrait) view cone ahead of where the camera will be
    const land = (tL, n, dr, pitch, seed) => { const r = U.rng(seed); for (let i = 0; i < n; i++) { const t = tL[0] + r() * (tL[1] - tL[0]); const d = dr[0] + Math.pow(r(), .8) * (dr[1] - dr[0]); const z = camZ(t) - d, x = -.4 + (r() - .5) * 2 * .3 * d; if (!okSpot(x, z)) continue; const vL = C.landingVel(.1 + (r() - .5) * .25, pitch[0] + r() * (pitch[1] - pitch[0]), 34 + r() * 6); const L = new THREE.Vector3(x, gh(x, z), z); arrows.push({ L, vL, tL: t, flight: 2.4, mode: 'stick', embed: .12 + r() * .1, ground: gh }); if (d < 30) pf.push({ p: [x, L.y + .1, z], t0: t, life: .8 + r() * .5, s0: .12, s1: .45 + r() * .55, v: [1.4, .55, 0], a: .55, color: '#8e5234' }); } };
    land([tSav - .45, tSid + .3], 150, [6, 38], [.6, .95], 11);
    land([tAn - .55, ctx.dur + .7], 320, [5, 34], [.55, .95], 12);
    // a few skim low right over the lens (whoosh) and keep going into the distance
    [[tSav + .3, .7, 1.6], [tSid + .4, -.6, 1.2], [tAn + .15, .3, 2.0], [tAn + .5, -1.0, 1.5]].forEach(([t, dx, hy], k) => { const x = dx, z = -26 - k * 4; arrows.push({ L: new THREE.Vector3(x, gh(x, z), z), vL: C.landingVel(.05, .28, 46), tL: t + .62, flight: 1.4, mode: 'stick', embed: .15, ground: gh }); });
    // hero arrow -> iron boss of the propped shield, breaks with sparks
    const boss = new THREE.Vector3(0, .1, 0).applyMatrix4(R.hero.matrixWorld); const nrm = new THREE.Vector3(0, 1, 0).transformDirection(R.hero.matrixWorld);
    const vHero = C.landingVel(.08, .42, 44);
    arrows.push({ L: boss.clone(), vL: vHero, tL: tSid, flight: 2.6, mode: 'break', normal: nrm, ground: gh });
    const refl = vHero.clone().normalize().reflect(nrm).multiplyScalar(.6).add(nrm).normalize();
    C.sparkBurst(sparks, { p: boss.toArray(), dir: refl.toArray(), t0: tSid, n: 46, speed: [2.5, 9], spread: .6, life: [.15, .55], w: .011, seed: 3, color: '#ffd68a', i: 3.4 });
    pf.push({ p: [boss.x, boss.y + .05, boss.z], t0: tSid, life: .8, s0: .1, s1: .7, v: [.8, .6, .5], a: .45, color: '#c08a60' });
    R.boss = boss;
    // a few arrows strike rocks (sparks)
    const bigRocks = items.filter(it => it.s[0] > .5 && Math.hypot(it.x, it.z - 2) < 12).slice(0, 5);
    bigRocks.forEach((it, k) => { const top = new THREE.Vector3(it.x, it.y + it.s[1] * .55, it.z); const t = (k % 2 ? tAn : tSav + .3) + k * .23; const vL = C.landingVel(Math.PI - .2, .6, 42); arrows.push({ L: top, vL, tL: t, flight: 2.6, mode: 'break', normal: new THREE.Vector3(0, 1, 0), ground: gh }); C.sparkBurst(sparks, { p: top.toArray(), dir: [.5, 1, .3], t0: t, n: 14, speed: [2, 6], spread: .6, life: [.15, .4], w: .008, seed: 20 + k, color: '#ffcf80', i: 3 }); });
    R.volley = C.arrowVolley(arrows, { seed: 9, arrow: { thick: 1.6, fletch: '#8a7058', fletch2: '#3e2c20' } }); scene.add(R.volley.group);
    R.trails = C.streaks(R.volley.trails({ w: .05, len: 2.2, color: '#ffe2c4', a: .42 }).filter(it => it.t0 > -4), { fadeIn: .02, fadeOut: .97, fog: fogO }); scene.add(R.trails);
    R.sparks = C.streaks(sparks, { gravity: [0, -9.8, 0], shutter: .03, additive: true, cool: '#a02a08', fadeIn: .01, fadeOut: .55 }); scene.add(R.sparks);
    R.puffs = C.puffs(pf, { sunDir: sunDir.toArray(), litMul: 1.05, shadeMul: .7 }); scene.add(R.puffs);

    // storm: big drifting dust, fast ground sheets, blowing sand
    R.storm = C.dustField({ count: 80, center: [0, 3.2, -6], box: [46, 6.5, 44], size: [3, 8], wind: [7.5, .2, 0], swirl: .6, shade: '#4e1c10', lit: '#e8803e', sunDir: sunDir.toArray(), opacity: .26, nearFade: 3.2, scatter: 1.6, seed: 2, fog: fogO, yMin: 0 });
    R.sheets = C.dustField({ count: 44, center: [0, .5, 0], box: [26, .8, 26], size: [1, 2.6], wind: [9, 0, 0], swirl: .2, shade: '#7a3a20', lit: '#e8884a', sunDir: sunDir.toArray(), opacity: .22, nearFade: 2.2, scatter: 1.4, seed: 3, fog: fogO, yMin: 0 });
    // the dust wall of the battle towering over the plain: big billows, back-lit rims toward the sun
    R.wall = C.dustField({ count: 34, center: [0, 22, -140], box: [360, 34, 70], size: [40, 80], wind: [5, .3, 0], swirl: 1.5, shade: '#3a1309', lit: '#e0662c', sunDir: sunDir.toArray(), opacity: .55, nearFade: 1, scatter: 1.8, seed: 21 });
    scene.add(R.storm, R.sheets, R.wall);
    const sr = U.rng(8); const sand = [];
    for (let i = 0; i < 200; i++) { const sp2 = 7 + sr() * 5, life = 16 / sp2; const z = 7 - sr() * 18; sand.push({ p: [-8 + sr(), .02 + Math.pow(sr(), 2.2) * .7, z], v: [sp2, (sr() - .4) * .4, (sr() - .5) * .5], t0: -sr() * life, life, w: .004 + sr() * .004, len: .12 + sr() * .2, color: '#e6a070', a: .14 + sr() * .16, loop: 1 }); }
    R.sand = C.streaks(sand, { fadeIn: .08, fadeOut: .85, fog: fogO }); scene.add(R.sand);
    R.drift = C.sandDrift({ ground: gh, center: [0, 0, -2], size: [44, 40], layers: [[.01, 1, 1], [.025, .7, 1.2], [.05, .35, 1.4]], wind: [1, .05], speed: 7, opacity: .26, density: .42, lit: '#f09a5c', shade: '#6e3018', sunDir: sunDir.toArray(), scatter: 1.1, nearFade: 4, farFade: 24, fog: fogO }); scene.add(R.drift);

    camera.fov = 38; camera.near = .05; camera.far = 1200; camera.updateProjectionMatrix();
    R.look = new THREE.Vector3();
  },
  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    const tSid = R.tSid;
    R.volley.update(t);
    // --- camera: fast low hand-held dolly forward, roll, shake, jolt + punch-in on the hit ---
    if (!R.camP) R.camP = C.camPath([[-0.5, [1.35, 1.2, 9.6], [0, 0, 0]], [tSid, [.55, 1.02, 4.9], [0, 0, 0]], [tSid + .55, [-.25, 1.42, 3.0], [0, 0, 0]], [ctx.dur + .55, [-1.0, 1.62, .4], [0, 0, 0]]]);
    R.camP.at(t, R.cp || (R.cp = new THREE.Vector3()), R.cl || (R.cl = new THREE.Vector3())); const P = R.cp.toArray();   // smooth spline, no velocity kinks
    const L = U.kf(t, [[-0.5, [-1.4, 3.3, -20]], [tSid - .3, [-.4, 2.6, -20]], [tSid + .02, [.45, .25, -12]], [tSid + .45, [.3, .9, -15]], [ctx.dur + .55, [-1.2, 3.6, -20]]], 'inOutSine');
    const jolt = Math.exp(-Math.max(0, t - tSid) * 9) * (t > tSid ? 1 : 0);
    const s1 = U.shake(t, .045, 1.6, 11), s2 = U.shake(t, .012, 7, 4);
    camera.position.set(P[0] + s1.x + s2.x, R.gh(P[0], P[2]) + P[1] + s1.y + s2.y + jolt * .05 * Math.sin((t - tSid) * 60), P[2]);
    R.look.set(...L); camera.lookAt(R.look);
    camera.rotateZ(U.lerp(-.07, .06, U.prog(t, -.5, ctx.dur + .5)) + jolt * .03 * Math.sin((t - tSid) * 45) + s1.x * .4);
    camera.fov = 38 - 5 * U.prog(t, tSid - .12, tSid + .1, 'outCubic') + 3 * U.prog(t, tSid + .25, ctx.dur, 'inOutSine'); camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const fb = 1 - U.prog(t, tSid - .55, tSid - .2, 'inOutSine') + U.prog(t, tSid + .15, tSid + .7, 'inOutSine'); post.dof.focus = U.lerp(Math.max(2, camera.position.distanceTo(R.boss)), 16, fb); post.dof.range = U.lerp(6, 16, fb); post.dof.amount = U.lerp(.35, .25, fb);
    // hero shield jolts on impact
    const sj = Math.exp(-Math.max(0, t - tSid) * 7) * (t > tSid ? 1 : 0);
    R.hero.rotation.set(R.heroRot.x - sj * .09 * Math.cos((t - tSid) * 38), R.heroRot.y + sj * .04 * Math.sin((t - tSid) * 30), R.heroRot.z);
    // spark flash light at the boss
    R.flash.position.copy(R.boss).add(new THREE.Vector3(.3, .3, .1)); R.flash.intensity = 1.0 * Math.exp(-Math.max(0, t - tSid) * 14) * (t > tSid - .01 ? 1 : 0);
    // storm thickens toward the end
    const st = U.smoothstep(R.tAn - .5, ctx.dur + .5, t);
    R.storm.userData.uniforms.opacity.value = .26 + .12 * st;
    post.exposure = 1.0 + .12 * Math.exp(-Math.max(0, t - tSid) * 6) * (t > tSid ? 1 : 0) - .06 * st;

    // --- typography ---
    const X = ui.ctx; { const gr = X.createLinearGradient(0, 150, 0, 760); gr.addColorStop(0, 'rgba(20,6,4,.38)'); gr.addColorStop(1, 'rgba(20,6,4,0)'); X.save(); X.fillStyle = gr; X.fillRect(0, 0, 1080, 760); X.restore(); }
    ui.text('savaşın', { t, t0: R.tSav - .03, x: 540, y: 330, size: 62, weight: 800, color: '#fff1dc', anim: 'rise' });
    const jx = jolt * 14 * Math.sin((t - tSid) * 70), jy = jolt * 10 * Math.cos((t - tSid) * 55);
    ui.text('ŞİDDETLİ', { t, t0: tSid - .03, x: 540 + jx, y: 452 + jy, size: 134, weight: 900, color: '#ffb066', anim: 'pop', letterSpacing: 6, stroke: 'rgba(60,12,4,.55)', strokeW: 10 });
    ui.text('anları', { t, t0: R.tAn - .03, x: 540, y: 570, size: 62, weight: 800, color: '#fff1dc', anim: 'rise' });
  },
};
