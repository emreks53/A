// Shared props + FX for group C (s06 Zülfikar → s07 battle storm → s08 the sheltering rock).
// Everything procedural & deterministic. No people, only objects / terrain / dust / light.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TEX from './textures.js';
import { rng, clamp, lerp, smoothstep } from './util.js';
import { MAT, rbox, lathe, shadowAll } from './models.js';
import { skyDome } from './env.js';
import { cloudSprite } from './fx.js';

// ---------------------------------------------------------------------------------------------
// 3D value noise (deterministic)
const fract = x => x - Math.floor(x);
const h3 = (x, y, z, s) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 53.3) * 43758.5453);
export function noise3(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let fx = x - xi, fy = y - yi, fz = z - zi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const c = (i, j, k) => h3(xi + i, yi + j, zi + k, s);
  const a = lerp(lerp(c(0, 0, 0), c(1, 0, 0), fx), lerp(c(0, 1, 0), c(1, 1, 0), fx), fy);
  const b = lerp(lerp(c(0, 0, 1), c(1, 0, 1), fx), lerp(c(0, 1, 1), c(1, 1, 1), fx), fy);
  return lerp(a, b, fz) * 2 - 1;
}
export function fbm3(x, y, z, s = 0, oct = 4) { let a = 0, w = .5, f = 1, n = 0; for (let i = 0; i < oct; i++) { a += w * noise3(x * f, y * f, z * f, s + i * 7); n += w; w *= .5; f *= 2.03; } return a / n; }

const paint = (geo, c) => { const C = new THREE.Color(c); const n = geo.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = C.r; a[i * 3 + 1] = C.g; a[i * 3 + 2] = C.b; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; };

// ---------------------------------------------------------------------------------------------
// Sky + matching image-based light. The env map is rendered FROM the same procedural sky, so metal
// reflections (the sword) always agree with the visible sun / horizon.
export function skyAndEnv(renderer, o) {
  const sky = skyDome(o);
  const es = new THREE.Scene(); const sky2 = skyDome({ ...o, radius: 40, stars: 0 }); es.add(sky2);
  const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(es, o.envBlur ?? .03, .1, 100); pm.dispose();
  return { sky, env: rt.texture };
}

// Elevation-graded sky (stops in degrees) with sun disc, Mie glow, horizon haze toward the sun and soft clouds.
// o: {stops:[[deg,color],...] (<=8, ascending), sunDir, sunColor, sunSize (deg), glow, glowColor, haze, clouds, cloudColor, cloudShade, intensity, radius}
export function gradSky(o = {}) {
  const st = (o.stops ?? [[-10, '#7a5038'], [0, '#ffc98a'], [6, '#f6a874'], [16, '#b98c98'], [32, '#6d80ae'], [70, '#3a5a92']]).slice(0, 8);
  while (st.length < 8) st.push([st[st.length - 1][0] + 1 + st.length, st[st.length - 1][1]]);
  const u = {
    elev: { value: st.map(s => s[0]) }, cols: { value: st.map(s => new THREE.Color(s[1])) },
    sunDir: { value: new THREE.Vector3(...(o.sunDir ?? [0, .1, -1])).normalize() }, sunColor: { value: new THREE.Color(o.sunColor ?? '#fff0d0') },
    sunSize: { value: o.sunSize ?? .6 }, sunI: { value: o.sunI ?? 4 }, glow: { value: o.glow ?? 1 }, glowColor: { value: new THREE.Color(o.glowColor ?? '#ffb36a') }, haze: { value: o.haze ?? .5 },
    clouds: { value: o.clouds ?? 0 }, cloudColor: { value: new THREE.Color(o.cloudColor ?? '#ffd2a0') }, cloudShade: { value: new THREE.Color(o.cloudShade ?? '#8a6a78') },
    intensity: { value: o.intensity ?? 1 }, time: { value: 0 }, dark: { value: 0 }, darkColor: { value: new THREE.Color(o.darkColor ?? '#3a1e14') },
    storm: { value: o.storm ?? 0 }, stormDir: { value: new THREE.Vector3(...(o.stormDir ?? [-1, 0, 0])).normalize() }, stormColor: { value: new THREE.Color(o.stormColor ?? '#4a2016') },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix*vec4(position,0.)).xyz); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform float elev[8]; uniform vec3 cols[8]; uniform vec3 sunDir, sunColor, glowColor, cloudColor, cloudShade, darkColor, stormDir, stormColor; uniform float sunSize, sunI, glow, haze, clouds, intensity, time, dark, storm; varying vec3 vDir;
      float h(vec3 p){ p = fract(p*0.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float a=0., w=.5; for(int i=0;i<5;i++){ a+=w*n3(p); p*=2.03; w*=.5;} return a; }
      void main(){
        vec3 d = normalize(vDir); float e = degrees(asin(clamp(d.y, -1., 1.)));
        vec3 c = cols[0];
        for (int i = 0; i < 7; i++) { c = mix(c, cols[i+1], smoothstep(elev[i], elev[i+1], e)); }
        vec3 S = normalize(sunDir); float sd = max(dot(d, S), 0.); float ang = degrees(acos(clamp(dot(d, S), -1., 1.)));
        // horizon haze brightening toward the sun
        float hz = exp(-max(e, 0.) / 7.) * pow(max(dot(normalize(vec3(d.x, 0., d.z)), normalize(vec3(S.x, 0., S.z))), 0.), 3.);
        c = mix(c, glowColor * 1.15, clamp(hz * haze, 0., 1.));
        // clouds (thin, high)
        if (clouds > 0. && d.y > 0.) { vec2 uv = d.xz / (d.y + .08); float cl = fbm(vec3(uv * vec2(.9, 2.2) + vec2(time * .01, 0.), 2.)); cl = smoothstep(.52, .8, cl) * clouds * smoothstep(.0, .12, d.y);
          vec3 cc = mix(cloudShade, cloudColor, clamp(.3 + pow(sd, 3.) * 1.2, 0., 1.)); c = mix(c, cc, cl); }
        c += glowColor * glow * (pow(sd, 10.) * .35 + pow(sd, 60.) * .5);
        c = mix(c, darkColor, dark * smoothstep(-5., 25., e) * (1. - .6 * pow(sd, 6.)));
        if (storm > 0.) { float sdir = dot(normalize(d.xz + 1e-5), normalize(stormDir.xz)); float bil = fbm(vec3(d.xz / (d.y + .25) * 1.6 + vec2(time * .05, 0.), 5.));
          c = mix(c, stormColor * (.75 + .6 * bil), storm * smoothstep(-.35, .75, sdir) * smoothstep(-6., 4., e) * (.7 + .3 * bil)); }
        float disc = 1. - smoothstep(sunSize * .5, sunSize * .5 + .08, ang);
        c = mix(c, sunColor * sunI, disc);
        gl_FragColor = vec4(c * intensity, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(o.radius ?? 900, 48, 24), m);
  mesh.frustumCulled = false; mesh.renderOrder = -1000; mesh.userData.noDepth = true; mesh.userData.uniforms = u;
  return mesh;
}
export function gradSkyAndEnv(renderer, o) {
  const sky = gradSky(o);
  const es = new THREE.Scene(); const sky2 = gradSky({ ...o, radius: 40, sunI: Math.min(o.sunI ?? 4, o.envSunI ?? 6) }); es.add(sky2);
  const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(es, o.envBlur ?? .02, .1, 100); pm.dispose();
  return { sky, env: rt.texture };
}

// 4-point star glint sprite (specular sun glint), additive.
let _starTex = null;
export function starGlint({ size = .1, color = '#fff4d8' } = {}) {
  if (!_starTex) _starTex = TEX.drawTexture(128, 128, (x, W, H) => {
    x.clearRect(0, 0, W, H); x.globalCompositeOperation = 'lighter';
    const rg = x.createRadialGradient(64, 64, 0, 64, 64, 22); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H);
    for (const [w, h] of [[64, 2.6], [2.6, 64]]) { const g2 = x.createRadialGradient(64, 64, 0, 64, 64, 64); g2.addColorStop(0, 'rgba(255,255,255,.95)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g2; x.beginPath(); x.ellipse(64, 64, w, h, 0, 0, Math.PI * 2); x.fill(); }
  });
  const m = new THREE.SpriteMaterial({ map: _starTex, color: new THREE.Color(color), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  const sp = new THREE.Sprite(m); sp.scale.setScalar(size); sp.userData.noDepth = true; sp.renderOrder = 30; return sp;
}

// Capture the real scene (ground, rocks, ridge, sky) into a PMREM env map from `pos` (objects in `hide` are hidden),
// so polished steel reflects its actual surroundings. Call after the scene is built.
export function envFromScene(renderer, scene, pos, hide = [], { size = 256, sigma = .015, far = 1800 } = {}) {
  const vis = hide.map(o => o.visible); hide.forEach(o => (o.visible = false));
  const fog = scene.fog; const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, sigma, .05, far, { size, position: new THREE.Vector3(...pos) }); pm.dispose();
  hide.forEach((o, i) => (o.visible = vis[i])); scene.fog = fog;
  return rt.texture;
}

// ---------------------------------------------------------------------------------------------
// ZÜLFİKAR: double-pointed (split-tip) sword, simple gilded hilt, leather grip.
// Origin = the prong tips (y=0), blade along +Y, flat faces toward ±Z. userData.guardY / topY.
export function zulfikar(o = {}) {
  const g = new THREE.Group();
  const Lb = o.bladeLen ?? .8, F = o.fork ?? .17, bend = o.bend ?? .018;
  const hwF = o.hwF ?? .037, hwG = o.hwG ?? .028, tG = .0058, tF = .0038;
  const bendX = y => bend * Math.pow(1 - y / Lb, 2);
  const hex = (cx, hw, t, bf = .42) => { const b = hw * bf; return [[cx - hw, 0], [cx - hw + b, t], [cx + hw - b, t], [cx + hw, 0], [cx + hw - b, -t], [cx - hw + b, -t]]; };
  // body cross-section with a central fuller (groove) on both faces
  const fullered = (cx, hw, t, bf = .4) => { const b = hw * bf, g = hw * .2, dp = t * .5; return [[cx - hw, 0], [cx - hw + b, t], [cx - g, t], [cx, t - dp], [cx + g, t], [cx + hw - b, t], [cx + hw, 0], [cx + hw - b, -t], [cx + g, -t], [cx, -t + dp], [cx - g, -t], [cx - hw + b, -t]]; };
  const loft = secs => {
    const out = []; const NP = secs[0].pts.length;
    for (let k = 0; k < NP; k++) {
      const pos = [], uv = [], idx = [];
      secs.forEach(s => { const A = s.pts[k], B = s.pts[(k + 1) % NP]; pos.push(A[0], s.y, A[1], B[0], s.y, B[1]); uv.push(s.y / Lb, (A[0] + .06) * 5, s.y / Lb, (B[0] + .06) * 5); });
      const m = Math.floor(secs.length / 2), P = i => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      const a = P(m * 2), b = P(m * 2 + 1), c = P(m * 2 + 2);
      const n = c.clone().sub(a).cross(b.clone().sub(a));
      const s = secs[m]; const A = s.pts[k], B = s.pts[(k + 1) % NP]; const exp = new THREE.Vector3((A[0] + B[0]) / 2 - s.cx, 0, (A[1] + B[1]) / 2);
      const flip = n.dot(exp) < 0;
      for (let i = 0; i < secs.length - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; if (!flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); out.push(geo);
    }
    return out;
  };
  const geos = [];
  // body (fork apex -> guard)
  const body = []; const NB = 30;
  for (let i = 0; i <= NB; i++) { const u = i / NB, y = F + (Lb - F) * u; const hw = hwF + (hwG - hwF) * Math.pow(u, .85), t = lerp(tF, tG, u), cx = bendX(y); body.push({ y, cx, pts: o.fuller === false ? hex(cx, hw, t) : fullered(cx, hw, t) }); }
  geos.push(...loft(body));
  // two prongs (tip -> apex)
  for (const sg of [1, -1]) {
    const pr = []; const NP = 18;
    for (let i = 0; i <= NP; i++) { const s = i / NP, y = F * s; const pw = (hwF / 2) * (1 - Math.pow(1 - s, 1.7)); const pc = sg * lerp(hwF * .7, hwF / 2, Math.pow(s, .65)); const t = tF * Math.min(1, Math.pow(s, .55)); const cx = pc + bendX(y); pr.push({ y, cx, pts: hex(cx, Math.max(pw, 1e-5), Math.max(t, 1e-5)) }); }
    geos.push(...loft(pr));
  }
  // cap at the notch apex (faces -Y)
  { const s = body[0].pts; const n = s.length; const pos = []; s.forEach(p => pos.push(p[0], F, p[1])); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(n * 2).fill(0), 2)); const A = [], B = []; for (let i = 1; i < n - 1; i++) { A.push(0, i + 1, i); B.push(0, i, i + 1); } geo.setIndex(A); geo.computeVertexNormals(); if (geo.attributes.normal.getY(0) > 0) { geo.setIndex(B); } geo.computeVertexNormals(); geos.push(geo); }
  const bladeGeo = mergeGeometries(geos);
  const bm = TEX.brushedMetal({ a: '#f4f6f8', b: '#b4bcc6', seed: 31 });
  const steel = new THREE.MeshPhysicalMaterial({ color: o.steelColor ?? '#e8ecf0', metalness: 1, roughness: o.steelRough ?? .45, map: bm.map, roughnessMap: bm.roughnessMap, clearcoat: o.clearcoat ?? .7, clearcoatRoughness: .1, envMapIntensity: 1.25 });
  const blade = new THREE.Mesh(bladeGeo, steel); g.add(blade);
  // hilt (built around the guard, scalable for chunkier Pixar proportions)
  const gold = MAT.gold({ a: o.goldA ?? '#f3cd72', b: o.goldB ?? '#a9792b' });
  const yG = Lb; const H = new THREE.Group(); H.position.y = yG; H.scale.setScalar(o.hiltScale ?? 1); g.add(H);
  const blk = new THREE.Mesh(rbox(.06, .034, .042, .012), gold); blk.position.y = .012; H.add(blk);
  for (const sx of [-1, 1]) {
    const cv = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * .02, .015, 0), new THREE.Vector3(sx * .058, .012, 0), new THREE.Vector3(sx * .088, .0, 0), new THREE.Vector3(sx * .101, -.016, 0)]);
    const q = new THREE.Mesh(new THREE.TubeGeometry(cv, 20, .0105, 10), gold); H.add(q);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.0165, 18, 12), gold); ball.position.copy(cv.getPoint(1)); H.add(ball);
  }
  for (const sz of [-1, 1]) { const l = new THREE.Mesh(rbox(.022, .036, .003, .0012), gold); l.position.set(bendX(yG - .015), yG - .014, sz * (tG + .0012)); g.add(l); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.0165, .004, 8, 28), gold); ring.rotation.x = Math.PI / 2; ring.position.y = .029; H.add(ring);
  const Lg = .14; const gp = [[0, 0]]; for (let i = 0; i <= 44; i++) { const s = i / 44; gp.push([.0148 + .0026 * Math.sin(Math.PI * s) + .0011 * Math.abs(Math.sin(s * Math.PI * 12)), s * Lg]); } gp.push([0, Lg]);
  const grip = lathe(gp, MAT.leather({ a: '#6a3a20', b: '#3a1e0e', seed: 17 }), 28); grip.position.y = .027; H.add(grip);
  const pom = lathe([[0, 0], [.017, 0], [.0225, .01], [.0232, .019], [.018, .031], [.0095, .04], [.0062, .046], [.0078, .051], [0, .056]], gold, 32); pom.position.y = .027 + Lg - .004; H.add(pom);
  const hs = o.hiltScale ?? 1;
  g.userData.hilt = H; g.userData.ballR = new THREE.Vector3(.101 * hs, yG - .016 * hs, 0);
  g.userData.guardY = yG + .012 * hs; g.userData.topY = yG + (.027 + Lg + .05) * hs; g.userData.blade = blade; g.userData.steel = steel;
  return shadowAll(g);
}

