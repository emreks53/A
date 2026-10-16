// s03 (13.20–19.60) "Dostlarının dışında düşmanları dahi onun şahsında gözüken, üstün ve yetişilemeyen ahlaka şahittirler."
// Dusk desert valley, Kurzgesagt-style split without people: left camp (light woven wool tents, green banner) = DOSTLARI,
// right camp (black goat-hair tents, dark red banner, spears) = DÜŞMANLARI. Each camp has a crackling fire whose light
// plays on the tent cloth. Between them, in the foreground on a flat rock, one steady clay lamp.
// On "onun şahsında gözüken" chains of small clay lamps ignite from BOTH camps toward that same calm light; on
// "şahittirler" a ring of lamps closes around it and a big "ŞAHİT" stamp lands with a dust puff.
import * as THREE from 'three';
import { bedouinTent, tentCloth, saduBand, rugTex, campfire } from '../engine/lib/extra_B.js';
import { cloudSprite } from '../engine/lib/fx.js';

let R = {};
const LAMP = new THREE.Vector3(0, 0, 0);

export default {
  endFade: false, // the last beat lands at the very end: let the typography dissolve with the picture in the transition
  post: {
    exposure: 1.0,
    bloom: { enabled: true, strength: .55, radius: .55, threshold: .74 },
    grade: { contrast: 1.1, saturation: 1.1, warmth: 0, lift: [.01, .012, .04], gain: [1.03, 1.0, .97] },
    vignette: .42, grain: .035,
    dof: { enabled: true, focus: 14, range: 14, amount: .4 },
  },

  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, FX, TEX } = ctx; const MAT = M.MAT;
    R = {};
    scene.fog = new THREE.FogExp2('#2a2c50', .014);
    scene.environment = await ctx.loadHDR('qwantani_dusk_2_puresky'); scene.environmentIntensity = .16;
    const sky = ENV.skyDome({ top: '#0c1230', mid: '#3a4680', horizon: '#c86a48', bottom: '#1e1a28', sunDir: [0.05, -0.05, -1], sunColor: '#ff7a40', sunSize: 0, sunGlow: .8, stars: .8, clouds: .3, cloudColor: '#8a5a78', intensity: .95 });
    scene.add(sky); R.sky = sky;

    // dusk light: afterglow from the far end of the valley (rim on the tents) + cool sky fill
    const glowL = ENV.sunLight({ color: '#ff9a72', intensity: .75, pos: [4, 17, -40], target: [0, 0, -6], size: 15, mapSize: 2048, bias: -.0004, normalBias: .03 });
    scene.add(glowL, glowL.target);
    scene.add(new THREE.HemisphereLight('#4a62c0', '#2a2030', 1.0));

    // ---- camp layout (tents face the valley centre and the viewer) ----
    const CAMPS = [
      { side: -1, tents: [[-2.5, -8.6, 35, 3.4, 2.3, 1.78, 4], [-3.5, -12.6, 30, 3.0, 2.1, 1.62, 3], [-1.85, -16.2, 45, 2.7, 2.0, 1.55, 3]], fire: [-1.1, -6.6], flag: [-3.3, -9.9] },
      { side: 1, tents: [[2.5, -9.0, -35, 3.4, 2.3, 1.78, 4], [3.5, -13.0, -30, 3.0, 2.1, 1.62, 3], [1.9, -16.6, -45, 2.7, 2.0, 1.55, 3]], fire: [1.1, -6.9], flag: [1.4, -10.8] },
    ];
    const TENTS = CAMPS.flatMap(C => C.tents);
    // ---- terrain: flat valley floor between gentle dune slopes, open toward the afterglow ----
    const tg = new THREE.PlaneGeometry(160, 160, 200, 200); tg.rotateX(-Math.PI / 2);
    const fb = TEX.fbmField(9, 3, 5); const tp = tg.attributes.position; const cols = new Float32Array(tp.count * 3);
    const hRaw = (x, z) => { const ax = Math.abs(x); const u = x / 160 + .5, v = z / 160 + .5; const n = fb(u, v);
      const slope = Math.pow(U.smoothstep(5.5, 34, ax), 1.4) * 9; const far = U.smoothstep(-30, -85, z) * 3.5;
      return slope + far + n * (.18 + U.smoothstep(4, 16, ax) * 2.2) + Math.sin(z * .35 + x * .2) * .05; };
    // camp ground is levelled under every tent (so rugs, poles and curtain hems sit exactly on the sand — no z-fighting)
    const FLAT = TENTS.map(([x, z, yawDeg, L, D]) => ({ x, z, c: Math.cos(yawDeg * Math.PI / 180), s: Math.sin(yawDeg * Math.PI / 180), hx: L / 2 + .25, hz: D / 2 + .3, h0: hRaw(x, z) }));
    const hAt = (x, z) => { let h = hRaw(x, z); for (const f of FLAT) { const dx = x - f.x, dz = z - f.z; const lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c;
        const w = U.smoothstep(f.hx + 1.5, f.hx, Math.abs(lx)) * U.smoothstep(f.hz + 1.5, f.hz, Math.abs(lz)); if (w > 0) h = U.lerp(h, f.h0, w); } return h; };
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

    const inCamp = (x, z) => Math.abs(x) > .3 && Math.abs(x) < 5.2 && z < -5.3 && z > -19;

    // scattered rocks + desert scrub
    const rnd = U.rng(31);
    const rockGeo = new THREE.SphereGeometry(1, 28, 18); { const p = rockGeo.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const d = 1 + .2 * Math.sin(v.x * 3.1 + v.y * 2.3) + .12 * Math.sin(v.z * 4.7 - v.x * 1.7) + .05 * Math.sin(v.x * 9 + v.z * 7); v.multiplyScalar(d); v.y *= .62; p.setXYZ(i, v.x, v.y, v.z); } rockGeo.computeVertexNormals(); }
    const rocksA = []; for (let i = 0; i < 80; i++) { const side = rnd() < .5 ? -1 : 1; const x = side * (5.5 + rnd() * 22), z = 8 - rnd() * 60; const s = .25 + Math.pow(rnd(), 2) * 1.8; rocksA.push([x, hAt(x, z) - s * .2, z, s, rnd() * 6.3]); }
    for (let i = 0; i < 16; i++) { const x = (rnd() - .5) * 10, z = 6 - rnd() * 18; if ((Math.abs(x) < 2.2 && z < 3 && z > -11) || inCamp(x, z)) continue; const s = .07 + rnd() * .16; rocksA.push([x, hAt(x, z) - .02, z, s, rnd() * 6.3]); }
    const stoneMat = MAT.stone({ a: '#a07a60', b: '#6a4a3c', seed: 3 });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (const [x, z, s] of [[-2.1, 3.6, .32], [-1.55, 4.3, .14], [2.3, 3.0, .26], [1.8, 4.6, .18], [-2.9, 1.8, .2], [3.0, 1.2, .3], [.9, 3.9, .07], [-.7, 2.6, .06]]) rocksA.push([x, hAt(x, z) - s * .25, z, s, x * 3]);
    const rocks = new THREE.InstancedMesh(rockGeo, stoneMat, rocksA.length);
    rocksA.forEach(([x, y, z, s, r], i) => { m4.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(0, r, 0)), new THREE.Vector3(s, s, s)); rocks.setMatrixAt(i, m4); });
    rocks.castShadow = rocks.receiveShadow = true; scene.add(rocks);
    const scrubGeo = new THREE.IcosahedronGeometry(1, 1); scrubGeo.scale(1, .55, 1);
    const scrubA = [[-1.4, 3.2, .22], [1.25, 2.4, .18], [2.6, 4.2, .3], [-2.6, 4.8, .26]]; for (let i = 0; i < 46; i++) { const x = (rnd() < .5 ? -1 : 1) * (1.2 + rnd() * 12), z = 7 - rnd() * 40; if ((Math.abs(x) < 4.6 && z < 1 && z > -19) || inCamp(x, z)) continue; scrubA.push([x, z, .16 + rnd() * .28]); }
    const scrub = new THREE.InstancedMesh(scrubGeo, new THREE.MeshStandardMaterial({ color: '#4e5132', roughness: 1 }), scrubA.length);
    scrubA.forEach(([x, z, s], i) => { m4.compose(new THREE.Vector3(x, hAt(x, z) + s * .2, z), q.identity(), new THREE.Vector3(s, s, s)); scrub.setMatrixAt(i, m4); });
    scrub.castShadow = true; scene.add(scrub);

    // ---- the two camps ----
    R.flags = []; R.fires = []; R.tentA = [];
    const poleMat = MAT.wood({ a: '#7a5532', b: '#4a3018', rings: 30 });
    // dark goat-hair rope (a pale rope lit by the fires blooms into bright lines)
    const ropeMat = new THREE.MeshStandardMaterial({ color: '#7e6a50', roughness: 1 });
    for (const C of CAMPS) {
      const friend = C.side < 0; const G = new THREE.Group(); scene.add(G);
      const cl = tentCloth({ dark: !friend, seed: friend ? 4 : 8 });
      const clothMat = new THREE.MeshPhysicalMaterial({ map: cl.map, normalMap: cl.normalMap, normalScale: new THREE.Vector2(.7, .7), roughnessMap: cl.roughnessMap, roughness: 1, sheen: friend ? .5 : .9, sheenRoughness: .55, sheenColor: new THREE.Color(friend ? '#ffe2c0' : '#c8a08a'), side: THREE.DoubleSide });
      const band = saduBand(friend ? { c1: '#a8321f', c2: '#f0e2c2', c3: '#24402c', c4: '#2f7a4a', seed: 2 } : { c1: '#8a1c16', c2: '#e8d6b8', c3: '#161210', c4: '#c23a24', seed: 5 });
      const rug = rugTex(friend ? { a: '#8a2a1e', b: '#22335a', c: '#e2c48a', d: '#3a1810', seed: 3 } : { a: '#5a1a14', b: '#1a1a24', c: '#b89a6a', d: '#2a120c', seed: 6 });
      const cushion = new THREE.MeshPhysicalMaterial({ color: friend ? '#8a3a24' : '#5a2018', roughness: .95, sheen: 1, sheenColor: new THREE.Color('#ffb088'), sheenRoughness: .5 });
      C.tents.forEach(([x, z, yawDeg, L, D, hM, n], k) => {
        const T = bedouinTent({ L, D, hM, hB: hM * .58, hF: hM * .8, n, seed: k * 5 + (friend ? 1 : 21), mat: clothMat, poleMat, ropeMat, band, rug, cushionMat: cushion, tassel: friend ? '#c8401e' : '#9a1e16', nx: k ? 54 : 76, nz: k ? 28 : 40, endRopes: [friend ? -1 : 1], skipFront: k ? [friend ? n - 1 : 0] : (friend ? [1, 2, 3] : [0, 1, 2]) }); // main tent: no front ropes staked into the campfire ring
        T.position.set(x, hAt(x, z) - .005, z); T.rotation.y = yawDeg * Math.PI / 180; G.add(T);
        if (k === 0) R.tentA.push(T);
      });
      // banner (rāya) flying from a tall pole that rises through the main tent's ridge (wind toward +x for both camps)
      const TA = R.tentA[R.tentA.length - 1]; TA.updateMatrixWorld(true);
      const plx = TA.userData.poleX[1]; const pb = TA.localToWorld(new THREE.Vector3(plx, 0, 0)), ptop = TA.localToWorld(new THREE.Vector3(plx, 3.1, 0));
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, 3.1, 10), poleMat); pole.position.copy(pb).add(new THREE.Vector3(0, 1.55, 0)); pole.castShadow = true; G.add(pole);
      const tip = M.lathe([[.045, 0], [.055, .035], [.018, .17], [.0001, .22]], MAT.brass(), 12); tip.position.copy(ptop); G.add(tip);
      const fg = new THREE.PlaneGeometry(1.0, .62, 26, 12); fg.translate(.5, 0, 0); fg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(fg.attributes.position.count * 3).fill(1), 3));
      const flagTex = TEX.drawTexture(256, 160, (x, w, h) => { x.fillStyle = friend ? '#278550' : '#7a1917'; x.fillRect(0, 0, w, h);
        const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.22)'); gr.addColorStop(.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(255,190,120,.10)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = friend ? 'rgba(10,50,25,.5)' : 'rgba(50,8,6,.5)'; x.fillRect(0, 0, 14, h); x.fillRect(0, 0, w, 6); x.fillRect(0, h - 6, w, 6); const r = U.rng(friend ? 2 : 3); x.globalAlpha = .1; for (let i = 0; i < 700; i++) { x.fillStyle = r() < .5 ? '#000' : '#fff'; x.fillRect(r() * w, r() * h, 3, 1); } });
      const flagMat = new THREE.MeshPhysicalMaterial({ map: flagTex, roughness: .9, sheen: .35, sheenRoughness: .6, sheenColor: new THREE.Color(friend ? '#58b07c' : '#b0453a'), vertexColors: true, side: THREE.DoubleSide });
      const flag = new THREE.Mesh(fg, flagMat); flag.position.copy(ptop).add(new THREE.Vector3(0, -.36, 0)); flag.rotation.y = -.55; flag.castShadow = true; G.add(flag); // streams downwind (+x, a little toward the viewer) so the ripple reads in silhouette
      flag.userData.base = Float32Array.from(fg.attributes.position.array); flag.userData.L = 1.0; R.flags.push(flag);
      R[friend ? 'flagTopL' : 'flagTopR'] = ptop.clone().add(new THREE.Vector3(0, .2, 0));
      // campfire in front of the main tent: its light plays on the cloth
      const [fx, fz] = C.fire; const F = campfire({ seed: friend ? 1 : 5, scale: 1, intensity: 11, distance: 11 }); F.position.set(fx, hAt(fx, fz), fz); G.add(F); R.fires.push(F.userData.light);
      // props
      if (friend) {
        const jarMat = MAT.clay({ a: '#b8784c', b: '#7c4a2c' });
        [[-1.75, -6.0, 1], [-2.0, -5.85, .8], [-1.7, -5.65, .9]].forEach(([x, z, s]) => { const j = M.lathe([[.0001, 0], [.1, 0], [.17, .12], [.18, .24], [.12, .38], [.07, .42], [.08, .47], [.0001, .47]], jarMat, 24); j.scale.setScalar(s); j.position.set(x, hAt(x, z), z); M.shadowAll(j); G.add(j); });
        const pot = M.lathe([[.0001, 0], [.12, .01], [.17, .08], [.16, .16], [.12, .2], [.13, .22], [.0001, .22]], new THREE.MeshStandardMaterial({ color: '#3a2a22', roughness: .6, metalness: .3 }), 22); pot.position.set(fx - .62, hAt(fx - .62, fz + .1), fz + .1); M.shadowAll(pot); G.add(pot);
      } else {
        // spears planted upright beside the black tent + a round leather shield leaning on them
        const shaftMat = MAT.darkWood({ rings: 24 }); const iron = new THREE.MeshStandardMaterial({ color: '#77726a', metalness: .85, roughness: .35 });
        [[1.62, -6.25, .05, -.04], [1.8, -6.4, -.06, .05], [1.7, -6.55, .02, .07]].forEach(([x, z, rx, rz], i) => { const sp = new THREE.Group(); const h = 2.2 + i * .12;
          const sh = new THREE.Mesh(new THREE.CylinderGeometry(.016, .02, h, 6), shaftMat); sh.position.y = h / 2; sp.add(sh);
          const hd = new THREE.Mesh(new THREE.ConeGeometry(.035, .24, 6), iron); hd.scale.z = .45; hd.position.y = h + .12; sp.add(hd);
          const bd = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .06, 6), iron); bd.position.y = h - .01; sp.add(bd);
          sp.position.set(x, hAt(x, z) - .1, z); sp.rotation.set(rx, 0, rz); M.shadowAll(sp); G.add(sp); });
        // a rolled leather saddle-bag by the spears (war camp gear)
        { const bag = new THREE.Mesh(new THREE.CapsuleGeometry(.12, .42, 6, 14), MAT.leather({ a: '#6a3a22', b: '#3a1e10' })); bag.rotation.set(0, .7, Math.PI / 2); bag.position.set(1.5, hAt(1.5, -6.05) + .11, -6.05); bag.castShadow = bag.receiveShadow = true; G.add(bag); }
      }
    }

    // ---- the calm light: a clay oil lamp on a flat stone in the foreground centre ----
    const slabGeo = new THREE.SphereGeometry(1, 48, 24); { const p = slabGeo.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const d = 1 + .08 * Math.sin(v.x * 4.1 + v.z * 2.3) + .05 * Math.sin(v.z * 6.7 - v.x * 3.7); v.multiplyScalar(d); v.y = Math.min(v.y, .55 + .03 * Math.sin(v.x * 5)); p.setXYZ(i, v.x * .62, v.y * .34, v.z * .5); } slabGeo.computeVertexNormals(); }
    const slab = new THREE.Mesh(slabGeo, MAT.stone({ a: '#c09a7c', b: '#866250', seed: 12 })); slab.position.set(LAMP.x, hAt(LAMP.x, LAMP.z) + .02, LAMP.z); slab.rotation.y = .3; slab.castShadow = slab.receiveShadow = true; scene.add(slab);
    const lamp = M.oilLamp({ scale: 3.3, light: true, lightIntensity: 1, lightDistance: 7, seed: 5 }); lamp.position.set(LAMP.x - .08, slab.position.y + .55 * .34 - .005, LAMP.z); lamp.rotation.y = -Math.PI / 2 + .9; scene.add(lamp); R.lamp = lamp;
    lamp.userData.light.intensity = 2.4; lamp.userData.light.distance = 7; lamp.userData.light.color.set('#ffc27a');
    lamp.userData.flame.userData.uniforms.intensity.value = 4.2; lamp.userData.glow.material.opacity = .45;
    lamp.updateMatrixWorld(true); R.lampTop = lamp.userData.flame.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .12, 0));
    const halo = FX.glow({ size: 1.2, opacity: .2, color: '#ffd9a0' }); halo.position.copy(R.lampTop).add(new THREE.Vector3(0, -.04, 0)); scene.add(halo); R.halo = halo;
    const poolTex = TEX.gradientTex([[0, 'rgba(255,255,255,1)'], [.3, 'rgba(255,255,255,.45)'], [.7, 'rgba(255,255,255,.08)'], [1, 'rgba(255,255,255,0)']], { w: 128, h: 128, radial: true });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolTex, color: '#ffb066', transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    pool.position.set(LAMP.x, hAt(LAMP.x, LAMP.z) + .04, LAMP.z); pool.userData.noDepth = true; pool.renderOrder = 2; scene.add(pool);
    R.slabFront = new THREE.Vector3(LAMP.x, hAt(LAMP.x, LAMP.z + .62), LAMP.z + .62);

    // ---- chains of small lamps from both camp fires toward the central light + a ring around it ----
    const items = [];
    const tChain = ctx.wordTime('onun'), tSah = ctx.wordTime('şahittirler');
    for (const C of CAMPS) {
      const side = C.side; const S = new THREE.Vector3(side * 1.0, 0, C.fire[1] + .75), Cc = new THREE.Vector3(side * 1.5, 0, -3.3), E = new THREE.Vector3(side * .98, 0, -.55);
      const curve = new THREE.QuadraticBezierCurve3(S, Cc, E); const n = 13;
      for (let i = 0; i < n; i++) { const p = curve.getPoint(i / (n - 1)); items.push({ x: p.x, z: p.z, on: tChain + .05 + i * .085 + (side > 0 ? .06 : 0), rot: Math.atan2(LAMP.x - p.x, LAMP.z - p.z) }); }
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
    scene.add(FX.particles({ count: 150, center: [0, 1.4, -4], box: [9, 2.8, 14], size: 3.5, color: '#ffd9b0', opacity: .26, drift: [.18, .02, 0], swirl: .15, seed: 11 }));

    camera.fov = 38; camera.near = .1; camera.far = 900; camera.updateProjectionMatrix();
    R.rig = U.cameraRig(camera, {
      pos: [[0.55, 3.75, 14.8], [0.4, 3.55, 13.4], [0.15, 3.3, 12.2], [0, 3.1, 11.2]],
      look: [[0.12, .3, -3.4], [.08, .28, -3.35], [0.03, .26, -3.25], [0, .25, -3.2]],
      t0: -0.6, t1: 7.0, arc: true, ease: t => .3 * t + .7 * (-(Math.cos(Math.PI * t) - 1) / 2), shake: { amp: .02, freq: .4 },
    });
    // label anchors: tops of the two banner poles
    R.anchorL = R.flagTopL; R.anchorR = R.flagTopR;
  },

  update(t, ctx) {
    const { ui, U, post, camera, ENV } = ctx;
    R.rig.update(t);
    // stamp impact shake
    const tSah = ctx.wordTime('şahittirler');
    const ti = t - (tSah + .12); if (ti > 0 && ti < .5) { const a = .045 * Math.exp(-ti * 9); camera.position.x += Math.sin(ti * 70) * a; camera.position.y += Math.cos(ti * 55) * a * .7; }
    // fires flicker, flags wave
    R.fires.forEach((L, i) => ENV.flicker(L, t, i * 3 + 1, .2));
    // (the visible face is back-lit by the afterglow, so the folds also get a baked light/dark term from the wave slope)
    R.flags.forEach((f, k) => { const g = f.geometry, p = g.attributes.position, c = g.attributes.color, b = f.userData.base; const ph = k * 1.7;
      for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; const u = x / f.userData.L; const a1 = x * 7 - t * 6.8 + ph, a2 = x * 12 - t * 10 + y * 3 + ph;
        const w = Math.sin(a1) * .16 * u + Math.sin(a2) * .04 * u; p.setXYZ(i, x * (1 - .05 * u), y - u * u * .06 + Math.sin(x * 3 - t * 4 + ph) * .015 * u + Math.sin(x * 6 - t * 7 + ph) * .045 * u, w);
        const sl = Math.cos(a1) * 1.12 * u + Math.cos(a2) * .48 * u + (Math.sin(a1) * .16 + Math.sin(a2) * .04); const sh = U.clamp(.82 + .3 * sl, .48, 1.16); c.setXYZ(i, sh, sh, sh); }
      p.needsUpdate = true; c.needsUpdate = true; g.computeVertexNormals(); });
    // lamp chain pools
    const pc = R.pools.instanceColor; R.items.forEach((it, i) => { const b = U.smoothstep(it.on, it.on + .3, t) * (.88 + .12 * Math.sin(t * 9 + i)); pc.setXYZ(i, b, b * .8, b * .6); }); pc.needsUpdate = true;
    // the central light breathes very slightly (steady flame), gains attention on "onun şahsında"
    const tOn = ctx.wordTime('onun');
    R.halo.material.opacity = .16 + .12 * U.smoothstep(tOn - .2, tOn + .8, t);
    // DOF on the lamp; the camps stay readable
    post.dof.focus = camera.position.distanceTo(LAMP); post.dof.range = 24; post.dof.amount = .36;

    // ---- typography ----
    const tD = ctx.wordTime('dostlarının'), tDu = ctx.wordTime('düşmanları'), tDa = ctx.wordTime('dahi'), tU = ctx.wordTime('üstün'), tY = ctx.wordTime('yetişilemeyen');
    const endT = 99;
    const aL = ui.project(R.anchorL), aR = ui.project(R.anchorR);
    const pL = pillPos(ui, aL, 'DOSTLARI', 50), pR = pillPos(ui, aR, 'DÜŞMANLARI', 50);
    // leader (dot + line ending at the pill's bottom edge, never through the letters), then an opaque pill that lands on the word
    leader(ui, t, tD - .45, aL, pL, '#7dffb0', 'rgba(220,255,230,.9)');
    leader(ui, t, tDu - .45, aR, pR, '#ff9a8a', 'rgba(255,225,220,.9)');
    ui.pill('DOSTLARI', { t, t0: tD - .2, x: pL[0], y: pL[1], size: 50, weight: 900, bg: 'rgb(31,110,66)', color: '#f2fff4' });
    ui.pill('DÜŞMANLARI', { t, t0: tDu - .2, x: pR[0], y: pR[1], size: 50, weight: 900, bg: 'rgb(140,30,26)', color: '#fff0ec' });
    // "dahi" — small gold tag tucked under the right end of the DÜŞMANLARI pill, clear of the pill and its leader line
    ui.text('dahi', { t, t0: tDa - .03, t1: endT, x: Math.min(pR[0] + pR[2] / 2 - 38, 1000 - 52), y: pR[1] + 82, size: 40, weight: 900, color: '#ffd27a', anim: 'pop', rotate: -.06, shadowBlur: 10, shadowColor: 'rgba(20,6,4,.85)' });
    // dashed arrows: both camps -> the same light
    const lampS = ui.project(R.lampTop);
    for (const [k, p0] of [[0, pL], [1, pR]]) {
      const a0 = [p0[0] + (k ? -40 : 40), p0[1] + 46]; const pr = U.prog(t, tOn + k * .12, tOn + .95 + k * .12, 'inOutCubic'); const fade = 1 - U.smoothstep(tU - .1, tU + .35, t);
      if (pr > 0 && fade > 0) arrow(ui, a0, [lampS[0] + (k ? 34 : -34), lampS[1] - 70], pr, fade, k ? -1 : 1);
    }
    // label for the light
    const slabS = ui.project(R.slabFront);
    // typed in step with the narration: 'üstün' (5) holds through the pause, ' ve' (8), ' yetişilemeyen' (22), ' ahlâk' (28)
    const tVe = ctx.wordTime('ve'), tA = ctx.wordTime('ahlaka');
    const nC = U.kf(t, [[tU - .04, 0], [tU + .32, 5], [tVe - .05, 5], [tVe + .1, 8], [tY - .03, 8], [tY + .44, 22], [tA - .03, 22], [tA + .26, 28]], x => x);
    const hold = t > tU + .32 && t < tVe - .05; const caret = !hold || ((t - tU - .32) * 2.4) % 1 < .55;
    typedPill(ui, 'üstün ve yetişilemeyen ahlâk', t, tU - .04, nC, caret, 540, U.clamp(slabS[1] + 62, 1150, 1288), 44);
    // ŞAHİT stamp with dust puff
    stamp(ui, t, tSah + .02, 540, 600);
  },
};

