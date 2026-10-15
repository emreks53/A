// s12 (52.85–70.45) "…merhamette, samimiyette, adalette, güvenilirlikte, tevazuda, vefada, sabırda, saygıda, affedicilikte,
// nezakette, kanaatkârlıkta, hoşgörüde, diğerkâmlıkta, yardımseverlikte ve diğer bütün güzel ahlak özelliklerinde;"
// Visual: a long madrasa gallery (stone arcade, vaulted ceiling, Iznik-tiled niches) in warm afternoon light. The camera glides
// past 14 pedestals; on each spoken virtue the glass mosque lamp above that pedestal is lit, warm light falls on the exhibit (a real
// object that stands for the virtue), the object settles and its name pops. HOŞGÖRÜ: a wooden door opens and sunlight pours in.
// Finale ("ve diğer bütün güzel ahlak…"): the camera cranes up and turns down the gallery: countless pedestals light up into the haze.
import * as THREE from 'three';
import * as E from '../engine/lib/extra_E.js';

const DEBUG = 0; // 1: close-up turntable of exhibit floor(t) (for modelling checks)
const S = 1.25, WZ = -0.62, NICHE = .26, VS = 4.2, AZ = 4.35, ROWB = 3.25, TH = 0.42; // bay width, wall face z, niche depth, vault spring, arcade face z, row B z, camera yaw
const NAMES = ['MERHAMET', 'SAMİMİYET', 'ADALET', 'GÜVENİLİRLİK', 'TEVAZU', 'VEFA', 'SABIR', 'SAYGI', 'AFFEDİCİLİK', 'NEZAKET', 'KANAATKÂRLIK', 'HOŞGÖRÜ', 'DİĞERKÂMLIK', 'YARDIMSEVERLİK'];
const WORDS = ['merhamet', 'samimiyet', 'adalet', 'güvenilirlik', 'tevazu', 'vefa', 'sabır', 'saygı', 'affedicilik', 'nezaket', 'kanaatkâr', 'hoşgörü', 'diğerkâm', 'yardımsever'];
const FALLBACK = [0.07, 1.83, 2.83, 3.61, 4.71, 5.53, 6.37, 7.15, 7.89, 9.33, 10.45, 11.71, 12.63, 13.75];
const DOOR = 11; // index of HOŞGÖRÜ (0-based)
// exhibit builders + framing: ty = target height above pad top, D = camera distance, h = camera height above target, ry = object yaw,
// ly = hero lamp height (hung so that, in the glide framing, the lit lamp sits above the label / progress-dot band instead of behind it)
const EX = [
  { f: E.nest, ty: .06, D: 2.05, h: .62, ry: 0, L: .85, ly: 1.77 },
  { f: E.carafe, ty: .15, D: 2.2, h: .32, ry: 0, ly: 1.74 },
  { f: E.balance, ty: .22, D: 2.5, h: .28, ry: -.35, ly: 1.89 },
  { f: E.chest, ty: .11, D: 2.3, h: .38, ry: -.4, ly: 1.73 },
  { f: E.wheat, ty: .29, D: 2.65, h: .22, ry: 0, L: .42, ly: 1.95 },
  { f: E.letters, ty: .12, D: 2.1, h: .3, ry: -.38, L: .5, ly: 1.68 },
  { f: E.cesme, ty: .2, D: 2.15, h: .55, ry: -.3, L: .6, ly: 1.79 },
  { f: E.shoes, ty: .05, D: 2.0, h: .78, ry: -.3, L: .8, ly: 1.68 },
  { f: E.swordOlive, ty: .1, D: 2.35, h: .42, ry: -.25, ly: 1.75 },
  { f: E.rose, ty: .3, D: 2.35, h: .18, ry: -.3, L: .45, ly: 1.92 },
  { f: E.dates, ty: .05, D: 1.95, h: .66, ry: -.3, L: .55, ly: 1.68 },
  { f: null, ty: 0, D: 3.75, h: .2, ry: 0 },
  { f: E.bread, ty: .05, D: 2.0, h: .6, ry: -.3, L: .6, ly: 1.68 },
  { f: E.jugPour, ty: .14, D: 2.45, h: .36, ry: -.35, ly: 1.83 },
];
const xA = i => i * S; // row A pedestal x for 0-based hero index i (hero 0 at x=0); far pedestals continue the grid