// ---------------------------------------------------------------------------------------------
// Rocks
// Small/medium boulder geometry with baked vertex colours (dark crevices). Unit size ~1.
export function rockGeo({ seed = 1, detail = 3, rough = .32, flat = .3, stretch = [1, .65, 1], palette = ['#8c5a3c', '#6e4430', '#a06a48'], faceted = false } = {}) {
  let geo = new THREE.IcosahedronGeometry(1, detail); geo.deleteAttribute('uv'); geo.deleteAttribute('normal'); geo = mergeVertices(geo);
  const p = geo.attributes.position; const v = new THREE.Vector3(); const cols = new Float32Array(p.count * 3);
  const C = palette.map(c => new THREE.Color(c));
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const big = fbm3(v.x * 1.3, v.y * 1.3, v.z * 1.3, seed, 3), sm = fbm3(v.x * 4.2, v.y * 4.2, v.z * 4.2, seed + 3, 3);
    // faceted, chipped look: quantise a bit
    const r = 1 + rough * big + .09 * sm;
    v.multiplyScalar(r); v.x *= stretch[0]; v.y *= stretch[1]; v.z *= stretch[2];
    if (v.y < -flat) v.y = -flat + (v.y + flat) * .12;
    p.setXYZ(i, v.x, v.y, v.z);
    const k = clamp(.5 + big * 1.2); const c = C[0].clone().lerp(C[1], clamp(.5 - sm * 1.5)).lerp(C[2], clamp(k - .45));
    const cav = clamp(.62 + (r - 1) * 1.6, .45, 1.08); c.multiplyScalar(cav);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  if (faceted) { geo = geo.toNonIndexed(); const c = geo.attributes.color; for (let i = 0; i < c.count; i += 3) { const k = .86 + .28 * h3(i, seed, 3, 1); for (let j = 0; j < 3; j++) c.setXYZ(i + j, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k); } }
  geo.computeVertexNormals();
  return geo;
}
let _rockNrm = null;
export function rockMaterial(o = {}) {
  const rs = rockSurface();
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, roughnessMap: rs.roughnessMap, map: rs.map, normalMap: rs.normalMap, normalScale: new THREE.Vector2(.8, .8), color: o.tint ?? '#ffffff' });
}

// Scatter instanced rocks. items: [{x,y,z,s:[sx,sy,sz]|number,ry,variant}]
export function scatterRocks(items, { variants = 3, seed = 5, detail = 2, palette, material, cast = true, faceted = true, big = .3, bigTint = null, boulderMat = null, boulderOpts = null } = {}) {
  const grp = new THREE.Group(); const mat = material ?? rockMaterial();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), S = new THREE.Vector3(), P = new THREE.Vector3();
  const sz = it => Array.isArray(it.s) ? Math.max(...it.s) : it.s;
  const place = (im, list, yOff = 0) => { list.forEach((it, i) => { e.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0); q.setFromEuler(e); const s = it.s; if (Array.isArray(s)) S.set(...s); else S.set(s, s, s); P.set(it.x, it.y + yOff * S.y, it.z); m4.compose(P, q, S); im.setMatrixAt(i, m4); }); im.castShadow = cast; im.receiveShadow = true; grp.add(im); };
  // pebbles / small stones: chunky faceted
  for (let v = 0; v < variants; v++) {
    const list = items.filter(it => (it.variant ?? 0) % variants === v && sz(it) <= big); if (!list.length) continue;
    const geo = rockGeo({ seed: seed + v * 13, detail: faceted ? Math.min(detail, 2) : detail, palette: palette ?? ['#b07656', '#8e5a40', '#c48a66'], stretch: [1, .55 + v * .12, 1 - v * .1], faceted, rough: faceted ? .42 : .32 });
    place(new THREE.InstancedMesh(geo, mat, list.length), list);
  }
  // boulders: mini faceted rocks with rounded edges (same look as the big rock)
  for (let v = 0; v < 2; v++) {
    const list = items.filter(it => (it.variant ?? 0) % 2 === v && sz(it) > big); if (!list.length) continue;
    const fr = facetRock({ a: 1, b: .8, c: 1.15, n: 2.2, planes: 20, jitter: .55, off: [-.28, 0], k: .045, joints: 0, lump: .04, seed: seed + 50 + v * 7, detail: 18, bury: .5, grain: 1.2, nScale: .9, ...((boulderOpts && boulderOpts[v]) || {}) });
    if (boulderMat) fr.material = boulderMat;
    if (bigTint) fr.material.color.set(bigTint);
    place(new THREE.InstancedMesh(fr.geometry, fr.material, list.length), list, -.06);
  }
  return grp;
}

// Huge monolith / butte (the sheltering rock). Implicit rounded-box (wider base) + noise + sandstone strata + fissures.
// Base sits at y=0 (with `bury` metres below). Long axis along Z.
export function monolith({ hx = 3, hy = 3.4, hz = 7, round = 1.3, taper = .22, shear = 0, seed = 4, detail = 64, bury = .9, lump = 1, strataAmp = 1 } = {}) {
  let geo = new THREE.IcosahedronGeometry(1, detail); geo.deleteAttribute('uv'); geo.deleteAttribute('normal'); geo = mergeVertices(geo);
  const sd = (x, y, z) => { y += shear * z; const k = 1 + taper * (.5 - y / (2 * hy)); const qx = Math.abs(x / k) - (hx - round), qy = Math.abs(y) - (hy - round), qz = Math.abs(z / k) - (hz - round); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - round; };
  const strataY = (x, y, z) => y / 1.25 + .45 * fbm3(x * .18, 0, z * .18, seed + 5, 2);
  const disp = (x, y, z) => {
    let d = lump * (.75 * fbm3(x * .11, y * .11, z * .11, seed, 4) + .28 * fbm3(x * .36, y * .36, z * .36, seed + 11, 3)) + .07 * fbm3(x * 1.3, y * 1.3, z * 1.3, seed + 3, 2);
    const f = fract(strataY(x, y, z)); d += strataAmp * (.13 * smoothstep(0, .05, f) * (1 - f) - .05);   // ledges: sharp lip, sloping face
    const j = 1 - Math.abs(noise3(x * .24, y * .03, z * .24, seed + 9)); d -= .55 * Math.pow(j, 18);       // deep vertical joints
    const j2 = 1 - Math.abs(noise3(x * .62 + 7, y * .05, z * .62, seed + 19)); d -= .16 * Math.pow(j2, 12);
    return d;
  };
  const strata = y => { const f = fract(y); return smoothstep(0, .1, f) - smoothstep(.6, 1, f); };
  const p = geo.attributes.position; const d = new THREE.Vector3(), P = new THREE.Vector3(), N = new THREE.Vector3();
  const R = Math.hypot(hx, hy, hz) * 1.6; const e = .02;
  const cols = new Float32Array(p.count * 3), uvs = new Float32Array(p.count * 2);
  const pal = ['#c4784b', '#b4663f', '#d4955f', '#a85d39', '#cc8655', '#b97048'].map(c => new THREE.Color(c));
  const top = new THREE.Color('#dca274'), base = new THREE.Color('#7a4a32'), crev = new THREE.Color('#4a2a1c');
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    let a = 0, b = R; for (let it = 0; it < 30; it++) { const m = (a + b) / 2; if (sd(d.x * m, d.y * m, d.z * m) < 0) a = m; else b = m; }
    P.copy(d).multiplyScalar((a + b) / 2);
    N.set(sd(P.x + e, P.y, P.z) - sd(P.x - e, P.y, P.z), sd(P.x, P.y + e, P.z) - sd(P.x, P.y - e, P.z), sd(P.x, P.y, P.z + e) - sd(P.x, P.y, P.z - e)).normalize();
    const dd = disp(P.x, P.y, P.z) * (P.y < -hy * .75 ? .5 : 1);
    P.addScaledVector(N, dd);
    p.setXYZ(i, P.x, P.y + hy - bury, P.z); const Py0 = P.y;
    // colour: strata layer palette + crevice darkening + sun-bleached top + dusty base
    const sy = strataY(P.x, P.y, P.z); const layer = Math.floor(sy);
    const c = pal[((layer % pal.length) + pal.length) % pal.length].clone();
    c.lerp(pal[(((layer + 1) % pal.length) + pal.length) % pal.length], clamp(fract(sy) * 1.2 - .1) * .35);
    c.multiplyScalar(.9 + .2 * fbm3(P.x * 1.7, P.y * 1.7, P.z * 1.7, seed + 2, 2));
    c.lerp(top, clamp((N.y - .55) * 2.2) * .6);
    c.lerp(base, clamp(1 - (P.y + hy - bury) / 1.4) * .55);
    c.lerp(crev, clamp(-(dd + .05) * 2.2) * .8);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    // box-projected uv for the detail normal map
    const ax = Math.abs(N.x), ay = Math.abs(N.y), az = Math.abs(N.z); const sc = .35;
    if (ay > ax && ay > az) { uvs[i * 2] = P.x * sc; uvs[i * 2 + 1] = P.z * sc; } else if (ax > az) { uvs[i * 2] = P.z * sc; uvs[i * 2 + 1] = P.y * sc; } else { uvs[i * 2] = P.x * sc; uvs[i * 2 + 1] = P.y * sc; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const st = TEX.stone({ a: '#ffffff', b: '#d2c8bc', seed: 43, repeat: [1, 1] });
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: st.map, normalMap: st.normalMap, normalScale: new THREE.Vector2(.9, .9), roughness: .9 });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.height = 2 * hy - bury; return mesh;
}

