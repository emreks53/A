// Group E (scene s12 "virtue gallery") — procedural props + helpers. Pure code, no external assets.
// Units: meters. Every exhibit builder returns a THREE.Group sitting on y=0 with userData {h, anim(tau, t, lit)}.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TEX from './textures.js';
import { rng, clamp, smoothstep } from './util.js';
import { MAT, rbox } from './models.js';
import { flame, glow } from './fx.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const V2 = (x, y) => new THREE.Vector2(x, y);
const PI = Math.PI;

// ---------------------------------------------------------------- geometry helpers
export function merge(geos) {
  const anyNon = geos.some(g => !g.index);
  const gs = geos.map(g0 => {
    const g = anyNon && g0.index ? g0.toNonIndexed() : g0;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.morphAttributes = {};
    return g;
  });
  return mergeGeometries(gs, false);
}
export function M(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
export function latheGeo(profile, seg = 40, phiStart = 0, phiLength = PI * 2) { return new THREE.LatheGeometry(profile.map(([r, y]) => V2(Math.max(r, 1e-4), y)), seg, phiStart, phiLength); }
// Tube with radius function rf(u) (u 0..1 along the curve)
export function tube(pts, rf, seg = 16, rad = 6) {
  const curve = Array.isArray(pts) ? new THREE.CatmullRomCurve3(pts.map(p => (p.isVector3 ? p : V(...p)))) : pts;
  const fr = curve.computeFrenetFrames(seg, false);
  const pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, P = curve.getPointAt(u), r = typeof rf === 'function' ? rf(u) : rf, N = fr.normals[i], B = fr.binormals[i];
    for (let j = 0; j <= rad; j++) {
      const a = (j / rad) * PI * 2, c = Math.cos(a), s = Math.sin(a);
      const nx = N.x * c + B.x * s, ny = N.y * c + B.y * s, nz = N.z * c + B.z * s;
      pos.push(P.x + nx * r, P.y + ny * r, P.z + nz * r); nor.push(nx, ny, nz); uv.push(u, j / rad);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
// Grid surface from f(u,v)->[x,y,z]; nu x nv quads. Winding: (a, a+1(v), b(u)).
export function surface(f, nu, nv, flip = false) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const p = f(i / nu, j / nv); pos.push(p[0], p[1], p[2]); uv.push(i / nu, j / nv); }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; if (flip) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// Pointed (two-centred) arch points from (-a,y0) over the apex to (a,y0)
export function archPts(a, y0, Rf = 1.6, n = 14) {
  const R = Rf * a, th = Math.acos((R - a) / R), pts = [];
  for (let i = 0; i <= n; i++) { const ang = PI - th * i / n; pts.push(V2(-a + R + R * Math.cos(ang), y0 + R * Math.sin(ang))); }
  for (let i = 1; i <= n; i++) { const ang = th - th * i / n; pts.push(V2(a - R + R * Math.cos(ang), y0 + R * Math.sin(ang))); }
  return pts;
}
export function archPath(a, sill, y0, Rf = 1.6, n = 14, P = new THREE.Path()) {
  P.moveTo(-a, sill); P.lineTo(-a, y0); archPts(a, y0, Rf, n).forEach(p => P.lineTo(p.x, p.y)); P.lineTo(a, sill); P.closePath(); return P;
}

// ---------------------------------------------------------------- materials
// Clamp the HDR output of every lit material in a subtree. Near-mirror glass / water / clearcoat lit by point & spot lights
// produced specular peaks above the half-float range (Inf) which the bloom pass smeared into square blocks.
export function clampHDR(root, max = 12) {
  const done = new Set();
  root.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    ms.forEach(m => { if (!m || done.has(m) || !(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return; done.add(m);
      const prev = m.onBeforeCompile, ck = m.customProgramCacheKey;
      m.onBeforeCompile = (s, r) => { prev && prev.call(m, s, r);
        s.fragmentShader = s.fragmentShader.replace('#include <opaque_fragment>', `outgoingLight = min(outgoingLight, vec3(${max.toFixed(1)}));\n#include <opaque_fragment>`)
          .replace('gl_FragColor = vec4(outgoingLight,', `gl_FragColor = vec4(min(outgoingLight, vec3(${max.toFixed(1)})),`); };
      m.customProgramCacheKey = () => (ck ? ck.call(m) : '') + '|hdr' + max; m.needsUpdate = true; }); });
}
// Box-projected UVs (meters * k) so stone textures keep their scale on thin mouldings (RoundedBox UVs squash per face).
export function boxUV(g, k = 1.6) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let u, v; if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z + .37; v = y; } else { u = x + .71; v = y; }
    uv[i * 2] = u * k; uv[i * 2 + 1] = v * k; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
export function phys(o) { return new THREE.MeshPhysicalMaterial(o); }
// Cheap stylised glass: thin tinted transparency + fresnel rim + reflections boost alpha (no transmission pass).
export function fakeGlass(o = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: o.color ?? '#55706c', roughness: o.roughness ?? .04, metalness: 0, transparent: true, opacity: o.opacity ?? .1,
    clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: o.env ?? 1.5, depthWrite: false, side: o.side ?? THREE.FrontSide,
    emissive: new THREE.Color(o.emissive ?? '#000000'), emissiveIntensity: o.emissiveIntensity ?? 1, specularIntensity: 1,
  });
  const rim = (o.rim ?? .6).toFixed(3), gain = (o.gain ?? .8).toFixed(3);
  m.onBeforeCompile = s => {
    s.fragmentShader = s.fragmentShader.replace('#include <opaque_fragment>', `
      float fgE = pow(1. - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0., 1.), 2.4);
      float fgL = dot(outgoingLight, vec3(.3, .55, .15));
      gl_FragColor = vec4(outgoingLight, clamp(diffuseColor.a + fgE * ${rim} + fgL * ${gain}, 0., 1.));`);
  };
  m.customProgramCacheKey = () => 'fg' + rim + gain;
  return m;
}
// Horizontal water surface (geometry must be flat in its local xz plane) with ripple impacts: u.uImp[i] = (x, z, t0, strength)
export function waterSurface(o = {}) {
  const u = { uT: { value: 0 }, uImp: { value: [new THREE.Vector4(0, 0, -99, 0), new THREE.Vector4(0, 0, -99, 0), new THREE.Vector4(0, 0, -99, 0)] }, uAmb: { value: o.amb ?? .0004 } };
  const m = new THREE.MeshPhysicalMaterial({ color: o.color ?? '#2c6a70', roughness: .05, metalness: 0, transparent: true, opacity: o.opacity ?? .78, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.7, depthWrite: false });
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vOP; uniform float uT, uAmb; uniform vec4 uImp[3];
      float ripH(vec2 p){ float h = 0.; for (int i = 0; i < 3; i++){ float age = uT - uImp[i].z; if (age < 0. || age > 2.5) continue; float d = length(p - uImp[i].xy); float w = d - age * .16;
          h += uImp[i].w * exp(-w * w * 700.) * sin(w * 230.) * exp(-age * 1.4) / (1. + d * 25.); }
        h += (sin(p.x * 70. + uT * 2.1) * sin(p.y * 64. - uT * 1.7)) * uAmb; return h; }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { float e = .0012; float h0 = ripH(vOP.xz); float hx = ripH(vOP.xz + vec2(e, 0.)) - h0; float hz = ripH(vOP.xz + vec2(0., e)) - h0;
        vec3 gN = normalize(vec3(-hx / e, 1., -hz / e)); vec3 vN = normalize((viewMatrix * vec4(gN, 0.)).xyz); normal = normalize(mix(normal, vN, .92)); }`);
  };
  m.customProgramCacheKey = () => 'waterS';
  m.userData.u = u; return m;
}
// falling-water stream (unlit, additive-ish) along a tube whose uv.x runs from source (0) to impact (1)
export function streamMat() {
  const u = { time: { value: 0 }, lit: { value: 0 }, grow: { value: 1 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float time, lit, grow; varying vec2 vUv; varying vec3 vN, vV;
      float h(float x){ return fract(sin(x * 127.1) * 43758.5); }
      void main(){ if (vUv.x > grow) discard; float f = 1. - abs(dot(normalize(vN), normalize(vV)));
        float streak = .5 + .5 * sin(vUv.y * 6.283 * 3. + vUv.x * 2.) * sin(vUv.x * 40. - time * 28. + vUv.y * 9.);
        vec3 base = mix(vec3(.55, .78, .82), vec3(1., .93, .8), lit * .5);
        vec3 c = base * (.35 + .5 * f) + vec3(1., .9, .75) * pow(streak, 6.) * (.5 + lit * 1.4) + vec3(1.) * pow(f, 3.) * .35;
        float a = clamp(.35 + f * .5 + pow(streak, 4.) * .3, 0., .95);
        gl_FragColor = vec4(c, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  m.userData.u = u; return m;
}

// ---------------------------------------------------------------- textures
const texCache = {};
function ctex(key, w, h, draw, repeat) { if (!texCache[key]) { const t = TEX.drawTexture(w, h, draw); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(...repeat); texCache[key] = t; } return texCache[key]; }
export function iznikTex() { // one square tile, cobalt + turquoise 8-point star on cream (geometric only, no script)
  return ctex('iznik', 256, 256, (x, W) => {
    x.fillStyle = '#ece4d3'; x.fillRect(0, 0, W, W);
    const star = (cx, cy, r1, r2, col) => { x.beginPath(); for (let i = 0; i < 16; i++) { const a = i * PI / 8 + PI / 8, r = i % 2 ? r2 : r1; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.fillStyle = col; x.fill(); };
    star(128, 128, 112, 70, '#2a4f93'); star(128, 128, 84, 52, '#ece4d3'); star(128, 128, 64, 40, '#2c9a96');
    x.fillStyle = '#ece4d3'; x.beginPath(); x.arc(128, 128, 22, 0, PI * 2); x.fill(); x.fillStyle = '#b5362c'; x.beginPath(); x.arc(128, 128, 11, 0, PI * 2); x.fill();
    for (const [cx, cy] of [[0, 0], [W, 0], [0, W], [W, W]]) { x.fillStyle = '#2c9a96'; x.beginPath(); x.arc(cx, cy, 34, 0, PI * 2); x.fill(); x.fillStyle = '#ece4d3'; x.beginPath(); x.arc(cx, cy, 20, 0, PI * 2); x.fill(); x.fillStyle = '#b5362c'; x.beginPath(); x.arc(cx, cy, 9, 0, PI * 2); x.fill(); }
    x.strokeStyle = 'rgba(70,60,50,.35)'; x.lineWidth = 3; x.strokeRect(1, 1, W - 2, W - 2);
  });
}
function speckleTex(key, base, dot, n, seed, w = 256, h = 128) { const R = rng(seed); return ctex(key, w, h, (x, W, H) => { x.fillStyle = base; x.fillRect(0, 0, W, H); for (let i = 0; i < n; i++) { const yy = Math.pow(R(), 1.5) * H; x.fillStyle = dot; x.globalAlpha = .3 + R() * .6; x.beginPath(); x.ellipse(R() * W, H - yy, .6 + R() * 2.4, .6 + R() * 1.8, R() * 3, 0, PI * 2); x.fill(); } x.globalAlpha = 1; }); }
function streakTex(key, a, b, n, seed) { const R = rng(seed); return ctex(key, 128, 256, (x, W, H) => { x.fillStyle = a; x.fillRect(0, 0, W, H); for (let i = 0; i < n; i++) { x.strokeStyle = b; x.globalAlpha = .2 + R() * .5; x.lineWidth = .8 + R() * 2; x.beginPath(); const xx = R() * W, yy = R() * H; x.moveTo(xx, yy); x.lineTo(xx + (R() - .5) * 12, yy + 10 + R() * 50); x.stroke(); } x.globalAlpha = 1; }); }

// ---------------------------------------------------------------- shared pieces
export function pedestalGeos(seg = 3) { // stone plinth (merged) + felt top pad; top of pad at y = 1.01
  const stone = merge([
    rbox(.56, .1, .56, .03, seg).translate(0, .05, 0), rbox(.48, .06, .48, .02, seg).translate(0, .13, 0),
    rbox(.40, .70, .40, .03, seg).translate(0, .51, 0), rbox(.46, .04, .46, .015, seg).translate(0, .875, 0),
    rbox(.53, .1, .53, .03, seg).translate(0, .945, 0),
  ]);
  boxUV(stone, 1.6);
  const pad = rbox(.47, .02, .47, .009, Math.min(seg, 2)).translate(0, 1.0, 0);
  return { stone, pad, top: 1.01 };
}

// Ottoman glass mosque lamp (kandil) hanging on chains. setLit(v,t) drives flame, glass glow, halo.
export function hangingLamp(o = {}) {
  const g = new THREE.Group(); const topY = o.topY ?? 3.4;
  const prof = [[0, 0], [.014, 0], [.016, .01], [.034, .016], [.06, .036], [.072, .062], [.066, .088], [.043, .108], [.033, .122], [.037, .15], [.049, .172], [.055, .18]];
  const geo = latheGeo(prof, 32);
  const gm = fakeGlass({ color: '#6d8a72', opacity: .14, rim: .5, gain: .9 });
  const back = M(geo, fakeGlass({ color: '#6d8a72', opacity: .08, rim: .25, side: THREE.BackSide }), false, false); back.renderOrder = 5; back.userData.depthOk = true;
  const front = M(geo, gm, false, false); front.renderOrder = 7; front.userData.depthOk = true;
  g.add(back, front);
  const brass = MAT.brass();
  const chainMat = new THREE.MeshStandardMaterial({ color: '#3a2c1c', metalness: .7, roughness: .45 });
  const hookY = .46; const cg = [];
  const seg = (a, b, r) => { const d = b.clone().sub(a), len = d.length(); const c = new THREE.CylinderGeometry(r, r, len, 4).translate(0, len / 2, 0); c.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()))); return c.translate(a.x, a.y, a.z); };
  for (let k = 0; k < 3; k++) { const a = k * 2.094 + .5; cg.push(seg(V(Math.cos(a) * .052, .15, Math.sin(a) * .052), V(0, hookY, 0), .0022)); }
  cg.push(new THREE.CylinderGeometry(.003, .003, topY - hookY, 4).translate(0, hookY + (topY - hookY) / 2, 0));
  g.add(M(merge(cg), chainMat, true, false));
  const ball = M(new THREE.SphereGeometry(.03, 20, 14), brass); ball.position.y = hookY + .1; ball.scale.y = .85; g.add(ball);
  const cap = M(new THREE.CylinderGeometry(.012, .02, .03, 12), brass); cap.position.y = hookY + .05; g.add(cap);
  // oil + wick
  const oil = M(new THREE.CircleGeometry(.05, 24).rotateX(-PI / 2), new THREE.MeshStandardMaterial({ color: '#7a5414', roughness: .2, transparent: true, opacity: .8 }), false, false); oil.position.y = .045; oil.renderOrder = 6; g.add(oil);
  const wick = M(new THREE.CylinderGeometry(.004, .006, .03, 8), new THREE.MeshStandardMaterial({ color: '#2b2016' }), false, false); wick.position.y = .06; g.add(wick);
  const fl = flame({ height: .042, seed: o.seed ?? 1, intensity: 4 }); fl.position.y = .072; g.add(fl);
  const halo = glow({ size: .42, opacity: 0, color: '#ffb35a' }); halo.position.y = .09; g.add(halo);
  const halo2 = glow({ size: .16, opacity: 0, color: '#fff0c8' }); halo2.position.y = .085; g.add(halo2);
  g.userData.flameY = .08;
  g.userData.setLit = (v, t) => {
    const ign = v > 0 && v < 1 ? Math.sin(v * PI) * .35 : 0;
    fl.visible = v > .01; fl.scale.setScalar(Math.max(.01, v * (1 + ign)) * (1 + .05 * Math.sin(t * 9 + (o.seed ?? 1))));
    fl.userData.uniforms.intensity.value = 4 * v;
    halo.material.opacity = .3 * v * (1 + ign); halo2.material.opacity = .45 * v;
    gm.emissive.set('#ffae55'); gm.emissiveIntensity = .9 * v;
    halo.visible = halo2.visible = v > .01;
  };
  g.userData.setLit(0, 0);
  return g;
}

// ---------------------------------------------------------------- 1 MERHAMET: bird's nest with speckled eggs
export function nest() {
  const g = new THREE.Group(); const R = rng(101);
  const bark = streakTex('bark', '#9a7a52', '#5a4228', 160, 3);
  const twigMat = new THREE.MeshStandardMaterial({ map: bark, color: '#d8bf9a', roughness: .95 });
  const geos = []; const RC = .13, RY = .046;
  for (let k = 0; k < 150; k++) {
    const phi = R() * PI * 2, rr = .02 + R() * .028; const cr = RC + Math.cos(phi) * rr * 1.25, cy = RY + Math.sin(phi) * rr * .85;
    const a0 = R() * PI * 2, span = .6 + R() * 1.5, n = 7, pts = []; const tilt = (R() - .5) * .05, r = .0028 + R() * .003;
    for (let s = 0; s <= n; s++) { const a = a0 + span * s / n, w = (R() - .5) * .01; pts.push(V(Math.cos(a) * (cr + w), Math.max(.004, cy + (s / n - .5) * tilt + w * .6), Math.sin(a) * (cr + w))); }
    geos.push(tube(pts, u => r * (1 - .35 * u), 10, 4));
  }
  for (let k = 0; k < 18; k++) { // stray twigs poking out
    const a = R() * PI * 2, y = .02 + R() * .07, p0 = V(Math.cos(a) * .12, y, Math.sin(a) * .12); const tan = V(-Math.sin(a), (R() - .5) * .4, Math.cos(a)).multiplyScalar(R() < .5 ? 1 : -1);
    const out = V(Math.cos(a), 0, Math.sin(a)); const p1 = p0.clone().addScaledVector(tan, .05).addScaledVector(out, .02), p2 = p0.clone().addScaledVector(tan, .1 + R() * .05).addScaledVector(out, .05 + R() * .03);
    const r = .002 + R() * .002; geos.push(tube([p0, p1, p2], u => r * (1 - .6 * u), 8, 4));
  }
  g.add(M(merge(geos), twigMat));
  const grass = streakTex('grass', '#7a5a34', '#c9a66e', 300, 5);
  g.add(M(latheGeo([[0, .022], [.05, .024], [.085, .036], [.103, .058], [.11, .075]], 36), new THREE.MeshStandardMaterial({ map: grass, roughness: 1, side: THREE.DoubleSide })));
  g.add(M(latheGeo([[0, 0], [.13, 0], [.16, .03]], 30), twigMat));
  // eggs
  const eggProf = []; const L = .072, W = .026; for (let k = 0; k <= 18; k++) { const t = k / 18 * 2 - 1; eggProf.push([W * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - .14 * t), (t * .5 + .5) * L]); }
  const eggGeo = latheGeo(eggProf, 28);
  const eggMat = phys({ map: speckleTex('egg', '#8fc9c6', '#5a3a22', 260, 9), roughness: .42, clearcoat: .35, clearcoatRoughness: .4, sheen: .3, sheenColor: new THREE.Color('#ffffff') });
  const eggs = [];
  [[0, .0], [2.15, .004], [4.2, -.003]].forEach(([a, dy], i) => {
    const piv = new THREE.Group(); piv.position.set(Math.cos(a) * .036, .05 + dy, Math.sin(a) * .036); piv.rotation.y = -a + PI / 2 + (i - 1) * .3;
    const e = M(eggGeo, eggMat); e.rotation.z = PI / 2 - .25; e.position.set(-L / 2 * .97, 0, 0); piv.add(e); g.add(piv); eggs.push(piv);
  });
  g.userData.h = .1; g.userData.w = .34;
  g.userData.anim = tau => {
    const w1 = tau > 0 ? Math.exp(-3.5 * tau) * Math.sin(tau * 24) * .16 : 0; const t2 = tau - .85; const w2 = t2 > 0 ? Math.exp(-4 * t2) * Math.sin(t2 * 26) * .1 : 0;
    eggs[0].rotation.x = w1 + w2; eggs[1].rotation.x = -w2 * .5;
  };
  return g;
}

// ---------------------------------------------------------------- 2 SAMİMİYET: clear glass carafe of water
export function carafe() {
  const g = new THREE.Group();
  const prof = [[0, .004], [.052, 0], [.078, .007], [.098, .034], [.107, .075], [.101, .116], [.081, .152], [.052, .182], [.034, .207], [.029, .25], [.031, .281], [.041, .297], [.043, .304]];
  const outer = latheGeo(prof, 48);
  const back = M(outer, fakeGlass({ color: '#4c6a68', opacity: .06, rim: .3, side: THREE.BackSide }), false, false); back.renderOrder = 1; back.userData.depthOk = true;
  const front = M(outer, fakeGlass({ color: '#4c6a68', opacity: .07, rim: .75, gain: .9 }), true, false); front.renderOrder = 4; front.userData.depthOk = true;
  const lvl = .128; const rAt = y => { for (let i = 1; i < prof.length; i++) if (prof[i][1] >= y) { const [r0, y0] = prof[i - 1], [r1, y1] = prof[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return .03; };
  const wp = [[0, .01]]; for (const [r, y] of prof) if (y > .01 && y < lvl) wp.push([r - .006, y]); wp.push([rAt(lvl) - .006, lvl]);
  const water = M(latheGeo(wp, 40), fakeGlass({ color: '#2f8d93', opacity: .2, rim: .45, gain: .5 }), false, false); water.renderOrder = 2; water.userData.depthOk = true;
  const ws = waterSurface({ color: '#3a8e95', opacity: .55, amb: .0003 });
  const top = M(new THREE.CircleGeometry(rAt(lvl) - .006, 40).rotateX(-PI / 2), ws, false, false); top.position.y = lvl; top.renderOrder = 3;
  g.add(back, water, top, front);
  // caustic patch on the felt (light focused through the water), only when lit
  const caus = new THREE.Mesh(new THREE.PlaneGeometry(.2, .12).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ map: TEX.softDot(64, .2), color: '#ffcf8a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  caus.position.set(.1, .003, -.07); caus.rotation.y = .6; caus.userData.noDepth = true; g.add(caus);
  g.userData.h = .3; g.userData.w = .22;
  g.userData.anim = (tau, t, lit) => { ws.userData.u.uT.value = t; ws.userData.u.uImp.value[0].set(.01, -.01, -99 + 0, 0); ws.userData.u.uAmb.value = .0003 + (tau > 0 ? .0012 * Math.exp(-tau * 2) : 0); caus.material.opacity = .55 * lit * (.85 + .15 * Math.sin(t * 5)); };
  return g;
}

// ---------------------------------------------------------------- 3 ADALET: brass balance scale
export function balance() {
  const g = new THREE.Group(); const brass = MAT.brass(); const brass2 = MAT.gold({ a: '#e2b45e', b: '#9a6a2a' });
  g.add(M(latheGeo([[0, 0], [.11, 0], [.113, .008], [.108, .016], [.085, .022], [.06, .034], [.04, .044], [.026, .056], [.02, .072], [0, .074]], 40), brass));
  g.add(M(latheGeo([[0, .07], [.017, .07], [.012, .1], [.011, .19], [.019, .2], [.02, .212], [.012, .224], [.0105, .375], [.017, .385], [.017, .398], [0, .4]], 24), brass));
  const fin = M(new THREE.SphereGeometry(.016, 18, 12), brass2); fin.position.y = .438; g.add(fin);
  const spike = M(new THREE.ConeGeometry(.007, .03, 12), brass2); spike.position.y = .465; g.add(spike);
  const yoke = M(rbox(.012, .05, .03, .004), brass); yoke.position.y = .41; g.add(yoke);
  const beam = new THREE.Group(); beam.position.y = .405; g.add(beam);
  beam.add(M(latheGeo([[.0045, -.235], [.0075, -.18], [.0095, -.05], [.011, 0], [.0095, .05], [.0075, .18], [.0045, .235]].map(([r, y]) => [r, y]), 12).rotateZ(PI / 2), brass));
  const hub = M(new THREE.SphereGeometry(.016, 16, 12), brass2); beam.add(hub);
  const needle = M(new THREE.ConeGeometry(.005, .085, 10), brass2); needle.position.y = .05; beam.add(needle);
  const pans = [];
  for (const sx of [-1, 1]) {
    const end = M(new THREE.SphereGeometry(.009, 12, 8), brass2); end.position.x = sx * .235; beam.add(end);
    const hook = M(new THREE.TorusGeometry(.008, .0022, 6, 14), brass); hook.position.set(sx * .235, -.01, 0); beam.add(hook);
    const pg = new THREE.Group(); pg.position.set(sx * .235, -.016, 0); beam.add(pg); pans.push(pg);
    const panY = -.215; const cg = [];
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + PI / 2; const p = V(Math.cos(a) * .082, panY + .024, Math.sin(a) * .082); const len = p.length(); const c = new THREE.CylinderGeometry(.0013, .0013, len, 4).translate(0, len / 2, 0); c.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), p.clone().negate().normalize()))); c.translate(p.x, p.y, p.z); cg.push(c); }
    pg.add(M(merge(cg), brass, true, false));
    const pan = M(latheGeo([[0, 0], [.05, .002], [.075, .01], [.088, .022], [.09, .026]], 36), new THREE.MeshPhysicalMaterial({ map: brass.map, roughnessMap: brass.roughnessMap, metalness: 1, roughness: 1, side: THREE.DoubleSide, color: '#ffe0b0' })); pan.position.y = panY; pg.add(pan);
    const wgt = M(latheGeo([[0, 0], [.022, 0], [.023, .02], [.016, .025], [.007, .028], [.009, .036], [.006, .041], [0, .042]], 24), brass2); wgt.position.y = panY + .004; pg.add(wgt);
  }
  g.userData.h = .47; g.userData.w = .5;
  g.userData.anim = (tau) => { const a = tau > 0 ? .11 * Math.exp(-2.2 * tau) * Math.cos(tau * 7.5) : .0; beam.rotation.z = a; pans.forEach(p => { p.rotation.z = -a; }); };
  return g;
}

// ---------------------------------------------------------------- 4 GÜVENİLİRLİK: brass-bound chest, iron padlock, brass key
export function chest() {
  const g = new THREE.Group();
  const wood = MAT.wood({ a: '#7c4a26', b: '#4b2a13', rings: 9, seed: 41, clearcoat: .35 });
  const brass = MAT.brass(); const iron = new THREE.MeshPhysicalMaterial({ color: '#545250', metalness: .85, roughness: .38, clearcoat: .3 });
  const W = .32, H = .15, D = .19;
  g.add(M(rbox(W, H, D, .012).translate(0, H / 2, 0), wood));
  const dome = new THREE.Shape(); dome.moveTo(-D / 2, 0); dome.lineTo(D / 2, 0); dome.lineTo(D / 2, .015); dome.absellipse(0, .015, D / 2, .055, 0, PI, false); dome.lineTo(-D / 2, 0);
  const lidGeo = new THREE.ExtrudeGeometry(dome, { depth: W, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 2, curveSegments: 24 }); lidGeo.translate(0, 0, -W / 2); lidGeo.rotateY(PI / 2);
  const lid = M(lidGeo, MAT.wood({ a: '#7c4a26', b: '#4b2a13', rings: 9, seed: 41, clearcoat: .35, repeat: [4, 4] })); lid.position.y = H + .002; g.add(lid);
  for (const bx of [-.105, .105]) {
    g.add(M(rbox(.026, H + .004, D + .008, .004).translate(bx, H / 2, 0), brass));
    const bandGeo = new THREE.ExtrudeGeometry(dome, { depth: .026, bevelEnabled: false, curveSegments: 24 }); bandGeo.translate(0, 0, -.013); bandGeo.rotateY(PI / 2);
    const band = M(bandGeo, brass); band.scale.set(1, 1.08, 1.05); band.position.set(bx, H + .002, 0); g.add(band);
  }
  for (const cx of [-1, 1]) for (const cz of [-1, 1]) { const c = M(rbox(.035, .035, .035, .006), brass); c.position.set(cx * (W / 2 - .012), .016, cz * (D / 2 - .012)); g.add(c); }
  const hasp = M(rbox(.045, .07, .008, .003), brass); hasp.position.set(0, H - .005, D / 2 + .006); g.add(hasp);
  const staple = M(new THREE.TorusGeometry(.009, .0028, 8, 16), brass); staple.position.set(0, H - .035, D / 2 + .013); staple.rotation.y = PI / 2; g.add(staple);
  const lock = new THREE.Group(); lock.position.set(0, H - .035, D / 2 + .016); g.add(lock);
  const lockBody = M(latheGeo([[0, -.058], [.022, -.058], [.03, -.05], [.032, -.03], [.028, -.012], [0, -.01]], 28), iron); lockBody.scale.set(1, 1, .45); lock.add(lockBody);
  const shackle = M(new THREE.TorusGeometry(.017, .0045, 10, 20, PI), iron); shackle.position.y = -.013; lock.add(shackle);
  const keyhole = M(new THREE.PlaneGeometry(.018, .026), new THREE.MeshBasicMaterial({ map: ctex('keyhole', 64, 96, (x) => { x.clearRect(0, 0, 64, 96); x.fillStyle = '#1a1612'; x.beginPath(); x.arc(32, 32, 14, 0, PI * 2); x.fill(); x.beginPath(); x.moveTo(24, 36); x.lineTo(40, 36); x.lineTo(46, 88); x.lineTo(18, 88); x.closePath(); x.fill(); }), transparent: true }));
  keyhole.position.set(0, -.035, .0145); lock.add(keyhole);
  const plate = M(new THREE.CircleGeometry(.02, 24), brass); plate.position.set(0, -.034, .0142); lock.add(plate); keyhole.position.z = .0148;
  // brass key leaning against the chest front
  const key = new THREE.Group();
  key.add(M(new THREE.TorusGeometry(.024, .0055, 10, 28), brass));
  const quatre = M(new THREE.TorusGeometry(.009, .0028, 8, 18), brass); key.add(quatre);
  const shaft = M(new THREE.CylinderGeometry(.0052, .0052, .11, 12), brass); shaft.position.y = -.08; key.add(shaft);
  for (const yy of [-.032, -.04]) { const ring = M(new THREE.TorusGeometry(.0068, .0022, 6, 14), brass); ring.rotation.x = PI / 2; ring.position.y = yy; key.add(ring); }
  const bit = M(merge([rbox(.024, .03, .006, .002).translate(.014, 0, 0), rbox(.008, .008, .007, .001).translate(.022, .008, 0)]), brass); bit.position.y = -.12; key.add(bit);
  key.scale.setScalar(1.05); key.position.set(.105, .14, D / 2 + .035); key.rotation.set(-.38, -.25, .22); g.add(key);
  g.userData.h = .23; g.userData.w = .34;
  g.userData.anim = tau => { lock.rotation.x = tau > 0 ? -.3 * Math.exp(-2.8 * tau) * Math.sin(tau * 10) : 0; };
  return g;
}

// ---------------------------------------------------------------- 5 TEVAZU: wheat sheaf with bowed, full ears
export function wheat() {
  const g = new THREE.Group(); const R = rng(55);
  const stalks = [], ears = [], awns = [];
  // one ear template along +y
  const earT = [], awnT = []; const kGeo = new THREE.SphereGeometry(1, 6, 4);
  for (let l = 0; l < 10; l++) {
    const y = .006 + l * .0082, sc = 1 - Math.max(0, l - 6) * .13;
    for (const side of [-1, 1]) for (const k of [0, 1]) {
      const a = side * (.42 + k * .25), off = l % 2 ? PI / 2 : 0;
      const m = new THREE.Matrix4().compose(V(Math.sin(a) * .0045 * Math.cos(off), y + k * .002, Math.sin(a) * .0045 * Math.sin(off) + (k ? .002 : -.002)), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.cos(off) * 0, off, -a * .9)), V(.0052 * sc, .0098 * sc, .0048 * sc));
      earT.push(kGeo.clone().applyMatrix4(m));
      const tip = V(Math.sin(a) * .008 * Math.cos(off), y + .009, Math.sin(a) * .008 * Math.sin(off)); const dir = V(Math.sin(a * .55) * Math.cos(off), 1, Math.sin(a * .55) * Math.sin(off)).normalize(); const len = .045 + l * .002;
      const c = new THREE.CylinderGeometry(.00025, .0006, len, 3).translate(0, len / 2, 0); c.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir))); c.translate(tip.x, tip.y, tip.z); awnT.push(c);
    }
  }
  earT.push(new THREE.CylinderGeometry(.0018, .0022, .088, 5).translate(0, .044, 0));
  const earGeo = merge(earT), awnGeo = merge(awnT);
  const N = 34;
  for (let k = 0; k < N; k++) {
    const a = k * 2.39996 + R() * .3, rb = .055 * Math.sqrt((k + .5) / N), rt = .03 + .065 * Math.sqrt((k + .5) / N) + R() * .01;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const base = dir.clone().multiplyScalar(rb), waist = dir.clone().multiplyScalar(rb * .32).setY(.2);
    const top = dir.clone().multiplyScalar(rt).setY(.44 + R() * .07 - (rt - .03) * .6);
    const neck = top.clone().addScaledVector(dir, .03).setY(top.y + .018);
    const mid1 = base.clone().lerp(waist, .5).setY(.1), mid2 = waist.clone().lerp(top, .5); mid2.addScaledVector(dir, .006);
    stalks.push(tube([base, mid1, waist, mid2, top, neck], .0021, 14, 4));
    const bow = 1.75 + R() * .55; // radians from vertical: ears hang down (full ears bow)
    const earDir = dir.clone().multiplyScalar(Math.sin(bow)).add(V(0, Math.cos(bow), 0)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), earDir); const tw = new THREE.Quaternion().setFromAxisAngle(earDir, R() * PI);
    const mtx = new THREE.Matrix4().compose(neck, tw.multiply(q), V(1, 1, 1).multiplyScalar(.95 + R() * .2));
    ears.push(earGeo.clone().applyMatrix4(mtx)); awns.push(awnGeo.clone().applyMatrix4(mtx));
  }
  const uni = { uTime: { value: 0 }, uBow: { value: 0 } };
  const sway = m => { m.onBeforeCompile = s => { Object.assign(s.uniforms, uni); s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime, uBow;').replace('#include <begin_vertex>', `#include <begin_vertex>
      { float hh = smoothstep(.22, .55, transformed.y); vec2 rd = transformed.xz; float rl = length(rd) + 1e-4;
        transformed.x += sin(uTime * 1.6 + transformed.y * 5.) * .005 * hh; transformed.z += cos(uTime * 1.25 + transformed.y * 4.) * .004 * hh;
        float hb = smoothstep(.43, .52, transformed.y); transformed.xz += rd / rl * uBow * hb * .018; transformed.y -= uBow * hb * .022; }`); }; m.customProgramCacheKey = () => 'wheatSway'; return m; };
  const stalkMat = sway(new THREE.MeshPhysicalMaterial({ color: '#b98a3a', roughness: .65, sheen: .3, sheenColor: new THREE.Color('#ffe0a0') }));
  const earMat = sway(new THREE.MeshPhysicalMaterial({ color: '#c8913a', roughness: .55, sheen: .4, sheenColor: new THREE.Color('#ffe2a0'), clearcoat: .15 }));
  const awnMat = sway(new THREE.MeshStandardMaterial({ color: '#c9a25c', roughness: .7 }));
  g.add(M(merge(stalks), stalkMat), M(merge(ears), earMat), M(merge(awns), awnMat, true, false));
  // twine band + cut ends
  const twine = new THREE.MeshPhysicalMaterial({ color: '#9b7240', roughness: .9, sheen: .5 });
  for (const yy of [.19, .206]) { const t = M(new THREE.TorusGeometry(.02 + (yy - .19) * .2, .0055, 8, 28), twine); t.rotation.x = PI / 2; t.position.y = yy; g.add(t); }
  const knot = M(new THREE.SphereGeometry(.009, 10, 8), twine); knot.position.set(.0, .198, .023); g.add(knot);
  g.userData.h = .6; g.userData.w = .3;
  g.userData.anim = (tau, t) => { uni.uTime.value = t; uni.uBow.value = tau > 0 ? Math.exp(-2.5 * tau) * Math.sin(tau * 8) * .9 : 0; };
  return g;
}

// ---------------------------------------------------------------- shared rose head (fresh or dried)
export function roseHead(o = {}) {
  const g = new THREE.Group(); const R = rng(o.seed ?? 77); const S = o.size ?? 1; const dried = !!o.dried;
  const petalTex = ctex(dried ? 'petalD' : 'petal', 64, 128, (x, W, H) => { const gr = x.createLinearGradient(0, H, 0, 0); if (dried) { gr.addColorStop(0, '#6e2a36'); gr.addColorStop(.55, '#a65866'); gr.addColorStop(1, '#d09a8e'); } else { gr.addColorStop(0, '#6e0716'); gr.addColorStop(.45, '#b3122a'); gr.addColorStop(1, '#d8283d'); } x.fillStyle = gr; x.fillRect(0, 0, W, H); const e = x.createLinearGradient(0, 0, W, 0); e.addColorStop(0, 'rgba(60,0,10,.35)'); e.addColorStop(.2, 'rgba(0,0,0,0)'); e.addColorStop(.8, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(60,0,10,.35)'); x.fillStyle = e; x.fillRect(0, 0, W, H); });
  const mat = new THREE.MeshPhysicalMaterial({ map: petalTex, roughness: dried ? .75 : .5, sheen: 1, sheenColor: new THREE.Color(dried ? '#f0b8b0' : '#ff8090'), sheenRoughness: .4, side: THREE.DoubleSide });
  const outer = new THREE.Group(); g.add(outer);
  const petal = (w, h, cup, curl) => surface((u, v) => { const uu = u * 2 - 1; const wid = w * Math.pow(Math.sin(PI * (.12 + .88 * v)), .55) * (v > .85 ? 1 - (v - .85) * 1.2 : 1); const z = cup * (1 - uu * uu) * Math.sin(PI * v * .9) + curl * Math.pow(smoothstep(.55, 1, v), 2) * (1 - .3 * uu * uu); return [uu * wid, v * h - curl * .3 * Math.pow(smoothstep(.6, 1, v), 2), z]; }, 10, 8);
  const layers = [[5, .018, .052, .006, 0, .05], [6, .026, .056, .009, .003, .3], [7, .032, .056, .01, .008, .62], [7, .036, .05, .008, .016, .95]];
  layers.forEach(([n, w, h, cup, curl, tilt], li) => {
    for (let k = 0; k < n; k++) {
      const a = k / n * PI * 2 + li * .7 + R() * .25; const pg = petal(w * S, h * S, cup * S, curl * S * (dried ? 1.6 : 1));
      const p = M(pg, mat); const holder = new THREE.Group(); holder.rotation.y = -a; const tiltG = new THREE.Group(); tiltG.position.z = (li * .006 + .004) * S; tiltG.rotation.x = tilt * (dried ? .8 : 1) + (R() - .5) * .1; tiltG.add(p); holder.add(tiltG);
      (li === 3 ? outer : g).add(holder);
    }
  });
  const green = new THREE.MeshPhysicalMaterial({ color: dried ? '#4a4a2a' : '#3d6a2c', roughness: .6, side: THREE.DoubleSide });
  const rec = M(new THREE.SphereGeometry(.013 * S, 12, 10), green); rec.position.y = -.004 * S; rec.scale.y = .8; g.add(rec);
  for (let k = 0; k < 5; k++) { const sep = M(surface((u, v) => { const uu = u * 2 - 1; return [uu * .007 * S * (1 - v), -v * .04 * S, .012 * S * v * v + .002 * S * (1 - uu * uu)]; }, 4, 6), green); const hh = new THREE.Group(); hh.rotation.y = k * 1.2566 + .3; sep.rotation.x = .25; hh.add(sep); g.add(hh); }
  g.userData.outer = outer; return g;
}

// ---------------------------------------------------------------- 6 VEFA: bundle of old letters tied with twine + dried rose
export function letters() {
  const g = new THREE.Group(); const wood = MAT.wood({ a: '#8a5a32', b: '#5a3418', rings: 12, seed: 61 });
  const tilt = -.62; // lean back
  const stand = new THREE.Group(); stand.position.set(0, .012, .0); stand.rotation.x = tilt; g.add(stand);
  stand.add(M(rbox(.33, .24, .014, .005).translate(0, .12, 0), wood));
  stand.add(M(rbox(.33, .022, .03, .006).translate(0, .006, .02), wood));
  const strut = M(rbox(.04, .2, .012, .004), wood); strut.position.set(0, .08, -.07); strut.rotation.x = -.9; g.add(strut);
  g.add(M(rbox(.34, .012, .16, .005).translate(0, .006, -.02), wood));
  const paperTex = (seed) => ctex('letter' + seed, 256, 180, (x, W, H) => { const R = rng(seed); x.fillStyle = '#d9bf8f'; x.fillRect(0, 0, W, H); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(150,110,60,${R() * .12})`; x.beginPath(); x.arc(R() * W, R() * H, 10 + R() * 40, 0, PI * 2); x.fill(); }
    const gr = x.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .7); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(110,70,30,.45)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(120,85,45,.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(W / 2, H * .55); x.lineTo(W, 0); x.stroke(); x.strokeStyle = 'rgba(255,245,220,.5)'; x.beginPath(); x.moveTo(0, 3); x.lineTo(W / 2, H * .55 + 3); x.lineTo(W, 3); x.stroke(); });
  const stack = new THREE.Group(); stack.position.set(-.01, .13, .012); stand.add(stack);
  [[.0, .0, .0, 3], [.012, -.006, .05, 4], [-.008, .004, -.04, 5]].forEach(([dx, dy, rz, s], i) => { const L = M(rbox(.24, .15, .005, .002), new THREE.MeshStandardMaterial({ map: paperTex(s), roughness: .9 })); L.position.set(dx, dy, -i * .0055); L.rotation.z = rz; stack.add(L); });
  const twine = new THREE.MeshPhysicalMaterial({ color: '#7a5028', roughness: .85, sheen: .6, sheenColor: new THREE.Color('#ffe2b0') });
  const loop = (pts) => M(tube(pts.map(p => V(...p)), .0036, 40, 5), twine);
  const zf = .006, zb = -.017;
  stack.add(loop([[.035, .079, zf], [.035, 0, zf + .002], [.035, -.079, zf], [.035, -.081, (zf + zb) / 2], [.035, -.079, zb], [.035, 0, zb], [.035, .079, zb], [.035, .081, (zf + zb) / 2], [.035, .079, zf + .0001]]));
  stack.add(loop([[.124, .01, zf], [0, .01, zf + .002], [-.124, .01, zf], [-.127, .01, (zf + zb) / 2], [-.124, .01, zb], [0, .01, zb], [.124, .01, zb], [.127, .01, (zf + zb) / 2], [.124, .01, zf + .0001]]));
  const bow = new THREE.Group(); bow.position.set(.035, .01, zf + .004); stack.add(bow);
  for (const s of [-1, 1]) { const l = M(new THREE.TorusGeometry(.016, .0026, 6, 18), twine); l.scale.set(1.3, .75, 1); l.position.set(s * .02, .006, .002); l.rotation.z = s * .35; bow.add(l); bow.add(M(tube([V(0, 0, .002), V(s * .01, -.02, .004), V(s * .018, -.04, .002)], .0024, 8, 4), twine)); }
  bow.add(M(new THREE.SphereGeometry(.0055, 10, 8), twine));
  const seal = M(latheGeo([[0, 0], [.02, 0], [.022, .002], [.019, .005], [.012, .006], [0, .0062]], 20), new THREE.MeshPhysicalMaterial({ color: '#8e1d1d', roughness: .35, clearcoat: .6 })); seal.rotation.x = PI / 2; seal.position.set(-.055, -.025, zf + .001); stack.add(seal);
  // dried rose tucked under the twine
  const rose = new THREE.Group(); rose.position.set(-.075, .045, zf + .02); rose.rotation.set(.0, 0, .9); stack.add(rose);
  const head = roseHead({ dried: true, size: 1.0, seed: 12 }); head.rotation.x = PI / 2 - .35; head.position.set(0, .0, .016); rose.add(head); // bloom faces the viewer
  const stemMat = new THREE.MeshStandardMaterial({ color: '#5a5032', roughness: .8 });
  rose.add(M(tube([V(0, -.01, .006), V(.0, -.07, .003), V(.004, -.13, .0), V(.01, -.19, .001)], u => .0028 * (1 - .3 * u), 12, 5), stemMat));
  const leaf = M(surface((u, v) => { const uu = u * 2 - 1; const w = .011 * Math.sin(PI * v); return [uu * w, -v * .04, Math.abs(uu) * w * .5 + Math.sin(v * 5) * .002]; }, 6, 8), new THREE.MeshStandardMaterial({ color: '#6a6236', roughness: .8, side: THREE.DoubleSide })); leaf.position.set(.004, -.09, .004); leaf.rotation.z = .9; rose.add(leaf);
  g.userData.h = .22; g.userData.w = .34;
  g.userData.anim = () => {};
  return g;
}

