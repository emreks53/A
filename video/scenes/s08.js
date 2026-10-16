// s08 (35.60–42.00) "Resulullah ﷺ'ın arkasına sığındıklarını defalarca ifade etmiş."
// Metaphor (no figures): the battle storm and its arrows slam into a huge, unshakable layered red-sandstone massif. Arrows hit
// the warmly side-lit windward face — sparks, rock chips, dust bursts — snap and fall into a pile at its foot; the rock does
// not move. On "arkasına" the camera whips around its end into the lee: calm, golden back-light, dust settling, and there the
// Zülfikar stands safe in its shelter. Quote card (Lora) on "sığındıklarını"; on "defalarca" a tally ticks each time another
// volley sails harmlessly high over the shelter.
import * as THREE from 'three';
import * as C from '../engine/lib/extra_C.js';

// Camera: ONE analytic path, arc-length parametrised (no spline knots). Constant-speed windward push -> C1 geometric blend into
// the arc around the -Z end -> soft landing (relative deceleration bounded, no dead stop) that flows on into a slow lee drift.
// The look target follows the same progress and settles on the sword (zero velocity) before the camera lands, so the hero
// never sweeps across frame. Pure function of t.
function buildCam(cfg) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const { O, Ta, Tb, vA, vB, dip, lift, sigK, blend, Pw0, Lw0, Lw, Lm, Ls, A0P, A1P, h0, h1 } = cfg;
  const A0 = Math.atan2(A0P[1] - O[1], A0P[0] - O[0]), A1 = Math.atan2(A1P[1] - O[1], A1P[0] - O[0]);
  const r0 = Math.hypot(A0P[0] - O[0], A0P[1] - O[1]), r1 = Math.hypot(A1P[0] - O[0], A1P[1] - O[1]);
  const arcP = s => { const A = A0 + (A1 - A0) * s, r = r0 + (r1 - r0) * s - dip * Math.sin(Math.PI * s), h = h0 + (h1 - h0) * s + lift * Math.sin(Math.PI * s); return V(O[0] + Math.cos(A) * r, h, O[1] + Math.sin(A) * r); };
  const arcL = s => Lw.clone().multiplyScalar((1 - s) * (1 - s)).addScaledVector(Lm, 2 * s * (1 - s)).addScaledVector(Ls, s * s);
  // arc-length table of the arc
  const NA = 4000, sTab = new Float64Array(NA + 1), lTab = new Float64Array(NA + 1); let prev = arcP(0);
  for (let i = 1; i <= NA; i++) { const s = i / NA, p = arcP(s); sTab[i] = s; lTab[i] = lTab[i - 1] + p.distanceTo(prev); prev = p; }
  const Larc = lTab[NA];
  const sOfLen = l => { if (l <= 0) return 0; if (l >= Larc) return 1; let a = 0, b = NA; while (b - a > 1) { const m = (a + b) >> 1; if (lTab[m] < l) a = m; else b = m; } return sTab[a] + (sTab[b] - sTab[a]) * (l - lTab[a]) / (lTab[b] - lTab[a]); };
  const P0 = arcP(0), P1 = arcP(1), T0 = arcP(1e-4).sub(P0).normalize(), T1 = P1.clone().sub(arcP(1 - 1e-4)).normalize();
  const Lp = P0.distanceTo(Pw0), Dp = P0.clone().sub(Pw0).normalize();
  // look target along the arc: original Bezier, but it settles onto Ls (zero velocity) at sigK so the hero stops sliding early
  const g = s => { if (s >= sigK) return 1; const x = s / sigK; return (x * x * x - 2 * x * x + x) * sigK + (-2 * x * x * x + 3 * x * x); };
  const LaD0 = arcL(1e-4).sub(Lw).multiplyScalar(1 / (lTab[1] * (1e-4 * NA)));   // dL/dlambda at the arc start
  const LpD = Lw.clone().sub(Lw0).multiplyScalar(1 / Lp);
  // nominal path (lambda = metres): push line, arc, tangent line; C1 blends (smootherstep) across the push->arc junction
  const S5 = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10);
  const nomP = (lam, P) => {
    const pushP = Pw0.clone().addScaledVector(Dp, lam);
    const l = lam - Lp; let arc;
    if (l < 0) arc = P0.clone().addScaledVector(T0, l); else if (l <= Larc) arc = arcP(sOfLen(l)); else arc = P1.clone().addScaledVector(T1, l - Larc);
    const w = S5((l + blend) / (2 * blend)); return P.copy(pushP).lerp(arc, w);
  };
  const nomL = (lam, L) => {
    const pushL = Lw0.clone().addScaledVector(LpD, lam);
    const l = lam - Lp; let arc;
    if (l < 0) arc = Lw.clone().addScaledVector(LaD0, l); else if (l <= Larc) arc = arcL(g(sOfLen(l))); else arc = Ls.clone();
    const w = S5((l + blend) / (2 * blend)); return L.copy(pushL).lerp(arc, w);
  };
  // true arc length of the blended path -> lambda(mu)
  const lamEnd = Lp + Larc + 6, NN = 8000, lamT = new Float64Array(NN + 1), muT = new Float64Array(NN + 1); const q = V(0, 0, 0), qp = V(0, 0, 0); nomP(0, qp);
  for (let i = 1; i <= NN; i++) { const lam = lamEnd * i / NN; nomP(lam, q); lamT[i] = lam; muT[i] = muT[i - 1] + q.distanceTo(qp); qp.copy(q); }
  const lamOfMu = mu => { if (mu <= 0) return mu; if (mu >= muT[NN]) return lamEnd + (mu - muT[NN]); let a = 0, b = NN; while (b - a > 1) { const m = (a + b) >> 1; if (muT[m] < mu) a = m; else b = m; } return lamT[a] + (lamT[b] - lamT[a]) * (mu - muT[a]) / (muT[b] - muT[a]); };
  const muLand = (() => { let a = 0, b = NN; const target = Lp + Larc; while (b - a > 1) { const m = (a + b) >> 1; if (lamT[m] < target) a = m; else b = m; } return muT[a] + (muT[b] - muT[a]) * (target - lamT[a]) / (lamT[b] - lamT[a]); })();
  // speed profile (m/s along the true path): vA push -> smootherstep ramp -> plateau vP -> soft exponential landing (no hard stop,
  // relative deceleration bounded) that settles into the vB lee drift. vP is solved so the camera passes the end of the arc at Tb.
  const { Tr, Tu, tau, eps } = cfg;
  const shape = (t, vP) => { if (t <= Ta) return vA; if (t <= Ta + Tr) return vA * Math.pow(vP / vA, S5((t - Ta) / Tr)); if (t <= Tu) return vP; const x = t - Tu; return vB + (vP - vB) * Math.exp(-(Math.sqrt(x * x + eps * eps) - eps) / tau); };
  const DT = 1 / 600, NT = Math.ceil((7.5 + .5) / DT); const integ = vP => { const d = new Float64Array(NT + 1); for (let i = 1; i <= NT; i++) { const t = -.5 + i * DT; d[i] = d[i - 1] + .5 * DT * (shape(t - DT, vP) + shape(t, vP)); } return d; };
  const iB = Math.round((Tb + .5) / DT); let lo = vA, hi = 200; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (integ(m)[iB] < muLand) lo = m; else hi = m; } const vP = (lo + hi) / 2;
  const dTab = integ(vP);
  const dist = t => { const x = (t + .5) / DT; if (x <= 0) return vA * (t + .5); if (x >= NT) return dTab[NT] + vB * (t - (-.5 + NT * DT)); const i = Math.floor(x), f = x - i; return dTab[i] + (dTab[i + 1] - dTab[i]) * f; };
  return { at(t, P, L) { const lam = lamOfMu(dist(t)); nomP(lam, P); nomL(lam, L); return lam; } };
}

