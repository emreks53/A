// Shared props + FX for group C (s06 Zülfikar → s07 battle storm → s08 the sheltering rock).
// Everything procedural & deterministic. No people, only objects / terrain / dust / light.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
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
  const loft = secs => {
    const out = [];
    for (let k = 0; k < 6; k++) {
      const pos = [], uv = [], idx = [];
      secs.forEach(s => { const A = s.pts[k], B = s.pts[(k + 1) % 6]; pos.push(A[0], s.y, A[1], B[0], s.y, B[1]); uv.push(s.y / Lb, (A[0] + .06) * 5, s.y / Lb, (B[0] + .06) * 5); });
      const m = Math.floor(secs.length / 2), P = i => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      const a = P(m * 2), b = P(m * 2 + 1), c = P(m * 2 + 2);
      const n = c.clone().sub(a).cross(b.clone().sub(a));
      const s = secs[m]; const A = s.pts[k], B = s.pts[(k + 1) % 6]; const exp = new THREE.Vector3((A[0] + B[0]) / 2 - s.cx, 0, (A[1] + B[1]) / 2);
      const flip = n.dot(exp) < 0;
      for (let i = 0; i < secs.length - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; if (!flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); out.push(geo);
    }
    return out;
  };
  const geos = [];
  // body (fork apex -> guard)
  const body = []; const NB = 30;
  for (let i = 0; i <= NB; i++) { const u = i / NB, y = F + (Lb - F) * u; const hw = hwF + (hwG - hwF) * Math.pow(u, .85), t = lerp(tF, tG, u), cx = bendX(y); body.push({ y, cx, pts: hex(cx, hw, t) }); }
  geos.push(...loft(body));
  // two prongs (tip -> apex)
  for (const sg of [1, -1]) {
    const pr = []; const NP = 18;
    for (let i = 0; i <= NP; i++) { const s = i / NP, y = F * s; const pw = (hwF / 2) * (1 - Math.pow(1 - s, 1.7)); const pc = sg * lerp(hwF * .7, hwF / 2, Math.pow(s, .65)); const t = tF * Math.min(1, Math.pow(s, .55)); const cx = pc + bendX(y); pr.push({ y, cx, pts: hex(cx, Math.max(pw, 1e-5), Math.max(t, 1e-5)) }); }
    geos.push(...loft(pr));
  }
  // cap at the notch apex (faces -Y)
  { const s = body[0].pts; const pos = []; s.forEach(p => pos.push(p[0], F, p[1])); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(12).fill(0), 2)); geo.setIndex([0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4]); geo.computeVertexNormals(); if (geo.attributes.normal.getY(0) > 0) geo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5]); geo.computeVertexNormals(); geos.push(geo); }
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
export function scatterRocks(items, { variants = 3, seed = 5, detail = 2, palette, material, cast = true, faceted = true, big = .3 } = {}) {
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
    const fr = facetRock({ a: 1, b: .8, c: 1.15, n: 2.2, planes: 20, jitter: .55, off: [-.28, 0], k: .045, joints: 0, lump: .04, seed: seed + 50 + v * 7, detail: 18, bury: .25, grain: 1.2, nScale: .9 });
    place(new THREE.InstancedMesh(fr.geometry, fr.material, list.length), list, -.12);
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
    const edge = f2 - f1; const crackOn = H(ci, cj, 6) > .7 ? 1 : 0; const crack = (1 - smoothstep(0, .035, edge)) * crackOn * (.5 + .5 * smoothstep(.3, .7, mid(u * 3 % 1, v * 3 % 1) * .5 + .5));
    const g = fine(u, v) * .5 + .5, m = mid(u, v) * .5 + .5; const ridged = 1 - Math.abs(mid(u * 2 % 1, v * 2 % 1));
    const h = .45 + plate * .35 + ridged * .22 + g * .16 - crack * .5;
    const tone = .9 + (H(ci, cj, 7) - .5) * .06 + (g - .5) * .18 + (m - .5) * .16 - crack * .4;
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
