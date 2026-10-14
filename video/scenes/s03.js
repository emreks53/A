// s03 (13.20–19.60) "Dostlarının dışında düşmanları dahi onun şahsında gözüken, üstün ve yetişilemeyen ahlaka şahittirler."
// Dusk desert valley, Kurzgesagt-style split without people: left camp (light wool tents, green banners) = DOSTLARI,
// right camp (black goat-hair tents, dark red banners) = DÜŞMANLARI. Between them, on a flat rock, one steady clay lamp.
// On "onun şahsında gözüken" chains of small clay lamps ignite from BOTH camps toward that same calm light; on
// "şahittirler" a ring of lamps closes around it and a big "ŞAHİT" stamp lands with a dust puff.
import * as THREE from 'three';

let R = {};
const LAMP = new THREE.Vector3(0, 0, 0);

export default {
  post: {
    exposure: 1.0,
    bloom: { enabled: true, strength: .6, radius: .55, threshold: .72 },
    grade: { contrast: 1.1, saturation: 1.1, warmth: 0, lift: [.008, .012, .04], gain: [1.03, 1.0, .97] },
    vignette: .45, grain: .035,
    dof: { enabled: true, focus: 14, range: 10, amount: .55 },
  },

  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, FX, TEX } = ctx; const MAT = M.MAT;
    R = {};
    scene.fog = new THREE.FogExp2('#2a2c50', .015);
    scene.environment = await ctx.loadHDR('qwantani_dusk_2_puresky'); scene.environmentIntensity = .16;
    const sky = ENV.skyDome({ top: '#0c1230', mid: '#3a4680', horizon: '#c86a48', bottom: '#1e1a28', sunDir: [0.05, -0.05, -1], sunColor: '#ff7a40', sunSize: 0, sunGlow: .8, stars: .8, clouds: .3, cloudColor: '#8a5a78', intensity: .95 });
    scene.add(sky); R.sky = sky;

    // dusk light: afterglow from the far end of the valley (rim) + cool sky fill
    const glowL = ENV.sunLight({ color: '#ff9a72', intensity: .6, pos: [3, 8, -40], target: [0, 0, -4], size: 14, mapSize: 2048, bias: -.0004, normalBias: .03 });
    scene.add(glowL, glowL.target);
    scene.add(new THREE.HemisphereLight('#4a62c0', '#2a2030', 1.0));

    // ---- terrain: flat valley floor between gentle dune slopes, open toward the afterglow ----
    const tg = new THREE.PlaneGeometry(160, 160, 200, 200); tg.rotateX(-Math.PI / 2);
    const fb = TEX.fbmField(9, 3, 5); const tp = tg.attributes.position; const cols = new Float32Array(tp.count * 3);
    const hAt = (x, z) => { const ax = Math.abs(x); const u = x / 160 + .5, v = z / 160 + .5; const n = fb(u, v);
      const slope = Math.pow(U.smoothstep(5.5, 34, ax), 1.4) * 9; const far = U.smoothstep(-30, -85, z) * 3.5;
      return slope + far + n * (.18 + U.smoothstep(4, 16, ax) * 2.2) + Math.sin(z * .35 + x * .2) * .05; };
    const sandC = new THREE.Color('#9c8476'), rockC = new THREE.Color('#6e5050'), darkC = new THREE.Color('#40303a');
    for (let i = 0; i < tp.count; i++) { const x = tp.getX(i), z = tp.getZ(i); const h = hAt(x, z); tp.setY(i, h); const k = U.smoothstep(1.0, 4.5, h); const c = sandC.clone().lerp(rockC, k).lerp(darkC, U.smoothstep(5, 10, h) * .6); cols.set([c.r, c.g, c.b], i * 3); }
    tg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); tg.computeVertexNormals();
    const sandT = TEX.sand({ a: '#f2e2cc', b: '#d8c2a4', repeat: [70, 70] });
    const ground = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: sandT.map, normalMap: sandT.normalMap, normalScale: new THREE.Vector2(.55, .55), vertexColors: true, roughness: .95 }));
    ground.receiveShadow = true; scene.add(ground); R.hAt = hAt;
    // distant mountain silhouette ring
    { const mt = [], mi = [], seg = 160, rad = 260; for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; const h = 14 + 16 * U.fbm1(a * 5, 3, 4) + 10 * Math.max(0, Math.sin(a * 2 + .7)); mt.push(Math.cos(a) * rad, -2, Math.sin(a) * rad, Math.cos(a) * rad * .97, h, Math.sin(a) * rad * .97); if (i < seg) { const b = i * 2; mi.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
      const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(mt, 3)); mg.setIndex(mi);
      scene.add(new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: '#2a2440', side: THREE.DoubleSide, fog: false }))); }

    // scattered rocks + desert scrub
    const rnd = U.rng(31);
    const rockGeo = new THREE.SphereGeometry(1, 28, 18); { const p = rockGeo.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const d = 1 + .2 * Math.sin(v.x * 3.1 + v.y * 2.3) + .12 * Math.sin(v.z * 4.7 - v.x * 1.7) + .05 * Math.sin(v.x * 9 + v.z * 7); v.multiplyScalar(d); v.y *= .62; p.setXYZ(i, v.x, v.y, v.z); } rockGeo.computeVertexNormals(); }
    const rocksA = []; for (let i = 0; i < 80; i++) { const side = rnd() < .5 ? -1 : 1; const x = side * (5.5 + rnd() * 22), z = 8 - rnd() * 60; const s = .25 + Math.pow(rnd(), 2) * 1.8; rocksA.push([x, hAt(x, z) - s * .2, z, s, rnd() * 6.3]); }
    for (let i = 0; i < 16; i++) { const x = (rnd() - .5) * 10, z = 6 - rnd() * 18; if (Math.abs(x) < 2.2 && z < 3 && z > -11) continue; const s = .07 + rnd() * .16; rocksA.push([x, hAt(x, z) - .02, z, s, rnd() * 6.3]); }
    const stoneMat = MAT.stone({ a: '#a07a60', b: '#6a4a3c', seed: 3 });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (const [x, z, s] of [[-2.1, 3.6, .32], [-1.55, 4.3, .14], [2.3, 3.0, .26], [1.8, 4.6, .18], [-2.9, 1.8, .2], [3.0, 1.2, .3], [.9, 3.9, .07], [-.7, 2.6, .06]]) rocksA.push([x, hAt(x, z) - s * .25, z, s, x * 3]);
    const rocks = new THREE.InstancedMesh(rockGeo, stoneMat, rocksA.length);
    rocksA.forEach(([x, y, z, s, r], i) => { m4.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(0, r, 0)), new THREE.Vector3(s, s, s)); rocks.setMatrixAt(i, m4); });
    rocks.castShadow = rocks.receiveShadow = true; scene.add(rocks);
    const scrubGeo = new THREE.IcosahedronGeometry(1, 1); scrubGeo.scale(1, .55, 1);
    const scrubA = [[-1.4, 3.2, .22], [1.25, 2.4, .18], [2.6, 4.2, .3], [-2.6, 4.8, .26]]; for (let i = 0; i < 46; i++) { const x = (rnd() < .5 ? -1 : 1) * (1.2 + rnd() * 12), z = 7 - rnd() * 40; if (Math.abs(x) < 4.6 && z < 1 && z > -12) continue; scrubA.push([x, z, .16 + rnd() * .28]); }
    const scrub = new THREE.InstancedMesh(scrubGeo, new THREE.MeshStandardMaterial({ color: '#4e5132', roughness: 1 }), scrubA.length);
    scrubA.forEach(([x, z, s], i) => { m4.compose(new THREE.Vector3(x, hAt(x, z) + s * .2, z), q.identity(), new THREE.Vector3(s, s, s)); scrub.setMatrixAt(i, m4); });
    scrub.castShadow = true; scene.add(scrub);

    // ---- the two camps (tents open toward the valley centre) ----
    R.flags = []; R.fires = [];
    const camp = (side) => {
      const friend = side < 0; const G = new THREE.Group(); scene.add(G);
      const tentTex = TEX.drawTexture(512, 512, (x, w, h) => { const base = friend ? ['#c4a47a', '#94704a', '#6a4626'] : ['#3e3430', '#26201d', '#6a2a24']; x.fillStyle = base[0]; x.fillRect(0, 0, w, h);
        for (let i = 0; i < 12; i++) { x.fillStyle = i % 3 === 0 ? base[2] : base[1]; x.fillRect(0, i * 43 + 8, w, i % 3 === 0 ? 9 : 4); }
        const n = rngLocal(friend ? 4 : 8); for (let k = 0; k < 1600; k++) { x.fillStyle = friend ? `rgba(90,60,30,${n() * .14})` : `rgba(120,100,90,${n() * .1})`; x.fillRect(n() * w, n() * h, 10, 1.5); } });
      tentTex.wrapS = tentTex.wrapT = THREE.RepeatWrapping;
      const tentMat = new THREE.MeshPhysicalMaterial({ map: tentTex, roughness: 1, sheen: .7, sheenRoughness: .6, sheenColor: new THREE.Color(friend ? '#ffe2c0' : '#b08a80'), side: THREE.DoubleSide });
      const poleMat = MAT.wood({ a: '#7a5532', b: '#4a3018', rings: 30 });
      [[-3.3, 0], [-6.9, 1], [-10.6, 2]].forEach(([tz, k]) => {
        const tx = side * (3.45 + k * .12); const T = tent(tentMat, poleMat, 2.7, 1.9, 1.35, k + (friend ? 0 : 7), friend);
        T.position.set(tx, hAt(tx, tz), tz); T.rotation.y = (side < 0 ? Math.PI : 0) + side * .08 * (k - 1); G.add(T);
      });
      // banner (rāya): tall pole + waving cloth (wind blows toward +x for both camps)
      const bx = side < 0 ? -2.2 : 2.0, bz = -5.2; const by = hAt(bx, bz);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.035, .045, 3.7, 10), poleMat); pole.position.set(bx, by + 1.85, bz); pole.castShadow = true; G.add(pole);
      const tip = M.lathe([[.05, 0], [.06, .04], [.02, .2], [.0001, .26]], MAT.brass(), 12); tip.position.set(bx, by + 3.7, bz); G.add(tip);
      const fg = new THREE.PlaneGeometry(1.3, .85, 22, 10); fg.translate(.65, 0, 0);
      const flagMat = new THREE.MeshPhysicalMaterial({ color: friend ? '#2f9a5a' : '#8e1f1c', roughness: .9, sheen: .9, sheenColor: new THREE.Color(friend ? '#9effc0' : '#ff8a7a'), side: THREE.DoubleSide });
      const flag = new THREE.Mesh(fg, flagMat); flag.position.set(bx, by + 3.2, bz); flag.castShadow = true; G.add(flag);
      flag.userData.base = Float32Array.from(fg.attributes.position.array); flag.userData.L = 1.3; R.flags.push(flag);
      R[friend ? 'flagTopL' : 'flagTopR'] = new THREE.Vector3(bx, by + 3.9, bz);
      // campfire: stone ring, logs, flames, embers, flickering light
      const fx = side * 2.0, fz = -8.4, fy = hAt(fx, fz);
      const F = new THREE.Group(); F.position.set(fx, fy, fz); G.add(F);
      const st = new THREE.InstancedMesh(rockGeo, MAT.stone({ a: '#8a7a6a', b: '#4a4038', seed: 9 }), 9);
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; m4.compose(new THREE.Vector3(Math.cos(a) * .42, .04, Math.sin(a) * .42), q.setFromEuler(e.set(0, a, 0)), new THREE.Vector3(.13, .13, .13)); st.setMatrixAt(i, m4); }
      st.castShadow = true; F.add(st);
      const logMat = new THREE.MeshStandardMaterial({ color: '#3a2214', roughness: 1, emissive: '#ff5a1a', emissiveIntensity: .3 });
      for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .6, 8), logMat); l.rotation.set(Math.PI / 2 - .35, i * Math.PI / 2 + .3, 0); l.position.y = .1; F.add(l); }
      [[.22, .36, 0, 0], [.15, .26, .1, .06], [.16, .24, -.09, -.05], [.11, .18, .03, -.1]].forEach(([w, h, ox, oz], i) => { const f = FX.flame({ height: h, width: w, seed: i * 3 + (friend ? 1 : 5), intensity: 3.0 }); f.position.set(ox, .08, oz); F.add(f); });
      const gl = FX.glow({ size: 1.5, opacity: .3, color: '#ff8a3a' }); gl.position.y = .35; F.add(gl);
      F.add(FX.particles({ count: 40, center: [0, 1.0, 0], box: [.6, 2.0, .6], size: 2.4, color: '#ffb060', opacity: .9, drift: [.08, .55, 0], swirl: .12, seed: friend ? 3 : 4 }));
      const L = ENV.pointLight({ color: '#ff9a48', intensity: 10, distance: 10, decay: 2, pos: [0, .6, 0] }); F.add(L); R.fires.push(L);
      // props
      if (friend) {
        const jarMat = MAT.clay({ a: '#b8784c', b: '#7c4a2c' });
        [[-2.15, -4.4, 1], [-2.4, -4.6, .8], [-2.05, -4.75, .9]].forEach(([x, z, s]) => { const j = M.lathe([[.0001, 0], [.1, 0], [.17, .12], [.18, .24], [.12, .38], [.07, .42], [.08, .47], [.0001, .47]], jarMat, 24); j.scale.setScalar(s); j.position.set(x, hAt(x, z), z); M.shadowAll(j); G.add(j); });
      } else {
        const rackMat = MAT.darkWood({ rings: 24 });
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.4, 8), rackMat); bar.rotation.x = Math.PI / 2; bar.position.set(2.25, hAt(2.25, -4.6) + 1.0, -4.6); bar.castShadow = true; G.add(bar);
        for (const z of [-4.0, -5.2]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.03, .035, 1.1, 8), rackMat); leg.position.set(2.25, hAt(2.25, z) + .5, z); leg.castShadow = true; G.add(leg); }
        const iron = new THREE.MeshStandardMaterial({ color: '#6a6660', metalness: .8, roughness: .4 });
        for (let i = 0; i < 4; i++) { const z = -4.15 - i * .3; const sp = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(.018, .02, 2.4, 6), rackMat); sh.position.y = 1.2; sp.add(sh); const hd = new THREE.Mesh(new THREE.ConeGeometry(.04, .22, 8), iron); hd.position.y = 2.5; sp.add(hd); sp.position.set(2.5, hAt(2.5, z), z); sp.rotation.z = .28; M.shadowAll(sp); G.add(sp); }
        const shieldMat = MAT.leather({ a: '#6a3a22', b: '#3a1e10' });
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .05, 28), shieldMat); sh.rotation.set(Math.PI / 2 - .3, 0, Math.PI / 2); sh.position.set(2.1, hAt(2.1, -3.6) + .33, -3.6); sh.castShadow = true; G.add(sh);
      }
      return G;
    };
    camp(-1); camp(1);

    // ---- the calm light: a clay oil lamp on a flat stone in the foreground centre ----
    const slabGeo = new THREE.SphereGeometry(1, 40, 20); { const p = slabGeo.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const d = 1 + .08 * Math.sin(v.x * 4.1 + v.z * 2.3) + .05 * Math.sin(v.z * 6.7 - v.x * 3.7); v.multiplyScalar(d); v.y = Math.min(v.y, .55 + .03 * Math.sin(v.x * 5)); p.setXYZ(i, v.x * .62, v.y * .34, v.z * .5); } slabGeo.computeVertexNormals(); }
    const slab = new THREE.Mesh(slabGeo, MAT.stone({ a: '#c09a7c', b: '#866250', seed: 12 })); slab.position.set(LAMP.x, hAt(LAMP.x, LAMP.z) + .02, LAMP.z); slab.rotation.y = .3; slab.castShadow = slab.receiveShadow = true; scene.add(slab);
    const lamp = M.oilLamp({ scale: 3.3, light: true, lightIntensity: 1, lightDistance: 7, seed: 5 }); lamp.position.set(LAMP.x - .08, slab.position.y + .55 * .34 - .005, LAMP.z); lamp.rotation.y = -Math.PI / 2 + .9; scene.add(lamp); R.lamp = lamp;
    lamp.userData.light.intensity = 2.2; lamp.userData.light.distance = 7; lamp.userData.light.color.set('#ffc27a');
    lamp.userData.flame.userData.uniforms.intensity.value = 4.2; lamp.userData.glow.material.opacity = .45;
    lamp.updateMatrixWorld(true); R.lampTop = lamp.userData.flame.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .12, 0));
    const halo = FX.glow({ size: 1.2, opacity: .2, color: '#ffd9a0' }); halo.position.copy(R.lampTop).add(new THREE.Vector3(0, -.04, 0)); scene.add(halo); R.halo = halo;
    const poolTex = TEX.gradientTex([[0, 'rgba(255,255,255,1)'], [.3, 'rgba(255,255,255,.45)'], [.7, 'rgba(255,255,255,.08)'], [1, 'rgba(255,255,255,0)']], { w: 128, h: 128, radial: true });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolTex, color: '#ffb066', transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    pool.position.set(LAMP.x, hAt(LAMP.x, LAMP.z) + .04, LAMP.z); pool.userData.noDepth = true; pool.renderOrder = 2; scene.add(pool);

    // ---- chains of small lamps from both camps toward the central light + a ring around it ----
    const items = [];
    const tChain = ctx.wordTime('onun'), tSah = ctx.wordTime('şahittirler');
    for (const side of [-1, 1]) {
      const S = new THREE.Vector3(side * 1.05, 0, -9.8), C = new THREE.Vector3(side * 1.45, 0, -3.6), E = new THREE.Vector3(side * .98, 0, -.5);
      const curve = new THREE.QuadraticBezierCurve3(S, C, E); const n = 13;
      for (let i = 0; i < n; i++) { const p = curve.getPoint(i / (n - 1)); items.push({ x: p.x, z: p.z, on: tChain + .05 + i * .09 + (side > 0 ? .06 : 0), rot: Math.atan2(LAMP.x - p.x, LAMP.z - p.z) }); }
    }
    const nr = 12; for (let i = 0; i < nr; i++) { const a = (i + .5) / nr * Math.PI * 2; items.push({ x: LAMP.x + Math.cos(a) * .82, z: LAMP.z + Math.sin(a) * .7, on: tSah - .5 + Math.abs(Math.sin(a)) * .36, rot: a + Math.PI / 2 }); }
    R.items = items;
    const prof = [[0, 0], [.035, 0], [.05, .008], [.055, .018], [.05, .026], [.03, .032], [.012, .034], [.014, .042], [.008, .044]].map(([r, y]) => new THREE.Vector2(r, y));
    const body = new THREE.LatheGeometry(prof, 16); body.scale(2.0, 2.0, 2.3);
    const inst = new THREE.InstancedMesh(body, MAT.clay({ a: '#b86a3e', b: '#7c4226' }), items.length);
    items.forEach((it, i) => { it.y = hAt(it.x, it.z); m4.compose(new THREE.Vector3(it.x, it.y, it.z), q.setFromEuler(e.set(0, it.rot, 0)), new THREE.Vector3(1, 1, 1)); inst.setMatrixAt(i, m4); });
    inst.castShadow = false; inst.receiveShadow = true; scene.add(inst);
    const fpos = new Float32Array(items.length * 3), fon = new Float32Array(items.length), fseed = new Float32Array(items.length);
    items.forEach((it, i) => { fpos.set([it.x, it.y + .12, it.z], i * 3); fon[i] = it.on; fseed[i] = i * .37; });
    const fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3)); fgeo.setAttribute('on', new THREE.BufferAttribute(fon, 1)); fgeo.setAttribute('seed', new THREE.BufferAttribute(fseed, 1));
    const fu = { time: { value: 0 }, map: { value: TEX.softDot(64, .25) }, pxs: { value: ctx.renderer.getSize(new THREE.Vector2()).y / 1920 } };
    const fm = new THREE.ShaderMaterial({ uniforms: fu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float time, pxs; attribute float on, seed; varying float vB; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv;
        float b = smoothstep(on, on + .25, time); float fl = .88 + .12*sin(time*11. + seed*7.) * sin(time*5.3 + seed);
        vB = b * fl; gl_PointSize = max(2., 250. * pxs / -mv.z) * (.4 + .6*b) * (1. + .5 * exp(-(time - on) * 6.) * step(on, time)); }`,
      fragmentShader: `uniform sampler2D map; varying float vB; void main(){ float a = texture2D(map, gl_PointCoord).a; vec3 c = mix(vec3(1.,.45,.14), vec3(1.,.88,.6), a*a); gl_FragColor = vec4(c * 1.9, a * vB); }` });
    const flames = new THREE.Points(fgeo, fm); flames.userData.uniforms = fu; flames.userData.noDepth = true; flames.frustumCulled = false; flames.renderOrder = 12; scene.add(flames);
    const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolTex, color: '#ff9a40', transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), items.length);
    pools.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(items.length * 3), 3);
    items.forEach((it, i) => { m4.compose(new THREE.Vector3(it.x, it.y + .03, it.z), q.identity(), new THREE.Vector3(1, 1, 1)); pools.setMatrixAt(i, m4); });
    pools.userData.noDepth = true; pools.renderOrder = 3; scene.add(pools); R.pools = pools;

    // drifting dust in the dusk air
    scene.add(FX.particles({ count: 150, center: [0, 1.4, -3], box: [9, 2.8, 12], size: 3.5, color: '#ffd9b0', opacity: .28, drift: [.18, .02, 0], swirl: .15, seed: 11 }));

    camera.fov = 44; camera.near = .1; camera.far = 900; camera.updateProjectionMatrix();
    R.rig = U.cameraRig(camera, {
      pos: [[0.5, 4.5, 11.2], [0.25, 3.8, 9.4], [-0.1, 3.05, 7.4], [-0.25, 2.75, 6.4]],
      look: [[0, .45, -4], [0, .4, -4], [0, .35, -4], [0, .35, -4]],
      t0: -0.6, t1: 7.0, ease: t => .22 * t + .78 * (-(Math.cos(Math.PI * t) - 1) / 2), shake: { amp: .022, freq: .4 },
    });
  },

  update(t, ctx) {
    const { ui, U, post, camera, ENV } = ctx;
    R.rig.update(t);
    // stamp impact shake
    const tSah = ctx.wordTime('şahittirler');
    const ti = t - (tSah + .12); if (ti > 0 && ti < .5) { const a = .05 * Math.exp(-ti * 9); camera.position.x += Math.sin(ti * 70) * a; camera.position.y += Math.cos(ti * 55) * a * .7; }
    // fires flicker, flags wave
    R.fires.forEach((L, i) => ENV.flicker(L, t, i * 3 + 1, .22));
    R.flags.forEach((f, k) => { const g = f.geometry, p = g.attributes.position, b = f.userData.base; const L = k % 2 ? .75 : 1.25;
      for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; const u = x / L; const w = Math.sin(x * 4.2 - t * 5.6 + k) * .12 * u + Math.sin(x * 8.5 - t * 9.3 + y * 3 + k) * .04 * u; p.setXYZ(i, x * (1 - .04 * u), y - u * u * .06 + Math.sin(x * 3 - t * 4 + k) * .015 * u, w); }
      p.needsUpdate = true; g.computeVertexNormals(); });
    // lamp chain pools
    const pc = R.pools.instanceColor; R.items.forEach((it, i) => { const b = U.smoothstep(it.on, it.on + .3, t) * (.88 + .12 * Math.sin(t * 9 + i)); pc.setXYZ(i, b, b * .8, b * .6); }); pc.needsUpdate = true;
    // the central light breathes very slightly (steady flame), gains attention on "onun şahsında"
    const tOn = ctx.wordTime('onun');
    R.halo.material.opacity = .16 + .12 * U.smoothstep(tOn - .2, tOn + .8, t);
    // DOF on the lamp
    post.dof.focus = camera.position.distanceTo(LAMP); post.dof.range = U.lerp(16, 10, U.prog(t, 0, 6)); post.dof.amount = .38;

    // ---- typography ----
    const tD = ctx.wordTime('dostlarının'), tDu = ctx.wordTime('düşmanları'), tDa = ctx.wordTime('dahi'), tU = ctx.wordTime('üstün'), tY = ctx.wordTime('yetişilemeyen');
    const endT = 99;
    const pL = clampLabel(ui, ui.project(R.flagTopL), 'DOSTLARI', 50), pR = clampLabel(ui, ui.project(R.flagTopR), 'DÜŞMANLARI', 50);
    ui.callout('DOSTLARI', { t, t0: tD - .05, t1: endT, anchor: R.flagTopL, to: [pL[0], pL[1]], size: 50, weight: 900, bg: 'rgba(31,110,66,.92)', color: '#f2fff4', dotColor: '#7dffb0', lineColor: 'rgba(220,255,230,.85)' });
    ui.callout('DÜŞMANLARI', { t, t0: tDu - .05, t1: endT, anchor: R.flagTopR, to: [pR[0], pR[1]], size: 50, weight: 900, bg: 'rgba(140,30,26,.92)', color: '#fff0ec', dotColor: '#ff9a8a', lineColor: 'rgba(255,225,220,.85)' });
    ui.text('dahi', { t, t0: tDa - .03, t1: endT, x: pR[0] + 40, y: pR[1] + 62, size: 38, weight: 800, color: '#ffd27a', anim: 'pop', rotate: -.06 });
    // dashed arrows: both camps -> the same light
    const lampS = ui.project(R.lampTop);
    for (const [k, p0] of [[0, pL], [1, pR]]) {
      const a0 = [p0[0] + (k ? -30 : 30), p0[1] + (k ? 92 : 40)]; const pr = U.prog(t, tOn + k * .12, tOn + .9 + k * .12, 'inOutCubic'); const fade = 1 - U.smoothstep(tU - .1, tU + .35, t);
      if (pr > 0 && fade > 0) arrow(ui, a0, [lampS[0] + (k ? 38 : -38), lampS[1] - 60], pr, fade, k ? -1 : 1);
    }
    // label for the light
    ui.text('üstün ve yetişilemeyen ahlâk', { t, t0: tU - .02, t1: endT, x: 540, y: Math.max(820, Math.min(lampS[1] - 175, 1230)), size: 42, weight: 800, color: '#fff4dc', bg: 'rgba(22,24,44,.72)', anim: 'type', typeDur: tY + .55 - tU, dur: .35 });
    // ŞAHİT stamp with dust puff
    stamp(ui, t, tSah + .02, 540, 760);
  },
};

// ------------------------------------------------------------------------------------------------
function rngLocal(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// keep a pill label (centered at the anchor's x) inside the safe zone x 80..1000
function clampLabel(ui, p, str, size) { const X = ui.ctx; X.save(); X.font = ui.font(size, 900, 'Nunito'); const w = X.measureText(str).width + size * .84; X.restore(); return [Math.min(Math.max(p[0], 80 + w / 2 + 6), 1000 - w / 2 - 6), Math.min(Math.max(p[1] - 120, 500), 760)]; }

// Desert tent of woven goat-hair cloth: ridge on 3 poles with catenary sag, back wall to the ground, closed ends,
// open front with the flap propped up as an awning. Built facing -x (front); caller rotates it.
function tent(mat, poleMat, L, D, H, seed, light) {
  const G = new THREE.Group(); const r = rngLocal(seed);
  const cs = new THREE.SplineCurve([[D / 2 + .1, .0], [D / 2 + .05, .25 * H], [D / 2, .52 * H], [D * .25, .82 * H], [0, H], [-D * .25, .84 * H], [-D / 2, .7 * H], [-D / 2 - .45, .66 * H], [-D / 2 - .85, .6 * H]].map(([a, b]) => new THREE.Vector2(a, b)));
  const NV = 34, NU = 26; const pts = cs.getSpacedPoints(NV);
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= NU; j++) { const u = j / NU, z = (u - .5) * L; const sag = Math.pow(Math.sin(u * Math.PI * 2), 2);
    for (let i = 0; i <= NV; i++) { const v = i / NV; const p = pts[i]; const w = U_s(.12, .35, v); const edge = U_s(.85, 1, v);
      const y = p.y - sag * .2 * w * (.4 + .6 * (1 - Math.abs(p.x) / (D * .7))) - sag * .08 * edge + (r() - .5) * .01; pos.push(p.x, Math.max(.0, y), z); uv.push(u * 2, v * 2); } }
  for (let j = 0; j < NU; j++) for (let i = 0; i < NV; i++) { const a = j * (NV + 1) + i, b = a + NV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, mat); roof.castShadow = roof.receiveShadow = true; G.add(roof);
  // closed ends (cross-section down to the ground, front edge drops to the ground at the eave line)
  for (const s of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(D / 2 + .06, 0); pts.slice(0, Math.round(NV * .74)).forEach(p => sh.lineTo(p.x, p.y)); sh.lineTo(-D / 2 + .02, 0); sh.closePath();
    const c = new THREE.Mesh(new THREE.ShapeGeometry(sh, 6), mat); c.position.z = s * L / 2; c.castShadow = c.receiveShadow = true; G.add(c); }
  // poles: ridge row + awning row
  for (const zz of [-L / 2 + .04, 0, L / 2 - .04]) {
    const cp = new THREE.Mesh(new THREE.CylinderGeometry(.03, .035, H, 8), poleMat); cp.position.set(0, H / 2, zz); G.add(cp);
    const fp = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .54 * H, 8), poleMat); fp.position.set(-D / 2 - .8, .27 * H, zz); fp.castShadow = true; G.add(fp);
  }
  // guy ropes from the awning poles to stakes
  const ropeMat = new THREE.MeshStandardMaterial({ color: '#b9a07a', roughness: 1 });
  for (const zz of [-L / 2 + .04, L / 2 - .04]) { const a = new THREE.Vector3(-D / 2 - .8, .54 * H, zz), b = new THREE.Vector3(-D / 2 - 1.35, 0, zz + Math.sign(zz) * .3); const len = a.distanceTo(b); const c = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, len, 4), ropeMat); c.position.copy(a).add(b).multiplyScalar(.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); G.add(c); }
  // floor rug + a small clay lamp inside (warm interior light, seen through the open front)
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(D * .9, L * .9).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: light ? '#7a2a20' : '#4a2a20', roughness: 1 })); rug.position.y = .01; rug.receiveShadow = true; G.add(rug);
  const ig = new THREE.Mesh(new THREE.PlaneGeometry(L * .85, H * .7), new THREE.MeshBasicMaterial({ color: '#ff9a50', transparent: true, opacity: light ? .26 : .2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, map: igTex() }));
  ig.rotation.y = -Math.PI / 2; ig.position.set(D * .28, H * .36, 0); ig.userData.noDepth = true; G.add(ig);
  return G;
}
let _ig = null; function igTex() { if (_ig) return _ig; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 100, 4, 64, 90, 80); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); _ig = new THREE.CanvasTexture(c); _ig.colorSpace = THREE.SRGBColorSpace; return _ig; }
function U_s(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// Dashed Kurzgesagt arrow (quadratic arc) from a to b, drawn up to progress pr
function arrow(ui, a, b, pr, alpha, bend) {
  const X = ui.ctx; const c = [(a[0] + b[0]) / 2 + bend * 0 , Math.min(a[1], b[1]) - 40];
  const pt = s => [(1 - s) * (1 - s) * a[0] + 2 * (1 - s) * s * c[0] + s * s * b[0], (1 - s) * (1 - s) * a[1] + 2 * (1 - s) * s * c[1] + s * s * b[1]];
  X.save(); X.globalAlpha = alpha; X.strokeStyle = 'rgba(255,244,220,.95)'; X.lineWidth = 6; X.lineCap = 'round'; X.setLineDash([2, 16]); X.shadowColor = 'rgba(0,0,0,.45)'; X.shadowBlur = 8;
  X.beginPath(); const N = 40; for (let i = 0; i <= N * pr; i++) { const q = pt(i / N); i ? X.lineTo(q[0], q[1]) : X.moveTo(q[0], q[1]); } X.stroke();
  if (pr > .97) { const e = pt(1), d = pt(.94); const ang = Math.atan2(e[1] - d[1], e[0] - d[0]); X.setLineDash([]); X.fillStyle = 'rgba(255,244,220,.95)'; X.translate(e[0], e[1]); X.rotate(ang); X.beginPath(); X.moveTo(8, 0); X.lineTo(-16, -11); X.lineTo(-16, 11); X.closePath(); X.fill(); }
  X.restore();
}

// Rubber-stamp style "ŞAHİT" that slams in, with a 2D dust puff
function stamp(ui, t, t0, x, y) {
  const k = t - t0; if (k < 0) return;
  const X = ui.ctx; const inP = Math.min(1, k / .16); const s = k < .16 ? 2.3 - 1.3 * inP * inP : 1 + .06 * Math.exp(-(k - .16) * 9) * Math.cos((k - .16) * 30);
  const a = Math.min(1, k / .1);
  // dust puff
  if (k > .14) { const d = k - .14; const rr = rngLocal(77);
    for (let i = 0; i < 26; i++) { const ang = rr() * Math.PI * 2, sp = 140 + rr() * 260, rad = 22 + rr() * 34; const ex = Math.cos(ang) * (210 + rr() * 40), ey = Math.sin(ang) * (90 + rr() * 20);
      const pr = 1 - Math.exp(-d * 3.2); const px = x + ex + Math.cos(ang) * sp * pr, py = y + ey + Math.sin(ang) * sp * pr * .6 - d * 30; const al = Math.max(0, .55 * (1 - d / 1.1)) * Math.min(1, d * 12);
      if (al <= 0) continue; const g = X.createRadialGradient(px, py, 0, px, py, rad * (1 + pr * 1.6)); g.addColorStop(0, `rgba(226,196,150,${al})`); g.addColorStop(1, 'rgba(226,196,150,0)'); X.fillStyle = g; X.beginPath(); X.arc(px, py, rad * (1 + pr * 1.6), 0, Math.PI * 2); X.fill(); } }
  if (!R.stampC) { const w = 470, h = 176, c = document.createElement('canvas'); c.width = w + 80; c.height = h + 80; const S = c.getContext('2d'); S.translate(c.width / 2, c.height / 2);
    ui.x = S; ui.rrect(-w / 2, -h / 2, w, h, 26); S.fillStyle = 'rgba(30,18,14,.38)'; S.fill();
    S.lineWidth = 12; S.strokeStyle = '#ffd27a'; ui.rrect(-w / 2, -h / 2, w, h, 26); S.stroke(); S.lineWidth = 4; ui.rrect(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 16); S.stroke(); ui.x = X;
    S.font = ui.font(122, 900, 'Nunito'); if ('letterSpacing' in S) S.letterSpacing = '10px'; S.textAlign = 'center'; S.textBaseline = 'middle'; S.fillStyle = '#ffd27a'; S.fillText('ŞAHİT', 6, 8);
    S.globalCompositeOperation = 'destination-out'; const rr = rngLocal(5); for (let i = 0; i < 170; i++) { S.fillStyle = `rgba(0,0,0,${.25 + rr() * .5})`; S.beginPath(); S.arc((rr() - .5) * w, (rr() - .5) * h, .8 + rr() * 2.6, 0, Math.PI * 2); S.fill(); }
    R.stampC = c; }
  X.save(); X.globalAlpha = a; X.translate(x, y); X.rotate(-.12); X.scale(s, s);
  X.shadowColor = 'rgba(0,0,0,.5)'; X.shadowBlur = 26; X.shadowOffsetY = 10; X.drawImage(R.stampC, -R.stampC.width / 2, -R.stampC.height / 2);
  X.restore();
}