// Chiselled sandstone butte: rounded box ∩ random cutting planes (chunky flat facets, softened edges), subtle ledges,
// strata as colour bands, dark desert-varnish streaks. Base at y=0 (bury below). Long axis along Z.
export function butte({ hx = 3.2, hy = 3, hz = 5, round = .5, taper = .25, shear = 0, cuts = 26, seed = 4, detail = 70, bury = .7, ledge = .07, noiseAmp = .1, outline = .35, skirt = .35, bulge = .7, flute = .45 } = {}) {
  let geo = new THREE.IcosahedronGeometry(1, detail); geo.deleteAttribute('uv'); geo.deleteAttribute('normal'); geo = mergeVertices(geo);
  const r = rng(seed); const planes = [];
  for (let i = 0; i < cuts; i++) {
    // mostly near-vertical cliff facets, some sloped shoulders / top facets
    const kind = r(); let nx, ny, nz;
    if (kind < .62) { const a = r() * Math.PI * 2; ny = (r() - .35) * .35; nx = Math.cos(a); nz = Math.sin(a); }
    else { const a = r() * Math.PI * 2; ny = .55 + r() * .4; nx = Math.cos(a) * (1 - ny); nz = Math.sin(a) * (1 - ny); }
    const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
    const sup = hx * Math.abs(nx) + hy * Math.abs(ny) + hz * Math.abs(nz);
    planes.push([nx, ny, nz, sup * (.7 + r() * .2)]);
  }
  for (let i = 0; i < 4; i++) { const a = r() * 6.28, t = .18 + r() * .25; const nx = Math.cos(a) * t, nz = Math.sin(a) * t, ny = 1; const L = Math.hypot(nx, ny, nz); planes.push([nx / L, ny / L, nz / L, (hy * .8 + (hx * Math.abs(nx) + hz * Math.abs(nz)) * .45) / L]); }
  const base = (x, y, z) => { y += shear * z; const ang = Math.atan2(z / hz, x / hx); const m = 1 + outline * fbm3(Math.cos(ang) * 1.6, Math.sin(ang) * 1.6, y * .07, seed + 31, 3);
    const k = (1 + taper * (.5 - y / (2 * hy)) + skirt * Math.exp(-(y + hy) / .9)) * m;
    const pr = Math.pow(Math.pow(Math.abs(x / (hx * k)), 3) + Math.pow(Math.abs(z / (hz * k)), 3), 1 / 3) - 1; const dP = pr * Math.min(hx, hz) * k;
    const qx = dP + round, qy = Math.abs(y) - hy + round; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - round; };
  const sd = (x, y, z) => { let d = base(x, y, z); for (const [a, b, c, o] of planes) { if (b < .3 || y > -hy * .6) d = Math.max(d, a * x + b * y + c * z - o); } return d; };
  const strataY = (x, y, z) => y / 1.15 + .35 * fbm3(x * .15, 0, z * .15, seed + 5, 2);
  const p = geo.attributes.position; const d = new THREE.Vector3(), P = new THREE.Vector3(), N = new THREE.Vector3();
  const R = Math.hypot(hx, hy, hz) * 1.7; const e = .015;
  const cols = new Float32Array(p.count * 3), uvs = new Float32Array(p.count * 2);
  const pal = ['#c47a4e', '#a85c3a', '#dba274', '#9a5034', '#cf9060', '#b26a46', '#e0b088'].map(c => new THREE.Color(c));
  const top = new THREE.Color('#e0a878'), baseC = new THREE.Color('#84503a'), varnish = new THREE.Color('#5a3222');
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    let a = 0, b = R; for (let it = 0; it < 32; it++) { const m = (a + b) / 2; if (sd(d.x * m, d.y * m, d.z * m) < 0) a = m; else b = m; }
    P.copy(d).multiplyScalar((a + b) / 2);
    N.set(sd(P.x + e, P.y, P.z) - sd(P.x - e, P.y, P.z), sd(P.x, P.y + e, P.z) - sd(P.x, P.y - e, P.z), sd(P.x, P.y, P.z + e) - sd(P.x, P.y, P.z - e)).normalize();
    const f = fract(strataY(P.x, P.y, P.z));
    const side = 1 - Math.abs(N.y);
    let dd = noiseAmp * fbm3(P.x * .5, P.y * .5, P.z * .5, seed + 11, 3) + .035 * fbm3(P.x * 2.2, P.y * 2.2, P.z * 2.2, seed + 3, 2)
      + bulge * fbm3(P.x * .13, P.y * .13, P.z * .13, seed + 23, 3) + side * flute * fbm3(P.x * .45, P.y * .05, P.z * .45, seed + 29, 3);
    dd += side * ledge * (.6 + .8 * fbm3(P.x * .3, 0, P.z * .3, seed + 17, 2)) * (smoothstep(0, .04, f) * (1 - f) - .5);  // small, uneven ledge lips
    P.addScaledVector(N, dd);
    p.setXYZ(i, P.x, P.y + hy - bury, P.z);
    const sy = strataY(P.x, P.y, P.z); const layer = Math.floor(sy); const PL = pal.length;
    const c = pal[((layer % PL) + PL) % PL].clone().lerp(pal[(((layer + 3) % PL) + PL) % PL], clamp(fbm3(P.x * .4, P.y * 3, P.z * .4, seed + 7, 2) + .3) * .5);
    c.multiplyScalar(.92 + .16 * fbm3(P.x * 1.5, P.y * 1.5, P.z * 1.5, seed + 2, 2));
    const vs = clamp((fbm3(P.x * 1.6, P.y * .12, P.z * 1.6, seed + 13, 3) - .05) * 3.2) * side * clamp((P.y + hy) / (2 * hy) + .2);
    c.lerp(varnish, vs * .55);
    c.lerp(top, clamp((N.y - .6) * 2.5) * .55);
    c.lerp(baseC, clamp(1 - (P.y + hy - bury) / 1.2) * .5);
    c.multiplyScalar(.9 + .1 * smoothstep(0, .1, f));   // faint seam at each bedding plane
    c.multiplyScalar(clamp(.95 + dd * 1.1, .5, 1.15));     // cavity: recesses darker, buttresses lighter
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    const ax = Math.abs(N.x), ay = Math.abs(N.y), az = Math.abs(N.z); const sc = .3;
    if (ay > ax && ay > az) { uvs[i * 2] = P.x * sc; uvs[i * 2 + 1] = P.z * sc; } else if (ax > az) { uvs[i * 2] = P.z * sc; uvs[i * 2 + 1] = P.y * sc; } else { uvs[i * 2] = P.x * sc; uvs[i * 2 + 1] = P.y * sc; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const st = TEX.stone({ a: '#ffffff', b: '#d6ccc0', seed: 43, repeat: [1, 1] });
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: st.map, normalMap: st.normalMap, normalScale: new THREE.Vector2(1.1, 1.1), roughness: .92 });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.height = 2 * hy - bury; return mesh;
}

// Fractured granite tor (Uhud is red granite): superellipsoid mass broken by 3-D cellular jointing into tilted planar
// blocks with dark cracks between them. Base at y=0 (bury below ground). Long axis along Z.
export function tor({ a = 4, b = 3.2, c = 5.5, n = 2.6, cell = 1.7, cellY = null, seed = 4, detail = 80, bury = .9, step = .28, tilt = .32, crack = .22, crackW = .22, lump = .45, yOff = 0 } = {}) {
  let geo = new THREE.IcosahedronGeometry(1, detail); geo.deleteAttribute('uv'); geo.deleteAttribute('normal'); geo = mergeVertices(geo);
  const p = geo.attributes.position; const d = new THREE.Vector3(), P = new THREE.Vector3(), N = new THREE.Vector3(), G = new THREE.Vector3();
  const cols = new Float32Array(p.count * 3), uvs = new Float32Array(p.count * 2);
  const pal = [new THREE.Color('#b86c4c'), new THREE.Color('#cc8f6c'), new THREE.Color('#9c5640'), new THREE.Color('#d6a07c')];
  const crk = new THREE.Color('#3e2219'), topC = new THREE.Color('#dcae88'), baseC = new THREE.Color('#7a4834'), varn = new THREE.Color('#5a3024');
  const H = (i, j, k, s) => h3(i, j, k, seed * 13 + s);
  for (let v = 0; v < p.count; v++) {
    d.fromBufferAttribute(p, v).normalize();
    const r0 = 1 / Math.pow(Math.pow(Math.abs(d.x / a), n) + Math.pow(Math.abs(d.y / b), n) + Math.pow(Math.abs(d.z / c), n), 1 / n);
    P.copy(d).multiplyScalar(r0);
    G.set(Math.sign(P.x) * Math.pow(Math.abs(P.x / a), n - 1) / a, Math.sign(P.y) * Math.pow(Math.abs(P.y / b), n - 1) / b, Math.sign(P.z) * Math.pow(Math.abs(P.z / c), n - 1) / c); N.copy(G).normalize();
    // cellular jointing
    const cy = cellY ?? cell; const gx = Math.floor(P.x / cell), gy = Math.floor(P.y / cy), gz = Math.floor(P.z / cell);
    let f1 = 1e9, f2 = 1e9, id = null, fp = null;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      const ci = gx + i, cj = gy + j, ck = gz + k; const fx = (ci + H(ci, cj, ck, 1)) * cell, fy = (cj + .3 + H(ci, cj, ck, 2) * .4) * cy, fz = (ck + H(ci, cj, ck, 3)) * cell;
      const dist = Math.hypot((P.x - fx) / cell, (P.y - fy) / cy, (P.z - fz) / cell) * cell;
      if (dist < f1) { f2 = f1; f1 = dist; id = [ci, cj, ck]; fp = [fx, fy, fz]; } else if (dist < f2) f2 = dist;
    }
    const [ci, cj, ck] = id;
    const gxv = (H(ci, cj, ck, 4) - .5) * 2 * tilt, gyv = (H(ci, cj, ck, 5) - .5) * 2 * tilt * .6, gzv = (H(ci, cj, ck, 6) - .5) * 2 * tilt, oc = (H(ci, cj, ck, 7) - .5) * 2 * step;
    const edge = f2 - f1; const cr = 1 - smoothstep(0, crackW, edge);
    let dd = oc + (P.x - fp[0]) * gxv + (P.y - fp[1]) * gyv + (P.z - fp[2]) * gzv - crack * cr + lump * fbm3(P.x * .14, P.y * .14, P.z * .14, seed, 3) + .05 * fbm3(P.x * 1.4, P.y * 1.4, P.z * 1.4, seed + 3, 2);
    P.addScaledVector(N, dd);
    p.setXYZ(v, P.x, P.y + b + yOff - bury, P.z);
    const tone = H(ci, cj, ck, 8); const col = pal[Math.floor(tone * 4) % 4].clone().lerp(pal[(Math.floor(tone * 4) + 1) % 4], fract(tone * 4) * .5);
    col.multiplyScalar(.9 + .2 * fbm3(P.x * 2, P.y * 2, P.z * 2, seed + 5, 2));
    const side = 1 - Math.abs(N.y);
    col.lerp(varn, clamp((fbm3(P.x * 1.4, P.y * .1, P.z * 1.4, seed + 13, 3) - .08) * 3) * side * .5);
    col.lerp(topC, clamp((N.y - .5) * 2) * .5);
    col.lerp(baseC, clamp(1 - (P.y + b - bury) / 1.2) * .45);
    col.lerp(crk, cr * .85); col.multiplyScalar(clamp(.92 + dd * .8, .55, 1.12));
    cols[v * 3] = col.r; cols[v * 3 + 1] = col.g; cols[v * 3 + 2] = col.b;
    const ax = Math.abs(N.x), ay = Math.abs(N.y), az = Math.abs(N.z); const sc = .3;
    if (ay > ax && ay > az) { uvs[v * 2] = P.x * sc; uvs[v * 2 + 1] = P.z * sc; } else if (ax > az) { uvs[v * 2] = P.z * sc; uvs[v * 2 + 1] = P.y * sc; } else { uvs[v * 2] = P.x * sc; uvs[v * 2 + 1] = P.y * sc; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const st = TEX.stone({ a: '#ffffff', b: '#cfc4b8', seed: 47, repeat: [1, 1] });
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: st.map, normalMap: st.normalMap, normalScale: new THREE.Vector2(1.2, 1.2), roughness: .88 });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.height = 2 * b - bury + yOff; return mesh;
}

// Tileable rock-surface texture (colour multiplier + normal + roughness): Voronoi chipped plates with tilted planes,
// irregular cracks along some plate edges, ridged grain and speckle. Cached.
let _rockSurf = null;
export function rockSurface({ size = 512, cells = 4, seed = 61 } = {}) {
  if (_rockSurf) return _rockSurf;
  const fine = TEX.fbmField(seed, 48, 3), mid = TEX.fbmField(seed + 7, 8, 4), H = (i, j, s) => h3(((i % cells) + cells) % cells, ((j % cells) + cells) % cells, 0, seed + s);
  const b = TEX.bake(size, (u, v) => {
    const x = u * cells, y = v * cells, gx = Math.floor(x), gy = Math.floor(y);
    let f1 = 9, f2 = 9, ci = 0, cj = 0, fx = 0, fy = 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const cx = gx + i, cy = gy + j; const px = cx + H(cx, cy, 1), py = cy + H(cx, cy, 2); const d = Math.hypot(x - px, y - py); if (d < f1) { f2 = f1; f1 = d; ci = cx; cj = cy; fx = px; fy = py; } else if (d < f2) f2 = d; }
    const tx = (H(ci, cj, 3) - .5) * .45, ty = (H(ci, cj, 4) - .5) * .45; const plate = (x - fx) * tx + (y - fy) * ty + (H(ci, cj, 5) - .5) * .3;
    const edge = f2 - f1; const crackOn = H(ci, cj, 6) > .86 ? 1 : 0; const crack = (1 - smoothstep(0, .06, edge)) * crackOn * (.5 + .5 * smoothstep(.3, .7, mid(u * 3 % 1, v * 3 % 1) * .5 + .5));
    const g = fine(u, v) * .5 + .5, m = mid(u, v) * .5 + .5; const ridged = 1 - Math.abs(mid(u * 2 % 1, v * 2 % 1));
    const h = .45 + plate * .1 + ridged * .26 + g * .18 - crack * .3;
    const tone = .9 + (H(ci, cj, 7) - .5) * .06 + (g - .5) * .18 + (m - .5) * .16 - crack * .22;
    const speck = g > .8 ? .1 : g < .18 ? -.1 : 0;
    const c = clamp(tone + speck, .35, 1.1);
    return { c: [c, c * .985, c * .97], h, r: .82 + g * .12 + crack * .05 };
  }, { normalStrength: 5 });
  _rockSurf = { map: TEX.texFromCanvas(b.colorCanvas), normalMap: TEX.texFromCanvas(b.normalCanvas, { srgb: false }), roughnessMap: TEX.texFromCanvas(b.roughCanvas, { srgb: false }) };
  return _rockSurf;
}