// ---------------------------------------------------------------- 7 SABIR: fountain spout dripping onto a worn stone hollow
export function cesme() {
  const g = new THREE.Group(); const R = rng(71);
  const lime = MAT.stone({ a: '#a8a294', b: '#77715f', seed: 17 });
  const grey = new THREE.MeshPhysicalMaterial({ ...(() => { const t = TEX.stone({ a: '#e2dace', b: '#aaa08e', seed: 19 }); return { map: t.map, normalMap: t.normalMap }; })(), roughness: .75, clearcoat: .25, clearcoatRoughness: .5 });
  const P0 = V(-.13, 0, -.1);
  const post = M(latheGeo([[0, 0], [.07, 0], [.07, .03], [.056, .042], [.048, .062], [.048, .33], [.062, .346], [.066, .37], [.045, .388], [.026, .405], [0, .41]], 8), lime); post.position.copy(P0); g.add(post);
  const brass = MAT.brass();
  const dirS = V(.85, -.12, .5).normalize(); const sBase = P0.clone().add(V(dirS.x, 0, dirS.z).normalize().multiplyScalar(.044)).setY(.29);
  const spout = M(latheGeo([[.018, 0], [.019, .012], [.0135, .022], [.0125, .12], [.0105, .145], [.012, .152], [.008, .154]], 20), brass); spout.quaternion.setFromUnitVectors(V(0, 1, 0), dirS); spout.position.copy(sBase); g.add(spout);
  const mouth = sBase.clone().addScaledVector(dirS, .152).add(V(0, -.008, 0));
  // natural rock with a smooth hollow worn by the drops
  const rg = mergeVertices(new THREE.IcosahedronGeometry(1, 5).deleteAttribute('uv').deleteAttribute('normal')); { const p = rg.attributes.position; const top = .1, hb = .062, hd = .034;
    const se = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e); // superellipse: sphere -> rounded block (a worn stone, not a blob)
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = Math.sin(x * 3.1 + 1) * Math.sin(y * 2.7 + 2) * .06 + Math.sin(z * 5.3 + x * 4.1) * .04 + Math.sin(x * 13 + z * 11 + y * 7) * .018 + Math.sin(x * 29 - z * 23) * .007;
      const fac = Math.round(Math.atan2(z, x) / (PI / 3.5)) * (PI / 3.5), cut = 1 - .06 * (1 - Math.cos(Math.atan2(z, x) - fac)) * 8; // chisel facets
      x = se(x, .55); z = se(z, .55); y = se(y, .7); x *= .165 * (1 + n) * cut * (1 - .16 * Math.max(0, y)); z *= .14 * (1 + n) * cut * (1 - .16 * Math.max(0, y)); y = y < 0 ? y * .02 : y * top * .9 * (1 + n * .6); const r = Math.hypot(x - .01, z);
      if (r < hb * 1.15) { const yb = top * .93 - hd * Math.max(0, 1 - (r / hb) ** 2); y = Math.min(y, yb + Math.max(0, r - hb) * .4); }
      p.setXYZ(i, x, y, z); } rg.computeVertexNormals(); { const cc = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i) - .01, p.getZ(i)); const wet = Math.max(0, 1 - Math.max(0, r - hb) / .035) * (p.getY(i) > .05 ? 1 : 0); const v = 1 - .42 * wet; cc.set([v * .98, v, v * 1.03], i * 3); } rg.setAttribute('color', new THREE.BufferAttribute(cc, 3)); } const uvs = []; for (let i = 0; i < p.count; i++) uvs.push(p.getX(i) * 4 + .5, p.getZ(i) * 4 + p.getY(i) * 3); rg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); }
  const rt = TEX.stone({ a: '#b9b4aa', b: '#77736b', seed: 29 });
  const rock = M(rg, new THREE.MeshPhysicalMaterial({ map: rt.map, normalMap: rt.normalMap, normalScale: V2(1.6, 1.6), roughness: .66, clearcoat: .3, clearcoatRoughness: .4, color: '#a8a49c', vertexColors: true }));
  rock.position.set(mouth.x - .01, 0, mouth.z); g.add(rock);
  const surfY = .081;
  const ws = waterSurface({ color: '#3a7a80', opacity: .82, amb: .00015 });
  const water = M(new THREE.CircleGeometry(.046, 36).rotateX(-PI / 2), ws, false, true); water.position.set(mouth.x, surfY, mouth.z); g.add(water);
  const moss = M(merge([0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => new THREE.SphereGeometry(.006 + R() * .006, 7, 5).scale(1.6, .32, 1.2).translate(P0.x + Math.cos(i * .62 + 2.2) * (.072 + R() * .006), .003, P0.z + Math.sin(i * .62 + 2.2) * (.072 + R() * .006)))), new THREE.MeshStandardMaterial({ color: '#4d6630', roughness: 1 })); g.add(moss);
  const dropMat = fakeGlass({ color: '#a8dce4', opacity: .4, rim: .9, gain: 1.2 });
  const dropGeo = latheGeo([[0, -.012], [.006, -.0095], [.0085, -.005], [.008, 0], [.0045, .006], [0, .011]], 16);
  const drop = M(dropGeo.clone().scale(1.4, 1.4, 1.4), dropMat, false, false); drop.renderOrder = 6; drop.userData.depthOk = true; g.add(drop);
  const spl = [0, 1, 2, 3, 4, 5].map(() => { const s = M(new THREE.SphereGeometry(.0034, 8, 6), dropMat, false, false); s.renderOrder = 6; g.add(s); return s; });
  const fallT = Math.sqrt(2 * (mouth.y - surfY) / 9.81);
  g.userData.h = .43; g.userData.w = .32;
  g.userData.anim = (tau) => {
    ws.userData.u.uT.value = tau;
    const P = 1.05, off = .12; const kNow = Math.floor((tau - off) / P); const lastLand = off + kNow * P, nextLand = lastLand + P;
    ws.userData.u.uImp.value[0].set(0, 0, lastLand, .0034); ws.userData.u.uImp.value[1].set(0, 0, lastLand - P, .0034);
    const tf = nextLand - tau;
    if (tf > fallT) { const grow = clamp(1 - (tf - fallT) / (P - fallT - .05)); drop.position.copy(mouth).add(V(0, -.01 * grow, 0)); drop.scale.set(.45 + .55 * grow, .35 + .75 * grow, .45 + .55 * grow); }
    else { const s = fallT - tf; drop.position.set(mouth.x, mouth.y - .01 - 4.905 * s * s, mouth.z); drop.scale.set(.85, 1.3, .85); }
    const sa = tau - lastLand; spl.forEach((s, i) => { const a = i / 6 * PI * 2 + .3; const vis = sa > 0 && sa < .32; s.visible = vis; if (vis) { s.position.set(mouth.x + Math.cos(a) * sa * .13, surfY + .6 * sa - 4.9 * sa * sa, mouth.z + Math.sin(a) * sa * .13); s.scale.setScalar(1 - sa / .35); } });
  };
  return g;
}

