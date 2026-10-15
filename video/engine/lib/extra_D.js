// Group D helpers (s09, s10, s11): golden-hour sky + ocean with per-pixel wave normals (footprint-AA'd, crest-bent so no
// regular weave) and drop-impact ripples; ball-lens water shader (dispersion, inverted refracted world + upright prop
// image from a render target, crisp key/sun speculars, caustic crescent, shape wobble + micro-ripples, star glint);
// slow-motion splash (fingered crown with pinch-off beads, clear Worthington jet), bokeh glints, the shared continuous
// drop world/camera used by s09 and s10 (both evaluate the same world at GLOBAL time T -> seamless cut), and s11 parts
// (world-scaled stone UVs, fine carved stone, fluted shafts, pinnate date palm).
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
    const ang = wind + (r() - .5) * (i < 4 ? 1.2 : 2.0) + (i % 2 ? .45 : -.45) * (i < 4 ? 0 : 1);
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
        vec2 rd = dv / r; float pfr = max(abs(dot(dx, rd)), abs(dot(dy, rd))) * .75 + pf * .25; float f = 1. - smoothstep(.12, .3, pfr / lam);
        var += (1. - f) * (A * k) * (A * k) * env * .5;
        // inner crater rim right after impact
        float cr = exp(-r * r / .004) * smoothstep(.8, 0., age) * rp.w;
        return (dv / r) * (dh * f) + (dv / r) * cr * (-.6 * r / .004) * .05;
      }
      void main(){
        vec3 P = vW; vec2 dx = dFdx(P.xz), dy = dFdy(P.xz); float pf = max(length(dx), length(dy));
        vec2 g = vec2(0.), gl = vec2(0.); float var = 0.;
        for (int i = 0; i < NW; i++){ vec4 w = W[i]; float lam = 6.2831 / w.z; float pfw = max(abs(dot(dx, w.xy)), abs(dot(dy, w.xy))) * .75 + pf * .25; float f = 1. - smoothstep(.075, .17, pfw / lam); float s = w.w * w.z;
          if (f <= 0.) { var += s * s * .5; continue; }
          float fi = float(i);
          // small waves: bend the crests and break them into patches (no regular "woven" pattern)
          float pm = 0., am = 1.;
          if (i >= 5) { vec2 m1 = vec2(cos(fi * 2.4), sin(fi * 2.4)) * w.z * (.07 + .015 * mod(fi, 3.)); vec2 m2 = vec2(cos(fi * 1.7 + 1.), sin(fi * 1.7 + 1.)) * w.z * .035;
            pm = 1.7 * sin(dot(m1, P.xz) + fi) + 1.1 * sin(dot(m2, P.xz) * 1.9 + fi * .7 + wT * .05);
            am = .45 + .55 * smoothstep(-.6, .8, sin(dot(m2.yx, P.xz) * 1.3 + fi * 1.9) + .5 * sin(dot(m1.yx, P.xz) * 2.1 - fi)); }
          float ph = w.z * dot(w.xy, P.xz) - WP[i].x * wT + WP[i].y + pm; vec2 gi = w.xy * (s * am * cos(ph) * f); g += gi; if (lam > .6) gl += gi; var += (1. - f) * s * s * am * am * .5; }
        g += ripGrad(P.xz, rip[0], pf, dx, dy, var) + ripGrad(P.xz, rip[1], pf, dx, dy, var);
        vec3 N = normalize(vec3(-g.x, 1., -g.y));
        vec3 V = normalize(cameraPosition - P); float NdV = max(dot(N, V), .02);
        float F = .02 + .98 * pow(1. - NdV, 5.);
        vec3 R = reflect(-V, N); R.y = abs(R.y);
        vec3 refl = skyGrad(R);
        vec3 Rl = reflect(-V, normalize(vec3(-gl.x * .6, 1., -gl.y * .6))); Rl.y = abs(Rl.y);
        for (int j = 0; j < 2; j++){ vec4 s = dropS[j]; if (s.w > 0.){ vec3 R = Rl; vec3 oc = P - s.xyz; float b = dot(R, oc); float c = dot(oc, oc) - s.w * s.w; float h = b * b - c;
          if (h > 0. && -b - sqrt(h) > 0.){ vec3 hp = P + R * (-b - sqrt(h)); vec3 n = normalize(hp - s.xyz); float fr = .04 + .96 * pow(1. - abs(dot(n, R)), 4.);
            vec3 din = skyGrad(normalize(vec3(R.x, .06 + .9 * clamp(-n.y, 0., 1.), R.z))) * 1.15 + uSunCol * .25 * smoothstep(.3, .9, -n.y);
            refl = mix(din, skyGrad(reflect(R, n)), fr); } } }
        vec3 L = uSunDir; vec3 H = normalize(L + V); float NdH = max(dot(N, H), 1e-3); float t2 = (1. - NdH * NdH) / (NdH * NdH);
        float s2 = uRough + var * 2.2; float D = exp(-t2 / (2. * s2)) / (6.2831 * s2 * pow(NdH, 4.));
        float Fs = .02 + .98 * pow(1. - max(dot(H, V), 0.), 5.);
        float spec = uSunI * D * Fs / (4. * NdV) * smoothstep(-.02, .03, L.y);
        float sss = pow(max(dot(-V, L), 0.), 3.) * (.4 + .6 * clamp(dot(N, -L) * 3. + .5, 0., 1.));
        vec3 body = uDeep * (.7 + .3 * sss) + uScatter * sss * .45;
        float dist = length(cameraPosition - P);
        vec3 c = mix(body, refl, F) + uSunCol * min(spec, mix(2.2, 10., smoothstep(1.5, 6., dist))); // no blown-out flares in macro
        float hz = 1. - exp(-dist / uHaze);
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
    parallax: { value: new THREE.Vector2(0, 0) }, rimDark: { value: o.rimDark ?? .72 }, baseA: { value: o.baseA ?? .16 }, coreStr: { value: o.core ?? 0 },
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
      uniform sampler2D map; uniform float useMap, imgScale, imgK, causStr, specStr, rimDark, baseA, coreStr; uniform vec3 keyDir, keyCol, bodyCol, tint; uniform vec2 parallax; varying vec3 vW, vN;
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
        float a = baseA + (1. - baseA) * F; vec3 add = refl * F + bodyCol * .05 * (1. - F) + keyCol * (min(sp * specStr, 3.) + caus * causStr * .3) + keyCol * coreStr * pow(NdV, 24.);
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
// Physically-motivated water body (drops, jets, beads). Opaque (writes depth, stays sharp under DOF).
// The view ray is refracted through the body as through a ball lens (entry + exit refraction, the exit normal
// mirrored about the chord), with per-channel IOR (dispersion -> faint rainbow fringe at the rim). What is seen
// through it is the inverted golden-hour world (envLook: sky above, dark sea + sun glitter below, the sun disc
// itself = the focused caustic). Optional `map`: a tiny pre-rendered prop (premultiplied alpha) placed in that
// refracted world, kept upright for legibility. Surface: l=2/l=3 shape oscillation + travelling micro-ripples
// (shimmering highlights), crisp key highlight + sun glint, internal caustic crescent opposite the key.
// ------------------------------------------------------------------------------------------------
export const ENV_GLSL = `
uniform vec3 uDeepE;
vec3 envLook(vec3 d){
  vec3 c;
  if (d.y >= 0.) c = skyGrad(d);
  else {
    vec3 r = vec3(d.x, -d.y, d.z);
    float F = .02 + .98 * pow(1. - clamp(-d.y, 0., 1.), 5.);
    c = mix(uDeepE, skyGrad(r), F);
    float g = max(dot(r, uSunDir), 0.);
    c += uSunCol * (pow(g, 40.) * .7 + pow(g, 500.) * 2.5) * smoothstep(0., .03, -d.y);
  }
  c += uSunCol * smoothstep(.99925, .99975, dot(d, uSunDir)) * 9.;
  return c;
}`;
export function dropMat(su, o = {}) {
  const u = {
    ...su, gT: { value: 0 }, map: { value: o.map ?? null }, useMap: { value: o.map ? 1 : 0 }, imgK: { value: o.imgK ?? .9 },
    wob2: { value: o.wob2 ?? 0 }, wob3: { value: o.wob3 ?? 0 }, wobF: { value: o.wobF ?? 9 }, wobP: { value: o.wobP ?? 0 }, squash: { value: 1 },
    rip: { value: o.rip ?? 0 }, ctr: { value: new THREE.Vector3() }, parallax: { value: new THREE.Vector2(0, 0) },
    keyDir: { value: new THREE.Vector3(...(o.keyDir ?? [-.5, .5, -.7])).normalize() }, keyCol: { value: C(o.keyCol ?? '#fff1d6') },
    causStr: { value: o.caus ?? 1 }, specStr: { value: o.spec ?? 1 }, tint: { value: C(o.tint ?? '#ffffff') }, rimDark: { value: o.rimDark ?? .45 },
    uDeepE: { value: C(o.deep ?? '#0c161d') }, envGain: { value: o.envGain ?? 1 },
  };
  return new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: `uniform float gT, wob2, wob3, wobF, wobP, squash; varying vec3 vW, vN, vL;
      void main(){
        vec3 n0 = normalize(normal);
        vec3 a1 = vec3(0., 1., 0.), a2 = normalize(vec3(.6, .5, .62));
        float c1 = dot(n0, a1), c2 = dot(n0, a2);
        float s2 = wob2 * sin(wobF * gT + wobP), s3 = wob3 * sin(wobF * 1.63 * gT + wobP * 1.7 + 1.1);
        float d = s2 * .5 * (3. * c1 * c1 - 1.) + s3 * .5 * (5. * c2 * c2 * c2 - 3. * c2);
        vec3 g = s2 * 3. * c1 * (a1 - c1 * n0) + s3 * .5 * (15. * c2 * c2 - 3.) * (a2 - c2 * n0);
        vec3 nn = normalize(n0 - g);
        vec3 lp = position * (1. + d); lp.y *= squash; nn.y /= max(squash, .05); nn = normalize(nn);
        mat4 M = modelMatrix;
        #ifdef USE_INSTANCING
        M = modelMatrix * instanceMatrix;
        #endif
        vW = (M * vec4(lp, 1.)).xyz; vN = normalize(transpose(inverse(mat3(M))) * nn); vL = n0;
        gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.); }`,
    fragmentShader: `${SKY_GLSL}${ENV_GLSL}
      uniform sampler2D map; uniform float gT, useMap, imgK, causStr, specStr, rimDark, rip, envGain; uniform vec3 keyDir, keyCol, tint, ctr; uniform vec2 parallax;
      varying vec3 vW, vN, vL;
      vec3 bR, bU; vec3 I0;
      vec3 thru(vec3 I, vec3 N, float eta){
        vec3 T1 = refract(I, N, 1. / eta);
        #ifdef CYL
        vec3 T1h = normalize(vec3(T1.x, 0., T1.z) + 1e-5), Nh = normalize(vec3(N.x, 0., N.z) + 1e-5); vec3 N2 = Nh - 2. * dot(T1h, Nh) * T1h;
        #else
        vec3 N2 = N - 2. * dot(T1, N) * T1;
        #endif
        vec3 T2 = refract(T1, -N2, eta); if (dot(T2, T2) < .01) T2 = reflect(T1, -N2);
        vec3 e = envLook(T2) * envGain;
        if (useMap > .5) {
          vec2 uv = .5 + parallax - vec2(dot(T2, bR), dot(T2, bU)) * imgK;
          vec4 m = texture2D(map, clamp(uv, .001, .999));
          vec2 eg = smoothstep(vec2(0.), vec2(.035), uv) * smoothstep(vec2(0.), vec2(.035), 1. - uv);
          m *= eg.x * eg.y; e = e * (1. - m.a) + m.rgb;
        }
        return e;
      }
      void main(){
        vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N; vec3 Ns = N;
        if (rip > 0.) {
          vec3 p = normalize(vL); vec3 g = vec3(0.);
          vec3 k1 = vec3(5.1, 2.3, -3.7), k2 = vec3(-3.3, 6.2, 1.9), k3 = vec3(2.2, -4.8, 6.1), k4 = vec3(-7.3, -1.2, -2.6), k5 = vec3(1.4, 9.1, -4.4);
          g += k1 * cos(dot(k1, p) + gT * 3.1); g += k2 * cos(dot(k2, p) - gT * 2.7 + 1.3); g += k3 * cos(dot(k3, p) + gT * 3.9 + 2.1);
          g += k4 * cos(dot(k4, p) - gT * 3.4 + .4) * .7; g += k5 * cos(dot(k5, p) + gT * 4.6 + 4.2) * .5;
          g -= N * dot(g, N); N = normalize(N - rip * .0085 * g);
        }
        vec3 I = normalize(vW - cameraPosition); vec3 V = -I; I0 = I;
        vec3 Dref = normalize(ctr - cameraPosition); vec3 cu = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        bR = normalize(cross(Dref, cu)); bU = cross(bR, Dref);
        float NdV = clamp(dot(N, V), 0., 1.);
        float F = .02 + .98 * pow(1. - NdV, 5.);
        vec3 Nt = normalize(mix(Ns, N, .22)); // refraction sees mostly the smooth shape (the image wobbles gently)
        vec3 inner = vec3(thru(I, Nt, 1.326).r, thru(I, Nt, 1.333).g, thru(I, Nt, 1.345).b) * tint;
        float edge = 1. - NdV;
        inner *= mix(1., 1. - rimDark, smoothstep(.5, .9, edge));
        vec3 R = reflect(I, N); vec3 refl = envLook(R);
        float kr = dot(R, keyDir);
        float hl = smoothstep(.9962, .9984, kr) * 7. + pow(max(kr, 0.), 320.) * 1.6 + pow(max(kr, 0.), 26.) * .09;
        float sr = dot(R, uSunDir);
        float sg = smoothstep(.9986, .9995, sr) * 10. + pow(max(sr, 0.), 260.) * 1.2;
        vec3 Nv = normalize((viewMatrix * vec4(N, 0.)).xyz); vec2 q = Nv.xy;
        vec3 Lv = (viewMatrix * vec4(keyDir, 0.)).xyz; vec2 cd = -normalize(Lv.xy + vec2(1e-4)); vec2 cq = cd * .6;
        vec2 dq = q - cq; float caus = exp(-dot(dq, dq) / .025) * .22 + exp(-dot(dq, dq) / .0018) * 1.3;
        float cres = exp(-pow((length(q) - .83) / .055, 2.)) * smoothstep(.35, .97, dot(normalize(q + vec2(1e-4)), cd));
        vec3 col = mix(inner, refl, F) + keyCol * (hl * specStr + (caus + cres * .42) * causStr) + uSunCol * sg * specStr;
        gl_FragColor = vec4(col, 1.);
      }`,
    defines: o.cyl ? { CYL: 1 } : {},
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
  sc.background = null; // transparent: the drop shader composites the prop over the refracted world
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
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace; rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
  const prevT = renderer.getRenderTarget(); const pc = new THREE.Color(); renderer.getClearColor(pc); const pa = renderer.getClearAlpha();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam); renderer.setRenderTarget(prevT);
  renderer.setClearColor(pc, pa);
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
  const u = { uSunDir: su.uSunDir, gT: { value: 0 }, master: { value: 1 }, pxScale: { value: 1 }, col: { value: C(o.color ?? '#ffc26a') }, gain: { value: o.gain ?? 1 }, sz: { value: new THREE.Vector2(...(o.size ?? [1, 1])) } };
  const m = new THREE.ShaderMaterial({
    // far glints: drawn in the opaque pass right after the sea (no depth test -> never clipped by wave crests), then the
    // opaque drops paint over them; near (front) glints: drawn last, in front of everything, as real foreground bokeh would be.
    uniforms: u, transparent: !!o.front, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 rnd; uniform float gT, master, pxScale, gain; uniform vec2 sz; uniform vec3 uSunDir; varying float vA; varying float vH;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; vec3 wp = (modelMatrix * vec4(position, 1.)).xyz;
        vec3 I = normalize(wp - cameraPosition); vec3 Rf = reflect(I, vec3(0., 1., 0.)); float gl = pow(max(dot(Rf, uSunDir), 0.), 5.);
        float tw = smoothstep(.25, 1., .5 + .5 * sin(gT * (.5 + rnd.x * 1.3) + rnd.y * 40.));
        vA = master * gain * (.2 + .8 * gl) * tw; vH = rnd.w; gl_PointSize = pxScale * sz.x * (46. + 110. * rnd.z * sz.y); }`,
    fragmentShader: `uniform vec3 col; varying float vA; varying float vH;
      void main(){ vec2 p = gl_PointCoord * 2. - 1.; float r = length(p); if (r > 1.) discard;
        float disc = smoothstep(1., .86, r); float rim = smoothstep(.62, .93, r) * disc;
        vec3 c = col * mix(vec3(1.), vec3(1.05, .9, .8), vH);
        gl_FragColor = vec4(c * (disc * .5 + rim * .45) * vA, 1.); }`,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.userData.uniformsD = u; pts.userData.noDepth = true; pts.renderOrder = o.front ? 50 : 1;
  return pts;
}

// ------------------------------------------------------------------------------------------------
// Shared continuous world for s09 + s10, evaluated at GLOBAL time T.
// ------------------------------------------------------------------------------------------------
export const DW = {
  v: .3, R: .045, Ti: [45.02, 45.27], P: [[-.072, -.05], [.066, .046]], sunDir: [.07, .03, -1], fingers: 16,
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
  if (T < 45.2) d = Math.exp(U.lerp(Math.log(1.02), Math.log(.93), U.prog(T, 41.5, 45.2, 'inOutSine')));
  else { const x = U.clamp((T - 45.2) / (49.8 - 45.2)); const e = U.ease.inOutSine(1 - Math.pow(1 - x, 1.7)); d = Math.exp(U.lerp(Math.log(.93), Math.log(46), e)); }
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
    const m = dropMat(su, { map: tex, imgK: i ? 1.25 : 1.2, wob2: .028, wob3: .012, wobF: 7.5 + i * 1.3, wobP: i * 2.1, rip: 1, keyDir: [-.5, .5, -.7] });
    const mesh = new THREE.Mesh(dropGeo, m); mesh.renderOrder = 2; scene.add(mesh); return mesh;
  });
  // specular sparkle on each drop's key highlight (a soft photographic star glint that twinkles as the surface wobbles)
  const starTex = TEX.drawTexture(256, 256, (x, w, h) => {
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.06, 'rgba(255,248,232,.85)'); g.addColorStop(.22, 'rgba(255,226,180,.18)'); g.addColorStop(1, 'rgba(255,210,150,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'lighter';
    const ray = (a, len, wd, al) => { x.save(); x.translate(128, 128); x.rotate(a); const lg = x.createLinearGradient(-len, 0, len, 0); lg.addColorStop(0, 'rgba(255,240,215,0)'); lg.addColorStop(.5, `rgba(255,250,240,${al})`); lg.addColorStop(1, 'rgba(255,240,215,0)'); x.fillStyle = lg; x.beginPath(); x.moveTo(-len, 0); x.lineTo(0, -wd); x.lineTo(len, 0); x.lineTo(0, wd); x.closePath(); x.fill(); x.restore(); };
    ray(.35, 124, 3.2, .95); ray(.35 + Math.PI / 2, 110, 3, .85); ray(.35 + Math.PI / 4, 60, 2, .35); ray(.35 - Math.PI / 4, 60, 2, .35);
  });
  W.stars = W.drops.map(() => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: '#fff3dc', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })); sp.userData.noDepth = true; sp.renderOrder = 40; scene.add(sp); return sp; });
  // splash parts: thin crown sheet (see-through), bodies of water (jet, beads) with the refracting water shader
  const sm = waterMat(su, { caus: .45, spec: .55, keyDir: [-.5, .5, -.7], clear: true, body: '#3a6a70' });
  const bm = dropMat(su, { keyDir: [-.5, .5, -.7], caus: .6, rimDark: .12, envGain: 1.7, tint: '#fff2e2', deep: '#2a2a36' }); W.beadMat = bm;
  const jm = waterMat(su, { caus: .3, spec: 1.3, keyDir: [-.5, .5, -.7], clear: true, body: '#3a6a70', baseA: .12, core: .07 }); W.jetMat = jm;
  const NF = DW.fingers;
  const crownProf = [[.84, -.05], [.88, .2], [.94, .6], [1.0, .86], [1.07, .98], [1.12, 1.0], [1.13, .94], [1.08, .8], [1.03, .55], [.98, .18], [.95, -.05]].map(([r, y]) => new THREE.Vector2(r, y));
  const crownGeo = new THREE.LatheGeometry(crownProf, 168); { const p = crownGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); const an = Math.atan2(z, x); const f = Math.pow(.5 + .5 * Math.cos(an * NF), 7); const k = U.smoothstep(.45, 1, y); p.setY(i, y + k * .62 * f); const rr = Math.hypot(x, z) * (1 + k * f * .07); p.setX(i, Math.cos(an) * rr); p.setZ(i, Math.sin(an) * rr); } crownGeo.computeVertexNormals(); }
  const jetProf = [[1.0, -.04], [.78, .04], [.5, .18], [.38, .42], [.33, .66], [.35, .8], [.42, .88], [.4, .95], [.24, .995], [.001, 1.0]].map(([r, y]) => new THREE.Vector2(r, y));
  const jetGeo = new THREE.LatheGeometry(jetProf, 64); jetGeo.computeVertexNormals();
  const sph = new THREE.SphereGeometry(1, 32, 24);
  W.splash = DW.P.map(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const crown = new THREE.Mesh(crownGeo, sm); const jet = new THREE.Mesh(jetGeo, jm); const tip = new THREE.Mesh(sph, bm);
    const fly = new THREE.InstancedMesh(sph, bm, NF); fly.frustumCulled = false; g.add(crown, jet, tip, fly); crown.userData.depthOk = jet.userData.depthOk = true; [crown, jet, tip, fly].forEach(m => (m.renderOrder = 2));
    const r = U.rng(31 + i); const parts = [];
    for (let k = 0; k < NF; k++) { const an = (k / NF) * Math.PI * 2; parts.push({ an, vo: .1 + r() * .09, vu: .16 + r() * .12, sz: .0034 + r() * .0026, td: .2 + r() * .12, stay: r() < .3 }); }
    return { g, crown, jet, tip, fly, parts };
  });
  // bokeh glints behind the drops (s09 view direction)
  const bok = bokehD(su, { count: 110, az0: 33 * DEG, spread: .5, d0: 1.1, d1: 5.5, y: .05, gain: o.bokehGain ?? .8 }); scene.add(bok); W.bok = bok;
  // large, dim near-field bokeh between camera and drops (keeps the lower frame from going dead black)
  const bokN = bokehD(su, { count: 26, az0: -142 * DEG, spread: .75, d0: .16, d1: .5, y: .01, gain: .32, size: [1.9, .8], seed: 23, color: '#ffb45e', front: true }); scene.add(bokN); W.bokN = bokN;
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
    const y = age > 0 ? DW.R * .95 * sq : dropY(i, T); d.position.set(x, y, z); mu.ctr.value.copy(d.position);
    ou.dropS.value[i].set(x, y, z, DW.R * (age > 0 ? sq : 1));
    mu.parallax.value.set(0, 0);
    // star glint at the key highlight: surface point whose normal bisects view and key directions
    const st = W.stars[i]; _v.copy(camera.position).sub(d.position).normalize().add(mu.keyDir.value).normalize();
    st.position.copy(d.position).addScaledVector(_v, DW.R * 1.02);
    const tw = .5 + .5 * Math.sin(T * (5.3 + i * 1.7) + i * 2.4) * Math.sin(T * 2.1 + i);
    const fade = 1 - U.smoothstep(-.1, -.015, age);
    st.material.opacity = fade * (.45 + .55 * tw); st.scale.setScalar(DW.R * (.85 + .4 * tw)); st.material.rotation = .15 * Math.sin(T * .9 + i); st.visible = st.material.opacity > .01;
  });
  W.drops.forEach((d, i) => { if (!d.visible) W.stars[i].visible = false; });
  W.beadMat.uniforms.gT.value = T; W.jetMat.uniforms.gT.value = T;
  // splash (slow motion): crown sheet with fingers whose tip beads pinch off, Worthington jet, jet-tip droplet
  const crownAt = a => { const ca = U.clamp(a / .48); return { ch: Math.sin(Math.PI * Math.pow(ca, .7)) * .034, cr: .034 + .034 * U.ease.outCubic(ca) }; }; // crowns never touch each other
  W.splash.forEach((s, i) => {
    const a = T - DW.Ti[i]; s.crown.material.uniforms.gT.value = T;
    const on = a > 0 && a < 2; s.g.visible = on; if (!on) return;
    // crown sheet
    const { ch, cr } = crownAt(a); s.crown.visible = ch > .002;
    s.crown.scale.set(cr, Math.max(ch, .001), cr);
    // Worthington jet
    const ja = U.clamp((a - .26) / .9); const jh = Math.sin(Math.PI * ja) * .17; s.jet.visible = ja > 0 && ja < 1 && jh > .004;
    const jr = .022 * (1 - .25 * ja); s.jet.scale.set(jr, Math.max(jh, .001), jr);
    // pinched-off droplet from the jet tip
    const pa = a - .6; if (pa > 0) { const h0 = .17 * Math.sin(Math.PI * U.clamp((.6 - .26) / .9)); const y = h0 + .16 * pa - .8 * pa * pa; s.tip.visible = y > -.01; s.tip.position.set(0, y + .01, 0); s.tip.scale.setScalar(.0095); }
    else { s.tip.visible = ja > .05; const y = jh; s.tip.position.set(0, y * .97, 0); s.tip.scale.setScalar(.008 * U.smoothstep(.05, .3, ja)); }
    // beads riding on the finger tips, most pinch off and fly ballistically (slow motion gravity)
    s.parts.forEach((p, k) => {
      let sc = p.sz * U.smoothstep(.03, .15, a);
      if (p.stay || a < p.td) { const c = crownAt(a); if (c.ch < .003) sc = 0; _v.set(Math.cos(p.an) * 1.2 * c.cr, 1.62 * c.ch + sc * .5, Math.sin(p.an) * 1.2 * c.cr); sc *= U.smoothstep(.002, .012, c.ch); }
      else { const c = crownAt(p.td); const t = a - p.td; const rr = 1.2 * c.cr + p.vo * t; const y = 1.62 * c.ch + p.sz * .5 + p.vu * t - .9 * t * t; if (y < -.004) sc = 0; _v.set(Math.cos(p.an) * rr, y, Math.sin(p.an) * rr); }
      _s.setScalar(Math.max(sc, 1e-5)); if (sc === 0) _v.set(0, -1, 0); _m4.compose(_v, _q.identity(), _s); s.fly.setMatrixAt(k, _m4);
    });
    s.fly.instanceMatrix.needsUpdate = true;
  });
  // bokeh
  [W.bok, W.bokN].forEach(b => { const bu = b.userData.uniformsD; bu.gT.value = T; bu.master.value = cam.bokeh; bu.pxScale.value = ctx.renderer.domElement.height / 1920; b.visible = cam.bokeh > .002; });
  // DOF
  let fz = 0, fn = 0; W.drops.forEach(d => { if (d.visible) { _v.copy(d.position).applyMatrix4(camera.matrixWorldInverse); fz += -_v.z; fn++; } });
  const focus = fn ? U.lerp(fz / fn, cam.d, U.smoothstep(45.0, 45.5, T)) : cam.d;
  post.dof.enabled = true; post.dof.focus = focus; post.dof.range = Math.max(.85, cam.d * .55); post.dof.amount = cam.dof;
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

// ------------------------------------------------------------------------------------------------
// s11 helpers: world-scaled UVs (no stretched "wood grain" on long stone slabs), fine carved-stone textures,
// fluted column parts, and a believable date palm (pinnate fronds built from real leaflet geometry).
// ------------------------------------------------------------------------------------------------
// Box-projected UVs from vertex positions (by dominant normal axis), `s` = texture tiles per world unit.
export function worldBoxUV(geo, s = 1, off = [0, 0, 0]) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + off[0], y = p.getY(i) + off[1], z = p.getZ(i) + off[2], ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v; if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
    uv[i * 2] = u * s; uv[i * 2 + 1] = v * s;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
}
// Fine sandstone / travertine / marble-free carved stone: tight grain, faint sedimentary bedding, tiny pits.
export function fineStoneMat(o = {}) {
  const seed = o.seed ?? 41; const f = TEX.fbmField(seed, 4, 5), gq = TEX.fbmField(seed + 7, 64, 2), bed = TEX.fbmField(seed + 3, 2, 3), pit = TEX.fbmField(seed + 13, 32, 2);
  const A = C(o.a ?? '#e8d2ad'), B = C(o.b ?? '#c9a77c'), D = C(o.d ?? '#a7845c');
  const pores = o.pores ?? 0, beds = o.beds ?? 7;
  const b = TEX.bake(o.size ?? 512, (u, v) => {
    const n = f(u, v) * .5 + .5, gr = gq(u, v) * .5 + .5, bd = bed(u, v);
    // horizontal bedding layers (v), gently warped
    const layer = .5 + .5 * Math.sin((v * beds + bd * .9 + n * .25) * Math.PI * 2); const lay = Math.pow(layer, 3);
    // travertine: elongated horizontal pores
    let pr = 0; if (pores) { const pp = pit(u * .5, v * 2.4); pr = U.smoothstep(.42, .62, pp) * pores; }
    const k = U.clamp(n * .55 + lay * .22 + gr * .28 - .12);
    const c = [U.lerp(A.r, B.r, k), U.lerp(A.g, B.g, k), U.lerp(A.b, B.b, k)].map((x, i) => U.lerp(x, [D.r, D.g, D.b][i], pr * .8));
    return { c: c.map(x => Math.pow(x, 1 / 2.2)), h: .5 + gr * .25 + n * .15 - pr * .45 + lay * .05, r: .78 + gr * .14 - pr * .1 };
  }, { normalStrength: o.ns ?? 1.6 });
  const rep = o.repeat ?? [1, 1];
  const map = TEX.texFromCanvas(b.colorCanvas, { repeat: rep, aniso: 8 }), rough = TEX.texFromCanvas(b.roughCanvas, { srgb: false, repeat: rep, aniso: 8 }), nrm = TEX.texFromCanvas(b.normalCanvas, { srgb: false, repeat: rep, aniso: 8 });
  return new THREE.MeshStandardMaterial({ map, roughnessMap: rough, normalMap: nrm, normalScale: new THREE.Vector2(o.nScale ?? .55, o.nScale ?? .55), roughness: 1, color: o.tint ?? '#ffffff' });
}
// Fluted column shaft (concave flutes meeting at soft arrises), open-ended, base at y=0, top at y=len.
export function flutedShaft(r, len, o = {}) {
  const nf = o.flutes ?? 20, per = o.segPer ?? 8, depth = o.depth ?? .07, hs = o.hSegs ?? 1;
  const geo = new THREE.CylinderGeometry(r, r, len, nf * per, hs, true); geo.translate(0, len / 2, 0);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); const th = Math.atan2(x, z); const ph = ((th / (2 * Math.PI)) * nf % 1 + 1) % 1; // 0..1 within a flute
    const fl = Math.sin(Math.PI * ph); const rr = r * (1 - depth * Math.pow(fl, .8)); p.setX(i, Math.sin(th) * rr); p.setZ(i, Math.cos(th) * rr);
  }
  geo.computeVertexNormals();
  const circ = 2 * Math.PI * r, s = o.uvScale ?? 1.4; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ * s, uv.getY(i) * len * s);
  return geo;
}

// Date palm: leaf-base patterned trunk, crown of arching pinnate fronds (real leaflets), a skirt of dry fronds.
let _palmTrunkMat = null;
function palmTrunkMat() {
  if (_palmTrunkMat) return _palmTrunkMat;
  const nz = TEX.fbmField(61, 8, 3), fib = TEX.fbmField(67, 64, 2);
  const A = C('#9a8264'), B = C('#6c573f'), G = C('#3e3024');
  const b = TEX.bake(256, (u, v) => {
    const fx = u * 5, fy = v * 6; const row = Math.floor(fy); const lx = ((fx + (row % 2) * .5) % 1 + 1) % 1 - .5, ly = fy - row;
    const e = ly - .22 * (1 - 4 * lx * lx); // lower edge of the boot above
    const groove = 1 - U.smoothstep(0, .16, e); const side = U.smoothstep(.36, .5, Math.abs(lx)) * .6;
    const n = nz(u, v) * .5 + .5, fb = fib(u, v * .3) * .5 + .5;
    const k = U.clamp(n * .5 + fb * .4 + (1 - ly) * .25 - .2);
    let c = [U.lerp(A.r, B.r, k), U.lerp(A.g, B.g, k), U.lerp(A.b, B.b, k)]; const gk = U.clamp(groove + side); c = c.map((x, i) => U.lerp(x, [G.r, G.g, G.b][i], gk * .75));
    return { c: c.map(x => Math.pow(x, 1 / 2.2)), h: (1 - ly) * .55 - groove * .5 - side * .3 + fb * .15, r: .92 };
  }, { normalStrength: 3 });
  _palmTrunkMat = new THREE.MeshStandardMaterial({ map: TEX.texFromCanvas(b.colorCanvas, { repeat: [1, 1] }), normalMap: TEX.texFromCanvas(b.normalCanvas, { srgb: false }), normalScale: new THREE.Vector2(1.1, 1.1), roughness: .95 });
  return _palmTrunkMat;
}
export function palmD(o = {}) {
  const R = U.rng(o.seed ?? 9), H = o.height ?? 7, lean = o.lean ?? .25, la = o.leanAz ?? 0, g = new THREE.Group();
  const s = H / 7;
  // trunk
  const r0 = .25 * s, r1 = .17 * s; const tg = new THREE.CylinderGeometry(r1, r0, H, 16, 28, true); tg.translate(0, H / 2, 0);
  const bendAt = y => { const q = y / H; return lean * H * .16 * q * q; };
  { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const b = bendAt(y); p.setX(i, p.getX(i) + Math.cos(la) * b); p.setZ(i, p.getZ(i) + Math.sin(la) * b); } tg.computeVertexNormals();
    const uv = tg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * H / 1.05); }
  const trunk = new THREE.Mesh(tg, palmTrunkMat()); g.add(trunk);
  const top = new THREE.Vector3(Math.cos(la) * bendAt(H), H, Math.sin(la) * bendAt(H));
  // crown boss (leaf bases)
  const boss = new THREE.Mesh(new THREE.SphereGeometry(r1 * 1.55, 16, 12), palmTrunkMat()); boss.scale.set(1, 1.25, 1); boss.position.copy(top).add(new THREE.Vector3(0, -.05 * s, 0)); g.add(boss);
  // fronds
  const pos = [], col = [], idx = []; let vi = 0;
  const greens = ['#6f8b4d', '#5f7d42', '#7b955a', '#68844a', '#829c5e'].map(c => C(c));
  const tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const frond = (az, el, L, droop, colr, nLeaf, dry) => {
    const d0 = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
    const P = sv => top.clone().addScaledVector(d0, sv * L).add(new THREE.Vector3(0, -droop * L * sv * sv, 0));
    const Tn = sv => d0.clone().multiplyScalar(L).add(new THREE.Vector3(0, -2 * droop * L * sv, 0)).normalize();
    // rachis (thin ribbon)
    for (let k = 0; k < nLeaf; k++) {
      const sv = .1 + .88 * (k / (nLeaf - 1)); const p0 = P(sv), t0 = Tn(sv);
      const sd = tmp.crossVectors(t0, up).normalize().clone(); const nUp = new THREE.Vector3().crossVectors(sd, t0).normalize();
      const ll = L * (dry ? .13 : .2) * Math.pow(Math.sin(Math.PI * (sv * .86 + .07)), .65) * (.85 + R() * .3);
      for (const side of [-1, 1]) {
        const dir = t0.clone().multiplyScalar(.5).addScaledVector(sd, side * .85).addScaledVector(nUp, dry ? -.25 : .32).normalize();
        const w = ll * .085, sag = ll * (dry ? .35 : .16);
        const pts = [0, .5, 1].map(q => p0.clone().addScaledVector(dir, ll * q).add(new THREE.Vector3(0, -sag * q * q, 0)));
        const across = new THREE.Vector3().crossVectors(dir, nUp).normalize();
        const ws = [w * .55, w, 0];
        const cc = colr.clone().offsetHSL((R() - .5) * .02, (R() - .5) * .08, (R() - .5) * .06 + (sv > .8 ? .04 : 0));
        for (let q = 0; q < 3; q++) { const a = pts[q].clone().addScaledVector(across, ws[q] * .5), b = pts[q].clone().addScaledVector(across, -ws[q] * .5); pos.push(a.x, a.y, a.z, b.x, b.y, b.z); for (let j = 0; j < 2; j++) col.push(cc.r * (q === 2 ? 1.08 : 1), cc.g * (q === 2 ? 1.08 : 1), cc.b); }
        idx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2, vi + 2, vi + 3, vi + 4); vi += 6;
      }
    }
    // rachis strip
    const rc = colr.clone().offsetHSL(0, -.1, .08);
    for (let k = 0; k <= 12; k++) { const sv = k / 12; const p0 = P(sv), t0 = Tn(sv); const sd = tmp.crossVectors(t0, up).normalize(); const wv = .035 * s * (1 - sv * .8); pos.push(p0.x + sd.x * wv, p0.y + .01, p0.z + sd.z * wv, p0.x - sd.x * wv, p0.y + .01, p0.z - sd.z * wv); col.push(rc.r, rc.g, rc.b, rc.r, rc.g, rc.b); if (k < 12) idx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2); vi += 2; }
  };
  const nF = o.fronds ?? 24, GA = 2.39996;
  for (let i = 0; i < nF; i++) {
    const q = i / nF; const az = i * GA + R() * .2; const el = U.lerp(1.05, -.55, q) + (R() - .5) * .2;
    const L = H * (.42 + R() * .08) * (q < .15 ? .8 : 1); const droop = U.lerp(.12, .55, q) + R() * .1;
    frond(az, el, L, droop, greens[Math.floor(R() * greens.length)], 30, false);
  }
  // dry skirt
  for (let i = 0; i < (o.dry ?? 6); i++) { const az = i * 1.9 + R(); frond(az, -1.05 - R() * .3, H * .3, .15, C('#9b7a4c').offsetHSL(0, 0, (R() - .5) * .08), 18, true); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); fg.setIndex(idx); fg.computeVertexNormals();
  const fm = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .72, metalness: 0 });
  const fr = new THREE.Mesh(fg, fm); g.add(fr);
  // small, dark date bunches tucked under the crown (realistic size)
  const dm = new THREE.MeshStandardMaterial({ color: '#5e3016', roughness: .5 }); const dg = new THREE.SphereGeometry(.022 * s, 6, 5); dg.scale(1, 1.4, 1);
  const nb = o.bunches ?? 0;
  if (nb > 0) { const inst = new THREE.InstancedMesh(dg, dm, nb * 40); let n = 0; const m4 = new THREE.Matrix4();
    for (let b = 0; b < nb; b++) { const a = b * 2.6 + R(); const c0 = top.clone().add(new THREE.Vector3(Math.cos(a) * .32 * s, -.45 * s, Math.sin(a) * .32 * s)); for (let k = 0; k < 40; k++) { const t = k / 40; const pp = c0.clone().add(new THREE.Vector3((R() - .5) * .16 * s, -t * .38 * s, (R() - .5) * .16 * s)); m4.makeTranslation(pp.x, pp.y, pp.z); inst.setMatrixAt(n++, m4); } }
    g.add(inst); }
  return shadowAll(g);
}