// Faceted boulder/tor: smooth-min hull of many jittered tangent planes over a superellipsoid -> flat chiselled facets
// with softly rounded edges (stylised but unmistakably stone), a few through-going joints, gentle large-scale unevenness.
export function facetRock({ a = 4, b = 3, c = 5.5, n = 2.4, planes = 220, jitter = .32, off = [-.12, .2], k = .1, joints = 4, jointW = .1, jointD = .22, lump = .35, seed = 4, detail = 84, bury = .9, grain = 1.5, nScale = .45, bands = 0, palette } = {}) {
  let geo = new THREE.IcosahedronGeometry(1, detail); geo.deleteAttribute('uv'); geo.deleteAttribute('normal'); geo = mergeVertices(geo);
  const r = rng(seed); const r0 = d => 1 / Math.pow(Math.pow(Math.abs(d.x / a), n) + Math.pow(Math.abs(d.y / b), n) + Math.pow(Math.abs(d.z / c), n), 1 / n);
  const gN = P => new THREE.Vector3(Math.sign(P.x) * Math.pow(Math.abs(P.x / a), n - 1) / a, Math.sign(P.y) * Math.pow(Math.abs(P.y / b), n - 1) / b, Math.sign(P.z) * Math.pow(Math.abs(P.z / c), n - 1) / c).normalize();
  const PL = [];
  for (let i = 0; i < planes; i++) {
    const y = 1 - (i + .5) / planes * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963 + r() * .5;
    const u = new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad).normalize();
    const B = u.clone().multiplyScalar(r0(u)); const N = gN(B);
    const nn = N.clone().add(new THREE.Vector3(r() - .5, (r() - .5) * .6, r() - .5).multiplyScalar(jitter * 2)).normalize();
    const Q = B.addScaledVector(N, lerp(off[0], off[1], r()));
    PL.push([nn.x, nn.y, nn.z, nn.dot(Q), i]);
  }
  const J = []; for (let i = 0; i < joints; i++) { const v = new THREE.Vector3(r() - .5, (r() - .5) * (i % 2 ? .3 : 2.5), r() - .5).normalize(); J.push([v, (r() - .5) * Math.min(a, c) * 1.1]); }
  const pal = (palette ?? ['#b86c4c', '#c98a68', '#a65e44', '#d39e7c', '#bf7a58']).map(x => new THREE.Color(x));
  const crk = new THREE.Color('#3e2219'), topC = new THREE.Color('#dcae88'), baseC = new THREE.Color('#7a4834'), varn = new THREE.Color('#5a3024');
  const p = geo.attributes.position; const d = new THREE.Vector3(), P = new THREE.Vector3();
  const cols = new Float32Array(p.count * 3), fid = new Float32Array(p.count);
  const T = new Float32Array(planes);
  for (let v = 0; v < p.count; v++) {
    d.fromBufferAttribute(p, v).normalize();
    let tmin = 1e9, t2 = 1e9, im = 0, cnt = 0;
    for (let i = 0; i < planes; i++) { const q = PL[i]; const den = q[0] * d.x + q[1] * d.y + q[2] * d.z; if (den > .05) { const t = q[3] / den; T[i] = t; if (t < tmin) { t2 = tmin; tmin = t; im = i; } else if (t < t2) t2 = t; } else T[i] = 1e9; }
    let sum = 0; for (let i = 0; i < planes; i++) if (T[i] < tmin + 6 * k) sum += Math.exp(-(T[i] - tmin) / k);
    let t = tmin - k * Math.log(sum);
    P.copy(d).multiplyScalar(t);
    let jc = 0; for (const [jv, jo] of J) { const dist = Math.abs(P.dot(jv) - jo); jc = Math.max(jc, 1 - smoothstep(0, jointW, dist)); }
    const lm = lump * fbm3(P.x * .15, P.y * .15, P.z * .15, seed + 1, 3);
    t += lm - jointD * jc + .05 * fbm3(P.x * 1.1, P.y * 1.1, P.z * 1.1, seed + 3, 3);
    P.copy(d).multiplyScalar(t);
    p.setXYZ(v, P.x, P.y + b - bury, P.z);
    const tone = h3(im, 1, 2, seed); const col = pal[Math.floor(tone * pal.length) % pal.length].clone();
    col.multiplyScalar(.94 + .12 * fbm3(P.x * 2.5, P.y * 2.5, P.z * 2.5, seed + 5, 2));
    if (bands > 0) { const by = P.y * .85 + .35 * fbm3(P.x * .12, 0, P.z * .12, seed + 51, 2); col.multiplyScalar(1 + bands * (smoothstep(.35, .5, fract(by)) - smoothstep(.8, .95, fract(by)) - .4)); }
    const edgeK = 1 - smoothstep(0, .22, t2 - tmin); col.lerp(topC, edgeK * .3);                       // worn, lighter facet edges
    col.lerp(varn, clamp((fbm3(P.x * 1.3, P.y * .1, P.z * 1.3, seed + 13, 3) - .1) * 2.6) * .45 * clamp((P.y + b) / (2 * b) + .3));
    col.lerp(baseC, clamp(1 - (P.y + b - bury) / 1.1) * .45);
    col.lerp(crk, jc * .8); col.multiplyScalar(clamp(.95 + lm * .5, .7, 1.1));
    cols[v * 3] = col.r; cols[v * 3 + 1] = col.g; cols[v * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  // top-facing dust + box-projected uv for the fine grain normal map (computed with final normals)
  const nr = geo.attributes.normal; const uvs = new Float32Array(p.count * 2); const sc = grain;
  for (let v = 0; v < p.count; v++) {
    const x = p.getX(v), y = p.getY(v), z = p.getZ(v), nx = nr.getX(v), ny = nr.getY(v), nz = nr.getZ(v);
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    if (ay > ax && ay > az) { uvs[v * 2] = x * sc; uvs[v * 2 + 1] = z * sc; } else if (ax > az) { uvs[v * 2] = z * sc; uvs[v * 2 + 1] = y * sc; } else { uvs[v * 2] = x * sc; uvs[v * 2 + 1] = y * sc; }
    const tk = clamp((ny - .55) * 2.2) * .5; if (tk > 0) { cols[v * 3] = lerp(cols[v * 3], topC.r, tk); cols[v * 3 + 1] = lerp(cols[v * 3 + 1], topC.g, tk); cols[v * 3 + 2] = lerp(cols[v * 3 + 2], topC.b, tk); }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  const rs = rockSurface(); const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: rs.map, normalMap: rs.normalMap, roughnessMap: rs.roughnessMap, normalScale: new THREE.Vector2(nScale, nScale), roughness: 1 });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.height = 2 * b - bury; return mesh;
}

// Sandstone surface texture (no cells / no outlines): fine wavy bedding laminations, grain, pits, speckle. Cached.
let _sandSurf = null;
export function sandstoneSurface({ size = 512, seed = 71 } = {}) {
  if (_sandSurf) return _sandSurf;
  const fine = TEX.fbmField(seed, 64, 3), mid = TEX.fbmField(seed + 7, 8, 4), warp = TEX.fbmField(seed + 13, 4, 3);
  const b = TEX.bake(size, (u, v) => {
    const g = fine(u, v) * .5 + .5, m = mid(u, v) * .5 + .5, w = warp(u, v);
    const lv = v * 9 + w * .35; const lam = Math.abs(Math.sin(lv * Math.PI)); const lam2 = Math.abs(Math.sin(lv * Math.PI * 3.1 + 1.3));
    const pit = g < .2 ? (.2 - g) * 3 : 0;
    const h = .5 + (lam - .5) * .25 + (lam2 - .5) * .08 + (g - .5) * .35 + (m - .5) * .25 - pit * .4;
    const tone = .9 + (lam - .5) * .1 + (g - .5) * .16 + (m - .5) * .14 - pit * .25;
    const c = clamp(tone, .45, 1.08);
    return { c: [c, c * .98, c * .955], h, r: .84 + g * .12 };
  }, { normalStrength: 4 });
  _sandSurf = { map: TEX.texFromCanvas(b.colorCanvas), normalMap: TEX.texFromCanvas(b.normalCanvas, { srgb: false }), roughnessMap: TEX.texFromCanvas(b.roughCanvas, { srgb: false }) };
  return _sandSurf;
}
export function sandstoneMaterial({ nScale = .9 } = {}) {
  const ss = sandstoneSurface();
  return new THREE.MeshStandardMaterial({ vertexColors: true, map: ss.map, normalMap: ss.normalMap, roughnessMap: ss.roughnessMap, normalScale: new THREE.Vector2(nScale, nScale), roughness: 1 });
}

// Ancient sandstone massif: a stack of irregular horizontal strata (each an extruded, bevelled slab whose plan outline
// recedes upward), a broken stepped top, deep vertical fissures cutting through several layers, weathering colours
// (dark red-brown base, light weathered ledges, dark crevices, ground-contact darkening, desert-varnish streaks).
// Returns a Group of layer meshes (geometry already in group-local coords). Base at y=0, `bury` below ground. Long axis Z.
export function sandstoneMassif({ a = 4.6, c = 6.6, n = 3, layers = 7, height = 5.6, bury = .5, seed = 4, K = 240, fissures = 7, recede = .022, ...o } = {}) {
  const r = rng(seed); const grp = new THREE.Group(); const mat = sandstoneMaterial();
  const th = []; for (let i = 0; i < layers; i++) th.push((o.thinBeds && r() < .3 ? .22 : .4) + r() * .75 + (i === 0 ? .5 : 0)); const sc = (height + bury) / th.reduce((x, y) => x + y, 0); for (let i = 0; i < layers; i++) th[i] *= sc;
  const fis = []; for (let j = 0; j < fissures; j++) { const f = { ang: r() * Math.PI * 2, w: .02 + r() * .022, d: .5 + r() * .5, from: Math.floor(r() * 2), to: layers - 1 - Math.floor(r() * 2) }; fis.push(f); }
  const R0 = t => 1 / Math.pow(Math.pow(Math.abs(Math.cos(t)) / a, n) + Math.pow(Math.abs(Math.sin(t)) / c, n), 1 / n);
  const angD = (x, y) => { let d = x - y; d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return d; };
  const pal = ['#8a4630', '#a55a38', '#9a5034', '#bd6f45', '#c98050', '#d6955f', '#dfa874', '#e4b483'].map(x => new THREE.Color(x));
  const ledgeC = new THREE.Color('#ecc296'), crevC = new THREE.Color('#3e2016'), groundC = new THREE.Color('#5e3222'), varnC = new THREE.Color('#5a2e20');
  const fl = fis.map((f, j) => Array.from({ length: layers }, (_, i) => ({ on: i >= f.from && i <= f.to, da: (h3(j, i, 2, seed) - .5) * .006 + .005 * i * (h3(j, 0, 3, seed) - .5), dk: .75 + h3(j, i, 4, seed) * .35 + .06 * i, wk: .7 + .12 * i + h3(j, i, 5, seed) * .3 })));   // joints run straight through the beds, widening upward
  const fissAt = (t, i) => { let dd = 0; fis.forEach((f, j) => { const q = fl[j][i]; if (!q.on) return; const x = Math.abs(angD(t, f.ang + q.da)); dd = Math.max(dd, f.d * q.dk * (1 - smoothstep(0, f.w * q.wk, x))); }); return dd; };
  let y0 = -bury; let topY = 0;
  for (let i = 0; i < layers; i++) {
    const hard = r(); const s0 = 1 - recede * i + (hard - .5) * .07;   // mostly flush cliff; hard beds protrude, soft beds recess
    const topCut = i === layers - 1 ? .55 : i === layers - 2 ? .32 : i === layers - 3 ? .12 : 0;
    const pts = [];
    for (let k = 0; k < K; k++) {
      const t = k / K * Math.PI * 2;
      let rr = R0(t) * s0 * (1 + .1 * fbm3(Math.cos(t) * 1.5, Math.sin(t) * 1.5, i * .1, seed, 3) + .05 * fbm3(Math.cos(t) * 4, Math.sin(t) * 4, i * .15, seed + 17, 2) + .035 * fbm3(Math.cos(t) * 9, Math.sin(t) * 9, i * 1.7, seed + 3, 2) + .016 * fbm3(Math.cos(t) * 24, Math.sin(t) * 24, i * 3.1, seed + 8, 2));
      rr -= fissAt(t, i);
      if (topCut) { const bite = smoothstep(.0, .35, fbm3(Math.cos(t) * 1.4 + 3, Math.sin(t) * 1.4, i * 2.1, seed + 9, 3)); rr *= 1 - topCut * bite; }
      pts.push(new THREE.Vector2(Math.cos(t) * rr, -Math.sin(t) * rr));
    }
    const h = th[i], bt = Math.min(o.bevelT ?? .05, h * .1), bs = o.bevelS ?? .045;
    let geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: Math.max(.05, h - 2 * bt), bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelOffset: -bs, bevelSegments: 1, steps: o.steps ?? 4, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, y0 + bt, 0);
    geo.deleteAttribute('uv'); geo.deleteAttribute('normal'); geo = mergeVertices(geo, 1e-3);
    const p = geo.attributes.position, cols = new Float32Array(p.count * 3);
    for (let v = 0; v < p.count; v++) {
      const x = p.getX(v), y = p.getY(v), z = p.getZ(v); const L = Math.hypot(x, z) || 1;
      const prof = hard < .45 ? -((.08 + .12 * (.45 - hard)) * (o.softK ?? 1)) * Math.sin(Math.PI * clamp((y - y0) / h)) : 0;   // soft beds weather back (concave)
      const yy0 = (y - y0) / h; const lip = (o.lip ?? 0) * (smoothstep(.72, .95, yy0) - .55 * smoothstep(0, .18, 1 - Math.abs(yy0 - .08) / .08));   // hard cap lip + undercut groove
      const dsp = prof + lip + (o.rough ?? .06) * fbm3(x * .55, y * .4, z * .55, seed + 21, 3) + .04 * fbm3(x * 2.3, y * 2.3, z * 2.3, seed + 5, 2);
      const und = .5 * fbm3(x * .08, 0, z * .08, seed + 61, 3) * smoothstep(-bury, height, y);   // gently undulating bedding (shared field: layers stay in contact)
      p.setXYZ(v, x + x / L * dsp, y + und, z + z / L * dsp);
      // colour
      const t = Math.atan2(z, x); const fd = fissAt(t, i);
      const col = pal[Math.min(pal.length - 1, Math.round(i / (layers - 1) * (pal.length - 1)))].clone(); col.multiplyScalar(i % 2 ? .9 : 1.06);
      col.multiplyScalar(.9 + .16 * fbm3(x * .9, y * 2.5, z * .9, seed + 31, 2) + .22 * fbm3(x * .28, y * .2, z * .28, seed + 41, 3)); if (hard < .45) col.multiplyScalar(.86);
      const yy = y - y0; if (yy < bt * 1.1) col.multiplyScalar(.72); if (yy > h - bt * 1.2) col.lerp(ledgeC, .15);
      col.lerp(varnC, clamp((fbm3(x * 1.3, y * .1, z * 1.3, seed + 13, 3) - .05) * 2.8) * .55);
      col.lerp(crevC, clamp(fd / .5) * .75);
      col.lerp(groundC, clamp(1 - y / .9) * .6);
      cols[v * 3] = col.r; cols[v * 3 + 1] = col.g; cols[v * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo = toCreasedNormals(geo, Math.PI / 4.5);
    const p2 = geo.attributes.position; const cols2 = geo.attributes.color.array;
    const nr = geo.attributes.normal, uvs = new Float32Array(p2.count * 2), us = .5;
    for (let v = 0; v < p2.count; v++) {
      const x = p2.getX(v), y = p2.getY(v), z = p2.getZ(v), ny = nr.getY(v), ax = Math.abs(nr.getX(v)), az = Math.abs(nr.getZ(v));
      if (Math.abs(ny) > .7) { uvs[v * 2] = x * us * .6; uvs[v * 2 + 1] = z * us * .6; const k = clamp((ny - .7) / .3) * .25; cols2[v * 3] = lerp(cols2[v * 3], ledgeC.r, k); cols2[v * 3 + 1] = lerp(cols2[v * 3 + 1], ledgeC.g, k); cols2[v * 3 + 2] = lerp(cols2[v * 3 + 2], ledgeC.b, k); }
      else if (ax > az) { uvs[v * 2] = z * us; uvs[v * 2 + 1] = y * us; } else { uvs[v * 2] = x * us; uvs[v * 2 + 1] = y * us; }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; grp.add(mesh);
    y0 += h; topY = y0;
  }
  grp.userData.height = topY; grp.userData.R0 = R0;
  return grp;
}

// Distant mountain ridge (Uhud-like long granite massif). Built along X, centred at origin, faces +Z.
export function ridge({ width = 700, depth = 180, height = 70, seg = [240, 50], seed = 3, color = '#7a3e2a', top = null, basic = false, fog = true } = {}) {
  const geo = new THREE.PlaneGeometry(width, depth, seg[0], seg[1]); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  const cols = new Float32Array(p.count * 3); const C = new THREE.Color(color), T = new THREE.Color(top ?? color);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const prof = .55 + .45 * fbm3(x * .006, 0, 0, seed, 3) + .25 * Math.max(0, fbm3(x * .02, 1, 0, seed + 4, 2));
    const across = Math.exp(-Math.pow(z / (depth * .28), 2));
    const gul = 1 - .22 * Math.pow(1 - Math.abs(noise3(x * .05, 0, z * .05, seed + 7)), 4);
    const ends = smoothstep(width / 2, width / 2 * .55, Math.abs(x));
    const h = height * prof * across * gul * ends + 2 * fbm3(x * .08, 0, z * .08, seed + 2, 2);
    p.setY(i, h);
    const c = C.clone().lerp(T, clamp(h / height)); c.multiplyScalar(.85 + .3 * gul - .15);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const mat = basic ? new THREE.MeshBasicMaterial({ vertexColors: true, fog }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, fog });
  const m = new THREE.Mesh(geo, mat); m.userData.noDepth = false; return m;
}

// ---------------------------------------------------------------------------------------------
// Battle props: round leather shield (daraqa) with iron boss, spear, arrow geometry.
export function shield(o = {}) {
  const R = o.r ?? .33, g = new THREE.Group();
  const prof = []; for (let i = 0; i <= 18; i++) { const s = i / 18; prof.push([R * s, .065 * (1 - s * s) + .008]); }
  prof.push([R, 0], [R * .97, -.01], [R * .5, -.004], [0, 0]);
  const leather = MAT.leather({ a: o.a ?? '#9a5a32', b: o.b ?? '#5c2f18', seed: o.seed ?? 21 });
  const body = lathe(prof, leather, 56); g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, .014, 10, 64), MAT.leather({ a: '#6a3a1e', b: '#3e1e0e', seed: 9 })); rim.rotation.x = Math.PI / 2; rim.position.y = .004; g.add(rim);
  const iron = new THREE.MeshStandardMaterial({ color: '#4a4744', metalness: .85, roughness: .38 });
  const boss = new THREE.Mesh(new THREE.SphereGeometry(.075, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), iron); boss.scale.y = .62; boss.position.y = .062; g.add(boss);
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(.092, .095, .008, 28), iron); flange.position.y = .066; g.add(flange);
  const riv = new THREE.SphereGeometry(.009, 8, 6); const n = 14;
  const rivets = new THREE.InstancedMesh(riv, iron, n); const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = R * .86; const y = .065 * (1 - (r / R) ** 2) + .009; m4.makeTranslation(Math.cos(a) * r, y, Math.sin(a) * r); rivets.setMatrixAt(i, m4); }
  g.add(rivets); g.userData.bossY = .1;
  return shadowAll(g);
}
export function spear(o = {}) {
  const g = new THREE.Group(); const L = o.length ?? 2.5;
  const wood = MAT.wood({ a: '#9a6a3c', b: '#5e3a1c', rings: 40, seed: o.seed ?? 3 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.0135, .015, L, 10), wood); shaft.position.y = L / 2; g.add(shaft);
  const iron = new THREE.MeshStandardMaterial({ color: '#5a5754', metalness: .9, roughness: .32 });
  const head = lathe([[0, 0], [.017, .0], [.016, .05], [.03, .1], [.028, .16], [.016, .23], [0, .3]], iron, 4); head.scale.set(1, 1, .28); head.rotation.y = Math.PI / 4; head.position.y = L - .01;
  const hd = new THREE.Group(); hd.add(head); hd.scale.z = 1; g.add(hd);
  const sock = new THREE.Mesh(new THREE.CylinderGeometry(.016, .017, .06, 10), iron); sock.position.y = L + .01; g.add(sock);
  const butt = new THREE.Mesh(new THREE.ConeGeometry(.016, .07, 8), iron); butt.rotation.x = Math.PI; butt.position.y = -.03; g.add(butt);
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .12, 10), MAT.leather({ a: '#3e2618', b: '#1e1008' })); wrap.position.y = L * .55; g.add(wrap);
  g.userData.length = L + .3;
  return shadowAll(g);
}
// Arrow geometry, origin at the TIP, flying along +Y. part: 'full' | 'front' | 'rear'. Vertex-coloured.
export function arrowGeo(part = 'full', o = {}) {
  const parts = []; const sh = o.shaftR ?? .0048, L = o.length ?? .8, cut = o.cut ?? .38;
  const fe = o.fletch ?? '#efe6d2', fe2 = o.fletch2 ?? '#7a5236';
  if (part !== 'rear') {
    const head = new THREE.CylinderGeometry(0, .0125, .075, 4, 1); head.rotateY(Math.PI / 4); head.scale(1, 1, .32); head.translate(0, -.0375, 0); paint(head, '#3e3b38'); parts.push(head);
    const sock = new THREE.CylinderGeometry(.0052, .0058, .025, 6); sock.translate(0, -.085, 0); paint(sock, '#34302c'); parts.push(sock);
  }
  const y0 = part === 'rear' ? -cut : -.075, y1 = part === 'front' ? -cut : -L;
  const shaft = new THREE.CylinderGeometry(sh, sh, y0 - y1, 6); shaft.translate(0, (y0 + y1) / 2, 0); paint(shaft, '#b08350'); parts.push(shaft);
  if (part !== 'front') {
    for (let k = 0; k < 3; k++) { const v = new THREE.BoxGeometry(.0014, .12, .022); v.translate(0, 0, .0125); const pp = v.attributes.position; for (let i = 0; i < pp.count; i++) { if (pp.getY(i) > 0 && pp.getZ(i) > .015) pp.setZ(i, .017); } v.rotateY(k * Math.PI * 2 / 3); v.translate(0, -L + .1, 0); paint(v, k === 0 ? fe2 : fe); parts.push(v); }
    const nock = new THREE.CylinderGeometry(sh * 1.15, sh * 1.15, .016, 6); nock.translate(0, -L + .008, 0); paint(nock, '#3a2414'); parts.push(nock);
  }
  parts.forEach(p => { p.deleteAttribute('uv'); });
  const geo = mergeGeometries(parts); if (o.thick) geo.scale(o.thick, 1, o.thick); return geo;
}
export const arrowMaterial = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .62, metalness: .05 });

