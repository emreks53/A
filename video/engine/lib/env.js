// Environment: HDR image-based lighting, procedural sky dome, light rigs.
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const hdrCache = new Map();
// Available HDRIs (CC0, Poly Haven, 1k) in assets/hdri — used for lighting/reflections (IBL):
export const HDRIS = ['kiara_1_dawn', 'goegap_road', 'qwantani_dusk_2_puresky', 'kloppenheim_02_puresky', 'satara_night_no_lamps',
  'fireplace', 'old_hall', 'kiara_interior', 'qwantani_sunset_puresky', 'kloofendal_48d_partly_cloudy_puresky'];

// Returns PMREM env texture. Use: scene.environment = await loadHDR(renderer, 'kiara_1_dawn'); scene.environmentIntensity = 0.8
// Optionally also get the equirect texture for a visible (blurred) background: {env, equirect}
export async function loadHDR(renderer, name, { withEquirect = false } = {}) {
  const key = name;
  if (!hdrCache.has(key)) {
    const tex = await new HDRLoader().loadAsync(`assets/hdri/${name}_1k.hdr`);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(tex).texture; pm.dispose();
    hdrCache.set(key, { env, equirect: tex });
  }
  const c = hdrCache.get(key);
  return withEquirect ? c : c.env;
}

// Procedural gradient sky dome with sun disc + glow, optional stars and soft clouds.
// opts: {top, mid, horizon, bottom, sunDir:[x,y,z], sunColor, sunSize(0..1), sunGlow, stars(0..1), clouds(0..1), cloudColor, radius}
export function skyDome(o = {}) {
  const u = {
    top: { value: new THREE.Color(o.top ?? '#2a4f8f') },
    mid: { value: new THREE.Color(o.mid ?? '#6f9fd0') },
    horizon: { value: new THREE.Color(o.horizon ?? '#f3c58a') },
    bottom: { value: new THREE.Color(o.bottom ?? '#c9925a') },
    sunDir: { value: new THREE.Vector3(...(o.sunDir ?? [0.3, 0.15, -1])).normalize() },
    sunColor: { value: new THREE.Color(o.sunColor ?? '#fff1c9') },
    sunSize: { value: o.sunSize ?? 0.02 },
    sunGlow: { value: o.sunGlow ?? 0.6 },
    stars: { value: o.stars ?? 0 },
    clouds: { value: o.clouds ?? 0 },
    cloudColor: { value: new THREE.Color(o.cloudColor ?? '#ffe6c8') },
    time: { value: 0 },
    intensity: { value: o.intensity ?? 1 },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix*vec4(position,0.)).xyz); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `
      uniform vec3 top, mid, horizon, bottom, sunDir, sunColor, cloudColor; uniform float sunSize, sunGlow, stars, clouds, time, intensity;
      varying vec3 vDir;
      float h(vec3 p){ p = fract(p*0.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float a=0., w=.5; for(int i=0;i<5;i++){ a+=w*n3(p); p*=2.03; w*=.5;} return a; }
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        vec3 c = y > 0. ? mix(horizon, mid, smoothstep(0.0, 0.25, y)) : mix(horizon, bottom, smoothstep(0.0, -0.2, y));
        c = y > 0. ? mix(c, top, smoothstep(0.2, 0.9, y)) : c;
        float sd = max(dot(d, normalize(sunDir)), 0.);
        c += sunColor * (pow(sd, 24.) * 0.18 + pow(sd, 220.) * 0.45) * sunGlow;
        c = mix(c, sunColor * 3.0, smoothstep(1. - sunSize * 0.02, 1. - sunSize * 0.015, sd));
        if (stars > 0.) { vec3 sp = floor(d * 420.); float s = step(0.9985, h(sp)) * smoothstep(0.02, 0.3, y); float tw = 0.6 + 0.4 * sin(time * 2. + h(sp + 3.) * 40.); c += vec3(1.,.95,.85) * s * stars * tw * 1.5; }
        if (clouds > 0. && y > -0.02) { vec2 uv = d.xz / (y + 0.12); float cl = fbm(vec3(uv * 1.3 + vec2(time * 0.01, 0.), 1.)); cl = smoothstep(0.5, 0.85, cl) * clouds * smoothstep(-0.02, 0.15, y);
          vec3 cc = cloudColor * (0.75 + 0.5 * pow(sd, 4.)); c = mix(c, cc, cl); }
        gl_FragColor = vec4(c * intensity, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(o.radius ?? 500, 48, 24), m);
  mesh.frustumCulled = false; mesh.renderOrder = -1000; mesh.layers.enable(1);
  mesh.userData.noDepth = true;
  mesh.userData.uniforms = u;
  return mesh;
}

// Sun/key light with soft shadows. size = half-extent of shadow frustum (world units around target)
export function sunLight({ color = '#fff0d6', intensity = 3, pos = [6, 10, 4], target = [0, 0, 0], size = 8, mapSize = 2048, bias = -0.0004, normalBias = 0.02, radius = 3 } = {}) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.set(...pos); l.target.position.set(...target); l.castShadow = true;
  l.shadow.mapSize.set(mapSize, mapSize); const c = l.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 0.1; c.far = 200;
  l.shadow.bias = bias; l.shadow.normalBias = normalBias; l.shadow.radius = radius;
  return l;
}

// Warm practical light (candle/lamp) with optional flicker (call flicker(l, t, seed) each frame)
export function pointLight({ color = '#ffb35c', intensity = 6, distance = 6, decay = 2, pos = [0, 1, 0], castShadow = false, mapSize = 512 } = {}) {
  const l = new THREE.PointLight(color, intensity, distance, decay); l.position.set(...pos);
  if (castShadow) { l.castShadow = true; l.shadow.mapSize.set(mapSize, mapSize); l.shadow.bias = -0.002; l.shadow.radius = 4; }
  l.userData.baseIntensity = intensity; return l;
}
export function flicker(light, t, seed = 1, amount = 0.15) {
  const s = Math.sin(t * 13.1 + seed) * .5 + Math.sin(t * 7.3 + seed * 2.1) * .3 + Math.sin(t * 23.7 + seed * .7) * .2;
  light.intensity = light.userData.baseIntensity * (1 + s * amount);
}
