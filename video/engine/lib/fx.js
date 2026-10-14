// Effects: particles (dust motes, sparkles, sand), light shafts, flames, glows, smoke, ocean water.
// All animated via uniforms.time (the engine sets userData.uniforms.time = local scene time each frame).
import * as THREE from 'three';
import { rng } from './util.js';
import { softDot, noiseTex } from './textures.js';

// Pixel-size factor for GL point sprites so they look the same at any --scale (tuned at preview scale 0.5).
export const PX = { scale: 1 };

// ---- Floating dust motes / embers / sparkles (GPU-animated points) ----------------------------
// o: {count, center:[x,y,z], box:[sx,sy,sz], color, size(px at 1m), opacity, drift:[x,y,z] (m/s), swirl, twinkle, seed, additive}
export function particles(o = {}) {
  const n = o.count ?? 400, r = rng(o.seed ?? 7), box = o.box ?? [4, 3, 4], c = o.center ?? [0, 1.5, 0];
  const pos = new Float32Array(n * 3), rnd = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { pos[i * 3] = (r() - .5) * box[0]; pos[i * 3 + 1] = (r() - .5) * box[1]; pos[i * 3 + 2] = (r() - .5) * box[2]; rnd[i * 4] = r(); rnd[i * 4 + 1] = r(); rnd[i * 4 + 2] = r(); rnd[i * 4 + 3] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 4));
  const u = {
    time: { value: 0 }, map: { value: softDot(64, o.hardness ?? 0) }, color: { value: new THREE.Color(o.color ?? '#ffe2a8') },
    size: { value: o.size ?? 22 }, opacity: { value: o.opacity ?? .8 }, box: { value: new THREE.Vector3(...box) },
    drift: { value: new THREE.Vector3(...(o.drift ?? [0.02, 0.03, 0])) }, swirl: { value: o.swirl ?? 0.15 }, twinkle: { value: o.twinkle ?? 0.5 },
    fadeIn: { value: o.fadeIn ?? 0 }, master: { value: o.master ?? 1 }, pxScale: { value: PX.scale },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    vertexShader: `uniform float time, size, swirl, twinkle, pxScale; uniform vec3 box, drift; attribute vec4 rnd; varying float vA;
      void main(){ vec3 p = position + drift * time; p += swirl * vec3(sin(time*.7 + rnd.x*40.), sin(time*.5 + rnd.y*40.)*.6, cos(time*.6 + rnd.z*40.));
        p = mod(p + box*.5, box) - box*.5; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        float tw = mix(1., .5 + .5*sin(time*(1.5+rnd.w*3.) + rnd.x*30.), twinkle);
        vec3 e = abs(p) / (box*.5); float edge = 1. - smoothstep(.8, 1., max(max(e.x, e.y), e.z));
        vA = tw * edge; gl_PointSize = size * pxScale * (.4 + rnd.y) * (1. / -mv.z) * 10.; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 color; uniform float opacity, master; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color, t.a * vA * opacity * master); }`,
  });
  const pts = new THREE.Points(g, m); pts.position.set(...c); pts.frustumCulled = false; pts.userData.uniforms = u; pts.userData.noDepth = true; pts.renderOrder = 10;
  return pts;
}