// ---------------------------------------------------------------- 8 SAYGI: pair of yellow leather slippers neatly placed at a doorstep
export function shoes() {
  const g = new THREE.Group();
  const lime = MAT.stone({ a: '#e2d4b8', b: '#b9a684', seed: 23 });
  const step = M(rbox(.38, .055, .14, .012), lime); step.position.set(0, .0275, -.15); g.add(step);
  const matTex = ctex('reedmat', 256, 256, (x, W, H) => { x.fillStyle = '#c6a46a'; x.fillRect(0, 0, W, H); for (let i = 0; i < H; i += 8) { x.fillStyle = (i / 8) % 2 ? '#b08c52' : '#d4b67c'; x.fillRect(0, i, W, 6); } for (let j = 0; j < W; j += 64) { x.fillStyle = '#7e3a2a'; x.fillRect(j + 28, 0, 6, H); } });
  const mat = M(rbox(.40, .01, .26, .004), new THREE.MeshStandardMaterial({ map: matTex, roughness: .95 })); mat.position.set(0, .005, .06); g.add(mat);
  const L = .25;
  const hw = u => { const heel = Math.sqrt(Math.max(0, 1 - Math.pow(1 - Math.min(u / .14, 1), 2))); const body = .036 + .011 * Math.sin(PI * Math.min(u / .8, 1) * .9); const toe = u > .76 ? Math.pow(Math.max(0, 1 - Math.pow((u - .76) / .24, 1.6)), .5) : 1; return Math.max(body * heel * toe, 1e-4); };
  const soleShape = new THREE.Shape(); const n = 40;
  for (let i = 0; i <= n; i++) { const u = i / n; const p = V2(hw(u), -(u - .5) * L); i ? soleShape.lineTo(p.x, p.y) : soleShape.moveTo(p.x, p.y); }
  for (let i = n; i >= 0; i--) { const u = i / n; soleShape.lineTo(-hw(u), -(u - .5) * L); }
  const soleGeo = new THREE.ExtrudeGeometry(soleShape, { depth: .012, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 2, curveSegments: 4 }); soleGeo.rotateX(-PI / 2);
  const ins = soleGeo.clone(); ins.scale(.9, .3, .95); ins.translate(0, .012, 0);
  const sole = .015;
  const hv = u => .05 * (1 - Math.pow(clamp((u - .44) / .56), 2.8)) + .012 * (1 - Math.pow(clamp((u - .44) / .56), 6));
  const vamp = surface((u0, v) => { const u = .44 + u0 * .56; const ph = v * PI; const w = hw(u) * 1.04 + .002; return [-Math.cos(ph) * w, sole + Math.pow(Math.sin(ph), .75) * hv(u), (u - .5) * L]; }, 26, 18, true);
  const counter = surface((s, v) => { // s: 0..1 around the back from right side u=.47 -> heel -> left side u=.47
    const side = s < .5 ? 1 : -1; const u = s < .5 ? .47 * (1 - s * 2) : .47 * ((s - .5) * 2); const w = hw(u) * 1.04 + .002; const hc = .036 + .022 * smoothstep(.25, .47, u);
    return [side * w, sole + v * hc, (u - .5) * L];
  }, 40, 4, true);
  const leather = new THREE.MeshPhysicalMaterial({ color: '#9a5a2c', roughness: .45, sheen: .5, sheenColor: new THREE.Color('#ffd8a8'), clearcoat: .45, clearcoatRoughness: .35 });
  const lining = new THREE.MeshStandardMaterial({ color: '#8e2a22', roughness: .8, side: THREE.BackSide });
  const soleMat = new THREE.MeshStandardMaterial({ color: '#3a2214', roughness: .7 }); const insMat = new THREE.MeshStandardMaterial({ color: '#d2a46c', roughness: .8 });
  const rim = tube([...Array(21)].map((_, i) => { const ph = i / 20 * PI; const u = .44; const w = hw(u) * 1.04 + .002; return V(-Math.cos(ph) * w, sole + Math.pow(Math.sin(ph), .75) * hv(u), (u - .5) * L); }), .0028, 24, 5);
  const rim2 = tube([...Array(31)].map((_, i) => { const s = i / 30; const side = s < .5 ? 1 : -1; const u = s < .5 ? .47 * (1 - s * 2) : .47 * ((s - .5) * 2); const w = hw(u) * 1.04 + .002; const hc = .036 + .022 * smoothstep(.25, .47, u); return V(side * w, sole + hc, (u - .5) * L); }), .0026, 40, 5);
  const mkShoe = () => { const s = new THREE.Group(); s.add(M(soleGeo, soleMat), M(ins, insMat), M(vamp, leather), M(vamp, lining, false), M(counter, leather), M(counter, lining, false), M(rim, soleMat), M(rim2, soleMat)); return s; };
  const ang = .78; for (const sx of [-1, 1]) { const s = mkShoe(); s.rotation.y = ang + sx * .02; s.position.set(sx * .064 * Math.cos(ang) + .0, .01, .07 - sx * .064 * Math.sin(ang)); g.add(s); }
  g.userData.h = .1; g.userData.w = .3;
  g.userData.anim = () => {};
  return g;
}