// ---------------------------------------------------------------------------------------------
// GPU billboard dust (storm puffs). Looping wind field inside a box; optional deflection over a block (rock).
// o: {count, center, box, size:[a,b], wind:[x,y,z], speedVar, swirl, opacity, shade, lit, sunDir, nearFade, cyl, seed, yMin, flow:[rockX, rockTop, rockHalfZ, strength], fog:{color,density}, tex}
export function dustField(o = {}) {
  const n = o.count ?? 60, r = rng(o.seed ?? 11), box = o.box ?? [30, 4, 30], c = o.center ?? [0, 2, 0];
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv); geo.instanceCount = n;
  const A = new Float32Array(n * 4), B = new Float32Array(n * 4);
  const sz = o.size ?? [2, 5];
  for (let i = 0; i < n; i++) {
    const s = lerp(sz[0], sz[1], Math.pow(r(), 1.3));
    A[i * 4] = (r() - .5) * box[0]; A[i * 4 + 1] = (r() - .5) * box[1]; A[i * 4 + 2] = (r() - .5) * box[2]; A[i * 4 + 3] = r();
    B[i * 4] = s; B[i * 4 + 1] = r() * 6.28; B[i * 4 + 2] = 1 + (r() - .5) * (o.speedVar ?? .5); B[i * 4 + 3] = .5 + r() * .5;
  }
  geo.setAttribute('aA', new THREE.InstancedBufferAttribute(A, 4)); geo.setAttribute('aB', new THREE.InstancedBufferAttribute(B, 4));
  const u = {
    time: { value: 0 }, map: { value: o.tex ?? cloudSprite() }, wind: { value: new THREE.Vector3(...(o.wind ?? [3, 0, 0])) },
    boxSize: { value: new THREE.Vector3(...box) }, boxCenter: { value: new THREE.Vector3(...c) }, swirl: { value: o.swirl ?? .4 },
    shade: { value: new THREE.Color(o.shade ?? '#8a6040') }, lit: { value: new THREE.Color(o.lit ?? '#ffc884') }, sunDir: { value: new THREE.Vector3(...(o.sunDir ?? [0, .2, -1])).normalize() },
    opacity: { value: o.opacity ?? .3 }, nearFade: { value: o.nearFade ?? 3 }, cyl: { value: o.cyl ?? 1 }, yMin: { value: o.yMin ?? -1e5 },
    flow: { value: new THREE.Vector4(...(o.flow ?? [0, 0, 0, 0])) },
    fogColor: { value: new THREE.Color(o.fog?.color ?? '#000') }, fogDensity: { value: o.fog?.density ?? 0 }, master: { value: 1 }, scatter: { value: o.scatter ?? 1.5 },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: `uniform float time, swirl, opacity, nearFade, cyl, yMin, master, scatter; uniform vec3 wind, boxSize, boxCenter, shade, lit, sunDir; uniform vec4 flow;
      attribute vec4 aA, aB; varying vec2 vUv; varying float vAlpha, vDist; varying vec3 vCol;
      void main(){
        vec3 p = aA.xyz + wind * (time * aB.z);
        p += swirl * vec3(sin(time*.37 + aA.w*6.28), .5*sin(time*.29 + aA.w*12.1), cos(time*.31 + aA.w*9.7));
        vec3 rel = mod(p + boxSize*.5, boxSize) - boxSize*.5;
        vec3 wp = boxCenter + rel;
        float lift = 0.;
        if (flow.w > 0.) {
          float zin = 1. - smoothstep(flow.z - 1.5, flow.z + 3., abs(wp.z));
          float up = smoothstep(flow.x - 10., flow.x - 1.5, wp.x) * (1. - smoothstep(flow.x + 12., flow.x + 40., wp.x));
          lift = max(0., flow.y + 1.2 + aB.x*.3 - wp.y) * up * zin * flow.w;
          wp.y += lift;
        }
        wp.y = max(wp.y, yMin + aB.x * .38);
        vec3 e = abs(rel) / (boxSize*.5); float edge = 1. - smoothstep(.72, 1., max(e.x, e.z));
        vec3 toCam = cameraPosition - wp; vDist = length(toCam);
        vec3 f = normalize(vec3(toCam.x, toCam.y * (1. - cyl), toCam.z));
        vec3 right = normalize(cross(vec3(0., 1., 0.), f)); vec3 up = cross(f, right);
        float an = aB.y + time * (aA.w - .5) * .25; float c = cos(an), s = sin(an);
        vec2 q = vec2(c*position.x - s*position.y, s*position.x + c*position.y) * aB.x;
        vec3 pos = wp + right*q.x + up*q.y;
        vUv = uv;
        vec3 V = normalize(wp - cameraPosition);
        float ph = pow(max(dot(V, normalize(sunDir)), 0.), 5.);
        vCol = mix(shade, lit, clamp(.22 + ph * scatter, 0., 1.)) * (1. + ph * scatter * .35);
        vAlpha = master * opacity * aB.w * edge * smoothstep(nearFade*.45, nearFade, vDist);
        gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.);
      }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 fogColor; uniform float fogDensity; varying vec2 vUv; varying float vAlpha, vDist; varying vec3 vCol;
      void main(){ float a = texture2D(map, vUv).a * vAlpha; if (a < .002) discard; float ff = 1. - exp(-fogDensity*fogDensity*vDist*vDist); gl_FragColor = vec4(mix(vCol, fogColor, ff), a); }`,
  });
  const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.userData.uniforms = u; mesh.userData.noDepth = true; mesh.renderOrder = o.renderOrder ?? 8;
  return mesh;
}

// Burst puffs (impact dust) — instanced billboards with individual start times. events: [{p:[x,y,z], t0, life, s0, s1, v:[x,y,z], a, color}]
export function puffs(events, o = {}) {
  const n = Math.max(1, events.length);
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv); geo.instanceCount = events.length;
  const P = new Float32Array(n * 4), Q = new Float32Array(n * 4), V = new Float32Array(n * 4), C = new Float32Array(n * 3); const r = rng(o.seed ?? 3); const col = new THREE.Color();
  events.forEach((e, i) => { P.set([...e.p, e.t0], i * 4); Q.set([e.life ?? 1.2, e.s0 ?? .2, e.s1 ?? 1, r() * 6.28], i * 4); V.set([...(e.v ?? [0, .5, 0]), e.a ?? .5], i * 4); col.set(e.color ?? '#d9b08a'); C.set([col.r, col.g, col.b], i * 3); });
  geo.setAttribute('aP', new THREE.InstancedBufferAttribute(P, 4)); geo.setAttribute('aQ', new THREE.InstancedBufferAttribute(Q, 4)); geo.setAttribute('aV', new THREE.InstancedBufferAttribute(V, 4)); geo.setAttribute('aC', new THREE.InstancedBufferAttribute(C, 3));
  const u = { time: { value: 0 }, map: { value: o.tex ?? cloudSprite() }, sunDir: { value: new THREE.Vector3(...(o.sunDir ?? [0, .3, -1])).normalize() }, litMul: { value: o.litMul ?? 1.4 }, shadeMul: { value: o.shadeMul ?? .7 }, master: { value: 1 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false,
    vertexShader: `uniform float time, litMul, shadeMul; uniform vec3 sunDir; attribute vec4 aP, aQ, aV; attribute vec3 aC; varying vec2 vUv; varying float vA; varying vec3 vCol;
      void main(){ float age = time - aP.w; float k = clamp(age / aQ.x, 0., 1.); float vis = step(0., age) * step(age, aQ.x);
        float grow = 1. - pow(1. - k, 3.);
        vec3 wp = aP.xyz + aV.xyz * (aQ.x * grow * .55);
        float size = mix(aQ.y, aQ.z, grow) * vis;
        vec4 mv = viewMatrix * vec4(wp, 1.);
        float c = cos(aQ.w + k), s = sin(aQ.w + k); vec2 q = vec2(c*position.x - s*position.y, s*position.x + c*position.y) * size;
        mv.xy += q; gl_Position = projectionMatrix * mv; vUv = uv;
        vec3 V = normalize(wp - cameraPosition); float ph = pow(max(dot(V, sunDir), 0.), 4.);
        vCol = aC * mix(shadeMul, litMul, clamp(.35 + ph, 0., 1.));
        vA = vis * aV.w * pow(1. - k, 1.6) * smoothstep(0., .06, k); }`,
    fragmentShader: `uniform sampler2D map; uniform float master; varying vec2 vUv; varying float vA; varying vec3 vCol; void main(){ float a = texture2D(map, vUv).a * vA * master; if (a < .002) discard; gl_FragColor = vec4(vCol, a); }`,
  });
  const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.userData.uniforms = u; mesh.userData.noDepth = true; mesh.renderOrder = o.renderOrder ?? 9;
  return mesh;
}

