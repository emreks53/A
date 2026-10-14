// Group D helpers (s09, s10, s11): golden-hour sky + ocean with per-pixel wave normals and drop-impact ripples,
// clear water-drop shader (fresnel + sky reflection + sun glint + caustic + refracted mini-image from a render target),
// slow-motion splash (crown, Worthington jet, droplets), bokeh glints, and the shared continuous drop world/camera
// used by s09 and s10 (both scenes evaluate the same world at GLOBAL time T, so the cut between them is seamless).
import * as THREE from 'three';
import * as U from './util.js';
import * as TEX from './textures.js';
import { MAT, rbox, shadowAll } from './models.js';

const DEG = Math.PI / 180;
const C = c => new THREE.Color(c);

// ------------------------------------------------------------------------------------------------
// Sky (shared uniforms + GLSL so ocean/drops reflect exactly the sky we see)
// ------------------------------------------------------------------------------------------------
export function skyUniforms(o = {}) {
  return {
    uTop: { value: C(o.top ?? '#24305e') }, uMid: { value: C(o.mid ?? '#a8708a') }, uHor: { value: C(o.horizon ?? '#ff9f58') },
    uBelow: { value: C(o.below ?? '#8a5a4a') }, uSunDir: { value: new THREE.Vector3(...(o.sunDir ?? [0.05, 0.035, -1])).normalize() },
    uSunCol: { value: C(o.sunColor ?? '#ffcf86') }, uSunGlow: { value: o.sunGlow ?? .7 },
  };
}
export const SKY_GLSL = `
uniform vec3 uTop, uMid, uHor, uBelow, uSunDir, uSunCol; uniform float uSunGlow;
vec3 skyGrad(vec3 d){
  float y = d.y; vec3 c;
  float sd = max(dot(normalize(vec3(d.x, 0., d.z) + 1e-5), normalize(vec3(uSunDir.x, 0., uSunDir.z))), 0.);
  vec3 hor = uHor * (.72 + .45 * pow(sd, 3.));
  if (y >= 0.) { c = mix(hor, uMid, smoothstep(0., .2, y)); c = mix(c, uTop, smoothstep(.1, .7, y)); }
  else c = mix(hor, uBelow, smoothstep(0., -.08, y));
  float s = max(dot(d, uSunDir), 0.);
  c += uSunCol * (pow(s, 14.) * .14 + pow(s, 90.) * .32 + pow(s, 900.) * 1.1) * uSunGlow;
  return c;
}`;