// ---------------------------------------------------------------- 9 AFFEDİCİLİK: sheathed sword laid on a rest + olive branch
export function swordOlive() {
  const g = new THREE.Group(); const R = rng(91);
  const brass = MAT.gold({ a: '#b8904a', b: '#6e5226' }); brass.roughness = 1; brass.clearcoat = 0; const leather = MAT.leather({ a: '#2a1a12', b: '#140b06', seed: 33 }); leather.sheen = .08; leather.roughness = .8;
  const wood = MAT.wood({ a: '#7a4c2a', b: '#4a2a14', rings: 10, seed: 93 });
  const sw = new THREE.Group();
  const sc = latheGeo([[0, 0], [.009, .004], [.014, .02], [.017, .07], [.021, .3], [.024, .5]], 24); sc.scale(1, 1, .42); sw.add(M(sc, leather));
  const band = (y0, y1, r) => { const b = latheGeo([[r, y0], [r + .003, y0 + .003], [r + .003, y1 - .003], [r, y1]], 24); b.scale(1, 1, .45); return M(b, brass); };
  sw.add(band(.0, .07, .016), band(.26, .285, .022), band(.455, .5, .024));
  sw.add(M(latheGeo([[0, -.001], [.01, .001], [.016, .02], [.016, .07]], 20).scale(1.05, 1, .47), brass));
  const guard = M(merge([rbox(.12, .016, .032, .006).translate(0, .508, 0), new THREE.SphereGeometry(.011, 12, 8).translate(-.062, .508, 0), new THREE.SphereGeometry(.011, 12, 8).translate(.062, .508, 0)]), brass); sw.add(guard);
  const gripTex = ctex('grip', 64, 128, (x, W, H) => { x.fillStyle = '#3a2214'; x.fillRect(0, 0, W, H); x.strokeStyle = '#5e3a20'; x.lineWidth = 7; for (let i = -H; i < H * 2; i += 16) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i + 24); x.stroke(); } });
  sw.add(M(latheGeo([[0, .515], [.0125, .516], [.0135, .565], [.0125, .615], [0, .616]], 16), new THREE.MeshStandardMaterial({ map: gripTex, roughness: .7 })));
  const pom = M(new THREE.SphereGeometry(.019, 16, 12), brass); pom.position.y = .632; pom.scale.set(1, .85, .8); sw.add(pom);
  sw.rotation.z = -PI / 2; sw.position.set(-.31, .118, 0);
  const swG = new THREE.Group(); swG.add(sw); swG.rotation.x = -.35; g.add(swG);
  for (const x of [-.17, .15]) { const rest = M(merge([rbox(.035, .1, .07, .008).translate(0, .05, 0), rbox(.05, .012, .09, .004).translate(0, .006, 0)]), wood); rest.position.set(x, 0, 0); g.add(rest); const cr = M(new THREE.TorusGeometry(.024, .006, 8, 16, PI), wood); cr.rotation.set(0, PI / 2, PI); cr.position.set(x, .116, 0); g.add(cr); }
  // olive branch
  const ol = new THREE.Group(); ol.position.set(.0, .135, .015); ol.rotation.set(-.3, .5, -.12); g.add(ol);
  const twigPts = [V(-.17, -.02, -.01), V(-.08, .0, 0), V(.02, .004, .01), V(.12, -.01, .02), V(.2, -.04, .03)];
  const tw = new THREE.CatmullRomCurve3(twigPts);
  const bark = new THREE.MeshStandardMaterial({ color: '#7a6a52', roughness: .9 });
  const tg = [tube(tw, u => .0045 * (1 - .65 * u) + .001, 24, 6)];
  const leafG = []; const leafShape = (len, wid) => surface((u, v) => { const uu = u * 2 - 1; const w = wid * Math.pow(Math.sin(PI * Math.min(v * 1.05, 1)), .8); return [uu * w, v * len, Math.abs(uu) * w * .35 - Math.sin(v * PI) * .004]; }, 4, 10);
  for (let k = 0; k < 18; k++) { const u = .12 + k / 18 * .86; const p = tw.getPointAt(u), t = tw.getTangentAt(u); const side = k % 2 ? 1 : -1; const len = .05 + R() * .02;
    const lg = leafShape(len, .0095); const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), t.clone().applyAxisAngle(V(0, 1, 0), side * (.65 + R() * .3)).add(V(0, .25 + R() * .3, 0)).normalize());
    const qr = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0).applyQuaternion(q), (R() - .5) * 1.4 + PI / 2); lg.applyMatrix4(new THREE.Matrix4().compose(p, qr.multiply(q), V(1, 1, 1))); leafG.push(lg); }
  ol.add(M(merge(tg), bark));
  const lgm = merge(leafG);
  ol.add(M(lgm, new THREE.MeshPhysicalMaterial({ color: '#5d6e3a', roughness: .55, clearcoat: .3, side: THREE.FrontSide })), M(lgm, new THREE.MeshStandardMaterial({ color: '#a9b28e', roughness: .7, side: THREE.BackSide })));
  const oliveMat = new THREE.MeshPhysicalMaterial({ color: '#3a2236', roughness: .3, clearcoat: .8 }); const oliveG = new THREE.MeshPhysicalMaterial({ color: '#7c8a36', roughness: .35, clearcoat: .6 });
  [[.3, -1], [.33, 1], [.62, -1], [.78, 1]].forEach(([u, s], i) => { const p = tw.getPointAt(u); const o = M(new THREE.SphereGeometry(.0105, 14, 10), i % 2 ? oliveG : oliveMat); o.scale.set(1, 1.35, 1); o.position.copy(p).add(V(s * .006, -.012, .012 * s)); ol.add(o); });
  g.userData.h = .2; g.userData.w = .66;
  g.userData.anim = (tau, t) => { ol.rotation.z = -.12 + Math.sin(t * 2.3) * .015 + (tau > 0 ? Math.exp(-3 * tau) * Math.sin(tau * 9) * .05 : 0); };
  return g;
}

