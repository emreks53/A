// s13 (70.45–77.75) "tarihin şehadetiyle, düşmanları bile kabul ediyor ki en yüksek ve yetişilemeyecek derecedeydi."
// Visual: blue-hour above a sea of clouds. A tall stack of old history chronicles + sealed scrolls rests on a rock ledge
// ("tarihin şehadeti"). On "düşmanları bile kabul ediyor" the camera cranes up past the stack and opens onto a field of
// rock towers rising out of the clouds — ladders and carved stairs climb the lower towers and stop at their tops — while ONE
// summit, far above all, is the only thing already touched by the sunrise (physically: first light hits the highest peak).
// "en yüksek derece" callout on the summit, big "YETİŞİLEMEZ" on "yetişilemeyecek".
import * as THREE from 'three';
import { camPath, aim, scroll } from '../engine/lib/extra_F.js';

let R = {};

// ---- rock tower / mountain built on a radial grid, displaced with tileable noise (seamless around) ----------------
function spire(ctx, o) {
  const { TEX, U } = ctx;
  const segR = o.segR ?? 72, segY = o.segY ?? 56, base = o.base ?? -150, top = o.top, Rr = o.R;
  const f = TEX.fbmField(o.seed ?? 3, o.nb ?? 6, 4), g = TEX.fbmField((o.seed ?? 3) + 7, 3, 3), f2 = TEX.fbmField((o.seed ?? 3) + 13, 14, 3);
  const prof = yN => {
    if (o.shape === 'peak') return Math.pow(Math.max(0, 1 - yN), o.pow ?? .9) * (1 + .12 * Math.exp(-Math.pow((yN - .55) / .2, 2)));
    const k = o.cap ?? .86, tp = o.taper ?? .2; // tower: steep walls, a stepped shoulder, then a blunt broken top
    const sh = o.shoulder ?? .62, sw = o.shoulderW ?? .7;
    const wall = yN < sh ? 1 - tp * yN : U.lerp(1 - tp * sh, sw, U.smoothstep(sh, sh + .05, yN)) - tp * .5 * Math.max(0, yN - sh - .05);
    const kk = Math.max(k, sh + .1);
    return yN < kk ? wall : (sw - tp * .5 * (kk - sh - .05)) * Math.pow(Math.max(0, 1 - Math.pow((yN - kk) / (1 - kk), 3.5)), .3);
  };
  const H = top - base;
  const rAt = (th, y) => {
    const yN = U.clamp((y - base) / H); const u = ((th / (Math.PI * 2)) % 1 + 1) % 1;
    const flute = 1 - Math.abs(f(u, (y - base) / 900 + (o.seed ?? 0) * .1)), fl2 = 1 - Math.abs(f2(u, (y - base) / 700));
    const sy = (y - base) / (o.strata ?? 11) + g(u, .7) * 1.5; const ledge = U.smoothstep(.0, .12, sy - Math.floor(sy)) * .5 + .5; // horizontal bedding ledges
    let r = Rr * prof(yN) * (1 + (o.flute ?? .3) * (flute - .5) + (o.flute ?? .3) * .45 * (fl2 - .5) + .1 * g(u, (y - base) / 500) + (o.ledges ?? .05) * (ledge - .75));
    if (o.ridges) r *= 1 + o.ridges * Math.pow(Math.max(0, Math.cos(4 * th + (o.rPhase ?? 0))), 3) * (1 - yN * .6);
    if (o.shape !== 'peak') r *= 1 + .22 * Math.cos(2 * th + (o.seed ?? 0) * 1.7) + .1 * Math.cos(3 * th + (o.seed ?? 0) * 2.3);
    return Math.max(r, 0);
  };
  const pos = [], idx = [], uvs = []; const C1 = segR + 1; const uRep = Math.max(1, Math.round(Math.PI * 2 * Rr / 38));
  for (let j = 0; j <= segY; j++) {
    const yN = j / segY; const y = base + H * yN;
    for (let k = 0; k <= segR; k++) {
      const th = k / segR * Math.PI * 2; const r = j === segY ? 0 : rAt(th, y);
      const ln = (o.lean ?? 0) * yN * yN * Rr, la = (o.seed ?? 0) * 2.1;
      let yy = y; if (o.shape !== 'peak' && yN > .8) { const u = k / segR; const nn = j === segY ? .62 : f2(u, .37) * .5 + .5; yy -= Math.pow(U.smoothstep(.45, .8, nn), 1.5) * H * .07 * U.smoothstep(.86, 1, yN); }
      pos.push(o.x + Math.cos(th) * r + Math.cos(la) * ln, yy, o.z + Math.sin(th) * r + Math.sin(la) * ln * .4); uvs.push(k / segR * uRep, (y - base) / 38);
    }
  }
  for (let j = 0; j < segY; j++) for (let k = 0; k < segR; k++) {
    const a = j * C1 + k, b = a + 1, c = a + C1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  { const Nn = geo.attributes.normal; for (let j = 0; j <= segY; j++) { const a = j * C1, b = j * C1 + segR; const nx = Nn.getX(a) + Nn.getX(b), ny = Nn.getY(a) + Nn.getY(b), nz = Nn.getZ(a) + Nn.getZ(b), l = Math.hypot(nx, ny, nz) || 1; Nn.setXYZ(a, nx / l, ny / l, nz / l); Nn.setXYZ(b, nx / l, ny / l, nz / l); } }
  // vertex colours: pale dolomite rock, darker vertical streaks, snow on flat high faces of big peaks
  const P = geo.attributes.position, N = geo.attributes.normal, col = new Float32Array(P.count * 3);
  const A = new THREE.Color(o.a ?? '#cdbba4'), B = new THREE.Color(o.b ?? '#7f6f66'), S = new THREE.Color('#f1e4da'), C = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i) - o.x, y = P.getY(i), z = P.getZ(i) - o.z; const th = Math.atan2(z, x); const u = ((th / (Math.PI * 2)) % 1 + 1) % 1;
    const streak = f(u * 1.0 + .37, (y - base) / 300) * .5 + .5; const band = .5 + .5 * Math.sin(y * .21 + g(u, .3) * 3);
    const crev = 1 - Math.abs(f(u, (y - base) / 900 + (o.seed ?? 0) * .1));
    C.copy(A).lerp(B, U.clamp(streak * .6 + band * .2 + (1 - crev) * .55 - .25));
    if (o.snow) { const yN = (y - base) / H; const sn = U.smoothstep(o.snow, o.snow + .08, yN + (streak - .5) * .12) * U.smoothstep(.25, .6, N.getY(i) + .35); C.lerp(S, sn * .9); }
    col.set([C.r, C.g, C.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, o.mat); m.receiveShadow = true; m.castShadow = !!o.cast;
  m.userData.rAt = rAt; m.userData.c = [o.x, o.z];
  return m;
}

// Rock material whose direct SUN term only exists above the sunrise terminator height (first light on high peaks).
function rockMat(UN, TEX) {
  const st = TEX.stone({ a: '#ffffff', b: '#7c7a78', seed: 19, repeat: [1, 1] });
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .93, metalness: 0, map: st.map, normalMap: st.normalMap, normalScale: new THREE.Vector2(1.3, 1.3) });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, UN);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWY; varying vec3 vWP, vWN;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz; vWY = vWP.y; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    // triplanar rock texturing (no UV stretching on tops / apexes)
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWY; varying vec3 vWP, vWN; uniform float uTerm, uSoft; uniform vec3 uSunDir, uSunCol;\nconst float TS = 1. / 34.;')
      .replace('#include <map_fragment>', `{ vec3 bw = pow(abs(normalize(vWN)), vec3(4.)); bw /= (bw.x + bw.y + bw.z);
          diffuseColor *= texture2D(map, vWP.zy * TS) * bw.x + texture2D(map, vWP.xz * TS) * bw.y + texture2D(map, vWP.xy * TS) * bw.z; }`)
      .replace('#include <normal_fragment_maps>', `{ vec3 wn = normalize(vWN); vec3 bw = pow(abs(wn), vec3(4.)); bw /= (bw.x + bw.y + bw.z);
          vec3 nX = texture2D(normalMap, vWP.zy * TS).xyz * 2. - 1., nY = texture2D(normalMap, vWP.xz * TS).xyz * 2. - 1., nZ = texture2D(normalMap, vWP.xy * TS).xyz * 2. - 1.;
          nX.xy *= normalScale; nY.xy *= normalScale; nZ.xy *= normalScale;
          nX = vec3(nX.xy + wn.zy, wn.x); nY = vec3(nY.xy + wn.xz, wn.y); nZ = vec3(nZ.xy + wn.xy, wn.z);
          vec3 wN = normalize(nX.zyx * bw.x + nY.xzy * bw.y + nZ.xyz * bw.z);
          normal = normalize((viewMatrix * vec4(wN, 0.)).xyz); }`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        reflectedLight.directDiffuse *= .45;
        { vec3 sv = normalize((viewMatrix * vec4(uSunDir, 0.)).xyz); float nd = max(dot(normal, sv), 0.);
          float msk = smoothstep(uTerm - uSoft, uTerm + uSoft, vWY);
          reflectedLight.directDiffuse += diffuseColor.rgb * uSunCol * (nd * .9 + .1) * msk; }`);
  };
  m.customProgramCacheKey = () => 'F_rock_terminator';
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
    const UN = { uTerm: { value: 70 }, uSoft: { value: 3.5 }, uSunDir: { value: SUN.clone() }, uSunCol: { value: new THREE.Color(5.2, 2.35, .9) } };
    R.UN = UN;
    const rock = rockMat(UN, TEX);

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
    const add = o => { const m = spire(ctx, { mat: rock, ...o }); scene.add(m); towers.push(m); return m; };
    const cluster = (o, kids) => { const rr = U.rng(o.seed); o = { shoulder: .45 + rr() * .3, shoulderW: .84 + rr() * .1, lean: (rr() - .5) * .45, ...o }; const m = add(o); (kids || []).forEach(([dx, dz, hk, rk], i) => add({ ...o, x: o.x + dx * o.R, z: o.z + dz * o.R, top: o.base === undefined ? -150 + (o.top + 150) * hk : o.top * hk, R: o.R * rk, seed: o.seed + 50 + i, segR: 48, segY: 40 })); return m; };
    const G = add({ x: -18, z: -600, top: 138, R: 150, shape: 'peak', pow: .92, seed: 11, nb: 8, flute: .26, ridges: .2, rPhase: .3, snow: .86, segR: 140, segY: 110, strata: 14, ledges: .04, a: '#c9a98c', b: '#5e5059' });
    R.G = G; R.summit = new THREE.Vector3(-18, 138, -600);
    R.P0 = add({ x: .3, z: -1.2, top: -.45, R: 6.5, seed: 4, cap: .965, taper: .2, flute: .12, a: '#a8998c', b: '#4f4650' }); // our ledge tower
    const TA = '#a39fae', TB = '#34304a';
    const L1 = cluster({ x: -30, z: -185, top: -2, R: 15, seed: 21, cap: .88, a: TA, b: TB }, [[.75, -.4, .82, .55], [-.6, -.5, .7, .5]]);
    const L2 = cluster({ x: 36, z: -240, top: -10, R: 14, seed: 22, cap: .88, a: TA, b: TB }, [[-.7, -.5, .85, .5]]);
    cluster({ x: -64, z: -390, top: 8, R: 24, seed: 23, a: TA, b: TB }, [[.7, .3, .8, .5], [-.5, -.6, .9, .6]]);
    cluster({ x: 62, z: -430, top: 2, R: 22, seed: 24, a: TA, b: TB }, [[-.7, .2, .75, .55]]);
    cluster({ x: 12, z: -125, top: -50, R: 9, seed: 25, a: TA, b: TB });
    cluster({ x: -14, z: -300, top: -32, R: 11, seed: 26, a: TA, b: TB });
    cluster({ x: -92, z: -500, top: -10, R: 22, seed: 27, a: TA, b: TB }, [[.6, .5, .7, .5]]);
    cluster({ x: 100, z: -540, top: 14, R: 28, seed: 28, a: TA, b: TB }, [[-.6, .4, .8, .5]]);
    cluster({ x: -140, z: -300, top: 2, R: 24, seed: 29, a: TA, b: TB }, [[.6, .4, .7, .55]]);
    cluster({ x: 130, z: -280, top: -6, R: 22, seed: 30, a: TA, b: TB }, [[-.6, -.4, .75, .5]]);
    // distant ranges in the haze
    [[-700, -1500, 70, 330], [-150, -1700, 40, 420], [520, -1450, 80, 380], [1100, -1300, 30, 300], [-1200, -1200, 40, 330]].forEach(([x, z, t, r], i) => add({ x, z, top: t, R: r, shape: 'peak', pow: 1.1, seed: 40 + i, segR: 48, segY: 30, flute: .25, ridges: .1 }));
    R.towers = towers;

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
    const [ladA, ladB] = ladderOn(L1, th1, -64, -32), [ladB2, ladC] = ladderOn(L1, th1 + .06, -36, -8.5);
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
      scene.add(g); }

    // ---- the ledge + chronicle stack (history testifies) -------------------------------------------------------
    const ledge = new THREE.Group(); scene.add(ledge); R.ledge = ledge;
    const slabGeo = M.rbox(2.6, .6, 1.9, .16, 3); { const p = slabGeo.attributes.position; const f = TEX.fbmField(8, 4, 4); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const d = f(x / 3 + .5, z / 3 + .5) * .06; p.setY(i, y + (y > 0 ? d : d * 2)); p.setX(i, x * (1 + f(z / 2 + .2, y + .5) * .05)); } slabGeo.computeVertexNormals(); }
    const slab = new THREE.Mesh(slabGeo, M.MAT.stone({ a: '#c4b4a0', b: '#7d6e62', seed: 12, repeat: [2, 2] })); slab.position.set(0, -.3, -.15); slab.rotation.y = .06; slab.castShadow = slab.receiveShadow = true; ledge.add(slab);
    // tufts of dry grass in cracks (real alpine detail)
    { const gm = new THREE.MeshStandardMaterial({ color: '#7a7a4a', roughness: 1 }); const rr = U.rng(17);
      for (let i = 0; i < 9; i++) { const tuft = new THREE.Group(); for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new THREE.ConeGeometry(.012, .09 + rr() * .07, 4), gm); b.position.set((rr() - .5) * .05, .05, (rr() - .5) * .05); b.rotation.set((rr() - .5) * .7, 0, (rr() - .5) * .7); tuft.add(b); } const a = rr() * 6.28; tuft.position.set(Math.cos(a) * (.7 + rr() * .5), .0, -.15 + Math.sin(a) * (.5 + rr() * .3)); ledge.add(tuft); } }

    const stack = new THREE.Group(); ledge.add(stack); R.stack = stack;
    // [w (cover width -> depth), h (book height -> left/right), d (thickness), colour, label]
    const vols = [[.5, .36, .11, '#4f2f1c', 0], [.45, .33, .085, '#7a2418', 0], [.47, .34, .07, '#2f4a2c', 0], [.42, .3, .1, '#6b4226', 1], [.44, .31, .06, '#24304f', 0],
      [.4, .29, .09, '#8a5a30', 0], [.41, .3, .065, '#5a1a2a', 0], [.37, .27, .08, '#9a3a22', 0], [.39, .28, .055, '#33402a', 0], [.35, .26, .075, '#6b4226', 0],
      [.33, .245, .06, '#7a2418', 2], [.3, .23, .07, '#2c1d16', 0], [.29, .22, .05, '#8a5a30', 0]];
    const rnd = U.rng(33); let y = 0; R.vols = [];
    const spineDraw = (lab) => (x, W, H) => {
      x.clearRect(0, 0, W, H); const gold = '#d9ac4e';
      x.fillStyle = gold; x.fillRect(0, H * .035, W, H * .01); x.fillRect(0, H * .955, W, H * .01);
      x.fillRect(0, H * .07, W, H * .006); x.fillRect(0, H * .924, W, H * .006);
      if (lab) { x.fillStyle = lab; x.fillRect(W * .12, H * .16, W * .76, H * .16); x.strokeStyle = gold; x.lineWidth = 3; x.strokeRect(W * .16, H * .17, W * .68, H * .14); }
    };
    const LAB = [null, '#1e1410', '#3a0f0c'];
    vols.forEach(([w, h, d, c, lab], i) => {
      const b = M.book({ w, h, d, color: c, dark: new THREE.Color(c).multiplyScalar(.55).getStyle(), seed: 70 + i, pageColor: '#d8c6a2', spineDraw: spineDraw(LAB[lab]) });
      const holder = new THREE.Group(); holder.add(b);
      // lay flat with the spine toward the camera: book local x(spine at -x) -> world -z, y -> world x, z(cover) -> world -y
      const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0)); b.quaternion.setFromRotationMatrix(m);
      const flip = i === 9; // a couple of volumes lie the other way round (page edges out)
      holder.position.set((rnd() - .5) * .07, y + d / 2, (rnd() - .5) * .05 + (flip ? w / 2 - .2 + .04 : .2 - w / 2));
      holder.rotation.y = (rnd() - .5) * .2 + (flip ? Math.PI : 0);
      stack.add(holder); R.vols.push(holder); y += d + .0015;
    });
    R.stackTop = y;
    // scrolls on top + beside
    const s1 = scroll({ length: .38, radius: .034, rollers: true, seed: 3 }); s1.position.set(0, y + .036, .02); s1.rotation.y = .25; stack.add(s1);
    const s2 = scroll({ length: .32, radius: .028, seed: 5, cord: '#3f5a2a', sealColor: '#7a1a12', tieAt: .05 }); s2.position.set(.02, y + .072 + .03, -.03); s2.rotation.y = -.4; stack.add(s2);
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
    const S0 = [.8, .55, 2.75], S1 = [.42, .68, 2.3];
    const a0 = aim(S0, [.02, .66, 0]), a1 = aim(S1, [.02, .72, 0]);
    const sum = [-18, 138, -600]; const v1 = [-1.2, 9.4, -6], v2 = [-6, 12.2, -33];
    const b1 = aim(v1, sum), b2 = aim(v2, sum);
    R.cam = camPath([
      [-0.6, [.98, .5, 2.95], a0[0] + 2.5, a0[1], 38],
      [0.0, S0, a0[0], a0[1], 38],
      [2.2, S1, a1[0] - 1.5, a1[1] + .5, 38],
      [3.15, [.3, 1.75, 2.2], a1[0] - 6, 3, 38],
      [4.15, [1.4, 6.8, 4.6], 1.8, 1.6, 42],
      [5.4, v1, b1[0] + .4, b1[1] - 10.2, 41],
      [7.9, v2, b2[0] + .5, b2[1] - 9.6, 38.5],
    ]);
  },
  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    R.cam.apply(camera, t, U.shake(t, .012 + .02 * U.smoothstep(3, 4.5, t), .5, 4));
    // sunrise creeps down the great summit (terminator height)
    R.UN.uTerm.value = U.lerp(104, 58, U.smoothstep(-.5, 7.8, t));
    R.sky.userData.uniforms.sunGlow.value = 1.0 + .3 * U.smoothstep(2, 7, t);
    // DOF: on the stack first, then deep focus on the peaks
    const far = U.smoothstep(2.5, 3.6, t);
    post.dof.focus = U.lerp(camera.position.distanceTo(new THREE.Vector3(0, .55, .2)), 450, far);
    post.dof.range = U.lerp(1.6, 2000, far); post.dof.amount = U.lerp(.85, .0, far);

    // ---- typography -------------------------------------------------------------------------------------------
    const tT = ctx.wordTime('tarihin'), tSh = ctx.wordTime('şehadetiyle'), tD = ctx.wordTime('düşmanları'), tK = ctx.wordTime('kabul');
    const tEn = ctx.wordTime('en'), tY = ctx.wordTime('yüksek'), tYe = ctx.wordTime('yetişilemeyecek'), tDe = ctx.wordTime('derecedeydi');
    const stackAnchor = R.stack.localToWorld(new THREE.Vector3(-.05, R.stackTop * .55, .2));
    ui.callout('tarihin şehadeti', { t, t0: tT + .05, t1: tD - .05, anchor: stackAnchor, to: [540, 330], family: 'Playfair Display', weight: 700, size: 52, color: '#fff1d6', dotColor: '#ffcf6b' });
    ui.text('düşmanları bile', { t, t0: tD - .05, t1: tEn + .1, x: 540, y: 300, size: 76, weight: 900, color: '#ff8a6e', anim: 'pop', stroke: 'rgba(30,24,50,.55)', strokeW: 10 });
    ui.text('kabul ediyor', { t, t0: tK - .05, t1: tEn + .1, x: 540, y: 392, size: 64, weight: 800, color: '#fff4dc', anim: 'rise', stroke: 'rgba(30,24,50,.5)', strokeW: 9 });
    // summit callout + big keyword
    const sp = ui.project(R.summit);
    ui.callout('en yüksek derece', { t, t0: tY - .1, t1: 99, anchor: [sp[0], sp[1] + 4], to: [Math.min(sp[0] + 220, 780), sp[1] + 150], size: 46, weight: 800, color: '#fff4dc', dotColor: '#ffcf6b' });
    const attempt = (from, k, t0, side) => {
      const p = U.clamp((t - t0) / .7); if (p <= 0) return; const a = ui.project(from), b = ui.project(R.summit); const X = ui.ctx;
      const ex = a[0] + (b[0] - a[0]) * k * .35 + side * 40, ey = a[1] + (b[1] - a[1]) * k; // ends well below the summit
      const e = U.ease.outCubic(p); X.save(); X.globalAlpha = Math.min(1, p * 3) * (1 - U.smoothstep(7.6, 7.9, t)); X.setLineDash([4, 14]); X.lineCap = 'round'; X.lineWidth = 7; X.strokeStyle = 'rgba(255,244,220,.9)';
      X.shadowColor = 'rgba(20,16,40,.6)'; X.shadowBlur = 8; X.beginPath(); X.moveTo(a[0], a[1]); X.quadraticCurveTo(a[0] + side * 20, a[1] + (ey - a[1]) * .5, a[0] + (ex - a[0]) * e, a[1] + (ey - a[1]) * e); X.stroke(); X.setLineDash([]);
      if (p > .8) { const q = U.ease.outBack(U.clamp((p - .8) / .2 * 1.6 > 1 ? 1 : (p - .8) / .2), 2.5); const cx = ex, cy = ey, r = 16 * q; X.strokeStyle = '#ff6b5e'; X.lineWidth = 9; X.beginPath(); X.moveTo(cx - r, cy - r); X.lineTo(cx + r, cy + r); X.moveTo(cx + r, cy - r); X.lineTo(cx - r, cy + r); X.stroke(); }
      X.restore();
    };
    attempt(R.gLadTop, .3, tYe + .05, -1);
    attempt(R.ladTop, .42, tYe + .3, 1);
    ui.text('YETİŞİLEMEZ', { t, t0: tYe - .03, t1: 99, x: 540, y: 300, size: 118, weight: 900, color: '#ffd27a', anim: 'pop', letterSpacing: 6, stroke: 'rgba(28,24,60,.55)', strokeW: 14 });
  },
};