// Velocity-stretched streaks (sparks, arrow air-trails, blowing sand). Ballistic: p = p0 + v0*age + .5*g*age^2.
// items: [{p:[..], v:[..], t0, life, w (width), len (<0 => |v|*shutter), color, a, loop}] ; o: {gravity, shutter, additive, cool (spark cooling colour), headBias}
export function streaks(items, o = {}) {
  const n = Math.max(1, items.length);
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.instanceCount = items.length;
  const P = new Float32Array(n * 4), V = new Float32Array(n * 4), T = new Float32Array(n * 4), C = new Float32Array(n * 4); const col = new THREE.Color();
  items.forEach((it, i) => { P.set([...it.p, it.loop ? 1 : 0], i * 4); V.set([...it.v, it.drag ?? 0], i * 4); T.set([it.t0, it.life, it.w ?? .01, it.len ?? -1], i * 4); col.set(it.color ?? '#ffffff'); C.set([col.r * (it.i ?? 1), col.g * (it.i ?? 1), col.b * (it.i ?? 1), it.a ?? 1], i * 4); });
  geo.setAttribute('aP', new THREE.InstancedBufferAttribute(P, 4)); geo.setAttribute('aV', new THREE.InstancedBufferAttribute(V, 4)); geo.setAttribute('aT', new THREE.InstancedBufferAttribute(T, 4)); geo.setAttribute('aC', new THREE.InstancedBufferAttribute(C, 4));
  const u = { time: { value: 0 }, gravity: { value: new THREE.Vector3(...(o.gravity ?? [0, 0, 0])) }, shutter: { value: o.shutter ?? .033 }, cool: { value: new THREE.Color(o.cool ?? '#000000') }, useCool: { value: o.cool ? 1 : 0 }, master: { value: 1 }, fadeIn: { value: o.fadeIn ?? .08 }, fadeOut: { value: o.fadeOut ?? .5 }, fogColor: { value: new THREE.Color(o.fog?.color ?? '#000') }, fogDensity: { value: o.fog?.density ?? 0 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide,
    vertexShader: `uniform float time, shutter, useCool, master, fadeIn, fadeOut; uniform vec3 gravity, cool; attribute vec4 aP, aV, aT, aC; varying float vA, vU, vAl, vDist; varying vec3 vCol;
      void main(){
        float age = time - aT.x; if (aP.w > .5) age = mod(age, aT.y);
        float vis = step(0., age) * step(age, aT.y);
        float dr = aV.w; float ea = dr > 0. ? (1. - exp(-dr*age)) / dr : age;
        vec3 p = aP.xyz + aV.xyz * ea + .5 * gravity * age * age;
        vec3 v = aV.xyz * (dr > 0. ? exp(-dr*age) : 1.) + gravity * age;
        float sp = length(v); vec3 dir = sp > 1e-4 ? v / sp : vec3(0., 1., 0.);
        float L = aT.w > 0. ? aT.w : sp * shutter;
        float a = position.y + .5;
        vec3 wp = p - dir * L * (1. - a);
        vec3 toCam = normalize(cameraPosition - wp); vDist = length(cameraPosition - wp);
        vec3 side = cross(dir, toCam); float sl = length(side); side = sl > 1e-4 ? side / sl : vec3(1.,0.,0.);
        wp += side * position.x * aT.z;
        float k = age / aT.y;
        vA = master * vis * aC.a * smoothstep(0., fadeIn, k) * (1. - smoothstep(fadeOut, 1., k));
        vU = position.x * 2.; vAl = a;
        vCol = useCool > .5 ? mix(aC.rgb, cool, smoothstep(.1, 1., k)) : aC.rgb;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.);
      }`,
    fragmentShader: `uniform vec3 fogColor; uniform float fogDensity; varying float vA, vU, vAl, vDist; varying vec3 vCol;
      void main(){ float a = vA * (1. - vU*vU) * pow(vAl, 1.4); if (a < .002) discard; float ff = 1. - exp(-fogDensity*fogDensity*vDist*vDist); gl_FragColor = vec4(mix(vCol, fogColor, ff), a); }`,
  });
  const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.userData.uniforms = u; mesh.userData.noDepth = true; mesh.renderOrder = o.renderOrder ?? 12;
  return mesh;
}

// Spark burst generator -> pushes streak items. dir = main rebound direction.
export function sparkBurst(list, { p, dir = [0, 1, 0], t0, n = 18, speed = [3, 9], spread = .9, life = [.25, .6], w = .012, seed = 1, color = '#ffd27a', i = 6, drag = 1.5 }) {
  const r = rng(seed); const D = new THREE.Vector3(...dir).normalize(); const tmp = new THREE.Vector3();
  for (let k = 0; k < n; k++) {
    tmp.set(r() - .5, r() - .5, r() - .5).normalize().multiplyScalar(spread).add(D).normalize();
    const s = lerp(speed[0], speed[1], r());
    list.push({ p, v: [tmp.x * s, tmp.y * s, tmp.z * s], t0: t0 + r() * .03, life: lerp(life[0], life[1], r()), w: w * (.6 + r() * .8), len: -1, color, i: i * (.6 + r() * .6), a: 1, drag });
  }
}

// ---------------------------------------------------------------------------------------------
// Arrow volley simulation (ballistic, deterministic). Each arrow: {L:Vector3 end point, vL: Vector3 velocity at end, tL, flight, mode:'stick'|'break'|'pass', embed, ground(x,z)->y}
// Returns { group, update(t), trails(items) } — InstancedMesh for flying/stuck arrows + broken pieces.
const G = new THREE.Vector3(0, -9.8, 0);
export function arrowVolley(arrows, o = {}) {
  const mat = o.material ?? arrowMaterial();
  const full = new THREE.InstancedMesh(arrowGeo('full', o.arrow), mat, arrows.length);
  const nb = arrows.filter(a => a.mode === 'break').length;
  const front = new THREE.InstancedMesh(arrowGeo('front', o.arrow), mat, Math.max(1, nb)), rear = new THREE.InstancedMesh(arrowGeo('rear', o.arrow), mat, Math.max(1, nb));
  [full, front, rear].forEach(m => { m.frustumCulled = false; m.castShadow = o.cast ?? true; m.receiveShadow = true; });
  const grp = new THREE.Group(); grp.add(full, front, rear);
  const r = rng(o.seed ?? 77); const Y = new THREE.Vector3(0, 1, 0);
  let bi = 0;
  arrows.forEach(a => {
    a.dirL = a.vL.clone().normalize(); a.t0 = a.tL - a.flight;
    a.p0 = a.L.clone().addScaledVector(a.vL, -a.flight).addScaledVector(G, .5 * a.flight * a.flight);
    a.v0 = a.vL.clone().addScaledVector(G, -a.flight);
    a.wob = new THREE.Vector3(r() - .5, 0, r() - .5).normalize(); a.wobA = .05 + r() * .06;
    if (a.mode === 'break') {
      a.bi = bi++; const side = new THREE.Vector3().crossVectors(a.dirL, Y).normalize(); const sgn = r() < .5 ? -1 : 1;
      const n = a.normal ? a.normal.clone() : a.dirL.clone().negate();
      a.pieces = [
        { off: .21, c: .19, v: n.clone().multiplyScalar(.6 + r()).addScaledVector(side, sgn * (.4 + r() * .6)).add(new THREE.Vector3(0, .3 + r() * .6, 0)), spin: new THREE.Vector3(r() - .5, r() - .5, r() - .5).normalize(), w: 8 + r() * 10 },
        { off: .61, c: .59, v: n.clone().multiplyScalar(1.6 + r() * 2.2).addScaledVector(side, -sgn * (.6 + r() * 1.2)).add(new THREE.Vector3(0, 1 + r() * 1.6, 0)), spin: new THREE.Vector3(r() - .5, r() - .5, r() - .5).normalize(), w: 12 + r() * 14 },
      ];
      a.pieces.forEach(pc => {
        pc.p0 = a.L.clone().addScaledVector(a.dirL, -pc.off);
        const gy = a.ground ? a.ground(pc.p0.x, pc.p0.z) : 0; const h = pc.p0.y - gy - .012;
        // solve p0.y + vy t - 4.9 t^2 = gy
        const vy = pc.v.y; pc.tland = (vy + Math.sqrt(vy * vy + 2 * 9.8 * Math.max(h, 0))) / 9.8;
        pc.rest = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 + (r() - .5) * .25, 0, (r() - .5) * .4)).premultiply(new THREE.Quaternion().setFromAxisAngle(Y, r() * 6.28));
        pc.q0 = new THREE.Quaternion().setFromUnitVectors(Y, a.dirL);
      });
    }
  });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qw = new THREE.Quaternion(), S1 = new THREE.Vector3(1, 1, 1), S0 = new THREE.Vector3(0, 0, 0), P = new THREE.Vector3(), V = new THREE.Vector3();
  const hide = (im, i) => { m4.compose(P.set(0, -999, 0), q.identity(), S0); im.setMatrixAt(i, m4); };
  function update(t) {
    arrows.forEach((a, i) => {
      if (t < a.t0 || (a.mode === 'pass' && t > a.tL)) { hide(full, i); }
      else if (t < a.tL) {
        const dt = t - a.tL; P.copy(a.L).addScaledVector(a.vL, dt).addScaledVector(G, .5 * dt * dt); V.copy(a.vL).addScaledVector(G, dt).normalize();
        q.setFromUnitVectors(Y, V); m4.compose(P, q, S1); full.setMatrixAt(i, m4);
      } else if (a.mode === 'stick') {
        const age = t - a.tL; P.copy(a.L).addScaledVector(a.dirL, a.embed ?? .12);
        q.setFromUnitVectors(Y, a.dirL); const w = a.wobA * Math.exp(-age * 7) * Math.sin(age * 55); qw.setFromAxisAngle(a.wob, w); q.premultiply(qw);
        // pivot the wobble around the tip
        m4.compose(P, q, S1); full.setMatrixAt(i, m4);
      } else hide(full, i);
      if (a.mode === 'break') {
        a.pieces.forEach((pc, k) => {
          const im = k === 0 ? front : rear;
          if (t < a.tL) { hide(im, a.bi); return; }
          const age = Math.min(t - a.tL, pc.tland);
          P.copy(pc.p0).addScaledVector(pc.v, age).addScaledVector(G, .5 * age * age);
          if (t - a.tL >= pc.tland) { q.copy(pc.rest); const gy = a.ground ? a.ground(P.x, P.z) : 0; P.y = gy + .014; }
          else { qw.setFromAxisAngle(pc.spin, age * pc.w); q.copy(pc.q0).premultiply(qw); }
          // pieces geometry origin is the arrow tip; shift so the piece rotates around its own middle
          P.add(V.set(0, pc.c, 0).applyQuaternion(q));
          m4.compose(P, q, S1); im.setMatrixAt(a.bi, m4);
        });
      }
    });
    full.instanceMatrix.needsUpdate = true; front.instanceMatrix.needsUpdate = true; rear.instanceMatrix.needsUpdate = true;
  }
  // air-trail streak items matching the flights
  function trails({ w = .02, len = 1.6, color = '#fff0d8', a = .35 } = {}) {
    return arrows.map(ar => ({ p: [ar.p0.x, ar.p0.y, ar.p0.z], v: [ar.v0.x, ar.v0.y, ar.v0.z], t0: ar.t0, life: ar.flight, w, len, color, a }));
  }
  update(-999);
  return { group: grp, update, trails, arrows, full, front, rear };
}

// Velocity at landing for an arrow that comes from azimuth `az` (radians, direction it travels toward), descending at `pitch` (rad), speed s.
export function landingVel(az, pitch, s) { return new THREE.Vector3(Math.sin(az) * Math.cos(pitch) * s, -Math.sin(pitch) * s, -Math.cos(az) * Math.cos(pitch) * s); }

// Monotone cubic interpolation (Fritsch–Carlson): smooth, overshoot-free time remapping for camera paths.
export function monotone(xs, ys) {
  const n = xs.length, d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b; if (h > 9) { const k = 3 / Math.sqrt(h); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; } }
  return x => {
    if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]); if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
// Camera path: Catmull-Rom through key positions/targets, keyed at times, smooth monotone timing (never stops between keys).
export function camPath(keys) { // keys: [[t, [px,py,pz], [lx,ly,lz]], ...]
  const pc = new THREE.CatmullRomCurve3(keys.map(k => new THREE.Vector3(...k[1])), false, 'centripetal');
  const lc = new THREE.CatmullRomCurve3(keys.map(k => new THREE.Vector3(...k[2])), false, 'centripetal');
  const n = keys.length; const u = monotone(keys.map(k => k[0]), keys.map((k, i) => i / (n - 1)));
  return { at(t, P, L) { const v = clamp(u(t), 0, 1); pc.getPoint(v, P); lc.getPoint(v, L); return v; } };
}