// ---------------------------------------------------------------- 10 NEZAKET: a single red rose in an Iznik-style bud vase
export function rose() {
  const g = new THREE.Group();
  const vaseTex = ctex('vase', 256, 256, (x, W, H) => { x.fillStyle = '#f1ece0'; x.fillRect(0, 0, W, H); const band = (y, h, c) => { x.fillStyle = c; x.fillRect(0, y, W, h); }; band(18, 14, '#25509a'); band(36, 5, '#2c9a96'); band(214, 10, '#25509a'); band(205, 4, '#2c9a96');
    for (let i = 0; i < 8; i++) { const cx = i * 32 + 16; x.fillStyle = '#25509a'; x.beginPath(); x.ellipse(cx, 120, 9, 26, 0, 0, PI * 2); x.fill(); x.fillStyle = '#b5362c'; x.beginPath(); x.arc(cx, 98, 6, 0, PI * 2); x.fill(); x.strokeStyle = '#2c9a96'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, 146); x.lineTo(cx, 190); x.stroke(); } });
  vaseTex.wrapS = THREE.RepeatWrapping; vaseTex.repeat.set(1, 1);
  const vase = M(latheGeo([[0, 0], [.036, 0], [.042, .01], [.046, .045], [.04, .095], [.023, .15], [.015, .19], [.016, .205], [.022, .222], [.02, .226], [.012, .214]], 36), new THREE.MeshPhysicalMaterial({ map: vaseTex, roughness: .25, clearcoat: 1, clearcoatRoughness: .15 }));
  g.add(vase);
  const stemMat = new THREE.MeshPhysicalMaterial({ color: '#3b6a2a', roughness: .55, clearcoat: .2 });
  const stemC = new THREE.CatmullRomCurve3([V(0, .17, 0), V(.004, .25, 0), V(-.006, .32, .004), V(.0, .39, .0), V(.006, .435, .0)]);
  g.add(M(tube(stemC, u => .0048 * (1 - .25 * u), 24, 6), stemMat));
  for (const u of [.42, .55, .7, .82]) { const p = stemC.getPointAt(u); const th = M(new THREE.ConeGeometry(.0025, .009, 6), new THREE.MeshStandardMaterial({ color: '#6b3a26' })); th.position.copy(p); th.rotation.z = (u * 10 % 2 > 1 ? 1 : -1) * 1.3; th.position.x += Math.sign(th.rotation.z) * -.004; g.add(th); }
  const leafMat = new THREE.MeshPhysicalMaterial({ color: '#2f5f2a', roughness: .45, clearcoat: .4, side: THREE.DoubleSide });
  const leaflet = (len, wid) => surface((u, v) => { const uu = u * 2 - 1; const serr = 1 + .08 * Math.sin(v * 40); const w = wid * Math.pow(Math.sin(PI * Math.min(v * 1.04, 1)), .7) * serr; return [uu * w, v * len, Math.abs(uu) * w * .3 - Math.sin(v * PI) * .003]; }, 4, 12);
  [[.4, 1, .9], [.62, -1, .75]].forEach(([u, s, sc]) => { const p = stemC.getPointAt(u); const lg = new THREE.Group(); lg.position.copy(p); lg.rotation.set(.2, s > 0 ? .3 : PI + .3, -s * 1.05); g.add(lg);
    lg.add(M(tube([V(0, 0, 0), V(0, .02, 0), V(0, .045, .003)], .0018, 6, 4), stemMat));
    [[0, .045, 0, 1.0], [-.004, .024, .9, .75], [.004, .024, -.9, .75]].forEach(([x, y, rz, f]) => { const l = M(leaflet(.038 * f * sc, .014 * f * sc), leafMat); l.position.set(x, y, .002); l.rotation.z = rz; lg.add(l); }); });
  const head = roseHead({ size: 1.45, seed: 5 }); head.position.set(.006, .445, 0); head.rotation.set(.18, 0, -.08); g.add(head);
  g.userData.h = .52; g.userData.w = .16;
  g.userData.anim = tau => { const p = tau > 0 ? 1 - Math.exp(-3 * tau) : 0; head.rotation.x = .18 - .08 * p; head.userData.outer.scale.setScalar(1 + .06 * p); };
  return g;
}

