// s13 (70.45–77.75) "tarihin şehadetiyle, düşmanları bile kabul ediyor ki en yüksek ve yetişilemeyecek derecedeydi."
// Visual: blue-hour above a sea of clouds. A tall stack of old history chronicles + sealed scrolls rests on a rock ledge
// ("tarihin şehadeti"). On "düşmanları bile kabul ediyor" the camera cranes up past the stack and opens onto a field of
// rock towers rising out of the clouds — ladders and carved stairs climb the lower towers and stop at their tops — while ONE
// summit, far above all, is the only thing already touched by the sunrise (physically: first light hits the highest peak).
// "en yüksek derece" callout on the summit, big "YETİŞİLEMEZ" on "yetişilemeyecek".
import * as THREE from 'three';
import { camPath, aim, scroll } from '../engine/lib/extra_F.js';

let R = {};

// ---- tileable rock-face detail texture (vertical water streaks, bedding lines, joints/cracks) ----------------------
function rockTex(ctx) {
  const { TEX, U } = ctx; const N = 512, R = U.rng(901);
  const sinSum = (count, kmin, kmax, seed) => { const r = U.rng(seed); const T = []; for (let i = 0; i < count; i++) T.push([kmin + Math.floor(r() * (kmax - kmin)), r() * 6.283, r() * .8 + .2]); const nrm = T.reduce((a, t) => a + t[2], 0); const tab = new Float32Array(N); for (let i = 0; i < N; i++) { const u = i / N; tab[i] = T.reduce((a, [k, p, am]) => a + am * Math.sin(6.283 * k * u + p), 0) / nrm; } return tab; };
  const st1 = sinSum(12, 2, 24, 11), st2 = sinSum(8, 1, 5, 12), wav = sinSum(6, 1, 5, 13);
  const beds = [...Array(4)].map((_, i) => [(i + R() * .7) / 4, .004 + R() * .006, .3 + R() * .7]);
  const cracks = [...Array(4)].map((_, i) => [R(), sinSum(5, 1, 4, 40 + i), .002 + R() * .003, sinSum(4, 1, 3, 60 + i)]);
  const fine = TEX.fbmField(905, 32, 3), mid = TEX.fbmField(906, 6, 5), blot = TEX.fbmField(907, 12, 4);
  const b = TEX.bake(N, (u, v) => { const iu = Math.floor(u * N) % N, iv = Math.floor(v * N) % N;
    const s = st1[iu] * (.65 + .35 * st2[iv]);
    let bed = 0; for (const [bv, bw, bs] of beds) { const d = Math.abs(((v - bv - wav[iu] * .03) % 1 + 1.5) % 1 - .5); bed = Math.max(bed, Math.max(0, 1 - d / bw) * bs * (.5 + .5 * st2[iu])); }
    let cr = 0; for (const [cu, w, wd, vis] of cracks) { const d = Math.abs(((u - cu - w[iv] * .04) % 1 + 1.5) % 1 - .5); cr = Math.max(cr, Math.max(0, 1 - d / wd) * U.clamp(vis[iv] * 2)); }
    const f = fine(u, v) * .5 + .5, m = mid(u, v) * .5 + .5;
    const bl = blot(u, v) * .5 + .5, bk = Math.abs(mid(u * 1.0 + .3, v * 1.0)) ; const blocky = Math.floor((m + bl) * 3) / 3;
    const h = .5 + .14 * s + .3 * (m - .5) + .25 * (blocky - .5) + .08 * (f - .5) - .12 * bed - .4 * cr;
    const g = .8 + .12 * s + .25 * (m - .5) + .18 * (bl - .5) + .06 * (f - .5) - .1 * bed - .28 * cr - .12 * bk;
    return { c: [g, g * .975, g * .95], h, r: .9 }; }, { normalStrength: 4.5 });
  return { map: TEX.texFromCanvas(b.colorCanvas, { aniso: 8 }), normalMap: TEX.texFromCanvas(b.normalCanvas, { srgb: false, aniso: 8 }) };
}