// ------------------------------------------------------------------------------------------------
function rngLocal(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// pill placed above its anchor (the camp), kept inside the safe zone x 80..1000; returns [x, y, width]
function pillPos(ui, a, str, size) { const X = ui.ctx; X.save(); X.font = ui.font(size, 900, 'Nunito'); const w = X.measureText(str).width + size * .84; X.restore();
  return [Math.min(Math.max(a[0], 80 + w / 2 + 8), 1000 - w / 2 - 8), Math.min(Math.max(a[1] - 112, 292), 420), w]; }

// Callout leader: dot pops on the anchor, line grows to the pill's bottom edge (the opaque pill is drawn on top, so the line never crosses its text)
function leader(ui, t, t0, a, p, dotColor, lineColor) {
  const k = t - t0; if (k <= 0) return; const X = ui.ctx; const c01 = v => Math.max(0, Math.min(1, v));
  const pr = 1 - Math.pow(1 - c01(k / .4), 3), al = 1 - Math.pow(1 - c01(k / .3), 3); const u = c01(k / .3), ds = 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
  const bx = Math.min(Math.max(a[0], p[0] - p[2] / 2 + 34), p[0] + p[2] / 2 - 34), by = p[1] + 38;
  X.save(); X.globalAlpha = al; X.lineCap = 'round'; X.shadowColor = 'rgba(0,0,0,.4)'; X.shadowBlur = 8;
  X.strokeStyle = lineColor; X.lineWidth = 4; X.beginPath(); X.moveTo(a[0], a[1]); X.lineTo(a[0] + (bx - a[0]) * pr, a[1] + (by - a[1]) * pr); X.stroke();
  X.beginPath(); X.arc(a[0], a[1], 9 * Math.max(0, ds), 0, Math.PI * 2); X.fillStyle = dotColor; X.fill();
  X.restore();
}

// Dashed Kurzgesagt arrow (quadratic arc) from a to b, drawn up to progress pr
function arrow(ui, a, b, pr, alpha, bend) {
  const X = ui.ctx; const c = [(a[0] + b[0]) / 2 - bend * 60, (a[1] + b[1]) / 2 - 40];
  const pt = s => [(1 - s) * (1 - s) * a[0] + 2 * (1 - s) * s * c[0] + s * s * b[0], (1 - s) * (1 - s) * a[1] + 2 * (1 - s) * s * c[1] + s * s * b[1]];
  X.save(); X.globalAlpha = alpha; X.lineCap = 'round'; X.setLineDash([2, 16]);
  const path = () => { X.beginPath(); const N = 48; for (let i = 0; i <= N * pr; i++) { const q = pt(i / N); i ? X.lineTo(q[0], q[1]) : X.moveTo(q[0], q[1]); } };
  X.strokeStyle = 'rgba(20,12,20,.45)'; X.lineWidth = 10; path(); X.stroke();
  X.strokeStyle = 'rgba(255,244,220,.96)'; X.lineWidth = 6; path(); X.stroke();
  if (pr > .97) { const e = pt(1), d = pt(.94); const ang = Math.atan2(e[1] - d[1], e[0] - d[0]); X.setLineDash([]); X.translate(e[0], e[1]); X.rotate(ang);
    X.beginPath(); X.moveTo(10, 0); X.lineTo(-17, -12); X.lineTo(-17, 12); X.closePath(); X.fillStyle = 'rgba(20,12,20,.4)'; X.lineWidth = 5; X.strokeStyle = 'rgba(20,12,20,.4)'; X.stroke(); X.fillStyle = 'rgba(255,244,220,.96)'; X.fill(); }
  X.restore();
}

// Rubber-stamp style "ŞAHİT" that slams in, with a 2D dust puff (soft noisy sand clouds)
function stamp(ui, t, t0, x, y) {
  const k = t - t0; if (k < 0) return;
  const X = ui.ctx; const inP = Math.min(1, k / .16); const s = k < .16 ? 2.3 - 1.3 * inP * inP : 1 + .06 * Math.exp(-(k - .16) * 9) * Math.cos((k - .16) * 30);
  const a = Math.min(1, k / .1);
  if (!R.puffC) { const src = cloudSprite().image; const c = document.createElement('canvas'); c.width = c.height = 128; const P = c.getContext('2d'); P.drawImage(src, 0, 0, 128, 128); P.globalCompositeOperation = 'source-in'; P.fillStyle = '#e6caa0'; P.fillRect(0, 0, 128, 128); R.puffC = c; }
  if (k > .14) { const d = k - .14; const rr = rngLocal(77);
    for (let i = 0; i < 18; i++) { const ang = rr() * Math.PI * 2, sp = 120 + rr() * 220, rad = 46 + rr() * 50, rot = rr() * 6.28; const ex = Math.cos(ang) * (215 + rr() * 30), ey = Math.sin(ang) * (82 + rr() * 16);
      const pr = 1 - Math.exp(-d * 3.0); const px = x + ex + Math.cos(ang) * sp * pr, py = y + ey + Math.sin(ang) * sp * pr * .5 - d * 26; const al = Math.max(0, .5 * (1 - d / 1.2)) * Math.min(1, d * 10);
      if (al <= 0) continue; const R2 = rad * (1 + pr * 1.4); X.save(); X.globalAlpha = al; X.translate(px, py); X.rotate(rot + d * .4); X.drawImage(R.puffC, -R2, -R2, R2 * 2, R2 * 2); X.restore(); } }
  if (!R.stampC) { const w = 470, h = 176, c = document.createElement('canvas'); c.width = w + 80; c.height = h + 80; const S = c.getContext('2d'); S.translate(c.width / 2, c.height / 2);
    ui.x = S; ui.rrect(-w / 2, -h / 2, w, h, 26); S.fillStyle = 'rgba(30,18,14,.42)'; S.fill();
    S.lineWidth = 12; S.strokeStyle = '#ffd27a'; ui.rrect(-w / 2, -h / 2, w, h, 26); S.stroke(); S.lineWidth = 4; ui.rrect(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 16); S.stroke(); ui.x = X;
    S.font = ui.font(122, 900, 'Nunito'); if ('letterSpacing' in S) S.letterSpacing = '10px'; S.textAlign = 'center'; S.textBaseline = 'middle'; S.fillStyle = '#ffd27a'; S.fillText('ŞAHİT', 6, 8);
    S.globalCompositeOperation = 'destination-out'; const rr = rngLocal(5); for (let i = 0; i < 170; i++) { S.fillStyle = `rgba(0,0,0,${.25 + rr() * .5})`; S.beginPath(); S.arc((rr() - .5) * w, (rr() - .5) * h, .8 + rr() * 2.6, 0, Math.PI * 2); S.fill(); }
    R.stampC = c; }
  X.save(); X.globalAlpha = a; X.translate(x, y); X.rotate(-.12); X.scale(s, s);
  X.shadowColor = 'rgba(0,0,0,.5)'; X.shadowBlur = 26; X.shadowOffsetY = 10; X.drawImage(R.stampC, -R.stampC.width / 2, -R.stampC.height / 2);
  X.restore();
}

// pill whose background grows with the typed text (no empty box before the first letters)
function typedPill(ui, str, t, t0, nC, caret, x, y, size) {
  const k = t - t0; if (k < 0) return; const X = ui.ctx;
  const n = Math.min(str.length, Math.max(1, Math.ceil(nC - 1e-6))); const shown = str.slice(0, n);
  X.save(); X.font = ui.font(size, 800, 'Nunito'); const full = X.measureText(str).width, w = X.measureText(shown).width;
  const a = Math.min(1, k / .18); const pad = size * .42, h = size * 1.12 + pad * 1.24; const bw = Math.max(w, size * .6) + pad * 2;
  X.globalAlpha = a; X.translate(x - full / 2 - pad, y);
  X.fillStyle = 'rgba(22,24,44,.8)'; X.shadowColor = 'rgba(0,0,0,.35)'; X.shadowBlur = 24; X.shadowOffsetY = 8; ui.rrect(0, -h / 2, bw, h, h / 2); X.fill();
  X.shadowColor = 'transparent'; X.fillStyle = '#fff4dc'; X.textAlign = 'left'; X.textBaseline = 'middle'; X.fillText(shown, pad, 0);
  if (n < str.length && caret) { X.fillStyle = 'rgba(255,244,220,.8)'; X.fillRect(pad + w + 4, -size * .4, 4, size * .8); }
  X.restore();
}