// ---------------------------------------------------------------- 11 KANAATKÂRLIK: a few dates and a cup of water on a glazed plate
export function dates() {
  const g = new THREE.Group(); const R = rng(111);
  const plateTex = ctex('plate', 64, 256, (x, W, H) => { x.fillStyle = '#efe0bd'; x.fillRect(0, 0, W, H); const band = (v0, v1, c) => { x.fillStyle = c; x.fillRect(0, (1 - v1) * H, W, (v1 - v0) * H); }; band(0, .46, '#a8653a'); band(.46, .64, '#7a4426'); band(.64, .82, '#2f7a5a'); band(.82, .84, '#7a4426'); band(.93, .945, '#2f7a5a'); });
  const plate = M(latheGeo([[0, 0], [.1, 0], [.118, .004], [.138, .018], [.15, .028], [.147, .032], [.133, .025], [.108, .014], [0, .013]], 48), new THREE.MeshPhysicalMaterial({ map: plateTex, roughness: .3, clearcoat: .8, clearcoatRoughness: .2 }));
  g.add(plate);
  const lt = TEX.leather({ a: '#9a4a1a', b: '#5a220c', seed: 29 });
  const dateMat = new THREE.MeshPhysicalMaterial({ map: lt.map, normalMap: lt.normalMap, normalScale: V2(1.6, 1.6), roughness: .38, clearcoat: .7, clearcoatRoughness: .3, color: '#ffffff', sheen: .6, sheenColor: new THREE.Color('#ffb070') });
  const dGeo = latheGeo([...Array(13)].map((_, k) => { const t = k / 12 * 2 - 1; return [.0155 * Math.sqrt(Math.max(0, 1 - t * t)) * (1 + .06 * Math.sin(t * 3)), (t * .5 + .5) * .05]; }), 20);
  [[-.06, .02, .3, 0], [-.035, .055, -.5, 0], [-.07, -.03, 1.4, 0], [-.02, -.01, .9, 0], [-.045, .01, -.2, .022], [.01, .065, .2, 0]].forEach(([x, z, ry, y]) => { const d = M(dGeo, dateMat); d.rotation.set(0, ry, PI / 2 + (R() - .5) * .2); d.position.set(x, .028 + y, z); g.add(d); });
  const clay = MAT.clay({ a: '#c4784a', b: '#9a5432', seed: 37 });
  const cup = M(latheGeo([[0, 0], [.03, 0], [.033, .005], [.038, .05], [.041, .062], [.0375, .064], [.034, .052], [.031, .012], [0, .011]], 32), clay); cup.position.set(.062, .013, -.02); g.add(cup);
  const ws = waterSurface({ color: '#3a6b70', opacity: .85, amb: .0002 });
  const w = M(new THREE.CircleGeometry(.0345, 28).rotateX(-PI / 2), ws, false, false); w.position.set(.062, .013 + .045, -.02); g.add(w);
  g.userData.h = .08; g.userData.w = .3;
  g.userData.anim = (tau, t) => { ws.userData.u.uT.value = t; };
  return g;
}