export const NOISE_GLSL = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1.,0.)), f.x), mix(hash12(i+vec2(0.,1.)), hash12(i+vec2(1.,1.)), f.x), f.y); }
float fbm5(vec2 p){ float a = 0., w = .5; for (int i = 0; i < 4; i++){ a += w * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); w *= .5; } return a; }`;

// Sky dome with sun disc and golden-hour cloud streaks. Follows the camera (set position each frame).
export function skyD(su, o = {}) {
  const u = { ...su, gT: { value: 0 }, uCloud: { value: o.clouds ?? .6 }, uCloudLit: { value: C(o.cloudLit ?? '#ffcf9c') }, uCloudShade: { value: C(o.cloudShade ?? '#9a6f86') }, uDisc: { value: o.disc ?? 9 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * viewMatrix * vec4((modelMatrix * vec4(position, 1.)).xyz, 1.); gl_Position = p.xyww; }`,
    fragmentShader: `${SKY_GLSL}${NOISE_GLSL}
      uniform float gT, uCloud, uDisc; uniform vec3 uCloudLit, uCloudShade; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); vec3 c = skyGrad(d);
        float s = dot(d, uSunDir);
        if (d.y > -.01 && d.y < .5 && uCloud > 0.) {
          vec2 uv = d.xz / (max(d.y, 0.) + .07);
          float n = fbm5(uv * vec2(.22, .9) + vec2(gT * .004, 3.1));
          float n2 = fbm5(uv * vec2(.5, 1.6) + vec2(7.3, gT * .006));
          float cov = smoothstep(.62 - uCloud * .22, .86, n * .75 + n2 * .35) * smoothstep(-.005, .05, d.y) * (1. - smoothstep(.18, .5, d.y));
          float lit = pow(max(s, 0.), 6.);
          vec3 cc = mix(uCloudShade, uCloudLit, .35 + .65 * smoothstep(.3, .9, n2)) + uSunCol * lit * 1.2;
          c = mix(c, cc, cov * .8);
        }
        c += uSunCol * uDisc * smoothstep(.99982, .99990, s);
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 32), m);
  mesh.frustumCulled = false; mesh.renderOrder = -1000; mesh.userData.noDepth = true; mesh.userData.uniformsD = u;
  return mesh;
}

// ------------------------------------------------------------------------------------------------
// Ocean: polar grid (dense near the impact, huge to the horizon), long swells in the vertex shader, ~22 waves +
// ripples evaluated per pixel (analytic gradient), anti-aliased by fading waves smaller than ~2 px, unresolved slope
// variance widens the sun glitter lobe. Reflects skyGrad() and (analytically) up to two drop spheres.
// ------------------------------------------------------------------------------------------------
const NW = 22;
function waveSet(seed = 5) {
  const r = U.rng(seed); const W = [], P = [];
  const wind = Math.atan2(1, 0.35); // waves travel roughly toward +z (toward camera at the end)
  for (let i = 0; i < NW; i++) {
    const lam = 34 * Math.pow(0.7, i) * (.85 + r() * .3);
    const ang = wind + (r() - .5) * (i < 4 ? 1.2 : 2.9) + (i % 2 ? .5 : -.5) * (i < 4 ? 0 : 1);
    const k = 2 * Math.PI / lam; const steep = (i < 4 ? .022 : .022) + r() * .02;
    W.push(new THREE.Vector4(Math.cos(ang), Math.sin(ang), k, steep / k));
    P.push(new THREE.Vector2(Math.sqrt(9.8 * k + 0.0074 * k * k * k / 1.0), r() * Math.PI * 2));
  }
  return { W, P };
}
export function oceanD(su, o = {}) {
  const NR = o.rings ?? 210, NS = o.segs ?? 256, a = .25, Rmax = o.radius ?? 6000; const b = Math.log(Rmax / a + 1) / NR;
  const pos = new Float32Array((NR + 1) * NS * 3); const idx = [];
  for (let i = 0; i <= NR; i++) { const rr = a * (Math.exp(b * i) - 1); for (let j = 0; j < NS; j++) { const an = j / NS * Math.PI * 2; const k = (i * NS + j) * 3; pos[k] = Math.cos(an) * rr; pos[k + 1] = 0; pos[k + 2] = Math.sin(an) * rr; } }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++) { const j2 = (j + 1) % NS; const A = i * NS + j, B = i * NS + j2, Cc = (i + 1) * NS + j, Dd = (i + 1) * NS + j2; idx.push(A, B, Cc, B, Dd, Cc); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeBoundingSphere();
  const ws = waveSet(o.seed ?? 5);
  const u = {
    ...su, gT: { value: 0 }, wT: { value: 0 }, W: { value: ws.W }, WP: { value: ws.P },
    rip: { value: [new THREE.Vector4(0, 0, -99, 0), new THREE.Vector4(0, 0, -99, 0)] },
    dropS: { value: [new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0)] },
    uDeep: { value: C(o.deep ?? '#122029') }, uScatter: { value: C(o.scatter ?? '#1d4f4c') }, uSunI: { value: o.sunI ?? .022 },
    uHaze: { value: o.haze ?? 900 }, uDropIn: { value: C('#b47a3c') }, uRough: { value: o.rough ?? .0012 },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: u, defines: { NW },
    vertexShader: `uniform float gT, wT; uniform vec4 W[NW]; uniform vec2 WP[NW]; uniform vec4 rip[2]; varying vec3 vW;
      void main(){ vec3 p = (modelMatrix * vec4(position, 1.)).xyz; float cell = .05 * (length(position.xz) + .25); float y = 0.;
        for (int i = 0; i < 5; i++){ vec4 w = W[i]; float lam = 6.2831 / w.z; float f = 1. - smoothstep(.12, .35, cell / lam); y += w.w * f * sin(w.z * dot(w.xy, p.xz) - WP[i].x * wT + WP[i].y); }
        y *= smoothstep(2.5, 12., length(p.xz));
        for (int j = 0; j < 2; j++){ float age = gT - rip[j].z; if (age > 0. && age < .6){ float r = length(p.xz - rip[j].xy); y -= .022 * sin(3.1416 * clamp(age / .45, 0., 1.)) * exp(-r * r / .0022); } }
        p.y += y; vW = p; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
    fragmentShader: `${SKY_GLSL}
      uniform float gT, wT, uSunI, uHaze, uRough; uniform vec4 W[NW]; uniform vec2 WP[NW]; uniform vec4 rip[2]; uniform vec4 dropS[2]; uniform vec3 uDeep, uScatter, uDropIn; varying vec3 vW;
      vec2 ripGrad(vec2 P, vec4 rp, float pf, vec2 dx, vec2 dy, inout float var){
        float age = gT - rp.z; if (age <= 0. || age > 9.) return vec2(0.);
        vec2 dv = P - rp.xy; float r = length(dv) + 1e-5;
        float Rr = .035 + .16 * age + .075 * age * age; float lam = .045 + .04 * age; float w = lam * (1.2 + .35 * age);
        float x = r - Rr; float ww = x > 0. ? w * .55 : w * 1.5;
        if (abs(x) > 3.2 * ww && r > .12) return vec2(0.); float uu = x / ww; float env = exp(-uu * uu);
        float k = 6.2831 / lam; float A = rp.w * .16 / k / sqrt(1. + Rr * 4.) * exp(-age * .18);
        float dh = A * env * (-2. * uu / ww * cos(k * x) - k * sin(k * x));
        vec2 rd = dv / r; float pfr = max(abs(dot(dx, rd)), abs(dot(dy, rd))) * .75 + pf * .25; float f = 1. - smoothstep(.25, .55, pfr / lam);
        var += (1. - f) * (A * k) * (A * k) * env * .5;
        // inner crater rim right after impact
        float cr = exp(-r * r / .004) * smoothstep(.8, 0., age) * rp.w;
        return (dv / r) * (dh * f) + (dv / r) * cr * (-.6 * r / .004) * .05;
      }
      void main(){
        vec3 P = vW; vec2 dx = dFdx(P.xz), dy = dFdy(P.xz); float pf = max(length(dx), length(dy));
        vec2 g = vec2(0.), gl = vec2(0.); float var = 0.;
        for (int i = 0; i < NW; i++){ vec4 w = W[i]; float lam = 6.2831 / w.z; float pfw = max(abs(dot(dx, w.xy)), abs(dot(dy, w.xy))) * .75 + pf * .25; float f = 1. - smoothstep(.22, .5, pfw / lam); float s = w.w * w.z;
          if (f <= 0.) { var += s * s * .5; continue; }
          float ph = w.z * dot(w.xy, P.xz) - WP[i].x * wT + WP[i].y; vec2 gi = w.xy * (s * cos(ph) * f); g += gi; if (lam > .6) gl += gi; var += (1. - f) * s * s * .5; }
        g += ripGrad(P.xz, rip[0], pf, dx, dy, var) + ripGrad(P.xz, rip[1], pf, dx, dy, var);
        vec3 N = normalize(vec3(-g.x, 1., -g.y));
        vec3 V = normalize(cameraPosition - P); float NdV = max(dot(N, V), .02);
        float F = .02 + .98 * pow(1. - NdV, 5.);
        vec3 R = reflect(-V, N); R.y = abs(R.y);
        vec3 refl = skyGrad(R);
        vec3 Rl = reflect(-V, normalize(vec3(-gl.x * .6, 1., -gl.y * .6))); Rl.y = abs(Rl.y);
        for (int j = 0; j < 2; j++){ vec4 s = dropS[j]; if (s.w > 0.){ vec3 R = Rl; vec3 oc = P - s.xyz; float b = dot(R, oc); float c = dot(oc, oc) - s.w * s.w; float h = b * b - c;
          if (h > 0. && -b - sqrt(h) > 0.){ vec3 hp = P + R * (-b - sqrt(h)); vec3 n = normalize(hp - s.xyz); float fr = .04 + .96 * pow(1. - abs(dot(n, R)), 4.);
            refl = mix(uDropIn * (.7 + .9 * smoothstep(-.2, .8, -n.y)), skyGrad(reflect(R, n)), fr); } } }
        vec3 L = uSunDir; vec3 H = normalize(L + V); float NdH = max(dot(N, H), 1e-3); float t2 = (1. - NdH * NdH) / (NdH * NdH);
        float s2 = uRough + var * 2.2; float D = exp(-t2 / (2. * s2)) / (6.2831 * s2 * pow(NdH, 4.));
        float Fs = .02 + .98 * pow(1. - max(dot(H, V), 0.), 5.);
        float spec = uSunI * D * Fs / (4. * NdV) * smoothstep(-.02, .03, L.y);
        float sss = pow(max(dot(-V, L), 0.), 3.) * (.4 + .6 * clamp(dot(N, -L) * 3. + .5, 0., 1.));
        vec3 body = uDeep * (.7 + .3 * sss) + uScatter * sss * .45;
        vec3 c = mix(body, refl, F) + uSunCol * min(spec, 10.);
        float dist = length(cameraPosition - P); float hz = 1. - exp(-dist / uHaze);
        vec3 hzc = skyGrad(normalize(vec3(-V.x, .012, -V.z)));
        c = mix(c, hzc, hz);
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.userData.uniformsD = u;
  return mesh;
}

// ------------------------------------------------------------------------------------------------
// Water material for drops & splash bodies. Not transparent (it composes its own "seen-through" image), so it
// writes depth and stays sharp under the DOF pass. useMap: refracted mini image (render target) in the drop.
// ------------------------------------------------------------------------------------------------
export function waterMat(su, o = {}) {
  const u = {
    ...su, gT: { value: 0 }, map: { value: o.map ?? null }, useMap: { value: o.map ? 1 : 0 }, imgScale: { value: o.imgScale ?? .5 }, imgK: { value: o.imgK ?? .22 },
    wobA: { value: o.wobA ?? 0 }, wobF: { value: o.wobF ?? 9 }, wobP: { value: o.wobP ?? 0 }, squash: { value: 1 },
    keyDir: { value: new THREE.Vector3(...(o.keyDir ?? [-.55, .55, -.62])).normalize() }, keyCol: { value: C(o.keyCol ?? '#fff1d6') },
    causStr: { value: o.caus ?? 1.4 }, specStr: { value: o.spec ?? 1 }, bodyCol: { value: C(o.body ?? '#2a5a5a') }, tint: { value: C(o.tint ?? '#eef6ff') },
    parallax: { value: new THREE.Vector2(0, 0) }, rimDark: { value: o.rimDark ?? .72 },
  };
  return new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: `uniform float gT, wobA, wobF, wobP, squash; varying vec3 vW, vN;
      void main(){ float s = wobA * sin(wobF * gT + wobP); vec3 sc = vec3(1. - .5 * s, (1. + s) * squash, 1. - .5 * s);
        mat4 M = modelMatrix;
        #ifdef USE_INSTANCING
        M = modelMatrix * instanceMatrix;
        #endif
        vec3 lp = position * sc; vW = (M * vec4(lp, 1.)).xyz; mat3 NM = transpose(inverse(mat3(M)));
        vN = normalize(NM * (normal / sc)); gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.); }`,
    fragmentShader: `${SKY_GLSL}
      uniform sampler2D map; uniform float useMap, imgScale, imgK, causStr, specStr, rimDark; uniform vec3 keyDir, keyCol, bodyCol, tint; uniform vec2 parallax; varying vec3 vW, vN;
      void main(){ vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N; vec3 V = normalize(cameraPosition - vW); float NdV = clamp(dot(N, V), 0., 1.);
        float F = .02 + .98 * pow(1. - NdV, 5.);
        vec3 Nv = normalize((viewMatrix * vec4(N, 0.)).xyz); vec2 q = Nv.xy; float rho = clamp(length(q), 0., 1.);
        vec3 inner;
        if (useMap > .5) { vec2 uv = .5 + parallax + q * (imgScale + imgK * rho * rho); inner = texture2D(map, clamp(uv, .002, .998)).rgb; }
        else { vec3 Td = refract(-V, N, .75); inner = skyGrad(normalize(vec3(Td.x, -Td.y * .6 - .15, Td.z))) * .55 + bodyCol * .35; }
        inner *= tint;
        inner *= mix(1., 1. - rimDark, smoothstep(.72, .97, rho));
        vec3 Lv = normalize((viewMatrix * vec4(keyDir, 0.)).xyz); vec2 cq = -Lv.xy * .6;
        float back = smoothstep(.35, -.5, Lv.z);
        float caus = exp(-dot(q - cq, q - cq) / .018) * back + exp(-dot(q - cq * 1.25, q - cq * 1.25) / .004) * back * .8;
        vec3 R = reflect(-V, N); vec3 refl = skyGrad(R);
        float kr = max(dot(R, keyDir), 0.);
        float sp = pow(kr, 1500.) * 70. + pow(kr, 120.) * 1.6 + pow(kr, 14.) * .12;
        #ifdef CLEAR
        float a = .16 + .84 * F; vec3 add = refl * F + bodyCol * .05 * (1. - F) + keyCol * (sp * specStr + caus * causStr * .3);
        gl_FragColor = vec4(add / a, a);
        #else
        vec3 col = mix(inner, refl, F) + keyCol * (sp * specStr + caus * causStr * (.6 + .4 * inner));
        gl_FragColor = vec4(col, 1.);
        #endif
      }`,
    defines: o.clear ? { CLEAR: 1 } : {}, transparent: !!o.clear, depthWrite: !o.clear, side: o.clear ? THREE.DoubleSide : THREE.FrontSide,
  });
}

// ------------------------------------------------------------------------------------------------
// Tiny 3D props rendered into a texture (the image refracted inside each drop)
// ------------------------------------------------------------------------------------------------
function chestModel() {
  const g = new THREE.Group();
  const wood = MAT.wood({ a: '#a2643a', b: '#80492a', rings: 5, seed: 21 }); const brass = MAT.brass(); const dark = new THREE.MeshStandardMaterial({ color: '#1c120a', roughness: .8 });
  const W = .62, H = .34, Dp = .42, lr = Dp / 2;
  const body = new THREE.Mesh(rbox(W, H, Dp, .03), wood); body.position.y = H / 2; g.add(body);
  const lidG = new THREE.CylinderGeometry(lr, lr, W, 48, 1, false, 0, Math.PI); lidG.rotateZ(Math.PI / 2);
  const lid = new THREE.Mesh(lidG, wood); lid.scale.set(1, .62, 1); lid.position.y = H; g.add(lid);
  const seam = new THREE.Mesh(rbox(W + .012, .03, Dp + .012, .01), brass); seam.position.y = H; g.add(seam);
  for (const x of [-.2, .2]) {
    const st = new THREE.Mesh(rbox(.06, H + .006, Dp + .02, .012), brass); st.position.set(x, H / 2, 0); g.add(st);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(lr + .006, .016, 8, 40, Math.PI), brass); arc.rotation.y = Math.PI / 2; arc.scale.set(1, .62, 1); arc.position.set(x, H, 0); g.add(arc);
    for (const y of [.08, .26]) for (const z of [-1, 1]) { const rv = new THREE.Mesh(new THREE.SphereGeometry(.011, 10, 8), brass); rv.position.set(x, y, z * (Dp / 2 + .012)); g.add(rv); }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const cn = new THREE.Mesh(rbox(.07, .07, .07, .015), brass); cn.position.set(sx * (W / 2 - .02), .03, sz * (Dp / 2 - .02)); g.add(cn); }
  const hasp = new THREE.Mesh(rbox(.11, .15, .03, .012), brass); hasp.position.set(0, H - .02, Dp / 2 + .012); g.add(hasp);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, .02, 12), dark); hole.rotation.x = Math.PI / 2; hole.position.set(0, H - .03, Dp / 2 + .025); g.add(hole);
  const slot = new THREE.Mesh(rbox(.012, .03, .02, .004), dark); slot.position.set(0, H - .055, Dp / 2 + .025); g.add(slot);
  for (const sx of [-1, 1]) { const hd = new THREE.Mesh(new THREE.TorusGeometry(.045, .01, 8, 20, Math.PI), brass); hd.rotation.set(0, Math.PI / 2, Math.PI); hd.position.set(sx * (W / 2 + .012), H * .62, 0); g.add(hd); }
  // a tied leather pouch (entrusted goods) beside the chest
  const pouchMat = MAT.leather({ a: '#8a5a32', b: '#5a361c', seed: 17 });
  const pouch = new THREE.Mesh(new THREE.LatheGeometry([[.001, 0], [.07, .006], [.11, .04], [.12, .08], [.1, .13], [.05, .17], [.035, .185], [.05, .2], [.07, .225], [.055, .235], [.001, .23]].map(([r, y]) => new THREE.Vector2(r, y)), 32), pouchMat);
  pouch.position.set(.44, 0, .16); pouch.scale.setScalar(1.05); g.add(pouch);
  const cord = new THREE.Mesh(new THREE.TorusGeometry(.04, .008, 8, 24), new THREE.MeshStandardMaterial({ color: '#d8b77a', roughness: .8 })); cord.rotation.x = Math.PI / 2; cord.position.set(.44, .19, .16); g.add(cord);
  return shadowAll(g);
}
function zulfikarModel() {
  const g = new THREE.Group();
  const steel = new THREE.MeshPhysicalMaterial({ color: '#aeb4bd', metalness: 1, roughness: .3, clearcoat: .3, clearcoatRoughness: .3 });
  const brass = MAT.gold({ a: '#f0c560', b: '#a8782a' });
  const s = new THREE.Shape(); const hw = .05;
  s.moveTo(-hw, 0); s.lineTo(-hw * .92, .95); s.quadraticCurveTo(-hw * 1.05, 1.1, -hw * 1.35, 1.24); s.quadraticCurveTo(-hw * .55, 1.16, -.004, 1.075);
  s.lineTo(.004, 1.075); s.quadraticCurveTo(hw * .55, 1.16, hw * 1.35, 1.24); s.quadraticCurveTo(hw * 1.05, 1.1, hw * .92, .95); s.lineTo(hw, 0); s.closePath();
  const bg = new THREE.ExtrudeGeometry(s, { depth: .008, bevelEnabled: true, bevelThickness: .006, bevelSize: .009, bevelSegments: 3, curveSegments: 24 }); bg.translate(0, 0, -.004);
  const blade = new THREE.Mesh(bg, steel); g.add(blade);
  const fuller = new THREE.Mesh(rbox(.014, .78, .02, .006), new THREE.MeshPhysicalMaterial({ color: '#8d939c', metalness: 1, roughness: .35 })); fuller.position.y = .45; g.add(fuller);
  const guard = new THREE.Mesh(rbox(.3, .045, .06, .018), brass); guard.position.y = -.02; g.add(guard);
  for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(.032, 16, 12), brass); b.position.set(sx * .16, -.02, 0); g.add(b); }
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(.026, .03, .25, 20), MAT.leather({ a: '#4a2414', b: '#2a120a' })); grip.position.y = -.17; g.add(grip);
  for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.TorusGeometry(.029, .004, 6, 20), brass); w.rotation.x = Math.PI / 2; w.position.y = -.07 - i * .05; g.add(w); }
  const pom = new THREE.Mesh(new THREE.SphereGeometry(.042, 18, 14), brass); pom.position.y = -.31; g.add(pom);
  return shadowAll(g);
}
function rockModel(seed = 4) {
  const geo = new THREE.SphereGeometry(.6, 72, 48); const p = geo.attributes.position; const f = TEX.fbmField(seed, 3, 4);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize(); const uu = Math.atan2(n.z, n.x) / (2 * Math.PI) + .5, vv = n.y * .5 + .5; const d = 1 + f(uu, vv) * .3 - Math.max(0, -n.y) * .25; v.multiplyScalar(d); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, MAT.stone({ a: '#9c8068', b: '#5a463a', seed: 9 })); m.castShadow = m.receiveShadow = true; return m;
}
// Render a prop vignette into a HalfFloat render target (linear HDR, same space as the main pass).
export async function propTexture(ctx, kind, o = {}) {
  const { renderer } = ctx; const S = o.size ?? 512;
  const sc = new THREE.Scene();
  sc.background = TEX.drawTexture(16, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#10161b'); gr.addColorStop(.42, '#232629'); gr.addColorStop(.72, '#6b4c32'); gr.addColorStop(.9, '#d6a066'); gr.addColorStop(1, '#ffe0a8'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  sc.environment = await ctx.loadHDR('qwantani_sunset_puresky'); sc.environmentIntensity = .55;
  const cam = new THREE.PerspectiveCamera(26, 1, .05, 50);
  const key = new THREE.DirectionalLight('#ffd6a0', 3.2); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); const kc = key.shadow.camera; kc.left = kc.bottom = -1.5; kc.right = kc.top = 1.5; kc.near = .1; kc.far = 20; key.shadow.bias = -.0006; key.shadow.radius = 4;
  const rim = new THREE.DirectionalLight('#ffe3b8', 4.5); const fill = new THREE.HemisphereLight('#9fb4d8', '#6a4428', .55);
  sc.add(key, key.target, rim, fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ color: '#1a0e06', opacity: .45 })); ground.receiveShadow = true; sc.add(ground);
  if (kind === 'chest') {
    const ch = chestModel(); ch.rotation.y = -.55; ch.position.x = -.06; sc.add(ch);
    cam.position.set(.55, .72, 1.95); cam.lookAt(.02, .26, 0);
    key.position.set(-2.2, 3.2, 2.4); rim.position.set(1.8, 1.6, -2.6);
  } else {
    const rock = rockModel(6); rock.scale.set(1.3, 1.2, .8); rock.position.set(.32, .3, -.7); sc.add(rock);
    const sw = zulfikarModel(); sw.position.set(-.3, .34, -.08); sw.rotation.set(-.1, .3, -.55); sc.add(sw);
    cam.position.set(.05, .78, 3.3); cam.lookAt(.02, .62, 0);
    key.position.set(-2.4, 3.0, 2.0); rim.position.set(2.2, 2.2, -2.0); rim.intensity = 3; key.intensity = 2.6; sc.environmentIntensity = .35;
  }
  key.target.position.set(0, .3, 0);
  const rt = new THREE.WebGLRenderTarget(S, S, { type: THREE.HalfFloatType, samples: 4 });
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace; rt.texture.generateMipmaps = false; rt.texture.minFilter = THREE.LinearFilter;
  const prevT = renderer.getRenderTarget();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(sc, cam); renderer.setRenderTarget(prevT);
  return rt.texture;
}

// ------------------------------------------------------------------------------------------------
// Bokeh: out-of-focus sun glints on the far water (screen-size discs, brighter near the specular direction)
// ------------------------------------------------------------------------------------------------
export function bokehD(su, o = {}) {
  const n = o.count ?? 70, r = U.rng(o.seed ?? 17); const pos = new Float32Array(n * 3), rnd = new Float32Array(n * 4);
  const az0 = o.az0 ?? 0, spread = o.spread ?? .5;
  for (let i = 0; i < n; i++) { const az = az0 + (r() - .5) * spread * 2, d = (o.d0 ?? 4) + Math.pow(r(), .8) * (o.d1 ?? 30); pos[i * 3] = Math.sin(az) * d + (o.cx ?? 0); pos[i * 3 + 1] = o.y ?? .3; pos[i * 3 + 2] = -Math.cos(az) * d + (o.cz ?? 0); rnd.set([r(), r(), r(), r()], i * 4); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 4));
  const u = { uSunDir: su.uSunDir, gT: { value: 0 }, master: { value: 1 }, pxScale: { value: 1 }, col: { value: C(o.color ?? '#ffc26a') }, gain: { value: o.gain ?? 1 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 rnd; uniform float gT, master, pxScale, gain; uniform vec3 uSunDir; varying float vA; varying float vH;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; vec3 wp = (modelMatrix * vec4(position, 1.)).xyz;
        vec3 I = normalize(wp - cameraPosition); vec3 Rf = reflect(I, vec3(0., 1., 0.)); float gl = pow(max(dot(Rf, uSunDir), 0.), 5.);
        float tw = smoothstep(.25, 1., .5 + .5 * sin(gT * (.5 + rnd.x * 1.3) + rnd.y * 40.));
        vA = master * gain * (.2 + .8 * gl) * tw; vH = rnd.w; gl_PointSize = pxScale * (46. + 110. * rnd.z); }`,
    fragmentShader: `uniform vec3 col; varying float vA; varying float vH;
      void main(){ vec2 p = gl_PointCoord * 2. - 1.; float r = length(p); if (r > 1.) discard;
        float disc = smoothstep(1., .86, r); float rim = smoothstep(.62, .93, r) * disc;
        vec3 c = col * mix(vec3(1.), vec3(1.05, .9, .8), vH);
        gl_FragColor = vec4(c * (disc * .5 + rim * .45) * vA, 1.); }`,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.userData.uniformsD = u; pts.userData.noDepth = true; pts.renderOrder = 5;
  return pts;
}

