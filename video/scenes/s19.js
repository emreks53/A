// s19 (106.90–113.30) "Daha bunlar gibi birçok düşünür Peygamberimiz ﷺ'ın ahlakına hayran kalmıştır."
// Visual: a vast, dark, vaulted reading hall at night (moonlight through clerestory windows). Rows of empty writing
// desks recede into depth — only the two nearest candles burn ("bunlar gibi"). On "birçok" the candles ignite desk by
// desk in a wave into the distance until the whole hall glows warmly; the camera glides forward and cranes up.
// Far end: a tall arched window with the first pre-dawn glow (leads into the morning of s20).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { path3, spineAtlas, bookWall, instances, flamePoints, lightPools, contactShadows, drawPage, plankTex } from '../engine/lib/extra_H.js';

let R = {};
const COLS = [-4.0, -1.6, 1.6, 4.0], ROWS = 16, Z0 = -1.6, DZ = 2.45, TOPY = .76;

export default {
  post: {
    exposure: 1.1,
    bloom: { enabled: true, strength: 0.6, radius: 0.6, threshold: 0.72 },
    grade: { contrast: 1.06, saturation: 1.1, warmth: 0.0, lift: [0.008, 0.012, 0.04], gain: [1.02, 1.0, 0.97] },
    vignette: 0.45, grain: 0.03,
    dof: { enabled: false },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, FX, TEX } = ctx;
    R = {};
    const rnd = U.rng(1919);
    scene.background = new THREE.Color('#0b1020');
    scene.fog = new THREE.FogExp2('#0d1324', 0.016); R.fog = scene.fog;
    scene.environment = await ctx.loadHDR('old_hall'); scene.environmentIntensity = 0.12; R.envI = 0.12;
    R.hemi = new THREE.HemisphereLight('#3f5288', '#1a120e', 0.55); scene.add(R.hemi);
    const moon = new THREE.DirectionalLight('#86a2e6', 0.55); moon.position.set(-12, 16, 2); moon.target.position.set(4, 0, -16); scene.add(moon, moon.target); R.moon = moon;

    // ---------- architecture ----------
    const HALF = 7.0, ZN = 4, ZF = -40.5, LEN = ZN - ZF;
    const ftex = plankTex({ a: '#4e2e1a', b: '#2c1a0e', planks: 10, seed: 5 }); ftex.repeat.set(12, 30);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF + 1, LEN + 4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: ftex, roughness: .5, envMapIntensity: .5 }));
    floor.position.set(0, 0, (ZN + ZF) / 2); scene.add(floor);
    const caseMat = M.MAT.wood({ a: '#6b3d20', b: '#3a1f0f', rings: 14, seed: 21 });
    const shelfMat = M.MAT.wood({ a: '#7a4626', b: '#45240f', rings: 30, seed: 23 });
    const atlas = spineAtlas({ seed: 91 });
    const levels = () => [{ y0: 0, plinth: .14, rows: 8, rowH: .38, top: .22, gallery: true }, { y0: 3.62, plinth: .08, rows: 7, rowH: .37, top: .3 }];
    for (const side of [-1, 1]) {
      // local +z (spines) faces the hall centre; local x maps to world -z (left wall) or +z (right wall)
      const w = side < 0 ? bookWall(M, { X0: -(ZN - .5), X1: -(ZF + .5), bay: 1.0, levels: levels(), atlas, R: rnd, caseMat, shelfMat, segs: 2, galleryDepth: 1.0, balStep: .2, cheap: true })
                         : bookWall(M, { X0: ZF + .5, X1: ZN - .5, bay: 1.0, levels: levels(), atlas, R: rnd, caseMat, shelfMat, segs: 2, galleryDepth: 1.0, balStep: .2, cheap: true });
      w.group.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      w.group.position.set(side * HALF, 0, 0);
      scene.add(w.group);
    }
    // clerestory band, windows and barrel vault
    const plaster = M.MAT.plaster({ a: '#b9a68a', b: '#8c7a62', repeat: [6, 1] });
    const winTex = TEX.drawTexture(128, 256, (x, W, H) => {
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a2a5a'); g.addColorStop(1, '#3a5290'); x.fillStyle = g;
      x.beginPath(); x.moveTo(0, H); x.lineTo(0, W / 2); x.arc(W / 2, W / 2, W / 2, Math.PI, 0); x.lineTo(W, H); x.closePath(); x.fill();
      x.fillStyle = '#0a0d18'; x.fillRect(W / 2 - 3, 0, 6, H); x.fillRect(0, H * .55, W, 5);
    });
    const winMat = new THREE.MeshBasicMaterial({ map: winTex, transparent: true, fog: false, color: new THREE.Color(1.6, 1.6, 1.8) });
    const winList = [];
    for (const side of [-1, 1]) {
      const band = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 3.2), plaster); band.position.set(side * (HALF + .05), 7.1 + 1.6, (ZN + ZF) / 2); band.rotation.y = -side * Math.PI / 2; scene.add(band);
      for (let z = ZN - 3; z > ZF + 1; z -= 4) winList.push({ x: side * (HALF - .02), y: 8.65, z, ry: -side * Math.PI / 2 });
    }
    scene.add(instances(new THREE.PlaneGeometry(1.3, 2.5), winMat, winList, { cast: false, receive: false }));
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(HALF + .05, HALF + .05, LEN, 32, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8a7860', roughness: .95, side: THREE.BackSide }));
    vault.position.set(0, 10.3, (ZN + ZF) / 2); scene.add(vault);
    const ribList = []; for (let z = ZN - 1; z > ZF; z -= 4) ribList.push({ x: 0, y: 10.3, z });
    scene.add(instances(new THREE.TorusGeometry(HALF - .05, .12, 8, 40, Math.PI), caseMat, ribList, { cast: false }));
    // far wall + tall arched window with the first pre-dawn glow
    const farWall = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF + .2, 18), plaster); farWall.position.set(0, 9, ZF); scene.add(farWall);
    const dawnTex = TEX.drawTexture(256, 512, (x, W, H) => {
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#121c3c'); g.addColorStop(.6, '#2c3c6c'); g.addColorStop(.86, '#7a6a80'); g.addColorStop(1, '#c98a66'); x.fillStyle = g;
      x.beginPath(); x.moveTo(0, H); x.lineTo(0, W / 2); x.arc(W / 2, W / 2, W / 2, Math.PI, 0); x.lineTo(W, H); x.closePath(); x.fill();
      x.fillStyle = '#120c08'; for (const fx of [.33, .66]) x.fillRect(W * fx - 3, W * .2, 6, H); for (const fy of [.35, .55, .75]) x.fillRect(0, H * fy, W, 6);
    });
    const dawn = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6.8), new THREE.MeshBasicMaterial({ map: dawnTex, transparent: true, fog: false, color: new THREE.Color(1, 1, 1) }));
    dawn.position.set(0, 2.4 + 3.4, ZF + .06); scene.add(dawn); R.dawn = dawn;
    const farCase = bookWall(M, { X0: -HALF + .3, X1: -2.3, levels: [{ y0: 0, plinth: .14, rows: 8, rowH: .38, top: .22 }], atlas, R: rnd, caseMat, shelfMat, segs: 2, cheap: true });
    farCase.group.position.z = ZF + .35; scene.add(farCase.group);
    const farCase2 = bookWall(M, { X0: 2.3, X1: HALF - .3, levels: [{ y0: 0, plinth: .14, rows: 8, rowH: .38, top: .22 }], atlas, R: rnd, caseMat, shelfMat, segs: 2, cheap: true });
    farCase2.group.position.z = ZF + .35; scene.add(farCase2.group);
    // moonbeams through the left clerestory windows
    for (let z = ZN - 3; z > ZF + 6; z -= 8) { const sh = FX.lightShaft({ from: [-HALF + .2, 8.4, z], to: [-1.2, 0, z - 2.2], r0: .5, r1: .8, color: '#7f9fe8', opacity: .032 }); scene.add(sh); }

    // ---------- desks, chairs, candles ----------
    const deskMat = M.MAT.wood({ a: '#8a5530', b: '#5a331a', rings: 12, seed: 17 });
    const chairMat = M.MAT.wood({ a: '#7b4a28', b: '#4a2a14', rings: 20, seed: 31 });
    const legGeo = new THREE.LatheGeometry([[0, 0], [.03, 0], [.026, .05], [.019, .2], [.028, .32], [.024, .5], [.03, .62], [.03, TOPY - .05], [0, TOPY - .05]].map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), 10);
    const deskParts = [M.rbox(1.25, .045, .68, .012).translate(0, TOPY - .0225, 0), M.rbox(1.12, .1, .56, .01).translate(0, TOPY - .1, 0)];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) deskParts.push(legGeo.clone().translate(sx * .55, 0, sz * .27));
    const deskGeo = mergeGeometries(deskParts.map(g => g.toNonIndexed ? g.toNonIndexed() : g));
    const chairParts = [M.rbox(.44, .05, .42, .012).translate(0, .45, 0)];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) chairParts.push(new THREE.CylinderGeometry(.018, .016, .45, 8).translate(sx * .19, .225, sz * .18));
    for (const sx of [-1, 1]) chairParts.push(M.rbox(.04, .52, .04, .01).translate(sx * .19, .71, .19));
    chairParts.push(M.rbox(.44, .09, .035, .012).translate(0, .93, .19), M.rbox(.36, .05, .025, .01).translate(0, .74, .19));
    const chairGeo = mergeGeometries(chairParts.map(g => g.index ? g.toNonIndexed() : g));
    const holderGeo = new THREE.LatheGeometry([[0, 0], [.065, 0], [.068, .008], [.06, .014], [.02, .018], [.016, .05], [.024, .056], [.02, .06], [0, .06]].map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), 20);
    const candleGeo = new THREE.LatheGeometry([[0, 0], [.014, 0], [.014, .96], [.011, 1], [.003, 1.0], [0, 1]].map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), 12);
    const inkGeo = new THREE.LatheGeometry([[0, 0], [.03, 0], [.034, .01], [.034, .03], [.02, .04], [.01, .045], [.012, .052], [0, .052]].map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), 14);
    // open book: curved pages + cover
    const pageTex = TEX.drawTexture(1024, 384, (x, W, H) => {
      x.save(); drawPage(x, W / 2, H, { seed: 11, lines: 16, paraAt: [5, 11], top: .12, bottom: .9, marginX: .13 }); x.translate(W / 2, 0); drawPage(x, W / 2, H, { seed: 12, lines: 16, paraAt: [3, 9], top: .12, bottom: .9, marginX: .13 }); x.restore();
      const g = x.createLinearGradient(W / 2 - 50, 0, W / 2 + 50, 0); g.addColorStop(0, 'rgba(80,55,30,0)'); g.addColorStop(.5, 'rgba(80,55,30,.4)'); g.addColorStop(1, 'rgba(80,55,30,0)'); x.fillStyle = g; x.fillRect(W / 2 - 50, 0, 100, H);
    });
    const pg = new THREE.PlaneGeometry(.36, .25, 16, 1).rotateX(-Math.PI / 2); { const p = pg.attributes.position; for (let i = 0; i < p.count; i++) { const u = Math.abs(p.getX(i)) / .18; p.setY(i, .012 + Math.sin(Math.min(u * 1.3, 1) * Math.PI / 2) * .014 - u * u * .006); } pg.computeVertexNormals(); }
    const coverGeo = M.rbox(.38, .012, .27, .004).translate(0, .004, 0);

    const desks = [], chairs = [], holders = [], candles = [], inks = [], pages = [], covers = [], shadows = [], flames = [], flameOn = [], poolsTop = [], poolsFloor = [];
    const ignite = (r, ci) => (r === 0 && (ci === 1 || ci === 2)) ? -10 : 1.18 + 3.25 * Math.pow(r / (ROWS - 1), .82) + [.1, 0, .03, .13][ci] + (rnd() - .5) * .14;
    R.rowOn = [];
    for (let r = 0; r < ROWS; r++) {
      COLS.forEach((cx, ci) => {
        const z = Z0 - r * DZ + (rnd() - .5) * .12, x = cx + (rnd() - .5) * .1, ry = (rnd() - .5) * .06;
        desks.push({ x, y: 0, z, ry });
        const cpull = .42 + rnd() * .2; chairs.push({ x: x + (rnd() - .5) * .2, y: 0, z: z + cpull, ry: Math.PI + (rnd() - .5) * .35 });
        shadows.push({ x, y: .004, z, s: [1.7, 1, 1.0] }, { x, y: .004, z: z + cpull + .02, s: [.7, 1, .7] });
        const side = cx < 0 ? -1 : 1; // candle on the corner nearest the central aisle
        const cxl = x - side * .44, czl = z - .17;
        holders.push({ x: cxl, y: TOPY, z: czl });
        const ch = .15 + rnd() * .07; candles.push({ x: cxl, y: TOPY + .05, z: czl, s: [1, ch, 1] });
        const on = ignite(r, ci);
        flames.push(cxl, TOPY + .05 + ch + .012, czl); flameOn.push(on);
        poolsTop.push({ x: cxl + side * .12, y: TOPY + .002, z: czl + .1, r: .75, on: on + .02 });
        poolsFloor.push({ x: cxl + side * .2, y: .006, z: z + .3, r: 1.6, on: on + .05 });
        pages.push({ x: x + side * .08, y: TOPY, z: z + .04, ry: ry + (rnd() - .5) * .2 });
        covers.push({ x: x + side * .08, y: TOPY, z: z + .04, ry: ry + (rnd() - .5) * .2 });
        covers[covers.length - 1].ry = pages[pages.length - 1].ry;
        inks.push({ x: x + side * .45, y: TOPY, z: z - .2 });
      });
      R.rowOn.push(1.18 + 3.25 * Math.pow(r / (ROWS - 1), .82));
    }
    scene.add(instances(deskGeo, deskMat, desks));
    scene.add(instances(chairGeo, chairMat, chairs));
    scene.add(instances(holderGeo, M.MAT.brass(), holders));
    scene.add(instances(candleGeo, new THREE.MeshStandardMaterial({ color: '#f0e2c6', roughness: .55, emissive: '#3a2410', emissiveIntensity: .25 }), candles));
    scene.add(instances(inkGeo, new THREE.MeshPhysicalMaterial({ color: '#16202c', roughness: .1, clearcoat: 1 }), inks));
    const coverMesh = instances(coverGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .6 }), covers);
    const lc = ['#6d2418', '#2f4a32', '#26385a', '#5a2a1a', '#4e2a3e', '#7a4a20']; covers.forEach((c, i) => coverMesh.setColorAt(i, new THREE.Color(lc[i % lc.length]))); coverMesh.instanceColor.needsUpdate = true; scene.add(coverMesh);
    scene.add(instances(pg, new THREE.MeshStandardMaterial({ map: pageTex, roughness: .9, side: THREE.DoubleSide }), pages));
    scene.add(contactShadows(shadows, { opacity: .5 }));
    // flames, halos, light pools (GPU-driven by ignition time)
    const fl = flamePoints(flames, flameOn, { size: .055, intensity: 2.6 }); scene.add(fl); R.fl = fl;
    const halo = flamePoints(flames, flameOn, { size: .36, glow: true, color: [1, .55, .2], intensity: .6 }); scene.add(halo); R.halo = halo;
    const halo2 = flamePoints(flames, flameOn, { size: 1.3, glow: true, color: [1, .5, .18], intensity: .05 }); scene.add(halo2); R.halo2 = halo2;
    scene.add(lightPools(poolsTop, { opacity: .7, color: '#ffb066' }));
    scene.add(lightPools(poolsFloor, { opacity: .2, color: '#ff9a4a' }));
    R.flameOn = flameOn;
    // practical warm lights that come up as the wave passes (stand-ins for the sum of many candles)
    R.lights = [[-2.8, -2.5, 0], [2.8, -8.5, 2], [-2.8, -16, 6], [2.8, -26, 10]].map(([x, z, row]) => { const l = new THREE.PointLight('#ffa65a', 0, 16, 1.5); l.position.set(x, 3.2, z); scene.add(l); return { l, row }; });

    camera.fov = 40; camera.near = .05; camera.far = 300; camera.updateProjectionMatrix();
    R.camPos = path3([[-0.6, [.22, 1.42, 4.7]], [1.2, [.16, 1.52, 3.7]], [2.6, [.08, 2.1, 2.9]], [4.2, [-.08, 3.4, .6]], [5.6, [-.22, 4.5, -1.2]], [6.9, [-.3, 5.0, -2.3]]]);
    R.camLook = path3([[-0.6, [.1, 1.05, -3]], [1.2, [.05, 1.05, -6]], [2.6, [0, 1.0, -11]], [4.4, [0, .9, -19]], [6.9, [-.05, .8, -25]]]);
  },

  update(t, ctx) {
    const { ui, U, camera, post } = ctx;
    const P = R.camPos(t), L = R.camLook(t); P.add(U.shake(t, .012, .35, 2));
    camera.fov = U.lerp(48, 40, U.smoothstep(1.0, 5.0, t)); camera.updateProjectionMatrix();
    camera.position.copy(P); camera.lookAt(L); camera.updateMatrixWorld();
    const pxs = ctx.renderer.domElement.height / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); for (const o of [R.fl, R.halo, R.halo2]) o.userData.uniforms.pxScale.value = pxs;

    // fraction of lit candles -> overall warmth of the hall
    let lit = 0; for (const o of R.flameOn) lit += U.smoothstep(o, o + .3, t); const k = lit / R.flameOn.length;
    R.lights.forEach(({ l, row }, i) => { const on = R.rowOn[row]; const base = i === 0 ? 2.5 : 0; l.intensity = (base + 13 * U.smoothstep(on - .1, on + .9, t)) * (.94 + .06 * Math.sin(t * 9 + i)); });
    R.hemi.color.setRGB(U.lerp(.25, .5, k), U.lerp(.32, .36, k), U.lerp(.53, .3, k)); R.hemi.groundColor.setRGB(U.lerp(.1, .3, k), U.lerp(.07, .17, k), U.lerp(.055, .08, k)); R.hemi.intensity = U.lerp(.55, .8, k);
    R.fog.color.setRGB(U.lerp(.05, .14, k), U.lerp(.075, .08, k), U.lerp(.14, .07, k));
    R.moon.intensity = U.lerp(.55, .35, k);
    post.exposure = U.lerp(1.15, 1.02, k);
    R.dawn.material.color.setScalar(.85 + .3 * U.smoothstep(4.5, 6.8, t));

    // ---------- typography ----------
    const tBir = ctx.wordTime('birçok'), tDus = ctx.wordTime('düşünür'), tHay = ctx.wordTime('hayran');
    ui.text('birçok', { t, t0: tBir - .06, t1: tHay - .15, x: 540, y: 290, size: 66, weight: 800, color: '#fff4dc', anim: 'rise' });
    ui.text('DÜŞÜNÜR', { t, t0: tDus - .06, t1: tHay - .15, x: 540, y: 395, size: 112, weight: 900, color: '#ffcf6b', letterSpacing: 4, anim: 'pop' });
    ui.text('hayran kaldı', { t, t0: tHay - .04, x: 540, y: 330, size: 108, weight: 500, family: 'Lora', italic: true, color: '#ffd98a', anim: 'rise', dur: .6, shadowBlur: 26, shadowColor: 'rgba(0,0,0,.75)' });
  },
};