// ---------------------------------------------------------------- 13 DİĞERKÂMLIK: round loaf broken in two, the larger half offered forward
export function bread() {
  const g = new THREE.Group(); const R = rng(131);
  const crustTex = ctex('crust', 256, 256, (x, W, H) => { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#9a5422'); gr.addColorStop(.45, '#b46e30'); gr.addColorStop(.75, '#c98a44'); gr.addColorStop(1, '#b07a44'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { const y = R() * H * .7; x.fillStyle = `rgba(110,50,15,${R() * .25})`; x.beginPath(); x.ellipse(R() * W, y, 3 + R() * 10, 2 + R() * 6, R() * 3, 0, PI * 2); x.fill(); }
    for (let i = 0; i < 160; i++) { const y = R() * H * .45; x.fillStyle = R() < .7 ? '#f3e2b8' : '#2a1d14'; x.beginPath(); x.ellipse(R() * W, y, 1.6, 3.2, R() * 3, 0, PI * 2); x.fill(); }
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,245,225,.25)'; x.beginPath(); x.arc(R() * W, R() * H * .5, 4 + R() * 8, 0, PI * 2); x.fill(); } });
  const crumbTex = ctex('crumb', 256, 128, (x, W, H) => { x.fillStyle = '#e2c594'; x.fillRect(0, 0, W, H); for (let i = 0; i < 420; i++) { x.fillStyle = `rgba(${170 + R() * 40 | 0},${130 + R() * 30 | 0},${80 + R() * 20 | 0},${.3 + R() * .5})`; x.beginPath(); x.ellipse(R() * W, R() * H, 1 + R() * 4, 1 + R() * 3, R() * 3, 0, PI * 2); x.fill(); } });
  const crustMat = new THREE.MeshPhysicalMaterial({ map: crustTex, roughness: .7, sheen: .5, sheenColor: new THREE.Color('#ffd9a0') });
  const crumbMat = new THREE.MeshStandardMaterial({ map: crumbTex, roughness: .95 });
  const prof = [[0, .066], [.04, .065], [.075, .058], [.1, .044], [.113, .026], [.112, .01], [.104, .001], [0, 0]];
  const topAt = r => { for (let i = 1; i < prof.length - 1; i++) if (prof[i][0] >= r) { const [r0, y0] = prof[i - 1], [r1, y1] = prof[i]; return y0 + (y1 - y0) * (r - r0) / (r1 - r0); } return 0; };
  const half = (seed) => { const hg = new THREE.Group(); const Rh = rng(seed);
    hg.add(M(latheGeo(prof.slice().reverse(), 28, 0, PI), crustMat));
    const face = surface((u, v) => { const z = (u * 2 - 1) * .109; const top = Math.max(topAt(Math.abs(z)), .0); const y = v * top; const edge = Math.min(u, 1 - u, v, 1 - v); const n = (Math.sin(z * 180 + seed) * Math.sin(y * 210 + seed * 2) * .5 + .5) * .012 + .006; return [-n * smoothstep(0, .12, edge), y, z]; }, 22, 8, true);
    hg.add(M(face, crumbMat)); return hg; };
  const board = M(latheGeo([[0, 0], [.17, 0], [.178, .006], [.176, .018], [.168, .022], [0, .022]], 40), MAT.wood({ a: '#9a6a3c', b: '#6a4220', rings: 20, seed: 133, clearcoat: .2 })); g.add(board);
  const bg = new THREE.Group(); bg.rotation.y = PI / 2 + .25; g.add(bg); // break line runs left-right: back half shows its crumb to the viewer
  const A = half(3); A.rotation.y = PI; A.position.set(-.012, .022, 0); bg.add(A);
  const B = half(7); B.position.set(.012, .022, 0); bg.add(B);
  const crumbs = []; for (let i = 0; i < 9; i++) { const c = M(new THREE.IcosahedronGeometry(.004 + R() * .004, 0), i % 3 ? crumbMat : crustMat); c.position.set((R() - .5) * .03, .025, (R() - .5) * .12); c.rotation.set(R() * 3, R() * 3, R() * 3); bg.add(c); crumbs.push([c, c.position.clone(), R()]); }
  g.userData.h = .09; g.userData.w = .36;
  g.userData.anim = (tau) => { const p = tau > 0 ? 1 - Math.pow(1 - clamp(tau / .55), 3) : 0; A.position.set(-.012 - .05 * p, .022, -.012 * p); A.rotation.y = PI + .25 * p; B.position.x = .012 + .004 * p;
    crumbs.forEach(([c, p0, r]) => { const s = tau - .05 * r; const hop = s > 0 && s < .35 ? Math.sin(s / .35 * PI) * .012 * (1 - r * .5) : 0; c.position.set(p0.x + (p0.x > 0 ? .02 : -.004) * p, p0.y + hop, p0.z + .01 * p); }); };
  return g;
}

// ---------------------------------------------------------------- 14 YARDIMSEVERLİK: clay jug on a pouring cradle, water stream into a bowl
export function jugPour() {
  const root = new THREE.Group(); const g = new THREE.Group(); g.position.x = -.017; g.scale.setScalar(.87); root.add(g); // scaled + centred so the base board sits fully on the felt pad
  const wood = MAT.wood({ a: '#8a5a32', b: '#5a3418', rings: 12, seed: 141, clearcoat: .2 });
  const clay = MAT.clay({ a: '#c97a48', b: '#97502e', seed: 43 }); const clay2 = MAT.clay({ a: '#b8693e', b: '#82442a', seed: 47 });
  g.add(M(rbox(.5, .024, .2, .008).translate(.02, .012, 0), wood));
  const jug = new THREE.Group();
  jug.add(M(latheGeo([[0, 0], [.05, 0], [.068, .012], [.086, .05], [.09, .095], [.082, .135], [.06, .168], [.036, .19], [.03, .215], [.036, .238], [.042, .246], [.038, .248], [.03, .236]], 36), clay));
  jug.add(M(tube([V(.028, .222, 0), V(.07, .225, 0), V(.098, .19, 0), V(.092, .14, 0), V(.08, .115, 0)], .0075, 20, 8), clay));
  const glaze = M(new THREE.TorusGeometry(.0875, .004, 8, 40), new THREE.MeshPhysicalMaterial({ color: '#2c6f6a', roughness: .3, clearcoat: .8 })); glaze.rotation.x = PI / 2; glaze.position.y = .1; jug.add(glaze);
  const tilt = 1.98; // radians; mouth points down-right
  jug.rotation.z = -tilt; jug.position.set(-.13, .3, 0); g.add(jug);
  jug.updateMatrixWorld(true);
  const mouth = V(0, .246, 0).applyMatrix4(jug.matrix); const axis = V(0, 1, 0).applyQuaternion(jug.quaternion);
  // cradle: two posts with rings around belly and neck
  const ringAt = (ly, r) => { const c = V(0, ly, 0).applyMatrix4(jug.matrix); const ring = M(new THREE.TorusGeometry(r, .0065, 8, 28), wood); ring.quaternion.setFromUnitVectors(V(0, 0, 1), axis); ring.position.copy(c); g.add(ring); return c.clone().add(V(-axis.y, axis.x, 0).multiplyScalar(-r)); };
  const b1 = ringAt(.085, .093), b2 = ringAt(.19, .04);
  for (const b of [b1, b2]) { const h = b.y - .024; g.add(M(rbox(.026, h, .044, .007).translate(b.x, .024 + h / 2 - .004, 0), wood)); }
  // bowl
  const bowlX = mouth.x + .045, bowl = M(latheGeo([[0, 0], [.05, 0], [.075, .012], [.096, .04], [.106, .07], [.101, .073], [.09, .046], [.07, .022], [0, .018]], 40), clay2); bowl.position.set(bowlX, .024, 0); g.add(bowl);
  const ws = waterSurface({ color: '#2e6468', opacity: .85, amb: .0003 });
  const wsurf = M(new THREE.CircleGeometry(.093, 36).rotateX(-PI / 2), ws, false, false); wsurf.position.set(bowlX, .024 + .058, 0); g.add(wsurf);
  // stream
  const p0 = mouth.clone().add(V(.004, -.03, 0)); const v0 = axis.clone().multiplyScalar(.32); const yEnd = .024 + .058; const pts = [];
  let sEnd = 0; for (let s = 0; s < 1; s += .002) { if (p0.y + v0.y * s - 4.905 * s * s <= yEnd) { sEnd = s; break; } }
  for (let i = 0; i <= 16; i++) { const s = sEnd * i / 16; pts.push(V(p0.x + v0.x * s, p0.y + v0.y * s - 4.905 * s * s, 0)); }
  const sm = streamMat(); const stream = M(tube(pts, u => .0085 - .0035 * u, 24, 10), sm, false, false); stream.renderOrder = 6; stream.userData.depthOk = true; g.add(stream);
  const land = pts[pts.length - 1];
  const foam = new THREE.Mesh(new THREE.RingGeometry(.006, .03, 32).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ map: TEX.softDot(64, .3), color: '#fff6e8', transparent: true, opacity: .4, depthWrite: false })); foam.position.set(land.x, yEnd + .001, 0); g.add(foam);
  const dropMat = fakeGlass({ color: '#bfe6ea', opacity: .4, rim: .8, gain: 1 });
  const spl = [...Array(7)].map(() => { const s = M(new THREE.SphereGeometry(.0026, 8, 6), dropMat, false, false); s.renderOrder = 7; g.add(s); return s; });
  g.userData.h = .3; g.userData.w = .5;
  g.userData.anim = (tau, t, lit) => {
    sm.userData.u.time.value = t; sm.userData.u.lit.value = lit; ws.userData.u.uT.value = t;
    const ph = t / .32; for (let k = 0; k < 3; k++) { const kk = Math.floor(ph) - k; ws.userData.u.uImp.value[k].set(land.x - bowlX, 0, kk * .32, .0009); }
    foam.scale.setScalar(1 + .15 * Math.sin(t * 13)); foam.material.opacity = .25 + .2 * lit;
    spl.forEach((s, i) => { const per = .42, sa = ((t + i * .061) % per); const a = i * 2.4; s.position.set(land.x + Math.cos(a) * sa * .1, yEnd + .5 * sa - 4.9 * sa * sa, Math.sin(a) * sa * .1); s.visible = s.position.y > yEnd; s.scale.setScalar(1 - sa / per * .6); });
  };
  root.userData = g.userData;
  return root;
}

// ---------------------------------------------------------------- generic far-gallery exhibits (for instancing)
export function genericGeos() {
  return [
    latheGeo([[0, 0], [.05, 0], [.07, .04], [.072, .1], [.05, .16], [.03, .2], [.034, .24], [.045, .26], [0, .26]], 14), // vase
    merge([latheGeo([[0, 0], [.06, 0], [.1, .03], [.11, .06], [0, .06]], 14), new THREE.SphereGeometry(.035, 8, 6).translate(-.03, .07, 0), new THREE.SphereGeometry(.033, 8, 6).translate(.03, .07, .01), new THREE.SphereGeometry(.03, 8, 6).translate(0, .1, -.01)]), // bowl of fruit
    merge([rbox(.2, .04, .15, .01).translate(0, .02, 0), rbox(.18, .035, .14, .01).translate(.01, .058, 0), rbox(.17, .03, .13, .01).translate(-.005, .09, 0)]), // books
    latheGeo([[0, 0], [.06, 0], [.08, .05], [.075, .12], [.045, .16], [.05, .18], [.025, .2], [.012, .22], [0, .225]], 14), // lidded jar
    latheGeo([[0, 0], [.045, 0], [.05, .012], [.04, .03], [.07, .07], [.075, .11], [.055, .15], [.028, .18], [.024, .23], [.034, .25], [.03, .26], [.012, .28], [.006, .3], [0, .305]], 14), // ewer (ibrik)
  ];
}