// =============================================================================================
// ZÜLFİKAR v2 — finely crafted, historically plausible double-pointed sword.
// Broad straight blade (slightly widening toward the fork), cutting-edge bevels, twin narrow fullers ("fiqar"), a split
// tip whose two points diverge a little (rounded notch apex), gold-inlaid (koftgari) geometric band on the forte,
// faint watered-steel figure. Hilt: drooping tapered quillons with acorn finials, langets, carnelian cabochons, leather
// grip bound with twisted gold wire, gold collars, onion pommel. Origin = the tips (y=0), blade along +Y, flats ±Z.
// steel.userData.glint = {y, i} drives a travelling specular sweep along the edge bevels (blade-local Y).
function taperTube(curve, segs, radial, rFn) {
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false); const p = geo.attributes.position; const P = new THREE.Vector3(), V = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) { curve.getPointAt(i / segs, P); const r = rFn(i / segs); for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; V.fromBufferAttribute(p, k).sub(P).multiplyScalar(r).add(P); p.setXYZ(k, V.x, V.y, V.z); } }
  geo.computeVertexNormals(); return geo;
}
let _zulTex = null;
function zulfikarBladeTex() {
  if (_zulTex) return _zulTex;
  const W = 128, H = 1024; const r = rng(91);
  const col = document.createElement('canvas'); col.width = W; col.height = H; const x = col.getContext('2d');
  const rough = document.createElement('canvas'); rough.width = W; rough.height = H; const xr = rough.getContext('2d');
  // watered-steel base: soft wavy bands along the blade
  const im = x.createImageData(W, H), ir = xr.createImageData(W, H); const n = TEX.fbmField(17, 4, 4);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = i / W, v = j / H; const w = Math.sin((v * 22 + n(u * .5, v * 2) * 2.4 + Math.abs(u - .5) * 2) * Math.PI);
    const c = .91 + .028 * w + .02 * n(u * 3 % 1, v * 9 % 1); const k = (j * W + i) * 4;
    im.data[k] = 236 * c; im.data[k + 1] = 240 * c; im.data[k + 2] = 245 * c; im.data[k + 3] = 255;
    const rv = 62 + 10 * (w * .5 + .5); ir.data[k] = ir.data[k + 1] = ir.data[k + 2] = rv; ir.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0); xr.putImageData(ir, 0, 0);
  // gold koftgari band on the forte (canvas top = guard). Flat zone only (u in .19 .. .81)
  const y0 = 14, y1 = 190, xa = 26, xb = W - 26, cx = W / 2;
  const gold = '#f0c46a', gr = 'rgb(70,70,70)';
  const strokeBoth = (fn, lw) => { for (const [ctx, st] of [[x, gold], [xr, gr]]) { ctx.save(); ctx.strokeStyle = st; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; fn(ctx); ctx.restore(); } };
  const fillBoth = (fn) => { for (const [ctx, st] of [[x, gold], [xr, gr]]) { ctx.save(); ctx.fillStyle = st; fn(ctx); ctx.restore(); } };
  strokeBoth(c => { c.beginPath(); c.moveTo(xa, y0); c.lineTo(xa, y1); c.moveTo(xb, y0); c.lineTo(xb, y1); c.stroke(); }, 2.2);
  strokeBoth(c => { c.beginPath(); c.moveTo(xa + 5, y0 + 4); c.lineTo(xa + 5, y1 - 6); c.moveTo(xb - 5, y0 + 4); c.lineTo(xb - 5, y1 - 6); c.stroke(); }, 1);
  // interlaced lozenge chain
  const nL = 4, lh = (y1 - y0 - 24) / nL, hw = (xb - xa) / 2 - 12;
  strokeBoth(c => { for (let k = 0; k < nL; k++) { const yy = y0 + 12 + k * lh; c.beginPath(); c.moveTo(cx, yy); c.lineTo(cx + hw, yy + lh / 2); c.lineTo(cx, yy + lh); c.lineTo(cx - hw, yy + lh / 2); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(cx, yy + lh * .22); c.lineTo(cx + hw * .55, yy + lh / 2); c.lineTo(cx, yy + lh * .78); c.lineTo(cx - hw * .55, yy + lh / 2); c.closePath(); c.stroke(); } }, 1.6);
  fillBoth(c => { for (let k = 0; k < nL; k++) { const yy = y0 + 12 + k * lh + lh / 2; c.beginPath(); c.arc(cx, yy, 3.2, 0, 7); c.fill(); for (const s of [-1, 1]) { c.beginPath(); c.arc(cx + s * (hw + 4), y0 + 12 + k * lh, 2, 0, 7); c.fill(); } } });
  // tapering leaf terminal pointing down the blade
  strokeBoth(c => { c.beginPath(); c.moveTo(cx - 16, y1 - 4); c.quadraticCurveTo(cx - 6, y1 + 22, cx, y1 + 48); c.quadraticCurveTo(cx + 6, y1 + 22, cx + 16, y1 - 4); c.stroke(); c.beginPath(); c.moveTo(cx, y1 + 2); c.lineTo(cx, y1 + 34); c.stroke(); }, 1.5);
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const rmap = new THREE.CanvasTexture(rough); rmap.colorSpace = THREE.NoColorSpace; rmap.anisotropy = 8;
  _zulTex = { map, rmap }; return _zulTex;
}
export function zulfikar2(o = {}) {
  const g = new THREE.Group();
  const Lb = o.bladeLen ?? .86, F = o.fork ?? .25, bend = o.bend ?? .016;
  const hwG = o.hwG ?? .034, hwF = o.hwF ?? .041, tG = .0066, tF = .0042, e0 = .0005;
  const bendX = y => bend * Math.pow(1 - y / Lb, 2);
  // half-thickness profile across the blade (u: 0 centre .. 1 edge), bevel = cutting-edge zone, fd = fuller depth (0..1)
  const prof = (u, t, fd, bev) => {
    const ub = 1 - bev; let z = u <= ub ? t : e0 + (t - e0) * Math.pow(Math.max(0, 1 - (u - ub) / bev), 1.1);
    if (fd > 0) { const d = Math.abs(u - .4) / .12; if (d < 1) z -= fd * t * .45 * (.5 + .5 * Math.cos(Math.PI * d)); }
    return z;
  };
  const US = [0, .07, .14, .2, .26, .28, .31, .34, .37, .4, .43, .46, .49, .52, .54, .6, .66, .7, .74, .79, .85, .9, .95, 1];
  const ring = (cx, hw, t, fd, bev, flip = 1) => { // closed loop: top surface -1..1 then bottom 1..-1
    const pts = []; const us = [...US.slice(1).reverse().map(u => -u), ...US];
    us.forEach(u => pts.push([cx + u * hw, prof(Math.abs(u), t, fd, bev), (u + 1) / 2]));
    us.slice(1, -1).reverse().forEach(u => pts.push([cx + u * hw, -prof(Math.abs(u), t, fd, bev), (u + 1) / 2]));
    return pts;
  };
  const loft = secs => {
    const NP = secs[0].pts.length, pos = [], uv = [], edge = [], idx = [];
    secs.forEach(s => s.pts.forEach(p => { pos.push(p[0], s.y, p[1]); uv.push(p[2], s.y / Lb); edge.push(Math.abs(p[2] * 2 - 1)); }));
    for (let i = 0; i < secs.length - 1; i++) for (let k = 0; k < NP; k++) { const a = i * NP + k, b = i * NP + (k + 1) % NP, c = a + NP, d = b + NP; idx.push(a, b, c, b, d, c); }
    let geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('edge', new THREE.Float32BufferAttribute(edge, 1)); geo.setIndex(idx);
    return toCreasedNormals(geo, .5);
  };
  const geos = [];
  // body: fork apex -> guard (fullers between y = F+.1 and the decorated forte)
  const body = []; const NB = 48;
  for (let i = 0; i <= NB; i++) { const u = i / NB, y = F + (Lb - F) * u; const hw = lerp(hwF, hwG, Math.pow(u, .9)), t = lerp(tF, tG, u);
    const fd = smoothstep(F + .06, F + .16, y) * (1 - smoothstep(Lb - .23, Lb - .19, y)); body.push({ y, pts: ring(bendX(y), hw, t, fd, .3) }); }
  geos.push(loft(body));
  // the two points: inner edge follows a rounded V notch, outer edge bulges slightly then sweeps out to a point that
  // sits a little outside the blade line (diverging tips)
  const T = hwF * 1.06;
  for (const sg of [1, -1]) {
    const pr = []; const NP = 34;
    for (let i = 0; i <= NP; i++) { const s = i / NP, y = F * s;
      const inner = T * Math.pow(1 - s, .62), outer = T + (hwF - T) * s + hwF * .09 * Math.sin(Math.PI * Math.pow(s, .75));
      const hw = Math.max((outer - inner) / 2, 2e-5), cx = sg * (outer + inner) / 2 + bendX(y); const t = tF * (.3 + .7 * Math.pow(s, .45));
      pr.push({ y, pts: ring(cx, hw, Math.max(t, 1e-4), 0, .42) }); }
    geos.push(loft(pr));
  }
  { // cap under the notch apex (faces -Y)
    const s = body[0].pts; const pos = [], uv = [], edge = []; s.forEach(p => { pos.push(p[0], F, p[1]); uv.push(p[2], F / Lb); edge.push(0); }); const idx = []; for (let i = 1; i < s.length - 1; i++) idx.push(0, i, i + 1);
    let geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('edge', new THREE.Float32BufferAttribute(edge, 1)); geo.setIndex(idx); geo.computeVertexNormals();
    if (geo.attributes.normal.getY(0) > 0) { idx.length = 0; for (let i = 1; i < s.length - 1; i++) idx.push(0, i + 1, i); geo.setIndex(idx); geo.computeVertexNormals(); }
    geos.push(geo.toNonIndexed());
  }
  const bladeGeo = mergeGeometries(geos);
  // make sure all faces point outward (centroid test on a top-surface face of the body)
  { const p = bladeGeo.attributes.position, nr = bladeGeo.attributes.normal; let bad = 0, tot = 0; for (let i = 0; i < 600 && i < p.count; i += 3) { const z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3; if (Math.abs(z) < .002) continue; tot++; if (Math.sign(nr.getZ(i)) !== Math.sign(z)) bad++; } if (bad > tot / 2) { const ix = bladeGeo.index; if (!ix) { for (let i = 0; i < p.count; i += 3) { for (const A of [p, nr, bladeGeo.attributes.uv, bladeGeo.attributes.edge]) { const it = A.itemSize; for (let c = 0; c < it; c++) { const t1 = A.array[(i + 1) * it + c]; A.array[(i + 1) * it + c] = A.array[(i + 2) * it + c]; A.array[(i + 2) * it + c] = t1; } } } for (let i = 0; i < nr.count; i++) nr.setXYZ(i, -nr.getX(i), -nr.getY(i), -nr.getZ(i)); } } }
  const tx = zulfikarBladeTex();
  const steel = new THREE.MeshPhysicalMaterial({ color: o.steelColor ?? '#f2f4f6', metalness: 1, roughness: o.steelRough ?? .3, map: tx.map, roughnessMap: tx.rmap, envMapIntensity: o.envI ?? 1.35 });
  const gl = { y: { value: -10 }, i: { value: 0 }, c: { value: new THREE.Color('#fff2d8') }, dirSpec: { value: o.dirSpec ?? .3 } }; steel.userData.glint = gl;
  steel.onBeforeCompile = sh => {
    sh.uniforms.uGlY = gl.y; sh.uniforms.uGlI = gl.i; sh.uniforms.uGlC = gl.c; sh.uniforms.uDirSpec = gl.dirSpec;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float edge; varying float vEdge; varying float vLY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvEdge = edge; vLY = position.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlY, uGlI, uDirSpec; uniform vec3 uGlC; varying float vEdge; varying float vLY;').replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.directSpecular *= uDirSpec;')
      .replace('#include <opaque_fragment>', 'outgoingLight += uGlC * uGlI * exp(-pow((vLY - uGlY) / .028, 2.)) * smoothstep(.62, .9, vEdge);\n#include <opaque_fragment>');
  };
  steel.customProgramCacheKey = () => 'zulfikar2';
  const blade = new THREE.Mesh(bladeGeo, steel); g.add(blade);

  // ---------------- hilt ----------------
  const gt = TEX.brushedMetal({ a: '#ffd889', b: '#c08a34', seed: 37 });
  const gold = new THREE.MeshPhysicalMaterial({ color: '#fff4dc', map: gt.map, metalness: 1, roughness: .26, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: o.goldEnvI ?? 1.9 }); if (o.goldEnv) gold.envMap = o.goldEnv;
  const leather = MAT.leather({ a: '#7a3420', b: '#40180c', seed: 23 });
  const yG = Lb; const H = new THREE.Group(); H.position.set(bendX(yG), yG, 0); H.scale.setScalar(o.hiltScale ?? 1); g.add(H);
  // quillons: one tapered sweep, thick in the middle, drooping toward the blade at both ends
  const qPts = []; for (let i = 0; i <= 12; i++) { const s = i / 12 * 2 - 1; const ax = Math.abs(s); qPts.push(new THREE.Vector3(s * .098, .012 - .03 * Math.pow(ax, 2.4) + .004 * (1 - ax * ax), 0)); }
  const qc = new THREE.CatmullRomCurve3(qPts);
  const qr = s => { const a = Math.abs(s * 2 - 1); return .0062 + .0062 * Math.pow(1 - a, 1.4) - .0014 * Math.pow(a, 6); };
  const quil = new THREE.Mesh(taperTube(qc, 64, 14, qr), gold); quil.scale.z = 1.25; H.add(quil);
  // guard centre block (écusson) with cabochons + langets on both faces
  const blk = new THREE.Mesh(rbox(.074, .024, .024, .0085, 3), gold); blk.position.y = .009; H.add(blk);
  const blk2 = new THREE.Mesh(rbox(.04, .034, .027, .01, 3), gold); blk2.position.y = .013; H.add(blk2);
  const gem = new THREE.MeshPhysicalMaterial({ color: '#a3241a', roughness: .12, clearcoat: 1, clearcoatRoughness: .05, sheen: .3, sheenColor: new THREE.Color('#ff8060'), envMapIntensity: 1.4 });
  for (const sz of [-1, 1]) {
    const bez = new THREE.Mesh(new THREE.TorusGeometry(.0072, .0016, 8, 24), gold); bez.position.set(0, .012, sz * .0132); H.add(bez);
    const cab = new THREE.Mesh(new THREE.SphereGeometry(.0068, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), gem); cab.rotation.x = sz * Math.PI / 2; cab.scale.y = .55; cab.position.set(0, .012, sz * .013); H.add(cab);
    const ls = new THREE.Shape(); ls.moveTo(-.0085, .004); ls.quadraticCurveTo(-.0082, -.024, 0, -.046); ls.quadraticCurveTo(.0082, -.024, .0085, .004); ls.closePath();
    const lg = new THREE.ExtrudeGeometry(ls, { depth: .0016, bevelEnabled: true, bevelThickness: .0007, bevelSize: .0008, bevelSegments: 2, curveSegments: 12 });
    const lang = new THREE.Mesh(lg, gold); lang.position.set(0, 0, sz > 0 ? tG + .0006 : -(tG + .0006)); if (sz < 0) lang.rotation.y = Math.PI; H.add(lang);
  }
  // finials (acorn) at the quillon ends, aligned with the curve tangent
  for (const s of [0, 1]) {
    const tip = qc.getPointAt(s), tg = qc.getTangentAt(s).multiplyScalar(s === 0 ? -1 : 1);
    const fin = lathe([[0, 0], [.0052, .001], [.0085, .006], [.0092, .011], [.0072, .0165], [.0048, .0195], [.0058, .022], [.0026, .026], [0, .0285]], gold, 20);
    fin.position.copy(tip); fin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg.normalize()); fin.position.addScaledVector(tg, -.003); H.add(fin);
    if (s === 1) g.userData.ballLocal = tip.clone().addScaledVector(tg, .012);
  }
  // grip: waisted leather, twisted gold wire binding, collars
  const Lg = .132, y0g = .027;
  const gr = y => .0132 + .0022 * Math.sin(Math.PI * y / Lg);
  const gp = [[0, 0]]; for (let i = 0; i <= 30; i++) { const y = i / 30 * Lg; gp.push([gr(y), y]); } gp.push([0, Lg]);
  const grip = lathe(gp, leather, 32); grip.position.y = y0g; H.add(grip);
  for (const ph of [0, Math.PI]) { const hp = []; const turns = 15; for (let i = 0; i <= 600; i++) { const s = i / 600, y = s * Lg, a = s * turns * Math.PI * 2 + ph; hp.push(new THREE.Vector3(Math.cos(a) * (gr(y) + .0004), y0g + y, Math.sin(a) * (gr(y) + .0004))); }
    H.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 1200, .0008, 5), gold)); }
  for (const [y, r] of [[y0g + .002, .0158], [y0g + Lg - .002, .0154]]) { const c = lathe([[r - .002, -.004], [r + .0012, -.003], [r + .0016, 0], [r + .0012, .003], [r - .002, .004]], gold, 32); c.position.y = y; H.add(c); }
  // onion pommel with finial
  const pom = lathe([[0, 0], [.0135, 0], [.0158, .003], [.0145, .007], [.0175, .014], [.0205, .023], [.0198, .031], [.0158, .039], [.0098, .046], [.0068, .051], [.0082, .055], [.0048, .06], [.0025, .066], [0, .068]], gold, 36);
  pom.position.y = y0g + Lg; H.add(pom);
  const hs = o.hiltScale ?? 1;
  g.userData.hilt = H; g.userData.ballR = g.userData.ballLocal.clone().multiplyScalar(hs).add(H.position);
  g.userData.guardY = yG + .012 * hs; g.userData.topY = yG + (y0g + Lg + .068) * hs; g.userData.blade = blade; g.userData.steel = steel; g.userData.bladeLen = Lb; g.userData.fork = F;
  return shadowAll(g);
}