// ------------------------------------------------------------------------------------------------
// Shared continuous world for s09 + s10, evaluated at GLOBAL time T.
// ------------------------------------------------------------------------------------------------
export const DW = {
  v: .3, R: .045, Ti: [45.02, 45.27], P: [[-.058, -.042], [.054, .038]], sunDir: [.07, .03, -1],
};
const dropY = (i, T) => DW.R * .95 + DW.v * (DW.Ti[i] - T);
// slow-motion water clock: 0.35x during the macro shot, ramping to 1x for the wide shot
function waterTime(T) { const sp = t => U.lerp(.32, 1, U.smoothstep(45.4, 46.8, t)); let a = 0; const t0 = 40; const n = Math.max(1, Math.ceil((T - t0) / .02)); const h = (T - t0) / n; for (let i = 0; i < n; i++) a += sp(t0 + (i + .5) * h) * h; return a; }

export function camD(T) {
  const yM = (dropY(0, T) + dropY(1, T)) / 2;
  const dl = U.kf(T, [[41.5, -.17], [42.5, -.03], [44.6, .0]], 'inOutSine');
  let ty = yM + dl; const fl = .075, k = .05; ty = fl + (ty - fl + Math.sqrt((ty - fl) ** 2 + k * k)) / 2; // soft max with floor
  const tx = (DW.P[0][0] + DW.P[1][0]) / 2, tz = (DW.P[0][1] + DW.P[1][1]) / 2;
  const phi = U.kf(T, [[41.5, -38], [45.0, -31], [49.8, -3]], 'inOutSine') * DEG;
  const th = U.kf(T, [[41.5, 24], [43.6, 26], [45.05, 30], [46.4, 23], [49.8, 11]], 'inOutSine') * DEG;
  let d;
  if (T < 45.2) d = Math.exp(U.lerp(Math.log(.98), Math.log(.8), U.prog(T, 41.5, 45.2, 'inOutSine')));
  else { const x = U.clamp((T - 45.2) / (49.8 - 45.2)); const e = U.ease.inOutSine(1 - Math.pow(1 - x, 1.7)); d = Math.exp(U.lerp(Math.log(.8), Math.log(46), e)); }
  const pu = U.kf(T, [[45.3, 0], [47.6, 5.3], [49.8, 5.0]], 'inOutSine') * DEG;
  const fov = U.kf(T, [[41.5, 34], [45.4, 34], [48.2, 42]], 'inOutSine');
  const tgt = new THREE.Vector3(tx, ty, tz);
  const pos = tgt.clone().add(new THREE.Vector3(Math.cos(th) * Math.sin(phi), Math.sin(th), Math.cos(th) * Math.cos(phi)).multiplyScalar(d));
  pos.add(U.shake(T, .006 * d, .45, 11));
  const pa = th - pu; const look = pos.clone().add(new THREE.Vector3(-Math.cos(pa) * Math.sin(phi), -Math.sin(pa), -Math.cos(pa) * Math.cos(phi)));
  const dof = 1 - U.smoothstep(45.35, 46.5, T);
  return { pos, look, fov, d, tgt, dof, bokeh: 1 - U.smoothstep(45.3, 46.1, T) };
}

