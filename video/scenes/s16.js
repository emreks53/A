// s16 (92.45–97.10) "Döneminin en önemli düşünürlerinden olan filozof Thomas Carlyle ve"
// Visual: Carlyle's Chelsea study, London c.1840, a foggy grey-blue afternoon. Camera opens on the fogged Georgian
// sash window (rooftops & chimney pots dissolving in the fog, candle-lit windows across the street), then dollies
// down and across the writing desk: brass candlestick (lit against the gloom), inkwell & quill, manuscript stack,
// sealed letters (a small tied bundle in front) — and settles on "On Heroes, Hero-Worship".
// Name card (shared design with s17): "Filozof · 1795–1881" on "filozof", "THOMAS CARLYLE" on "Thomas",
// "On Heroes (1841)" + pointer to the book. No person is shown.
import * as THREE from 'three';
import * as G from '../engine/lib/extra_G.js';

let R = {};
export default {
  endFade: false,
  post: {
    exposure: 1.02,
    bloom: { enabled: true, strength: .32, radius: .55, threshold: .9 },
    grade: { contrast: 1.05, saturation: .96, warmth: -.015, lift: [.018, .024, .036], gain: [.99, 1.0, 1.03] },
    vignette: .45, grain: .04,
    dof: { enabled: true, focus: 1.2, range: .45, amount: 1 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, TEX, FX, ENV } = ctx;
    R = {};
    const deskTop = .7825;
    scene.background = new THREE.Color('#aab3bd');
    scene.fog = new THREE.FogExp2('#aeb6bf', .045);
    scene.environment = await ctx.loadHDR('kloofendal_48d_partly_cloudy_puresky'); scene.environmentIntensity = .22;

    // ---------------- outside: London fog ----------------
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshBasicMaterial({ color: '#9aa3b0', map: TEX.gradientTex([[0, '#8e99a8'], [.5, '#b3bac2'], [1, '#c4c6c3']]), fog: false }));
    sky.position.set(0, 10, -45); scene.add(sky);
    // [z, colour, seed, width, height, centreY, lit windows, base]
    const layers = [[-9, '#68717c', 3, 24, 8, 1.6, 14, .4], [-18, '#7c8692', 7, 44, 12, 2.4, 5, .42], [-32, '#9ca5ae', 11, 76, 18, 3.4, 0, .45]];
    R.stacks = [];
    layers.forEach(([z, col, seed, w, h, cy, win, base], i) => {
      const so = { seed, color: col, windows: win, lit: .14, spire: i === 1 ? .56 : 0, base, w: 1024, h: 512, bw: i === 0 ? .11 : .07, fog: ['#98a1ab', '#a9b0b8', '#b6bcc1'][i], blur: [1.5, 3, 5][i] };
      const stacks = []; const tex = skyline(TEX, U, so, stacks);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: ['#8f98a4', '#9ea6b1', '#aab1bb'][i], map: tex, transparent: true, fog: false, depthWrite: false }));
      pl.position.set(i * 1.5 - 1, cy, z); pl.renderOrder = -10 - i; pl.userData.depthOk = true; scene.add(pl); // in the DOF depth pass (rack focus)
      if (i === 0) stacks.forEach(([u, v]) => R.stacks.push(new THREE.Vector3(pl.position.x + (u - .5) * w, cy + (.5 - v) * h, z + .05)));
    });
    // coal smoke curling up from a few chimney pots of the houses across the street (Chelsea, 1840)
    R.smoke = [];
    { const cs = FX.cloudSprite(); const rs = U.rng(23);
      R.stacks.filter(p => p.x > -4 && p.x < 3.7).forEach((p, c) => { for (let i = 0; i < 9; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cs, color: '#525962', transparent: true, opacity: 0, depthWrite: false, fog: false, rotation: rs() * 6.28 }));
        sp.renderOrder = -7.5; sp.userData.noDepth = true; scene.add(sp); R.smoke.push({ sp, o: p.clone(), ph: (i + rs() * .5) / 9, life: 5.5 + rs() * 1.5, sw: rs() * 6.28, k: c }); } }); }
    // gas street lamps on the far pavement, haloed by the fog (the only warm lights outside besides candle-lit windows)
    R.lamps = [];
    [[-.95, -8.1, 1], [1.1, -8.6, 1], [-3.0, -13.5, .62], [3.2, -14, .6]].forEach(([x, z, k]) => { const L = gasLamp(THREE, k); L.position.set(x, -3.3 + (1 - k) * 1.2, z); scene.add(L);
      const halo = (size, op, col, add) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.softDot(128, 0), color: col, transparent: true, opacity: op, depthWrite: false, fog: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }));
        sp.scale.setScalar(size); sp.position.set(x, L.position.y + 2.62, z + .2); sp.renderOrder = -9; sp.userData.noDepth = true; scene.add(sp); return sp; };
      const gl = halo(1.1 * k + .3, .55 * k, '#ffd08a', true), g2 = halo(3.6 * k, .32 * k, '#d9b48a', false); R.lamps.push(gl, g2); });
    // drifting fog veils (noise alpha, scrolling) between the street and the window
    R.veils = [];
    [[-5.5, .42, 1], [-12, .5, 2]].forEach(([z, op, k]) => { const nt = TEX.noiseTex({ size: 256, seed: 70 + k, base: 3, octaves: 5, contrast: 1.6 }).clone(); nt.needsUpdate = true; nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(1.5, 1);
      const v = new THREE.Mesh(new THREE.PlaneGeometry(18 + k * 10, 7 + k * 3), new THREE.MeshBasicMaterial({ color: '#87909a', alphaMap: nt, transparent: true, opacity: op, depthWrite: false, fog: false }));
      v.position.set(0, 2.2 + k, z); v.renderOrder = -5 + k * -3; scene.add(v); R.veils.push({ nt, k }); });
    // drifting fog banks between the layers
    const fogBank = FX.dustClouds({ count: 12, center: [0, 3.0, -13], box: [26, 5, 12], color: '#8e969f', size: 10, opacity: .3, drift: [.5, 0, 0], speed: .03, seed: 5 }); scene.add(fogBank);

    // ---------------- room: wall with a real window opening (so daylight casts the sash shadows) ----------------
    const wallMat = M.MAT.plaster({ a: '#566050', b: '#3a4136', repeat: [2, 2] });
    const wz = -.45, wt = .24, ox0 = -.5, ox1 = .5, oy0 = .95, oy1 = 2.35;
    const wallBox = (x0, x1, y0, y1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, wt), wallMat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, wz - wt / 2); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
    wallBox(-3, ox0, 0, 3.4); wallBox(ox1, 3, 0, 3.4); wallBox(ox0, ox1, oy1, 3.4); wallBox(ox0, ox1, 0, oy0);
    const paint = new THREE.MeshPhysicalMaterial({ color: '#d9d4c4', roughness: .45, clearcoat: .3 });
    const frameBar = (w, h, d, x, y, z) => { const m = new THREE.Mesh(M.rbox(w, h, d, .006), paint); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
    const fz = wz - .1;
    frameBar(.06, oy1 - oy0, .08, ox0 + .03, (oy0 + oy1) / 2, fz); frameBar(.06, oy1 - oy0, .08, ox1 - .03, (oy0 + oy1) / 2, fz);
    frameBar(ox1 - ox0, .06, .08, 0, oy1 - .03, fz);
    const sill = new THREE.Mesh(M.rbox(1.1, .035, .14, .01), new THREE.MeshPhysicalMaterial({ color: '#b7b1a2', roughness: .5, clearcoat: .2 })); sill.position.set(0, oy0 + .018, wz + .03); sill.castShadow = sill.receiveShadow = true; scene.add(sill);
    // two sashes, 3x2 panes each (6-over-6)
    const sashW = ox1 - ox0 - .12, sashH = (oy1 - oy0 - .08) / 2;
    const condTex = [G.condensationTex({ seed: 3, bottom: .42 }), G.condensationTex({ seed: 9, bottom: .22 })];
    R.panes = [];
    [[oy0 + .04 + sashH / 2, fz + .025, 0], [oy0 + .04 + sashH * 1.5, fz - .025, 1]].forEach(([cy, z, k]) => {
      const st = .045, gb = .016;
      frameBar(st, sashH, .04, -sashW / 2 + st / 2, cy, z); frameBar(st, sashH, .04, sashW / 2 - st / 2, cy, z);
      frameBar(sashW, st, .04, 0, cy - sashH / 2 + st / 2, z); frameBar(sashW, st, .04, 0, cy + sashH / 2 - st / 2, z);
      for (const fx of [-1 / 6, 1 / 6]) frameBar(gb, sashH - st, .025, fx * (sashW - st * 2) * 1.0 * 1, cy, z);
      frameBar(sashW - st, gb, .025, 0, cy, z);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(sashW - st * 2, sashH - st * 2), new THREE.MeshBasicMaterial({ map: condTex[k], transparent: true, depthWrite: false, color: '#e9eef3', opacity: .75 }));
      glass.position.set(0, cy, z + .004); glass.renderOrder = 5; scene.add(glass); R.panes.push(glass);
    });
    // curtains
    const cL = G.curtain({ w: .42, h: 2.25, a: '#4a3a52', b: '#2a2030', sheen: '#c8b8e0', sway: .004, seed: 1, pleats: 6 }); cL.position.set(ox0 - .2, 2.55, wz + .06); scene.add(cL);
    const cR = G.curtain({ w: .42, h: 2.25, a: '#4a3a52', b: '#2a2030', sheen: '#c8b8e0', sway: .004, seed: 4, pleats: 6 }); cR.position.set(ox1 + .2, 2.55, wz + .06); scene.add(cR);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), M.MAT.darkWood({ rings: 40, repeat: [3, 3] })); floor.receiveShadow = true; scene.add(floor);

    // ---------------- desk + Carlyle's things ----------------
    const desk = M.desk({ w: 1.45, d: .8, leather: false }); desk.position.set(0, 0, wz + .41); scene.add(desk);
    // the window light grazes the desk close to its mirror angle: the broad specular lobe turned the lit patches into flat
    // grey-blue slabs. A less glossy finish lets the wood grain read through the daylight.
    { const dm = desk.children[0].material; dm.specularIntensity = .5; dm.clearcoat = .14; dm.clearcoatRoughness = .38; dm.normalScale.set(.9, .9); }
    // candlestick (left)
    const cs = G.chamberstick({ seed: 6, candleH: .1, flameH: .03 }); cs.position.set(.31, deskTop, -.3); cs.rotation.y = 2.4; scene.add(cs);
    // the stock FX.flame body never fades out before the top edge of its quad, so (out of focus) it rendered as a pale
    // flat-topped column of light: replace it with a closed teardrop flame (warm core, orange rim, blue base); smaller halo.
    cs.userData.flame.visible = false; cs.userData.glow.material.opacity = .22; cs.userData.glow.scale.setScalar(.14);
    { const fl = candleFlame(THREE, { h: .031, intensity: 3.0 }); fl.position.set(.31, deskTop + .03 + .1 + .003, -.3); scene.add(fl); }
    R.flamePos = new THREE.Vector3(.31, deskTop + cs.userData.flameY, -.3);
    // stack of old books (back left)
    const bs = new THREE.Group(); bs.position.set(.15, deskTop, -.24); bs.rotation.y = -.06; scene.add(bs);
    [[.19, .26, .045, '#5a2216', '#2a0d07'], [.17, .24, .05, '#3d3a2a', '#1e1c12'], [.18, .23, .035, '#6a4a26', '#33200e'], [.15, .21, .04, '#2a3a4a', '#121c26']].reduce((y, [w, h, d, a, b], i) => {
      const t = G.tome({ w, h, d, a, b, seed: 40 + i }); t.rotation.x = -Math.PI / 2; t.rotation.z = (i % 2 ? 1 : -1) * .04 + i * .015; t.position.set(0, y + d / 2, 0); t.children[0].material.color.set('#cdbb96');
      // tome()'s spine is an OPEN half-cylinder: seen end-on (the camera passes the spine side) its culled interior reads as pale
      // pointed shards. Close its ends and calm the grazing-angle sheen (the cool window light turned it grey).
      const sp = t.children[3]; sp.geometry.dispose(); sp.geometry = new THREE.CylinderGeometry(d / 2, d / 2, h, 28, 1, false, Math.PI, Math.PI);
      const lm = t.children[1].material; lm.sheen = .12; lm.normalScale.set(.45, .45);
      bs.add(t); return y + d; }, 0);
    // inkwell + quill
    const ink = M.inkwell({ quill: false }); ink.position.set(-.05, deskTop, -.08); scene.add(ink);
    const q = G.quill({ length: .29, bend: .03 }); q.position.set(-.055, deskTop + .02, -.08); q.rotation.set(-.32, .5, .32); scene.add(q);
    // manuscript stack (centre back) with a half-written top sheet
    const ms = G.paperStack({ w: .2, d: .27, h: .035, sheets: 3, seed: 11, topTex: G.manuscriptTex({ seed: 12, lines: 26, stopAt: .62 }) }); ms.position.set(-.36, deskTop + .006, -.25); ms.rotation.y = .14; scene.add(ms); R.ms = ms;
    // loose sheet in front of it that lifts in the window draught
    const loose = new THREE.Mesh(new THREE.PlaneGeometry(.19, .25, 10, 10).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: G.manuscriptTex({ seed: 21, lines: 24 }), roughness: .9, side: THREE.DoubleSide }));
    loose.geometry.translate(.095, 0, 0); loose.position.set(-.55, deskTop + .007, .08); loose.rotation.y = -.25; loose.castShadow = loose.receiveShadow = true; scene.add(loose); R.loose = loose; R.looseBase = loose.geometry.attributes.position.array.slice();
    // a folded letter with a red wax seal
    const letter = new THREE.Group(); letter.position.set(-.25, deskTop + .006, .1); letter.rotation.y = .35; scene.add(letter);
    const lp = new THREE.Mesh(M.rbox(.12, .006, .075, .002), new THREE.MeshStandardMaterial({ map: G.manuscriptTex({ seed: 31, lines: 4, top: .3, bottom: .7, paper: '#efe3c8' }), roughness: .9 })); letter.add(lp);
    const seal = M.lathe([[0, 0], [.011, 0], [.012, .002], [.009, .004], [0, .0045]], new THREE.MeshPhysicalMaterial({ color: '#9a1f18', roughness: .35, clearcoat: .6 }), 20); seal.position.set(.02, .003, .0); letter.add(seal);
    M.shadowAll(letter);
    // the hero book: On Heroes, Hero-Worship (dark green cloth, gilt title)
    const gilt = '#e8c46a';
    const cover = (x, W, H) => {
      x.clearRect(0, 0, W, H); x.strokeStyle = 'rgba(10,25,15,.55)'; x.lineWidth = 6; x.strokeRect(W * .06, H * .045, W * .88, H * .91); x.lineWidth = 2; x.strokeRect(W * .09, H * .065, W * .82, H * .87);
      x.strokeStyle = gilt; x.lineWidth = 3; x.strokeRect(W * .13, H * .1, W * .74, H * .8);
      x.fillStyle = gilt; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `700 ${W * .108}px "Playfair Display"`; x.fillText('On Heroes,', W / 2, H * .3); x.fillText('Hero-Worship', W / 2, H * .4);
      x.font = `700 ${W * .044}px "Playfair Display"`; if ('letterSpacing' in x) x.letterSpacing = '2px'; x.fillText('& THE HEROIC IN HISTORY', W / 2, H * .5);
      x.beginPath(); x.moveTo(W * .3, H * .57); x.lineTo(W * .7, H * .57); x.lineWidth = 2; x.strokeStyle = gilt; x.stroke(); x.beginPath(); x.arc(W / 2, H * .57, W * .015, 0, 7); x.fill();
      x.font = `700 ${W * .06}px "Playfair Display"`; x.fillText('THOMAS CARLYLE', W / 2, H * .66);
      x.font = `700 ${W * .05}px "Playfair Display"`; x.fillText('LONDON · 1841', W / 2, H * .82);
    };
    const spine = (x, W, H) => { x.fillStyle = gilt; x.fillRect(0, H * .04, W, 4); x.fillRect(0, H * .96, W, 4); x.save(); x.translate(W / 2, H / 2); x.rotate(Math.PI / 2); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `700 ${W * .34}px "Playfair Display"`; x.fillText('ON HEROES, HERO-WORSHIP', 0, 0); x.restore(); };
    const book = G.tome({ w: .14, h: .215, d: .034, a: '#4a8a5e', b: '#2c5a3c', seed: 52, coverDraw: cover, spineDraw: spine, spineBg: '#3f7650' });
    // propped up (leaning back ~20°) against two flat books, cover to the room
    // propped up (leaning back ~20°) against the stack of old books, cover to the room
    book.children[0].material.color.set('#d8c7a2');
    const lean = .36; const bookHolder = new THREE.Group(); bookHolder.position.set(.15, deskTop + .001, -.044); bookHolder.rotation.y = -.06; scene.add(bookHolder);
    book.rotation.x = -lean; book.position.set(0, Math.cos(lean) * .1075 + Math.sin(lean) * .017, -Math.sin(lean) * .1075 + .002); bookHolder.add(book);
    bookHolder.updateMatrixWorld(true); R.bookAnchorW = book.localToWorld(new THREE.Vector3(.0, .1, .017));
    // a small bundle of folded letters, tied with a cord, the top one sealed with red wax (front, left of the book)
    const bundle = new THREE.Group(); bundle.position.set(.02, deskTop + .002, .15); bundle.rotation.y = .32; scene.add(bundle);
    const lr = U.rng(44); let ly = 0;
    for (let i = 0; i < 4; i++) {
      const th = .005 + lr() * .002; const lm = new THREE.Mesh(M.rbox(.125 - i * .004, th, .078 - i * .003, .0018), new THREE.MeshStandardMaterial({ map: G.manuscriptTex({ seed: 50 + i, lines: 3, top: .35, bottom: .65, paper: ['#efe3c8', '#e9dcbc', '#f2e8d2', '#e6d6b2'][i] }), roughness: .9 }));
      lm.position.set((lr() - .5) * .008, ly + th / 2, (lr() - .5) * .008); lm.rotation.y = (lr() - .5) * .14; bundle.add(lm); ly += th;
    }
    const cord = new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: .9 });
    const c1 = new THREE.Mesh(M.rbox(.004, ly + .003, .084, .0015), cord); c1.position.set(.012, ly / 2, 0); bundle.add(c1);
    const c2 = new THREE.Mesh(M.rbox(.13, .0025, .004, .001), cord); c2.position.set(0, ly + .0012, 0); bundle.add(c2);
    const seal2 = M.lathe([[0, 0], [.011, 0], [.012, .002], [.009, .004], [0, .0045]], new THREE.MeshPhysicalMaterial({ color: '#9a1f18', roughness: .35, clearcoat: .6 }), 20); seal2.position.set(-.03, ly, .006); bundle.add(seal2);
    M.shadowAll(bundle);

    // ---------------- lights ----------------
    const hemi = new THREE.HemisphereLight('#a9b8cc', '#4a3d33', .3); scene.add(hemi);
    const day = new THREE.DirectionalLight('#ccd6e3', 1.9); day.position.set(-.5, 3.4, -3.6); day.target.position.set(0, deskTop, 0);
    // shadow frustum fitted to the desk + window opening (light space x ±.8, y −.46…1.13), 2048² -> ~0.8 mm texels (was 2.5 mm,
    // stair-stepped). PCF honours shadow.radius (PCFSoft does not) -> soft, smooth edges for the overcast window light.
    ctx.renderer.shadowMap.type = THREE.PCFShadowMap;
    day.castShadow = true; day.shadow.mapSize.set(2048, 2048); const sc = day.shadow.camera; sc.left = -.88; sc.right = .88; sc.top = 1.18; sc.bottom = -.52; sc.near = .5; sc.far = 9; day.shadow.bias = -.0004; day.shadow.normalBias = .012; day.shadow.radius = 3;
    scene.add(day, day.target);
    const fill = new THREE.DirectionalLight('#ffe4c8', .55); fill.position.set(1.2, 1.8, 3); scene.add(fill); // soft bounce from the room
    const cl = ENV.pointLight({ color: '#ffa04a', intensity: .45, distance: 2.4, pos: R.flamePos.toArray() }); scene.add(cl); R.cl = cl;
    const cg = FX.glow({ size: .13, opacity: .2, color: '#ffb060' }); cg.position.copy(R.flamePos); scene.add(cg);
    

    // ---------------- camera: window -> across the desk -> the book ----------------
    camera.near = .03; camera.far = 120;
    camera.fov = 40; camera.updateProjectionMatrix();
    R.cam = arcRig(THREE, U, camera, {
      pos: [[-.22, 1.45, .86], [-.22, 1.3, .9], [-.1, 1.16, .88], [.15, 1.09, .96], [.3, 1.07, .955]],
      look: [[-.04, 1.5, -.7], [-.1, 1.18, -.45], [-.02, .95, -.25], [.13, .89, -.2], [.16, .875, -.2]],
      keys: [[-.6, 0], [.8, .22], [2.2, .55], [3.5, .82], [5.6, 1]], shake: { amp: .0025, freq: .4 },
    });
    R.focusTargets = [[-.6, 1.25], [.7, .95], [2.2, .78], [3.6, .7], [5.3, .66]];
  },

  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    const c = R.cam.update(t); camera.updateMatrixWorld();
    // focus: distance to the current look target (window glass early, book late)
    // rack focus: the fog-bound street (gas lamps, chimney smoke) first, then down onto the desk and the book
    { const dL = c.P.distanceTo(c.L), k = U.prog(t, .3, 1.6, 'inOutCubic'); post.dof.focus = U.lerp(9.6, dL * .93, k); post.dof.range = U.lerp(4.5, .42, U.prog(t, .3, 3.2)); post.dof.amount = U.lerp(.7, 1, U.prog(t, .3, 2.5)); }
    // candle flicker, rain drops, loose page lifting in the draught
    R.cl.intensity = .45 * (1 + (Math.sin(t * 12.7) * .5 + Math.sin(t * 7.9 + 1) * .3 + Math.sin(t * 21.3) * .2) * .12);
    for (const q of R.smoke) { // puffs born at the pot, rising and leaning downwind, growing and thinning out
      const a = ((t + 1) / q.life + q.ph) % 1; const up = 2.5 * Math.pow(a, .8), wind = 2.6 * a + .8 * a * a + Math.sin(t * .4 + q.sw) * .15 * a;
      q.sp.position.set(q.o.x + wind, q.o.y + .02 + up, q.o.z); q.sp.scale.setScalar(.7 + a * 2.4); q.sp.material.rotation = q.sw + a * .8;
      q.sp.material.opacity = .85 * U.smoothstep(0, .03, a) * (1 - U.smoothstep(.35, 1, a)); }
    for (const v of R.veils) v.nt.offset.set(t * .012 * (3 - v.k), Math.sin(t * .3 + v.k) * .01);
    const lift = U.smoothstep(.4, 1.1, t) * (1 - U.smoothstep(1.6, 2.6, t)); const p = R.loose.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const x0 = R.looseBase[i * 3], z0 = R.looseBase[i * 3 + 2]; const k = Math.max(0, x0 / .19 - .35) / .65; p.setY(i, (k * k * .03 + Math.sin(t * 6 + z0 * 20) * .002 * k) * lift); }
    p.needsUpdate = true; R.loose.geometry.computeVertexNormals();

    // ---------------- typography ----------------
    // the card fills in on "filozof Thomas" (sub-line, name, then work line + pointer) and is complete ~0.5 s before the
    // scene ends; it is not faded at the scene end but leaves with the picture in the smoothleft wipe into s17
    const tF = ctx.wordTime('filozof'), tT = ctx.wordTime('thomas');
    G.locTag(ui, t, { t0: .12, text: 'LONDRA · 1841', accent: '#9cc3e6', y: 266 });
    const end = G.nameCard(ui, t, { y: 328, nameAnim: 'fade', tCard: tF - .04, tName: tT - .04, tWork: tT + .1, name: 'THOMAS CARLYLE', sub: 'Filozof · 1795–1881', work: 'On Heroes (1841)', accent: '#9cc3e6', bg: 'rgba(16,22,34,.66)' });
    if (end) { const a = R.bookAnchorW; const [ax] = ui.project(a); G.pointer(ui, t, { t0: tT + .22, from: [ax, 328 + 292 + 4], anchor: a, color: '#9cc3e6', dur: .35 }); }
  },
};

