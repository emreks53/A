// s06 (29.75–33.30) "Hem Hazret-i Ali gibi cesarette benzersiz bir zat bile,"
// Golden hour on a rocky plain below an Uhud-like ridge. Hero shot: the Zülfikar (split-tip sword) planted in the sand,
// rim-lit by the low sun from behind-right, wind-blown sand + a thin dust "cape" streaming off its base; slow low orbit.
// Beats: "Hazret-i" → "Hz. Ali (r.a.)" + "Zülfikar" callout · "cesarette" → gust + "cesarette" · "benzersiz" → glint on the
// guard + "BENZERSİZ" · "bir zat bile" → light dims, a dust wall rises on the horizon (lead-in to the s07 battle storm).
import * as THREE from 'three';
import * as C from '../engine/lib/extra_C.js';

let R = {};
// zulfikar2's blade goes through toCreasedNormals, which welds vertices on a 1 cm hash grid: neighbouring cross-section
// points share each other's face normals, and the near-mirror flats turn that into broken dark "wood-grain" streaks.
// Recompute creased normals with an exact (10 µm) hash, then ease the fuller walls toward the flat so the twin grooves
// read as soft channels instead of pencil lines (kFull = fraction of the fuller-wall tilt that is kept).
function fixBladeNormals(THREE, geo, crease = .5, kFull = .2) {
  const P = geo.attributes.position, N = geo.attributes.normal, Ed = geo.attributes.edge, n = P.count, cd = Math.cos(crease), HM = 1e5;
  const key = i => `${Math.round(P.getX(i) * HM)},${Math.round(P.getY(i) * HM)},${Math.round(P.getZ(i) * HM)}`;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), o = new THREE.Vector3();
  const fN = [], fA = [], map = new Map();
  for (let f = 0; f < n / 3; f++) {
    a.fromBufferAttribute(P, 3 * f); b.fromBufferAttribute(P, 3 * f + 1); c.fromBufferAttribute(P, 3 * f + 2);
    const nn = new THREE.Vector3().crossVectors(e1.subVectors(c, b), e2.subVectors(a, b)); const ar = nn.length(); fN.push(ar > 0 ? nn.divideScalar(ar) : nn); fA.push(ar);
    for (let k = 0; k < 3; k++) { const kk = key(3 * f + k); let l = map.get(kk); if (!l) map.set(kk, (l = [])); l.push(f); }
  }
  for (let f = 0; f < n / 3; f++) for (let k = 0; k < 3; k++) {
    const i = 3 * f + k; o.set(0, 0, 0); for (const g of map.get(key(i))) if (fN[g].dot(fN[f]) > cd) o.addScaledVector(fN[g], fA[g]);
    if (o.lengthSq() < 1e-24) o.copy(fN[f]); o.normalize();
    const e = Ed ? Ed.getX(i) : 1;
    if (e < .6 && Math.abs(o.z) > .5) { const w = e > .52 ? (.6 - e) / .08 : 1, kk = 1 - (1 - kFull) * w; o.multiplyScalar(kk); o.z += Math.sign(o.z) * (1 - kk); o.normalize(); }
    N.setXYZ(i, o.x, o.y, o.z);
  }
  N.needsUpdate = true;
}
export default {
  post: {
    exposure: 1.0,
    bloom: { enabled: true, strength: 0.32, radius: 0.4, threshold: 0.92 },
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
    const bounce = new THREE.DirectionalLight('#ffc89a', .8); bounce.position.set(-1, .8, 4); scene.add(bounce); R.bounce = bounce;
    R.kick = new THREE.PointLight('#ffd09a', .7, 3.2, 2); R.kick.position.set(-.55, 1.15, 1.1); scene.add(R.kick);

    // ground
    const sandMat = M.MAT.sand({ a: '#e2a46a', b: '#b8784a', repeat: [400 / 2.4, 400 / 2.4] }); sandMat.normalScale.set(.6, .6);
    const ground = M.dunes({ size: 400, seg: 240, height: 2.6, seed: 7, flatCenter: 45, flatAt: [0, 0], material: sandMat });
    scene.add(ground); R.ground = ground; const gh = (x, z) => ground.userData.heightAt(x, z);

    // the Zülfikar (v2: split twin points, fullers, gold-inlaid forte, jewelled drooping guard), planted point-first in the sand
    // dirSpec/edgeI: the low back-right sun catches the edge bevels as a warm rim (the flats face away from it)
    // Planted, not balanced: the blade is driven in until the undisturbed sand meets the prongs at blade-local y = Y_SAND
    // (the fork is .25 long), so both needle tips are well buried and the prongs enter the sand at their broad part, while
    // the upper half of the split (notch apex at .25) stays clearly above the mound. R.sink = how much deeper than the old
    // .08 m placement; the camera aim follows it so the sword keeps its place in the frame.
    const Y_SAND = .115, SC = 1.12; R.sink = Y_SAND * SC - .08;
    const sword = C.zulfikar2({ hiltScale: 1.12, steelRough: .22, envI: .66, goldEnvI: 1.6, goldEnv: env, dirSpec: .6, edgeI: .55, edgeC: '#fff0d6', steelColor: '#e2e6ea' }); sword.scale.setScalar(SC); sword.position.set(0, gh(0, 0) - Y_SAND * SC, 0); sword.rotation.set(0, -.42, .022);
    fixBladeNormals(THREE, sword.userData.blade.geometry);
    scene.add(sword); sword.updateMatrixWorld(true); R.sword = sword; R.glint2 = sword.userData.steel.userData.glint;
    // --- displaced sand: a low mound heaped around the entry, a slumped crater + lip hugging each prong, sand packed up
    // between the prongs, a faint wind-tail in the lee and a few spilled clods. One mesh on the ground's own material with
    // world-matched UVs (continues the sand texture); it rides the ground MESH height (not the analytic one) and meets it
    // with a near-zero slope so there is no visible seam. Vertex colours: freshly turned sand a touch darker/warmer, plus
    // baked contact occlusion in the crevice where the steel goes in.
    {
      const F = sword.userData.fork, Lb = sword.userData.bladeLen, hwF = .041, T = hwF * 1.06, tF = .0042;   // zulfikar2 defaults
      const bx = .016 * Math.pow(1 - Y_SAND / Lb, 2), s = Y_SAND / F;
      const inner = T * Math.pow(1 - s, .62), outer = T + (hwF - T) * s + hwF * .09 * Math.sin(Math.PI * Math.pow(s, .75));
      const pc = (outer + inner) / 2, phw = (outer - inner) / 2, pth = tF * (.3 + .7 * Math.pow(s, .45));
      const dProng = (lx, lz) => { let d = 1e9; for (const sg of [1, -1]) d = Math.min(d, Math.hypot(Math.max(Math.abs(lx - bx - sg * pc) - phw, 0), Math.max(Math.abs(lz) - pth, 0))); return d * SC; };
      // exact height of the (coarse, 1.67 m) ground mesh: PlaneGeometry triangulation (a,b,d)/(b,c,d)
      const GP = ground.geometry.attributes.position, gSeg = 240, gStep = 400 / gSeg;
      const gy = (ix, iz) => GP.getY(iz * (gSeg + 1) + ix);
      const groundY = (x, z) => { const fx0 = (x + 200) / gStep, fz0 = (z + 200) / gStep, ix = Math.floor(fx0), iz = Math.floor(fz0), fx = fx0 - ix, fz = fz0 - iz;
        const ha = gy(ix, iz), hb = gy(ix, iz + 1), hc = gy(ix + 1, iz + 1), hd = gy(ix + 1, iz);
        return fx + fz <= 1 ? ha + (hd - ha) * fx + (hb - ha) * fz : hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz); };
      const nA = ctx.TEX.fbmField(41, 4, 4), nB = ctx.TEX.fbmField(43, 16, 2), nC = ctx.TEX.fbmField(47, 6, 2);
      const E = sword.localToWorld(new THREE.Vector3(bx, Y_SAND, 0)); E.y = 0;
      const rr = U.rng(17), clods = []; for (let i = 0; i < 18; i++) { const a = rr() * 6.283, r = 1.0 + rr() * .6; clods.push([Math.cos(a) * r * .23, Math.sin(a) * r * .165, .008 + rr() * .01, .0015 + rr() * .0025]); }
      const SZ = 1.1, NS = 260, AU = .23, AV = .165;
      const geo = new THREE.PlaneGeometry(SZ, SZ, NS, NS); geo.rotateX(-Math.PI / 2);
      const gp = geo.attributes.position, uv = geo.attributes.uv, col = new Float32Array(gp.count * 3), L = new THREE.Vector3();
      let hS = 0, hN = 0;
      for (let i = 0; i < gp.count; i++) {
        const wx = gp.getX(i) + E.x, wz = gp.getZ(i) + E.z;
        sword.worldToLocal(L.set(wx, gh(wx, wz), wz));
        const u = (L.x - bx) * SC, v = L.z * SC, d = dProng(L.x, L.z);   // blade-aligned metres: u along the edge line, v across the flats
        const qa = .5 + u / SZ, qb = .5 + v / SZ;
        const r2 = (u / AU) ** 2 + (v / AV) ** 2, env = Math.exp(-1.6 * r2 * (1 + .25 * nC(qa, qb)));
        const lee = .007 * Math.exp(-(((u - .19) / .15) ** 2) - ((v / .07) ** 2));   // the wind runs along the edge line (+u): a little tail of caught sand
        const lip = .007 * (1 + .9 * nC(qa * 2.3, qb * 2.3));
        const crater = -.013 * Math.exp(-((d / .014) ** 2)) + lip * Math.exp(-(((d - .032) / .017) ** 2));
        const lumps = (nA(qa, qb) * .004 + nB(qa, qb) * .001) * Math.sqrt(env);
        let clod = 0; for (const c of clods) { const q = ((u - c[0]) ** 2 + (v - c[1]) ** 2) / (c[2] ** 2); if (q < 1) clod += c[3] * (1 - q) * (1 - q); }
        const h = .036 * env + crater * Math.min(1, env * 3) + lumps + lee + clod;
        gp.setY(i, groundY(wx, wz) - .0004 + Math.max(h, 0));
        uv.setXY(i, wx / 400 + .5, .5 - wz / 400);
        if (d < .003) { hS += h; hN++; }
        const dis = Math.min(1, (env + lee * 60 + clod * 120) * 1.4);
        const ao = 1 - .4 * Math.exp(-((d / .008) ** 2)) - .1 * Math.exp(-((d / .03) ** 2));
        const k = (1 - .05 * dis) * ao; col[3 * i] = k; col[3 * i + 1] = k * (1 - .035 * dis); col[3 * i + 2] = k * (1 - .07 * dis);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); R.moundTop = hN ? hS / hN : .02;   // mean sand height where it meets the steel
      const moundMat = sandMat.clone(); moundMat.vertexColors = true;   // shares the sand textures
      R.moundC = E.clone(); R.moundR = [AU, AV];
      const mound = new THREE.Mesh(geo, moundMat); mound.position.set(E.x, 0, E.z); mound.receiveShadow = true; mound.castShadow = true; scene.add(mound); R.mound = mound;
    }
    // sand clinging to the steel just above the mound (patchy grains, densest at the sand line) + contact occlusion where the
    // prongs go in. Layered on top of zulfikar2's own shader patch (blade-local Y; the shared helper is left untouched).
    {
      const st = sword.userData.steel, prev = st.onBeforeCompile;
      R.sandY = Y_SAND + R.moundTop / SC;   // blade-local height where the steel leaves the sand
      const uS = { uSandY: { value: R.sandY }, uSandC: { value: new THREE.Color('#bc8048') } };
      st.onBeforeCompile = (sh, rdr) => {
        prev(sh, rdr); Object.assign(sh.uniforms, uS);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = position;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uSandY; uniform vec3 uSandC; varying vec3 vLP;
float sdHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sdNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(sdHash(i), sdHash(i + vec2(1., 0.)), f.x), mix(sdHash(i + vec2(0., 1.)), sdHash(i + vec2(1., 1.)), f.x), f.y); }`)
          .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
float sdH = vLP.y - uSandY; float sdBand = 1. - smoothstep(-.003, .055, sdH);
float sdN = .3 * sdNoise(vLP.xy * vec2(240., 170.) + vLP.z * 40.) + .3 * sdNoise(vLP.xy * vec2(700., 520.) + 5.) + .4 * sdNoise(vLP.xy * vec2(1900., 1500.) + 17.);
float sandM = .9 * smoothstep(.5, .6, sdN + (sdBand - .62) * .95) * smoothstep(0., .2, sdBand);   // fine grains: a continuous film at the sand line thinning to a few specks
diffuseColor.rgb = mix(diffuseColor.rgb, uSandC, sandM); metalnessFactor = mix(metalnessFactor, 0., sandM); roughnessFactor = mix(roughnessFactor, .95, sandM);
float sdAO = mix(.6, 1., smoothstep(-.004, .024, sdH));`)
          .replace('outgoingLight += uGlC * uGlI', 'outgoingLight += (1. - sandM) * uGlC * uGlI').replace('uEdgeC * uEdgeI * smoothstep(.74, .97, vEdge)', 'uEdgeC * uEdgeI * smoothstep(.74, .97, vEdge) * (1. - sandM)')
          .replace('#include <lights_fragment_end>', 'iblIrradiance *= mix(vec3(1.), vec3(.6, .5, .4), sandM);   // the grains take their light from the warm ground bounce + sky, not the bright steel studio env\n#include <lights_fragment_end>')
          .replace('#include <opaque_fragment>', 'outgoingLight *= sdAO;\n#include <opaque_fragment>');
      };
      st.customProgramCacheKey = () => 'zulfikar2_s06_planted'; st.needsUpdate = true;
    }

    // rocks: small hero cluster (kept low, never behind the blade) + scatter + pebbles
    const rr = U.rng(61); const items = [
      { x: -.6, z: .1, s: [.2, .15, .17], ry: .4, variant: 0 }, { x: .55, z: -.55, s: [.24, .17, .2], ry: 1.2, variant: 1 }, { x: -1.6, z: -1.2, s: [.42, .3, .38], ry: 2, variant: 2 },
      { x: 4.3, z: -4.8, s: [.75, .5, .65], ry: .3, variant: 0 }, { x: 7.4, z: -9.5, s: [1.4, .9, 1.2], ry: 1, variant: 1 }, { x: -5.4, z: -8, s: [1.7, 1.0, 1.4], ry: 2.5, variant: 2 },   // the two right-hand boulders sit just outside the late (th -.34) frame edge
      { x: .32, z: .5, s: [.08, .06, .07], ry: 0, variant: 1 }, { x: -.22, z: .38, s: [.05, .04, .05], ry: 1, variant: 2 },
    ];
    for (let i = 0; i < 190; i++) { const a = rr() * 6.28, d = .35 + Math.pow(rr(), .8) * 14; const x = Math.cos(a) * d, z = Math.sin(a) * d - 2; if (z > 1.2 && Math.abs(x) < 2.4) continue; if (Math.abs(x) < .9 && z < -.5 && z > -9) continue; const s = .02 + Math.pow(rr(), 3) * .2 * (1 + d * .05); items.push({ x, z, s: [s, s * (.5 + rr() * .4), s * (.7 + rr() * .5)], ry: rr() * 6, variant: i % 3 }); }
    for (let i = 0; i < 26; i++) { const x = (rr() < .5 ? -1 : 1) * (6 + rr() * 60), z = -12 - rr() * 70; const s = .6 + rr() * 2.2; items.push({ x, z, s: [s, s * .6, s * .9], ry: rr() * 6, variant: i % 3 }); }
    items.forEach(it => { it.y = gh(it.x, it.z) - (Array.isArray(it.s) ? it.s[1] : it.s) * .2; });
    R.rocks = C.scatterRocks(items, { seed: 9, detail: 3, palette: ['#a86e4c', '#80523a', '#bd825a'], big: .12 }); scene.add(R.rocks);
    // draw the rocks right AFTER the ground-hugging sand-drift sheets (renderOrder 7..7.02) so a drift plane never slices a
    // rock face with a hard milky band; the rocks still write depth, so dust/streaks/particles (renderOrder >= 8) sort as before.
    // (opacity stays 1; depthOk keeps them in the DOF depth pre-pass)
    R.rocks.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.renderOrder = 7.5; o.userData.depthOk = true; } });
    // distant red-sandstone buttes (same family as the sheltering rock of s08) + Uhud-like ridge
    const b1 = C.butte({ hx: 9, hy: 7, hz: 14, round: 1.5, seed: 21, detail: 24, bury: 2, ledge: .2, noiseAmp: .3 }); b1.position.set(-100, gh(-100, -150) - .5, -150); b1.rotation.y = .5; scene.add(b1);
    const b2 = C.butte({ hx: 7, hy: 5, hz: 10, round: 1.2, seed: 33, detail: 22, bury: 1.5, ledge: .2, noiseAmp: .3 }); b2.position.set(80, gh(80, -190) - .5, -190); b2.rotation.y = -.3; scene.add(b2);
    const rg = C.ridge({ width: 1100, depth: 260, height: 78, seed: 5, color: '#94503a', top: '#ad6a4c' }); rg.position.set(-60, -2, -480); rg.rotation.y = .04; scene.add(rg);

    // wind-blown sand: low streaks (looping), a thin dust "cape" streaming off the sword base, distant back-lit wisps
    // fine airborne grains (thin, short, low alpha; kept away from the lens so they never read as scratches)
    const sr = U.rng(8); const sand = [];
    for (let i = 0; i < 100; i++) {
      const sp = 4.5 + sr() * 4, life = 14 / sp; const z = -11 + sr() * 7.5; const y = .01 + Math.pow(sr(), 2.6) * .3;
      sand.push({ p: [-7 + sr(), y, z - 2.9], v: [sp, (sr() - .3) * .2, sp * .42 + (sr() - .5) * .3], t0: -sr() * life, life, w: .0035 + sr() * .0035, len: .05 + sr() * .1, color: sr() < .5 ? '#ffe2b6' : '#f2c08e', a: .07 + sr() * .12, loop: 1 });
    }
    R.sand = C.streaks(sand, { fadeIn: .1, fadeOut: .8 }); scene.add(R.sand);
    const fog = { color: '#d9a27c', density: .0022 };
    // saltation: sand snaking across the ground in thin, back-lit ribbons + a wake streaming off the planted blade
    R.drift = C.sandDrift({ ground: gh, center: [0, 0, -6], size: [44, 30], layers: [[.006, 1, 1], [.012, .64, 1.15], [.02, .26, 1.3]], wind: [1, .42], speed: 2.6, opacity: .6, density: .44, lit: '#f6cf9c', shade: '#b8784a', sunDir: sunDir.toArray(), scatter: 1.0, plume: [0, 0, .8, .04], nearFade: 5.4, farFade: 26, fog });
    scene.add(R.drift);
    // the drift sheets are flat layers .6-2 cm above the ground: where the sand mound around the blade rises through them
    // each layer would cut a hard contour line into it, so the drift thins out smoothly over the mound's footprint
    // (elliptical, along the blade line; the wake still streams off its lee).
    R.drift.traverse(o => { if (!o.isMesh) return; const m = o.material;
      m.uniforms.uMC = { value: new THREE.Vector2(R.moundC.x, R.moundC.z) }; m.uniforms.uMA = { value: new THREE.Vector2(Math.cos(.42), Math.sin(.42)) }; m.uniforms.uMR = { value: new THREE.Vector2(R.moundR[0], R.moundR[1]) };
      m.fragmentShader = m.fragmentShader.replace('uniform vec4 plume;', 'uniform vec4 plume; uniform vec2 uMC, uMA, uMR;')
        .replace('float dist = length(cameraPosition - vW);', 'vec2 mq = vW.xz - uMC; st *= smoothstep(1.05, 2.1, length(vec2(dot(mq, uMA), dot(mq, vec2(-uMA.y, uMA.x))) / uMR));\n          float dist = length(cameraPosition - vW);');
      m.needsUpdate = true; });
    // sun glints sparkling on the sand grains
    R.glitter = FX.particles({ count: 420, center: [0, .012, -2.6], box: [10, .02, 7.5], size: 1.5, color: '#fff3d4', opacity: .9, drift: [0, 0, 0], swirl: 0, twinkle: 1, seed: 12, hardness: .5 }); scene.add(R.glitter);
    R.cape = C.dustField({ count: 18, center: [2.0, .22, .85], box: [4.4, .26, 2.0], size: [.2, .55], wind: [2.4, .1, 1.0], swirl: .05, shade: '#c48d62', lit: '#ffdcaa', sunDir: sunDir.toArray(), opacity: .16, nearFade: 1, scatter: 1.6, seed: 4, yMin: 0 });
    R.wisps = C.dustField({ count: 22, center: [0, 1.4, -16], box: [46, 2.4, 16], size: [3, 7], wind: [2.6, .05, 0], shade: '#b88660', lit: '#ffd09a', sunDir: sunDir.toArray(), opacity: .07, nearFade: 5, scatter: 1.4, seed: 5, fog, yMin: 0 });
    R.sheets = C.dustField({ count: 18, center: [0, .35, -3.5], box: [18, .5, 8], size: [.8, 1.8], wind: [3.6, 0, 0], shade: '#c48a5a', lit: '#ffd6a0', sunDir: sunDir.toArray(), opacity: .065, nearFade: 2.5, scatter: 1.2, seed: 6, fog, yMin: 0 });
    R.wall = C.dustField({ count: 26, center: [-60, 30, -300], box: [640, 24, 60], size: [110, 170], wind: [6, 0, 0], shade: '#5e3628', lit: '#a8694a', sunDir: sunDir.toArray(), opacity: 0, nearFade: 1, scatter: .6, seed: 7 });
    scene.add(R.cape, R.wisps, R.sheets, R.wall);
    // reflections: capture the real surroundings from the sword's position (sword hidden)
    // reflector "card": the sunlit dune behind the camera, seen only by the reflection capture (fills the blade flats with warm light)
    const card = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.25), new THREE.MeshBasicMaterial({ color: '#eaa878', fog: false, side: THREE.DoubleSide }));
    card.position.set(Math.sin(-.8) * 5.5, 1.05, Math.cos(-.8) * 5.5); card.lookAt(0, .7, 0); scene.add(card);
    sky.userData.uniforms.sunI.value = .9; scene.environment = C.envFromScene(renderer, scene, [0, .55, 0], [sword, R.cape, R.wisps, R.sheets, R.wall, R.sand, R.drift, R.glitter]); /* polished steel, cooler than the warm scene: a golden-hour "studio" gradient — warm sand below, a hot horizon line, cool
       steel-blue sky above — so the vertical flats get a chrome horizon read that slides with the camera height */
    sword.userData.steel.envMap = C.steelEnv(renderer, { keyDir: sunDir.toArray(), keyAmt: .3, stops: [[-90, '#1e1511'], [-12, '#3e2a20'], [-3.5, '#7a5640'], [-.8, '#e8c8a8'], [.5, '#fff3e4'], [2.5, '#b8c2d4'], [9, '#6e7c9c'], [90, '#3a4562']] });
    sword.userData.steel.envMapIntensity = 1.0; sword.userData.steel.color.set('#d6dade'); sword.userData.steel.needsUpdate = true; sky.userData.uniforms.sunI.value = 6; R.gh = gh; scene.remove(card);
    // specular glint of the sun on the LEFT quillon finial (short, on "benzersiz"); the right finial carries the callout dot
    const ballL = sword.userData.ballLocal.clone(); ballL.x *= -1; ballL.multiplyScalar(1.12).add(sword.userData.hilt.position);
    R.glint = C.starGlint({ size: .16 }); R.glint.position.copy(ballL).add(new THREE.Vector3(-.004, .006, .01)); sword.add(R.glint);

    camera.fov = 33; camera.near = .05; camera.far = 1500; camera.updateProjectionMatrix();
    R.look = new THREE.Vector3();
  },
  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    // --- camera: slow low orbit + gentle push-in (never stops) ---
    const p = .25 * U.prog(t, -0.5, 4.05, 'linear') + .75 * U.prog(t, -0.5, 4.05, 'inOutSine');   // never fully at rest, even on the handles
    const th = U.lerp(.26, -.34, p), rad = U.lerp(5.3, 4.8, p), h = U.lerp(.42, .3, p);
    const sh = U.shake(t, .006, .5, 3);
    const cx = Math.sin(th) * rad + sh.x, cz = Math.cos(th) * rad;
    camera.position.set(cx, R.gh(cx, cz) + h + sh.y, cz);
    R.look.set(0, U.lerp(.53, .54, p) - R.sink, 0); camera.lookAt(R.look); camera.updateMatrixWorld(true);
    post.dof.focus = camera.position.distanceTo(R.look);

    const tAli = ctx.wordTime('hazret'), tCes = ctx.wordTime('cesarette'), tBen = ctx.wordTime('benzersiz'), tZat = ctx.wordTime('bir');
    // --- wind gusts ---
    const gust = .6 + .4 * U.smoothstep(tCes - .2, tCes + .5, t) + .3 * U.smoothstep(tZat - .3, tZat + .6, t);
    R.sand.userData.uniforms.master.value = gust; R.sheets.userData.uniforms.master.value = gust; R.cape.userData.uniforms.master.value = .7 + .5 * (gust - .6);
    R.drift.userData.uniforms.gust.value = .75 + .45 * (gust - .6);
    // --- the low sun's glint travels up the edge bevels (from the sand line to the guard) and flares on the finial on "benzersiz" ---
    const gs = U.prog(t, tCes + .02, tBen + .08, 'inOutSine');
    R.glint2.y.value = U.lerp(R.sandY, .9, gs);   // starts where the steel leaves the sand R.glint2.i.value = 2.2 * Math.sin(Math.PI * U.clamp((t - tCes) / (tBen + .12 - tCes))) ** .7;
    const g = Math.exp(-Math.pow((t - (tBen + .1)) / .2, 2));
    R.glint.material.opacity = .9 * g; R.glint.scale.setScalar(.04 + .13 * g); R.glint.material.rotation = t * .8;
    // --- storm approaching at the end ---
    const st = U.smoothstep(tZat - .7, ctx.dur + .5, t);
    R.wall.userData.uniforms.opacity.value = .85 * st; R.wall.userData.uniforms.boxCenter.value.set(-60, 22 + st * 20, -300 + st * 60);
    R.sun.intensity = 4.4 * (1 - .4 * st); R.bounce.intensity = .8 * (1 - .4 * st);
    R.sky.userData.uniforms.dark.value = .35 * st; R.sky.userData.uniforms.glow.value = .9 - .3 * st;
    ctx.scene.fog.density = .0022 + .003 * st; ctx.scene.fog.color.copy(R.fogA).lerp(R.fogB, st);
    post.exposure = 1.0 - .07 * st; post.grade.warmth = .03 + .04 * st;

    // --- typography (soft top scrim keeps the light sky from eating the letters) ---
    const X = ui.ctx; const sc = U.smoothstep(tAli - .3, tAli + .3, t); if (sc > 0) { const gr = X.createLinearGradient(0, 120, 0, 760); gr.addColorStop(0, `rgba(36,18,40,${.34 * sc})`); gr.addColorStop(1, 'rgba(36,18,40,0)'); X.save(); X.fillStyle = gr; X.fillRect(0, 0, 1080, 760); X.restore(); }
    ui.text('Hz. Ali (r.a.)', { t, t0: tAli - .05, x: 540, y: 270, size: 76, weight: 900, family: 'Playfair Display', color: '#fff3dc', anim: 'rise', dur: .5, letterSpacing: 1, shadowColor: 'rgba(40,20,30,.6)' });
    ui.underline({ t, t0: tAli + .25, x: 515, y: 314, w: 104, color: 'rgba(255,214,140,.9)', width: 4, dur: .5 });
    ui.text('cesarette', { t, t0: tCes - .03, x: 540, y: 358, size: 52, weight: 800, color: '#fff4dc', anim: 'rise', shadowColor: 'rgba(40,20,30,.6)' });
    ui.text('BENZERSİZ', { t, t0: tBen - .03, x: 540, y: 450, size: 104, weight: 900, color: '#ffd27a', anim: 'pop', letterSpacing: 5, shadowColor: 'rgba(40,20,30,.65)' });
    const gp = ui.project(R.sword.userData.ballR.clone().applyMatrix4(R.sword.matrixWorld));
    ui.callout('Zülfikar', { t, t0: tAli + .35, anchor: [gp[0], gp[1]], to: [846, 830], size: 36, weight: 800 });
  },
};
