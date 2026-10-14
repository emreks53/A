// s01 (0.00–7.50) "Allah, Efendimiz ﷺ'a bine yakın mu'cize vermiş ve en büyük ve parlağını Kur'an kılmıştır."
// Visual: blue-hour desert; ~1000 clay oil lamps light up in a wave across the dunes (≈1000 miracles, counter).
// On "en büyük ve parlağını" the camera glides down to the brightest point: a Mushaf on a carved rahle, caught by the first ray of dawn.
import * as THREE from 'three';

let R = {};
export default {
  post: {
    exposure: 1.15,
    bloom: { enabled: true, strength: 0.55, radius: 0.6, threshold: 0.7 },
    grade: { contrast: 1.06, saturation: 1.12, warmth: 0.02, lift: [0.01, 0.012, 0.03], gain: [1.02, 1.0, 0.98] },
    vignette: 0.45, grain: 0.03,
    dof: { enabled: true, focus: 20, range: 30, amount: 0.6 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, FX, TEX } = ctx;
    R = {};
    scene.fog = new THREE.FogExp2('#1b2a52', 0.006);
    scene.environment = await ctx.loadHDR('kloppenheim_02_puresky'); scene.environmentIntensity = 0.22;
    const sky = ENV.skyDome({ top: '#050b22', mid: '#132a5c', horizon: '#c86a4a', bottom: '#14182a', sunDir: [0.0, -0.06, -1], sunColor: '#ff9a5a', sunSize: 0, sunGlow: 0.8, stars: 1.0, clouds: 0.18, cloudColor: '#7a5a72', intensity: 0.9 });
    scene.add(sky); R.sky = sky;

    // dunes, flattened near the hero spot
    const dunes = M.dunes({ size: 260, seg: 220, height: 7, seed: 12, a: '#c9a27a', b: '#9a7050', flatCenter: 10, flatAt: [0, 0] });
    dunes.material.normalScale.set(.3, .3);
    dunes.position.y = -0.02; scene.add(dunes); R.dunes = dunes;

    // moonlight (cool key) + warm horizon bounce
    const moon = ENV.sunLight({ color: '#9db8ff', intensity: 0.55, pos: [-20, 30, 12], target: [0, 0, 0], size: 6, mapSize: 2048 });
    scene.add(moon, moon.target);
    const bounce = new THREE.HemisphereLight('#4b64a8', '#6b4a3a', 0.35); scene.add(bounce);

    // --- lamp field (instanced) ---
    const rnd = U.rng(42); const N = 1000; const items = [];
    for (let i = 0; i < N; i++) {
      const r = 3.2 + Math.pow(rnd(), 0.7) * 95, a = rnd() * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r - 10;
      if (Math.abs(x) < 2.5 && z > -3 && z < 9) continue; // keep the camera path clear
      items.push({ x, z, y: dunes.userData.heightAt(x, z + 0) - 0.01, rot: rnd() * 6.28, s: 1.0 + rnd() * 0.25, on: 0.1 + (r / 98) * 3.4 + rnd() * 0.35 });
    }
    R.items = items;
    // single lamp body geometry (merged lathe + spout)
    const prof = [[0, 0], [.035, 0], [.05, .008], [.055, .018], [.05, .026], [.03, .032], [.012, .034], [.014, .042], [.008, .044]].map(([r, y]) => new THREE.Vector2(r, y));
    const body = new THREE.LatheGeometry(prof, 18); body.scale(3, 3, 3.4);
    const clayMat = M.MAT.clay({ a: '#b86a3e', b: '#7c4226' });
    const inst = new THREE.InstancedMesh(body, clayMat, items.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    items.forEach((it, i) => { e.set(0, it.rot, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.s, it.s, it.s)); inst.setMatrixAt(i, m4); });
    inst.castShadow = false; inst.receiveShadow = true; scene.add(inst);

    // flames (points) + light pools on the sand (instanced additive discs), driven by per-lamp "on" time
    const fpos = new Float32Array(items.length * 3), fon = new Float32Array(items.length), fseed = new Float32Array(items.length);
    items.forEach((it, i) => { const ox = Math.cos(it.rot) * .26 * it.s, oz = -Math.sin(it.rot) * .26 * it.s; fpos.set([it.x + ox, it.y + .17 * it.s, it.z + oz], i * 3); fon[i] = it.on; fseed[i] = i * 0.37; });
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fpos, 3)); fg.setAttribute('on', new THREE.BufferAttribute(fon, 1)); fg.setAttribute('seed', new THREE.BufferAttribute(fseed, 1));
    const fu = { time: { value: 0 }, map: { value: TEX.softDot(64, 0.25) }, master: { value: 1 } };
    const fm = new THREE.ShaderMaterial({ uniforms: fu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float time; attribute float on, seed; varying float vB; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv;
        float b = smoothstep(on, on + .35, time); float fl = .85 + .15*sin(time*11. + seed*7.) * sin(time*5.3 + seed);
        vB = b * fl; gl_PointSize = max(3.5, (260. + 90.*sin(seed*3.)) / -mv.z) * (.5 + .5*b); }`,
      fragmentShader: `uniform sampler2D map; uniform float master; varying float vB; void main(){ float a = texture2D(map, gl_PointCoord).a; vec3 c = mix(vec3(1.,.42,.12), vec3(1.,.86,.55), a*a); gl_FragColor = vec4(c * 2.6, a * vB * master); }` });
    const flames = new THREE.Points(fg, fm); flames.userData.uniforms = fu; flames.userData.noDepth = true; flames.frustumCulled = false; scene.add(flames); R.flames = flames;
    // warm light pools on the sand
    const poolTex = TEX.gradientTex([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.45)'], [0.6, 'rgba(255,255,255,0.08)'], [1, 'rgba(255,255,255,0)']], { w: 128, h: 128, radial: true });
    const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.7, 1.7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolTex, color: '#ff8a35', transparent: true, opacity: .32, fog: false, blending: THREE.AdditiveBlending, depthWrite: false }), items.length);
    pool.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(items.length * 3), 3);
    items.forEach((it, i) => { m4.compose(new THREE.Vector3(it.x, it.y + .03, it.z), new THREE.Quaternion(), new THREE.Vector3(it.s * 1.3, 1, it.s * 1.3)); pool.setMatrixAt(i, m4); });
    pool.userData.noDepth = true; pool.renderOrder = 2; scene.add(pool); R.pool = pool;

    // --- hero: rug + rahle + mushaf at the center, lit by the first ray of dawn ---
    const hero = new THREE.Group(); hero.position.set(0, dunes.userData.heightAt(0, 0), 0); scene.add(hero); R.hero = hero;
    const rugTex = TEX.drawTexture(512, 768, (x, W, H) => {
      x.fillStyle = '#7d1f1a'; x.fillRect(0, 0, W, H); x.fillStyle = '#e3b65a'; x.fillRect(18, 18, W - 36, H - 36); x.fillStyle = '#7d1f1a'; x.fillRect(34, 34, W - 68, H - 68);
      x.fillStyle = '#20345e'; x.fillRect(60, 60, W - 120, H - 120);
      x.fillStyle = '#e3b65a'; for (let i = 0; i < 9; i++) for (let j = 0; j < 14; j++) { x.save(); x.translate(90 + i * 42, 90 + j * 44); x.rotate(Math.PI / 4); x.fillRect(-9, -9, 18, 18); x.restore(); }
      x.fillStyle = '#b8402e'; x.beginPath(); x.moveTo(W / 2, 120); x.lineTo(W - 110, H / 2); x.lineTo(W / 2, H - 120); x.lineTo(110, H / 2); x.closePath(); x.fill();
      x.fillStyle = '#e8d3a0'; x.beginPath(); x.moveTo(W / 2, 200); x.lineTo(W - 180, H / 2); x.lineTo(W / 2, H - 200); x.lineTo(180, H / 2); x.closePath(); x.fill();
    });
    const rugGeo = new THREE.PlaneGeometry(1.2, 1.8, 30, 30); rugGeo.rotateX(-Math.PI / 2); { const p = rugGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, Math.sin(p.getX(i) * 9) * .006 + Math.cos(p.getZ(i) * 7) * .006); rugGeo.computeVertexNormals(); }
    const rug = new THREE.Mesh(rugGeo, new THREE.MeshPhysicalMaterial({ map: rugTex, roughness: 1, sheen: 1, sheenColor: new THREE.Color('#ffb98a'), sheenRoughness: .4 })); rug.position.y = .02; rug.receiveShadow = true; hero.add(rug);
    const rahle = M.rahle({ length: .62, width: .28, angle: 1.0 }); hero.add(rahle);
    const mus = M.mushaf({ w: .2, h: .27, d: .055 });
    // closed Mushaf leaning on the back leaf of the rahle, front cover facing the camera
    const holder = new THREE.Group(); holder.position.set(0, rahle.userData.crossY, 0); holder.rotation.x = -rahle.userData.openAngle; hero.add(holder);
    mus.position.set(0, .27 / 2 + .01, .014 / 2 + .055 / 2 + .002); holder.add(mus); R.mushaf = holder;
    // hero lamps around the rug (real flames + 2 real lights)
    const heroLamps = [[-.55, .55], [.6, .45], [-.45, -.75], [.5, -.7], [0, 1.05]];
    heroLamps.forEach(([x, z], i) => { const l = M.oilLamp({ scale: 2.6, light: i < 2, lightIntensity: 2.2, lightDistance: 4, seed: i + 3 }); l.position.set(x, .02, z); l.rotation.y = Math.atan2(-x, -z) + Math.PI / 2; hero.add(l); });
    // dawn ray: spot light + visible shaft
    const spot = new THREE.SpotLight('#ffd08a', 0, 40, 0.16, 0.6, 1.2); spot.position.set(6, 9, -16); spot.target.position.set(0, .4, 0); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0005;
    hero.add(spot, spot.target); R.spot = spot;
    const shaft = FX.lightShaft({ from: [6, 9, -16], to: [0, .2, 0], r0: .25, r1: 1.0, color: '#ffcf8a', opacity: 0 }); hero.add(shaft); R.shaft = shaft;
    const halo = FX.glow({ size: 1.1, opacity: 0, color: '#ffd28c' }); halo.position.set(0, rahle.userData.crossY + .25, -.3); hero.add(halo); R.halo = halo;
    const motes = FX.particles({ count: 220, center: [0, 1.2, 0], box: [3, 2.4, 3], size: 9, color: '#ffe0a8', opacity: .7, drift: [.02, .05, 0], swirl: .08 }); hero.add(motes); R.motes = motes;

    camera.fov = 38; camera.near = .05; camera.far = 600; camera.updateProjectionMatrix();
    R.cam = U.cameraRig(camera, {
      pos: [[-2, 16, 30], [-1, 10, 18], [0.1, 2.6, 5.0], [0.06, 1.05, 1.15]],
      look: [[0, 0, -18], [0, .3, -8], [0, .35, -.4], [0, .32, -.05]], t0: 0, t1: 7.6, ease: t => {
        // slow drift during the lamp wave, then a confident glide to the Mushaf from "en büyük" (~4.3s)
        const k = 4.3 / 7.6; return t < k ? (t / k) * 0.22 : 0.22 + 0.78 * (1 - Math.pow(1 - (t - k) / (1 - k), 2.4));
      }, shake: { amp: .02, freq: .4 },
    });
  },
  update(t, ctx) {
    const { ui, U, post } = ctx;
    R.cam.update(t);
    // lamp wave intensities on the pools
    const pc = R.pool.instanceColor; const col = new THREE.Color();
    R.items.forEach((it, i) => { const b = U.smoothstep(it.on, it.on + .4, t) * (.85 + .15 * Math.sin(t * 9 + i)); col.setRGB(b, b * .8, b * .6); pc.setXYZ(i, col.r, col.g, col.b); }); pc.needsUpdate = true;
    // brightest: the Mushaf catches dawn light from "en büyük ve parlağını"
    const tB = ctx.wordTime('parlağını'), tK = ctx.wordTime("kur'an");
    const glowP = U.prog(t, tB - .7, tK + .2, 'inOutCubic');
    R.spot.intensity = 60 * glowP; R.shaft.userData.uniforms.opacity.value = .22 * glowP; R.halo.material.opacity = .25 * glowP;
    R.sky.userData.uniforms.sunGlow.value = 1.6 + glowP * 1.2;
    post.exposure = 1.05 + glowP * .08;
    // DOF follows the camera target distance
    post.dof.focus = ctx.camera.position.distanceTo(new THREE.Vector3(0, .35, -.05)); post.dof.range = U.lerp(30, 1.4, U.prog(t, 4.3, 7.0)); post.dof.amount = U.lerp(.35, 1, U.prog(t, 4.3, 7.0));
    // --- typography ---
    const tBin = ctx.wordTime('bine'), tMu = ctx.wordTime("mu'cize");
    ui.counter({ t, from: 0, to: 1000, t0: tBin - .15, t1: tMu + .9, appear: tBin - .3, hide: tB - .1, x: 540, y: 430, size: 150, color: '#ffd27a', format: v => '≈ ' + Math.round(v).toLocaleString('tr-TR') });
    ui.text("MU'CİZE", { t, t0: tMu - .05, t1: tB - .1, x: 540, y: 545, size: 54, weight: 900, color: '#fff4dc', letterSpacing: 10, anim: 'rise' });
    ui.text('en büyüğü ve en parlağı', { t, t0: tB + .05, t1: 99, x: 540, y: 380, size: 46, weight: 800, color: '#fff4dc', anim: 'rise' });
    ui.text("KUR'ÂN-I KERÎM", { t, t0: tK - .05, t1: 99, x: 540, y: 470, size: 92, weight: 900, color: '#ffd27a', anim: 'pop', letterSpacing: 4 });
  },
};