// Wind-blown sand (saltation): stacked horizontal sheets hugging flat ground; world-space noise streaks stretched along the
// wind and scrolling downwind, forward-scattering the low sun. Optional wake plume behind an obstacle (e.g. the sword).
// o: {center:[x,y,z], size:[sx,sz], layers:[[h, opacityMul, speedMul]], wind:[x,z], speed, opacity, lit, shade, sunDir, scatter,
//     plume:[x,z,strength,width], nearFade, farFade, density, scale}
export function sandDrift(o = {}) {
  const grp = new THREE.Group(); const c = o.center ?? [0, 0, 0], size = o.size ?? [30, 30];
  const u = {
    time: { value: 0 }, opacity: { value: o.opacity ?? .45 }, master: { value: 1 }, wind: { value: new THREE.Vector2(...(o.wind ?? [1, 0])).normalize() }, speed: { value: o.speed ?? 3 },
    lit: { value: new THREE.Color(o.lit ?? '#ffe2b4') }, shade: { value: new THREE.Color(o.shade ?? '#b4794c') }, sunDir: { value: new THREE.Vector3(...(o.sunDir ?? [0, .2, -1])).normalize() }, scatter: { value: o.scatter ?? 1.6 },
    plume: { value: new THREE.Vector4(...(o.plume ?? [0, 0, 0, .12])) }, nearFade: { value: o.nearFade ?? 1.2 }, farFade: { value: o.farFade ?? 30 }, density: { value: o.density ?? .5 }, scale: { value: o.scale ?? 1 },
    fogColor: { value: new THREE.Color(o.fog?.color ?? '#000') }, fogDensity: { value: o.fog?.density ?? 0 }, gust: { value: 1 },
  };
  const layers = o.layers ?? [[.01, 1, 1], [.035, .75, 1.15], [.09, .45, 1.3], [.2, .2, 1.5]];
  layers.forEach(([h, om, sm], li) => {
    const geo = new THREE.PlaneGeometry(size[0], size[1], 1, 1); geo.rotateX(-Math.PI / 2);
    const m = new THREE.ShaderMaterial({
      uniforms: { ...u, layerH: { value: h }, layerO: { value: om }, layerS: { value: sm }, layerI: { value: li } }, transparent: true, depthWrite: false,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float time, opacity, master, speed, scatter, nearFade, farFade, density, scale, layerH, layerO, layerS, layerI, fogDensity, gust; uniform vec2 wind; uniform vec3 lit, shade, sunDir, fogColor; uniform vec4 plume; varying vec3 vW;
        float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hs(i), hs(i+vec2(1,0)), f.x), mix(hs(i+vec2(0,1)), hs(i+vec2(1,1)), f.x), f.y); }
        float fbm(vec2 p){ float a = 0., w = .5; for (int i = 0; i < 4; i++){ a += w * vn(p); p = p * 2.03 + 17.1; w *= .5; } return a; }
        void main(){
          vec2 q = vec2(dot(vW.xz, wind), dot(vW.xz, vec2(-wind.y, wind.x))) / scale;
          float s = time * speed * layerS / scale;
          float n1 = fbm(vec2((q.x - s) * .3, q.y * 2.6 + layerI * 7.3));
          float n2 = fbm(vec2((q.x - s * 1.25) * .9, q.y * 5.5 + 3.1 + layerI * 2.));
          float n3 = vn(vec2((q.x - s * 1.6) * 3.5, q.y * 22. + layerI * 5.));
          float st = smoothstep(1. - density, 1. - density + .35, n1) * (.45 + .75 * n2) * (.7 + .5 * n3);
          // wake plume behind an obstacle
          vec2 pq = vec2(dot(plume.xy, wind), dot(plume.xy, vec2(-wind.y, wind.x))) / scale; vec2 d = q - pq;
          float wk = plume.z * exp(-pow(d.y / (plume.w + .06 * max(d.x, 0.)), 2.)) * smoothstep(-.05, .35, d.x) * exp(-max(d.x, 0.) / 2.2) * (.5 + .8 * n2);
          st = st * gust + wk;
          float dist = length(cameraPosition - vW);
          float a = st * opacity * layerO * master * smoothstep(nearFade * .4, nearFade, dist) * (1. - smoothstep(farFade * .6, farFade, dist));
          if (a < .003) discard;
          vec3 V = normalize(vW - cameraPosition); float ph = pow(max(dot(V, sunDir), 0.), 4.);
          vec3 col = mix(shade, lit, clamp(.3 + ph * scatter + .25 * n2, 0., 1.)) * (1. + ph * scatter * .5);
          float ff = 1. - exp(-fogDensity * fogDensity * dist * dist); col = mix(col, fogColor, ff);
          gl_FragColor = vec4(col, min(a, .9));
        }`,
    });
    const mesh = new THREE.Mesh(geo, m); mesh.position.set(c[0], c[1] + h, c[2]); mesh.renderOrder = 7 + li * .01; mesh.frustumCulled = false; mesh.userData.noDepth = true; grp.add(mesh);
  });
  grp.userData.uniforms = u; return grp;
}

// Closed-ring loft (rings of [x,z] at heights y) -> creased-normal BufferGeometry. secs: [{y, pts:[[x,z],...]}] (CCW seen from +Y)
export function loftRings(secs, crease = .55) {
  const NP = secs[0].pts.length, pos = [], uv = [], idx = [];
  secs.forEach((s, i) => s.pts.forEach((p, k) => { pos.push(p[0], s.y, p[1]); uv.push(k / NP, i / (secs.length - 1)); }));
  for (let i = 0; i < secs.length - 1; i++) for (let k = 0; k < NP; k++) { const a = i * NP + k, b = i * NP + (k + 1) % NP, c = a + NP, d = b + NP; idx.push(a, b, c, b, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  return toCreasedNormals(geo, crease);
}
// Crafted spear (rumh): ash shaft with grain running along it and a slight taper, leather bindings, forged leaf-shaped head
// with a raised midrib and bevelled edges, collared socket with rivets, iron butt ferrule. Origin at the butt, head along +Y.
export function spear2(o = {}) {
  const g = new THREE.Group(); const L = o.length ?? 2.5; const r = rng(o.seed ?? 3);
  const wt = TEX.wood({ a: o.woodA ?? '#a8784a', b: o.woodB ?? '#6a4424', rings: 26, seed: (o.seed ?? 3) + 40 });
  const wood = new THREE.MeshStandardMaterial({ map: wt.map, normalMap: wt.normalMap, roughnessMap: wt.roughnessMap, roughness: 1, normalScale: new THREE.Vector2(.5, .5) });
  const sg = new THREE.CylinderGeometry(.0128, .0152, L, 14, 24); const uv = sg.attributes.uv; for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, v * 6, u * .5); }
  const sp = sg.attributes.position; const bow = (r() - .5) * .03; for (let i = 0; i < sp.count; i++) { const y = sp.getY(i) / L + .5; sp.setX(i, sp.getX(i) + bow * Math.sin(Math.PI * y)); }
  sg.computeVertexNormals(); const shaft = new THREE.Mesh(sg, wood); shaft.position.y = L / 2; g.add(shaft);
  const iron = new THREE.MeshPhysicalMaterial({ color: o.iron ?? '#8a8580', metalness: .92, roughness: .34, clearcoat: .2, envMapIntensity: 1.3 });
  const lth = MAT.leather({ a: '#5a3420', b: '#2a160c', seed: 31 });
  // head: leaf blade with midrib
  const Lh = .3, W = [[0, .0115], [.12, .024], [.28, .031], [.44, .0325], [.6, .029], [.75, .021], [.88, .011], [.96, .004], [1, .0002]];
  const hwAt = s => { for (let i = 0; i < W.length - 1; i++) if (s <= W[i + 1][0]) { const k = (s - W[i][0]) / (W[i + 1][0] - W[i][0]); const e = k * k * (3 - 2 * k); return lerp(W[i][1], W[i + 1][1], e); } return 0; };
  const secs = []; for (let i = 0; i <= 40; i++) { const s = i / 40, hw = Math.max(hwAt(s), .0002), tz = lerp(.0095, .0012, s), e = .0005;
    secs.push({ y: s * Lh, pts: [[-hw, 0], [-hw * .5, tz * .55], [0, tz], [hw * .5, tz * .55], [hw, 0], [hw * .5, -tz * .55], [0, -tz], [-hw * .5, -tz * .55]].map(([x, z]) => [x, Math.abs(x) >= hw - 1e-6 ? Math.sign(z) * e : z]) }); }
  const head = new THREE.Mesh(loftRings(secs, .7), iron); head.position.y = L + .1; g.add(head);
  // socket with collars + rivets
  const sock = lathe([[.0158, 0], [.0168, .006], [.0158, .012], [.0145, .03], [.0158, .036], [.0165, .041], [.0152, .047], [.0128, .08], [.0112, .1], [.0095, .108], [0, .11]], iron, 20); sock.position.y = L - .008; g.add(sock);
  const rv = new THREE.SphereGeometry(.0035, 8, 6); for (const sx of [-1, 1]) { const m = new THREE.Mesh(rv, iron); m.position.set(sx * .0158, L + .022, 0); g.add(m); }
  // leather bindings (spiral) below the socket and at the grip
  const helix = (y0, len, R, turns, tr) => { const pts = []; for (let i = 0; i <= turns * 24; i++) { const s = i / (turns * 24), a = s * turns * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * R, y0 + s * len, Math.sin(a) * R)); } return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, tr, 6), lth); };
  g.add(helix(L - .12, .1, .0146, 7, .0028)); g.add(helix(L * .5, .16, .0152, 9, .003));
  // butt ferrule
  const butt = lathe([[0, -.06], [.006, -.05], [.0135, -.012], [.0158, 0], [.0158, .03], [0, .03]], iron, 14); g.add(butt);
  g.userData.length = L + .42; g.userData.head = head;
  return shadowAll(g);
}

// Flying rock chips (instanced): ballistic, spinning, settle on the ground. events: [{p:[x,y,z], v:[x,y,z], t0, s, spin:[x,y,z], w}]
export function debris(events, { ground = () => 0, palette = ['#b06a44', '#8e5034', '#c88458'], seed = 5, material = null } = {}) {
  const geo = rockGeo({ seed, detail: 0, palette, faceted: true, rough: .5, stretch: [1, .7, .9] });
  const mat = material ?? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 });
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, events.length)); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), ax = new THREE.Vector3();
  events.forEach(e => { const gy = ground(e.p[0], e.p[2]) + e.s * .35; const h = e.p[1] - gy; const vy = e.v[1]; e.tl = (vy + Math.sqrt(vy * vy + 2 * 9.8 * Math.max(h, 0))) / 9.8; ax.set(...(e.spin ?? [1, .3, .2])).normalize(); e.ax = ax.clone(); });
  const update = t => {
    events.forEach((e, i) => {
      const age = t - e.t0; if (age < 0) { m4.makeScale(0, 0, 0); m4.setPosition(0, -999, 0); im.setMatrixAt(i, m4); return; }
      const a = Math.min(age, e.tl); P.set(e.p[0] + e.v[0] * a, e.p[1] + e.v[1] * a - 4.9 * a * a, e.p[2] + e.v[2] * a);
      if (age >= e.tl) P.y = ground(P.x, P.z) + e.s * .3;
      q.setFromAxisAngle(e.ax, (e.w ?? 14) * a); S.setScalar(e.s); m4.compose(P, q, S); im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  update(-999);
  return { mesh: im, update };
}