// Bilateral low-pass of a (non-indexed) mesh's vertex normals: Gaussian over radius r, only between similarly oriented vertices
// (dot > minDot), so strata, bevels and joints keep their creases while the fine corrugation that the low raking sun turned into
// regular vertical light/dark bands on every bed is ironed out. Geometry (silhouette, shadows) is unchanged.
function smoothNormals(geo, r = .24, minDot = .75) {
  const p = geo.attributes.position, nr = geo.attributes.normal, N = p.count;
  const map = new Map(), E = [], ent = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = nr.getX(i), b = nr.getY(i), c = nr.getZ(i);
    const k = Math.round(x * 500) + ',' + Math.round(y * 500) + ',' + Math.round(z * 500) + ',' + Math.round(a * 2) + ',' + Math.round(b * 2) + ',' + Math.round(c * 2);
    let e = map.get(k); if (e === undefined) { e = E.length / 6; map.set(k, e); E.push(x, y, z, 0, 0, 0); }
    E[e * 6 + 3] += a; E[e * 6 + 4] += b; E[e * 6 + 5] += c; ent[i] = e;
  }
  const M = E.length / 6; for (let e = 0; e < M; e++) { const l = Math.hypot(E[e * 6 + 3], E[e * 6 + 4], E[e * 6 + 5]) || 1; E[e * 6 + 3] /= l; E[e * 6 + 4] /= l; E[e * 6 + 5] /= l; }
  const grid = new Map(), cell = r; const ck = (x, y, z) => x + ',' + y + ',' + z;
  for (let e = 0; e < M; e++) { const k = ck(Math.floor(E[e * 6] / cell), Math.floor(E[e * 6 + 1] / cell), Math.floor(E[e * 6 + 2] / cell)); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(e); }
  const out = new Float32Array(M * 3), s2 = 2 * (r * .5) * (r * .5);
  for (let e = 0; e < M; e++) {
    const x = E[e * 6], y = E[e * 6 + 1], z = E[e * 6 + 2], a = E[e * 6 + 3], b = E[e * 6 + 4], c = E[e * 6 + 5]; let sx = 0, sy = 0, sz = 0;
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell), gz = Math.floor(z / cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const l = grid.get(ck(gx + i, gy + j, gz + k)); if (!l) continue;
      for (const f of l) { const fa = E[f * 6 + 3], fb = E[f * 6 + 4], fc = E[f * 6 + 5]; if (a * fa + b * fb + c * fc < minDot) continue; const dx = E[f * 6] - x, dy = E[f * 6 + 1] - y, dz = E[f * 6 + 2] - z, d2 = dx * dx + dy * dy + dz * dz; if (d2 > r * r) continue; const w = Math.exp(-d2 / s2); sx += fa * w; sy += fb * w; sz += fc * w; } }
    const l = Math.hypot(sx, sy, sz) || 1; out[e * 3] = sx / l; out[e * 3 + 1] = sy / l; out[e * 3 + 2] = sz / l;
  }
  for (let i = 0; i < N; i++) { const e = ent[i]; nr.setXYZ(i, out[e * 3], out[e * 3 + 1], out[e * 3 + 2]); }
  nr.needsUpdate = true;
}

