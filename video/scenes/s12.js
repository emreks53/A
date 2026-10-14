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
// exhibit builders + framing: ty = target height above pad top, D = camera distance, h = camera height above target, ry = object yaw
const EX = [
  { f: E.nest, ty: .06, D: 2.05, h: .62, ry: 0 },
  { f: E.carafe, ty: .15, D: 2.2, h: .32, ry: 0 },
  { f: E.balance, ty: .22, D: 2.5, h: .28, ry: -.35 },
  { f: E.chest, ty: .11, D: 2.3, h: .38, ry: -.4 },
  { f: E.wheat, ty: .29, D: 2.65, h: .22, ry: 0, L: .42 },
  { f: E.letters, ty: .12, D: 2.1, h: .3, ry: -.38, L: .5 },
  { f: E.cesme, ty: .2, D: 2.15, h: .55, ry: -.3 },
  { f: E.shoes, ty: .05, D: 2.05, h: .62, ry: -.3, L: .8 },
  { f: E.swordOlive, ty: .1, D: 2.35, h: .42, ry: -.25 },
  { f: E.rose, ty: .3, D: 2.35, h: .18, ry: -.3 },
  { f: E.dates, ty: .05, D: 1.95, h: .66, ry: -.3 },
  { f: null, ty: 0, D: 3.75, h: .2, ry: 0 },
  { f: E.bread, ty: .05, D: 2.0, h: .64, ry: -.3 },
  { f: E.jugPour, ty: .14, D: 2.45, h: .36, ry: -.35 },
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
    scene.environment = await ctx.loadHDR('kiara_interior'); scene.environmentIntensity = .2;
    const sky = ENV.skyDome({ top: '#4f86c4', mid: '#94bde0', horizon: '#f3d6a6', bottom: '#c9a274', sunDir: [-.25, .62, -.74], sunColor: '#ffe2b0', sunSize: .6, sunGlow: .9, clouds: .35, cloudColor: '#fff0dc', intensity: 1.0 });
    scene.add(sky);
    const sunDir = V(-.25, .62, -.74).normalize();
    const sun = new THREE.DirectionalLight('#ffd7a0', 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.normalBias = .03; sun.shadow.radius = 2;
    const sTarget = V(32, 0, 0); sun.position.copy(sTarget).addScaledVector(sunDir, 60); sun.target.position.copy(sTarget); scene.add(sun, sun.target);
    { // fit the static shadow frustum around the hall (x -12..78) + garden strip behind the door
      const cam = sun.shadow.camera; cam.position.copy(sun.position); cam.lookAt(sTarget); cam.updateMatrixWorld(true); const inv = cam.matrixWorldInverse;
      let mn = V(1e9, 1e9, 1e9), mx = V(-1e9, -1e9, -1e9);
      for (const x of [-12, 78]) for (const y of [0, 8]) for (const z of [-4, 6]) { const p = V(x, y, z).applyMatrix4(inv); mn.min(p); mx.max(p); }
      cam.left = mn.x; cam.right = mx.x; cam.bottom = mn.y; cam.top = mx.y; cam.near = Math.max(.1, -mx.z - 5); cam.far = -mn.z + 5; cam.updateProjectionMatrix();
    }
    const hemi = new THREE.HemisphereLight('#a4bce4', '#8a6848', .62); scene.add(hemi); R.hemi = hemi;

    // ---- floor (stone tiles), extends into the garden and the courtyard
    const tileTex = TEX.drawTexture(512, 512, (x, W, H) => { const r = U.rng(5); x.fillStyle = '#7a6650'; x.fillRect(0, 0, W, H); const n = 2, s = W / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const l = 205 + r() * 22; x.fillStyle = `rgb(${l},${l * .88 | 0},${l * .72 | 0})`; x.fillRect(i * s + 4, j * s + 4, s - 8, s - 8); for (let k = 0; k < 60; k++) { x.fillStyle = `rgba(120,90,60,${r() * .07})`; x.beginPath(); x.arc(i * s + r() * s, j * s + r() * s, 4 + r() * 22, 0, 6.3); x.fill(); } }
      x.fillStyle = '#9a4a32'; for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H], [W / 2, H / 2], [W / 2, 0], [0, H / 2], [W / 2, H], [W, H / 2]]) { x.save(); x.translate(cx, cy); x.rotate(Math.PI / 4); x.fillRect(-26, -26, 52, 52); x.restore(); } });
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(160 / 1.5, 50 / 1.5); tileTex.anisotropy = 8;
    const stN = TEX.stone({ a: '#ffffff', b: '#cccccc', seed: 3, repeat: [160 / 3, 50 / 3] });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 50).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: tileTex, normalMap: stN.normalMap, normalScale: new THREE.Vector2(.35, .35), roughness: .78, clearcoat: .12, clearcoatRoughness: .5 }));
    floor.position.set(40, 0, 10); floor.receiveShadow = true; scene.add(floor);

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
    const nichePl = TEX.plaster({ a: '#69a8a4', b: '#4b8686', seed: 15, repeat: [1.2, 1.2] });
    const nicheMat = new THREE.MeshStandardMaterial({ map: nichePl.map, normalMap: nichePl.normalMap, normalScale: new THREE.Vector2(.5, .5), roughness: .92 });
    const bayIdx = []; for (let i = -16; i <= 64; i++) if (i !== DOOR) bayIdx.push(i);
    const m4 = new THREE.Matrix4();
    const inst = (geo, mat, xs, fn) => { const im = new THREE.InstancedMesh(geo, mat, xs.length); xs.forEach((x, k) => { im.setMatrixAt(k, fn ? fn(x, k) : m4.makeTranslation(x, 0, 0)); }); im.castShadow = true; im.receiveShadow = true; scene.add(im); return im; };
    inst(frontGeo, lime, bayIdx.map(xA)); inst(backGeo, lime, bayIdx.map(xA)); const tilesIM = inst(tileGeo, nicheMat, bayIdx.map(xA)); tilesIM.castShadow = false;
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
    // door leaves (open inward on HOŞGÖRÜ)
    const doorWood = MAT.wood({ a: '#6e3f1e', b: '#3e200c', rings: 26, seed: 51, clearcoat: .35 });
    const studMat = new THREE.MeshStandardMaterial({ color: '#2e2a26', metalness: .8, roughness: .4 });
    R.leaves = [];
    for (const sx of [-1, 1]) {
      const hinge = new THREE.Group(); hinge.position.set(xd + sx * .455, 0, WZ - .12); scene.add(hinge);
      const leaf = new THREE.Group(); hinge.add(leaf); const lw = .45;
      leaf.add(E.M(Mo.rbox(lw, 2.0, .055, .012).translate(-sx * lw / 2, 1.0, 0), doorWood));
      for (const [y, h] of [[.35, .5], [1.0, .6], [1.65, .5]]) { leaf.add(E.M(Mo.rbox(lw - .1, h, .03, .012).translate(-sx * lw / 2, y, .03), doorWood)); }
      const studs = []; for (let k = 0; k < 7; k++) for (const xx of [.04, lw - .04]) studs.push(new THREE.SphereGeometry(.011, 8, 6).translate(-sx * xx, .12 + k * .29, .03));
      leaf.add(E.M(E.merge(studs), studMat));
      const ringK = E.M(new THREE.TorusGeometry(.04, .007, 8, 20), Mo.MAT.brass()); ringK.position.set(-sx * (lw - .08), 1.05, .045); leaf.add(ringK);
      R.leaves.push({ hinge, sx });
    }
    // garden seen through the door: sunlit tree + wall (painted backdrop, unlit/bright)
    const gardenTex = TEX.drawTexture(1024, 1024, (x, W, H) => { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#9cc4e6'); gr.addColorStop(.45, '#f3e6c8'); gr.addColorStop(.62, '#e6c48e'); gr.addColorStop(1, '#c99a62'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
      x.fillStyle = '#e9cf9e'; x.fillRect(0, H * .5, W, H * .14); x.fillStyle = 'rgba(160,110,60,.35)'; x.fillRect(0, H * .635, W, 6);
      const r = U.rng(8); x.fillStyle = '#6e5232'; x.fillRect(W * .47, H * .38, W * .05, H * .3);
      for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = Math.pow(r(), .6) * W * .32; const cx = W * .5 + Math.cos(a) * d * 1.2, cy = H * .3 + Math.sin(a) * d * .55; const c = 70 + r() * 60; x.fillStyle = `rgba(${c * .55 | 0},${c * 1.3 | 0},${c * .35 | 0},.95)`; x.beginPath(); x.arc(cx, cy, 30 + r() * 60, 0, 6.3); x.fill(); }
      for (let i = 0; i < 90; i++) { const a = r() * 6.28, d = W * .3 + r() * W * .06; x.fillStyle = `rgba(255,236,170,${.25 + r() * .3})`; x.beginPath(); x.arc(W * .5 + Math.cos(a) * d * 1.2, H * .3 + Math.sin(a) * d * .55, 8 + r() * 18, 0, 6.3); x.fill(); } });
    const garden = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ map: gardenTex, fog: false, color: new THREE.Color(.78, .76, .72) }));
    garden.position.set(xd + 2.5, 2.3, -6.5); scene.add(garden);

    // ---- moldings along the back wall
    const runs = [[-20, xd - .62], [xd + .62, 82]];
    for (const [a, b] of runs) { const base = new THREE.Mesh(Mo.rbox(b - a, .12, .05, .015), lime); base.position.set((a + b) / 2, .06, WZ + .02); base.receiveShadow = true; scene.add(base); }
    const band = new THREE.Mesh(Mo.rbox(102, .09, .07, .02), lime); band.position.set(31, 2.78, WZ + .03); band.castShadow = band.receiveShadow = true; scene.add(band);

    // ---- vault + transverse ribs + arcade on the courtyard side + roof
    const zc = (WZ + AZ) / 2, va = (AZ - WZ) / 2, LEN = 104, X0 = -22;
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
    const ribXs = []; for (let k = -9; k <= 32; k++) ribXs.push((2 * k + .5) * S);
    inst(ribGeo, ribMat, ribXs);
    const corb = Mo.rbox(.42, .22, .26, .04, 1); inst(corb, ribMat, ribXs, x => m4.makeTranslation(x, VS - .2, WZ + .1));
    // arcade (courtyard side)
    const aa = S - .24; const arcS = new THREE.Shape(); [[-S, 0], [-aa, 0], [-aa, 2.45]].forEach(([x, y], i) => i ? arcS.lineTo(x, y) : arcS.moveTo(x, y)); E.archPts(aa, 2.45, 1.5, 18).forEach(p => arcS.lineTo(p.x, p.y)); [[aa, 0], [S, 0], [S, VS + .7], [-S, VS + .7]].forEach(([x, y]) => arcS.lineTo(x, y)); arcS.closePath();
    const arcGeo = ext(arcS, .5, .03).translate(0, 0, AZ - .025);
    const arcXs = []; for (let k = -9; k <= 31; k++) arcXs.push((2 * k + 1.5) * S);
    inst(arcGeo, lime, arcXs);
    const capG = E.merge([Mo.rbox(.56, .12, .62, .03, 1).translate(0, 2.38, 0), Mo.rbox(.5, .07, .56, .02, 1).translate(0, 2.29, 0), Mo.rbox(.56, .16, .62, .03, 1).translate(0, .08, 0)]);
    inst(capG, ribMat, ribXs, x => m4.makeTranslation(x, 0, AZ + .26));
    const roof = new THREE.Mesh(Mo.rbox(LEN, .5, AZ - WZ + 2.2, .05), plaster); roof.position.set(X0 + LEN / 2, 7.75, zc); roof.castShadow = true; scene.add(roof);
    // courtyard: opposite wing (sunlit) + cypresses
    const oppXs = []; for (let k = -12; k <= 34; k++) oppXs.push((2 * k + 1.5) * S);
    inst(arcGeo, lime, oppXs, x => m4.makeRotationY(Math.PI).setPosition(x, 0, 2 * AZ + 18));
    const oppWall = new THREE.Mesh(new THREE.BoxGeometry(LEN + 30, 7.2, .6), lime); oppWall.position.set(X0 + LEN / 2, 3.6, 2 * AZ + 18 + 3.2); oppWall.receiveShadow = true; scene.add(oppWall);
    const oppRoof = new THREE.Mesh(new THREE.BoxGeometry(LEN + 30, .5, 4.6), plaster); oppRoof.position.set(X0 + LEN / 2, VS + 1.0, 2 * AZ + 18 + 1.6); scene.add(oppRoof);
    const cyp = new THREE.SphereGeometry(1, 12, 10).scale(.65, 2.6, .65).translate(0, 2.6, 0);
    const cr = U.rng(4); const cypXs = []; for (let k = 0; k < 16; k++) cypXs.push(-10 + k * 6 + cr() * 2);
    inst(cyp, new THREE.MeshStandardMaterial({ color: '#3f5a2e', roughness: .9 }), cypXs, (x, k) => m4.makeTranslation(x, 0, 12 + (k % 2) * 3));

    // ---- pedestals (row A along the back wall, row B facing it)
    const ped = E.pedestalGeos(); R.PT = ped.top;
    const pedStone = MAT.stone({ a: '#f3e9d3', b: '#dccaa8', seed: 21, repeat: [1, 1] });
    const felt = MAT.fabric({ a: '#6c1f2c', b: '#4a1220', weave: 90 }); felt.sheenColor = new THREE.Color('#ff9fa0');
    const pa = []; for (let i = -16; i <= 64; i++) if (i !== DOOR) pa.push({ x: xA(i), z: 0, rot: 0, hero: i >= 0 && i < 14 ? i : -1, row: 0 });
    for (let i = -16; i <= 64; i++) pa.push({ x: (i + .5) * S, z: ROWB, rot: Math.PI, hero: -1, row: 1 });
    R.peds = pa;
    const pedM = (p) => m4.makeRotationY(p.rot).setPosition(p.x, 0, p.z);
    const near = pa.filter(p => p.row === 0 && p.x > -2 && p.x < xA(14) + .1), farP = pa.filter(p => !near.includes(p)); R.pedFar = farP;
    inst(ped.stone, pedStone, near.map(p => p.x), (x, k) => pedM(near[k]).clone()); inst(ped.pad, felt, near.map(p => p.x), (x, k) => pedM(near[k]).clone());
    const pedLo = E.pedestalGeos(1);
    R.pedIM = inst(pedLo.stone, pedStone, farP.map(p => p.x), (x, k) => pedM(farP[k]).clone()); inst(pedLo.pad, felt, farP.map(p => p.x), (x, k) => pedM(farP[k]).clone());
    R.pedIM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(farP.length * 3).fill(1), 3);
    // lamp + light-on times for every pedestal (heroes: their word; others: the finale cascade)
    const x14 = xA(13); R.x14 = x14;
    pa.forEach(p => {
      if (p.hero >= 0) p.on = R.T[p.hero] - .05;
      else if (p.row === 0) p.on = p.x > x14 ? R.W.ve + .12 + (p.x - x14) * .03 : R.W.diger;
      else p.on = p.x > x14 - 3 ? R.W.ve + .2 + (p.x - x14 + 3) * .03 : R.W.ve + .1;
      p.lamp = p.row === 0 ? V(p.x - .34, 1.68, .3) : V(p.x + .34, 1.68, ROWB - .3);
    });

    // ---- hero exhibits + hero lamps
    for (let i = 0; i < 14; i++) {
      const ex = EX[i]; const x = xA(i);
      const tgt = i === DOOR ? V(x, 1.05, WZ - .1) : V(x, R.PT + ex.ty, 0);
      const h = { i, tgt, ex, t0: R.T[i] };
      if (ex.f) { const obj = ex.f(); const holder = new THREE.Group(); holder.position.set(x, R.PT, 0); holder.rotation.y = ex.ry; holder.add(obj); scene.add(holder); h.obj = obj; h.holder = holder; }
      if (i !== DOOR) { const p = pa.find(q => q.hero === i); const lamp = E.hangingLamp({ topY: R.vaultY(p.lamp.z) - p.lamp.y + .3, seed: i + 1 }); lamp.position.copy(p.lamp); scene.add(lamp); h.lamp = lamp; h.lampP = p.lamp.clone().add(V(0, lamp.userData.flameY, 0)); }
      R.heroes.push(h);
    }
    // ---- far lamps (instanced) + flames + light pools (shader-driven on-times)
    const far = pa.filter(p => p.hero < 0); R.far = far;
    const lampProf = [[0, 0], [.014, 0], [.016, .01], [.034, .016], [.06, .036], [.072, .062], [.066, .088], [.043, .108], [.033, .122], [.037, .15], [.049, .172], [.055, .18], [.05, .18], [.03, .12], [0, .11]];
    const glassGeo = E.latheGeo(lampProf, 10);
    R.farGlass = new THREE.InstancedMesh(glassGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), far.length);
    R.farGlass.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(far.length * 3), 3);
    far.forEach((p, k) => R.farGlass.setMatrixAt(k, m4.makeTranslation(p.lamp.x, p.lamp.y, p.lamp.z))); scene.add(R.farGlass);
    const chainGeo = E.merge([new THREE.CylinderGeometry(.004, .004, 1, 4).translate(0, .5, 0)]);
    const chains = new THREE.InstancedMesh(chainGeo, new THREE.MeshStandardMaterial({ color: '#3a2c1c', metalness: .6, roughness: .5 }), far.length);
    far.forEach((p, k) => { const top = R.vaultY(p.lamp.z) + .3; chains.setMatrixAt(k, m4.compose(V(p.lamp.x, p.lamp.y + .18, p.lamp.z), new THREE.Quaternion(), V(1, top - p.lamp.y - .18, 1))); }); scene.add(chains);
    const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(.03, 6, 4), MAT.brass(), far.length); far.forEach((p, k) => balls.setMatrixAt(k, m4.makeTranslation(p.lamp.x, p.lamp.y + .56, p.lamp.z))); scene.add(balls);
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
    R.padPool = decal(() => new THREE.PlaneGeometry(.62, .62).rotateX(-Math.PI / 2), '#ffb46a', .35, p => m4.makeTranslation(p.x, R.PT + .003, p.z));
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
    flames.userData.uniforms = fu; flames.userData.noDepth = true; flames.frustumCulled = false; scene.add(flames);
    const halos = new THREE.Points(fg, new THREE.ShaderMaterial({ uniforms: fu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float time; attribute float on, seed; varying float vB; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; float b = smoothstep(on, on + .4, time); vB = b; gl_PointSize = max(3., 700. / -mv.z) * (.5 + .5 * b); }`,
      fragmentShader: `uniform sampler2D map; varying float vB; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vec3(1., .62, .3), a * a * vB * .06); }` }));
    halos.userData.uniforms = fu; halos.userData.noDepth = true; halos.frustumCulled = false; scene.add(halos);
    // generic exhibits on far pedestals
    const gg = E.genericGeos(); const pal = ['#c47a48', '#d6a94e', '#3f8a86', '#e8dcc2', '#8a3a2a', '#5b7a3a', '#2f5d9a'];
    R.genIM = gg.map((geo, ti) => { const list = far.filter((p, k) => (k * 7 + 3) % gg.length === ti); const im = new THREE.InstancedMesh(geo, new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .45, clearcoat: .3 }), list.length);
      im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(list.length * 3), 3); list.forEach((p, k) => { im.setMatrixAt(k, m4.makeRotationY(p.rot + k).setPosition(p.x, R.PT, p.z)); p.gc = new THREE.Color(pal[(k * 3 + ti) % pal.length]); });
      im.castShadow = true; im.receiveShadow = true; im.userData.list = list; scene.add(im); return im; });

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
    const wb = []; for (let i = -16; i <= 64; i++) { const x = xA(i); wb.push(beamGeo([V(x - .2, 3.05, zw), V(x + .2, 3.05, zw), V(x + .2, 3.62, zw), V(x - .2, 3.62, zw)])); }
    R.winBeams = new THREE.Mesh(E.merge(wb), beamMat(.05)); R.winBeams.userData.noDepth = true; R.winBeams.renderOrder = 4; R.winBeams.frustumCulled = false; scene.add(R.winBeams);
    R.doorBeam = new THREE.Mesh(beamGeo([V(xd - .45, .02, WZ - .1), V(xd + .45, .02, WZ - .1), V(xd + .45, 2.0, WZ - .1), V(xd - .45, 2.0, WZ - .1)]), beamMat(0)); R.doorBeam.userData.noDepth = true; R.doorBeam.renderOrder = 4; R.doorBeam.frustumCulled = false; scene.add(R.doorBeam);
    R.doorDust = FX.particles({ count: 160, center: [xd + .4, 1.0, 0], box: [1.4, 2.0, 1.6], size: 2.5, color: '#ffe6b8', opacity: 0, drift: [.02, .04, .01], swirl: .06 }); scene.add(R.doorDust);
    R.motes = FX.particles({ count: 380, center: [9, 1.6, .1], box: [26, 2.6, 1.3], size: 2.2, color: '#ffe2b0', opacity: .4, drift: [.03, .02, 0], swirl: .05 }); scene.add(R.motes);
    R.motes2 = FX.particles({ count: 600, center: [x14 + 16, 2.0, 1.6], box: [30, 3.6, 4.6], size: 3.5, color: '#ffe2b0', opacity: 0, drift: [.03, .02, 0], swirl: .06 }); scene.add(R.motes2);

    // ---- camera keys
    camera.near = .03; camera.far = 600;
    const keys = []; const camFor = i => { const h = R.heroes[i]; const D = h.ex.D, hh = h.ex.h; return { pos: V(h.tgt.x - D * Math.sin(TH), h.tgt.y + hh, h.tgt.z + D * Math.cos(TH)), look: h.tgt.clone(), fov: 31 }; };
    const c0 = camFor(0);
    keys.push({ t: -.75, pos: c0.pos.clone().add(V(-1.0, .55, 1.25)), look: c0.look.clone().add(V(.45, .05, 0)), fov: 33, a: 1 });
    keys.push({ t: R.T[0] + .78, ...camFor(0), a: .45 });
    for (let i = 1; i < 14; i++) { const k = camFor(i), tk = R.T[i] + .28; let prev = keys[keys.length - 1];
      if (tk - prev.t > .95) { // long gap: linger on the current exhibit (slow drift + push-in), then glide on
        const th = Math.max(prev.t + .45, tk - .85); keys.push({ t: th, pos: prev.pos.clone().add(V(.11, -.01, -.07)), look: prev.look.clone().add(V(.06, 0, 0)), fov: prev.fov, a: .9 }); prev = keys[keys.length - 1]; }
      const tm = (prev.t + tk) / 2;
      keys.push({ t: tm, pos: prev.pos.clone().lerp(k.pos, .5).add(V(0, .05, .2)), look: prev.look.clone().lerp(k.look, .5).add(V(0, .03, 0)), fov: 31.5, a: 1 });
      keys.push({ t: tk, ...k, a: .35 }); }
    const c13 = camFor(13);
    keys.push({ t: R.W.ve - .1, pos: c13.pos.clone().add(V(.16, .1, .06)), look: c13.look.clone().add(V(.25, .06, 0)), fov: 31.5, a: 1 });
    keys.push({ t: 16.2, pos: V(x14 - .6, 2.35, 2.05), look: V(x14 + 5, 1.35, .9), fov: 37, a: 1 });
    keys.push({ t: 18.4, pos: V(x14 - 2.5, 3.0, 1.62), look: V(x14 + 16, 1.0, 1.6), fov: 41, a: 1 });
    const toV = k => { const d = k.look.clone().sub(k.pos); return { t: k.t, a: k.a, v: [k.pos.x, k.pos.y, k.pos.z, Math.atan2(d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), k.fov] }; };
    const hk = keys.map(toV); const n = hk.length;
    const tang = hk.map((k, i) => { const p = hk[Math.max(0, i - 1)], q = hk[Math.min(n - 1, i + 1)]; return k.v.map((_, c) => (q.v[c] - p.v[c]) / Math.max(1e-6, q.t - p.t) * (k.a ?? 1)); });
    R.camAt = t => { if (t <= hk[0].t) return hk[0].v.slice(); if (t >= hk[n - 1].t) return hk[n - 1].v.slice(); let i = 0; while (t > hk[i + 1].t) i++; const k0 = hk[i], k1 = hk[i + 1], dt = k1.t - k0.t, u = (t - k0.t) / dt, u2 = u * u, u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2; return k0.v.map((v0, c) => h00 * v0 + h10 * dt * tang[i][c] + h01 * k1.v[c] + h11 * dt * tang[i + 1][c]); };
    R.lookTgt = new THREE.Vector3();
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
      let cur = -1; R.heroes.forEach((h, i) => { if (i !== DOOR && i % 2 === k && (DEBUG || t >= h.t0 - .1)) cur = i; });
      if (DEBUG) cur = Math.min(13, Math.max(0, Math.floor(t)));
      if (cur < 0 || cur === DOOR) { s.intensity = 0; return; }
      const h = R.heroes[cur]; s.position.copy(h.lampP); s.target.position.copy(h.tgt).add(V(0, -.06, 0)); s.target.updateMatrixWorld();
      s.intensity = 7.5 * (h.ex.L ?? 1) * lits[cur] * (1 + .04 * Math.sin(t * 13 + cur) * Math.sin(t * 7.3 + cur));
    });
    // door (HOŞGÖRÜ): leaves swing inward, sunlight pours in
    const td = R.T[DOOR]; const op = U.prog(t, td - .08, td + .8, 'outCubic'); const settle = t > td + .5 ? Math.exp(-4 * (t - td - .5)) * Math.sin((t - td - .5) * 9) * .04 : 0;
    const ang = DEBUG && Math.floor(t) === DOOR ? 1.6 : 1.62 * op + settle;
    R.leaves.forEach(({ hinge, sx }) => { hinge.rotation.y = sx < 0 ? ang : -ang; });
    R.doorBeam.material.userData.u.opacity.value = .07 * U.smoothstep(.0, .8, op); R.doorBeam.material.userData.u.time.value = t; R.doorBeam.material.userData.u.camPos.value.copy(camera.position);
    R.doorDust.userData.uniforms.opacity.value = .75 * op;
    // window beams stronger in the wide finale
    const fin = U.prog(t, R.W.ve, R.W.ve + 2.2, 'inOutSine');
    R.winBeams.material.userData.u.opacity.value = .016 * fin; R.winBeams.material.userData.u.time.value = t; R.winBeams.material.userData.u.camPos.value.copy(camera.position);
    R.motes2.userData.uniforms.opacity.value = .45 * fin;
    // far lamps: glass glow + pedestal / exhibit brightening
    const c = new THREE.Color();
    R.far.forEach((p, k) => { const b = U.smoothstep(p.on, p.on + .35, t); const f = .85 + .15 * Math.sin(t * 9 + k); c.setRGB(.05 + .62 * b * f, .06 + .3 * b * f, .05 + .09 * b * f); R.farGlass.setColorAt(k, c); });
    R.farGlass.instanceColor.needsUpdate = true;
    R.pedFar.forEach((p, k) => { const b = U.smoothstep(p.on, p.on + .4, t); R.pedIM.instanceColor.setXYZ(k, .8 + .75 * b, .8 + .52 * b, .8 + .28 * b); }); R.pedIM.instanceColor.needsUpdate = true;
    R.genIM.forEach(im => { im.userData.list.forEach((p, k) => { const b = U.smoothstep(p.on, p.on + .4, t); c.copy(p.gc).multiplyScalar(.55 + 1.0 * b); c.r *= 1 + .25 * b; im.setColorAt(k, c); }); im.instanceColor.needsUpdate = true; });
    // ---- post: DOF on the current exhibit, opening up in the finale
    const look = camera.position.clone().add(dir.clone().multiplyScalar(1));
    let fd = 2.5; { let best = 1e9; R.heroes.forEach(h => { const d = h.tgt.clone().sub(camera.position); const along = d.dot(dir); const lat = d.clone().sub(dir.clone().multiplyScalar(along)).length(); if (along > .5 && lat < best) { best = lat; fd = along; } }); }
    post.dof.focus = U.lerp(fd, 9, fin); post.dof.range = U.lerp(1.5, 14, fin); post.dof.amount = U.lerp(.85, .55, fin);
    post.exposure = 1.05 + .05 * fin;

    // ---- typography
    const X = ui.ctx;
    const label = (str, t0, t1) => {
      if (t < t0 - .01 || t > t1 + .16) return;
      const a = U.clamp((t - t0) / .12), sIn = U.ease.outBack(U.clamp((t - t0) / .3), 2.4), ex = U.clamp((t - t1) / .14);
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
      R.heroes.forEach((h, i) => { const t1 = i < 13 ? R.heroes[i + 1].t0 - .2 : R.W.ve - .18; label(NAMES[i], h.t0 - .04, t1); });
      // progress dots
      const dAlpha = U.smoothstep(-.4, 0, t) * (1 - U.smoothstep(R.W.ve - .1, R.W.ve + .25, t));
      if (dAlpha > .001) { X.save(); X.globalAlpha = dAlpha; for (let i = 0; i < 14; i++) { const x = 540 + (i - 6.5) * 52, y = 318; const on = U.clamp((t - R.T[i] + .04) / .25); const cur = on > 0 && (i === 13 || t < R.T[i + 1] - .05);
          X.beginPath(); X.arc(x, y, 9.5, 0, 6.283); X.lineWidth = 3; X.strokeStyle = 'rgba(255,240,215,.7)'; X.shadowColor = 'rgba(0,0,0,.45)'; X.shadowBlur = 8; X.stroke();
          if (on > 0) { const s = U.ease.outBack(on, 3) * (cur ? 1.25 : 1); X.beginPath(); X.arc(x, y, 9.5 * s, 0, 6.283); X.fillStyle = '#ffcf6b'; X.fill(); } } X.restore(); }
      // finale words
      const W = R.W;
      ui.text('…ve bütün', { t, t0: W.ve - .03, x: 540, y: 392, size: 62, weight: 800, color: '#fff3dc', anim: 'rise', dur: .4 });
      ui.text('güzel ahlâk', { t, t0: W.guzel - .04, x: 540, y: 500, size: 124, weight: 900, color: '#ffd27a', anim: 'pop', letterSpacing: 3, dur: .45 });
    }
  },
};