// ---- Volumetric-looking light shaft (additive cone with soft edges) ----------------------------
// o: {from:[x,y,z], to:[x,y,z], r0 (radius at source), r1 (radius at end), color, opacity, noise}
export function lightShaft(o = {}) {
  const from = new THREE.Vector3(...(o.from ?? [0, 5, 0])), to = new THREE.Vector3(...(o.to ?? [0, 0, 0]));
  const len = from.distanceTo(to);
  const geo = new THREE.CylinderGeometry(o.r0 ?? .3, o.r1 ?? 1.2, len, 48, 1, true); geo.translate(0, -len / 2, 0);
  const u = { time: { value: 0 }, color: { value: new THREE.Color(o.color ?? '#ffd9a0') }, opacity: { value: o.opacity ?? .25 }, noise: { value: noiseTex({ size: 128, seed: 41, base: 3 }) }, len: { value: len } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vN, vV; varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 color; uniform float opacity, time; uniform sampler2D noise; varying vec3 vN, vV; varying vec2 vUv;
      void main(){ float f = abs(dot(normalize(vN), normalize(vV))); f = pow(f, 1.6);
        float along = smoothstep(0., .15, vUv.y) * smoothstep(1., .55, 1. - vUv.y + .0);
        float n = texture2D(noise, vec2(vUv.x*2. + time*.01, vUv.y*.6 - time*.03)).r;
        gl_FragColor = vec4(color, f * along * opacity * (.6 + .8*n)); }`,
  });
  const mesh = new THREE.Mesh(geo, m); mesh.position.copy(from);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), to.clone().sub(from).normalize());
  mesh.userData.uniforms = u; mesh.userData.noDepth = true; mesh.renderOrder = 5;
  return mesh;
}

// ---- Candle / lamp flame (camera-facing in Y, animated teardrop shader) ----------------------
// Engine auto-rotates objects with userData.yBillboard to face the camera around Y.
export function flame(o = {}) {
  const h = o.height ?? .06, w = o.width ?? h * .45;
  const geo = new THREE.PlaneGeometry(w * 2.2, h * 2.2, 1, 1); geo.translate(0, h * .8, 0);
  const u = { time: { value: 0 }, seed: { value: o.seed ?? 1 }, core: { value: new THREE.Color(o.core ?? '#fff6d8') }, mid: { value: new THREE.Color(o.mid ?? '#ffb23e') }, edge: { value: new THREE.Color(o.edge ?? '#ff5a1a') }, intensity: { value: o.intensity ?? 4 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time, seed, intensity; uniform vec3 core, mid, edge; varying vec2 vUv;
      void main(){ vec2 p = vUv*2.-1.; p.y += .25;
        float sway = sin(time*7.+seed*3.)*.05 + sin(time*13.+seed)*.025; p.x -= sway*(p.y+1.);
        float flick = 1. + .06*sin(time*23.+seed*5.);
        float r = length(vec2(p.x*1.9, (p.y > 0. ? p.y*.62/flick : p.y*1.25)));
        float body = smoothstep(1., .2, r); float hot = smoothstep(.55, .0, r);
        vec3 c = mix(edge, mid, smoothstep(.0, .6, body)); c = mix(c, core, hot);
        float blue = smoothstep(.4, .0, length(vec2(p.x*2., p.y + .75))) * .5;
        c += vec3(.2,.35,1.) * blue;
        gl_FragColor = vec4(c * intensity, body); }`,
  });
  const mesh = new THREE.Mesh(geo, m); mesh.userData.uniforms = u; mesh.userData.yBillboard = true; mesh.userData.noDepth = true; mesh.renderOrder = 20;
  return mesh;
}

// ---- Soft additive glow halo (sprite) ----------------------------------------------------
export function glow(o = {}) {
  const m = new THREE.SpriteMaterial({ map: softDot(128, 0), color: new THREE.Color(o.color ?? '#ffb347'), transparent: true, opacity: o.opacity ?? .6, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: o.depthTest ?? true });
  const s = new THREE.Sprite(m); s.scale.setScalar(o.size ?? .5); s.userData.noDepth = true; s.renderOrder = 15; return s;
}

// ---- Smoke / dust cloud puffs (soft noisy sprites drifting) ---------------------------------
// o: {count, center, box, color, size(world), opacity, drift:[x,y,z], seed}
export function dustClouds(o = {}) {
  const grp = new THREE.Group(); const r = rng(o.seed ?? 3); const n = o.count ?? 20; const box = o.box ?? [10, 3, 10];
  const tex = cloudSprite(); const items = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(o.color ?? '#c9a274'), transparent: true, opacity: 0, depthWrite: false, rotation: r() * 6.28 });
    const s = new THREE.Sprite(m); const base = new THREE.Vector3((r() - .5) * box[0], (r() - .5) * box[1], (r() - .5) * box[2]);
    s.userData.noDepth = true; items.push({ s, base, sz: (o.size ?? 3) * (.6 + r() * .8), ph: r(), rot: (r() - .5) * .3 }); grp.add(s);
  }
  if (o.center) grp.position.set(...o.center);
  const drift = new THREE.Vector3(...(o.drift ?? [.6, .05, 0])); const op = o.opacity ?? .35;
  grp.userData.update = (t) => { items.forEach(it => { const life = ((t * (o.speed ?? .08) + it.ph) % 1); const p = it.base.clone().addScaledVector(drift, life * 10 - 5); p.x = ((p.x + box[0] / 2) % box[0] + box[0]) % box[0] - box[0] / 2; it.s.position.copy(p); it.s.scale.setScalar(it.sz * (.8 + life * .6)); it.s.material.opacity = op * Math.sin(life * Math.PI); it.s.material.rotation += 0; }); };
  return grp;
}
let _cloudTex = null;
export function cloudSprite() {
  if (_cloudTex) return _cloudTex;
  const n = noiseTex({ size: 256, seed: 77, base: 3, octaves: 5, contrast: 1.4 });
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const src = n.image; x.drawImage(src, 0, 0); const im = x.getImageData(0, 0, 256, 256);
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) { const p = (j * 256 + i) * 4; const d = Math.hypot(i - 128, j - 128) / 128; const fall = Math.max(0, 1 - d); const v = im.data[p] / 255; im.data[p + 3] = Math.min(255, 255 * Math.pow(fall, 1.5) * (0.35 + v * 0.9)); im.data[p] = im.data[p + 1] = im.data[p + 2] = 255; }
  x.putImageData(im, 0, 0); _cloudTex = new THREE.CanvasTexture(c); _cloudTex.colorSpace = THREE.SRGBColorSpace; return _cloudTex;
}