let R = {};
const STORM = { contrast: 1.12, saturation: 1.06, warmth: 0.06, lift: [0.025, 0.01, 0.012], gain: [1.05, 0.95, 0.87] };
const CALM = { contrast: 1.08, saturation: .98, warmth: 0.03, lift: [0.02, 0.017, 0.026], gain: [1.05, 1.035, 0.87] };
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
    R.fill = new THREE.DirectionalLight('#98a6d6', .45); R.fill.position.set(8, 9, -12); scene.add(R.fill);   // cool skylight from the clear anti-sun sky: lifts and cools the shaded sides

    // ground + far ridges on two horizons
    const sandMat = M.MAT.sand({ a: '#dca674', b: '#b07a4c', repeat: [300 / 2.4, 300 / 2.4] }); sandMat.normalScale.set(.6, .6);
    const ground = M.dunes({ size: 300, seg: 220, height: 2.0, seed: 23, flatCenter: 46, flatAt: [0, 0], material: sandMat });
    scene.add(ground); const gh = (x, z) => ground.userData.heightAt(x, z); R.gh = gh;
    const rgA = C.ridge({ width: 1000, depth: 240, height: 70, seed: 5, color: '#8e4c36', top: '#a4624a' }); rgA.position.set(430, -3, 0); rgA.rotation.y = -Math.PI / 2; scene.add(rgA);
    const rgB = C.ridge({ width: 1000, depth: 240, height: 55, seed: 9, color: '#9a5a40', top: '#b4745a' }); rgB.position.set(-60, -3, 460); rgB.rotation.y = Math.PI; scene.add(rgB);

    // THE ROCK: wide layered red-sandstone massif, long axis along Z; the storm comes from -X
    const rock = C.sandstoneMassif({ a: 7, c: 10, n: 3, K: 720, layers: 11, height: 8.6, bury: .6, seed: 11, fissures: 8, bevelT: .03, bevelS: .028, steps: 6, lip: 0, rough: .11, thinBeds: true, softK: 1.8 });
    rock.children.forEach(m => smoothNormals(m.geometry, .24, .75)); scene.add(rock); rock.updateMatrixWorld(true); R.rock = rock; const H = rock.userData.height; const R0 = rock.userData.R0;
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
    sword.position.set(SW[0], gh(...SW) - .1, SW[1]); sword.rotation.order = 'YXZ'; sword.rotation.set(-.025, ry, .028); /* leans back ~1.5°: the flats catch the sky, not just sand */ scene.add(sword); sword.updateMatrixWorld(true); R.sword = sword;

    { // the two points are driven into the sand: a low rim of displaced sand around the entry + contact darkening. Same material and
      // the ground's own UV mapping (u = x/300+.5, v = .5-z/300), so ripples/colour run continuously into it; polygonOffset avoids rim z-fight
      const mg = new THREE.RingGeometry(.004, .36, 72, 30); mg.rotateX(-Math.PI / 2);
      const ax = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);   // blade width axis (the prongs sit along it)
      const p = mg.attributes.position, uv = mg.attributes.uv, col = new Float32Array(p.count * 3); const mr = U.rng(57);
      for (let i = 0; i < p.count; i++) {
        const lx = p.getX(i), lz = p.getZ(i); const a = lx * ax.x + lz * ax.z, b = -lx * ax.z + lz * ax.x;   // along / across the blade width
        const re = Math.hypot(a / 1.35, b);   // elliptical radius, a little longer along the width (two prongs)
        const ang = Math.atan2(b, a); const jag = 1 + .18 * Math.sin(ang * 3 + 1.3) + .1 * Math.sin(ang * 7 + mr() * .2);
        const rim = .026 * Math.exp(-Math.pow((re - .055) / (.05 * jag), 2)) * (1 - U.smoothstep(.2, .34, Math.hypot(lx, lz)));
        const x = SW[0] + lx, z = SW[1] + lz; p.setXYZ(i, x, gh(x, z) + rim - .004 * Math.exp(-Math.pow(re / .03, 2)), z);
        uv.setXY(i, x / 300 + .5, .5 - z / 300);
        const ao = 1 - .42 * Math.exp(-Math.pow(re / .07, 2)) - .1 * Math.exp(-Math.pow(re / .16, 2)); col[i * 3] = ao; col[i * 3 + 1] = ao * .97; col[i * 3 + 2] = ao * .95;
      }
      mg.setAttribute('color', new THREE.BufferAttribute(col, 3)); mg.computeVertexNormals();
      const mm = sandMat.clone(); mm.vertexColors = true; mm.polygonOffset = true; mm.polygonOffsetFactor = -2; mm.polygonOffsetUnits = -2;
      const mound = new THREE.Mesh(mg, mm); mound.receiveShadow = true; scene.add(mound); R.mound = mound;
    }

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
        C.sparkBurst(sparks, { p: I.point.toArray(), dir: refl.toArray(), t0: t, n: big ? sparkN * 1.6 : sparkN, speed: big ? [4, 13] : [3, 8], spread: .7, life: [.2, big ? .9 : .55], w: big ? .03 : .02, seed: 100 + arrows.length, color: '#ffd28a', i: big ? 6 : 4 });
        pf.push({ p: I.point.clone().addScaledVector(n, .2).toArray(), t0: t, life: big ? 1.8 : 1.2, s0: .25, s1: big ? 2.8 : 1.3, v: [n.x * 1.4, .8, n.z * 1.4], a: big ? .6 : .38, color: '#e6b088' });
        if (big) pf.push({ p: I.point.clone().addScaledVector(n, .1).toArray(), t0: t + .02, life: .5, s0: .3, s1: 1.2, v: [n.x * 2.5, .4, n.z * 2.5], a: .55, color: '#f4c89a' });
        const nc = big ? 16 : 5; const cr = U.rng(500 + arrows.length);
        for (let k = 0; k < nc; k++) { const v = refl.clone().multiplyScalar(2 + cr() * (big ? 5 : 3)).add(new THREE.Vector3((cr() - .5) * 2, cr() * 2, (cr() - .5) * 2)); chips.push({ p: I.point.clone().addScaledVector(n, .05).toArray(), v: v.toArray(), t0: t, s: (big ? .06 : .035) + cr() * (big ? .09 : .045), spin: [cr() - .5, cr() - .5, cr() - .5], w: 10 + cr() * 20 }); }
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
      const zz = [5.4, 2.9, 6.7, 1.9, 4.2][k], yy = [1.32, 1.5, 1.22, 1.42, 1.3][k];
      ray.set(new THREE.Vector3(16, yy, zz), new THREE.Vector3(-1, 0, 0)); const I = ray.intersectObject(rock, true)[0]; if (!I) continue;
      const p = I.point.clone().add(new THREE.Vector3(.06, 0, 0)); const gr = U.rng(700 + k);
      for (let j = 0; j < 46; j++) grains.push({ p: [p.x + gr() * .05, p.y - gr() * .06, p.z + (gr() - .5) * .35], v: [.25 + gr() * .55, -gr() * .4, (gr() - .5) * .2], t0: tk + .04 + gr() * .3, life: .75 + gr() * .3, w: .006 + gr() * .006, len: -1, color: gr() < .5 ? '#c68c5c' : '#a86c46', a: .5, drag: .4 });
      pf.push({ p: p.toArray(), t0: tk + .02, life: 1.3, s0: .15, s1: .8, v: [.5, -.25, 0], a: .32, color: '#e8b488' });
      pf.push({ p: [p.x + .5, gh(p.x + .5, p.z) + .15, p.z], t0: tk + .75, life: 1.2, s0: .15, s1: .7, v: [.4, .15, 0], a: .25, color: '#e0aa80' }); }
    // plus a thinner stream over the top through the storm part
    for (let i = 0; i < 46; i++) { const t = -.4 + ar() * 7.2; const x = 40 + ar() * 25, z = -10 + ar() * 22; arrows.push({ L: new THREE.Vector3(x, gh(x, z), z), vL: C.landingVel(Math.PI / 2 + (ar() - .5) * .3, .3 + ar() * .15, 46), tL: t + 1.1, flight: 2.6, mode: 'pass', ground: gh }); }
    R.volley = C.arrowVolley(arrows, { seed: 21, arrow: { thick: 1.5, fletch: '#8a7058', fletch2: '#3e2c20' } }); scene.add(R.volley.group);
    R.trails = C.streaks(R.volley.trails({ w: .05, len: 2.4, color: '#ffe8d0', a: .5 }).filter(it => it.t0 > -3), { fadeIn: .02, fadeOut: .97, fog: fogO }); scene.add(R.trails);
    R.sparks = C.streaks(sparks, { gravity: [0, -9.8, 0], shutter: .035, additive: true, cool: '#a02a08', fadeIn: .01, fadeOut: .55 }); scene.add(R.sparks);
    { // camera-motion smear for the sparks: a spark is only a few px wide, so during the whip its sub-frame copies stay separate
      // (a comb) even at 12 samples. Each sub-frame copy is therefore stretched on screen over the path the camera sweeps during
      // its own slice of the shutter (view-projection at both ends of the slice), with its intensity scaled by the area ratio
      // (energy conserved) -> the copies tile into one continuous streak. No effect when the camera is (nearly) still.
      const m = R.sparks.material, u = m.uniforms;
      Object.assign(u, { uVP0: { value: new THREE.Matrix4() }, uVP1: { value: new THREE.Matrix4() }, uSmear: { value: 0 }, uRes: { value: new THREE.Vector2(1080, 1920) } });
      const tgt = 'gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.);'; if (!m.vertexShader.includes(tgt)) throw new Error('s08: spark shader patch target missing');
      const ftg = 'float a = vA * (1. - vU*vU) * pow(vAl, 1.4);'; if (!m.fragmentShader.includes(ftg)) throw new Error('s08: spark fragment patch target missing');
      m.fragmentShader = 'varying float vK, vQ;\n' + m.fragmentShader.replace(ftg, 'float a = vA * mix(1. - vU*vU, clamp((1. - abs(vU)) * vK, 0., 1.), vQ) * pow(vAl, 1.4);');
      m.vertexShader = 'uniform mat4 uVP0, uVP1; uniform float uSmear; uniform vec2 uRes; varying float vK, vQ;\n' + m.vertexShader.replace(tgt, `
        mat4 VPc = projectionMatrix * viewMatrix; gl_Position = VPc * vec4(wp, 1.); vK = 1.; vQ = 0.;
        if (uSmear > .5) {
          vec3 c = wp - side * position.x * aT.z; vec4 cc = VPc * vec4(c, 1.), ch = VPc * vec4(p, 1.), ct = VPc * vec4(p - dir * L, 1.), cs = VPc * vec4(c + side * aT.z, 1.);
          vec4 a0 = uVP0 * vec4(c, 1.), a1 = uVP1 * vec4(c, 1.);
          if (cc.w > .05 && ch.w > .05 && ct.w > .05 && cs.w > .05 && a0.w > .05 && a1.w > .05) {
            vec2 hr = .5 * uRes, n0 = cc.xy / cc.w;
            vec2 dpx = (ch.xy / ch.w - ct.xy / ct.w) * hr, spx = (cs.xy / cs.w - n0) * hr, mpx = (a1.xy / a1.w - a0.xy / a0.w) * hr;
            if (dot(mpx, spx) < 0.) mpx = -mpx;   // the smear segment is symmetric: orient it with the width so they add
            if (length(dpx) < 1.) dpx = vec2(-spx.y, spx.x) / max(length(spx), 1e-4);
            vec2 sw = spx + mpx; float dl = max(length(dpx), 1e-4);
            float S = abs(dpx.x * spx.y - dpx.y * spx.x) / dl, Wd = max(abs(dpx.x * sw.y - dpx.y * sw.x) / dl, 1e-4), M = max(Wd - S, 0.);
            // across the streak: spark profile (width S) convolved with the slice's sweep (M) = trapezoid; neighbouring slices'
            // trapezoids sum to a flat band. Energy per copy kept equal to the unsmeared parabola (2/3 S).
            float Rr = max(min(M, S), 1e-3); vK = .5 * Wd / Rr; vQ = smoothstep(0., 1., M / max(S, 1e-3));
            float area = mix(2. / 3. * Wd, Wd - min(M, S), vQ); vA *= clamp(2. / 3. * S / max(area, 1e-4), 0., 1.);
            gl_Position = vec4((n0 + position.x * sw / hr) * cc.w, cc.z, cc.w);
          }
        }`);
      m.needsUpdate = true; u.uRes.value.set(ctx.W, ctx.H);
    }
    R.grains = C.streaks(grains, { gravity: [0, -9.8, 0], shutter: .013, fadeIn: .05, fadeOut: .8 }); scene.add(R.grains);
    R.chips = C.debris(chips, { ground: gh, palette: ['#c47a4e', '#a85c3a', '#dba274'], seed: 9 }); scene.add(R.chips.mesh);
    // dust surge slamming into the face on "aleyhissalatü" and boiling up over the top
    for (let i = 0; i < 34; i++) { const z = -8 + ar() * 16, y = .6 + ar() * 6; const t = tAl - .3 + ar() * .7; pf.push({ p: [-7.6 - ar() * 3, y, z], t0: t, life: 1.6 + ar() * .8, s0: 1.6, s1: 5 + ar() * 3, v: [.4, 3.2 + ar() * 2, (ar() - .5) * 1.5], a: .45, color: '#e2a878' }); }
    R.puffs = C.puffs(pf, { sunDir: sunDir.toArray(), litMul: 1.25, shadeMul: .72 }); scene.add(R.puffs);

    // storm dust: streams in from -X, lifted over the rock; ground sheets + sand on the windward side; a high dust river over the lee
    R.storm = C.dustField({ count: 76, center: [-14, 3.6, 0], box: [60, 7.5, 40], size: [3, 8], wind: [8, 0, 0], swirl: .5, shade: '#6a2c18', lit: '#f6a060', sunDir: sunDir.toArray(), opacity: .3, nearFade: 4, scatter: 1.4, seed: 4, fog: fogO, yMin: 0, flow: [-7, H, 10, 1] });
    R.sheets = C.dustField({ count: 44, center: [-19, .6, 0], box: [26, .9, 40], size: [1.2, 3], wind: [9, 0, 0], swirl: .2, shade: '#7a3a20', lit: '#ee9050', sunDir: sunDir.toArray(), opacity: .22, nearFade: 3, scatter: 1.4, seed: 5, fog: fogO, yMin: 0 });
    R.highStream = C.dustField({ count: 24, center: [16, 10.5, 24], box: [70, 5, 18], size: [5, 11], wind: [10, 0, 0], swirl: .5, shade: '#9a5a3a', lit: '#ffc890', sunDir: sunDir.toArray(), opacity: .2, nearFade: 6, scatter: 1.6, seed: 6, yMin: 0 });
    scene.add(R.storm, R.sheets, R.highStream);
    R.drift = C.sandDrift({ ground: gh, center: [-16, 0, 0], size: [26, 44], layers: [[.01, 1, 1], [.025, .7, 1.2], [.05, .35, 1.4]], wind: [1, .03], speed: 8, opacity: .36, density: .45, lit: '#f6aa6a', shade: '#7a3a1e', sunDir: sunDir.toArray(), scatter: 1.2, nearFade: 3, farFade: 30, fog: fogO }); scene.add(R.drift);
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
    scene.environment = C.envFromScene(renderer, scene, [SW[0], .8, SW[1]], [sword, R.storm, R.sheets, R.highStream, R.drift, R.motes, R.haze, R.puffs, R.sparks, R.trails, R.volley.group, R.chips.mesh, R.grains, ...R.shafts]); sword.userData.steel.envMap = C.steelEnv(renderer, { keyDir: sunDir.toArray() }); sword.userData.steel.envMapIntensity = .92; sword.userData.steel.color.set('#dce6f2'); sword.userData.steel.needsUpdate = true; /* clean polished steel, cooler than the warm scene */
    scene.fog.density = fd0; scene.fog.color.copy(R.fogStorm); sky.userData.uniforms.sunI.value = 5; scene.remove(card);

    camera.fov = 36; camera.near = .05; camera.far = 1500; camera.updateProjectionMatrix();
    // windward (low, -Z flank, face raked by the sun) -> push -> whip around the -Z end ("arkasına") -> settle in the lee by "sığındıklarını"
    R.cam = buildCam({ O: [0, -10], A0P: [-19.5, -16.6], A1P: [14.95, 2.1], h0: 2.1, h1: 1.7, dip: 6, lift: 1.4,
      Pw0: new THREE.Vector3(-27.5, 1.55, -18.4), Lw0: new THREE.Vector3(-6, 4.4, -1), Lw: new THREE.Vector3(-6.4, 3.4, -2.8), Lm: new THREE.Vector3(10, 2.6, -17), Ls: new THREE.Vector3(9.55, .72, 4.62),
      Ta: 1.0, Tr: 1.2, Tu: 2.8, Tb: 3.9, vA: 3.7, vB: .3, tau: .24, eps: .15, sigK: .85, blend: 4 });
    R.P = new THREE.Vector3(); R.L = new THREE.Vector3();
    // full camera pose (path + hand-held shake + impact jolts + fov + roll) as a pure function of t, for any camera
    R.pose = (t, cam, P, L) => {
      const calm = U.smoothstep(2.5, 3.45, t);
      R.cam.at(t, P, L);
      const sh = U.shake(t, U.lerp(.035, .006, calm), U.lerp(1.2, .45, calm), 5);
      // jolts on the big impacts (the camera flinches; the rock never moves)
      let jolt = 0; for (const h of R.hits) { if (h.big && t > h.t) jolt += Math.exp(-(t - h.t) * 9) * Math.sin((t - h.t) * 50) * (1 - calm); }
      cam.position.copy(P).add(sh); cam.position.y = Math.max(cam.position.y, gh(cam.position.x, cam.position.z) + .5) + jolt * .04;
      cam.fov = U.lerp(36, 33.5, calm); cam.updateProjectionMatrix(); cam.lookAt(L); cam.rotateZ(U.lerp(-.03, .008, calm) + sh.x * .3); cam.updateMatrixWorld(true);
    };
    // motion-blur budget follows the on-screen motion: probe points on the massif + the sand around it are projected at both ends
    // of the shutter; the sub-frame count keeps the spacing between sub-frame copies near MB_GAP px (full-res), so during the
    // whip the copies of rock edges and sparks merge into one continuous streak instead of stair-stepped duplicates.
    { const pr = U.rng(77), pts = []; let nv = 0; rock.traverse(m => { if (m.isMesh) nv += m.geometry.attributes.position.count; }); const step = Math.max(1, Math.round(nv / 1600));
      rock.traverse(m => { if (!m.isMesh) return; const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i += step) pts.push(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(m.matrixWorld)); });
      for (let i = 0; i < 160; i++) { const x = -32 + pr() * 50, z = -26 + pr() * 40; pts.push(new THREE.Vector3(x, gh(x, z), z)); }
      R.mbPts = pts; R.mbA = pts.map(() => new THREE.Vector3()); R.mbD = new Float32Array(pts.length); }
    R.pc = camera.clone(); R.pP = new THREE.Vector3(); R.pL = new THREE.Vector3();
    R.mbFps = +(new URLSearchParams(globalThis.location?.search ?? '').get('fps') || 30);
  },
  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    R.volley.update(t); R.chips.update(t);
    const calm = U.smoothstep(2.5, 3.45, t), transit = U.smoothstep(1.6, 2.2, t) * (1 - calm);
    // motion blur: a base budget while arrows strike / the camera lands (the calm lee renders single-sample), raised by the
    // measured screen motion during the whip (up to MB_MAX sub-frames at its peak)
    const MB_SHUT = .5, MB_GAP = 5.5, MB_MAX = 12;
    const base = t < 1.9 ? 3 : t < 2.15 ? 4 : t < 3.25 ? 5 : t < 3.55 ? 4 : t < 3.85 ? 3 : t < 4.1 ? 2 : 1;
    const dsh = MB_SHUT / R.mbFps / 2; let nd = 0;
    R.pose(t - dsh, R.pc, R.pP, R.pL); R.mbPts.forEach((p, i) => R.mbA[i].copy(p).project(R.pc));
    R.pose(t + dsh, R.pc, R.pP, R.pL);
    R.mbPts.forEach((p, i) => { const a = R.mbA[i]; if (a.z > 1 || Math.abs(a.x) > 1 || Math.abs(a.y) > 1) return; const b = p.clone().project(R.pc); if (b.z > 1) return; R.mbD[nd++] = Math.hypot((b.x - a.x) * 540, (b.y - a.y) * 960); });
    const dd = R.mbD.subarray(0, nd).sort(); const d90 = nd ? dd[Math.min(nd - 1, Math.floor(nd * .9))] : 0;
    const nS = Math.min(MB_MAX, Math.max(base, Math.ceil(d90 / MB_GAP))); post.motionBlur = { samples: nS, shutter: MB_SHUT };
    // the engine reads the sample count once per frame (first update at the frame time t), then calls update(ti) per sub-frame
    // within +-shutter/2: remember the frame's count so each sub-frame knows its slice of the shutter for the spark smear
    const shT = MB_SHUT / R.mbFps; if (R.frameT === undefined || Math.abs(t - R.frameT) > shT / 2 + 1e-6) { R.frameT = t; R.frameN = nS; }
    { const su = R.sparks.material.uniforms; su.uSmear.value = R.frameN > 1 ? 1 : 0;
      if (R.frameN > 1) { const ds = shT / R.frameN / 2;
        R.pose(t - ds, R.pc, R.pP, R.pL); su.uVP0.value.multiplyMatrices(R.pc.projectionMatrix, R.pc.matrixWorldInverse);
        R.pose(t + ds, R.pc, R.pP, R.pL); su.uVP1.value.multiplyMatrices(R.pc.projectionMatrix, R.pc.matrixWorldInverse); } }
    // camera
    R.pose(t, camera, R.P, R.L);
    // spark flash light follows the latest impact
    let fi = 0, fp = null; for (const h of R.hits) { const a = t - h.t; if (a >= 0 && a < .3) { const v = Math.exp(-a * 12) * (h.big ? 2.4 : 1.1); if (v > fi) { fi = v; fp = h.p; } } }
    if (fp) R.flash.position.copy(fp); R.flash.intensity = 2.2 * fi * (1 - calm);
    // grade / atmosphere: storm side -> calm, sunlit lee
    for (const k of ['contrast', 'saturation', 'warmth']) post.grade[k] = U.lerp(STORM[k], CALM[k], calm);
    post.grade.lift = STORM.lift.map((v, i) => U.lerp(v, CALM.lift[i], calm)); post.grade.gain = STORM.gain.map((v, i) => U.lerp(v, CALM.gain[i], calm));
    ctx.scene.fog.density = U.lerp(.016, .0075, calm); ctx.scene.fog.color.copy(R.fogStorm).lerp(R.fogCalm, calm);
    R.hemi.color.copy(R.hemiA).lerp(R.hemiB, calm); R.hemi.intensity = U.lerp(.6, .55, calm); R.sun.intensity = U.lerp(3.4, 4.2, calm); R.sun.color.copy(R.sunA).lerp(R.sunB, calm);
    R.sky.userData.uniforms.dark.value = .4 * (1 - calm); R.bounce.intensity = 1.1 * calm; R.sky.userData.uniforms.storm.value = U.lerp(.8, .25, calm);
    post.vignette = U.lerp(.55, .42, calm); post.exposure = 1 + .18 * calm + .24 * transit; R.fill.intensity = U.lerp(.45, .3, calm) + .25 * transit;
    const fd = camera.position.distanceTo(calm > .5 ? R.swPos.clone().setY(R.swPos.y + .62) : R.L);
    post.dof.focus = fd; post.dof.range = U.lerp(14, 7, calm); post.dof.amount = U.lerp(.25, .34, calm);
    R.motes.material.uniforms.master.value = U.smoothstep(2.7, 3.5, t); R.shafts.forEach((sh, i) => { sh.userData.uniforms.opacity.value = sh.userData.op * calm * (.85 + .15 * Math.sin(t * .9 + i * 1.7)); }); R.haze.userData.uniforms.master.value = calm;
    R.drift.userData.uniforms.master.value = 1 - calm; R.sheets.userData.uniforms.master.value = 1 - calm * .8;

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
