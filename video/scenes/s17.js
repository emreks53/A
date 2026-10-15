// s17 (97.10–100.50) "çağının en büyüklerinden olan İngiliz tarihçi Edward Gibbon;"
// Visual: Gibbon's garden summer-house in Lausanne, a June night in 1787. Camera opens on the open casement window:
// moon over the Savoy Alps, its silver path on Lake Geneva, acacias of the garden in silhouette, a few village lights
// on the far shore; muslin curtains breathe in the night air. The camera sinks to the candle-lit desk: the finished
// manuscript with the quill laid down on it, inkwell, and the six quarto volumes of "The Decline and Fall of the
// Roman Empire". Same name-card design as s16 (Carlyle), warm-gold accent: "İngiliz tarihçi · 1737–1794" on
// "İngiliz", "EDWARD GIBBON" on "Edward", "Roma İmparatorluğu'nun Çöküşü (1776–1789)" + pointer to the volumes.
import * as THREE from 'three';
import * as G from '../engine/lib/extra_G.js';

let R = {};
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

// Hi-res copy of extra_G.tome (512-px-wide spine texture instead of 256) so the gilt spine titles stay crisp at 1080p.
// Spine at -x, front cover at +z, fore-edge at +x (identical layout/behaviour to G.tome; kept local so s15/s16 are untouched).
function tomeHi(ctx, o) {
  const { MODELS: M, TEX, U } = ctx;
  const g = new THREE.Group(); const w = o.w, h = o.h, d = o.d, ct = o.ct ?? .004;
  const leather = M.MAT.leather({ a: o.a, b: o.b, seed: o.seed });
  const pageTex = TEX.drawTexture(64, 256, (x, W, H) => { x.fillStyle = '#ecdfc0'; x.fillRect(0, 0, W, H); for (let i = 0; i < H; i += 2) { x.fillStyle = `rgba(120,90,50,${0.07 + (i % 6 === 0 ? .08 : 0)})`; x.fillRect(0, i, W, 1); } });
  const pages = new THREE.Mesh(M.rbox(w - .008, h - .012, d - ct * 2, .002, 2), new THREE.MeshStandardMaterial({ map: pageTex, roughness: .95 })); pages.position.x = .002; g.add(pages);
  const front = new THREE.Mesh(M.rbox(w, h, ct, .0018, 2), leather); front.position.z = d / 2 - ct / 2; g.add(front);
  const back = front.clone(); back.position.z = -d / 2 + ct / 2; g.add(back);
  const SW = 512, SH = Math.min(2048, Math.round(SW * h / (Math.PI * d / 2)));
  const tex = TEX.drawTexture(SW, SH, (x, W, H) => { x.fillStyle = o.spineBg; x.fillRect(0, 0, W, H); const r = U.rng(o.seed); for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(0,0,0,${r() * .08})`; x.fillRect(r() * W, r() * H, 3 + r() * 10, 3 + r() * 10); } o.spineDraw(x, W, H); });
  tex.anisotropy = 8;
  const spineMat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: .55, sheen: .4, sheenColor: new THREE.Color('#ffd8b0'), sheenRoughness: .6, clearcoat: .15, clearcoatRoughness: .4 });
  const sw = o.spineFlat ?? .45;
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, h, 40, 1, true, Math.PI, Math.PI), spineMat); spine.scale.x = sw; spine.position.x = -w / 2 + .001; g.add(spine);
  const bg = new THREE.Group(); bg.position.x = -w / 2 + .001; bg.scale.x = sw; g.add(bg);
  for (const yy of o.raised) { const band = new THREE.Mesh(new THREE.TorusGeometry(d / 2, .0024, 6, 32, Math.PI), o.bandMat); band.rotation.set(Math.PI / 2, 0, Math.PI / 2); band.position.y = yy * h; bg.add(band); }
  return M.shadowAll(g);
}

// Candle flame: teardrop with a blue root, white-hot inner cone, orange mantle, slow lean + fast flicker (billboard).
function candleFlame({ h = .034, w = .02, seed = 1, inten = 2.6 } = {}) {
  const geo = new THREE.PlaneGeometry(w, h / .8); geo.translate(0, h / .8 * .3, 0); // base of the flame at y = 0
  const u = { time: { value: 0 }, seed: { value: seed }, inten: { value: inten } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time, seed, inten; varying vec2 vUv;
      void main(){
        float t = time + seed * 7.3;
        float flick = .93 + .05 * sin(t * 17.3) * sin(t * 6.1 + 1.3) + .03 * sin(t * 29.7);
        float y = (vUv.y - .2) / .8 / flick;                       // 0 at the wick .. 1 at the tip
        float lean = (sin(t * 1.9) * .6 + sin(t * 3.7 + 2.) * .4) * .07;
        float x = (vUv.x - .5) * 2. - lean * y * y * 2.2 - sin(t * 9. + y * 6.) * .025 * y * y;
        float yc = clamp(y, 0., 1.);
        float wdt = 1.05 * pow(yc, .42) * pow(1. - yc, .85) + .001;  // teardrop profile (widest ~1/3 up)
        float d = abs(x) / wdt;
        float body = smoothstep(1.0, .62, d) * smoothstep(-.06, .05, y) * smoothstep(1.0, .82, y);
        float core = smoothstep(.62, .12, d) * smoothstep(.04, .2, y) * smoothstep(.78, .32, y);
        vec3 c = mix(vec3(1., .34, .05), vec3(1., .7, .22), smoothstep(0., .7, 1. - d));
        c = mix(c, vec3(1., .96, .84), core);
        float root = smoothstep(.3, .0, y) * smoothstep(1.1, .2, d);
        c = mix(c, vec3(.18, .32, 1.) * .55, root * .75);
        c *= mix(.9, 1.15, smoothstep(.2, .6, y)) * (1. - .35 * smoothstep(.75, 1., y));
        float a = body * (1. - root * .35);
        gl_FragColor = vec4(c * inten, a); }`,
  });
  const mesh = new THREE.Mesh(geo, m); mesh.userData.uniforms = u; mesh.userData.yBillboard = true; mesh.userData.noDepth = true; mesh.renderOrder = 20;
  return mesh;
}
// Invisible depth stand-in for a flame: draws nothing in the beauty pass (no colour, no depth) but is rendered
// by the engine's DOF depth pre-pass, so the flame keeps the candle's focus distance instead of the far window's.
// Wax without MeshPhysical transmission (a visible transmissive object forces three.js to render the whole scene a
// second time for the transmission buffer — ~2x frame cost). The translucent glow of the wax under the flame is
// faked with a world-height emissive ramp instead.
function waxGlow(group, topY) {
  const mats = new Set(); group.traverse(o => { if (o.isMesh && o.material && o.material.transmission > 0) mats.add(o.material); });
  mats.forEach(mat => {
    mat.transmission = 0; mat.roughness = .5;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTop = { value: topY };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWY;').replace('#include <project_vertex>', '#include <project_vertex>\n vWY = (modelMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTop; varying float vWY;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(1., .52, .2) * (.5 * smoothstep(uTop - .045, uTop, vWY) + .07 * smoothstep(uTop - .22, uTop, vWY));');
    };
    mat.customProgramCacheKey = () => 'waxGlow' + topY.toFixed(4); mat.needsUpdate = true;
  });
}
function depthProxy(rx, ry) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  m.scale.set(rx, ry, rx); return m;
}
// Progress 0..1 over [T0, T1] whose SPEED is a constant base drift plus an asymmetric raised-cosine bump (rises t0..tm,
// falls tm..t1). Closed-form integral -> C1 speed everywhere: no knot kinks, no stall, never dead still.
function bellProg({ T0, T1, t0, tm, t1, base }) {
  const r = tm - t0, f = t1 - tm;
  const I = t => t <= t0 ? 0 : t <= tm ? (t - t0) / 2 - r / (2 * Math.PI) * Math.sin(Math.PI * (t - t0) / r)
    : t <= t1 ? r / 2 + (t - tm) / 2 + f / (2 * Math.PI) * Math.sin(Math.PI * (t - tm) / f) : r / 2 + f / 2;
  const raw = t => base * (t - T0) + I(t), a = raw(T0), b = raw(T1);
  return t => (raw(t) - a) / (b - a);
}
// Camera: position glides along an ARC-LENGTH parametrised centripetal Catmull-Rom path (constant speed across unequal
// segments), orientation is an explicit pitch/yaw (degrees) instead of a look-at spline; both follow bellProg profiles.
function smoothCam(camera, U, o) {
  const pc = new THREE.CatmullRomCurve3(o.pos.map(p => new THREE.Vector3(...p)), false, 'centripetal'); pc.arcLengthDivisions = 2000; pc.updateArcLengths();
  const up = bellProg(o.pp), ua = bellProg(o.pa), D = Math.PI / 180;
  const at = u => { if (u >= 0 && u <= 1) return pc.getPointAt(u); const e = u < 0 ? 0 : 1, a = pc.getPointAt(e), b = pc.getPointAt(e + (u < 0 ? 1e-3 : -1e-3)); return a.clone().add(a.clone().sub(b).multiplyScalar(Math.abs(u - e) / 1e-3)); };
  return {
    update(t) {
      const P = at(up(t)); if (o.shake) P.add(U.shake(t, o.shake.amp, o.shake.freq, 7)); const a = ua(t);
      camera.position.copy(P); camera.rotation.set(U.lerp(o.pitch[0], o.pitch[1], a) * D, U.lerp(o.yaw[0], o.yaw[1], a) * D, 0, 'YXZ');
      return { P };
    },
  };
}
export default {
  post: {
    exposure: 1.08,
    bloom: { enabled: true, strength: .45, radius: .6, threshold: .8 },
    grade: { contrast: 1.08, saturation: 1.06, warmth: .01, lift: [.006, .012, .04], gain: [1.03, 1.0, .97] },
    vignette: .5, grain: .04,
    dof: { enabled: true, focus: 1.2, range: .5, amount: 1 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, TEX, FX, ENV } = ctx;
    R = {};
    const deskTop = .7825;
    scene.background = new THREE.Color('#0a1022');
    scene.fog = new THREE.FogExp2('#18213b', .0022);
    scene.environment = await ctx.loadHDR('satara_night_no_lamps'); scene.environmentIntensity = .2;

    // ---------------- outside: moon, Alps, Lake Geneva, garden ----------------
    const el = 7.5 * Math.PI / 180, az = 4.5 * Math.PI / 180; const moonDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)); R.moonDir = moonDir;
    const sky = ENV.skyDome({ top: '#040814', mid: '#0b1634', horizon: '#26365e', bottom: '#0b1222', sunDir: moonDir.toArray(), sunColor: '#a9bde8', sunSize: 0, sunGlow: .9, stars: 1.0, clouds: .12, cloudColor: '#3a4a74', intensity: 1 });
    scene.add(sky);
    const moon = G.moonSprite({ size: 17 }); moon.position.copy(moonDir).multiplyScalar(400).add(new THREE.Vector3(0, 1.4, 0)); scene.add(moon);
    const mg = FX.glow({ size: 110, opacity: .22, color: '#8ea6e0' }); mg.material.fog = false; mg.position.copy(moon.position); scene.add(mg);
    // Lake Geneva: dark water, sky-tinted toward the horizon, sparkling moon path (custom shader)
    const lu = { time: { value: 0 }, moonDir: { value: moonDir.clone() }, deep: { value: new THREE.Color('#050b18') }, skyC: { value: new THREE.Color('#1e2d52') }, glint: { value: new THREE.Color('#dfe8ff') }, fogC: { value: new THREE.Color('#1a2644') } };
    const lakeMat = new THREE.ShaderMaterial({ uniforms: lu,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float time; uniform vec3 moonDir, deep, skyC, glint, fogC; varying vec3 vW;
        float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
        void main(){
          vec3 V = normalize(vW - cameraPosition); float dep = max(-V.y, 0.);
          float dAz = acos(clamp(dot(normalize(V.xz), normalize(moonDir.xz)), -1., 1.));
          float w = .012 + dep*.42; float path = exp(-dAz*dAz/(w*w));
          vec2 q = vW.xz*vec2(.9, 3.2);
          float n = vn(q + vec2(time*.35, time*1.3)) * vn(q*1.9 - vec2(time*.9, -time*.4));
          float fw = max(length(fwidth(q)), 1e-4);                   // noise cells per pixel
          float e = clamp(fw * .7, 0., .3);                          // widen the threshold with the footprint (filtered glints)
          float sp = mix(smoothstep(.28 - e, .62 + e, n), .14, smoothstep(.3, 1.0, fw));
          float fres = pow(1. - dep, 7.);
          vec3 col = mix(deep, skyC, fres*.75);
          col += glint * path * (.12 + 2.4*sp) * (.5 + .5*smoothstep(.0, .05, dep));
          col += glint * exp(-dAz*dAz/.0009) * smoothstep(.06, .0, dep) * .6;   // bright streak near the far shore
          float d = length(vW - cameraPosition); col = mix(col, fogC, smoothstep(80., 260., d)*.5);
          gl_FragColor = vec4(col, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }` });
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(900, 400).rotateX(-Math.PI / 2), lakeMat); lake.position.set(0, -6, -170); lake.userData.uniforms = lu; scene.add(lake);
    // Savoy Alps across the lake (heightfield, snow by height)
    const mg2 = new THREE.PlaneGeometry(760, 140, 220, 40); mg2.rotateX(-Math.PI / 2); const mp = mg2.attributes.position; const colors = [];
    const sx = moonDir.x / -moonDir.z * 200; const P = x => 26 + 7 * Math.sin(x * .017 + .3) + 6 * U.fbm1(x * .05, 3) - 13 * Math.exp(-Math.pow((x - sx) / 24, 2)) + 7 * Math.pow(Math.max(0, Math.sin(x * .045 + 1.2)), 4);
    for (let i = 0; i < mp.count; i++) {
      const x = mp.getX(i), z = mp.getZ(i) - 240; const d = -z - 175;
      let h = d < 0 ? -12 : P(x) * (1 - Math.exp(-d / 16)) * (1 - U.smoothstep(70, 140, d) * .35) + 2.5 * U.fbm1(x * .21 + z * .13, 7) * U.smoothstep(0, 20, d);
      mp.setY(i, h - 6); const hn = (h - 6) / 50;
      const snow = U.smoothstep(.2, .4, hn + U.fbm1(x * .15, 11) * .08), forest = 1 - U.smoothstep(.04, .2, hn);
      const c = new THREE.Color('#2a3150').lerp(new THREE.Color('#17203a'), forest).lerp(new THREE.Color('#b8c6e6'), snow); colors.push(c.r, c.g, c.b);
    }
    mg2.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); mg2.computeVertexNormals();
    const mtnMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 });
    // moonlit snow scatters a little sky light: faint self-illumination proportional to the (squared) snow colour
    mtnMat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * vColor.rgb * vec3(.17, .2, .3);'); };
    const mtn = new THREE.Mesh(mg2, mtnMat); mtn.position.z = -240; scene.add(mtn);
    // village lights on the far shore (1787: a few candle-lit windows)
    const vr = U.rng(17), vl = new Float32Array(14 * 3); for (let i = 0; i < 14; i++) vl.set([-160 + vr() * 300, -5.3 + vr() * 1.5, -176 - vr() * 6], i * 3);
    const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.BufferAttribute(vl, 3));
    const vpts = new THREE.Points(vg, new THREE.PointsMaterial({ color: '#ffc27a', size: 3.2, sizeAttenuation: false, map: TEX.softDot(32, .3), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); scene.add(vpts);
    // garden: acacias + terrace balustrade in silhouette
    const gt = G.gardenTex({ seed: 6, color: '#070b16', trees: [[.06, .95, .26], [.24, .7, .16], [.9, .9, .26]], balustrade: .14 });
    const garden = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshBasicMaterial({ map: gt, transparent: true, fog: false, depthWrite: false })); garden.position.set(0, 1.3, -10); garden.renderOrder = -5; scene.add(garden);

    // ---------------- room: summer-house wall with an open casement window ----------------
    const wallMat = M.MAT.plaster({ a: '#cdbf9e', b: '#a2946f', repeat: [2, 2] });
    const wz = -.45, wt = .24, ox0 = -.55, ox1 = .55, oy0 = .95, oy1 = 2.3;
    const wallBox = (x0, x1, y0, y1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, wt), wallMat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, wz - wt / 2); m.castShadow = m.receiveShadow = true; scene.add(m); };
    wallBox(-3, ox0, 0, 3.4); wallBox(ox1, 3, 0, 3.4); wallBox(ox0, ox1, oy1, 3.4); wallBox(ox0, ox1, 0, oy0);
    const paint = new THREE.MeshPhysicalMaterial({ color: '#ddd5c2', roughness: .45, clearcoat: .3 });
    const bar = (w, h, d, x, y, z, parent = scene) => { const m = new THREE.Mesh(M.rbox(w, h, d, .006), paint); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
    const fz = wz - .1;
    bar(.06, oy1 - oy0, .08, ox0 + .03, (oy0 + oy1) / 2, fz); bar(.06, oy1 - oy0, .08, ox1 - .03, (oy0 + oy1) / 2, fz); bar(ox1 - ox0, .06, .08, 0, oy1 - .03, fz);
    const sill = new THREE.Mesh(M.rbox(1.18, .035, .14, .01), new THREE.MeshPhysicalMaterial({ color: '#bfb6a0', roughness: .5, clearcoat: .2 })); sill.position.set(0, oy0 + .018, wz + .03); sill.castShadow = sill.receiveShadow = true; scene.add(sill);
    // two casement leaves opened inward (~80°), glass catching the candle light
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#9fb0d0', roughness: .05, metalness: .1, transparent: true, opacity: .16, clearcoat: 1, depthWrite: false });
    const leafW = (ox1 - ox0 - .12) / 2, leafH = oy1 - oy0 - .1;
    for (const s of [-1, 1]) {
      const hinge = new THREE.Group(); hinge.position.set(s * (ox1 - .06), oy0 + .05 + leafH / 2, fz + .02); hinge.rotation.y = s * -1.38; scene.add(hinge);
      const lx = -s * leafW / 2; const st = .04;
      bar(st, leafH, .035, lx - s * (leafW / 2 - st / 2), 0, 0, hinge); bar(st, leafH, .035, lx + s * (leafW / 2 - st / 2), 0, 0, hinge);
      bar(leafW, st, .035, lx, leafH / 2 - st / 2, 0, hinge); bar(leafW, st, .035, lx, -leafH / 2 + st / 2, 0, hinge);
      bar(leafW - st, .014, .022, lx, leafH / 6, 0, hinge); bar(leafW - st, .014, .022, lx, -leafH / 6, 0, hinge); bar(.014, leafH - st, .022, lx, 0, 0, hinge);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(leafW - st * 2, leafH - st * 2), glassMat); gl.position.set(lx, 0, 0); gl.userData.noDepth = true; hinge.add(gl);
    }
    // muslin curtains breathing in the night air
    const cL = G.curtain({ w: .38, h: 2.0, a: '#e7dcc4', b: '#cbbd9e', sheen: '#fff1d8', sway: .035, seed: 1, pleats: 6 }); cL.position.set(ox0 - .14, 2.45, wz + .07); cL.material.transparent = true; cL.material.opacity = .9; scene.add(cL);
    const cR = G.curtain({ w: .38, h: 2.0, a: '#e7dcc4', b: '#cbbd9e', sheen: '#fff1d8', sway: .035, seed: 4, pleats: 6 }); cR.position.set(ox1 + .14, 2.45, wz + .07); cR.material.transparent = true; cR.material.opacity = .9; scene.add(cR);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), M.MAT.darkWood({ rings: 40, repeat: [3, 3] })); floor.receiveShadow = true; scene.add(floor);

    // ---------------- desk + Gibbon's things ----------------
    // 1 m deep writing table (back edge against the wall as before) so its front edge stays below frame in the hold;
    // weak specular / env reflection: the gloss mirrored the moonlight + night sky at grazing angles and read as navy cloth.
    const deskMat = G.GMAT.mahogany({ a: '#9c6842', b: '#784828', rings: 22, clearcoat: 0 }); deskMat.envMapIntensity = .35; deskMat.specularIntensity = .3; deskMat.normalScale.set(.05, .05); deskMat.roughnessMap = null; deskMat.roughness = .62;
    const desk = M.desk({ w: 1.45, d: 1.0, leather: false, material: deskMat }); desk.position.set(0, 0, wz + .51); scene.add(desk);
    const csL = G.candlestick({ seed: 3, candleH: .15 }); csL.position.set(-.36, deskTop, .3); scene.add(csL);
    const csR = G.candlestick({ seed: 8, candleH: .12 }); csR.position.set(.54, deskTop, .12); scene.add(csR);
    // tall candlestick standing just behind the six volumes: its flame burns in the gap between the name card and the books.
    // Long stem + a candle burnt low (late night): the brass drip-pan and socket clear the book tops, so it reads as a
    // candlestick standing BEHIND the row (not a candle sitting on the volumes); flame height stays below the card.
    const bX = .21, bZ = -.32;
    const csB = G.candlestick({ seed: 12, stemH: .27, candleH: .06 }); csB.position.set(bX, deskTop, bZ); scene.add(csB);
    csB.traverse(o => { if (o.isMesh && o.geometry.type === 'CapsuleGeometry') o.visible = false; }); // its side drips read as a dark crack line in close-up
    R.fL = new THREE.Vector3(-.36, deskTop + csL.userData.flameY, .3); R.fR = new THREE.Vector3(.54, deskTop + csR.userData.flameY, .12);
    R.fB = new THREE.Vector3(bX, deskTop + csB.userData.flameY, bZ);
    R.flames = [];
    for (const cs of [csL, csR, csB]) waxGlow(cs, deskTop + cs.userData.flameY - .03);
    for (const cs of [csL, csR, csB]) {
      cs.userData.flame.visible = false; cs.userData.glow.visible = false;
      const base = cs.userData.flameY - .03 + .006; // candle top + wick
      const fl = candleFlame({ seed: R.flames.length * 3 + 1, h: .046, w: .026 }); fl.position.y = base; cs.add(fl); R.flames.push(fl);
      const dp = depthProxy(.005, .013); dp.position.y = base + .015; cs.add(dp);
    }
    // finished manuscript with the quill laid down on it
    const ms = G.paperStack({ w: .22, d: .3, h: .055, sheets: 3, seed: 21, curl: .008, topTex: G.manuscriptTex({ seed: 22, lines: 28, stopAt: .45 }) }); ms.position.set(-.04, deskTop + .002, .2); ms.rotation.y = .18; scene.add(ms);
    const q = G.quill({ length: .3, bend: .025 }); q.rotation.set(-Math.PI / 2 + .04, 0, -2.2); q.position.set(.02, deskTop + .002 + ms.userData.topY + .004, .27); scene.add(q);
    const ink = M.inkwell({ quill: false }); ink.position.set(-.36, deskTop, -.2); scene.add(ink);
    ink.traverse(o => { if (o.isMesh && o.material.transmission > 0) { o.material.transmission = 0; o.material.roughness = .12; } });
    // six quarto volumes: calf, raised bands, red & black morocco labels
    const gilt = '#efc96a';
    const spine = (n) => (x, W, H) => {
      const k = W / 256; const bands = [.07, .45, .6, .75, .92];
      x.fillStyle = gilt; bands.forEach(b => { x.fillRect(0, H * b - 9 * k, W, 2 * k); x.fillRect(0, H * b + 7 * k, W, 2 * k); });
      // red morocco title label in the top compartment, gilt fillet; title fitted inside the fillet (no overrun)
      const lx = W * .17, lw = W * .66, ly = H * .1, lh = H * .32;
      x.fillStyle = '#7d1a14'; x.fillRect(lx, ly, lw, lh);
      const lr = U.rng(90 + n); for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(${lr() < .5 ? '0,0,0' : '255,200,160'},${lr() * .06})`; x.beginPath(); x.arc(lx + lr() * lw, ly + lr() * lh, 2 + lr() * 9, 0, 7); x.fill(); }
      x.strokeStyle = gilt; x.lineWidth = 3 * k; const fx0 = lx + W * .035, fy0 = ly + H * .012, fw0 = lw - W * .07, fh0 = lh - H * .024; x.strokeRect(fx0, fy0, fw0, fh0);
      x.lineWidth = 1.2 * k; x.strokeRect(fx0 + 5 * k, fy0 + 5 * k, fw0 - 10 * k, fh0 - 10 * k);
      const lines = [['THE', .6], ['DECLINE', 1], ['AND FALL', .92], ['OF THE', .6], ['ROMAN', 1], ['EMPIRE', 1]];
      const boxW = fw0 - 26 * k, boxH = fh0 - 30 * k; const sumK = lines.reduce((a, l) => a + l[1], 0);
      x.font = '700 100px "Playfair Display"'; const wpx = Math.max(...lines.map(([s, f]) => x.measureText(s).width / 100 * f));
      const f = Math.min(boxH / sumK, boxW / (wpx * .82)); const cond = Math.min(1, boxW / (wpx * f));
      x.fillStyle = gilt; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      let y = fy0 + 15 * k + (boxH - f * sumK) / 2;
      lines.forEach(([s, kk]) => { const fs = f * kk; x.font = `700 ${fs}px "Playfair Display"`; x.save(); x.translate(W / 2, y + fs * .5 + fs * .35); x.scale(cond, 1); x.fillText(s, 0, 0); x.restore(); y += fs; });
      // black volume label
      const vy = H * .485, vh = H * .085; x.fillStyle = '#1b1612'; x.fillRect(W * .2, vy, W * .6, vh); x.strokeStyle = gilt; x.lineWidth = 1.5 * k; x.strokeRect(W * .2 + 5 * k, vy + 5 * k, W * .6 - 10 * k, vh - 10 * k);
      x.fillStyle = gilt; let vf = vh * .5; x.font = `700 ${vf}px "Playfair Display"`; const vw = x.measureText('VOL. ' + ROMAN[n]).width; const vc = Math.min(1, W * .5 / vw);
      x.save(); x.translate(W / 2, vy + vh / 2 + vf * .35); x.scale(vc, 1); x.fillText('VOL. ' + ROMAN[n], 0, 0); x.restore();
      // gilt rosettes in the lower compartments
      for (const cy of [.675, .835]) { x.save(); x.translate(W / 2, H * cy); x.scale(k, k); for (let q = 0; q < 8; q++) { x.rotate(Math.PI / 4); x.beginPath(); x.ellipse(0, -11, 4, 9, 0, 0, 7); x.fill(); } x.beginPath(); x.arc(0, 0, 5, 0, 7); x.fill(); x.restore(); }
    };
    const vols = new THREE.Group(); vols.position.set(.12, deskTop, -.12); vols.rotation.y = -.09; scene.add(vols); R.vols = vols;
    const vr2 = U.rng(5); const vd = .078, vw = .25, vh = .34; const bandMat = M.MAT.leather({ a: '#5a3218', b: '#2e170a', seed: 9 });
    for (let i = 0; i < 6; i++) {
      const b = tomeHi(ctx, { w: vw, h: vh, d: vd, a: '#5c3418', b: '#2e170a', seed: 70 + i, spineDraw: spine(i), spineBg: '#4e2c14', raised: [.07, .45, .6, .75, .92].map(b => .5 - b), bandMat, spineFlat: .4 });
      b.rotation.y = Math.PI / 2; b.rotation.z = (vr2() - .5) * .015; b.position.set((i - 2.5) * (vd + .003), vh / 2, (vr2() - .5) * .01); vols.add(b);
    }
    vols.updateMatrixWorld(true); R.volAnchor = vols.localToWorld(new THREE.Vector3((2 - 2.5) * (vd + .003), vh + .002, vw / 2 - .01));

    // ---------------- lights ----------------
    const hemi = new THREE.HemisphereLight('#2a3760', '#1a120c', .3); scene.add(hemi);
    const moonL = new THREE.DirectionalLight('#8fa8ff', .26); moonL.position.copy(moonDir).multiplyScalar(-1).multiplyScalar(-6).add(new THREE.Vector3(0, 2, 0)); moonL.target.position.set(0, deskTop, 0); scene.add(moonL, moonL.target);
    const spot = new THREE.SpotLight('#ffbe78', .85, 5, .9, 1, 2); spot.position.copy(R.fL).add(new THREE.Vector3(.0, .02, .03)); spot.target.position.set(.12, deskTop + .16, -.02);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0006; spot.shadow.normalBias = .01; spot.shadow.camera.near = .04; scene.add(spot, spot.target); R.spot = spot;
    const pL = ENV.pointLight({ color: '#ffa04a', intensity: .55, distance: 3, pos: R.fL.toArray() }); scene.add(pL);
    const pB = ENV.pointLight({ color: '#ffa04a', intensity: .12, distance: 3, pos: R.fB.clone().add(new THREE.Vector3(0, .06, -.03)).toArray() }); scene.add(pB); R.pts = [pL, pB];
    // warm bounce off the manuscript pages onto the spines (soft frontal fill so the right-hand volumes do not fall into shadow)
    const pPaper = new THREE.SpotLight('#ffc88e', .5, 2, .34, 1, 2); pPaper.position.set(.1, deskTop + .12, .55); pPaper.target.position.set(.12, deskTop + .17, -.02); scene.add(pPaper, pPaper.target);
    // warm pool of the right-hand candle on the desk top in front of Vols. III-VI (aimed past the manuscript and below the spines)
    const pool = new THREE.SpotLight('#ffc88e', 2.2, 2.5, .55, 1, 2); pool.position.copy(R.fR).add(new THREE.Vector3(0, .02, 0)); pool.target.position.set(.32, deskTop, .27); scene.add(pool, pool.target); R.pool = pool;
    R.glows = [];
    for (const f of [R.fL, R.fR, R.fB]) {
      const g = FX.glow({ size: .16, opacity: .4, color: '#ffb35a' }); g.position.copy(f).add(new THREE.Vector3(0, -.004, 0)); scene.add(g);
      const g2 = FX.glow({ size: .55, opacity: .1, color: '#ff9a40' }); g2.position.copy(g.position); g2.visible = f === R.fB; scene.add(g2); R.glows.push(g, g2);
    }
    

    // ---------------- camera: night view -> down to the desk -> the six volumes ----------------
    camera.fov = 40; camera.near = .03; camera.far = 900; camera.updateProjectionMatrix();
    // One continuous pull-back + tilt-down (lake -> window -> desk) that eases into a slow drift (~6 cm/s, 0.4 deg/s)
    // for the hero hold; ends far enough back that the six-volume row sits inside x ~70..940 (clear of the Shorts UI).
    R.cam = smoothCam(camera, U, {
      pos: [[.1, 1.45, .25], [.11, 1.43, .58], [.12, 1.39, .98], [.13, 1.36, 1.3], [.14, 1.345, 1.46]],
      pp: { T0: -.5, T1: 3.9, t0: -1.0, tm: .65, t1: 2.6, base: .12 },
      pa: { T0: -.5, T1: 3.9, t0: -.4, tm: .8, t1: 2.5, base: .06 },
      pitch: [1.9, -10.2], yaw: [0, .3], shake: { amp: .0022, freq: .4 },
    });
    R.focusPt = new THREE.Vector3(.12, 1.0, .0);
  },

  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    const c = R.cam.update(t); camera.updateMatrixWorld();
    // focus pull: focus distance and range interpolate geometrically with zero-slope eases (no one-frame snap); the focus
    // reaches the books while the range is still wide, then the range narrows so window/sill/lake soften gradually.
    post.dof.focus = 40 * Math.pow(c.P.distanceTo(R.focusPt) / 40, U.prog(t, 0, 1.2, 'inOutSine'));
    post.dof.range = 200 * Math.pow(.6 / 200, U.prog(t, -.2, 2.3, 'inOutSine'));
    post.dof.amount = U.lerp(.3, .9, U.prog(t, .4, 2.2, 'inOutSine'));
    const f = (s) => 1 + (Math.sin(t * 12.3 + s) * .5 + Math.sin(t * 7.7 + s * 2) * .3 + Math.sin(t * 19.1 + s * .5) * .2) * .07; // gentle candle flicker (no strobing on the spines)
    R.pts[0].intensity = .55 * f(1); R.pts[1].intensity = .12 * f(4); R.spot.intensity = .85 * f(1); R.pool.intensity = 2.2 * f(7);
    R.glows.forEach((g, i) => { g.material.opacity = (i % 2 ? .1 : .4) * (.9 + .1 * f(i)); });

    // ---------------- typography (same card design as s16) ----------------
    const tI = ctx.wordTime('ingiliz'), tE = ctx.wordTime('edward'), tG = ctx.wordTime('gibbon');
    G.locTag(ui, t, { t0: .12, text: 'LOZAN · 1787', accent: '#ffcf6b', y: 268 });
    const end = G.nameCard(ui, t, { y: 312, tCard: tI - .04, tName: tE - .04, tWork: tG - .3, name: 'EDWARD GIBBON', sub: 'İngiliz tarihçi · 1737–1794', work: 'Roma İmparatorluğu\'nun Çöküşü (1776–1789)', accent: '#ffcf6b', bg: 'rgba(16,16,32,.66)', nameAnim: 'wipe' }); // wipe-in: the name never slides over the sub-line
    if (end) { const a = R.volAnchor; const [ax] = ui.project(a); G.pointer(ui, t, { t0: tG - .05, from: [ax, 312 + 292 + 4], anchor: a, color: '#ffcf6b', dur: .3 }); }
  },
};