// ---- Stylized ocean / water surface (vertex waves, fresnel, sun glint) -----------------------
// o: {size, segments, deep, shallow, sky (reflection tint), sunDir:[x,y,z], sunColor, amp, choppy, foam}
export function ocean(o = {}) {
  const size = o.size ?? 200, seg = o.segments ?? 256;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const u = {
    time: { value: 0 }, deep: { value: new THREE.Color(o.deep ?? '#0b3b5c') }, shallow: { value: new THREE.Color(o.shallow ?? '#1f7a8c') }, sky: { value: new THREE.Color(o.sky ?? '#f6c48d') },
    sunDir: { value: new THREE.Vector3(...(o.sunDir ?? [0, .2, -1])).normalize() }, sunColor: { value: new THREE.Color(o.sunColor ?? '#fff0c8') }, amp: { value: o.amp ?? .35 }, choppy: { value: o.choppy ?? 1 },
    ripples: { value: new THREE.Vector4(0, 0, -100, 0) }, // x,z center, start time, strength (for drop impacts)
    ripples2: { value: new THREE.Vector4(0, 0, -100, 0) },
    fogColor: { value: new THREE.Color(o.fogColor ?? '#f2c592') }, fogNear: { value: o.fogNear ?? 20 }, fogFar: { value: o.fogFar ?? 120 },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: `uniform float time, amp, choppy; uniform vec4 ripples, ripples2; varying vec3 vW, vN; varying float vFoam;
      vec3 gw(vec2 p, vec2 d, float wl, float a, float sp, inout vec3 T, inout vec3 B){ float k = 6.2831/wl; float f = k*(dot(d,p) - sp*time); float q = choppy*.5;
        T += vec3(-q*d.x*d.x*a*k*sin(f), d.x*a*k*cos(f), -q*d.x*d.y*a*k*sin(f)); B += vec3(-q*d.x*d.y*a*k*sin(f), d.y*a*k*cos(f), -q*d.y*d.y*a*k*sin(f));
        return vec3(q*d.x*a*cos(f), a*sin(f), q*d.y*a*cos(f)); }
      float rip(vec2 p, vec4 r){ float age = time - r.z; if (age < 0. || age > 6.) return 0.; float d = length(p - r.xy); float w = d - age*2.2; return r.w * exp(-w*w*3.) * sin(w*9.) * exp(-age*.6) / (1. + d*.6); }
      void main(){ vec3 p = (modelMatrix*vec4(position,1.)).xyz; vec3 T = vec3(1,0,0), B = vec3(0,0,1); vec3 o = vec3(0);
        o += gw(p.xz, normalize(vec2(1., .3)), 18., amp, 2.2, T, B); o += gw(p.xz, normalize(vec2(-.4, 1.)), 9., amp*.5, 1.6, T, B);
        o += gw(p.xz, normalize(vec2(.7, .7)), 4.5, amp*.22, 1.2, T, B); o += gw(p.xz, normalize(vec2(-.9, .2)), 2.1, amp*.1, .9, T, B);
        float rr = rip(p.xz, ripples) + rip(p.xz, ripples2); o.y += rr;
        p += o; vW = p; vN = normalize(cross(B, T)); vFoam = clamp(o.y / (amp*1.4), 0., 1.);
        gl_Position = projectionMatrix*viewMatrix*vec4(p,1.); }`,
    fragmentShader: `uniform vec3 deep, shallow, sky, sunColor, fogColor; uniform vec3 sunDir; uniform float fogNear, fogFar; varying vec3 vW, vN; varying float vFoam;
      void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); float fr = pow(1. - max(dot(N, V), 0.), 4.); fr = .03 + .97*fr;
        vec3 water = mix(deep, shallow, pow(vFoam, 2.) * .8 + .1);
        vec3 R = reflect(-V, N); float s = pow(max(dot(R, normalize(sunDir)), 0.), 220.) * 6. + pow(max(dot(R, normalize(sunDir)), 0.), 18.) * .35;
        vec3 c = mix(water, sky, fr) + sunColor * s;
        c += vec3(1.) * smoothstep(.75, 1., vFoam) * .25;
        float d = length(cameraPosition - vW); c = mix(c, fogColor, smoothstep(fogNear, fogFar, d));
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, m); mesh.userData.uniforms = u; mesh.receiveShadow = false; return mesh;
}