let R = {};
export default {
  post: {
    exposure: 1.05,
    bloom: { enabled: true, strength: .5, radius: .55, threshold: .82 },
    grade: { contrast: 1.08, saturation: 1.08, warmth: .02, lift: [.0, .012, .04], gain: [1.03, 1.0, .96] },
    vignette: .42, grain: .03, aberration: .001,
    dof: { enabled: true, focus: 2.5, range: 1.6, amount: .8 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: Mo, ENV, FX, TEX } = ctx; const MAT = Mo.MAT;
    R = { heroes: [], lamps: [] };
    const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    // ---- word times (local)
    R.T = WORDS.map((w, i) => { const v = ctx.wordTime(w); return Math.abs(v - FALLBACK[i]) < .6 ? v : FALLBACK[i]; });
    const ve = ctx.wordTime('ve', 1), diger = ctx.wordTime('diğer', 1), butun = ctx.wordTime('bütün'), guzel = ctx.wordTime('güzel'), ahlak = ctx.wordTime('ahlak'), ozel = ctx.wordTime('özellik');
    R.W = { ve: Math.abs(ve - 14.91) < .5 ? ve : 14.91, diger: Math.abs(diger - 15.25) < .5 ? diger : 15.25, butun: Math.abs(butun - 15.65) < .5 ? butun : 15.65, guzel: Math.abs(guzel - 15.97) < .5 ? guzel : 15.97, ahlak: Math.abs(ahlak - 16.35) < .5 ? ahlak : 16.35, ozel: Math.abs(ozel - 17.01) < .5 ? ozel : 17.01 };

    // ---- world, light
    scene.fog = new THREE.FogExp2('#a0805e', .02);
    scene.environment = await ctx.loadHDR('kiara_interior'); scene.environmentIntensity = .26;
    const sky = ENV.skyDome({ top: '#4f86c4', mid: '#94bde0', horizon: '#f3d6a6', bottom: '#c9a274', sunDir: [-.25, .62, -.74], sunColor: '#ffe2b0', sunSize: .6, sunGlow: .9, clouds: .35, cloudColor: '#fff0dc', intensity: 1.0 });
    scene.add(sky);
    const sunDir = V(-.25, .62, -.74).normalize();
    const sun = new THREE.DirectionalLight('#ffd7a0', 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.normalBias = .03; sun.shadow.radius = 2;
    const sTarget = V(32, 0, 0); sun.position.copy(sTarget).addScaledVector(sunDir, 60); sun.target.position.copy(sTarget); scene.add(sun, sun.target);
    { // shadow frustum fitted per frame around the visible part of the hall (texel-snapped to avoid shimmer)
      const cam = sun.shadow.camera; cam.position.copy(sun.position); cam.lookAt(sTarget); cam.updateMatrixWorld(true); const inv = cam.matrixWorldInverse.clone();
      R.fitSun = (x0, x1, z0 = -4) => { const mn = V(1e9, 1e9, 1e9), mx = V(-1e9, -1e9, -1e9), p = V();
        for (const x of [x0, x1]) for (const y of [0, 8]) for (const z of [z0, 6]) { p.set(x, y, z).applyMatrix4(inv); mn.min(p); mx.max(p); }
        const w = mx.x - mn.x, h = mx.y - mn.y, tw = w / 2048, th = h / 2048; const l = Math.floor(mn.x / tw) * tw, b = Math.floor(mn.y / th) * th;
        cam.left = l; cam.right = l + w + tw; cam.bottom = b; cam.top = b + h + th; cam.near = Math.max(.1, -mx.z - 5); cam.far = -mn.z + 5; cam.updateProjectionMatrix(); };
      R.fitSun(-12, 78);
    }
    const hemi = new THREE.HemisphereLight('#a4bce4', '#8a6848', .76); scene.add(hemi); R.hemi = hemi;

    // ---- floor (stone tiles), extends into the garden and the courtyard
    const tileTex = TEX.drawTexture(512, 512, (x, W, H) => { const r = U.rng(5); x.fillStyle = '#7a6650'; x.fillRect(0, 0, W, H); const n = 2, s = W / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const l = 205 + r() * 22; x.fillStyle = `rgb(${l},${l * .88 | 0},${l * .72 | 0})`; x.fillRect(i * s + 4, j * s + 4, s - 8, s - 8); for (let k = 0; k < 60; k++) { x.fillStyle = `rgba(120,90,60,${r() * .07})`; x.beginPath(); x.arc(i * s + r() * s, j * s + r() * s, 4 + r() * 22, 0, 6.3); x.fill(); } }
      x.fillStyle = '#9a4a32'; for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H], [W / 2, H / 2], [W / 2, 0], [0, H / 2], [W / 2, H], [W, H / 2]]) { x.save(); x.translate(cx, cy); x.rotate(Math.PI / 4); x.fillRect(-26, -26, 52, 52); x.restore(); } });
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(200 / 1.5, 50 / 1.5); tileTex.anisotropy = 8;
    const stN = TEX.stone({ a: '#ffffff', b: '#cccccc', seed: 3, repeat: [200 / 3, 50 / 3] });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 50).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tileTex, normalMap: stN.normalMap, normalScale: new THREE.Vector2(.35, .35), roughness: .62 }));
    floor.position.set(60, 0, 10); floor.receiveShadow = true; scene.add(floor);

    // ---- back wall: instanced bays (niche + clerestory window), door bay for HOŞGÖRÜ
    const lime = MAT.stone({ a: '#ead9b8', b: '#c4ab84', seed: 7, repeat: [.6, .6] });
    const ext = (shape, depth, bev = .025) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 2, curveSegments: 10 });
    const winHole = () => E.archPath(.2, 3.0, 3.38, 1.6, 10);
    const rect = (x0, y0, x1, y1) => { const s = new THREE.Shape(); s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.closePath(); return s; };
    const front = rect(-S / 2, 0, S / 2, VS); front.holes.push(E.archPath(.41, .12, 1.95, 1.6, 14), winHole());
    const frontGeo = ext(front, NICHE).translate(0, 0, WZ - NICHE - .025);
    const backS = rect(-S / 2, 0, S / 2, VS); backS.holes.push(winHole());
    const nb = WZ - NICHE - .05; // niche back face z
    const backGeo = ext(backS, .16, 0).translate(0, 0, nb - .16);
    const tileShape = new THREE.Shape(); E.archPath(.43, .1, 1.95, 1.6, 14, tileShape);
    const tileGeo = new THREE.ShapeGeometry(tileShape, 10).translate(0, 0, nb + .003);
    const iz = E.iznikTex(); iz.repeat.set(1 / .205, 1 / .205); iz.offset.set(.5, 0);
    const tileMat = new THREE.MeshPhysicalMaterial({ map: iz, roughness: .32, clearcoat: .7, clearcoatRoughness: .25 });
    const nichePl = TEX.plaster({ a: '#78b4ae', b: '#579490', seed: 15, repeat: [1.2, 1.2] });
    const nicheMat = new THREE.MeshStandardMaterial({ map: nichePl.map, normalMap: nichePl.normalMap, normalScale: new THREE.Vector2(.5, .5), roughness: .92 });
    const bayIdx = []; for (let i = -16; i <= 96; i++) if (i !== DOOR) bayIdx.push(i);
    const m4 = new THREE.Matrix4();
    // chunked instancing (8 per mesh) so camera / shadow frustum culling can skip far parts of the endless gallery
    const inst = (geo, mat, xs, fn, o = {}) => { const CH = o.chunk ?? 8, res = { meshes: [], map: [] };
      for (let s0 = 0; s0 < xs.length; s0 += CH) { const n = Math.min(CH, xs.length - s0); const im = new THREE.InstancedMesh(geo, mat, n);
        for (let j = 0; j < n; j++) { const k = s0 + j; im.setMatrixAt(j, fn ? fn(xs[k], k) : m4.makeTranslation(xs[k], 0, 0)); res.map.push([res.meshes.length, j]); }
        if (o.color) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
        im.castShadow = o.cast ?? false; im.receiveShadow = o.recv ?? true; im.computeBoundingSphere(); if (o.order != null) im.renderOrder = o.order; scene.add(im); res.meshes.push(im); }
      res.setColor = (k, c) => { const [mi, j] = res.map[k]; res.meshes[mi].setColorAt(j, c); };
      res.flush = () => res.meshes.forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
      return res; };
    inst(frontGeo, lime, bayIdx.map(xA), null, { cast: true }); inst(backGeo, lime, bayIdx.map(xA), null, { cast: true }); inst(tileGeo, nicheMat, bayIdx.map(xA));
    // door bay
    const xd = xA(DOOR); R.xd = xd;
    const dS = new THREE.Shape(); [[-S / 2, 0], [-.46, 0], [-.46, 2.02], [.46, 2.02], [.46, 0], [S / 2, 0], [S / 2, VS], [-S / 2, VS]].forEach(([x, y], i) => i ? dS.lineTo(x, y) : dS.moveTo(x, y)); dS.closePath(); dS.holes.push(winHole());
    const dFront = new THREE.Mesh(ext(dS, NICHE).translate(xd, 0, WZ - NICHE - .025), lime); dFront.castShadow = dFront.receiveShadow = true; scene.add(dFront);
    const dBack = new THREE.Mesh(ext(dS, .16, 0).translate(xd, 0, nb - .16), lime); dBack.castShadow = dBack.receiveShadow = true; scene.add(dBack);
    const jambMat = MAT.stone({ a: '#d8c29c', b: '#a88d66', seed: 9 });
    for (const sx of [-1, 1]) { const j = new THREE.Mesh(Mo.rbox(.14, 2.12, .1, .025), jambMat); j.position.set(xd + sx * .53, 1.06, WZ + .03); j.castShadow = j.receiveShadow = true; scene.add(j); }
    const lint = new THREE.Mesh(Mo.rbox(1.22, .16, .12, .03), jambMat); lint.position.set(xd, 2.1, WZ + .04); lint.castShadow = true; scene.add(lint);
    const tymS = new THREE.Shape(); E.archPts(.5, 2.18, 1.6, 14).forEach((p, i) => i ? tymS.lineTo(p.x, p.y) : tymS.moveTo(p.x, p.y)); tymS.closePath();
    const tym = new THREE.Mesh(new THREE.ShapeGeometry(tymS, 10).translate(xd, 0, WZ + .004), tileMat); scene.add(tym);
    const tymRing = new THREE.Shape(); E.archPts(.58, 2.18, 1.6, 14).forEach((p, i) => i ? tymRing.lineTo(p.x, p.y) : tymRing.moveTo(p.x, p.y)); tymRing.closePath(); tymRing.holes.push((() => { const p = new THREE.Path(); E.archPts(.5, 2.18, 1.6, 14).forEach((q, i) => i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)); p.closePath(); return p; })());
    const tr = new THREE.Mesh(ext(tymRing, .05, .012).translate(xd, 0, WZ - .01), jambMat); tr.castShadow = true; scene.add(tr);
    // door leaves: walnut, studded, opening INWARD on HOŞGÖRÜ (closed: a thin line of sunlight leaks through the gaps)
    const doorWood = MAT.wood({ a: '#c08550', b: '#8a5830', rings: 10, seed: 51, clearcoat: .35 });
    const panelWood = MAT.wood({ a: '#b47a46', b: '#7c4c26', rings: 9, seed: 53, clearcoat: .3 });
    const grainUV = g => { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getY(i) * .22, (p.getX(i) + p.getZ(i)) * 2.0 + .3); return g; }; // vertical grain
    const studMat = new THREE.MeshStandardMaterial({ color: '#3a322a', metalness: .8, roughness: .4 });
    R.leaves = [];
    for (const sx of [-1, 1]) {
      const hinge = new THREE.Group(); hinge.position.set(xd + sx * .432, .016, WZ - .07); scene.add(hinge);
      const leaf = new THREE.Group(); hinge.add(leaf); const lw = .425;
      leaf.add(E.M(grainUV(Mo.rbox(lw, 1.99, .055, .012).translate(-sx * lw / 2, .995, 0)), doorWood));
      for (const zz of [.03, -.03]) for (const [y, h] of [[.36, .5], [1.0, .6], [1.64, .5]]) leaf.add(E.M(grainUV(Mo.rbox(lw - .1, h, .022, .01).translate(-sx * lw / 2, y, zz)), panelWood));
      const studs = []; for (let k = 0; k < 7; k++) for (const xx of [.04, lw - .04]) for (const zz of [.03, -.03]) studs.push(new THREE.SphereGeometry(.011, 8, 6).translate(-sx * xx, .12 + k * .29, zz));
      leaf.add(E.M(E.merge(studs), studMat));
      for (const zz of [.045, -.045]) { const ringK = E.M(new THREE.TorusGeometry(.04, .007, 8, 20), Mo.MAT.brass()); ringK.position.set(-sx * (lw - .08), 1.05, zz); leaf.add(ringK); }
      R.leaves.push({ hinge, sx });
    }
    // door stops (rebate) behind the leaves: no daylight through the hinge-side gaps, only the thin centre line + under-door leak
    { const stopMat = MAT.wood({ a: '#7a4a26', b: '#4a2a14', rings: 8, seed: 57 }); for (const sx of [-1, 1]) { const st = E.M(Mo.rbox(.07, 2.04, .03, .008), stopMat); st.position.set(xd + sx * .445, 1.02, WZ - .125); scene.add(st); }
      const top = E.M(Mo.rbox(.96, .05, .03, .008), stopMat); top.position.set(xd, 2.0, WZ - .125); scene.add(top); }
    // threshold stone + light leaking under the closed door (anticipation)
    const thr = new THREE.Mesh(Mo.rbox(1.0, .03, .5, .012), jambMat); thr.position.set(xd, .006, WZ - .24); thr.receiveShadow = true; scene.add(thr);
    R.leak = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .55).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: TEX.softDot(64, .1), color: '#ffcf8a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    R.leak.position.set(xd + .06, .006, WZ + .2); R.leak.scale.set(1, 1, .6); R.leak.userData.noDepth = true; scene.add(R.leak);
    // the courtyard garden behind the door: a broad sunlit plane tree, flagstone path, geraniums, garden wall
    const gard = E.garden({ seed: 9 }); gard.position.set(xd, 0, 0); scene.add(gard);
    R.tree = E.shadeTree({ seed: 5, sunDir: V(-.25, .62, -.74), up: .72 }); R.tree.position.set(xd + 1.0, 0, -11); R.tree.rotation.y = .4; scene.add(R.tree);

    // ---- moldings along the back wall
    const runs = [[-20, xd - .62], [xd + .62, 124]];
    for (const [a, b] of runs) { const base = new THREE.Mesh(Mo.rbox(b - a, .12, .05, .015), lime); base.position.set((a + b) / 2, .06, WZ + .02); base.receiveShadow = true; scene.add(base); }
    const band = new THREE.Mesh(Mo.rbox(144, .09, .07, .02), lime); band.position.set(52, 2.78, WZ + .03); band.receiveShadow = true; scene.add(band);

    // ---- vault + transverse ribs + arcade on the courtyard side + roof
    const zc = (WZ + AZ) / 2, va = (AZ - WZ) / 2, LEN = 146, X0 = -22;
    const vaultShape = new THREE.Shape(); const vin = E.archPts(va, VS, 1.15, 28), vout = E.archPts(va + .45, VS - .05, 1.15, 28);
    vin.forEach((p, i) => (i ? vaultShape.lineTo(-(zc + p.x), p.y) : vaultShape.moveTo(-(zc + p.x), p.y))); vout.slice().reverse().forEach(p => vaultShape.lineTo(-(zc + p.x), p.y + .35)); vaultShape.closePath();
    const vaultGeo = new THREE.ExtrudeGeometry(vaultShape, { depth: LEN, bevelEnabled: false }); vaultGeo.rotateY(Math.PI / 2); vaultGeo.translate(X0, 0, 0);
    const plaster = new THREE.MeshStandardMaterial({ color: '#efdfc2', roughness: .95 });
    const vault = new THREE.Mesh(vaultGeo, plaster); vault.castShadow = true; vault.receiveShadow = true; scene.add(vault);
    R.vaultY = z => { const x = z - zc; let best = VS; for (let i = 1; i < vin.length; i++) { const a = vin[i - 1], b = vin[i]; if ((x - a.x) * (x - b.x) <= 0) { best = a.y + (b.y - a.y) * (x - a.x) / ((b.x - a.x) || 1e-6); break; } } return best; };
    const ribShape = new THREE.Shape(); const rin = E.archPts(va - .04, VS - .32, 1.15, 28);
    rin.forEach((p, i) => (i ? ribShape.lineTo(-(zc + p.x), p.y) : ribShape.moveTo(-(zc + p.x), p.y))); vin.slice().reverse().forEach(p => ribShape.lineTo(-(zc + p.x), p.y + .05)); ribShape.closePath();
    const ribGeo = new THREE.ExtrudeGeometry(ribShape, { depth: .36, bevelEnabled: false }); ribGeo.rotateY(Math.PI / 2); ribGeo.translate(-.18, 0, 0);
    const ribMat = MAT.stone({ a: '#d9b98e', b: '#b08a60', seed: 13 });
    const ribXs = []; for (let k = -9; k <= 48; k++) ribXs.push((2 * k + .5) * S);
    inst(ribGeo, ribMat, ribXs);
    const corb = Mo.rbox(.42, .22, .26, .04, 1); inst(corb, ribMat, ribXs, x => m4.makeTranslation(x, VS - .2, WZ + .1));
    // arcade (courtyard side)
    const aa = S - .24; const arcS = new THREE.Shape(); [[-S, 0], [-aa, 0], [-aa, 2.45]].forEach(([x, y], i) => i ? arcS.lineTo(x, y) : arcS.moveTo(x, y)); E.archPts(aa, 2.45, 1.5, 18).forEach(p => arcS.lineTo(p.x, p.y)); [[aa, 0], [S, 0], [S, VS + .7], [-S, VS + .7]].forEach(([x, y]) => arcS.lineTo(x, y)); arcS.closePath();
    const arcGeo = ext(arcS, .5, .03).translate(0, 0, AZ - .025);
    const arcXs = []; for (let k = -9; k <= 47; k++) arcXs.push((2 * k + 1.5) * S);
    inst(arcGeo, lime, arcXs);
    const capG = E.merge([Mo.rbox(.56, .12, .62, .03, 1).translate(0, 2.38, 0), Mo.rbox(.5, .07, .56, .02, 1).translate(0, 2.29, 0), Mo.rbox(.56, .16, .62, .03, 1).translate(0, .08, 0)]);
    inst(capG, ribMat, ribXs, x => m4.makeTranslation(x, 0, AZ + .26));
    { const endW = new THREE.Mesh(new THREE.PlaneGeometry(AZ - WZ + 3, 9).rotateY(-Math.PI / 2), lime); endW.position.set(X0 + LEN - .5, 4.5, zc); scene.add(endW); }
    const roof = new THREE.Mesh(Mo.rbox(LEN, .5, AZ - WZ + 2.2, .05), plaster); roof.position.set(X0 + LEN / 2, 7.75, zc); roof.castShadow = true; scene.add(roof);
    // courtyard: opposite wing (sunlit) + cypresses
    const oppXs = []; for (let k = -12; k <= 50; k++) oppXs.push((2 * k + 1.5) * S);
    inst(arcGeo, lime, oppXs, x => m4.makeRotationY(Math.PI).setPosition(x, 0, 2 * AZ + 18));
    const oppWall = new THREE.Mesh(new THREE.BoxGeometry(LEN + 30, 7.2, .6), lime); oppWall.position.set(X0 + LEN / 2, 3.6, 2 * AZ + 18 + 3.2); oppWall.receiveShadow = true; scene.add(oppWall);
    const oppRoof = new THREE.Mesh(new THREE.BoxGeometry(LEN + 30, .5, 4.6), plaster); oppRoof.position.set(X0 + LEN / 2, VS + 1.0, 2 * AZ + 18 + 1.6); scene.add(oppRoof);
    const cyp = new THREE.SphereGeometry(1, 12, 10).scale(.65, 2.6, .65).translate(0, 2.6, 0);
    const cr = U.rng(4); const cypXs = []; for (let k = 0; k < 24; k++) cypXs.push(-10 + k * 6 + cr() * 2);
    inst(cyp, new THREE.MeshStandardMaterial({ color: '#3f5a2e', roughness: .9 }), cypXs, (x, k) => m4.makeTranslation(x, 0, 12 + (k % 2) * 3));

    // ---- pedestals (row A along the back wall, row B facing it)
    const ped = E.pedestalGeos(); R.PT = ped.top;
    const pedStone = MAT.stone({ a: '#f3e9d3', b: '#dccaa8', seed: 21, repeat: [1, 1] });
    const felt = MAT.fabric({ a: '#6c1f2c', b: '#4a1220', weave: 90 }); felt.sheenColor = new THREE.Color('#ff9fa0');
    const pa = []; for (let i = -16; i <= 96; i++) if (i !== DOOR) pa.push({ x: xA(i), z: 0, rot: 0, hero: i >= 0 && i < 14 ? i : -1, row: 0 });
    for (let i = -16; i <= 96; i++) pa.push({ x: (i + .5) * S, z: ROWB, rot: Math.PI, hero: -1, row: 1 });
    R.peds = pa;
    const pedM = (p) => m4.makeRotationY(p.rot).setPosition(p.x, 0, p.z);
    const near = pa.filter(p => p.row === 0 && p.x > -2 && p.x < xA(14) + .1), farP = pa.filter(p => !near.includes(p)); R.pedFar = farP;
    inst(ped.stone, pedStone, near.map(p => p.x), (x, k) => pedM(near[k]).clone(), { cast: true, chunk: 4 }); inst(ped.pad, felt, near.map(p => p.x), (x, k) => pedM(near[k]).clone(), { cast: true, chunk: 4 });
    const pedLo = E.pedestalGeos(1);
    R.pedIM = inst(pedLo.stone, pedStone, farP.map(p => p.x), (x, k) => pedM(farP[k]).clone(), { color: true }); inst(pedLo.pad, felt, farP.map(p => p.x), (x, k) => pedM(farP[k]).clone());
    // lamp + light-on times for every pedestal (heroes: their word; others: the finale cascade)
    const x14 = xA(13); R.x14 = x14;
    pa.forEach(p => {
      if (p.hero >= 0) p.on = R.T[p.hero] - .05;
      else if (p.row === 0) p.on = p.x > x14 ? R.W.ve - .08 + (p.x - x14) * .03 : R.W.diger;
      else p.on = p.x > x14 - 3 ? R.W.ve + (p.x - x14 + 3) * .03 : R.W.ve - .1;
      p.lamp = p.row === 0 ? V(p.x - .34, p.hero >= 0 ? EX[p.hero].ly ?? 1.68 : 1.68, .3) : V(p.x + .34, 1.68, ROWB - .3);
    });

    // ---- hero exhibits + hero lamps
    for (let i = 0; i < 14; i++) {
      const ex = EX[i]; const x = xA(i);
      const tgt = i === DOOR ? V(x, 1.05, WZ - .1) : V(x, R.PT + ex.ty, 0);
      const h = { i, tgt, ex, t0: R.T[i] };
      if (ex.f) { const obj = ex.f(); const holder = new THREE.Group(); holder.position.set(x, R.PT, 0); holder.rotation.y = ex.ry; holder.add(obj); scene.add(holder); h.obj = obj; h.holder = holder; }
      if (i !== DOOR) { const p = pa.find(q => q.hero === i); const lamp = E.hangingLamp({ topY: R.vaultY(p.lamp.z) - p.lamp.y + .3, seed: i + 1 }); lamp.position.copy(p.lamp); scene.add(lamp); h.lamp = lamp; h.lampP = p.lamp.clone().add(V(0, lamp.userData.flameY, 0));
        const aim = tgt.clone().add(V(0, -.06, 0)); h.lampK = h.lampP.distanceToSquared(aim) / V(p.lamp.x, 1.68 + lamp.userData.flameY, p.lamp.z).distanceToSquared(aim); } // same light on the exhibit from a higher hang
      R.heroes.push(h);
    }
    // ---- far lamps (instanced) + flames + light pools (shader-driven on-times)
    const farObj = pa.filter(p => p.hero < 0);
    farObj.forEach(p => { p.detail = (p.row === 0 && p.x > x14 + .1 && p.x < x14 + 5.2) || (p.row === 1 && p.x > x14 - 4.5 && p.x < x14 + 4.5); });
    R.detailLamps = farObj.filter(p => p.detail).map((p, k) => { const l = E.hangingLamp({ topY: R.vaultY(p.lamp.z) - p.lamp.y + .3, seed: 30 + k }); l.position.copy(p.lamp); scene.add(l); return { l, p }; });
    const far = farObj.filter(p => !p.detail); R.far = far;
    const lampProf = [[0, 0], [.014, 0], [.016, .01], [.034, .016], [.06, .036], [.072, .062], [.066, .088], [.043, .108], [.033, .122], [.037, .15], [.049, .172], [.055, .18], [.05, .18], [.03, .12], [0, .11]];
    const glassGeo = E.latheGeo(lampProf, 10);
    R.farGlass = inst(glassGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .62, depthWrite: false }), far.map(p => p.x), (x, k) => m4.makeTranslation(far[k].lamp.x, far[k].lamp.y, far[k].lamp.z), { color: true, recv: false, order: 2 }); R.farGlass.meshes.forEach(m => { m.userData.depthOk = true; });
    const chainGeo = E.merge([new THREE.CylinderGeometry(.004, .004, 1, 4).translate(0, .5, 0)]);
    inst(chainGeo, new THREE.MeshStandardMaterial({ color: '#3a2c1c', metalness: .6, roughness: .5 }), far.map(p => p.x), (x, k) => { const p = far[k]; const top = R.vaultY(p.lamp.z) + .3; return m4.compose(V(p.lamp.x, p.lamp.y + .18, p.lamp.z), new THREE.Quaternion(), V(1, top - p.lamp.y - .18, 1)); }, { recv: false });
    inst(new THREE.SphereGeometry(.03, 6, 4), MAT.brass(), far.map(p => p.x), (x, k) => m4.makeTranslation(far[k].lamp.x, far[k].lamp.y + .56, far[k].lamp.z));
    const all = pa; // pools for every pedestal (heroes too)
    const decal = (geoFn, color, gain, posFn, list = all) => {
      const g = geoFn(); const im = new THREE.InstancedMesh(g, null, list.length);
      const on = new Float32Array(list.length), sd = new Float32Array(list.length); list.forEach((p, k) => { on[k] = p.on; sd[k] = k * .37; im.setMatrixAt(k, posFn(p)); });
      g.setAttribute('on', new THREE.InstancedBufferAttribute(on, 1)); g.setAttribute('sd', new THREE.InstancedBufferAttribute(sd, 1));
      const u = { time: { value: 0 }, color: { value: new THREE.Color(color) }, gain: { value: gain }, master: { value: 1 } };
      im.material = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
        vertexShader: `attribute float on, sd; uniform float time; varying float vB; varying vec2 vUv; void main(){ vUv = uv; float b = smoothstep(on, on + .4, time); vB = b * (.92 + .08 * sin(time * 9. + sd * 13.)); vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform vec3 color; uniform float gain, master; varying float vB; varying vec2 vUv; void main(){ vec2 d = (vUv - .5) * 2.; float a = pow(max(0., 1. - dot(d, d)), 2.); gl_FragColor = vec4(color * gain, a * vB * master); }` });
      im.userData.uniforms = u; im.userData.noDepth = true; im.renderOrder = 3; im.frustumCulled = false; scene.add(im); return im;
    };
    R.padPool = decal(() => new THREE.PlaneGeometry(.62, .62).rotateX(-Math.PI / 2), '#ffb46a', .2, p => m4.makeTranslation(p.x, R.PT + .003, p.z));
    R.floorPool = decal(() => new THREE.PlaneGeometry(1.8, 1.8).rotateX(-Math.PI / 2), '#ff9c50', .12, p => m4.makeTranslation(p.x, .004, p.z + (p.row ? -.9 : .9)));
    R.nicheGlow = decal(() => new THREE.PlaneGeometry(.85, 1.9), '#ffc07a', .2, p => m4.makeTranslation(p.x, 1.55, nb + .006), all.filter(p => p.row === 0));
    // flames for far lamps
    const fpos = new Float32Array(far.length * 3), fon = new Float32Array(far.length), fsd = new Float32Array(far.length);
    far.forEach((p, k) => { fpos.set([p.lamp.x, p.lamp.y + .085, p.lamp.z], k * 3); fon[k] = p.on; fsd[k] = k * .61; });
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fpos, 3)); fg.setAttribute('on', new THREE.BufferAttribute(fon, 1)); fg.setAttribute('seed', new THREE.BufferAttribute(fsd, 1));
    const fu = { time: { value: 0 }, map: { value: TEX.softDot(64, .25) } };
    const flames = new THREE.Points(fg, new THREE.ShaderMaterial({ uniforms: fu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float time; attribute float on, seed; varying float vB; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; float b = smoothstep(on, on + .3, time); vB = b * (.85 + .15 * sin(time * 11. + seed * 7.)); gl_PointSize = max(2., 240. / -mv.z) * (.4 + .6 * b); }`,
      fragmentShader: `uniform sampler2D map; varying float vB; void main(){ float a = texture2D(map, gl_PointCoord).a; vec3 c = mix(vec3(1., .5, .16), vec3(1., .9, .65), a * a); gl_FragColor = vec4(c * 2.4, a * vB); }` }));
    flames.userData.uniforms = fu; flames.userData.noDepth = true; flames.frustumCulled = false; flames.renderOrder = 3; scene.add(flames);
    const halos = new THREE.Points(fg, new THREE.ShaderMaterial({ uniforms: fu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float time; attribute float on, seed; varying float vB; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; float b = smoothstep(on, on + .4, time); vB = b; gl_PointSize = max(3., 700. / -mv.z) * (.5 + .5 * b); }`,
      fragmentShader: `uniform sampler2D map; varying float vB; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vec3(1., .62, .3), a * a * vB * .06); }` }));
    halos.userData.uniforms = fu; halos.userData.noDepth = true; halos.frustumCulled = false; halos.renderOrder = 3; scene.add(halos);
    // generic exhibits on far pedestals
    const gg = E.genericGeos(); const pal = ['#c47a48', '#d6a94e', '#3f8a86', '#e8dcc2', '#8a3a2a', '#5b7a3a', '#2f5d9a'];
    const glazeTex = TEX.drawTexture(64, 256, (x, W, H) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); // glazed bands + small lozenges (tinted per instance)
      for (const [y, h, c] of [[30, 10, '#c9b896'], [44, 4, '#6e5e48'], [120, 26, '#e8d8b6'], [196, 4, '#6e5e48'], [204, 12, '#c9b896']]) { x.fillStyle = c; x.fillRect(0, y, W, h); }
      x.fillStyle = '#9a8a70'; for (let i = 0; i < 4; i++) { x.save(); x.translate(i * 16 + 8, 133); x.rotate(Math.PI / 4); x.fillRect(-4, -4, 8, 8); x.restore(); } });
    glazeTex.wrapS = glazeTex.wrapT = THREE.RepeatWrapping;
    const genMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: glazeTex, roughness: .32, clearcoat: .6, clearcoatRoughness: .25 });
    R.genIM = gg.map((geo, ti) => { const list = farObj.filter((p, k) => (k * 7 + 3) % gg.length === ti); list.forEach((p, k) => { p.gc = new THREE.Color(pal[(k * 3 + ti) % pal.length]); });
      const r = inst(geo, genMat, list.map(p => p.x), (x, k) => m4.makeRotationY(list[k].rot + k).setPosition(list[k].x, R.PT, list[k].z), { color: true, chunk: 6 }); r.list = list; return r; });

    // ---- two real spot lights (lamp keys) alternating between even/odd exhibits
    R.spots = [0, 1].map(() => { const s = new THREE.SpotLight('#ffc88e', 0, 4.2, .62, .75, 2); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -.0004; s.shadow.normalBias = .015; s.shadow.camera.near = .05; s.shadow.radius = 3; scene.add(s, s.target); return s; });

    // ---- sun beams: door beam + clerestory window beams (additive volumes) + dust
    const beamMat = (op) => { const u = { time: { value: 0 }, opacity: { value: op }, camPos: { value: new THREE.Vector3() }, noise: { value: TEX.noiseTex({ size: 128, seed: 41, base: 3 }) } };
      const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
        vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `uniform float time, opacity; uniform vec3 camPos; uniform sampler2D noise; varying vec2 vUv; varying vec3 vW;
          void main(){ float along = smoothstep(0., .12, vUv.y) * (1. - smoothstep(.75, 1., vUv.y)); float edge = smoothstep(0., .25, vUv.x) * smoothstep(1., .75, vUv.x);
            float n = texture2D(noise, vec2(vUv.x * 1.5 + time * .01, vUv.y * 1.2 - time * .02)).r; float near = smoothstep(1.6, 3.4, distance(vW, camPos));
            gl_FragColor = vec4(vec3(1., .86, .6), along * (.35 + .65 * edge) * (.55 + .7 * n) * opacity * near); }` });
      m.userData.u = u; return m; };
    const dTravel = sunDir.clone().negate();
    const beamGeo = (corners, list = []) => { // corners: 4 points (closed loop) of an aperture; swept along the sun's travel until y=0
      const pos = [], uv = [], idx = []; let base = 0;
      for (let k = 0; k < 4; k++) { const a = corners[k], b = corners[(k + 1) % 4]; const la = a.y / -dTravel.y, lb = b.y / -dTravel.y; const a2 = a.clone().addScaledVector(dTravel, la), b2 = b.clone().addScaledVector(dTravel, lb);
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z, b2.x, b2.y, b2.z, a2.x, a2.y, a2.z); uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(base, base + 1, base + 2, base, base + 2, base + 3); base += 4; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; };
    const zw = WZ - NICHE * .5;
    const wb = []; for (let i = -16; i <= 96; i++) { const x = xA(i); wb.push(beamGeo([V(x - .2, 3.05, zw), V(x + .2, 3.05, zw), V(x + .2, 3.62, zw), V(x - .2, 3.62, zw)])); }
    R.winBeams = new THREE.Mesh(E.merge(wb), beamMat(.05)); R.winBeams.userData.noDepth = true; R.winBeams.renderOrder = 4; R.winBeams.frustumCulled = false; scene.add(R.winBeams);
    R.doorBeam = new THREE.Mesh(beamGeo([V(xd - .45, .02, WZ - .1), V(xd + .45, .02, WZ - .1), V(xd + .45, 2.0, WZ - .1), V(xd - .45, 2.0, WZ - .1)]), beamMat(0)); R.doorBeam.userData.noDepth = true; R.doorBeam.renderOrder = 4; R.doorBeam.frustumCulled = false; scene.add(R.doorBeam);
    R.doorDust = FX.particles({ count: 120, center: [xd + .4, 1.0, 0], box: [1.4, 2.0, 1.6], size: 1.7, color: '#ffe6b8', opacity: 0, drift: [.02, .04, .01], swirl: .06 }); scene.add(R.doorDust);
    R.motes = FX.particles({ count: 380, center: [9, 1.6, .1], box: [26, 2.6, 1.3], size: 2.2, color: '#ffe2b0', opacity: .4, drift: [.03, .02, 0], swirl: .05 }); scene.add(R.motes);
    R.motes2 = FX.particles({ count: 600, center: [x14 + 16, 2.0, 1.6], box: [30, 3.6, 4.6], size: 3.5, color: '#ffe2b0', opacity: 0, drift: [.03, .02, 0], swirl: .06 }); scene.add(R.motes2);

    // ---- camera keys: ONE continuous glide past the pedestals (Catmull-Rom through one key per exhibit, the exhibit centred ~.18 s
    //      after its word; no dwell-then-whip, no fov pumping). At fov 40 the 9:16 frame holds about one bay, so screen speed stays
    //      ~30-45 px/frame through the quick beats and the lit exhibit is in frame while its name is up.
    camera.near = .03; camera.far = 600;
    const FOV = 40, lerp = (a, b, u) => a + (b - a) * u;
    const meanP = R.heroes.filter(h => h.i !== DOOR).reduce((s, h) => s + Math.atan2(h.ex.h, h.ex.D), 0) / 13;
    const camFor = i => { const h = R.heroes[i]; const D = Math.min(h.ex.D * 1.15, 2.72 / Math.cos(TH)); // stay clear of row B (z < 2.72)
      const hh = D * Math.tan(lerp(Math.atan2(h.ex.h * .955, h.ex.D), meanP, .5)); // per-exhibit view angle, half-way to the mean (flatter glide)
      return { pos: V(h.tgt.x - D * Math.sin(TH), h.tgt.y + hh, h.tgt.z + D * Math.cos(TH)), look: h.tgt.clone(), fov: FOV }; };
    const keys = []; const c0 = camFor(0);
    keys.push({ t: -.75, pos: c0.pos.clone().add(V(-1.0, .5, .3)), look: c0.look.clone().add(V(.4, .05, 0)), fov: FOV + 1.5 });
    keys.push({ t: R.T[0] + .78, ...c0 });
    for (let i = 1; i < 14; i++) {
      if (i === DOOR) { // HOŞGÖRÜ: arrive on the closed door just before the word, then a slow push toward the opening as it swings open
        keys.push({ t: R.T[i] - .12, pos: V(xd - .5, 1.32, 2.72), look: V(xd + .55, 1.45, -3.0), fov: 42, a: .7 });
        keys.push({ t: R.T[i] + .3, pos: V(xd - .36, 1.3, 2.38), look: V(xd + .6, 1.42, -3.0), fov: 41, a: .7 }); continue; }
      const gp = R.T[i] - R.T[i - 1], gn = (R.T[i + 1] ?? R.W.ve) - R.T[i]; // centre a little later before a long gap / earlier after one: evens out the glide speed
      keys.push({ t: R.T[i] + .18 + U.clamp(.3 * (gn - gp), -.08, .14), ...camFor(i) }); }
    // finale: from the jug the camera turns down the gallery and cranes up / dollies back while the far lamps light (reads by "bütün")
    const yp = (t, pos, yaw, pitch, fov) => { const y = yaw * Math.PI / 180, p = pitch * Math.PI / 180; return { t, pos, look: pos.clone().add(V(Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)).multiplyScalar(5)), fov }; };
    keys.push(yp(R.W.butun - .15, V(x14 - .3, 2.05, 2.58), 57, -7.5, 40));
    keys.push(yp(R.W.ahlak + .4, V(x14 - 1.05, 2.45, 2.18), 84.5, -1.6, 41));
    keys.push(yp(18.4, V(x14 - 2.6, 2.7, 1.7), 89.8, -.3, 42.5));
    const toV = k => { const d = k.look.clone().sub(k.pos); return { t: k.t, a: k.a, v: [k.pos.x, k.pos.y, k.pos.z, Math.atan2(d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), k.fov] }; };
    const hk = keys.map(toV); const n = hk.length;
    const tang = hk.map((k, i) => { const p = hk[Math.max(0, i - 1)], q = hk[Math.min(n - 1, i + 1)]; return k.v.map((_, c) => (q.v[c] - p.v[c]) / Math.max(1e-6, q.t - p.t) * (k.a ?? 1)); });
    R.camAt = t => { if (t <= hk[0].t) return hk[0].v.slice(); if (t >= hk[n - 1].t) return hk[n - 1].v.slice(); let i = 0; while (t > hk[i + 1].t) i++; const k0 = hk[i], k1 = hk[i + 1], dt = k1.t - k0.t, u = (t - k0.t) / dt, u2 = u * u, u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2; return k0.v.map((v0, c) => h00 * v0 + h10 * dt * tang[i][c] + h01 * k1.v[c] + h11 * dt * tang[i + 1][c]); };
    R.lookTgt = new THREE.Vector3();
    // screen-space speed (px per frame at 1920 px height) of a point `dist` m ahead of the camera: drives per-frame motion blur
    const dirOf = v => V(Math.sin(v[3]) * Math.cos(v[4]), Math.sin(v[4]), -Math.cos(v[3]) * Math.cos(v[4]));
    R.pxSpeed = (t, dist = 2.9) => { const a = R.camAt(t), b = R.camAt(t + 1 / 30); const P = V(a[0], a[1], a[2]).addScaledVector(dirOf(a), dist); const d2 = P.sub(V(b[0], b[1], b[2])).normalize();
      return Math.acos(Math.min(1, d2.dot(dirOf(b)))) / (b[5] * Math.PI / 180) * 1920; };
    ctx.post.motionBlur = { samples: R.pxSpeed(-.5) > 40 ? 3 : 1, shutter: .5 };
    E.clampHDR(scene, 12);
  },

  update(t, ctx) {
    const { camera, ui, U, post } = ctx; const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    // ---- camera
    let [px, py, pz, yaw, pitch, fov] = R.camAt(t);
    const sh = U.shake(t, .006, .5, 3);
    if (DEBUG) { const k = Math.min(13, Math.max(0, Math.floor(t))); const h = R.heroes[k]; const a = TH + ((t % 1) - .5) * .9; const D = h.ex.D * .55; px = h.tgt.x - D * Math.sin(a); py = h.tgt.y + h.ex.h * .6; pz = h.tgt.z + D * Math.cos(a); const d = h.tgt.clone().sub(V(px, py, pz)); yaw = Math.atan2(d.x, -d.z); pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); fov = 31; }
    camera.position.set(px + sh.x, py + sh.y, pz + sh.z);
    const dir = V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(camera.position.clone().add(dir)); camera.fov = fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();

    // ---- hero exhibits and lamps
    const lits = R.heroes.map(h => DEBUG ? 1 : U.smoothstep(h.t0 - .06, h.t0 + .3, t));
    R.heroes.forEach((h, i) => {
      const tau = t - h.t0, lit = lits[i];
      if (h.lamp) h.lamp.userData.setLit(lit, t);
      if (h.obj) {
        h.obj.userData.anim && h.obj.userData.anim(DEBUG ? 1 + (t % 1) : tau, t, lit);
        const pop = tau > -.06 && tau < 1.2 && !DEBUG ? (tau < 0 ? -.025 * Math.sin((tau + .06) / .06 * Math.PI) : .055 * Math.exp(-5 * tau) * Math.sin(tau * 15)) : 0;
        h.holder.scale.setScalar(1 + pop); h.holder.position.y = R.PT + Math.max(0, pop) * .05;
      }
    });
    // spots: even/odd exhibits (skipping the door)
    R.spots.forEach((s, k) => {
      let cur = -1; R.heroes.forEach((h, i) => { if (i % 2 === k && (DEBUG || t >= h.t0 - .1)) cur = i; });
      if (DEBUG) cur = Math.min(13, Math.max(0, Math.floor(t)));
      if (k === DOOR % 2 && t > R.T[DOOR] - 1.05 && (cur === DOOR || cur === DOOR - 2) && !DEBUG) { // door spot: warm lamp pool on the closed door, then bounce from the sunlit floor patch
        const opn = U.prog(t, R.T[DOOR] - .08, R.T[DOOR] + .8, 'outCubic'), pre = U.smoothstep(R.T[DOOR] - 1.05, R.T[DOOR] - .55, t);
        s.position.set(R.xd - .75 + .45 * opn, 2.3 - 2.05 * opn, WZ + 1.15 + .15 * opn); s.target.position.set(R.xd + .05 + .2 * opn, 1.0 + .1 * opn, WZ - .3); s.target.updateMatrixWorld();
        s.color.set(opn > .5 ? '#ffd6a8' : '#ffc890'); s.intensity = (6.5 * pre * (1 - opn) + 7.5 * opn) * (1 - U.smoothstep(R.T[DOOR + 1], R.T[DOOR + 1] + .7, t)); return; }
      s.color.set('#ffc88e');
      if (cur < 0) { s.intensity = 0; return; }
      const h = R.heroes[cur]; s.position.copy(h.lampP); s.target.position.copy(h.tgt).add(V(0, -.06, 0)); s.target.updateMatrixWorld();
      s.intensity = 6.6 * (h.ex.L ?? 1) * (h.lampK ?? 1) * lits[cur] * (1 + .04 * Math.sin(t * 13 + cur) * Math.sin(t * 7.3 + cur));
    });
    // door (HOŞGÖRÜ): leaves swing inward, sunlight pours in
    const td = R.T[DOOR]; const op = U.prog(t, td - .08, td + .85, 'outCubic'); const settle = t > td + .55 ? Math.exp(-4 * (t - td - .55)) * Math.sin((t - td - .55) * 9) * .035 : 0;
    const ang = DEBUG && Math.floor(t) === DOOR ? 1.3 : (1.3 * op + settle) * (1 - .015 * Math.sin(t * 1.7)); // swing inward (toward the hall)
    R.leaves.forEach(({ hinge, sx }, j) => { hinge.rotation.y = sx * ang * (j ? 1 : .96); });
    R.leak.material.opacity = .5 * U.smoothstep(td - 1.1, td - .5, t) * (1 - U.smoothstep(td - .1, td + .25, t)) * (.9 + .1 * Math.sin(t * 7));
    R.doorBeam.material.userData.u.opacity.value = .11 * U.smoothstep(.0, .8, op); R.doorBeam.visible = op > .002 && t < td + 3.5; R.doorDust.visible = R.doorBeam.visible; R.doorBeam.material.userData.u.time.value = t; R.doorBeam.material.userData.u.camPos.value.copy(camera.position);
    R.doorDust.userData.uniforms.opacity.value = .75 * op;
    // window beams stronger in the wide finale
    const fin = U.prog(t, R.W.ve, R.W.ve + 2.2, 'inOutSine');
    { const cx = Math.round(camera.position.x * 2) / 2, g = U.prog(t, R.W.ve - .3, R.W.ve + 1.6, 'inOutSine'); const gw = U.smoothstep(4.5, 2.5, Math.abs(camera.position.x - R.xd)); // garden (tree shade) needs the deeper frustum
      R.fitSun(cx - 7 - 5 * g, cx + 9 + 60 * g, -4 - 18 * gw); }
    R.winBeams.material.userData.u.opacity.value = .016 * fin; R.winBeams.visible = fin > .002; R.winBeams.material.userData.u.time.value = t; R.winBeams.material.userData.u.camPos.value.copy(camera.position);
    R.motes2.userData.uniforms.opacity.value = .45 * fin;
    // far lamps: glass glow + pedestal / exhibit brightening
    const c = new THREE.Color();
    R.detailLamps.forEach(({ l, p }) => l.userData.setLit(U.smoothstep(p.on, p.on + .35, t), t));
    R.far.forEach((p, k) => { const b = U.smoothstep(p.on, p.on + .35, t); const f = .85 + .15 * Math.sin(t * 9 + k); c.setRGB(.05 + .62 * b * f, .06 + .3 * b * f, .05 + .09 * b * f); R.farGlass.setColor(k, c); });
    R.farGlass.flush();
    R.pedFar.forEach((p, k) => { const b = U.smoothstep(p.on, p.on + .4, t); c.setRGB(.8 + .75 * b, .8 + .52 * b, .8 + .28 * b); R.pedIM.setColor(k, c); }); R.pedIM.flush();
    R.genIM.forEach(im => { im.list.forEach((p, k) => { const b = U.smoothstep(p.on, p.on + .4, t); c.copy(p.gc).multiplyScalar(.55 + 1.0 * b); c.r *= 1 + .25 * b; im.setColor(k, c); }); im.flush(); });
    // ---- post: DOF on the current exhibit, opening up in the finale
    const look = camera.position.clone().add(dir.clone().multiplyScalar(1));
    let fd = 2.5; { // focus on the exhibit nearest the view axis, soft-blended between neighbours so the focus never jumps mid-glide
      const c = R.heroes.map(h => { const d = h.tgt.clone().sub(camera.position); const along = d.dot(dir); return { along, lat: d.clone().sub(dir.clone().multiplyScalar(along)).length() }; }).filter(c => c.along > .5);
      if (c.length) { const best = Math.min(...c.map(c => c.lat)); let sw = 0, sf = 0; c.forEach(c => { const w = Math.exp(-(c.lat - best) / .18) * (.02 + U.smoothstep(.5, 1.1, c.along)); sw += w; sf += w * c.along; }); fd = sf / sw; } }
    const dw = U.smoothstep(R.T[DOOR] - .55, R.T[DOOR] - .15, t) * (1 - U.smoothstep(R.T[DOOR] + .7, R.T[DOOR] + 1.0, t)); // door shot: hold the tree and the doorway together
    post.dof.focus = U.lerp(U.lerp(fd, 6.5, dw), 9, fin); post.dof.range = U.lerp(U.lerp(1.5, 10, dw), 14, fin); post.dof.amount = U.lerp(U.lerp(.85, .4, dw), .55, fin);
    // motion blur only where the camera glides fast (screen speed centred on this frame)
    { // measured at the focused exhibit's distance (that is what strobes); enough sub-frames that copies sit <= ~4.5 px apart
      const sp = R.pxSpeed(t - 1 / 60, U.clamp(fd, 1.8, 6)); const n = U.clamp(Math.ceil(sp / 10), 1, 6); post.motionBlur = n > 1 ? { samples: n, shutter: .45 } : { samples: 1 };
      R.motes.userData.uniforms.opacity.value = .4 * (1 - .6 * U.smoothstep(25, 55, sp)); } // point sprites strobe worst: thin them while gliding
    post.exposure = 1.05 + .05 * fin;

    // ---- typography
    const X = ui.ctx;
    const label = (str, t0, t1, gone = 0) => {
      if (t < t0 - .01 || t > t1 + .16 || gone >= 1) return;
      const a = U.clamp((t - t0) / .12), sIn = U.ease.outBack(U.clamp((t - t0) / .3), 2.4), ex = Math.max(U.clamp((t - t1) / .14), gone);
      const alpha = a * (1 - ex); if (alpha <= .001) return;
      X.save(); X.font = '900 100px "Nunito"'; X.letterSpacing = '5px'; const w = X.measureText(str).width; const size = Math.min(104, 100 * 840 / w);
      X.globalAlpha = alpha; X.translate(540 - ex * 70, 455 - ex * 10); const sc = (.55 + .45 * sIn) * (1 - .06 * ex); X.scale(sc, sc);
      X.font = `900 ${size}px "Nunito"`; X.letterSpacing = '5px'; X.textAlign = 'center'; X.textBaseline = 'middle';
      X.shadowColor = 'rgba(25,12,4,.7)'; X.shadowBlur = 26; X.shadowOffsetY = 6; X.lineJoin = 'round'; X.lineWidth = size * .13; X.strokeStyle = 'rgba(52,26,10,.6)'; X.strokeText(str, 0, 0);
      X.shadowColor = 'transparent'; const gr = X.createLinearGradient(0, -size * .5, 0, size * .5); gr.addColorStop(0, '#fff1c8'); gr.addColorStop(1, '#ffc35c'); X.fillStyle = gr; X.fillText(str, 0, 0);
      const ul = U.ease.outCubic(U.clamp((t - t0 - .12) / .35)); if (ul > 0) { X.globalAlpha = alpha * .9; X.strokeStyle = '#ffcf6b'; X.lineWidth = 7; X.lineCap = 'round'; X.beginPath(); X.moveTo(-70 * ul, size * .66); X.lineTo(70 * ul, size * .66); X.stroke(); }
      X.restore();
    };
    if (!DEBUG) {
      R.heroes.forEach((h, i) => { const t1 = i < 13 ? R.heroes[i + 1].t0 - .2 : R.W.ve - .18; if (t < h.t0 - .05 || t > t1 + .16) return;
        const sx = ui.project(h.tgt)[0]; const gone = t > h.t0 + .15 ? 1 - U.smoothstep(70, 240, sx) : 0; // the name leaves with its exhibit
        label(NAMES[i], h.t0 - .04, t1, gone); });
      // progress dots
      const dAlpha = U.smoothstep(-.4, 0, t) * (1 - U.smoothstep(R.W.ve - .1, R.W.ve + .25, t));
      if (dAlpha > .001) { X.save(); X.globalAlpha = dAlpha; // soft scrim keeps the row legible over lamp glow; equal dot sizes, current dot gets a ring
        X.shadowColor = 'rgba(10,5,0,.35)'; X.shadowBlur = 18; X.fillStyle = 'rgba(28,14,6,.36)'; ui.rrect(540 - 7 * 52 - 14, 318 - 23, 14 * 52 + 28, 46, 23); X.fill(); X.shadowColor = 'transparent';
        for (let i = 0; i < 14; i++) { const x = 540 + (i - 6.5) * 52, y = 318; const on = U.clamp((t - R.T[i] + .04) / .25); const cur = on > 0 && (i === 13 || t < R.T[i + 1] - .05);
          X.beginPath(); X.arc(x, y, 9, 0, 6.283); X.lineWidth = 2.6; X.strokeStyle = 'rgba(255,240,215,.78)'; X.stroke();
          if (on > 0) { const sc = U.ease.outBack(on, 3); X.beginPath(); X.arc(x, y, 10 * sc, 0, 6.283); X.fillStyle = '#ffcf6b'; X.fill(); X.lineWidth = 1.5; X.strokeStyle = 'rgba(70,36,10,.55)'; X.stroke();
            if (cur) { X.globalAlpha = dAlpha * .85 * U.clamp(on * 2); X.beginPath(); X.arc(x, y, 15.5, 0, 6.283); X.lineWidth = 2.4; X.strokeStyle = '#ffd98a'; X.stroke(); X.globalAlpha = dAlpha; } } }
        X.restore(); }
      // finale words
      const W = R.W;
      { const sa = U.smoothstep(W.ve - .1, W.ve + .4, t); if (sa > .001) { X.save(); X.globalAlpha = sa * .55; const gr = X.createRadialGradient(540, 450, 40, 540, 450, 420); gr.addColorStop(0, 'rgba(26,12,4,.75)'); gr.addColorStop(1, 'rgba(26,12,4,0)'); X.fillStyle = gr; X.setTransform(1, 0, 0, .42, 0, 450 * .58); X.fillRect(0, 0, 1080, 1080); X.restore(); } }
      { X.save(); X.font = '800 70px "Nunito"'; X.letterSpacing = '0px'; const wAll = X.measureText('…ve bütün').width, wB = X.measureText('bütün').width; X.restore();
        const fo = { t, y: 380, size: 70, weight: 800, color: '#fff3dc', anim: 'rise', dur: .4, stroke: 'rgba(40,20,8,.55)', strokeW: 9 };
        ui.text('…ve', { ...fo, t0: W.ve - .03, x: 540 - wAll / 2, align: 'left' }); ui.text('bütün', { ...fo, t0: W.butun - .04, x: 540 + wAll / 2 - wB / 2 }); }
      ui.text('güzel ahlâk', { t, t0: W.guzel - .04, x: 540, y: 498, size: 128, weight: 900, color: '#ffd27a', anim: 'pop', letterSpacing: 3, dur: .45, stroke: 'rgba(52,26,10,.6)', strokeW: 15 });
    }
  },
};