// ---------------------------------------------------------------- 12 HOŞGÖRÜ: a broad plane tree (çınar) in the sunlit courtyard garden
// Leaf cards (alpha-tested, instanced) with canopy-shaped normals (soft volumetric shading) and sun-through-leaf translucency.
function leafTex() {
  return ctex('planeLeaves', 256, 256, (x, W, H) => {
    x.clearRect(0, 0, W, H); const R = rng(212);
    const leaf = (cx, cy, L, rot, c1, c2) => {
      x.save(); x.translate(cx, cy); x.rotate(rot); x.beginPath();
      for (let i = 0; i <= 60; i++) { const th = -PI / 2 + (i / 60 - .5) * PI * 1.62; const lob = Math.pow(Math.max(0, Math.cos(2.5 * (th + PI / 2))), 2.2); const r = L * (.42 + .58 * lob) * (1 - .25 * Math.abs(i / 60 - .5)); const px = Math.cos(th) * r, py = Math.sin(th) * r; i ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.lineTo(0, L * .12); x.closePath(); const gr = x.createLinearGradient(0, -L, 0, L * .2); gr.addColorStop(0, c1); gr.addColorStop(1, c2); x.fillStyle = gr; x.fill();
      x.strokeStyle = 'rgba(40,60,20,.45)'; x.lineWidth = 1.4; for (const a of [-1.15, -.55, 0, .55, 1.15]) { x.beginPath(); x.moveTo(0, L * .08); x.lineTo(Math.sin(a) * L * .78, -Math.cos(a) * L * .78); x.stroke(); }
      x.strokeStyle = 'rgba(70,90,30,.9)'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(0, L * .1); x.lineTo(0, L * .45); x.stroke(); x.restore(); };
    const cols = [['#9cc24a', '#5f8a2a'], ['#86b03e', '#4e7a24'], ['#a9c95a', '#6a9030'], ['#7aa236', '#46701e'], ['#b4cf66', '#78993a']];
    for (let k = 0; k < 9; k++) { const c = cols[k % cols.length]; leaf(40 + R() * 176, 46 + R() * 170, 34 + R() * 20, (R() - .5) * 2.6, c[0], c[1]); }
  });
}
function barkTex() {
  return ctex('planeBark', 256, 512, (x, W, H) => { const R = rng(77); x.fillStyle = '#8f8a6a'; x.fillRect(0, 0, W, H);
    const blob = (cx, cy, r, c) => { x.fillStyle = c; x.beginPath(); for (let i = 0; i <= 14; i++) { const a = i / 14 * PI * 2, rr = r * (.7 + R() * .5); x.lineTo(cx + Math.cos(a) * rr * 1.3, cy + Math.sin(a) * rr * .8); } x.closePath(); x.fill(); };
    for (let i = 0; i < 140; i++) blob(R() * W, R() * H, 8 + R() * 26, ['#c9c39c', '#b0aa82', '#6f6c50', '#a29a72', '#d8d2b0', '#7d7a5c'][i % 6]);
    for (let i = 0; i < 40; i++) { x.strokeStyle = 'rgba(60,55,40,.35)'; x.lineWidth = 1 + R() * 1.5; x.beginPath(); const yy = R() * H; x.moveTo(0, yy); x.bezierCurveTo(W * .3, yy + (R() - .5) * 20, W * .7, yy + (R() - .5) * 20, W, yy); x.stroke(); }
  }, [1, 1]);
}
export function shadeTree(o = {}) {
  const g = new THREE.Group(); const R = rng(o.seed ?? 5); const sunDir = (o.sunDir ?? V(-.25, .62, -.74)).clone().normalize();
  const bark = new THREE.MeshStandardMaterial({ map: barkTex(), roughness: .85, color: '#e8e2cc' });
  const wood = [];
  const trunk = new THREE.CatmullRomCurve3([V(0, -.1, 0), V(.04, .9, .02), V(-.05, 1.8, .04), V(.02, 2.5, 0)]);
  wood.push(tube(trunk, u => .25 + .16 * Math.exp(-u * 10), 20, 18));
  for (let k = 0; k < 5; k++) { const a = k * 1.27 + .4, d = V(Math.cos(a), 0, Math.sin(a)); wood.push(tube([V(0, .45, 0).addScaledVector(d, .12), V(0, .18, 0).addScaledVector(d, .34), V(0, -.04, 0).addScaledVector(d, .62)], u => .13 * (1 - .75 * u) + .015, 8, 8)); }
  const clusters = []; const canopyC = V(0, 3.9, 0); const UPK = o.up ?? .72;
  const limbs = [[.3, 1.3, UPK], [2.0, 1.2, UPK * .95], [3.4, 1.35, UPK * 1.05], [4.9, 1.25, UPK * .9]];
  limbs.forEach(([a, len, up], li) => {
    const d = V(Math.cos(a), 0, Math.sin(a)); const p0 = V(0, 2.1 + li * .1, 0), p1 = p0.clone().addScaledVector(d, .55 * len).add(V(0, .8 * up, 0)), p2 = p0.clone().addScaledVector(d, 1.5 * len).add(V(0, 1.7 * up, 0)), p3 = p0.clone().addScaledVector(d, 2.3 * len).add(V(0, 2.2 * up, 0));
    wood.push(tube([p0, p1, p2, p3], u => .16 * (1 - .7 * u) + .02, 14, 9));
    clusters.push([p3, 1.15]);
    for (let s = 0; s < 3; s++) { const b0 = new THREE.CatmullRomCurve3([p0, p1, p2, p3]).getPointAt(.35 + s * .2); const da = a + (s - 1) * .9 + (R() - .5) * .3; const dd = V(Math.cos(da), 0, Math.sin(da));
      const e = b0.clone().addScaledVector(dd, 1.0 + R() * .5).add(V(0, .8 + R() * .6, 0)); wood.push(tube([b0, b0.clone().lerp(e, .5).add(V(0, .25, 0)), e], u => .06 * (1 - .6 * u) + .012, 8, 6)); clusters.push([e, .85 + R() * .3]); }
  });
  [[0, 5.3, 0, 1.4], [.9, 4.8, .8, 1.15], [-1.0, 4.9, -.6, 1.15], [-.6, 4.5, 1.1, 1.05], [1.1, 4.6, -1.0, 1.05], [0, 4.1, 0, 1.35], [1.7, 3.4, 1.2, .95], [-1.5, 3.3, 1.4, .95], [.3, 3.1, 2.0, .9], [2.2, 3.5, -.5, .9]].forEach(([x, y, z, r]) => clusters.push([V(x, y, z), r]));
  g.add(M(merge(wood), bark));
  // leaf cards
  const per = o.cards ?? 170; const n = clusters.length * per; const card = new THREE.PlaneGeometry(.56, .56);
  const im = new THREE.InstancedMesh(card, null, n); const aN = new Float32Array(n * 3); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color(); let k = 0;
  im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  clusters.forEach(([c, r]) => { for (let i = 0; i < per; i++) {
    const dir = V(R() - .5, R() - .5, R() - .5).normalize(); const rr = r * Math.pow(R(), .45); const p = c.clone().addScaledVector(dir, rr).multiply(V(1, .78, 1)).add(V(0, c.y * .22, 0));
    if (p.y < 2.2) p.y = 2.2 + R() * .25;
    e.set(R() * PI, R() * PI, R() * PI); q.setFromEuler(e); m4.compose(p, q, V(1, 1, 1).multiplyScalar(.8 + R() * .5)); im.setMatrixAt(k, m4);
    const nl = p.clone().sub(c).normalize().multiplyScalar(.55).add(p.clone().sub(canopyC).normalize().multiplyScalar(.45)).normalize(); aN.set([nl.x, nl.y, nl.z], k * 3);
    const v = .78 + R() * .34; col.setRGB(v * (.92 + R() * .12), v, v * (.85 + R() * .2)); im.setColorAt(k, col); k++; } });
  card.setAttribute('aN', new THREE.InstancedBufferAttribute(aN, 3));
  const U = { uSun: { value: sunDir }, uSunCol: { value: new THREE.Color(o.sunCol ?? '#ffd89a') }, uTrans: { value: o.trans ?? 1.3 } };
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex(), alphaTest: .42, side: THREE.DoubleSide, roughness: .62, color: '#ffffff' });
  leafMat.onBeforeCompile = s => { Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aN; varying float vOut;')
      .replace('#include <defaultnormal_vertex>', 'vec3 transformedNormal = normalMatrix * aN; vOut = aN.y * .5 + .5;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uSun, uSunCol; uniform float uTrans; varying float vOut;')
      .replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0; vec3 normal = normalize( vNormal ); vec3 nonPerturbedNormal = normal;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        { vec3 sv = normalize((viewMatrix * vec4(uSun, 0.)).xyz); float back = pow(clamp(dot(sv, -normalize(vViewPosition)) * .5 + .5, 0., 1.), 2.5);
          float facing = clamp(dot(normal, sv) * .5 + .5, 0., 1.);
          reflectedLight.directDiffuse += diffuseColor.rgb * vec3(1., .95, .55) * uSunCol * uTrans * (.3 + .7 * back) * (.45 + .55 * facing) * (.5 + .5 * vOut); }`);
  };
  leafMat.customProgramCacheKey = () => 'E_planeLeaf';
  im.material = leafMat; im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); g.add(im);
  g.userData.leafU = U; g.userData.leaves = im;
  return g;
}
// Courtyard garden seen through the HOŞGÖRÜ door: grass, flagstone path, clay pots with geraniums, garden wall with cypresses.
export function garden(o = {}) {
  const g = new THREE.Group(); const R = rng(o.seed ?? 9);
  const grass = ctex('grass2', 512, 512, (x, W, H) => { x.fillStyle = '#6d8a36'; x.fillRect(0, 0, W, H); const Rr = rng(3);
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(${90 + Rr() * 40 | 0},${110 + Rr() * 40 | 0},${40 + Rr() * 20 | 0},.35)`; x.beginPath(); x.arc(Rr() * W, Rr() * H, 20 + Rr() * 60, 0, PI * 2); x.fill(); }
    for (let i = 0; i < 9000; i++) { const px = Rr() * W, py = Rr() * H, l = 4 + Rr() * 9; x.strokeStyle = ['#7f9c3e', '#5b7a2a', '#93ad4c', '#4f6c24', '#a3b85a'][i % 5]; x.globalAlpha = .55 + Rr() * .45; x.lineWidth = 1 + Rr(); x.beginPath(); x.moveTo(px, py); x.lineTo(px + (Rr() - .5) * 4, py - l); x.stroke(); }
    x.globalAlpha = 1; }, [10, 10]);
  const ground = M(new THREE.PlaneGeometry(28, 26).rotateX(-PI / 2), new THREE.MeshStandardMaterial({ map: grass, roughness: .95, color: '#d6dcc2' }), false, true); ground.position.set(0, .004, -14.2); g.add(ground);
  // flagstone path from the threshold toward the tree
  const flag = new THREE.MeshStandardMaterial({ color: '#d9cdb2', roughness: .85 }); const fl = [];
  for (let z = -1.25, i = 0; z > -10; i++) { const w = .5 + R() * .18, d = .36 + R() * .14; for (const sx of [-1, 1]) { const ww = w * (.85 + R() * .2); fl.push(rbox(ww, .04, d, .02, 1).rotateY((R() - .5) * .16).translate(sx * (ww / 2 + .02) + (R() - .5) * .05, .02, z - d / 2)); } z -= d + .06; }
  g.add(M(merge(fl), flag, false, true));
  const clay = MAT.clay({ a: '#c97a48', b: '#97502e', seed: 51 }); const leafM = new THREE.MeshStandardMaterial({ color: '#4c7a2c', roughness: .8 }); const red = new THREE.MeshStandardMaterial({ color: '#e0332e', roughness: .55 });
  const pot = (x, z, s) => { const p = new THREE.Group(); p.add(M(latheGeo([[0, 0], [.11, 0], [.14, .2], [.165, .23], [.15, .245], [.13, .23], [0, .22]], 24), clay));
    const lg = [], fg = []; for (let i = 0; i < 26; i++) { const a = R() * PI * 2, r = R() * .15; lg.push(new THREE.SphereGeometry(.05 + R() * .03, 8, 6).scale(1, .6, 1).translate(Math.cos(a) * r, .26 + R() * .1, Math.sin(a) * r)); }
    for (let i = 0; i < 9; i++) { const a = R() * PI * 2, r = R() * .12; fg.push(new THREE.SphereGeometry(.035 + R() * .015, 8, 6).translate(Math.cos(a) * r, .35 + R() * .08, Math.sin(a) * r)); }
    p.add(M(merge(lg), leafM), M(merge(fg), red)); p.position.set(x, 0, z); p.scale.setScalar(s); g.add(p); };
  (o.pots ?? [[.85, -2.9, 1], [-.75, -4.6, .9], [1.05, -6.4, 1.1]]).forEach(([x, z, s]) => pot(x, z, s));
  // garden wall + coping + cypresses behind it
  const plaster = MAT.plaster({ a: '#ecdcbc', b: '#cdb48a', seed: 61, repeat: [6, 1] });
  const wall = M(rbox(30, 2.6, .5, .04, 1), plaster, true, true); wall.position.set(0, 1.3, -18.5); g.add(wall);
  const cop = M(rbox(30.4, .12, .7, .03, 1), new THREE.MeshStandardMaterial({ color: '#b5603a', roughness: .7 }), true, true); cop.position.set(0, 2.66, -18.5); g.add(cop);
  const cypG = new THREE.SphereGeometry(1, 12, 10).scale(.55, 2.4, .55).translate(0, 2.4, 0); const cypM = new THREE.MeshStandardMaterial({ color: '#3d5a2a', roughness: .9 });
  for (let i = 0; i < 9; i++) { const c = M(cypG, cypM, true, true); c.position.set(-12 + i * 3 + R(), 0, -20.5 - R() * 1.5); c.scale.setScalar(.85 + R() * .35); g.add(c); }
  return g;
}