export async function buildDropWorld(ctx, o = {}) {
  const { scene, camera } = ctx; const W = { T: 0 };
  const su = skyUniforms({ sunDir: DW.sunDir }); W.su = su;
  scene.background = null; scene.fog = null;
  const sky = skyD(su, { clouds: .65 }); scene.add(sky); W.sky = sky;
  const ocean = oceanD(su, {}); scene.add(ocean); W.ocean = ocean;
  // props rendered into textures shown inside the drops
  const texChest = await propTexture(ctx, 'chest'), texSword = await propTexture(ctx, 'sword');
  const dropGeo = new THREE.SphereGeometry(DW.R, 128, 96);
  W.drops = [texChest, texSword].map((tex, i) => {
    const m = waterMat(su, { map: tex, wobA: .035, wobF: 7.5 + i * 1.3, wobP: i * 2.1, keyDir: [-.5, .5, -.7] });
    const mesh = new THREE.Mesh(dropGeo, m); scene.add(mesh); return mesh;
  });
  // splash parts
  const sm = waterMat(su, { caus: .5, spec: 1.2, keyDir: [-.5, .5, -.7], clear: true, body: '#3a6a70' });
  const crownProf = [[.86, -.05], [.9, .2], [.96, .6], [1.02, .88], [1.1, 1.0], [1.16, .97], [1.1, .85], [1.04, .55], [.99, .18], [.96, -.05]].map(([r, y]) => new THREE.Vector2(r, y));
  const crownGeo = new THREE.LatheGeometry(crownProf, 96); { const p = crownGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); const an = Math.atan2(z, x); if (y > .5) p.setY(i, y + (y - .5) * .9 * Math.pow(Math.max(0, Math.cos(an * 11)), 6)); } crownGeo.computeVertexNormals(); }
  const jetProf = [[1.0, -.04], [.75, .05], [.46, .2], [.34, .45], [.28, .68], [.3, .8], [.36, .88], [.34, .95], [.2, .995], [.001, 1.0]].map(([r, y]) => new THREE.Vector2(r, y));
  const jetGeo = new THREE.LatheGeometry(jetProf, 48); jetGeo.computeVertexNormals();
  const sph = new THREE.SphereGeometry(1, 24, 18);
  W.splash = DW.P.map(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const crown = new THREE.Mesh(crownGeo, sm); const jet = new THREE.Mesh(jetGeo, sm); const tip = new THREE.Mesh(sph, sm);
    const fly = new THREE.InstancedMesh(sph, sm, 12); fly.frustumCulled = false; g.add(crown, jet, tip, fly);
    const r = U.rng(31 + i); const parts = []; for (let k = 0; k < 12; k++) { const an = (k / 12) * Math.PI * 2 + r() * .4; parts.push({ an, vo: .12 + r() * .1, vu: .2 + r() * .14, sz: .0028 + r() * .0042, t0: .03 + r() * .06 }); }
    return { g, crown, jet, tip, fly, parts };
  });
  // bokeh glints behind the drops (s09 view direction)
  const bok = bokehD(su, { count: 110, az0: 33 * DEG, spread: .5, d0: 1.1, d1: 5.5, y: .05, gain: o.bokehGain ?? .8 }); scene.add(bok); W.bok = bok;
  camera.near = .01; camera.far = 8000; camera.updateProjectionMatrix();
  W.update = (T, ctx) => updateDropWorld(W, T, ctx);
  return W;
}

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
export function updateDropWorld(W, T, ctx) {
  const { camera, post } = ctx; W.T = T;
  const cam = camD(T); camera.position.copy(cam.pos); camera.lookAt(cam.look); camera.fov = cam.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const wt = waterTime(T);
  W.sky.position.copy(camera.position); W.sky.userData.uniformsD.gT.value = T;
  const ou = W.ocean.userData.uniformsD; ou.gT.value = T; ou.wT.value = wt;
  DW.P.forEach(([x, z], i) => { ou.rip.value[i].set(x, z, DW.Ti[i], 1); });
  // drops
  W.drops.forEach((d, i) => {
    const age = T - DW.Ti[i]; const [x, z] = DW.P[i]; const mu = d.material.uniforms; mu.gT.value = T;
    if (age > .07) { d.visible = false; ou.dropS.value[i].set(0, 0, 0, 0); return; }
    d.visible = true; const sq = age > 0 ? 1 - U.clamp(age / .07) : 1; mu.squash.value = Math.max(.02, sq);
    const y = age > 0 ? DW.R * .95 * sq : dropY(i, T); d.position.set(x, y, z);
    ou.dropS.value[i].set(x, y, z, DW.R * (age > 0 ? sq : 1));
    // tiny image parallax: shifts with view direction relative to drop
    _v.copy(camera.position).sub(d.position).normalize(); mu.parallax.value.set(-_v.x * .015, (_v.y - .2) * .02);
  });
  // splash (slow motion)
  W.splash.forEach((s, i) => {
    const a = T - DW.Ti[i]; s.crown.material.uniforms.gT.value = T;
    const on = a > 0 && a < 2; s.g.visible = on; if (!on) return;
    // crown sheet
    const ca = U.clamp(a / .4); const ch = Math.sin(Math.PI * Math.pow(ca, .7)) * .034; s.crown.visible = ch > .002;
    const cr = .036 + .042 * U.ease.outCubic(ca); s.crown.scale.set(cr, Math.max(ch, .001), cr);
    // Worthington jet
    const ja = U.clamp((a - .26) / .9); const jh = Math.sin(Math.PI * ja) * .17; s.jet.visible = ja > 0 && ja < 1 && jh > .004;
    const jr = .022 * (1 - .25 * ja); s.jet.scale.set(jr, Math.max(jh, .001), jr);
    // pinched-off droplet from the jet tip
    const pa = a - .6; if (pa > 0) { const h0 = .17 * Math.sin(Math.PI * U.clamp((.6 - .26) / .9)); const y = h0 + .16 * pa - .8 * pa * pa; s.tip.visible = y > -.01; s.tip.position.set(0, y + .01, 0); s.tip.scale.setScalar(.0095); }
    else { s.tip.visible = ja > .05; const y = jh; s.tip.position.set(0, y * .97, 0); s.tip.scale.setScalar(.008 * U.smoothstep(.05, .3, ja)); }
    // flying secondary droplets from the crown rim
    s.parts.forEach((p, k) => {
      const t = a - p.t0; let sc = 0; if (t > 0) { const rr = .06 + p.vo * t; const y = .03 + p.vu * t - 1.1 * t * t; if (y > -.005) { sc = p.sz; _v.set(Math.cos(p.an) * rr, y, Math.sin(p.an) * rr); } }
      _s.setScalar(Math.max(sc, 1e-5)); if (sc === 0) _v.set(0, -1, 0); _m4.compose(_v, _q.identity(), _s); s.fly.setMatrixAt(k, _m4);
    });
    s.fly.instanceMatrix.needsUpdate = true;
  });
  // bokeh
  const bu = W.bok.userData.uniformsD; bu.gT.value = T; bu.master.value = cam.bokeh; bu.pxScale.value = ctx.renderer.domElement.height / 1920; W.bok.visible = cam.bokeh > .002;
  // DOF
  let fz = 0, fn = 0; W.drops.forEach(d => { if (d.visible) { _v.copy(d.position).applyMatrix4(camera.matrixWorldInverse); fz += -_v.z; fn++; } });
  const focus = fn ? U.lerp(fz / fn, cam.d, U.smoothstep(45.0, 45.5, T)) : cam.d;
  post.dof.enabled = true; post.dof.focus = focus; post.dof.range = Math.max(.45, cam.d * .5); post.dof.amount = cam.dof;
  return cam;
}

