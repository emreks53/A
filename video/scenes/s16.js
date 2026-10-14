// s16 (92.45–97.10) "Döneminin en önemli düşünürlerinden olan filozof Thomas Carlyle ve"
// Visual: Carlyle's Chelsea study, London c.1840, a foggy grey-blue afternoon. Camera opens on the fogged Georgian
// sash window (rooftops & chimney pots dissolving in the fog, candle-lit windows across the street), then dollies
// down and across the writing desk: brass candlestick (lit against the gloom), inkwell & quill, manuscript stack,
// a sealed letter, a long clay pipe still trailing smoke — and settles on "On Heroes, Hero-Worship".
// Name card (shared design with s17): "Filozof · 1795–1881" on "filozof", "THOMAS CARLYLE" on "Thomas",
// "On Heroes (1841)" + pointer to the book. No person is shown.
import * as THREE from 'three';
import * as G from '../engine/lib/extra_G.js';

let R = {};
export default {
  post: {
    exposure: 1.02,
    bloom: { enabled: true, strength: .32, radius: .55, threshold: .86 },
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
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshBasicMaterial({ map: TEX.gradientTex([[0, '#8e99a8'], [.5, '#b3bac2'], [1, '#c4c6c3']]), fog: false }));
    sky.position.set(0, 10, -45); scene.add(sky);
    // [z, colour, seed, width, height, centreY, lit windows, base]
    const layers = [[-9, '#68717c', 3, 24, 8, 1.6, 14, .4], [-18, '#7c8692', 7, 44, 12, 2.4, 5, .42], [-32, '#9ca5ae', 11, 76, 18, 3.4, 0, .45]];
    layers.forEach(([z, col, seed, w, h, cy, win, base], i) => {
      const tex = G.skylineTex({ seed, color: col, windows: win, lit: .14, spire: i === 1 ? .56 : 0, base, w: 1024, h: 512, bw: i === 0 ? .11 : .07, fog: ['#98a1ab', '#a9b0b8', '#b6bcc1'][i], blur: [1.5, 3, 5][i] });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthWrite: false }));
      pl.position.set(i * 1.5 - 1, cy, z); pl.renderOrder = -10 - i; scene.add(pl);
    });
    // drifting fog veils (noise alpha, scrolling) between the street and the window
    R.veils = [];
    [[-5.5, .42, 1], [-12, .5, 2]].forEach(([z, op, k]) => { const nt = TEX.noiseTex({ size: 256, seed: 70 + k, base: 3, octaves: 5, contrast: 1.6 }).clone(); nt.needsUpdate = true; nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(1.5, 1);
      const v = new THREE.Mesh(new THREE.PlaneGeometry(18 + k * 10, 7 + k * 3), new THREE.MeshBasicMaterial({ color: '#bcc3ca', alphaMap: nt, transparent: true, opacity: op, depthWrite: false, fog: false }));
      v.position.set(0, 2.2 + k, z); v.renderOrder = -5 + k * -3; scene.add(v); R.veils.push({ nt, k }); });
    // drifting fog banks between the layers
    const fogBank = FX.dustClouds({ count: 12, center: [0, 3.0, -13], box: [26, 5, 12], color: '#c3c9cf', size: 10, opacity: .3, drift: [.5, 0, 0], speed: .03, seed: 5 }); scene.add(fogBank);

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
    // candlestick (left)
    const cs = G.chamberstick({ seed: 6, candleH: .1 }); cs.position.set(.31, deskTop, -.3); cs.rotation.y = 2.4; scene.add(cs);
    R.flamePos = new THREE.Vector3(.31, deskTop + cs.userData.flameY, -.3);
    // stack of old books (back left)
    const bs = new THREE.Group(); bs.position.set(.15, deskTop, -.24); bs.rotation.y = -.06; scene.add(bs);
    [[.19, .26, .045, '#5a2216', '#2a0d07'], [.17, .24, .05, '#3d3a2a', '#1e1c12'], [.18, .23, .035, '#6a4a26', '#33200e'], [.15, .21, .04, '#2a3a4a', '#121c26']].reduce((y, [w, h, d, a, b], i) => {
      const t = G.tome({ w, h, d, a, b, seed: 40 + i }); t.rotation.x = -Math.PI / 2; t.rotation.z = (i % 2 ? 1 : -1) * .04 + i * .015; t.position.set(0, y + d / 2, 0); bs.add(t); return y + d; }, 0);
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
      x.font = `700 ${W * .125}px "Playfair Display"`; x.fillText('On Heroes,', W / 2, H * .3); x.fillText('Hero-Worship', W / 2, H * .41);
      x.font = `700 ${W * .055}px "Playfair Display"`; if ('letterSpacing' in x) x.letterSpacing = '3px'; x.fillText('& THE HEROIC IN HISTORY', W / 2, H * .5);
      x.beginPath(); x.moveTo(W * .3, H * .57); x.lineTo(W * .7, H * .57); x.lineWidth = 2; x.strokeStyle = gilt; x.stroke(); x.beginPath(); x.arc(W / 2, H * .57, W * .015, 0, 7); x.fill();
      x.font = `700 ${W * .06}px "Playfair Display"`; x.fillText('THOMAS CARLYLE', W / 2, H * .66);
      x.font = `700 ${W * .05}px "Playfair Display"`; x.fillText('LONDON · 1841', W / 2, H * .82);
    };
    const spine = (x, W, H) => { x.fillStyle = gilt; x.fillRect(0, H * .04, W, 4); x.fillRect(0, H * .96, W, 4); x.save(); x.translate(W / 2, H / 2); x.rotate(Math.PI / 2); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `700 ${W * .34}px "Playfair Display"`; x.fillText('ON HEROES, HERO-WORSHIP', 0, 0); x.restore(); };
    const book = G.tome({ w: .14, h: .215, d: .034, a: '#4a8a5e', b: '#2c5a3c', seed: 52, coverDraw: cover, spineDraw: spine, spineBg: '#3f7650' });
    // propped up (leaning back ~20°) against two flat books, cover to the room
    // propped up (leaning back ~20°) against the stack of old books, cover to the room
    const lean = .36; const bookHolder = new THREE.Group(); bookHolder.position.set(.15, deskTop + .001, -.044); bookHolder.rotation.y = -.06; scene.add(bookHolder);
    book.rotation.x = -lean; book.position.set(0, Math.cos(lean) * .1075 + Math.sin(lean) * .017, -Math.sin(lean) * .1075 + .002); bookHolder.add(book);
    bookHolder.updateMatrixWorld(true); R.bookAnchorW = book.localToWorld(new THREE.Vector3(.0, .1, .017));
    // long clay pipe resting front-right, still smoking
    const pipe = G.clayPipe({ length: .3 }); pipe.position.set(-.185, deskTop + .002, .294); pipe.rotation.y = .62; scene.add(pipe);
    pipe.updateMatrixWorld(true); const bowl = pipe.localToWorld(pipe.userData.bowlTop.clone()); R.pipe = pipe;
    const smoke = G.smokeWisp({ w: .22, h: .5, opacity: .4, color: '#e6e8ec', seed: 2 }); smoke.position.copy(bowl).add(new THREE.Vector3(0, -.008, 0)); scene.add(smoke);
    const smoke2 = G.smokeWisp({ w: .3, h: .62, opacity: .14, color: '#dfe3e8', seed: 7 }); smoke2.position.copy(bowl).add(new THREE.Vector3(.004, -.008, 0)); scene.add(smoke2);

    // ---------------- lights ----------------
    const hemi = new THREE.HemisphereLight('#a9b8cc', '#4a3d33', .3); scene.add(hemi);
    const day = new THREE.DirectionalLight('#c7d4e6', 2.4); day.position.set(-.5, 3.4, -3.6); day.target.position.set(0, deskTop, 0);
    day.castShadow = true; day.shadow.mapSize.set(1024, 1024); const sc = day.shadow.camera; sc.left = -1.3; sc.right = 1.3; sc.top = 1.3; sc.bottom = -1.3; sc.near = .5; sc.far = 9; day.shadow.bias = -.0004; day.shadow.normalBias = .015; day.shadow.radius = 7;
    scene.add(day, day.target);
    const fill = new THREE.DirectionalLight('#ffe4c8', .55); fill.position.set(1.2, 1.8, 3); scene.add(fill); // soft bounce from the room
    const cl = ENV.pointLight({ color: '#ffa04a', intensity: .45, distance: 2.4, pos: R.flamePos.toArray() }); scene.add(cl); R.cl = cl;
    const cg = FX.glow({ size: .22, opacity: .32, color: '#ffb060' }); cg.position.copy(R.flamePos); scene.add(cg);
    

    // ---------------- camera: window -> across the desk -> the book ----------------
    camera.near = .03; camera.far = 120;
    camera.fov = 40; camera.updateProjectionMatrix();
    R.cam = G.camPath(camera, {
      pos: [[-.22, 1.45, .86], [-.22, 1.3, .9], [-.1, 1.16, .88], [.15, 1.09, .96], [.25, 1.075, .97]],
      look: [[-.04, 1.62, -.7], [-.1, 1.18, -.45], [-.02, .95, -.25], [.13, .89, -.2], [.16, .875, -.2]],
      keys: [[-.6, 0], [.8, .22], [2.2, .55], [3.5, .86], [5.3, 1]], shake: { amp: .0025, freq: .4 },
    });
    R.focusTargets = [[-.6, 1.25], [.7, .95], [2.2, .78], [3.6, .7], [5.3, .66]];
  },

  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    const c = R.cam.update(t); camera.updateMatrixWorld();
    // focus: distance to the current look target (window glass early, book late)
    post.dof.focus = U.lerp(c.P.distanceTo(c.L) * 1.6, c.P.distanceTo(c.L) * .93, U.prog(t, .2, 1.6)); post.dof.range = U.lerp(1.6, .42, U.prog(t, .2, 3.2)); post.dof.amount = U.lerp(.45, 1, U.prog(t, .2, 2.5));
    // candle flicker, rain drops, loose page lifting in the draught
    R.cl.intensity = .45 * (1 + (Math.sin(t * 12.7) * .5 + Math.sin(t * 7.9 + 1) * .3 + Math.sin(t * 21.3) * .2) * .12);
    for (const v of R.veils) v.nt.offset.set(t * .012 * (3 - v.k), Math.sin(t * .3 + v.k) * .01);
    const lift = U.smoothstep(.4, 1.1, t) * (1 - U.smoothstep(1.6, 2.6, t)); const p = R.loose.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const x0 = R.looseBase[i * 3], z0 = R.looseBase[i * 3 + 2]; const k = Math.max(0, x0 / .19 - .35) / .65; p.setY(i, (k * k * .03 + Math.sin(t * 6 + z0 * 20) * .002 * k) * lift); }
    p.needsUpdate = true; R.loose.geometry.computeVertexNormals();

    // ---------------- typography ----------------
    const tF = ctx.wordTime('filozof'), tT = ctx.wordTime('thomas'), tC = ctx.wordEnd('carlyle');
    G.locTag(ui, t, { t0: .12, text: 'LONDRA · 1840', accent: '#9cc3e6', y: 268 });
    const end = G.nameCard(ui, t, { y: 312, tCard: tF - .04, tName: tT - .04, tWork: tC - .55, name: 'THOMAS CARLYLE', sub: 'Filozof · 1795–1881', work: 'On Heroes (1841)', accent: '#9cc3e6', bg: 'rgba(16,22,34,.66)' });
    if (end) { const a = R.bookAnchorW; const [ax] = ui.project(a); G.pointer(ui, t, { t0: tC - .2, from: [ax, 312 + 292 + 4], anchor: a, color: '#9cc3e6', dur: .35 }); }
  },
};