// ---- grid helpers ----------------------------------------------------------------------------------------------------
// rows: array of functions th -> [r, y] (bottom to top); last row collapses to the apex/centre. Returns indexed geometry.
function radialGrid(segR, rows, cx, cz, off) {
  const C1 = segR + 1, pos = [], uvs = [], idx = [];
  rows.forEach((row, j) => { for (let k = 0; k <= segR; k++) { const th = k / segR * Math.PI * 2; const [r, y, dx = 0, dz = 0] = row(th, k); pos.push(cx + Math.cos(th) * r + dx, y, cz + Math.sin(th) * r + dz); uvs.push(k / segR, j / rows.length); } });
  for (let j = 0; j < rows.length - 1; j++) for (let k = 0; k < segR; k++) { const a = j * C1 + k, b = a + 1, c = a + C1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const Nn = geo.attributes.normal; for (let j = 0; j < rows.length; j++) { const a = j * C1, b = j * C1 + segR; const nx = Nn.getX(a) + Nn.getX(b), ny = Nn.getY(a) + Nn.getY(b), nz = Nn.getZ(a) + Nn.getZ(b), l = Math.hypot(nx, ny, nz) || 1; Nn.setXYZ(a, nx / l, ny / l, nz / l); Nn.setXYZ(b, nx / l, ny / l, nz / l); }
  { const j = rows.length - 1; let nx = 0, ny = 0, nz = 0; for (let k = 0; k <= segR; k++) { const i = j * C1 + k; nx += Nn.getX(i); ny += Nn.getY(i); nz += Nn.getZ(i); } const l = Math.hypot(nx, ny, nz) || 1; for (let k = 0; k <= segR; k++) Nn.setXYZ(j * C1 + k, nx / l, ny / l, nz / l); } // apex / cap centre: one shared normal (no star artefact)
  return geo;
}

// ---- sandstone pillar (Zhangjiajie-like): faceted section, deep vertical joints, stepped bedding ledges, crisp flat top ----
function tower(ctx, o) {
  const { U, TEX } = ctx; const rr = U.rng(o.seed * 7 + 1);
  const segR = o.segR ?? 168, nW = o.segY ?? 46, base = o.base ?? -125, top = o.top, R0 = o.R, H = top - base;
  const nf = 6 + Math.floor(rr() * 4); const fac = []; let a = rr() * 6.283;
  for (let i = 0; i < nf; i++) { fac.push([a, R0 * (.84 + rr() * .2)]); a += 6.283 / nf * (.65 + rr() * .7); }
  const joints = [...Array(o.joints ?? 8)].map(() => [rr() * 6.283, .035 + rr() * .05, .06 + rr() * .12]);
  const wan = TEX.fbmField(o.seed + 3, 4, 3), rough = TEX.fbmField(o.seed + 5, 16, 4), rimN = TEX.fbmField(o.seed + 9, 6, 3);
  const strata = o.strata ?? 8.5, lean = (o.lean ?? 0) * R0, la = o.seed * 2.1;
  const jointAt = (th, yN) => { let g = 0; for (const [ja, jw, jd] of joints) { const d = Math.abs((((th - ja - wan(th / 6.283, yN * .5) * .12) / 6.283) % 1 + 1.5) % 1 - .5) * 6.283; if (d < jw) g = Math.max(g, jd * Math.pow(1 - d / jw, 1.3)); } return g; };
  let noJ = false; const rAt = (th, y) => {
    let r = 1e9; for (const [fa, fd] of fac) { const c = Math.cos(th - fa); if (c > .25) r = Math.min(r, fd / c); } if (r > 1e8) r = R0;
    const yN = U.clamp((y - base) / H);
    r = U.lerp(r, R0 * (.95 + .12 * wan(th / 6.283 + .5, yN * 1.3)), .45) * (1 + .07 * wan(th / 6.283 * 2, yN * 2.2 + .3));
    if (!noJ) r *= 1 - jointAt(th, yN);
    const sy = (y - base) / strata + rough(th / 6.283, .3) * 2.5 + wan(.3, yN * 3) * 2; const fr = sy - Math.floor(sy); r *= 1 - .014 * U.smoothstep(.85, 1, fr) - .006 * (1 - fr);
    r *= 1 - (o.taper ?? .1) * yN + .12 * Math.max(0, .12 - yN) / .12 * .12;
    r *= 1 + .03 * rough(th / 6.283, yN * 3);
    return r;
  };
  const rimB = th => top + (o.rimVar ?? .06) * R0 * rimN(th / 6.283, .31) - (o.notch ?? .1) * R0 * U.smoothstep(.2, .32, rimN(th / 6.283 + .37, .77));
  const rimY = th => rimB(th) - (o.chip ?? .04) * R0 * Math.max(0, rough(th / 6.283 * 3, .62)); // chipped (broken) rim edge
  const lx = yN => Math.cos(la) * lean * yN * yN, lz = yN => Math.sin(la) * lean * yN * yN * .4;
  const rows = [];
  for (let j = 0; j <= nW; j++) { const s = 1 - Math.pow(1 - j / nW, 1.35); rows.push(th => { const yr = rimY(th), y = base + (yr - base) * s, yN = (y - base) / H; return [rAt(th, y), y, lx(yN), lz(yN)]; }); }
  const bev = Math.min(1.4, R0 * .045), dome = R0 * (o.dome ?? .09);
  rows.push(th => { const yr = rimY(th); return [rAt(th, yr) * .985 - bev * .5, yr + bev * .55, lx(1), lz(1)]; });
  rows.push(th => { const yr = rimY(th); return [rAt(th, yr) * .955 - bev, yr + bev, lx(1), lz(1)]; });
  let ySum = 0; for (let k = 0; k < 64; k++) ySum += rimY(k / 64 * 6.283); const yC = ySum / 64 + bev + dome; // single plateau-centre height (no pinwheel of apex vertices)
  const capN = o.capN ?? 8; for (let c = 1; c <= capN; c++) { const f = c / capN; rows.push(th => { const yr = rimY(th); const rj = rAt(th, yr) * .955 - bev; noJ = true; const rs = rAt(th, yr) * .955 - bev; noJ = false;
    const yE = U.lerp(yr, rimB(th), Math.min(1, f * 2.5)) + bev + dome * (1 - Math.pow(1 - f, 2)) * (1 + (o.capRough ?? .5) * (rough(th / 6.283 * 2, .9 + f * .3) - .2)); return [U.lerp(rj, rs, Math.min(1, f * 4)) * (1 - f), U.lerp(yE, yC, Math.pow(f, 3)), lx(1), lz(1)]; }); }
  const geo = radialGrid(segR, rows, o.x, o.z);
  // vertex colours: pale sandstone with darker joints / lower walls; mossy green on the plateau
  const P = geo.attributes.position, Nn = geo.attributes.normal, col = new Float32Array(P.count * 3);
  const A = new THREE.Color(o.a ?? '#a69fb0'), B = new THREE.Color(o.b ?? '#3a3248'), G = new THREE.Color(o.g ?? '#56603e'), C = new THREE.Color();
  for (let i = 0; i < P.count; i++) { const x = P.getX(i) - o.x, y = P.getY(i), z = P.getZ(i) - o.z, th = (Math.atan2(z, x) + 6.283) % 6.283, yN = U.clamp((y - base) / H);
    const jg = jointAt(th, Math.min(yN, 1)); C.copy(A).lerp(B, U.clamp(.18 + jg * 4 + (1 - yN) * .35 + rough(th / 6.283, yN * 6) * .25));
    if (y > top - R0 * .12 && Nn.getY(i) > .55) C.lerp(G, .75 * U.smoothstep(.55, .8, Nn.getY(i)));
    col.set([C.r, C.g, C.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, o.mat); m.receiveShadow = true; m.castShadow = !!o.cast;
  m.userData.rAt = rAt; m.userData.c = [o.x, o.z]; m.userData.topAt = th => rimY(th); m.userData.R = R0; m.userData.capR = th => rAt(th, rimY(th)) * .9 - bev;
  return m;
}

// ---- the great summit: a Matterhorn-like horn — four twisting aretes, concave faces cut by couloirs, snow ledges ----------
function horn(ctx, o) {
  const { U, TEX } = ctx; const segR = o.segR ?? 300, segY = o.segY ?? 220, base = o.base ?? -150, top = o.top, R0 = o.R, H = top - base;
  const f1 = TEX.fbmField(o.seed, 6, 5), f2 = TEX.fbmField(o.seed + 7, 24, 3), cou = TEX.fbmField(o.seed + 13, 20, 2);
  const prof = yN => Math.pow(Math.max(0, 1 - yN), .62) * .62 + .38 * (1 - U.smoothstep(.0, .45, yN)) * Math.pow(Math.max(0, 1 - yN), .5);
  const rid = (x, p) => Math.pow(1 - Math.abs(Math.sin(x)), p); // sharp ridged profile
  const rAt = (th, y) => { const yN = U.clamp((y - base) / H), u = th / 6.283;
    const tw = (o.phase ?? .2) + .55 * yN + .25 * f1(.13, yN * 1.5);
    const big = Math.pow(Math.abs(Math.cos(2 * (th - tw))), 3); // 4 main aretes
    const rib = rid(th * 5 + 1.3 + 2.2 * f1(u, yN * .8 + .2) + yN * 2, 3), gul = rid(th * 13 + 3 * f1(u + .4, yN * 1.2) - yN * 3, 4);
    let r = R0 * prof(yN) * (.6 + .4 * big) * (1 + .16 * rib * (1 - .5 * yN) + .06 * gul * (1 - yN * .6));
    r *= 1 + .05 * f1(u, yN * 1.6) + .025 * f2(u, yN * 4);
    const sy = (y - base) / 14 + f1(u, .4) * 3; const fr = sy - Math.floor(sy); r *= 1 - .006 * U.smoothstep(.8, 1, fr);
    return Math.max(r, 0); };
  const leanX = (o.lean ?? 0) * R0, hook = yN => Math.pow(yN, 3);
  const rows = []; for (let j = 0; j <= segY; j++) { const yN = j / segY, y = base + H * yN; rows.push(th => j === segY ? [0, y, leanX * hook(1), 0] : [rAt(th, y), y, leanX * hook(yN), 0]); }
  const geo = radialGrid(segR, rows, o.x, o.z);
  const P = geo.attributes.position, Nn = geo.attributes.normal, col = new Float32Array(P.count * 3);
  const A = new THREE.Color(o.a ?? '#8f7f86'), B = new THREE.Color(o.b ?? '#3f3542'), S = new THREE.Color('#f4e9e4'), C = new THREE.Color();
  for (let i = 0; i < P.count; i++) { const x = P.getX(i) - o.x, y = P.getY(i), z = P.getZ(i) - o.z, u = ((Math.atan2(z, x) / 6.283) % 1 + 1) % 1, yN = (y - base) / H;
    C.copy(A).lerp(B, U.clamp(.45 + f1(u * 2, yN * 5) * .6 + f2(u, yN * 3) * .3));
    const sn = U.smoothstep(.42, .62, yN + f2(u, yN * 2) * .12) * U.smoothstep(.3, .55, Nn.getY(i) + f1(u * 2, yN * 3) * .15); C.lerp(S, U.clamp(sn * 1.15));
    col.set([C.r, C.g, C.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, o.mat); m.receiveShadow = true; m.userData.rAt = rAt; m.userData.c = [o.x, o.z];
  return m;
}

// Rock material: triplanar detail, a warm side light from the glowing eastern sky, and the direct SUN only above the
// sunrise terminator height (first light on the highest peak). Snow (bright vertex colour) gets a pink-gold alpenglow.
function rockMat(UN, TEX, tex) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, metalness: 0, map: tex.map, normalMap: tex.normalMap, normalScale: new THREE.Vector2(1.5, 1.5) });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, UN);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWY; varying vec3 vWP, vWN;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz; vWY = vWP.y; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWY; varying vec3 vWP, vWN; uniform float uTerm, uSoft; uniform vec3 uSunDir, uSunCol, uEastDir, uEastCol;\nconst float TS = 1. / 34., TS2 = 1. / 151.;')
      .replace('#include <map_fragment>', `{ vec3 bw = pow(abs(normalize(vWN)), vec3(4.)); bw /= (bw.x + bw.y + bw.z);
          vec4 tx = texture2D(map, vWP.zy * TS) * bw.x + texture2D(map, vWP.xz * TS) * bw.y + texture2D(map, vWP.xy * TS) * bw.z;
          vec4 t2 = texture2D(map, vWP.zy * TS2 + .37) * bw.x + texture2D(map, vWP.xz * TS2 + .61) * bw.y + texture2D(map, vWP.xy * TS2 + .13) * bw.z; tx.rgb *= .55 + .55 * t2.rgb;
          float snowy = smoothstep(.8, .92, dot(vColor.rgb, vec3(.33))); diffuseColor.rgb *= mix(tx.rgb, vec3(1.), snowy * .85); }`)
      .replace('#include <normal_fragment_maps>', `{ vec3 wn = normalize(vWN); vec3 bw = pow(abs(wn), vec3(4.)); bw /= (bw.x + bw.y + bw.z);
          vec3 nX = texture2D(normalMap, vWP.zy * TS).xyz * 2. - 1., nY = texture2D(normalMap, vWP.xz * TS).xyz * 2. - 1., nZ = texture2D(normalMap, vWP.xy * TS).xyz * 2. - 1.;
          nX.xy *= normalScale; nY.xy *= normalScale; nZ.xy *= normalScale;
          nX = vec3(nX.xy + wn.zy, wn.x); nY = vec3(nY.xy + wn.xz, wn.y); nZ = vec3(nZ.xy + wn.xy, wn.z);
          vec3 wN = normalize(nX.zyx * bw.x + nY.xzy * bw.y + nZ.xyz * bw.z);
          normal = normalize((viewMatrix * vec4(wN, 0.)).xyz); }`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        reflectedLight.directDiffuse *= .45;
        { vec3 ev = normalize((viewMatrix * vec4(uEastDir, 0.)).xyz); float ne = dot(normal, ev);
          reflectedLight.directDiffuse += diffuseColor.rgb * uEastCol * (pow(max(ne, 0.), 1.4) * .55 + max(ne + .3, 0.) * .07);
          float fr = pow(1. - max(dot(normal, normalize(vViewPosition)), 0.), 3.); reflectedLight.directDiffuse += diffuseColor.rgb * uEastCol * fr * max(ne + .2, 0.) * .5; }
        { vec3 sv = normalize((viewMatrix * vec4(uSunDir, 0.)).xyz); float nd = max(dot(normal, sv), 0.);
          float msk = smoothstep(uTerm - uSoft, uTerm + uSoft, vWY); float edge = 1. - smoothstep(uTerm, uTerm + 22., vWY);
          vec3 sc = mix(uSunCol, uSunCol * vec3(1.15, .72, .62), edge); // redder alpenglow just above the terminator
          reflectedLight.directDiffuse += diffuseColor.rgb * sc * (nd * .9 + .12) * msk; }`);
  };
  m.customProgramCacheKey = () => 'F_rock_terminator2';
  return m;
}

// Lashed wooden ladder from point a to b (world), facing direction `out` (horizontal normal, away from the rock).
function ladder(ctx, a, b, out, o = {}) {
  const { MODELS: M } = ctx;
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B), w = o.w ?? 2.6, rail = o.rail ?? .55;
  const parts = [];
  for (const s of [-1, 1]) { const r = M.rbox(rail, L + .6, rail, .08, 1); r.translate(s * w / 2, L / 2, 0); parts.push(r); }
  const step = o.step ?? 2.0; for (let y = step * .6; y < L; y += step) { const c = new THREE.CylinderGeometry(rail * .32, rail * .32, w, 6); c.rotateZ(Math.PI / 2); c.translate(0, y, 0); parts.push(c); }
  const geo = mergeGeo(parts);
  const mesh = new THREE.Mesh(geo, o.mat ?? M.MAT.wood({ a: '#9a6a3a', b: '#5e3a1c', rings: 6 }));
  const up = B.clone().sub(A).normalize(); const outV = new THREE.Vector3(...out).normalize(); const side = new THREE.Vector3().crossVectors(up, outV).normalize(); const fwd = new THREE.Vector3().crossVectors(side, up);
  mesh.matrix.makeBasis(side, up, fwd).setPosition(A); mesh.matrixAutoUpdate = false; mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
function mergeGeo(list) {
  // minimal merge (position/normal only) to avoid an extra import
  let n = 0; list.forEach(g => { if (g.index) g = g.toNonIndexed(); n += g.attributes.position.count; });
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3); let o = 0;
  list.forEach(g0 => { const g = g0.index ? g0.toNonIndexed() : g0; P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  const uv = new Float32Array(n * 2); for (let i = 0; i < n; i++) { uv[i * 2] = P[i * 3] * .5 + P[i * 3 + 2] * .5; uv[i * 2 + 1] = P[i * 3 + 1] * .25; } geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

export default {
  post: {
    exposure: 1.05,
    bloom: { enabled: true, strength: 0.5, radius: 0.65, threshold: 0.78 },
    grade: { contrast: 1.07, saturation: 1.1, warmth: 0.0, lift: [0.015, 0.018, 0.04], gain: [1.02, 1.0, 1.0] },
    vignette: 0.42, grain: 0.03,
    dof: { enabled: true, focus: 2, range: 1.5, amount: 1 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, FX, TEX } = ctx;
    R = {};
    const HORIZ = '#9a8fbd';
    scene.fog = new THREE.FogExp2('#8f8bbb', 0.00072);
    scene.environment = await ctx.loadHDR('qwantani_dusk_2_puresky'); scene.environmentIntensity = 0.28;
    const SUN = new THREE.Vector3(0.86, 0.07, 0.5).normalize();
    const sky = ENV.skyDome({ top: '#1f3170', mid: '#7f86c4', horizon: '#e0a2a6', bottom: '#6a6aa0', sunDir: SUN.toArray(), sunColor: '#ffb07a', sunSize: 0, sunGlow: 1.0, clouds: 0.16, cloudColor: '#e3a9ae', intensity: 1.0, radius: 3000 });
    scene.add(sky); R.sky = sky;

    // lights: cool zenith sky + warm glow of the eastern sky (soft) ; the real sun only reaches above the terminator
    scene.add(new THREE.HemisphereLight('#7f8fd6', '#342f50', 0.78));
    const east = ENV.sunLight({ color: '#ffab80', intensity: 1.7, pos: SUN.clone().multiplyScalar(30).toArray(), target: [0, .4, 0], size: 2.2, mapSize: 2048, radius: 6, bias: -0.0003, normalBias: .01 });
    scene.add(east, east.target); R.east = east;
    const UN = { uTerm: { value: 70 }, uSoft: { value: 3.5 }, uSunDir: { value: SUN.clone() }, uSunCol: { value: new THREE.Color(5.6, 2.6, 1.15) }, uEastDir: { value: SUN.clone() }, uEastCol: { value: new THREE.Color(1.05, .62, .5) } };
    R.UN = UN;
    const rock = rockMat(UN, TEX, rockTex(ctx));

    // ---- cloud sea (displaced, custom-lit) -----------------------------------------------------------------
    const CS = 5200, cseg = 200; const cgeo = new THREE.PlaneGeometry(CS, CS, cseg, cseg); cgeo.rotateX(-Math.PI / 2);
    { const f = TEX.fbmField(51, 16, 5); const p = cgeo.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i) / CS + .5, v = p.getZ(i) / CS + .5; const h = f(u, v); p.setY(i, Math.pow(Math.max(0, h * .5 + .5), 1.5) * 38); } cgeo.computeVertexNormals(); }
    const cu = { time: { value: 0 }, sunDir: { value: SUN.clone() }, cLit: { value: new THREE.Color('#a7a3d6') }, cShadow: { value: new THREE.Color('#353a76') }, cPink: { value: new THREE.Color('#d98f9c') }, fogCol: { value: new THREE.Color(HORIZ) }, fogD: { value: 0.00036 }, nz: { value: TEX.noiseTex({ size: 256, seed: 93, base: 4, octaves: 5 }) } };
    const cmat = new THREE.ShaderMaterial({
      uniforms: cu,
      vertexShader: `varying vec3 vW, vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 cLit, cShadow, cPink, fogCol, sunDir; uniform float fogD, time; uniform sampler2D nz; varying vec3 vW, vN;
        void main(){ vec3 N = normalize(vN);
          float n1 = texture2D(nz, vW.xz / 210. + vec2(time * .004, 0.)).r, n2 = texture2D(nz, vW.xz / 57. - vec2(0., time * .006)).r;
          float sky = clamp(N.y * .75 - .1 + (n1 - .5) * 1.3 + (n2 - .5) * .7, 0., 1.);
          vec3 c = mix(cShadow, cLit, smoothstep(.15, .95, sky));
          float e = max(dot(N, normalize(sunDir)) + (n2 - .5) * .3, 0.); c += cPink * pow(e, 1.4) * .55;
          float d = length(cameraPosition - vW); c = mix(c, fogCol, 1. - exp(-pow(d * fogD, 1.6)));
          gl_FragColor = vec4(c, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const csea = new THREE.Mesh(cgeo, cmat); csea.position.y = -92; csea.userData.uniforms = cu; scene.add(csea);

    // ---- rock towers ------------------------------------------------------------------------------------------
    const towers = [];
    const add = (fn, o) => { const m = fn(ctx, { mat: rock, ...o }); scene.add(m); towers.push(m); return m; };
    const TA = '#a8a0b2', TB = '#342c44';
    const cluster = (o, kids) => { const rr = U.rng(o.seed); o = { lean: (rr() - .5) * .35, a: TA, b: TB, ...o }; const m = add(tower, o);
      (kids || []).forEach(([dx, dz, hk, rk], i) => add(tower, { ...o, x: o.x + dx * o.R, z: o.z + dz * o.R, top: -125 + (o.top + 125) * hk, R: o.R * rk, seed: o.seed + 50 + i, segR: 120, segY: 34, joints: 6 })); return m; };
    const G = add(horn, { x: -18, z: -600, top: 138, R: 132, seed: 11, lean: .05, phase: .25, segR: 300, segY: 230, a: '#9a8a90', b: '#3b3241' });
    R.G = G; R.summit = new THREE.Vector3(-18 + 132 * .05, 138, -600);
    R.P0 = add(tower, { x: .3, z: -1.2, top: -.45, R: 6.5, seed: 4, taper: .14, rimVar: .02, notch: .02, strata: 2.2, a: '#d4c4b2', b: '#6e6070', g: '#a8987e', segR: 140, segY: 40, capN: 16, rimVar: .02, notch: .02, dome: .02, joints: 0, capRough: 0, chip: 0 }); // our ledge tower (smooth plateau under the stack)
    const L1 = cluster({ x: -30, z: -185, top: -2, R: 15, seed: 21 }, [[.78, -.42, .82, .52], [-.62, -.5, .7, .48]]);
    const L2 = cluster({ x: 36, z: -240, top: -10, R: 14, seed: 22 }, [[-.72, -.5, .85, .5]]);
    cluster({ x: -64, z: -390, top: 8, R: 24, seed: 23 }, [[.7, .3, .8, .5], [-.5, -.6, .9, .6]]);
    cluster({ x: 62, z: -430, top: 2, R: 22, seed: 24 }, [[-.7, .2, .75, .55]]);
    cluster({ x: 12, z: -125, top: -50, R: 9, seed: 25 });
    cluster({ x: -14, z: -300, top: -32, R: 11, seed: 26 });
    cluster({ x: -92, z: -500, top: -10, R: 22, seed: 27 }, [[.6, .5, .7, .5]]);
    cluster({ x: 100, z: -540, top: 14, R: 28, seed: 28 }, [[-.6, .4, .8, .5]]);
    cluster({ x: -140, z: -300, top: 2, R: 24, seed: 29 }, [[.6, .4, .7, .55]]);
    cluster({ x: 130, z: -280, top: -6, R: 22, seed: 30 }, [[-.6, -.4, .75, .5]]);
    // distant ranges in the haze (lower, softer horns)
    [[-700, -1500, 70, 330], [-150, -1700, 40, 420], [520, -1450, 80, 380], [1100, -1300, 30, 300], [-1200, -1200, 40, 330]].forEach(([x, z, t, r], i) => add(horn, { x, z, top: t, R: r, seed: 40 + i, segR: 96, segY: 48, phase: i * .7, a: '#8a8098', b: '#4a4460' }));
    R.towers = towers;
    // small pines on the plateaus (scale cue: these pillars are hundreds of metres tall)
    { const cones = []; for (let k = 0; k < 3; k++) cones.push(new THREE.ConeGeometry(.55 - k * .14, .9, 7).translate(0, .75 + k * .5, 0)); cones.push(new THREE.CylinderGeometry(.06, .08, .7, 5).translate(0, .35, 0));
      const pg = mergeGeo(cones); const pm = new THREE.MeshStandardMaterial({ color: '#2f4a32', roughness: .9 }); const list = [];
      towers.slice(2, -5).forEach((T, ti) => { const rr = U.rng(300 + ti); const n = Math.round(Math.min(26, T.userData.R * 1.1)); for (let i = 0; i < n; i++) { const th = rr() * 6.283, f = Math.sqrt(rr()) * .92; const r = T.userData.capR(th) * f; const y = T.userData.topAt(th) - .3; list.push([T.userData.c[0] + Math.cos(th) * r, y, T.userData.c[1] + Math.sin(th) * r, (1.4 + rr() * 2.2) * Math.max(.6, T.userData.R / 16), rr() * 6.28]); } });
      const im = new THREE.InstancedMesh(pg, pm, list.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      list.forEach(([x, y, z, sc, ry], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sc, sc * (1.1 + (i % 3) * .2), sc)); im.setMatrixAt(i, m4); });
      im.receiveShadow = true; scene.add(im); }

    // ladders on L1 (lashed, two segments) and carved stairs on L2: both end at their tower's top — far below the summit
    const ladMat = M.MAT.wood({ a: '#a8743e', b: '#5e3a1c', rings: 6 });
    const camSide = th => [Math.cos(th), 0, Math.sin(th)];
    const onFace = (T, th, y, off) => { const r = T.userData.rAt(th, y) + off; return [T.userData.c[0] + Math.cos(th) * r, y, T.userData.c[1] + Math.sin(th) * r]; };
    // straight ladder from y0 to y1 on face angle th, pushed out so that it never cuts into the rock
    const ladderOn = (T, th, y0, y1, m = 1.2) => {
      const rt = T.userData.rAt(th, y1) + m; let rb = T.userData.rAt(th, y0) + m;
      for (let i = 1; i < 40; i++) { const s = i / 40; const y = y0 + (y1 - y0) * s; const need = (T.userData.rAt(th, y) + m - s * rt) / (1 - s); if (s < .97) rb = Math.max(rb, need); }
      const c = T.userData.c; return [[c[0] + Math.cos(th) * rb, y0, c[1] + Math.sin(th) * rb], [c[0] + Math.cos(th) * rt, y1, c[1] + Math.sin(th) * rt]];
    };
    const th1 = 1.45; // face pointing toward the camera (+z)
    const [ladA, ladB] = ladderOn(L1, th1, -64, -32), [ladB2, ladC] = ladderOn(L1, th1 + .06, -36, L1.userData.topAt(th1 + .06) + .4);
    scene.add(ladder(ctx, ladA, ladB, camSide(th1), { mat: ladMat }));
    scene.add(ladder(ctx, ladB2, ladC, camSide(th1 + .06), { mat: ladMat }));
    R.ladTop = new THREE.Vector3(...ladC);
    // a long lashed ladder on the great summit's own foot: it ends far, far below the top
    { const thG = Math.PI / 2 + .1; const [g0, g1] = ladderOn(G, thG, -66, -22, 2.2), [g1b, g2] = ladderOn(G, thG + .015, -26, 10, 2.0);
      scene.add(ladder(ctx, g0, g1, camSide(thG), { mat: ladMat, w: 4.2, rail: 1.0, step: 3.2 }));
      scene.add(ladder(ctx, g1b, g2, camSide(thG + .015), { mat: ladMat, w: 4.0, rail: .95, step: 3.2 }));
      R.gLadTop = new THREE.Vector3(...g2); }
    // carved stairs spiralling up L2
    { const stoneM = new THREE.MeshStandardMaterial({ color: '#9c8f8a', roughness: .95 }); const geo = M.rbox(2.6, .55, 1.3, .12, 1); const n = 64;
      const im = new THREE.InstancedMesh(geo, stoneM, n); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < n; i++) { const th = .9 + i * .085, y = -58 + i * 0.75; const r = L2.userData.rAt(th, y) + .9; const p = new THREE.Vector3(36 + Math.cos(th) * r, y, -240 + Math.sin(th) * r); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -th); m4.compose(p, q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); }
      im.castShadow = false; im.receiveShadow = true; scene.add(im); R.stairTop = new THREE.Vector3(36, -10, -240); }

    // soft cloud puffs around the tower bases (hide the cloud-sea seams, add volume)
    { const tex = FX.cloudSprite(); const rr = U.rng(5); const g = new THREE.Group();
      towers.forEach((T, ti) => { const [cx, cz] = T.userData.c; const k = ti === 0 ? 8 : ti > 11 ? 2 : 3; for (let i = 0; i < k; i++) { const a = rr() * 6.28; const base = ti === 0 ? 120 : 26; const rad = base * (.6 + rr() * .8); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color().setHSL(.69, .32, .5 + rr() * .1), transparent: true, opacity: .38, depthWrite: false, rotation: rr() * 6 })); s.position.set(cx + Math.cos(a) * rad, -70 + rr() * 8, cz + Math.sin(a) * rad); s.scale.setScalar((ti === 0 ? 120 : 45) * (.7 + rr() * .7)); s.userData.noDepth = true; g.add(s); } });
      // a bank of puffs along the camera-facing foot of the great summit: buries the crisp cloud-sea / rock contact line
      // (own rng so every other random draw in the scene stays identical)
      { const r2 = U.rng(613), [cx, cz] = G.userData.c;
        for (let i = 0; i < 12; i++) { const a = Math.PI / 2 + (i / 11 - .5) * 2.7 + (r2() - .5) * .1; const rad = G.userData.rAt(a, -80) + 6 + r2() * 16;
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color().setHSL(.69, .34, .66 + r2() * .06), transparent: true, opacity: .55, depthWrite: false, rotation: r2() * 6 }));
          s.position.set(cx + Math.cos(a) * rad, -80 + r2() * 6, cz + Math.sin(a) * rad); s.scale.setScalar(78 + r2() * 36); s.userData.noDepth = true; g.add(s); } }
      scene.add(g); }

    // banner cloud streaming from the summit (the first light catches it) + a soft glow of sunlit snow
    { const tex = FX.cloudSprite(); const g = new THREE.Group(); const S0 = R.summit; R.banner = [];
      for (let i = 0; i < 11; i++) { const f = i / 10; const m = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color().setHSL(.035 + f * .03, .7, .74 - f * .14), transparent: true, opacity: (.55 - f * .38), depthWrite: false, rotation: i * 1.7 });
        const sp = new THREE.Sprite(m); sp.userData.noDepth = true; sp.userData.base = new THREE.Vector3(S0.x - 4 - f * 105, S0.y - 8 - f * 18 + Math.sin(i * 2.1) * 3, S0.z + 15 - f * 10); sp.userData.sz = 16 + f * 52; sp.userData.f = f; g.add(sp); R.banner.push(sp); }
      g.userData.update = t => R.banner.forEach((sp, i) => { const d = (t + 2) * 2.2 * (.5 + sp.userData.f); sp.position.copy(sp.userData.base).add(new THREE.Vector3(-d, Math.sin(t * .4 + i) * .8, 0)); sp.scale.setScalar(sp.userData.sz * (1 + .03 * Math.sin(t * .7 + i))); sp.material.rotation = i * 1.7 + t * .02 * (i % 2 ? 1 : -1); });
      scene.add(g);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot(128, 0), color: '#ffb48a', transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      halo.position.copy(S0).add(new THREE.Vector3(10, -26, -40)); halo.scale.setScalar(170); halo.userData.noDepth = true; scene.add(halo); R.halo = halo; }

    // ---- the ledge + chronicle stack (history testifies) -------------------------------------------------------
    const ledge = new THREE.Group(); scene.add(ledge); R.ledge = ledge;
    const slabGeo = M.rbox(2.6, .6, 1.9, .16, 3); { const p = slabGeo.attributes.position; const f = TEX.fbmField(8, 4, 4); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const d = f(x / 3 + .5, z / 3 + .5) * .06; p.setY(i, y + (y > 0 ? d : d * 2)); p.setX(i, x * (1 + f(z / 2 + .2, y + .5) * .05)); } slabGeo.computeVertexNormals(); }
    const slab = new THREE.Mesh(slabGeo, M.MAT.stone({ a: '#c4b4a0', b: '#7d6e62', seed: 12, repeat: [2, 2] })); slab.position.set(0, -.3, -.15); slab.rotation.y = .06; slab.castShadow = slab.receiveShadow = true; ledge.add(slab);
    // tufts of dry grass in cracks (real alpine detail)
    { const gm = new THREE.MeshStandardMaterial({ color: '#7a7a4a', roughness: 1 }); const rr = U.rng(17);
      for (let i = 0; i < 9; i++) { const tuft = new THREE.Group(); for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new THREE.ConeGeometry(.012, .09 + rr() * .07, 4), gm); b.position.set((rr() - .5) * .05, .05, (rr() - .5) * .05); b.rotation.set((rr() - .5) * .7, 0, (rr() - .5) * .7); tuft.add(b); } const a = rr() * 6.28; tuft.position.set(Math.cos(a) * (.7 + rr() * .5), .0, -.15 + Math.sin(a) * (.5 + rr() * .3)); ledge.add(tuft); } }

    const stack = new THREE.Group(); ledge.add(stack); R.stack = stack;
    // [w (cover width -> depth), h (book height -> left/right), d (thickness), colour, label]
    const vols = [[.5, .36, .11, '#7a4628', 0], [.45, .33, .085, '#c0392b', 0], [.47, .34, .07, '#3f9a62', 0], [.42, .3, .1, '#b07a3a', 0], [.44, .31, .06, '#3a5c98', 0],
      [.4, .29, .09, '#a03a5a', 0], [.41, .3, .065, '#d4923a', 0], [.37, .27, .08, '#4a8a4e', 0], [.39, .28, .055, '#b8402e', 0], [.35, .26, .075, '#4c5688', 0],
      [.33, .245, .06, '#c8743a', 0], [.3, .23, .07, '#7e3e86', 0], [.29, .22, .05, '#c0902e', 0]];
    const rnd = U.rng(33); let y = 0; R.vols = [];
    const spineDraw = (lab) => (x, W, H) => {
      x.clearRect(0, 0, W, H); const gold = '#d9ac4e';
      x.fillStyle = gold; x.fillRect(0, H * .035, W, H * .01); x.fillRect(0, H * .955, W, H * .01);
      x.fillRect(0, H * .07, W, H * .006); x.fillRect(0, H * .924, W, H * .006);
      if (lab) { x.fillStyle = lab; x.fillRect(W * .12, H * .16, W * .76, H * .16); x.strokeStyle = gold; x.lineWidth = 3; x.strokeRect(W * .16, H * .17, W * .68, H * .14); }
    };
    const LAB = [null, '#1e1410', '#3a0f0c'];
    vols.forEach(([w, h, d, c, lab], i) => {
      const b = M.book({ w, h, d, color: c, dark: new THREE.Color(c).multiplyScalar(.72).getStyle(), seed: 70 + i, pageColor: '#d8c6a2', spineDraw: spineDraw(LAB[lab]) });
      const holder = new THREE.Group(); holder.add(b);
      // lay flat with the spine toward the camera: book local x(spine at -x) -> world -z, y -> world x, z(cover) -> world -y
      const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0)); b.quaternion.setFromRotationMatrix(m);
      const flip = false; // a couple of volumes lie the other way round (page edges out)
      holder.position.set((rnd() - .5) * .07, y + d / 2, (rnd() - .5) * .05 + (flip ? w / 2 - .2 + .04 : .2 - w / 2));
      holder.rotation.y = (rnd() - .5) * .2 + (flip ? Math.PI : 0);
      stack.add(holder); R.vols.push(holder); y += d + .0015;
    });
    R.stackTop = y;
    // scrolls on top + beside
    const s1 = scroll({ length: .38, radius: .034, rollers: true, seed: 3 }); s1.position.set(0, y + .036, .02); s1.rotation.y = .25; stack.add(s1);
    const s2 = scroll({ length: .32, radius: .028, seed: 5, cord: '#3f5a2a', sealColor: '#7a1a12', tieAt: .05 }); s2.position.set(.02, y + .072 + .03, -.03); s2.rotation.y = -.4; stack.add(s2);
    // 'tarihin şehadeti' callout anchor: ON the wax seal of the top scroll (stack-local) — the leader then rises through clear sky
    s2.updateMatrix(); R.anchorL = new THREE.Vector3(.056, 0, .028 + .008).applyMatrix4(s2.matrix);
    const s3 = scroll({ length: .36, radius: .03, rollers: true, seed: 7 }); s3.position.set(.5, .03, .25); s3.rotation.y = 1.2; ledge.add(s3);
    const s4 = scroll({ length: .3, radius: .026, seed: 9, cord: '#6a3a1a' }); s4.position.set(.47, .026, .12); s4.rotation.y = 1.0; ledge.add(s4);
    // a smaller second stack to the left
    [[.34, .25, .07, '#24304f'], [.32, .24, .06, '#7a2418'], [.3, .22, .055, '#8a5a30']].forEach(([w, h, d, c], i) => {
      const b = M.book({ w, h, d, color: c, seed: 90 + i, pageColor: '#d8c6a2', spineDraw: spineDraw(null) }); const holder = new THREE.Group(); holder.add(b);
      const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0)); b.quaternion.setFromRotationMatrix(m);
      holder.position.set(-.62, .002 + i * .066 + d / 2, -.12); holder.rotation.y = .55 + (i - 1) * .12; ledge.add(holder);
    });
    const motes = FX.particles({ count: 120, center: [0, .8, .2], box: [3, 2, 2.5], size: 5, color: '#ffd9c0', opacity: .45, drift: [.05, .02, 0], swirl: .06 }); ledge.add(motes);

    camera.near = .05; camera.far = 6000; camera.updateProjectionMatrix();
    // ---- camera: keys [t, pos, yaw, pitch, fov] ----------------------------------------------------------------
    // key times hang on the narration: the crane lifts off as the 'tarihin şehadeti' callout clears (just before "düşmanları"),
    // clears the stack top, settles on the tower-field reveal a breath before "en" and pushes in on "en yüksek" (way = a
    // constant-speed waypoint, no visible event), then the slow push runs to the end of the tail handle
    const tD = ctx.wordTime('düşmanları'), tEn = ctx.wordTime('en');
    const K = R.K = { lift: tD - .3, over: tD + .65, settle: tEn - .46, way: tEn + .79, end: ctx.dur + .6 };
    const S0 = [.8, .55, 2.75], S1 = [.42, .68, 2.3];
    const a0 = aim(S0, [.02, .66, 0]), a1 = aim(S1, [.02, .72, 0]);
    const sum = [-18, 138, -600]; const v1 = [-1.2, 9.4, -6], v2 = [-6, 12.2, -33];
    const b1 = aim(v1, sum), b2 = aim(v2, sum);
    R.cam = camPath([
      [-0.6, [.98, .5, 2.95], a0[0] + 2.5, a0[1], 38],
      [0.0, S0, a0[0], a0[1], 38],
      [K.lift, S1, a1[0] - 1.5, a1[1] + .5, 38],
      [K.over, [.3, 1.75, 2.2], a1[0] - 6, 3, 38],
      [K.settle, [1.4, 6.8, 4.6], 1.8, 1.6, 42],
      [K.way, v1, b1[0] + .4, b1[1] - 10.2, 41],
      [K.end, v2, b2[0] + .5, b2[1] - 9.6, 38.5],
    ]);
    { const tc = new THREE.PerspectiveCamera(38, ctx.W / ctx.H, .05, 6000); const pts = [new THREE.Vector3(0, .6, 0), new THREE.Vector3(0, 1.4, 0), new THREE.Vector3(-30, -10, -185), new THREE.Vector3(.3, -.45, -7), new THREE.Vector3(.3, -.45, -4)]; // + far rim of our ledge tower (it sweeps out of the bottom of frame right after the stack)
      const proj = (tt) => { R.cam.apply(tc, tt); tc.updateMatrixWorld(); tc.matrixWorldInverse.copy(tc.matrixWorld).invert(); return pts.map(p => { const v = p.clone().applyMatrix4(tc.matrixWorldInverse); if (v.z > -.1) return null; const q = p.clone().project(tc); return Math.abs(q.x) < 1.2 && Math.abs(q.y) < 1.2 ? [q.x * 540, q.y * 960] : null; }); };
      R.pxSpeed = tt => { const a = proj(tt), b = proj(tt + 1 / 30); let m = 0; a.forEach((p, i) => { if (p && b[i]) m = Math.max(m, Math.hypot(b[i][0] - p[0], b[i][1] - p[1])); }); return m; }; }
    ctx.post.motionBlur = { samples: R.pxSpeed(-.5) > 40 ? 3 : 1, shutter: .4 };
  },
  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    const K = R.K;
    R.cam.apply(camera, t, U.shake(t, .012 + .02 * U.smoothstep(K.over - .15, K.settle + .35, t), .5, 4)); // handheld grows over the crane
    // motion blur only while the crane sweeps the near stack out of frame (screen speed centred on this frame)
    // (sample count scales with the blur length so the 80-150 px/frame sweep reads as a smear, not as 3 discrete copies)
    { const v = R.pxSpeed(t - 1 / 60), sh = .45; const n = v > 30 ? Math.min(8, Math.max(3, Math.ceil(v * sh / 9))) : 1; post.motionBlur = n > 1 ? { samples: n, shutter: sh } : { samples: 1 }; }
    // sunrise creeps down the great summit (terminator height)
    R.UN.uTerm.value = U.lerp(104, 58, U.smoothstep(-.5, 7.8, t));
    R.sky.userData.uniforms.sunGlow.value = 1.0 + .3 * U.smoothstep(2, 7, t);
    R.halo.material.opacity = .06 + .06 * U.smoothstep(3.5, 7, t);
    // DOF: on the stack first, then deep focus on the peaks (pulled while the crane clears the stack)
    const far = U.smoothstep(K.lift + .3, K.over + .45, t);
    post.dof.focus = U.lerp(camera.position.distanceTo(new THREE.Vector3(0, .55, .2)), 450, far);
    post.dof.range = U.lerp(1.6, 2000, far); post.dof.amount = U.lerp(.85, .0, far);

    // ---- typography -------------------------------------------------------------------------------------------
    const tT = ctx.wordTime('tarihin'), tSh = ctx.wordTime('şehadetiyle'), tD = ctx.wordTime('düşmanları'), tK = ctx.wordTime('kabul');
    const tEn = ctx.wordTime('en'), tY = ctx.wordTime('yüksek'), tYe = ctx.wordTime('yetişilemeyecek'), tDe = ctx.wordTime('derecedeydi');
    const stackAnchor = R.stack.localToWorld(R.anchorL.clone()); // on the seal of the top scroll: the line never crosses the books
    ui.callout('tarihin şehadeti', { t, t0: tT + .05, t1: tD - .05, anchor: stackAnchor, to: [745, 330], family: 'Playfair Display', weight: 700, size: 54, color: '#fff1d6', dotColor: '#ffcf6b', bg: 'rgba(16,20,38,0.86)' });
    ui.text('düşmanları bile', { t, t0: tD - .05, t1: tEn + .1, x: 540, y: 300, size: 76, weight: 900, color: '#ff8a6e', anim: 'pop', stroke: 'rgba(30,24,50,.55)', strokeW: 10 });
    ui.text('kabul ediyor', { t, t0: tK - .05, t1: tEn + .1, x: 540, y: 392, size: 64, weight: 800, color: '#fff4dc', anim: 'rise', stroke: 'rgba(30,24,50,.5)', strokeW: 9 });
    // summit callout + big keyword
    const sp = ui.project(R.summit);
    // two-line chip in the clear sky right of the peak: the leader runs over sky and the sunlit cap stays uncovered
    ui.callout('en yüksek\nderece', { t, t0: tEn + .05, t1: 99, anchor: [sp[0], sp[1] + 4], to: [Math.min(sp[0] + 270, 858), sp[1] + 108], size: 46, weight: 800, radius: 26, bg: 'rgba(16,20,38,0.86)', color: '#fff4dc', dotColor: '#ffcf6b' });
    // failed attempts: dotted climb lines from the ladder / stair tops that stop far below the summit, each ending in a red ✕
    // (drawn under "yetişilemeyecek"; the first ✕ lands at its end, the second on "derecedeydi", both well before the end fade)
    const fadeAll = 1 - U.smoothstep(7.55, 7.85, t);
    const attempt = (from, k, t0, bend) => {
      const p = U.clamp((t - t0) / .7); if (p <= 0) return; const a = ui.project(from), b = ui.project(R.summit); const X = ui.ctx;
      const ex = a[0] + (b[0] - a[0]) * k, ey = a[1] + (b[1] - a[1]) * k, cx = (a[0] + ex) / 2 + bend, cy = (a[1] + ey) / 2;
      const q = (u) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * cx + u * u * ex, (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * cy + u * u * ey];
      const e = U.ease.outCubic(p); let len = 0, prev = q(0); const S = []; for (let i = 1; i <= 60; i++) { const c = q(i / 60); len += Math.hypot(c[0] - prev[0], c[1] - prev[1]); S.push([len, c]); prev = c; }
      X.save(); X.globalAlpha = Math.min(1, p * 3) * fadeAll;
      const dots = []; for (let d = 0; d <= len * e; d += 21) { const s2 = S.find(z => z[0] >= d) || S[S.length - 1]; dots.push(s2[1]); }
      X.fillStyle = 'rgba(28,20,52,.72)'; dots.forEach(([x, y]) => { X.beginPath(); X.arc(x, y, 8.5, 0, 6.283); X.fill(); });
      X.fillStyle = '#fff6e6'; dots.forEach(([x, y]) => { X.beginPath(); X.arc(x, y, 5.6, 0, 6.283); X.fill(); });
      X.beginPath(); X.arc(a[0], a[1], 10, 0, 6.283); X.fillStyle = 'rgba(28,20,52,.72)'; X.fill(); X.beginPath(); X.arc(a[0], a[1], 7, 0, 6.283); X.fillStyle = '#ffcf6b'; X.fill();
      if (p > .8) { const qx = U.ease.outBack(U.clamp((p - .8) / .2), 3); const r = 22 * qx, jit = Math.exp(-6 * Math.max(0, t - t0 - .7)) * Math.sin((t - t0) * 40) * 3;
        X.translate(ex + jit, ey); X.lineCap = 'round';
        X.strokeStyle = 'rgba(40,10,24,.75)'; X.lineWidth = 17; X.beginPath(); X.moveTo(-r, -r); X.lineTo(r, r); X.moveTo(r, -r); X.lineTo(-r, r); X.stroke();
        X.strokeStyle = '#ff5a4e'; X.lineWidth = 10; X.beginPath(); X.moveTo(-r, -r); X.lineTo(r, r); X.moveTo(r, -r); X.lineTo(-r, r); X.stroke(); }
      X.restore();
    };
    attempt(R.gLadTop, .3, tYe + .05, -30);
    attempt(R.ladTop, .4, tYe + .3, 40);
    ui.text('YETİŞİLEMEZ', { t, t0: tYe - .03, t1: 99, x: 540, y: 322, size: 108, weight: 900, color: '#ffd27a', anim: 'pop', letterSpacing: 4, stroke: 'rgba(28,24,60,.55)', strokeW: 13 }); // pop overshoot stays inside x 80-1000, İ dots below y 230
  },
};