// Helper: project a world point to overlay pixels (returns [x,y,behind])
export function proj(ctx, v) { const p = v.clone().project(ctx.camera); return [(p.x * .5 + .5) * ctx.W, (-p.y * .5 + .5) * ctx.H, p.z > 1]; }

// Kurzgesagt-style numbered badge (gold disc with ink numeral), pops in with overshoot.
export function badgeD(ui, t, t0, x, y, label, o = {}) {
  const e = ui.env(t, t0, o.t1 ?? Infinity, .4, 'pop'); if (e.o <= .001) return;
  const X = ui.ctx, r = o.r ?? 34; X.save(); X.globalAlpha = e.o; X.translate(x, y); X.scale(e.s, e.s);
  X.shadowColor = 'rgba(0,0,0,.45)'; X.shadowBlur = 16; X.shadowOffsetY = 5;
  X.fillStyle = o.bg ?? '#ffcf6b'; X.beginPath(); X.arc(0, 0, r, 0, Math.PI * 2); X.fill(); X.shadowColor = 'transparent';
  X.lineWidth = 4; X.strokeStyle = 'rgba(255,248,230,.9)'; X.stroke();
  X.fillStyle = o.color ?? '#1a1626'; X.font = `900 ${Math.round(r * 1.25)}px "Nunito"`; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText(label, 0, 2);
  X.restore();
}
// Dashed world-space circle on the water (y=0) projected to the overlay
export function dashedRing(ui, t, t0, center, radius, o = {}) {
  const e = ui.env(t, t0, o.t1 ?? Infinity, .5, 'fade'); if (e.o <= .001) return;
  const X = ui.ctx, n = 72, p = U.ease.outCubic(U.clamp((t - t0) / .6));
  X.save(); X.globalAlpha = e.o * (o.alpha ?? .9); X.strokeStyle = o.color ?? '#fff1d6'; X.lineWidth = o.w ?? 4; X.setLineDash(o.dash ?? [14, 12]); X.lineCap = 'round';
  X.shadowColor = 'rgba(0,0,0,.35)'; X.shadowBlur = 8; X.beginPath();
  for (let i = 0; i <= n * p; i++) { const a = i / n * Math.PI * 2 + (o.rot ?? 0); const v = new THREE.Vector3(center.x + Math.cos(a) * radius, center.y ?? 0, center.z + Math.sin(a) * radius); const [x, y] = ui.project(v); if (i === 0) X.moveTo(x, y); else X.lineTo(x, y); }
  X.stroke(); X.restore();
}
export const rippleFront = age => .035 + .16 * age + .075 * age * age;