// Copy of extra_G.skylineTex (identical drawing / random sequence) that also reports the chimney tops (u, v in 0..1).
function skyline(TEX, U, o, stacksOut) {
  const W = o.w ?? 1024, H = o.h ?? 512; const r = U.rng(o.seed ?? 4); const col = o.color ?? '#5d6672';
  return TEX.drawTexture(W, H, (x) => {
    x.clearRect(0, 0, W, H); const base = H * (o.base ?? .4); let px = -W * .02; const stacks = [];
    while (px < W) {
      const bw = W * (o.bw ?? .09) * (.7 + r() * .7), top = base - H * (.02 + r() * .14); const pitched = r() < .55;
      x.fillStyle = col; x.beginPath(); x.moveTo(px, H); x.lineTo(px, top);
      if (pitched) { x.lineTo(px + bw * .5, top - bw * .32); x.lineTo(px + bw, top); } else { x.lineTo(px + bw * .08, top - H * .015); x.lineTo(px + bw * .92, top - H * .015); x.lineTo(px + bw, top); }
      x.lineTo(px + bw, H); x.closePath(); x.fill();
      if (o.windows) {
        const cols = Math.max(2, Math.round(bw / (W * .028))), rows = 4, ww = bw / cols * .42, wh = H * .055;
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const wx = px + (i + .5) * bw / cols - ww / 2, wy = top + H * .06 + j * H * .1; const lit = r() < (o.lit ?? .12);
          x.fillStyle = lit ? `rgba(255,${190 + r() * 30},${110 + r() * 30},${.6 + r() * .3})` : 'rgba(30,36,46,.35)'; x.fillRect(wx, wy, ww, wh); }
      }
      stacks.push([px, top - (pitched ? bw * .16 : 0)]); px += bw;
    }
    x.fillStyle = col;
    for (const [sx, sy] of stacks) { if (r() < .25) continue; const cw = W * (.022 + r() * .02), ch = H * (.05 + r() * .06); x.fillRect(sx - cw / 2, sy - ch, cw, ch + H * .05); x.fillRect(sx - cw / 2 - W * .002, sy - ch, cw + W * .004, H * .008);
      const pots = 2 + Math.floor(r() * 4); let potH = 0; for (let k = 0; k < pots; k++) { const pw = cw / pots * .62, ph = H * (.018 + r() * .02); potH = Math.max(potH, ph); x.fillRect(sx - cw / 2 + (k + .19) * cw / pots, sy - ch - ph, pw, ph); }
      stacksOut.push([sx / W, (sy - ch - potH) / H]); }
    if (o.spire) { const sx = W * o.spire, sw = W * .035, sb = base - H * .12; x.fillRect(sx - sw / 2, sb - H * .16, sw, H * .5); x.fillRect(sx - sw * .6, sb - H * .17, sw * 1.2, H * .015); x.beginPath(); x.moveTo(sx - sw * .5, sb - H * .17); x.lineTo(sx, sb - H * .36); x.lineTo(sx + sw * .5, sb - H * .17); x.closePath(); x.fill(); }
    if (o.fog) { x.save(); x.globalCompositeOperation = 'source-atop'; const g = x.createLinearGradient(0, base, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, o.fog); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore(); }
    if (o.blur) { const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; c2.getContext('2d').drawImage(x.canvas, 0, 0); x.clearRect(0, 0, W, H); x.filter = `blur(${o.blur}px)`; x.drawImage(c2, 0, 0); x.filter = 'none'; }
  });
}
// Candle flame: y-billboarded additive quad with a closed teardrop (alpha reaches 0 inside the quad), gentle sway/flicker.
function candleFlame(T, o = {}) {
  const H = o.h ?? .032; const geo = new T.PlaneGeometry(H * .62, H * 1.25); geo.translate(0, H * .55, 0);
  const u = { time: { value: 0 }, intensity: { value: o.intensity ?? 3 } };
  const m = new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float time, intensity; varying vec2 vUv;
      void main(){ float y = vUv.y; float sway = (sin(time * 7.3) * .05 + sin(time * 12.9 + 1.3) * .025) * smoothstep(.2, 1., y);
        float x = vUv.x * 2. - 1. - sway; float qy = y - .32; float k = clamp(qy / .6, 0., 1.); float wdt = .86 * (1. - k * k * .8);
        float r = length(vec2(x / wdt, qy > 0. ? qy / .6 : qy / .21));
        float body = smoothstep(1., .3, r); float hot = smoothstep(.62, .05, length(vec2(x / wdt * 1.25, (qy + .04) / .36)));
        vec3 c = mix(vec3(1., .36, .08), vec3(1., .66, .22), smoothstep(0., .6, body)); c = mix(c, vec3(1., .95, .82), hot);
        c += vec3(.15, .3, 1.) * smoothstep(.2, .1, y) * .5;
        float flick = 1. + .05 * sin(time * 23. + 1.7) + .03 * sin(time * 37.1);
        gl_FragColor = vec4(c * intensity * flick, body * .95); }` });
  const mesh = new T.Mesh(geo, m); mesh.userData.uniforms = u; mesh.userData.yBillboard = true; mesh.userData.noDepth = true; mesh.renderOrder = 20; return mesh;
}
// Victorian cast-iron gas street lamp (unlit-shaded, pre-fogged silhouette colour) with a glowing lantern. k = distance fade.
function gasLamp(T, k = 1) {
  const g = new T.Group(); const iron = new T.MeshBasicMaterial({ color: new T.Color('#5d6670').lerp(new T.Color('#a2aab3'), 1 - k), fog: false });
  const add = (geo, mat, y) => { const m = new T.Mesh(geo, mat); m.position.y = y; g.add(m); return m; };
  add(new T.CylinderGeometry(.11, .14, .35, 10), iron, .17); add(new T.CylinderGeometry(.05, .07, 2.1, 10), iron, 1.35); add(new T.CylinderGeometry(.075, .05, .14, 10), iron, 2.38);
  const bar = add(new T.BoxGeometry(.55, .035, .035), iron, 2.2); bar.position.y = 2.22;
  const lantern = add(new T.CylinderGeometry(.17, .11, .36, 4, 1), new T.MeshBasicMaterial({ color: new T.Color('#ffc477').multiplyScalar(1.15 * k + .25), fog: false }), 2.62); lantern.rotation.y = Math.PI / 4;
  const cap = add(new T.ConeGeometry(.22, .16, 4), iron, 2.88); cap.rotation.y = Math.PI / 4; add(new T.SphereGeometry(.035, 8, 6), iron, 2.99);
  g.traverse(o => { if (o.isMesh) o.renderOrder = -9.5; });
  return g;
}

// Camera on centripetal Catmull-Rom paths, ARC-LENGTH parametrised (the parametric version changes speed abruptly at
// every control point). keys = [[t, k]] with k the curve parameter at that time (as in extra_G.camPath); each key is
// converted to arc-length fractions of the position and look curves, then eased with monotone cubics (C1 speed).
function arcRig(T, U, camera, o) {
  const pc = new T.CatmullRomCurve3(o.pos.map(p => new T.Vector3(...p)), false, 'centripetal'), lc = new T.CatmullRomCurve3(o.look.map(p => new T.Vector3(...p)), false, 'centripetal');
  const arcOf = (c) => { const N = 1000, L = c.getLengths(N), tot = L[N]; return k => L[Math.round(Math.min(1, Math.max(0, k)) * N)] / tot; };
  const ap = arcOf(pc), al = arcOf(lc); const up = monoSpline(o.keys.map(([t, k]) => [t, ap(k)])), ul = monoSpline(o.keys.map(([t, k]) => [t, al(k)]));
  const at = (c, u) => { if (u >= 0 && u <= 1) return c.getPointAt(u); const e = u < 0 ? 0 : 1, a = c.getPointAt(e), b = c.getPointAt(e + (u < 0 ? 1e-3 : -1e-3)); return a.clone().add(a.clone().sub(b).multiplyScalar(Math.abs(u - e) / 1e-3)); };
  return { update(t) { const P = at(pc, up(t)), L = at(lc, ul(t)); if (o.shake) P.add(U.shake(t, o.shake.amp, o.shake.freq, 7)); camera.position.copy(P); camera.lookAt(L); return { P, L }; } };
}
function monoSpline(keys) {
  const n = keys.length, xs = keys.map(k => k[0]), ys = keys.map(k => k[1]); const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i])); m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; } }
  return t => { if (t <= xs[0]) return ys[0] + m[0] * (t - xs[0]); if (t >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (t - xs[n - 1]); let i = 0; while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], s = (t - xs[i]) / h, s2 = s * s, s3 = s2 * s; return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1]; };
}
